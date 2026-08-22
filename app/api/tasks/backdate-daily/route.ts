import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Op } from "sequelize";
import { randomUUID } from "crypto";
import { authOptions } from "@/lib/auth";
import sequelize from "@/lib/sequelize";
import SodReport from "@/models/sequelize/SodReport";
import EodReport from "@/models/sequelize/EodReport";
import TaskLog from "@/models/sequelize/TaskLog";
import LegalRecoverySchedule from "@/models/sequelize/LegalRecoverySchedule";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

const validStatuses = new Set(["Pending", "In Progress", "Completed"]);
const dateAt = (date: string, time: string) => new Date(`${date}T${time}:00`);

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const isOwner = (session.user as any).role === "Owner";
    const loggedInUserId = String((session.user as any).id || "").trim();
    const requestedEmployeeId = String(body.employeeId || "").trim();
    const employeeId = isOwner ? requestedEmployeeId : loggedInUserId;
    const workDate = String(body.workDate || "").trim();
    const sodTime = String(body.sodTime || "").trim();
    const eodTime = String(body.eodTime || "").trim();
    const tasks = Array.isArray(body.tasks) ? body.tasks : [];
    const sodAt = dateAt(workDate, sodTime);
    const eodAt = dateAt(workDate, eodTime);

    if (!employeeId || !workDate || !sodTime || !eodTime || !tasks.length) {
      return NextResponse.json({ success: false, error: "Staff, work date, SOD/EOD time and at least one task are required" }, { status: 400 });
    }
    if (!Number.isFinite(sodAt.getTime()) || !Number.isFinite(eodAt.getTime()) || sodAt >= eodAt || eodAt > new Date()) {
      return NextResponse.json({ success: false, error: "Invalid historical SOD/EOD date or time" }, { status: 400 });
    }
    if (tasks.some((task: any) => !String(task.title || "").trim() || !String(task.progressNote || "").trim() || !String(task.proofAttachment || "").trim() || !validStatuses.has(task.status))) {
      return NextResponse.json({ success: false, error: "Every task needs title, valid status, progress note and proof" }, { status: 400 });
    }
    if (tasks.some((task: any) => !String(task.relatedCategory || "").trim() || !String(task.type || "").trim())) {
      return NextResponse.json({ success: false, error: "Every task needs related category and task type" }, { status: 400 });
    }
    if (tasks.some((task: any) => task.relatedCategory === "Bank Related" && (!String(task.bankName || "").trim() || !String(task.branchName || "").trim()))) {
      return NextResponse.json({ success: false, error: "Bank Related task needs bank and branch" }, { status: 400 });
    }
    if (tasks.some((task: any) => task.relatedCategory === "RBO Related" && (!String(task.bankName || "").trim() || !String(task.rboName || "").trim()))) {
      return NextResponse.json({ success: false, error: "RBO Related task needs bank and RBO" }, { status: 400 });
    }
    if (tasks.some((task: any) => task.relatedCategory === "Fix Security Related" && !String(task.nbfcName || "").trim())) {
      return NextResponse.json({ success: false, error: "Fix Security Related task needs NBFC" }, { status: 400 });
    }

    await sequelize.authenticate();
    const dayStart = dateAt(workDate, "00:00");
    const nextDay = new Date(dayStart); nextDay.setDate(nextDay.getDate() + 1);
    const existingSod = await SodReport.findOne({ where: { employee: employeeId, date: { [Op.gte]: dayStart, [Op.lt]: nextDay } } });
    const existingEod = await EodReport.findOne({ where: { employee: employeeId, date: { [Op.gte]: dayStart, [Op.lt]: nextDay } } });
    if (existingSod || existingEod) {
      return NextResponse.json({ success: false, error: "Selected staff ki is date par SOD/EOD entry pehle se maujood hai" }, { status: 409 });
    }

    const result = await sequelize.transaction(async transaction => {
      const titles = tasks.map((task: any) => String(task.title).trim());
      const completed = tasks.filter((task: any) => task.status === "Completed").map((task: any) => task.title);
      const pending = tasks.filter((task: any) => task.status !== "Completed").map((task: any) => task.title);
      const entryActor = isOwner ? "Owner" : String(session.user?.name || "Staff");
      const sod = await SodReport.create({ employee: employeeId, date: sodAt, timestamp: sodAt, taskSummary: titles.join("; ").slice(0, 250), taskType: "Daily Back-Date Entry", remarks: `${tasks.length} historical task(s) entered by ${entryActor}`, status: "Submitted", createdAt: sodAt, updatedAt: sodAt }, { transaction });
      const eod = await EodReport.create({ employee: employeeId, date: eodAt, timestamp: eodAt, completedWork: (completed.join("; ") || "None").slice(0, 250), pendingWork: (pending.join("; ") || "None").slice(0, 250), issues: "", escalationNeeded: false, tomorrowPlan: "Historical entry", status: "Submitted", createdAt: eodAt, updatedAt: eodAt }, { transaction });
      for (let index = 0; index < tasks.length; index += 1) {
        const task = tasks[index];
        // Historical createdAt values do not appear in TaskLog's recent-ID scan,
        // so sequence-based IDs can collide on repeated back-date submissions.
        const taskId = `BDT-${workDate.replace(/-/g, "")}-${randomUUID()}`;
        const status = task.status as string;
        const scheduleId = `lrs_back_${Date.now()}_${index}_${Math.random().toString(36).slice(2, 6)}`;
        const relatedCategory = String(task.relatedCategory || "").trim();
        const details = [relatedCategory ? `Related Category: ${relatedCategory}` : "", task.bankName ? `Bank: ${String(task.bankName).trim()}` : "", task.branchName ? `Branch: ${String(task.branchName).trim()}` : "", task.rboName ? `RBO: ${String(task.rboName).trim()}` : "", task.nbfcName ? `NBFC: ${String(task.nbfcName).trim()}` : "", String(task.details || "").trim()].filter(Boolean).join("\n");
        await TaskLog.create({ id: taskId, employee: employeeId, assignedBy: isOwner ? loggedInUserId : null, date: sodAt, scheduledAt: sodAt, taskTitle: String(task.title).trim(), taskType: String(task.type || "General"), description: details, status, progressNotes: String(task.progressNote).trim(), proofAttachment: String(task.proofAttachment).trim(), timerState: "Stopped", timerStart: null, elapsedSeconds: 0, completedAt: status === "Completed" ? eodAt : null, scheduleId, createdAt: sodAt, updatedAt: eodAt }, { transaction });
        await LegalRecoverySchedule.create({ id: scheduleId, employeeId, sodId: String((sod as any).id), taskId, date: workDate, time: sodAt.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true }), workSection: String(task.title).trim(), type: String(task.type || "General"), subType: relatedCategory || null, status, bankName: String(task.bankName || "").trim() || null, branchName: String(task.branchName || "").trim() || null, rboName: String(task.rboName || "").trim() || null, otherType: String(task.nbfcName || "").trim() || null, remarks: String(task.details || ""), details, progressNotes: String(task.progressNote).trim(), proofAttachment: String(task.proofAttachment).trim(), completedAt: status === "Completed" ? eodAt : null, createdAt: sodAt, updatedAt: eodAt }, { transaction });
      }
      return { sodId: (sod as any).id, eodId: (eod as any).id, taskCount: tasks.length };
    });

    await logAudit({ userId: loggedInUserId, action: "DAILY_BACKDATE_ENTRY", entity: "TaskLog", entityId: employeeId, details: `${isOwner ? "Owner" : "Staff"} entered ${tasks.length} historical task(s) for ${employeeId} on ${workDate}` });
    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error("[POST /api/tasks/backdate-daily]", error);
    const validationDetails = Array.isArray(error?.errors)
      ? error.errors.map((item: any) => item?.message).filter(Boolean).join(", ")
      : "";
    return NextResponse.json({
      success: false,
      error: validationDetails || error?.parent?.sqlMessage || error.message || "Daily back-date entry failed"
    }, { status: 500 });
  }
}
