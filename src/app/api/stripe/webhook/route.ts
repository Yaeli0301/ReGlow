import { NextResponse } from "next/server";
import { headers } from "next/headers";
import Stripe from "stripe";
import { connectDB } from "@/lib/mongodb";
import { getStripe, tierFromPriceId } from "@/lib/stripe";
import { User } from "@/models/User";
import type { SubscriptionTier } from "@/types";
import { processReferralReward, consumeReferralRewardMonth } from "@/lib/referral-rewards";

export const runtime = "nodejs";

async function updateUserSubscription(
  userId: string,
  tier: SubscriptionTier,
  subscriptionId?: string,
  customerId?: string
) {
  await connectDB();
  await User.findByIdAndUpdate(userId, {
    subscriptionTier: tier,
    ...(subscriptionId && { stripeSubscriptionId: subscriptionId }),
    ...(customerId && { stripeCustomerId: customerId }),
  });
}

export async function POST(request: Request) {
  const body = await request.text();
  const headersList = await headers();
  const signature = headersList.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = getStripe().webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
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

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook handler error:", error);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}
