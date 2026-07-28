import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import sequelize from "@/lib/sequelize";
import AssetInventory from "@/models/sequelize/AssetInventory";

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

    return NextResponse.json({ success: true, data: records });
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
