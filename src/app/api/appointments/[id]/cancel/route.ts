import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import { requireAuthFromRequest } from "@/lib/api-auth";
import { canAccess } from "@/lib/subscription";
import { Appointment } from "@/models/Appointment";
import { Client } from "@/models/Client";
import { User } from "@/models/User";
import { buildCancellationWhatsApp } from "@/lib/notifications";
import { logger } from "@/lib/logger";

const schema = z.object({
  reason: z.string().optional(),
  notifyClient: z.boolean().default(true),
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

  const body = await request.json().catch(() => ({}));
  const parsed = schema.safeParse(body);

  const appointment = await Appointment.findOne({ _id: id, userId: auth.user.id });
  if (!appointment) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  appointment.status = "canceled";
  appointment.canceledAt = new Date();
  appointment.cancelReason = parsed.success ? parsed.data.reason : undefined;
  await appointment.save();

  logger.info("Appointment canceled", {
    userId: auth.user.id,
    appointmentId: id,
    hasReason: Boolean(appointment.cancelReason),
  });

  let notification = null;
  if (parsed.success && parsed.data.notifyClient) {
    const [client, owner] = await Promise.all([
      Client.findById(appointment.clientId),
      User.findById(auth.user.id).select("businessName"),
    ]);
    if (client?.optIn) {
      notification = await buildCancellationWhatsApp({
        userId: auth.user.id,
        clientPhone: client.phone,
        businessName: owner?.businessName || "הסלון",
        appointmentDate: appointment.date,
        serviceName: appointment.serviceName,
        serviceId: appointment.serviceId?.toString(),
      });
    }
  }

  return NextResponse.json({
    appointment: { _id: appointment._id.toString(), status: appointment.status },
    notification,
  });
}
