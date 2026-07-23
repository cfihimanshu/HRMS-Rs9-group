import { NextResponse } from "next/server";
import LegalWorkHistory from "@/models/sequelize/LegalWorkHistory";
import sequelize from "@/lib/sequelize";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const masterId = searchParams.get("masterId");

    await sequelize.authenticate();
    await LegalWorkHistory.sync({ alter: true });

    let whereClause: any = {};
    if (category) whereClause.category = category;
    if (masterId) whereClause.masterId = masterId;

    const logs = await LegalWorkHistory.findAll({
      where: whereClause,
      order: [["createdAt", "DESC"]],
      limit: 500,
    });

    return NextResponse.json({ success: true, data: logs });
  } catch (error: any) {
    console.error("[/api/legal-recovery/work-history GET] Error:", error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    await sequelize.authenticate();
    await LegalWorkHistory.sync({ alter: true });

    const session = await getServerSession(authOptions);
    if (session?.user) {
      data.employeeId = (session.user as any).id;
      data.employeeName =
        (session.user as any).name ||
        ((session.user as any).firstName
          ? `${(session.user as any).firstName} ${(session.user as any).lastName || ""}`.trim()
          : "Employee");
    }

    const newHistoryEntry = await LegalWorkHistory.create(data);

    return NextResponse.json({ success: true, data: newHistoryEntry });
  } catch (error: any) {
    console.error("[/api/legal-recovery/work-history POST] Error:", error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
