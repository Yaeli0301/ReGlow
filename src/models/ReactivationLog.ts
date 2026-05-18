import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface IReactivationLog extends Document {
  userId: Types.ObjectId;
  clientId: Types.ObjectId;
  phone: string;
  message: string;
  whatsappUrl: string;
  sentAt: Date;
  automated: boolean;
}

const ReactivationLogSchema = new Schema<IReactivationLog>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    clientId: { type: Schema.Types.ObjectId, ref: "Client", required: true },
    phone: { type: String, required: true },
    message: { type: String, required: true },
    whatsappUrl: { type: String, required: true },
    sentAt: { type: Date, default: Date.now },
    automated: { type: Boolean, default: true },
  },
  { timestamps: false }
);

ReactivationLogSchema.index({ clientId: 1, sentAt: -1 });

export const ReactivationLog: Model<IReactivationLog> =
  mongoose.models.ReactivationLog ??
  mongoose.model<IReactivationLog>("ReactivationLog", ReactivationLogSchema);
