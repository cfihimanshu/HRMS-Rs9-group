import { NextResponse } from "next/server";
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
    }
    columnsEnsured = true;
  } catch (e) {
    console.warn("Could not check/add legal_recovery_masters columns:", e);
  }
}

import BankMaster from "@/models/sequelize/BankMaster";
import LegalNotice from "@/models/sequelize/LegalNotice";

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
      await ensureLegalRecoveryColumns();
    } catch (sErr) {
      console.warn("LegalRecoveryMaster sync warning:", sErr);
    }

    const [cases, payments, branches, banks, notices] = await Promise.all([
      LegalRecoveryMaster.findAll({
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
      }).catch(() => [])
    ]);

    // Build payment map by masterId
    const paymentsByMasterId: Record<number, number> = {};
    payments.forEach((p: any) => {
      const mId = Number(p.masterId);
      const amt = parseFloat(p.amount) || 0;
      if (mId) {
        paymentsByMasterId[mId] = (paymentsByMasterId[mId] || 0) + amt;
      }
    });

    // Build branch maps
    const branchMapByCode: Record<string, any> = {};
    const branchMapById: Record<string, any> = {};
    branches.forEach((b: any) => {
      if (b.branchCode) branchMapByCode[String(b.branchCode).toLowerCase()] = b;
      if (b.id) branchMapById[String(b.id)] = b;
    });

    // Build bank maps
    const bankMapById: Record<string, any> = {};
    const bankMapByName: Record<string, any> = {};
    banks.forEach((b: any) => {
      if (b.id) bankMapById[String(b.id)] = b;
      if (b.bankName) bankMapByName[b.bankName.trim().toLowerCase()] = b;
    });

    // Group notices by masterId, branchId, and bankId
    interface NoticeGroup {
      count: number;
      billTotal: number;
      receivedTotal: number;
      latestDate?: string;
      noticesList: any[];
    }

    const noticeByMasterId: Record<number, NoticeGroup> = {};
    const noticeByBranchId: Record<string, NoticeGroup> = {};
    const noticeByBankId: Record<string, NoticeGroup> = {};

    notices.forEach((n: any) => {
      const qty = parseInt(n.quantity) || 1;
      const bill = parseFloat(n.billAmount) || 0;
      const rcvd = parseFloat(n.amountRcvd) || 0;
      const dt = n.billDate || n.noticeDate || n.noticeOrderDate || (n.createdAt ? new Date(n.createdAt).toISOString().split('T')[0] : undefined);

      const noticeItem = {
        id: n.id,
        noticeType: n.noticeType || n.typeOfNotice || "Advocate Notice",
        billNo: n.billNo || "N/A",
        billDate: dt,
        quantity: qty,
        billAmount: bill,
        amountRcvd: rcvd,
        pendingAmount: Math.max(0, bill - rcvd),
        paymentRcvdDate: n.paymentRcvdDate,
        tdsDeduction: parseFloat(n.tdsDeduction) || 0,
        gstDeduction: parseFloat(n.gstDeduction) || 0,
        handoverTo: n.handoverTo,
        broughtBy: n.broughtBy,
        dispatchedBy: n.dispatchedBy,
        handoverRemarks: n.handoverRemarks,
        documentUrl: n.documentUrl
      };

      const addStats = (group: NoticeGroup | undefined): NoticeGroup => {
        const g = group || { count: 0, billTotal: 0, receivedTotal: 0, noticesList: [] };
        g.count += qty;
        g.billTotal += bill;
        g.receivedTotal += rcvd;
        g.noticesList.push(noticeItem);
        if (dt && (!g.latestDate || dt > g.latestDate)) {
          g.latestDate = dt;
        }
        return g;
      };

      if (n.masterId) {
        noticeByMasterId[Number(n.masterId)] = addStats(noticeByMasterId[Number(n.masterId)]);
      }
      if (n.branchId) {
        noticeByBranchId[String(n.branchId)] = addStats(noticeByBranchId[String(n.branchId)]);
      }
      if (n.bankId) {
        noticeByBankId[String(n.bankId)] = addStats(noticeByBankId[String(n.bankId)]);
      }
    });

    // Track which branches / banks have existing cases
    const existingCaseKeys = new Set<string>();

    const enrichedCases = cases.map((c: any) => {
      const caseId = Number(c.id);
      const directReceived = paymentsByMasterId[caseId] || 0;

      // Find linked branch details
      const bKey = c.branchId ? String(c.branchId).toLowerCase() : "";
      const linkedBranch = branchMapByCode[bKey] || branchMapById[String(c.branchId)] || null;
      const bankKey = c.bankName ? c.bankName.trim().toLowerCase() : "";
      const linkedBank = bankMapByName[bankKey] || (c.bankId ? bankMapById[String(c.bankId)] : null);

      if (linkedBranch?.id) existingCaseKeys.add(`branch_${linkedBranch.id}`);
      if (c.branchId) existingCaseKeys.add(`branch_code_${String(c.branchId).toLowerCase()}`);
      if (linkedBank?.id) existingCaseKeys.add(`bank_${linkedBank.id}`);

      // Gather notice stats
      const nStatsMaster = noticeByMasterId[caseId];
      const nStatsBranch = linkedBranch?.id ? noticeByBranchId[String(linkedBranch.id)] : (c.branchId ? noticeByBranchId[String(c.branchId)] : undefined);
      const nStatsBank = linkedBank?.id ? noticeByBankId[String(linkedBank.id)] : undefined;

      const noticeCount = (nStatsMaster?.count || 0) + (nStatsBranch?.count || 0) || (nStatsBank?.count || 0);
      const noticeBill = (nStatsMaster?.billTotal || 0) + (nStatsBranch?.billTotal || 0) || (nStatsBank?.billTotal || 0);
      const noticeRcvd = (nStatsMaster?.receivedTotal || 0) + (nStatsBranch?.receivedTotal || 0) || (nStatsBank?.receivedTotal || 0);
      const latestNoticeDate = nStatsMaster?.latestDate || nStatsBranch?.latestDate || nStatsBank?.latestDate;
      const noticesList = [
        ...(nStatsMaster?.noticesList || []),
        ...(nStatsBranch?.noticesList || []),
        ...(!nStatsMaster && !nStatsBranch ? (nStatsBank?.noticesList || []) : [])
      ];

      const rawPending = parseFloat(c.pendingAmount);
      const rawTotalBill = parseFloat(c.totalBillAmount);

      const totalReceived = directReceived + noticeRcvd;

      let totalBillAmount = 0;
      if (!isNaN(rawTotalBill) && rawTotalBill > 0) {
        totalBillAmount = Math.max(rawTotalBill, noticeBill);
      } else if (noticeBill > 0) {
        totalBillAmount = noticeBill;
      } else if (!isNaN(rawPending) && rawPending > 0) {
        totalBillAmount = rawPending + totalReceived;
      } else {
        totalBillAmount = totalReceived;
      }

      let pendingAmount = Math.max(0, totalBillAmount - totalReceived);
      let status = c.status || (pendingAmount <= 0 && totalBillAmount > 0 ? "Settled" : totalReceived > 0 ? "In Progress" : "Open");

      return {
        ...c,
        noticeCount,
        noticesList,
        totalBillAmount: Number(totalBillAmount.toFixed(2)),
        receivedAmount: Number(totalReceived.toFixed(2)),
        pendingAmount: Number(pendingAmount.toFixed(2)),
        pendingSince: c.pendingSince || latestNoticeDate || c.createdAt,
        status,
        // Enrich branch contact info if empty on case
        branchEmail: c.branchEmail || linkedBranch?.branchEmail || "",
        foName: c.foName || linkedBranch?.foName || "",
        foContact: c.foContact || linkedBranch?.foContact || "",
        rbo: c.rbo || linkedBranch?.rbo || "",
        deptManagerName: c.deptManagerName || linkedBranch?.branchManager || "",
        contactNumber: c.contactNumber || linkedBranch?.branchManagerContact || linkedBranch?.foContact || "",
        aoName: c.aoName || linkedBranch?.aoName || ""
      };
    });

    // Also include other branches ONLY IF they have billed notices
    for (const br of branches) {
      const isAlreadyCovered =
        existingCaseKeys.has(`branch_${br.id}`) ||
        (br.branchCode && existingCaseKeys.has(`branch_code_${String(br.branchCode).toLowerCase()}`));

      if (!isAlreadyCovered) {
        const parentBank = bankMapById[String(br.bankId)] || null;
        const nStats = noticeByBranchId[String(br.id)] || (br.branchCode ? noticeByBranchId[String(br.branchCode)] : undefined);
        const noticeBill = nStats?.billTotal || 0;
        const noticeRcvd = nStats?.receivedTotal || 0;

        // ONLY include if billing stage reached (bill amount > 0 or notices with billing)
        if (noticeBill > 0 || noticeRcvd > 0) {
          const noticeCount = nStats?.count || 0;
          const pending = Math.max(0, noticeBill - noticeRcvd);
          const bankName = parentBank?.bankName || "Registered Bank";
          const branchName = br.branchName || "General Branch";

          let createdCase = null;
          try {
            createdCase = await LegalRecoveryMaster.create({
              bankName,
              branchName,
              branchId: br.branchCode || String(br.id),
              aoName: br.aoName || "",
              deptManagerName: br.branchManager || "",
              contactNumber: br.branchManagerContact || br.foContact || "",
              branchEmail: br.branchEmail || "",
              foName: br.foName || "",
              foContact: br.foContact || "",
              rbo: br.rbo || "",
              totalBillAmount: noticeBill,
              pendingAmount: pending,
              pendingSince: nStats?.latestDate || br.createdAt,
              status: pending <= 0 ? "Settled" : noticeRcvd > 0 ? "In Progress" : "Open"
            });
          } catch (cErr) {
            console.warn("Auto-create case from branch error:", cErr);
          }

          enrichedCases.push({
            id: createdCase ? createdCase.id : (br.id * -1000),
            bankName,
            branchName,
            branchId: br.branchCode || String(br.id),
            aoName: br.aoName || "",
            deptManagerName: br.branchManager || "",
            contactNumber: br.branchManagerContact || br.foContact || "",
            branchEmail: br.branchEmail || "",
            foName: br.foName || "",
            foContact: br.foContact || "",
            rbo: br.rbo || "",
            noticeCount,
            noticesList: nStats?.noticesList || [],
            totalBillAmount: Number(noticeBill.toFixed(2)),
            receivedAmount: Number(noticeRcvd.toFixed(2)),
            pendingAmount: Number(pending.toFixed(2)),
            pendingSince: nStats?.latestDate || br.createdAt,
            status: pending <= 0 ? "Settled" : noticeRcvd > 0 ? "In Progress" : "Open",
            createdAt: br.createdAt
          });
        }
      }
    }

    // Filter to ONLY return banks/cases where billing stage is reached (totalBillAmount > 0 or receivedAmount > 0 or pendingAmount > 0)
    const activeBillingCases = enrichedCases.filter((c: any) => {
      const bill = parseFloat(c.totalBillAmount) || 0;
      const rcvd = parseFloat(c.receivedAmount) || 0;
      const pend = parseFloat(c.pendingAmount) || 0;
      return bill > 0 || rcvd > 0 || pend > 0 || (c.noticesList && c.noticesList.length > 0);
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
