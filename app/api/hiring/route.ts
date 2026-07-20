// Removed @ts-nocheck
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import sequelize from "@/lib/sequelize";
import HiringRequisition from "@/models/sequelize/HiringRequisition";
import Job from "@/models/sequelize/Job";
import Company from "@/models/sequelize/Company";
import Department from "@/models/sequelize/Department";
import User from "@/models/sequelize/User";
import { sendRequestNotification } from "@/lib/notificationHelper";
import { sendEmail } from "@/lib/email";

function getRequisitionStatusEmailHtml(params: {
  applicantName: string;
  role: string;
  department: string;
  status: string;
  isApproved: boolean;
  remarks: string;
}) {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
  body{font-family:'Segoe UI',system-ui,sans-serif;background:#f1f5f9;margin:0;padding:0;color:#1e293b}
  .wrap{max-width:580px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 4px 20px rgba(0,0,0,.06)}
  .header-approved{background:linear-gradient(135deg,#7c3aed 0%,#4f46e5 100%);padding:28px 24px;color:#fff;text-align:center}
  .header-rejected{background:linear-gradient(135deg,#ef4444 0%,#dc2626 100%);padding:28px 24px;color:#fff;text-align:center}
  .header h1{margin:0;font-size:20px;font-weight:700}
  .body{padding:28px 24px}
  .field-table{width:100%;border-collapse:collapse;margin:16px 0}
  .field-table td{padding:10px 12px;border-bottom:1px solid #f1f5f9;font-size:13px}
  .field-table td.label{font-weight:700;color:#64748b;width:130px}
  .remarks-box{background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px;margin:16px 0;font-size:13px;color:#475569;line-height:1.6}
  .footer{background:#f8fafc;padding:16px 24px;text-align:center;font-size:11px;color:#94a3b8;border-top:1px solid #e2e8f0}
</style>
</head>
<body>
<div class="wrap">
  <div class="header ${params.isApproved ? 'header-approved' : 'header-rejected'}">
    <h1>${params.isApproved ? '🎉 Requisition Approved' : '❌ Requisition Status Update'}</h1>
  </div>
  <div class="body">
    <p>Hello <strong>${params.applicantName}</strong>,</p>
    <p>Your hiring requisition status has been updated:</p>
    <table class="field-table">
      <tr><td class="label">Role / Position</td><td><strong>${params.role}</strong></td></tr>
      <tr><td class="label">Department</td><td>${params.department}</td></tr>
      <tr><td class="label">Status</td><td>
        <span style="background:${params.isApproved ? '#e0e7ff;color:#4338ca' : '#fee2e2;color:#991b1b'};padding:2px 8px;border-radius:999px;font-size:11px;font-weight:700">${params.status}</span>
      </td></tr>
    </table>
    <div style="font-size:12px;font-weight:700;color:#64748b;margin-top:16px">Remarks:</div>
    <div class="remarks-box">"${params.remarks}"</div>
    <p style="text-align:center;margin-top:24px">
      <a href="https://hrms.cfi247.com/" style="background:#4f46e5;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:13px;display:inline-block">Open Portal →</a>
    </p>
  </div>
  <div class="footer">RS9 Group HRMS • This is an automated notification</div>
</div>
</body></html>`;
}

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
    await HiringRequisition.sync({ alter: true });
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
      id: Date.now().toString(),
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

    const applicantId = (session?.user as any)?.id || "";
    try {
      await sendRequestNotification({
        applicantId,
        requestType: "Hiring Requisition",
        action: "created",
        details: `${creatorName} has created a new hiring requisition for ${qty} x ${role} in ${department} department (Status: Pending HR Sourcing Review).`,
        fallbackDepartment: department,
      });
    } catch (notifErr) {
      console.error("Error creating hiring notification:", notifErr);
    }

    return NextResponse.json({ success: true, data: requisition });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT: Accounts / Owner / HR update status
export async function PUT(req: Request) {
  try {
    await sequelize.authenticate();
    await HiringRequisition.sync({ alter: true });
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

        // Auto-ensure the LeadPlatform is registered and its table exists!
        try {
          const LeadPlatform = (await import("@/models/sequelize/LeadPlatform")).default;
          const cleanName = postingPlatform.trim();
          const exists = await LeadPlatform.findOne({
            where: { name: cleanName }
          });

          if (!exists && cleanName) {
            const prefix = cleanName.slice(0, 3).toUpperCase();
            const id = cleanName.toLowerCase().replace(/[^a-z0-9]+/g, "-") + "-" + Math.floor(100 + Math.random() * 900);
            const tableName = `leads_${id.replace(/-/g, "_")}`;

            await LeadPlatform.create({
              id,
              name: cleanName,
              prefix,
              tableName
            });

            // Create the physical table dynamically in MySQL with standard schema
            await sequelize.query(`
              CREATE TABLE IF NOT EXISTS ${tableName} (
                id VARCHAR(50) PRIMARY KEY,
                name VARCHAR(255) NULL,
                email VARCHAR(255) NULL,
                phone VARCHAR(50) NULL,
                company VARCHAR(255) NULL,
                status VARCHAR(50) DEFAULT 'New',
                notes TEXT NULL,
                createdAt DATETIME NOT NULL,
                updatedAt DATETIME NOT NULL,
                platform_id VARCHAR(255) NULL,
                department_id VARCHAR(255) NULL,
                role_id VARCHAR(255) NULL,
                call_history TEXT NULL
              ) ENGINE=InnoDB;
            `);
            console.log(`[AUTO PLATFORM REGISTER] Successfully registered platform '${cleanName}' with table '${tableName}'`);
          }
        } catch (platformErr) {
          console.error("[AUTO PLATFORM REGISTER ERROR] Failed to auto-register platform:", platformErr);
        }
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
        { id: "65edbe12f122822a12121212" };
      const dept: any =
        (await Department.findOne({ where: { name: requisition.department } })) ||
        (await Department.findOne()) ||
        { id: "65edbe12f122822a12121213" };

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
        id: Date.now().toString(),
        title: requisition.role,
        company: comp.id,
        department: dept.id,
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
      job.shareableLink = `${origin}/jobs/apply/${job.getDataValue('id')}`;
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

    // Trigger notification
    try {
      let applicantId = "";
      if (requisition.createdBy) {
        const creatorUser = await User.findOne({ where: { name: requisition.createdBy } });
        if (creatorUser) {
          applicantId = creatorUser.id;
        }
      }

      let actionVal: "approved" | "rejected" | "dispatched" | "hold" | "sourcing_reviewed" | "accounts_reviewed" = "approved";
      if (status === "Pending Accounts Review") {
        actionVal = "sourcing_reviewed";
      } else if (status === "Pending Owner Approval") {
        actionVal = "accounts_reviewed";
      } else if (status === "Approved — Pending HR Post") {
        actionVal = "approved";
      } else if (status === "Job Posted") {
        actionVal = "dispatched";
      } else if (status === "Rejected") {
        actionVal = "rejected";
      } else if (status === "Hold") {
        actionVal = "hold";
      }

      await sendRequestNotification({
        applicantId,
        requestType: "Hiring Requisition",
        action: actionVal,
        details: `Hiring requisition for ${requisition.role} status is now: ${requisition.status}. Remarks: ${remarks || "None"}.`,
        fallbackDepartment: requisition.department,
      });
      // Send email to creator on status updates
      if (requisition.createdBy) {
        const creatorUser = await User.findOne({ where: { name: requisition.createdBy } });
        if (creatorUser && creatorUser.email) {
          const isApproved = status === "Approved — Pending HR Post" || status === "Job Posted";
          const isRejected = status === "Rejected";
          const isHold = status === "Hold";

          if (isApproved || isRejected || isHold) {
            const emailHtml = getRequisitionStatusEmailHtml({
              applicantName: creatorUser.name || "Employee",
              role: requisition.role,
              department: requisition.department,
              status: requisition.status,
              isApproved,
              remarks: remarks || "None",
            });
            await sendEmail({
              to: creatorUser.email,
              subject: `📋 Hiring Requisition Update: ${requisition.role} – ${requisition.status}`,
              html: emailHtml,
            });
          }
        }
      }
    } catch (notifErr) {
      console.error("Error creating hiring status update notification/email:", notifErr);
    }

    return NextResponse.json({ success: true, data: requisition });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
