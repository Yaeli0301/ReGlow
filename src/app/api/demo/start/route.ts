import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDB, connectLandingDemoDB } from "@/lib/mongodb";
import { canStartLandingDemo, shouldUseLandingDemoDatabase } from "@/lib/env";
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
    if (!canStartLandingDemo()) {
      throw new AppError({
        code: "DEMO_ONLY",
        message: "Demo start only in demo mode",
        userMessage:
          "הדגמה לא פעילה — הגדירי ENV_MODE=demo בשרת ReGlow והפעילי מחדש",
      });
    }

    const parsed = schema.safeParse(await request.json().catch(() => ({})));
    const plan: SubscriptionTier = parsed.success ? parsed.data.plan : "pro";

    if (shouldUseLandingDemoDatabase()) {
      await connectLandingDemoDB();
    } else {
      await connectDB();
    }
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
    if (
      error instanceof Error &&
      /MONGODB_URI_DEMO|Demo mode:|Database connection|ECONNREFUSED|querySrv/i.test(
        error.message
      )
    ) {
      return handleApiError(
        new AppError({
          code: "INTERNAL_ERROR",
          message: error.message,
          userMessage:
            "בעיית חיבור למסד הנתונים של ההדגמה. ודאי ש-MONGODB_URI_DEMO מוגדר ב-Vercel ועשית redeploy.",
          status: 503,
        }),
        "demo/start"
      );
    }
    return handleApiError(error, "demo/start");
  }
}
