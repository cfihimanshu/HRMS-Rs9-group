import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Op } from "sequelize";
import { authOptions } from "@/lib/auth";
import { safeAuthenticate } from "@/lib/sequelize";
import LegalNotice from "@/models/sequelize/LegalNotice";
import LegalWorkLog from "@/models/sequelize/LegalWorkLog";

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
    const rawBankName = searchParams.get("bankName") || "";
    const rawBranchName = searchParams.get("branchName") || "";
    const includeAll = searchParams.get("scope") === "all";

    if (!includeAll && !bankId && !rawBankName) {
      return NextResponse.json(
        { success: false, error: "Bank selection is required." },
        { status: 400 }
      );
    }

    if (!(await safeAuthenticate(5000))) {
      return NextResponse.json({ success: false, error: "Database unavailable" }, { status: 503 });
    }

    // Clean bank & branch names (e.g. remove "(89654)" or branch codes)
    const cleanBank = rawBankName.replace(/\s*\([\d\w]+\)/g, "").trim();
    const cleanBranch = rawBranchName.replace(/\s*\([\d\w]+\)/g, "").trim();

    const workLogMatchConditions: any[] = [];
    const noticeMatchConditions: any[] = [];

    if (branchId && branchId !== "0" && branchId !== "null") {
      workLogMatchConditions.push({ masterId: branchId });
      noticeMatchConditions.push({ branchId: branchId }, { masterId: branchId });
    }
    if (cleanBank) {
      if (cleanBranch) {
        workLogMatchConditions.push({
          bankName: { [Op.like]: `%${cleanBank}%` },
          branchName: { [Op.like]: `%${cleanBranch}%` }
        });
      } else {
        workLogMatchConditions.push({ bankName: { [Op.like]: `%${cleanBank}%` } });
      }
    } else if (bankId && bankId !== "0" && bankId !== "null") {
      workLogMatchConditions.push({ masterId: bankId });
      noticeMatchConditions.push({ bankId: bankId });
    }

    // 1. Fetch LegalWorkLog records for this bank / branch
    const workLogs = await LegalWorkLog.findAll({
      where: workLogMatchConditions.length > 0 ? { [Op.or]: workLogMatchConditions } : {},
      order: [["createdAt", "DESC"]],
      raw: true,
    });

    // Post-filter workLogs strictly by selected branch if cleanBranch is provided
    const targetBranchNorm = cleanBranch ? cleanBranch.toLowerCase() : "";
    const targetBankNorm = cleanBank ? cleanBank.toLowerCase() : "";

    const filteredWorkLogs = workLogs.filter((log: any) => {
      const logBank = (log.bankName || "").trim().toLowerCase();
      const logBranch = (log.branchName || "").trim().toLowerCase();

      // If branchId is explicitly matched, allow it
      if (branchId && branchId !== "0" && branchId !== "null" && String(log.masterId) === String(branchId)) {
        return true;
      }
      
      // Strict bank match
      if (targetBankNorm && logBank && !logBank.includes(targetBankNorm) && !targetBankNorm.includes(logBank)) {
        return false;
      }

      // Strict branch match: if branch selected, log must match branch name!
      if (targetBranchNorm && logBranch && !logBranch.includes(targetBranchNorm) && !targetBranchNorm.includes(logBranch)) {
        return false;
      }

      return true;
    });

    // 2. Fetch LegalNotice records for this bank / branch (only using valid columns in LegalNotice table)
    const notices = (noticeMatchConditions.length > 0 || includeAll) ? await LegalNotice.findAll({
      where: noticeMatchConditions.length > 0 ? { [Op.or]: noticeMatchConditions } : {},
      order: [["createdAt", "DESC"]],
      raw: true,
    }) : [];

    // Group work logs by case (masterId or bank+branch+category)
    const caseGroupsMap = new Map<string, any[]>();
    for (const log of filteredWorkLogs) {
      const mId = log.masterId;
      const bN = (log.bankName || cleanBank).trim();
      const brN = (log.branchName || cleanBranch).trim();
      const cat = log.businessDevOption || log.category || "ADVOCATE NOTICE";
      const key = mId ? `m_${mId}` : `b_${bN}_${brN}_${cat}`;

      if (!caseGroupsMap.has(key)) {
        caseGroupsMap.set(key, []);
      }
      caseGroupsMap.get(key)!.push(log);
    }

    const billsList: any[] = [];

    // Extract bill for each case group
    caseGroupsMap.forEach((logs, groupKey) => {
      // Find log with explicit bill details (e.g. from PREPARE BILL stage or billNo/billAmount)
      const billLog = logs.find(l =>
        (l.businessDevSubOption || l.subCategory || "").toUpperCase().includes("PREPARE BILL") ||
        (l.billNo && String(l.billNo).trim()) ||
        (l.billAmount && parseFloat(String(l.billAmount)) > 0)
      );

      // Strictly require PREPARE BILL stage or billNo/billAmount to be present
      if (!billLog) {
        return;
      }

      const billNoStr = billLog.billNo || logs.map(l => l.billNo).filter(Boolean).pop() || `BILL-${billLog.id || logs[0].id}`;
      const billDateStr = billLog.billDate || logs.map(l => l.billDate).filter(Boolean).pop() || (billLog.workDate ? new Date(billLog.workDate).toISOString().split("T")[0] : "—");

      // Calculate bill amount
      let explicitBillAmt = 0;
      const billAmtRaw = billLog.billAmount || logs.map(l => l.billAmount).filter(Boolean).pop();
      if (billAmtRaw) {
        explicitBillAmt = parseFloat(String(billAmtRaw).replace(/[^0-9.]/g, "")) || 0;
      }

      let countVal = 1;
      let rateVal = 0;
      for (const l of logs) {
        if (l.noOfCount) countVal = parseFloat(l.noOfCount) || countVal;
        if (l.finalRate) rateVal = parseFloat(l.finalRate) || rateVal;
      }
      const noticeRev = countVal * rateVal;
      const dispatchLog = logs.find(l => (l.businessDevSubOption || l.subCategory || "").toUpperCase().includes("DISPATCH"));
      const dispatchCost = parseFloat(dispatchLog?.stageAmount || "0") || 0;

      const totalBillAmount = explicitBillAmt > 0 ? explicitBillAmt : (noticeRev + dispatchCost > 0 ? noticeRev + dispatchCost : parseFloat(billLog.stageAmount || logs[0].stageAmount || "0") || 0);

      if (totalBillAmount > 0) {
        // Calculate payment received across all logs and installments in this case group
        let receivedAmt = 0;

        for (const l of logs) {
          const sub = (l.businessDevSubOption || l.subCategory || "").toUpperCase();
          const cat = (l.businessDevOption || l.category || "").toUpperCase();

          let logReceived = 0;

          if (l.financialDetails) {
            try {
              const fin = typeof l.financialDetails === "string" ? JSON.parse(l.financialDetails) : l.financialDetails;
              if (Array.isArray(fin?.paymentInstallments) && fin.paymentInstallments.length > 0) {
                logReceived = fin.paymentInstallments.reduce((sum: number, inst: any) => sum + (parseFloat(String(inst.amount || 0)) || 0), 0);
              } else if (fin?.receivedAmount !== undefined && fin?.receivedAmount !== null) {
                logReceived = parseFloat(String(fin.receivedAmount)) || 0;
              }
            } catch (e) {}
          }

          if (logReceived === 0) {
            logReceived = parseFloat(String(l.stageAmount || l.amountRcvd || l.amount || "0")) || 0;
          }

          if (logReceived > receivedAmt) {
            receivedAmt = logReceived;
          }
        }

        billsList.push({
          id: groupKey,
          billNo: billNoStr,
          billDate: billDateStr,
          billAmount: totalBillAmount,
          receivedAmount: receivedAmt,
          pendingAmount: Math.max(0, totalBillAmount - receivedAmt),
          category: billLog.businessDevOption || billLog.category || logs[0].businessDevOption || logs[0].category || "ADVOCATE NOTICE",
          bankName: billLog.bankName || logs[0].bankName || cleanBank,
          branchName: billLog.branchName || logs[0].branchName || cleanBranch,
          source: "work_log"
        });
      }
    });

    // Also include explicit LegalNotice rows if not already matched
    for (const notice of notices) {
      const explicitBillAmt = parseFloat(String(notice.billAmount || "0").replace(/[^0-9.]/g, "")) || 0;
      if (explicitBillAmt <= 0) continue;

      const billNoStr = notice.billNo || `BILL-N${notice.id}`;
      const dedupeKey = `notice_${notice.id}`;
      const rcvd = parseFloat(String(notice.amountRcvd || "0")) || 0;

      if (!billsList.some(b => b.billNo === billNoStr)) {
        billsList.push({
          id: dedupeKey,
          noticeId: notice.id,
          billNo: billNoStr,
          billDate: notice.billDate || "—",
          billAmount: explicitBillAmt,
          receivedAmount: rcvd,
          pendingAmount: Math.max(0, explicitBillAmt - rcvd),
          category: notice.noticeType || "ADVOCATE NOTICE",
          bankName: notice.bankName || cleanBank,
          branchName: notice.branchName || cleanBranch,
          source: "notice"
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: billsList,
      summary: {
        totalBills: billsList.length,
        totalBillAmount: billsList.reduce((sum: number, bill: any) => sum + bill.billAmount, 0),
        totalReceivedAmount: billsList.reduce(
          (sum: number, bill: any) => sum + bill.receivedAmount,
          0
        ),
        totalPendingAmount: billsList.reduce(
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
