import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import sequelize from "@/lib/sequelize";
import LegalSecurity from "@/models/sequelize/LegalSecurity";
import LegalSecurityPayment from "@/models/sequelize/LegalSecurityPayment";
import { notifyOwners } from "@/lib/ownerNotification";

async function ensureTdsColumns() {
  for (const table of ["legal_securities", "legal_security_payments"]) {
    const [columns]: any = await sequelize.query(`SHOW COLUMNS FROM ${table} LIKE 'tdsAmount'`);
    if (!columns?.length) await sequelize.query(`ALTER TABLE ${table} ADD COLUMN tdsAmount DECIMAL(12,2) NULL DEFAULT 0`);
  }
}

function getPaymentStatus(billAmount: number, receivedAmount: number, tdsAmount: number) {
  if (billAmount > 0 && receivedAmount + tdsAmount >= billAmount) return "Payment Done";
  if (receivedAmount + tdsAmount > 0) return "Partially Paid";
  return "Due";
}

// POST: Log Received Payment
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const receivedBy = (session.user as any).id || session.user.name || "System";

    await sequelize.authenticate();
    await LegalSecurity.sync();
    await LegalSecurityPayment.sync();
    await ensureTdsColumns();

    const body = await req.json();
    const {
      securityId,
      amount,
      tdsAmount,
      paymentDate,
      paymentMode,
      transactionId,
      proofUrl,
      remarks,
      installmentsJson,
    } = body;

    if (!securityId) {
      return NextResponse.json({ success: false, error: "Security Record ID is required" }, { status: 400 });
    }

    const numericAmount = Number(amount);
    const numericTdsAmount = Number(tdsAmount || 0);
    if (!Number.isFinite(numericAmount) || numericAmount < 0 || !Number.isFinite(numericTdsAmount) || numericTdsAmount < 0 || numericAmount + numericTdsAmount <= 0) {
      return NextResponse.json({ success: false, error: "Enter a valid received amount or TDS amount" }, { status: 400 });
    }

    const record = await LegalSecurity.findByPk(securityId);
    if (!record) {
      return NextResponse.json({ success: false, error: "Security Record not found" }, { status: 404 });
    }

    // 1. Create Payment Log Entry in legal_security_payments table
    const newPayment = await LegalSecurityPayment.create({
      securityId: record.id,
      nbfcName: record.nbfcName || record.company || "",
      branchName: record.branchName || "",
      billNo: record.billNo || "",
      billAmount: record.billAmount || 0,
      amount: numericAmount,
      tdsAmount: numericTdsAmount,
      paymentDate: paymentDate || new Date().toISOString().split("T")[0],
      paymentMode: paymentMode || "Bank Transfer (NEFT/RTGS)",
      transactionId: transactionId || "",
      proofUrl: proofUrl || "",
      remarks: remarks || "",
      receivedBy: String(receivedBy),
    });

    // 2. Update legal_securities Record
    let newTotalReceived = 0;
    if (installmentsJson !== undefined && installmentsJson !== null) {
      newTotalReceived = numericAmount;
    } else {
      const existingReceived = Number(record.receivedAmount || 0);
      newTotalReceived = existingReceived + numericAmount;
    }
    const billAmt = Number(record.billAmount || 0);
    const newTotalTds = Number(record.tdsAmount || 0) + numericTdsAmount;
    if (billAmt > 0 && newTotalReceived + newTotalTds > billAmt) {
      return NextResponse.json({ success: false, error: "Received amount plus TDS cannot exceed the bill amount" }, { status: 400 });
    }

    let updatedStatus = "Partially Paid";
    if (billAmt > 0 && newTotalReceived + newTotalTds >= billAmt) {
      updatedStatus = "Payment Done";
    } else if (newTotalReceived <= 0) {
      updatedStatus = "Due";
    }

    await record.update({
      receivedAmount: newTotalReceived,
      tdsAmount: newTotalTds,
      receivedDate: paymentDate || new Date().toISOString().split("T")[0],
      paymentStatus: updatedStatus,
      paymentMethod: paymentMode || record.paymentMethod,
      ...(installmentsJson !== undefined ? { installmentsJson } : {}),
      ...(proofUrl ? { billInvoiceUrl: proofUrl } : {}),
      ...(remarks ? { remarks: (record.remarks ? `${record.remarks}\n[Payment Logged: ₹${numericAmount}, TDS: ₹${numericTdsAmount} - ${transactionId || ""}]` : `Payment Logged: ₹${numericAmount}, TDS: ₹${numericTdsAmount} - ${transactionId || ""}`) } : {}),
    });

    await notifyOwners({
      title: `Security Payment Received: ₹${numericAmount.toLocaleString("en-IN")}`,
      message: `${session.user.name || "A user"} logged payment from ${record.nbfcName || record.company || "Security client"} / ${record.branchName || record.location || "Site"}. Bill: ${record.billNo || "N/A"}. Total received: ₹${newTotalReceived.toLocaleString("en-IN")}. TDS: ₹${newTotalTds.toLocaleString("en-IN")}. Pending: ₹${Math.max(0, billAmt - newTotalReceived - newTotalTds).toLocaleString("en-IN")}. Status: ${updatedStatus}.`,
      moduleName: "Security Payments",
      actionUrl: "/dashboard/security/payments",
      eventId: `security_payment_${newPayment.id}`,
    });

    return NextResponse.json({ success: true, data: newPayment, updatedRecord: record });
  } catch (error: any) {
    console.error("[/api/legal-recovery/security/payment POST]", error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PATCH: Correct a previously logged received payment total for one security bill.
export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const receivedBy = (session.user as any).id || session.user.name || "System";

    await sequelize.authenticate();
    await LegalSecurity.sync();
    await LegalSecurityPayment.sync();
    await ensureTdsColumns();

    const body = await req.json();
    const {
      securityId,
      amount,
      tdsAmount,
      paymentDate,
      paymentMode,
      transactionId,
      proofUrl,
      remarks,
    } = body;

    if (!securityId) {
      return NextResponse.json({ success: false, error: "Security Record ID is required" }, { status: 400 });
    }

    const numericAmount = Number(amount || 0);
    const numericTdsAmount = Number(tdsAmount || 0);
    if (!Number.isFinite(numericAmount) || numericAmount < 0 || !Number.isFinite(numericTdsAmount) || numericTdsAmount < 0) {
      return NextResponse.json({ success: false, error: "Enter a valid received amount or TDS amount" }, { status: 400 });
    }

    const record = await LegalSecurity.findByPk(securityId);
    if (!record) {
      return NextResponse.json({ success: false, error: "Security Record not found" }, { status: 404 });
    }

    const billAmt = Number(record.billAmount || 0);
    if (billAmt > 0 && numericAmount + numericTdsAmount > billAmt) {
      return NextResponse.json({ success: false, error: "Received amount plus TDS cannot exceed the bill amount" }, { status: 400 });
    }

    const effectivePaymentDate = paymentDate || new Date().toISOString().split("T")[0];
    const effectivePaymentMode = paymentMode || record.paymentMethod || "Bank Transfer (NEFT/RTGS)";
    const updatedStatus = getPaymentStatus(billAmt, numericAmount, numericTdsAmount);

    const existingPayment = await LegalSecurityPayment.findOne({
      where: { securityId: record.id },
      order: [["createdAt", "DESC"]],
    });

    const paymentValues = {
      securityId: record.id,
      nbfcName: record.nbfcName || record.company || "",
      branchName: record.branchName || "",
      billNo: record.billNo || "",
      billAmount: record.billAmount || 0,
      amount: numericAmount,
      tdsAmount: numericTdsAmount,
      paymentDate: effectivePaymentDate,
      paymentMode: effectivePaymentMode,
      transactionId: transactionId || "",
      proofUrl: proofUrl || "",
      remarks: remarks || "",
      receivedBy: String(receivedBy),
    };

    const updatedPayment = existingPayment
      ? await existingPayment.update(paymentValues)
      : await LegalSecurityPayment.create(paymentValues);

    await record.update({
      receivedAmount: numericAmount,
      tdsAmount: numericTdsAmount,
      receivedDate: numericAmount + numericTdsAmount > 0 ? effectivePaymentDate : null,
      paymentStatus: updatedStatus,
      paymentMethod: effectivePaymentMode,
      ...(proofUrl ? { billInvoiceUrl: proofUrl } : {}),
      remarks: [
        record.remarks || "",
        `Payment corrected: received ₹${numericAmount}, TDS ₹${numericTdsAmount}${transactionId ? ` - ${transactionId}` : ""}`,
      ].filter(Boolean).join("\n"),
    });

    await notifyOwners({
      title: `Security Payment Corrected: ₹${numericAmount.toLocaleString("en-IN")}`,
      message: `${session.user.name || "A user"} corrected payment for ${record.nbfcName || record.company || "Security client"} / ${record.branchName || record.location || "Site"}. Bill: ${record.billNo || "N/A"}. Received: ₹${numericAmount.toLocaleString("en-IN")}. TDS: ₹${numericTdsAmount.toLocaleString("en-IN")}. Pending: ₹${Math.max(0, billAmt - numericAmount - numericTdsAmount).toLocaleString("en-IN")}. Status: ${updatedStatus}.`,
      moduleName: "Security Payments",
      actionUrl: "/dashboard/security/payments",
      eventId: `security_payment_corrected_${record.id}_${Date.now()}`,
    });

    return NextResponse.json({ success: true, data: updatedPayment, updatedRecord: record });
  } catch (error: any) {
    console.error("[/api/legal-recovery/security/payment PATCH]", error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// GET: Fetch Payment Log Entries
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const securityId = searchParams.get("securityId");

    await sequelize.authenticate();
    await LegalSecurityPayment.sync();
    await ensureTdsColumns();

    const whereClause = securityId ? { securityId } : {};
    const payments = await LegalSecurityPayment.findAll({
      where: whereClause,
      order: [["createdAt", "DESC"]],
      raw: true,
    });

    return NextResponse.json({ success: true, data: payments });
  } catch (error: any) {
    console.error("[/api/legal-recovery/security/payment GET]", error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
