import { NextResponse } from "next/server";
import { startOfMonth, startOfDay, endOfDay, addDays, subYears } from "date-fns";
import { requireAuthFromRequest, requireSubscription } from "@/lib/api-auth";
import { Client } from "@/models/Client";
import { Appointment } from "@/models/Appointment";
import { Payment } from "@/models/Payment";
import { computeClientStatus, daysSinceVisit } from "@/lib/client-status";
import { serializeAppointmentRow } from "@/lib/serialize";
import { computeReturningMetrics } from "@/lib/returning-revenue";

export async function GET(request: Request) {
  try {
    const auth = await requireAuthFromRequest(request);
    if (auth instanceof NextResponse) return auth;

    const subError = requireSubscription(auth.user);
    if (subError) return subError;

    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);
    const monthStart = startOfMonth(now);

    const [clients, todayAppointments, upcomingAppointments, allCompleted, paidRevenue, pendingCashCount] =
      await Promise.all([
      Client.find({ userId: auth.user.id })
        .select("name phone optIn lastVisitDate lastMessageSentDate")
        .lean(),
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
      Appointment.find({
        userId: auth.user.id,
        status: "completed",
        date: { $gte: subYears(now, 2) },
      })
        .select("clientId date finalPrice")
        .sort({ date: 1 })
        .lean(),
      Payment.aggregate([
        {
          $match: {
            userId: auth.user.id,
            status: "paid",
            confirmedAt: { $gte: monthStart },
          },
        },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
      Payment.countDocuments({
        userId: auth.user.id,
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

    const { returningRevenue, returningVisits } = computeReturningMetrics(
      monthStart,
      allCompleted
    );

    const estimatedRevenue = paidRevenue[0]?.total ?? 0;

    const response = NextResponse.json({
      totalClients,
      activeClients,
      returningThisMonth,
      lostClients,
      atRiskClients,
      churnRate,
      returningRevenue,
      returningVisits,
      estimatedRevenue,
      pendingCashCount,
      todayAppointments: todayAppointments.map(serializeAppointmentRow),
      upcomingAppointments: upcomingAppointments.map(serializeAppointmentRow),
      lostList: lostList.sort((a, b) => b.daysSince - a.daysSince).slice(0, 10),
    });

    response.headers.set("Cache-Control", "private, max-age=15, stale-while-revalidate=30");
    return response;
  } catch (error) {
    console.error("[dashboard/stats]", error);
    return NextResponse.json(
      { error: "שגיאת שרת בטעינת הדאשבורד", code: "DASHBOARD_STATS_ERROR" },
      { status: 500 }
    );
  }
}
