import React, { useState } from "react";
import { Search, Filter, PhoneCall, History, Banknote, RefreshCw, Edit2, Trash2, Download, X } from "lucide-react";

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
                <tr key={c.id} className="hover:bg-white transition-colors">
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
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => setShowFollowUpForm({ show: true, master: c })}
                          className="px-3 py-1.5 bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-600 hover:text-white rounded text-[10px] font-bold uppercase tracking-wide transition-colors flex items-center gap-1 w-full justify-center"
                        >
                          <PhoneCall className="w-3 h-3" /> Log Call
                        </button>
                        <button
                          onClick={() => openHistory(c.id)}
                          className="p-1.5 text-slate-500 hover:bg-slate-100 rounded transition-colors flex items-center gap-1 text-[10px] font-bold uppercase"
                          title="View Call History"
                        >
                          <History className="w-4 h-4" /> Logs
                        </button>
                      </div>
                      <button
                        onClick={() => setShowPaymentForm({ show: true, master: c })}
                        className="px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-600 hover:text-white rounded text-[10px] font-bold uppercase tracking-wide transition-colors flex items-center gap-1 w-full justify-center"
                      >
                        <Banknote className="w-3 h-3" /> Log Payment
                      </button>
                    </div>
                    {userRole === "Owner" && (
                      <div className="flex items-center justify-center gap-2 mt-2 pt-2 border-t border-slate-200">
                        <button
                          onClick={() => onEditCase && onEditCase(c)}
                          className="px-2 py-1 bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-600 hover:text-white rounded text-[10px] font-bold uppercase tracking-wide transition-colors flex items-center gap-1 w-full justify-center"
                        >
                          <Edit2 className="w-3 h-3" /> Edit
                        </button>
                        <button
                          onClick={() => onDeleteCase && onDeleteCase(c.id)}
                          className="px-2 py-1 bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-600 hover:text-white rounded text-[10px] font-bold uppercase tracking-wide transition-colors flex items-center gap-1 w-full justify-center"
                        >
                          <Trash2 className="w-3 h-3" /> Delete
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
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
