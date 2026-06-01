import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/db";
import RiskAlert from "@/models/RiskAlert";
import { logAudit } from "@/lib/audit";

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

    await dbConnect();
    const alerts = await RiskAlert.find({ status: { $ne: "inactive" } })
      .populate("triggeredBy", "name email role")
      .sort({ createdAt: -1 });

    return NextResponse.json({ success: true, data: alerts });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Trigger a new system risk alert (Internal / Screening automation endpoint)
export async function POST(req: Request) {
  try {
    await dbConnect();
    const body = await req.json();
    const { source, level, description, triggeredBy } = body;

    if (!source || !level || !description) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }

    const alert = new RiskAlert({
      source,
      level,
      description,
      triggeredBy: triggeredBy || null,
      status: "Open",
    });
    await alert.save();

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

    await dbConnect();

    const alert = await RiskAlert.findById(alertId);
    if (!alert) {
      return NextResponse.json({ success: false, error: "Risk alert not found" }, { status: 404 });
    }

    alert.status = status;
    await alert.save();

    await logAudit({
      userId: (session.user as any).id,
      action: "RISK_ALERT_RESOLVED",
      entity: "RiskAlert",
      entityId: alert._id.toString(),
      details: `System risk alert (source: ${alert.source}, severity: ${alert.level}) marked as ${status}`,
    });

    return NextResponse.json({ success: true, data: alert });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
