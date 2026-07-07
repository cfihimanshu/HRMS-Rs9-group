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
    let userFilter: any = { role: { [Op.in]: ["Employee", "Trainer"] } };
    let candidateFilter: any = {};
    let interviewFilter: any = {};
    let generalUserFilter: any = {}; // for Probation, Grievance, Attendance, Exits, etc.
    let generalCandidateFilter: any = {}; // for Training, Verification, etc.

    let attendanceFilter: any = {};
    let grievanceFilter: any = {};
    let alertFilter: any = {};
    let exitFilter: any = {};
    let reportFilter: any = {};

    if (companyId) {
      userFilter.companies = { [Op.like]: `%${companyId}%` };
      
      const jobs = await Job.findAll({ where: { company: companyId }, attributes: ['id'] });
      const jobIds = jobs.map((j: any) => j.id);
      
      candidateFilter.job = { [Op.in]: jobIds };

      const cands = await Candidate.findAll({ where: { job: { [Op.in]: jobIds } }, attributes: ['id'] });
      const candIds = cands.map((c: any) => c.id);
      
      interviewFilter.candidate = { [Op.in]: candIds };
      generalCandidateFilter.candidate = { [Op.in]: candIds };
      
      const usersInCompany = await User.findAll({ where: { companies: { [Op.like]: `%${companyId}%` } }, attributes: ['id'] });
      const userIds = usersInCompany.map((u: any) => u.id);
      
      generalUserFilter.employee = { [Op.in]: userIds }; // Probation uses 'employee'
      
      // Need a flexible filter for other models (Attendance uses user, Grievance uses raisedBy, etc)
      attendanceFilter = { user: { [Op.in]: userIds } };
      grievanceFilter = { raisedBy: { [Op.in]: userIds } };
      alertFilter = { user: { [Op.in]: userIds } };
      exitFilter = { employee: { [Op.in]: userIds } };
      reportFilter = { user: { [Op.in]: userIds } };
    }

    // 1. Candidate Stats
    const totalCandidates = await Candidate.count({ where: candidateFilter });
    const pendingCandidates = await Candidate.count({ where: { ...candidateFilter, status: "Pending" } });
    const selectedCandidates = await Candidate.count({ where: { ...candidateFilter, status: "Selected" } });
    const highRiskCandidates = await Candidate.count({ where: { ...candidateFilter, status: "High Risk" } });

    // 2. Interview Stats
    const pendingInterviews = await Interview.count({ where: { ...interviewFilter, status: "Pending" } });

    // 3. User Master Roles count
    // Using User to accurately reflect all staff accounts configured in the system.
    let userRoleFilter: any = {};
    if (companyId) {
      userRoleFilter.companies = { [Op.like]: `%${companyId}%` };
    }
    const totalEmployees = await User.count({ where: userRoleFilter });
    
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

    // 6. Attendance, SOD/EOD compliances (today's counts)
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setUTCHours(23, 59, 59, 999);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const sodReportsToday = await SodReport.findAll({
      where: {
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
        date: {
          [Op.gte]: today,
          [Op.lt]: tomorrow
        }
      }
    });
    const eodEmployeeIds = eodReportsToday.map((r: any) => r.employee?.toString()).filter(Boolean);
    const uniqueEodEmployees = eodEmployeeIds.filter((v: any, i: number, a: any[]) => a.indexOf(v) === i);

    const totalEmployeesCount = await User.count({ where: userRoleFilter });

    const attendanceRecords = await Attendance.findAll({
      where: {
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
    const absentCount = Math.max(0, totalEmployeesCount - uniqueSodEmployees.length);

    const leavesCount = await Leave.count({ where: {
      status: "Approved",
      startDate: { [Op.lte]: endOfToday },
      endDate: { [Op.gte]: today }
    } });

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
    const eligibleCandIds = Object.keys(candidateInterviewsMap).filter(cid => {
      const rounds = candidateInterviewsMap[cid];
      return rounds.has(1) && rounds.has(2) && rounds.has(3);
    });
    const verifiedDocs = await Verification.findAll({ where: {
      candidate: { [Op.in]: eligibleCandIds },
      status: "Verified"
    } });
    const verifiedIds = new Set(verifiedDocs.map(v => v.candidate.toString()));
    const pendingVerificationsCount = eligibleCandIds.filter(cid => !verifiedIds.has(cid)).length;

    const rejectedCandidatesCount = await Candidate.count({ where: { status: "Rejected" } });
    const activeExits = await ExitRecord.count({ where: { status: "active" } });

    // 8. Department Dashboard metrics
    // Aggregate tasks from today's SOD reports
    const tasksToday = sodReportsToday.reduce((acc: number, curr: any) => {
      return acc + (curr.callsPlanned || 0) + (curr.meetings || 0) + (curr.fieldVisits || 0);
    }, 0);

    // Fetch recent HR activities populated with user info
    let dbHrActivities = await HRRecentActivity.findAll({ 
      where: {},
      order: [['timestamp', 'DESC']],
      limit: 30,
      raw: true
    });

    const actorIds = [...new Set(dbHrActivities.map((a: any) => a.user).filter(Boolean))];
    let actorMap: any = {};
    if (actorIds.length > 0) {
      const users = await User.findAll({ where: { id: { [Op.in]: actorIds } }, raw: true });
      users.forEach((u: any) => { actorMap[u.id] = { name: u.name, role: u.role }; });
    }

    dbHrActivities = dbHrActivities.map((a: any) => ({
      ...a,
      user: actorMap[a.user] || { name: 'Unknown', role: 'Staff' }
    }));

    if (dbHrActivities.length === 0) {
      const hrUser = await User.findOne({ where: { role: "HR Head" } });
      if (hrUser) {
        const initialActivities = [
          {
            id: Date.now().toString() + "_1",
            user: hrUser.id,
            action: "CREATE_EMPLOYEE",
            details: "Created new employee profile: Sarah Jenkins (sarah.j@example.com) as Senior Frontend Developer in Engineering.",
            timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000)
          },
          {
            id: Date.now().toString() + "_2",
            user: hrUser.id,
            action: "APPROVED_LEAVE",
            details: "Leave request for Casual Leave (3 days) has been approved by HR / Supervisor.",
            timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000)
          },
          {
            id: Date.now().toString() + "_3",
            user: hrUser.id,
            action: "SCHEDULE_INTERVIEW",
            details: "Scheduled Round 1 Interview for candidate: David Lee.",
            timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000)
          },
          {
            id: Date.now().toString() + "_4",
            user: hrUser.id,
            action: "SUBMIT_VERIFICATION",
            details: "Background verification completed for candidate: John Doe. Overall status: Verified.",
            timestamp: new Date(Date.now() - 25 * 60 * 60 * 1000)
          }
        ];
        
        await HRRecentActivity.bulkCreate(initialActivities);
        
        dbHrActivities = await HRRecentActivity.findAll({ 
          where: {},
          order: [['timestamp', 'DESC']],
          limit: 30,
          raw: true
        });

        const newActorIds = [...new Set(dbHrActivities.map((a: any) => a.user).filter(Boolean))];
        let newActorMap: any = {};
        if (newActorIds.length > 0) {
          const users = await User.findAll({ where: { id: { [Op.in]: newActorIds } }, raw: true });
          users.forEach((u: any) => { newActorMap[u.id] = { name: u.name, role: u.role }; });
        }

        dbHrActivities = dbHrActivities.map((a: any) => ({
          ...a,
          user: newActorMap[a.user] || { name: 'Unknown', role: 'Staff' }
        }));
      }
    }

    const hrActivities = dbHrActivities
      .filter((log: any) => log.user)
      .map((log: any) => {
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
          id: (log.id || log.id || "").toString(),
          title,
          description: log.details,
          timestamp: log.timestamp ? new Date(log.timestamp).toISOString() : new Date().toISOString(),
          action,
          actor: log.user.name,
          actorRole: log.user.role
        };
      });

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
    todayDate.setHours(0,0,0,0);
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

    if (userRole === "Department Manager" || userRole === "Owner" || userRole === "Director" || userRole === "HR Head" || userRole === "HR Executive") {
      let deptUserIds: any[] = [];
      let managerProfile = null;

      if (userRole === "Department Manager") {
        managerProfile = await EmployeeProfile.findOne({ where: { user: userId } });
      }

      if (managerProfile && managerProfile.department) {
        // Fetch all profiles in this department
        const profilesInDept = await EmployeeProfile.findAll({
          where: { department: managerProfile.department },
          attributes: ["user"]
        });
        deptUserIds = profilesInDept.map((p: any) => p.user).filter(Boolean);
      } else {
        // For Owner/Director/Global Admin without a specific department, show company wide or all active users
        const activeUsers = await User.findAll({
          where: { status: "active" },
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

      // 3. Tasks planned for today in department
      const deptTasksToday = deptSodsToday.reduce((acc: number, curr: any) => {
        return acc + (curr.callsPlanned || 0) + (curr.meetings || 0) + (curr.fieldVisits || 0);
      }, 0);

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

      // 5. Avg Performance (compliance rate: % of team members who submitted SOD today)
      const performanceAvg = teamMembersCount > 0 
        ? Math.round((deptSodCount / teamMembersCount) * 100) 
        : 100;

      deptStats = {
        teamMembers: teamMembersCount,
        tasksToday: deptTasksToday,
        sod: deptSodCount,
        eod: deptEodCount,
        performanceAvg: Math.min(100, performanceAvg),
        pendingApprovals: pendingApprovalsCount
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

    return NextResponse.json({
      success: true,
      stats: {
        currentUserStats: {
          presentDays: presentDaysCount,
          totalWorkingDays: workingDaysInMonth,
          attendancePercent: workingDaysInMonth > 0 ? Math.round((presentDaysCount / workingDaysInMonth) * 100) : 100,
          casualLeave,
          sickLeave,
          earnedLeave,
          casualLeaveTaken,
          sickLeaveTaken,
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
          hrLeadsCount: selectedCandidates,
          rejectedCount: rejectedCandidatesCount,
        },
        deptStats
      },
      userMenuAccess
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
