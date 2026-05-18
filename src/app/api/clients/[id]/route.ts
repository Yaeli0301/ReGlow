import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthFromRequest, requireSubscription } from "@/lib/api-auth";
import { Client } from "@/models/Client";
import { computeClientStatus } from "@/lib/client-status";
import { mergeDuplicateClients } from "@/lib/client-service";
import { normalizePhone, formatPhoneDisplay } from "@/lib/phone";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().min(5).optional(),
  notes: z.string().optional(),
});

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuthFromRequest(request);
  if (auth instanceof NextResponse) return auth;

  const subError = requireSubscription(auth.user);
  if (subError) return subError;

  const { id } = await params;

  try {
    const body = await request.json();
    const parsed = updateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const client = await Client.findOne({ _id: id, userId: auth.user.id });
    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    if (parsed.data.name) client.name = parsed.data.name;
    if (parsed.data.phone) {
      client.phone = formatPhoneDisplay(parsed.data.phone);
      client.phoneNormalized = normalizePhone(parsed.data.phone);
    }
    if (parsed.data.notes !== undefined) client.notes = parsed.data.notes;

    client.status = computeClientStatus(client.lastVisitDate);
    await client.save();

    const merged = await mergeDuplicateClients(
      auth.user.id,
      client.phoneNormalized,
      client._id
    );

    return NextResponse.json({ client: merged ?? client });
  } catch (error) {
    console.error("Update client error:", error);
    return NextResponse.json({ error: "Failed to update client" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuthFromRequest(request);
  if (auth instanceof NextResponse) return auth;

  const subError = requireSubscription(auth.user);
  if (subError) return subError;

  const { id } = await params;

  const result = await Client.findOneAndDelete({ _id: id, userId: auth.user.id });

  if (!result) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
