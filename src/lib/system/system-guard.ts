/**
 * Server-side system guard — full state (DB + kill switch).
 */

import { NextResponse } from "next/server";
import { getSystemState, type SystemStateSnapshot } from "@/lib/system/system-state";
import { isExemptFromSystemGuard } from "@/lib/system/edge-guard";

export async function assertSystemReady(pathname: string): Promise<NextResponse | null> {
  if (isExemptFromSystemGuard(pathname)) return null;

  const snapshot = await getSystemState();
  if (snapshot.state !== "BLOCKED") return null;

  return systemNotReadyResponse(snapshot);
}

export function systemNotReadyResponse(snapshot: SystemStateSnapshot): NextResponse {
  const reason = snapshot.reason || snapshot.reasons[0] || "המערכת לא מוכנה";
  const userMessage =
    reason.includes("JWT_SECRET")
      ? "הגדרות שרת חסרות (JWT_SECRET ב-Vercel — לפחות 32 תווים)."
      : reason.includes("MONGODB_URI")
        ? "מסד הנתונים לא מוגדר. בדקי MONGODB_URI ב-Vercel."
        : reason.includes("Database") || reason.includes("Mongo")
          ? "לא ניתן להתחבר ל-MongoDB. ב-Atlas: Network Access → 0.0.0.0/0."
          : `המערכת לא זמינה: ${reason}`;

  return NextResponse.json(
    {
      success: false,
      error: userMessage,
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
