/**
 * Server-side system guard — full state (DB + kill switch).
 */

import { NextResponse } from "next/server";
import { getSystemState, type SystemStateSnapshot } from "@/lib/system/system-state";
import { isExemptFromSystemGuard } from "@/middleware/system-guard";

export async function assertSystemReady(pathname: string): Promise<NextResponse | null> {
  if (isExemptFromSystemGuard(pathname)) return null;

  const snapshot = await getSystemState();
  if (snapshot.state !== "BLOCKED") return null;

  return systemNotReadyResponse(snapshot);
}

export function systemNotReadyResponse(snapshot: SystemStateSnapshot): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: "SYSTEM_NOT_READY",
      code: "SYSTEM_NOT_READY",
      reason: snapshot.reason,
      reasons: snapshot.reasons,
      state: snapshot.state,
    },
    { status: 503 }
  );
}

/** Wrap an API route handler with full system guard. */
export function withSystemGuard<T extends unknown[]>(
  handler: (request: Request, ...args: T) => Promise<NextResponse>
) {
  return async (request: Request, ...args: T): Promise<NextResponse> => {
    const url = new URL(request.url);
    const blocked = await assertSystemReady(url.pathname);
    if (blocked) return blocked;
    return handler(request, ...args);
  };
}
