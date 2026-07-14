import React, { useState } from "react";
import { Search, Filter, RefreshCw, CheckCircle, Building, FileText, Calendar, TrendingUp, PhoneCall, Briefcase, Banknote, Download, Eye, EyeOff, Play, Music, Image as ImageIcon, User, Layers, Tag } from "lucide-react";

export default function DailyCallReportsView({ 
  globalHistory, 
  cases, 
  loadingGlobalHistory,
  branchesList = [],
  banksList = []
}: { 
  globalHistory: any[], 
  cases: any[],
  loadingGlobalHistory: boolean,
  branchesList?: any[],
  banksList?: any[]
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [callerFilter, setCallerFilter] = useState("");
  const [bankFilter, setBankFilter] = useState("");
  const [branchFilter, setBranchFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [showFilterOptions, setShowFilterOptions] = useState(false);
  const [activePreviewId, setActivePreviewId] = useState<string | null>(null);

  // Helper to extract bank and branch names for either Follow-up, Business Development, Work, or Payment logs
  const getBankAndBranch = (log: any) => {
    // If the log record already contains a saved static bankName/branchName snapshot, prioritize it
    if (log.bankName || log.branchName) {
      return {
        bankName: log.bankName || 'Unknown Bank',
        branchName: log.branchName || ''
      };
    }

    if (log.logType === 'Business Development') {
      const branch = branchesList.find(b => b.branchCode === log.branchCode);
      const bank = banksList.find(b => b.id === branch?.bankId);
      return {
        bankName: bank?.bankName || 'Unknown Bank',
        branchName: branch?.branchName || ''
      };
    } else {
      const caseObj = cases.find(c => c.id === log.masterId);
      return {
        bankName: caseObj?.bankName || log.bankName || 'Unknown Bank',
        branchName: caseObj?.branchName || ''
      };
    }
  };

  // DYNAMIC DEPENDENT FILTERS: Dropdown options update based on other active filters
  const callersOptions = Array.from(new Set(
    globalHistory
      .filter(log => {
        const info = getBankAndBranch(log);
        if (typeFilter && log.logType !== typeFilter) return false;
        if (bankFilter && info.bankName !== bankFilter) return false;
        if (branchFilter && info.branchName !== branchFilter) return false;
        if (statusFilter && log.callStatus !== statusFilter && log.paymentMode !== statusFilter && log.category !== statusFilter) return false;
        return true;
      })
      .map(log => log.callerName || log.employeeName || log.receivedBy)
      .filter(Boolean)
  )).sort();

  const banksOptions = Array.from(new Set(
    globalHistory
      .filter(log => {
        if (typeFilter && log.logType !== typeFilter) return false;
        if (callerFilter && (log.callerName !== callerFilter && log.employeeName !== callerFilter && log.receivedBy !== callerFilter)) return false;
        if (statusFilter && log.callStatus !== statusFilter && log.paymentMode !== statusFilter && log.category !== statusFilter) return false;
        return true;
      })
      .map(g => getBankAndBranch(g).bankName)
      .filter(Boolean)
  )).sort();

  const branchesOptions = Array.from(new Set(
    globalHistory
      .filter(log => {
        const info = getBankAndBranch(log);
        if (typeFilter && log.logType !== typeFilter) return false;
        if (bankFilter && info.bankName !== bankFilter) return false;
        if (callerFilter && (log.callerName !== callerFilter && log.employeeName !== callerFilter && log.receivedBy !== callerFilter)) return false;
        if (statusFilter && log.callStatus !== statusFilter && log.paymentMode !== statusFilter && log.category !== statusFilter) return false;
        return true;
      })
      .map(g => getBankAndBranch(g).branchName)
      .filter(Boolean)
  )).sort();

  const statusesOptions = Array.from(new Set(
    globalHistory
      .filter(log => {
        const info = getBankAndBranch(log);
        if (typeFilter && log.logType !== typeFilter) return false;
        if (bankFilter && info.bankName !== bankFilter) return false;
        if (branchFilter && info.branchName !== branchFilter) return false;
        if (callerFilter && (log.callerName !== callerFilter && log.employeeName !== callerFilter && log.receivedBy !== callerFilter)) return false;
        return true;
      })
      .map(log => log.callStatus || log.paymentMode || log.category)
      .filter(Boolean)
  )).sort();

  const finalGlobalHistory = globalHistory.filter(log => {
    const info = getBankAndBranch(log);
    const detailsText = log.conversationDetails || log.remarks || '';
    const userText = log.callerName || log.employeeName || log.receivedBy || '';
    
    if (searchQuery && !(
      detailsText.toLowerCase().includes(searchQuery.toLowerCase()) || 
      userText.toLowerCase().includes(searchQuery.toLowerCase()) || 
      info.bankName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      info.branchName?.toLowerCase().includes(searchQuery.toLowerCase())
    )) return false;
    
    if (dateFilter) {
      const logDate = new Date(log.callDate || log.workDate || log.paymentDate || log.createdAt).toISOString().split('T')[0];
      if (logDate !== dateFilter) return false;
    }
    
    if (typeFilter && log.logType !== typeFilter) return false;
    
    if (statusFilter && log.callStatus !== statusFilter && log.paymentMode !== statusFilter && log.category !== statusFilter) return false;
    
    if (callerFilter && (log.callerName !== callerFilter && log.employeeName !== callerFilter && log.receivedBy !== callerFilter)) return false;
    
    if (bankFilter && info.bankName !== bankFilter) return false;
    if (branchFilter && info.branchName !== branchFilter) return false;

    return true;
  });

  const getFileType = (url: string) => {
    if (!url) return "unknown";
    const cleanUrl = url.split('?')[0].toLowerCase();
    if (cleanUrl.endsWith('.mp3') || cleanUrl.endsWith('.wav') || cleanUrl.endsWith('.ogg') || cleanUrl.endsWith('.m4a') || cleanUrl.endsWith('.aac') || url.includes('/audio')) return 'audio';
    if (cleanUrl.endsWith('.mp4') || cleanUrl.endsWith('.webm') || cleanUrl.endsWith('.mov')) return 'video';
    if (cleanUrl.endsWith('.jpg') || cleanUrl.endsWith('.jpeg') || cleanUrl.endsWith('.png') || cleanUrl.endsWith('.gif') || cleanUrl.endsWith('.webp')) return 'image';
    if (cleanUrl.endsWith('.pdf')) return 'pdf';
    if (cleanUrl.endsWith('.xlsx') || cleanUrl.endsWith('.xls') || cleanUrl.endsWith('.csv')) return 'spreadsheet';
    return 'document';
  };

  const handleExportToCSV = () => {
    const headers = ["Date", "Report Type", "Bank", "Branch", "Status/Amount/Step", "Details/Remarks", "Employee/User", "Next Action Date", "Attachment URL"];
    const rows = finalGlobalHistory.map(log => {
      const info = getBankAndBranch(log);
      const logDate = log.callDate || log.workDate || log.paymentDate || log.createdAt;
      const formattedDate = logDate ? new Date(logDate).toLocaleDateString() : '';
      
      let statusStepAmt = '';
      if (log.logType === 'Payment Collection') {
        statusStepAmt = `Amount: Rs. ${log.amount} (${log.paymentMode || ''})`;
      } else if (log.logType === 'Legal Work Log') {
        statusStepAmt = `${log.category} - ${log.subCategory}`;
      } else {
        statusStepAmt = log.callStatus || '';
      }

      const details = (log.conversationDetails || log.remarks || '').replace(/"/g, '""');
      const caller = log.callerName || log.employeeName || log.receivedBy || 'System';
      const nextDate = log.nextFollowUpDate ? new Date(log.nextFollowUpDate).toLocaleDateString() : '';
      const attachmentUrl = log.callRecordingUrl || log.proofUrl || '';

      return [
        `"${formattedDate}"`,
        `"${log.logType}"`,
        `"${info.bankName.replace(/"/g, '""')}"`,
        `"${info.branchName.replace(/"/g, '""')}"`,
        `"${statusStepAmt.replace(/"/g, '""')}"`,
        `"${details}"`,
        `"${caller.replace(/"/g, '""')}"`,
        `"${nextDate}"`,
        `"${attachmentUrl.replace(/"/g, '""')}"`
      ];
    });

    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Legal_Recovery_All_Reports_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-[#FCFBF9] border border-[#E8E4DF] rounded-xl overflow-hidden shadow-sm p-5 animate-fade-in">
      {/* Header and Filters */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between mb-6 border-b border-[#E8E4DF] pb-4 gap-4">
        <div>
          <h3 className="font-serif text-xl text-slate-800">Legal Recovery All Reports</h3>
          <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mt-1">Unified logs of Follow-ups, BD calls, Legal Work steps, and Payments</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
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
              className={`px-3 py-1.5 border border-[#E8E4DF] hover:bg-[#F5F0EA] rounded-lg text-[10px] font-semibold tracking-wider uppercase transition-all flex items-center gap-1.5 shadow-sm ${showFilterOptions || statusFilter || callerFilter || bankFilter || branchFilter || typeFilter ? 'bg-[#F5F0EA] text-[#1C1C1A]' : 'bg-[#FCFBF9] text-[#5D5B57]'}`}
              title="Filter Options"
            >
              <Filter className="w-3.5 h-3.5" /> {(statusFilter || callerFilter || bankFilter || branchFilter || typeFilter) ? "Filtered" : "Filter"}
            </button>
            
            {showFilterOptions && (
              <div className="absolute right-0 top-full mt-1.5 w-72 bg-white border border-[#E8E4DF] rounded-xl shadow-2xl z-50 overflow-hidden animate-fade-in p-4 grid gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Report Type</label>
                  <select value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setStatusFilter(""); }} className="w-full text-xs p-2.5 border border-[#E8E4DF] rounded-lg bg-slate-50 focus:outline-none focus:border-indigo-400 font-semibold text-slate-700">
                    <option value="">All Types</option>
                    <option value="Follow-up">Follow-up Call</option>
                    <option value="Business Development">Business Development</option>
                    <option value="Legal Work Log">Legal Work Log</option>
                    <option value="Payment Collection">Payment Collection</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Status / Step / Mode</label>
                  <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="w-full text-xs p-2.5 border border-[#E8E4DF] rounded-lg bg-slate-50 focus:outline-none focus:border-indigo-400 font-semibold text-slate-700">
                    <option value="">All Statuses ({statusesOptions.length})</option>
                    {statusesOptions.map(s => <option key={String(s)} value={String(s)}>{String(s)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">User (Employee / Caller)</label>
                  <select value={callerFilter} onChange={e => setCallerFilter(e.target.value)} className="w-full text-xs p-2.5 border border-[#E8E4DF] rounded-lg bg-slate-50 focus:outline-none focus:border-indigo-400 font-semibold text-slate-700">
                    <option value="">All Users ({callersOptions.length})</option>
                    {callersOptions.map(c => <option key={String(c)} value={String(c)}>{String(c)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Bank</label>
                  <select value={bankFilter} onChange={e => { setBankFilter(e.target.value); setBranchFilter(""); }} className="w-full text-xs p-2.5 border border-[#E8E4DF] rounded-lg bg-slate-50 focus:outline-none focus:border-indigo-400 font-semibold text-slate-700">
                    <option value="">All Banks ({banksOptions.length})</option>
                    {banksOptions.map(b => <option key={String(b)} value={String(b)}>{String(b)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Branch</label>
                  <select value={branchFilter} onChange={e => setBranchFilter(e.target.value)} className="w-full text-xs p-2.5 border border-[#E8E4DF] rounded-lg bg-slate-50 focus:outline-none focus:border-indigo-400 font-semibold text-slate-700">
                    <option value="">All Branches ({branchesOptions.length})</option>
                    {branchesOptions.map(br => <option key={String(br)} value={String(br)}>{String(br)}</option>)}
                  </select>
                </div>
                
                <div className="flex justify-end mt-2 pt-3 border-t border-slate-100">
                  <button onClick={() => {
                    setStatusFilter("");
                    setCallerFilter("");
                    setBankFilter("");
                    setBranchFilter("");
                    setDateFilter("");
                    setTypeFilter("");
                    setShowFilterOptions(false);
                  }} className="text-[10px] text-rose-600 font-bold uppercase tracking-wider hover:underline flex items-center gap-1">
                    <RefreshCw className="w-3 h-3" /> Clear Filters
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Export CSV Button */}
          <button 
            onClick={handleExportToCSV}
            className="px-3 py-1.5 bg-[#714B67] hover:bg-[#593b51] text-white rounded-lg text-[10px] font-bold tracking-wider uppercase transition-all flex items-center gap-1.5 shadow-sm"
          >
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>

          <span className="px-3 py-1.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-lg border border-emerald-200">
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
            placeholder="Search by keywords, bank name, caller, or remarks..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {loadingGlobalHistory ? (
        <div className="text-center py-12 text-[#9C9890] text-xs flex flex-col items-center gap-2">
          <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" /> Loading all reports...
        </div>
      ) : finalGlobalHistory.length === 0 ? (
        <div className="text-center py-12 text-[#9C9890] text-xs uppercase tracking-wider">No reports found.</div>
      ) : (
        <div className="space-y-4">
          {finalGlobalHistory.map(log => {
            const info = getBankAndBranch(log);
            const displayDate = log.callDate || log.workDate || log.paymentDate || log.createdAt;
            const logId = `${log.logType}-${log.id}`;
            const fileUrl = log.callRecordingUrl || log.proofUrl;
            const isPreviewOpen = activePreviewId === logId;

            return (
              <div key={logId} className="bg-white rounded-xl border border-[#E8E4DF] shadow-sm relative hover:border-[#714B67]/30 transition-all overflow-hidden group">
                
                {/* 1. Header Bar of each Card */}
                <div className="px-5 py-3 border-b border-[#E8E4DF] bg-slate-50/50 flex flex-wrap justify-between items-center gap-3">
                  <div className="flex items-center gap-2.5">
                    {/* Log Type Indicator Icon & Label */}
                    {log.logType === 'Follow-up' && (
                      <span className="px-2 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-widest flex items-center gap-1 bg-violet-100 text-violet-800 border border-violet-200">
                        <PhoneCall className="w-3 h-3" /> {log.logType}
                      </span>
                    )}
                    {log.logType === 'Business Development' && (
                      <span className="px-2 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-widest flex items-center gap-1 bg-indigo-100 text-indigo-800 border border-indigo-200">
                        <TrendingUp className="w-3 h-3" /> {log.logType}
                      </span>
                    )}
                    {log.logType === 'Legal Work Log' && (
                      <span className="px-2 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-widest flex items-center gap-1 bg-blue-100 text-blue-800 border border-blue-200">
                        <Briefcase className="w-3 h-3" /> {log.logType}
                      </span>
                    )}
                    {log.logType === 'Payment Collection' && (
                      <span className="px-2 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-widest flex items-center gap-1 bg-emerald-100 text-emerald-800 border border-emerald-200">
                        <Banknote className="w-3 h-3" /> {log.logType}
                      </span>
                    )}

                    {/* Status Badge */}
                    {log.logType !== 'Payment Collection' && log.logType !== 'Legal Work Log' && (
                      <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider ${
                        ['connected', 'success', 'received'].includes(String(log.callStatus || '').toLowerCase()) 
                          ? 'bg-emerald-550/10 text-emerald-700' 
                          : 'bg-rose-550/10 text-rose-700'
                      }`}>
                        {log.callStatus}
                      </span>
                    )}

                    {log.logType === 'Legal Work Log' && (
                      <span className="px-2 py-0.5 rounded text-[9px] font-extrabold bg-amber-50 text-amber-800 border border-amber-200 uppercase tracking-wide flex items-center gap-1">
                        <Tag className="w-2.5 h-2.5" /> {log.category}
                      </span>
                    )}

                    {log.logType === 'Payment Collection' && (
                      <span className="px-2 py-0.5 rounded text-[9px] font-extrabold bg-emerald-50 text-emerald-800 border border-emerald-200 uppercase tracking-wide flex items-center gap-1">
                        <Layers className="w-2.5 h-2.5" /> {log.paymentMode || 'Received'}
                      </span>
                    )}

                    {log.taskId && (
                      <span className="text-[9px] flex items-center gap-1 text-sky-700 font-bold bg-sky-50 px-2 py-0.5 rounded border border-sky-100">
                        <CheckCircle className="w-3 h-3" /> Task #{log.taskId}
                      </span>
                    )}
                  </div>

                  <span className="text-[10px] font-bold text-slate-500 font-mono flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    {displayDate ? new Date(displayDate).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : new Date(log.createdAt).toLocaleDateString()}
                  </span>
                </div>

                {/* 2. Content & Structured Grid layout */}
                <div className="p-5">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-5 mb-4">
                    
                    {/* Left Column: Client, Branch, and Submitter Details (7 Cols) */}
                    <div className="md:col-span-7 space-y-2 border-r border-[#E8E4DF]/60 pr-5">
                      <div className="flex items-start gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-[#FCFBF9] border border-[#E8E4DF] flex items-center justify-center text-slate-500 mt-0.5">
                          <Building className="w-4 h-4 text-[#C9A84C]" />
                        </div>
                        <div>
                          <h4 className="text-xs font-black text-slate-800 tracking-wide uppercase">
                            {info.bankName || 'Unknown Bank'}
                          </h4>
                          <p className="text-[11px] font-bold text-slate-500 mt-0.5">
                            {info.branchName ? `Branch: ${info.branchName}` : 'All Branches'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pl-1 pt-1">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-[11px] font-bold text-slate-600">
                          Logged By: <strong className="text-slate-800 font-extrabold">{log.callerName || log.employeeName || log.receivedBy || 'System'}</strong>
                        </span>
                      </div>
                    </div>

                    {/* Right Column: Dynamic Action Details (5 Cols) */}
                    <div className="md:col-span-5 flex flex-col justify-center pl-1 md:pl-5">
                      {log.logType === 'Payment Collection' && (
                        <div className="bg-emerald-50/60 p-3 rounded-lg border border-emerald-100/50">
                          <div className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest">Amount Received</div>
                          <div className="text-lg font-black text-emerald-700 font-mono mt-0.5">
                            ₹{parseFloat(log.amount).toLocaleString('en-IN')}
                          </div>
                          {log.transactionId && (
                            <div className="text-[10px] text-slate-500 font-mono mt-1 border-t border-emerald-100/30 pt-1">
                              Txn ID: {log.transactionId}
                            </div>
                          )}
                        </div>
                      )}

                      {log.logType === 'Legal Work Log' && (
                        <div className="bg-blue-50/30 p-3 rounded-lg border border-blue-100/30">
                          <div className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest">Completed Legal Action</div>
                          <div className="text-xs font-extrabold text-blue-800 mt-1">
                            {log.subCategory}
                          </div>
                        </div>
                      )}

                      {log.logType !== 'Payment Collection' && log.logType !== 'Legal Work Log' && log.nextFollowUpDate && (
                        <div className="bg-amber-50 text-amber-800 p-3 rounded-lg border border-amber-200/50 flex items-center gap-2.5">
                          <Calendar className="w-4 h-4 text-amber-600" />
                          <div>
                            <div className="text-[9px] font-bold uppercase text-amber-600 tracking-wider">Scheduled Follow-up</div>
                            <div className="text-xs font-black mt-0.5">
                              {new Date(log.nextFollowUpDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 3. Remarks Area */}
                  {(log.conversationDetails || log.remarks) && (
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100/80 leading-relaxed text-xs text-slate-600 relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-1 h-full bg-[#714B67]/40"></div>
                      <p className="whitespace-pre-wrap pl-1 font-semibold italic text-slate-650">
                        "{log.conversationDetails || log.remarks}"
                      </p>
                    </div>
                  )}

                  {/* 4. Action Buttons and Attachments */}
                  {fileUrl && (
                    <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col gap-3">
                      <div className="flex flex-wrap items-center gap-3">
                        <button 
                          onClick={() => setActivePreviewId(isPreviewOpen ? null : logId)}
                          className="text-[10px] flex items-center gap-1.5 font-black uppercase tracking-wider text-indigo-700 bg-indigo-50 hover:bg-indigo-100/80 px-3.5 py-2 rounded-lg transition-colors border border-indigo-200"
                        >
                          {isPreviewOpen ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          {isPreviewOpen ? "Hide Preview" : "View / Play Attachment"}
                        </button>

                        <a 
                          href={fileUrl} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="text-[10px] flex items-center gap-1.5 font-bold uppercase tracking-wider text-slate-600 bg-slate-50 hover:bg-slate-100 px-3.5 py-2 rounded-lg transition-colors border border-slate-200"
                        >
                          <Download className="w-3.5 h-3.5" /> Open in New Tab
                        </a>
                      </div>

                      {/* INLINE MEDIA VIEWER (Renders Audio, Video, Image, PDF, Excel inline) */}
                      {isPreviewOpen && (() => {
                        const fileType = getFileType(fileUrl);
                        return (
                          <div className="mt-2 p-4 bg-slate-50 border border-slate-200 rounded-xl animate-fade-in">
                            {fileType === 'audio' && (
                              <div className="max-w-md">
                                <p className="text-[9px] text-slate-400 font-black uppercase tracking-wider mb-2 flex items-center gap-1">
                                  <Music className="w-3.5 h-3.5 text-indigo-500" /> Audio Recording Player
                                </p>
                                <audio src={fileUrl} controls className="w-full h-10 focus:outline-none" />
                              </div>
                            )}

                            {fileType === 'video' && (
                              <div className="max-w-xl">
                                <p className="text-[9px] text-slate-400 font-black uppercase tracking-wider mb-2 flex items-center gap-1">
                                  <Play className="w-3.5 h-3.5 text-red-500" /> Video Player
                                </p>
                                <video src={fileUrl} controls className="w-full rounded-lg border border-slate-200 max-h-[360px] bg-black shadow-inner" />
                              </div>
                            )}

                            {fileType === 'image' && (
                              <div className="inline-block max-w-full">
                                <p className="text-[9px] text-slate-400 font-black uppercase tracking-wider mb-2 flex items-center gap-1">
                                  <ImageIcon className="w-3.5 h-3.5 text-emerald-500" /> Image Preview
                                </p>
                                <img src={fileUrl} alt="Attachment Preview" className="max-w-full max-h-[350px] rounded-lg border border-slate-200 object-contain bg-white shadow-sm" />
                              </div>
                            )}

                            {fileType === 'pdf' && (
                              <div className="w-full">
                                <p className="text-[9px] text-slate-400 font-black uppercase tracking-wider mb-2 flex items-center gap-1">
                                  <FileText className="w-3.5 h-3.5 text-red-600" /> PDF Document Viewer
                                </p>
                                <iframe src={fileUrl} className="w-full h-[480px] rounded-lg border border-slate-200 bg-white shadow-sm" />
                              </div>
                            )}

                            {(fileType === 'spreadsheet' || fileType === 'document' || fileType === 'unknown') && (
                              <div className="inline-flex flex-col gap-2.5">
                                <p className="text-[9px] text-slate-400 font-black uppercase tracking-wider flex items-center gap-1">
                                  <FileText className="w-3.5 h-3.5 text-green-600" /> Spreadsheet / Document File
                                </p>
                                <div className="text-xs font-bold text-slate-800 flex items-center gap-2 bg-white px-3 py-2.5 rounded-lg border border-slate-200">
                                  <FileText className="w-4 h-4 text-emerald-600" />
                                  <span>{fileUrl.substring(fileUrl.lastIndexOf('/') + 1) || "downloadable-document"}</span>
                                </div>
                                <a 
                                  href={fileUrl} 
                                  download
                                  className="text-[10px] font-black uppercase tracking-wider text-white bg-[#714B67] hover:bg-[#593b51] px-4 py-2.5 rounded-lg w-fit transition-colors shadow-sm"
                                >
                                  Download File
                                </a>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
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
