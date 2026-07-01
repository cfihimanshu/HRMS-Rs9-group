import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import sequelize from "@/lib/sequelize";
import FranchiseRegistration from "@/models/sequelize/FranchiseRegistration";
import { logAudit } from "@/lib/audit";

// POST: Submit FORM-11 Franchise / Territory Form
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const registeredBy = (session.user as any).id;
    const body = await req.json();

    const {
      partnerName,
      territory,
      brandProject,
      agreementUrl,
      revenueShare,
      reportingPerson,
      riskLevel,
      status,
    } = body;

    if (!partnerName || !territory || !brandProject || !agreementUrl) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }

    await sequelize.authenticate();

    const record = await FranchiseRegistration.create({
      registeredBy,
      partnerName,
      territory,
      brandProject,
      agreementUrl,
      revenueShare: revenueShare || "Standard",
      reportingPerson: reportingPerson || "Manager",
      riskLevel: riskLevel || "Low",
      status: status || "Pending",
    });

    await logAudit({
      userId: registeredBy,
      action: "SUBMIT_FORM_11",
      entity: "FranchiseRegistration",
      details: `Submitted franchise registration for ${partnerName} in ${territory}`,
      ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
    });

    return NextResponse.json({ success: true, data: record }, { status: 201 });
  } catch (error: any) {
    console.error("FORM-11 Submission Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

import User from "@/models/sequelize/User";

// GET: Fetch FORM-11 records
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    await sequelize.authenticate();

    const records = await FranchiseRegistration.findAll({
      order: [['createdAt', 'DESC']],
      limit: 50
    });

    const userIds = records.map(r => (r as any).registeredBy).filter(Boolean);
    const users = await User.findAll({
      where: { id: userIds },
      attributes: ['id', 'name', 'role']
    });

    const userMap = users.reduce((acc: any, u: any) => {
      acc[u.id] = u.toJSON();
      return acc;
    }, {});

    const data = records.map(r => {
      const rJson = r.toJSON() as any;
      rJson.registeredBy = userMap[rJson.registeredBy] || null;
      return rJson;
    });

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
