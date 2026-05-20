import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import { requireAuthFromRequest } from "@/lib/api-auth";
import { resolveAppOrigin } from "@/lib/app-url";
import { shouldBlockPaidCheckout } from "@/lib/env";
import { createCheckoutSession, getStripe } from "@/lib/stripe";
import { getStripeConfigError, isStripeConfigured, validateTierPrice } from "@/lib/stripe-config";
import { User } from "@/models/User";
import { logger } from "@/lib/logger";
import type { SubscriptionTier } from "@/types";

const schema = z.object({
  tier: z.enum(["basic", "pro", "premium"]),
  useReferralReward: z.boolean().optional(),
});

export async function POST(request: Request) {
  const auth = await requireAuthFromRequest(request, { loadDbUser: true });
  if (auth instanceof NextResponse) return auth;

  try {
    if (shouldBlockPaidCheckout(auth.user.email)) {
      return NextResponse.json(
        {
          error: "בדמו אין תשלום אמיתי — החליפי חבילה מהבאנר או מדף המנוי",
          code: "DEMO_CHECKOUT_BLOCKED",
        },
        { status: 403 }
      );
    }

    if (!isStripeConfigured()) {
      return NextResponse.json(
        { error: getStripeConfigError("he"), code: "STRIPE_NOT_CONFIGURED" },
        { status: 503 }
      );
    }

    await connectDB();

    const body = await request.json();
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    const tier = parsed.data.tier as Exclude<SubscriptionTier, "none">;
    const priceError = validateTierPrice(tier);
    if (priceError) {
      return NextResponse.json(
        { error: getStripeConfigError("he"), code: "STRIPE_PRICE_INVALID" },
        { status: 503 }
      );
    }
    const { dbUser } = auth;

    let useReferralReward = false;
    if (parsed.data.useReferralReward && dbUser && dbUser.referralRewardMonths > 0) {
      useReferralReward = true;
    }

    let customerId = dbUser?.stripeCustomerId;

    if (!customerId) {
      const customer = await getStripe().customers.create({
        email: auth.user.email,
        metadata: { userId: auth.user.id },
      });
      customerId = customer.id;
      await User.findByIdAndUpdate(auth.user.id, { stripeCustomerId: customerId });
    }

    // Apply admin-granted discount (one-time) if present and not yet consumed.
    const adminDiscountPercent =
      dbUser?.adminOverride?.discountPercent && dbUser.adminOverride.discountPercent > 0
        ? dbUser.adminOverride.discountPercent
        : undefined;

    const session = await createCheckoutSession({
      customerId,
      customerEmail: auth.user.email,
      userId: auth.user.id,
      tier,
      useReferralReward,
      adminDiscountPercent,
      appOrigin: resolveAppOrigin(request),
    });

    // Consume the discount so it isn't reused on another checkout
    if (adminDiscountPercent) {
      await User.findByIdAndUpdate(auth.user.id, {
        $unset: { "adminOverride.discountPercent": "" },
      });
    }

    logger.info("Stripe checkout created", {
      userId: auth.user.id,
      tier,
      useReferralReward,
      adminDiscountPercent,
      sessionId: session.id,
    });

    return NextResponse.json({
      success: true,
      url: session.url,
      usedReferralReward: useReferralReward,
    });
  } catch (error) {
    logger.error("Checkout error", {
      userId: auth.user.id,
      err: error instanceof Error ? error.message : String(error),
    });
    const message =
      error instanceof Error && error.message.includes("No such price")
        ? "מזהה מחיר Stripe לא תקין — בדקי את STRIPE_PRICE_* ב-.env.local"
        : "יצירת תשלום נכשלה. נסי שוב או פני לתמיכה.";
    return NextResponse.json(
      { success: false, error: message, code: "CHECKOUT_FAILED" },
      { status: 500 }
    );
  }
}
