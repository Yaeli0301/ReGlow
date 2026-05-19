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

/** Strip quotes / whitespace — common when pasting into Vercel env UI. */
export function sanitizeMongoUri(raw: string): string {
  let uri = raw.trim();
  if (
    (uri.startsWith('"') && uri.endsWith('"')) ||
    (uri.startsWith("'") && uri.endsWith("'"))
  ) {
    uri = uri.slice(1, -1).trim();
  }
  return uri;
}

export function isValidMongoUri(uri: string): boolean {
  return /^mongodb(\+srv)?:\/\//.test(sanitizeMongoUri(uri));
}

export function getDemoMongoEnvKeysPresent(): string[] {
  return DEMO_MONGO_ENV_KEYS.filter((key) => Boolean(process.env[key]?.trim()));
}

export function resolveDemoMongoEnv(): { uri: string; key: string } | null {
  for (const key of DEMO_MONGO_ENV_KEYS) {
    const raw = process.env[key]?.trim();
    if (!raw) continue;
    const uri = sanitizeMongoUri(raw);
    if (uri) return { uri, key };
  }
  return null;
}

export function getDemoMongoEnvStatus(): {
  key: string | null;
  uriValid: boolean;
  hint: string | null;
} {
  for (const key of DEMO_MONGO_ENV_KEYS) {
    const raw = process.env[key]?.trim();
    if (!raw) continue;
    const uri = sanitizeMongoUri(raw);
    if (isValidMongoUri(uri)) {
      return { key, uriValid: true, hint: null };
    }
    return {
      key,
      uriValid: false,
      hint: `${key} must start with mongodb:// or mongodb+srv:// (got "${uri.slice(0, 24)}...")`,
    };
  }
  return {
    key: null,
    uriValid: false,
    hint: "Set MONGODB_URI_DEMO to a full Atlas connection string",
  };
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
    const fallback = sanitizeMongoUri(
      process.env.MONGODB_URI_STANDARD?.trim() ||
        process.env.MONGODB_URI?.trim() ||
        ""
    );
    const uri = demo?.uri || fallback;
    if (!uri) {
      throw new Error("Demo mode: set MONGODB_URI_DEMO or MONGODB_URI");
    }
    if (!isValidMongoUri(uri)) {
      const key = demo?.key ?? "MONGODB_URI";
      throw new Error(
        `${key} is not a valid MongoDB URI — must start with mongodb:// or mongodb+srv://`
      );
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
