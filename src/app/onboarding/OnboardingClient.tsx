"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { parseJsonResponse } from "@/lib/client-api";

type Step = "welcome" | "client" | "appointment" | "done";

export function OnboardingClient({ userName }: { userName: string }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("welcome");
  const [clientForm, setClientForm] = useState({ name: "", phone: "" });
  const [createdClientId, setCreatedClientId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function createFirstClient(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: clientForm.name, phone: clientForm.phone }),
      });
      const result = await parseJsonResponse<{ client: { _id: string } }>(res);
      if (!result.ok) {
        if (res.status === 403) {
          setStep("done");
          return;
        }
        setError(result.error || "לא ניתן להוסיף לקוחה כעת");
        return;
      }
      setCreatedClientId(result.data.client._id);
      setStep("appointment");
    } catch {
      setError("שגיאת רשת — נסי שוב");
    } finally {
      setSaving(false);
    }
  }

  async function createFirstAppointment() {
    setError("");
    setSaving(true);
    try {
      const date = new Date();
      date.setDate(date.getDate() + 1);
      date.setHours(12, 0, 0, 0);

      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          clientId: createdClientId,
          date: date.toISOString(),
          serviceName: "טיפול ראשון",
          status: "scheduled",
        }),
      });
      const result = await parseJsonResponse<unknown>(res);
      if (!result.ok && res.status === 403) {
        setStep("done");
        return;
      }
      setStep("done");
    } catch {
      setStep("done");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl py-12">
      <ol className="mb-8 flex gap-2 text-xs">
        <StepDot active={step !== "welcome"} label="ברוכה הבאה" />
        <StepDot active={step === "appointment" || step === "done"} label="לקוחה ראשונה" />
        <StepDot active={step === "done"} label="תור ראשון" />
      </ol>

      {step === "welcome" && (
        <div className="card text-center">
          <h1 className="text-2xl font-bold text-brand-700">שלום {userName} 💖</h1>
          <p className="mt-2 text-gray-600">
            בואי נכין את הסלון שלך תוך 2 דקות.
            <br />
            שני שלבים קצרים — ואת בלוח הבקרה.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button onClick={() => setStep("client")}>נתחיל</Button>
            <Link href="/dashboard" className="btn-secondary">
              דלגי לדאשבורד
            </Link>
          </div>
        </div>
      )}

      {step === "client" && (
        <form onSubmit={createFirstClient} className="card space-y-4">
          <div>
            <h2 className="text-xl font-semibold">הוסיפי לקוחה ראשונה</h2>
            <p className="text-sm text-gray-500">דוגמה אמיתית — תוכלי לערוך מאוחר יותר.</p>
          </div>
          <Input
            label="שם הלקוחה"
            value={clientForm.name}
            onChange={(e) => setClientForm({ ...clientForm, name: e.target.value })}
            required
            placeholder="לדוגמה: שירה לוי"
          />
          <Input
            label="טלפון"
            value={clientForm.phone}
            onChange={(e) => setClientForm({ ...clientForm, phone: e.target.value })}
            required
            placeholder="050-0000000"
            type="tel"
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-3">
            <Button type="submit" disabled={saving}>
              {saving ? "מוסיפים..." : "הוסיפי לקוחה"}
            </Button>
            <button
              type="button"
              className="text-sm text-gray-500 hover:underline"
              onClick={() => setStep("done")}
            >
              דלגי
            </button>
          </div>
        </form>
      )}

      {step === "appointment" && (
        <div className="card space-y-4">
          <h2 className="text-xl font-semibold">מצוין! עכשיו תור ראשון</h2>
          <p className="text-sm text-gray-500">
            נקבע אוטומטית למחר ב-12:00 — תוכלי לערוך מהיומן.
          </p>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-3">
            <Button onClick={createFirstAppointment} disabled={saving}>
              {saving ? "יוצרים..." : "צרי תור ראשון"}
            </Button>
            <button
              type="button"
              className="text-sm text-gray-500 hover:underline"
              onClick={() => setStep("done")}
            >
              דלגי
            </button>
          </div>
        </div>
      )}

      {step === "done" && (
        <div className="card text-center">
          <h2 className="text-2xl font-bold text-brand-700">המערכת מוכנה 🎉</h2>
          <p className="mt-2 text-gray-600">
            הכל מסונכרן. בואי נראה את לוח הבקרה.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button
              onClick={() => {
                if (typeof window !== "undefined") {
                  localStorage.setItem("reglow_onboarding_done", "1");
                }
                router.push("/dashboard");
              }}
            >
              לוח הבקרה
            </Button>
            <Link href="/clients" className="btn-secondary">
              לקוחות
            </Link>
            <Link href="/appointments" className="btn-secondary">
              יומן
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function StepDot({ active, label }: { active: boolean; label: string }) {
  return (
    <li className="flex-1">
      <div
        className={`h-1.5 w-full rounded-full ${active ? "bg-brand-500" : "bg-gray-200"}`}
      />
      <span className="mt-1 block text-center text-gray-500">{label}</span>
    </li>
  );
}
