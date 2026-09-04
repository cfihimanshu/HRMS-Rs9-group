import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import sequelize from "@/lib/sequelize";
import LegalSecurity from "@/models/sequelize/LegalSecurity";
import LegalSecurityPayment from "@/models/sequelize/LegalSecurityPayment";
import { notifyOwners } from "@/lib/ownerNotification";

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

    const body = await req.json();
    const {
      securityId,
      amount,
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
    if (isNaN(numericAmount) || numericAmount < 0) {
      return NextResponse.json({ success: false, error: "Valid Payment Amount is required" }, { status: 400 });
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

    let updatedStatus = "Partially Paid";
    if (billAmt > 0 && newTotalReceived >= billAmt) {
      updatedStatus = "Payment Done";
    } else if (newTotalReceived <= 0) {
      updatedStatus = "Due";
    }

    await record.update({
      receivedAmount: newTotalReceived,
      receivedDate: paymentDate || new Date().toISOString().split("T")[0],
      paymentStatus: updatedStatus,
      paymentMethod: paymentMode || record.paymentMethod,
      ...(installmentsJson !== undefined ? { installmentsJson } : {}),
      ...(proofUrl ? { billInvoiceUrl: proofUrl } : {}),
      ...(remarks ? { remarks: (record.remarks ? `${record.remarks}\n[Payment Logged: ₹${numericAmount} - ${transactionId || ""}]` : `Payment Logged: ₹${numericAmount} - ${transactionId || ""}`) } : {}),
    });

    await notifyOwners({
      title: `Security Payment Received: ₹${numericAmount.toLocaleString("en-IN")}`,
      message: `${session.user.name || "A user"} logged payment from ${record.nbfcName || record.company || "Security client"} / ${record.branchName || record.location || "Site"}. Bill: ${record.billNo || "N/A"}. Total received: ₹${newTotalReceived.toLocaleString("en-IN")}. Pending: ₹${Math.max(0, billAmt - newTotalReceived).toLocaleString("en-IN")}. Status: ${updatedStatus}.`,
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
