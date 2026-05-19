import mongoose, { Schema, Document, Model } from "mongoose";

export type SystemLogLevel = "info" | "warn" | "error";
export type SystemLogCategory =
  | "api"
  | "db"
  | "auth"
  | "stripe"
  | "cron"
  | "email"
  | "system";

export interface ISystemLog extends Document {
  level: SystemLogLevel;
  category: SystemLogCategory;
  message: string;
  /** e.g. route path, event name */
  source?: string;
  durationMs?: number;
  statusCode?: number;
  meta?: Record<string, unknown>;
  createdAt: Date;
}

const SystemLogSchema = new Schema<ISystemLog>(
  {
    level: { type: String, enum: ["info", "warn", "error"], required: true, index: true },
    category: {
      type: String,
      enum: ["api", "db", "auth", "stripe", "cron", "email", "system"],
      required: true,
      index: true,
    },
    message: { type: String, required: true },
    source: { type: String, index: true },
    durationMs: { type: Number },
    statusCode: { type: Number },
    meta: { type: Schema.Types.Mixed },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

SystemLogSchema.index({ createdAt: -1 });
SystemLogSchema.index({ level: 1, createdAt: -1 });

export const SystemLog: Model<ISystemLog> =
  mongoose.models.SystemLog ?? mongoose.model<ISystemLog>("SystemLog", SystemLogSchema);
