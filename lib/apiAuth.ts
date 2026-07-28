import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const ADMIN_ROLES = ["Owner", "Director", "HR Head"] as const;
export const MANAGEMENT_ROLES = [
  "Owner",
  "Director",
  "HR Head",
  "HR Executive",
  "Department Manager",
  "IT Admin",
] as const;

export async function requireApiSession(allowedRoles?: readonly string[]) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return {
      session: null,
      response: NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 }),
    };
  }

  const role = String((session.user as any).role || "");
  if (allowedRoles && !allowedRoles.includes(role)) {
    return {
      session: null,
      response: NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 }),
    };
  }

  return { session, response: null };
}

export function getSessionActor(session: any) {
  return {
    userId: String(session?.user?.id || ""),
    userName: String(session?.user?.name || ""),
    userRole: String(session?.user?.role || ""),
  };
}
