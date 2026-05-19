/**
 * Promote a user to admin (or create a new admin) via a one-shot setup call.
 * Protected with CRON_SECRET — never exposed publicly.
 *
 *   POST /api/setup/promote-admin
 *   Authorization: Bearer ${CRON_SECRET}
 *   { "email": "you@example.com", "password": "optional-if-new" }
 *
 * Behavior:
 *  - If user exists → set role=admin, subscriptionTier=premium.
 *  - If user does not exist AND password is provided → create with role=admin.
 *  - Returns { ok, action: "promoted" | "created" | "noop", email }.
 */

import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { generateReferralCode } from "@/lib/referral";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8).optional(),
  businessName: z.string().min(1).optional(),
});

function authorize(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret || secret.length < 16) return false;
  const auth = request.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

export async function POST(request: Request) {
  if (!authorize(request)) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const body = await request.json().catch(() => ({}));
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid input",
          details: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    const emailLower = parsed.data.email.toLowerCase().trim();
    await connectDB();

    const existing = await User.findOne({ email: emailLower });

    if (existing) {
      if (existing.role === "admin" && existing.subscriptionTier === "premium") {
        return NextResponse.json({
          success: true,
          action: "noop",
          email: emailLower,
          message: "User is already admin with premium tier",
        });
      }
      existing.role = "admin";
      existing.subscriptionTier = "premium";
      await existing.save();
      logger.info("User promoted to admin", { email: emailLower });
      return NextResponse.json({
        success: true,
        action: "promoted",
        email: emailLower,
      });
    }

    if (!parsed.data.password) {
      return NextResponse.json(
        {
          success: false,
          error: "User does not exist — supply password to create",
          code: "USER_NOT_FOUND",
        },
        { status: 404 }
      );
    }

    let code = generateReferralCode();
    while (await User.findOne({ referralCode: code })) {
      code = generateReferralCode();
    }
    const hash = await bcrypt.hash(parsed.data.password, 12);

    await User.create({
      email: emailLower,
      password: hash,
      businessName: parsed.data.businessName || "ReGlow Admin",
      role: "admin",
      subscriptionTier: "premium",
      referralCode: code,
    });

    logger.info("New admin user created", { email: emailLower });
    return NextResponse.json({
      success: true,
      action: "created",
      email: emailLower,
    });
  } catch (error) {
    logger.error("promote-admin failed", {
      err: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      {
        success: false,
        error: "Promote admin failed",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
