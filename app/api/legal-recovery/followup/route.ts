import { NextResponse } from "next/server";
import LegalRecoveryFollowUp from "@/models/sequelize/LegalRecoveryFollowUp";
import TaskLog from "@/models/sequelize/TaskLog";
import sequelize from "@/lib/sequelize";

export async function POST(request: Request) {
  try {
    const data = await request.json();
    await sequelize.authenticate();
    
    // Sync models if tables don't exist
    await LegalRecoveryFollowUp.sync({ alter: true });
    await TaskLog.sync({ alter: true });
    
    // 1. Create Task in TaskLog (used by Kanban)
    const taskTitle = `Legal Follow Up - Bank: ${data.bankName || 'Unknown'}`;
    const nextId = await TaskLog.generateNextTaskId(data.callerId);
    
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
    });

    // 2. Create Follow Up entry
    const followupData = {
      masterId: data.masterId,
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
    await LegalRecoveryFollowUp.sync({ alter: true });
    
    const whereClause = masterId ? { masterId } : {};
    
    const followups = await LegalRecoveryFollowUp.findAll({
      where: whereClause,
      order: [["createdAt", "DESC"]],
    });
    
    return NextResponse.json({ success: true, data: followups });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
