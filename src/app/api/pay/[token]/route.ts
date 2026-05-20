import { NextResponse } from "next/server";
import { z } from "zod";
import { getPaymentPageData, submitClientPayment } from "@/lib/client-payment";

const paySchema = z.object({
  method: z.enum(["card", "cash", "other"]),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  try {
    const data = await getPaymentPageData(token);
    if (!data) {
      return NextResponse.json({ error: "Invalid or expired link" }, { status: 404 });
    }
    return NextResponse.json(data);
  } catch (error) {
    console.error("[pay GET]", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  try {
    const body = await request.json();
    const parsed = paySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const result = await submitClientPayment({
      paymentToken: token,
      method: parsed.data.method,
    });

    if (result.alreadyPaid) {
      return NextResponse.json({ success: true, alreadyPaid: true });
    }

    return NextResponse.json({
      success: true,
      requiresCashConfirmation: result.requiresCashConfirmation,
      cardPaid: result.cardPaid,
      invoice: result.invoice
        ? {
            invoiceNumber: result.invoice.invoiceNumber,
            pdfUrl: result.invoice.pdfUrl,
          }
        : null,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Payment failed";
    const status =
      msg.includes("Invalid") || msg.includes("pending") ? 400 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
