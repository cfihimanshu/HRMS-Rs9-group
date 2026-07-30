import { NextResponse } from "next/server";
import { requireApiSession } from "@/lib/apiAuth";
import User from "@/models/sequelize/User";
import EmployeeProfile from "@/models/sequelize/EmployeeProfile";
import Department from "@/models/sequelize/Department";

const ALLOWED_ROLES = new Set([
  "owner", "director", "hr head", "hr executive",
  "it admin", "it manager", "department manager",
]);

function parseMenuAccess(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value !== "string" || !value.trim()) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return value.split(",").map(item => item.trim()).filter(Boolean);
  }
}

export async function requireVehicleApiAccess() {
  const auth = await requireApiSession();
  if (auth.response) return auth;

  const sessionUser = auth.session?.user as any;
  const userId = String(sessionUser?.id || "");
  const dbUser: any = userId ? await User.findByPk(userId, { raw: true }) : null;
  const role = String(dbUser?.role || sessionUser?.role || "").trim().toLowerCase();
  const menuAccess = parseMenuAccess(dbUser?.menuAccess ?? sessionUser?.menuAccess);

  let isAdministration = false;
  if (userId) {
    const profile: any = await EmployeeProfile.findOne({ where: { user: userId }, raw: true });
    if (profile?.department) {
      const department: any = await Department.findByPk(profile.department, { attributes: ["name"], raw: true });
      isAdministration = String(department?.name || profile.department).toLowerCase().includes("administration");
    }
  }

  if (!ALLOWED_ROLES.has(role) && !isAdministration && !menuAccess.includes("vehicle-registry")) {
    return {
      session: null,
      response: NextResponse.json({ success: false, error: "Vehicle Registry access is not assigned to this user" }, { status: 403 }),
    };
  }

  return auth;
}
