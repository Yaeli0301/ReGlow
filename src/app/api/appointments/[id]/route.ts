import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthFromRequest } from "@/lib/api-auth";
import { canAccess } from "@/lib/subscription";
import { Appointment } from "@/models/Appointment";
import { Client } from "@/models/Client";
import { computeClientStatus } from "@/lib/client-status";

const updateSchema = z.object({
  date: z.string().optional(),
  status: z.enum(["scheduled", "completed", "canceled"]).optional(),
  serviceName: z.string().optional(),
  notes: z.string().optional(),
});

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuthFromRequest(request);
  if (auth instanceof NextResponse) return auth;

  if (!canAccess(auth.user.subscriptionTier, "appointments")) {
    return NextResponse.json({ error: "Pro plan required" }, { status: 403 });
  }

  const { id } = await params;

  try {
    const body = await request.json();
    const parsed = updateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const appointment = await Appointment.findOne({ _id: id, userId: auth.user.id });
    if (!appointment) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }

    if (parsed.data.date) appointment.date = new Date(parsed.data.date);
    if (parsed.data.status) appointment.status = parsed.data.status;
    if (parsed.data.serviceName !== undefined) appointment.serviceName = parsed.data.serviceName;
    if (parsed.data.notes !== undefined) appointment.notes = parsed.data.notes;

    await appointment.save();

    if (appointment.status === "completed") {
      const client = await Client.findById(appointment.clientId);
      if (client) {
        client.lastVisitDate = appointment.date;
        client.status = computeClientStatus(client.lastVisitDate);
        await client.save();
      }
    }

    return NextResponse.json({ appointment });
  } catch (error) {
    console.error("Update appointment error:", error);
    return NextResponse.json({ error: "Failed to update appointment" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuthFromRequest(request);
  if (auth instanceof NextResponse) return auth;

  if (!canAccess(auth.user.subscriptionTier, "appointments")) {
    return NextResponse.json({ error: "Pro plan required" }, { status: 403 });
  }

  const { id } = await params;

  const result = await Appointment.findOneAndDelete({ _id: id, userId: auth.user.id });

  if (!result) {
    return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
