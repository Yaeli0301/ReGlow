import { NextResponse } from "next/server";
import { clearAuthCookieOnResponse } from "@/lib/auth-cookie";
import { logger } from "@/lib/logger";

export async function POST() {
  logger.info("User logged out");
  const response = NextResponse.json({ success: true, message: "Logged out" });
  return clearAuthCookieOnResponse(response);
}
