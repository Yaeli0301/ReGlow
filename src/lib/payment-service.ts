import { connectDB } from "@/lib/mongodb";
import { Appointment } from "@/models/Appointment";
import { Client } from "@/models/Client";
import { Payment } from "@/models/Payment";
import { Invoice } from "@/models/Invoice";
import { Service } from "@/models/Service";
import { buildPriceBreakdown } from "@/lib/pricing";
import { getOrCreateBusinessSettings } from "@/lib/business-settings";
import {
  generateInvoicePdfBuffer,
  saveInvoicePdf,
  PAYMENT_METHOD_LABELS,
} from "@/lib/invoice-pdf";
import { computeClientStatus } from "@/lib/client-status";
import { formatInvoiceNumber, nextInvoiceSequence } from "@/lib/invoice-logic";
import type { PaymentMethod, PriceLineItem } from "@/types/payments";
import type { Types } from "mongoose";

export interface CompleteAppointmentInput {
  userId: string;
  appointmentId: string;
  method: PaymentMethod;
  serviceId?: string;
  selectedAddOnIds?: string[];
  extraLineItems?: PriceLineItem[];
  manualFinalPrice?: number;
  amountOverride?: number;
}

async function nextInvoiceNumber(userId: Types.ObjectId | string): Promise<string> {
  const year = new Date().getFullYear();
  const count = await Invoice.countDocuments({
    userId,
    createdAt: { $gte: new Date(`${year}-01-01`) },
  });
  return formatInvoiceNumber(year, nextInvoiceSequence(count));
}

export async function createInvoiceForPayment(params: {
  userId: Types.ObjectId | string;
  appointmentId: Types.ObjectId | string;
  clientId: Types.ObjectId | string;
  paymentId: Types.ObjectId | string;
  amount: number;
  lineItems: PriceLineItem[];
  method: PaymentMethod;
}) {
  const settings = await getOrCreateBusinessSettings(params.userId);
  const client = await Client.findById(params.clientId);
  if (!client) throw new Error("Client not found");

  const invoiceNumber = await nextInvoiceNumber(params.userId);

  const pdfBuffer = await generateInvoicePdfBuffer({
    invoiceNumber,
    createdAt: new Date(),
    businessName: settings.businessName,
    themeColor: settings.themeColor,
    clientName: client.name,
    clientPhone: client.phone,
    lineItems: params.lineItems,
    amount: params.amount,
    paymentMethod: PAYMENT_METHOD_LABELS[params.method] || params.method,
  });

  const invoice = await Invoice.create({
    userId: params.userId,
    clientId: params.clientId,
    appointmentId: params.appointmentId,
    paymentId: params.paymentId,
    invoiceNumber,
    amount: params.amount,
    currency: "ILS",
    lineItems: params.lineItems,
    businessSnapshot: {
      businessName: settings.businessName,
      logoData: settings.logoData,
      themeColor: settings.themeColor,
    },
    clientSnapshot: {
      name: client.name,
      phone: client.phone,
    },
    pdfUrl: "/pending",
  });

  const pdfPath = await saveInvoicePdf(
    params.userId.toString(),
    invoice._id.toString(),
    pdfBuffer
  );
  invoice.pdfPath = pdfPath;
  invoice.pdfUrl = `/api/invoices/${invoice._id.toString()}/pdf`;
  await invoice.save();

  return invoice;
}

export async function completeAppointmentWithPayment(input: CompleteAppointmentInput) {
  await connectDB();

  const appointment = await Appointment.findOne({
    _id: input.appointmentId,
    userId: input.userId,
  });
  if (!appointment) throw new Error("Appointment not found");

  let service = null;
  if (input.serviceId) {
    service = await Service.findOne({ _id: input.serviceId, userId: input.userId });
  } else if (appointment.serviceId) {
    service = await Service.findById(appointment.serviceId);
  }

  const pricing = buildPriceBreakdown({
    service,
    serviceName: appointment.serviceName,
    basePrice: appointment.finalPrice || 0,
    selectedAddOnIds: input.selectedAddOnIds,
    extraLineItems: input.extraLineItems,
    manualFinalPrice: input.manualFinalPrice,
  });

  const amount =
    typeof input.amountOverride === "number" ? input.amountOverride : pricing.finalPrice;

  appointment.status = "completed";
  appointment.serviceId = service?._id;
  appointment.serviceName = pricing.serviceName;
  appointment.selectedAddOns = pricing.selectedAddOns;
  appointment.priceLineItems = pricing.lineItems;
  appointment.finalPrice = amount;

  const client = await Client.findById(appointment.clientId);
  if (client) {
    client.lastVisitDate = appointment.date;
    client.status = computeClientStatus(client.lastVisitDate);
    await client.save();
  }

  const isCash = input.method === "cash";
  const payment = await Payment.create({
    userId: input.userId,
    appointmentId: appointment._id,
    clientId: appointment.clientId,
    method: input.method,
    amount,
    status: isCash ? "pending" : "paid",
    ...(isCash ? {} : { confirmedAt: new Date(), confirmedBy: input.userId }),
  });

  appointment.paymentId = payment._id;
  appointment.paymentStatus = isCash ? "pending_cash" : "paid";

  let invoice = null;
  if (!isCash) {
    invoice = await createInvoiceForPayment({
      userId: input.userId,
      appointmentId: appointment._id,
      clientId: appointment.clientId,
      paymentId: payment._id,
      amount,
      lineItems: pricing.lineItems,
      method: input.method,
    });
    payment.status = "paid";
    await payment.save();
  }

  await appointment.save();

  return {
    appointment,
    payment,
    invoice,
    requiresCashConfirmation: isCash,
  };
}

export async function confirmCashPayment(params: {
  userId: string;
  paymentId: string;
  amountReceived: number;
}) {
  await connectDB();

  const payment = await Payment.findOne({
    _id: params.paymentId,
    userId: params.userId,
    method: "cash",
    status: "pending",
  });
  if (!payment) throw new Error("Pending cash payment not found");

  const appointment = await Appointment.findById(payment.appointmentId);
  if (!appointment) throw new Error("Appointment not found");

  payment.amount = params.amountReceived;
  payment.status = "paid";
  payment.confirmedAt = new Date();
  payment.confirmedBy = params.userId as unknown as Types.ObjectId;
  await payment.save();

  appointment.paymentStatus = "paid";
  appointment.finalPrice = params.amountReceived;
  await appointment.save();

  const invoice = await createInvoiceForPayment({
    userId: params.userId,
    appointmentId: appointment._id,
    clientId: appointment.clientId,
    paymentId: payment._id,
    amount: params.amountReceived,
    lineItems: appointment.priceLineItems.length
      ? appointment.priceLineItems
      : [{ label: appointment.serviceName || "שירות", amount: params.amountReceived }],
    method: "cash",
  });

  return { payment, appointment, invoice };
}
