import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import { requireAuthFromRequest, requireRole } from "@/lib/api-auth";
import { handleApiError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { User } from "@/models/User";
import { AdminAction } from "@/models/AdminAction";
import { isOverrideActive } from "@/lib/subscription";
import type { SubscriptionTier } from "@/types";

const TIERS = ["none", "basic", "pro", "premium"] as const;

const updateSchema = z
  .object({
    subscriptionTier: z.enum(TIERS).optional(),
    override: z
      .object({
        tier: z.enum(TIERS).optional(),
        // accept "YYYY-MM-DD" or ISO, or null to clear
        until: z.union([z.string(), z.null()]).optional(),
        // accept "P30D" via daysFromNow shortcut
        daysFromNow: z.number().int().min(0).max(365).optional(),
        discountPercent: z.number().min(0).max(100).nullable().optional(),
        notes: z.string().max(500).optional(),
      })
      .optional(),
    clearOverride: z.boolean().optional(),
    reason: z.string().max(200).optional(),
  })
  .refine((v) => v.subscriptionTier || v.override || v.clearOverride, {
    message: "Nothing to update",
  });

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuthFromRequest(request);
    if (auth instanceof NextResponse) return auth;
    const roleErr = requireRole(auth.user, "admin");
    if (roleErr) return roleErr;

    await connectDB();
    const { id } = await params;

    const user = await User.findById(id)
      .select(
        "email businessName role subscriptionTier stripeCustomerId stripeSubscriptionId referralCode referralRewardMonths adminOverride createdAt updatedAt"
      )
      .lean();

    if (!user) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    const recentActions = await AdminAction.find({ targetUserId: id })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    return NextResponse.json({
      success: true,
      user: {
        id: user._id.toString(),
        email: user.email,
        businessName: user.businessName,
        role: user.role || "business",
        subscriptionTier: user.subscriptionTier,
        stripeCustomerId: user.stripeCustomerId || null,
        stripeSubscriptionId: user.stripeSubscriptionId || null,
        referralCode: user.referralCode || null,
        referralRewardMonths: user.referralRewardMonths || 0,
        adminOverride: user.adminOverride || null,
        overrideActive: isOverrideActive(user.adminOverride),
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      auditLog: recentActions.map((a) => ({
        id: a._id.toString(),
        adminEmail: a.adminEmail,
        action: a.action,
        before: a.before,
        after: a.after,
        reason: a.reason,
        createdAt: a.createdAt,
      })),
    });
  } catch (error) {
    return handleApiError(error, "admin/users/get");
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuthFromRequest(request);
    if (auth instanceof NextResponse) return auth;
    const roleErr = requireRole(auth.user, "admin");
    if (roleErr) return roleErr;

    await connectDB();
    const { id } = await params;

    const body = await request.json().catch(() => ({}));
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message || "Invalid input", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const user = await User.findById(id);
    if (!user) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    // Block admins from editing themselves (footgun: removing own admin or breaking own access)
    if (id === auth.user.id) {
      return NextResponse.json(
        { success: false, error: "Cannot edit your own admin account", code: "SELF_EDIT_BLOCKED" },
        { status: 400 }
      );
    }

    const before = {
      subscriptionTier: user.subscriptionTier,
      adminOverride: user.adminOverride
        ? JSON.parse(JSON.stringify(user.adminOverride))
        : null,
    };

    const data = parsed.data;
    const changes: Array<{ action: "set_tier" | "grant_override" | "clear_override" | "set_discount" | "set_notes"; after: Record<string, unknown> }> = [];

    if (data.subscriptionTier && data.subscriptionTier !== user.subscriptionTier) {
      user.subscriptionTier = data.subscriptionTier as SubscriptionTier;
      changes.push({ action: "set_tier", after: { subscriptionTier: data.subscriptionTier } });
    }

    if (data.clearOverride) {
      user.adminOverride = undefined;
      changes.push({ action: "clear_override", after: { adminOverride: null } });
    } else if (data.override) {
      const o = data.override;
      const current = user.adminOverride || ({} as NonNullable<typeof user.adminOverride>);
      const next = { ...current } as NonNullable<typeof user.adminOverride>;

      if (o.tier) next.tier = o.tier as SubscriptionTier;

      if (typeof o.daysFromNow === "number") {
        const until = new Date();
        until.setDate(until.getDate() + o.daysFromNow);
        next.until = until;
      } else if (o.until === null) {
        next.until = undefined;
      } else if (typeof o.until === "string" && o.until.trim()) {
        const parsedDate = new Date(o.until);
        if (Number.isFinite(parsedDate.getTime())) next.until = parsedDate;
      }

      if (o.discountPercent === null) {
        next.discountPercent = undefined;
      } else if (typeof o.discountPercent === "number") {
        next.discountPercent = o.discountPercent;
      }

      if (typeof o.notes === "string") next.notes = o.notes;

      next.grantedBy = auth.user.id;
      next.grantedAt = new Date();
      user.adminOverride = next;

      changes.push({
        action:
          o.tier || typeof o.daysFromNow === "number"
            ? "grant_override"
            : typeof o.discountPercent === "number"
              ? "set_discount"
              : "set_notes",
        after: { adminOverride: next },
      });
    }

    await user.save();

    // Audit log entries
    for (const c of changes) {
      await AdminAction.create({
        adminId: auth.user.id,
        adminEmail: auth.user.email,
        targetUserId: id,
        targetEmail: user.email,
        action: c.action,
        before,
        after: c.after,
        reason: data.reason,
      });
      logger.info("Admin action", {
        adminId: auth.user.id,
        targetUserId: id,
        action: c.action,
        reason: data.reason,
      });
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user._id.toString(),
        email: user.email,
        businessName: user.businessName,
        subscriptionTier: user.subscriptionTier,
        adminOverride: user.adminOverride || null,
        overrideActive: isOverrideActive(user.adminOverride),
      },
    });
  } catch (error) {
    return handleApiError(error, "admin/users/patch");
  }
}
