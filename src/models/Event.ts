import mongoose, { Schema, Document, Model } from "mongoose";

export type EventType =
  // auth
  | "user_signed_up"
  | "user_logged_in"
  // clients
  | "client_created"
  | "client_updated"
  // appointments
  | "appointment_created"
  | "appointment_cancelled"
  | "appointment_completed"
  // retention
  | "lost_client_detected"
  | "client_returned"
  // payments
  | "subscription_started"
  | "subscription_cancelled"
  | "payment_succeeded"
  // booking page
  | "booking_page_viewed"
  | "booking_created";

export interface IEvent extends Document {
  /** Business owner ID (Mongo ObjectId as string). Same as businessId in this schema. */
  userId: string;
  businessId: string;
  type: EventType;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

const EventSchema = new Schema<IEvent>(
  {
    userId: { type: String, required: true, index: true },
    businessId: { type: String, required: true, index: true },
    type: { type: String, required: true, index: true },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// Composite indexes for common aggregations
EventSchema.index({ type: 1, createdAt: -1 });
EventSchema.index({ businessId: 1, type: 1, createdAt: -1 });
EventSchema.index({ createdAt: -1 });

export const Event: Model<IEvent> =
  mongoose.models.Event ?? mongoose.model<IEvent>("Event", EventSchema);
