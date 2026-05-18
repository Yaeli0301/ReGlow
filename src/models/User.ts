import mongoose, { Schema, Document, Model } from "mongoose";
import type { SubscriptionTier } from "@/types";

export interface IUser extends Document {
  email: string;
  password: string;
  businessName: string;
  subscriptionTier: SubscriptionTier;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  referralCode: string;
  referredBy?: string;
  referralRewardMonths: number;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    businessName: { type: String, required: true, trim: true },
    subscriptionTier: {
      type: String,
      enum: ["none", "basic", "pro", "premium"],
      default: "none",
    },
    stripeCustomerId: { type: String },
    stripeSubscriptionId: { type: String },
    referralCode: { type: String, unique: true, sparse: true },
    referredBy: { type: String },
    referralRewardMonths: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const User: Model<IUser> =
  mongoose.models.User ?? mongoose.model<IUser>("User", UserSchema);
