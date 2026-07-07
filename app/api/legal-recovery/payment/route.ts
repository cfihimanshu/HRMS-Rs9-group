import { NextResponse } from "next/server";
import LegalRecoveryPayment from "@/models/sequelize/LegalRecoveryPayment";
import LegalRecoveryMaster from "@/models/sequelize/LegalRecoveryMaster";
import sequelize from "@/lib/sequelize";

export async function POST(request: Request) {
  try {
    const data = await request.json();
    await sequelize.authenticate();
    
    // Sync model if table doesn't exist
    await LegalRecoveryPayment.sync({ alter: true });
    
    // 1. Create Payment Record
    const newPayment = await LegalRecoveryPayment.create({
      masterId: data.masterId,
      receivedBy: data.receivedBy || "System",
      amount: data.amount,
      paymentDate: data.paymentDate || new Date(),
      paymentMode: data.paymentMode,
      transactionId: data.transactionId,
      proofUrl: data.proofUrl,
      remarks: data.remarks,
    });

    // 2. Subtract from Master Pending Amount
    if (data.masterId && data.amount) {
      const master = await LegalRecoveryMaster.findByPk(data.masterId);
      if (master) {
        const currentPending = parseFloat(master.pendingAmount || "0");
        const paidAmount = parseFloat(data.amount);
        const newPending = Math.max(0, currentPending - paidAmount);
        
        await master.update({ 
          pendingAmount: newPending,
          status: newPending === 0 ? "Closed" : "In Progress"
        });
      }
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
      order: [["createdAt", "DESC"]]
    });
    return NextResponse.json({ success: true, data: payments });
  } catch (error: any) {
    console.error("Legal Payment GET Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
