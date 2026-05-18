import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import { requireAuthFromRequest } from "@/lib/api-auth";
import { canAccess } from "@/lib/subscription";
import { Appointment } from "@/models/Appointment";
import { assertSlotAvailable, SchedulingConflictError } from "@/lib/scheduling";
import { resolveServiceDuration } from "@/lib/service-duration";

const schema = z.object({
  date: z.string(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuthFromRequest(request);
  if (auth instanceof NextResponse) return auth;
  if (!canAccess(auth.user.subscriptionTier, "appointments")) {
    return NextResponse.json({ error: "Pro required" }, { status: 403 });
  }

  const { id } = await params;
  await connectDB();

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const appointment = await Appointment.findOne({
    _id: id,
    userId: auth.user.id,
    status: "scheduled",
  });
  if (!appointment) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const newDate = new Date(parsed.data.date);
  const duration = appointment.durationMinutes ||
    (await resolveServiceDuration(auth.user.id, appointment.serviceId?.toString()));

  try {
    await assertSlotAvailable(auth.user.id, newDate, duration, appointment._id.toString());
  } catch (e) {
    if (e instanceof SchedulingConflictError) {
      return NextResponse.json({ error: e.message }, { status: 409 });
    }
    throw e;
  }

  appointment.date = newDate;
  await appointment.save();

  return NextResponse.json({
    appointment: {
      _id: appointment._id.toString(),
      date: appointment.date,
    },
  });
}
