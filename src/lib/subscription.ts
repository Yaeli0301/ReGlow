import type { SubscriptionTier } from "@/types";
import { PLAN_FEATURES } from "@/types";

export function hasActiveSubscription(tier: SubscriptionTier): boolean {
  return tier !== "none";
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
