import { NextResponse } from "next/server";
import LegalRecoveryPayment from "@/models/sequelize/LegalRecoveryPayment";
import LegalRecoveryMaster from "@/models/sequelize/LegalRecoveryMaster";
import sequelize from "@/lib/sequelize";
import { Op } from "sequelize";

export async function POST(request: Request) {
  try {
    const data = await request.json();
    await sequelize.authenticate();
    
    // Sync model if table doesn't exist
    await LegalRecoveryPayment.sync({ alter: true });
    
    // 1. Fetch master info to get bank and branch names
    const master = data.masterId ? await LegalRecoveryMaster.findByPk(data.masterId) : null;
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
    });

    // 3. Subtract from Master Pending Amount
    if (master && data.amount) {
      const currentPending = parseFloat(master.pendingAmount || "0");
      const paidAmount = parseFloat(data.amount);
      const newPending = Math.max(0, currentPending - paidAmount);
      
      await master.update({ 
        pendingAmount: newPending,
        status: newPending === 0 ? "Closed" : "In Progress"
      });
    }

    return NextResponse.json({ success: true, data: newPayment });
  } catch (error: any) {
    console.error("Legal Payment POST Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function GET() {
  try {
    await sequelize.authenticate();
    await LegalRecoveryPayment.sync({ alter: true });
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
