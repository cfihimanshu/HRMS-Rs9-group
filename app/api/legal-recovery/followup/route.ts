import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import LegalRecoveryFollowUp from "@/models/sequelize/LegalRecoveryFollowUp";
import LegalRecoveryMaster from "@/models/sequelize/LegalRecoveryMaster";
import LegalWorkLog from "@/models/sequelize/LegalWorkLog";
import LegalWorkHistory from "@/models/sequelize/LegalWorkHistory";
import TaskLog from "@/models/sequelize/TaskLog";
import sequelize from "@/lib/sequelize";
import { Op } from "sequelize";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import User from "@/models/sequelize/User";
import Notification from "@/models/sequelize/Notification";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const data = await request.json();
    const callerId = String((session.user as any).id || "");
    const callerName = String(session.user.name || "Employee");
    await sequelize.authenticate();
    
    // Sync models if tables don't exist
    await LegalRecoveryFollowUp.sync();
    await TaskLog.sync();
    await LegalWorkLog.sync().catch(() => {});
    await LegalWorkHistory.sync().catch(() => {});

    // Sanitize nextFollowUpDate to prevent invalid date / empty string DB errors
    let cleanNextFollowUpDate: string | null = null;
    if (data.nextFollowUpDate && typeof data.nextFollowUpDate === "string" && data.nextFollowUpDate.trim() !== "") {
      const parsed = new Date(data.nextFollowUpDate);
      if (!isNaN(parsed.getTime())) {
        cleanNextFollowUpDate = data.nextFollowUpDate.trim();
      }
    }
    data.nextFollowUpDate = cleanNextFollowUpDate;

    let forwardedUser: any = null;
    if (data.forwardedTo) {
      forwardedUser = await User.findByPk(String(data.forwardedTo), { attributes: ["id", "name", "status"], raw: true }) as any;
      if (!forwardedUser || String(forwardedUser.status || "").trim().toLowerCase() !== "active") {
        return NextResponse.json({ success: false, error: "Selected employee is not available for task forwarding" }, { status: 400 });
      }
    }
    
    // Complete the task created by the previous follow-up for this case.
    const previousFollowUp = await LegalRecoveryFollowUp.findOne({
      where: { masterId: data.masterId || 0, taskId: { [Op.ne]: null } },
      order: [["createdAt", "DESC"]],
    });
    let completedTaskId: string | null = null;
    if (previousFollowUp?.taskId) {
      const previousTask = await TaskLog.findByPk(previousFollowUp.taskId);
      if (previousTask && previousTask.status !== "Completed") {
        await previousTask.update({ status: "Completed", timerState: "Stopped", timerStart: null });
        completedTaskId = String(previousTask.id);
      }
    }

    // Create a new task only when this follow-up is forwarded to someone.
    const branchInfo = [
      data.branchName,
      data.branchId ? `(${data.branchId})` : null
    ].filter(Boolean).join(" ");
    const taskTitle = `Legal Follow Up - Bank: ${data.bankName || 'Unknown'}${branchInfo ? ` - ${branchInfo}` : ''}`;
    
    // Construct progress notes array JSON
    const initialNoteObj = {
      id: Date.now().toString(),
      note: data.conversationDetails || "Follow up call logged",
      createdAt: new Date().toISOString(),
      userName: callerName
    };
    const serializedNotes = JSON.stringify([initialNoteObj]);
    const completedCallTaskId = await TaskLog.generateNextTaskId(callerId);
    const completedCallTask = await TaskLog.create({
      id: completedCallTaskId,
      employee: callerId || null,
      date: data.callDate ? new Date(data.callDate) : new Date(),
      taskTitle,
      taskType: "CALL",
      description: data.conversationDetails,
      status: "Completed",
      scheduledAt: null,
      timerState: "Stopped",
      timerStart: null,
      elapsedSeconds: 0,
      proofAttachment: data.callRecordingUrl || null,
      progressNotes: serializedNotes,
    });
    let newTask: any = null;
    if (forwardedUser) {
      const nextId = await TaskLog.generateNextTaskId(String(forwardedUser.id));
      newTask = await TaskLog.create({
        id: nextId,
        employee: String(forwardedUser.id),
        assignedBy: callerId || null,
        forwardedTo: String(forwardedUser.id),
        date: new Date(),
        taskTitle,
        taskType: "CALL",
        description: data.conversationDetails,
        status: "Pending",
        scheduledAt: data.nextFollowUpDate ? new Date(data.nextFollowUpDate) : null,
        timerState: "Stopped",
        elapsedSeconds: 0,
        proofAttachment: data.callRecordingUrl || null,
        progressNotes: serializedNotes,
      });
      try {
        await Notification.sync();
        await Notification.create({
          id: `legal_followup_${newTask.id}_${forwardedUser.id}`,
          recipient: String(forwardedUser.id),
          title: "New Legal Follow-up Task",
          message: `${callerName} forwarded a legal follow-up task to you: ${taskTitle}`,
          read: false,
        });
      } catch (notificationError) {
        console.error("Legal follow-up forwarding notification error:", notificationError);
      }
    }

    // 2. Create Follow Up entry
    const followupData = {
      masterId: data.masterId || 0,
      callerId,
      callerName,
      callStatus: data.callStatus,
      conversationDetails: data.conversationDetails,
      callRecordingUrl: data.callRecordingUrl,
      nextFollowUpDate: data.nextFollowUpDate || null,
      callDate: data.callDate || new Date(),
      bankName: data.bankName,
      branchName: data.branchName,
      taskId: newTask?.id || completedCallTask.id
    };
    
    const newFollowUp = await LegalRecoveryFollowUp.create(followupData);

    // 3. Create Bill Follow Up entry in LegalWorkLog & LegalWorkHistory
    const callWorkDate = data.callDate || new Date().toISOString().split('T')[0];
    const callRemarks = `[Call: ${data.callStatus || 'Connected'}] ${data.conversationDetails || 'Follow-up call logged'}`;

    try {
      await LegalWorkLog.create({
        masterId: data.masterId && Number(data.masterId) > 0 ? Number(data.masterId) : 0,
        workDate: callWorkDate,
        typeOfWork: "Bank Related",
        workLocation: "Office",
        bankName: data.bankName || "Registered Bank",
        branchName: data.branchName || "General Branch",
        category: "Bill Follow Up",
        subCategory: "BILL FOLLOW UP",
        businessDevOption: "Bill Follow Up",
        businessDevSubOption: "BILL FOLLOW UP",
        noOfCount: "1",
        broughtBy: callerName,
        employeeName: callerName,
        employeeId: callerId,
        uploadedFileName: data.callRecordingUrl || undefined,
        remarks: callRemarks,
        financialDetails: JSON.stringify({
          billFollowUpCallDate: callWorkDate,
          callStatus: data.callStatus,
          nextFollowUpDate: data.nextFollowUpDate,
          conversationDetails: data.conversationDetails,
          callRecordingUrl: data.callRecordingUrl,
          taskId: completedCallTask.id,
          forwardedTaskId: newTask?.id || null,
          completedTaskId,
          forwardedTo: data.forwardedTo || null
        })
      });
    } catch (wlErr) {
      console.warn("LegalWorkLog creation warning on follow-up:", wlErr);
    }

    try {
      await LegalWorkHistory.create({
        masterId: data.masterId && Number(data.masterId) > 0 ? Number(data.masterId) : 0,
        category: "Bill Follow Up",
        subCategory: "BILL FOLLOW UP",
        bankName: data.bankName || "Registered Bank",
        branchName: data.branchName || "General Branch",
        employeeId: callerId,
        employeeName: callerName,
        attachmentUrl: data.callRecordingUrl || undefined,
        remarks: callRemarks,
        status: "Completed",
        amount: 0
      });
    } catch (whErr) {
      console.warn("LegalWorkHistory creation warning on follow-up:", whErr);
    }

    return NextResponse.json({ success: true, data: newFollowUp, task: newTask, loggedTask: completedCallTask, completedTaskId });
  } catch (error: any) {
    console.error("Legal Followup POST Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const masterId = searchParams.get('masterId');
    
    await sequelize.authenticate();
    await LegalRecoveryFollowUp.sync();
    
    const whereClause = masterId ? { masterId } : {};
    
    const followups = await LegalRecoveryFollowUp.findAll({
      where: whereClause,
      order: [["createdAt", "DESC"]],
      raw: true
    });

    // Fetch all master records to fallback get bankName and branchName
    const masterIds = [...new Set(followups.map((f: any) => f.masterId).filter(Boolean))];
    let masterMap: any = {};
    if (masterIds.length > 0) {
      const masters = await LegalRecoveryMaster.findAll({
        where: { id: { [Op.in]: masterIds } },
        raw: true
      });
      masters.forEach((m: any) => {
        masterMap[m.id] = m;
      });
    }

    const data = followups.map((f: any) => {
      const master = masterMap[f.masterId] || {};
      return {
        ...f,
        bankName: f.bankName || master.bankName || "Unknown Bank",
        branchName: f.branchName || master.branchName || "General"
      };
    });
    
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
