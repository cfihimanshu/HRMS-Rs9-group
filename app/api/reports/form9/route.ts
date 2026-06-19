import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import sequelize from "@/lib/sequelize";
import AssociatePerformance from "@/models/sequelize/AssociatePerformance";
import { logAudit } from "@/lib/audit";

// POST: Submit FORM-9 Associate Performance
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const evaluatorId = (session.user as any).id;
    const body = await req.json();

    const {
      associateName,
      associateId,
      territory,
      leads,
      conversion,
      collectionPayout,
      complaint,
      reporting,
      riskFlag,
    } = body;

    if (!associateName || !territory) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }

    await sequelize.authenticate();

    const record = await AssociatePerformance.create({
      evaluator: evaluatorId,
      associateName,
      associateId,
      territory,
      leads: Number(leads) || 0,
      conversion: Number(conversion) || 0,
      collectionPayout,
      complaint: Number(complaint) || 0,
      reporting: Number(reporting) || 0,
      riskFlag,
    });

    await logAudit({
      userId: evaluatorId,
      action: "SUBMIT_FORM_9",
      entity: "AssociatePerformance",
      details: `Submitted performance review for ${associateName}`,
      ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
    });

    return NextResponse.json({ success: true, data: record }, { status: 201 });
  } catch (error: any) {
    console.error("FORM-9 Submission Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

import User from "@/models/sequelize/User";

// GET: Fetch FORM-9 records
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    await sequelize.authenticate();

    const records = await AssociatePerformance.findAll({
      order: [['createdAt', 'DESC']],
      limit: 50
    });

    const userIds = records.map(r => (r as any).evaluator).filter(Boolean);
    const users = await User.findAll({
      where: { mongo_id: userIds },
      attributes: ['mongo_id', 'name', 'role']
    });

    const userMap = users.reduce((acc: any, u: any) => {
      acc[u.mongo_id] = u.toJSON();
      return acc;
    }, {});

    const data = records.map(r => {
      const rJson = r.toJSON() as any;
      rJson.evaluator = userMap[rJson.evaluator] || null;
      return rJson;
    });

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
