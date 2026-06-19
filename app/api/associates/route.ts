import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import sequelize from "@/lib/sequelize";
import Associate from "@/models/sequelize/Associate";
import { logAudit } from "@/lib/audit";
import User from "@/models/sequelize/User";

// GET: Retrieve associates list
export async function GET() {
  try {
    await sequelize.authenticate();
    const associates = await Associate.findAll({
      where: { status: "active" },
      order: [['createdAt', 'DESC']]
    });

    const userIds = associates.map(a => (a as any).user).filter(Boolean);
    const users = await User.findAll({
      where: { mongo_id: userIds },
      attributes: ['mongo_id', 'name', 'email', 'mobile', 'status']
    });

    const userMap = users.reduce((acc: any, u: any) => {
      acc[u.mongo_id] = u.toJSON();
      return acc;
    }, {});

    const data = associates.map(a => {
      const aJson = a.toJSON() as any;
      aJson.user = userMap[aJson.user] || null;
      return aJson;
    });

    return NextResponse.json({ success: true, data });
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

    await sequelize.authenticate();
    const body = await req.json();
    const { userId, territory, leadsGenerated, conversionRate, payoutTerms, riskScore, exitRisk, flags, reportingDiscipline, complaintRatio, clientFeedback } = body;

    if (!userId || !payoutTerms) {
      return NextResponse.json({ success: false, error: "User ID and Payout Terms are required" }, { status: 400 });
    }

    let associate = await Associate.findOne({ where: { user: userId } });
    if (!associate) {
      associate = await Associate.create({
        mongo_id: Date.now().toString(),
        user: userId,
        payoutTerms,
        status: "active"
      });
    }

    if (territory !== undefined) (associate as any).territory = territory;
    if (leadsGenerated !== undefined) (associate as any).leadsGenerated = leadsGenerated;
    if (conversionRate !== undefined) (associate as any).conversionRate = conversionRate;
    if (payoutTerms !== undefined) (associate as any).payoutTerms = payoutTerms;
    if (reportingDiscipline !== undefined) (associate as any).reportingDiscipline = reportingDiscipline;
    if (complaintRatio !== undefined) (associate as any).complaintRatio = complaintRatio;
    if (clientFeedback !== undefined) (associate as any).clientFeedback = clientFeedback;
    if (riskScore !== undefined) (associate as any).riskScore = riskScore;
    if (exitRisk !== undefined) (associate as any).exitRisk = exitRisk;
    if (flags !== undefined) (associate as any).flags = flags;

    await associate.save();

    // Audit log entry
    await logAudit({
      userId: (session.user as any).id,
      action: "UPDATE_ASSOCIATE_PROFILE",
      entity: "Associate",
      entityId: (associate as any).mongo_id,
      details: `Updated Associate profile for user: ${userId}. Risk Score: ${riskScore || 0}%, Exit Risk: ${exitRisk || "Low"}.`,
    });

    return NextResponse.json({ success: true, data: associate });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
