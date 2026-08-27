import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Op } from "sequelize";
import { authOptions } from "@/lib/auth";
import { safeAuthenticate } from "@/lib/sequelize";
import EmployeeProfile from "@/models/sequelize/EmployeeProfile";
import TaskLog from "@/models/sequelize/TaskLog";
import User from "@/models/sequelize/User";

export const dynamic = "force-dynamic";

const deadlineOf = (task: any) => {
  if (task.deadlineAt) return new Date(task.deadlineAt);
  const created = new Date(task.createdAt || task.date || Date.now());
  const scheduled = task.scheduledAt ? new Date(task.scheduledAt) : null;
  const base = scheduled && !Number.isNaN(scheduled.getTime()) && scheduled > created ? scheduled : created;
  return new Date(base.getTime() + 2 * 60 * 60 * 1000);
};

const readableWorkDetail = (task: any) => {
  const direct = String(task.description || "").trim();
  if (direct) return direct;

  const parts = [
    task.personName ? `Contact ${task.personName}` : "",
    task.companyName ? `Company: ${task.companyName}` : "",
    task.contactNo ? `Call: ${task.contactNo}` : "",
    task.visitLocation ? `Location: ${task.visitLocation}` : "",
    task.salesReason ? `Purpose: ${task.salesReason}` : "",
    task.callStatus ? `Call status: ${task.callStatus}` : "",
  ].filter(Boolean);
  if (parts.length) return parts.join(" · ");

  const notes = String(task.progressNotes || "").trim();
  if (notes) return notes;
  return `Complete the assigned task: ${task.taskTitle || "Untitled task"}`;
};

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    if (!(await safeAuthenticate(6000))) return NextResponse.json({ success: false, error: "Database unavailable" }, { status: 503 });

    const userId = String((session.user as any).id || "");
    const role = String((session.user as any).role || "").toLowerCase();
    const [tasks, users, profiles] = await Promise.all([
      TaskLog.findAll({ where: { status: { [Op.notIn]: ["Completed", "Cancelled", "Canceled"] } }, order: [["createdAt", "ASC"]], raw: true }),
      User.findAll({ attributes: ["id", "name"], raw: true }),
      EmployeeProfile.findAll({ attributes: ["user", "employeeId", "department"], raw: true }),
    ]);
    const userNames = new Map((users as any[]).map(user => [String(user.id), String(user.name || user.id)]));
    const profileByUser = new Map<string, any>();
    (profiles as any[]).forEach(profile => { if (profile.user) profileByUser.set(String(profile.user), profile); if (profile.employeeId) profileByUser.set(String(profile.employeeId), profile); });
    const viewerDepartment = String(profileByUser.get(userId)?.department || "");
    const canSeeAll = /owner|director|admin/.test(role);
    const isDepartmentManager = role.includes("department manager");
    const now = new Date();

    const overdue = (tasks as any[]).filter(task => {
      const assignee = String(task.forwardedTo || task.employee || "");
      if (deadlineOf(task) > now) return false;
      if (canSeeAll) return true;
      if (isDepartmentManager) return viewerDepartment && String(profileByUser.get(assignee)?.department || "") === viewerDepartment;
      return assignee === userId;
    }).map(task => {
      const assigneeId = String(task.forwardedTo || task.employee || "");
      const deadline = deadlineOf(task);
      return {
        id: task.id,
        title: task.taskTitle || "Untitled task",
        status: task.status || "Pending",
        assigneeId,
        assigneeName: userNames.get(assigneeId) || assigneeId || "Unassigned",
        taskType: task.taskType || "General",
        description: readableWorkDetail(task),
        date: task.date || task.createdAt,
        createdAt: task.createdAt,
        elapsedSeconds: Number(task.elapsedSeconds || 0),
        deadline: deadline.toISOString(),
        overdueMinutes: Math.max(0, Math.floor((now.getTime() - deadline.getTime()) / 60000)),
      };
    });

    const showAll = new URL(request.url).searchParams.get("limit") === "all";
    return NextResponse.json({ success: true, count: overdue.length, data: showAll ? overdue : overdue.slice(0, 50) });
  } catch (error: any) {
    console.error("[/api/tasks/incomplete-alerts]", error);
    return NextResponse.json({ success: false, error: error.message || "Task alerts could not be loaded" }, { status: 500 });
  }
}
