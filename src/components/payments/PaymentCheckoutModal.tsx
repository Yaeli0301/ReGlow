"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { PaymentMethod, PriceLineItem } from "@/types/payments";

interface ServiceOption {
  _id: string;
  name: string;
  basePrice: number;
  addOns: { _id: string; name: string; price: number }[];
}

interface PaymentCheckoutModalProps {
  open: boolean;
  appointmentId: string;
  clientName: string;
  defaultServiceName?: string;
  onClose: () => void;
  onComplete: (result: { requiresCashConfirmation?: boolean }) => void;
}

export function PaymentCheckoutModal({
  open,
  appointmentId,
  clientName,
  defaultServiceName,
  onClose,
  onComplete,
}: PaymentCheckoutModalProps) {
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [serviceId, setServiceId] = useState("");
  const [selectedAddOnIds, setSelectedAddOnIds] = useState<string[]>([]);
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [extraLabel, setExtraLabel] = useState("");
  const [extraAmount, setExtraAmount] = useState("");
  const [manualPrice, setManualPrice] = useState("");
  const [lineItems, setLineItems] = useState<PriceLineItem[]>([]);
  const [finalPrice, setFinalPrice] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const selectedService = useMemo(
    () => services.find((s) => s._id === serviceId),
    [services, serviceId]
  );

  useEffect(() => {
    if (!open) return;
    fetch("/api/services")
      .then((r) => r.json())
      .then((d) => {
        setServices(d.services || []);
        if (d.services?.[0]) setServiceId(d.services[0]._id);
      });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const extras: PriceLineItem[] = [];
    if (extraLabel && extraAmount) {
      extras.push({ label: extraLabel, amount: Number(extraAmount) || 0 });
    }
    fetch("/api/pricing/calculate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        serviceId: serviceId || undefined,
        serviceName: !serviceId ? defaultServiceName : undefined,
        selectedAddOnIds,
        extraLineItems: extras,
        manualFinalPrice: manualPrice ? Number(manualPrice) : undefined,
      }),
    })
      .then((r) => r.json())
      .then((d) => {
        setLineItems(d.lineItems || []);
        setFinalPrice(d.finalPrice || 0);
      });
  }, [open, serviceId, selectedAddOnIds, extraLabel, extraAmount, manualPrice, defaultServiceName]);

  if (!open) return null;

  async function handleSubmit() {
    setLoading(true);
    setError("");
    const extras: PriceLineItem[] = [];
    if (extraLabel && extraAmount) {
      extras.push({ label: extraLabel, amount: Number(extraAmount) });
    }

    const res = await fetch(`/api/appointments/${appointmentId}/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        method,
        serviceId: serviceId || undefined,
        selectedAddOnIds,
        extraLineItems: extras,
        manualFinalPrice: manualPrice ? Number(manualPrice) : undefined,
      }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "שגיאה");
      return;
    }

    onComplete({ requiresCashConfirmation: data.requiresCashConfirmation });
    onClose();
  }

  function toggleAddOn(id: string) {
    setSelectedAddOnIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="card max-h-[90vh] w-full max-w-lg overflow-y-auto">
        <h2 className="text-lg font-bold">סיום תור — {clientName}</h2>
        <p className="mt-1 text-sm text-gray-500">בחרי שירות, תוספות ואמצעי תשלום</p>

        <div className="mt-4 space-y-3">
          <label className="label">שירות</label>
          <select className="input" value={serviceId} onChange={(e) => setServiceId(e.target.value)}>
            <option value="">ללא שירות מהמחירון</option>
            {services.map((s) => (
              <option key={s._id} value={s._id}>
                {s.name} — ₪{s.basePrice}
              </option>
            ))}
          </select>

          {selectedService && selectedService.addOns.length > 0 && (
            <div>
              <p className="label">תוספות</p>
              <div className="space-y-2">
                {selectedService.addOns.map((a) => (
                  <label key={a._id} className="flex cursor-pointer items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={selectedAddOnIds.includes(a._id)}
                      onChange={() => toggleAddOn(a._id)}
                    />
                    {a.name} (+₪{a.price})
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <Input
              label="חיוב נוסף (תיאור)"
              value={extraLabel}
              onChange={(e) => setExtraLabel(e.target.value)}
              placeholder="ציפורן ארוכה"
            />
            <Input
              label="סכום (+₪)"
              type="number"
              value={extraAmount}
              onChange={(e) => setExtraAmount(e.target.value)}
            />
          </div>

          <Input
            label="מחיר סופי ידני (אופציונלי)"
            type="number"
            value={manualPrice}
            onChange={(e) => setManualPrice(e.target.value)}
          />

          <div className="rounded-xl bg-brand-50 p-3 text-sm">
            <p className="font-semibold text-brand-800">פירוט מחיר</p>
            <ul className="mt-2 space-y-1">
              {lineItems.map((item, i) => (
                <li key={i} className="flex justify-between">
                  <span>{item.label}</span>
                  <span>₪{item.amount}</span>
                </li>
              ))}
            </ul>
            <p className="mt-2 border-t border-brand-200 pt-2 text-base font-bold text-brand-700">
              סה״כ לתשלום: ₪{finalPrice}
            </p>
          </div>

          <p className="label">אמצעי תשלום</p>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                ["cash", "מזומן"],
                ["card", "אשראי"],
                ["bit", "ביט"],
                ["paypal", "PayPal"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setMethod(value)}
                className={`rounded-xl border px-3 py-2 text-sm ${
                  method === value
                    ? "border-brand-500 bg-brand-500 text-white"
                    : "border-gray-200 bg-white"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {method === "cash" && (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
              לאחר האישור תתבקשי לאשר שהתקבל מזומן מהלקוחה.
            </p>
          )}
          {method === "paypal" && (
            <p className="text-xs text-gray-500">אינטגרציית PayPal — בקרוב (placeholder)</p>
          )}
        </div>

        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

        <div className="mt-6 flex gap-2">
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "שומר..." : "אישור וסיום תור"}
          </Button>
          <Button variant="secondary" onClick={onClose}>
            ביטול
          </Button>
        </div>
      </div>
    </div>
  );
}
