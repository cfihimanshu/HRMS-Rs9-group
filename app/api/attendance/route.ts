import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import sequelize from "@/lib/sequelize";
import Attendance from "@/models/sequelize/Attendance";
import { logAudit } from "@/lib/audit";

// GET: Fetch today's attendance state for the logged-in user
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    await sequelize.authenticate();

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const record = await Attendance.findOne({ where: { employee: userId, date: today } });
    return NextResponse.json({ success: true, data: record });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Punch-In (Check-In) or Punch-Out (Check-Out)
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const userName = session.user.name || "Employee";
    await sequelize.authenticate();

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    let record = await Attendance.findOne({ where: { employee: userId, date: today } });

    if (record) {
      // Already checked in, trigger check-out
      if (record.checkOut) {
        return NextResponse.json({ success: false, error: "Already checked out for today" }, { status: 400 });
      }
      record.checkOut = new Date();
      await record.save();

      await logAudit({
        userId,
        action: "ATTENDANCE_CHECKOUT",
        entity: "Attendance",
        entityId: record.id,
        details: `${userName} checked out at ${record.checkOut.toLocaleTimeString()}`,
      });
    } else {
      // Create new check-in record
      record = await Attendance.create({
        id: Date.now().toString(),
        employee: userId,
        date: today,
        status: "Present",
        checkIn: new Date(),
      });

      await logAudit({
        userId,
        action: "ATTENDANCE_CHECKIN",
        entity: "Attendance",
        entityId: record.id,
        details: `${userName} checked in at ${record.checkIn.toLocaleTimeString()}`,
      });
    }

    return NextResponse.json({ success: true, data: record });
  } catch (error: any) {
    console.error("Failed to update attendance:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
