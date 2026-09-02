import { NextResponse } from "next/server";
import sequelize from "@/lib/sequelize";
import TaskLog from "@/models/sequelize/TaskLog";
import User from "@/models/sequelize/User";
import Notification from "@/models/sequelize/Notification";
import { sendEmail } from "@/lib/email";
import { Op } from "sequelize";
import EmployeeProfile from "@/models/sequelize/EmployeeProfile";

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
    const authorization = req.headers.get("authorization");
    if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET && authorization !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    await sequelize.authenticate();
    await TaskLog.sync();

    const now = new Date();
    // Include missed runs as well; reminderSent prevents duplicate delivery.
    const dueTasks = await TaskLog.findAll({
      where: {
        scheduledAt: { [Op.lte]: now },
        reminderSent: { [Op.or]: [false, null] },
        status: { [Op.notIn]: ["Cancelled", "Canceled"] },
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
        const alertRecipientIds = new Set<string>();

        // 1. Assigned Employee
        let assignedUserName = "Team Member";
        if (task.employee) {
          const emp = await User.findOne({ where: { id: task.employee }, raw: true }) as any;
          if (emp) {
            alertRecipientIds.add(String(emp.id));
            assignedUserName = emp.name || "Team Member";
            if (emp.email) recipients.push(emp.email);

            // Reporting Manager via EmployeeProfile
            const EmployeeProfile = (sequelize.models as any).EmployeeProfile || (await import("@/models/sequelize/EmployeeProfile")).default;
            const profile = await EmployeeProfile.findOne({
              where: { [Op.or]: [{ user: emp.id }, { employeeId: emp.id }] },
              raw: true,
            }) as any;

            if (profile?.reportingManager) {
              const mgrName = profile.reportingManager.trim();
              const managerUser = await User.findOne({
                where: {
                  [Op.or]: [
                    { name: { [Op.like]: `%${mgrName}%` } },
                    { email: { [Op.like]: `%${mgrName}%` } },
                  ],
                },
                raw: true,
              }) as any;
              if (managerUser?.email) recipients.push(managerUser.email);
            }
          }
        }

        // 2. Task Assigner / Creator (if different)
        const assignerId = task.assignedBy || task.createdById;
        if (assignerId && assignerId !== task.employee) {
          const assigner = await User.findOne({ where: { id: assignerId }, raw: true }) as any;
          if (assigner) alertRecipientIds.add(String(assigner.id));
          if (assigner?.email) recipients.push(assigner.email);
        }

        // 3. Forwarded user (if any)
        if (task.forwardedTo && task.forwardedTo !== task.employee) {
          const fwdUser = await User.findOne({ where: { id: task.forwardedTo }, raw: true }) as any;
          if (fwdUser) alertRecipientIds.add(String(fwdUser.id));
          if (fwdUser?.email) recipients.push(fwdUser.email);
        }

        // Security follow-ups additionally alert every active Owner/Director,
        // Security vertical/team member and Sales Head.
        if (/security/i.test(String(task.taskType || ""))) {
          const [users, profiles] = await Promise.all([
            User.findAll({ attributes: ["id", "name", "email", "role", "status"], raw: true }) as any,
            EmployeeProfile.findAll({ attributes: ["user", "employeeId", "designation", "department", "vertical"], raw: true }) as any,
          ]);
          const profileByUser = new Map<string, any>();
          (profiles as any[]).forEach((profile) => {
            if (profile.user) profileByUser.set(String(profile.user), profile);
            if (profile.employeeId) profileByUser.set(String(profile.employeeId), profile);
          });
          (users as any[]).filter((user) => {
            if (["inactive", "disabled", "terminated"].includes(String(user.status || "").toLowerCase())) return false;
            const profile = profileByUser.get(String(user.id)) || {};
            const identity = [user.role, profile.designation, profile.department, profile.vertical].filter(Boolean).join(" ");
            return /owner|director|sales\s*head|security|facility|guard/i.test(identity);
          }).forEach((user) => {
            alertRecipientIds.add(String(user.id));
            if (user.email) recipients.push(String(user.email));
          });
        }

        const uniqueRecipients = Array.from(new Set(recipients.filter(Boolean)));
        if (uniqueRecipients.length === 0 && alertRecipientIds.size === 0) continue;

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

        let emailDelivered = uniqueRecipients.length === 0;
        if (uniqueRecipients.length) {
          const emailResult = await sendEmail({
            to: uniqueRecipients,
            subject: `📅 Follow-up Reminder: ${task.taskTitle}`,
            html,
          });
          emailDelivered = Boolean(emailResult.success);
        }

        // Insert in-app notifications
        try {
          await Notification.sync();
          
          for (const recipientId of alertRecipientIds) {
            const notificationId = `followup_${new Date(task.scheduledAt).getTime()}_${task.id.replace(/[^a-zA-Z0-9]/g, "").slice(-18)}_${recipientId.replace(/[^a-zA-Z0-9]/g, "").slice(-18)}`;
            await Notification.findOrCreate({
              where: { id: notificationId },
              defaults: {
                id: notificationId,
                recipient: recipientId,
                title: `⏰ Follow-up Due: ${task.taskTitle}`,
                message: `Security follow-up is due now: ${task.taskTitle}. ${task.description || ""}`.trim(),
                read: false
              }
            });
          }
        } catch (notifErr) {
          console.error("Failed to create in-app notification for task reminder:", notifErr);
        }

        if (!emailDelivered) throw new Error("Follow-up email delivery failed; reminder will retry on next scheduler run");

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
