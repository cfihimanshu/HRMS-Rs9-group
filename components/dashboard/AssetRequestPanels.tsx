"use client";
import React, { useState, useEffect } from "react";
import { 
  Laptop, Cpu, Plus, CheckCircle2, AlertCircle, 
  Search, ShieldAlert, Clock, RefreshCw, Send, 
  User, Check, X, ShieldCheck, Truck, MessageSquare
} from "lucide-react";

interface AssetRequestProps {
  sessionUser?: any;
  triggerToast: (msg: string) => void;
}

export function AssetRequestLogs({ sessionUser, triggerToast }: AssetRequestProps) {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [isDark, setIsDark] = useState<boolean>(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // New Request Form
  const [assetType, setAssetType] = useState("Laptop");
  const [priority, setPriority] = useState("Medium");
  const [reason, setReason] = useState("");

  // Action remarks modal/input
  const [remarksMap, setRemarksMap] = useState<Record<string, string>>({});

  const userRole = sessionUser?.role || "Employee";
  const isManager = ["Owner", "Director", "HR Head", "HR Executive", "Department Manager"].includes(userRole);
  const isOwnerOrHR = ["Owner", "Director", "HR Head", "HR Executive"].includes(userRole);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/assets/request");
      const data = await res.json();
      if (data.success) {
        setRequests(data.data || []);
      } else {
        triggerToast("Failed to load asset requests");
      }
    } catch (err) {
      console.error(err);
      triggerToast("Error fetching asset requests");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      triggerToast("Please describe the specifications/reason.");
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch("/api/assets/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          asset_type: assetType,
          priority,
          reason
        })
      });

      const data = await res.json();
      if (data.success) {
        triggerToast("Asset request submitted successfully!");
        setReason("");
        setAssetType("Laptop");
        setPriority("Medium");
        fetchRequests();
      } else {
        triggerToast(data.error || "Failed to submit request");
      }
    } catch (err) {
      console.error(err);
      triggerToast("Error submitting request");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (requestId: number, newStatus: string) => {
    const admin_remarks = remarksMap[requestId] || "";
    try {
      const res = await fetch("/api/assets/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update-status",
          requestId,
          status: newStatus,
          admin_remarks
        })
      });

      const data = await res.json();
      if (data.success) {
        triggerToast(`Request marked as ${newStatus}`);
        setRemarksMap(prev => ({ ...prev, [requestId]: "" }));
        fetchRequests();
      } else {
        triggerToast(data.error || "Failed to update status");
      }
    } catch (err) {
      console.error(err);
      triggerToast("Error updating status");
    }
  };

  const handleRemarksChange = (requestId: number, val: string) => {
    setRemarksMap(prev => ({ ...prev, [requestId]: val }));
  };

  // Filter requests
  const filteredRequests = requests.filter(r => {
    const matchesSearch = 
      (r.employee?.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.asset_type || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.reason || "").toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "" || 
      r.status === statusFilter || 
      (statusFilter === "Pending" && (r.status === "Pending Manager Approval" || r.status === "Pending Owner Approval" || r.status === "Pending"));
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Pending":
      case "Pending Manager Approval":
      case "Pending Owner Approval":
        return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-900/30";
      case "Approved":
        return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-900/30";
      case "Dispatched":
        return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-900/30";
      case "Rejected":
        return "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/20 dark:text-rose-400 dark:border-rose-900/30";
      default:
        return "bg-slate-50 text-slate-700 border-slate-200";
    }
  };

  const getPriorityBadge = (p: string) => {
    switch (p) {
      case "High":
        return "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/30";
      case "Medium":
        return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30";
      default:
        return "bg-slate-50 text-slate-600 border-slate-200 dark:bg-gray-800 dark:text-slate-400 dark:border-gray-700";
    }
  };

  return (
    <div className={`space-y-6 ${isDark ? "text-gray-100" : "text-slate-800"}`}>
      
      {/* Header Panel */}
      <div className={`p-6 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm relative overflow-hidden ${
        isDark ? "bg-gray-900 border-gray-850" : "bg-white border-slate-150"
      }`}>
        <div className="space-y-1 z-10">
          <h1 className="text-lg font-black tracking-tight uppercase flex items-center gap-2">
            <Cpu className="w-5 h-5 text-indigo-500 animate-pulse" /> Asset Procurement & Request Hub
          </h1>
          <p className="text-[11px] text-slate-400 font-medium">
            {isManager 
              ? "Approve, reject, or mark asset requisitions as dispatched for employees and teams."
              : "Raise and track requests for hardware, software license, SIM cards, and accessories."}
          </p>
        </div>
        <button
          onClick={fetchRequests}
          className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-all flex items-center gap-1.5 self-start md:self-auto ${
            isDark ? "bg-gray-800 border-gray-700 hover:bg-gray-750 text-white" : "bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700"
          }`}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh Hub
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left column: Submit request (For employees) */}
        {!isManager && (
          <div className="lg:col-span-4">
            <div className={`p-5 rounded-2xl border shadow-sm space-y-4 ${
              isDark ? "bg-gray-900 border-gray-850" : "bg-white border-slate-150"
            }`}>
              <h2 className="font-black text-xs uppercase tracking-wider text-indigo-600 flex items-center gap-2">
                <Plus className="w-4 h-4 text-indigo-500" /> New Asset Request
              </h2>
              <form onSubmit={handleSubmitRequest} className="space-y-3">
                <div>
                  <label className="block text-[10px] uppercase font-mono font-black text-slate-400 mb-1">Asset Type *</label>
                  <select
                    className={`w-full p-2.5 rounded-lg border text-xs font-bold focus:outline-none focus:border-indigo-500 ${
                      isDark ? "bg-gray-800 border-gray-700 text-white" : "bg-slate-50 border-slate-200 text-slate-800"
                    }`}
                    value={assetType}
                    onChange={(e) => setAssetType(e.target.value)}
                  >
                    <option>Laptop</option>
                    <option>Mobile Phone</option>
                    <option>SIM Card</option>
                    <option>Headset / Accessories</option>
                    <option>ID Card / Lanyard</option>
                    <option>Office Chair / Table</option>
                    <option>Other Accessories</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-mono font-black text-slate-400 mb-1">Priority *</label>
                  <select
                    className={`w-full p-2.5 rounded-lg border text-xs font-bold focus:outline-none focus:border-indigo-500 ${
                      isDark ? "bg-gray-800 border-gray-700 text-white" : "bg-slate-50 border-slate-200 text-slate-800"
                    }`}
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                  >
                    <option>Low</option>
                    <option>Medium</option>
                    <option>High</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-mono font-black text-slate-400 mb-1">Specifications & Justification *</label>
                  <textarea
                    placeholder="e.g. Need a Core i5 laptop with 16GB RAM for recovery field reports, or Airtel Postpaid SIM."
                    rows={4}
                    className={`w-full p-2.5 rounded-lg border text-xs font-bold focus:outline-none focus:border-indigo-500 ${
                      isDark ? "bg-gray-800 border-gray-700 text-white" : "bg-slate-50 border-slate-200 text-slate-800"
                    }`}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-2"
                >
                  <Send className="w-3.5 h-3.5" /> {submitting ? "Submitting..." : "Submit Requisition"}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Right column: Requests list */}
        <div className={isManager ? "lg:col-span-12" : "lg:col-span-8"}>
          <div className={`p-5 rounded-2xl border shadow-sm space-y-4 ${
            isDark ? "bg-gray-900 border-gray-850" : "bg-white border-slate-150"
          }`}>
            
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3 items-center">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Search by asset, details, or employee name..."
                  className={`w-full pl-9 pr-4 py-2.5 rounded-xl border text-xs font-bold focus:outline-none focus:border-indigo-500 ${
                    isDark ? "bg-gray-800 border-gray-700 text-white" : "bg-slate-50 border-slate-200 text-slate-800"
                  }`}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <select
                className={`w-full sm:w-40 p-2.5 rounded-xl border text-xs font-bold focus:outline-none focus:border-indigo-500 ${
                  isDark ? "bg-gray-800 border-gray-700 text-white" : "bg-slate-50 border-slate-200 text-slate-800"
                }`}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">All Statuses</option>
                <option value="Pending">Pending</option>
                <option value="Approved">Approved</option>
                <option value="Dispatched">Dispatched</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>

            {loading ? (
              <div className="text-center py-12 text-slate-400 text-xs font-bold">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" /> Loading asset request registry...
              </div>
            ) : filteredRequests.length === 0 ? (
              <div className="text-center py-16 text-slate-400 text-xs font-bold border border-dashed border-slate-200 dark:border-gray-800 rounded-xl">
                <Laptop className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-gray-700" />
                No asset requests found matching filters.
              </div>
            ) : (
              <div className="space-y-4">
                {filteredRequests.map((req) => (
                  <div 
                    key={req.id} 
                    className={`p-4 rounded-xl border transition-all ${
                      isDark ? "bg-gray-800/40 border-gray-750 hover:bg-gray-800/60" : "bg-slate-50/50 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-2 mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider">{req.asset_type}</span>
                          <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full border ${getPriorityBadge(req.priority)}`}>
                            {req.priority} Priority
                          </span>
                        </div>
                        {isManager && (
                          <div className="text-[10px] text-slate-500 font-bold flex items-center gap-1 mt-1">
                            <User className="w-3 h-3 text-indigo-500" /> {req.employee?.name} ({req.employee?.department || "General"})
                          </div>
                        )}
                        <div className="text-[9px] text-slate-400 mt-0.5 font-bold">
                          Requested: {new Date(req.createdAt).toLocaleDateString()} @ {new Date(req.createdAt).toLocaleTimeString()}
                        </div>
                      </div>
                      
                      <span className={`text-[10px] font-mono font-bold px-3 py-1 rounded-full border ${getStatusBadge(req.status)}`}>
                        ● {req.status}
                      </span>
                    </div>

                    <div className="text-[11px] leading-relaxed font-semibold bg-white dark:bg-gray-900 p-3 rounded-lg border border-slate-150 dark:border-gray-750 text-slate-650 dark:text-slate-350">
                      {req.reason}
                    </div>

                    {req.admin_remarks && (
                      <div className="mt-2 text-[10px] bg-indigo-50/30 dark:bg-indigo-950/10 p-2.5 rounded border border-indigo-100/10 text-indigo-650 dark:text-indigo-400 font-semibold flex items-start gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                        <span><strong>Admin Remarks:</strong> {req.admin_remarks}</span>
                      </div>
                    )}

                    {/* Admin Actions Panel */}
                    {((userRole === "Department Manager" && req.status === "Pending Manager Approval") || 
                      (isOwnerOrHR && 
                       (req.status === "Pending Manager Approval" || req.status === "Pending Owner Approval"))) && (
                      <div className="mt-4 pt-3 border-t border-dashed border-slate-200 dark:border-gray-700 flex flex-col md:flex-row items-center gap-3">
                        <input
                          type="text"
                          placeholder="Approving/Rejecting remarks..."
                          className={`w-full md:flex-1 p-2 rounded-lg border text-[11px] font-bold focus:outline-none focus:border-indigo-500 ${
                            isDark ? "bg-gray-900 border-gray-750 text-white" : "bg-white border-slate-200 text-slate-800"
                          }`}
                          value={remarksMap[req.id] || ""}
                          onChange={(e) => handleRemarksChange(req.id, e.target.value)}
                        />
                        <div className="flex gap-2 w-full md:w-auto shrink-0 justify-end">
                          <button
                            onClick={() => handleUpdateStatus(req.id, "Rejected")}
                            className="flex-1 md:flex-none bg-rose-50 border border-rose-200 text-rose-600 px-3 py-2 rounded-lg text-[10px] font-black hover:bg-rose-100 transition-all flex items-center justify-center gap-1"
                          >
                            <X className="w-3.5 h-3.5" /> Reject
                          </button>
                          <button
                            onClick={() => handleUpdateStatus(req.id, "Approved")}
                            className="flex-1 md:flex-none bg-emerald-50 border border-emerald-200 text-emerald-600 px-3 py-2 rounded-lg text-[10px] font-black hover:bg-emerald-100 transition-all flex items-center justify-center gap-1"
                          >
                            <Check className="w-3.5 h-3.5" /> Approve
                          </button>
                        </div>
                      </div>
                    )}

                    {isOwnerOrHR && req.status === "Approved" && (
                      <div className="mt-4 pt-3 border-t border-dashed border-slate-200 dark:border-gray-700 flex flex-col md:flex-row items-center gap-3">
                        <input
                          type="text"
                          placeholder="Dispatch/Docket details (Optional)..."
                          className={`w-full md:flex-1 p-2 rounded-lg border text-[11px] font-bold focus:outline-none focus:border-indigo-500 ${
                            isDark ? "bg-gray-900 border-gray-750 text-white" : "bg-white border-slate-200 text-slate-800"
                          }`}
                          value={remarksMap[req.id] || ""}
                          onChange={(e) => handleRemarksChange(req.id, e.target.value)}
                        />
                        <button
                          onClick={() => handleUpdateStatus(req.id, "Dispatched")}
                          className="w-full md:w-auto bg-blue-50 border border-blue-200 text-blue-600 px-4 py-2 rounded-lg text-[10px] font-black hover:bg-blue-100 transition-all flex items-center justify-center gap-1.5 shrink-0"
                        >
                          <Truck className="w-3.5 h-3.5" /> Mark as Dispatched
                        </button>
                      </div>
                    )}

                  </div>
                ))}
              </div>
            )}

          </div>
        </div>

      </div>

    </div>
  );
}
