import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getEnvMode, isDemoMode, shouldUseInMemoryMongo } from "@/lib/env";

export const dynamic = "force-dynamic";

export async function GET() {
  const checks: Record<string, "ok" | "error" | "skipped"> = {
    env_jwt: "error",
    env_mongo: "error",
    database: "error",
  };

  if (process.env.JWT_SECRET) checks.env_jwt = "ok";
  if (isDemoMode() && shouldUseInMemoryMongo()) {
    checks.env_mongo = "skipped";
  } else if (process.env.MONGODB_URI || process.env.MONGODB_URI_DEMO) {
    checks.env_mongo = "ok";
  }

  try {
    await connectDB();
    checks.database = "ok";
  } catch {
    checks.database = "error";
  }

  const required = Object.entries(checks).filter(([, v]) => v !== "skipped");
  const healthy = required.every(([, v]) => v === "ok");

  return NextResponse.json(
    {
      status: healthy ? "healthy" : "degraded",
      envMode: getEnvMode(),
      demo: isDemoMode(),
      checks,
      timestamp: new Date().toISOString(),
    },
    { status: healthy ? 200 : 503 }
  );
}
