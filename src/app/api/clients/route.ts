import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthFromRequest, requireSubscription } from "@/lib/api-auth";
import { canAccess } from "@/lib/subscription";
import { Client } from "@/models/Client";
import { computeClientStatus } from "@/lib/client-status";
import { createManualClient, mergeDuplicateClients } from "@/lib/client-service";
import { normalizePhone } from "@/lib/phone";

const createSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(5),
  notes: z.string().optional(),
});

export async function GET(request: Request) {
  const auth = await requireAuthFromRequest(request);
  if (auth instanceof NextResponse) return auth;

  const subError = requireSubscription(auth.user);
  if (subError) return subError;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");

  const query: Record<string, unknown> = { userId: auth.user.id };
  if (status && ["active", "atRisk", "lost"].includes(status)) {
    query.status = status;
  }

  const clients = await Client.find(query).sort({ updatedAt: -1 }).lean();

  const enriched = clients.map((c) => ({
    ...c,
    _id: c._id.toString(),
    userId: c.userId.toString(),
    status: computeClientStatus(c.lastVisitDate),
  }));

  return NextResponse.json({ clients: enriched });
}

export async function POST(request: Request) {
  const auth = await requireAuthFromRequest(request);
  if (auth instanceof NextResponse) return auth;

  if (!canAccess(auth.user.subscriptionTier, "clients")) {
    return NextResponse.json({ error: "Upgrade required" }, { status: 403 });
  }

  const subError = requireSubscription(auth.user);
  if (subError) return subError;

  try {
    const body = await request.json();
    const parsed = createSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const { name, phone, notes } = parsed.data;

    const client = await createManualClient({
      userId: auth.user.id,
      name,
      phone,
      notes,
    });

    return NextResponse.json({ client }, { status: 201 });
  } catch (error) {
    console.error("Create client error:", error);
    return NextResponse.json({ error: "Failed to create client" }, { status: 500 });
  }
}

/** Merge all duplicate phones for the current business (maintenance). */
export async function PATCH(request: Request) {
  const auth = await requireAuthFromRequest(request);
  if (auth instanceof NextResponse) return auth;

  const subError = requireSubscription(auth.user);
  if (subError) return subError;

  const clients = await Client.find({ userId: auth.user.id }).select("phoneNormalized");
  const phones = [...new Set(clients.map((c) => c.phoneNormalized))];

  let merged = 0;
  for (const phoneNormalized of phones) {
    const before = await Client.countDocuments({ userId: auth.user.id, phoneNormalized });
    await mergeDuplicateClients(auth.user.id, phoneNormalized);
    const after = await Client.countDocuments({ userId: auth.user.id, phoneNormalized });
    if (before > after) merged += before - after;
  }

  return NextResponse.json({ merged });
}
