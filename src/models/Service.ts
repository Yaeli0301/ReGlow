import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface IService extends Document {
  userId: Types.ObjectId;
  name: string;
  durationMinutes: number;
  price: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ServiceSchema = new Schema<IService>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true, trim: true },
    durationMinutes: { type: Number, required: true, default: 60 },
    price: { type: Number, required: true, default: 0 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Service: Model<IService> =
  mongoose.models.Service ?? mongoose.model<IService>("Service", ServiceSchema);
