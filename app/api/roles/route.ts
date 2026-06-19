import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Role from "@/models/Role";
import Company from "@/models/Company";

export async function GET(req: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get("companyId");
    const companyName = searchParams.get("companyName");

    let targetCompanyId = companyId;

    if (!targetCompanyId && companyName) {
      const trimName = companyName.trim().toLowerCase();
      const allCompanies = await Company.find({ status: "active" });
      const matchedComp = allCompanies.find(c => {
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
        targetCompanyId = matchedComp._id.toString();
      }
    }

    // Default global roles query
    let query: any = {
      status: "active",
      $or: [
        { companies: { $size: 0 } },
        { companies: { $exists: false } }
      ]
    };

    if (targetCompanyId) {
      query.$or.push({ companies: targetCompanyId });
    }

    // Fetch matching roles
    const roles = await Role.find(query).sort({ name: 1 });
    
    // Filter out unwanted roles (like DSM, RIBP, RIBP / Risk Officer, Franchisee, Business Associate)
    // ONLY keep global roles if they are part of the core 7 or company-mapped.
    const allowedCoreRoles = [
      "Employee", "HR Head", "HR Executive", "Department Manager",
      "Trainer", "Accounts", "IT Admin"
    ];

    const filteredRoles = roles.filter((r: any) => {
      // If it has companies mapping, it is custom, so allow it!
      if (r.companies && r.companies.length > 0) return true;
      // If it is a global role, check if it's one of the core 7 roles
      return allowedCoreRoles.includes(r.name);
    });

    return NextResponse.json({ success: true, data: filteredRoles });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await dbConnect();
    const body = await req.json();
    const { name, companyName, companyId } = body;

    if (!name) {
      return NextResponse.json({ success: false, error: "Role name is required" }, { status: 400 });
    }

    let targetCompanyId = companyId;

    if (!targetCompanyId && companyName) {
      const trimName = companyName.trim().toLowerCase();
      const allCompanies = await Company.find({ status: "active" });
      const matchedComp = allCompanies.find(c => {
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
        targetCompanyId = matchedComp._id.toString();
      }
    }

    if (!targetCompanyId) {
      return NextResponse.json({ success: false, error: "Valid Company is required to map the custom role" }, { status: 400 });
    }

    // Check if role already exists globally or for this company
    let existingRole = await Role.findOne({ name: { $regex: new RegExp(`^${name.trim()}$`, "i") } });
    if (existingRole) {
      // Add company mapping if not already present
      if (!existingRole.companies) {
        existingRole.companies = [];
      }
      if (!existingRole.companies.some((id: any) => id.toString() === targetCompanyId.toString())) {
        existingRole.companies.push(targetCompanyId);
        await existingRole.save();
      }
      return NextResponse.json({ success: true, data: existingRole });
    }

    const newRole = await Role.create({
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
