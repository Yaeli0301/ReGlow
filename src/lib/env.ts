export type EnvMode = "demo" | "production";

export function getEnvMode(): EnvMode {
  const raw = process.env.ENV_MODE?.toLowerCase().trim();
  return raw === "demo" ? "demo" : "production";
}

export function isDemoMode(): boolean {
  return getEnvMode() === "demo";
}

/** In-memory Mongo only when demo + no URI (local dev). */
export function shouldUseInMemoryMongo(): boolean {
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
    const uri = process.env.MONGODB_URI_DEMO || process.env.MONGODB_URI;
    if (!uri) {
      throw new Error("Demo mode: set MONGODB_URI_DEMO or MONGODB_URI");
    }
    return uri;
  }
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
