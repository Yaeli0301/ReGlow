import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface IServiceAddOn {
  _id: Types.ObjectId;
  name: string;
  price: number;
  active: boolean;
}

export interface IService extends Document {
  userId: Types.ObjectId;
  name: string;
  durationMinutes: number;
  basePrice: number;
  addOns: IServiceAddOn[];
  sortOrder: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const AddOnSchema = new Schema<IServiceAddOn>(
  {
    name: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    active: { type: Boolean, default: true },
  },
  { _id: true }
);

const ServiceSchema = new Schema<IService>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true, trim: true },
    durationMinutes: { type: Number, required: true, default: 60 },
    basePrice: { type: Number, required: true, default: 0 },
    addOns: { type: [AddOnSchema], default: [] },
    sortOrder: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

ServiceSchema.index({ userId: 1, sortOrder: 1 });

export const Service: Model<IService> =
  mongoose.models.Service ?? mongoose.model<IService>("Service", ServiceSchema);
