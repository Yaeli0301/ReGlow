import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { buildSessionUser, maskEmail, signToken } from "@/lib/auth";
import { jsonWithAuthCookie } from "@/lib/auth-cookie";
import { authSuccessPayload } from "@/lib/auth-response";
import { isDemoMode } from "@/lib/env";
import { logger } from "@/lib/logger";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

async function parseLoginBody(request: Request) {
  const contentType = request.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    return { error: NextResponse.json({ error: "Content-Type חייב להיות application/json" }, { status: 400 }) };
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return {
      error: NextResponse.json(
        { error: "גוף הבקשה אינו JSON תקין", code: "INVALID_JSON" },
        { status: 400 }
      ),
    };
  }

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return {
      error: NextResponse.json(
        { error: "אימייל או סיסמה לא תקינים", code: "VALIDATION_ERROR" },
        { status: 400 }
      ),
    };
  }

  return { data: parsed.data };
}

export async function POST(request: Request) {
  try {
    const bodyResult = await parseLoginBody(request);
    if ("error" in bodyResult && bodyResult.error) return bodyResult.error;
    const { email, password } = bodyResult.data!;

    try {
      await connectDB();
    } catch (dbError) {
      logger.error("Login DB connection failed", {
        err: dbError instanceof Error ? dbError.message : String(dbError),
      });
      return NextResponse.json(
        {
          error:
            "לא ניתן להתחבר למסד הנתונים. ודאי ש-MongoDB פועל (או הגדירי ENV_MODE=demo לעבודה בלי Mongo).",
          code: "DATABASE_UNAVAILABLE",
        },
        { status: 503 }
      );
    }

    const emailLower = email.toLowerCase().trim();
    const user = await User.findOne({ email: emailLower });
    if (!user) {
      logger.info("Login attempt: user not found", { email: maskEmail(emailLower) });
      return NextResponse.json(
        { success: false, error: "אימייל או סיסמה שגויים", code: "INVALID_CREDENTIALS" },
        { status: 401 }
      );
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      logger.warn("Login attempt: invalid password", { email: maskEmail(emailLower) });
      return NextResponse.json(
        { success: false, error: "אימייל או סיסמה שגויים", code: "INVALID_CREDENTIALS" },
        { status: 401 }
      );
    }

    const session = buildSessionUser(user);
    logger.info("User logged in", {
      userId: session.id,
      role: session.role,
      tier: session.subscriptionTier,
    });
    let token: string;
    try {
      token = signToken(session);
    } catch (jwtError) {
      logger.error("JWT sign failed", {
        err: jwtError instanceof Error ? jwtError.message : String(jwtError),
      });
      return NextResponse.json(
        {
          error: "שגיאת הגדרות שרת (JWT_SECRET חסר או לא תקין)",
          code: "JWT_CONFIG_ERROR",
        },
        { status: 500 }
      );
    }

    return jsonWithAuthCookie(
      {
        ...authSuccessPayload(session, token),
        redirectTo: session.role === "admin" ? "/admin-dashboard" : "/dashboard",
        demo: isDemoMode(),
      },
      token
    );
  } catch (error) {
    logger.error("Login error", {
      err: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      {
        error: "שגיאת שרת בהתחברות. נסי שוב או הריצי npm run dev:clean",
        code: "LOGIN_SERVER_ERROR",
      },
      { status: 500 }
    );
  }
}
