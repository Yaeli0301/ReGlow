"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";

interface DemoStatus {
  demo: boolean;
  label?: string;
  demoLogin?: { email: string };
}

export function DemoModeBanner() {
  const [status, setStatus] = useState<DemoStatus | null>(null);
  const [resetting, setResetting] = useState(false);

  const load = useCallback(() => {
    fetch("/api/demo/status", { cache: "no-store" })
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => setStatus(null));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function resetDemo() {
    setResetting(true);
    try {
      await fetch("/api/demo/reset", { method: "POST" });
      window.location.reload();
    } finally {
      setResetting(false);
    }
  }

  if (!status?.demo) return null;

  return (
    <div
      role="status"
      className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950"
    >
      <div>
        <span className="font-bold">{status.label || "Demo Mode"}</span>
        <span className="mx-2 text-amber-700">·</span>
        <span>
          נתונים לדוגמה בלבד
          {status.demoLogin?.email && (
            <>
              {" "}
              — התחברות: <code className="rounded bg-amber-100 px-1">{status.demoLogin.email}</code>
            </>
          )}
        </span>
      </div>
      <Button
        type="button"
        variant="secondary"
        className="text-xs"
        disabled={resetting}
        onClick={resetDemo}
      >
        {resetting ? "מאפס..." : "איפוס דמו"}
      </Button>
    </div>
  );
}
