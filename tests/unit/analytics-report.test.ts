import { describe, it, expect } from "vitest";
import {
  renderDailyReport,
  renderWeeklyReport,
} from "@/lib/analytics/report-generator";

describe("report-generator", () => {
  it("renderDailyReport produces RTL Hebrew HTML with stats", () => {
    const { subject, html } = renderDailyReport({
      metrics: {
        date: "2026-05-19",
        activeUsers: 12,
        newUsers: 3,
        appointmentsCreated: 8,
        revenue: 540,
      },
      alerts: [
        {
          severity: "warning",
          code: "ACTIVITY_DROP",
          title: "ירידה של 25% במשתמשות פעילות",
          description: "אתמול: 20, היום: 15",
        },
      ],
      trend: { today: 12, yesterday: 20 },
    });

    expect(subject).toContain("דוח יומי");
    expect(html).toContain('dir="rtl"');
    expect(html).toContain("12");
    expect(html).toContain("ירידה של 25%");
    expect(html).toContain("ירידה");
  });

  it("renderWeeklyReport includes MRR and top businesses", () => {
    const { subject, html } = renderWeeklyReport({
      metrics: {
        weekStart: "2026-05-13",
        retentionRate7d: 78.5,
        churnRate: 3.2,
        returningClients: 14,
        newUsers: 5,
        appointmentsCreated: 60,
      },
      monthly: {
        monthStart: "2026-05-01",
        MRR: 1500,
        ARPU: 150,
        LTV: 3000,
        growthRatePct: 12.5,
        paidUsers: 10,
      },
      topBusinesses: [
        { businessName: "Salon A", events: 120 },
        { businessName: "Salon B", events: 85 },
      ],
      inactiveCount: 2,
    });

    expect(subject).toContain("MRR");
    expect(html).toContain("Salon A");
    expect(html).toContain("78.5");
  });

  it("escapes HTML in business names", () => {
    const { html } = renderWeeklyReport({
      metrics: {
        weekStart: "2026-05-13",
        retentionRate7d: 0,
        churnRate: 0,
        returningClients: 0,
        newUsers: 0,
        appointmentsCreated: 0,
      },
      monthly: {
        monthStart: "2026-05-01",
        MRR: 0,
        ARPU: 0,
        LTV: 0,
        growthRatePct: 0,
        paidUsers: 0,
      },
      topBusinesses: [{ businessName: "<script>x</script>", events: 1 }],
      inactiveCount: 0,
    });
    expect(html).not.toContain("<script>x</script>");
    expect(html).toContain("&lt;script&gt;");
  });
});
