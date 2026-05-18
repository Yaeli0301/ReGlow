import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { Referral } from "@/models/Referral";
import { buildSessionUser, signToken } from "@/lib/auth";
import { jsonWithAuthCookie } from "@/lib/auth-cookie";
import { authSuccessPayload } from "@/lib/auth-response";
import { generateReferralCode, normalizeReferralCode } from "@/lib/referral";
import { validateReferralForRegistration } from "@/lib/referral-rewards";
import { getOrCreateWeeklySchedule } from "@/lib/availability";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  businessName: z.string().min(2),
  referralCode: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { email, password, businessName, referralCode } = parsed.data;
    const emailLower = email.toLowerCase();

    await connectDB();

    const existing = await User.findOne({ email: emailLower });
    if (existing) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }

    let referredBy: string | undefined;
    let referrerId: string | undefined;

    if (referralCode) {
      const normalizedCode = normalizeReferralCode(referralCode);
      const validation = await validateReferralForRegistration(normalizedCode, emailLower);
      if (validation.error) {
        return NextResponse.json({ error: validation.error }, { status: 400 });
      }
      if (validation.valid && validation.referrerId) {
        referredBy = validation.referralCode;
        referrerId = validation.referrerId;
      }
    }

    let code = generateReferralCode();
    let codeExists = await User.findOne({ referralCode: code });
    while (codeExists) {
      code = generateReferralCode();
      codeExists = await User.findOne({ referralCode: code });
    }

    const hashed = await bcrypt.hash(password, 12);

    const user = await User.create({
      email: emailLower,
      password: hashed,
      businessName,
      subscriptionTier: "none",
      referralCode: code,
      referredBy,
    });

    await getOrCreateWeeklySchedule(user._id.toString());

    if (referrerId && referredBy) {
      await Referral.create({
        referrerId,
        referredUserId: user._id,
        referralCode: referredBy,
        status: "pending",
      });
    }

    const session = buildSessionUser(user);
    const token = signToken(session);

    return jsonWithAuthCookie(
      {
        ...authSuccessPayload(session, token),
        redirectTo: "/dashboard",
        message: "Account created successfully",
        referralApplied: !!referrerId,
      },
      token
    );
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}
