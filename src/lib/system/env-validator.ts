/**
 * Strict environment validation.
 * In production: invalid config throws on assertEnvValid().
 */

import { getAppMode, isProduction } from "@/lib/system/mode";
import { getLandingDemoMongoUri } from "@/lib/env";

export interface EnvCheck {
  key: string;
  present: boolean;
  valid: boolean;
  reason?: string;
}

export interface EnvValidationResult {
  valid: boolean;
  /** Issues that BLOCK the system (critical). */
  blocking: string[];
  /** Issues that DEGRADE but do not block. */
  degraded: string[];
  checks: EnvCheck[];
}

const VALID_MODES = ["production", "demo", "development", "dev"] as const;

function checkKey(key: string, minLen = 1): EnvCheck {
  const raw = process.env[key]?.trim() || "";
  const present = raw.length > 0;
  let valid = present && raw.length >= minLen;
  let reason: string | undefined;

  if (!present) {
    reason = "missing";
  } else if (key === "JWT_SECRET" && raw.length < 32) {
    valid = false;
    reason = "too short (need 32+ chars)";
  } else if (key === "CRON_SECRET" && raw.length < 16) {
    valid = false;
    reason = "too short (need 16+ chars)";
  } else if (key === "MONGODB_URI") {
    if (!/^mongodb(\+srv)?:\/\//.test(raw)) {
      valid = false;
      reason = "not a valid MongoDB URI";
    }
    // URI without /reglow is OK — connectDB sets dbName: "reglow" (see src/lib/mongodb.ts)
  } else if (key === "NEXT_PUBLIC_APP_URL") {
    if (!/^https?:\/\//.test(raw)) {
      valid = false;
      reason = "must start with http(s)://";
    }
  } else if (key === "ENV_MODE") {
    if (!VALID_MODES.includes(raw.toLowerCase() as (typeof VALID_MODES)[number])) {
      valid = false;
      reason = "must be production | demo | development";
    }
  } else if (key === "STRIPE_SECRET_KEY" && !raw.startsWith("sk_")) {
    valid = false;
    reason = "not a Stripe secret key";
  } else if (key === "STRIPE_WEBHOOK_SECRET" && !raw.startsWith("whsec_")) {
    valid = false;
    reason = "not a Stripe webhook secret";
  } else if (
    key.startsWith("STRIPE_PRICE_") &&
    (!raw.startsWith("price_") ||
      raw === "price_basic" ||
      raw === "price_pro" ||
      raw === "price_premium")
  ) {
    valid = false;
    reason = "placeholder or invalid price ID";
  }

  return { key, present, valid, reason };
}

/** True if URI path contains a database name segment. */
export function mongoUriHasDbName(uri: string): boolean {
  const withoutQuery = uri.split("?")[0];
  const path = withoutQuery.replace(/^mongodb(\+srv)?:\/\/[^/]+/, "");
  return path.length > 1 && path !== "/";
}

const CORE_KEYS = [
  "JWT_SECRET",
  "CRON_SECRET",
  "MONGODB_URI",
  "NEXT_PUBLIC_APP_URL",
  "ENV_MODE",
] as const;

const PAYMENT_KEYS = [
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "STRIPE_PRICE_BASIC",
  "STRIPE_PRICE_PRO",
  "STRIPE_PRICE_PREMIUM",
] as const;

const EMAIL_KEYS = ["RESEND_API_KEY", "ADMIN_EMAIL"] as const;

export function validateEnv(): EnvValidationResult {
  const checks = [
    ...CORE_KEYS.map((k) => checkKey(k)),
    ...PAYMENT_KEYS.map((k) => checkKey(k)),
    ...EMAIL_KEYS.map((k) => checkKey(k)),
  ];

  const blocking: string[] = [];
  const degraded: string[] = [];

  const mode = getAppMode();

  // Critical — JWT always required; Mongo required unless demo DB URI is configured
  const jwtCheck = checks.find((x) => x.key === "JWT_SECRET")!;
  if (!jwtCheck.valid) blocking.push(`JWT_SECRET (${jwtCheck.reason})`);

  const mongoCheck = checks.find((x) => x.key === "MONGODB_URI")!;
  const hasDemoMongo = Boolean(getLandingDemoMongoUri());
  const mongoRequired = mode === "production" || !hasDemoMongo;
  if (mongoRequired && !mongoCheck.valid) {
    blocking.push(`MONGODB_URI (${mongoCheck.reason})`);
  } else if (mongoRequired && mongoCheck.valid && !mongoUriHasDbName(process.env.MONGODB_URI || "")) {
    degraded.push("MONGODB_URI has no database path — using dbName reglow");
  } else if (mode !== "production" && hasDemoMongo && !mongoCheck.valid) {
    degraded.push("MONGODB_URI not set — using MONGODB_URI_DEMO");
  }

  if (mode === "production") {
    for (const key of ["CRON_SECRET", "NEXT_PUBLIC_APP_URL", "ENV_MODE"] as const) {
      const c = checks.find((x) => x.key === key)!;
      if (!c.valid) blocking.push(`${key} (${c.reason})`);
    }
  }

  // Degraded services
  const cron = checks.find((x) => x.key === "CRON_SECRET")!;
  if (!cron.valid && mode !== "production") {
    degraded.push(`CRON_SECRET (${cron.reason})`);
  } else if (!cron.valid && !blocking.some((b) => b.startsWith("CRON_SECRET"))) {
    degraded.push(`CRON_SECRET (${cron.reason})`);
  }

  const stripeOk = PAYMENT_KEYS.every((k) => checks.find((x) => x.key === k)!.valid);
  if (!stripeOk) degraded.push("Stripe payments not fully configured");

  const emailOk =
    checks.find((x) => x.key === "RESEND_API_KEY")!.valid &&
    checks.find((x) => x.key === "ADMIN_EMAIL")!.valid;
  if (!emailOk) degraded.push("Email reports not configured (RESEND_API_KEY + ADMIN_EMAIL)");

  return {
    valid: blocking.length === 0,
    blocking,
    degraded,
    checks,
  };
}

/** Throws in production when critical env is invalid. */
export function assertEnvValid(): void {
  if (process.env.NODE_ENV === "test" || process.env.VITEST === "true") return;
  if (!isProduction()) return;
  const result = validateEnv();
  if (!result.valid) {
    throw new Error(
      `Production env validation failed:\n  - ${result.blocking.join("\n  - ")}\n\nSee docs/VERCEL-SETUP.md`
    );
  }
}

/** Backward-compatible audit for setup/status endpoints. */
export function auditEnv(): { core: EnvCheck[]; payments: EnvCheck[] } {
  const result = validateEnv();
  const core = CORE_KEYS.map((k) => result.checks.find((c) => c.key === k)!);
  const payments = PAYMENT_KEYS.map((k) => result.checks.find((c) => c.key === k)!);
  return { core, payments };
}

export function isProductionReady(): { ready: boolean; missing: string[] } {
  const result = validateEnv();
  if (!isProduction()) return { ready: true, missing: [] };
  return { ready: result.valid, missing: result.blocking };
}

export function arePaymentsReady(): { ready: boolean; missing: string[] } {
  const { payments } = auditEnv();
  const missing = payments.filter((c) => !c.valid).map((c) => `${c.key} (${c.reason})`);
  return { ready: missing.length === 0, missing };
}

/** @deprecated use assertEnvValid */
export function assertProductionEnv(): void {
  assertEnvValid();
}
