import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { runAllInsights } from "@/lib/analytics/insights-engine";
import { renderInsightsDigest, renderSingleInsightAlert } from "@/lib/analytics/report-generator";
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

    const result = await runAllInsights(new Date());
    const allNew = [
      ...result.daily.created,
      ...result.weekly.created,
      ...result.monthly.created,
    ];

    const adminEmail = getAdminEmail();
    let emailResult: { sent: boolean; provider: "none" | "resend"; reason: string } = {
      sent: false,
      provider: "none",
      reason: "ADMIN_EMAIL not set",
    };

    if (adminEmail && allNew.length > 0) {
      // Send a digest of ALL newly-created insights
      const { subject, html } = renderInsightsDigest(
        allNew.map((i) => ({
          type: i.type,
          severity: i.severity,
          title: i.title,
          message: i.message,
          recommendation: i.recommendation,
          metric: i.metric,
          period: i.period,
        }))
      );
      const sendResult = await sendEmail({ to: adminEmail, subject, html });
      emailResult = {
        sent: sendResult.sent,
        provider: sendResult.provider,
        reason: sendResult.reason ?? "",
      };

      // For each HIGH severity insight, send a separate dedicated alert
      for (const high of result.newHighSeverity) {
        const single = renderSingleInsightAlert({
          type: high.type,
          severity: high.severity,
          title: high.title,
          message: high.message,
          recommendation: high.recommendation,
          metric: high.metric,
          period: high.period,
        });
        await sendEmail({ to: adminEmail, subject: single.subject, html: single.html });
      }
    }

    logger.info("Insights generated", {
      dailyNew: result.daily.created.length,
      weeklyNew: result.weekly.created.length,
      monthlyNew: result.monthly.created.length,
      dailyUpdated: result.daily.updated,
      weeklyUpdated: result.weekly.updated,
      monthlyUpdated: result.monthly.updated,
      highSeverity: result.newHighSeverity.length,
      emailSent: emailResult.sent,
    });

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      summary: {
        daily: { created: result.daily.created.length, updated: result.daily.updated },
        weekly: { created: result.weekly.created.length, updated: result.weekly.updated },
        monthly: { created: result.monthly.created.length, updated: result.monthly.updated },
        highSeverity: result.newHighSeverity.length,
      },
      email: emailResult,
    });
  } catch (error) {
    logger.error("generate-insights failed", {
      err: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { success: false, error: "Generate insights failed" },
      { status: 500 }
    );
  }
}
