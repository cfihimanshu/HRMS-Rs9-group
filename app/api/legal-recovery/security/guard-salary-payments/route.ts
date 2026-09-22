import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import SecurityGuardSalaryPayment from "@/models/sequelize/SecurityGuardSalaryPayment";

export const dynamic = "force-dynamic";

async function ready() {
  await SecurityGuardSalaryPayment.sync();
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    await ready();
    const params = new URL(req.url).searchParams;
    const where: any = {};
    if (params.get("month")) where.salaryMonth = params.get("month");
    if (params.get("securityId")) where.securityId = Number(params.get("securityId"));
    if (params.get("guardId")) where.guardId = Number(params.get("guardId"));
    const data = await SecurityGuardSalaryPayment.findAll({ where, order: [["paymentDate", "DESC"], ["id", "DESC"]], raw: true });
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || "Guard salary payments load nahi hue" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session: any = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    await ready();
    const body = await req.json();
    const paidAmount = Number(body.paidAmount || 0);
    if (!body.securityId || !body.guardId || !body.salaryMonth || paidAmount <= 0) {
      return NextResponse.json({ success: false, error: "Site, guard, month aur paid amount required hai" }, { status: 400 });
    }
    const data = await SecurityGuardSalaryPayment.create({
      securityId: Number(body.securityId),
      projectId: body.projectId ? Number(body.projectId) : null,
      guardId: Number(body.guardId),
      guardName: String(body.guardName || ""),
      nbfcName: String(body.nbfcName || ""),
      siteName: String(body.siteName || ""),
      salaryMonth: String(body.salaryMonth),
      payableAmount: Math.max(0, Number(body.payableAmount || 0)),
      paidAmount,
      paymentDate: body.paymentDate || new Date().toISOString().slice(0, 10),
      paymentMode: String(body.paymentMode || "Cash"),
      transactionId: String(body.transactionId || ""),
      remarks: String(body.remarks || ""),
      paidBy: String(session.user.id || session.user.email || session.user.name || ""),
    });
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || "Guard salary payment save nahi hui" }, { status: 500 });
  }
}
