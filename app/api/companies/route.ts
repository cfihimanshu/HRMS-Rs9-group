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
