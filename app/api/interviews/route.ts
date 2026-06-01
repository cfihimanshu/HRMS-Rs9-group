import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/db";
import Interview from "@/models/Interview";
import Candidate from "@/models/Candidate";
import { logAudit } from "@/lib/audit";

// GET: Fetch interviews (restricted to HR, Managers, Owners)
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const candidateId = searchParams.get("candidateId");

    await dbConnect();
    const query: any = { status: { $ne: "inactive" } };
    if (candidateId) {
      query.candidate = candidateId;
    }

    const interviews = await Interview.find(query)
      .populate("candidate", "name email mobile screeningResult currentRound")
      .populate("interviewer", "name role")
      .sort({ scheduleTime: 1 });

    return NextResponse.json({ success: true, data: interviews });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Schedule an Interview (HR & Management only)
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const role = (session.user as any).role;
    const permitted = ["Owner", "Director", "HR Head", "HR Executive"];
    if (!permitted.includes(role)) {
      return NextResponse.json({ success: false, error: "Forbidden: HR role required" }, { status: 403 });
    }

    await dbConnect();
    const body = await req.json();
    const { candidateId, round, scheduleTime, videoLink, interviewerId } = body;

    if (!candidateId || !round || !scheduleTime) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }

    const candidate = await Candidate.findById(candidateId);
    if (!candidate) {
      return NextResponse.json({ success: false, error: "Candidate not found" }, { status: 404 });
    }

    const interview = new Interview({
      candidate: candidateId,
      round,
      scheduleTime: new Date(scheduleTime),
      videoLink,
      interviewer: interviewerId || (session.user as any).id,
      status: "Pending",
    });

    await interview.save();

    // Track Audit Log
    await logAudit({
      userId: (session.user as any).id,
      action: "SCHEDULE_INTERVIEW",
      entity: "Interview",
      entityId: interview._id.toString(),
      details: `Scheduled Round ${round} Interview for candidate: ${candidate.name}. Time: ${scheduleTime}.`,
    });

    return NextResponse.json({ success: true, data: interview });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT: Update Score / Remarks / Select or Reject Candidate (Interviewer, HR & Management)
export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    const body = await req.json();
    const { interviewId, communicationScore, skillScore, behaviourScore, stabilityScore, riskScore, remarks, status } = body;

    if (!interviewId || !status) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }

    const interview = await Interview.findById(interviewId).populate("candidate");
    if (!interview) {
      return NextResponse.json({ success: false, error: "Interview not found" }, { status: 404 });
    }

    if (communicationScore !== undefined) interview.communicationScore = communicationScore;
    if (skillScore !== undefined) interview.skillScore = skillScore;
    if (behaviourScore !== undefined) interview.behaviourScore = behaviourScore;
    if (stabilityScore !== undefined) interview.stabilityScore = stabilityScore;
    if (riskScore !== undefined) interview.riskScore = riskScore;
    
    interview.remarks = remarks !== undefined ? remarks : interview.remarks;
    interview.status = status;
    await interview.save();

    // Update candidate profile state based on interview output
    const candidate = await Candidate.findById(interview.candidate._id);
    if (candidate) {
      if (status === "Selected") {
        if (candidate.currentRound < 3) {
          // Advance to next round
          candidate.currentRound += 1;
        } else {
          // Completed all 3 rounds successfully! Mark as Selected
          candidate.status = "Selected";
        }
      } else if (status === "Rejected") {
        candidate.status = "Rejected";
      } else if (status === "Hold") {
        candidate.status = "Hold";
      } else if (status === "High Risk") {
        candidate.status = "High Risk";
      }
      await candidate.save();
    }

    // Write Audit Entry
    await logAudit({
      userId: (session.user as any).id,
      action: "UPDATE_INTERVIEW_ROUND",
      entity: "Interview",
      entityId: interviewId,
      details: `Round ${interview.round} outcome updated for candidate: ${candidate?.name || "Unknown"}. Outcome: ${status}. Remarks: ${remarks || "None"}`,
    });

    return NextResponse.json({ success: true, data: interview });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
