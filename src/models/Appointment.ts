import mongoose, { Schema, Document, Model, Types } from "mongoose";
import type { AppointmentStatus } from "@/types";
import type {
  AppointmentPaymentStatus,
  PriceLineItem,
  SelectedAddOn,
} from "@/types/payments";

export interface IAppointment extends Document {
  userId: Types.ObjectId;
  clientId: Types.ObjectId;
  date: Date;
  status: AppointmentStatus;
  serviceId?: Types.ObjectId;
  serviceName?: string;
  durationMinutes: number;
  rescheduleToken?: string;
  cancelReason?: string;
  canceledAt?: Date;
  selectedAddOns: SelectedAddOn[];
  priceLineItems: PriceLineItem[];
  finalPrice: number;
  paymentStatus: AppointmentPaymentStatus;
  paymentId?: Types.ObjectId;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const SelectedAddOnSchema = new Schema(
  {
    addOnId: { type: String, required: true },
    name: { type: String, required: true },
    price: { type: Number, required: true },
  },
  { _id: false }
);

const PriceLineItemSchema = new Schema(
  {
    label: { type: String, required: true },
    amount: { type: Number, required: true },
  },
  { _id: false }
);

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
    serviceId: { type: Schema.Types.ObjectId, ref: "Service" },
    serviceName: { type: String },
    durationMinutes: { type: Number, default: 60 },
    rescheduleToken: { type: String, unique: true, sparse: true },
    cancelReason: { type: String },
    canceledAt: { type: Date },
    selectedAddOns: { type: [SelectedAddOnSchema], default: [] },
    priceLineItems: { type: [PriceLineItemSchema], default: [] },
    finalPrice: { type: Number, default: 0 },
    paymentStatus: {
      type: String,
      enum: ["unpaid", "pending_cash", "paid"],
      default: "unpaid",
    },
    paymentId: { type: Schema.Types.ObjectId, ref: "Payment" },
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

AppointmentSchema.index({ userId: 1, date: 1 });
AppointmentSchema.index({ userId: 1, status: 1, date: 1 });

export const Appointment: Model<IAppointment> =
  mongoose.models.Appointment ??
  mongoose.model<IAppointment>("Appointment", AppointmentSchema);
