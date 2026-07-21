import { NextResponse } from "next/server";
import NbfcFollowup from "@/models/sequelize/NbfcFollowup";
import TaskLog from "@/models/sequelize/TaskLog";
import sequelize from "@/lib/sequelize";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const nbfcId = searchParams.get("nbfcId");

    await sequelize.authenticate();
    await NbfcFollowup.sync({ alter: true });

    let whereClause: any = {};
    if (nbfcId) {
      whereClause.nbfcId = nbfcId;
    }

    const followups = await NbfcFollowup.findAll({
      where: whereClause,
      order: [["createdAt", "DESC"]],
    });

    return NextResponse.json({ success: true, data: followups });
  } catch (error: any) {
    console.error("NbfcFollowup GET Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    await sequelize.authenticate();
    await NbfcFollowup.sync({ alter: true });
    await TaskLog.sync({ alter: true });

    const session = await getServerSession(authOptions);
    if (session?.user) {
      data.callerId = (session.user as any).id;
      data.callerName = (session.user as any).name;
    }

    let createdTaskId: string | null = null;

    // Auto-create TaskLog entry if nextFollowUpDate is provided
    if (data.nextFollowUpDate) {
      const targetEmpId = data.callerId || (session?.user as any)?.id || null;
      const nextId = await TaskLog.generateNextTaskId(targetEmpId);

      // Parse nextFollowUpDate safely (supporting DD/MM/YYYY and YYYY-MM-DD)
      let scheduledDate: Date = new Date();
      if (typeof data.nextFollowUpDate === "string" && data.nextFollowUpDate.includes("/")) {
        const parts = data.nextFollowUpDate.split("/");
        if (parts.length === 3) {
          const day = parts[0].padStart(2, "0");
          const month = parts[1].padStart(2, "0");
          const year = parts[2];
          scheduledDate = new Date(`${year}-${month}-${day}T09:00:00`);
        } else {
          scheduledDate = new Date(data.nextFollowUpDate);
        }
      } else {
        scheduledDate = new Date(data.nextFollowUpDate);
      }
      if (isNaN(scheduledDate.getTime())) {
        scheduledDate = new Date();
      }

      const taskTitle = `NBFC Follow-up: ${data.nbfcName || 'NBFC'} (${data.nbfcCode || 'Master'})`;
      let taskDescription = `Follow-up call with ${data.nbfcName}.\nStatus: ${data.callStatus || 'Connected'}\nDiscussion: ${data.conversationDetails || 'N/A'}`;
      if (data.attachmentUrl) {
        taskDescription += `\n\n📄 Attachment: ${data.attachmentUrl}`;
      }

      const newTask = await TaskLog.create({
        id: nextId,
        employee: targetEmpId,
        date: new Date(),
        taskTitle: taskTitle,
        taskType: "CALL",
        description: taskDescription,
        status: "Pending",
        scheduledAt: scheduledDate,
        timerState: "Stopped",
        elapsedSeconds: 0,
        proofAttachment: data.attachmentUrl || null,
      });

      createdTaskId = newTask.id;
    }

    const newFollowup = await NbfcFollowup.create({
      nbfcId: data.nbfcId ? Number(data.nbfcId) : null,
      nbfcName: data.nbfcName || "NBFC",
      nbfcCode: data.nbfcCode || "",
      callDate: data.callDate || new Date().toISOString().split("T")[0],
      callStatus: data.callStatus || "Connected",
      nextFollowUpDate: data.nextFollowUpDate || null,
      conversationDetails: data.conversationDetails || "",
      attachmentUrl: data.attachmentUrl || null,
      taskId: createdTaskId,
      callerId: data.callerId ? String(data.callerId) : null,
      callerName: data.callerName || null,
    });

    return NextResponse.json({
      success: true,
      data: newFollowup,
      taskId: createdTaskId,
      message: createdTaskId
        ? `Follow-up logged & Auto-task #${createdTaskId} created for ${data.nextFollowUpDate}!`
        : "Follow-up logged successfully!",
    });
  } catch (error: any) {
    console.error("NbfcFollowup POST Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
