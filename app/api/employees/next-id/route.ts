import { NextResponse } from "next/server";
import sequelize from "@/lib/sequelize";
import Company from "@/models/sequelize/Company";
import EmployeeProfile from "@/models/sequelize/EmployeeProfile";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Op } from "sequelize";

export async function GET(req: Request) {
  try {
    await sequelize.authenticate();
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get("companyId");

    if (!companyId) {
      return NextResponse.json({ success: false, error: "companyId is required" }, { status: 400 });
    }

    const company = await Company.findByPk(companyId);
    if (!company) {
      return NextResponse.json({ success: false, error: "Company not found" }, { status: 404 });
    }

    const getCompanyPrefix = (name: string) => {
      const upper = name.toUpperCase();
      if (upper.includes("CFI") || upper.includes("CHARTERED")) return "CFI";
      if (upper.includes("RAA") || upper.includes("RUKSANA")) return "RAA";
      if (upper.includes("CTPL") || upper.includes("CITILINE")) return "CTP";
      if (upper.includes("ATPL") || upper.includes("ACOLYTE")) return "ATP";
      if (upper.includes("RNPL") || upper.includes("RUHAN")) return "RNP";
      if (upper.includes("MVPL") || upper.includes("MAVICS")) return "MVP";
      return name.replace(/[^a-zA-Z]/g, "").substring(0, 3).toUpperCase().padEnd(3, "X");
    };

    const prefix = getCompanyPrefix(company.name);
    
    const profiles = await EmployeeProfile.findAll({ 
      where: { 
        employeeId: {
          [Op.like]: `${prefix}-%`
        }
      } 
    });

    let maxNum = 0;
    profiles.forEach(p => {
      if (p.employeeId) {
        const parts = p.employeeId.split("-");
        if (parts.length === 2 && parts[0].toUpperCase() === prefix.toUpperCase()) {
          const num = parseInt(parts[1], 10);
          if (!isNaN(num) && num > maxNum) {
            maxNum = num;
          }
        }
      }
    });

    const nextNum = maxNum + 1;
    const nextId = `${prefix}-${String(nextNum).padStart(3, "0")}`;

    return NextResponse.json({ success: true, employeeId: nextId });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
