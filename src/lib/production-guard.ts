/**
 * Production startup guard: validates required env vars.
 * In production: throws if any required var is missing.
 * In demo/dev: returns warnings but allows startup with fallbacks.
 */

export interface EnvCheck {
  key: string;
  present: boolean;
  valid: boolean;
  reason?: string;
}

const REQUIRED_PROD_KEYS = [
  "JWT_SECRET",
  "CRON_SECRET",
  "MONGODB_URI",
  "NEXT_PUBLIC_APP_URL",
  "ENV_MODE",
] as const;

const REQUIRED_FOR_PAYMENTS = [
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "STRIPE_PRICE_BASIC",
  "STRIPE_PRICE_PRO",
  "STRIPE_PRICE_PREMIUM",
] as const;

function check(key: string, minLen = 1): EnvCheck {
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
  } else if (key === "STRIPE_SECRET_KEY" && !raw.startsWith("sk_")) {
    valid = false;
    reason = "not a Stripe secret key (must start with sk_)";
  } else if (key === "STRIPE_WEBHOOK_SECRET" && !raw.startsWith("whsec_")) {
    valid = false;
    reason = "not a Stripe webhook secret";
  } else if (key.startsWith("STRIPE_PRICE_") && (!raw.startsWith("price_") || raw === "price_basic" || raw === "price_pro" || raw === "price_premium")) {
    valid = false;
    reason = "placeholder or invalid price ID";
  } else if (key === "MONGODB_URI" && !/^mongodb(\+srv)?:\/\//.test(raw)) {
    valid = false;
    reason = "not a valid MongoDB URI";
  } else if (key === "NEXT_PUBLIC_APP_URL" && !/^https?:\/\//.test(raw)) {
    valid = false;
    reason = "must start with http(s)://";
  } else if (key === "ENV_MODE" && !["production", "demo"].includes(raw.toLowerCase())) {
    valid = false;
    reason = "must be 'production' or 'demo'";
  }

  return { key, present, valid, reason };
}

export function auditEnv(): { core: EnvCheck[]; payments: EnvCheck[] } {
  return {
    core: REQUIRED_PROD_KEYS.map((k) => check(k)),
    payments: REQUIRED_FOR_PAYMENTS.map((k) => check(k)),
  };
}

export function isProductionReady(): { ready: boolean; missing: string[] } {
  const mode = process.env.ENV_MODE?.toLowerCase().trim();
  if (mode !== "production") return { ready: true, missing: [] };

  const { core } = auditEnv();
  const missing = core.filter((c) => !c.valid).map((c) => `${c.key} (${c.reason})`);
  return { ready: missing.length === 0, missing };
}

export function arePaymentsReady(): { ready: boolean; missing: string[] } {
  const { payments } = auditEnv();
  const missing = payments.filter((c) => !c.valid).map((c) => `${c.key} (${c.reason})`);
  return { ready: missing.length === 0, missing };
}

/**
 * Throws if production env is incomplete. Call this from server bootstrap
 * (e.g. before connectDB in production). NO-OP in demo mode.
 */
export function assertProductionEnv(): void {
  const mode = process.env.ENV_MODE?.toLowerCase().trim();
  if (mode !== "production") return;

  const { ready, missing } = isProductionReady();
  if (!ready) {
    const message = `Production startup blocked — missing/invalid env vars:\n  - ${missing.join("\n  - ")}\n\nSee docs/VERCEL-SETUP.md`;
    throw new Error(message);
  }
}
