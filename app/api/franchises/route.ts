import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import sequelize from "@/lib/sequelize";
import Franchise from "@/models/sequelize/Franchise";
import { logAudit } from "@/lib/audit";

import User from "@/models/sequelize/User";
import Territory from "@/models/sequelize/Territory";

// GET: Retrieve franchise partners list
export async function GET() {
  try {
    await sequelize.authenticate();
    const franchises = await Franchise.findAll({
      where: { status: "active" },
      order: [['createdAt', 'DESC']]
    });

    const userIds = franchises.map(f => f.user).filter(Boolean);
    const users = await User.findAll({
      where: { mongo_id: userIds },
      attributes: ['mongo_id', 'name', 'email', 'mobile', 'status']
    });

    const territoryIds = franchises.map(f => f.territory).filter(Boolean);
    const territories = await Territory.findAll({
      where: { mongo_id: territoryIds },
      attributes: ['mongo_id', 'name']
    });

    const userMap = users.reduce((acc: any, u: any) => {
      acc[u.mongo_id] = u.toJSON();
      return acc;
    }, {});

    const territoryMap = territories.reduce((acc: any, t: any) => {
      acc[t.mongo_id] = t.toJSON();
      return acc;
    }, {});

    const data = franchises.map(f => {
      const fJson = f.toJSON() as any;
      fJson.user = userMap[fJson.user] || null;
      fJson.territory = territoryMap[fJson.territory] || null;
      return fJson;
    });

    return NextResponse.json({ success: true, data });
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

    await sequelize.authenticate();
    const body = await req.json();
    const { userId, territoryId, agreementUrl, revenueSharing, leadsGenerated, reportsSubmitted, brandingCompliance, territoryRisk, complaintsCount, escalationsCount } = body;

    if (!userId || !territoryId || !revenueSharing) {
      return NextResponse.json({ success: false, error: "Missing required franchise parameters" }, { status: 400 });
    }

    let franchise = await Franchise.findOne({ where: { user: userId } });
    if (!franchise) {
      franchise = await Franchise.create({
        mongo_id: Date.now().toString(),
        user: userId,
        territory: territoryId,
        revenueSharing,
        status: "active"
      });
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
      entityId: franchise.mongo_id,
      details: `Updated Franchise profile for partner: ${userId}. Compliance: ${brandingCompliance || "Compliant"}, Risk: ${territoryRisk || "Low"}.`,
    });

    return NextResponse.json({ success: true, data: franchise });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
