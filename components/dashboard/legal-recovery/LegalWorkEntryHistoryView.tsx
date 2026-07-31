"use client";
import React, { useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import {
  Search, RefreshCw, FileText, Calendar, Building, User, Download, Filter,
  Layers, CheckCircle2, DollarSign, Briefcase, Landmark, Paperclip, Eye,
  ChevronDown, ChevronRight, ArrowRight, Clock, Award, ShieldCheck, Check, Trash2, Edit, Save, X
} from "lucide-react";

const STAGE_DEFINITIONS: Record<string, string[]> = {
  "Bill Follow Up": ["BILL FOLLOW UP"],
  "ADVOCATE NOTICE": [
    "TAKE NOTICE ASSIGNMENT",
    "COLLECT NOTICE DATA",
    "PREPARE NOTICE LIST",
    "GENERATE NOTICE VIA SOFTWARE/MAIL MERGE",
    "DISPATCH NOTICES",
    "PREPARE BILL (BILL BANWANA)",
    "REQUEST PAYMENT"
  ],
  "RECOVERY SUIT / PSA APPLICATION": [
    "PREPARE RECOVERY SUIT / PSA APPLICATION",
    "COLLECT DOCUMENTS FROM BRANCH",
    "PREPARE CASE FILE",
    "SUBMIT TO ADVOCATE",
    "PREPARE BILL (BILL BANWANA)",
    "REQUEST PAYMENT"
  ],
  "RACO RODA": [
    "SCAN RODA FILE",
    "PREPARE RODA SET",
    "PREPARE RODA FILE",
    "SUBMIT RODA FILE TO SDM OFFICE",
    "PREPARE BILL (BILL BANWANA)",
    "REQUEST PAYMENT",
    "ISSUE SUMMONS"
  ],
  "SARFEASI NOTICE": [
    "COLLECT SARFAESI NOTICE DATA",
    "DRAFT SARFAESI NOTICE",
    "DISPATCH NOTICE",
    "OBTAIN POST OFFICE TRACKING",
    "PREPARE BILL (BILL BANWANA)",
    "REQUEST PAYMENT"
  ],
  "SY. POSSESSION": [
    "SOE TYPING & PRINTING",
    "TAKE SYMBOLIC POSSESSION",
    "DISPATCH POSSESSION NOTICE",
    "PUBLISH IN NEWSPAPER",
    "PREPARE BILL (BILL BANWANA)",
    "REQUEST PAYMENT"
  ],
  "DM ORDER": [
    "DM APPLICATION TYPING & PRINTING",
    "PREPARE DM APPLICATION",
    "SUBMIT APPLICATION IN DM COURT",
    "OBTAIN DM ORDER",
    "PREPARE BILL (BILL BANWANA)",
    "REQUEST PAYMENT"
  ],
  "SP ORDER": [
    "SP APPLICATION TYPING & PRINTING",
    "SUBMIT SP APPLICATION",
    "OBTAIN ASSESSMENT REPORT FROM POLICE STATION",
    "OBTAIN ORDER FOR DD",
    "SUBMIT DD WITH SP OFFICE LETTER",
    "OBTAIN ORDER FOR POSSESSION",
    "ARRANGE POLICE ASSISTANCE",
    "PREPARE BILL (BILL BANWANA)",
    "REQUEST PAYMENT"
  ],
  "PY. POSSESSION": [
    "SOE TYPING & PRINTING",
    "TAKE PHYSICAL POSSESSION",
    "DISPATCH POSSESSION NOTICE",
    "PUBLISH IN NEWSPAPER",
    "PREPARE BILL (BILL BANWANA)",
    "REQUEST PAYMENT"
  ],
  "SEIZER": [
    "COLLECT NOTICE DATA",
    "PREPARE NOTICE",
    "DISPATCH NOTICE",
    "TRACK POSTAL DELIVERY",
    "PREPARE BILL (BILL BANWANA)",
    "REQUEST PAYMENT"
  ]
};

interface LegalWorkLogItem {
  id: string | number;
  masterId?: number | string;
  allLogs?: LegalWorkLogItem[];
  workDate: string;
  workLocation: string;
  customLocation?: string;
  typeOfWork: string;
  category: string;
  subCategory: string;
  businessDevOption?: string;
  businessDevSubOption?: string;
  noOfCount?: string;
  allocationDate?: string;
  finalRate?: string;
  expenses?: string;
  ownExpense?: number | string;
  officerContactNo?: string;
  grossProfit?: string;
  followUpDetails?: string;
  stageAmount?: string;
  financialDetails?: string;
  broughtBy?: string;
  preparedBy?: string;
  printedBy?: string;
  dispatchedBy?: string;
  billDate?: string;
  billAmount?: string;
  billNo?: string;
  personName?: string;
  uploadedFileName?: string;
  bankName?: string;
  branchName?: string;
  remarks?: string;
  employeeName?: string;
  employeeId?: string;
  createdAt: string;
  rawNotice?: any;
}

function parseFollowUpDetails(value?: string) {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function ExcelHeaderFilter({
  options, selected, onApply, onClose, alignRight = false
}: {
  options: string[];
  selected: string[];
  onApply: (values: string[]) => void;
  onClose: () => void;
  alignRight?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState<string[]>(selected);
  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) onClose();
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [onClose]);
  const visible = options.filter(option => option.toLowerCase().includes(search.toLowerCase()));
  return (
    <div ref={ref} onClick={e => e.stopPropagation()} className={`absolute top-full mt-1 z-[100] w-60 rounded-lg border border-slate-300 bg-white p-3 text-[10px] normal-case shadow-2xl ${alignRight ? "right-0" : "left-0"}`}>
      <input value={search} onChange={e => setSearch(e.target.value)} autoFocus placeholder="Search values..." className="mb-2 w-full rounded border border-slate-300 px-2 py-1.5 font-medium focus:outline-none focus:border-indigo-500" />
      <div className="mb-2 flex justify-between border-b pb-2">
        <button type="button" onClick={() => setDraft(options)} className="font-bold text-indigo-700 hover:underline">Select All</button>
        <button type="button" onClick={() => setDraft([])} className="font-bold text-rose-600 hover:underline">Clear</button>
      </div>
      <div className="max-h-44 space-y-1 overflow-y-auto">
        {visible.map(option => (
          <label key={option} className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 font-medium hover:bg-slate-50">
            <input type="checkbox" checked={draft.includes(option)} onChange={() => setDraft(current => current.includes(option) ? current.filter(v => v !== option) : [...current, option])} />
            <span className="truncate" title={option}>{option}</span>
          </label>
        ))}
      </div>
      <div className="mt-3 flex justify-end gap-2 border-t pt-2">
        <button type="button" onClick={onClose} className="rounded border px-2 py-1 font-bold text-slate-600">Cancel</button>
        <button type="button" onClick={() => { onApply(draft); onClose(); }} className="rounded bg-indigo-700 px-3 py-1 font-bold text-white">Apply</button>
      </div>
    </div>
  );
}

export default function LegalWorkEntryHistoryView({
  userRole,
  triggerToast
}: {
  userRole?: string;
  triggerToast?: (msg: string) => void;
}) {
  const [logs, setLogs] = useState<LegalWorkLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBank, setSelectedBank] = useState("ALL");
  const [selectedOption, setSelectedOption] = useState("ALL");
  const [dateFilter, setDateFilter] = useState("");
  const [columnFilters, setColumnFilters] = useState<Record<string, string[]>>({
    staff: [], bank: [], work: [], count: [], amount: [], execution: []
  });
  const [activeColumnFilter, setActiveColumnFilter] = useState<string | null>(null);
  const [editEntry, setEditEntry] = useState<LegalWorkLogItem | null>(null);
  const [editWorkDate, setEditWorkDate] = useState("");
  const [editBankName, setEditBankName] = useState("");
  const [editBranchName, setEditBranchName] = useState("");
  const [editOption, setEditOption] = useState("");
  const [editSubOption, setEditSubOption] = useState("");
  const [editCount, setEditCount] = useState("1");
  const [editAmount, setEditAmount] = useState("0");
  const [editBroughtBy, setEditBroughtBy] = useState("");
  const [editPreparedBy, setEditPreparedBy] = useState("");
  const [editPrintedBy, setEditPrintedBy] = useState("");
  const [editDispatchedBy, setEditDispatchedBy] = useState("");
  const [editPersonName, setEditPersonName] = useState("");
  const [editOfficerContactNo, setEditOfficerContactNo] = useState("");
  const [editOwnExpense, setEditOwnExpense] = useState("0");
  const [editRemarks, setEditRemarks] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  // Next Step Modal State
  const [nextStepEntry, setNextStepEntry] = useState<LegalWorkLogItem | null>(null);
  const [nextStepWorkDate, setNextStepWorkDate] = useState("");
  const [nextStepBankName, setNextStepBankName] = useState("");
  const [nextStepBranchName, setNextStepBranchName] = useState("");
  const [nextStepOption, setNextStepOption] = useState("");
  const [nextStepSubOption, setNextStepSubOption] = useState("");
  const [nextStepCount, setNextStepCount] = useState("1");
  const [nextStepAmount, setNextStepAmount] = useState("0");
  const [nextStepBroughtBy, setNextStepBroughtBy] = useState("");
  const [nextStepPreparedBy, setNextStepPreparedBy] = useState("");
  const [nextStepPrintedBy, setNextStepPrintedBy] = useState("");
  const [nextStepDispatchedBy, setNextStepDispatchedBy] = useState("");
  const [nextStepBillDate, setNextStepBillDate] = useState("");
  const [nextStepBillAmount, setNextStepBillAmount] = useState("");
  const [nextStepBillNo, setNextStepBillNo] = useState("");
  const [nextStepRate, setNextStepRate] = useState("");
  const [nextStepOfficerShare, setNextStepOfficerShare] = useState("");
  const [nextStepExpenses, setNextStepExpenses] = useState("");
  const [nextStepAllocationDate, setNextStepAllocationDate] = useState("");
  const [nextStepUploadedFileName, setNextStepUploadedFileName] = useState("");
  const [nextStepUploadedFileUrl, setNextStepUploadedFileUrl] = useState("");
  const [nextStepPersonName, setNextStepPersonName] = useState("");
  const [nextStepRemarks, setNextStepRemarks] = useState("");
  const [submittingNextStep, setSubmittingNextStep] = useState(false);

  // Detailed Modal State
  const [selectedEntryDetail, setSelectedEntryDetail] = useState<LegalWorkLogItem | null>(null);
  const [selectedStageTab, setSelectedStageTab] = useState<string | null>(null);
  const [selectedFilePreviewModal, setSelectedFilePreviewModal] = useState<{ fileName: string; fileUrl?: string } | null>(null);
  const [previewFileError, setPreviewFileError] = useState(false);

  const getFileNameOnly = (str?: string) => {
    if (!str) return "";
    if (str.startsWith("data:")) return "Attached_Document.png";
    if (str.includes("/")) {
      const parts = str.split("/");
      return parts[parts.length - 1] || str;
    }
    return str;
  };

  const openFilePreview = (fileNameOrUrl: string) => {
    if (!fileNameOrUrl) return;
    setPreviewFileError(false);
    let url = fileNameOrUrl;
    let name = getFileNameOnly(fileNameOrUrl);

    if (fileNameOrUrl.startsWith("data:") || fileNameOrUrl.startsWith("http") || fileNameOrUrl.startsWith("/")) {
      url = fileNameOrUrl;
    } else if (fileNameOrUrl.startsWith("doc_")) {
      url = `/hrms/${fileNameOrUrl}`;
    } else {
      url = `/uploads/${fileNameOrUrl}`;
    }
    setSelectedFilePreviewModal({ fileName: name, fileUrl: url });
  };

  const handleStageFileUpload = async (entry: LegalWorkLogItem, stageName: string, file: File) => {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target?.result as string;
      if (!dataUrl) return;

      let fileUrlToSave = dataUrl;

      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("purpose", "task-proof");
        const res = await fetch("/api/documents/upload", {
          method: "POST",
          body: formData,
        });
        const data = await res.json();
        if (res.ok && data.success && data.url) {
          fileUrlToSave = data.url;
        }
      } catch (err) {
        console.warn("Server upload fallback:", err);
      }

      const groupLogs = entry.allLogs && entry.allLogs.length > 0 ? entry.allLogs : [entry];
      const matchingLog = groupLogs.find(l => (l.businessDevSubOption || l.subCategory) === stageName) || entry;

      const isNotice = String(matchingLog.id).startsWith("notice_");
      const realId = isNotice ? String(matchingLog.id).replace("notice_", "") : matchingLog.id;

      try {
        const endpoint = isNotice ? "/api/legal-recovery/notices" : "/api/legal-recovery/work-log";
        const payload = isNotice
          ? { id: realId, handoverReceiptPhoto: fileUrlToSave }
          : { id: realId, uploadedFileName: fileUrlToSave };

        const updateRes = await fetch(endpoint, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const updateData = await updateRes.json();
        if (updateRes.ok && updateData.success) {
          triggerToast?.(`Attachment file updated successfully!`);
          await fetchWorkLogHistory();
          openFilePreview(fileUrlToSave);
        } else {
          alert(updateData.error || "Failed to update attachment");
        }
      } catch (e: any) {
        alert("Error saving attachment: " + e.message);
      }
    };
    reader.readAsDataURL(file);
  };



  const handleNextStepFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setNextStepUploadedFileName(file.name);

    // 1. Read as Data URL so client preview & download ALWAYS work 100%
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        setNextStepUploadedFileUrl(dataUrl);
      }
    };
    reader.readAsDataURL(file);

    // 2. Also attempt upload to server API
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("purpose", "task-proof");
      const res = await fetch("/api/documents/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (res.ok && data.success && data.url) {
        setNextStepUploadedFileUrl(data.url);
      }
    } catch (err) {
      console.warn("Server upload warning, using client Data URL fallback:", err);
    }
  };

  const fetchWorkLogHistory = async () => {
    try {
      setLoading(true);
      const [workLogRes, noticeRes, banksRes, branchesRes, mastersRes] = await Promise.all([
        fetch("/api/legal-recovery/work-log"),
        fetch("/api/legal-recovery/notices"),
        fetch("/api/legal-recovery/banks"),
        fetch("/api/legal-recovery/branches"),
        fetch("/api/legal-recovery")
      ]);

      const workLogData = await workLogRes.json();
      const noticeData = await noticeRes.json();
      const banksData = await banksRes.json();
      const branchesData = await branchesRes.json();
      const mastersData = await mastersRes.json();

      const banksList = (banksRes.ok && banksData.success) ? (banksData.data || []) : [];
      const branchesList = (branchesRes.ok && branchesData.success) ? (branchesData.data || []) : [];
      const mastersList = (mastersRes.ok && mastersData.success) ? (mastersData.data || []) : [];

      const bankMap = new Map<string, any>();
      banksList.forEach((b: any) => {
        if (b.id !== undefined && b.id !== null) bankMap.set(String(b.id), b);
        if (b.bankName) bankMap.set(String(b.bankName).toLowerCase().trim(), b);
      });

      const branchMap = new Map<string, any>();
      branchesList.forEach((br: any) => {
        if (br.id !== undefined && br.id !== null) branchMap.set(String(br.id), br);
        if (br.branchCode) branchMap.set(String(br.branchCode), br);
        if (br.branchId) branchMap.set(String(br.branchId), br);
      });
      mastersList.forEach((m: any) => {
        if (m.id !== undefined && m.id !== null) branchMap.set(String(m.id), m);
        if (m.branchId) branchMap.set(String(m.branchId), m);
      });

      const resolveBankAndBranch = (itemBankName?: string, itemBranchName?: string, bankId?: any, branchId?: any, masterId?: any, followUpStr?: string) => {
        let bName = itemBankName;
        let brName = itemBranchName;

        const idsToTry = [branchId, masterId, bankId].filter(Boolean);
        for (const idVal of idsToTry) {
          const brObj = branchMap.get(String(idVal));
          if (brObj) {
            if (!brName) brName = brObj.branchName || brObj.branch;
            if (!bName) bName = brObj.bankName || brObj.bank;
          }
        }

        if (!bName && bankId) {
          const bObj = bankMap.get(String(bankId));
          if (bObj) bName = bObj.bankName || bObj.name;
        }

        if ((!bName || !brName) && followUpStr) {
          try {
            const followUp = typeof followUpStr === "string" ? JSON.parse(followUpStr) : followUpStr;
            if (!bName && followUp?.bankId) {
              const bObj = bankMap.get(String(followUp.bankId));
              if (bObj) bName = bObj.bankName;
            }
            if (!brName && followUp?.branchId) {
              const brObj = branchMap.get(String(followUp.branchId));
              if (brObj) brName = brObj.branchName;
            }
          } catch {
            // Ignore JSON parse error
          }
        }

        return { bankName: bName || undefined, branchName: brName || undefined };
      };

      let combined: LegalWorkLogItem[] = [];

      // 1. Process Legal Work Form Logs
      if (workLogRes.ok && workLogData.success) {
        const rawLogs = workLogData.data || [];
        const formLogs = rawLogs
          .filter((item: LegalWorkLogItem) =>
            item.typeOfWork === "Bank Related" || !!item.businessDevOption
          )
          .map((item: LegalWorkLogItem) => {
            const { bankName, branchName } = resolveBankAndBranch(
              item.bankName,
              item.branchName,
              (item as any).bankId,
              (item as any).branchId,
              (item as any).masterId,
              item.followUpDetails
            );
            return {
              ...item,
              bankName,
              branchName,
            };
          });
        combined = [...combined, ...formLogs];
      }

      // 2. Map Notice Tracking Board records
      if (noticeRes.ok && noticeData.success) {
        const rawNotices = noticeData.data || [];
        const mappedNotices: LegalWorkLogItem[] = rawNotices.map((n: any) => {
          const rawNoticeType = (n.typeOfNotice || "ADVOCATE NOTICE").toUpperCase();
          const categoryKey = STAGE_DEFINITIONS[rawNoticeType] ? rawNoticeType : "ADVOCATE NOTICE";

          let latestStage = "TAKE NOTICE ASSIGNMENT";
          if (n.billNo || n.billAmount) latestStage = "PREPARE BILL (BILL BANWANA)";
          else if (n.dispatchedBy) latestStage = "DISPATCH NOTICES";
          else if (n.printedBy) latestStage = "GENERATE NOTICE VIA SOFTWARE/MAIL MERGE";
          else if (n.noticeRenameBy || n.scannedBy) latestStage = "PREPARE NOTICE LIST";
          else if (n.broughtBy) latestStage = "COLLECT NOTICE DATA";

          const { bankName, branchName } = resolveBankAndBranch(
            n.bankName,
            n.branchName,
            n.bankId,
            n.branchId,
            n.masterId
          );

          return {
            id: `notice_${n.id}`,
            workDate: n.noticeDate || n.noticeOrderDate || n.createdAt,
            workLocation: "Bank Branch",
            typeOfWork: "Bank Related",
            category: "Business Development",
            subCategory: latestStage,
            businessDevOption: categoryKey,
            businessDevSubOption: latestStage,
            noOfCount: n.qty?.toString() || "1",
            allocationDate: n.noticeOrderDate || n.noticeDate,
            broughtBy: n.broughtBy || undefined,
            preparedBy: n.noticeRenameBy || n.scannedBy || undefined,
            printedBy: n.printedBy || undefined,
            dispatchedBy: n.dispatchedBy || undefined,
            billDate: n.billDate || undefined,
            billAmount: n.billAmount ? n.billAmount.toString() : undefined,
            billNo: n.billNo || undefined,
            personName: n.handoverTo || n.handoverBy || undefined,
            uploadedFileName: n.handoverReceiptPhoto || undefined,
            bankName,
            branchName,
            remarks: n.handoverRemarks || `Notice Board Entry (${n.typeOfNotice || 'Advocate Notice'})`,
            employeeName: n.broughtBy || n.printedBy || n.dispatchedBy || n.createdBy || "Notice Staff",
            createdAt: n.createdAt,
            rawNotice: n
          };
        });

        combined = [...combined, ...mappedNotices];
      }

      // 3. Consolidate logs by Bank & Branch & Category (1 case = 1 clean row)
      const groupedMap = new Map<string, LegalWorkLogItem[]>();

      combined.forEach((item) => {
        const bKey = (item.bankName || "").toLowerCase().trim();
        const brKey = (item.branchName || "").toLowerCase().trim();
        const catKey = (item.businessDevOption || item.category || "").toLowerCase().trim();
        const key = item.masterId && Number(item.masterId) > 0
          ? `m_${item.masterId}_${catKey}`
          : `b_${bKey}_${brKey}_${catKey}`;

        if (!groupedMap.has(key)) {
          groupedMap.set(key, []);
        }
        groupedMap.get(key)!.push(item);
      });

      const consolidated: LegalWorkLogItem[] = [];

      groupedMap.forEach((groupItems) => {
        groupItems.sort((a, b) => new Date(a.createdAt || a.workDate).getTime() - new Date(b.createdAt || b.workDate).getTime());

        const latestItem = groupItems[groupItems.length - 1];
        const catName = latestItem.businessDevOption || latestItem.category || "ADVOCATE NOTICE";
        const stages = STAGE_DEFINITIONS[catName] || STAGE_DEFINITIONS["ADVOCATE NOTICE"];

        const mergedBroughtBy = groupItems.map(i => i.broughtBy).filter(Boolean).pop() || latestItem.broughtBy;
        const mergedPreparedBy = groupItems.map(i => i.preparedBy).filter(Boolean).pop() || latestItem.preparedBy;
        const mergedPrintedBy = groupItems.map(i => i.printedBy).filter(Boolean).pop() || latestItem.printedBy;
        const mergedDispatchedBy = groupItems.map(i => i.dispatchedBy).filter(Boolean).pop() || latestItem.dispatchedBy;
        const mergedBillNo = groupItems.map(i => i.billNo).filter(Boolean).pop() || latestItem.billNo;
        const mergedBillDate = groupItems.map(i => i.billDate).filter(Boolean).pop() || latestItem.billDate;
        const mergedBillAmount = groupItems.map(i => i.billAmount).filter(Boolean).pop() || latestItem.billAmount;
        const mergedPersonName = groupItems.map(i => i.personName).filter(Boolean).pop() || latestItem.personName;
        const mergedUploadedFile = groupItems.map(i => i.uploadedFileName).filter(Boolean).pop() || latestItem.uploadedFileName;
        const mergedRate = groupItems.map(i => i.finalRate).filter(Boolean).pop() || latestItem.finalRate;
        const mergedExpenses = groupItems.map(i => i.expenses || i.ownExpense).filter(Boolean).pop() || latestItem.expenses;

        let highestStage = latestItem.businessDevSubOption || latestItem.subCategory || stages[0];
        let highestIdx = stages.indexOf(highestStage);

        groupItems.forEach(i => {
          const s = i.businessDevSubOption || i.subCategory || "";
          const idx = stages.indexOf(s);
          if (idx > highestIdx) {
            highestIdx = idx;
            highestStage = s;
          }
        });

        const mergedEntry: LegalWorkLogItem = {
          ...latestItem,
          businessDevSubOption: highestStage,
          subCategory: highestStage,
          broughtBy: mergedBroughtBy,
          preparedBy: mergedPreparedBy,
          printedBy: mergedPrintedBy,
          dispatchedBy: mergedDispatchedBy,
          billNo: mergedBillNo,
          billDate: mergedBillDate,
          billAmount: mergedBillAmount,
          personName: mergedPersonName,
          uploadedFileName: mergedUploadedFile,
          finalRate: mergedRate,
          expenses: mergedExpenses ? String(mergedExpenses) : undefined,
          allLogs: groupItems
        };

        consolidated.push(mergedEntry);
      });

      consolidated.sort(
        (a, b) =>
          new Date(b.createdAt || b.workDate).getTime() -
          new Date(a.createdAt || a.workDate).getTime()
      );
      setLogs(consolidated);
    } catch (error) {
      console.error("Error fetching work log history:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkLogHistory();
  }, []);

  useEffect(() => {
    if (!selectedEntryDetail && !selectedFilePreviewModal) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (selectedFilePreviewModal) setSelectedFilePreviewModal(null);
      else setSelectedEntryDetail(null);
    };
    window.addEventListener("keydown", closeOnEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [selectedEntryDetail, selectedFilePreviewModal]);

  // Keep selectedEntryDetail dynamically in sync with updated logs
  useEffect(() => {
    if (selectedEntryDetail && logs.length > 0) {
      const updated = logs.find(l =>
        String(l.id) === String(selectedEntryDetail.id) ||
        (l.masterId && selectedEntryDetail.masterId && String(l.masterId) === String(selectedEntryDetail.masterId)) ||
        ((l.bankName || "").toLowerCase().trim() === (selectedEntryDetail.bankName || "").toLowerCase().trim() &&
          (l.branchName || "").toLowerCase().trim() === (selectedEntryDetail.branchName || "").toLowerCase().trim() &&
          (l.businessDevOption || l.category || "").toLowerCase().trim() === (selectedEntryDetail.businessDevOption || selectedEntryDetail.category || "").toLowerCase().trim())
      );
      if (updated && updated !== selectedEntryDetail) {
        setSelectedEntryDetail(updated);
      }
    }
  }, [logs]);

  const allUniqueBanks = useMemo(() => {
    const banks = new Set<string>();
    logs.forEach(l => {
      if (l.bankName) banks.add(l.bankName);
    });
    return Array.from(banks);
  }, [logs]);

  const uniqueOptions = useMemo(() => {
    const optsMap = new Map<string, string>();
    logs.forEach(l => {
      const opt = (l.businessDevOption || l.category || "").trim();
      if (opt) {
        const cleanKey = opt.toLowerCase();
        if (!optsMap.has(cleanKey)) {
          optsMap.set(cleanKey, opt);
        }
      }
    });
    return Array.from(optsMap.values());
  }, [logs]);

  const getColumnValue = (item: LegalWorkLogItem, key: string) => {
    const finances = parseFollowUpDetails(item.financialDetails);
    if (key === "staff") return item.employeeName || item.employeeId || "Staff Member";
    if (key === "bank") return `${item.bankName || "N/A"} / ${item.branchName || "N/A"}`;
    if (key === "work") return `${item.businessDevOption || item.category || "ADVOCATE NOTICE"} / ${item.businessDevSubOption || item.subCategory || "N/A"}`;
    if (key === "count") return String(item.noOfCount || "1");
    if (key === "amount") return `₹${Number(item.billAmount || item.stageAmount || finances?.totalRevenue || 0).toLocaleString("en-IN")}`;
    return [item.broughtBy, item.preparedBy, item.printedBy, item.dispatchedBy, item.personName]
      .filter(Boolean).join(", ") || "No execution details";
  };

  const columnOptions = useMemo(() => {
    const result: Record<string, string[]> = {};
    ["staff", "bank", "work", "count", "amount", "execution"].forEach(key => {
      result[key] = Array.from(new Set(logs.map(item => getColumnValue(item, key)))).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    });
    return result;
  }, [logs]);

  const filteredLogs = useMemo(() => {
    return logs.filter(item => {
      const matchesSearch =
        (item.bankName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.branchName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.employeeName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.businessDevOption || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.businessDevSubOption || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.remarks || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.personName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.broughtBy || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.printedBy || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.dispatchedBy || "").toLowerCase().includes(searchQuery.toLowerCase());

      const matchesBank = selectedBank === "ALL" || item.bankName === selectedBank;
      const primaryOpt = (item.businessDevOption || item.category || "").trim().toLowerCase();
      const matchesOption = selectedOption === "ALL" || primaryOpt === selectedOption.trim().toLowerCase();

      const itemDateStr = item.workDate ? new Date(item.workDate).toISOString().split('T')[0] : "";
      const matchesDate = !dateFilter || itemDateStr === dateFilter;
      const matchesColumns = Object.entries(columnFilters).every(([key, selected]) =>
        selected.length === 0 || selected.includes(getColumnValue(item, key))
      );

      return matchesSearch && matchesBank && matchesOption && matchesDate && matchesColumns;
    });
  }, [logs, searchQuery, selectedBank, selectedOption, dateFilter, columnFilters]);

  const uniqueBanks = useMemo(() => {
    const bankMap = new Map<string, string>();
    filteredLogs.forEach(l => {
      if (l.bankName) {
        const cleanKey = l.bankName.trim().toLowerCase();
        if (!bankMap.has(cleanKey)) {
          bankMap.set(cleanKey, l.bankName.trim());
        }
      }
    });
    return Array.from(bankMap.values());
  }, [filteredLogs]);

  const totalCounts = useMemo(() => {
    return filteredLogs.reduce((acc, curr) => acc + (parseInt(curr.noOfCount || "1") || 1), 0);
  }, [filteredLogs]);

  const totalBillAmount = useMemo(() => {
    return filteredLogs.reduce((acc, curr) => {
      const finances = parseFollowUpDetails(curr.financialDetails);
      const amt = Number(curr.billAmount || curr.stageAmount || finances?.totalRevenue || 0);
      return acc + (isNaN(amt) ? 0 : amt);
    }, 0);
  }, [filteredLogs]);

  const handleOpenDetailModal = (entry: LegalWorkLogItem) => {
    setSelectedEntryDetail(entry);
    setSelectedStageTab(entry.businessDevSubOption || entry.subCategory || null);
  };

  const handleDeleteLog = async (id: string | number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this work entry log?")) return;
    try {
      const isNotice = String(id).startsWith("notice_");
      const realId = isNotice ? String(id).replace("notice_", "") : id;
      const endpoint = isNotice ? "/api/legal-recovery/notices" : "/api/legal-recovery/work-log";
      const res = await fetch(`${endpoint}?id=${realId}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok && data.success) {
        if (triggerToast) triggerToast("Entry deleted successfully.");
        fetchWorkLogHistory();
      } else {
        alert(data.error || "Failed to delete entry");
      }
    } catch (err) {
      console.error("Delete log error:", err);
    }
  };

  const openEditEntry = (item: LegalWorkLogItem) => {
    setEditEntry(item);
    setEditWorkDate(item.workDate ? new Date(item.workDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
    setEditBankName(item.bankName || "");
    setEditBranchName(item.branchName || "");
    setEditOption(item.businessDevOption || item.category || "ADVOCATE NOTICE");
    setEditSubOption(item.businessDevSubOption || item.subCategory || "");
    setEditCount(item.noOfCount || "1");
    setEditAmount(String(Number(item.billAmount || item.stageAmount || parseFollowUpDetails(item.financialDetails)?.totalRevenue || 0)));
    setEditBroughtBy(item.broughtBy || "");
    setEditPreparedBy(item.preparedBy || "");
    setEditPrintedBy(item.printedBy || "");
    setEditDispatchedBy(item.dispatchedBy || "");
    setEditPersonName(item.personName || "");
    setEditOfficerContactNo(item.officerContactNo || "");
    setEditOwnExpense(String(item.ownExpense || 0));
    setEditRemarks(item.remarks || "");
  };

  const handleSaveEdit = async () => {
    if (!editEntry) return;
    setSavingEdit(true);
    try {
      const logsToUpdate = editEntry.allLogs && editEntry.allLogs.length > 0 ? editEntry.allLogs : [editEntry];

      for (const logItem of logsToUpdate) {
        const isNotice = String(logItem.id).startsWith("notice_");
        const realId = isNotice ? String(logItem.id).replace("notice_", "") : logItem.id;
        const isSelectedStage = (logItem.businessDevSubOption || logItem.subCategory) === editSubOption;

        const payload = isNotice
          ? {
            id: realId,
            bankName: editBankName,
            branchName: editBranchName,
            typeOfNotice: editOption,
            qty: Math.max(1, Number(editCount) || 1),
            billAmount: isSelectedStage ? Math.max(0, Number(editAmount) || 0) : undefined,
            broughtBy: editBroughtBy || undefined,
            noticeRenameBy: editPreparedBy || undefined,
            printedBy: editPrintedBy || undefined,
            dispatchedBy: editDispatchedBy || undefined,
            handoverTo: editPersonName || undefined,
            handoverRemarks: editRemarks || undefined,
            noticeDate: editWorkDate
          }
          : {
            id: realId,
            workDate: editWorkDate,
            bankName: editBankName,
            branchName: editBranchName,
            businessDevOption: editOption,
            businessDevSubOption: isSelectedStage ? editSubOption : logItem.businessDevSubOption,
            noOfCount: editCount,
            stageAmount: isSelectedStage ? Math.max(0, Number(editAmount) || 0) : logItem.stageAmount,
            broughtBy: editBroughtBy || undefined,
            preparedBy: editPreparedBy || undefined,
            printedBy: editPrintedBy || undefined,
            dispatchedBy: editDispatchedBy || undefined,
            personName: editPersonName || undefined,
            officerContactNo: editOfficerContactNo || undefined,
            ownExpense: Number(editOwnExpense) || 0,
            remarks: editRemarks || undefined
          };

        const res = await fetch(isNotice ? "/api/legal-recovery/notices" : "/api/legal-recovery/work-log", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.error || "Update failed");
      }

      setEditEntry(null);
      triggerToast?.("Entry updated successfully with all details.");
      await fetchWorkLogHistory();
    } catch (error: any) {
      alert(error.message || "Unable to update entry");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleNextStepStageChange = (newStage: string, entryOverride?: LegalWorkLogItem) => {
    setNextStepSubOption(newStage);
    const entry = entryOverride || nextStepEntry;
    if (!entry) return;

    const stageInfo = getStageFilledDetails(entry, newStage);
    if (stageInfo.isFilled) {
      if (stageInfo.count) setNextStepCount(stageInfo.count);
      if (stageInfo.staff) {
        setNextStepBroughtBy(stageInfo.staff);
        setNextStepPreparedBy(stageInfo.staff);
        setNextStepPrintedBy(stageInfo.staff);
        setNextStepDispatchedBy(stageInfo.staff);
        setNextStepPersonName(stageInfo.staff);
      }
      if (stageInfo.billDate) setNextStepBillDate(stageInfo.billDate);
      if (stageInfo.billAmount) setNextStepBillAmount(stageInfo.billAmount);
      if (stageInfo.billNo) setNextStepBillNo(stageInfo.billNo);
      if (stageInfo.stageAmount) setNextStepAmount(stageInfo.stageAmount);
      if (stageInfo.finalRate) setNextStepRate(stageInfo.finalRate);
      if (stageInfo.expenses) setNextStepExpenses(stageInfo.expenses);
      if (stageInfo.file) setNextStepUploadedFileName(stageInfo.file);
      if (stageInfo.remarks) setNextStepRemarks(stageInfo.remarks);
    }
  };

  const openNextStepModal = (item: LegalWorkLogItem) => {
    setNextStepEntry(item);
    setNextStepWorkDate(new Date().toISOString().split("T")[0]);
    setNextStepBankName(item.bankName || "");
    setNextStepBranchName(item.branchName || "");

    const categoryKey = item.businessDevOption || item.category || "ADVOCATE NOTICE";
    setNextStepOption(categoryKey);

    const currentSub = item.businessDevSubOption || item.subCategory || "";
    const stages = STAGE_DEFINITIONS[categoryKey] || STAGE_DEFINITIONS["ADVOCATE NOTICE"];
    const currentIndex = stages.indexOf(currentSub);
    const calculatedNext = (currentIndex >= 0 && currentIndex < stages.length - 1)
      ? stages[currentIndex + 1]
      : (stages[0] || "TAKE NOTICE ASSIGNMENT");

    setNextStepSubOption(calculatedNext);
    setNextStepCount(item.noOfCount || "1");
    setNextStepAmount("0");
    setNextStepBroughtBy(item.broughtBy || item.employeeName || "");
    setNextStepPreparedBy(item.preparedBy || "");
    setNextStepPrintedBy(item.printedBy || "");
    setNextStepDispatchedBy(item.dispatchedBy || "");
    setNextStepBillDate(new Date().toISOString().split("T")[0]);
    setNextStepBillAmount("");
    setNextStepBillNo("");
    let initRate = item.finalRate || "";
    let initOfficer = "";
    let initExpenses = item.expenses || (item.ownExpense ? String(item.ownExpense) : "");
    if (item.financialDetails) {
      try {
        const fin = typeof item.financialDetails === "string" ? JSON.parse(item.financialDetails) : item.financialDetails;
        if (fin.perNoticeRate) initRate = String(fin.perNoticeRate);
        if (fin.bankOfficerPerNotice) initOfficer = String(fin.bankOfficerPerNotice);
        if (fin.ownExpenses) initExpenses = String(fin.ownExpenses);
      } catch (e) { }
    }
    setNextStepRate(initRate);
    setNextStepOfficerShare(initOfficer);
    setNextStepExpenses(initExpenses);
    setNextStepAllocationDate(item.allocationDate || (item.workDate ? new Date(item.workDate).toISOString().split("T")[0] : new Date().toISOString().split("T")[0]));
    // Pre-fill file from target stage if previously saved
    const groupLogs = item.allLogs && item.allLogs.length > 0 ? item.allLogs : [item];
    const targetStageLog = groupLogs.find(gl => (gl.businessDevSubOption || gl.subCategory) === calculatedNext);
    setNextStepUploadedFileName(targetStageLog?.uploadedFileName || "");
    setNextStepPersonName(item.personName || "");
    setNextStepRemarks("");

    // Dynamically load filled stage data
    handleNextStepStageChange(calculatedNext, item);
  };

  const handleSaveNextStep = async (proceedToNext: boolean = false) => {
    if (!nextStepEntry) return;
    setSubmittingNextStep(true);
    try {
      const isNoticeAssessment = nextStepSubOption === "TAKE NOTICE ASSIGNMENT";
      const isBroughtByStep =
        nextStepSubOption === "TAKE NOTICE ASSIGNMENT" ||
        nextStepSubOption === "COLLECT NOTICE DATA";
      const isPreparedByStep = nextStepSubOption === "PREPARE NOTICE LIST";
      const isPrintedByStep = nextStepSubOption.includes("GENERATE NOTICE");
      const isDispatchedByStep = nextStepSubOption.includes("DISPATCH NOTICE");
      const isBillPreparationStep = nextStepSubOption.includes("PREPARE BILL");

      const assessmentCount = Math.max(0, parseInt(nextStepCount || "0", 10) || 0);
      const perNoticeRate = parseFloat(nextStepRate) || 0;
      const officerPerNotice = parseFloat(nextStepOfficerShare) || 0;
      const ownExpenses = parseFloat(nextStepExpenses) || 0;

      const payload = {
        masterId: nextStepEntry.masterId || 0,
        category: nextStepOption,
        subCategory: nextStepSubOption,
        workDate: nextStepWorkDate,
        typeOfWork: "Bank Related",
        workLocation: "Office",
        bankName: nextStepBankName,
        branchName: nextStepBranchName,
        businessDevOption: nextStepOption,
        businessDevSubOption: nextStepSubOption,
        noOfCount: nextStepCount,
        broughtBy: isBroughtByStep ? (nextStepBroughtBy || undefined) : undefined,
        preparedBy: isPreparedByStep ? (nextStepPreparedBy || undefined) : undefined,
        printedBy: isPrintedByStep ? (nextStepPrintedBy || undefined) : undefined,
        dispatchedBy: isDispatchedByStep ? (nextStepDispatchedBy || undefined) : undefined,
        stageAmount: isDispatchedByStep ? nextStepAmount : (nextStepSubOption === "TAKE NOTICE ASSIGNMENT" ? String(assessmentCount * perNoticeRate) : undefined),
        billDate: isBillPreparationStep ? (nextStepBillDate || undefined) : undefined,
        billAmount: isBillPreparationStep ? (nextStepBillAmount || undefined) : (nextStepSubOption.includes("REQUEST PAYMENT") ? nextStepAmount : undefined),
        billNo: isBillPreparationStep ? (nextStepBillNo || undefined) : undefined,
        personName: nextStepPersonName || undefined,
        finalRate: isNoticeAssessment ? (nextStepRate || "0") : undefined,
        bankOfficerPerNotice: isNoticeAssessment ? (nextStepOfficerShare || "0") : undefined,
        expenses: isNoticeAssessment ? (nextStepExpenses || "0") : undefined,
        financialDetails: isNoticeAssessment
          ? JSON.stringify({
            noticeCount: assessmentCount,
            perNoticeRate,
            bankOfficerPerNotice: officerPerNotice,
            ownExpenses,
          })
          : undefined,
        allocationDate: nextStepAllocationDate || nextStepWorkDate,
        uploadedFileName: nextStepUploadedFileUrl || nextStepUploadedFileName || undefined,
        remarks: nextStepRemarks || `Next step execution for ${nextStepSubOption}`
      };

      const res = await fetch("/api/legal-recovery/work-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to submit next step log");

      triggerToast?.(`Stage (${nextStepSubOption}) logged successfully.`);
      fetchWorkLogHistory();

      if (proceedToNext) {
        const categoryKey = nextStepOption || "ADVOCATE NOTICE";
        const stages = STAGE_DEFINITIONS[categoryKey] || STAGE_DEFINITIONS["ADVOCATE NOTICE"];
        const currentIndex = stages.indexOf(nextStepSubOption);
        if (currentIndex >= 0 && currentIndex < stages.length - 1) {
          const nextStage = stages[currentIndex + 1];
          setNextStepSubOption(nextStage);
          setNextStepRemarks("");
          setNextStepAmount("0");
          // Pre-fill file from next stage's previously saved data if any
          if (nextStepEntry) {
            const groupLogs = nextStepEntry.allLogs && nextStepEntry.allLogs.length > 0 ? nextStepEntry.allLogs : [nextStepEntry];
            const nextStageLog = groupLogs.find(gl => (gl.businessDevSubOption || gl.subCategory) === nextStage);
            setNextStepUploadedFileName(nextStageLog?.uploadedFileName || "");
          } else {
            setNextStepUploadedFileName("");
          }
        } else {
          setNextStepEntry(null);
        }
      } else {
        setNextStepEntry(null);
      }
    } catch (error: any) {
      alert(error.message || "Unable to save next step log");
    } finally {
      setSubmittingNextStep(false);
    }
  };

  const handleExportCsv = () => {
    if (filteredLogs.length === 0) {
      alert("No data available to export.");
      return;
    }

    const headers = [
      "ID", "Date", "Employee Name", "Work Location", "Type of Work", "Bank Name", "Branch Name",
      "Business Dev Option", "Work Step / Sub-Option", "Count", "Allocation Date",
      "Brought By", "Prepared By", "Printed By", "Dispatched By", "Bill Date", "Amount (Rs)", "Bill No", "Person Name", "Uploaded File", "Remarks"
    ];

    const cleanCell = (val: any) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = filteredLogs.map(l => [
      cleanCell(l.id),
      cleanCell(l.workDate ? new Date(l.workDate).toLocaleDateString("en-IN") : ""),
      cleanCell(l.employeeName || ""),
      cleanCell(l.workLocation || ""),
      cleanCell(l.typeOfWork || ""),
      cleanCell(l.bankName || ""),
      cleanCell(l.branchName || ""),
      cleanCell(l.businessDevOption || l.category || ""),
      cleanCell(l.businessDevSubOption || l.subCategory || ""),
      cleanCell(l.noOfCount || "1"),
      cleanCell(l.allocationDate || ""),
      cleanCell(l.broughtBy || ""),
      cleanCell(l.preparedBy || ""),
      cleanCell(l.printedBy || ""),
      cleanCell(l.dispatchedBy || ""),
      cleanCell(l.billDate || ""),
      cleanCell(l.billAmount || l.stageAmount || parseFollowUpDetails(l.financialDetails)?.totalRevenue || "0"),
      cleanCell(l.billNo || ""),
      cleanCell(l.personName || ""),
      cleanCell(l.uploadedFileName || ""),
      cleanCell(l.remarks || "")
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(r => r.join(","))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Legal_Work_Entry_History_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStageFilledDetails = (entry: LegalWorkLogItem, stageName: string) => {
    const groupLogs = entry.allLogs && entry.allLogs.length > 0 ? entry.allLogs : [entry];
    const matchingLog = groupLogs.find(l => (l.businessDevSubOption || l.subCategory) === stageName);
    const activeLog = matchingLog || entry;
    const n = activeLog.rawNotice || entry.rawNotice;

    const isLogged = !!matchingLog || groupLogs.some(l => (l.businessDevSubOption || l.subCategory) === stageName);

    let isFilled = isLogged;
    if (!isFilled && n) {
      if (stageName === "TAKE NOTICE ASSIGNMENT") isFilled = true;
      else if (stageName === "COLLECT NOTICE DATA") isFilled = !!n.broughtBy;
      else if (stageName === "PREPARE NOTICE LIST") isFilled = !!(n.noticeRenameBy || n.scannedBy);
      else if (stageName === "GENERATE NOTICE VIA SOFTWARE/MAIL MERGE") isFilled = !!n.printedBy;
      else if (stageName === "DISPATCH NOTICES") isFilled = !!n.dispatchedBy;
      else if (stageName === "PREPARE BILL (BILL BANWANA)") isFilled = !!(n.billNo || n.billAmount);
      else if (stageName === "REQUEST PAYMENT") isFilled = !!(n.handoverTo || n.paidDate);
    }

    const followUp = parseFollowUpDetails(activeLog.followUpDetails || entry.followUpDetails);
    const finances = parseFollowUpDetails(activeLog.financialDetails || entry.financialDetails);

    const relatedDispatch = finances
      ? logs.find(
        log =>
          log.id !== activeLog.id &&
          (log.businessDevSubOption || log.subCategory || "").includes("DISPATCH NOTICE") &&
          log.bankName === activeLog.bankName &&
          log.branchName === activeLog.branchName &&
          (log.businessDevOption || log.category) ===
          (activeLog.businessDevOption || activeLog.category) &&
          new Date(log.createdAt).getTime() >= new Date(activeLog.createdAt).getTime()
      )
      : undefined;

    const dispatchCost = Number(relatedDispatch?.stageAmount || 0);
    const finalGrossProfit = finances
      ? Number(finances.totalRevenue || 0) -
      Number(finances.bankOfficerTotal || 0) -
      Number(finances.ownExpenses || 0) -
      dispatchCost
      : undefined;

    const stageStaffMap: Record<string, { label: string; value?: string }> = {
      "TAKE NOTICE ASSIGNMENT": {
        label: "Brought By",
        value: activeLog.broughtBy || entry.broughtBy || n?.broughtBy || n?.createdBy || activeLog.employeeName || entry.employeeName,
      },
      "COLLECT NOTICE DATA": {
        label: "Brought By",
        value: activeLog.broughtBy || entry.broughtBy || n?.broughtBy,
      },
      "PREPARE NOTICE LIST": {
        label: "Prepared By",
        value: activeLog.preparedBy || entry.preparedBy || n?.noticeRenameBy || n?.scannedBy,
      },
      "GENERATE NOTICE VIA SOFTWARE/MAIL MERGE": {
        label: "Printed By",
        value: activeLog.printedBy || entry.printedBy || n?.printedBy,
      },
      "DISPATCH NOTICES": {
        label: "Dispatched By",
        value: activeLog.dispatchedBy || entry.dispatchedBy || n?.dispatchedBy,
      },
      "REQUEST PAYMENT": {
        label: "Person Name",
        value: activeLog.personName || entry.personName || n?.handoverTo || n?.handoverBy,
      },
      "BILL FOLLOW UP": {
        label: "Contacted Person",
        value: followUp?.contactedPerson,
      },
    };

    const stageStaff = stageStaffMap[stageName];

    const count = activeLog.noOfCount || entry.noOfCount || n?.noOfScan?.toString() || n?.noOfPrint?.toString() || n?.qty?.toString() || "1";
    const date = activeLog.allocationDate || entry.allocationDate || (activeLog.workDate ? new Date(activeLog.workDate).toLocaleDateString("en-IN") : undefined) || n?.noticeDate || n?.noticeOrderDate || 'N/A';

    const billNo = activeLog.billNo || entry.billNo || n?.billNo;
    const billDate = activeLog.billDate || entry.billDate || n?.billDate;
    const billAmount = activeLog.billAmount || entry.billAmount || (n?.billAmount ? String(n.billAmount) : undefined);
    const finalRate = activeLog.finalRate || entry.finalRate;
    const expenses = activeLog.expenses || (activeLog.ownExpense !== undefined && activeLog.ownExpense !== null ? String(activeLog.ownExpense) : undefined) || entry.expenses || (entry.ownExpense !== undefined && entry.ownExpense !== null ? String(entry.ownExpense) : undefined);
    const grossProfit = activeLog.grossProfit || entry.grossProfit;
    const stageAmount = activeLog.stageAmount !== undefined && activeLog.stageAmount !== null ? String(activeLog.stageAmount) : (entry.stageAmount !== undefined && entry.stageAmount !== null ? String(entry.stageAmount) : undefined);
    const file = activeLog.uploadedFileName || entry.uploadedFileName || n?.handoverReceiptPhoto;
    const remarks = activeLog.remarks || entry.remarks || n?.handoverRemarks;

    return {
      isFilled,
      staff: stageStaff?.value,
      staffLabel: stageStaff?.label || "Staff In-Charge",
      count,
      date,
      billNo,
      billDate,
      billAmount,
      finalRate,
      expenses,
      grossProfit,
      stageAmount,
      finances,
      dispatchCost,
      finalGrossProfit,
      pendingAmount: followUp?.summary?.totalPendingAmount,
      callAt:
        followUp?.callDate && followUp?.callTime
          ? `${followUp.callDate} ${followUp.callTime}`
          : followUp?.callDate,
      file,
      remarks
    };
  };

  return (
    <div className="space-y-6 animate-fade-in text-[#1C1C1A] w-full">
      {/* App Theme Header Banner */}
      <div className="bg-white p-6 rounded-2xl border border-[#E8E4DF] shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 bg-[#FCFBF9] border border-[#E8E4DF] rounded-full text-[9px] font-bold uppercase tracking-wider text-[#5D5B57]">
              Legal Recovery Work &amp; Notice Audit
            </span>
          </div>
          <h1 className="text-xl font-light tracking-wide font-serif text-[#1C1C1A] flex items-center gap-2" style={{ fontFamily: "'Playfair Display', serif" }}>
            <FileText className="w-5 h-5 text-[#C9A84C]" /> Legal Work Entry History
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchWorkLogHistory}
            className="px-3.5 py-2 bg-[#FCFBF9] border border-[#E8E4DF] hover:bg-[#F5F0EA] text-[#5D5B57] hover:text-[#1C1C1A] rounded-xl text-[10px] font-semibold tracking-wider uppercase transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
          </button>
          <button
            type="button"
            onClick={handleExportCsv}
            className="px-4 py-2 bg-[#C9A84C] hover:bg-[#b8973b] text-white rounded-xl text-[10px] font-bold tracking-wider uppercase transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" /> Export Report (CSV)
          </button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-[#E8E4DF] shadow-xs flex items-center gap-3">
          <div className="w-12 h-12 bg-[#FCFBF9] border border-[#E8E4DF] rounded-2xl flex items-center justify-center text-[#1C1C1A]">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[9px] uppercase tracking-wider text-[#9C9890] font-bold">Total History Records</p>
            <p className="text-xl font-semibold text-[#1C1C1A] mt-0.5">{filteredLogs.length}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#E8E4DF] shadow-xs flex items-center gap-3">
          <div className="w-12 h-12 bg-[#FCFBF9] border border-[#E8E4DF] rounded-2xl flex items-center justify-center text-[#1C1C1A]">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[9px] uppercase tracking-wider text-[#9C9890] font-bold">Total Work Count</p>
            <p className="text-xl font-semibold text-[#1C1C1A] mt-0.5">{totalCounts}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#E8E4DF] shadow-xs flex items-center gap-3">
          <div className="w-12 h-12 bg-[#FCFBF9] border border-[#E8E4DF] rounded-2xl flex items-center justify-center text-[#1C1C1A]">
            <Landmark className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[9px] uppercase tracking-wider text-[#9C9890] font-bold">Unique Banks</p>
            <p className="text-xl font-semibold text-[#1C1C1A] mt-0.5">{uniqueBanks.length}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#E8E4DF] shadow-xs flex items-center gap-3">
          <div className="w-12 h-12 bg-[#FCFBF9] border border-[#E8E4DF] rounded-2xl flex items-center justify-center text-emerald-600">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[9px] uppercase tracking-wider text-[#9C9890] font-bold">Total Bill Amount</p>
            <p className="text-xl font-semibold text-emerald-700 mt-0.5">₹{totalBillAmount.toLocaleString('en-IN')}</p>
          </div>
        </div>
      </div>

      {/* Filter Controls */}
      <div className="bg-white p-4 rounded-2xl border border-[#E8E4DF] shadow-xs space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search Bank, Staff, Sub-Option, Remarks..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-xl text-xs font-medium text-[#1C1C1A] focus:outline-none"
            />
          </div>

          <div>
            <select
              value={selectedBank}
              onChange={e => setSelectedBank(e.target.value)}
              className="w-full p-2 bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-xl text-xs font-medium text-[#1C1C1A] focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Banks ({allUniqueBanks.length})</option>
              {allUniqueBanks.map((b, i) => (
                <option key={i} value={b}>{b}</option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={selectedOption}
              onChange={e => setSelectedOption(e.target.value)}
              className="w-full p-2 bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-xl text-xs font-medium text-[#1C1C1A] focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Work Options ({uniqueOptions.length})</option>
              {uniqueOptions.map((o, i) => (
                <option key={i} value={o}>{o}</option>
              ))}
            </select>
          </div>

          <div>
            <input
              type="date"
              value={dateFilter}
              onChange={e => setDateFilter(e.target.value)}
              className="w-full p-2 bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-xl text-xs font-medium text-[#1C1C1A] focus:outline-none cursor-pointer"
            />
          </div>
        </div>

        {(searchQuery || selectedBank !== "ALL" || selectedOption !== "ALL" || dateFilter || Object.values(columnFilters).some(values => values.length > 0)) && (
          <div className="flex items-center justify-between text-xs pt-1 border-t border-[#E8E4DF]">
            <span className="font-medium text-[#5D5B57]">
              Showing {filteredLogs.length} of {logs.length} entries
            </span>
            <button
              onClick={() => {
                setSearchQuery("");
                setSelectedBank("ALL");
                setSelectedOption("ALL");
                setDateFilter("");
                setColumnFilters({ staff: [], bank: [], work: [], count: [], amount: [], execution: [] });
              }}
              className="text-[#1C1C1A] font-bold hover:underline cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        )}
      </div>

      {/* Structured Tabular Format (Data Table) */}
      <div className="bg-white rounded-2xl border border-[#E8E4DF] shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-[#5D5B57] font-semibold text-xs">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#C9A84C]" />
            Loading Tabular Legal Work History...
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-12 text-center text-[#5D5B57] font-semibold text-xs space-y-2">
            <FileText className="w-10 h-10 mx-auto text-slate-300" />
            <p className="text-sm font-bold text-[#1C1C1A]">No Legal Work Entry records found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-[11px] table-fixed min-w-[1180px]">
              <thead>
                <tr className="bg-[#FCFBF9] text-[#1C1C1A] font-bold border-b border-[#E8E4DF] text-[10px] uppercase tracking-wider">
                  {[
                    ["staff", "Date & Staff", "w-32"],
                    ["bank", "Bank & Branch", "w-36"],
                    ["work", "Work Category & Step", "w-64"],
                    ["count", "Qty", "w-20"],
                    ["amount", "Amount", "w-24"],
                    ["execution", "Execution Details", "w-64"]
                  ].map(([key, label, width], index) => (
                    <th key={key} className={`relative py-2 px-2 ${width} ${key === "count" ? "text-center" : key === "amount" ? "text-right" : ""}`}>
                      <div className={`flex items-center gap-1 ${key === "amount" ? "justify-end" : key === "count" ? "justify-center" : ""}`}>
                        <span>{label}</span>
                        <button type="button" onClick={() => setActiveColumnFilter(activeColumnFilter === key ? null : key)} className={`rounded p-0.5 hover:bg-slate-200 ${columnFilters[key].length ? "text-indigo-700 bg-indigo-100" : "text-slate-400"}`} title={`Filter ${label}`}>
                          <Filter className="w-3 h-3" />
                        </button>
                      </div>
                      {activeColumnFilter === key && (
                        <ExcelHeaderFilter
                          options={columnOptions[key]}
                          selected={columnFilters[key]}
                          onApply={values => setColumnFilters(current => ({ ...current, [key]: values }))}
                          onClose={() => setActiveColumnFilter(null)}
                          alignRight={index >= 4}
                        />
                      )}
                    </th>
                  ))}
                  <th className="py-2 px-2 w-24">Attachment</th>
                  <th className="py-2 px-2 w-36 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8E4DF] font-medium text-[#1C1C1A]">
                {filteredLogs.map(item => {
                  const categoryOpt = item.businessDevOption || item.category || "ADVOCATE NOTICE";
                  const subOpt = item.businessDevSubOption || item.subCategory || "TAKE NOTICE ASSIGNMENT";
                  const followUp = parseFollowUpDetails(item.followUpDetails);
                  const finances = parseFollowUpDetails(item.financialDetails);

                  return (
                    <tr key={item.id} className="hover:bg-[#FCFBF9] transition-colors">
                      <td className="py-2 px-2 align-top">
                        <div className="font-bold text-[#1C1C1A] flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-[#C9A84C] shrink-0" />
                          {item.workDate ? new Date(item.workDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "N/A"}
                        </div>
                        <div className="text-[11px] text-[#5D5B57] flex items-center gap-1 mt-0.5 font-medium">
                          <User className="w-3 h-3 text-slate-400 shrink-0" />
                          {item.employeeName || item.employeeId || "Staff Member"}
                        </div>
                      </td>

                      <td className="py-2 px-2 align-top">
                        <div className="font-bold text-[#1C1C1A]">{item.bankName || "N/A"}</div>
                        <div className="text-[11px] text-[#5D5B57] font-medium">{item.branchName || "N/A"}</div>
                      </td>

                      <td className="py-2 px-2 align-top">
                        <span className="px-2 py-0.5 bg-[#C9A84C] text-white font-bold rounded text-[9px] uppercase tracking-wider inline-block mb-1 shadow-2xs">
                          {categoryOpt}
                        </span>
                        <div className="font-bold text-[#1C1C1A] text-xs">
                          {subOpt}
                        </div>
                      </td>

                      <td className="py-2 px-2 align-top text-center">
                        <span className="px-2.5 py-1 bg-[#FCFBF9] text-[#1C1C1A] font-bold rounded-lg text-xs inline-block border border-[#E8E4DF]">
                          {item.noOfCount || "1"}
                        </span>
                      </td>

                      <td className="py-2 px-2 align-top text-right font-black text-emerald-700">
                        ₹{Number(item.billAmount || item.stageAmount || finances?.totalRevenue || 0).toLocaleString("en-IN")}
                      </td>

                      <td className="py-2 px-2 align-top space-y-0.5 text-[10px] leading-4">
                        {(item.broughtBy || subOpt === "TAKE NOTICE ASSIGNMENT") && (
                          <div><strong className="text-[#1C1C1A]">Brought By:</strong> {item.broughtBy || item.employeeName || item.employeeId || "Staff Member"}</div>
                        )}
                        {item.preparedBy && (
                          <div><strong className="text-[#1C1C1A]">Prepared By:</strong> {item.preparedBy}</div>
                        )}
                        {item.printedBy && (
                          <div><strong className="text-[#1C1C1A]">Printed By:</strong> {item.printedBy}</div>
                        )}
                        {item.dispatchedBy && (
                          <div><strong className="text-[#1C1C1A]">Dispatched By:</strong> {item.dispatchedBy}</div>
                        )}
                        {item.personName && (
                          <div><strong className="text-[#1C1C1A]">Person Name:</strong> {item.personName}</div>
                        )}
                        {item.billNo && (
                          <div><strong className="text-[#1C1C1A]">Bill No:</strong> {item.billNo} {item.billDate ? `(${item.billDate})` : ''}</div>
                        )}
                        {item.billAmount && (
                          <div className="text-emerald-700 font-bold">₹{parseFloat(item.billAmount).toLocaleString('en-IN')}</div>
                        )}
                        {item.stageAmount !== undefined && item.stageAmount !== null && (
                          <div className="font-black text-emerald-700">
                            Amount: ₹{Number(item.stageAmount).toLocaleString("en-IN")}
                          </div>
                        )}
                        {finances && (
                          <div className="space-y-0.5">
                            <div>Total: ₹{Number(finances.totalRevenue || 0).toLocaleString("en-IN")}</div>
                            <div>Officer: ₹{Number(finances.bankOfficerTotal || 0).toLocaleString("en-IN")}</div>
                            <div>Own Expense: ₹{Number(finances.ownExpenses || 0).toLocaleString("en-IN")}</div>
                            <div className="font-black text-emerald-700">GP before dispatch: ₹{Number(finances.grossProfitBeforeDispatch || 0).toLocaleString("en-IN")}</div>
                          </div>
                        )}
                        {followUp && (
                          <>
                            <div><strong>Called:</strong> {followUp.callDate || "—"} {followUp.callTime || ""}</div>
                            <div><strong>Contacted:</strong> {followUp.contactedPerson || "—"}</div>
                            <div className="font-black text-rose-700">
                              Pending: ₹{Number(followUp.summary?.totalPendingAmount || 0).toLocaleString("en-IN")}
                            </div>
                            <div className="max-w-xs break-words [overflow-wrap:anywhere] text-slate-600">
                              {followUp.conversation || item.remarks}
                            </div>
                          </>
                        )}
                        {subOpt !== "TAKE NOTICE ASSIGNMENT" && !item.broughtBy && !item.preparedBy && !item.printedBy && !item.dispatchedBy && !item.personName && !item.billNo && !item.billAmount && (
                          <span className="text-slate-400 italic">Notice / Form Log</span>
                        )}
                      </td>

                      <td className="py-2 px-2 align-top">
                        {(() => {
                          // Collect all unique attachments across all grouped logs
                          const allAttachments: Array<{ fileName: string; stage: string }> = [];
                          const seenFiles = new Set<string>();
                          const groupLogs = item.allLogs && item.allLogs.length > 0 ? item.allLogs : [item];
                          groupLogs.forEach(gl => {
                            if (gl.uploadedFileName && !seenFiles.has(gl.uploadedFileName)) {
                              seenFiles.add(gl.uploadedFileName);
                              allAttachments.push({
                                fileName: gl.uploadedFileName,
                                stage: gl.businessDevSubOption || gl.subCategory || ""
                              });
                            }
                          });
                          if (allAttachments.length === 0) {
                            return <span className="text-slate-400 text-[10px]">—</span>;
                          }
                          return (
                            <div className="flex flex-col gap-1">
                              {allAttachments.map((att, idx) => (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => openFilePreview(att.fileName)}
                                  className="px-2 py-1 bg-[#FCFBF9] hover:bg-[#F5F0EA] border border-[#E8E4DF] text-[#1C1C1A] rounded-lg font-semibold text-[10px] flex items-center gap-1 cursor-pointer transition-colors"
                                  title={att.stage ? `${att.stage}: ${getFileNameOnly(att.fileName)}` : getFileNameOnly(att.fileName)}
                                >
                                  <Paperclip className="w-3 h-3 text-[#C9A84C] shrink-0" />
                                  <span className="truncate max-w-[90px]">{getFileNameOnly(att.fileName)}</span>
                                </button>
                              ))}
                            </div>
                          );
                        })()}
                      </td>

                      <td className="py-2 px-2 align-top text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEditEntry(item)}
                            className="p-1.5 text-indigo-600 hover:bg-indigo-50 border border-indigo-200 rounded transition-colors"
                            title="Edit work entry details"
                          >
                            <Edit className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenDetailModal(item)}
                            className="px-2.5 py-1 bg-[#C9A84C] hover:bg-[#b8973b] text-white rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer shadow-xs transition-all"
                            title="Inspect Stages Checklist"
                          >
                            <Eye className="w-3 h-3" /> Inspect Stages
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleDeleteLog(item.id, e)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Delete entry"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* FULL EDIT WORK ENTRY MODAL */}
      {editEntry && createPortal(
        <div className="fixed inset-0 bg-black/50 z-[10000] flex items-center justify-center p-4" onMouseDown={e => e.target === e.currentTarget && setEditEntry(null)}>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-5 py-3.5 border-b flex items-center justify-between bg-slate-50 shrink-0">
              <div>
                <h3 className="text-sm font-black text-slate-800">Edit Complete Work Entry Details</h3>
                <p className="text-[10.5px] text-[#714B67] font-bold truncate max-w-md">{editBankName || 'Bank'} — {editSubOption || editOption}</p>
              </div>
              <button onClick={() => setEditEntry(null)} className="p-1 text-slate-400 hover:text-slate-900 rounded-lg"><X className="w-4.5 h-4.5" /></button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto text-xs font-semibold text-slate-700">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-600 mb-1">Work Date</label>
                  <input type="date" value={editWorkDate} onChange={e => setEditWorkDate(e.target.value)} className="w-full border border-slate-250 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-800 focus:ring-[#714B67] focus:border-[#714B67]" />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-600 mb-1">Bank Name</label>
                  <input type="text" value={editBankName} onChange={e => setEditBankName(e.target.value)} className="w-full border border-slate-250 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-800 focus:ring-[#714B67] focus:border-[#714B67]" />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-600 mb-1">Branch Name</label>
                  <input type="text" value={editBranchName} onChange={e => setEditBranchName(e.target.value)} className="w-full border border-slate-250 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-800 focus:ring-[#714B67] focus:border-[#714B67]" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-600 mb-1">Work Category / Option</label>
                  <input type="text" value={editOption} onChange={e => setEditOption(e.target.value)} className="w-full border border-slate-250 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-800 focus:ring-[#714B67] focus:border-[#714B67]" />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-600 mb-1">Work Step / Sub-Option</label>
                  <input type="text" value={editSubOption} onChange={e => setEditSubOption(e.target.value)} className="w-full border border-slate-250 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-800 focus:ring-[#714B67] focus:border-[#714B67]" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-600 mb-1">Quantity (Qty)</label>
                  <input type="number" min="1" value={editCount} onChange={e => setEditCount(e.target.value)} className="w-full border border-slate-250 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-800 focus:ring-[#714B67] focus:border-[#714B67]" />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-600 mb-1">Bill / Stage Amount (₹)</label>
                  <input type="number" min="0" step="0.01" value={editAmount} onChange={e => setEditAmount(e.target.value)} className="w-full border border-slate-250 rounded-lg px-3 py-1.5 text-xs font-bold text-emerald-700 focus:ring-emerald-600 focus:border-emerald-600" />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-600 mb-1">Own Expense (₹)</label>
                  <input type="number" min="0" step="0.01" value={editOwnExpense} onChange={e => setEditOwnExpense(e.target.value)} className="w-full border border-slate-250 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-800 focus:ring-[#714B67] focus:border-[#714B67]" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 border-t border-slate-100">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-600 mb-1">Brought By Staff</label>
                  <input type="text" value={editBroughtBy} onChange={e => setEditBroughtBy(e.target.value)} placeholder="Staff name" className="w-full border border-slate-250 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-800" />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-600 mb-1">Prepared By Staff</label>
                  <input type="text" value={editPreparedBy} onChange={e => setEditPreparedBy(e.target.value)} placeholder="Staff name" className="w-full border border-slate-250 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-800" />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-600 mb-1">Printed By Staff</label>
                  <input type="text" value={editPrintedBy} onChange={e => setEditPrintedBy(e.target.value)} placeholder="Staff name" className="w-full border border-slate-250 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-800" />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-600 mb-1">Dispatched By Staff</label>
                  <input type="text" value={editDispatchedBy} onChange={e => setEditDispatchedBy(e.target.value)} placeholder="Staff name" className="w-full border border-slate-250 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-800" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-600 mb-1">Bank Officer / Handover Contact</label>
                  <input type="text" value={editPersonName} onChange={e => setEditPersonName(e.target.value)} placeholder="Officer Name" className="w-full border border-slate-250 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-800" />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-600 mb-1">Officer Phone / Contact No</label>
                  <input type="text" value={editOfficerContactNo} onChange={e => setEditOfficerContactNo(e.target.value)} placeholder="Phone No" className="w-full border border-slate-250 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-800" />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-600 mb-1">Remarks &amp; Work Execution Notes</label>
                <textarea rows={3} value={editRemarks} onChange={e => setEditRemarks(e.target.value)} placeholder="Specific instructions or work execution notes..." className="w-full border border-slate-250 rounded-lg px-3 py-2 text-xs resize-none focus:outline-none focus:border-[#714B67]" />
              </div>
            </div>

            <div className="px-5 py-3 border-t bg-slate-50 flex justify-end gap-2 shrink-0">
              <button onClick={() => setEditEntry(null)} className="px-3.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200/60 rounded-lg transition-colors">Cancel</button>
              <button disabled={savingEdit} onClick={handleSaveEdit} className="px-4 py-2 rounded-lg bg-[#714B67] hover:bg-[#5F3F56] text-white text-xs font-bold flex items-center gap-1.5 disabled:opacity-60 shadow-sm cursor-pointer active:scale-95 transition-all">
                <Save className="w-3.5 h-3.5" /> {savingEdit ? "Saving Changes..." : "Save All Changes"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* NEXT STEP EXECUTION MODAL */}
      {nextStepEntry && createPortal(
        <div className="fixed inset-0 bg-black/50 z-[10000] flex items-center justify-center p-4" onMouseDown={e => e.target === e.currentTarget && setNextStepEntry(null)}>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-xl overflow-hidden flex flex-col">
            <div className="px-5 py-4 border-b flex items-center justify-between bg-[#714B67] text-white">
              <div>
                <h3 className="text-sm font-black mt-0.5">Fill Next Step for Notice / Work Log</h3>
                <p className="text-[10px] text-slate-200 truncate max-w-md mt-0.5">{nextStepBankName} — {nextStepBranchName}</p>
              </div>
              <button onClick={() => setNextStepEntry(null)} className="p-1 text-white/80 hover:text-white rounded-lg"><X className="w-5 h-5" /></button>
            </div>

            <div className="p-5 space-y-4 text-xs font-semibold text-slate-700">
              <div className="bg-amber-50 border border-amber-250 rounded-xl p-3 text-[11px] text-amber-800 font-bold flex items-center gap-2">
                <ArrowRight className="w-4 h-4 text-amber-600 shrink-0" />
                <div>
                  <strong>Next Stage Target:</strong> Pre-selected sequence step is <span className="underline">{nextStepSubOption}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-600 mb-1">Allocation Date *</label>
                  <input type="date" value={nextStepWorkDate} onChange={e => setNextStepWorkDate(e.target.value)} className="w-full border border-slate-250 rounded-lg px-3 py-2 text-xs font-bold text-slate-800 focus:ring-[#714B67] focus:border-[#714B67]" required />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-600 mb-1">Select Next Work Step *</label>
                  <select value={nextStepSubOption} onChange={e => handleNextStepStageChange(e.target.value)} className="w-full border border-slate-250 rounded-lg px-3 py-2 text-xs font-bold text-slate-800 focus:ring-[#714B67] focus:border-[#714B67]">
                    {(STAGE_DEFINITIONS[nextStepOption] || STAGE_DEFINITIONS["ADVOCATE NOTICE"]).map((stg) => (
                      <option key={stg} value={stg}>{stg}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Dynamic Step Fields matching LegalWorkLogsView 100% */}
              {nextStepSubOption === "TAKE NOTICE ASSIGNMENT" && (
                <div className="space-y-3 bg-purple-50/70 p-3.5 rounded-xl border border-purple-200 animate-fade-in">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-600 mb-1">No. of Counts *</label>
                      <input type="number" min="1" required value={nextStepCount} onChange={e => setNextStepCount(e.target.value)} className="w-full border border-slate-250 rounded-lg px-3 py-2 text-xs font-bold text-slate-800" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-600 mb-1">Brought By *</label>
                      <input type="text" required value={nextStepBroughtBy} onChange={e => setNextStepBroughtBy(e.target.value)} placeholder="Enter person name..." className="w-full border border-slate-250 rounded-lg px-3 py-2 text-xs font-bold text-slate-800" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-600 mb-1">Allocation Date *</label>
                      <input type="date" required value={nextStepAllocationDate} onChange={e => setNextStepAllocationDate(e.target.value)} className="w-full border border-slate-250 rounded-lg px-3 py-2 text-xs font-bold text-slate-800" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-600 mb-1">Per Notice Rate (₹) *</label>
                      <input type="number" min="0" step="0.01" value={nextStepRate} onChange={e => setNextStepRate(e.target.value)} placeholder="Rate per notice" className="w-full border border-slate-250 rounded-lg px-3 py-2 text-xs font-bold text-slate-800" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-600 mb-1">Bank Officer / Notice (₹) *</label>
                      <input type="number" min="0" step="0.01" value={nextStepOfficerShare} onChange={e => setNextStepOfficerShare(e.target.value)} placeholder="Officer share" className="w-full border border-slate-250 rounded-lg px-3 py-2 text-xs font-bold text-slate-800" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-600 mb-1">Own Expenses (₹)</label>
                      <input type="number" min="0" step="0.01" value={nextStepExpenses} onChange={e => setNextStepExpenses(e.target.value)} placeholder="Enter expenses" className="w-full border border-slate-250 rounded-lg px-3 py-2 text-xs font-bold text-slate-800" />
                    </div>
                  </div>
                </div>
              )}

              {nextStepSubOption === "COLLECT NOTICE DATA" && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-purple-50/70 p-3.5 rounded-xl border border-purple-200 animate-fade-in">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-600 mb-1">No. of Counts *</label>
                    <input type="number" min="1" required value={nextStepCount} onChange={e => setNextStepCount(e.target.value)} className="w-full border border-slate-250 rounded-lg px-3 py-2 text-xs font-bold text-slate-800" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-600 mb-1">Brought By *</label>
                    <input type="text" required value={nextStepBroughtBy} onChange={e => setNextStepBroughtBy(e.target.value)} placeholder="Person name who brought data..." className="w-full border border-slate-250 rounded-lg px-3 py-2 text-xs font-bold text-slate-800" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-600 mb-1">Upload Notice Data File (Optional)</label>
                    <input type="file" accept=".xlsx,.xls,.csv,.pdf,.doc,.docx,.png,.jpg,.jpeg,image/*" onChange={handleNextStepFileChange} className="w-full text-[11px] font-bold text-slate-700 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-[9.5px] file:font-black file:bg-purple-100 file:text-purple-800 cursor-pointer" />
                    {nextStepUploadedFileName && (
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-[10px] font-bold text-purple-700 truncate">📄 {nextStepUploadedFileName}</span>
                        <button type="button" onClick={() => openFilePreview(nextStepUploadedFileUrl || nextStepUploadedFileName)} className="shrink-0 px-1.5 py-0.5 bg-[#C9A84C] text-white rounded text-[9px] font-bold cursor-pointer hover:bg-[#b8973b]">Preview</button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {nextStepSubOption === "PREPARE NOTICE LIST" && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-purple-50/70 p-3.5 rounded-xl border border-purple-200 animate-fade-in">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-600 mb-1">No. of Counts *</label>
                    <input type="number" min="1" required value={nextStepCount} onChange={e => setNextStepCount(e.target.value)} className="w-full border border-slate-250 rounded-lg px-3 py-2 text-xs font-bold text-slate-800" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-600 mb-1">Prepared By *</label>
                    <input type="text" required value={nextStepPreparedBy} onChange={e => setNextStepPreparedBy(e.target.value)} placeholder="Person name who prepared list..." className="w-full border border-slate-250 rounded-lg px-3 py-2 text-xs font-bold text-slate-800" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-600 mb-1">Upload Notice List File (Optional)</label>
                    <input type="file" accept=".xlsx,.xls,.csv,.pdf,.doc,.docx,.png,.jpg,.jpeg,image/*" onChange={handleNextStepFileChange} className="w-full text-[11px] font-bold text-slate-700 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-[9.5px] file:font-black file:bg-purple-100 file:text-purple-800 cursor-pointer" />
                    {nextStepUploadedFileName && (
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-[10px] font-bold text-purple-700 truncate">📄 {nextStepUploadedFileName}</span>
                        <button type="button" onClick={() => openFilePreview(nextStepUploadedFileUrl || nextStepUploadedFileName)} className="shrink-0 px-1.5 py-0.5 bg-[#C9A84C] text-white rounded text-[9px] font-bold cursor-pointer hover:bg-[#b8973b]">Preview</button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {nextStepSubOption.includes("GENERATE NOTICE") && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-purple-50/70 p-3.5 rounded-xl border border-purple-200 animate-fade-in">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-600 mb-1">No. of Counts *</label>
                    <input type="number" min="1" required value={nextStepCount} onChange={e => setNextStepCount(e.target.value)} className="w-full border border-slate-250 rounded-lg px-3 py-2 text-xs font-bold text-slate-800" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-600 mb-1">Printed By *</label>
                    <input type="text" required value={nextStepPrintedBy} onChange={e => setNextStepPrintedBy(e.target.value)} placeholder="Person name who printed notices..." className="w-full border border-slate-250 rounded-lg px-3 py-2 text-xs font-bold text-slate-800" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-600 mb-1">Upload Notice File (Optional)</label>
                    <input type="file" accept=".xlsx,.xls,.csv,.pdf,.doc,.docx,.png,.jpg,.jpeg,image/*" onChange={handleNextStepFileChange} className="w-full text-[11px] font-bold text-slate-700 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-[9.5px] file:font-black file:bg-purple-100 file:text-purple-800 cursor-pointer" />
                    {nextStepUploadedFileName && (
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-[10px] font-bold text-purple-700 truncate">📄 {nextStepUploadedFileName}</span>
                        <button type="button" onClick={() => openFilePreview(nextStepUploadedFileUrl || nextStepUploadedFileName)} className="shrink-0 px-1.5 py-0.5 bg-[#C9A84C] text-white rounded text-[9px] font-bold cursor-pointer hover:bg-[#b8973b]">Preview</button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {nextStepSubOption.includes("DISPATCH NOTICE") && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-purple-50/70 p-3.5 rounded-xl border border-purple-200 animate-fade-in">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-600 mb-1">No. of Counts *</label>
                    <input type="number" min="1" required value={nextStepCount} onChange={e => setNextStepCount(e.target.value)} className="w-full border border-slate-250 rounded-lg px-3 py-2 text-xs font-bold text-slate-800" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-600 mb-1">Dispatched By *</label>
                    <input type="text" required value={nextStepDispatchedBy} onChange={e => setNextStepDispatchedBy(e.target.value)} placeholder="Person name who dispatched..." className="w-full border border-slate-250 rounded-lg px-3 py-2 text-xs font-bold text-slate-800" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-600 mb-1">Amount (₹) *</label>
                    <input type="number" min="0" step="0.01" required value={nextStepAmount} onChange={e => setNextStepAmount(e.target.value)} placeholder="Enter dispatch amount..." className="w-full border border-slate-250 rounded-lg px-3 py-2 text-xs font-bold text-emerald-700" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-600 mb-1">Upload Dispatch Proof / File (Optional)</label>
                    <input type="file" accept=".xlsx,.xls,.csv,.pdf,.doc,.docx,.png,.jpg,.jpeg,image/*" onChange={handleNextStepFileChange} className="w-full text-[11px] font-bold text-slate-700 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-[9.5px] file:font-black file:bg-purple-100 file:text-purple-800 cursor-pointer" />
                    {nextStepUploadedFileName && (
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-[10px] font-bold text-purple-700 truncate">📄 {nextStepUploadedFileName}</span>
                        <button type="button" onClick={() => openFilePreview(nextStepUploadedFileUrl || nextStepUploadedFileName)} className="shrink-0 px-1.5 py-0.5 bg-[#C9A84C] text-white rounded text-[9px] font-bold cursor-pointer hover:bg-[#b8973b]">Preview</button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {nextStepSubOption.includes("PREPARE BILL") && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-purple-50/70 p-3.5 rounded-xl border border-purple-200 animate-fade-in">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-600 mb-1">Bill Date *</label>
                    <input type="date" required value={nextStepBillDate} onChange={e => setNextStepBillDate(e.target.value)} className="w-full border border-slate-250 rounded-lg px-3 py-2 text-xs font-bold text-slate-800" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-600 mb-1">Bill Amount (₹) *</label>
                    <input type="number" min="0" step="0.01" required value={nextStepBillAmount} onChange={e => setNextStepBillAmount(e.target.value)} placeholder="Enter amount..." className="w-full border border-slate-250 rounded-lg px-3 py-2 text-xs font-bold text-emerald-700" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-600 mb-1">Bill No. *</label>
                    <input type="text" required value={nextStepBillNo} onChange={e => setNextStepBillNo(e.target.value)} placeholder="Enter bill number..." className="w-full border border-slate-250 rounded-lg px-3 py-2 text-xs font-bold text-slate-800" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-600 mb-1">Upload Bill File (Optional)</label>
                    <input type="file" accept=".xlsx,.xls,.csv,.pdf,.doc,.docx,.png,.jpg,.jpeg,image/*" onChange={handleNextStepFileChange} className="w-full text-[11px] font-bold text-slate-700 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-[9.5px] file:font-black file:bg-purple-100 file:text-purple-800 cursor-pointer" />
                    {nextStepUploadedFileName && (
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-[10px] font-bold text-purple-700 truncate">📄 {nextStepUploadedFileName}</span>
                        <button type="button" onClick={() => openFilePreview(nextStepUploadedFileUrl || nextStepUploadedFileName)} className="shrink-0 px-1.5 py-0.5 bg-[#C9A84C] text-white rounded text-[9px] font-bold cursor-pointer hover:bg-[#b8973b]">Preview</button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {nextStepSubOption.includes("REQUEST PAYMENT") && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-purple-50/70 p-3.5 rounded-xl border border-purple-200 animate-fade-in">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-600 mb-1">Amount (₹) *</label>
                    <input type="number" min="0" step="0.01" required value={nextStepAmount} onChange={e => setNextStepAmount(e.target.value)} placeholder="Enter amount..." className="w-full border border-slate-250 rounded-lg px-3 py-2 text-xs font-bold text-emerald-700" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-600 mb-1">Person Name (Optional)</label>
                    <input type="text" value={nextStepPersonName} onChange={e => setNextStepPersonName(e.target.value)} placeholder="Enter person name..." className="w-full border border-slate-250 rounded-lg px-3 py-2 text-xs font-bold text-slate-800" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-600 mb-1">Allocated Date *</label>
                    <input type="date" required value={nextStepAllocationDate} onChange={e => setNextStepAllocationDate(e.target.value)} className="w-full border border-slate-250 rounded-lg px-3 py-2 text-xs font-bold text-slate-800" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-600 mb-1">Upload File (Optional)</label>
                    <input type="file" accept=".xlsx,.xls,.csv,.pdf,.doc,.docx,.png,.jpg,.jpeg,image/*" onChange={handleNextStepFileChange} className="w-full text-[11px] font-bold text-slate-700 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-[9.5px] file:font-black file:bg-purple-100 file:text-purple-800 cursor-pointer" />
                    {nextStepUploadedFileName && (
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-[10px] font-bold text-purple-700 truncate">📄 {nextStepUploadedFileName}</span>
                        <button type="button" onClick={() => openFilePreview(nextStepUploadedFileUrl || nextStepUploadedFileName)} className="shrink-0 px-1.5 py-0.5 bg-[#C9A84C] text-white rounded text-[9px] font-bold cursor-pointer hover:bg-[#b8973b]">Preview</button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-600 mb-1">Remarks &amp; Execution Summary</label>
                <textarea rows={3} value={nextStepRemarks} onChange={e => setNextStepRemarks(e.target.value)} placeholder="Enter details for this next step execution..." className="w-full border border-slate-250 rounded-lg px-3 py-2 text-xs resize-none focus:outline-none focus:border-[#714B67]" />
              </div>
            </div>

            <div className="px-5 py-3 border-t bg-slate-50 flex items-center justify-between gap-2 shrink-0">
              <button onClick={() => setNextStepEntry(null)} className="px-3.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200/60 rounded-lg transition-colors">Cancel</button>
              <div className="flex items-center gap-2">
                <button disabled={submittingNextStep} onClick={() => handleSaveNextStep(true)} className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-black flex items-center gap-1.5 disabled:opacity-60 shadow-xs cursor-pointer active:scale-95 transition-all">
                  <ArrowRight className="w-3.5 h-3.5" /> Save &amp; Proceed to Next Stage ➔
                </button>
                <button disabled={submittingNextStep} onClick={() => handleSaveNextStep(false)} className="px-5 py-2 rounded-lg bg-[#714B67] hover:bg-[#5F3F56] text-white text-xs font-black flex items-center gap-1.5 disabled:opacity-60 shadow-md cursor-pointer active:scale-95 transition-all">
                  <CheckCircle2 className="w-3.5 h-3.5" /> {submittingNextStep ? "Saving..." : "Save & Close"}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Level 4: Entry Detailed View Modal with Vertical Stages Checklist */}
      {selectedEntryDetail && createPortal(
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-xs z-[9999] flex items-center justify-center p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSelectedEntryDetail(null);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Notice stage and lifecycle inspector"
            className="bg-white rounded-2xl max-w-5xl w-full h-[min(760px,92vh)] overflow-hidden shadow-2xl relative border border-[#E8E4DF] flex flex-col animate-fade-in"
          >
            {/* Modal Top Header */}
            <div className="p-4 sm:p-5 bg-[#FCFBF9] border-b border-[#E8E4DF] text-[#1C1C1A] flex justify-between items-center shrink-0">
              <div>
                <span className="px-2.5 py-0.5 bg-white text-[#5D5B57] rounded-full text-[10px] font-bold uppercase tracking-wider border border-[#E8E4DF]">
                  Notice Stage &amp; Lifecycle Inspector
                </span>
                <h3 className="text-lg font-light font-serif text-[#1C1C1A] mt-1" style={{ fontFamily: "'Playfair Display', serif" }}>
                  {selectedEntryDetail.bankName || 'Bank'} - {selectedEntryDetail.branchName || 'Branch'}
                </h3>
                <p className="text-xs text-[#5D5B57] font-medium">
                  Logged by <strong>{selectedEntryDetail.employeeName || selectedEntryDetail.employeeId}</strong> on {selectedEntryDetail.workDate ? new Date(selectedEntryDetail.workDate).toLocaleDateString("en-IN") : 'N/A'}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedEntryDetail(null)}
                className="p-1.5 text-slate-400 hover:text-[#1C1C1A] rounded-xl hover:bg-slate-100 transition-colors font-bold text-sm"
              >
                ✕
              </button>
            </div>

            {/* Split Screen Layout Body */}
            <div className="flex flex-col md:flex-row flex-1 overflow-hidden bg-white">
              {/* LEFT COLUMN: Vertical Stages Checklist (Matching User Screenshot Exactly!) */}
              <div className="w-full md:w-5/12 p-4 border-r border-[#E8E4DF] overflow-y-auto space-y-3 bg-[#FCFBF9]/40">
                <div className="pb-2 border-b border-[#E8E4DF]">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-[#9C9890] block">Work Category</span>
                  <h4 className="text-xs font-bold text-[#1C1C1A] uppercase">{selectedEntryDetail.businessDevOption || selectedEntryDetail.category}</h4>
                  <p className="text-[10px] text-[#5D5B57] font-medium mt-0.5">Click any stage below to inspect details:</p>
                </div>

                {/* Vertical Stage Cards List */}
                <div className="space-y-2.5">
                  {(STAGE_DEFINITIONS[selectedEntryDetail.businessDevOption || selectedEntryDetail.category || "ADVOCATE NOTICE"] || STAGE_DEFINITIONS["ADVOCATE NOTICE"]).map((stg, idx) => {
                    const stageInfo = getStageFilledDetails(selectedEntryDetail, stg);
                    const isFilled = stageInfo.isFilled;
                    const isSelected = selectedStageTab === stg;

                    return (
                      <div
                        key={idx}
                        onClick={() => setSelectedStageTab(stg)}
                        className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center gap-3 ${isSelected
                          ? "bg-white border-[#C9A84C] shadow-sm ring-1 ring-[#C9A84C]"
                          : isFilled
                            ? "bg-white border-[#E8E4DF] shadow-2xs font-bold"
                            : "bg-white border-[#E8E4DF] opacity-60 hover:opacity-100"
                          }`}
                      >
                        {/* Radio Dot Badge matching screenshot */}
                        <div className="shrink-0">
                          {isFilled ? (
                            <div className="w-5 h-5 rounded-full bg-[#C9A84C] text-white flex items-center justify-center font-bold text-[10px] shadow-2xs">
                              ✓
                            </div>
                          ) : (
                            <div className="w-5 h-5 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center">
                              <div className="w-2 h-2 rounded-full bg-slate-300" />
                            </div>
                          )}
                        </div>

                        {/* Stage Name Label */}
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs font-bold uppercase tracking-wide leading-snug ${isSelected ? "text-[#1C1C1A] font-extrabold" : "text-[#5D5B57]"
                            }`}>
                            {stg}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* RIGHT COLUMN: Stage Execution & Attachment Details */}
              <div className="w-full md:w-7/12 min-w-0 p-5 overflow-y-auto overflow-x-hidden space-y-4 bg-white">
                {selectedStageTab ? (
                  (() => {
                    const info = getStageFilledDetails(selectedEntryDetail, selectedStageTab);
                    return (
                      <div className="space-y-4 animate-fade-in">
                        <div className="p-4 bg-[#FCFBF9] rounded-2xl border border-[#E8E4DF] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="space-y-1">
                            <span className="text-[9px] font-bold uppercase tracking-wider text-[#9C9890]">Inspect Work Stage</span>
                            <h3 className="text-sm font-bold text-[#1C1C1A] uppercase">{selectedStageTab}</h3>
                            {info.isFilled ? (
                              <span className="inline-block px-2.5 py-0.5 bg-[#C9A84C] text-white rounded-full text-[10px] font-bold uppercase tracking-wider shadow-2xs">
                                Stage Completed / Details Filled
                              </span>
                            ) : (
                              <span className="inline-block px-2.5 py-0.5 bg-[#E8E4DF] text-[#5D5B57] rounded-full text-[10px] font-bold uppercase tracking-wider">
                                Stage Pending
                              </span>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => openNextStepModal(selectedEntryDetail)}
                            className="px-3.5 py-2 bg-[#714B67] hover:bg-[#5F3F56] text-white rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95 transition-all self-start sm:self-center"
                          >
                            <ArrowRight className="w-3.5 h-3.5" /> + Fill &amp; Execute Stage
                          </button>
                        </div>

                        {/* Stage Fields Breakdown */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-medium text-[#1C1C1A] bg-[#FCFBF9] p-4 rounded-2xl border border-[#E8E4DF]">
                          <div>
                            <span className="text-[9px] font-bold uppercase tracking-wider text-[#9C9890] block mb-0.5">Allocation / Order Date</span>
                            <p className="font-bold text-[#1C1C1A]">{info.date || selectedEntryDetail.allocationDate || (selectedEntryDetail.workDate ? new Date(selectedEntryDetail.workDate).toLocaleDateString("en-IN") : 'N/A')}</p>
                          </div>

                          <div>
                            <span className="text-[9px] font-bold uppercase tracking-wider text-[#9C9890] block mb-0.5">Notice Quantity / Count</span>
                            <p className="font-bold text-[#1C1C1A]">{info.count || selectedEntryDetail.noOfCount || "1"} Notice(s)</p>
                          </div>

                          {info.staff && (
                            <div className="col-span-2 sm:col-span-1">
                              <span className="text-[9px] font-bold uppercase tracking-wider text-[#9C9890] block mb-0.5">{info.staffLabel || "Staff In-Charge / Handover"}</span>
                              <p className="font-bold text-[#1C1C1A]">{info.staff}</p>
                            </div>
                          )}

                          {info.billNo && (
                            <div>
                              <span className="text-[9px] font-bold uppercase tracking-wider text-[#9C9890] block mb-0.5">Bill Number</span>
                              <p className="font-bold text-[#1C1C1A]">{info.billNo}</p>
                            </div>
                          )}

                          {info.billDate && (
                            <div>
                              <span className="text-[9px] font-bold uppercase tracking-wider text-[#9C9890] block mb-0.5">Bill Date</span>
                              <p className="font-bold text-[#1C1C1A]">{info.billDate}</p>
                            </div>
                          )}

                          {info.billAmount && (
                            <div>
                              <span className="text-[9px] font-bold uppercase tracking-wider text-[#9C9890] block mb-0.5">Bill Amount</span>
                              <p className="font-bold text-emerald-700 text-sm">₹{parseFloat(info.billAmount).toLocaleString('en-IN')}</p>
                            </div>
                          )}

                          {info.finalRate !== undefined && info.finalRate !== null && (
                            <div>
                              <span className="text-[9px] font-bold uppercase tracking-wider text-[#9C9890] block mb-0.5">Per Notice Rate</span>
                              <p className="font-bold text-[#1C1C1A] text-sm">₹{parseFloat(info.finalRate).toLocaleString("en-IN")}</p>
                            </div>
                          )}

                          {info.expenses !== undefined && info.expenses !== null && (
                            <div>
                              <span className="text-[9px] font-bold uppercase tracking-wider text-[#9C9890] block mb-0.5">Own Expenses</span>
                              <p className="font-bold text-rose-700 text-sm">₹{parseFloat(info.expenses).toLocaleString("en-IN")}</p>
                            </div>
                          )}

                          {info.grossProfit !== undefined && info.grossProfit !== null && (
                            <div>
                              <span className="text-[9px] font-bold uppercase tracking-wider text-[#9C9890] block mb-0.5">GP Before Dispatch</span>
                              <p className={`font-black text-sm ${parseFloat(info.grossProfit) >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                                ₹{parseFloat(info.grossProfit).toLocaleString("en-IN")}
                              </p>
                            </div>
                          )}

                          {info.stageAmount !== undefined && info.stageAmount !== null && (
                            <div>
                              <span className="text-[9px] font-bold uppercase tracking-wider text-[#9C9890] block mb-0.5">Dispatch Amount</span>
                              <p className="font-black text-emerald-700 text-sm">₹{Number(info.stageAmount).toLocaleString("en-IN")}</p>
                            </div>
                          )}

                          {info.finances && (
                            <div className="col-span-2 grid grid-cols-2 gap-3 rounded-xl border border-purple-200 bg-white p-3 sm:grid-cols-3">
                              <div><span className="block text-[9px] font-bold uppercase text-slate-500">Notice Count × Rate</span><p className="font-black">{info.finances.noticeCount} × ₹{Number(info.finances.perNoticeRate).toLocaleString("en-IN")}</p></div>
                              <div><span className="block text-[9px] font-bold uppercase text-slate-500">Total Revenue</span><p className="font-black">₹{Number(info.finances.totalRevenue).toLocaleString("en-IN")}</p></div>
                              <div><span className="block text-[9px] font-bold uppercase text-slate-500">Officer Share</span><p className="font-black text-amber-700">{info.finances.noticeCount} × ₹{Number(info.finances.bankOfficerPerNotice).toLocaleString("en-IN")} = ₹{Number(info.finances.bankOfficerTotal).toLocaleString("en-IN")}</p></div>
                              <div><span className="block text-[9px] font-bold uppercase text-slate-500">Own Expenses</span><p className="font-black text-rose-700">₹{Number(info.finances.ownExpenses).toLocaleString("en-IN")}</p></div>
                              <div><span className="block text-[9px] font-bold uppercase text-slate-500">Dispatch Cost</span><p className="font-black text-rose-700">₹{Number(info.dispatchCost || 0).toLocaleString("en-IN")}</p></div>
                              <div><span className="block text-[9px] font-bold uppercase text-slate-500">Final GP</span><p className={`font-black ${Number(info.finalGrossProfit) >= 0 ? "text-emerald-700" : "text-rose-700"}`}>₹{Number(info.finalGrossProfit || 0).toLocaleString("en-IN")}</p></div>
                            </div>
                          )}

                          {info.callAt && (
                            <div>
                              <span className="text-[9px] font-bold uppercase tracking-wider text-[#9C9890] block mb-0.5">Call Date &amp; Time</span>
                              <p className="font-bold text-[#1C1C1A]">{info.callAt}</p>
                            </div>
                          )}

                          {info.pendingAmount !== undefined && info.pendingAmount !== null && (
                            <div>
                              <span className="text-[9px] font-bold uppercase tracking-wider text-[#9C9890] block mb-0.5">Total Pending Amount</span>
                              <p className="font-black text-rose-700 text-sm">₹{Number(info.pendingAmount).toLocaleString("en-IN")}</p>
                            </div>
                          )}
                        </div>

                        {/* Attachment Section */}
                        <div className="pt-2">
                          <span className="text-[9px] font-bold uppercase tracking-wider text-[#9C9890] block mb-1.5">Attached Document / Receipt</span>
                          {info.file || selectedEntryDetail.uploadedFileName ? (
                            <div className="flex items-center justify-between p-3.5 bg-[#FCFBF9] border border-[#E8E4DF] rounded-xl">
                              <div className="flex items-center gap-2">
                                <Paperclip className="w-4 h-4 text-[#1C1C1A] shrink-0" />
                                <span className="text-xs font-bold text-[#1C1C1A] truncate max-w-[220px]">{getFileNameOnly(info.file || selectedEntryDetail.uploadedFileName)}</span>
                              </div>

                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => openFilePreview((info.file || selectedEntryDetail.uploadedFileName)!)}
                                  className="px-3 py-1.5 bg-[#C9A84C] hover:bg-[#b8973b] text-white font-bold text-xs rounded-lg flex items-center gap-1 shadow-xs cursor-pointer transition-colors"
                                >
                                  <Eye className="w-3.5 h-3.5" /> Preview Document
                                </button>
                                <label className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg flex items-center gap-1 shadow-xs cursor-pointer transition-colors">
                                  <span>📤 Replace File</span>
                                  <input
                                    type="file"
                                    accept=".xlsx,.xls,.csv,.pdf,.doc,.docx,.png,.jpg,.jpeg,image/*"
                                    className="hidden"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file && selectedStageTab) handleStageFileUpload(selectedEntryDetail, selectedStageTab, file);
                                    }}
                                  />
                                </label>
                              </div>
                            </div>
                          ) : (
                            <div className="p-3.5 bg-[#FCFBF9] border border-[#E8E4DF] rounded-xl flex items-center justify-between">
                              <span className="text-xs text-slate-400 font-medium italic">No document file attached for this entry stage.</span>
                              <label className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg flex items-center gap-1 shadow-xs cursor-pointer transition-colors">
                                <span>📤 Upload Document</span>
                                <input
                                  type="file"
                                  accept=".xlsx,.xls,.csv,.pdf,.doc,.docx,.png,.jpg,.jpeg,image/*"
                                  className="hidden"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file && selectedStageTab) handleStageFileUpload(selectedEntryDetail, selectedStageTab, file);
                                  }}
                                />
                              </label>
                            </div>
                          )}
                        </div>

                        {/* Remarks Section */}
                        <div className="pt-2">
                          <span className="text-[9px] font-bold uppercase tracking-wider text-[#9C9890] block mb-1">Remarks &amp; Work Execution Notes</span>
                          <p className="w-full max-w-full min-w-0 whitespace-pre-wrap break-words [overflow-wrap:anywhere] text-xs font-medium text-[#1C1C1A] bg-[#FCFBF9] p-3.5 rounded-xl border border-[#E8E4DF] leading-relaxed">
                            {info.remarks || selectedEntryDetail.remarks || "No remarks provided."}
                          </p>
                        </div>
                      </div>
                    );
                  })()
                ) : (
                  <div className="text-center py-12 text-slate-400 font-bold text-xs">
                    Select a stage from the left panel to inspect details.
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-white border-t border-[#E8E4DF] flex items-center justify-between shrink-0">
              <button
                type="button"
                onClick={() => openNextStepModal(selectedEntryDetail)}
                className="px-4 py-2 bg-[#714B67] hover:bg-[#5F3F56] text-white rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95 transition-all"
              >
                <ArrowRight className="w-3.5 h-3.5" /> + Fill Next Stage Entry
              </button>
              <button
                type="button"
                onClick={() => setSelectedEntryDetail(null)}
                className="px-5 py-2 bg-[#C9A84C] hover:bg-[#b8973b] text-white rounded-xl text-xs font-bold cursor-pointer shadow-xs transition-all"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* File Preview Modal */}
      {selectedFilePreviewModal && createPortal(
        <div
          className="fixed inset-0 bg-black/60 z-[10000] flex items-center justify-center p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSelectedFilePreviewModal(null);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Attachment preview"
            className="bg-white rounded-2xl p-5 max-w-lg w-full space-y-4 shadow-2xl relative border border-[#E8E4DF] animate-scale-in"
          >
            <div className="flex justify-between items-center pb-2 border-b border-[#E8E4DF]">
              <h4 className="text-xs font-bold text-[#1C1C1A] uppercase tracking-wider flex items-center gap-1.5 truncate max-w-[85%]">
                📄 Attachment Preview: {selectedFilePreviewModal.fileName}
              </h4>
              <button
                type="button"
                onClick={() => setSelectedFilePreviewModal(null)}
                className="text-slate-400 hover:text-[#1C1C1A] font-bold text-sm px-2 py-0.5 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="min-h-[220px] max-h-[420px] overflow-auto flex flex-col items-center justify-center bg-[#FCFBF9] rounded-xl p-4 border border-[#E8E4DF] space-y-3">
              {(() => {
                const displayUrl = selectedFilePreviewModal.fileUrl || selectedFilePreviewModal.fileName;
                const isImage = selectedFilePreviewModal.fileName.match(/\.(png|jpg|jpeg|gif|webp|bmp|svg)$/i) || displayUrl.startsWith("data:image/");
                const isPdf = selectedFilePreviewModal.fileName.match(/\.(pdf)$/i) || displayUrl.includes(".pdf");

                if (previewFileError) {
                  return (
                    <div className="flex flex-col items-center justify-center text-center space-y-3 py-6">
                      <FileText className="w-12 h-12 text-amber-500 mx-auto" />
                      <p className="text-xs font-bold text-[#1C1C1A]">{selectedFilePreviewModal.fileName}</p>
                      <p className="text-[11px] text-amber-800 font-semibold bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg max-w-sm">
                        ⚠️ File "{selectedFilePreviewModal.fileName}" was missing on server. Select a file below to upload it.
                      </p>
                      {selectedEntryDetail && selectedStageTab && (
                        <label className="mt-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl flex items-center gap-2 cursor-pointer shadow-md transition-all active:scale-95">
                          <span>📤 Select &amp; Upload Document File</span>
                          <input
                            type="file"
                            accept=".xlsx,.xls,.csv,.pdf,.doc,.docx,.png,.jpg,.jpeg,image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file && selectedStageTab) {
                                setSelectedFilePreviewModal(null);
                                handleStageFileUpload(selectedEntryDetail, selectedStageTab, file);
                              }
                            }}
                          />
                        </label>
                      )}
                    </div>
                  );
                }

                if (isImage) {
                  return (
                    <img
                      src={displayUrl}
                      alt={selectedFilePreviewModal.fileName}
                      className="max-h-[360px] w-auto max-w-full object-contain rounded-lg shadow-md border border-slate-200"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        if (!target.dataset.retried && !displayUrl.startsWith("data:") && !displayUrl.startsWith("http")) {
                          target.dataset.retried = "true";
                          if (displayUrl.startsWith("/uploads/")) {
                            target.src = displayUrl.replace("/uploads/", "/hrms/");
                            return;
                          } else if (displayUrl.startsWith("/hrms/")) {
                            target.src = displayUrl.replace("/hrms/", "/uploads/");
                            return;
                          }
                        }
                        setPreviewFileError(true);
                      }}
                    />
                  );
                }

                if (isPdf) {
                  return (
                    <iframe
                      src={displayUrl}
                      className="w-full h-[360px] rounded-lg border border-slate-200"
                      title="PDF Preview"
                    />
                  );
                }

                return (
                  <div className="text-center py-6 space-y-2">
                    <FileText className="w-12 h-12 text-[#C9A84C] mx-auto" />
                    <p className="text-xs font-bold text-[#1C1C1A]">{selectedFilePreviewModal.fileName}</p>
                    <p className="text-[10px] text-[#5D5B57] font-medium">Document attached to this work entry stage.</p>
                  </div>
                );
              })()}

              <div className="img-fallback hidden flex-col items-center justify-center text-center space-y-2 py-4">
                <FileText className="w-10 h-10 text-[#C9A84C] mx-auto" />
                <p className="text-xs font-bold text-[#1C1C1A]">{selectedFilePreviewModal.fileName}</p>
                <p className="text-[10px] text-amber-700 font-semibold">Attached document file.</p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              {previewFileError ? (
                <button
                  type="button"
                  onClick={() => alert(`The attached document '${selectedFilePreviewModal.fileName}' is not available on the server.`)}
                  className="text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-3 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer"
                >
                  ⚠️ File Not Available On Server
                </button>
              ) : (
                <a
                  href={selectedFilePreviewModal.fileUrl || selectedFilePreviewModal.fileName}
                  target="_blank"
                  rel="noreferrer"
                  download={selectedFilePreviewModal.fileName}
                  className="text-xs font-bold text-[#714B67] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  ⬇️ Open / Download Document
                </a>
              )}
              <button
                type="button"
                onClick={() => setSelectedFilePreviewModal(null)}
                className="px-4 py-1.5 bg-[#C9A84C] hover:bg-[#b8973b] text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
