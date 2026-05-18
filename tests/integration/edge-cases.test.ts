import { describe, it, expect } from "vitest";
import { intervalsOverlap } from "@/lib/scheduling-pure";
import { buildPriceBreakdown } from "@/lib/pricing";
import { transitionPaymentStatus } from "@/lib/payment-transitions";
import { AppError } from "@/lib/errors";

describe("edge cases", () => {
  it("overlapping services same time window", () => {
    const t = new Date("2026-06-01T14:00:00");
    expect(intervalsOverlap(t, 60, t, 45)).toBe(true);
    expect(intervalsOverlap(t, 30, new Date("2026-06-01T15:00:00"), 30)).toBe(false);
  });

  it("invalid price input rejected", () => {
    expect(() => buildPriceBreakdown({ basePrice: -1 })).toThrow(AppError);
  });

  it("failed payment transition", () => {
    expect(transitionPaymentStatus("pending", "mark_failed")).toBe("failed");
  });

  it("missing duration uses fallback in pure resolver", async () => {
    const { resolveDurationMinutes } = await import("@/lib/scheduling-pure");
    expect(resolveDurationMinutes(null)).toBe(60);
  });
});
