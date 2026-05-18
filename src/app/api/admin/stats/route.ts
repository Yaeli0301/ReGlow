import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { requireAuthFromRequest, requireRole } from "@/lib/api-auth";
import { handleApiError } from "@/lib/errors";
import { User } from "@/models/User";
import { Client } from "@/models/Client";
import { Appointment } from "@/models/Appointment";
import { Payment } from "@/models/Payment";

export async function GET(request: Request) {
  try {
    const auth = await requireAuthFromRequest(request);
    if (auth instanceof NextResponse) return auth;
    const roleErr = requireRole(auth.user, "admin");
    if (roleErr) return roleErr;

    await connectDB();

    const [businesses, clients, appointments, paidRevenue] = await Promise.all([
      User.countDocuments({ role: { $ne: "admin" } }),
      Client.countDocuments(),
      Appointment.countDocuments(),
      Payment.aggregate([
        { $match: { status: "paid" } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
    ]);

    return NextResponse.json({
      businesses,
      clients,
      appointments,
      totalRevenue: paidRevenue[0]?.total ?? 0,
    });
  } catch (error) {
    return handleApiError(error, "admin/stats");
  }
}
