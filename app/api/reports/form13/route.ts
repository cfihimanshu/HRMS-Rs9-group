import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/db";
import ExitForm from "@/models/ExitForm";
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

    await dbConnect();

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

// GET: Fetch FORM-13 records
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const records = await ExitForm.find()
      .populate("submittedBy", "name role")
      .sort({ createdAt: -1 })
      .limit(50);

    return NextResponse.json({ success: true, data: records });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
