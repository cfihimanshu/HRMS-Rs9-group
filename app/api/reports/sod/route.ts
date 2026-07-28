import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import sequelize from "@/lib/sequelize";
import SodReport from "@/models/sequelize/SodReport";
import EodReport from "@/models/sequelize/EodReport";
import Attendance from "@/models/sequelize/Attendance";
import TaskLog from "@/models/sequelize/TaskLog";
import { logAudit } from "@/lib/audit";
import { logHRActivity } from "@/lib/hrAudit";
import { Op } from "sequelize";

import LegalRecoverySchedule from "@/models/sequelize/LegalRecoverySchedule";
import KanbanTask from "@/models/sequelize/KanbanTask";

// GET: Fetch today's SOD for the logged-in user
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    await sequelize.authenticate();
    await SodReport.sync();

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const record = await SodReport.findOne({
      where: {
        employee: userId,
        date: {
          [Op.gte]: today,
          [Op.lt]: tomorrow
        }
      }
    });

    // Check if there is an assigned task from Owner for today
    let assignedTaskData = null;
    try {
      const assignedTask = await TaskLog.findOne({
        where: {
          employee: userId,
          assignedBy: { [Op.ne]: null },
          date: {
            [Op.gte]: today,
            [Op.lt]: tomorrow
          }
        },
        order: [["createdAt", "DESC"]]
      });
      if (assignedTask) {
        assignedTaskData = {
          id: assignedTask.id,
          taskTitle: assignedTask.taskTitle,
          taskType: assignedTask.taskType,
          description: assignedTask.description
        };
      }
    } catch (_) {}

    if (!record) {
      // Fetch the last submitted EOD to get the tomorrowPlan
      const lastEod = await EodReport.findOne({
        where: { employee: userId },
        order: [["date", "DESC"]]
      });
      return NextResponse.json({
        success: true,
        data: null,
        lastEodPlan: lastEod ? (lastEod as any).tomorrowPlan : null,
        assignedTask: assignedTaskData
      });
    }

    return NextResponse.json({ success: true, data: record, assignedTask: assignedTaskData });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Create today's SOD declaration
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const userName = session.user.name || "Employee";
    const body = await req.json();
    const { taskSummary, taskType, remarks, selfieUrl, location, projectName, legalSchedules } = body;

    if (!taskSummary || !taskType) {
       return NextResponse.json({ success: false, error: "Missing required fields (Task Summary, Type)" }, { status: 400 });
    }

    if (!selfieUrl && (!legalSchedules || legalSchedules.length === 0)) {
       return NextResponse.json({ success: false, error: "Missing strict required fields (Task Summary, Type, or Selfie)" }, { status: 400 });
    }

    if (taskType === "Development" && !projectName) {
       return NextResponse.json({ success: false, error: "Project name is required for Development task type" }, { status: 400 });
    }

    if ((!location || !location.latitude || !location.longitude) && (!legalSchedules || legalSchedules.length === 0)) {
       return NextResponse.json({ success: false, error: "Strict Rule: Device's live GPS location is mandatory to declare SOD. Fake or static locations are not allowed." }, { status: 400 });
    }

    await sequelize.authenticate();
    await SodReport.sync();

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    let record = await SodReport.findOne({
      where: {
        employee: userId,
        date: {
          [Op.gte]: today,
          [Op.lt]: tomorrow
        }
      }
    });

    if (!record) {
      record = await SodReport.create({
        employee: userId,
        date: today,
        taskSummary,
        taskType,
        remarks: remarks || "",
        selfieUrl: selfieUrl || null,
        latitude: location?.latitude || null,
        longitude: location?.longitude || null,
        locationAddress: location?.address || null,
      });
    }

    // Save Legal Recovery Schedule entries if provided & create corresponding TaskLogs for My Tasks
    if (Array.isArray(legalSchedules) && legalSchedules.length > 0) {
      try {
        await LegalRecoverySchedule.sync();
        await TaskLog.sync();
        await KanbanTask.sync();

        const nowTimestamp = new Date();

        for (const item of legalSchedules) {
          if (!item.workSection || !item.time) continue;

          const itemDate = item.date || new Date().toISOString().split("T")[0];
          const cleanWorkSection = item.workSection.trim();

          const existingSch = await LegalRecoverySchedule.findOne({
            where: {
              employeeId: userId,
              date: itemDate,
              time: item.time,
              workSection: cleanWorkSection
            }
          });

          if (existingSch) {
            await existingSch.update({
              type: item.type || "General",
              subType: item.type === "Bank Related" ? (item.subType || "AO related") : null,
              remarks: item.remarks || item.details || "",
              bankName: item.bankName || null,
              aoName: item.aoName || null,
              rboName: item.rboName || null,
              branchName: item.branchName || null,
              caseDetails: item.caseDetails || null,
              otherType: item.otherType || null,
              details: item.details || item.remarks || null,
            });
            continue;
          }

          const scheduleId = "lrs_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5);
          const itemTaskId = await TaskLog.generateNextTaskId(userId);

          await LegalRecoverySchedule.create({
            id: scheduleId,
            employeeId: userId,
            sodId: (record as any).id.toString(),
            date: item.date || new Date().toISOString().split("T")[0],
            time: item.time,
            workSection: item.workSection.trim(),
            type: item.type || "General",
            subType: item.type === "Bank Related" ? (item.subType || "AO related") : null,
            status: "Pending",
            remarks: item.remarks || item.details || "",
            bankName: item.bankName || null,
            aoName: item.aoName || null,
            rboName: item.rboName || null,
            branchName: item.branchName || null,
            caseDetails: item.caseDetails || null,
            otherType: item.otherType || null,
            details: item.details || item.remarks || null,
            taskId: itemTaskId,
          });

          // Create individual TaskLog entry so each schedule item appears in My Tasks (Kanban)
          const taskTitle = `[${item.type || 'General'}] ${item.workSection.trim()}${item.bankName ? ' - ' + item.bankName : ''}${item.branchName ? ' (' + item.branchName + ')' : ''}`;
          const taskDesc = `SOD Scheduled Work\nDate: ${item.date || 'Today'} | Time: ${item.time}\nType: ${item.type || 'General'}${item.subType ? ' (' + item.subType + ')' : ''}\nBank/NBFC: ${item.bankName || 'N/A'} | Branch: ${item.branchName || 'N/A'}\nAO: ${item.aoName || 'N/A'} | RBO: ${item.rboName || 'N/A'}\nDetails: ${item.details || item.remarks || 'N/A'}`;

          const itemDateObj = item.date ? new Date(item.date + "T00:00:00") : nowTimestamp;

          await TaskLog.create({
            id: itemTaskId,
            employee: userId,
            date: itemDateObj,
            scheduledAt: itemDateObj,
            taskTitle: taskTitle,
            taskType: item.type || "Operation",
            description: taskDesc,
            status: "Pending",
            timerState: "Running",
            timerStart: nowTimestamp,
            elapsedSeconds: 0,
            scheduleId: scheduleId,
          });

          // Auto-create task in KanbanTask model as well
          await KanbanTask.create({
            title: taskTitle,
            description: taskDesc,
            priority: ["Bank Related", "NBFC"].includes(item.type) ? "High" : "Medium",
            status: "To Do",
            assigned_by: userId,
            assigned_to: userId,
            due_date: itemDateObj,
          });
        }
      } catch (lrsErr) {
        console.error("Error saving legal recovery schedules:", lrsErr);
      }
    }

    // Auto-punch attendance check-in (Present) if not already punched today
    const attendanceExists = await Attendance.findOne({
      where: {
        employee: userId,
        date: {
          [Op.gte]: today,
          [Op.lt]: tomorrow
        }
      }
    });
    if (!attendanceExists) {
      await Attendance.create({
        id: Date.now().toString(),
        employee: userId,
        date: today,
        status: "Present",
        checkIn: new Date(),
      });
    }

    // Auto-create task in Kanban from SOD declaration ONLY if no legalSchedules were provided (to avoid extra tasks)
    if (!Array.isArray(legalSchedules) || legalSchedules.length === 0) {
      const sodTaskId = await TaskLog.generateNextTaskId(userId);
      const nowTimestamp = new Date();
      await TaskLog.create({
        id: sodTaskId,
        employee: userId,
        date: nowTimestamp, // exact current timestamp
        taskTitle: taskSummary,
        taskType: taskType,
        description: taskType === "Development" && projectName ? `[Project: ${projectName}] ${remarks || ""}` : (remarks || ""),
        status: "Pending", // Set as Pending so it goes to "My Tasks (Kanban)" Pending column
        timerState: "Running",
        timerStart: nowTimestamp,
        elapsedSeconds: 0,
      });
    }

    await logAudit({
      userId,
      action: "SOD_DECLARED",
      entity: "SodReport",
      entityId: (record as any).id.toString(),
      details: `${userName} declared Start of Day (SOD) targets.`,
    });

    // Log to HR activity feed so it shows on HR Dashboard
    await logHRActivity({
      userId,
      userRole: (session.user as any).role || "Employee",
      action: "SOD_DECLARED",
      details: `${userName} declared Start of Day (SOD). Task: ${taskSummary}${remarks ? ` — Remarks: ${remarks}` : ''}.`,
    });

    return NextResponse.json({ success: true, data: record });
  } catch (error: any) {
    console.error("Failed to declare SOD:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
