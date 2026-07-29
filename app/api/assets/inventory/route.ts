import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import sequelize from "@/lib/sequelize";
import AssetInventory from "@/models/sequelize/AssetInventory";
import AssetAssignmentHistory from "@/models/sequelize/AssetAssignmentHistory";
import EmployeeProfile from "@/models/sequelize/EmployeeProfile";
import User from "@/models/sequelize/User";
import Department from "@/models/sequelize/Department";
import { Op } from "sequelize";

const getAssetSearchTokens = (asset: any): string[] => {
  const source = [
    asset.serialNumber,
    asset.assetDetail,
    asset.customFields,
    asset.oldAssetId
  ].filter(Boolean).join(" ");
  return Array.from(new Set(source.match(/[A-Za-z0-9]{8,}/g) || []));
};

const allocationMatchesAsset = (allocation: unknown, asset: any): boolean => {
  const text = String(allocation || "");
  if (!text.trim()) return false;
  if (text.includes(`[Inventory:${asset.id}]`)) return true;
  return getAssetSearchTokens(asset).some(token => text.toLowerCase().includes(token.toLowerCase()));
};

const parseLegacyAssignedDate = (allocation: unknown): Date | null => {
  const match = String(allocation || "").match(/Assigned:\s*(\d{4}-\d{2}-\d{2})/i);
  if (!match) return null;
  const date = new Date(`${match[1]}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
};

const parseOptionalDate = (value: unknown, endOfDay = false): Date | null => {
  if (!value) return null;
  const date = new Date(`${String(value).slice(0, 10)}T${endOfDay ? "23:59:59" : "00:00:00"}`);
  return Number.isNaN(date.getTime()) ? null : date;
};

// ─── GET: Fetch all inventory assets ──────────────────────────────────────────
async function ensureColumns() {
  try { await sequelize.query(`ALTER TABLE asset_inventory ADD customFields LONGTEXT NULL;`); } catch (_) {}
  try { await sequelize.query(`ALTER TABLE asset_inventory ADD photoUrl LONGTEXT NULL;`); } catch (_) {}
  try { await sequelize.query(`ALTER TABLE asset_inventory ADD phonePassword TEXT NULL;`); } catch (_) {}
  try { await sequelize.query(`ALTER TABLE asset_inventory ADD simCompany TEXT NULL;`); } catch (_) {}
  try { await sequelize.query(`ALTER TABLE asset_inventory ADD sim1Number TEXT NULL;`); } catch (_) {}
  try { await sequelize.query(`ALTER TABLE asset_inventory ADD sim2Number TEXT NULL;`); } catch (_) {}
  try { await sequelize.query(`ALTER TABLE asset_inventory ADD externalWhatsappNo TEXT NULL;`); } catch (_) {}
  try { await sequelize.query(`ALTER TABLE asset_inventory ADD laptopOs TEXT NULL;`); } catch (_) {}
  try { await sequelize.query(`ALTER TABLE asset_inventory ADD laptopHostName TEXT NULL;`); } catch (_) {}
  try { await sequelize.query(`ALTER TABLE asset_inventory ADD simPlanType TEXT NULL;`); } catch (_) {}
  try { await sequelize.query(`ALTER TABLE asset_inventory ADD routerWifiSsid TEXT NULL;`); } catch (_) {}
  try { await sequelize.query(`ALTER TABLE asset_inventory ADD printerCartridge TEXT NULL;`); } catch (_) {}
  try { await sequelize.query(`ALTER TABLE asset_inventory ADD furnitureLocation TEXT NULL;`); } catch (_) {}
  try { await sequelize.query(`ALTER TABLE asset_inventory ADD socialMediaApp TEXT NULL;`); } catch (_) {}
  try { await sequelize.query(`ALTER TABLE asset_inventory ADD socialMediaUsername TEXT NULL;`); } catch (_) {}
  try { await sequelize.query(`ALTER TABLE asset_inventory ADD socialMediaPassword TEXT NULL;`); } catch (_) {}
  try { await sequelize.query(`ALTER TABLE asset_inventory ADD phoneCharger TEXT NULL;`); } catch (_) {}
  try { await sequelize.query(`ALTER TABLE asset_inventory ADD phoneColor TEXT NULL;`); } catch (_) {}
  try { await sequelize.query(`ALTER TABLE asset_inventory ADD laptopCharger TEXT NULL;`); } catch (_) {}
  try { await sequelize.query(`ALTER TABLE asset_inventory ADD laptopBag TEXT NULL;`); } catch (_) {}
  try { await sequelize.query(`ALTER TABLE asset_inventory ADD simPuk TEXT NULL;`); } catch (_) {}
  try { await sequelize.query(`ALTER TABLE asset_inventory ADD simKycName TEXT NULL;`); } catch (_) {}
  try { await sequelize.query(`ALTER TABLE asset_inventory ADD routerIp TEXT NULL;`); } catch (_) {}
  try { await sequelize.query(`ALTER TABLE asset_inventory ADD routerAdminPass TEXT NULL;`); } catch (_) {}
  try { await sequelize.query(`ALTER TABLE asset_inventory ADD routerIsp TEXT NULL;`); } catch (_) {}
  try { await sequelize.query(`ALTER TABLE asset_inventory ADD printerIp TEXT NULL;`); } catch (_) {}
  try { await sequelize.query(`ALTER TABLE asset_inventory ADD assignedToUserId TEXT NULL;`); } catch (_) {}
  try { await sequelize.query(`ALTER TABLE asset_inventory ADD assignedToName TEXT NULL;`); } catch (_) {}
  try { await sequelize.query(`ALTER TABLE asset_inventory ADD assignedAt DATETIME NULL;`); } catch (_) {}
  try { await sequelize.query(`ALTER TABLE asset_inventory ADD handoverDate DATE NULL;`); } catch (_) {}
  try { await sequelize.query(`ALTER TABLE asset_inventory ADD assignedBy TEXT NULL;`); } catch (_) {}
  try { await sequelize.query(`ALTER TABLE asset_inventory ADD assignedToDeptId TEXT NULL;`); } catch (_) {}
  try { await sequelize.query(`ALTER TABLE asset_inventory ADD assignedDate DATETIME NULL;`); } catch (_) {}
  try { await sequelize.query(`ALTER TABLE asset_inventory ADD handoverPdfUrl LONGTEXT NULL;`); } catch (_) {}
  try { await sequelize.query(`ALTER TABLE asset_inventory ADD handoverRemarks TEXT NULL;`); } catch (_) {}
}

// ─── GET: Fetch all inventory assets ──────────────────────────────────────────
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const userRole = (session.user as any).role || "Employee";
    const userDept = (session.user as any).department || "";
    const isOwner = userRole === "Owner";
    const isAdministration = userDept.toLowerCase().includes("administration");
    if (!isOwner && !isAdministration) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    await sequelize.authenticate();
    await ensureColumns();
    try { await AssetInventory.sync(); } catch (_) {}
    try { await AssetAssignmentHistory.sync(); } catch (_) {}

    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get("companyId");

    const where: any = {};
    if (companyId) where.companyId = companyId;

    let records;
    try {
      records = await AssetInventory.findAll({ where, order: [["createdAt", "DESC"]] });
    } catch (err: any) {
      if (err?.message?.includes("Unknown column")) {
        console.warn("[/api/assets/inventory GET] Missing column detected, re-running ensureColumns & retrying...", err.message);
        await ensureColumns();
        records = await AssetInventory.findAll({ where, order: [["createdAt", "DESC"]] });
      } else {
        throw err;
      }
    }

    const assetIds = records.map((record: any) => String(record.id));
    const [profiles, users, historyRows] = await Promise.all([
      EmployeeProfile.findAll({
        where: { allocatedAsset: { [Op.not]: null } },
        attributes: ["user", "employeeId", "allocatedAsset"],
        raw: true
      }).catch(() => []),
      User.findAll({ attributes: ["id", "name"], raw: true }).catch(() => []),
      }),
      User.findAll({ attributes: ["id", "name"], raw: true }),
      assetIds.length
        ? AssetAssignmentHistory.findAll({
            where: { assetId: { [Op.in]: assetIds } },
            order: [["createdAt", "DESC"]],
            raw: true
          }).catch(() => [])
          })
        : []
    ]);
    const userNameMap = new Map(users.map((user: any) => [String(user.id), user.name || "Unknown Employee"]));
    const historiesByAsset = new Map<string, any[]>();
    historyRows.forEach((row: any) => {
      const key = String(row.assetId);
      historiesByAsset.set(key, [...(historiesByAsset.get(key) || []), row]);
    });

    const data = records.map((record: any) => {
      const asset = record.toJSON();
      const assignmentHistory = historiesByAsset.get(String(asset.id)) || [];
      if (asset.assignedToUserId) {
        return {
          ...asset,
          status: "In Use",
          assignedToName: asset.assignedToName || userNameMap.get(String(asset.assignedToUserId)) || "Assigned Employee",
          assignmentHistory
        };
      }
      const legacyProfile: any = profiles.find((profile: any) =>
        allocationMatchesAsset(profile.allocatedAsset, asset)
      );
      if (!legacyProfile) return { ...asset, assignmentHistory };
      const legacyAssignedAt = parseLegacyAssignedDate(legacyProfile.allocatedAsset);
      const syntheticHistory = assignmentHistory.length ? [] : [{
        id: `legacy-${asset.id}`,
        assetId: asset.id,
        action: "Legacy Assignment",
        fromUserId: null,
        fromUserName: null,
        toUserId: legacyProfile.user,
        toUserName: userNameMap.get(String(legacyProfile.user)) || legacyProfile.employeeId || "Assigned Employee",
        assignedDate: legacyAssignedAt,
        handoverDate: null,
        performedBy: "Legacy data",
        notes: "Matched from employee asset registry",
        createdAt: legacyAssignedAt
      }];
      return {
        ...asset,
        status: "In Use",
        assignedToUserId: legacyProfile.user,
        assignedToName: userNameMap.get(String(legacyProfile.user)) || legacyProfile.employeeId || "Assigned Employee",
        assignedAt: asset.assignedAt || legacyAssignedAt,
        assignmentSource: "legacy",
        assignmentHistory: [...assignmentHistory, ...syntheticHistory]
      };
    });

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("[/api/assets/inventory GET]", error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// ─── POST: Register a new inventory asset ─────────────────────────────────────
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const userRole = (session.user as any).role || "Employee";
    const userDept = (session.user as any).department || "";
    const userName = session.user.name || "Owner";
    const isOwner = userRole === "Owner";
    const isAdministration = userDept.toLowerCase().includes("administration");
    if (!isOwner && !isAdministration) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    await sequelize.authenticate();
    await ensureColumns();
    try { await AssetInventory.sync(); } catch (_) {}

    const body = await req.json();
    const { id, oldAssetId, assetType, assetDetail, serialNumber, purchaseDate, purchaseValue, condition, companyId, notes, photoUrl, customFields, phonePassword: bodyPassword, simCompany: bodySimComp, sim1Number: bodySim1No, sim2Number: bodySim2No } = body;

    if (!id || !id.trim()) {
      return NextResponse.json({ success: false, error: "Asset ID is required" }, { status: 400 });
    }
    if (!assetType) {
      return NextResponse.json({ success: false, error: "Asset Type is required" }, { status: 400 });
    }

    const existing = await AssetInventory.findByPk(id.trim());
    if (existing) {
      return NextResponse.json({ success: false, error: `Asset with ID '${id.trim()}' already exists` }, { status: 400 });
    }

    // Extract custom values for dedicated columns
    let parsed: any = {};
    try { if (customFields) parsed = JSON.parse(customFields); } catch (_) {}
    const af = parsed.assetFields || {};

    const extractedPassword = bodyPassword || af.phonePassword || af.laptopPassword || "";
    const extractedSimComp = bodySimComp || af.phoneSim1OperatorCustom || (af.phoneSim1Operator !== "Other" ? af.phoneSim1Operator : "") || af.simOperatorCustom || af.simOperator || "";
    const extractedSim1No = bodySim1No || af.phoneSim1No || af.simMobile || "";
    const extractedSim2No = bodySim2No || af.phoneSim2No || "";
    const extractedExtWaNo = af.phoneExternalWhatsappNo || (notes ? notes.match(/External WhatsApp:\s*([0-9\s+]+)/i)?.[1] : "") || "";

    const record = await AssetInventory.create({
      id: id.trim(),
      oldAssetId: oldAssetId ? oldAssetId.trim() : "",
      assetType,
      assetDetail: assetDetail || "",
      serialNumber: serialNumber || "",
      purchaseDate: purchaseDate || null,
      purchaseValue: purchaseValue || "",
      condition: condition || "Good",
      status: "Available",
      companyId: companyId || null,
      notes: notes || "",
      registeredBy: userName,
      photoUrl: photoUrl || null,
      customFields: customFields || null,
      phonePassword: extractedPassword,
      simCompany: extractedSimComp,
      sim1Number: extractedSim1No,
      sim2Number: extractedSim2No,
      externalWhatsappNo: extractedExtWaNo,
      laptopOs: af.laptopOsCustom || (af.laptopOs !== "Other" ? af.laptopOs : "") || "",
      laptopHostName: af.laptopHostName || "",
      simPlanType: af.simPlanTypeCustom || (af.simPlanType !== "Other" ? af.simPlanType : "") || "",
      routerWifiSsid: af.routerWifiSsid || "",
      printerCartridge: af.printerCartridge || "",
      furnitureLocation: af.furnitureLocation || "",
      socialMediaApp: af.phoneSocialMediaAppCustom || (af.phoneSocialMediaApp !== "Other" ? af.phoneSocialMediaApp : "") || "",
      socialMediaUsername: af.phoneSocialMediaUsername || "",
      socialMediaPassword: af.phoneSocialMediaPassword || "",
      phoneCharger: af.phoneCharger || "",
      phoneColor: af.phoneColor || "",
      laptopCharger: af.laptopCharger || "",
      laptopBag: af.laptopBag || "",
      simPuk: af.simPuk || "",
      simKycName: af.simKycName || "",
      routerIp: af.routerIp || "",
      routerAdminPass: af.routerAdminPass || "",
      routerIsp: af.routerIsp || "",
      printerIp: af.printerIp || "",
    });

    return NextResponse.json({ success: true, data: record });
  } catch (error: any) {
    console.error("[/api/assets/inventory POST]", error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// ─── PUT: Update an inventory asset ───────────────────────────────────────────
export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const userRole = (session.user as any).role || "Employee";
    const userDept = (session.user as any).department || "";
    const isOwner = userRole === "Owner";
    const isAdministration = userDept.toLowerCase().includes("administration");
    if (!isOwner && !isAdministration) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    await sequelize.authenticate();
    await ensureColumns();
    try { await AssetInventory.sync(); } catch (_) {}

    const body = await req.json();
    const { id, oldAssetId, assetType, assetDetail, serialNumber, purchaseDate, purchaseValue, condition, status, companyId, notes, photoUrl, customFields, phonePassword: bodyPassword, simCompany: bodySimComp, sim1Number: bodySim1No, sim2Number: bodySim2No } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "Missing asset id" }, { status: 400 });
    }

    const asset = await AssetInventory.findByPk(id);
    if (!asset) {
      return NextResponse.json({ success: false, error: "Asset not found" }, { status: 404 });
    }

    if (oldAssetId !== undefined) asset.oldAssetId = oldAssetId ? oldAssetId.trim() : "";
    if (assetType !== undefined) asset.assetType = assetType;
    if (assetDetail !== undefined) asset.assetDetail = assetDetail;
    if (serialNumber !== undefined) asset.serialNumber = serialNumber;
    if (purchaseDate !== undefined) asset.purchaseDate = purchaseDate || null;
    if (purchaseValue !== undefined) asset.purchaseValue = purchaseValue;
    if (condition !== undefined) asset.condition = condition;
    if (status !== undefined) asset.status = status;
    if (companyId !== undefined) asset.companyId = companyId || null;
    if (notes !== undefined) asset.notes = notes;
    if (photoUrl !== undefined) asset.photoUrl = photoUrl || null;
    if (customFields !== undefined) asset.customFields = customFields || null;

    let parsed: any = {};
    try { if (asset.customFields) parsed = JSON.parse(asset.customFields); } catch (_) {}
    const af = parsed.assetFields || {};

    const extractedPassword = bodyPassword || af.phonePassword || af.laptopPassword || "";
    const extractedSimComp = bodySimComp || af.phoneSim1OperatorCustom || (af.phoneSim1Operator !== "Other" ? af.phoneSim1Operator : "") || af.simOperatorCustom || af.simOperator || "";
    const extractedSim1No = bodySim1No || af.phoneSim1No || af.simMobile || "";
    const extractedSim2No = bodySim2No || af.phoneSim2No || "";
    const extractedExtWaNo = af.phoneExternalWhatsappNo || (asset.notes ? asset.notes.match(/External WhatsApp:\s*([0-9\s+]+)/i)?.[1] : "") || "";

    asset.phonePassword = extractedPassword;
    asset.simCompany = extractedSimComp;
    asset.sim1Number = extractedSim1No;
    asset.sim2Number = extractedSim2No;
    asset.externalWhatsappNo = extractedExtWaNo;
    asset.laptopOs = af.laptopOsCustom || (af.laptopOs !== "Other" ? af.laptopOs : "") || asset.laptopOs || "";
    asset.laptopHostName = af.laptopHostName || asset.laptopHostName || "";
    asset.simPlanType = af.simPlanTypeCustom || (af.simPlanType !== "Other" ? af.simPlanType : "") || asset.simPlanType || "";
    asset.routerWifiSsid = af.routerWifiSsid || asset.routerWifiSsid || "";
    asset.printerCartridge = af.printerCartridge || asset.printerCartridge || "";
    asset.furnitureLocation = af.furnitureLocation || asset.furnitureLocation || "";
    asset.socialMediaApp = af.phoneSocialMediaAppCustom || (af.phoneSocialMediaApp !== "Other" ? af.phoneSocialMediaApp : "") || asset.socialMediaApp || "";
    asset.socialMediaUsername = af.phoneSocialMediaUsername || asset.socialMediaUsername || "";
    asset.socialMediaPassword = af.phoneSocialMediaPassword || asset.socialMediaPassword || "";
    asset.phoneCharger = af.phoneCharger || asset.phoneCharger || "";
    asset.phoneColor = af.phoneColor || asset.phoneColor || "";
    asset.laptopCharger = af.laptopCharger || asset.laptopCharger || "";
    asset.laptopBag = af.laptopBag || asset.laptopBag || "";
    asset.simPuk = af.simPuk || asset.simPuk || "";
    asset.simKycName = af.simKycName || asset.simKycName || "";
    asset.routerIp = af.routerIp || asset.routerIp || "";
    asset.routerAdminPass = af.routerAdminPass || asset.routerAdminPass || "";
    asset.routerIsp = af.routerIsp || asset.routerIsp || "";
    asset.printerIp = af.printerIp || asset.printerIp || "";

    await asset.save();
    return NextResponse.json({ success: true, data: asset });
  } catch (error: any) {
    console.error("[/api/assets/inventory PUT]", error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// ─── PATCH: Assign or unassign an inventory asset ─────────────────────────────
export async function PATCH(req: Request) {
  const transaction = await sequelize.transaction();
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      await transaction.rollback();
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const dbUser = await User.findByPk((session.user as any).id, { transaction, raw: true });
    const role = String(dbUser?.role || "").toLowerCase();
    const actorProfile: any = await EmployeeProfile.findOne({
      where: { user: (session.user as any).id },
      transaction,
      raw: true
    });
    const actorDepartment: any = actorProfile?.department
      ? await Department.findOne({
          where: {
            [Op.or]: [
              { id: actorProfile.department },
              { name: actorProfile.department }
            ]
          },
          transaction,
          raw: true
        })
      : null;
    const isOwner = ["owner", "director"].includes(role);
    const isAdministration = String(actorDepartment?.name || actorProfile?.department || (session.user as any).department || "")
      .toLowerCase()
      .includes("administration");
    if (!isOwner && !isAdministration) {
      await transaction.rollback();
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { assetId, userId, currentAssignedUserId, assignedDate, handoverDate, notes, assignedToName } = body;
    if (!assetId) {
      await transaction.rollback();
      return NextResponse.json({ success: false, error: "Asset ID is required" }, { status: 400 });
    }

    const asset: any = await AssetInventory.findByPk(String(assetId), {
      transaction,
      lock: transaction.LOCK.UPDATE
    });
    if (!asset) {
      await transaction.rollback();
      return NextResponse.json({ success: false, error: "Asset not found" }, { status: 404 });
    }

    const previousUserId = asset.assignedToUserId
      ? String(asset.assignedToUserId)
      : String(currentAssignedUserId || "");
    const previousUser: any = previousUserId
      ? await User.findByPk(previousUserId, { transaction, raw: true })
      : null;
    const previousUserName = asset.assignedToName || previousUser?.name || null;
    const previousAssignedAt = asset.assignedAt || null;
    const actorName = session.user.name || String((session.user as any).id);
    const parsedHandoverDate = parseOptionalDate(handoverDate);
    if (!userId) {
      if (assignedToName && String(assignedToName).trim() !== "" && String(assignedToName) !== "null") {
        const customName = String(assignedToName).trim();
        const effectiveAssignedDate = parseOptionalDate(assignedDate) || new Date();
        asset.assignedToUserId = null;
        asset.assignedToName = customName;
        asset.assignedAt = effectiveAssignedDate;
        asset.handoverDate = handoverDate ? String(handoverDate).slice(0, 10) : null;
        asset.assignedBy = actorName;
        asset.status = "In Use";
        await asset.save({ transaction });

        await AssetAssignmentHistory.create({
          id: `AAH-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          assetId: String(asset.id),
          action: "Assigned",
          fromUserId: previousUserId || null,
          fromUserName: previousUserName,
          toUserId: null,
          toUserName: customName,
          assignedDate: effectiveAssignedDate,
          handoverDate: parsedHandoverDate,
          performedBy: actorName,
          notes: String(notes || "").trim() || null
        }, { transaction });

        await transaction.commit();
        return NextResponse.json({ success: true, data: asset });
      }

      if (previousUserId) {
        const previousProfile: any = await EmployeeProfile.findOne({
          where: { user: previousUserId },
          transaction,
          lock: transaction.LOCK.UPDATE
        });
        if (previousProfile) {
          previousProfile.allocatedAsset = String(previousProfile.allocatedAsset || "")
            .split(/\r?\n/)
            .filter((line: string) => !allocationMatchesAsset(line, asset))
            .join("\n")
            .trim();
          await previousProfile.save({ transaction });
        }
      }
      asset.assignedToUserId = null;
      asset.assignedToName = null;
      asset.assignedAt = null;
      asset.assignedBy = null;
      asset.handoverDate = parsedHandoverDate;
      asset.status = "Available";
      await asset.save({ transaction });
      await AssetAssignmentHistory.create({
        id: `AAH-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        assetId: String(asset.id),
        action: "Unassigned",
        fromUserId: previousUserId || null,
        fromUserName: previousUserName,
        toUserId: null,
        toUserName: null,
        assignedDate: previousAssignedAt,
        handoverDate: parsedHandoverDate || new Date(),
        performedBy: actorName,
        notes: String(notes || "").trim() || null
      }, { transaction });
      await transaction.commit();
      return NextResponse.json({ success: true, data: asset });
    }

    const targetUser: any = await User.findByPk(String(userId), { transaction });
    const targetProfile: any = await EmployeeProfile.findOne({
      where: { user: String(userId) },
      transaction,
      lock: transaction.LOCK.UPDATE
    });
    if (!targetUser || !targetProfile) {
      await transaction.rollback();
      return NextResponse.json({ success: false, error: "Employee profile not found" }, { status: 404 });
    }
    if (previousUserId && previousUserId !== String(userId)) {
      const previousProfile: any = await EmployeeProfile.findOne({
        where: { user: previousUserId },
        transaction,
        lock: transaction.LOCK.UPDATE
      });
      if (previousProfile) {
        previousProfile.allocatedAsset = String(previousProfile.allocatedAsset || "")
          .split(/\r?\n/)
          .filter((line: string) => !allocationMatchesAsset(line, asset))
          .join("\n")
          .trim();
        await previousProfile.save({ transaction });
      }
    }

    const effectiveAssignedDate = parseOptionalDate(assignedDate) || new Date();
    const assignmentLine =
      `[Inventory:${asset.id}] ${asset.assetType}: ${asset.assetDetail || "Asset"}` +
      `${asset.serialNumber ? ` [S/N: ${asset.serialNumber}]` : ""}` +
      ` [Assigned: ${effectiveAssignedDate.toISOString().slice(0, 10)}]` +
      `${handoverDate ? ` [Handover: ${String(handoverDate).slice(0, 10)}]` : ""}`;
    const existingAllocation = String(targetProfile.allocatedAsset || "").trim();
    const existingLines = existingAllocation ? existingAllocation.split(/\r?\n/) : [];
    targetProfile.allocatedAsset = [
      ...existingLines.filter((line: string) => line && !allocationMatchesAsset(line, asset)),
      assignmentLine
    ].join("\n");
    await targetProfile.save({ transaction });

    asset.assignedToUserId = String(targetUser.id);
    asset.assignedToName = targetUser.name || targetProfile.employeeId || "Employee";
    asset.assignedAt = effectiveAssignedDate;
    asset.handoverDate = handoverDate ? String(handoverDate).slice(0, 10) : null;
    asset.assignedBy = actorName;
    asset.status = "In Use";
    await asset.save({ transaction });
    await AssetAssignmentHistory.create({
      id: `AAH-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      assetId: String(asset.id),
      action: previousUserId && previousUserId !== String(userId) ? "Transferred" : "Assigned",
      fromUserId: previousUserId || null,
      fromUserName: previousUserName,
      toUserId: String(targetUser.id),
      toUserName: targetUser.name || targetProfile.employeeId || "Employee",
      assignedDate: effectiveAssignedDate,
      handoverDate: parsedHandoverDate,
      performedBy: actorName,
      notes: String(notes || "").trim() || null
    }, { transaction });
    await transaction.commit();

    return NextResponse.json({ success: true, data: asset });
  } catch (error: any) {
    if (!(transaction as any).finished) await transaction.rollback();
    console.error("[/api/assets/inventory PATCH]", error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// ─── DELETE: Delete an inventory asset ────────────────────────────────────────
export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const userRole = (session.user as any).role || "Employee";
    const userDept = (session.user as any).department || "";
    const isOwner = userRole === "Owner";
    const isAdministration = userDept.toLowerCase().includes("administration");
    if (!isOwner && !isAdministration) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    await sequelize.authenticate();

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ success: false, error: "Missing id" }, { status: 400 });
    }

    const asset = await AssetInventory.findByPk(id);
    if (!asset) {
      return NextResponse.json({ success: false, error: "Asset not found" }, { status: 404 });
    }

    await asset.destroy();
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[/api/assets/inventory DELETE]", error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
