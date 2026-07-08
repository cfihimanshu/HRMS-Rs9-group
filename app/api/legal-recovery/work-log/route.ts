import { NextResponse } from "next/server";
import LegalWorkLog from "@/models/sequelize/LegalWorkLog";
import KanbanTask from "@/models/sequelize/KanbanTask";
import sequelize from "@/lib/sequelize";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const masterId = searchParams.get("masterId");
    
    await sequelize.authenticate();
    await LegalWorkLog.sync({ alter: true });

    let whereClause = {};
    if (masterId) {
      whereClause = { masterId };
    }

    const logs = await LegalWorkLog.findAll({
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
    await LegalWorkLog.sync({ alter: true });
    
    const session = await getServerSession(authOptions);
    if (session?.user) {
      data.employeeId = (session.user as any).id;
      data.employeeName = (session.user as any).name || ((session.user as any).firstName ? `${(session.user as any).firstName} ${(session.user as any).lastName || ''}`.trim() : "Employee");
    }
    
    const newLog = await LegalWorkLog.create(data);

    // Auto-create a Task in Kanban
    await KanbanTask.sync({ alter: true });
    await KanbanTask.create({
      title: `Legal: ${data.category} - ${data.subCategory}`,
      description: `Case ID: ${data.masterId}\nRemarks: ${data.remarks || 'Completed step'}`,
      priority: "Medium",
      status: "Completed",
      department_id: "LEGAL",
      assigned_by: data.employeeId || null,
      assigned_to: data.employeeId || null,
      due_date: new Date(),
    });

    return NextResponse.json({ success: true, data: newLog });
  } catch (error: any) {
    console.error("Work Log POST Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
