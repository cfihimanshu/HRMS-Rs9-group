// Removed @ts-nocheck
export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import sequelize from "@/lib/sequelize";
import RiskAlert from "@/models/sequelize/RiskAlert";
import User from "@/models/sequelize/User";
import { logAudit } from "@/lib/audit";
import { Op } from "sequelize";

// GET: Fetch all active risk alerts (HR & Owner only)
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
    const alerts = await RiskAlert.findAll({ 
      where: { status: { [Op.ne]: "inactive" } },
      order: [['createdAt', 'DESC']],
      raw: true
    });

    const userIds = [...new Set(alerts.map((a: any) => a.triggeredBy).filter(Boolean))];
    let userMap: any = {};
    if (userIds.length > 0) {
      const users = await User.findAll({ where: { id: { [Op.in]: userIds } }, raw: true });
      users.forEach((u: any) => { userMap[u.id] = { name: u.name, email: u.email, role: u.role }; });
    }

    const data = alerts.map((a: any) => ({
      ...a,
      triggeredBy: userMap[a.triggeredBy] || null
    }));

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Trigger a new system risk alert (Internal / Screening automation endpoint)
export async function POST(req: Request) {
  try {
    await sequelize.authenticate();
    const body = await req.json();
    const { source, level, description, triggeredBy } = body;

    if (!source || !level || !description) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }

    const alert = await RiskAlert.create({
      id: Date.now().toString(),
      source,
      level,
      description,
      triggeredBy: triggeredBy || null,
      status: "Open",
    });

    return NextResponse.json({ success: true, data: alert });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT: Resolve or change status of a risk alert (HR & Owner only)
export async function PUT(req: Request) {
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

    const body = await req.json();
    const { alertId, status } = body;

    if (!alertId || !status) {
      return NextResponse.json({ success: false, error: "Missing parameters" }, { status: 400 });
    }

    await sequelize.authenticate();

    const alert: any = await RiskAlert.findByPk(alertId);
    if (!alert) {
      return NextResponse.json({ success: false, error: "Risk alert not found" }, { status: 404 });
    }

    alert.status = status;
    await alert.save();

    await logAudit({
      userId: (session.user as any).id,
      action: "RISK_ALERT_RESOLVED",
      entity: "RiskAlert",
      entityId: (alert as any).id ? (alert as any).id.toString() : alert.id,
      details: `System risk alert (source: ${alert.source}, severity: ${alert.level}) marked as ${status}`,
    });

    return NextResponse.json({ success: true, data: alert });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
