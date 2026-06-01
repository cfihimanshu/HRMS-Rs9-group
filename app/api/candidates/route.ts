import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/db";
import Candidate from "@/models/Candidate";
import Job from "@/models/Job";
import { logAudit } from "@/lib/audit";

// POST: Candidate submits their application form (Public Endpoint)
export async function POST(req: Request) {
  try {
    await dbConnect();
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
    let jobExists = null;
    if (jobId) {
      jobExists = await Job.findById(jobId);
    }

    // Create Candidate record
    const candidate = new Candidate({
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

    await candidate.save();

    // Log Audit Entry (Public Action, user reference is null)
    await logAudit({
      userId: null,
      action: "SUBMIT_CANDIDATE",
      entity: "Candidate",
      entityId: candidate._id.toString(),
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

    await dbConnect();
    const candidates = await Candidate.find({ status: { $ne: "inactive" } })
      .populate({
        path: "job",
        populate: { path: "company department", select: "name" },
      })
      .sort({ createdAt: -1 });

    return NextResponse.json({ success: true, data: candidates });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
