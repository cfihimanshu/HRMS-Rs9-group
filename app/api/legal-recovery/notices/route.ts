import { NextResponse } from "next/server";
import LegalNotice from "@/models/sequelize/LegalNotice";
import LegalNoticeType from "@/models/sequelize/LegalNoticeType";
import LegalWorkLog from "@/models/sequelize/LegalWorkLog";
import LegalWorkHistory from "@/models/sequelize/LegalWorkHistory";
import TaskLog from "@/models/sequelize/TaskLog";
import BankMaster from "@/models/sequelize/BankMaster";
import BranchMaster from "@/models/sequelize/BranchMaster";
import sequelize, { safeAuthenticate } from "@/lib/sequelize";
import { requireApiSession, MANAGEMENT_ROLES } from "@/lib/apiAuth";

async function syncNoticesToLogTables() {
  try {
    await LegalWorkLog.sync();
    await LegalWorkHistory.sync();

    const notices = await LegalNotice.findAll();
    const banks = await BankMaster.findAll();
    const branches = await BranchMaster.findAll();

    const bankMap = new Map<string, string>();
    banks.forEach((b: any) => {
      if (b.id !== undefined && b.id !== null) bankMap.set(String(b.id), b.bankName);
    });

    const branchMap = new Map<string, string>();
    branches.forEach((br: any) => {
      if (br.id !== undefined && br.id !== null) branchMap.set(String(br.id), br.branchName || br.branchCode);
      if (br.branchId !== undefined && br.branchId !== null) branchMap.set(String(br.branchId), br.branchName || br.branchCode);
    });

    const existingWorkLogs = await LegalWorkLog.findAll({ attributes: ["id", "remarks"] });
    const existingWorkHistories = await LegalWorkHistory.findAll({ attributes: ["id", "remarks"] });

    for (const n of notices) {
      const resolvedBank = n.bankName || (n.bankId ? bankMap.get(String(n.bankId)) : undefined) || "Bank";
      const resolvedBranch = n.branchName || (n.branchId ? branchMap.get(String(n.branchId)) : undefined) || "Branch";
      const workDateVal = n.noticeDate || n.noticeOrderDate || (n.createdAt ? new Date(n.createdAt).toISOString().split("T")[0] : new Date().toISOString().split("T")[0]);
      const countVal = String(n.quantity || 1);
      const fileVal = n.handoverReceiptUrl || n.documentUrl || undefined;
      const staffVal = n.broughtBy || n.printedBy || n.dispatchedBy || n.createdBy || "Notice Staff";
      const catVal = n.typeOfNotice || "ADVOCATE NOTICE";
      const tag = `[Notice #${n.id}]`;
      const remarkVal = n.handoverRemarks ? `${n.handoverRemarks} ${tag}` : `Notice Board Entry (${catVal}) ${tag}`;

      // 1. Sync into legal_work_logs
      const hasWorkLog = existingWorkLogs.some((l: any) => l.remarks && l.remarks.includes(tag));

      if (!hasWorkLog) {
        try {
          await LegalWorkLog.create({
            masterId: n.masterId || n.id || 0,
            workDate: workDateVal,
            typeOfWork: "Bank Related",
            workLocation: "Office",
            bankName: resolvedBank,
            branchName: resolvedBranch,
            category: "Business Development",
            subCategory: "TAKE NOTICE ASSIGNMENT",
            businessDevOption: catVal,
            businessDevSubOption: "TAKE NOTICE ASSIGNMENT",
            noOfCount: countVal,
            broughtBy: n.broughtBy || undefined,
            preparedBy: n.noticeRenameBy || n.scannedBy || undefined,
            printedBy: n.printedBy || undefined,
            dispatchedBy: n.dispatchedBy || undefined,
            uploadedFileName: fileVal,
            remarks: remarkVal,
            employeeId: staffVal,
            employeeName: staffVal
          });
        } catch (e: any) {
          console.error(`LegalWorkLog create error for Notice #${n.id}:`, e.message);
        }
      }

      // 2. Sync into legal_work_history
      const hasWorkHistory = existingWorkHistories.some((h: any) => h.remarks && h.remarks.includes(tag));

      if (!hasWorkHistory) {
        try {
          await LegalWorkHistory.create({
            masterId: n.masterId || n.id || 0,
            category: catVal,
            subCategory: "TAKE NOTICE ASSIGNMENT",
            bankName: resolvedBank,
            branchName: resolvedBranch,
            employeeId: staffVal,
            employeeName: staffVal,
            attachmentUrl: fileVal,
            remarks: remarkVal,
            status: "Completed",
            amount: 0
          });
        } catch (e: any) {
          console.error(`LegalWorkHistory create error for Notice #${n.id}:`, e.message);
        }
      }
    }
  } catch (err: any) {
    console.warn("syncNoticesToLogTables warning:", err.message);
  }
}

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
      await syncNoticesToLogTables();
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

    await syncNoticesToLogTables();

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
    await syncNoticesToLogTables();
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
