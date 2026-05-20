import { connectDB } from "@/lib/mongodb";
import { Appointment } from "@/models/Appointment";
import { Client } from "@/models/Client";
import { Payment } from "@/models/Payment";
import { getOrCreateBusinessSettings } from "@/lib/business-settings";
import { buildPaymentToken } from "@/lib/notifications";
import { createInvoiceForPayment } from "@/lib/payment-service";
import type { ClientPaymentMethod } from "@/types/payments";
import type { PaymentMethod } from "@/types/payments";

function mapClientMethod(method: ClientPaymentMethod): PaymentMethod {
  if (method === "card") return "card";
  if (method === "cash") return "cash";
  return "other";
}

export async function ensureAppointmentPaymentToken(
  appointmentId: string,
  userId?: string
): Promise<string> {
  await connectDB();
  const appt = await Appointment.findOne(
    userId ? { _id: appointmentId, userId } : { _id: appointmentId }
  );
  if (!appt) throw new Error("Appointment not found");
  if (!appt.paymentToken) {
    appt.paymentToken = buildPaymentToken();
    await appt.save();
  }
  return appt.paymentToken;
}

export async function getPaymentPageData(paymentToken: string) {
  await connectDB();
  const appointment = await Appointment.findOne({ paymentToken }).populate("clientId", "name phone");
  if (!appointment || appointment.status === "canceled") {
    return null;
  }

  const client = appointment.clientId as { name?: string; phone?: string } | null;
  const settings = await getOrCreateBusinessSettings(appointment.userId.toString());

  let payment = null;
  if (appointment.paymentId) {
    payment = await Payment.findById(appointment.paymentId).lean();
  }

  return {
    businessName: settings.businessName,
    themeColor: settings.themeColor,
    clientName: client?.name || "—",
    appointmentDate: appointment.date.toISOString(),
    serviceName: appointment.serviceName,
    lineItems: appointment.priceLineItems,
    amount: appointment.finalPrice,
    paymentStatus: appointment.paymentStatus,
    status: appointment.status,
    payment: payment
      ? {
          method: payment.method,
          status: payment.status,
          amount: payment.amount,
        }
      : null,
  };
}

export async function submitClientPayment(params: {
  paymentToken: string;
  method: ClientPaymentMethod;
}) {
  await connectDB();

  const appointment = await Appointment.findOne({ paymentToken: params.paymentToken });
  if (!appointment || appointment.status === "canceled") {
    throw new Error("Invalid payment link");
  }

  if (appointment.paymentStatus === "paid") {
    return { alreadyPaid: true as const, appointment };
  }

  if (appointment.paymentStatus === "pending_cash") {
    throw new Error("Cash confirmation pending");
  }

  const amount = appointment.finalPrice;
  if (amount <= 0) {
    throw new Error("No amount to pay");
  }

  const method = mapClientMethod(params.method);
  const isCash = method === "cash";
  const isCard = method === "card";

  const payment = await Payment.create({
    userId: appointment.userId,
    appointmentId: appointment._id,
    clientId: appointment.clientId,
    method,
    amount,
    status: isCash ? "pending" : "paid",
    ...(isCash ? {} : { confirmedAt: new Date() }),
    notes: isCash ? "Client marked cash — awaiting salon confirmation" : "Paid via client link",
  });

  appointment.paymentId = payment._id;
  appointment.paymentStatus = isCash ? "pending_cash" : "paid";

  let invoice = null;
  if (isCard) {
    invoice = await createInvoiceForPayment({
      userId: appointment.userId,
      appointmentId: appointment._id,
      clientId: appointment.clientId,
      paymentId: payment._id,
      amount,
      lineItems:
        appointment.priceLineItems.length > 0
          ? appointment.priceLineItems
          : [{ label: appointment.serviceName || "שירות", amount }],
      method: "card",
    });
  }

  await appointment.save();

  return {
    alreadyPaid: false as const,
    appointment,
    payment,
    invoice,
    requiresCashConfirmation: isCash,
    cardPaid: isCard,
  };
}

export async function markAppointmentCompleted(userId: string, appointmentId: string) {
  await connectDB();
  const appointment = await Appointment.findOne({ _id: appointmentId, userId });
  if (!appointment) throw new Error("Appointment not found");

  if (appointment.paymentStatus === "unpaid") {
    throw new Error("שלחי ללקוחה לינק תשלום לפני סיום התור");
  }

  if (appointment.paymentStatus === "pending_cash") {
    throw new Error("אשרי תשלום במזומן לפני סיום התור");
  }

  appointment.status = "completed";
  const client = await Client.findById(appointment.clientId);
  if (client) {
    const { computeClientStatus } = await import("@/lib/client-status");
    client.lastVisitDate = appointment.date;
    client.status = computeClientStatus(client.lastVisitDate);
    await client.save();
  }
  await appointment.save();
  return appointment;
}
