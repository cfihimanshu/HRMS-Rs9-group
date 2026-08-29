import { NextResponse } from "next/server";
import { Op, QueryTypes } from "sequelize";
import sequelize, { safeAuthenticate } from "@/lib/sequelize";
import Company from "@/models/sequelize/Company";
import BankMaster from "@/models/sequelize/BankMaster";
import BranchMaster from "@/models/sequelize/BranchMaster";
import LegalRecoveryMaster from "@/models/sequelize/LegalRecoveryMaster";
import LegalRecoveryBill from "@/models/sequelize/LegalRecoveryBill";

export const dynamic = "force-dynamic";

let billRegisterCache: { data: any[]; expiresAt: number } | null = null;

const clean = (value: unknown) => String(value ?? "").trim();
const norm = (value: unknown) => clean(value).toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "");
const amount = (value: unknown) => Number(clean(value).replace(/[₹,\s]/g, "")) || 0;
const BANK_ALIASES: Record<string, string> = { ib: "indianbank", sbi: "statebankofindia" };

function isoDate(value: unknown): string | null {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10);
  if (typeof value === "number") {
    const d = new Date(Math.round((value - 25569) * 86400 * 1000));
    return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
  }
  const raw = clean(value);
  const parts = raw.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
  if (parts) return `${parts[3]}-${parts[2].padStart(2, "0")}-${parts[1].padStart(2, "0")}`;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

function normalizedStatus(value: unknown) {
  const v = norm(value);
  if (["recd", "received", "paid", "settled"].includes(v)) return "Received";
  if (["cancel", "cancelled", "canceled"].includes(v)) return "Cancelled";
  return "Pending";
}

export async function GET() {
  try {
    if (billRegisterCache && billRegisterCache.expiresAt > Date.now()) {
      return NextResponse.json({ success: true, data: billRegisterCache.data }, {
        headers: { "Cache-Control": "private, max-age=15, stale-while-revalidate=45" },
      });
    }
    if (!(await safeAuthenticate(6000))) return NextResponse.json({ success: false, error: "Database connection timeout" }, { status: 503 });
    const data = await sequelize.query<any>(`
      SELECT bills.*,
        COALESCE(NULLIF(bills.companyCode, ''), company.code, company.name, '') AS company,
        COALESCE(bank.bankName, '') AS bankName,
        COALESCE(branch.branchName, '') AS branchName,
        COALESCE(branch.branchCode, '') AS branchCode
      FROM legal_recovery_bills AS bills
      INNER JOIN legal_recovery_masters AS master
        ON master.id = bills.masterId AND master.archivedAt IS NULL
      LEFT JOIN companys AS company ON company.id = bills.companyId
      LEFT JOIN bank_masters AS bank ON bank.id = bills.bankId
      LEFT JOIN branch_masters AS branch ON branch.id = bills.branchId
      ORDER BY bills.billDate ASC, bills.id ASC
    `, { type: QueryTypes.SELECT });
    billRegisterCache = { data, expiresAt: Date.now() + 30_000 };
    return NextResponse.json({ success: true, data }, {
      headers: { "Cache-Control": "private, max-age=15, stale-while-revalidate=45" },
    });
  } catch (error: any) {
    console.error("Legal recovery bill register error:", error);
    return NextResponse.json({ success: false, error: error.message || "Unable to load bill register" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    if (!(await safeAuthenticate(6000))) return NextResponse.json({ success: false, error: "Database connection timeout" }, { status: 503 });
    const { rows = [], commit = false } = await request.json();
    if (!Array.isArray(rows) || !rows.length) return NextResponse.json({ success: false, error: "No rows found in the file" }, { status: 400 });
    if (rows.length > 10000) return NextResponse.json({ success: false, error: "A maximum of 10,000 rows can be imported at once" }, { status: 400 });

    await Promise.all([Company.sync(), BankMaster.sync(), BranchMaster.sync(), LegalRecoveryMaster.sync(), LegalRecoveryBill.sync()]);
    const [companies, banks, branches, existingBills] = await Promise.all([
      Company.findAll({ raw: true }), BankMaster.findAll({ raw: true }), BranchMaster.findAll({ raw: true }),
      LegalRecoveryBill.findAll({ attributes: ["id", "companyId", "invoiceNo"], raw: true }),
    ]);
    const companyMap = new Map<string, any>();
    companies.forEach((c: any) => { companyMap.set(norm(c.code), c); companyMap.set(norm(c.name), c); });
    const bankMap = new Map<string, any>();
    banks.forEach((b: any) => {
      bankMap.set(norm(b.bankName), b);
      if (b.bankCode) bankMap.set(norm(b.bankCode), b);
      const acronym = clean(b.bankName).match(/[A-Za-z0-9]+/g)?.map(word => word[0]).join("").toLowerCase();
      if (acronym && acronym.length >= 2) bankMap.set(acronym, b);
    });
    const existingBillMap = new Map(existingBills.map((b: any) => [`${b.companyId}::${norm(b.invoiceNo)}`, b]));
    const seen = new Set<string>();

    const checked = rows.map((row: any, index: number) => {
      const company = companyMap.get(norm(row.company));
      const rawBranch = clean(row.branch);
      const rawBankText = clean(row.bank);
      const rawBank = norm(rawBankText);
      const prefixText = !rawBankText
        ? (rawBranch.match(/^\s*([^:-]+?)\s*[-:]/)?.[1]?.trim() || rawBranch.match(/^\s*([A-Za-z0-9&.]+)/)?.[1] || "")
        : "";
      const prefixKey = norm(prefixText);
      const inferredBankKey = BANK_ALIASES[prefixKey] || prefixKey;
      const matchedBank = bankMap.get(rawBank) || bankMap.get(BANK_ALIASES[rawBank] || "") || bankMap.get(inferredBankKey);
      const suggestedBankName = rawBankText || prefixText.toUpperCase();
      const suggestedBankCode = (prefixText || rawBankText).replace(/[^A-Za-z0-9]/g, "").slice(0, 12).toUpperCase();
      const bank = matchedBank || (suggestedBankName ? { id: null, bankName: suggestedBankName, bankCode: suggestedBankCode, willCreate: true } : null);
      const codeFromBranch = rawBranch.match(/\(\s*([a-z0-9-]+)\s*\)\s*$/i)?.[1] || "";
      const code = (clean(row.branchCode) || codeFromBranch).replace(/\.0$/, "");
      const branchWithoutBank = !rawBankText && prefixText
        ? rawBranch.replace(new RegExp(`^\\s*${prefixText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*[-:]?\\s*`, "i"), "")
        : rawBranch;
      const suggestedBranchName = clean(branchWithoutBank.replace(/\([^)]*\)/g, "")) || rawBranch;
      const rowBranchNorm = norm(suggestedBranchName);
      const candidates = matchedBank ? branches.filter((b: any) => Number(b.bankId) === Number(matchedBank.id)) : [];
      const matchedBranch = candidates.find((b: any) => code && norm(b.branchCode) === norm(code))
        || candidates.find((b: any) => norm(b.branchName) === rowBranchNorm)
        || candidates.find((b: any) => {
          const saved = norm(b.branchName);
          return rowBranchNorm.length >= 5 && saved.length >= 5 && (saved.includes(rowBranchNorm) || rowBranchNorm.includes(saved));
        });
      const branch = matchedBranch || (bank && suggestedBranchName ? { id: null, branchName: suggestedBranchName, branchCode: code, willCreate: true } : null);
      const invoiceNo = clean(row.invoiceNo);
      const billDate = isoDate(row.billDate);
      const billAmount = amount(row.billAmount);
      const tdsAmount = amount(row.tds);
      const status = normalizedStatus(row.status);
      const hasDueValue = row.dueAmount !== "" && row.dueAmount != null;
      const sourceDueAmount = hasDueValue ? amount(row.dueAmount) : 0;
      let receivedAmount = amount(row.receivedAmount);
      // Older CSV exports can lose the Receive Amount header during conversion.
      // Due is an Excel formula (Bill - Receive - TDS), so use it as a safe fallback.
      if (receivedAmount === 0 && hasDueValue && status === "Received") {
        receivedAmount = Math.max(0, billAmount - sourceDueAmount - tdsAmount);
      }
      const calculatedDue = Math.max(0, billAmount - receivedAmount - tdsAmount);
      const dueAmount = hasDueValue ? sourceDueAmount : calculatedDue;
      const key = company ? `${company.id}::${norm(invoiceNo)}` : "";
      const errors: string[] = [];
      const warnings: string[] = [];
      const existingBill: any = key ? existingBillMap.get(key) : null;
      if (!company) errors.push(`Company '${clean(row.company)}' is not registered`);
      if (!bank) errors.push("Bank could not be identified from Bank or Branch column");
      if (bank?.willCreate) warnings.push(`Bank '${bank.bankName}' will be added`);
      if (branch?.willCreate) warnings.push(`Branch '${branch.branchName}' will be added in ${bank?.bankName}`);
      if (!invoiceNo) errors.push("Invoice No. is required");
      if (!billDate) errors.push("Bill Date is invalid");
      if (billAmount < 0) errors.push("Bill Amount cannot be negative");
      if (billAmount === 0) warnings.push("Zero-value bill will be imported without affecting totals");
      if (key && seen.has(key)) errors.push("Duplicate company + invoice number inside this file");
      else if (existingBill) warnings.push("Existing invoice will be updated with this file");
      if (key) seen.add(key);
      return { rowNumber: index + 2, sourceSheet: clean(row.sourceSheet), rawCompany: clean(row.company), rawBank: clean(row.bank), rawBranch, company, bank, branch, existingBill, invoiceNo, billDate, billAmount, paymentReceivedDate: isoDate(row.paymentReceivedDate), receivedAmount, tdsAmount, tdsPercent: amount(row.tdsPercent), dueAmount, remark: clean(row.remark), status, revenueType: clean(row.revenueType), revenueAmount: amount(row.revenueAmount), internalRemark: clean(row.internalRemark), assignedTo: clean(row.assignedTo), errors, warnings };
    });

    const valid = checked.filter((r: any) => !r.errors.length);
    const fileTotals = checked.reduce((totals: any, row: any) => {
      totals.billAmount += row.billAmount || 0;
      totals.receivedAmount += row.receivedAmount || 0;
      totals.tdsAmount += row.tdsAmount || 0;
      if (row.status === "Pending") totals.pendingAmount += row.dueAmount || 0;
      return totals;
    }, { billAmount: 0, receivedAmount: 0, tdsAmount: 0, pendingAmount: 0 });
    let imported = 0;
    if (commit && valid.length) {
      const batchId = `LRBI-${Date.now()}`;
      await sequelize.transaction(async transaction => {
        const createdBanks = new Map<string, any>();
        const createdBranches = new Map<string, any>();
        for (const row of valid) {
          let resolvedBank: any = row.bank;
          const sourceBranch: any = row.branch;
          if (row.bank.willCreate) {
            const bankKey = norm(row.bank.bankCode || row.bank.bankName);
            resolvedBank = createdBanks.get(bankKey) || await BankMaster.findOne({ where: { [Op.or]: [{ bankCode: row.bank.bankCode }, { bankName: row.bank.bankName }] }, transaction });
            if (!resolvedBank) resolvedBank = await BankMaster.create({ bankName: row.bank.bankName, bankCode: row.bank.bankCode, isActive: true }, { transaction });
            createdBanks.set(bankKey, resolvedBank);
          }
          let resolvedBranch: any = sourceBranch;
          if (sourceBranch.willCreate || !sourceBranch.id) {
            const branchKey = `${resolvedBank.id}::${norm(sourceBranch.branchCode || sourceBranch.branchName)}`;
            const branchMatch = sourceBranch.branchCode
              ? { bankId: resolvedBank.id, [Op.or]: [{ branchCode: sourceBranch.branchCode }, { branchName: sourceBranch.branchName }] }
              : { bankId: resolvedBank.id, branchName: sourceBranch.branchName };
            resolvedBranch = createdBranches.get(branchKey) || await BranchMaster.findOne({ where: branchMatch, transaction });
            if (!resolvedBranch) resolvedBranch = await BranchMaster.create({ bankId: resolvedBank.id, branchName: sourceBranch.branchName, branchCode: sourceBranch.branchCode || null, isActive: true }, { transaction });
            createdBranches.set(branchKey, resolvedBranch);
          }
          const masterBranchMatch = clean(resolvedBranch.branchCode)
            ? { [Op.or]: [{ branchId: clean(resolvedBranch.branchCode) }, { branchName: resolvedBranch.branchName }] }
            : { branchName: resolvedBranch.branchName };
          let master = await LegalRecoveryMaster.findOne({ where: { archivedAt: null, bankName: resolvedBank.bankName, ...masterBranchMatch }, transaction });
          if (!master) master = await LegalRecoveryMaster.create({ bankName: resolvedBank.bankName, branchName: resolvedBranch.branchName, branchId: clean(resolvedBranch.branchCode) || String(resolvedBranch.id), totalBillAmount: 0, pendingAmount: 0, pendingSince: row.billDate, status: "Open" }, { transaction });
          const billPayload = { masterId: master.id, companyId: row.company.id, companyCode: row.company.code || row.company.name, bankId: resolvedBank.id, branchId: resolvedBranch.id, invoiceNo: row.invoiceNo, billDate: row.billDate, billAmount: row.billAmount, paymentReceivedDate: row.paymentReceivedDate, receivedAmount: row.receivedAmount, tdsAmount: row.tdsAmount, tdsPercent: row.tdsPercent, dueAmount: row.dueAmount, remark: row.remark, status: row.status, revenueType: row.revenueType, revenueAmount: row.revenueAmount, internalRemark: row.internalRemark, assignedTo: row.assignedTo, importBatchId: batchId };
          if (row.existingBill?.id) await LegalRecoveryBill.update(billPayload, { where: { id: row.existingBill.id }, transaction });
          else await LegalRecoveryBill.create(billPayload, { transaction });
          imported++;
        }
      });
      billRegisterCache = null;
    }
    return NextResponse.json({ success: true, summary: { total: checked.length, valid: valid.length, invalid: checked.length - valid.length, imported, fileTotals }, rows: checked.map((r: any) => ({ rowNumber: r.rowNumber, sourceSheet: r.sourceSheet, company: r.company?.code || r.company?.name || r.rawCompany, bank: r.bank?.bankName || r.rawBank, branch: r.branch?.branchName || r.rawBranch, invoiceNo: r.invoiceNo, billAmount: r.billAmount, receivedAmount: r.receivedAmount, tdsAmount: r.tdsAmount, dueAmount: r.dueAmount, status: r.status, errors: r.errors, warnings: r.warnings })) });
  } catch (error: any) {
    console.error("Legal recovery bill import error:", error);
    return NextResponse.json({ success: false, error: error.message || "Import failed" }, { status: 500 });
  }
}
