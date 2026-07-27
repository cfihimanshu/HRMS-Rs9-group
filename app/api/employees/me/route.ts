import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import EmployeeProfile from "@/models/sequelize/EmployeeProfile";
import User from "@/models/sequelize/User";
import { Op } from "sequelize";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id?.toString();
    const userDoc = await User.findByPk(userId, { raw: true });

    let profile = await EmployeeProfile.findOne({
      where: {
        [Op.or]: [
          { user: userId },
          { employeeId: userId },
          { user: (session.user as any).employeeId || "" }
        ]
      },
      raw: true
    });

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
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
