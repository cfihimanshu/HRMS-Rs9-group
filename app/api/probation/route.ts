// Removed @ts-nocheck
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import sequelize from "@/lib/sequelize";
import Probation from "@/models/sequelize/Probation";
import User from "@/models/sequelize/User";
import { logAudit } from "@/lib/audit";
import { Op, DataTypes } from "sequelize";

let probationSchemaChecked = false;
async function ensureProbationColumns() {
  if (probationSchemaChecked) return;
  try {
    const qi = sequelize.getQueryInterface();
    const tableDesc = await qi.describeTable("probations").catch(() => null);
    if (tableDesc) {
      if (!tableDesc.monthlyEvaluations) {
        await qi.addColumn("probations", "monthlyEvaluations", {
          type: DataTypes.JSON,
          allowNull: true
        }).catch(() => {});
      }
      if (!tableDesc.kpis) {
        await qi.addColumn("probations", "kpis", {
          type: DataTypes.JSON,
          allowNull: true
        }).catch(() => {});
      }
      probationSchemaChecked = true;
    }
  } catch (err: any) {
    console.warn("[Probation schema check]", err?.message);
  }
}

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
      return NextResponse.json({ success: true, data: [] });
    }

    await sequelize.authenticate();
    await ensureProbationColumns();
    const records = await Probation.findAll({ 
      where: { status: { [Op.ne]: "inactive" } },
      order: [['createdAt', 'DESC']],
      raw: true
    });

    const empIds = [...new Set(records.map((r: any) => r.employee).filter(Boolean))];
    let empMap: any = {};
    if (empIds.length > 0) {
      const emps = await User.findAll({ where: { id: { [Op.in]: empIds } }, raw: true });
      emps.forEach((e: any) => { empMap[e.id] = { id: e.id, name: e.name, email: e.email, role: e.role, mobile: e.mobile }; });
    }

    const data = records.map((r: any) => {
      let monthlyEvaluations = r.monthlyEvaluations;
      if (typeof monthlyEvaluations === "string") {
        try { monthlyEvaluations = JSON.parse(monthlyEvaluations); } catch (_) { monthlyEvaluations = {}; }
      }
      let kpis = r.kpis;
      if (typeof kpis === "string") {
        try { kpis = JSON.parse(kpis); } catch (_) { kpis = []; }
      }

      return {
        ...r,
        monthlyEvaluations: monthlyEvaluations || {},
        kpis: kpis || [],
        employee: empMap[r.employee] || { id: r.employee, name: 'Unknown' }
      };
    });

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
    await ensureProbationColumns();

    // Case A: Evaluate an existing probationer record (Monthly or Final)
    if (body.probationId) {
      const { probationId, monthIndex, status, kpis, feedback } = body;
      if (!kpis) {
        return NextResponse.json({ success: false, error: "Missing evaluation inputs" }, { status: 400 });
      }

      const record: any = await Probation.findByPk(probationId);
      if (!record) {
        return NextResponse.json({ success: false, error: "Probation not found" }, { status: 404 });
      }

      let existingMonthly = record.monthlyEvaluations;
      if (typeof existingMonthly === "string") {
        try { existingMonthly = JSON.parse(existingMonthly); } catch (_) { existingMonthly = {}; }
      }
      if (!existingMonthly || typeof existingMonthly !== "object") {
        existingMonthly = {};
      }

      // Calculate month score
      const validScores = Array.isArray(kpis) ? kpis.map((k: any) => Number(k.score) || 0) : [0];
      const monthScore = Math.round(validScores.reduce((a: number, b: number) => a + b, 0) / validScores.length);

      const mIdx = Number(monthIndex) || 1;
      existingMonthly[mIdx] = {
        monthIndex: mIdx,
        score: monthScore,
        kpis,
        feedback: feedback || "",
        evaluatedAt: new Date().toISOString(),
        evaluator: (session.user as any).name || (session.user as any).email || "Manager"
      };

      record.monthlyEvaluations = existingMonthly;
      record.kpis = kpis;
      record.feedback = feedback || "";
      record.score = monthScore;

      // Update status if provided
      if (status) {
        record.status = status;
      }

      await record.save();

      // Synchronize to User status if status was changed
      if (status === "Confirm") {
        await User.update({ status: "active" }, { where: { id: record.employee } });
      } else if (status === "Exit") {
        await User.update({ status: "deactivated" }, { where: { id: record.employee } });
      } else if (status === "Extend" || status === "Restrict role") {
        await User.update({ status: "probation" }, { where: { id: record.employee } });
      }

      await logAudit({
        userId: (session.user as any).id,
        action: "PROBATION_EVALUATED",
        entity: "Probation",
        entityId: (record as any).id ? (record as any).id.toString() : record.id,
        details: `Manager evaluated Month ${mIdx} probation. Score: ${monthScore}%, Verdict: ${status || record.status}`,
      });

      const responseObj = record.toJSON ? record.toJSON() : record;
      responseObj.monthlyEvaluations = existingMonthly;

      return NextResponse.json({ success: true, data: responseObj });
    }

    // Case B: Create new probationer
    const { employeeId, startDate, endDate } = body;
    if (!employeeId || !startDate || !endDate) {
      return NextResponse.json({ success: false, error: "Missing required parameters" }, { status: 400 });
    }

    const newRecord = await Probation.create({
      id: Date.now().toString(),
      employee: employeeId,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      status: "active",
      attendanceSummary: { totalDays: 30, presentDays: 28 }, // Mock default values
      reportsSummary: { sodSubmitted: 22, eodSubmitted: 22 },
    });

    // Synchronize to User status
    await User.update({ status: "probation" }, { where: { id: employeeId } });

    return NextResponse.json({ success: true, data: newRecord });
  } catch (error: any) {
    console.error("Probation action failed:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
