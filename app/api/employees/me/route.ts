export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import EmployeeProfile from "@/models/sequelize/EmployeeProfile";
import User from "@/models/sequelize/User";
import sequelize from "@/lib/sequelize";
import { Op } from "sequelize";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    await sequelize.authenticate();
    await User.sync();
    await EmployeeProfile.sync();

    const userId = (session.user as any).id?.toString();
    const userDoc = userId ? await User.findByPk(userId, { raw: true }) : null;

    const empId = (session.user as any).employeeId || "";

    let profile = null;
    if (userId || empId) {
      const conditions: any[] = [];
      if (userId) {
        conditions.push({ user: userId });
        conditions.push({ employeeId: userId });
      }
      if (empId) {
        conditions.push({ user: empId });
        conditions.push({ employeeId: empId });
      }

      profile = await EmployeeProfile.findOne({
        where: { [Op.or]: conditions },
        raw: true
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        user: userDoc,
        profile: profile,
        vertical: profile?.vertical || (userDoc as any)?.vertical || null
      }
    });
  } catch (error: any) {
    console.error("GET /api/employees/me error:", error);
    return NextResponse.json({ success: false, error: error.message || "Failed to fetch profile" }, { status: 500 });
  }
}
