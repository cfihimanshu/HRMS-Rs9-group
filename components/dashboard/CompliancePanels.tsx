import React, { useState, useEffect } from "react";
import { Plus, Search, AlertCircle, ShieldAlert, CheckCircle, RefreshCw, EyeOff, FileText } from "lucide-react";

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
}

export function ExitSeparation({ triggerToast }: { triggerToast: (msg: string) => void; }) {
  const [employees, setEmployees] = useState<any[]>([]);
  const [exits, setExits] = useState<any[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [formState, setFormState] = useState({
    exitReason: "",
    assetsReturned: false,
    accessRevoked: false,
    ndaReminder: false,
    dataAudit: false,
    clientTransfer: false,
    postExitWatch: false,
    finalSettlementStatus: "Pending",
    exitInterviewNotes: ""
  });

  // FORM-13 State
  const [showForm13, setShowForm13] = useState(false);
  const [form13, setForm13] = useState({
    name: "",
    category: "Employee" as "Employee" | "Associate" | "Vendor",
    exitReason: "",
    assetReturn: false,
    accessRevoke: false,
    handover: false,
    finalSettlement: false,
    exitFeedback: "",
    postExitRisk: "Low"
  });

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
        triggerToast("FORM-13 Exit Form Submitted Successfully!");
        setShowForm13(false);
        setForm13({ name: "", category: "Employee", exitReason: "", assetReturn: false, accessRevoke: false, handover: false, finalSettlement: false, exitFeedback: "", postExitRisk: "Low" });
      } else {
        triggerToast("Failed to submit FORM-13: " + data.error);
      }
    } catch (err) {
      triggerToast("Error submitting FORM-13");
    } finally {
      setSubmitting(false);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [empRes, exitRes] = await Promise.all([
        fetch("/api/employees"),
        fetch("/api/exits")
      ]);
      const empData = await empRes.json();
      const exitData = await exitRes.json();
      
      if (empData.success) setEmployees(empData.data);
      if (exitData.success) setExits(exitData.data);

      if (!selectedEmployee && empData.data?.length > 0) {
        handleSelectEmployee(empData.data[0], exitData.data);
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

  const handleSelectEmployee = (employee: any, currentExits: any[] = exits) => {
    setSelectedEmployee(employee);
    const existingExit = currentExits.find((ex: any) => ex.employee?.id === employee.id || ex.employee === employee.id);
    
    if (existingExit) {
      setFormState({
        exitReason: existingExit.exitReason || "",
        assetsReturned: existingExit.assetsReturned || false,
        accessRevoked: existingExit.accessRevoked || false,
        ndaReminder: existingExit.ndaReminder || false,
        dataAudit: existingExit.dataAudit || false,
        clientTransfer: existingExit.clientTransfer || false,
        postExitWatch: existingExit.postExitWatch || false,
        finalSettlementStatus: existingExit.finalSettlementStatus || "Pending",
        exitInterviewNotes: existingExit.exitInterviewNotes || ""
      });
    } else {
      setFormState({
        exitReason: "",
        assetsReturned: false,
        accessRevoked: false,
        ndaReminder: false,
        dataAudit: false,
        clientTransfer: false,
        postExitWatch: false,
        finalSettlementStatus: "Pending",
        exitInterviewNotes: ""
      });
    }
  };

  const handleSaveExit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployee) return;
    if (!formState.exitReason) {
      triggerToast("Please provide an exit reason");
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch("/api/exits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: selectedEmployee.id,
          ...formState
        })
      });
      const data = await res.json();
      if (data.success) {
        triggerToast(`Exit separation checklist for ${selectedEmployee.name} updated!`);
        loadData();
      } else {
        triggerToast("Error: " + data.error);
      }
    } catch (err) {
      triggerToast("Failed to update exit record");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredEmployees = employees.filter(emp => 
    emp.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-fadeIn text-slate-800">
      
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-black text-slate-800">Exit & Separation Clearance</h1>
          <p className="text-xs text-slate-500 mt-1">Manage final checklists for voluntary and probation exit separations</p>
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
        
        {/* Left Side: Employee List */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-4 flex flex-col h-[750px] shadow-sm">
          <h3 className="text-xs font-black tracking-widest text-[#714B67] uppercase font-mono mb-3">Personnel Directory</h3>
          
          <div className="relative mb-3">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input 
              type="text" 
              placeholder="Search employee..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-4 py-2 text-xs font-semibold focus:outline-none focus:border-[#714B67] text-slate-800"
            />
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
            {loading ? (
              <div className="text-center py-10 font-bold text-slate-400 text-[10px] animate-pulse">Loading personnel...</div>
            ) : filteredEmployees.length === 0 ? (
              <div className="text-center py-10 text-slate-400 font-bold text-[10px]">No employees found</div>
            ) : (
              filteredEmployees.map((emp, i) => {
                const isSelected = selectedEmployee && selectedEmployee.id === emp.id;
                const hasExitRecord = exits.some(ex => ex.employee?.id === emp.id || ex.employee === emp.id);
                
                return (
                  <button
                    key={i}
                    onClick={() => handleSelectEmployee(emp)}
                    className={`w-full text-left p-3 rounded-lg border transition-all flex flex-col gap-2 ${
                      isSelected 
                        ? "bg-[#714B67]/5 border-[#714B67] shadow-sm" 
                        : "bg-white border-slate-100 hover:border-slate-350 hover:bg-slate-50/50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-slate-800 text-xs truncate flex items-center gap-2">
                        {emp.name}
                      </div>
                      {hasExitRecord && <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>}
                    </div>
                    <div className="flex items-center justify-between mt-1 text-[10px] text-slate-500 font-mono">
                      <span className="truncate">{emp.role}</span>
                      {hasExitRecord && <span className="font-bold text-rose-600 bg-rose-50 px-1 rounded">Exit Initiated</span>}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Side: Exit Workspace */}
        <div className="lg:col-span-8">
          {selectedEmployee ? (
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col h-[750px]">
              
              {/* Profile Header */}
              <div className="flex justify-between items-start gap-4 pb-4 border-b border-slate-150 shrink-0">
                <div>
                  <h2 className="text-lg font-black text-slate-850 flex items-center gap-2">
                    Exit Clearance — {selectedEmployee.name}
                  </h2>
                  <div className="text-slate-500 text-[10px] mt-1.5 flex flex-wrap gap-4">
                    <span>Email: <strong className="text-slate-700">{selectedEmployee.email}</strong></span>
                    <span>Role: <strong className="text-slate-700">{selectedEmployee.role}</strong></span>
                    <span>Company: <strong className="text-slate-700">{selectedEmployee.companyName || selectedEmployee.companies?.[0]?.name || "N/A"}</strong></span>
                  </div>
                </div>
                
                <div className={`px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-center min-w-28`}>
                  <span className="text-[9px] uppercase font-black tracking-widest text-slate-500 block mb-0.5">Final Settlement</span>
                  <span className={`text-xs font-bold ${formState.finalSettlementStatus === 'Completed' ? 'text-emerald-600' : formState.finalSettlementStatus === 'Hold' ? 'text-rose-600' : 'text-amber-600'}`}>
                    {formState.finalSettlementStatus}
                  </span>
                </div>
              </div>

              {/* Scrollable Form Content */}
              <div className="flex-1 overflow-y-auto py-5 pr-2 scrollbar-thin">
                <form onSubmit={handleSaveExit} className="space-y-8">
                  
                  <div>
                    <h4 className="text-[10px] font-black tracking-widest text-[#714B67] uppercase font-mono mb-4 border-b border-slate-100 pb-2">Separation Details</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="md:col-span-2">
                        <label className="text-[10px] uppercase font-black text-slate-500 font-mono tracking-wider">Resignation / Exit Reason</label>
                        <input className="w-full bg-slate-50 border border-slate-200 rounded p-2.5 text-xs font-bold text-slate-900 mt-1.5 focus:outline-none focus:border-[#714B67]" 
                          placeholder="e.g. Voluntary Resignation, Career Switch..." 
                          value={formState.exitReason} onChange={e => setFormState({...formState, exitReason: e.target.value})} required />
                      </div>
                    </div>
                  </div>

                  {/* IT & Compliance Checklist */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 shadow-sm">
                    <h4 className="text-[10px] font-black tracking-widest text-[#714B67] uppercase font-mono mb-4 border-b border-slate-200 pb-2">IT & Compliance Clearance Checklist</h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <label className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded cursor-pointer hover:border-[#714B67] transition-all">
                        <input type="checkbox" className="w-4 h-4 accent-[#714B67]" checked={formState.accessRevoked} onChange={e => setFormState({...formState, accessRevoked: e.target.checked})} />
                        <span className="text-xs font-bold text-slate-700">1. System & CRM Access Revoked</span>
                      </label>
                      <label className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded cursor-pointer hover:border-[#714B67] transition-all">
                        <input type="checkbox" className="w-4 h-4 accent-[#714B67]" checked={formState.assetsReturned} onChange={e => setFormState({...formState, assetsReturned: e.target.checked})} />
                        <span className="text-xs font-bold text-slate-700">2. Company Assets Returned</span>
                      </label>
                      <label className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded cursor-pointer hover:border-[#714B67] transition-all">
                        <input type="checkbox" className="w-4 h-4 accent-[#714B67]" checked={formState.dataAudit} onChange={e => setFormState({...formState, dataAudit: e.target.checked})} />
                        <span className="text-xs font-bold text-slate-700">3. Final Data Security Audit Passed</span>
                      </label>
                      <label className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded cursor-pointer hover:border-[#714B67] transition-all">
                        <input type="checkbox" className="w-4 h-4 accent-[#714B67]" checked={formState.clientTransfer} onChange={e => setFormState({...formState, clientTransfer: e.target.checked})} />
                        <span className="text-xs font-bold text-slate-700">4. Client Handovers / Transfer Complete</span>
                      </label>
                      <label className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded cursor-pointer hover:border-[#714B67] transition-all">
                        <input type="checkbox" className="w-4 h-4 accent-[#714B67]" checked={formState.ndaReminder} onChange={e => setFormState({...formState, ndaReminder: e.target.checked})} />
                        <span className="text-xs font-bold text-slate-700">5. Signed NDA & Non-Compete Reminder Sent</span>
                      </label>
                      <label className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded cursor-pointer hover:border-[#714B67] transition-all">
                        <input type="checkbox" className="w-4 h-4 accent-[#714B67]" checked={formState.postExitWatch} onChange={e => setFormState({...formState, postExitWatch: e.target.checked})} />
                        <span className="text-xs font-bold text-slate-700">6. Active Post-Exit Tracking / Watchlist</span>
                      </label>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-[10px] font-black tracking-widest text-[#714B67] uppercase font-mono mb-4 border-b border-slate-100 pb-2">Exit Interview & Settlement</h4>
                    
                    <div className="grid grid-cols-1 gap-6">
                      <div>
                        <label className="text-[10px] uppercase font-black text-slate-500 font-mono tracking-wider">Final Settlement Status (F&F)</label>
                        <select className="w-full bg-slate-50 border border-slate-200 rounded p-2.5 text-xs font-bold text-slate-900 mt-1.5 focus:outline-none focus:border-[#714B67]" 
                          value={formState.finalSettlementStatus} onChange={e => setFormState({...formState, finalSettlementStatus: e.target.value})}>
                          <option value="Pending">Pending Audit</option>
                          <option value="Hold">On Hold (Issues Found)</option>
                          <option value="Completed">Completed & Paid</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] uppercase font-black text-slate-500 font-mono tracking-wider">Exit Interview Notes / Feedback</label>
                        <textarea className="w-full bg-slate-50 border border-slate-200 rounded p-3 text-xs font-medium text-slate-800 mt-1.5 h-24 focus:outline-none focus:border-[#714B67] leading-relaxed" 
                          placeholder="Document feedback from the exit interview..." 
                          value={formState.exitInterviewNotes} onChange={e => setFormState({...formState, exitInterviewNotes: e.target.value})} />
                      </div>
                    </div>
                  </div>

                  <button 
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-[#714B67] hover:bg-[#5F3F56] text-white py-3.5 rounded-xl text-xs font-black tracking-widest uppercase transition-all shadow-md flex items-center justify-center gap-2 mt-4"
                  >
                    <CheckCircle className="w-4 h-4" /> Save Exit Checklist
                  </button>

                </form>
              </div>
            </div>
          ) : (
            <div className="text-center py-32 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center items-center h-[750px]">
              <FileText className="w-12 h-12 text-slate-300 mb-4 animate-bounce" />
              <h4 className="text-sm font-black text-slate-800 uppercase tracking-wide">No Employee Selected</h4>
              <p className="text-xs text-slate-400 mt-2 max-w-xs leading-normal">
                Select an employee from the directory to manage their clearance checklist and exit separation.
              </p>
            </div>
          )}
        </div>

      </div>

      {/* FORM-13 Exit Form Modal */}
      {showForm13 && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-rose-50/50 rounded-t-2xl">
              <div>
                <h2 className="text-lg font-black text-rose-900 tracking-tight">FORM-13 Exit / Offboarding</h2>
                <p className="text-xs text-rose-600 font-bold mt-1">Process the formal exit for an Employee, Associate, or Vendor</p>
              </div>
              <button onClick={() => setShowForm13(false)} className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-all text-slate-500 hover:text-rose-500">
                <AlertCircle className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6">
              <form onSubmit={handleForm13Submit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="text-[10px] uppercase font-black text-slate-500 tracking-widest">1. Name *</label>
                    <input required className="w-full bg-white border border-slate-300 focus:border-rose-500 rounded-lg p-2.5 text-xs font-bold text-slate-800 mt-1.5 focus:outline-none" value={form13.name} onChange={e => setForm13({...form13, name: e.target.value})} placeholder="Full Name" />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-black text-slate-500 tracking-widest">2. Category *</label>
                    <select required className="w-full bg-white border border-slate-300 focus:border-rose-500 rounded-lg p-2.5 text-xs font-bold text-slate-800 mt-1.5 focus:outline-none" value={form13.category} onChange={e => setForm13({...form13, category: e.target.value as any})}>
                      <option value="Employee">Employee</option>
                      <option value="Associate">Business Associate</option>
                      <option value="Vendor">Vendor</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-[10px] uppercase font-black text-slate-500 tracking-widest">3. Exit Reason *</label>
                    <textarea required rows={2} className="w-full bg-white border border-slate-300 focus:border-rose-500 rounded-lg p-2.5 text-xs font-bold text-slate-800 mt-1.5 focus:outline-none resize-none" value={form13.exitReason} onChange={e => setForm13({...form13, exitReason: e.target.value})} placeholder="Reason for exit (Resignation, Termination, Contract End, etc.)" />
                  </div>
                </div>

                {/* Checklist Section */}
                <div className="bg-rose-50/40 border border-rose-200 rounded-xl p-5">
                  <h4 className="text-[10px] font-black tracking-widest text-rose-700 uppercase mb-4 pb-2 border-b border-rose-100">Offboarding Checklist</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      { key: "assetReturn", label: "4. Asset Return Completed" },
                      { key: "accessRevoke", label: "5. System Access Revoked" },
                      { key: "handover", label: "6. Work Handover Done" },
                      { key: "finalSettlement", label: "7. Final Settlement Cleared" },
                    ].map(({ key, label }) => (
                      <label key={key} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                        (form13 as any)[key] ? "bg-emerald-50 border-emerald-300 text-emerald-800" : "bg-white border-rose-100 text-slate-600 hover:bg-rose-50"
                      }`}>
                        <input
                          type="checkbox"
                          className="accent-emerald-600 w-4 h-4"
                          checked={(form13 as any)[key]}
                          onChange={e => setForm13({...form13, [key]: e.target.checked})}
                        />
                        <span className="text-[10px] font-black uppercase tracking-wider">{label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="md:col-span-2">
                    <label className="text-[10px] uppercase font-black text-slate-500 tracking-widest">8. Exit Feedback</label>
                    <textarea rows={3} className="w-full bg-white border border-slate-300 focus:border-rose-500 rounded-lg p-2.5 text-xs font-bold text-slate-800 mt-1.5 focus:outline-none resize-none" value={form13.exitFeedback} onChange={e => setForm13({...form13, exitFeedback: e.target.value})} placeholder="Feedback from the exiting person (optional)..." />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-black text-slate-500 tracking-widest">9. Post-Exit Risk *</label>
                    <select className="w-full bg-white border border-slate-300 focus:border-rose-500 rounded-lg p-2.5 text-xs font-bold text-slate-800 mt-1.5 focus:outline-none" value={form13.postExitRisk} onChange={e => setForm13({...form13, postExitRisk: e.target.value})}>
                      <option value="Low">Low — No concern</option>
                      <option value="Medium">Medium — Watch for 30 days</option>
                      <option value="High">High — Immediate escalation required</option>
                    </select>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                  <button type="button" onClick={() => setShowForm13(false)} className="px-5 py-2.5 rounded-lg text-xs font-black uppercase text-slate-500 hover:bg-slate-100 transition-all">Cancel</button>
                  <button type="submit" disabled={submitting} className="px-6 py-2.5 rounded-lg text-xs font-black uppercase text-white bg-rose-600 hover:bg-rose-700 shadow-md transition-all flex items-center gap-2 disabled:opacity-50">
                    <CheckCircle className="w-4 h-4" /> Submit FORM-13
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
