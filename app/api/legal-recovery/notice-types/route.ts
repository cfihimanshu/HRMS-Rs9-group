import { NextResponse } from "next/server";
import LegalNoticeType from "@/models/sequelize/LegalNoticeType";
import sequelize from "@/lib/sequelize";

const DEFAULT_NOTICE_TYPES = [
  "ADVOCATE NOTICE",
  "Branch RECOVERY Notice",
  "PSSA APPLICATION",
  "RACO RODA",
  "SARFEASI NOTICE",
  "SY. POSSESSION",
  "138 notice",
  "Recovery suit file notice",
  "FIR notice",
  "DM ORDER",
  "SP ORDER",
  "PY. POSSESSION",
  "SEIZER Nootice"
];

export async function GET() {
  try {
    await sequelize.authenticate();
    await LegalNoticeType.sync({ alter: true });

    // Auto-seed if empty
    const count = await LegalNoticeType.count();
    if (count === 0) {
      await LegalNoticeType.bulkCreate(
        DEFAULT_NOTICE_TYPES.map(name => ({ name, isActive: true }))
      );
    }

    const noticeTypes = await LegalNoticeType.findAll({
      where: { isActive: true },
      order: [["name", "ASC"]],
    });

    return NextResponse.json({ success: true, data: noticeTypes });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    if (!data.name || !data.name.trim()) {
      return NextResponse.json({ success: false, error: "Name is required" }, { status: 400 });
    }

    await sequelize.authenticate();
    await LegalNoticeType.sync({ alter: true });

    const [newType, created] = await LegalNoticeType.findOrCreate({
      where: { name: data.name.trim() },
      defaults: { name: data.name.trim(), isActive: true }
    });

    if (!created && !newType.isActive) {
      // Re-activate if it was deactivated
      newType.isActive = true;
      await newType.save();
    }

    return NextResponse.json({ success: true, data: newType });
  } catch (error: any) {
    console.error("NoticeType POST Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const data = await request.json();
    const { id, name, isActive } = data;
    if (!id) {
      return NextResponse.json({ success: false, error: "ID is required" }, { status: 400 });
    }

    await sequelize.authenticate();
    await LegalNoticeType.sync({ alter: true });

    const typeRecord = await LegalNoticeType.findByPk(id);
    if (!typeRecord) {
      return NextResponse.json({ success: false, error: "Notice type not found" }, { status: 404 });
    }

    const updates: any = {};
    if (name !== undefined) updates.name = name.trim();
    if (isActive !== undefined) updates.isActive = isActive;

    await typeRecord.update(updates);

    return NextResponse.json({ success: true, data: typeRecord });
  } catch (error: any) {
    console.error("NoticeType PUT Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ success: false, error: "ID is required" }, { status: 400 });
    }

    await sequelize.authenticate();
    await LegalNoticeType.sync({ alter: true });

    const typeRecord = await LegalNoticeType.findByPk(id);
    if (!typeRecord) {
      return NextResponse.json({ success: false, error: "Notice type not found" }, { status: 404 });
    }

    // Soft delete / Deactivate
    typeRecord.isActive = false;
    await typeRecord.save();

    return NextResponse.json({ success: true, message: "Notice type deleted successfully" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
