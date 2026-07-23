// Removed @ts-nocheck
export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import sequelize from "@/lib/sequelize";
import TaskLog from "@/models/sequelize/TaskLog";
import User from "@/models/sequelize/User";
import EmployeeProfile from "@/models/sequelize/EmployeeProfile";
import { logAudit } from "@/lib/audit";
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
      // Authenticate
      await sequelize.authenticate();

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
    } catch (daemonErr) {
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
    const fetchLimit = limitParam === "all" ? undefined : (parseInt(limitParam || "300", 10) || 300);

    const records = await TaskLog.findAll({
      where: query,
      order: [["createdAt", "DESC"]],
      limit: fetchLimit
    });

    const empIds = records.map((r: any) => r.employee).filter(Boolean);
    const fwdIds = records.map((r: any) => r.forwardedTo).filter(Boolean);
    const assignerIds = records.map((r: any) => r.assignedBy).filter(Boolean);
    const allUserIds = Array.from(new Set([...empIds, ...fwdIds, ...assignerIds]));

    const employees = await User.findAll({
      where: { id: { [Op.in]: allUserIds } },
      attributes: ["id", "name", "role"],
      raw: true
    });
    const empMap = new Map(employees.map((e: any) => [e.id, e]));

    const hydratedRecords = records.map((r: any) => {
      const plain = r.toJSON();
      plain.id = plain.id.toString();
      if (plain.employee) {
        const empDetail = empMap.get(plain.employee);
        plain.employee = empDetail ? { ...empDetail, id: empDetail.id } : { id: plain.employee, name: "Unknown", role: "Employee" };
      } else {
        plain.employee = { id: "unknown", name: "Unknown", role: "Employee" };
      }

      if (plain.forwardedTo) {
        const fwdDetail = empMap.get(plain.forwardedTo);
        plain.forwardedUser = fwdDetail ? { ...fwdDetail, id: fwdDetail.id } : { id: plain.forwardedTo, name: "Unknown", role: "Employee" };
      } else {
        plain.forwardedUser = null;
      }

      if (plain.assignedBy) {
        const assignerDetail = empMap.get(plain.assignedBy);
        plain.assignedByUser = assignerDetail ? { ...assignerDetail, id: assignerDetail.id } : { id: plain.assignedBy, name: "Owner", role: "Owner" };
      } else {
        plain.assignedByUser = null;
      }

      return plain;
    });

    return NextResponse.json({ success: true, data: hydratedRecords });
  } catch (error: any) {
    console.error("[/api/tasks GET] Error:", error?.message, error?.stack);
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
      scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      // Auto-start timer when task is created unless scheduled for future
      timerState: scheduledAt ? "Stopped" : "Running",
      timerStart: scheduledAt ? null : now,
      elapsedSeconds: 0,
    });

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

    let query: any = { id: taskId };
    // Only the "Owner" role has full access to edit any task. Other roles can only edit tasks they own or tasks forwarded to them.
    if (userRole !== "Owner") {
      query[Op.or] = [
        { employee: userId },
        { forwardedTo: userId }
      ];
    }

    const task = await TaskLog.findOne({ where: query });
    if (!task) {
      return NextResponse.json({ success: false, error: "Task not found" }, { status: 404 });
    }

    // Forward task date to a future date (preserves original date so task remains visible in today's list)
    if (targetDate) {
      const newD = new Date(targetDate);
      task.scheduledAt = newD;
      task.reminderSent = false;
      task.timerState = "Stopped";
      task.timerStart = null;
    }

    // Validation: To complete a task, progressNotes and proofAttachment must be filled
    if (status === "Completed") {
      const notesToCheck = progressNotes !== undefined ? progressNotes : task.progressNotes;
      if (!notesToCheck || !notesToCheck.trim()) {
        return NextResponse.json({ success: false, error: "Please write Progress Notes before marking this task as Completed." }, { status: 400 });
      }

      // Enforce Proof of Work
      const proofToCheck = proofAttachment !== undefined ? proofAttachment : task.proofAttachment;
      if (!proofToCheck || !proofToCheck.trim()) {
        return NextResponse.json({ success: false, error: "Upload Proof of Work (Screenshot/Photo) is mandatory to mark this task as Completed." }, { status: 400 });
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
    if (elapsedSeconds !== undefined) task.elapsedSeconds = elapsedSeconds;

    // Auto-stop timer when task is completed
    if (status === "Completed" && prevStatus !== "Completed") {
      const start = task.timerStart || task.createdAt || task.date;
      const startTime = start ? new Date(start).getTime() : Date.now();
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      task.elapsedSeconds = Math.max(0, elapsed);
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

    let query: any = { id: taskId };
    // Only the "Owner" role can delete any task. Other roles can only delete tasks they created.
    if (userRole !== "Owner") {
      query.employee = userId;
    }

    const task = await TaskLog.findOne({ where: query });
    if (!task) {
      return NextResponse.json({ success: false, error: "Task not found or unauthorized to delete" }, { status: 404 });
    }

    await task.destroy();

    return NextResponse.json({ success: true, message: "Task deleted successfully" });
  } catch (error: any) {
    console.error("Failed to delete task:", error);
    const msg = error.errors ? error.errors.map((e: any) => e.message).join(", ") : error.message;
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
