import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import { isDemoMode } from "@/lib/env";
import { User } from "@/models/User";
import { buildSessionUser, signToken, setAuthCookie } from "@/lib/auth";
import { authSuccessPayload } from "@/lib/auth-response";
import { DEMO_OWNER_EMAIL, ensureDemoSeeded } from "@/lib/seed/demo-seed";
import { AppError, handleApiError } from "@/lib/errors";
import type { SubscriptionTier } from "@/types";

const schema = z.object({
  plan: z.enum(["basic", "pro", "premium"]).default("pro"),
});

export async function POST(request: Request) {
  try {
    if (!isDemoMode()) {
      throw new AppError({
        code: "DEMO_ONLY",
        message: "Demo start only in demo mode",
        userMessage: "הדגמה זמינה רק במצב דמו (ENV_MODE=demo)",
      });
    }

    const parsed = schema.safeParse(await request.json().catch(() => ({})));
    const plan: SubscriptionTier = parsed.success ? parsed.data.plan : "pro";

    await connectDB();
    await ensureDemoSeeded();

    const user = await User.findOne({ email: DEMO_OWNER_EMAIL });
    if (!user) {
      return NextResponse.json(
        { error: "Demo user not found. Run seed." },
        { status: 404 }
      );
    }

    user.subscriptionTier = plan;
    await user.save();

    const session = buildSessionUser(user);
    const token = signToken(session);
    await setAuthCookie(token);

    return NextResponse.json({
      ...authSuccessPayload(session, token),
      demo: true,
      plan,
      redirectTo: "/dashboard",
    });
  } catch (error) {
    return handleApiError(error, "demo/start");
  }
}
