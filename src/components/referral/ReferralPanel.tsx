"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { useLanguage, useT } from "@/contexts/LanguageContext";
import {
  buildWhatsAppLinkOnlyUrl,
  buildWhatsAppShareUrl,
  isPublicShareUrl,
} from "@/lib/whatsapp-share";

interface ReferralItem {
  id: string;
  status: string;
  businessName: string;
  subscriptionTier: string;
  isPaying: boolean;
  createdAt: string;
}

interface ReferralData {
  referralCode: string;
  referralLink: string;
  rewardMonthsAvailable: number;
  stats: {
    invited: number;
    payingReferrals: number;
    earnedRewards: number;
    pending: number;
  };
  referrals: ReferralItem[];
}

interface ReferralPanelProps {
  compact?: boolean;
}

export function ReferralPanel({ compact = false }: ReferralPanelProps) {
  const t = useT();
  const { locale } = useLanguage();
  const [data, setData] = useState<ReferralData | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/referral", { signal: controller.signal, cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) return null;
        return res.json() as Promise<ReferralData>;
      })
      .then((json) => {
        if (json) setData(json);
      })
      .catch(() => setData(null))
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  const shareIntro = useMemo(() => t("referral.shareMessageIntro"), [t, locale]);

  const linkIsPublic = useMemo(
    () => (data ? isPublicShareUrl(data.referralLink) : true),
    [data]
  );

  const statusLabel: Record<string, string> = useMemo(
    () => ({
      pending: t("referral.statusPending"),
      rewarded: t("referral.statusRewarded"),
      rejected: t("referral.statusRejected"),
      completed: t("referral.statusPending"),
    }),
    [t, locale]
  );

  if (loading) {
    return <div className="card h-32 animate-pulse" />;
  }

  if (!data) return null;

  async function copyLink() {
    await navigator.clipboard.writeText(data!.referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function shareNative() {
    const link = data!.referralLink;
    if (navigator.share) {
      try {
        await navigator.share({
          title: "ReGlow",
          text: `${shareIntro}\n\n${link}`,
          url: link,
        });
        return;
      } catch {
        /* cancelled */
      }
    }
    await copyLink();
  }

  /** WhatsApp: link-only = reliably clickable (especially on mobile) */
  function shareWhatsApp() {
    const waUrl = buildWhatsAppLinkOnlyUrl(data!.referralLink);
    window.location.href = waUrl;
  }

  function shareWhatsAppWithMessage() {
    const waUrl = buildWhatsAppShareUrl(shareIntro, data!.referralLink);
    window.location.href = waUrl;
  }

  return (
    <div
      className={`card border-accent-200 bg-gradient-to-br from-brand-50/80 to-accent-50/40 ${compact ? "" : "mt-8"}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-brand-800">{t("referral.title")}</h2>
          <p className="mt-1 text-sm text-gray-600">
            {t("referral.subtitle")} <strong>{t("referral.freeMonth")}</strong>
          </p>
        </div>
        {data.rewardMonthsAvailable > 0 && (
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-800">
            {data.rewardMonthsAvailable} {t("referral.monthsAvailable")}
          </span>
        )}
      </div>

      {!linkIsPublic && (
        <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          {t("referral.localhostWarning")}
        </p>
      )}

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatPill label={t("referral.invited")} value={data.stats.invited} />
        <StatPill label={t("referral.paying")} value={data.stats.payingReferrals} accent />
        <StatPill label={t("referral.earned")} value={data.stats.earnedRewards} accent />
        <StatPill label={t("referral.pending")} value={data.stats.pending} />
      </div>

      <a
        href={data.referralLink}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 block break-all rounded-xl border border-brand-200 bg-white px-3 py-2 text-sm font-medium text-brand-700 underline hover:bg-brand-50"
      >
        {data.referralLink}
      </a>
      <p className="mt-1 text-xs text-gray-500">{t("referral.whatsappShareHint")}</p>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="whatsapp" onClick={shareWhatsApp}>
          WhatsApp — {t("referral.copyLink")}
        </Button>
        <Button onClick={shareNative} className="flex-1 sm:flex-none">
          {t("referral.oneClickShare")}
        </Button>
        <Button variant="secondary" onClick={copyLink}>
          {copied ? t("common.copied") : t("referral.copyLink")}
        </Button>
        <Button variant="secondary" onClick={shareWhatsAppWithMessage} className="text-xs">
          WhatsApp + טקסט
        </Button>
      </div>

      <p className="mt-2 text-xs text-gray-500">
        {t("common.code")}: {data.referralCode}
      </p>

      {!compact && data.referrals.length > 0 && (
        <ul className="mt-4 max-h-48 space-y-2 overflow-y-auto">
          {data.referrals.slice(0, 10).map((r) => (
            <li
              key={r.id}
              className="flex items-center justify-between rounded-xl bg-white/70 px-3 py-2 text-sm"
            >
              <span className="font-medium">{r.businessName}</span>
              <span className={`text-xs ${r.isPaying ? "text-emerald-600" : "text-gray-400"}`}>
                {r.isPaying ? statusLabel[r.status] || t("referral.payingLabel") : statusLabel.pending}
              </span>
            </li>
          ))}
        </ul>
      )}

      {data.rewardMonthsAvailable > 0 && !compact && (
        <p className="mt-3 rounded-xl bg-white/60 px-3 py-2 text-xs text-brand-700">
          {t("referral.redeemHint", { count: data.rewardMonthsAvailable })}
        </p>
      )}
    </div>
  );
}

function StatPill({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className="rounded-xl bg-white/80 px-3 py-2 text-center shadow-sm">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`text-xl font-bold ${accent ? "text-brand-600" : "text-gray-900"}`}>{value}</p>
    </div>
  );
}
