import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import { canRunDemoEndpoints, isDemoMode } from "@/lib/env";
import { jsonWithAuthCookie } from "@/lib/auth-cookie";
import { User } from "@/models/User";
import { buildSessionUser, signToken } from "@/lib/auth";
import { authSuccessPayload } from "@/lib/auth-response";
import { DEMO_OWNER_EMAIL, ensureDemoSeeded } from "@/lib/seed/demo-seed";
import { AppError, handleApiError } from "@/lib/errors";
import type { SubscriptionTier } from "@/types";

export const dynamic = "force-dynamic";

const schema = z.object({
  plan: z.enum(["basic", "pro", "premium"]).default("pro"),
});

export async function POST(request: Request) {
  try {
    if (!canRunDemoEndpoints()) {
      throw new AppError({
        code: "DEMO_ONLY",
        message: "Demo endpoints only on demo deployment",
        userMessage:
          "הדמו לא זמין באתר הזה — השתמשי בפרויקט הדמו הנפרד (קישור מדף הנחיתה החיצוני).",
      });
    }

    const parsed = schema.safeParse(await request.json().catch(() => ({})));
    const plan: SubscriptionTier = parsed.success ? parsed.data.plan : "pro";

    await connectDB();
    await ensureDemoSeeded();

    const user = await User.findOne({ email: DEMO_OWNER_EMAIL });
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Demo user not found. Run seed." },
        { status: 404 }
      );
    }

    user.subscriptionTier = plan;
    await user.save();

    const session = buildSessionUser(user);
    const token = signToken(session);

    return jsonWithAuthCookie(
      {
        ...authSuccessPayload(session, token),
        demo: true,
        plan,
        redirectTo: "/dashboard",
      },
      token
    );
  } catch (error) {
    if (isDemoMode() && error instanceof Error) {
      return handleApiError(
        new AppError({
          code: "INTERNAL_ERROR",
          message: error.message,
          userMessage: `שגיאת דמו: ${error.message}`,
          status: 500,
        }),
        "demo/start"
      );
    }
    return handleApiError(error, "demo/start");
  }
}
