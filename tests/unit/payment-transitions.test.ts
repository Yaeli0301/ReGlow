import { describe, it, expect } from "vitest";
import {
  transitionPaymentStatus,
  initialPaymentState,
  appointmentStatusForPayment,
} from "@/lib/payment-transitions";

describe("payment transitions", () => {
  it("cash starts pending", () => {
    const s = initialPaymentState("cash");
    expect(s.paymentStatus).toBe("pending");
    expect(s.appointmentPaymentStatus).toBe("pending_cash");
  });

  it("card starts paid", () => {
    const s = initialPaymentState("card");
    expect(s.paymentStatus).toBe("paid");
    expect(s.appointmentPaymentStatus).toBe("paid");
  });

  it("confirms cash to paid", () => {
    expect(transitionPaymentStatus("pending", "confirm_cash")).toBe("paid");
  });

  it("marks failed from pending", () => {
    expect(transitionPaymentStatus("pending", "mark_failed")).toBe("failed");
  });

  it("rejects invalid transition", () => {
    expect(() => transitionPaymentStatus("paid", "confirm_cash")).toThrow();
  });

  it("maps appointment status", () => {
    expect(appointmentStatusForPayment("failed", "card")).toBe("unpaid");
  });
});
