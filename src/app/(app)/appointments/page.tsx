"use client";

import { useEffect, useState } from "react";
import {
  format,
  startOfWeek,
  addDays,
  isSameDay,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  addMonths,
  subMonths,
  isSameMonth,
  isToday,
} from "date-fns";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

interface Client {
  _id: string;
  name: string;
}

interface Appointment {
  _id: string;
  clientId: { _id: string; name: string; phone?: string };
  date: string;
  status: "scheduled" | "completed" | "canceled";
  serviceName?: string;
}

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [locked, setLocked] = useState(false);
  const [viewMode, setViewMode] = useState<"week" | "month">("week");
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 0 }));
  const [monthDate, setMonthDate] = useState(startOfMonth(new Date()));
  const [showForm, setShowForm] = useState(false);
  const [clientMode, setClientMode] = useState<"existing" | "new">("new");
  const [form, setForm] = useState({
    clientId: "",
    clientName: "",
    clientPhone: "",
    date: "",
    time: "10:00",
    serviceName: "",
    status: "scheduled" as const,
  });

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  function load() {
    const from =
      viewMode === "week"
        ? weekStart.toISOString()
        : startOfMonth(monthDate).toISOString();
    const to =
      viewMode === "week"
        ? addDays(weekStart, 7).toISOString()
        : endOfMonth(monthDate).toISOString();

    Promise.all([
      fetch(`/api/appointments?from=${from}&to=${to}`),
      fetch("/api/clients"),
    ])
      .then(async ([apptRes, clientRes]) => {
        if (apptRes.status === 403) {
          setLocked(true);
          return;
        }
        const apptData = await apptRes.json();
        const clientData = await clientRes.json();
        setAppointments(apptData.appointments || []);
        setClients(clientData.clients || []);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekStart, monthDate, viewMode]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const dateTime = new Date(`${form.date}T${form.time}`);

    const payload =
      clientMode === "existing"
        ? {
            clientId: form.clientId,
            date: dateTime.toISOString(),
            serviceName: form.serviceName,
            status: form.status,
          }
        : {
            name: form.clientName,
            phone: form.clientPhone,
            date: dateTime.toISOString(),
            serviceName: form.serviceName,
            status: form.status,
          };

    await fetch("/api/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setShowForm(false);
    load();
  }

  async function updateStatus(id: string, status: "completed" | "canceled") {
    await fetch(`/api/appointments/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    load();
  }

  function appointmentsForDay(day: Date) {
    return appointments.filter((a) => isSameDay(new Date(a.date), day));
  }

  if (loading) return <p className="text-gray-500">Loading calendar...</p>;

  if (locked) {
    return (
      <div className="card max-w-lg text-center">
        <h1 className="text-xl font-bold">Pro plan required</h1>
        <p className="mt-2 text-gray-600">Upgrade to manage appointments</p>
        <a href="/billing" className="btn-primary mt-4 inline-block">
          Upgrade to Pro
        </a>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">יומן תורים</h1>
          <p className="text-gray-500">
            {viewMode === "week" ? `שבוע ${format(weekStart, "d/M")}` : format(monthDate, "MMMM yyyy")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setViewMode("week")}
            className={`rounded-lg px-3 py-1.5 text-sm ${viewMode === "week" ? "bg-brand-500 text-white" : "bg-brand-50"}`}
          >
            שבוע
          </button>
          <button
            type="button"
            onClick={() => setViewMode("month")}
            className={`rounded-lg px-3 py-1.5 text-sm ${viewMode === "month" ? "bg-brand-500 text-white" : "bg-brand-50"}`}
          >
            חודש
          </button>
          <Button variant="secondary" onClick={() => setWeekStart(addDays(weekStart, -7))}>
            ←
          </Button>
          <Button variant="secondary" onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 0 }))}>
            Today
          </Button>
          <Button variant="secondary" onClick={() => setWeekStart(addDays(weekStart, 7))}>
            Next →
          </Button>
          <Button onClick={() => setShowForm(true)}>+ New</Button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="card mt-6 space-y-4">
          <h2 className="font-semibold">New appointment</h2>
          <p className="text-xs text-gray-500">New clients are created automatically from phone number.</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setClientMode("new")}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                clientMode === "new" ? "bg-brand-500 text-white" : "bg-brand-50 text-brand-700"
              }`}
            >
              New client
            </button>
            <button
              type="button"
              onClick={() => setClientMode("existing")}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                clientMode === "existing" ? "bg-brand-500 text-white" : "bg-brand-50 text-brand-700"
              }`}
            >
              Existing client
            </button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {clientMode === "existing" ? (
              <div>
                <label className="label">Client</label>
                <select
                  className="input"
                  value={form.clientId}
                  onChange={(e) => setForm({ ...form, clientId: e.target.value })}
                  required
                >
                  <option value="">Select client</option>
                  {clients.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <>
                <Input
                  label="Client name"
                  value={form.clientName}
                  onChange={(e) => setForm({ ...form, clientName: e.target.value })}
                  required
                />
                <Input
                  label="Phone"
                  value={form.clientPhone}
                  onChange={(e) => setForm({ ...form, clientPhone: e.target.value })}
                  required
                />
              </>
            )}
            <Input label="Service" value={form.serviceName} onChange={(e) => setForm({ ...form, serviceName: e.target.value })} />
            <Input label="Date" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
            <Input label="Time" type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} required />
          </div>
          <div className="flex gap-2">
            <Button type="submit">Create</Button>
            <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
          </div>
        </form>
      )}

      {viewMode === "month" && (
        <div className="card mt-6">
          <div className="mb-4 flex items-center justify-between">
            <Button variant="secondary" onClick={() => setMonthDate(subMonths(monthDate, 1))}>
              ←
            </Button>
            <span className="font-semibold">{format(monthDate, "MMMM yyyy")}</span>
            <Button variant="secondary" onClick={() => setMonthDate(addMonths(monthDate, 1))}>
              →
            </Button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-gray-500">
            {["א", "ב", "ג", "ד", "ה", "ו", "ש"].map((d) => (
              <div key={d}>{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {eachDayOfInterval({
              start: startOfWeek(startOfMonth(monthDate), { weekStartsOn: 0 }),
              end: addDays(
                startOfWeek(endOfMonth(monthDate), { weekStartsOn: 0 }),
                6
              ),
            }).map((day) => {
              const dayAppts = appointments.filter((a) => isSameDay(new Date(a.date), day));
              const inMonth = isSameMonth(day, monthDate);
              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  onClick={() => {
                    setViewMode("week");
                    setWeekStart(startOfWeek(day, { weekStartsOn: 0 }));
                  }}
                  className={`min-h-[72px] rounded-lg p-1 text-left text-xs transition ${
                    !inMonth
                      ? "bg-gray-50/50 text-gray-300"
                      : isToday(day)
                        ? "bg-brand-100 ring-1 ring-brand-400"
                        : "bg-white hover:bg-brand-50"
                  }`}
                >
                  <span className="font-medium">{format(day, "d")}</span>
                  {dayAppts.length > 0 && (
                    <span className="mt-1 block truncate rounded bg-brand-500 px-1 text-[10px] text-white">
                      {dayAppts.length} תורים
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {viewMode === "week" && (
      <div className="mt-6 grid gap-3 sm:grid-cols-7">
        {weekDays.map((day) => (
          <div key={day.toISOString()} className="card min-h-[120px] p-3">
            <p className="text-xs font-semibold text-brand-600">{format(day, "EEE")}</p>
            <p className="text-lg font-bold">{format(day, "d")}</p>
            <div className="mt-2 space-y-1">
              {appointmentsForDay(day).map((appt) => (
                <div
                  key={appt._id}
                  className={`rounded-lg p-1.5 text-xs ${
                    appt.status === "completed"
                      ? "bg-emerald-100 text-emerald-800"
                      : appt.status === "canceled"
                        ? "bg-gray-100 text-gray-500 line-through"
                        : "bg-brand-100 text-brand-800"
                  }`}
                >
                  <p className="font-medium truncate">{appt.clientId?.name}</p>
                  <p>{format(new Date(appt.date), "HH:mm")}</p>
                  {appt.status === "scheduled" && (
                    <div className="mt-1 flex gap-1">
                      <button
                        type="button"
                        className="text-[10px] underline"
                        onClick={() => updateStatus(appt._id, "completed")}
                      >
                        Done
                      </button>
                      <button
                        type="button"
                        className="text-[10px] underline"
                        onClick={() => updateStatus(appt._id, "canceled")}
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      )}
    </div>
  );
}
