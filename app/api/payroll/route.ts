import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import sequelize from "@/lib/sequelize";
import User from "@/models/sequelize/User";
import Payroll from "@/models/sequelize/Payroll";

// GET: Fetch Payslips
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !(session.user as any).id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    await sequelize.authenticate();

    const user = (session?.user as any);
    // Employees see only their payslips, HR sees all
    const filter = (session.user as any).role === "Employee" ? { employee: (session.user as any).id } : {};

    const payslips = await Payroll.findAll({ 
      where: filter,
      order: [['year', 'DESC'], ['month', 'DESC']]
    });

    const userIds = payslips.map(p => (p as any).employee).filter(Boolean);
    const users = await User.findAll({
      where: { mongo_id: userIds },
      attributes: ['mongo_id', 'name', 'email']
    });

    const userMap = users.reduce((acc: any, u: any) => {
      acc[u.mongo_id] = u.toJSON();
      return acc;
    }, {});

    const data = payslips.map(p => {
      const pJson = p.toJSON() as any;
      pJson.employee = userMap[pJson.employee] || null;
      return pJson;
    });

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Generate Payslip (Mock/Simplified)
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !(session.user as any).id || !["Owner", "HR Head", "Accounts"].includes((session.user as any).role)) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    await sequelize.authenticate();
    const { employeeId, month, year, basicPay, hra, conveyance, specialAllowance, pfDeduction, ptDeduction, tdsDeduction } = await req.json();

    if (!employeeId || !month || !year) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }

    const totalEarnings = (basicPay || 0) + (hra || 0) + (conveyance || 0) + (specialAllowance || 0);
    const totalDeductions = (pfDeduction || 0) + (ptDeduction || 0) + (tdsDeduction || 0);
    const netPay = totalEarnings - totalDeductions;

    const payslip = await Payroll.create({
      mongo_id: Date.now().toString(),
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
    if (error.code === "ER_DUP_ENTRY" || error.code === 11000) {
      return NextResponse.json({ success: false, error: "Payslip already generated for this month" }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
