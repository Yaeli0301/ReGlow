import { NextResponse } from "next/server";
import { requireAuthFromRequest } from "@/lib/api-auth";

export async function GET(request: Request) {
  const auth = await requireAuthFromRequest(request);
  if (auth instanceof NextResponse) return auth;

  return NextResponse.json({ user: auth.user });
}
