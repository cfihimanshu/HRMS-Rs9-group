import React, { useState, useEffect } from "react";
import { Plus, Search, AlertCircle, ShieldAlert, CheckCircle, RefreshCw, EyeOff, FileText, UserCheck, ShieldCheck, Building2 } from "lucide-react";

interface ComplianceProps {
  riskAlertList: any[];
  toggleModal: (modalId: string, open: boolean) => void;
  triggerToast: (msg: string) => void;
  onResolveAlert: (id: string) => void;
}

export function GrievanceResolution({ toggleModal, triggerToast }: { toggleModal: (modalId: string, open: boolean) => void; triggerToast: (msg: string) => void; }) {
  const [grievances, setGrievances] = useState<any[]>([]);
  const [selectedGrievance, setSelectedGrievance] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Resolution Form State
  const [formState, setFormState] = useState({
    status: "Open",
    resolutionReport: ""
  });

  const loadGrievances = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/grievances");
      const data = await res.json();
      if (data.success) {
        setGrievances(data.data);
        if (!selectedGrievance && data.data.length > 0) {
          handleSelectGrievance(data.data[0]);
        }
      }
    } catch (err) {
      triggerToast("Failed to load grievances");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGrievances();
  }, []);

  const handleSelectGrievance = (grievance: any) => {
    setSelectedGrievance(grievance);
    setFormState({
      status: grievance.status || "Open",
      resolutionReport: grievance.resolutionReport || ""
    });
  };

  const handleResolveGrievance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGrievance) return;

    try {
      setSubmitting(true);
      const res = await fetch("/api/grievances", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          grievanceId: selectedGrievance.id,
          status: formState.status,
          resolutionReport: formState.resolutionReport
        })
      });
      const data = await res.json();
      if (data.success) {
        triggerToast(`Grievance ${selectedGrievance.id.slice(-4).toUpperCase()} updated successfully!`);
        loadGrievances();
      } else {
        triggerToast("Error: " + data.error);
      }
    } catch (err) {
      triggerToast("Failed to update grievance");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredGrievances = grievances.filter(g => 
    g.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    g.raisedBy?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    g.id.slice(-4).toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-fadeIn text-slate-800">
      
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-black text-slate-800">Anonymous Grievance Resolution</h1>
          <p className="text-xs text-slate-500 mt-1">Confidential grievance audits for employees, vendors, and franchise networks</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => toggleModal("grievance", true)}
            className="bg-rose-600 hover:bg-rose-700 px-4 py-2 rounded-lg text-xs font-bold text-white transition-all shadow-sm flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> File Grievance Ticket
          </button>
          <button 
            onClick={loadGrievances} 
            disabled={loading}
            className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 transition duration-150 shrink-0"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Side: Ticket List */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-4 flex flex-col h-[750px] shadow-sm">
          <h3 className="text-xs font-black tracking-widest text-slate-400 uppercase font-mono mb-3">Open Tickets</h3>
          
          <div className="relative mb-3">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input 
              type="text" 
              placeholder="Search by ID, Name or Category..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-4 py-2 text-xs font-semibold focus:outline-none focus:border-rose-400 text-slate-800"
            />
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
            {loading ? (
              <div className="text-center py-10 font-bold text-slate-400 text-[10px] animate-pulse">Loading tickets...</div>
            ) : filteredGrievances.length === 0 ? (
              <div className="text-center py-10 text-slate-400 font-bold text-[10px]">No grievances found</div>
            ) : (
              filteredGrievances.map((grievance, i) => {
                const isSelected = selectedGrievance && selectedGrievance.id === grievance.id;
                
                return (
                  <button
                    key={i}
                    onClick={() => handleSelectGrievance(grievance)}
                    className={`w-full text-left p-3 rounded-lg border transition-all flex flex-col gap-2 ${
                      isSelected 
                        ? "bg-rose-50/50 border-rose-200 shadow-sm" 
                        : "bg-white border-slate-100 hover:border-slate-300 hover:bg-slate-50/50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-slate-800 text-xs truncate flex items-center gap-1.5">
                        <span className="text-[10px] font-mono text-slate-400">GR-{grievance.id.slice(-4).toUpperCase()}</span>
                        {grievance.raisedBy?.name}
                      </div>
                      {grievance.priority === 'High' && <AlertCircle className="w-4 h-4 text-rose-500" />}
                    </div>
                    <div className="flex items-center justify-between mt-1 text-[10px] font-mono">
                      <span className="text-slate-500 truncate max-w-[120px]">{grievance.category}</span>
                      <span className={`font-bold px-1.5 py-0.5 rounded ${grievance.status === 'Resolved' ? 'bg-emerald-50 text-emerald-600' : grievance.status === 'In-Progress' ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-600'}`}>
                        {grievance.status}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Side: Grievance Workspace */}
        <div className="lg:col-span-8">
          {selectedGrievance ? (
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col h-[750px]">
              
              {/* Profile Header */}
              <div className="flex justify-between items-start gap-4 pb-4 border-b border-slate-150 shrink-0">
                <div>
                  <h2 className="text-lg font-black text-slate-850 flex items-center gap-2">
                    <ShieldAlert className="w-5 h-5 text-rose-600" />
                    Grievance Report — GR-{selectedGrievance.id.slice(-4).toUpperCase()}
                  </h2>
                  <div className="text-slate-500 text-[10px] mt-1.5 flex gap-4">
                    <span>Filed By: <strong className={`text-slate-700 ${selectedGrievance.anonymous ? 'text-rose-600 flex items-center gap-1' : ''}`}>{selectedGrievance.anonymous && <EyeOff className="w-3 h-3"/>} {selectedGrievance.raisedBy?.name || "Unknown"}</strong></span>
                    <span>Role: <strong className="text-slate-700">{selectedGrievance.raisedBy?.role || "N/A"}</strong></span>
                    <span>Date: <strong className="text-slate-700">{new Date(selectedGrievance.createdAt).toLocaleString()}</strong></span>
                  </div>
                </div>
                
                <div className={`px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-center min-w-28`}>
                  <span className="text-[9px] uppercase font-black tracking-widest text-slate-500 block mb-0.5">Priority Level</span>
                  <span className={`text-xs font-bold ${selectedGrievance.priority === 'High' ? 'text-rose-600' : selectedGrievance.priority === 'Medium' ? 'text-amber-600' : 'text-emerald-600'}`}>
                    {selectedGrievance.priority}
                  </span>
                </div>
              </div>

              {/* Scrollable Form Content */}
              <div className="flex-1 overflow-y-auto py-5 pr-2 scrollbar-thin">
                <div className="space-y-8">
                  
                  {/* Complaint Details */}
                  <div>
                    <h4 className="text-[10px] font-black tracking-widest text-slate-400 uppercase font-mono mb-4 border-b border-slate-100 pb-2">Incident Details</h4>
                    
                    <div className="mb-4">
                      <span className="text-[10px] uppercase font-black text-slate-500 font-mono tracking-wider">Category</span>
                      <div className="mt-1.5 p-2.5 bg-slate-50 border border-slate-200 rounded text-xs font-bold text-slate-800">
                        {selectedGrievance.category}
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-black text-slate-500 font-mono tracking-wider">Complaint Rationale</span>
                      <div className="mt-1.5 p-4 bg-slate-50 border border-slate-200 rounded text-xs font-medium text-slate-800 leading-relaxed whitespace-pre-wrap min-h-[100px]">
                        {selectedGrievance.description}
                      </div>
                    </div>
                  </div>

                  {/* Resolution & Escalation */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 shadow-sm">
                    <h4 className="text-[10px] font-black tracking-widest text-slate-400 uppercase font-mono mb-4 border-b border-slate-200 pb-2">Resolution & Closure</h4>
                    
                    <form onSubmit={handleResolveGrievance} className="space-y-5">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="text-[10px] uppercase font-black text-slate-500 font-mono tracking-wider">Ticket Status</label>
                          <select className="w-full bg-white border border-slate-300 rounded p-2.5 text-xs font-bold text-slate-900 mt-1.5 focus:outline-none focus:border-rose-400" 
                            value={formState.status} onChange={e => setFormState({...formState, status: e.target.value})}>
                            <option value="Open">Open</option>
                            <option value="In-Progress">In-Progress</option>
                            <option value="Resolved">Resolved</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] uppercase font-black text-slate-500 font-mono tracking-wider">Assigned Auditor</label>
                          <input type="text" disabled className="w-full bg-slate-200 border border-slate-300 rounded p-2.5 text-xs font-bold text-slate-500 mt-1.5 cursor-not-allowed" 
                            value={selectedGrievance.assignedTo?.name || "Auto-assign to self on save"} />
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] uppercase font-black text-slate-500 font-mono tracking-wider">Closure Report / Investigation Notes</label>
                        <textarea className="w-full bg-white border border-slate-300 rounded p-3 text-xs font-medium text-slate-800 mt-1.5 h-32 focus:outline-none focus:border-rose-400 leading-relaxed placeholder:text-slate-300" 
                          placeholder="Document findings, actions taken, and final resolution..." 
                          value={formState.resolutionReport} onChange={e => setFormState({...formState, resolutionReport: e.target.value})} />
                      </div>

                      <button 
                        type="submit"
                        disabled={submitting}
                        className="w-full bg-slate-800 hover:bg-slate-900 text-white py-3.5 rounded-xl text-xs font-black tracking-widest uppercase transition-all shadow-md flex items-center justify-center gap-2 mt-2"
                      >
                        <CheckCircle className="w-4 h-4" /> Save Resolution Notes
                      </button>
                    </form>
                  </div>

                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-32 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center items-center h-[750px]">
              <ShieldAlert className="w-12 h-12 text-slate-300 mb-4" />
              <h4 className="text-sm font-black text-slate-800 uppercase tracking-wide">No Grievance Selected</h4>
              <p className="text-xs text-slate-400 mt-2 max-w-xs leading-normal">
                Select a ticket from the left directory to investigate complaints and file closure reports.
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

export function SystemRiskAlerts({ toggleModal, triggerToast, riskAlertList, onResolveAlert }: { toggleModal?: any, triggerToast: (msg: string) => void, riskAlertList?: any[], onResolveAlert?: (id: string) => void }) {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [selectedAlert, setSelectedAlert] = useState<any>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Resolution Form State
  const [resolutionStatus, setResolutionStatus] = useState("Open");

  // Create Form State
  const [createForm, setCreateForm] = useState({
    source: "High-risk candidate",
    level: "Medium",
    description: ""
  });

  const loadAlerts = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/alerts");
      const data = await res.json();
      if (data.success) {
        setAlerts(data.data);
        if (!selectedAlert && !isCreating && data.data.length > 0) {
          handleSelectAlert(data.data[0]);
        }
      }
    } catch (err) {
      triggerToast("Failed to load risk alerts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAlerts();
  }, []);

  const handleSelectAlert = (alert: any) => {
    setIsCreating(false);
    setSelectedAlert(alert);
    setResolutionStatus(alert.status || "Open");
  };

  const handleCreateNew = () => {
    setSelectedAlert(null);
    setIsCreating(true);
    setCreateForm({
      source: "High-risk candidate",
      level: "Medium",
      description: ""
    });
  };

  const handleResolveAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAlert) return;

    try {
      setSubmitting(true);
      const res = await fetch("/api/alerts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          alertId: selectedAlert.id,
          status: resolutionStatus
        })
      });
      const data = await res.json();
      if (data.success) {
        triggerToast(`Alert RA-${selectedAlert.id.slice(-4).toUpperCase()} marked as ${resolutionStatus}`);
        loadAlerts();
      } else {
        triggerToast("Error: " + data.error);
      }
    } catch (err) {
      triggerToast("Failed to update alert");
    } finally {
      setSubmitting(false);
    }
  };

  const handleTriggerAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const res = await fetch("/api/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: createForm.source,
          level: createForm.level,
          description: createForm.description
        })
      });
      const data = await res.json();
      if (data.success) {
        triggerToast("New Risk Alert triggered successfully!");
        setIsCreating(false);
        await loadAlerts();
        handleSelectAlert(data.data);
      } else {
        triggerToast("Error: " + data.error);
      }
    } catch (err) {
      triggerToast("Failed to trigger alert");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredAlerts = alerts.filter(a => 
    a.source?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.id.slice(-4).toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-fadeIn text-slate-800">
      
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-black text-slate-800">Enterprise Risk & Alerts Management</h1>
          <p className="text-xs text-slate-500 mt-1">Automatic vetting triggers and manual compliance risk logs</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={handleCreateNew}
            className="bg-rose-600 hover:bg-rose-700 px-4 py-2 rounded-lg text-xs font-bold text-white transition-all shadow-sm flex items-center gap-1.5"
          >
            <ShieldAlert className="w-4 h-4" /> Trigger Alert
          </button>
          <button 
            onClick={loadAlerts} 
            disabled={loading}
            className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 transition duration-150 shrink-0"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Side: Alert List */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-4 flex flex-col h-[750px] shadow-sm">
          <h3 className="text-xs font-black tracking-widest text-slate-400 uppercase font-mono mb-3">Active Risk Logs</h3>
          
          <div className="relative mb-3">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input 
              type="text" 
              placeholder="Search by ID or Category..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-4 py-2 text-xs font-semibold focus:outline-none focus:border-rose-400 text-slate-800"
            />
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
            {loading ? (
              <div className="text-center py-10 font-bold text-slate-400 text-[10px] animate-pulse">Loading alerts...</div>
            ) : filteredAlerts.length === 0 ? (
              <div className="text-center py-10 text-slate-400 font-bold text-[10px]">No alerts found</div>
            ) : (
              filteredAlerts.map((alert, i) => {
                const isSelected = selectedAlert && selectedAlert.id === alert.id;
                
                return (
                  <button
                    key={i}
                    onClick={() => handleSelectAlert(alert)}
                    className={`w-full text-left p-3 rounded-lg border transition-all flex flex-col gap-2 ${
                      isSelected 
                        ? "bg-rose-50/50 border-rose-200 shadow-sm" 
                        : "bg-white border-slate-100 hover:border-slate-300 hover:bg-slate-50/50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-slate-800 text-xs truncate flex items-center gap-1.5">
                        <span className="text-[10px] font-mono text-slate-400">RA-{alert.id.slice(-4).toUpperCase()}</span>
                        <span className="truncate max-w-[140px]">{alert.source}</span>
                      </div>
                      {(alert.level === 'High' || alert.level === 'Critical') && <AlertCircle className="w-4 h-4 text-rose-500" />}
                    </div>
                    <div className="flex items-center justify-between mt-1 text-[10px] font-mono">
                      <span className={`font-bold px-1.5 py-0.5 rounded ${alert.level === 'Critical' ? 'bg-rose-600 text-white' : alert.level === 'High' ? 'bg-rose-100 text-rose-600' : alert.level === 'Medium' ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'}`}>
                        {alert.level} Risk
                      </span>
                      <span className={`font-bold px-1.5 py-0.5 rounded ${alert.status === 'Resolved' ? 'bg-emerald-50 text-emerald-600' : alert.status === 'Investigating' ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-600'}`}>
                        {alert.status}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Side: Alert Workspace */}
        <div className="lg:col-span-8">
          {isCreating ? (
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col h-[750px]">
              <div className="flex justify-between items-start gap-4 pb-4 border-b border-slate-150 shrink-0">
                <div>
                  <h2 className="text-lg font-black text-slate-850 flex items-center gap-2">
                    <ShieldAlert className="w-5 h-5 text-rose-600" />
                    Trigger System Risk Alert
                  </h2>
                  <p className="text-slate-500 text-[10px] mt-1.5">Log an anomaly, fraud, or compliance risk for immediate investigation.</p>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto py-5 pr-2 scrollbar-thin">
                <form onSubmit={handleTriggerAlert} className="space-y-6">
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="text-[10px] uppercase font-black text-slate-500 font-mono tracking-wider">Risk Category</label>
                      <select className="w-full bg-white border border-slate-300 rounded p-2.5 text-xs font-bold text-slate-900 mt-1.5 focus:outline-none focus:border-rose-400" 
                        value={createForm.source} onChange={e => setCreateForm({...createForm, source: e.target.value})}>
                        <option value="High-risk candidate">1. High-risk candidate</option>
                        <option value="Fraud risk">2. Fraud risk</option>
                        <option value="Payment diversion">3. Payment diversion</option>
                        <option value="Data leakage">4. Data leakage</option>
                        <option value="Groupism">5. Groupism</option>
                        <option value="Client diversion">6. Client diversion</option>
                        <option value="Emotional instability">7. Emotional instability</option>
                        <option value="Leadership complaint">8. Leadership complaint</option>
                        <option value="Vendor risk">9. Vendor risk</option>
                        <option value="Territory risk">10. Territory risk</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] uppercase font-black text-slate-500 font-mono tracking-wider">Severity Level</label>
                      <select className="w-full bg-white border border-slate-300 rounded p-2.5 text-xs font-bold text-slate-900 mt-1.5 focus:outline-none focus:border-rose-400" 
                        value={createForm.level} onChange={e => setCreateForm({...createForm, level: e.target.value})}>
                        <option value="Low">Low</option>
                        <option value="Medium">Medium</option>
                        <option value="High">High</option>
                        <option value="Critical">Critical</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-black text-slate-500 font-mono tracking-wider">Risk Description & Evidence</label>
                    <textarea className="w-full bg-white border border-slate-300 rounded p-3 text-xs font-medium text-slate-800 mt-1.5 h-32 focus:outline-none focus:border-rose-400 leading-relaxed" 
                      placeholder="Detail the anomaly, incident, or suspicion..." 
                      required
                      value={createForm.description} onChange={e => setCreateForm({...createForm, description: e.target.value})} />
                  </div>

                  <button 
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-rose-600 hover:bg-rose-700 text-white py-3.5 rounded-xl text-xs font-black tracking-widest uppercase transition-all shadow-md flex items-center justify-center gap-2 mt-2"
                  >
                    <ShieldAlert className="w-4 h-4" /> Broadcast Risk Alert
                  </button>
                </form>
              </div>
            </div>
          ) : selectedAlert ? (
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col h-[750px]">
              
              <div className="flex justify-between items-start gap-4 pb-4 border-b border-slate-150 shrink-0">
                <div>
                  <h2 className="text-lg font-black text-slate-850 flex items-center gap-2">
                    <ShieldAlert className="w-5 h-5 text-rose-600" />
                    Risk Alert — RA-{selectedAlert.id.slice(-4).toUpperCase()}
                  </h2>
                  <div className="text-slate-500 text-[10px] mt-1.5 flex gap-4">
                    <span>Triggered By: <strong className="text-slate-700">{selectedAlert.triggeredBy?.name || "System Automation"}</strong></span>
                    <span>Date: <strong className="text-slate-700">{new Date(selectedAlert.createdAt).toLocaleString()}</strong></span>
                  </div>
                </div>
                
                <div className={`px-4 py-2 ${selectedAlert.level === 'Critical' ? 'bg-rose-600 text-white' : selectedAlert.level === 'High' ? 'bg-rose-100 text-rose-600' : 'bg-slate-50 text-slate-600'} border border-slate-200 rounded-lg text-center min-w-28`}>
                  <span className={`text-[9px] uppercase font-black tracking-widest block mb-0.5 ${selectedAlert.level === 'Critical' ? 'text-rose-100' : 'text-slate-500'}`}>Severity Level</span>
                  <span className="text-xs font-bold">
                    {selectedAlert.level} Risk
                  </span>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto py-5 pr-2 scrollbar-thin">
                <div className="space-y-8">
                  
                  <div>
                    <h4 className="text-[10px] font-black tracking-widest text-slate-400 uppercase font-mono mb-4 border-b border-slate-100 pb-2">Anomaly Details</h4>
                    
                    <div className="mb-4">
                      <span className="text-[10px] uppercase font-black text-slate-500 font-mono tracking-wider">Risk Category</span>
                      <div className="mt-1.5 p-2.5 bg-slate-50 border border-slate-200 rounded text-xs font-bold text-slate-800">
                        {selectedAlert.source}
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-black text-slate-500 font-mono tracking-wider">Flagged Details & Evidence</span>
                      <div className="mt-1.5 p-4 bg-rose-50/30 border border-rose-100 rounded text-xs font-medium text-slate-800 leading-relaxed whitespace-pre-wrap min-h-[100px]">
                        {selectedAlert.description}
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 shadow-sm">
                    <h4 className="text-[10px] font-black tracking-widest text-slate-400 uppercase font-mono mb-4 border-b border-slate-200 pb-2">Investigation & Vetting</h4>
                    
                    <form onSubmit={handleResolveAlert} className="space-y-5">
                      <div>
                        <label className="text-[10px] uppercase font-black text-slate-500 font-mono tracking-wider">Update Status</label>
                        <select className="w-full bg-white border border-slate-300 rounded p-2.5 text-xs font-bold text-slate-900 mt-1.5 focus:outline-none focus:border-rose-400" 
                          value={resolutionStatus} onChange={e => setResolutionStatus(e.target.value)}>
                          <option value="Open">Open (Pending Review)</option>
                          <option value="Investigating">Investigating (Active)</option>
                          <option value="Resolved">Resolved (Cleared/Mitigated)</option>
                        </select>
                      </div>

                      <button 
                        type="submit"
                        disabled={submitting}
                        className="w-full bg-slate-800 hover:bg-slate-900 text-white py-3.5 rounded-xl text-xs font-black tracking-widest uppercase transition-all shadow-md flex items-center justify-center gap-2 mt-2"
                      >
                        <CheckCircle className="w-4 h-4" /> Save Vetting Status
                      </button>
                    </form>
                  </div>

                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-32 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center items-center h-[750px]">
              <ShieldAlert className="w-12 h-12 text-slate-300 mb-4" />
              <h4 className="text-sm font-black text-slate-800 uppercase tracking-wide">No Risk Alert Selected</h4>
              <p className="text-xs text-slate-400 mt-2 max-w-xs leading-normal">
                Select an alert from the left to investigate, or click "Trigger Alert" to log a new risk manually.
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}export function ExitSeparation({ sessionUser, triggerToast }: { sessionUser?: any; triggerToast: (msg: string) => void; }) {
  const [employees, setEmployees] = useState<any[]>([]);
  const [exits, setExits] = useState<any[]>([]);
  const [form13Records, setForm13Records] = useState<any[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);

  const userRole = (sessionUser?.role || "Employee").toLowerCase();
  const isSubmitter = Boolean(selectedRecord && (selectedRecord.submittedBy === sessionUser?.id || selectedRecord.name === sessionUser?.name));
  const isManagerOrAbove = !isSubmitter && (
    sessionUser?.role !== "Employee" ||
    userRole.includes("manager") ||
    userRole.includes("owner") ||
    userRole.includes("director") ||
    userRole.includes("hr") ||
    userRole.includes("admin") ||
    userRole.includes("head")
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Manager Decision Form State
  const [managerDecision, setManagerDecision] = useState({
    exitType: "Direct Exit" as "Direct Exit" | "Notice Period",
    noticePeriodDays: 30,
    lastWorkingDay: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    remarks: ""
  });

  // Owner Decision Form State
  const [ownerDecision, setOwnerDecision] = useState({
    remarks: ""
  });

  // HR Decision Form State
  const [hrDecision, setHrDecision] = useState({
    remarks: "",
    assetReturn: false,
    accessRevoke: false,
    handover: false,
    finalSettlement: false
  });

  // FORM-13 State
  const [showForm13, setShowForm13] = useState(false);
  const [form13, setForm13] = useState({
    name: sessionUser?.name || "",
    category: "Employee" as "Employee" | "Associate" | "Vendor",
    resignationDate: new Date().toISOString().split("T")[0],
    lastWorkingDay: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    handoverTo: "",
    department: "",
    exitReason: "",
    assetReturn: false,
    accessRevoke: false,
    handover: false,
    finalSettlement: false,
    dataAudit: false,
    clientTransfer: false,
    ndaReminder: false,
    postExitWatch: false,
    finalSettlementStatus: "Pending Audit",
    exitFeedback: "",
    postExitRisk: "Low"
  });

  useEffect(() => {
    if (sessionUser) {
      setForm13(prev => ({
        ...prev,
        name: sessionUser.name || prev.name,
        category: (sessionUser.category || "Employee") as any,
        department: sessionUser.department || sessionUser.role || prev.department
      }));
    }
  }, [sessionUser]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [empRes, exitRes, form13Res] = await Promise.all([
        fetch("/api/employees"),
        fetch("/api/exits"),
        fetch("/api/reports/form13")
      ]);

      const empData = await empRes.json();
      const exitData = await exitRes.json();
      const form13Data = await form13Res.json();

      if (empData.success) {
        setEmployees(empData.data || []);
        if (sessionUser) {
          const myEmpProfile = (empData.data || []).find((e: any) => e.id === sessionUser.id || e.email === sessionUser.email);
          if (myEmpProfile) {
            setForm13(prev => ({
              ...prev,
              department: myEmpProfile.department || myEmpProfile.role || prev.department
            }));
          }
        }
      }
      if (exitData.success) setExits(exitData.data || []);
      if (form13Data.success) {
        const recordsList = form13Data.data || [];
        setForm13Records(recordsList);
        if (recordsList.length > 0) {
          setSelectedRecord((prevRec: any) => {
            const fresh = prevRec ? recordsList.find((r: any) => r.id === prevRec.id) : null;
            const recordToUse = fresh || recordsList[0];
            // Update decision form values
            setManagerDecision({
              exitType: recordToUse.exitType || "Direct Exit",
              noticePeriodDays: recordToUse.noticePeriodDays || 30,
              lastWorkingDay: recordToUse.lastWorkingDay || new Date().toISOString().split("T")[0],
              remarks: recordToUse.managerRemarks || ""
            });
            setOwnerDecision({
              remarks: recordToUse.ownerRemarks || ""
            });
            setHrDecision({
              remarks: recordToUse.hrRemarks || "",
              assetReturn: recordToUse.assetReturn || false,
              accessRevoke: recordToUse.accessRevoke || false,
              handover: recordToUse.handover || false,
              finalSettlement: recordToUse.finalSettlement || false
            });
            return recordToUse;
          });
        }
      }
    } catch (err) {
      triggerToast("Failed to load exit separation data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSelectRecord = (record: any) => {
    setSelectedRecord(record);
    const emp = employees.find((e: any) => e.id === record.submittedBy || e.name === record.name);
    setSelectedEmployee(emp || { name: record.name, email: record.submittedByUser?.email || "N/A", role: record.submittedByUser?.role || "Staff" });

    // Pre-populate forms
    setManagerDecision({
      exitType: record.exitType || "Direct Exit",
      noticePeriodDays: record.noticePeriodDays || 30,
      lastWorkingDay: record.lastWorkingDay || new Date().toISOString().split("T")[0],
      remarks: record.managerRemarks || ""
    });

    setOwnerDecision({
      remarks: record.ownerRemarks || ""
    });

    setHrDecision({
      remarks: record.hrRemarks || "",
      assetReturn: record.assetReturn || false,
      accessRevoke: record.accessRevoke || false,
      handover: record.handover || false,
      finalSettlement: record.finalSettlement || false
    });
  };

  const handleForm13Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const res = await fetch("/api/reports/form13", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form13)
      });
      const data = await res.json();
      if (data.success) {
        triggerToast("FORM-13 Exit Request Submitted! Notification email sent to Department Reporting Manager.");
        setShowForm13(false);
        setForm13({
          name: sessionUser?.name || "",
          category: "Employee",
          resignationDate: new Date().toISOString().split("T")[0],
          lastWorkingDay: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
          handoverTo: "",
          department: "",
          exitReason: "",
          assetReturn: false,
          accessRevoke: false,
          handover: false,
          finalSettlement: false,
          dataAudit: false,
          clientTransfer: false,
          ndaReminder: false,
          postExitWatch: false,
          finalSettlementStatus: "Pending Audit",
          exitFeedback: "",
          postExitRisk: "Low"
        });
        loadData();
      } else {
        triggerToast("Failed to submit FORM-13: " + data.error);
      }
    } catch (err) {
      triggerToast("Error submitting FORM-13");
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Manager Decision (Stage 1)
  const handleProcessManagerDecision = async (decision: "approve" | "reject") => {
    if (!selectedRecord) return;
    try {
      setSubmitting(true);
      const res = await fetch("/api/reports/form13", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          formId: selectedRecord.id,
          action: "manager_decision",
          decision,
          exitType: managerDecision.exitType,
          noticePeriodDays: managerDecision.noticePeriodDays,
          lastWorkingDay: managerDecision.lastWorkingDay,
          remarks: managerDecision.remarks
        })
      });
      const data = await res.json();
      if (data.success) {
        triggerToast(decision === "approve" ? "Approved by Manager! Forwarded to Owner for Executive Approval & Notification Email Sent to Employee." : "Exit request rejected by Manager & Notification Email Sent to Employee.");
        if (data.data) {
          handleSelectRecord(data.data);
        }
        await loadData();
      } else {
        triggerToast("Error: " + data.error);
      }
    } catch (err) {
      triggerToast("Failed to process manager decision");
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Owner Decision (Stage 2)
  const handleProcessOwnerDecision = async (decision: "approve" | "reject") => {
    if (!selectedRecord) return;
    try {
      setSubmitting(true);
      const res = await fetch("/api/reports/form13", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          formId: selectedRecord.id,
          action: "owner_decision",
          decision,
          remarks: ownerDecision.remarks
        })
      });
      const data = await res.json();
      if (data.success) {
        triggerToast(decision === "approve" ? "Approved by Executive Management! Forwarded to HR for Final Clearance & Notification Email Sent to Employee." : "Exit request rejected by Management & Notification Email Sent to Employee.");
        if (data.data) {
          handleSelectRecord(data.data);
        }
        await loadData();
      } else {
        triggerToast("Error: " + data.error);
      }
    } catch (err) {
      triggerToast("Failed to process owner decision");
    } finally {
      setSubmitting(false);
    }
  };

  // Submit HR Decision (Stage 3)
  const handleProcessHrDecision = async (decision: "approve" | "reject") => {
    if (!selectedRecord) return;
    try {
      setSubmitting(true);
      const res = await fetch("/api/reports/form13", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          formId: selectedRecord.id,
          action: "hr_decision",
          decision,
          remarks: hrDecision.remarks,
          assetReturn: hrDecision.assetReturn,
          accessRevoke: hrDecision.accessRevoke,
          handover: hrDecision.handover,
          finalSettlement: hrDecision.finalSettlement
        })
      });
      const data = await res.json();
      if (data.success) {
        triggerToast(decision === "approve" ? "Exit Clearance Fully Approved & Completed by HR! Notification Email Sent to Employee." : "Exit clearance rejected by HR & Notification Email Sent to Employee.");
        if (data.data) {
          handleSelectRecord(data.data);
        }
        await loadData();
      } else {
        triggerToast("Error: " + data.error);
      }
    } catch (err) {
      triggerToast("Failed to process HR decision");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredRecords = form13Records.filter(rec => 
    rec.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    rec.submittedByUser?.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-fadeIn text-slate-800">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-4 border-slate-200">
        <div>
          <h1 className="text-xl font-black text-slate-800 flex items-center gap-2">
            Exit & Separation Clearance
          </h1>
          <p className="text-xs text-slate-500 mt-1">Multi-Stage Exit Approval Workflow (Manager → Owner → HR) with Automated Email Alerts</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowForm13(true)}
            className="bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg text-xs font-bold text-white transition-all shadow-sm flex items-center gap-1.5"
          >
            <FileText className="w-4 h-4" /> Log FORM-13 (Exit)
          </button>
          <button 
            onClick={loadData} 
            disabled={loading}
            className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 transition duration-150 shrink-0 shadow-sm"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Side: Exit Requests Directory */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-4 flex flex-col h-[750px] shadow-sm">
          <h3 className="text-xs font-black tracking-widest text-[#714B67] uppercase font-mono mb-3">Exit Requests Directory</h3>
          
          <div className="relative mb-3">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input 
              type="text" 
              placeholder="Search by employee name..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-4 py-2 text-xs font-semibold focus:outline-none focus:border-[#714B67] text-slate-800"
            />
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
            {loading ? (
              <div className="text-center py-10 font-bold text-slate-400 text-[10px] animate-pulse">Loading exit requests...</div>
            ) : filteredRecords.length === 0 ? (
              <div className="text-center py-10 text-slate-400 font-bold text-[10px]">No exit clearance requests found</div>
            ) : (
              filteredRecords.map((rec, i) => {
                const isSelected = selectedRecord && selectedRecord.id === rec.id;
                const stage = rec.approvalStage || "Pending Manager";
                
                return (
                  <button
                    key={i}
                    onClick={() => handleSelectRecord(rec)}
                    className={`w-full text-left p-3 rounded-xl border transition-all flex flex-col gap-2 ${
                      isSelected 
                        ? "bg-indigo-50/50 border-indigo-600 shadow-sm" 
                        : "bg-white border-slate-100 hover:border-slate-300 hover:bg-slate-50/50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-slate-800 text-xs truncate flex items-center gap-2">
                        {rec.name}
                      </div>
                      <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                        stage === "Approved" ? "bg-emerald-100 text-emerald-800" :
                        stage === "Rejected" ? "bg-rose-100 text-rose-800" :
                        stage === "Pending Manager" ? "bg-amber-100 text-amber-800" :
                        stage === "Pending Owner" ? "bg-blue-100 text-blue-800" : "bg-purple-100 text-purple-800"
                      }`}>
                        {stage}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-1 text-[10px] text-slate-500 font-mono">
                      <span className="truncate">{rec.submittedByUser?.email || "Staff"}</span>
                      <span className="font-bold text-slate-600">{rec.exitType || "Exit Requested"}</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Side: Exit Clearance Workspace & Multi-Stage Approvals */}
        <div className="lg:col-span-8">
          {selectedRecord ? (
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col h-[750px] overflow-y-auto">
              
              {/* Header Info */}
              <div className="flex justify-between items-start gap-4 pb-4 border-b border-slate-150 shrink-0">
                <div>
                  <h2 className="text-lg font-black text-slate-850 flex items-center gap-2">
                    Exit Clearance — {selectedRecord.name}
                  </h2>
                  <div className="text-slate-500 text-[10px] mt-1.5 flex flex-wrap gap-4 font-mono">
                    <span>Form ID: <strong className="text-slate-700">{selectedRecord.id}</strong></span>
                    <span>Submitter: <strong className="text-slate-700">{selectedRecord.submittedByUser?.email || "Employee"}</strong></span>
                    <span>Dept Manager: <strong className="text-slate-700">{selectedRecord.managerName || "Department Manager"}</strong></span>
                  </div>
                </div>
                
                <div className={`px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-center min-w-32`}>
                  <span className="text-[9px] uppercase font-black tracking-widest text-slate-500 block mb-0.5">Approval Stage</span>
                  <span className={`text-xs font-bold ${
                    selectedRecord.approvalStage === 'Approved' ? 'text-emerald-600' :
                    selectedRecord.approvalStage === 'Rejected' ? 'text-rose-600' : 'text-amber-600'
                  }`}>
                    {selectedRecord.approvalStage || "Pending Manager"}
                  </span>
                </div>
              </div>

              {/* 3-Stage Progress Timeline */}
              <div className="my-6 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-[#714B67] mb-3 font-mono">Multi-Stage Approval Pipeline</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-center text-xs font-bold">
                  
                  {/* Stage 1 */}
                  <div className={`p-3 rounded-lg border flex flex-col items-center justify-center ${
                    selectedRecord.managerApprovalStatus === 'Approved' ? 'bg-emerald-50 border-emerald-300 text-emerald-900' :
                    selectedRecord.managerApprovalStatus === 'Rejected' ? 'bg-rose-50 border-rose-300 text-rose-900' : 'bg-white border-amber-300 text-amber-900'
                  }`}>
                    <span className="text-[9px] uppercase tracking-wider text-slate-500 font-mono">Stage 1: Dept Manager</span>
                    <span className="mt-1 font-extrabold">{selectedRecord.managerApprovalStatus === 'Approved' ? `Approved (${selectedRecord.exitType || 'Direct Exit'})` : selectedRecord.managerApprovalStatus === 'Rejected' ? 'Rejected' : 'Pending Review'}</span>
                    {selectedRecord.exitType === 'Notice Period' && (
                      <span className="text-[10px] text-slate-600 font-normal mt-0.5">Notice: {selectedRecord.noticePeriodDays || 30} days (LWD: {selectedRecord.lastWorkingDay || 'N/A'})</span>
                    )}
                  </div>

                  {/* Stage 2 */}
                  <div className={`p-3 rounded-lg border flex flex-col items-center justify-center ${
                    selectedRecord.ownerApprovalStatus === 'Approved' ? 'bg-emerald-50 border-emerald-300 text-emerald-900' :
                    selectedRecord.ownerApprovalStatus === 'Rejected' ? 'bg-rose-50 border-rose-300 text-rose-900' : 'bg-white border-slate-200 text-slate-600'
                  }`}>
                    <span className="text-[9px] uppercase tracking-wider text-slate-500 font-mono">Stage 2: Owner / Management</span>
                    <span className="mt-1 font-extrabold">{selectedRecord.ownerApprovalStatus === 'Approved' ? 'Executive Approved' : selectedRecord.ownerApprovalStatus === 'Rejected' ? 'Executive Rejected' : 'Pending Stage 1'}</span>
                  </div>

                  {/* Stage 3 */}
                  <div className={`p-3 rounded-lg border flex flex-col items-center justify-center ${
                    selectedRecord.hrApprovalStatus === 'Approved' ? 'bg-emerald-50 border-emerald-300 text-emerald-900' :
                    selectedRecord.hrApprovalStatus === 'Rejected' ? 'bg-rose-50 border-rose-300 text-rose-900' : 'bg-white border-slate-200 text-slate-600'
                  }`}>
                    <span className="text-[9px] uppercase tracking-wider text-slate-500 font-mono">Stage 3: HR Final Clearance</span>
                    <span className="mt-1 font-extrabold">{selectedRecord.hrApprovalStatus === 'Approved' ? 'Fully Cleared' : selectedRecord.hrApprovalStatus === 'Rejected' ? 'Clearance Rejected' : 'Pending Stage 2'}</span>
                  </div>

                </div>
              </div>

              {/* Submitted Exit Application Details Card */}
              <div className="mb-6 bg-slate-50 border border-purple-200/80 rounded-xl p-4 space-y-3 shadow-2xs">
                <div className="flex items-center justify-between border-b border-purple-100 pb-2">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-[#714B67] font-mono flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-purple-700" /> Submitted Exit Application Details
                  </h4>
                  <span className="text-[9px] font-bold bg-purple-100 text-purple-800 px-2 py-0.5 rounded font-mono">
                    {selectedRecord.category || "Employee"}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-semibold text-slate-800">
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200/80 space-y-0.5 shadow-2xs">
                    <span className="text-[9px] font-black uppercase text-slate-400 block font-mono">Employee Name</span>
                    <span className="font-bold text-slate-900 text-xs block truncate">{selectedRecord.name}</span>
                  </div>

                  <div className="bg-white p-2.5 rounded-lg border border-slate-200/80 space-y-0.5 shadow-2xs">
                    <span className="text-[9px] font-black uppercase text-slate-400 block font-mono">Department / Role</span>
                    <span className="font-bold text-slate-900 text-xs block truncate">{selectedRecord.department || selectedRecord.submittedByUser?.role || "Staff"}</span>
                  </div>

                  <div className="bg-white p-2.5 rounded-lg border border-slate-200/80 space-y-0.5 shadow-2xs">
                    <span className="text-[9px] font-black uppercase text-slate-400 block font-mono">Resignation Date</span>
                    <span className="font-bold text-indigo-700 text-xs block">📅 {selectedRecord.resignationDate || "N/A"}</span>
                  </div>

                  <div className="bg-white p-2.5 rounded-lg border border-slate-200/80 space-y-0.5 shadow-2xs">
                    <span className="text-[9px] font-black uppercase text-slate-400 block font-mono">Proposed LWD</span>
                    <span className="font-bold text-purple-700 text-xs block">🗓️ {selectedRecord.lastWorkingDay || "N/A"}</span>
                  </div>

                  <div className="bg-white p-2.5 rounded-lg border border-slate-200/80 space-y-0.5 col-span-2 shadow-2xs">
                    <span className="text-[9px] font-black uppercase text-slate-400 block font-mono">Handover / KT Person</span>
                    <span className="font-bold text-slate-900 text-xs block truncate">👤 {selectedRecord.handoverTo || "Not Specified"}</span>
                  </div>

                  <div className="bg-white p-2.5 rounded-lg border border-slate-200/80 space-y-0.5 col-span-2 shadow-2xs">
                    <span className="text-[9px] font-black uppercase text-slate-400 block font-mono">Personal Contact / Email</span>
                    <span className="font-bold text-slate-900 text-xs block truncate">📞 {selectedRecord.personalMobile || "N/A"} | ✉️ {selectedRecord.personalEmail || selectedRecord.submittedByUser?.email || "N/A"}</span>
                  </div>
                </div>

                <div className="bg-white p-3 rounded-lg border border-slate-200/80 space-y-1 shadow-2xs">
                  <span className="text-[9px] font-black uppercase text-slate-400 block font-mono">Exit Reason & Remarks</span>
                  <p className="text-xs font-bold text-slate-800 leading-normal">{selectedRecord.exitReason || "N/A"}</p>
                  {selectedRecord.exitFeedback && (
                    <p className="text-[11px] font-medium text-slate-600 border-t border-slate-100 pt-1 mt-1">
                      <strong>Feedback:</strong> {selectedRecord.exitFeedback}
                    </p>
                  )}
                </div>
              </div>

              {/* EMPLOYEE STATUS VIEW FOR SUBMITTER */}
              {isSubmitter ? (
                <div className="bg-indigo-50/50 border border-indigo-200 rounded-xl p-5 mb-6">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="w-5 h-5 text-indigo-700" />
                    <h4 className="text-xs font-black uppercase tracking-wider text-indigo-900 font-mono">Your Exit Request Status</h4>
                  </div>
                  <div className="text-xs text-indigo-900 space-y-1">
                    {selectedRecord.approvalStage === "Pending Manager" && (
                      <p>⏳ Your request has been submitted and is currently <strong>Pending Review by your Department Reporting Manager</strong> ({selectedRecord.managerName || "Manager"}). An automated email notification has been sent.</p>
                    )}
                    {selectedRecord.approvalStage === "Pending Owner" && (
                      <p>✅ Approved by Department Manager (<strong>{selectedRecord.exitType || "Direct Exit"}</strong>{selectedRecord.exitType === "Notice Period" ? ` — ${selectedRecord.noticePeriodDays} Days, Last Working Day: ${selectedRecord.lastWorkingDay}` : ""}). Currently <strong>Pending Stage 2 Executive Approval by Owner</strong>.</p>
                    )}
                    {selectedRecord.approvalStage === "Pending HR" && (
                      <p>✅ Executive Approval Granted by Management! Currently <strong>Pending Stage 3 HR Final Clearance & Asset Handovers</strong>.</p>
                    )}
                    {selectedRecord.approvalStage === "Approved" && (
                      <p>🎉 Your Exit & Separation Clearance is <strong>FULLY APPROVED & COMPLETED</strong> by HR Department.</p>
                    )}
                    {selectedRecord.approvalStage === "Rejected" && (
                      <p className="text-rose-700">❌ Your exit request was rejected. Remarks: {selectedRecord.rejectionReason || selectedRecord.managerRemarks || selectedRecord.ownerRemarks || selectedRecord.hrRemarks || "Request rejected."}</p>
                    )}
                  </div>
                </div>
              ) : null}

              {/* STAGE 1: DEPARTMENT REPORTING MANAGER DECISION PANEL */}
              {(isManagerOrAbove && selectedRecord.approvalStage === "Pending Manager") && (
                <div className="bg-amber-50/50 border border-amber-200 rounded-xl p-5 mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <UserCheck className="w-5 h-5 text-amber-700" />
                    <h4 className="text-xs font-black uppercase tracking-wider text-amber-900 font-mono">Stage 1 — Department Reporting Manager Decision</h4>
                  </div>
                  <p className="text-xs text-amber-800 mb-4">
                    As the Department Reporting Manager, please review this exit request and choose whether to grant an <strong>Immediate Direct Exit</strong> or put the employee on a <strong>Notice Period</strong>.
                  </p>

                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <label className={`p-3 rounded-xl border cursor-pointer flex items-center gap-3 transition-all ${
                        managerDecision.exitType === "Direct Exit" ? "bg-white border-indigo-600 shadow-sm" : "bg-white/50 border-slate-200"
                      }`}>
                        <input
                          type="radio"
                          name="exitType"
                          checked={managerDecision.exitType === "Direct Exit"}
                          onChange={() => setManagerDecision({ ...managerDecision, exitType: "Direct Exit" })}
                          className="accent-indigo-600"
                        />
                        <div>
                          <div className="text-xs font-bold text-slate-800">Direct Exit (Immediate)</div>
                          <div className="text-[10px] text-slate-500">Employee leaves immediately without serving notice period.</div>
                        </div>
                      </label>

                      <label className={`p-3 rounded-xl border cursor-pointer flex items-center gap-3 transition-all ${
                        managerDecision.exitType === "Notice Period" ? "bg-white border-indigo-600 shadow-sm" : "bg-white/50 border-slate-200"
                      }`}>
                        <input
                          type="radio"
                          name="exitType"
                          checked={managerDecision.exitType === "Notice Period"}
                          onChange={() => setManagerDecision({ ...managerDecision, exitType: "Notice Period" })}
                          className="accent-indigo-600"
                        />
                        <div>
                          <div className="text-xs font-bold text-slate-800">Notice Period</div>
                          <div className="text-[10px] text-slate-500">Employee serves mandatory notice period days.</div>
                        </div>
                      </label>
                    </div>

                    {managerDecision.exitType === "Notice Period" && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white p-4 rounded-xl border border-slate-200">
                        <div>
                          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">Notice Period Days *</label>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={managerDecision.noticePeriodDays || ""}
                            onChange={e => {
                              const val = e.target.value.replace(/\D/g, "");
                              setManagerDecision({ ...managerDecision, noticePeriodDays: val ? Number(val) : 0 });
                            }}
                            className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs font-bold text-slate-800 mt-1 focus:outline-none focus:border-indigo-500"
                            placeholder="Enter notice period days (e.g. 30)"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">Last Working Day (LWD) *</label>
                          <input
                            type="date"
                            value={managerDecision.lastWorkingDay}
                            onChange={e => setManagerDecision({ ...managerDecision, lastWorkingDay: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs font-bold text-slate-800 mt-1"
                          />
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">Manager Remarks / Feedback</label>
                      <textarea
                        rows={2}
                        value={managerDecision.remarks}
                        onChange={e => setManagerDecision({ ...managerDecision, remarks: e.target.value })}
                        className="w-full bg-white border border-slate-200 rounded p-2.5 text-xs font-medium text-slate-800 mt-1 focus:outline-none focus:border-amber-600"
                        placeholder="Add manager remarks regarding the exit..."
                      />
                    </div>

                    <div className="flex gap-3 pt-2">
                      <button
                        onClick={() => handleProcessManagerDecision("approve")}
                        disabled={submitting}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 disabled:opacity-50"
                      >
                        <CheckCircle className="w-4 h-4" /> Approve & Forward to Owner
                      </button>
                      <button
                        onClick={() => handleProcessManagerDecision("reject")}
                        disabled={submitting}
                        className="px-5 bg-rose-600 hover:bg-rose-700 text-white py-2.5 rounded-lg text-xs font-bold transition-all shadow-sm disabled:opacity-50"
                      >
                        Reject Exit Request
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* STAGE 2: OWNER / EXECUTIVE BOARD DECISION PANEL */}
              {(isManagerOrAbove && selectedRecord.approvalStage === "Pending Owner") && (
                <div className="bg-blue-50/50 border border-blue-200 rounded-xl p-5 mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <ShieldCheck className="w-5 h-5 text-blue-700" />
                    <h4 className="text-xs font-black uppercase tracking-wider text-blue-900 font-mono">Stage 2 — Owner / Executive Management Approval</h4>
                  </div>
                  <p className="text-xs text-blue-800 mb-4">
                    Department Manager has approved this request for <strong>{selectedRecord.exitType || 'Direct Exit'}</strong>. Executive Board approval is required before forwarding to HR.
                  </p>

                  <div className="space-y-4">
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">Executive Remarks</label>
                      <textarea
                        rows={2}
                        value={ownerDecision.remarks}
                        onChange={e => setOwnerDecision({ ...ownerDecision, remarks: e.target.value })}
                        className="w-full bg-white border border-slate-200 rounded p-2.5 text-xs font-medium text-slate-800 mt-1 focus:outline-none focus:border-blue-600"
                        placeholder="Add executive management notes..."
                      />
                    </div>

                    <div className="flex gap-3 pt-2">
                      <button
                        onClick={() => handleProcessOwnerDecision("approve")}
                        disabled={submitting}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 disabled:opacity-50"
                      >
                        <CheckCircle className="w-4 h-4" /> Approve & Forward to HR
                      </button>
                      <button
                        onClick={() => handleProcessOwnerDecision("reject")}
                        disabled={submitting}
                        className="px-5 bg-rose-600 hover:bg-rose-700 text-white py-2.5 rounded-lg text-xs font-bold transition-all shadow-sm disabled:opacity-50"
                      >
                        Reject Exit Request
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* STAGE 3: HR DEPARTMENT FINAL CLEARANCE PANEL */}
              {(isManagerOrAbove && (selectedRecord.approvalStage === "Pending HR" || selectedRecord.approvalStage === "Approved")) && (
                <div className="bg-purple-50/50 border border-purple-200 rounded-xl p-5 mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Building2 className="w-5 h-5 text-purple-700" />
                    <h4 className="text-xs font-black uppercase tracking-wider text-purple-900 font-mono">Stage 3 — HR Department Final Clearance & Handovers</h4>
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-white p-4 rounded-xl border border-slate-200">
                      {[
                        { key: "assetReturn", label: "Company Assets Returned" },
                        { key: "accessRevoke", label: "System & Email Access Revoked" },
                        { key: "handover", label: "Work & Client Handovers Complete" },
                        { key: "finalSettlement", label: "Final Financial Settlement (F&F)" },
                      ].map(({ key, label }) => (
                        <label key={key} className="flex items-center gap-3 p-2.5 rounded-lg border border-slate-150 cursor-pointer hover:bg-purple-50/30">
                          <input
                            type="checkbox"
                            className="accent-purple-600 w-4 h-4"
                            checked={(hrDecision as any)[key]}
                            onChange={e => setHrDecision({ ...hrDecision, [key]: e.target.checked })}
                          />
                          <span className="text-xs font-bold text-slate-700">{label}</span>
                        </label>
                      ))}
                    </div>

                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">HR Final Clearance Remarks</label>
                      <textarea
                        rows={2}
                        value={hrDecision.remarks}
                        onChange={e => setHrDecision({ ...hrDecision, remarks: e.target.value })}
                        className="w-full bg-white border border-slate-200 rounded p-2.5 text-xs font-medium text-slate-800 mt-1 focus:outline-none focus:border-purple-600"
                        placeholder="Document final settlement details or HR clearance notes..."
                      />
                    </div>

                    {selectedRecord.approvalStage === "Pending HR" && (
                      <div className="flex gap-3 pt-2">
                        <button
                          onClick={() => handleProcessHrDecision("approve")}
                          disabled={submitting}
                          className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-2.5 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 disabled:opacity-50"
                        >
                          <CheckCircle className="w-4 h-4" /> Final Approve & Complete Exit
                        </button>
                        <button
                          onClick={() => handleProcessHrDecision("reject")}
                          disabled={submitting}
                          className="px-5 bg-rose-600 hover:bg-rose-700 text-white py-2.5 rounded-lg text-xs font-bold transition-all shadow-sm disabled:opacity-50"
                        >
                          Reject Clearance
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Separation Details */}
              <div className="space-y-6">
                <div>
                  <h4 className="text-[10px] font-black tracking-widest text-[#714B67] uppercase font-mono mb-2 border-b border-slate-100 pb-2">Exit Request Reason & Feedback</h4>
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800">
                    <p><strong>Reason:</strong> {selectedRecord.exitReason || "N/A"}</p>
                    {selectedRecord.exitFeedback && <p className="mt-2 text-slate-600"><strong>Feedback:</strong> {selectedRecord.exitFeedback}</p>}
                  </div>
                </div>
              </div>

            </div>
          ) : (
            <div className="text-center py-32 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center items-center h-[750px]">
              <FileText className="w-12 h-12 text-slate-300 mb-4 animate-bounce" />
              <h4 className="text-sm font-black text-slate-800 uppercase tracking-wide">No Exit Request Selected</h4>
              <p className="text-xs text-slate-400 mt-2 max-w-xs leading-normal">
                Select an exit request from the directory to process manager decisions, executive approvals, and HR clearance.
              </p>
            </div>
          )}
        </div>

      </div>

      {/* FORM-13 Exit Form Modal */}
      {showForm13 && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-slate-100">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-indigo-900 via-indigo-800 to-purple-900 text-white rounded-t-2xl">
              <div>
                <h2 className="text-lg font-black tracking-tight flex items-center gap-2">
                  <FileText className="w-5 h-5 text-indigo-300" /> FORM-13 Exit Request
                </h2>
                <p className="text-xs text-indigo-200 font-medium mt-0.5">Formal employee separation & clearance workflow submission</p>
              </div>
              <button onClick={() => setShowForm13(false)} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all text-white">
                <AlertCircle className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <form onSubmit={handleForm13Submit} className="space-y-6">
                {/* Basic Details & Dates */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] uppercase font-black text-slate-500 tracking-wider">1. Employee Name *</label>
                    <input required className="w-full bg-slate-50 border border-slate-300 focus:border-indigo-600 focus:bg-white rounded-lg p-2.5 text-xs font-bold text-slate-800 mt-1 focus:outline-none transition-all" value={form13.name} onChange={e => setForm13({...form13, name: e.target.value})} placeholder="Full Name" />
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-black text-slate-500 tracking-wider">2. Employment Category *</label>
                    <select required className="w-full bg-slate-50 border border-slate-300 focus:border-indigo-600 focus:bg-white rounded-lg p-2.5 text-xs font-bold text-slate-800 mt-1 focus:outline-none transition-all" value={form13.category} onChange={e => setForm13({...form13, category: e.target.value as any})}>
                      <option value="Employee">Full-time Employee</option>
                      <option value="Associate">Business Associate</option>
                      <option value="Vendor">Vendor / Contractor</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-black text-slate-500 tracking-wider">3. Resignation Date *</label>
                    <input type="date" required className="w-full bg-slate-50 border border-slate-300 focus:border-indigo-600 focus:bg-white rounded-lg p-2.5 text-xs font-bold text-slate-800 mt-1 focus:outline-none transition-all" value={form13.resignationDate} onChange={e => setForm13({...form13, resignationDate: e.target.value})} />
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-black text-slate-500 tracking-wider">4. Proposed Last Working Day (LWD)</label>
                    <input type="date" className="w-full bg-slate-50 border border-slate-300 focus:border-indigo-600 focus:bg-white rounded-lg p-2.5 text-xs font-bold text-slate-800 mt-1 focus:outline-none transition-all" value={form13.lastWorkingDay} onChange={e => setForm13({...form13, lastWorkingDay: e.target.value})} />
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-black text-slate-500 tracking-wider">5. Department</label>
                    <input className="w-full bg-slate-50 border border-slate-300 focus:border-indigo-600 focus:bg-white rounded-lg p-2.5 text-xs font-bold text-slate-800 mt-1 focus:outline-none transition-all" value={form13.department} onChange={e => setForm13({...form13, department: e.target.value})} placeholder="e.g. Operations / Technology / HR" />
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-black text-slate-500 tracking-wider">6. Handover / KT Replacement Person</label>
                    <input className="w-full bg-slate-50 border border-slate-300 focus:border-indigo-600 focus:bg-white rounded-lg p-2.5 text-xs font-bold text-slate-800 mt-1 focus:outline-none transition-all" value={form13.handoverTo} onChange={e => setForm13({...form13, handoverTo: e.target.value})} placeholder="Name of team member receiving KT" />
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-black text-slate-500 tracking-wider">7. Personal Contact Mobile (Post-Exit)</label>
                    <input className="w-full bg-slate-50 border border-slate-300 focus:border-indigo-600 focus:bg-white rounded-lg p-2.5 text-xs font-bold text-slate-800 mt-1 focus:outline-none transition-all" value={(form13 as any).personalMobile || ""} onChange={e => setForm13({...form13, personalMobile: e.target.value} as any)} placeholder="+91 98765 43210" />
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-black text-slate-500 tracking-wider">8. Personal Email (For F&F & Experience Letter)</label>
                    <input type="email" className="w-full bg-slate-50 border border-slate-300 focus:border-indigo-600 focus:bg-white rounded-lg p-2.5 text-xs font-bold text-slate-800 mt-1 focus:outline-none transition-all" value={(form13 as any).personalEmail || ""} onChange={e => setForm13({...form13, personalEmail: e.target.value} as any)} placeholder="personal@gmail.com" />
                  </div>

                  <div className="md:col-span-2">
                    <label className="text-[10px] uppercase font-black text-slate-500 tracking-wider">9. Exit Reason *</label>
                    <textarea required rows={2} className="w-full bg-slate-50 border border-slate-300 focus:border-indigo-600 focus:bg-white rounded-lg p-2.5 text-xs font-bold text-slate-800 mt-1 focus:outline-none resize-none transition-all" value={form13.exitReason} onChange={e => setForm13({...form13, exitReason: e.target.value})} placeholder="Reason for exit (Resignation, Career Switch, Contract End, Personal Reasons, etc.)" />
                  </div>
                </div>

                {/* IT & Compliance Clearance Checklist Section */}
                <div className="bg-indigo-50/50 border border-indigo-200 rounded-xl p-4 space-y-3">
                  <h4 className="text-[10px] font-black tracking-widest text-indigo-900 uppercase pb-2 border-b border-indigo-200/60 flex items-center justify-between">
                    <span>IT & Compliance Clearance Checklist</span>
                    <span className="text-[9px] font-bold text-indigo-600">Verification Items</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {[
                      { key: "accessRevoke", label: "1. System & CRM Access Revoked" },
                      { key: "assetReturn", label: "2. Company Assets Returned" },
                      { key: "dataAudit", label: "3. Data Security Audit Passed" },
                      { key: "clientTransfer", label: "4. Client Handovers Complete" },
                      { key: "ndaReminder", label: "5. Signed NDA & Non-Compete Sent" },
                      { key: "postExitWatch", label: "6. Active Post-Exit Tracking" },
                    ].map(({ key, label }) => (
                      <label key={key} className={`flex items-center gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-all ${
                        (form13 as any)[key] ? "bg-emerald-50 border-emerald-300 text-emerald-800" : "bg-white border-slate-200 text-slate-700 hover:bg-indigo-50/40"
                      }`}>
                        <input
                          type="checkbox"
                          className="accent-indigo-600 w-4 h-4 rounded"
                          checked={(form13 as any)[key]}
                          onChange={e => setForm13({...form13, [key]: e.target.checked})}
                        />
                        <span className="text-[10px] font-extrabold uppercase tracking-wider">{label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="text-[10px] uppercase font-black text-slate-500 tracking-wider">Final Settlement Status (F&F)</label>
                    <select className="w-full bg-slate-50 border border-slate-300 focus:border-indigo-600 focus:bg-white rounded-lg p-2.5 text-xs font-bold text-slate-800 mt-1 focus:outline-none transition-all" value={form13.finalSettlementStatus} onChange={e => setForm13({...form13, finalSettlementStatus: e.target.value})}>
                      <option value="Pending Audit">Pending Audit</option>
                      <option value="On Hold">On Hold (Issues Found)</option>
                      <option value="Completed & Paid">Completed & Paid</option>
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="text-[10px] uppercase font-black text-slate-500 tracking-wider">Exit Feedback (Optional)</label>
                    <textarea rows={2} className="w-full bg-slate-50 border border-slate-300 focus:border-indigo-600 focus:bg-white rounded-lg p-2.5 text-xs font-bold text-slate-800 mt-1 focus:outline-none resize-none transition-all" value={form13.exitFeedback} onChange={e => setForm13({...form13, exitFeedback: e.target.value})} placeholder="Feedback from the exiting person (optional)..." />
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                  <button type="button" onClick={() => setShowForm13(false)} className="px-5 py-2.5 rounded-lg text-xs font-black uppercase text-slate-500 hover:bg-slate-100 transition-all">Cancel</button>
                  <button type="submit" disabled={submitting} className="px-6 py-2.5 rounded-lg text-xs font-black uppercase text-white bg-indigo-600 hover:bg-indigo-700 shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                    <CheckCircle className="w-4 h-4" /> Submit FORM-13 Exit Request
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
