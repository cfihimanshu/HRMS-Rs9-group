import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import sequelize from "@/lib/sequelize";
import Leave from "@/models/sequelize/Leave";
import EmployeeProfile from "@/models/sequelize/EmployeeProfile";
import { logAudit } from "@/lib/audit";
import { logHRActivity } from "@/lib/hrAudit";

import User from "@/models/sequelize/User";

// POST: Apply for a new leave
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !(session.user as any).id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    await sequelize.authenticate();
    const { type, startDate, endDate, days, reason } = await req.json();

    if (!type || !startDate || !endDate || !days || !reason) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }

    // Validate leave balances (if EmployeeProfile exists)
    const profile = await EmployeeProfile.findOne({ where: { user: (session.user as any).id } });
    if (profile) {
      const casualVal = (profile.get("leaveBalances.casualLeave") as number) || 0;
      const sickVal = (profile.get("leaveBalances.sickLeave") as number) || 0;
      const earnedVal = (profile.get("leaveBalances.earnedLeave") as number) || 0;

      const balance = type === "Casual Leave" ? casualVal :
        type === "Sick Leave" ? sickVal :
          type === "Earned Leave" ? earnedVal : 999;

      if (type !== "Unpaid Leave" && balance < days) {
        return NextResponse.json({ success: false, error: `Insufficient ${type} balance. (Available: ${balance})` }, { status: 400 });
      }
    }

    const leave = await Leave.create({
      mongo_id: Date.now().toString(),
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

    await sequelize.authenticate();

    // If user is Employee, show only their leaves. Otherwise, show all leaves (for HR/Manager)
    const filter = (session.user as any).role === "Employee" ? { employee: (session.user as any).id } : {};

    const leaves = await Leave.findAll({ 
      where: filter,
      order: [['createdAt', 'DESC']]
    });

    const userIds = Array.from(new Set([
      ...leaves.map(l => (l as any).employee).filter(Boolean),
      ...leaves.map(l => (l as any).approvedBy).filter(Boolean)
    ]));

    const users = await User.findAll({
      where: { mongo_id: userIds },
      attributes: ['mongo_id', 'name', 'email']
    });

    const userMap = users.reduce((acc: any, u: any) => {
      acc[u.mongo_id] = u.toJSON();
      return acc;
    }, {});

    const data = leaves.map(l => {
      const lJson = l.toJSON() as any;
      lJson.employee = userMap[lJson.employee] || null;
      lJson.approvedBy = userMap[lJson.approvedBy] || null;
      return lJson;
    });

    return NextResponse.json({ success: true, data });
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

    await sequelize.authenticate();
    const { leaveId, status, remarks } = await req.json();

    if (!leaveId || !status) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }

    const leave = await Leave.findByPk(leaveId);
    if (!leave) {
      return NextResponse.json({ success: false, error: "Leave request not found" }, { status: 404 });
    }

    if ((leave as any).status !== "Pending") {
      return NextResponse.json({ success: false, error: "Leave has already been processed" }, { status: 400 });
    }

    (leave as any).status = status;
    (leave as any).approvedBy = loggedInUserId;
    if (remarks) (leave as any).remarks = remarks;

    await leave.save();

    // Log Audit Entry
    await logAudit({
      userId: loggedInUserId,
      action: `${status.toUpperCase()}_LEAVE`,
      entity: "Leave",
      entityId: (leave as any).mongo_id,
      details: `Leave request for ${(leave as any).type} (${(leave as any).days} days) has been ${status.toLowerCase()} by HR / Supervisor.`
    });

    await logHRActivity({
      userId: loggedInUserId,
      userRole: loggedInUserRole,
      action: `${status.toUpperCase()}_LEAVE`,
      details: `Leave request for ${(leave as any).type} (${(leave as any).days} days) has been ${status.toLowerCase()} by HR / Supervisor.`
    });

    // If approved, deduct leave balance
    if (status === "Approved") {
      const profile = await EmployeeProfile.findOne({ where: { user: (leave as any).employee } });
      if (profile) {
        if ((leave as any).type === "Casual Leave") {
          const balance = (profile.get("leaveBalances.casualLeave") as number) || 0;
          profile.set("leaveBalances.casualLeave", Math.max(0, balance - (leave as any).days));
        } else if ((leave as any).type === "Sick Leave") {
          const balance = (profile.get("leaveBalances.sickLeave") as number) || 0;
          profile.set("leaveBalances.sickLeave", Math.max(0, balance - (leave as any).days));
        } else if ((leave as any).type === "Earned Leave") {
          const balance = (profile.get("leaveBalances.earnedLeave") as number) || 0;
          profile.set("leaveBalances.earnedLeave", Math.max(0, balance - (leave as any).days));
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
