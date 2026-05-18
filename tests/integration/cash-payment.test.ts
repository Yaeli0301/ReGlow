import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { connectTestDB, clearTestDB, disconnectTestDB } from "../helpers/db";
import { seedDemoData } from "@/lib/seed/demo-seed";
import {
  completeAppointmentWithPayment,
  confirmCashPayment,
} from "@/lib/payment-service";
import { Appointment } from "@/models/Appointment";
import { Payment } from "@/models/Payment";

vi.mock("@/lib/invoice-pdf", () => ({
  generateInvoicePdfBuffer: vi.fn(async () => Buffer.from("pdf")),
  saveInvoicePdf: vi.fn(async () => "/tmp/test-invoice.pdf"),
  PAYMENT_METHOD_LABELS: { cash: "מזומן", card: "אשראי", bit: "ביט", paypal: "PayPal" },
}));

describe("cash payment confirmation", () => {
  let userId: string;
  let appointmentId: string;

  beforeAll(async () => {
    await connectTestDB();
  });

  afterAll(async () => {
    await disconnectTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();
    const seed = await seedDemoData({ force: true });
    userId = seed.userId;
    const { createValidatedAppointment } = await import("@/lib/appointment-create");
    const { Client } = await import("@/models/Client");
    const { Service } = await import("@/models/Service");
    const { pickTestSlot } = await import("../helpers/slots");
    const client = await Client.findOne({ userId });
    const service = await Service.findOne({ userId, name: "Facial" });
    const slot = await pickTestSlot(userId, service!.durationMinutes, 22);
    const appt = await createValidatedAppointment({
      userId,
      clientId: client!._id.toString(),
      date: slot,
      serviceId: service!._id.toString(),
    });
    appointmentId = appt._id.toString();
  });

  it("creates pending cash then confirms with invoice", async () => {
    const result = await completeAppointmentWithPayment({
      userId,
      appointmentId,
      method: "cash",
    });

    expect(result.requiresCashConfirmation).toBe(true);
    expect(result.payment.status).toBe("pending");

    const confirmed = await confirmCashPayment({
      userId,
      paymentId: result.payment._id.toString(),
      amountReceived: 150,
    });

    expect(confirmed.payment.status).toBe("paid");
    expect(confirmed.invoice).toBeTruthy();
    expect(confirmed.appointment.paymentStatus).toBe("paid");
  });

  it("fails confirming non-pending payment", async () => {
    const done = await completeAppointmentWithPayment({
      userId,
      appointmentId,
      method: "card",
      amountOverride: 120,
    });
    expect(done.payment.status).toBe("paid");

    await expect(
      confirmCashPayment({
        userId,
        paymentId: done.payment._id.toString(),
        amountReceived: 120,
      })
    ).rejects.toThrow();
  });
});
