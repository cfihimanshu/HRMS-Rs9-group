import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Company from "@/models/Company";
import EmployeeProfile from "@/models/EmployeeProfile";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get("companyId");

    if (!companyId) {
      return NextResponse.json({ success: false, error: "companyId is required" }, { status: 400 });
    }

    const company = await Company.findById(companyId);
    if (!company) {
      return NextResponse.json({ success: false, error: "Company not found" }, { status: 404 });
    }

    const getCompanyPrefix = (name: string) => {
      const clean = name.replace(/[^a-zA-Z]/g, "").toUpperCase();
      if (clean.startsWith("STARTUPKARE")) return "STK";
      if (clean.startsWith("STARTUPFLORA")) return "STA";
      if (clean.startsWith("FORCE")) return "FOR";
      return clean.substring(0, 3).padEnd(3, "X");
    };

    const prefix = getCompanyPrefix(company.name);
    
    // Find all profiles matching the prefix pattern e.g., CFI-001
    const regex = new RegExp(`^${prefix}-\\d+$`, 'i');
    const profiles = await EmployeeProfile.find({ employeeId: regex });

    let maxNum = 0;
    profiles.forEach(p => {
      const parts = p.employeeId.split("-");
      if (parts.length === 2) {
        const num = parseInt(parts[1], 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
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
