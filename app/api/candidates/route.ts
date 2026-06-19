// Removed @ts-nocheck
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import sequelize from "@/lib/sequelize";
import Candidate from "@/models/sequelize/Candidate";
import Job from "@/models/sequelize/Job";
import { logAudit } from "@/lib/audit";
import { Op } from "sequelize";

// POST: Candidate submits their application form (Public Endpoint)
export async function POST(req: Request) {
  try {
    await sequelize.authenticate();
    const body = await req.json();

    const {
      jobId,
      name,
      mobile,
      email,
      address,
      qualification,
      experience,
      currentSalary,
      expectedSalary,
      noticePeriod,
      riskAnswers,
      uploads,
    } = body;

    if (
      !name ||
      !mobile ||
      !email ||
      !address ||
      !qualification ||
      !experience ||
      !currentSalary ||
      !expectedSalary ||
      !noticePeriod ||
      !riskAnswers
    ) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }

    // Verify job if provided
    let jobExists: any = null;
    if (jobId) {
      jobExists = await Job.findByPk(jobId);
      if (!jobExists) {
        return NextResponse.json({ success: false, error: "Job posting not found" }, { status: 400 });
      }
    }

    // 3-month Reapply Limitation Check
    if (jobExists && jobExists.company) {
      const companyJobs = await Job.findAll({ where: { company: jobExists.company }, attributes: ["mongo_id"] });
      const companyJobIds = companyJobs.map((j: any) => j.mongo_id);

      const existingCandidates = await Candidate.findAll({ where: {
        [Op.or]: [
          { email: email.trim() },
          { mobile: mobile.trim() }
        ],
        job: { [Op.in]: companyJobIds },
        status: { [Op.ne]: "inactive" }
      } });

      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

      const recentApp = existingCandidates.find((c: any) => {
        return new Date(c.createdAt) >= threeMonthsAgo;
      });

      if (recentApp) {
        const nextAllowedDate = new Date(recentApp.createdAt);
        nextAllowedDate.setMonth(nextAllowedDate.getMonth() + 3);
        const formattedDate = nextAllowedDate.toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric"
        });
        return NextResponse.json({
          success: false,
          error: `You have already applied to this company within the last 3 months. You can re-apply after ${formattedDate}.`
        }, { status: 400 });
      }
    }

    // Create Candidate record
    const candidate = await Candidate.create({
      mongo_id: Date.now().toString(),
      job: jobId || null,
      name,
      mobile,
      email,
      address,
      qualification,
      experience,
      currentSalary,
      expectedSalary,
      noticePeriod,
      riskAnswers,
      uploads: uploads || {},
      status: "Pending",
      currentRound: 1,
    });

    // Log Audit Entry (Public Action, user reference is null)
    await logAudit({
      userId: null,
      action: "SUBMIT_CANDIDATE",
      entity: "Candidate",
      entityId: candidate.mongo_id.toString(),
      details: `Candidate application submitted: ${name} (${email}) for Job: ${
        jobExists ? jobExists.title : "General Inquiry"
      }.`,
    });

    // Module 4: Auto response message text
    const autoReplyMessage = `Thank you ${name}. To proceed with the Acolyte Group Recruitment Process, please fill out this form. The HR Team will contact you once the form is submitted.`;
    
    // In production, you would call an SMS/WhatsApp gateway API (Twilio/WhatsApp Cloud API) here
    console.log(`[SMS/WhatsApp AUTO REPLY] Sent to ${mobile}: "${autoReplyMessage}"`);

    return NextResponse.json({
      success: true,
      data: candidate,
      autoResponseSent: true,
      message: autoReplyMessage,
    });
  } catch (error: any) {
    console.error("Failed to submit candidate:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to submit application" },
      { status: 500 }
    );
  }
}

// GET: List candidate applications (HR & Owner only)
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const role = (session.user as any).role;
    const permitted = ["Owner", "Director", "HR Head", "HR Executive", "Department Manager"];
    if (!permitted.includes(role)) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    await sequelize.authenticate();
    const candidates = await Candidate.findAll({ where: { status: { [Op.ne]: "inactive" } } });

    return NextResponse.json({ success: true, data: candidates });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
