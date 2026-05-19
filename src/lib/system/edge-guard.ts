/**
 * Edge-safe system guard for middleware.
 * Only synchronous env checks — no DB on Edge.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSystemStateSync } from "@/lib/system/system-state-sync";

/** Paths that stay reachable when system is BLOCKED. */
const EXEMPT_PREFIXES = [
  "/api/health",
  "/api/system/status",
  "/api/setup/status",
  "/api/admin/kill-switch",
  "/api/demo/start",
  "/api/demo/status",
  "/api/demo/reset",
];

export function isExemptFromSystemGuard(pathname: string): boolean {
  return EXEMPT_PREFIXES.some((p) => pathname.startsWith(p));
}

export function checkApiSystemGuard(request: NextRequest): NextResponse | null {
  const { pathname } = request.nextUrl;

  if (!pathname.startsWith("/api/")) return null;
  if (isExemptFromSystemGuard(pathname)) return null;

  const snapshot = getSystemStateSync();
  if (snapshot.state !== "BLOCKED") return null;

  return NextResponse.json(
    {
      success: false,
      error: "SYSTEM_NOT_READY",
      code: "SYSTEM_NOT_READY",
      reason: snapshot.reason,
      reasons: snapshot.reasons,
    },
    { status: 503 }
  );
}
