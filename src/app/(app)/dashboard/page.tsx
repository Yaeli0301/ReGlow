"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { WhatsAppButton } from "@/components/clients/WhatsAppButton";
import { WHATSAPP_TEMPLATES } from "@/lib/whatsapp";
import { ReferralPanel } from "@/components/referral/ReferralPanel";

interface AppointmentRow {
  _id: string;
  date: string;
  status: string;
  serviceName?: string;
  clientId?: { name?: string; phone?: string };
}

interface DashboardStats {
  totalClients: number;
  returningThisMonth: number;
  lostClients: number;
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
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsSubscription, setNeedsSubscription] = useState(false);

  useEffect(() => {
    fetch("/api/dashboard/stats")
      .then(async (res) => {
        if (res.status === 403) {
          setNeedsSubscription(true);
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (data) setStats(data);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-gray-500">טוען...</p>;

  if (needsSubscription) {
    return (
      <div className="card max-w-lg text-center">
        <h1 className="text-2xl font-bold">בחרי מנוי כדי להתחיל</h1>
        <Link href="/billing" className="btn-primary mt-6 inline-block">
          לצפייה במנויים →
        </Link>
      </div>
    );
  }

  const reminderClient = stats?.lostList.find((c) => c.optIn);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">בואי נחזיר את הלקוחות שלך 💖</h1>
      <p className="mt-1 text-gray-500">סקירה עסקית להיום</p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="סה״כ לקוחות" value={stats?.totalClients ?? 0} />
        <StatCard label="תורים היום" value={stats?.todayAppointments?.length ?? 0} accent />
        <StatCard label="לקוחות אבודים" value={stats?.lostClients ?? 0} danger />
        <StatCard label="הכנסה משוערת (חוזרות)" value={`₪${stats?.estimatedRevenue ?? 0}`} accent />
      </div>

      {reminderClient && (
        <div className="mt-6">
          <WhatsAppButton
            phone={reminderClient.phone}
            message={WHATSAPP_TEMPLATES.reEngagement}
            optIn={reminderClient.optIn}
            lastMessageSentDate={reminderClient.lastMessageSentDate}
            label="שליחת תזכורת WhatsApp"
          />
        </div>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="card">
          <h2 className="font-semibold text-brand-700">תורים היום</h2>
          {stats?.todayAppointments?.length === 0 ? (
            <p className="mt-3 text-sm text-gray-500">אין תורים להיום</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {stats?.todayAppointments?.map((a) => (
                <li key={a._id} className="flex justify-between rounded-xl bg-brand-50 px-3 py-2 text-sm">
                  <span>{a.clientId?.name}</span>
                  <span className="text-brand-600">{format(new Date(a.date), "HH:mm")}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card">
          <h2 className="font-semibold">תורים קרובים</h2>
          {stats?.upcomingAppointments?.length === 0 ? (
            <p className="mt-3 text-sm text-gray-500">אין תורים קרובים</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {stats?.upcomingAppointments?.map((a) => (
                <li key={a._id} className="flex justify-between rounded-xl bg-gray-50 px-3 py-2 text-sm">
                  <span>{a.clientId?.name}</span>
                  <span className="text-gray-500">
                    {format(new Date(a.date), "dd/MM HH:mm")}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <Link href="/appointments" className="mt-3 inline-block text-sm text-brand-600 hover:underline">
            ליומן המלא →
          </Link>
        </div>
      </div>

      <ReferralPanel compact />

      <div className="mt-10">
        <h2 className="text-lg font-semibold text-red-600">לקוחות שאת מפסידה עליהם כסף</h2>
        <p className="text-sm text-gray-500">לא הופיעו מעל 30 יום</p>

        {stats?.lostList.length === 0 ? (
          <div className="card mt-4 text-center text-gray-500">
            <p>אין לקוחות אבודים כרגע — כל הכבוד! 🎉</p>
            {stats?.totalClients === 0 && (
              <p className="mt-2">
                <Link href="/clients" className="text-brand-600 hover:underline">
                  התחילי בהוספת לקוח ראשון
                </Link>
              </p>
            )}
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {stats?.lostList.map((client) => (
              <div
                key={client._id}
                className="card flex flex-wrap items-center justify-between gap-3 border-red-100 bg-red-50/50"
              >
                <div>
                  <p className="font-medium">{client.name}</p>
                  <p className="text-sm text-red-600">{client.daysSince} ימים ללא ביקור</p>
                </div>
                <WhatsAppButton
                  phone={client.phone}
                  message={WHATSAPP_TEMPLATES.reactivation}
                  optIn={client.optIn}
                  lastMessageSentDate={client.lastMessageSentDate}
                  label="שליחת הודעת החזרה"
                  className="text-xs"
                />
              </div>
            ))}
            <Link href="/lost-clients" className="text-sm font-medium text-brand-600 hover:underline">
              כל הלקוחות האבודים →
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
