import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import sequelize from "@/lib/sequelize";
import LeadRole from "@/models/sequelize/LeadRole";

const getShortCode = (name: string): string => {
  const clean = name.trim().toLowerCase();
  if (clean.includes("executive")) return "exec";
  if (clean.includes("manager")) return "mgr";
  if (clean.includes("telecaller") || clean.includes("tele-calling")) return "tele";
  if (clean.includes("sales")) return "sales";
  if (clean.includes("developer")) return "dev";
  if (clean.includes("designer")) return "des";
  if (clean.includes("engineer")) return "eng";
  
  const words = clean.split(/[^a-z0-9]+/g).filter(Boolean);
  if (words.length === 1) {
    return words[0].slice(0, 4);
  }
  return words.map(w => w.slice(0, 3)).join("_").slice(0, 8);
};

const defaultLeadRoles = [
  // Sales & Marketing
  { name: "Telecaller", department: "Sales" },
  { name: "Business Development Executive", department: "Sales" },
  { name: "Sales Executive", department: "Sales" },
  { name: "Digital Marketing Executive", department: "Marketing" },

  // HR & Admin
  { name: "HR Recruiter", department: "Human Resources (HR)" },
  { name: "HR Executive", department: "Human Resources (HR)" },
  { name: "Office Assistant", department: "Administration (Admin)" },

  // Customer Support & Data Entry
  { name: "Customer Support Executive", department: "Customer Support" },
  { name: "Data Entry Operator", department: "Data Entry" },

  // Accounts
  { name: "Accountant", department: "Accounts" },

  // IT
  { name: "IT Support Engineer", department: "Information Technology (IT)" },
  { name: "Software Developer", department: "Information Technology (IT)" },
];

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    await sequelize.authenticate();
    await LeadRole.sync({ alter: true });

    // Sync/copy all roles from the main roles table to leads_roles table
    try {
      const Role = (await import("@/models/sequelize/Role")).default;
      const allMainRoles = await Role.findAll();
      for (const mainRole of allMainRoles) {
        const exists = await LeadRole.findOne({
          where: {
            name: mainRole.name,
            department: mainRole.department || null
          }
        });
        if (!exists) {
          await LeadRole.create({
            id: mainRole.id,
            name: mainRole.name,
            department: mainRole.department || null,
            status: mainRole.status || "Active"
          });
        }
      }
    } catch (syncErr) {
      console.error("Failed to copy roles from main roles table to leads_roles:", syncErr);
    }

    let roles = await LeadRole.findAll({ order: [["name", "ASC"]] });

    if (roles.length === 0) {
      for (const role of defaultLeadRoles) {
        const baseId = `role_${getShortCode(role.name)}`;
        let id = baseId;
        let counter = 1;
        while (await LeadRole.findOne({ where: { id } })) {
          id = `${baseId}_${counter}`;
          counter++;
        }
        await LeadRole.create({ id, name: role.name, department: role.department, status: "Active" });
      }

      roles = await LeadRole.findAll({ order: [["name", "ASC"]] });
    }

    return NextResponse.json({ success: true, data: roles });
  } catch (error: any) {
    console.error("Failed to fetch lead roles:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { name, department } = await req.json();
    if (!name || !name.trim()) {
      return NextResponse.json({ success: false, error: "Role name is required" }, { status: 400 });
    }
    if (!department || !department.trim()) {
      return NextResponse.json({ success: false, error: "Department is required" }, { status: 400 });
    }

    await sequelize.authenticate();
    await LeadRole.sync({ alter: true });

    const baseId = `role_${getShortCode(name)}`;
    let id = baseId;
    let counter = 1;
    while (await LeadRole.findOne({ where: { id } })) {
      id = `${baseId}_${counter}`;
      counter++;
    }

    const [role, created] = await LeadRole.findOrCreate({
      where: { name: name.trim(), department: department.trim() },
      defaults: { id, name: name.trim(), department: department.trim(), status: "Active" }
    });

    return NextResponse.json({ success: true, data: role, created });
  } catch (error: any) {
    console.error("Failed to create lead role:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
