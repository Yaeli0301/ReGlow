import { NextResponse } from "next/server";
import { isDemoMode } from "@/lib/env";
import { resetDemoDatabase } from "@/lib/mongodb";
import { AppError } from "@/lib/errors";
import { handleApiError } from "@/lib/errors";
import { DEMO_OWNER_EMAIL, DEMO_OWNER_PASSWORD } from "@/lib/seed/demo-seed";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    if (!isDemoMode()) {
      throw new AppError({
        code: "DEMO_ONLY",
        message: "Reset only in demo mode",
        userMessage: "איפוס זמין רק במצב דמו",
      });
    }

    await resetDemoDatabase();

    return NextResponse.json({
      success: true,
      message: "Demo data reset",
      login: { email: DEMO_OWNER_EMAIL, password: DEMO_OWNER_PASSWORD },
    });
  } catch (error) {
    return handleApiError(error, "demo/reset");
  }
}
