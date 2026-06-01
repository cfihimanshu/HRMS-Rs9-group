import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/db";
import VendorRegistration from "@/models/VendorRegistration";
import { logAudit } from "@/lib/audit";

// POST: Submit FORM-10 Vendor Registration
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const registeredBy = (session.user as any).id;
    const body = await req.json();

    const {
      vendorName,
      category,
      contact,
      panGst,
      serviceType,
      agreementUrl,
      paymentTerms,
      riskLevel,
    } = body;

    if (!vendorName || !category || !contact || !panGst || !agreementUrl) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }

    await dbConnect();

    const record = await VendorRegistration.create({
      registeredBy,
      vendorName,
      category,
      contact,
      panGst,
      serviceType: serviceType || "General",
      agreementUrl,
      paymentTerms: paymentTerms || "Standard",
      riskLevel: riskLevel || "Low",
    });

    await logAudit({
      userId: registeredBy,
      action: "SUBMIT_FORM_10",
      entity: "VendorRegistration",
      details: `Submitted vendor registration for ${vendorName}`,
      ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
    });

    return NextResponse.json({ success: true, data: record }, { status: 201 });
  } catch (error: any) {
    console.error("FORM-10 Submission Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// GET: Fetch FORM-10 records
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const records = await VendorRegistration.find()
      .populate("registeredBy", "name role")
      .sort({ createdAt: -1 })
      .limit(50);

    return NextResponse.json({ success: true, data: records });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
