import { NextResponse } from "next/server";
import LegalNotice from "@/models/sequelize/LegalNotice";
import LegalNoticeType from "@/models/sequelize/LegalNoticeType";
import sequelize, { safeAuthenticate } from "@/lib/sequelize";
import { requireApiSession, MANAGEMENT_ROLES } from "@/lib/apiAuth";

export async function GET() {
  try {
    const auth = await requireApiSession();
    if (auth.response) return auth.response;
    const isDbConnected = await safeAuthenticate(4000);
    if (!isDbConnected) {
      return NextResponse.json({ success: true, data: [] });
    }

    try {
      await LegalNoticeType.sync();
      await LegalNotice.sync();
    } catch (sErr) {
      console.warn("LegalNotice sync warning:", sErr);
    }

    const notices = await LegalNotice.findAll({
      order: [["createdAt", "DESC"]],
    });

    return NextResponse.json({ success: true, data: notices });
  } catch (error: any) {
    console.error("GET /api/legal-recovery/notices error:", error);
    return NextResponse.json({ success: true, data: [], error: error.message });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireApiSession();
    if (auth.response) return auth.response;
    const data = await request.json();
    const isDbConnected = await safeAuthenticate(6000);
    if (!isDbConnected) {
      return NextResponse.json({ success: false, error: "Database connection timeout" }, { status: 503 });
    }

    try {
      await LegalNoticeType.sync();
      await LegalNotice.sync();
    } catch (sErr) {
      console.warn("LegalNotice sync warning:", sErr);
    }

    let { noticeTypeId, noticeType, ...noticeData } = data;

    if (!noticeTypeId && noticeType && noticeType.trim()) {
      const [ntRecord] = await LegalNoticeType.findOrCreate({
        where: { name: noticeType.trim() },
        defaults: { name: noticeType.trim(), isActive: true }
      });
      noticeTypeId = ntRecord.id;
    }

    const newNotice = await LegalNotice.create({
      ...noticeData,
      noticeTypeId: noticeTypeId || null,
      typeOfNotice: noticeType || noticeData.typeOfNotice || "Advocate Notice"
    });

    return NextResponse.json({ success: true, data: newNotice });
  } catch (error: any) {
    console.error("Legal Notice POST Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const auth = await requireApiSession(MANAGEMENT_ROLES);
    if (auth.response) return auth.response;
    const data = await request.json();
    const isDbConnected = await safeAuthenticate(6000);
    if (!isDbConnected) {
      return NextResponse.json({ success: false, error: "Database connection timeout" }, { status: 503 });
    }
    
    const noticeItem = await LegalNotice.findByPk(data.id);
    if (!noticeItem) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    
    await noticeItem.update(data);
    return NextResponse.json({ success: true, data: noticeItem });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const auth = await requireApiSession(MANAGEMENT_ROLES);
    if (auth.response) return auth.response;
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ success: false, error: "ID is required" }, { status: 400 });

    const isDbConnected = await safeAuthenticate(6000);
    if (!isDbConnected) {
      return NextResponse.json({ success: false, error: "Database connection timeout" }, { status: 503 });
    }

    const noticeItem = await LegalNotice.findByPk(id);
    if (!noticeItem) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });

    await noticeItem.destroy();
    return NextResponse.json({ success: true, message: "Deleted successfully" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
