"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/Button";
import { SubscriptionGate } from "@/components/billing/SubscriptionGate";
import { useAppUser } from "@/contexts/AppUserContext";
import { canAccess } from "@/lib/subscription";

interface InvoiceRow {
  _id: string;
  invoiceNumber: string;
  amount: number;
  clientName: string;
  pdfUrl: string;
  createdAt: string;
}

export default function InvoicesPage() {
  const user = useAppUser();
  const hasPro = canAccess(user.subscriptionTier, "appointments");
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [month, setMonth] = useState(format(new Date(), "yyyy-MM"));
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    fetch(`/api/invoices?month=${month}`)
      .then((r) => r.json())
      .then((d) => setInvoices(d.invoices || []))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (hasPro) load();
    else setLoading(false);
  }, [month, hasPro]);

  if (!hasPro) {
    return (
      <div>
        <h1 className="text-2xl font-bold">חשבוניות וקבלות</h1>
        <SubscriptionGate className="mt-6" title="חשבוניות — Pro" description="שדרגי ל-Pro לגישה לחשבוניות." />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold">חשבוניות וקבלות</h1>
      <p className="mt-1 text-gray-500">הורדה בודדת או ייצוא חודשי לרואת חשבון</p>

      <div className="mt-6 flex flex-wrap items-end gap-4">
        <div>
          <label className="label">חודש</label>
          <input
            type="month"
            className="input"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
          />
        </div>
        <Button variant="secondary" onClick={load}>
          רענון
        </Button>
        <a href={`/api/invoices/export?month=${month}`} className="btn-primary inline-block">
          ייצוא ZIP לרואה חשבון
        </a>
      </div>

      {loading ? (
        <p className="mt-8 text-gray-500">טוען...</p>
      ) : invoices.length === 0 ? (
        <p className="card mt-8 text-center text-gray-500">אין חשבוניות בחודש זה</p>
      ) : (
        <div className="mt-6 space-y-2">
          {invoices.map((inv) => (
            <div key={inv._id} className="card flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold">{inv.invoiceNumber}</p>
                <p className="text-sm text-gray-500">
                  {inv.clientName} · {format(new Date(inv.createdAt), "dd/MM/yyyy")}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-bold text-brand-600">₪{inv.amount}</span>
                <a href={inv.pdfUrl} className="text-sm text-brand-600 underline" target="_blank" rel="noreferrer">
                  הורדת PDF
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
