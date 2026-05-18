import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface IDaySchedule {
  dayOfWeek: number; // 0 = Sunday … 6 = Saturday
  isOpen: boolean;
  startTime: string; // "09:00"
  endTime: string; // "17:00"
}

export interface IWeeklySchedule extends Document {
  userId: Types.ObjectId;
  days: IDaySchedule[];
  slotDurationMinutes: number;
  createdAt: Date;
  updatedAt: Date;
}

export const DEFAULT_WEEKLY: IDaySchedule[] = [
  { dayOfWeek: 0, isOpen: false, startTime: "09:00", endTime: "17:00" },
  { dayOfWeek: 1, isOpen: true, startTime: "09:00", endTime: "17:00" },
  { dayOfWeek: 2, isOpen: true, startTime: "09:00", endTime: "17:00" },
  { dayOfWeek: 3, isOpen: true, startTime: "09:00", endTime: "17:00" },
  { dayOfWeek: 4, isOpen: true, startTime: "09:00", endTime: "17:00" },
  { dayOfWeek: 5, isOpen: true, startTime: "09:00", endTime: "14:00" },
  { dayOfWeek: 6, isOpen: false, startTime: "09:00", endTime: "17:00" },
];

const DayScheduleSchema = new Schema<IDaySchedule>(
  {
    dayOfWeek: { type: Number, required: true, min: 0, max: 6 },
    isOpen: { type: Boolean, default: true },
    startTime: { type: String, default: "09:00" },
    endTime: { type: String, default: "17:00" },
  },
  { _id: false }
);

const WeeklyScheduleSchema = new Schema<IWeeklySchedule>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    days: { type: [DayScheduleSchema], default: () => DEFAULT_WEEKLY },
    slotDurationMinutes: { type: Number, default: 30 },
  },
  { timestamps: true }
);

export const WeeklySchedule: Model<IWeeklySchedule> =
  mongoose.models.WeeklySchedule ??
  mongoose.model<IWeeklySchedule>("WeeklySchedule", WeeklyScheduleSchema);
