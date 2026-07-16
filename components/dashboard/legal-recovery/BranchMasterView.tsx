import React, { useState } from "react";
import { Search, PhoneCall, Filter, RefreshCw, Pencil, TrendingUp } from "lucide-react";

export default function BranchMasterView({
  branchesList,
  banksList,
  loading,
  setShowMarketingForm,
  onEditBranch,
}: {
  branchesList: any[];
  banksList: any[];
  loading: boolean;
  setShowMarketingForm: (state: any) => void;
  onEditBranch?: (branch: any) => void;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [bankFilter, setBankFilter] = useState("");
  const [showFilterOptions, setShowFilterOptions] = useState(false);

  const uniqueBanks = Array.from(new Set(banksList.map((b) => b.bankName).filter(Boolean)));

  const filteredBranches = branchesList.filter((br) => {
    const parentBank = banksList.find((b) => b.id === br.bankId);

    if (
      searchQuery &&
      !(
        br.branchName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        parentBank?.bankName?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    )
      return false;

    if (bankFilter && parentBank?.bankName !== bankFilter) return false;

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
            placeholder="Search Branches by Name or Bank..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="relative flex items-center">
          <button
            onClick={() => setShowFilterOptions(!showFilterOptions)}
            className={`px-4 py-4 h-full border border-[#E8E4DF] hover:bg-[#F5F0EA] rounded-xl text-[10px] font-semibold tracking-wider uppercase transition-all flex items-center gap-1.5 shadow-sm ${
              showFilterOptions || bankFilter
                ? "bg-[#F5F0EA] text-[#1C1C1A]"
                : "bg-[#FCFBF9] text-[#5D5B57]"
            }`}
          >
            <Filter className="w-3.5 h-3.5" /> {bankFilter ? "Filtered" : "Filter"}
          </button>

          {showFilterOptions && (
            <div className="absolute right-0 top-full mt-2 w-72 bg-white border border-[#E8E4DF] rounded-xl shadow-2xl z-50 overflow-hidden animate-fade-in p-4 grid gap-4">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">
                  Bank
                </label>
                <select
                  value={bankFilter}
                  onChange={(e) => setBankFilter(e.target.value)}
                  className="w-full text-xs p-2.5 border border-[#E8E4DF] rounded-lg bg-slate-50 focus:outline-none focus:border-indigo-400 font-semibold text-slate-700"
                >
                  <option value="">All Banks</option>
                  {uniqueBanks.map((b) => (
                    <option key={String(b)} value={String(b)}>
                      {String(b)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end mt-2 pt-3 border-t border-slate-100">
                <button
                  onClick={() => {
                    setBankFilter("");
                    setShowFilterOptions(false);
                  }}
                  className="text-[10px] text-rose-600 font-bold uppercase tracking-wider hover:underline flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" /> Clear Filters
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#FCFBF9] border border-[#E8E4DF] rounded-xl overflow-hidden shadow-sm overflow-x-auto max-h-[600px] overflow-y-auto">
        <table className="w-full border-collapse text-left min-w-max">
          <thead className="sticky top-0 bg-[#F5F0EA] z-10">
            <tr className="border-b border-[#E8E4DF] text-[#5D5B57] text-[10px] uppercase font-bold tracking-wider">
              <th className="py-3.5 px-4 bg-[#F5F0EA]">Bank &amp; Branch</th>
              <th className="py-3.5 px-4 bg-[#F5F0EA]">Manager Details</th>
              <th className="py-3.5 px-4 bg-[#F5F0EA]">Recovery Officers</th>
              <th className="py-3.5 px-4 bg-[#F5F0EA]">RBO Details</th>
              <th className="py-3.5 px-4 text-right bg-[#F5F0EA]">Created On</th>
              <th className="py-3.5 px-4 text-center bg-[#F5F0EA]">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E8E4DF] text-xs">
            {filteredBranches.map((br) => {
              const parentBank = banksList.find((b) => b.id === br.bankId);
              return (
                <tr key={br.id} className="hover:bg-white transition-colors">
                  <td className="py-3 px-4">
                    <div className="font-bold text-[#1C1C1A]">{parentBank?.bankName || "Unknown"}</div>
                    <div className="font-semibold text-slate-700">{br.branchName}</div>
                    <div className="text-pink-700 font-mono font-semibold text-[10px]">Code: {br.branchCode}</div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-semibold text-slate-700">{br.branchManager || "N/A"}</div>
                    <div className="text-[#9C9890] text-[10px] flex items-center gap-1 mt-0.5">
                      <PhoneCall className="w-3 h-3" /> {br.branchManagerContact || "N/A"}
                    </div>
                    {br.branchEmail && (
                      <div className="text-[#9C9890] text-[10px] mt-0.5">{br.branchEmail}</div>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-semibold text-slate-700">AO: {br.aoName || "N/A"}</div>
                    <div className="text-slate-600">FO: {br.foName || "N/A"}</div>
                    <div className="text-[#9C9890] text-[10px] flex items-center gap-1 mt-0.5">
                      <PhoneCall className="w-3 h-3" /> {br.foContact || "N/A"}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="text-slate-600 font-semibold mt-1">RBO: {br.rbo || "N/A"}</div>
                  </td>
                  <td className="py-3 px-4 text-[#9C9890] text-right">
                    {new Date(br.createdAt).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-center gap-2">
                      {/* Edit Branch button */}
                      {onEditBranch && (
                        <button
                          onClick={() => onEditBranch(br)}
                          className="px-3 py-1.5 bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-600 hover:text-white rounded text-[10px] font-bold uppercase tracking-wide transition-colors flex items-center gap-1 whitespace-nowrap"
                          title="Edit Branch Details"
                        >
                          <Pencil className="w-3 h-3" /> Edit
                        </button>
                      )}
                      {/* Business Development (formerly Marketing Pitch) button */}
                      <button
                        onClick={() => setShowMarketingForm({ show: true, branch: br })}
                        className="px-3 py-1.5 bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-600 hover:text-white rounded text-[10px] font-bold uppercase tracking-wide transition-colors flex items-center gap-1 whitespace-nowrap"
                      >
                        <TrendingUp className="w-3 h-3" /> Business Development
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filteredBranches.length === 0 && !loading && (
              <tr>
                <td colSpan={6} className="text-center py-12 text-[#9C9890] text-xs uppercase tracking-wider">
                  No Branches Added Yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
