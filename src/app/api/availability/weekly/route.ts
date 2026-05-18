import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthFromRequest } from "@/lib/api-auth";
import { canAccess } from "@/lib/subscription";
import { getOrCreateWeeklySchedule } from "@/lib/availability";
import { WeeklySchedule } from "@/models/WeeklySchedule";

const daySchema = z.object({
  dayOfWeek: z.number().min(0).max(6),
  isOpen: z.boolean(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
});

const updateSchema = z.object({
  days: z.array(daySchema).length(7),
  slotDurationMinutes: z.number().min(15).max(120).optional(),
});

export async function GET(request: Request) {
  const auth = await requireAuthFromRequest(request);
  if (auth instanceof NextResponse) return auth;

  if (!canAccess(auth.user.subscriptionTier, "appointments")) {
    return NextResponse.json({ error: "Pro plan required" }, { status: 403 });
  }

  const schedule = await getOrCreateWeeklySchedule(auth.user.id);
  return NextResponse.json({ schedule });
}

export async function PUT(request: Request) {
  const auth = await requireAuthFromRequest(request);
  if (auth instanceof NextResponse) return auth;

  if (!canAccess(auth.user.subscriptionTier, "appointments")) {
    return NextResponse.json({ error: "Pro plan required" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const parsed = updateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid schedule" }, { status: 400 });
    }

    const schedule = await WeeklySchedule.findOneAndUpdate(
      { userId: auth.user.id },
      {
        days: parsed.data.days,
        ...(parsed.data.slotDurationMinutes && {
          slotDurationMinutes: parsed.data.slotDurationMinutes,
        }),
      },
      { new: true, upsert: true }
    );

    return NextResponse.json({ schedule });
  } catch (error) {
    console.error("Update weekly schedule error:", error);
    return NextResponse.json({ error: "Failed to update schedule" }, { status: 500 });
  }
}
