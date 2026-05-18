import { NextResponse } from "next/server";
import { getEnvMode } from "@/lib/env";
import { isStripeConfigured } from "@/lib/stripe-config";

export const dynamic = "force-dynamic";

/** Public config snapshot (no secrets) — use after deploy to verify env vars. */
export async function GET() {
  const jwt = process.env.JWT_SECRET?.trim() || "";
  return NextResponse.json({
    envMode: getEnvMode(),
    appUrl: process.env.NEXT_PUBLIC_APP_URL || null,
    checks: {
      mongo: Boolean(process.env.MONGODB_URI?.trim()),
      jwt: jwt.length >= 32,
      cron: (process.env.CRON_SECRET?.trim() || "").length >= 16,
      stripe: isStripeConfigured(),
      landingDemo: process.env.ENABLE_LANDING_DEMO === "true",
    },
    timestamp: new Date().toISOString(),
  });
}
