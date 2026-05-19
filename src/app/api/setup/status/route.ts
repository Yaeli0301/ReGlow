import { NextResponse } from "next/server";
import {
  getEnvMode,
  getLandingDemoMongoUri,
  getDemoMongoEnvKeysPresent,
  getDemoMongoEnvStatus,
  isValidMongoUri,
  sanitizeMongoUri,
} from "@/lib/env";
import { isStripeConfigured } from "@/lib/stripe-config";
import { isProductionReady, arePaymentsReady } from "@/lib/production-guard";

export const dynamic = "force-dynamic";

/** Public config snapshot (no secrets) — use after deploy to verify env vars. */
export async function GET() {
  const jwt = process.env.JWT_SECRET?.trim() || "";
  const core = isProductionReady();
  const payments = arePaymentsReady();

  const demoMongo = getDemoMongoEnvStatus();
  let mongoConnected = false;
  let mongoConnectionError: string | null = demoMongo.hint;

  if (demoMongo.uriValid || isValidMongoUri(sanitizeMongoUri(process.env.MONGODB_URI || ""))) {
    try {
      const { connectDB } = await import("@/lib/mongodb");
      await connectDB();
      mongoConnected = true;
      mongoConnectionError = null;
    } catch (error) {
      mongoConnected = false;
      mongoConnectionError =
        error instanceof Error ? error.message : "MongoDB connection failed";
    }
  }

  return NextResponse.json({
    success: true,
    envMode: getEnvMode(),
    appUrl: process.env.NEXT_PUBLIC_APP_URL || null,
    deploy: {
      commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null,
      ref: process.env.VERCEL_GIT_COMMIT_REF ?? null,
    },
    checks: {
      mongo: Boolean(process.env.MONGODB_URI?.trim() || getLandingDemoMongoUri()),
      mongoDemo: Boolean(getLandingDemoMongoUri()),
      mongoDemoEnvKeys: getDemoMongoEnvKeysPresent(),
      mongoDemoKey: demoMongo.key,
      mongoDemoUriValid: demoMongo.uriValid,
      mongoDemoInvalidKeys: demoMongo.invalidKeys,
      mongoConnected,
      mongoConnectionError,
      jwt: jwt.length >= 32,
      cron: (process.env.CRON_SECRET?.trim() || "").length >= 16,
      stripe: isStripeConfigured(),
      landingDemo: process.env.ENABLE_LANDING_DEMO === "true",
    },
    productionReady: core.ready,
    missingCore: core.missing,
    paymentsReady: payments.ready,
    missingPayments: payments.missing,
    timestamp: new Date().toISOString(),
  });
}
