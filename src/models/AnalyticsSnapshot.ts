import mongoose, { Schema, Document, Model } from "mongoose";

export type SnapshotKind = "daily" | "weekly" | "monthly";

export interface IAnalyticsSnapshot extends Document {
  kind: SnapshotKind;
  /** Start of period (UTC date, e.g. 2026-05-19T00:00:00Z). */
  periodStart: Date;
  /** Computed metrics (shape depends on kind). */
  metrics: Record<string, unknown>;
  createdAt: Date;
}

const AnalyticsSnapshotSchema = new Schema<IAnalyticsSnapshot>(
  {
    kind: { type: String, enum: ["daily", "weekly", "monthly"], required: true },
    periodStart: { type: Date, required: true },
    metrics: { type: Schema.Types.Mixed, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

AnalyticsSnapshotSchema.index({ kind: 1, periodStart: -1 }, { unique: true });

export const AnalyticsSnapshot: Model<IAnalyticsSnapshot> =
  mongoose.models.AnalyticsSnapshot ??
  mongoose.model<IAnalyticsSnapshot>("AnalyticsSnapshot", AnalyticsSnapshotSchema);
