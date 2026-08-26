import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import sequelize from "@/lib/sequelize";
import User from "@/models/sequelize/User";
import Payroll from "@/models/sequelize/Payroll";
import EmployeeProfile from "@/models/sequelize/EmployeeProfile";

const payrollRoles = ["owner", "director", "hr head", "hr executive", "payroll executive", "accounts", "cfo", "it admin"];
const canManagePayroll = (role: unknown) => payrollRoles.includes(String(role || "").toLowerCase().trim());

// GET: Fetch Payslips
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !(session.user as any).id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    await sequelize.authenticate();
    await Payroll.sync().catch(() => {});

    const user = (session?.user as any);
    const userRole = (user?.role || "").toLowerCase();
    const requestedSelfScope = new URL(req.url).searchParams.get("scope") === "self";
    const isEmployeeOnly = requestedSelfScope || !canManagePayroll(userRole);
    
    // Employees see only their payslips, Managers/HR/Owners see all
    const filter = isEmployeeOnly ? { employee: String(user.id) } : {};

    const payslips = await Payroll.findAll({ 
      where: filter,
      order: [['year', 'DESC'], ['month', 'DESC']],
      raw: true
    });

    const userIds = payslips.map(p => String((p as any).employee)).filter(Boolean);
    const users = await User.findAll({
      where: { id: userIds },
      attributes: ['id', 'name', 'email'],
      raw: true
    });

    const profiles = await EmployeeProfile.findAll({
      where: { user: userIds },
      attributes: ['user', 'baseSalary'],
      raw: true
    });

    const profileMap = profiles.reduce((acc: any, p: any) => {
      if (p.user) acc[String(p.user)] = p.baseSalary;
      return acc;
    }, {});

    const userMap = users.reduce((acc: any, u: any) => {
      if (u.id) acc[String(u.id)] = { ...u, baseSalary: profileMap[String(u.id)] || 13000 };
      return acc;
    }, {});

    const data = payslips.map((p: any) => {
      const pJson = { ...p };
      pJson.employee = userMap[String(pJson.employee)] || null;
      return pJson;
    });

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("Error in GET /api/payroll:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Generate Payslip (Mock/Simplified)
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !(session.user as any).id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const userRole = ((session.user as any).role || "").toLowerCase();
    const canProcess = canManagePayroll(userRole);
    if (!canProcess) {
      return NextResponse.json({ success: false, error: "Unauthorized access for payroll processing" }, { status: 401 });
    }

    await sequelize.authenticate();
    await Payroll.sync().catch(() => {});

    const { employeeId, month, year, basicPay, hra, conveyance, specialAllowance, bonus, pfDeduction, esiDeduction, ptDeduction, tdsDeduction, lossOfPay } = await req.json();

    if (!employeeId || !month || !year) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }

    const existing = await Payroll.findOne({ where: { employee: String(employeeId), month, year: Number(year) } });
    if (existing) return NextResponse.json({ success: false, error: "Payroll has already been generated for this employee for the selected month" }, { status: 409 });

    const totalEarnings = Number(basicPay || 0) + Number(hra || 0) + Number(conveyance || 0) + Number(specialAllowance || 0) + Number(bonus || 0);
    const totalDeductions = Number(pfDeduction || 0) + Number(esiDeduction || 0) + Number(ptDeduction || 0) + Number(tdsDeduction || 0) + Number(lossOfPay || 0);
    const netPay = totalEarnings - totalDeductions;

    const payslip = await Payroll.create({
      id: `PAY-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      employee: String(employeeId),
      month,
      year: Number(year),
      basicPay: basicPay || 0,
      hra: hra || 0,
      conveyance: conveyance || 0,
      specialAllowance: specialAllowance || 0,
      bonus: bonus || 0,
      totalEarnings,
      pfDeduction: pfDeduction || 0,
      esiDeduction: esiDeduction || 0,
      ptDeduction: ptDeduction || 0,
      tdsDeduction: tdsDeduction || 0,
      lossOfPay: lossOfPay || 0,
      totalDeductions,
      netPay,
      status: "Processed"
    });

    return NextResponse.json({ success: true, data: payslip });
  } catch (error: any) {
    console.error("Error in POST /api/payroll:", error);
    if (error.code === "ER_DUP_ENTRY" || error.code === 11000) {
      return NextResponse.json({ success: false, error: "Payslip already generated for this month" }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT: Update payroll payment/workflow status
export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !canManagePayroll((session.user as any).role)) {
      return NextResponse.json({ success: false, error: "Unauthorized payroll action" }, { status: 401 });
    }
    const { id, status, paymentDate, transactionRef } = await req.json();
    const validStatuses = ["Draft", "HR Verified", "Accounts Approved", "Processed", "Paid", "Locked"];
    if (!id || !validStatuses.includes(status)) return NextResponse.json({ success: false, error: "Valid payroll id and status required" }, { status: 400 });
    await sequelize.authenticate();
    const payroll = await Payroll.findByPk(id);
    if (!payroll) return NextResponse.json({ success: false, error: "Payroll record not found" }, { status: 404 });
    payroll.status = status;
    if (paymentDate !== undefined) payroll.paymentDate = paymentDate ? new Date(paymentDate) : null;
    if (transactionRef !== undefined) payroll.transactionRef = transactionRef || null;
    await payroll.save();
    return NextResponse.json({ success: true, data: payroll });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || "Payroll update failed" }, { status: 500 });
  }
}

// DELETE: Delete a Payslip
export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !(session.user as any).id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const userRole = ((session.user as any).role || "").toLowerCase();
    const canDelete = canManagePayroll(userRole);
    if (!canDelete) {
      return NextResponse.json({ success: false, error: "Unauthorized access for payslip deletion" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, error: "Missing required id parameter" }, { status: 400 });
    }

    await sequelize.authenticate();
    await Payroll.sync().catch(() => {});

    const record = await Payroll.findByPk(id);
    if (record?.status === "Locked") return NextResponse.json({ success: false, error: "Locked payroll cannot be deleted" }, { status: 409 });

    const deletedCount = await Payroll.destroy({
      where: { id }
    });

    if (deletedCount === 0) {
      return NextResponse.json({ success: false, error: "Payslip not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Payslip deleted successfully" });
  } catch (error: any) {
    console.error("Error in DELETE /api/payroll:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
