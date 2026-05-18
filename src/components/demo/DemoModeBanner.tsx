"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

interface DemoModeBannerProps {
  demo?: boolean;
  demoEmail?: string;
}

export function DemoModeBanner({ demo = false, demoEmail }: DemoModeBannerProps) {
  const [resetting, setResetting] = useState(false);

  async function resetDemo() {
    setResetting(true);
    try {
      await fetch("/api/demo/reset", { method: "POST" });
      window.location.reload();
    } finally {
      setResetting(false);
    }
  }

  if (!demo) return null;

  return (
    <div
      role="status"
      className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950"
    >
      <div>
        <span className="font-bold">Demo Mode</span>
        <span className="mx-2 text-amber-700">·</span>
        <span>
          נתונים לדוגמה בלבד
          {demoEmail && (
            <>
              {" "}
              — התחברות: <code className="rounded bg-amber-100 px-1">{demoEmail}</code>
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
