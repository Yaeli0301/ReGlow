import { NextResponse } from "next/server";
import { COOKIE_NAME } from "@/lib/auth";

export const AUTH_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;

export const authCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  maxAge: AUTH_COOKIE_MAX_AGE,
  path: "/",
};

/** Set auth cookie on the JSON response (reliable in Route Handlers). */
export function jsonWithAuthCookie<T>(body: T, token: string, init?: ResponseInit): NextResponse {
  const response = NextResponse.json(body, init);
  response.cookies.set(COOKIE_NAME, token, authCookieOptions);
  return response;
}

export function clearAuthCookieOnResponse(response: NextResponse): NextResponse {
  response.cookies.set(COOKIE_NAME, "", { ...authCookieOptions, maxAge: 0 });
  return response;
}
