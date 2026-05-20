import { DEMO_OWNER_EMAIL } from "@/lib/seed/demo-constants";
import { isDemoMode, shouldUseLandingDemoDatabase } from "@/lib/env";
import type { SessionUser } from "@/types";

/** True when visitor entered via external landing → /demo/start (production only). */
export function isLandingDemoVisitor(session: SessionUser | null | undefined): boolean {
  if (!session) return false;
  if (isDemoMode()) return false;
  if (!shouldUseLandingDemoDatabase()) return false;
  return session.email === DEMO_OWNER_EMAIL;
}
