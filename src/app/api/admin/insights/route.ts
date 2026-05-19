import { NextResponse } from "next/server";
import { requireAuthFromRequest, requireRole } from "@/lib/api-auth";
import { handleApiError } from "@/lib/errors";
import { getActiveInsights } from "@/lib/analytics/insights-engine";
import { Insight } from "@/models/Insight";
import { connectDB } from "@/lib/mongodb";
import type { InsightPeriod, InsightType } from "@/models/Insight";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const auth = await requireAuthFromRequest(request);
    if (auth instanceof NextResponse) return auth;
    const roleErr = requireRole(auth.user, "admin");
    if (roleErr) return roleErr;

    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") as InsightPeriod | null;
    const type = searchParams.get("type") as InsightType | null;
    const includeResolved = searchParams.get("includeResolved") === "true";
    const limit = Math.min(
      Math.max(parseInt(searchParams.get("limit") || "50", 10), 1),
      200
    );

    await connectDB();

    if (includeResolved) {
      const query: Record<string, unknown> = {};
      if (period) query.period = period;
      if (type) query.type = type;
      const items = await Insight.find(query)
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();
      const total = await Insight.countDocuments(query);
      return NextResponse.json({ success: true, items, total });
    }

    const items = await getActiveInsights({
      period: period ?? undefined,
      type: type ?? undefined,
      limit,
    });

    return NextResponse.json({
      success: true,
      items,
      total: items.length,
    });
  } catch (error) {
    return handleApiError(error, "admin/insights");
  }
}
