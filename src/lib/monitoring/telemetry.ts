/**
 * Fire-and-forget system telemetry → system_logs collection.
 */

import { connectDB } from "@/lib/mongodb";
import {
  SystemLog,
  type SystemLogCategory,
  type SystemLogLevel,
} from "@/models/SystemLog";
import { logger } from "@/lib/logger";

export interface TelemetryEvent {
  level?: SystemLogLevel;
  category: SystemLogCategory;
  message: string;
  source?: string;
  durationMs?: number;
  statusCode?: number;
  meta?: Record<string, unknown>;
}

export function logTelemetry(event: TelemetryEvent): void {
  void (async () => {
    try {
      await connectDB();
      await SystemLog.create({
        level: event.level ?? "info",
        category: event.category,
        message: event.message,
        source: event.source,
        durationMs: event.durationMs,
        statusCode: event.statusCode,
        meta: event.meta,
      });
    } catch (error) {
      logger.warn("logTelemetry failed", {
        err: error instanceof Error ? error.message : String(error),
      });
    }
  })();
}

export function trackApiRequest(opts: {
  path: string;
  method: string;
  statusCode: number;
  durationMs: number;
  error?: string;
}): void {
  const level: SystemLogLevel =
    opts.statusCode >= 500 ? "error" : opts.statusCode >= 400 ? "warn" : "info";

  logTelemetry({
    level,
    category: "api",
    message: opts.error || `${opts.method} ${opts.path}`,
    source: opts.path,
    durationMs: opts.durationMs,
    statusCode: opts.statusCode,
    meta: { method: opts.method },
  });
}

export function trackLoginFailure(email?: string): void {
  logTelemetry({
    level: "warn",
    category: "auth",
    message: "Login failed",
    source: "auth/login",
    meta: email ? { email: email.slice(0, 3) + "***" } : {},
  });
}

export function trackStripeWebhookFailure(eventId: string, err: string): void {
  logTelemetry({
    level: "error",
    category: "stripe",
    message: `Webhook failed: ${err}`,
    source: "stripe/webhook",
    meta: { eventId },
  });
}

export function trackDbLatency(ms: number, source: string): void {
  if (ms < 500) return;
  logTelemetry({
    level: ms > 800 ? "warn" : "info",
    category: "db",
    message: `Slow DB operation (${ms}ms)`,
    source,
    durationMs: ms,
  });
}

export async function getRecentSystemLogs(limit = 20) {
  await connectDB();
  return SystemLog.find({})
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
}

export async function getErrorRateLastHour(): Promise<number> {
  await connectDB();
  const since = new Date(Date.now() - 60 * 60 * 1000);
  const [total, errors] = await Promise.all([
    SystemLog.countDocuments({ category: "api", createdAt: { $gte: since } }),
    SystemLog.countDocuments({
      category: "api",
      level: "error",
      createdAt: { $gte: since },
    }),
  ]);
  if (total === 0) return 0;
  return Math.round((errors / total) * 1000) / 10;
}
