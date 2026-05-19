import Stripe from "stripe";
import type { SubscriptionTier } from "@/types";

let stripeInstance: Stripe | null = null;

export function getStripe(): Stripe {
  if (!stripeInstance) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
    stripeInstance = new Stripe(key);
  }
  return stripeInstance;
}

export const PRICE_IDS: Record<Exclude<SubscriptionTier, "none">, string> = {
  basic: process.env.STRIPE_PRICE_BASIC || "",
  pro: process.env.STRIPE_PRICE_PRO || "",
  premium: process.env.STRIPE_PRICE_PREMIUM || "",
};

export function tierFromPriceId(priceId: string): SubscriptionTier {
  if (priceId === process.env.STRIPE_PRICE_BASIC) return "basic";
  if (priceId === process.env.STRIPE_PRICE_PRO) return "pro";
  if (priceId === process.env.STRIPE_PRICE_PREMIUM) return "premium";
  return "none";
}

/** Creates an ad-hoc, one-off Stripe coupon for an admin-granted % discount. */
async function createAdminDiscountCoupon(percent: number): Promise<string | undefined> {
  if (!percent || percent <= 0 || percent > 100) return undefined;
  try {
    const stripe = getStripe();
    const coupon = await stripe.coupons.create({
      percent_off: percent,
      duration: "once",
      name: `ReGlow admin ${percent}% off`,
    });
    return coupon.id;
  } catch {
    return undefined;
  }
}

export async function createCheckoutSession(params: {
  customerId?: string;
  customerEmail: string;
  userId: string;
  tier: Exclude<SubscriptionTier, "none">;
  useReferralReward?: boolean;
  /** Admin-granted % discount applied once at checkout. */
  adminDiscountPercent?: number;
}): Promise<Stripe.Checkout.Session> {
  const stripe = getStripe();
  const priceId = PRICE_IDS[params.tier];

  const couponId = params.adminDiscountPercent
    ? await createAdminDiscountCoupon(params.adminDiscountPercent)
    : undefined;

  return stripe.checkout.sessions.create({
    mode: "subscription",
    customer: params.customerId,
    customer_email: params.customerId ? undefined : params.customerEmail,
    line_items: [{ price: priceId, quantity: 1 }],
    ...(couponId ? { discounts: [{ coupon: couponId }] } : {}),
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing?success=true&referral_reward=${params.useReferralReward ? "1" : "0"}`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing?canceled=true`,
    metadata: {
      userId: params.userId,
      tier: params.tier,
      useReferralReward: params.useReferralReward ? "true" : "false",
      ...(params.adminDiscountPercent
        ? { adminDiscountPercent: String(params.adminDiscountPercent) }
        : {}),
    },
    subscription_data: {
      ...(params.useReferralReward ? { trial_period_days: 30 } : {}),
      metadata: {
        userId: params.userId,
        tier: params.tier,
        useReferralReward: params.useReferralReward ? "true" : "false",
      },
    },
  });
}

export async function createBillingPortalSession(
  customerId: string
): Promise<Stripe.BillingPortal.Session> {
  const stripe = getStripe();
  return stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing`,
  });
}
