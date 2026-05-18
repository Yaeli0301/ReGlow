"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { SessionUser } from "@/types";
import { UpgradeBanner } from "./UpgradeBanner";

const navItems = [
  { href: "/dashboard", label: "לוח בקרה", icon: "📊" },
  { href: "/appointments", label: "יומן", icon: "📅" },
  { href: "/schedule", label: "זמינות", icon: "🕐" },
  { href: "/clients", label: "לקוחות", icon: "👥" },
  { href: "/lost-clients", label: "לקוחות אבודים", icon: "💔" },
  { href: "/billing", label: "מנוי", icon: "💳" },
];

export function AppShell({ user, children }: { user: SessionUser; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen">
      <aside className="fixed inset-y-0 right-0 z-40 hidden w-64 flex-col border-l border-brand-100/50 bg-white/95 p-6 shadow-card backdrop-blur-md lg:flex">
        <Link href="/dashboard" className="mb-8">
          <span className="text-2xl font-bold bg-gradient-to-r from-brand-600 to-accent-600 bg-clip-text text-transparent">
            ReGlow
          </span>
          <p className="mt-1 truncate text-xs text-gray-500">{user.businessName}</p>
        </Link>

        <nav className="flex-1 space-y-1">
          {navItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition ${
                  active
                    ? "bg-gradient-to-r from-brand-500 to-accent-500 text-white shadow-soft"
                    : "text-gray-600 hover:bg-brand-50"
                }`}
              >
                <span>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <button
          onClick={handleLogout}
          className="mt-4 rounded-xl px-4 py-2 text-sm text-gray-500 transition hover:bg-gray-100"
        >
          Sign out
        </button>
      </aside>

      <main className="flex-1 lg:mr-64">
        <header className="sticky top-0 z-30 border-b border-brand-100/50 bg-white/80 px-4 py-4 backdrop-blur-md lg:px-8">
          <div className="flex flex-col gap-3 lg:hidden">
            <span className="text-xl font-bold text-brand-600">ReGlow</span>
            <nav className="flex gap-2 overflow-x-auto">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium ${
                    pathname === item.href ? "bg-brand-500 text-white" : "bg-brand-50 text-brand-700"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </header>

        <div className="p-4 lg:p-8">
          <UpgradeBanner tier={user.subscriptionTier} />
          {children}
        </div>
      </main>
    </div>
  );
}
