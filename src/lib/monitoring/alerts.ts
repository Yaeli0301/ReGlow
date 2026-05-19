/**
 * Operational alerts based on telemetry + analytics.
 * Non-blocking — logs + optional email to admin.
 */

import { getErrorRateLastHour, logTelemetry } from "@/lib/monitoring/telemetry";
import { getSystemState } from "@/lib/system/system-state";
import { getDailyMetrics, DAY_MS } from "@/lib/analytics/metrics-service";
import { connectDB } from "@/lib/mongodb";
import { sendEmail, getAdminEmail } from "@/lib/email";
import { logger } from "@/lib/logger";

export interface OperationalAlert {
  code: string;
  severity: "low" | "medium" | "high";
  title: string;
  message: string;
}

const ERROR_RATE_THRESHOLD = 5;
const DB_LATENCY_THRESHOLD_MS = 800;
const LOGIN_SPIKE_THRESHOLD = 10;
const RETENTION_DROP_THRESHOLD = 15;

export async function evaluateOperationalAlerts(): Promise<OperationalAlert[]> {
  await connectDB();
  const alerts: OperationalAlert[] = [];

  const [errorRate, state, today, yesterday] = await Promise.all([
    getErrorRateLastHour(),
    getSystemState(),
    getDailyMetrics(new Date()),
    getDailyMetrics(new Date(Date.now() - DAY_MS)),
  ]);

  if (errorRate > ERROR_RATE_THRESHOLD) {
    alerts.push({
      code: "ERROR_RATE_HIGH",
      severity: "high",
      title: "שיעור שגיאות API גבוה",
      message: `${errorRate}% מהבקשות בשעה האחרונה נכשלו (סף: ${ERROR_RATE_THRESHOLD}%)`,
    });
  }

  if (state.checks.database && state.degraded.some((d) => d.includes("latency"))) {
    alerts.push({
      code: "DB_LATENCY_HIGH",
      severity: "medium",
      title: "זמן תגובת DB איטי",
      message: state.degraded.find((d) => d.includes("latency")) || "Latency > 800ms",
    });
  }

  // Login failure spike via system_logs
  const { SystemLog } = await import("@/models/SystemLog");
  const failures = await SystemLog.countDocuments({
    category: "auth",
    message: "Login failed",
    createdAt: { $gte: new Date(Date.now() - 60 * 60 * 1000) },
  });
  if (failures >= LOGIN_SPIKE_THRESHOLD) {
    alerts.push({
      code: "LOGIN_FAILURE_SPIKE",
      severity: "high",
      title: "עלייה בכשלי התחברות",
      message: `${failures} כשלי login בשעה האחרונה`,
    });
  }

  if (
    yesterday.activeUsers >= 5 &&
    today.activeUsers < yesterday.activeUsers * (1 - RETENTION_DROP_THRESHOLD / 100)
  ) {
    const drop = Math.round(
      ((yesterday.activeUsers - today.activeUsers) / yesterday.activeUsers) * 100
    );
    alerts.push({
      code: "USAGE_DROP",
      severity: "medium",
      title: "ירידה בפעילות",
      message: `ירידה של ${drop}% במשתמשות פעילות (אתמול ${yesterday.activeUsers} → היום ${today.activeUsers})`,
    });
  }

  return alerts;
}

export async function sendOperationalAlerts(alerts: OperationalAlert[]): Promise<void> {
  if (alerts.length === 0) return;

  for (const a of alerts) {
    logTelemetry({
      level: a.severity === "high" ? "error" : "warn",
      category: "system",
      message: a.title,
      source: a.code,
      meta: { message: a.message },
    });
  }

  const high = alerts.filter((a) => a.severity === "high");
  const adminEmail = getAdminEmail();
  if (!adminEmail || high.length === 0) return;

  const body = high
    .map(
      (a) =>
        `<div style="padding:12px;margin:8px 0;border-right:4px solid #dc2626;background:#fef2f2">
          <strong>${a.title}</strong><br/><span style="color:#374151">${a.message}</span>
        </div>`
    )
    .join("");

  const html = `<!DOCTYPE html><html dir="rtl" lang="he"><body style="font-family:Heebo,sans-serif;padding:24px">
    <h2>התראות תפעול — ReGlow</h2>${body}
    <p><a href="${process.env.NEXT_PUBLIC_APP_URL || ""}/admin/system-health">לוח בריאות מערכת</a></p>
  </body></html>`;

  const result = await sendEmail({
    to: adminEmail,
    subject: `ReGlow ⚠ ${high.length} התראות תפעול`,
    html,
  });

  if (!result.sent) {
    logger.info("Operational alert email skipped", { reason: result.reason });
  }
}

export { ERROR_RATE_THRESHOLD, DB_LATENCY_THRESHOLD_MS };
