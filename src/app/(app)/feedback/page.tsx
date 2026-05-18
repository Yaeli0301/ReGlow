"use client";

import { useCallback, useEffect, useState } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useT } from "@/contexts/LanguageContext";

type FeedbackType = "feature" | "bug" | "improvement";

interface FeedbackItem {
  _id: string;
  type: FeedbackType;
  title: string;
  description: string;
  status: string;
  createdAt: string;
}

export default function FeedbackPage() {
  const t = useT();
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({
    type: "feature" as FeedbackType,
    title: "",
    description: "",
  });

  const load = useCallback(() => {
    fetch("/api/feedback")
      .then((r) => r.json())
      .then((d) => setItems(d.feedback || []))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (!res.ok) return;
    setSent(true);
    setForm({ type: "feature", title: "", description: "" });
    load();
  }

  const typeLabels: Record<FeedbackType, string> = {
    feature: t("feedback.typeFeature"),
    bug: t("feedback.typeBug"),
    improvement: t("feedback.typeImprovement"),
  };

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold">{t("feedback.title")}</h1>
      <p className="mt-1 text-gray-500">{t("feedback.subtitle")}</p>

      <form onSubmit={handleSubmit} className="card mt-6 space-y-4">
        <div className="flex flex-wrap gap-2">
          {(["feature", "bug", "improvement"] as FeedbackType[]).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setForm({ ...form, type })}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                form.type === type ? "bg-brand-500 text-white" : "bg-brand-50 text-brand-700"
              }`}
            >
              {typeLabels[type]}
            </button>
          ))}
        </div>
        <Input
          label={t("feedback.titleLabel")}
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          required
        />
        <div>
          <label className="label">{t("feedback.descriptionLabel")}</label>
          <textarea
            className="input min-h-[120px]"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            required
            minLength={10}
          />
        </div>
        {sent && <p className="text-sm text-emerald-600">{t("feedback.success")}</p>}
        <Button type="submit">{t("feedback.submit")}</Button>
      </form>

      <div className="mt-10">
        <h2 className="font-semibold text-brand-700">{t("feedback.title")}</h2>
        {loading ? (
          <p className="mt-2 text-gray-500">{t("common.loading")}</p>
        ) : items.length === 0 ? (
          <p className="mt-2 text-sm text-gray-500">{t("feedback.empty")}</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {items.map((item) => (
              <li key={item._id} className="card text-sm">
                <div className="flex justify-between gap-2">
                  <span className="font-medium">{item.title}</span>
                  <span className="text-xs text-gray-500">{typeLabels[item.type]}</span>
                </div>
                <p className="mt-1 text-gray-600">{item.description}</p>
                <p className="mt-2 text-xs text-brand-600">{item.status}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
