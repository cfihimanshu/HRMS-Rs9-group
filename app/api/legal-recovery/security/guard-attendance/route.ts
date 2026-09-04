import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { DataTypes, Op } from "sequelize";
import { authOptions } from "@/lib/auth";
import LegalGuard from "@/models/sequelize/LegalGuard";
import LegalSecurity from "@/models/sequelize/LegalSecurity";
import SecurityGuardAttendance from "@/models/sequelize/SecurityGuardAttendance";

export const dynamic = "force-dynamic";

const STATUS_UNITS: Record<string, number> = {
  Present: 1,
  "Half Day": 0.5,
  "Paid Leave": 1,
  Absent: 0,
  "Weekly Off": 0,
};

const indiaDate = () => new Date(Date.now() + 330 * 60 * 1000).toISOString().slice(0, 10);
const presentIsLocked = (attendanceDate: string, status: string) => {
  if (status !== "Present") return false;
  const [year, month] = attendanceDate.slice(0, 7).split("-").map(Number);
  const monthEnd = `${attendanceDate.slice(0, 7)}-${String(new Date(year, month, 0).getDate()).padStart(2, "0")}`;
  return indiaDate() < monthEnd;
};

async function ready() {
  await SecurityGuardAttendance.sync();
  const queryInterface = SecurityGuardAttendance.sequelize!.getQueryInterface();
  const columns = await queryInterface.describeTable("security_guard_attendance");
  if (!columns.replacementGuardId) await queryInterface.addColumn("security_guard_attendance", "replacementGuardId", { type: DataTypes.INTEGER, allowNull: true });
  if (!columns.replacementGuardName) await queryInterface.addColumn("security_guard_attendance", "replacementGuardName", { type: DataTypes.STRING, allowNull: true });
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    await ready();
    const params = new URL(req.url).searchParams;
    const month = params.get("month") || new Date().toISOString().slice(0, 7);
    const start = `${month}-01`;
    const endDate = new Date(`${month}-01T00:00:00Z`);
    endDate.setUTCMonth(endDate.getUTCMonth() + 1);
    const where: any = { attendanceDate: { [Op.gte]: start, [Op.lt]: endDate.toISOString().slice(0, 10) } };
    if (params.get("securityId")) where.securityId = Number(params.get("securityId"));
    if (params.get("guardId")) where.guardId = Number(params.get("guardId"));
    const data = await SecurityGuardAttendance.findAll({ where, order: [["attendanceDate", "DESC"], ["guardName", "ASC"]], raw: true });
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("[security guard attendance GET]", error);
    return NextResponse.json({ success: false, error: error.message || "Unable to load attendance" }, { status: 500 });
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
    const status = String(body.status || "Present");
    const perDayRate = Number(body.perDayRate || 0);
    if (!securityId || !guardId || !body.attendanceDate) {
      return NextResponse.json({ success: false, error: "NBFC site, guard and attendance date are required" }, { status: 400 });
    }
    if (!(status in STATUS_UNITS) || perDayRate < 0) {
      return NextResponse.json({ success: false, error: "Invalid attendance status or daily rate" }, { status: 400 });
    }
    const replacementGuardId = body.replacementGuardId ? Number(body.replacementGuardId) : null;
    const [site, guard, replacementGuard] = await Promise.all([
      LegalSecurity.findByPk(securityId),
      LegalGuard.findByPk(guardId),
      replacementGuardId ? LegalGuard.findByPk(replacementGuardId) : Promise.resolve(null),
    ]);
    if (!site || !guard) return NextResponse.json({ success: false, error: "Selected site or guard no longer exists" }, { status: 404 });
    if (status === "Absent" && replacementGuardId && (!replacementGuard || replacementGuardId === guardId)) {
      return NextResponse.json({ success: false, error: "Please select a valid replacement guard" }, { status: 400 });
    }
    const payableUnits = STATUS_UNITS[status];
    const values = {
      securityId,
      nbfcId: site.nbfcId || null,
      nbfcName: site.nbfcName || "NBFC",
      branchId: site.branchId || null,
      branchName: site.branchName || null,
      siteLocation: site.location || null,
      guardId,
      guardName: guard.name,
      guardPhone: guard.phone || null,
      replacementGuardId: status === "Absent" ? replacementGuard?.id || null : null,
      replacementGuardName: status === "Absent" ? replacementGuard?.name || null : null,
      attendanceDate: body.attendanceDate,
      status,
      payableUnits,
      perDayRate,
      payoutAmount: Number((perDayRate * payableUnits).toFixed(2)),
      remarks: String(body.remarks || "").trim() || null,
      markedBy: String(session.user.id || session.user.email || session.user.name || ""),
    };
    const existing = await SecurityGuardAttendance.findOne({ where: { securityId, guardId, attendanceDate: body.attendanceDate } });
    if (existing && presentIsLocked(String(existing.attendanceDate), String(existing.status))) {
      return NextResponse.json({ success: false, error: "Present attendance month-end tak locked hai" }, { status: 423 });
    }
    const existingReplacement = status === "Absent" && replacementGuard
      ? await SecurityGuardAttendance.findOne({ where: { securityId, guardId: replacementGuard.id, attendanceDate: body.attendanceDate } })
      : null;
    if (existingReplacement && presentIsLocked(String(existingReplacement.attendanceDate), String(existingReplacement.status))) {
      return NextResponse.json({ success: false, error: `${replacementGuard!.name} ki Present attendance month-end tak locked hai` }, { status: 423 });
    }
    const record = existing ? await existing.update(values) : await SecurityGuardAttendance.create(values);
    let replacementRecord = null;
    if (status === "Absent" && replacementGuard) {
      const replacementRate = Number(replacementGuard.monthlySalary || 0) > 0
        ? Number(replacementGuard.monthlySalary) / new Date(Number(String(body.attendanceDate).slice(0, 4)), Number(String(body.attendanceDate).slice(5, 7)), 0).getDate()
        : perDayRate;
      const replacementValues = {
        securityId,
        nbfcId: site.nbfcId || null,
        nbfcName: site.nbfcName || "NBFC",
        branchId: site.branchId || null,
        branchName: site.branchName || null,
        siteLocation: site.location || null,
        guardId: replacementGuard.id,
        guardName: replacementGuard.name,
        guardPhone: replacementGuard.phone || null,
        replacementGuardId: null,
        replacementGuardName: null,
        attendanceDate: body.attendanceDate,
        status: "Present",
        payableUnits: 1,
        perDayRate: Number(replacementRate.toFixed(2)),
        payoutAmount: Number(replacementRate.toFixed(2)),
        remarks: `Replacement duty for ${guard.name}${body.remarks ? ` · ${String(body.remarks).trim()}` : ""}`,
        markedBy: String(session.user.id || session.user.email || session.user.name || ""),
      };
      replacementRecord = existingReplacement ? await existingReplacement.update(replacementValues) : await SecurityGuardAttendance.create(replacementValues);
    }
    return NextResponse.json({ success: true, data: record, replacementData: replacementRecord, updated: Boolean(existing) });
  } catch (error: any) {
    console.error("[security guard attendance POST]", error);
    return NextResponse.json({ success: false, error: error.message || "Unable to save attendance" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    await ready();
    const id = Number(new URL(req.url).searchParams.get("id"));
    if (!id) return NextResponse.json({ success: false, error: "Attendance ID is required" }, { status: 400 });
    await SecurityGuardAttendance.destroy({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || "Unable to delete attendance" }, { status: 500 });
  }
}
