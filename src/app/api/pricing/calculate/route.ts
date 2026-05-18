import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import { requireAuthFromRequest } from "@/lib/api-auth";
import { Service } from "@/models/Service";
import { buildPriceBreakdown } from "@/lib/pricing";

const schema = z.object({
  serviceId: z.string().optional(),
  serviceName: z.string().optional(),
  basePrice: z.number().optional(),
  selectedAddOnIds: z.array(z.string()).optional(),
  extraLineItems: z
    .array(z.object({ label: z.string(), amount: z.number() }))
    .optional(),
  manualFinalPrice: z.number().optional(),
});

export async function POST(request: Request) {
  const auth = await requireAuthFromRequest(request);
  if (auth instanceof NextResponse) return auth;

  await connectDB();

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  let service = null;
  if (parsed.data.serviceId) {
    service = await Service.findOne({ _id: parsed.data.serviceId, userId: auth.user.id });
  }

  const result = buildPriceBreakdown({
    service,
    serviceName: parsed.data.serviceName,
    basePrice: parsed.data.basePrice,
    selectedAddOnIds: parsed.data.selectedAddOnIds,
    extraLineItems: parsed.data.extraLineItems,
    manualFinalPrice: parsed.data.manualFinalPrice,
  });

  return NextResponse.json(result);
}
