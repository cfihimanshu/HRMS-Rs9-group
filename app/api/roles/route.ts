import { NextResponse } from "next/server";
import sequelize from "@/lib/sequelize";
import Role from "@/models/sequelize/Role";
import Company from "@/models/sequelize/Company";
import { Op } from "sequelize";

export async function GET(req: Request) {
  try {
    await sequelize.authenticate();
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

    const allowedCoreRoles = [
      "Employee", "HR Head", "HR Executive", "Department Manager",
      "Trainer", "Accounts", "IT Admin"
    ];

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
        return allowedCoreRoles.includes(r.name);
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
    const body = await req.json();
    const { name, companyName, companyId } = body;

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

    if (!targetCompanyId) {
      return NextResponse.json({ success: false, error: "Valid Company is required to map the custom role" }, { status: 400 });
    }

    // Check if role already exists globally or for this company (case insensitive)
    let existingRole = await Role.findOne({ 
      where: sequelize.where(
        sequelize.fn('lower', sequelize.col('name')),
        name.trim().toLowerCase()
      )
    });

    if (existingRole) {
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
      return NextResponse.json({ success: true, data: existingRole });
    }

    const newRole = await Role.create({
      id: Date.now().toString(),
      name: name.trim(),
      permissions: ["read", "write"],
      status: "active",
      companies: [targetCompanyId]
    });

    return NextResponse.json({ success: true, data: newRole });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
