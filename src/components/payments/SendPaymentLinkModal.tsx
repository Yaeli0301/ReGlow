"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { useLanguage, useT } from "@/contexts/LanguageContext";
import { paymentLinkMessage, buildMessageChannelLinks } from "@/lib/messaging";

interface SendPaymentLinkModalProps {
  open: boolean;
  appointmentId: string;
  clientName: string;
  clientPhone: string;
  businessName: string;
  serviceName?: string;
  amount?: number;
  onClose: () => void;
}

export function SendPaymentLinkModal({
  open,
  appointmentId,
  clientName,
  clientPhone,
  businessName,
  serviceName,
  amount = 0,
  onClose,
}: SendPaymentLinkModalProps) {
  const t = useT();
  const { locale } = useLanguage();
  const [paymentUrl, setPaymentUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError("");
    fetch(`/api/appointments/${appointmentId}/payment-link`)
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || "Failed");
        setPaymentUrl(d.paymentUrl);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Error"))
      .finally(() => setLoading(false));
  }, [open, appointmentId]);

  if (!open) return null;

  const msgLocale = locale === "en" ? "en" : "he";
  const message = paymentUrl
    ? paymentLinkMessage(msgLocale, businessName, paymentUrl, amount, serviceName)
    : "";
  const channels = paymentUrl ? buildMessageChannelLinks(clientPhone, message) : null;

  async function copyLink() {
    if (!paymentUrl) return;
    try {
      await navigator.clipboard.writeText(paymentUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <div className="card max-h-[90vh] w-full max-w-lg overflow-y-auto">
        <h2 className="text-lg font-bold">{t("pay.sendLinkTitle")}</h2>
        <p className="mt-1 text-sm text-gray-500">
          {t("pay.sendLinkDesc", { name: clientName })}
        </p>

        {loading && <p className="mt-4 text-sm text-gray-500">{t("common.loading")}</p>}
        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

        {paymentUrl && (
          <>
            <code className="mt-4 block break-all rounded-lg bg-gray-100 px-3 py-2 text-xs">
              {paymentUrl}
            </code>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button type="button" variant="secondary" className="min-h-[44px]" onClick={copyLink}>
                {copied ? t("common.copied") : t("common.copy")}
              </Button>
              {channels && (
                <>
                  <a
                    href={channels.whatsapp}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-primary inline-flex min-h-[44px] items-center px-4"
                  >
                    WhatsApp
                  </a>
                  <a
                    href={channels.sms}
                    className="inline-flex min-h-[44px] items-center rounded-xl border border-brand-300 px-4 text-sm font-medium text-brand-700 hover:bg-brand-50"
                  >
                    SMS
                  </a>
                </>
              )}
            </div>
            <p className="mt-3 text-xs text-gray-500">{t("pay.sendLinkHint")}</p>
          </>
        )}

        <Button variant="secondary" className="mt-6 min-h-[44px]" onClick={onClose}>
          {t("common.cancel")}
        </Button>
      </div>
    </div>
  );
}
