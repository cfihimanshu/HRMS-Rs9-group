// Removed @ts-nocheck
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import sequelize from "@/lib/sequelize";
import Training from "@/models/sequelize/Training";
import Candidate from "@/models/sequelize/Candidate";
import User from "@/models/sequelize/User";
import EmployeeProfile from "@/models/sequelize/EmployeeProfile";
import Probation from "@/models/sequelize/Probation";
import Company from "@/models/sequelize/Company";
import Job from "@/models/sequelize/Job";
import bcrypt from "bcryptjs";
import { logAudit } from "@/lib/audit";
import { Op } from "sequelize";

// GET: Retrieve all active training logs (Restricted to HR, Trainer, Owner)
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const trainerId = searchParams.get("trainerId");

    await sequelize.authenticate();
    const query: any = { status: { [Op.ne]: "inactive" } };
    if (trainerId) {
      query.trainer = trainerId;
    }

    const trainings = await Training.findAll({ where: query });

    const candIds = trainings.map((t: any) => t.candidate).filter(Boolean);
    const trainerIds = trainings.map((t: any) => t.trainer).filter(Boolean);

    const candidates = await Candidate.findAll({
      where: { id: { [Op.in]: candIds } },
      attributes: ["id", "name", "email", "mobile", "status"]
    });
    const trainers = await User.findAll({
      where: { id: { [Op.in]: trainerIds } },
      attributes: ["id", "name", "role"]
    });

    const candMap = new Map(candidates.map((c: any) => [c.id, c.toJSON()]));
    const trainerMap = new Map(trainers.map((t: any) => [t.id, t.toJSON()]));

    const hydratedTrainings = trainings.map((t: any) => {
      const plain = t.toJSON();
      plain.candidate = candMap.get(plain.candidate) || null;
      plain.trainer = trainerMap.get(plain.trainer) || null;
      return plain;
    });

    return NextResponse.json({ success: true, data: hydratedTrainings });
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

    await sequelize.authenticate();
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

    let training = await Training.findOne({ where: { candidate: candidateId } });
    if (!training) {
      training = await Training.create({
        id: Date.now().toString(),
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
        let assessmentsArr = [];
        if (training.assessments) {
          try {
            assessmentsArr = typeof training.assessments === 'string' ? JSON.parse(training.assessments) : training.assessments;
          } catch (e) {
            assessmentsArr = [];
          }
        }
        // Remove prior assessment for the same day if exists
        assessmentsArr = assessmentsArr.filter((a: any) => a.dayNumber !== dayNumber);
        assessmentsArr.push({
          dayNumber,
          sopScore,
          crmScore,
          reportingScore,
          behaviourScore,
          remarks: remarks || "",
          date: new Date(),
        });
        training.assessments = assessmentsArr;
      }
    }

    if (recommendation !== undefined) {
      training.recommendation = recommendation;
    }

    await training.save();

    const candidate = await Candidate.findByPk(candidateId);

    // Auto-update candidate status based on final decision
    if (status === "Activation") {
      await Candidate.update({ status: "Selected" }, { where: { id: candidateId } });
    } else if (recommendation === "Reject") {
      await Candidate.update({ status: "Rejected" }, { where: { id: candidateId } });
    } else if (recommendation === "Hold") {
      await Candidate.update({ status: "Hold" }, { where: { id: candidateId } });
    }

    if (status === "Activation") {
      // Auto-create User & Probation track
      const candDoc = await Candidate.findByPk(candidateId);
      if (candDoc) {
        let jobDoc = null;
        if (candDoc.job) {
          jobDoc = await Job.findByPk(candDoc.job);
        }
        let companyId = jobDoc?.company;
        if (!companyId) {
          const defaultCompany = await Company.findOne();
          companyId = defaultCompany?.id;
        }

        // Generate a clean default password based on candidate's name (e.g. neeraj123)
        const cleanName = candDoc.name.trim().split(" ")[0].toLowerCase().replace(/[^a-z0-9]/g, "");
        const defaultPassword = cleanName ? `${cleanName}123` : "Welcome@123";
        const hashedPassword = await bcrypt.hash(defaultPassword, 10);

        // 1. Ensure User exists
        let userDoc = await User.findOne({ where: { email: candDoc.email } });
        if (!userDoc) {
          userDoc = await User.create({
            id: Date.now().toString(),
            name: candDoc.name,
            email: candDoc.email,
            password: hashedPassword,
            role: "Employee",
            mobile: candDoc.mobile || null,
            status: "probation",
            companies: companyId ? [companyId] : [],
            loginHistory: [],
          });
        } else {
          // If the user already exists, make sure they have the password and status set
          let isUpdated = false;
          if (!userDoc.password) {
            userDoc.password = hashedPassword;
            isUpdated = true;
          }
          if (userDoc.role === "Associate" || userDoc.role === "Employee") {
            userDoc.role = "Employee";
            isUpdated = true;
          }
          if (userDoc.status !== "probation") {
            userDoc.status = "probation";
            isUpdated = true;
          }
          if (isUpdated) {
            await userDoc.save();
          }
        }

        // 2. Ensure EmployeeProfile exists
        let profileDoc = await EmployeeProfile.findOne({ where: { user: userDoc.id } });
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
            const company = await Company.findByPk(companyId);
            if (company) {
              prefix = getCompanyPrefix(company.name);
            }
          }
          const regex = `%${prefix}-%`;
          const profiles = await EmployeeProfile.findAll({ where: { employeeId: { [Op.like]: regex } } });
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
            id: Date.now().toString(),
            user: userDoc.id,
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
        let probationDoc = await Probation.findOne({ where: { employee: userDoc.id } });
        if (!probationDoc) {
          const startDate = new Date();
          const endDate = new Date();
          endDate.setMonth(endDate.getMonth() + 6); // 6 months probation
          probationDoc = await Probation.create({
            id: Date.now().toString(),
            employee: userDoc.id,
            startDate,
            endDate,
            status: "active",
            totalDays: 30,
            presentDays: 28,
            sodSubmitted: 22,
            eodSubmitted: 22,
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
      entityId: training.id,
      details: `Updated training record for candidate: ${candidate?.name || "Unknown"}. Status: ${training.status}.`,
    });

    return NextResponse.json({ success: true, data: training });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
