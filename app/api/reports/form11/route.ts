import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import sequelize from "@/lib/sequelize";
import FranchiseRegistration, { ensureFranchiseRegistrationSchema } from "@/models/sequelize/FranchiseRegistration";
import { logAudit } from "@/lib/audit";

// POST: Submit FORM-11 Franchise / Territory Form
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const registeredBy = (session.user as any).id;
    const body = await req.json();

    const {
      partnerName,
      contactPerson,
      email,
      mobile,
      alternateMobile,
      address,
      pincode,
      territory,
      state,
      brandProject,
      revenueShare,
      franchiseFee,
      agreementStartDate,
      agreementEndDate,
      gstin,
      pan,
      agreementUrl,
      kycDocUrl,
      reportingPerson,
      riskLevel,
      status,
    } = body;

    if (!partnerName) {
      return NextResponse.json({ success: false, error: "Partner Name is required" }, { status: 400 });
    }

    await sequelize.authenticate();
    await FranchiseRegistration.sync();
    await ensureFranchiseRegistrationSchema();

    const record = await FranchiseRegistration.create({
      id: Date.now().toString(),
      registeredBy,
      partnerName,
      contactPerson,
      email,
      mobile,
      alternateMobile,
      address,
      pincode,
      territory,
      state,
      brandProject,
      revenueShare: revenueShare || "Standard",
      franchiseFee,
      agreementStartDate,
      agreementEndDate,
      gstin,
      pan,
      agreementUrl,
      kycDocUrl,
      reportingPerson: reportingPerson || "Manager",
      riskLevel: riskLevel || "Low",
      status: status || "Pending",
    });

    await logAudit({
      userId: registeredBy,
      action: "SUBMIT_FORM_11",
      entity: "FranchiseRegistration",
      details: `Submitted franchise registration for ${partnerName} in ${territory}`,
      ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
    });

    return NextResponse.json({ success: true, data: record }, { status: 201 });
  } catch (error: any) {
    console.error("FORM-11 Submission Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

import User from "@/models/sequelize/User";

// GET: Fetch FORM-11 records
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    await sequelize.authenticate();
    await FranchiseRegistration.sync();
    await ensureFranchiseRegistrationSchema();

    const records = await FranchiseRegistration.findAll({
      order: [['createdAt', 'DESC']],
      limit: 50
    });

    const userIds = records.map(r => (r as any).registeredBy).filter(Boolean);
    const users = await User.findAll({
      where: { id: userIds },
      attributes: ['id', 'name', 'role']
    });

    const userMap = users.reduce((acc: any, u: any) => {
      acc[u.id] = u.toJSON();
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

// PUT: Update FORM-11 record
export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "Record ID is required" }, { status: 400 });
    }

    await sequelize.authenticate();
    const record = await FranchiseRegistration.findByPk(id);

    if (!record) {
      return NextResponse.json({ success: false, error: "Record not found" }, { status: 404 });
    }

    await record.update(updateData);

    return NextResponse.json({ success: true, data: record });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE: Remove FORM-11 record
export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, error: "ID parameter is required" }, { status: 400 });
    }

    await sequelize.authenticate();
    const deletedCount = await FranchiseRegistration.destroy({ where: { id } });

    if (deletedCount === 0) {
      return NextResponse.json({ success: false, error: "Record not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Franchise partner deleted successfully" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
