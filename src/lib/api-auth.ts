import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getSession, getTokenFromHeader, verifyToken } from "@/lib/auth";
import { User, type IUser } from "@/models/User";
import type { SessionUser } from "@/types";
import { hasActiveSubscription } from "@/lib/subscription";

type AuthResult = { user: SessionUser; dbUser: IUser } | NextResponse;

export async function requireAuth(): Promise<AuthResult> {
  await connectDB();

  let session = await getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dbUser = await User.findById(session.id).select("-password");
  if (!dbUser) {
    return NextResponse.json({ error: "User not found" }, { status: 401 });
  }

  session = {
    id: dbUser._id.toString(),
    email: dbUser.email,
    businessName: dbUser.businessName,
    subscriptionTier: dbUser.subscriptionTier,
  };

  return { user: session, dbUser };
}

export async function requireAuthFromRequest(request: Request): Promise<AuthResult> {
  await connectDB();

  const authHeader = request.headers.get("authorization");
  const bearerToken = getTokenFromHeader(authHeader);

  let session: SessionUser | null = null;

  if (bearerToken) {
    session = verifyToken(bearerToken);
  } else {
    session = await getSession();
  }

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dbUser = await User.findById(session.id).select("-password");
  if (!dbUser) {
    return NextResponse.json({ error: "User not found" }, { status: 401 });
  }

  const user: SessionUser = {
    id: dbUser._id.toString(),
    email: dbUser.email,
    businessName: dbUser.businessName,
    subscriptionTier: dbUser.subscriptionTier,
  };

  return { user, dbUser };
}

export function requireSubscription(user: SessionUser): NextResponse | null {
  if (!hasActiveSubscription(user.subscriptionTier)) {
    return NextResponse.json(
      { error: "Active subscription required", code: "SUBSCRIPTION_REQUIRED" },
      { status: 403 }
    );
  }
  return null;
}
