import { NextResponse } from "next/server";
import sequelize, { safeAuthenticate } from "@/lib/sequelize";
import Company from "@/models/sequelize/Company";

const DEFAULT_COMPANIES = [
  { id: "comp_rs9_global", name: "RS9 Global", code: "RS9", address: "Corporate Headquarters", status: "active" },
  { id: "comp_cfi", name: "CFI", code: "CFI", address: "Capital Financial Inclusion", status: "active" },
  { id: "comp_raa", name: "RAA", code: "RAA", address: "RAA Enterprises", status: "active" },
  { id: "comp_acpl", name: "ACPL", code: "ACPL", address: "ACPL Pvt Ltd", status: "active" },
  { id: "comp_ctpl", name: "CTPL", code: "CTPL", address: "CTPL Pvt Ltd", status: "active" },
  { id: "comp_startupflora", name: "Startupflora", code: "STF", address: "Startupflora Business Hub", status: "active" },
  { id: "comp_sk", name: "SK", code: "SK", address: "SK Operations", status: "active" },
  { id: "comp_rnpl", name: "RNPL", code: "RNPL", address: "RNPL Group", status: "active" },
  { id: "comp_force009", name: "Force009", code: "F009", address: "Force009 Security & Operations", status: "active" },
  { id: "comp_channel009", name: "Channel009", code: "C009", address: "Channel009 Media Network", status: "active" }
];

let isCompanySeeded = false;

async function seedDefaultCompanies() {
  if (isCompanySeeded) return;
  try {
    await Company.sync();
    for (const item of DEFAULT_COMPANIES) {
      const exists = await Company.findOne({
        where: { code: item.code }
      });
      if (!exists) {
        await Company.create(item);
      }
    }
    isCompanySeeded = true;
  } catch (err) {
    console.error("Error seeding default companies:", err);
  }
}

export async function GET() {
  try {
    const isDbConnected = await safeAuthenticate(4000);
    if (!isDbConnected) {
      return NextResponse.json({ success: true, data: DEFAULT_COMPANIES });
    }

    await seedDefaultCompanies();

    const companies = await Company.findAll({
      where: { status: "active" },
      order: [["name", "ASC"]],
    });
    return NextResponse.json({ success: true, data: companies });
  } catch (error: any) {
    console.error("GET /api/companies error:", error);
    return NextResponse.json({ success: true, data: DEFAULT_COMPANIES });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const isDbConnected = await safeAuthenticate(6000);
    if (!isDbConnected) {
      return NextResponse.json({ success: false, error: "Database connection timeout" }, { status: 503 });
    }

    await Company.sync();
    const company = await Company.create(data);
    return NextResponse.json({ success: true, data: company });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
