import { startOfMonth, startOfDay, endOfDay, endOfWeek, subYears } from "date-fns";
import { connectDB } from "@/lib/mongodb";
import { Client } from "@/models/Client";
import { Appointment } from "@/models/Appointment";
import { Payment } from "@/models/Payment";
import { computeClientStatus, daysSinceVisit } from "@/lib/client-status";
import { serializeAppointmentRow } from "@/lib/serialize";
import { computeReturningMetrics } from "@/lib/returning-revenue";

export type DashboardStatsData = Awaited<ReturnType<typeof getDashboardStats>>;

export async function getDashboardStats(userId: string) {
  await connectDB();

  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const weekEnd = endOfWeek(now, { weekStartsOn: 0 });
  const monthStart = startOfMonth(now);

  const [clients, todayAppointments, upcomingAppointments, allCompleted, paidRevenue, pendingCashCount] =
    await Promise.all([
      Client.find({ userId }).select("name phone optIn lastVisitDate lastMessageSentDate").lean(),
      Appointment.find({
        userId,
        date: { $gte: todayStart, $lte: todayEnd },
        status: { $ne: "canceled" },
      })
        .populate("clientId", "name phone")
        .sort({ date: 1 })
        .lean(),
      Appointment.find({
        userId,
        date: { $gt: todayEnd, $lte: weekEnd },
        status: "scheduled",
      })
        .populate("clientId", "name phone")
        .sort({ date: 1 })
        .limit(6)
        .lean(),
      Appointment.find({
        userId,
        status: "completed",
        date: { $gte: subYears(now, 2) },
      })
        .select("clientId date finalPrice")
        .sort({ date: 1 })
        .lean(),
      Payment.aggregate([
        {
          $match: {
            userId,
            status: "paid",
            confirmedAt: { $gte: monthStart },
          },
        },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
      Payment.countDocuments({
        userId,
        status: "pending",
        method: "cash",
      }),
    ]);

  let totalClients = clients.length;
  let returningThisMonth = 0;
  let lostClients = 0;
  let atRiskClients = 0;
  let activeClients = 0;

  const lostList: Array<{
    _id: string;
    name: string;
    phone: string;
    optIn: boolean;
    lastMessageSentDate?: string;
    daysSince: number;
  }> = [];

  for (const client of clients) {
    const status = computeClientStatus(client.lastVisitDate);
    const days = daysSinceVisit(client.lastVisitDate);

    if (client.lastVisitDate && new Date(client.lastVisitDate) >= monthStart) {
      returningThisMonth++;
    }

    if (status === "lost") {
      lostClients++;
      lostList.push({
        _id: client._id.toString(),
        name: client.name,
        phone: client.phone,
        optIn: client.optIn ?? false,
        lastMessageSentDate: client.lastMessageSentDate
          ? new Date(client.lastMessageSentDate).toISOString()
          : undefined,
        daysSince: days,
      });
    }

    if (status === "atRisk") atRiskClients++;
    if (status === "active" || status === "atRisk") activeClients++;
  }

  const churnRate =
    totalClients > 0 ? Math.round((lostClients / totalClients) * 1000) / 10 : 0;

  const { returningRevenue, returningVisits } = computeReturningMetrics(monthStart, allCompleted);

  const estimatedRevenue = paidRevenue[0]?.total ?? 0;

  let pricedVisits = 0;
  let pricedTotal = 0;
  for (const appt of allCompleted) {
    if (appt.finalPrice != null && appt.finalPrice > 0) {
      pricedVisits++;
      pricedTotal += appt.finalPrice;
    }
  }
  const avgTicket = pricedVisits > 0 ? Math.round(pricedTotal / pricedVisits) : 250;
  const lostPotentialRevenue = lostClients * avgTicket;

  return {
    totalClients,
    activeClients,
    returningThisMonth,
    lostClients,
    atRiskClients,
    churnRate,
    returningRevenue,
    returningVisits,
    estimatedRevenue,
    lostPotentialRevenue,
    pendingCashCount,
    todayAppointments: todayAppointments.map(serializeAppointmentRow),
    upcomingAppointments: upcomingAppointments.map(serializeAppointmentRow),
    lostList: lostList.sort((a, b) => b.daysSince - a.daysSince).slice(0, 10),
  };
}
