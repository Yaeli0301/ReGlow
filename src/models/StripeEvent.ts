import mongoose, { Schema, Document, Model } from "mongoose";

export interface IStripeEvent extends Document {
  eventId: string;
  type: string;
  processedAt: Date;
}

const StripeEventSchema = new Schema<IStripeEvent>(
  {
    eventId: { type: String, required: true, unique: true, index: true },
    type: { type: String, required: true },
    processedAt: { type: Date, default: () => new Date(), index: true },
  },
  { timestamps: false }
);

export const StripeEvent: Model<IStripeEvent> =
  mongoose.models.StripeEvent ?? mongoose.model<IStripeEvent>("StripeEvent", StripeEventSchema);
