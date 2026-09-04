import { NextResponse } from "next/server";
import { DataTypes } from "sequelize";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import LegalGuard from "@/models/sequelize/LegalGuard";
import SecurityProject from "@/models/sequelize/SecurityProject";
import { notifyOwners } from "@/lib/ownerNotification";

export const dynamic = "force-dynamic";
const STATUSES = ["Ongoing", "Stuck", "Completed"];

async function authorized() {
  const session: any = await getServerSession(authOptions);
  return session?.user ? session : null;
}

async function ready() {
  const queryInterface = SecurityProject.sequelize!.getQueryInterface();
  try {
    const columns = await queryInterface.describeTable("security_projects");
    if (!columns.sourceSecurityId) await queryInterface.addColumn("security_projects", "sourceSecurityId", { type: DataTypes.INTEGER, allowNull: true });
  } catch {
    await SecurityProject.sync();
    return;
  }
  await SecurityProject.sync();
}

export async function GET() {
  try {
    if (!await authorized()) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    await ready();
    const data = await SecurityProject.findAll({ order: [["siteStartedDate", "DESC"], ["id", "DESC"]], raw: true });
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || "Projects could not be loaded" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session: any = await authorized();
    if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    await ready();
    const body = await req.json();
    const guard = body.guardId ? await LegalGuard.findByPk(Number(body.guardId)) : null;
    if (!body.nbfcName || !String(body.siteName || "").trim() || !body.siteStartedDate || !guard) {
      return NextResponse.json({ success: false, error: "NBFC, site, start date and guard are required" }, { status: 400 });
    }
    const status = STATUSES.includes(body.status) ? body.status : "Ongoing";
    const data = await SecurityProject.create({
      nbfcId: body.nbfcId || null,
      nbfcName: body.nbfcName,
      siteName: String(body.siteName).trim(),
      siteStartedDate: body.siteStartedDate,
      guardId: guard.id,
      guardName: guard.name,
      contactNumber: guard.phone || "",
      status,
      createdBy: String(session.user.id || session.user.email || session.user.name || ""),
    });
    await notifyOwners({ title: `Security Project Started: ${body.nbfcName}`, message: `${guard.name} deployed at ${String(body.siteName).trim()} from ${body.siteStartedDate}. Status: ${status}.`, moduleName: "Security Projects", actionUrl: "/dashboard/security/projects", eventId: `security_project_${data.id}` });
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || "Project could not be saved" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    if (!await authorized()) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    await ready();
    const body = await req.json();
    const project = await SecurityProject.findByPk(Number(body.id));
    if (!project) return NextResponse.json({ success: false, error: "Project not found" }, { status: 404 });
    if (body.status !== undefined) {
      if (!STATUSES.includes(body.status)) return NextResponse.json({ success: false, error: "Invalid status" }, { status: 400 });
      await project.update({ status: body.status });
      await notifyOwners({ title: `Security Project ${body.status}`, message: `${project.nbfcName} / ${project.siteName} (${project.guardName}) status changed to ${body.status}.`, moduleName: "Security Projects", actionUrl: "/dashboard/security/projects", eventId: `security_project_status_${project.sourceSecurityId || project.id}_${body.status}` });
    }
    return NextResponse.json({ success: true, data: project });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || "Project could not be updated" }, { status: 500 });
  }
}
