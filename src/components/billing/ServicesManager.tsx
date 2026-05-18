"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

interface Service {
  _id: string;
  name: string;
  durationMinutes: number;
  price: number;
}

export function ServicesManager() {
  const [services, setServices] = useState<Service[]>([]);
  const [form, setForm] = useState({ name: "", durationMinutes: 60, price: 150 });

  function load() {
    fetch("/api/services")
      .then((res) => res.json())
      .then((data) => setServices(data.services || []));
  }

  useEffect(() => {
    load();
  }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/services", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setForm({ name: "", durationMinutes: 60, price: 150 });
    load();
  }

  return (
    <div className="card mt-8">
      <h3 className="font-semibold">Booking services</h3>
      <p className="mt-1 text-sm text-gray-500">Add services clients can book online</p>

      <form onSubmit={handleAdd} className="mt-4 grid gap-3 sm:grid-cols-4">
        <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        <Input
          label="Duration (min)"
          type="number"
          value={form.durationMinutes}
          onChange={(e) => setForm({ ...form, durationMinutes: Number(e.target.value) })}
          required
        />
        <Input
          label="Price (₪)"
          type="number"
          value={form.price}
          onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
          required
        />
        <div className="flex items-end">
          <Button type="submit" className="w-full">
            Add
          </Button>
        </div>
      </form>

      {services.length > 0 && (
        <ul className="mt-4 space-y-2">
          {services.map((s) => (
            <li key={s._id} className="flex justify-between rounded-lg bg-brand-50 px-3 py-2 text-sm">
              <span>{s.name}</span>
              <span className="text-gray-500">
                {s.durationMinutes} min · ₪{s.price}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
