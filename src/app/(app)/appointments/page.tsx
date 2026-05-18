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
import { he } from "date-fns/locale";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { SubscriptionGate } from "@/components/billing/SubscriptionGate";
import { useAppUser } from "@/contexts/AppUserContext";
import { useT } from "@/contexts/LanguageContext";
import { canAccess } from "@/lib/subscription";
import { PaymentCheckoutModal } from "@/components/payments/PaymentCheckoutModal";

interface Client {
  _id: string;
  name: string;
}

interface AppointmentClient {
  _id: string;
  name: string;
  phone?: string;
}

interface Appointment {
  _id: string;
  clientId: AppointmentClient | null;
  date: string;
  status: "scheduled" | "completed" | "canceled";
  serviceName?: string;
}

function clientName(appt: Appointment): string {
  return appt.clientId?.name || "—";
}

export default function AppointmentsPage() {
  const t = useT();
  const user = useAppUser();
  const hasPro = canAccess(user.subscriptionTier, "appointments");

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [viewMode, setViewMode] = useState<"week" | "month">("week");
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 0 }));
  const [monthDate, setMonthDate] = useState(startOfMonth(new Date()));
  const [showForm, setShowForm] = useState(false);
  const [checkoutAppt, setCheckoutAppt] = useState<{
    id: string;
    clientName: string;
    serviceName?: string;
  } | null>(null);
  const [clientMode, setClientMode] = useState<"existing" | "new">("new");
  const [form, setForm] = useState({
    clientId: "",
    clientName: "",
    clientPhone: "",
    date: format(new Date(), "yyyy-MM-dd"),
    time: "10:00",
    serviceName: "",
    status: "scheduled" as const,
  });

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  function load() {
    if (!hasPro) {
      setLoading(false);
      return;
    }

    setLoadError(false);
    const from =
      viewMode === "week"
        ? weekStart.toISOString()
        : startOfMonth(monthDate).toISOString();
    const to =
      viewMode === "week"
        ? addDays(weekStart, 7).toISOString()
        : endOfMonth(monthDate).toISOString();

    Promise.all([
      fetch(`/api/appointments?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`),
      fetch("/api/clients"),
    ])
      .then(async ([apptRes, clientRes]) => {
        if (apptRes.status === 403) {
          setAppointments([]);
          return;
        }
        if (!apptRes.ok) {
          throw new Error("appointments failed");
        }
        const apptData = await apptRes.json();
        const clientData = clientRes.ok ? await clientRes.json() : { clients: [] };
        setAppointments(apptData.appointments || []);
        setClients(clientData.clients || []);
      })
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    setLoading(true);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekStart, monthDate, viewMode, hasPro]);

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

    const res = await fetch("/api/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) return;

    setShowForm(false);
    load();
  }

  async function cancelAppointment(id: string) {
    const res = await fetch(`/api/appointments/${id}/cancel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notifyClient: true }),
    });
    if (!res.ok) return;
    const data = await res.json();
    if (data.notification?.url) {
      window.open(data.notification.url, "_blank");
    }
    load();
  }

  function openCheckout(appt: Appointment) {
    setCheckoutAppt({
      id: appt._id,
      clientName: clientName(appt),
      serviceName: appt.serviceName,
    });
  }

  function appointmentsForDay(day: Date) {
    return appointments.filter((a) => isSameDay(new Date(a.date), day));
  }

  if (!hasPro) {
    return (
      <div>
        <h1 className="text-2xl font-bold">{t("appointments.title")}</h1>
        <SubscriptionGate
          className="mt-6"
          title={t("appointments.proRequiredTitle")}
          description={t("appointments.proRequiredDesc")}
        />
      </div>
    );
  }

  if (loading) {
    return <p className="text-gray-500">{t("common.loading")}</p>;
  }

  if (loadError) {
    return (
      <div className="card max-w-lg text-center">
        <p className="text-red-600">{t("appointments.loadError")}</p>
        <Button className="mt-4" onClick={() => load()}>
          {t("common.retry")}
        </Button>
      </div>
    );
  }

  return (
    <div>
      <PaymentCheckoutModal
        open={!!checkoutAppt}
        appointmentId={checkoutAppt?.id || ""}
        clientName={checkoutAppt?.clientName || ""}
        defaultServiceName={checkoutAppt?.serviceName}
        onClose={() => setCheckoutAppt(null)}
        onComplete={() => load()}
      />
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t("appointments.title")}</h1>
          <p className="text-gray-500">
            {viewMode === "week"
              ? `${t("appointments.week")} ${format(weekStart, "d/M", { locale: he })}`
              : format(monthDate, "MMMM yyyy", { locale: he })}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setViewMode("week")}
            className={`rounded-lg px-3 py-1.5 text-sm ${viewMode === "week" ? "bg-brand-500 text-white" : "bg-brand-50"}`}
          >
            {t("appointments.week")}
          </button>
          <button
            type="button"
            onClick={() => setViewMode("month")}
            className={`rounded-lg px-3 py-1.5 text-sm ${viewMode === "month" ? "bg-brand-500 text-white" : "bg-brand-50"}`}
          >
            {t("appointments.month")}
          </button>
          {viewMode === "week" && (
            <>
              <Button variant="secondary" onClick={() => setWeekStart(addDays(weekStart, -7))}>
                ←
              </Button>
              <Button
                variant="secondary"
                onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 0 }))}
              >
                {t("appointments.today")}
              </Button>
              <Button variant="secondary" onClick={() => setWeekStart(addDays(weekStart, 7))}>
                →
              </Button>
            </>
          )}
          <Button onClick={() => setShowForm(true)}>+ {t("appointments.newAppointment")}</Button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="card mt-6 space-y-4">
          <h2 className="font-semibold">{t("appointments.newAppointment")}</h2>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setClientMode("new")}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                clientMode === "new" ? "bg-brand-500 text-white" : "bg-brand-50 text-brand-700"
              }`}
            >
              {t("appointments.newClient")}
            </button>
            <button
              type="button"
              onClick={() => setClientMode("existing")}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                clientMode === "existing" ? "bg-brand-500 text-white" : "bg-brand-50 text-brand-700"
              }`}
            >
              {t("appointments.existingClient")}
            </button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {clientMode === "existing" ? (
              <div>
                <label className="label">{t("appointments.client")}</label>
                <select
                  className="input"
                  value={form.clientId}
                  onChange={(e) => setForm({ ...form, clientId: e.target.value })}
                  required
                >
                  <option value="">{t("appointments.selectClient")}</option>
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
                  label={t("appointments.client")}
                  value={form.clientName}
                  onChange={(e) => setForm({ ...form, clientName: e.target.value })}
                  required
                />
                <Input
                  label={t("appointments.phone")}
                  value={form.clientPhone}
                  onChange={(e) => setForm({ ...form, clientPhone: e.target.value })}
                  required
                />
              </>
            )}
            <Input
              label={t("appointments.service")}
              value={form.serviceName}
              onChange={(e) => setForm({ ...form, serviceName: e.target.value })}
            />
            <Input
              label={t("appointments.date")}
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              required
            />
            <Input
              label={t("appointments.time")}
              type="time"
              value={form.time}
              onChange={(e) => setForm({ ...form, time: e.target.value })}
              required
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit">{t("appointments.create")}</Button>
            <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>
              {t("common.cancel")}
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
            <span className="font-semibold">{format(monthDate, "MMMM yyyy", { locale: he })}</span>
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
              end: addDays(startOfWeek(endOfMonth(monthDate), { weekStartsOn: 0 }), 6),
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
                      {dayAppts.length}
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
              <p className="text-xs font-semibold text-brand-600">
                {format(day, "EEE", { locale: he })}
              </p>
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
                    <p className="truncate font-medium">{clientName(appt)}</p>
                    <p>{format(new Date(appt.date), "HH:mm")}</p>
                    {appt.status === "scheduled" && (
                      <div className="mt-1 flex gap-1">
                        <button
                          type="button"
                          className="text-[10px] underline"
                          onClick={() => openCheckout(appt)}
                        >
                          {t("appointments.done")}
                        </button>
                        <button
                          type="button"
                          className="text-[10px] underline"
                          onClick={() => cancelAppointment(appt._id)}
                        >
                          {t("appointments.cancel")}
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
