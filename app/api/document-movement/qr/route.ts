import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { requireApiSession } from "@/lib/apiAuth";
import DocumentRegister from "@/models/sequelize/DocumentRegister";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const auth = await requireApiSession();
    if (auth.response) return auth.response;
    const id = new URL(request.url).searchParams.get("documentId")?.trim();
    if (!id) return NextResponse.json({ success: false, error: "Document is required" }, { status: 400 });
    const document = await DocumentRegister.findByPk(id);
    if (!document) return NextResponse.json({ success: false, error: "Document not found" }, { status: 404 });
    const origin = new URL(request.url).origin;
    const value = `${origin}/dashboard/document-movement?documentId=${encodeURIComponent(id)}`;
    const dataUrl = await QRCode.toDataURL(value, { width: 320, margin: 2, errorCorrectionLevel: "M" });
    return NextResponse.json({ success: true, dataUrl, value, documentNumber: document.documentNumber });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || "QR generation failed" }, { status: 500 });
  }
}
