// Removed @ts-nocheck
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import sequelize from "@/lib/sequelize";
import HiringRequisition from "@/models/sequelize/HiringRequisition";
import Job from "@/models/sequelize/Job";
import Company from "@/models/sequelize/Company";
import Department from "@/models/sequelize/Department";

// GET: List all requisitions
export async function GET() {
  try {
    await sequelize.authenticate();
    const requisitions = await HiringRequisition.findAll({ order: [['createdAt', 'DESC']] });
    return NextResponse.json({ success: true, data: requisitions });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Department Manager creates a new hiring requisition
export async function POST(req: Request) {
  try {
    await sequelize.authenticate();
    const session = await getServerSession(authOptions);
    const creatorName = (session?.user as any)?.name || "Department Manager";

    const body = await req.json();
    const {
      companyName,
      department,
      role,
      category,
      location,
      qty,
      gender,
      experience,
      budget,
      skills,
      jd,
      kra,
      kpi,
      qualification,
      monitoringBenefits,
      companyGrowthBenefits,
      dateOfRequirement,
      riskLevel,
      expectedOutput,
    } = body;

    if (
      !companyName || !department || !role || !location || !category || !qty ||
      !jd || !kra || !kpi || !qualification ||
      !riskLevel || !expectedOutput || !budget
    ) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }

    const requisition = await HiringRequisition.create({
      mongo_id: Date.now().toString(),
      companyName,
      department,
      role,
      location,
      category,
      qty: Number(qty),
      gender: gender || "Any",
      experience: { min: Number(experience?.min || 0), max: Number(experience?.max || 0) },
      budget: { min: Number(budget?.min || 0), max: Number(budget?.max || 0) },
      skills,
      qualification,
      jd,
      kra,
      kpi,
      monitoringBenefits,
      companyGrowthBenefits,
      dateOfRequirement: dateOfRequirement ? new Date(dateOfRequirement) : new Date(),
      riskLevel,
      expectedOutput,
      status: "Pending HR Sourcing Review",   // Step 1 → goes to HR Sourcing first
      createdBy: creatorName,
    });

    return NextResponse.json({ success: true, data: requisition });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT: Accounts / Owner / HR update status
export async function PUT(req: Request) {
  try {
    await sequelize.authenticate();
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { id, status, remarks, sourcingBudget, postingPlatform, postingDuration } = body;

    if (!id || !status) {
      return NextResponse.json({ success: false, error: "Missing requisition ID or status" }, { status: 400 });
    }

    const requisition: any = await HiringRequisition.findByPk(id);
    if (!requisition) {
      return NextResponse.json({ success: false, error: "Requisition not found" }, { status: 404 });
    }

    // ─── Stage 1 → 2: HR Sourcing reviews and forwards to Accounts ─────
    if (status === "Pending Accounts Review") {
      requisition.status = "Pending Accounts Review";
      requisition.hrSourcingRemarks = remarks || "Forwarded to Accounts.";
      if (sourcingBudget !== undefined) {
        requisition.sourcingBudget = Number(sourcingBudget);
      }
      if (postingPlatform !== undefined) {
        requisition.postingPlatform = postingPlatform;
      }
      if (postingDuration !== undefined) {
        requisition.postingDuration = Number(postingDuration);
      }

    // ─── Stage 2 → 3: Accounts recommends → forwards to Owner ──────────
    } else if (status === "Pending Owner Approval") {
      requisition.status = "Pending Owner Approval";
      requisition.accountsRemarks = remarks || "Budget reviewed and cleared by Accounts. Forwarded to Owner.";

    // ─── Stage 3 → 4: Owner approves → HR can now post the job ─────────
    } else if (status === "Approved — Pending HR Post") {
      requisition.status = "Approved — Pending HR Post";
      requisition.ownerRemarks = remarks || "Approved by Owner. HR to post job vacancy.";

    // ─── Stage 4: HR posts job → creates Job document ───────────────────
    } else if (status === "Job Posted") {
      requisition.status = "Job Posted";
      requisition.ownerRemarks = requisition.ownerRemarks || "Approved by Owner.";

      // Resolve Company and Department from DB
      const comp: any =
        (await Company.findOne({ where: { name: requisition.companyName } })) ||
        (await Company.findOne()) ||
        { mongo_id: "65edbe12f122822a12121212" };
      const dept: any =
        (await Department.findOne({ where: { name: requisition.department } })) ||
        (await Department.findOne()) ||
        { mongo_id: "65edbe12f122822a12121213" };

      const expMin = requisition.experience?.min || 0;
      const expMax = requisition.experience?.max || 0;
      const expString = (expMin === 0 && expMax === 0)
        ? "Fresher"
        : expMin === expMax
          ? `${expMin} Years`
          : `${expMin}-${expMax} Years`;

      const budgetMin = requisition.budget?.min || 0;
      const budgetMax = requisition.budget?.max || 0;
      const salaryString = (budgetMin === 0 && budgetMax === 0)
        ? "As per industry standards"
        : budgetMin === budgetMax
          ? `₹${budgetMin.toLocaleString("en-IN")} P.A.`
          : `₹${budgetMin.toLocaleString("en-IN")} - ₹${budgetMax.toLocaleString("en-IN")} P.A.`;

      const job = await Job.create({
        mongo_id: Date.now().toString(),
        title: requisition.role,
        company: comp.mongo_id,
        department: dept.mongo_id,
        location: requisition.location || "Delhi Corporate Office",
        category: requisition.category,
        qualification: requisition.qualification || "Graduate",
        experience: expString,
        salaryRange: salaryString,
        description: `Role: ${requisition.role}\nDepartment: ${requisition.department}\nJob Category: ${requisition.category}\nJD: ${requisition.jd}\nKRA: ${requisition.kra}\nKPI: ${requisition.kpi}\nQualification: ${requisition.qualification}`,
        status: "active",
        source: requisition.postingPlatform || "Indeed",
        postingDuration: requisition.postingDuration,
      });

      const origin = req.headers.get("origin") || "http://localhost:3000";
      job.shareableLink = `${origin}/jobs/apply/${job.getDataValue('mongo_id')}`;
      await job.save();

    // ─── Rejection at any stage ──────────────────────────────────────────
    } else if (status === "Rejected") {
      requisition.status = "Rejected";
      const userRole = (session.user as any).role;
      if (userRole === "HR") {
        requisition.hrSourcingRemarks = remarks || "Rejected by HR during sourcing review.";
      } else if (userRole === "Accounts") {
        requisition.accountsRemarks = remarks || "Rejected by Accounts — budget not available.";
      } else if (userRole === "Owner" || userRole === "Director") {
        requisition.ownerRemarks = remarks || "Rejected by Owner.";
      } else {
        requisition.ownerRemarks = remarks || "Rejected.";
      }

    // ─── Hold at any stage ───────────────────────────────────────────────
    } else if (status === "Hold") {
      requisition.status = "Hold";
      const userRole = (session.user as any).role;
      if (userRole === "HR") {
        requisition.hrSourcingRemarks = remarks || "Put on hold by HR.";
      } else if (userRole === "Accounts") {
        requisition.accountsRemarks = remarks || "Put on hold by Accounts.";
      } else {
        requisition.ownerRemarks = remarks || "Put on hold by Owner.";
      }
    }

    await requisition.save();
    return NextResponse.json({ success: true, data: requisition });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
