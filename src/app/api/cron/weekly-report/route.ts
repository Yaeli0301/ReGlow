import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import {
  getWeeklyMetrics,
  getMonthlyMetrics,
  getTopActiveBusinesses,
  startOfWeek,
  WEEK_MS,
} from "@/lib/analytics/metrics-service";
import {
  detectInactiveBusinesses,
  saveSnapshot,
} from "@/lib/analytics/retention-engine";
import { renderWeeklyReport } from "@/lib/analytics/report-generator";
import { sendEmail, getAdminEmail } from "@/lib/email";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectDB();

    const weekStart = startOfWeek(new Date());
    const since = new Date(weekStart.getTime() - WEEK_MS);

    const [weekly, monthly, topBusinesses, inactive] = await Promise.all([
      getWeeklyMetrics(new Date()),
      getMonthlyMetrics(new Date()),
      getTopActiveBusinesses(since, 5),
      detectInactiveBusinesses(),
    ]);

    await saveSnapshot("weekly", weekStart, {
      weekly,
      monthly,
      inactiveCount: inactive.length,
    });

    const adminEmail = getAdminEmail();
    let emailResult: { sent: boolean; provider: "none" | "resend"; reason: string } = {
      sent: false,
      provider: "none",
      reason: "ADMIN_EMAIL not set",
    };
    if (adminEmail) {
      const { subject, html } = renderWeeklyReport({
        metrics: weekly,
        monthly,
        topBusinesses,
        inactiveCount: inactive.length,
      });
      const sendResult = await sendEmail({
        to: adminEmail,
        subject,
        html,
      });
      emailResult = {
        sent: sendResult.sent,
        provider: sendResult.provider,
        reason: sendResult.reason ?? "",
      };
    }

    logger.info("Weekly report ran", {
      retention: weekly.retentionRate7d,
      churn: weekly.churnRate,
      mrr: monthly.MRR,
      inactive: inactive.length,
      emailSent: emailResult.sent,
    });

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      weekly,
      monthly,
      topBusinesses,
      inactiveCount: inactive.length,
      email: emailResult,
    });
  } catch (error) {
    logger.error("Weekly report failed", {
      err: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { success: false, error: "Weekly report failed" },
      { status: 500 }
    );
  }
}
