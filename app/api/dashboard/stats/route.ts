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
import Franchise from "@/models/sequelize/Franchise";
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

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    await sequelize.authenticate();
    const dbUser = await User.findByPk((session.user as any).id, { raw: true });
    const userMenuAccess = dbUser?.menuAccess || null;

    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get("companyId");


    // Filters based on selected company
    let userFilter: any = {};
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
    const isGlobalViewer = ["Owner", "Director", "HR Head"].includes(sessionUser.role);

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
    const totalAssociates = await Associate.count({ where: { status: "active" } });
    const totalVendors = await Vendor.count({ where: { status: "active" } });
    const totalFranchises = await Franchise.count({ where: { status: "active" } });

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
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setUTCHours(23, 59, 59, 999);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const sodReportsToday = await SodReport.findAll({
      where: {
        ...reportFilter,
        date: {
          [Op.gte]: today,
          [Op.lt]: tomorrow
        }
      }
    });
    const sodEmployeeIds = sodReportsToday.map((r: any) => r.employee?.toString()).filter(Boolean);
    const uniqueSodEmployees = sodEmployeeIds.filter((v: any, i: number, a: any[]) => a.indexOf(v) === i);

    const eodReportsToday = await EodReport.findAll({
      where: {
        ...reportFilter,
        date: {
          [Op.gte]: today,
          [Op.lt]: tomorrow
        }
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
    const attendanceEmployeeIds = attendanceRecords.map((r: any) => r.employee?.toString()).filter(Boolean);
    const combinedIds = [...uniqueSodEmployees, ...uniqueEodEmployees, ...attendanceEmployeeIds];
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

    const eligibleCandIds = allCands.filter((cand: any) => {
      const cid = cand.id.toString();
      const rounds = candidateInterviewsMap[cid] || new Set();
      const hasAllThree = rounds.has(1) && rounds.has(2) && rounds.has(3);
      const isDirectlyHired = cand.status === "Selected" && cand.currentRound === 3;
      return hasAllThree || isDirectlyHired;
    }).map((c: any) => c.id.toString());
    const verifiedDocs = await Verification.findAll({
      where: {
        candidate: { [Op.in]: eligibleCandIds },
        status: "Verified"
      }
    });
    const verifiedIds = new Set(verifiedDocs.map(v => v.candidate.toString()));
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
      order: [['timestamp', 'DESC']],
      limit: 50,
      raw: true
    });

    // Query live SOD, EOD, and Fines tables so any SOD/EOD submitted directly is included
    const [recentSods, recentEods, recentFinesList] = await Promise.all([
      SodReport.findAll({ order: [['createdAt', 'DESC']], limit: 25, raw: true }).catch(() => []),
      EodReport.findAll({ order: [['createdAt', 'DESC']], limit: 25, raw: true }).catch(() => []),
      AbsentFine.findAll({ order: [['createdAt', 'DESC']], limit: 25, raw: true }).catch(() => [])
    ]);

    const allActorIds = [...new Set([
      ...dbHrActivities.map((a: any) => a.user),
      ...recentSods.map((s: any) => s.employee),
      ...recentEods.map((e: any) => e.employee),
      ...recentFinesList.map((f: any) => f.employee),
      ...recentFinesList.map((f: any) => f.imposedBy),
    ].filter(Boolean))];

    let userMap: Record<string, { name: string; role: string }> = {};
    if (allActorIds.length > 0) {
      const users = await User.findAll({ where: { id: { [Op.in]: allActorIds } }, raw: true });
      users.forEach((u: any) => { userMap[u.id.toString()] = { name: u.name, role: u.role }; });
    }

    const actList: any[] = dbHrActivities.map((a: any) => {
      let title = a.action ? a.action.replace(/_/g, " ") : "HR Activity";
      const action = a.action;
      if (action === "CREATE_EMPLOYEE") title = "New Employee Onboarded";
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
      else if (action === "EMPLOYEE_UPDATED") title = "Employee Profile Updated";
      else if (action === "FINE_IMPOSED") title = "Absent Fine Imposed";

      const userInfo = userMap[a.user?.toString()] || (typeof a.user === "object" ? a.user : { name: "System", role: "Staff" });

      return {
        id: (a.id || "").toString(),
        title,
        description: a.details,
        timestamp: a.timestamp ? new Date(a.timestamp).toISOString() : new Date().toISOString(),
        action: a.action || "HR_ACTIVITY",
        actor: userInfo.name || "System",
        actorRole: userInfo.role || ""
      };
    });

    // Convert SodReports
    recentSods.forEach((sod: any) => {
      const empId = (sod.employee || "").toString();
      const userInfo = userMap[empId] || { name: "Employee", role: "Staff" };
      const ts = sod.createdAt ? new Date(sod.createdAt).toISOString() : (sod.date ? new Date(sod.date).toISOString() : new Date().toISOString());
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
      const ts = eod.createdAt ? new Date(eod.createdAt).toISOString() : (eod.date ? new Date(eod.date).toISOString() : new Date().toISOString());
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
      const ts = fine.createdAt ? new Date(fine.createdAt).toISOString() : new Date().toISOString();
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

    // Sort all by timestamp DESC and deduplicate by action + actor + timestamp_date
    actList.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

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
    const userProfile = await EmployeeProfile.findOne({ where: { user: userId } });
    let casualLeave = 12;
    let sickLeave = 12;
    let earnedLeave = 0;

    if (userProfile) {
      casualLeave = (userProfile.get("leaveBalances.casualLeave") as number) ?? 12;
      sickLeave = (userProfile.get("leaveBalances.sickLeave") as number) ?? 12;
      earnedLeave = (userProfile.get("leaveBalances.earnedLeave") as number) ?? 0;
    }

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const startOfMonth = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
    const endOfMonth = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999));

    const presentDaysCount = await Attendance.count({
      where: {
        employee: userId,
        status: "Present",
        date: {
          [Op.gte]: startOfMonth,
          [Op.lte]: endOfMonth
        }
      }
    });

    let workingDaysInMonth = 0;
    const endLimit = new Date();
    const limitDate = endLimit > endOfMonth ? endOfMonth.getDate() : endLimit.getDate();
    for (let d = 1; d <= limitDate; d++) {
      const checkDate = new Date(year, month, d);
      if (checkDate.getDay() !== 0) { // Exclude Sundays
        workingDaysInMonth++;
      }
    }
    if (workingDaysInMonth === 0) workingDaysInMonth = 22;

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

    // Fetch all approved leaves for this employee in the current month to calculate Casual and Sick Leave taken
    const userLeavesThisMonth = await Leave.findAll({
      where: {
        employee: userId,
        status: "Approved",
        startDate: {
          [Op.gte]: startOfMonth,
          [Op.lte]: endOfMonth
        }
      }
    });

    let casualLeaveTaken = 0;
    let sickLeaveTaken = 0;

    userLeavesThisMonth.forEach((l: any) => {
      const lType = l.type || "Casual Leave";
      const lDays = l.days || 0;
      if (lType === "Casual Leave") {
        casualLeaveTaken += lDays;
      } else if (lType === "Sick Leave") {
        sickLeaveTaken += lDays;
      }
    });
    // 8. Department Dashboard metrics
    // Calculate deptStats dynamically for Managers/Owners
    let deptStats: any = null;
    const userRole = (session.user as any).role;
    const isManager = (role: string) => {
      const r = (role || "").toLowerCase();
      return r === "department manager" || r.includes("manager") || r === "dsm" || r === "owner" || r === "director" || r === "hr head" || r === "hr executive";
    };

    if (isManager(userRole)) {
      let deptUserIds: any[] = [];
      let managerProfile = null;
      const deptFilterParam = searchParams.get("department");

      const isSpecificManager = !["Owner", "Director", "HR Head", "HR Executive"].includes(userRole);
      if (isSpecificManager) {
        managerProfile = await EmployeeProfile.findOne({ where: { user: userId } });
        
        let deptProfiles: any[] = [];
        if (managerProfile && managerProfile.department) {
          deptProfiles = await EmployeeProfile.findAll({
            where: { department: managerProfile.department },
            attributes: ["user"]
          });
        }

        let reportProfiles: any[] = [];
        if (dbUser && dbUser.name) {
          reportProfiles = await EmployeeProfile.findAll({
            where: { reportingManager: dbUser.name },
            attributes: ["user"]
          });
        }

        deptUserIds = [...new Set([
          ...deptProfiles.map((p: any) => p.user),
          ...reportProfiles.map((p: any) => p.user)
        ])].filter(Boolean);
      } else if (deptFilterParam && deptFilterParam !== "all") {
        // Global viewer has selected a specific department
        const deptProfiles = await EmployeeProfile.findAll({
          where: { department: deptFilterParam },
          attributes: ["user"]
        });
        deptUserIds = deptProfiles.map((p: any) => p.user).filter(Boolean);
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
      const deptTasksToday = await TaskLog.count({
        where: {
          [Op.or]: [
            { employee: { [Op.in]: deptUserIds } },
            { forwardedTo: { [Op.in]: deptUserIds } }
          ],
          date: {
            [Op.gte]: today,
            [Op.lt]: tomorrow
          }
        }
      });

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
      const deptCompletedTasksCount = await TaskLog.count({
        where: {
          [Op.or]: [
            { employee: { [Op.in]: deptUserIds } },
            { forwardedTo: { [Op.in]: deptUserIds } }
          ],
          status: "Completed",
          date: {
            [Op.gte]: today,
            [Op.lt]: tomorrow
          }
        }
      });

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

      const deptTeamList = teamUsers.map((u: any) => ({
        id: u.id,
        name: u.name || "Unnamed",
        role: u.role || "Employee",
        status: u.status || "active",
        department: teamProfilesMap[u.id]?.department || "N/A",
        designation: teamProfilesMap[u.id]?.designation || "N/A",
        sodTime: sodMap[u.id.toString()] || null,
        eodTime: eodMap[u.id.toString()] || null
      }));

      // Get team activities
      let dbTeamActivities = await HRRecentActivity.findAll({
        where: { user: { [Op.in]: deptUserIds } },
        order: [['timestamp', 'DESC']],
        limit: 15,
        raw: true
      });

      const teamActorIds = [...new Set(dbTeamActivities.map((a: any) => a.user).filter(Boolean))];
      let teamActorMap: any = {};
      if (teamActorIds.length > 0) {
        const users = await User.findAll({ where: { id: { [Op.in]: teamActorIds } }, raw: true });
        users.forEach((u: any) => { teamActorMap[u.id] = { name: u.name, role: u.role }; });
      }

      const teamActivities = dbTeamActivities
        .map((log: any) => {
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

          return {
            id: (log.id || "").toString(),
            title,
            description: log.details,
            timestamp: log.timestamp ? new Date(log.timestamp).toISOString() : new Date().toISOString(),
            action,
            actor: actorInfo.name,
            actorRole: actorInfo.role
          };
        });

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
        sod: deptSodCount,
        eod: deptEodCount,
        performanceAvg: Math.min(100, performanceAvg),
        pendingApprovals: pendingApprovalsCount,
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
        designation: p.designation || 'N/A'
      };
    });



    const staffList = staffUsers.map((u: any) => ({
      id: u.id,
      name: u.name || 'Unnamed',
      email: u.email || '',
      role: u.role || 'Employee',
      status: u.status || 'active',
      companies: Array.isArray(u.companies) ? u.companies.join(', ') : (u.companies || 'N/A'),
      department: staffProfilesMap[u.id]?.department || 'N/A',
      designation: staffProfilesMap[u.id]?.designation || 'N/A',
      isPresent: finalPresentIds.includes(u.id.toString()),
      sodTime: sodMap[u.id.toString()] || null,
      eodTime: eodMap[u.id.toString()] || null
    }));

    const userPendingTasksCount = await TaskLog.count({
      where: {
        [Op.or]: [
          { employee: sessionUser.id },
          { forwardedTo: sessionUser.id }
        ],
        status: { [Op.ne]: "Completed" }
      }
    });

    return NextResponse.json({
      success: true,
      stats: {
        staffList,
        currentUserStats: {
          presentDays: presentDaysCount,
          totalWorkingDays: workingDaysInMonth,
          attendancePercent: workingDaysInMonth > 0 ? Math.round((presentDaysCount / workingDaysInMonth) * 100) : 100,
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
