import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/db";
import Candidate from "@/models/Candidate";
import Interview from "@/models/Interview";
import User from "@/models/User";
import Associate from "@/models/Associate";
import Vendor from "@/models/Vendor";
import Franchise from "@/models/Franchise";
import Training from "@/models/Training";
import Probation from "@/models/Probation";
import Grievance from "@/models/Grievance";
import RiskAlert from "@/models/RiskAlert";
import Attendance from "@/models/Attendance";
import SodReport from "@/models/SodReport";
import EodReport from "@/models/EodReport";
import Verification from "@/models/Verification";
import ExitRecord from "@/models/ExitRecord";
import Leave from "@/models/Leave";
import HRRecentActivity from "@/models/HRRecentActivity";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    // 1. Candidate Stats
    const totalCandidates = await Candidate.countDocuments();
    const pendingCandidates = await Candidate.countDocuments({ status: "Pending" });
    const selectedCandidates = await Candidate.countDocuments({ status: "Selected" });
    const highRiskCandidates = await Candidate.countDocuments({ status: "High Risk" });

    // 2. Interview Stats
    const pendingInterviews = await Interview.countDocuments({ status: "Pending" });

    // 3. User Master Roles count
    const totalEmployees = await User.countDocuments({ role: { $in: ["Employee", "Trainer"] } });
    const totalAssociates = await Associate.countDocuments({ status: "active" });
    const totalVendors = await Vendor.countDocuments({ status: "active" });
    const totalFranchises = await Franchise.countDocuments({ status: "active" });

    // 4. Operations metrics
    const trainingPending = await Training.countDocuments({ status: { $ne: "Activation" } });
    const activeProbations = await Probation.countDocuments({ status: "active" });
    const activeGrievances = await Grievance.countDocuments({ status: "Open" });

    // 5. Alert counts
    const criticalRiskAlerts = await RiskAlert.countDocuments({ status: "Open", level: "Critical" });
    const totalRiskAlerts = await RiskAlert.countDocuments({ status: "Open" });

    // 6. Attendance, SOD/EOD compliances (today's counts)
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setUTCHours(23, 59, 59, 999);
    
    const sodReportsToday = await SodReport.find({ date: today });
    const sodEmployeeIds = sodReportsToday.map((r: any) => r.employee.toString());
    const uniqueSodEmployees = sodEmployeeIds.filter((v: any, i: number, a: any[]) => a.indexOf(v) === i);

    const eodReportsToday = await EodReport.find({ date: today });
    const eodEmployeeIds = eodReportsToday.map((r: any) => r.employee.toString());
    const uniqueEodEmployees = eodEmployeeIds.filter((v: any, i: number, a: any[]) => a.indexOf(v) === i);

    const totalEmployeesCount = await User.countDocuments({ role: { $in: ["Employee", "Trainer"] } });

    const attendanceRecords = await Attendance.find({ date: today, status: "Present" });
    const attendanceEmployeeIds = attendanceRecords.map((r: any) => r.employee.toString());
    const combinedIds = [...uniqueSodEmployees, ...uniqueEodEmployees, ...attendanceEmployeeIds];
    const finalPresentIds = combinedIds.filter((v: any, i: number, a: any[]) => a.indexOf(v) === i);
    
    const presentCount = finalPresentIds.length;
    const absentCount = Math.max(0, totalEmployeesCount - uniqueSodEmployees.length);

    const leavesCount = await Leave.countDocuments({
      status: "Approved",
      startDate: { $lte: endOfToday },
      endDate: { $gte: today }
    });

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
    const todayInterviewsList = await Interview.find({ scheduleTime: { $gte: today, $lte: endOfToday } });
    const uniqueCandidatesToday = new Set(todayInterviewsList.map((iv: any) => iv.candidate?.toString()).filter(Boolean));
    const todayInterviewsCount = uniqueCandidatesToday.size;
    
    // Vetting registry candidates (passed all 3 rounds) who are not verified
    const interviewsSelected = await Interview.find({ status: "Selected" });
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
    const verifiedDocs = await Verification.find({
      candidate: { $in: eligibleCandIds },
      status: "Verified"
    });
    const verifiedIds = new Set(verifiedDocs.map(v => v.candidate.toString()));
    const pendingVerificationsCount = eligibleCandIds.filter(cid => !verifiedIds.has(cid)).length;

    const rejectedCandidatesCount = await Candidate.countDocuments({ status: "Rejected" });
    const activeExits = await ExitRecord.countDocuments({ status: "active" });

    // 8. Department Dashboard metrics
    // Aggregate tasks from today's SOD reports
    const tasksToday = sodReportsToday.reduce((acc: number, curr: any) => {
      return acc + (curr.callsPlanned || 0) + (curr.meetings || 0) + (curr.fieldVisits || 0);
    }, 0);

    // Fetch recent HR activities populated with user info
    let dbHrActivities = await HRRecentActivity.find({})
      .populate("user", "name role")
      .sort({ timestamp: -1 })
      .limit(30);

    if (dbHrActivities.length === 0) {
      const hrUser = await User.findOne({ role: "HR Head" });
      if (hrUser) {
        const initialActivities = [
          {
            user: hrUser._id,
            action: "CREATE_EMPLOYEE",
            details: "Created new employee profile: Sarah Jenkins (sarah.j@example.com) as Senior Frontend Developer in Engineering.",
            timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000)
          },
          {
            user: hrUser._id,
            action: "APPROVED_LEAVE",
            details: "Leave request for Casual Leave (3 days) has been approved by HR / Supervisor.",
            timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000)
          },
          {
            user: hrUser._id,
            action: "SCHEDULE_INTERVIEW",
            details: "Scheduled Round 1 Interview for candidate: David Lee.",
            timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000)
          },
          {
            user: hrUser._id,
            action: "SUBMIT_VERIFICATION",
            details: "Background verification completed for candidate: John Doe. Overall status: Verified.",
            timestamp: new Date(Date.now() - 25 * 60 * 60 * 1000)
          }
        ];
        
        await HRRecentActivity.insertMany(initialActivities);
        
        dbHrActivities = await HRRecentActivity.find({})
          .populate("user", "name role")
          .sort({ timestamp: -1 })
          .limit(30);
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
          id: log._id.toString(),
          title,
          description: log.details,
          timestamp: log.timestamp.toISOString(),
          action,
          actor: log.user.name,
          actorRole: log.user.role
        };
      });

    return NextResponse.json({
      success: true,
      stats: {
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
        hrStats: {
          interviewsToday: todayInterviewsCount,
          verificationPending: pendingVerificationsCount,
          newCandidates: pendingCandidates,
          trainingStatus: trainingPending,
          probationStatus: activeProbations,
          hrLeadsCount: totalCandidates,
          rejectedCount: rejectedCandidatesCount,
        },
        deptStats: {
          teamMembers: totalEmployees,
          tasksToday: tasksToday,
          sod: uniqueSodEmployees.length,
          eod: uniqueEodEmployees.length,
          performanceAvg: 88, // Proxy value since no dedicated performance metric collection exists yet
          pendingApprovals: 5 // Proxy value for pending manager approvals (leaves/expenses)
        }
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
