import { NextResponse } from "next/server";
import sequelize from "@/lib/sequelize";
import Department from "@/models/sequelize/Department";
import { Op } from "sequelize";

const COMMON_DEPARTMENTS = [
  "Admin",
  "HR",
  "Assets Management",
  "Accounts",
  "IT",
  "Business Development",
  "Operations"
];

async function seedDefaultDepartments() {
  try {
    await Department.sync({ alter: true });
    for (const name of COMMON_DEPARTMENTS) {
      const exists = await Department.findOne({
        where: { name }
      });
      if (!exists) {
        await Department.create({
          id: "dept_" + name.toLowerCase().replace(/[^a-z0-9]/g, "_"),
          name,
          company: null,
          status: "active"
        });
      }
    }
  } catch (err) {
    console.error("Error seeding default departments:", err);
  }
}

export async function GET(req: Request) {
  try {
    await sequelize.authenticate();
    await seedDefaultDepartments();

    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get("companyId");

    const query: any = { status: "active" };
    if (companyId) {
      query[Op.or] = [
        { company: companyId },
        { company: null }
      ];
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
    await seedDefaultDepartments();

    const body = await req.json();
    const { name, companyId } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ success: false, error: "Department name is required" }, { status: 400 });
    }

    const trimmedName = name.trim();
    const existingDept = await Department.findOne({
      where: {
        name: trimmedName,
        company: companyId || null
      }
    });

    if (existingDept) {
      return NextResponse.json({ success: true, data: existingDept, message: "Department already exists" });
    }

    const newDept = await Department.create({
      id: "dept_" + Date.now(),
      name: trimmedName,
      company: companyId || null,
      status: "active"
    });

    return NextResponse.json({ success: true, data: newDept, message: "Department created successfully" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
