/**
 * Computes global system state: READY | DEGRADED | BLOCKED
 */

import { validateEnv } from "@/lib/system/env-validator";
import { getKillSwitchState } from "@/lib/system/kill-switch";
import { assertProductionNeverUsesInMemory } from "@/lib/system/mode";
import { getMongoUriOrThrow } from "@/lib/env";
import type { SystemStateSnapshot, SystemStateValue } from "@/lib/system/system-types";

export type { SystemStateValue, SystemStateSnapshot } from "@/lib/system/system-types";

let lastDbCheck: { ok: boolean; ms: number; at: number } | null = null;
const DB_CHECK_CACHE_MS = 15_000;

async function checkDatabase(): Promise<{ ok: boolean; ms: number; error?: string }> {
  if (lastDbCheck && Date.now() - lastDbCheck.at < DB_CHECK_CACHE_MS) {
    return { ok: lastDbCheck.ok, ms: lastDbCheck.ms };
  }

  const start = Date.now();
  try {
    assertProductionNeverUsesInMemory();
    const uri = getMongoUriOrThrow();
    if (!uri) throw new Error("MONGODB_URI missing");

    const mongoose = (await import("mongoose")).default;

    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.db?.admin().ping();
      const ms = Date.now() - start;
      lastDbCheck = { ok: true, ms, at: Date.now() };
      return { ok: true, ms };
    }

    const { connectDB } = await import("@/lib/mongodb");
    await connectDB();
    const ms = Date.now() - start;
    lastDbCheck = { ok: true, ms, at: Date.now() };
    return { ok: true, ms };
  } catch (error) {
    const ms = Date.now() - start;
    lastDbCheck = { ok: false, ms, at: Date.now() };
    return {
      ok: false,
      ms,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/** Sync env-only check (for Edge middleware — no DB). */
export { getSystemStateSync } from "@/lib/system/system-state-sync";

/** Full async state including DB + kill switch. */
export async function getSystemState(opts?: {
  skipDb?: boolean;
}): Promise<SystemStateSnapshot> {
  const env = validateEnv();
  const reasons: string[] = [];
  const degraded = [...env.degraded];

  let killSwitch = false;
  let dbOk = opts?.skipDb ?? false;

  if (!opts?.skipDb) {
    try {
      const { connectDB } = await import("@/lib/mongodb");
      await connectDB();
      const ks = await getKillSwitchState();
      killSwitch = ks.active;
      if (killSwitch) {
        reasons.push(ks.reason || "Kill switch active");
      }
    } catch {
      // DB not up — handled below
    }
  }

  if (env.blocking.length > 0) {
    reasons.push(...env.blocking);
  }

  if (!opts?.skipDb) {
    const db = await checkDatabase();
    dbOk = db.ok;
    if (!db.ok) {
      reasons.push(db.error || "Database connection failed");
    }
    if (db.ms > 800) {
      degraded.push(`Database latency high (${db.ms}ms)`);
    }
  }

  const stripeOk = !env.degraded.some((d) => d.startsWith("Stripe"));
  const cronOk = env.checks.find((c) => c.key === "CRON_SECRET")?.valid ?? false;
  const emailOk = !env.degraded.some((d) => d.startsWith("Email"));

  const checks = {
    env: env.valid,
    database: dbOk,
    killSwitch: !killSwitch,
    stripe: stripeOk,
    cron: cronOk,
    email: emailOk,
  };

  let state: SystemStateValue = "READY";
  let reason = "System operational";

  if (reasons.length > 0) {
    state = "BLOCKED";
    reason = reasons[0];
  } else if (degraded.length > 0) {
    state = "DEGRADED";
    reason = degraded[0];
  }

  return {
    state,
    reason,
    reasons,
    degraded,
    checks,
    timestamp: new Date().toISOString(),
  };
}

export function invalidateDbHealthCache(): void {
  lastDbCheck = null;
}
