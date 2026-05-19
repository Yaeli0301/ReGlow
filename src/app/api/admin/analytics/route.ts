import { NextResponse } from "next/server";
import { requireAuthFromRequest, requireRole } from "@/lib/api-auth";
import { handleApiError } from "@/lib/errors";
import {
  getDailyMetrics,
  getWeeklyMetrics,
  getMonthlyMetrics,
  getEventTimeSeries,
  getRevenueTimeSeries,
  getTopActiveBusinesses,
  WEEK_MS,
  DAY_MS,
} from "@/lib/analytics/metrics-service";
import {
  detectInactiveBusinesses,
  getClientRetentionStats,
} from "@/lib/analytics/retention-engine";
import { detectAnomalies } from "@/lib/analytics/anomaly-detector";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const auth = await requireAuthFromRequest(request);
    if (auth instanceof NextResponse) return auth;
    const roleErr = requireRole(auth.user, "admin");
    if (roleErr) return roleErr;

    const { searchParams } = new URL(request.url);
    const days = Math.min(Math.max(parseInt(searchParams.get("days") || "14", 10), 7), 90);

    const [
      daily,
      weekly,
      monthly,
      retention,
      anomalies,
      inactive,
      topBiz,
      usersSeries,
      apptsSeries,
      revenueSeries,
    ] = await Promise.all([
      getDailyMetrics(new Date()),
      getWeeklyMetrics(new Date()),
      getMonthlyMetrics(new Date()),
      getClientRetentionStats(),
      detectAnomalies(),
      detectInactiveBusinesses(),
      getTopActiveBusinesses(new Date(Date.now() - WEEK_MS), 5),
      getEventTimeSeries("user_logged_in", days),
      getEventTimeSeries("appointment_created", days),
      getRevenueTimeSeries(days),
    ]);

    return NextResponse.json({
      success: true,
      generatedAt: new Date().toISOString(),
      daily,
      weekly,
      monthly,
      retention,
      anomalies,
      inactiveBusinesses: inactive.slice(0, 20),
      topBusinesses: topBiz,
      series: {
        users: usersSeries,
        appointments: apptsSeries,
        revenue: revenueSeries,
      },
      meta: { rangeDays: days, dayMs: DAY_MS },
    });
  } catch (error) {
    return handleApiError(error, "admin/analytics");
  }
}
