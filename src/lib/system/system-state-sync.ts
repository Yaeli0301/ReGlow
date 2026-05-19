/**
 * Edge-safe system state (sync env checks only — no mongoose/DB).
 */

import { getLandingDemoMongoUri } from "@/lib/env";
import { validateEnv } from "@/lib/system/env-validator";
import { isProduction } from "@/lib/system/mode";
import type { SystemStateValue } from "@/lib/system/system-types";

export function getSystemStateSync(): {
  state: SystemStateValue;
  reason: string;
  reasons: string[];
} {
  const env = validateEnv();
  const reasons: string[] = [];

  if (env.blocking.length > 0) {
    reasons.push(...env.blocking);
  }

  if (isProduction()) {
    const jwt = process.env.JWT_SECRET?.trim();
    if (!jwt || jwt.length < 32) reasons.push("JWT_SECRET missing or too short");
    const mongo = process.env.MONGODB_URI?.trim();
    if (!mongo) reasons.push("MONGODB_URI missing");
  }

  if (reasons.length > 0) {
    return { state: "BLOCKED", reason: reasons[0], reasons };
  }

  if (env.degraded.length > 0) {
    return { state: "DEGRADED", reason: env.degraded[0], reasons: env.degraded };
  }

  if (!isProduction() && !getLandingDemoMongoUri() && !process.env.MONGODB_URI?.trim()) {
    return {
      state: "DEGRADED",
      reason: "Demo database URI not configured",
      reasons: ["Set MONGODB_URI_DEMO or MONGODB_URI"],
    };
  }

  return { state: "READY", reason: "All core checks passed", reasons: [] };
}
