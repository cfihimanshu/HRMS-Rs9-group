import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { Op } from "sequelize";
import sequelize from "@/lib/sequelize";
import { getSessionActor, requireApiSession } from "@/lib/apiAuth";
import DocumentRegister from "@/models/sequelize/DocumentRegister";
import DocumentMovement from "@/models/sequelize/DocumentMovement";
import Notification from "@/models/sequelize/Notification";
import User from "@/models/sequelize/User";
import { sendEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

const DOCUMENT_ROLES = [
  "Owner",
  "Director",
  "HR Head",
  "HR Executive",
  "Department Manager",
  "IT Admin",
  "Accounts",
] as const;
const MANAGEMENT_SET = new Set<string>(DOCUMENT_ROLES);

const clean = (value: unknown) => String(value ?? "").trim();
const optional = (value: unknown) => clean(value) || null;
const escapeHtml = (value: unknown) => clean(value).replace(/[&<>"']/g, character => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
}[character] || character));
const validDate = (value: unknown, field: string, required = false) => {
  const raw = clean(value);
  if (!raw && !required) return null;
  const parsed = new Date(raw);
  if (!raw || Number.isNaN(parsed.getTime())) throw new Error(`${field} is invalid`);
  return parsed;
};

function fail(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status });
}

function serialize(row: any) {
  return row?.toJSON ? row.toJSON() : row;
}

async function notifyUser(recipient: string | null, title: string, message: string, transaction?: any) {
  if (!recipient) return;
  await Notification.create({
    id: randomUUID(),
    recipient,
    title,
    message,
    read: false,
  }, transaction ? { transaction } : undefined);
  const user = await User.findByPk(recipient, { attributes: ["email"], raw: true });
  if ((user as any)?.email) {
    void sendEmail({
      to: String((user as any).email),
      subject: title,
      html: `<div style="font-family:Arial,sans-serif"><h2>${escapeHtml(title)}</h2><p>${escapeHtml(message)}</p><p>Please open RS9 HRMS → Document Movement for details.</p></div>`,
    });
  }
}

export async function GET(request: Request) {
  try {
    const auth = await requireApiSession();
    if (auth.response) return auth.response;
    const actor = getSessionActor(auth.session);
    const actorDepartment = clean((auth.session?.user as any)?.department);

    const { searchParams } = new URL(request.url);
    const search = clean(searchParams.get("search"));
    const status = clean(searchParams.get("status"));
    const holder = clean(searchParams.get("holder"));
    const documentId = clean(searchParams.get("documentId"));
    const mine = searchParams.get("mine") === "true";
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const limit = Math.min(100, Math.max(10, Number(searchParams.get("limit")) || 25));

    await sequelize.authenticate();

    if (documentId) {
      const document = await DocumentRegister.findByPk(documentId);
      if (!document) return fail("Document not found", 404);
      const isManagement = MANAGEMENT_SET.has(actor.userRole);
      const isHolder = [document.currentHolderId, document.pendingHolderId, document.receivedById].filter(Boolean).map(String).includes(actor.userId);
      const sameDepartment = actorDepartment && actorDepartment === document.owningDepartment;
      if (!isManagement && !isHolder && !(document.visibility === "Department Only" && sameDepartment) && document.visibility !== "Internal") {
        return fail("You do not have access to this document", 403);
      }
      const movements = await DocumentMovement.findAll({
        where: { documentId },
        order: [["sequence", "ASC"]],
      });
      return NextResponse.json({
        success: true,
        data: { ...serialize(document), movements: movements.map(serialize) },
      });
    }

    const where: any = {};
    const isManagement = MANAGEMENT_SET.has(actor.userRole);
    if (mine) {
      where[Op.or] = [
        { currentHolderId: actor.userId },
        { pendingHolderId: actor.userId },
        { receivedById: actor.userId },
      ];
    } else if (!isManagement) {
      where[Op.or] = [
        { visibility: "Internal" },
        { currentHolderId: actor.userId },
        { pendingHolderId: actor.userId },
        ...(actorDepartment ? [{ visibility: "Department Only", owningDepartment: actorDepartment }] : []),
      ];
    }
    if (status && status !== "All") where.status = status;
    if (holder) where.currentHolderName = { [Op.like]: `%${holder}%` };
    if (search) {
      const searchWhere = [
        { documentNumber: { [Op.like]: `%${search}%` } },
        { title: { [Op.like]: `%${search}%` } },
        { documentType: { [Op.like]: `%${search}%` } },
        { sourceName: { [Op.like]: `%${search}%` } },
        { currentHolderName: { [Op.like]: `%${search}%` } },
        { purpose: { [Op.like]: `%${search}%` } },
      ];
      if (where[Op.or]) {
        where[Op.and] = [{ [Op.or]: where[Op.or] }, { [Op.or]: searchWhere }];
        delete where[Op.or];
      } else {
        where[Op.or] = searchWhere;
      }
    }

    const { rows, count } = await DocumentRegister.findAndCountAll({
      where,
      order: [["updatedAt", "DESC"]],
      limit,
      offset: (page - 1) * limit,
    });

    const statusCountsRaw = await DocumentRegister.findAll({
      attributes: ["status", [sequelize.fn("COUNT", sequelize.col("id")), "count"]],
      where,
      group: ["status"],
      raw: true,
    });
    const statusCounts = Object.fromEntries(
      statusCountsRaw.map((item: any) => [item.status, Number(item.count)])
    );

    return NextResponse.json({
      success: true,
      data: rows.map(serialize),
      summary: {
        total: Object.values(statusCounts).reduce((sum: number, count: any) => sum + count, 0),
        inCustody: (statusCounts["In Custody"] || 0) + (statusCounts["Handed Over"] || 0),
        returned: statusCounts.Returned || 0,
        archived: statusCounts.Archived || 0,
        pendingAcceptance: statusCounts["Pending Acceptance"] || 0,
        overdue: await DocumentRegister.count({
          where: {
            ...where,
            dueDate: { [Op.lt]: new Date().toISOString().slice(0, 10) },
            status: { [Op.in]: ["In Custody", "Handed Over", "Pending Acceptance"] },
          },
        }),
        expiring: await DocumentRegister.count({
          where: {
            ...where,
            expiryDate: {
              [Op.between]: [
                new Date().toISOString().slice(0, 10),
                new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
              ],
            },
          },
        }),
      },
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.max(1, Math.ceil(count / limit)),
      },
    });
  } catch (error: any) {
    console.error("[GET /api/document-movement]", error);
    return fail(error.message || "Failed to load document register", 500);
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireApiSession(DOCUMENT_ROLES);
    if (auth.response) return auth.response;
    const actor = getSessionActor(auth.session);
    const body = await request.json();

    const title = clean(body.title);
    const documentType = clean(body.documentType);
    const sourceName = clean(body.sourceName);
    const purpose = clean(body.purpose);
    const receivedByName = clean(body.receivedByName);
    if (!title || !documentType || !sourceName || !purpose || !receivedByName) {
      return fail("Title, document type, source, receiver and purpose are required");
    }

    const receivedAt = validDate(body.receivedAt, "Received date", true)!;
    const documentNature = clean(body.documentNature) || "Original";
    if (!["Original", "Photocopy", "Certified Copy", "Digital"].includes(documentNature)) {
      return fail("Invalid document nature");
    }

    const result = await sequelize.transaction(async transaction => {
      const id = randomUUID();
      const customNumber = clean(body.documentNumber);
      const documentNumber =
        customNumber ||
        `DOC-${receivedAt.getFullYear()}-${Date.now().toString().slice(-8)}`;

      const duplicate = await DocumentRegister.findOne({
        where: { documentNumber },
        transaction,
      });
      if (duplicate) throw new Error("Document number already exists");

      const document = await DocumentRegister.create(
        {
          id,
          documentNumber,
          title,
          documentType,
          documentNature,
          sourceName,
          sourceDepartment: optional(body.sourceDepartment),
          sourceContact: optional(body.sourceContact),
          purpose,
          receivedById: optional(body.receivedById),
          receivedByName,
          receivedAt,
          currentHolderId: optional(body.receivedById),
          currentHolderName: receivedByName,
          currentHolderDepartment: optional(body.receivedByDepartment),
          status: "In Custody",
          dueDate: optional(body.dueDate),
          fileUrl: optional(body.fileUrl),
          remarks: optional(body.remarks),
          visibility: clean(body.visibility) || "Internal",
          owningDepartment: optional(body.owningDepartment || body.receivedByDepartment),
          linkedEntityType: optional(body.linkedEntityType),
          linkedEntityId: optional(body.linkedEntityId),
          physicalLocation: optional(body.physicalLocation),
          expiryDate: optional(body.expiryDate),
          createdById: actor.userId,
          createdByName: actor.userName || actor.userRole,
        },
        { transaction }
      );

      await DocumentMovement.create(
        {
          id: randomUUID(),
          documentId: id,
          sequence: 1,
          action: "RECEIVED",
          fromPersonName: sourceName,
          toPersonId: optional(body.receivedById),
          toPersonName: receivedByName,
          toDepartment: optional(body.receivedByDepartment),
          purpose,
          movedAt: receivedAt,
          dueDate: optional(body.dueDate),
          acknowledgementUrl: optional(body.acknowledgementUrl),
          remarks: optional(body.remarks),
          performedById: actor.userId,
          performedByName: actor.userName || actor.userRole,
        },
        { transaction }
      );
      return document;
    });

    return NextResponse.json({ success: true, data: serialize(result) }, { status: 201 });
  } catch (error: any) {
    console.error("[POST /api/document-movement]", error);
    const duplicate = error?.name === "SequelizeUniqueConstraintError";
    return fail(duplicate ? "Document number already exists" : error.message || "Failed to register document", duplicate ? 409 : 500);
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await requireApiSession();
    if (auth.response) return auth.response;
    const actor = getSessionActor(auth.session);
    const body = await request.json();
    const documentId = clean(body.documentId);
    const action = clean(body.action).toUpperCase();
    if (!documentId || !["HANDOVER", "ACCEPT", "REJECT", "RETURNED", "ARCHIVED", "REOPENED", "CORRECT", "INCIDENT"].includes(action)) {
      return fail("Valid document and action are required");
    }

    const result = await sequelize.transaction(async transaction => {
      const document = await DocumentRegister.findByPk(documentId, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!document) throw new Error("Document not found");

      const isManagement = MANAGEMENT_SET.has(actor.userRole);
      if (["ACCEPT", "REJECT"].includes(action)) {
        if (!document.pendingMovementId || String(document.pendingHolderId || "") !== actor.userId) {
          throw new Error("Only the selected receiver can respond to this handover");
        }
        const movement = await DocumentMovement.findByPk(document.pendingMovementId, { transaction, lock: transaction.LOCK.UPDATE });
        if (!movement || movement.acceptanceStatus !== "PENDING") throw new Error("This handover is no longer pending");
        if (action === "REJECT") {
          await movement.update({ action: "HANDOVER_REJECTED", acceptanceStatus: "REJECTED", respondedAt: new Date(), responseRemarks: optional(body.remarks) }, { transaction });
          await document.update({
            status: document.currentHolderId ? "In Custody" : "In Custody",
            pendingHolderId: null, pendingHolderName: null, pendingHolderDepartment: null, pendingMovementId: null,
          }, { transaction });
          await notifyUser(movement.performedById, "Document Handover Rejected", `${actor.userName} rejected ${document.documentNumber}. ${clean(body.remarks)}`, transaction);
          return document;
        }
        await movement.update({ action: "HANDOVER", acceptanceStatus: "ACCEPTED", respondedAt: new Date(), responseRemarks: optional(body.remarks) }, { transaction });
        await document.update({
          currentHolderId: document.pendingHolderId,
          currentHolderName: document.pendingHolderName,
          currentHolderDepartment: document.pendingHolderDepartment,
          pendingHolderId: null, pendingHolderName: null, pendingHolderDepartment: null, pendingMovementId: null,
          status: "Handed Over",
          dueDate: movement.dueDate,
        }, { transaction });
        await notifyUser(movement.performedById, "Document Handover Accepted", `${actor.userName} accepted ${document.documentNumber}.`, transaction);
        return document;
      }
      if (!isManagement) throw new Error("You do not have permission to modify this document");

      if (action === "CORRECT") {
        const allowedFields = ["title", "documentType", "sourceName", "sourceDepartment", "sourceContact", "purpose", "dueDate", "expiryDate", "physicalLocation", "visibility", "owningDepartment", "linkedEntityType", "linkedEntityId", "remarks"];
        const changes: Record<string, { from: any; to: any }> = {};
        const updates: any = {};
        for (const field of allowedFields) {
          if (Object.prototype.hasOwnProperty.call(body.changes || {}, field)) {
            const next = optional(body.changes[field]);
            if (String(document[field] ?? "") !== String(next ?? "")) {
              changes[field] = { from: document[field] ?? null, to: next };
              updates[field] = next;
            }
          }
        }
        if (!Object.keys(changes).length || !clean(body.purpose)) throw new Error("At least one changed field and correction reason are required");
        const latest = await DocumentMovement.max("sequence", { where: { documentId }, transaction });
        await DocumentMovement.create({
          id: randomUUID(), documentId, sequence: Number(latest || 0) + 1, action: "CORRECTED",
          fromPersonName: document.currentHolderName, toPersonName: document.currentHolderName,
          purpose: clean(body.purpose), movedAt: new Date(), remarks: optional(body.remarks),
          performedById: actor.userId, performedByName: actor.userName || actor.userRole,
          changeDetails: JSON.stringify(changes),
        }, { transaction });
        await document.update({ ...updates, version: Number(document.version || 1) + 1 }, { transaction });
        return document;
      }

      if (action === "INCIDENT") {
        const incidentStatus = clean(body.incidentStatus);
        if (!["Missing", "Damaged", "Under Investigation", "Destroyed", "Confidential Hold"].includes(incidentStatus)) throw new Error("Valid incident status is required");
        const latest = await DocumentMovement.max("sequence", { where: { documentId }, transaction });
        await DocumentMovement.create({
          id: randomUUID(), documentId, sequence: Number(latest || 0) + 1, action: "INCIDENT",
          fromPersonId: document.currentHolderId, fromPersonName: document.currentHolderName,
          toPersonId: document.currentHolderId, toPersonName: document.currentHolderName,
          purpose: clean(body.purpose) || incidentStatus, movedAt: validDate(body.movedAt, "Incident date", false) || new Date(),
          acknowledgementUrl: optional(body.acknowledgementUrl), remarks: optional(body.remarks),
          performedById: actor.userId, performedByName: actor.userName || actor.userRole,
          changeDetails: JSON.stringify({ status: { from: document.status, to: incidentStatus } }),
        }, { transaction });
        await document.update({ status: incidentStatus }, { transaction });
        return document;
      }

      const toPersonName =
        action === "ARCHIVED"
          ? clean(body.toPersonName) || "Records Archive"
          : clean(body.toPersonName);
      const purpose = clean(body.purpose);
      if (!toPersonName || !purpose) throw new Error("Receiver and purpose are required");
      if (action === "HANDOVER" && ["Returned", "Archived"].includes(document.status)) {
        throw new Error(`A ${document.status.toLowerCase()} document must be reopened before handover`);
      }
      if (action === "HANDOVER" && document.pendingMovementId) {
        throw new Error("This document already has a pending handover");
      }

      const movedAt = validDate(body.movedAt, "Movement date", true)!;
      const latest = await DocumentMovement.max("sequence", {
        where: { documentId },
        transaction,
      });
      const sequence = Number(latest || 0) + 1;
      const fromPersonId = document.currentHolderId;
      const fromPersonName = document.currentHolderName;
      const status =
        action === "RETURNED" ? "Returned" :
        action === "ARCHIVED" ? "Archived" :
        action === "REOPENED" ? "In Custody" : "Handed Over";

      const movementId = randomUUID();
      await DocumentMovement.create(
        {
          id: movementId,
          documentId,
          sequence,
          action: action === "HANDOVER" && optional(body.toPersonId) ? "HANDOVER_REQUESTED" : action,
          fromPersonId,
          fromPersonName,
          toPersonId: optional(body.toPersonId),
          toPersonName,
          toDepartment: optional(body.toDepartment),
          purpose,
          movedAt,
          dueDate: optional(body.dueDate),
          acknowledgementUrl: optional(body.acknowledgementUrl),
          remarks: optional(body.remarks),
          performedById: actor.userId,
          performedByName: actor.userName || actor.userRole,
          acceptanceStatus: action === "HANDOVER" && optional(body.toPersonId) ? "PENDING" : "NOT_REQUIRED",
        },
        { transaction }
      );

      const requiresAcceptance = action === "HANDOVER" && !!optional(body.toPersonId);
      await document.update(
        requiresAcceptance ? {
          pendingHolderId: optional(body.toPersonId),
          pendingHolderName: toPersonName,
          pendingHolderDepartment: optional(body.toDepartment),
          pendingMovementId: movementId,
          status: "Pending Acceptance",
        } : {
          currentHolderId: optional(body.toPersonId),
          currentHolderName: toPersonName,
          currentHolderDepartment: optional(body.toDepartment),
          status,
          dueDate: optional(body.dueDate),
        },
        { transaction }
      );
      if (requiresAcceptance) {
        await notifyUser(optional(body.toPersonId), "Document Handover Pending", `${actor.userName} wants to hand over ${document.documentNumber} (${document.title}) to you. Please accept or reject it.`, transaction);
      }
      return document;
    });

    return NextResponse.json({ success: true, data: serialize(result) });
  } catch (error: any) {
    console.error("[PATCH /api/document-movement]", error);
    const status = error.message === "Document not found" ? 404 : 400;
    return fail(error.message || "Failed to move document", status);
  }
}
