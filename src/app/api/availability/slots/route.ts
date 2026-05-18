import { NextResponse } from "next/server";
import { startOfDay } from "date-fns";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { getAvailableSlots } from "@/lib/availability";
import { canAccess } from "@/lib/subscription";

export async function GET(request: Request) {
  await connectDB();

  const { searchParams } = new URL(request.url);
  const businessId = searchParams.get("businessId");
  const dateStr = searchParams.get("date");

  if (!businessId || !dateStr) {
    return NextResponse.json({ error: "businessId and date required" }, { status: 400 });
  }

  const user = await User.findById(businessId).select("subscriptionTier");
  if (!user || !canAccess(user.subscriptionTier, "booking")) {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }

  const date = startOfDay(new Date(dateStr));
  const slots = await getAvailableSlots(businessId, date);

  return NextResponse.json({
    slots: slots.map((s) => ({
      start: s.start.toISOString(),
      end: s.end.toISOString(),
      label: s.label,
    })),
  });
}
