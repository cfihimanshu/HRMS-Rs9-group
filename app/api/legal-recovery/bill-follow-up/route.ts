import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Op } from "sequelize";
import { authOptions } from "@/lib/auth";
import { safeAuthenticate } from "@/lib/sequelize";
import LegalNotice from "@/models/sequelize/LegalNotice";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const bankId = searchParams.get("bankId");
    const branchId = searchParams.get("branchId");
    if (!bankId || !branchId) {
      return NextResponse.json(
        { success: false, error: "Bank and branch are required." },
        { status: 400 }
      );
    }

    if (!(await safeAuthenticate(5000))) {
      return NextResponse.json({ success: false, error: "Database unavailable" }, { status: 503 });
    }

    const notices = await LegalNotice.findAll({
      attributes: [
        "id",
        "billNo",
        "billDate",
        "billAmount",
        "amountRcvd",
        "paymentRcvdDate",
        "billingAttachments",
      ],
      where: {
        bankId,
        branchId,
        billAmount: { [Op.gt]: 0 },
      },
      order: [["billDate", "DESC"]],
      raw: true,
    });

    const bills = notices
      .map((notice: any) => {
        const billAmount = Number.parseFloat(notice.billAmount || "0") || 0;
        const receivedAmount = Number.parseFloat(notice.amountRcvd || "0") || 0;
        return {
          ...notice,
          billAmount,
          receivedAmount,
          pendingAmount: Math.max(0, billAmount - receivedAmount),
        };
      })
      .filter((notice: any) => notice.pendingAmount > 0);

    return NextResponse.json({
      success: true,
      data: bills,
      summary: {
        totalBills: bills.length,
        totalBillAmount: bills.reduce((sum: number, bill: any) => sum + bill.billAmount, 0),
        totalReceivedAmount: bills.reduce(
          (sum: number, bill: any) => sum + bill.receivedAmount,
          0
        ),
        totalPendingAmount: bills.reduce(
          (sum: number, bill: any) => sum + bill.pendingAmount,
          0
        ),
      },
    });
  } catch (error: any) {
    console.error("[GET /api/legal-recovery/bill-follow-up]", error);
    return NextResponse.json(
      { success: false, error: "Failed to load pending bills." },
      { status: 500 }
    );
  }
}
