import { NextResponse } from "next/server";
import LegalRecoveryFollowUp from "@/models/sequelize/LegalRecoveryFollowUp";
import LegalRecoveryMaster from "@/models/sequelize/LegalRecoveryMaster";
import LegalWorkLog from "@/models/sequelize/LegalWorkLog";
import LegalWorkHistory from "@/models/sequelize/LegalWorkHistory";
import TaskLog from "@/models/sequelize/TaskLog";
import sequelize from "@/lib/sequelize";
import { Op } from "sequelize";

export async function POST(request: Request) {
  try {
    const data = await request.json();
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
    
    // 1. Create Task in TaskLog (used by Kanban)
    const branchInfo = [
      data.branchName,
      data.branchId ? `(${data.branchId})` : null
    ].filter(Boolean).join(" ");
    const taskTitle = `Legal Follow Up - Bank: ${data.bankName || 'Unknown'}${branchInfo ? ` - ${branchInfo}` : ''}`;
    const nextId = await TaskLog.generateNextTaskId(data.callerId);
    
    // Construct progress notes array JSON
    const initialNoteObj = {
      id: Date.now().toString(),
      note: data.conversationDetails || "Follow up call logged",
      createdAt: new Date().toISOString(),
      userName: data.callerName || "System"
    };
    const serializedNotes = JSON.stringify([initialNoteObj]);

    const newTask = await TaskLog.create({
      id: nextId,
      employee: data.callerId || null,
      date: new Date(),
      taskTitle: taskTitle,
      taskType: "CALL",
      description: data.conversationDetails,
      status: "Pending",
      scheduledAt: data.nextFollowUpDate ? new Date(data.nextFollowUpDate) : null,
      timerState: "Stopped",
      elapsedSeconds: 0,
      proofAttachment: data.callRecordingUrl || null,
      progressNotes: serializedNotes
    });

    // 2. Create Follow Up entry
    const followupData = {
      masterId: data.masterId || 0,
      callerId: data.callerId,
      callerName: data.callerName,
      callStatus: data.callStatus,
      conversationDetails: data.conversationDetails,
      callRecordingUrl: data.callRecordingUrl,
      nextFollowUpDate: data.nextFollowUpDate || null,
      callDate: data.callDate || new Date(),
      bankName: data.bankName,
      branchName: data.branchName,
      taskId: newTask.id // Link the task
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
        broughtBy: data.callerName,
        employeeName: data.callerName,
        employeeId: data.callerId,
        uploadedFileName: data.callRecordingUrl || undefined,
        remarks: callRemarks,
        financialDetails: JSON.stringify({
          billFollowUpCallDate: callWorkDate,
          callStatus: data.callStatus,
          nextFollowUpDate: data.nextFollowUpDate,
          conversationDetails: data.conversationDetails,
          callRecordingUrl: data.callRecordingUrl,
          taskId: newTask.id
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
        employeeId: data.callerId,
        employeeName: data.callerName,
        attachmentUrl: data.callRecordingUrl || undefined,
        remarks: callRemarks,
        status: "Completed",
        amount: 0
      });
    } catch (whErr) {
      console.warn("LegalWorkHistory creation warning on follow-up:", whErr);
    }

    return NextResponse.json({ success: true, data: newFollowUp, task: newTask });
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
