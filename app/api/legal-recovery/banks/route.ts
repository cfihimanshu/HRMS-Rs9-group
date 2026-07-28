import { NextResponse } from "next/server";
import BankMaster from "@/models/sequelize/BankMaster";
import sequelize, { safeAuthenticate } from "@/lib/sequelize";

export async function GET() {
  try {
    const isDbConnected = await safeAuthenticate(4000);
    if (!isDbConnected) {
      return NextResponse.json({ success: true, data: [] });
    }

    try {
      await BankMaster.sync();
    } catch (sErr) {
      console.warn("BankMaster sync warning:", sErr);
    }
    
    const banks = await BankMaster.findAll({
      order: [["bankName", "ASC"]],
    });
    return NextResponse.json({ success: true, data: banks });
  } catch (error: any) {
    console.error("GET /api/legal-recovery/banks error:", error);
    return NextResponse.json({ success: true, data: [], error: error.message });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const isDbConnected = await safeAuthenticate(6000);
    if (!isDbConnected) {
      return NextResponse.json({ success: false, error: "Database connection timeout" }, { status: 503 });
    }

    try {
      await BankMaster.sync();
    } catch (sErr) {
      console.warn("BankMaster sync warning:", sErr);
    }
    
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

export async function PUT(request: Request) {
  try {
    const data = await request.json();
    const isDbConnected = await safeAuthenticate(6000);
    if (!isDbConnected) {
      return NextResponse.json({ success: false, error: "Database connection timeout" }, { status: 503 });
    }

    const bankItem = await BankMaster.findByPk(data.id);
    if (!bankItem) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    
    await bankItem.update(data);
    return NextResponse.json({ success: true, data: bankItem });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ success: false, error: "ID is required" }, { status: 400 });

    const isDbConnected = await safeAuthenticate(6000);
    if (!isDbConnected) {
      return NextResponse.json({ success: false, error: "Database connection timeout" }, { status: 503 });
    }

    const bankItem = await BankMaster.findByPk(id);
    if (!bankItem) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });

    await bankItem.destroy();
    return NextResponse.json({ success: true, message: "Deleted successfully" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
