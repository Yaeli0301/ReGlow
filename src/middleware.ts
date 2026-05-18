import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const COOKIE_NAME = "reglow_token";

const protectedPaths = [
  "/dashboard",
  "/clients",
  "/appointments",
  "/lost-clients",
  "/billing",
  "/schedule",
  "/settings",
];

const authPaths = ["/login", "/register"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(COOKIE_NAME)?.value;

  const isProtected = protectedPaths.some((p) => pathname.startsWith(p));
  const isAuthPage = authPaths.some((p) => pathname.startsWith(p));

  if (isProtected && !token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (isAuthPage && token) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/clients/:path*",
    "/appointments/:path*",
    "/lost-clients/:path*",
    "/billing/:path*",
    "/schedule/:path*",
    "/settings/:path*",
    "/login",
    "/register",
  ],
};
