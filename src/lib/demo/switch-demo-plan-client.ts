import { persistAuthClient } from "@/lib/client-auth";
import { resetDemoUpsellSegment } from "@/lib/demo/demo-upsell-timer";
import type { SessionUser, SubscriptionTier, UserRole } from "@/types";

const PLANS = ["basic", "pro", "premium"] as const;

export type DemoPlan = (typeof PLANS)[number];

export function isDemoPlan(value: string): value is DemoPlan {
  return (PLANS as readonly string[]).includes(value);
}

export async function switchDemoPlan(plan: DemoPlan): Promise<{
  ok: boolean;
  error?: string;
  user?: SessionUser;
}> {
  const res = await fetch("/api/demo/start", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ plan }),
    credentials: "include",
  });

  const data = (await res.json()) as {
    error?: string;
    userMessage?: string;
    user?: {
      id: string;
      email: string;
      role: string;
      businessName?: string;
      subscriptionTier?: string;
    };
    token?: string;
  };

  if (!res.ok) {
    return { ok: false, error: data.userMessage || data.error || "לא הצלחנו להחליף חבילה בדמו" };
  }

  if (data.user && data.token) {
    const sessionUser: SessionUser = {
      id: data.user.id,
      email: data.user.email,
      role: (data.user.role === "admin" ? "admin" : "business") as UserRole,
      businessName: data.user.businessName || "ReGlow",
      subscriptionTier: (data.user.subscriptionTier || plan) as SubscriptionTier,
    };
    persistAuthClient(data.token, sessionUser);
    resetDemoUpsellSegment();
    return { ok: true, user: sessionUser };
  }

  return { ok: false, error: "תגובה לא תקינה מהשרת" };
}
