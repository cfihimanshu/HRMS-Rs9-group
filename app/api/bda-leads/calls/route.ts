export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import sequelize from "@/lib/sequelize";
import BdaLead from "@/models/sequelize/BdaLead";
import BdaCallLog from "@/models/sequelize/BdaCallLog";

const isManager = (role = "") => ["owner", "director", "head", "manager", "hr executive"].some(value => role.toLowerCase().includes(value));
const canViewSalesDashboard = (role = "", department = "") => {
  const normalized = role.toLowerCase();
  return normalized.includes("owner") || normalized.includes("director") || normalized.includes("sales manager") || normalized === "dsm" || (normalized.includes("manager") && department.toLowerCase().includes("sales"));
};

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const leadId = Number(new URL(req.url).searchParams.get("leadId"));

    await sequelize.authenticate();
    await BdaCallLog.sync();
    const userId = String((session.user as any).id || "");
    const role = String((session.user as any).role || "");

    if (!leadId) {
      if (!canViewSalesDashboard(role, String((session.user as any).department || ""))) return NextResponse.json({ success: false, error: "Owner or Sales Manager access is required" }, { status: 403 });
      const calls = await BdaCallLog.findAll({ order: [["callDateTime", "DESC"], ["id", "DESC"]], limit: 2000 });
      return NextResponse.json({ success: true, data: calls });
    }

    const lead = await BdaLead.findByPk(leadId);
    if (!lead) return NextResponse.json({ success: false, error: "Lead not found" }, { status: 404 });

    if (!isManager(role) && String(lead.assignedTo || "") !== userId) {
      return NextResponse.json({ success: false, error: "You can only view calls for leads assigned to you" }, { status: 403 });
    }

    const calls = await BdaCallLog.findAll({ where: { leadId }, order: [["callDateTime", "DESC"], ["id", "DESC"]] });
    return NextResponse.json({ success: true, data: calls });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || "Call history could not be loaded" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const leadId = Number(body.leadId);
    if (!leadId || !body.callStatus || !String(body.conversationNotes || "").trim()) {
      return NextResponse.json({ success: false, error: "Lead, call status, and conversation notes are required" }, { status: 400 });
    }

    await sequelize.authenticate();
    await BdaLead.sync();
    await BdaCallLog.sync();
    const lead = await BdaLead.findByPk(leadId);
    if (!lead) return NextResponse.json({ success: false, error: "Lead not found" }, { status: 404 });

    const userId = String((session.user as any).id || "");
    const role = String((session.user as any).role || "");
    if (!isManager(role) && String(lead.assignedTo || "") !== userId) {
      return NextResponse.json({ success: false, error: "You can only log calls for leads assigned to you" }, { status: 403 });
    }

    const call = await BdaCallLog.create({
      leadId,
      leadCode: lead.leadId,
      bdaUserId: userId,
      bdaName: (session.user as any).name || "BDA User",
      callDateTime: body.callDateTime ? new Date(body.callDateTime) : new Date(),
      callType: body.callType || "Outgoing",
      callStatus: body.callStatus,
      durationSeconds: body.durationSeconds === "" || body.durationSeconds == null ? null : Math.max(0, Number(body.durationSeconds) || 0),
      conversationNotes: String(body.conversationNotes).trim(),
      customerInterest: body.customerInterest || null,
      leadStatus: body.leadStatus || lead.status,
      nextCallbackAt: body.nextCallbackAt ? new Date(body.nextCallbackAt) : null,
      forwardedTo: body.forwardedTo || null,
      recordingUrl: body.recordingUrl || null,
      proofUrl: body.proofUrl || null,
    });

    if (body.leadStatus && body.leadStatus !== lead.status) {
      lead.status = body.leadStatus;
      await lead.save();
    }

    return NextResponse.json({ success: true, message: "Call logged successfully", data: call }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || "Call could not be logged" }, { status: 500 });
  }
}
