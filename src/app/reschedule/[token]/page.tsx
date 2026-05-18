"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { he } from "date-fns/locale";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { useT } from "@/contexts/LanguageContext";

interface Slot {
  start: string;
  label: string;
}

interface RescheduleData {
  businessName?: string;
  clientName?: string;
  currentDate: string;
  serviceName?: string;
  alternatives: Slot[];
}

export default function ReschedulePage() {
  const { token } = useParams<{ token: string }>();
  const t = useT();
  const [data, setData] = useState<RescheduleData | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch(`/api/reschedule/${token}`)
      .then((r) => {
        if (!r.ok) throw new Error("invalid");
        return r.json();
      })
      .then(setData)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [token]);

  async function confirm() {
    if (!selected) return;
    setSubmitting(true);
    const res = await fetch(`/api/reschedule/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slotStart: selected }),
    });
    setSubmitting(false);
    if (res.ok) setDone(true);
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <p className="text-gray-500">{t("reschedule.loading")}</p>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <p className="text-red-600">{t("reschedule.invalid")}</p>
      </main>
    );
  }

  if (done) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <div className="card max-w-md text-center">
          <p className="text-xl font-bold text-emerald-600">{t("reschedule.success")}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-brand-50 to-white p-6">
      <div className="mx-auto max-w-md">
        <h1 className="text-2xl font-bold text-brand-800">{t("reschedule.title")}</h1>
        <p className="mt-2 text-gray-600">
          {t("reschedule.greeting", { name: data.clientName || "" })}
        </p>
        {data.businessName && (
          <p className="text-sm text-brand-600">{data.businessName}</p>
        )}

        <div className="card mt-6 space-y-2 text-sm">
          <p className="font-medium text-gray-500">{t("reschedule.current")}</p>
          <p>
            {format(new Date(data.currentDate), "EEEE d/M HH:mm", { locale: he })}
            {data.serviceName ? ` · ${data.serviceName}` : ""}
          </p>
        </div>

        <p className="mt-6 font-semibold">{t("reschedule.pickSlot")}</p>
        <div className="mt-3 grid gap-2">
          {data.alternatives.length === 0 ? (
            <p className="text-sm text-gray-500">{t("booking.noSlots")}</p>
          ) : (
            data.alternatives.map((slot) => (
              <button
                key={slot.start}
                type="button"
                onClick={() => setSelected(slot.start)}
                className={`rounded-xl border px-4 py-3 text-start text-sm transition ${
                  selected === slot.start
                    ? "border-brand-500 bg-brand-50 ring-2 ring-brand-300"
                    : "border-gray-200 bg-white hover:border-brand-300"
                }`}
              >
                {slot.label ||
                  format(new Date(slot.start), "EEEE d/M · HH:mm", { locale: he })}
              </button>
            ))
          )}
        </div>

        <Button
          className="mt-6 w-full"
          disabled={!selected || submitting}
          onClick={confirm}
        >
          {t("reschedule.confirm")}
        </Button>
      </div>
    </main>
  );
}
