import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Op } from "sequelize";
import { authOptions } from "@/lib/auth";
import { safeAuthenticate } from "@/lib/sequelize";
import Notification from "@/models/sequelize/Notification";
import TaskLog from "@/models/sequelize/TaskLog";
import User from "@/models/sequelize/User";
import EmployeeProfile from "@/models/sequelize/EmployeeProfile";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const safePart = (value: unknown) => String(value || "na").replace(/[^a-zA-Z0-9]/g, "").slice(-28) || "na";
const effectiveDeadline = (task: any) => {
  if (task.deadlineAt) return new Date(task.deadlineAt);
  const created = new Date(task.createdAt || task.date || Date.now());
  const scheduled = task.scheduledAt ? new Date(task.scheduledAt) : null;
  const base = scheduled && !Number.isNaN(scheduled.getTime()) && scheduled > created ? scheduled : created;
  return new Date(base.getTime() + 2 * 60 * 60 * 1000);
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

  const users = await User.findAll({ attributes: ["id", "name", "role", "status"], raw: true });
  const profiles = await EmployeeProfile.findAll({ attributes: ["user", "employeeId", "department"], raw: true }) as any[];
  const activeUsers = users.filter((user: any) => !["inactive", "disabled", "terminated"].includes(String(user.status || "").toLowerCase()));
  const ownerIds = activeUsers.filter((user: any) => String(user.role || "").toLowerCase().includes("owner")).map((user: any) => String(user.id));
  const adminIds = activeUsers.filter((user: any) => /admin|director/i.test(String(user.role || ""))).map((user: any) => String(user.id));
  const profileByUser = new Map<string, any>();
  profiles.forEach(profile => { if (profile.user) profileByUser.set(String(profile.user), profile); if (profile.employeeId) profileByUser.set(String(profile.employeeId), profile); });
  const departmentManagers = activeUsers.filter((user: any) => /department manager/i.test(String(user.role || "")));
  const userNames = new Map(activeUsers.map((user: any) => [String(user.id), String(user.name || user.id)]));
  let created = 0;
  let skipped = 0;

  for (const task of tasks as any[]) {
    const currentAssignee = String(task.forwardedTo || task.employee || "").trim();
    const assigneeDepartment = String(profileByUser.get(currentAssignee)?.department || "");
    const managerIds = departmentManagers.filter((manager: any) => String(profileByUser.get(String(manager.id))?.department || "") === assigneeDepartment && assigneeDepartment).map((manager: any) => String(manager.id));
    const recipients = [...new Set([currentAssignee, ...ownerIds, ...adminIds, ...managerIds].filter(Boolean))];
    const assigneeName = userNames.get(currentAssignee) || currentAssignee || "Unassigned";
    const dueAt = effectiveDeadline(task);
    const reminderCycle = Math.max(0, Math.floor((now.getTime() - dueAt.getTime()) / (2 * 60 * 60 * 1000)));
    const dueLabel = dueAt ? new Date(dueAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "Not specified";

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
      if (wasCreated) created += 1; else skipped += 1;
    }
  }

  return { scanned: tasks.length, owners: ownerIds.length, admins: adminIds.length, notificationsCreated: created, duplicatesSkipped: skipped };
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
