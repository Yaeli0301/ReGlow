import { NextResponse } from "next/server";
import { getSystemState } from "@/lib/system/system-state";
import { getAppMode } from "@/lib/system/mode";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Public system status — used by frontend maintenance banner. */
export async function GET() {
  try {
    const snapshot = await getSystemState();
    return NextResponse.json({
      success: true,
      state: snapshot.state,
      reason: snapshot.reason,
      reasons: snapshot.reasons,
      degraded: snapshot.degraded,
      checks: snapshot.checks,
      mode: getAppMode(),
      maintenance: snapshot.state === "BLOCKED",
      timestamp: snapshot.timestamp,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        state: "BLOCKED",
        maintenance: true,
        reason: error instanceof Error ? error.message : "System check failed",
      },
      { status: 503 }
    );
  }
}
