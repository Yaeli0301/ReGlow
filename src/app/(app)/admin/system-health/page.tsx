"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { parseJsonResponse } from "@/lib/client-api";
import { Button } from "@/components/ui/Button";

interface HealthPayload {
  mode: string;
  state: "READY" | "DEGRADED" | "BLOCKED";
  reason: string;
  reasons: string[];
  degraded: string[];
  checks: {
    env: boolean;
    database: boolean;
    killSwitch: boolean;
    stripe: boolean;
    cron: boolean;
    email: boolean;
  };
  killSwitch: { active: boolean; reason?: string };
  env: { blocking: string[]; degraded: string[] };
  errorRateLastHour: number;
  operationalAlerts: Array<{
    code: string;
    severity: string;
    title: string;
    message: string;
  }>;
  recentLogs: Array<{
    _id: string;
    level: string;
    category: string;
    message: string;
    source?: string;
    durationMs?: number;
    statusCode?: number;
    createdAt: string;
  }>;
  timestamp: string;
}

const STATE_STYLE = {
  READY: "bg-emerald-100 text-emerald-800 border-emerald-200",
  DEGRADED: "bg-amber-100 text-amber-800 border-amber-200",
  BLOCKED: "bg-red-100 text-red-800 border-red-200",
};

export default function SystemHealthPage() {
  const [data, setData] = useState<HealthPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [killLoading, setKillLoading] = useState(false);
  const [killReason, setKillReason] = useState("תחזוקה מתוכננת");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/system-health", { credentials: "include" });
      const result = await parseJsonResponse<HealthPayload>(res);
      if (result.ok) setData(result.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function toggleKillSwitch(active: boolean) {
    setKillLoading(true);
    try {
      const res = await fetch("/api/admin/kill-switch", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active, reason: active ? killReason : undefined }),
      });
      if (res.ok) await load();
    } finally {
      setKillLoading(false);
    }
  }

  if (loading && !data) {
    return <p className="text-gray-500">טוען...</p>;
  }

  if (!data) {
    return (
      <div className="card">
        <p className="text-red-600">לא ניתן לטעון נתוני בריאות</p>
        <Button className="mt-3" onClick={load}>
          ניסיון חוזר
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">בריאות מערכת</h1>
          <p className="text-sm text-gray-500">
            עודכן: {new Date(data.timestamp).toLocaleString("he-IL")} · מצב: {data.mode}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={load}>
            רענון
          </Button>
          <Link href="/admin-dashboard" className="text-sm text-brand-600 hover:underline">
            ← דאשבורד
          </Link>
        </div>
      </header>

      <div
        className={`card border-2 ${STATE_STYLE[data.state]}`}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm opacity-80">מצב מערכת</p>
            <p className="text-3xl font-bold">{data.state}</p>
            <p className="mt-1 text-sm">{data.reason}</p>
          </div>
          {data.state === "DEGRADED" && data.degraded.length > 0 && (
            <ul className="text-sm">
              {data.degraded.map((d) => (
                <li key={d}>• {d}</li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <CheckCard label="סביבה (ENV)" ok={data.checks.env} />
        <CheckCard label="מסד נתונים" ok={data.checks.database} />
        <CheckCard label="Kill Switch כבוי" ok={data.checks.killSwitch} />
        <CheckCard label="Stripe" ok={data.checks.stripe} />
        <CheckCard label="Cron" ok={data.checks.cron} />
        <CheckCard label="Email" ok={data.checks.email} />
      </div>

      <div className="card border-red-100">
        <h2 className="font-semibold text-red-700">Kill Switch</h2>
        <p className="mt-1 text-sm text-gray-600">
          חוסם את כל ה-API (מלבד health ו-kill-switch). מצב נוכחי:{" "}
          <strong>{data.killSwitch.active ? "פעיל ⚠" : "כבוי ✓"}</strong>
        </p>
        {data.killSwitch.active && data.killSwitch.reason && (
          <p className="mt-1 text-xs text-red-600">סיבה: {data.killSwitch.reason}</p>
        )}
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <label className="flex-1 text-sm">
            סיבה (בהפעלה)
            <input
              className="input mt-1 w-full"
              value={killReason}
              onChange={(e) => setKillReason(e.target.value)}
              disabled={data.killSwitch.active}
            />
          </label>
          {data.killSwitch.active ? (
            <Button loading={killLoading} onClick={() => toggleKillSwitch(false)}>
              כיבוי Kill Switch
            </Button>
          ) : (
            <Button
              variant="secondary"
              loading={killLoading}
              onClick={() => toggleKillSwitch(true)}
            >
              הפעלת Kill Switch
            </Button>
          )}
        </div>
      </div>

      {data.operationalAlerts.length > 0 && (
        <div className="card">
          <h2 className="font-semibold">התראות תפעול</h2>
          <ul className="mt-3 space-y-2">
            {data.operationalAlerts.map((a) => (
              <li
                key={a.code}
                className={`rounded-lg px-3 py-2 text-sm ${
                  a.severity === "high" ? "bg-red-50 text-red-800" : "bg-amber-50 text-amber-800"
                }`}
              >
                <strong>{a.title}</strong> — {a.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="card">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">שגיאות API (שעה אחרונה)</h2>
          <span className="text-lg font-bold">{data.errorRateLastHour}%</span>
        </div>
      </div>

      <div className="card overflow-x-auto">
        <h2 className="font-semibold">20 לוגים אחרונים</h2>
        <table className="mt-4 w-full text-sm">
          <thead>
            <tr className="border-b text-start text-gray-500">
              <th className="pb-2">זמן</th>
              <th className="pb-2">רמה</th>
              <th className="pb-2">קטגוריה</th>
              <th className="pb-2">הודעה</th>
              <th className="pb-2">ms</th>
            </tr>
          </thead>
          <tbody>
            {data.recentLogs.map((log) => (
              <tr key={log._id} className="border-b border-gray-50">
                <td className="py-2 whitespace-nowrap text-xs text-gray-500">
                  {new Date(log.createdAt).toLocaleString("he-IL")}
                </td>
                <td className="py-2">
                  <span
                    className={`rounded px-1.5 py-0.5 text-xs ${
                      log.level === "error"
                        ? "bg-red-100 text-red-700"
                        : log.level === "warn"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-gray-100"
                    }`}
                  >
                    {log.level}
                  </span>
                </td>
                <td className="py-2">{log.category}</td>
                <td className="py-2 max-w-xs truncate">{log.message}</td>
                <td className="py-2">{log.durationMs ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CheckCard({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className={`card ${ok ? "border-emerald-100" : "border-red-100"}`}>
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`text-xl font-bold ${ok ? "text-emerald-600" : "text-red-600"}`}>
        {ok ? "✓ תקין" : "✗ בעיה"}
      </p>
    </div>
  );
}
