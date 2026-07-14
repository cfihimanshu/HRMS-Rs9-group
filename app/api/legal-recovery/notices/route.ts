import { NextResponse } from "next/server";
import LegalNotice from "@/models/sequelize/LegalNotice";
import LegalNoticeType from "@/models/sequelize/LegalNoticeType";
import sequelize from "@/lib/sequelize";

export async function GET() {
  try {
    await sequelize.authenticate();
    await LegalNoticeType.sync({ alter: true });
    await LegalNotice.sync({ alter: true });

    const notices = await LegalNotice.findAll({
      order: [["createdAt", "DESC"]],
    });

    return NextResponse.json({ success: true, data: notices });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    await sequelize.authenticate();
    await LegalNoticeType.sync({ alter: true });
    await LegalNotice.sync({ alter: true });

    let { noticeTypeId, noticeType, ...noticeData } = data;

    // Dynamic on-the-fly creation if noticeType name string is given, but no ID
    if (!noticeTypeId && noticeType && noticeType.trim()) {
      const [ntRecord] = await LegalNoticeType.findOrCreate({
        where: { name: noticeType.trim() },
        defaults: { name: noticeType.trim(), isActive: true }
      });
      noticeTypeId = ntRecord.id;
    }

    const newNotice = await LegalNotice.create({
      ...noticeData,
      noticeType,
      noticeTypeId
    });

    return NextResponse.json({ success: true, data: newNotice });
  } catch (error: any) {
    console.error("Notice POST Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const data = await request.json();
    const { id, ...updateData } = data;
    if (!id) {
      return NextResponse.json({ success: false, error: "Missing ID" }, { status: 400 });
    }

    await sequelize.authenticate();
    await LegalNoticeType.sync({ alter: true });
    await LegalNotice.sync({ alter: true });

    const notice = await LegalNotice.findByPk(id);
    if (!notice) {
      return NextResponse.json({ success: false, error: "Notice not found" }, { status: 404 });
    }

    let { noticeTypeId, noticeType, ...otherUpdateData } = updateData;

    // Dynamic on-the-fly creation if noticeType name string is given, but no ID
    if (!noticeTypeId && noticeType && noticeType.trim()) {
      const [ntRecord] = await LegalNoticeType.findOrCreate({
        where: { name: noticeType.trim() },
        defaults: { name: noticeType.trim(), isActive: true }
      });
      noticeTypeId = ntRecord.id;
    }

    await notice.update({
      ...otherUpdateData,
      noticeType,
      noticeTypeId
    });

    return NextResponse.json({ success: true, data: notice });
  } catch (error: any) {
    console.error("Notice PUT Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ success: false, error: "Missing ID" }, { status: 400 });
    }

    await sequelize.authenticate();
    await LegalNoticeType.sync({ alter: true });
    await LegalNotice.sync({ alter: true });

    const notice = await LegalNotice.findByPk(id);
    if (!notice) {
      return NextResponse.json({ success: false, error: "Notice not found" }, { status: 404 });
    }

    await notice.destroy();
    return NextResponse.json({ success: true, message: "Notice deleted successfully" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
