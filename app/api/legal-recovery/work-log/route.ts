import { NextResponse } from "next/server";
import LegalWorkLog from "@/models/sequelize/LegalWorkLog";
import TaskLog from "@/models/sequelize/TaskLog";
import sequelize, { safeAuthenticate } from "@/lib/sequelize";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const masterId = searchParams.get("masterId");
    
    const isDbConnected = await safeAuthenticate(4000);
    if (!isDbConnected) {
      return NextResponse.json({ success: true, data: [] });
    }

    try {
      await LegalWorkLog.sync();
    } catch (sErr) {
      console.warn("LegalWorkLog sync warning:", sErr);
    }

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
    console.error("GET /api/legal-recovery/work-log error:", error);
    return NextResponse.json({ success: true, data: [], error: error.message });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const isDbConnected = await safeAuthenticate(6000);
    if (!isDbConnected) {
      return NextResponse.json({ success: false, error: "Database connection timeout" }, { status: 503 });
    }

    await LegalWorkLog.sync({ alter: true });
    
    const session = await getServerSession(authOptions);

    const empId = data.employeeId || session?.user?.email || "emp_unknown";
    const empName = session?.user?.name || empId;

    const newLog = await LegalWorkLog.create({
      ...data,
      employeeId: empId,
      employeeName: empName
    });

    if (data.workDate || data.allocationDate) {
      try {
        await TaskLog.sync({ alter: true });
        
        const countStr = data.noOfCount || "1";
        const categoryStr = data.businessDevOption || data.category || "Legal Recovery Work";
        const subCatStr = data.businessDevSubOption || data.subCategory || "Notice Execution";
        const titleStr = `${categoryStr}: ${subCatStr} (${countStr} Count)`;
        const taskDate = data.workDate || new Date().toISOString().split('T')[0];
        
        let taskTime = "10:00 AM";
        if (data.allocationDate) {
          const dt = new Date(data.allocationDate);
          if (!isNaN(dt.getTime())) {
            taskTime = dt.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
          }
        }

        const dateCompact = taskDate.replace(/-/g, "");
        const generatedTaskId = `TSK-${dateCompact}-${Math.floor(1000 + Math.random() * 9000)}`;

        let extraDetails = `Brought By: ${data.broughtBy || 'N/A'}, Printed By: ${data.printedBy || 'N/A'}, Dispatched By: ${data.dispatchedBy || 'N/A'}`;
        if (data.billNo || data.billAmount) {
          extraDetails += ` | Bill No: ${data.billNo || 'N/A'}, Amount: Rs.${data.billAmount || '0'}`;
        }

        await TaskLog.create({
          id: generatedTaskId,
          employee: empId,
          taskTitle: titleStr,
          description: `${extraDetails} | Remarks: ${data.remarks || ''}`,
          status: "Pending",
          allocatedBy: empId,
          date: taskDate,
          scheduledAt: data.allocationDate ? new Date(data.allocationDate) : new Date(),
          time: taskTime,
          workSection: data.workLocation || "Bank",
          bankName: data.bankName || null,
          branchName: data.branchName || null
        });
      } catch (tErr) {
        console.warn("TaskLog creation warning in work-log route:", tErr);
      }
    }

    return NextResponse.json({ success: true, data: newLog });
  } catch (error: any) {
    console.error("Work Log POST Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const clearAll = searchParams.get("clearAll");

    const isDbConnected = await safeAuthenticate(6000);
    if (!isDbConnected) {
      return NextResponse.json({ success: false, error: "Database connection timeout" }, { status: 503 });
    }

    await LegalWorkLog.sync();

    if (clearAll === "true") {
      await LegalWorkLog.destroy({ where: {} });
      return NextResponse.json({ success: true, message: "All work logs cleared successfully." });
    }

    if (id) {
      await LegalWorkLog.destroy({ where: { id } });
      return NextResponse.json({ success: true, message: `Work Log #${id} deleted.` });
    }

    return NextResponse.json({ success: false, error: "Missing id or clearAll param." }, { status: 400 });
  } catch (error: any) {
    console.error("Work Log DELETE Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
