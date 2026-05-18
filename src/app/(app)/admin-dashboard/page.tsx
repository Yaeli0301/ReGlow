"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { useT } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/Button";

interface AdminStats {
  businesses: number;
  clients: number;
  appointments: number;
  totalRevenue: number;
}

interface AdminUserRow {
  id: string;
  email: string;
  businessName: string;
  role: string;
  subscriptionTier: string;
}

export default function AdminDashboardPage() {
  const { user, welcomeLabel } = useAuth();
  const t = useT();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/stats").then((r) => r.json()),
      fetch("/api/admin/users").then((r) => r.json()),
    ])
      .then(([statsData, usersData]) => {
        setStats(statsData);
        setUsers(usersData.users || []);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">{t("admin.dashboardTitle")}</h1>
      <p className="mt-1 text-gray-500">
        {welcomeLabel} · {user.email}
      </p>

      {loading ? (
        <p className="mt-8 text-gray-500">{t("common.loading")}</p>
      ) : (
        <>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label={t("admin.businesses")} value={stats?.businesses ?? 0} />
            <StatCard label={t("admin.clients")} value={stats?.clients ?? 0} />
            <StatCard label={t("admin.appointments")} value={stats?.appointments ?? 0} />
            <StatCard
              label={t("admin.revenue")}
              value={`${t("common.currency")}${stats?.totalRevenue ?? 0}`}
            />
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/admin/debug">
              <Button variant="secondary">{t("admin.debugPanel")}</Button>
            </Link>
            <Link href="/admin/feedback">
              <Button variant="secondary">{t("nav.adminFeedback")}</Button>
            </Link>
          </div>

          <div className="card mt-8 overflow-x-auto">
            <h2 className="font-semibold text-brand-700">{t("admin.allUsers")}</h2>
            <table className="mt-4 w-full text-sm">
              <thead>
                <tr className="border-b text-start text-gray-500">
                  <th className="py-2">{t("auth.businessName")}</th>
                  <th className="py-2">{t("auth.email")}</th>
                  <th className="py-2">{t("admin.role")}</th>
                  <th className="py-2">{t("admin.plan")}</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-gray-100">
                    <td className="py-2">{u.businessName}</td>
                    <td className="py-2">{u.email}</td>
                    <td className="py-2">{u.role}</td>
                    <td className="py-2">{u.subscriptionTier}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="card">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-1 text-3xl font-bold text-brand-600">{value}</p>
    </div>
  );
}
