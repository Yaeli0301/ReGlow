import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import { isDemoMode } from "@/lib/env";
import { User } from "@/models/User";
import { buildSessionUser, signToken } from "@/lib/auth";
import { jsonWithAuthCookie } from "@/lib/auth-cookie";
import { authSuccessPayload } from "@/lib/auth-response";
import { DEMO_OWNER_EMAIL } from "@/lib/seed/demo-seed";
import { AppError } from "@/lib/errors";
import { handleApiError } from "@/lib/errors";

const schema = z.object({
  role: z.enum(["business", "admin"]).default("business"),
});

export async function POST(request: Request) {
  try {
    if (!isDemoMode()) {
      throw new AppError({
        code: "DEMO_ONLY",
        message: "Demo login only in demo mode",
        userMessage: "התחברות דמו זמינה רק במצב הדגמה",
      });
    }

    await connectDB();
    const parsed = schema.safeParse(await request.json().catch(() => ({})));
    const role = parsed.success ? parsed.data.role : "business";

    const email =
      role === "admin" ? "admin@reglow.local" : DEMO_OWNER_EMAIL;

    let user = await User.findOne({ email });
    if (!user && role === "business") {
      const { ensureDemoSeeded } = await import("@/lib/seed/demo-seed");
      await ensureDemoSeeded();
      user = await User.findOne({ email: DEMO_OWNER_EMAIL });
    }

    if (!user) {
      return NextResponse.json({ error: "Demo user not found. Run seed." }, { status: 404 });
    }

    const session = buildSessionUser(user);
    const token = signToken(session);

    return jsonWithAuthCookie(
      {
        ...authSuccessPayload(session, token),
        redirectTo: session.role === "admin" ? "/admin-dashboard" : "/dashboard",
        demo: true,
      },
      token
    );
  } catch (error) {
    return handleApiError(error, "auth/demo-login");
  }
}
