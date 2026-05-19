import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthFromRequest } from "@/lib/api-auth";
import { canAccess } from "@/lib/subscription";
import { completeAppointmentWithPayment } from "@/lib/payment-service";
import { trackEvent } from "@/lib/analytics/event-tracker";

const schema = z.object({
  method: z.enum(["cash", "card", "bit", "paypal"]),
  serviceId: z.string().optional(),
  selectedAddOnIds: z.array(z.string()).optional(),
  extraLineItems: z
    .array(z.object({ label: z.string().min(1), amount: z.number() }))
    .optional(),
  manualFinalPrice: z.number().min(0).optional(),
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

    const result = await completeAppointmentWithPayment({
      userId: auth.user.id,
      appointmentId: id,
      ...parsed.data,
    });

    trackEvent({
      type: "appointment_completed",
      userId: auth.user.id,
      metadata: {
        appointmentId: id,
        amount: result.payment.amount,
        method: result.payment.method,
      },
    });
    if (result.payment.status === "paid") {
      trackEvent({
        type: "payment_succeeded",
        userId: auth.user.id,
        metadata: {
          amount: result.payment.amount,
          method: result.payment.method,
          source: "appointment_complete",
        },
      });
    }

    return NextResponse.json({
      appointment: {
        _id: result.appointment._id.toString(),
        status: result.appointment.status,
        paymentStatus: result.appointment.paymentStatus,
        finalPrice: result.appointment.finalPrice,
        priceLineItems: result.appointment.priceLineItems,
      },
      payment: {
        _id: result.payment._id.toString(),
        method: result.payment.method,
        amount: result.payment.amount,
        status: result.payment.status,
      },
      invoice: result.invoice
        ? {
            _id: result.invoice._id.toString(),
            invoiceNumber: result.invoice.invoiceNumber,
            pdfUrl: result.invoice.pdfUrl,
          }
        : null,
      requiresCashConfirmation: result.requiresCashConfirmation,
    });
  } catch (error) {
    console.error("Complete appointment error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to complete" },
      { status: 500 }
    );
  }
}
