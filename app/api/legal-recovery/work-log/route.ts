import { NextResponse } from "next/server";
import LegalWorkLog from "@/models/sequelize/LegalWorkLog";
import LegalWorkHistory from "@/models/sequelize/LegalWorkHistory";
import TaskLog from "@/models/sequelize/TaskLog";
import LegalNotice from "@/models/sequelize/LegalNotice";
import sequelize, { safeAuthenticate } from "@/lib/sequelize";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { requireApiSession, MANAGEMENT_ROLES } from "@/lib/apiAuth";

let financialColumnsReady = false;

async function getExistingWorkLogAttributes() {
  const [columns]: any = await sequelize.query(
    "SHOW COLUMNS FROM `legal_work_logs`"
  );
  const databaseColumns = new Set(
    (Array.isArray(columns) ? columns : []).map((column: any) => column.Field)
  );

  return Object.keys(LegalWorkLog.getAttributes()).filter((attribute) =>
    databaseColumns.has(attribute)
  );
}

async function ensureFinancialColumns() {
  if (financialColumnsReady) return;

  await LegalWorkLog.sync();
  const [columns]: any = await sequelize.query("SHOW COLUMNS FROM `legal_work_logs`");
  const existingColumns = new Set(
    (Array.isArray(columns) ? columns : []).map((column: any) => column.Field)
  );

  if (!existingColumns.has("finalRate")) {
    await sequelize.query(
      "ALTER TABLE `legal_work_logs` ADD COLUMN `finalRate` DECIMAL(12,2) NULL"
    );
  }
  if (!existingColumns.has("expenses")) {
    await sequelize.query(
      "ALTER TABLE `legal_work_logs` ADD COLUMN `expenses` DECIMAL(12,2) NULL DEFAULT 0"
    );
  }
  if (!existingColumns.has("grossProfit")) {
    await sequelize.query(
      "ALTER TABLE `legal_work_logs` ADD COLUMN `grossProfit` DECIMAL(12,2) NULL"
    );
  }
  if (!existingColumns.has("followUpDetails")) {
    await sequelize.query(
      "ALTER TABLE `legal_work_logs` ADD COLUMN `followUpDetails` TEXT NULL"
    );
  }
  if (!existingColumns.has("stageAmount")) {
    await sequelize.query(
      "ALTER TABLE `legal_work_logs` ADD COLUMN `stageAmount` DECIMAL(12,2) NULL"
    );
  }
  if (!existingColumns.has("financialDetails")) {
    await sequelize.query(
      "ALTER TABLE `legal_work_logs` ADD COLUMN `financialDetails` TEXT NULL"
    );
  }
  if (!existingColumns.has("paidBy")) {
    await sequelize.query(
      "ALTER TABLE `legal_work_logs` ADD COLUMN `paidBy` VARCHAR(255) NULL"
    );
  }

  financialColumnsReady = true;
}

export async function GET(request: Request) {
  try {
    const auth = await requireApiSession();
    if (auth.response) return auth.response;
    const { searchParams } = new URL(request.url);
    const masterId = searchParams.get("masterId");
    
    const isDbConnected = await safeAuthenticate(4000);
    if (!isDbConnected) {
      return NextResponse.json({ success: true, data: [] });
    }

    await ensureFinancialColumns();

    let whereClause = {};
    if (masterId) {
      whereClause = { masterId };
    }

    // Auto-backfill existing LegalNotice rows into legal_work_logs if missing.
    // IMPORTANT: Match by masterId OR bank+branch name to prevent recreating
    // manually deleted entries. Only select columns that actually exist in DB.
    try {
      const allNotices = await LegalNotice.findAll();

      // Use only columns that actually exist in the live DB table
      const availableAttrs = await getExistingWorkLogAttributes();
      const safeBackfillAttrs = ["bankName", "branchName", "businessDevOption", "category", "masterId", "remarks"].filter(
        col => availableAttrs.includes(col)
      );

      const existingLogs = await LegalWorkLog.findAll({ attributes: safeBackfillAttrs });

      // Build a lookup of already-backfilled notice markers
      const backfilledSet = new Set<string>();
      existingLogs.forEach((l: any) => {
        // Key by masterId if available
        if (l.masterId) backfilledSet.add(`m_${l.masterId}`);
        // Key by bank+branch+remarks (notice board origin marker)
        const remarkStr = (l.remarks || "").toLowerCase();
        if (remarkStr.includes("notice board entry")) {
          const bName = (l.bankName || "").toLowerCase().trim();
          const brName = (l.branchName || "").toLowerCase().trim();
          backfilledSet.add(`nb_${bName}_${brName}`);
        }
      });

      for (const n of allNotices) {
        const bName = (n.bankName || "").toLowerCase().trim();
        if (!bName) continue;

        // Check if this notice has already been backfilled
        const noticeKey = n.masterId ? `m_${n.masterId}` : null;
        const brName = (n.branchName || "").toLowerCase().trim();
        const nameKey = `nb_${bName}_${brName}`;

        const alreadyExists =
          (noticeKey && backfilledSet.has(noticeKey)) ||
          backfilledSet.has(nameKey);

        if (!alreadyExists) {
          // Build create payload with only safe columns
          const createPayload: Record<string, any> = {
            workDate: n.noticeDate || n.noticeOrderDate || new Date().toISOString().split("T")[0],
            typeOfWork: "Bank Related",
            workLocation: "Office",
            bankName: n.bankName || undefined,
            branchName: n.branchName || undefined,
            category: "Business Development",
            subCategory: "TAKE NOTICE ASSIGNMENT",
            businessDevOption: n.typeOfNotice || "ADVOCATE NOTICE",
            businessDevSubOption: "TAKE NOTICE ASSIGNMENT",
            noOfCount: n.quantity || 1,
            broughtBy: n.broughtBy || undefined,
            preparedBy: n.noticeRenameBy || n.scannedBy || undefined,
            printedBy: n.printedBy || undefined,
            dispatchedBy: n.dispatchedBy || undefined,
            uploadedFileName: n.handoverReceiptUrl || n.documentUrl || undefined,
            remarks: n.handoverRemarks || `Notice Board Entry (${n.typeOfNotice || 'Advocate Notice'})`,
            employeeName: n.broughtBy || n.createdBy || "Notice Staff"
          };
          // Only include masterId if column exists
          if (availableAttrs.includes("masterId") && n.masterId) {
            createPayload.masterId = n.masterId;
          }
          await LegalWorkLog.create(createPayload);
        }
      }
    } catch (bfErr) {
      console.warn("Backfill notice to legal_work_logs warning:", bfErr);
    }

    // The live legacy table may not yet contain every optional field declared
    // in the Sequelize model. Select only columns that really exist so one
    // missing optional column cannot hide the complete history.
    const existingAttributes = await getExistingWorkLogAttributes();
    const logs = await LegalWorkLog.findAll({
      attributes: existingAttributes,
      where: whereClause,
      order: [["createdAt", "DESC"]],
    });
    
    return NextResponse.json({ success: true, data: logs });
  } catch (error: any) {
    console.error("GET /api/legal-recovery/work-log error:", error);
    return NextResponse.json(
      { success: false, data: [], error: "Failed to load legal work history." },
      { status: 500 }
    );
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

    // Do not use sync({ alter: true }) here. On wide legacy MySQL tables it
    // rebuilds every VARCHAR column and can exceed InnoDB's 8126-byte row limit.
    await ensureFinancialColumns();
    
    const session = await getServerSession(authOptions);

    const empId = data.employeeId || session?.user?.email || "emp_unknown";
    const empName = session?.user?.name || empId;
    const isNoticeAssessment =
      data.businessDevSubOption === "TAKE NOTICE ASSIGNMENT";
    const parsedFinalRate = Number.parseFloat(data.finalRate);
    const parsedExpenses = Number.parseFloat(data.expenses || "0");
    let calculatedAssessmentGp: number | null = null;
    let parsedFinancialDetails: any = null;
    if (data.financialDetails) {
      try {
        parsedFinancialDetails =
          typeof data.financialDetails === "string"
            ? JSON.parse(data.financialDetails)
            : data.financialDetails;
      } catch {
        return NextResponse.json(
          { success: false, error: "Invalid notice financial breakup." },
          { status: 400 }
        );
      }
    }
    const isBillPreparation =
      data.businessDevSubOption === "PREPARE BILL (BILL BANWANA)";
    const stageName = String(data.businessDevSubOption || data.subCategory || "");
    const isAdvocateNotice = (data.category || data.businessDevOption || "ADVOCATE NOTICE") === "ADVOCATE NOTICE";
    const stagePersonField: Record<string, string> = {
      "TAKE NOTICE ASSIGNMENT": "broughtBy",
      "COLLECT NOTICE DATA": "broughtBy",
      "PREPARE NOTICE LIST": "preparedBy",
      "GENERATE NOTICE VIA SOFTWARE/MAIL MERGE": "printedBy",
      "DISPATCH NOTICES": "dispatchedBy",
    };
    const isDispatchStage = stageName.includes("DISPATCH NOTICE");
    const requiredPersonField = !isAdvocateNotice
      ? "broughtBy"
      : (isDispatchStage
        ? "dispatchedBy"
        : stagePersonField[stageName]);
    const parsedStageAmount = Number.parseFloat(data.stageAmount);

    // Prevent fields from unrelated workflow stages reaching legacy columns.
    // `undefined` properties can still be included by ORM model mappings, so
    // remove them explicitly before creating the row.
    const cleanData = { ...data };
    cleanData.category = data.category || data.businessDevOption || "ADVOCATE NOTICE";
    cleanData.subCategory = data.subCategory || data.businessDevSubOption || "TAKE NOTICE ASSIGNMENT";
    cleanData.masterId = data.masterId !== undefined && data.masterId !== null ? Number(data.masterId) : 0;

    const isBillFollowUp = data.category === "Bill Follow Up" || data.subCategory === "BILL FOLLOW UP";

    if (!isBillPreparation && !isBillFollowUp) {
      delete cleanData.billDate;
      delete cleanData.billAmount;
      delete cleanData.billNo;
    }
    if (isAdvocateNotice && !isBillFollowUp) {
      for (const field of ["broughtBy", "preparedBy", "printedBy", "dispatchedBy"]) {
        if (requiredPersonField && field !== requiredPersonField) delete cleanData[field];
      }
    }
    if (!isDispatchStage) delete cleanData.stageAmount;

    if (
      isNoticeAssessment &&
      (!Number.isFinite(parsedFinalRate) ||
        parsedFinalRate < 0 ||
        !Number.isFinite(parsedExpenses) ||
        parsedExpenses < 0)
    ) {
      return NextResponse.json(
        { success: false, error: "Final Rate and Expenses must be valid non-negative amounts." },
        { status: 400 }
      );
    }
    if (isNoticeAssessment && !String(cleanData.broughtBy || "").trim()) {
      cleanData.broughtBy = empName;
    }
    if (requiredPersonField && !isBillFollowUp && !String(cleanData[requiredPersonField] || "").trim()) {
      cleanData[requiredPersonField] = empName;
    }
    if (!String(cleanData.broughtBy || "").trim()) {
      cleanData.broughtBy = empName;
    }
    if (isNoticeAssessment) {
      const count = Number.parseInt(String(parsedFinancialDetails?.noticeCount || "0"), 10);
      const rate = Number.parseFloat(String(parsedFinancialDetails?.perNoticeRate || ""));
      const officerRate = Number.parseFloat(
        String(parsedFinancialDetails?.bankOfficerPerNotice || "0")
      );
      const ownExpenses = Number.parseFloat(
        String(parsedFinancialDetails?.ownExpenses || "0")
      );
      if (
        !Number.isFinite(count) ||
        count < 1 ||
        !Number.isFinite(rate) ||
        rate < 0 ||
        !Number.isFinite(officerRate) ||
        officerRate < 0 ||
        !Number.isFinite(ownExpenses) ||
        ownExpenses < 0
      ) {
        return NextResponse.json(
          { success: false, error: "Notice rate breakup contains invalid amounts." },
          { status: 400 }
        );
      }
      cleanData.financialDetails = JSON.stringify({
        noticeCount: count,
        perNoticeRate: rate,
        bankOfficerPerNotice: officerRate,
        ownExpenses,
        totalRevenue: count * rate,
        bankOfficerTotal: count * officerRate,
        grossProfitBeforeDispatch: count * rate - count * officerRate - ownExpenses,
      });
      calculatedAssessmentGp =
        count * rate - count * officerRate - ownExpenses;
    } else {
      delete cleanData.financialDetails;
    }
    if (
      isDispatchStage &&
      (!Number.isFinite(parsedStageAmount) || parsedStageAmount < 0)
    ) {
      return NextResponse.json(
        { success: false, error: "Dispatch amount must be a valid non-negative amount." },
        { status: 400 }
      );
    }

    const targetWorkDateStr = (data.workDate || data.date || data.allocationDate || new Date().toISOString().split('T')[0]).trim();
    const logDateObj = isNaN(new Date(targetWorkDateStr + "T10:00:00").getTime())
      ? new Date()
      : new Date(targetWorkDateStr + "T10:00:00");

    const newLog = await LegalWorkLog.create({
      ...cleanData,
      employeeId: empId,
      employeeName: empName,
      workDate: targetWorkDateStr,
      createdAt: logDateObj,
      updatedAt: logDateObj,
      finalRate: Number.isFinite(parsedFinalRate) ? parsedFinalRate : null,
      expenses: Number.isFinite(parsedExpenses) ? parsedExpenses : null,
      grossProfit: isNoticeAssessment ? calculatedAssessmentGp : (Number.isFinite(parsedFinalRate) ? parsedFinalRate * (Number.parseFloat(String(data.noOfCount || "1")) || 1) : null),
    });

    try {
      await TaskLog.sync();
      
      const countStr = data.noOfCount || "1";
      const categoryStr = data.businessDevOption || data.category || "Legal Recovery Work";
      const subCatStr = data.businessDevSubOption || data.subCategory || "Notice Execution";
      
      const followUpDetailsObj = data.followUpDetails ? (typeof data.followUpDetails === "string" ? JSON.parse(data.followUpDetails) : data.followUpDetails) : null;
      const contactedPersonStr = followUpDetailsObj?.contactedPerson || data.personName || "";
      const billNoStr = data.billNo || followUpDetailsObj?.billNo || "";

      const titleStr = isBillFollowUp
        ? `Bill Follow Up: ${data.bankName || 'Bank'} (${data.branchName || 'Branch'}) - Call with ${contactedPersonStr || 'Officer'} ${billNoStr ? `(Bill #${billNoStr})` : ''}`.trim()
        : `${categoryStr}: ${subCatStr} (${countStr} Count)`;

      const taskDate = targetWorkDateStr;
      
      let taskTime = "10:00 AM";
      if (isBillFollowUp && followUpDetailsObj?.callTime) {
        taskTime = followUpDetailsObj.callTime;
      } else if (data.allocationDate) {
        const dt = new Date(data.allocationDate);
        if (!isNaN(dt.getTime())) {
          taskTime = dt.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
        }
      }

      const dateCompact = taskDate.replace(/-/g, "");
      const generatedTaskId = `TSK-${dateCompact}-${Math.floor(1000 + Math.random() * 9000)}`;

      const detailsParts: string[] = [];

      if (data.broughtBy && String(data.broughtBy).trim()) {
        detailsParts.push(`Brought By: ${String(data.broughtBy).trim()}`);
      }
      if (data.preparedBy && String(data.preparedBy).trim()) {
        detailsParts.push(`Prepared By: ${String(data.preparedBy).trim()}`);
      }
      if (data.printedBy && String(data.printedBy).trim()) {
        detailsParts.push(`Printed By: ${String(data.printedBy).trim()}`);
      }
      if (data.dispatchedBy && String(data.dispatchedBy).trim()) {
        detailsParts.push(`Dispatched By: ${String(data.dispatchedBy).trim()}`);
      }
      if (data.personName && String(data.personName).trim()) {
        detailsParts.push(`Person: ${String(data.personName).trim()}`);
      }

      const billParts: string[] = [];
      if (data.billNo && String(data.billNo).trim()) {
        billParts.push(`Bill No: ${String(data.billNo).trim()}`);
      }
      if (data.billAmount !== undefined && data.billAmount !== null && String(data.billAmount).trim() !== "") {
        billParts.push(`Amount: Rs.${data.billAmount}`);
      }
      if (billParts.length > 0) {
        detailsParts.push(billParts.join(", "));
      }

      if (isNoticeAssessment) {
        const finParts: string[] = [];
        if (parsedFinancialDetails?.perNoticeRate !== undefined && parsedFinancialDetails?.perNoticeRate !== null) {
          finParts.push(`Per Notice Rate: Rs.${parsedFinancialDetails.perNoticeRate}`);
        }
        if (parsedFinancialDetails?.bankOfficerPerNotice !== undefined && parsedFinancialDetails?.bankOfficerPerNotice !== null) {
          finParts.push(`Officer/Notice: Rs.${parsedFinancialDetails.bankOfficerPerNotice}`);
        }
        if (parsedExpenses !== undefined && !isNaN(parsedExpenses) && parsedExpenses > 0) {
          finParts.push(`Own Expenses: Rs.${parsedExpenses}`);
        }
        if (calculatedAssessmentGp !== undefined && calculatedAssessmentGp !== null && !isNaN(calculatedAssessmentGp)) {
          finParts.push(`GP before dispatch: Rs.${calculatedAssessmentGp}`);
        }
        if (finParts.length > 0) {
          detailsParts.push(finParts.join(", "));
        }
      }

      const attachmentFile = data.uploadedFileName || followUpDetailsObj?.attachment || null;

      let taskDescriptionParts: string[] = [];
      if (detailsParts.length > 0) {
        taskDescriptionParts.push(detailsParts.join(" | "));
      }
      if (data.remarks && String(data.remarks).trim()) {
        taskDescriptionParts.push(`Remarks: ${String(data.remarks).trim()}`);
      }
      if (attachmentFile && String(attachmentFile).trim()) {
        taskDescriptionParts.push(`Attachment File: ${String(attachmentFile).trim()}`);
      }
      const taskDescription = taskDescriptionParts.join(" | ");

      await TaskLog.create({
        id: generatedTaskId,
        employee: empId,
        taskTitle: titleStr,
        description: taskDescription,
        status: "Pending",
        allocatedBy: empId,
        date: taskDate,
        scheduledAt: logDateObj,
        createdAt: logDateObj,
        updatedAt: logDateObj,
        time: taskTime,
        workSection: data.workLocation || "Bank",
        bankName: data.bankName || null,
        branchName: data.branchName || null,
        proofAttachment: attachmentFile || null,
        proofUrl: attachmentFile || null,
        attachmentUrl: attachmentFile || null,
        timerState: "Stopped",
        timerStart: null,
        elapsedSeconds: 0,
      });

      // Dual-sync into LegalRecoverySchedule so task displays in Schedule Work Report for exact work date
      try {
        const LegalRecoverySchedule = (sequelize.models as any).LegalRecoverySchedule || (await import("@/models/sequelize/LegalRecoverySchedule")).default;
        await LegalRecoverySchedule.sync().catch(() => {});
        await LegalRecoverySchedule.create({
          id: "lrs_worklog_" + generatedTaskId,
          employeeId: empId,
          sodId: null,
          date: targetWorkDateStr,
          time: taskTime,
          workSection: data.workLocation || "Bank",
          type: categoryStr,
          subType: subCatStr,
          bankName: data.bankName || null,
          branchName: data.branchName || null,
          details: taskDescription,
          status: "Pending",
          createdAt: logDateObj,
          updatedAt: logDateObj
        }).catch(() => {});
      } catch (schErr) {}

    } catch (tErr) {
      console.warn("TaskLog creation warning in work-log route:", tErr);
    }

    // Dual-sync into legal_work_histories table as well
    try {
      await LegalWorkHistory.sync();
      await LegalWorkHistory.create({
        masterId: cleanData.masterId || null,
        category: cleanData.category || "ADVOCATE NOTICE",
        subCategory: cleanData.subCategory || "TAKE NOTICE ASSIGNMENT",
        bankName: cleanData.bankName || null,
        branchName: cleanData.branchName || null,
        employeeId: empId,
        employeeName: empName,
        attachmentUrl: cleanData.uploadedFileName || null,
        remarks: cleanData.remarks || null,
        status: "Completed",
        workDate: targetWorkDateStr,
        createdAt: logDateObj,
        updatedAt: logDateObj,
        amount: Number(data.stageAmount || data.billAmount || 0) || null
      });
    } catch (hErr) {
      console.warn("LegalWorkHistory creation warning in work-log route:", hErr);
    }

    return NextResponse.json({ success: true, data: newLog });
  } catch (error: any) {
    console.error("Work Log POST Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const auth = await requireApiSession(MANAGEMENT_ROLES);
    if (auth.response) return auth.response;
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    const isDbConnected = await safeAuthenticate(6000);
    if (!isDbConnected) {
      return NextResponse.json({ success: false, error: "Database connection timeout" }, { status: 503 });
    }

    await LegalWorkLog.sync();

    if (id) {
      await LegalWorkLog.destroy({ where: { id } });
      try {
        await LegalWorkHistory.sync();
        await LegalWorkHistory.destroy({ where: { id } }).catch(() => {});
      } catch (hErr) {}
      return NextResponse.json({ success: true, message: `Work Log #${id} deleted.` });
    }

    return NextResponse.json({ success: false, error: "Missing id param." }, { status: 400 });
  } catch (error: any) {
    console.error("Work Log DELETE Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const auth = await requireApiSession(MANAGEMENT_ROLES);
    if (auth.response) return auth.response;
    const data = await request.json();
    if (!data.id) return NextResponse.json({ success: false, error: "ID is required" }, { status: 400 });
    const isDbConnected = await safeAuthenticate(6000);
    if (!isDbConnected) {
      return NextResponse.json({ success: false, error: "Database connection timeout" }, { status: 503 });
    }
    await ensureFinancialColumns();
    const entry = await LegalWorkLog.findByPk(data.id);
    if (!entry) return NextResponse.json({ success: false, error: "Work log not found" }, { status: 404 });

    await entry.update(data);

    // Dual sync into legal_work_history table
    try {
      await LegalWorkHistory.sync();
      const existingHistory = await LegalWorkHistory.findByPk(data.id);
      if (existingHistory) {
        await existingHistory.update({
          bankName: data.bankName || entry.bankName,
          branchName: data.branchName || entry.branchName,
          remarks: data.remarks || entry.remarks,
          attachmentUrl: data.uploadedFileName || entry.uploadedFileName,
          amount: Number(data.stageAmount || data.billAmount || entry.stageAmount || entry.billAmount || 0) || null
        });
      } else {
        await LegalWorkHistory.create({
          id: entry.id,
          masterId: entry.masterId || 0,
          category: entry.category || "ADVOCATE NOTICE",
          subCategory: entry.subCategory || "TAKE NOTICE ASSIGNMENT",
          bankName: entry.bankName || null,
          branchName: entry.branchName || null,
          employeeId: entry.employeeId,
          employeeName: entry.employeeName,
          attachmentUrl: entry.uploadedFileName || null,
          remarks: entry.remarks || null,
          status: "Completed",
          workDate: entry.workDate || new Date(),
          amount: Number(entry.stageAmount || entry.billAmount || 0) || null
        }).catch(() => {});
      }
    } catch (hErr) {}

    return NextResponse.json({ success: true, data: entry });
  } catch (error: any) {
    console.error("Work Log PUT Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
