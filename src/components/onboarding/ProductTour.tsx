"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { useT } from "@/contexts/LanguageContext";

const STORAGE_KEY = "reglow_product_tour_v1";

type TourStep = "welcome" | "dashboard" | "calendar" | "link" | "done";

const STEP_ORDER: TourStep[] = ["welcome", "dashboard", "calendar", "link", "done"];

export function ProductTour() {
  const t = useT();
  const [step, setStep] = useState<TourStep | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem(STORAGE_KEY)) return;
    setStep("welcome");
  }, []);

  if (!step) return null;

  const index = STEP_ORDER.indexOf(step);
  const progress = ((index + 1) / STEP_ORDER.length) * 100;

  function complete() {
    localStorage.setItem(STORAGE_KEY, "1");
    setStep(null);
  }

  function next() {
    if (step === "welcome") setStep("dashboard");
    else if (step === "dashboard") setStep("calendar");
    else if (step === "calendar") setStep("link");
    else if (step === "link") setStep("done");
    else complete();
  }

  function skip() {
    complete();
  }

  return (
    <div
      className="fixed inset-0 z-[90] flex items-end justify-center bg-black/50 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="product-tour-title"
    >
      <div className="card w-full max-w-md shadow-2xl">
        <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-gray-100">
          <div
            className="h-full rounded-full bg-brand-500 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>

        {step === "welcome" && (
          <>
            <h2 id="product-tour-title" className="text-2xl font-bold text-brand-800">
              {t("tour.welcomeTitle")}
            </h2>
            <p className="mt-3 text-gray-600">{t("tour.welcomeBody")}</p>
            <Button className="mt-6" onClick={next}>
              {t("tour.welcomeCta")}
            </Button>
          </>
        )}

        {step === "dashboard" && (
          <>
            <h2 id="product-tour-title" className="text-xl font-bold text-gray-900">
              {t("tour.dashboardTitle")}
            </h2>
            <p className="mt-3 text-gray-600">{t("tour.dashboardBody")}</p>
            <Button className="mt-6" onClick={next}>
              {t("tour.next")}
            </Button>
          </>
        )}

        {step === "calendar" && (
          <>
            <h2 id="product-tour-title" className="text-xl font-bold text-gray-900">
              {t("tour.calendarTitle")}
            </h2>
            <p className="mt-3 text-gray-600">{t("tour.calendarBody")}</p>
            <Button className="mt-6" onClick={next}>
              {t("tour.next")}
            </Button>
          </>
        )}

        {step === "link" && (
          <>
            <h2 id="product-tour-title" className="text-xl font-bold text-gray-900">
              {t("tour.linkTitle")}
            </h2>
            <p className="mt-3 text-gray-600">{t("tour.linkBody")}</p>
            <Button className="mt-6" onClick={next}>
              {t("tour.next")}
            </Button>
          </>
        )}

        {step === "done" && (
          <>
            <h2 id="product-tour-title" className="text-2xl font-bold text-brand-700">
              {t("tour.doneTitle")}
            </h2>
            <p className="mt-3 text-gray-600">{t("tour.doneBody")}</p>
            <Button className="mt-6" onClick={complete}>
              {t("tour.doneCta")}
            </Button>
          </>
        )}

        <button
          type="button"
          onClick={skip}
          className="mt-4 w-full min-h-[44px] text-sm text-gray-500 hover:text-gray-700"
        >
          {t("tour.skip")}
        </button>
      </div>
    </div>
  );
}
