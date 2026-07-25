import { NextResponse } from "next/server";
import LegalWorkHistory from "@/models/sequelize/LegalWorkHistory";
import BranchMaster from "@/models/sequelize/BranchMaster";
import BankMaster from "@/models/sequelize/BankMaster";
import TaskLog from "@/models/sequelize/TaskLog";
import sequelize from "@/lib/sequelize";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Op } from "sequelize";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const masterId = searchParams.get("masterId");

    await sequelize.authenticate();
    await LegalWorkHistory.sync({ alter: true });

    let whereClause: any = {};
    if (category) whereClause.category = category;
    if (masterId) whereClause.masterId = masterId;

    const rawLogs = await LegalWorkHistory.findAll({
      where: whereClause,
      order: [["createdAt", "DESC"]],
      limit: 500,
      raw: true,
    });

    // Populate / Fix branchName and bankName if needed
    const masterIds = [...new Set(rawLogs.map((l: any) => l.masterId).filter(Boolean))];
    let branchMap: any = {};
    let bankMap: any = {};

    if (masterIds.length > 0) {
      const branches = await BranchMaster.findAll({ where: { id: { [Op.in]: masterIds } }, raw: true }).catch(() => []);
      branches.forEach((b: any) => { branchMap[b.id] = b; });
      const bankIds = [...new Set(branches.map((b: any) => b.bankId).filter(Boolean))];
      if (bankIds.length > 0) {
        const banks = await BankMaster.findAll({ where: { id: { [Op.in]: bankIds } }, raw: true }).catch(() => []);
        banks.forEach((b: any) => { bankMap[b.id] = b; });
      }
    }

    const logs = rawLogs.map((log: any) => {
      let bName = log.branchName || "";
      let bkName = log.bankName || "";

      // Auto-parse real selected bank and branch from subCategory (e.g. "RAJASTHAN GRAMIN BANK - BARMER" or "State Bank Of India - KAKOD")
      if (log.category === "Bank" || (log.subCategory && log.subCategory.includes(" - "))) {
        const parts = (log.subCategory || "").split(" - ");
        if (parts.length >= 2) {
          const parsedBank = parts[0].trim();
          const parsedBranch = parts.slice(1).join(" - ").trim();

          if (parsedBranch) bName = parsedBranch;
          if (parsedBank) bkName = parsedBank;

          // Auto-heal old database records in background if mismatched
          if (log.id && (log.branchName !== bName || log.bankName !== bkName)) {
            LegalWorkHistory.update(
              { bankName: bkName, branchName: bName },
              { where: { id: log.id } }
            ).catch(() => {});
          }
        }
      }

      if (!bName && log.masterId && branchMap[log.masterId]) {
        const br = branchMap[log.masterId];
        bName = br.branchName;
        if (!bkName && bankMap[br.bankId]) {
          bkName = bankMap[br.bankId].bankName;
        }
      }

      return {
        ...log,
        bankName: bkName,
        branchName: bName,
      };
    });

    return NextResponse.json({ success: true, data: logs });
  } catch (error: any) {
    console.error("[/api/legal-recovery/work-history GET] Error:", error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    await sequelize.authenticate();
    await LegalWorkHistory.sync({ alter: true });

    const session = await getServerSession(authOptions);
    if (session?.user) {
      data.employeeId = (session.user as any).id;
      data.employeeName =
        (session.user as any).name ||
        ((session.user as any).firstName
          ? `${(session.user as any).firstName} ${(session.user as any).lastName || ""}`.trim()
          : "Employee");
    }

    if (!data.status) {
      data.status = "Pending";
    }

    const newHistoryEntry = await LegalWorkHistory.create(data);

    return NextResponse.json({ success: true, data: newHistoryEntry });
  } catch (error: any) {
    console.error("[/api/legal-recovery/work-history POST] Error:", error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const data = await request.json();
    const { id, status, remarks, category, subCategory, workDate, bankName, branchName, attachmentUrl } = data;
    if (!id) {
      return NextResponse.json({ success: false, error: "Missing entry ID" }, { status: 400 });
    }

    await sequelize.authenticate();
    await LegalWorkHistory.sync({ alter: true });

    const entry = await LegalWorkHistory.findByPk(id);
    if (!entry) {
      return NextResponse.json({ success: false, error: "Entry not found" }, { status: 404 });
    }

    if (status !== undefined) entry.status = status;
    if (remarks !== undefined) entry.remarks = remarks;
    if (category !== undefined) entry.category = category;
    if (subCategory !== undefined) entry.subCategory = subCategory;
    if (workDate !== undefined) entry.workDate = workDate;
    if (bankName !== undefined) entry.bankName = bankName;
    if (branchName !== undefined) entry.branchName = branchName;
    if (attachmentUrl !== undefined) entry.attachmentUrl = attachmentUrl;

    await entry.save();

    // Sync changes to TaskLog (My Tasks Kanban board)
    try {
      let taskEntry: any = null;
      if (entry.taskId) {
        taskEntry = await TaskLog.findByPk(entry.taskId);
      }

      if (!taskEntry) {
        const oldSubCat = entry.subCategory;
        const recentTasks = await TaskLog.findAll({
          where: {
            taskTitle: { [Op.like]: "%[Branch Work]%" },
          },
          order: [["createdAt", "DESC"]],
          limit: 100,
        });

        taskEntry = recentTasks.find((t: any) => {
          const desc = t.description || "";
          return (oldSubCat && (desc.includes(oldSubCat) || t.taskTitle.includes(oldSubCat))) ||
            (entry.branchName && desc.includes(entry.branchName));
        });
      }

      if (taskEntry) {
        if (!entry.taskId) {
          entry.taskId = taskEntry.id;
          await entry.save();
        }

        taskEntry.status = entry.status || taskEntry.status;
        taskEntry.taskTitle = `[Branch Work] ${entry.category || "Bank"}: ${entry.subCategory || ""}`;

        const workDateFormatted = entry.workDate
          ? new Date(entry.workDate).toLocaleDateString("en-IN")
          : new Date().toLocaleDateString("en-IN");

        const updatedTaskDesc = [
          `Branch: ${entry.branchName || ""}`,
          `Bank: ${entry.bankName || ""}`,
          `Work Type: ${entry.category || ""}`,
          `Work Date: ${workDateFormatted}`,
          `Detail: ${entry.subCategory || ""}`,
          entry.attachmentUrl ? `Attachment: ${entry.attachmentUrl}` : "",
          entry.remarks ? `Remark: ${entry.remarks}` : "",
        ]
          .filter(Boolean)
          .join("\n");

        taskEntry.description = updatedTaskDesc;
        if (entry.attachmentUrl) {
          taskEntry.proofAttachment = entry.attachmentUrl;
          taskEntry.attachmentUrl = entry.attachmentUrl;
        }
        if (entry.workDate) {
          taskEntry.dueDate = entry.workDate;
        }
        await taskEntry.save();
      }
    } catch (taskErr: any) {
      console.error("Failed to sync TaskLog update:", taskErr.message);
    }

    return NextResponse.json({ success: true, data: entry });
  } catch (error: any) {
    console.error("[/api/legal-recovery/work-history PUT] Error:", error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
