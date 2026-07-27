import { NextResponse } from "next/server";
import sequelize from "@/lib/sequelize";
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

async function seedDefaultCompanies() {
  try {
    await Company.sync({ alter: true });
    for (const item of DEFAULT_COMPANIES) {
      const exists = await Company.findOne({
        where: { code: item.code }
      });
      if (!exists) {
        await Company.create(item);
      }
    }
  } catch (err) {
    console.error("Error seeding default companies:", err);
  }
}

export async function GET() {
  try {
    await sequelize.authenticate();
    await seedDefaultCompanies();

    const companies = await Company.findAll({
      where: { status: "active" },
      order: [['name', 'ASC']]
    });
    return NextResponse.json({ success: true, data: companies });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await sequelize.authenticate();
    await seedDefaultCompanies();

    const body = await req.json();
    const { name, code, address } = body;
    if (!name || !code) {
      return NextResponse.json({ success: false, error: "Missing required fields: name, code" }, { status: 400 });
    }

    const uppercaseCode = code.trim().toUpperCase();
    const existing = await Company.findOne({ where: { code: uppercaseCode } });
    if (existing) {
      if (existing.status !== "active") {
        existing.status = "active";
        await existing.save();
        return NextResponse.json({ success: true, data: existing, message: "Company reactivated" });
      }
      return NextResponse.json({ success: true, data: existing, message: "Company already exists" });
    }

    const newCompany = await Company.create({
      id: "comp_" + Date.now(),
      name: name.trim(),
      code: uppercaseCode,
      address: address || "",
      status: "active"
    });
    return NextResponse.json({ success: true, data: newCompany, message: "Company created successfully" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
