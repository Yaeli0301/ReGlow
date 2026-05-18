import { NextResponse } from "next/server";
import { isStripeConfigured } from "@/lib/stripe-config";

export async function GET() {
  return NextResponse.json({ configured: isStripeConfigured() });
}
