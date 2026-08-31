import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import sequelize from "@/lib/sequelize";
import Job from "@/models/sequelize/Job";
import Candidate from "@/models/sequelize/Candidate";
import Interview from "@/models/sequelize/Interview";
import User from "@/models/sequelize/User";
import EmployeeProfile from "@/models/sequelize/EmployeeProfile";
import Associate from "@/models/sequelize/Associate";
import LeadPlatform from "@/models/sequelize/LeadPlatform";
import { Op } from "sequelize";
import Vendor from "@/models/sequelize/Vendor";
import FranchiseRegistration from "@/models/sequelize/FranchiseRegistration";
import Training from "@/models/sequelize/Training";
import Probation from "@/models/sequelize/Probation";
import Grievance from "@/models/sequelize/Grievance";
import RiskAlert from "@/models/sequelize/RiskAlert";
import Attendance from "@/models/sequelize/Attendance";
import SodReport from "@/models/sequelize/SodReport";
import EodReport from "@/models/sequelize/EodReport";
import Verification from "@/models/sequelize/Verification";
import ExitRecord from "@/models/sequelize/ExitRecord";
import Leave from "@/models/sequelize/Leave";
import HRRecentActivity from "@/models/sequelize/HRRecentActivity";
import Expense from "@/models/sequelize/Expense";
import TaskLog from "@/models/sequelize/TaskLog";
import DisciplinaryWarning from "@/models/sequelize/DisciplinaryWarning";
import AbsentFine from "@/models/sequelize/AbsentFine";
import Department from "@/models/sequelize/Department";
import AssetRequest from "@/models/sequelize/AssetRequest";
import AuditLog from "@/models/sequelize/AuditLog";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    await sequelize.authenticate();
    await EmployeeProfile.sync();
    const dbUser = await User.findByPk((session.user as any).id, { raw: true });
    const userMenuAccess = dbUser?.menuAccess || null;

    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get("companyId");


    // Filters based on selected company & active status
    let userFilter: any = {
      status: {
        [Op.notIn]: ["inactive", "Inactive", "archived", "Archived", "terminated", "Terminated", "disabled", "Disabled"]
      }
    };
    let candidateFilter: any = {};
    let interviewFilter: any = {};
    let generalUserFilter: any = {}; // for Probation, Grievance, Attendance, Exits, etc.
    let profileFilter: any = {};
    let generalCandidateFilter: any = {}; // for Training, Verification, etc.

    let attendanceFilter: any = {};
    let grievanceFilter: any = {};
    let alertFilter: any = {};
    let exitFilter: any = {};
    let reportFilter: any = {};

    const sessionUser = session.user as any;
    const isGlobalViewer = ["Owner", "Director", "HR Head", "HR Executive"].includes(sessionUser.role);

    if (companyId) {
      userFilter.companies = { [Op.like]: `%${companyId}%` };
      const usersInCompany = await User.findAll({ where: { companies: { [Op.like]: `%${companyId}%` } }, attributes: ['id'] });
      const userIds = usersInCompany.map((u: any) => u.id);
      generalUserFilter.employee = { [Op.in]: userIds };
      profileFilter.user = { [Op.in]: userIds };
      attendanceFilter = { employee: { [Op.in]: userIds } };
      grievanceFilter = { raisedBy: { [Op.in]: userIds } };
      alertFilter = { triggeredBy: { [Op.in]: userIds } };
      exitFilter = { employee: { [Op.in]: userIds } };
      reportFilter = { employee: { [Op.in]: userIds } };

      const jobs = await Job.findAll({ where: { company: companyId }, attributes: ['id'] });
      const jobIds = jobs.map((j: any) => j.id);
      candidateFilter.job = { [Op.in]: jobIds };

      const cands = await Candidate.findAll({ where: { job: { [Op.in]: jobIds } }, attributes: ['id'] });
      const candIds = cands.map((c: any) => c.id);
      interviewFilter.candidate = { [Op.in]: candIds };
      generalCandidateFilter.candidate = { [Op.in]: candIds };
    }

    // Dynamic Department Filtering
    if (!isGlobalViewer) {
      const profile = await EmployeeProfile.findOne({ where: { user: sessionUser.id } });
      let deptUserIds = [sessionUser.id];
      if (profile && profile.department) {
        const deptProfiles = await EmployeeProfile.findAll({ where: { department: profile.department }, attributes: ['user'] });
        deptUserIds = deptProfiles.map((p: any) => p.user);

        // Add job filter by department
        const jobs = await Job.findAll({ where: { department: profile.department }, attributes: ['id'] });
        const jobIds = jobs.map((j: any) => j.id);

        if (candidateFilter.job) {
          candidateFilter.job[Op.in] = jobIds.filter((id: string) => candidateFilter.job[Op.in].includes(id));
        } else {
          candidateFilter.job = { [Op.in]: jobIds };
        }
      }

      const applyUserFilter = (filterObj: any, field: string) => {
        if (filterObj[field]) {
          filterObj[field][Op.in] = deptUserIds.filter((id: string) => filterObj[field][Op.in].includes(id));
        } else {
          filterObj[field] = { [Op.in]: deptUserIds };
        }
      };

      applyUserFilter(userFilter, 'id');
      applyUserFilter(generalUserFilter, 'employee');
      applyUserFilter(profileFilter, 'user');
      applyUserFilter(attendanceFilter, 'employee');
      applyUserFilter(grievanceFilter, 'raisedBy');
      applyUserFilter(alertFilter, 'triggeredBy');
      applyUserFilter(exitFilter, 'employee');
      applyUserFilter(reportFilter, 'employee');
    }

    // 1. Candidate Stats
    const totalCandidates = await Candidate.count({ where: candidateFilter });
    const pendingCandidates = await Candidate.count({ where: { ...candidateFilter, status: "Pending" } });
    const selectedCandidates = await Candidate.count({ where: { ...candidateFilter, status: "Selected" } });
    const highRiskCandidates = await Candidate.count({ where: { ...candidateFilter, status: "High Risk" } });

    // 1b. Business Leads Stats
    let totalLeadsCount = 0;
    let selectedLeadsCount = 0;
    let pendingLeadsCount = 0;
    let rejectedLeadsCount = 0;

    try {
      const platforms = await LeadPlatform.findAll({ raw: true });
      for (const plat of platforms) {
        const tableName = plat.tableName;
        const [rows]: any[] = await sequelize.query(`SELECT status FROM ${tableName}`);
        totalLeadsCount += rows.length;
        rows.forEach((row: any) => {
          const status = (row.status || "").toLowerCase();
          if (status === "pending" || status === "new" || status === "") {
            pendingLeadsCount++;
          } else if (status.includes("select")) {
            selectedLeadsCount++;
          } else if (status.includes("reject")) {
            rejectedLeadsCount++;
          }
        });
      }
    } catch (e) {
      console.error("Failed to query business leads stats:", e);
    }

    // 2. Interview Stats
    const pendingInterviews = await Interview.count({ where: { ...interviewFilter, status: "Pending" } });

    // 3. User Master Roles count
    const totalEmployees = await User.count({ where: userFilter });
    const maleEmployees = await EmployeeProfile.count({ where: { ...profileFilter, gender: "Male" } });
    const femaleEmployees = await EmployeeProfile.count({ where: { ...profileFilter, gender: "Female" } });

    // Assuming Associates, Vendors, Franchises are not strictly bound to this company filter in the same way, or maybe we leave them unfiltered for now as they might have a different logic.
    const totalAssociates = await Associate.count().catch(() => 0);
    const totalVendors = await Vendor.count().catch(() => 0);
    const totalFranchises = await FranchiseRegistration.count().catch(() => 0);

    // 4. Operations metrics
    const trainingPending = await Training.count({ where: { ...generalCandidateFilter, status: { [Op.ne]: "Activation" } } });
    const activeProbations = await Probation.count({ where: { ...generalUserFilter, status: "active" } });
    const activeGrievances = await Grievance.count({ where: { ...grievanceFilter, status: "Open" } });

    // 5. Alert counts
    const criticalRiskAlerts = await RiskAlert.count({ where: { ...alertFilter, status: "Open", level: "Critical" } });
    const totalRiskAlerts = await RiskAlert.count({ where: { ...alertFilter, status: "Open" } });

    // 5b. Disciplinary Warning badge counts
    const sessionUserId = (session.user as any).id;
    // For employees: count of their own active warnings (not resolved/rejected)
    const myActiveWarnings = await DisciplinaryWarning.count({
      where: {
        employeeId: sessionUserId,
        status: { [Op.notIn]: ["Resolved", "Rejected"] }
      }
    });
    // For Owner/HR: count of pending approval requests
    const pendingWarningApprovals = isGlobalViewer ? await DisciplinaryWarning.count({
      where: { status: "Pending Approval" }
    }) : 0;

    // 6. Attendance, SOD/EOD compliances (today's counts)
    const now = new Date();
    const indiaParts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit"
    }).formatToParts(now).reduce((parts: Record<string, string>, part) => {
      if (part.type !== "literal") parts[part.type] = part.value;
      return parts;
    }, {});
    const indiaDate = `${indiaParts.year}-${indiaParts.month}-${indiaParts.day}`;
    const dayStart = new Date(`${indiaDate}T00:00:00.000+05:30`);
    const dayEnd = new Date(`${indiaDate}T23:59:59.999+05:30`);
    const today = dayStart;
    const endOfToday = dayEnd;
    const tomorrow = new Date(dayStart);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const sodReportsToday = await SodReport.findAll({
      where: {
        ...reportFilter,
        [Op.or]: [
          { date: { [Op.gte]: dayStart, [Op.lte]: dayEnd } },
          { createdAt: { [Op.gte]: dayStart, [Op.lte]: dayEnd } }
        ]
      }
    });
    const sodEmployeeIds = sodReportsToday.map((r: any) => r.employee?.toString()).filter(Boolean);
    const uniqueSodEmployees = sodEmployeeIds.filter((v: any, i: number, a: any[]) => a.indexOf(v) === i);

    const eodReportsToday = await EodReport.findAll({
      where: {
        ...reportFilter,
        [Op.or]: [
          { date: { [Op.gte]: dayStart, [Op.lte]: dayEnd } },
          { createdAt: { [Op.gte]: dayStart, [Op.lte]: dayEnd } }
        ]
      }
    });
    const eodEmployeeIds = eodReportsToday.map((r: any) => r.employee?.toString()).filter(Boolean);
    const uniqueEodEmployees = eodEmployeeIds.filter((v: any, i: number, a: any[]) => a.indexOf(v) === i);

    const sodMap: Record<string, string> = {};
    sodReportsToday.forEach((r: any) => {
      if (r.employee) {
        const timeVal = r.createdAt || r.timestamp || r.date;
        if (timeVal) {
          sodMap[r.employee.toString()] = new Date(timeVal).toISOString();
        }
      }
    });

    const eodMap: Record<string, string> = {};
    eodReportsToday.forEach((r: any) => {
      if (r.employee) {
        const timeVal = r.createdAt || r.timestamp || r.date;
        if (timeVal) {
          eodMap[r.employee.toString()] = new Date(timeVal).toISOString();
        }
      }
    });

    // Ensure we use the proper dynamic user filter (dept or company)
    const totalEmployeesCount = await User.count({ where: userFilter });

    const attendanceRecords = await Attendance.findAll({
      where: {
        ...attendanceFilter,
        date: {
          [Op.gte]: today,
          [Op.lt]: tomorrow
        },
        status: "Present"
      }
    });
    const activeUsersInFilter = await User.findAll({
      where: userFilter,
      attributes: ['id']
    });
    const activeUserIds = new Set(activeUsersInFilter.map((u: any) => String(u.id)));

    const attendanceEmployeeIds = attendanceRecords.map((r: any) => r.employee?.toString()).filter(Boolean);
    const combinedIds = [...uniqueSodEmployees, ...uniqueEodEmployees, ...attendanceEmployeeIds]
      .filter((id: string) => activeUserIds.has(String(id)));
    const finalPresentIds = combinedIds.filter((v: any, i: number, a: any[]) => a.indexOf(v) === i);

    const presentCount = finalPresentIds.length;

    const leavesCount = await Leave.count({
      where: {
        ...generalUserFilter,
        status: "Approved",
        startDate: { [Op.lte]: endOfToday },
        endDate: { [Op.gte]: today }
      }
    });

    const absentCount = Math.max(0, totalEmployeesCount - finalPresentIds.length - leavesCount);

    let lateCount = 0;
    for (const sod of sodReportsToday) {
      const localHour = new Date(sod.createdAt).getHours();
      if (localHour >= 11) {
        lateCount++;
      }
    }

    const sodPercent = totalEmployeesCount > 0 ? Math.round((uniqueSodEmployees.length / totalEmployeesCount) * 100) : 0;
    const eodPercent = totalEmployeesCount > 0 ? Math.round((uniqueEodEmployees.length / totalEmployeesCount) * 100) : 0;

    // 7. HR Dashboard specific metrics
    const todayInterviewsList = await Interview.findAll({ where: { scheduleTime: { [Op.gte]: today, [Op.lte]: endOfToday } } });
    const uniqueCandidatesToday = new Set(todayInterviewsList.map((iv: any) => iv.candidate?.toString()).filter(Boolean));
    const todayInterviewsCount = uniqueCandidatesToday.size;

    // Vetting registry candidates (passed all 3 rounds) who are not verified
    const interviewsSelected = await Interview.findAll({ where: { status: "Selected" } });
    const candidateInterviewsMap: Record<string, Set<number>> = {};
    interviewsSelected.forEach((iv: any) => {
      if (iv.candidate) {
        const cid = iv.candidate.toString();
        if (!candidateInterviewsMap[cid]) {
          candidateInterviewsMap[cid] = new Set();
        }
        candidateInterviewsMap[cid].add(iv.round);
      }
    });
    const allCands = await Candidate.findAll({
      where: { ...candidateFilter, status: { [Op.ne]: "inactive" } }
    });

    const eligibleCandIds = allCands
      .filter((cand: any) => {
        if (!cand || !cand.id) return false;
        const cid = String(cand.id);
        const rounds = candidateInterviewsMap[cid] || new Set();
        const hasAllThree = rounds.has(1) && rounds.has(2) && rounds.has(3);
        const isDirectlyHired = cand.status === "Selected" && cand.currentRound === 3;
        return hasAllThree || isDirectlyHired;
      })
      .map((c: any) => String(c.id));
    const verifiedDocs = await Verification.findAll({
      where: {
        candidate: { [Op.in]: eligibleCandIds },
        status: "Verified"
      }
    });
    const verifiedIds = new Set(
      verifiedDocs
        .filter((v: any) => v && v.candidate)
        .map((v: any) => String(v.candidate))
    );
    const pendingVerificationsCount = eligibleCandIds.filter(cid => !verifiedIds.has(cid)).length;

    const rejectedCandidatesCount = await Candidate.count({ where: { ...candidateFilter, status: "Rejected" } });
    const activeExits = await ExitRecord.count({ where: { status: "active" } });

    // 8. Department Dashboard metrics
    // Aggregate tasks from today's SOD reports
    const tasksToday = sodReportsToday.reduce((acc: number, curr: any) => {
      return acc + (curr.callsPlanned || 0) + (curr.meetings || 0) + (curr.fieldVisits || 0);
    }, 0);

    // Clean up static dummy seeded initial activities if any
    try {
      await HRRecentActivity.destroy({
        where: {
          details: {
            [Op.or]: [
              { [Op.like]: "%Sarah Jenkins%" },
              { [Op.like]: "%David Lee%" },
              { [Op.like]: "%John Doe%" }
            ]
          }
        }
      });
    } catch (e) {}

    // Fetch recent HR activities populated with user info
    let dbHrActivities = await HRRecentActivity.findAll({
      where: {},
      order: [['createdAt', 'DESC'], ['timestamp', 'DESC']],
      limit: 50,
      raw: true
    });

    // Query live SOD, EOD, Fines, AuditLogs, Leaves, Expenses, and AssetRequests tables across all companies
    const [recentSods, recentEods, recentFinesList, recentAuditLogs, recentLeaves, recentExpenses, recentAssetRequests] = await Promise.all([
      SodReport.findAll({ order: [['createdAt', 'DESC']], limit: 50, raw: true }).catch(() => []),
      EodReport.findAll({ order: [['createdAt', 'DESC']], limit: 50, raw: true }).catch(() => []),
      AbsentFine.findAll({ order: [['createdAt', 'DESC']], limit: 50, raw: true }).catch(() => []),
      AuditLog.findAll({ order: [['createdAt', 'DESC']], limit: 100, raw: true }).catch(() => []),
      Leave.findAll({ order: [['createdAt', 'DESC']], limit: 50, raw: true }).catch(() => []),
      Expense.findAll({ order: [['createdAt', 'DESC']], limit: 50, raw: true }).catch(() => []),
      AssetRequest.findAll({ order: [['createdAt', 'DESC']], limit: 50, raw: true }).catch(() => [])
    ]);

    const allActorIds = [...new Set([
      ...dbHrActivities.map((a: any) => a.user),
      ...recentSods.map((s: any) => s.employee),
      ...recentEods.map((e: any) => e.employee),
      ...recentFinesList.map((f: any) => f.employee),
      ...recentFinesList.map((f: any) => f.imposedBy),
      ...recentAuditLogs.map((a: any) => a.user || a.userId),
      ...recentLeaves.map((l: any) => l.employee),
      ...recentExpenses.map((ex: any) => ex.employee),
      ...recentAssetRequests.map((ar: any) => ar.employee)
    ].filter(Boolean).map(String))];

    let userMap: Record<string, { name: string; role: string }> = {};
    if (allActorIds.length > 0) {
      const [users, profiles] = await Promise.all([
        User.findAll({
          where: {
            [Op.or]: [
              { id: { [Op.in]: allActorIds } },
              { email: { [Op.in]: allActorIds } }
            ]
          },
          raw: true
        }).catch(() => []),
        EmployeeProfile.findAll({
          where: {
            [Op.or]: [
              { user: { [Op.in]: allActorIds } },
              { employeeId: { [Op.in]: allActorIds } }
            ]
          },
          raw: true
        }).catch(() => [])
      ]);

      const profileMap: Record<string, any> = {};
      profiles.forEach((p: any) => {
        if (!p) return;
        if (p.user) profileMap[String(p.user)] = p;
        if (p.employeeId) profileMap[String(p.employeeId)] = p;
      });

      users.forEach((u: any) => {
        if (!u) return;
        const prof = profileMap[String(u.id)] || profileMap[String(u.email)];
        const info = { name: u.name || "User", role: u.role || "Staff" };
        if (u.id) userMap[String(u.id)] = info;
        if (u.email) userMap[String(u.email).toLowerCase()] = info;
        if (u.name) userMap[String(u.name)] = info;
        if (prof?.employeeId) userMap[String(prof.employeeId)] = info;
      });
    }

    const actList: any[] = dbHrActivities.map((a: any) => {
      let title = a.action ? a.action.replace(/_/g, " ") : "HR Activity";
      const action = a.action;
      if (action === "CREATE_EMPLOYEE") {
        title = (a.details || "").toLowerCase().includes("bda") || (a.details || "").toLowerCase().includes("sales") ? "New BDA Registered" : "New Employee Onboarded";
      }
      else if (action === "SCHEDULE_INTERVIEW") title = "Interview Scheduled";
      else if (action === "SUBMIT_INTERVIEW_EVALUATION") title = "Interview Evaluated";
      else if (action === "SUBMIT_VERIFICATION") title = "Document Verified";
      else if (action === "APPROVED_LEAVE") title = "Leave Approved";
      else if (action === "REJECTED_LEAVE") title = "Leave Rejected";
      else if (action === "CREATE_JOB") title = "Job Vacancy Posted";
      else if (action === "UPDATE_TRAINING_LOG") title = "Training Record Updated";
      else if (action === "SUBMIT_PROBATION_EVALUATION") title = "Probation Evaluated";
      else if (action === "SOD_DECLARED") title = "SOD Declared";
      else if (action === "EOD_DECLARED") title = "EOD Declared";
      else if (action === "TASK_CREATED") title = "Task Created";
      else if (action === "TASK_COMPLETED") title = "Task Completed";
      else if (action === "TASK_FORWARDED") title = "Task Forwarded";
      else if (action === "TASK_STATUS_CHANGED") title = "Task Status Updated";
      else if (action === "HIRING_APPROVED") title = "Hiring Approved";
      else if (action === "HIRING_REJECTED") title = "Hiring Rejected";
      else if (action === "EMPLOYEE_UPDATED" || action === "UPDATE_EMPLOYEE") title = "Employee Directory Updated";
      else if (action === "DEACTIVATE_EMPLOYEE") title = "Employee Deactivated";
      else if (action === "FINE_IMPOSED") title = "Absent Fine Imposed";
      else if (action === "BDA_LEAD_CREATED") title = "New BDA Lead Added";
      else if (action === "BDA_LEAD_ASSIGNED") title = "BDA Lead Assigned";
      else if (action === "BDA_LEAD_UPDATED") title = "BDA Lead Status Updated";

      const userInfo = userMap[a.user?.toString()] || (typeof a.user === "object" ? a.user : { name: "System", role: "Staff" });
      const rawTime = a.createdAt || a.timestamp || new Date();

      return {
        id: (a.id || "").toString(),
        title,
        description: a.details,
        timestamp: rawTime instanceof Date ? rawTime.toISOString() : new Date(rawTime).toISOString(),
        action: a.action || "HR_ACTIVITY",
        actor: userInfo.name || "System",
        actorRole: userInfo.role || ""
      };
    });

    const resolveTimestamp = (primary: any, secondary?: any): string => {
      if (primary) {
        const d = new Date(primary);
        if (!isNaN(d.getTime())) return d.toISOString();
      }
      if (secondary) {
        const d = new Date(secondary);
        if (!isNaN(d.getTime())) return d.toISOString();
      }
      return new Date(0).toISOString();
    };

    // Convert SodReports
    recentSods.forEach((sod: any) => {
      const empId = (sod.employee || "").toString();
      const userInfo = userMap[empId] || { name: "Employee", role: "Staff" };
      const ts = resolveTimestamp(sod.createdAt, sod.date || sod.updatedAt);
      actList.push({
        id: "sod_" + (sod.id || Date.now()),
        title: "SOD Declared",
        description: `${userInfo.name} declared Start of Day (SOD). Task: ${sod.taskSummary || ""}${sod.remarks ? ` — Remarks: ${sod.remarks}` : ""}`,
        timestamp: ts,
        action: "SOD_DECLARED",
        actor: userInfo.name,
        actorRole: userInfo.role || ""
      });
    });

    // Convert EodReports
    recentEods.forEach((eod: any) => {
      const empId = (eod.employee || "").toString();
      const userInfo = userMap[empId] || { name: "Employee", role: "Staff" };
      const ts = resolveTimestamp(eod.createdAt, eod.date || eod.updatedAt);
      actList.push({
        id: "eod_" + (eod.id || Date.now()),
        title: "EOD Declared",
        description: `${userInfo.name} submitted End of Day (EOD) report. Completed: ${eod.completedWork || ""}`,
        timestamp: ts,
        action: "EOD_DECLARED",
        actor: userInfo.name,
        actorRole: userInfo.role || ""
      });
    });

    // Convert AbsentFines
    (recentFinesList || []).forEach((fine: any) => {
      const empInfo = userMap[(fine.employee || "").toString()] || { name: "Employee", role: "" };
      const impInfo = userMap[(fine.imposedBy || "").toString()] || { name: "Management", role: "" };
      const ts = resolveTimestamp(fine.createdAt, fine.updatedAt);
      actList.push({
        id: "fine_" + (fine.id || Date.now()),
        title: "Absent Fine Imposed",
        description: `Fine of ₹${fine.amount} imposed on ${empInfo.name} for date ${fine.date}. Reason: ${fine.reason || "Uninformed Absence"}`,
        timestamp: ts,
        action: "FINE_IMPOSED",
        actor: impInfo.name,
        actorRole: impInfo.role || ""
      });
    });

    // Convert AuditLogs (Employee dashboard & system data changes)
    (recentAuditLogs || []).forEach((audit: any) => {
      const empId = (audit.user || audit.userId || "").toString();
      const userInfo = userMap[empId] || { name: audit.userName || "System", role: audit.userRole || "Staff" };
      const ts = resolveTimestamp(audit.createdAt, audit.timestamp);
      let actionTitle = audit.action ? audit.action.replace(/_/g, " ") : "Data Change";
      const actUpper = (audit.action || "").toUpperCase();
      const detLower = (audit.details || "").toLowerCase();

      if (actUpper.includes("CREATE_EMPLOYEE")) {
        actionTitle = detLower.includes("bda") || detLower.includes("sales") ? "New BDA Registered" : "New Employee Onboarded";
      } else if (actUpper.includes("UPDATE_EMPLOYEE") || actUpper.includes("EMPLOYEE_UPDATED")) {
        actionTitle = "Employee Directory Updated";
      } else if (actUpper.includes("BDA_LEAD_CREATED")) {
        actionTitle = "New BDA Lead Added";
      } else if (actUpper.includes("BDA_LEAD_ASSIGNED")) {
        actionTitle = "BDA Lead Assigned";
      } else if (actUpper.includes("BDA_LEAD_UPDATED")) {
        actionTitle = "BDA Lead Status Updated";
      } else if (actUpper.includes("UPDATE") || actUpper.includes("EDIT")) {
        actionTitle = "Record Updated";
      } else if (actUpper.includes("CREATE") || actUpper.includes("ADD")) {
        actionTitle = "Record Added";
      } else if (actUpper.includes("DELETE") || actUpper.includes("REMOVE")) {
        actionTitle = "Record Removed";
      }

      const cleanDetails = audit.details
        ? (audit.details.startsWith(userInfo.name) ? audit.details : `${userInfo.name}: ${audit.details}`)
        : `${userInfo.name} ${audit.action || "updated"} ${audit.entity || "record"}`;

      actList.push({
        id: "audit_" + (audit.id || Date.now()),
        title: actionTitle,
        description: cleanDetails,
        timestamp: ts,
        action: audit.action || "DATA_CHANGE",
        actor: userInfo.name || audit.userName || "System",
        actorRole: userInfo.role || audit.userRole || ""
      });
    });

    // Convert Leaves (Leave requests from Employee Dashboard)
    (recentLeaves || []).forEach((l: any) => {
      const empId = (l.employee || "").toString();
      const userInfo = userMap[empId] || { name: "Employee", role: "Staff" };
      const ts = resolveTimestamp(l.createdAt, l.updatedAt);
      actList.push({
        id: "leave_" + (l.id || Date.now()),
        title: `Leave Request (${l.status || "Pending"})`,
        description: `${userInfo.name} submitted leave request for ${l.type || l.leaveType || "Leave"}${l.reason ? ` — ${l.reason}` : ""}`,
        timestamp: ts,
        action: "LEAVE_SUBMITTED",
        actor: userInfo.name,
        actorRole: userInfo.role || ""
      });
    });

    // Convert Expenses (Expense claims from Employee Dashboard)
    (recentExpenses || []).forEach((ex: any) => {
      const empId = (ex.employee || "").toString();
      const userInfo = userMap[empId] || { name: "Employee", role: "Staff" };
      const ts = resolveTimestamp(ex.createdAt, ex.updatedAt);
      actList.push({
        id: "exp_" + (ex.id || Date.now()),
        title: `Expense Claim (${ex.status || "Pending"})`,
        description: `${userInfo.name} submitted expense claim of ₹${ex.amount || 0}${ex.title || ex.category ? ` for ${ex.title || ex.category}` : ""}`,
        timestamp: ts,
        action: "EXPENSE_SUBMITTED",
        actor: userInfo.name,
        actorRole: userInfo.role || ""
      });
    });

    // Convert Asset Requests (Asset requests from Employee Dashboard)
    (recentAssetRequests || []).forEach((ar: any) => {
      const empId = (ar.employee || "").toString();
      const userInfo = userMap[empId] || { name: "Employee", role: "Staff" };
      const ts = resolveTimestamp(ar.createdAt, ar.updatedAt);
      actList.push({
        id: "asset_" + (ar.id || Date.now()),
        title: `Asset Request (${ar.status || "Pending"})`,
        description: `${userInfo.name} requested asset: ${ar.assetName || ar.category || "Equipment"}${ar.reason ? ` — ${ar.reason}` : ""}`,
        timestamp: ts,
        action: "ASSET_REQUESTED",
        actor: userInfo.name,
        actorRole: userInfo.role || ""
      });
    });

    // Sort all strictly by timestamp DESC (newest at the very top)
    actList.sort((a, b) => {
      const timeA = new Date(a.timestamp).getTime();
      const timeB = new Date(b.timestamp).getTime();
      return (isNaN(timeB) ? 0 : timeB) - (isNaN(timeA) ? 0 : timeA);
    });

    const hrActivities: any[] = [];
    const seenSet = new Set<string>();

    for (const item of actList) {
      const dateDay = item.timestamp.substring(0, 10);
      const dedupeKey = `${item.action}_${item.actor}_${dateDay}_${(item.description || "").substring(0, 20)}`;
      if (!seenSet.has(dedupeKey)) {
        seenSet.add(dedupeKey);
        hrActivities.push(item);
      }
    }

    // --- Current User Dynamic Stats (ESS) ---
    const userId = (session.user as any).id;
    await EmployeeProfile.sync().catch(() => {});
    const userProfile = await EmployeeProfile.findOne({ where: { user: userId } });
    let casualLeave = 12;
    let sickLeave = 12;
    let earnedLeave = 0;

    if (userProfile) {
      casualLeave = (userProfile.get("leaveBalances.casualLeave") as number) ?? 12;
      sickLeave = (userProfile.get("leaveBalances.sickLeave") as number) ?? 12;
      earnedLeave = (userProfile.get("leaveBalances.earnedLeave") as number) ?? 0;
    }

    const monthNow = new Date();
    const year = monthNow.getFullYear();
    const month = monthNow.getMonth();
    const startOfMonth = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
    const endOfMonth = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999));

    const userKeysForStats = [
      userId,
      sessionUser.id,
      sessionUser.email,
      sessionUser.name,
      (dbUser as any)?.email,
      (dbUser as any)?.name,
      (dbUser as any)?.employeeId
    ].filter(Boolean);

    const [userSods, userEods, userAttendances] = await Promise.all([
      SodReport.findAll({
        where: {
          employee: { [Op.in]: userKeysForStats },
          [Op.or]: [
            { date: { [Op.gte]: startOfMonth, [Op.lte]: endOfMonth } },
            { createdAt: { [Op.gte]: startOfMonth, [Op.lte]: endOfMonth } }
          ]
        },
        raw: true
      }).catch(() => []),
      EodReport.findAll({
        where: {
          employee: { [Op.in]: userKeysForStats },
          [Op.or]: [
            { date: { [Op.gte]: startOfMonth, [Op.lte]: endOfMonth } },
            { createdAt: { [Op.gte]: startOfMonth, [Op.lte]: endOfMonth } }
          ]
        },
        raw: true
      }).catch(() => []),
      Attendance.findAll({
        where: {
          employee: { [Op.in]: userKeysForStats },
          status: { [Op.or]: ["Present", "Late", "On Duty", "Half Day"] },
          date: { [Op.gte]: startOfMonth, [Op.lte]: endOfMonth }
        },
        raw: true
      }).catch(() => [])
    ]);

    const distinctPresentDates = new Set<string>();

    const getFormattedDateKey = (raw: any) => {
      if (!raw) return null;
      if (raw instanceof Date) {
        const y = raw.getFullYear();
        const m = String(raw.getMonth() + 1).padStart(2, "0");
        const day = String(raw.getDate()).padStart(2, "0");
        return `${y}-${m}-${day}`;
      }
      const str = String(raw).trim();
      if (str.includes("T")) {
        const parsed = new Date(str);
        if (!isNaN(parsed.getTime())) {
          const y = parsed.getFullYear();
          const m = String(parsed.getMonth() + 1).padStart(2, "0");
          const day = String(parsed.getDate()).padStart(2, "0");
          return `${y}-${m}-${day}`;
        }
        return str.substring(0, 10);
      }
      const parsed = new Date(str);
      if (!isNaN(parsed.getTime())) {
        const y = parsed.getFullYear();
        const m = String(parsed.getMonth() + 1).padStart(2, "0");
        const day = String(parsed.getDate()).padStart(2, "0");
        return `${y}-${m}-${day}`;
      }
      return str;
    };

    userSods.forEach((s: any) => {
      const dKey = getFormattedDateKey(s.date || s.createdAt);
      if (dKey) distinctPresentDates.add(dKey);
    });
    userEods.forEach((e: any) => {
      const dKey = getFormattedDateKey(e.date || e.createdAt);
      if (dKey) distinctPresentDates.add(dKey);
    });
    userAttendances.forEach((a: any) => {
      const dKey = getFormattedDateKey(a.date || a.createdAt);
      if (dKey) distinctPresentDates.add(dKey);
    });

    const presentDaysCount = distinctPresentDates.size;

    let workingDaysInMonth = 0;
    const daysInFullMonth = endOfMonth.getDate();
    for (let d = 1; d <= daysInFullMonth; d++) {
      const checkDate = new Date(year, month, d);
      if (checkDate.getDay() !== 0) { // Exclude Sundays
        workingDaysInMonth++;
      }
    }
    if (!workingDaysInMonth || workingDaysInMonth <= 1) workingDaysInMonth = 26;

    const holidaysList = [
      { name: "New Year's Day", date: new Date(year, 0, 1) },
      { name: "Republic Day", date: new Date(year, 0, 26) },
      { name: "Holi", date: new Date(year, 2, 3) },
      { name: "Good Friday", date: new Date(year, 3, 3) },
      { name: "Eid al-Fitr", date: new Date(year, 2, 20) },
      { name: "Independence Day", date: new Date(year, 7, 15) },
      { name: "Gandhi Jayanti", date: new Date(year, 9, 2) },
      { name: "Dussehra", date: new Date(year, 9, 19) },
      { name: "Diwali", date: new Date(year, 10, 8) },
      { name: "Christmas", date: new Date(year, 11, 25) }
    ];

    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);
    const upcomingHoliday = holidaysList.find(h => h.date >= todayDate) || holidaysList[holidaysList.length - 1];
    const holidayDateStr = upcomingHoliday.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    // Fetch leaves for this employee to calculate Casual and Sick Leave taken for current month
    const userLeavesAll = await Leave.findAll({
      where: {
        employee: { [Op.in]: userKeysForStats }
      },
      raw: true
    }).catch(() => []);

    let casualLeaveTaken = 0;
    let sickLeaveTaken = 0;
    const currMonth = now.getMonth();
    const currYear = now.getFullYear();

    userLeavesAll.forEach((l: any) => {
      const statusLower = String(l.status || "").toLowerCase();
      if (statusLower === "rejected") return;

      const dateStr = l.startDate || l.createdAt;
      if (!dateStr) return;
      const dObj = new Date(dateStr);
      if (isNaN(dObj.getTime())) return;

      if (dObj.getMonth() === currMonth && dObj.getFullYear() === currYear) {
        const lType = String(l.type || l.leaveType || "").toLowerCase();
        const lDays = Number(l.days || 1) || 1;
        if (lType.includes("casual") || lType.includes("cl")) {
          casualLeaveTaken += lDays;
        } else if (lType.includes("sick") || lType.includes("sl") || lType.includes("medical")) {
          sickLeaveTaken += lDays;
        }
      }
    });
    const allDepts = await Department.findAll({ attributes: ['id', 'name', 'code'], raw: true }).catch(() => []);
    const deptMap = new Map<string, string>();
    allDepts.forEach((d: any) => {
      if (d.id) deptMap.set(String(d.id), d.name);
      if (d.code) deptMap.set(String(d.code), d.name);
    });

    const formatDeptName = (rawDept: any, role?: string, designation?: string): string => {
      if (rawDept) {
        const str = String(rawDept).trim();
        if (str && str !== 'N/A' && deptMap.has(str)) {
          return deptMap.get(str)!;
        }

        if (str.startsWith("DEPT_") || str.startsWith("dept_")) {
          const parts = str.split("_");
          if (parts.length >= 3) {
            const code = parts[2].toUpperCase();
            if (code === "MAN" || code === "MGMT") return "Management";
            if (code === "OPE" || code === "OPS") return "Operations";
            if (code === "SEC" || code === "LEG") return "Security & Legal";
            if (code === "HR") return "Human Resources";
            if (code === "FIN" || code === "ACC") return "Finance & Accounts";
            if (code === "IT" || code === "TECH" || code === "DEV") return "IT & Software";
            return code.charAt(0) + code.slice(1).toLowerCase();
          }
        }
      }

      // Infer department intelligently from User Role or Designation
      const roleStr = `${role || ""} ${designation || ""}`.toLowerCase();
      if (roleStr.includes("hr") || roleStr.includes("human") || roleStr.includes("recruit") || roleStr.includes("hiring")) return "Human Resources";
      if (roleStr.includes("engineer") || roleStr.includes("developer") || roleStr.includes("it") || roleStr.includes("tech") || roleStr.includes("wordpress") || roleStr.includes("network") || roleStr.includes("software")) return "IT & Software";
      if (roleStr.includes("owner") || roleStr.includes("director") || roleStr.includes("ceo") || roleStr.includes("coo") || roleStr.includes("cco") || roleStr.includes("cfmo") || roleStr.includes("head")) return "Management";
      if (roleStr.includes("legal") || roleStr.includes("recovery") || roleStr.includes("security") || roleStr.includes("facility") || roleStr.includes("guard")) return "Security & Legal";
      if (roleStr.includes("finance") || roleStr.includes("account") || roleStr.includes("billing") || roleStr.includes("payroll")) return "Finance & Accounts";
      if (roleStr.includes("admin") || roleStr.includes("operation") || roleStr.includes("logistics") || roleStr.includes("manager")) return "Operations";

      return "Operations";
    };

    // 8. Department Dashboard metrics
    // Calculate deptStats dynamically for Managers/Owners
    let deptStats: any = null;
    const userRole = (session.user as any).role;
    const userDesignation = String((userProfile as any)?.designation || "");
    const isManager = (role: string, designation = "") => {
      const r = `${role || ""} ${designation || ""}`.toLowerCase();
      return r.includes("manager") || r.includes("department head") || r === "dsm" || r.includes("owner") || r.includes("director") || r.includes("hr head") || r.includes("hr executive");
    };

    if (isManager(userRole, userDesignation)) {
      let deptUserIds: any[] = [];
      let managerProfile: any = userProfile;
      const deptFilterParam = searchParams.get("department");

      const isSpecificManager = !["Owner", "Director", "HR Head", "HR Executive"].includes(userRole);
      if (isSpecificManager) {
        const { getDepartmentMemberIds } = await import("@/lib/twoStageApproval");
        deptUserIds = await getDepartmentMemberIds(String((session.user as any).id));
      } else if (deptFilterParam && deptFilterParam !== "all") {
        // Global viewer has selected a specific department
        const allActiveUsers = await User.findAll({
          where: {
            status: { [Op.notIn]: ["inactive", "Inactive", "archived", "Archived", "terminated", "Terminated", "disabled", "Disabled"] },
            ...(companyId ? { companies: { [Op.like]: `%${companyId}%` } } : {})
          },
          attributes: ["id", "role"],
          raw: true
        });

        const activeIds = allActiveUsers.map((u: any) => u.id);
        const activeProfiles = await EmployeeProfile.findAll({
          where: { user: { [Op.in]: activeIds } },
          raw: true
        });

        const activeProfilesMap = new Map<string, any>();
        activeProfiles.forEach((p: any) => { activeProfilesMap.set(String(p.user), p); });

        const selectedCanonical = (deptFilterParam || "").toLowerCase().trim();

        const isMatchingDept = (profileDept: string, uRole: string, designation: string) => {
          const formatted = formatDeptName(profileDept, uRole, designation).toLowerCase();
          const raw = String(profileDept || "").toLowerCase();

          if (formatted === selectedCanonical || raw === selectedCanonical) return true;

          if (selectedCanonical.includes("hr") || selectedCanonical.includes("human")) {
            return formatted.includes("human") || raw.includes("hr") || raw.includes("human");
          }
          if (selectedCanonical.includes("it") || selectedCanonical.includes("tech") || selectedCanonical.includes("software")) {
            return formatted.includes("it") || raw.includes("it") || raw.includes("tech") || raw.includes("software");
          }
          if (selectedCanonical.includes("account") || selectedCanonical.includes("finance")) {
            return formatted.includes("finance") || raw.includes("account") || raw.includes("fin");
          }
          if (selectedCanonical.includes("legal") || selectedCanonical.includes("recovery") || selectedCanonical.includes("security")) {
            return formatted.includes("legal") || raw.includes("legal") || raw.includes("recov") || raw.includes("secur");
          }
          if (selectedCanonical.includes("admin") || selectedCanonical.includes("operation") || selectedCanonical.includes("ops")) {
            return formatted.includes("operation") || raw.includes("admin") || raw.includes("oper") || raw.includes("ops");
          }
          if (selectedCanonical.includes("management")) {
            return formatted.includes("management") || raw.includes("mgmt") || raw.includes("manag");
          }
          if (selectedCanonical.includes("business development") || selectedCanonical.includes("bda") || selectedCanonical.includes("sales")) {
            return formatted.includes("business development") || raw.includes("bda") || raw.includes("sales");
          }

          return false;
        };

        deptUserIds = allActiveUsers
          .filter((u: any) => {
            const p = activeProfilesMap.get(String(u.id));
            return isMatchingDept(p?.department || "", u.role || "", p?.designation || "");
          })
          .map((u: any) => u.id);
      } else {
        // Global admin with "all" departments selected, show all active users in company
        let activeUsersQuery: any = { status: "active" };
        if (companyId) {
          activeUsersQuery.companies = { [Op.like]: `%${companyId}%` };
        }
        const activeUsers = await User.findAll({
          where: activeUsersQuery,
          attributes: ["id"]
        });
        deptUserIds = activeUsers.map((u: any) => u.id);
      }

      // 1. Team Members: active staff members in the department
      const teamMembersCount = await User.count({
        where: {
          id: { [Op.in]: deptUserIds },
          status: "active"
        }
      });

      // 2. SOD/EOD compliances for department today
      const deptSodsToday = await SodReport.findAll({
        where: {
          employee: { [Op.in]: deptUserIds },
          date: {
            [Op.gte]: today,
            [Op.lt]: tomorrow
          }
        }
      });
      const deptSodCount = new Set(deptSodsToday.map((r: any) => r.employee?.toString()).filter(Boolean)).size;

      const deptEodsToday = await EodReport.findAll({
        where: {
          employee: { [Op.in]: deptUserIds },
          date: {
            [Op.gte]: today,
            [Op.lt]: tomorrow
          }
        }
      });
      const deptEodCount = new Set(deptEodsToday.map((r: any) => r.employee?.toString()).filter(Boolean)).size;

      // 3. Tasks planned/created for today in department
      const deptTaskRows = await TaskLog.findAll({
        where: {
          [Op.or]: [
            { employee: { [Op.in]: deptUserIds } },
            { forwardedTo: { [Op.in]: deptUserIds } }
          ],
          date: {
            [Op.gte]: today,
            [Op.lt]: tomorrow
          }
        },
        attributes: ["id", "employee", "forwardedTo", "taskTitle", "status", "deadlineAt", "date"],
        raw: true
      });
      const deptTasksToday = deptTaskRows.length;
      const completedStatuses = new Set(["completed", "complete", "done"]);
      const inProgressStatuses = new Set(["in progress", "in-progress", "working", "started"]);
      const completedTasks = deptTaskRows.filter((task: any) =>
        completedStatuses.has(String(task.status || "").trim().toLowerCase())
      ).length;
      const inProgressTasks = deptTaskRows.filter((task: any) =>
        inProgressStatuses.has(String(task.status || "").trim().toLowerCase())
      ).length;
      const pendingTasks = Math.max(0, deptTasksToday - completedTasks - inProgressTasks);
      const overdueTasks = deptTaskRows.filter((task: any) => {
        if (completedStatuses.has(String(task.status || "").trim().toLowerCase())) return false;
        return task.deadlineAt && new Date(task.deadlineAt).getTime() < now.getTime();
      }).length;

      // 4. Pending manager approvals (leaves and expense claims) for department members
      const pendingLeavesCount = await Leave.count({
        where: {
          employee: { [Op.in]: deptUserIds },
          status: { [Op.in]: ["Pending", "Pending Manager Approval"] }
        }
      });

      const pendingExpensesCount = await Expense.count({
        where: {
          employee: { [Op.in]: deptUserIds },
          status: "Pending"
        }
      });

      const pendingApprovalsCount = pendingLeavesCount + pendingExpensesCount;

      // 5. Avg Performance (compliance rate: % of completed tasks today out of all tasks today)
      const deptCompletedTasksCount = completedTasks;

      const performanceAvg = deptTasksToday > 0
        ? Math.round((deptCompletedTasksCount / deptTasksToday) * 100)
        : 100; // Default to 100% compliance if no tasks exist

      // Fetch details of all team members in deptUserIds for compliance list
      const teamUsers = await User.findAll({
        where: { id: { [Op.in]: deptUserIds } },
        attributes: ["id", "name", "role", "status"]
      });

      const teamProfiles = await EmployeeProfile.findAll({
        where: { user: { [Op.in]: deptUserIds } }
      });

      const teamProfilesMap: Record<string, any> = {};
      teamProfiles.forEach((p: any) => {
        teamProfilesMap[p.user] = {
          department: p.department || "N/A",
          designation: p.designation || "N/A"
        };
      });

      const approvedLeavesToday = await Leave.findAll({
        where: {
          employee: { [Op.in]: deptUserIds },
          status: "Approved",
          startDate: { [Op.lte]: endOfToday },
          endDate: { [Op.gte]: today }
        },
        attributes: ["employee"],
        raw: true
      });
      const leaveUserIds = new Set(
        approvedLeavesToday.map((leave: any) => String(leave.employee)).filter(Boolean)
      );
      const presentUserIds = new Set(finalPresentIds.map(String));

      const memberTaskSummary: Record<string, { total: number; completed: number; overdue: number }> = {};
      deptTaskRows.forEach((task: any) => {
        const employeeId = String(task.forwardedTo || task.employee || "");
        if (!employeeId) return;
        if (!memberTaskSummary[employeeId]) {
          memberTaskSummary[employeeId] = { total: 0, completed: 0, overdue: 0 };
        }
        const summary = memberTaskSummary[employeeId];
        summary.total++;
        const isCompleted = completedStatuses.has(String(task.status || "").trim().toLowerCase());
        if (isCompleted) summary.completed++;
        if (!isCompleted && task.deadlineAt && new Date(task.deadlineAt).getTime() < now.getTime()) {
          summary.overdue++;
        }
      });

      const deptTeamList = teamUsers
        .filter((u: any) => u && u.id)
        .map((u: any) => {
          const uidStr = String(u.id);
          return {
            id: u.id,
            name: u.name || "Unnamed",
            role: u.role || "Employee",
            status: u.status || "active",
            department: teamProfilesMap[u.id]?.department || "N/A",
            designation: teamProfilesMap[u.id]?.designation || "N/A",
            sodTime: sodMap[uidStr] || null,
            eodTime: eodMap[uidStr] || null,
            attendanceStatus: leaveUserIds.has(uidStr)
              ? "On Leave"
              : presentUserIds.has(uidStr)
                ? "Present"
                : "Absent",
            tasksTotal: memberTaskSummary[uidStr]?.total || 0,
            tasksCompleted: memberTaskSummary[uidStr]?.completed || 0,
            tasksOverdue: memberTaskSummary[uidStr]?.overdue || 0
          };
        });

      // Get team activities (HRRecentActivity + SodReports + EodReports for department members)
      const [dbTeamActivities, teamSods, teamEods] = await Promise.all([
        HRRecentActivity.findAll({
          where: { user: { [Op.in]: deptUserIds } },
          order: [['timestamp', 'DESC']],
          limit: 15,
          raw: true
        }),
        SodReport.findAll({
          where: { employee: { [Op.in]: deptUserIds } },
          order: [['createdAt', 'DESC']],
          limit: 15,
          raw: true
        }),
        EodReport.findAll({
          where: { employee: { [Op.in]: deptUserIds } },
          order: [['createdAt', 'DESC']],
          limit: 15,
          raw: true
        })
      ]);

      const teamActorIds = [...new Set([
        ...dbTeamActivities.map((a: any) => a.user),
        ...teamSods.map((s: any) => s.employee),
        ...teamEods.map((e: any) => e.employee)
      ].filter(Boolean))];

      let teamActorMap: any = {};
      if (teamActorIds.length > 0) {
        const users = await User.findAll({ where: { id: { [Op.in]: teamActorIds } }, raw: true });
        users.forEach((u: any) => { teamActorMap[u.id] = { name: u.name, role: u.role }; });
      }

      const teamActList: any[] = [];

      dbTeamActivities.forEach((log: any) => {
        const actorInfo = teamActorMap[log.user] || { name: 'Unknown', role: 'Staff' };
        let title = "HR Activity";
        const action = log.action;
        if (action === "CREATE_EMPLOYEE") title = "New Employee Onboarded";
        else if (action === "SCHEDULE_INTERVIEW") title = "Interview Scheduled";
        else if (action === "SUBMIT_INTERVIEW_EVALUATION") title = "Interview Evaluated";
        else if (action === "SUBMIT_VERIFICATION") title = "Document Verified";
        else if (action === "APPROVED_LEAVE") title = "Leave Request Approved";
        else if (action === "REJECTED_LEAVE") title = "Leave Request Rejected";
        else if (action === "CREATE_JOB") title = "Job Vacancy Posted";
        else if (action === "UPDATE_TRAINING_LOG") title = "Training Record Updated";
        else if (action === "SUBMIT_PROBATION_EVALUATION") title = "Probation Evaluated";

        teamActList.push({
          id: (log.id || "").toString(),
          title,
          description: log.details,
          timestamp: log.timestamp ? new Date(log.timestamp).toISOString() : new Date().toISOString(),
          action: action || "HR_ACTIVITY",
          actor: actorInfo.name,
          actorRole: actorInfo.role
        });
      });

      teamSods.forEach((sod: any) => {
        const empId = (sod.employee || "").toString();
        const actorInfo = teamActorMap[empId] || { name: "Team Member", role: "Staff" };
        const ts = sod.createdAt ? new Date(sod.createdAt).toISOString() : (sod.date ? new Date(sod.date).toISOString() : new Date().toISOString());
        teamActList.push({
          id: "dept_sod_" + (sod.id || Date.now()),
          title: "SOD Declared",
          description: `${actorInfo.name} declared Start of Day (SOD). Task: ${sod.taskSummary || ""}${sod.remarks ? ` — Remarks: ${sod.remarks}` : ""}`,
          timestamp: ts,
          action: "SOD_DECLARED",
          actor: actorInfo.name,
          actorRole: actorInfo.role || ""
        });
      });

      teamEods.forEach((eod: any) => {
        const empId = (eod.employee || "").toString();
        const actorInfo = teamActorMap[empId] || { name: "Team Member", role: "Staff" };
        const ts = eod.createdAt ? new Date(eod.createdAt).toISOString() : (eod.date ? new Date(eod.date).toISOString() : new Date().toISOString());
        teamActList.push({
          id: "dept_eod_" + (eod.id || Date.now()),
          title: "EOD Declared",
          description: `${actorInfo.name} submitted End of Day (EOD) report. Completed: ${eod.completedWork || ""}`,
          timestamp: ts,
          action: "EOD_DECLARED",
          actor: actorInfo.name,
          actorRole: actorInfo.role || ""
        });
      });

      teamActList.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      const teamActivities: any[] = [];
      const teamSeenSet = new Set<string>();

      for (const item of teamActList) {
        const dateDay = item.timestamp.substring(0, 10);
        const dedupeKey = `${item.action}_${item.actor}_${dateDay}_${(item.description || "").substring(0, 20)}`;
        if (!teamSeenSet.has(dedupeKey)) {
          teamSeenSet.add(dedupeKey);
          teamActivities.push(item);
        }
      }

      // Get compliance trend for last 6 months
      const performanceTrend = [];
      const monthNamesAbbr = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const mIndex = d.getMonth();
        const yVal = d.getFullYear();

        const mStart = new Date(Date.UTC(yVal, mIndex, 1, 0, 0, 0, 0));
        const mEnd = new Date(Date.UTC(yVal, mIndex + 1, 0, 23, 59, 59, 999));

        const sodsInMonth = await SodReport.findAll({
          where: {
            employee: { [Op.in]: deptUserIds },
            date: {
              [Op.gte]: mStart,
              [Op.lte]: mEnd
            }
          },
          attributes: ["employee", "date"]
        });

        const uniqueSubmissions = new Set(
          sodsInMonth.map((r: any) => {
            const dateStr = new Date(r.date).toISOString().split("T")[0];
            return `${r.employee}-${dateStr}`;
          })
        ).size;

        let workDays = 0;
        const limitDay = (mIndex === now.getMonth() && yVal === now.getFullYear())
          ? now.getDate()
          : mEnd.getDate();

        for (let day = 1; day <= limitDay; day++) {
          const checkDate = new Date(yVal, mIndex, day);
          if (checkDate.getDay() !== 0) {
            workDays++;
          }
        }

        const totalExpected = (teamMembersCount * workDays) || 1;
        const rate = Math.min(100, Math.round((uniqueSubmissions / totalExpected) * 100));

        performanceTrend.push({
          month: monthNamesAbbr[mIndex],
          rate: rate || 0
        });
      }

      deptStats = {
        teamMembers: teamMembersCount,
        tasksToday: deptTasksToday,
        completedTasks,
        inProgressTasks,
        pendingTasks,
        overdueTasks,
        sod: deptSodCount,
        eod: deptEodCount,
        sodPending: Math.max(0, teamMembersCount - deptSodCount),
        eodPending: Math.max(0, teamMembersCount - deptEodCount),
        presentToday: deptTeamList.filter((member: any) => member.attendanceStatus === "Present").length,
        onLeaveToday: deptTeamList.filter((member: any) => member.attendanceStatus === "On Leave").length,
        absentToday: deptTeamList.filter((member: any) => member.attendanceStatus === "Absent").length,
        performanceAvg: Math.min(100, performanceAvg),
        pendingApprovals: pendingApprovalsCount,
        pendingLeaves: pendingLeavesCount,
        pendingExpenses: pendingExpensesCount,
        teamList: deptTeamList,
        teamActivities,
        performanceTrend
      };
    } else {
      // Fallback for non-managers
      deptStats = {
        teamMembers: 0,
        tasksToday: 0,
        sod: 0,
        eod: 0,
        performanceAvg: 0,
        pendingApprovals: 0
      };
    }

    // Fetch staff list for dashboard viewing (filtered by userFilter)
    const staffUsers = await User.findAll({ where: userFilter, attributes: ['id', 'name', 'email', 'role', 'status', 'companies'] });

    const staffProfileIds = staffUsers.map((u: any) => u.id);
    let staffProfiles: any[] = [];
    if (staffProfileIds.length > 0) {
      staffProfiles = await EmployeeProfile.findAll({ where: { user: { [Op.in]: staffProfileIds } } });
    }
    const staffProfilesMap: Record<string, any> = {};
    staffProfiles.forEach((p: any) => {
      staffProfilesMap[p.user] = {
        department: p.department || 'N/A',
        designation: p.designation || 'N/A',
        vertical: p.vertical || 'Unassigned'
      };
    });

    const approvedLeavesTodayAll = await Leave.findAll({
      where: {
        status: "Approved",
        startDate: { [Op.lte]: endOfToday },
        endDate: { [Op.gte]: today }
      },
      raw: true
    }).catch(() => []);
    const leaveMap: Record<string, string> = {};
    approvedLeavesTodayAll.forEach((l: any) => {
      if (l.employee) {
        leaveMap[String(l.employee)] = l.reason || l.leaveType || "Approved Leave";
      }
    });

    const staffList = staffUsers
      .filter((u: any) => u && u.id)
      .map((u: any) => {
        const uidStr = String(u.id);
        const isPresent = finalPresentIds.includes(uidStr);
        const isOnLeave = Boolean(leaveMap[uidStr]);
        const attendanceStatus = isOnLeave ? "On Leave" : (isPresent ? "Present" : "Absent");
        const userDept = formatDeptName(staffProfilesMap[u.id]?.department, u.role, staffProfilesMap[u.id]?.designation);
        return {
          id: u.id,
          name: u.name || 'Unnamed',
          email: u.email || '',
          role: u.role || 'Employee',
          status: u.status || 'active',
          companies: u.companies || [],
          department: userDept,
          designation: staffProfilesMap[u.id]?.designation || 'N/A',
          vertical: staffProfilesMap[u.id]?.vertical || 'Unassigned',
          isPresent,
          isOnLeave,
          leaveReason: leaveMap[uidStr] || null,
          attendanceStatus,
          sodTime: sodMap[uidStr] || null,
          eodTime: eodMap[uidStr] || null
        };
      });

    const possibleUserKeys = [
      sessionUser.id,
      sessionUser.email,
      sessionUser.name,
      dbUser?.email,
      dbUser?.name,
      (dbUser as any)?.employeeId
    ].filter(Boolean);

    const isGlobalViewerOrOwner = ["Owner", "Director", "HR Head", "HR Executive"].includes(sessionUser.role);

    const pendingTaskWhere: any = {
      [Op.or]: [
        { status: { [Op.notIn]: ["Completed", "completed", "Done", "done", "Approved", "approved"] } },
        { status: { [Op.is]: null } }
      ]
    };

    if (!isGlobalViewerOrOwner) {
      pendingTaskWhere[Op.and] = [
        {
          [Op.or]: [
            { employee: { [Op.in]: possibleUserKeys } },
            { forwardedTo: { [Op.in]: possibleUserKeys } }
          ]
        }
      ];
    } else if (companyId) {
      const usersInCompany = await User.findAll({
        where: { companies: { [Op.like]: `%${companyId}%` } },
        attributes: ['id', 'email', 'name'],
        raw: true
      });
      const companyUserKeys = usersInCompany.flatMap((u: any) => [u.id, u.email, u.name]).filter(Boolean);
      if (companyUserKeys.length > 0) {
        pendingTaskWhere[Op.and] = [
          {
            [Op.or]: [
              { employee: { [Op.in]: companyUserKeys } },
              { forwardedTo: { [Op.in]: companyUserKeys } }
            ]
          }
        ];
      }
    }

    let userPendingTasksCount = await TaskLog.count({
      where: pendingTaskWhere
    });

    // Also include synthetic LegalRecoverySchedule tasks merged into My Tasks page (/api/tasks)
    try {
      const LegalRecoverySchedule = (sequelize.models as any).LegalRecoverySchedule || (await import("@/models/sequelize/LegalRecoverySchedule")).default;
      if (LegalRecoverySchedule) {
        await LegalRecoverySchedule.sync();
        const allTaskLogs = await TaskLog.findAll({
          where: pendingTaskWhere,
          attributes: ["id"],
          raw: true
        });
        const existingTaskIds = new Set(allTaskLogs.map((r: any) => String(r.id || "").trim()));

        const legalUserProfiles = await EmployeeProfile.findAll({
          where: {
            [Op.or]: [
              { vertical: { [Op.like]: "%legal%" } },
              { vertical: { [Op.like]: "%security%" } },
              { department: { [Op.like]: "%legal%" } },
              { department: { [Op.like]: "%security%" } }
            ]
          },
          attributes: ["user"],
          raw: true
        });
        const legalUserIds = new Set(legalUserProfiles.map((p: any) => String(p.user)));

        const schRecords = await LegalRecoverySchedule.findAll({
          where: {
            status: {
              [Op.or]: [
                { [Op.notIn]: ["Completed", "completed", "Done", "done", "Approved", "approved"] },
                { [Op.is]: null }
              ]
            }
          },
          raw: true
        });

        const missingSchs = schRecords.filter((s: any) => {
          const empIdStr = String(s.employeeId || "").trim();
          if (!legalUserIds.has(empIdStr)) return false;
          const sId = String(s.id || "").trim();
          const tId = String(s.taskId || "").trim();
          if (sId && existingTaskIds.has(sId)) return false;
          if (tId && existingTaskIds.has(tId)) return false;
          return true;
        });

        userPendingTasksCount += missingSchs.length;
      }
    } catch (schErr) {
      console.error("Error merging LegalRecoverySchedule into stats pending count:", schErr);
    }

    const [pendingLeavesCount, pendingAssetRequestsCount] = await Promise.all([
      Leave.count({ where: { status: "Pending" } }),
      AssetRequest.count({ where: { status: "Pending" } })
    ]);

    return NextResponse.json({
      success: true,
      stats: {
        pendingApprovals: {
          pendingTasks: userPendingTasksCount,
          pendingLeaves: pendingLeavesCount,
          pendingAssets: pendingAssetRequestsCount,
          pendingRequestsTotal: pendingLeavesCount + pendingAssetRequestsCount,
        },
        staffList,
        currentUserStats: {
          presentDays: presentDaysCount,
          totalWorkingDays: workingDaysInMonth,
          attendancePercent: workingDaysInMonth > 0 ? Math.min(100, Math.round((presentDaysCount / workingDaysInMonth) * 100)) : 100,
          casualLeave,
          sickLeave,
          earnedLeave,
          casualLeaveTaken,
          sickLeaveTaken,
          pendingTasksCount: userPendingTasksCount,
          holidayName: upcomingHoliday.name,
          holidayDate: holidayDateStr
        },
        hrActivities,
        candidates: {
          total: totalCandidates,
          pending: pendingCandidates,
          selected: selectedCandidates,
          highRisk: highRiskCandidates,
        },
        interviews: {
          pending: pendingInterviews,
        },
        roles: {
          employees: totalEmployees,
          associates: totalAssociates,
          vendors: totalVendors,
          franchises: totalFranchises,
        },
        operations: {
          trainingPending,
          probationCases: activeProbations,
          grievanceCases: activeGrievances,
          disciplinaryWarnings: {
            myActive: myActiveWarnings,
            pendingApprovals: pendingWarningApprovals,
          }
        },
        alerts: {
          criticalRisk: criticalRiskAlerts,
          totalRisk: totalRiskAlerts,
        },
        todayCompliance: {
          attendance: presentCount,
          lateCheckins: lateCount,
          absent: absentCount,
          leaves: leavesCount,
          sod: uniqueSodEmployees.length,
          eod: uniqueEodEmployees.length,
        },
        currentUserCompliance: {
          hasSod: uniqueSodEmployees.includes((session.user as any).id?.toString()),
          hasEod: uniqueEodEmployees.includes((session.user as any).id?.toString()),
        },
        hrStats: {
          interviewsToday: todayInterviewsCount,
          verificationPending: pendingVerificationsCount,
          newCandidates: pendingCandidates,
          trainingStatus: trainingPending,
          probationStatus: activeProbations,
          hrLeadsCount: totalLeadsCount,
          selectedLeadsCount: selectedLeadsCount,
          pendingLeadsCount: pendingLeadsCount,
          rejectedLeadsCount: rejectedLeadsCount,
        },
        deptStats
      },
      userMenuAccess
    });
  } catch (error: any) {
    console.error("Dashboard stats error:", error);
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('fs').appendFileSync('stats-error.log', new Date().toISOString() + ': ' + (error.stack || error) + '\n');
    return NextResponse.json({ success: false, error: "Failed to load dashboard statistics" }, { status: 500 });
  }
}
