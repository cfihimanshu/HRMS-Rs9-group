import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/db";
import Franchise from "@/models/Franchise";
import { logAudit } from "@/lib/audit";

// GET: Retrieve franchise partners list
export async function GET() {
  try {
    await dbConnect();
    const franchises = await Franchise.find({ status: "active" })
      .populate("user", "name email mobile status")
      .populate("territory", "name")
      .sort({ createdAt: -1 });

    return NextResponse.json({ success: true, data: franchises });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Save or update Franchise profile
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    const body = await req.json();
    const { userId, territoryId, agreementUrl, revenueSharing, leadsGenerated, reportsSubmitted, brandingCompliance, territoryRisk, complaintsCount, escalationsCount } = body;

    if (!userId || !territoryId || !revenueSharing) {
      return NextResponse.json({ success: false, error: "Missing required franchise parameters" }, { status: 400 });
    }

    let franchise = await Franchise.findOne({ user: userId });
    if (!franchise) {
      franchise = new Franchise({ user: userId, territory: territoryId, revenueSharing });
    }

    if (territoryId !== undefined) franchise.territory = territoryId;
    if (agreementUrl !== undefined) franchise.agreementUrl = agreementUrl;
    if (revenueSharing !== undefined) franchise.revenueSharing = revenueSharing;
    if (leadsGenerated !== undefined) franchise.leadsGenerated = leadsGenerated;
    if (reportsSubmitted !== undefined) franchise.reportsSubmitted = reportsSubmitted;
    if (brandingCompliance !== undefined) franchise.brandingCompliance = brandingCompliance;
    if (territoryRisk !== undefined) franchise.territoryRisk = territoryRisk;
    if (complaintsCount !== undefined) franchise.complaintsCount = complaintsCount;
    if (escalationsCount !== undefined) franchise.escalationsCount = escalationsCount;

    await franchise.save();

    // Audit log entry
    await logAudit({
      userId: (session.user as any).id,
      action: "UPDATE_FRANCHISE_PROFILE",
      entity: "Franchise",
      entityId: franchise._id.toString(),
      details: `Updated Franchise profile for partner: ${userId}. Compliance: ${brandingCompliance || "Compliant"}, Risk: ${territoryRisk || "Low"}.`,
    });

    return NextResponse.json({ success: true, data: franchise });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
