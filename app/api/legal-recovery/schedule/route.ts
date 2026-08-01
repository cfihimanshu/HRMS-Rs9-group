import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import sequelize from "@/lib/sequelize";
import LegalRecoverySchedule from "@/models/sequelize/LegalRecoverySchedule";
import EmployeeProfile from "@/models/sequelize/EmployeeProfile";
import TaskLog from "@/models/sequelize/TaskLog";
import User from "@/models/sequelize/User";

import { DataTypes, Op } from "sequelize";

async function initDB() {
  await sequelize.authenticate();
  await LegalRecoverySchedule.sync();
  await EmployeeProfile.sync().catch(() => {});
  try {
    const queryInterface = sequelize.getQueryInterface();
    const tableDesc: any = await queryInterface.describeTable("legal_recovery_schedules");
    if (tableDesc) {
      if (!tableDesc.officerName) {
        await queryInterface.addColumn("legal_recovery_schedules", "officerName", {
          type: DataTypes.STRING,
          allowNull: true,
        });
      }
      if (!tableDesc.officerPhone) {
        await queryInterface.addColumn("legal_recovery_schedules", "officerPhone", {
          type: DataTypes.STRING,
          allowNull: true,
        });
      }
    }
  } catch (err) {
    console.error("Auto-migration column check error:", err);
  }
}

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
    const verticalOnly = searchParams.get("verticalOnly") === "true";

    const currentUserId = (session.user as any).id;
    const userRole = (session.user as any).role;
    const userVertical = (session.user as any).vertical || "";
    const isManager = ["Owner", "Director", "HR Head", "HR Executive", "Department Manager"].includes(userRole);
    const isLegalOrSecurity = ["Legal Recovery", "Security", "Legal & Security"].includes(userVertical);

    await initDB();

    const whereClause: any = {};
    let verticalUserIds: string[] | null = null;

    // Schedule Work Report must only contain employees who are assigned to a
    // vertical. Enforce this on the API so blank-vertical records cannot leak
    // back into the report through refresh, filters, or direct requests.
    // Schedule Work Report must ONLY contain tasks for employees belonging to
    // "Legal Recovery" or "Security" verticals (including "Legal & Security").
    // Employees belonging to any other vertical or department will NOT be included.
    const legalOrSecurityVerticals = ["legal recovery", "security", "legal & security"];

    if (verticalOnly) {
      const verticalProfiles = await EmployeeProfile.findAll({
        attributes: ["user", "vertical"],
        where: {
          user: { [Op.not]: null },
          vertical: { [Op.not]: null }
        },
        raw: true
      });

      const profileUserIds = verticalProfiles
        .filter((profile: any) => {
          const v = String(profile.vertical || "").trim().toLowerCase();
          return legalOrSecurityVerticals.includes(v);
        })
        .map((profile: any) => String(profile.user));

      const legalSecurityUsers = await User.findAll({
        attributes: ["id", "role"],
        where: {
          role: { [Op.in]: ["Legal Recovery", "Security", "Facility Manager", "Corporate Lawyer"] }
        },
        raw: true
      });
      const roleUserIds = legalSecurityUsers.map((u: any) => String(u.id));

      const combinedSet = new Set([...profileUserIds, ...roleUserIds]);
      verticalUserIds = Array.from(combinedSet);

      whereClause.employeeId = { [Op.in]: verticalUserIds };
    }

    // Filter by employee if specifically requested, or limit to current user only if non-manager and non-legal/security
    if (employeeId && employeeId !== "all") {
      whereClause.employeeId = verticalOnly && verticalUserIds
        ? (verticalUserIds.includes(String(employeeId)) ? employeeId : { [Op.in]: [] })
        : employeeId;
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
    let enrichedSchedules = schedules.map((s: any) => s.toJSON());

    const userIds = Array.from(
      new Set(schedules.map((schedule: any) => String(schedule.employeeId || "").trim()).filter(Boolean))
    );
    if (userIds.length > 0) {
      const users = await User.findAll({
        where: { id: { [Op.in]: userIds } },
        attributes: ["id", "name", "email", "role"]
      });
      const userMap = new Map(users.map((user: any) => [String(user.id).trim(), user.toJSON()]));
      enrichedSchedules = enrichedSchedules.map((schedule: any) => ({
        ...schedule,
        user: userMap.get(String(schedule.employeeId || "").trim()) || null
      }));
    }

    try {
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
          taskByIdMap.get(String(json.taskId || "").trim()) ||
          taskBySchMap.get(String(json.id || "").trim()) ||
          taskByIdMap.get(String(json.id || "").trim()) ||
          taskBySchMap.get(String(json.taskId || "").trim());

        // Find candidate tasks for this employee on the same date
        const sameEmpDateTasks = empTasks.filter((t: any) => {
          const tEmp = String(t.employee || "").trim().toLowerCase();
          const sEmpId = String(json.employeeId || "").trim().toLowerCase();
          const sUserEmail = String(json.user?.email || "").trim().toLowerCase();

          const empMatches = tEmp === sEmpId || (sUserEmail && tEmp === sUserEmail);
          if (!empMatches) return false;

          const taskDateStr = t.date ? new Date(t.date).toISOString().slice(0, 10) : "";
          const schedDateStr = String(json.date || "").trim();
          if (taskDateStr && schedDateStr && taskDateStr !== schedDateStr) return false;

          return true;
        });

        if (!matchedTask && sameEmpDateTasks.length > 0) {
          // 1. Try matching by exact ID / scheduleId
          matchedTask = sameEmpDateTasks.find((t: any) => {
            const tId = String(t.id || "").trim();
            const sId = String(t.scheduleId || "").trim();
            const jsonId = String(json.id || "").trim();
            const jsonTaskId = String(json.taskId || "").trim();

            if (sId && (sId === jsonId || (jsonTaskId && sId === jsonTaskId))) return true;
            if (tId && (tId === jsonId || (jsonTaskId && tId === jsonTaskId))) return true;
            return false;
          });

          // 2. Try matching by bankName / workSection / type
          if (!matchedTask) {
            const workSec = (json.workSection || "").toLowerCase().trim();
            const bank = (json.bankName || "").toLowerCase().trim();
            const type = (json.type || "").toLowerCase().trim();

            matchedTask = sameEmpDateTasks.find((t: any) => {
              const title = (t.taskTitle || "").toLowerCase().trim();
              const desc = (t.description || "").toLowerCase().trim();

              if (bank && (title.includes(bank) || desc.includes(bank))) return true;
              if (workSec && workSec !== "general" && (title.includes(workSec) || desc.includes(workSec))) return true;
              if (type && type !== "general" && (title.includes(type) || desc.includes(type))) return true;
              return false;
            });
          }

          // 3. Fallback: Take non-completed task or first matching task on that date
          if (!matchedTask) {
            matchedTask = sameEmpDateTasks.find((t: any) => (t.status || "").toLowerCase() !== "completed") || sameEmpDateTasks[0];
          }
        }

        let liveStatus = "Pending";
        if (matchedTask) {
          const tStatus = (matchedTask.status || "").toLowerCase().trim();

          if (tStatus === "completed" || tStatus === "done") {
            liveStatus = "Completed";
          } else if (tStatus === "pending") {
            liveStatus = "Pending";
          } else if (tStatus.includes("progress") || tStatus === "running" || matchedTask.timerState === "Running") {
            liveStatus = "In Progress";
          } else {
            liveStatus = "Pending";
          }
        } else if (sameEmpDateTasks.length > 0) {
          const hasInProgress = sameEmpDateTasks.some((t: any) => (t.status || "").toLowerCase().includes("progress"));
          const hasPending = sameEmpDateTasks.some((t: any) => (t.status || "").toLowerCase() === "pending");

          if (hasPending) liveStatus = "Pending";
          else if (hasInProgress) liveStatus = "In Progress";
          else liveStatus = "Completed";
        } else {
          const dbStatus = (json.status || "").toLowerCase().trim();
          if (dbStatus === "completed" || dbStatus === "done") {
            liveStatus = "Completed";
          } else if (dbStatus.includes("progress")) {
            liveStatus = "In Progress";
          } else {
            liveStatus = "Pending";
          }
        }

        if (json.status !== liveStatus) {
          LegalRecoverySchedule.update(
            {
              status: liveStatus,
              completedAt: liveStatus === "Completed" ? (json.completedAt || matchedTask?.updatedAt || new Date()) : null
            },
            { where: { id: json.id } }
          ).catch(() => {});
        }

        const liveProof = matchedTask?.proofAttachment || json.proofAttachment || null;
        const liveCompletedAt = liveStatus === "Completed" ? (json.completedAt || matchedTask?.updatedAt || new Date()) : null;
        const liveProgressNotes = matchedTask?.progressNotes || matchedTask?.followUpHistory || null;

        return {
          ...json,
          status: liveStatus,
          proofAttachment: liveProof,
          completedAt: liveCompletedAt,
          taskLog: matchedTask || null,
          progressNotes: liveProgressNotes
        };
      });

      // ALSO include unlinked direct TaskLog entries for these employees so that Schedule Work Report
      // and My Tasks (Kanban) pages match 100% identically for all tasks created!
      const matchedTaskIdsSet = new Set(
        enrichedSchedules.map((s: any) => String(s.taskId || s.id || "").trim()).filter(Boolean)
      );

      const unlinkedEmpTasks = empTasks.filter((t: any) => {
        const tId = String(t.id || "").trim();
        const sId = String(t.scheduleId || "").trim();
        if (tId && matchedTaskIdsSet.has(tId)) return false;
        if (sId && matchedTaskIdsSet.has(sId)) return false;
        return true;
      });

      if (unlinkedEmpTasks.length > 0) {
        const unlinkedUserIds = Array.from(new Set(unlinkedEmpTasks.map((t: any) => String(t.employee || t.forwardedTo || "").trim()).filter(Boolean)));
        let unlinkedUserMap = new Map();
        if (unlinkedUserIds.length > 0) {
          const uList = await User.findAll({ where: { id: { [Op.in]: unlinkedUserIds } }, attributes: ["id", "name", "email", "role"], raw: true });
          unlinkedUserMap = new Map(uList.map((u: any) => [String(u.id).trim(), u]));
        }

        const syntheticSchedules = unlinkedEmpTasks.map((t: any) => {
          const rawTaskObj = typeof t.toJSON === "function" ? t.toJSON() : t;
          const tEmp = String(t.employee || t.forwardedTo || "").trim();
          const userObj = unlinkedUserMap.get(tEmp) || null;
          const tDate = t.date ? new Date(t.date).toISOString().slice(0, 10) : (t.createdAt ? new Date(t.createdAt).toISOString().slice(0, 10) : "");
          const tTime = t.scheduledAt ? new Date(t.scheduledAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : "09:00 AM";

          const tStatusRaw = (t.status || "").toLowerCase().trim();
          let liveStatus = "Pending";
          if (tStatusRaw === "completed" || tStatusRaw === "done") liveStatus = "Completed";
          else if (tStatusRaw.includes("progress") || t.timerState === "Running") liveStatus = "In Progress";

          // Parse bank, branch, officer, AO, RBO from taskTitle / description
          const title = String(t.taskTitle || "");
          const desc = String(t.description || "");
          const combinedStr = `${title} ${desc}`;

          let parsedBank = null;
          let parsedBranch = null;
          let parsedAo = null;
          let parsedRbo = null;
          let parsedOfficer = null;
          let parsedPhone = null;

          const bankMatch = combinedStr.match(/Bank:\s*([^\|\n]+)/i) || combinedStr.match(/Bank\s*-\s*([^\|\n]+)/i);
          if (bankMatch) parsedBank = bankMatch[1].trim();

          const branchMatch = combinedStr.match(/Branch:\s*([^\|\n]+)/i) || combinedStr.match(/\(([^)]+)\)/);
          if (branchMatch) parsedBranch = branchMatch[1].trim();

          const aoMatch = combinedStr.match(/AO:\s*([^\|\n]+)/i);
          if (aoMatch) parsedAo = aoMatch[1].trim();

          const rboMatch = combinedStr.match(/RBO:\s*([^\|\n]+)/i);
          if (rboMatch) parsedRbo = rboMatch[1].trim();

          const officerMatch = combinedStr.match(/Officer:\s*([^(\|\n]+)/i);
          if (officerMatch) parsedOfficer = officerMatch[1].trim();

          const phoneMatch = combinedStr.match(/Phone:\s*([^\|\n]+)/i) || combinedStr.match(/\((\d{10})\)/);
          if (phoneMatch) parsedPhone = phoneMatch[1].trim();

          return {
            id: t.scheduleId || t.id,
            employeeId: tEmp,
            sodId: null,
            date: tDate,
            time: tTime,
            workSection: t.taskType || "General",
            type: t.taskType || "General",
            subType: null,
            status: liveStatus,
            remarks: t.description || t.taskTitle || "",
            details: t.description || t.taskTitle || "",
            bankName: parsedBank,
            branchName: parsedBranch,
            aoName: parsedAo,
            rboName: parsedRbo,
            officerName: parsedOfficer,
            officerPhone: parsedPhone,
            taskId: t.id,
            user: userObj,
            proofAttachment: t.proofAttachment || null,
            progressNotes: t.progressNotes || t.followUpHistory || null,
            taskLog: rawTaskObj
          };
        });

        enrichedSchedules = [...enrichedSchedules, ...syntheticSchedules];
      }
    } catch (tErr) {
      console.error("Error enriching schedules with TaskLog data:", tErr);
    }

    // Filter by date, type & status AFTER live TaskLog enrichment
    let finalSchedules = enrichedSchedules;

    if (dateParam && dateParam !== "all") {
      finalSchedules = finalSchedules.filter((s: any) => {
        const itemDateStr = String(s.date || "").trim();
        return itemDateStr === dateParam;
      });
    } else if (fromDate && toDate) {
      finalSchedules = finalSchedules.filter((s: any) => {
        const itemDateStr = String(s.date || "").trim();
        return itemDateStr >= fromDate && itemDateStr <= toDate;
      });
    } else if (fromDate) {
      finalSchedules = finalSchedules.filter((s: any) => {
        const itemDateStr = String(s.date || "").trim();
        return itemDateStr >= fromDate;
      });
    }

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
      const { date, time, workSection, type, subType, remarks, bankName, branchName, aoName, rboName, caseDetails, officerName, officerPhone, details, otherType } = item;
      const scheduleDate = date || new Date().toISOString().split("T")[0];
      const entryTime = time || "09:00 AM";
      const cleanWorkSection = (workSection || type || bankName || remarks || details || "Scheduled Work").trim();

      const entryId = "lrs_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5);
      const itemTaskId = await TaskLog.generateNextTaskId(userId);

      const taskTitle = `[${type || 'General'}] ${cleanWorkSection}${bankName ? ' - ' + bankName : ''}${branchName ? ' (' + branchName + ')' : ''}`;
      const taskDesc = `SOD Scheduled Work\nDate: ${scheduleDate} | Time: ${entryTime}\nType: ${type || 'General'}${subType ? ' (' + subType + ')' : ''}\nBank/NBFC: ${bankName || 'N/A'} | Branch: ${branchName || 'N/A'}\nAO: ${aoName || 'N/A'} | RBO: ${rboName || 'N/A'}${officerName ? '\nOfficer: ' + officerName + (officerPhone ? ' (' + officerPhone + ')' : '') : ''}\nDetails: ${details || remarks || 'N/A'}`;
      const itemDateObj = new Date(scheduleDate + "T00:00:00");

      const newRec = await LegalRecoverySchedule.create({
        id: entryId,
        employeeId: userId,
        sodId: sodId || item.sodId || null,
        date: scheduleDate,
        time: entryTime,
        workSection: cleanWorkSection,
        type: type || "General",
        subType: type === "Bank Related" ? (subType || "AO related") : (type === "Call" ? (subType || "Incoming Call") : null),
        status: "Pending",
        remarks: remarks || "",
        bankName: bankName || null,
        branchName: branchName || null,
        aoName: aoName || null,
        rboName: rboName || null,
        caseDetails: caseDetails || null,
        officerName: officerName || null,
        officerPhone: officerPhone || null,
        details: details || remarks || null,
        otherType: otherType || null,
        taskId: itemTaskId,
      });

      await TaskLog.create({
        id: itemTaskId,
        employee: userId,
        date: itemDateObj,
        scheduledAt: itemDateObj,
        taskTitle: taskTitle,
        taskType: type || "Operation",
        description: taskDesc,
        status: "Pending",
        timerState: "Running",
        timerStart: new Date(),
        elapsedSeconds: 0,
        scheduleId: entryId,
      }).catch(() => {});

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
