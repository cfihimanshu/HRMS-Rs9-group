import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/db";
import ExitRecord from "@/models/ExitRecord";
import User from "@/models/User";
import { logAudit } from "@/lib/audit";

// GET: Fetch all active exit records (HR & Owner only)
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const role = (session.user as any).role;
    const permitted = ["Owner", "Director", "IT Admin", "HR Head", "HR Executive"];
    if (!permitted.includes(role)) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    await dbConnect();
    const records = await ExitRecord.find({ status: "active" })
      .populate("employee", "name email role mobile")
      .sort({ createdAt: -1 });

    return NextResponse.json({ success: true, data: records });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Create or Update an Exit Checklist record (HR & Owner only)
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const role = (session.user as any).role;
    const permitted = ["Owner", "Director", "IT Admin", "HR Head", "HR Executive"];
    if (!permitted.includes(role)) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const {
      employeeId,
      exitReason,
      assetsReturned,
      accessRevoked,
      ndaReminder,
      dataAudit,
      clientTransfer,
      postExitWatch,
      finalSettlementStatus,
      exitInterviewNotes,
    } = body;

    if (!employeeId || !exitReason) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }

    await dbConnect();

    // Check if target employee exists
    const employeeUser = await User.findById(employeeId).populate("companies");
    if (!employeeUser) {
      return NextResponse.json({ success: false, error: "Employee User not found" }, { status: 404 });
    }

    const companyName = employeeUser.companyName || (employeeUser.companies?.[0] as any)?.name || "N/A";

    let record = await ExitRecord.findOne({ employee: employeeId });

    if (record) {
      record.employeeName = employeeUser.name;
      record.companyName = companyName;
      record.role = employeeUser.role;
      record.exitReason = exitReason;
      record.assetsReturned = !!assetsReturned;
      record.accessRevoked = !!accessRevoked;
      record.ndaReminder = !!ndaReminder;
      record.dataAudit = !!dataAudit;
      record.clientTransfer = !!clientTransfer;
      record.postExitWatch = !!postExitWatch;
      record.finalSettlementStatus = finalSettlementStatus || "Pending";
      record.exitInterviewNotes = exitInterviewNotes || "";
      await record.save();
    } else {
      record = new ExitRecord({
        employee: employeeId,
        employeeName: employeeUser.name,
        companyName: companyName,
        role: employeeUser.role,
        exitReason,
        assetsReturned: !!assetsReturned,
        accessRevoked: !!accessRevoked,
        ndaReminder: !!ndaReminder,
        dataAudit: !!dataAudit,
        clientTransfer: !!clientTransfer,
        postExitWatch: !!postExitWatch,
        finalSettlementStatus: finalSettlementStatus || "Pending",
        exitInterviewNotes: exitInterviewNotes || "",
      });
      await record.save();
    }

    // Set employee status to "on notice"
    employeeUser.status = "on notice";
    await employeeUser.save();

    // Auto action: If IT access is revoked, toggle status or log it
    if (accessRevoked) {
      console.log(`[IT Integration] REVOKED enterprise workspace credentials for ${employeeUser.name} (${employeeUser.email})`);
    }

    await logAudit({
      userId: (session.user as any).id,
      action: "EXIT_RECORD_UPDATED",
      entity: "ExitRecord",
      entityId: record._id.toString(),
      details: `Exit checklist filed for employee ${employeeUser.name}. IT Revoked: ${!!accessRevoked}, Assets returned: ${!!assetsReturned}`,
    });

    return NextResponse.json({ success: true, data: record });
  } catch (error: any) {
    console.error("Exit action failed:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
