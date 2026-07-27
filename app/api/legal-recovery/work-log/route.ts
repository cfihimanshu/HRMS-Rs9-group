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
    let empId = data.employeeId || null;
    if (session?.user) {
      empId = (session.user as any).id;
      data.employeeId = empId;
      data.employeeName = (session.user as any).name || ((session.user as any).firstName ? `${(session.user as any).firstName} ${(session.user as any).lastName || ''}`.trim() : "Employee");
    }
    
    data.masterId = data.masterId || 0;
    data.category = data.category || data.typeOfWork || "General";
    data.subCategory = data.subCategory || (data.workLocation === "Other" ? (data.customLocation || "Other") : (data.workLocation || "Office"));

    const newLog = await LegalWorkLog.create(data);

    // Auto-create a TaskLog entry so it shows in My Tasks (Kanban Board) and Schedule Work Report
    if (empId) {
      try {
        const TaskLog = (sequelize.models as any).TaskLog || (await import("@/models/sequelize/TaskLog")).default;
        if (TaskLog) {
          await TaskLog.sync({ alter: true });
          const generatedTaskId = await TaskLog.generateNextTaskId(empId);
          const taskDate = data.allocationDate || data.workDate || new Date().toISOString().split("T")[0];
          const taskTime = new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
          const titleStr = data.businessDevOption && data.businessDevSubOption
            ? `${data.businessDevOption} - ${data.businessDevSubOption}`
            : `${data.category || 'Legal Work'}: ${data.subCategory || 'Task'}`;

          let extraDetails = "";
          if (data.businessDevSubOption === "COLLECT NOTICE DATA") {
            extraDetails = `Count: ${data.noOfCount || 1} | Brought By: ${data.broughtBy || 'N/A'}${data.uploadedFileName ? ` | File: ${data.uploadedFileName}` : ''}`;
          } else if (data.businessDevSubOption === "PREPARE NOTICE LIST") {
            extraDetails = `Count: ${data.noOfCount || 1} | Prepared By: ${data.preparedBy || 'N/A'}${data.uploadedFileName ? ` | File: ${data.uploadedFileName}` : ''}`;
          } else if (data.businessDevSubOption?.includes("GENERATE NOTICE")) {
            extraDetails = `Count: ${data.noOfCount || 1} | Printed By: ${data.printedBy || 'N/A'}${data.uploadedFileName ? ` | File: ${data.uploadedFileName}` : ''}`;
          } else if (data.businessDevSubOption?.includes("DISPATCH NOTICE")) {
            extraDetails = `Count: ${data.noOfCount || 1} | Dispatched By: ${data.dispatchedBy || 'N/A'}${data.uploadedFileName ? ` | File: ${data.uploadedFileName}` : ''}`;
          } else if (data.businessDevSubOption?.includes("PREPARE BILL")) {
            extraDetails = `Bill No: ${data.billNo || 'N/A'} | Date: ${data.billDate || 'N/A'} | Amount: ₹${data.billAmount || 0}${data.uploadedFileName ? ` | File: ${data.uploadedFileName}` : ''}`;
          } else if (data.businessDevSubOption?.includes("REQUEST PAYMENT")) {
            extraDetails = `Amount: ₹${data.billAmount || 0} | Person Name: ${data.personName || 'N/A'} | Allocation Date: ${taskDate}${data.uploadedFileName ? ` | File: ${data.uploadedFileName}` : ''}`;
          } else {
            extraDetails = `Count: ${data.noOfCount || 1} | Bank: ${data.bankName || 'N/A'} | Branch: ${data.branchName || 'N/A'} | Allocation Date: ${taskDate}`;
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
        }
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

    await sequelize.authenticate();
    await LegalWorkLog.sync({ alter: true });

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
