// Removed @ts-nocheck
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import sequelize from "@/lib/sequelize";
import TaskLog from "@/models/sequelize/TaskLog";
import User from "@/models/sequelize/User";
import { logAudit } from "@/lib/audit";
import { sendEmail } from "@/lib/email";
import { Op } from "sequelize";

// ─── Background Reminder Daemon ──────────────────────────────────────────────
// Checks for due follow-up tasks every 30 seconds and sends emails.
// Works continuously inside the running Next.js dev server process.

let daemonStarted = (global as any).__reminderDaemonStarted || false;

if (!daemonStarted) {
  (global as any).__reminderDaemonStarted = true;
  console.log("⏰ [Task Reminder Daemon] Started background check interval (every 30s)...");

  setInterval(async () => {
    try {
      // Authenticate and sync model
      await sequelize.authenticate();
      await TaskLog.sync({ alter: true });

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
    <div class="due">⏰ Follow-up was scheduled for: <strong>${scheduledLabel}</strong></div>
    ${task.forwardedTo ? `<p>⚠️ This task has been forwarded. Please coordinate accordingly.</p>` : ""}
    <p style="text-align:center;margin-top:20px">
      <a href="${portalUrl}" style="background:#4f46e5;color:#fff;padding:10px 24px;border-radius:8px;text-decoration:none;font-weight:700;font-size:13px">Open Portal →</a>
    </p>
  </div>
  <div class="footer">RS9 Group HRMS • Automated follow-up reminder</div>
</div>
</body></html>`;

            await sendEmail({
              to: [...new Set(recipients)],
              subject: `📅 Follow-up Reminder: ${task.taskTitle}`,
              html,
            });

            task.reminderSent = true;
            await task.save();
            console.log(`⏰ [Task Reminder Daemon] Successfully sent reminder email for task: ${task.taskTitle}`);
          } catch (err) {
            console.error(`⏰ [Task Reminder Daemon] Error for task ${task.id}:`, err);
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

    let query: any = {};
    if (filterDate) {
      const targetDate = new Date(filterDate);
      targetDate.setUTCHours(0, 0, 0, 0);
      const nextDay = new Date(targetDate);
      nextDay.setDate(nextDay.getDate() + 1);
      query.date = { [Op.gte]: targetDate, [Op.lt]: nextDay };
    }
    
    // Only the "Owner" role sees all tasks. Everyone else (Employee, Department Manager, HR, Director, etc.) sees only their own tasks.
    if (userRole !== "Owner") {
      query[Op.or] = [
        { employee: userId },
        { forwardedTo: userId }
      ];
    }

    const records = await TaskLog.findAll({ 
      where: query,
      order: [["createdAt", "DESC"]]
    });

    const empIds = records.map((r: any) => r.employee).filter(Boolean);
    const fwdIds = records.map((r: any) => r.forwardedTo).filter(Boolean);
    const allUserIds = Array.from(new Set([...empIds, ...fwdIds]));

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
      return plain;
    });

    return NextResponse.json({ success: true, data: hydratedRecords });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
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
    const userName = session.user.name || "Employee";
    const body = await req.json();
    const { taskTitle, taskType, description, status } = body;

    if (!taskTitle || !taskType) {
      return NextResponse.json({ success: false, error: "Missing required fields (Task Title, Task Type)" }, { status: 400 });
    }

    await sequelize.authenticate();
    await TaskLog.sync({ alter: true });

    const { scheduledAt } = body;

    const now = new Date();
    const record = await TaskLog.create({
      employee: userId,
      date: now,
      taskTitle,
      taskType,
      description: description || "",
      status: status || "Pending",
      scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      // Auto-start timer when task is created
      timerState: "Running",
      timerStart: now,
      elapsedSeconds: 0,
    });

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
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
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
    const { taskId, status, progressNotes, taskTitle, taskType, description, scheduledAt, forwardedTo, timerStart, timerState, elapsedSeconds } = body;

    if (!taskId) {
      return NextResponse.json({ success: false, error: "Missing required field: taskId" }, { status: 400 });
    }

    await sequelize.authenticate();
    await TaskLog.sync({ alter: true });

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

    // Validation: To complete a task, progressNotes must be filled
    if (status === "Completed") {
      const notesToCheck = progressNotes !== undefined ? progressNotes : task.progressNotes;
      if (!notesToCheck || !notesToCheck.trim()) {
        return NextResponse.json({ success: false, error: "Please write Progress Notes before marking this task as Completed." }, { status: 400 });
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
    if (scheduledAt !== undefined) {
      task.scheduledAt = scheduledAt ? new Date(scheduledAt) : null;
      if (scheduledAt !== prevScheduledAt) task.reminderSent = false;
    }
    if (forwardedTo !== undefined) task.forwardedTo = forwardedTo || null;
    
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

    return NextResponse.json({ success: true, data: task });
  } catch (error: any) {
    console.error("Failed to update task:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
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
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
