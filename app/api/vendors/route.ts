import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import sequelize from "@/lib/sequelize";
import Vendor from "@/models/sequelize/Vendor";
import { logAudit } from "@/lib/audit";

import User from "@/models/sequelize/User";

// GET: Retrieve vendors list
export async function GET() {
  try {
    await sequelize.authenticate();
    const vendors = await Vendor.findAll({
      where: { status: "active" },
      order: [['createdAt', 'DESC']]
    });

    const userIds = vendors.map(v => v.user).filter(Boolean);
    const users = await User.findAll({
      where: { mongo_id: userIds },
      attributes: ['mongo_id', 'name', 'email', 'mobile', 'status']
    });

    const userMap = users.reduce((acc: any, u: any) => {
      acc[u.mongo_id] = u.toJSON();
      return acc;
    }, {});

    const data = vendors.map(v => {
      const vJson = v.toJSON() as any;
      vJson.user = userMap[vJson.user] || null;
      return vJson;
    });

    return NextResponse.json({ success: true, data });
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

    await sequelize.authenticate();
    const body = await req.json();
    const { userId, category, agreementUrl, serviceType, paymentTerms, riskCategory, performanceScore, complaintsCount, renewalDate } = body;

    if (!userId || !category || !paymentTerms) {
      return NextResponse.json({ success: false, error: "Missing required vendor fields" }, { status: 400 });
    }

    let vendor = await Vendor.findOne({ where: { user: userId } });
    if (!vendor) {
      vendor = await Vendor.create({
        mongo_id: Date.now().toString(),
        user: userId,
        category,
        paymentTerms,
        status: "active"
      });
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
      entityId: vendor.mongo_id,
      details: `Updated Vendor profile for user: ${userId} (${category}). Risk: ${riskCategory || "Low"}. Score: ${performanceScore || 100}%.`,
    });

    return NextResponse.json({ success: true, data: vendor });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
