import { NextResponse } from "next/server";
import sequelize from "@/lib/sequelize";
import TaskLog from "@/models/sequelize/TaskLog";
import User from "@/models/sequelize/User";
import { sendEmail } from "@/lib/email";
import { Op } from "sequelize";

export const dynamic = "force-dynamic";

/**
 * GET /api/tasks/remind
 *
 * This endpoint should be called every minute via an external cron job
 * (e.g., cPanel cron, Vercel cron, or UptimeRobot).
 *
 * It finds all tasks whose scheduledAt is in the past 5 minutes and
 * haven't sent a reminder yet, then sends emails to:
 *  1. The task owner
 *  2. The forwarded user (if any)
 *
 * It marks the task with reminderSent = true to avoid duplicate mails.
 *
 * CRON EXPRESSION (every 5 minutes):  * /5 * * * *
 * URL to hit: GET https://yourdomain.com/api/tasks/remind?secret=CRON_SECRET
 */
export async function GET(req: Request) {
  try {
    // Optional secret to protect the endpoint from public access
    const { searchParams } = new URL(req.url);
    const secret = searchParams.get("secret");
    if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    await sequelize.authenticate();
    await TaskLog.sync({ alter: true });

    const now = new Date();
    const windowStart = new Date(now.getTime() - 5 * 60 * 1000); // 5 min ago

    // Find tasks where scheduledAt is within last 5 minutes and reminder not sent yet
    const dueTasks = await TaskLog.findAll({
      where: {
        scheduledAt: {
          [Op.gte]: windowStart,
          [Op.lte]: now,
        },
        reminderSent: { [Op.or]: [false, null] },
      },
    }) as any[];

    if (dueTasks.length === 0) {
      return NextResponse.json({ success: true, message: "No due reminders", sent: 0 });
    }

    const portalUrl = "https://hrms.cfi247.com/";
    let sentCount = 0;

    for (const task of dueTasks) {
      try {
        const recipients: string[] = [];

        // 1. Owner
        const owner = await User.findOne({ where: { id: task.employee }, raw: true }) as any;
        if (owner?.email) recipients.push(owner.email);

        // 2. Forwarded user (if any)
        let forwardedUserEmail: string | null = null;
        if (task.forwardedTo) {
          const fwdUser = await User.findOne({ where: { id: task.forwardedTo }, raw: true }) as any;
          if (fwdUser?.email) {
            recipients.push(fwdUser.email);
            forwardedUserEmail = fwdUser.email;
          }
        }

        if (recipients.length === 0) continue;

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

        // Mark reminder as sent
        task.reminderSent = true;
        await task.save();
        sentCount++;
      } catch (err) {
        console.error(`Reminder error for task ${task.id}:`, err);
      }
    }

    return NextResponse.json({ success: true, message: `Sent ${sentCount} reminder(s)`, sent: sentCount });
  } catch (error: any) {
    console.error("Remind cron error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
