import { NextResponse } from "next/server";
import LegalRecoveryMaster from "@/models/sequelize/LegalRecoveryMaster";
import sequelize, { safeAuthenticate } from "@/lib/sequelize";

// GET all cases
export async function GET() {
  try {
    const isDbConnected = await safeAuthenticate(4000);
    if (!isDbConnected) {
      return NextResponse.json({ success: true, data: [] });
    }

    try {
      await LegalRecoveryMaster.sync();
    } catch (sErr) {
      console.warn("LegalRecoveryMaster sync warning:", sErr);
    }

    const cases = await LegalRecoveryMaster.findAll({
      order: [["createdAt", "DESC"]],
    });
    return NextResponse.json({ success: true, data: cases });
  } catch (error: any) {
    console.error("GET /api/legal-recovery error:", error);
    return NextResponse.json({ success: true, data: [], error: error.message });
  }
}

// POST a new case
export async function POST(request: Request) {
  try {
    const data = await request.json();
    const isDbConnected = await safeAuthenticate(6000);
    if (!isDbConnected) {
      return NextResponse.json({ success: false, error: "Database connection timeout" }, { status: 503 });
    }

    await LegalRecoveryMaster.sync();
    const newCase = await LegalRecoveryMaster.create(data);
    return NextResponse.json({ success: true, data: newCase });
  } catch (error: any) {
    console.error("Legal Recovery POST Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT (Edit) a case
export async function PUT(request: Request) {
  try {
    const data = await request.json();
    const isDbConnected = await safeAuthenticate(6000);
    if (!isDbConnected) {
      return NextResponse.json({ success: false, error: "Database connection timeout" }, { status: 503 });
    }

    const caseItem = await LegalRecoveryMaster.findByPk(data.id);
    if (!caseItem) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    
    await caseItem.update(data);
    return NextResponse.json({ success: true, data: caseItem });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE a case
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ success: false, error: "ID is required" }, { status: 400 });

    const isDbConnected = await safeAuthenticate(6000);
    if (!isDbConnected) {
      return NextResponse.json({ success: false, error: "Database connection timeout" }, { status: 503 });
    }

    const caseItem = await LegalRecoveryMaster.findByPk(id);
    if (!caseItem) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });

    await caseItem.destroy();
    return NextResponse.json({ success: true, message: "Deleted successfully" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
