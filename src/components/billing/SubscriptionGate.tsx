"use client";

import Link from "next/link";
import { useT } from "@/contexts/LanguageContext";

interface SubscriptionGateProps {
  title?: string;
  description?: string;
  className?: string;
}

export function SubscriptionGate({ title, description, className = "" }: SubscriptionGateProps) {
  const t = useT();

  return (
    <div
      className={`rounded-2xl border border-brand-200 bg-gradient-to-br from-brand-50 via-white to-accent-400/10 p-6 text-center shadow-soft ${className}`}
    >
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-accent-500 text-2xl text-white shadow-soft">
        💳
      </div>
      <h3 className="text-lg font-bold text-brand-800">
        {title || t("clients.subscriptionRequiredTitle")}
      </h3>
      <p className="mt-2 text-sm text-gray-600">
        {description || t("clients.subscriptionRequiredDesc")}
      </p>
      <Link href="/billing" className="btn-primary mt-5 inline-flex">
        {t("clients.choosePlanCta")} →
      </Link>
    </div>
  );
}
