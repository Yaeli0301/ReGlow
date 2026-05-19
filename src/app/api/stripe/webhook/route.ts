import { NextResponse } from "next/server";
import { headers } from "next/headers";
import Stripe from "stripe";
import { connectDB } from "@/lib/mongodb";
import { getStripe, tierFromPriceId } from "@/lib/stripe";
import { User } from "@/models/User";
import { StripeEvent } from "@/models/StripeEvent";
import type { SubscriptionTier } from "@/types";
import { processReferralReward, consumeReferralRewardMonth } from "@/lib/referral-rewards";
import { logger } from "@/lib/logger";
import { trackEvent } from "@/lib/analytics/event-tracker";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function updateUserSubscription(
  userId: string,
  tier: SubscriptionTier,
  subscriptionId?: string,
  customerId?: string
) {
  await connectDB();
  const before = await User.findById(userId).select("subscriptionTier").lean();
  await User.findByIdAndUpdate(userId, {
    subscriptionTier: tier,
    ...(subscriptionId && { stripeSubscriptionId: subscriptionId }),
    ...(customerId && { stripeCustomerId: customerId }),
  });
  logger.info("Subscription updated", {
    userId,
    from: before && "subscriptionTier" in before ? before.subscriptionTier : "unknown",
    to: tier,
  });
}

export async function POST(request: Request) {
  const body = await request.text();
  const headersList = await headers();
  const signature = headersList.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ success: false, error: "Missing signature" }, { status: 400 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    logger.error("Webhook secret not configured");
    return NextResponse.json(
      { success: false, error: "Webhook secret not configured" },
      { status: 503 }
    );
  }

  let event: Stripe.Event;

  try {
    event = getStripe().webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    logger.warn("Webhook signature verification failed", {
      err: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ success: false, error: "Invalid signature" }, { status: 400 });
  }

  try {
    await connectDB();

    // Idempotency: skip duplicate events (Stripe retries on failure)
    try {
      await StripeEvent.create({ eventId: event.id, type: event.type });
    } catch (e) {
      const code = (e as { code?: number })?.code;
      if (code === 11000) {
        logger.info("Stripe event already processed (idempotent skip)", {
          eventId: event.id,
          type: event.type,
        });
        return NextResponse.json({ success: true, received: true, idempotent: true });
      }
      throw e;
    }

    logger.info("Stripe webhook received", { eventId: event.id, type: event.type });

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;
        const tier = (session.metadata?.tier || "basic") as SubscriptionTier;

        if (userId) {
          await updateUserSubscription(
            userId,
            tier,
            session.subscription as string | undefined,
            session.customer as string | undefined
          );

          trackEvent({
            type: "subscription_started",
            userId,
            metadata: { tier, sessionId: session.id },
          });
          trackEvent({
            type: "payment_succeeded",
            userId,
            metadata: {
              tier,
              amount: (session.amount_total ?? 0) / 100,
              source: "stripe_checkout",
            },
          });

          if (tier !== "none") {
            await processReferralReward({
              referredUserId: userId,
              tier,
              stripeEventId: event.id,
            });
          }

          if (session.metadata?.useReferralReward === "true" && tier !== "none") {
            await consumeReferralRewardMonth(userId);
          }
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.userId;

        if (userId && subscription.status === "active") {
          const priceId = subscription.items.data[0]?.price.id;
          if (priceId) {
            const tier = tierFromPriceId(priceId);
            if (tier !== "none") {
              await updateUserSubscription(userId, tier, subscription.id);
            }
          }
        }

        if (userId && ["canceled", "unpaid", "past_due"].includes(subscription.status)) {
          if (subscription.status === "canceled" || subscription.status === "unpaid") {
            await updateUserSubscription(userId, "none");
          }
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.userId;

        if (userId) {
          await updateUserSubscription(userId, "none");
          trackEvent({
            type: "subscription_cancelled",
            userId,
            metadata: { subscriptionId: subscription.id, reason: "deleted" },
          });
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionRef = (invoice as Stripe.Invoice & { subscription?: string | null })
          .subscription;
        const subscriptionId =
          typeof subscriptionRef === "string" ? subscriptionRef : undefined;

        if (subscriptionId) {
          const subscription = await getStripe().subscriptions.retrieve(subscriptionId);
          const userId = subscription.metadata?.userId;
          if (userId) {
            await updateUserSubscription(userId, "none");
          }
        }
        break;
      }

      default:
        break;
    }

    return NextResponse.json({ success: true, received: true });
  } catch (error) {
    logger.error("Webhook handler error", {
      eventId: event.id,
      type: event.type,
      err: error instanceof Error ? error.message : String(error),
    });
    // Roll back the idempotency marker so Stripe retries
    try {
      await StripeEvent.deleteOne({ eventId: event.id });
    } catch {
      /* ignore */
    }
    return NextResponse.json(
      { success: false, error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}
