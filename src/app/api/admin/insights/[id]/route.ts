import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthFromRequest, requireRole } from "@/lib/api-auth";
import { handleApiError } from "@/lib/errors";
import { resolveInsight } from "@/lib/analytics/insights-engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const patchSchema = z.object({
  resolved: z.boolean(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuthFromRequest(request);
    if (auth instanceof NextResponse) return auth;
    const roleErr = requireRole(auth.user, "admin");
    if (roleErr) return roleErr;

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Invalid input", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    if (!parsed.data.resolved) {
      return NextResponse.json(
        { success: false, error: "Only resolve=true is supported", code: "INVALID_OPERATION" },
        { status: 400 }
      );
    }

    const updated = await resolveInsight(id, auth.user.id);
    if (!updated) {
      return NextResponse.json(
        { success: false, error: "Insight not found", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, insight: updated });
  } catch (error) {
    return handleApiError(error, "admin/insights/[id]");
  }
}
