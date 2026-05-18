import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { runReactivationJob } from "@/lib/reactivation";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectDB();
    const result = await runReactivationJob();

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...result,
    });
  } catch (error) {
    console.error("Cron reactivation error:", error);
    return NextResponse.json({ error: "Cron job failed" }, { status: 500 });
  }
}
