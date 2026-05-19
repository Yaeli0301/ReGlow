import type { SubscriptionTier } from "@/types";
import { PLAN_FEATURES } from "@/types";

export function hasActiveSubscription(tier: SubscriptionTier): boolean {
  return tier !== "none";
}

interface OverrideShape {
  tier?: SubscriptionTier;
  until?: Date | string | null;
  discountPercent?: number;
}

/** Returns true if an admin override is currently in effect. */
export function isOverrideActive(override?: OverrideShape | null): boolean {
  if (!override?.tier || override.tier === "none") return false;
  if (!override.until) return true;
  const until = new Date(override.until);
  if (Number.isNaN(until.getTime())) return false;
  return until.getTime() > Date.now();
}

/** Effective tier = admin override (when active) OR paid Stripe tier. */
export function getEffectiveTier(
  paidTier: SubscriptionTier,
  override?: OverrideShape | null
): SubscriptionTier {
  if (isOverrideActive(override)) return override!.tier!;
  return paidTier;
}

export function canAccess(
  tier: SubscriptionTier,
  feature: keyof (typeof PLAN_FEATURES)["premium"]
): boolean {
  return PLAN_FEATURES[tier]?.[feature] ?? false;
}

export function tierRank(tier: SubscriptionTier): number {
  const ranks: Record<SubscriptionTier, number> = {
    none: 0,
    basic: 1,
    pro: 2,
    premium: 3,
  };
  return ranks[tier];
}

export function meetsMinimumTier(
  userTier: SubscriptionTier,
  required: SubscriptionTier
): boolean {
  return tierRank(userTier) >= tierRank(required);
}
