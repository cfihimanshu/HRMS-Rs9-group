import { NextResponse } from "next/server";
import sequelize from "@/lib/sequelize";
import TaskLog from "@/models/sequelize/TaskLog";

export async function GET() {
  try {
    await sequelize.authenticate();
    const nextId = "TEST-" + Date.now();
    const record = await TaskLog.create({
      id: nextId,
      employee: "test-user",
      date: new Date(),
      taskTitle: "Test Title",
      taskType: "Development",
      description: "Test Description",
      status: "Pending",
      timerState: "Running",
      timerStart: new Date(),
      elapsedSeconds: 0,
    });
    
    // Cleanup the test record
    await record.destroy();

    return NextResponse.json({ success: true, message: "Task query executed successfully without errors!" });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      errorMessage: error.message,
      sql: error.sql,
      originalError: error.original ? {
        message: error.original.message,
        code: error.original.code,
        sqlMessage: error.original.sqlMessage
      } : null
    });
  }
}
