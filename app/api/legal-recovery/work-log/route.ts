import { NextResponse } from "next/server";
import LegalWorkLog from "@/models/sequelize/LegalWorkLog";
import TaskLog from "@/models/sequelize/TaskLog";
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
    const stagePersonField: Record<string, string> = {
      "TAKE NOTICE ASSIGNMENT": "broughtBy",
      "COLLECT NOTICE DATA": "broughtBy",
      "PREPARE NOTICE LIST": "preparedBy",
      "GENERATE NOTICE VIA SOFTWARE/MAIL MERGE": "printedBy",
      "DISPATCH NOTICES": "dispatchedBy",
    };
    const isDispatchStage = stageName.includes("DISPATCH NOTICE");
    const requiredPersonField = isDispatchStage
      ? "dispatchedBy"
      : stagePersonField[stageName];
    const parsedStageAmount = Number.parseFloat(data.stageAmount);

    // Prevent fields from unrelated workflow stages reaching legacy columns.
    // `undefined` properties can still be included by ORM model mappings, so
    // remove them explicitly before creating the row.
    const cleanData = { ...data };
    if (!isBillPreparation) {
      delete cleanData.billDate;
      delete cleanData.billAmount;
      delete cleanData.billNo;
    }
    for (const field of ["broughtBy", "preparedBy", "printedBy", "dispatchedBy"]) {
      if (field !== requiredPersonField) delete cleanData[field];
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
    if (isNoticeAssessment && !String(data.broughtBy || "").trim()) {
      return NextResponse.json(
        { success: false, error: "Brought By person name is required." },
        { status: 400 }
      );
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
    if (requiredPersonField && !String(data[requiredPersonField] || "").trim()) {
      const fieldLabel = requiredPersonField.replace(/([A-Z])/g, " $1").replace(/^./, c => c.toUpperCase());
      return NextResponse.json(
        { success: false, error: `${fieldLabel} person name is required.` },
        { status: 400 }
      );
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

    const newLog = await LegalWorkLog.create({
      ...cleanData,
      employeeId: empId,
      employeeName: empName,
      finalRate: isNoticeAssessment ? parsedFinalRate : null,
      expenses: isNoticeAssessment ? parsedExpenses : null,
      grossProfit: isNoticeAssessment ? calculatedAssessmentGp : null,
    });

    if (data.workDate || data.allocationDate) {
      try {
        await TaskLog.sync();
        
        const countStr = data.noOfCount || "1";
        const categoryStr = data.businessDevOption || data.category || "Legal Recovery Work";
        const subCatStr = data.businessDevSubOption || data.subCategory || "Notice Execution";
        const titleStr = `${categoryStr}: ${subCatStr} (${countStr} Count)`;
        const taskDate = data.workDate || new Date().toISOString().split('T')[0];
        
        let taskTime = "10:00 AM";
        if (data.allocationDate) {
          const dt = new Date(data.allocationDate);
          if (!isNaN(dt.getTime())) {
            taskTime = dt.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
          }
        }

        const dateCompact = taskDate.replace(/-/g, "");
        const generatedTaskId = `TSK-${dateCompact}-${Math.floor(1000 + Math.random() * 9000)}`;

        let extraDetails = `Brought By: ${data.broughtBy || 'N/A'}, Printed By: ${data.printedBy || 'N/A'}, Dispatched By: ${data.dispatchedBy || 'N/A'}`;
        if (data.billNo || data.billAmount) {
          extraDetails += ` | Bill No: ${data.billNo || 'N/A'}, Amount: Rs.${data.billAmount || '0'}`;
        }
        if (isNoticeAssessment) {
          extraDetails += ` | Per Notice Rate: Rs.${parsedFinancialDetails?.perNoticeRate || 0}, Officer/Notice: Rs.${parsedFinancialDetails?.bankOfficerPerNotice || 0}, Own Expenses: Rs.${parsedExpenses}, GP before dispatch: Rs.${calculatedAssessmentGp || 0}`;
        }

        await TaskLog.create({
          id: generatedTaskId,
          employee: empId,
          taskTitle: titleStr,
          description: `${extraDetails} | Remarks: ${data.remarks || ''}`,
          status: "Pending",
          allocatedBy: empId,
          date: taskDate,
          scheduledAt: data.allocationDate ? new Date(data.allocationDate) : new Date(),
          time: taskTime,
          workSection: data.workLocation || "Bank",
          bankName: data.bankName || null,
          branchName: data.branchName || null
        });
      } catch (tErr) {
        console.warn("TaskLog creation warning in work-log route:", tErr);
      }
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

    if (data.stageAmount !== undefined) entry.stageAmount = Math.max(0, Number(data.stageAmount) || 0);
    if (data.remarks !== undefined) entry.remarks = String(data.remarks || "");
    await entry.save();
    return NextResponse.json({ success: true, data: entry });
  } catch (error: any) {
    console.error("Work Log PUT Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
