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
    today.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);
    
    const presentToday = await Attendance.countDocuments({ date: today, status: "Present" });
    const sodToday = await SodReport.countDocuments({ date: today });
    const eodToday = await EodReport.countDocuments({ date: today });

    // 7. HR Dashboard specific metrics
    const todayInterviews = await Interview.countDocuments({ date: { $gte: today, $lte: endOfToday } });
    const pendingVerifications = await Verification.countDocuments({ status: "Pending" });
    const activeExits = await ExitRecord.countDocuments({ status: "active" });

    // 8. Department Dashboard metrics
    // Aggregate tasks from today's SOD reports
    const sodReportsToday = await SodReport.find({ date: today });
    const tasksToday = sodReportsToday.reduce((acc: number, curr: any) => {
      return acc + (curr.callsPlanned || 0) + (curr.meetings || 0) + (curr.fieldVisits || 0);
    }, 0);

    return NextResponse.json({
      success: true,
      stats: {
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
          attendance: presentToday,
          sod: sodToday,
          eod: eodToday,
        },
        hrStats: {
          interviewsToday: todayInterviews,
          verificationPending: pendingVerifications,
          newCandidates: pendingCandidates,
          trainingStatus: trainingPending,
          probationStatus: activeProbations,
          grievanceStatus: activeGrievances,
          exitCases: activeExits,
        },
        deptStats: {
          teamMembers: totalEmployees,
          tasksToday: tasksToday,
          sod: sodToday,
          eod: eodToday,
          performanceAvg: 88, // Proxy value since no dedicated performance metric collection exists yet
          pendingApprovals: 5 // Proxy value for pending manager approvals (leaves/expenses)
        }
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
