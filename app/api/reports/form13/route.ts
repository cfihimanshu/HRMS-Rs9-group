import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import sequelize from "@/lib/sequelize";
import ExitForm from "@/models/sequelize/ExitForm";
import { logAudit } from "@/lib/audit";

// POST: Submit FORM-13 Exit Form
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const submittedBy = (session.user as any).id;
    const body = await req.json();

    const {
      name,
      category,
      exitReason,
      assetReturn,
      accessRevoke,
      handover,
      finalSettlement,
      exitFeedback,
      postExitRisk,
    } = body;

    if (!name || !category || !exitReason) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }

    await sequelize.authenticate();

    const record = await ExitForm.create({
      submittedBy,
      name,
      category,
      exitReason,
      assetReturn: assetReturn || false,
      accessRevoke: accessRevoke || false,
      handover: handover || false,
      finalSettlement: finalSettlement || false,
      exitFeedback: exitFeedback || "",
      postExitRisk: postExitRisk || "Low",
    });

    await logAudit({
      userId: submittedBy,
      action: "SUBMIT_FORM_13",
      entity: "ExitForm",
      details: `Submitted exit form for ${name} (${category}) — Reason: ${exitReason}`,
      ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
    });

    return NextResponse.json({ success: true, data: record }, { status: 201 });
  } catch (error: any) {
    console.error("FORM-13 Submission Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

import User from "@/models/sequelize/User";

// GET: Fetch FORM-13 records
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    await sequelize.authenticate();

    const records = await ExitForm.findAll({
      order: [['createdAt', 'DESC']],
      limit: 50
    });

    const userIds = records.map(r => (r as any).submittedBy).filter(Boolean);
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
      rJson.submittedBy = userMap[rJson.submittedBy] || null;
      return rJson;
    });

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
