// Removed @ts-nocheck
export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import sequelize from "@/lib/sequelize";
import TaskLog from "@/models/sequelize/TaskLog";
import User from "@/models/sequelize/User";
import EmployeeProfile from "@/models/sequelize/EmployeeProfile";
import { getRequestIp, logAudit } from "@/lib/audit";
import { sendEmail } from "@/lib/email";
import Notification from "@/models/sequelize/Notification";
import { Op } from "sequelize";

// ─── Background Reminder Daemon ──────────────────────────────────────────────
// Checks for due follow-up tasks every 30 seconds and sends emails.
// Works continuously inside the running Next.js dev server process.

let daemonStarted = (global as any).__reminderDaemonStarted || false;
const isServerless = process.env.VERCEL === "1" || process.env.NODE_ENV === "production";

if (!daemonStarted && !isServerless) {
  (global as any).__reminderDaemonStarted = true;
  console.log("⏰ [Task Reminder Daemon] Started background check interval (every 30s)...");

  setInterval(async () => {
    try {
      const now = new Date();
      // Look for tasks where scheduledAt is in the past and reminder not yet sent
      const dueTasks = await TaskLog.findAll({
        where: {
          scheduledAt: {
            [Op.lte]: now,
          },
          reminderSent: { [Op.or]: [false, null] },
        },
      }) as any[];

      if (dueTasks.length > 0) {
        console.log(`⏰ [Task Reminder Daemon] Found ${dueTasks.length} tasks with due reminders! Sending emails...`);
        const portalUrl = "https://hrms.cfi247.com/";

        for (const task of dueTasks) {
          try {
            const recipients: string[] = [];

            // 1. Owner
            const owner = await User.findOne({ where: { id: task.employee }, raw: true }) as any;
            if (owner?.email) recipients.push(owner.email);

            // 2. Forwarded user (if any)
            if (task.forwardedTo) {
              const fwdUser = await User.findOne({ where: { id: task.forwardedTo }, raw: true }) as any;
              if (fwdUser?.email) {
                recipients.push(fwdUser.email);
              }
            }

            if (recipients.length === 0) {
              // Mark reminderSent true even if no email so we don't query it forever
              task.reminderSent = true;
              await task.save();
              continue;
            }

            const scheduledLabel = new Date(task.scheduledAt).toLocaleString("en-IN", {
              day: "2-digit", month: "short", year: "numeric",
              hour: "2-digit", minute: "2-digit",
            });

            const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
  body{font-family:'Segoe UI',system-ui,sans-serif;background:#f1f5f9;margin:0;padding:0;color:#1e293b}
  .wrap{max-width:580px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 4px 20px rgba(0,0,0,.06)}
  .header{background:linear-gradient(135deg,#7c3aed 0%,#4f46e5 100%);padding:28px 24px;color:#fff;text-align:center}
  .header h1{margin:0;font-size:20px;font-weight:700}
  .header p{margin:6px 0 0;font-size:13px;opacity:.9}
  .body{padding:28px 24px}
  .badge{display:inline-block;padding:4px 12px;border-radius:999px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;background:#e0e7ff;color:#4338ca;margin-bottom:12px}
  .task-box{background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px;margin:16px 0}
  .task-box h2{margin:0 0 6px;font-size:16px;font-weight:700;color:#0f172a}
  .task-box p{margin:0;font-size:13px;color:#475569}
  .due{background:#fef3c7;border:1px solid #fde68a;border-radius:10px;padding:12px 16px;margin:16px 0;font-size:13px;font-weight:600;color:#92400e}
  .footer{background:#f8fafc;padding:16px 24px;text-align:center;font-size:11px;color:#94a3b8;border-top:1px solid #e2e8f0}
</style>
</head>
<body>
<div class="wrap">
  <div class="header">
    <h1>📅 Follow-up Reminder</h1>
    <p>Your scheduled task follow-up is due now</p>
  </div>
  <div class="body">
    <p>This is a reminder for your scheduled task follow-up:</p>
    <div class="badge">${task.taskType || "Task"}</div>
    <div class="task-box">
      <h2>${task.taskTitle}</h2>
      ${task.description ? `<p>${task.description}</p>` : ""}
    </div>
    <div class="due">
      ⏰ Scheduled Follow-up: <span>${scheduledLabel}</span>
    </div>
    <p>Please log in to the portal to update the task status and progress notes.</p>
    <p style="text-align:center;margin-top:20px">
      <a href="${portalUrl}" style="background:#4f46e5;color:#fff;padding:10px 24px;border-radius:8px;text-decoration:none;font-weight:700;font-size:13px">Open Portal →</a>
    </p>
  </div>
  <div class="footer">RS9 Group HRMS • This is an automated reminder</div>
</div>
</body></html>`;

            await sendEmail({
              to: recipients,
              subject: `📅 Task Follow-up Due – ${task.taskTitle}`,
              html,
            });

            task.reminderSent = true;
            await task.save();
          } catch (err) {
            console.error("Daemon email error for task:", task.id, err);
          }
        }
      }

      // ─── Overdue Deadline Check ───
      const overdueTasks = await TaskLog.findAll({
        where: {
          deadlineAt: {
            [Op.lte]: now,
          },
          status: { [Op.ne]: "Completed" },
          deadlineReminderSent: { [Op.or]: [false, null] },
        },
      }) as any[];

      if (overdueTasks.length > 0) {
        console.log(`⏰ [Task Reminder Daemon] Found ${overdueTasks.length} overdue tasks! Sending reminders...`);
        for (const task of overdueTasks) {
          try {
            const employee = await User.findOne({ where: { id: task.employee }, raw: true }) as any;
            if (employee && employee.email) {
              const deadlineLabel = new Date(task.deadlineAt).toLocaleString("en-IN", {
                day: "2-digit", month: "short", year: "numeric",
                hour: "2-digit", minute: "2-digit",
              });

              // Send Overdue Reminder Email
              await sendEmail({
                to: employee.email,
                subject: `⚠️ URGENT REMINDER: Task Overdue – ${task.taskTitle}`,
                html: `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
  body{font-family:'Segoe UI',system-ui,sans-serif;background:#f1f5f9;margin:0;padding:0;color:#1e293b}
  .wrap{max-width:580px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 4px 20px rgba(0,0,0,.06)}
  .header{background:linear-gradient(135deg,#e11d48 0%,#be123c 100%);padding:28px 24px;color:#fff;text-align:center}
  .header h1{margin:0;font-size:20px;font-weight:700}
  .header p{margin:6px 0 0;font-size:13px;opacity:.9}
  .body{padding:28px 24px}
  .badge{display:inline-block;padding:4px 12px;border-radius:999px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;background:#fff1f2;color:#be123c;margin-bottom:12px}
  .task-box{background:#fff1f2;border:1px solid #fecdd3;border-radius:12px;padding:16px;margin:16px 0}
  .task-box h2{margin:0 0 6px;font-size:16px;font-weight:700;color:#0f172a}
  .task-box p{margin:0;font-size:13px;color:#475569}
  .due{background:#ffe4e6;border:1px solid #fecdd3;border-radius:10px;padding:12px 16px;margin:16px 0;font-size:13px;font-weight:700;color:#9f1239}
  .footer{background:#f8fafc;padding:16px 24px;text-align:center;font-size:11px;color:#94a3b8;border-top:1px solid #e2e8f0}
</style>
</head>
<body>
<div class="wrap">
  <div class="header">
    <h1>⚠️ Task Overdue Reminder</h1>
    <p>Your task deadline has passed. Please complete it immediately.</p>
  </div>
  <div class="body">
    <p>Hello <strong>${employee.name || "Team Member"}</strong>,</p>
    <p>This is an urgent reminder that your task deadline has passed but the task is still not completed:</p>
    <div class="badge">${task.taskType || "Task"}</div>
    <div class="task-box">
      <h2>${task.taskTitle}</h2>
      ${task.description ? `<p>${task.description}</p>` : ""}
    </div>
    <div class="due">
      ⏰ Deadline was: <strong>${deadlineLabel}</strong>
    </div>
    <p>Please log in to the portal and complete the task as soon as possible.</p>
  </div>
  <div class="footer">RS9 Group HRMS • This is an automated reminder</div>
</div>
</body></html>`,
              });
            }

            // Create in-app notification
            await Notification.create({
              id: Date.now().toString() + Math.random().toString(36).substring(2, 8),
              recipient: task.employee,
              title: "Task Overdue Reminder",
              message: `Your task is past its deadline: ${task.taskTitle}. Please complete it now.`,
              read: false
            });

            task.deadlineReminderSent = true;
            await task.save();
          } catch (err) {
            console.error("Failed to process overdue reminder:", err);
          }
        }
      }
    } catch (daemonErr: any) {
      if (daemonErr?.name === "SequelizeConnectionAcquireTimeoutError" || daemonErr?.original?.name === "TimeoutError" || daemonErr?.message?.includes("timeout")) {
        return;
      }
      console.error("⏰ [Task Reminder Daemon] Loop Error:", daemonErr);
    }
  }, 30000);
}


// ─── Email Templates ─────────────────────────────────────────────────────────

function followupReminderHtml(params: {
  recipientName: string;
  taskTitle: string;
  taskType: string;
  description: string;
  scheduledAt: string;
  portalUrl: string;
}) {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
  body{font-family:'Segoe UI',system-ui,sans-serif;background:#f1f5f9;margin:0;padding:0;color:#1e293b}
  .wrap{max-width:580px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 4px 20px rgba(0,0,0,.06)}
  .header{background:linear-gradient(135deg,#7c3aed 0%,#4f46e5 100%);padding:28px 24px;color:#fff;text-align:center}
  .header h1{margin:0;font-size:20px;font-weight:700}
  .header p{margin:6px 0 0;font-size:13px;opacity:.9}
  .body{padding:28px 24px}
  .badge{display:inline-block;padding:4px 12px;border-radius:999px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;background:#e0e7ff;color:#4338ca;margin-bottom:12px}
  .task-box{background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px;margin:16px 0}
  .task-box h2{margin:0 0 6px;font-size:16px;font-weight:700;color:#0f172a}
  .task-box p{margin:0;font-size:13px;color:#475569}
  .due{background:#fef3c7;border:1px solid #fde68a;border-radius:10px;padding:12px 16px;margin:16px 0;font-size:13px;font-weight:600;color:#92400e}
  .due span{font-size:15px;font-weight:700;color:#b45309}
  .footer{background:#f8fafc;padding:16px 24px;text-align:center;font-size:11px;color:#94a3b8;border-top:1px solid #e2e8f0}
</style>
</head>
<body>
<div class="wrap">
  <div class="header">
    <h1>📅 Follow-up Reminder</h1>
    <p>Your scheduled task follow-up is due now</p>
  </div>
  <div class="body">
    <p>Hello <strong>${params.recipientName}</strong>,</p>
    <p>This is a reminder for your scheduled task follow-up:</p>
    <div class="badge">${params.taskType}</div>
    <div class="task-box">
      <h2>${params.taskTitle}</h2>
      ${params.description ? `<p>${params.description}</p>` : ""}
    </div>
    <div class="due">
      ⏰ Scheduled Follow-up: <span>${params.scheduledAt}</span>
    </div>
    <p>Please log in to the portal to update the task status and progress notes.</p>
    <p style="text-align:center;margin-top:20px">
      <a href="${params.portalUrl}" style="background:#4f46e5;color:#fff;padding:10px 24px;border-radius:8px;text-decoration:none;font-weight:700;font-size:13px">Open Portal →</a>
    </p>
  </div>
  <div class="footer">RS9 Group HRMS • This is an automated reminder</div>
</div>
</body></html>`;
}

function forwardTaskHtml(params: {
  fromName: string;
  toName: string;
  taskTitle: string;
  taskType: string;
  description: string;
  scheduledAt?: string;
  portalUrl: string;
}) {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
  body{font-family:'Segoe UI',system-ui,sans-serif;background:#f1f5f9;margin:0;padding:0;color:#1e293b}
  .wrap{max-width:580px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 4px 20px rgba(0,0,0,.06)}
  .header{background:linear-gradient(135deg,#0d9488 0%,#0891b2 100%);padding:28px 24px;color:#fff;text-align:center}
  .header h1{margin:0;font-size:20px;font-weight:700}
  .header p{margin:6px 0 0;font-size:13px;opacity:.9}
  .body{padding:28px 24px}
  .badge{display:inline-block;padding:4px 12px;border-radius:999px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;background:#ccfbf1;color:#0f766e;margin-bottom:12px}
  .task-box{background:#f0fdfa;border:1px solid #99f6e4;border-radius:12px;padding:16px;margin:16px 0}
  .task-box h2{margin:0 0 6px;font-size:16px;font-weight:700;color:#0f172a}
  .task-box p{margin:0;font-size:13px;color:#475569}
  .from-box{background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:10px 14px;margin:12px 0;font-size:13px;color:#475569}
  .due{background:#fef3c7;border:1px solid #fde68a;border-radius:10px;padding:10px 14px;margin:12px 0;font-size:13px;font-weight:600;color:#92400e}
  .footer{background:#f8fafc;padding:16px 24px;text-align:center;font-size:11px;color:#94a3b8;border-top:1px solid #e2e8f0}
</style>
</head>
<body>
<div class="wrap">
  <div class="header">
    <h1>📤 Task Forwarded to You</h1>
    <p>A task has been assigned to you</p>
  </div>
  <div class="body">
    <p>Hello <strong>${params.toName}</strong>,</p>
    <p><strong>${params.fromName}</strong> has forwarded the following task to you:</p>
    <div class="badge">${params.taskType}</div>
    <div class="task-box">
      <h2>${params.taskTitle}</h2>
      ${params.description ? `<p>${params.description}</p>` : ""}
    </div>
    <div class="from-box">👤 Forwarded by: <strong>${params.fromName}</strong></div>
    ${params.scheduledAt ? `<div class="due">⏰ Follow-up Reminder set for: <strong>${params.scheduledAt}</strong> — you will receive a reminder email at that time.</div>` : ""}
    <p>Please log in to the portal to view and action this task.</p>
    <p style="text-align:center;margin-top:20px">
      <a href="${params.portalUrl}" style="background:#0d9488;color:#fff;padding:10px 24px;border-radius:8px;text-decoration:none;font-weight:700;font-size:13px">Open Portal →</a>
    </p>
  </div>
  <div class="footer">RS9 Group HRMS • This is an automated notification</div>
</div>
</body></html>`;
}

// ─── GET ──────────────────────────────────────────────────────────────────────

// GET: Fetch all tasks (all time, not just today)
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const userRole = (session.user as any).role || "Employee";

    await sequelize.authenticate();
    const { searchParams } = new URL(req.url);
    const filterDate = searchParams.get("date");
    const range = searchParams.get("range");

    let query: any = {};
    if (filterDate) {
      const targetDate = new Date(filterDate);
      targetDate.setUTCHours(0, 0, 0, 0);
      const nextDay = new Date(targetDate);
      nextDay.setDate(nextDay.getDate() + 1);
      query.date = { [Op.gte]: targetDate, [Op.lt]: nextDay };
    } else if (range === "today") {
      const targetDate = new Date();
      targetDate.setHours(0, 0, 0, 0);
      const nextDay = new Date(targetDate);
      nextDay.setDate(nextDay.getDate() + 1);
      query.date = { [Op.gte]: targetDate, [Op.lt]: nextDay };
    } else if (range === "recent" || range === "3days") {
      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 3);
      recentDate.setHours(0, 0, 0, 0);
      query.date = { [Op.gte]: recentDate };
    }

    // Owner sees all tasks.
    // Managers (Department Manager or Reporting Manager) see their own tasks, tasks of their subordinates, and forwarded tasks.
    // Employees see their own tasks and forwarded tasks.
    if (userRole !== "Owner") {
      const managedUserIds = [userId];
      const loggedInProfile = await EmployeeProfile.findOne({ where: { user: userId } });
      const userName = session.user.name;

      const promises: Promise<any>[] = [];
      if (userRole === "Department Manager" && loggedInProfile?.department) {
        promises.push(
          EmployeeProfile.findAll({
            where: { department: loggedInProfile.department },
            attributes: ["user"],
            raw: true
          })
        );
      } else {
        promises.push(Promise.resolve([]));
      }

      if (userName) {
        promises.push(
          EmployeeProfile.findAll({
            where: { reportingManager: userName },
            attributes: ["user"],
            raw: true
          })
        );
      } else {
        promises.push(Promise.resolve([]));
      }

      const [deptProfiles, reportProfiles] = await Promise.all(promises);

      deptProfiles.forEach((p: any) => {
        if (p.user && !managedUserIds.includes(p.user)) {
          managedUserIds.push(p.user);
        }
      });
      reportProfiles.forEach((p: any) => {
        if (p.user && !managedUserIds.includes(p.user)) {
          managedUserIds.push(p.user);
        }
      });

      query[Op.or] = [
        { employee: { [Op.in]: managedUserIds } },
        { forwardedTo: userId }
      ];
    }

    const limitParam = searchParams.get("limit");
    // Return all tasks with NO limit unless a specific numeric limit parameter is passed
    const fetchLimit = (limitParam && limitParam !== "all" && !isNaN(Number(limitParam)))
      ? parseInt(limitParam, 10)
      : undefined;

    let records = await TaskLog.findAll({
      where: query,
      order: [["createdAt", "DESC"]],
      limit: fetchLimit
    });

    // ALSO merge any LegalRecoverySchedule entries for Legal Recovery & Security vertical users
    try {
      const LegalRecoverySchedule = (sequelize.models as any).LegalRecoverySchedule || (await import("@/models/sequelize/LegalRecoverySchedule")).default;
      const EmployeeProfile = (sequelize.models as any).EmployeeProfile || (await import("@/models/sequelize/EmployeeProfile")).default;
      await LegalRecoverySchedule.sync();
      
      const schQuery: any = {};
      if (userRole !== "Owner") {
        schQuery.employeeId = { [Op.in]: query[Op.or] ? (query[Op.or][0]?.employee?.[Op.in] || [userId]) : [userId] };
      }
      
      const schRecords = await LegalRecoverySchedule.findAll({ where: schQuery, raw: true });
      const existingTaskIds = new Set(records.map((r: any) => String(r.id || "").trim()));
      const existingSchIds = new Set(records.map((r: any) => String(r.scheduleId || "").trim()).filter(Boolean));

      // Find user IDs belonging to Legal Recovery or Security vertical/department
      const legalUserProfiles = await EmployeeProfile.findAll({
        where: {
          [Op.or]: [
            { vertical: { [Op.like]: "%legal%" } },
            { vertical: { [Op.like]: "%security%" } },
            { department: { [Op.like]: "%legal%" } },
            { department: { [Op.like]: "%security%" } }
          ]
        },
        attributes: ["user"],
        raw: true
      });
      const legalUserIds = new Set(legalUserProfiles.map((p: any) => String(p.user)));

      const missingSchs = schRecords.filter((s: any) => {
        const empIdStr = String(s.employeeId || "").trim();
        // Only merge LegalRecoverySchedule entries for Legal Recovery / Security staff
        if (!legalUserIds.has(empIdStr)) return false;

        const sId = String(s.id || "").trim();
        const tId = String(s.taskId || "").trim();
        if (sId && (existingTaskIds.has(sId) || existingSchIds.has(sId))) return false;
        if (tId && (existingTaskIds.has(tId) || existingSchIds.has(tId))) return false;
        return true;
      });

      if (missingSchs.length > 0) {
        const syntheticTasks = missingSchs.map((s: any) => {
          const taskTitle = `[${s.type || 'General'}] ${s.workSection || 'Scheduled Work'}${s.bankName ? ' - ' + s.bankName : ''}${s.branchName ? ' (' + s.branchName + ')' : ''}`;
          const taskDesc = `SOD Scheduled Work\nDate: ${s.date} | Time: ${s.time || '09:00 AM'}\nType: ${s.type || 'General'}${s.subType ? ' (' + s.subType + ')' : ''}\nBank/NBFC: ${s.bankName || 'N/A'} | Branch: ${s.branchName || 'N/A'}\nAO: ${s.aoName || 'N/A'} | RBO: ${s.rboName || 'N/A'}${s.officerName ? '\nOfficer: ' + s.officerName + (s.officerPhone ? ' (' + s.officerPhone + ')' : '') : ''}\nDetails: ${s.details || s.remarks || 'N/A'}`;
          
          return {
            id: s.taskId || s.id,
            employee: s.employeeId,
            date: s.date ? new Date(s.date + "T00:00:00") : new Date(),
            scheduledAt: s.date ? new Date(s.date + "T00:00:00") : new Date(),
            taskTitle: taskTitle,
            taskType: s.type || "General",
            description: taskDesc,
            status: s.status || "Pending",
            timerState: "Stopped",
            timerStart: null,
            elapsedSeconds: 0,
            scheduleId: s.id,
            proofAttachment: s.proofAttachment || null,
            progressNotes: s.progressNotes || null,
            createdAt: s.createdAt || new Date(),
            updatedAt: s.updatedAt || new Date()
          };
        });

        records = [...records, ...syntheticTasks as any];
      }
    } catch (schErr) {
      console.error("Error merging LegalRecoverySchedule into GET /api/tasks:", schErr);
    }

    const empIds = records.map((r: any) => r.employee).filter(Boolean);
    const fwdIds = records.map((r: any) => r.forwardedTo).filter(Boolean);
    const assignerIds = records.map((r: any) => r.assignedBy).filter(Boolean);
    const allocatorIds = records.map((r: any) => r.allocatedBy).filter(Boolean);
    const allUserIds = Array.from(new Set([...empIds, ...fwdIds, ...assignerIds, ...allocatorIds]));

    const employees = await User.findAll({
      where: {
        [Op.or]: [
          { id: { [Op.in]: allUserIds } },
          { email: { [Op.in]: allUserIds } },
          { name: { [Op.in]: allUserIds } }
        ]
      },
      attributes: ["id", "name", "role", "email"],
      raw: true
    });
    
    const empMap = new Map();
    employees.forEach((e: any) => {
      if (e.id) empMap.set(String(e.id), e);
      if (e.email) empMap.set(String(e.email).toLowerCase(), e);
      if (e.name) empMap.set(String(e.name).toLowerCase(), e);
    });

    const getEmpDetail = (val: any) => {
      if (!val) return null;
      const str = String(val).trim();
      if (empMap.has(str)) return empMap.get(str);
      if (empMap.has(str.toLowerCase())) return empMap.get(str.toLowerCase());
      
      if (typeof val === "string" && val.trim().length > 0 && val.toLowerCase() !== "unknown") {
        let cleanName = val.trim();
        if (cleanName.includes("@")) {
          cleanName = cleanName.split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, c => c.toUpperCase());
        }
        return { id: val, name: cleanName, role: "Employee" };
      }
      return null;
    };

    const hydratedRecords = records.map((r: any) => {
      const plain = typeof r.toJSON === "function" ? r.toJSON() : { ...r };
      plain.id = plain.id ? String(plain.id) : "";
      
      const empDetail = getEmpDetail(plain.employee) || getEmpDetail(plain.allocatedBy) || getEmpDetail(plain.assignedBy);
      if (empDetail) {
        plain.employee = { ...empDetail, id: empDetail.id || plain.employee };
      } else {
        plain.employee = { id: plain.employee || "unknown", name: "System User", role: "Employee" };
      }

      if (plain.forwardedTo) {
        const fwdDetail = getEmpDetail(plain.forwardedTo);
        plain.forwardedUser = fwdDetail ? { ...fwdDetail, id: fwdDetail.id } : { id: plain.forwardedTo, name: String(plain.forwardedTo), role: "Employee" };
      } else {
        plain.forwardedUser = null;
      }

      if (plain.assignedBy) {
        const assignerDetail = getEmpDetail(plain.assignedBy);
        plain.assignedByUser = assignerDetail ? { ...assignerDetail, id: assignerDetail.id } : { id: plain.assignedBy, name: "Owner", role: "Owner" };
      } else {
        plain.assignedByUser = null;
      }

      return plain;
    });

    return NextResponse.json({ success: true, data: hydratedRecords });
  } catch (error: any) {
    console.error("[/api/tasks GET] Error:", error?.message, error?.stack);
    if (error?.message?.includes("ETIMEDOUT") || error?.message?.includes("connect") || error?.code === "ETIMEDOUT") {
      return NextResponse.json({ success: true, data: [], error: "Database connection timeout" });
    }
    return NextResponse.json({ success: false, error: error.message, detail: error?.original?.message || error?.stack?.split('\n')[0] || "" }, { status: 500 });
  }
}

// ─── POST ─────────────────────────────────────────────────────────────────────

// POST: Add a new task
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const userRole = (session.user as any).role || "Employee";
    const userName = session.user.name || "Employee";
    const body = await req.json();
    const { taskTitle, taskType, description, status, employeeId, deadlineAt } = body;

    if (!taskTitle || !taskType) {
      return NextResponse.json({ success: false, error: "Missing required fields (Task Title, Task Type)" }, { status: 400 });
    }

    await sequelize.authenticate();
    const { scheduledAt } = body;

    const now = new Date();

    // Owner can assign tasks to other users
    let targetEmployeeId = userId;
    let assignedBy = null;
    if (userRole === "Owner" && employeeId) {
      targetEmployeeId = employeeId;
      assignedBy = userId;
    }

    let finalDeadlineAt = null;
    let calculatedDeadlineHours = null;
    if (deadlineAt) {
      finalDeadlineAt = new Date(deadlineAt);
      const diffMs = finalDeadlineAt.getTime() - now.getTime();
      calculatedDeadlineHours = Math.max(1, Math.round(diffMs / (1000 * 60 * 60)));
    }

    const nextId = await TaskLog.generateNextTaskId(targetEmployeeId);

    const record = await TaskLog.create({
      id: nextId,
      employee: targetEmployeeId,
      assignedBy,
      deadlineHours: calculatedDeadlineHours,
      deadlineAt: finalDeadlineAt,
      date: now,
      taskTitle,
      taskType,
      description: description || "",
      status: status || "Pending",
      proofAttachment: body.proofAttachment || body.attachmentUrl || null,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      // Auto-start timer when task is created
      timerState: (status === "Completed") ? "Stopped" : "Running",
      timerStart: (status === "Completed") ? null : now,
      elapsedSeconds: 0,
    });

    // Auto-create LegalRecoverySchedule entry so tasks created from My Tasks page appear in Schedule Work Report
    try {
      const LegalRecoverySchedule = (sequelize.models as any).LegalRecoverySchedule || (await import("@/models/sequelize/LegalRecoverySchedule")).default;
      await LegalRecoverySchedule.sync();
      const todayStr = now.toISOString().split("T")[0];
      const timeStr = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });

      await LegalRecoverySchedule.create({
        id: "lrs_task_" + record.id + "_" + Date.now(),
        employeeId: targetEmployeeId,
        sodId: null,
        date: scheduledAt ? new Date(scheduledAt).toISOString().split("T")[0] : todayStr,
        time: timeStr,
        workSection: taskTitle,
        type: ["AO related", "RBO related", "branch related", "case related"].includes(body.subType || "") ? "Bank Related" : (taskType || "General"),
        subType: body.subType || null,
        status: status || "Pending",
        remarks: description || "",
        details: description || "",
        bankName: body.bankName || null,
        branchName: body.branchName || null,
        aoName: body.aoName || null,
        rboName: body.rboName || null,
        caseDetails: body.caseDetails || null,
        proofAttachment: body.proofAttachment || body.attachmentUrl || null,
        taskId: record.id
      });
    } catch (lrsSyncErr) {
      console.error("Failed to sync created task to LegalRecoverySchedule:", lrsSyncErr);
    }

    // Notify assigned employee (if assigned by Owner to someone else)
    if (userRole === "Owner" && employeeId && employeeId !== userId) {
      try {
        const assignedUser = await User.findOne({ where: { id: employeeId }, raw: true }) as any;
        if (assignedUser && assignedUser.email) {
          const deadlineLabel = finalDeadlineAt
            ? new Date(finalDeadlineAt).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
            : "No deadline";

          const portalUrl = "https://hrms.cfi247.com/";

          await sendEmail({
            to: assignedUser.email,
            subject: `📥 New Task Assigned to You by ${userName} – ${taskTitle}`,
            html: `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
  body{font-family:'Segoe UI',system-ui,sans-serif;background:#f1f5f9;margin:0;padding:0;color:#1e293b}
  .wrap{max-width:580px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 4px 20px rgba(0,0,0,.06)}
  .header{background:linear-gradient(135deg,#db2777 0%,#be185d 100%);padding:28px 24px;color:#fff;text-align:center}
  .header h1{margin:0;font-size:20px;font-weight:700}
  .header p{margin:6px 0 0;font-size:13px;opacity:.9}
  .body{padding:28px 24px}
  .badge{display:inline-block;padding:4px 12px;border-radius:999px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;background:#fdf2f8;color:#be185d;margin-bottom:12px}
  .task-box{background:#fdf2f8;border:1px solid #fbcfe8;border-radius:12px;padding:16px;margin:16px 0}
  .task-box h2{margin:0 0 6px;font-size:16px;font-weight:700;color:#0f172a}
  .task-box p{margin:0;font-size:13px;color:#475569}
  .due{background:#fef3c7;border:1px solid #fde68a;border-radius:10px;padding:12px 16px;margin:16px 0;font-size:13px;font-weight:600;color:#92400e}
  .footer{background:#f8fafc;padding:16px 24px;text-align:center;font-size:11px;color:#94a3b8;border-top:1px solid #e2e8f0}
</style>
</head>
<body>
<div class="wrap">
  <div class="header">
    <h1>📥 New Task Assigned</h1>
    <p>A new task has been assigned to you by ${userName}</p>
  </div>
  <div class="body">
    <p>Hello <strong>${assignedUser.name || "Team Member"}</strong>,</p>
    <p>You have been assigned the following task by <strong>${userName}</strong>:</p>
    <div class="badge">${taskType}</div>
    <div class="task-box">
      <h2>${taskTitle}</h2>
      ${description ? `<p>${description}</p>` : ""}
    </div>
    <div class="due">
      ⏰ Deadline: <strong>${deadlineLabel}</strong>
    </div>
    <p>Please log in to the portal to start working on this task.</p>
    <p style="text-align:center;margin-top:20px">
      <a href="${portalUrl}" style="background:#be185d;color:#fff;padding:10px 24px;border-radius:8px;text-decoration:none;font-weight:700;font-size:13px">Open My Tasks →</a>
    </p>
  </div>
  <div class="footer">RS9 Group HRMS • This is an automated notification</div>
</div>
</body></html>`,
          });
        }

        // Send In-App Notification
        await Notification.sync();
        await Notification.create({
          id: Date.now().toString() + Math.random().toString(36).substring(2, 8),
          recipient: employeeId,
          title: "New Task Assigned",
          message: `${userName} assigned a task to you: ${taskTitle}`,
          read: false
        });
      } catch (err) {
        console.error("Failed to notify assigned user:", err);
      }
    }

    await logAudit({
      userId,
      action: "TASK_LOGGED",
      entity: "TaskLog",
      entityId: record.id.toString(),
      details: `${userName} logged a new task: ${taskTitle} (${taskType})`,
    });

    return NextResponse.json({ success: true, data: record });
  } catch (error: any) {
    console.error("Failed to add task:", error);
    const msg = error.errors ? error.errors.map((e: any) => e.message).join(", ") : error.message;
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

// ─── PUT ──────────────────────────────────────────────────────────────────────

// PUT: Update task — handles followup date/time and forwarding with emails
export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const userRole = (session.user as any).role || "Employee";
    const userName = session.user.name || "Employee";
    const body = await req.json();
    const { taskId, status, progressNotes, taskTitle, taskType, description, scheduledAt, forwardedTo, timerStart, timerState, elapsedSeconds, followUpHistory, proofAttachment, targetDate } = body;

    if (!taskId) {
      return NextResponse.json({ success: false, error: "Missing required field: taskId" }, { status: 400 });
    }

    await sequelize.authenticate();

    const userRoleLower = (userRole || "").toLowerCase().trim();
    const isOwnerOrAdmin = ["owner", "director", "hr head", "hr executive", "department manager", "it admin"].includes(userRoleLower);

    let query: any = { id: taskId };
    // Privileged roles can edit any task. Other roles can edit tasks assigned to them, forwarded to them, or created by them.
    if (!isOwnerOrAdmin) {
      query[Op.or] = [
        { employee: userId },
        { forwardedTo: userId },
        { assignedBy: userId }
      ];
    }

    let task = await TaskLog.findOne({ where: query });
    const LegalRecoverySchedule = (sequelize.models as any).LegalRecoverySchedule || (await import("@/models/sequelize/LegalRecoverySchedule")).default;
    await LegalRecoverySchedule.sync();

    let schRecord: any = null;
    if (!task) {
      let schQuery: any = { [Op.or]: [{ id: taskId }, { taskId: taskId }] };
      if (!isOwnerOrAdmin) {
        schQuery.employeeId = userId;
      }
      schRecord = await LegalRecoverySchedule.findOne({ where: schQuery });
      if (!schRecord) {
        return NextResponse.json({ success: false, error: "Task not found or unauthorized to edit" }, { status: 404 });
      }
    }

    if (schRecord && !task) {
      if (status !== undefined) schRecord.status = status;
      if (progressNotes !== undefined) schRecord.progressNotes = progressNotes;
      if (proofAttachment !== undefined) schRecord.proofAttachment = proofAttachment;
      if (timerState !== undefined) schRecord.timerState = timerState;
      if (timerStart !== undefined) schRecord.timerStart = timerStart ? new Date(timerStart) : null;
      if (elapsedSeconds !== undefined) schRecord.elapsedSeconds = elapsedSeconds;
      await schRecord.save();

      return NextResponse.json({
        success: true,
        message: "Task updated successfully",
        data: schRecord
      });
    }

    if (!task) {
      return NextResponse.json({ success: false, error: "Task not found or unauthorized to edit" }, { status: 404 });
    }

    const taskBeforeUpdate = task.toJSON();

    // Forward task date to a future date (preserves original date so task remains visible in today's list)
    if (targetDate) {
      const newD = new Date(targetDate);
      task.scheduledAt = newD;
      task.reminderSent = false;
      task.timerState = "Stopped";
      task.timerStart = null;
    }

    // Validation: To complete a task, progressNotes must be filled
    if (status === "Completed") {
      const notesToCheck = progressNotes !== undefined ? progressNotes : task.progressNotes;
      if (!notesToCheck || !notesToCheck.trim()) {
        if (isOwnerOrAdmin) {
          task.progressNotes = "Task completed by management";
        } else {
          return NextResponse.json({ success: false, error: "Please write Progress Notes before marking this task as Completed." }, { status: 400 });
        }
      }
    }

    const prevScheduledAt = task.scheduledAt;
    const prevForwardedTo = task.forwardedTo;
    const prevStatus = task.status;

    if (status !== undefined) task.status = status;
    if (progressNotes !== undefined) task.progressNotes = progressNotes;
    if (taskTitle !== undefined) task.taskTitle = taskTitle;
    if (taskType !== undefined) task.taskType = taskType;
    if (description !== undefined) task.description = description;
    if (proofAttachment !== undefined) task.proofAttachment = proofAttachment;
    if (scheduledAt !== undefined) {
      task.scheduledAt = scheduledAt ? new Date(scheduledAt) : null;
      if (scheduledAt) {
        task.timerState = "Stopped";
        task.timerStart = null;
      }
      if (scheduledAt !== prevScheduledAt) task.reminderSent = false;
    }
    if (forwardedTo !== undefined) task.forwardedTo = forwardedTo || null;
    if (followUpHistory !== undefined) task.followUpHistory = followUpHistory;

    // Manual timer updates if sent from client
    if (timerStart !== undefined) task.timerStart = timerStart ? new Date(timerStart) : null;
    if (timerState !== undefined) task.timerState = timerState;
    if (elapsedSeconds !== undefined && elapsedSeconds !== null) task.elapsedSeconds = Number(elapsedSeconds);
    if (body.completedAt) task.completedAt = new Date(body.completedAt);

    // Auto-stop timer when task is completed and preserve total completion duration
    if (status === "Completed") {
      const nowMs = Date.now();
      if (!task.completedAt) {
        task.completedAt = body.completedAt ? new Date(body.completedAt) : new Date(nowMs);
      }

      let accumulated = Number(task.elapsedSeconds) || 0;
      if (prevStatus !== "Completed") {
        if (task.timerStart && task.timerState === "Running") {
          const startTime = new Date(task.timerStart).getTime();
          if (!isNaN(startTime)) {
            const elapsed = Math.floor((nowMs - startTime) / 1000);
            accumulated = Math.max(0, accumulated + elapsed);
          }
        }
        // Fallback: If accumulated is still 0, calculate time difference from creation to completion
        if (accumulated <= 0) {
          const creationDate = task.createdAt || task.date;
          if (creationDate) {
            const creationMs = new Date(creationDate).getTime();
            if (!isNaN(creationMs) && creationMs > 0) {
              const diffSec = Math.floor((nowMs - creationMs) / 1000);
              if (diffSec > 0) accumulated = diffSec;
            }
          }
        }
        task.elapsedSeconds = accumulated;
      }
      task.timerState = "Stopped";
      task.timerStart = null;
    }

    // Auto-resume timer when task is moved back to Pending / In Progress
    if (status && status !== "Completed" && prevStatus === "Completed") {
      const baseSeconds = task.elapsedSeconds || 0;
      task.timerState = "Running";
      task.timerStart = new Date(Date.now() - baseSeconds * 1000);
    }

    await task.save();

    // Bi-directional status & proofAttachment sync to LegalRecoverySchedule
    try {
      const LegalRecoverySchedule = (sequelize.models as any).LegalRecoverySchedule || (await import("@/models/sequelize/LegalRecoverySchedule")).default;
      await LegalRecoverySchedule.sync();

      const schedulesToSync: any[] = [];

      // 1. Direct match by taskId or scheduleId
      const directMatches = await LegalRecoverySchedule.findAll({
        where: {
          [Op.or]: [
            { taskId: task.id },
            { id: task.id },
            ...(task.scheduleId ? [{ id: task.scheduleId }, { taskId: task.scheduleId }] : [])
          ]
        }
      });
      schedulesToSync.push(...directMatches);

      // 2. Fallback match by employeeId and workSection / bankName title match
      if (task.employee) {
        const empSchedules = await LegalRecoverySchedule.findAll({
          where: { employeeId: task.employee }
        });
        for (const sch of empSchedules) {
          if (schedulesToSync.some(s => s.id === sch.id)) continue;
          const schWork = (sch.workSection || "").toLowerCase().trim();
          const schBank = (sch.bankName || "").toLowerCase().trim();
          const schType = (sch.type || "").toLowerCase().trim();
          const tTitle = (task.taskTitle || "").toLowerCase().trim();
          const tDesc = (task.description || "").toLowerCase().trim();

          if (
            (schType && tTitle.includes(`[${schType}]`)) ||
            (schWork && (tTitle.includes(schWork) || tDesc.includes(schWork))) ||
            (schBank && schBank.length > 1 && (tTitle.includes(schBank) || tDesc.includes(schBank)))
          ) {
            schedulesToSync.push(sch);
          }
        }
      }

      for (const sch of schedulesToSync) {
        if (status !== undefined) {
          const rawSt = String(status).toLowerCase().trim();
          const mappedStatus = (rawSt === "completed" || rawSt === "done") ? "Completed" : (rawSt.includes("progress") || rawSt === "running") ? "In Progress" : "Pending";
          sch.status = mappedStatus;
          if (mappedStatus === "Completed") {
            if (!sch.completedAt) sch.completedAt = new Date();
          } else {
            sch.completedAt = null;
          }
        }
        if (proofAttachment !== undefined && proofAttachment) {
          sch.proofAttachment = proofAttachment;
        } else if (task.proofAttachment) {
          sch.proofAttachment = task.proofAttachment;
        }
        await sch.save();
      }
    } catch (syncErr) {
      console.error("Failed to sync task status to LegalRecoverySchedule:", syncErr);
    }

    const portalUrl = "https://hrms.cfi247.com/";

    // ── Email: Task forwarded to new user
    const isNewForward = forwardedTo && forwardedTo !== prevForwardedTo;
    if (isNewForward) {
      try {
        const forwardedUser = await User.findOne({ where: { id: forwardedTo }, raw: true }) as any;
        if (forwardedUser && forwardedUser.email) {
          const scheduledLabel = task.scheduledAt
            ? new Date(task.scheduledAt).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
            : undefined;

          await sendEmail({
            to: forwardedUser.email,
            subject: `📤 Task Forwarded to You by ${userName} – ${task.taskTitle}`,
            html: forwardTaskHtml({
              fromName: userName,
              toName: forwardedUser.name || "Team Member",
              taskTitle: task.taskTitle,
              taskType: task.taskType,
              description: task.description || "",
              scheduledAt: scheduledLabel,
              portalUrl,
            }),
          });
        }
      } catch (emailErr) {
        console.error("Forward email error:", emailErr);
        // Don't fail the whole request for email errors
      }
    }

    // In-app notifications
    if (isNewForward) {
      try {
        await Notification.sync();
        await Notification.create({
          id: Date.now().toString() + Math.random().toString(36).substring(2, 8),
          recipient: forwardedTo,
          title: "Task Forwarded to You",
          message: `${userName} forwarded a task to you: ${task.taskTitle}`,
          read: false
        });
      } catch (notifErr) {
        console.error("Task forwarding notification error:", notifErr);
      }
    }

    if (status === "Completed" && prevStatus !== "Completed" && task.employee !== userId) {
      try {
        const creator = await User.findByPk(task.employee);
        const creatorRole = creator?.role || "";
        const isManager = ["Department Manager", "department manager", "department-manager"].includes(creatorRole) || creatorRole.toLowerCase().includes("manager");

        if (!isManager) {
          await Notification.sync();
          await Notification.create({
            id: Date.now().toString() + Math.random().toString(36).substring(2, 8),
            recipient: task.employee,
            title: "Task Completed",
            message: `${userName} completed the task: ${task.taskTitle}`,
            read: false
          });
        }
      } catch (notifErr) {
        console.error("Task completion notification error:", notifErr);
      }
    }

    await logAudit({
      userId,
      userName,
      userRole,
      action: "UPDATE_TASK",
      entity: "TaskLog",
      entityId: String(task.id),
      details: `${userName} updated task: ${task.taskTitle}.`,
      ipAddress: getRequestIp(req),
      before: taskBeforeUpdate,
      after: task.toJSON(),
    });

    return NextResponse.json({ success: true, data: task });
  } catch (error: any) {
    console.error("Failed to update task:", error);
    const msg = error.errors ? error.errors.map((e: any) => e.message).join(", ") : error.message;
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

// ─── DELETE ───────────────────────────────────────────────────────────────────

// DELETE: Delete a task
export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const userRole = (session.user as any).role || "Employee";
    const { searchParams } = new URL(req.url);
    const taskId = searchParams.get("taskId");

    if (!taskId) {
      return NextResponse.json({ success: false, error: "Missing required query parameter: taskId" }, { status: 400 });
    }

    await sequelize.authenticate();

    const userRoleLower = (userRole || "").toLowerCase().trim();
    const isOwnerOrAdmin = ["owner", "director", "hr head", "hr executive", "department manager", "it admin"].includes(userRoleLower);

    let query: any = { [Op.or]: [{ id: taskId }, { scheduleId: taskId }] };
    // Privileged roles can delete any task. Other roles can delete tasks assigned to them or created by them.
    if (!isOwnerOrAdmin) {
      query[Op.and] = [
        { [Op.or]: [{ id: taskId }, { scheduleId: taskId }] },
        { [Op.or]: [{ employee: userId }, { assignedBy: userId }] }
      ];
    }

    const task = await TaskLog.findOne({ where: query });
    const LegalRecoverySchedule = (sequelize.models as any).LegalRecoverySchedule || (await import("@/models/sequelize/LegalRecoverySchedule")).default;
    await LegalRecoverySchedule.sync();

    let schQuery: any = { [Op.or]: [{ id: taskId }, { taskId: taskId }] };
    if (!isOwnerOrAdmin) {
      schQuery.employeeId = userId;
    }
    const schRecord = await LegalRecoverySchedule.findOne({ where: schQuery });

    if (!task && !schRecord) {
      return NextResponse.json({ success: false, error: "Task not found or unauthorized to delete" }, { status: 404 });
    }

    if (task) {
      await task.destroy();
    }
    if (schRecord) {
      await schRecord.destroy();
    }

    return NextResponse.json({ success: true, message: "Task deleted successfully" });
  } catch (error: any) {
    console.error("Failed to delete task:", error);
    const msg = error.errors ? error.errors.map((e: any) => e.message).join(", ") : error.message;
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
