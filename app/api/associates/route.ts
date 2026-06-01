import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/db";
import Associate from "@/models/Associate";
import { logAudit } from "@/lib/audit";

// GET: Retrieve associates list
export async function GET() {
  try {
    await dbConnect();
    const associates = await Associate.find({ status: "active" })
      .populate("user", "name email mobile status")
      .sort({ createdAt: -1 });

    return NextResponse.json({ success: true, data: associates });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Save or update Associate profile
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    const body = await req.json();
    const { userId, territory, leadsGenerated, conversionRate, payoutTerms, riskScore, exitRisk, flags, reportingDiscipline, complaintRatio, clientFeedback } = body;

    if (!userId || !payoutTerms) {
      return NextResponse.json({ success: false, error: "User ID and Payout Terms are required" }, { status: 400 });
    }

    let associate = await Associate.findOne({ user: userId });
    if (!associate) {
      associate = new Associate({ user: userId, payoutTerms });
    }

    if (territory !== undefined) associate.territory = territory;
    if (leadsGenerated !== undefined) associate.leadsGenerated = leadsGenerated;
    if (conversionRate !== undefined) associate.conversionRate = conversionRate;
    if (payoutTerms !== undefined) associate.payoutTerms = payoutTerms;
    if (reportingDiscipline !== undefined) associate.reportingDiscipline = reportingDiscipline;
    if (complaintRatio !== undefined) associate.complaintRatio = complaintRatio;
    if (clientFeedback !== undefined) associate.clientFeedback = clientFeedback;
    if (riskScore !== undefined) associate.riskScore = riskScore;
    if (exitRisk !== undefined) associate.exitRisk = exitRisk;
    if (flags !== undefined) associate.flags = flags;

    await associate.save();

    // Audit log entry
    await logAudit({
      userId: (session.user as any).id,
      action: "UPDATE_ASSOCIATE_PROFILE",
      entity: "Associate",
      entityId: associate._id.toString(),
      details: `Updated Associate profile for user: ${userId}. Risk Score: ${riskScore || 0}%, Exit Risk: ${exitRisk || "Low"}.`,
    });

    return NextResponse.json({ success: true, data: associate });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
