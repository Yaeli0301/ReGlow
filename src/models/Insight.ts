import mongoose, { Schema, Document, Model } from "mongoose";

export type InsightType = "alert" | "insight" | "recommendation";
export type InsightSeverity = "low" | "medium" | "high";
export type InsightPeriod = "daily" | "weekly" | "monthly";

export interface IInsight extends Document {
  type: InsightType;
  severity: InsightSeverity;
  title: string;
  message: string;
  /** Underlying metric — used for dedupe (e.g. "activeUsers", "MRR", "retention7d"). */
  metric: string;
  /** Numeric delta vs previous period (percent or absolute). */
  delta?: number;
  period: InsightPeriod;
  /** Suggested action for the admin. */
  recommendation?: string;
  resolved: boolean;
  resolvedAt?: Date;
  resolvedBy?: string;
  /** ISO date of the bucket this insight refers to (e.g. day, week). */
  periodKey: string;
  /** Free-form context (snapshot values, etc.) for traceability. */
  meta?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const InsightSchema = new Schema<IInsight>(
  {
    type: {
      type: String,
      enum: ["alert", "insight", "recommendation"],
      required: true,
      index: true,
    },
    severity: {
      type: String,
      enum: ["low", "medium", "high"],
      required: true,
      index: true,
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    metric: { type: String, required: true },
    delta: { type: Number },
    period: {
      type: String,
      enum: ["daily", "weekly", "monthly"],
      required: true,
      index: true,
    },
    recommendation: { type: String },
    resolved: { type: Boolean, default: false, index: true },
    resolvedAt: { type: Date },
    resolvedBy: { type: String },
    periodKey: { type: String, required: true },
    meta: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

// Dedupe: one active insight per (metric, period, periodKey).
InsightSchema.index(
  { metric: 1, period: 1, periodKey: 1 },
  { unique: true }
);
InsightSchema.index({ resolved: 1, severity: 1, createdAt: -1 });

export const Insight: Model<IInsight> =
  mongoose.models.Insight ?? mongoose.model<IInsight>("Insight", InsightSchema);
