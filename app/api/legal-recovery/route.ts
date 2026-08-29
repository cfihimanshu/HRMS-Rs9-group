import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import LegalRecoveryMaster from "@/models/sequelize/LegalRecoveryMaster";
import LegalRecoveryPayment from "@/models/sequelize/LegalRecoveryPayment";
import BranchMaster from "@/models/sequelize/BranchMaster";
import sequelize, { safeAuthenticate } from "@/lib/sequelize";
import { DataTypes } from "sequelize";

let columnsEnsured = false;
async function ensureLegalRecoveryColumns() {
  if (columnsEnsured) return;
  try {
    const queryInterface = sequelize.getQueryInterface();
    const tableDesc = await queryInterface.describeTable("legal_recovery_masters").catch(() => null);
    if (tableDesc) {
      if (!tableDesc.totalBillAmount) {
        await queryInterface.addColumn("legal_recovery_masters", "totalBillAmount", {
          type: DataTypes.DECIMAL(15, 2),
          allowNull: true
        }).catch(() => {});
      }
      if (!tableDesc.branchEmail) {
        await queryInterface.addColumn("legal_recovery_masters", "branchEmail", {
          type: DataTypes.STRING,
          allowNull: true
        }).catch(() => {});
      }
      if (!tableDesc.foName) {
        await queryInterface.addColumn("legal_recovery_masters", "foName", {
          type: DataTypes.STRING,
          allowNull: true
        }).catch(() => {});
      }
      if (!tableDesc.foContact) {
        await queryInterface.addColumn("legal_recovery_masters", "foContact", {
          type: DataTypes.STRING,
          allowNull: true
        }).catch(() => {});
      }
      if (!tableDesc.rbo) {
        await queryInterface.addColumn("legal_recovery_masters", "rbo", {
          type: DataTypes.STRING,
          allowNull: true
        }).catch(() => {});
      }
      if (!tableDesc.archivedAt) {
        await queryInterface.addColumn("legal_recovery_masters", "archivedAt", {
          type: DataTypes.DATE,
          allowNull: true
        }).catch(() => {});
      }
    }
    columnsEnsured = true;
  } catch (e) {
    console.warn("Could not check/add legal_recovery_masters columns:", e);
  }
}

import BankMaster from "@/models/sequelize/BankMaster";
import LegalNotice from "@/models/sequelize/LegalNotice";
import LegalWorkLog from "@/models/sequelize/LegalWorkLog";
import LegalRecoveryBill from "@/models/sequelize/LegalRecoveryBill";

// Helper to safely parse financial details JSON
function parseFinances(details: any) {
  if (!details) return null;
  if (typeof details === "object") return details;
  try {
    return JSON.parse(details);
  } catch {
    return null;
  }
}

// GET all cases with dynamic notice billing, received & pending amounts and branch enrichment
export async function GET() {
  try {
    const isDbConnected = await safeAuthenticate(4000);
    if (!isDbConnected) {
      return NextResponse.json({ success: true, data: [] });
    }

    try {
      await LegalRecoveryMaster.sync();
      await LegalRecoveryPayment.sync().catch(() => {});
      await BranchMaster.sync().catch(() => {});
      await BankMaster.sync().catch(() => {});
      await LegalNotice.sync().catch(() => {});
      await LegalWorkLog.sync().catch(() => {});
      await ensureLegalRecoveryColumns();
    } catch (sErr) {
      console.warn("LegalRecoveryMaster sync warning:", sErr);
    }

    await LegalRecoveryBill.sync().catch(() => {});
    const [cases, payments, branches, banks, notices, workLogs, importedBills] = await Promise.all([
      LegalRecoveryMaster.findAll({
        where: { archivedAt: null },
        order: [["createdAt", "DESC"]],
        raw: true
      }),
      LegalRecoveryPayment.findAll({
        raw: true
      }).catch(() => []),
      BranchMaster.findAll({
        raw: true
      }).catch(() => []),
      BankMaster.findAll({
        raw: true
      }).catch(() => []),
      LegalNotice.findAll({
        raw: true
      }).catch(() => []),
      LegalWorkLog.findAll({
        raw: true
      }).catch(() => []),
      LegalRecoveryBill.findAll({ raw: true }).catch(() => [])
    ]);

    const importedBillsByMaster: Record<number, any[]> = {};
    importedBills.forEach((bill: any) => {
      const masterId = Number(bill.masterId);
      if (!importedBillsByMaster[masterId]) importedBillsByMaster[masterId] = [];
      importedBillsByMaster[masterId].push(bill);
    });

    // Build direct payments map by masterId
    const directPaymentsByMasterId: Record<number, number> = {};
    payments.forEach((p: any) => {
      const mId = Number(p.masterId);
      const amt = parseFloat(p.amount) || 0;
      if (mId) {
        directPaymentsByMasterId[mId] = (directPaymentsByMasterId[mId] || 0) + amt;
      }
    });

    // Build branch maps
    const branchMapByCode: Record<string, any> = {};
    const branchMapById: Record<string, any> = {};
    branches.forEach((b: any) => {
      if (b.branchCode) branchMapByCode[String(b.branchCode).toLowerCase().trim()] = b;
      if (b.id) branchMapById[String(b.id)] = b;
    });

    // Build bank maps
    const bankMapById: Record<string, any> = {};
    const bankMapByName: Record<string, any> = {};
    banks.forEach((b: any) => {
      if (b.id) bankMapById[String(b.id)] = b;
      if (b.bankName) bankMapByName[b.bankName.trim().toLowerCase()] = b;
    });

    const getGroupKey = (bank: string, branch: string) => {
      const bClean = (bank || "").trim().toLowerCase();
      const brClean = (branch || "").trim().toLowerCase();
      return `${bClean}___${brClean}`;
    };

    // 1. Group work logs and notices by Bank & Branch & Category
    const rawCaseMap = new Map<string, any[]>();

    // Add notices
    notices.forEach((n: any) => {
      const resolvedBank = n.bankName || (n.bankId ? bankMapById[String(n.bankId)]?.bankName : undefined) || "Registered Bank";
      const resolvedBranch = n.branchName || (n.branchId ? branchMapById[String(n.branchId)]?.branchName : undefined) || "General Branch";
      const catKey = (n.typeOfNotice || n.noticeType || "ADVOCATE NOTICE").toUpperCase().trim();
      const groupKey = n.masterId && Number(n.masterId) > 0
        ? `m_${n.masterId}_${catKey}`
        : `b_${getGroupKey(resolvedBank, resolvedBranch)}_${catKey}`;

      if (!rawCaseMap.has(groupKey)) rawCaseMap.set(groupKey, []);
      rawCaseMap.get(groupKey)!.push({ ...n, isRawNotice: true, resolvedBank, resolvedBranch });
    });

    // Add work logs
    workLogs.forEach((wl: any) => {
      const resolvedBank = wl.bankName || "Registered Bank";
      const resolvedBranch = wl.branchName || "General Branch";
      const catKey = (wl.businessDevOption || wl.category || "ADVOCATE NOTICE").toUpperCase().trim();
      const groupKey = wl.masterId && Number(wl.masterId) > 0
        ? `m_${wl.masterId}_${catKey}`
        : `b_${getGroupKey(resolvedBank, resolvedBranch)}_${catKey}`;

      if (!rawCaseMap.has(groupKey)) rawCaseMap.set(groupKey, []);
      rawCaseMap.get(groupKey)!.push({ ...wl, isRawNotice: false, resolvedBank, resolvedBranch });
    });

    // 2. Consolidate each work group to extract accurate Bill Amount, Received Amount, and Pending Amount
    interface ConsolidatedItem {
      id: string | number;
      masterId?: number;
      bankName: string;
      branchName: string;
      noticeType: string;
      billNo: string;
      billDate?: string;
      quantity: number;
      billAmount: number;
      amountRcvd: number;
      pendingAmount: number;
      handoverTo?: string;
      dispatchedBy?: string;
      handoverRemarks?: string;
      documentUrl?: string;
    }

    const consolidatedItemsByBankBranch: Record<string, ConsolidatedItem[]> = {};
    const consolidatedItemsByMasterId: Record<number, ConsolidatedItem[]> = {};

    rawCaseMap.forEach((items) => {
      if (!items || items.length === 0) return;

      const primary = items.find(i => i.isRawNotice) || items[0];
      const bankName = primary.resolvedBank || primary.bankName || "Registered Bank";
      const branchName = primary.resolvedBranch || primary.branchName || "General Branch";
      const noticeType = primary.typeOfNotice || primary.noticeType || primary.businessDevOption || primary.category || "Advocate Notice";

      // Scan all logs in this group for bill and payment details
      let billNo = primary.billNo || "";
      let billDate = primary.billDate || "";
      let billAmount = parseFloat(primary.billAmount) || 0;
      let receivedAmount = parseFloat(primary.amountRcvd) || 0;
      let qty = parseInt(primary.quantity || primary.noOfCount) || 1;
      let handoverTo = primary.handoverTo || primary.personName || "";
      let dispatchedBy = primary.dispatchedBy || "";
      let handoverRemarks = primary.handoverRemarks || primary.remarks || "";
      let docUrl = primary.documentUrl || primary.uploadedFileName || "";
      let mId = primary.masterId ? Number(primary.masterId) : undefined;

      items.forEach((it) => {
        const sub = (it.businessDevSubOption || it.subCategory || "").toUpperCase();
        const fin = parseFinances(it.financialDetails);

        if (it.masterId && Number(it.masterId) > 0) {
          mId = Number(it.masterId);
        }

        if (it.billNo && it.billNo !== "N/A") {
          billNo = it.billNo;
        } else if (fin?.billNo) {
          billNo = fin.billNo;
        }

        if (it.billDate) {
          billDate = it.billDate;
        } else if (fin?.billDate) {
          billDate = fin.billDate;
        }

        if (it.noOfCount) {
          qty = Math.max(qty, parseInt(it.noOfCount) || 1);
        }

        if (it.dispatchedBy) dispatchedBy = it.dispatchedBy;
        if (it.handoverTo || it.personName) handoverTo = it.handoverTo || it.personName;
        if (it.handoverRemarks || it.remarks) handoverRemarks = it.handoverRemarks || it.remarks;
        if (it.documentUrl || it.uploadedFileName) docUrl = it.documentUrl || it.uploadedFileName;

        // Bill amount extraction
        const logBill = parseFloat(fin?.totalBillAmount || it.billAmount || (sub.includes("BILL") ? it.stageAmount : 0)) || 0;
        if (logBill > billAmount) {
          billAmount = logBill;
        }

        // Received amount extraction
        if (Array.isArray(fin?.paymentInstallments) && fin.paymentInstallments.length > 0) {
          const sumInst = fin.paymentInstallments.reduce((sum: number, inst: any) => sum + (parseFloat(inst.amount) || 0), 0);
          if (sumInst > receivedAmount) receivedAmount = sumInst;
        } else if (fin?.receivedAmount !== undefined && fin?.receivedAmount !== null) {
          const finRec = parseFloat(fin.receivedAmount) || 0;
          if (finRec > receivedAmount) receivedAmount = finRec;
        } else if (sub.includes("PAYMENT") || sub.includes("REQUEST PAYMENT")) {
          const stageRec = parseFloat(it.stageAmount || it.billAmount) || 0;
          if (stageRec > receivedAmount) receivedAmount = stageRec;
        }
      });

      const pending = Math.max(0, billAmount - receivedAmount);

      // Only include if this work group has reached the billing stage
      if (billAmount > 0 || receivedAmount > 0 || (billNo && billNo !== "N/A")) {
        const consolidatedItem: ConsolidatedItem = {
          id: primary.id || `c_${Date.now()}`,
          masterId: mId,
          bankName,
          branchName,
          noticeType,
          billNo: billNo || "N/A",
          billDate: billDate || (primary.createdAt ? new Date(primary.createdAt).toISOString().split('T')[0] : undefined),
          quantity: qty,
          billAmount,
          amountRcvd: receivedAmount,
          pendingAmount: pending,
          handoverTo,
          dispatchedBy,
          handoverRemarks,
          documentUrl: docUrl
        };

        const bKey = getGroupKey(bankName, branchName);
        if (!consolidatedItemsByBankBranch[bKey]) consolidatedItemsByBankBranch[bKey] = [];
        consolidatedItemsByBankBranch[bKey].push(consolidatedItem);

        if (mId && mId > 0) {
          if (!consolidatedItemsByMasterId[mId]) consolidatedItemsByMasterId[mId] = [];
          consolidatedItemsByMasterId[mId].push(consolidatedItem);
        }
      }
    });

    // Track which bank-branch groups are covered by registered cases
    const coveredGroupKeys = new Set<string>();

    const enrichedCases = cases.map((c: any) => {
      const caseId = Number(c.id);
      const directReceived = directPaymentsByMasterId[caseId] || 0;

      // Find linked branch details
      const bKey = c.branchId ? String(c.branchId).toLowerCase().trim() : "";
      const linkedBranch = branchMapByCode[bKey] || branchMapById[String(c.branchId)] || null;
      const bankKey = c.bankName ? c.bankName.trim().toLowerCase() : "";
      const linkedBank = bankMapByName[bankKey] || (c.bankId ? bankMapById[String(c.bankId)] : null);

      const resolvedBankName = c.bankName || linkedBank?.bankName || "Registered Bank";
      const resolvedBranchName = c.branchName || linkedBranch?.branchName || "General Branch";
      const grpKey = getGroupKey(resolvedBankName, resolvedBranchName);
      coveredGroupKeys.add(grpKey);

      // Collect all consolidated items for this case: combine by masterId and by bank+branch
      const itemsMap = new Map<string | number, ConsolidatedItem>();

      (consolidatedItemsByMasterId[caseId] || []).forEach(item => itemsMap.set(item.id, item));
      // Bank/branch fallback is only for legacy unlinked items. Never attach a work
      // item belonging to another master case that happens to share the branch.
      (consolidatedItemsByBankBranch[grpKey] || [])
        .filter(item => !item.masterId || Number(item.masterId) === caseId)
        .forEach(item => itemsMap.set(item.id, item));

      const noticesList = Array.from(itemsMap.values()).filter(it => it.billAmount > 0 || it.amountRcvd > 0 || (it.billNo && it.billNo !== "N/A"));

      const noticeCount = noticesList.reduce((sum, it) => sum + (it.quantity || 1), 0);
      const noticeBill = noticesList.reduce((sum, it) => sum + (it.billAmount || 0), 0);
      const noticeRcvd = noticesList.reduce((sum, it) => sum + (it.amountRcvd || 0), 0);

      const rawPending = parseFloat(c.pendingAmount);
      const rawTotalBill = parseFloat(c.totalBillAmount);
      const caseImportedBills = importedBillsByMaster[caseId] || [];
      const hasImportedBills = caseImportedBills.length > 0;
      // Total billed mirrors the spreadsheet Bill Amount column, including
      // cancelled historical invoices. Pending is strictly Status=Pending Due.
      const importedBillTotal = caseImportedBills
        .reduce((sum: number, b: any) => sum + (parseFloat(b.billAmount) || 0), 0);
      const importedReceivedTotal = caseImportedBills
        .filter((b: any) => String(b.status).toLowerCase() === "received")
        .reduce((sum: number, b: any) => sum + (parseFloat(b.receivedAmount) || 0), 0);
      const importedTdsTotal = caseImportedBills
        .filter((b: any) => String(b.status).toLowerCase() !== "cancelled")
        .reduce((sum: number, b: any) => sum + (parseFloat(b.tdsAmount) || 0), 0);
      const importedPendingTotal = caseImportedBills
        .filter((b: any) => String(b.status).toLowerCase() === "pending")
        .reduce((sum: number, b: any) => sum + (parseFloat(b.dueAmount) || 0), 0);

      const loggedReceived = directReceived + noticeRcvd;

      // Master values are the accounting source of truth. Work logs/notices are
      // only a fallback for legacy cases that do not have master finance values.
      let totalBillAmount = 0;
      if (hasImportedBills) {
        totalBillAmount = importedBillTotal;
      } else if (!isNaN(rawTotalBill) && rawTotalBill > 0) {
        totalBillAmount = rawTotalBill;
      } else if (noticeBill > 0) {
        totalBillAmount = noticeBill;
      } else if (!isNaN(rawPending) && rawPending > 0) {
        totalBillAmount = rawPending + loggedReceived;
      } else {
        totalBillAmount = loggedReceived;
      }

      const hasStoredPending = !isNaN(rawPending) && rawPending >= 0;
      const pendingAmount = hasImportedBills
        ? importedPendingTotal
        : hasStoredPending
        ? rawPending
        : Math.max(0, totalBillAmount - loggedReceived);
      const totalReceived = hasImportedBills
        ? importedReceivedTotal
        : !isNaN(rawTotalBill) && rawTotalBill > 0 && hasStoredPending
        ? Math.max(0, rawTotalBill - pendingAmount)
        : loggedReceived;
      totalBillAmount = Math.max(totalBillAmount, totalReceived + pendingAmount);
      const status = pendingAmount <= 0 && totalBillAmount > 0
        ? "Settled"
        : totalReceived > 0
          ? "In Progress"
          : (c.status || "Open");

      return {
        ...c,
        bankName: resolvedBankName,
        branchName: resolvedBranchName,
        noticeCount,
        noticesList,
        importedBills: caseImportedBills,
        importedBillCount: caseImportedBills.length,
        tdsAmount: Number(importedTdsTotal.toFixed(2)),
        companyCodes: Array.from(new Set(caseImportedBills.map((b: any) => b.companyCode).filter(Boolean))),
        totalBillAmount: Number(totalBillAmount.toFixed(2)),
        receivedAmount: Number(totalReceived.toFixed(2)),
        pendingAmount: Number(pendingAmount.toFixed(2)),
        status,
        branchEmail: c.branchEmail || linkedBranch?.branchEmail || "",
        foName: c.foName || linkedBranch?.foName || "",
        foContact: c.foContact || linkedBranch?.foContact || "",
        rbo: c.rbo || linkedBranch?.rbo || "",
        deptManagerName: c.deptManagerName || linkedBranch?.branchManager || "",
        contactNumber: c.contactNumber || linkedBranch?.branchManagerContact || linkedBranch?.foContact || "",
        aoName: c.aoName || linkedBranch?.aoName || ""
      };
    });

    // Unlinked work logs/notices remain available in their history screens, but
    // they must not recreate financial Bank Cases after the active register is cleared.

    // ONLY return banks/cases where the billing stage is reached (totalBillAmount > 0 or receivedAmount > 0)
    const activeBillingCases = enrichedCases.filter((c: any) => {
      const bill = parseFloat(c.totalBillAmount) || 0;
      const rcvd = parseFloat(c.receivedAmount) || 0;
      return bill > 0 || rcvd > 0;
    });

    return NextResponse.json({ success: true, data: activeBillingCases });
  } catch (error: any) {
    console.error("GET /api/legal-recovery error:", error);
    return NextResponse.json({ success: true, data: [], error: error.message });
  }
}

// POST a new case
export async function POST(request: Request) {
  try {
    const data = await request.json();
    const isDbConnected = await safeAuthenticate(6000);
    if (!isDbConnected) {
      return NextResponse.json({ success: false, error: "Database connection timeout" }, { status: 503 });
    }

    await LegalRecoveryMaster.sync();
    await ensureLegalRecoveryColumns();

    const totalBill = data.totalBillAmount ? parseFloat(data.totalBillAmount) : (data.pendingAmount ? parseFloat(data.pendingAmount) : 0);
    const pendingAmt = data.pendingAmount !== undefined && data.pendingAmount !== "" ? parseFloat(data.pendingAmount) : totalBill;

    const payload = {
      ...data,
      totalBillAmount: totalBill,
      pendingAmount: pendingAmt,
      status: data.status || (pendingAmt <= 0 ? "Settled" : "Open")
    };

    const newCase = await LegalRecoveryMaster.create(payload);
    return NextResponse.json({ success: true, data: newCase });
  } catch (error: any) {
    console.error("Legal Recovery POST Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT (Edit) a case
export async function PUT(request: Request) {
  try {
    const data = await request.json();
    const isDbConnected = await safeAuthenticate(6000);
    if (!isDbConnected) {
      return NextResponse.json({ success: false, error: "Database connection timeout" }, { status: 503 });
    }

    await ensureLegalRecoveryColumns();
    const caseItem = await LegalRecoveryMaster.findByPk(data.id);
    if (!caseItem) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    
    await caseItem.update(data);
    return NextResponse.json({ success: true, data: caseItem });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE a case
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ success: false, error: "ID is required" }, { status: 400 });

    const isDbConnected = await safeAuthenticate(6000);
    if (!isDbConnected) {
      return NextResponse.json({ success: false, error: "Database connection timeout" }, { status: 503 });
    }

    const caseItem = await LegalRecoveryMaster.findByPk(id);
    if (!caseItem) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });

    await caseItem.destroy();
    return NextResponse.json({ success: true, message: "Deleted successfully" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
