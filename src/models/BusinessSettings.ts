import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface IBusinessSettings extends Document {
  userId: Types.ObjectId;
  businessName: string;
  logoUrl?: string;
  logoData?: string;
  themeColor: string;
  createdAt: Date;
  updatedAt: Date;
}

const BusinessSettingsSchema = new Schema<IBusinessSettings>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    businessName: { type: String, required: true, trim: true },
    logoUrl: { type: String },
    logoData: { type: String },
    themeColor: { type: String, default: "#c026d3" },
  },
  { timestamps: true }
);

export const BusinessSettings: Model<IBusinessSettings> =
  mongoose.models.BusinessSettings ??
  mongoose.model<IBusinessSettings>("BusinessSettings", BusinessSettingsSchema);
