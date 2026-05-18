import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { requireAuthFromRequest } from "@/lib/api-auth";
import { canAccess } from "@/lib/subscription";
import { Payment } from "@/models/Payment";
import { Appointment } from "@/models/Appointment";
import { Client } from "@/models/Client";

export async function GET(request: Request) {
  const auth = await requireAuthFromRequest(request);
  if (auth instanceof NextResponse) return auth;

  if (!canAccess(auth.user.subscriptionTier, "appointments")) {
    return NextResponse.json({ error: "Pro plan required" }, { status: 403 });
  }

  await connectDB();

  const payments = await Payment.find({
    userId: auth.user.id,
    status: "pending",
    method: "cash",
  })
    .sort({ createdAt: -1 })
    .lean();

  const enriched = await Promise.all(
    payments.map(async (p) => {
      const [appointment, client] = await Promise.all([
        Appointment.findById(p.appointmentId).lean(),
        Client.findById(p.clientId).select("name phone").lean(),
      ]);
      return {
        _id: p._id.toString(),
        amount: p.amount,
        method: p.method,
        createdAt: p.createdAt,
        appointment: appointment
          ? {
              _id: appointment._id.toString(),
              date: appointment.date,
              serviceName: appointment.serviceName,
              priceLineItems: appointment.priceLineItems,
            }
          : null,
        client: client
          ? { name: client.name, phone: client.phone }
          : null,
      };
    })
  );

  return NextResponse.json({ payments: enriched });
}
