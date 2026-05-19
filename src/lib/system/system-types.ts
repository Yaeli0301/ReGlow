/** Shared types — safe for Edge middleware (no Node/Mongo imports). */

export type SystemStateValue = "READY" | "DEGRADED" | "BLOCKED";

export interface SystemStateSnapshot {
  state: SystemStateValue;
  reason: string;
  reasons: string[];
  degraded: string[];
  checks: {
    env: boolean;
    database: boolean;
    killSwitch: boolean;
    stripe: boolean;
    cron: boolean;
    email: boolean;
  };
  timestamp: string;
}
