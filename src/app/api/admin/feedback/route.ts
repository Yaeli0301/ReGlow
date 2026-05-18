import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import { requireAuthFromRequest, requireRole } from "@/lib/api-auth";
import { Feedback } from "@/models/Feedback";

export async function GET(request: Request) {
  const auth = await requireAuthFromRequest(request);
  if (auth instanceof NextResponse) return auth;
  const roleErr = requireRole(auth.user, "admin");
  if (roleErr) return roleErr;

  await connectDB();
  const items = await Feedback.find().sort({ priority: -1, createdAt: -1 }).limit(200);
  return NextResponse.json({ feedback: items });
}

const patchSchema = z.object({
  id: z.string(),
  status: z.enum(["open", "in_progress", "done", "rejected"]).optional(),
  priority: z.number().optional(),
});

export async function PATCH(request: Request) {
  const auth = await requireAuthFromRequest(request);
  if (auth instanceof NextResponse) return auth;
  const roleErr = requireRole(auth.user, "admin");
  if (roleErr) return roleErr;

  await connectDB();
  const parsed = patchSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const updated = await Feedback.findByIdAndUpdate(
    parsed.data.id,
    {
      ...(parsed.data.status && { status: parsed.data.status }),
      ...(parsed.data.priority !== undefined && { priority: parsed.data.priority }),
    },
    { new: true }
  );

  return NextResponse.json({ feedback: updated });
}
