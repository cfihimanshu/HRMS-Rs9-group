import React, { useState } from "react";
import { Search, Trash2, Edit2 } from "lucide-react";

export default function NbfcBranchMasterView({
  nbfcBranchesList,
  nbfcsList,
  loading,
  onEditBranch,
  onDeleteBranch
}: {
  nbfcBranchesList: any[];
  nbfcsList: any[];
  loading: boolean;
  onEditBranch?: (branch: any) => void;
  onDeleteBranch?: (id: number) => void;
}) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredBranches = nbfcBranchesList.filter(
    br =>
      br.branchName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      br.branchCode?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      br.branchManager?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Search Bar */}
      <div className="bg-[#FCFBF9] border border-[#E8E4DF] p-4 rounded-xl flex items-center gap-3">
        <Search className="w-4 h-4 text-[#9C9890]" />
        <input
          type="text"
          className="bg-transparent border-none focus:outline-none text-xs w-full font-semibold text-slate-700 placeholder:text-[#9C9890] placeholder:font-normal"
          placeholder="Search NBFC Branches by Name, Code or Manager..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Table */}
      <div className="bg-[#FCFBF9] border border-[#E8E4DF] rounded-xl overflow-hidden shadow-sm">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-[#E8E4DF] bg-[#F5F0EA]/40 text-[#5D5B57] text-[10px] uppercase font-bold tracking-wider">
              <th className="py-3.5 px-4 text-center">ID</th>
              <th className="py-3.5 px-6">Branch Name / Area</th>
              <th className="py-3.5 px-6">Branch Code</th>
              <th className="py-3.5 px-6">NBFC Name</th>
              <th className="py-3.5 px-6">Branch Manager &amp; Contact</th>
              <th className="py-3.5 px-6 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E8E4DF] text-xs">
            {filteredBranches.map(br => {
              const nbfc = nbfcsList.find(n => n.id === br.nbfcId);
              return (
                <tr key={br.id} className="hover:bg-white transition-colors">
                  <td className="py-3 px-4 text-center font-mono font-bold text-violet-700">#{br.id}</td>
                  <td className="py-3 px-6 font-bold text-[#1C1C1A]">{br.branchName}</td>
                  <td className="py-3 px-6 text-violet-700 font-mono font-bold">{br.branchCode || "—"}</td>
                  <td className="py-3 px-6 font-bold text-indigo-900">{nbfc?.nbfcName || "NBFC Master"}</td>
                  <td className="py-3 px-6 text-slate-600">
                    <div className="font-semibold text-slate-800">{br.branchManager || "N/A"}</div>
                    {br.branchManagerContact && <div className="text-[10px] text-slate-500 font-mono">{br.branchManagerContact}</div>}
                    {(br.aoName || br.foName) && (
                      <div className="text-[10px] text-indigo-600 font-medium mt-1">
                        {br.aoName && <span>AO: {br.aoName} </span>}
                        {br.foName && <span>| FO: {br.foName} ({br.foContact || 'N/A'})</span>}
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-6 text-center">
                    <div className="flex justify-center gap-1">
                      {onEditBranch && (
                        <button
                          onClick={() => onEditBranch(br)}
                          className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
                          title="Edit Branch"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {onDeleteBranch && (
                        <button
                          onClick={() => onDeleteBranch(br.id)}
                          className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition-colors"
                          title="Delete Branch"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {filteredBranches.length === 0 && !loading && (
              <tr>
                <td colSpan={6} className="text-center py-12 text-[#9C9890] text-xs uppercase tracking-wider font-semibold">
                  No NBFC Branches Registered Yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
