import { Types } from "mongoose";
import { Client, type IClient } from "@/models/Client";
import { Appointment } from "@/models/Appointment";
import { computeClientStatus } from "@/lib/client-status";
import { normalizePhone, formatPhoneDisplay } from "@/lib/phone";

export interface UpsertClientInput {
  userId: string | Types.ObjectId;
  name: string;
  phone: string;
  lastVisitDate?: Date;
  optIn?: boolean;
  notes?: string;
}

function maxDate(a?: Date | null, b?: Date | null): Date | undefined {
  if (!a) return b ?? undefined;
  if (!b) return a;
  return a > b ? a : b;
}

/**
 * Merge duplicate clients (same normalized phone per business).
 * Keeps the preferred client or the most recently updated; preserves latest lastVisitDate.
 */
export async function mergeDuplicateClients(
  userId: string | Types.ObjectId,
  phoneNormalized: string,
  preferredId?: Types.ObjectId | string
): Promise<IClient | null> {
  const duplicates = await Client.find({ userId, phoneNormalized }).sort({ updatedAt: -1 });

  if (duplicates.length <= 1) {
    return duplicates[0] ?? null;
  }

  let keeper =
    (preferredId && duplicates.find((c) => c._id.toString() === preferredId.toString())) ||
    duplicates[0];

  const toMerge = duplicates.filter((c) => c._id.toString() !== keeper._id.toString());

  for (const dup of toMerge) {
    keeper.lastVisitDate = maxDate(keeper.lastVisitDate, dup.lastVisitDate);
    keeper.optIn = keeper.optIn || dup.optIn;

    if (dup.lastMessageSentDate) {
      if (
        !keeper.lastMessageSentDate ||
        dup.lastMessageSentDate > keeper.lastMessageSentDate
      ) {
        keeper.lastMessageSentDate = dup.lastMessageSentDate;
      }
    }

    if (dup.notes && dup.notes !== keeper.notes) {
      keeper.notes = [keeper.notes, dup.notes].filter(Boolean).join(" | ");
    }

    await Appointment.updateMany({ clientId: dup._id }, { clientId: keeper._id });
    await Client.deleteOne({ _id: dup._id });
  }

  keeper.status = computeClientStatus(keeper.lastVisitDate);
  await keeper.save();

  return keeper;
}

/**
 * Find or create client by phone. Used for bookings and appointments.
 */
export async function upsertClientByPhone(input: UpsertClientInput): Promise<IClient> {
  const phoneNormalized = normalizePhone(input.phone);
  const displayPhone = formatPhoneDisplay(input.phone);

  let client = await Client.findOne({
    userId: input.userId,
    phoneNormalized,
  });

  if (!client) {
    client = await Client.create({
      userId: input.userId,
      name: input.name.trim(),
      phone: displayPhone,
      phoneNormalized,
      lastVisitDate: input.lastVisitDate,
      optIn: input.optIn ?? false,
      notes: input.notes ?? "",
      status: computeClientStatus(input.lastVisitDate),
    });
  } else {
    client.name = input.name.trim();
    client.phone = displayPhone;
    if (input.lastVisitDate) {
      client.lastVisitDate = maxDate(client.lastVisitDate, input.lastVisitDate);
    }
    if (input.optIn === true) {
      client.optIn = true;
    }
    if (input.notes) {
      client.notes = input.notes;
    }
    client.status = computeClientStatus(client.lastVisitDate);
    await client.save();
  }

  return (await mergeDuplicateClients(input.userId, phoneNormalized, client._id)) ?? client;
}

/** Manual add — opt-in stays false until client books with consent. */
export async function createManualClient(input: UpsertClientInput): Promise<IClient> {
  const phoneNormalized = normalizePhone(input.phone);

  const existing = await Client.findOne({ userId: input.userId, phoneNormalized });
  if (existing) {
    existing.name = input.name.trim();
    existing.phone = formatPhoneDisplay(input.phone);
    if (input.notes) existing.notes = input.notes;
    await existing.save();
    return (await mergeDuplicateClients(input.userId, phoneNormalized, existing._id)) ?? existing;
  }

  const client = await Client.create({
    userId: input.userId,
    name: input.name.trim(),
    phone: formatPhoneDisplay(input.phone),
    phoneNormalized,
    notes: input.notes ?? "",
    optIn: false,
    status: "active",
  });

  return (await mergeDuplicateClients(input.userId, phoneNormalized, client._id)) ?? client;
}
