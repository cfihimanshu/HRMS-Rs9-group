import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/db";
import Leave from "@/models/Leave";
import EmployeeProfile from "@/models/EmployeeProfile";
import { logAudit } from "@/lib/audit";
import { logHRActivity } from "@/lib/hrAudit";

// POST: Apply for a new leave
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !(session.user as any).id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    const { type, startDate, endDate, days, reason } = await req.json();

    if (!type || !startDate || !endDate || !days || !reason) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }

    // Optional: Validate leave balances (if EmployeeProfile exists)
    const profile = await EmployeeProfile.findOne({ user: (session.user as any).id });
    if (profile) {
      const balance = type === "Casual Leave" ? profile.leaveBalances.casualLeave :
        type === "Sick Leave" ? profile.leaveBalances.sickLeave :
          type === "Earned Leave" ? profile.leaveBalances.earnedLeave : 999;

      if (type !== "Unpaid Leave" && balance < days) {
        return NextResponse.json({ success: false, error: `Insufficient ${type} balance. (Available: ${balance})` }, { status: 400 });
      }
    }

    const leave = await Leave.create({
      employee: (session.user as any).id,
      type,
      startDate,
      endDate,
      days,
      reason,
      status: "Pending"
    });

    return NextResponse.json({ success: true, data: leave });
  } catch (error: any) {
    console.error("Leave creation error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// GET: Fetch leave history
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !(session.user as any).id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    // If user is Employee, show only their leaves. Otherwise, show all leaves (for HR/Manager)
    const filter = (session.user as any).role === "Employee" ? { employee: (session.user as any).id } : {};

    const leaves = await Leave.find(filter)
      .populate("employee", "name email")
      .populate("approvedBy", "name")
      .sort({ createdAt: -1 });

    return NextResponse.json({ success: true, data: leaves });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT: Update leave status (Approve / Reject)
export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const loggedInUserRole = (session.user as any).role;
    const loggedInUserId = (session.user as any).id;

    // Only Owner, Director, HR roles can approve/reject leaves
    const isPrivileged = ["Owner", "Director", "HR Head", "HR Executive"].includes(loggedInUserRole);
    if (!isPrivileged) {
      return NextResponse.json({ success: false, error: "Access Denied" }, { status: 403 });
    }

    await dbConnect();
    const { leaveId, status, remarks } = await req.json();

    if (!leaveId || !status) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }

    const leave = await Leave.findById(leaveId);
    if (!leave) {
      return NextResponse.json({ success: false, error: "Leave request not found" }, { status: 404 });
    }

    if (leave.status !== "Pending") {
      return NextResponse.json({ success: false, error: "Leave has already been processed" }, { status: 400 });
    }

    leave.status = status;
    leave.approvedBy = loggedInUserId;
    if (remarks) leave.remarks = remarks;

    await leave.save();

    // Log Audit Entry
    await logAudit({
      userId: loggedInUserId,
      action: `${status.toUpperCase()}_LEAVE`,
      entity: "Leave",
      entityId: leave._id.toString(),
      details: `Leave request for ${leave.type} (${leave.days} days) has been ${status.toLowerCase()} by HR / Supervisor.`
    });

    await logHRActivity({
      userId: loggedInUserId,
      userRole: loggedInUserRole,
      action: `${status.toUpperCase()}_LEAVE`,
      details: `Leave request for ${leave.type} (${leave.days} days) has been ${status.toLowerCase()} by HR / Supervisor.`
    });

    // If approved, deduct leave balance
    if (status === "Approved") {
      const profile = await EmployeeProfile.findOne({ user: leave.employee });
      if (profile) {
        if (leave.type === "Casual Leave") {
          profile.leaveBalances.casualLeave = Math.max(0, profile.leaveBalances.casualLeave - leave.days);
        } else if (leave.type === "Sick Leave") {
          profile.leaveBalances.sickLeave = Math.max(0, profile.leaveBalances.sickLeave - leave.days);
        } else if (leave.type === "Earned Leave") {
          profile.leaveBalances.earnedLeave = Math.max(0, profile.leaveBalances.earnedLeave - leave.days);
        }
        await profile.save();
      }
    }

    return NextResponse.json({ success: true, data: leave });
  } catch (error: any) {
    console.error("Leave update error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
