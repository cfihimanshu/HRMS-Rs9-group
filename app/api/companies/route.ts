import { NextResponse } from "next/server";
import sequelize from "@/lib/sequelize";
import Company from "@/models/sequelize/Company";

export async function GET() {
  try {
    await sequelize.authenticate();
    
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
    const body = await req.json();
    const { name, code, address } = body;
    if (!name || !code) {
      return NextResponse.json({ success: false, error: "Missing required fields: name, code" }, { status: 400 });
    }
    const newCompany = await Company.create({
      id: Date.now().toString(),
      name,
      code: code.toUpperCase(),
      address: address || "",
      status: "active"
    });
    return NextResponse.json({ success: true, data: newCompany });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
