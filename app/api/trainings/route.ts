import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/db";
import Training from "@/models/Training";
import Candidate from "@/models/Candidate";
import User from "@/models/User";
import EmployeeProfile from "@/models/EmployeeProfile";
import Probation from "@/models/Probation";
import Company from "@/models/Company";
import bcrypt from "bcryptjs";
import { logAudit } from "@/lib/audit";
import User from "@/models/User";
import EmployeeProfile from "@/models/EmployeeProfile";
import Probation from "@/models/Probation";
import bcrypt from "bcryptjs";

// GET: Retrieve all active training logs (Restricted to HR, Trainer, Owner)
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const trainerId = searchParams.get("trainerId");

    await dbConnect();
    const query: any = { status: { $ne: "inactive" } };
    if (trainerId) {
      query.trainer = trainerId;
    }

    const trainings = await Training.find(query)
      .populate("candidate", "name email mobile status")
      .populate("trainer", "name role");

    return NextResponse.json({ success: true, data: trainings });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Initialize or update daily assessments (restricted to Trainer, Owner, HR Head)
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const role = (session.user as any).role;
    const permitted = ["Owner", "Director", "HR Head", "HR Executive", "Trainer", "Department Manager"];
    if (!permitted.includes(role)) {
      return NextResponse.json({ success: false, error: "Forbidden: Trainer/HR/Manager role required" }, { status: 403 });
    }

    await dbConnect();
    const body = await req.json();
    const { candidateId, status, assessment, recommendation } = body;

    if (!candidateId) {
      return NextResponse.json({ success: false, error: "Candidate ID is required" }, { status: 400 });
    }

    if (status === "Activation" || status === "Final Status" || recommendation !== undefined) {
      if (role !== "HR Head" && role !== "Owner" && role !== "HR Executive") {
        return NextResponse.json({ success: false, error: "Forbidden: Only HR Head, Owner, or HR Executive can submit final recommendation / decision" }, { status: 403 });
      }
    }

    let training = await Training.findOne({ candidate: candidateId });
    if (!training) {
      training = new Training({
        candidate: candidateId,
        trainer: (session.user as any).id,
        status: status || "Orientation",
        assessments: [],
      });
    }

    if (status) {
      training.status = status;
    }

    if (assessment) {
      const { dayNumber, sopScore, crmScore, reportingScore, behaviourScore, remarks } = assessment;
      if (dayNumber !== undefined && sopScore !== undefined && crmScore !== undefined && reportingScore !== undefined && behaviourScore !== undefined) {
        // Remove prior assessment for the same day if exists
        training.assessments = training.assessments.filter((a: any) => a.dayNumber !== dayNumber);
        training.assessments.push({
          dayNumber,
          sopScore,
          crmScore,
          reportingScore,
          behaviourScore,
          remarks: remarks || "",
          date: new Date(),
        });
      }
    }

    if (recommendation !== undefined) {
      training.recommendation = recommendation;
    }

    await training.save();

    const candidate = await Candidate.findById(candidateId).populate("job");

    // Auto-update candidate status based on final decision
    if (status === "Activation") {
      await Candidate.findByIdAndUpdate(candidateId, { status: "Selected" });
    } else if (recommendation === "Reject") {
      await Candidate.findByIdAndUpdate(candidateId, { status: "Rejected" });
    } else if (recommendation === "Hold") {
      await Candidate.findByIdAndUpdate(candidateId, { status: "Hold" });
    }

    if (status === "Activation") {


      // Auto-create User & Probation track
      const candDoc = await Candidate.findById(candidateId).populate("job");
      if (candDoc) {
        const jobDoc = candDoc.job as any;
        let companyId = jobDoc?.company;
        if (!companyId) {
          const defaultCompany = await Company.findOne();
          companyId = defaultCompany?._id;
        }

        // 1. Ensure User exists
        let userDoc = await User.findOne({ email: candDoc.email });
        if (!userDoc) {
          const hashedPassword = await bcrypt.hash("Welcome@123", 12);
          userDoc = await User.create({
            name: candDoc.name,
            email: candDoc.email,
            password: hashedPassword,
            role: "Associate",
            mobile: candDoc.mobile || null,
            status: "active",
            companies: companyId ? [companyId] : [],
            loginHistory: [],
          });
        }

        // 2. Ensure EmployeeProfile exists
        let profileDoc = await EmployeeProfile.findOne({ user: userDoc._id });
        if (!profileDoc) {
          const getCompanyPrefix = (name: string) => {
            const clean = name.replace(/[^a-zA-Z]/g, "").toUpperCase();
            if (clean.startsWith("STARTUPKARE")) return "STK";
            if (clean.startsWith("STARTUPFLORA")) return "STA";
            if (clean.startsWith("FORCE")) return "FOR";
            return clean.substring(0, 3).padEnd(3, "X");
          };
          let prefix = "EMP";
          if (companyId) {
            const company = await Company.findById(companyId);
            if (company) {
              prefix = getCompanyPrefix(company.name);
            }
          }
          const regex = new RegExp(`^${prefix}-\\d+$`, 'i');
          const profiles = await EmployeeProfile.find({ employeeId: regex });
          let maxNum = 0;
          profiles.forEach(p => {
            const parts = p.employeeId.split("-");
            if (parts.length === 2) {
              const num = parseInt(parts[1], 10);
              if (!isNaN(num) && num > maxNum) {
                maxNum = num;
              }
            }
          });
          const nextId = `${prefix}-${String(maxNum + 1).padStart(3, "0")}`;

          profileDoc = await EmployeeProfile.create({
            user: userDoc._id,
            employeeId: nextId,
            designation: jobDoc?.title || "Associate",
            department: jobDoc?.department || null,
            dateOfJoining: new Date(),
            baseSalary: 0,
            salaryStructure: { basic: 0, hra: 0, conveyance: 0, specialAllowance: 0 },
            leaveBalances: { casualLeave: 12, sickLeave: 12, earnedLeave: 0 }
          });
        }

        // 3. Ensure Probation track exists
        let probationDoc = await Probation.findOne({ employee: userDoc._id });
        if (!probationDoc) {
          const startDate = new Date();
          const endDate = new Date();
          endDate.setMonth(endDate.getMonth() + 6); // 6 months probation
          probationDoc = await Probation.create({
            employee: userDoc._id,
            startDate,
            endDate,
            status: "active",
            attendanceSummary: { totalDays: 30, presentDays: 28 },
            reportsSummary: { sodSubmitted: 22, eodSubmitted: 22 },
            feedback: "Auto-initiated upon successful training completion."
          });
        }
      }
    }


    // Audit log
    await logAudit({
      userId: (session.user as any).id,
      action: "UPDATE_TRAINING_LOG",
      entity: "Training",
      entityId: training._id.toString(),
      details: `Updated training record for candidate: ${candidate?.name || "Unknown"}. Status: ${training.status}. Total Assessments: ${training.assessments.length}.`,
    });

    return NextResponse.json({ success: true, data: training });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
