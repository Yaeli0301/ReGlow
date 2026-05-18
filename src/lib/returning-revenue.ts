const RETURN_GAP_MS = 30 * 24 * 60 * 60 * 1000;

export interface CompletedVisitRow {
  clientId: { toString(): string };
  date: Date;
  finalPrice?: number;
}

/** Single-pass returning visits/revenue for a month (replaces per-appointment DB lookups). */
export function computeReturningMetrics(
  monthStart: Date,
  allCompletedSorted: CompletedVisitRow[]
): { returningRevenue: number; returningVisits: number } {
  const lastByClient = new Map<string, Date>();
  let returningRevenue = 0;
  let returningVisits = 0;

  for (const appt of allCompletedSorted) {
    const cid = appt.clientId.toString();
    const d = new Date(appt.date);
    const prior = lastByClient.get(cid);
    const gap = prior ? d.getTime() - prior.getTime() : RETURN_GAP_MS + 1;

    if (d >= monthStart && gap > RETURN_GAP_MS) {
      returningVisits++;
      returningRevenue += appt.finalPrice ?? 0;
    }
    lastByClient.set(cid, d);
  }

  return { returningRevenue, returningVisits };
}
