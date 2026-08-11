import React, { useState, useEffect } from "react";
import { Plus, Search, UserPlus, RefreshCw, AlertCircle, CheckCircle, FileText, Download, LayoutGrid, List, Building2, Phone, Mail, MapPin, Paperclip, Trash2, Edit3 } from "lucide-react";

interface PartnerProps {
  toggleModal: (modalId: string, open: boolean) => void;
  triggerToast: (msg: string) => void;
}

export function BusinessAssociates({ toggleModal, triggerToast }: PartnerProps) {
  const [associates, setAssociates] = useState<any[]>([]);
  const [selectedAssociate, setSelectedAssociate] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formState, setFormState] = useState({
    territory: "",
    leadsGenerated: 0,
    conversionRate: 0,
    payoutTerms: "",
    reportingDiscipline: 100,
    complaintRatio: 0,
    clientFeedback: 100,
    riskScore: 0,
    exitRisk: "Low",
    flags: [] as string[]
  });

  // FORM-9 State
  const [showForm9, setShowForm9] = useState(false);
  const [form9, setForm9] = useState({
    territory: "",
    leads: 0,
    conversion: 0,
    collectionPayout: "",
    complaint: 0,
    reporting: 100,
    riskFlag: "None"
  });

  const availableFlags = [
    "side settlement",
    "personal payment",
    "client diversion",
    "territory capture",
    "fake commitment",
    "competitor link",
  ];

  const loadAssociates = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/associates");
      const data = await res.json();
      if (data.success) {
        setAssociates(data.data);
        if (!selectedAssociate && data.data.length > 0) {
          handleSelectAssociate(data.data[0]);
        }
      }
    } catch (err) {
      triggerToast("Failed to load associates");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAssociates();
  }, []);

  const handleSelectAssociate = (assoc: any) => {
    setSelectedAssociate(assoc);
    setFormState({
      territory: assoc.territory || "",
      leadsGenerated: assoc.leadsGenerated || 0,
      conversionRate: assoc.conversionRate || 0,
      payoutTerms: assoc.payoutTerms || "",
      reportingDiscipline: assoc.reportingDiscipline !== undefined ? assoc.reportingDiscipline : 100,
      complaintRatio: assoc.complaintRatio !== undefined ? assoc.complaintRatio : 0,
      clientFeedback: assoc.clientFeedback !== undefined ? assoc.clientFeedback : 100,
      riskScore: assoc.riskScore || 0,
      exitRisk: assoc.exitRisk || "Low",
      flags: assoc.flags || []
    });
  };

  const toggleFlag = (flag: string) => {
    setFormState(prev => ({
      ...prev,
      flags: prev.flags.includes(flag)
        ? prev.flags.filter(f => f !== flag)
        : [...prev.flags, flag]
    }));
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssociate) return;

    try {
      setSubmitting(true);
      const res = await fetch("/api/associates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selectedAssociate.user.id,
          ...formState
        })
      });
      const data = await res.json();
      if (data.success) {
        triggerToast("Associate profile updated successfully!");
        loadAssociates();
      } else {
        triggerToast("Error: " + data.error);
      }
    } catch (err) {
      triggerToast("Failed to update profile");
    } finally {
      setSubmitting(false);
    }
  };

  const handleForm9Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssociate) return;

    try {
      setSubmitting(true);
      const res = await fetch("/api/reports/form9", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          associateName: selectedAssociate.user?.name || "Unknown",
          associateId: selectedAssociate.user?.id,
          ...form9
        })
      });
      const data = await res.json();
      if (data.success) {
        triggerToast("FORM-9 Submitted Successfully!");
        setShowForm9(false);
        setForm9({ territory: "", leads: 0, conversion: 0, collectionPayout: "", complaint: 0, reporting: 100, riskFlag: "None" });
      } else {
        triggerToast("Failed to submit FORM-9: " + data.error);
      }
    } catch (err) {
      triggerToast("Error submitting FORM-9");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredAssociates = associates.filter(a =>
    a.user?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.territory?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-fadeIn text-slate-800">

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-black text-slate-800">Business Associates Dashboard</h1>
          <p className="text-xs text-slate-500 mt-1">Growth engines tracking — Monitor territory, conversions, & risk flags</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => toggleModal("assoc", true)}
            className="bg-[#714B67] hover:bg-[#5F3F56] px-4 py-2 rounded-lg text-xs font-bold text-white transition-all shadow-sm flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Add Associate
          </button>
          <button
            onClick={loadAssociates}
            disabled={loading}
            className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 transition duration-150 shrink-0"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

        {/* Left Side: Associates List */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-4 flex flex-col h-[750px] shadow-sm">
          <h3 className="text-xs font-black tracking-widest text-[#714B67] uppercase font-mono mb-3">Active Network</h3>

          <div className="relative mb-3">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by name or territory..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-4 py-2 text-xs font-semibold focus:outline-none focus:border-[#714B67] text-slate-800"
            />
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
            {loading ? (
              <div className="text-center py-10 font-bold text-slate-400 text-[10px] animate-pulse">Loading associates...</div>
            ) : filteredAssociates.length === 0 ? (
              <div className="text-center py-10 text-slate-400 font-bold text-[10px]">No associates found</div>
            ) : (
              filteredAssociates.map((assoc, i) => {
                const isSelected = selectedAssociate && selectedAssociate.id === assoc.id;
                const flagCount = assoc.flags?.length || 0;

                return (
                  <button
                    key={i}
                    onClick={() => handleSelectAssociate(assoc)}
                    className={`w-full text-left p-3 rounded-lg border transition-all flex flex-col gap-2 ${isSelected
                      ? "bg-[#714B67]/5 border-[#714B67] shadow-sm"
                      : "bg-white border-slate-100 hover:border-slate-350 hover:bg-slate-50/50"
                      }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-slate-800 text-xs truncate">{assoc.user?.name || "Unknown"}</div>
                      {flagCount > 0 && <AlertCircle className="w-4 h-4 text-rose-500" />}
                    </div>
                    <div className="flex items-center justify-between mt-1 text-[10px] text-slate-500 font-mono">
                      <span>{assoc.territory || "No Territory"}</span>
                      <span className={`${assoc.riskScore > 70 ? 'text-rose-500 font-bold' : ''}`}>Risk: {assoc.riskScore || 0}</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Side: Associate Workspace */}
        <div className="lg:col-span-8">
          {selectedAssociate ? (
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col h-[750px]">

              {/* Profile Header */}
              <div className="flex justify-between items-start gap-4 pb-4 border-b border-slate-150 shrink-0">
                <div>
                  <h2 className="text-lg font-black text-slate-850 flex items-center gap-2">
                    <UserPlus className="w-5 h-5 text-[#714B67]" />
                    {selectedAssociate.user?.name || "Unknown"}
                  </h2>
                  <div className="text-slate-500 text-[10px] mt-1.5 flex gap-4">
                    <span>Email: <strong className="text-slate-700">{selectedAssociate.user?.email || "N/A"}</strong></span>
                    <span>Mobile: <strong className="text-slate-700">{selectedAssociate.user?.mobile || "N/A"}</strong></span>
                    <span>Joined: <strong className="text-[#714B67]">{new Date(selectedAssociate.createdAt).toLocaleDateString()}</strong></span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      setForm9(prev => ({ ...prev, territory: formState.territory }));
                      setShowForm9(true);
                    }}
                    className="px-4 py-2 bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-2"
                  >
                    <FileText className="w-4 h-4" /> Log FORM-9
                  </button>
                  <div className={`px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-center min-w-28`}>
                    <span className="text-[9px] uppercase font-black tracking-widest text-slate-500 block mb-0.5">Exit Risk</span>
                    <span className={`text-xs font-bold ${formState.exitRisk === 'High' ? 'text-rose-600' : formState.exitRisk === 'Medium' ? 'text-amber-600' : 'text-emerald-600'}`}>
                      {formState.exitRisk}
                    </span>
                  </div>
                </div>
              </div>

              {/* Scrollable Form Content */}
              <div className="flex-1 overflow-y-auto py-5 pr-2 scrollbar-thin">
                <form id="assoc-form" onSubmit={handleSaveProfile} className="space-y-8">

                  {/* Core Metrics Grid */}
                  <div>
                    <h4 className="text-[10px] font-black tracking-widest text-[#714B67] uppercase font-mono mb-4 border-b border-slate-100 pb-2">Business Operations</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">

                      <div>
                        <label className="text-[10px] uppercase font-black text-slate-500 font-mono tracking-wider">Assigned Territory</label>
                        <input className="w-full bg-slate-50 border border-slate-200 rounded p-2.5 text-xs font-bold text-slate-900 mt-1.5 focus:outline-none focus:border-[#714B67]"
                          placeholder="e.g. Mumbai North" value={formState.territory} onChange={e => setFormState({ ...formState, territory: e.target.value })} />
                      </div>

                      <div>
                        <label className="text-[10px] uppercase font-black text-slate-500 font-mono tracking-wider">Payout Terms</label>
                        <input className="w-full bg-slate-50 border border-slate-200 rounded p-2.5 text-xs font-bold text-slate-900 mt-1.5 focus:outline-none focus:border-[#714B67]"
                          placeholder="e.g. 10% Flat Commission" required value={formState.payoutTerms} onChange={e => setFormState({ ...formState, payoutTerms: e.target.value })} />
                      </div>

                      <div>
                        <label className="text-[10px] uppercase font-black text-slate-500 font-mono tracking-wider">Leads Generated (Count)</label>
                        <input type="number" min="0" className="w-full bg-slate-50 border border-slate-200 rounded p-2.5 text-xs font-bold text-slate-900 mt-1.5 focus:outline-none focus:border-[#714B67] font-mono"
                          value={formState.leadsGenerated} onChange={e => setFormState({ ...formState, leadsGenerated: Number(e.target.value) })} />
                      </div>

                      <div>
                        <label className="text-[10px] uppercase font-black text-slate-500 font-mono tracking-wider">Exit Risk</label>
                        <select className="w-full bg-slate-50 border border-slate-200 rounded p-2.5 text-xs font-bold text-slate-900 mt-1.5 focus:outline-none focus:border-[#714B67]"
                          value={formState.exitRisk} onChange={e => setFormState({ ...formState, exitRisk: e.target.value })}>
                          <option value="Low">Low</option>
                          <option value="Medium">Medium</option>
                          <option value="High">High</option>
                        </select>
                      </div>

                    </div>
                  </div>

                  {/* Slider Metrics */}
                  <div>
                    <h4 className="text-[10px] font-black tracking-widest text-[#714B67] uppercase font-mono mb-4 border-b border-slate-100 pb-2">Performance & Quality (0-100)</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">

                      <div>
                        <div className="flex justify-between mb-1">
                          <label className="text-[10px] font-bold text-slate-700">Conversion Rate</label>
                          <span className="text-[10px] font-mono text-[#714B67] font-black">{formState.conversionRate}%</span>
                        </div>
                        <input type="range" min="0" max="100" className="w-full accent-[#714B67] h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                          value={formState.conversionRate} onChange={e => setFormState({ ...formState, conversionRate: Number(e.target.value) })} />
                      </div>

                      <div>
                        <div className="flex justify-between mb-1">
                          <label className="text-[10px] font-bold text-slate-700">Reporting Discipline</label>
                          <span className="text-[10px] font-mono text-[#714B67] font-black">{formState.reportingDiscipline}%</span>
                        </div>
                        <input type="range" min="0" max="100" className="w-full accent-[#714B67] h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                          value={formState.reportingDiscipline} onChange={e => setFormState({ ...formState, reportingDiscipline: Number(e.target.value) })} />
                      </div>

                      <div>
                        <div className="flex justify-between mb-1">
                          <label className="text-[10px] font-bold text-slate-700">Complaint Ratio (Lower is better)</label>
                          <span className="text-[10px] font-mono text-rose-500 font-black">{formState.complaintRatio}%</span>
                        </div>
                        <input type="range" min="0" max="100" className="w-full accent-rose-500 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                          value={formState.complaintRatio} onChange={e => setFormState({ ...formState, complaintRatio: Number(e.target.value) })} />
                      </div>

                      <div>
                        <div className="flex justify-between mb-1">
                          <label className="text-[10px] font-bold text-slate-700">Client Feedback Score</label>
                          <span className="text-[10px] font-mono text-[#714B67] font-black">{formState.clientFeedback}%</span>
                        </div>
                        <input type="range" min="0" max="100" className="w-full accent-[#714B67] h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                          value={formState.clientFeedback} onChange={e => setFormState({ ...formState, clientFeedback: Number(e.target.value) })} />
                      </div>

                    </div>
                  </div>

                  {/* Risk Assessment */}
                  <div className="bg-rose-50/50 border border-rose-200 rounded-xl p-5 shadow-sm">
                    <div className="flex justify-between items-center mb-4 pb-2 border-b border-rose-100">
                      <h4 className="text-[10px] font-black tracking-widest text-rose-700 uppercase font-mono flex items-center gap-1.5">
                        <AlertCircle className="w-4 h-4" /> Compliance Risk Flags
                      </h4>
                      <div className="flex items-center gap-3">
                        <label className="text-[10px] font-bold text-rose-700">Overall Risk Score:</label>
                        <input type="number" min="0" max="100" className="w-16 bg-white border border-rose-200 rounded p-1 text-xs font-black text-rose-700 text-center font-mono focus:outline-none"
                          value={formState.riskScore} onChange={e => setFormState({ ...formState, riskScore: Number(e.target.value) })} />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {availableFlags.map(flag => (
                        <label key={flag} className={`flex items-center gap-2 p-2.5 rounded border cursor-pointer transition-all ${formState.flags.includes(flag) ? "bg-rose-100 border-rose-300 text-rose-800" : "bg-white border-rose-100 text-slate-600 hover:bg-rose-50"
                          }`}>
                          <input
                            type="checkbox"
                            className="accent-rose-600 w-4 h-4"
                            checked={formState.flags.includes(flag)}
                            onChange={() => toggleFlag(flag)}
                          />
                          <span className="text-[10px] font-bold uppercase tracking-wider">{flag}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-[#714B67] hover:bg-[#5F3F56] text-white py-3.5 rounded-xl text-xs font-black tracking-widest uppercase transition-all shadow-md flex items-center justify-center gap-2 mt-4"
                  >
                    <CheckCircle className="w-4 h-4" /> Save Associate Profile
                  </button>

                </form>
              </div>
            </div>
          ) : (
            <div className="text-center py-32 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center items-center h-[750px]">
              <FileText className="w-12 h-12 text-slate-300 mb-4 animate-bounce" />
              <h4 className="text-sm font-black text-slate-800 uppercase tracking-wide">No Associate Selected</h4>
              <p className="text-xs text-slate-400 mt-2 max-w-xs leading-normal">
                Select an associate from the left network panel to view and modify their business metrics and risk flags.
              </p>
            </div>
          )}
        </div>

      </div>

      {/* FORM-9 Modal */}
      {showForm9 && selectedAssociate && (
        <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-indigo-50/50 rounded-t-2xl">
              <div>
                <h2 className="text-lg font-black text-indigo-900 tracking-tight">FORM-9 Associate Performance</h2>
                <p className="text-xs text-indigo-600 font-bold mt-1">Evaluating: {selectedAssociate.user?.name}</p>
              </div>
              <button onClick={() => setShowForm9(false)} className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-all text-slate-500 hover:text-rose-500">
                <AlertCircle className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6">
              <form onSubmit={handleForm9Submit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="text-[10px] uppercase font-black text-slate-500 tracking-widest">1. Associate Name</label>
                    <input disabled className="w-full bg-slate-100 border border-slate-200 rounded-lg p-2.5 text-xs font-bold text-slate-600 mt-1.5 cursor-not-allowed" value={selectedAssociate.user?.name || "Unknown"} />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-black text-slate-500 tracking-widest">2. Territory *</label>
                    <input required className="w-full bg-white border border-slate-300 focus:border-indigo-500 rounded-lg p-2.5 text-xs font-bold text-slate-800 mt-1.5 focus:outline-none" value={form9.territory} onChange={e => setForm9({ ...form9, territory: e.target.value })} placeholder="Assigned Area" />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-black text-slate-500 tracking-widest">3. Leads Generated *</label>
                    <input required type="number" min="0" className="w-full bg-white border border-slate-300 focus:border-indigo-500 rounded-lg p-2.5 text-xs font-bold text-slate-800 mt-1.5 focus:outline-none font-mono" value={form9.leads} onChange={e => setForm9({ ...form9, leads: Number(e.target.value) })} />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-black text-slate-500 tracking-widest">4. Conversion (%) *</label>
                    <input required type="number" min="0" max="100" className="w-full bg-white border border-slate-300 focus:border-indigo-500 rounded-lg p-2.5 text-xs font-bold text-slate-800 mt-1.5 focus:outline-none font-mono" value={form9.conversion} onChange={e => setForm9({ ...form9, conversion: Number(e.target.value) })} />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-black text-slate-500 tracking-widest">5. Collection / Payout *</label>
                    <input required className="w-full bg-white border border-slate-300 focus:border-indigo-500 rounded-lg p-2.5 text-xs font-bold text-slate-800 mt-1.5 focus:outline-none" value={form9.collectionPayout} onChange={e => setForm9({ ...form9, collectionPayout: e.target.value })} placeholder="e.g., ₹50,000 / 10%" />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-black text-slate-500 tracking-widest">6. Complaint Count *</label>
                    <input required type="number" min="0" className="w-full bg-white border border-slate-300 focus:border-indigo-500 rounded-lg p-2.5 text-xs font-bold text-slate-800 mt-1.5 focus:outline-none font-mono" value={form9.complaint} onChange={e => setForm9({ ...form9, complaint: Number(e.target.value) })} />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-black text-slate-500 tracking-widest">7. Reporting Discipline (%) *</label>
                    <input required type="number" min="0" max="100" className="w-full bg-white border border-slate-300 focus:border-indigo-500 rounded-lg p-2.5 text-xs font-bold text-slate-800 mt-1.5 focus:outline-none font-mono" value={form9.reporting} onChange={e => setForm9({ ...form9, reporting: Number(e.target.value) })} />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-black text-slate-500 tracking-widest">8. Risk Flag</label>
                    <select className="w-full bg-white border border-slate-300 focus:border-indigo-500 rounded-lg p-2.5 text-xs font-bold text-slate-800 mt-1.5 focus:outline-none" value={form9.riskFlag} onChange={e => setForm9({ ...form9, riskFlag: e.target.value })}>
                      <option value="None">None (Safe)</option>
                      <option value="Side Settlement">Side Settlement</option>
                      <option value="Client Diversion">Client Diversion</option>
                      <option value="Territory Capture">Territory Capture</option>
                      <option value="Fake Commitment">Fake Commitment</option>
                      <option value="Competitor Link">Competitor Link</option>
                    </select>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                  <button type="button" onClick={() => setShowForm9(false)} className="px-5 py-2.5 rounded-lg text-xs font-black uppercase text-slate-500 hover:bg-slate-100 transition-all">Cancel</button>
                  <button type="submit" disabled={submitting} className="px-6 py-2.5 rounded-lg text-xs font-black uppercase text-white bg-indigo-600 hover:bg-indigo-700 shadow-md transition-all flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" /> Submit FORM-9
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export function VendorOperations({ toggleModal, triggerToast }: PartnerProps) {
  const [vendors, setVendors] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");

  // Dynamic Categories Master State
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [addingNewCategory, setAddingNewCategory] = useState(false);
  const [newCategoryInput, setNewCategoryInput] = useState("");
  const [savingCategory, setSavingCategory] = useState(false);

  // Add Vendor Form Modal State
  const [showAddVendorModal, setShowAddVendorModal] = useState(false);
  const [addVendorForm, setAddVendorForm] = useState({
    vendorName: "",
    shopName: "",
    location: "",
    categorySelect: "IT & Software",
    mobile: "",
    email: "",
    serviceType: "",
    agreementUrl: ""
  });

  // Edit Vendor Modal State
  const [showEditVendorModal, setShowEditVendorModal] = useState(false);
  const [editingVendor, setEditingVendor] = useState<any>(null);
  const [editVendorForm, setEditVendorForm] = useState({
    id: "",
    vendorName: "",
    shopName: "",
    location: "",
    categorySelect: "",
    mobile: "",
    email: "",
    serviceType: "",
    agreementUrl: ""
  });

  const [uploadingDoc, setUploadingDoc] = useState(false);

  const loadCategories = async () => {
    try {
      const res = await fetch("/api/vendors/categories");
      const data = await res.json();
      if (data.success && data.data) {
        setCategories(data.data);
      }
    } catch (_) { }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const handleCreateCategory = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newCategoryInput.trim()) return;

    try {
      setSavingCategory(true);
      const res = await fetch("/api/vendors/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCategoryInput.trim() })
      });
      const data = await res.json();
      if (data.success && data.data) {
        triggerToast(`Category "${data.data.name}" added to Database Master!`);
        await loadCategories();
        setAddVendorForm(prev => ({ ...prev, categorySelect: data.data.name }));
        setEditVendorForm(prev => ({ ...prev, categorySelect: data.data.name }));
        setNewCategoryInput("");
        setAddingNewCategory(false);
      } else {
        triggerToast("Error: " + (data.error || "Failed to add category"));
      }
    } catch (err) {
      triggerToast("Failed to save new category");
    } finally {
      setSavingCategory(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, target: "add" | "edit") => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingDoc(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/documents/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Upload failed");

      if (target === "add") {
        setAddVendorForm(prev => ({ ...prev, agreementUrl: data.url }));
      } else {
        setEditVendorForm(prev => ({ ...prev, agreementUrl: data.url }));
      }
      triggerToast("Agreement uploaded successfully");
    } catch (err) {
      triggerToast("Failed to upload agreement");
    } finally {
      setUploadingDoc(false);
    }
  };

  const loadVendors = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/vendors");
      const data = await res.json();
      if (data.success) {
        setVendors(data.data);
      }
    } catch (err) {
      triggerToast("Failed to load vendors");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVendors();
  }, []);

  const handleAddVendorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addVendorForm.shopName || !addVendorForm.mobile) {
      triggerToast("Shop/Company Name and Phone Number are required");
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch("/api/vendors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vendorName: addVendorForm.vendorName,
          shopName: addVendorForm.shopName,
          location: addVendorForm.location,
          category: addVendorForm.categorySelect,
          mobile: addVendorForm.mobile,
          email: addVendorForm.email,
          contact: addVendorForm.mobile,
          serviceType: addVendorForm.serviceType,
          agreementUrl: addVendorForm.agreementUrl
        })
      });
      const data = await res.json();
      if (data.success) {
        triggerToast("Vendor registered successfully!");
        setShowAddVendorModal(false);
        setAddVendorForm({
          vendorName: "",
          shopName: "",
          location: "",
          categorySelect: categories[0]?.name || "IT & Software",
          mobile: "",
          email: "",
          serviceType: "",
          agreementUrl: ""
        });
        loadVendors();
      } else {
        triggerToast("Failed to add vendor: " + data.error);
      }
    } catch (err) {
      triggerToast("Error adding vendor");
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenEditModal = (vendor: any) => {
    setEditingVendor(vendor);
    setEditVendorForm({
      id: vendor.id,
      vendorName: vendor.vendorName || "",
      shopName: vendor.shopName || "",
      location: vendor.location && vendor.location !== "—" ? vendor.location : "",
      categorySelect: vendor.category || categories[0]?.name || "IT & Software",
      mobile: vendor.mobile || vendor.contact || "",
      email: vendor.email && vendor.email !== "—" ? vendor.email : "",
      serviceType: vendor.serviceType && vendor.serviceType !== "—" ? vendor.serviceType : "",
      agreementUrl: vendor.agreementUrl || ""
    });
    setShowEditVendorModal(true);
  };

  const handleEditVendorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editVendorForm.shopName || !editVendorForm.mobile) {
      triggerToast("Shop/Company Name and Phone Number are required");
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch("/api/vendors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editVendorForm.id,
          vendorName: editVendorForm.vendorName,
          shopName: editVendorForm.shopName,
          location: editVendorForm.location,
          category: editVendorForm.categorySelect,
          mobile: editVendorForm.mobile,
          email: editVendorForm.email,
          contact: editVendorForm.mobile,
          serviceType: editVendorForm.serviceType,
          agreementUrl: editVendorForm.agreementUrl
        })
      });
      const data = await res.json();
      if (data.success) {
        triggerToast("Vendor details updated successfully!");
        setShowEditVendorModal(false);
        setEditingVendor(null);
        loadVendors();
      } else {
        triggerToast("Failed to update vendor: " + data.error);
      }
    } catch (err) {
      triggerToast("Error updating vendor");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteVendor = async (vendorId: string, shopName: string) => {
    if (!confirm(`Are you sure you want to delete vendor "${shopName || vendorId}"?`)) return;
    try {
      setSubmitting(true);
      const res = await fetch(`/api/vendors?id=${vendorId}`, {
        method: "DELETE"
      });
      const data = await res.json();
      if (data.success) {
        triggerToast("Vendor deleted successfully!");
        loadVendors();
      } else {
        triggerToast("Failed to delete vendor: " + data.error);
      }
    } catch (err) {
      triggerToast("Error deleting vendor");
    } finally {
      setSubmitting(false);
    }
  };

  const [agreementFilter, setAgreementFilter] = useState<"All" | "WithAgreement">("All");
  const [showCategoryModal, setShowCategoryModal] = useState(false);

  // Dynamic active vendor categories calculation
  const categoryCounts = React.useMemo(() => {
    const map: { [key: string]: number } = {};
    vendors.forEach(v => {
      const cat = v.category || "General";
      map[cat] = (map[cat] || 0) + 1;
    });
    return map;
  }, [vendors]);

  const activeCategoriesCount = Object.keys(categoryCounts).length;

  const filteredVendors = vendors.filter(v => {
    if (agreementFilter === "WithAgreement" && !v.agreementUrl) {
      return false;
    }

    const q = searchQuery.toLowerCase().trim();
    const matchCategory = categoryFilter === "All" || v.category === categoryFilter;

    if (!q) return matchCategory;

    const name = (v.vendorName || "").toLowerCase();
    const shop = (v.shopName || v.displayName || "").toLowerCase();
    const location = (v.location || "").toLowerCase();
    const category = (v.category || "").toLowerCase();
    const service = (v.serviceType || "").toLowerCase();
    const mobile = (v.mobile || v.contact || "").toLowerCase();
    const email = (v.email || "").toLowerCase();

    return matchCategory && (name.includes(q) || shop.includes(q) || location.includes(q) || category.includes(q) || service.includes(q) || mobile.includes(q) || email.includes(q));
  });

  const handleExportCSV = () => {
    if (filteredVendors.length === 0) {
      triggerToast("No vendor data available to export");
      return;
    }

    const headers = [
      "Vendor ID",
      "Vendor Shop / Company Name",
      "Vendor Person Name",
      "Category",
      "Location",
      "Phone Number",
      "Email Address",
      "Services Provided",
      "Agreement Document URL"
    ];

    const rows = filteredVendors.map(v => {
      const rawPhone = (v.mobile || v.contact || "").toString().trim();
      const formattedPhone = rawPhone ? `="${rawPhone.replace(/"/g, '""')}"` : '""';
      const vendorId = v.vendorCode || v.id || "VEN-001";

      return [
        vendorId,
        `"${(v.shopName || "").replace(/"/g, '""')}"`,
        `"${(v.vendorName || "").replace(/"/g, '""')}"`,
        `"${(v.category || "").replace(/"/g, '""')}"`,
        `"${(v.location || "").replace(/"/g, '""')}"`,
        formattedPhone,
        `"${(v.email || "").replace(/"/g, '""')}"`,
        `"${(v.serviceType || "").replace(/"/g, '""')}"`,
        `"${(v.agreementUrl || "").replace(/"/g, '""')}"`
      ];
    });

    const csvString = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Vendor_Master_Export_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    triggerToast("Vendor master data exported successfully as CSV!");
  };

  return (
    <div className="space-y-6 animate-fadeIn text-slate-800">

      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-black text-slate-850">Vendor Management</h1>
            <span className="bg-[#714B67]/10 text-[#714B67] px-2.5 py-0.5 rounded-full text-xs font-black font-mono">
              {filteredVendors.length} {filteredVendors.length === 1 ? "Vendor" : "Vendors"}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2.5 items-center">
          <button
            onClick={handleExportCSV}
            className="bg-emerald-600 hover:bg-emerald-700 px-3.5 py-2.5 rounded-xl text-xs font-black text-white transition-all shadow-sm flex items-center gap-2 cursor-pointer"
            title="Export Vendors Master List to CSV File"
          >
            <Download className="w-4 h-4" /> Export CSV
          </button>
          <button
            onClick={() => setShowAddVendorModal(true)}
            className="bg-[#714B67] hover:bg-[#5F3F56] px-4 py-2.5 rounded-xl text-xs font-black text-white transition-all shadow-sm flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Add Vendor
          </button>
          <button
            onClick={loadVendors}
            disabled={loading}
            className="p-2.5 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 transition duration-150 shrink-0 cursor-pointer"
            title="Refresh Vendors List"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Stat Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Vendors Card */}
        <div
          onClick={() => {
            setCategoryFilter("All");
            setAgreementFilter("All");
            setSearchQuery("");
          }}
          className={`bg-white p-4 rounded-xl border transition-all cursor-pointer hover:border-indigo-300 hover:shadow-md flex items-center justify-between ${
            categoryFilter === "All" && agreementFilter === "All" && !searchQuery ? "border-indigo-400 ring-2 ring-indigo-400/20 bg-indigo-50/20" : "border-slate-200 shadow-2xs"
          }`}
          title="Click to show all vendors"
        >
          <div>
            <div className="text-[10px] font-extrabold uppercase font-mono text-slate-400">Total Vendors</div>
            <div className="text-xl font-black text-slate-850 mt-1">{vendors.length}</div>
            <span className="text-[9px] font-bold text-indigo-600 block mt-0.5">Click to view all</span>
          </div>
          <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Building2 className="w-5 h-5" />
          </div>
        </div>

        {/* With Agreement Card */}
        <div
          onClick={() => setAgreementFilter(agreementFilter === "WithAgreement" ? "All" : "WithAgreement")}
          className={`bg-white p-4 rounded-xl border transition-all cursor-pointer hover:border-emerald-300 hover:shadow-md flex items-center justify-between ${
            agreementFilter === "WithAgreement" ? "border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/40" : "border-slate-200 shadow-2xs"
          }`}
          title="Click to filter vendors with signed agreement"
        >
          <div>
            <div className="text-[10px] font-extrabold uppercase font-mono text-slate-400">With Agreement</div>
            <div className="text-xl font-black text-emerald-600 mt-1">{vendors.filter(v => v.agreementUrl).length}</div>
            <span className={`text-[9px] font-bold block mt-0.5 ${agreementFilter === "WithAgreement" ? "text-emerald-700 underline font-black" : "text-emerald-600"}`}>
              {agreementFilter === "WithAgreement" ? "Filter Active ✓" : "Click to filter"}
            </span>
          </div>
          <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Paperclip className="w-5 h-5" />
          </div>
        </div>

        {/* Categories Card */}
        <div
          onClick={() => setShowCategoryModal(true)}
          className={`bg-white p-4 rounded-xl border transition-all cursor-pointer hover:border-purple-300 hover:shadow-md flex items-center justify-between ${
            categoryFilter !== "All" ? "border-purple-500 ring-2 ring-purple-500/20 bg-purple-50/40" : "border-slate-200 shadow-2xs"
          }`}
          title="Click to view all categories & vendor counts"
        >
          <div>
            <div className="text-[10px] font-extrabold uppercase font-mono text-slate-400">Categories</div>
            <div className="text-xl font-black text-purple-600 mt-1">{activeCategoriesCount || categories.length}</div>
            <span className={`text-[9px] font-bold block mt-0.5 ${categoryFilter !== "All" ? "text-purple-700 font-black" : "text-purple-600"}`}>
              {categoryFilter !== "All" ? `Active: ${categoryFilter}` : "Click to view categories"}
            </span>
          </div>
          <div className="w-9 h-9 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
            <FileText className="w-5 h-5" />
          </div>
        </div>

        {/* Filtered Vendors Card */}
        <div
          onClick={() => {
            setCategoryFilter("All");
            setAgreementFilter("All");
            setSearchQuery("");
          }}
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs hover:border-amber-300 hover:shadow-md transition-all cursor-pointer flex items-center justify-between"
          title="Matching current search & filters. Click to reset all filters."
        >
          <div>
            <div className="text-[10px] font-extrabold uppercase font-mono text-slate-400">Filtered Vendors</div>
            <div className="text-xl font-black text-amber-600 mt-1">{filteredVendors.length}</div>
            <span className="text-[9px] font-bold text-amber-600 block mt-0.5">Click to reset filters</span>
          </div>
          <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
            <Search className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter and Search Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search vendor name, shop, location, contact..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-4 py-2 text-xs font-semibold focus:outline-none focus:border-[#714B67] text-slate-800"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-end">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 shrink-0">Category Filter:</span>
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:border-[#714B67] w-full sm:w-52"
            >
              <option value="All">All Categories ({vendors.length})</option>
              {Object.keys(categoryCounts).map((catName, idx) => (
                <option key={idx} value={catName}>
                  {catName} ({categoryCounts[catName]})
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => {
              setSearchQuery("");
              setCategoryFilter("All");
              setAgreementFilter("All");
              triggerToast("All filters cleared successfully!");
            }}
            disabled={!searchQuery && categoryFilter === "All" && agreementFilter === "All"}
            className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 disabled:opacity-40 disabled:hover:bg-rose-50 rounded-lg text-xs font-bold transition-all border border-rose-200 flex items-center gap-1.5 cursor-pointer shrink-0"
            title="Clear all active search and category filters"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Clear Filters
          </button>
        </div>
      </div>

      {/* Structured Vendors Data Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[10px] uppercase font-black tracking-wider text-slate-500 font-mono">
                  <th className="py-3.5 px-4 text-center w-14">ID</th>
                  <th className="py-3.5 px-4">Vendor Shop / Company Name</th>
                  <th className="py-3.5 px-4">Vendor Person</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Location</th>
                  <th className="py-3.5 px-4">Contact Details</th>
                  <th className="py-3.5 px-4">Services Provided</th>
                  <th className="py-3.5 px-4 text-center">Document</th>
                  <th className="py-3.5 px-4 text-center w-28">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 text-xs">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400 font-bold animate-pulse">
                      Loading vendors master data...
                    </td>
                  </tr>
                ) : filteredVendors.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center">
                      <div className="max-w-xs mx-auto space-y-2">
                        <p className="text-sm font-black text-slate-700">No Vendors Found</p>
                        <p className="text-xs text-slate-400">Click "+ Add Vendor" to register your first vendor in the master database.</p>
                        <button
                          onClick={() => setShowAddVendorModal(true)}
                          className="mt-2 px-4 py-2 bg-[#714B67] text-white text-xs font-bold rounded-lg hover:bg-[#5F3F56] transition-all inline-flex items-center gap-1.5"
                        >
                          <Plus className="w-3.5 h-3.5" /> + Add Vendor
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredVendors.map((vendor, idx) => {
                    const vCode = vendor.vendorCode || vendor.id || "VEN-001";
                    const shopName = vendor.shopName || vendor.displayName || "Vendor Master";
                    const personName = vendor.vendorName || "—";
                    const location = vendor.location && vendor.location !== "—" ? vendor.location : "—";
                    const mobile = vendor.displayMobile || vendor.mobile || vendor.contact || "—";
                    const email = vendor.displayEmail && vendor.displayEmail !== "—" ? vendor.displayEmail : "";
                    const category = vendor.category || "General";
                    const serviceType = vendor.serviceType && vendor.serviceType !== "—" ? vendor.serviceType : "—";

                    return (
                      <tr key={vendor.id || idx} className="hover:bg-slate-50/70 transition-all group">

                        {/* 1. ID Numbering */}
                        <td className="py-3.5 px-4 text-center">
                          <span className="inline-block bg-[#714B67]/10 text-[#714B67] px-2 py-0.5 rounded font-mono font-black text-[11px]">
                            {vCode}
                          </span>
                        </td>

                        {/* 2. Shop / Company Name */}
                        <td className="py-3.5 px-4 font-black text-slate-800 group-hover:text-[#714B67] transition-colors">
                          {shopName}
                        </td>

                        {/* 3. Vendor Person */}
                        <td className="py-3.5 px-4 font-bold text-slate-700">
                          {personName}
                        </td>

                        {/* 4. Category */}
                        <td className="py-3.5 px-4">
                          <span className="bg-slate-100 border border-slate-200 text-slate-700 font-bold px-2 py-0.5 rounded-md text-[11px] inline-block">
                            {category}
                          </span>
                        </td>

                        {/* 5. Location */}
                        <td className="py-3.5 px-4 text-slate-600 font-semibold">
                          {location}
                        </td>

                        {/* 6. Contact Details */}
                        <td className="py-3.5 px-4 font-mono space-y-0.5">
                          <div className="text-slate-800 font-bold text-[11px]">📞 {mobile}</div>
                          {email && <div className="text-slate-500 text-[10px] truncate max-w-[180px]">✉️ {email}</div>}
                        </td>

                        {/* 7. Services Provided */}
                        <td className="py-3.5 px-4 text-slate-700 font-medium max-w-[200px] truncate">
                          {serviceType}
                        </td>

                        {/* 8. Agreement Document */}
                        <td className="py-3.5 px-4 text-center">
                          {vendor.agreementUrl ? (
                            <a
                              href={vendor.agreementUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-md border border-indigo-200 transition-all"
                            >
                              📄 View File
                            </a>
                          ) : (
                            <span className="text-[10px] text-slate-400 font-medium">No File</span>
                          )}
                        </td>

                        {/* 9. Actions (Edit & Delete Buttons) */}
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(vendor)}
                              className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg border border-slate-200 transition-all"
                              title="Edit Vendor"
                            >
                              ✏️
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteVendor(vendor.id, shopName)}
                              className="p-1.5 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg border border-slate-200 transition-all"
                              title="Delete Vendor"
                            >
                              🗑️
                            </button>
                          </div>
                        </td>

                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

      {/* Category Overview Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 animate-fadeIn">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-purple-50/60">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-purple-600 text-white">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-850">Vendor Categories</h3>
                  <p className="text-xs text-slate-500 font-medium">Click any category to filter vendors</p>
                </div>
              </div>
              <button
                onClick={() => setShowCategoryModal(false)}
                className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center hover:bg-rose-50 text-slate-500 hover:text-rose-600 font-bold transition-all cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-3 max-h-[60vh] overflow-y-auto">
              <button
                onClick={() => {
                  setCategoryFilter("All");
                  setShowCategoryModal(false);
                }}
                className={`w-full p-3 rounded-xl border text-left font-bold text-xs flex items-center justify-between transition-all cursor-pointer ${
                  categoryFilter === "All"
                    ? "bg-purple-600 text-white border-purple-600 shadow-sm"
                    : "bg-slate-50 hover:bg-purple-50/50 text-slate-700 border-slate-200"
                }`}
              >
                <span>All Categories</span>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${categoryFilter === "All" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"}`}>
                  {vendors.length} Vendors
                </span>
              </button>

              {Object.keys(categoryCounts).length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-xs font-bold">No active vendor categories found</div>
              ) : (
                Object.keys(categoryCounts).map((catName, idx) => {
                  const count = categoryCounts[catName];
                  const isSelected = categoryFilter === catName;

                  return (
                    <button
                      key={idx}
                      onClick={() => {
                        setCategoryFilter(catName);
                        setShowCategoryModal(false);
                      }}
                      className={`w-full p-3 rounded-xl border text-left font-bold text-xs flex items-center justify-between transition-all cursor-pointer ${
                        isSelected
                          ? "bg-purple-600 text-white border-purple-600 shadow-sm"
                          : "bg-white hover:bg-purple-50/50 text-slate-800 border-slate-200 hover:border-purple-300"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${isSelected ? "bg-white" : "bg-purple-500"}`}></span>
                        {catName}
                      </span>
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-black font-mono ${isSelected ? "bg-white/20 text-white" : "bg-purple-50 text-purple-700"}`}>
                        {count} {count === 1 ? "Vendor" : "Vendors"}
                      </span>
                    </button>
                  );
                })
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 text-right">
              <button
                onClick={() => setShowCategoryModal(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-bold transition-all cursor-pointer"
              >
                Close Overview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Direct Add Vendor Modal */}
      {showAddVendorModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-slate-100">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-[#714B67]/5 rounded-t-2xl">
              <div>
                <h2 className="text-lg font-black text-[#714B67] tracking-tight">+ Register New Vendor</h2>
                <p className="text-xs text-slate-500 font-bold mt-0.5">Add a new vendor into the master database</p>
              </div>
              <button onClick={() => setShowAddVendorModal(false)} className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center hover:bg-rose-50 transition-all text-slate-500 hover:text-rose-600 font-bold">
                ✕
              </button>
            </div>

            <div className="p-6">
              <form onSubmit={handleAddVendorSubmit} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                  {/* 1. Vendor Name */}
                  <div>
                    <label className="text-[10px] uppercase font-black text-slate-500 tracking-wider block mb-1">Vendor Name</label>
                    <input
                      className="w-full bg-slate-50 border border-slate-200 focus:border-[#714B67] rounded-lg p-2.5 text-xs font-bold text-slate-900 focus:outline-none"
                      value={addVendorForm.vendorName}
                      onChange={e => setAddVendorForm({ ...addVendorForm, vendorName: e.target.value })}
                      placeholder="e.g. Rahul Sharma"
                    />
                  </div>

                  {/* 2. Vendor Shop Name / Company Name */}
                  <div>
                    <label className="text-[10px] uppercase font-black text-slate-500 tracking-wider block mb-1">Vendor Shop Name / Company Name *</label>
                    <input
                      required
                      className="w-full bg-slate-50 border border-slate-200 focus:border-[#714B67] rounded-lg p-2.5 text-xs font-bold text-slate-900 focus:outline-none"
                      value={addVendorForm.shopName}
                      onChange={e => setAddVendorForm({ ...addVendorForm, shopName: e.target.value })}
                      placeholder="e.g. Sharma Electronics & Hardware"
                    />
                  </div>

                  {/* 3. Location */}
                  <div>
                    <label className="text-[10px] uppercase font-black text-slate-500 tracking-wider block mb-1">Shop / Office Location (City / Address)</label>
                    <input
                      className="w-full bg-slate-50 border border-slate-200 focus:border-[#714B67] rounded-lg p-2.5 text-xs font-bold text-slate-900 focus:outline-none"
                      value={addVendorForm.location}
                      onChange={e => setAddVendorForm({ ...addVendorForm, location: e.target.value })}
                      placeholder="e.g. Connaught Place, New Delhi / Indore"
                    />
                  </div>

                  {/* 4. Category Master Dropdown + Inline Add Option */}
                  <div className="md:col-span-2 bg-slate-50 border border-slate-200 p-3 rounded-xl space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] uppercase font-black text-slate-700 tracking-wider">Category *</label>
                      <button
                        type="button"
                        onClick={() => setAddingNewCategory(!addingNewCategory)}
                        className="text-[10px] font-bold text-[#714B67] hover:underline flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" /> {addingNewCategory ? "Cancel Add Category" : "+ Add New Category"}
                      </button>
                    </div>

                    {!addingNewCategory ? (
                      <select
                        className="w-full bg-white border border-slate-300 focus:border-[#714B67] rounded-lg p-2.5 text-xs font-bold text-slate-900 focus:outline-none"
                        value={addVendorForm.categorySelect}
                        onChange={e => setAddVendorForm({ ...addVendorForm, categorySelect: e.target.value })}
                      >
                        {categories.map((cat, idx) => (
                          <option key={cat.id || idx} value={cat.name}>{cat.name}</option>
                        ))}
                      </select>
                    ) : (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          required
                          className="flex-1 bg-white border border-[#714B67] rounded-lg p-2 text-xs font-bold text-slate-900 focus:outline-none"
                          placeholder="Type New Category Name (Saves directly to DB Master)..."
                          value={newCategoryInput}
                          onChange={e => setNewCategoryInput(e.target.value)}
                        />
                        <button
                          type="button"
                          disabled={savingCategory || !newCategoryInput.trim()}
                          onClick={handleCreateCategory}
                          className="px-4 py-2 bg-[#714B67] hover:bg-[#5F3F56] text-white text-xs font-bold rounded-lg shadow-sm disabled:opacity-50"
                        >
                          {savingCategory ? "Saving..." : "Save Category"}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* 5. Phone Number */}
                  <div>
                    <label className="text-[10px] uppercase font-black text-slate-500 tracking-wider block mb-1">Phone Number *</label>
                    <input
                      required
                      className="w-full bg-slate-50 border border-slate-200 focus:border-[#714B67] rounded-lg p-2.5 text-xs font-bold text-slate-900 focus:outline-none font-mono"
                      value={addVendorForm.mobile}
                      onChange={e => setAddVendorForm({ ...addVendorForm, mobile: e.target.value })}
                      placeholder="+91 9876543210"
                    />
                  </div>

                  {/* 6. Email Address */}
                  <div>
                    <label className="text-[10px] uppercase font-black text-slate-500 tracking-wider block mb-1">Email Address (Optional)</label>
                    <input
                      type="email"
                      className="w-full bg-slate-50 border border-slate-200 focus:border-[#714B67] rounded-lg p-2.5 text-xs font-bold text-slate-900 focus:outline-none font-mono"
                      value={addVendorForm.email}
                      onChange={e => setAddVendorForm({ ...addVendorForm, email: e.target.value })}
                      placeholder="vendor@company.com"
                    />
                  </div>

                  {/* 7. Service Details / Vendor Work */}
                  <div className="md:col-span-2">
                    <label className="text-[10px] uppercase font-black text-slate-500 tracking-wider block mb-1">Vendor Work (Services Provided)</label>
                    <input
                      className="w-full bg-slate-50 border border-slate-200 focus:border-[#714B67] rounded-lg p-2.5 text-xs font-bold text-slate-900 focus:outline-none"
                      value={addVendorForm.serviceType}
                      onChange={e => setAddVendorForm({ ...addVendorForm, serviceType: e.target.value })}
                      placeholder="e.g. Broadband Connection, Computer Repair, AC AMC"
                    />
                  </div>

                  {/* 8. Agreement Upload */}
                  <div className="md:col-span-2">
                    <label className="text-[10px] uppercase font-black text-slate-500 tracking-wider block mb-1">Agreement Document Upload (PDF / Image)</label>
                    {addVendorForm.agreementUrl ? (
                      <div className="flex items-center gap-3 bg-indigo-50 border border-indigo-200 p-2.5 rounded-lg">
                        <a href={addVendorForm.agreementUrl} target="_blank" rel="noreferrer" className="text-indigo-700 text-xs font-bold underline truncate flex-1">View Uploaded Document</a>
                        <button type="button" onClick={() => setAddVendorForm({ ...addVendorForm, agreementUrl: "" })} className="text-rose-600 text-xs font-black uppercase">Remove</button>
                      </div>
                    ) : (
                      <div className="relative">
                        <input type="file" accept="image/*,.pdf" onChange={e => handleFileUpload(e, "add")} disabled={uploadingDoc} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                        <div className={`w-full bg-slate-50 border border-slate-300 border-dashed rounded-lg p-3 text-xs font-bold text-center transition-all ${uploadingDoc ? 'text-indigo-500 border-indigo-400 bg-indigo-50' : 'text-slate-500 hover:bg-slate-100'}`}>
                          {uploadingDoc ? "Uploading Document..." : "Click to Upload Contract PDF / SLA Image"}
                        </div>
                      </div>
                    )}
                  </div>

                </div>

                <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                  <button type="button" onClick={() => setShowAddVendorModal(false)} className="px-5 py-2.5 rounded-lg text-xs font-black uppercase text-slate-500 hover:bg-slate-100 transition-all">Cancel</button>
                  <button type="submit" disabled={submitting || uploadingDoc} className="px-6 py-2.5 rounded-lg text-xs font-black uppercase text-white bg-[#714B67] hover:bg-[#5F3F56] shadow-md transition-all flex items-center gap-2 disabled:opacity-50">
                    <CheckCircle className="w-4 h-4" /> Save Vendor
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Vendor Modal */}
      {showEditVendorModal && editingVendor && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-slate-100">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-[#714B67]/5 rounded-t-2xl">
              <div>
                <h2 className="text-lg font-black text-[#714B67] tracking-tight">✏️ Edit Vendor Details</h2>
                <p className="text-xs text-slate-500 font-bold mt-0.5">Updating master record for: {editingVendor.shopName || editingVendor.vendorName}</p>
              </div>
              <button onClick={() => setShowEditVendorModal(false)} className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center hover:bg-rose-50 transition-all text-slate-500 hover:text-rose-600 font-bold">
                ✕
              </button>
            </div>

            <div className="p-6">
              <form onSubmit={handleEditVendorSubmit} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                  {/* 1. Vendor Name */}
                  <div>
                    <label className="text-[10px] uppercase font-black text-slate-500 tracking-wider block mb-1">Vendor Name</label>
                    <input
                      className="w-full bg-slate-50 border border-slate-200 focus:border-[#714B67] rounded-lg p-2.5 text-xs font-bold text-slate-900 focus:outline-none"
                      value={editVendorForm.vendorName}
                      onChange={e => setEditVendorForm({ ...editVendorForm, vendorName: e.target.value })}
                      placeholder="e.g. Rahul Sharma"
                    />
                  </div>

                  {/* 2. Vendor Shop Name / Company Name */}
                  <div>
                    <label className="text-[10px] uppercase font-black text-slate-500 tracking-wider block mb-1">Vendor Shop Name / Company Name *</label>
                    <input
                      required
                      className="w-full bg-slate-50 border border-slate-200 focus:border-[#714B67] rounded-lg p-2.5 text-xs font-bold text-slate-900 focus:outline-none"
                      value={editVendorForm.shopName}
                      onChange={e => setEditVendorForm({ ...editVendorForm, shopName: e.target.value })}
                      placeholder="e.g. Sharma Electronics & Hardware"
                    />
                  </div>

                  {/* 3. Location */}
                  <div>
                    <label className="text-[10px] uppercase font-black text-slate-500 tracking-wider block mb-1">Shop / Office Location (City / Address)</label>
                    <input
                      className="w-full bg-slate-50 border border-slate-200 focus:border-[#714B67] rounded-lg p-2.5 text-xs font-bold text-slate-900 focus:outline-none"
                      value={editVendorForm.location}
                      onChange={e => setEditVendorForm({ ...editVendorForm, location: e.target.value })}
                      placeholder="e.g. Connaught Place, New Delhi / Indore"
                    />
                  </div>

                  {/* 4. Category Master Dropdown + Inline Add Option */}
                  <div className="md:col-span-2 bg-slate-50 border border-slate-200 p-3 rounded-xl space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] uppercase font-black text-slate-700 tracking-wider">Category *</label>
                      <button
                        type="button"
                        onClick={() => setAddingNewCategory(!addingNewCategory)}
                        className="text-[10px] font-bold text-[#714B67] hover:underline flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" /> {addingNewCategory ? "Cancel Add Category" : "+ Add New Category"}
                      </button>
                    </div>

                    {!addingNewCategory ? (
                      <select
                        className="w-full bg-white border border-slate-300 focus:border-[#714B67] rounded-lg p-2.5 text-xs font-bold text-slate-900 focus:outline-none"
                        value={editVendorForm.categorySelect}
                        onChange={e => setEditVendorForm({ ...editVendorForm, categorySelect: e.target.value })}
                      >
                        {categories.map((cat, idx) => (
                          <option key={cat.id || idx} value={cat.name}>{cat.name}</option>
                        ))}
                      </select>
                    ) : (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          required
                          className="flex-1 bg-white border border-[#714B67] rounded-lg p-2 text-xs font-bold text-slate-900 focus:outline-none"
                          placeholder="Type New Category Name (Saves directly to DB Master)..."
                          value={newCategoryInput}
                          onChange={e => setNewCategoryInput(e.target.value)}
                        />
                        <button
                          type="button"
                          disabled={savingCategory || !newCategoryInput.trim()}
                          onClick={handleCreateCategory}
                          className="px-4 py-2 bg-[#714B67] hover:bg-[#5F3F56] text-white text-xs font-bold rounded-lg shadow-sm disabled:opacity-50"
                        >
                          {savingCategory ? "Saving..." : "Save Category"}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* 5. Phone Number */}
                  <div>
                    <label className="text-[10px] uppercase font-black text-slate-500 tracking-wider block mb-1">Phone Number *</label>
                    <input
                      required
                      className="w-full bg-slate-50 border border-slate-200 focus:border-[#714B67] rounded-lg p-2.5 text-xs font-bold text-slate-900 focus:outline-none font-mono"
                      value={editVendorForm.mobile}
                      onChange={e => setEditVendorForm({ ...editVendorForm, mobile: e.target.value })}
                      placeholder="+91 9876543210"
                    />
                  </div>

                  {/* 6. Email Address */}
                  <div>
                    <label className="text-[10px] uppercase font-black text-slate-500 tracking-wider block mb-1">Email Address (Optional)</label>
                    <input
                      type="email"
                      className="w-full bg-slate-50 border border-slate-200 focus:border-[#714B67] rounded-lg p-2.5 text-xs font-bold text-slate-900 focus:outline-none font-mono"
                      value={editVendorForm.email}
                      onChange={e => setEditVendorForm({ ...editVendorForm, email: e.target.value })}
                      placeholder="vendor@company.com"
                    />
                  </div>

                  {/* 7. Service Details / Vendor Work */}
                  <div className="md:col-span-2">
                    <label className="text-[10px] uppercase font-black text-slate-500 tracking-wider block mb-1">Vendor Work (Services Provided)</label>
                    <input
                      className="w-full bg-slate-50 border border-slate-200 focus:border-[#714B67] rounded-lg p-2.5 text-xs font-bold text-slate-900 focus:outline-none"
                      value={editVendorForm.serviceType}
                      onChange={e => setEditVendorForm({ ...editVendorForm, serviceType: e.target.value })}
                      placeholder="e.g. Broadband Connection, Computer Repair, AC AMC"
                    />
                  </div>

                  {/* 8. Agreement Upload */}
                  <div className="md:col-span-2">
                    <label className="text-[10px] uppercase font-black text-slate-500 tracking-wider block mb-1">Agreement Document Upload (PDF / Image)</label>
                    {editVendorForm.agreementUrl ? (
                      <div className="flex items-center gap-3 bg-indigo-50 border border-indigo-200 p-2.5 rounded-lg">
                        <a href={editVendorForm.agreementUrl} target="_blank" rel="noreferrer" className="text-indigo-700 text-xs font-bold underline truncate flex-1">View Uploaded Document</a>
                        <button type="button" onClick={() => setEditVendorForm({ ...editVendorForm, agreementUrl: "" })} className="text-rose-600 text-xs font-black uppercase">Remove</button>
                      </div>
                    ) : (
                      <div className="relative">
                        <input type="file" accept="image/*,.pdf" onChange={e => handleFileUpload(e, "edit")} disabled={uploadingDoc} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                        <div className={`w-full bg-slate-50 border border-slate-300 border-dashed rounded-lg p-3 text-xs font-bold text-center transition-all ${uploadingDoc ? 'text-indigo-500 border-indigo-400 bg-indigo-50' : 'text-slate-500 hover:bg-slate-100'}`}>
                          {uploadingDoc ? "Uploading Document..." : "Click to Upload Contract PDF / SLA Image"}
                        </div>
                      </div>
                    )}
                  </div>

                </div>

                <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                  <button type="button" onClick={() => setShowEditVendorModal(false)} className="px-5 py-2.5 rounded-lg text-xs font-black uppercase text-slate-500 hover:bg-slate-100 transition-all">Cancel</button>
                  <button type="submit" disabled={submitting || uploadingDoc} className="px-6 py-2.5 rounded-lg text-xs font-black uppercase text-white bg-[#714B67] hover:bg-[#5F3F56] shadow-md transition-all flex items-center gap-2 disabled:opacity-50">
                    <CheckCircle className="w-4 h-4" /> Update Vendor
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// Franchise & Territory Partners Component (Updated)
export function FranchiseTerritories({ toggleModal, triggerToast }: PartnerProps) {
  const [franchises, setFranchises] = useState<any[]>([]);
  const [selectedFranchise, setSelectedFranchise] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [formState, setFormState] = useState({
    agreementUrl: "",
    revenueSharing: "",
    leadsGenerated: 0,
    reportsSubmitted: 0,
    complaintsCount: 0,
    escalationsCount: 0,
    brandingCompliance: "Compliant",
    territoryRisk: "Low"
  });

  // Single Unified Register Franchise Partner Form State
  const [showForm11, setShowForm11] = useState(false);
  const [editingPartnerId, setEditingPartnerId] = useState<string | null>(null);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [uploadingKyc, setUploadingKyc] = useState(false);

  const [form11, setForm11] = useState({
    partnerName: "",
    contactPerson: "",
    email: "",
    mobile: "",
    alternateMobile: "",
    address: "",
    pincode: "",
    territory: "",
    state: "",
    brandProject: "",
    revenueShare: "",
    franchiseFee: "",
    agreementStartDate: "",
    agreementEndDate: "",
    gstin: "",
    pan: "",
    agreementUrl: "",
    kycDocUrl: "",
    reportingPerson: "",
    riskLevel: "Low",
    status: "Pending"
  });

  const resetForm11 = () => {
    setEditingPartnerId(null);
    setForm11({
      partnerName: "", contactPerson: "", email: "", mobile: "", alternateMobile: "",
      address: "", pincode: "", territory: "", state: "", brandProject: "",
      revenueShare: "", franchiseFee: "", agreementStartDate: "", agreementEndDate: "",
      gstin: "", pan: "", agreementUrl: "", kycDocUrl: "", reportingPerson: "",
      riskLevel: "Low", status: "Pending"
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingDoc(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/documents/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Upload failed");
      setForm11(prev => ({ ...prev, agreementUrl: data.url }));
      triggerToast("Franchise Agreement uploaded successfully!");
    } catch (err) {
      triggerToast("Failed to upload agreement");
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleKycUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingKyc(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/documents/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Upload failed");
      setForm11(prev => ({ ...prev, kycDocUrl: data.url }));
      triggerToast("KYC Document uploaded successfully!");
    } catch (err) {
      triggerToast("Failed to upload KYC document");
    } finally {
      setUploadingKyc(false);
    }
  };

  const handleForm11Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const isEdit = !!editingPartnerId;
      const url = "/api/reports/form11";
      const method = isEdit ? "PUT" : "POST";
      const bodyPayload = isEdit ? { id: editingPartnerId, ...form11 } : form11;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyPayload)
      });
      const data = await res.json();
      if (data.success) {
        triggerToast(isEdit ? "Franchise Partner Updated Successfully!" : "Franchise Partner Registered Successfully!");
        setShowForm11(false);
        resetForm11();
        loadFranchises();
      } else {
        triggerToast("Failed to save partner: " + data.error);
      }
    } catch (err) {
      triggerToast("Error saving franchise partner");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditPartner = (franchise: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingPartnerId(franchise.id);
    setForm11({
      partnerName: franchise.partnerName || "",
      contactPerson: franchise.contactPerson || "",
      email: franchise.email || "",
      mobile: franchise.mobile || "",
      alternateMobile: franchise.alternateMobile || "",
      address: franchise.address || "",
      pincode: franchise.pincode || "",
      territory: franchise.territory || "",
      state: franchise.state || "",
      brandProject: franchise.brandProject || "",
      revenueShare: franchise.revenueShare || "",
      franchiseFee: franchise.franchiseFee || "",
      agreementStartDate: franchise.agreementStartDate || "",
      agreementEndDate: franchise.agreementEndDate || "",
      gstin: franchise.gstin || "",
      pan: franchise.pan || "",
      agreementUrl: franchise.agreementUrl || "",
      kycDocUrl: franchise.kycDocUrl || "",
      reportingPerson: franchise.reportingPerson || "",
      riskLevel: franchise.riskLevel || "Low",
      status: franchise.status || "Pending"
    });
    setShowForm11(true);
  };

  const handleDeletePartner = async (id: string, partnerName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete ${partnerName || 'this franchise partner'}?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/reports/form11?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        triggerToast("Franchise partner deleted successfully!");
        if (selectedFranchise?.id === id) {
          setSelectedFranchise(null);
        }
        loadFranchises();
      } else {
        triggerToast("Error deleting partner: " + data.error);
      }
    } catch (err) {
      triggerToast("Failed to delete franchise partner");
    }
  };

  const handleExportCSV = () => {
    if (franchises.length === 0) {
      triggerToast("No franchise data available to export");
      return;
    }

    const headers = [
      "Registration ID",
      "Firm / Business Name",
      "Contact Person Name",
      "Official Email",
      "Mobile Number",
      "Alternate / WhatsApp Number",
      "Territory / City",
      "State / Zone",
      "Full Office Address",
      "Pincode",
      "Brand / Project",
      "Revenue Share %",
      "Franchise Fee (₹)",
      "Agreement Start Date",
      "Agreement End Date",
      "GSTIN Number",
      "PAN Card Number",
      "Franchise Agreement File URL",
      "KYC Document File URL",
      "Reporting Manager",
      "Risk Assessment Level",
      "Account Status",
      "Registered By User",
      "Registration Date"
    ];

    const rows = franchises.map(f => [
      `"${f.id || ''}"`,
      `"${(f.partnerName || '').replace(/"/g, '""')}"`,
      `"${(f.contactPerson || '').replace(/"/g, '""')}"`,
      `"${(f.email || '').replace(/"/g, '""')}"`,
      `"${(f.mobile || '').replace(/"/g, '""')}"`,
      `"${(f.alternateMobile || '').replace(/"/g, '""')}"`,
      `"${(f.territory || '').replace(/"/g, '""')}"`,
      `"${(f.state || '').replace(/"/g, '""')}"`,
      `"${(f.address || '').replace(/"/g, '""')}"`,
      `"${(f.pincode || '').replace(/"/g, '""')}"`,
      `"${(f.brandProject || '').replace(/"/g, '""')}"`,
      `"${(f.revenueShare || '').replace(/"/g, '""')}"`,
      `"${(f.franchiseFee || '').replace(/"/g, '""')}"`,
      `"${(f.agreementStartDate || '').replace(/"/g, '""')}"`,
      `"${(f.agreementEndDate || '').replace(/"/g, '""')}"`,
      `"${(f.gstin || '').replace(/"/g, '""')}"`,
      `"${(f.pan || '').replace(/"/g, '""')}"`,
      `"${(f.agreementUrl || '').replace(/"/g, '""')}"`,
      `"${(f.kycDocUrl || '').replace(/"/g, '""')}"`,
      `"${(f.reportingPerson || '').replace(/"/g, '""')}"`,
      `"${(f.riskLevel || '').replace(/"/g, '""')}"`,
      `"${(f.status || '').replace(/"/g, '""')}"`,
      `"${(typeof f.registeredBy === 'object' ? f.registeredBy?.name || f.registeredBy?.email : f.registeredBy || '').replace(/"/g, '""')}"`,
      `"${f.createdAt ? new Date(f.createdAt).toLocaleDateString() : ''}"`
    ]);

    const csvContent = "\ufeff" + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `franchise_partners_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    triggerToast("Complete franchise partners report exported successfully!");
  };

  const loadFranchises = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/reports/form11");
      const data = await res.json();
      if (data.success) {
        setFranchises(data.data);
        if (data.data.length > 0) {
          setSelectedFranchise(data.data[0]);
        } else {
          setSelectedFranchise(null);
        }
      }
    } catch (err) {
      triggerToast("Failed to load franchises");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFranchises();
  }, []);

  const handleSelectFranchise = (franchise: any) => {
    if (!franchise) {
      setSelectedFranchise(null);
      return;
    }
    if (selectedFranchise && selectedFranchise.id === franchise.id) {
      setSelectedFranchise(null);
    } else {
      setSelectedFranchise(franchise);
    }
  };

  const filteredFranchises = franchises.filter(f =>
    (f.partnerName || f.user?.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (f.contactPerson || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (f.email || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (f.mobile || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (f.brandProject || f.territory?.name || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-fadeIn text-slate-800">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-800">Franchise & Territory Partners</h1>
          <p className="text-xs text-slate-500 mt-1">Directory of registered franchise partners & territory agreements</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search partner, contact, mobile..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="bg-white border border-slate-200 rounded-lg pl-9 pr-4 py-2 text-xs font-semibold focus:outline-none focus:border-[#714B67] text-slate-800 w-64 shadow-2xs"
            />
          </div>
          <button
            onClick={handleExportCSV}
            className="bg-emerald-700 hover:bg-emerald-800 px-3.5 py-2 rounded-lg text-xs font-bold text-white transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-4 h-4" /> Export CSV
          </button>
          <button
            onClick={() => {
              resetForm11();
              setShowForm11(true);
            }}
            className="bg-[#714B67] hover:bg-[#5F3F56] px-4 py-2 rounded-lg text-xs font-bold text-white transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Add Franchise Partner
          </button>
          <button
            onClick={loadFranchises}
            disabled={loading}
            className="p-2 border border-slate-200 bg-white rounded-lg hover:bg-slate-50 text-slate-600 transition duration-150 shrink-0 shadow-2xs cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Main Full-Width Data Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[10px] uppercase font-black tracking-wider text-slate-600 font-mono">
                <th className="py-3.5 px-4">Business / Firm Name</th>
                <th className="py-3.5 px-4">Contact Person</th>
                <th className="py-3.5 px-4">Email & Mobile</th>
                <th className="py-3.5 px-4">Brand / Project</th>
                <th className="py-3.5 px-4">Revenue Share</th>
                <th className="py-3.5 px-4">Risk Level</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-150 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-400 font-bold text-xs animate-pulse">
                    Loading franchise partners...
                  </td>
                </tr>
              ) : filteredFranchises.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-400 font-bold text-xs">
                    No franchise partners found. Click "+ Add Franchise Partner" to register.
                  </td>
                </tr>
              ) : (
                filteredFranchises.map((franchise, i) => {
                  const isSelected = selectedFranchise && selectedFranchise.id === franchise.id;

                  return (
                    <tr
                      key={franchise.id || i}
                      onClick={() => handleSelectFranchise(franchise)}
                      className={`cursor-pointer transition-all ${
                        isSelected ? "bg-[#714B67]/5 font-medium" : "hover:bg-slate-50/80"
                      }`}
                    >
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        {franchise.partnerName || franchise.user?.name || "Unknown Partner"}
                        {franchise.address && <span className="block text-[10px] font-normal text-slate-500 truncate max-w-[200px]">{franchise.address}</span>}
                      </td>
                      <td className="py-3.5 px-4 text-slate-700 font-semibold">
                        {franchise.contactPerson || "N/A"}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        <span className="block font-medium text-slate-800">{franchise.email || "N/A"}</span>
                        <span className="text-[10px] text-slate-500 font-mono">{franchise.mobile || "N/A"}</span>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-indigo-700">
                        {franchise.brandProject || "N/A"}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-emerald-700 font-mono">
                        {franchise.revenueShare || "N/A"}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                          franchise.riskLevel === "High" ? "bg-rose-50 text-rose-700 border-rose-200" : franchise.riskLevel === "Medium" ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"
                        }`}>
                          {franchise.riskLevel || "Low"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${
                          franchise.status === "Active" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200"
                        }`}>
                          {franchise.status || "Pending"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={(e) => handleEditPartner(franchise, e)}
                            className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold transition-all border border-indigo-200 flex items-center gap-1 cursor-pointer"
                            title="Edit Partner"
                          >
                            <Edit3 className="w-3.5 h-3.5" /> Edit
                          </button>
                          <button
                            onClick={(e) => handleDeletePartner(franchise.id, franchise.partnerName, e)}
                            className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-bold transition-all border border-rose-200 flex items-center gap-1 cursor-pointer"
                            title="Delete Partner"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Expanded Selected Partner Details (Renders Below the Table) */}
      {selectedFranchise && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-md animate-fadeIn space-y-6 border-t-4 border-t-[#714B67]">
          {/* Header */}
          <div className="flex justify-between items-start pb-4 border-b border-slate-200">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-[#714B67]/10 text-[#714B67]"><UserPlus className="w-5 h-5" /></span>
                <div>
                  <h2 className="text-lg font-black text-slate-900">
                    {selectedFranchise.partnerName || "Unknown Partner"}
                  </h2>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">Registered on {new Date(selectedFranchise.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className={`px-3 py-1 rounded-lg text-xs font-black border ${
                selectedFranchise.status === "Active" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200"
              }`}>
                Status: {selectedFranchise.status || "Pending"}
              </span>
              <button
                onClick={() => setSelectedFranchise(null)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-500 hover:bg-slate-100 transition-all"
              >
                ✕ Close Details
              </button>
            </div>
          </div>

          {/* Details Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Section 1: Basic Information & Address */}
            <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-200/80 space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-[#714B67] flex items-center gap-1.5 font-mono">
                <span className="w-2 h-2 rounded-full bg-[#714B67]"></span> Basic Information & Address
              </h4>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[10px] uppercase font-black text-slate-500 block">Firm / Business Name</span>
                  <span className="font-bold text-slate-900">{selectedFranchise.partnerName || "N/A"}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-black text-slate-500 block">Contact Person Name</span>
                  <span className="font-bold text-slate-900">{selectedFranchise.contactPerson || "N/A"}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-black text-slate-500 block">Official Email</span>
                  <span className="font-bold text-slate-900">{selectedFranchise.email || "N/A"}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-black text-slate-500 block">Mobile Number</span>
                  <span className="font-bold text-slate-900">{selectedFranchise.mobile || "N/A"}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-black text-slate-500 block">WhatsApp / Alternate</span>
                  <span className="font-bold text-slate-900">{selectedFranchise.alternateMobile || "N/A"}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-black text-slate-500 block">Pincode</span>
                  <span className="font-bold text-slate-900">{selectedFranchise.pincode || "N/A"}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-[10px] uppercase font-black text-slate-500 block">Full Office Address</span>
                  <span className="font-semibold text-slate-700">{selectedFranchise.address || "N/A"}</span>
                </div>
              </div>
            </div>

            {/* Section 2: Commercial & Business Terms */}
            <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-200/80 space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-[#714B67] flex items-center gap-1.5 font-mono">
                <span className="w-2 h-2 rounded-full bg-[#714B67]"></span> Commercial & Business Terms
              </h4>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[10px] uppercase font-black text-slate-500 block">Brand / Project</span>
                  <span className="font-bold text-indigo-700">{selectedFranchise.brandProject || "N/A"}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-black text-slate-500 block">Revenue Share %</span>
                  <span className="font-bold text-emerald-700">{selectedFranchise.revenueShare || "N/A"}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-black text-slate-500 block">Franchise Fee / Deposit (₹)</span>
                  <span className="font-bold text-slate-900">{selectedFranchise.franchiseFee ? `₹ ${selectedFranchise.franchiseFee}` : "N/A"}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-black text-slate-500 block">Agreement Start Date</span>
                  <span className="font-bold text-slate-900">{selectedFranchise.agreementStartDate || "N/A"}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-black text-slate-500 block">Agreement End Date</span>
                  <span className="font-bold text-slate-900">{selectedFranchise.agreementEndDate || "N/A"}</span>
                </div>
              </div>
            </div>

            {/* Section 3: Legal & KYC Documents */}
            <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-200/80 space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-[#714B67] flex items-center gap-1.5 font-mono">
                <span className="w-2 h-2 rounded-full bg-[#714B67]"></span> Legal & KYC Documents
              </h4>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[10px] uppercase font-black text-slate-500 block">GSTIN Number</span>
                  <span className="font-mono font-bold text-slate-900">{selectedFranchise.gstin || "N/A"}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-black text-slate-500 block">PAN Card Number</span>
                  <span className="font-mono font-bold text-slate-900">{selectedFranchise.pan || "N/A"}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-black text-slate-500 block mb-1">Franchise Agreement Document</span>
                  {selectedFranchise.agreementUrl ? (
                    <a href={selectedFranchise.agreementUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#714B67] text-white font-bold text-[11px] hover:bg-[#5F3F56] transition-all shadow-2xs">
                      <FileText className="w-3.5 h-3.5" /> View Agreement File
                    </a>
                  ) : (
                    <span className="text-slate-400 italic text-[11px]">No agreement uploaded</span>
                  )}
                </div>
                <div>
                  <span className="text-[10px] uppercase font-black text-slate-500 block mb-1">KYC Document</span>
                  {selectedFranchise.kycDocUrl ? (
                    <a href={selectedFranchise.kycDocUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-bold text-[11px] hover:bg-emerald-700 transition-all shadow-2xs">
                      <FileText className="w-3.5 h-3.5" /> View KYC Document
                    </a>
                  ) : (
                    <span className="text-slate-400 italic text-[11px]">No KYC uploaded</span>
                  )}
                </div>
              </div>
            </div>

            {/* Section 4: Operations & Governance */}
            <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-200/80 space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-[#714B67] flex items-center gap-1.5 font-mono">
                <span className="w-2 h-2 rounded-full bg-[#714B67]"></span> Operations & Governance
              </h4>
              <div className="grid grid-cols-3 gap-3 text-xs">
                <div>
                  <span className="text-[10px] uppercase font-black text-slate-500 block">Reporting Manager</span>
                  <span className="font-bold text-slate-900">{selectedFranchise.reportingPerson || "N/A"}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-black text-slate-500 block">Risk Level</span>
                  <span className="font-bold text-slate-900">{selectedFranchise.riskLevel || "Low"}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-black text-slate-500 block">Account Status</span>
                  <span className="font-bold text-slate-900">{selectedFranchise.status || "Pending"}</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Single Unified Register Franchise Partner Modal */}
      {showForm11 && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col my-auto border border-slate-200">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-[#714B67]/10 rounded-t-2xl">
              <div>
                <h2 className="text-lg font-black text-[#714B67] tracking-tight flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-[#714B67] text-white">
                    {editingPartnerId ? <Edit3 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  </span>
                  {editingPartnerId ? "Edit Franchise Partner" : "Add Franchise Partner"}
                </h2>
                <p className="text-xs text-slate-600 font-bold mt-0.5">
                  {editingPartnerId ? "Update existing franchise partner profile & agreement terms" : "Officially onboard and register a new franchise partner"}
                </p>
              </div>
              <button onClick={() => setShowForm11(false)} className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center hover:bg-rose-50 hover:border-rose-200 transition-all text-slate-400 hover:text-rose-600 cursor-pointer">
                <AlertCircle className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
              <form onSubmit={handleForm11Submit} className="space-y-6">

                {/* Section 1: Basic Partner Details */}
                <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-200/80 space-y-3">
                  <h3 className="text-xs font-black uppercase tracking-wider text-[#714B67] flex items-center gap-1.5 font-mono">
                    <span className="w-2 h-2 rounded-full bg-[#714B67] inline-block"></span> 1. Basic Partner Details
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-[10px] uppercase font-black text-slate-600 tracking-wider">Business / Firm Name *</label>
                      <input required className="w-full bg-white border border-slate-300 focus:border-[#714B67] rounded-lg p-2 text-xs font-bold text-slate-800 mt-1 focus:outline-none" value={form11.partnerName} onChange={e => setForm11({ ...form11, partnerName: e.target.value })} placeholder="e.g. Acme Corp LLP" />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-black text-slate-600 tracking-wider">Contact Person Name</label>
                      <input className="w-full bg-white border border-slate-300 focus:border-[#714B67] rounded-lg p-2 text-xs font-bold text-slate-800 mt-1 focus:outline-none" value={form11.contactPerson} onChange={e => setForm11({ ...form11, contactPerson: e.target.value })} placeholder="Owner / Signatory Name" />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-black text-slate-600 tracking-wider">Official Email</label>
                      <input type="email" className="w-full bg-white border border-slate-300 focus:border-[#714B67] rounded-lg p-2 text-xs font-bold text-slate-800 mt-1 focus:outline-none" value={form11.email} onChange={e => setForm11({ ...form11, email: e.target.value })} placeholder="partner@domain.com" />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-black text-slate-600 tracking-wider">Mobile Number</label>
                      <input className="w-full bg-white border border-slate-300 focus:border-[#714B67] rounded-lg p-2 text-xs font-bold text-slate-800 mt-1 focus:outline-none" value={form11.mobile} onChange={e => setForm11({ ...form11, mobile: e.target.value })} placeholder="+91 XXXXX XXXXX" />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-black text-slate-600 tracking-wider">Alternate / WhatsApp Number</label>
                      <input className="w-full bg-white border border-slate-300 focus:border-[#714B67] rounded-lg p-2 text-xs font-bold text-slate-800 mt-1 focus:outline-none" value={form11.alternateMobile} onChange={e => setForm11({ ...form11, alternateMobile: e.target.value })} placeholder="WhatsApp Number" />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-black text-slate-600 tracking-wider">Pincode / Postal Code</label>
                      <input className="w-full bg-white border border-slate-300 focus:border-[#714B67] rounded-lg p-2 text-xs font-bold text-slate-800 mt-1 focus:outline-none" value={form11.pincode} onChange={e => setForm11({ ...form11, pincode: e.target.value })} placeholder="e.g. 302020" />
                    </div>
                    <div className="md:col-span-3">
                      <label className="text-[10px] uppercase font-black text-slate-600 tracking-wider">Full Office Address</label>
                      <input className="w-full bg-white border border-slate-300 focus:border-[#714B67] rounded-lg p-2 text-xs font-bold text-slate-800 mt-1 focus:outline-none" value={form11.address} onChange={e => setForm11({ ...form11, address: e.target.value })} placeholder="Plot / Suite No, Street Name, City, State" />
                    </div>
                  </div>
                </div>

                {/* Section 2: Commercial & Business Terms */}
                <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-200/80 space-y-3">
                  <h3 className="text-xs font-black uppercase tracking-wider text-[#714B67] flex items-center gap-1.5 font-mono">
                    <span className="w-2 h-2 rounded-full bg-[#714B67] inline-block"></span> 2. Commercial & Business Terms
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="text-[10px] uppercase font-black text-slate-600 tracking-wider">Brand / Project</label>
                      <input className="w-full bg-white border border-slate-300 focus:border-[#714B67] rounded-lg p-2 text-xs font-bold text-slate-800 mt-1 focus:outline-none" value={form11.brandProject} onChange={e => setForm11({ ...form11, brandProject: e.target.value })} placeholder="Brand / Project Name" />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-black text-slate-600 tracking-wider">Revenue Share %</label>
                      <input className="w-full bg-white border border-slate-300 focus:border-[#714B67] rounded-lg p-2 text-xs font-bold text-slate-800 mt-1 focus:outline-none" value={form11.revenueShare} onChange={e => setForm11({ ...form11, revenueShare: e.target.value })} placeholder="e.g. 20% Net Split" />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-black text-slate-600 tracking-wider">Franchise Fee / Deposit (₹)</label>
                      <input className="w-full bg-white border border-slate-300 focus:border-[#714B67] rounded-lg p-2 text-xs font-bold text-slate-800 mt-1 focus:outline-none" value={form11.franchiseFee} onChange={e => setForm11({ ...form11, franchiseFee: e.target.value })} placeholder="e.g. ₹ 5,00,000" />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-black text-slate-600 tracking-wider">Agreement Start Date</label>
                      <input type="date" className="w-full bg-white border border-slate-300 focus:border-[#714B67] rounded-lg p-2 text-xs font-bold text-slate-800 mt-1 focus:outline-none" value={form11.agreementStartDate} onChange={e => setForm11({ ...form11, agreementStartDate: e.target.value })} />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-black text-slate-600 tracking-wider">Agreement End Date</label>
                      <input type="date" className="w-full bg-white border border-slate-300 focus:border-[#714B67] rounded-lg p-2 text-xs font-bold text-slate-800 mt-1 focus:outline-none" value={form11.agreementEndDate} onChange={e => setForm11({ ...form11, agreementEndDate: e.target.value })} />
                    </div>
                  </div>
                </div>

                {/* Section 3: Legal & KYC Documents */}
                <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-200/80 space-y-3">
                  <h3 className="text-xs font-black uppercase tracking-wider text-[#714B67] flex items-center gap-1.5 font-mono">
                    <span className="w-2 h-2 rounded-full bg-[#714B67] inline-block"></span> 3. Legal & KYC Documents
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] uppercase font-black text-slate-600 tracking-wider">GSTIN Number</label>
                      <input className="w-full bg-white border border-slate-300 focus:border-[#714B67] rounded-lg p-2 text-xs font-bold text-slate-800 mt-1 focus:outline-none font-mono" value={form11.gstin} onChange={e => setForm11({ ...form11, gstin: e.target.value.toUpperCase() })} placeholder="22AAAAA0000A1Z5" />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-black text-slate-600 tracking-wider">PAN Card Number</label>
                      <input className="w-full bg-white border border-slate-300 focus:border-[#714B67] rounded-lg p-2 text-xs font-bold text-slate-800 mt-1 focus:outline-none font-mono" value={form11.pan} onChange={e => setForm11({ ...form11, pan: e.target.value.toUpperCase() })} placeholder="ABCDE1234F" />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-black text-slate-600 tracking-wider">Franchise Agreement Upload</label>
                      {form11.agreementUrl ? (
                        <div className="flex items-center justify-between p-2 bg-[#714B67]/10 border border-[#714B67]/30 rounded-lg mt-1">
                          <a href={form11.agreementUrl} target="_blank" rel="noreferrer" className="text-[#714B67] text-xs font-bold underline truncate max-w-[250px]">View Agreement File</a>
                          <button type="button" onClick={() => setForm11({ ...form11, agreementUrl: "" })} className="text-rose-600 text-[10px] font-black uppercase bg-white px-2 py-0.5 rounded border border-rose-200 hover:bg-rose-50">Remove</button>
                        </div>
                      ) : (
                        <div className="relative mt-1">
                          <input type="file" accept="image/*,.pdf" onChange={handleFileUpload} disabled={uploadingDoc} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                          <div className={`w-full bg-white border border-slate-300 border-dashed rounded-lg p-2 text-xs font-bold text-center transition-all ${uploadingDoc ? 'text-[#714B67] border-[#714B67] bg-[#714B67]/10' : 'text-slate-500 hover:bg-slate-100'}`}>
                            {uploadingDoc ? "Uploading Agreement..." : "📎 Click to Upload Agreement PDF/Scan"}
                          </div>
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-black text-slate-600 tracking-wider">KYC Document Upload</label>
                      {form11.kycDocUrl ? (
                        <div className="flex items-center justify-between p-2 bg-emerald-50 border border-emerald-200 rounded-lg mt-1">
                          <a href={form11.kycDocUrl} target="_blank" rel="noreferrer" className="text-emerald-700 text-xs font-bold underline truncate max-w-[250px]">View KYC Document</a>
                          <button type="button" onClick={() => setForm11({ ...form11, kycDocUrl: "" })} className="text-rose-600 text-[10px] font-black uppercase bg-white px-2 py-0.5 rounded border border-rose-200 hover:bg-rose-50">Remove</button>
                        </div>
                      ) : (
                        <div className="relative mt-1">
                          <input type="file" accept="image/*,.pdf" onChange={handleKycUpload} disabled={uploadingKyc} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                          <div className={`w-full bg-white border border-slate-300 border-dashed rounded-lg p-2 text-xs font-bold text-center transition-all ${uploadingKyc ? 'text-emerald-600 border-emerald-400 bg-emerald-50' : 'text-slate-500 hover:bg-slate-100'}`}>
                            {uploadingKyc ? "Uploading KYC..." : "📎 Click to Upload KYC Doc (Aadhaar/PAN/Reg)"}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Section 4: Operations & Governance */}
                <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-200/80 space-y-3">
                  <h3 className="text-xs font-black uppercase tracking-wider text-[#714B67] flex items-center gap-1.5 font-mono">
                    <span className="w-2 h-2 rounded-full bg-[#714B67] inline-block"></span> 4. Operations & Governance
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-[10px] uppercase font-black text-slate-600 tracking-wider">Reporting Manager / Contact</label>
                      <input className="w-full bg-white border border-slate-300 focus:border-[#714B67] rounded-lg p-2 text-xs font-bold text-slate-800 mt-1 focus:outline-none" value={form11.reportingPerson} onChange={e => setForm11({ ...form11, reportingPerson: e.target.value })} placeholder="Internal Account Manager Name" />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-black text-slate-600 tracking-wider">Risk Assessment Level</label>
                      <select className="w-full bg-white border border-slate-300 focus:border-[#714B67] rounded-lg p-2 text-xs font-bold text-slate-800 mt-1 focus:outline-none" value={form11.riskLevel} onChange={e => setForm11({ ...form11, riskLevel: e.target.value })}>
                        <option value="Low">Low Risk</option>
                        <option value="Medium">Medium Risk</option>
                        <option value="High">High Risk</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-black text-slate-600 tracking-wider">Account Status</label>
                      <select className="w-full bg-white border border-slate-300 focus:border-[#714B67] rounded-lg p-2 text-xs font-bold text-slate-800 mt-1 focus:outline-none" value={form11.status} onChange={e => setForm11({ ...form11, status: e.target.value })}>
                        <option value="Pending">Pending Approval</option>
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Footer Controls */}
                <div className="pt-4 border-t border-slate-200 flex justify-end gap-3 sticky bottom-0 bg-white py-2">
                  <button type="button" onClick={() => setShowForm11(false)} className="px-5 py-2.5 rounded-xl text-xs font-black uppercase text-slate-600 hover:bg-slate-100 transition-all border border-slate-200">
                    Cancel
                  </button>
                  <button type="submit" disabled={submitting || uploadingDoc || uploadingKyc} className="px-6 py-2.5 rounded-xl text-xs font-black uppercase text-white bg-[#714B67] hover:bg-[#5F3F56] shadow-md transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer">
                    <CheckCircle className="w-4 h-4" /> {submitting ? "Saving..." : editingPartnerId ? "Update Franchise Partner" : "Add Franchise Partner"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
