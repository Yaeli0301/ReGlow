import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { runRetentionEngine } from "@/lib/retention-engine";
import { runReactivationJob } from "@/lib/reactivation";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();
  const retention = await runRetentionEngine();
  const legacy = await runReactivationJob();

  return NextResponse.json({
    success: true,
    timestamp: new Date().toISOString(),
    retention,
    legacy,
  });
}
