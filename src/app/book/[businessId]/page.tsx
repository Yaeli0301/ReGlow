"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { useLanguage, useT } from "@/contexts/LanguageContext";
import { addDays, format } from "date-fns";
import { buildConfirmationMessage, buildWhatsAppLink } from "@/lib/whatsapp";

interface ServiceAddOn {
  _id: string;
  name: string;
  price: number;
}

interface Service {
  _id: string;
  name: string;
  durationMinutes: number;
  basePrice: number;
  price: number;
  addOns: ServiceAddOn[];
}

interface Branding {
  businessName: string;
  themeColor: string;
  logoData?: string;
}

interface Slot {
  start: string;
  label: string;
}

export default function BookingPage() {
  const params = useParams();
  const businessId = params.businessId as string;
  const t = useT();
  const { dir } = useLanguage();

  const [businessName, setBusinessName] = useState("");
  const [branding, setBranding] = useState<Branding | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [selectedAddOnIds, setSelectedAddOnIds] = useState<string[]>([]);
  const [pricePreview, setPricePreview] = useState({
    lineItems: [] as { label: string; amount: number }[],
    total: 0,
  });
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<{
    whatsappUrl?: string;
    paymentUrl?: string;
    finalPrice?: number;
  } | false>(false);

  const [form, setForm] = useState({
    name: "",
    phone: "",
    serviceId: "",
    date: format(addDays(new Date(), 1), "yyyy-MM-dd"),
    slotStart: "",
    notes: "",
    optIn: false,
  });

  useEffect(() => {
    fetch(`/api/booking/${businessId}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("Not found");
        return res.json();
      })
      .then((data) => {
        setBusinessName(data.businessName);
        setBranding(data.branding || null);
        setServices(data.services || []);
        if (data.services?.[0]) {
          setForm((f) => ({ ...f, serviceId: data.services[0]._id }));
        }
        setSelectedAddOnIds([]);
      })
      .catch(() => setError(t("booking.unavailable")))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId]);

  useEffect(() => {
    if (!form.date) return;
    setSlotsLoading(true);
    fetch(`/api/availability/slots?businessId=${businessId}&date=${form.date}`)
      .then((res) => res.json())
      .then((data) => {
        setSlots(data.slots || []);
        if (data.slots?.[0] && !form.slotStart) {
          setForm((f) => ({ ...f, slotStart: data.slots[0].start }));
        }
      })
      .finally(() => setSlotsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.date, businessId]);

  useEffect(() => {
    const service = services.find((s) => s._id === form.serviceId);
    if (!service) {
      setPricePreview({ lineItems: [], total: 0 });
      return;
    }
    const items = [
      { label: service.name, amount: service.basePrice ?? service.price },
      ...service.addOns
        .filter((a) => selectedAddOnIds.includes(a._id))
        .map((a) => ({ label: `+ ${a.name}`, amount: a.price })),
    ];
    const total = items.reduce((s, i) => s + i.amount, 0);
    setPricePreview({ lineItems: items, total });
  }, [form.serviceId, services, selectedAddOnIds]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!form.optIn) {
      setError(t("booking.optInRequired"));
      return;
    }

    if (!form.slotStart) {
      setError(t("booking.selectSlot"));
      return;
    }

    const res = await fetch(`/api/booking/${businessId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        phone: form.phone,
        serviceId: form.serviceId,
        selectedAddOnIds,
        date: form.slotStart,
        notes: form.notes,
        optIn: form.optIn,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error || t("booking.bookingFailed"));
      return;
    }

    const appointmentDate = new Date(data.appointmentDate);
    const msg = buildConfirmationMessage(businessName, appointmentDate, data.serviceName);
    setSuccess({
      whatsappUrl: buildWhatsAppLink(form.phone, msg),
      paymentUrl: data.paymentUrl,
      finalPrice: data.finalPrice,
    });
  }

  const shellClass = `min-h-screen ${dir === "rtl" ? "" : ""}`;

  if (loading) {
    return (
      <div className={`flex ${shellClass} items-center justify-center`}>
        <p className="text-gray-500">{t("common.loading")}</p>
      </div>
    );
  }

  if (error && !businessName) {
    return (
      <div className={`flex ${shellClass} items-center justify-center px-4`}>
        <div className="absolute top-4 end-4">
          <LanguageSwitcher />
        </div>
        <div className="card text-center">
          <p className="text-red-500">{error}</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className={`flex ${shellClass} items-center justify-center px-4`}>
        <div className="absolute top-4 end-4">
          <LanguageSwitcher />
        </div>
        <div className="card max-w-md text-center">
          <h1 className="text-2xl font-bold text-brand-600">{t("booking.confirmedTitle")}</h1>
          <p className="mt-2 text-gray-600">{t("booking.seeYouAt", { name: businessName })}</p>
          {success.paymentUrl && (success.finalPrice ?? 0) > 0 && (
            <a
              href={success.paymentUrl}
              className="btn-primary mt-6 inline-flex min-h-[48px] w-full items-center justify-center text-base font-semibold"
            >
              {t("booking.payNow")}
            </a>
          )}
          {success.whatsappUrl && (
            <a
              href={success.whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-block text-sm text-brand-600 hover:underline"
            >
              {t("booking.openWhatsApp")}
            </a>
          )}
        </div>
        <p className="fixed bottom-4 w-full text-center text-xs text-gray-400">
          {t("booking.poweredBy")} <span className="font-medium text-brand-500">ReGlow</span>
        </p>
      </div>
    );
  }

  return (
    <div className={`${shellClass} px-4 py-12`}>
      <div className="absolute top-4 end-4">
        <LanguageSwitcher />
      </div>
      <div className="mx-auto max-w-lg">
        <div className="text-center">
          {branding?.logoData && (
            <img src={branding.logoData} alt="" className="mx-auto mb-3 h-16 object-contain" />
          )}
          <span className="text-sm font-medium" style={{ color: branding?.themeColor || undefined }}>
            {t("booking.bookAt")}
          </span>
          <h1 className="text-3xl font-bold" style={{ color: branding?.themeColor }}>
            {businessName}
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="card mt-8 space-y-4">
          {services.length > 0 && (
            <div>
              <label className="label">{t("booking.service")}</label>
              <select
                className="input"
                value={form.serviceId}
                onChange={(e) => {
                  setForm({ ...form, serviceId: e.target.value });
                  setSelectedAddOnIds([]);
                }}
                required
              >
                {services.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.name} — {t("common.currency")}
                    {s.basePrice ?? s.price}
                  </option>
                ))}
              </select>
            </div>
          )}

          {services.find((s) => s._id === form.serviceId)?.addOns?.length ? (
            <div>
              <p className="label">תוספות</p>
              <div className="space-y-2">
                {services
                  .find((s) => s._id === form.serviceId)!
                  .addOns.map((a) => (
                    <label key={a._id} className="flex cursor-pointer items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={selectedAddOnIds.includes(a._id)}
                        onChange={() =>
                          setSelectedAddOnIds((prev) =>
                            prev.includes(a._id)
                              ? prev.filter((x) => x !== a._id)
                              : [...prev, a._id]
                          )
                        }
                      />
                      {a.name} (+{t("common.currency")}{a.price})
                    </label>
                  ))}
              </div>
            </div>
          ) : null}

          {pricePreview.total > 0 && (
            <div className="rounded-xl border border-brand-200 bg-brand-50 p-4">
              <p className="text-sm font-semibold text-brand-800">סיכום הזמנה</p>
              <ul className="mt-2 space-y-1 text-sm">
                {pricePreview.lineItems.map((item, i) => (
                  <li key={i} className="flex justify-between">
                    <span>{item.label}</span>
                    <span>₪{item.amount}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 border-t border-brand-200 pt-2 text-lg font-bold text-brand-700">
                סה״כ לתשלום: ₪{pricePreview.total}
              </p>
            </div>
          )}

          <Input
            label={t("booking.name")}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <Input
            label={t("booking.phone")}
            type="tel"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            required
          />
          <Input
            label={t("booking.date")}
            type="date"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value, slotStart: "" })}
            required
          />

          <div>
            <label className="label">{t("booking.time")}</label>
            {slotsLoading ? (
              <p className="text-sm text-gray-500">{t("booking.loadingSlots")}</p>
            ) : slots.length === 0 ? (
              <p className="text-sm text-amber-600">{t("booking.noSlots")}</p>
            ) : (
              <div className="grid grid-cols-4 gap-2">
                {slots.map((slot) => (
                  <button
                    key={slot.start}
                    type="button"
                    onClick={() => setForm({ ...form, slotStart: slot.start })}
                    className={`rounded-xl py-2 text-sm font-medium transition ${
                      form.slotStart === slot.start
                        ? "bg-brand-500 text-white"
                        : "bg-brand-50 text-brand-700 hover:bg-brand-100"
                    }`}
                  >
                    {slot.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <Input
            label={t("booking.notesOptional")}
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />

          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-brand-100 bg-brand-50/50 p-4">
            <input
              type="checkbox"
              checked={form.optIn}
              onChange={(e) => setForm({ ...form, optIn: e.target.checked })}
              className="mt-1 h-4 w-4 rounded border-brand-300 text-brand-500"
              required
            />
            <span className="text-sm text-gray-700">{t("booking.optInLong")}</span>
          </label>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <Button type="submit" className="w-full" disabled={slots.length === 0}>
            {t("booking.submit")}
          </Button>
        </form>

        <p className="mt-8 text-center text-xs text-gray-400">
          {t("booking.poweredBy")} <span className="font-medium text-brand-500">ReGlow</span>
        </p>
      </div>
    </div>
  );
}
