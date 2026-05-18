"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppUser } from "@/contexts/AppUserContext";
import { useT } from "@/contexts/LanguageContext";

interface FeedbackItem {
  _id: string;
  type: string;
  title: string;
  description: string;
  status: string;
  priority: number;
  email?: string;
  createdAt: string;
}

const STATUSES = ["open", "in_progress", "done", "rejected"] as const;

export default function AdminFeedbackPage() {
  const user = useAppUser();
  const router = useRouter();
  const t = useT();
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user.role !== "admin") {
      router.replace("/dashboard");
      return;
    }
    fetch("/api/admin/feedback")
      .then((r) => {
        if (!r.ok) throw new Error("forbidden");
        return r.json();
      })
      .then((d) => setItems(d.feedback || []))
      .catch(() => router.replace("/dashboard"))
      .finally(() => setLoading(false));
  }, [user.role, router]);

  async function patch(id: string, data: { status?: string; priority?: number }) {
    await fetch("/api/admin/feedback", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...data }),
    });
    const res = await fetch("/api/admin/feedback");
    const d = await res.json();
    setItems(d.feedback || []);
  }

  if (user.role !== "admin") return null;
  if (loading) return <p className="text-gray-500">{t("common.loading")}</p>;

  const statusLabel: Record<string, string> = {
    open: t("feedback.statusOpen"),
    in_progress: t("feedback.statusInProgress"),
    done: t("feedback.statusDone"),
    rejected: t("feedback.statusRejected"),
  };

  return (
    <div>
      <h1 className="text-2xl font-bold">{t("nav.adminFeedback")}</h1>
      <ul className="mt-6 space-y-4">
        {items.map((item) => (
          <li key={item._id} className="card space-y-2 text-sm">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-semibold">{item.title}</p>
                <p className="text-xs text-gray-500">{item.email}</p>
              </div>
              <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs">{item.type}</span>
            </div>
            <p className="text-gray-600">{item.description}</p>
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-1 text-xs">
                סטטוס
                <select
                  className="input py-1 text-xs"
                  value={item.status}
                  onChange={(e) => patch(item._id, { status: e.target.value })}
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {statusLabel[s]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-1 text-xs">
                עדיפות
                <input
                  type="number"
                  className="input w-16 py-1 text-xs"
                  value={item.priority}
                  onChange={(e) => patch(item._id, { priority: Number(e.target.value) })}
                />
              </label>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
