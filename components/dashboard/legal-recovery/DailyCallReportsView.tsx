import React, { useState } from "react";
import { Search, Filter, RefreshCw, CheckCircle, Building, FileAudio, Calendar } from "lucide-react";

export default function DailyCallReportsView({ 
  globalHistory, 
  cases, 
  loadingGlobalHistory 
}: { 
  globalHistory: any[], 
  cases: any[],
  loadingGlobalHistory: boolean 
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [callerFilter, setCallerFilter] = useState("");
  const [bankFilter, setBankFilter] = useState("");
  const [branchFilter, setBranchFilter] = useState("");
  const [showFilterOptions, setShowFilterOptions] = useState(false);

  const uniqueCallers = Array.from(new Set(globalHistory.map(log => log.callerName).filter(Boolean)));
  const uniqueBanks = Array.from(new Set([...globalHistory.map(g => g.bankName), ...cases.map(c => c.bankName)].filter(Boolean)));
  const uniqueBranches = Array.from(new Set(cases.map(c => c.branchName).filter(Boolean)));
  const uniqueCallStatuses = Array.from(new Set(globalHistory.map(log => log.callStatus).filter(Boolean)));

  const finalGlobalHistory = globalHistory.filter(log => {
    if (searchQuery && !log.conversationDetails?.toLowerCase().includes(searchQuery.toLowerCase()) && !log.callerName?.toLowerCase().includes(searchQuery.toLowerCase()) && !log.bankName?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    
    if (dateFilter) {
      const logDate = new Date(log.callDate || log.createdAt).toISOString().split('T')[0];
      if (logDate !== dateFilter) return false;
    }
    
    if (statusFilter && log.callStatus !== statusFilter) return false;
    if (callerFilter && log.callerName !== callerFilter) return false;
    
    const caseObj = cases.find(c => c.id === log.masterId);
    const logBank = caseObj?.bankName || log.bankName;
    const logBranch = caseObj?.branchName;

    if (bankFilter && logBank !== bankFilter) return false;
    if (branchFilter && logBranch !== branchFilter) return false;

    return true;
  });

  return (
    <div className="bg-[#FCFBF9] border border-[#E8E4DF] rounded-xl overflow-hidden shadow-sm p-5 animate-fade-in">
      {/* Header and Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 border-b border-[#E8E4DF] pb-4 gap-4">
        <div>
          <h3 className="font-serif text-xl text-slate-800">Daily Call Reports</h3>
          <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mt-1">All Follow-ups & Tasks across all branches</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          {/* Direct Date Filter */}
          <input 
            type="date" 
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-3 py-1.5 border border-[#E8E4DF] rounded-lg text-[10px] uppercase font-bold tracking-wider text-slate-600 bg-white shadow-sm focus:outline-none focus:border-indigo-400"
          />

          <div className="relative">
            <button 
              onClick={() => setShowFilterOptions(!showFilterOptions)}
              className={`px-3 py-1.5 border border-[#E8E4DF] hover:bg-[#F5F0EA] rounded-lg text-[10px] font-semibold tracking-wider uppercase transition-all flex items-center gap-1.5 shadow-sm ${showFilterOptions || statusFilter || callerFilter || bankFilter || branchFilter ? 'bg-[#F5F0EA] text-[#1C1C1A]' : 'bg-[#FCFBF9] text-[#5D5B57]'}`}
              title="Filter Options"
            >
              <Filter className="w-3.5 h-3.5" /> {(statusFilter || callerFilter || bankFilter || branchFilter) ? "Filtered" : "Filter"}
            </button>
            
            {showFilterOptions && (
              <div className="absolute right-0 top-full mt-1.5 w-72 bg-white border border-[#E8E4DF] rounded-xl shadow-2xl z-50 overflow-hidden animate-fade-in p-4 grid gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Call Status</label>
                  <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="w-full text-xs p-2.5 border border-[#E8E4DF] rounded-lg bg-slate-50 focus:outline-none focus:border-indigo-400 font-semibold text-slate-700">
                    <option value="">All Statuses</option>
                    {uniqueCallStatuses.map(s => <option key={String(s)} value={String(s)}>{String(s)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Caller (Employee)</label>
                  <select value={callerFilter} onChange={e => setCallerFilter(e.target.value)} className="w-full text-xs p-2.5 border border-[#E8E4DF] rounded-lg bg-slate-50 focus:outline-none focus:border-indigo-400 font-semibold text-slate-700">
                    <option value="">All Callers</option>
                    {uniqueCallers.map(c => <option key={String(c)} value={String(c)}>{String(c)}</option>)}
                  </select>
                </div>
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
                    setStatusFilter("");
                    setCallerFilter("");
                    setBankFilter("");
                    setBranchFilter("");
                    setDateFilter("");
                    setShowFilterOptions(false);
                  }} className="text-[10px] text-rose-600 font-bold uppercase tracking-wider hover:underline flex items-center gap-1">
                    <RefreshCw className="w-3 h-3" /> Clear Filters
                  </button>
                </div>
              </div>
            )}
          </div>

          <span className="px-3 py-1.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-lg border border-emerald-200 ml-2">
            {finalGlobalHistory.length} Total Logs
          </span>
        </div>
      </div>
      
      {/* Search Input for content */}
      <div className="mb-4">
        <div className="bg-white border border-[#E8E4DF] p-3 rounded-lg flex items-center gap-3">
          <Search className="w-4 h-4 text-[#9C9890]" />
          <input 
            type="text" 
            className="bg-transparent border-none focus:outline-none text-xs w-full font-semibold text-slate-700 placeholder:text-[#9C9890] placeholder:font-normal" 
            placeholder="Search by keywords, bank name, or caller..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {loadingGlobalHistory ? (
        <div className="text-center py-12 text-[#9C9890] text-xs flex flex-col items-center gap-2">
          <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" /> Loading reports...
        </div>
      ) : finalGlobalHistory.length === 0 ? (
        <div className="text-center py-12 text-[#9C9890] text-xs uppercase tracking-wider">No call reports found.</div>
      ) : (
        <div className="space-y-4">
          {finalGlobalHistory.map(log => {
            const caseObj = cases.find(c => c.id === log.masterId);
            return (
              <div key={log.id} className="bg-white p-5 rounded-xl border border-[#E8E4DF] shadow-sm relative hover:border-indigo-300 transition-colors group">
                <div className="absolute top-5 right-5 text-[10px] font-bold text-slate-500 bg-slate-50 px-2.5 py-1 rounded-md border border-[#E8E4DF]">
                  {log.callDate ? new Date(log.callDate).toLocaleDateString() : new Date(log.createdAt).toLocaleDateString()}
                </div>
                
                <div className="flex flex-wrap items-center gap-3 mb-3">
                  <span className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${log.callStatus === 'Connected' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                    {log.callStatus}
                  </span>
                  {log.taskId && (
                      <span className="text-[10px] flex items-center gap-1.5 text-sky-700 font-bold bg-sky-50 px-2.5 py-1 rounded border border-sky-200">
                        <CheckCircle className="w-3.5 h-3.5" /> Task Created #{log.taskId}
                      </span>
                  )}
                  <span className="text-xs font-semibold text-slate-700 ml-2 border-l border-slate-200 pl-4">Caller: {log.callerName || 'Employee'}</span>
                </div>

                <div className="text-sm font-bold text-slate-800 mb-2 flex items-center gap-2">
                    <Building className="w-4 h-4 text-[#C9A84C]" />
                    {caseObj?.bankName || log.bankName || 'Unknown Bank'} {caseObj?.branchName ? `- ${caseObj.branchName}` : ''}
                </div>
                
                <p className="text-xs text-slate-600 mb-4 bg-slate-50 p-4 rounded-lg border border-slate-100 leading-relaxed">{log.conversationDetails}</p>
                
                <div className="flex items-center gap-6 pt-3 border-t border-slate-100">
                  {log.callRecordingUrl && (
                    <a href={log.callRecordingUrl} target="_blank" rel="noreferrer" className="text-[10px] flex items-center gap-1.5 font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors">
                      <FileAudio className="w-3.5 h-3.5" /> View Attachment
                    </a>
                  )}
                  {log.nextFollowUpDate && (
                    <span className="text-[10px] flex items-center gap-1.5 text-amber-700 font-bold bg-amber-50 px-3 py-1.5 rounded-lg">
                      <Calendar className="w-3.5 h-3.5" /> Next Follow-up: {new Date(log.nextFollowUpDate).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
