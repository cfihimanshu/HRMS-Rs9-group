import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import sequelize from "@/lib/sequelize";
import EodReport from "@/models/sequelize/EodReport";
import SodReport from "@/models/sequelize/SodReport";
import EmployeeProfile from "@/models/sequelize/EmployeeProfile";
import { logAudit } from "@/lib/audit";
import { logHRActivity } from "@/lib/hrAudit";
import { Op } from "sequelize";

async function checkIsSecurityUser(userId: string, sessionUser: any) {
  try {
    const userRole = (sessionUser?.role || "").toLowerCase();
    const sessionVert = (sessionUser?.vertical || "").toLowerCase();
    const sessionDept = (sessionUser?.department || "").toLowerCase();

    if (userRole.includes("security") || sessionVert.includes("security") || sessionDept.includes("security")) {
      return true;
    }

    const empProfile = await EmployeeProfile.findOne({
      where: { user: userId },
      attributes: ["vertical", "department"],
      raw: true
    }) as any;

    const profileVert = (empProfile?.vertical || "").toLowerCase();
    const profileDept = (empProfile?.department || "").toLowerCase();

    return profileVert.includes("security") || profileDept.includes("security");
  } catch (err) {
    return false;
  }
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

    const isSecurity = await checkIsSecurityUser(userId, session.user);

    // 🛡️ ONLY for Security Vertical Users: Unlimited Shift Allowance (24h or 24h+ after SOD)
    if (isSecurity) {
      // Find the user's latest SOD
      const lastSod = await SodReport.findOne({
        where: { employee: userId },
        order: [["createdAt", "DESC"]]
      }) as any;

      if (lastSod) {
        const sodCreatedAt = new Date(lastSod.createdAt);
        // Check if an EOD was already submitted after this specific SOD started
        const shiftEod = await EodReport.findOne({
          where: {
            employee: userId,
            createdAt: { [Op.gte]: new Date(sodCreatedAt.getTime() - 10000) }
          },
          order: [["createdAt", "DESC"]]
        });

        // If shiftEod is null, user has an OPEN SOD shift and CAN submit EOD anytime (even > 24 hours later)!
        if (!shiftEod) {
          return NextResponse.json({
            success: true,
            data: null,
            isSecurityUser: true,
            activeSodShift: { id: lastSod.id, createdAt: lastSod.createdAt, date: lastSod.date }
          });
        }

        // If shift is closed, return the shiftEod
        return NextResponse.json({
          success: true,
          data: shiftEod,
          isSecurityUser: true,
          activeSodShift: { id: lastSod.id, createdAt: lastSod.createdAt, date: lastSod.date }
        });
      }
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
    return NextResponse.json({ success: true, data: record, isSecurityUser: isSecurity });
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
    const isSecurity = await checkIsSecurityUser(userId, session.user);
    let targetDate = now;

    if (isSecurity) {
      // 🛡️ ONLY for Security Vertical Users: Find latest SOD without time restrictions
      const lastSod = await SodReport.findOne({
        where: { employee: userId },
        order: [["createdAt", "DESC"]]
      }) as any;

      if (lastSod) {
        const sodCreatedAt = new Date(lastSod.createdAt);
        // Check if an EOD was already submitted AFTER this specific SOD started
        const shiftEod = await EodReport.findOne({
          where: {
            employee: userId,
            createdAt: { [Op.gte]: new Date(sodCreatedAt.getTime() - 10000) }
          },
          order: [["createdAt", "DESC"]]
        });

        if (shiftEod) {
          return NextResponse.json({ success: false, error: "EOD has already been submitted for this shift/SOD." }, { status: 400 });
        }

        // Pin the EOD date to the SOD's shift date so Work Report pairs SOD and EOD on the exact same date row!
        if (lastSod.date) {
          targetDate = new Date(lastSod.date);
        } else {
          targetDate = new Date(lastSod.createdAt);
        }
      }
    } else {
      // Standard calendar day duplicate prevention for non-security users
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
      date: targetDate, // Security users: pinned to SOD shift date; Non-Security users: today's date
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
      details: `${userName} submitted End of Day (EOD) outcomes.${isSecurity ? " [Security Vertical Shift Policy]" : ""}`,
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
