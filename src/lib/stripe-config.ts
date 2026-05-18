import type { SubscriptionTier } from "@/types";
import { PRICE_IDS } from "@/lib/stripe";

const PLACEHOLDER_PRICES = new Set(["price_basic", "price_pro", "price_premium", ""]);

export function isStripeConfigured(): boolean {
  const key = process.env.STRIPE_SECRET_KEY?.trim() || "";
  if (!key || key.includes("placeholder") || !key.startsWith("sk_")) {
    return false;
  }

  return (["basic", "pro", "premium"] as const).every((tier) => {
    const priceId = PRICE_IDS[tier];
    return Boolean(priceId && !PLACEHOLDER_PRICES.has(priceId) && priceId.startsWith("price_"));
  });
}

export function getStripeConfigError(locale: "he" | "en" = "he"): string {
  if (locale === "en") {
    return "Payments are not configured yet. Add real Stripe API keys and Price IDs in .env.local (see .env.example).";
  }
  return "התשלומים עדיין לא מוגדרים. יש להוסיף מפתחות Stripe אמיתיים ו-Price IDs בקובץ .env.local (ראי .env.example).";
}

export function validateTierPrice(tier: Exclude<SubscriptionTier, "none">): string | null {
  const priceId = PRICE_IDS[tier];
  if (!priceId || PLACEHOLDER_PRICES.has(priceId)) {
    return `Missing Stripe price for plan: ${tier}`;
  }
  return null;
}
