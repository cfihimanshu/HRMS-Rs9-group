import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { requireApiSession } from "@/lib/apiAuth";
import AssetInventory from "@/models/sequelize/AssetInventory";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const auth = await requireApiSession();
    if (auth.response) return auth.response;

    const id = new URL(request.url).searchParams.get("assetId")?.trim();
    if (!id) {
      return NextResponse.json({ success: false, error: "Asset ID is required" }, { status: 400 });
    }

    const asset = await AssetInventory.findByPk(id);
    if (!asset) {
      return NextResponse.json({ success: false, error: "Asset not found in inventory" }, { status: 404 });
    }

    let parsedCustom: any = {};
    try {
      parsedCustom = asset.customFields ? JSON.parse(asset.customFields) : {};
    } catch (_) {}

    const fields = parsedCustom.assetFields || {};

    const textPayload = [
      `ASSET: ${asset.id || ""}${asset.oldAssetId ? ` (${asset.oldAssetId})` : ""}`,
      `TYPE: ${asset.assetType || "N/A"}`,
      `MODEL: ${String(asset.assetDetail || "N/A").slice(0, 28)}`,
      asset.serialNumber ? `SN: ${String(asset.serialNumber).slice(0, 22)}` : "",
      fields.phoneImei2 ? `IMEI2: ${String(fields.phoneImei2).slice(0, 20)}` : "",
      `USER: ${asset.assignedToName || "In Stock"}`,
      `STATUS: ${asset.status || "Available"} (Cond: ${asset.condition || "Good"})`,
      asset.purchaseValue ? `COST: Rs ${asset.purchaseValue}` : ""
    ].filter(Boolean).join("\n");

    // Generate Base64 Data URL for QR Code
    const dataUrl = await QRCode.toDataURL(textPayload, {
      width: 1000,
      margin: 1,
      errorCorrectionLevel: "H",
      color: {
        dark: "#0f172a",
        light: "#ffffff"
      }
    });

    return NextResponse.json({
      success: true,
      assetId: asset.id,
      assetType: asset.assetType,
      serialNumber: asset.serialNumber,
      textPayload,
      dataUrl
    });
  } catch (error: any) {
    console.error("[/api/assets/qr GET]", error);
    return NextResponse.json({ success: false, error: error.message || "Failed to generate QR code" }, { status: 500 });
  }
}
