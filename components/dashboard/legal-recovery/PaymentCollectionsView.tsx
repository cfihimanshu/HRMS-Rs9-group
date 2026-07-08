import React, { useState, useEffect } from "react";
import { Search, Filter, RefreshCw, FileText, Banknote, Calendar } from "lucide-react";

export default function PaymentCollectionsView({ 
  payments, 
  cases, 
  loadingPayments 
}: { 
  payments: any[], 
  cases: any[],
  loadingPayments: boolean 
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [bankFilter, setBankFilter] = useState("");
  const [showFilterOptions, setShowFilterOptions] = useState(false);

  const uniqueBanks = Array.from(new Set(cases.map(c => c.bankName).filter(Boolean)));

  const finalPayments = payments.filter(p => {
    const caseObj = cases.find(c => c.id === p.masterId);
    
    if (searchQuery && !(
      p.transactionId?.toLowerCase().includes(searchQuery.toLowerCase()) || 
      caseObj?.bankName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      caseObj?.branchName?.toLowerCase().includes(searchQuery.toLowerCase())
    )) return false;
    
    if (dateFilter) {
      const pDate = new Date(p.paymentDate || p.createdAt).toISOString().split('T')[0];
      if (pDate !== dateFilter) return false;
    }
    
    if (bankFilter && caseObj?.bankName !== bankFilter) return false;

    return true;
  });

  const totalCollected = finalPayments.reduce((acc, curr) => acc + parseFloat(curr.amount || 0), 0);

  return (
    <div className="bg-[#FCFBF9] border border-[#E8E4DF] rounded-xl overflow-hidden shadow-sm p-5 animate-fade-in">
      {/* Header and Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 border-b border-[#E8E4DF] pb-4 gap-4">
        <div>
          <h3 className="font-serif text-xl text-slate-800 flex items-center gap-2">
            <Banknote className="w-5 h-5 text-emerald-600" /> Collections Report
          </h3>
          <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mt-1">All payments received</p>
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
              className={`px-3 py-1.5 border border-[#E8E4DF] hover:bg-[#F5F0EA] rounded-lg text-[10px] font-semibold tracking-wider uppercase transition-all flex items-center gap-1.5 shadow-sm ${showFilterOptions || bankFilter ? 'bg-[#F5F0EA] text-[#1C1C1A]' : 'bg-[#FCFBF9] text-[#5D5B57]'}`}
            >
              <Filter className="w-3.5 h-3.5" /> {bankFilter ? "Filtered" : "Filter"}
            </button>
            
            {showFilterOptions && (
              <div className="absolute right-0 top-full mt-1.5 w-72 bg-white border border-[#E8E4DF] rounded-xl shadow-2xl z-50 overflow-hidden animate-fade-in p-4 grid gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Bank</label>
                  <select value={bankFilter} onChange={e => setBankFilter(e.target.value)} className="w-full text-xs p-2.5 border border-[#E8E4DF] rounded-lg bg-slate-50 focus:outline-none focus:border-indigo-400 font-semibold text-slate-700">
                    <option value="">All Banks</option>
                    {uniqueBanks.map(b => <option key={String(b)} value={String(b)}>{String(b)}</option>)}
                  </select>
                </div>
                
                <div className="flex justify-end mt-2 pt-3 border-t border-slate-100">
                  <button onClick={() => {
                    setBankFilter("");
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
            Total: ₹{totalCollected.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>
      
      {/* Search Input */}
      <div className="mb-4">
        <div className="bg-white border border-[#E8E4DF] p-3 rounded-lg flex items-center gap-3">
          <Search className="w-4 h-4 text-[#9C9890]" />
          <input 
            type="text" 
            className="bg-transparent border-none focus:outline-none text-xs w-full font-semibold text-slate-700 placeholder:text-[#9C9890] placeholder:font-normal" 
            placeholder="Search by bank name, branch, or transaction ID..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {loadingPayments ? (
        <div className="text-center py-12 text-[#9C9890] text-xs flex flex-col items-center gap-2">
          <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" /> Loading collections...
        </div>
      ) : finalPayments.length === 0 ? (
        <div className="text-center py-12 text-[#9C9890] text-xs uppercase tracking-wider">No collections found.</div>
      ) : (
        <div className="overflow-x-auto border border-[#E8E4DF] rounded-xl">
          <table className="w-full text-left border-collapse min-w-max">
            <thead>
              <tr className="bg-[#F5F0EA]/40 text-[#5D5B57] text-[10px] uppercase font-bold tracking-wider border-b border-[#E8E4DF]">
                <th className="p-4">Bank Details</th>
                <th className="p-4">Payment Info</th>
                <th className="p-4">Amount</th>
                <th className="p-4 text-center">Proof</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8E4DF] bg-white text-xs">
              {finalPayments.map(p => {
                const caseObj = cases.find(c => c.id === p.masterId);
                return (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4">
                      <div className="font-bold text-slate-800">{caseObj?.bankName || 'Unknown Bank'}</div>
                      <div className="text-slate-500 mt-1">{caseObj?.branchName || 'N/A'} {caseObj?.branchId ? `(${caseObj.branchId})` : ''}</div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-[10px]">{p.paymentMode}</span>
                        <span className="text-slate-500 text-[10px] flex items-center gap-1"><Calendar className="w-3 h-3"/> {new Date(p.paymentDate).toLocaleDateString()}</span>
                      </div>
                      <div className="text-slate-600 font-mono text-[10px] mt-1">Ref/UTR: {p.transactionId || 'N/A'}</div>
                      {p.remarks && <div className="text-slate-500 text-[10px] mt-1 italic">"{p.remarks}"</div>}
                    </td>
                    <td className="p-4">
                      <div className="font-bold text-emerald-600 text-sm">₹{parseFloat(p.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                      <div className="text-[9px] uppercase tracking-wider font-semibold text-slate-400 mt-1">By: {p.receivedBy}</div>
                    </td>
                    <td className="p-4 text-center">
                      {p.proofUrl ? (
                        <a href={p.proofUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-50 text-sky-700 border border-sky-200 hover:bg-sky-600 hover:text-white rounded-lg text-[10px] font-bold uppercase tracking-wide transition-colors">
                          <FileText className="w-3.5 h-3.5" /> View Receipt
                        </a>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">No Proof</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
