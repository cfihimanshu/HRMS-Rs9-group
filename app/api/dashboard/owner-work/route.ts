import { NextResponse } from "next/server";
import { Op } from "sequelize";
import { requireApiSession, MANAGEMENT_ROLES } from "@/lib/apiAuth";
import sequelize from "@/lib/sequelize";
import TaskLog from "@/models/sequelize/TaskLog";
import LegalRecoverySchedule from "@/models/sequelize/LegalRecoverySchedule";
import User from "@/models/sequelize/User";
import EmployeeProfile from "@/models/sequelize/EmployeeProfile";
import Department from "@/models/sequelize/Department";

export const dynamic = "force-dynamic";

const completedStatuses = ["Completed", "Complete", "Done", "Approved", "Resolved"];
const localDateRange = () => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit"
  }).format(new Date());
  return {
    start: new Date(`${parts}T00:00:00+05:30`),
    end: new Date(`${parts}T23:59:59.999+05:30`)
  };
};

const parseCompanies = (value: any): string[] => {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(String);
  try {
    const parsed = JSON.parse(String(value));
    return Array.isArray(parsed) ? parsed.map((item: any) => String(item?.id || item)) : [String(parsed)];
  } catch { return [String(value)]; }
};

export async function GET(request: Request) {
  try {
    const auth = await requireApiSession(MANAGEMENT_ROLES);
    if (auth.response) return auth.response;
    const params = new URL(request.url).searchParams;
    const scope = params.get("scope") === "overall" ? "overall" : "today";
    const companyId = String(params.get("companyId") || "").trim();
    const vertical = String(params.get("vertical") || "").trim();
    const department = String(params.get("department") || "").trim();

    await sequelize.authenticate();
    const employeeSets: Set<string>[] = [];

    if (companyId) {
      const users = await User.findAll({ attributes: ["id", "companies"], raw: true });
      employeeSets.push(new Set(users.filter((user: any) => parseCompanies(user.companies).includes(companyId)).map((user: any) => String(user.id))));
    }

    if (vertical || department) {
      const profileWhere: any = {};
      if (vertical) profileWhere.vertical = vertical;
      if (department) {
        const dept = await Department.findOne({ where: { name: department }, attributes: ["id"], raw: true });
        profileWhere[Op.or] = [{ department }, ...((dept as any)?.id ? [{ department: String((dept as any).id) }] : [])];
      }
      const profiles = await EmployeeProfile.findAll({ where: profileWhere, attributes: ["user"], raw: true });
      employeeSets.push(new Set(profiles.map((profile: any) => String(profile.user))));
    }

    let employeeIds: string[] | null = null;
    if (employeeSets.length) {
      employeeIds = Array.from(employeeSets[0]).filter(id => employeeSets.every(set => set.has(id)));
    }

    const where: any = {};
    const legalWhere: any = {};
    if (scope === "today") {
      const { start, end } = localDateRange();
      where.date = { [Op.between]: [start, end] };
      legalWhere.date = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
      }).format(new Date());
    }
    if (employeeIds) {
      const scopedEmployeeIds = employeeIds.length ? employeeIds : ["__none__"];
      where.employee = { [Op.in]: scopedEmployeeIds };
      legalWhere.employeeId = { [Op.in]: scopedEmployeeIds };
    }

    const pendingWhere = { ...where, status: { [Op.notIn]: completedStatuses } };
    const overdueWhere = { ...pendingWhere, deadlineAt: { [Op.lt]: new Date() } };
    const [total, completed, overdue, recentRows, statusGroups, typeGroups, employeeStatusGroups, legalRecovery, securityWork] = await Promise.all([
      TaskLog.count({ where }),
      TaskLog.count({ where: { ...where, status: { [Op.in]: completedStatuses } } }),
      TaskLog.count({ where: overdueWhere }),
      TaskLog.findAll({ where, order: [["date", "DESC"], ["updatedAt", "DESC"]], limit: 20, raw: true }),
      TaskLog.findAll({ attributes: ["status", [sequelize.fn("COUNT", sequelize.col("id")), "count"]], where, group: ["status"], raw: true }),
      TaskLog.findAll({ attributes: ["taskType", [sequelize.fn("COUNT", sequelize.col("id")), "count"]], where, group: ["taskType"], order: [[sequelize.literal("count"), "DESC"]], limit: 8, raw: true }),
      TaskLog.findAll({ attributes: ["employee", "status", [sequelize.fn("COUNT", sequelize.col("id")), "count"]], where, group: ["employee", "status"], raw: true }),
      LegalRecoverySchedule.count({ where: legalWhere }),
      TaskLog.count({ where: { ...where, [Op.or]: [
        { taskType: { [Op.like]: "%security%" } },
        { taskTitle: { [Op.like]: "%security%" } },
        { description: { [Op.like]: "%security%" } }
      ] } })
    ]);

    const userIds = Array.from(new Set(recentRows.map((row: any) => String(row.employee || "")).filter(Boolean)));
    const users = userIds.length ? await User.findAll({ where: { id: { [Op.in]: userIds } }, attributes: ["id", "name", "role"], raw: true }) : [];
    const userMap = new Map(users.map((user: any) => [String(user.id), user]));
    const recentTasks = recentRows.map((row: any) => ({ ...row, employee: userMap.get(String(row.employee)) || { id: row.employee, name: "Team Member" } }));

    return NextResponse.json({
      success: true,
      data: {
        scope,
        summary: { total, completed, pending: Math.max(0, total - completed), overdue },
        modules: { legalRecovery, securityWork },
        recentTasks,
        statusGroups,
        typeGroups,
        employeeStatusGroups
      }
    });
  } catch (error: any) {
    console.error("[/api/dashboard/owner-work]", error);
    return NextResponse.json({ success: false, error: error.message || "Owner work summary failed" }, { status: 500 });
  }
}
