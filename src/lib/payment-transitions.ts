import type { PaymentStatus, AppointmentPaymentStatus } from "@/types/payments";

export type PaymentEvent =
  | "create_cash"
  | "create_paid"
  | "confirm_cash"
  | "mark_failed"
  | "cancel";

export interface PaymentTransitionResult {
  paymentStatus: PaymentStatus;
  appointmentPaymentStatus: AppointmentPaymentStatus;
}

const PAYMENT_TRANSITIONS: Record<
  PaymentStatus,
  Partial<Record<PaymentEvent, PaymentStatus>>
> = {
  pending: {
    confirm_cash: "paid",
    mark_failed: "failed",
    cancel: "cancelled",
  },
  paid: {},
  failed: {
    create_cash: "pending",
    create_paid: "paid",
  },
  cancelled: {},
};

export function transitionPaymentStatus(
  current: PaymentStatus,
  event: PaymentEvent
): PaymentStatus {
  const next = PAYMENT_TRANSITIONS[current]?.[event];
  if (!next) {
    throw new Error(`Invalid payment transition: ${current} + ${event}`);
  }
  return next;
}

export function appointmentStatusForPayment(
  paymentStatus: PaymentStatus,
  method: "cash" | "card" | "bit" | "paypal"
): AppointmentPaymentStatus {
  if (paymentStatus === "paid") return "paid";
  if (paymentStatus === "pending" && method === "cash") return "pending_cash";
  return "unpaid";
}

export function initialPaymentState(method: "cash" | "card" | "bit" | "paypal"): PaymentTransitionResult {
  const isCash = method === "cash";
  const paymentStatus: PaymentStatus = isCash ? "pending" : "paid";
  return {
    paymentStatus,
    appointmentPaymentStatus: appointmentStatusForPayment(paymentStatus, method),
  };
}
