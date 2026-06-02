import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Company from "@/models/Company";

const SEED_COMPANIES = [
  { name: "Acolyte Group of Companies", code: "ACOLYTE" },
  { name: "Startupflora", code: "STARTUPFLORA" },
  { name: "Startupkare", code: "STARTUPKARE" },
  { name: "Force 009", code: "FORCE009" },
  { name: "Citiline Technologies", code: "CITILINE" },
  { name: "CFI", code: "CFI" }
];

export async function GET() {
  try {
    await dbConnect();
    
    // Seed companies if they don't exist
    for (const sc of SEED_COMPANIES) {
      const exists = await Company.findOne({ 
        $or: [
          { name: sc.name },
          { code: sc.code }
        ] 
      });
      if (!exists) {
        await Company.create({
          name: sc.name,
          code: sc.code,
          status: "active"
        });
      }
    }

    const companies = await Company.find({ status: "active" }).sort({ name: 1 });
    return NextResponse.json({ success: true, data: companies });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
