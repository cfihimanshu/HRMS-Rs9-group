import { NextResponse } from "next/server";
import AssetInventory from "@/models/sequelize/AssetInventory";
import Company from "@/models/sequelize/Company";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const id = new URL(request.url).searchParams.get("id")?.trim();
    if (!id) {
      return NextResponse.json({ success: false, error: "Asset ID is required" }, { status: 400 });
    }

    const asset = await AssetInventory.findByPk(id);
    if (!asset) {
      return NextResponse.json({ success: false, error: "Asset not found in inventory" }, { status: 404 });
    }

    let companyName = "General Stock";
    if (asset.companyId) {
      const company = await Company.findByPk(asset.companyId);
      if (company) companyName = company.name;
    }

    let parsedCustom: any = {};
    try {
      parsedCustom = asset.customFields ? JSON.parse(asset.customFields) : {};
    } catch (_) {}

    return NextResponse.json({
      success: true,
      asset: {
        id: asset.id,
        oldAssetId: asset.oldAssetId,
        assetType: asset.assetType,
        assetDetail: asset.assetDetail,
        serialNumber: asset.serialNumber,
        status: asset.status,
        condition: asset.condition,
        assignedToName: asset.assignedToName,
        companyName,
        photoUrl: asset.photoUrl,
        purchaseDate: asset.purchaseDate,
        purchaseValue: asset.purchaseValue,
        assignedAt: asset.assignedAt,
        handoverDate: asset.handoverDate,
        customFields: parsedCustom
      }
    });
  } catch (error: any) {
    console.error("[/api/assets/public-details GET]", error);
    return NextResponse.json({ success: false, error: error.message || "Failed to fetch asset details" }, { status: 500 });
  }
}
