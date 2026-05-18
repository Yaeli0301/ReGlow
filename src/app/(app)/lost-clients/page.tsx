"use client";

import { useEffect, useState } from "react";
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
  status: ClientStatus;
  optIn: boolean;
}

export default function LostClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    fetch("/api/clients?status=lost")
      .then(async (res) => {
        if (res.status === 403) {
          setLocked(true);
          return { clients: [] };
        }
        return res.json();
      })
      .then((data) => setClients(data.clients || []))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-gray-500">Loading...</p>;

  if (locked) {
    return (
      <div className="card max-w-lg text-center">
        <h1 className="text-xl font-bold">Pro plan required</h1>
        <p className="mt-2 text-gray-600">Upgrade to access the lost clients engine</p>
        <a href="/billing" className="btn-primary mt-4 inline-block">
          Upgrade to Pro
        </a>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-red-600">Clients you are losing money on</h1>
      <p className="mt-1 text-gray-500">These clients haven&apos;t returned in 30+ days</p>

      {clients.length === 0 ? (
        <div className="card mt-8 text-center text-gray-500">
          <p>No lost clients — you&apos;re doing great! 🎉</p>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {clients.map((client) => (
            <div
              key={client._id}
              className="card flex flex-wrap items-center justify-between gap-3 border-red-100 bg-red-50/40"
            >
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{client.name}</p>
                  <OptInBadge optIn={client.optIn} />
                </div>
                <p className="text-sm text-gray-500">{client.phone}</p>
                {client.lastVisitDate && (
                  <p className="text-xs text-red-500">
                    Last visit: {new Date(client.lastVisitDate).toLocaleDateString()}
                  </p>
                )}
              </div>
              <WhatsAppButton
                phone={client.phone}
                message={WHATSAPP_TEMPLATES.winBack}
                optIn={client.optIn}
                lastMessageSentDate={client.lastMessageSentDate}
                label="Send reactivation WhatsApp message"
              />
            </div>
          ))}
        </div>
      )}

      <div className="card mt-8 border-brand-100 bg-brand-50/50">
        <p className="text-sm text-gray-600">
          <strong>Automated reactivation:</strong> Runs daily for opted-in clients only, inactive
          30+ days, max once per 7 days.
        </p>
      </div>
    </div>
  );
}
