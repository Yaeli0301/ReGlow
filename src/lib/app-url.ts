/**
 * Resolves the public app origin for redirects (Stripe, emails, share links).
 * Prefers the incoming request host so demo/production deploys never send users to a stale env URL.
 */
export function resolveAppOrigin(request?: Request): string {
  if (request) {
    const forwardedHost = request.headers.get("x-forwarded-host");
    const host = forwardedHost || request.headers.get("host");
    if (host) {
      const proto =
        request.headers.get("x-forwarded-proto") ||
        (host.includes("localhost") ? "http" : "https");
      return `${proto}://${host.split(",")[0].trim()}`.replace(/\/$/, "");
    }
  }

  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "");
  if (configured && /^https?:\/\//i.test(configured)) {
    return configured;
  }

  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    return `https://${vercel.replace(/\/$/, "")}`;
  }

  return "http://localhost:3000";
}

/** Optional: URL of the separate demo Vercel project (for messages on production). */
export function getDemoSiteUrl(): string | null {
  const base = process.env.NEXT_PUBLIC_DEMO_SITE_URL?.trim().replace(/\/$/, "");
  if (base && /^https?:\/\//i.test(base)) return base;
  return null;
}

/** Real production signup (demo deploy should set NEXT_PUBLIC_PRODUCTION_URL). */
export function getProductionSignupUrl(): string {
  const base = process.env.NEXT_PUBLIC_PRODUCTION_URL?.trim().replace(/\/$/, "");
  if (base && /^https?:\/\//i.test(base)) {
    return `${base}/register`;
  }
  return "/register";
}
