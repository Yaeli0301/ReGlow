import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyTokenEdge } from "@/lib/jwt-edge";

const COOKIE_NAME = "reglow_token";

const protectedPaths = [
  "/dashboard",
  "/admin-dashboard",
  "/clients",
  "/appointments",
  "/lost-clients",
  "/billing",
  "/schedule",
  "/settings",
  "/pricing",
  "/invoices",
  "/feedback",
  "/admin",
  "/onboarding",
];

const adminOnlyPrefixes = ["/admin-dashboard", "/admin"];

const authPaths = ["/login", "/register"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(COOKIE_NAME)?.value;

  const isProtected = protectedPaths.some((p) => pathname.startsWith(p));
  const isAuthPage = authPaths.some((p) => pathname.startsWith(p));
  const isAdminRoute = adminOnlyPrefixes.some((p) => pathname.startsWith(p));

  if (isProtected) {
    if (!token) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    const session = await verifyTokenEdge(token);
    if (!session) {
      const res = NextResponse.redirect(new URL("/login", request.url));
      res.cookies.set(COOKIE_NAME, "", { path: "/", maxAge: 0 });
      return res;
    }
    if (isAdminRoute && session.role !== "admin") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  if (token && isAuthPage) {
    const session = await verifyTokenEdge(token);
    if (session) {
      const dest = session.role === "admin" ? "/admin-dashboard" : "/dashboard";
      return NextResponse.redirect(new URL(dest, request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/admin-dashboard/:path*",
    "/clients/:path*",
    "/appointments/:path*",
    "/lost-clients/:path*",
    "/billing/:path*",
    "/schedule/:path*",
    "/settings/:path*",
    "/pricing/:path*",
    "/invoices/:path*",
    "/feedback/:path*",
    "/admin/:path*",
    "/onboarding/:path*",
    "/login",
    "/register",
  ],
};
