import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import LegalRecoveryPayment from "@/models/sequelize/LegalRecoveryPayment";
import LegalRecoveryMaster from "@/models/sequelize/LegalRecoveryMaster";
import LegalRecoveryBill from "@/models/sequelize/LegalRecoveryBill";
import TaskLog from "@/models/sequelize/TaskLog";
import Notification from "@/models/sequelize/Notification";
import User from "@/models/sequelize/User";
import sequelize from "@/lib/sequelize";
import { sendEmail } from "@/lib/email";
import { DataTypes, Op } from "sequelize";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

let paymentColumnsEnsured = false;
async function ensurePaymentInvoiceColumns() {
  if (paymentColumnsEnsured) return;
  const queryInterface = sequelize.getQueryInterface();
  const columns = await queryInterface.describeTable("legal_recovery_payments");
  if (!columns.invoiceId) await queryInterface.addColumn("legal_recovery_payments", "invoiceId", { type: DataTypes.INTEGER, allowNull: true });
  if (!columns.invoiceNo) await queryInterface.addColumn("legal_recovery_payments", "invoiceNo", { type: DataTypes.STRING, allowNull: true });
  if (!columns.tdsAmount) await queryInterface.addColumn("legal_recovery_payments", "tdsAmount", { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 });
  paymentColumnsEnsured = true;
}

async function refreshMasterBalance(masterId: number, transaction: any) {
  const bills = await LegalRecoveryBill.findAll({ where: { masterId }, transaction, raw: true });
  if (!bills.length) return null;
  const pending = bills
    .filter((bill: any) => String(bill.status).trim().toLowerCase() === "pending")
    .reduce((sum: number, bill: any) => sum + (parseFloat(bill.dueAmount) || 0), 0);
  const master = await LegalRecoveryMaster.findByPk(masterId, { transaction });
  if (master) await master.update({ pendingAmount: pending, status: pending <= 0 ? "Closed" : "In Progress" }, { transaction });
  return pending;
}

const escapeHtml = (value: unknown) => String(value ?? "")
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;");

async function notifyOwnersOfPayment(details: {
  paymentId: number | string;
  bankName: string;
  branchName: string;
  amount: number;
  remaining: number;
  receivedBy: string;
  paymentDate: Date;
  paymentMode?: string;
  transactionId?: string;
}) {
  try {
    await Notification.sync();
    const ownerUsers = await User.findAll({
      where: { role: { [Op.like]: "%Owner%" } },
      attributes: ["id", "name", "email", "status"],
      raw: true
    }) as any[];
    const owners = ownerUsers.filter((owner: any) =>
      !["inactive", "disabled", "terminated"].includes(String(owner.status || "").toLowerCase())
    );
    const amountText = `₹${details.amount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
    const remainingText = `₹${details.remaining.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
    const dateText = details.paymentDate.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" });
    const message = `${details.receivedBy} logged ${amountText} from ${details.bankName} / ${details.branchName}. Remaining: ${remainingText}.`;

    await Promise.all(owners.map(async (owner: any) => {
      await Notification.findOrCreate({
        where: { id: `legal_payment_${details.paymentId}_${owner.id}` },
        defaults: {
          id: `legal_payment_${details.paymentId}_${owner.id}`,
          recipient: String(owner.id),
          title: `Legal Recovery Payment Received: ${amountText}`,
          message,
          read: false
        }
      });

      if (owner.email) {
        await sendEmail({
          to: owner.email,
          subject: `Legal Recovery Payment Received — ${details.bankName} — ${amountText}`,
          html: `<div style="font-family:Arial,sans-serif;color:#1f2937;line-height:1.6">
            <h2 style="color:#047857">Legal Recovery Payment Logged</h2>
            <p>A new payment has been recorded in RS9 HRMS.</p>
            <table style="border-collapse:collapse;width:100%;max-width:640px">
              <tr><td style="padding:7px;border:1px solid #ddd"><b>Bank</b></td><td style="padding:7px;border:1px solid #ddd">${escapeHtml(details.bankName)}</td></tr>
              <tr><td style="padding:7px;border:1px solid #ddd"><b>Branch</b></td><td style="padding:7px;border:1px solid #ddd">${escapeHtml(details.branchName)}</td></tr>
              <tr><td style="padding:7px;border:1px solid #ddd"><b>Amount received</b></td><td style="padding:7px;border:1px solid #ddd">${escapeHtml(amountText)}</td></tr>
              <tr><td style="padding:7px;border:1px solid #ddd"><b>Remaining amount</b></td><td style="padding:7px;border:1px solid #ddd">${escapeHtml(remainingText)}</td></tr>
              <tr><td style="padding:7px;border:1px solid #ddd"><b>Logged by</b></td><td style="padding:7px;border:1px solid #ddd">${escapeHtml(details.receivedBy)}</td></tr>
              <tr><td style="padding:7px;border:1px solid #ddd"><b>Payment date</b></td><td style="padding:7px;border:1px solid #ddd">${escapeHtml(dateText)}</td></tr>
              <tr><td style="padding:7px;border:1px solid #ddd"><b>Payment mode</b></td><td style="padding:7px;border:1px solid #ddd">${escapeHtml(details.paymentMode || "Not specified")}</td></tr>
              <tr><td style="padding:7px;border:1px solid #ddd"><b>Transaction reference</b></td><td style="padding:7px;border:1px solid #ddd">${escapeHtml(details.transactionId || "Not provided")}</td></tr>
            </table>
          </div>`
        });
      }
    }));
    return owners.length;
  } catch (notificationError) {
    console.error("Legal payment owner notification failed:", notificationError);
    return 0;
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ success: false, error: "Unauthorized access" }, { status: 401 });
    const data = await request.json();
    await sequelize.authenticate();

    await LegalRecoveryPayment.sync();
    await LegalRecoveryBill.sync();
    await TaskLog.sync();
    await ensurePaymentInvoiceColumns();
    const transaction = await sequelize.transaction();

    try {
      const masterId = Number(data.masterId);
      const amount = Number(data.amount || 0);
      const tdsAmount = Number(data.tdsAmount || 0);
      if (!Number.isInteger(masterId) || masterId <= 0) throw new Error("A valid recovery case is required");
      if (!Number.isFinite(amount) || amount < 0 || !Number.isFinite(tdsAmount) || tdsAmount < 0 || amount + tdsAmount <= 0) {
        throw new Error("Enter a valid received amount or TDS amount");
      }

      const master = await LegalRecoveryMaster.findByPk(masterId, { transaction });
      if (!master) throw new Error("Recovery case not found");
      const bankName = master.bankName || "Unknown Bank";
      const branchName = master.branchName || "General";

      const branchInvoiceCount = await LegalRecoveryBill.count({ where: { masterId }, transaction });
      let invoice: any = null;
      if (branchInvoiceCount > 0) {
        const invoiceId = Number(data.invoiceId);
        if (!Number.isInteger(invoiceId) || invoiceId <= 0) throw new Error("Select an invoice for this payment");
        invoice = await LegalRecoveryBill.findOne({ where: { id: invoiceId, masterId }, transaction, lock: transaction.LOCK.UPDATE });
        if (!invoice) throw new Error("Selected invoice does not belong to this branch");
        if (String(invoice.status).trim().toLowerCase() === "cancelled") throw new Error("Payment cannot be logged against a cancelled invoice");
        const currentDue = Number(invoice.dueAmount || 0);
        if (currentDue <= 0) throw new Error("Selected invoice has no pending balance");
        if (amount + tdsAmount > currentDue + 0.005) throw new Error(`Payment plus TDS cannot exceed invoice due amount ₹${currentDue.toLocaleString("en-IN")}`);

        const newDue = Math.max(0, currentDue - amount - tdsAmount);
        await invoice.update({
          receivedAmount: Number(invoice.receivedAmount || 0) + amount,
          tdsAmount: Number(invoice.tdsAmount || 0) + tdsAmount,
          dueAmount: Number(newDue.toFixed(2)),
          paymentReceivedDate: data.paymentDate || new Date(),
          status: newDue <= 0.005 ? "Received" : "Pending"
        }, { transaction });
      }

      const newPayment = await LegalRecoveryPayment.create({
        masterId,
        invoiceId: invoice?.id || null,
        invoiceNo: invoice?.invoiceNo || null,
        bankName,
        branchName,
        receivedBy: data.receivedBy || session.user.name || "System",
        amount,
        tdsAmount,
        paymentDate: data.paymentDate || new Date(),
        paymentMode: data.paymentMode,
        transactionId: data.transactionId,
        proofUrl: data.proofUrl,
        remarks: data.remarks,
      }, { transaction });

      let remainingPending: number;
      if (invoice) {
        remainingPending = Number(await refreshMasterBalance(masterId, transaction) || 0);
      } else {
        const currentPending = parseFloat(master.pendingAmount || "0");
        remainingPending = Math.max(0, currentPending - amount - tdsAmount);
        await master.update({ pendingAmount: remainingPending, status: remainingPending === 0 ? "Closed" : "In Progress" }, { transaction });
      }

      const paymentAt = data.paymentDate ? new Date(data.paymentDate) : new Date();
      const safePaymentAt = Number.isNaN(paymentAt.getTime()) ? new Date() : paymentAt;
      const invoiceText = invoice ? ` against invoice ${invoice.invoiceNo}` : "";
      const paymentNote = data.remarks?.trim() || `Payment of ₹${amount.toLocaleString("en-IN")}${invoiceText} recorded`;
      const task = await TaskLog.create({
        id: `LRP-PAY-${newPayment.id}`,
        employee: data.receivedById || null,
        assignedBy: data.receivedById || null,
        date: safePaymentAt,
        scheduledAt: safePaymentAt,
        taskTitle: `Legal Recovery Payment - ${bankName} - ${branchName}`,
        taskType: "PAYMENT",
        description: `${paymentNote}${tdsAmount ? ` | TDS: ₹${tdsAmount.toLocaleString("en-IN")}` : ""}${data.transactionId ? ` | Ref: ${data.transactionId}` : ""}`,
        progressNotes: JSON.stringify([{ id: `payment-${newPayment.id}`, note: paymentNote, createdAt: new Date().toISOString(), userName: data.receivedBy || "System" }]),
        status: "Completed",
        timerState: "Stopped",
        timerStart: null,
        elapsedSeconds: 0,
        proofAttachment: data.proofUrl || null
      }, { transaction });

      await transaction.commit();
      const ownersNotified = await notifyOwnersOfPayment({
        paymentId: newPayment.id, bankName, branchName, amount, remaining: remainingPending,
        receivedBy: data.receivedBy || session.user.name || "System", paymentDate: safePaymentAt,
        paymentMode: data.paymentMode, transactionId: data.transactionId
      });
      return NextResponse.json({ success: true, data: newPayment, invoice, task, ownersNotified });
    } catch (paymentError) {
      await transaction.rollback();
      throw paymentError;
    }
  } catch (error: any) {
    console.error("Legal Payment POST Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function GET() {
  try {
    await sequelize.authenticate();
    await LegalRecoveryPayment.sync();
    await ensurePaymentInvoiceColumns();
    const payments = await LegalRecoveryPayment.findAll({
      order: [["createdAt", "DESC"]],
      raw: true
    });

    // Fetch all master records to get bankName and branchName
    const masterIds = [...new Set(payments.map((p: any) => p.masterId).filter(Boolean))];
    let masterMap: any = {};
    if (masterIds.length > 0) {
      const masters = await LegalRecoveryMaster.findAll({
        where: { id: { [Op.in]: masterIds } },
        raw: true
      });
      masters.forEach((m: any) => {
        masterMap[m.id] = m;
      });
    }

    const data = payments.map((p: any) => {
      const master = masterMap[p.masterId] || {};
      const amtVal = Number(p.amount || 0);
      return {
        ...p,
        amount: amtVal,
        amountRecovered: amtVal,
        bankName: p.bankName || master.bankName || "Unknown Bank",
        branchName: p.branchName || master.branchName || "General",
        employeeName: p.receivedBy || "System",
        callerName: p.receivedBy || "System"
      };
    });

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("Legal Payment GET Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT: Update an existing payment collection record
export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ success: false, error: "Unauthorized access" }, { status: 401 });
    const data = await request.json();
    const { id, amount, paymentDate, paymentMode, transactionId, proofUrl, remarks, receivedBy } = data;

    if (!id) {
      return NextResponse.json({ success: false, error: "Missing payment record ID" }, { status: 400 });
    }

    await sequelize.authenticate();
    await LegalRecoveryPayment.sync();
    await LegalRecoveryBill.sync();
    await ensurePaymentInvoiceColumns();
    const dbTransaction = await sequelize.transaction();
    try {
      const payment = await LegalRecoveryPayment.findByPk(id, { transaction: dbTransaction, lock: dbTransaction.LOCK.UPDATE });
      if (!payment) {
        await dbTransaction.rollback();
        return NextResponse.json({ success: false, error: "Payment record not found" }, { status: 404 });
      }

      const oldAmount = Number(payment.amount || 0);
      const newAmount = amount !== undefined ? Number(amount) : oldAmount;
      if (!Number.isFinite(newAmount) || newAmount < 0) throw new Error("Enter a valid payment amount");
      const diffAmount = newAmount - oldAmount;

      if (payment.invoiceId && diffAmount !== 0) {
        const invoice = await LegalRecoveryBill.findByPk(payment.invoiceId, { transaction: dbTransaction, lock: dbTransaction.LOCK.UPDATE });
        if (!invoice) throw new Error("Linked invoice not found");
        const nextReceived = Number(invoice.receivedAmount || 0) + diffAmount;
        const nextDue = Number(invoice.dueAmount || 0) - diffAmount;
        if (nextReceived < -0.005) throw new Error("Payment cannot be less than the amount already allocated");
        if (nextDue < -0.005) throw new Error("Payment cannot exceed the invoice due amount");
        await invoice.update({
          receivedAmount: Number(Math.max(0, nextReceived).toFixed(2)),
          dueAmount: Number(Math.max(0, nextDue).toFixed(2)),
          paymentReceivedDate: paymentDate || invoice.paymentReceivedDate,
          status: nextDue <= 0.005 ? "Received" : "Pending"
        }, { transaction: dbTransaction });
        await refreshMasterBalance(Number(payment.masterId), dbTransaction);
      } else if (payment.masterId && diffAmount !== 0) {
        const master = await LegalRecoveryMaster.findByPk(payment.masterId, { transaction: dbTransaction });
        if (master) {
          const newPending = Math.max(0, Number(master.pendingAmount || 0) - diffAmount);
          await master.update({ pendingAmount: newPending, status: newPending === 0 ? "Closed" : "In Progress" }, { transaction: dbTransaction });
        }
      }

      await payment.update({
        amount: newAmount,
        paymentDate: paymentDate || payment.paymentDate,
        paymentMode: paymentMode || payment.paymentMode,
        transactionId: transactionId !== undefined ? transactionId : payment.transactionId,
        proofUrl: proofUrl !== undefined ? proofUrl : payment.proofUrl,
        remarks: remarks !== undefined ? remarks : payment.remarks,
        receivedBy: receivedBy || payment.receivedBy,
      }, { transaction: dbTransaction });
      await dbTransaction.commit();
      return NextResponse.json({ success: true, data: payment });
    } catch (updateError) {
      await dbTransaction.rollback();
      throw updateError;
    }
  } catch (error: any) {
    console.error("Legal Payment PUT Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE: Delete a payment collection record and restore master pending amount
export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ success: false, error: "Unauthorized access" }, { status: 401 });
    const { searchParams } = new URL(request.url);
    let id = searchParams.get("id");

    if (!id) {
      try {
        const body = await request.json();
        id = body.id;
      } catch (e) {}
    }

    if (!id) {
      return NextResponse.json({ success: false, error: "Missing payment record ID" }, { status: 400 });
    }

    await sequelize.authenticate();
    await LegalRecoveryPayment.sync();
    await LegalRecoveryBill.sync();
    await ensurePaymentInvoiceColumns();
    const transaction = await sequelize.transaction();
    try {
      const payment = await LegalRecoveryPayment.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE });
      if (!payment) {
        await transaction.rollback();
        return NextResponse.json({ success: false, error: "Payment record not found" }, { status: 404 });
      }

      const deletedAmount = Number(payment.amount || 0);
      const deletedTds = Number(payment.tdsAmount || 0);
      if (payment.invoiceId) {
        const invoice = await LegalRecoveryBill.findByPk(payment.invoiceId, { transaction, lock: transaction.LOCK.UPDATE });
        if (!invoice) throw new Error("Linked invoice not found");
        await invoice.update({
          receivedAmount: Number(Math.max(0, Number(invoice.receivedAmount || 0) - deletedAmount).toFixed(2)),
          tdsAmount: Number(Math.max(0, Number(invoice.tdsAmount || 0) - deletedTds).toFixed(2)),
          dueAmount: Number((Number(invoice.dueAmount || 0) + deletedAmount + deletedTds).toFixed(2)),
          status: "Pending"
        }, { transaction });
        await refreshMasterBalance(Number(payment.masterId), transaction);
      } else if (payment.masterId && (deletedAmount || deletedTds)) {
        const master = await LegalRecoveryMaster.findByPk(payment.masterId, { transaction });
        if (master) await master.update({ pendingAmount: Number(master.pendingAmount || 0) + deletedAmount + deletedTds, status: "In Progress" }, { transaction });
      }

      await payment.destroy({ transaction });
      await transaction.commit();
      return NextResponse.json({ success: true, message: "Payment record deleted successfully" });
    } catch (deleteError) {
      await transaction.rollback();
      throw deleteError;
    }
  } catch (error: any) {
    console.error("Legal Payment DELETE Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
