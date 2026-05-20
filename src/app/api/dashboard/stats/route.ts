import { NextResponse } from "next/server";
import { requireAuthFromRequest, requireSubscription } from "@/lib/api-auth";
import { getDashboardStats } from "@/lib/dashboard-stats";

export async function GET(request: Request) {
  try {
    const auth = await requireAuthFromRequest(request);
    if (auth instanceof NextResponse) return auth;

    const subError = requireSubscription(auth.user);
    if (subError) return subError;

    const data = await getDashboardStats(auth.user.id);

    const response = NextResponse.json(data);
    response.headers.set("Cache-Control", "private, max-age=15, stale-while-revalidate=30");
    return response;
  } catch (error) {
    console.error("[dashboard/stats]", error);
    return NextResponse.json(
      { error: "שגיאת שרת בטעינת הדאשבורד", code: "DASHBOARD_STATS_ERROR" },
      { status: 500 }
    );
  }
}
