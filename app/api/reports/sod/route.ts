import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/db";
import SodReport from "@/models/SodReport";
import Attendance from "@/models/Attendance";
import { logAudit } from "@/lib/audit";

// GET: Fetch today's SOD for the logged-in user
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

    const record = await SodReport.findOne({ employee: userId, date: today, status: "active" });
    return NextResponse.json({ success: true, data: record });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Create today's SOD declaration
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const userName = session.user.name || "Employee";
    const body = await req.json();
    const { taskSummary, taskType, remarks, selfieUrl, location } = body;

    if (!taskSummary || !taskType || !selfieUrl || !location) {
      return NextResponse.json({ success: false, error: "Missing strict required fields (Task Summary, Type, Selfie, or GPS)" }, { status: 400 });
    }

    await dbConnect();

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    // Prevent duplicates
    const exists = await SodReport.findOne({ employee: userId, date: today });
    if (exists) {
      return NextResponse.json({ success: false, error: "SOD already declared for today" }, { status: 400 });
    }

    const record = new SodReport({
      employee: userId,
      date: today,
      taskSummary,
      taskType,
      remarks: remarks || "",
      selfieUrl,
      location,
    });
    await record.save();

    // Auto-punch attendance check-in (Present) if not already punched today
    const attendanceExists = await Attendance.findOne({ employee: userId, date: today });
    if (!attendanceExists) {
      const attendanceRecord = new Attendance({
        employee: userId,
        date: today,
        status: "Present",
        checkIn: new Date(),
      });
      await attendanceRecord.save();
    }

    await logAudit({
      userId,
      action: "SOD_DECLARED",
      entity: "SodReport",
      entityId: record._id.toString(),
      details: `${userName} declared Start of Day (SOD) targets.`,
    });

    return NextResponse.json({ success: true, data: record });
  } catch (error: any) {
    console.error("Failed to declare SOD:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
