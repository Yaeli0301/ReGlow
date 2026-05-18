import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface IBlockedSlot {
  startTime: string; // "10:00"
  endTime: string; // "11:00"
}

export interface IDateOverride extends Document {
  userId: Types.ObjectId;
  date: Date; // start of day UTC
  isClosed: boolean;
  startTime?: string;
  endTime?: string;
  blockedSlots: IBlockedSlot[];
  note?: string;
  createdAt: Date;
  updatedAt: Date;
}

const BlockedSlotSchema = new Schema<IBlockedSlot>(
  {
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
  },
  { _id: false }
);

const DateOverrideSchema = new Schema<IDateOverride>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    date: { type: Date, required: true },
    isClosed: { type: Boolean, default: false },
    startTime: { type: String },
    endTime: { type: String },
    blockedSlots: { type: [BlockedSlotSchema], default: [] },
    note: { type: String },
  },
  { timestamps: true }
);

DateOverrideSchema.index({ userId: 1, date: 1 }, { unique: true });

export const DateOverride: Model<IDateOverride> =
  mongoose.models.DateOverride ??
  mongoose.model<IDateOverride>("DateOverride", DateOverrideSchema);
