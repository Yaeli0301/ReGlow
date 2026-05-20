"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useT } from "@/contexts/LanguageContext";
import { canAccess } from "@/lib/subscription";
import type { SessionUser } from "@/types";
import {
  IconCalendar,
  IconDashboard,
  IconHeart,
  IconUsers,
} from "./NavIcons";

const MOBILE_NAV = [
  { href: "/dashboard", labelKey: "nav.dashboard" as const, Icon: IconDashboard, feature: "dashboard" as const },
  { href: "/appointments", labelKey: "nav.appointments" as const, Icon: IconCalendar, feature: "appointments" as const },
  { href: "/clients", labelKey: "nav.clients" as const, Icon: IconUsers, feature: "clients" as const },
  { href: "/lost-clients", labelKey: "nav.lostClients" as const, Icon: IconHeart, feature: "lostClients" as const },
];

export function MobileBottomNav({ user }: { user: SessionUser }) {
  const pathname = usePathname();
  const t = useT();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 border-t border-brand-200 bg-white/95 shadow-[0_-4px_24px_rgba(0,0,0,0.08)] backdrop-blur-lg lg:hidden"
      aria-label={t("nav.mobileNav")}
      style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
    >
      <div className="grid grid-cols-4 gap-1 px-2 pt-2">
        {MOBILE_NAV.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const locked = !canAccess(user.subscriptionTier, item.feature);
          const Icon = item.Icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch
              className={`flex min-h-[56px] flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-2 text-[10px] font-semibold transition ${
                active
                  ? "bg-gradient-to-br from-brand-500 to-accent-500 text-white shadow-soft"
                  : locked
                    ? "text-gray-400"
                    : "text-brand-700 hover:bg-brand-50"
              }`}
            >
              <Icon className="h-6 w-6" />
              <span className="max-w-full truncate leading-tight">{t(item.labelKey)}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
