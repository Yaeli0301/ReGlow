import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthFromRequest } from "@/lib/api-auth";
import { createCheckoutSession, getStripe } from "@/lib/stripe";
import { User } from "@/models/User";
import type { SubscriptionTier } from "@/types";

const schema = z.object({
  tier: z.enum(["basic", "pro", "premium"]),
  useReferralReward: z.boolean().optional(),
});

export async function POST(request: Request) {
  const auth = await requireAuthFromRequest(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    const tier = parsed.data.tier as Exclude<SubscriptionTier, "none">;
    const { dbUser } = auth;

    let useReferralReward = false;
    if (parsed.data.useReferralReward && dbUser && dbUser.referralRewardMonths > 0) {
      useReferralReward = true;
    }

    let customerId = dbUser?.stripeCustomerId;

    if (!customerId) {
      const customer = await getStripe().customers.create({
        email: auth.user.email,
        metadata: { userId: auth.user.id },
      });
      customerId = customer.id;
      await User.findByIdAndUpdate(auth.user.id, { stripeCustomerId: customerId });
    }

    const session = await createCheckoutSession({
      customerId,
      customerEmail: auth.user.email,
      userId: auth.user.id,
      tier,
      useReferralReward,
    });

    return NextResponse.json({
      url: session.url,
      usedReferralReward: useReferralReward,
    });
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 });
  }
}
