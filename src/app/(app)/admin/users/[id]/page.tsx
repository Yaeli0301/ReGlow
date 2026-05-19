"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { parseJsonResponse } from "@/lib/client-api";

type Tier = "none" | "basic" | "pro" | "premium";

interface AdminUserDetails {
  id: string;
  email: string;
  businessName: string;
  role: string;
  subscriptionTier: Tier;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  referralCode: string | null;
  referralRewardMonths: number;
  adminOverride: {
    tier?: Tier;
    until?: string;
    discountPercent?: number;
    notes?: string;
    grantedBy?: string;
    grantedAt?: string;
  } | null;
  overrideActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface AuditEntry {
  id: string;
  adminEmail: string;
  action: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  reason?: string;
  createdAt: string;
}

const ACTION_LABELS: Record<string, string> = {
  set_tier: "שינוי מנוי",
  grant_override: "הענקת גישה",
  clear_override: "ביטול גישה ידנית",
  set_discount: "עדכון הנחה",
  set_notes: "עדכון הערות",
};

export default function AdminUserEditPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const [user, setUser] = useState<AdminUserDetails | null>(null);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");

  // Form state
  const [tier, setTier] = useState<Tier>("none");
  const [overrideTier, setOverrideTier] = useState<Tier | "">("");
  const [daysFromNow, setDaysFromNow] = useState<string>("");
  const [untilDate, setUntilDate] = useState<string>("");
  const [discountPercent, setDiscountPercent] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [reason, setReason] = useState<string>("");

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/users/${id}`, { credentials: "include" });
      const result = await parseJsonResponse<{
        user: AdminUserDetails;
        auditLog: AuditEntry[];
      }>(res);
      if (!result.ok) {
        setError(result.error || "לא ניתן לטעון את המשתמשת");
        return;
      }
      setUser(result.data.user);
      setAudit(result.data.auditLog);
      setTier(result.data.user.subscriptionTier);
      const o = result.data.user.adminOverride;
      setOverrideTier(o?.tier || "");
      setUntilDate(o?.until ? new Date(o.until).toISOString().slice(0, 10) : "");
      setDiscountPercent(
        typeof o?.discountPercent === "number" ? String(o.discountPercent) : ""
      );
      setNotes(o?.notes || "");
    } catch {
      setError("שגיאת רשת");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function save(action: "save" | "clear") {
    if (!id) return;
    setSaving(true);
    setError("");
    setSuccess("");

    const body: Record<string, unknown> = { reason: reason || undefined };

    if (action === "clear") {
      body.clearOverride = true;
    } else {
      if (tier !== user?.subscriptionTier) {
        body.subscriptionTier = tier;
      }

      const override: Record<string, unknown> = {};
      let hasOverride = false;

      if (overrideTier) {
        override.tier = overrideTier;
        hasOverride = true;
      }
      const days = parseInt(daysFromNow, 10);
      if (!Number.isNaN(days) && days > 0) {
        override.daysFromNow = days;
        hasOverride = true;
      } else if (untilDate) {
        override.until = new Date(`${untilDate}T23:59:59`).toISOString();
        hasOverride = true;
      }
      if (discountPercent !== "") {
        const d = parseFloat(discountPercent);
        if (!Number.isNaN(d)) {
          override.discountPercent = d;
          hasOverride = true;
        }
      }
      if (notes !== (user?.adminOverride?.notes || "")) {
        override.notes = notes;
        hasOverride = true;
      }

      if (hasOverride) body.override = override;
    }

    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const result = await parseJsonResponse<{ user: AdminUserDetails }>(res);
      if (!result.ok) {
        setError(result.error || "שמירה נכשלה");
        return;
      }
      setSuccess(action === "clear" ? "ההרשאה הידנית הוסרה" : "השינויים נשמרו");
      setReason("");
      await load();
    } catch {
      setError("שגיאת רשת");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-gray-500">טוען...</p>;
  if (!user) {
    return (
      <div className="card max-w-lg">
        <p className="text-red-600">{error || "המשתמשת לא נמצאה"}</p>
        <Link href="/admin-dashboard" className="mt-4 inline-block text-sm text-brand-600 hover:underline">
          ← חזרה לאדמין
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <Link href="/admin-dashboard" className="text-sm text-brand-600 hover:underline">
          ← חזרה לאדמין
        </Link>
        <h1 className="mt-2 text-2xl font-bold">{user.businessName}</h1>
        <p className="text-gray-500">{user.email}</p>
        <p className="mt-1 text-xs text-gray-400">
          תפקיד: {user.role} · נרשמה: {new Date(user.createdAt).toLocaleDateString("he-IL")}
        </p>
      </div>

      <div className="card space-y-4">
        <h2 className="font-semibold text-brand-700">מנוי בתשלום (Stripe)</h2>
        <p className="text-xs text-gray-500">
          זה מה ש-Stripe גובה. שינוי כאן לא מבטל מנוי קיים ב-Stripe — להחזר/ביטול עברי לפורטל של Stripe.
        </p>
        <label className="label">בחירת מנוי</label>
        <select
          className="input"
          value={tier}
          onChange={(e) => setTier(e.target.value as Tier)}
        >
          <option value="none">ללא מנוי (none)</option>
          <option value="basic">Basic (₪99)</option>
          <option value="pro">Pro (₪199)</option>
          <option value="premium">Premium (₪299)</option>
        </select>
        {user.stripeSubscriptionId && (
          <p className="text-xs text-gray-500">
            Stripe Subscription: <code>{user.stripeSubscriptionId}</code>
          </p>
        )}
      </div>

      <div className="card space-y-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="font-semibold text-brand-700">גישה ידנית / חינם</h2>
            <p className="text-xs text-gray-500">
              נותן גישה לפיצ&apos;רים בלי לחייב את הלקוחה ב-Stripe. עוקף את המנוי בתשלום עד תאריך הסיום.
            </p>
          </div>
          {user.overrideActive && (
            <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
              פעיל
            </span>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label">דרגת מנוי</label>
            <select
              className="input"
              value={overrideTier}
              onChange={(e) => setOverrideTier(e.target.value as Tier | "")}
            >
              <option value="">— ללא הרשאה ידנית —</option>
              <option value="basic">Basic</option>
              <option value="pro">Pro</option>
              <option value="premium">Premium</option>
            </select>
          </div>

          <Input
            label="מספר ימים חינם מהיום"
            type="number"
            min={0}
            max={365}
            value={daysFromNow}
            onChange={(e) => setDaysFromNow(e.target.value)}
            placeholder="לדוגמה: 30"
          />

          <Input
            label="או עד תאריך"
            type="date"
            value={untilDate}
            onChange={(e) => setUntilDate(e.target.value)}
          />

          <Input
            label="הנחה לתשלום הבא (%)"
            type="number"
            min={0}
            max={100}
            step={5}
            value={discountPercent}
            onChange={(e) => setDiscountPercent(e.target.value)}
            placeholder="לדוגמה: 20"
          />
        </div>

        <div>
          <label className="label">הערות פנימיות</label>
          <textarea
            className="input min-h-[80px]"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="לדוגמה: לקוחה ראשונה, מתנה לחודש ראשון"
          />
        </div>

        {user.adminOverride && (
          <div className="rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-600">
            עודכן לאחרונה:{" "}
            {user.adminOverride.grantedAt
              ? new Date(user.adminOverride.grantedAt).toLocaleString("he-IL")
              : "—"}
          </div>
        )}
      </div>

      <div className="card space-y-3">
        <label className="label">סיבה (אופציונלי, נשמר ב-audit log)</label>
        <Input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="לדוגמה: שיחת מכירות, מתנה, פיצוי על תקלה"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        {success && <p className="text-sm text-green-600">{success}</p>}
        <div className="flex flex-wrap gap-3">
          <Button onClick={() => save("save")} disabled={saving}>
            {saving ? "שומרים..." : "שמירה"}
          </Button>
          {user.adminOverride && (
            <Button variant="danger" onClick={() => save("clear")} disabled={saving}>
              ביטול גישה ידנית
            </Button>
          )}
          <button
            type="button"
            className="text-sm text-gray-500 hover:underline"
            onClick={() => router.push("/admin-dashboard")}
          >
            חזרה
          </button>
        </div>
      </div>

      <div className="card">
        <h2 className="font-semibold">היסטוריית שינויים</h2>
        {audit.length === 0 ? (
          <p className="mt-3 text-sm text-gray-500">אין שינויים עדיין.</p>
        ) : (
          <ul className="mt-3 space-y-2 text-sm">
            {audit.map((a) => (
              <li key={a.id} className="rounded-lg bg-gray-50 px-3 py-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{ACTION_LABELS[a.action] || a.action}</span>
                  <span className="text-xs text-gray-400">
                    {new Date(a.createdAt).toLocaleString("he-IL")}
                  </span>
                </div>
                <div className="text-xs text-gray-500">ע&quot;י {a.adminEmail}</div>
                {a.reason && (
                  <div className="mt-1 text-xs text-gray-600">סיבה: {a.reason}</div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
