"use client";

import Link from "next/link";
import { useT } from "@/contexts/LanguageContext";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";

interface LandingPageProps {
  showDemoCta?: boolean;
}

export function LandingPage({ showDemoCta = false }: LandingPageProps) {
  const t = useT();

  const features = [
    { title: t("landing.feature1Title"), desc: t("landing.feature1Desc"), icon: "👥" },
    { title: t("landing.feature2Title"), desc: t("landing.feature2Desc"), icon: "💬" },
    { title: t("landing.feature3Title"), desc: t("landing.feature3Desc"), icon: "📅" },
  ];

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <div
        className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br from-brand-100/80 via-white to-accent-400/20"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -top-24 start-1/4 -z-10 h-72 w-72 rounded-full bg-brand-300/30 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute bottom-0 end-0 -z-10 h-96 w-96 rounded-full bg-accent-400/20 blur-3xl"
        aria-hidden
      />

      <header className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 md:px-10 md:py-6">
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

      <main className="mx-auto max-w-6xl px-4 pb-16 md:px-10 md:pb-24">
        <section className="rounded-3xl border border-white/90 bg-white/80 px-6 py-12 text-center shadow-soft backdrop-blur-md md:px-12 md:py-16">
          <p className="text-sm font-semibold uppercase tracking-wide text-brand-600">
            {t("landing.badge")}
          </p>
          <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-gray-900 sm:text-6xl">
            {t("landing.title")}{" "}
            <span className="bg-gradient-to-r from-brand-500 to-accent-500 bg-clip-text text-transparent">
              💖
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-gray-600">
            {t("landing.subtitle")}
          </p>
          <div className="mt-10 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
            <Link href="/register" className="btn-primary px-8 py-3 text-base sm:min-w-[200px]">
              {t("landing.cta")} →
            </Link>
            {showDemoCta && (
              <Link
                href="/demo/start?plan=pro"
                className="btn-secondary px-8 py-3 text-base sm:min-w-[200px]"
              >
                {t("landing.tryDemo")} →
              </Link>
            )}
            <Link href="/login" className="btn-secondary px-8 py-3 text-base sm:min-w-[160px]">
              {t("landing.signIn")}
            </Link>
          </div>
        </section>

        <div className="mt-16 grid grid-cols-1 gap-6 md:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="card text-start">
              <span className="text-3xl" aria-hidden>
                {f.icon}
              </span>
              <h3 className="mt-3 font-semibold text-brand-700">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-600">{f.desc}</p>
            </div>
          ))}
        </div>

        <div className="card mx-auto mt-16 max-w-lg text-center">
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
