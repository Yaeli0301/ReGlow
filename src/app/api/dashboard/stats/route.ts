import { NextResponse } from "next/server";
import {
  startOfMonth,
  startOfDay,
  endOfDay,
  addDays,
  subDays,
} from "date-fns";
import { requireAuthFromRequest, requireSubscription } from "@/lib/api-auth";
import { Client } from "@/models/Client";
import { Appointment } from "@/models/Appointment";
import { computeClientStatus, daysSinceVisit } from "@/lib/client-status";

const AVG_VISIT_VALUE = 250;

export async function GET(request: Request) {
  const auth = await requireAuthFromRequest(request);
  if (auth instanceof NextResponse) return auth;

  const subError = requireSubscription(auth.user);
  if (subError) return subError;

  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const monthStart = startOfMonth(now);

  const [clients, todayAppointments, upcomingAppointments] = await Promise.all([
    Client.find({ userId: auth.user.id }).lean(),
    Appointment.find({
      userId: auth.user.id,
      date: { $gte: todayStart, $lte: todayEnd },
      status: { $ne: "canceled" },
    })
      .populate("clientId", "name phone")
      .sort({ date: 1 })
      .lean(),
    Appointment.find({
      userId: auth.user.id,
      date: { $gt: todayEnd, $lte: addDays(todayEnd, 14) },
      status: "scheduled",
    })
      .populate("clientId", "name phone")
      .sort({ date: 1 })
      .limit(8)
      .lean(),
  ]);

  let totalClients = clients.length;
  let returningThisMonth = 0;
  let lostClients = 0;
  let atRiskClients = 0;
  let estimatedRevenue = 0;

  const lostList: Array<{
    _id: string;
    name: string;
    phone: string;
    optIn: boolean;
    lastMessageSentDate?: Date;
    daysSince: number;
  }> = [];

  for (const client of clients) {
    const status = computeClientStatus(client.lastVisitDate);
    const days = daysSinceVisit(client.lastVisitDate);

    if (client.lastVisitDate && new Date(client.lastVisitDate) >= monthStart) {
      returningThisMonth++;
      estimatedRevenue += AVG_VISIT_VALUE;
    }

    if (status === "lost") {
      lostClients++;
      lostList.push({
        _id: client._id.toString(),
        name: client.name,
        phone: client.phone,
        optIn: client.optIn ?? false,
        lastMessageSentDate: client.lastMessageSentDate,
        daysSince: days,
      });
    }

    if (status === "atRisk") atRiskClients++;
  }

  return NextResponse.json({
    totalClients,
    returningThisMonth,
    lostClients,
    atRiskClients,
    estimatedRevenue,
    todayAppointments,
    upcomingAppointments,
    lostList: lostList.sort((a, b) => b.daysSince - a.daysSince).slice(0, 10),
  });
}
