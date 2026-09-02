import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import LegalRecoveryPayment from "@/models/sequelize/LegalRecoveryPayment";
import LegalRecoveryMaster from "@/models/sequelize/LegalRecoveryMaster";
import TaskLog from "@/models/sequelize/TaskLog";
import Notification from "@/models/sequelize/Notification";
import User from "@/models/sequelize/User";
import sequelize from "@/lib/sequelize";
import { sendEmail } from "@/lib/email";
import { Op } from "sequelize";

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
    const data = await request.json();
    await sequelize.authenticate();
    
    // Sync model if table doesn't exist
    await LegalRecoveryPayment.sync();
    await TaskLog.sync();
    const transaction = await sequelize.transaction();

    try {
    
    // 1. Fetch master info to get bank and branch names
    const master = data.masterId ? await LegalRecoveryMaster.findByPk(data.masterId, { transaction }) : null;
    const bankName = master ? master.bankName : "Unknown Bank";
    const branchName = master ? master.branchName : "General";

    // 2. Create Payment Record
    const newPayment = await LegalRecoveryPayment.create({
      masterId: data.masterId,
      bankName: bankName,
      branchName: branchName,
      receivedBy: data.receivedBy || "System",
      amount: data.amount,
      paymentDate: data.paymentDate || new Date(),
      paymentMode: data.paymentMode,
      transactionId: data.transactionId,
      proofUrl: data.proofUrl,
      remarks: data.remarks,
    }, { transaction });

    // 3. Subtract from Master Pending Amount
    let remainingPending = Number(master?.pendingAmount || 0);
    if (master && data.amount) {
      const currentPending = parseFloat(master.pendingAmount || "0");
      const paidAmount = parseFloat(data.amount);
      const newPending = Math.max(0, currentPending - paidAmount);
      remainingPending = newPending;
      
      await master.update({ 
        pendingAmount: newPending,
        status: newPending === 0 ? "Closed" : "In Progress"
      }, { transaction });
    }

    // A logged payment is completed work, so record it in My Tasks / Work Report
    // for the employee who submitted the payment.
    const paymentAt = data.paymentDate ? new Date(data.paymentDate) : new Date();
    const safePaymentAt = Number.isNaN(paymentAt.getTime()) ? new Date() : paymentAt;
    const amount = Number(data.amount || 0);
    const paymentNote = data.remarks?.trim() || `Payment of ₹${amount.toLocaleString("en-IN")} recorded`;
    const task = await TaskLog.create({
      id: `LRP-PAY-${newPayment.id}`,
      employee: data.receivedById || null,
      assignedBy: data.receivedById || null,
      date: safePaymentAt,
      scheduledAt: safePaymentAt,
      taskTitle: `Legal Recovery Payment - ${bankName} - ${branchName}`,
      taskType: "PAYMENT",
      description: `${paymentNote}${data.transactionId ? ` | Ref: ${data.transactionId}` : ""}`,
      progressNotes: JSON.stringify([{
        id: `payment-${newPayment.id}`,
        note: paymentNote,
        createdAt: new Date().toISOString(),
        userName: data.receivedBy || "System"
      }]),
      status: "Completed",
      timerState: "Stopped",
      timerStart: null,
      elapsedSeconds: 0,
      proofAttachment: data.proofUrl || null
    }, { transaction });

    await transaction.commit();
    const ownersNotified = await notifyOwnersOfPayment({
      paymentId: newPayment.id,
      bankName,
      branchName,
      amount,
      remaining: remainingPending,
      receivedBy: data.receivedBy || "System",
      paymentDate: safePaymentAt,
      paymentMode: data.paymentMode,
      transactionId: data.transactionId
    });
    return NextResponse.json({ success: true, data: newPayment, task, ownersNotified });
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
    const data = await request.json();
    const { id, amount, paymentDate, paymentMode, transactionId, proofUrl, remarks, receivedBy } = data;

    if (!id) {
      return NextResponse.json({ success: false, error: "Missing payment record ID" }, { status: 400 });
    }

    await sequelize.authenticate();
    await LegalRecoveryPayment.sync();

    const payment = await LegalRecoveryPayment.findByPk(id);
    if (!payment) {
      return NextResponse.json({ success: false, error: "Payment record not found" }, { status: 404 });
    }

    const oldAmount = parseFloat(payment.amount || "0");
    const newAmount = amount !== undefined ? parseFloat(amount) : oldAmount;
    const diffAmount = newAmount - oldAmount;

    // Adjust master pending amount if amount changed
    if (payment.masterId && diffAmount !== 0) {
      const master = await LegalRecoveryMaster.findByPk(payment.masterId);
      if (master) {
        const currentPending = parseFloat(master.pendingAmount || "0");
        const newPending = Math.max(0, currentPending - diffAmount);
        await master.update({
          pendingAmount: newPending,
          status: newPending === 0 ? "Closed" : "In Progress"
        });
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
    });

    return NextResponse.json({ success: true, data: payment });
  } catch (error: any) {
    console.error("Legal Payment PUT Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE: Delete a payment collection record and restore master pending amount
export async function DELETE(request: Request) {
  try {
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
    const payment = await LegalRecoveryPayment.findByPk(id);
    if (!payment) {
      return NextResponse.json({ success: false, error: "Payment record not found" }, { status: 404 });
    }

    // Restore master pending amount
    if (payment.masterId && payment.amount) {
      const master = await LegalRecoveryMaster.findByPk(payment.masterId);
      if (master) {
        const currentPending = parseFloat(master.pendingAmount || "0");
        const deletedAmount = parseFloat(payment.amount || "0");
        const newPending = currentPending + deletedAmount;
        await master.update({
          pendingAmount: newPending,
          status: "In Progress"
        });
      }
    }

    await payment.destroy();

    return NextResponse.json({ success: true, message: "Payment record deleted successfully" });
  } catch (error: any) {
    console.error("Legal Payment DELETE Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
