import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/db";
import AssociatePerformance from "@/models/AssociatePerformance";
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

    await dbConnect();

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

// GET: Fetch FORM-9 records
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const records = await AssociatePerformance.find()
      .populate("evaluator", "name role")
      .sort({ createdAt: -1 })
      .limit(50); // Get recent 50 for dashboard

    return NextResponse.json({ success: true, data: records });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
