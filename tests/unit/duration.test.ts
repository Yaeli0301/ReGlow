import { describe, it, expect } from "vitest";
import {
  resolveDurationMinutes,
  assertPositiveDuration,
  intervalsOverlap,
} from "@/lib/scheduling-pure";

describe("duration", () => {
  it("uses service duration when valid", () => {
    expect(resolveDurationMinutes(45)).toBe(45);
  });

  it("falls back when missing", () => {
    expect(resolveDurationMinutes(undefined)).toBe(60);
    expect(resolveDurationMinutes(0)).toBe(60);
    expect(resolveDurationMinutes(-5)).toBe(60);
  });

  it("throws on invalid duration assert", () => {
    expect(() => assertPositiveDuration(0)).toThrow("MISSING_DURATION");
  });

  it("detects overlapping appointments", () => {
    const a = new Date("2026-05-20T10:00:00");
    const b = new Date("2026-05-20T10:30:00");
    expect(intervalsOverlap(a, 60, b, 60)).toBe(true);
    expect(intervalsOverlap(a, 30, b, 30)).toBe(false);
  });
});
