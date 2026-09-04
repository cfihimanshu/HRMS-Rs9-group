import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import sequelize from "@/lib/sequelize";
import EodReport from "@/models/sequelize/EodReport";
import SodReport from "@/models/sequelize/SodReport";
import { logAudit } from "@/lib/audit";
import { logHRActivity } from "@/lib/hrAudit";
import { Op } from "sequelize";

async function getLatestSodShift(userId: string) {
  return SodReport.findOne({
    where: { employee: userId },
    order: [["createdAt", "DESC"]]
  }) as Promise<any>;
}

async function getShiftEod(userId: string, sod: any) {
  if (!sod) return null;
  return EodReport.findOne({
    where: {
      employee: userId,
      [Op.or]: [
        { sodReportId: sod.id },
        {
          sodReportId: null,
          createdAt: { [Op.gte]: new Date(new Date(sod.createdAt).getTime() - 10000) }
        }
      ]
    },
    order: [["createdAt", "ASC"]]
  });
}

// GET: Fetch today's EOD or active shift's EOD for the logged-in user
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    await sequelize.authenticate();
    await EodReport.sync();
    await SodReport.sync();

    const lastSod = await getLatestSodShift(userId);
    if (lastSod) {
      const shiftEod = await getShiftEod(userId, lastSod);
      return NextResponse.json({
        success: true,
        data: shiftEod,
        activeSodShift: { id: lastSod.id, createdAt: lastSod.createdAt, date: lastSod.date }
      });
    }

    // Default standard same-day calendar policy for non-security users
    const now = new Date();
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const dayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const record = await EodReport.findOne({
      where: {
        employee: userId,
        [Op.or]: [
          { date: { [Op.gte]: dayStart, [Op.lte]: dayEnd } },
          { createdAt: { [Op.gte]: dayStart, [Op.lte]: dayEnd } }
        ]
      },
      order: [["createdAt", "DESC"]]
    });
    return NextResponse.json({ success: true, data: record });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Create EOD submission
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

    if (!completedWork || !pendingWork || !tomorrowPlan || !selfieUrl) {
      return NextResponse.json({ success: false, error: "Missing strict required fields (Completed Tasks, Tomorrow Plan, or Selfie)" }, { status: 400 });
    }

    if (!location || !location.latitude || !location.longitude) {
       return NextResponse.json({ success: false, error: "Strict Rule: Device's live GPS location is mandatory to declare EOD. Fake or static locations are not allowed." }, { status: 400 });
    }

    await sequelize.authenticate();
    await EodReport.sync();
    await SodReport.sync();

    const now = new Date();
    const lastSod = await getLatestSodShift(userId);
    let targetDate = now;

    if (lastSod) {
      const shiftEod = await getShiftEod(userId, lastSod);
      if (shiftEod) {
        return NextResponse.json({ success: false, error: "EOD has already been submitted for this SOD shift." }, { status: 400 });
      }
      targetDate = new Date(lastSod.date || lastSod.createdAt);
    } else {
      const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      const dayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

      const exists = await EodReport.findOne({
        where: {
          employee: userId,
          [Op.or]: [
            { date: { [Op.gte]: dayStart, [Op.lte]: dayEnd } },
            { createdAt: { [Op.gte]: dayStart, [Op.lte]: dayEnd } }
          ]
        },
        order: [["createdAt", "DESC"]]
      });
      if (exists) {
        return NextResponse.json({ success: false, error: "EOD already submitted for today" }, { status: 400 });
      }
    }

    const record = await EodReport.create({
      employee: userId,
      sodReportId: lastSod?.id || null,
      date: targetDate,
      completedWork,
      pendingWork,
      issues: issues || "",
      escalationNeeded: !!escalationNeeded,
      tomorrowPlan,
      selfieUrl,
      latitude: location?.latitude || null,
      longitude: location?.longitude || null,
    });

    await logAudit({
      userId,
      action: "EOD_SUBMITTED",
      entity: "EodReport",
      entityId: (record as any).id.toString(),
      details: `${userName} submitted End of Day (EOD) outcomes.${lastSod ? ` [SOD Shift #${lastSod.id}]` : ""}`,
    });

    await logHRActivity({
      userId,
      userRole: (session.user as any).role || "Employee",
      action: "EOD_DECLARED",
      details: `${userName} submitted End of Day (EOD) report. Completed: ${completedWork}.`,
    });

    return NextResponse.json({ success: true, data: record });
  } catch (error: any) {
    console.error("Failed to submit EOD:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
