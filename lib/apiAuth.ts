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
  "Operation Manager",
  "Sales Head",
  "Sales Manager",
  "DSM",
  "IT Manager",
  "IT Admin",
  "Recovery Manager",
  "Legal Head",
  "CCO",
] as const;

export async function requireApiSession(allowedRoles?: readonly string[]) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return {
      session: null,
      response: NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 }),
    };
  }

  const role = String((session.user as any).role || "").toLowerCase();
  const dept = String((session.user as any).department || "").toLowerCase();
  const desig = String((session.user as any).jobTitle || (session.user as any).designation || "").toLowerCase();

  if (allowedRoles && allowedRoles.length > 0) {
    const isOwnerOrAdmin = role.includes("owner") || role.includes("director") || dept.includes("administration");
    const isAllowed =
      isOwnerOrAdmin ||
      allowedRoles.some(r => {
        const rLower = r.toLowerCase();
        return (
          rLower === role ||
          (role.includes("manager") && rLower.includes("manager")) ||
          (role.includes("head") && rLower.includes("head")) ||
          (desig.includes("manager") && rLower.includes("manager")) ||
          (desig.includes("head") && rLower.includes("head"))
        );
      });

    if (!isAllowed) {
      return {
        session: null,
        response: NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 }),
      };
    }
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
