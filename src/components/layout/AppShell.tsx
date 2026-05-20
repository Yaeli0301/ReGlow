"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import type { SessionUser, SubscriptionTier } from "@/types";
import { UpgradeBanner } from "./UpgradeBanner";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { useT } from "@/contexts/LanguageContext";
import { AppUserProvider } from "@/contexts/AppUserContext";
import { hasActiveSubscription, canAccess } from "@/lib/subscription";
import type { PLAN_FEATURES } from "@/types";
import dynamic from "next/dynamic";
import { DemoModeBanner } from "@/components/demo/DemoModeBanner";
import { DemoUpsellModal } from "@/components/demo/DemoUpsellModal";
import { MaintenanceBanner } from "@/components/system/MaintenanceBanner";
import { MobileBottomNav } from "./MobileBottomNav";

const PendingCashPaymentsSlot = dynamic(
  () =>
    import("@/components/payments/PendingCashPaymentsSlot").then((m) => ({
      default: m.PendingCashPaymentsSlot,
    })),
  { ssr: false, loading: () => null }
);
import {
  IconCalendar,
  IconCard,
  IconClock,
  IconDashboard,
  IconHeart,
  IconLogout,
  IconSparkle,
  IconUsers,
} from "./NavIcons";

const TIER_LABELS: Record<SubscriptionTier, { he: string; en: string }> = {
  none: { he: "ללא מנוי", en: "No plan" },
  basic: { he: "Basic", en: "Basic" },
  pro: { he: "Pro", en: "Pro" },
  premium: { he: "Premium", en: "Premium" },
};

export function AppShell({
  user,
  children,
  demoMode = false,
  landingDemo = false,
  demoEmail,
}: {
  user: SessionUser;
  children: React.ReactNode;
  demoMode?: boolean;
  /** Visitor came from external landing → /demo/start (show register CTA). */
  landingDemo?: boolean;
  demoEmail?: string;
}) {
  return (
    <AppUserProvider user={user} demoMode={demoMode}>
      <AppShellInner
        user={user}
        demoMode={demoMode}
        landingDemo={landingDemo}
        demoEmail={demoEmail}
      >
        {children}
      </AppShellInner>
    </AppUserProvider>
  );
}

function AppShellInner({
  user,
  children,
  demoMode,
  landingDemo = false,
  demoEmail,
}: {
  user: SessionUser;
  children: React.ReactNode;
  demoMode?: boolean;
  landingDemo?: boolean;
  demoEmail?: string;
}) {
  const pathname = usePathname();
  const { logout, roleLabel, welcomeLabel, isAdmin } = useAuth();
  const t = useT();
  const subscribed = hasActiveSubscription(user.subscriptionTier);

  const navItems: Array<{
    href: string;
    label: string;
    Icon: typeof IconDashboard;
    highlight?: boolean;
    feature?: keyof (typeof PLAN_FEATURES)["premium"];
  }> = [
    ...(isAdmin
      ? [{ href: "/admin-dashboard", label: t("admin.dashboardTitle"), Icon: IconDashboard }]
      : []),
    { href: "/dashboard", label: t("nav.dashboard"), Icon: IconDashboard, feature: "dashboard" },
    { href: "/appointments", label: t("nav.appointments"), Icon: IconCalendar, feature: "appointments" },
    { href: "/schedule", label: t("nav.schedule"), Icon: IconClock, feature: "appointments" },
    { href: "/clients", label: t("nav.clients"), Icon: IconUsers, feature: "clients" },
    { href: "/lost-clients", label: t("nav.lostClients"), Icon: IconHeart, feature: "lostClients" },
    { href: "/pricing", label: t("nav.pricing"), Icon: IconCard, feature: "appointments" },
    { href: "/invoices", label: t("nav.invoices"), Icon: IconCard, feature: "appointments" },
    { href: "/settings/branding", label: t("nav.branding"), Icon: IconSparkle, feature: "appointments" },
    { href: "/feedback", label: t("nav.feedback"), Icon: IconHeart },
    ...(user.role === "admin"
      ? [
          { href: "/admin/feedback", label: t("nav.adminFeedback"), Icon: IconSparkle },
          { href: "/admin/debug", label: "Debug", Icon: IconSparkle },
        ]
      : []),
    { href: "/billing", label: t("nav.billing"), Icon: IconCard, highlight: !subscribed },
  ];

  const initial = user.businessName?.charAt(0)?.toUpperCase() || "R";
  const tierLabel = TIER_LABELS[user.subscriptionTier];

  function isNavLocked(feature?: keyof (typeof PLAN_FEATURES)["premium"]) {
    if (!feature) return false;
    return !canAccess(user.subscriptionTier, feature);
  }

  return (
    <div className="flex min-h-screen overflow-x-hidden bg-gradient-to-br from-brand-50/40 via-white to-accent-400/5">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 end-0 z-40 hidden w-[17.5rem] flex-col lg:flex">
        <div className="flex h-full flex-col overflow-hidden border-s border-white/20 bg-gradient-to-b from-brand-900 via-brand-800 to-accent-600 shadow-2xl shadow-brand-900/20">
          {/* Brand */}
          <div className="border-b border-white/10 px-5 py-6">
            <Link href="/dashboard" className="group flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 shadow-lg ring-1 ring-white/20 backdrop-blur-sm transition group-hover:bg-white/25">
                <IconSparkle className="h-6 w-6 text-pink-200" />
              </div>
              <div>
                <span className="text-xl font-bold tracking-tight text-white">ReGlow</span>
                <p className="text-xs font-medium text-pink-200/80">{t("nav.tagline")}</p>
              </div>
            </Link>
          </div>

          {/* Nav */}
          <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
            {navItems.map((item) => {
              const active = pathname === item.href;
              const Icon = item.Icon;
              const locked = isNavLocked(item.feature);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch
                  className={`group relative flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-all duration-200 ${
                    active
                      ? "bg-white text-brand-700 shadow-lg shadow-black/10"
                      : item.highlight
                        ? "bg-white/15 text-white ring-1 ring-white/30 hover:bg-white/25"
                        : locked
                          ? "text-pink-100/50 hover:bg-white/10 hover:text-pink-100/70"
                          : "text-pink-100/90 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {active && (
                    <span className="absolute inset-y-2 start-0 w-1 rounded-full bg-gradient-to-b from-brand-400 to-accent-400" />
                  )}
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition ${
                      active
                        ? "bg-gradient-to-br from-brand-500 to-accent-500 text-white"
                        : "bg-white/10 text-pink-100 group-hover:bg-white/20 group-hover:text-white"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="truncate">{item.label}</span>
                  {locked && (
                    <span className="ms-auto rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-bold text-pink-100/80 ring-1 ring-white/20">
                      Pro+
                    </span>
                  )}
                  {item.highlight && !subscribed && (
                    <span className="ms-auto rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-bold text-amber-950">
                      {t("nav.new")}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* User card */}
          <div className="border-t border-white/10 p-4">
            <div className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/15 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-pink-300 to-purple-300 text-lg font-bold text-brand-900 shadow-md">
                  {initial}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-white">{user.businessName}</p>
                  <p className="truncate text-xs text-pink-200/80">{welcomeLabel}</p>
                  <p className="truncate text-xs text-pink-200/70">{user.email}</p>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between gap-2">
                <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-[10px] font-bold text-pink-100 ring-1 ring-white/20">
                  {roleLabel}
                </span>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                    subscribed
                      ? "bg-emerald-400/20 text-emerald-200 ring-1 ring-emerald-400/30"
                      : "bg-amber-400/20 text-amber-200 ring-1 ring-amber-400/30"
                  }`}
                >
                  {tierLabel.he}
                </span>
                {!subscribed && (
                  <Link
                    href="/billing"
                    className="text-[10px] font-semibold text-pink-200 underline-offset-2 hover:underline"
                  >
                    {t("nav.upgradeShort")}
                  </Link>
                )}
              </div>
            </div>

            <div className="mt-3 space-y-2">
              <LanguageSwitcher className="w-full border-white/20 bg-white/10 [&_button]:text-white [&_button]:hover:bg-white/20" />
              <button
                type="button"
                onClick={() => logout()}
                className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-pink-100/90 transition hover:bg-white/10 hover:text-white"
              >
                <IconLogout className="h-4 w-4" />
                {t("nav.signOut")}
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex min-h-screen flex-1 flex-col overflow-x-hidden lg:me-[17.5rem]">
        {/* Mobile header */}
        <header className="sticky top-0 z-30 border-b border-brand-100/60 bg-white/90 shadow-sm backdrop-blur-xl lg:hidden">
          <div className="flex items-center justify-between px-4 py-3">
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-accent-500 text-white shadow-soft">
                <IconSparkle className="h-5 w-5" />
              </div>
              <span className="text-lg font-bold text-brand-700">ReGlow</span>
            </Link>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => logout()}
                className="flex items-center gap-1 rounded-lg bg-brand-50 px-2 py-1.5 text-[10px] font-semibold text-brand-700"
                aria-label={t("nav.signOut")}
              >
                <IconLogout className="h-4 w-4" />
                {t("nav.signOut")}
              </button>
              <LanguageSwitcher />
            </div>
          </div>
        </header>

        <div className="flex-1 px-4 py-4 pb-24 md:px-10 md:py-8 md:pb-8 lg:p-8">
          <MaintenanceBanner />
          <DemoModeBanner
            demo={demoMode}
            landingDemo={landingDemo}
            demoEmail={demoEmail}
            subscriptionTier={user.subscriptionTier}
          />
          <UpgradeBanner tier={user.subscriptionTier} demoMode={demoMode} />
          <PendingCashPaymentsSlot />
          <DemoUpsellModal active={demoMode} />
          {children}
        </div>
        {!isAdmin && <MobileBottomNav user={user} />}
      </main>
    </div>
  );
}
