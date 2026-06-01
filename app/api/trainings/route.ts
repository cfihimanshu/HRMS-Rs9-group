import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/db";
import Training from "@/models/Training";
import Candidate from "@/models/Candidate";
import { logAudit } from "@/lib/audit";

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
    const permitted = ["Owner", "Director", "HR Head", "Trainer"];
    if (!permitted.includes(role)) {
      return NextResponse.json({ success: false, error: "Forbidden: Trainer/HR role required" }, { status: 403 });
    }

    await dbConnect();
    const body = await req.json();
    const { candidateId, status, assessment, recommendation } = body;

    if (!candidateId) {
      return NextResponse.json({ success: false, error: "Candidate ID is required" }, { status: 400 });
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

    // Auto-update candidate status if marked for activation
    if (status === "Activation") {
      await Candidate.findByIdAndUpdate(candidateId, { status: "Selected" });
    }

    const candidate = await Candidate.findById(candidateId);

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
