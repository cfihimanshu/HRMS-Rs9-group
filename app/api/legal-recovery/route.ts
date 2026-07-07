import { NextResponse } from "next/server";
import LegalRecoveryMaster from "@/models/sequelize/LegalRecoveryMaster";
import sequelize from "@/lib/sequelize";

// GET all cases
export async function GET() {
  try {
    await sequelize.authenticate();
    const cases = await LegalRecoveryMaster.findAll({
      order: [["createdAt", "DESC"]],
    });
    return NextResponse.json({ success: true, data: cases });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST a new case
export async function POST(request: Request) {
  try {
    const data = await request.json();
    await sequelize.authenticate();
    
    // sync model if table doesn't exist
    await LegalRecoveryMaster.sync({ alter: true });
    
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
    await sequelize.authenticate();
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

    await sequelize.authenticate();
    const caseItem = await LegalRecoveryMaster.findByPk(id);
    if (!caseItem) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });

    await caseItem.destroy();
    return NextResponse.json({ success: true, message: "Deleted successfully" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
