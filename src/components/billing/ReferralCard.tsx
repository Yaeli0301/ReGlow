"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";

interface ReferralData {
  referralCode: string;
  referralLink: string;
  rewardMonths: number;
  stats: { total: number; completed: number; pending: number };
}

export function ReferralCard() {
  const [data, setData] = useState<ReferralData | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/referral")
      .then((res) => res.json())
      .then(setData);
  }, []);

  if (!data) return null;

  async function copyLink() {
    await navigator.clipboard.writeText(data!.referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="card mt-8 border-accent-200 bg-gradient-to-br from-brand-50 to-accent-50/30">
      <h3 className="font-semibold text-brand-800">הזמיני קולגה — חודש חינם 🎁</h3>
      <p className="mt-1 text-sm text-gray-600">
        שתפי את הקישור. כשקוסמטיקאית נרשמת ומשלמת — את מקבלת חודש חינם.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <code className="flex-1 rounded-xl bg-white px-3 py-2 text-sm text-brand-700 break-all">
          {data.referralLink}
        </code>
        <Button variant="secondary" onClick={copyLink}>
          {copied ? "הועתק!" : "העתקה"}
        </Button>
      </div>

      <p className="mt-3 text-xs text-gray-500">
        קוד: {data.referralCode} · {data.stats.completed} הזמנות הושלמו · {data.rewardMonths} חודשי מתנה
      </p>
    </div>
  );
}
