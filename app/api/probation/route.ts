import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/db";
import Probation from "@/models/Probation";
import User from "@/models/User";
import { logAudit } from "@/lib/audit";

// GET: List all active probationers (HR & Owner only)
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const role = (session.user as any).role;
    const permitted = ["Owner", "Director", "IT Admin", "HR Head", "HR Executive"];
    if (!permitted.includes(role)) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    await dbConnect();
    const records = await Probation.find({ status: { $ne: "inactive" } })
      .populate("employee", "name email role mobile")
      .sort({ createdAt: -1 });

    return NextResponse.json({ success: true, data: records });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Submit a manager's performance evaluation or create new probationer
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const role = (session.user as any).role;
    const permitted = ["Owner", "Director", "IT Admin", "HR Head", "HR Executive", "Department Manager"];
    if (!permitted.includes(role)) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    await dbConnect();

    // Case A: Evaluate an existing probationer record
    if (body.probationId) {
      const { probationId, status, kpis, feedback } = body;
      if (!status || !kpis) {
        return NextResponse.json({ success: false, error: "Missing evaluation inputs" }, { status: 400 });
      }

      const record = await Probation.findById(probationId).populate("employee", "name");
      if (!record) {
        return NextResponse.json({ success: false, error: "Probation record not found" }, { status: 404 });
      }

      record.status = status;
      record.kpis = kpis;
      record.feedback = feedback || "";
      await record.save();

      await logAudit({
        userId: (session.user as any).id,
        action: "PROBATION_EVALUATED",
        entity: "Probation",
        entityId: record._id.toString(),
        details: `Manager evaluated probation for ${(record.employee as any).name}. Verdict: ${status}`,
      });

      return NextResponse.json({ success: true, data: record });
    }

    // Case B: Create new probationer
    const { employeeId, startDate, endDate } = body;
    if (!employeeId || !startDate || !endDate) {
      return NextResponse.json({ success: false, error: "Missing required parameters" }, { status: 400 });
    }

    const newRecord = new Probation({
      employee: employeeId,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      status: "active",
      attendanceSummary: { totalDays: 30, presentDays: 28 }, // Mock default values
      reportsSummary: { sodSubmitted: 22, eodSubmitted: 22 },
    });
    await newRecord.save();

    return NextResponse.json({ success: true, data: newRecord });
  } catch (error: any) {
    console.error("Probation action failed:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
