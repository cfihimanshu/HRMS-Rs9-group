// Removed @ts-nocheck
import { NextResponse } from "next/server";
import sequelize from "@/lib/sequelize";
import User from "@/models/sequelize/User";
import Company from "@/models/sequelize/Company";
import Department from "@/models/sequelize/Department";
import Role from "@/models/sequelize/Role";
import RiskAlert from "@/models/sequelize/RiskAlert";
import AuditLog from "@/models/sequelize/AuditLog";
import Notification from "@/models/sequelize/Notification";
import SodReport from "@/models/sequelize/SodReport";
import EodReport from "@/models/sequelize/EodReport";
import Candidate from "@/models/sequelize/Candidate";
import Associate from "@/models/sequelize/Associate";
import Vendor from "@/models/sequelize/Vendor";
import Franchise from "@/models/sequelize/Franchise";
import Grievance from "@/models/sequelize/Grievance";
import { Op } from "sequelize";

export const dynamic = "force-dynamic";

// This should ideally be in .env, using a hardcoded fallback for demo purposes
const EXPECTED_RS9_API_KEY = process.env.RS9_API_KEY || "rs9-secure-sync-key-2026";

export async function GET(request: Request) {
  try {
    // 1. Basic API Key Authentication
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ") || authHeader.split(" ")[1] !== EXPECTED_RS9_API_KEY) {
      return NextResponse.json({ success: false, error: "Unauthorized. Invalid RS9 API Key." }, { status: 401 });
    }

    await sequelize.authenticate();

    // 2. Fetch all required Master Data in parallel
    const [
      users,
      companies,
      departments,
      roles,
      openRiskAlerts,
      recentAuditLogs,
      recentNotifications
    ] = await Promise.all([
      User.findAll({ where: {}, attributes: ["name", "email", "role", "status", "companies"], raw: true }),
      Company.findAll({ raw: true }),
      Department.findAll({ raw: true }),
      Role.findAll({ raw: true }),
      RiskAlert.findAll({ where: { status: "Open" }, raw: true }),
      AuditLog.findAll({ order: [["timestamp", "DESC"]], limit: 100, raw: true }),
      Notification.findAll({ order: [["createdAt", "DESC"]], limit: 100, raw: true })
    ]);

    // 3. Fetch Owner Dashboard Figures (Aggregations)
    const [
      totalCandidates,
      activeEmployees,
      activeAssociates,
      activeVendors,
      activeFranchises,
      openGrievances
    ] = await Promise.all([
      Candidate.count({ where: {} }),
      User.count({ where: { role: { [Op.in]: ["Employee", "Trainer"] } } }),
      Associate.count({ where: { status: "active" } }),
      Vendor.count({ where: { status: "active" } }),
      Franchise.count({ where: { status: "active" } }),
      Grievance.count({ where: { status: "Open" } })
    ]);

    const ownerDashboardFigures = {
      candidates: totalCandidates,
      employees: activeEmployees,
      associates: activeAssociates,
      vendors: activeVendors,
      franchises: activeFranchises,
      openGrievances: openGrievances,
      openRiskAlerts: openRiskAlerts.length
    };

    // 4. SOD / EOD & Task Monitoring
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [sodTodayRaw, eodTodayRaw] = await Promise.all([
      SodReport.findAll({ where: { date: today }, raw: true }),
      EodReport.findAll({ where: { date: today }, raw: true })
    ]);

    const employeeIds = [
      ...sodTodayRaw.map((s: any) => s.employee),
      ...eodTodayRaw.map((e: any) => e.employee)
    ].filter(Boolean);

    const employees = await User.findAll({
      where: { id: { [Op.in]: employeeIds } },
      attributes: ["id", "name", "role"],
      raw: true
    });
    const employeeMap = new Map(employees.map((e: any) => [e.id, e]));

    const sodToday = sodTodayRaw.map((s: any) => {
      const plain = { ...s };
      plain.employee = employeeMap.get(plain.employee) || null;
      return plain;
    });

    const eodToday = eodTodayRaw.map((e: any) => {
      const plain = { ...e };
      plain.employee = employeeMap.get(plain.employee) || null;
      return plain;
    });

    const sodSummary = {
      totalSubmitted: sodToday.length,
      tasksPlanned: sodToday.reduce((acc: number, curr: any) => acc + (curr.callsPlanned || 0) + (curr.meetings || 0) + (curr.fieldVisits || 0), 0)
    };

    const eodSummary = {
      totalSubmitted: eodToday.length,
      tasksCompleted: eodToday.reduce((acc: number, curr: any) => acc + (curr.completedWork ? 1 : 0), 0)
    };

    // Construct the unified response payload
    const syncPayload = {
      timestamp: new Date().toISOString(),
      data: {
        userMaster: users,
        companyMaster: companies,
        departmentMaster: departments,
        roleMaster: roles,
        ownerDashboardFigures,
        riskAlerts: openRiskAlerts,
        auditLogs: recentAuditLogs,
        notifications: recentNotifications,
        taskMonitoring: {
          ongoingSodTasks: sodToday.map((s: any) => ({ user: s.employee?.name, plan: s.plan })),
          pendingEodEscalations: eodToday.filter((e: any) => e.escalationRequired).map((e: any) => ({ user: e.employee?.name, issue: e.issuesFaced }))
        },
        sodEodSummary: {
          sod: sodSummary,
          eod: eodSummary
        }
      }
    };

    return NextResponse.json({ success: true, payload: syncPayload });

  } catch (error: any) {
    console.error("RS9 Sync Error:", error);
    return NextResponse.json({ success: false, error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
