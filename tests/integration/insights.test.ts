import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { connectTestDB, clearTestDB, disconnectTestDB } from "../helpers/db";
import { Event } from "@/models/Event";
import { User } from "@/models/User";
import { Insight } from "@/models/Insight";
import {
  detectDailyInsights,
  detectWeeklyInsights,
  detectMonthlyInsights,
  storeInsights,
  runAllInsights,
  getActiveInsights,
  resolveInsight,
  emitInstantInsight,
  periodKeyFor,
  THRESHOLDS,
} from "@/lib/analytics/insights-engine";

const DAY = 86_400_000;

function makeOid(suffix: string): string {
  return suffix.padStart(24, "0");
}

async function seedActiveUsers(count: number, at: Date) {
  const promises = Array.from({ length: count }, (_, i) =>
    Event.create({
      type: "user_logged_in",
      userId: makeOid(`a${i}`),
      businessId: makeOid(`a${i}`),
      createdAt: at,
    })
  );
  await Promise.all(promises);
}

describe("insights-engine", () => {
  beforeAll(async () => {
    await connectTestDB();
  });

  afterAll(async () => {
    await disconnectTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();
  });

  describe("daily detection", () => {
    it("detects usage drop > 15%", async () => {
      const yesterday = new Date(Date.now() - DAY);
      await seedActiveUsers(10, yesterday);
      await seedActiveUsers(3, new Date());

      const drafts = await detectDailyInsights();
      const drop = drafts.find((d) => d.metric === "activeUsers");
      expect(drop).toBeDefined();
      expect(drop!.type).toBe("alert");
      expect(drop!.delta).toBeLessThanOrEqual(-15);
      expect(drop!.recommendation).toBeTruthy();
    });

    it("does NOT fire when sample size is too small", async () => {
      const yesterday = new Date(Date.now() - DAY);
      await seedActiveUsers(2, yesterday);
      await seedActiveUsers(0, new Date());

      const drafts = await detectDailyInsights();
      const drop = drafts.find((d) => d.metric === "activeUsers");
      expect(drop).toBeUndefined();
    });

    it("classifies severity high for >=30% drop", async () => {
      const yesterday = new Date(Date.now() - DAY);
      await seedActiveUsers(20, yesterday);
      await seedActiveUsers(5, new Date());

      const drafts = await detectDailyInsights();
      const drop = drafts.find((d) => d.metric === "activeUsers")!;
      expect(drop.severity).toBe("high");
    });
  });

  describe("weekly detection", () => {
    it("fires retention insight when retention < 40%", async () => {
      // Setup: same users active last week, none active this week → 0% retention
      const prevWeek = new Date(Date.now() - 8 * DAY);
      const thisWeek = new Date();
      for (let i = 0; i < 5; i++) {
        await Event.create({
          type: "user_logged_in",
          userId: makeOid(`u${i}`),
          businessId: makeOid(`u${i}`),
          createdAt: prevWeek,
        });
      }
      // Only 1 of 5 returns this week
      await Event.create({
        type: "user_logged_in",
        userId: makeOid("u0"),
        businessId: makeOid("u0"),
        createdAt: thisWeek,
      });

      const drafts = await detectWeeklyInsights();
      const retention = drafts.find((d) => d.metric === "retention7d");
      expect(retention).toBeDefined();
      expect(retention!.type).toBe("insight");
    });

    it("fires activation recommendation when new users do not engage", async () => {
      const now = new Date();
      // Create 5 new users this week
      for (let i = 0; i < 5; i++) {
        await User.create({
          email: `new${i}@test.local`,
          password: "x".repeat(60),
          businessName: `Biz${i}`,
          role: "business",
          subscriptionTier: "none",
          referralCode: `REF${i}${Date.now()}`,
          createdAt: now,
        });
      }
      // Only one of them does meaningful activity
      await Event.create({
        type: "client_created",
        userId: makeOid("new1"),
        businessId: makeOid("new1"),
        createdAt: now,
      });

      const drafts = await detectWeeklyInsights();
      const activation = drafts.find((d) => d.metric === "activationRatio");
      expect(activation).toBeDefined();
      expect(activation!.type).toBe("recommendation");
      expect(activation!.recommendation).toMatch(/onboarding/);
    });
  });

  describe("monthly detection", () => {
    it("returns drafts shape without crashing on empty data", async () => {
      const drafts = await detectMonthlyInsights();
      expect(Array.isArray(drafts)).toBe(true);
    });
  });

  describe("storage + dedupe", () => {
    it("upserts the same insight twice without creating duplicates", async () => {
      const draft = {
        type: "alert" as const,
        severity: "medium" as const,
        title: "T",
        message: "M",
        metric: "activeUsers",
        period: "daily" as const,
        delta: -20,
      };

      const first = await storeInsights([draft]);
      const second = await storeInsights([draft]);

      expect(first.created.length).toBe(1);
      expect(first.updated).toBe(0);
      expect(second.created.length).toBe(0);
      expect(second.updated).toBe(1);

      const all = await Insight.find({ metric: "activeUsers" });
      expect(all.length).toBe(1);
    });

    it("periodKeyFor returns stable keys per bucket", () => {
      const d = new Date("2026-05-19T15:00:00Z");
      expect(periodKeyFor("daily", d)).toBe("2026-05-19");
      expect(periodKeyFor("monthly", d)).toBe("2026-05");
      expect(periodKeyFor("weekly", d).length).toBe(10);
    });

    it("resolveInsight marks resolved=true", async () => {
      const { created } = await storeInsights([
        {
          type: "insight",
          severity: "low",
          title: "x",
          message: "x",
          metric: "test",
          period: "daily",
        },
      ]);
      const id = created[0]._id.toString();
      const updated = await resolveInsight(id, "admin-1");
      expect(updated?.resolved).toBe(true);
      expect(updated?.resolvedBy).toBe("admin-1");
    });
  });

  describe("getActiveInsights", () => {
    it("excludes resolved insights and filters by type", async () => {
      await storeInsights([
        {
          type: "alert",
          severity: "high",
          title: "a",
          message: "a",
          metric: "m1",
          period: "daily",
        },
        {
          type: "recommendation",
          severity: "low",
          title: "b",
          message: "b",
          metric: "m2",
          period: "weekly",
        },
      ]);

      const alerts = await getActiveInsights({ type: "alert" });
      expect(alerts.length).toBe(1);
      expect(alerts[0].metric).toBe("m1");
    });
  });

  describe("runAllInsights", () => {
    it("returns separate buckets and identifies high-severity items", async () => {
      const yesterday = new Date(Date.now() - DAY);
      await seedActiveUsers(20, yesterday);
      await seedActiveUsers(5, new Date());

      const result = await runAllInsights();
      expect(result.daily.created.length + result.daily.updated).toBeGreaterThanOrEqual(1);
      // The 75% drop should produce at least one high-severity insight
      expect(result.newHighSeverity.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("emitInstantInsight", () => {
    it("creates an insight on first call and upserts on the second", async () => {
      const first = await emitInstantInsight({
        type: "alert",
        severity: "high",
        title: "boom",
        message: "boom",
        metric: "instant",
        period: "daily",
      });
      expect(first).not.toBeNull();

      const second = await emitInstantInsight({
        type: "alert",
        severity: "high",
        title: "boom2",
        message: "boom2",
        metric: "instant",
        period: "daily",
      });
      expect(second?._id.toString()).toBe(first?._id.toString());
      expect(second?.message).toBe("boom2");
    });
  });

  describe("THRESHOLDS sanity", () => {
    it("thresholds are reasonable defaults", () => {
      expect(THRESHOLDS.usageDropPct).toBeGreaterThan(0);
      expect(THRESHOLDS.retention7dMin).toBeLessThanOrEqual(100);
      expect(THRESHOLDS.mrrDropPct).toBeGreaterThan(0);
    });
  });
});

describe("insights digest email", () => {
  it("renderInsightsDigest produces RTL HTML with the correct count in subject", async () => {
    const { renderInsightsDigest } = await import("@/lib/analytics/report-generator");
    const { subject, html } = renderInsightsDigest([
      {
        type: "alert",
        severity: "high",
        title: "ירידה",
        message: "20%",
        metric: "activeUsers",
        period: "daily",
        recommendation: "שלחי קמפיין",
      },
      {
        type: "recommendation",
        severity: "low",
        title: "צמיחה",
        message: "+30%",
        metric: "newUsers",
        period: "weekly",
      },
    ]);
    expect(subject).toContain("2 תובנות");
    expect(subject).toContain("1 דחופות");
    expect(html).toContain("ירידה");
    expect(html).toContain("שלחי קמפיין");
    expect(html).toContain('dir="rtl"');
  });

  it("escapes HTML in titles and messages", async () => {
    const { renderInsightsDigest } = await import("@/lib/analytics/report-generator");
    const { html } = renderInsightsDigest([
      {
        type: "alert",
        severity: "high",
        title: "<script>alert(1)</script>",
        message: "&nbsp;",
        metric: "x",
        period: "daily",
      },
    ]);
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;");
  });
});
