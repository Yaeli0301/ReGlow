import { NextResponse } from "next/server";
import { z } from "zod";
import { startOfDay } from "date-fns";
import { connectDB } from "@/lib/mongodb";
import { requireAuthFromRequest } from "@/lib/api-auth";
import { canAccess } from "@/lib/subscription";
import { DateOverride } from "@/models/DateOverride";
import { Appointment } from "@/models/Appointment";
import { Client } from "@/models/Client";
import { User } from "@/models/User";
import { buildCancellationWhatsApp } from "@/lib/notifications";

const schema = z.object({
  date: z.string(),
  reason: z.string().optional(),
  notifyClients: z.boolean().default(true),
});

export async function POST(request: Request) {
  const auth = await requireAuthFromRequest(request);
  if (auth instanceof NextResponse) return auth;
  if (!canAccess(auth.user.subscriptionTier, "appointments")) {
    return NextResponse.json({ error: "Pro required" }, { status: 403 });
  }

  await connectDB();
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const day = startOfDay(new Date(parsed.data.date));

  await DateOverride.findOneAndUpdate(
    { userId: auth.user.id, date: day },
    { userId: auth.user.id, date: day, isClosed: true },
    { upsert: true }
  );

  const appointments = await Appointment.find({
    userId: auth.user.id,
    date: { $gte: day, $lt: new Date(day.getTime() + 86400000) },
    status: "scheduled",
  });

  const owner = await User.findById(auth.user.id).select("businessName");
  const notifications: Array<{ clientName: string; url: string }> = [];

  for (const appt of appointments) {
    appt.status = "canceled";
    appt.canceledAt = new Date();
    appt.cancelReason = parsed.data.reason || "יום סגור";
    await appt.save();

    if (parsed.data.notifyClients) {
      const client = await Client.findById(appt.clientId);
      if (client?.optIn) {
        const n = await buildCancellationWhatsApp({
          userId: auth.user.id,
          clientPhone: client.phone,
          businessName: owner?.businessName || "הסלון",
          appointmentDate: appt.date,
          serviceName: appt.serviceName,
          serviceId: appt.serviceId?.toString(),
        });
        notifications.push({ clientName: client.name, url: n.url });
      }
    }
  }

  return NextResponse.json({
    closed: true,
    canceledCount: appointments.length,
    notifications,
  });
}
