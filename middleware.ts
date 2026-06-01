import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    if (!token) {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    const role = token.role as string;

    // Route RBAC protection
    if (path.startsWith("/owner") && !["Owner", "Director", "IT Admin", "Accounts"].includes(role)) {
      return NextResponse.redirect(new URL("/unauthorized", req.url));
    }

    if (path.startsWith("/hr") && !["HR Head", "HR Executive", "Owner"].includes(role)) {
      return NextResponse.redirect(new URL("/unauthorized", req.url));
    }

    if (path.startsWith("/manager") && !["Department Manager", "DSM", "Owner"].includes(role)) {
      return NextResponse.redirect(new URL("/unauthorized", req.url));
    }

    if (path.startsWith("/employee") && !["Employee", "Trainer", "RIBP / Risk Officer", "Owner", "HR Head"].includes(role)) {
      return NextResponse.redirect(new URL("/unauthorized", req.url));
    }

    if (path.startsWith("/associate") && !["Business Associate", "Territory Partner", "Owner"].includes(role)) {
      return NextResponse.redirect(new URL("/unauthorized", req.url));
    }

    if (path.startsWith("/vendor") && !["Vendor", "Owner"].includes(role)) {
      return NextResponse.redirect(new URL("/unauthorized", req.url));
    }

    if (path.startsWith("/franchise") && !["Franchisee", "Territory Partner", "Owner"].includes(role)) {
      return NextResponse.redirect(new URL("/unauthorized", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

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
  ],
};
