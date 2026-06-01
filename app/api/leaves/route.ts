import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/react";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/lib/dbConnect";
import Leave from "@/models/Leave";
import EmployeeProfile from "@/models/EmployeeProfile";

// POST: Apply for a new leave
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    const { type, startDate, endDate, days, reason } = await req.json();

    if (!type || !startDate || !endDate || !days || !reason) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }

    // Optional: Validate leave balances (if EmployeeProfile exists)
    const profile = await EmployeeProfile.findOne({ user: session.user.id });
    if (profile) {
      const balance = type === "Casual Leave" ? profile.leaveBalances.casualLeave :
                      type === "Sick Leave" ? profile.leaveBalances.sickLeave :
                      type === "Earned Leave" ? profile.leaveBalances.earnedLeave : 999;
      
      if (type !== "Unpaid Leave" && balance < days) {
        return NextResponse.json({ success: false, error: `Insufficient ${type} balance. (Available: ${balance})` }, { status: 400 });
      }
    }

    const leave = await Leave.create({
      employee: session.user.id,
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
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    
    // If user is Employee, show only their leaves. Otherwise, show all leaves (for HR/Manager)
    const filter = session.user.role === "Employee" ? { employee: session.user.id } : {};
    
    const leaves = await Leave.find(filter)
      .populate("employee", "name email")
      .populate("approvedBy", "name")
      .sort({ createdAt: -1 });

    return NextResponse.json({ success: true, data: leaves });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
