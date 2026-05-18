import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import { requireAuthFromRequest } from "@/lib/api-auth";
import { Feedback } from "@/models/Feedback";

const schema = z.object({
  type: z.enum(["feature", "bug", "improvement"]),
  title: z.string().min(3),
  description: z.string().min(10),
});

export async function GET(request: Request) {
  const auth = await requireAuthFromRequest(request);
  if (auth instanceof NextResponse) return auth;

  await connectDB();
  const items = await Feedback.find({ userId: auth.user.id }).sort({ createdAt: -1 }).limit(50);
  return NextResponse.json({ feedback: items });
}

export async function POST(request: Request) {
  const auth = await requireAuthFromRequest(request);
  if (auth instanceof NextResponse) return auth;

  await connectDB();
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const item = await Feedback.create({
    userId: auth.user.id,
    email: auth.user.email,
    ...parsed.data,
  });

  return NextResponse.json({ feedback: item }, { status: 201 });
}
