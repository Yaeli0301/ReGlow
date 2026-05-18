export type PaymentMethod = "cash" | "card" | "bit" | "paypal";
export type PaymentStatus = "pending" | "paid" | "failed" | "cancelled";
export type AppointmentPaymentStatus = "unpaid" | "pending_cash" | "paid";

export interface PriceLineItem {
  label: string;
  amount: number;
}

export interface SelectedAddOn {
  addOnId: string;
  name: string;
  price: number;
}
