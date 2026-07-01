import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import sequelize from "@/lib/sequelize";
import SodReport from "@/models/sequelize/SodReport";
import Attendance from "@/models/sequelize/Attendance";
import TaskLog from "@/models/sequelize/TaskLog";
import { logAudit } from "@/lib/audit";

// GET: Fetch today's SOD for the logged-in user
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    await sequelize.authenticate();
    await SodReport.sync({ alter: true });

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const record = await SodReport.findOne({ where: { employee: userId, date: today } });
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

    if (!taskSummary || !taskType || !selfieUrl) {
      return NextResponse.json({ success: false, error: "Missing strict required fields (Task Summary, Type, or Selfie)" }, { status: 400 });
    }

    await sequelize.authenticate();
    await SodReport.sync({ alter: true });

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    // Prevent duplicates
    const exists = await SodReport.findOne({ where: { employee: userId, date: today } });
    if (exists) {
      return NextResponse.json({ success: false, error: "SOD already declared for today" }, { status: 400 });
    }

    const record = await SodReport.create({
      employee: userId,
      date: today,
      taskSummary,
      taskType,
      remarks: remarks || "",
      selfieUrl,
      latitude: location?.latitude || null,
      longitude: location?.longitude || null,
    });

    // Auto-punch attendance check-in (Present) if not already punched today
    const attendanceExists = await Attendance.findOne({ where: { employee: userId, date: today } });
    if (!attendanceExists) {
      await Attendance.create({
        id: Date.now().toString(),
        employee: userId,
        date: today,
        status: "Present",
        checkIn: new Date(),
      });
    }

    // Auto-create task in Kanban from SOD declaration
    await TaskLog.create({
      employee: userId,
      date: new Date(), // exact current timestamp
      taskTitle: taskSummary,
      taskType: taskType,
      description: remarks || "",
      status: "Pending", // Set as Pending so it goes to "My Tasks (Kanban)" Pending column
    });

    await logAudit({
      userId,
      action: "SOD_DECLARED",
      entity: "SodReport",
      entityId: (record as any).id.toString(),
      details: `${userName} declared Start of Day (SOD) targets.`,
    });

    return NextResponse.json({ success: true, data: record });
  } catch (error: any) {
    console.error("Failed to declare SOD:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
