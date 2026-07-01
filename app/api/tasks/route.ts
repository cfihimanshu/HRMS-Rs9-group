// Removed @ts-nocheck
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import sequelize from "@/lib/sequelize";
import TaskLog from "@/models/sequelize/TaskLog";
import User from "@/models/sequelize/User";
import { logAudit } from "@/lib/audit";
import { Op } from "sequelize";

// GET: Fetch today's tasks
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const userRole = (session.user as any).role || "Employee";
    
    await sequelize.authenticate();

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    let query: any = { date: { [Op.gte]: today, [Op.lt]: tomorrow } };
    
    // If regular employee, only see own tasks. Otherwise see all.
    if (userRole === "Employee") {
      query.employee = userId;
    }

    const records = await TaskLog.findAll({ 
      where: query,
      order: [["createdAt", "DESC"]]
    });

    const empIds = records.map((r: any) => r.employee).filter(Boolean);
    const employees = await User.findAll({
      where: { id: { [Op.in]: empIds } },
      attributes: ["id", "name", "role"],
      raw: true
    });
    const empMap = new Map(employees.map((e: any) => [e.id, e]));

    const hydratedRecords = records.map((r: any) => {
      const plain = r.toJSON();
      plain.id = plain.id.toString();
      if (plain.employee) {
        const empDetail = empMap.get(plain.employee);
        plain.employee = empDetail ? { ...empDetail, id: empDetail.id } : { id: plain.employee, name: "Unknown", role: "Employee" };
      } else {
        plain.employee = { id: "unknown", name: "Unknown", role: "Employee" };
      }
      return plain;
    });

    return NextResponse.json({ success: true, data: hydratedRecords });
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

    await sequelize.authenticate();

    const record = await TaskLog.create({
      employee: userId,
      date: new Date(),
      taskTitle,
      taskType,
      description: description || "",
      status: status || "Completed",
    });

    await logAudit({
      userId,
      action: "TASK_LOGGED",
      entity: "TaskLog",
      entityId: record.id.toString(),
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

    await sequelize.authenticate();

    const task = await TaskLog.findOne({ where: { id: taskId, employee: userId } });
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

    await sequelize.authenticate();

    const task = await TaskLog.findOne({ where: { id: taskId, employee: userId } });
    if (!task) {
      return NextResponse.json({ success: false, error: "Task not found or unauthorized to delete" }, { status: 404 });
    }

    await task.destroy();

    return NextResponse.json({ success: true, message: "Task deleted successfully" });
  } catch (error: any) {
    console.error("Failed to delete task:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

