import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import sequelize from "@/lib/sequelize";
import LegalSecurity from "@/models/sequelize/LegalSecurity";

async function syncSecurityTableSchema() {
  try {
    await sequelize.authenticate();
    try {
      await LegalSecurity.sync({ alter: true });
    } catch (syncErr: any) {
      await LegalSecurity.sync();
    }

    // Safely ensure all missing columns are added to live MySQL DB
    const colsToEnsure = [
      "ALTER TABLE legal_securities ADD COLUMN siteType VARCHAR(255) DEFAULT NULL;",
      "ALTER TABLE legal_securities ADD COLUMN offerRef VARCHAR(255) DEFAULT NULL;",
      "ALTER TABLE legal_securities ADD COLUMN coverageHours INT DEFAULT 24;",
      "ALTER TABLE legal_securities ADD COLUMN shiftHours INT DEFAULT 8;",
      "ALTER TABLE legal_securities ADD COLUMN guardsPerShift INT DEFAULT 1;",
      "ALTER TABLE legal_securities ADD COLUMN totalDailyGuards INT DEFAULT 3;",
      "ALTER TABLE legal_securities ADD COLUMN shiftRate DECIMAL(12,2) DEFAULT 0.00;",
      "ALTER TABLE legal_securities ADD COLUMN allowancePerShift DECIMAL(12,2) DEFAULT 0.00;",
      "ALTER TABLE legal_securities ADD COLUMN durationDays INT DEFAULT 1;",
      "ALTER TABLE legal_securities ADD COLUMN totalGuardCost DECIMAL(12,2) DEFAULT 0.00;",
      "ALTER TABLE legal_securities ADD COLUMN totalAllowanceCost DECIMAL(12,2) DEFAULT 0.00;",
      "ALTER TABLE legal_securities ADD COLUMN guardName VARCHAR(255) DEFAULT NULL;",
      "ALTER TABLE legal_securities ADD COLUMN guardPhone VARCHAR(50) DEFAULT NULL;",
      "ALTER TABLE legal_securities ADD COLUMN guardDetailsJson LONGTEXT DEFAULT NULL;",
      "ALTER TABLE legal_securities ADD COLUMN guardPhotoUrl LONGTEXT DEFAULT NULL;",
      "ALTER TABLE legal_securities ADD COLUMN billInvoiceUrl LONGTEXT DEFAULT NULL;",
      "ALTER TABLE legal_securities ADD COLUMN paymentMethod VARCHAR(100) DEFAULT NULL;",
      "ALTER TABLE legal_securities ADD COLUMN paymentDays VARCHAR(50) DEFAULT NULL;",
      "ALTER TABLE legal_securities ADD COLUMN paymentStatus VARCHAR(50) DEFAULT 'Due';",
      "ALTER TABLE legal_securities ADD COLUMN source VARCHAR(100) DEFAULT NULL;",
      "ALTER TABLE legal_securities ADD COLUMN receivedAmount DECIMAL(12,2) DEFAULT 0.00;",
      "ALTER TABLE legal_securities ADD COLUMN receivedDate DATE DEFAULT NULL;",
      "ALTER TABLE legal_securities ADD COLUMN remarks TEXT DEFAULT NULL;",
      "ALTER TABLE legal_securities ADD COLUMN createdBy VARCHAR(100) DEFAULT NULL;",
    ];

    for (const query of colsToEnsure) {
      try {
        await sequelize.query(query);
      } catch (e) {}
    }

    // Ensure LONGTEXT column types for image & roster JSON
    try {
      await sequelize.query("ALTER TABLE legal_securities MODIFY COLUMN guardDetailsJson LONGTEXT DEFAULT NULL;");
      await sequelize.query("ALTER TABLE legal_securities MODIFY COLUMN guardPhotoUrl LONGTEXT DEFAULT NULL;");
    } catch (e) {}
  } catch (err: any) {
    console.warn("LegalSecurity sync warning:", err.message);
  }
}

// GET: Fetch all Security entries
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    await syncSecurityTableSchema();

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

    await syncSecurityTableSchema();

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
      siteType,
      offerRef,
      coverageHours,
      shiftHours,
      guardsPerShift,
      totalDailyGuards,
      shiftRate,
      allowancePerShift,
      durationDays,
      totalGuardCost,
      totalAllowanceCost,
      guardName,
      guardPhone,
      guardDetailsJson,
      guardPhotoUrl,
      billInvoiceUrl,
      paymentMethod,
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
      billAmount: billAmount !== undefined ? Number(billAmount) : 0,
      nbfcId: nbfcId ? String(nbfcId) : null,
      nbfcName: nbfcName || "",
      branchId: branchId ? String(branchId) : null,
      branchName: branchName || "",
      location: location || "",
      siteType: siteType || "",
      offerRef: offerRef || "",
      coverageHours: coverageHours ? Number(coverageHours) : null,
      shiftHours: shiftHours ? Number(shiftHours) : null,
      guardsPerShift: guardsPerShift ? Number(guardsPerShift) : null,
      totalDailyGuards: totalDailyGuards ? Number(totalDailyGuards) : null,
      shiftRate: shiftRate !== undefined ? Number(shiftRate) : 0,
      allowancePerShift: allowancePerShift !== undefined ? Number(allowancePerShift) : 0,
      durationDays: durationDays ? Number(durationDays) : null,
      totalGuardCost: totalGuardCost !== undefined ? Number(totalGuardCost) : 0,
      totalAllowanceCost: totalAllowanceCost !== undefined ? Number(totalAllowanceCost) : 0,
      guardName: guardName || "",
      guardPhone: guardPhone || "",
      guardDetailsJson: guardDetailsJson || "",
      guardPhotoUrl: guardPhotoUrl || "",
      billInvoiceUrl: billInvoiceUrl || "",
      paymentMethod: paymentMethod || "",
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

    await syncSecurityTableSchema();

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
      siteType,
      offerRef,
      coverageHours,
      shiftHours,
      guardsPerShift,
      totalDailyGuards,
      shiftRate,
      allowancePerShift,
      durationDays,
      totalGuardCost,
      totalAllowanceCost,
      guardName,
      guardPhone,
      guardDetailsJson,
      guardPhotoUrl,
      billInvoiceUrl,
      paymentMethod,
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
      siteType: siteType !== undefined ? siteType : record.siteType,
      offerRef: offerRef !== undefined ? offerRef : record.offerRef,
      coverageHours: coverageHours !== undefined ? Number(coverageHours) : record.coverageHours,
      shiftHours: shiftHours !== undefined ? Number(shiftHours) : record.shiftHours,
      guardsPerShift: guardsPerShift !== undefined ? Number(guardsPerShift) : record.guardsPerShift,
      totalDailyGuards: totalDailyGuards !== undefined ? Number(totalDailyGuards) : record.totalDailyGuards,
      shiftRate: shiftRate !== undefined ? Number(shiftRate) : record.shiftRate,
      allowancePerShift: allowancePerShift !== undefined ? Number(allowancePerShift) : record.allowancePerShift,
      durationDays: durationDays !== undefined ? Number(durationDays) : record.durationDays,
      totalGuardCost: totalGuardCost !== undefined ? Number(totalGuardCost) : record.totalGuardCost,
      totalAllowanceCost: totalAllowanceCost !== undefined ? Number(totalAllowanceCost) : record.totalAllowanceCost,
      guardName: guardName !== undefined ? guardName : record.guardName,
      guardPhone: guardPhone !== undefined ? guardPhone : record.guardPhone,
      guardDetailsJson: guardDetailsJson !== undefined ? guardDetailsJson : record.guardDetailsJson,
      guardPhotoUrl: guardPhotoUrl !== undefined ? guardPhotoUrl : record.guardPhotoUrl,
      billInvoiceUrl: billInvoiceUrl !== undefined ? billInvoiceUrl : record.billInvoiceUrl,
      paymentMethod: paymentMethod !== undefined ? paymentMethod : record.paymentMethod,
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
