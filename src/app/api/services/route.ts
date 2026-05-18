import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import { requireAuthFromRequest } from "@/lib/api-auth";
import { canAccess } from "@/lib/subscription";
import { Service } from "@/models/Service";
import { serializeService } from "@/lib/pricing";

const addOnSchema = z.object({
  name: z.string().min(1),
  price: z.number().min(0),
  active: z.boolean().optional(),
});

const createSchema = z.object({
  name: z.string().min(1),
  durationMinutes: z.number().min(15).default(60),
  basePrice: z.number().min(0).default(0),
  price: z.number().min(0).optional(),
  addOns: z.array(addOnSchema).optional(),
});

export async function GET(request: Request) {
  const auth = await requireAuthFromRequest(request);
  if (auth instanceof NextResponse) return auth;

  await connectDB();

  const { searchParams } = new URL(request.url);
  const all = searchParams.get("all") === "true";

  const query: Record<string, unknown> = { userId: auth.user.id };
  if (!all) query.active = true;

  const services = await Service.find(query).sort({ sortOrder: 1, createdAt: 1 }).lean();

  return NextResponse.json({
    services: services.map((s) => serializeService(s)),
  });
}

export async function POST(request: Request) {
  const auth = await requireAuthFromRequest(request);
  if (auth instanceof NextResponse) return auth;

  if (!canAccess(auth.user.subscriptionTier, "appointments")) {
    return NextResponse.json({ error: "Pro plan required" }, { status: 403 });
  }

  await connectDB();

  try {
    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const count = await Service.countDocuments({ userId: auth.user.id });
    const service = await Service.create({
      userId: auth.user.id,
      name: parsed.data.name,
      durationMinutes: parsed.data.durationMinutes,
      basePrice: parsed.data.basePrice ?? parsed.data.price ?? 0,
      addOns: parsed.data.addOns || [],
      sortOrder: count,
    });

    return NextResponse.json({ service: serializeService(service) }, { status: 201 });
  } catch (error) {
    console.error("Create service error:", error);
    return NextResponse.json({ error: "Failed to create service" }, { status: 500 });
  }
}
