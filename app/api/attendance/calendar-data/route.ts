import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/db";
import Company from "@/models/Company";
import User from "@/models/User";
import Attendance from "@/models/Attendance";
import Leave from "@/models/Leave";
import SodReport from "@/models/SodReport";
import EodReport from "@/models/EodReport";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const targetUserId = searchParams.get("userId");

    await dbConnect();

    const loggedInUserRole = (session.user as any).role;
    const loggedInUserId = (session.user as any).id;

    // Check permissions
    const isPrivileged = ["Owner", "Director", "HR Head", "HR Executive", "Department Manager"].includes(loggedInUserRole);

    // If targetUserId is provided, fetch calendar details for that user
    if (targetUserId) {
      // Security check: non-privileged users can only view their own calendar
      if (!isPrivileged && targetUserId !== loggedInUserId) {
        return NextResponse.json({ success: false, error: "Access Denied" }, { status: 403 });
      }

      // Fetch attendance, leaves, and SOD/EOD reports for this user
      const attendance = await Attendance.find({ employee: targetUserId });
      const leaves = await Leave.find({ employee: targetUserId, status: "Approved" });
      const sods = await SodReport.find({ employee: targetUserId });
      const eods = await EodReport.find({ employee: targetUserId });

      return NextResponse.json({
        success: true,
        data: {
          attendance,
          leaves,
          sods,
          eods,
        },
      });
    }

    // Otherwise, fetch metadata (Companies and Users list)
    // Privileged users get the whole list, non-privileged get only their own user record
    let companies = [];
    let users = [];

    if (isPrivileged) {
      companies = await Company.find({ status: "active" });
      users = await User.find({ status: "active" }).select("name email role companies");
    } else {
      // Find logged-in user details
      const selfUser = await User.findById(loggedInUserId).select("name email role companies");
      if (selfUser) {
        users = [selfUser];
        companies = await Company.find({ _id: { $in: selfUser.companies }, status: "active" });
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        companies,
        users,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
