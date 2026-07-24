import { NextResponse } from "next/server";
import LegalMarketingCall from "@/models/sequelize/LegalMarketingCall";
import TaskLog from "@/models/sequelize/TaskLog";
import sequelize from "@/lib/sequelize";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const branchCode = searchParams.get("branchCode");
    
    await sequelize.authenticate();
    await LegalMarketingCall.sync({ alter: true });

    let whereClause = {};
    if (branchCode) {
      whereClause = { branchCode };
    }

    const logs = await LegalMarketingCall.findAll({
      where: whereClause,
      order: [["createdAt", "DESC"]],
    });
    
    return NextResponse.json({ success: true, data: logs });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    await sequelize.authenticate();
    await LegalMarketingCall.sync({ alter: true });
    await TaskLog.sync({ alter: true });
    
    const session = await getServerSession(authOptions);
    if (session?.user) {
      data.callerId = (session.user as any).id;
      data.callerName = (session.user as any).name;
    }

    // Sanitize nextFollowUpDate to prevent invalid date / empty string DB errors
    let cleanNextFollowUpDate: string | null = null;
    if (data.nextFollowUpDate && typeof data.nextFollowUpDate === "string" && data.nextFollowUpDate.trim() !== "") {
      const parsed = new Date(data.nextFollowUpDate);
      if (!isNaN(parsed.getTime())) {
        cleanNextFollowUpDate = data.nextFollowUpDate.trim();
      }
    }
    data.nextFollowUpDate = cleanNextFollowUpDate;

    // Create Task in TaskLog (used by Kanban)
    const taskTitle = `Business Development - Branch: ${data.branchName || 'Unknown'}`;
    const nextId = await TaskLog.generateNextTaskId(data.callerId);

    const docUrl = data.callRecordingUrl || data.documentUrl || data.attachmentUrl || null;
    let finalDesc = data.conversationDetails || "";
    if (docUrl) {
      finalDesc = `${finalDesc}\n\n📄 Attached Document: ${docUrl}`.trim();
    }

    const newTask = await TaskLog.create({
      id: nextId,
      employee: data.callerId || null,
      date: new Date(),
      taskTitle: taskTitle,
      taskType: "CALL",
      description: finalDesc,
      status: "Pending",
      scheduledAt: data.nextFollowUpDate ? new Date(data.nextFollowUpDate) : null,
      timerState: "Stopped",
      elapsedSeconds: 0,
      proofAttachment: docUrl,
    });

    data.taskId = newTask.id;
    
    const newCall = await LegalMarketingCall.create(data);
    return NextResponse.json({ success: true, data: newCall, task: newTask });
  } catch (error: any) {
    console.error("Marketing Call POST Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
