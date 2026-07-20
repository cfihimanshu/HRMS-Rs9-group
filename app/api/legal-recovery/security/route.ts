import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import sequelize from "@/lib/sequelize";
import LegalSecurity from "@/models/sequelize/LegalSecurity";

// GET: Fetch all Security entries
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    await sequelize.authenticate();
    await LegalSecurity.sync({ alter: true });

    const entries = await LegalSecurity.findAll({
      order: [["createdAt", "DESC"]],
      raw: true,
    });

    return NextResponse.json({ success: true, data: entries });
  } catch (error: any) {
    console.error("[/api/legal-recovery/security GET]", error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Create a new Security entry
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const createdBy = (session.user as any).id || session.user.name;

    await sequelize.authenticate();
    await LegalSecurity.sync({ alter: true });

    const body = await req.json();
    const {
      company,
      billNo,
      billDate,
      billAmount,
      nbfcId,
      nbfcName,
      branchId,
      branchName,
      location,
      paymentDays,
      paymentStatus = "Due",
      source,
      receivedAmount,
      receivedDate,
      remarks,
    } = body;

    if (!company) {
      return NextResponse.json({ success: false, error: "Company is required" }, { status: 400 });
    }

    const newEntry = await LegalSecurity.create({
      company,
      billNo: billNo || "",
      billDate: billDate || null,
      billAmount: billAmount ? Number(billAmount) : 0,
      nbfcId: nbfcId ? String(nbfcId) : null,
      nbfcName: nbfcName || "",
      branchId: branchId ? String(branchId) : null,
      branchName: branchName || "",
      location: location || "",
      paymentDays: paymentDays ? String(paymentDays) : "",
      paymentStatus: paymentStatus || "Due",
      source: source || "",
      receivedAmount: receivedAmount ? Number(receivedAmount) : 0,
      receivedDate: receivedDate || null,
      remarks: remarks || "",
      createdBy: String(createdBy),
    });

    return NextResponse.json({ success: true, data: newEntry });
  } catch (error: any) {
    console.error("[/api/legal-recovery/security POST]", error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT: Update an existing Security entry
export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    await sequelize.authenticate();
    await LegalSecurity.sync({ alter: true });

    const body = await req.json();
    const {
      id,
      company,
      billNo,
      billDate,
      billAmount,
      nbfcId,
      nbfcName,
      branchId,
      branchName,
      location,
      paymentDays,
      paymentStatus,
      source,
      receivedAmount,
      receivedDate,
      remarks,
    } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "ID is required" }, { status: 400 });
    }

    const record = await LegalSecurity.findByPk(id);
    if (!record) {
      return NextResponse.json({ success: false, error: "Record not found" }, { status: 404 });
    }

    await record.update({
      company: company ?? record.company,
      billNo: billNo ?? record.billNo,
      billDate: billDate !== undefined ? (billDate || null) : record.billDate,
      billAmount: billAmount !== undefined ? Number(billAmount) : record.billAmount,
      nbfcId: nbfcId !== undefined ? (nbfcId ? String(nbfcId) : null) : record.nbfcId,
      nbfcName: nbfcName ?? record.nbfcName,
      branchId: branchId !== undefined ? (branchId ? String(branchId) : null) : record.branchId,
      branchName: branchName ?? record.branchName,
      location: location ?? record.location,
      paymentDays: paymentDays !== undefined ? String(paymentDays) : record.paymentDays,
      paymentStatus: paymentStatus ?? record.paymentStatus,
      source: source ?? record.source,
      receivedAmount: receivedAmount !== undefined ? Number(receivedAmount) : record.receivedAmount,
      receivedDate: receivedDate !== undefined ? (receivedDate || null) : record.receivedDate,
      remarks: remarks ?? record.remarks,
    });

    return NextResponse.json({ success: true, data: record });
  } catch (error: any) {
    console.error("[/api/legal-recovery/security PUT]", error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE: Delete a Security entry
export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, error: "ID is required" }, { status: 400 });
    }

    await sequelize.authenticate();
    await LegalSecurity.destroy({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[/api/legal-recovery/security DELETE]", error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
