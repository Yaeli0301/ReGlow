import mongoose, { Schema, Document, Model } from "mongoose";
import type { SubscriptionTier, UserRole } from "@/types";

export interface IAdminOverride {
  /** Tier granted manually by admin (overrides Stripe `subscriptionTier`). */
  tier?: SubscriptionTier;
  /** ISO date when manual access ends. */
  until?: Date;
  /** Discount percent applied at next Stripe checkout (0-100). */
  discountPercent?: number;
  /** Free admin notes. */
  notes?: string;
  /** Admin user id that granted this override. */
  grantedBy?: string;
  /** When override was last updated. */
  grantedAt?: Date;
}

export interface IUser extends Document {
  email: string;
  password: string;
  businessName: string;
  role: UserRole;
  subscriptionTier: SubscriptionTier;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  referralCode: string;
  referredBy?: string;
  referralRewardMonths: number;
  adminOverride?: IAdminOverride;
  createdAt: Date;
  updatedAt: Date;
}

const AdminOverrideSchema = new Schema<IAdminOverride>(
  {
    tier: {
      type: String,
      enum: ["none", "basic", "pro", "premium"],
    },
    until: { type: Date },
    discountPercent: { type: Number, min: 0, max: 100 },
    notes: { type: String, default: "" },
    grantedBy: { type: String },
    grantedAt: { type: Date },
  },
  { _id: false }
);

const UserSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    businessName: { type: String, required: true, trim: true },
    role: { type: String, enum: ["business", "admin"], default: "business" },
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
    adminOverride: { type: AdminOverrideSchema, default: undefined },
  },
  { timestamps: true }
);

export const User: Model<IUser> =
  mongoose.models.User ?? mongoose.model<IUser>("User", UserSchema);
