import { NextResponse } from "next/server";
import fs from "fs/promises";
import { connectDB } from "@/lib/mongodb";
import { requireAuthFromRequest } from "@/lib/api-auth";
import { canAccess } from "@/lib/subscription";
import { Invoice } from "@/models/Invoice";
import {
  generateInvoicePdfBuffer,
  PAYMENT_METHOD_LABELS,
} from "@/lib/invoice-pdf";
import { Payment } from "@/models/Payment";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuthFromRequest(request);
  if (auth instanceof NextResponse) return auth;

  if (!canAccess(auth.user.subscriptionTier, "appointments")) {
    return NextResponse.json({ error: "Pro plan required" }, { status: 403 });
  }

  const { id } = await params;
  await connectDB();

  const invoice = await Invoice.findOne({ _id: id, userId: auth.user.id });
  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  let buffer: Uint8Array;

  if (invoice.pdfPath) {
    try {
      buffer = await fs.readFile(invoice.pdfPath);
    } catch {
      buffer = await regeneratePdf(invoice);
    }
  } else {
    buffer = await regeneratePdf(invoice);
  }

  return new NextResponse(Buffer.from(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${invoice.invoiceNumber}.pdf"`,
    },
  });
}

async function regeneratePdf(invoice: InstanceType<typeof Invoice>) {
  const payment = await Payment.findById(invoice.paymentId);
  return generateInvoicePdfBuffer({
    invoiceNumber: invoice.invoiceNumber,
    createdAt: invoice.createdAt,
    businessName: invoice.businessSnapshot.businessName,
    themeColor: invoice.businessSnapshot.themeColor,
    clientName: invoice.clientSnapshot.name,
    clientPhone: invoice.clientSnapshot.phone,
    lineItems: invoice.lineItems,
    amount: invoice.amount,
    paymentMethod: payment
      ? PAYMENT_METHOD_LABELS[payment.method] || payment.method
      : "מזומן",
  });
}
