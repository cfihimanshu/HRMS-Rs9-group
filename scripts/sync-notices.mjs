import sequelize from "../lib/sequelize.js";
import LegalNotice from "../models/sequelize/LegalNotice.js";
import LegalWorkLog from "../models/sequelize/LegalWorkLog.js";
import LegalWorkHistory from "../models/sequelize/LegalWorkHistory.js";
import BankMaster from "../models/sequelize/BankMaster.js";
import BranchMaster from "../models/sequelize/BranchMaster.js";

async function runSync() {
  try {
    await sequelize.authenticate();
    console.log("Database connected successfully.");

    await LegalNotice.sync();
    await LegalWorkLog.sync();
    await LegalWorkHistory.sync();
    await BankMaster.sync();
    await BranchMaster.sync();

    const notices = await LegalNotice.findAll();
    const banks = await BankMaster.findAll();
    const branches = await BranchMaster.findAll();

    const bankMap = new Map();
    banks.forEach((b) => {
      if (b.id !== undefined && b.id !== null) bankMap.set(String(b.id), b.bankName);
    });

    const branchMap = new Map();
    branches.forEach((br) => {
      if (br.id !== undefined && br.id !== null) branchMap.set(String(br.id), br.branchName || br.branchCode);
      if (br.branchId !== undefined && br.branchId !== null) branchMap.set(String(br.branchId), br.branchName || br.branchCode);
    });

    const existingWorkLogs = await LegalWorkLog.findAll({ attributes: ["id", "remarks"] });
    const existingWorkHistories = await LegalWorkHistory.findAll({ attributes: ["id", "remarks"] });

    let workLogsCreated = 0;
    let workHistoriesCreated = 0;

    for (const n of notices) {
      const resolvedBank = n.bankName || (n.bankId ? bankMap.get(String(n.bankId)) : undefined) || "Bank";
      const resolvedBranch = n.branchName || (n.branchId ? branchMap.get(String(n.branchId)) : undefined) || "Branch";
      const workDateVal = n.noticeDate || n.noticeOrderDate || (n.createdAt ? new Date(n.createdAt).toISOString().split("T")[0] : new Date().toISOString().split("T")[0]);
      const countVal = String(n.quantity || 1);
      const fileVal = n.handoverReceiptUrl || n.documentUrl || undefined;
      const staffVal = n.broughtBy || n.printedBy || n.dispatchedBy || n.createdBy || "Notice Staff";
      const catVal = n.typeOfNotice || "ADVOCATE NOTICE";
      const tag = `[Notice #${n.id}]`;
      const remarkVal = n.handoverRemarks ? `${n.handoverRemarks} ${tag}` : `Notice Board Entry (${catVal}) ${tag}`;

      // 1. Sync into legal_work_logs
      const hasWorkLog = existingWorkLogs.some((l) => l.remarks && l.remarks.includes(tag));
      if (!hasWorkLog) {
        try {
          await LegalWorkLog.create({
            masterId: n.masterId || n.id || 0,
            workDate: workDateVal,
            typeOfWork: "Bank Related",
            workLocation: "Office",
            bankName: resolvedBank,
            branchName: resolvedBranch,
            category: "Business Development",
            subCategory: "TAKE NOTICE ASSIGNMENT",
            businessDevOption: catVal,
            businessDevSubOption: "TAKE NOTICE ASSIGNMENT",
            noOfCount: countVal,
            broughtBy: n.broughtBy || undefined,
            preparedBy: n.noticeRenameBy || n.scannedBy || undefined,
            printedBy: n.printedBy || undefined,
            dispatchedBy: n.dispatchedBy || undefined,
            uploadedFileName: fileVal,
            remarks: remarkVal,
            employeeId: staffVal,
            employeeName: staffVal
          });
          workLogsCreated++;
          console.log(`[SYNC SUCCESS] Inserted Notice #${n.id} (${resolvedBank} - ${resolvedBranch}) into legal_work_logs`);
        } catch (e) {
          console.error(`[SYNC ERROR] LegalWorkLog Notice #${n.id}:`, e.message);
        }
      } else {
        console.log(`Notice #${n.id} already exists in legal_work_logs.`);
      }

      // 2. Sync into legal_work_history
      const hasWorkHistory = existingWorkHistories.some((h) => h.remarks && h.remarks.includes(tag));
      if (!hasWorkHistory) {
        try {
          await LegalWorkHistory.create({
            masterId: n.masterId || n.id || 0,
            category: catVal,
            subCategory: "TAKE NOTICE ASSIGNMENT",
            bankName: resolvedBank,
            branchName: resolvedBranch,
            employeeId: staffVal,
            employeeName: staffVal,
            attachmentUrl: fileVal,
            remarks: remarkVal,
            status: "Completed",
            amount: 0
          });
          workHistoriesCreated++;
          console.log(`[SYNC SUCCESS] Inserted Notice #${n.id} (${resolvedBank} - ${resolvedBranch}) into legal_work_history`);
        } catch (e) {
          console.error(`[SYNC ERROR] LegalWorkHistory Notice #${n.id}:`, e.message);
        }
      } else {
        console.log(`Notice #${n.id} already exists in legal_work_history.`);
      }
    }

    console.log(`\n=== SYNC SUMMARY ===\nTotal Notices: ${notices.length}\nCreated in legal_work_logs: ${workLogsCreated}\nCreated in legal_work_history: ${workHistoriesCreated}`);
  } catch (err) {
    console.error("Sync script failed:", err);
  } finally {
    process.exit(0);
  }
}

runSync();
