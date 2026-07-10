import React, { useState } from "react";
import { Briefcase, Search, CheckCircle, ChevronDown, ChevronRight, Check, Download, Table, LayoutList, Filter } from "lucide-react";

const WORK_CATEGORIES: Record<string, string[]> = {
  "ADVOCATE NOTICE": [
    "TAKE NOTICE ASSIGNMENT", "COLLECT NOTICE DATA", "PREPARE NOTICE LIST",
    "GENERATE NOTICE VIA SOFTWARE/MAIL MERGE", "DISPATCH NOTICES", "PREPARE BILL (BILL BANWANA)", "REQUEST PAYMENT"
  ],
  "RECOVERY SUIT / PSA APPLICATION": [
    "PREPARE RECOVERY SUIT / PSA APPLICATION", "COLLECT DOCUMENTS FROM BRANCH",
    "PREPARE CASE FILE", "SUBMIT TO ADVOCATE", "PREPARE BILL (BILL BANWANA)", "REQUEST PAYMENT"
  ],
  "RACO RODA": [
    "SCAN RODA FILE", "PREPARE RODA SET", "PREPARE RODA FILE",
    "SUBMIT RODA FILE TO SDM OFFICE", "PREPARE BILL (BILL BANWANA)", "REQUEST PAYMENT", "ISSUE SUMMONS"
  ],
  "SARFEASI NOTICE": [
    "COLLECT SARFAESI NOTICE DATA", "DRAFT SARFAESI NOTICE",
    "DISPATCH NOTICE", "OBTAIN POST OFFICE TRACKING", "PREPARE BILL (BILL BANWANA)", "REQUEST PAYMENT"
  ],
  "SY. POSSESSION": [
    "SOE TYPING & PRINTING", "TAKE SYMBOLIC POSSESSION", "DISPATCH POSSESSION NOTICE",
    "PUBLISH IN NEWSPAPER", "PREPARE BILL (BILL BANWANA)", "REQUEST PAYMENT"
  ],
  "DM ORDER": [
    "DM APPLICATION TYPING & PRINTING", "PREPARE DM APPLICATION",
    "SUBMIT APPLICATION IN DM COURT", "OBTAIN DM ORDER", "PREPARE BILL (BILL BANWANA)", "REQUEST PAYMENT"
  ],
  "SP ORDER": [
    "SP APPLICATION TYPING & PRINTING", "SUBMIT SP APPLICATION", "OBTAIN ASSESSMENT REPORT FROM POLICE STATION",
    "OBTAIN ORDER FOR DD", "SUBMIT DD WITH SP OFFICE LETTER",
    "OBTAIN ORDER FOR POSSESSION", "ARRANGE POLICE ASSISTANCE", "PREPARE BILL (BILL BANWANA)", "REQUEST PAYMENT"
  ],
  "PY. POSSESSION": [
    "SOE TYPING & PRINTING", "TAKE PHYSICAL POSSESSION", "DISPATCH POSSESSION NOTICE",
    "PUBLISH IN NEWSPAPER", "PREPARE BILL (BILL BANWANA)", "REQUEST PAYMENT"
  ],
  "SEIZER": [
    "COLLECT NOTICE DATA", "PREPARE NOTICE", "DISPATCH NOTICE", "TRACK POSTAL DELIVERY", "PREPARE BILL (BILL BANWANA)", "REQUEST PAYMENT"
  ]
};

export default function LegalWorkLogsView({ workLogs, branches, banks, loading, onRefresh }: { workLogs: any[], branches: any[], banks: any[], loading: boolean, onRefresh?: () => void }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBranch, setSelectedBranch] = useState<number | null>(null);

  const getBankName = (bankId: number) => {
    return banks?.find((b: any) => b.id == bankId)?.bankName || "Unknown Bank";
  };
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [updatingTask, setUpdatingTask] = useState<string | null>(null);
  const [activeStepForm, setActiveStepForm] = useState<string | null>(null);
  const [stepRemarks, setStepRemarks] = useState<string>("");
  const [viewMode, setViewMode] = useState<"checklist" | "reports">("checklist");
  const [reportSearchQuery, setReportSearchQuery] = useState("");
  const [reportCategoryFilter, setReportCategoryFilter] = useState("");

  const filteredBranches = branches.filter(b => {
    const bankName = getBankName(b.bankId);
    return (
      (bankName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (b?.branchName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (b?.aoName || "").toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const toggleCategory = (cat: string) => {
    setExpandedCategories(prev => ({ ...prev, [cat]: !prev[cat] }));
  };

  const handleMarkTaskDone = async (branchId: number, category: string, subCategory: string, remarks: string) => {
    const taskKey = `${branchId}-${category}-${subCategory}`;
    setUpdatingTask(taskKey);
    try {
      const res = await fetch("/api/legal-recovery/work-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          masterId: branchId,
          category,
          subCategory,
          remarks: remarks || "Marked as completed",
          workDate: new Date().toISOString().split('T')[0]
        })
      });
      if (res.ok) {
        setActiveStepForm(null);
        setStepRemarks("");
        if (onRefresh) onRefresh();
      }
    } catch (error) {
      console.error(error);
      alert("Failed to update work task.");
    } finally {
      setUpdatingTask(null);
    }
  };

  const getCompletedTaskLog = (branchId: number, category: string, subCategory: string) => {
    return workLogs.find(log => log.masterId === branchId && log.category === category && log.subCategory === subCategory);
  };

  const getTaskCompletionData = (branchId: number, category: string) => {
    const steps = WORK_CATEGORIES[category];
    const completed = steps.filter(step => getCompletedTaskLog(branchId, category, step)).length;
    return { completed, total: steps.length, percentage: Math.round((completed / steps.length) * 100) };
  };

  const getBranchDetails = (masterId: number) => {
    return branches.find(b => b.id === masterId);
  };

  const filteredWorkLogs = workLogs.filter(log => {
    const bObj = getBranchDetails(log.masterId);
    const bankName = bObj ? getBankName(bObj.bankId) : "";
    const matchesSearch = 
      (log.employeeName || "").toLowerCase().includes(reportSearchQuery.toLowerCase()) ||
      (log.category || "").toLowerCase().includes(reportSearchQuery.toLowerCase()) ||
      (bankName || "").toLowerCase().includes(reportSearchQuery.toLowerCase());
    const matchesCategory = reportCategoryFilter ? log.category === reportCategoryFilter : true;
    return matchesSearch && matchesCategory;
  });

  const exportWorkLogsCSV = () => {
    const headers = ["Date", "Employee", "Bank", "Branch", "Category", "Task/Step", "Remarks"];
    const rows = filteredWorkLogs.map(log => {
      const bObj = getBranchDetails(log.masterId);
      return [
        log.workDate ? new Date(log.workDate).toLocaleDateString() : new Date(log.createdAt).toLocaleDateString(),
        `"${log.employeeName || 'Unknown'}"`,
        `"${bObj ? getBankName(bObj.bankId) : 'N/A'}"`,
        `"${bObj?.branchName || 'N/A'}"`,
        `"${log.category}"`,
        `"${log.subCategory}"`,
        `"${log.remarks || ''}"`
      ].join(",");
    });
    const csvContent = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Legal_Work_Reports_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl border border-[#E8E4DF] shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
            <Briefcase className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-black text-[#1C1C1A] uppercase tracking-wider">
              {viewMode === "checklist" ? "Legal Work Boards" : "Employee Work Reports"}
            </h2>
            <p className="text-xs text-[#9C9890] font-semibold mt-0.5">
              {viewMode === "checklist" ? "Manage case execution checklists" : "Global history and reports of tasks"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
          <button 
            onClick={() => setViewMode("checklist")}
            className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors flex items-center gap-1 ${viewMode === "checklist" ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <LayoutList className="w-3.5 h-3.5" /> Checklists
          </button>
          <button 
            onClick={() => setViewMode("reports")}
            className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors flex items-center gap-1 ${viewMode === "reports" ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <Table className="w-3.5 h-3.5" /> Reports
          </button>
        </div>
      </div>

      {viewMode === "checklist" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start animate-fade-in">
        {/* Cases List */}
        <div className="lg:col-span-1 bg-white border border-[#E8E4DF] rounded-xl overflow-hidden shadow-sm h-[600px] flex flex-col">
          <div className="p-4 bg-slate-50 border-b border-[#E8E4DF]">
            <div className="relative w-full mb-3">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search Branches..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white border border-[#E8E4DF] focus:border-blue-500 rounded-xl text-xs focus:outline-none transition-colors"
              />
            </div>
            <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider">Select a Branch</h3>
          </div>
          <div className="overflow-y-auto flex-1 p-2 space-y-2">
            {filteredBranches.map(b => (
              <button
                key={b.id}
                onClick={() => setSelectedBranch(b.id)}
                className={`w-full text-left p-3 rounded-lg border transition-all ${
                  selectedBranch === b.id 
                    ? 'border-blue-500 bg-blue-50 shadow-sm' 
                    : 'border-transparent hover:bg-slate-50 border-slate-100'
                }`}
              >
                <div className="font-bold text-xs text-slate-800">{getBankName(b.bankId)}</div>
                <div className="text-[10px] text-slate-500 font-semibold mb-1">Branch: {b.branchName}</div>
                <div className="text-[10px] text-[#9C9890]">AO: {b.aoName || 'N/A'}</div>
              </button>
            ))}
            {filteredBranches.length === 0 && (
              <div className="text-center p-6 text-xs text-slate-400 font-semibold">No branches match your search.</div>
            )}
          </div>
        </div>

        {/* Work Checklist Panel */}
        <div className="lg:col-span-2 bg-white border border-[#E8E4DF] rounded-xl overflow-hidden shadow-sm h-[600px] flex flex-col">
          {selectedBranch ? (
            <>
              {(() => {
                const b = branches.find((branchObj: any) => branchObj.id === selectedBranch);
                const bankName = b ? getBankName(b.bankId) : "";
                return (
                  <div className="p-5 border-b border-[#E8E4DF] bg-slate-50 flex items-center justify-between">
                    <div>
                      <h2 className="text-sm font-black text-slate-800">{bankName}</h2>
                      <div className="text-xs text-slate-500 font-semibold mt-1">Branch: {b?.branchName}</div>
                    </div>
                  </div>
                );
              })()}
              
              <div className="p-6 overflow-y-auto flex-1 space-y-4">
                {Object.keys(WORK_CATEGORIES).map(category => {
                  const progress = getTaskCompletionData(selectedBranch, category);
                  const isExpanded = expandedCategories[category];
                  
                  return (
                    <div key={category} className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                      <button 
                        onClick={() => toggleCategory(category)}
                        className="w-full flex items-center justify-between p-4 bg-white hover:bg-slate-50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          {isExpanded ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronRight className="w-5 h-5 text-slate-400" />}
                          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">{category}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] font-bold text-slate-500">{progress.completed} / {progress.total}</span>
                          <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all ${progress.percentage === 100 ? 'bg-emerald-500' : 'bg-blue-500'}`}
                              style={{ width: `${progress.percentage}%` }}
                            />
                          </div>
                        </div>
                      </button>
                      
                      {isExpanded && (
                        <div className="bg-slate-50 border-t border-slate-200 p-4 space-y-2">
                          {WORK_CATEGORIES[category].map((step, idx) => {
                            const completedLog = getCompletedTaskLog(selectedBranch, category, step);
                            const done = !!completedLog;
                            const taskKey = `${selectedBranch}-${category}-${step}`;
                            const isUpdating = updatingTask === taskKey;
                            
                            return (
                              <div key={step} className="flex flex-col p-3 bg-white border border-slate-200 rounded-lg shadow-sm group gap-3">
                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 w-full">
                                  <div className="flex items-center gap-3">
                                    <div className={`flex items-center justify-center w-6 h-6 rounded-full border-2 transition-colors ${
                                      done ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 text-transparent'
                                    }`}>
                                      <Check className="w-3.5 h-3.5" />
                                    </div>
                                    <span className={`text-[11px] font-bold tracking-wide ${done ? 'text-emerald-700' : 'text-slate-600 group-hover:text-slate-900'}`}>
                                      {idx + 1}. {step}
                                    </span>
                                  </div>
                                  {!done && activeStepForm !== taskKey && (
                                    <button
                                      onClick={() => { setActiveStepForm(taskKey); setStepRemarks(""); }}
                                      className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white border border-blue-200 rounded text-[10px] font-bold uppercase tracking-wide transition-colors sm:ml-auto"
                                    >
                                      Mark Done
                                    </button>
                                  )}
                                  {done && (
                                    <div className="flex flex-col sm:items-end sm:ml-auto bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100">
                                      <span className="text-[10px] font-black text-emerald-600 flex items-center gap-1 uppercase tracking-wider mb-0.5">
                                        <CheckCircle className="w-3 h-3" /> Completed
                                      </span>
                                      <span className="text-[9px] font-bold text-slate-500">
                                        By: <span className="text-slate-700">{completedLog.employeeName || 'Unknown'}</span> 
                                        {' '}• {completedLog.workDate ? new Date(completedLog.workDate).toLocaleDateString() : 'N/A'}
                                      </span>
                                    </div>
                                  )}
                                </div>

                                {/* Active Step Form */}
                                {!done && activeStepForm === taskKey && (
                                  <div className="w-full bg-slate-50 p-3 rounded-lg border border-blue-100 flex flex-col gap-2 animate-scale-in">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Remarks / Details (e.g. Qty: 5)</label>
                                    <input 
                                      type="text" 
                                      value={stepRemarks}
                                      onChange={(e) => setStepRemarks(e.target.value)}
                                      placeholder="Enter quantity or any extra details..."
                                      className="w-full text-xs p-2 border border-slate-200 rounded focus:outline-none focus:border-blue-400"
                                      autoFocus
                                    />
                                    <div className="flex justify-end gap-2 mt-1">
                                      <button 
                                        disabled={isUpdating}
                                        onClick={() => setActiveStepForm(null)}
                                        className="px-3 py-1.5 border border-slate-200 text-slate-500 hover:bg-slate-100 rounded text-[10px] font-bold uppercase tracking-wide transition-colors"
                                      >
                                        Cancel
                                      </button>
                                      <button 
                                        disabled={isUpdating}
                                        onClick={() => handleMarkTaskDone(selectedBranch, category, step, stepRemarks)}
                                        className="px-3 py-1.5 bg-blue-600 text-white hover:bg-blue-700 rounded text-[10px] font-bold uppercase tracking-wide transition-colors disabled:opacity-50"
                                      >
                                        {isUpdating ? "Saving..." : "Confirm Done"}
                                      </button>
                                    </div>
                                  </div>
                                )}

                                {done && completedLog.remarks && completedLog.remarks !== "Marked as completed" && (
                                  <div className="w-full bg-amber-50/50 p-2 rounded border border-amber-100 text-[10px] font-semibold text-amber-800">
                                    <span className="text-amber-600/70 uppercase font-black tracking-widest mr-2">Remarks:</span>
                                    {completedLog.remarks}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center flex-1 text-center p-8 opacity-60">
              <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mb-4">
                <Briefcase size={32} />
              </div>
              <h3 className="text-sm font-black text-slate-500 uppercase tracking-wider mb-2">No Branch Selected</h3>
              <p className="text-xs text-slate-400 font-semibold max-w-[250px]">
                Select a branch from the list on the left to manage its work execution checklist.
              </p>
            </div>
          )}
        </div>
      </div>
      )}

      {viewMode === "reports" && (
        <div className="animate-fade-in space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Search Employee, Bank, Category..." 
                  value={reportSearchQuery}
                  onChange={(e) => setReportSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-white border border-[#E8E4DF] focus:border-blue-500 rounded-xl text-xs focus:outline-none transition-colors"
                />
              </div>
              <div className="relative">
                <Filter className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <select
                  value={reportCategoryFilter}
                  onChange={(e) => setReportCategoryFilter(e.target.value)}
                  className="pl-9 pr-8 py-2 bg-white border border-[#E8E4DF] focus:border-blue-500 rounded-xl text-xs focus:outline-none appearance-none font-semibold text-slate-700"
                >
                  <option value="">All Categories</option>
                  {Object.keys(WORK_CATEGORIES).map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>
            <button 
              onClick={exportWorkLogsCSV}
              className="px-4 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white border border-emerald-200 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-colors flex items-center gap-2"
            >
              <Download className="w-4 h-4" /> Export Report CSV
            </button>
          </div>

          <div className="bg-white border border-[#E8E4DF] rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#FCFBF9] border-b border-[#E8E4DF]">
                    <th className="py-3 px-4 text-[10px] font-black text-[#9C9890] uppercase tracking-wider">Date & Employee</th>
                    <th className="py-3 px-4 text-[10px] font-black text-[#9C9890] uppercase tracking-wider">Branch Details</th>
                    <th className="py-3 px-4 text-[10px] font-black text-[#9C9890] uppercase tracking-wider">Category</th>
                    <th className="py-3 px-4 text-[10px] font-black text-[#9C9890] uppercase tracking-wider">Work Action & Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8E4DF] text-xs">
                  {loading ? (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-slate-500 font-semibold">Loading reports...</td>
                    </tr>
                  ) : filteredWorkLogs.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-slate-500 font-semibold">No work logs found.</td>
                    </tr>
                  ) : (
                    filteredWorkLogs.map(log => {
                      const caseObj = getBranchDetails(log.masterId);
                      return (
                        <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-800">
                              {log.workDate ? new Date(log.workDate).toLocaleDateString() : new Date(log.createdAt).toLocaleDateString()}
                            </div>
                            <div className="text-slate-500 mt-0.5 font-semibold">By: <span className="text-blue-600">{log.employeeName || 'Unknown'}</span></div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-bold text-[#1C1C1A]">{caseObj?.bankName || 'N/A'}</div>
                            <div className="text-slate-500">{caseObj?.branchName || 'N/A'}</div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-[10px] font-black uppercase tracking-wider border border-blue-100">
                              {log.category}
                            </span>
                          </td>
                          <td className="py-3 px-4 max-w-sm">
                            <div className="font-bold text-slate-800 mb-1">{log.subCategory}</div>
                            {log.remarks && log.remarks !== "Marked as completed" && (
                              <div className="text-[10px] text-slate-500 bg-slate-100 p-1.5 rounded border border-slate-200 mt-1">
                                {log.remarks}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
