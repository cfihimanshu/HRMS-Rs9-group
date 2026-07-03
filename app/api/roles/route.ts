import { NextResponse } from "next/server";
import sequelize from "@/lib/sequelize";
import Role from "@/models/sequelize/Role";
import Company from "@/models/sequelize/Company";
import Department from "@/models/sequelize/Department";
import { Op } from "sequelize";

const defaultRoles = [
  // Management
  { id: "role_mgmt_ceo", name: "CEO", department: "Management" },
  { id: "role_mgmt_md", name: "Managing Director", department: "Management" },
  { id: "role_mgmt_coo", name: "COO", department: "Management" },
  { id: "role_mgmt_cto", name: "CTO", department: "Management" },
  { id: "role_mgmt_cfo", name: "CFO", department: "Management" },
  { id: "role_mgmt_cio", name: "CIO", department: "Management" },
  { id: "role_mgmt_vp", name: "VP", department: "Management" },
  { id: "role_mgmt_gm", name: "General Manager", department: "Management" },
  { id: "role_mgmt_bh", name: "Business Head", department: "Management" },

  // HR
  { id: "role_hr_exec", name: "HR Executive", department: "Human Resources (HR)" },
  { id: "role_hr_recruiter", name: "HR Recruiter", department: "Human Resources (HR)" },
  { id: "role_hr_generalist", name: "HR Generalist", department: "Human Resources (HR)" },
  { id: "role_hr_mgr", name: "HR Manager", department: "Human Resources (HR)" },
  { id: "role_hr_bp", name: "HR Business Partner", department: "Human Resources (HR)" },
  { id: "role_hr_payroll", name: "Payroll Executive", department: "Human Resources (HR)" },
  { id: "role_hr_training", name: "Training Executive", department: "Human Resources (HR)" },

  // IT
  { id: "role_it_sw_dev", name: "Software Developer", department: "Information Technology (IT)" },
  { id: "role_it_fe_dev", name: "Frontend Developer", department: "Information Technology (IT)" },
  { id: "role_it_be_dev", name: "Backend Developer", department: "Information Technology (IT)" },
  { id: "role_it_fs_dev", name: "Full Stack Developer", department: "Information Technology (IT)" },
  { id: "role_it_mob_dev", name: "Mobile Developer", department: "Information Technology (IT)" },
  { id: "role_it_qa", name: "QA Tester", department: "Information Technology (IT)" },
  { id: "role_it_devops", name: "DevOps Engineer", department: "Information Technology (IT)" },
  { id: "role_it_sysadmin", name: "System Administrator", department: "Information Technology (IT)" },
  { id: "role_it_network", name: "Network Engineer", department: "Information Technology (IT)" },
  { id: "role_it_dba", name: "Database Administrator", department: "Information Technology (IT)" },
  { id: "role_it_support", name: "IT Support Engineer", department: "Information Technology (IT)" },
  { id: "role_it_security", name: "Cyber Security Analyst", department: "Information Technology (IT)" },
  { id: "role_it_uiux", name: "UI/UX Designer", department: "Information Technology (IT)" },

  // Sales
  { id: "role_sales_exec", name: "Sales Executive", department: "Sales" },
  { id: "role_sales_rep", name: "Sales Representative", department: "Sales" },
  { id: "role_sales_mgr", name: "Sales Manager", department: "Sales" },
  { id: "role_sales_asm", name: "Area Sales Manager", department: "Sales" },
  { id: "role_sales_rsm", name: "Regional Sales Manager", department: "Sales" },
  { id: "role_sales_bde", name: "Business Development Executive (BDE)", department: "Sales" },
  { id: "role_sales_bdm", name: "Business Development Manager (BDM)", department: "Sales" },
  { id: "role_sales_kam", name: "Key Account Manager", department: "Sales" },

  // Marketing
  { id: "role_mktg_exec", name: "Marketing Executive", department: "Marketing" },
  { id: "role_mktg_digital", name: "Digital Marketing Executive", department: "Marketing" },
  { id: "role_mktg_seo", name: "SEO Executive", department: "Marketing" },
  { id: "role_mktg_sem", name: "SEM Specialist", department: "Marketing" },
  { id: "role_mktg_social", name: "Social Media Manager", department: "Marketing" },
  { id: "role_mktg_writer", name: "Content Writer", department: "Marketing" },
  { id: "role_mktg_designer", name: "Graphic Designer", department: "Marketing" },
  { id: "role_mktg_brand", name: "Brand Manager", department: "Marketing" },
  { id: "role_mktg_mgr", name: "Marketing Manager", department: "Marketing" },

  // Accounts
  { id: "role_accts_assistant", name: "Accounts Assistant", department: "Accounts" },
  { id: "role_accts_exec", name: "Accounts Executive", department: "Accounts" },
  { id: "role_accts_sr", name: "Senior Accountant", department: "Accounts" },
  { id: "role_accts_billing", name: "Billing Executive", department: "Accounts" },
  { id: "role_accts_gst", name: "GST Executive", department: "Accounts" },
  { id: "role_accts_audit", name: "Audit Executive", department: "Accounts" },

  // Admin
  { id: "role_admin_exec", name: "Admin Executive", department: "Administration (Admin)" },
  { id: "role_admin_office_admin", name: "Office Administrator", department: "Administration (Admin)" },
  { id: "role_admin_office_mgr", name: "Office Manager", department: "Administration (Admin)" },
  { id: "role_admin_facility", name: "Facility Manager", department: "Administration (Admin)" },
  { id: "role_admin_receptionist", name: "Receptionist", department: "Administration (Admin)" },

  // Operations
  { id: "role_ops_exec", name: "Operation Executive", department: "Operations" },
  { id: "role_ops_coordinator", name: "Operation Coordinator", department: "Operations" },
  { id: "role_ops_mgr", name: "Operation Manager", department: "Operations" },
  { id: "role_ops_process", name: "Process Manager", department: "Operations" },
  { id: "role_ops_logistics", name: "Logistics Coordinator", department: "Operations" },

  // Customer Support
  { id: "role_support_exec", name: "Customer Support Executive", department: "Customer Support" },
  { id: "role_support_success", name: "Customer Success Executive", department: "Customer Support" },
  { id: "role_support_crm", name: "Customer Relationship Manager (CRM)", department: "Customer Support" },
  { id: "role_support_helpdesk", name: "Helpdesk Executive", department: "Customer Support" },
  { id: "role_support_tech", name: "Technical Support Engineer", department: "Customer Support" },

  // Legal
  { id: "role_legal_exec", name: "Legal Executive", department: "Legal" },
  { id: "role_legal_advisor", name: "Legal Advisor", department: "Legal" },
  { id: "role_legal_compliance", name: "Compliance Officer", department: "Legal" },
  { id: "role_legal_lawyer", name: "Corporate Lawyer", department: "Legal" },
  { id: "role_legal_mgr", name: "Legal Manager", department: "Legal" },

  // Data Entry
  { id: "role_data_operator", name: "Data Entry Operator", department: "Data Entry" },
  { id: "role_data_doc_exec", name: "Documentation Executive", department: "Data Entry" },
  { id: "role_data_mis", name: "MIS Executive", department: "Data Entry" },
  { id: "role_data_processing", name: "Data Processing Executive", department: "Data Entry" },

  // Business Analyst
  { id: "role_ba_ba", name: "Business Analyst", department: "Business Analyst" },
  { id: "role_ba_sr", name: "Senior Business Analyst", department: "Business Analyst" },
  { id: "role_ba_product", name: "Product Analyst", department: "Business Analyst" },
];

export async function GET(req: Request) {
  try {
    await sequelize.authenticate();
    await Role.sync({ alter: true });

    // Seed default roles if they do not exist
    for (const dr of defaultRoles) {
      const exists = await Role.findOne({
        where: {
          name: dr.name,
          department: dr.department
        }
      });
      if (!exists) {
        await Role.create({
          id: dr.id,
          name: dr.name,
          department: dr.department,
          status: "active",
          companies: [],
          permissions: ["read", "write"]
        });
      }
    }

    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get("companyId");
    const companyName = searchParams.get("companyName");

    let targetCompanyId = companyId;

    if (!targetCompanyId && companyName) {
      const trimName = companyName.trim().toLowerCase();
      const allCompanies = await Company.findAll({ where: { status: "active" }, raw: true });
      const matchedComp = allCompanies.find((c: any) => {
        const dbName = c.name.toLowerCase();
        const dbCode = (c.code || "").toLowerCase();
        
        // Handle acolyte/startupkare/startupflora/force/citiline/cfi
        if (trimName.includes("acolyte") || dbName.includes("acolyte")) {
          return dbName.includes("acolyte") || dbCode.includes("acolyte");
        }
        if (trimName.includes("kare") || dbName.includes("kare")) {
          return dbName.includes("kare") || dbCode.includes("kare");
        }
        if (trimName.includes("flora") || dbName.includes("flora")) {
          return dbName.includes("flora") || dbCode.includes("flora");
        }
        if (trimName.includes("force") || dbName.includes("force") || trimName.includes("009") || dbName.includes("009")) {
          return dbName.includes("force") || dbName.includes("009");
        }
        if (trimName.includes("citiline") || dbName.includes("citiline")) {
          return dbName.includes("citiline") || dbCode.includes("citiline");
        }
        if (trimName === "cfi" || dbName === "cfi" || dbCode === "cfi") {
          return dbName.includes("cfi") || dbCode.includes("cfi");
        }
        return dbName.includes(trimName) || trimName.includes(dbName);
      });
      if (matchedComp) {
        targetCompanyId = matchedComp.id || (matchedComp as any).id;
      }
    }

    // Default global roles query
    const roles = await Role.findAll({ 
      where: { status: "active" },
      order: [['name', 'ASC']],
      raw: true
    });

    const filteredRoles = roles.filter((r: any) => {
      let comps = r.companies;
      if (typeof comps === 'string') {
        try { comps = JSON.parse(comps); } catch(e) { comps = []; }
      }
      if (!Array.isArray(comps)) comps = [];

      if (targetCompanyId && comps.some((id: any) => id.toString() === targetCompanyId.toString())) {
        return true;
      }
      if (comps.length === 0) {
        return true; // Return global roles for everyone!
      }
      return false;
    });

    return NextResponse.json({ success: true, data: filteredRoles });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await sequelize.authenticate();
    await Role.sync({ alter: true });
    const body = await req.json();
    const { name, companyName, companyId, department } = body;

    if (!name) {
      return NextResponse.json({ success: false, error: "Role name is required" }, { status: 400 });
    }

    let targetCompanyId = companyId;

    if (!targetCompanyId && companyName) {
      const trimName = companyName.trim().toLowerCase();
      const allCompanies = await Company.findAll({ where: { status: "active" }, raw: true });
      const matchedComp = allCompanies.find((c: any) => {
        const dbName = c.name.toLowerCase();
        const dbCode = (c.code || "").toLowerCase();
        
        if (trimName.includes("acolyte") || dbName.includes("acolyte")) {
          return dbName.includes("acolyte") || dbCode.includes("acolyte");
        }
        if (trimName.includes("kare") || dbName.includes("kare")) {
          return dbName.includes("kare") || dbCode.includes("kare");
        }
        if (trimName.includes("flora") || dbName.includes("flora")) {
          return dbName.includes("flora") || dbCode.includes("flora");
        }
        if (trimName.includes("force") || dbName.includes("force") || trimName.includes("009") || dbName.includes("009")) {
          return dbName.includes("force") || dbName.includes("009");
        }
        if (trimName.includes("citiline") || dbName.includes("citiline")) {
          return dbName.includes("citiline") || dbCode.includes("citiline");
        }
        if (trimName === "cfi" || dbName === "cfi" || dbCode === "cfi") {
          return dbName.includes("cfi") || dbCode.includes("cfi");
        }
        return dbName.includes(trimName) || trimName.includes(dbName);
      });
      if (matchedComp) {
        targetCompanyId = matchedComp.id || (matchedComp as any).id;
      }
    }

    // Ensure department exists in Department table
    if (department) {
      const deptName = department.trim();
      const existingDept = await Department.findOne({
        where: {
          name: deptName,
          company: targetCompanyId || null
        }
      });
      if (!existingDept) {
        await Department.create({
          id: Date.now().toString() + "DEPT",
          name: deptName,
          company: targetCompanyId || null,
          status: "active"
        });
      }
    }

    // Check if role already exists for this department (case insensitive)
    let existingRole = await Role.findOne({ 
      where: {
        name: name.trim(),
        department: department ? department.trim() : null
      }
    });

    if (existingRole) {
      if (targetCompanyId) {
        let comps = existingRole.companies;
        if (typeof comps === 'string') {
          try { comps = JSON.parse(comps); } catch(e) { comps = []; }
        }
        if (!Array.isArray(comps)) comps = [];

        if (!comps.some((id: any) => id.toString() === targetCompanyId.toString())) {
          comps.push(targetCompanyId);
          existingRole.companies = comps;
          await existingRole.save();
        }
      }
      return NextResponse.json({ success: true, data: existingRole });
    }

    const newRole = await Role.create({
      id: Date.now().toString(),
      name: name.trim(),
      department: department ? department.trim() : null,
      permissions: ["read", "write"],
      status: "active",
      companies: targetCompanyId ? [targetCompanyId] : []
    });

    return NextResponse.json({ success: true, data: newRole });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
