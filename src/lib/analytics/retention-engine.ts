/**
 * Analytics retention engine.
 * (Distinct from `src/lib/retention-engine.ts` which handles per-CLIENT retention.)
 *
 * Tracks USER (business owner) activity and produces snapshots:
 *   - which businesses are inactive (no login 7+ days)
 *   - which clients went lost in the period
 */

import { connectDB } from "@/lib/mongodb";
import { Event } from "@/models/Event";
import { User } from "@/models/User";
import { Client } from "@/models/Client";
import { AnalyticsSnapshot, type SnapshotKind } from "@/models/AnalyticsSnapshot";
import { logger } from "@/lib/logger";
import { startOfDay, DAY_MS } from "@/lib/analytics/metrics-service";

const USER_INACTIVE_DAYS = 7;
const CLIENT_INACTIVE_DAYS = 30;

export interface InactiveBusiness {
  userId: string;
  businessName: string;
  email: string;
  daysSinceLastLogin: number;
}

export async function detectInactiveBusinesses(): Promise<InactiveBusiness[]> {
  await connectDB();
  const cutoff = new Date(Date.now() - USER_INACTIVE_DAYS * DAY_MS);

  const businesses = await User.find({ role: "business" })
    .select("_id email businessName")
    .lean();

  const out: InactiveBusiness[] = [];

  for (const biz of businesses) {
    const lastLogin = await Event.findOne({
      userId: biz._id.toString(),
      type: "user_logged_in",
    })
      .sort({ createdAt: -1 })
      .select("createdAt")
      .lean();

    const lastDate = lastLogin?.createdAt || biz.createdAt;
    if (!lastDate || new Date(lastDate) < cutoff) {
      const days = Math.floor((Date.now() - new Date(lastDate).getTime()) / DAY_MS);
      out.push({
        userId: biz._id.toString(),
        businessName: biz.businessName || "—",
        email: biz.email,
        daysSinceLastLogin: days,
      });
    }
  }

  return out.sort((a, b) => b.daysSinceLastLogin - a.daysSinceLastLogin);
}

export interface ClientRetentionStats {
  totalClients: number;
  activeClients: number;
  atRiskClients: number;
  lostClients: number;
  lostInLast7Days: number;
}

export async function getClientRetentionStats(): Promise<ClientRetentionStats> {
  await connectDB();
  const now = Date.now();
  const cutoffLost = new Date(now - CLIENT_INACTIVE_DAYS * DAY_MS);
  const recent = new Date(now - 7 * DAY_MS);

  const [total, lost, lostRecently, active, atRisk] = await Promise.all([
    Client.countDocuments({}),
    Client.countDocuments({ lastVisitDate: { $lt: cutoffLost } }),
    Client.countDocuments({
      lastVisitDate: { $lt: cutoffLost, $gte: recent },
    }),
    Client.countDocuments({ lastVisitDate: { $gte: new Date(now - 14 * DAY_MS) } }),
    Client.countDocuments({
      lastVisitDate: {
        $gte: cutoffLost,
        $lt: new Date(now - 14 * DAY_MS),
      },
    }),
  ]);

  return {
    totalClients: total,
    activeClients: active,
    atRiskClients: atRisk,
    lostClients: lost,
    lostInLast7Days: lostRecently,
  };
}

/* ---------------------------------------------------------------------------
 * SNAPSHOT STORAGE (avoids real-time computation)
 * ------------------------------------------------------------------------- */

export async function saveSnapshot(
  kind: SnapshotKind,
  periodStart: Date,
  metrics: Record<string, unknown>
): Promise<void> {
  await connectDB();
  try {
    await AnalyticsSnapshot.findOneAndUpdate(
      { kind, periodStart: startOfDay(periodStart) },
      { $set: { metrics } },
      { upsert: true, new: true }
    );
  } catch (error) {
    logger.warn("saveSnapshot failed", {
      kind,
      err: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function getLatestSnapshot(
  kind: SnapshotKind
): Promise<{ periodStart: Date; metrics: Record<string, unknown> } | null> {
  await connectDB();
  const snap = await AnalyticsSnapshot.findOne({ kind })
    .sort({ periodStart: -1 })
    .lean();
  if (!snap) return null;
  return { periodStart: snap.periodStart, metrics: snap.metrics };
}

export async function getSnapshotsSince(
  kind: SnapshotKind,
  since: Date
): Promise<Array<{ periodStart: Date; metrics: Record<string, unknown> }>> {
  await connectDB();
  return AnalyticsSnapshot.find({ kind, periodStart: { $gte: since } })
    .sort({ periodStart: 1 })
    .lean();
}

export { USER_INACTIVE_DAYS, CLIENT_INACTIVE_DAYS };
