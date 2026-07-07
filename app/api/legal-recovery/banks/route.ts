import { NextResponse } from "next/server";
import BankMaster from "@/models/sequelize/BankMaster";
import sequelize from "@/lib/sequelize";

export async function GET() {
  try {
    await sequelize.authenticate();
    await BankMaster.sync({ alter: true });
    
    const banks = await BankMaster.findAll({
      order: [["bankName", "ASC"]],
    });
    return NextResponse.json({ success: true, data: banks });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    await sequelize.authenticate();
    await BankMaster.sync({ alter: true });
    
    // Use provided bankCode or auto-generate
    let finalBankCode = data.bankCode;
    if (!finalBankCode) {
      const words = data.bankName.split(/\s+/).filter((w: string) => !['of', 'and', 'the', 'in'].includes(w.toLowerCase()));
      let baseCode = "";
      if (words.length === 1) {
        baseCode = words[0].substring(0, 3).toUpperCase();
      } else {
        baseCode = words.map((w: string) => w[0]).join('').substring(0, 4).toUpperCase();
      }
      const count = await BankMaster.count();
      finalBankCode = `${baseCode}${String(count + 1).padStart(3, '0')}`;
    }
    
    const newBank = await BankMaster.create({
      ...data,
      bankCode: finalBankCode
    });
    
    return NextResponse.json({ success: true, data: newBank });
  } catch (error: any) {
    console.error("Bank POST Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
