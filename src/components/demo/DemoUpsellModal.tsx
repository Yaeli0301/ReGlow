"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { clearAuthClient } from "@/lib/client-auth";
import {
  DEMO_SEGMENT_MS,
  extendDemoByMinutes,
  loadDemoUpsellState,
  msUntilDemoUpsell,
  resetDemoUpsellSegment,
} from "@/lib/demo/demo-upsell-timer";

const EXTEND_OPTIONS = [5, 10, 15] as const;

interface DemoUpsellModalProps {
  active?: boolean;
}

export function DemoUpsellModal({ active = false }: DemoUpsellModalProps) {
  const [open, setOpen] = useState(false);
  const [signingUp, setSigningUp] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleNext = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    const state = loadDemoUpsellState();
    const wait = msUntilDemoUpsell(state);
    timerRef.current = setTimeout(
      () => setOpen(true),
      wait > 0 ? wait : 0
    );
  }, []);

  useEffect(() => {
    if (!active) return;
    scheduleNext();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [active, scheduleNext]);

  async function goToRegister() {
    setSigningUp(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      clearAuthClient();
      window.location.href = "/register";
    } finally {
      setSigningUp(false);
    }
  }

  function handleExtend(minutes: (typeof EXTEND_OPTIONS)[number]) {
    extendDemoByMinutes(loadDemoUpsellState(), minutes);
    setOpen(false);
    scheduleNext();
  }

  function handleContinueDemo() {
    resetDemoUpsellSegment();
    setOpen(false);
    scheduleNext();
  }

  if (!active || !open) return null;

  const minutesLeft = Math.ceil(DEMO_SEGMENT_MS / 60000);

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end justify-center bg-black/45 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="demo-upsell-title"
    >
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl sm:p-8">
        <span className="inline-block rounded-full bg-gradient-to-l from-brand-100 to-purple-100 px-3 py-1 text-xs font-bold text-brand-700">
          {minutesLeft} דקות בדמו — ואהבת?
        </span>
        <h2 id="demo-upsell-title" className="mt-4 text-2xl font-extrabold text-gray-900">
          אהבתם? יופי — קדימה לאתר האמיתי 💖
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-gray-600">
          ראית איך ReGlow מחזירה לקוחות וחוסכת זמן. מוכנה להפסיק לדמיין ולהתחיל
          להרוויח באמת?
        </p>

        <Button
          type="button"
          className="mt-6 min-h-[48px] w-full text-base"
          disabled={signingUp}
          onClick={goToRegister}
        >
          {signingUp ? "מעבירה להרשמה..." : "כן! פתיחת חשבון אמיתי →"}
        </Button>

        <Link
          href="/register"
          className="mt-3 block text-center text-sm font-semibold text-brand-600 underline-offset-2 hover:underline"
          onClick={() => setOpen(false)}
        >
          לראות מחירים והרשמה
        </Link>

        <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50/80 p-4">
          <p className="text-sm font-semibold text-amber-950">עוד לא מוכנה?</p>
          <p className="mt-1 text-xs text-amber-800">תני לי עוד כמה דקות בדמו:</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {EXTEND_OPTIONS.map((minutes) => (
              <button
                key={minutes}
                type="button"
                onClick={() => handleExtend(minutes)}
                className="min-h-[44px] flex-1 rounded-xl bg-white px-3 py-2 text-sm font-bold text-amber-900 ring-1 ring-amber-300 transition hover:bg-amber-100"
              >
                +{minutes} דק&apos;
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={handleContinueDemo}
          className="mt-4 w-full text-sm text-gray-500 hover:text-gray-700"
        >
          אמשיך בדמו עוד {minutesLeft} דקות
        </button>
      </div>
    </div>
  );
}
