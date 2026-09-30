import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import SecurityGuardMonthlySalary from "@/models/sequelize/SecurityGuardMonthlySalary";

export const dynamic = "force-dynamic";

async function ready() {
  await SecurityGuardMonthlySalary.sync();
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
    if (params.get("projectId")) where.projectId = Number(params.get("projectId"));
    const data = await SecurityGuardMonthlySalary.findAll({ where, order: [["salaryMonth", "DESC"], ["id", "DESC"]], raw: true });
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || "Guard monthly salary load nahi hui" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session: any = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    await ready();
    const body = await req.json();
    const securityId = Number(body.securityId);
    const guardId = Number(body.guardId);
    const projectId = body.projectId ? Number(body.projectId) : null;
    const monthlySalary = Number(body.monthlySalary || 0);
    const salaryMonth = String(body.salaryMonth || "");
    if (!securityId || !guardId || !salaryMonth || !Number.isFinite(monthlySalary) || monthlySalary < 0) {
      return NextResponse.json({ success: false, error: "Site, guard, month aur valid monthly salary required hai" }, { status: 400 });
    }
    const values = {
      securityId,
      projectId,
      guardId,
      guardName: String(body.guardName || ""),
      nbfcName: String(body.nbfcName || ""),
      siteName: String(body.siteName || ""),
      salaryMonth,
      monthlySalary,
      savedBy: String(session.user.id || session.user.email || session.user.name || ""),
    };
    const where = { securityId, projectId, guardId, salaryMonth };
    const existing = await SecurityGuardMonthlySalary.findOne({ where });
    const data = existing ? await existing.update(values) : await SecurityGuardMonthlySalary.create(values);
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || "Guard monthly salary save nahi hui" }, { status: 500 });
  }
}
