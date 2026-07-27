"use client";
import React, { useState, useEffect, useMemo } from "react";
import {
  Search, RefreshCw, FileText, Calendar, Building, User, Download, Filter,
  Layers, CheckCircle2, DollarSign, Briefcase, Landmark, Paperclip, Eye,
  ChevronDown, ChevronRight, ArrowRight, Clock, Award, ShieldCheck, Check, Trash2
} from "lucide-react";

const STAGE_DEFINITIONS: Record<string, string[]> = {
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

  // Detailed Modal State
  const [selectedEntryDetail, setSelectedEntryDetail] = useState<LegalWorkLogItem | null>(null);
  const [selectedStageTab, setSelectedStageTab] = useState<string | null>(null);
  const [selectedFilePreviewModal, setSelectedFilePreviewModal] = useState<{ fileName: string } | null>(null);

  const fetchWorkLogHistory = async () => {
    try {
      setLoading(true);
      const [workLogRes, noticeRes] = await Promise.all([
        fetch("/api/legal-recovery/work-log"),
        fetch("/api/legal-recovery/notices")
      ]);

      const workLogData = await workLogRes.json();
      const noticeData = await noticeRes.json();

      let combined: LegalWorkLogItem[] = [];

      // 1. Process Legal Work Form Logs
      if (workLogRes.ok && workLogData.success) {
        const rawLogs = workLogData.data || [];
        const formLogs = rawLogs.filter((item: LegalWorkLogItem) =>
          item.typeOfWork === "Bank Related" || !!item.businessDevOption
        );
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
            bankName: n.bankName || undefined,
            branchName: n.branchName || undefined,
            remarks: n.handoverRemarks || `Notice Board Entry (${n.typeOfNotice || 'Advocate Notice'})`,
            employeeName: n.broughtBy || n.printedBy || n.dispatchedBy || n.createdBy || "Notice Staff",
            createdAt: n.createdAt,
            rawNotice: n
          };
        });

        combined = [...combined, ...mappedNotices];
      }

      combined.sort((a, b) => new Date(b.workDate || b.createdAt).getTime() - new Date(a.workDate || a.createdAt).getTime());
      setLogs(combined);
    } catch (error) {
      console.error("Error fetching work log history:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkLogHistory();
  }, []);

  const uniqueBanks = useMemo(() => {
    const banks = new Set<string>();
    logs.forEach(l => {
      if (l.bankName) banks.add(l.bankName);
    });
    return Array.from(banks);
  }, [logs]);

  const uniqueOptions = useMemo(() => {
    const opts = new Set<string>();
    logs.forEach(l => {
      if (l.businessDevOption) opts.add(l.businessDevOption);
      else if (l.category) opts.add(l.category);
    });
    return Array.from(opts);
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
      const matchesOption = selectedOption === "ALL" || item.businessDevOption === selectedOption || item.category === selectedOption;

      const itemDateStr = item.workDate ? new Date(item.workDate).toISOString().split('T')[0] : "";
      const matchesDate = !dateFilter || itemDateStr === dateFilter;

      return matchesSearch && matchesBank && matchesOption && matchesDate;
    });
  }, [logs, searchQuery, selectedBank, selectedOption, dateFilter]);

  const totalCounts = useMemo(() => {
    return filteredLogs.reduce((acc, curr) => acc + (parseInt(curr.noOfCount || "1") || 1), 0);
  }, [filteredLogs]);

  const totalBillAmount = useMemo(() => {
    return filteredLogs.reduce((acc, curr) => acc + (parseFloat(curr.billAmount || "0") || 0), 0);
  }, [filteredLogs]);

  const handleOpenDetailModal = (entry: LegalWorkLogItem) => {
    setSelectedEntryDetail(entry);
    setSelectedStageTab(entry.businessDevSubOption || entry.subCategory || null);
  };

  const handleDeleteLog = async (id: string | number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this work entry log?")) return;
    try {
      const res = await fetch(`/api/legal-recovery/work-log?id=${id}`, { method: "DELETE" });
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

  const handleExportCsv = () => {
    if (filteredLogs.length === 0) {
      alert("No data available to export.");
      return;
    }

    const headers = [
      "ID", "Date", "Employee Name", "Work Location", "Type of Work", "Bank Name", "Branch Name",
      "Business Dev Option", "Work Step / Sub-Option", "Count", "Allocation Date",
      "Brought By", "Prepared By", "Printed By", "Dispatched By", "Bill Date", "Bill Amount (Rs)", "Bill No", "Person Name", "Uploaded File", "Remarks"
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
      cleanCell(l.billAmount || "0"),
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
    const n = entry.rawNotice;
    if (!n) {
      const isLogged = (entry.businessDevSubOption || entry.subCategory) === stageName;
      return {
        isFilled: isLogged,
        staff: entry.broughtBy || entry.preparedBy || entry.printedBy || entry.dispatchedBy || entry.personName,
        count: entry.noOfCount || "1",
        date: entry.allocationDate || (entry.workDate ? new Date(entry.workDate).toLocaleDateString("en-IN") : 'N/A'),
        billNo: entry.billNo,
        billDate: entry.billDate,
        billAmount: entry.billAmount,
        file: entry.uploadedFileName,
        remarks: entry.remarks
      };
    }

    if (stageName === "TAKE NOTICE ASSIGNMENT") {
      return {
        isFilled: true,
        staff: n.createdBy || n.broughtBy || "Notice Department",
        count: n.qty?.toString() || "1",
        date: n.noticeOrderDate || n.noticeDate || 'N/A',
        remarks: `Notice Category: ${n.typeOfNotice || 'Advocate Notice'}`
      };
    } else if (stageName === "COLLECT NOTICE DATA") {
      return {
        isFilled: !!n.broughtBy,
        staff: n.broughtBy || undefined,
        count: n.qty?.toString() || "1",
        date: n.noticeDate || 'N/A',
        remarks: n.broughtBy ? `Data collected by ${n.broughtBy}` : undefined
      };
    } else if (stageName === "PREPARE NOTICE LIST") {
      return {
        isFilled: !!(n.noticeRenameBy || n.scannedBy),
        staff: n.noticeRenameBy || n.scannedBy || undefined,
        count: n.noOfScan ? n.noOfScan.toString() : (n.qty?.toString() || "1"),
        date: n.noticeDate || 'N/A',
        remarks: n.noticeRenameBy ? `Notice renamed/prepared by ${n.noticeRenameBy}` : undefined
      };
    } else if (stageName === "GENERATE NOTICE VIA SOFTWARE/MAIL MERGE") {
      return {
        isFilled: !!n.printedBy,
        staff: n.printedBy || undefined,
        count: n.noOfPrint ? n.noOfPrint.toString() : (n.qty?.toString() || "1"),
        date: n.noticeDate || 'N/A',
        remarks: n.printedBy ? `Notice printed by ${n.printedBy}` : undefined
      };
    } else if (stageName === "DISPATCH NOTICES") {
      return {
        isFilled: !!n.dispatchedBy,
        staff: n.dispatchedBy || undefined,
        count: n.qty?.toString() || "1",
        date: n.noticeDate || 'N/A',
        remarks: n.dispatchedBy ? `Dispatched by ${n.dispatchedBy}` : undefined
      };
    } else if (stageName === "PREPARE BILL (BILL BANWANA)") {
      return {
        isFilled: !!(n.billNo || n.billAmount),
        billNo: n.billNo || undefined,
        billDate: n.billDate || undefined,
        billAmount: n.billAmount ? n.billAmount.toString() : undefined,
        date: n.billDate || 'N/A',
        remarks: n.billNo ? `Bill No. ${n.billNo}` : undefined
      };
    } else if (stageName === "REQUEST PAYMENT") {
      return {
        isFilled: !!(n.handoverTo || n.paidDate),
        staff: n.handoverTo || n.handoverBy || undefined,
        date: n.paidDate || n.noticeDate || 'N/A',
        file: n.handoverReceiptPhoto || undefined,
        remarks: n.handoverRemarks || (n.paidDate ? `Payment completed on ${n.paidDate}` : undefined)
      };
    }

    return { isFilled: false };
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
              <option value="ALL">All Banks ({uniqueBanks.length})</option>
              {uniqueBanks.map((b, i) => (
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

        {(searchQuery || selectedBank !== "ALL" || selectedOption !== "ALL" || dateFilter) && (
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
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#FCFBF9] text-[#1C1C1A] font-bold border-b border-[#E8E4DF] text-[10px] uppercase tracking-wider">
                  <th className="py-3 px-4">Date &amp; Staff</th>
                  <th className="py-3 px-4">Bank &amp; Branch</th>
                  <th className="py-3 px-4">Work Category &amp; Step</th>
                  <th className="py-3 px-4 text-center">Count / Qty</th>
                  <th className="py-3 px-4">Execution Details</th>
                  <th className="py-3 px-4">Attachment</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8E4DF] font-medium text-[#1C1C1A]">
                {filteredLogs.map(item => {
                  const categoryOpt = item.businessDevOption || item.category || "ADVOCATE NOTICE";
                  const subOpt = item.businessDevSubOption || item.subCategory || "TAKE NOTICE ASSIGNMENT";

                  return (
                    <tr key={item.id} className="hover:bg-[#FCFBF9] transition-colors">
                      <td className="py-3.5 px-4 align-top">
                        <div className="font-bold text-[#1C1C1A] flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-[#C9A84C] shrink-0" />
                          {item.workDate ? new Date(item.workDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "N/A"}
                        </div>
                        <div className="text-[11px] text-[#5D5B57] flex items-center gap-1 mt-0.5 font-medium">
                          <User className="w-3 h-3 text-slate-400 shrink-0" />
                          {item.employeeName || item.employeeId || "Staff Member"}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 align-top">
                        <div className="font-bold text-[#1C1C1A]">{item.bankName || "N/A"}</div>
                        <div className="text-[11px] text-[#5D5B57] font-medium">{item.branchName || "N/A"}</div>
                      </td>

                      <td className="py-3.5 px-4 align-top">
                        <span className="px-2 py-0.5 bg-[#C9A84C] text-white font-bold rounded text-[9px] uppercase tracking-wider inline-block mb-1 shadow-2xs">
                          {categoryOpt}
                        </span>
                        <div className="font-bold text-[#1C1C1A] text-xs">
                          {subOpt}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 align-top text-center">
                        <span className="px-2.5 py-1 bg-[#FCFBF9] text-[#1C1C1A] font-bold rounded-lg text-xs inline-block border border-[#E8E4DF]">
                          {item.noOfCount || "1"}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 align-top space-y-0.5 text-[11px]">
                        {item.broughtBy && (
                          <div><strong className="text-[#1C1C1A]">Brought By:</strong> {item.broughtBy}</div>
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
                        {!item.broughtBy && !item.preparedBy && !item.printedBy && !item.dispatchedBy && !item.personName && !item.billNo && !item.billAmount && (
                          <span className="text-slate-400 italic">Notice / Form Log</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 align-top">
                        {item.uploadedFileName ? (
                          <button
                            type="button"
                            onClick={() => setSelectedFilePreviewModal({ fileName: item.uploadedFileName! })}
                            className="px-2 py-1 bg-[#FCFBF9] hover:bg-[#F5F0EA] border border-[#E8E4DF] text-[#1C1C1A] rounded-lg font-semibold text-[10px] flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            <Paperclip className="w-3 h-3 text-[#C9A84C]" />
                            <span className="truncate max-w-[90px]">{item.uploadedFileName}</span>
                          </button>
                        ) : (
                          <span className="text-slate-400 text-[10px]">—</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 align-top text-right">
                        <div className="flex items-center justify-end gap-1.5">
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

      {/* Level 4: Entry Detailed View Modal with Vertical Stages Checklist */}
      {selectedEntryDetail && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-5xl w-full max-h-[92vh] overflow-hidden shadow-2xl relative border border-[#E8E4DF] flex flex-col">
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
              <div className="w-full md:w-7/12 p-5 overflow-y-auto space-y-4 bg-white">
                {selectedStageTab ? (
                  (() => {
                    const info = getStageFilledDetails(selectedEntryDetail, selectedStageTab);
                    return (
                      <div className="space-y-4 animate-fade-in">
                        <div className="p-4 bg-[#FCFBF9] rounded-2xl border border-[#E8E4DF] space-y-1">
                          <span className="text-[9px] font-bold uppercase tracking-wider text-[#9C9890]">Inspect Work Stage</span>
                          <h3 className="text-sm font-bold text-[#1C1C1A] uppercase">{selectedStageTab}</h3>
                          {info.isFilled ? (
                            <span className="inline-block px-2.5 py-0.5 bg-[#C9A84C] text-white rounded-full text-[10px] font-bold uppercase tracking-wider mt-1 shadow-2xs">
                              Stage Completed / Details Filled
                            </span>
                          ) : (
                            <span className="inline-block px-2.5 py-0.5 bg-[#E8E4DF] text-[#5D5B57] rounded-full text-[10px] font-bold uppercase tracking-wider mt-1">
                              Stage Pending
                            </span>
                          )}
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
                              <span className="text-[9px] font-bold uppercase tracking-wider text-[#9C9890] block mb-0.5">Staff In-Charge / Handover</span>
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
                        </div>

                        {/* Attachment Section */}
                        <div className="pt-2">
                          <span className="text-[9px] font-bold uppercase tracking-wider text-[#9C9890] block mb-1.5">Attached Document / Receipt</span>
                          {info.file || selectedEntryDetail.uploadedFileName ? (
                            <div className="flex items-center justify-between p-3.5 bg-[#FCFBF9] border border-[#E8E4DF] rounded-xl">
                              <div className="flex items-center gap-2">
                                <Paperclip className="w-4 h-4 text-[#1C1C1A] shrink-0" />
                                <span className="text-xs font-bold text-[#1C1C1A] truncate max-w-[220px]">{info.file || selectedEntryDetail.uploadedFileName}</span>
                              </div>

                              <button
                                type="button"
                                onClick={() => setSelectedFilePreviewModal({ fileName: (info.file || selectedEntryDetail.uploadedFileName)! })}
                                className="px-3 py-1.5 bg-[#C9A84C] hover:bg-[#b8973b] text-white font-bold text-xs rounded-lg flex items-center gap-1 shadow-xs cursor-pointer transition-colors"
                              >
                                <Eye className="w-3.5 h-3.5" /> Preview Document
                              </button>
                            </div>
                          ) : (
                            <div className="p-3 bg-[#FCFBF9] border border-[#E8E4DF] rounded-xl text-xs text-slate-400 font-medium italic">
                              No document file attached for this entry stage.
                            </div>
                          )}
                        </div>

                        {/* Remarks Section */}
                        <div className="pt-2">
                          <span className="text-[9px] font-bold uppercase tracking-wider text-[#9C9890] block mb-1">Remarks &amp; Work Execution Notes</span>
                          <p className="text-xs font-medium text-[#1C1C1A] bg-[#FCFBF9] p-3.5 rounded-xl border border-[#E8E4DF] leading-relaxed">
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
            <div className="p-4 bg-white border-t border-[#E8E4DF] flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setSelectedEntryDetail(null)}
                className="px-5 py-2 bg-[#C9A84C] hover:bg-[#b8973b] text-white rounded-xl text-xs font-bold cursor-pointer shadow-xs transition-all"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}

      {/* File Preview Modal */}
      {selectedFilePreviewModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 max-w-md w-full space-y-4 shadow-2xl relative border border-[#E8E4DF] animate-scale-in">
            <div className="flex justify-between items-center pb-2 border-b border-[#E8E4DF]">
              <h4 className="text-xs font-bold text-[#1C1C1A] uppercase tracking-wider flex items-center gap-1.5">
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
            <div className="text-center py-8 bg-[#FCFBF9] rounded-xl p-4 border border-[#E8E4DF] space-y-2">
              <FileText className="w-10 h-10 text-[#C9A84C] mx-auto" />
              <p className="text-xs font-bold text-[#1C1C1A]">{selectedFilePreviewModal.fileName}</p>
              <p className="text-[10px] text-[#5D5B57] font-medium">Document attached to this work entry stage.</p>
            </div>
            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={() => setSelectedFilePreviewModal(null)}
                className="px-4 py-1.5 bg-[#C9A84C] hover:bg-[#b8973b] text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
