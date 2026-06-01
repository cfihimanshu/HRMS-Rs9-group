import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/react";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/lib/dbConnect";
import Payroll from "@/models/Payroll";

// GET: Fetch Payslips
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    // Employees see only their payslips, HR sees all
    const filter = session.user.role === "Employee" ? { employee: session.user.id } : {};
    
    const payslips = await Payroll.find(filter)
      .populate("employee", "name email")
      .sort({ year: -1, month: -1 });

    return NextResponse.json({ success: true, data: payslips });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Generate Payslip (Mock/Simplified)
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !["Owner", "HR Head", "Accounts"].includes(session.user.role)) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    const { employeeId, month, year, basicPay, hra, conveyance, specialAllowance, pfDeduction, ptDeduction, tdsDeduction } = await req.json();

    if (!employeeId || !month || !year) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }

    const totalEarnings = (basicPay || 0) + (hra || 0) + (conveyance || 0) + (specialAllowance || 0);
    const totalDeductions = (pfDeduction || 0) + (ptDeduction || 0) + (tdsDeduction || 0);
    const netPay = totalEarnings - totalDeductions;

    const payslip = await Payroll.create({
      employee: employeeId,
      month,
      year,
      basicPay: basicPay || 0,
      hra: hra || 0,
      conveyance: conveyance || 0,
      specialAllowance: specialAllowance || 0,
      totalEarnings,
      pfDeduction: pfDeduction || 0,
      esiDeduction: 0,
      ptDeduction: ptDeduction || 0,
      tdsDeduction: tdsDeduction || 0,
      totalDeductions,
      netPay,
      status: "Processed"
    });

    return NextResponse.json({ success: true, data: payslip });
  } catch (error: any) {
    if (error.code === 11000) {
      return NextResponse.json({ success: false, error: "Payslip already generated for this month" }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
