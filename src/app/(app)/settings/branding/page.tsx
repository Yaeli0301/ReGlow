"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { SubscriptionGate } from "@/components/billing/SubscriptionGate";
import { useAppUser } from "@/contexts/AppUserContext";
import { canAccess } from "@/lib/subscription";

export default function BrandingPage() {
  const user = useAppUser();
  const hasPro = canAccess(user.subscriptionTier, "appointments");
  const [businessName, setBusinessName] = useState(user.businessName);
  const [themeColor, setThemeColor] = useState("#c026d3");
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!hasPro) return;
    fetch("/api/business/settings")
      .then((r) => r.json())
      .then((d) => {
        if (d.settings) {
          setBusinessName(d.settings.businessName);
          setThemeColor(d.settings.themeColor || "#c026d3");
          if (d.settings.logoData) setLogoPreview(d.settings.logoData);
        }
      });
  }, [hasPro]);

  function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setLogoPreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    const res = await fetch("/api/business/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ businessName, themeColor, logoData: logoPreview }),
    });
    setSaving(false);
    setMessage(res.ok ? "נשמר בהצלחה ✓" : "שגיאה בשמירה");
  }

  if (!hasPro) {
    return (
      <div>
        <h1 className="text-2xl font-bold">מיתוג העסק</h1>
        <SubscriptionGate className="mt-6" title="מיתוג — Pro" description="שדרגי ל-Pro להתאמה אישית." />
      </div>
    );
  }

  const bookingUrl =
    typeof window !== "undefined" ? `${window.location.origin}/book/${user.id}` : `/book/${user.id}`;

  return (
    <div>
      <h1 className="text-2xl font-bold">מיתוג העסק</h1>
      <p className="mt-1 text-gray-500">לוגו, צבעים ושם על דף ההזמנה והחשבוניות</p>
      <form onSubmit={handleSave} className="card mt-6 max-w-lg space-y-4">
        <Input label="שם העסק" value={businessName} onChange={(e) => setBusinessName(e.target.value)} required />
        <div>
          <label className="label">צבע ראשי</label>
          <input type="color" value={themeColor} onChange={(e) => setThemeColor(e.target.value)} className="h-10 w-full rounded-lg border" />
        </div>
        <div>
          <label className="label">לוגו</label>
          <input type="file" accept="image/*" onChange={handleLogoUpload} />
          {logoPreview && <img src={logoPreview} alt="" className="mt-2 h-20 object-contain" />}
        </div>
        <div className="rounded-xl border-2 bg-brand-50 p-4 text-sm" style={{ borderColor: themeColor }}>
          <p style={{ color: themeColor }} className="font-semibold">תצוגה — {businessName}</p>
          <p className="mt-1 text-gray-600">{bookingUrl}</p>
        </div>
        {message && <p className="text-sm text-brand-600">{message}</p>}
        <Button type="submit" disabled={saving}>{saving ? "שומר..." : "שמירה"}</Button>
      </form>
    </div>
  );
}
