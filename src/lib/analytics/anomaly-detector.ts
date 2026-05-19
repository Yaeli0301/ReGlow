/**
 * Detects sudden drops or spikes that warrant an admin alert.
 */

import { getDailyMetrics } from "@/lib/analytics/metrics-service";
import { Event } from "@/models/Event";
import { connectDB } from "@/lib/mongodb";
import { DAY_MS } from "@/lib/analytics/metrics-service";

export type AlertSeverity = "info" | "warning" | "critical";

export interface Alert {
  severity: AlertSeverity;
  code: string;
  title: string;
  description: string;
  value?: number;
}

const ACTIVITY_DROP_THRESHOLD = 0.2; // 20% drop
const PAYMENT_FAILURE_SPIKE = 3; // 3+ failures in 24h

export async function detectAnomalies(): Promise<Alert[]> {
  await connectDB();
  const alerts: Alert[] = [];

  const today = await getDailyMetrics(new Date());
  const yesterday = await getDailyMetrics(new Date(Date.now() - DAY_MS));

  // 1. Activity drop
  if (yesterday.activeUsers > 5) {
    const ratio = today.activeUsers / yesterday.activeUsers;
    if (ratio < 1 - ACTIVITY_DROP_THRESHOLD) {
      const dropPct = Math.round((1 - ratio) * 100);
      alerts.push({
        severity: "warning",
        code: "ACTIVITY_DROP",
        title: `ירידה של ${dropPct}% במשתמשות פעילות`,
        description: `אתמול: ${yesterday.activeUsers}, היום: ${today.activeUsers}`,
        value: dropPct,
      });
    }
  }

  // 2. Payment failure spike
  const failureCount = await Event.countDocuments({
    type: "subscription_cancelled",
    createdAt: { $gte: new Date(Date.now() - DAY_MS) },
  });
  if (failureCount >= PAYMENT_FAILURE_SPIKE) {
    alerts.push({
      severity: "critical",
      code: "PAYMENT_FAILURE_SPIKE",
      title: `${failureCount} ביטולי מנוי ב-24 שעות`,
      description: "בדקי לוגים של Stripe + שלחי הודעה ללקוחות שעזבו",
      value: failureCount,
    });
  }

  // 3. Zero appointments today
  if (today.appointmentsCreated === 0 && yesterday.appointmentsCreated > 0) {
    alerts.push({
      severity: "info",
      code: "ZERO_APPOINTMENTS",
      title: "אין תורים חדשים היום",
      description: `אתמול נוצרו ${yesterday.appointmentsCreated}`,
    });
  }

  return alerts;
}
