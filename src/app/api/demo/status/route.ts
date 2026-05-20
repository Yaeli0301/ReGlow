import { NextResponse } from "next/server";
import { canStartLandingDemo, isDemoMode } from "@/lib/env";
import { DEMO_OWNER_EMAIL } from "@/lib/seed/demo-constants";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    demo: isDemoMode(),
    landingDemo: canStartLandingDemo(),
    label: isDemoMode() ? "Demo Mode" : null,
    demoLogin: isDemoMode()
      ? { email: DEMO_OWNER_EMAIL, hint: "Use seeded demo account" }
      : null,
  });
}
