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

export async function POST(req: Request) {
  try {
    await sequelize.authenticate();
    const body = await req.json();
    const { name, companyId } = body;

    if (!name) {
      return NextResponse.json({ success: false, error: "Department name is required" }, { status: 400 });
    }

    // Check if department already exists for this company
    const existingDept = await Department.findOne({
      where: {
        name: name.trim(),
        company: companyId || null
      }
    });

    if (existingDept) {
      return NextResponse.json({ success: true, data: existingDept });
    }

    const newDept = await Department.create({
      id: Date.now().toString(),
      name: name.trim(),
      company: companyId || null,
      status: "active"
    });

    return NextResponse.json({ success: true, data: newDept });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
