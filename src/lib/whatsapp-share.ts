/** Unicode bidi isolates — keep URLs clickable next to Hebrew (RTL) text */
const LRI = "\u2066";
const PDI = "\u2069";

export function normalizeShareUrl(url: string): string {
  const trimmed = url.trim();
  if (!/^https?:\/\//i.test(trimmed)) {
    return `https://${trimmed}`;
  }
  return trimmed;
}

export function isPublicShareUrl(url: string): boolean {
  try {
    const { hostname } = new URL(normalizeShareUrl(url));
    return (
      hostname !== "localhost" &&
      hostname !== "127.0.0.1" &&
      !hostname.endsWith(".local")
    );
  } catch {
    return false;
  }
}

/** Wrap URL so WhatsApp / RTL clients treat it as LTR clickable link */
export function isolateUrlForShare(url: string): string {
  const clean = normalizeShareUrl(url);
  return `${LRI}${clean}${PDI}`;
}

/**
 * WhatsApp link share — URL only (most reliable for tap-to-open).
 */
export function buildWhatsAppLinkOnlyUrl(link: string): string {
  return `https://wa.me/?text=${encodeURIComponent(isolateUrlForShare(link))}`;
}

/**
 * WhatsApp share with intro text. URL is isolated and placed on its own line first.
 */
export function buildWhatsAppShareUrl(intro: string, link: string): string {
  const isolated = isolateUrlForShare(link);
  const message = `${isolated}\n\n${intro.trim()}`;
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}
