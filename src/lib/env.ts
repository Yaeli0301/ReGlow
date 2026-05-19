export type EnvMode = "demo" | "production";

export function getEnvMode(): EnvMode {
  const raw = process.env.ENV_MODE?.toLowerCase().trim();
  return raw === "demo" ? "demo" : "production";
}

export function isDemoMode(): boolean {
  return getEnvMode() === "demo";
}

/** Allows /demo/start from landing page (local or demo deployment) */
export function canStartLandingDemo(): boolean {
  return isDemoMode() || process.env.ENABLE_LANDING_DEMO === "true";
}

/** Vercel Atlas integration may expose MONGODB_URI_DEMO_MONGODB_URI when the storage prefix is MONGODB_URI_DEMO. */
const DEMO_MONGO_ENV_KEYS = [
  "MONGODB_URI_DEMO",
  "MONGODB_URI_DEMO_MONGODB_URI",
] as const;

export function getDemoMongoEnvKeysPresent(): string[] {
  return DEMO_MONGO_ENV_KEYS.filter((key) => Boolean(process.env[key]?.trim()));
}

export function resolveDemoMongoEnv(): { uri: string; key: string } | null {
  for (const key of DEMO_MONGO_ENV_KEYS) {
    const uri = process.env[key]?.trim();
    if (uri) return { uri, key };
  }
  return null;
}

/** Separate demo DB for landing demos in production (Vercel). */
export function getLandingDemoMongoUri(): string | null {
  return resolveDemoMongoEnv()?.uri ?? null;
}

export function shouldUseLandingDemoDatabase(): boolean {
  return canStartLandingDemo() && Boolean(getLandingDemoMongoUri());
}

/** In-memory Mongo for local demo (set DEMO_USE_MEMORY=true when Atlas is unreachable). */
export function shouldUseInMemoryMongo(): boolean {
  // Production guard: never use in-memory DB in production, regardless of other flags.
  if (!isDemoMode()) return false;
  if (process.env.VERCEL || process.env.RENDER) return false;
  if (process.env.DEMO_USE_MEMORY === "true") return true;
  return (
    !resolveDemoMongoEnv() &&
    !process.env.MONGODB_URI &&
    !process.env.MONGODB_URI_STANDARD
  );
}

export function getMongoUriOrThrow(): string {
  if (shouldUseInMemoryMongo()) {
    const uri = global.demoMemoryUri;
    if (!uri) {
      throw new Error("Demo memory database not initialized yet");
    }
    return uri;
  }
  if (isDemoMode()) {
    const demo = resolveDemoMongoEnv();
    const uri =
      demo?.uri ||
      process.env.MONGODB_URI_STANDARD ||
      process.env.MONGODB_URI;
    if (!uri) {
      throw new Error("Demo mode: set MONGODB_URI_DEMO or MONGODB_URI");
    }
    return uri;
  }
  // Vercel + Atlas integration: use SRV URI from the platform (not Windows standard string).
  if (process.env.VERCEL) {
    const vercelUri = process.env.MONGODB_URI?.trim();
    if (vercelUri) return vercelUri;
  }
  const standard = process.env.MONGODB_URI_STANDARD?.trim();
  if (standard && !process.env.VERCEL) return standard;

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("Production mode: MONGODB_URI is required");
  }
  return uri;
}

export function isRealPaymentsEnabled(): boolean {
  return !isDemoMode() && Boolean(process.env.STRIPE_SECRET_KEY?.startsWith("sk_"));
}

export function isExternalMessagingEnabled(): boolean {
  return !isDemoMode();
}

declare global {
  // eslint-disable-next-line no-var
  var demoMemoryUri: string | undefined;
  // eslint-disable-next-line no-var
  var demoSeeded: boolean | undefined;
}
