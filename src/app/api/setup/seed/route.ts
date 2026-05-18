import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { generateReferralCode } from "@/lib/referral";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const SEED_USERS = [
  {
    email: "demo@reglow.local",
    password: "Demo1234!",
    businessName: "סלון דמו ReGlow",
    role: "business" as const,
  },
  {
    email: "admin@reglow.local",
    password: "Demo1234!",
    businessName: "ReGlow Admin",
    role: "admin" as const,
  },
];

function authorize(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret || secret.length < 16) return false;
  const auth = request.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

/** One-time bootstrap after deploy: POST with Authorization: Bearer $CRON_SECRET */
export async function POST(request: Request) {
  if (!authorize(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectDB();
    const created: string[] = [];

    for (const u of SEED_USERS) {
      const existing = await User.findOne({ email: u.email });
      const hash = await bcrypt.hash(u.password, 12);
      if (existing) {
        existing.password = hash;
        existing.businessName = u.businessName;
        existing.role = u.role;
        existing.subscriptionTier = "premium";
        await existing.save();
        created.push(`${u.email} (updated)`);
        continue;
      }

      let code = generateReferralCode();
      while (await User.findOne({ referralCode: code })) {
        code = generateReferralCode();
      }

      await User.create({
        email: u.email,
        password: hash,
        businessName: u.businessName,
        role: u.role,
        subscriptionTier: "premium",
        referralCode: code,
      });
      created.push(`${u.email} (created)`);
    }

    return NextResponse.json({
      ok: true,
      users: created,
      login: { email: "demo@reglow.local", password: "Demo1234!" },
    });
  } catch (error) {
    console.error("setup/seed:", error);
    return NextResponse.json(
      {
        error: "Seed failed",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
