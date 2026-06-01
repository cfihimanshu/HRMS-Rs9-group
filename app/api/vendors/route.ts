import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/db";
import Vendor from "@/models/Vendor";
import { logAudit } from "@/lib/audit";

// GET: Retrieve vendors list
export async function GET() {
  try {
    await dbConnect();
    const vendors = await Vendor.find({ status: "active" })
      .populate("user", "name email mobile status")
      .sort({ createdAt: -1 });

    return NextResponse.json({ success: true, data: vendors });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Save or update Vendor profile
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    const body = await req.json();
    const { userId, category, agreementUrl, serviceType, paymentTerms, riskCategory, performanceScore, complaintsCount, renewalDate } = body;

    if (!userId || !category || !paymentTerms) {
      return NextResponse.json({ success: false, error: "Missing required vendor fields" }, { status: 400 });
    }

    let vendor = await Vendor.findOne({ user: userId });
    if (!vendor) {
      vendor = new Vendor({ user: userId, category, paymentTerms });
    }

    if (category !== undefined) vendor.category = category;
    if (agreementUrl !== undefined) vendor.agreementUrl = agreementUrl;
    if (serviceType !== undefined) vendor.serviceType = serviceType;
    if (paymentTerms !== undefined) vendor.paymentTerms = paymentTerms;
    if (riskCategory !== undefined) vendor.riskCategory = riskCategory;
    if (performanceScore !== undefined) vendor.performanceScore = performanceScore;
    if (complaintsCount !== undefined) vendor.complaintsCount = complaintsCount;
    if (renewalDate !== undefined) vendor.renewalDate = new Date(renewalDate);

    await vendor.save();

    // Audit log entry
    await logAudit({
      userId: (session.user as any).id,
      action: "UPDATE_VENDOR_PROFILE",
      entity: "Vendor",
      entityId: vendor._id.toString(),
      details: `Updated Vendor profile for user: ${userId} (${category}). Risk: ${riskCategory || "Low"}. Score: ${performanceScore || 100}%.`,
    });

    return NextResponse.json({ success: true, data: vendor });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
