import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { getServerSession } from "next-auth";
import { DataTypes } from "sequelize";
import { authOptions } from "@/lib/auth";
import sequelize from "@/lib/sequelize";
import LegalSecurity from "@/models/sequelize/LegalSecurity";
import LegalGuard from "@/models/sequelize/LegalGuard";
import SecurityProject from "@/models/sequelize/SecurityProject";
import TaskLog from "@/models/sequelize/TaskLog";
import { notifyOwners } from "@/lib/ownerNotification";

const WORKFLOW_STAGE_LABELS: Record<string, string> = {
  bank_visit: "Bank Visit & Discussion",
  quotation: "Quotation Submitted",
  rate_meeting: "Rate Decision Meeting",
  work_order: "Work Order Received",
  agreement: "Agreement Signed",
  notary: "Notary Completed",
  authority_letter: "Site Authority Letter",
  guard_deployment: "Guards Deployed",
  billing: "Bill Generated",
  payment_followup: "Payment Follow-up",
};

const parseJsonObject = (value: unknown) => {
  if (!value) return {} as Record<string, any>;
  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, any> : {};
  } catch {
    return {} as Record<string, any>;
  }
};

const uniq = (values: unknown[]) => [...new Set(values.filter((value): value is string => typeof value === "string" && Boolean(value.trim())).map((value) => value.trim()))];

async function syncGuardDeploymentProjects(record: any, actorId: string) {
  const workflow = parseJsonObject(record.workflowJson);
  const deployment = workflow.guard_deployment || {};
  let deployedGuards: any[] = [];
  try {
    const parsed = typeof record.guardDetailsJson === "string" ? JSON.parse(record.guardDetailsJson || "[]") : record.guardDetailsJson;
    if (Array.isArray(parsed)) deployedGuards = parsed.filter((guard: any) => guard?.name);
  } catch { deployedGuards = []; }
  if (record.guardName && !deployedGuards.some((guard: any) => String(guard.name).trim().toLowerCase() === String(record.guardName).trim().toLowerCase())) {
    deployedGuards.unshift({ name: record.guardName, phone: record.guardPhone, startDate: deployment.date });
  }
  if (!deployedGuards.length) return;

  const queryInterface = sequelize.getQueryInterface();
  try {
    const columns = await queryInterface.describeTable("security_projects");
    if (!columns.sourceSecurityId) await queryInterface.addColumn("security_projects", "sourceSecurityId", { type: DataTypes.INTEGER, allowNull: true });
  } catch {
    await SecurityProject.sync();
  }
  await SecurityProject.sync();
  await LegalGuard.sync();
  const projectStatus = deployment.status === "completed" ? "Completed" : deployment.status === "rejected" ? "Stuck" : "Ongoing";
  const fallbackDate = deployment.date || new Date().toISOString().slice(0, 10);
  for (const deployed of deployedGuards) {
    const name = String(deployed.name || "").trim();
    if (!name) continue;
    const guard = await LegalGuard.findOne({ where: { name } });
    const values = {
      sourceSecurityId: record.id,
      nbfcId: record.nbfcId || null,
      nbfcName: record.nbfcName || "NBFC",
      siteName: record.location || record.branchName || "Security Site",
      siteStartedDate: deployed.startDate || fallbackDate,
      guardId: guard?.id || null,
      guardName: guard?.name || name,
      contactNumber: guard?.phone || deployed.phone || "",
      status: projectStatus,
      createdBy: actorId,
    };
    const existing = await SecurityProject.findOne({ where: guard?.id
      ? { sourceSecurityId: record.id, guardId: guard.id }
      : { sourceSecurityId: record.id, guardName: name } });
    if (existing) await existing.update(values);
    else await SecurityProject.create(values);
  }
}

async function notifyWorkflowChanges(record: any, previousWorkflowValue: unknown, actorName: string, eventPrefix: string) {
  const previous = parseJsonObject(previousWorkflowValue);
  const current = parseJsonObject(record.workflowJson);
  const hasStageActivity = (stageKey: string, stage: any) => {
    const followUps = Array.isArray(stage?.followUps) ? stage.followUps : [];
    return stage?.status === "in_progress" || stage?.status === "completed" || stage?.status === "rejected" ||
      Boolean(String(stage?.notes || "").trim()) || (Array.isArray(stage?.proofUrls) && stage.proofUrls.length > 0) || followUps.length > 0 ||
      (stageKey === "billing" && Boolean(record.billNo || record.billInvoiceUrl));
  };
  const changes = Object.entries(WORKFLOW_STAGE_LABELS).filter(([key]) =>
    JSON.stringify(previous[key] || {}) !== JSON.stringify(current[key] || {}) &&
    (hasStageActivity(key, previous[key]) || hasStageActivity(key, current[key]))
  );
  for (const [stageKey, label] of changes) {
    const stage = current[stageKey] || {};
    const proofCount = uniq([
      ...(Array.isArray(stage.proofUrls) ? stage.proofUrls : []),
      ...(Array.isArray(stage.followUps) ? stage.followUps.flatMap((entry: any) => Array.isArray(entry.proofUrls) ? entry.proofUrls : []) : []),
      ...(stageKey === "billing" ? [record.billInvoiceUrl] : []),
    ]).length;
    const status = String(stage.status || "pending").replaceAll("_", " ");
    const message = `${actorName} updated ${label} for ${record.company || "Security"} / ${record.nbfcName || "Bank"}${record.branchName ? ` / ${record.branchName}` : ""}${record.agentName ? ` / Agent: ${record.agentName}` : ""}. Status: ${status}. Proofs: ${proofCount}.`;
    await notifyOwners({
      title: `Security Workflow: ${label}`,
      message,
      moduleName: "Security Management",
      actionUrl: "/dashboard/security",
      eventId: `${eventPrefix}_${stageKey}`,
    });
  }
}

async function syncWorkflowTasks(record: any, actorId: string, actorName: string) {
  const workflow = parseJsonObject(record.workflowJson);
  if (!Object.keys(workflow).length) return;

  await TaskLog.sync().catch(() => {});
  const recordId = String(record.id);
  const employeeId = String(record.createdBy || actorId);
  const now = new Date();

  for (const [stageKey, label] of Object.entries(WORKFLOW_STAGE_LABELS)) {
    const stage = workflow[stageKey] || {};
    const followUps = Array.isArray(stage.followUps) ? stage.followUps : [];
    const taskId = `SEC-WF-${recordId}-${stageKey}`;
    const existing = await TaskLog.findByPk(taskId);
    const hasActivity = stage.status === "in_progress" || stage.status === "completed" || stage.status === "rejected" ||
      Boolean(String(stage.notes || "").trim()) || (Array.isArray(stage.proofUrls) && stage.proofUrls.length > 0) || followUps.length > 0 ||
      (stageKey === "billing" && Boolean(record.billNo || record.billInvoiceUrl));
    if (!hasActivity && !existing) continue;

    const notes: string[] = [];
    if (String(stage.notes || "").trim()) notes.push(String(stage.notes).trim());
    if (stageKey === "authority_letter" && record.location) notes.push(`Site location: ${record.location}`);
    if (stageKey === "guard_deployment" && record.guardDetailsJson) {
      const guards = (() => { try { return JSON.parse(record.guardDetailsJson); } catch { return []; } })();
      if (Array.isArray(guards) && guards.length) notes.push(`Deployed guards: ${guards.map((guard: any) => `${guard.name}${guard.phone ? ` (${guard.phone})` : ""}`).join(", ")}`);
    }
    if (stageKey === "billing") notes.push(`Invoice ${record.billNo || "-"}, dated ${record.billDate || "-"}, amount ₹${Number(record.billAmount || 0).toLocaleString("en-IN")}`);
    for (const entry of followUps) {
      notes.push(`${entry.type || "Communication"} with ${entry.contactName || "contact"}${entry.contactDetail ? ` (${entry.contactDetail})` : ""}: ${entry.details || entry.outcome || "Follow-up logged"}`);
    }
    if (!notes.length) notes.push(`${label} stage updated in Security Work Pipeline.`);

    const proofs = uniq([
      ...(Array.isArray(stage.proofUrls) ? stage.proofUrls : []),
      ...(stageKey === "billing" ? [record.billInvoiceUrl] : []),
      ...(stageKey === "guard_deployment" ? [record.guardPhotoUrl] : []),
      ...followUps.flatMap((entry: any) => Array.isArray(entry.proofUrls) ? entry.proofUrls : []),
    ]);
    const progressNotes = JSON.stringify(notes.map((note, index) => ({
      id: `security-${recordId}-${stageKey}-${index}`,
      note,
      createdAt: now.toISOString(),
      userName: actorName,
    })));
    const taskStatus = stage.status === "completed" || stage.status === "rejected" ? "Completed" : stage.status === "in_progress" ? "In Progress" : "Pending";
    const taskDate = stage.date && !Number.isNaN(new Date(stage.date).getTime()) ? new Date(stage.date) : now;
    const description = [record.company, record.nbfcName, record.branchName, record.agentName ? `Agent: ${record.agentName}` : ""].filter(Boolean).join(" · ");
    const values: any = {
      employee: employeeId,
      assignedBy: actorId !== employeeId ? actorId : null,
      date: taskDate,
      taskTitle: `Security: ${label}`,
      taskType: "Security",
      description,
      status: taskStatus,
      progressNotes,
      proofAttachment: proofs.length ? JSON.stringify(proofs) : null,
      companyName: record.company || null,
      visitLocation: record.location || null,
      timerState: taskStatus === "Completed" ? "Stopped" : "Running",
      timerStart: taskStatus === "Completed" ? null : (existing?.timerStart || now),
    };
    if (existing) await existing.update(values);
    else await TaskLog.create({ id: taskId, ...values, elapsedSeconds: 0 });
  }
}

async function syncSecurityFollowUpTask(record: any, actorId: string, previousFollowUpAt?: unknown) {
  const taskId = `SEC-FOLLOWUP-${record.id}`;
  const existing = await TaskLog.findByPk(taskId);
  if (!record.followUpAt) {
    if (existing) await existing.update({ scheduledAt: null, reminderSent: false, status: "Cancelled", timerState: "Stopped", timerStart: null });
    return;
  }
  const scheduledAt = new Date(record.followUpAt);
  if (Number.isNaN(scheduledAt.getTime())) return;
  const previousTime = previousFollowUpAt ? new Date(previousFollowUpAt as any).getTime() : NaN;
  const scheduleChanged = !Number.isFinite(previousTime) || previousTime !== scheduledAt.getTime();
  const description = [record.company, record.nbfcName, record.branchName, record.agentName ? `Agent: ${record.agentName}` : ""].filter(Boolean).join(" · ");
  const values: any = {
    employee: String(record.createdBy || actorId),
    assignedBy: actorId !== String(record.createdBy || actorId) ? actorId : null,
    date: new Date(),
    scheduledAt,
    deadlineAt: new Date(scheduledAt.getTime() + 2 * 60 * 60 * 1000),
    taskTitle: `Security Follow-up: ${record.nbfcName || record.company || `Record ${record.id}`}`,
    taskType: "Security Follow-up",
    description,
    status: "Pending",
    timerState: "Stopped",
    timerStart: null,
    companyName: record.company || null,
    visitLocation: record.location || null,
    ...(scheduleChanged ? { reminderSent: false } : {}),
  };
  if (existing) await existing.update(values);
  else await TaskLog.create({ id: taskId, ...values, reminderSent: false, elapsedSeconds: 0 });
}

async function syncSecurityTableSchema() {
  try {
    await sequelize.authenticate();
    try {
      await LegalSecurity.sync();
    } catch (syncErr: any) {
      // Ignored if already synced
    }

    // Keep workflow columns backward-compatible with existing installations.
    try {
      const [columns]: any = await sequelize.query("SHOW COLUMNS FROM legal_securities LIKE 'installmentsJson'");
      if (!columns || columns.length === 0) {
        await sequelize.query("ALTER TABLE legal_securities ADD COLUMN installmentsJson LONGTEXT NULL AFTER source");
      }
    } catch (colErr: any) {
      // Fallback: try adding directly ignoring duplicate column error
      try {
        await sequelize.query("ALTER TABLE legal_securities ADD COLUMN installmentsJson LONGTEXT NULL");
      } catch (e) {}
    }
    for (const column of [
      { name: "workflowStage", definition: "VARCHAR(255) NULL DEFAULT 'bank_visit'" },
      { name: "workflowJson", definition: "LONGTEXT NULL" },
      { name: "agentName", definition: "VARCHAR(255) NULL" },
      { name: "followUpAt", definition: "DATETIME NULL" },
    ]) {
      try {
        const [columns]: any = await sequelize.query(`SHOW COLUMNS FROM legal_securities LIKE '${column.name}'`);
        if (!columns || columns.length === 0) {
          await sequelize.query(`ALTER TABLE legal_securities ADD COLUMN ${column.name} ${column.definition}`);
        }
      } catch (e) {
        console.warn(`LegalSecurity ${column.name} schema warning`);
      }
    }
  } catch (err: any) {
    console.warn("LegalSecurity sync warning:", err.message);
  }
}

// GET: Fetch all Security entries
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    await syncSecurityTableSchema();

    const entries = await LegalSecurity.findAll({
      order: [["createdAt", "DESC"]],
      raw: true,
    });

    return NextResponse.json({ success: true, data: entries });
  } catch (error: any) {
    console.error("[/api/legal-recovery/security GET]", error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Create a new Security entry
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const createdBy = (session.user as any).id || session.user.name;

    await syncSecurityTableSchema();

    const body = await req.json();
    const {
      company,
      billNo,
      billDate,
      billAmount,
      nbfcId,
      nbfcName,
      branchId,
      branchName,
      agentName,
      followUpAt,
      location,
      siteType,
      offerRef,
      coverageHours,
      shiftHours,
      guardsPerShift,
      totalDailyGuards,
      shiftRate,
      allowancePerShift,
      durationDays,
      totalGuardCost,
      totalAllowanceCost,
      guardName,
      guardPhone,
      guardDetailsJson,
      guardPhotoUrl,
      billInvoiceUrl,
      paymentMethod,
      paymentDays,
      paymentStatus = "Due",
      source,
      installmentsJson,
      receivedAmount,
      receivedDate,
      remarks,
      workflowStage,
      workflowJson,
    } = body;

    if (!company) {
      return NextResponse.json({ success: false, error: "Company is required" }, { status: 400 });
    }

    const newEntry = await LegalSecurity.create({
      company,
      billNo: billNo || "",
      billDate: billDate || null,
      billAmount: billAmount !== undefined ? Number(billAmount) : 0,
      nbfcId: nbfcId ? String(nbfcId) : null,
      nbfcName: nbfcName || "",
      branchId: branchId ? String(branchId) : null,
      branchName: branchName || "",
      agentName: agentName || "",
      followUpAt: followUpAt || null,
      location: location || "",
      siteType: siteType || "",
      offerRef: offerRef || "",
      coverageHours: coverageHours ? Number(coverageHours) : null,
      shiftHours: shiftHours ? Number(shiftHours) : null,
      guardsPerShift: guardsPerShift ? Number(guardsPerShift) : null,
      totalDailyGuards: totalDailyGuards ? Number(totalDailyGuards) : null,
      shiftRate: shiftRate !== undefined ? Number(shiftRate) : 0,
      allowancePerShift: allowancePerShift !== undefined ? Number(allowancePerShift) : 0,
      durationDays: durationDays ? Number(durationDays) : null,
      totalGuardCost: totalGuardCost !== undefined ? Number(totalGuardCost) : 0,
      totalAllowanceCost: totalAllowanceCost !== undefined ? Number(totalAllowanceCost) : 0,
      guardName: guardName || "",
      guardPhone: guardPhone || "",
      guardDetailsJson: guardDetailsJson || "",
      guardPhotoUrl: guardPhotoUrl || "",
      billInvoiceUrl: billInvoiceUrl || "",
      paymentMethod: paymentMethod || "",
      paymentDays: paymentDays ? String(paymentDays) : "",
      paymentStatus: paymentStatus || "Due",
      source: source || "",
      installmentsJson: installmentsJson || "",
      receivedAmount: receivedAmount ? Number(receivedAmount) : 0,
      receivedDate: receivedDate || null,
      remarks: remarks || "",
      workflowStage: workflowStage || "bank_visit",
      workflowJson: workflowJson || "",
      createdBy: String(createdBy),
    });

    await syncWorkflowTasks(newEntry, String(createdBy), session.user.name || "System User");
    await syncGuardDeploymentProjects(newEntry, String(createdBy));
    await syncSecurityFollowUpTask(newEntry, String(createdBy));
    await notifyWorkflowChanges(newEntry, "", session.user.name || "System User", `security_workflow_${newEntry.id}_${Date.now()}`);

    return NextResponse.json({ success: true, data: newEntry });
  } catch (error: any) {
    console.error("[/api/legal-recovery/security POST]", error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT: Update an existing Security entry
export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    await syncSecurityTableSchema();

    const body = await req.json();
    const {
      id,
      company,
      billNo,
      billDate,
      billAmount,
      nbfcId,
      nbfcName,
      branchId,
      branchName,
      agentName,
      followUpAt,
      location,
      siteType,
      offerRef,
      coverageHours,
      shiftHours,
      guardsPerShift,
      totalDailyGuards,
      shiftRate,
      allowancePerShift,
      durationDays,
      totalGuardCost,
      totalAllowanceCost,
      guardName,
      guardPhone,
      guardDetailsJson,
      guardPhotoUrl,
      billInvoiceUrl,
      paymentMethod,
      paymentDays,
      paymentStatus,
      source,
      installmentsJson,
      receivedAmount,
      receivedDate,
      remarks,
      workflowStage,
      workflowJson,
    } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "ID is required" }, { status: 400 });
    }

    const record = await LegalSecurity.findByPk(id);
    if (!record) {
      return NextResponse.json({ success: false, error: "Record not found" }, { status: 404 });
    }

    const previousWorkflowJson = record.workflowJson;
    const previousFollowUpAt = record.followUpAt;
    await record.update({
      company: company ?? record.company,
      billNo: billNo ?? record.billNo,
      billDate: billDate !== undefined ? (billDate || null) : record.billDate,
      billAmount: billAmount !== undefined ? Number(billAmount) : record.billAmount,
      nbfcId: nbfcId !== undefined ? (nbfcId ? String(nbfcId) : null) : record.nbfcId,
      nbfcName: nbfcName ?? record.nbfcName,
      branchId: branchId !== undefined ? (branchId ? String(branchId) : null) : record.branchId,
      branchName: branchName ?? record.branchName,
      agentName: agentName ?? record.agentName,
      followUpAt: followUpAt !== undefined ? (followUpAt || null) : record.followUpAt,
      location: location ?? record.location,
      siteType: siteType !== undefined ? siteType : record.siteType,
      offerRef: offerRef !== undefined ? offerRef : record.offerRef,
      coverageHours: coverageHours !== undefined ? Number(coverageHours) : record.coverageHours,
      shiftHours: shiftHours !== undefined ? Number(shiftHours) : record.shiftHours,
      guardsPerShift: guardsPerShift !== undefined ? Number(guardsPerShift) : record.guardsPerShift,
      totalDailyGuards: totalDailyGuards !== undefined ? Number(totalDailyGuards) : record.totalDailyGuards,
      shiftRate: shiftRate !== undefined ? Number(shiftRate) : record.shiftRate,
      allowancePerShift: allowancePerShift !== undefined ? Number(allowancePerShift) : record.allowancePerShift,
      durationDays: durationDays !== undefined ? Number(durationDays) : record.durationDays,
      totalGuardCost: totalGuardCost !== undefined ? Number(totalGuardCost) : record.totalGuardCost,
      totalAllowanceCost: totalAllowanceCost !== undefined ? Number(totalAllowanceCost) : record.totalAllowanceCost,
      guardName: guardName !== undefined ? guardName : record.guardName,
      guardPhone: guardPhone !== undefined ? guardPhone : record.guardPhone,
      guardDetailsJson: guardDetailsJson !== undefined ? guardDetailsJson : record.guardDetailsJson,
      guardPhotoUrl: guardPhotoUrl !== undefined ? guardPhotoUrl : record.guardPhotoUrl,
      billInvoiceUrl: billInvoiceUrl !== undefined ? billInvoiceUrl : record.billInvoiceUrl,
      paymentMethod: paymentMethod !== undefined ? paymentMethod : record.paymentMethod,
      paymentDays: paymentDays !== undefined ? String(paymentDays) : record.paymentDays,
      paymentStatus: paymentStatus ?? record.paymentStatus,
      source: source ?? record.source,
      installmentsJson: installmentsJson !== undefined ? installmentsJson : record.installmentsJson,
      receivedAmount: receivedAmount !== undefined ? Number(receivedAmount) : record.receivedAmount,
      receivedDate: receivedDate !== undefined ? (receivedDate || null) : record.receivedDate,
      remarks: remarks ?? record.remarks,
      workflowStage: workflowStage ?? record.workflowStage,
      workflowJson: workflowJson !== undefined ? workflowJson : record.workflowJson,
    });

    const actorId = String((session.user as any).id || session.user.name || "system");
    await syncWorkflowTasks(record, actorId, session.user.name || "System User");
    await syncGuardDeploymentProjects(record, actorId);
    await syncSecurityFollowUpTask(record, actorId, previousFollowUpAt);
    await notifyWorkflowChanges(record, previousWorkflowJson, session.user.name || "System User", `security_workflow_${record.id}_${Date.now()}`);

    return NextResponse.json({ success: true, data: record });
  } catch (error: any) {
    console.error("[/api/legal-recovery/security PUT]", error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE: Delete a Security entry
export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, error: "ID is required" }, { status: 400 });
    }

    await sequelize.authenticate();
    await LegalSecurity.destroy({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[/api/legal-recovery/security DELETE]", error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
