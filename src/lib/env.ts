export type EnvMode = "demo" | "production";

export function getEnvMode(): EnvMode {
  const raw = process.env.ENV_MODE?.toLowerCase().trim();
  return raw === "demo" ? "demo" : "production";
}

export function isDemoMode(): boolean {
  return getEnvMode() === "demo";
}

/** In-memory Mongo only for local demo when no URI is configured (not used on Render/production). */
export function shouldUseInMemoryMongo(): boolean {
  if (process.env.RENDER || process.env.NODE_ENV === "production") return false;
  return isDemoMode() && !process.env.MONGODB_URI_DEMO && !process.env.MONGODB_URI;
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
    const uri =
      process.env.MONGODB_URI_DEMO ||
      process.env.MONGODB_URI_STANDARD ||
      process.env.MONGODB_URI;
    if (!uri) {
      throw new Error("Demo mode: set MONGODB_URI_DEMO or MONGODB_URI");
    }
    return uri;
  }
  const standard = process.env.MONGODB_URI_STANDARD?.trim();
  if (standard) return standard;

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
