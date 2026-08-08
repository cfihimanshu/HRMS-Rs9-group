import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { Op } from "sequelize";
import sequelize from "@/lib/sequelize";
import { getSessionActor } from "@/lib/apiAuth";
import { requireVehicleApiAccess } from "@/lib/vehicleAccess";
import Vehicle from "@/models/sequelize/Vehicle";
import VehicleDocument from "@/models/sequelize/VehicleDocument";
import VehicleAssignment from "@/models/sequelize/VehicleAssignment";

export const dynamic = "force-dynamic";
const clean = (value: unknown) => String(value ?? "").trim();
const optional = (value: unknown) => clean(value) || null;
const numberOrNull = (value: unknown) => clean(value) ? Number(value) : null;
const fail = (error: string, status = 400) => NextResponse.json({ success: false, error }, { status });

let saleColumnsReady = false;
async function ensureSaleColumns() {
  if (saleColumnsReady) return;
  try {
    await Promise.all([Vehicle.sync(), VehicleDocument.sync(), VehicleAssignment.sync()]);
    const [columns]: any = await sequelize.query("SHOW COLUMNS FROM `vehicles`");
    const existing = new Set((Array.isArray(columns) ? columns : []).map((c: any) => c.Field));
    if (!existing.has("saleDate")) await sequelize.query("ALTER TABLE `vehicles` ADD COLUMN `saleDate` DATE NULL");
    if (!existing.has("saleAmount")) await sequelize.query("ALTER TABLE `vehicles` ADD COLUMN `saleAmount` DECIMAL(14,2) NULL");
    if (!existing.has("buyerName")) await sequelize.query("ALTER TABLE `vehicles` ADD COLUMN `buyerName` VARCHAR(255) NULL");
    if (!existing.has("buyerContact")) await sequelize.query("ALTER TABLE `vehicles` ADD COLUMN `buyerContact` VARCHAR(255) NULL");
    if (!existing.has("buyerAddress")) await sequelize.query("ALTER TABLE `vehicles` ADD COLUMN `buyerAddress` VARCHAR(255) NULL");
    if (!existing.has("buyerIdProofType")) await sequelize.query("ALTER TABLE `vehicles` ADD COLUMN `buyerIdProofType` VARCHAR(255) NULL");
    if (!existing.has("buyerIdProofTypeOther")) await sequelize.query("ALTER TABLE `vehicles` ADD COLUMN `buyerIdProofTypeOther` VARCHAR(255) NULL");
    if (!existing.has("buyerIdProofNumber")) await sequelize.query("ALTER TABLE `vehicles` ADD COLUMN `buyerIdProofNumber` VARCHAR(255) NULL");
    if (!existing.has("buyerIdProofUrl")) await sequelize.query("ALTER TABLE `vehicles` ADD COLUMN `buyerIdProofUrl` TEXT NULL");
    if (!existing.has("paymentMode")) await sequelize.query("ALTER TABLE `vehicles` ADD COLUMN `paymentMode` VARCHAR(255) NULL");
    if (!existing.has("paymentModeOther")) await sequelize.query("ALTER TABLE `vehicles` ADD COLUMN `paymentModeOther` VARCHAR(255) NULL");
    if (!existing.has("paymentReference")) await sequelize.query("ALTER TABLE `vehicles` ADD COLUMN `paymentReference` VARCHAR(255) NULL");
    if (!existing.has("saleOdometer")) await sequelize.query("ALTER TABLE `vehicles` ADD COLUMN `saleOdometer` INT NULL");
    if (!existing.has("rtoNocNumber")) await sequelize.query("ALTER TABLE `vehicles` ADD COLUMN `rtoNocNumber` VARCHAR(255) NULL");
    if (!existing.has("saleWitness")) await sequelize.query("ALTER TABLE `vehicles` ADD COLUMN `saleWitness` VARCHAR(255) NULL");
    if (!existing.has("rcTransferStatus")) await sequelize.query("ALTER TABLE `vehicles` ADD COLUMN `rcTransferStatus` VARCHAR(255) NULL");
    if (!existing.has("saleRemarks")) await sequelize.query("ALTER TABLE `vehicles` ADD COLUMN `saleRemarks` TEXT NULL");
    if (!existing.has("isInstallmentSale")) await sequelize.query("ALTER TABLE `vehicles` ADD COLUMN `isInstallmentSale` TINYINT(1) DEFAULT 0");
    if (!existing.has("paymentInstallments")) await sequelize.query("ALTER TABLE `vehicles` ADD COLUMN `paymentInstallments` TEXT NULL");
    if (!existing.has("handoverDate")) await sequelize.query("ALTER TABLE `vehicles` ADD COLUMN `handoverDate` DATE NULL");
    if (!existing.has("handoverLocation")) await sequelize.query("ALTER TABLE `vehicles` ADD COLUMN `handoverLocation` VARCHAR(255) NULL");
    if (!existing.has("handoverBy")) await sequelize.query("ALTER TABLE `vehicles` ADD COLUMN `handoverBy` VARCHAR(255) NULL");
    if (!existing.has("receivedBy")) await sequelize.query("ALTER TABLE `vehicles` ADD COLUMN `receivedBy` VARCHAR(255) NULL");
    if (!existing.has("rcHandedOver")) await sequelize.query("ALTER TABLE `vehicles` ADD COLUMN `rcHandedOver` VARCHAR(50) NULL");
    if (!existing.has("insuranceHandedOver")) await sequelize.query("ALTER TABLE `vehicles` ADD COLUMN `insuranceHandedOver` VARCHAR(50) NULL");
    try {
      await sequelize.query("ALTER TABLE `vehicle_assignments` MODIFY COLUMN `action` VARCHAR(255) NOT NULL");
    } catch (e) {
      console.warn("vehicle_assignments action alter warning:", e);
    }
    saleColumnsReady = true;
  } catch (e) {
    console.warn("ensureSaleColumns error:", e);
  }
}

async function getExistingVehicleAttributes() {
  await ensureSaleColumns();
  try {
    const [columns]: any = await sequelize.query("SHOW COLUMNS FROM `vehicles`");
    const dbCols = new Set((Array.isArray(columns) ? columns : []).map((c: any) => c.Field));
    return Object.keys(Vehicle.getAttributes()).filter((attr) => dbCols.has(attr));
  } catch {
    return Object.keys(Vehicle.getAttributes());
  }
}

export async function GET(request: Request) {
  try {
    const auth = await requireVehicleApiAccess();
    if (auth.response) return auth.response;
    const params = new URL(request.url).searchParams;
    const id = clean(params.get("id"));
    await sequelize.authenticate();
    await ensureSaleColumns();
    const attributes = await getExistingVehicleAttributes();
    if (id) {
      const vehicle = await Vehicle.findByPk(id, { attributes });
      if (!vehicle) return fail("Vehicle not found", 404);
      const [documents, assignments] = await Promise.all([
        VehicleDocument.findAll({
          where: { vehicleId: id, documentType: { [Op.notIn]: ["PUC", "Fitness"] } },
          order: [["createdAt", "DESC"]],
        }),
        VehicleAssignment.findAll({ where: { vehicleId: id }, order: [["assignedAt", "DESC"]] }),
      ]);
      return NextResponse.json({ success: true, data: { ...vehicle.toJSON(), documents, assignments } });
    }
    const search = clean(params.get("search"));
    const status = clean(params.get("status"));
    const companyId = clean(params.get("companyId"));
    const where: any = {};
    if (status && status !== "All") where.status = status;
    if (companyId && companyId !== "All") where.companyId = companyId;
    if (search) where[Op.or] = [
      { registrationNumber: { [Op.like]: `%${search}%` } }, { make: { [Op.like]: `%${search}%` } },
      { model: { [Op.like]: `%${search}%` } }, { companyName: { [Op.like]: `%${search}%` } },
      { ownerName: { [Op.like]: `%${search}%` } }, { vehicleName: { [Op.like]: `%${search}%` } },
      { currentAssigneeName: { [Op.like]: `%${search}%` } }, { chassisNumber: { [Op.like]: `%${search}%` } },
      { buyerName: { [Op.like]: `%${search}%` } },
    ];
    const rows = await Vehicle.findAll({ attributes, where, order: [["updatedAt", "DESC"]] });
    const today = new Date().toISOString().slice(0, 10);
    const soon = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
    const expiringVehicleIds = await VehicleDocument.count({ where: { expiryDate: { [Op.between]: [today, soon] } }, distinct: true, col: "vehicleId" });
    return NextResponse.json({
      success: true, data: rows,
      summary: {
        total: await Vehicle.count(), available: await Vehicle.count({ where: { status: "Available" } }),
        assigned: await Vehicle.count({ where: { status: "Assigned" } }),
        maintenance: await Vehicle.count({ where: { status: "Maintenance" } }),
        sold: await Vehicle.count({ where: { status: "Sold" } }),
        expiringDocuments: expiringVehicleIds,
      },
    });
  } catch (error: any) {
    console.error("[GET /api/vehicles]", error);
    return fail(error.message || "Failed to load vehicles", 500);
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireVehicleApiAccess();
    if (auth.response) return auth.response;
    const actor = getSessionActor(auth.session);
    const body = await request.json();
    if (body.action === "ADD_DOCUMENT") {
      const vehicleId = clean(body.vehicleId);
      if (!vehicleId || !clean(body.documentType) || !clean(body.fileUrl)) return fail("Vehicle, document type and file are required");
      if (!await Vehicle.findByPk(vehicleId)) return fail("Vehicle not found", 404);
      const document = await VehicleDocument.create({
        id: randomUUID(), vehicleId, documentType: clean(body.documentType),
        documentNumber: optional(body.documentNumber), issueDate: optional(body.issueDate),
        expiryDate: optional(body.expiryDate), fileUrl: clean(body.fileUrl), remarks: optional(body.remarks),
        uploadedById: actor.userId, uploadedByName: actor.userName || actor.userRole,
      });
      return NextResponse.json({ success: true, data: document }, { status: 201 });
    }
    const required = ["registrationNumber", "ownerName", "vehicleName", "vehicleType"];
    if (required.some(field => !clean(body[field]))) return fail("Number plate, owner name, vehicle name and type are required");
    const registrationNumber = clean(body.registrationNumber).toUpperCase().replace(/\s+/g, "");
    if (await Vehicle.findOne({ where: { registrationNumber } })) return fail("Registration number already exists", 409);
    await ensureSaleColumns();
    const vehicle = await sequelize.transaction(async transaction => {
      const created = await Vehicle.create({
      id: randomUUID(), registrationNumber, companyId: null, companyName: "Vehicle Fleet",
      ownerName: clean(body.ownerName), vehicleName: clean(body.vehicleName),
      vehicleType: clean(body.vehicleType), make: clean(body.vehicleName), model: clean(body.vehicleName), variant: null,
      manufacturingYear: numberOrNull(body.manufacturingYear), color: optional(body.color), fuelType: optional(body.fuelType),
      chassisNumber: optional(body.chassisNumber), engineNumber: optional(body.engineNumber),
      purchaseDate: optional(body.purchaseDate), purchaseValue: numberOrNull(body.purchaseValue),
      odometer: numberOrNull(body.odometer), ownershipType: clean(body.ownershipType) || "Company Owned",
      status: clean(body.status) || "Available", location: optional(body.location),
      photoUrl: optional(body.photoUrl), remarks: optional(body.remarks),
      createdById: actor.userId, createdByName: actor.userName || actor.userRole,
      }, { transaction });
      const documents = Array.isArray(body.documents) ? body.documents : [];
      for (const item of documents) {
        if (!clean(item.documentType) || !clean(item.fileUrl)) continue;
        await VehicleDocument.create({
          id: randomUUID(), vehicleId: created.id, documentType: clean(item.documentType),
          documentNumber: optional(item.documentNumber), issueDate: optional(item.issueDate),
          expiryDate: optional(item.expiryDate), fileUrl: clean(item.fileUrl), remarks: optional(item.remarks),
          uploadedById: actor.userId, uploadedByName: actor.userName || actor.userRole,
        }, { transaction });
      }
      return created;
    });
    return NextResponse.json({ success: true, data: vehicle }, { status: 201 });
  } catch (error: any) {
    console.error("[POST /api/vehicles]", error);
    return fail(error.message || "Failed to save vehicle", 500);
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await requireVehicleApiAccess();
    if (auth.response) return auth.response;
    const actor = getSessionActor(auth.session);
    const body = await request.json();
    const vehicleId = clean(body.vehicleId);
    const action = clean(body.action).toUpperCase();
    if (!vehicleId || !["ASSIGN", "RETURN", "STATUS", "UPDATE", "SALE"].includes(action)) return fail("Valid vehicle and action are required");
    await ensureSaleColumns();
    const result = await sequelize.transaction(async transaction => {
      const vehicle = await Vehicle.findByPk(vehicleId, { transaction, lock: transaction.LOCK.UPDATE });
      if (!vehicle) throw new Error("Vehicle not found");
      if (action === "ASSIGN") {
        const toPersonName = clean(body.toPersonName);
        if (!toPersonName) throw new Error("Assignee name is required");
        const assignedAt = clean(body.assignedAt) ? new Date(body.assignedAt) : new Date();
        await VehicleAssignment.create({
          id: randomUUID(), vehicleId, action: vehicle.currentAssigneeName ? "TRANSFERRED" : "ASSIGNED",
          fromPersonId: vehicle.currentAssigneeId, fromPersonName: vehicle.currentAssigneeName,
          toPersonId: optional(body.toPersonId), toPersonName,
          assigneeType: optional(body.toPersonId) ? "Employee" : "External", assignedAt,
          purpose: optional(body.purpose), odometer: numberOrNull(body.odometer),
          handoverProofUrl: optional(body.handoverProofUrl), remarks: optional(body.remarks),
          performedById: actor.userId, performedByName: actor.userName || actor.userRole,
        }, { transaction });
        await vehicle.update({
          currentAssigneeId: optional(body.toPersonId), currentAssigneeName: toPersonName,
          currentAssigneeType: optional(body.toPersonId) ? "Employee" : "External",
          assignedAt, status: "Assigned", odometer: numberOrNull(body.odometer) ?? vehicle.odometer,
        }, { transaction });
      } else if (action === "RETURN") {
        if (!vehicle.currentAssigneeName) throw new Error("Vehicle is not assigned");
        await VehicleAssignment.create({
          id: randomUUID(), vehicleId, action: "RETURNED", fromPersonId: vehicle.currentAssigneeId,
          fromPersonName: vehicle.currentAssigneeName, assignedAt: vehicle.assignedAt || new Date(),
          returnedAt: clean(body.returnedAt) ? new Date(body.returnedAt) : new Date(),
          odometer: numberOrNull(body.odometer), handoverProofUrl: optional(body.handoverProofUrl),
          remarks: optional(body.remarks), performedById: actor.userId, performedByName: actor.userName || actor.userRole,
        }, { transaction });
        await vehicle.update({
          currentAssigneeId: null, currentAssigneeName: null, currentAssigneeType: null,
          assignedAt: null, status: "Available", odometer: numberOrNull(body.odometer) ?? vehicle.odometer,
        }, { transaction });
      } else if (action === "SALE") {
        const buyerName = clean(body.buyerName);
        if (!buyerName) throw new Error("Buyer name is required");
        const saleAmount = numberOrNull(body.saleAmount);
        if (saleAmount === null || saleAmount < 0) throw new Error("Valid sale amount is required");

        await VehicleAssignment.create({
          id: randomUUID(), vehicleId, action: "SOLD",
          fromPersonId: vehicle.currentAssigneeId,
          fromPersonName: vehicle.currentAssigneeName || vehicle.ownerName || "Company",
          toPersonName: buyerName,
          assignedAt: clean(body.saleDate) ? new Date(body.saleDate) : new Date(),
          purpose: `Vehicle Sold for Rs. ${saleAmount.toLocaleString("en-IN")}`,
          handoverProofUrl: optional(body.buyerIdProofUrl),
          remarks: optional(body.saleRemarks) || `Sold to ${buyerName}`,
          performedById: actor.userId, performedByName: actor.userName || actor.userRole,
        }, { transaction });

        await vehicle.update({
          status: "Sold",
          currentAssigneeId: null,
          currentAssigneeName: null,
          currentAssigneeType: null,
          assignedAt: null,
          buyerName,
          buyerContact: optional(body.buyerContact),
          buyerAddress: optional(body.buyerAddress),
          saleDate: optional(body.saleDate) || new Date().toISOString().slice(0, 10),
          saleAmount,
          paymentMode: optional(body.paymentMode) || "Cash",
          paymentModeOther: optional(body.paymentModeOther),
          paymentReference: optional(body.paymentReference),
          saleOdometer: numberOrNull(body.saleOdometer),
          rtoNocNumber: optional(body.rtoNocNumber),
          saleWitness: optional(body.saleWitness),
          rcTransferStatus: optional(body.rcTransferStatus) || "Pending",
          buyerIdProofType: optional(body.buyerIdProofType),
          buyerIdProofTypeOther: optional(body.buyerIdProofTypeOther),
          buyerIdProofNumber: optional(body.buyerIdProofNumber),
          buyerIdProofUrl: optional(body.buyerIdProofUrl),
          saleRemarks: optional(body.saleRemarks),
          isInstallmentSale: body.isInstallmentSale ? true : false,
          paymentInstallments: typeof body.paymentInstallments === "string" ? body.paymentInstallments : (body.paymentInstallments ? JSON.stringify(body.paymentInstallments) : null),
          handoverDate: optional(body.handoverDate),
          handoverLocation: optional(body.handoverLocation),
          handoverBy: optional(body.handoverBy),
          receivedBy: optional(body.receivedBy),
          rcHandedOver: optional(body.rcHandedOver) || "No",
          insuranceHandedOver: optional(body.insuranceHandedOver) || "No",
        }, { transaction });
      } else if (action === "STATUS") {
        const nextStatus = clean(body.status);
        if (!["Available", "Assigned", "Maintenance", "Out of Service", "Sold"].includes(nextStatus)) throw new Error("Invalid vehicle status");
        await vehicle.update({ status: nextStatus, remarks: optional(body.remarks) ?? vehicle.remarks }, { transaction });
      } else {
        const allowed = ["ownerName", "vehicleName", "vehicleType", "make", "model", "variant", "manufacturingYear", "color", "fuelType", "chassisNumber", "engineNumber", "purchaseDate", "purchaseValue", "odometer", "ownershipType", "location", "photoUrl", "remarks", "buyerName", "buyerContact", "buyerAddress", "saleDate", "saleAmount", "paymentMode", "paymentModeOther", "paymentReference", "saleOdometer", "rtoNocNumber", "saleWitness", "rcTransferStatus", "buyerIdProofType", "buyerIdProofTypeOther", "buyerIdProofNumber", "buyerIdProofUrl", "saleRemarks", "isInstallmentSale", "paymentInstallments", "handoverDate", "handoverLocation", "handoverBy", "receivedBy", "rcHandedOver", "insuranceHandedOver"];
        const updates: any = {};
        for (const field of allowed) if (Object.prototype.hasOwnProperty.call(body, field)) updates[field] = optional(body[field]);
        await vehicle.update(updates, { transaction });
      }
      return vehicle;
    });
    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error("[PATCH /api/vehicles]", error);
    return fail(error.message || "Failed to update vehicle", error.message === "Vehicle not found" ? 404 : 400);
  }
}

export async function DELETE(request: Request) {
  try {
    const auth = await requireVehicleApiAccess();
    if (auth.response) return auth.response;
    const params = new URL(request.url).searchParams;
    const documentId = clean(params.get("documentId"));
    const vehicleId = clean(params.get("vehicleId"));
    if (documentId) {
      const deleted = await VehicleDocument.destroy({ where: { id: documentId } });
      return deleted ? NextResponse.json({ success: true }) : fail("Document not found", 404);
    }
    if (vehicleId) {
      const deleted = await Vehicle.destroy({ where: { id: vehicleId } });
      return deleted ? NextResponse.json({ success: true }) : fail("Vehicle not found", 404);
    }
    return fail("Vehicle or document is required");
  } catch (error: any) {
    return fail(error.message || "Failed to delete record", 500);
  }
}
