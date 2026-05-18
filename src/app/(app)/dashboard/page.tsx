"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { WhatsAppButton } from "@/components/clients/WhatsAppButton";
import { WHATSAPP_TEMPLATES } from "@/lib/whatsapp";
import { ReferralPanel } from "@/components/referral/ReferralPanel";
import { useT } from "@/contexts/LanguageContext";
import { useHasSubscription } from "@/contexts/AppUserContext";
import { parseJsonResponse } from "@/lib/client-api";
import { Button } from "@/components/ui/Button";
import { SubscriptionGate } from "@/components/billing/SubscriptionGate";

interface AppointmentRow {
  _id: string;
  date: string;
  status: string;
  serviceName?: string;
  clientId?: { name?: string; phone?: string } | null;
}

interface DashboardStats {
  totalClients: number;
  activeClients: number;
  returningThisMonth: number;
  lostClients: number;
  churnRate: number;
  returningRevenue: number;
  returningVisits: number;
  estimatedRevenue: number;
  todayAppointments: AppointmentRow[];
  upcomingAppointments: AppointmentRow[];
  lostList: Array<{
    _id: string;
    name: string;
    phone: string;
    optIn: boolean;
    lastMessageSentDate?: string;
    daysSince: number;
  }>;
}

export default function DashboardPage() {
  const t = useT();
  const hasSubscription = useHasSubscription();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const loadStats = useCallback(() => {
    if (!hasSubscription) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadError(false);

    fetch("/api/dashboard/stats", { cache: "no-store" })
      .then((res) => parseJsonResponse<DashboardStats>(res))
      .then((result) => {
        if (!result.ok) {
          if (result.status !== 403) setLoadError(true);
          return;
        }
        setStats(result.data);
      })
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }, [hasSubscription]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  if (!hasSubscription) {
    return (
      <div>
        <h1 className="text-2xl font-bold">{t("dashboard.title")}</h1>
        <SubscriptionGate className="mt-6" />
      </div>
    );
  }

  if (loading) return <p className="text-gray-500">{t("common.loading")}</p>;

  if (loadError || !stats) {
    return (
      <div className="card max-w-lg text-center">
        <h1 className="text-xl font-bold text-red-600">{t("dashboard.loadError")}</h1>
        <p className="mt-2 text-sm text-gray-600">{t("dashboard.loadErrorHint")}</p>
        <Button className="mt-4" onClick={loadStats}>
          {t("common.retry")}
        </Button>
      </div>
    );
  }

  const reminderClient = stats.lostList.find((c) => c.optIn);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">{t("dashboard.title")}</h1>
      <p className="mt-1 text-gray-500">{t("dashboard.subtitle")}</p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard label={t("dashboard.totalClients")} value={stats.totalClients} />
        <StatCard label={t("dashboard.activeClients")} value={stats.activeClients ?? 0} accent />
        <StatCard
          label={t("dashboard.todayAppointments")}
          value={stats.todayAppointments.length}
        />
        <StatCard label={t("dashboard.lostClients")} value={stats.lostClients} danger />
        <StatCard
          label={t("dashboard.churnRate")}
          value={`${stats.churnRate ?? 0}%`}
          danger
        />
        <StatCard
          label={t("dashboard.returningRevenue")}
          value={`${t("common.currency")}${stats.returningRevenue ?? 0}`}
          accent
        />
        <StatCard
          label={t("dashboard.estimatedRevenue")}
          value={`${t("common.currency")}${stats.estimatedRevenue}`}
        />
      </div>

      {reminderClient && (
        <div className="mt-6">
          <WhatsAppButton
            phone={reminderClient.phone}
            message={WHATSAPP_TEMPLATES.reEngagement}
            optIn={reminderClient.optIn}
            lastMessageSentDate={reminderClient.lastMessageSentDate}
            label={t("dashboard.sendReminder")}
          />
        </div>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="card">
          <h2 className="font-semibold text-brand-700">{t("dashboard.todayTitle")}</h2>
          {stats.todayAppointments.length === 0 ? (
            <p className="mt-3 text-sm text-gray-500">{t("dashboard.noToday")}</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {stats.todayAppointments.map((a) => (
                <li key={a._id} className="flex justify-between rounded-xl bg-brand-50 px-3 py-2 text-sm">
                  <span>{a.clientId?.name ?? "—"}</span>
                  <span className="text-brand-600">{format(new Date(a.date), "HH:mm")}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card">
          <h2 className="font-semibold">{t("dashboard.upcomingTitle")}</h2>
          {stats.upcomingAppointments.length === 0 ? (
            <p className="mt-3 text-sm text-gray-500">{t("dashboard.noUpcoming")}</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {stats.upcomingAppointments.map((a) => (
                <li key={a._id} className="flex justify-between rounded-xl bg-gray-50 px-3 py-2 text-sm">
                  <span>{a.clientId?.name ?? "—"}</span>
                  <span className="text-gray-500">{format(new Date(a.date), "dd/MM HH:mm")}</span>
                </li>
              ))}
            </ul>
          )}
          <Link href="/appointments" className="mt-3 inline-block text-sm text-brand-600 hover:underline">
            {t("dashboard.fullCalendar")} →
          </Link>
        </div>
      </div>

      <ReferralPanel compact />

      <div className="mt-10">
        <h2 className="text-lg font-semibold text-red-600">{t("dashboard.lostTitle")}</h2>
        <p className="text-sm text-gray-500">{t("dashboard.lostSubtitle")}</p>

        {stats.lostList.length === 0 ? (
          <div className="card mt-4 text-center text-gray-500">
            <p>{t("dashboard.noLost")}</p>
            {stats.totalClients === 0 && (
              <p className="mt-2">
                <Link href="/clients" className="text-brand-600 hover:underline">
                  {t("dashboard.addFirstClient")}
                </Link>
              </p>
            )}
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {stats.lostList.map((client) => (
              <div
                key={client._id}
                className="card flex flex-wrap items-center justify-between gap-3 border-red-100 bg-red-50/50"
              >
                <div>
                  <p className="font-medium">{client.name}</p>
                  <p className="text-sm text-red-600">
                    {client.daysSince} {t("dashboard.daysSince")}
                  </p>
                </div>
                <WhatsAppButton
                  phone={client.phone}
                  message={WHATSAPP_TEMPLATES.reactivation}
                  optIn={client.optIn}
                  lastMessageSentDate={client.lastMessageSentDate}
                  label={t("dashboard.sendReturn")}
                  className="text-xs"
                />
              </div>
            ))}
            <Link href="/lost-clients" className="text-sm font-medium text-brand-600 hover:underline">
              {t("dashboard.allLost")} →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  danger,
  accent,
}: {
  label: string;
  value: number | string;
  danger?: boolean;
  accent?: boolean;
}) {
  return (
    <div className={`card ${danger ? "border-red-200 bg-red-50/30" : ""} ${accent ? "border-brand-200" : ""}`}>
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`mt-1 text-3xl font-bold ${danger ? "text-red-600" : accent ? "text-brand-600" : "text-gray-900"}`}>
        {value}
      </p>
    </div>
  );
}
