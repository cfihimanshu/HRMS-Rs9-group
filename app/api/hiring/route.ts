import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/db";
import HiringRequisition from "@/models/HiringRequisition";
import Job from "@/models/Job";
import Company from "@/models/Company";
import Department from "@/models/Department";

// GET: List all requisitions
export async function GET() {
  try {
    await dbConnect();
    const requisitions = await HiringRequisition.find().sort({ createdAt: -1 });
    return NextResponse.json({ success: true, data: requisitions });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Department Manager creates a new hiring requisition
export async function POST(req: Request) {
  try {
    await dbConnect();
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

    const requisition = new HiringRequisition({
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

    await requisition.save();
    return NextResponse.json({ success: true, data: requisition });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT: Accounts / Owner / HR update status
export async function PUT(req: Request) {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { id, status, remarks, sourcingBudget, postingPlatform, postingDuration } = body;

    if (!id || !status) {
      return NextResponse.json({ success: false, error: "Missing requisition ID or status" }, { status: 400 });
    }

    const requisition = await HiringRequisition.findById(id);
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

      // Resolve Company from DB with robust search
      const trimName = requisition.companyName.trim().toLowerCase();
      const allCompanies = await Company.find({ status: "active" });
      const matchedComp = allCompanies.find(c => {
        const dbName = c.name.toLowerCase();
        const dbCode = (c.code || "").toLowerCase();
        
        if (trimName.includes("acolyte") || dbName.includes("acolyte")) {
          return dbName.includes("acolyte") || dbCode.includes("acolyte");
        }
        if (trimName.includes("kare") || dbName.includes("kare")) {
          return dbName.includes("kare") || dbCode.includes("kare");
        }
        if (trimName.includes("flora") || dbName.includes("flora")) {
          return dbName.includes("flora") || dbCode.includes("flora");
        }
        if (trimName.includes("force") || dbName.includes("force") || trimName.includes("009") || dbName.includes("009")) {
          return dbName.includes("force") || dbName.includes("009");
        }
        if (trimName.includes("citiline") || dbName.includes("citiline")) {
          return dbName.includes("citiline") || dbCode.includes("citiline");
        }
        if (trimName === "cfi" || dbName === "cfi" || dbCode === "cfi") {
          return dbName.includes("cfi") || dbCode.includes("cfi");
        }
        return dbName.includes(trimName) || trimName.includes(dbName);
      });

      const comp = matchedComp || allCompanies[0] || { _id: "65edbe12f122822a12121212" };

      // Resolve or create Department from DB
      let dept = await Department.findOne({ name: { $regex: new RegExp(`^${requisition.department.trim()}$`, "i") } });
      if (!dept) {
        dept = await Department.create({
          name: requisition.department.trim(),
          status: "active"
        });
      }

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

      const job = new Job({
        title: requisition.role,
        company: comp._id,
        department: dept._id,
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
      await job.save();

      const origin = req.headers.get("origin") || "http://localhost:3000";
      job.shareableLink = `${origin}/jobs/apply/${job._id}`;
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
