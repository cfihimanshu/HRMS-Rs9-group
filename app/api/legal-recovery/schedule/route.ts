import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import sequelize from "@/lib/sequelize";
import LegalRecoverySchedule from "@/models/sequelize/LegalRecoverySchedule";

async function initDB() {
  await sequelize.authenticate();
  await LegalRecoverySchedule.sync({ alter: true });
}

import { Op } from "sequelize";

// GET: Fetch Legal Recovery Schedules
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const all = searchParams.get("all") === "true";
    const dateParam = searchParams.get("date");
    const fromDate = searchParams.get("fromDate");
    const toDate = searchParams.get("toDate");
    const typeParam = searchParams.get("type");
    const statusParam = searchParams.get("status");
    const employeeId = searchParams.get("employeeId");

    const currentUserId = (session.user as any).id;
    const userRole = (session.user as any).role;
    const userVertical = (session.user as any).vertical || "";
    const isManager = ["Owner", "Director", "HR Head", "HR Executive", "Department Manager"].includes(userRole);
    const isLegalOrSecurity = ["Legal Recovery", "Security", "Legal & Security"].includes(userVertical);

    await initDB();

    const whereClause: any = {};

    // Filter by employee if specifically requested, or limit to current user only if non-manager and non-legal/security
    if (employeeId && employeeId !== "all") {
      whereClause.employeeId = employeeId;
    } else if (!isManager && !isLegalOrSecurity && !all) {
      whereClause.employeeId = currentUserId;
    }

    // Filter by date
    if (dateParam && dateParam !== "all") {
      whereClause.date = dateParam;
    } else if (fromDate && toDate) {
      whereClause.date = { [Op.between]: [fromDate, toDate] };
    }

    // Static DB type & status filters removed here; applied in-memory after live TaskLog enrichment

    const schedules = await LegalRecoverySchedule.findAll({
      where: whereClause,
      order: [["date", "DESC"], ["time", "ASC"], ["createdAt", "DESC"]]
    });

    // Attach employee details & live TaskLog status / proofAttachment
    const User = (sequelize.models as any).User;
    const TaskLog = (sequelize.models as any).TaskLog;
    let enrichedSchedules = schedules.map((s: any) => s.toJSON());

    if (User) {
      const userIds = Array.from(new Set(schedules.map((s: any) => s.employeeId).filter(Boolean)));
      if (userIds.length > 0) {
        const users = await User.findAll({
          where: { id: userIds },
          attributes: ["id", "name", "email", "role"]
        });
        const userMap = new Map(users.map((u: any) => [String(u.id), u.toJSON()]));
        enrichedSchedules = enrichedSchedules.map((json: any) => ({
          ...json,
          user: userMap.get(String(json.employeeId)) || null
        }));
      }
    }

    if (TaskLog) {
      try {
        await TaskLog.sync({ alter: true });
        const taskIds = Array.from(new Set(enrichedSchedules.map((s: any) => s.taskId).filter(Boolean)));
        const scheduleIds = Array.from(new Set(enrichedSchedules.map((s: any) => s.id).filter(Boolean)));
        const empIds = Array.from(new Set(enrichedSchedules.map((s: any) => s.employeeId).filter(Boolean)));

        const [tasks, empTasks] = await Promise.all([
          TaskLog.findAll({
            where: {
              [Op.or]: [
                ...(taskIds.length > 0 ? [{ id: taskIds }] : []),
                ...(scheduleIds.length > 0 ? [{ scheduleId: scheduleIds }] : [])
              ]
            }
          }).catch(() => []),
          TaskLog.findAll({
            where: { employee: empIds }
          }).catch(() => [])
        ]);

        const taskByIdMap = new Map(tasks.map((t: any) => [String(t.id), t.toJSON()]));
        const taskBySchMap = new Map(tasks.map((t: any) => [String(t.scheduleId), t.toJSON()]));

        enrichedSchedules = enrichedSchedules.map((json: any) => {
          let matchedTask: any =
            taskByIdMap.get(String(json.taskId)) ||
            taskBySchMap.get(String(json.id)) ||
            taskByIdMap.get(String(json.id)) ||
            taskBySchMap.get(String(json.taskId));

          if (!matchedTask) {
            matchedTask = empTasks.find((t: any) => {
              if (String(t.employee) !== String(json.employeeId)) return false;
              if (t.scheduleId && (t.scheduleId === json.id || t.scheduleId === json.taskId)) return true;
              if (t.id && (t.id === json.id || t.id === json.taskId)) return true;

              const title = (t.taskTitle || "").toLowerCase();
              const workSec = (json.workSection || "").toLowerCase();
              const bank = (json.bankName || "").toLowerCase();

              if (workSec && workSec !== "general" && workSec !== "office" && workSec !== "bank" && workSec !== "field") {
                if (title.includes(workSec) || workSec.includes(title)) return true;
              }
              if (bank && title.includes(bank)) return true;
              return false;
            });
          }

          const dbStatus = (json.status || "").toLowerCase().trim();
          const taskStatus = (matchedTask?.status || "").toLowerCase().trim();
          const isTimerRunning = matchedTask?.timerState === "Running";

          let liveStatus = "Pending";
          if (dbStatus === "completed" || dbStatus === "done" || taskStatus === "completed" || taskStatus === "done") {
            liveStatus = "Completed";
          } else if (dbStatus === "in progress" || taskStatus.includes("progress") || taskStatus === "running" || isTimerRunning) {
            liveStatus = "In Progress";
          }

          const liveProof = matchedTask?.proofAttachment || json.proofAttachment || null;
          const liveCompletedAt = liveStatus === "Completed" ? (json.completedAt || matchedTask?.updatedAt || new Date()) : null;

          return {
            ...json,
            status: liveStatus,
            proofAttachment: liveProof,
            completedAt: liveCompletedAt,
            taskLog: matchedTask || null
          };
        });
      } catch (tErr) {
        console.error("Error enriching schedules with TaskLog data:", tErr);
      }
    }

    // Filter by type & status AFTER live TaskLog enrichment
    let finalSchedules = enrichedSchedules;

    if (typeParam && typeParam !== "all") {
      const searchT = typeParam.toLowerCase();
      finalSchedules = finalSchedules.filter((s: any) => {
        const t = (s.type || "").toLowerCase();
        const sub = (s.subType || "").toLowerCase();
        const bank = (s.bankName || "").trim();

        const isBank = t === "bank related" || t === "bank" || bank.length > 0;
        const isNbfc = t === "nbfc" || sub === "nbfc";
        const isField = t === "field visit" || sub === "field visit";
        const isCall = t === "call" || sub.includes("call") || sub === "incoming call" || sub === "outgoing call";

        if (searchT === "bank related" || searchT === "bank") {
          return isBank;
        }
        if (searchT === "nbfc") {
          return isNbfc;
        }
        if (searchT === "field visit") {
          return isField;
        }
        if (searchT === "call") {
          return isCall;
        }
        if (searchT === "general") {
          return !isBank && !isNbfc && !isField;
        }
        return t === searchT || sub === searchT;
      });
    }

    if (statusParam && statusParam !== "all") {
      const searchSt = statusParam.toLowerCase();
      finalSchedules = finalSchedules.filter((s: any) => {
        const st = (s.status || "pending").toLowerCase();
        return st === searchSt;
      });
    }

    return NextResponse.json({ success: true, data: finalSchedules });
  } catch (error: any) {
    console.error("GET /api/legal-recovery/schedule error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Add new Legal Recovery Schedule Entry / Entries
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const body = await req.json();
    const { items, sodId } = body;

    await initDB();

    let created: any[] = [];
    const entries = Array.isArray(items) ? items : [body];

    for (const item of entries) {
      const { date, time, workSection, type, subType, remarks } = item;
      if (!workSection || !time) continue;

      const scheduleDate = date || new Date().toISOString().split("T")[0];
      const entryId = "lrs_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5);

      const newRec = await LegalRecoverySchedule.create({
        id: entryId,
        employeeId: userId,
        sodId: sodId || item.sodId || null,
        date: scheduleDate,
        time: time,
        workSection: workSection.trim(),
        type: type || "General",
        subType: type === "Bank Related" ? (subType || "AO related") : null,
        status: "Pending",
        remarks: remarks || "",
      });

      created.push(newRec);
    }

    return NextResponse.json({ success: true, data: created, message: "Schedule created successfully" });
  } catch (error: any) {
    console.error("POST /api/legal-recovery/schedule error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT: Update status or details
export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { id, status, workSection, time, type, subType, remarks } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "Schedule ID is required" }, { status: 400 });
    }

    await initDB();

    const schedule = await LegalRecoverySchedule.findByPk(id);
    if (!schedule) {
      return NextResponse.json({ success: false, error: "Schedule not found" }, { status: 404 });
    }

    if (status !== undefined) {
      schedule.status = status;
      if (status === "Completed") {
        if (!schedule.completedAt) {
          schedule.completedAt = new Date();
        }
      } else {
        schedule.completedAt = null;
      }
    }
    if (workSection !== undefined) schedule.workSection = workSection;
    if (time !== undefined) schedule.time = time;
    if (type !== undefined) schedule.type = type;
    if (subType !== undefined) schedule.subType = ["Bank Related", "NBFC"].includes(type) ? subType : null;
    if (remarks !== undefined) schedule.remarks = remarks;

    await schedule.save();

    // Bi-directional status sync back to TaskLog
    try {
      const TaskLog = (sequelize.models as any).TaskLog || (await import("@/models/sequelize/TaskLog")).default;
      if (TaskLog && status !== undefined) {
        const taskStatus = status === "Completed" ? "Completed" : status === "In Progress" ? "In Progress" : "Pending";
        await TaskLog.update(
          { status: taskStatus },
          {
            where: {
              [Op.or]: [
                { id: schedule.taskId || "" },
                { scheduleId: schedule.id },
                { employee: schedule.employeeId, taskTitle: schedule.workSection }
              ]
            }
          }
        );
      }
    } catch (taskSyncErr) {
      console.error("Failed to sync schedule status back to TaskLog:", taskSyncErr);
    }

    return NextResponse.json({ success: true, data: schedule, message: "Schedule updated successfully" });
  } catch (error: any) {
    console.error("PUT /api/legal-recovery/schedule error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE: Remove Schedule Entry
export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, error: "Schedule ID is required" }, { status: 400 });
    }

    await initDB();

    const schedule = await LegalRecoverySchedule.findByPk(id);
    if (schedule) {
      await schedule.destroy();
    }

    return NextResponse.json({ success: true, message: "Schedule deleted successfully" });
  } catch (error: any) {
    console.error("DELETE /api/legal-recovery/schedule error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
