import BdaCallLog from "@/models/sequelize/BdaCallLog";
import BdaLead from "@/models/sequelize/BdaLead";
import TaskLog from "@/models/sequelize/TaskLog";
import User from "@/models/sequelize/User";
import { Op } from "sequelize";
import { UniqueConstraintError } from "sequelize";

const field = (text: string, labels: string[]) => {
  for (const label of labels) {
    const match = text.match(new RegExp(`${label}\\s*:\\s*([^|\\n\\r]+)`, "i"));
    if (match?.[1]) return match[1].trim();
  }
  return "";
};

const isSalesCall = (task: any) => {
  const title = String(task.taskTitle || "").trim();
  return /call/i.test(String(task.taskType || "")) && (/^sales$/i.test(title) || /^\[sales\]/i.test(title));
};

export async function syncSalesTask(task: any) {
  if (!isSalesCall(task)) return null;
  await Promise.all([BdaLead.sync(), BdaCallLog.sync()]);

  const description = String(task.description || "");
  const taskId = String(task.id);
  const leadCode = `TASK-${taskId}`;
  const employeeId = String(task.forwardedTo || task.employee || "");
  const employee: any = employeeId ? await User.findByPk(employeeId, { raw: true }) : null;
  const personName = task.personName || field(description, ["Person Name", "Contact Person", "Client Name"]);
  const companyName = task.companyName || field(description, ["Company Name", "Company"]);
  const phone = task.contactNo || field(description, ["Contact No", "Phone", "Mobile"]);
  const email = task.emailAddress || field(description, ["Email"]);
  const city = task.visitLocation || field(description, ["Location", "City"]);
  const reason = task.salesReason || field(description, ["Reason", "Purpose"]);
  const callStatus = task.callStatus || field(description, ["Status", "Call Status"]) || "Logged";
  const notes = field(description, ["Remark", "Remarks", "Details"]) || task.progressNotes || description || task.taskTitle || "Sales call entry";
  const leadName = personName || companyName || task.taskTitle || "Sales Contact";

  let lead: any = await BdaLead.findOne({
    where: {
      [Op.or]: [
        { leadId: leadCode },
        { rawExtraJson: { [Op.like]: `%\"sourceTaskId\":\"${taskId}\"%` } },
      ],
    },
  });
  if (!lead) {
    try {
      lead = await BdaLead.create({
        leadId: leadCode,
        name: leadName,
        phone: phone || null,
        email: email || null,
        companyName: companyName || null,
        city: city || null,
        source: "Work Report",
        status: /not interested|lost/i.test(callStatus) ? "Lost" : "In Progress",
        salesReason: reason || "Sales Call",
        assignedTo: employeeId || null,
        assignedToName: employee?.name || null,
        assignedBy: task.assignedBy || employeeId || null,
        assignedAt: task.createdAt || task.date || new Date(),
        remarks: notes,
        rawExtraJson: JSON.stringify({ sourceTaskId: taskId }),
      });
    } catch (error) {
      if (!(error instanceof UniqueConstraintError)) throw error;
      lead = await BdaLead.findOne({
        where: {
          [Op.or]: [
            { leadId: leadCode },
            { rawExtraJson: { [Op.like]: `%\"sourceTaskId\":\"${taskId}\"%` } },
          ],
        },
      });
      if (!lead) throw error;
    }
  }

  const marker = `task:${taskId}`;
  const existingCall = await BdaCallLog.findOne({ where: { recordingUrl: marker } });
  if (!existingCall) {
    await BdaCallLog.create({
      leadId: lead.id,
      leadCode,
      bdaUserId: employeeId,
      bdaName: employee?.name || "Sales User",
      callDateTime: task.completedAt || task.updatedAt || task.date || task.createdAt || new Date(),
      callType: field(description, ["Call Mode", "Call Type"]) || "Outgoing Call",
      callStatus,
      durationSeconds: Number(task.elapsedSeconds || 0),
      conversationNotes: String(notes),
      customerInterest: /not interested/i.test(callStatus) ? "Not Interested" : null,
      leadStatus: lead.status,
      nextCallbackAt: task.scheduledAt || null,
      recordingUrl: marker,
      proofUrl: task.proofAttachment || null,
    });
  }
  return lead;
}

export async function syncUnsyncedSalesTasks() {
  const tasks: any[] = await TaskLog.findAll({
    where: {
      taskType: { [Op.like]: "%Call%" },
      [Op.or]: [
        { taskTitle: { [Op.like]: "%Sales%" } },
      ],
    },
    order: [["createdAt", "DESC"]],
    limit: 1000,
    raw: true,
  }) as any[];
  let synced = 0;
  const validLeadCodes: string[] = [];
  const validTaskIds: string[] = [];
  for (const task of tasks) {
    if (await syncSalesTask(task)) {
      synced++;
      validLeadCodes.push(`TASK-${task.id}`);
      validTaskIds.push(String(task.id));
    }
  }
  return { checked: tasks.length, synced, validLeadCodes, validTaskIds };
}
