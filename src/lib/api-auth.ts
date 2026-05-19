import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getSession, getTokenFromHeader, verifyToken } from "@/lib/auth";
import { User, type IUser } from "@/models/User";
import type { SessionUser, UserRole } from "@/types";
import { hasActiveSubscription } from "@/lib/subscription";

export type AuthOptions = { loadDbUser?: boolean };

export type AuthResult = { user: SessionUser; dbUser?: IUser } | NextResponse;

async function resolveSessionFromRequest(request: Request): Promise<SessionUser | null> {
  const authHeader = request.headers.get("authorization");
  const bearerToken = getTokenFromHeader(authHeader);
  if (bearerToken) return verifyToken(bearerToken);
  return getSession();
}

async function loadDbUser(session: SessionUser): Promise<IUser | NextResponse> {
  const dbUser = await User.findById(session.id).select("-password").lean();
  if (!dbUser) {
    return NextResponse.json(
      { success: false, error: "User not found", code: "USER_NOT_FOUND" },
      { status: 401 }
    );
  }
  return dbUser as IUser;
}

function sessionFromDbUser(dbUser: IUser): SessionUser {
  return {
    id: dbUser._id.toString(),
    email: dbUser.email,
    businessName: dbUser.businessName,
    role: dbUser.role || "business",
    subscriptionTier: dbUser.subscriptionTier,
  };
}

/** Server actions / routes that need fresh DB fields (Stripe, referral). */
export async function requireAuth(options?: AuthOptions): Promise<AuthResult> {
  await connectDB();

  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { success: false, error: "Unauthorized", code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  if (!options?.loadDbUser) {
    return { user: session };
  }

  const dbUser = await loadDbUser(session);
  if (dbUser instanceof NextResponse) return dbUser;

  return { user: sessionFromDbUser(dbUser), dbUser };
}

/** Fast path: trust signed JWT. Pass `{ loadDbUser: true }` when DB fields are required. */
export async function requireAuthFromRequest(
  request: Request,
  options?: AuthOptions
): Promise<AuthResult> {
  await connectDB();

  const session = await resolveSessionFromRequest(request);
  if (!session) {
    return NextResponse.json(
      { success: false, error: "Unauthorized", code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  if (!options?.loadDbUser) {
    return { user: session };
  }

  const dbUser = await loadDbUser(session);
  if (dbUser instanceof NextResponse) return dbUser;

  return { user: sessionFromDbUser(dbUser), dbUser };
}

export function requireRole(user: SessionUser, role: UserRole): NextResponse | null {
  if (user.role !== role) {
    return NextResponse.json(
      { success: false, error: "Forbidden", code: "FORBIDDEN" },
      { status: 403 }
    );
  }
  return null;
}

export function requireSubscription(user: SessionUser): NextResponse | null {
  if (!hasActiveSubscription(user.subscriptionTier)) {
    return NextResponse.json(
      { success: false, error: "Active subscription required", code: "SUBSCRIPTION_REQUIRED" },
      { status: 403 }
    );
  }
  return null;
}
