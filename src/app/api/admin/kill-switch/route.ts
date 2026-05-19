import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthFromRequest, requireRole } from "@/lib/api-auth";
import { handleApiError } from "@/lib/errors";
import { getKillSwitchState, setKillSwitch } from "@/lib/system/kill-switch";
import { getSystemState } from "@/lib/system/system-state";
import { logTelemetry } from "@/lib/monitoring/telemetry";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const patchSchema = z.object({
  active: z.boolean(),
  reason: z.string().optional(),
});

export async function GET(request: Request) {
  try {
    const auth = await requireAuthFromRequest(request);
    if (auth instanceof NextResponse) return auth;
    const roleErr = requireRole(auth.user, "admin");
    if (roleErr) return roleErr;

    const ks = await getKillSwitchState();
    const state = await getSystemState();

    return NextResponse.json({
      success: true,
      killSwitch: {
        active: ks.active,
        reason: ks.reason,
      },
      systemState: state.state,
    });
  } catch (error) {
    return handleApiError(error, "admin/kill-switch GET");
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await requireAuthFromRequest(request);
    if (auth instanceof NextResponse) return auth;
    const roleErr = requireRole(auth.user, "admin");
    if (roleErr) return roleErr;

    const body = await request.json().catch(() => ({}));
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Invalid input", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    await setKillSwitch(parsed.data.active, {
      reason: parsed.data.reason,
      updatedBy: auth.user.id,
    });

    logTelemetry({
      level: "warn",
      category: "system",
      message: parsed.data.active ? "Kill switch activated" : "Kill switch deactivated",
      source: "admin/kill-switch",
      meta: { adminId: auth.user.id, reason: parsed.data.reason },
    });

    const state = await getSystemState();

    return NextResponse.json({
      success: true,
      killSwitch: {
        active: parsed.data.active,
        reason: parsed.data.reason,
      },
      systemState: state.state,
    });
  } catch (error) {
    return handleApiError(error, "admin/kill-switch PATCH");
  }
}
