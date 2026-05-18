import type { SubscriptionTier } from "@/types";
import type { Locale } from "./index";
import { getDictionary } from "./index";

export function getTranslatedPlans(locale: Locale) {
  const d = getDictionary(locale);
  return [
    {
      id: "basic" as const,
      name: d.plans.basic,
      price: 99,
      description: d.plans.basicDesc,
      popular: false,
      tag: null as string | null,
    },
    {
      id: "pro" as const,
      name: d.plans.pro,
      price: 199,
      description: d.plans.proDesc,
      popular: true,
      tag: d.plans.mostPopular,
    },
    {
      id: "premium" as const,
      name: d.plans.premium,
      price: 299,
      description: d.plans.premiumDesc,
      popular: false,
      tag: d.plans.savesHours,
    },
  ];
}

export function tierLabel(locale: Locale, tier: SubscriptionTier): string {
  const d = getDictionary(locale);
  if (tier === "none") return "";
  return d.plans[tier];
}
