import { NextResponse } from "next/server";
import { requireApiSession } from "@/lib/apiAuth";
import User from "@/models/sequelize/User";
import EmployeeProfile from "@/models/sequelize/EmployeeProfile";
import Department from "@/models/sequelize/Department";

const ROLES = ["Owner", "Director", "HR Head", "HR Executive", "Department Manager", "IT Admin", "Accounts"] as const;

export async function GET() {
  try {
    const auth = await requireApiSession(ROLES);
    if (auth.response) return auth.response;
    const [users, profiles, departments] = await Promise.all([
      User.findAll({ where: { status: "active" }, attributes: ["id", "name", "email", "role"], order: [["name", "ASC"]], raw: true }),
      EmployeeProfile.findAll({ attributes: ["user", "department", "employeeId"], raw: true }),
      Department.findAll({ attributes: ["id", "name"], raw: true }),
    ]);
    const departmentMap = new Map(departments.map((item: any) => [String(item.id), item.name]));
    const profileMap = new Map(profiles.map((item: any) => [String(item.user), item]));
    const data = users.map((user: any) => {
      const profile: any = profileMap.get(String(user.id));
      return {
        ...user,
        employeeId: profile?.employeeId || null,
        department: profile?.department ? departmentMap.get(String(profile.department)) || profile.department : null,
      };
    });
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || "Failed to load employees" }, { status: 500 });
  }
}
