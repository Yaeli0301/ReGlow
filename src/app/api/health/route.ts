import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getEnvMode, isDemoMode, shouldUseInMemoryMongo } from "@/lib/env";
import { isProductionReady, arePaymentsReady } from "@/lib/production-guard";
import { getSystemState } from "@/lib/system/system-state";
import { getAppMode } from "@/lib/system/mode";

export const dynamic = "force-dynamic";

type Check = "ok" | "error" | "skipped";

interface HealthChecks {
  env_jwt: Check;
  env_mongo: Check;
  env_app_url: Check;
  env_cron: Check;
  database: Check;
  stripe: Check;
}

export async function GET() {
  const checks: HealthChecks = {
    env_jwt: process.env.JWT_SECRET && process.env.JWT_SECRET.length >= 32 ? "ok" : "error",
    env_mongo: "error",
    env_app_url: /^https?:\/\//.test(process.env.NEXT_PUBLIC_APP_URL || "") ? "ok" : "error",
    env_cron:
      (process.env.CRON_SECRET?.length || 0) >= 16 ? "ok" : "error",
    database: "error",
    stripe: "skipped",
  };

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

  const payments = arePaymentsReady();
  checks.stripe = payments.ready ? "ok" : "error";

  const prodReady = isProductionReady();

  let systemSnapshot;
  try {
    systemSnapshot = await getSystemState({ skipDb: checks.database !== "ok" });
  } catch (error) {
    systemSnapshot = {
      state: "BLOCKED" as const,
      reason: error instanceof Error ? error.message : "System check failed",
      reasons: [],
      degraded: [],
      checks: {
        env: false,
        database: false,
        killSwitch: true,
        stripe: false,
        cron: false,
        email: false,
      },
      timestamp: new Date().toISOString(),
    };
  }

  const criticalKeys: (keyof HealthChecks)[] = [
    "env_jwt",
    "env_mongo",
    "env_app_url",
    "env_cron",
    "database",
  ];
  const allCriticalOk = criticalKeys.every((k) => checks[k] === "ok" || checks[k] === "skipped");

  const httpOk = allCriticalOk && systemSnapshot.state !== "BLOCKED";

  return NextResponse.json(
    {
      success: httpOk,
      status: systemSnapshot.state === "BLOCKED" ? "blocked" : allCriticalOk ? "healthy" : "degraded",
      envMode: getEnvMode(),
      demo: isDemoMode(),
      checks,
      ready: prodReady.ready,
      missingCore: prodReady.missing,
      paymentsReady: payments.ready,
      missingPayments: payments.missing,
      system: {
        state: systemSnapshot.state,
        maintenance: systemSnapshot.state === "BLOCKED",
        reason: systemSnapshot.reason,
        reasons: systemSnapshot.reasons,
        degraded: systemSnapshot.degraded,
        checks: systemSnapshot.checks,
        mode: getAppMode(),
      },
      timestamp: new Date().toISOString(),
    },
    { status: httpOk ? 200 : 503 }
  );
}
