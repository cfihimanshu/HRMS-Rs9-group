import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import sequelize from "@/lib/sequelize";
import AssetInventory from "@/models/sequelize/AssetInventory";

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
    try { await AssetInventory.sync({ alter: true }); } catch (_) {}

    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get("companyId");

    const where: any = {};
    if (companyId) where.companyId = companyId;

    const records = await AssetInventory.findAll({ where, order: [["createdAt", "DESC"]] });
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
    try { await AssetInventory.sync({ alter: true }); } catch (_) {}

    const body = await req.json();
    const { id, assetType, assetDetail, serialNumber, purchaseDate, purchaseValue, condition, companyId, notes, photoUrl, customFields } = body;

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

    const record = await AssetInventory.create({
      id: id.trim(),
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
    try { await AssetInventory.sync({ alter: true }); } catch (_) {}

    const body = await req.json();
    const { id, assetType, assetDetail, serialNumber, purchaseDate, purchaseValue, condition, status, companyId, notes, photoUrl, customFields } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "Missing asset id" }, { status: 400 });
    }

    const asset = await AssetInventory.findByPk(id);
    if (!asset) {
      return NextResponse.json({ success: false, error: "Asset not found" }, { status: 404 });
    }

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
