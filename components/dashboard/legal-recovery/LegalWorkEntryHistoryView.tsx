"use client";
import React, { useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import {
  Search, RefreshCw, FileText, Calendar, Building, User, Download, Filter,
  Layers, CheckCircle2, DollarSign, Briefcase, Landmark, Paperclip, Eye,
  ChevronDown, ChevronRight, ArrowRight, Clock, Award, ShieldCheck, Check, Trash2, Edit, Save, X, PhoneCall
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
  ],
  "New RC file case": [
    "FILE PREPARATION",
    "COLLECT DOCUMENTS FROM BANK",
    "DRAFT CASE",
    "SUBMIT FILE TO COURT",
    "PREPARE BILL (BILL BANWANA)",
    "REQUEST PAYMENT"
  ],
  "New PSSA": [
    "APPLICATION PREPARATION",
    "COLLECT DOCUMENTS",
    "DRAFT PSSA APPLICATION",
    "SUBMIT APPLICATION",
    "PREPARE BILL (BILL BANWANA)",
    "REQUEST PAYMENT"
  ],
  "138 case": [
    "NOTICE ISSUED",
    "CHEQUE BOUNCE COMPLAINT DRAFTING",
    "FILE COMPLAINT IN COURT",
    "OBTAIN SUMMONS",
    "PREPARE BILL (BILL BANWANA)",
    "REQUEST PAYMENT"
  ]
};

function getCategoryAndStages(category?: string, subCategory?: string): { category: string; stages: string[] } {
  const normCat = (category || "").trim().toUpperCase();
  const normSub = (subCategory || "").trim().toUpperCase();

  const catKeys = Object.keys(STAGE_DEFINITIONS);
  const matchedKey = catKeys.find(k => k.trim().toUpperCase() === normCat);

  // 1. If explicitly provided category matches a known stage definition, use it directly!
  if (matchedKey) {
    return { category: matchedKey, stages: STAGE_DEFINITIONS[matchedKey] };
  }

  // 2. If category is omitted or generic, infer from subCategory (check ADVOCATE NOTICE first for notice steps)
  if (normSub) {
    const advocateStages = STAGE_DEFINITIONS["ADVOCATE NOTICE"] || [];
    if (advocateStages.some(s => s.trim().toUpperCase() === normSub)) {
      return { category: "ADVOCATE NOTICE", stages: advocateStages };
    }

    for (const [catName, stgList] of Object.entries(STAGE_DEFINITIONS)) {
      if (catName === "Bill Follow Up") continue;
      const hasStage = stgList.some(s => s.trim().toUpperCase() === normSub);
      if (hasStage) {
        return { category: catName, stages: stgList };
      }
    }
  }

  const fallbackKey = "ADVOCATE NOTICE";
  return { category: fallbackKey, stages: STAGE_DEFINITIONS[fallbackKey] || STAGE_DEFINITIONS["ADVOCATE NOTICE"] };
}

export interface PaymentInstallment {
  id: string;
  installmentNo: number;
  paymentDate: string;
  amount: number;
  paymentMode: string;
  paymentRef?: string;
  personName?: string;
  paidBy?: string;
  uploadedFileName?: string;
  remarks?: string;
  createdAt: string;
}

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
  amount?: number | string;
  financialDetails?: string;
  broughtBy?: string;
  preparedBy?: string;
  printedBy?: string;
  dispatchedBy?: string;
  billDate?: string;
  billAmount?: string;
  billNo?: string;
  personName?: string;
  paidBy?: string;
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

const SearchableDropdown = ({
  value,
  onChange,
  options,
  placeholder,
  required,
  className
}: {
  value: string;
  onChange: (val: string) => void;
  options: string[];
  placeholder?: string;
  required?: boolean;
  className?: string;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const uniqueOptions = useMemo(() => {
    const map = new Map<string, string>();
    (options || []).forEach((opt) => {
      if (!opt || !opt.trim()) return;
      const key = opt.trim().toLowerCase();
      if (!map.has(key)) map.set(key, opt.trim());
    });
    return Array.from(map.values()).sort((a, b) => a.localeCompare(b));
  }, [options]);

  const filtered = useMemo(() => {
    if (!value || !value.trim()) return uniqueOptions;
    const q = value.toLowerCase().trim();
    return uniqueOptions.filter(item => item.toLowerCase().includes(q));
  }, [uniqueOptions, value]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={wrapperRef} className="relative w-full">
      <input
        type="text"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        placeholder={placeholder || "Search or select..."}
        required={required}
        className={className || "w-full border border-slate-250 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-800 bg-white focus:outline-none focus:border-[#714B67] shadow-2xs"}
      />
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-[10010] max-h-48 overflow-y-auto bg-white rounded-xl border border-slate-200 shadow-xl py-1 text-xs font-semibold text-slate-800">
          {filtered.length > 0 ? (
            filtered.map((item, idx) => (
              <div
                key={idx}
                onClick={() => {
                  onChange(item);
                  setIsOpen(false);
                }}
                className="flex items-center gap-2 px-3 py-1.5 hover:bg-purple-50 cursor-pointer border-b border-slate-100 last:border-0 transition-colors"
              >
                <span className="font-bold text-slate-800 truncate">{item}</span>
              </div>
            ))
          ) : (
            <div className="px-3 py-2 text-[11px] font-medium italic text-slate-400">
              No matching option found.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const SearchableEmployeeInput = ({
  value,
  onChange,
  placeholder,
  required,
  employees,
  className,
}: {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  required?: boolean;
  employees: string[];
  className?: string;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Clean & deduplicate names (case-insensitive deduplication)
  const uniqueNames = useMemo(() => {
    const map = new Map<string, string>();
    (employees || []).forEach((emp) => {
      if (!emp || !emp.trim()) return;
      const key = emp.trim().toLowerCase();
      if (!map.has(key)) {
        map.set(key, emp.trim());
      }
    });
    return Array.from(map.values()).sort((a, b) => a.localeCompare(b));
  }, [employees]);

  // Filter based on input value
  const filtered = useMemo(() => {
    if (!value || !value.trim()) return uniqueNames;
    const q = value.toLowerCase().trim();
    return uniqueNames.filter((name) => name.toLowerCase().includes(q));
  }, [uniqueNames, value]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={wrapperRef} className="relative w-full">
      <input
        type="text"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        placeholder={placeholder || "Search or select staff..."}
        required={required}
        className={
          className ||
          "w-full border border-slate-250 rounded-lg px-3 py-2 text-xs font-bold text-slate-800 bg-white focus:outline-none focus:border-purple-600 shadow-2xs"
        }
      />

      {isOpen && (
        <div className="absolute left-0 top-full mt-1.5 z-[100] min-w-full w-max max-w-[280px] max-h-52 overflow-y-auto bg-white rounded-xl border border-slate-200 shadow-xl py-1 text-xs font-semibold text-slate-800 animate-in fade-in slide-in-from-top-1 duration-150">
          {filtered.length > 0 ? (
            filtered.map((name, idx) => {
              const initial = name.trim().charAt(0).toUpperCase();
              return (
                <div
                  key={idx}
                  onClick={() => {
                    onChange(name);
                    setIsOpen(false);
                  }}
                  className="flex items-center gap-2.5 px-3 py-2 hover:bg-purple-50 cursor-pointer border-b border-slate-100 last:border-0 transition-colors whitespace-nowrap"
                >
                  <div className="w-5.5 h-5.5 rounded-full bg-purple-100 text-purple-700 font-bold text-[10px] flex items-center justify-center shrink-0 shadow-2xs">
                    {initial}
                  </div>
                  <span className="font-bold text-slate-800 text-xs">{name}</span>
                </div>
              );
            })
          ) : (
            <div className="px-3 py-2 text-[11px] font-medium italic text-slate-400">
              No matching employee found.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default function LegalWorkEntryHistoryView({
  userRole,
  triggerToast
}: {
  userRole?: string;
  triggerToast?: (msg: string) => void;
}) {
  const [logs, setLogs] = useState<LegalWorkLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [employeesList, setEmployeesList] = useState<any[]>([]);

  useEffect(() => {
    const fetchEmps = async () => {
      try {
        const res = await fetch("/api/employees?all=true");
        const data = await res.json();
        if (res.ok && data.success) {
          setEmployeesList(data.data || []);
        }
      } catch (e) {
        console.error("Error fetching employees:", e);
      }
    };
    fetchEmps();
  }, []);

  const employeeOptions = useMemo(() => {
    const names = new Set<string>();
    employeesList.forEach((e: any) => {
      const st = String(e.status || e.employeeStatus || e.employmentStatus || "").trim().toLowerCase();
      if (st === "inactive" || st === "resigned" || st === "terminated" || st === "0" || st === "false" || e.isActive === false) {
        return;
      }
      const n = e.name || e.employeeName || ([e.firstName, e.lastName].filter(Boolean).join(" "));
      if (n && n.trim()) {
        names.add(n.trim());
      }
    });
    return Array.from(names).filter(Boolean).sort((a, b) => a.localeCompare(b));
  }, [employeesList]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBank, setSelectedBank] = useState("ALL");
  const [showBanksModal, setShowBanksModal] = useState(false);
  const [selectedOption, setSelectedOption] = useState("ALL");
  const [dateFilter, setDateFilter] = useState("");
  const [showOnlyReceivedFilter, setShowOnlyReceivedFilter] = useState(false);
  const [columnFilters, setColumnFilters] = useState<Record<string, string[]>>({
    staff: [], bank: [], work: [], count: [], amount: [], execution: []
  });
  const [activeColumnFilter, setActiveColumnFilter] = useState<string | null>(null);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedBank, selectedOption, dateFilter, showOnlyReceivedFilter, columnFilters]);

  const [banksList, setBanksList] = useState<any[]>([]);
  const [branchesList, setBranchesList] = useState<any[]>([]);
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
  const [editRate, setEditRate] = useState("");
  const [editAllocationDate, setEditAllocationDate] = useState("");
  const [editOfficerShare, setEditOfficerShare] = useState("");
  const [editBillDate, setEditBillDate] = useState("");
  const [editBillAmount, setEditBillAmount] = useState("");
  const [editBillNo, setEditBillNo] = useState("");
  const [editCallDate, setEditCallDate] = useState("");
  const [editCallTime, setEditCallTime] = useState("");
  const [editContactedPerson, setEditContactedPerson] = useState("");
  const [editRemarks, setEditRemarks] = useState("");
  const [editPaymentTotalDue, setEditPaymentTotalDue] = useState("");
  const [editPaymentReceivedAmt, setEditPaymentReceivedAmt] = useState("");
  const [editPaymentMode, setEditPaymentMode] = useState("NEFT / RTGS / Bank Transfer");
  const [editPaymentRef, setEditPaymentRef] = useState("");
  const [editPaidBy, setEditPaidBy] = useState("");

  const getPaymentRefInfo = (mode: string) => {
    const m = (mode || "").toLowerCase();
    if (m.includes("cheque") && !m.includes("banker")) {
      return { label: "Cheque No. *", placeholder: "Enter Cheque No. (e.g. 004921)", required: true };
    }
    if (m.includes("upi") || m.includes("online")) {
      return { label: "UPI Ref / Transaction ID *", placeholder: "Enter UPI Ref / Txn ID", required: true };
    }
    if (m.includes("neft") || m.includes("rtgs") || m.includes("transfer")) {
      return { label: "UTR No. / Bank Ref *", placeholder: "Enter UTR No. (e.g. UTR991823)", required: true };
    }
    if (m.includes("dd") || m.includes("banker")) {
      return { label: "Demand Draft (DD) No. *", placeholder: "Enter DD Number", required: true };
    }
    return { label: "Reference / Receipt No. (Optional)", placeholder: "Enter ref or receipt details...", required: false };
  };

  // State variables for Adding Payment Installment Modal
  const [installmentModalLog, setInstallmentModalLog] = useState<{ logItem: LegalWorkLogItem; targetStage: string } | null>(null);
  const [instDate, setInstDate] = useState(new Date().toISOString().split('T')[0]);
  const [instAmount, setInstAmount] = useState("");
  const [instMode, setInstMode] = useState("NEFT / RTGS / Bank Transfer");
  const [instOtherMode, setInstOtherMode] = useState("");
  const [instRef, setInstRef] = useState("");
  const [instPersonName, setInstPersonName] = useState("");
  const [instPaidBy, setInstPaidBy] = useState("");
  const [instUploadedFileName, setInstUploadedFileName] = useState("");
  const [instUploadedFileUrl, setInstUploadedFileUrl] = useState("");
  const [instRemarks, setInstRemarks] = useState("");
  const [submittingInstallment, setSubmittingInstallment] = useState(false);

  const openAddInstallmentModal = (logItem: LegalWorkLogItem, targetStage: string = "REQUEST PAYMENT") => {
    const groupLogs = logItem.allLogs && logItem.allLogs.length > 0 ? logItem.allLogs : [logItem];
    const targetLog = groupLogs.find(l => (l.businessDevSubOption || l.subCategory || "").trim().toUpperCase() === targetStage.trim().toUpperCase()) || logItem;

    const finances = parseFollowUpDetails(targetLog.financialDetails);
    const installments: PaymentInstallment[] = Array.isArray(finances?.paymentInstallments) ? finances.paymentInstallments : [];

    const totalBill = Number(finances?.totalBillAmount || targetLog.billAmount || targetLog.stageAmount || 0);
    const sumInst = installments.length > 0
      ? installments.reduce((acc, i) => acc + (Number(i.amount) || 0), 0)
      : Number(finances?.receivedAmount || targetLog.billAmount || targetLog.stageAmount || 0);

    const pending = Math.max(0, totalBill - sumInst);

    setInstDate(new Date().toISOString().split('T')[0]);
    setInstAmount(pending > 0 ? String(pending) : "");
    setInstMode("NEFT / RTGS / Bank Transfer");
    setInstOtherMode("");
    setInstRef("");
    setInstPersonName("");
    setInstUploadedFileName("");
    setInstUploadedFileUrl("");
    setInstRemarks("");
    setInstallmentModalLog({ logItem, targetStage });
  };

  const handleInstallmentFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setInstUploadedFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) setInstUploadedFileUrl(event.target.result as string);
    };
    reader.readAsDataURL(file);

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
        setInstUploadedFileUrl(data.url);
      }
    } catch (err) {
      console.warn("Installment file upload warning:", err);
    }
  };

  const handleSaveInstallment = async () => {
    if (!installmentModalLog) return;
    const { logItem, targetStage } = installmentModalLog;
    const groupLogs = logItem.allLogs && logItem.allLogs.length > 0 ? logItem.allLogs : [logItem];
    const targetLog = groupLogs.find(l => (l.businessDevSubOption || l.subCategory || "").trim().toUpperCase() === targetStage.trim().toUpperCase()) || logItem;

    if (!instAmount || Number(instAmount) <= 0) {
      alert("Please enter a valid payment installment amount.");
      return;
    }

    setSubmittingInstallment(true);
    try {
      const existingFin = parseFollowUpDetails(targetLog.financialDetails) || {};
      let existingInstallments: PaymentInstallment[] = Array.isArray(existingFin.paymentInstallments) ? [...existingFin.paymentInstallments] : [];

      // If existingInstallments is empty, but there was a previous single payment recorded, preserve it as Installment #1!
      if (existingInstallments.length === 0) {
        const firstAmt = Number(existingFin.receivedAmount || targetLog.billAmount || targetLog.stageAmount || 0);
        if (firstAmt > 0) {
          existingInstallments.push({
            id: "inst_1_" + Date.now(),
            installmentNo: 1,
            paymentDate: targetLog.allocationDate || (targetLog.workDate ? new Date(targetLog.workDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]),
            amount: firstAmt,
            paymentMode: existingFin.paymentMode || "NEFT / RTGS / Bank Transfer",
            paymentRef: existingFin.paymentRef || "",
            personName: targetLog.personName || "",
            uploadedFileName: targetLog.uploadedFileName || "",
            remarks: "Initial Payment Received",
            createdAt: targetLog.createdAt || new Date().toISOString()
          });
        }
      }

      const effectiveMode = instMode === "Other" ? (instOtherMode.trim() || "Other") : instMode;

      const newInst: PaymentInstallment = {
        id: "inst_" + Date.now(),
        installmentNo: existingInstallments.length + 1,
        paymentDate: instDate || new Date().toISOString().split('T')[0],
        amount: Number(instAmount),
        paymentMode: effectiveMode,
        paymentRef: instRef,
        personName: instPersonName,
        paidBy: instPaidBy,
        uploadedFileName: instUploadedFileUrl || instUploadedFileName || "",
        remarks: instRemarks,
        createdAt: new Date().toISOString()
      };

      const updatedInstallments = [...existingInstallments, newInst];
      const totalBill = Number(existingFin.totalBillAmount || targetLog.billAmount || targetLog.stageAmount || 0);
      const totalRec = updatedInstallments.reduce((acc, i) => acc + (Number(i.amount) || 0), 0);
      const newPending = Math.max(0, totalBill - totalRec);

      const updatedFin = {
        ...existingFin,
        totalBillAmount: totalBill,
        receivedAmount: totalRec,
        pendingAmount: newPending,
        paymentStatus: newPending === 0 ? "Fully Paid" : "Partially Received",
        paymentInstallments: updatedInstallments
      };

      const isNotice = String(targetLog.id).startsWith("notice_");
      const realId = isNotice ? String(targetLog.id).replace("notice_", "") : targetLog.id;
      const endpoint = isNotice ? "/api/legal-recovery/notices" : "/api/legal-recovery/work-log";

      const payload = isNotice
        ? { id: realId, billAmount: totalBill, handoverRemarks: targetLog.remarks }
        : {
          id: realId,
          financialDetails: JSON.stringify(updatedFin),
          stageAmount: totalRec,
          billAmount: totalBill
        };

      const res = await fetch(endpoint, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok && (data.success || data.id || data.data)) {
        if (triggerToast) triggerToast(`Payment installment of ₹${Number(instAmount).toLocaleString("en-IN")} added successfully!`);
        await fetchWorkLogHistory();
        setInstallmentModalLog(null);
      } else {
        alert(data.error || "Failed to add payment installment");
      }
    } catch (err: any) {
      alert("Error adding installment: " + err.message);
    } finally {
      setSubmittingInstallment(false);
    }
  };

  const handleDeleteInstallment = async (item: LegalWorkLogItem, targetStage: string, instId: string) => {
    if (!window.confirm("Are you sure you want to remove this payment installment entry?")) return;
    const groupLogs = item.allLogs && item.allLogs.length > 0 ? item.allLogs : [item];
    const targetLog = groupLogs.find(l => (l.businessDevSubOption || l.subCategory || "").trim().toUpperCase() === targetStage.trim().toUpperCase()) || item;

    try {
      const existingFin = parseFollowUpDetails(targetLog.financialDetails) || {};
      const existingInstallments: PaymentInstallment[] = Array.isArray(existingFin.paymentInstallments) ? existingFin.paymentInstallments : [];
      const updatedInstallments = existingInstallments.filter(i => i.id !== instId);

      const totalBill = Number(existingFin.totalBillAmount || targetLog.billAmount || targetLog.stageAmount || 0);
      const totalRec = updatedInstallments.reduce((acc, i) => acc + (Number(i.amount) || 0), 0);
      const newPending = Math.max(0, totalBill - totalRec);

      const updatedFin = {
        ...existingFin,
        totalBillAmount: totalBill,
        receivedAmount: totalRec,
        pendingAmount: newPending,
        paymentStatus: newPending === 0 ? "Fully Paid" : "Partially Received",
        paymentInstallments: updatedInstallments
      };

      const isNotice = String(targetLog.id).startsWith("notice_");
      const realId = isNotice ? String(targetLog.id).replace("notice_", "") : targetLog.id;
      const endpoint = isNotice ? "/api/legal-recovery/notices" : "/api/legal-recovery/work-log";

      const res = await fetch(endpoint, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: realId,
          financialDetails: JSON.stringify(updatedFin),
          stageAmount: totalRec,
          billAmount: totalBill
        })
      });

      const data = await res.json();
      if (res.ok && (data.success || data.id || data.data)) {
        if (triggerToast) triggerToast("Installment deleted successfully!");
        await fetchWorkLogHistory();
      } else {
        alert(data.error || "Failed to delete installment");
      }
    } catch (err: any) {
      alert("Error deleting installment: " + err.message);
    }
  };
  const [editUploadedFileName, setEditUploadedFileName] = useState("");
  const [editUploadedFileUrl, setEditUploadedFileUrl] = useState("");
  const [isUploadingEditFile, setIsUploadingEditFile] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);

  const handleEditFileUpload = async (file: File) => {
    if (!file) return;
    setIsUploadingEditFile(true);
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
        setEditUploadedFileName(data.url);
      } else {
        const reader = new FileReader();
        reader.onload = (e) => {
          if (e.target?.result) setEditUploadedFileName(e.target.result as string);
        };
        reader.readAsDataURL(file);
      }
    } catch (err) {
      console.warn("Edit file upload error:", err);
    } finally {
      setIsUploadingEditFile(false);
    }
  };

  const handleEditSubOptionChange = (newSub: string) => {
    setEditSubOption(newSub);
    if (!editEntry) return;
    const groupLogs = editEntry.allLogs && editEntry.allLogs.length > 0 ? editEntry.allLogs : [editEntry];
    const targetLog = groupLogs.find(l => (l.businessDevSubOption || l.subCategory || "").trim().toUpperCase() === newSub.trim().toUpperCase());

    if (targetLog) {
      if (targetLog.noOfCount) setEditCount(targetLog.noOfCount);
      if (targetLog.broughtBy) setEditBroughtBy(targetLog.broughtBy);
      if (targetLog.preparedBy) setEditPreparedBy(targetLog.preparedBy);
      if (targetLog.printedBy) setEditPrintedBy(targetLog.printedBy);
      if (targetLog.dispatchedBy) setEditDispatchedBy(targetLog.dispatchedBy);
      if (targetLog.personName) setEditPersonName(targetLog.personName);
      if (targetLog.billDate) setEditBillDate(targetLog.billDate);
      if (targetLog.billAmount) setEditBillAmount(targetLog.billAmount);
      if (targetLog.billNo) setEditBillNo(targetLog.billNo);
      if (targetLog.finalRate) setEditRate(targetLog.finalRate);
      if (targetLog.remarks) setEditRemarks(targetLog.remarks);
      setEditUploadedFileName(targetLog.uploadedFileName || (newSub === "TAKE NOTICE ASSIGNMENT" ? (editEntry.uploadedFileName || editEntry.rawNotice?.handoverReceiptUrl || "") : ""));
    } else {
      setEditUploadedFileName(newSub === "TAKE NOTICE ASSIGNMENT" ? (editEntry.uploadedFileName || editEntry.rawNotice?.handoverReceiptUrl || "") : "");
    }
  };

  // Accordion Expand State for Table Rows & Stages
  const [expandedRowKeys, setExpandedRowKeys] = useState<Set<string>>(new Set());
  const [activeNestedStage, setActiveNestedStage] = useState<Record<string, string | null>>({});

  const toggleRowExpand = (id: string | number) => {
    const key = String(id);
    setExpandedRowKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

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
  const [nextStepPaidBy, setNextStepPaidBy] = useState("");
  const [nextStepPaymentTotalDue, setNextStepPaymentTotalDue] = useState("");
  const [nextStepPaymentReceivedAmt, setNextStepPaymentReceivedAmt] = useState("");
  const [nextStepPaymentMode, setNextStepPaymentMode] = useState("NEFT / RTGS / Bank Transfer");
  const [nextStepPaymentRef, setNextStepPaymentRef] = useState("");
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
        if (isNotice) {
          await fetch("/api/legal-recovery/notices", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: realId,
              handoverReceiptUrl: fileUrlToSave,
              documentUrl: fileUrlToSave,
              handoverReceiptPhoto: fileUrlToSave
            }),
          });
        }

        const updateRes = await fetch("/api/legal-recovery/work-log", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: realId, uploadedFileName: fileUrlToSave }),
        });

        const updateData = await updateRes.json();
        if (updateRes.ok || updateData.success) {
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

      setBanksList(banksList);
      setBranchesList(branchesList);

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
          .filter((item: LegalWorkLogItem) => {
            // Include ALL legal-notice-related logs regardless of typeOfWork label
            const opt = (item.businessDevOption || "").toUpperCase();
            const sub = (item.businessDevSubOption || item.subCategory || "").toUpperCase();
            const noticeKeywords = ["ADVOCATE", "NOTICE", "DISPATCH", "PREPARE BILL", "REQUEST PAYMENT", "COLLECT NOTICE", "PREPARE NOTICE", "GENERATE NOTICE", "TAKE NOTICE"];
            const isNoticeRelated = noticeKeywords.some(k => opt.includes(k) || sub.includes(k));
            return item.typeOfWork === "Bank Related" || !!item.businessDevOption || isNoticeRelated;
          })
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
            uploadedFileName: n.handoverReceiptUrl || n.documentUrl || n.billingAttachments || n.handoverReceiptPhoto || undefined,
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

        const rawCat = (item.businessDevOption || item.category || "").trim();
        const rawSub = (item.businessDevSubOption || item.subCategory || "").trim().toUpperCase();

        let catKey = "";
        if (rawSub === "BILL FOLLOW UP") {
          // If explicit category option was saved with follow up (e.g. ADVOCATE NOTICE or RACO RODA), use it!
          if (rawCat && rawCat !== "Bill Follow Up" && rawCat !== "Business Development") {
            const { category: mCat } = getCategoryAndStages(rawCat, "");
            catKey = mCat.toLowerCase().trim();
          } else {
            // Find matching case item for this bank and branch
            const matchingItem = combined.find(i =>
              (i.bankName || "").toLowerCase().trim() === bKey &&
              (i.branchName || "").toLowerCase().trim() === brKey &&
              i.businessDevOption &&
              i.businessDevOption !== "Business Development" &&
              i.businessDevOption !== "Bill Follow Up"
            );
            if (matchingItem) {
              const { category: mCat } = getCategoryAndStages(matchingItem.businessDevOption || matchingItem.category, matchingItem.businessDevSubOption || matchingItem.subCategory);
              catKey = mCat.toLowerCase().trim();
            } else {
              catKey = "advocate notice";
            }
          }
        } else {
          const { category: resolvedCat } = getCategoryAndStages(rawCat, rawSub);
          catKey = resolvedCat.toLowerCase().trim();
        }

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

        // Find primary case item (prefer notice or log with explicit notice category, e.g. ADVOCATE NOTICE)
        const primaryItem = groupItems.find(i => i.rawNotice) ||
          groupItems.find(i => i.businessDevOption && i.businessDevOption !== "Business Development" && i.businessDevOption !== "Bill Follow Up") ||
          groupItems.find(i => (i.category || "") !== "Bill Follow Up") ||
          groupItems[0];

        const { category: catName, stages } = getCategoryAndStages(
          primaryItem.businessDevOption || primaryItem.category,
          primaryItem.businessDevSubOption || primaryItem.subCategory
        );

        const latestItem = groupItems[groupItems.length - 1];

        const mergedBroughtBy = groupItems.map(i => i.broughtBy).filter(Boolean).pop() || latestItem.broughtBy;
        const mergedPreparedBy = groupItems.map(i => i.preparedBy).filter(Boolean).pop() || latestItem.preparedBy;
        const mergedPrintedBy = groupItems.map(i => i.printedBy).filter(Boolean).pop() || latestItem.printedBy;
        const mergedDispatchedBy = groupItems.map(i => i.dispatchedBy).filter(Boolean).pop() || latestItem.dispatchedBy;
        const prepareBillLog = groupItems.find(i => (i.businessDevSubOption || i.subCategory || "").toUpperCase().includes("PREPARE BILL"));
        const mergedBillNo = prepareBillLog?.billNo || groupItems.map(i => i.billNo).filter(Boolean).pop() || latestItem.billNo;
        const mergedBillDate = prepareBillLog?.billDate || groupItems.map(i => i.billDate).filter(Boolean).pop() || latestItem.billDate;
        const mergedBillAmount = prepareBillLog?.billAmount || groupItems.map(i => i.billAmount).filter(Boolean).pop() || latestItem.billAmount;
        const mergedPersonName = groupItems.map(i => i.personName).filter(Boolean).pop() || latestItem.personName;
        const mergedUploadedFile = groupItems.filter(i => !i.rawNotice).map(i => i.uploadedFileName).filter(Boolean).pop();
        const mergedRate = groupItems.map(i => i.finalRate).filter(Boolean).pop() || latestItem.finalRate;
        const mergedExpenses = groupItems.map(i => i.expenses || i.ownExpense).filter(Boolean).pop() || latestItem.expenses;

        let highestStage = primaryItem.businessDevSubOption || primaryItem.subCategory || stages[0];
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
          ...primaryItem,
          id: primaryItem.id || latestItem.id,
          workDate: latestItem.workDate || primaryItem.workDate,
          businessDevOption: primaryItem.businessDevOption || primaryItem.category || "ADVOCATE NOTICE",
          category: primaryItem.category || primaryItem.businessDevOption || "ADVOCATE NOTICE",
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

  const getItemReceivedAmount = (curr: LegalWorkLogItem) => {
    const groupLogs = curr.allLogs && curr.allLogs.length > 0 ? curr.allLogs : [curr];

    for (const log of groupLogs) {
      const subName = (log.businessDevSubOption || log.subCategory || "").trim().toUpperCase();
      const isPaymentStage = subName.includes("REQUEST PAYMENT") || subName.includes("PAYMENT RECEIVED");

      if (isPaymentStage) {
        const finances = parseFollowUpDetails(log.financialDetails);
        const recAmt = finances?.receivedAmount !== undefined && finances?.receivedAmount !== null
          ? Number(finances.receivedAmount)
          : Number(log.billAmount || log.stageAmount || 0);

        if (!isNaN(recAmt) && recAmt > 0) {
          return recAmt;
        }
      }
    }

    const finances = parseFollowUpDetails(curr.financialDetails);
    if (finances?.receivedAmount !== undefined && finances?.receivedAmount !== null) {
      const val = Number(finances.receivedAmount);
      if (!isNaN(val) && val > 0) return val;
    }

    const currSub = (curr.businessDevSubOption || curr.subCategory || "").trim().toUpperCase();
    if (currSub.includes("REQUEST PAYMENT") || currSub.includes("PAYMENT RECEIVED")) {
      const val = Number(curr.billAmount || curr.stageAmount || 0);
      if (!isNaN(val) && val > 0) return val;
    }

    return 0;
  };

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

      const targetBankNorm = (selectedBank || "ALL").trim().toLowerCase();
      const itemBankNorm = (item.bankName || "").trim().toLowerCase();
      const matchesBank = targetBankNorm === "all" ||
        itemBankNorm === targetBankNorm ||
        (targetBankNorm.length > 2 && (itemBankNorm.includes(targetBankNorm) || targetBankNorm.includes(itemBankNorm)));
      const primaryOpt = (item.businessDevOption || item.category || "").trim().toLowerCase();
      const matchesOption = selectedOption === "ALL" || primaryOpt === selectedOption.trim().toLowerCase();

      const itemDateStr = item.workDate ? new Date(item.workDate).toISOString().split('T')[0] : "";
      const matchesDate = !dateFilter || itemDateStr === dateFilter;
      const matchesColumns = Object.entries(columnFilters).every(([key, selected]) =>
        selected.length === 0 || selected.includes(getColumnValue(item, key))
      );

      const itemReceivedAmt = getItemReceivedAmount(item);
      const matchesReceivedFilter = !showOnlyReceivedFilter || itemReceivedAmt > 0;

      return matchesSearch && matchesBank && matchesOption && matchesDate && matchesColumns && matchesReceivedFilter;
    });
  }, [logs, searchQuery, selectedBank, selectedOption, dateFilter, columnFilters, showOnlyReceivedFilter]);

  const totalReceivedAmount = useMemo(() => {
    return filteredLogs.reduce((acc, curr) => acc + getItemReceivedAmount(curr), 0);
  }, [filteredLogs]);

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

  const uniqueBankDetails = useMemo(() => {
    const map = new Map<string, { bankName: string; count: number; totalQty: number; totalAmount: number; branches: Set<string> }>();
    logs.forEach(l => {
      const bName = l.bankName?.trim() || "Unknown Bank";
      if (!map.has(bName)) {
        map.set(bName, { bankName: bName, count: 0, totalQty: 0, totalAmount: 0, branches: new Set() });
      }
      const item = map.get(bName)!;
      item.count += 1;
      item.totalQty += parseInt(l.noOfCount || "1", 10) || 1;
      if (l.branchName) item.branches.add(l.branchName.trim());
      const amt = parseFloat(l.billAmount || l.stageAmount || "0") || 0;
      item.totalAmount += amt;
    });
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [logs]);

  const allBankNames = useMemo(() => {
    const set = new Set<string>();
    (banksList || []).forEach(b => { if (b.bankName) set.add(b.bankName); });
    (logs || []).forEach(l => { if (l.bankName) set.add(l.bankName); });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [banksList, logs]);

  const allBranchNamesForSelectedBank = useMemo(() => {
    const set = new Set<string>();
    const targetBank = (editBankName || "").toLowerCase().trim();

    if (targetBank) {
      // 1. Find bank object matching editBankName
      const bankObj = (banksList || []).find(b => (b.bankName || "").toLowerCase().trim() === targetBank);
      const bankIdStr = bankObj?.id !== undefined && bankObj?.id !== null ? String(bankObj.id) : null;

      // 2. Filter branchesList matching this bank (by bankName or bankId)
      (branchesList || []).forEach(br => {
        const brBankNameClean = (br.bankName || "").toLowerCase().trim();
        const brBankIdStr = br.bankId !== undefined && br.bankId !== null ? String(br.bankId) : null;
        if ((brBankNameClean && brBankNameClean === targetBank) || (bankIdStr && brBankIdStr && bankIdStr === brBankIdStr)) {
          if (br.branchName) set.add(br.branchName.trim());
          else if (br.branch) set.add(br.branch.trim());
        }
      });

      // 3. Filter logs matching editBankName
      (logs || []).forEach(l => {
        if ((l.bankName || "").toLowerCase().trim() === targetBank && l.branchName) {
          set.add(l.branchName.trim());
        }
      });
    }

    // Fallback if no bank selected or no specific branches found
    if (set.size === 0) {
      (branchesList || []).forEach(br => { if (br.branchName) set.add(br.branchName.trim()); });
      (logs || []).forEach(l => { if (l.branchName) set.add(l.branchName.trim()); });
    }

    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [branchesList, banksList, logs, editBankName]);

  const totalCounts = useMemo(() => {
    return filteredLogs.reduce((acc, curr) => acc + (parseInt(curr.noOfCount || "1") || 1), 0);
  }, [filteredLogs]);

  const getItemAmount = (curr: LegalWorkLogItem) => {
    const finances = parseFollowUpDetails(curr.financialDetails);
    const groupLogs = curr.allLogs && curr.allLogs.length > 0 ? curr.allLogs : [curr];

    // 1. Explicit Bill Amount (e.g. ₹55,000 from PREPARE BILL or REQUEST PAYMENT)
    const billAmtStr = curr.billAmount || groupLogs.map(l => l.billAmount).filter(Boolean).pop();
    if (billAmtStr && !isNaN(parseFloat(billAmtStr)) && parseFloat(billAmtStr) > 0) {
      return parseFloat(billAmtStr);
    }

    // 2. Calculated Notice Revenue (Qty * Rate) + Dispatch Amount Cost
    const countVal = parseFloat(curr.noOfCount || "1") || 1;
    const rateStr = curr.finalRate || groupLogs.map(l => l.finalRate).filter(Boolean).pop();
    const rateVal = parseFloat(rateStr || "0") || 0;
    const calculatedNoticeRev = countVal * rateVal;

    const dispatchLog = groupLogs.find(l => (l.businessDevSubOption || l.subCategory || "").includes("DISPATCH"));
    const dispatchCost = parseFloat(dispatchLog?.stageAmount || "0") || 0;

    if (calculatedNoticeRev > 0 || dispatchCost > 0) {
      return calculatedNoticeRev + dispatchCost;
    }

    const amt = Number(
      curr.stageAmount ||
      finances?.totalRevenue ||
      curr.amount ||
      0
    );
    return isNaN(amt) ? 0 : amt;
  };

  const totalBillAmount = useMemo(() => {
    return filteredLogs.reduce((acc, curr) => acc + getItemAmount(curr), 0);
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

  const openEditEntry = (item: LegalWorkLogItem, targetStage?: string) => {
    setEditEntry(item);
    const groupLogs = item.allLogs && item.allLogs.length > 0 ? item.allLogs : [item];

    const stageLog = targetStage
      ? groupLogs.find(l => (l.businessDevSubOption || l.subCategory || "").trim().toUpperCase() === targetStage.trim().toUpperCase()) || item
      : item;

    const brought = stageLog.broughtBy || (stageLog === item ? item.broughtBy : "") || "";
    const prepared = stageLog.preparedBy || (stageLog === item ? item.preparedBy : "") || "";
    const printed = stageLog.printedBy || (stageLog === item ? item.printedBy : "") || "";
    const dispatched = stageLog.dispatchedBy || (stageLog === item ? item.dispatchedBy : "") || "";
    const bNo = stageLog.billNo || (stageLog === item ? item.billNo : "") || "";
    const bDate = stageLog.billDate || (stageLog === item ? item.billDate : "") || "";
    const bAmt = stageLog.billAmount || (stageLog === item ? item.billAmount : "") || "";
    const rVal = stageLog.finalRate || (stageLog === item ? item.finalRate : "") || "";
    const rem = stageLog.remarks || (stageLog === item ? item.remarks : "") || "";

    setEditWorkDate(stageLog.workDate ? new Date(stageLog.workDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
    setEditBankName(item.bankName || "");
    setEditBranchName(item.branchName || "");
    setEditOption(item.businessDevOption || item.category || "ADVOCATE NOTICE");
    setEditSubOption(targetStage || stageLog.businessDevSubOption || stageLog.subCategory || item.businessDevSubOption || "");
    setEditCount(stageLog.noOfCount || item.noOfCount || "1");
    setEditAllocationDate(stageLog.allocationDate || item.allocationDate || (item.workDate ? new Date(item.workDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]));
    const initialAmt = String(Number(stageLog.billAmount || stageLog.stageAmount || item.billAmount || item.stageAmount || parseFollowUpDetails(stageLog.financialDetails)?.totalRevenue || 0));
    setEditAmount(initialAmt);
    setEditPaymentTotalDue(bAmt || initialAmt || "");
    setEditPaymentReceivedAmt(bAmt || initialAmt || "");
    setEditPaymentMode("NEFT / RTGS / Bank Transfer");
    setEditPaymentRef("");
    setEditBroughtBy(brought);
    setEditPreparedBy(prepared);
    setEditPrintedBy(printed);
    setEditDispatchedBy(dispatched);
    setEditPersonName(stageLog.personName || item.personName || "");
    setEditPaidBy(stageLog.paidBy || parseFollowUpDetails(stageLog.financialDetails)?.paidBy || "");
    setEditOfficerContactNo(stageLog.officerContactNo || item.officerContactNo || "");
    setEditOwnExpense(String(stageLog.ownExpense || item.ownExpense || 0));
    setEditRate(rVal);
    setEditBillDate(bDate);
    setEditBillAmount(bAmt || initialAmt);
    setEditBillNo(bNo);
    setEditRemarks(rem);

    const currentFile = stageLog.uploadedFileName ||
      ((targetStage === "TAKE NOTICE ASSIGNMENT" || (!targetStage && (stageLog.businessDevSubOption || stageLog.subCategory) === "TAKE NOTICE ASSIGNMENT"))
        ? (item.rawNotice?.handoverReceiptUrl || item.rawNotice?.documentUrl || item.rawNotice?.billingAttachments || item.rawNotice?.handoverReceiptPhoto)
        : undefined);

    setEditUploadedFileName(currentFile || "");
    setEditUploadedFileUrl("");

    const logsToInspect = targetStage && stageLog !== item ? [stageLog] : groupLogs;
    logsToInspect.forEach(l => {
      if (l.financialDetails) {
        try {
          const fin = typeof l.financialDetails === "string" ? JSON.parse(l.financialDetails) : l.financialDetails;
          if (fin.perNoticeRate) setEditRate(String(fin.perNoticeRate));
          if (fin.bankOfficerPerNotice) setEditOfficerShare(String(fin.bankOfficerPerNotice));
          if (fin.ownExpenses) setEditOwnExpense(String(fin.ownExpenses));
          if (fin.totalBillAmount !== undefined) setEditPaymentTotalDue(String(fin.totalBillAmount));
          if (fin.receivedAmount !== undefined) setEditPaymentReceivedAmt(String(fin.receivedAmount));
          if (fin.paymentMode) setEditPaymentMode(fin.paymentMode);
          if (fin.paymentRef) setEditPaymentRef(fin.paymentRef);
        } catch (e) { }
      }
      if (l.followUpDetails) {
        try {
          const fol = typeof l.followUpDetails === "string" ? JSON.parse(l.followUpDetails) : l.followUpDetails;
          if (fol.callDate) setEditCallDate(fol.callDate);
          if (fol.callTime) setEditCallTime(fol.callTime);
          if (fol.contactedPerson) setEditContactedPerson(fol.contactedPerson);
        } catch (e) { }
      }
    });
  };

  const handleSaveEdit = async () => {
    if (!editEntry) return;
    setSavingEdit(true);
    try {
      const logsToUpdate = editEntry.allLogs && editEntry.allLogs.length > 0 ? editEntry.allLogs : [editEntry];

      for (const logItem of logsToUpdate) {
        const isNotice = String(logItem.id).startsWith("notice_");
        const realId = isNotice ? String(logItem.id).replace("notice_", "") : logItem.id;
        const isSelectedStage = (logItem.businessDevSubOption || logItem.subCategory || "").trim().toUpperCase() === editSubOption.trim().toUpperCase();

        const payload = isNotice
          ? {
            id: realId,
            bankName: editBankName,
            branchName: editBranchName,
            typeOfNotice: editOption,
            qty: Math.max(1, Number(editCount) || 1),
            billAmount: editBillAmount ? Number(editBillAmount) : (isSelectedStage ? Math.max(0, Number(editAmount) || 0) : logItem.billAmount),
            broughtBy: isSelectedStage ? (editBroughtBy || undefined) : logItem.broughtBy,
            noticeRenameBy: isSelectedStage ? (editPreparedBy || undefined) : (logItem.preparedBy || logItem.rawNotice?.noticeRenameBy),
            printedBy: isSelectedStage ? (editPrintedBy || undefined) : logItem.printedBy,
            dispatchedBy: isSelectedStage ? (editDispatchedBy || undefined) : logItem.dispatchedBy,
            handoverTo: isSelectedStage ? (editPersonName || undefined) : (logItem.personName || logItem.rawNotice?.handoverTo),
            handoverRemarks: isSelectedStage ? (editRemarks || undefined) : (logItem.remarks || logItem.rawNotice?.handoverRemarks),
            noticeDate: isSelectedStage ? editWorkDate : logItem.workDate,
            ...(isSelectedStage ? { handoverReceiptUrl: editUploadedFileName || null, documentUrl: editUploadedFileName || null } : {})
          }
          : {
            id: realId,
            workDate: isSelectedStage ? editWorkDate : logItem.workDate,
            allocationDate: editAllocationDate || undefined,
            bankName: editBankName,
            branchName: editBranchName,
            businessDevOption: editOption,
            businessDevSubOption: logItem.businessDevSubOption,
            noOfCount: editCount,
            finalRate: editRate || undefined,
            expenses: editOwnExpense ? editOwnExpense : undefined,
            financialDetails: editSubOption.includes("REQUEST PAYMENT") ? JSON.stringify({
              totalBillAmount: Number(editPaymentTotalDue || editBillAmount || editAmount) || 0,
              receivedAmount: Number(editPaymentReceivedAmt) || 0,
              pendingAmount: Math.max(0, (Number(editPaymentTotalDue || editBillAmount || editAmount) || 0) - (Number(editPaymentReceivedAmt) || 0)),
              paymentStatus: (Number(editPaymentReceivedAmt) || 0) < (Number(editPaymentTotalDue || editBillAmount || editAmount) || 0) ? "Partially Received" : "Fully Received",
              paymentMode: editPaymentMode || "NEFT / RTGS / Bank Transfer",
              paymentRef: editPaymentRef ? editPaymentRef.trim() : "",
              personName: editPersonName ? editPersonName.trim() : "",
              allocationDate: editAllocationDate
            }) : ((editOption === "ADVOCATE NOTICE" || editSubOption === "TAKE NOTICE ASSIGNMENT") ? JSON.stringify({
              noticeCount: Number(editCount) || 1,
              perNoticeRate: Number(editRate) || 0,
              bankOfficerPerNotice: Number(editOfficerShare) || 0,
              ownExpenses: Number(editOwnExpense) || 0,
              totalRevenue: (Number(editCount) || 1) * (Number(editRate) || 0)
            }) : undefined),
            stageAmount: isSelectedStage ? (editSubOption.includes("REQUEST PAYMENT") ? Number(editPaymentReceivedAmt || editAmount || 0) : Math.max(0, Number(editAmount) || 0)) : logItem.stageAmount,
            billDate: editBillDate || undefined,
            billAmount: editSubOption.includes("REQUEST PAYMENT") ? (editPaymentTotalDue || editBillAmount || undefined) : (editBillAmount || undefined),
            billNo: editBillNo || undefined,
            broughtBy: isSelectedStage ? (editBroughtBy || undefined) : logItem.broughtBy,
            preparedBy: isSelectedStage ? (editPreparedBy || undefined) : logItem.preparedBy,
            printedBy: isSelectedStage ? (editPrintedBy || undefined) : logItem.printedBy,
            dispatchedBy: isSelectedStage ? (editDispatchedBy || undefined) : logItem.dispatchedBy,
            personName: isSelectedStage ? (editPersonName || undefined) : logItem.personName,
            paidBy: isSelectedStage ? (editPaidBy || undefined) : logItem.paidBy,
            officerContactNo: editOfficerContactNo || undefined,
            ownExpense: Number(editOwnExpense) || 0,
            uploadedFileName: isSelectedStage ? (editUploadedFileName || null) : logItem.uploadedFileName,
            remarks: isSelectedStage ? (editRemarks || undefined) : logItem.remarks
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
      if (stageInfo.finances) {
        if (stageInfo.finances.totalBillAmount !== undefined) setNextStepPaymentTotalDue(String(stageInfo.finances.totalBillAmount));
        if (stageInfo.finances.receivedAmount !== undefined) setNextStepPaymentReceivedAmt(String(stageInfo.finances.receivedAmount));
        if (stageInfo.finances.paymentMode) setNextStepPaymentMode(stageInfo.finances.paymentMode);
        if (stageInfo.finances.paymentRef) setNextStepPaymentRef(stageInfo.finances.paymentRef);
        if (stageInfo.finances.paidBy) setNextStepPaidBy(stageInfo.finances.paidBy);
      } else {
        setNextStepPaymentTotalDue(stageInfo.billAmount || stageInfo.stageAmount || "0");
        setNextStepPaymentReceivedAmt(stageInfo.billAmount || stageInfo.stageAmount || "0");
      }
      setNextStepUploadedFileName(stageInfo.file || "");
      setNextStepUploadedFileUrl("");
      if (stageInfo.remarks) setNextStepRemarks(stageInfo.remarks);
    } else {
      setNextStepUploadedFileName("");
      setNextStepUploadedFileUrl("");
      setNextStepRemarks("");
      setNextStepPaymentTotalDue("");
      setNextStepPaymentReceivedAmt("");
      setNextStepPaymentRef("");
    }
  };

  const openNextStepModal = (item: LegalWorkLogItem) => {
    setNextStepEntry(item);
    setNextStepWorkDate(new Date().toISOString().split("T")[0]);
    setNextStepBankName(item.bankName || "");
    setNextStepBranchName(item.branchName || "");

    const rawCategoryKey = item.businessDevOption || item.category || "ADVOCATE NOTICE";
    const currentSub = item.businessDevSubOption || item.subCategory || "";
    const { category: resolvedCat, stages } = getCategoryAndStages(rawCategoryKey, currentSub);
    setNextStepOption(resolvedCat);

    const currentIndex = stages.indexOf(currentSub);
    const calculatedNext = (currentIndex >= 0 && currentIndex < stages.length - 1)
      ? stages[currentIndex + 1]
      : (stages[0] || "TAKE NOTICE ASSIGNMENT");

    setNextStepSubOption(calculatedNext);
    setNextStepCount(item.noOfCount || "1");

    // Auto-calculate bill / payment amount based on Notice Count * Rate + Dispatch Cost
    const groupLogs = item.allLogs && item.allLogs.length > 0 ? item.allLogs : [item];
    const existingBillAmt = item.billAmount || groupLogs.map(l => l.billAmount).filter(Boolean).pop();
    const countVal = parseFloat(item.noOfCount || "1") || 1;
    const rateVal = parseFloat(item.finalRate || groupLogs.map(l => l.finalRate).filter(Boolean).pop() || "0") || 0;
    const noticeRev = countVal * rateVal;
    const dispatchLog = groupLogs.find(l => (l.businessDevSubOption || l.subCategory || "").includes("DISPATCH"));
    const dispatchCost = parseFloat(dispatchLog?.stageAmount || "0") || 0;
    const autoAmount = existingBillAmt || (noticeRev + dispatchCost > 0 ? String(noticeRev + dispatchCost) : (item.stageAmount || "0"));

    setNextStepAmount(autoAmount);
    setNextStepPaymentTotalDue(autoAmount);
    setNextStepPaymentReceivedAmt(autoAmount);
    setNextStepPaymentMode("NEFT / RTGS / Bank Transfer");
    setNextStepPaymentRef("");
    setNextStepBroughtBy(item.broughtBy || item.employeeName || "");
    setNextStepPreparedBy(item.preparedBy || "");
    setNextStepPrintedBy(item.printedBy || "");
    setNextStepDispatchedBy(item.dispatchedBy || "");
    setNextStepBillDate(new Date().toISOString().split("T")[0]);
    setNextStepBillAmount(autoAmount);
    setNextStepBillNo(groupLogs.map(l => l.billNo).filter(Boolean).pop() || "");
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
      const isPaymentRequest = nextStepSubOption.includes("REQUEST PAYMENT");

      const assessmentCount = Math.max(0, parseInt(nextStepCount || "0", 10) || 0);
      const perNoticeRate = parseFloat(nextStepRate) || 0;
      const officerPerNotice = parseFloat(nextStepOfficerShare) || 0;
      const ownExpenses = parseFloat(nextStepExpenses) || 0;

      const parsedTotalDue = Number(nextStepPaymentTotalDue || nextStepBillAmount || nextStepAmount) || 0;
      const parsedReceived = Number(nextStepPaymentReceivedAmt) || 0;
      const pendingAmt = Math.max(0, parsedTotalDue - parsedReceived);

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
        broughtBy: (isBroughtByStep || nextStepOption !== "ADVOCATE NOTICE") ? (nextStepBroughtBy || undefined) : undefined,
        preparedBy: isPreparedByStep ? (nextStepPreparedBy || undefined) : undefined,
        printedBy: isPrintedByStep ? (nextStepPrintedBy || undefined) : undefined,
        dispatchedBy: isDispatchedByStep ? (nextStepDispatchedBy || undefined) : undefined,
        stageAmount: isPaymentRequest ? parsedReceived : (isDispatchedByStep ? nextStepAmount : (nextStepSubOption === "TAKE NOTICE ASSIGNMENT" ? String(assessmentCount * perNoticeRate) : undefined)),
        billDate: isBillPreparationStep ? (nextStepBillDate || undefined) : undefined,
        billAmount: isPaymentRequest ? (nextStepPaymentTotalDue || nextStepBillAmount || undefined) : (isBillPreparationStep ? (nextStepBillAmount || undefined) : undefined),
        billNo: isBillPreparationStep ? (nextStepBillNo || undefined) : undefined,
        personName: nextStepPersonName || undefined,
        finalRate: nextStepRate || undefined,
        bankOfficerPerNotice: isNoticeAssessment ? (nextStepOfficerShare || "0") : undefined,
        expenses: isNoticeAssessment ? (nextStepExpenses || "0") : undefined,
        financialDetails: isPaymentRequest
          ? JSON.stringify({
            totalBillAmount: parsedTotalDue,
            receivedAmount: parsedReceived,
            pendingAmount: pendingAmt,
            paymentStatus: parsedReceived < parsedTotalDue ? "Partially Received" : "Fully Received",
            paymentMode: nextStepPaymentMode || "NEFT / RTGS / Bank Transfer",
            paymentRef: nextStepPaymentRef ? nextStepPaymentRef.trim() : "",
            personName: nextStepPersonName ? nextStepPersonName.trim() : "",
            paidBy: nextStepPaidBy ? nextStepPaidBy.trim() : "",
            allocationDate: nextStepAllocationDate || nextStepWorkDate
          })
          : (isNoticeAssessment
            ? JSON.stringify({
              noticeCount: assessmentCount,
              perNoticeRate,
              bankOfficerPerNotice: officerPerNotice,
              ownExpenses,
            })
            : undefined),
        allocationDate: nextStepAllocationDate || nextStepWorkDate,
        uploadedFileName: nextStepUploadedFileUrl || nextStepUploadedFileName || undefined,
        remarks: nextStepRemarks ? nextStepRemarks.trim() : undefined
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
    // Case-insensitive, trimmed matching for stage logs from both Work Logs API and Notices API
    const targetStageNorm = stageName.trim().toUpperCase();
    const matchingLog = groupLogs.find(l => {
      const subNorm = (l.businessDevSubOption || l.subCategory || "").trim().toUpperCase();
      return subNorm === targetStageNorm || subNorm.includes(targetStageNorm) || targetStageNorm.includes(subNorm);
    });
    const n = entry.rawNotice;

    // isFilled: only true if there IS a real log entry for this specific stage
    // For rawNotice-based stages, only TAKE NOTICE ASSIGNMENT is auto-filled from notice data
    let isFilled = !!matchingLog;
    if (!isFilled && n) {
      if (stageName === "TAKE NOTICE ASSIGNMENT") isFilled = true;
      // All other stages require explicit work-log entries to be considered filled
    }

    // activeLog is ONLY the matching log for this specific stage, NOT the merged entry
    const activeLog = matchingLog || (isFilled && stageName === "TAKE NOTICE ASSIGNMENT" ? null : null);

    const followUp = activeLog ? parseFollowUpDetails(activeLog.followUpDetails) : null;
    const finances = activeLog ? parseFollowUpDetails(activeLog.financialDetails) : null;

    const relatedDispatch = (finances && activeLog)
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
        // For TAKE NOTICE ASSIGNMENT, use matchingLog if exists, else rawNotice data
        value: matchingLog?.broughtBy || n?.broughtBy || n?.createdBy,
      },
      "COLLECT NOTICE DATA": {
        label: "Brought By",
        value: matchingLog?.broughtBy,
      },
      "PREPARE NOTICE LIST": {
        label: "Prepared By",
        value: matchingLog?.preparedBy,
      },
      "GENERATE NOTICE VIA SOFTWARE/MAIL MERGE": {
        label: "Printed By",
        value: matchingLog?.printedBy,
      },
      "DISPATCH NOTICES": {
        label: "Dispatched By",
        value: matchingLog?.dispatchedBy,
      },
      "PREPARE BILL (BILL BANWANA)": {
        label: "Bill Prepared By",
        value: matchingLog?.broughtBy || matchingLog?.preparedBy,
      },
      "REQUEST PAYMENT": {
        label: "Person Name",
        value: matchingLog?.personName,
      },
      "BILL FOLLOW UP": {
        label: "Contacted Person",
        value: followUp?.contactedPerson,
      },
    };

    const stageStaff = stageStaffMap[stageName] || {
      label: "Work Completed By",
      value: matchingLog?.broughtBy || matchingLog?.personName || matchingLog?.employeeName || entry.broughtBy
    };

    // 1. Notice Count: Use entry's active notice count so all stage tabs consistently match the notice batch quantity
    const count = entry.noOfCount || matchingLog?.noOfCount || n?.qty?.toString() || "1";
    const date = matchingLog?.allocationDate || matchingLog?.workDate
      ? (matchingLog?.allocationDate || (matchingLog?.workDate ? new Date(matchingLog.workDate).toLocaleDateString("en-IN") : undefined))
      : (stageName === "TAKE NOTICE ASSIGNMENT" ? (n?.noticeOrderDate || n?.noticeDate || entry.allocationDate || 'N/A') : 'N/A');

    const prepareBillLog = groupLogs.find(l => (l.businessDevSubOption || l.subCategory || "").toUpperCase().includes("PREPARE BILL"));
    const billNo = matchingLog?.billNo || prepareBillLog?.billNo || (stageName === "PREPARE BILL (BILL BANWANA)" ? n?.billNo : undefined);
    const billDate = matchingLog?.billDate || prepareBillLog?.billDate || (stageName === "PREPARE BILL (BILL BANWANA)" ? n?.billDate : undefined);
    const billAmount = (stageName === "PREPARE BILL (BILL BANWANA)"
      ? (matchingLog?.billAmount || prepareBillLog?.billAmount || (n?.billAmount ? String(n.billAmount) : undefined) || (finances?.totalBillAmount ? String(finances.totalBillAmount) : undefined) || entry.billAmount)
      : (matchingLog?.billAmount || prepareBillLog?.billAmount));
    const finalRate = matchingLog?.finalRate || entry.finalRate;
    const expenses = matchingLog?.expenses || (stageName === "TAKE NOTICE ASSIGNMENT" ? entry.expenses : undefined);
    const grossProfit = matchingLog?.grossProfit || (stageName === "TAKE NOTICE ASSIGNMENT" ? entry.grossProfit : undefined);
    const stageAmount = matchingLog?.stageAmount !== undefined && matchingLog?.stageAmount !== null ? String(matchingLog.stageAmount) : undefined;

    // Helper: Extract clean file basename for robust file comparison
    const getBaseName = (str?: string) => {
      if (!str) return "";
      const parts = str.split("/");
      return parts[parts.length - 1].split("?")[0].trim().toLowerCase();
    };

    // 2. File: ONLY show if explicitly uploaded for this specific stage (matchingLog.uploadedFileName),
    // or if inspecting TAKE NOTICE ASSIGNMENT and notice handover receipt exists on rawNotice
    const matchingLogFile = matchingLog?.uploadedFileName;

    const dispatchLog = groupLogs.find(l => (l.businessDevSubOption || l.subCategory || "").toUpperCase().includes("DISPATCH"));
    const dispatchFileName = dispatchLog?.uploadedFileName ? getBaseName(dispatchLog.uploadedFileName) : "";

    let file: string | undefined = undefined;
    if (matchingLogFile && matchingLogFile.trim()) {
      const currentLogFileName = getBaseName(matchingLogFile);
      const isDispatchStage = stageName.trim().toUpperCase().includes("DISPATCH");
      // If current stage is NOT Dispatch Notices but its file matches dispatch notice file, ignore inherited dispatch file
      if (!isDispatchStage && dispatchFileName && currentLogFileName === dispatchFileName) {
        file = undefined;
      } else {
        file = matchingLogFile.trim();
      }
    } else if (stageName === "TAKE NOTICE ASSIGNMENT" && n) {
      file = n.handoverReceiptUrl || n.documentUrl || n.billingAttachments || n.handoverReceiptPhoto || undefined;
    }

    // 3. Remarks: Strip system tags ([Notice #...]) but PRESERVE actual user remarks! Filter out system placeholders like "Next step execution for..."
    const rawRemarks = matchingLog?.remarks || (stageName === "TAKE NOTICE ASSIGNMENT" ? (n?.handoverRemarks || entry.remarks) : undefined);
    let remarks: string | undefined = undefined;
    if (rawRemarks && typeof rawRemarks === "string") {
      const cleanText = rawRemarks.replace(/\[Notice\s*#\d+\]/gi, "").trim();
      const lower = cleanText.toLowerCase();
      const isSystemGenerated =
        cleanText.length === 0 ||
        lower.startsWith("next step execution for") ||
        lower.startsWith("notice board entry (");

      if (!isSystemGenerated) {
        remarks = cleanText;
      }
    }

    const isPaymentStage = stageName.trim().toUpperCase().includes("REQUEST PAYMENT") || stageName.trim().toUpperCase().includes("PAYMENT RECEIVED");
    let isPendingPayment = false;
    let pendingAmtVal = 0;
    let installments: PaymentInstallment[] = [];
    let totalBillVal = 0;
    let totalReceivedVal = 0;

    if (isPaymentStage && isFilled) {
      installments = Array.isArray(finances?.paymentInstallments) ? finances.paymentInstallments : [];
      totalBillVal = Number(finances?.totalBillAmount || matchingLog?.billAmount || matchingLog?.stageAmount || entry.billAmount || 0);

      if (installments.length > 0) {
        totalReceivedVal = installments.reduce((acc: number, inst: any) => acc + (Number(inst.amount) || 0), 0);
      } else {
        totalReceivedVal = Number(finances?.receivedAmount || matchingLog?.billAmount || matchingLog?.stageAmount || 0);
      }

      pendingAmtVal = Math.max(0, totalBillVal - totalReceivedVal);

      if (pendingAmtVal > 0 || finances?.paymentStatus === "Partially Received" || (installments.length > 0 && pendingAmtVal > 0)) {
        isPendingPayment = true;
      }
    }

    return {
      isFilled,
      isPendingPayment,
      pendingAmtVal,
      totalBillVal,
      totalReceivedVal,
      installments,
      matchingLog,
      staff: isFilled ? stageStaff?.value : undefined,
      staffLabel: stageStaff?.label || "Staff In-Charge",
      count,
      date: date || 'N/A',
      billNo: isFilled ? billNo : undefined,
      billDate: isFilled ? billDate : undefined,
      billAmount: isFilled ? billAmount : undefined,
      finalRate: isFilled ? finalRate : undefined,
      expenses: isFilled ? expenses : undefined,
      grossProfit: isFilled ? grossProfit : undefined,
      stageAmount: isFilled ? stageAmount : undefined,
      finances: isFilled ? finances : undefined,
      dispatchCost: isFilled ? dispatchCost : undefined,
      finalGrossProfit: isFilled ? finalGrossProfit : undefined,
      pendingAmount: isFilled ? followUp?.summary?.totalPendingAmount : undefined,
      callAt: isFilled ? (followUp?.callDate && followUp?.callTime ? `${followUp.callDate} ${followUp.callTime}` : followUp?.callDate) : undefined,
      file: isFilled ? file : undefined,
      remarks: isFilled ? remarks : undefined
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#E8E4DF] shadow-xs flex items-center gap-3">
          <div className="w-11 h-11 bg-[#FCFBF9] border border-[#E8E4DF] rounded-2xl flex items-center justify-center text-[#1C1C1A] shrink-0">
            <Calendar className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[9px] uppercase tracking-wider text-[#9C9890] font-bold truncate">Total History Records</p>
            <p className="text-xl font-semibold text-[#1C1C1A] mt-0.5">{filteredLogs.length}</p>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#E8E4DF] shadow-xs flex items-center gap-3">
          <div className="w-11 h-11 bg-[#FCFBF9] border border-[#E8E4DF] rounded-2xl flex items-center justify-center text-[#1C1C1A] shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[9px] uppercase tracking-wider text-[#9C9890] font-bold truncate">Total Work Count</p>
            <p className="text-xl font-semibold text-[#1C1C1A] mt-0.5">{totalCounts}</p>
          </div>
        </div>

        <div
          onClick={() => setShowBanksModal(true)}
          className="bg-white p-4 sm:p-5 rounded-2xl border border-[#E8E4DF] hover:border-[#C9A84C] shadow-xs flex items-center justify-between gap-2 cursor-pointer transition-all hover:shadow-md group"
          title="Click to view all unique banks & filter history table"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 bg-[#FCFBF9] group-hover:bg-amber-50 border border-[#E8E4DF] group-hover:border-amber-200 rounded-2xl flex items-center justify-center text-[#1C1C1A] group-hover:text-amber-800 transition-colors shrink-0">
              <Landmark className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[9px] uppercase tracking-wider text-[#9C9890] font-bold truncate">Unique Banks</p>
              <p className="text-xl font-semibold text-[#1C1C1A] mt-0.5">{uniqueBanks.length}</p>
            </div>
          </div>
          <span className="text-[8.5px] font-bold uppercase tracking-wider px-2 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-lg group-hover:bg-amber-600 group-hover:text-white transition-all shrink-0">
            View ➔
          </span>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#E8E4DF] shadow-xs flex items-center gap-3">
          <div className="w-11 h-11 bg-[#FCFBF9] border border-[#E8E4DF] rounded-2xl flex items-center justify-center text-purple-700 shrink-0">
            <DollarSign className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[9px] uppercase tracking-wider text-[#9C9890] font-bold truncate">Total Bill Amount</p>
            <p className="text-xl font-bold text-purple-900 mt-0.5 truncate">₹{totalBillAmount.toLocaleString('en-IN')}</p>
          </div>
        </div>

        <div
          onClick={() => setShowOnlyReceivedFilter(prev => !prev)}
          className={`p-4 sm:p-5 rounded-2xl border shadow-xs flex items-center justify-between gap-2 cursor-pointer transition-all hover:shadow-md group ${showOnlyReceivedFilter
            ? "bg-emerald-50/90 border-emerald-500 ring-2 ring-emerald-500/20"
            : "bg-white border-[#E8E4DF] hover:border-emerald-500"
            }`}
          title="Click to filter entries with complete or partial received payments"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-colors shrink-0 ${showOnlyReceivedFilter
              ? "bg-emerald-600 text-white"
              : "bg-emerald-50 group-hover:bg-emerald-600 text-emerald-700 group-hover:text-white border border-emerald-200"
              }`}>
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[9px] uppercase tracking-wider text-[#9C9890] font-bold truncate">Total Received Amount</p>
              <p className="text-xl font-black text-emerald-700 mt-0.5 truncate">₹{totalReceivedAmount.toLocaleString('en-IN')}</p>
            </div>
          </div>
          <span className={`text-[8.5px] font-black uppercase tracking-wider px-2 py-1 rounded-lg transition-all shrink-0 ${showOnlyReceivedFilter
            ? "bg-emerald-600 text-white shadow-2xs"
            : "bg-emerald-50 text-emerald-800 border border-emerald-200 group-hover:bg-emerald-600 group-hover:text-white"
            }`}>
            {showOnlyReceivedFilter ? "Active ✓" : "Filter ➔"}
          </span>
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

        {(searchQuery || selectedBank !== "ALL" || selectedOption !== "ALL" || dateFilter || showOnlyReceivedFilter || Object.values(columnFilters).some(values => values.length > 0)) && (
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs pt-2 border-t border-[#E8E4DF]">
            <div className="flex items-center gap-2">
              <span className="font-medium text-[#5D5B57]">
                Showing {filteredLogs.length} of {logs.length} entries
              </span>
              {showOnlyReceivedFilter && (
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold rounded-full text-[10px] flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Received Payments Only
                  <button type="button" onClick={() => setShowOnlyReceivedFilter(false)} className="ml-1 text-emerald-900 font-black hover:text-rose-700 cursor-pointer">✕</button>
                </span>
              )}
            </div>
            <button
              onClick={() => {
                setSearchQuery("");
                setSelectedBank("ALL");
                setSelectedOption("ALL");
                setDateFilter("");
                setShowOnlyReceivedFilter(false);
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
      {(() => {
        const totalPages = Math.max(1, Math.ceil(filteredLogs.length / itemsPerPage));
        const validCurrentPage = Math.min(currentPage, totalPages);
        const paginatedLogs = filteredLogs.slice((validCurrentPage - 1) * itemsPerPage, validCurrentPage * itemsPerPage);

        return (
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
                    {paginatedLogs.map(item => {
                      const rawCategoryOpt = item.businessDevOption || item.category || "ADVOCATE NOTICE";
                      const subOpt = item.businessDevSubOption || item.subCategory || "TAKE NOTICE ASSIGNMENT";
                      const { category: categoryOpt, stages } = getCategoryAndStages(rawCategoryOpt, subOpt);
                      const followUp = parseFollowUpDetails(item.followUpDetails);
                      const finances = parseFollowUpDetails(item.financialDetails);

                      const isExpanded = expandedRowKeys.has(String(item.id));
                      const stageInfos = stages.map(stg => getStageFilledDetails(item, stg));
                      const filledStagesCount = stageInfos.filter(s => s.isFilled).length;
                      const fullyCompletedCount = stageInfos.filter(s => s.isFilled && !s.isPendingPayment).length;
                      const pendingPaymentStage = stageInfos.find(s => s.isFilled && s.isPendingPayment);

                      return (
                        <React.Fragment key={item.id}>
                          <tr
                            className={`transition-colors cursor-pointer ${isExpanded ? "bg-[#FCFBF9]" : "hover:bg-[#FCFBF9]"
                              }`}
                            onClick={() => toggleRowExpand(item.id)}
                          >
                            <td className="py-2 px-2 align-top">
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleRowExpand(item.id);
                                  }}
                                  className="p-1 rounded hover:bg-slate-200/70 text-[#C9A84C] transition-colors shrink-0 cursor-pointer"
                                  title={isExpanded ? "Collapse stage details" : "Expand stage details"}
                                >
                                  {isExpanded ? <ChevronDown className="w-4 h-4 text-[#C9A84C]" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                                </button>
                                <div>
                                  <div className="font-bold text-[#1C1C1A] flex items-center gap-1.5">
                                    <Calendar className="w-3.5 h-3.5 text-[#C9A84C] shrink-0" />
                                    {item.workDate ? new Date(item.workDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "N/A"}
                                  </div>
                                  <div className="text-[11px] text-[#5D5B57] flex items-center gap-1 mt-0.5 font-medium">
                                    <User className="w-3 h-3 text-slate-400 shrink-0" />
                                    {item.employeeName || item.employeeId || "Staff Member"}
                                  </div>
                                </div>
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
                              <div className="text-[9.5px] font-semibold text-[#714B67] mt-0.5 flex items-center gap-1">
                                {pendingPaymentStage ? (
                                  <span className="text-rose-700 font-bold bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded text-[8.5px]">
                                    ⚠️ ₹{pendingPaymentStage.pendingAmtVal.toLocaleString("en-IN")} Payment Pending
                                  </span>
                                ) : (
                                  <span>Stages: {filledStagesCount}/{stages.length} Filled</span>
                                )}
                              </div>
                            </td>

                            <td className="py-2 px-2 align-top text-center">
                              <span className="px-2.5 py-1 bg-[#FCFBF9] text-[#1C1C1A] font-bold rounded-lg text-xs inline-block border border-[#E8E4DF]">
                                {item.noOfCount || "1"}
                              </span>
                            </td>

                            <td className="py-2 px-2 align-top text-right font-black text-emerald-700">
                              ₹{getItemAmount(item).toLocaleString("en-IN")}
                            </td>

                            <td className="py-2.5 px-3 align-top space-y-1 text-[11px] leading-snug">
                              {item.dispatchedBy ? (
                                <div><span className="text-slate-400 font-semibold">Dispatched By:</span> <strong className="text-[#1C1C1A]">{item.dispatchedBy}</strong></div>
                              ) : item.printedBy ? (
                                <div><span className="text-slate-400 font-semibold">Printed By:</span> <strong className="text-[#1C1C1A]">{item.printedBy}</strong></div>
                              ) : item.preparedBy ? (
                                <div><span className="text-slate-400 font-semibold">Prepared By:</span> <strong className="text-[#1C1C1A]">{item.preparedBy}</strong></div>
                              ) : (
                                <div><span className="text-slate-400 font-semibold">Brought By:</span> <strong className="text-[#1C1C1A]">{item.broughtBy || item.employeeName || "Staff"}</strong></div>
                              )}

                              {item.billNo && (
                                <div className="text-[10px] text-indigo-700 font-bold">Bill #{item.billNo} {item.billAmount ? `(₹${parseFloat(item.billAmount).toLocaleString('en-IN')})` : ''}</div>
                              )}

                              {followUp && (
                                <div className="text-[10px] text-slate-600 truncate max-w-[180px]">
                                  <strong className="text-[#1C1C1A]">Called:</strong> {followUp.callDate || "—"} ({followUp.contactedPerson || ""})
                                </div>
                              )}
                            </td>

                            <td className="py-2 px-2 align-top">
                              {(() => {
                                const { stages: catStages } = getCategoryAndStages(rawCategoryOpt, subOpt);
                                const allAttachments: Array<{ fileName: string; stage: string }> = [];
                                const seenFiles = new Set<string>();

                                catStages.forEach(stg => {
                                  const stgInfo = getStageFilledDetails(item, stg);
                                  if (stgInfo.isFilled && stgInfo.file && !seenFiles.has(stgInfo.file)) {
                                    seenFiles.add(stgInfo.file);
                                    allAttachments.push({
                                      fileName: stgInfo.file,
                                      stage: stg
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
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          openFilePreview(att.fileName);
                                        }}
                                        className="px-2 py-1 bg-[#FCFBF9] hover:bg-[#F5F0EA] border border-[#E8E4DF] text-[#1C1C1A] rounded-lg font-semibold text-[10px] flex items-center gap-1 cursor-pointer transition-colors"
                                        title={att.stage ? `${att.stage}: ${att.fileName.split('/').pop()}` : att.fileName.split('/').pop()}
                                      >
                                        <FileText className="w-3 h-3 text-[#C9A84C] shrink-0" />
                                        <span className="truncate">{att.fileName.split('/').pop()}</span>
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
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openEditEntry(item);
                                  }}
                                  className="p-1.5 text-indigo-600 hover:bg-indigo-50 border border-indigo-200 rounded transition-colors cursor-pointer"
                                  title="Edit work entry details"
                                >
                                  <Edit className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleRowExpand(item.id);
                                  }}
                                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer shadow-2xs transition-all ${isExpanded
                                    ? "bg-[#714B67] text-white"
                                    : "bg-[#C9A84C] hover:bg-[#b8973b] text-white"
                                    }`}
                                  title="Inspect Stages directly below row"
                                >
                                  <Eye className="w-3 h-3" /> {isExpanded ? "Hide Stages" : "Inspect Stages"}
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

                          {/* EXPANDED STAGES CONTAINER ROW (CLEAN, Sleek & Non-Messy) */}
                          {isExpanded && (
                            <tr key={`expanded_${item.id}`} className="bg-[#FAF9F5] border-b border-[#E8E4DF] animate-fade-in">
                              <td colSpan={7} className="p-3 sm:p-5">
                                <div className="bg-white rounded-2xl border border-[#E8E4DF] border-l-4 border-l-[#C9A84C] shadow-sm overflow-hidden text-xs">
                                  {/* Header Bar */}
                                  <div className="px-4 py-3 bg-[#FCFBF9] border-b border-[#E8E4DF] flex flex-wrap items-center justify-between gap-3">
                                    <div className="flex items-center gap-3">
                                      <span className={`px-3 py-1 border rounded-full font-extrabold text-[11px] uppercase tracking-wider ${pendingPaymentStage
                                        ? "bg-rose-100 text-rose-900 border-rose-300"
                                        : "bg-amber-50 text-amber-900 border-amber-200/80"
                                        }`}>
                                        Stage Progress: {fullyCompletedCount} of {stages.length} Completed {pendingPaymentStage ? `(⚠️ ₹${pendingPaymentStage.pendingAmtVal.toLocaleString("en-IN")} Pending)` : ""}
                                      </span>
                                      <div className="text-xs text-slate-600 font-bold hidden sm:block">
                                        {item.bankName || "Bank"} — {item.branchName || "Branch"} ({item.noOfCount || 1} Count)
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                      <button
                                        type="button"
                                        onClick={() => openNextStepModal(item)}
                                        className="px-3 py-1.5 bg-[#714B67] hover:bg-[#5F3F56] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs transition-all"
                                      >
                                        <ArrowRight className="w-3.5 h-3.5" /> Next Stage Step
                                      </button>
                                    </div>
                                  </div>
                                  {/* STAGES SUB-TABLE FORMAT */}
                                  <div className="p-4 overflow-x-auto">
                                    <table className="w-full text-left border-collapse border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                                      <thead>
                                        <tr className="bg-slate-100/90 text-slate-700 font-extrabold text-[10px] uppercase tracking-wider border-b border-slate-250">
                                          <th className="py-2.5 px-3 w-10 text-center">#</th>
                                          <th className="py-2.5 px-3">Work Stage</th>
                                          <th className="py-2.5 px-3">Allocation Date</th>
                                          <th className="py-2.5 px-3">Staff In-Charge</th>
                                          <th className="py-2.5 px-3 text-center">Count</th>
                                          <th className="py-2.5 px-3 text-right">Amount / Rate</th>
                                          <th className="py-2.5 px-3 text-center">Attachment</th>
                                          <th className="py-2.5 px-3 text-right">Form Data</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-200 text-xs font-medium">
                                        {stages.map((stgName, idx) => {
                                          const info = getStageFilledDetails(item, stgName);
                                          const isStageOpen = activeNestedStage[String(item.id)] === stgName;
                                          const formattedDate = info.date && info.date !== 'N/A'
                                            ? new Date(info.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
                                            : info.date;

                                          return (
                                            <React.Fragment key={idx}>
                                              {/* Stage Row in Table */}
                                              <tr
                                                onClick={() => {
                                                  if (info.isFilled) {
                                                    setActiveNestedStage(prev => ({
                                                      ...prev,
                                                      [String(item.id)]: isStageOpen ? null : stgName
                                                    }));
                                                  }
                                                }}
                                                className={`transition-colors ${info.isFilled
                                                  ? isStageOpen
                                                    ? "bg-amber-50/70 font-semibold cursor-pointer"
                                                    : "hover:bg-slate-50/80 cursor-pointer"
                                                  : "bg-slate-50/40 text-slate-400 opacity-60"
                                                  }`}
                                              >
                                                {/* Status Badge */}
                                                <td className="py-2.5 px-3 text-center align-middle">
                                                  {info.isFilled ? (
                                                    info.isPendingPayment ? (
                                                      <div className="w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center font-bold text-[9px] mx-auto shadow-2xs" title={`Payment Pending ₹${info.pendingAmtVal.toLocaleString("en-IN")}`}>
                                                        ⚠️
                                                      </div>
                                                    ) : (
                                                      <div className="w-5 h-5 rounded-full bg-[#C9A84C] text-white flex items-center justify-center font-bold text-[10px] mx-auto shadow-2xs">
                                                        ✓
                                                      </div>
                                                    )
                                                  ) : (
                                                    <span className="text-[10px] font-bold text-slate-400">{idx + 1}</span>
                                                  )}
                                                </td>

                                                {/* Work Stage Name */}
                                                <td className="py-2.5 px-3 align-middle font-bold text-slate-800 uppercase">
                                                  {stgName}
                                                  {info.isFilled ? (
                                                    info.isPendingPayment ? (
                                                      <span className="ml-2 px-2 py-0.5 bg-rose-100 text-rose-800 border border-rose-300 text-[8.5px] font-black rounded uppercase tracking-tight">
                                                        ⚠️ Pending (₹{info.pendingAmtVal.toLocaleString("en-IN")})
                                                      </span>
                                                    ) : (
                                                      <span className="ml-2 px-1.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[8.5px] font-bold rounded uppercase">
                                                        Completed
                                                      </span>
                                                    )
                                                  ) : (
                                                    <span className="ml-2 text-[8.5px] text-slate-400 font-semibold uppercase">
                                                      Pending
                                                    </span>
                                                  )}
                                                </td>

                                                {/* Execution Date */}
                                                <td className="py-2.5 px-3 align-middle text-slate-600 font-semibold">
                                                  {info.isFilled ? formattedDate : "—"}
                                                </td>

                                                {/* Staff */}
                                                <td className="py-2.5 px-3 align-middle text-slate-700 font-bold">
                                                  {info.isFilled && info.staff ? (
                                                    <div>
                                                      <div>{info.staff}</div>
                                                      <span className="text-[9px] text-slate-400 font-normal">{info.staffLabel}</span>
                                                    </div>
                                                  ) : "—"}
                                                </td>

                                                {/* Count */}
                                                <td className="py-2.5 px-3 align-middle text-center font-bold text-slate-700">
                                                  {info.isFilled ? (info.count || "1") : "—"}
                                                </td>

                                                {/* Amount / Rate */}
                                                <td className="py-2.5 px-3 align-middle text-right font-black text-emerald-700">
                                                  {info.isFilled ? (
                                                    (stgName.includes("PREPARE BILL") || stgName.includes("REQUEST PAYMENT"))
                                                      ? (info.billAmount && Number(info.billAmount) > 0
                                                        ? `₹${Number(info.billAmount).toLocaleString("en-IN")}`
                                                        : (info.stageAmount && Number(info.stageAmount) > 0
                                                          ? `₹${Number(info.stageAmount).toLocaleString("en-IN")}`
                                                          : "—"))
                                                      : stgName.includes("DISPATCH")
                                                        ? (info.stageAmount && Number(info.stageAmount) > 0
                                                          ? `₹${Number(info.stageAmount).toLocaleString("en-IN")}`
                                                          : "—")
                                                        : (info.finalRate && Number(info.finalRate) > 0)
                                                          ? `₹${info.finalRate}/notice`
                                                          : (item.finalRate && Number(item.finalRate) > 0)
                                                            ? `₹${item.finalRate}/notice`
                                                            : (info.stageAmount && Number(info.stageAmount) > 0)
                                                              ? `₹${Number(info.stageAmount).toLocaleString("en-IN")}`
                                                              : "—"
                                                  ) : "—"}
                                                </td>

                                                {/* Attachment */}
                                                <td className="py-2.5 px-3 align-middle text-center">
                                                  {info.isFilled && info.file ? (
                                                    <button
                                                      type="button"
                                                      onClick={(e) => {
                                                        e.stopPropagation();
                                                        openFilePreview(info.file!);
                                                      }}
                                                      className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-md text-[10px] font-bold inline-flex items-center gap-1 transition-colors"
                                                    >
                                                      <Paperclip className="w-3 h-3 text-[#C9A84C]" /> File
                                                    </button>
                                                  ) : (
                                                    <span className="text-slate-400 text-[10px]">—</span>
                                                  )}
                                                </td>

                                                {/* Actions / View & Edit Form Details */}
                                                <td className="py-2.5 px-3 align-middle text-right">
                                                  {info.isFilled ? (
                                                    <div className="flex items-center justify-end gap-1.5">
                                                      <button
                                                        type="button"
                                                        onClick={(e) => {
                                                          e.stopPropagation();
                                                          openEditEntry(item, stgName);
                                                        }}
                                                        className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-[10px] font-bold inline-flex items-center gap-1 transition-colors cursor-pointer"
                                                        title={`Edit ${stgName} stage data`}
                                                      >
                                                        <Edit className="w-3 h-3" /> Edit
                                                      </button>
                                                      <button
                                                        type="button"
                                                        onClick={(e) => {
                                                          e.stopPropagation();
                                                          setActiveNestedStage(prev => ({
                                                            ...prev,
                                                            [String(item.id)]: isStageOpen ? null : stgName
                                                          }));
                                                        }}
                                                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-[10px] font-bold inline-flex items-center gap-1 transition-colors cursor-pointer"
                                                      >
                                                        {isStageOpen ? "Hide Data" : "View Data"}
                                                        {isStageOpen ? <ChevronDown className="w-3 h-3 text-[#C9A84C]" /> : <ChevronRight className="w-3 h-3 text-slate-400" />}
                                                      </button>
                                                    </div>
                                                  ) : (
                                                    <span className="text-slate-400 text-[10px] italic">Pending</span>
                                                  )}
                                                </td>
                                              </tr>

                                              {/* EXPANDED STAGE FULL FORM DATA TABLE */}
                                              {isStageOpen && info.isFilled && (
                                                <tr className="bg-amber-50/40 border-b border-amber-200 animate-fade-in">
                                                  <td colSpan={8} className="p-4">
                                                    <div className="bg-white rounded-xl border border-amber-200 p-4 shadow-sm space-y-3">
                                                      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                                                        <h6 className="text-xs font-black uppercase text-[#1C1C1A] flex items-center gap-2">
                                                          <FileText className="w-4 h-4 text-[#C9A84C]" />
                                                          All Form Data Filled for <span className="text-[#714B67]">{stgName}</span>
                                                        </h6>
                                                        <div className="flex items-center gap-2">
                                                          <button
                                                            type="button"
                                                            onClick={() => openEditEntry(item, stgName)}
                                                            className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-[10px] font-bold rounded-lg inline-flex items-center gap-1 cursor-pointer transition-colors"
                                                          >
                                                            <Edit className="w-3 h-3" /> Edit Stage Data
                                                          </button>
                                                          <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[9.5px] font-bold rounded-full uppercase">
                                                            Verified Stage Log
                                                          </span>
                                                        </div>
                                                      </div>

                                                      {/* 2-Column Key-Value Form Details Table */}
                                                      <table className="w-full text-xs text-left border-collapse border border-slate-200 rounded-lg overflow-hidden">
                                                        <tbody className="divide-y divide-slate-200 font-semibold">
                                                          <tr className="bg-slate-50">
                                                            <td className="py-2.5 px-3.5 w-1/3 text-slate-500 font-bold uppercase text-[9.5px]">Work Stage</td>
                                                            <td className="py-2.5 px-3.5 font-black text-slate-800">{stgName}</td>
                                                          </tr>
                                                          <tr>
                                                            <td className="py-2.5 px-3.5 text-slate-500 font-bold uppercase text-[9.5px]">Execution Staff ({info.staffLabel})</td>
                                                            <td className="py-2.5 px-3.5 text-slate-800 font-bold">{info.staff || "N/A"}</td>
                                                          </tr>
                                                          <tr className="bg-slate-50">
                                                            <td className="py-2.5 px-3.5 text-slate-500 font-bold uppercase text-[9.5px]">Execution Date</td>
                                                            <td className="py-2.5 px-3.5 text-slate-800 font-bold">{formattedDate}</td>
                                                          </tr>
                                                          <tr>
                                                            <td className="py-2.5 px-3.5 text-slate-500 font-bold uppercase text-[9.5px]">No. of Counts / Quantity</td>
                                                            <td className="py-2.5 px-3.5 text-slate-800 font-bold">{info.count || "1"} Count</td>
                                                          </tr>

                                                          {info.finalRate && (
                                                            <tr className="bg-slate-50">
                                                              <td className="py-2.5 px-3.5 text-slate-500 font-bold uppercase text-[9.5px]">Per Notice Rate</td>
                                                              <td className="py-2.5 px-3.5 font-bold text-purple-700">₹{info.finalRate} / notice</td>
                                                            </tr>
                                                          )}
                                                          {info.stageAmount && (
                                                            <tr>
                                                              <td className="py-2.5 px-3.5 text-slate-500 font-bold uppercase text-[9.5px]">Calculated Stage Amount</td>
                                                              <td className="py-2.5 px-3.5 font-black text-emerald-700">₹{Number(info.stageAmount).toLocaleString("en-IN")}</td>
                                                            </tr>
                                                          )}

                                                          {info.billNo && (
                                                            <tr className="bg-slate-50">
                                                              <td className="py-2.5 px-3.5 text-slate-500 font-bold uppercase text-[9.5px]">Bill Details</td>
                                                              <td className="py-2.5 px-3.5 font-bold text-indigo-700">
                                                                Bill #{info.billNo} {info.billDate ? `(${info.billDate})` : ""} {info.billAmount ? `- ₹${parseFloat(info.billAmount).toLocaleString("en-IN")}` : ""}
                                                              </td>
                                                            </tr>
                                                          )}

                                                          {stgName.trim().toUpperCase().includes("REQUEST PAYMENT") && (
                                                            <tr className="bg-purple-50/60">
                                                              <td className="py-3 px-3.5 text-purple-950 font-bold uppercase text-[9.5px] align-top">
                                                                Payment Installments &amp; History
                                                              </td>
                                                              <td className="py-3 px-3.5">
                                                                <div className="space-y-3">
                                                                  <div className="flex flex-wrap items-center justify-between gap-2 bg-white p-3 rounded-xl border border-purple-200">
                                                                    <div className="flex flex-wrap items-center gap-2 text-xs">
                                                                      <span className="px-2.5 py-1 bg-purple-100 text-purple-900 font-black rounded-lg">
                                                                        Total Due: ₹{(info.totalBillVal || Number(info.billAmount || 0)).toLocaleString("en-IN")}
                                                                      </span>
                                                                      <span className="px-2.5 py-1 bg-emerald-100 text-emerald-900 font-black rounded-lg">
                                                                        Total Paid: ₹{info.totalReceivedVal.toLocaleString("en-IN")}
                                                                      </span>
                                                                      <span className={`px-2.5 py-1 font-black rounded-lg ${info.pendingAmtVal > 0 ? "bg-rose-100 text-rose-800" : "bg-emerald-50 text-emerald-700 border border-emerald-200"}`}>
                                                                        {info.pendingAmtVal > 0 ? `⚠️ ₹${info.pendingAmtVal.toLocaleString("en-IN")} Pending` : "✓ Fully Paid"}
                                                                      </span>
                                                                    </div>
                                                                    <button
                                                                      type="button"
                                                                      onClick={() => openAddInstallmentModal(item, stgName)}
                                                                      className="px-3.5 py-1.5 bg-[#714B67] hover:bg-[#5F3F56] text-white text-xs font-black rounded-lg flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 transition-all"
                                                                    >
                                                                      + Add Payment Installment
                                                                    </button>
                                                                  </div>

                                                                  {info.installments && info.installments.length > 0 ? (
                                                                    <div className="overflow-x-auto border border-purple-200 rounded-xl bg-white shadow-2xs">
                                                                      <table className="w-full text-left border-collapse text-xs">
                                                                        <thead>
                                                                          <tr className="bg-purple-100/70 text-purple-950 font-extrabold text-[9.5px] uppercase tracking-wider border-b border-purple-200">
                                                                            <th className="py-2 px-3 text-center">#</th>
                                                                            <th className="py-2 px-3">Payment Date</th>
                                                                            <th className="py-2 px-3 text-right">Received Amount</th>
                                                                            <th className="py-2 px-3">Mode</th>
                                                                            <th className="py-2 px-3">Reference / UTR</th>
                                                                            <th className="py-2 px-3">Received By</th>
                                                                            <th className="py-2 px-3 text-center">Proof File</th>
                                                                            <th className="py-2 px-3 text-right">Action</th>
                                                                          </tr>
                                                                        </thead>
                                                                        <tbody className="divide-y divide-purple-100 font-medium">
                                                                          {info.installments.map((inst, iIdx) => (
                                                                            <tr key={inst.id || iIdx} className="hover:bg-purple-50/50 transition-colors">
                                                                              <td className="py-2 px-3 text-center font-bold text-purple-800">#{inst.installmentNo || iIdx + 1}</td>
                                                                              <td className="py-2 px-3 font-semibold text-slate-700">{inst.paymentDate || "—"}</td>
                                                                              <td className="py-2 px-3 text-right font-black text-emerald-700">₹{Number(inst.amount).toLocaleString("en-IN")}</td>
                                                                              <td className="py-2 px-3 font-bold text-slate-800">{inst.paymentMode || "—"}</td>
                                                                              <td className="py-2 px-3 font-mono text-[11px] text-purple-900">{inst.paymentRef || "—"}</td>
                                                                              <td className="py-2 px-3 font-semibold text-slate-700">{inst.personName || "—"}</td>
                                                                              <td className="py-2 px-3 text-center">
                                                                                {inst.uploadedFileName ? (
                                                                                  <button
                                                                                    type="button"
                                                                                    onClick={() => openFilePreview(inst.uploadedFileName!)}
                                                                                    className="px-2 py-0.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded text-[10px] font-bold inline-flex items-center gap-1 cursor-pointer"
                                                                                  >
                                                                                    <Paperclip className="w-3 h-3 text-[#C9A84C]" /> File
                                                                                  </button>
                                                                                ) : "—"}
                                                                              </td>
                                                                              <td className="py-2 px-3 text-right">
                                                                                <button
                                                                                  type="button"
                                                                                  onClick={() => handleDeleteInstallment(item, stgName, inst.id)}
                                                                                  className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 cursor-pointer transition-colors"
                                                                                  title="Delete installment"
                                                                                >
                                                                                  <Trash2 className="w-3.5 h-3.5" />
                                                                                </button>
                                                                              </td>
                                                                            </tr>
                                                                          ))}
                                                                        </tbody>
                                                                      </table>
                                                                    </div>
                                                                  ) : (
                                                                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-500 italic text-center">
                                                                      No installment payment entries recorded yet. Click "+ Add Payment Installment" above to record a payment installment.
                                                                    </div>
                                                                  )}
                                                                </div>
                                                              </td>
                                                            </tr>
                                                          )}

                                                          {info.finances && !stgName.trim().toUpperCase().includes("REQUEST PAYMENT") && (
                                                            <tr>
                                                              <td className="py-2.5 px-3.5 text-slate-500 font-bold uppercase text-[9.5px]">Financial Breakdown</td>
                                                              <td className="py-2.5 px-3.5">
                                                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                                                                  <div>Total Revenue: <strong className="text-slate-800">₹{Number(info.finances.totalRevenue || 0).toLocaleString("en-IN")}</strong></div>
                                                                  <div>Officer Share: <strong className="text-slate-800">₹{Number(info.finances.bankOfficerTotal || 0).toLocaleString("en-IN")}</strong></div>
                                                                  <div>Own Expense: <strong className="text-slate-800">₹{Number(info.finances.ownExpenses || 0).toLocaleString("en-IN")}</strong></div>
                                                                  <div className="text-emerald-700 font-bold">Gross Profit: ₹{Number(info.finances.grossProfitBeforeDispatch || 0).toLocaleString("en-IN")}</div>
                                                                </div>
                                                              </td>
                                                            </tr>
                                                          )}

                                                          {info.callAt && (
                                                            <tr className="bg-slate-50">
                                                              <td className="py-2.5 px-3.5 text-slate-500 font-bold uppercase text-[9.5px]">Call &amp; Contact Follow-up</td>
                                                              <td className="py-2.5 px-3.5">
                                                                <div>Called Date/Time: <strong>{info.callAt}</strong></div>
                                                                {info.pendingAmount && <div className="text-rose-600 font-bold">Pending Amount: ₹{Number(info.pendingAmount).toLocaleString("en-IN")}</div>}
                                                              </td>
                                                            </tr>
                                                          )}

                                                          {info.remarks && (
                                                            <tr>
                                                              <td className="py-2.5 px-3.5 text-slate-500 font-bold uppercase text-[9.5px]">Work Notes &amp; Remarks</td>
                                                              <td className="py-2.5 px-3.5 text-slate-700 whitespace-pre-wrap">{info.remarks}</td>
                                                            </tr>
                                                          )}

                                                          {info.file && (
                                                            <tr className="bg-amber-50/50">
                                                              <td className="py-2.5 px-3.5 text-amber-900 font-bold uppercase text-[9.5px]">Uploaded Document / Attachment</td>
                                                              <td className="py-2.5 px-3.5">
                                                                <button
                                                                  type="button"
                                                                  onClick={() => openFilePreview(info.file!)}
                                                                  className="px-3 py-1 bg-[#C9A84C] hover:bg-[#b8973b] text-white rounded-md text-xs font-bold inline-flex items-center gap-1 transition-colors shadow-2xs"
                                                                >
                                                                  <Paperclip className="w-3.5 h-3.5" /> View {getFileNameOnly(info.file)}
                                                                </button>
                                                              </td>
                                                            </tr>
                                                          )}
                                                        </tbody>
                                                      </table>
                                                    </div>
                                                  </td>
                                                </tr>
                                              )}
                                            </React.Fragment>
                                          );
                                        })}
                                      </tbody>
                                    </table>
                                  </div>

                                  {/* SEPARATE BILL FOLLOW-UP LOGS & CALL HISTORY */}
                                  {(() => {
                                    const groupLogsList = item.allLogs || [item];
                                    const followUpLogs = groupLogsList.filter(i =>
                                      (i.businessDevSubOption || i.subCategory || i.category || "").toUpperCase().includes("FOLLOW UP")
                                    );
                                    if (followUpLogs.length === 0) return null;

                                    return (
                                      <div className="p-4 pt-0">
                                        <div className="bg-amber-50/60 border border-amber-200/90 rounded-xl p-3.5 space-y-2.5">
                                          <div className="flex items-center justify-between">
                                            <h4 className="text-[11px] font-black uppercase text-[#714B67] flex items-center gap-1.5">
                                              <PhoneCall className="w-3.5 h-3.5 text-[#C9A84C]" />
                                              Bill Follow-Up Activity Logs ({followUpLogs.length})
                                            </h4>
                                          </div>
                                          <div className="overflow-x-auto border border-amber-200/80 rounded-lg bg-white shadow-2xs">
                                            <table className="w-full text-left border-collapse text-xs">
                                              <thead>
                                                <tr className="bg-amber-100/70 text-amber-900 font-extrabold text-[9.5px] uppercase tracking-wider border-b border-amber-200">
                                                  <th className="py-2 px-3 w-8 text-center">#</th>
                                                  <th className="py-2 px-3">Call Date &amp; Time</th>
                                                  <th className="py-2 px-3">Contacted Person / Officer</th>
                                                  <th className="py-2 px-3">Staff In-Charge</th>
                                                  <th className="py-2 px-3">Remarks / Call Details</th>
                                                  <th className="py-2 px-3 text-center">Proof File</th>
                                                  <th className="py-2 px-3 text-right">Actions</th>
                                                </tr>
                                              </thead>
                                              <tbody className="divide-y divide-amber-100 text-slate-700 font-medium text-[11px]">
                                                {followUpLogs.map((fuLog, fuIdx) => {
                                                  const fDetails = parseFollowUpDetails(fuLog.followUpDetails);
                                                  const callDate = fDetails?.callDate || (fuLog.workDate ? new Date(fuLog.workDate).toLocaleDateString("en-IN") : "—");
                                                  const callTime = fDetails?.callTime || "";
                                                  const contactedPerson = fuLog.personName || fDetails?.contactedPerson || "Officer";
                                                  const remarksText = fuLog.remarks || fDetails?.remarks || "—";
                                                  const attachmentFile = fuLog.uploadedFileName;

                                                  return (
                                                    <tr key={fuLog.id || fuIdx} className="hover:bg-amber-50/60 transition-colors">
                                                      <td className="py-2 px-3 text-center font-bold text-amber-800">{fuIdx + 1}</td>
                                                      <td className="py-2 px-3 font-semibold text-slate-800">
                                                        {callDate} {callTime && <span className="text-[10px] text-slate-500 font-normal">({callTime})</span>}
                                                      </td>
                                                      <td className="py-2 px-3 font-bold text-slate-800">{contactedPerson}</td>
                                                      <td className="py-2 px-3 text-slate-600 font-semibold">{fuLog.employeeName || fuLog.employeeId || "Staff"}</td>
                                                      <td className="py-2 px-3 text-slate-700 max-w-xs whitespace-pre-wrap">{remarksText}</td>
                                                      <td className="py-2 px-3 text-center">
                                                        {attachmentFile ? (
                                                          <button
                                                            type="button"
                                                            onClick={() => openFilePreview(attachmentFile)}
                                                            className="px-2 py-0.5 bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 rounded text-[10px] font-bold inline-flex items-center gap-1 cursor-pointer transition-colors"
                                                          >
                                                            <Paperclip className="w-3 h-3 text-[#C9A84C]" /> Proof
                                                          </button>
                                                        ) : (
                                                          <span className="text-slate-400 text-[10px]">—</span>
                                                        )}
                                                      </td>
                                                      <td className="py-2 px-3 text-right">
                                                        <button
                                                          type="button"
                                                          onClick={() => handleDeleteLog(fuLog.id)}
                                                          className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 transition-colors cursor-pointer"
                                                          title="Delete follow-up log"
                                                        >
                                                          <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                      </td>
                                                    </tr>
                                                  );
                                                })}
                                              </tbody>
                                            </table>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })()}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Controls Footer */}
            {!loading && filteredLogs.length > 0 && (
              <div className="px-5 py-3.5 bg-[#FCFBF9] border-t border-[#E8E4DF] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-sans">
                <div className="flex items-center gap-3">
                  <span className="text-[#5D5B57] font-semibold">
                    Showing <strong className="text-[#1C1C1A]">{(validCurrentPage - 1) * itemsPerPage + 1}</strong> to <strong className="text-[#1C1C1A]">{Math.min(validCurrentPage * itemsPerPage, filteredLogs.length)}</strong> of <strong className="text-[#1C1C1A]">{filteredLogs.length}</strong> records
                  </span>
                  <div className="flex items-center gap-1.5 border-l border-[#E8E4DF] pl-3">
                    <span className="text-[10px] text-[#9C9890] font-bold uppercase tracking-wider">Per Page:</span>
                    <select
                      value={itemsPerPage}
                      onChange={(e) => {
                        setItemsPerPage(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      className="bg-white border border-[#E8E4DF] rounded-lg px-2 py-1 text-xs font-bold text-[#1C1C1A] focus:outline-none focus:border-[#C9A84C] cursor-pointer shadow-2xs"
                    >
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={validCurrentPage === 1}
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    className="px-3 py-1.5 bg-white border border-[#E8E4DF] hover:bg-[#F5F0EA] disabled:opacity-40 disabled:hover:bg-white rounded-xl font-bold text-xs text-[#1C1C1A] shadow-2xs transition-all cursor-pointer disabled:cursor-not-allowed"
                  >
                    ← Previous
                  </button>

                  {/* Page Numbers */}
                  <div className="flex items-center gap-1 px-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter(p => p === 1 || p === totalPages || Math.abs(p - validCurrentPage) <= 1)
                      .map((p, idx, arr) => {
                        const prevP = arr[idx - 1];
                        const showEllipsis = prevP && p - prevP > 1;
                        return (
                          <React.Fragment key={p}>
                            {showEllipsis && <span className="px-1 text-slate-400 font-bold">...</span>}
                            <button
                              type="button"
                              onClick={() => setCurrentPage(p)}
                              className={`w-7 h-7 rounded-lg text-xs font-bold transition-all cursor-pointer ${validCurrentPage === p
                                ? "bg-[#714B67] text-white shadow-2xs font-black"
                                : "bg-white border border-[#E8E4DF] hover:bg-[#F5F0EA] text-[#1C1C1A]"
                                }`}
                            >
                              {p}
                            </button>
                          </React.Fragment>
                        );
                      })}
                  </div>

                  <button
                    type="button"
                    disabled={validCurrentPage >= totalPages}
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    className="px-3 py-1.5 bg-white border border-[#E8E4DF] hover:bg-[#F5F0EA] disabled:opacity-40 disabled:hover:bg-white rounded-xl font-bold text-xs text-[#1C1C1A] shadow-2xs transition-all cursor-pointer disabled:cursor-not-allowed"
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })()}

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
                  <label className="block text-[10px] font-black uppercase text-slate-600 mb-1">Work Date *</label>
                  <input type="date" value={editWorkDate} onChange={e => setEditWorkDate(e.target.value)} className="w-full border border-slate-250 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-800 focus:ring-[#714B67] focus:border-[#714B67]" />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-600 mb-1">Bank Name *</label>
                  <SearchableDropdown value={editBankName} onChange={setEditBankName} options={allBankNames} placeholder="Search or select bank..." required />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-600 mb-1">Branch Name *</label>
                  <SearchableDropdown value={editBranchName} onChange={setEditBranchName} options={allBranchNamesForSelectedBank} placeholder="Search or select branch..." required />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-600 mb-1">Work Category / Option *</label>
                  <select
                    value={editOption}
                    onChange={e => {
                      const newOpt = e.target.value;
                      setEditOption(newOpt);
                      const available = STAGE_DEFINITIONS[newOpt] || STAGE_DEFINITIONS["ADVOCATE NOTICE"];
                      if (available && available.length > 0) setEditSubOption(available[0]);
                    }}
                    className="w-full border border-slate-250 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-800 focus:ring-[#714B67] focus:border-[#714B67]"
                  >
                    {Object.keys(STAGE_DEFINITIONS).map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-600 mb-1">Work Step / Sub-Option *</label>
                  <select
                    value={editSubOption}
                    onChange={e => handleEditSubOptionChange(e.target.value)}
                    className="w-full border border-slate-250 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-800 focus:ring-[#714B67] focus:border-[#714B67]"
                  >
                    {(STAGE_DEFINITIONS[editOption] || STAGE_DEFINITIONS["ADVOCATE NOTICE"]).map(stg => (
                      <option key={stg} value={stg}>{stg}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Dynamic Stage-Specific Form Fields */}
              {editSubOption === "TAKE NOTICE ASSIGNMENT" && (
                <div className="space-y-3 bg-purple-50/70 p-3.5 rounded-xl border border-purple-200 animate-fade-in">
                  <span className="text-[10px] font-black uppercase tracking-wider text-purple-900 block">Notice Assignment Details</span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-600 mb-1">No. of Counts *</label>
                      <input type="number" min="1" required value={editCount} onChange={e => setEditCount(e.target.value)} className="w-full border border-slate-250 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-800" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-600 mb-1">Brought By *</label>
                      <SearchableEmployeeInput value={editBroughtBy} onChange={setEditBroughtBy} placeholder="Search or select staff..." required employees={employeeOptions} />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-600 mb-1">Allocation Date *</label>
                      <input type="date" required value={editAllocationDate} onChange={e => setEditAllocationDate(e.target.value)} className="w-full border border-slate-250 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-800" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-600 mb-1">Per Notice Rate (₹)</label>
                      <input type="number" min="0" step="0.01" value={editRate} onChange={e => setEditRate(e.target.value)} placeholder="Rate per notice" className="w-full border border-slate-250 rounded-lg px-3 py-1.5 text-xs font-bold text-purple-700 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-600 mb-1">Bank Officer / Notice (₹)</label>
                      <input type="number" min="0" step="0.01" value={editOfficerShare} onChange={e => setEditOfficerShare(e.target.value)} placeholder="Officer share" className="w-full border border-slate-250 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-800" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-600 mb-1">Own Expenses (₹)</label>
                      <input type="number" min="0" step="0.01" value={editOwnExpense} onChange={e => setEditOwnExpense(e.target.value)} placeholder="Enter expenses" className="w-full border border-slate-250 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-800" />
                    </div>
                  </div>
                </div>
              )}

              {editSubOption === "COLLECT NOTICE DATA" && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-purple-50/70 p-3.5 rounded-xl border border-purple-200 animate-fade-in">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-600 mb-1">No. of Counts *</label>
                    <input type="number" min="1" required value={editCount} onChange={e => setEditCount(e.target.value)} className="w-full border border-slate-250 rounded-lg px-3 py-2 text-xs font-bold text-slate-800" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-600 mb-1">Brought By *</label>
                    <SearchableEmployeeInput value={editBroughtBy} onChange={setEditBroughtBy} placeholder="Search or select staff..." required employees={employeeOptions} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-600 mb-1">Allocation Date *</label>
                    <input type="date" required value={editAllocationDate} onChange={e => setEditAllocationDate(e.target.value)} className="w-full border border-slate-250 rounded-lg px-3 py-2 text-xs font-bold text-slate-800" />
                  </div>
                </div>
              )}

              {editSubOption === "PREPARE NOTICE LIST" && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-purple-50/70 p-3.5 rounded-xl border border-purple-200 animate-fade-in">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-600 mb-1">No. of Counts *</label>
                    <input type="number" min="1" required value={editCount} onChange={e => setEditCount(e.target.value)} className="w-full border border-slate-250 rounded-lg px-3 py-2 text-xs font-bold text-slate-800" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-600 mb-1">Prepared By *</label>
                    <SearchableEmployeeInput value={editPreparedBy} onChange={setEditPreparedBy} placeholder="Search or select staff..." required employees={employeeOptions} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-600 mb-1">Allocation Date *</label>
                    <input type="date" required value={editAllocationDate} onChange={e => setEditAllocationDate(e.target.value)} className="w-full border border-slate-250 rounded-lg px-3 py-2 text-xs font-bold text-slate-800" />
                  </div>
                </div>
              )}

              {editSubOption.includes("GENERATE NOTICE") && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-purple-50/70 p-3.5 rounded-xl border border-purple-200 animate-fade-in">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-600 mb-1">No. of Counts *</label>
                    <input type="number" min="1" required value={editCount} onChange={e => setEditCount(e.target.value)} className="w-full border border-slate-250 rounded-lg px-3 py-2 text-xs font-bold text-slate-800" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-600 mb-1">Printed By *</label>
                    <SearchableEmployeeInput value={editPrintedBy} onChange={setEditPrintedBy} placeholder="Search or select staff..." required employees={employeeOptions} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-600 mb-1">Allocation Date *</label>
                    <input type="date" required value={editAllocationDate} onChange={e => setEditAllocationDate(e.target.value)} className="w-full border border-slate-250 rounded-lg px-3 py-2 text-xs font-bold text-slate-800" />
                  </div>
                </div>
              )}

              {editSubOption.includes("DISPATCH NOTICE") && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-purple-50/70 p-3.5 rounded-xl border border-purple-200 animate-fade-in">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-600 mb-1">No. of Counts *</label>
                    <input type="number" min="1" required value={editCount} onChange={e => setEditCount(e.target.value)} className="w-full border border-slate-250 rounded-lg px-3 py-2 text-xs font-bold text-slate-800" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-600 mb-1">Dispatched By *</label>
                    <SearchableEmployeeInput value={editDispatchedBy} onChange={setEditDispatchedBy} placeholder="Search or select staff..." required employees={employeeOptions} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-600 mb-1">Dispatch Amount (₹) *</label>
                    <input type="number" min="0" step="0.01" required value={editAmount} onChange={e => setEditAmount(e.target.value)} placeholder="Enter dispatch amount..." className="w-full border border-slate-250 rounded-lg px-3 py-2 text-xs font-bold text-emerald-700" />
                  </div>
                </div>
              )}

              {editSubOption.includes("PREPARE BILL") && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-purple-50/70 p-3.5 rounded-xl border border-purple-200 animate-fade-in">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-600 mb-1">Bill Date *</label>
                    <input type="date" required value={editBillDate} onChange={e => setEditBillDate(e.target.value)} className="w-full border border-slate-250 rounded-lg px-3 py-2 text-xs font-bold text-slate-800" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-600 mb-1">Bill Amount (₹) *</label>
                    <input type="number" min="0" step="0.01" required value={editBillAmount} onChange={e => setEditBillAmount(e.target.value)} placeholder="Enter amount..." className="w-full border border-slate-250 rounded-lg px-3 py-2 text-xs font-bold text-emerald-700" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-600 mb-1">Bill No. *</label>
                    <input type="text" required value={editBillNo} onChange={e => setEditBillNo(e.target.value)} placeholder="Enter bill number..." className="w-full border border-slate-250 rounded-lg px-3 py-2 text-xs font-bold text-slate-800" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-600 mb-1">Prepared By (Staff) *</label>
                    <SearchableEmployeeInput value={editPreparedBy} onChange={setEditPreparedBy} placeholder="Search or select staff..." required employees={employeeOptions} />
                  </div>
                </div>
              )}

              {editSubOption.includes("REQUEST PAYMENT") && (
                <div className="space-y-3 bg-purple-50/70 p-3.5 rounded-xl border border-purple-200 animate-fade-in">
                  <div className="flex items-center justify-between border-b border-purple-200 pb-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-purple-900">Payment Breakdown & Settlement Details</span>
                    <span className={`px-2.5 py-0.5 rounded text-[10px] font-black uppercase ${(Number(editPaymentTotalDue || editBillAmount || 0) - Number(editPaymentReceivedAmt || 0)) > 0
                      ? "bg-rose-100 text-rose-800 border border-rose-200"
                      : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                      }`}>
                      {(Number(editPaymentTotalDue || editBillAmount || 0) - Number(editPaymentReceivedAmt || 0)) > 0
                        ? `⚠️ ₹${(Number(editPaymentTotalDue || editBillAmount || 0) - Number(editPaymentReceivedAmt || 0)).toLocaleString("en-IN")} Pending`
                        : "✓ ₹0 Pending (Fully Paid)"}
                    </span>
                  </div>

                  {/* Row 1: Amounts & Date */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-600 mb-1">Total Bill / Due Amount (₹) *</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        required
                        value={editPaymentTotalDue || editBillAmount}
                        onChange={e => {
                          const val = e.target.value;
                          setEditPaymentTotalDue(val);
                          setEditBillAmount(val);
                        }}
                        placeholder="Total due amount..."
                        className="w-full border border-slate-250 rounded-lg px-3 py-2 text-xs font-bold text-purple-900"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-600 mb-1">Received Amount / Paid (₹) *</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        required
                        value={editPaymentReceivedAmt}
                        onChange={e => setEditPaymentReceivedAmt(e.target.value)}
                        placeholder="Amount received..."
                        className="w-full border border-slate-250 rounded-lg px-3 py-2 text-xs font-bold text-emerald-700"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-600 mb-1">Allocated Date *</label>
                      <input type="date" required value={editAllocationDate} onChange={e => setEditAllocationDate(e.target.value)} className="w-full border border-slate-250 rounded-lg px-3 py-2 text-xs font-bold text-slate-800" />
                    </div>
                  </div>

                  {/* Row 2: Payment Mode, Dynamic Ref & Staff */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-600 mb-1">Payment Mode / Method *</label>
                      <select
                        value={editPaymentMode}
                        onChange={e => setEditPaymentMode(e.target.value)}
                        className="w-full border border-slate-250 rounded-lg px-3 py-2 text-xs font-bold text-slate-800"
                      >
                        <option value="NEFT / RTGS / Bank Transfer">NEFT / RTGS / Bank Transfer</option>
                        <option value="Cheque">Cheque</option>
                        <option value="UPI / Online Transfer">UPI / Online Transfer</option>
                        <option value="Cash">Cash</option>
                        <option value="DD / Banker Cheque">DD / Banker Cheque</option>
                        <option value="Direct Account Credit">Direct Account Credit</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    {(() => {
                      const refInfo = getPaymentRefInfo(editPaymentMode);
                      return (
                        <div>
                          <label className="block text-[10px] font-black uppercase text-slate-600 mb-1">{refInfo.label}</label>
                          <input
                            type="text"
                            required={refInfo.required}
                            value={editPaymentRef}
                            onChange={e => setEditPaymentRef(e.target.value)}
                            placeholder={refInfo.placeholder}
                            className="w-full border border-slate-250 rounded-lg px-3 py-2 text-xs font-bold text-slate-800 font-mono"
                          />
                        </div>
                      );
                    })()}

                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-600 mb-1">Payment Collected By</label>
                      <SearchableEmployeeInput value={editPersonName} onChange={setEditPersonName} placeholder="Search or select office staff member..." employees={employeeOptions} />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-600 mb-1">Paid By / Payer Name (Optional)</label>
                      <input
                        type="text"
                        value={editPaidBy}
                        onChange={e => setEditPaidBy(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}

              {editSubOption === "BILL FOLLOW UP" && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-purple-50/70 p-3.5 rounded-xl border border-purple-200 animate-fade-in">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-600 mb-1">Call Date *</label>
                    <input type="date" required value={editCallDate} onChange={e => setEditCallDate(e.target.value)} className="w-full border border-slate-250 rounded-lg px-3 py-2 text-xs font-bold text-slate-800" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-600 mb-1">Call Time *</label>
                    <input type="time" required value={editCallTime} onChange={e => setEditCallTime(e.target.value)} className="w-full border border-slate-250 rounded-lg px-3 py-2 text-xs font-bold text-slate-800" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-600 mb-1">Contacted Person *</label>
                    <input type="text" required value={editContactedPerson} onChange={e => setEditContactedPerson(e.target.value)} placeholder="Contacted person name..." className="w-full border border-slate-250 rounded-lg px-3 py-2 text-xs font-bold text-slate-800" />
                  </div>
                </div>
              )}

              {/* Default Fallback for other sub-options */}
              {editSubOption !== "TAKE NOTICE ASSIGNMENT" &&
                editSubOption !== "COLLECT NOTICE DATA" &&
                editSubOption !== "PREPARE NOTICE LIST" &&
                !editSubOption?.includes("GENERATE NOTICE") &&
                !editSubOption?.includes("DISPATCH NOTICE") &&
                !editSubOption?.includes("PREPARE BILL") &&
                !editSubOption?.includes("REQUEST PAYMENT") &&
                editSubOption !== "BILL FOLLOW UP" && (
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-purple-50/70 p-3.5 rounded-xl border border-purple-200 animate-fade-in">
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-600 mb-1">No. of Counts *</label>
                      <input type="number" min="1" required value={editCount} onChange={e => setEditCount(e.target.value)} className="w-full border border-slate-250 rounded-lg px-3 py-2 text-xs font-bold text-slate-800" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-600 mb-1">Per Notice Rate (₹)</label>
                      <input type="number" min="0" step="0.01" value={editRate} onChange={e => setEditRate(e.target.value)} placeholder="Enter rate..." className="w-full border border-slate-250 rounded-lg px-3 py-2 text-xs font-bold text-purple-700 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-600 mb-1">Work Completed By *</label>
                      <SearchableEmployeeInput value={editBroughtBy} onChange={setEditBroughtBy} placeholder="Search or select staff..." required employees={employeeOptions} />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-600 mb-1">Allocation Date *</label>
                      <input type="date" required value={editAllocationDate} onChange={e => setEditAllocationDate(e.target.value)} className="w-full border border-slate-250 rounded-lg px-3 py-2 text-xs font-bold text-slate-800" />
                    </div>
                  </div>
                )}

              {/* Attachment Document Section in Edit Modal */}
              <div className="space-y-2 bg-[#FCFBF9] p-3.5 rounded-xl border border-[#E8E4DF]">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-700">
                    Stage Attachment Document
                  </span>
                  {editUploadedFileName && (
                    <button
                      type="button"
                      onClick={() => setEditUploadedFileName("")}
                      className="text-[10px] font-bold text-rose-600 hover:text-rose-800 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" /> Remove Attachment
                    </button>
                  )}
                </div>

                {editUploadedFileName ? (
                  <div className="flex items-center justify-between p-2.5 bg-white border border-slate-250 rounded-lg">
                    <div className="flex items-center gap-2 min-w-0">
                      <Paperclip className="w-4 h-4 text-[#C9A84C] shrink-0" />
                      <span className="text-xs font-bold text-slate-800 truncate" title={editUploadedFileName}>
                        {getFileNameOnly(editUploadedFileName)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => openFilePreview(editUploadedFileName)}
                        className="px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-md text-[10px] font-bold hover:bg-amber-100 transition-colors cursor-pointer"
                      >
                        <Eye className="w-3 h-3 inline mr-1" /> Preview
                      </button>
                      <label className="px-2.5 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-md text-[10px] font-bold hover:bg-indigo-100 cursor-pointer transition-colors">
                        <span>{isUploadingEditFile ? "Uploading..." : "Replace File"}</span>
                        <input
                          type="file"
                          accept=".xlsx,.xls,.csv,.pdf,.doc,.docx,.png,.jpg,.jpeg,image/*"
                          className="hidden"
                          disabled={isUploadingEditFile}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleEditFileUpload(file);
                          }}
                        />
                      </label>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-white border border-dashed border-slate-300 rounded-lg flex items-center justify-between">
                    <span className="text-xs text-slate-400 font-medium italic">No document file attached for this entry stage.</span>
                    <label className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer shadow-2xs transition-colors">
                      <Paperclip className="w-3.5 h-3.5" />
                      <span>{isUploadingEditFile ? "Uploading..." : "Attach Document"}</span>
                      <input
                        type="file"
                        accept=".xlsx,.xls,.csv,.pdf,.doc,.docx,.png,.jpg,.jpeg,image/*"
                        className="hidden"
                        disabled={isUploadingEditFile}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleEditFileUpload(file);
                        }}
                      />
                    </label>
                  </div>
                )}
              </div>


              <div>
                <label className="block text-[10px] font-black uppercase text-slate-600 mb-1">Remarks &amp; Work Execution Notes *</label>
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
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-2xl sm:max-w-3xl overflow-hidden flex flex-col">
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
                      <label className="block text-[10px] font-black uppercase text-slate-600 mb-1 min-h-[18px]">No. of Counts *</label>
                      <input type="number" min="1" required value={nextStepCount} onChange={e => setNextStepCount(e.target.value)} className="w-full border border-slate-250 rounded-lg px-3 py-2 text-xs font-bold text-slate-800" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-600 mb-1 min-h-[18px]">Brought By *</label>
                      <SearchableEmployeeInput value={nextStepBroughtBy} onChange={setNextStepBroughtBy} placeholder="Enter or search staff..." required employees={employeeOptions} />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-600 mb-1 min-h-[18px]">Allocation Date *</label>
                      <input type="date" required value={nextStepAllocationDate} onChange={e => setNextStepAllocationDate(e.target.value)} className="w-full border border-slate-250 rounded-lg px-3 py-2 text-xs font-bold text-slate-800" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-600 mb-1 min-h-[18px]">Per Notice Rate (₹) *</label>
                      <input type="number" min="0" step="0.01" value={nextStepRate} onChange={e => setNextStepRate(e.target.value)} placeholder="Rate per notice" className="w-full border border-slate-250 rounded-lg px-3 py-2 text-xs font-bold text-slate-800" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-600 mb-1 min-h-[18px]">Bank Officer / Notice (₹) *</label>
                      <input type="number" min="0" step="0.01" value={nextStepOfficerShare} onChange={e => setNextStepOfficerShare(e.target.value)} placeholder="Officer share" className="w-full border border-slate-250 rounded-lg px-3 py-2 text-xs font-bold text-slate-800" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-600 mb-1 min-h-[18px]">Own Expenses (₹)</label>
                      <input type="number" min="0" step="0.01" value={nextStepExpenses} onChange={e => setNextStepExpenses(e.target.value)} placeholder="Enter expenses" className="w-full border border-slate-250 rounded-lg px-3 py-2 text-xs font-bold text-slate-800" />
                    </div>
                  </div>
                </div>
              )}

              {nextStepSubOption === "COLLECT NOTICE DATA" && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-purple-50/70 p-3.5 rounded-xl border border-purple-200 animate-fade-in">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-600 mb-1 min-h-[18px]">No. of Counts *</label>
                    <input type="number" min="1" required value={nextStepCount} onChange={e => setNextStepCount(e.target.value)} className="w-full border border-slate-250 rounded-lg px-3 py-2 text-xs font-bold text-slate-800" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-600 mb-1 min-h-[18px]">Brought By *</label>
                    <SearchableEmployeeInput value={nextStepBroughtBy} onChange={setNextStepBroughtBy} placeholder="Search or select staff..." required employees={employeeOptions} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-600 mb-1 min-h-[18px]">Upload Notice Data File (Optional)</label>
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
                    <label className="block text-[10px] font-black uppercase text-slate-600 mb-1 min-h-[18px]">No. of Counts *</label>
                    <input type="number" min="1" required value={nextStepCount} onChange={e => setNextStepCount(e.target.value)} className="w-full border border-slate-250 rounded-lg px-3 py-2 text-xs font-bold text-slate-800" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-600 mb-1 min-h-[18px]">Prepared By *</label>
                    <SearchableEmployeeInput value={nextStepPreparedBy} onChange={setNextStepPreparedBy} placeholder="Search or select staff..." required employees={employeeOptions} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-600 mb-1 min-h-[18px]">Upload Notice List File (Optional)</label>
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
                    <label className="block text-[10px] font-black uppercase text-slate-600 mb-1 min-h-[18px]">No. of Counts *</label>
                    <input type="number" min="1" required value={nextStepCount} onChange={e => setNextStepCount(e.target.value)} className="w-full border border-slate-250 rounded-lg px-3 py-2 text-xs font-bold text-slate-800" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-600 mb-1 min-h-[18px]">Printed By *</label>
                    <SearchableEmployeeInput value={nextStepPrintedBy} onChange={setNextStepPrintedBy} placeholder="Search or select staff..." required employees={employeeOptions} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-600 mb-1 min-h-[18px]">Upload Notice File (Optional)</label>
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
                <div className="space-y-3 bg-purple-50/70 p-3.5 rounded-xl border border-purple-200 animate-fade-in">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-600 mb-1 min-h-[18px]">No. of Counts *</label>
                      <input type="number" min="1" required value={nextStepCount} onChange={e => setNextStepCount(e.target.value)} className="w-full border border-slate-250 rounded-lg px-3 py-2 text-xs font-bold text-slate-800" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-600 mb-1 min-h-[18px]">Dispatched By *</label>
                      <SearchableEmployeeInput value={nextStepDispatchedBy} onChange={setNextStepDispatchedBy} placeholder="Search or select staff..." required employees={employeeOptions} />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-600 mb-1 min-h-[18px]">Dispatch Amount (₹) *</label>
                      <input type="number" min="0" step="0.01" required value={nextStepAmount} onChange={e => setNextStepAmount(e.target.value)} placeholder="Enter dispatch amount..." className="w-full border border-slate-250 rounded-lg px-3 py-2 text-xs font-bold text-emerald-700" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-600 mb-1 min-h-[18px]">Upload Dispatch Proof / File (Optional)</label>
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
                <div className="space-y-3 bg-purple-50/70 p-3.5 rounded-xl border border-purple-200 animate-fade-in">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-600 mb-1 min-h-[18px]">Bill Date *</label>
                      <input type="date" required value={nextStepBillDate} onChange={e => setNextStepBillDate(e.target.value)} className="w-full border border-slate-250 rounded-lg px-3 py-2 text-xs font-bold text-slate-800" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-600 mb-1 min-h-[18px]">Bill Amount (₹) *</label>
                      <input type="number" min="0" step="0.01" required value={nextStepBillAmount} onChange={e => setNextStepBillAmount(e.target.value)} placeholder="Enter amount..." className="w-full border border-slate-250 rounded-lg px-3 py-2 text-xs font-bold text-emerald-700" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-600 mb-1 min-h-[18px]">Bill No. *</label>
                      <input type="text" required value={nextStepBillNo} onChange={e => setNextStepBillNo(e.target.value)} placeholder="Enter bill number..." className="w-full border border-slate-250 rounded-lg px-3 py-2 text-xs font-bold text-slate-800" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-600 mb-1 min-h-[18px]">Prepared By (Staff) *</label>
                      <SearchableEmployeeInput value={nextStepPreparedBy} onChange={setNextStepPreparedBy} placeholder="Search or select staff..." required employees={employeeOptions} />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-600 mb-1 min-h-[18px]">Upload Bill File (Optional)</label>
                      <input type="file" accept=".xlsx,.xls,.csv,.pdf,.doc,.docx,.png,.jpg,.jpeg,image/*" onChange={handleNextStepFileChange} className="w-full text-[11px] font-bold text-slate-700 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-[9.5px] file:font-black file:bg-purple-100 file:text-purple-800 cursor-pointer" />
                      {nextStepUploadedFileName && (
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="text-[10px] font-bold text-purple-700 truncate">📄 {nextStepUploadedFileName}</span>
                          <button type="button" onClick={() => openFilePreview(nextStepUploadedFileUrl || nextStepUploadedFileName)} className="shrink-0 px-1.5 py-0.5 bg-[#C9A84C] text-white rounded text-[9px] font-bold cursor-pointer hover:bg-[#b8973b]">Preview</button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {nextStepSubOption.includes("REQUEST PAYMENT") && (
                <div className="space-y-3 bg-purple-50/70 p-3.5 rounded-xl border border-purple-200 animate-fade-in">
                  <div className="flex items-center justify-between border-b border-purple-200 pb-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-purple-900">Payment Breakdown & Settlement Details</span>
                    <span className={`px-2.5 py-0.5 rounded text-[10px] font-black uppercase ${(Number(nextStepPaymentTotalDue || nextStepBillAmount || nextStepAmount || 0) - Number(nextStepPaymentReceivedAmt || 0)) > 0
                      ? "bg-rose-100 text-rose-800 border border-rose-200"
                      : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                      }`}>
                      {(Number(nextStepPaymentTotalDue || nextStepBillAmount || nextStepAmount || 0) - Number(nextStepPaymentReceivedAmt || 0)) > 0
                        ? `⚠️ ₹${(Number(nextStepPaymentTotalDue || nextStepBillAmount || nextStepAmount || 0) - Number(nextStepPaymentReceivedAmt || 0)).toLocaleString("en-IN")} Pending`
                        : "✓ ₹0 Pending (Fully Paid)"}
                    </span>
                  </div>

                  {/* Row 1: Amounts & Date */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-600 mb-1 min-h-[18px]">Total Bill / Due Amount (₹) *</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        required
                        value={nextStepPaymentTotalDue || nextStepBillAmount || nextStepAmount}
                        onChange={e => {
                          const val = e.target.value;
                          setNextStepPaymentTotalDue(val);
                          setNextStepBillAmount(val);
                          setNextStepAmount(val);
                        }}
                        placeholder="Total due amount..."
                        className="w-full border border-slate-250 rounded-lg px-3 py-2 text-xs font-bold text-purple-900"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-600 mb-1 min-h-[18px]">Received Amount / Paid (₹) *</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        required
                        value={nextStepPaymentReceivedAmt}
                        onChange={e => setNextStepPaymentReceivedAmt(e.target.value)}
                        placeholder="Amount received..."
                        className="w-full border border-slate-250 rounded-lg px-3 py-2 text-xs font-bold text-emerald-700"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-600 mb-1 min-h-[18px]">Allocated Date *</label>
                      <input type="date" required value={nextStepAllocationDate} onChange={e => setNextStepAllocationDate(e.target.value)} className="w-full border border-slate-250 rounded-lg px-3 py-2 text-xs font-bold text-slate-800" />
                    </div>
                  </div>

                  {/* Row 2: Payment Mode, Dynamic Ref & Staff */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-600 mb-1 min-h-[18px]">Payment Mode / Method *</label>
                      <select
                        value={nextStepPaymentMode}
                        onChange={e => setNextStepPaymentMode(e.target.value)}
                        className="w-full border border-slate-250 rounded-lg px-3 py-2 text-xs font-bold text-slate-800"
                      >
                        <option value="NEFT / RTGS / Bank Transfer">NEFT / RTGS / Bank Transfer</option>
                        <option value="Cheque">Cheque</option>
                        <option value="UPI / Online Transfer">UPI / Online Transfer</option>
                        <option value="Cash">Cash</option>
                        <option value="DD / Banker Cheque">DD / Banker Cheque</option>
                        <option value="Direct Account Credit">Direct Account Credit</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    {(() => {
                      const refInfo = getPaymentRefInfo(nextStepPaymentMode);
                      return (
                        <div>
                          <label className="block text-[10px] font-black uppercase text-slate-600 mb-1 min-h-[18px]">{refInfo.label}</label>
                          <input
                            type="text"
                            required={refInfo.required}
                            value={nextStepPaymentRef}
                            onChange={e => setNextStepPaymentRef(e.target.value)}
                            placeholder={refInfo.placeholder}
                            className="w-full border border-slate-250 rounded-lg px-3 py-2 text-xs font-bold text-slate-800 font-mono"
                          />
                        </div>
                      );
                    })()}

                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-600 mb-1 min-h-[18px]">Payment Collected By</label>
                      <SearchableEmployeeInput value={nextStepPersonName} onChange={setNextStepPersonName} placeholder="Search or select office staff member..." employees={employeeOptions} />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-600 mb-1 min-h-[18px]">Paid By / Payer Name (Optional)</label>
                      <input
                        type="text"
                        value={nextStepPaidBy}
                        onChange={e => setNextStepPaidBy(e.target.value)}
                        placeholder="Bank officer or payer name..."
                        className="w-full border border-slate-250 rounded-lg px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-purple-600"
                      />
                    </div>
                  </div>

                  {/* Row 3: Attachment */}
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-600 mb-1">Upload Payment Receipt / Proof (Optional)</label>
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
              {nextStepSubOption !== "TAKE NOTICE ASSIGNMENT" &&
                nextStepSubOption !== "COLLECT NOTICE DATA" &&
                nextStepSubOption !== "PREPARE NOTICE LIST" &&
                !nextStepSubOption?.includes("GENERATE NOTICE") &&
                !nextStepSubOption?.includes("DISPATCH NOTICE") &&
                !nextStepSubOption?.includes("PREPARE BILL") &&
                !nextStepSubOption?.includes("REQUEST PAYMENT") && (
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-purple-50/70 p-3.5 rounded-xl border border-purple-200 animate-fade-in">
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-600 mb-1">No. of Counts *</label>
                      <input type="number" min="1" required value={nextStepCount} onChange={e => setNextStepCount(e.target.value)} className="w-full border border-slate-250 rounded-lg px-3 py-2 text-xs font-bold text-slate-800" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-600 mb-1">Per Notice Rate (₹)</label>
                      <input type="number" min="0" step="0.01" value={nextStepRate} onChange={e => setNextStepRate(e.target.value)} placeholder="Enter per notice rate..." className="w-full border border-slate-250 rounded-lg px-3 py-2 text-xs font-bold text-slate-800 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-600 mb-1">Work Completed By *</label>
                      <SearchableEmployeeInput value={nextStepBroughtBy} onChange={setNextStepBroughtBy} placeholder="Search or select staff..." required employees={employeeOptions} />
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
                              info.isPendingPayment ? (
                                <span className="inline-block px-2.5 py-0.5 bg-rose-600 text-white rounded-full text-[10px] font-black uppercase tracking-wider shadow-2xs">
                                  ⚠️ Partially Paid / ₹{info.pendingAmtVal.toLocaleString("en-IN")} Pending
                                </span>
                              ) : (
                                <span className="inline-block px-2.5 py-0.5 bg-[#C9A84C] text-white rounded-full text-[10px] font-bold uppercase tracking-wider shadow-2xs">
                                  Stage Completed / Details Filled
                                </span>
                              )
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

                          {info.staff && info.staff.trim().length > 0 && (
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

                          {info.finalRate !== undefined && info.finalRate !== null && Number(info.finalRate) > 0 && (
                            <div>
                              <span className="text-[9px] font-bold uppercase tracking-wider text-[#9C9890] block mb-0.5">Per Notice Rate</span>
                              <p className="font-bold text-[#1C1C1A] text-sm">₹{parseFloat(info.finalRate).toLocaleString("en-IN")}</p>
                            </div>
                          )}

                          {info.expenses !== undefined && info.expenses !== null && Number(info.expenses) > 0 && (
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

                          {selectedStageTab === "DISPATCH NOTICES" && info.stageAmount !== undefined && info.stageAmount !== null && Number(info.stageAmount) > 0 && (
                            <div>
                              <span className="text-[9px] font-bold uppercase tracking-wider text-[#9C9890] block mb-0.5">Dispatch Amount</span>
                              <p className="font-black text-emerald-700 text-sm">₹{Number(info.stageAmount).toLocaleString("en-IN")}</p>
                            </div>
                          )}

                          {info.finances && (() => {
                            const displayCount = Number(info.count || info.finances.noticeCount || 1);
                            const perRate = Number(info.finances.perNoticeRate || info.finalRate || 50);
                            const officerRate = Number(info.finances.bankOfficerPerNotice || 0);
                            const ownExp = Number(info.finances.ownExpenses || info.expenses || 0);
                            const dispCost = Number(info.dispatchCost || 0);

                            const totalRev = displayCount * perRate;
                            const officerTotal = displayCount * officerRate;
                            const finalGp = totalRev - officerTotal - ownExp - dispCost;

                            return (
                              <div className="col-span-2 grid grid-cols-2 gap-3 rounded-xl border border-purple-200 bg-white p-3 sm:grid-cols-3">
                                <div><span className="block text-[9px] font-bold uppercase text-slate-500">Notice Count × Rate</span><p className="font-black">{displayCount} × ₹{perRate.toLocaleString("en-IN")}</p></div>
                                <div><span className="block text-[9px] font-bold uppercase text-slate-500">Total Revenue</span><p className="font-black">₹{totalRev.toLocaleString("en-IN")}</p></div>
                                <div><span className="block text-[9px] font-bold uppercase text-slate-500">Officer Share</span><p className="font-black text-amber-700">{displayCount} × ₹{officerRate.toLocaleString("en-IN")} = ₹{officerTotal.toLocaleString("en-IN")}</p></div>
                                <div><span className="block text-[9px] font-bold uppercase text-slate-500">Own Expenses</span><p className="font-black text-rose-700">₹{ownExp.toLocaleString("en-IN")}</p></div>
                                <div><span className="block text-[9px] font-bold uppercase text-slate-500">Dispatch Cost</span><p className="font-black text-rose-700">₹{dispCost.toLocaleString("en-IN")}</p></div>
                                <div><span className="block text-[9px] font-bold uppercase text-slate-500">Final GP</span><p className={`font-black ${finalGp >= 0 ? "text-emerald-700" : "text-rose-700"}`}>₹{finalGp.toLocaleString("en-IN")}</p></div>
                              </div>
                            );
                          })()}

                          {selectedStageTab && selectedStageTab.trim().toUpperCase().includes("REQUEST PAYMENT") && (
                            <div className="col-span-2 space-y-3 bg-purple-50/70 p-4 rounded-2xl border border-purple-200">
                              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-purple-200 pb-2">
                                <span className="text-[10px] font-black uppercase text-purple-950 tracking-wider">
                                  Payment Installments Breakdown &amp; History
                                </span>
                                <button
                                  type="button"
                                  onClick={() => openAddInstallmentModal(selectedEntryDetail, selectedStageTab)}
                                  className="px-3 py-1 bg-[#714B67] hover:bg-[#5F3F56] text-white text-[11px] font-black rounded-lg flex items-center gap-1 cursor-pointer shadow-xs active:scale-95 transition-all"
                                >
                                  + Add Payment Installment
                                </button>
                              </div>

                              <div className="flex flex-wrap items-center gap-2 text-xs">
                                <span className="px-2.5 py-1 bg-purple-100 text-purple-900 font-black rounded-lg">
                                  Total Bill: ₹{(info.totalBillVal || Number(info.billAmount || 0)).toLocaleString("en-IN")}
                                </span>
                                <span className="px-2.5 py-1 bg-emerald-100 text-emerald-900 font-black rounded-lg">
                                  Total Received: ₹{info.totalReceivedVal.toLocaleString("en-IN")}
                                </span>
                                <span className={`px-2.5 py-1 font-black rounded-lg ${info.pendingAmtVal > 0 ? "bg-rose-100 text-rose-800 border border-rose-200" : "bg-emerald-50 text-emerald-700 border border-emerald-200"}`}>
                                  {info.pendingAmtVal > 0 ? `⚠️ ₹${info.pendingAmtVal.toLocaleString("en-IN")} Pending` : "✓ Fully Paid"}
                                </span>
                              </div>

                              {info.installments && info.installments.length > 0 ? (
                                <div className="overflow-x-auto border border-purple-200 rounded-xl bg-white shadow-2xs max-h-52">
                                  <table className="w-full text-left border-collapse text-xs">
                                    <thead className="sticky top-0 bg-purple-100 text-purple-950">
                                      <tr className="font-extrabold text-[9px] uppercase tracking-wider border-b border-purple-200">
                                        <th className="py-2 px-2.5 text-center">#</th>
                                        <th className="py-2 px-2.5">Date</th>
                                        <th className="py-2 px-2.5 text-right">Received Amount</th>
                                        <th className="py-2 px-2.5">Mode</th>
                                        <th className="py-2 px-2.5">Ref / UTR</th>
                                        <th className="py-2 px-2.5">Received By</th>
                                        <th className="py-2 px-2.5 text-center">Proof</th>
                                        <th className="py-2 px-2.5 text-right">Action</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-purple-100 font-medium">
                                      {info.installments.map((inst, iIdx) => (
                                        <tr key={inst.id || iIdx} className="hover:bg-purple-50/50 transition-colors">
                                          <td className="py-2 px-2.5 text-center font-bold text-purple-800">#{inst.installmentNo || iIdx + 1}</td>
                                          <td className="py-2 px-2.5 font-semibold text-slate-700">{inst.paymentDate || "—"}</td>
                                          <td className="py-2 px-2.5 text-right font-black text-emerald-700">₹{Number(inst.amount).toLocaleString("en-IN")}</td>
                                          <td className="py-2 px-2.5 font-bold text-slate-800">{inst.paymentMode || "—"}</td>
                                          <td className="py-2 px-2.5 font-mono text-[10.5px] text-purple-900">{inst.paymentRef || "—"}</td>
                                          <td className="py-2 px-2.5 font-semibold text-slate-700">{inst.personName || "—"}</td>
                                          <td className="py-2 px-2.5 text-center">
                                            {inst.uploadedFileName ? (
                                              <button
                                                type="button"
                                                onClick={() => openFilePreview(inst.uploadedFileName!)}
                                                className="px-2 py-0.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded text-[9.5px] font-bold inline-flex items-center gap-1 cursor-pointer"
                                              >
                                                <Paperclip className="w-3 h-3 text-[#C9A84C]" /> File
                                              </button>
                                            ) : "—"}
                                          </td>
                                          <td className="py-2 px-2.5 text-right">
                                            <button
                                              type="button"
                                              onClick={() => handleDeleteInstallment(selectedEntryDetail, selectedStageTab, inst.id)}
                                              className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 cursor-pointer transition-colors"
                                              title="Delete installment"
                                            >
                                              <Trash2 className="w-3 h-3" />
                                            </button>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              ) : (
                                <div className="p-3 bg-white border border-purple-200 rounded-xl text-[11px] text-slate-500 italic text-center">
                                  No partial installment entries recorded yet. Click "+ Add Payment Installment" above to add a payment installment.
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Attachment Section */}
                        <div className="pt-2">
                          <span className="text-[9px] font-bold uppercase tracking-wider text-[#9C9890] block mb-1.5">Attached Document / Receipt</span>
                          {info.file ? (
                            <div className="flex items-center justify-between p-3.5 bg-[#FCFBF9] border border-[#E8E4DF] rounded-xl">
                              <div className="flex items-center gap-2">
                                <Paperclip className="w-4 h-4 text-[#1C1C1A] shrink-0" />
                                <span className="text-xs font-bold text-[#1C1C1A] truncate max-w-[220px]">{getFileNameOnly(info.file)}</span>
                              </div>

                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => openFilePreview(info.file!)}
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
                const isAudio = selectedFilePreviewModal.fileName.match(/\.(aac|mp3|wav|m4a|ogg|wma|flac)$/i) || displayUrl.startsWith("data:audio/");

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
                            accept=".xlsx,.xls,.csv,.pdf,.doc,.docx,.png,.jpg,.jpeg,.mp3,.wav,.aac,.m4a,image/*,audio/*"
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

                if (isAudio) {
                  return (
                    <div className="flex flex-col items-center justify-center text-center space-y-4 py-6 px-4 bg-amber-50/50 rounded-xl border border-amber-200/80 w-full">
                      <div className="w-14 h-14 bg-amber-100 border border-amber-300 rounded-full flex items-center justify-center text-amber-800 shadow-sm">
                        <PhoneCall className="w-7 h-7 text-[#C9A84C]" />
                      </div>
                      <div>
                        <p className="text-xs font-black text-slate-800">{getFileNameOnly(selectedFilePreviewModal.fileName)}</p>
                        <p className="text-[10px] text-slate-500 font-semibold mt-0.5">Call Audio Recording Proof</p>
                      </div>
                      <audio controls src={displayUrl} className="w-full max-w-sm" autoPlay={false}>
                        Your browser does not support playing this audio format.
                      </audio>
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
                  download={getFileNameOnly(selectedFilePreviewModal.fileName)}
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

      {/* UNIQUE BANKS AUDIT & FILTER POPUP MODAL */}
      {showBanksModal && createPortal(
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-xs z-[9999] flex items-center justify-center p-4"
          onMouseDown={(e) => e.target === e.currentTarget && setShowBanksModal(false)}
        >
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden shadow-2xl relative border border-[#E8E4DF] flex flex-col animate-fade-in">
            {/* Header */}
            <div className="p-5 bg-[#FCFBF9] border-b border-[#E8E4DF] flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-center text-amber-800 font-bold">
                  <Landmark className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold font-serif text-[#1C1C1A]">Unique Associated Banks ({uniqueBankDetails.length})</h3>
                  <p className="text-xs text-[#5D5B57] font-medium">Tap any bank below to filter the history table for that bank.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowBanksModal(false)}
                className="p-1.5 text-slate-400 hover:text-[#1C1C1A] rounded-xl hover:bg-slate-100 transition-colors font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Bank List Body */}
            <div className="p-5 overflow-y-auto space-y-3 bg-[#FCFBF9]/30">
              <div className="flex justify-between items-center text-[10px] uppercase font-bold text-slate-500 tracking-wider px-1">
                <span>Bank &amp; Associated Branches</span>
                <span>Records &amp; Financials</span>
              </div>

              {uniqueBankDetails.map((b, idx) => {
                const handleSelectBank = (e?: React.MouseEvent) => {
                  if (e) e.stopPropagation();
                  setSelectedBank(b.bankName);
                  setSearchQuery("");
                  setDateFilter("");
                  setColumnFilters({ staff: [], bank: [], work: [], count: [], amount: [], execution: [] });
                  setShowBanksModal(false);
                  triggerToast?.(`Filtered table by: ${b.bankName}`);
                };

                const isSelected = (selectedBank || "").trim().toLowerCase() === (b.bankName || "").trim().toLowerCase();

                return (
                  <div
                    key={idx}
                    onClick={handleSelectBank}
                    className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${isSelected
                      ? "bg-amber-50 border-amber-300 ring-2 ring-amber-400/40 shadow-xs"
                      : "bg-white border-[#E8E4DF] hover:border-[#C9A84C] hover:bg-amber-50/40 hover:shadow-md"
                      }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-amber-100/60 text-amber-900 font-black text-xs flex items-center justify-center shrink-0 border border-amber-200">
                        {idx + 1}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm font-bold text-[#1C1C1A] truncate">{b.bankName}</h4>
                        <p className="text-[10px] text-slate-500 font-semibold mt-0.5 truncate">
                          {b.branches.size > 0 ? `${b.branches.size} Branch(es): ${Array.from(b.branches).slice(0, 3).join(", ")}${b.branches.size > 3 ? "..." : ""}` : "All Branches"}
                        </p>
                      </div>
                    </div>

                    <div className="text-right flex items-center gap-3 shrink-0">
                      <div>
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-800 font-extrabold rounded text-[10px] border border-slate-200 block text-center">
                          {b.count} Records ({b.totalQty} Count)
                        </span>
                        {b.totalAmount > 0 && (
                          <span className="text-xs font-bold text-emerald-700 block mt-1">
                            ₹{b.totalAmount.toLocaleString("en-IN")}
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={handleSelectBank}
                        className="px-3.5 py-1.5 bg-[#714B67] hover:bg-[#5F3F56] text-white text-xs font-bold rounded-lg transition-colors cursor-pointer shadow-2xs"
                      >
                        {isSelected ? "Active" : "Filter ➔"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Modal Footer */}
            <div className="p-3.5 border-t bg-slate-50 flex justify-between items-center text-xs font-semibold text-slate-600">
              <button
                type="button"
                onClick={() => {
                  setSelectedBank("ALL");
                  setShowBanksModal(false);
                }}
                className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-bold transition-colors cursor-pointer"
              >
                Clear Filter (Show All Banks)
              </button>
              <button
                type="button"
                onClick={() => setShowBanksModal(false)}
                className="px-4 py-1.5 bg-[#C9A84C] hover:bg-[#b8973b] text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ADD PAYMENT INSTALLMENT MODAL */}
      {installmentModalLog && createPortal(
        <div
          className="fixed inset-0 bg-black/60 z-[10000] flex items-center justify-center p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setInstallmentModalLog(null);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Add Payment Installment"
            className="bg-white rounded-2xl p-5 max-w-lg w-full space-y-4 shadow-2xl relative border border-[#E8E4DF] animate-scale-in"
          >
            {/* Modal Header */}
            <div className="flex justify-between items-center pb-3 border-b border-[#E8E4DF]">
              <div>
                <span className="px-2.5 py-0.5 bg-purple-100 text-purple-900 border border-purple-200 rounded-full text-[9.5px] font-black uppercase tracking-wider">
                  Request Payment Stage
                </span>
                <h3 className="text-base font-bold font-serif text-[#1C1C1A] mt-1" style={{ fontFamily: "'Playfair Display', serif" }}>
                  + Add Payment Installment
                </h3>
                <p className="text-xs text-slate-500 font-semibold">
                  {installmentModalLog.logItem.bankName} — {installmentModalLog.logItem.branchName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setInstallmentModalLog(null)}
                className="text-slate-400 hover:text-[#1C1C1A] font-bold text-sm px-2 py-1 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Body Form */}
            <div className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-600 mb-1 min-h-[18px]">Payment Date *</label>
                  <input
                    type="date"
                    required
                    value={instDate}
                    onChange={e => setInstDate(e.target.value)}
                    className="w-full border border-slate-250 rounded-lg px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-purple-600"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-600 mb-1 min-h-[18px]">Installment Amount Received (₹) *</label>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    required
                    value={instAmount}
                    onChange={e => setInstAmount(e.target.value)}
                    placeholder="Enter installment amount..."
                    className="w-full border border-slate-250 rounded-lg px-3 py-2 text-xs font-black text-emerald-700 focus:outline-none focus:border-purple-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-600 mb-1 min-h-[18px]">Payment Mode / Method *</label>
                  <select
                    value={instMode}
                    onChange={e => {
                      setInstMode(e.target.value);
                      if (e.target.value !== "Other") setInstOtherMode("");
                    }}
                    className="w-full border border-slate-250 rounded-lg px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-purple-600"
                  >
                    <option value="NEFT / RTGS / Bank Transfer">NEFT / RTGS / Bank Transfer</option>
                    <option value="Cheque">Cheque</option>
                    <option value="UPI / Online Transfer">UPI / Online Transfer</option>
                    <option value="Cash">Cash</option>
                    <option value="DD / Banker Cheque">DD / Banker Cheque</option>
                    <option value="Direct Account Credit">Direct Account Credit</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                {instMode === "Other" && (
                  <div>
                    <label className="block text-[10px] font-black uppercase text-purple-700 mb-1 min-h-[18px]">Specify Payment Mode / Method *</label>
                    <input
                      type="text"
                      required
                      value={instOtherMode}
                      onChange={e => setInstOtherMode(e.target.value)}
                      placeholder="Specify custom payment mode..."
                      className="w-full border border-purple-300 bg-purple-50/30 rounded-lg px-3 py-2 text-xs font-bold text-purple-950 focus:outline-none focus:border-purple-600"
                    />
                  </div>
                )}

                {(() => {
                  const refInfo = getPaymentRefInfo(instMode);
                  return (
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-600 mb-1 min-h-[18px]">{refInfo.label}</label>
                      <input
                        type="text"
                        required={refInfo.required}
                        value={instRef}
                        onChange={e => setInstRef(e.target.value)}
                        placeholder={refInfo.placeholder}
                        className="w-full border border-slate-250 rounded-lg px-3 py-2 text-xs font-bold text-slate-800 font-mono focus:outline-none focus:border-purple-600"
                      />
                    </div>
                  );
                })()}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-600 mb-1">Payment Collected By</label>
                  <SearchableEmployeeInput
                    value={instPersonName}
                    onChange={setInstPersonName}
                    placeholder="Search or select office staff member..."
                    employees={employeeOptions}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-600 mb-1">Paid By / Payer Name (Optional)</label>
                  <input
                    type="text"
                    value={instPaidBy}
                    onChange={e => setInstPaidBy(e.target.value)}
                    placeholder="Bank officer or payer name..."
                    className="w-full border border-slate-250 rounded-lg px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-purple-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-600 mb-1">Upload Payment Receipt / Proof File (Optional)</label>
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv,.pdf,.doc,.docx,.png,.jpg,.jpeg,image/*"
                  onChange={handleInstallmentFileChange}
                  className="w-full text-[11px] font-bold text-slate-700 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-[9.5px] file:font-black file:bg-purple-100 file:text-purple-800 cursor-pointer"
                />
                {instUploadedFileName && (
                  <p className="text-[10px] font-bold text-purple-700 mt-1">📄 {instUploadedFileName}</p>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-600 mb-1">Remarks / Payment Execution Notes</label>
                <textarea
                  rows={2}
                  value={instRemarks}
                  onChange={e => setInstRemarks(e.target.value)}
                  placeholder="Enter details for this installment..."
                  className="w-full border border-slate-250 rounded-lg px-3 py-2 text-xs resize-none focus:outline-none focus:border-purple-600"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="pt-3 border-t flex justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setInstallmentModalLog(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submittingInstallment}
                onClick={handleSaveInstallment}
                className="px-5 py-2 bg-[#714B67] hover:bg-[#5F3F56] text-white text-xs font-black rounded-lg disabled:opacity-60 shadow-md cursor-pointer active:scale-95 transition-all flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                {submittingInstallment ? "Saving..." : "Save Payment Installment"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
