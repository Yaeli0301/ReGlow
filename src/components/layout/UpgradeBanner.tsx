"use client";

import Link from "next/link";
import { useState } from "react";
import type { SubscriptionTier } from "@/types";
import { useT } from "@/contexts/LanguageContext";
import { switchDemoPlan, type DemoPlan } from "@/lib/demo/switch-demo-plan-client";

const DEMO_UPGRADE: Partial<
  Record<SubscriptionTier, { message: string; plan: Exclude<SubscriptionTier, "none">; label: string }>
> = {
  basic: { message: "בדמו Basic — נסי Pro ליומן תורים ולקוחות אבודים", plan: "pro", label: "Pro" },
  pro: {
    message: "בדמו Pro — נסי Premium לדף הזמנות אונליין",
    plan: "premium",
    label: "Premium",
  },
};

export function UpgradeBanner({
  tier,
  demoMode = false,
}: {
  tier: SubscriptionTier;
  demoMode?: boolean;
}) {
  const t = useT();
  const [switching, setSwitching] = useState(false);

  if (tier === "premium") return null;

  if (demoMode) {
    const next = DEMO_UPGRADE[tier];
    if (!next) return null;

    return (
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-gradient-to-r from-brand-500 to-accent-500 px-5 py-3 text-white shadow-soft">
        <p className="text-sm font-medium">{next.message}</p>
        <button
          type="button"
          disabled={switching}
          onClick={async () => {
            setSwitching(true);
            const result = await switchDemoPlan(next.plan as DemoPlan);
            setSwitching(false);
            if (result.ok) window.location.reload();
          }}
          className="rounded-xl bg-white/20 px-4 py-1.5 text-sm font-semibold backdrop-blur transition hover:bg-white/30 disabled:opacity-60"
        >
          {switching ? "..." : `נסי ${next.label} בדמו →`}
        </button>
      </div>
    );
  }

  const message =
    tier === "none"
      ? t("upgrade.none")
      : tier === "basic"
        ? t("upgrade.basic")
        : t("upgrade.premium");

  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-gradient-to-r from-brand-500 to-accent-500 px-5 py-3 text-white shadow-soft">
      <p className="text-sm font-medium">{message}</p>
      <Link
        href="/billing"
        className="rounded-xl bg-white/20 px-4 py-1.5 text-sm font-semibold backdrop-blur transition hover:bg-white/30"
      >
        {t("upgrade.cta")} →
      </Link>
    </div>
  );
}
