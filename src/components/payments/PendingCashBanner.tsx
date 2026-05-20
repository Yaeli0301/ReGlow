"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";

interface PendingPayment {
  _id: string;
  amount: number;
  client: { name: string } | null;
  appointment: { serviceName?: string } | null;
}

export function PendingCashBanner() {
  const [payments, setPayments] = useState<PendingPayment[]>([]);
  const [loading, setLoading] = useState(false);

  function load() {
    fetch("/api/payments/pending")
      .then(async (r) => {
        if (!r.ok) return { payments: [] };
        const text = await r.text();
        try {
          return JSON.parse(text) as { payments?: PendingPayment[] };
        } catch {
          return { payments: [] };
        }
      })
      .then((d) => setPayments(d.payments || []))
      .catch(() => setPayments([]));
  }

  useEffect(() => {
    const delay = window.setTimeout(load, 1200);
    const t = window.setInterval(load, 30000);
    return () => {
      window.clearTimeout(delay);
      window.clearInterval(t);
    };
  }, []);

  if (payments.length === 0) return null;

  async function confirm(id: string, amountReceived: number) {
    setLoading(true);
    const res = await fetch(`/api/payments/${id}/confirm`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amountReceived }),
    });
    setLoading(false);
    if (res.ok) {
      load();
      window.dispatchEvent(new CustomEvent("reglow:payment-confirmed"));
    }
  }

  return (
    <div className="mb-6 space-y-3">
      {payments.map((p) => (
        <div
          key={p._id}
          className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 shadow-sm"
        >
          <p className="font-semibold text-amber-900">
            לקוחה שילמה במזומן? אשרי תשלום
          </p>
          <p className="text-sm text-amber-800">
            {p.client?.name} — {p.appointment?.serviceName || "תור"} — ₪{p.amount}
          </p>
          <Button
            className="mt-3 min-h-[44px]"
            onClick={() => void confirm(p._id, p.amount)}
            disabled={loading}
          >
            {loading ? "מאשרת..." : "אישור תשלום במזומן — לחיצה אחת"}
          </Button>
        </div>
      ))}
    </div>
  );
}
