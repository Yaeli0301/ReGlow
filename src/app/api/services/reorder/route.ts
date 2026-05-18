import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import { requireAuthFromRequest } from "@/lib/api-auth";
import { canAccess } from "@/lib/subscription";
import { Service } from "@/models/Service";

const schema = z.object({
  orderedIds: z.array(z.string()).min(1),
});

export async function PUT(request: Request) {
  const auth = await requireAuthFromRequest(request);
  if (auth instanceof NextResponse) return auth;

  if (!canAccess(auth.user.subscriptionTier, "appointments")) {
    return NextResponse.json({ error: "Pro plan required" }, { status: 403 });
  }

  await connectDB();

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  await Promise.all(
    parsed.data.orderedIds.map((id, index) =>
      Service.updateOne({ _id: id, userId: auth.user.id }, { sortOrder: index })
    )
  );

  return NextResponse.json({ success: true });
}
