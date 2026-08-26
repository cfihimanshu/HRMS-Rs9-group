import { NextResponse } from "next/server";
import sequelize from "@/lib/sequelize";
import Department from "@/models/sequelize/Department";
import EmployeeProfile from "@/models/sequelize/EmployeeProfile";
import { Op } from "sequelize";

const COMMON_DEPARTMENTS = [
  "Management",
  "Human Resources",
  "IT & Software",
  "Finance & Accounts",
  "Operations",
  "Security & Legal",
  "Business Development",
  "Admin",
  "Assets Management"
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
      if (!name) return "";
      const raw = String(name).trim();

      // If name is purely numeric or timestamp like "1781768049091", ignore it
      if (/^\d+$/.test(raw)) return "";

      const s = raw.toLowerCase();

      // Handle internal DEPT_ codes like "DEPT_ATPL_MAN_469739399", "DEPT_CFI_OPE_..."
      if (s.startsWith("dept_") || s.includes("_")) {
        const parts = s.split("_");
        for (const p of parts) {
          const code = p.toUpperCase();
          if (code === "MAN" || code === "MGMT" || code === "OWNER") return "Management";
          if (code === "OPE" || code === "OPS") return "Operations";
          if (code === "SEC" || code === "LEG") return "Security & Legal";
          if (code === "HR" || code === "HUMAN") return "Human Resources";
          if (code === "FIN" || code === "ACC" || code === "ACCOUNTS") return "Finance & Accounts";
          if (code === "IT" || code === "TECH" || code === "DEV" || code === "SW") return "IT & Software";
          if (code === "BDA" || code === "SALES" || code === "MKT") return "Business Development";
          if (code === "ADM" || code === "ADMIN") return "Admin";
        }
      }

      if (s.includes("owner") || s.includes("director") || s.includes("board") || s.includes("executive") || s.includes("management") || s.includes("mgmt")) return "Management";
      if (s.includes("hr") || s.includes("human") || s.includes("recruit") || s.includes("talent")) return "Human Resources";
      if (s.includes("it") || s.includes("tech") || s.includes("software") || s.includes("developer") || s.includes("information technology")) return "IT & Software";
      if (s.includes("account") || s.includes("finance") || s.includes("payroll") || s.includes("tax")) return "Finance & Accounts";
      if (s.includes("legal") || s.includes("recovery") || s.includes("security") || s.includes("facility")) return "Security & Legal";
      if (s.includes("admin") || s.includes("operation") || s.includes("ops") || s.includes("logistics")) return "Operations";
      if (s.includes("business development") || s.includes("bda") || s.includes("sales") || s.includes("marketing")) return "Business Development";
      if (s.includes("asset") || s.includes("inventory")) return "Assets Management";

      // If it still contains underscores and numbers, it is an unmapped internal ID
      if (raw.includes("_") && /\d/.test(raw)) return "";

      return raw;
    };

    const canonicalMap = new Map<string, { id: string; name: string }>();

    // Always include standard departments
    COMMON_DEPARTMENTS.forEach(name => {
      const canonical = getCanonicalName(name) || name;
      if (!canonicalMap.has(canonical.toLowerCase())) {
        canonicalMap.set(canonical.toLowerCase(), { id: canonical, name: canonical });
      }
    });

    dbDepartments.forEach((d: any) => {
      if (!d.name) return;
      const canonical = getCanonicalName(d.name);
      if (canonical && !canonicalMap.has(canonical.toLowerCase())) {
        canonicalMap.set(canonical.toLowerCase(), { id: canonical, name: canonical });
      }
    });

    // Also fetch distinct departments from active EmployeeProfiles
    const profiles = await EmployeeProfile.findAll({ attributes: ["department"], raw: true });
    profiles.forEach((p: any) => {
      if (!p.department) return;
      const canonical = getCanonicalName(p.department);
      if (canonical && !canonicalMap.has(canonical.toLowerCase())) {
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
