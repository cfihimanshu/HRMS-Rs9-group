import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import sequelize from "@/lib/sequelize";
import LeadsDepartment from "@/models/sequelize/LeadsDepartment";

const getShortCode = (name: string): string => {
  const clean = name.trim().toLowerCase();
  if (clean.includes("accounts") || clean.includes("accounting")) return "acc";
  if (clean.includes("admin")) return "admin";
  if (clean.includes("business analyst") || clean.includes("analyst")) return "ba";
  if (clean.includes("support") || clean.includes("service")) return "cs";
  if (clean.includes("data entry") || clean.includes("data")) return "data";
  if (clean.includes("human resources") || clean.includes("hr")) return "hr";
  if (clean.includes("information technology") || clean.includes("it")) return "it";
  if (clean.includes("legal")) return "legal";
  if (clean.includes("management")) return "mgmt";
  if (clean.includes("marketing")) return "mkt";
  if (clean.includes("operations")) return "ops";
  if (clean.includes("sales")) return "sales";
  if (clean.includes("development") || clean.includes("developer")) return "dev";
  if (clean.includes("finance") || clean.includes("financial")) return "fin";

  const words = clean.split(/[^a-z0-9]+/g).filter(Boolean);
  if (words.length === 1) {
    return words[0].slice(0, 4);
  }
  return words.map(w => w.slice(0, 3)).join("_").slice(0, 8);
};

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    await sequelize.authenticate();
    await LeadsDepartment.sync({ alter: true });

    let departments = await LeadsDepartment.findAll({ order: [["name", "ASC"]] });

    if (departments.length === 0) {
      const defaultDepts = [
        "Accounts",
        "Administration (Admin)",
        "Business Analyst",
        "Customer Support",
        "Data Entry",
        "Human Resources (HR)",
        "Information Technology (IT)",
        "Legal",
        "Management",
        "Marketing",
        "Operations",
        "Sales"
      ];

      for (const dept of defaultDepts) {
        const baseId = `dept_${getShortCode(dept)}`;
        let id = baseId;
        let counter = 1;
        while (await LeadsDepartment.findOne({ where: { id } })) {
          id = `${baseId}_${counter}`;
          counter++;
        }
        await LeadsDepartment.create({ id, name: dept });
      }

      departments = await LeadsDepartment.findAll({ order: [["name", "ASC"]] });
    }

    return NextResponse.json({ success: true, data: departments });
  } catch (error: any) {
    console.error("Failed to fetch departments:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { name } = await req.json();
    if (!name || !name.trim()) {
      return NextResponse.json({ success: false, error: "Department name is required" }, { status: 400 });
    }

    await sequelize.authenticate();
    await LeadsDepartment.sync({ alter: true });

    const baseId = `dept_${getShortCode(name)}`;
    let id = baseId;
    let counter = 1;
    while (await LeadsDepartment.findOne({ where: { id } })) {
      id = `${baseId}_${counter}`;
      counter++;
    }

    const [dept, created] = await LeadsDepartment.findOrCreate({
      where: { name: name.trim() },
      defaults: { id, name: name.trim() }
    });

    return NextResponse.json({ success: true, data: dept, created });
  } catch (error: any) {
    console.error("Failed to create department:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
