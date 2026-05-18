"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

interface PendingPayment {
  _id: string;
  amount: number;
  client: { name: string } | null;
  appointment: { serviceName?: string } | null;
}

export function PendingCashBanner() {
  const [payments, setPayments] = useState<PendingPayment[]>([]);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);

  function load() {
    fetch("/api/payments/pending")
      .then((r) => r.json())
      .then((d) => setPayments(d.payments || []));
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

  async function confirm(id: string) {
    setLoading(true);
    const res = await fetch(`/api/payments/${id}/confirm`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amountReceived: Number(amount) || 0 }),
    });
    setLoading(false);
    if (res.ok) {
      setConfirmingId(null);
      setAmount("");
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
          {confirmingId === p._id ? (
            <div className="mt-3 flex flex-wrap items-end gap-2">
              <Input
                label="סכום שהתקבל"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="max-w-[140px]"
              />
              <Button onClick={() => confirm(p._id)} disabled={loading}>
                אישור תשלום
              </Button>
              <Button variant="secondary" onClick={() => setConfirmingId(null)}>
                ביטול
              </Button>
            </div>
          ) : (
            <Button className="mt-2" onClick={() => {
              setConfirmingId(p._id);
              setAmount(String(p.amount));
            }}>
              Payment Confirmed
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}
