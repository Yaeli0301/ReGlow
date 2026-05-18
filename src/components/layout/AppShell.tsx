"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { SessionUser, SubscriptionTier } from "@/types";
import { UpgradeBanner } from "./UpgradeBanner";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { useT } from "@/contexts/LanguageContext";
import { AppUserProvider } from "@/contexts/AppUserContext";
import { hasActiveSubscription } from "@/lib/subscription";
import { PendingCashPaymentsSlot } from "@/components/payments/PendingCashPaymentsSlot";
import { DemoModeBanner } from "@/components/demo/DemoModeBanner";
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

export function AppShell({ user, children }: { user: SessionUser; children: React.ReactNode }) {
  return (
    <AppUserProvider user={user}>
      <AppShellInner user={user}>{children}</AppShellInner>
    </AppUserProvider>
  );
}

function AppShellInner({ user, children }: { user: SessionUser; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const t = useT();
  const subscribed = hasActiveSubscription(user.subscriptionTier);

  const navItems = [
    { href: "/dashboard", label: t("nav.dashboard"), Icon: IconDashboard },
    { href: "/appointments", label: t("nav.appointments"), Icon: IconCalendar, minTier: "pro" as const },
    { href: "/schedule", label: t("nav.schedule"), Icon: IconClock },
    { href: "/clients", label: t("nav.clients"), Icon: IconUsers, requiresPaid: true },
    { href: "/lost-clients", label: t("nav.lostClients"), Icon: IconHeart, minTier: "pro" as const },
    { href: "/pricing", label: t("nav.pricing"), Icon: IconCard },
    { href: "/invoices", label: t("nav.invoices"), Icon: IconCard },
    { href: "/settings/branding", label: t("nav.branding"), Icon: IconSparkle },
    { href: "/feedback", label: t("nav.feedback"), Icon: IconHeart },
    ...(user.role === "admin"
      ? [
          { href: "/admin/feedback", label: t("nav.adminFeedback"), Icon: IconSparkle },
          { href: "/admin/debug", label: "Debug", Icon: IconSparkle },
        ]
      : []),
    { href: "/billing", label: t("nav.billing"), Icon: IconCard, highlight: !subscribed },
  ];

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const initial = user.businessName?.charAt(0)?.toUpperCase() || "R";
  const tierLabel = TIER_LABELS[user.subscriptionTier];

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-brand-50/40 via-white to-accent-400/5">
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
                  <p className="truncate text-xs text-pink-200/70">{user.email}</p>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between gap-2">
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
                onClick={handleLogout}
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
      <main className="flex min-h-screen flex-1 flex-col lg:me-[17.5rem]">
        {/* Mobile header */}
        <header className="sticky top-0 z-30 border-b border-brand-100/60 bg-white/90 shadow-sm backdrop-blur-xl lg:hidden">
          <div className="flex items-center justify-between px-4 py-3">
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-accent-500 text-white shadow-soft">
                <IconSparkle className="h-5 w-5" />
              </div>
              <span className="text-lg font-bold text-brand-700">ReGlow</span>
            </Link>
            <LanguageSwitcher />
          </div>
          <nav className="flex gap-1 overflow-x-auto px-3 pb-3 scrollbar-hide">
            {navItems.map((item) => {
              const active = pathname === item.href;
              const Icon = item.Icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex shrink-0 flex-col items-center gap-1 rounded-2xl px-3 py-2 text-[10px] font-semibold transition ${
                    active
                      ? "bg-gradient-to-br from-brand-500 to-accent-500 text-white shadow-soft"
                      : "bg-brand-50 text-brand-600"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span className="max-w-[4.5rem] truncate">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </header>

        <div className="flex-1 p-4 lg:p-8">
          <DemoModeBanner />
          <UpgradeBanner tier={user.subscriptionTier} />
          <PendingCashPaymentsSlot />
          {children}
        </div>
      </main>
    </div>
  );
}
