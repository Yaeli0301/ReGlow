/**
 * Metrics aggregation service.
 * All queries REQUIRE a date range to avoid full-collection scans.
 */

import { connectDB } from "@/lib/mongodb";
import { Event } from "@/models/Event";
import { User } from "@/models/User";
import { Appointment } from "@/models/Appointment";
import { Payment } from "@/models/Payment";

const DAY_MS = 86_400_000;
const WEEK_MS = DAY_MS * 7;
const MONTH_MS = DAY_MS * 30;

export interface DailyMetrics {
  date: string;
  activeUsers: number;
  newUsers: number;
  appointmentsCreated: number;
  revenue: number;
}

export interface WeeklyMetrics {
  weekStart: string;
  retentionRate7d: number;
  churnRate: number;
  returningClients: number;
  newUsers: number;
  appointmentsCreated: number;
}

export interface MonthlyMetrics {
  monthStart: string;
  MRR: number;
  ARPU: number;
  LTV: number;
  growthRatePct: number;
  paidUsers: number;
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setUTCHours(0, 0, 0, 0);
  return x;
}

function startOfWeek(d: Date): Date {
  const x = startOfDay(d);
  const day = x.getUTCDay(); // 0=Sun
  x.setUTCDate(x.getUTCDate() - day);
  return x;
}

function startOfMonth(d: Date): Date {
  const x = startOfDay(d);
  x.setUTCDate(1);
  return x;
}

const TIER_PRICE: Record<string, number> = {
  none: 0,
  basic: 99,
  pro: 199,
  premium: 299,
};

/* ---------------------------------------------------------------------------
 * DAILY METRICS
 * ------------------------------------------------------------------------- */

export async function getDailyMetrics(date: Date = new Date()): Promise<DailyMetrics> {
  await connectDB();
  const start = startOfDay(date);
  const end = new Date(start.getTime() + DAY_MS);

  const [activeAgg, newUsers, apptsCreated, paidAgg] = await Promise.all([
    Event.aggregate([
      {
        $match: {
          type: "user_logged_in",
          createdAt: { $gte: start, $lt: end },
        },
      },
      { $group: { _id: "$userId" } },
      { $count: "n" },
    ]),
    User.countDocuments({ createdAt: { $gte: start, $lt: end } }),
    Appointment.countDocuments({ createdAt: { $gte: start, $lt: end } }),
    Payment.aggregate([
      {
        $match: {
          status: "paid",
          confirmedAt: { $gte: start, $lt: end },
        },
      },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
  ]);

  return {
    date: start.toISOString().slice(0, 10),
    activeUsers: activeAgg[0]?.n ?? 0,
    newUsers,
    appointmentsCreated: apptsCreated,
    revenue: paidAgg[0]?.total ?? 0,
  };
}

/* ---------------------------------------------------------------------------
 * WEEKLY METRICS
 * ------------------------------------------------------------------------- */

export async function getWeeklyMetrics(date: Date = new Date()): Promise<WeeklyMetrics> {
  await connectDB();
  const weekStart = startOfWeek(date);
  const weekEnd = new Date(weekStart.getTime() + WEEK_MS);
  const prevWeekStart = new Date(weekStart.getTime() - WEEK_MS);

  // Retention 7d: how many users active this week were also active last week
  const [prevActive, currActive, newUsers, appts, returnedAgg] = await Promise.all([
    Event.aggregate([
      {
        $match: {
          type: "user_logged_in",
          createdAt: { $gte: prevWeekStart, $lt: weekStart },
        },
      },
      { $group: { _id: "$userId" } },
    ]),
    Event.aggregate([
      {
        $match: {
          type: "user_logged_in",
          createdAt: { $gte: weekStart, $lt: weekEnd },
        },
      },
      { $group: { _id: "$userId" } },
    ]),
    User.countDocuments({ createdAt: { $gte: weekStart, $lt: weekEnd } }),
    Appointment.countDocuments({ createdAt: { $gte: weekStart, $lt: weekEnd } }),
    Event.countDocuments({
      type: "client_returned",
      createdAt: { $gte: weekStart, $lt: weekEnd },
    }),
  ]);

  const prevSet = new Set(prevActive.map((u: { _id: string }) => u._id));
  const currIds = currActive.map((u: { _id: string }) => u._id);
  const retained = currIds.filter((id) => prevSet.has(id)).length;
  const retentionRate7d = prevSet.size > 0 ? Math.round((retained / prevSet.size) * 1000) / 10 : 0;

  // Churn (subs cancelled this week / paid users at week start)
  const [churnEvents, paidUsers] = await Promise.all([
    Event.countDocuments({
      type: "subscription_cancelled",
      createdAt: { $gte: weekStart, $lt: weekEnd },
    }),
    User.countDocuments({
      subscriptionTier: { $in: ["basic", "pro", "premium"] },
      createdAt: { $lt: weekStart },
    }),
  ]);

  const churnRate = paidUsers > 0 ? Math.round((churnEvents / paidUsers) * 1000) / 10 : 0;

  return {
    weekStart: weekStart.toISOString().slice(0, 10),
    retentionRate7d,
    churnRate,
    returningClients: returnedAgg,
    newUsers,
    appointmentsCreated: appts,
  };
}

/* ---------------------------------------------------------------------------
 * MONTHLY METRICS
 * ------------------------------------------------------------------------- */

export async function getMonthlyMetrics(date: Date = new Date()): Promise<MonthlyMetrics> {
  await connectDB();
  const monthStart = startOfMonth(date);
  const prevMonthEnd = monthStart;
  const prevMonthStart = startOfMonth(new Date(prevMonthEnd.getTime() - DAY_MS));

  const [tierAgg, prevTierAgg] = await Promise.all([
    User.aggregate([
      { $match: { subscriptionTier: { $in: ["basic", "pro", "premium"] } } },
      { $group: { _id: "$subscriptionTier", n: { $sum: 1 } } },
    ]),
    User.aggregate([
      {
        $match: {
          subscriptionTier: { $in: ["basic", "pro", "premium"] },
          createdAt: { $lt: monthStart },
        },
      },
      { $group: { _id: "$subscriptionTier", n: { $sum: 1 } } },
    ]),
  ]);

  function mrr(rows: Array<{ _id: string; n: number }>): number {
    return rows.reduce((sum, r) => sum + (TIER_PRICE[r._id] || 0) * r.n, 0);
  }

  const currMRR = mrr(tierAgg);
  const prevMRR = mrr(prevTierAgg);
  const paidUsers = tierAgg.reduce((s, r) => s + r.n, 0);
  const ARPU = paidUsers > 0 ? Math.round(currMRR / paidUsers) : 0;
  // Naive LTV approximation: ARPU * (1 / monthly churn rate). Assume 5% baseline if unknown.
  const LTV = Math.round(ARPU / 0.05);
  const growthRatePct =
    prevMRR > 0
      ? Math.round(((currMRR - prevMRR) / prevMRR) * 1000) / 10
      : currMRR > 0
        ? 100
        : 0;

  return {
    monthStart: monthStart.toISOString().slice(0, 10),
    MRR: currMRR,
    ARPU,
    LTV,
    growthRatePct,
    paidUsers,
  };
}

/* ---------------------------------------------------------------------------
 * TIME SERIES (for charts on admin UI)
 * ------------------------------------------------------------------------- */

export interface TimeSeriesPoint {
  date: string;
  value: number;
}

export async function getEventTimeSeries(
  type: string,
  days = 14
): Promise<TimeSeriesPoint[]> {
  await connectDB();
  // Include today: start = today - (days - 1) days, end = end of today
  const start = startOfDay(new Date(Date.now() - (days - 1) * DAY_MS));
  const rows = await Event.aggregate([
    { $match: { type, createdAt: { $gte: start } } },
    {
      $group: {
        _id: {
          $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: "UTC" },
        },
        n: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  return fillSeries(start, days, rows);
}

export async function getRevenueTimeSeries(days = 14): Promise<TimeSeriesPoint[]> {
  await connectDB();
  const start = startOfDay(new Date(Date.now() - (days - 1) * DAY_MS));
  const rows = await Payment.aggregate([
    { $match: { status: "paid", confirmedAt: { $gte: start } } },
    {
      $group: {
        _id: {
          $dateToString: { format: "%Y-%m-%d", date: "$confirmedAt", timezone: "UTC" },
        },
        n: { $sum: "$amount" },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  return fillSeries(start, days, rows);
}

function fillSeries(
  start: Date,
  days: number,
  rows: Array<{ _id: string; n: number }>
): TimeSeriesPoint[] {
  const lookup = new Map(rows.map((r) => [r._id, r.n] as const));
  const out: TimeSeriesPoint[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(start.getTime() + i * DAY_MS);
    const key = d.toISOString().slice(0, 10);
    out.push({ date: key, value: lookup.get(key) ?? 0 });
  }
  return out;
}

/* ---------------------------------------------------------------------------
 * TOP ACTIVE BUSINESSES (for weekly report)
 * ------------------------------------------------------------------------- */

export async function getTopActiveBusinesses(
  fromDate: Date,
  limit = 5
): Promise<Array<{ userId: string; businessName: string; events: number }>> {
  await connectDB();
  const rows = await Event.aggregate([
    { $match: { createdAt: { $gte: fromDate } } },
    { $group: { _id: "$userId", n: { $sum: 1 } } },
    { $sort: { n: -1 } },
    { $limit: limit },
  ]);

  if (rows.length === 0) return [];

  const users = await User.find({
    _id: { $in: rows.map((r: { _id: string }) => r._id) },
  })
    .select("businessName")
    .lean();

  const nameMap = new Map(users.map((u) => [u._id.toString(), u.businessName] as const));

  return rows.map((r: { _id: string; n: number }) => ({
    userId: r._id,
    businessName: nameMap.get(r._id) || "—",
    events: r.n,
  }));
}

export { DAY_MS, WEEK_MS, MONTH_MS, startOfDay, startOfWeek, startOfMonth };
