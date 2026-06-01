import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import Company from "@/models/Company";
import Department from "@/models/Department";
import Role from "@/models/Role";
import RiskAlert from "@/models/RiskAlert";
import AuditLog from "@/models/AuditLog";
import Notification from "@/models/Notification";
import SodReport from "@/models/SodReport";
import EodReport from "@/models/EodReport";
import Candidate from "@/models/Candidate";
import Associate from "@/models/Associate";
import Vendor from "@/models/Vendor";
import Franchise from "@/models/Franchise";
import Grievance from "@/models/Grievance";

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

    await dbConnect();

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
      User.find({}, "name email role status companies").lean(),
      Company.find({}).lean(),
      Department.find({}).lean(),
      Role.find({}).lean(),
      RiskAlert.find({ status: "Open" }).lean(),
      AuditLog.find({}).sort({ timestamp: -1 }).limit(100).lean(),
      Notification.find({}).sort({ createdAt: -1 }).limit(100).lean()
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
      Candidate.countDocuments(),
      User.countDocuments({ role: { $in: ["Employee", "Trainer"] } }),
      Associate.countDocuments({ status: "active" }),
      Vendor.countDocuments({ status: "active" }),
      Franchise.countDocuments({ status: "active" }),
      Grievance.countDocuments({ status: "Open" })
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

    const [sodToday, eodToday] = await Promise.all([
      SodReport.find({ date: today }).populate("employee", "name role").lean(),
      EodReport.find({ date: today }).populate("employee", "name role").lean()
    ]);

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
