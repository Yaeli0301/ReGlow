import mongoose, { Schema, Document, Model, Types } from "mongoose";
import type { ClientStatus } from "@/types";
import { computeClientStatus } from "@/lib/client-status";
import { normalizePhone, formatPhoneDisplay } from "@/lib/phone";

export interface IClient extends Document {
  userId: Types.ObjectId;
  name: string;
  phone: string;
  phoneNormalized: string;
  lastVisitDate?: Date;
  notes?: string;
  status: ClientStatus;
  optIn: boolean;
  lastMessageSentDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ClientSchema = new Schema<IClient>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    phoneNormalized: { type: String, required: true, index: true },
    lastVisitDate: { type: Date },
    notes: { type: String, default: "" },
    status: {
      type: String,
      enum: ["active", "atRisk", "lost"],
      default: "active",
    },
    optIn: { type: Boolean, default: false },
    lastMessageSentDate: { type: Date },
  },
  { timestamps: true }
);

ClientSchema.index({ userId: 1, phoneNormalized: 1 }, { unique: true });

ClientSchema.pre("save", function () {
  if (this.phone) {
    this.phone = formatPhoneDisplay(this.phone);
    this.phoneNormalized = normalizePhone(this.phone);
  }
  this.status = computeClientStatus(this.lastVisitDate);
});

export const Client: Model<IClient> =
  mongoose.models.Client ?? mongoose.model<IClient>("Client", ClientSchema);
