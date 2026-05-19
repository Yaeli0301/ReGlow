/**
 * Kill switch — stored in MongoDB, cached in-memory per instance.
 */

import { SystemConfig, SYSTEM_CONFIG_KEY } from "@/models/SystemConfig";

const CACHE_TTL_MS = 30_000;

let cache: { active: boolean; reason?: string; expires: number } | null = null;

export async function getKillSwitchState(): Promise<{
  active: boolean;
  reason?: string;
}> {
  if (cache && cache.expires > Date.now()) {
    return { active: cache.active, reason: cache.reason };
  }

  try {
    const doc = await SystemConfig.findOne({ key: SYSTEM_CONFIG_KEY }).lean();
    const active = doc?.killSwitchActive ?? false;
    const reason = doc?.killSwitchReason;
    cache = { active, reason, expires: Date.now() + CACHE_TTL_MS };
    return { active, reason };
  } catch {
    return { active: false };
  }
}

export function invalidateKillSwitchCache(): void {
  cache = null;
}

export async function setKillSwitch(
  active: boolean,
  opts?: { reason?: string; updatedBy?: string }
): Promise<void> {
  await SystemConfig.findOneAndUpdate(
    { key: SYSTEM_CONFIG_KEY },
    {
      $set: {
        killSwitchActive: active,
        killSwitchReason: active ? opts?.reason || "Maintenance" : undefined,
        updatedBy: opts?.updatedBy,
      },
    },
    { upsert: true, new: true }
  );
  invalidateKillSwitchCache();
}
