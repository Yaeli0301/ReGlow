import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { requireAuthFromRequest } from "@/lib/api-auth";
import { User } from "@/models/User";
import { Referral } from "@/models/Referral";
import { generateReferralCode, buildReferralLink } from "@/lib/referral";

export async function GET(request: Request) {
  const auth = await requireAuthFromRequest(request);
  if (auth instanceof NextResponse) return auth;

  await connectDB();

  const dbUser = auth.dbUser;
  if (!dbUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  let user = dbUser;

  if (!user.referralCode) {
    let code = generateReferralCode();
    let exists = await User.findOne({ referralCode: code });
    while (exists) {
      code = generateReferralCode();
      exists = await User.findOne({ referralCode: code });
    }
    const updated = await User.findByIdAndUpdate(
      auth.user.id,
      { referralCode: code },
      { new: true }
    );
    if (updated) user = updated;
  }

  const referrals = await Referral.find({ referrerId: auth.user.id })
    .populate("referredUserId", "businessName subscriptionTier createdAt")
    .sort({ createdAt: -1 })
    .lean();

  const invited = referrals.length;
  const payingReferrals = referrals.filter((r) => {
    const referred = r.referredUserId as { subscriptionTier?: string } | null;
    return referred && ["basic", "pro", "premium"].includes(referred.subscriptionTier || "");
  }).length;
  const rewarded = referrals.filter((r) => r.status === "rewarded").length;
  const pending = referrals.filter((r) => r.status === "pending").length;

  const referralLink = buildReferralLink(user.referralCode);

  const response = NextResponse.json({
    referralCode: user.referralCode,
    referralLink,
    rewardMonthsAvailable: user.referralRewardMonths ?? 0,
    stats: {
      invited,
      payingReferrals,
      earnedRewards: rewarded,
      pending,
    },
    referrals: referrals.map((r) => {
      const referred = r.referredUserId as {
        businessName?: string;
        subscriptionTier?: string;
        createdAt?: Date;
      } | null;
      return {
        id: r._id.toString(),
        status: r.status,
        createdAt: r.createdAt,
        paidAt: r.paidAt,
        businessName: referred?.businessName || "—",
        subscriptionTier: referred?.subscriptionTier || "none",
        isPaying: ["basic", "pro", "premium"].includes(referred?.subscriptionTier || ""),
      };
    }),
  });

  response.headers.set("Cache-Control", "private, max-age=30, stale-while-revalidate=60");
  return response;
}
