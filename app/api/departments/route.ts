import { NextResponse } from "next/server";
import sequelize from "@/lib/sequelize";
import Department from "@/models/sequelize/Department";
import EmployeeProfile from "@/models/sequelize/EmployeeProfile";
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
    await Department.sync();
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

    const dbDepartments = await Department.findAll({
      where: query,
      order: [['name', 'ASC']],
      raw: true
    });

    const getCanonicalName = (name: string): string => {
      const s = (name || "").trim().toLowerCase();
      if (s.includes("hr") || s.includes("human")) return "Human Resources";
      if (s.includes("it") || s.includes("tech") || s.includes("software") || s.includes("information technology")) return "IT & Software";
      if (s.includes("account") || s.includes("finance")) return "Finance & Accounts";
      if (s.includes("legal") || s.includes("recovery") || s.includes("security")) return "Security & Legal";
      if (s.includes("admin") || s.includes("operation") || s.includes("ops")) return "Operations";
      if (s.includes("management") || s.includes("board")) return "Management";
      if (s.includes("business development") || s.includes("bda") || s.includes("sales")) return "Business Development";
      return name.trim();
    };

    const canonicalMap = new Map<string, { id: string; name: string }>();

    dbDepartments.forEach((d: any) => {
      if (!d.name) return;
      const canonical = getCanonicalName(d.name);
      if (!canonicalMap.has(canonical.toLowerCase())) {
        canonicalMap.set(canonical.toLowerCase(), { id: canonical, name: canonical });
      }
    });

    // Also fetch distinct departments from active EmployeeProfiles
    const profiles = await EmployeeProfile.findAll({ attributes: ["department"], raw: true });
    profiles.forEach((p: any) => {
      if (!p.department) return;
      const canonical = getCanonicalName(p.department);
      if (!canonicalMap.has(canonical.toLowerCase())) {
        canonicalMap.set(canonical.toLowerCase(), { id: canonical, name: canonical });
      }
    });

    const data = Array.from(canonicalMap.values()).sort((a, b) => a.name.localeCompare(b.name));
    return NextResponse.json({ success: true, data });
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
