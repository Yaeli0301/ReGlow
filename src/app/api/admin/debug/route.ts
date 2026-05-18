import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import { requireAuthFromRequest, requireRole } from "@/lib/api-auth";
import { handleApiError } from "@/lib/errors";
import { isDemoMode } from "@/lib/env";
import { logger } from "@/lib/logger";
import { resetDemoDatabase } from "@/lib/mongodb";
import { runRetentionEngine } from "@/lib/retention-engine";
import { Appointment } from "@/models/Appointment";
import { Client } from "@/models/Client";
import { subDays } from "date-fns";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const auth = await requireAuthFromRequest(request);
    if (auth instanceof NextResponse) return auth;
    const roleErr = requireRole(auth.user, "admin");
    if (roleErr) return roleErr;

    return NextResponse.json({
      envMode: isDemoMode() ? "demo" : "production",
      logs: logger.getRecent(80),
    });
  } catch (error) {
    return handleApiError(error, "admin/debug GET");
  }
}

const postSchema = z.object({
  action: z.enum([
    "reset_demo",
    "simulate_cancellation",
    "simulate_no_show",
    "simulate_retention",
  ]),
  appointmentId: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const auth = await requireAuthFromRequest(request);
    if (auth instanceof NextResponse) return auth;
    const roleErr = requireRole(auth.user, "admin");
    if (roleErr) return roleErr;

    await connectDB();
    const parsed = postSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const { action, appointmentId } = parsed.data;

    if (action === "reset_demo") {
      if (!isDemoMode()) {
        return NextResponse.json({ error: "Demo mode only" }, { status: 403 });
      }
      await resetDemoDatabase();
      logger.info("Admin reset demo data", { by: auth.user.id });
      return NextResponse.json({ success: true, action });
    }

    if (action === "simulate_cancellation" && appointmentId) {
      const appt = await Appointment.findOne({ _id: appointmentId, userId: auth.user.id });
      if (!appt) return NextResponse.json({ error: "Not found" }, { status: 404 });
      appt.status = "canceled";
      appt.canceledAt = new Date();
      appt.cancelReason = "[debug] simulated cancellation";
      await appt.save();
      logger.info("Simulated cancellation", { appointmentId });
      return NextResponse.json({ success: true, appointment: appt._id });
    }

    if (action === "simulate_no_show" && appointmentId) {
      const appt = await Appointment.findOne({ _id: appointmentId, userId: auth.user.id });
      if (!appt) return NextResponse.json({ error: "Not found" }, { status: 404 });
      appt.status = "canceled";
      appt.cancelReason = "[debug] no-show";
      appt.canceledAt = new Date();
      await appt.save();
      logger.info("Simulated no-show", { appointmentId });
      return NextResponse.json({ success: true });
    }

    if (action === "simulate_retention") {
      const client = await Client.findOne({ userId: auth.user.id }).sort({ createdAt: 1 });
      if (client) {
        client.lastVisitDate = subDays(new Date(), 35);
        client.retentionStep = 0;
        client.optIn = true;
        await client.save();
      }
      const result = await runRetentionEngine();
      logger.info("Simulated retention run", result);
      return NextResponse.json({ success: true, result });
    }

    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  } catch (error) {
    return handleApiError(error, "admin/debug POST");
  }
}
