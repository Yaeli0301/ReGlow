import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import {
  getDailyMetrics,
  startOfDay,
  DAY_MS,
} from "@/lib/analytics/metrics-service";
import { detectAnomalies } from "@/lib/analytics/anomaly-detector";
import { saveSnapshot } from "@/lib/analytics/retention-engine";
import { renderDailyReport } from "@/lib/analytics/report-generator";
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

    const [today, yesterdayMetrics, alerts] = await Promise.all([
      getDailyMetrics(new Date()),
      getDailyMetrics(new Date(Date.now() - DAY_MS)),
      detectAnomalies(),
    ]);

    // Persist snapshot so UI can show history quickly
    await saveSnapshot("daily", startOfDay(new Date()), {
      ...today,
      alertsCount: alerts.length,
    });

    const adminEmail = getAdminEmail();
    let emailResult: { sent: boolean; provider: "none" | "resend"; reason: string } = {
      sent: false,
      provider: "none",
      reason: "ADMIN_EMAIL not set",
    };
    if (adminEmail) {
      const { subject, html } = renderDailyReport({
        metrics: today,
        alerts,
        trend: { today: today.activeUsers, yesterday: yesterdayMetrics.activeUsers },
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

    logger.info("Daily report ran", {
      activeUsers: today.activeUsers,
      newUsers: today.newUsers,
      appointments: today.appointmentsCreated,
      alertsCount: alerts.length,
      emailSent: emailResult.sent,
    });

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      metrics: today,
      alertsCount: alerts.length,
      email: emailResult,
    });
  } catch (error) {
    logger.error("Daily report failed", {
      err: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { success: false, error: "Daily report failed" },
      { status: 500 }
    );
  }
}
