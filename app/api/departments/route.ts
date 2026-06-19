import { NextResponse } from "next/server";
import sequelize from "@/lib/sequelize";
import Department from "@/models/sequelize/Department";

export async function GET(req: Request) {
  try {
    await sequelize.authenticate();
    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get("companyId");

    const query: any = { status: "active" };
    if (companyId) {
      query.company = companyId;
    }

    const departments = await Department.findAll({
      where: query,
      order: [['name', 'ASC']]
    });
    return NextResponse.json({ success: true, data: departments });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
