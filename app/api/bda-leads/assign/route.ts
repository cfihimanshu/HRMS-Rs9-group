export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import sequelize from "@/lib/sequelize";
import BdaLead from "@/models/sequelize/BdaLead";
import TaskLog from "@/models/sequelize/TaskLog";
import User from "@/models/sequelize/User";
import { Op } from "sequelize";
import { logAudit } from "@/lib/audit";
import { logHRActivity } from "@/lib/hrAudit";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const assignerUserId = (session.user as any).id;
    const body = await req.json();
    const { leadIds, assignedTo } = body;

    if (!Array.isArray(leadIds) || leadIds.length === 0) {
      return NextResponse.json({ success: false, error: "Please select at least one lead to assign" }, { status: 400 });
    }

    if (!assignedTo) {
      return NextResponse.json({ success: false, error: "Target BDA / User is required" }, { status: 400 });
    }

    await sequelize.authenticate();
    await BdaLead.sync().catch(() => {});
    await TaskLog.sync({ alter: true }).catch(() => {});

    // Find assigned BDA user details
    const bdaUser = await User.findOne({ where: { id: assignedTo }, raw: true }) as any;
    if (!bdaUser) {
      return NextResponse.json({ success: false, error: "Target BDA user not found" }, { status: 404 });
    }

    const bdaName = bdaUser.name || "BDA Team Member";
    const now = new Date();

    // 1. Fetch target leads
    const leads = await BdaLead.findAll({
      where: { id: { [Op.in]: leadIds } }
    });

    const nowMs = Date.now();
    let tasksCreatedCount = 0;

    // 2. Update leads and auto-create corresponding TaskLog entry for each lead
    for (let i = 0; i < leads.length; i++) {
      const lead = leads[i];

      lead.assignedTo = assignedTo;
      lead.assignedToName = bdaName;
      lead.assignedBy = assignerUserId;
      lead.assignedAt = now;
      if (!lead.status || lead.status === "New" || lead.status === "unassigned") {
        lead.status = "Assigned";
      }
      await lead.save();

      // Check if a task already exists for this lead assigned to the target BDA
      const searchConditions: any[] = [];
      if (lead.leadId) searchConditions.push({ description: { [Op.like]: `%${lead.leadId}%` } });
      if (lead.phone && lead.phone.trim()) searchConditions.push({ contactNo: lead.phone.trim() });

      let existingTask: any = null;
      if (searchConditions.length > 0) {
        existingTask = await TaskLog.findOne({
          where: {
            employee: assignedTo,
            [Op.or]: searchConditions
          }
        });
      }

      if (existingTask) {
        // Task already exists for this lead assigned to target BDA! Skip creating duplicate task.
        continue;
      }

      // Build structured description for the BDA's Sales task
      const taskDescription = [
        `Call Mode: Outgoing Call`,
        lead.name ? `Person Name: ${lead.name}` : "",
        lead.phone ? `Contact No: ${lead.phone}` : "",
        lead.companyName ? `Company Name: ${lead.companyName}` : "",
        lead.email ? `Email: ${lead.email}` : "",
        lead.city ? `Location: ${lead.city}` : "",
        lead.salesReason ? `Reason: ${lead.salesReason}` : `Reason: Pitching`,
        `Lead Status: ${lead.status || "Assigned"}`,
        `Lead Reference: ${lead.leadId}`,
        lead.remarks ? `Remarks: ${lead.remarks}` : ""
      ].filter(Boolean).join("\n");

      // Generate unique task ID
      const taskId = await TaskLog.generateNextTaskId(assignedTo);

      // Auto-create task assigned to target BDA
      await TaskLog.create({
        id: taskId,
        employee: assignedTo,
        assignedBy: assignerUserId,
        date: now,
        taskTitle: "Sales",
        taskType: "Call",
        description: taskDescription,
        status: "Pending",
        scheduledAt: now,
        timerState: "Stopped",
        timerStart: null,
        elapsedSeconds: 0,
        personName: lead.name || null,
        contactNo: lead.phone || null,
        companyName: lead.companyName || null,
        emailAddress: lead.email || null,
        visitLocation: lead.city || null,
        salesReason: lead.salesReason || "Pitching",
        callStatus: lead.status || "Assigned",
        leadStatus: lead.status || "Assigned",
      });

      // Auto-create LegalRecoverySchedule entry so task appears in Schedule Work Report
      try {
        const LegalRecoverySchedule = (sequelize.models as any).LegalRecoverySchedule || (await import("@/models/sequelize/LegalRecoverySchedule")).default;
        await LegalRecoverySchedule.sync({ alter: true }).catch(() => {});
        const todayStr = now.toISOString().split("T")[0];
        const timeStr = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });

        await LegalRecoverySchedule.create({
          id: "lrs_lead_task_" + taskId + "_" + i + "_" + nowMs,
          employeeId: assignedTo,
          sodId: null,
          date: todayStr,
          time: timeStr,
          workSection: "Sales",
          type: "General",
          subType: "Outgoing Call",
          status: "Pending",
          remarks: taskDescription,
          details: taskDescription,
          personName: lead.name || null,
          contactNo: lead.phone || null,
          companyName: lead.companyName || null,
          emailAddress: lead.email || null,
          visitLocation: lead.city || null,
          salesReason: lead.salesReason || "Pitching",
          callStatus: "Pending",
          taskId: taskId
        });
      } catch (lrsErr) {
        console.error("LRS sync error for BDA lead task:", lrsErr);
      }

      tasksCreatedCount++;
    }

    try {
      await logAudit({
        userId: assignerUserId,
        userName: session.user.name,
        userRole: (session.user as any).role,
        action: "BDA_LEAD_ASSIGNED",
        entity: "BdaLead",
        details: `Assigned ${leads.length} BDA Lead(s) to ${bdaName}`
      });
      await logHRActivity({
        userId: assignerUserId,
        userRole: (session.user as any).role,
        action: "BDA_LEAD_ASSIGNED",
        details: `Assigned ${leads.length} BDA Lead(s) to ${bdaName}`
      });
    } catch (_) {}

    return NextResponse.json({
      success: true,
      message: `Successfully assigned ${leads.length} leads to ${bdaName} and created ${tasksCreatedCount} tasks in My Tasks!`,
      data: {
        assignedCount: leads.length,
        assignedToName: bdaName,
        tasksCreatedCount
      }
    });
  } catch (error: any) {
    console.error("POST /api/bda-leads/assign Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
