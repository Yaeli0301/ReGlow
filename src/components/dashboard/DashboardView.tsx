"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import dynamic from "next/dynamic";
import { HelpTooltip } from "@/components/ui/HelpTooltip";
import { DashboardSkeleton } from "@/components/dashboard/DashboardSkeleton";
import { ShareBookingLink } from "@/components/dashboard/ShareBookingLink";
import { ProductTour } from "@/components/onboarding/ProductTour";
import { useT } from "@/contexts/LanguageContext";
import { useAppUser, useHasSubscription } from "@/contexts/AppUserContext";
import { parseJsonResponse } from "@/lib/client-api";
import { Button } from "@/components/ui/Button";
import { SubscriptionGate } from "@/components/billing/SubscriptionGate";
import { canAccess } from "@/lib/subscription";
import type { DashboardStatsData } from "@/lib/dashboard-stats";

const ReferralPanel = dynamic(
  () => import("@/components/referral/ReferralPanel").then((m) => ({ default: m.ReferralPanel })),
  { ssr: false, loading: () => <div className="card hidden h-24 animate-pulse rounded-2xl bg-brand-50 md:block" /> }
);

function interpolate(template: string, vars: Record<string, string | number>) {
  return Object.entries(vars).reduce(
    (s, [k, v]) => s.replace(new RegExp(`\\{${k}\\}`, "g"), String(v)),
    template
  );
}

export function DashboardView({
  initialStats,
  serverLoadFailed = false,
}: {
  initialStats: DashboardStatsData | null;
  serverLoadFailed?: boolean;
}) {
  const t = useT();
  const user = useAppUser();
  const hasSubscription = useHasSubscription();
  const hasLostAccess = canAccess(user.subscriptionTier, "lostClients");
  const hasBookingAccess = canAccess(user.subscriptionTier, "booking");

  const [stats, setStats] = useState<DashboardStatsData | null>(initialStats);
  const [loading, setLoading] = useState(!initialStats && hasSubscription);
  const [loadError, setLoadError] = useState(false);

  const loadStats = useCallback(() => {
    if (!hasSubscription) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadError(false);

    const ac = new AbortController();
    fetch("/api/dashboard/stats", { signal: ac.signal })
      .then((res) => parseJsonResponse<DashboardStatsData>(res))
      .then((result) => {
        if (!result.ok) {
          if (result.status !== 403) setLoadError(true);
          return;
        }
        setStats(result.data);
      })
      .catch((err) => {
        if (err instanceof Error && err.name === "AbortError") return;
        setLoadError(true);
      })
      .finally(() => setLoading(false));

    return () => ac.abort();
  }, [hasSubscription]);

  useEffect(() => {
    if (initialStats) return;
    const cleanup = loadStats();
    return cleanup;
  }, [initialStats, loadStats]);

  const returnRate = useMemo(() => {
    if (!stats || stats.totalClients === 0) return 0;
    return Math.round((stats.returningThisMonth / stats.totalClients) * 100);
  }, [stats]);

  if (!hasSubscription) {
    return (
      <div>
        <h1 className="text-2xl font-bold">{t("dashboard.title")}</h1>
        <SubscriptionGate className="mt-6" />
      </div>
    );
  }

  if (loading && !stats) return <DashboardSkeleton />;

  if (loadError || !stats) {
    return (
      <div className="card max-w-lg text-center">
        <h1 className="text-xl font-bold text-red-600">{t("dashboard.loadError")}</h1>
        <p className="mt-2 text-sm text-gray-600">
          {serverLoadFailed ? t("dashboard.loadErrorDb") : t("dashboard.loadErrorHint")}
        </p>
        <Button className="mt-4 min-h-[44px]" onClick={loadStats}>
          {t("common.retry")}
        </Button>
      </div>
    );
  }

  const heroCtaHref = hasLostAccess
    ? stats.lostClients > 0
      ? "/recover-clients"
      : "/clients"
    : "/billing";
  const heroCtaLabel = hasLostAccess
    ? stats.lostClients > 0
      ? t("dashboard.heroCta")
      : t("dashboard.quickAddClient")
    : t("dashboard.heroLockedCta");

  const showSticky = hasLostAccess && stats.lostClients > 0;

  return (
    <div className="pb-32 md:pb-8">
      <ProductTour />
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">{t("dashboard.title")}</h1>
          <p className="mt-1 text-gray-500">{t("dashboard.subtitle")}</p>
        </div>
        <HelpTooltip
          title={t("dashboard.heroTipTitle")}
          body={t("dashboard.heroTipBody")}
          action={t("dashboard.heroTipAction")}
        />
      </div>

      <section className="mt-6">
        <div className="rounded-2xl border-2 border-brand-300 bg-gradient-to-br from-brand-50 via-white to-brand-100/80 p-6 shadow-sm transition hover:border-brand-400 hover:shadow-md md:p-8">
          {stats.lostClients === 0 ? (
            <>
              <p className="text-xl font-bold text-brand-800 md:text-2xl">{t("dashboard.heroEmpty")}</p>
              <Link href="/clients" className="btn-primary mt-6 inline-flex min-h-[48px] items-center px-6 text-base">
                {t("dashboard.quickAddClient")}
              </Link>
            </>
          ) : (
            <>
              <p className="text-2xl font-extrabold leading-tight text-gray-900 md:text-3xl">
                {interpolate(t("dashboard.heroTitle"), { count: stats.lostClients })}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <p className="text-lg text-brand-700">
                  {interpolate(t("dashboard.heroSubtitle"), {
                    amount: stats.lostPotentialRevenue ?? 0,
                  })}
                </p>
                <HelpTooltip
                  title={t("dashboard.potentialTipTitle")}
                  body={t("dashboard.potentialTipBody")}
                  action={t("dashboard.potentialTipAction")}
                />
              </div>
              <p className="mt-2 text-sm text-gray-600">{t("dashboard.moneyWaiting")}</p>
              {!hasLostAccess && (
                <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
                  {interpolate(t("dashboard.heroLockedHint"), { count: stats.lostClients })}
                </p>
              )}
              <Link href={heroCtaHref} className="btn-primary mt-6 shadow-md">
                {heroCtaLabel}
              </Link>
            </>
          )}
        </div>
      </section>

      <section className="card mt-6">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-gray-900">{t("dashboard.upcomingWeekTitle")}</h2>
          <HelpTooltip
            title={t("dashboard.upcomingTipTitle")}
            body={t("dashboard.upcomingTipBody")}
            action={t("dashboard.upcomingTipAction")}
          />
        </div>
        {stats.upcomingAppointments.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-brand-200 bg-brand-50/40 p-4 text-center">
            <p className="text-sm text-gray-600">{t("dashboard.noUpcoming")}</p>
            {hasLostAccess && (
              <Link href="/recover-clients" className="btn-primary mt-4 inline-flex min-h-[44px]">
                {t("dashboard.noUpcomingCta")}
              </Link>
            )}
          </div>
        ) : (
          <ul className="mt-4 space-y-2">
            {stats.upcomingAppointments.map((a) => (
              <li
                key={a._id}
                className="flex items-center justify-between rounded-xl border border-brand-100 bg-brand-50/60 px-4 py-3 text-sm transition hover:border-brand-200 hover:bg-brand-100"
              >
                <span className="font-medium text-gray-900">{a.clientId?.name ?? "—"}</span>
                <span className="tabular-nums font-medium text-brand-700">
                  {format(new Date(a.date), "HH:mm")}
                </span>
              </li>
            ))}
          </ul>
        )}
        <Link href="/appointments" className="btn-secondary mt-4">
          {t("dashboard.goToCalendar")}
        </Link>
      </section>

      <section className="mt-6">
        <h2 className="mb-3 text-lg font-semibold text-gray-900">{t("dashboard.whatNow")}</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <QuickActionCard href="/appointments" label={t("dashboard.quickBook")} emoji="📅" />
          <QuickActionCard href="#booking-link" label={t("dashboard.quickShareLink")} emoji="🔗" />
          <QuickActionCard href="/clients" label={t("dashboard.quickAddClient")} emoji="👤" />
        </div>
      </section>

      <div id="booking-link" className="mt-6 scroll-mt-28">
        <ShareBookingLink businessId={user.id} locked={!hasBookingAccess} />
      </div>

      <section className="mt-6 grid grid-cols-3 gap-3">
        <MetricPill label={t("dashboard.metricsReturning")} value={stats.returningThisMonth} />
        <MetricPill
          label={t("dashboard.metricsRevenue")}
          value={`${t("common.currency")}${stats.returningRevenue}`}
        />
        <MetricPill label={t("dashboard.metricsReturnRate")} value={`${returnRate}%`} />
      </section>

      {stats.todayAppointments.length > 0 && (
        <section className="card mt-6">
          <h2 className="font-semibold text-brand-700">{t("dashboard.todayTitle")}</h2>
          <ul className="mt-3 space-y-2">
            {stats.todayAppointments.map((a) => (
              <li
                key={a._id}
                className="flex justify-between rounded-xl bg-brand-50 px-4 py-2.5 text-sm"
              >
                <span>{a.clientId?.name ?? "—"}</span>
                <span className="font-medium text-brand-600">{format(new Date(a.date), "HH:mm")}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mt-8 hidden md:block">
        <ReferralPanel compact />
      </div>

      {showSticky && (
        <div
          className="fixed inset-x-0 z-40 border-t border-brand-200 bg-white/95 p-3 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] md:hidden"
          style={{ bottom: "calc(4.25rem + env(safe-area-inset-bottom))" }}
        >
          <Link href="/recover-clients" className="btn-primary">
            {t("dashboard.stickyCta")}
          </Link>
        </div>
      )}
    </div>
  );
}

function MetricPill({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white px-3 py-3 text-center shadow-sm">
      <p className="text-[10px] font-medium text-gray-500 sm:text-xs">{label}</p>
      <p className="mt-1 text-lg font-bold text-brand-700 sm:text-xl">{value}</p>
    </div>
  );
}

function QuickActionCard({ href, label, emoji }: { href: string; label: string; emoji: string }) {
  return (
    <Link
      href={href}
      className="card flex min-h-[80px] flex-col items-center justify-center gap-1 border-brand-100 text-center transition hover:border-brand-400 hover:bg-brand-50 hover:shadow-md"
    >
      <span className="text-2xl" aria-hidden>
        {emoji}
      </span>
      <span className="text-sm font-semibold text-gray-800">{label}</span>
    </Link>
  );
}
