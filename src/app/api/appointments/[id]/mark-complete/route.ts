import { NextResponse } from "next/server";
import { requireAuthFromRequest } from "@/lib/api-auth";
import { canAccess } from "@/lib/subscription";
import { markAppointmentCompleted } from "@/lib/client-payment";
import { trackEvent } from "@/lib/analytics/event-tracker";

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
    const appointment = await markAppointmentCompleted(auth.user.id, id);

    trackEvent({
      type: "appointment_completed",
      userId: auth.user.id,
      metadata: { appointmentId: id, source: "mark_complete" },
    });

    return NextResponse.json({
      appointment: {
        _id: appointment._id.toString(),
        status: appointment.status,
        paymentStatus: appointment.paymentStatus,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed" },
      { status: 400 }
    );
  }
}
