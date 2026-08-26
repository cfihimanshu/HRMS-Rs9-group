import React, { useState } from "react";
import { Search, Filter, PhoneCall, History, Banknote, RefreshCw, Edit2, Trash2, Download, X, Briefcase, Calendar, FileAudio, ChevronDown, ChevronUp, Building, FileText } from "lucide-react";

export default function CasesMasterView({ 
  cases, 
  loading, 
  setShowFollowUpForm, 
  setShowPaymentForm,
  openHistory,
  userRole,
  onEditCase,
  onDeleteCase
}: { 
  cases: any[], 
  loading: boolean,
  setShowFollowUpForm: (state: any) => void,
  setShowPaymentForm: (state: any) => void,
  openHistory: (id: number) => void,
  userRole?: string,
  onEditCase?: (c: any) => void,
  onDeleteCase?: (id: number) => void
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [bankFilter, setBankFilter] = useState("");
  const [branchFilter, setBranchFilter] = useState("");
  const [showFilterOptions, setShowFilterOptions] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  
  const [expandedCaseId, setExpandedCaseId] = useState<number | null>(null);
  const [localHistory, setLocalHistory] = useState<any[]>([]);
  const [localWorkLogs, setLocalWorkLogs] = useState<any[]>([]);
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
    try {
      const isRealMaster = caseId && Number(caseId) > 0;
      const followUpUrl = isRealMaster
        ? `/api/legal-recovery/followup?masterId=${caseId}`
        : `/api/legal-recovery/followup?scope=all`;
      const workLogUrl = isRealMaster
        ? `/api/legal-recovery/work-log?masterId=${caseId}`
        : `/api/legal-recovery/work-log`;

      const [resFollowup, resWorkLogs] = await Promise.all([
        fetch(followUpUrl),
        fetch(workLogUrl)
      ]);
      const resultFollowup = await resFollowup.json();
      const resultWorkLogs = await resWorkLogs.json();
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
    { key: "branchEmail", label: "Branch Email" },
    { key: "aoName", label: "AO Name" },
    { key: "deptManagerName", label: "Branch Manager" },
    { key: "contactNumber", label: "Manager Contact" },
    { key: "foName", label: "Field Officer (FO)" },
    { key: "foContact", label: "FO Contact" },
    { key: "totalBillAmount", label: "Total Bill Amount (₹)" },
    { key: "receivedAmount", label: "Received Amount (₹)" },
    { key: "pendingAmount", label: "Pending Amount (₹)" },
    { key: "status", label: "Status" },
    { key: "pendingSince", label: "Pending Since" },
    { key: "createdAt", label: "Created Date" }
  ];
  const [selectedColumns, setSelectedColumns] = useState<string[]>(allColumns.map(c => c.key));

  const handleExport = () => {
    if (selectedColumns.length === 0) return alert("Select at least one column to export");
    
    // Headers
    const headers = allColumns.filter(c => selectedColumns.includes(c.key)).map(c => c.label);
    
    // Rows
    const rows = filteredCases.map(c => {
      return allColumns.filter(col => selectedColumns.includes(col.key)).map(col => {
        let val = c[col.key];
        if (col.key === 'createdAt' || col.key === 'pendingSince') {
          val = val ? new Date(val).toLocaleDateString() : '';
        }
        if (['pendingAmount', 'totalBillAmount', 'receivedAmount', 'noticeCount'].includes(col.key)) {
          val = val !== undefined && val !== null ? val : 0;
        }
        // Escape quotes and commas
        return `"${String(val || '').replace(/"/g, '""')}"`;
      }).join(",");
    });
    
    const csvContent = [headers.join(","), ...rows].join("\n");
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `Legal_Recovery_Cases_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setShowExportModal(false);
  };

  const uniqueBanks = Array.from(new Set(cases.map(c => c.bankName).filter(Boolean)));
  const uniqueBranches = Array.from(new Set(cases.map(c => c.branchName).filter(Boolean)));

  const filteredCases = cases.filter(c => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matches =
        c.bankName?.toLowerCase().includes(q) ||
        c.branchName?.toLowerCase().includes(q) ||
        c.branchId?.toLowerCase().includes(q) ||
        c.aoName?.toLowerCase().includes(q) ||
        c.deptManagerName?.toLowerCase().includes(q) ||
        c.foName?.toLowerCase().includes(q) ||
        c.rbo?.toLowerCase().includes(q) ||
        c.branchEmail?.toLowerCase().includes(q);
      if (!matches) return false;
    }

    if (bankFilter && c.bankName !== bankFilter) return false;
    if (branchFilter && c.branchName !== branchFilter) return false;
    
    return true;
  });

  // Calculate dynamic totals from filtered cases
  const totalCasesCount = filteredCases.length;
  const totalNoticesCount = filteredCases.reduce((sum, c) => sum + (parseInt(c.noticeCount) || 0), 0);
  const totalBillSum = filteredCases.reduce((sum, c) => sum + (parseFloat(c.totalBillAmount) || 0), 0);
  const totalReceivedSum = filteredCases.reduce((sum, c) => sum + (parseFloat(c.receivedAmount) || 0), 0);
  const totalPendingSum = filteredCases.reduce((sum, c) => sum + (parseFloat(c.pendingAmount) || 0), 0);
  const settledCount = filteredCases.filter(c => c.status === "Settled" || (parseFloat(c.pendingAmount) <= 0 && parseFloat(c.totalBillAmount) > 0)).length;
  const filteredUniqueBanks = Array.from(new Set(filteredCases.map(c => c.bankName).filter(Boolean)));
  const filteredUniqueBranches = Array.from(new Set(filteredCases.map(c => `${c.bankName}_${c.branchName}`).filter(Boolean)));

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Financial KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white border border-[#E8E4DF] rounded-xl p-3.5 shadow-2xs">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Bank Cases</div>
          <div className="text-xl font-black text-slate-900 mt-1">{totalCasesCount}</div>
          <div className="text-[9px] text-slate-400 mt-0.5">{filteredUniqueBanks.length} Banks · {filteredUniqueBranches.length} Branches</div>
        </div>

        <div className="bg-white border border-blue-100 rounded-xl p-3.5 shadow-2xs">
          <div className="text-[10px] font-bold uppercase tracking-wider text-blue-600">Total Notices</div>
          <div className="text-xl font-black text-blue-900 mt-1">{totalNoticesCount}</div>
          <div className="text-[9px] text-blue-500 mt-0.5 font-medium">Invoiced Notices</div>
        </div>

        <div className="bg-white border border-indigo-100 rounded-xl p-3.5 shadow-2xs">
          <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">Total Invoiced / Bill</div>
          <div className="text-xl font-black text-indigo-900 mt-1">₹{totalBillSum.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</div>
          <div className="text-[9px] text-indigo-500 mt-0.5 font-medium">Billed Amount</div>
        </div>

        <div className="bg-white border border-emerald-100 rounded-xl p-3.5 shadow-2xs">
          <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Total Received</div>
          <div className="text-xl font-black text-emerald-700 mt-1">₹{totalReceivedSum.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</div>
          <div className="text-[9px] text-emerald-600 mt-0.5 font-medium">
            {totalBillSum > 0 ? `${Math.min(100, Math.round((totalReceivedSum / totalBillSum) * 100))}% Recovered` : '0%'}
          </div>
        </div>

        <div className="bg-white border border-rose-100 rounded-xl p-3.5 shadow-2xs">
          <div className="text-[10px] font-bold uppercase tracking-wider text-rose-600">Total Pending</div>
          <div className="text-xl font-black text-rose-700 mt-1">₹{totalPendingSum.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</div>
          <div className="text-[9px] text-rose-500 mt-0.5 font-medium">Outstanding Balance</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Settled Cases</div>
          <div className="text-xl font-black text-emerald-600 mt-1">{settledCount} / {totalCasesCount}</div>
          <div className="text-[9px] text-slate-400 mt-0.5 font-medium">100% Cleared</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="bg-[#FCFBF9] border border-[#E8E4DF] p-3.5 rounded-xl flex-1 flex items-center gap-3">
          <Search className="w-4 h-4 text-[#9C9890]" />
          <input 
            type="text" 
            className="bg-transparent border-none focus:outline-none text-xs w-full font-semibold text-slate-700 placeholder:text-[#9C9890] placeholder:font-normal" 
            placeholder="Search Cases by Bank, Branch, AO, Manager, FO or RBO..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="relative flex items-center">
          <button 
            onClick={() => setShowFilterOptions(!showFilterOptions)}
            className={`px-4 py-3.5 h-full border border-[#E8E4DF] hover:bg-[#F5F0EA] rounded-xl text-[10px] font-semibold tracking-wider uppercase transition-all flex items-center gap-1.5 shadow-sm ${showFilterOptions || bankFilter || branchFilter ? 'bg-[#F5F0EA] text-[#1C1C1A]' : 'bg-[#FCFBF9] text-[#5D5B57]'}`}
          >
            <Filter className="w-3.5 h-3.5" /> {(bankFilter || branchFilter) ? "Filtered" : "Filter"}
          </button>
          
          {showFilterOptions && (
            <div className="absolute right-0 top-full mt-2 w-72 bg-white border border-[#E8E4DF] rounded-xl shadow-2xl z-50 overflow-hidden animate-fade-in p-4 grid gap-4">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Bank</label>
                <select value={bankFilter} onChange={e => setBankFilter(e.target.value)} className="w-full text-xs p-2.5 border border-[#E8E4DF] rounded-lg bg-slate-50 focus:outline-none focus:border-indigo-400 font-semibold text-slate-700">
                  <option value="">All Banks</option>
                  {uniqueBanks.map(b => <option key={String(b)} value={String(b)}>{String(b)}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Branch</label>
                <select value={branchFilter} onChange={e => setBranchFilter(e.target.value)} className="w-full text-xs p-2.5 border border-[#E8E4DF] rounded-lg bg-slate-50 focus:outline-none focus:border-indigo-400 font-semibold text-slate-700">
                  <option value="">All Branches</option>
                  {uniqueBranches.map(br => <option key={String(br)} value={String(br)}>{String(br)}</option>)}
                </select>
              </div>
              
              <div className="flex justify-end mt-2 pt-3 border-t border-slate-100">
                <button onClick={() => {
                  setBankFilter("");
                  setBranchFilter("");
                  setShowFilterOptions(false);
                }} className="text-[10px] text-rose-600 font-bold uppercase tracking-wider hover:underline flex items-center gap-1">
                  <RefreshCw className="w-3 h-3" /> Clear Filters
                </button>
              </div>
            </div>
          )}
        </div>
        
        {userRole === "Owner" && (
          <button 
            onClick={() => setShowExportModal(true)}
            className="px-4 py-3.5 h-full border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 rounded-xl text-[10px] font-semibold tracking-wider uppercase transition-all flex items-center gap-1.5 shadow-sm text-emerald-800"
          >
            <Download className="w-3.5 h-3.5" /> Export
          </button>
        )}
      </div>

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/20 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-slide-up">
            <div className="px-6 py-4 border-b border-[#E8E4DF] flex justify-between items-center">
              <h2 className="text-sm font-black text-emerald-900 uppercase tracking-wider flex items-center gap-2">
                <Download className="w-5 h-5 text-emerald-500" /> Export Cases
              </h2>
              <button onClick={() => setShowExportModal(false)} className="text-slate-400 hover:text-rose-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <p className="text-xs text-slate-500 mb-4 font-semibold">Select the columns you want to include in the exported file:</p>
              
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
                      className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="text-xs font-bold text-slate-700 group-hover:text-emerald-700 transition-colors">{col.label}</span>
                  </label>
                ))}
              </div>
              
              <div className="flex gap-3 pt-4 border-t border-[#E8E4DF]">
                <button
                  type="button"
                  onClick={() => setShowExportModal(false)}
                  className="flex-1 px-4 py-3 bg-white border border-[#E8E4DF] text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 transition-colors"
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

      {/* Table */}
      <div className="bg-[#FCFBF9] border border-[#E8E4DF] rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left min-w-max">
            <thead>
              <tr className="border-b border-[#E8E4DF] bg-[#F5F0EA]/40 text-[#5D5B57] text-[10px] uppercase font-bold tracking-wider">
                <th className="py-3.5 px-4">Bank &amp; Branch Details</th>
                <th className="py-3.5 px-4">Key Officials &amp; Contacts</th>
                <th className="py-3.5 px-4">Bill &amp; Recovery Summary</th>
                <th className="py-3.5 px-3 text-center">Status</th>
                <th className="py-3.5 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8E4DF] text-xs">
              {filteredCases.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400 font-medium">
                    No recovery cases found. Click "Add New Case" above to register bank cases.
                  </td>
                </tr>
              )}
              {filteredCases.map(c => {
                const totalBill = parseFloat(c.totalBillAmount) || (parseFloat(c.pendingAmount) || 0) + (parseFloat(c.receivedAmount) || 0);
                const received = parseFloat(c.receivedAmount) || 0;
                const pending = parseFloat(c.pendingAmount) !== undefined ? parseFloat(c.pendingAmount) : Math.max(0, totalBill - received);
                const isExpanded = expandedCaseId === c.id;

                return (
                  <React.Fragment key={c.id}>
                    <tr className={`transition-colors ${isExpanded ? 'bg-indigo-50/30' : 'hover:bg-white'}`}>
                      {/* Bank & Branch Details (Clickable row trigger) */}
                      <td 
                        onClick={() => handleToggleLogs(c)}
                        className="py-3.5 px-4 align-top cursor-pointer group select-none"
                        title="Click to view full notice bills & work breakdown"
                      >
                        <div className="flex items-center gap-1.5 font-bold text-slate-900 text-sm group-hover:text-indigo-600 transition-colors">
                          <span className="p-0.5 rounded-full bg-slate-100 group-hover:bg-indigo-100 text-slate-500 group-hover:text-indigo-600 transition-colors">
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </span>
                          <span>{c.bankName}</span>
                        </div>
                        <div className="text-slate-700 font-medium mt-0.5 pl-5">
                          {c.branchName || 'General Branch'} {c.branchId ? <span className="font-mono text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded font-semibold">({c.branchId})</span> : ''}
                        </div>
                        {c.noticeCount > 0 && (
                          <div className="mt-1 pl-5">
                            <span className="inline-flex items-center gap-1 text-[9px] font-bold text-blue-700 bg-blue-50 border border-blue-150 px-2 py-0.5 rounded-full shadow-2xs">
                              📄 {c.noticeCount} Notice{c.noticeCount > 1 ? 's' : ''} Invoiced
                            </span>
                          </div>
                        )}
                        {c.rbo && (
                          <div className="text-[10px] text-indigo-600 font-semibold mt-1 pl-5">
                            Zone/RBO: <span className="font-normal text-slate-600">{c.rbo}</span>
                          </div>
                        )}
                        {c.branchEmail && (
                          <div className="text-[10px] text-slate-500 mt-0.5 truncate max-w-[200px] pl-5" title={c.branchEmail}>
                            ✉️ {c.branchEmail}
                          </div>
                        )}
                      </td>

                      {/* Key Officials */}
                      <td className="py-3.5 px-4 align-top space-y-1">
                        <div className="text-xs font-semibold text-slate-800">
                          <span className="text-[9px] uppercase font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded mr-1">AO</span>
                          {c.aoName || 'Not Assigned'}
                        </div>
                        <div className="text-xs text-slate-700">
                          <span className="text-[9px] uppercase font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded mr-1">Mgr</span>
                          {c.deptManagerName || 'N/A'} {c.contactNumber && <span className="text-slate-500 text-[10px]">({c.contactNumber})</span>}
                        </div>
                        {c.foName && (
                          <div className="text-xs text-slate-600">
                            <span className="text-[9px] uppercase font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded mr-1">FO</span>
                            {c.foName} {c.foContact && <span className="text-slate-400 text-[10px]">({c.foContact})</span>}
                          </div>
                        )}
                      </td>

                      {/* Financial Bill & Recovery */}
                      <td className="py-3.5 px-4 align-top">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between gap-3 text-xs">
                            <span className="text-slate-500 font-medium">Total Bill:</span>
                            <span className="font-bold text-slate-800">₹{totalBill.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                          </div>
                          <div className="flex items-center justify-between gap-3 text-xs">
                            <span className="text-emerald-700 font-medium">Received:</span>
                            <span className="font-bold text-emerald-600">₹{received.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                          </div>
                          <div className="flex items-center justify-between gap-3 text-xs border-t border-slate-100 pt-1">
                            <span className="text-rose-700 font-bold">Pending:</span>
                            <span className="font-extrabold text-rose-600 text-sm">₹{pending.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                          </div>
                          {c.pendingSince && (
                            <div className="text-[9px] text-slate-400 mt-1">
                              Due Since: {new Date(c.pendingSince).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-3 text-center align-top">
                        <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          pending <= 0 || c.status === "Settled"
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : received > 0 || c.status === "In Progress"
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-blue-50 text-blue-700 border border-blue-200'
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
                              className="px-2 py-1.5 bg-indigo-50 text-indigo-700 border border-indigo-150 hover:bg-indigo-650 hover:text-white rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1 shadow-sm active:scale-[0.97] cursor-pointer"
                            >
                              <PhoneCall className="w-3 h-3" /> Log Call
                            </button>
                            <button
                              onClick={() => setShowPaymentForm({ show: true, master: c })}
                              className="px-2 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-150 hover:bg-emerald-650 hover:text-white rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1 shadow-sm active:scale-[0.97] cursor-pointer"
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
                                  : 'bg-slate-50 text-slate-600 border-slate-205 hover:bg-slate-100 hover:text-slate-800 shadow-sm'
                              }`}
                              title="Toggle Full Work & Notice Details"
                            >
                              <History className="w-3 h-3" /> Details
                            </button>

                            {userRole === "Owner" && (
                              <>
                                <button
                                  onClick={() => onEditCase && onEditCase(c)}
                                  className="px-2 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-500 hover:text-white transition-all flex items-center justify-center gap-0.5 shadow-sm active:scale-[0.97] cursor-pointer"
                                  title="Edit Case Details"
                                >
                                  <Edit2 className="w-3 h-3" /> Edit
                                </button>
                                <button
                                  onClick={() => onDeleteCase && onDeleteCase(c.id)}
                                  className="px-2 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-600 hover:text-white transition-all flex items-center justify-center gap-0.5 shadow-sm active:scale-[0.97] cursor-pointer"
                                  title="Delete Case"
                                >
                                  <Trash2 className="w-3 h-3" /> Delete
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                    
                    {/* EXPANDED DROPDOWN SECTION */}
                    {isExpanded && (
                    <tr className="bg-[#FAF9F6] border-b-2 border-indigo-200">
                      <td colSpan={5} className="p-4 sm:p-5">
                        <div className="space-y-5 text-xs font-sans text-[#1C1C1A]">
                          {/* Dropdown Header */}
                          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-black text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
                                <Building className="w-4 h-4 text-indigo-600" /> {c.bankName} - {c.branchName || 'Branch'} ({c.branchId || 'N/A'})
                              </span>
                              <span className="text-[10px] text-slate-500 font-semibold bg-white border border-slate-200 px-2 py-0.5 rounded-full">
                                Total Bill: ₹{totalBill.toLocaleString('en-IN')} | Received: ₹{received.toLocaleString('en-IN')} | Pending: ₹{pending.toLocaleString('en-IN')}
                              </span>
                            </div>
                            <button
                              onClick={() => setExpandedCaseId(null)}
                              className="text-[10px] font-bold text-slate-500 hover:text-rose-600 flex items-center gap-1 bg-white border border-slate-200 px-2.5 py-1 rounded-lg shadow-2xs hover:border-rose-300 transition-colors cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" /> Close Details
                            </button>
                          </div>

                          {/* 1. Billed Notices Breakdown Table */}
                          <div className="space-y-2">
                            <h4 className="text-[10px] font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                              <FileText className="w-3.5 h-3.5 text-blue-600" /> Invoiced Notices &amp; Work Billing Breakdown ({c.noticesList?.length || 0})
                            </h4>
                            
                            {(!c.noticesList || c.noticesList.length === 0) ? (
                              <div className="text-center py-4 text-slate-400 text-[11px] font-semibold bg-white rounded-xl border border-slate-200 border-dashed">
                                Direct case billing registered (₹{totalBill.toLocaleString('en-IN')}). No itemized notices linked.
                              </div>
                            ) : (
                              <div className="overflow-x-auto bg-white border border-slate-200 rounded-xl shadow-2xs">
                                <table className="w-full text-left text-xs border-collapse">
                                  <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200 text-[9px] uppercase font-bold text-slate-500 tracking-wider">
                                      <th className="py-2.5 px-3">Notice Type</th>
                                      <th className="py-2.5 px-3">Bill No &amp; Date</th>
                                      <th className="py-2.5 px-3 text-center">Qty</th>
                                      <th className="py-2.5 px-3 text-right">Bill Amount</th>
                                      <th className="py-2.5 px-3 text-right">Received</th>
                                      <th className="py-2.5 px-3 text-right">Pending</th>
                                      <th className="py-2.5 px-3">Delivery / Handover</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100 text-xs">
                                    {c.noticesList.map((nItem: any, idx: number) => (
                                      <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                                        <td className="py-2.5 px-3 font-bold text-slate-800">
                                          {nItem.noticeType}
                                          {nItem.documentUrl && (
                                            <a href={nItem.documentUrl} target="_blank" rel="noreferrer" className="block text-[9px] font-bold text-indigo-600 hover:underline mt-0.5">
                                              📎 View Document
                                            </a>
                                          )}
                                        </td>
                                        <td className="py-2.5 px-3 text-slate-600">
                                          <div className="font-semibold text-slate-800">{nItem.billNo}</div>
                                          <div className="text-[10px] text-slate-400">{nItem.billDate ? new Date(nItem.billDate).toLocaleDateString() : 'N/A'}</div>
                                        </td>
                                        <td className="py-2.5 px-3 text-center font-bold text-slate-700">{nItem.quantity}</td>
                                        <td className="py-2.5 px-3 text-right font-bold text-slate-900">₹{nItem.billAmount.toLocaleString('en-IN')}</td>
                                        <td className="py-2.5 px-3 text-right font-bold text-emerald-600">₹{nItem.amountRcvd.toLocaleString('en-IN')}</td>
                                        <td className="py-2.5 px-3 text-right font-extrabold text-rose-600">₹{nItem.pendingAmount.toLocaleString('en-IN')}</td>
                                        <td className="py-2.5 px-3 text-slate-600 text-[10px]">
                                          <div>{nItem.handoverTo ? `To: ${nItem.handoverTo}` : (nItem.dispatchedBy ? `Dispatched: ${nItem.dispatchedBy}` : '—')}</div>
                                          {nItem.handoverRemarks && <div className="text-slate-400 italic text-[9px]">{nItem.handoverRemarks}</div>}
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
                            <div className="flex items-center justify-center py-6 text-slate-400 text-[11px] font-bold">
                              <RefreshCw className="w-4 h-4 animate-spin mr-1.5" /> Loading history logs...
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                              {/* Follow Up Calls */}
                              <div className="space-y-2">
                                <h4 className="text-[10px] font-black text-[#5D5B57] uppercase tracking-wider flex items-center gap-1.5">
                                  <PhoneCall className="w-3.5 h-3.5 text-indigo-500" /> Follow Up Calls History
                                </h4>
                                {localHistory.length === 0 ? (
                                  <div className="text-center py-5 text-slate-400 text-[10px] font-bold bg-white rounded-xl border border-slate-200 border-dashed">
                                    No follow up calls recorded yet.
                                  </div>
                                ) : (
                                  <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                                    {localHistory.map(log => (
                                      <div key={log.id} className="bg-white p-3 rounded-xl border border-[#E8E4DF] shadow-2xs space-y-1">
                                        <div className="flex justify-between items-center text-[10px]">
                                          <span className="font-bold text-[#1C1C1A]">Caller: {log.callerName || 'Unknown'}</span>
                                          <span className="font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded text-[9px]">
                                            {log.callDate ? new Date(log.callDate).toLocaleDateString() : new Date(log.createdAt).toLocaleDateString()}
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${log.callStatus === 'Connected' ? 'bg-emerald-50 text-emerald-700 border border-emerald-150' : 'bg-rose-50 text-rose-700 border border-rose-150'}`}>
                                            {log.callStatus}
                                          </span>
                                        </div>
                                        <p className="text-[11px] text-slate-650 whitespace-pre-wrap">{log.conversationDetails}</p>

                                        <div className="flex items-center gap-3 pt-1 text-[9px]">
                                          {log.callRecordingUrl && (
                                            <a href={log.callRecordingUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 font-bold text-indigo-700 hover:text-indigo-900 bg-indigo-50 px-1.5 py-0.5 rounded transition-colors">
                                              <FileAudio className="w-3 h-3" /> Audio / Attachment
                                            </a>
                                          )}
                                          {log.nextFollowUpDate && (
                                            <span className="flex items-center gap-1 text-amber-600 font-bold bg-amber-50 px-1.5 py-0.5 rounded">
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
                                <h4 className="text-[10px] font-black text-[#5D5B57] uppercase tracking-wider flex items-center gap-1.5">
                                  <Briefcase className="w-3.5 h-3.5 text-blue-500" /> Legal Work &amp; Assignment Logs
                                </h4>
                                {localWorkLogs.length === 0 ? (
                                  <div className="text-center py-5 text-slate-400 text-[10px] font-bold bg-white rounded-xl border border-[#E8E4DF] border-dashed">
                                    No legal work logs recorded yet.
                                  </div>
                                ) : (
                                  <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                                    {localWorkLogs.map(log => (
                                      <div key={log.id} className="bg-white p-3 rounded-xl border border-[#E8E4DF] shadow-2xs border-l-4 border-l-blue-400 space-y-1">
                                        <div className="flex justify-between items-center text-[10px]">
                                          <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded text-[9px] font-black uppercase tracking-wider border border-blue-100">
                                            {log.category}
                                          </span>
                                          <span className="font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded text-[9px]">
                                            {log.workDate ? new Date(log.workDate).toLocaleDateString() : new Date(log.createdAt).toLocaleDateString()}
                                          </span>
                                        </div>
                                        <div className="text-[11px] font-bold text-slate-800">{log.subCategory}</div>
                                        {log.remarks && <p className="text-[11px] text-slate-650 mt-1 whitespace-pre-wrap">{log.remarks}</p>}
                                        <div className="text-[9px] text-slate-400 pt-1">
                                          Staff: <span className="font-bold text-slate-600">{log.employeeName || 'Unknown'}</span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
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
