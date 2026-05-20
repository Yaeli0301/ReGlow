import { NextResponse } from "next/server";
import { requireAuthFromRequest } from "@/lib/api-auth";
import { canAccess } from "@/lib/subscription";
import { ensureAppointmentPaymentToken } from "@/lib/client-payment";
import { buildPublicPaymentUrl } from "@/lib/notifications";

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

  try {
    const token = await ensureAppointmentPaymentToken(id, auth.user.id);
    const origin = new URL(request.url).origin;
    const paymentUrl = buildPublicPaymentUrl(token, origin);

    return NextResponse.json({ paymentUrl, paymentToken: token });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed" },
      { status: 404 }
    );
  }
}
