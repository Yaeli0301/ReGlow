import mongoose, { Schema, Document, Model } from "mongoose";

export type AdminActionType =
  | "set_tier"
  | "grant_override"
  | "clear_override"
  | "set_discount"
  | "set_notes";

export interface IAdminAction extends Document {
  adminId: string;
  adminEmail: string;
  targetUserId: string;
  targetEmail: string;
  action: AdminActionType;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  reason?: string;
  createdAt: Date;
}

const AdminActionSchema = new Schema<IAdminAction>(
  {
    adminId: { type: String, required: true, index: true },
    adminEmail: { type: String, required: true },
    targetUserId: { type: String, required: true, index: true },
    targetEmail: { type: String, required: true },
    action: {
      type: String,
      enum: ["set_tier", "grant_override", "clear_override", "set_discount", "set_notes"],
      required: true,
    },
    before: { type: Schema.Types.Mixed },
    after: { type: Schema.Types.Mixed },
    reason: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const AdminAction: Model<IAdminAction> =
  mongoose.models.AdminAction ?? mongoose.model<IAdminAction>("AdminAction", AdminActionSchema);
