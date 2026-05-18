import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import { requireAuthFromRequest } from "@/lib/api-auth";
import { canAccess } from "@/lib/subscription";
import { Service } from "@/models/Service";
import { serializeService } from "@/lib/pricing";

const addOnSchema = z.object({
  _id: z.string().optional(),
  name: z.string().min(1),
  price: z.number().min(0),
  active: z.boolean().optional(),
});

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  durationMinutes: z.number().min(15).optional(),
  basePrice: z.number().min(0).optional(),
  price: z.number().min(0).optional(),
  addOns: z.array(addOnSchema).optional(),
  active: z.boolean().optional(),
  sortOrder: z.number().optional(),
});

export async function PUT(
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

  try {
    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const service = await Service.findOne({ _id: id, userId: auth.user.id });
    if (!service) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 });
    }

    if (parsed.data.name) service.name = parsed.data.name;
    if (parsed.data.durationMinutes) service.durationMinutes = parsed.data.durationMinutes;
    if (parsed.data.basePrice !== undefined) service.basePrice = parsed.data.basePrice;
    if (parsed.data.price !== undefined) service.basePrice = parsed.data.price;
    if (parsed.data.active !== undefined) service.active = parsed.data.active;
    if (parsed.data.sortOrder !== undefined) service.sortOrder = parsed.data.sortOrder;
    if (parsed.data.addOns) {
      service.set(
        "addOns",
        parsed.data.addOns.map((a) => ({
          name: a.name,
          price: a.price,
          active: a.active !== false,
        }))
      );
    }

    await service.save();
    return NextResponse.json({ service: serializeService(service) });
  } catch (error) {
    console.error("Update service error:", error);
    return NextResponse.json({ error: "Failed to update service" }, { status: 500 });
  }
}

export async function DELETE(
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

  const service = await Service.findOneAndUpdate(
    { _id: id, userId: auth.user.id },
    { active: false },
    { new: true }
  );

  if (!service) {
    return NextResponse.json({ error: "Service not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
