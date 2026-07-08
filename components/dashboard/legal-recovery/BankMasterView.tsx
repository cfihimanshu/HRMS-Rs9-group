import React, { useState } from "react";
import { Search } from "lucide-react";

export default function BankMasterView({ banksList, branchesList, loading }: { banksList: any[], branchesList: any[], loading: boolean }) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredBanks = banksList.filter(b => b.bankName?.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-[#FCFBF9] border border-[#E8E4DF] p-4 rounded-xl flex items-center gap-3">
        <Search className="w-4 h-4 text-[#9C9890]" />
        <input 
          type="text" 
          className="bg-transparent border-none focus:outline-none text-xs w-full font-semibold text-slate-700 placeholder:text-[#9C9890] placeholder:font-normal" 
          placeholder="Search Banks..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Table */}
      <div className="bg-[#FCFBF9] border border-[#E8E4DF] rounded-xl overflow-hidden shadow-sm">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-[#E8E4DF] bg-[#F5F0EA]/40 text-[#5D5B57] text-[10px] uppercase font-bold tracking-wider">
              <th className="py-3.5 px-6">Bank Name</th>
              <th className="py-3.5 px-6">Bank Code</th>
              <th className="py-3.5 px-6 text-center">Total Branches</th>
              <th className="py-3.5 px-6">Status</th>
              <th className="py-3.5 px-6 text-right">Created On</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E8E4DF] text-xs">
            {filteredBanks.map(b => (
              <tr key={b.id} className="hover:bg-white transition-colors">
                <td className="py-3 px-6 font-bold text-[#1C1C1A]">{b.bankName}</td>
                <td className="py-3 px-6 text-sky-700 font-mono font-semibold">{b.bankCode}</td>
                <td className="py-3 px-6 text-center font-bold text-slate-500">
                  {branchesList.filter(br => br.bankId === b.id).length}
                </td>
                <td className="py-3 px-6">
                  <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">Active</span>
                </td>
                <td className="py-3 px-6 text-[#9C9890] text-right">
                  {new Date(b.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
            {filteredBanks.length === 0 && !loading && (
              <tr>
                <td colSpan={5} className="text-center py-12 text-[#9C9890] text-xs uppercase tracking-wider">
                  No Banks Added Yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
