import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import type { SessionUser, SubscriptionTier, UserRole } from "@/types";

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not set");
  return secret;
}
const COOKIE_NAME = "reglow_token";
const MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export function signToken(payload: SessionUser): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: "7d" });
}

export function verifyToken(token: string): SessionUser | null {
  try {
    return jwt.verify(token, getJwtSecret()) as SessionUser;
  } catch {
    return null;
  }
}

export async function setAuthCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: MAX_AGE,
    path: "/",
  });
}

export function maskEmail(email: string): string {
  const [local = "", domain = ""] = email.split("@");
  if (!domain) return "***";
  const head = local.slice(0, 2);
  return `${head}***@${domain}`;
}

export async function clearAuthCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export function getTokenFromHeader(authHeader: string | null): string | null {
  if (!authHeader?.startsWith("Bearer ")) return null;
  return authHeader.slice(7);
}

export function buildSessionUser(user: {
  _id: { toString(): string };
  email: string;
  businessName: string;
  role?: UserRole;
  subscriptionTier: SubscriptionTier;
  adminOverride?: {
    tier?: SubscriptionTier;
    until?: Date | string | null;
  } | null;
}): SessionUser {
  // Lazy import avoids circular dep with subscription.ts → types
  const effective = (() => {
    const o = user.adminOverride;
    if (!o?.tier || o.tier === "none") return user.subscriptionTier;
    if (!o.until) return o.tier;
    const until = new Date(o.until);
    return Number.isFinite(until.getTime()) && until.getTime() > Date.now()
      ? o.tier
      : user.subscriptionTier;
  })();

  return {
    id: user._id.toString(),
    email: user.email,
    businessName: user.businessName,
    role: user.role || "business",
    subscriptionTier: effective,
  };
}

export { COOKIE_NAME };
