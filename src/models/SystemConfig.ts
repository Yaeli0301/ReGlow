import mongoose, { Schema, Document, Model } from "mongoose";

export interface ISystemConfig extends Document {
  /** Singleton key — always "global". */
  key: string;
  killSwitchActive: boolean;
  killSwitchReason?: string;
  updatedBy?: string;
  updatedAt: Date;
}

const SystemConfigSchema = new Schema<ISystemConfig>(
  {
    key: { type: String, required: true, unique: true, default: "global" },
    killSwitchActive: { type: Boolean, default: false },
    killSwitchReason: { type: String },
    updatedBy: { type: String },
  },
  { timestamps: { createdAt: false, updatedAt: true } }
);

export const SystemConfig: Model<ISystemConfig> =
  mongoose.models.SystemConfig ??
  mongoose.model<ISystemConfig>("SystemConfig", SystemConfigSchema);

export const SYSTEM_CONFIG_KEY = "global";
