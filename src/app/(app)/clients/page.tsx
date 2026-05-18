"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { OptInBadge } from "@/components/clients/OptInBadge";
import { WhatsAppButton } from "@/components/clients/WhatsAppButton";
import { WHATSAPP_TEMPLATES } from "@/lib/whatsapp";
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
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", phone: "", notes: "" });
  const [error, setError] = useState("");

  function loadClients() {
    fetch("/api/clients")
      .then((res) => res.json())
      .then((data) => setClients(data.clients || []))
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

  function startEdit(client: Client) {
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
    setError("");

    const url = editingId ? `/api/clients/${editingId}` : "/api/clients";
    const method = editingId ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Failed to save");
      return;
    }

    resetForm();
    loadClients();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this client?")) return;
    await fetch(`/api/clients/${id}`, { method: "DELETE" });
    loadClients();
  }

  if (loading) return <p className="text-gray-500">Loading clients...</p>;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Clients</h1>
          <p className="text-gray-500">
            {clients.length} total · grows automatically from bookings
          </p>
        </div>
        <Button onClick={() => { resetForm(); setShowForm(true); }}>+ Add client</Button>
      </div>

      <p className="mt-2 text-sm text-gray-500">
        No setup needed — clients are created when they book, or you can add them manually.
      </p>

      {showForm && (
        <form onSubmit={handleSubmit} className="card mt-6 space-y-4">
          <h2 className="font-semibold">{editingId ? "Edit client" : "Add client (optional)"}</h2>
          <p className="text-xs text-gray-500">Only name and phone required. Visit dates update from appointments.</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <Input label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
            <Input
              label="Notes (optional)"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="sm:col-span-2"
            />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex gap-2">
            <Button type="submit">Save</Button>
            <Button type="button" variant="secondary" onClick={resetForm}>
              Cancel
            </Button>
          </div>
        </form>
      )}

      {clients.length === 0 ? (
        <div className="card mt-8 text-center text-gray-500">
          <p>Start by adding your first client</p>
          <p className="mt-2 text-sm">Or share your booking link — clients will appear automatically</p>
          <Button className="mt-4" onClick={() => setShowForm(true)}>
            + Add client
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
                {client.lastVisitDate && (
                  <p className="text-xs text-gray-400">
                    Last visit: {new Date(client.lastVisitDate).toLocaleDateString()}
                  </p>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <WhatsAppButton
                  phone={client.phone}
                  message={WHATSAPP_TEMPLATES.reEngagement}
                  optIn={client.optIn}
                  lastMessageSentDate={client.lastMessageSentDate}
                />
                <Button variant="secondary" onClick={() => startEdit(client)}>
                  Edit
                </Button>
                <Button variant="danger" onClick={() => handleDelete(client._id)}>
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

