import React, { useState } from "react";
import { createPortal } from "react-dom";
import { Search, Filter, PhoneCall, History, Banknote, RefreshCw, Edit2, Trash2, Download, X, Briefcase, Calendar, FileAudio, ChevronDown, ChevronUp, Building, FileText } from "lucide-react";

export default function CasesMasterView({
  cases,
  loading,
  setShowFollowUpForm,
  setShowPaymentForm,
  openHistory,
  userRole,
  onEditCase,
  onDeleteCase,
  pocEmployees = [],
  onAssignPoc,
  onBulkAssignPoc,
  currentUserName = ""
}: {
  cases: any[],
  loading: boolean,
  setShowFollowUpForm: (state: any) => void,
  setShowPaymentForm: (state: any) => void,
  openHistory: (id: number) => void,
  userRole?: string,
  onEditCase?: (c: any) => void,
  onDeleteCase?: (id: number) => void,
  pocEmployees?: any[],
  onAssignPoc?: (caseItem: any, pocName: string) => Promise<void>,
  onBulkAssignPoc?: (caseIds: number[], pocName: string) => Promise<void>,
  currentUserName?: string
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [bankFilter, setBankFilter] = useState("");
  const [branchFilter, setBranchFilter] = useState("");
  const [pocFilter, setPocFilter] = useState("");
  const [rboFilter, setRboFilter] = useState("");
  const [aoFilter, setAoFilter] = useState("");
  const [showFilterOptions, setShowFilterOptions] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [openHeaderFilter, setOpenHeaderFilter] = useState("");
  const [headerFilterSearch, setHeaderFilterSearch] = useState<Record<string, string>>({});
  const [headerSelections, setHeaderSelections] = useState<Record<string, string[]>>({});
  const [pocCase, setPocCase] = useState<any | null>(null);
  const [selectedPoc, setSelectedPoc] = useState("");
  const [savingPoc, setSavingPoc] = useState(false);
  const [selectedCaseIds, setSelectedCaseIds] = useState<number[]>([]);

  const [expandedCaseId, setExpandedCaseId] = useState<number | null>(null);
  const [localHistory, setLocalHistory] = useState<any[]>([]);
  const [localWorkLogs, setLocalWorkLogs] = useState<any[]>([]);
  const [localPayments, setLocalPayments] = useState<any[]>([]);
  const [loadingLocalHistory, setLoadingLocalHistory] = useState(false);

  const handleToggleLogs = async (caseItem: any) => {
    const caseId = typeof caseItem === 'object' ? caseItem?.id : caseItem;
    if (expandedCaseId === caseId) {
      setExpandedCaseId(null);
      return;
    }
    setExpandedCaseId(caseId);
    setLoadingLocalHistory(true);
    setLocalHistory([]);
    setLocalWorkLogs([]);
    setLocalPayments([]);
    try {
      const isRealMaster = caseId && Number(caseId) > 0;
      const followUpUrl = isRealMaster
        ? `/api/legal-recovery/followup?masterId=${caseId}`
        : `/api/legal-recovery/followup?scope=all`;
      const workLogUrl = isRealMaster
        ? `/api/legal-recovery/work-log?masterId=${caseId}`
        : `/api/legal-recovery/work-log`;
      const paymentUrl = isRealMaster
        ? `/api/legal-recovery/payment?masterId=${caseId}`
        : `/api/legal-recovery/payment`;

      const [resFollowup, resWorkLogs, resPayments] = await Promise.all([
        fetch(followUpUrl),
        fetch(workLogUrl),
        fetch(paymentUrl)
      ]);
      const resultFollowup = await resFollowup.json();
      const resultWorkLogs = await resWorkLogs.json();
      const resultPayments = await resPayments.json();
      if (resultFollowup.success) {
        let fData = resultFollowup.data || [];
        if (!isRealMaster && caseItem?.bankName) {
          const bNorm = caseItem.bankName.toLowerCase().trim();
          fData = fData.filter((f: any) => (f.bankName || "").toLowerCase().trim().includes(bNorm));
        }
        setLocalHistory(fData);
      }
      if (resultWorkLogs.success) {
        let wData = resultWorkLogs.data || [];
        if (!isRealMaster && caseItem?.bankName) {
          const bNorm = caseItem.bankName.toLowerCase().trim();
          const brNorm = (caseItem.branchName || "").toLowerCase().trim();
          wData = wData.filter((w: any) =>
            (w.bankName || "").toLowerCase().trim().includes(bNorm) &&
            (!brNorm || (w.branchName || "").toLowerCase().trim().includes(brNorm))
          );
        }
        setLocalWorkLogs(wData);
      }
      if (resultPayments.success) {
        let pData = resultPayments.data || [];
        if (!isRealMaster && caseItem?.bankName) {
          const bNorm = caseItem.bankName.toLowerCase().trim();
          const brNorm = (caseItem.branchName || "").toLowerCase().trim();
          pData = pData.filter((payment: any) =>
            (payment.bankName || "").toLowerCase().trim().includes(bNorm) &&
            (!brNorm || (payment.branchName || "").toLowerCase().trim().includes(brNorm))
          );
        }
        setLocalPayments(pData);
      }
    } catch (error) {
      console.error("Error loading history:", error);
    } finally {
      setLoadingLocalHistory(false);
    }
  };

  const allColumns = [
    { key: "bankName", label: "Bank Name" },
    { key: "branchName", label: "Branch Name" },
    { key: "branchId", label: "Branch Code" },
    { key: "noticeCount", label: "Notice Count" },
    { key: "rbo", label: "RBO / Zone" },
    { key: "pocName", label: "POC Employee" },
    { key: "branchEmail", label: "Branch Email" },
    { key: "aoName", label: "AO Name" },
    { key: "deptManagerName", label: "Branch Manager" },
    { key: "contactNumber", label: "Manager Contact" },
    { key: "foName", label: "Field Officer (FO)" },
    { key: "foContact", label: "FO Contact" },
    { key: "totalBillAmount", label: "Total Bill Amount (₹)" },
    { key: "receivedAmount", label: "Received Amount (₹)" },
    { key: "tdsAmount", label: "TDS Adjusted (₹)" },
    { key: "pendingAmount", label: "Pending Amount (₹)" },
    { key: "status", label: "Status" },
    { key: "pendingSince", label: "Pending Since" },
    { key: "createdAt", label: "Created Date" }
  ];
  const [selectedColumns, setSelectedColumns] = useState<string[]>(allColumns.map(c => c.key));

  const handleExport = () => {
    if (selectedColumns.length === 0) return alert("Select at least one column to export");
    if (filteredCases.length === 0) return alert("No branch records match the current filters");

    // Headers
    const headers = allColumns.filter(c => selectedColumns.includes(c.key)).map(c => c.label);

    // Rows
    const rows = filteredCases.map(c => {
      return allColumns.filter(col => selectedColumns.includes(col.key)).map(col => {
        let val = c[col.key];
        if (col.key === 'createdAt' || col.key === 'pendingSince') {
          val = val ? new Date(val).toLocaleDateString() : '';
        }
        if (['pendingAmount', 'totalBillAmount', 'receivedAmount', 'tdsAmount', 'noticeCount'].includes(col.key)) {
          val = val !== undefined && val !== null ? val : 0;
        }
        const text = val === undefined || val === null ? "" : String(val);
        // Keep spreadsheet software from treating names/codes as formulas.
        const safeText = /^[=+\-@]/.test(text) ? `'${text}` : text;
        return `"${safeText.replace(/"/g, '""')}"`;
      }).join(",");
    });

    const csvContent = `\uFEFF${[headers.join(","), ...rows].join("\n")}`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    const filtered = bankFilter || branchFilter || pocFilter || rboFilter || aoFilter;
    link.setAttribute("download", `Legal_Recovery_Branches_${filtered ? "Filtered" : "All"}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setShowExportModal(false);
  };

  const uniqueBanks = Array.from(new Set(cases.map(c => c.bankName).filter(Boolean)));
  const uniqueBranches = Array.from(new Set(cases.map(c => c.branchName).filter(Boolean)));
  const uniquePocs = Array.from(new Set(cases.map(c => c.pocName).filter(Boolean)));
  const uniqueRbos = Array.from(new Set(cases.map(c => String(c.rbo || "").trim()).filter(Boolean))).sort();
  const uniqueAos = Array.from(new Set(cases.map(c => String(c.aoName || "").trim()).filter(Boolean))).sort();

  const getDetailsValue = (c: any) => `${c.bankName || "Unknown Bank"} — ${c.branchName || "General Branch"}`;
  const getOfficialsValue = (c: any) => c.pocName || "Not Assigned";
  const getAmountValue = (c: any) => {
    const total = parseFloat(c.totalBillAmount) || 0;
    const received = parseFloat(c.receivedAmount) || 0;
    const tds = parseFloat(c.tdsAmount) || 0;
    const pending = Number.isFinite(parseFloat(c.pendingAmount)) ? parseFloat(c.pendingAmount) : Math.max(0, total - received - tds);
    return `Active Bill ₹${total.toLocaleString("en-IN")} · Cash ₹${received.toLocaleString("en-IN")} · TDS ₹${tds.toLocaleString("en-IN")} · Pending ₹${pending.toLocaleString("en-IN")}`;
  };
  const getStatusValue = (c: any) => {
    const total = parseFloat(c.totalBillAmount) || 0;
    const received = parseFloat(c.receivedAmount) || 0;
    const pending = Number.isFinite(parseFloat(c.pendingAmount)) ? parseFloat(c.pendingAmount) : Math.max(0, total - received);
    return pending <= 0 ? "Settled" : (c.status || "Open");
  };

  const headerOptions: Record<string, string[]> = {
    details: Array.from(new Set(cases.map(getDetailsValue))).sort(),
    officials: Array.from(new Set(cases.map(getOfficialsValue))).sort(),
    amount: Array.from(new Set(cases.map(getAmountValue))).sort(),
    status: Array.from(new Set(cases.map(getStatusValue))).sort()
  };

  const filteredCases = cases.filter(c => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matches =
        c.bankName?.toLowerCase().includes(q) ||
        c.branchName?.toLowerCase().includes(q) ||
        c.branchId?.toLowerCase().includes(q) ||
        c.aoName?.toLowerCase().includes(q) ||
        c.pocName?.toLowerCase().includes(q) ||
        c.deptManagerName?.toLowerCase().includes(q) ||
        c.foName?.toLowerCase().includes(q) ||
        c.rbo?.toLowerCase().includes(q) ||
        c.branchEmail?.toLowerCase().includes(q);
      if (!matches) return false;
    }

    if (bankFilter && c.bankName !== bankFilter) return false;
    if (branchFilter && c.branchName !== branchFilter) return false;
    if (pocFilter && c.pocName !== pocFilter) return false;
    if (rboFilter && String(c.rbo || "").trim() !== rboFilter) return false;
    if (aoFilter && String(c.aoName || "").trim() !== aoFilter) return false;
    if (headerSelections.details && !headerSelections.details.includes(getDetailsValue(c))) return false;
    if (headerSelections.officials && !headerSelections.officials.includes(getOfficialsValue(c))) return false;
    if (headerSelections.amount && !headerSelections.amount.includes(getAmountValue(c))) return false;
    if (headerSelections.status && !headerSelections.status.includes(getStatusValue(c))) return false;

    return true;
  });

  // Calculate dynamic totals from filtered cases
  const totalCasesCount = filteredCases.length;
  const totalNoticesCount = filteredCases.reduce((sum, c) => sum + (parseInt(c.noticeCount) || 0), 0);
  const totalBillSum = filteredCases.reduce((sum, c) => sum + (parseFloat(c.totalBillAmount) || 0), 0);
  const totalReceivedSum = filteredCases.reduce((sum, c) => sum + (parseFloat(c.receivedAmount) || 0), 0);
  const totalTdsSum = filteredCases.reduce((sum, c) => sum + (parseFloat(c.tdsAmount) || 0), 0);
  const totalPendingSum = filteredCases.reduce((sum, c) => sum + (parseFloat(c.pendingAmount) || 0), 0);
  const settledCount = filteredCases.filter(c => c.status === "Settled" || (parseFloat(c.pendingAmount) <= 0 && parseFloat(c.totalBillAmount) > 0)).length;
  const filteredUniqueBanks = Array.from(new Set(filteredCases.map(c => c.bankName).filter(Boolean)));
  const filteredUniqueBranches = Array.from(new Set(filteredCases.map(c => `${c.bankName}_${c.branchName}`).filter(Boolean)));
  const filteredCaseIds = filteredCases.map(c => Number(c.id));
  const allFilteredSelected = filteredCaseIds.length > 0 && filteredCaseIds.every(id => selectedCaseIds.includes(id));

  const renderExcelHeader = (label: string, filterKey: string, align = "left") => {
    const options = headerOptions[filterKey] || [];
    const selected = headerSelections[filterKey] || options;
    const search = headerFilterSearch[filterKey] || "";
    const visibleOptions = options.filter(option => option.toLowerCase().includes(search.toLowerCase()));
    const isFiltered = selected.length !== options.length;

    return (
      <th className={`relative py-3.5 px-4 ${align === "center" ? "text-center" : "text-left"}`}>
        <button type="button" onClick={() => setOpenHeaderFilter(openHeaderFilter === filterKey ? "" : filterKey)} className={`inline-flex w-full items-center gap-1.5 ${align === "center" ? "justify-center" : "justify-between"}`}>
          <span>{label}</span>
          <ChevronDown className={`h-3.5 w-3.5 rounded ${isFiltered ? "bg-indigo-600 text-white" : "text-slate-500 dark:text-gray-300"}`} />
        </button>
        {openHeaderFilter === filterKey && (
          <div className="absolute left-2 top-full z-50 mt-1 w-72 rounded-xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-3 text-left normal-case tracking-normal shadow-2xl" onClick={event => event.stopPropagation()}>
            <input
              autoFocus
              value={search}
              onChange={e => setHeaderFilterSearch({ ...headerFilterSearch, [filterKey]: e.target.value })}
              placeholder="Search values..."
              className="w-full rounded-md border border-slate-200 dark:border-gray-700 px-2.5 py-2 text-[10px] font-semibold text-slate-700 dark:text-gray-100 focus:border-indigo-400 focus:outline-none"
            />
            <div className="mt-2 flex items-center justify-between border-b border-slate-100 dark:border-gray-700 pb-2">
              <button type="button" onClick={() => setHeaderSelections({ ...headerSelections, [filterKey]: options })} className="text-[9px] font-black text-indigo-600 dark:text-indigo-300 hover:underline">Select All</button>
              <button type="button" onClick={() => setHeaderSelections({ ...headerSelections, [filterKey]: options })} className="text-[9px] font-black text-rose-600 dark:text-rose-300 hover:underline">Clear Filter</button>
            </div>
            <div className="mt-2 max-h-56 space-y-1 overflow-y-auto">
              {visibleOptions.map(option => (
                <label key={option} className="flex cursor-pointer items-start gap-2 rounded px-1.5 py-1 text-[10px] font-semibold text-slate-700 dark:text-gray-100 hover:bg-slate-50 dark:hover:bg-gray-800">
                  <input
                    type="checkbox"
                    checked={selected.includes(option)}
                    onChange={e => setHeaderSelections({
                      ...headerSelections,
                      [filterKey]: e.target.checked ? [...selected, option] : selected.filter(value => value !== option)
                    })}
                    className="mt-0.5"
                  />
                  <span className="break-words">{option}</span>
                </label>
              ))}
              {!visibleOptions.length && <p className="py-4 text-center text-[10px] text-slate-400 dark:text-gray-300">No values found</p>}
            </div>
            <button type="button" onClick={() => setOpenHeaderFilter("")} className="mt-2 w-full rounded-md bg-slate-800 dark:bg-gray-800 py-1.5 text-[9px] font-black text-white">Done</button>
          </div>
        )}
      </th>
    );
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Financial KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white dark:bg-gray-900 border border-[#E8E4DF] dark:border-gray-700 rounded-xl p-3.5 shadow-2xs">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-gray-300">Bank Cases</div>
          <div className="text-xl font-black text-slate-900 dark:text-gray-100 mt-1">{totalCasesCount}</div>
          <div className="text-[9px] text-slate-400 dark:text-gray-300 mt-0.5">{filteredUniqueBanks.length} Banks · {filteredUniqueBranches.length} Branches</div>
        </div>

        <div className="bg-white dark:bg-gray-900 border border-blue-100 dark:border-gray-700 rounded-xl p-3.5 shadow-2xs">
          <div className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-300">Total Notices</div>
          <div className="text-xl font-black text-blue-900 dark:text-blue-300 mt-1">{totalNoticesCount}</div>
          <div className="text-[9px] text-blue-500 mt-0.5 font-medium">Invoiced Notices</div>
        </div>

        <div className="bg-white dark:bg-gray-900 border border-indigo-100 dark:border-gray-700 rounded-xl p-3.5 shadow-2xs">
          <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-300">Active Invoiced / Bill</div>
          <div className="text-xl font-black text-indigo-900 dark:text-indigo-300 mt-1">₹{totalBillSum.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</div>
          <div className="text-[9px] text-indigo-500 mt-0.5 font-medium">Cancelled bills excluded</div>
        </div>

        <div className="bg-white dark:bg-gray-900 border border-emerald-100 dark:border-gray-700 rounded-xl p-3.5 shadow-2xs">
          <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-300">Cash Received</div>
          <div className="text-xl font-black text-emerald-700 dark:text-emerald-300 mt-1">₹{totalReceivedSum.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</div>
          <div className="text-[9px] text-emerald-600 dark:text-emerald-300 mt-0.5 font-medium">
            TDS adjusted: ₹{totalTdsSum.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 border border-rose-100 dark:border-gray-700 rounded-xl p-3.5 shadow-2xs">
          <div className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-300">Total Pending</div>
          <div className="text-xl font-black text-rose-700 dark:text-rose-300 mt-1">₹{totalPendingSum.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</div>
          <div className="text-[9px] text-rose-500 mt-0.5 font-medium">Outstanding Balance</div>
        </div>

        <div className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-xl p-3.5 shadow-2xs">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-gray-300">Settled Cases</div>
          <div className="text-xl font-black text-emerald-600 dark:text-emerald-300 mt-1">{settledCount} / {totalCasesCount}</div>
          <div className="text-[9px] text-slate-400 dark:text-gray-300 mt-0.5 font-medium">100% Cleared</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="bg-[#FCFBF9] dark:bg-gray-900 border border-[#E8E4DF] dark:border-gray-700 p-3.5 rounded-xl flex-1 flex items-center gap-3">
          <Search className="w-4 h-4 text-[#9C9890] dark:text-gray-300" />
          <input
            type="text"
            className="bg-transparent border-none focus:outline-none text-xs w-full font-semibold text-slate-700 dark:text-gray-100 placeholder:text-[#9C9890] placeholder:font-normal"
            placeholder="Search by Bank, Branch, POC, AO, Manager, FO or RBO..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="relative flex items-center">
          <button
            onClick={() => setShowFilterOptions(!showFilterOptions)}
            className={`px-4 py-3.5 h-full border border-[#E8E4DF] dark:border-gray-700 hover:bg-[#F5F0EA] dark:hover:bg-gray-800 rounded-xl text-[10px] font-semibold tracking-wider uppercase transition-all flex items-center gap-1.5 shadow-sm ${showFilterOptions || bankFilter || branchFilter || pocFilter || rboFilter || aoFilter ? 'bg-[#F5F0EA] dark:bg-gray-800 text-[#1C1C1A] dark:text-gray-100' : 'bg-[#FCFBF9] dark:bg-gray-900 text-[#5D5B57] dark:text-gray-300'}`}
          >
            <Filter className="w-3.5 h-3.5" /> {(bankFilter || branchFilter || pocFilter || rboFilter || aoFilter) ? "Filtered" : "Filter"}
          </button>

          {showFilterOptions && (
            <div className="absolute right-0 top-full mt-2 w-72 max-h-[70vh] overflow-y-auto bg-white dark:bg-gray-900 border border-[#E8E4DF] dark:border-gray-700 rounded-xl shadow-2xl z-50 animate-fade-in p-4 grid gap-4">
              <div>
                <label className="text-[10px] font-bold text-slate-500 dark:text-gray-300 uppercase tracking-wider mb-1 block">Bank</label>
                <select value={bankFilter} onChange={e => setBankFilter(e.target.value)} className="w-full text-xs p-2.5 border border-[#E8E4DF] dark:border-gray-700 rounded-lg bg-slate-50 dark:bg-gray-800 focus:outline-none focus:border-indigo-400 font-semibold text-slate-700 dark:text-gray-100">
                  <option value="">All Banks</option>
                  {uniqueBanks.map(b => <option key={String(b)} value={String(b)}>{String(b)}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 dark:text-gray-300 uppercase tracking-wider mb-1 block">Branch</label>
                <select value={branchFilter} onChange={e => setBranchFilter(e.target.value)} className="w-full text-xs p-2.5 border border-[#E8E4DF] dark:border-gray-700 rounded-lg bg-slate-50 dark:bg-gray-800 focus:outline-none focus:border-indigo-400 font-semibold text-slate-700 dark:text-gray-100">
                  <option value="">All Branches</option>
                  {uniqueBranches.map(br => <option key={String(br)} value={String(br)}>{String(br)}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-violet-600 dark:text-violet-300 uppercase tracking-wider mb-1 block">POC Employee</label>
                <select value={pocFilter} onChange={e => setPocFilter(e.target.value)} className="w-full text-xs p-2.5 border border-violet-200 dark:border-gray-700 rounded-lg bg-violet-50/40 dark:bg-violet-950/50 focus:outline-none focus:border-violet-500 font-semibold text-slate-700 dark:text-gray-100">
                  <option value="">All POC Employees</option>
                  {uniquePocs.map(poc => <option key={String(poc)} value={String(poc)}>{String(poc)}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-indigo-600 dark:text-indigo-300 uppercase tracking-wider mb-1 block">RBO / Zone</label>
                <select value={rboFilter} onChange={e => setRboFilter(e.target.value)} className="w-full text-xs p-2.5 border border-indigo-200 dark:border-gray-700 rounded-lg bg-indigo-50/40 dark:bg-indigo-950/50 focus:outline-none focus:border-indigo-500 font-semibold text-slate-700 dark:text-gray-100">
                  <option value="">All RBO / Zones</option>
                  {uniqueRbos.map(rbo => <option key={rbo} value={rbo}>{rbo}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-sky-600 dark:text-sky-300 uppercase tracking-wider mb-1 block">AO</label>
                <select value={aoFilter} onChange={e => setAoFilter(e.target.value)} className="w-full text-xs p-2.5 border border-sky-200 dark:border-gray-700 rounded-lg bg-sky-50/40 dark:bg-sky-950/50 focus:outline-none focus:border-sky-500 font-semibold text-slate-700 dark:text-gray-100">
                  <option value="">All AOs</option>
                  {uniqueAos.map(ao => <option key={ao} value={ao}>{ao}</option>)}
                </select>
              </div>

              <div className="flex justify-end mt-2 pt-3 border-t border-slate-100 dark:border-gray-700">
                <button onClick={() => {
                  setBankFilter("");
                  setBranchFilter("");
                  setPocFilter("");
                  setRboFilter("");
                  setAoFilter("");
                  setShowFilterOptions(false);
                }} className="text-[10px] text-rose-600 dark:text-rose-300 font-bold uppercase tracking-wider hover:underline flex items-center gap-1">
                  <RefreshCw className="w-3 h-3" /> Clear Filters
                </button>
              </div>
            </div>
          )}
        </div>

        {userRole === "Owner" && (
          <button
            onClick={() => setShowExportModal(true)}
            className="px-4 py-3.5 h-full border border-emerald-200 dark:border-gray-700 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-950/50 rounded-xl text-[10px] font-semibold tracking-wider uppercase transition-all flex items-center gap-1.5 shadow-sm text-emerald-800 dark:text-emerald-300"
          >
            <Download className="w-3.5 h-3.5" /> Export
          </button>
        )}
        {userRole === "Owner" && selectedCaseIds.length > 0 && (
          <button
            type="button"
            onClick={() => { setPocCase({ bulk: true }); setSelectedPoc(""); }}
            className="px-4 py-3.5 h-full rounded-xl bg-violet-700 text-white text-[10px] font-black uppercase tracking-wider shadow-sm hover:bg-violet-800"
          >
            Assign POC ({selectedCaseIds.length})
          </button>
        )}
      </div>

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/20 dark:bg-gray-800 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-slide-up">
            <div className="px-6 py-4 border-b border-[#E8E4DF] dark:border-gray-700 flex justify-between items-center">
              <h2 className="text-sm font-black text-emerald-900 dark:text-emerald-300 uppercase tracking-wider flex items-center gap-2">
                <Download className="w-5 h-5 text-emerald-500" /> Export Cases
              </h2>
              <button onClick={() => setShowExportModal(false)} className="text-slate-400 dark:text-gray-300 hover:text-rose-600 dark:hover:text-rose-300 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <div className="mb-4 rounded-xl border border-emerald-100 dark:border-gray-700 bg-emerald-50 dark:bg-emerald-950/50 p-3">
                <p className="text-xs font-bold text-emerald-900 dark:text-emerald-300">{filteredCases.length} branch record{filteredCases.length === 1 ? "" : "s"} will be exported</p>
                <p className="mt-1 text-[10px] text-emerald-700 dark:text-emerald-300">The CSV follows the Bank, Branch, POC, RBO and AO filters currently applied.</p>
              </div>
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs text-slate-500 dark:text-gray-300 font-semibold">Select CSV columns:</p>
                <div className="flex gap-3 text-[10px] font-bold uppercase tracking-wide">
                  <button type="button" onClick={() => setSelectedColumns(allColumns.map(column => column.key))} className="text-emerald-700 dark:text-emerald-300 hover:underline">Select All</button>
                  <button type="button" onClick={() => setSelectedColumns([])} className="text-rose-600 dark:text-rose-300 hover:underline">Clear</button>
                </div>
              </div>

              <div className="space-y-3 max-h-60 overflow-y-auto mb-6 pr-2">
                {allColumns.map(col => (
                  <label key={col.key} className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={selectedColumns.includes(col.key)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedColumns([...selectedColumns, col.key]);
                        } else {
                          setSelectedColumns(selectedColumns.filter(k => k !== col.key));
                        }
                      }}
                      className="w-4 h-4 rounded border-slate-300 dark:border-gray-700 text-emerald-600 dark:text-emerald-300 focus:ring-emerald-500"
                    />
                    <span className="text-xs font-bold text-slate-700 dark:text-gray-100 group-hover:text-emerald-700 transition-colors">{col.label}</span>
                  </label>
                ))}
              </div>

              <div className="flex gap-3 pt-4 border-t border-[#E8E4DF] dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => setShowExportModal(false)}
                  className="flex-1 px-4 py-3 bg-white dark:bg-gray-900 border border-[#E8E4DF] dark:border-gray-700 text-slate-600 dark:text-gray-300 rounded-xl text-xs font-bold hover:bg-slate-50 dark:hover:bg-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleExport}
                  className="flex-1 px-4 py-3 bg-emerald-600 text-white rounded-xl text-xs font-black shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 transition-colors"
                >
                  Download CSV
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {pocCase && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[60] bg-slate-900/30 dark:bg-gray-800 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-gray-900 border border-violet-100 dark:border-gray-700 shadow-2xl p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-gray-100">{pocCase.bulk ? "Assign POC to Multiple Cases" : "Assign POC Employee"}</h3>
                <p className="mt-1 text-[10px] text-slate-500 dark:text-gray-300">{pocCase.bulk ? `${selectedCaseIds.length} cases selected` : `${pocCase.bankName} · ${pocCase.branchName || "General Branch"}`}</p>
              </div>
              <button type="button" onClick={() => setPocCase(null)} className="text-slate-400 dark:text-gray-300 hover:text-slate-700 dark:hover:text-gray-100"><X className="w-5 h-5" /></button>
            </div>
            <label className="mt-5 block text-[9px] font-black uppercase tracking-wider text-violet-700 dark:text-violet-300">Legal Recovery Employee</label>
            <input
              type="text"
              list="case-poc-employees"
              value={selectedPoc}
              onChange={e => setSelectedPoc(e.target.value)}
              placeholder="Type employee name..."
              className="mt-1 w-full rounded-lg border border-violet-200 dark:border-gray-700 bg-violet-50/40 dark:bg-violet-950/50 px-3 py-2.5 text-xs font-semibold focus:border-violet-500 focus:outline-none"
            />
            <datalist id="case-poc-employees">
              {pocEmployees.map(employee => (
                <option key={employee.id} value={employee.name} label={employee.employeeProfile?.employeeId || employee.employeeId || employee.name} />
              ))}
            </datalist>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setPocCase(null)} className="rounded-lg border border-slate-200 dark:border-gray-700 px-4 py-2 text-[10px] font-bold text-slate-600 dark:text-gray-300">Cancel</button>
              <button
                type="button"
                disabled={savingPoc || !selectedPoc.trim()}
                onClick={async () => {
                  if (pocCase.bulk ? !onBulkAssignPoc : !onAssignPoc) return;
                  setSavingPoc(true);
                  try {
                    if (pocCase.bulk) {
                      await onBulkAssignPoc!(selectedCaseIds, selectedPoc.trim());
                      setSelectedCaseIds([]);
                    } else {
                      await onAssignPoc!(pocCase, selectedPoc.trim());
                    }
                    setPocCase(null);
                  } finally {
                    setSavingPoc(false);
                  }
                }}
                className="rounded-lg bg-violet-700 px-4 py-2 text-[10px] font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {savingPoc ? "Saving..." : "Assign POC"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Table */}
      <div className="bg-[#FCFBF9] dark:bg-gray-900 border border-[#E8E4DF] dark:border-gray-700 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left min-w-max">
            <thead>
              <tr className="border-b border-[#E8E4DF] dark:border-gray-700 bg-[#F5F0EA]/40 dark:bg-gray-800 text-[#5D5B57] dark:text-gray-300 text-[10px] uppercase font-bold tracking-wider">
                <th className="w-10 py-3.5 px-3 text-center">
                  {userRole === "Owner" && <input
                    type="checkbox"
                    aria-label="Select all filtered cases"
                    checked={allFilteredSelected}
                    onChange={e => setSelectedCaseIds(e.target.checked
                      ? Array.from(new Set([...selectedCaseIds, ...filteredCaseIds]))
                      : selectedCaseIds.filter(id => !filteredCaseIds.includes(id)))}
                  />}
                </th>
                {renderExcelHeader("Bank & Branch Details", "details")}
                {renderExcelHeader("Key Officials & Contacts", "officials")}
                {renderExcelHeader("Bill & Recovery Summary", "amount")}
                {renderExcelHeader("Status", "status", "center")}
                <th className="py-3.5 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8E4DF] dark:divide-gray-700 text-xs">
              {filteredCases.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 dark:text-gray-300 font-medium">
                    No recovery cases found. Click "Add New Case" above to register bank cases.
                  </td>
                </tr>
              )}
              {filteredCases.map(c => {
                const totalBill = parseFloat(c.totalBillAmount) || (parseFloat(c.pendingAmount) || 0) + (parseFloat(c.receivedAmount) || 0);
                const received = parseFloat(c.receivedAmount) || 0;
                const tds = parseFloat(c.tdsAmount) || 0;
                const parsedPending = parseFloat(c.pendingAmount);
                const pending = Number.isFinite(parsedPending) ? parsedPending : Math.max(0, totalBill - received - tds);
                const isExpanded = expandedCaseId === c.id;
                const canEditCase = userRole === "Owner" || (currentUserName && String(c.pocName || "").trim().toLowerCase() === currentUserName.trim().toLowerCase());

                return (
                  <React.Fragment key={c.id}>
                    <tr className={`transition-colors ${isExpanded ? 'bg-indigo-50/30 dark:bg-indigo-950/50' : 'hover:bg-white dark:hover:bg-gray-900'}`}>
                      <td className="py-3.5 px-3 text-center align-top">
                        {userRole === "Owner" && <input
                          type="checkbox"
                          aria-label={`Select ${c.bankName} ${c.branchName || "case"}`}
                          checked={selectedCaseIds.includes(Number(c.id))}
                          onChange={e => setSelectedCaseIds(e.target.checked
                            ? [...selectedCaseIds, Number(c.id)]
                            : selectedCaseIds.filter(id => id !== Number(c.id)))}
                        />}
                      </td>
                      {/* Bank & Branch Details (Clickable row trigger) */}
                      <td
                        onClick={() => handleToggleLogs(c)}
                        className="py-3.5 px-4 align-top cursor-pointer group select-none"
                        title="Click to view full notice bills & work breakdown"
                      >
                        <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-gray-100 text-sm group-hover:text-indigo-600 transition-colors">
                          <span className="p-0.5 rounded-full bg-slate-100 dark:bg-gray-800 group-hover:bg-indigo-100 text-slate-500 dark:text-gray-300 group-hover:text-indigo-600 transition-colors">
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </span>
                          <span>{c.bankName}</span>
                        </div>
                        <div className="text-slate-700 dark:text-gray-100 font-medium mt-0.5 pl-5">
                          {c.branchName || 'General Branch'} {c.branchId ? <span className="font-mono text-[10px] text-slate-500 dark:text-gray-300 bg-slate-100 dark:bg-gray-800 px-1.5 py-0.5 rounded font-semibold">({c.branchId})</span> : ''}
                        </div>
                        {c.noticeCount > 0 && (
                          <div className="mt-1 pl-5">
                            <span className="inline-flex items-center gap-1 text-[9px] font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/50 border border-blue-150 px-2 py-0.5 rounded-full shadow-2xs">
                              📄 {c.noticeCount} Notice{c.noticeCount > 1 ? 's' : ''} Invoiced
                            </span>
                          </div>
                        )}
                        {c.rbo && (
                          <div className="text-[10px] text-indigo-600 dark:text-indigo-300 font-semibold mt-1 pl-5">
                            Zone/RBO: <span className="font-normal text-slate-600 dark:text-gray-300">{c.rbo}</span>
                          </div>
                        )}
                        {c.branchEmail && (
                          <div className="text-[10px] text-slate-500 dark:text-gray-300 mt-0.5 truncate max-w-[200px] pl-5" title={c.branchEmail}>
                            ✉️ {c.branchEmail}
                          </div>
                        )}
                      </td>

                      {/* Key Officials */}
                      <td className="py-3.5 px-4 align-top space-y-1">
                        <div className="text-xs font-bold text-violet-800 dark:text-violet-300">
                          <span className="text-[9px] uppercase font-bold text-violet-700 dark:text-violet-300 bg-violet-50 dark:bg-violet-950/50 px-1.5 py-0.5 rounded mr-1">POC</span>
                          {c.pocName || 'Not Assigned'}
                          {userRole === "Owner" && (
                            <button type="button" onClick={(event) => { event.stopPropagation(); setPocCase(c); setSelectedPoc(c.pocName || ""); }} className="ml-2 text-[9px] font-black text-violet-700 dark:text-violet-300 underline underline-offset-2 hover:text-violet-900 dark:hover:text-violet-300">
                              Assign
                            </button>
                          )}
                        </div>
                        <div className="text-xs font-semibold text-slate-800 dark:text-gray-100">
                          <span className="text-[9px] uppercase font-bold text-indigo-600 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/50 px-1.5 py-0.5 rounded mr-1">AO</span>
                          {c.aoName || 'Not Assigned'}
                        </div>
                        <div className="text-xs text-slate-700 dark:text-gray-100">
                          <span className="text-[9px] uppercase font-bold text-emerald-600 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 px-1.5 py-0.5 rounded mr-1">Mgr</span>
                          {c.deptManagerName || 'N/A'} {c.contactNumber && <span className="text-slate-500 dark:text-gray-300 text-[10px]">({c.contactNumber})</span>}
                        </div>
                        {c.foName && (
                          <div className="text-xs text-slate-600 dark:text-gray-300">
                            <span className="text-[9px] uppercase font-bold text-amber-600 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 px-1.5 py-0.5 rounded mr-1">FO</span>
                            {c.foName} {c.foContact && <span className="text-slate-400 dark:text-gray-300 text-[10px]">({c.foContact})</span>}
                          </div>
                        )}
                      </td>

                      {/* Financial Bill & Recovery */}
                      <td className="py-3.5 px-4 align-top">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between gap-3 text-xs">
                            <span className="text-slate-500 dark:text-gray-300 font-medium">Active Bill:</span>
                            <span className="font-bold text-slate-800 dark:text-gray-100">₹{totalBill.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                          </div>
                          <div className="flex items-center justify-between gap-3 text-xs">
                            <span className="text-emerald-700 dark:text-emerald-300 font-medium">Cash Received:</span>
                            <span className="font-bold text-emerald-600 dark:text-emerald-300">₹{received.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                          </div>
                          <div className="flex items-center justify-between gap-3 text-xs">
                            <span className="text-amber-700 dark:text-amber-300 font-medium">TDS Adjusted:</span>
                            <span className="font-bold text-amber-600 dark:text-amber-300">₹{tds.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                          </div>
                          <div className="flex items-center justify-between gap-3 text-xs border-t border-slate-100 dark:border-gray-700 pt-1">
                            <span className="text-rose-700 dark:text-rose-300 font-bold">Pending:</span>
                            <span className="font-extrabold text-rose-600 dark:text-rose-300 text-sm">₹{pending.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                          </div>
                          {c.pendingSince && (
                            <div className="text-[9px] text-slate-400 dark:text-gray-300 mt-1">
                              Due Since: {new Date(c.pendingSince).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-3 text-center align-top">
                        <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          pending <= 0 || c.status === "Settled"
                            ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-gray-700'
                            : received > 0 || c.status === "In Progress"
                            ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-gray-700'
                            : 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-gray-700'
                        }`}>
                          {pending <= 0 ? "Settled" : (c.status || "Open")}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 align-top">
                        <div className="flex flex-col gap-1.5 w-full max-w-[220px] sm:max-w-[240px] mx-auto">
                          {/* Row 1: Primary Action Buttons */}
                          <div className="grid grid-cols-2 gap-1.5">
                            <button
                              onClick={() => setShowFollowUpForm({ show: true, master: c })}
                              className="px-2 py-1.5 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-150 hover:bg-indigo-650 hover:text-white rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1 shadow-sm active:scale-[0.97] cursor-pointer"
                            >
                              <PhoneCall className="w-3 h-3" /> Log Call
                            </button>
                            <button
                              onClick={() => setShowPaymentForm({ show: true, master: c })}
                              className="px-2 py-1.5 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-150 hover:bg-emerald-650 hover:text-white rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1 shadow-sm active:scale-[0.97] cursor-pointer"
                            >
                              <Banknote className="w-3 h-3" /> Log Payment
                            </button>
                          </div>

                          {/* Row 2: Secondary & Admin Buttons */}
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleToggleLogs(c)}
                              className={`px-2 py-1.5 flex-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1 border active:scale-[0.97] cursor-pointer ${
                                isExpanded
                                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
                                  : 'bg-slate-50 dark:bg-gray-800 text-slate-600 dark:text-gray-300 border-slate-205 hover:bg-slate-100 dark:hover:bg-gray-800 hover:text-slate-800 dark:hover:text-gray-100 shadow-sm'
                              }`}
                              title="Toggle Full Work & Notice Details"
                            >
                              <History className="w-3 h-3" /> Details
                            </button>

                            {canEditCase && (
                              <>
                                <button
                                  onClick={() => onEditCase && onEditCase(c)}
                                  className="px-2 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-gray-700 hover:bg-amber-500 hover:text-white transition-all flex items-center justify-center gap-0.5 shadow-sm active:scale-[0.97] cursor-pointer"
                                  title="Edit Case Details"
                                >
                                  <Edit2 className="w-3 h-3" /> Edit
                                </button>
                                {userRole === "Owner" && (
                                  <button
                                    onClick={() => onDeleteCase && onDeleteCase(c.id)}
                                    className="px-2 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-rose-50 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-gray-700 hover:bg-rose-600 hover:text-white transition-all flex items-center justify-center gap-0.5 shadow-sm active:scale-[0.97] cursor-pointer"
                                    title="Delete Case"
                                  >
                                    <Trash2 className="w-3 h-3" /> Delete
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>

                    {/* EXPANDED DROPDOWN SECTION */}
                    {isExpanded && (
                    <tr className="bg-[#FAF9F6] dark:bg-gray-800 border-b-2 border-indigo-200 dark:border-gray-700">
                      <td colSpan={6} className="p-4 sm:p-5">
                        <div className="space-y-5 text-xs font-sans text-[#1C1C1A] dark:text-gray-100">
                          {/* Dropdown Header */}
                          <div className="flex items-center justify-between border-b border-slate-200 dark:border-gray-700 pb-3">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-black text-indigo-900 dark:text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                                <Building className="w-4 h-4 text-indigo-600 dark:text-indigo-300" /> {c.bankName} - {c.branchName || 'Branch'} ({c.branchId || 'N/A'})
                              </span>
                              <span className="text-[10px] text-slate-500 dark:text-gray-300 font-semibold bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-700 px-2 py-0.5 rounded-full">
                                Total Bill: ₹{totalBill.toLocaleString('en-IN')} | Received: ₹{received.toLocaleString('en-IN')} | Pending: ₹{pending.toLocaleString('en-IN')}
                              </span>
                            </div>
                            <button
                              onClick={() => setExpandedCaseId(null)}
                              className="text-[10px] font-bold text-slate-500 dark:text-gray-300 hover:text-rose-600 dark:hover:text-rose-300 flex items-center gap-1 bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-700 px-2.5 py-1 rounded-lg shadow-2xs hover:border-rose-300 dark:hover:border-gray-700 transition-colors cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" /> Close Details
                            </button>
                          </div>

                          {/* 1. Billed Notices Breakdown Table */}
                          <div className="space-y-2">
                            <h4 className="text-[10px] font-black text-slate-700 dark:text-gray-100 uppercase tracking-wider flex items-center gap-1.5">
                              <FileText className="w-3.5 h-3.5 text-blue-600 dark:text-blue-300" /> Invoiced Notices &amp; Work Billing Breakdown ({c.noticesList?.length || 0})
                            </h4>

                            {(!c.noticesList || c.noticesList.length === 0) ? (
                              <div className="text-center py-4 text-slate-400 dark:text-gray-300 text-[11px] font-semibold bg-white dark:bg-gray-900 rounded-xl border border-slate-200 dark:border-gray-700 border-dashed">
                                Direct case billing registered (₹{totalBill.toLocaleString('en-IN')}). No itemized notices linked.
                              </div>
                            ) : (
                              <div className="overflow-x-auto bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-xl shadow-2xs">
                                <table className="w-full text-left text-xs border-collapse">
                                  <thead>
                                    <tr className="bg-slate-50 dark:bg-gray-800 border-b border-slate-200 dark:border-gray-700 text-[9px] uppercase font-bold text-slate-500 dark:text-gray-300 tracking-wider">
                                      <th className="py-2.5 px-3">Notice Type</th>
                                      <th className="py-2.5 px-3">Bill No &amp; Date</th>
                                      <th className="py-2.5 px-3 text-center">Qty</th>
                                      <th className="py-2.5 px-3 text-right">Bill Amount</th>
                                      <th className="py-2.5 px-3 text-right">Received</th>
                                      <th className="py-2.5 px-3 text-right">Pending</th>
                                      <th className="py-2.5 px-3">Delivery / Handover</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100 dark:divide-gray-700 text-xs">
                                    {c.noticesList.map((nItem: any, idx: number) => (
                                      <tr key={idx} className="hover:bg-slate-50/60 dark:hover:bg-gray-800 transition-colors">
                                        <td className="py-2.5 px-3 font-bold text-slate-800 dark:text-gray-100">
                                          {nItem.noticeType}
                                          {nItem.documentUrl && (
                                            <a href={nItem.documentUrl} target="_blank" rel="noreferrer" className="block text-[9px] font-bold text-indigo-600 dark:text-indigo-300 hover:underline mt-0.5">
                                              📎 View Document
                                            </a>
                                          )}
                                        </td>
                                        <td className="py-2.5 px-3 text-slate-600 dark:text-gray-300">
                                          <div className="font-semibold text-slate-800 dark:text-gray-100">{nItem.billNo}</div>
                                          <div className="text-[10px] text-slate-400 dark:text-gray-300">{nItem.billDate ? new Date(nItem.billDate).toLocaleDateString() : 'N/A'}</div>
                                        </td>
                                        <td className="py-2.5 px-3 text-center font-bold text-slate-700 dark:text-gray-100">{nItem.quantity}</td>
                                        <td className="py-2.5 px-3 text-right font-bold text-slate-900 dark:text-gray-100">₹{nItem.billAmount.toLocaleString('en-IN')}</td>
                                        <td className="py-2.5 px-3 text-right font-bold text-emerald-600 dark:text-emerald-300">₹{nItem.amountRcvd.toLocaleString('en-IN')}</td>
                                        <td className="py-2.5 px-3 text-right font-extrabold text-rose-600 dark:text-rose-300">₹{nItem.pendingAmount.toLocaleString('en-IN')}</td>
                                        <td className="py-2.5 px-3 text-slate-600 dark:text-gray-300 text-[10px]">
                                          <div>{nItem.handoverTo ? `To: ${nItem.handoverTo}` : (nItem.dispatchedBy ? `Dispatched: ${nItem.dispatchedBy}` : '—')}</div>
                                          {nItem.handoverRemarks && <div className="text-slate-400 dark:text-gray-300 italic text-[9px]">{nItem.handoverRemarks}</div>}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>

                          {/* 2. History Grid: Follow Ups & Work Logs */}
                          {loadingLocalHistory ? (
                            <div className="flex items-center justify-center py-6 text-slate-400 dark:text-gray-300 text-[11px] font-bold">
                              <RefreshCw className="w-4 h-4 animate-spin mr-1.5" /> Loading history logs...
                            </div>
                          ) : (
                            <div className="space-y-4 pt-1">
                              <div className="space-y-2">
                                <h4 className="text-[10px] font-black text-[#5D5B57] dark:text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                                  <Banknote className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-300" /> Payment Received History ({localPayments.length})
                                </h4>
                                {localPayments.length === 0 ? (
                                  <div className="text-center py-5 text-slate-400 dark:text-gray-300 text-[10px] font-bold bg-white dark:bg-gray-900 rounded-xl border border-slate-200 dark:border-gray-700 border-dashed">
                                    No payments recorded yet.
                                  </div>
                                ) : (
                                  <div className="overflow-x-auto bg-white dark:bg-gray-900 border border-emerald-200 dark:border-gray-700 rounded-xl shadow-2xs">
                                    <table className="w-full min-w-[920px] text-left text-xs border-collapse">
                                      <thead>
                                        <tr className="bg-emerald-50 dark:bg-emerald-950/50 border-b border-emerald-200 dark:border-gray-700 text-[9px] uppercase font-bold text-slate-600 dark:text-gray-300 tracking-wider">
                                          <th className="py-2.5 px-3">Invoice</th>
                                          <th className="py-2.5 px-3">Payment Date</th>
                                          <th className="py-2.5 px-3 text-right">Amount Received</th>
                                          <th className="py-2.5 px-3 text-right">TDS</th>
                                          <th className="py-2.5 px-3">Mode / Reference</th>
                                          <th className="py-2.5 px-3">Received By</th>
                                          <th className="py-2.5 px-3">Remarks</th>
                                          <th className="py-2.5 px-3 text-center">Proof</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-100 dark:divide-gray-700">
                                        {localPayments.map((payment: any) => (
                                          <tr key={payment.id} className="hover:bg-emerald-50/30 dark:hover:bg-emerald-950/50">
                                            <td className="py-2.5 px-3 font-bold text-slate-800 dark:text-gray-100">{payment.invoiceNo || "Branch payment"}</td>
                                            <td className="py-2.5 px-3 text-slate-600 dark:text-gray-300">{payment.paymentDate ? new Date(payment.paymentDate).toLocaleDateString("en-IN") : "—"}</td>
                                            <td className="py-2.5 px-3 text-right font-extrabold text-emerald-700 dark:text-emerald-300">₹{Number(payment.amount || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}</td>
                                            <td className="py-2.5 px-3 text-right font-bold text-amber-700 dark:text-amber-300">₹{Number(payment.tdsAmount || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}</td>
                                            <td className="py-2.5 px-3 text-slate-700 dark:text-gray-100">
                                              <div className="font-semibold">{payment.paymentMode || "—"}</div>
                                              <div className="text-[9px] text-slate-400 dark:text-gray-300">{payment.transactionId || "No reference"}</div>
                                            </td>
                                            <td className="py-2.5 px-3 text-slate-700 dark:text-gray-100 font-semibold">{payment.receivedBy || payment.employeeName || "System"}</td>
                                            <td className="py-2.5 px-3 text-slate-600 dark:text-gray-300 max-w-[220px] whitespace-pre-wrap">{payment.remarks || "—"}</td>
                                            <td className="py-2.5 px-3 text-center">
                                              {payment.proofUrl ? (
                                                <a href={payment.proofUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 dark:border-gray-700 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-1 text-[9px] font-bold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-950/50">
                                                  <FileText className="w-3 h-3" /> View Proof
                                                </a>
                                              ) : <span className="text-[9px] text-slate-400 dark:text-gray-300">Not uploaded</span>}
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                )}
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {/* Follow Up Calls */}
                              <div className="space-y-2">
                                <h4 className="text-[10px] font-black text-[#5D5B57] dark:text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                                  <PhoneCall className="w-3.5 h-3.5 text-indigo-500" /> Follow Up Calls History
                                </h4>
                                {localHistory.length === 0 ? (
                                  <div className="text-center py-5 text-slate-400 dark:text-gray-300 text-[10px] font-bold bg-white dark:bg-gray-900 rounded-xl border border-slate-200 dark:border-gray-700 border-dashed">
                                    No follow up calls recorded yet.
                                  </div>
                                ) : (
                                  <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                                    {localHistory.map(log => (
                                      <div key={log.id} className="bg-white dark:bg-gray-900 p-3 rounded-xl border border-[#E8E4DF] dark:border-gray-700 shadow-2xs space-y-1">
                                        <div className="flex justify-between items-center text-[10px]">
                                          <span className="font-bold text-[#1C1C1A] dark:text-gray-100">Caller: {log.callerName || 'Unknown'}</span>
                                          <span className="font-mono text-slate-400 dark:text-gray-300 bg-slate-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-[9px]">
                                            {log.callDate ? new Date(log.callDate).toLocaleDateString() : new Date(log.createdAt).toLocaleDateString()}
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${log.callStatus === 'Connected' ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-150' : 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-150'}`}>
                                            {log.callStatus}
                                          </span>
                                        </div>
                                        <p className="text-[11px] text-slate-650 dark:text-gray-300 whitespace-pre-wrap">{log.conversationDetails}</p>

                                        <div className="flex items-center gap-3 pt-1 text-[9px]">
                                          {log.callRecordingUrl && (
                                            <a href={log.callRecordingUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 font-bold text-indigo-700 dark:text-indigo-300 hover:text-indigo-900 dark:hover:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/50 px-1.5 py-0.5 rounded transition-colors">
                                              <FileAudio className="w-3 h-3" /> Audio / Attachment
                                            </a>
                                          )}
                                          {log.nextFollowUpDate && (
                                            <span className="flex items-center gap-1 text-amber-600 dark:text-amber-300 font-bold bg-amber-50 dark:bg-amber-950/50 px-1.5 py-0.5 rounded">
                                              <Calendar className="w-3 h-3" /> Next Call: {new Date(log.nextFollowUpDate).toLocaleDateString()}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>

                              {/* Work Logs */}
                              <div className="space-y-2">
                                <h4 className="text-[10px] font-black text-[#5D5B57] dark:text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                                  <Briefcase className="w-3.5 h-3.5 text-blue-500" /> Legal Work &amp; Assignment Logs
                                </h4>
                                {localWorkLogs.length === 0 ? (
                                  <div className="text-center py-5 text-slate-400 dark:text-gray-300 text-[10px] font-bold bg-white dark:bg-gray-900 rounded-xl border border-[#E8E4DF] dark:border-gray-700 border-dashed">
                                    No legal work logs recorded yet.
                                  </div>
                                ) : (
                                  <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                                    {localWorkLogs.map(log => (
                                      <div key={log.id} className="bg-white dark:bg-gray-900 p-3 rounded-xl border border-[#E8E4DF] dark:border-gray-700 shadow-2xs border-l-4 border-l-blue-400 space-y-1">
                                        <div className="flex justify-between items-center text-[10px]">
                                          <span className="px-1.5 py-0.5 bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 rounded text-[9px] font-black uppercase tracking-wider border border-blue-100 dark:border-gray-700">
                                            {log.category}
                                          </span>
                                          <span className="font-mono text-slate-400 dark:text-gray-300 bg-slate-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-[9px]">
                                            {log.workDate ? new Date(log.workDate).toLocaleDateString() : new Date(log.createdAt).toLocaleDateString()}
                                          </span>
                                        </div>
                                        <div className="text-[11px] font-bold text-slate-800 dark:text-gray-100">{log.subCategory}</div>
                                        {log.remarks && <p className="text-[11px] text-slate-650 dark:text-gray-300 mt-1 whitespace-pre-wrap">{log.remarks}</p>}
                                        <div className="text-[9px] text-slate-400 dark:text-gray-300 pt-1">
                                          Staff: <span className="font-bold text-slate-600 dark:text-gray-300">{log.employeeName || 'Unknown'}</span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                              </div>
                            </div>
                          )}
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
      </div>
    </div>
  );
}
