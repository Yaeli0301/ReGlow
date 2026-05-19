/**
 * Multi-tenant safety helpers.
 * Every per-business DB query MUST scope by `userId`.
 * Use these helpers to make tenant filters explicit and harder to forget.
 */

import { NextResponse } from "next/server";
import type { SessionUser } from "@/types";

export interface TenantContext {
  userId: string;
  email: string;
  role: SessionUser["role"];
}

export function getTenantContext(user: SessionUser): TenantContext {
  if (!user?.id) {
    throw new Error("requireTenantContext: missing user.id");
  }
  return { userId: user.id, email: user.email, role: user.role };
}

/**
 * Returns a Mongo filter pre-scoped to the current tenant.
 * Usage:
 *   const filter = tenantFilter(auth.user, { status: "active" });
 *   await Client.find(filter);
 */
export function tenantFilter<T extends Record<string, unknown>>(
  user: SessionUser,
  extra: T = {} as T
): T & { userId: string } {
  const ctx = getTenantContext(user);
  return { ...extra, userId: ctx.userId };
}

/** Returns 403 if requested userId doesn't match the session user (and user isn't admin). */
export function assertOwnership(
  user: SessionUser,
  resourceUserId: string | undefined | null
): NextResponse | null {
  if (!resourceUserId) {
    return NextResponse.json(
      { success: false, error: "Forbidden", code: "TENANT_VIOLATION" },
      { status: 403 }
    );
  }
  if (user.role === "admin") return null;
  if (resourceUserId.toString() !== user.id) {
    return NextResponse.json(
      { success: false, error: "Forbidden", code: "TENANT_VIOLATION" },
      { status: 403 }
    );
  }
  return null;
}
