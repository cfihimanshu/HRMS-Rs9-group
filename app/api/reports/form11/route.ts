import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/db";
import FranchiseRegistration from "@/models/FranchiseRegistration";
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

    await dbConnect();

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

// GET: Fetch FORM-11 records
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const records = await FranchiseRegistration.find()
      .populate("registeredBy", "name role")
      .sort({ createdAt: -1 })
      .limit(50);

    return NextResponse.json({ success: true, data: records });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
