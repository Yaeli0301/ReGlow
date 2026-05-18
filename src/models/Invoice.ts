import mongoose, { Schema, Document, Model, Types } from "mongoose";
import type { PriceLineItem } from "@/types/payments";

export interface IInvoice extends Document {
  userId: Types.ObjectId;
  clientId: Types.ObjectId;
  appointmentId: Types.ObjectId;
  paymentId: Types.ObjectId;
  invoiceNumber: string;
  amount: number;
  currency: string;
  lineItems: PriceLineItem[];
  businessSnapshot: {
    businessName: string;
    logoData?: string;
    themeColor: string;
  };
  clientSnapshot: {
    name: string;
    phone: string;
  };
  pdfPath?: string;
  pdfUrl: string;
  createdAt: Date;
}

const InvoiceSchema = new Schema<IInvoice>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    clientId: { type: Schema.Types.ObjectId, ref: "Client", required: true },
    appointmentId: { type: Schema.Types.ObjectId, ref: "Appointment", required: true },
    paymentId: { type: Schema.Types.ObjectId, ref: "Payment", required: true, unique: true },
    invoiceNumber: { type: String, required: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: "ILS" },
    lineItems: [
      {
        label: { type: String, required: true },
        amount: { type: Number, required: true },
      },
    ],
    businessSnapshot: {
      businessName: { type: String, required: true },
      logoData: { type: String },
      themeColor: { type: String, default: "#c026d3" },
    },
    clientSnapshot: {
      name: { type: String, required: true },
      phone: { type: String, required: true },
    },
    pdfPath: { type: String },
    pdfUrl: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

InvoiceSchema.index({ userId: 1, createdAt: -1 });
InvoiceSchema.index({ userId: 1, invoiceNumber: 1 }, { unique: true });

export const Invoice: Model<IInvoice> =
  mongoose.models.Invoice ?? mongoose.model<IInvoice>("Invoice", InvoiceSchema);
