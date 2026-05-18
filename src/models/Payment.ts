import mongoose, { Schema, Document, Model, Types } from "mongoose";
import type { PaymentMethod, PaymentStatus } from "@/types/payments";

export interface IPayment extends Document {
  userId: Types.ObjectId;
  appointmentId: Types.ObjectId;
  clientId: Types.ObjectId;
  method: PaymentMethod;
  amount: number;
  status: PaymentStatus;
  confirmedAt?: Date;
  confirmedBy?: Types.ObjectId;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema = new Schema<IPayment>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    appointmentId: { type: Schema.Types.ObjectId, ref: "Appointment", required: true, index: true },
    clientId: { type: Schema.Types.ObjectId, ref: "Client", required: true },
    method: {
      type: String,
      enum: ["cash", "card", "bit", "paypal"],
      required: true,
    },
    amount: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ["pending", "paid", "failed", "cancelled"],
      default: "pending",
    },
    confirmedAt: { type: Date },
    confirmedBy: { type: Schema.Types.ObjectId, ref: "User" },
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

PaymentSchema.index({ userId: 1, status: 1 });

export const Payment: Model<IPayment> =
  mongoose.models.Payment ?? mongoose.model<IPayment>("Payment", PaymentSchema);
