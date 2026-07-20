import React, { useState } from "react";
import { Search, Trash2 } from "lucide-react";

export default function NbfcMasterView({
  nbfcsList,
  nbfcBranchesList,
  loading,
  onDeleteNbfc
}: {
  nbfcsList: any[];
  nbfcBranchesList: any[];
  loading: boolean;
  onDeleteNbfc?: (id: number) => void;
}) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredNbfcs = nbfcsList.filter(
    b =>
      b.nbfcName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.nbfcCode?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Filters */}
      <div className="bg-[#FCFBF9] border border-[#E8E4DF] p-4 rounded-xl flex items-center gap-3">
        <Search className="w-4 h-4 text-[#9C9890]" />
        <input
          type="text"
          className="bg-transparent border-none focus:outline-none text-xs w-full font-semibold text-slate-700 placeholder:text-[#9C9890] placeholder:font-normal"
          placeholder="Search NBFC Master by Name or Code..."
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
              <th className="py-3.5 px-6">NBFC Name</th>
              <th className="py-3.5 px-6">NBFC Code</th>
              <th className="py-3.5 px-6 text-center">Total Branches</th>
              <th className="py-3.5 px-6">Status</th>
              <th className="py-3.5 px-6 text-right">Created On</th>
              <th className="py-3.5 px-6 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E8E4DF] text-xs">
            {filteredNbfcs.map(b => (
              <tr key={b.id} className="hover:bg-white transition-colors">
                <td className="py-3 px-4 text-center font-mono font-bold text-indigo-700">#{b.id}</td>
                <td className="py-3 px-6 font-bold text-[#1C1C1A]">{b.nbfcName}</td>
                <td className="py-3 px-6 text-indigo-700 font-mono font-bold">{b.nbfcCode || "—"}</td>
                <td className="py-3 px-6 text-center font-bold text-slate-600">
                  {nbfcBranchesList.filter(br => br.nbfcId === b.id).length}
                </td>
                <td className="py-3 px-6">
                  <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">Active</span>
                </td>
                <td className="py-3 px-6 text-[#9C9890] text-right">
                  {b.createdAt ? new Date(b.createdAt).toLocaleDateString("en-IN") : "—"}
                </td>
                <td className="py-3 px-6 text-center">
                  {onDeleteNbfc && (
                    <button
                      onClick={() => onDeleteNbfc(b.id)}
                      className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition-colors"
                      title="Delete NBFC"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {filteredNbfcs.length === 0 && !loading && (
              <tr>
                <td colSpan={7} className="text-center py-12 text-[#9C9890] text-xs uppercase tracking-wider font-semibold">
                  No NBFCs Registered Yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
