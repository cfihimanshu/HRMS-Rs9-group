import { NextResponse } from "next/server";
import { DataTypes } from "sequelize";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import LegalGuard from "@/models/sequelize/LegalGuard";
import LegalSecurity from "@/models/sequelize/LegalSecurity";
import SecurityProject from "@/models/sequelize/SecurityProject";
import SecurityGuardAttendance from "@/models/sequelize/SecurityGuardAttendance";
import { notifyOwners } from "@/lib/ownerNotification";
import { isOwnerUser } from "@/lib/twoStageApproval";

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
    if (!columns.monthlySalary) await queryInterface.addColumn("security_projects", "monthlySalary", { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 });
  } catch {
    await SecurityProject.sync();
    await LegalSecurity.sync();
    return;
  }
  await SecurityProject.sync();
  await LegalSecurity.sync();
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
    const requestedGuards = Array.isArray(body.guards) && body.guards.length ? body.guards : [{ guardId: body.guardId, monthlySalary: body.monthlySalary }];
    if (!body.nbfcName || !String(body.siteName || "").trim() || !body.siteStartedDate || !requestedGuards.length) {
      return NextResponse.json({ success: false, error: "NBFC, site, start date and guard are required" }, { status: 400 });
    }
    const guards = [];
    for (const item of requestedGuards) {
      let guard = item.guardId ? await LegalGuard.findByPk(Number(item.guardId)) : null;
      const name = String(item.name || "").trim();
      if (!guard && name) {
        const [createdGuard] = await LegalGuard.findOrCreate({
          where: { name },
          defaults: {
            name,
            phone: String(item.phone || "").trim(),
            monthlySalary: Math.max(0, Number(item.monthlySalary) || 0),
            status: "Active",
          },
        });
        guard = createdGuard;
      }
      if (!guard) continue;
      const monthlySalary = Math.max(0, Number(item.monthlySalary) || 0);
      if (item.phone) {
        await guard.update({
          phone: String(item.phone || "").trim(),
          status: "Active",
        });
      }
      guards.push({ guard, monthlySalary });
    }
    if (!guards.length) return NextResponse.json({ success: false, error: "Please select or add at least one valid guard" }, { status: 400 });
    const status = STATUSES.includes(body.status) ? body.status : "Ongoing";
    let sourceSecurityId = body.sourceSecurityId ? Number(body.sourceSecurityId) : null;
    if (!sourceSecurityId) {
      const guardDetails = guards.map(({ guard }) => ({ name: guard.name, phone: guard.phone || "", startDate: body.siteStartedDate }));
      const securitySite = await LegalSecurity.create({
        company: body.nbfcName,
        nbfcId: body.nbfcId || null,
        nbfcName: body.nbfcName,
        location: String(body.siteName).trim(),
        guardName: guards[0].guard.name,
        guardPhone: guards[0].guard.phone || "",
        guardDetailsJson: JSON.stringify(guardDetails),
        workflowStage: "guard_deployment",
        workflowJson: JSON.stringify({ guard_deployment: { status: "completed", date: body.siteStartedDate } }),
        createdBy: String(session.user.id || session.user.email || session.user.name || ""),
        source: "manual_project_entry",
      });
      sourceSecurityId = securitySite.id;
    }
    const createdProjects = [];
    for (const { guard, monthlySalary } of guards) {
      const existing = await SecurityProject.findOne({ where: { sourceSecurityId, guardId: guard.id } });
      const values = {
      sourceSecurityId,
      nbfcId: body.nbfcId || null,
      nbfcName: body.nbfcName,
      siteName: String(body.siteName).trim(),
      siteStartedDate: body.siteStartedDate,
      guardId: guard.id,
      guardName: guard.name,
      contactNumber: guard.phone || "",
      monthlySalary,
      status,
      createdBy: String(session.user.id || session.user.email || session.user.name || ""),
      };
      createdProjects.push(existing ? await existing.update(values) : await SecurityProject.create(values));
    }
    await notifyOwners({ title: `Security Project Started: ${body.nbfcName}`, message: `${guards.map(item => item.guard.name).join(", ")} deployed at ${String(body.siteName).trim()} from ${body.siteStartedDate}. Status: ${status}.`, moduleName: "Security Projects", actionUrl: "/dashboard/security/projects", eventId: `security_project_${sourceSecurityId}_${Date.now()}` });
    return NextResponse.json({ success: true, data: createdProjects[0], projects: createdProjects });
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

export async function DELETE(req: Request) {
  try {
    const session: any = await authorized();
    if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    if (!isOwnerUser(session.user)) return NextResponse.json({ success: false, error: "Sirf Owner deployment delete kar sakta hai" }, { status: 403 });
    await ready();
    const params = new URL(req.url).searchParams;
    const ids = (params.get("id") || params.get("ids") || "")
      .split(",")
      .map(value => Number(value.trim()))
      .filter(Boolean);
    if (!ids.length) return NextResponse.json({ success: false, error: "Deployment ID is required" }, { status: 400 });
    const projects = await SecurityProject.findAll({ where: { id: ids } });
    if (!projects.length) return NextResponse.json({ success: false, error: "Deployment not found" }, { status: 404 });
    let removedAttendance = 0;
    for (const project of projects) {
      if (project.guardId) {
        removedAttendance += await SecurityGuardAttendance.destroy({
          where: {
            guardId: project.guardId,
            ...(project.sourceSecurityId ? { securityId: project.sourceSecurityId } : {}),
          },
        });
      }
    }
    const removed = await SecurityProject.destroy({ where: { id: projects.map(project => project.id) } });
    return NextResponse.json({ success: true, removed, removedAttendance });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || "Deployment could not be deleted" }, { status: 500 });
  }
}
