import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import sequelize from "@/lib/sequelize";
import User from "@/models/sequelize/User";
import Payroll from "@/models/sequelize/Payroll";
import EmployeeProfile from "@/models/sequelize/EmployeeProfile";

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
    const isEmployeeOnly = userRole === "employee";
    
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
    const canProcess = userRole.includes("owner") || userRole.includes("director") || userRole.includes("hr") || userRole.includes("accounts") || userRole.includes("admin") || userRole.includes("cfo") || userRole.includes("manager");
    if (!canProcess) {
      return NextResponse.json({ success: false, error: "Unauthorized access for payroll processing" }, { status: 401 });
    }

    await sequelize.authenticate();
    await Payroll.sync().catch(() => {});

    const { employeeId, month, year, basicPay, hra, conveyance, specialAllowance, pfDeduction, ptDeduction, tdsDeduction } = await req.json();

    if (!employeeId || !month || !year) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }

    const totalEarnings = (basicPay || 0) + (hra || 0) + (conveyance || 0) + (specialAllowance || 0);
    const totalDeductions = (pfDeduction || 0) + (ptDeduction || 0) + (tdsDeduction || 0);
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
    console.error("Error in POST /api/payroll:", error);
    if (error.code === "ER_DUP_ENTRY" || error.code === 11000) {
      return NextResponse.json({ success: false, error: "Payslip already generated for this month" }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
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
    const canDelete = userRole.includes("owner") || userRole.includes("director") || userRole.includes("hr") || userRole.includes("accounts") || userRole.includes("admin") || userRole.includes("cfo") || userRole.includes("manager");
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
