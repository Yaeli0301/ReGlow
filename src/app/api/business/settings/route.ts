import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import { requireAuthFromRequest } from "@/lib/api-auth";
import { canAccess } from "@/lib/subscription";
import {
  getOrCreateBusinessSettings,
  serializeBusinessSettings,
} from "@/lib/business-settings";

const updateSchema = z.object({
  businessName: z.string().min(2).optional(),
  themeColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  logoData: z.string().max(500_000).optional().nullable(),
});

export async function GET(request: Request) {
  const auth = await requireAuthFromRequest(request);
  if (auth instanceof NextResponse) return auth;

  await connectDB();
  const settings = await getOrCreateBusinessSettings(auth.user.id);
  return NextResponse.json({ settings: serializeBusinessSettings(settings) });
}

export async function PUT(request: Request) {
  const auth = await requireAuthFromRequest(request);
  if (auth instanceof NextResponse) return auth;

  if (!canAccess(auth.user.subscriptionTier, "appointments")) {
    return NextResponse.json({ error: "Pro plan required" }, { status: 403 });
  }

  await connectDB();

  try {
    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const settings = await getOrCreateBusinessSettings(auth.user.id);

    if (parsed.data.businessName) settings.businessName = parsed.data.businessName;
    if (parsed.data.themeColor) settings.themeColor = parsed.data.themeColor;
    if (parsed.data.logoData !== undefined) settings.logoData = parsed.data.logoData || undefined;

    await settings.save();

    return NextResponse.json({ settings: serializeBusinessSettings(settings) });
  } catch (error) {
    console.error("Update business settings error:", error);
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}
