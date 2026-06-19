// Removed @ts-nocheck
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import sequelize from "@/lib/sequelize";
import Probation from "@/models/sequelize/Probation";
import User from "@/models/sequelize/User";
import { logAudit } from "@/lib/audit";
import { Op } from "sequelize";

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

    await sequelize.authenticate();
    const records = await Probation.findAll({ 
      where: { status: { [Op.ne]: "inactive" } },
      order: [['createdAt', 'DESC']],
      raw: true
    });

    const empIds = [...new Set(records.map((r: any) => r.employee).filter(Boolean))];
    let empMap: any = {};
    if (empIds.length > 0) {
      const emps = await User.findAll({ where: { mongo_id: { [Op.in]: empIds } }, raw: true });
      emps.forEach((e: any) => { empMap[e.mongo_id] = { _id: e.mongo_id, name: e.name, email: e.email, role: e.role, mobile: e.mobile }; });
    }

    const data = records.map((r: any) => ({
      ...r,
      employee: empMap[r.employee] || { _id: r.employee, name: 'Unknown' }
    }));

    return NextResponse.json({ success: true, data });
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
    await sequelize.authenticate();

    // Case A: Evaluate an existing probationer record
    if (body.probationId) {
      const { probationId, status, kpis, feedback } = body;
      if (!status || !kpis) {
        return NextResponse.json({ success: false, error: "Missing evaluation inputs" }, { status: 400 });
      }

      const record: any = await Probation.findByPk(probationId);
      if (!record) {
        return NextResponse.json({ success: false, error: "Probation not found" }, { status: 404 });
      }

      record.status = status;
      record.kpis = kpis;
      record.feedback = feedback || "";
      await record.save();

      await logAudit({
        userId: (session.user as any).id,
        action: "PROBATION_EVALUATED",
        entity: "Probation",
        entityId: (record as any).mongo_id ? (record as any).mongo_id.toString() : record.id,
        details: `Manager evaluated probation. Verdict: ${status}`,
      });

      return NextResponse.json({ success: true, data: record });
    }

    // Case B: Create new probationer
    const { employeeId, startDate, endDate } = body;
    if (!employeeId || !startDate || !endDate) {
      return NextResponse.json({ success: false, error: "Missing required parameters" }, { status: 400 });
    }

    const newRecord = await Probation.create({
      mongo_id: Date.now().toString(),
      employee: employeeId,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      status: "active",
      attendanceSummary: { totalDays: 30, presentDays: 28 }, // Mock default values
      reportsSummary: { sodSubmitted: 22, eodSubmitted: 22 },
    });

    return NextResponse.json({ success: true, data: newRecord });
  } catch (error: any) {
    console.error("Probation action failed:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
