import { NextResponse } from "next/server";
import sequelize from "@/lib/sequelize";
import Designation from "@/models/sequelize/Designation";

const defaultDesignations = [
  // Global fallbacks
  { id: "desig_intern", name: "Intern", department_id: "global", level: "L1" },
  { id: "desig_employee", name: "Employee", department_id: "global", level: "L2" },
  { id: "desig_dept_head", name: "Department Head", department_id: "global", level: "L3" },
  { id: "desig_manager", name: "Manager", department_id: "global", level: "L4" },

  // Accounts
  { id: "desig_accts_intern", name: "Intern", department_id: "Accounts", level: "L1" },
  { id: "desig_accts_exec", name: "Accounts Executive", department_id: "Accounts", level: "L2" },
  { id: "desig_accts_accountant", name: "Accountant", department_id: "Accounts", level: "L2" },
  { id: "desig_accts_mgr", name: "Accounts Manager", department_id: "Accounts", level: "L3" },
  { id: "desig_accts_head", name: "Finance Head", department_id: "Accounts", level: "L4" },

  // Administration (Admin)
  { id: "desig_admin_intern", name: "Intern", department_id: "Administration (Admin)", level: "L1" },
  { id: "desig_admin_exec", name: "Admin Executive", department_id: "Administration (Admin)", level: "L2" },
  { id: "desig_admin_mgr", name: "Admin Manager", department_id: "Administration (Admin)", level: "L3" },
  { id: "desig_admin_head", name: "Administration Head", department_id: "Administration (Admin)", level: "L4" },

  // Business Analyst
  { id: "desig_ba_intern", name: "Intern", department_id: "Business Analyst", level: "L1" },
  { id: "desig_ba_ba", name: "Business Analyst", department_id: "Business Analyst", level: "L2" },
  { id: "desig_ba_sr", name: "Senior Business Analyst", department_id: "Business Analyst", level: "L3" },
  { id: "desig_ba_mgr", name: "Business Analysis Manager", department_id: "Business Analyst", level: "L4" },

  // Customer Support
  { id: "desig_support_intern", name: "Intern", department_id: "Customer Support", level: "L1" },
  { id: "desig_support_exec", name: "Customer Support Executive", department_id: "Customer Support", level: "L2" },
  { id: "desig_support_tl", name: "Team Lead", department_id: "Customer Support", level: "L3" },
  { id: "desig_support_mgr", name: "Support Manager", department_id: "Customer Support", level: "L4" },

  // Data Entry
  { id: "desig_data_intern", name: "Intern", department_id: "Data Entry", level: "L1" },
  { id: "desig_data_exec", name: "Data Entry Executive", department_id: "Data Entry", level: "L2" },
  { id: "desig_data_mis", name: "MIS Executive", department_id: "Data Entry", level: "L2" },
  { id: "desig_data_mgr", name: "Data Entry Manager", department_id: "Data Entry", level: "L3" },

  // Human Resources (HR)
  { id: "desig_hr_intern", name: "Intern", department_id: "Human Resources (HR)", level: "L1" },
  { id: "desig_hr_exec", name: "HR Executive", department_id: "Human Resources (HR)", level: "L2" },
  { id: "desig_hr_sr_exec", name: "Senior HR Executive", department_id: "Human Resources (HR)", level: "L3" },
  { id: "desig_hr_mgr", name: "HR Manager", department_id: "Human Resources (HR)", level: "L4" },
  { id: "desig_hr_head", name: "HR Head", department_id: "Human Resources (HR)", level: "L5" },

  // Information Technology (IT)
  { id: "desig_it_intern", name: "Intern", department_id: "Information Technology (IT)", level: "L1" },
  { id: "desig_it_dev", name: "Software Developer", department_id: "Information Technology (IT)", level: "L2" },
  { id: "desig_it_tl", name: "Team Lead", department_id: "Information Technology (IT)", level: "L3" },
  { id: "desig_it_mgr", name: "IT Manager", department_id: "Information Technology (IT)", level: "L4" },
  { id: "desig_it_head", name: "IT Head / CTO", department_id: "Information Technology (IT)", level: "L5" },

  // Legal
  { id: "desig_legal_intern", name: "Intern", department_id: "Legal", level: "L1" },
  { id: "desig_legal_exec", name: "Legal Executive", department_id: "Legal", level: "L2" },
  { id: "desig_legal_mgr", name: "Legal Manager", department_id: "Legal", level: "L3" },
  { id: "desig_legal_head", name: "Head of Legal", department_id: "Legal", level: "L4" },

  // Management
  { id: "desig_mgmt_intern", name: "Intern", department_id: "Management", level: "L1" },
  { id: "desig_mgmt_tl", name: "Team Leader", department_id: "Management", level: "L2" },
  { id: "desig_mgmt_asst_mgr", name: "Assistant Manager", department_id: "Management", level: "L3" },
  { id: "desig_mgmt_mgr", name: "Manager", department_id: "Management", level: "L4" },
  { id: "desig_mgmt_sr_mgr", name: "Senior Manager", department_id: "Management", level: "L5" },
  { id: "desig_mgmt_gm", name: "General Manager", department_id: "Management", level: "L6" },
  { id: "desig_mgmt_director", name: "Director", department_id: "Management", level: "L7" },

  // Marketing
  { id: "desig_mktg_intern", name: "Intern", department_id: "Marketing", level: "L1" },
  { id: "desig_mktg_exec", name: "Marketing Executive", department_id: "Marketing", level: "L2" },
  { id: "desig_mktg_digital", name: "Digital Marketing Executive", department_id: "Marketing", level: "L3" },
  { id: "desig_mktg_mgr", name: "Marketing Manager", department_id: "Marketing", level: "L4" },
  { id: "desig_mktg_head", name: "Marketing Head", department_id: "Marketing", level: "L5" },

  // Operations
  { id: "desig_ops_intern", name: "Intern", department_id: "Operations", level: "L1" },
  { id: "desig_ops_exec", name: "Operations Executive", department_id: "Operations", level: "L2" },
  { id: "desig_ops_tl", name: "Team Lead", department_id: "Operations", level: "L3" },
  { id: "desig_ops_mgr", name: "Operations Manager", department_id: "Operations", level: "L4" },
  { id: "desig_ops_head", name: "Operations Head", department_id: "Operations", level: "L5" },

  // Sales
  { id: "desig_sales_intern", name: "Intern", department_id: "Sales", level: "L1" },
  { id: "desig_sales_exec", name: "Sales Executive", department_id: "Sales", level: "L2" },
  { id: "desig_sales_bde", name: "Business Development Executive (BDE)", department_id: "Sales", level: "L3" },
  { id: "desig_sales_mgr", name: "Sales Manager", department_id: "Sales", level: "L4" },
  { id: "desig_sales_head", name: "Sales Head", department_id: "Sales", level: "L5" },
];

export async function GET(req: Request) {
  try {
    await sequelize.authenticate();
    await Designation.sync({ alter: true });

    // Seed default designations if they do not exist
    for (const dd of defaultDesignations) {
      const exists = await Designation.findOne({
        where: {
          name: dd.name,
          department_id: dd.department_id
        }
      });
      if (!exists) {
        await Designation.create({
          id: dd.id,
          name: dd.name,
          department_id: dd.department_id,
          level: dd.level,
          status: "Active"
        });
      }
    }

    const designations = await Designation.findAll({
      where: { status: "Active" },
      order: [['name', 'ASC']],
      raw: true
    });

    return NextResponse.json({ success: true, data: designations });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await sequelize.authenticate();
    await Designation.sync({ alter: true });
    const body = await req.json();
    const { name, departmentId, level } = body;

    if (!name) {
      return NextResponse.json({ success: false, error: "Designation name is required" }, { status: 400 });
    }

    const trimmedName = name.trim();
    const targetDeptId = departmentId || "global";

    // Check if designation already exists for this department (case-insensitive search)
    const allMatchingNames = await Designation.findAll({
      where: sequelize.where(
        sequelize.fn("lower", sequelize.col("name")),
        sequelize.fn("lower", trimmedName)
      ),
      raw: true
    });
    const existing = allMatchingNames.find((d: any) => d.department_id === targetDeptId);

    if (existing) {
      return NextResponse.json({ success: true, data: existing });
    }

    const newDesignation = await Designation.create({
      id: "desig_" + Date.now().toString(),
      name: trimmedName,
      department_id: targetDeptId,
      level: level || "L1",
      status: "Active"
    });

    return NextResponse.json({ success: true, data: newDesignation });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
