import { NextResponse } from "next/server";
import { requireAuthFromRequest } from "@/lib/api-auth";
import { resolveAppOrigin } from "@/lib/app-url";
import { shouldBlockPaidCheckout } from "@/lib/env";
import { createBillingPortalSession } from "@/lib/stripe";

export async function POST(request: Request) {
  const auth = await requireAuthFromRequest(request, { loadDbUser: true });
  if (auth instanceof NextResponse) return auth;

  if (shouldBlockPaidCheckout()) {
    return NextResponse.json(
      { error: "בדמו אין ניהול מנוי ב-Stripe", code: "DEMO_PORTAL_BLOCKED" },
      { status: 403 }
    );
  }

  if (!auth.dbUser?.stripeCustomerId) {
    return NextResponse.json({ error: "No billing account found" }, { status: 400 });
  }

  try {
    const session = await createBillingPortalSession(
      auth.dbUser.stripeCustomerId,
      resolveAppOrigin(request)
    );
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Portal error:", error);
    return NextResponse.json({ error: "Failed to open billing portal" }, { status: 500 });
  }
}
