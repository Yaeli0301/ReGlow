import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { requireAuthFromRequest, requireRole } from "@/lib/api-auth";
import { handleApiError } from "@/lib/errors";
import { User } from "@/models/User";

export async function GET(request: Request) {
  try {
    const auth = await requireAuthFromRequest(request);
    if (auth instanceof NextResponse) return auth;
    const roleErr = requireRole(auth.user, "admin");
    if (roleErr) return roleErr;

    await connectDB();

    const users = await User.find()
      .select("email businessName role subscriptionTier adminOverride createdAt")
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();

    return NextResponse.json({
      success: true,
      users: users.map((u) => {
        const o = u.adminOverride;
        const overrideActive = Boolean(
          o?.tier &&
            o.tier !== "none" &&
            (!o.until || new Date(o.until).getTime() > Date.now())
        );
        return {
          id: u._id.toString(),
          email: u.email,
          businessName: u.businessName,
          role: u.role || "business",
          subscriptionTier: u.subscriptionTier,
          overrideActive,
          overrideTier: overrideActive ? o!.tier : null,
          overrideUntil: overrideActive && o?.until ? o.until : null,
          createdAt: u.createdAt,
        };
      }),
    });
  } catch (error) {
    return handleApiError(error, "admin/users");
  }
}
