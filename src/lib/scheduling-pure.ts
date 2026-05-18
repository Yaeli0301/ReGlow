/** Pure scheduling helpers — unit-testable without DB. */

export function rangesOverlap(
  aStart: number,
  aEnd: number,
  bStart: number,
  bEnd: number
): boolean {
  return aStart < bEnd && bStart < aEnd;
}

export function appointmentRangeMs(start: Date, durationMinutes: number): {
  startMs: number;
  endMs: number;
} {
  const startMs = start.getTime();
  return { startMs, endMs: startMs + durationMinutes * 60_000 };
}

export function intervalsOverlap(
  aStart: Date,
  aDurationMin: number,
  bStart: Date,
  bDurationMin: number
): boolean {
  const a = appointmentRangeMs(aStart, aDurationMin);
  const b = appointmentRangeMs(bStart, bDurationMin);
  return a.startMs < b.endMs && b.startMs < a.endMs;
}

export function resolveDurationMinutes(
  serviceDuration: number | null | undefined,
  fallback = 60
): number {
  if (typeof serviceDuration === "number" && Number.isFinite(serviceDuration) && serviceDuration > 0) {
    return Math.round(serviceDuration);
  }
  return fallback;
}

export function assertPositiveDuration(duration: number): void {
  if (!Number.isFinite(duration) || duration <= 0) {
    throw new Error("MISSING_DURATION");
  }
}
