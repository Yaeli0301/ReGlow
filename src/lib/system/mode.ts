/**
 * Strict environment mode helpers + demo/production isolation.
 */

import { getDemoMongoEnvStatus, resolveDemoMongoEnv, sanitizeMongoUri } from "@/lib/env";

export type AppMode = "production" | "demo" | "development";

export function getAppMode(): AppMode {
  const raw = process.env.ENV_MODE?.toLowerCase().trim();
  if (raw === "demo") return "demo";
  if (raw === "development" || raw === "dev") return "development";
  return "production";
}

export function isProduction(): boolean {
  return getAppMode() === "production";
}

export function isDemo(): boolean {
  return getAppMode() === "demo";
}

export function isDevelopment(): boolean {
  return getAppMode() === "development";
}

/** @deprecated use isDemo() */
export function isDemoMode(): boolean {
  return isDemo();
}

/**
 * Production must never use in-memory MongoDB.
 */
export function assertProductionNeverUsesInMemory(): void {
  if (!isProduction()) return;
  if (process.env.DEMO_USE_MEMORY === "true") {
    throw new Error("Production cannot use DEMO_USE_MEMORY");
  }
}

/**
 * Demo must not write to the production database URI.
 * Requires MONGODB_URI_DEMO or in-memory when demo runs on Vercel/Render.
 */
export function assertDemoDatabaseIsolation(uri: string): void {
  if (!isDemo()) return;

  const prodUri = sanitizeMongoUri(process.env.MONGODB_URI?.trim() || "");
  const validDemo = resolveDemoMongoEnv();

  // Hosted demo: must use separate demo URI or explicit opt-in
  if ((process.env.VERCEL || process.env.RENDER) && prodUri && uri === prodUri) {
    if (process.env.ALLOW_DEMO_ON_PROD_DB !== "true" && !validDemo) {
      const invalid = getDemoMongoEnvStatus();
      if (invalid.invalidKeys.length > 0 && invalid.hint) {
        throw new Error(invalid.hint);
      }
      throw new Error(
        "Demo mode cannot use production MONGODB_URI on hosted deploy. Set MONGODB_URI_DEMO to a valid mongodb+srv:// URI or ALLOW_DEMO_ON_PROD_DB=true"
      );
    }
  }

  // Local demo with real Atlas URI without _DEMO suffix — warn via strict check
  if (!validDemo && prodUri && uri === prodUri && process.env.ALLOW_DEMO_ON_PROD_DB !== "true") {
    if (process.env.NODE_ENV !== "test") {
      // Allow local dev with same DB only when explicitly flagged
      const isLocal = !process.env.VERCEL && !process.env.RENDER;
      if (!isLocal) {
        throw new Error("Demo mode must use MONGODB_URI_DEMO, not production URI");
      }
    }
  }
}
