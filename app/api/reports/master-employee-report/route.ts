import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Op } from "sequelize";
import { authOptions } from "@/lib/auth";
import sequelize from "@/lib/sequelize";
import User from "@/models/sequelize/User";
import EmployeeProfile from "@/models/sequelize/EmployeeProfile";
import Department from "@/models/sequelize/Department";
import Attendance from "@/models/sequelize/Attendance";
import Leave from "@/models/sequelize/Leave";
import TaskLog from "@/models/sequelize/TaskLog";
import SodReport from "@/models/sequelize/SodReport";
import EodReport from "@/models/sequelize/EodReport";
import FieldVisit from "@/models/sequelize/FieldVisit";
import LegalRecoverySchedule from "@/models/sequelize/LegalRecoverySchedule";
import AuditLog from "@/models/sequelize/AuditLog";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    await sequelize.authenticate();
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const requestedUserId = searchParams.get("userId");
    if (!startDate || !endDate) {
      return NextResponse.json({ success: false, error: "startDate and endDate are required" }, { status: 400 });
    }

    const sessionUserId = String((session.user as any).id);
    const role = String((session.user as any).role || "");
    const isGlobalManager = ["Owner", "Director", "HR Head", "HR Executive"].includes(role);
    const selfUser = await User.findByPk(sessionUserId, { attributes: ["id", "name"] });
    const selfProfile = await EmployeeProfile.findOne({ where: { user: sessionUserId }, raw: true });

    let allowedUserIds: string[] = [sessionUserId];
    if (isGlobalManager) {
      const activeUsers = await User.findAll({ where: { status: "active" }, attributes: ["id"], raw: true });
      allowedUserIds = activeUsers.map((u: any) => String(u.id));
    } else {
      if (role === "Department Manager" && (selfProfile as any)?.department) {
        const departmentProfiles = await EmployeeProfile.findAll({
          where: { department: (selfProfile as any).department },
          attributes: ["user"],
          raw: true
        });
        allowedUserIds.push(...departmentProfiles.map((p: any) => String(p.user)));
      }
      if ((selfUser as any)?.name) {
        const reports = await EmployeeProfile.findAll({
          where: { reportingManager: (selfUser as any).name },
          attributes: ["user"],
          raw: true
        });
        allowedUserIds.push(...reports.map((p: any) => String(p.user)));
      }
      allowedUserIds = Array.from(new Set(allowedUserIds));
    }

    if (requestedUserId) {
      if (!allowedUserIds.includes(String(requestedUserId))) {
        return NextResponse.json({ success: false, error: "Access denied for selected employee" }, { status: 403 });
      }
      allowedUserIds = [String(requestedUserId)];
    }

    const start = new Date(`${startDate}T00:00:00`);
    const end = new Date(`${endDate}T23:59:59.999`);
    const dateRange = { [Op.between]: [start, end] };
    const dateOnlyRange = { [Op.between]: [startDate, endDate] };

    const [users, profiles, attendance, leaves, tasks, sods, eods, fieldVisits, schedules, audits] = await Promise.all([
      User.findAll({ where: { id: { [Op.in]: allowedUserIds } }, attributes: ["id", "name", "email", "role"], raw: true }),
      EmployeeProfile.findAll({ where: { user: { [Op.in]: allowedUserIds } }, attributes: ["user", "employeeId", "department", "vertical", "designation"], raw: true }),
      Attendance.findAll({ where: { employee: { [Op.in]: allowedUserIds }, date: dateRange }, order: [["date", "ASC"]], raw: true }),
      Leave.findAll({ where: { employee: { [Op.in]: allowedUserIds }, status: "Approved", startDate: { [Op.lte]: end }, endDate: { [Op.gte]: start } }, raw: true }),
      TaskLog.findAll({ where: { employee: { [Op.in]: allowedUserIds }, date: dateRange }, order: [["date", "ASC"]], raw: true }),
      SodReport.findAll({ where: { employee: { [Op.in]: allowedUserIds }, date: dateRange }, raw: true }),
      EodReport.findAll({ where: { employee: { [Op.in]: allowedUserIds }, date: dateRange }, raw: true }),
      FieldVisit.findAll({ where: { employee_id: { [Op.in]: allowedUserIds }, date: dateOnlyRange }, raw: true }),
      LegalRecoverySchedule.findAll({ where: { employeeId: { [Op.in]: allowedUserIds }, date: dateOnlyRange }, raw: true }),
      AuditLog.findAll({ where: { user: { [Op.in]: allowedUserIds }, timestamp: dateRange }, order: [["timestamp", "ASC"]], raw: true })
    ]);

    const departmentIds = Array.from(new Set(profiles.map((p: any) => p.department).filter(Boolean)));
    const departments = await Department.findAll({ where: { id: { [Op.in]: departmentIds } }, attributes: ["id", "name"], raw: true });

    return NextResponse.json({
      success: true,
      data: { startDate, endDate, users, profiles, departments, attendance, leaves, tasks, sods, eods, fieldVisits, schedules, audits }
    });
  } catch (error: any) {
    console.error("GET /api/reports/master-employee-report error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
