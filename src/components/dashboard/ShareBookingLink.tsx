"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { HelpTooltip } from "@/components/ui/HelpTooltip";
import { useT, useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/contexts/ToastContext";
import {
  buildWhatsAppLinkOnlyUrl,
  buildWhatsAppShareUrl,
  isPublicShareUrl,
} from "@/lib/whatsapp-share";

interface ShareBookingLinkProps {
  businessId: string;
  locked?: boolean;
}

export function ShareBookingLink({ businessId, locked = false }: ShareBookingLinkProps) {
  const t = useT();
  const { locale } = useLanguage();
  const { showToast } = useToast();
  const [copied, setCopied] = useState(false);

  const bookingUrl = useMemo(() => {
    if (typeof window === "undefined") return `/booking/${businessId}`;
    return `${window.location.origin}/booking/${businessId}`;
  }, [businessId]);

  const shareIntro = t("dashboard.bookingShareIntro");
  const linkIsPublic = isPublicShareUrl(bookingUrl);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(bookingUrl);
      setCopied(true);
      showToast(t("toast.linkSent"));
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  if (locked) {
    return (
      <div className="card border-dashed border-brand-200 bg-brand-50/40 text-center">
        <p className="font-medium text-gray-800">{t("dashboard.bookingLockedTitle")}</p>
        <p className="mt-1 text-sm text-gray-600">{t("dashboard.bookingLockedDesc")}</p>
        <Link
          href="/billing"
          className="btn-primary mt-4 inline-block min-h-[44px]"
        >
          {t("dashboard.bookingUpgradeCta")}
        </Link>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold text-gray-900">{t("dashboard.shareBookingTitle")}</h3>
        <HelpTooltip
          title={t("dashboard.shareBookingTipTitle")}
          body={t("dashboard.shareBookingTipBody")}
          action={t("dashboard.shareBookingTipAction")}
        />
      </div>
      <p className="mt-1 text-sm text-gray-500">{t("dashboard.shareBookingSubtitle")}</p>
      <code className="mt-3 block break-all rounded-lg bg-gray-100 px-3 py-2 text-xs text-gray-700">
        {bookingUrl}
      </code>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button type="button" variant="secondary" className="min-h-[44px]" onClick={copyLink}>
          {copied ? t("common.copied") : t("common.copy")}
        </Button>
        <a
          href={buildWhatsAppShareUrl(shareIntro, bookingUrl)}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary inline-flex min-h-[44px] items-center justify-center px-4"
        >
          WhatsApp
        </a>
        {linkIsPublic && (
          <a
            href={`sms:?body=${encodeURIComponent(`${shareIntro}\n${bookingUrl}`)}`}
            className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-brand-300 bg-white px-4 text-sm font-medium text-brand-700 transition hover:bg-brand-50"
          >
            SMS
          </a>
        )}
        {!linkIsPublic && locale === "he" && (
          <span className="self-center text-xs text-amber-700">{t("dashboard.bookingLocalhostHint")}</span>
        )}
        <a
          href={buildWhatsAppLinkOnlyUrl(bookingUrl)}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-brand-600 hover:underline"
        >
          {t("dashboard.linkOnlyShare")}
        </a>
      </div>
    </div>
  );
}
