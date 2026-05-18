"use client";

import Link from "next/link";
import { useT } from "@/contexts/LanguageContext";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";

export default function HomePage() {
  const t = useT();

  const features = [
    { title: t("landing.feature1Title"), desc: t("landing.feature1Desc") },
    { title: t("landing.feature2Title"), desc: t("landing.feature2Desc") },
    { title: t("landing.feature3Title"), desc: t("landing.feature3Desc") },
  ];

  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-6">
        <span className="text-2xl font-bold bg-gradient-to-r from-brand-600 to-accent-600 bg-clip-text text-transparent">
          ReGlow
        </span>
        <div className="flex flex-wrap items-center gap-3">
          <LanguageSwitcher />
          <Link href="/login" className="btn-secondary">
            {t("landing.signIn")}
          </Link>
          <Link href="/register" className="btn-primary">
            {t("landing.startFree")}
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-16 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
          {t("landing.title")}{" "}
          <span className="bg-gradient-to-r from-brand-500 to-accent-500 bg-clip-text text-transparent">
            💖
          </span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-600">{t("landing.subtitle")}</p>
        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <Link href="/register" className="btn-primary px-8 py-3 text-base">
            {t("landing.cta")} →
          </Link>
          <Link href="/login" className="btn-secondary px-8 py-3 text-base">
            {t("landing.signIn")}
          </Link>
        </div>

        <div className="mt-20 grid gap-6 sm:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="card text-start">
              <h3 className="font-semibold text-brand-700">{f.title}</h3>
              <p className="mt-2 text-sm text-gray-600">{f.desc}</p>
            </div>
          ))}
        </div>

        <div className="card mx-auto mt-16 max-w-lg">
          <p className="text-sm text-gray-500">{t("landing.plansFrom")}</p>
          <p className="text-3xl font-bold text-brand-600">
            {t("common.currency")}99{t("common.perMonth")}
          </p>
          <p className="mt-2 text-sm text-gray-600">{t("landing.proRecommended")}</p>
        </div>
      </main>
    </div>
  );
}
