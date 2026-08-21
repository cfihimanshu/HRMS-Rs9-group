import React, { useState, useEffect } from "react";
import { Plus, Search, UserPlus, RefreshCw, AlertCircle, CheckCircle, FileText, Download, LayoutGrid, List, Building2, Phone, Mail, MapPin, Paperclip, Trash2, Edit3, Clock, Calendar, AlertTriangle, Send, ShieldCheck, Check, Eye } from "lucide-react";

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

  const [statusFilter, setStatusFilter] = useState<"All" | "Active" | "Inactive">("All");

  const [formState, setFormState] = useState({
    id: "",
    userId: "",
    name: "",
    email: "",
    mobile: "",
    alternateMobile: "",
    assignedManager: "",
    referralCode: "",
    businessName: "",
    businessType: "",
    territory: "",
    city: "",
    state: "",
    pincode: "",
    address: "",
    businessAddress: "",
    pan: "",
    gstin: "",
    payoutTerms: "",
    accountHolderName: "",
    bankAccountNumber: "",
    ifscCode: "",
    kycDocUrl: "",
    cancelledChequeUrl: "",
    profilePhotoUrl: "",
    status: "Active",
    leadsGenerated: 0,
    conversionRate: 0,
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
      id: assoc.id || "",
      userId: assoc.user?.id || assoc.user || assoc.id || "",
      name: assoc.name || assoc.user?.name || "",
      email: assoc.email || assoc.user?.email || "",
      mobile: assoc.mobile || assoc.user?.mobile || "",
      alternateMobile: assoc.alternateMobile || "",
      assignedManager: assoc.assignedManager || "",
      referralCode: assoc.referralCode || "",
      businessName: assoc.businessName || "",
      businessType: assoc.businessType || "",
      territory: assoc.territory || "",
      city: assoc.city || "",
      state: assoc.state || "",
      pincode: assoc.pincode || "",
      address: assoc.address || "",
      businessAddress: assoc.businessAddress || "",
      pan: assoc.pan || "",
      gstin: assoc.gstin || "",
      payoutTerms: assoc.payoutTerms || "",
      accountHolderName: assoc.accountHolderName || "",
      bankAccountNumber: assoc.bankAccountNumber || "",
      ifscCode: assoc.ifscCode || "",
      kycDocUrl: assoc.kycDocUrl || "",
      cancelledChequeUrl: assoc.cancelledChequeUrl || "",
      profilePhotoUrl: assoc.profilePhotoUrl || "",
      status: assoc.status || "Active",
      leadsGenerated: assoc.leadsGenerated || 0,
      conversionRate: assoc.conversionRate || 0,
      reportingDiscipline: assoc.reportingDiscipline !== undefined ? assoc.reportingDiscipline : 100,
      complaintRatio: assoc.complaintRatio !== undefined ? assoc.complaintRatio : 0,
      clientFeedback: assoc.clientFeedback !== undefined ? assoc.clientFeedback : 100,
      riskScore: assoc.riskScore || 0,
      exitRisk: assoc.exitRisk || "Low",
      flags: assoc.flags || []
    });
  };

  const handleToggleAssociateStatus = async (assoc: any, e: React.MouseEvent) => {
    e.stopPropagation();
    const currentStatus = (assoc.status || "Active").toLowerCase();
    const newStatus = currentStatus === "active" ? "Inactive" : "Active";

    try {
      setSubmitting(true);
      const res = await fetch("/api/associates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: assoc.user?.id || assoc.user || assoc.id,
          id: assoc.id,
          status: newStatus
        })
      });
      const data = await res.json();
      if (data.success) {
        triggerToast(`Associate status updated to ${newStatus}`);
        loadAssociates();
      } else {
        triggerToast("Error: " + data.error);
      }
    } catch (err) {
      triggerToast("Failed to update status");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleFlag = (flag: string) => {
    setFormState(prev => ({
      ...prev,
      flags: prev.flags.includes(flag)
        ? prev.flags.filter(f => f !== flag)
        : [...prev.flags, flag]
    }));
  };

  const handleEditFileUpload = async (file: File, fieldKey: "kycDocUrl" | "cancelledChequeUrl" | "profilePhotoUrl") => {
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (data.success && data.url) {
        setFormState(prev => ({ ...prev, [fieldKey]: data.url }));
        triggerToast("Document uploaded successfully!");
      } else {
        triggerToast("Upload failed: " + (data.error || "Unknown error"));
      }
    } catch (err) {
      triggerToast("Error uploading document");
    }
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
          ...formState,
          userId: formState.userId || selectedAssociate.user?.id || selectedAssociate.id
        })
      });
      const data = await res.json();
      if (data.success) {
        triggerToast("Associate profile updated successfully!");
        loadAssociates();
        setShowEditModal(false);
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

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  const exportAssociatesCSV = () => {
    if (associates.length === 0) {
      triggerToast("No associate records available to export");
      return;
    }

    const headers = [
      "ID", "Associate Name", "Business Name", "Business Type", "Email", "Mobile", "WhatsApp",
      "Territory", "City", "State", "Pincode", "Payout Terms", "PAN", "GSTIN",
      "Account Holder", "Account Number", "IFSC Code", "Leads Generated", "Conversion Rate %",
      "Risk Score", "Exit Risk", "Status", "Registered Date"
    ];

    const rows = associates.map(a => [
      a.id || "",
      `"${(a.name || a.user?.name || "").replace(/"/g, '""')}"`,
      `"${(a.businessName || "").replace(/"/g, '""')}"`,
      `"${(a.businessType || "").replace(/"/g, '""')}"`,
      `"${(a.email || a.user?.email || "").replace(/"/g, '""')}"`,
      `"${(a.mobile || a.user?.mobile || "").replace(/"/g, '""')}"`,
      `"${(a.alternateMobile || "").replace(/"/g, '""')}"`,
      `"${(a.territory || "").replace(/"/g, '""')}"`,
      `"${(a.city || "").replace(/"/g, '""')}"`,
      `"${(a.state || "").replace(/"/g, '""')}"`,
      `"${(a.pincode || "").replace(/"/g, '""')}"`,
      `"${(a.payoutTerms || "").replace(/"/g, '""')}"`,
      `"${(a.pan || "").replace(/"/g, '""')}"`,
      `"${(a.gstin || "").replace(/"/g, '""')}"`,
      `"${(a.accountHolderName || "").replace(/"/g, '""')}"`,
      `"${(a.bankAccountNumber || "").replace(/"/g, '""')}"`,
      `"${(a.ifscCode || "").replace(/"/g, '""')}"`,
      a.leadsGenerated || 0,
      a.conversionRate || 0,
      a.riskScore || 0,
      a.exitRisk || "Low",
      a.status || "active",
      a.createdAt ? new Date(a.createdAt).toLocaleDateString() : ""
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Business_Associates_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    triggerToast("Business Associates report exported successfully!");
  };

  const filteredAssociates = associates.filter(a => {
    const q = searchQuery.toLowerCase().trim();
    const name = (a.name || a.user?.name || "").toLowerCase();
    const email = (a.email || a.user?.email || "").toLowerCase();
    const mobile = (a.mobile || a.user?.mobile || "").toLowerCase();
    const territory = (a.territory || "").toLowerCase();
    const bizName = (a.businessName || "").toLowerCase();
    const code = (a.referralCode || "").toLowerCase();

    const matchesQuery = !q || name.includes(q) || email.includes(q) || mobile.includes(q) || territory.includes(q) || bizName.includes(q) || code.includes(q);
    const aStatus = (a.status || "Active").toLowerCase();
    const matchesStatus = statusFilter === "All" || (statusFilter === "Active" && aStatus === "active") || (statusFilter === "Inactive" && aStatus !== "active");

    return matchesQuery && matchesStatus;
  });

  const toggleExpand = (assoc: any) => {
    if (expandedId === assoc.id) {
      setExpandedId(null);
    } else {
      setExpandedId(assoc.id);
      handleSelectAssociate(assoc);
    }
  };

  // KPI Metrics
  const totalAssociatesCount = associates.length;
  const activeNetworkCount = associates.filter(a => (a.status || "active").toLowerCase() === "active").length;
  const territoriesCount = Array.from(new Set(associates.map(a => a.territory).filter(Boolean))).length;

  return (
    <div className="space-y-6 animate-fadeIn text-slate-800">

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl font-black text-slate-800 flex items-center gap-2">
            Business Associates Dashboard
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">Channel partner network, territory assignments, payouts & risk monitoring</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={exportAssociatesCSV}
            className="px-3 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
          >
            <Download className="w-4 h-4" /> Export Report
          </button>
          <button
            onClick={() => toggleModal("assoc", true)}
            className="bg-[#714B67] hover:bg-[#5F3F56] px-4 py-2 rounded-lg text-xs font-bold text-white transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
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

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div
          onClick={() => setStatusFilter("All")}
          className={`bg-white p-4 rounded-xl border shadow-sm flex flex-col justify-between cursor-pointer transition-all hover:shadow-md ${
            statusFilter === "All" ? "border-[#714B67] ring-2 ring-[#714B67]/20" : "border-slate-200"
          }`}
          title="Click to show all associates"
        >
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 font-mono">Total Associates</span>
          <div className="text-2xl font-black text-[#714B67] mt-2">{totalAssociatesCount}</div>
        </div>

        <div
          onClick={() => setStatusFilter("Active")}
          className={`bg-white p-4 rounded-xl border shadow-sm flex flex-col justify-between cursor-pointer transition-all hover:shadow-md ${
            statusFilter === "Active" ? "border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/20" : "border-slate-200"
          }`}
          title="Click to filter Active Channel associates"
        >
          <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 font-mono flex items-center gap-1">
            ● Active Channel
          </span>
          <div className="text-2xl font-black text-emerald-600 mt-2">{activeNetworkCount}</div>
        </div>

        <div
          onClick={() => setStatusFilter("Inactive")}
          className={`bg-white p-4 rounded-xl border shadow-sm flex flex-col justify-between cursor-pointer transition-all hover:shadow-md ${
            statusFilter === "Inactive" ? "border-slate-500 ring-2 ring-slate-400/20 bg-slate-100/50" : "border-slate-200"
          }`}
          title="Click to filter Inactive associates"
        >
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 font-mono">Inactive Channel</span>
          <div className="text-2xl font-black text-slate-600 mt-2">{associates.length - activeNetworkCount}</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 font-mono">Territories Covered</span>
          <div className="text-2xl font-black text-indigo-600 mt-2">{territoriesCount}</div>
        </div>
      </div>

      {/* Search Toolbar */}
      <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search by associate name, business name, mobile, email, code or territory..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-4 py-2.5 text-xs font-semibold focus:outline-none focus:border-[#714B67] text-slate-800"
          />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs font-bold">
            <button
              onClick={() => setStatusFilter("All")}
              className={`px-3 py-1 rounded-md transition-all ${statusFilter === "All" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-800"}`}
            >
              All ({associates.length})
            </button>
            <button
              onClick={() => setStatusFilter("Active")}
              className={`px-3 py-1 rounded-md transition-all ${statusFilter === "Active" ? "bg-emerald-600 text-white shadow-xs" : "text-emerald-700 hover:bg-emerald-50"}`}
            >
              ● Active ({activeNetworkCount})
            </button>
            <button
              onClick={() => setStatusFilter("Inactive")}
              className={`px-3 py-1 rounded-md transition-all ${statusFilter === "Inactive" ? "bg-slate-700 text-white shadow-xs" : "text-slate-600 hover:bg-slate-200"}`}
            >
              ○ Inactive ({associates.length - activeNetworkCount})
            </button>
          </div>
          <span className="text-xs font-bold text-slate-500 whitespace-nowrap pl-2 border-l border-slate-200">
            Showing {filteredAssociates.length} associate(s)
          </span>
        </div>
      </div>

      {/* DATA TABLE FORMAT */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase font-mono tracking-wider text-slate-500">
                <th className="p-3.5 pl-5">Associate / Firm</th>
                <th className="p-3.5">Contact Info</th>
                <th className="p-3.5">Territory & Location</th>
                <th className="p-3.5">Commercial & Payout</th>
                <th className="p-3.5">Bank & KYC Documents</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 pr-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-150">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400 font-bold animate-pulse">
                    Loading business associates data...
                  </td>
                </tr>
              ) : filteredAssociates.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400 font-bold">
                    No business associate records found matching your search.
                  </td>
                </tr>
              ) : (
                filteredAssociates.map((assoc, idx) => {
                  const assocName = assoc.name || assoc.user?.name || "Business Associate";
                  const email = assoc.email || assoc.user?.email || "N/A";
                  const mobile = assoc.mobile || assoc.user?.mobile || "N/A";
                  const isExpanded = expandedId === assoc.id;

                  return (
                    <React.Fragment key={assoc.id || idx}>
                      <tr
                        onClick={() => toggleExpand(assoc)}
                        className={`hover:bg-slate-50/80 transition-colors cursor-pointer ${isExpanded ? "bg-[#714B67]/5" : ""}`}
                      >
                        {/* Associate & Firm Name */}
                        <td className="p-3.5 pl-5 font-semibold text-slate-800">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-[#714B67]/10 text-[#714B67] flex items-center justify-center font-black text-sm shrink-0 uppercase border border-[#714B67]/20">
                              {assocName.substring(0, 2)}
                            </div>
                            <div>
                              <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                {assocName}
                                {assoc.referralCode && (
                                  <span className="text-[9px] bg-indigo-50 border border-indigo-200 text-indigo-700 px-1.5 py-0.2 rounded font-mono font-bold">
                                    {assoc.referralCode}
                                  </span>
                                )}
                              </div>
                              {assoc.businessName && (
                                <div className="text-[10px] text-slate-500 font-medium">
                                  {assoc.businessName} ({assoc.businessType || 'Firm'})
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Contact Info */}
                        <td className="p-3.5">
                          <div className="space-y-0.5 text-[11px]">
                            <div className="flex items-center gap-1 text-slate-700">
                              <Mail className="w-3 h-3 text-slate-400" />
                              <span>{email}</span>
                            </div>
                            <div className="flex items-center gap-1 text-slate-600 font-mono text-[10px]">
                              <Phone className="w-3 h-3 text-slate-400" />
                              <span>{mobile}</span>
                              {assoc.alternateMobile && <span className="text-slate-400">/ {assoc.alternateMobile}</span>}
                            </div>
                          </div>
                        </td>

                        {/* Territory & Location */}
                        <td className="p-3.5">
                          <div className="font-bold text-slate-800 text-xs flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-[#714B67]" />
                            {assoc.territory || "General"}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            {[assoc.city, assoc.state].filter(Boolean).join(", ") || "N/A"}
                          </div>
                        </td>

                        {/* Commercial & Payout */}
                        <td className="p-3.5">
                          <div className="text-xs font-bold text-slate-700">
                            {assoc.payoutTerms || "Standard Commission"}
                          </div>
                          <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                            PAN: {assoc.pan || 'N/A'} {assoc.gstin ? `| GST: ${assoc.gstin}` : ''}
                          </div>
                        </td>

                        {/* Bank & KYC Documents */}
                        <td className="p-3.5">
                          {assoc.bankAccountNumber ? (
                            <div className="text-[10px] font-mono text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded inline-block">
                              {assoc.bankAccountNumber} ({assoc.ifscCode || 'IFSC'})
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-400">No Bank Info</span>
                          )}
                          <div className="flex items-center gap-2 mt-1">
                            {assoc.kycDocUrl && (
                              <a href={assoc.kycDocUrl} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} className="text-[10px] text-indigo-600 font-bold hover:underline flex items-center gap-0.5">
                                <Paperclip className="w-3 h-3" /> KYC
                              </a>
                            )}
                            {assoc.cancelledChequeUrl && (
                              <a href={assoc.cancelledChequeUrl} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} className="text-[10px] text-indigo-600 font-bold hover:underline flex items-center gap-0.5">
                                <Paperclip className="w-3 h-3" /> Cheque
                              </a>
                            )}
                          </div>
                        </td>

                        {/* Status Column */}
                        <td className="p-3.5">
                          <button
                            onClick={(e) => handleToggleAssociateStatus(assoc, e)}
                            className={`px-2.5 py-1 rounded-full text-[10px] font-black border transition-all cursor-pointer inline-flex items-center gap-1 ${
                              (assoc.status || "active").toLowerCase() === "active"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                                : "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200"
                            }`}
                            title="Click to toggle status (Active / Inactive)"
                          >
                            <span>{(assoc.status || "active").toLowerCase() === "active" ? "● Active" : "○ Inactive"}</span>
                          </button>
                        </td>

                        {/* Actions */}
                        <td className="p-3.5 pr-5 text-right">
                          <div className="flex items-center justify-end gap-2" onClick={e => e.stopPropagation()}>
                            <button
                              onClick={() => toggleExpand(assoc)}
                              className={`px-3 py-1.5 rounded-md text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer border ${isExpanded
                                  ? "bg-[#714B67] text-white border-[#714B67] shadow-sm"
                                  : "bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100"
                                }`}
                              title={isExpanded ? "Hide Details" : "View All Associate Details Below"}
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>{isExpanded ? "Hide Details" : "View"}</span>
                            </button>

                            <button
                              onClick={() => {
                                handleSelectAssociate(assoc);
                                setShowEditModal(true);
                              }}
                              className="px-3 py-1.5 bg-[#714B67]/10 border border-[#714B67]/30 text-[#714B67] hover:bg-[#714B67] hover:text-white rounded-md text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                              title="Edit Associate Profile"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>Edit</span>
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* EXPANDED FULL DETAILS SHEET DIRECTLY BELOW ROW */}
                      {isExpanded && (
                        <tr className="bg-slate-50 border-y border-[#714B67]/20">
                          <td colSpan={7} className="p-5">
                            <div className="space-y-4 animate-fadeIn">

                              {/* Header Title */}
                              <div className="flex justify-between items-center pb-3 border-b border-slate-200">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-xl bg-[#714B67] text-white flex items-center justify-center font-black text-sm shadow-sm uppercase">
                                    {assocName.substring(0, 2)}
                                  </div>
                                  <div>
                                    <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                                      {assocName}
                                      {assoc.businessName && (
                                        <span className="text-xs bg-[#714B67]/10 text-[#714B67] px-2 py-0.5 rounded font-bold">
                                          {assoc.businessName} ({assoc.businessType || 'Firm'})
                                        </span>
                                      )}
                                      {assoc.referralCode && (
                                        <span className="text-xs bg-indigo-50 border border-indigo-200 text-indigo-700 px-2 py-0.5 rounded font-mono font-bold">
                                          Code: {assoc.referralCode}
                                        </span>
                                      )}
                                    </h3>
                                    <p className="text-[11px] text-slate-600 mt-0.5 font-medium">
                                      Assigned Territory: <strong className="text-slate-900">{assoc.territory || "General"}</strong> •
                                      Registered Date: <strong className="text-slate-900">{new Date(assoc.createdAt).toLocaleDateString()}</strong>
                                    </p>
                                  </div>
                                </div>

                                <button
                                  onClick={() => {
                                    handleSelectAssociate(assoc);
                                    setShowEditModal(true);
                                  }}
                                  className="px-3 py-1.5 bg-[#714B67] hover:bg-[#5F3F56] text-white rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                                >
                                  <Edit3 className="w-3.5 h-3.5" /> Edit Details
                                </button>
                              </div>

                              {/* 3 Cards Full Details Grid */}
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                                {/* Card 1: Personal & Contact */}
                                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-2 text-xs">
                                  <div className="font-mono text-[10px] font-black uppercase text-[#714B67] tracking-wider border-b border-slate-100 pb-1 flex justify-between">
                                    <span>Personal & Contact</span>
                                    <span>👤</span>
                                  </div>
                                  <div><span className="text-slate-500 font-bold">Full Name:</span> <strong className="text-slate-900 block mt-0.5">{assocName}</strong></div>
                                  <div><span className="text-slate-500 font-bold">Email ID:</span> <strong className="text-slate-900 block font-mono text-[11px]">{email}</strong></div>
                                  <div><span className="text-slate-500 font-bold">Mobile:</span> <strong className="text-slate-900 font-mono">{mobile}</strong></div>
                                  {assoc.alternateMobile && <div><span className="text-slate-500 font-bold">WhatsApp / Alt:</span> <strong className="text-slate-900 font-mono">{assoc.alternateMobile}</strong></div>}
                                  {assoc.assignedManager && <div><span className="text-slate-500 font-bold">Assigned Manager:</span> <strong className="text-slate-900 block mt-0.5">{assoc.assignedManager}</strong></div>}
                                  <div>
                                    <span className="text-slate-500 font-bold">Account Status:</span>
                                    <span className={`inline-block ml-1.5 text-[10px] px-2 py-0.5 rounded-full font-black border ${ (assoc.status || "active").toLowerCase() === 'inactive' ? 'bg-slate-100 text-slate-600 border-slate-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                                      {(assoc.status || "Active").toUpperCase()}
                                    </span>
                                  </div>
                                </div>

                                {/* Card 2: Business & Location */}
                                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-2 text-xs">
                                  <div className="font-mono text-[10px] font-black uppercase text-[#714B67] tracking-wider border-b border-slate-100 pb-1 flex justify-between">
                                    <span>Business & Territory</span>
                                    <span>🏢</span>
                                  </div>
                                  <div><span className="text-slate-500 font-bold">Business Name:</span> <strong className="text-slate-900 block mt-0.5">{assoc.businessName || "N/A"}</strong></div>
                                  <div><span className="text-slate-500 font-bold">Nature of Business:</span> <strong className="text-slate-900 block">{assoc.businessType || "N/A"}</strong></div>
                                  <div><span className="text-slate-500 font-bold">Assigned Territory:</span> <strong className="text-slate-900 block">{assoc.territory || "General"}</strong></div>
                                  <div><span className="text-slate-500 font-bold">City / State / PIN:</span> <strong className="text-slate-900 block">{[assoc.city, assoc.state, assoc.pincode].filter(Boolean).join(", ") || "N/A"}</strong></div>
                                  {assoc.businessAddress && <div><span className="text-slate-500 font-bold">Business Address:</span> <span className="text-slate-800 block text-[11px] mt-0.5 font-medium leading-normal">{assoc.businessAddress}</span></div>}
                                </div>

                                {/* Card 3: Tax, Banking & KYC Documents */}
                                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-2 text-xs">
                                  <div className="font-mono text-[10px] font-black uppercase text-[#714B67] tracking-wider border-b border-slate-100 pb-1 flex justify-between">
                                    <span>Tax & Banking Docs</span>
                                    <span>🏦</span>
                                  </div>
                                  <div><span className="text-slate-500 font-bold">Payout Terms:</span> <strong className="text-slate-900 block font-mono">{assoc.payoutTerms || "Standard"}</strong></div>
                                  <div><span className="text-slate-500 font-bold">PAN Number:</span> <strong className="text-slate-900 font-mono">{assoc.pan || "N/A"}</strong></div>
                                  {assoc.gstin && <div><span className="text-slate-500 font-bold">GSTIN:</span> <strong className="text-slate-900 font-mono">{assoc.gstin}</strong></div>}
                                  <div><span className="text-slate-500 font-bold">Account Holder:</span> <strong className="text-slate-900 block">{assoc.accountHolderName || assocName}</strong></div>
                                  <div><span className="text-slate-500 font-bold">Bank Account:</span> <strong className="text-slate-900 font-mono block">{assoc.bankAccountNumber || "N/A"}</strong></div>
                                  <div><span className="text-slate-500 font-bold">IFSC Code:</span> <strong className="text-slate-900 font-mono">{assoc.ifscCode || "N/A"}</strong></div>
                                  <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
                                    {assoc.kycDocUrl && (
                                      <a href={assoc.kycDocUrl} target="_blank" rel="noreferrer" className="px-2.5 py-1 bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold rounded text-[10px] hover:underline flex items-center gap-1">
                                        📄 KYC Document
                                      </a>
                                    )}
                                    {assoc.cancelledChequeUrl && (
                                      <a href={assoc.cancelledChequeUrl} target="_blank" rel="noreferrer" className="px-2.5 py-1 bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold rounded text-[10px] hover:underline flex items-center gap-1">
                                        🏦 Cheque Copy
                                      </a>
                                    )}
                                  </div>
                                </div>

                              </div>

                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* EDIT ALL FIELDS MODAL */}
      {showEditModal && selectedAssociate && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] overflow-y-auto p-6 relative">
            <button className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 text-lg font-bold" onClick={() => setShowEditModal(false)}>
              ✕
            </button>
            <div className="mb-6 pb-3 border-b border-slate-100">
              <h3 className="text-lg font-black text-[#714B67] uppercase tracking-tight flex items-center gap-2">
                <span>✏️</span> Edit Business Associate Details
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Update personal information, business profile, tax & banking info, documents, and performance ratings.
              </p>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-6">

              {/* Section 1: Personal & Contact Details */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <h4 className="text-xs font-black uppercase text-[#714B67] tracking-wider font-mono flex items-center gap-1.5">
                  👤 1. Personal & Contact Information
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-[10px] uppercase font-black text-slate-500 font-mono">Full Name *</label>
                    <input className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs font-bold text-slate-900 mt-1 focus:outline-none focus:border-[#714B67]"
                      value={formState.name} onChange={e => setFormState({ ...formState, name: e.target.value })} required />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-black text-slate-500 font-mono">Email ID *</label>
                    <input type="email" className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs font-bold text-slate-900 mt-1 focus:outline-none focus:border-[#714B67]"
                      value={formState.email} onChange={e => setFormState({ ...formState, email: e.target.value })} required />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-black text-slate-500 font-mono">Mobile Number *</label>
                    <input className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs font-bold text-slate-900 mt-1 font-mono focus:outline-none focus:border-[#714B67]"
                      value={formState.mobile} onChange={e => setFormState({ ...formState, mobile: e.target.value })} required />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-black text-slate-500 font-mono">WhatsApp / Alt Phone</label>
                    <input className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs font-bold text-slate-900 mt-1 font-mono focus:outline-none focus:border-[#714B67]"
                      value={formState.alternateMobile} onChange={e => setFormState({ ...formState, alternateMobile: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-black text-slate-500 font-mono">Referral Code</label>
                    <input className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs font-bold text-indigo-700 font-mono mt-1 focus:outline-none focus:border-[#714B67]"
                      value={formState.referralCode} onChange={e => setFormState({ ...formState, referralCode: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-black text-slate-500 font-mono">Assigned Manager</label>
                    <input className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs font-bold text-slate-900 mt-1 focus:outline-none focus:border-[#714B67]"
                      value={formState.assignedManager} onChange={e => setFormState({ ...formState, assignedManager: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-black text-slate-500 font-mono">Account Status</label>
                    <select className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs font-bold text-slate-900 mt-1 focus:outline-none focus:border-[#714B67]"
                      value={formState.status} onChange={e => setFormState({ ...formState, status: e.target.value })}>
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Section 2: Business & Territory */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <h4 className="text-xs font-black uppercase text-[#714B67] tracking-wider font-mono flex items-center gap-1.5">
                  🏢 2. Business & Territory Details
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-[10px] uppercase font-black text-slate-500 font-mono">Business Name</label>
                    <input className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs font-bold text-slate-900 mt-1 focus:outline-none focus:border-[#714B67]"
                      value={formState.businessName} onChange={e => setFormState({ ...formState, businessName: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-black text-slate-500 font-mono">Nature of Business</label>
                    <input className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs font-bold text-slate-900 mt-1 focus:outline-none focus:border-[#714B67]"
                      placeholder="e.g. Proprietorship, Partnership, Agency" value={formState.businessType} onChange={e => setFormState({ ...formState, businessType: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-black text-slate-500 font-mono">Assigned Territory *</label>
                    <input className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs font-bold text-slate-900 mt-1 focus:outline-none focus:border-[#714B67]"
                      value={formState.territory} onChange={e => setFormState({ ...formState, territory: e.target.value })} required />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-black text-slate-500 font-mono">City</label>
                    <input className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs font-bold text-slate-900 mt-1 focus:outline-none focus:border-[#714B67]"
                      value={formState.city} onChange={e => setFormState({ ...formState, city: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-black text-slate-500 font-mono">State</label>
                    <input className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs font-bold text-slate-900 mt-1 focus:outline-none focus:border-[#714B67]"
                      value={formState.state} onChange={e => setFormState({ ...formState, state: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-black text-slate-500 font-mono">PIN Code</label>
                    <input className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs font-bold text-slate-900 mt-1 font-mono focus:outline-none focus:border-[#714B67]"
                      value={formState.pincode} onChange={e => setFormState({ ...formState, pincode: e.target.value })} />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] uppercase font-black text-slate-500 font-mono">Full Business Address</label>
                  <textarea rows={2} className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs font-semibold text-slate-900 mt-1 focus:outline-none focus:border-[#714B67]"
                    value={formState.businessAddress} onChange={e => setFormState({ ...formState, businessAddress: e.target.value })} />
                </div>
              </div>

              {/* Section 3: Tax & Banking Details */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <h4 className="text-xs font-black uppercase text-[#714B67] tracking-wider font-mono flex items-center gap-1.5">
                  🏦 3. Tax & Banking Details
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-[10px] uppercase font-black text-slate-500 font-mono">Payout Terms</label>
                    <input className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs font-bold text-slate-900 mt-1 focus:outline-none focus:border-[#714B67]"
                      placeholder="e.g. 10% Flat Commission" value={formState.payoutTerms} onChange={e => setFormState({ ...formState, payoutTerms: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-black text-slate-500 font-mono">PAN Number</label>
                    <input className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs font-bold text-slate-900 font-mono uppercase mt-1 focus:outline-none focus:border-[#714B67]"
                      value={formState.pan} onChange={e => setFormState({ ...formState, pan: e.target.value.toUpperCase() })} />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-black text-slate-500 font-mono">GSTIN Number</label>
                    <input className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs font-bold text-slate-900 font-mono uppercase mt-1 focus:outline-none focus:border-[#714B67]"
                      value={formState.gstin} onChange={e => setFormState({ ...formState, gstin: e.target.value.toUpperCase() })} />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-black text-slate-500 font-mono">Account Holder Name</label>
                    <input className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs font-bold text-slate-900 mt-1 focus:outline-none focus:border-[#714B67]"
                      value={formState.accountHolderName} onChange={e => setFormState({ ...formState, accountHolderName: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-black text-slate-500 font-mono">Bank Account Number</label>
                    <input className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs font-bold text-slate-900 font-mono mt-1 focus:outline-none focus:border-[#714B67]"
                      value={formState.bankAccountNumber} onChange={e => setFormState({ ...formState, bankAccountNumber: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-black text-slate-500 font-mono">IFSC Code</label>
                    <input className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs font-bold text-slate-900 font-mono uppercase mt-1 focus:outline-none focus:border-[#714B67]"
                      value={formState.ifscCode} onChange={e => setFormState({ ...formState, ifscCode: e.target.value.toUpperCase() })} />
                  </div>
                </div>
              </div>

              {/* Section 4: Document Links & Uploads */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <h4 className="text-xs font-black uppercase text-[#714B67] tracking-wider font-mono flex items-center gap-1.5">
                  📄 4. Documents & Photo Uploads
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                  {/* Profile Photo Upload */}
                  <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-2">
                    <div>
                      <label className="text-[10px] uppercase font-black text-slate-500 font-mono block">Profile Photo</label>
                      {formState.profilePhotoUrl ? (
                        <div className="flex items-center gap-2 mt-1.5">
                          <img src={formState.profilePhotoUrl} alt="Profile" className="w-8 h-8 rounded-full object-cover border border-slate-300 shrink-0" />
                          <a href={formState.profilePhotoUrl} target="_blank" rel="noreferrer" className="text-[11px] text-emerald-700 font-bold hover:underline truncate">
                            ✓ Photo Uploaded
                          </a>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400 font-medium block mt-1">No photo uploaded</span>
                      )}
                    </div>
                    <label className="w-full py-2 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 rounded-lg text-xs font-bold text-center cursor-pointer transition-all flex items-center justify-center gap-1.5 mt-2">
                      <Paperclip className="w-3.5 h-3.5" />
                      <span>{formState.profilePhotoUrl ? "Change Photo" : "Upload Photo"}</span>
                      <input type="file" className="hidden" accept="image/*" onChange={e => e.target.files?.[0] && handleEditFileUpload(e.target.files[0], "profilePhotoUrl")} />
                    </label>
                  </div>

                  {/* KYC Document Upload */}
                  <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-2">
                    <div>
                      <label className="text-[10px] uppercase font-black text-slate-500 font-mono block">KYC Document (Aadhaar / ID)</label>
                      {formState.kycDocUrl ? (
                        <a href={formState.kycDocUrl} target="_blank" rel="noreferrer" className="text-[11px] text-emerald-700 font-bold hover:underline flex items-center gap-1 mt-1.5">
                          ✓ KYC File Uploaded
                        </a>
                      ) : (
                        <span className="text-[11px] text-slate-400 font-medium block mt-1">No document uploaded</span>
                      )}
                    </div>
                    <label className="w-full py-2 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 rounded-lg text-xs font-bold text-center cursor-pointer transition-all flex items-center justify-center gap-1.5 mt-2">
                      <Paperclip className="w-3.5 h-3.5" />
                      <span>{formState.kycDocUrl ? "Change KYC Doc" : "Upload KYC Doc"}</span>
                      <input type="file" className="hidden" accept="image/*,application/pdf" onChange={e => e.target.files?.[0] && handleEditFileUpload(e.target.files[0], "kycDocUrl")} />
                    </label>
                  </div>

                  {/* Cancelled Cheque Upload */}
                  <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-2">
                    <div>
                      <label className="text-[10px] uppercase font-black text-slate-500 font-mono block">Cancelled Cheque Copy</label>
                      {formState.cancelledChequeUrl ? (
                        <a href={formState.cancelledChequeUrl} target="_blank" rel="noreferrer" className="text-[11px] text-emerald-700 font-bold hover:underline flex items-center gap-1 mt-1.5">
                          ✓ Cheque Copy Uploaded
                        </a>
                      ) : (
                        <span className="text-[11px] text-slate-400 font-medium block mt-1">No cheque uploaded</span>
                      )}
                    </div>
                    <label className="w-full py-2 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 rounded-lg text-xs font-bold text-center cursor-pointer transition-all flex items-center justify-center gap-1.5 mt-2">
                      <Paperclip className="w-3.5 h-3.5" />
                      <span>{formState.cancelledChequeUrl ? "Change Cheque" : "Upload Cheque"}</span>
                      <input type="file" className="hidden" accept="image/*,application/pdf" onChange={e => e.target.files?.[0] && handleEditFileUpload(e.target.files[0], "cancelledChequeUrl")} />
                    </label>
                  </div>

                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-3">
                <button type="button" onClick={() => setShowEditModal(false)} className="px-5 py-2.5 rounded-lg border border-slate-300 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-all">Cancel</button>
                <button type="submit" disabled={submitting} className="px-6 py-2.5 bg-[#714B67] hover:bg-[#5F3F56] rounded-lg text-xs font-black text-white transition-all shadow-md cursor-pointer flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4" />
                  <span>Save All Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
          className={`bg-white p-4 rounded-xl border transition-all cursor-pointer hover:border-indigo-300 hover:shadow-md flex items-center justify-between ${categoryFilter === "All" && agreementFilter === "All" && !searchQuery ? "border-indigo-400 ring-2 ring-indigo-400/20 bg-indigo-50/20" : "border-slate-200 shadow-2xs"
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
          className={`bg-white p-4 rounded-xl border transition-all cursor-pointer hover:border-emerald-300 hover:shadow-md flex items-center justify-between ${agreementFilter === "WithAgreement" ? "border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/40" : "border-slate-200 shadow-2xs"
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
          className={`bg-white p-4 rounded-xl border transition-all cursor-pointer hover:border-purple-300 hover:shadow-md flex items-center justify-between ${categoryFilter !== "All" ? "border-purple-500 ring-2 ring-purple-500/20 bg-purple-50/40" : "border-slate-200 shadow-2xs"
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
                className={`w-full p-3 rounded-xl border text-left font-bold text-xs flex items-center justify-between transition-all cursor-pointer ${categoryFilter === "All"
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
                      className={`w-full p-3 rounded-xl border text-left font-bold text-xs flex items-center justify-between transition-all cursor-pointer ${isSelected
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
        setStatusFilter("All");
        setExpiryFilter("All");
        setRiskFilter("All");
        setSearchQuery("");
        if (data.data) {
          setSelectedFranchise(data.data);
        }
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

  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [riskFilter, setRiskFilter] = useState<string>("All");
  const [expiryFilter, setExpiryFilter] = useState<string>("All");

  const getAgreementExpiryInfo = (endDateStr?: string) => {
    if (!endDateStr) return { status: "No Date", label: "No Date Set", daysLeft: null, color: "slate" };

    let end: Date | null = null;
    const str = endDateStr.trim();

    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
      const [y, m, d] = str.split("-").map(Number);
      end = new Date(y, m - 1, d);
    } else if (/^\d{1,2}[\/-]\d{1,2}[\/-]\d{4}$/.test(str)) {
      const parts = str.split(/[\/-]/).map(Number);
      end = new Date(parts[2], parts[1] - 1, parts[0]);
    } else {
      end = new Date(str);
    }

    if (!end || isNaN(end.getTime())) return { status: "Invalid", label: "Invalid Date", daysLeft: null, color: "slate" };

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);

    const diffTime = end.getTime() - today.getTime();
    const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (daysLeft < 0) {
      return { status: "Expired", label: `Expired (${Math.abs(daysLeft)}d ago)`, daysLeft, color: "rose" };
    } else if (daysLeft <= 30) {
      return { status: "Expiring Soon", label: `Expiring (${daysLeft}d left)`, daysLeft, color: "amber" };
    } else {
      return { status: "Valid", label: `Valid (${daysLeft}d left)`, daysLeft, color: "emerald" };
    }
  };

  const handleSendRenewalNotice = async (franchise: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const partnerName = franchise.partnerName || franchise.contactPerson || "Partner";
    const email = franchise.email;
    const mobile = franchise.mobile || "N/A";
    const expiryInfo = getAgreementExpiryInfo(franchise.agreementEndDate);

    const reminderMsg = `Official Contract Renewal Reminder:\nDear ${partnerName},\nYour franchise agreement for territory (${franchise.territory || 'N/A'}) ${expiryInfo.status === 'Expired' ? 'has EXPIRED' : `is EXPIRING in ${expiryInfo.daysLeft} days`}.\nPlease initiate the renewal documentation at the earliest.\nContact: ${email || 'N/A'} | ${mobile}`;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(reminderMsg);
    }

    if (!email || !email.includes("@")) {
      triggerToast(`📋 Draft copied to clipboard! (Note: ${partnerName} has no valid email address set)`);
      return;
    }

    try {
      triggerToast(`Sending renewal email to ${email}...`);
      const res = await fetch("/api/reports/form11/send-reminder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          franchiseId: franchise.id,
          email: franchise.email,
          partnerName: franchise.partnerName,
          territory: franchise.territory,
          agreementEndDate: franchise.agreementEndDate
        })
      });
      const data = await res.json();
      if (data.success) {
        triggerToast(`📧 Renewal Reminder email sent successfully to ${email}!`);
      } else {
        triggerToast(`📋 Draft copied to clipboard! (${data.error || 'Email could not be dispatched'})`);
      }
    } catch (err) {
      triggerToast(`📋 Renewal Reminder draft copied to clipboard for ${partnerName}!`);
    }
  };

  const getTerritoryConflict = (inputTerritory: string, inputPincode: string, currentId: string | null) => {
    const normTerritory = inputTerritory.trim().toLowerCase();
    const normPincode = inputPincode.trim();
    if (!normTerritory && !normPincode) return null;

    const match = franchises.find(f => {
      if (currentId && f.id === currentId) return false;
      if (f.status === "Inactive") return false;
      const fTerr = (f.territory || "").trim().toLowerCase();
      const fPin = (f.pincode || "").trim();
      return (normTerritory && fTerr && normTerritory === fTerr) || (normPincode && fPin && normPincode === fPin);
    });

    if (match) {
      return {
        partnerName: match.partnerName || match.contactPerson || "Existing Partner",
        territory: match.territory,
        pincode: match.pincode
      };
    }
    return null;
  };

  const handleToggleStatus = async (franchise: any, e: React.MouseEvent) => {
    e.stopPropagation();
    const newStatus = franchise.status === "Active" ? "Pending" : "Active";
    try {
      setSubmitting(true);
      const res = await fetch("/api/reports/form11", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: franchise.id, status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        triggerToast(`Partner status updated to ${newStatus}`);
        loadFranchises();
      } else {
        triggerToast("Failed to update status: " + data.error);
      }
    } catch (err) {
      triggerToast("Error updating partner status");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredFranchises = franchises.filter(f => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      (f.partnerName || f.user?.name || "").toLowerCase().includes(q) ||
      (f.contactPerson || "").toLowerCase().includes(q) ||
      (f.email || "").toLowerCase().includes(q) ||
      (f.mobile || "").toLowerCase().includes(q) ||
      (f.territory || f.territory?.name || "").toLowerCase().includes(q) ||
      (f.brandProject || "").toLowerCase().includes(q) ||
      (f.state || "").toLowerCase().includes(q);

    const matchesStatus = statusFilter === "All" || (f.status || "Pending").toLowerCase() === statusFilter.toLowerCase();
    const matchesRisk = riskFilter === "All" || (f.riskLevel || "Low").toLowerCase() === riskFilter.toLowerCase();

    const expInfo = getAgreementExpiryInfo(f.agreementEndDate);
    const matchesExpiry = expiryFilter === "All" ||
      (expiryFilter === "ExpiringSoon" && expInfo.status === "Expiring Soon") ||
      (expiryFilter === "Expired" && expInfo.status === "Expired") ||
      (expiryFilter === "Valid" && expInfo.status === "Valid");

    return matchesSearch && matchesStatus && matchesRisk && matchesExpiry;
  });

  const totalPartnersCount = franchises.length;
  const activePartnersCount = franchises.filter(f => f.status === "Active").length;
  const pendingPartnersCount = franchises.filter(f => !f.status || f.status === "Pending").length;
  const expiringOrExpiredCount = franchises.filter(f => {
    const status = getAgreementExpiryInfo(f.agreementEndDate).status;
    return status === "Expired" || status === "Expiring Soon";
  }).length;
  const territoriesCount = Array.from(new Set(franchises.map(f => (f.territory || "").trim()).filter(Boolean))).length;

  return (
    <div className="space-y-8 animate-fadeIn text-slate-800">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-800">Franchise & Territory Partners</h1>
          <p className="text-xs text-slate-500 mt-1">Directory of registered franchise partners & territory agreements</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
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

      {/* Summary KPI Widgets Header */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div
          onClick={() => { setStatusFilter("All"); setExpiryFilter("All"); setRiskFilter("All"); }}
          className={`bg-white border rounded-xl p-3.5 shadow-xs cursor-pointer transition-all hover:shadow-md ${statusFilter === "All" && expiryFilter === "All" && riskFilter === "All" ? "border-slate-400 ring-2 ring-slate-400/20 bg-slate-50/50" : "border-slate-200"
            }`}
        >
          <div className="text-[10px] font-black uppercase text-slate-400 font-mono">Total Partners</div>
          <div className="text-xl font-black text-slate-900 mt-1">{totalPartnersCount}</div>
          <div className="text-[10px] text-slate-500 mt-0.5 font-medium">Click to view all</div>
        </div>

        <div
          onClick={() => { setStatusFilter("Active"); setExpiryFilter("All"); }}
          className={`bg-white border rounded-xl p-3.5 shadow-xs cursor-pointer transition-all hover:shadow-md ${statusFilter === "Active" ? "border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/30" : "border-slate-200"
            }`}
        >
          <div className="text-[10px] font-black uppercase text-emerald-600 font-mono">Active Partners</div>
          <div className="text-xl font-black text-emerald-700 mt-1">{activePartnersCount}</div>
          <div className="text-[10px] text-emerald-600/80 mt-0.5 font-medium">Verified Accounts</div>
        </div>

        <div
          onClick={() => { setStatusFilter("Pending"); setExpiryFilter("All"); }}
          className={`bg-white border rounded-xl p-3.5 shadow-xs cursor-pointer transition-all hover:shadow-md ${statusFilter === "Pending" ? "border-amber-500 ring-2 ring-amber-500/20 bg-amber-50/30" : "border-slate-200"
            }`}
        >
          <div className="text-[10px] font-black uppercase text-amber-600 font-mono">Pending Approval</div>
          <div className="text-xl font-black text-amber-700 mt-1">{pendingPartnersCount}</div>
          <div className="text-[10px] text-amber-600/80 mt-0.5 font-medium">Awaiting Clearance</div>
        </div>

        <div
          onClick={() => { setExpiryFilter("ExpiringSoon"); setStatusFilter("All"); }}
          className={`bg-white border rounded-xl p-3.5 shadow-xs cursor-pointer transition-all hover:shadow-md ${expiryFilter === "ExpiringSoon" || expiryFilter === "Expired" ? "border-rose-500 ring-2 ring-rose-500/20 bg-rose-50/30" : "border-slate-200"
            }`}
        >
          <div className="text-[10px] font-black uppercase text-rose-600 font-mono flex items-center gap-1">
            <Clock className="w-3 h-3" /> Expiry Alert
          </div>
          <div className="text-xl font-black text-rose-700 mt-1">{expiringOrExpiredCount}</div>
          <div className="text-[10px] text-rose-600/80 mt-0.5 font-medium">Expiring / Expired</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs">
          <div className="text-[10px] font-black uppercase text-indigo-600 font-mono">Territories</div>
          <div className="text-xl font-black text-indigo-700 mt-1">{territoriesCount}</div>
          <div className="text-[10px] text-indigo-600/80 mt-0.5 font-medium">Cities / Regions</div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-3 flex flex-wrap gap-3 items-center justify-between">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by Firm, Contact, Mobile or Territory..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="bg-white border border-slate-200 rounded-lg pl-9 pr-4 py-2 text-xs font-semibold focus:outline-none focus:border-[#714B67] text-slate-800 w-full shadow-2xs"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none focus:border-[#714B67] text-slate-700 cursor-pointer shadow-2xs"
          >
            <option value="All">All Statuses</option>
            <option value="Active">Active Only</option>
            <option value="Pending">Pending Only</option>
          </select>

          {/* Agreement Expiry Filter */}
          <select
            value={expiryFilter}
            onChange={e => setExpiryFilter(e.target.value)}
            className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none focus:border-[#714B67] text-slate-700 cursor-pointer shadow-2xs"
          >
            <option value="All">All Agreements</option>
            <option value="ExpiringSoon">⏳ Expiring Soon (&lt; 30 days)</option>
            <option value="Expired">🚨 Expired Agreements</option>
            <option value="Valid">✅ Valid Agreements</option>
          </select>

          {/* Risk Level Filter */}
          <select
            value={riskFilter}
            onChange={e => setRiskFilter(e.target.value)}
            className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none focus:border-[#714B67] text-slate-700 cursor-pointer shadow-2xs"
          >
            <option value="All">All Risk Levels</option>
            <option value="Low">Low Risk</option>
            <option value="Medium">Medium Risk</option>
            <option value="High">High Risk</option>
          </select>
        </div>

        {(searchQuery || statusFilter !== "All" || riskFilter !== "All" || expiryFilter !== "All") && (
          <button
            onClick={() => {
              setSearchQuery("");
              setStatusFilter("All");
              setRiskFilter("All");
              setExpiryFilter("All");
            }}
            className="text-xs text-rose-600 font-bold hover:underline px-2 py-1"
          >
            Clear Filters
          </button>
        )}
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
                <th className="py-3.5 px-4">Territory / Location</th>
                <th className="py-3.5 px-4">Brand / Project</th>
                <th className="py-3.5 px-4">Agreement & Expiry</th>
                <th className="py-3.5 px-4 text-center">Docs</th>
                <th className="py-3.5 px-4">Risk Level</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-150 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={10} className="text-center py-12 text-slate-400 font-bold text-xs animate-pulse">
                    Loading franchise partners...
                  </td>
                </tr>
              ) : filteredFranchises.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-12 text-slate-400 font-bold text-xs">
                    No franchise partners found matching selected filters.
                  </td>
                </tr>
              ) : (
                filteredFranchises.map((franchise, i) => {
                  const isSelected = selectedFranchise && selectedFranchise.id === franchise.id;

                  return (
                    <tr
                      key={franchise.id || i}
                      onClick={() => handleSelectFranchise(franchise)}
                      className={`cursor-pointer transition-all ${isSelected ? "bg-[#714B67]/5 font-medium" : "hover:bg-slate-50/80"
                        }`}
                    >
                      {/* 1. Business / Firm Name */}
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        {franchise.partnerName || franchise.user?.name || "Unknown Partner"}
                        {franchise.address && (
                          <span className="block text-[10px] font-normal text-slate-500 truncate max-w-[200px]">
                            {franchise.address}
                          </span>
                        )}
                      </td>

                      {/* 2. Contact Person */}
                      <td className="py-3.5 px-4 text-slate-700 font-semibold">
                        {franchise.contactPerson || "N/A"}
                      </td>

                      {/* 3. Email & Mobile */}
                      <td className="py-3.5 px-4 text-slate-600">
                        <span className="block font-medium text-slate-800">{franchise.email || "N/A"}</span>
                        <span className="text-[10px] text-slate-500 font-mono">{franchise.mobile || "N/A"}</span>
                      </td>

                      {/* 4. Territory & Location */}
                      <td className="py-3.5 px-4 text-slate-800 font-semibold">
                        {franchise.territory || "N/A"}
                        {franchise.state && (
                          <span className="block text-[10px] font-mono text-slate-400 uppercase">
                            {franchise.state} {franchise.pincode ? `(${franchise.pincode})` : ""}
                          </span>
                        )}
                      </td>

                      {/* 5. Brand / Project */}
                      <td className="py-3.5 px-4 font-bold text-indigo-700">
                        {franchise.brandProject || "N/A"}
                      </td>

                      {/* 6. Agreement & Expiry */}
                      <td className="py-3.5 px-4 text-slate-800">
                        {(() => {
                          const exp = getAgreementExpiryInfo(franchise.agreementEndDate);
                          return (
                            <div>
                              <span className={`px-2 py-0.5 rounded-md text-[10px] font-black border inline-flex items-center gap-1 ${exp.color === "rose" ? "bg-rose-50 text-rose-700 border-rose-200" :
                                  exp.color === "amber" ? "bg-amber-50 text-amber-700 border-amber-200" :
                                    exp.color === "emerald" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-600 border-slate-200"
                                }`}>
                                <Clock className="w-2.5 h-2.5" /> {exp.label}
                              </span>
                              {franchise.agreementEndDate ? (
                                <span className="block text-[10px] font-mono text-slate-400 mt-0.5">
                                  End: {franchise.agreementEndDate}
                                </span>
                              ) : (
                                <span className="block text-[10px] text-slate-400 italic mt-0.5">No End Date</span>
                              )}
                            </div>
                          );
                        })()}
                      </td>

                      {/* 7. Documents Quick Links */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5" onClick={e => e.stopPropagation()}>
                          {franchise.agreementUrl ? (
                            <a
                              href={franchise.agreementUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2 py-0.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded text-[10px] font-bold border border-indigo-200 flex items-center gap-1"
                              title="View Agreement PDF"
                            >
                              <FileText className="w-3 h-3" /> Agreement
                            </a>
                          ) : null}
                          {franchise.kycDocUrl ? (
                            <a
                              href={franchise.kycDocUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2 py-0.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded text-[10px] font-bold border border-emerald-200 flex items-center gap-1"
                              title="View KYC Document"
                            >
                              <Paperclip className="w-3 h-3" /> KYC
                            </a>
                          ) : null}
                          {!franchise.agreementUrl && !franchise.kycDocUrl && (
                            <span className="text-[10px] text-slate-400 italic">None</span>
                          )}
                        </div>
                      </td>

                      {/* 8. Risk Level */}
                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${franchise.riskLevel === "High" ? "bg-rose-50 text-rose-700 border-rose-200" : franchise.riskLevel === "Medium" ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"
                          }`}>
                          {franchise.riskLevel || "Low"}
                        </span>
                      </td>

                      {/* 9. Status (with 1-click status toggle) */}
                      <td className="py-3.5 px-4">
                        <button
                          onClick={(e) => handleToggleStatus(franchise, e)}
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border transition-all cursor-pointer ${franchise.status === "Active" ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100" : "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"
                            }`}
                          title="Click to toggle status (Active / Pending)"
                        >
                          {franchise.status || "Pending"}
                        </button>
                      </td>

                      {/* 10. Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5" onClick={e => e.stopPropagation()}>
                          {(() => {
                            const exp = getAgreementExpiryInfo(franchise.agreementEndDate);
                            if (exp.status === "Expiring Soon" || exp.status === "Expired") {
                              return (
                                <button
                                  onClick={(e) => handleSendRenewalNotice(franchise, e)}
                                  className={`px-2 py-1 rounded-lg text-[10px] font-black border transition-all flex items-center gap-1 cursor-pointer ${exp.status === "Expired"
                                      ? "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100"
                                      : "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 animate-pulse"
                                    }`}
                                  title={`Agreement ${exp.status} (${exp.label}). Click to copy reminder notice.`}
                                >
                                  <Clock className="w-3 h-3 shrink-0" />
                                  {exp.status === "Expired" ? "Expired" : "Expiring Soon"}
                                </button>
                              );
                            }
                            return null;
                          })()}
                          <button
                            onClick={(e) => handleEditPartner(franchise, e)}
                            className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold transition-all border border-indigo-200 flex items-center gap-1 cursor-pointer"
                            title="Edit Partner & Agreement Terms"
                          >
                            <Edit3 className="w-3.5 h-3.5" /> Edit
                          </button>
                          <button
                            onClick={(e) => handleDeletePartner(franchise.id, franchise.partnerName, e)}
                            className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-bold transition-all border border-rose-200 flex items-center gap-1 cursor-pointer"
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
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={(e) => handleSendRenewalNotice(selectedFranchise, e)}
                className="px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Send className="w-3.5 h-3.5" /> Send Renewal Reminder
              </button>
              <span className={`px-3 py-1 rounded-lg text-xs font-black border ${selectedFranchise.status === "Active" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200"
                }`}>
                Status: {selectedFranchise.status || "Pending"}
              </span>
              <button
                onClick={() => setSelectedFranchise(null)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-500 hover:bg-slate-100 transition-all cursor-pointer"
              >
                ✕ Close Details
              </button>
            </div>
          </div>

          {/* Expiry Alert Banner if Expiring Soon or Expired */}
          {(() => {
            const exp = getAgreementExpiryInfo(selectedFranchise.agreementEndDate);
            if (exp.status === "Expired" || exp.status === "Expiring Soon") {
              return (
                <div className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 text-xs font-semibold ${exp.status === "Expired" ? "bg-rose-50 border-rose-200 text-rose-800" : "bg-amber-50 border-amber-200 text-amber-800"
                  }`}>
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
                    <span>
                      <strong>Agreement Status Alert:</strong> Franchise contract {exp.status === "Expired" ? `expired ${Math.abs(exp.daysLeft!)} days ago` : `expires in ${exp.daysLeft} days`} ({selectedFranchise.agreementEndDate || 'No Date'}). Please proceed with renewal.
                    </span>
                  </div>
                  <button
                    onClick={(e) => handleSendRenewalNotice(selectedFranchise, e)}
                    className="px-3 py-1 bg-white hover:bg-slate-100 text-slate-800 border rounded-lg text-xs font-bold shrink-0 transition-all shadow-2xs cursor-pointer"
                  >
                    Copy Reminder Draft
                  </button>
                </div>
              );
            }
            return null;
          })()}

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
                    <span className="w-2 h-2 rounded-full bg-[#714B67] inline-block"></span> 1. Basic Partner Details & Territory
                  </h3>

                  {/* Real-time Territory Conflict Alert */}
                  {(() => {
                    const conflict = getTerritoryConflict(form11.territory, form11.pincode, editingPartnerId);
                    if (conflict) {
                      return (
                        <div className="p-3 bg-amber-50 border border-amber-300 rounded-lg text-xs text-amber-800 font-semibold flex items-center gap-2 animate-fadeIn">
                          <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
                          <span>
                            <strong>Territory Conflict Alert:</strong> Territory/Pincode matches active partner <strong>"{conflict.partnerName}"</strong> ({conflict.territory || conflict.pincode}). Please verify territory exclusivity before saving.
                          </span>
                        </div>
                      );
                    }
                    return null;
                  })()}

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
                      <label className="text-[10px] uppercase font-black text-slate-600 tracking-wider">Territory / Allotted City *</label>
                      <input required className="w-full bg-white border border-slate-300 focus:border-[#714B67] rounded-lg p-2 text-xs font-bold text-slate-800 mt-1 focus:outline-none" value={form11.territory} onChange={e => setForm11({ ...form11, territory: e.target.value })} placeholder="e.g. Jaipur North" />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-black text-slate-600 tracking-wider">State / Zone</label>
                      <input className="w-full bg-white border border-slate-300 focus:border-[#714B67] rounded-lg p-2 text-xs font-bold text-slate-800 mt-1 focus:outline-none" value={form11.state} onChange={e => setForm11({ ...form11, state: e.target.value })} placeholder="e.g. Rajasthan" />
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
