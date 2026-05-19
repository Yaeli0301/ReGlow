import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import { requireAuthFromRequest, requireSubscription } from "@/lib/api-auth";
import { canAccess } from "@/lib/subscription";
import { Appointment } from "@/models/Appointment";
import { Client } from "@/models/Client";
import { computeClientStatus } from "@/lib/client-status";
import { upsertClientByPhone } from "@/lib/client-service";
import { createValidatedAppointment } from "@/lib/appointment-create";
import { resetClientRetention } from "@/lib/retention-engine";
import { SchedulingConflictError } from "@/lib/scheduling";
import { logger } from "@/lib/logger";
import { trackEvent } from "@/lib/analytics/event-tracker";

const baseFields = {
  date: z.string(),
  status: z.enum(["scheduled", "completed", "canceled"]).optional(),
  serviceId: z.string().optional(),
  serviceName: z.string().optional(),
  notes: z.string().optional(),
};

const createSchema = z.union([
  z.object({ clientId: z.string(), ...baseFields }),
  z.object({
    name: z.string().min(1),
    phone: z.string().min(5),
    ...baseFields,
  }),
]);

export async function GET(request: Request) {
  const auth = await requireAuthFromRequest(request);
  if (auth instanceof NextResponse) return auth;

  if (!canAccess(auth.user.subscriptionTier, "appointments")) {
    return NextResponse.json(
      { error: "נדרש מנוי Pro ליומן תורים", code: "PRO_REQUIRED" },
      { status: 403 }
    );
  }

  await connectDB();

  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "500", 10), 1), 1000);
  const skip = Math.max(parseInt(searchParams.get("skip") || "0", 10), 0);

  const query: Record<string, unknown> = { userId: auth.user.id };

  if (from || to) {
    query.date = {};
    if (from) (query.date as Record<string, Date>).$gte = new Date(from);
    if (to) (query.date as Record<string, Date>).$lte = new Date(to);
  }

  const appointments = await Appointment.find(query)
    .populate("clientId", "name phone optIn")
    .sort({ date: 1 })
    .skip(skip)
    .limit(limit)
    .lean();

  const serialized = appointments.map((a) => {
    const client = a.clientId as { _id?: { toString(): string }; name?: string; phone?: string } | null;
    return {
      _id: a._id.toString(),
      date: a.date,
      status: a.status,
      serviceName: a.serviceName,
      notes: a.notes,
      clientId: client?._id
        ? {
            _id: client._id.toString(),
            name: client.name || "—",
            phone: client.phone,
          }
        : null,
      serviceId: a.serviceId?.toString(),
      selectedAddOns: a.selectedAddOns || [],
      priceLineItems: a.priceLineItems || [],
      finalPrice: a.finalPrice ?? 0,
      paymentStatus: a.paymentStatus || "unpaid",
      paymentId: a.paymentId?.toString(),
    };
  });

  return NextResponse.json({ appointments: serialized });
}

export async function POST(request: Request) {
  const auth = await requireAuthFromRequest(request);
  if (auth instanceof NextResponse) return auth;

  if (!canAccess(auth.user.subscriptionTier, "appointments")) {
    return NextResponse.json({ error: "Pro plan required" }, { status: 403 });
  }

  const subError = requireSubscription(auth.user);
  if (subError) return subError;

  await connectDB();

  try {
    const body = await request.json();
    const parsed = createSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const { date, status, serviceId, serviceName, notes } = parsed.data;
    const appointmentDate = new Date(date);
    const resolvedStatus = status || "scheduled";

    let client;

    if ("clientId" in parsed.data) {
      client = await Client.findOne({ _id: parsed.data.clientId, userId: auth.user.id });
      if (!client) {
        return NextResponse.json({ error: "Client not found" }, { status: 404 });
      }
    } else {
      client = await upsertClientByPhone({
        userId: auth.user.id,
        name: parsed.data.name,
        phone: parsed.data.phone,
        lastVisitDate: resolvedStatus === "completed" ? appointmentDate : undefined,
        optIn: false,
        notes: notes || "",
      });
    }

    let appointment;
    try {
      appointment = await createValidatedAppointment({
        userId: auth.user.id,
        clientId: client._id.toString(),
        date: appointmentDate,
        serviceId,
        serviceName,
        notes,
        status: resolvedStatus,
      });
    } catch (e) {
      if (e instanceof SchedulingConflictError) {
        return NextResponse.json({ error: e.message }, { status: 409 });
      }
      throw e;
    }

    if (resolvedStatus === "completed") {
      client.lastVisitDate = appointmentDate;
      client.status = computeClientStatus(client.lastVisitDate);
      await client.save();
      await resetClientRetention(client._id.toString());
    }

    logger.info("Appointment created", {
      userId: auth.user.id,
      appointmentId: (appointment as { _id?: { toString(): string } })?._id?.toString(),
      status: resolvedStatus,
    });
    trackEvent({
      type: resolvedStatus === "completed" ? "appointment_completed" : "appointment_created",
      userId: auth.user.id,
      metadata: {
        appointmentId: (appointment as { _id?: { toString(): string } })?._id?.toString(),
        clientId: client._id.toString(),
        serviceName,
      },
    });

    return NextResponse.json({ success: true, appointment }, { status: 201 });
  } catch (error) {
    logger.error("Create appointment error", {
      userId: auth.user.id,
      err: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { success: false, error: "Failed to create appointment", code: "APPOINTMENT_CREATE_FAILED" },
      { status: 500 }
    );
  }
}
