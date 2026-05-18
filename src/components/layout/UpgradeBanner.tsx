"use client";

import Link from "next/link";
import type { SubscriptionTier } from "@/types";
import { useT } from "@/contexts/LanguageContext";

export function UpgradeBanner({ tier }: { tier: SubscriptionTier }) {
  const t = useT();

  if (tier === "premium") return null;

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
