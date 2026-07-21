import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import sequelize from "@/lib/sequelize";
import LegalCompany from "@/models/sequelize/LegalCompany";

// GET: Fetch all companies
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    try {
      await sequelize.authenticate();
      await LegalCompany.sync();
    } catch (syncErr: any) {
      console.warn("LegalCompany sync warning:", syncErr.message);
    }

    let companies: any[] = [];
    try {
      companies = await LegalCompany.findAll({
        order: [["companyName", "ASC"]],
        raw: true,
      });
    } catch (dbErr: any) {
      console.warn("LegalCompany findAll error:", dbErr.message);
    }

    if (!companies || companies.length === 0) {
      try {
        await LegalCompany.bulkCreate([
          { companyName: "Force009", createdBy: "System" },
          { companyName: "ATPL (Acolyte Technologies Private Limited)", createdBy: "System" },
        ], { ignoreDuplicates: true });
        companies = await LegalCompany.findAll({
          order: [["companyName", "ASC"]],
          raw: true,
        });
      } catch (e: any) {
        console.warn("Company bulk create warning:", e.message);
      }
    }

    return NextResponse.json({ success: true, data: companies || [] });
  } catch (error: any) {
    console.error("[/api/legal-recovery/company GET]", error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Add a new company
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const createdBy = (session.user as any).id || session.user.name;

    try {
      await sequelize.authenticate();
      await LegalCompany.sync();
    } catch (syncErr: any) {
      console.warn("LegalCompany sync warning:", syncErr.message);
    }

    const body = await req.json();
    const { companyName } = body;

    if (!companyName || !companyName.trim()) {
      return NextResponse.json({ success: false, error: "Company name is required" }, { status: 400 });
    }

    const cleanName = companyName.trim();

    // Find or create company
    const [company, created] = await LegalCompany.findOrCreate({
      where: { companyName: cleanName },
      defaults: { companyName: cleanName, createdBy: String(createdBy) },
    });

    return NextResponse.json({ success: true, data: company, created });
  } catch (error: any) {
    console.error("[/api/legal-recovery/company POST]", error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
