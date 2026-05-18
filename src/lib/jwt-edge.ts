import { jwtVerify } from "jose";
import type { SessionUser } from "@/types";

function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not set");
  return new TextEncoder().encode(secret);
}

/** Verify JWT in Edge middleware (jose). */
export async function verifyTokenEdge(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    const id = payload.id as string | undefined;
    const email = payload.email as string | undefined;
    if (!id || !email) return null;
    return {
      id,
      email,
      businessName: (payload.businessName as string) || "ReGlow",
      role: (payload.role as SessionUser["role"]) || "business",
      subscriptionTier:
        (payload.subscriptionTier as SessionUser["subscriptionTier"]) || "none",
    };
  } catch {
    return null;
  }
}
