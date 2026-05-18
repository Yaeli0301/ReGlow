import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import { Appointment } from "@/models/Appointment";
import { Client } from "@/models/Client";
import { User } from "@/models/User";
import { getNearestAvailableSlots, assertSlotAvailable, SchedulingConflictError } from "@/lib/scheduling";
import { resolveServiceDuration } from "@/lib/service-duration";
import { getAvailableSlots } from "@/lib/availability";
import { resetClientRetention } from "@/lib/retention-engine";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  await connectDB();
  const { token } = await params;

  const appointment = await Appointment.findOne({
    rescheduleToken: token,
    status: "scheduled",
  });
  if (!appointment) {
    return NextResponse.json({ error: "Invalid or expired link" }, { status: 404 });
  }

  const [client, owner] = await Promise.all([
    Client.findById(appointment.clientId).select("name"),
    User.findById(appointment.userId).select("businessName"),
  ]);

  const duration =
    appointment.durationMinutes ||
    (await resolveServiceDuration(appointment.userId.toString(), appointment.serviceId?.toString()));

  const alternatives = await getNearestAvailableSlots(
    appointment.userId.toString(),
    appointment.date,
    duration,
    3,
    appointment.serviceId?.toString()
  );

  return NextResponse.json({
    businessName: owner?.businessName,
    clientName: client?.name,
    currentDate: appointment.date,
    serviceName: appointment.serviceName,
    alternatives: alternatives.map((s) => ({
      start: s.start.toISOString(),
      label: s.label,
    })),
  });
}

const postSchema = z.object({
  slotStart: z.string(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  await connectDB();
  const { token } = await params;

  const appointment = await Appointment.findOne({
    rescheduleToken: token,
    status: "scheduled",
  });
  if (!appointment) {
    return NextResponse.json({ error: "Invalid or expired link" }, { status: 404 });
  }

  const parsed = postSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const newDate = new Date(parsed.data.slotStart);
  const userId = appointment.userId.toString();
  const duration =
    appointment.durationMinutes ||
    (await resolveServiceDuration(userId, appointment.serviceId?.toString()));

  const slots = await getAvailableSlots(userId, newDate, {
    slotDurationMinutes: duration,
    excludeAppointmentId: appointment._id.toString(),
  });

  const valid = slots.some((s) => Math.abs(s.start.getTime() - newDate.getTime()) < 60_000);
  if (!valid) {
    return NextResponse.json({ error: "Slot no longer available" }, { status: 409 });
  }

  try {
    await assertSlotAvailable(userId, newDate, duration, appointment._id.toString());
  } catch (e) {
    if (e instanceof SchedulingConflictError) {
      return NextResponse.json({ error: e.message }, { status: 409 });
    }
    throw e;
  }

  appointment.date = newDate;
  await appointment.save();
  await resetClientRetention(appointment.clientId.toString());

  return NextResponse.json({ success: true, date: appointment.date });
}
