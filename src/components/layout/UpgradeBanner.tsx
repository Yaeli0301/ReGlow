"use client";

import Link from "next/link";
import type { SubscriptionTier } from "@/types";

export function UpgradeBanner({ tier }: { tier: SubscriptionTier }) {
  if (tier === "premium") return null;

  const message =
    tier === "none"
      ? "Subscribe to unlock your salon dashboard"
      : tier === "basic"
        ? "Upgrade to Pro for appointments & lost client automation"
        : "Upgrade to Premium for online booking — Saves 5+ hours/week";

  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-gradient-to-r from-brand-500 to-accent-500 px-5 py-3 text-white shadow-soft">
      <p className="text-sm font-medium">{message}</p>
      <Link
        href="/billing"
        className="rounded-xl bg-white/20 px-4 py-1.5 text-sm font-semibold backdrop-blur transition hover:bg-white/30"
      >
        Upgrade →
      </Link>
    </div>
  );
}
