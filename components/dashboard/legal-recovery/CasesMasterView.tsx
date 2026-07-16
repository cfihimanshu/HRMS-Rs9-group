import React, { useState } from "react";
import { Search, Filter, PhoneCall, History, Banknote, RefreshCw, Edit2, Trash2, Download, X, Briefcase, Calendar, FileAudio } from "lucide-react";

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

  const handleToggleLogs = async (caseId: number) => {
    if (expandedCaseId === caseId) {
      setExpandedCaseId(null);
      return;
    }
    setExpandedCaseId(caseId);
    setLoadingLocalHistory(true);
    setLocalHistory([]);
    setLocalWorkLogs([]);
    try {
      const [resFollowup, resWorkLogs] = await Promise.all([
        fetch(`/api/legal-recovery/followup?masterId=${caseId}`),
        fetch(`/api/legal-recovery/work-log?masterId=${caseId}`)
      ]);
      const resultFollowup = await resFollowup.json();
      const resultWorkLogs = await resWorkLogs.json();
      if (resultFollowup.success) {
        setLocalHistory(resultFollowup.data || []);
      }
      if (resultWorkLogs.success) {
        setLocalWorkLogs(resultWorkLogs.data || []);
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
    { key: "aoName", label: "AO Name" },
    { key: "deptManagerName", label: "Dept Manager Name" },
    { key: "contactNumber", label: "Contact Number" },
    { key: "pendingAmount", label: "Pending Amount" },
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
        if (col.key === 'pendingAmount') {
          val = val || 0;
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
    if (searchQuery && !(
      c.bankName?.toLowerCase().includes(searchQuery.toLowerCase()) || 
      c.branchName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.aoName?.toLowerCase().includes(searchQuery.toLowerCase())
    )) return false;

    if (bankFilter && c.bankName !== bankFilter) return false;
    if (branchFilter && c.branchName !== branchFilter) return false;
    
    return true;
  });

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="bg-[#FCFBF9] border border-[#E8E4DF] p-4 rounded-xl flex-1 flex items-center gap-3">
          <Search className="w-4 h-4 text-[#9C9890]" />
          <input 
            type="text" 
            className="bg-transparent border-none focus:outline-none text-xs w-full font-semibold text-slate-700 placeholder:text-[#9C9890] placeholder:font-normal" 
            placeholder="Search Cases by Bank, Branch or AO..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="relative flex items-center">
          <button 
            onClick={() => setShowFilterOptions(!showFilterOptions)}
            className={`px-4 py-4 h-full border border-[#E8E4DF] hover:bg-[#F5F0EA] rounded-xl text-[10px] font-semibold tracking-wider uppercase transition-all flex items-center gap-1.5 shadow-sm ${showFilterOptions || bankFilter || branchFilter ? 'bg-[#F5F0EA] text-[#1C1C1A]' : 'bg-[#FCFBF9] text-[#5D5B57]'}`}
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
            className="px-4 py-4 h-full border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 rounded-xl text-[10px] font-semibold tracking-wider uppercase transition-all flex items-center gap-1.5 shadow-sm text-emerald-800"
          >
            <Download className="w-3.5 h-3.5" /> Export
          </button>
        )}
      </div>

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
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
                <th className="py-3.5 px-4">Bank Details</th>
                <th className="py-3.5 px-4">Contacts</th>
                <th className="py-3.5 px-4">Pending Info</th>
                <th className="py-3.5 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8E4DF] text-xs">
              {filteredCases.map(c => (
                <React.Fragment key={c.id}>
                  <tr className="hover:bg-white transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-[#1C1C1A]">{c.bankName}</div>
                      <div className="text-[#9C9890]">Branch: {c.branchName || 'N/A'} {c.branchId ? `(${c.branchId})` : ''}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-700">AO: {c.aoName || 'N/A'}</div>
                      <div className="text-[#9C9890]">Mgr: {c.deptManagerName || 'N/A'}</div>
                      <div className="text-[#9C9890] flex items-center gap-1 mt-0.5"><PhoneCall className="w-3 h-3"/> {c.contactNumber || 'N/A'}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-red-600 flex items-center gap-1">
                        <Banknote className="w-3.5 h-3.5"/> ₹{c.pendingAmount}
                      </div>
                      {c.pendingSince && <div className="text-[#9C9890] mt-0.5">Since: {new Date(c.pendingSince).toLocaleDateString()}</div>}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-col gap-1.5 w-full max-w-[220px] sm:max-w-[260px] mx-auto">
                        {/* Row 1: Primary Action Buttons */}
                        <div className="grid grid-cols-2 gap-1.5">
                          <button
                            onClick={() => setShowFollowUpForm({ show: true, master: c })}
                            className="px-2 py-2 bg-indigo-50 text-indigo-700 border border-indigo-150 hover:bg-indigo-650 hover:text-white rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1 shadow-sm active:scale-[0.97]"
                          >
                            <PhoneCall className="w-3 h-3" /> Log Call
                          </button>
                          <button
                            onClick={() => setShowPaymentForm({ show: true, master: c })}
                            className="px-2 py-2 bg-emerald-50 text-emerald-700 border border-emerald-150 hover:bg-emerald-650 hover:text-white rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1 shadow-sm active:scale-[0.97]"
                          >
                            <Banknote className="w-3 h-3" /> Log Payment
                          </button>
                        </div>

                        {/* Row 2: Secondary & Admin Buttons */}
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleToggleLogs(c.id)}
                            className={`px-2 py-1.5 flex-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1 border active:scale-[0.97] ${
                              expandedCaseId === c.id
                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
                                : 'bg-slate-50 text-slate-600 border-slate-205 hover:bg-slate-100 hover:text-slate-800 shadow-sm'
                            }`}
                            title="View Call & Work Logs History"
                          >
                            <History className="w-3 h-3" /> Logs
                          </button>

                          {userRole === "Owner" && (
                            <>
                              <button
                                onClick={() => onEditCase && onEditCase(c)}
                                className="px-2 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-500 hover:text-white transition-all flex items-center justify-center gap-0.5 shadow-sm active:scale-[0.97]"
                                title="Edit Case Details"
                              >
                                <Edit2 className="w-3 h-3" /> Edit
                              </button>
                              <button
                                onClick={() => onDeleteCase && onDeleteCase(c.id)}
                                className="px-2 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-600 hover:text-white transition-all flex items-center justify-center gap-0.5 shadow-sm active:scale-[0.97]"
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
                  
                  {expandedCaseId === c.id && (
                    <tr className="bg-[#FAF9F6] border-b border-[#E8E4DF] hover:bg-[#FAF9F6]">
                      <td colSpan={4} className="p-4">
                        <div className="space-y-4 text-xs font-sans text-[#1C1C1A]">
                          <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-3">
                            <span className="text-xs font-bold text-indigo-700 uppercase tracking-wider flex items-center gap-1.5">
                              <History className="w-4 h-4" /> Call & Work Logs History
                            </span>
                            <button
                              onClick={() => setExpandedCaseId(null)}
                              className="text-[10px] font-semibold text-slate-400 hover:text-slate-600 flex items-center gap-0.5 hover:underline"
                            >
                              <X className="w-3.5 h-3.5" /> Close logs
                            </button>
                          </div>

                          {loadingLocalHistory ? (
                            <div className="flex items-center justify-center py-6 text-slate-400 text-[11px] font-bold">
                              <RefreshCw className="w-4 h-4 animate-spin mr-1.5" /> Loading history logs...
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              {/* Follow Up Calls */}
                              <div className="space-y-3">
                                <h4 className="text-[10px] font-bold text-[#5D5B57] uppercase tracking-wider flex items-center gap-1">
                                  <PhoneCall className="w-3.5 h-3.5 text-indigo-500" /> Follow Up Calls
                                </h4>
                                {localHistory.length === 0 ? (
                                  <div className="text-center py-6 text-slate-400 text-[10px] font-bold bg-white rounded-lg border border-slate-200 border-dashed">
                                    No follow ups recorded.
                                  </div>
                                ) : (
                                  <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                                    {localHistory.map(log => (
                                      <div key={log.id} className="bg-white p-3 rounded-lg border border-[#E8E4DF] shadow-sm space-y-1.5">
                                        <div className="flex justify-between items-center text-[10px]">
                                          <span className="font-bold text-[#1C1C1A]">Called by: {log.callerName || 'Unknown'}</span>
                                          <span className="font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
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
                                              <FileAudio className="w-3 h-3" /> View Attachment
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
                              <div className="space-y-3">
                                <h4 className="text-[10px] font-bold text-[#5D5B57] uppercase tracking-wider flex items-center gap-1">
                                  <Briefcase className="w-3.5 h-3.5 text-blue-500" /> Work Logs
                                </h4>
                                {localWorkLogs.length === 0 ? (
                                  <div className="text-center py-6 text-slate-400 text-[10px] font-bold bg-white rounded-lg border border-[#E8E4DF] border-dashed">
                                    No work logs recorded.
                                  </div>
                                ) : (
                                  <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                                    {localWorkLogs.map(log => (
                                      <div key={log.id} className="bg-white p-3 rounded-lg border border-[#E8E4DF] shadow-sm border-l-4 border-l-blue-400 space-y-1">
                                        <div className="flex justify-between items-center text-[10px]">
                                          <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded text-[9px] font-black uppercase tracking-wider border border-blue-100">
                                            {log.category}
                                          </span>
                                          <span className="font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                                            {log.workDate ? new Date(log.workDate).toLocaleDateString() : new Date(log.createdAt).toLocaleDateString()}
                                          </span>
                                        </div>
                                        <div className="text-[11px] font-bold text-slate-800">{log.subCategory}</div>
                                        {log.remarks && <p className="text-[11px] text-slate-650 mt-1 whitespace-pre-wrap">{log.remarks}</p>}
                                        <div className="text-[9px] text-slate-400 pt-1">
                                          Logged by: <span className="font-bold text-slate-600">{log.employeeName || 'Unknown'}</span>
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
              ))}
              {filteredCases.length === 0 && !loading && (
                <tr>
                  <td colSpan={4} className="text-center py-12 text-[#9C9890] text-xs uppercase tracking-wider">
                    No cases found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
