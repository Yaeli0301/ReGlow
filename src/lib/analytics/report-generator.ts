/**
 * Renders HTML reports for the admin email digest.
 * Inline CSS — works in Gmail/Outlook/iOS mail.
 */

import type { DailyMetrics, WeeklyMetrics, MonthlyMetrics } from "@/lib/analytics/metrics-service";
import type { Alert } from "@/lib/analytics/anomaly-detector";

interface DailyReportData {
  metrics: DailyMetrics;
  alerts: Alert[];
  trend: { today: number; yesterday: number };
}

interface WeeklyReportData {
  metrics: WeeklyMetrics;
  monthly: MonthlyMetrics;
  topBusinesses: Array<{ businessName: string; events: number }>;
  inactiveCount: number;
}

const STYLES = `
  body { margin:0; background:#f5f5f7; font-family:'Heebo','Segoe UI',Arial,sans-serif; color:#1f2937; direction:rtl; }
  .container { max-width:600px; margin:0 auto; padding:24px; }
  .card { background:#fff; border:1px solid #e5e7eb; border-radius:12px; padding:20px; margin-bottom:16px; }
  .h1 { font-size:22px; font-weight:700; margin:0 0 4px; color:#0f172a; }
  .h2 { font-size:16px; font-weight:600; margin:0 0 12px; color:#374151; }
  .muted { color:#6b7280; font-size:13px; }
  .stat { display:inline-block; width:48%; vertical-align:top; padding:8px 0; }
  .stat-label { font-size:12px; color:#6b7280; }
  .stat-value { font-size:24px; font-weight:700; color:#0f172a; }
  .alert { padding:12px; border-radius:8px; margin-top:8px; font-size:14px; }
  .alert-info { background:#eff6ff; color:#1e40af; }
  .alert-warning { background:#fef3c7; color:#92400e; }
  .alert-critical { background:#fee2e2; color:#991b1b; }
  .footer { text-align:center; font-size:12px; color:#9ca3af; padding-top:16px; }
  a { color:#db2777; text-decoration:none; }
`;

function shell(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="he" dir="rtl"><head><meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${title}</title><style>${STYLES}</style></head>
<body><div class="container">${body}</div></body></html>`;
}

function stat(label: string, value: string | number): string {
  return `<div class="stat">
    <div class="stat-label">${label}</div>
    <div class="stat-value">${value}</div>
  </div>`;
}

function alertBox(a: Alert): string {
  return `<div class="alert alert-${a.severity}">
    <strong>${a.title}</strong><br/>
    <span style="opacity:.85">${a.description}</span>
  </div>`;
}

export function renderDailyReport(data: DailyReportData): {
  subject: string;
  html: string;
} {
  const { metrics, alerts, trend } = data;
  const dateStr = new Date(metrics.date).toLocaleDateString("he-IL", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const trendArrow =
    trend.today >= trend.yesterday ? "↑" : "↓";
  const trendDiff = trend.today - trend.yesterday;

  const body = `
    <h1 class="h1">דוח יומי — ReGlow</h1>
    <p class="muted">${dateStr}</p>

    <div class="card">
      <div class="h2">סקירה</div>
      ${stat("משתמשות פעילות", `${metrics.activeUsers} ${trendArrow} (${trendDiff >= 0 ? "+" : ""}${trendDiff})`)}
      ${stat("חדשות שנרשמו", metrics.newUsers)}
      ${stat("תורים שנוצרו", metrics.appointmentsCreated)}
      ${stat("הכנסות (₪)", metrics.revenue)}
    </div>

    ${
      alerts.length > 0
        ? `<div class="card"><div class="h2">התראות</div>${alerts.map(alertBox).join("")}</div>`
        : `<div class="card"><div class="h2">התראות</div><p class="muted">אין התראות פעילות 🎉</p></div>`
    }

    <div class="footer">
      <a href="${process.env.NEXT_PUBLIC_APP_URL || "https://re-glow-vhp6.vercel.app"}/admin-analytics">פתחי דאשבורד</a><br/>
      ReGlow Analytics · ${new Date().getFullYear()}
    </div>
  `;

  return {
    subject: `ReGlow · דוח יומי ${dateStr} · ${metrics.activeUsers} פעילות, ${metrics.appointmentsCreated} תורים`,
    html: shell("ReGlow Daily", body),
  };
}

export function renderWeeklyReport(data: WeeklyReportData): {
  subject: string;
  html: string;
} {
  const { metrics, monthly, topBusinesses, inactiveCount } = data;

  const body = `
    <h1 class="h1">דוח שבועי — ReGlow</h1>
    <p class="muted">שבוע שמתחיל ב-${metrics.weekStart}</p>

    <div class="card">
      <div class="h2">שימור וצמיחה</div>
      ${stat("Retention 7d", `${metrics.retentionRate7d}%`)}
      ${stat("Churn", `${metrics.churnRate}%`)}
      ${stat("חדשות השבוע", metrics.newUsers)}
      ${stat("תורים חדשים", metrics.appointmentsCreated)}
    </div>

    <div class="card">
      <div class="h2">חודש נוכחי</div>
      ${stat("MRR (₪)", monthly.MRR)}
      ${stat("ARPU (₪)", monthly.ARPU)}
      ${stat("צמיחה", `${monthly.growthRatePct >= 0 ? "+" : ""}${monthly.growthRatePct}%`)}
      ${stat("מנויות בתשלום", monthly.paidUsers)}
    </div>

    ${
      topBusinesses.length > 0
        ? `<div class="card">
            <div class="h2">העסקים הפעילים ביותר</div>
            <ol style="padding-right:18px;margin:0">
              ${topBusinesses
                .map(
                  (b) =>
                    `<li style="padding:4px 0"><strong>${escapeHtml(b.businessName)}</strong> <span class="muted">— ${b.events} פעולות</span></li>`
                )
                .join("")}
            </ol>
          </div>`
        : ""
    }

    ${
      inactiveCount > 0
        ? `<div class="card"><div class="h2">התראה</div><div class="alert alert-warning"><strong>${inactiveCount} עסקים לא נכנסו 7+ ימים</strong><br/><span style="opacity:.85">פתחי את הדאשבורד וצרי קשר.</span></div></div>`
        : ""
    }

    <div class="footer">
      <a href="${process.env.NEXT_PUBLIC_APP_URL || "https://re-glow-vhp6.vercel.app"}/admin-analytics">פתחי דאשבורד</a><br/>
      ReGlow Analytics · ${new Date().getFullYear()}
    </div>
  `;

  return {
    subject: `ReGlow · דוח שבועי · MRR ₪${monthly.MRR} · Retention ${metrics.retentionRate7d}%`,
    html: shell("ReGlow Weekly", body),
  };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
