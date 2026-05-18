"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { addDays, format } from "date-fns";
import { buildConfirmationMessage, buildWhatsAppLink } from "@/lib/whatsapp";

interface Service {
  _id: string;
  name: string;
  durationMinutes: number;
  price: number;
}

interface Slot {
  start: string;
  label: string;
}

export default function BookingPage() {
  const params = useParams();
  const businessId = params.businessId as string;

  const [businessName, setBusinessName] = useState("");
  const [services, setServices] = useState<Service[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<{ whatsappUrl?: string } | false>(false);

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
        setServices(data.services || []);
        if (data.services?.[0]) {
          setForm((f) => ({ ...f, serviceId: data.services[0]._id }));
        }
      })
      .catch(() => setError("דף ההזמנה אינו זמין"))
      .finally(() => setLoading(false));
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!form.optIn) {
      setError("יש לאשר קבלת הודעות כדי להשלים את ההזמנה");
      return;
    }

    if (!form.slotStart) {
      setError("בחרי שעה פנויה");
      return;
    }

    const res = await fetch(`/api/booking/${businessId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        phone: form.phone,
        serviceId: form.serviceId,
        date: form.slotStart,
        notes: form.notes,
        optIn: form.optIn,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "ההזמנה נכשלה");
      return;
    }

    const appointmentDate = new Date(data.appointmentDate);
    const msg = buildConfirmationMessage(businessName, appointmentDate, data.serviceName);
    setSuccess({ whatsappUrl: buildWhatsAppLink(form.phone, msg) });
  }

  if (loading) {
    return (
      <div dir="rtl" lang="he" className="flex min-h-screen items-center justify-center">
        <p className="text-gray-500">טוען...</p>
      </div>
    );
  }

  if (error && !businessName) {
    return (
      <div dir="rtl" lang="he" className="flex min-h-screen items-center justify-center px-4">
        <div className="card text-center">
          <p className="text-red-500">{error}</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div dir="rtl" lang="he" className="flex min-h-screen items-center justify-center px-4">
        <div className="card max-w-md text-center">
          <h1 className="text-2xl font-bold text-brand-600">התור אושר! 💖</h1>
          <p className="mt-2 text-gray-600">נתראה ב-{businessName}</p>
          {success.whatsappUrl && (
            <a href={success.whatsappUrl} target="_blank" rel="noopener noreferrer" className="btn-primary mt-6 inline-block">
              שליחת אישור ב-WhatsApp
            </a>
          )}
        </div>
        <p className="fixed bottom-4 text-center text-xs text-gray-400 w-full">
          Powered by <span className="font-medium text-brand-500">ReGlow</span>
        </p>
      </div>
    );
  }

  return (
    <div dir="rtl" lang="he" className="min-h-screen px-4 py-12">
      <div className="mx-auto max-w-lg">
        <div className="text-center">
          <span className="text-sm font-medium text-brand-600">הזמנת תור אצל</span>
          <h1 className="text-3xl font-bold">{businessName}</h1>
        </div>

        <form onSubmit={handleSubmit} className="card mt-8 space-y-4">
          {services.length > 0 && (
            <div>
              <label className="label">שירות</label>
              <select
                className="input"
                value={form.serviceId}
                onChange={(e) => setForm({ ...form, serviceId: e.target.value })}
                required
              >
                {services.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.name} — ₪{s.price}
                  </option>
                ))}
              </select>
            </div>
          )}

          <Input label="שם מלא" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <Input label="טלפון" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
          <Input label="תאריך" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value, slotStart: "" })} required />

          <div>
            <label className="label">שעה פנויה</label>
            {slotsLoading ? (
              <p className="text-sm text-gray-500">טוען שעות...</p>
            ) : slots.length === 0 ? (
              <p className="text-sm text-amber-600">אין שעות פנויות בתאריך זה</p>
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

          <Input label="הערות (אופציונלי)" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />

          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-brand-100 bg-brand-50/50 p-4">
            <input
              type="checkbox"
              checked={form.optIn}
              onChange={(e) => setForm({ ...form, optIn: e.target.checked })}
              className="mt-1 h-4 w-4 rounded border-brand-300 text-brand-500"
              required
            />
            <span className="text-sm text-gray-700">
              אני מאשרת קבלת הודעות ותזכורות לגבי התורים שלי
            </span>
          </label>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <Button type="submit" className="w-full" disabled={slots.length === 0}>
            אישור הזמנה
          </Button>
        </form>

        <p className="mt-8 text-center text-xs text-gray-400">
          Powered by <span className="font-medium text-brand-500">ReGlow</span>
        </p>
      </div>
    </div>
  );
}
