"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { OptInBadge } from "@/components/clients/OptInBadge";
import { WhatsAppButton } from "@/components/clients/WhatsAppButton";
import { SubscriptionGate } from "@/components/billing/SubscriptionGate";
import { WHATSAPP_TEMPLATES } from "@/lib/whatsapp";
import { useHasSubscription } from "@/contexts/AppUserContext";
import { useT } from "@/contexts/LanguageContext";
import type { ClientStatus } from "@/types";

interface Client {
  _id: string;
  name: string;
  phone: string;
  lastVisitDate?: string;
  lastMessageSentDate?: string;
  notes?: string;
  status: ClientStatus;
  optIn: boolean;
}

export default function ClientsPage() {
  const t = useT();
  const hasSubscription = useHasSubscription();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [needsSubscription, setNeedsSubscription] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", phone: "", notes: "" });
  const [error, setError] = useState("");

  function loadClients() {
    setLoadError(false);
    fetch("/api/clients")
      .then(async (res) => {
        if (res.status === 403) {
          setNeedsSubscription(true);
          return { clients: [] };
        }
        if (!res.ok) throw new Error("clients fetch failed");
        return res.json();
      })
      .then((data) => setClients(data.clients || []))
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadClients();
  }, []);

  function resetForm() {
    setForm({ name: "", phone: "", notes: "" });
    setEditingId(null);
    setShowForm(false);
    setError("");
  }

  function openAddForm() {
    if (!hasSubscription) return;
    resetForm();
    setShowForm(true);
  }

  function startEdit(client: Client) {
    if (!hasSubscription) return;
    setForm({
      name: client.name,
      phone: client.phone,
      notes: client.notes || "",
    });
    setEditingId(client._id);
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!hasSubscription) return;
    setError("");

    const url = editingId ? `/api/clients/${editingId}` : "/api/clients";
    const method = editingId ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const data = await res.json();

    if (!res.ok) {
      if (data.code === "SUBSCRIPTION_REQUIRED") {
        setNeedsSubscription(true);
      }
      setError(data.error || t("clients.saveFailed"));
      return;
    }

    resetForm();
    loadClients();
  }

  async function handleDelete(id: string) {
    if (!hasSubscription) return;
    if (!confirm(t("clients.deleteConfirm"))) return;
    await fetch(`/api/clients/${id}`, { method: "DELETE" });
    loadClients();
  }

  if (loading) return <p className="text-gray-500">{t("common.loading")}</p>;

  if (loadError) {
    return (
      <div className="card max-w-lg text-center">
        <p className="text-red-600">{t("common.error")}</p>
        <Button className="mt-4" onClick={loadClients}>
          {t("common.retry")}
        </Button>
      </div>
    );
  }

  if (needsSubscription || !hasSubscription) {
    return (
      <div>
        <h1 className="text-2xl font-bold">{t("clients.title")}</h1>
        <SubscriptionGate className="mt-6" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t("clients.title")}</h1>
          <p className="text-gray-500">{clients.length} {t("clients.totalLabel")}</p>
        </div>
        <Button onClick={openAddForm}>+ {t("clients.addClient")}</Button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="card mt-6 space-y-4">
          <h2 className="font-semibold">
            {editingId ? t("clients.editClient") : t("clients.addClient")}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label={t("clients.name")}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
            <Input
              label={t("clients.phone")}
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              required
            />
            <Input
              label={t("clients.notes")}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="sm:col-span-2"
            />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex gap-2">
            <Button type="submit">{t("common.save")}</Button>
            <Button type="button" variant="secondary" onClick={resetForm}>
              {t("common.cancel")}
            </Button>
          </div>
        </form>
      )}

      {clients.length === 0 ? (
        <div className="card mt-8 text-center text-gray-500">
          <p>{t("clients.noClients")}</p>
          <Button className="mt-4" onClick={openAddForm}>
            + {t("clients.addClient")}
          </Button>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {clients.map((client) => (
            <div key={client._id} className="card flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{client.name}</p>
                  <StatusBadge status={client.status} />
                  <OptInBadge optIn={client.optIn} />
                </div>
                <p className="text-sm text-gray-500">{client.phone}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <WhatsAppButton
                  phone={client.phone}
                  message={WHATSAPP_TEMPLATES.reEngagement}
                  optIn={client.optIn}
                  lastMessageSentDate={client.lastMessageSentDate}
                />
                <Button variant="secondary" onClick={() => startEdit(client)}>
                  {t("common.edit")}
                </Button>
                <Button variant="danger" onClick={() => handleDelete(client._id)}>
                  {t("common.delete")}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
