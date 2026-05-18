import mongoose, { Schema, Document, Model, Types } from "mongoose";

export type FeedbackType = "feature" | "bug" | "improvement";
export type FeedbackStatus = "open" | "in_progress" | "done" | "rejected";

export interface IFeedback extends Document {
  userId?: Types.ObjectId;
  email?: string;
  type: FeedbackType;
  title: string;
  description: string;
  status: FeedbackStatus;
  priority: number;
  createdAt: Date;
  updatedAt: Date;
}

const FeedbackSchema = new Schema<IFeedback>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User" },
    email: { type: String },
    type: { type: String, enum: ["feature", "bug", "improvement"], required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    status: {
      type: String,
      enum: ["open", "in_progress", "done", "rejected"],
      default: "open",
    },
    priority: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const Feedback: Model<IFeedback> =
  mongoose.models.Feedback ?? mongoose.model<IFeedback>("Feedback", FeedbackSchema);
