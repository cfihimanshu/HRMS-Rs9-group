import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

const PUBLIC_API_GET = new Set(["/api/jobs", "/api/job-form-config"]);
const PUBLIC_API_POST = new Set(["/api/candidates"]);

function isPublicApi(path: string, method: string) {
  return path.startsWith("/api/auth/") ||
    (method === "GET" && PUBLIC_API_GET.has(path)) ||
    (method === "POST" && PUBLIC_API_POST.has(path));
}

function unauthorized(req: NextRequest) {
  if (req.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.redirect(new URL("/login", req.url));
}

function hasRole(role: string, allowed: string[]) {
  return allowed.includes(role);
}

export async function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const method = req.method.toUpperCase();

  if (isPublicApi(path, method)) return NextResponse.next();

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return unauthorized(req);

  const role = String(token.role || "");

  if (path.startsWith("/owner") && !hasRole(role, ["Owner", "Director", "IT Admin", "Accounts"])) {
    return NextResponse.redirect(new URL("/unauthorized", req.url));
  }

  if (path.startsWith("/hr") && !hasRole(role, ["HR Head", "HR Executive", "Owner"])) {
    return NextResponse.redirect(new URL("/unauthorized", req.url));
  }

  if (path.startsWith("/manager") && !hasRole(role, ["Department Manager", "DSM", "Owner"])) {
    return NextResponse.redirect(new URL("/unauthorized", req.url));
  }

  if (path.startsWith("/employee") && !hasRole(role, ["Employee", "Trainer", "RIBP / Risk Officer", "Owner", "HR Head"])) {
    return NextResponse.redirect(new URL("/unauthorized", req.url));
  }

  if (path.startsWith("/associate") && !hasRole(role, ["Business Associate", "Territory Partner", "Owner"])) {
    return NextResponse.redirect(new URL("/unauthorized", req.url));
  }

  if (path.startsWith("/vendor") && !hasRole(role, ["Vendor", "Owner"])) {
    return NextResponse.redirect(new URL("/unauthorized", req.url));
  }

  if (path.startsWith("/franchise") && !hasRole(role, ["Franchisee", "Territory Partner", "Owner"])) {
    return NextResponse.redirect(new URL("/unauthorized", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/owner/:path*",
    "/hr/:path*",
    "/manager/:path*",
    "/employee/:path*",
    "/associate/:path*",
    "/vendor/:path*",
    "/franchise/:path*",
    "/api/((?!auth).*)"
  ],
};
