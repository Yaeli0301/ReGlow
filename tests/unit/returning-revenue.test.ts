import { describe, expect, it } from "vitest";
import { computeReturningMetrics } from "@/lib/returning-revenue";

describe("computeReturningMetrics", () => {
  const monthStart = new Date("2026-05-01T00:00:00Z");

  it("counts a visit after 30+ day gap in the current month", () => {
    const rows = [
      {
        clientId: { toString: () => "c1" },
        date: new Date("2026-04-01"),
        finalPrice: 100,
      },
      {
        clientId: { toString: () => "c1" },
        date: new Date("2026-05-10"),
        finalPrice: 200,
      },
    ];

    const result = computeReturningMetrics(monthStart, rows);
    expect(result.returningVisits).toBe(1);
    expect(result.returningRevenue).toBe(200);
  });

  it("ignores same-month repeat visits within 30 days", () => {
    const rows = [
      {
        clientId: { toString: () => "c1" },
        date: new Date("2026-05-05"),
        finalPrice: 100,
      },
      {
        clientId: { toString: () => "c1" },
        date: new Date("2026-05-20"),
        finalPrice: 150,
      },
    ];

    const result = computeReturningMetrics(monthStart, rows);
    expect(result.returningVisits).toBe(1);
    expect(result.returningRevenue).toBe(100);
  });
});
