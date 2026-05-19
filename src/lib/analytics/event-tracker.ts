/**
 * Fire-and-forget event tracking.
 *
 * Rules:
 * - NEVER awaited in API hot paths (use `trackEvent(...)` without await)
 * - Failures are swallowed and logged — must not break the caller
 * - `await connectDB()` is NOT required upstream; we connect lazily here
 */

import { connectDB } from "@/lib/mongodb";
import { logger } from "@/lib/logger";
import { Event, type EventType } from "@/models/Event";

interface TrackArgs {
  type: EventType;
  userId: string;
  businessId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Emits an event. Returns immediately; logging happens in the background.
 * Safe to call without `await` from any API route.
 */
export function trackEvent(args: TrackArgs): void {
  // Detach from caller's microtask: don't block the response
  void (async () => {
    try {
      if (!args.userId) return;
      await connectDB();
      await Event.create({
        type: args.type,
        userId: args.userId,
        businessId: args.businessId || args.userId,
        metadata: args.metadata,
      });
    } catch (error) {
      // Analytics failure must never propagate
      logger.warn("trackEvent failed", {
        type: args.type,
        err: error instanceof Error ? error.message : String(error),
      });
    }
  })();
}

/**
 * Batch tracker (used by cron snapshots). Returns a promise — callers may await.
 */
export async function trackEventSync(args: TrackArgs): Promise<void> {
  try {
    if (!args.userId) return;
    await connectDB();
    await Event.create({
      type: args.type,
      userId: args.userId,
      businessId: args.businessId || args.userId,
      metadata: args.metadata,
    });
  } catch (error) {
    logger.warn("trackEventSync failed", {
      type: args.type,
      err: error instanceof Error ? error.message : String(error),
    });
  }
}
