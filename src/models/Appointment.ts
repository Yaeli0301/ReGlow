import mongoose, { Schema, Document, Model, Types } from "mongoose";
import type { AppointmentStatus } from "@/types";

export interface IAppointment extends Document {
  userId: Types.ObjectId;
  clientId: Types.ObjectId;
  date: Date;
  status: AppointmentStatus;
  serviceName?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const AppointmentSchema = new Schema<IAppointment>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    clientId: { type: Schema.Types.ObjectId, ref: "Client", required: true },
    date: { type: Date, required: true },
    status: {
      type: String,
      enum: ["scheduled", "completed", "canceled"],
      default: "scheduled",
    },
    serviceName: { type: String },
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

AppointmentSchema.index({ userId: 1, date: 1 });

export const Appointment: Model<IAppointment> =
  mongoose.models.Appointment ??
  mongoose.model<IAppointment>("Appointment", AppointmentSchema);
