import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthFromRequest } from "@/lib/api-auth";
import { canAccess } from "@/lib/subscription";
import { Service } from "@/models/Service";

const createSchema = z.object({
  name: z.string().min(1),
  durationMinutes: z.number().min(15).default(60),
  price: z.number().min(0).default(0),
});

export async function GET(request: Request) {
  const auth = await requireAuthFromRequest(request);
  if (auth instanceof NextResponse) return auth;

  const services = await Service.find({ userId: auth.user.id, active: true }).lean();
  return NextResponse.json({ services });
}

export async function POST(request: Request) {
  const auth = await requireAuthFromRequest(request);
  if (auth instanceof NextResponse) return auth;

  if (!canAccess(auth.user.subscriptionTier, "booking")) {
    return NextResponse.json({ error: "Premium plan required" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const parsed = createSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const service = await Service.create({
      userId: auth.user.id,
      ...parsed.data,
    });

    return NextResponse.json({ service }, { status: 201 });
  } catch (error) {
    console.error("Create service error:", error);
    return NextResponse.json({ error: "Failed to create service" }, { status: 500 });
  }
}
