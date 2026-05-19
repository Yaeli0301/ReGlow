"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { parseJsonResponse } from "@/lib/client-api";

interface SeriesPoint {
  date: string;
  value: number;
}

interface AnalyticsData {
  generatedAt: string;
  daily: {
    date: string;
    activeUsers: number;
    newUsers: number;
    appointmentsCreated: number;
    revenue: number;
  };
  weekly: {
    weekStart: string;
    retentionRate7d: number;
    churnRate: number;
    returningClients: number;
    newUsers: number;
    appointmentsCreated: number;
  };
  monthly: {
    monthStart: string;
    MRR: number;
    ARPU: number;
    LTV: number;
    growthRatePct: number;
    paidUsers: number;
  };
  retention: {
    totalClients: number;
    activeClients: number;
    atRiskClients: number;
    lostClients: number;
    lostInLast7Days: number;
  };
  anomalies: Array<{
    severity: "info" | "warning" | "critical";
    code: string;
    title: string;
    description: string;
  }>;
  inactiveBusinesses: Array<{
    userId: string;
    businessName: string;
    email: string;
    daysSinceLastLogin: number;
  }>;
  topBusinesses: Array<{ userId: string; businessName: string; events: number }>;
  series: {
    users: SeriesPoint[];
    appointments: SeriesPoint[];
    revenue: SeriesPoint[];
  };
}

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [days, setDays] = useState(14);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/analytics?days=${days}`, {
        credentials: "include",
      });
      const result = await parseJsonResponse<AnalyticsData>(res);
      if (!result.ok) {
        setError(result.error || "טעינה נכשלה");
        return;
      }
      setData(result.data);
    } catch {
      setError("שגיאת רשת");
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading && !data) {
    return <AnalyticsSkeleton />;
  }

  if (error || !data) {
    return (
      <div className="card max-w-lg">
        <p className="text-red-600">{error || "אין נתונים זמינים"}</p>
        <button className="btn-secondary mt-3" onClick={load}>
          ניסיון חוזר
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="text-sm text-gray-500">
            עודכן: {new Date(data.generatedAt).toLocaleString("he-IL")}
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <label className="text-gray-500">תקופה:</label>
          <select
            className="input w-24"
            value={days}
            onChange={(e) => setDays(parseInt(e.target.value, 10))}
          >
            <option value={7}>7 ימים</option>
            <option value={14}>14 ימים</option>
            <option value={30}>30 ימים</option>
            <option value={90}>90 ימים</option>
          </select>
          <button className="btn-secondary" onClick={load}>
            רענון
          </button>
          <Link href="/admin-dashboard" className="text-sm text-brand-600 hover:underline">
            ← דאשבורד אדמין
          </Link>
        </div>
      </header>

      {data.anomalies.length > 0 && (
        <div className="card border-amber-200 bg-amber-50/50">
          <h2 className="font-semibold text-amber-700">התראות</h2>
          <ul className="mt-3 space-y-2">
            {data.anomalies.map((a) => (
              <li
                key={a.code}
                className={`rounded-lg px-3 py-2 text-sm ${
                  a.severity === "critical"
                    ? "bg-red-100 text-red-800"
                    : a.severity === "warning"
                      ? "bg-amber-100 text-amber-800"
                      : "bg-blue-100 text-blue-800"
                }`}
              >
                <div className="font-medium">{a.title}</div>
                <div className="text-xs opacity-80">{a.description}</div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="משתמשות פעילות היום" value={data.daily.activeUsers} accent />
        <Stat label="חדשות היום" value={data.daily.newUsers} />
        <Stat label="תורים היום" value={data.daily.appointmentsCreated} />
        <Stat label="הכנסות (₪)" value={`₪${data.daily.revenue}`} accent />
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <SparkCard title="כניסות משתמשות" series={data.series.users} color="#db2777" />
        <SparkCard title="תורים שנוצרו" series={data.series.appointments} color="#3b82f6" />
        <SparkCard title="הכנסות (₪)" series={data.series.revenue} color="#10b981" />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="card">
          <h2 className="font-semibold text-brand-700">שימור (7 ימים)</h2>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <MiniStat label="Retention" value={`${data.weekly.retentionRate7d}%`} />
            <MiniStat label="Churn" value={`${data.weekly.churnRate}%`} />
            <MiniStat label="לקוחות חוזרות" value={data.weekly.returningClients} />
            <MiniStat label="תורים השבוע" value={data.weekly.appointmentsCreated} />
          </div>
        </div>

        <div className="card">
          <h2 className="font-semibold text-brand-700">חודש נוכחי</h2>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <MiniStat label="MRR" value={`₪${data.monthly.MRR}`} />
            <MiniStat label="ARPU" value={`₪${data.monthly.ARPU}`} />
            <MiniStat
              label="צמיחה"
              value={`${data.monthly.growthRatePct >= 0 ? "+" : ""}${data.monthly.growthRatePct}%`}
            />
            <MiniStat label="מנויות בתשלום" value={data.monthly.paidUsers} />
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="card">
          <h2 className="font-semibold">לקוחות במערכת</h2>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <MiniStat label="סך הכל" value={data.retention.totalClients} />
            <MiniStat label="פעילות" value={data.retention.activeClients} />
            <MiniStat label="בסיכון" value={data.retention.atRiskClients} />
            <MiniStat label="אבודות" value={data.retention.lostClients} danger />
          </div>
          {data.retention.lostInLast7Days > 0 && (
            <p className="mt-3 text-xs text-red-600">
              {data.retention.lostInLast7Days} לקוחות הוגדרו &quot;אבודות&quot; בשבוע האחרון
            </p>
          )}
        </div>

        <div className="card">
          <h2 className="font-semibold">העסקים הפעילים ביותר (שבוע)</h2>
          {data.topBusinesses.length === 0 ? (
            <p className="mt-3 text-sm text-gray-500">אין פעילות עדיין</p>
          ) : (
            <ol className="mt-3 space-y-2 text-sm">
              {data.topBusinesses.map((b, i) => (
                <li
                  key={b.userId}
                  className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2"
                >
                  <span>
                    <span className="text-gray-400">#{i + 1}</span> {b.businessName}
                  </span>
                  <Link
                    href={`/admin/users/${b.userId}`}
                    className="text-xs text-brand-600 hover:underline"
                  >
                    {b.events} פעולות ←
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </div>
      </section>

      {data.inactiveBusinesses.length > 0 && (
        <section className="card">
          <h2 className="font-semibold text-amber-700">עסקים לא פעילים (7+ ימים)</h2>
          <ul className="mt-3 divide-y divide-gray-100">
            {data.inactiveBusinesses.map((b) => (
              <li key={b.userId} className="flex items-center justify-between py-2 text-sm">
                <div>
                  <div className="font-medium">{b.businessName}</div>
                  <div className="text-xs text-gray-500">{b.email}</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-amber-700">
                    {b.daysSinceLastLogin} ימים
                  </span>
                  <Link
                    href={`/admin/users/${b.userId}`}
                    className="text-xs text-brand-600 hover:underline"
                  >
                    ערוך
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent?: boolean;
}) {
  return (
    <div className={`card ${accent ? "border-brand-200" : ""}`}>
      <p className="text-xs text-gray-500">{label}</p>
      <p
        className={`mt-1 text-3xl font-bold ${
          accent ? "text-brand-600" : "text-gray-900"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function MiniStat({
  label,
  value,
  danger,
}: {
  label: string;
  value: string | number;
  danger?: boolean;
}) {
  return (
    <div className="rounded-xl bg-gray-50 px-3 py-2">
      <p className="text-xs text-gray-500">{label}</p>
      <p
        className={`text-xl font-bold ${danger ? "text-red-600" : "text-gray-900"}`}
      >
        {value}
      </p>
    </div>
  );
}

function SparkCard({
  title,
  series,
  color,
}: {
  title: string;
  series: SeriesPoint[];
  color: string;
}) {
  const total = useMemo(
    () => series.reduce((s, p) => s + p.value, 0),
    [series]
  );

  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-700">{title}</h3>
        <span className="text-lg font-bold" style={{ color }}>
          {total}
        </span>
      </div>
      <Sparkline series={series} color={color} />
    </div>
  );
}

function Sparkline({ series, color }: { series: SeriesPoint[]; color: string }) {
  if (series.length === 0) return null;
  const max = Math.max(1, ...series.map((p) => p.value));
  const w = 240;
  const h = 64;
  const stepX = series.length > 1 ? w / (series.length - 1) : w;
  const path = series
    .map((p, i) => `${i === 0 ? "M" : "L"}${(i * stepX).toFixed(1)},${(h - (p.value / max) * h).toFixed(1)}`)
    .join(" ");
  const areaPath = `${path} L${w},${h} L0,${h} Z`;

  return (
    <svg className="mt-3 w-full" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <path d={areaPath} fill={color} fillOpacity="0.1" />
      <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

function AnalyticsSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-48 rounded bg-gray-200" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="card">
            <div className="h-3 w-24 rounded bg-gray-200" />
            <div className="mt-3 h-8 w-16 rounded bg-gray-300" />
          </div>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="card h-32" />
        ))}
      </div>
    </div>
  );
}
