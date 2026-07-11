"use client";
import React, { useState, useEffect, useMemo } from "react";
import ReactDOM from "react-dom";
import { Search, Plus, Trash2, X, RefreshCw, Landmark, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface LegalRecoveryProps {
  userRole?: string;
  triggerToast: (msg: string) => void;
  sessionUser?: any;
}

export default function LegalRecovery({ userRole, triggerToast, sessionUser }: LegalRecoveryProps) {
  const [banks, setBanks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [bankName, setBankName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Delete states
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchBanks = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/banks");
      const data = await res.json();
      if (res.ok && data.success) {
        setBanks(data.data || []);
      } else {
        triggerToast(data.error || "Failed to load banks");
      }
    } catch (error) {
      console.error("Error fetching banks:", error);
      triggerToast("Error loading bank records");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBanks();
  }, []);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bankName.trim()) return;

    try {
      setSubmitting(true);
      const res = await fetch("/api/banks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bankName: bankName.trim() })
      });
      
      const data = await res.json();
      if (res.ok && data.success) {
        triggerToast("Bank added successfully!");
        setBankName("");
        setShowAddModal(false);
        fetchBanks();
      } else {
        triggerToast(data.error || "Failed to add bank");
      }
    } catch (error) {
      console.error("Error adding bank:", error);
      triggerToast("Error saving bank details");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirmId) return;

    try {
      setDeleting(true);
      const res = await fetch(`/api/banks?id=${deleteConfirmId}`, {
        method: "DELETE"
      });
      const data = await res.json();
      if (res.ok && data.success) {
        triggerToast("Bank deleted successfully");
        setDeleteConfirmId(null);
        fetchBanks();
      } else {
        triggerToast(data.error || "Failed to delete bank");
      }
    } catch (error) {
      console.error("Error deleting bank:", error);
      triggerToast("Error deleting bank record");
    } finally {
      setDeleting(false);
    }
  };

  const filteredBanks = useMemo(() => {
    return banks.filter(bank => 
      bank.bankName?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [banks, searchQuery]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-serif font-light text-[#1C1C1A]" style={{ fontFamily: "'Playfair Display', serif" }}>
            Legal Recovery
          </h1>
          <p className="text-xs text-[#9C9890] mt-1">
            Manage corporate bank listings and master bank records for unique ID generation.
          </p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={fetchBanks} 
            disabled={loading}
            className="p-2 bg-[#FCFBF9] hover:bg-[#F5F0EA] border border-[#E8E4DF] text-[#5D5B57] hover:text-[#1C1C1A] rounded-xl transition-all shadow-sm"
          >
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-[#C9A84C] hover:bg-[#B5963D] text-white rounded-xl text-xs font-semibold uppercase tracking-wider transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" /> Add Bank
          </button>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="bg-[#FCFBF9] border border-[#E8E4DF] p-4 rounded-xl">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9C9890]" />
          <input
            type="text"
            placeholder="Search bank name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg pl-9 pr-3 py-2 text-xs text-[#1C1C1A] placeholder-[#9C9890] focus:outline-none transition-all font-sans"
          />
        </div>
      </div>

      {/* Table Section */}
      {loading ? (
        <div className="bg-white border border-[#E8E4DF] rounded-2xl p-12 text-center shadow-sm">
          <RefreshCw className="w-8 h-8 text-[#C9A84C] animate-spin mx-auto mb-3" />
          <p className="text-[#9C9890] text-xs uppercase tracking-widest font-semibold">Loading bank directory...</p>
        </div>
      ) : filteredBanks.length === 0 ? (
        <div className="bg-white border border-[#E8E4DF] rounded-2xl p-12 text-center shadow-sm">
          <Landmark className="w-8 h-8 text-[#9C9890] mx-auto mb-2" />
          <p className="text-[#9C9890] text-xs uppercase tracking-widest font-semibold">No bank records found</p>
        </div>
      ) : (
        <div className="bg-white border border-[#E8E4DF] rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-[#E8E4DF] bg-[#F5F0EA]/30 text-[#5D5B57] text-[10px] uppercase font-bold tracking-wider">
                  <th className="py-4 px-6 font-bold w-24">Unique ID</th>
                  <th className="py-4 px-6 font-bold">Bank Name</th>
                  <th className="py-4 px-6 font-bold w-48">Added On</th>
                  <th className="py-4 px-6 font-bold text-center w-24">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8E4DF] text-xs">
                {filteredBanks.map((bank) => {
                  const addedOn = bank.createdAt ? new Date(bank.createdAt).toLocaleDateString() : "N/A";
                  return (
                    <tr key={bank.id} className="hover:bg-[#FAFAF7]/50 transition-colors">
                      <td className="py-4 px-6 font-mono text-slate-500 font-medium">
                        {bank.id}
                      </td>
                      <td className="py-4 px-6 font-semibold text-slate-800 text-sm">
                        {bank.bankName}
                      </td>
                      <td className="py-4 px-6 text-[#9C9890]">
                        {addedOn}
                      </td>
                      <td className="py-4 px-6 text-center">
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmId(bank.id)}
                          className="p-1.5 bg-red-50 text-red-500 hover:bg-red-100 hover:text-red-600 rounded-lg transition-colors mx-auto flex items-center justify-center"
                          title="Delete Bank Record"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Bank Modal — Portal */}
      {showAddModal && typeof document !== "undefined" && ReactDOM.createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center" style={{ backgroundColor: "rgba(0,0,0,0.4)" }} onClick={() => setShowAddModal(false)}>
          <div
            className="bg-white rounded-2xl shadow-2xl p-6 w-[400px] max-w-[95vw] border border-[#E8E4DF]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center border-b border-[#E8E4DF] pb-3 mb-4">
              <h3 className="text-lg font-serif font-light text-[#1C1C1A]" style={{ fontFamily: "'Playfair Display', serif" }}>
                Add New Bank
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-[#9C9890] hover:text-[#1C1C1A] transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-4 text-left">
              <div>
                <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Bank Name *</label>
                <input
                  type="text"
                  required
                  placeholder="Enter full bank name..."
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-semibold"
                />
              </div>

              <div className="flex gap-3 pt-3 border-t border-[#E8E4DF] mt-6">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2 rounded-lg border border-[#E8E4DF] text-xs font-semibold uppercase tracking-wider text-[#5D5B57] hover:bg-[#F5F0EA] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2 rounded-lg bg-[#C9A84C] text-white text-xs font-semibold uppercase tracking-wider hover:bg-[#B5963D] disabled:opacity-50 transition-colors shadow-sm"
                >
                  {submitting ? "Saving..." : "Add Bank"}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Delete Confirmation Modal — Portal */}
      {deleteConfirmId && typeof document !== "undefined" && ReactDOM.createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center" style={{ backgroundColor: "rgba(0,0,0,0.4)" }} onClick={() => setDeleteConfirmId(null)}>
          <div
            className="bg-white rounded-2xl shadow-2xl p-6 w-[360px] max-w-[95vw] border border-[#E8E4DF] text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-full bg-red-50 text-red-500 flex items-center justify-center mx-auto mb-3">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-800 mb-1">Delete Bank Record?</h3>
            <p className="text-xs text-[#9C9890] mb-6">
              Are you sure you want to delete this bank record? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 px-4 py-2 rounded-lg border border-[#E8E4DF] text-xs font-semibold uppercase tracking-wider text-[#5D5B57] hover:bg-[#F5F0EA] transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={deleting}
                className="flex-1 px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white text-xs font-semibold uppercase tracking-wider transition-colors shadow-sm disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
