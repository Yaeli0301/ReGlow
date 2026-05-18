"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";

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
  shareMessage: string;
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

const STATUS_LABEL: Record<string, string> = {
  pending: "ממתין לתשלום",
  rewarded: "חודש חינם נצבר ✓",
  rejected: "לא זכאי",
  completed: "הושלם",
};

export function ReferralPanel({ compact = false }: ReferralPanelProps) {
  const [data, setData] = useState<ReferralData | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/referral")
      .then((res) => res.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

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
    if (navigator.share) {
      try {
        await navigator.share({
          title: "ReGlow — הזמנה לקולגות",
          text: data!.shareMessage,
          url: data!.referralLink,
        });
        return;
      } catch {
        /* cancelled */
      }
    }
    await copyLink();
  }

  function shareWhatsApp() {
    const waUrl = `https://wa.me/?text=${encodeURIComponent(data!.shareMessage)}`;
    window.open(waUrl, "_blank");
  }

  return (
    <div
      className={`card border-accent-200 bg-gradient-to-br from-brand-50/80 to-accent-50/40 ${compact ? "" : "mt-8"}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-brand-800">ההפניות שלך</h2>
          <p className="mt-1 text-sm text-gray-600">
            הזמיני קולגה — כשהיא משלמת, את מקבלת <strong>חודש חינם</strong>
          </p>
        </div>
        {data.rewardMonthsAvailable > 0 && (
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-800">
            {data.rewardMonthsAvailable} חודשי מתנה זמינים
          </span>
        )}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatPill label="הוזמנו" value={data.stats.invited} />
        <StatPill label="משלמות" value={data.stats.payingReferrals} accent />
        <StatPill label="פרסים שנצברו" value={data.stats.earnedRewards} accent />
        <StatPill label="ממתינות" value={data.stats.pending} />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button onClick={shareNative} className="flex-1 sm:flex-none">
          שיתוף בקליק
        </Button>
        <Button variant="whatsapp" onClick={shareWhatsApp}>
          WhatsApp
        </Button>
        <Button variant="secondary" onClick={copyLink}>
          {copied ? "הועתק!" : "העתקת קישור"}
        </Button>
      </div>

      <p className="mt-2 break-all text-xs text-gray-500">קוד: {data.referralCode}</p>

      {!compact && data.referrals.length > 0 && (
        <ul className="mt-4 max-h-48 space-y-2 overflow-y-auto">
          {data.referrals.slice(0, 10).map((r) => (
            <li
              key={r.id}
              className="flex items-center justify-between rounded-xl bg-white/70 px-3 py-2 text-sm"
            >
              <span className="font-medium">{r.businessName}</span>
              <span className={`text-xs ${r.isPaying ? "text-emerald-600" : "text-gray-400"}`}>
                {r.isPaying ? STATUS_LABEL[r.status] || "משלמת" : STATUS_LABEL.pending}
              </span>
            </li>
          ))}
        </ul>
      )}

      {data.rewardMonthsAvailable > 0 && !compact && (
        <p className="mt-3 rounded-xl bg-white/60 px-3 py-2 text-xs text-brand-700">
          יש לך {data.rewardMonthsAvailable} חודש מתנה — בחרי מנוי וסמני &quot;השתמשי בחודש חינם&quot; בקופה.
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
