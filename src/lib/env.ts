import { DEMO_OWNER_EMAIL } from "@/lib/seed/demo-constants";

export type EnvMode = "demo" | "production";

export function getEnvMode(): EnvMode {
  const raw = process.env.ENV_MODE?.toLowerCase().trim();
  return raw === "demo" ? "demo" : "production";
}

export function isDemoMode(): boolean {
  return getEnvMode() === "demo";
}

/** Allows /api/demo/start (production landing demo DB or full demo deployment). */
export function canStartLandingDemo(): boolean {
  return isDemoMode() || process.env.ENABLE_LANDING_DEMO === "true";
}

/** "Try demo" button — public landing page only, not inside the logged-in app. */
export function shouldShowLandingDemoCta(): boolean {
  return !isDemoMode() && process.env.ENABLE_LANDING_DEMO === "true";
}

/** Vercel Atlas integration — prefer auto-injected URI over manual MONGODB_URI_DEMO. */
const DEMO_MONGO_ENV_KEYS = [
  "MONGODB_URI_DEMO_MONGODB_URI",
  "MONGODB_URI_DEMO_URI",
  "MONGODB_URI_DEMO",
] as const;

/** Strip quotes, env prefixes, and extract URI from common Vercel paste mistakes. */
export function sanitizeMongoUri(raw: string): string {
  let uri = raw.trim();

  // Pasted env line: MONGODB_URI="mongodb+srv://..." or MONGODB_URI_DEMO=mongodb+srv://...
  const assignMatch = uri.match(
    /MONGODB_URI(?:_DEMO(?:_MONGODB_URI)?)?\s*=\s*["']?(mongodb(?:\+srv)?:\/\/[^"'\s]+)["']?/i
  );
  if (assignMatch?.[1]) return assignMatch[1].trim();

  // URI embedded in JSON, .env file, or surrounding text
  const embedded = uri.match(/(mongodb(?:\+srv)?:\/\/[^\s"'`\\]+)/);
  if (embedded?.[1]) uri = embedded[1];

  if (
    (uri.startsWith('"') && uri.endsWith('"')) ||
    (uri.startsWith("'") && uri.endsWith("'"))
  ) {
    uri = uri.slice(1, -1).trim();
    const inner = uri.match(/(mongodb(?:\+srv)?:\/\/[^\s"'`\\]+)/);
    if (inner?.[1]) uri = inner[1];
  }

  return uri.trim();
}

/** Atlas DB users authenticate via admin — missing authSource causes bad auth. */
export function ensureAtlasConnectionUri(uri: string): string {
  const clean = sanitizeMongoUri(uri);
  if (!/^mongodb\+srv:\/\//i.test(clean)) return clean;

  let out = clean;
  if (!/authSource=/i.test(out)) {
    out += `${out.includes("?") ? "&" : "?"}authSource=admin`;
  }
  if (!/retryWrites=/i.test(out)) {
    out += "&retryWrites=true";
  }
  return out;
}

export function isValidMongoUri(uri: string): boolean {
  return /^mongodb(\+srv)?:\/\//.test(sanitizeMongoUri(uri));
}

/** Safe URI metadata for setup/status (no password). */
export function parseMongoUriPublic(uri: string): {
  user: string | null;
  host: string | null;
} {
  const clean = sanitizeMongoUri(uri);
  const withAuth = clean.match(/^mongodb(?:\+srv)?:\/\/([^:]+):[^@]+@([^/?]+)/);
  if (withAuth) return { user: withAuth[1], host: withAuth[2] };
  const hostOnly = clean.match(/^mongodb(?:\+srv)?:\/\/([^/?]+)/);
  if (hostOnly) return { user: null, host: hostOnly[1] };
  return { user: null, host: null };
}

function listDemoMongoEnvEntries(): { key: string; uri: string }[] {
  const seen = new Set<string>();
  const entries: { key: string; uri: string }[] = [];

  const add = (key: string) => {
    if (seen.has(key)) return;
    const raw = process.env[key]?.trim();
    if (!raw) return;
    seen.add(key);
    entries.push({ key, uri: sanitizeMongoUri(raw) });
  };

  for (const key of DEMO_MONGO_ENV_KEYS) add(key);

  for (const key of Object.keys(process.env)) {
    if (seen.has(key)) continue;
    if (!/MONGODB.*DEMO/i.test(key)) continue;
    add(key);
  }

  return entries;
}

export function getDemoMongoEnvKeysPresent(): string[] {
  return listDemoMongoEnvEntries().map((e) => e.key);
}

export function resolveDemoMongoEnv(): { uri: string; key: string } | null {
  for (const entry of listDemoMongoEnvEntries()) {
    if (isValidMongoUri(entry.uri)) {
      return { uri: ensureAtlasConnectionUri(entry.uri), key: entry.key };
    }
  }
  return null;
}

export function getDemoMongoEnvStatus(): {
  key: string | null;
  uriValid: boolean;
  hint: string | null;
  invalidKeys: string[];
} {
  const entries = listDemoMongoEnvEntries();
  const invalidKeys: string[] = [];

  for (const entry of entries) {
    if (isValidMongoUri(entry.uri)) {
      return { key: entry.key, uriValid: true, hint: null, invalidKeys };
    }
    invalidKeys.push(entry.key);
  }

  const first = entries[0];
  if (first) {
    const preview = first.uri.slice(0, 28).replace(/\/\/([^:]+):([^@]+)@/, "//***:***@");
    return {
      key: first.key,
      uriValid: false,
      invalidKeys,
      hint: `${first.key} is set but not a valid MongoDB URI — must start with mongodb+srv:// (current value starts with "${preview}")`,
    };
  }

  return {
    key: null,
    uriValid: false,
    invalidKeys: [],
    hint: "Set MONGODB_URI_DEMO to a full Atlas connection string (mongodb+srv://...)",
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
    if (demo) return demo.uri;

    const status = getDemoMongoEnvStatus();
    const hosted = Boolean(process.env.VERCEL || process.env.RENDER);

    // MONGODB_URI_DEMO exists but is not a real URI — do not fall back to production DB.
    if (status.invalidKeys.length > 0) {
      throw new Error(
        `${status.hint} — ב-Vercel: מחקי את הערך הישן והדביקי URI מלא מ-Atlas (Connect → Drivers).`
      );
    }

    const fallback = sanitizeMongoUri(
      process.env.MONGODB_URI_STANDARD?.trim() ||
        process.env.MONGODB_URI?.trim() ||
        ""
    );
    if (isValidMongoUri(fallback)) {
      if (hosted && process.env.ALLOW_DEMO_ON_PROD_DB !== "true") {
        throw new Error(
          "Demo on Vercel needs MONGODB_URI_DEMO — set a valid mongodb+srv:// URI (separate demo database)."
        );
      }
      return ensureAtlasConnectionUri(fallback);
    }

    throw new Error(
      status.hint ??
        "Demo mode: set MONGODB_URI_DEMO to mongodb+srv://USER:PASS@CLUSTER.mongodb.net/reglow"
    );
  }
  // Vercel + Atlas integration: use SRV URI from the platform (not Windows standard string).
  if (process.env.VERCEL) {
    const vercelUri = process.env.MONGODB_URI?.trim();
    if (vercelUri) return ensureAtlasConnectionUri(vercelUri);
  }
  const standard = process.env.MONGODB_URI_STANDARD?.trim();
  if (standard && !process.env.VERCEL) return ensureAtlasConnectionUri(standard);

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("Production mode: MONGODB_URI is required");
  }
  return ensureAtlasConnectionUri(uri);
}

/** Block Stripe checkout on demo deploy or landing-demo visitor. */
export function shouldBlockPaidCheckout(userEmail?: string | null): boolean {
  if (isDemoMode()) return true;
  if (shouldUseLandingDemoDatabase() && userEmail === DEMO_OWNER_EMAIL) return true;
  return false;
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
