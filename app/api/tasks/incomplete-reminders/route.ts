import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Op } from "sequelize";
import { authOptions } from "@/lib/auth";
import { safeAuthenticate } from "@/lib/sequelize";
import Notification from "@/models/sequelize/Notification";
import TaskLog from "@/models/sequelize/TaskLog";
import User from "@/models/sequelize/User";
import EmployeeProfile from "@/models/sequelize/EmployeeProfile";
import { sendEmail } from "@/lib/email";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const safePart = (value: unknown) => String(value || "na").replace(/[^a-zA-Z0-9]/g, "").slice(-28) || "na";
const escapeHtml = (value: unknown) => String(value ?? "")
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;");

const effectiveDeadline = (task: any) => {
  if (task.deadlineAt) return new Date(task.deadlineAt);
  const created = new Date(task.createdAt || task.date || Date.now());
  const scheduled = task.scheduledAt ? new Date(task.scheduledAt) : null;
  const base = scheduled && !Number.isNaN(scheduled.getTime()) && scheduled > created ? scheduled : created;
  return new Date(base.getTime() + 2 * 60 * 60 * 1000);
};

const formatIndiaDateTime = (value: Date | string | null | undefined) => {
  if (!value) return "Not specified";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "Not specified";
  return date.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const readableWorkDetail = (task: any) => {
  const direct = String(task.description || "").trim();
  if (direct) return direct;

  const parts = [
    task.personName ? `Person: ${task.personName}` : "",
    task.companyName ? `Company: ${task.companyName}` : "",
    task.contactNo ? `Contact: ${task.contactNo}` : "",
    task.emailAddress ? `Email: ${task.emailAddress}` : "",
    task.visitLocation ? `Location: ${task.visitLocation}` : "",
    task.salesReason ? `Purpose: ${task.salesReason}` : "",
    task.callStatus ? `Call status: ${task.callStatus}` : "",
  ].filter(Boolean);
  if (parts.length) return parts.join(" | ");

  const notes = String(task.progressNotes || "").trim();
  if (notes) return notes;
  return "No remarks/details were entered.";
};

const detailRow = (label: string, value: unknown) => {
  const text = String(value ?? "").trim();
  if (!text) return "";
  return `<tr><td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;color:#64748b;font-size:12px;font-weight:700;text-transform:uppercase;width:150px">${escapeHtml(label)}</td><td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;color:#0f172a;font-size:13px;font-weight:600">${escapeHtml(text)}</td></tr>`;
};

const overdueTaskEmailHtml = ({
  recipientName,
  assigneeName,
  creatorName,
  task,
  dueLabel,
  overdueHours,
  portalUrl,
}: {
  recipientName: string;
  assigneeName: string;
  creatorName: string;
  task: any;
  dueLabel: string;
  overdueHours: string;
  portalUrl: string;
}) => {
  const rows = [
    detailRow("Task ID", task.id),
    detailRow("Task", task.taskTitle || "Untitled task"),
    detailRow("Type", task.taskType || "General"),
    detailRow("Status", task.status || "Pending"),
    detailRow("Assigned To", assigneeName),
    detailRow("Created / Assigned By", creatorName),
    detailRow("Entry Date", formatIndiaDateTime(task.date || task.createdAt)),
    detailRow("Deadline", dueLabel),
    detailRow("Overdue Since", overdueHours),
    detailRow("Remarks / Details", readableWorkDetail(task)),
    detailRow("Person", task.personName),
    detailRow("Contact", task.contactNo),
    detailRow("Company", task.companyName),
    detailRow("Email", task.emailAddress),
    detailRow("Location", task.visitLocation),
    detailRow("Call Status", task.callStatus),
    detailRow("Sales Reason", task.salesReason),
  ].filter(Boolean).join("");

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,sans-serif;color:#1f2937">
  <div style="max-width:720px;margin:28px auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:14px;overflow:hidden">
    <div style="background:#991b1b;color:#ffffff;padding:22px 24px">
      <h1 style="margin:0;font-size:20px">Task Pending After 2 Hours</h1>
      <p style="margin:6px 0 0;font-size:13px;opacity:.92">${escapeHtml(assigneeName)} ka kaam abhi complete/update nahi hua.</p>
    </div>
    <div style="padding:22px 24px">
      <p style="margin:0 0 14px;font-size:14px">Hello <strong>${escapeHtml(recipientName)}</strong>,</p>
      <p style="margin:0 0 16px;font-size:14px;line-height:1.6">
        <strong>${escapeHtml(assigneeName)}</strong> ka task <strong>${escapeHtml(task.taskTitle || "Untitled task")}</strong>
        2 ghante ke baad bhi <strong>${escapeHtml(task.status || "Pending")}</strong> hai.
      </p>
      <table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden">${rows}</table>
      <p style="text-align:center;margin:22px 0 4px">
        <a href="${escapeHtml(portalUrl)}" style="display:inline-block;background:#991b1b;color:#fff;padding:11px 20px;border-radius:8px;text-decoration:none;font-weight:700;font-size:13px">Open Task Dashboard</a>
      </p>
    </div>
    <div style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:14px 24px;text-align:center;font-size:11px;color:#64748b">RS9 Group HRMS · Automated task escalation</div>
  </div>
</body></html>`;
};

async function isAuthorized(request: Request) {
  const configuredSecret = process.env.CRON_SECRET;
  const url = new URL(request.url);
  const suppliedSecret = url.searchParams.get("secret");
  const authorization = request.headers.get("authorization");
  if (configuredSecret && (suppliedSecret === configuredSecret || authorization === `Bearer ${configuredSecret}`)) return true;

  const session = await getServerSession(authOptions);
  const role = String((session?.user as any)?.role || "").toLowerCase();
  return role.includes("owner") || role.includes("director");
}

async function runIncompleteTaskReminder() {
  if (!(await safeAuthenticate(8000))) throw new Error("Database unavailable");
  await Notification.sync();

  const now = new Date();
  const incompleteTasks = await TaskLog.findAll({
    where: {
      status: { [Op.notIn]: ["Completed", "Cancelled", "Canceled"] },
    },
    order: [["updatedAt", "ASC"]],
  });
  const tasks = (incompleteTasks as any[]).filter(task => effectiveDeadline(task) <= now);

  const users = await User.findAll({ attributes: ["id", "name", "email", "role", "status"], raw: true });
  const profiles = await EmployeeProfile.findAll({ attributes: ["user", "employeeId", "department"], raw: true }) as any[];
  const activeUsers = users.filter((user: any) => !["inactive", "disabled", "terminated"].includes(String(user.status || "").toLowerCase()));
  const ownerIds = activeUsers.filter((user: any) => String(user.role || "").toLowerCase().includes("owner")).map((user: any) => String(user.id));
  const adminIds = activeUsers.filter((user: any) => /admin|director/i.test(String(user.role || ""))).map((user: any) => String(user.id));
  const profileByUser = new Map<string, any>();
  profiles.forEach(profile => { if (profile.user) profileByUser.set(String(profile.user), profile); if (profile.employeeId) profileByUser.set(String(profile.employeeId), profile); });
  const departmentManagers = activeUsers.filter((user: any) => /department manager/i.test(String(user.role || "")));
  const userNames = new Map(activeUsers.map((user: any) => [String(user.id), String(user.name || user.id)]));
  const usersById = new Map(activeUsers.map((user: any) => [String(user.id), user]));
  let created = 0;
  let skipped = 0;
  let emailsSent = 0;
  let emailFailures = 0;
  const portalUrl = `${String(process.env.NEXTAUTH_URL || "https://hrms.cfi247.com").replace(/\/$/, "")}/dashboard/my-tasks`;

  for (const task of tasks as any[]) {
    const currentAssignee = String(task.forwardedTo || task.employee || "").trim();
    const assigneeDepartment = String(profileByUser.get(currentAssignee)?.department || "");
    const managerIds = departmentManagers.filter((manager: any) => String(profileByUser.get(String(manager.id))?.department || "") === assigneeDepartment && assigneeDepartment).map((manager: any) => String(manager.id));
    const recipients = [...new Set([currentAssignee, ...ownerIds, ...adminIds, ...managerIds].filter(Boolean))];
    const assigneeName = userNames.get(currentAssignee) || currentAssignee || "Unassigned";
    const creatorId = String(task.assignedBy || task.createdById || "").trim();
    const creatorName = userNames.get(creatorId) || creatorId || "Self / System";
    const dueAt = effectiveDeadline(task);
    const reminderCycle = Math.max(0, Math.floor((now.getTime() - dueAt.getTime()) / (2 * 60 * 60 * 1000)));
    const dueLabel = formatIndiaDateTime(dueAt);
    const overdueHours = `${Math.max(2, Math.floor((now.getTime() - dueAt.getTime()) / (60 * 60 * 1000)))} hour(s)`;

    for (const recipient of recipients) {
      const isManagerCopy = recipient !== currentAssignee;
      const id = `inc2h_${reminderCycle}_${safePart(task.id)}_${safePart(recipient)}`;
      const [, wasCreated] = await Notification.findOrCreate({
        where: { id },
        defaults: {
          id,
          recipient,
          title: isManagerCopy ? `Overdue work: ${task.taskTitle || task.id}` : `Your work is still pending: ${task.taskTitle || task.id}`,
          message: isManagerCopy
            ? `${assigneeName}'s task is still ${task.status || "Pending"}. Due: ${dueLabel}. Task ID: ${task.id}.`
            : `This task is still ${task.status || "Pending"}. Due: ${dueLabel}. Please update or complete it. Task ID: ${task.id}.`,
          read: false,
        },
      });
      if (wasCreated) {
        created += 1;
        const recipientUser = usersById.get(String(recipient));
        if (recipientUser?.email) {
          const emailResult = await sendEmail({
            to: String(recipientUser.email),
            subject: `Pending Task: ${assigneeName} - ${task.taskTitle || task.id}`,
            html: overdueTaskEmailHtml({
              recipientName: recipientUser.name || "Team",
              assigneeName,
              creatorName,
              task,
              dueLabel,
              overdueHours,
              portalUrl,
            }),
          });
          if (emailResult.success) emailsSent += 1;
          else emailFailures += 1;
        }
      } else {
        skipped += 1;
      }
    }
  }

  return { scanned: tasks.length, owners: ownerIds.length, admins: adminIds.length, notificationsCreated: created, duplicatesSkipped: skipped, emailsSent, emailFailures };
}

export async function GET(request: Request) {
  try {
    if (!(await isAuthorized(request))) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ success: true, ...(await runIncompleteTaskReminder()) });
  } catch (error: any) {
    console.error("[/api/tasks/incomplete-reminders]", error);
    return NextResponse.json({ success: false, error: error.message || "Reminder scan failed" }, { status: 500 });
  }
}
