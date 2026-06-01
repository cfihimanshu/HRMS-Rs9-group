import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/db";
import EodReport from "@/models/EodReport";
import { logAudit } from "@/lib/audit";

// GET: Fetch today's EOD for the logged-in user
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    await dbConnect();

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const record = await EodReport.findOne({ employee: userId, date: today, status: "active" });
    return NextResponse.json({ success: true, data: record });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Create today's EOD submission
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const userName = session.user.name || "Employee";
    const body = await req.json();
    const { completedWork, pendingWork, issues, escalationNeeded, tomorrowPlan, selfieUrl, location } = body;

    if (!completedWork || !pendingWork || !tomorrowPlan || !selfieUrl || !location) {
      return NextResponse.json({ success: false, error: "Missing strict required fields (Completed Tasks, Tomorrow Plan, Selfie, or GPS)" }, { status: 400 });
    }

    await dbConnect();

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    // Prevent duplicates
    const exists = await EodReport.findOne({ employee: userId, date: today });
    if (exists) {
      return NextResponse.json({ success: false, error: "EOD already submitted for today" }, { status: 400 });
    }

    const record = new EodReport({
      employee: userId,
      date: today,
      completedWork,
      pendingWork,
      issues: issues || "",
      escalationNeeded: !!escalationNeeded,
      tomorrowPlan,
      selfieUrl,
      location,
    });
    await record.save();

    await logAudit({
      userId,
      action: "EOD_SUBMITTED",
      entity: "EodReport",
      entityId: record._id.toString(),
      details: `${userName} submitted End of Day (EOD) outcomes.`,
    });

    return NextResponse.json({ success: true, data: record });
  } catch (error: any) {
    console.error("Failed to submit EOD:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
