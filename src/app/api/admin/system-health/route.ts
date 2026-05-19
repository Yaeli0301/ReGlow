import { NextResponse } from "next/server";
import { requireAuthFromRequest, requireRole } from "@/lib/api-auth";
import { handleApiError } from "@/lib/errors";
import { getSystemState } from "@/lib/system/system-state";
import { getKillSwitchState } from "@/lib/system/kill-switch";
import { validateEnv } from "@/lib/system/env-validator";
import { getRecentSystemLogs, getErrorRateLastHour } from "@/lib/monitoring/telemetry";
import { evaluateOperationalAlerts } from "@/lib/monitoring/alerts";
import { getAppMode } from "@/lib/system/mode";
import { getOrCompute } from "@/lib/analytics/cache";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const auth = await requireAuthFromRequest(request);
    if (auth instanceof NextResponse) return auth;
    const roleErr = requireRole(auth.user, "admin");
    if (roleErr) return roleErr;

    const payload = await getOrCompute("admin:system-health", async () => {
      const [state, killSwitch, env, logs, errorRate, alerts] = await Promise.all([
        getSystemState(),
        getKillSwitchState(),
        Promise.resolve(validateEnv()),
        getRecentSystemLogs(20),
        getErrorRateLastHour(),
        evaluateOperationalAlerts(),
      ]);

      return {
        mode: getAppMode(),
        state: state.state,
        reason: state.reason,
        reasons: state.reasons,
        degraded: state.degraded,
        checks: state.checks,
        killSwitch,
        env: {
          blocking: env.blocking,
          degraded: env.degraded,
        },
        errorRateLastHour: errorRate,
        operationalAlerts: alerts,
        recentLogs: logs.map((l) => ({
          _id: l._id.toString(),
          level: l.level,
          category: l.category,
          message: l.message,
          source: l.source,
          durationMs: l.durationMs,
          statusCode: l.statusCode,
          createdAt: l.createdAt,
        })),
        timestamp: new Date().toISOString(),
      };
    }, 60_000);

    return NextResponse.json({ success: true, ...payload });
  } catch (error) {
    return handleApiError(error, "admin/system-health");
  }
}
