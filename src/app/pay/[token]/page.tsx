"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { format } from "date-fns";
import { he } from "date-fns/locale";
import { Button } from "@/components/ui/Button";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { useLanguage, useT } from "@/contexts/LanguageContext";
import type { ClientPaymentMethod } from "@/types/payments";

interface PayPageData {
  businessName: string;
  themeColor?: string;
  clientName: string;
  appointmentDate: string;
  serviceName?: string;
  lineItems: { label: string; amount: number }[];
  amount: number;
  paymentStatus: string;
  status: string;
}

export default function ClientPaymentPage() {
  const { token } = useParams<{ token: string }>();
  const t = useT();
  const { locale } = useLanguage();
  const [data, setData] = useState<PayPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<"card" | "cash" | "already" | null>(null);
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    fetch(`/api/pay/${token}`)
      .then((r) => {
        if (!r.ok) throw new Error("invalid");
        return r.json();
      })
      .then((d: PayPageData) => {
        setData(d);
        if (d.paymentStatus === "paid") setDone("already");
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [token]);

  async function pay(method: ClientPaymentMethod) {
    setSubmitting(true);
    setSubmitError("");
    const res = await fetch(`/api/pay/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ method }),
    });
    const json = await res.json();
    setSubmitting(false);

    if (!res.ok) {
      setSubmitError(json.error || t("pay.failed"));
      return;
    }

    if (json.alreadyPaid) {
      setDone("already");
      return;
    }

    setDone(method === "card" ? "card" : "cash");
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <div className="w-full max-w-md animate-pulse space-y-4">
          <div className="h-8 rounded-lg bg-brand-100" />
          <div className="h-40 rounded-2xl bg-brand-50" />
        </div>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <p className="text-red-600">{t("pay.invalid")}</p>
      </main>
    );
  }

  const accent = data.themeColor || "#7c3aed";
  const dateLabel = format(new Date(data.appointmentDate), "EEEE d MMMM HH:mm", {
    locale: locale === "he" ? he : undefined,
  });

  if (done) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
        <div className="absolute top-4 end-4">
          <LanguageSwitcher />
        </div>
        <div className="card max-w-md w-full text-center">
          {done === "card" && (
            <>
              <p className="text-2xl font-bold text-emerald-600">{t("pay.cardSuccessTitle")}</p>
              <p className="mt-2 text-gray-600">{t("pay.cardSuccessDesc")}</p>
            </>
          )}
          {done === "cash" && (
            <>
              <p className="text-2xl font-bold text-amber-700">{t("pay.cashSuccessTitle")}</p>
              <p className="mt-2 text-gray-600">{t("pay.cashSuccessDesc")}</p>
            </>
          )}
          {done === "already" && (
            <>
              <p className="text-2xl font-bold text-brand-600">{t("pay.alreadyPaidTitle")}</p>
              <p className="mt-2 text-gray-600">{t("pay.alreadyPaidDesc")}</p>
            </>
          )}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-4 py-10">
      <div className="absolute top-4 end-4">
        <LanguageSwitcher />
      </div>
      <div className="mx-auto max-w-lg">
        <div className="text-center">
          <p className="text-sm text-gray-500">{t("pay.payAt")}</p>
          <h1 className="text-2xl font-bold" style={{ color: accent }}>
            {data.businessName}
          </h1>
          <p className="mt-2 text-gray-700">
            {t("pay.hello", { name: data.clientName })}
          </p>
        </div>

        <div className="card mt-8">
          <p className="text-sm text-gray-500">{t("pay.appointment")}</p>
          <p className="font-semibold text-gray-900">{data.serviceName || t("pay.service")}</p>
          <p className="mt-1 text-brand-700">{dateLabel}</p>

          {data.lineItems.length > 0 && (
            <ul className="mt-4 space-y-1 border-t border-gray-100 pt-4 text-sm">
              {data.lineItems.map((item, i) => (
                <li key={i} className="flex justify-between">
                  <span>{item.label}</span>
                  <span>₪{item.amount}</span>
                </li>
              ))}
            </ul>
          )}

          <p className="mt-4 border-t border-brand-100 pt-4 text-2xl font-bold text-brand-800">
            {t("pay.total")}: ₪{data.amount}
          </p>
        </div>

        <p className="mt-6 text-center text-sm font-medium text-gray-700">{t("pay.chooseMethod")}</p>

        <div className="mt-4 grid gap-3">
          <button
            type="button"
            disabled={submitting}
            onClick={() => pay("card")}
            className="flex min-h-[52px] w-full items-center justify-center rounded-2xl border-2 border-brand-500 bg-brand-500 px-4 text-lg font-semibold text-white shadow-md transition hover:bg-brand-600 disabled:opacity-60"
          >
            {t("pay.methodCard")}
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={() => pay("cash")}
            className="flex min-h-[52px] w-full items-center justify-center rounded-2xl border-2 border-amber-400 bg-amber-50 px-4 text-lg font-semibold text-amber-900 transition hover:bg-amber-100 disabled:opacity-60"
          >
            {t("pay.methodCash")}
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={() => pay("other")}
            className="flex min-h-[52px] w-full items-center justify-center rounded-2xl border-2 border-gray-200 bg-white px-4 text-base font-medium text-gray-800 transition hover:border-brand-300 hover:bg-brand-50 disabled:opacity-60"
          >
            {t("pay.methodOther")}
          </button>
        </div>

        {submitError && <p className="mt-4 text-center text-sm text-red-600">{submitError}</p>}

        <p className="mt-6 text-center text-xs text-gray-400">{t("pay.secureNote")}</p>
      </div>
    </main>
  );
}
