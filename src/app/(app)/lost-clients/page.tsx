"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { OptInBadge } from "@/components/clients/OptInBadge";
import { MessageChannelButton } from "@/components/clients/MessageChannelButton";
import { WHATSAPP_TEMPLATES } from "@/lib/whatsapp";
import { useAppUser, useDemoMode } from "@/contexts/AppUserContext";
import { canAccess } from "@/lib/subscription";
import { useT } from "@/contexts/LanguageContext";
import type { ClientStatus } from "@/types";

interface Client {
  _id: string;
  name: string;
  phone: string;
  lastVisitDate?: string;
  lastMessageSentDate?: string;
  status: ClientStatus;
  optIn: boolean;
}

export default function LostClientsPage() {
  const t = useT();
  const user = useAppUser();
  const demoMode = useDemoMode();
  const hasAccess = canAccess(user.subscriptionTier, "lostClients");
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [locked, setLocked] = useState(false);
  const [lockedPreviewCount, setLockedPreviewCount] = useState(0);

  useEffect(() => {
    if (!hasAccess) {
      fetch("/api/dashboard/stats")
        .then(async (res) => (res.ok ? res.json() : null))
        .then((data: { lostClients?: number } | null) => {
          if (data?.lostClients != null) setLockedPreviewCount(data.lostClients);
        })
        .catch(() => {})
        .finally(() => {
          setLoading(false);
          setLocked(true);
        });
      return;
    }

    fetch("/api/clients?status=lost")
      .then(async (res) => {
        if (res.status === 403) {
          setLocked(true);
          return { clients: [] };
        }
        return res.json();
      })
      .then((data) => setClients(data.clients || []))
      .finally(() => setLoading(false));
  }, [hasAccess]);

  if (loading) return <p className="text-gray-500">{t("common.loading")}</p>;

  if (locked) {
    const lockedTitle = t("lostClients.lockedTitle").replace(
      "{count}",
      String(lockedPreviewCount || "—")
    );
    return (
      <div className="card max-w-lg text-center">
        <h1 className="text-xl font-bold text-brand-800">{lockedTitle}</h1>
        <p className="mt-2 text-gray-600">{t("lostClients.lockedDesc")}</p>
        <Link
          href="/billing"
          className="btn-primary mt-4 inline-block"
        >
          {t("lostClients.upgradeCta")}
        </Link>
      </div>
    );
  }

  return (
    <div className="pb-8">
      <h1 className="text-2xl font-bold text-brand-800">{t("lostClients.title")}</h1>
      <p className="mt-1 text-gray-500">{t("lostClients.subtitle")}</p>

      {clients.length > 0 && (
        <Link href="/recover-clients" className="btn-primary mt-6 inline-flex min-h-[48px]">
          {t("dashboard.heroCta")}
        </Link>
      )}

      {clients.length === 0 ? (
        <div className="card mt-8 text-center text-gray-500">
          <p>{t("lostClients.empty")}</p>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {clients.map((client) => (
            <div
              key={client._id}
              className="card flex flex-wrap items-center justify-between gap-3 border-red-100 bg-red-50/40"
            >
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{client.name}</p>
                  <OptInBadge optIn={client.optIn} />
                </div>
                <p className="text-sm text-gray-500">{client.phone}</p>
                {client.lastVisitDate && (
                  <p className="text-xs text-red-500">
                    {t("lostClients.lastVisit")}:{" "}
                    {new Date(client.lastVisitDate).toLocaleDateString("he-IL")}
                  </p>
                )}
              </div>
              <MessageChannelButton
                phone={client.phone}
                message={WHATSAPP_TEMPLATES.reactivation}
                optIn={client.optIn}
                lastMessageSentDate={client.lastMessageSentDate}
                label={t("lostClients.sendReactivation")}
                smsLabel="SMS"
              />
            </div>
          ))}
        </div>
      )}

      <div className="card mt-8 border-brand-100 bg-brand-50/50">
        <p className="text-sm text-gray-600">{t("lostClients.automatedHint")}</p>
      </div>
    </div>
  );
}
