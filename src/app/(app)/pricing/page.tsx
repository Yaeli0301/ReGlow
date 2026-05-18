"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { SubscriptionGate } from "@/components/billing/SubscriptionGate";
import { useHasSubscription } from "@/contexts/AppUserContext";
import { canAccess } from "@/lib/subscription";
import { useAppUser } from "@/contexts/AppUserContext";

interface AddOn {
  _id: string;
  name: string;
  price: number;
}

interface ServiceRow {
  _id: string;
  name: string;
  basePrice: number;
  durationMinutes: number;
  addOns: AddOn[];
  sortOrder: number;
}

export default function PricingPage() {
  const user = useAppUser();
  const hasPro = canAccess(user.subscriptionTier, "appointments");
  const hasSubscription = useHasSubscription();

  const [services, setServices] = useState<ServiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    name: "",
    basePrice: 150,
    durationMinutes: 60,
    addOnName: "",
    addOnPrice: 20,
  });
  const [editingId, setEditingId] = useState<string | null>(null);

  function load() {
    fetch("/api/services?all=true")
      .then((r) => r.json())
      .then((d) => setServices(d.services || []))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (hasPro) load();
    else setLoading(false);
  }, [hasPro]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/services", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        basePrice: form.basePrice,
        durationMinutes: form.durationMinutes,
      }),
    });
    setForm((f) => ({ ...f, name: "", basePrice: 150 }));
    load();
  }

  async function addAddOn(serviceId: string) {
    const service = services.find((s) => s._id === serviceId);
    if (!service || !form.addOnName) return;
    const addOns = [
      ...service.addOns,
      { name: form.addOnName, price: form.addOnPrice, active: true },
    ];
    await fetch(`/api/services/${serviceId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ addOns }),
    });
    setForm((f) => ({ ...f, addOnName: "" }));
    load();
  }

  async function updatePrice(serviceId: string, basePrice: number) {
    await fetch(`/api/services/${serviceId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ basePrice }),
    });
    load();
  }

  async function moveService(index: number, direction: -1 | 1) {
    const next = [...services];
    const j = index + direction;
    if (j < 0 || j >= next.length) return;
    [next[index], next[j]] = [next[j], next[index]];
    await fetch("/api/services/reorder", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderedIds: next.map((s) => s._id) }),
    });
    setServices(next);
  }

  if (!hasSubscription) {
    return (
      <div>
        <h1 className="text-2xl font-bold">מחירון שירותים</h1>
        <SubscriptionGate className="mt-6" />
      </div>
    );
  }

  if (!hasPro) {
    return (
      <div>
        <h1 className="text-2xl font-bold">מחירון שירותים</h1>
        <SubscriptionGate
          className="mt-6"
          title="מחירון — מנוי Pro"
          description="שדרגי ל-Pro כדי לנהל מחירון, תוספות ותשלומים."
        />
      </div>
    );
  }

  if (loading) return <p className="text-gray-500">טוען...</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold">מחירון שירותים</h1>
      <p className="mt-1 text-gray-500">נהלי שירותים, תוספות ומחירים — מתעדכן מיידית בהזמנות ובתורים</p>

      <form onSubmit={handleAdd} className="card mt-6 grid gap-4 sm:grid-cols-4">
        <Input label="שם שירות" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        <Input label="מחיר בסיס (₪)" type="number" value={form.basePrice} onChange={(e) => setForm({ ...form, basePrice: Number(e.target.value) })} />
        <Input label="משך (דקות)" type="number" value={form.durationMinutes} onChange={(e) => setForm({ ...form, durationMinutes: Number(e.target.value) })} />
        <div className="flex items-end">
          <Button type="submit" className="w-full">+ הוספת שירות</Button>
        </div>
      </form>

      <div className="mt-8 space-y-4">
        {services.map((service, index) => (
          <div key={service._id} className="card">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold">{service.name}</h3>
                <p className="text-sm text-gray-500">{service.durationMinutes} דקות</p>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={service.basePrice}
                  onChange={(e) =>
                    setServices((prev) =>
                      prev.map((s) =>
                        s._id === service._id ? { ...s, basePrice: Number(e.target.value) } : s
                      )
                    )
                  }
                  className="w-24"
                />
                <Button variant="secondary" onClick={() => updatePrice(service._id, service.basePrice)}>
                  שמירת מחיר
                </Button>
                <Button variant="secondary" onClick={() => moveService(index, -1)}>↑</Button>
                <Button variant="secondary" onClick={() => moveService(index, 1)}>↓</Button>
              </div>
            </div>

            {service.addOns.length > 0 && (
              <ul className="mt-3 space-y-1 text-sm">
                {service.addOns.map((a) => (
                  <li key={a._id} className="flex justify-between rounded-lg bg-gray-50 px-3 py-1.5">
                    <span>+ {a.name}</span>
                    <span>₪{a.price}</span>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-3 flex flex-wrap gap-2">
              <Input
                placeholder="שם תוספת"
                value={editingId === service._id ? form.addOnName : ""}
                onFocus={() => setEditingId(service._id)}
                onChange={(e) => setForm({ ...form, addOnName: e.target.value })}
                className="max-w-[160px]"
              />
              <Input
                type="number"
                placeholder="מחיר"
                value={editingId === service._id ? form.addOnPrice : 20}
                onFocus={() => setEditingId(service._id)}
                onChange={(e) => setForm({ ...form, addOnPrice: Number(e.target.value) })}
                className="w-20"
              />
              <Button variant="secondary" onClick={() => addAddOn(service._id)}>
                + תוספת
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
