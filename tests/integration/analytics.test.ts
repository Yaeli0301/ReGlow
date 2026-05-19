import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { connectTestDB, clearTestDB, disconnectTestDB } from "../helpers/db";
import { Event } from "@/models/Event";
import { User } from "@/models/User";
import { Appointment } from "@/models/Appointment";
import { trackEventSync, trackEvent } from "@/lib/analytics/event-tracker";
import {
  getDailyMetrics,
  getWeeklyMetrics,
  getMonthlyMetrics,
  getEventTimeSeries,
} from "@/lib/analytics/metrics-service";
import { detectAnomalies } from "@/lib/analytics/anomaly-detector";
import {
  saveSnapshot,
  getLatestSnapshot,
} from "@/lib/analytics/retention-engine";

describe("analytics module", () => {
  beforeAll(async () => {
    await connectTestDB();
  });

  afterAll(async () => {
    await disconnectTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();
  });

  it("trackEventSync persists an event", async () => {
    const userId = "507f1f77bcf86cd799439011";
    await trackEventSync({
      type: "user_logged_in",
      userId,
      metadata: { test: true },
    });

    const events = await Event.find({ userId });
    expect(events.length).toBe(1);
    expect(events[0].type).toBe("user_logged_in");
    expect(events[0].businessId).toBe(userId);
  });

  it("trackEvent (fire-and-forget) does not throw on invalid input", () => {
    expect(() => trackEvent({ type: "user_logged_in", userId: "" })).not.toThrow();
  });

  it("getDailyMetrics returns correct shape", async () => {
    const result = await getDailyMetrics(new Date());
    expect(result).toMatchObject({
      date: expect.any(String),
      activeUsers: expect.any(Number),
      newUsers: expect.any(Number),
      appointmentsCreated: expect.any(Number),
      revenue: expect.any(Number),
    });
  });

  it("getWeeklyMetrics returns correct shape", async () => {
    const result = await getWeeklyMetrics(new Date());
    expect(result).toMatchObject({
      weekStart: expect.any(String),
      retentionRate7d: expect.any(Number),
      churnRate: expect.any(Number),
      returningClients: expect.any(Number),
      newUsers: expect.any(Number),
      appointmentsCreated: expect.any(Number),
    });
  });

  it("getMonthlyMetrics returns correct shape", async () => {
    const result = await getMonthlyMetrics(new Date());
    expect(result).toMatchObject({
      monthStart: expect.any(String),
      MRR: expect.any(Number),
      ARPU: expect.any(Number),
      LTV: expect.any(Number),
      growthRatePct: expect.any(Number),
      paidUsers: expect.any(Number),
    });
  });

  it("MRR reflects paid tier population", async () => {
    await User.create({
      email: "biz1@test.local",
      password: "x".repeat(60),
      businessName: "Biz1",
      role: "business",
      subscriptionTier: "pro",
      referralCode: "ABCD1234",
    });
    await User.create({
      email: "biz2@test.local",
      password: "x".repeat(60),
      businessName: "Biz2",
      role: "business",
      subscriptionTier: "basic",
      referralCode: "ABCD5678",
    });

    const monthly = await getMonthlyMetrics(new Date());
    expect(monthly.MRR).toBe(199 + 99);
    expect(monthly.paidUsers).toBe(2);
  });

  it("getEventTimeSeries returns one point per day", async () => {
    const userId = "507f1f77bcf86cd799439012";
    await trackEventSync({ type: "user_logged_in", userId });
    await trackEventSync({ type: "user_logged_in", userId });

    const series = await getEventTimeSeries("user_logged_in", 7);
    expect(series.length).toBe(7);
    const total = series.reduce((s, p) => s + p.value, 0);
    expect(total).toBe(2);
  });

  it("detectAnomalies returns an array (never throws)", async () => {
    const anomalies = await detectAnomalies();
    expect(Array.isArray(anomalies)).toBe(true);
  });

  it("snapshot save + load round-trip", async () => {
    await saveSnapshot("daily", new Date(), { activeUsers: 42, newUsers: 3 });
    const latest = await getLatestSnapshot("daily");
    expect(latest).not.toBeNull();
    expect((latest!.metrics as { activeUsers?: number }).activeUsers).toBe(42);
  });

  it("activeUsers counts distinct users not raw events", async () => {
    const u1 = "507f1f77bcf86cd799439013";
    const u2 = "507f1f77bcf86cd799439014";
    await trackEventSync({ type: "user_logged_in", userId: u1 });
    await trackEventSync({ type: "user_logged_in", userId: u1 });
    await trackEventSync({ type: "user_logged_in", userId: u2 });

    const daily = await getDailyMetrics(new Date());
    expect(daily.activeUsers).toBe(2);
  });

  it("appointmentsCreated counts only today", async () => {
    const userId = "507f1f77bcf86cd799439015";
    await Appointment.create({
      userId,
      clientId: "507f1f77bcf86cd799439016",
      date: new Date(),
      status: "scheduled",
    });
    const daily = await getDailyMetrics(new Date());
    expect(daily.appointmentsCreated).toBeGreaterThanOrEqual(1);
  });
});
