import { NextResponse } from "next/server";
import { isDemoMode } from "@/lib/env";
import { DEMO_OWNER_EMAIL } from "@/lib/seed/demo-seed";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    demo: isDemoMode(),
    label: isDemoMode() ? "Demo Mode" : null,
    demoLogin: isDemoMode()
      ? { email: DEMO_OWNER_EMAIL, hint: "Use seeded demo account" }
      : null,
  });
}
