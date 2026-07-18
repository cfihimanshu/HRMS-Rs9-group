import React, { useState, useEffect } from "react";
import { Plus, Search, UserPlus, RefreshCw, AlertCircle, CheckCircle, FileText } from "lucide-react";

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
                    className={`w-full text-left p-3 rounded-lg border transition-all flex flex-col gap-2 ${
                      isSelected 
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
                          placeholder="e.g. Mumbai North" value={formState.territory} onChange={e => setFormState({...formState, territory: e.target.value})} />
                      </div>
                      
                      <div>
                        <label className="text-[10px] uppercase font-black text-slate-500 font-mono tracking-wider">Payout Terms</label>
                        <input className="w-full bg-slate-50 border border-slate-200 rounded p-2.5 text-xs font-bold text-slate-900 mt-1.5 focus:outline-none focus:border-[#714B67]" 
                          placeholder="e.g. 10% Flat Commission" required value={formState.payoutTerms} onChange={e => setFormState({...formState, payoutTerms: e.target.value})} />
                      </div>

                      <div>
                        <label className="text-[10px] uppercase font-black text-slate-500 font-mono tracking-wider">Leads Generated (Count)</label>
                        <input type="number" min="0" className="w-full bg-slate-50 border border-slate-200 rounded p-2.5 text-xs font-bold text-slate-900 mt-1.5 focus:outline-none focus:border-[#714B67] font-mono" 
                          value={formState.leadsGenerated} onChange={e => setFormState({...formState, leadsGenerated: Number(e.target.value)})} />
                      </div>

                      <div>
                        <label className="text-[10px] uppercase font-black text-slate-500 font-mono tracking-wider">Exit Risk</label>
                        <select className="w-full bg-slate-50 border border-slate-200 rounded p-2.5 text-xs font-bold text-slate-900 mt-1.5 focus:outline-none focus:border-[#714B67]" 
                          value={formState.exitRisk} onChange={e => setFormState({...formState, exitRisk: e.target.value})}>
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
                          value={formState.conversionRate} onChange={e => setFormState({...formState, conversionRate: Number(e.target.value)})} />
                      </div>

                      <div>
                        <div className="flex justify-between mb-1">
                          <label className="text-[10px] font-bold text-slate-700">Reporting Discipline</label>
                          <span className="text-[10px] font-mono text-[#714B67] font-black">{formState.reportingDiscipline}%</span>
                        </div>
                        <input type="range" min="0" max="100" className="w-full accent-[#714B67] h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer" 
                          value={formState.reportingDiscipline} onChange={e => setFormState({...formState, reportingDiscipline: Number(e.target.value)})} />
                      </div>

                      <div>
                        <div className="flex justify-between mb-1">
                          <label className="text-[10px] font-bold text-slate-700">Complaint Ratio (Lower is better)</label>
                          <span className="text-[10px] font-mono text-rose-500 font-black">{formState.complaintRatio}%</span>
                        </div>
                        <input type="range" min="0" max="100" className="w-full accent-rose-500 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer" 
                          value={formState.complaintRatio} onChange={e => setFormState({...formState, complaintRatio: Number(e.target.value)})} />
                      </div>

                      <div>
                        <div className="flex justify-between mb-1">
                          <label className="text-[10px] font-bold text-slate-700">Client Feedback Score</label>
                          <span className="text-[10px] font-mono text-[#714B67] font-black">{formState.clientFeedback}%</span>
                        </div>
                        <input type="range" min="0" max="100" className="w-full accent-[#714B67] h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer" 
                          value={formState.clientFeedback} onChange={e => setFormState({...formState, clientFeedback: Number(e.target.value)})} />
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
                          value={formState.riskScore} onChange={e => setFormState({...formState, riskScore: Number(e.target.value)})} />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {availableFlags.map(flag => (
                        <label key={flag} className={`flex items-center gap-2 p-2.5 rounded border cursor-pointer transition-all ${
                          formState.flags.includes(flag) ? "bg-rose-100 border-rose-300 text-rose-800" : "bg-white border-rose-100 text-slate-600 hover:bg-rose-50"
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
                    <input required className="w-full bg-white border border-slate-300 focus:border-indigo-500 rounded-lg p-2.5 text-xs font-bold text-slate-800 mt-1.5 focus:outline-none" value={form9.territory} onChange={e => setForm9({...form9, territory: e.target.value})} placeholder="Assigned Area" />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-black text-slate-500 tracking-widest">3. Leads Generated *</label>
                    <input required type="number" min="0" className="w-full bg-white border border-slate-300 focus:border-indigo-500 rounded-lg p-2.5 text-xs font-bold text-slate-800 mt-1.5 focus:outline-none font-mono" value={form9.leads} onChange={e => setForm9({...form9, leads: Number(e.target.value)})} />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-black text-slate-500 tracking-widest">4. Conversion (%) *</label>
                    <input required type="number" min="0" max="100" className="w-full bg-white border border-slate-300 focus:border-indigo-500 rounded-lg p-2.5 text-xs font-bold text-slate-800 mt-1.5 focus:outline-none font-mono" value={form9.conversion} onChange={e => setForm9({...form9, conversion: Number(e.target.value)})} />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-black text-slate-500 tracking-widest">5. Collection / Payout *</label>
                    <input required className="w-full bg-white border border-slate-300 focus:border-indigo-500 rounded-lg p-2.5 text-xs font-bold text-slate-800 mt-1.5 focus:outline-none" value={form9.collectionPayout} onChange={e => setForm9({...form9, collectionPayout: e.target.value})} placeholder="e.g., ₹50,000 / 10%" />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-black text-slate-500 tracking-widest">6. Complaint Count *</label>
                    <input required type="number" min="0" className="w-full bg-white border border-slate-300 focus:border-indigo-500 rounded-lg p-2.5 text-xs font-bold text-slate-800 mt-1.5 focus:outline-none font-mono" value={form9.complaint} onChange={e => setForm9({...form9, complaint: Number(e.target.value)})} />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-black text-slate-500 tracking-widest">7. Reporting Discipline (%) *</label>
                    <input required type="number" min="0" max="100" className="w-full bg-white border border-slate-300 focus:border-indigo-500 rounded-lg p-2.5 text-xs font-bold text-slate-800 mt-1.5 focus:outline-none font-mono" value={form9.reporting} onChange={e => setForm9({...form9, reporting: Number(e.target.value)})} />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-black text-slate-500 tracking-widest">8. Risk Flag</label>
                    <select className="w-full bg-white border border-slate-300 focus:border-indigo-500 rounded-lg p-2.5 text-xs font-bold text-slate-800 mt-1.5 focus:outline-none" value={form9.riskFlag} onChange={e => setForm9({...form9, riskFlag: e.target.value})}>
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
  const [selectedVendor, setSelectedVendor] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [formState, setFormState] = useState({
    agreementUrl: "",
    serviceType: "",
    paymentTerms: "",
    riskCategory: "Low",
    performanceScore: 100,
    complaintsCount: 0,
    renewalDate: ""
  });
  // FORM-10 State
  const [showForm10, setShowForm10] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [form10, setForm10] = useState({
    vendorName: "",
    category: "IT",
    contact: "",
    panGst: "",
    serviceType: "",
    agreementUrl: "",
    paymentTerms: "",
    riskLevel: "Low"
  });

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
      setForm10(prev => ({ ...prev, agreementUrl: data.url }));
      triggerToast("Agreement uploaded successfully");
    } catch (err) {
      triggerToast("Failed to upload agreement");
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleForm10Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const res = await fetch("/api/reports/form10", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form10)
      });
      const data = await res.json();
      if (data.success) {
        triggerToast("FORM-10 Submitted Successfully!");
        setShowForm10(false);
        setForm10({ vendorName: "", category: "IT", contact: "", panGst: "", serviceType: "", agreementUrl: "", paymentTerms: "", riskLevel: "Low" });
      } else {
        triggerToast("Failed to submit FORM-10: " + data.error);
      }
    } catch (err) {
      triggerToast("Error submitting FORM-10");
    } finally {
      setSubmitting(false);
    }
  };
  const loadVendors = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/vendors");
      const data = await res.json();
      if (data.success) {
        setVendors(data.data);
        if (!selectedVendor && data.data.length > 0) {
          handleSelectVendor(data.data[0]);
        }
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

  const handleSelectVendor = (vendor: any) => {
    setSelectedVendor(vendor);
    
    // Format date for date picker YYYY-MM-DD
    let formattedDate = "";
    if (vendor.renewalDate) {
      const d = new Date(vendor.renewalDate);
      if (!isNaN(d.getTime())) {
        formattedDate = d.toISOString().split('T')[0];
      }
    }

    setFormState({
      agreementUrl: vendor.agreementUrl || "",
      serviceType: vendor.serviceType || "",
      paymentTerms: vendor.paymentTerms || "",
      riskCategory: vendor.riskCategory || "Low",
      performanceScore: vendor.performanceScore !== undefined ? vendor.performanceScore : 100,
      complaintsCount: vendor.complaintsCount || 0,
      renewalDate: formattedDate
    });
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVendor) return;

    try {
      setSubmitting(true);
      const res = await fetch("/api/vendors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selectedVendor.user.id,
          category: selectedVendor.category, // required by API
          ...formState
        })
      });
      const data = await res.json();
      if (data.success) {
        triggerToast("Vendor matrix updated successfully!");
        loadVendors();
      } else {
        triggerToast("Error: " + data.error);
      }
    } catch (err) {
      triggerToast("Failed to update profile");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredVendors = vendors.filter(v => 
    v.user?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.category?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-fadeIn text-slate-800">
      
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-black text-slate-800">Vendor Contracts Management</h1>
          <p className="text-xs text-slate-500 mt-1">Manage vendor categories, track SLA performance, and monitor renewals</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setShowForm10(true)}
            className="bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg text-xs font-bold text-white transition-all shadow-sm flex items-center gap-1.5"
          >
            <FileText className="w-4 h-4" /> Log FORM-10 (Register)
          </button>
          <button 
            onClick={() => toggleModal("vendor", true)}
            className="bg-[#714B67] hover:bg-[#5F3F56] px-4 py-2 rounded-lg text-xs font-bold text-white transition-all shadow-sm flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Add Vendor Matrix
          </button>
          <button 
            onClick={loadVendors} 
            disabled={loading}
            className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 transition duration-150 shrink-0"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Side: Vendors List */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-4 flex flex-col h-[750px] shadow-sm">
          <h3 className="text-xs font-black tracking-widest text-[#714B67] uppercase font-mono mb-3">Service Providers</h3>
          
          <div className="relative mb-3">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input 
              type="text" 
              placeholder="Search vendor or category..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-4 py-2 text-xs font-semibold focus:outline-none focus:border-[#714B67] text-slate-800"
            />
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
            {loading ? (
              <div className="text-center py-10 font-bold text-slate-400 text-[10px] animate-pulse">Loading vendors...</div>
            ) : filteredVendors.length === 0 ? (
              <div className="text-center py-10 text-slate-400 font-bold text-[10px]">No vendors found</div>
            ) : (
              filteredVendors.map((vendor, i) => {
                const isSelected = selectedVendor && selectedVendor.id === vendor.id;
                
                // Calculate if renewal is within 30 days
                let renewalUrgent = false;
                if (vendor.renewalDate) {
                  const daysLeft = (new Date(vendor.renewalDate).getTime() - new Date().getTime()) / (1000 * 3600 * 24);
                  if (daysLeft < 30 && daysLeft > 0) renewalUrgent = true;
                }
                
                return (
                  <button
                    key={i}
                    onClick={() => handleSelectVendor(vendor)}
                    className={`w-full text-left p-3 rounded-lg border transition-all flex flex-col gap-2 ${
                      isSelected 
                        ? "bg-[#714B67]/5 border-[#714B67] shadow-sm" 
                        : "bg-white border-slate-100 hover:border-slate-350 hover:bg-slate-50/50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-slate-800 text-xs truncate">{vendor.user?.name || "Unknown Vendor"}</div>
                      {vendor.riskCategory === 'High' && <AlertCircle className="w-4 h-4 text-rose-500" />}
                    </div>
                    <div className="flex items-center justify-between mt-1 text-[10px] text-slate-500 font-mono">
                      <span>{vendor.category || "General"}</span>
                      {renewalUrgent && <span className="text-rose-500 font-bold bg-rose-50 px-1 rounded">Renewal Due</span>}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Side: Vendor Workspace */}
        <div className="lg:col-span-8">
          {selectedVendor ? (
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col h-[750px]">
              
              {/* Profile Header */}
              <div className="flex justify-between items-start gap-4 pb-4 border-b border-slate-150 shrink-0">
                <div>
                  <h2 className="text-lg font-black text-slate-850 flex items-center gap-2">
                    <UserPlus className="w-5 h-5 text-[#714B67]" />
                    {selectedVendor.user?.name || "Unknown Vendor"}
                  </h2>
                  <div className="text-slate-500 text-[10px] mt-1.5 flex gap-4">
                    <span>Email: <strong className="text-slate-700">{selectedVendor.user?.email || "N/A"}</strong></span>
                    <span>Category: <strong className="text-slate-700">{selectedVendor.category || "N/A"}</strong></span>
                    <span>Joined: <strong className="text-[#714B67]">{new Date(selectedVendor.createdAt).toLocaleDateString()}</strong></span>
                  </div>
                </div>
                
                <div className={`px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-center min-w-28`}>
                  <span className="text-[9px] uppercase font-black tracking-widest text-slate-500 block mb-0.5">Risk Category</span>
                  <span className={`text-xs font-bold ${formState.riskCategory === 'High' ? 'text-rose-600' : formState.riskCategory === 'Medium' ? 'text-amber-600' : 'text-emerald-600'}`}>
                    {formState.riskCategory}
                  </span>
                </div>
              </div>

              {/* Scrollable Form Content */}
              <div className="flex-1 overflow-y-auto py-5 pr-2 scrollbar-thin">
                <form id="vendor-form" onSubmit={handleSaveProfile} className="space-y-8">
                  
                  {/* Agreement & Contract Matrix */}
                  <div>
                    <h4 className="text-[10px] font-black tracking-widest text-[#714B67] uppercase font-mono mb-4 border-b border-slate-100 pb-2">Contract Matrix</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                      
                      <div>
                        <label className="text-[10px] uppercase font-black text-slate-500 font-mono tracking-wider">Service Type Details</label>
                        <input className="w-full bg-slate-50 border border-slate-200 rounded p-2.5 text-xs font-bold text-slate-900 mt-1.5 focus:outline-none focus:border-[#714B67]" 
                          placeholder="e.g. Legal Consulting, Office Cleaning" value={formState.serviceType} onChange={e => setFormState({...formState, serviceType: e.target.value})} />
                      </div>
                      
                      <div>
                        <label className="text-[10px] uppercase font-black text-slate-500 font-mono tracking-wider">Payment Terms</label>
                        <input className="w-full bg-slate-50 border border-slate-200 rounded p-2.5 text-xs font-bold text-slate-900 mt-1.5 focus:outline-none focus:border-[#714B67]" 
                          placeholder="e.g. Net 30, Advance" required value={formState.paymentTerms} onChange={e => setFormState({...formState, paymentTerms: e.target.value})} />
                      </div>

                      <div>
                        <label className="text-[10px] uppercase font-black text-slate-500 font-mono tracking-wider">Agreement Doc URL</label>
                        <input type="url" className="w-full bg-slate-50 border border-slate-200 rounded p-2.5 text-xs font-bold text-slate-900 mt-1.5 focus:outline-none focus:border-[#714B67] font-mono" 
                          placeholder="https://drive.google.com/..." value={formState.agreementUrl} onChange={e => setFormState({...formState, agreementUrl: e.target.value})} />
                      </div>

                      <div>
                        <label className="text-[10px] uppercase font-black text-slate-500 font-mono tracking-wider">Renewal Date</label>
                        <input type="date" className="w-full bg-slate-50 border border-slate-200 rounded p-2.5 text-xs font-bold text-slate-900 mt-1.5 focus:outline-none focus:border-[#714B67]" 
                          value={formState.renewalDate} onChange={e => setFormState({...formState, renewalDate: e.target.value})} />
                      </div>

                    </div>
                  </div>

                  {/* Quality & SLA */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 shadow-sm">
                    <h4 className="text-[10px] font-black tracking-widest text-[#714B67] uppercase font-mono mb-4 border-b border-slate-200 pb-2">SLA Performance & Risk</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
                      
                      <div className="md:col-span-2">
                        <div className="flex justify-between mb-1">
                          <label className="text-[10px] font-bold text-slate-700">Performance Score (SLA Compliance)</label>
                          <span className="text-[10px] font-mono text-[#714B67] font-black">{formState.performanceScore}%</span>
                        </div>
                        <input type="range" min="0" max="100" className="w-full accent-[#714B67] h-1.5 bg-slate-300 rounded-lg appearance-none cursor-pointer" 
                          value={formState.performanceScore} onChange={e => setFormState({...formState, performanceScore: Number(e.target.value)})} />
                      </div>

                      <div>
                        <label className="text-[10px] uppercase font-black text-slate-500 font-mono tracking-wider">Escalated Complaints</label>
                        <input type="number" min="0" className="w-full bg-white border border-slate-300 rounded p-2.5 text-xs font-black text-rose-700 mt-1.5 focus:outline-none focus:border-[#714B67] font-mono" 
                          value={formState.complaintsCount} onChange={e => setFormState({...formState, complaintsCount: Number(e.target.value)})} />
                      </div>

                      <div>
                        <label className="text-[10px] uppercase font-black text-slate-500 font-mono tracking-wider">Vetting Risk Category</label>
                        <select className="w-full bg-white border border-slate-300 rounded p-2.5 text-xs font-bold text-slate-900 mt-1.5 focus:outline-none focus:border-[#714B67]" 
                          value={formState.riskCategory} onChange={e => setFormState({...formState, riskCategory: e.target.value})}>
                          <option value="Low">Low Risk</option>
                          <option value="Medium">Medium Risk</option>
                          <option value="High">High Risk</option>
                        </select>
                      </div>

                    </div>
                  </div>

                  <button 
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-[#714B67] hover:bg-[#5F3F56] text-white py-3.5 rounded-xl text-xs font-black tracking-widest uppercase transition-all shadow-md flex items-center justify-center gap-2 mt-4"
                  >
                    <CheckCircle className="w-4 h-4" /> Save Vendor Metrics
                  </button>

                </form>
              </div>
            </div>
          ) : (
            <div className="text-center py-32 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center items-center h-[750px]">
              <FileText className="w-12 h-12 text-slate-300 mb-4 animate-bounce" />
              <h4 className="text-sm font-black text-slate-800 uppercase tracking-wide">No Vendor Selected</h4>
              <p className="text-xs text-slate-400 mt-2 max-w-xs leading-normal">
                Select a service provider from the left directory to track SLAs, agreements, and payment terms.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* FORM-10 Vendor Registration Modal */}
      {showForm10 && (
        <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-indigo-50/50 rounded-t-2xl">
              <div>
                <h2 className="text-lg font-black text-indigo-900 tracking-tight">FORM-10 Vendor Registration</h2>
                <p className="text-xs text-indigo-600 font-bold mt-1">Officially onboard a new vendor into the system</p>
              </div>
              <button onClick={() => setShowForm10(false)} className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-all text-slate-500 hover:text-rose-500">
                <AlertCircle className="w-4 h-4" />
              </button>
            </div>
            
            <div className="p-6">
              <form onSubmit={handleForm10Submit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="text-[10px] uppercase font-black text-slate-500 tracking-widest">1. Vendor Name *</label>
                    <input required className="w-full bg-white border border-slate-300 focus:border-indigo-500 rounded-lg p-2.5 text-xs font-bold text-slate-800 mt-1.5 focus:outline-none" value={form10.vendorName} onChange={e => setForm10({...form10, vendorName: e.target.value})} placeholder="Company or Individual Name" />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-black text-slate-500 tracking-widest">2. Category *</label>
                    <select className="w-full bg-white border border-slate-300 focus:border-indigo-500 rounded-lg p-2.5 text-xs font-bold text-slate-800 mt-1.5 focus:outline-none" value={form10.category} onChange={e => setForm10({...form10, category: e.target.value})}>
                      <option value="IT">IT</option>
                      <option value="Advocate">Advocate</option>
                      <option value="CA/CS">CA/CS</option>
                      <option value="Hotel/Guest House">Hotel/Guest House</option>
                      <option value="Tiffin/Catering">Tiffin/Catering</option>
                      <option value="CCTV">CCTV</option>
                      <option value="Courier/Cab/Delivery">Courier/Cab/Delivery</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-black text-slate-500 tracking-widest">3. Contact Details *</label>
                    <input required className="w-full bg-white border border-slate-300 focus:border-indigo-500 rounded-lg p-2.5 text-xs font-bold text-slate-800 mt-1.5 focus:outline-none font-mono" value={form10.contact} onChange={e => setForm10({...form10, contact: e.target.value})} placeholder="Phone / Email" />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-black text-slate-500 tracking-widest">4. PAN / GST Number *</label>
                    <input required className="w-full bg-white border border-slate-300 focus:border-indigo-500 rounded-lg p-2.5 text-xs font-bold text-slate-800 mt-1.5 focus:outline-none font-mono uppercase" value={form10.panGst} onChange={e => setForm10({...form10, panGst: e.target.value})} placeholder="ABCDE1234F" />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-black text-slate-500 tracking-widest">5. Service Type *</label>
                    <input required className="w-full bg-white border border-slate-300 focus:border-indigo-500 rounded-lg p-2.5 text-xs font-bold text-slate-800 mt-1.5 focus:outline-none" value={form10.serviceType} onChange={e => setForm10({...form10, serviceType: e.target.value})} placeholder="e.g. Hardware Maintenance" />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-black text-slate-500 tracking-widest">6. Payment Terms *</label>
                    <input required className="w-full bg-white border border-slate-300 focus:border-indigo-500 rounded-lg p-2.5 text-xs font-bold text-slate-800 mt-1.5 focus:outline-none" value={form10.paymentTerms} onChange={e => setForm10({...form10, paymentTerms: e.target.value})} placeholder="e.g. Net 30, Advance" />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-black text-slate-500 tracking-widest">7. Agreement Upload *</label>
                    {form10.agreementUrl ? (
                      <div className="flex items-center gap-2 mt-1.5">
                        <a href={form10.agreementUrl} target="_blank" rel="noreferrer" className="text-indigo-600 text-[10px] font-bold underline truncate max-w-[200px]">View Uploaded Agreement</a>
                        <button type="button" onClick={() => setForm10({...form10, agreementUrl: ""})} className="text-rose-500 text-[10px] font-black uppercase">Remove</button>
                      </div>
                    ) : (
                      <div className="relative mt-1.5">
                        <input type="file" accept="image/*,.pdf" onChange={handleFileUpload} disabled={uploadingDoc} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                        <div className={`w-full bg-slate-50 border border-slate-300 border-dashed rounded-lg p-2.5 text-xs font-bold text-center transition-all ${uploadingDoc ? 'text-indigo-500 border-indigo-400 bg-indigo-50' : 'text-slate-500 hover:bg-slate-100 hover:border-slate-400'}`}>
                          {uploadingDoc ? "Uploading..." : "Click to Upload PDF/Image"}
                        </div>
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-black text-slate-500 tracking-widest">8. Risk Level *</label>
                    <select className="w-full bg-white border border-slate-300 focus:border-indigo-500 rounded-lg p-2.5 text-xs font-bold text-slate-800 mt-1.5 focus:outline-none" value={form10.riskLevel} onChange={e => setForm10({...form10, riskLevel: e.target.value})}>
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                    </select>
                  </div>
                </div>
                
                <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                  <button type="button" onClick={() => setShowForm10(false)} className="px-5 py-2.5 rounded-lg text-xs font-black uppercase text-slate-500 hover:bg-slate-100 transition-all">Cancel</button>
                  <button type="submit" disabled={submitting || uploadingDoc || !form10.agreementUrl} className="px-6 py-2.5 rounded-lg text-xs font-black uppercase text-white bg-indigo-600 hover:bg-indigo-700 shadow-md transition-all flex items-center gap-2 disabled:opacity-50">
                    <CheckCircle className="w-4 h-4" /> Submit FORM-10
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

  // FORM-11 State
  const [showForm11, setShowForm11] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [form11, setForm11] = useState({
    partnerName: "",
    territory: "",
    brandProject: "",
    agreementUrl: "",
    revenueShare: "",
    reportingPerson: "",
    riskLevel: "Low",
    status: "Pending"
  });

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
      triggerToast("Agreement uploaded successfully");
    } catch (err) {
      triggerToast("Failed to upload agreement");
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleForm11Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const res = await fetch("/api/reports/form11", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form11)
      });
      const data = await res.json();
      if (data.success) {
        triggerToast("FORM-11 Submitted Successfully!");
        setShowForm11(false);
        setForm11({ partnerName: "", territory: "", brandProject: "", agreementUrl: "", revenueShare: "", reportingPerson: "", riskLevel: "Low", status: "Pending" });
      } else {
        triggerToast("Failed to submit FORM-11: " + data.error);
      }
    } catch (err) {
      triggerToast("Error submitting FORM-11");
    } finally {
      setSubmitting(false);
    }
  };

  const loadFranchises = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/franchises");
      const data = await res.json();
      if (data.success) {
        setFranchises(data.data);
        if (!selectedFranchise && data.data.length > 0) {
          handleSelectFranchise(data.data[0]);
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
    setSelectedFranchise(franchise);
    
    setFormState({
      agreementUrl: franchise.agreementUrl || "",
      revenueSharing: franchise.revenueSharing || "",
      leadsGenerated: franchise.leadsGenerated || 0,
      reportsSubmitted: franchise.reportsSubmitted || 0,
      complaintsCount: franchise.complaintsCount || 0,
      escalationsCount: franchise.escalationsCount || 0,
      brandingCompliance: franchise.brandingCompliance || "Compliant",
      territoryRisk: franchise.territoryRisk || "Low"
    });
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFranchise) return;

    try {
      setSubmitting(true);
      const res = await fetch("/api/franchises", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selectedFranchise.user.id,
          territoryId: selectedFranchise.territory?.id, // required by API
          ...formState
        })
      });
      const data = await res.json();
      if (data.success) {
        triggerToast("Franchise metrics updated successfully!");
        loadFranchises();
      } else {
        triggerToast("Error: " + data.error);
      }
    } catch (err) {
      triggerToast("Failed to update franchise profile");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredFranchises = franchises.filter(f => 
    f.user?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.territory?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-fadeIn text-slate-800">
      
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-black text-slate-800">Franchise & Territory Partners</h1>
          <p className="text-xs text-slate-500 mt-1">18 regional territories — branding compliance & revenue sharing rules audits</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setShowForm11(true)}
            className="bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg text-xs font-bold text-white transition-all shadow-sm flex items-center gap-1.5"
          >
            <FileText className="w-4 h-4" /> Log FORM-11 (Franchise)
          </button>
          <button 
            onClick={() => toggleModal("franchise", true)}
            className="bg-[#714B67] hover:bg-[#5F3F56] px-4 py-2 rounded-lg text-xs font-bold text-white transition-all shadow-sm flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Add Partner Matrix
          </button>
          <button 
            onClick={loadFranchises} 
            disabled={loading}
            className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 transition duration-150 shrink-0"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Side: Franchise List */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-4 flex flex-col h-[750px] shadow-sm">
          <h3 className="text-xs font-black tracking-widest text-[#714B67] uppercase font-mono mb-3">Territory Network</h3>
          
          <div className="relative mb-3">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input 
              type="text" 
              placeholder="Search partner or territory..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-4 py-2 text-xs font-semibold focus:outline-none focus:border-[#714B67] text-slate-800"
            />
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
            {loading ? (
              <div className="text-center py-10 font-bold text-slate-400 text-[10px] animate-pulse">Loading partners...</div>
            ) : filteredFranchises.length === 0 ? (
              <div className="text-center py-10 text-slate-400 font-bold text-[10px]">No partners found</div>
            ) : (
              filteredFranchises.map((franchise, i) => {
                const isSelected = selectedFranchise && selectedFranchise.id === franchise.id;
                
                return (
                  <button
                    key={i}
                    onClick={() => handleSelectFranchise(franchise)}
                    className={`w-full text-left p-3 rounded-lg border transition-all flex flex-col gap-2 ${
                      isSelected 
                        ? "bg-[#714B67]/5 border-[#714B67] shadow-sm" 
                        : "bg-white border-slate-100 hover:border-slate-350 hover:bg-slate-50/50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-slate-800 text-xs truncate">{franchise.user?.name || "Unknown Partner"}</div>
                      {franchise.territoryRisk === 'High' && <AlertCircle className="w-4 h-4 text-rose-500" />}
                    </div>
                    <div className="flex items-center justify-between mt-1 text-[10px] text-slate-500 font-mono">
                      <span className="truncate max-w-[120px]">{franchise.territory?.name || "Unassigned"}</span>
                      {franchise.brandingCompliance === 'Non-Compliant' && <span className="text-rose-500 font-bold bg-rose-50 px-1 rounded truncate">Audit Failed</span>}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Side: Franchise Workspace */}
        <div className="lg:col-span-8">
          {selectedFranchise ? (
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col h-[750px]">
              
              {/* Profile Header */}
              <div className="flex justify-between items-start gap-4 pb-4 border-b border-slate-150 shrink-0">
                <div>
                  <h2 className="text-lg font-black text-slate-850 flex items-center gap-2">
                    <UserPlus className="w-5 h-5 text-[#714B67]" />
                    {selectedFranchise.user?.name || "Unknown Partner"}
                  </h2>
                  <div className="text-slate-500 text-[10px] mt-1.5 flex gap-4">
                    <span>Email: <strong className="text-slate-700">{selectedFranchise.user?.email || "N/A"}</strong></span>
                    <span>Territory: <strong className="text-[#714B67]">{selectedFranchise.territory?.name || "Unassigned"}</strong></span>
                    <span>Since: <strong className="text-slate-700">{new Date(selectedFranchise.createdAt).toLocaleDateString()}</strong></span>
                  </div>
                </div>
                
                <div className={`px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-center min-w-28`}>
                  <span className="text-[9px] uppercase font-black tracking-widest text-slate-500 block mb-0.5">Territory Risk</span>
                  <span className={`text-xs font-bold ${formState.territoryRisk === 'High' ? 'text-rose-600' : formState.territoryRisk === 'Medium' ? 'text-amber-600' : 'text-emerald-600'}`}>
                    {formState.territoryRisk}
                  </span>
                </div>
              </div>

              {/* Scrollable Form Content */}
              <div className="flex-1 overflow-y-auto py-5 pr-2 scrollbar-thin">
                <form id="franchise-form" onSubmit={handleSaveProfile} className="space-y-8">
                  
                  {/* Business Tracking */}
                  <div>
                    <h4 className="text-[10px] font-black tracking-widest text-[#714B67] uppercase font-mono mb-4 border-b border-slate-100 pb-2">Business & Contracting</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                      
                      <div>
                        <label className="text-[10px] uppercase font-black text-slate-500 font-mono tracking-wider">Revenue Sharing Plan</label>
                        <input className="w-full bg-slate-50 border border-slate-200 rounded p-2.5 text-xs font-bold text-slate-900 mt-1.5 focus:outline-none focus:border-[#714B67]" 
                          placeholder="e.g. 15% Gross" value={formState.revenueSharing} onChange={e => setFormState({...formState, revenueSharing: e.target.value})} required />
                      </div>
                      
                      <div>
                        <label className="text-[10px] uppercase font-black text-slate-500 font-mono tracking-wider">Master Agreement URL</label>
                        <input type="url" className="w-full bg-slate-50 border border-slate-200 rounded p-2.5 text-xs font-bold text-slate-900 mt-1.5 focus:outline-none focus:border-[#714B67] font-mono" 
                          placeholder="https://drive.google.com/..." value={formState.agreementUrl} onChange={e => setFormState({...formState, agreementUrl: e.target.value})} />
                      </div>

                      <div>
                        <label className="text-[10px] uppercase font-black text-slate-500 font-mono tracking-wider">Branding Compliance</label>
                        <select className="w-full bg-slate-50 border border-slate-200 rounded p-2.5 text-xs font-bold text-slate-900 mt-1.5 focus:outline-none focus:border-[#714B67]" 
                          value={formState.brandingCompliance} onChange={e => setFormState({...formState, brandingCompliance: e.target.value})}>
                          <option value="Compliant">Compliant</option>
                          <option value="Non-Compliant">Non-Compliant</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] uppercase font-black text-slate-500 font-mono tracking-wider">Territory Risk Level</label>
                        <select className="w-full bg-slate-50 border border-slate-200 rounded p-2.5 text-xs font-bold text-slate-900 mt-1.5 focus:outline-none focus:border-[#714B67]" 
                          value={formState.territoryRisk} onChange={e => setFormState({...formState, territoryRisk: e.target.value})}>
                          <option value="Low">Low Risk</option>
                          <option value="Medium">Medium Risk</option>
                          <option value="High">High Risk</option>
                        </select>
                      </div>

                    </div>
                  </div>

                  {/* Operations & Complaints Matrix */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 shadow-sm">
                    <h4 className="text-[10px] font-black tracking-widest text-[#714B67] uppercase font-mono mb-4 border-b border-slate-200 pb-2">Operations & Escalations Matrix</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
                      
                      <div>
                        <label className="text-[10px] uppercase font-black text-slate-500 font-mono tracking-wider">Total Leads Generated</label>
                        <input type="number" min="0" className="w-full bg-white border border-slate-300 rounded p-2.5 text-xs font-black text-[#714B67] mt-1.5 focus:outline-none focus:border-[#714B67] font-mono" 
                          value={formState.leadsGenerated} onChange={e => setFormState({...formState, leadsGenerated: Number(e.target.value)})} />
                      </div>

                      <div>
                        <label className="text-[10px] uppercase font-black text-slate-500 font-mono tracking-wider">Reports Submitted</label>
                        <input type="number" min="0" className="w-full bg-white border border-slate-300 rounded p-2.5 text-xs font-black text-emerald-600 mt-1.5 focus:outline-none focus:border-[#714B67] font-mono" 
                          value={formState.reportsSubmitted} onChange={e => setFormState({...formState, reportsSubmitted: Number(e.target.value)})} />
                      </div>

                      <div>
                        <label className="text-[10px] uppercase font-black text-slate-500 font-mono tracking-wider">Customer Complaints</label>
                        <input type="number" min="0" className="w-full bg-white border border-slate-300 rounded p-2.5 text-xs font-black text-amber-600 mt-1.5 focus:outline-none focus:border-[#714B67] font-mono" 
                          value={formState.complaintsCount} onChange={e => setFormState({...formState, complaintsCount: Number(e.target.value)})} />
                      </div>

                      <div>
                        <label className="text-[10px] uppercase font-black text-slate-500 font-mono tracking-wider">Management Escalations</label>
                        <input type="number" min="0" className="w-full bg-white border border-slate-300 rounded p-2.5 text-xs font-black text-rose-600 mt-1.5 focus:outline-none focus:border-[#714B67] font-mono" 
                          value={formState.escalationsCount} onChange={e => setFormState({...formState, escalationsCount: Number(e.target.value)})} />
                      </div>

                    </div>
                  </div>

                  <button 
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-[#714B67] hover:bg-[#5F3F56] text-white py-3.5 rounded-xl text-xs font-black tracking-widest uppercase transition-all shadow-md flex items-center justify-center gap-2 mt-4"
                  >
                    <CheckCircle className="w-4 h-4" /> Save Franchise Data
                  </button>

                </form>
              </div>
            </div>
          ) : (
            <div className="text-center py-32 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center items-center h-[750px]">
              <FileText className="w-12 h-12 text-slate-300 mb-4 animate-bounce" />
              <h4 className="text-sm font-black text-slate-800 uppercase tracking-wide">No Franchise Selected</h4>
              <p className="text-xs text-slate-400 mt-2 max-w-xs leading-normal">
                Select a franchise partner from the left directory to track territory growth, revenue sharing, and compliance escalations.
              </p>
            </div>
          )}
        </div>

      </div>

      {/* FORM-11 Franchise Registration Modal */}
      {showForm11 && (
        <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-indigo-50/50 rounded-t-2xl">
              <div>
                <h2 className="text-lg font-black text-indigo-900 tracking-tight">FORM-11 Franchise / Territory</h2>
                <p className="text-xs text-indigo-600 font-bold mt-1">Officially onboard and track a new franchise partner</p>
              </div>
              <button onClick={() => setShowForm11(false)} className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-all text-slate-500 hover:text-rose-500">
                <AlertCircle className="w-4 h-4" />
              </button>
            </div>
            
            <div className="p-6">
              <form onSubmit={handleForm11Submit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="text-[10px] uppercase font-black text-slate-500 tracking-widest">1. Partner Name *</label>
                    <input required className="w-full bg-white border border-slate-300 focus:border-indigo-500 rounded-lg p-2.5 text-xs font-bold text-slate-800 mt-1.5 focus:outline-none" value={form11.partnerName} onChange={e => setForm11({...form11, partnerName: e.target.value})} placeholder="Partner Name" />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-black text-slate-500 tracking-widest">2. Territory *</label>
                    <input required className="w-full bg-white border border-slate-300 focus:border-indigo-500 rounded-lg p-2.5 text-xs font-bold text-slate-800 mt-1.5 focus:outline-none" value={form11.territory} onChange={e => setForm11({...form11, territory: e.target.value})} placeholder="Assigned Territory" />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-black text-slate-500 tracking-widest">3. Brand / Project *</label>
                    <input required className="w-full bg-white border border-slate-300 focus:border-indigo-500 rounded-lg p-2.5 text-xs font-bold text-slate-800 mt-1.5 focus:outline-none" value={form11.brandProject} onChange={e => setForm11({...form11, brandProject: e.target.value})} placeholder="Associated Brand or Project" />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-black text-slate-500 tracking-widest">4. Agreement Upload *</label>
                    {form11.agreementUrl ? (
                      <div className="flex items-center gap-2 mt-1.5">
                        <a href={form11.agreementUrl} target="_blank" rel="noreferrer" className="text-indigo-600 text-[10px] font-bold underline truncate max-w-[200px]">View Uploaded Agreement</a>
                        <button type="button" onClick={() => setForm11({...form11, agreementUrl: ""})} className="text-rose-500 text-[10px] font-black uppercase">Remove</button>
                      </div>
                    ) : (
                      <div className="relative mt-1.5">
                        <input type="file" accept="image/*,.pdf" onChange={handleFileUpload} disabled={uploadingDoc} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                        <div className={`w-full bg-slate-50 border border-slate-300 border-dashed rounded-lg p-2.5 text-xs font-bold text-center transition-all ${uploadingDoc ? 'text-indigo-500 border-indigo-400 bg-indigo-50' : 'text-slate-500 hover:bg-slate-100 hover:border-slate-400'}`}>
                          {uploadingDoc ? "Uploading..." : "Click to Upload PDF/Image"}
                        </div>
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-black text-slate-500 tracking-widest">5. Revenue Share *</label>
                    <input required className="w-full bg-white border border-slate-300 focus:border-indigo-500 rounded-lg p-2.5 text-xs font-bold text-slate-800 mt-1.5 focus:outline-none" value={form11.revenueShare} onChange={e => setForm11({...form11, revenueShare: e.target.value})} placeholder="e.g. 20% Net" />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-black text-slate-500 tracking-widest">6. Reporting Person *</label>
                    <input required className="w-full bg-white border border-slate-300 focus:border-indigo-500 rounded-lg p-2.5 text-xs font-bold text-slate-800 mt-1.5 focus:outline-none" value={form11.reportingPerson} onChange={e => setForm11({...form11, reportingPerson: e.target.value})} placeholder="Reporting Manager Name" />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-black text-slate-500 tracking-widest">7. Risk Level *</label>
                    <select className="w-full bg-white border border-slate-300 focus:border-indigo-500 rounded-lg p-2.5 text-xs font-bold text-slate-800 mt-1.5 focus:outline-none" value={form11.riskLevel} onChange={e => setForm11({...form11, riskLevel: e.target.value})}>
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-black text-slate-500 tracking-widest">8. Status *</label>
                    <select className="w-full bg-white border border-slate-300 focus:border-indigo-500 rounded-lg p-2.5 text-xs font-bold text-slate-800 mt-1.5 focus:outline-none" value={form11.status} onChange={e => setForm11({...form11, status: e.target.value})}>
                      <option value="Pending">Pending</option>
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                </div>
                
                <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                  <button type="button" onClick={() => setShowForm11(false)} className="px-5 py-2.5 rounded-lg text-xs font-black uppercase text-slate-500 hover:bg-slate-100 transition-all">Cancel</button>
                  <button type="submit" disabled={submitting || uploadingDoc || !form11.agreementUrl} className="px-6 py-2.5 rounded-lg text-xs font-black uppercase text-white bg-indigo-600 hover:bg-indigo-700 shadow-md transition-all flex items-center gap-2 disabled:opacity-50">
                    <CheckCircle className="w-4 h-4" /> Submit FORM-11
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
