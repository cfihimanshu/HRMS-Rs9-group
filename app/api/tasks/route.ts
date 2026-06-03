import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/db";
import TaskLog from "@/models/TaskLog";
import { logAudit } from "@/lib/audit";

// GET: Fetch today's tasks
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const userRole = (session.user as any).role || "Employee";
    
    await dbConnect();

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    let query: any = { date: { $gte: today, $lt: tomorrow } };
    
    // If regular employee, only see own tasks. Otherwise see all.
    if (userRole === "Employee") {
      query.employee = userId;
    }

    const records = await TaskLog.find(query)
      .populate("employee", "name role")
      .sort({ createdAt: -1 });

    return NextResponse.json({ success: true, data: records });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Add a new task for today
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const userName = session.user.name || "Employee";
    const body = await req.json();
    const { taskTitle, taskType, description, status } = body;

    if (!taskTitle || !taskType) {
      return NextResponse.json({ success: false, error: "Missing required fields (Task Title, Task Type)" }, { status: 400 });
    }

    await dbConnect();

    const today = new Date(); // exact timestamp for sorting later, but the "date" field can be start of day or exact.
    // We'll save exact timestamp in createdAt, but let's store the current time in date as well for querying by day easily.
    
    const record = new TaskLog({
      employee: userId,
      date: new Date(),
      taskTitle,
      taskType,
      description: description || "",
      status: status || "Completed",
    });
    await record.save();

    await logAudit({
      userId,
      action: "TASK_LOGGED",
      entity: "TaskLog",
      entityId: record._id.toString(),
      details: `${userName} logged a new task: ${taskTitle} (${taskType})`,
    });

    return NextResponse.json({ success: true, data: record });
  } catch (error: any) {
    console.error("Failed to add task:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT: Update task details or status
export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const body = await req.json();
    const { taskId, status, progressNotes, taskTitle, taskType, description } = body;

    if (!taskId) {
      return NextResponse.json({ success: false, error: "Missing required field: taskId" }, { status: 400 });
    }

    await dbConnect();

    const task = await TaskLog.findOne({ _id: taskId, employee: userId });
    if (!task) {
      return NextResponse.json({ success: false, error: "Task not found" }, { status: 404 });
    }

    if (status !== undefined) task.status = status;
    if (progressNotes !== undefined) task.progressNotes = progressNotes;
    if (taskTitle !== undefined) task.taskTitle = taskTitle;
    if (taskType !== undefined) task.taskType = taskType;
    if (description !== undefined) task.description = description;
    await task.save();

    return NextResponse.json({ success: true, data: task });
  } catch (error: any) {
    console.error("Failed to update task:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE: Delete a task
export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const { searchParams } = new URL(req.url);
    const taskId = searchParams.get("taskId");

    if (!taskId) {
      return NextResponse.json({ success: false, error: "Missing required query parameter: taskId" }, { status: 400 });
    }

    await dbConnect();

    const task = await TaskLog.findOneAndDelete({ _id: taskId, employee: userId });
    if (!task) {
      return NextResponse.json({ success: false, error: "Task not found or unauthorized to delete" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Task deleted successfully" });
  } catch (error: any) {
    console.error("Failed to delete task:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

