export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import sequelize from "@/lib/sequelize";
import BdaLead from "@/models/sequelize/BdaLead";
import TaskLog from "@/models/sequelize/TaskLog";
import User from "@/models/sequelize/User";
import { Op } from "sequelize";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const leadIdParam = searchParams.get("leadId") || searchParams.get("id");

    if (!leadIdParam) {
      return NextResponse.json({ success: false, error: "leadId or id parameter is required" }, { status: 400 });
    }

    await sequelize.authenticate();
    await BdaLead.sync().catch(() => {});
    await TaskLog.sync().catch(() => {});

    // Find the lead
    const whereLead: any = {};
    if (/^\d+$/.test(leadIdParam)) {
      whereLead[Op.or] = [{ id: parseInt(leadIdParam, 10) }, { leadId: leadIdParam }];
    } else {
      whereLead.leadId = leadIdParam;
    }

    const lead = await BdaLead.findOne({ where: whereLead });
    if (!lead) {
      return NextResponse.json({ success: false, error: "Lead not found" }, { status: 404 });
    }

    // Resolve assigner and assigned user names
    let assignedToName = lead.assignedToName || "";
    let assignedByName = "";

    if (lead.assignedTo && !assignedToName) {
      const bdaUser = await User.findOne({ where: { id: lead.assignedTo }, attributes: ["name"] });
      if (bdaUser) assignedToName = bdaUser.name;
    }

    if (lead.assignedBy) {
      const assignerUser = await User.findOne({ where: { id: lead.assignedBy }, attributes: ["name"] });
      if (assignerUser) assignedByName = assignerUser.name;
    }

    // Find corresponding TaskLogs
    const searchConditions: any[] = [];
    if (lead.leadId) searchConditions.push({ description: { [Op.like]: `%${lead.leadId}%` } });
    if (lead.phone && lead.phone.trim()) searchConditions.push({ contactNo: lead.phone.trim() });
    if (lead.name && lead.name.trim()) searchConditions.push({ personName: lead.name.trim() });

    let tasks: any[] = [];
    if (searchConditions.length > 0) {
      tasks = await TaskLog.findAll({
        where: { [Op.or]: searchConditions },
        order: [["updatedAt", "DESC"]],
      });
    }

    // Map tasks and extract employee names & follow-up logs
    const taskLogsWithDetails = await Promise.all(
      tasks.map(async (t) => {
        let empName = "";
        if (t.employee) {
          const empUser = await User.findOne({ where: { id: t.employee }, attributes: ["name"] });
          if (empUser) empName = empUser.name;
        }

        let parsedFollowUps: any[] = [];
        if (t.followUpHistory) {
          try {
            const rawParsed = typeof t.followUpHistory === "string" ? JSON.parse(t.followUpHistory) : t.followUpHistory;
            if (Array.isArray(rawParsed)) {
              parsedFollowUps = rawParsed.map((item: any) => ({
                id: item.id || Math.random().toString(),
                scheduledAt: item.scheduledAt || item.date || item.createdAt,
                createdAt: item.createdAt || item.date,
                userName: item.userName || item.by || item.user || empName || "System",
                notes: item.notes || item.details || item.remarks || ""
              }));
            } else if (typeof rawParsed === "object" && rawParsed !== null) {
              parsedFollowUps = [rawParsed];
            } else if (typeof rawParsed === "string" && rawParsed.trim()) {
              parsedFollowUps = [{ notes: rawParsed.trim(), date: t.updatedAt, userName: empName || "System" }];
            }
          } catch (e) {
            if (typeof t.followUpHistory === "string" && t.followUpHistory.trim()) {
              parsedFollowUps = [{ notes: t.followUpHistory.trim(), date: t.updatedAt, userName: empName || "System" }];
            }
          }
        }

        return {
          id: t.id,
          taskTitle: t.taskTitle || "Sales",
          taskType: t.taskType,
          employeeId: t.employee,
          employeeName: empName || t.employee,
          status: t.status,
          leadStatus: t.leadStatus || t.callStatus || lead.status,
          callStatus: t.callStatus,
          progressNotes: t.progressNotes,
          description: t.description,
          proofAttachment: t.proofAttachment,
          followUpHistory: parsedFollowUps,
          scheduledAt: t.scheduledAt,
          updatedAt: t.updatedAt,
          createdAt: t.createdAt,
        };
      })
    );

    return NextResponse.json({
      success: true,
      lead: {
        id: lead.id,
        leadId: lead.leadId,
        name: lead.name,
        phone: lead.phone,
        email: lead.email,
        companyName: lead.companyName,
        city: lead.city,
        salesReason: lead.salesReason,
        status: lead.status,
        assignedTo: lead.assignedTo,
        assignedToName: assignedToName || "Unassigned",
        assignedBy: lead.assignedBy,
        assignedByName: assignedByName || "System/Admin",
        assignedAt: lead.assignedAt,
        remarks: lead.remarks,
        convertedServicesJson: lead.convertedServicesJson,
        convertedAmount: lead.convertedAmount,
        lostReason: lead.lostReason,
        attachmentsJson: lead.attachmentsJson,
        createdAt: lead.createdAt,
        updatedAt: lead.updatedAt,
      },
      tasks: taskLogsWithDetails,
    });
  } catch (error: any) {
    console.error("GET /api/bda-leads/history Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
