import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import sequelize from "@/lib/sequelize";
import Candidate from "@/models/sequelize/Candidate";
import { screenCandidateWithAI } from "@/lib/ai";
import { logAudit } from "@/lib/audit";

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

    await sequelize.authenticate();
    const body = await req.json();
    const { candidateId } = body;

    if (!candidateId) {
      return NextResponse.json({ success: false, error: "Candidate ID is required" }, { status: 400 });
    }

    const candidate = await Candidate.findByPk(candidateId);
    if (!candidate) {
      return NextResponse.json({ success: false, error: "Candidate not found" }, { status: 404 });
    }

    // Call AI helper (Claude or heuristics fallback)
    const screening = await screenCandidateWithAI(candidateId);

    // Save back to Candidate model
    candidate.screeningResult = {
      candidateSummary: screening.candidate_summary,
      skillMatchScore: screening.skill_match_score,
      stabilityScore: screening.stability_score,
      riskScore: screening.risk_score,
      loyaltyPossibility: screening.loyalty_possibility,
      fraudRisk: screening.fraud_risk,
      suggestedQuestions: screening.suggested_questions,
      recommendation: screening.recommendation,
      screenedAt: new Date(),
    };

    // Auto-align candidate status to AI warning recommendation if severe
    if (screening.recommendation === "High Risk") {
      candidate.status = "High Risk";
    }

    await candidate.save();

    // Save in Audit Log
    await logAudit({
      userId: (session.user as any).id,
      action: "AI_SCREEN_CANDIDATE",
      entity: "Candidate",
      entityId: candidateId,
      details: `AI screening executed for candidate: ${candidate.name}. Recommendation: ${screening.recommendation}. Match: ${screening.skill_match_score}%, Risk: ${screening.risk_score}%.`,
    });

    return NextResponse.json({
      success: true,
      data: candidate.screeningResult,
    });
  } catch (error: any) {
    console.error("AI screening API error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "AI screening failed" },
      { status: 500 }
    );
  }
}
