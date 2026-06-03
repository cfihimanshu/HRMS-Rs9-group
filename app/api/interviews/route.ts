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
      .populate({
        path: "candidate",
        select: "name email mobile screeningResult currentRound job status",
        populate: {
          path: "job",
          select: "title"
        }
      })
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
    const { candidateId, round, scheduleTime, videoLink, interviewerId, mode } = body;

    if (!candidateId || !round || !scheduleTime) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }

    const candidate = await Candidate.findById(candidateId).populate("job");
    if (!candidate) {
      return NextResponse.json({ success: false, error: "Candidate not found" }, { status: 404 });
    }

    const vacancyTitle = candidate.job ? (candidate.job as any).title : "General Application";

    // Validate progression of rounds
    const targetRound = parseInt(round);
    if (targetRound > 1) {
      const prevRound = targetRound - 1;
      const prevSelectedInterview = await Interview.findOne({
        candidate: candidateId,
        round: prevRound,
        status: "Selected",
      });

      if (!prevSelectedInterview) {
        return NextResponse.json({
          success: false,
          error: `Cannot schedule Round-${targetRound} interview. Candidate must be marked as 'Selected' in Round-${prevRound} first.`
        }, { status: 400 });
      }
    }

    const interview = new Interview({
      candidate: candidateId,
      round,
      scheduleTime: new Date(scheduleTime),
      videoLink: mode === "offline" ? "" : videoLink,
      mode: mode || "online",
      vacancyName: vacancyTitle,
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
    const { 
      interviewId, 
      communicationScore, 
      skillScore, 
      behaviourScore, 
      stabilityScore, 
      riskScore, 
      remarks, 
      status,
      scheduleTime,
      videoLink,
      mode,
      round,
      customQuestions
    } = body;

    if (!interviewId) {
      return NextResponse.json({ success: false, error: "Missing interview ID" }, { status: 400 });
    }

    const role = (session.user as any).role;
    const isUpdatingSchedule = scheduleTime !== undefined || mode !== undefined || videoLink !== undefined || round !== undefined;
    if (isUpdatingSchedule && role !== "HR Head" && role !== "Owner") {
      return NextResponse.json({ success: false, error: "Forbidden: HR Head or Owner role required to edit schedule" }, { status: 403 });
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
    if (scheduleTime !== undefined) interview.scheduleTime = new Date(scheduleTime);
    if (videoLink !== undefined) interview.videoLink = videoLink;
    if (mode !== undefined) interview.mode = mode;
    if (round !== undefined) interview.round = round;
    if (customQuestions !== undefined) interview.customQuestions = customQuestions;
    
    interview.remarks = remarks !== undefined ? remarks : interview.remarks;
    if (status !== undefined) interview.status = status;
    await interview.save();

    // Update candidate profile state based on interview output
    const candidate = await Candidate.findById(interview.candidate._id);
    if (status !== undefined && candidate) {
      candidate.status = status;
      if (status === "Selected") {
        if (candidate.currentRound < 3) {
          // Advance to next round
          candidate.currentRound += 1;
        }
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

// DELETE: Delete a scheduled interview (HR Head & Owner only)
export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const role = (session.user as any).role;
    if (role !== "HR Head" && role !== "Owner") {
      return NextResponse.json({ success: false, error: "Forbidden: HR Head or Owner role required" }, { status: 403 });
    }

    await dbConnect();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, error: "Missing interview ID" }, { status: 400 });
    }

    const interview = await Interview.findById(id).populate("candidate");
    if (!interview) {
      return NextResponse.json({ success: false, error: "Interview not found" }, { status: 404 });
    }

    await Interview.findByIdAndDelete(id);

    // Track Audit Log
    await logAudit({
      userId: (session.user as any).id,
      action: "DELETE_INTERVIEW",
      entity: "Interview",
      entityId: id,
      details: `Deleted scheduled interview for candidate: ${(interview.candidate as any)?.name || "Unknown"}.`,
    });

    return NextResponse.json({ success: true, message: "Interview deleted successfully" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
