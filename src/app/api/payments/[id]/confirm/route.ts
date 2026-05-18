import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthFromRequest } from "@/lib/api-auth";
import { canAccess } from "@/lib/subscription";
import { confirmCashPayment } from "@/lib/payment-service";

const schema = z.object({
  amountReceived: z.number().min(0),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuthFromRequest(request);
  if (auth instanceof NextResponse) return auth;

  if (!canAccess(auth.user.subscriptionTier, "appointments")) {
    return NextResponse.json({ error: "Pro plan required" }, { status: 403 });
  }

  const { id } = await params;

  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const result = await confirmCashPayment({
      userId: auth.user.id,
      paymentId: id,
      amountReceived: parsed.data.amountReceived,
    });

    return NextResponse.json({
      payment: {
        _id: result.payment._id.toString(),
        status: result.payment.status,
        amount: result.payment.amount,
      },
      invoice: {
        _id: result.invoice._id.toString(),
        invoiceNumber: result.invoice.invoiceNumber,
        pdfUrl: result.invoice.pdfUrl,
        amount: result.invoice.amount,
      },
    });
  } catch (error) {
    console.error("Confirm cash payment error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Confirmation failed" },
      { status: 500 }
    );
  }
}
