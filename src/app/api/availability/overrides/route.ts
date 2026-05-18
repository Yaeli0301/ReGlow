import { NextResponse } from "next/server";
import { z } from "zod";
import { startOfDay } from "date-fns";
import { requireAuthFromRequest } from "@/lib/api-auth";
import { canAccess } from "@/lib/subscription";
import { DateOverride } from "@/models/DateOverride";

const blockedSlotSchema = z.object({
  startTime: z.string(),
  endTime: z.string(),
});

const createSchema = z.object({
  date: z.string(),
  isClosed: z.boolean().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  blockedSlots: z.array(blockedSlotSchema).optional(),
  note: z.string().optional(),
});

export async function GET(request: Request) {
  const auth = await requireAuthFromRequest(request);
  if (auth instanceof NextResponse) return auth;

  if (!canAccess(auth.user.subscriptionTier, "appointments")) {
    return NextResponse.json({ error: "Pro plan required" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const query: Record<string, unknown> = { userId: auth.user.id };

  if (from || to) {
    query.date = {};
    if (from) (query.date as Record<string, Date>).$gte = startOfDay(new Date(from));
    if (to) (query.date as Record<string, Date>).$lte = startOfDay(new Date(to));
  }

  const overrides = await DateOverride.find(query).sort({ date: 1 }).lean();
  return NextResponse.json({ overrides });
}

export async function POST(request: Request) {
  const auth = await requireAuthFromRequest(request);
  if (auth instanceof NextResponse) return auth;

  if (!canAccess(auth.user.subscriptionTier, "appointments")) {
    return NextResponse.json({ error: "Pro plan required" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const parsed = createSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const date = startOfDay(new Date(parsed.data.date));

    const override = await DateOverride.findOneAndUpdate(
      { userId: auth.user.id, date },
      {
        userId: auth.user.id,
        date,
        isClosed: parsed.data.isClosed ?? false,
        startTime: parsed.data.startTime,
        endTime: parsed.data.endTime,
        blockedSlots: parsed.data.blockedSlots ?? [],
        note: parsed.data.note,
      },
      { upsert: true, new: true }
    );

    return NextResponse.json({ override }, { status: 201 });
  } catch (error) {
    console.error("Create override error:", error);
    return NextResponse.json({ error: "Failed to save override" }, { status: 500 });
  }
}
