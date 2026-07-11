import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import sequelize from "@/lib/sequelize";
import BankMaster from "@/models/sequelize/BankMaster";

function generateBankPrefix(bankName: string): string {
  const ignoreWords = ["of", "and", "the", "for", "in", "on", "at", "to", "by"];
  const words = bankName
    .split(/\s+/)
    .map(w => w.replace(/[^a-zA-Z]/g, ""))
    .filter(w => w.length > 0 && !ignoreWords.includes(w.toLowerCase()));

  if (words.length >= 2) {
    return words.map(w => w.charAt(0).toUpperCase()).join("");
  } else if (words.length === 1) {
    const singleWord = words[0];
    if (singleWord.length >= 3) {
      return singleWord.substring(0, 3).toUpperCase();
    }
    return singleWord.toUpperCase().padEnd(3, "B");
  }
  return "BNK";
}


// GET /api/banks - Fetch all bank master records
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    await sequelize.authenticate();
    try {
      await BankMaster.sync({ alter: true });
    } catch (syncErr: any) {
      console.error("Error syncing BankMaster table:", syncErr);
    }

    const records = await BankMaster.findAll({
      order: [["bankName", "ASC"]],
    });

    return NextResponse.json({ success: true, data: records });
  } catch (error: any) {
    console.error("[/api/banks GET] Error:", error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST /api/banks - Add a new bank master record
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { bankName } = body;

    if (!bankName || !bankName.trim()) {
      return NextResponse.json({ success: false, error: "Bank name is required" }, { status: 400 });
    }

    await sequelize.authenticate();
    try {
      await BankMaster.sync({ alter: true });
    } catch (syncErr: any) {
      console.error("Error syncing BankMaster table:", syncErr);
    }

    // Check if bank name already exists (case-insensitive check)
    const existing = await BankMaster.findOne({
      where: {
        bankName: bankName.trim()
      }
    });

    if (existing) {
      return NextResponse.json({ success: false, error: "Bank name already exists" }, { status: 400 });
    }

    const count = await BankMaster.count();
    const nextNum = count + 1;
    const prefix = generateBankPrefix(bankName);
    const customId = `${prefix}-${String(nextNum).padStart(3, "0")}`;

    const record = await BankMaster.create({
      id: customId,
      bankName: bankName.trim(),
    });

    return NextResponse.json({ success: true, data: record, message: "Bank master record created successfully" });
  } catch (error: any) {
    console.error("[/api/banks POST] Error:", error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE /api/banks - Delete a bank master record
export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, error: "Missing bank id" }, { status: 400 });
    }

    await sequelize.authenticate();
    const record = await BankMaster.findByPk(id);
    if (!record) {
      return NextResponse.json({ success: false, error: "Bank master record not found" }, { status: 404 });
    }

    await record.destroy();

    return NextResponse.json({ success: true, message: "Bank master record deleted successfully" });
  } catch (error: any) {
    console.error("[/api/banks DELETE] Error:", error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

