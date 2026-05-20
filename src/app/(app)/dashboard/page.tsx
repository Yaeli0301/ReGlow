import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { getDashboardStats } from "@/lib/dashboard-stats";
import { hasActiveSubscription } from "@/lib/subscription";
import { DashboardView } from "@/components/dashboard/DashboardView";
import { logger } from "@/lib/logger";

export default async function DashboardPage() {
  const session = await getSession();
  let initialStats = null;
  let serverLoadFailed = false;

  if (session && hasActiveSubscription(session.subscriptionTier)) {
    try {
      await connectDB();
      initialStats = await getDashboardStats(session.id);
    } catch (error) {
      serverLoadFailed = true;
      logger.error("Dashboard server load failed", {
        err: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return <DashboardView initialStats={initialStats} serverLoadFailed={serverLoadFailed} />;
}
