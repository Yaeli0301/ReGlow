import mongoose, { Schema, Document, Model, Types } from "mongoose";
import type { SubscriptionTier } from "@/types";

export type ReferralStatus = "pending" | "completed" | "rewarded" | "rejected";

export interface IReferral extends Document {
  referrerId: Types.ObjectId;
  referredUserId: Types.ObjectId;
  referralCode: string;
  status: ReferralStatus;
  rewardApplied: boolean;
  paidAt?: Date;
  subscriptionTierAtReward?: SubscriptionTier;
  stripeEventId?: string;
  rejectReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ReferralSchema = new Schema<IReferral>(
  {
    referrerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    referredUserId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    referralCode: { type: String, required: true },
    status: {
      type: String,
      enum: ["pending", "completed", "rewarded", "rejected"],
      default: "pending",
    },
    rewardApplied: { type: Boolean, default: false },
    paidAt: { type: Date },
    subscriptionTierAtReward: { type: String },
    stripeEventId: { type: String },
    rejectReason: { type: String },
  },
  { timestamps: true }
);

ReferralSchema.index({ referrerId: 1, status: 1 });

export const Referral: Model<IReferral> =
  mongoose.models.Referral ?? mongoose.model<IReferral>("Referral", ReferralSchema);
