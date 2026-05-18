"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppUser } from "@/contexts/AppUserContext";
import { Button } from "@/components/ui/Button";

interface LogEntry {
  id: string;
  level: string;
  message: string;
  timestamp: string;
}

export default function AdminDebugPage() {
  const user = useAppUser();
  const router = useRouter();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [envMode, setEnvMode] = useState("");
  const [busy, setBusy] = useState(false);
  const [appointmentId, setAppointmentId] = useState("");

  function load() {
    fetch("/api/admin/debug")
      .then((r) => {
        if (!r.ok) throw new Error("forbidden");
        return r.json();
      })
      .then((d) => {
        setLogs(d.logs || []);
        setEnvMode(d.envMode || "");
      })
      .catch(() => router.replace("/dashboard"));
  }

  useEffect(() => {
    if (user.role !== "admin") {
      router.replace("/dashboard");
      return;
    }
    load();
  }, [user.role, router]);

  async function run(action: string) {
    setBusy(true);
    try {
      await fetch("/api/admin/debug", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, appointmentId: appointmentId || undefined }),
      });
      load();
    } finally {
      setBusy(false);
    }
  }

  if (user.role !== "admin") return null;

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold">Debug Panel</h1>
      <p className="mt-1 text-sm text-gray-500">סביבה: {envMode}</p>

      <div className="card mt-6 space-y-3">
        <h2 className="font-semibold">סימולציות</h2>
        <input
          className="input"
          placeholder="Appointment ID (לביטול / no-show)"
          value={appointmentId}
          onChange={(e) => setAppointmentId(e.target.value)}
        />
        <div className="flex flex-wrap gap-2">
          <Button type="button" disabled={busy} onClick={() => run("reset_demo")}>
            איפוס דמו
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={busy || !appointmentId}
            onClick={() => run("simulate_cancellation")}
          >
            ביטול תור
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={busy || !appointmentId}
            onClick={() => run("simulate_no_show")}
          >
            No-show
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={busy}
            onClick={() => run("simulate_retention")}
          >
            Retention
          </Button>
        </div>
      </div>

      <div className="card mt-6">
        <h2 className="font-semibold">לוגים אחרונים</h2>
        <ul className="mt-3 max-h-96 space-y-1 overflow-y-auto text-xs font-mono">
          {logs.map((l) => (
            <li key={l.id} className="border-b border-gray-100 py-1">
              <span className="text-gray-400">{l.timestamp}</span> [{l.level}] {l.message}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
