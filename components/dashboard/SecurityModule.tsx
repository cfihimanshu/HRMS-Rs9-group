"use client";
import React, { useState, useEffect } from "react";
import {
  Search, PlusCircle, RefreshCw, X, ArrowLeft, LayoutGrid,
  Building2, Network, ShieldCheck
} from "lucide-react";
import NbfcMasterView from "./legal-recovery/NbfcMasterView";
import NbfcBranchMasterView from "./legal-recovery/NbfcBranchMasterView";
import SecurityMasterView from "./legal-recovery/SecurityMasterView";

interface SecurityModuleProps {
  userRole?: string;
  triggerToast: (msg: string) => void;
  sessionUser?: any;
}

export default function SecurityModule({ userRole, triggerToast, sessionUser }: SecurityModuleProps) {
  const [activeSubModule, setActiveSubModule] = useState<"launcher" | "nbfcs" | "nbfc-branches" | "security">("launcher");
  const [nbfcsList, setNbfcsList] = useState<any[]>([]);
  const [nbfcBranchesList, setNbfcBranchesList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [showAddNbfcForm, setShowAddNbfcForm] = useState(false);
  const [showAddNbfcBranchForm, setShowAddNbfcBranchForm] = useState(false);
  const [editNbfcId, setEditNbfcId] = useState<number | null>(null);
  const [editNbfcBranchId, setEditNbfcBranchId] = useState<number | null>(null);

  // Submitting States
  const [submittingNbfc, setSubmittingNbfc] = useState(false);
  const [submittingNbfcBranch, setSubmittingNbfcBranch] = useState(false);

  // Forms
  const [nbfcForm, setNbfcForm] = useState({ nbfcName: "", nbfcCode: "" });
  const [nbfcBranchForm, setNbfcBranchForm] = useState({
    nbfcId: "", branchName: "", branchCode: "", branchEmail: "", branchManager: "",
    branchManagerContact: "", aoName: "", foName: "", foContact: "", rbo: ""
  });

  const fetchNbfcs = async () => {
    try {
      const res = await fetch("/api/legal-recovery/nbfc");
      const data = await res.json();
      if (res.ok && data.success) {
        setNbfcsList(data.data || []);
      }
    } catch (error) {
      console.error("Error fetching NBFCs:", error);
    }
  };

  const fetchNbfcBranches = async () => {
    try {
      const res = await fetch("/api/legal-recovery/nbfc-branches");
      const data = await res.json();
      if (res.ok && data.success) {
        setNbfcBranchesList(data.data || []);
      }
    } catch (error) {
      console.error("Error fetching NBFC branches:", error);
    }
  };

  const reloadAll = async () => {
    setLoading(true);
    await Promise.all([fetchNbfcs(), fetchNbfcBranches()]);
    setLoading(false);
  };

  useEffect(() => {
    reloadAll();
  }, []);

  const handleAddNbfcSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingNbfc(true);
    try {
      const res = await fetch("/api/legal-recovery/nbfc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nbfcForm)
      });
      const data = await res.json();
      if (data.success) {
        triggerToast("NBFC registered successfully!");
        setNbfcForm({ nbfcName: "", nbfcCode: "" });
        setShowAddNbfcForm(false);
        fetchNbfcs();
      } else {
        triggerToast(data.error || "Failed to add NBFC");
      }
    } catch (error) {
      console.error(error);
      triggerToast("Error saving NBFC");
    } finally {
      setSubmittingNbfc(false);
    }
  };

  const handleDeleteNbfc = async (id: number) => {
    if (!confirm("Are you sure you want to delete this NBFC?")) return;
    try {
      const res = await fetch(`/api/legal-recovery/nbfc?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        triggerToast("NBFC deleted successfully");
        fetchNbfcs();
      } else {
        triggerToast(data.error || "Failed to delete NBFC");
      }
    } catch (error) {
      console.error(error);
      triggerToast("Error deleting NBFC");
    }
  };

  const handleAddNbfcBranchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingNbfcBranch(true);
    try {
      const payload = {
        ...nbfcBranchForm,
        id: editNbfcBranchId || undefined
      };
      const res = await fetch("/api/legal-recovery/nbfc-branches", {
        method: editNbfcBranchId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        triggerToast(editNbfcBranchId ? "NBFC Branch updated successfully!" : "NBFC Branch registered successfully!");
        setNbfcBranchForm({ nbfcId: "", branchName: "", branchCode: "", branchEmail: "", branchManager: "", branchManagerContact: "", aoName: "", foName: "", foContact: "", rbo: "" });
        setShowAddNbfcBranchForm(false);
        setEditNbfcBranchId(null);
        fetchNbfcBranches();
      } else {
        triggerToast(data.error || "Failed to save NBFC branch");
      }
    } catch (error) {
      console.error(error);
      triggerToast("Error saving NBFC branch");
    } finally {
      setSubmittingNbfcBranch(false);
    }
  };

  const handleDeleteNbfcBranch = async (id: number) => {
    if (!confirm("Are you sure you want to delete this NBFC branch?")) return;
    try {
      const res = await fetch(`/api/legal-recovery/nbfc-branches?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        triggerToast("NBFC Branch deleted successfully");
        fetchNbfcBranches();
      } else {
        triggerToast(data.error || "Failed to delete NBFC branch");
      }
    } catch (error) {
      console.error(error);
      triggerToast("Error deleting NBFC branch");
    }
  };

  // LAUNCHER VIEW
  if (activeSubModule === "launcher") {
    return (
      <div className="space-y-6 animate-fade-in text-[#1C1C1A]">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#E8E4DF] pb-5">
          <div>
            <span className="text-[9px] uppercase tracking-widest text-emerald-600 font-bold flex items-center gap-1">
              <LayoutGrid className="w-3 h-3 text-[#C9A84C]" /> App Modules
            </span>
            <h2 className="text-xl font-light tracking-wide font-serif" style={{ fontFamily: "'Playfair Display', serif" }}>
              Security Apps
            </h2>
          </div>
          <button
            onClick={reloadAll}
            disabled={loading}
            className="p-2 border border-slate-200 dark:border-gray-700 rounded-xl hover:bg-slate-50 dark:hover:bg-gray-800 text-slate-600 dark:text-gray-300 transition shadow-2xs shrink-0 cursor-pointer"
            title="Refresh list"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* Security Apps Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
          {/* Module 1: NBFC Master */}
          <button
            onClick={() => setActiveSubModule("nbfcs")}
            className="group flex flex-col items-center justify-center p-6 bg-white dark:bg-gray-900 border border-[#E8E4DF] dark:border-gray-800 rounded-2xl hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:border-indigo-200 transition-all duration-300 cursor-pointer"
          >
            <div className="w-16 h-16 bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-950/50 dark:to-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-sm">
              <Building2 size={28} strokeWidth={2} />
            </div>
            <span className="font-bold text-sm text-slate-800 dark:text-gray-100">NBFC Master</span>
            <span className="text-[10px] text-slate-500 dark:text-gray-400 mt-1 uppercase tracking-wider font-semibold">Add NBFC</span>
          </button>

          {/* Module 2: NBFC Branch Master */}
          <button
            onClick={() => setActiveSubModule("nbfc-branches")}
            className="group flex flex-col items-center justify-center p-6 bg-white dark:bg-gray-900 border border-[#E8E4DF] dark:border-gray-800 rounded-2xl hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:border-violet-200 transition-all duration-300 cursor-pointer"
          >
            <div className="w-16 h-16 bg-gradient-to-br from-violet-50 to-violet-100 dark:from-violet-950/50 dark:to-violet-900/50 text-violet-600 dark:text-violet-400 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-sm">
              <Network size={28} strokeWidth={2} />
            </div>
            <span className="font-bold text-sm text-slate-800 dark:text-gray-100">NBFC Branch Master</span>
            <span className="text-[10px] text-slate-500 dark:text-gray-400 mt-1 uppercase tracking-wider font-semibold">Add NBFC Branches</span>
          </button>

          {/* Module 3: Security */}
          <button
            onClick={() => setActiveSubModule("security")}
            className="group flex flex-col items-center justify-center p-6 bg-white dark:bg-gray-900 border border-[#E8E4DF] dark:border-gray-800 rounded-2xl hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:border-emerald-200 transition-all duration-300 cursor-pointer"
          >
            <div className="w-16 h-16 bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950/50 dark:to-emerald-900/50 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-sm">
              <ShieldCheck size={28} strokeWidth={2} />
            </div>
            <span className="font-bold text-sm text-slate-800 dark:text-gray-100">Security</span>
            <span className="text-[10px] text-slate-500 dark:text-gray-400 mt-1 uppercase tracking-wider font-semibold">Security Deposits &amp; Bills</span>
          </button>
        </div>
      </div>
    );
  }

  // INNER MODULE VIEW
  return (
    <div className="space-y-6 animate-fade-in text-[#1C1C1A]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#E8E4DF] pb-5">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setActiveSubModule("launcher")}
            className="p-2 bg-slate-100 dark:bg-gray-800 text-slate-600 dark:text-gray-300 rounded-full hover:bg-slate-200 dark:hover:bg-gray-700 transition-colors cursor-pointer"
            title="Back to Apps"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <span className="text-[9px] uppercase tracking-widest text-emerald-600 font-bold flex items-center gap-1">
              <LayoutGrid className="w-3 h-3 text-[#C9A84C]" /> Security / {activeSubModule.replace('-', ' ')}
            </span>
            <h2 className="text-xl font-light tracking-wide font-serif capitalize" style={{ fontFamily: "'Playfair Display', serif" }}>
              {activeSubModule.replace('-', ' ')}
            </h2>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              fetchNbfcs();
              fetchNbfcBranches();
            }}
            className="p-2 bg-slate-100 dark:bg-gray-800 text-slate-600 dark:text-gray-300 rounded-lg hover:bg-slate-200 dark:hover:bg-gray-700 transition-colors cursor-pointer"
            title="Refresh Data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {activeSubModule === "nbfcs" && (
            <button
              onClick={() => setShowAddNbfcForm(!showAddNbfcForm)}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-semibold tracking-wider uppercase transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              {showAddNbfcForm ? "Close Form" : "Add NBFC Master"}
            </button>
          )}

          {activeSubModule === "nbfc-branches" && (
            <button
              onClick={() => {
                if (showAddNbfcBranchForm) {
                  setShowAddNbfcBranchForm(false);
                  setEditNbfcBranchId(null);
                  setNbfcBranchForm({ nbfcId: "", branchName: "", branchCode: "", branchEmail: "", branchManager: "", branchManagerContact: "", aoName: "", foName: "", foContact: "", rbo: "" });
                } else {
                  setShowAddNbfcBranchForm(true);
                }
              }}
              className="px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-[10px] font-semibold tracking-wider uppercase transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              {showAddNbfcBranchForm ? "Close Form" : "Add NBFC Branch Master"}
            </button>
          )}
        </div>
      </div>

      {/* Add New NBFC Form */}
      {showAddNbfcForm && activeSubModule === "nbfcs" && (
        <div className="bg-white dark:bg-gray-900 border border-[#E8E4DF] dark:border-gray-800 rounded-xl p-5 shadow-sm animate-slide-down">
          <div className="flex justify-between items-center border-b border-[#E8E4DF] dark:border-gray-800 pb-3 mb-4">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-indigo-600" /> Register New NBFC
            </h3>
            <button onClick={() => setShowAddNbfcForm(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
          <form onSubmit={handleAddNbfcSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">NBFC Name *</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Bajaj Finance Ltd"
                  value={nbfcForm.nbfcName}
                  onChange={e => {
                    const val = e.target.value;
                    const words = val.split(/\s+/).filter(w => !['of', 'and', 'the', 'in', 'ltd', 'limited'].includes(w.toLowerCase()));
                    let autoCode = "";
                    if (words.length === 1) {
                      autoCode = words[0].substring(0, 4).toUpperCase();
                    } else if (words.length > 1) {
                      autoCode = words.map(w => w[0]).join('').substring(0, 4).toUpperCase();
                    }
                    setNbfcForm({ ...nbfcForm, nbfcName: val, nbfcCode: autoCode });
                  }}
                  className="w-full bg-white dark:bg-gray-800 border border-[#E8E4DF] dark:border-gray-700 focus:border-indigo-500 rounded-lg px-3 py-2 text-xs focus:outline-none text-slate-800 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">NBFC Code (Auto / Editable) *</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. BAJAJ"
                  value={nbfcForm.nbfcCode}
                  onChange={e => setNbfcForm({ ...nbfcForm, nbfcCode: e.target.value.toUpperCase() })}
                  className="w-full bg-white dark:bg-gray-800 border border-[#E8E4DF] dark:border-gray-700 focus:border-indigo-500 rounded-lg px-3 py-2 text-xs focus:outline-none font-mono font-bold text-slate-800 dark:text-gray-100"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <button disabled={submittingNbfc} type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold uppercase tracking-wider hover:bg-indigo-700 disabled:opacity-50 cursor-pointer">
                {submittingNbfc ? "Saving..." : "Save NBFC Master"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Add / Edit NBFC Branch Form */}
      {showAddNbfcBranchForm && activeSubModule === "nbfc-branches" && (
        <div className="bg-white dark:bg-gray-900 border border-[#E8E4DF] dark:border-gray-800 rounded-xl p-5 shadow-sm animate-slide-down">
          <div className="flex justify-between items-center border-b border-[#E8E4DF] dark:border-gray-800 pb-3 mb-4">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
              <Network className="w-4 h-4 text-violet-600" /> {editNbfcBranchId ? "✏️ Edit NBFC Branch Details" : "Register New NBFC Branch"}
            </h3>
            <button onClick={() => { setShowAddNbfcBranchForm(false); setEditNbfcBranchId(null); setNbfcBranchForm({ nbfcId: "", branchName: "", branchCode: "", branchEmail: "", branchManager: "", branchManagerContact: "", aoName: "", foName: "", foContact: "", rbo: "" }); }} className="text-slate-400 hover:text-slate-600 cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
          <form onSubmit={handleAddNbfcBranchSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Select NBFC *</label>
                <select
                  required
                  value={nbfcBranchForm.nbfcId}
                  onChange={e => setNbfcBranchForm({ ...nbfcBranchForm, nbfcId: e.target.value })}
                  className="w-full bg-white dark:bg-gray-800 border border-[#E8E4DF] dark:border-gray-700 focus:border-violet-500 rounded-lg px-3 py-2 text-xs focus:outline-none text-slate-800 dark:text-gray-100 cursor-pointer"
                >
                  <option value="">-- Choose an NBFC --</option>
                  {nbfcsList.map(b => (
                    <option key={b.id} value={b.id}>{b.nbfcName} ({b.nbfcCode})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Branch Name *</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Connaught Place Branch"
                  value={nbfcBranchForm.branchName}
                  onChange={e => {
                    const val = e.target.value;
                    const selectedNbfc = nbfcsList.find(b => b.id.toString() === nbfcBranchForm.nbfcId);
                    const nbfcCode = selectedNbfc ? selectedNbfc.nbfcCode : "NBFC";
                    const words = val.split(/\s+/).filter(w => !['branch', 'of', 'the', 'in'].includes(w.toLowerCase()));
                    let branchCodeSuffix = "";
                    if (words.length === 1) {
                      branchCodeSuffix = words[0].substring(0, 3).toUpperCase();
                    } else if (words.length > 1) {
                      branchCodeSuffix = words.map(w => w[0]).join('').substring(0, 4).toUpperCase();
                    }
                    setNbfcBranchForm({ ...nbfcBranchForm, branchName: val, branchCode: `${nbfcCode}-${branchCodeSuffix}` });
                  }}
                  className="w-full bg-white dark:bg-gray-800 border border-[#E8E4DF] dark:border-gray-700 focus:border-violet-500 rounded-lg px-3 py-2 text-xs focus:outline-none text-slate-800 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Branch Code (Auto / Custom) *</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. BAJAJ-DEL"
                  value={nbfcBranchForm.branchCode}
                  onChange={e => setNbfcBranchForm({ ...nbfcBranchForm, branchCode: e.target.value.toUpperCase() })}
                  className="w-full bg-white dark:bg-gray-800 border border-[#E8E4DF] dark:border-gray-700 focus:border-violet-500 rounded-lg px-3 py-2 text-xs focus:outline-none font-mono font-bold text-slate-800 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Branch Email (For Auto-Dispatch)</label>
                <input
                  type="email"
                  placeholder="branch@nbfc.com"
                  value={nbfcBranchForm.branchEmail}
                  onChange={e => setNbfcBranchForm({ ...nbfcBranchForm, branchEmail: e.target.value })}
                  className="w-full bg-white dark:bg-gray-800 border border-[#E8E4DF] dark:border-gray-700 focus:border-violet-500 rounded-lg px-3 py-2 text-xs focus:outline-none text-slate-800 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Branch Manager</label>
                <input
                  type="text"
                  placeholder="Manager Name"
                  value={nbfcBranchForm.branchManager}
                  onChange={e => setNbfcBranchForm({ ...nbfcBranchForm, branchManager: e.target.value })}
                  className="w-full bg-white dark:bg-gray-800 border border-[#E8E4DF] dark:border-gray-700 focus:border-violet-500 rounded-lg px-3 py-2 text-xs focus:outline-none text-slate-800 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Manager Contact</label>
                <input
                  type="text"
                  placeholder="Contact Number"
                  value={nbfcBranchForm.branchManagerContact}
                  onChange={e => setNbfcBranchForm({ ...nbfcBranchForm, branchManagerContact: e.target.value })}
                  className="w-full bg-white dark:bg-gray-800 border border-[#E8E4DF] dark:border-gray-700 focus:border-violet-500 rounded-lg px-3 py-2 text-xs focus:outline-none text-slate-800 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Authorised Officer (AO)</label>
                <input
                  type="text"
                  placeholder="AO Name"
                  value={nbfcBranchForm.aoName}
                  onChange={e => setNbfcBranchForm({ ...nbfcBranchForm, aoName: e.target.value })}
                  className="w-full bg-white dark:bg-gray-800 border border-[#E8E4DF] dark:border-gray-700 focus:border-violet-500 rounded-lg px-3 py-2 text-xs focus:outline-none text-slate-800 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Field Officer (FO)</label>
                <input
                  type="text"
                  placeholder="FO Name"
                  value={nbfcBranchForm.foName}
                  onChange={e => setNbfcBranchForm({ ...nbfcBranchForm, foName: e.target.value })}
                  className="w-full bg-white dark:bg-gray-800 border border-[#E8E4DF] dark:border-gray-700 focus:border-violet-500 rounded-lg px-3 py-2 text-xs focus:outline-none text-slate-800 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">FO Contact Number</label>
                <input
                  type="text"
                  placeholder="FO Phone Number"
                  value={nbfcBranchForm.foContact}
                  onChange={e => setNbfcBranchForm({ ...nbfcBranchForm, foContact: e.target.value })}
                  className="w-full bg-white dark:bg-gray-800 border border-[#E8E4DF] dark:border-gray-700 focus:border-violet-500 rounded-lg px-3 py-2 text-xs focus:outline-none text-slate-800 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Regional Business Office (RBO / Zone)</label>
                <input
                  type="text"
                  placeholder="e.g. North Zone - RBO 1"
                  value={nbfcBranchForm.rbo}
                  onChange={e => setNbfcBranchForm({ ...nbfcBranchForm, rbo: e.target.value })}
                  className="w-full bg-white dark:bg-gray-800 border border-[#E8E4DF] dark:border-gray-700 focus:border-violet-500 rounded-lg px-3 py-2 text-xs focus:outline-none text-slate-800 dark:text-gray-100"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => { setShowAddNbfcBranchForm(false); setEditNbfcBranchId(null); }}
                className="px-4 py-2 bg-slate-100 dark:bg-gray-800 hover:bg-slate-200 dark:hover:bg-gray-750 text-slate-600 dark:text-gray-300 rounded-lg text-xs font-semibold uppercase tracking-wider cursor-pointer"
              >
                Cancel
              </button>
              <button disabled={submittingNbfcBranch} type="submit" className="px-4 py-2 bg-violet-600 text-white rounded-lg text-xs font-semibold uppercase tracking-wider hover:bg-violet-700 disabled:opacity-50 cursor-pointer">
                {submittingNbfcBranch ? "Saving..." : editNbfcBranchId ? "Update Branch" : "Save NBFC Branch"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Submodule Views */}
      {activeSubModule === "nbfcs" && (
        <NbfcMasterView
          nbfcsList={nbfcsList}
          nbfcBranchesList={nbfcBranchesList}
          loading={loading}
          onDeleteNbfc={handleDeleteNbfc}
          triggerToast={triggerToast}
        />
      )}

      {activeSubModule === "nbfc-branches" && (
        <NbfcBranchMasterView
          nbfcBranchesList={nbfcBranchesList}
          nbfcsList={nbfcsList}
          loading={loading}
          onEditBranch={(br: any) => {
            setNbfcBranchForm({
              nbfcId: br.nbfcId?.toString() || "",
              branchName: br.branchName || "",
              branchCode: br.branchCode || "",
              branchEmail: br.branchEmail || "",
              branchManager: br.branchManager || "",
              branchManagerContact: br.branchManagerContact || "",
              aoName: br.aoName || "",
              foName: br.foName || "",
              foContact: br.foContact || "",
              rbo: br.rbo || ""
            });
            setEditNbfcBranchId(br.id);
            setShowAddNbfcBranchForm(true);
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          onDeleteBranch={handleDeleteNbfcBranch}
        />
      )}

      {activeSubModule === "security" && (
        <SecurityMasterView
          nbfcsList={nbfcsList}
          nbfcBranchesList={nbfcBranchesList}
          triggerToast={triggerToast}
        />
      )}
    </div>
  );
}
