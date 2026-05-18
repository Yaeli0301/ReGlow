import { Referral } from "@/models/Referral";
import { User } from "@/models/User";
import type { SubscriptionTier } from "@/types";
import { MAX_REFERRALS_PER_REFERRER } from "@/lib/referral";

const PAID_TIERS: SubscriptionTier[] = ["basic", "pro", "premium"];

export interface ReferralRegistrationResult {
  valid: boolean;
  referrerId?: string;
  referralCode?: string;
  error?: string;
}

/** Validate referral code at registration and prevent abuse. */
export async function validateReferralForRegistration(
  referralCodeInput: string | undefined,
  newUserEmail: string
): Promise<ReferralRegistrationResult> {
  if (!referralCodeInput?.trim()) {
    return { valid: false };
  }

  const code = referralCodeInput.trim().toUpperCase();
  const referrer = await User.findOne({ referralCode: code });

  if (!referrer) {
    return { valid: false, error: "קוד הפניה לא תקין" };
  }

  if (referrer.email.toLowerCase() === newUserEmail.toLowerCase()) {
    return { valid: false, error: "לא ניתן להשתמש בקוד הפניה עבור החשבון שלך" };
  }

  const pendingCount = await Referral.countDocuments({
    referrerId: referrer._id,
    status: "pending",
  });

  if (pendingCount >= MAX_REFERRALS_PER_REFERRER) {
    return { valid: false, error: "קוד ההפניה אינו פעיל כרגע" };
  }

  return {
    valid: true,
    referrerId: referrer._id.toString(),
    referralCode: referrer.referralCode,
  };
}

/**
 * Award referrer when referred user completes first paid subscription.
 * Idempotent via stripeEventId and rewardApplied flag.
 */
export async function processReferralReward(params: {
  referredUserId: string;
  tier: SubscriptionTier;
  stripeEventId?: string;
}): Promise<{ awarded: boolean; reason?: string }> {
  if (!PAID_TIERS.includes(params.tier)) {
    return { awarded: false, reason: "not_paid_tier" };
  }

  const referral = await Referral.findOne({
    referredUserId: params.referredUserId,
    status: "pending",
    rewardApplied: false,
  });

  if (!referral) {
    return { awarded: false, reason: "no_pending_referral" };
  }

  if (params.stripeEventId && referral.stripeEventId === params.stripeEventId) {
    return { awarded: false, reason: "already_processed" };
  }

  const referrer = await User.findById(referral.referrerId);
  const referred = await User.findById(params.referredUserId);

  if (!referrer || !referred) {
    return { awarded: false, reason: "user_not_found" };
  }

  // Circular abuse: referrer was referred by this new paying user
  if (referrer.referredBy && referred.referralCode === referrer.referredBy) {
    referral.status = "rejected";
    referral.rejectReason = "circular_referral";
    referral.rewardApplied = false;
    await referral.save();
    return { awarded: false, reason: "circular_referral" };
  }

  // Self-referral guard
  if (referral.referrerId.toString() === params.referredUserId) {
    return { awarded: false, reason: "self_referral" };
  }

  const updated = await Referral.findOneAndUpdate(
    {
      _id: referral._id,
      status: "pending",
      rewardApplied: false,
    },
    {
      status: "rewarded",
      rewardApplied: true,
      paidAt: new Date(),
      subscriptionTierAtReward: params.tier,
      ...(params.stripeEventId && { stripeEventId: params.stripeEventId }),
    },
    { new: true }
  );

  if (!updated) {
    return { awarded: false, reason: "race_condition" };
  }

  await User.findByIdAndUpdate(referral.referrerId, {
    $inc: { referralRewardMonths: 1 },
  });

  return { awarded: true };
}

/** Consume one banked reward month when referrer checks out with free month. */
export async function consumeReferralRewardMonth(userId: string): Promise<boolean> {
  const user = await User.findById(userId);
  if (!user || user.referralRewardMonths < 1) return false;

  await User.findByIdAndUpdate(userId, {
    $inc: { referralRewardMonths: -1 },
  });

  return true;
}
