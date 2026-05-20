"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { HelpTooltip } from "@/components/ui/HelpTooltip";
import { MessageChannelButton } from "@/components/clients/MessageChannelButton";
import { useT, useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/contexts/ToastContext";
import { getWhatsAppBlockReason } from "@/lib/whatsapp-safety";
import {
  DEFAULT_WIN_BACK_MESSAGE_EN,
  DEFAULT_WIN_BACK_MESSAGE_HE,
  personalizeWinBackMessage,
} from "@/lib/win-back-message";

interface LostClient {
  _id: string;
  name: string;
  phone: string;
  optIn: boolean;
  lastMessageSentDate?: string;
}

type Step = "count" | "message" | "send" | "done";

export function WinBackFlow() {
  const t = useT();
  const { locale } = useLanguage();
  const { showToast } = useToast();
  const [step, setStep] = useState<Step>("count");
  const [clients, setClients] = useState<LostClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [messageTemplate, setMessageTemplate] = useState(
    locale === "en" ? DEFAULT_WIN_BACK_MESSAGE_EN : DEFAULT_WIN_BACK_MESSAGE_HE
  );
  const [sentIds, setSentIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch("/api/clients?status=lost")
      .then(async (res) => {
        if (!res.ok) return { clients: [] };
        return res.json();
      })
      .then((data) => setClients(data.clients || []))
      .finally(() => setLoading(false));
  }, []);

  const eligible = useMemo(
    () =>
      clients.filter(
        (c) =>
          !getWhatsAppBlockReason({
            optIn: c.optIn,
            lastMessageSentDate: c.lastMessageSentDate
              ? new Date(c.lastMessageSentDate)
              : null,
          })
      ),
    [clients]
  );

  const markSent = useCallback(
    (id: string) => {
      setSentIds((prev) => {
        const next = new Set(prev);
        next.add(id);
        return next;
      });
      showToast(t("toast.messageSent"));
    },
    [showToast, t]
  );

  const finishSending = useCallback(() => {
    setStep("done");
    if (sentIds.size > 0) {
      showToast(t("winBack.successToast", { count: sentIds.size }));
    }
  }, [sentIds.size, showToast, t]);

  if (loading) {
    return (
      <div className="animate-pulse space-y-4" aria-busy="true">
        <div className="h-10 w-48 rounded-lg bg-brand-100" />
        <div className="h-40 rounded-2xl bg-brand-50" />
      </div>
    );
  }

  if (clients.length === 0) {
    return (
      <div className="card max-w-lg text-center">
        <h1 className="text-xl font-bold text-brand-800">{t("winBack.title")}</h1>
        <p className="mt-2 text-gray-600">{t("lostClients.empty")}</p>
        <Link href="/dashboard" className="btn-secondary mt-6 inline-block">
          {t("common.back")}
        </Link>
      </div>
    );
  }

  if (step === "count") {
    return (
      <div className="mx-auto max-w-lg">
        <h1 className="text-2xl font-bold text-gray-900">{t("winBack.title")}</h1>
        <div className="card mt-6 text-center">
          <p className="text-3xl font-extrabold text-brand-700">{clients.length}</p>
          <p className="mt-2 text-lg text-gray-800">{t("winBack.foundCount", { count: clients.length })}</p>
          <p className="mt-3 text-sm text-gray-500">{t("winBack.moneyWaiting")}</p>
          <p className="mt-1 text-sm text-brand-600">{t("winBack.easyFast")}</p>
          <Button className="mt-6" onClick={() => setStep("message")}>
            {t("winBack.continue")}
          </Button>
        </div>
        <Link href="/dashboard" className="mt-4 block text-center text-sm text-gray-500 hover:underline">
          {t("common.back")}
        </Link>
      </div>
    );
  }

  if (step === "message") {
    return (
      <div className="mx-auto max-w-lg">
        <h1 className="text-2xl font-bold text-gray-900">{t("winBack.chooseMessage")}</h1>
        <p className="mt-1 text-sm text-gray-500">{t("winBack.messageHint")}</p>
        <div className="card mt-6">
          <label className="label" htmlFor="winback-msg">
            {t("winBack.messageLabel")}
          </label>
          <textarea
            id="winback-msg"
            className="input min-h-[140px] resize-y"
            value={messageTemplate}
            onChange={(e) => setMessageTemplate(e.target.value)}
          />
          <p className="mt-2 text-xs text-gray-400">{t("winBack.namePlaceholder")}</p>
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button onClick={() => setStep("send")}>{t("winBack.sendCta")}</Button>
          <button
            type="button"
            className="min-h-[44px] text-sm text-gray-500 hover:underline"
            onClick={() => setStep("count")}
          >
            {t("common.back")}
          </button>
        </div>
      </div>
    );
  }

  if (step === "send") {
    return (
      <div className="mx-auto max-w-lg pb-24">
        <h1 className="text-2xl font-bold text-gray-900">{t("winBack.sendToEach")}</h1>
        <p className="mt-1 text-sm text-gray-500">
          {t("winBack.sentProgress", { sent: sentIds.size, total: eligible.length })}
        </p>
        <ul className="mt-6 space-y-3">
          {clients.map((client) => {
            const blocked = getWhatsAppBlockReason({
              optIn: client.optIn,
              lastMessageSentDate: client.lastMessageSentDate
                ? new Date(client.lastMessageSentDate)
                : null,
            });
            const msg = personalizeWinBackMessage(messageTemplate, client.name);
            const wasSent = sentIds.has(client._id);

            return (
              <li
                key={client._id}
                className={`card ${wasSent ? "border-emerald-200 bg-emerald-50/50" : ""}`}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">{client.name}</p>
                    {blocked && (
                      <p className="text-xs text-amber-700">{t("winBack.blockedHint")}</p>
                    )}
                    {wasSent && (
                      <p className="text-xs font-medium text-emerald-700">{t("winBack.sentOne")}</p>
                    )}
                  </div>
                  {!blocked && !wasSent && (
                    <div onClickCapture={() => markSent(client._id)}>
                      <MessageChannelButton
                        phone={client.phone}
                        message={msg}
                        optIn={client.optIn}
                        lastMessageSentDate={client.lastMessageSentDate}
                        label={t("winBack.sendOne")}
                        smsLabel="SMS"
                        compact
                      />
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-brand-200 bg-white/95 p-4 md:static md:mt-8 md:border-0 md:bg-transparent md:p-0">
          <Button className="w-full" onClick={finishSending}>
            {t("winBack.finish", { count: sentIds.size })}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="card mx-auto max-w-lg text-center">
      <p className="text-2xl font-bold text-emerald-600">
        {t("winBack.doneTitle", { count: sentIds.size })}
      </p>
      <p className="mt-2 text-gray-600">{t("winBack.doneSubtitle")}</p>
      <p className="mt-4 text-xs text-gray-400">{t("winBack.trackingNote")}</p>
      <div className="mt-6 flex flex-col gap-3">
        <Link href="/dashboard" className="btn-primary">
          {t("winBack.backDashboard")}
        </Link>
        <Link href="/appointments" className="btn-secondary">
          {t("dashboard.goToCalendar")}
        </Link>
      </div>
    </div>
  );
}
