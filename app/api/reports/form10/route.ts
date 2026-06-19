import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import sequelize from "@/lib/sequelize";
import VendorRegistration from "@/models/sequelize/VendorRegistration";
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

    await sequelize.authenticate();

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

import User from "@/models/sequelize/User";

// GET: Fetch FORM-10 records
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    await sequelize.authenticate();

    const records = await VendorRegistration.findAll({
      order: [['createdAt', 'DESC']],
      limit: 50
    });

    const userIds = records.map(r => (r as any).registeredBy).filter(Boolean);
    const users = await User.findAll({
      where: { mongo_id: userIds },
      attributes: ['mongo_id', 'name', 'role']
    });

    const userMap = users.reduce((acc: any, u: any) => {
      acc[u.mongo_id] = u.toJSON();
      return acc;
    }, {});

    const data = records.map(r => {
      const rJson = r.toJSON() as any;
      rJson.registeredBy = userMap[rJson.registeredBy] || null;
      return rJson;
    });

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
