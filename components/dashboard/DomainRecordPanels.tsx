"use client";

import React, { useState, useEffect } from "react";
import {
  Globe, Cloud, Mail, GitBranch, Plus, Search, Filter, RefreshCw, Download,
  Eye, EyeOff, Key, Copy, Check, Trash2, Edit3, ShieldAlert, CheckCircle,
  AlertCircle, ExternalLink, ChevronDown, Calendar, Phone, DollarSign, UserCheck,
  SlidersHorizontal
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DomainRecordPanelsProps {
  userRole?: string;
  triggerToast: (msg: string) => void;
  sessionUser?: any;
}

export default function DomainRecordPanels({ userRole, triggerToast, sessionUser }: DomainRecordPanelsProps) {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategoryTab, setActiveCategoryTab] = useState<string>("all");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>("all");
  // Column Toggle state
  const [showColumnToggleMenu, setShowColumnToggleMenu] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<{ [key: string]: boolean }>({
    id: true,
    category: true,
    name: true,
    platform: true,
    status: true,
    attachedEmail: true,
    credentials: true,
    dates: true,
    cost: true,
    url: true,
    remarks: false,
    actions: true
  });

  const toggleColumn = (key: string) => {
    setVisibleColumns(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Add Record Dropdown state
  const [showAddMenu, setShowAddMenu] = useState(false);

  // Modal open states
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<"add" | "edit" | "view">("add");
  const [selectedCategory, setSelectedCategory] = useState<string>("Domain Record");

  // Selected item for Edit / View / Delete
  const [currentRecord, setCurrentRecord] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; id?: string; name?: string }>({ show: false });

  // Security password visibility toggle map
  const [visiblePasswords, setVisiblePasswords] = useState<{ [key: string]: boolean }>({});
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Form Fields State (supports category-specific fields)
  const [form, setForm] = useState({
    name: "",
    platform: "",
    status: "In Use",
    purchaseDate: "",
    expiryDate: "",
    renewalDate: "",
    attachedEmail: "",
    userId: "",
    password: "",
    authCode: "",
    phoneNumber: "",
    cost: "",
    url: "",
    remarks: "",
    // Category Specific Extras
    recoveryEmail: "",
    recoveryNumber: "",
    assignedUser: "",
    visibility: "Private"
  });

  const [submitting, setSubmitting] = useState(false);

  // Fetch Records
  const fetchRecords = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/domain-records");
      const data = await res.json();
      if (data.success) {
        setRecords(data.records || []);
      } else {
        triggerToast(data.error || "Failed to load domain records");
      }
    } catch (err: any) {
      console.error(err);
      triggerToast("Error connecting to server");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  const resetForm = () => {
    setForm({
      name: "",
      platform: "",
      status: "In Use",
      purchaseDate: "",
      expiryDate: "",
      renewalDate: "",
      attachedEmail: "",
      userId: "",
      password: "",
      authCode: "",
      phoneNumber: "",
      cost: "",
      url: "",
      remarks: "",
      recoveryEmail: "",
      recoveryNumber: "",
      assignedUser: "",
      visibility: "Private"
    });
  };

  const handleOpenAddModal = (category: string) => {
    setSelectedCategory(category);
    setModalMode("add");
    resetForm();
    setShowAddMenu(false);
    setShowModal(true);
  };

  const formatDateForInput = (d: any) => {
    if (!d || typeof d !== "string" || d === "Invalid date") return "";
    const trimmed = d.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
    const dateObj = new Date(trimmed);
    if (isNaN(dateObj.getTime())) return "";
    return dateObj.toISOString().slice(0, 10);
  };

  const handleOpenEditModal = (record: any) => {
    setCurrentRecord(record);
    setSelectedCategory(record.recordType || "Domain Record");
    setModalMode("edit");

    let extras: any = {};
    try {
      extras = record.customFields ? JSON.parse(record.customFields) : {};
    } catch (_) {}

    setForm({
      name: record.name || "",
      platform: record.platform || "",
      status: record.status || "In Use",
      purchaseDate: formatDateForInput(record.purchaseDate),
      expiryDate: formatDateForInput(record.expiryDate),
      renewalDate: formatDateForInput(record.renewalDate),
      attachedEmail: record.attachedEmail || "",
      userId: record.userId || "",
      password: record.password || "",
      authCode: record.authCode || "",
      phoneNumber: record.phoneNumber || "",
      cost: record.cost ? String(record.cost) : "",
      url: record.url || "",
      remarks: record.remarks || "",
      recoveryEmail: extras.recoveryEmail || "",
      recoveryNumber: extras.recoveryNumber || "",
      assignedUser: extras.assignedUser || "",
      visibility: extras.visibility || "Private"
    });
    setShowModal(true);
  };

  const handleOpenViewModal = (record: any) => {
    setCurrentRecord(record);
    setSelectedCategory(record.recordType);
    setModalMode("view");
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      triggerToast("Please enter a valid Record / Domain Name");
      return;
    }

    let finalPlatform = form.platform;
    if (selectedCategory === "GitHub Repo" && !finalPlatform) {
      finalPlatform = "GitHub";
    }

    const payload = {
      recordType: selectedCategory,
      ...form,
      platform: finalPlatform,
      customFields: {
        recoveryEmail: form.recoveryEmail,
        recoveryNumber: form.recoveryNumber,
        assignedUser: form.assignedUser,
        visibility: form.visibility
      }
    };

    try {
      setSubmitting(true);
      if (modalMode === "add") {
        const res = await fetch("/api/domain-records", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success) {
          triggerToast(`✅ ${selectedCategory} created successfully`);
          setShowModal(false);
          fetchRecords();
        } else {
          triggerToast("Error: " + data.error);
        }
      } else if (modalMode === "edit" && currentRecord) {
        const res = await fetch("/api/domain-records", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: currentRecord.id,
            ...payload
          })
        });
        const data = await res.json();
        if (data.success) {
          triggerToast("✅ Record updated successfully");
          setShowModal(false);
          fetchRecords();
        } else {
          triggerToast("Error: " + data.error);
        }
      }
    } catch (err: any) {
      console.error(err);
      triggerToast("Error saving record");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm.id) return;
    try {
      const res = await fetch(`/api/domain-records?id=${deleteConfirm.id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        triggerToast("Record deleted from database");
        setRecords(prev => prev.filter(r => r.id !== deleteConfirm.id));
        setDeleteConfirm({ show: false });
      } else {
        triggerToast(data.error || "Failed to delete record");
      }
    } catch (err: any) {
      console.error(err);
      triggerToast("Error deleting record");
    }
  };

  const copyToClipboard = (text: string, fieldKey: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldKey);
    triggerToast("Copied to clipboard!");
    setTimeout(() => setCopiedField(null), 2000);
  };

  const togglePasswordVisibility = (id: string) => {
    setVisiblePasswords(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Filtered Records
  const filteredRecords = records.filter(item => {
    const matchesCategory = activeCategoryTab === "all" || item.recordType === activeCategoryTab;
    const matchesStatus = selectedStatusFilter === "all" || item.status === selectedStatusFilter;

    const query = searchQuery.toLowerCase().trim();
    const searchable = [
      item.id, item.name, item.platform, item.recordType, item.status,
      item.attachedEmail, item.userId, item.phoneNumber, item.remarks
    ].join(" ").toLowerCase();

    const matchesSearch = !query || searchable.includes(query);
    return matchesCategory && matchesStatus && matchesSearch;
  });

  // Counts
  const domainCount = records.filter(r => r.recordType === "Domain Record").length;
  const cloudCount = records.filter(r => r.recordType === "Cloud Platform").length;
  const gmailCount = records.filter(r => r.recordType === "Gmail").length;
  const githubCount = records.filter(r => r.recordType === "GitHub Repo").length;

  const exportToCsv = () => {
    if (filteredRecords.length === 0) {
      triggerToast("No records available to export");
      return;
    }

    const formatPhone = (phone: any) => {
      if (!phone) return "";
      const cleaned = String(phone).trim();
      return cleaned ? `="\t${cleaned}"` : "";
    };

    const headers: string[] = [];
    if (visibleColumns.id) headers.push("ID");
    if (visibleColumns.category) headers.push("Category");
    if (visibleColumns.name) headers.push("Name / Domain");
    if (visibleColumns.platform) headers.push("Platform");
    if (visibleColumns.status) headers.push("Status");
    if (visibleColumns.attachedEmail) {
      headers.push("Attached Email");
      headers.push("User ID / Lead");
      headers.push("Phone Number");
    }
    if (visibleColumns.credentials) {
      headers.push("Password");
      headers.push("Auth / 2FA Code");
    }
    if (visibleColumns.dates) {
      headers.push("Purchase Date");
      headers.push("Expiry Date");
      headers.push("Renewal Date");
    }
    if (visibleColumns.cost) headers.push("Cost (INR)");
    if (visibleColumns.url) headers.push("Access URL");
    if (visibleColumns.remarks) headers.push("Remarks");

    const rows = filteredRecords.map(r => {
      const row: string[] = [];
      if (visibleColumns.id) row.push(r.id || "");
      if (visibleColumns.category) row.push(r.recordType || "");
      if (visibleColumns.name) row.push(`"${(r.name || "").replace(/"/g, '""')}"`);
      if (visibleColumns.platform) row.push(`"${(r.platform || "").replace(/"/g, '""')}"`);
      if (visibleColumns.status) row.push(r.status || "");
      if (visibleColumns.attachedEmail) {
        row.push(r.attachedEmail || "");
        row.push(r.userId || "");
        row.push(formatPhone(r.phoneNumber));
      }
      if (visibleColumns.credentials) {
        row.push(r.password ? `"${r.password.replace(/"/g, '""')}"` : "");
        row.push(r.authCode ? `"${r.authCode.replace(/"/g, '""')}"` : "");
      }
      if (visibleColumns.dates) {
        row.push(r.purchaseDate || "");
        row.push(r.expiryDate || "");
        row.push(r.renewalDate || "");
      }
      if (visibleColumns.cost) row.push(r.cost ? String(r.cost) : "");
      if (visibleColumns.url) row.push(r.url ? `"${r.url.replace(/"/g, '""')}"` : "");
      if (visibleColumns.remarks) row.push(`"${(r.remarks || "").replace(/"/g, '""')}"`);
      return row;
    });

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Domain_Infrastructure_Records_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    triggerToast("Exported selected columns CSV successfully!");
  };

  return (
    <div className="space-y-6 font-sans text-slate-800 pb-12">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-[#E8E4DF] shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <Globe className="w-6 h-6 text-indigo-600" />
            <h1 className="text-xl font-black text-slate-900 tracking-wide">Domain & Infrastructure Registry</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Centralized control for Domains, Cloud Platforms, Email Accounts & Code Repositories
          </p>
        </div>

        <div className="flex items-center gap-2 self-end md:self-auto">
          <button
            onClick={fetchRecords}
            className="p-2 bg-[#FCFBF9] border border-[#E8E4DF] hover:bg-[#F5F0EA] text-[#5D5B57] hover:text-[#1C1C1A] rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5"
            title="Refresh List"
          >
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          </button>

          <button
            onClick={exportToCsv}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs"
          >
            <Download className="w-4 h-4" /> Export CSV
          </button>

          {/* ADD RECORD DROPDOWN BUTTON */}
          <div className="relative">
            <button
              onClick={() => setShowAddMenu(!showAddMenu)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-sm"
            >
              <Plus className="w-4 h-4" /> Add Record <ChevronDown className="w-3.5 h-3.5" />
            </button>

            {showAddMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-white border border-[#E8E4DF] rounded-xl shadow-xl z-50 py-1.5 overflow-hidden animate-in fade-in zoom-in-95">
                <div className="px-3 py-1.5 text-[10px] font-black uppercase text-slate-400 border-b border-[#E8E4DF]">
                  Select Record Category
                </div>
                <button
                  onClick={() => handleOpenAddModal("Domain Record")}
                  className="w-full px-3 py-2 text-left text-xs font-bold text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 flex items-center gap-2 transition-all"
                >
                  <Globe className="w-4 h-4 text-indigo-600" /> Domain Record
                </button>
                <button
                  onClick={() => handleOpenAddModal("Cloud Platform")}
                  className="w-full px-3 py-2 text-left text-xs font-bold text-slate-700 hover:bg-sky-50 hover:text-sky-600 flex items-center gap-2 transition-all"
                >
                  <Cloud className="w-4 h-4 text-sky-600" /> Cloud Platform
                </button>
                <button
                  onClick={() => handleOpenAddModal("Gmail")}
                  className="w-full px-3 py-2 text-left text-xs font-bold text-slate-700 hover:bg-rose-50 hover:text-rose-600 flex items-center gap-2 transition-all"
                >
                  <Mail className="w-4 h-4 text-rose-600" /> Gmail / Email Account
                </button>
                <button
                  onClick={() => handleOpenAddModal("GitHub Repo")}
                  className="w-full px-3 py-2 text-left text-xs font-bold text-slate-700 hover:bg-purple-50 hover:text-purple-600 flex items-center gap-2 transition-all"
                >
                  <GitBranch className="w-4 h-4 text-purple-600" /> GitHub Repo
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div
          onClick={() => setActiveCategoryTab("all")}
          className={cn(
            "p-4 rounded-2xl border transition-all cursor-pointer bg-white shadow-xs",
            activeCategoryTab === "all" ? "border-indigo-600 ring-2 ring-indigo-100" : "border-[#E8E4DF] hover:border-slate-300"
          )}
        >
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">Total Asset Records</span>
          <span className="text-xl font-black text-slate-900 mt-1 block">{records.length}</span>
        </div>

        <div
          onClick={() => setActiveCategoryTab("Domain Record")}
          className={cn(
            "p-4 rounded-2xl border transition-all cursor-pointer bg-white shadow-xs",
            activeCategoryTab === "Domain Record" ? "border-indigo-600 ring-2 ring-indigo-100" : "border-[#E8E4DF] hover:border-slate-300"
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600">Domains</span>
            <Globe className="w-4 h-4 text-indigo-500" />
          </div>
          <span className="text-xl font-black text-slate-900 mt-1 block">{domainCount}</span>
        </div>

        <div
          onClick={() => setActiveCategoryTab("Cloud Platform")}
          className={cn(
            "p-4 rounded-2xl border transition-all cursor-pointer bg-white shadow-xs",
            activeCategoryTab === "Cloud Platform" ? "border-sky-600 ring-2 ring-sky-100" : "border-[#E8E4DF] hover:border-slate-300"
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-sky-600">Cloud Platforms</span>
            <Cloud className="w-4 h-4 text-sky-500" />
          </div>
          <span className="text-xl font-black text-slate-900 mt-1 block">{cloudCount}</span>
        </div>

        <div
          onClick={() => setActiveCategoryTab("Gmail")}
          className={cn(
            "p-4 rounded-2xl border transition-all cursor-pointer bg-white shadow-xs",
            activeCategoryTab === "Gmail" ? "border-rose-600 ring-2 ring-rose-100" : "border-[#E8E4DF] hover:border-slate-300"
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-rose-600">Gmail Accounts</span>
            <Mail className="w-4 h-4 text-rose-500" />
          </div>
          <span className="text-xl font-black text-slate-900 mt-1 block">{gmailCount}</span>
        </div>

        <div
          onClick={() => setActiveCategoryTab("GitHub Repo")}
          className={cn(
            "p-4 rounded-2xl border transition-all cursor-pointer bg-white shadow-xs",
            activeCategoryTab === "GitHub Repo" ? "border-purple-600 ring-2 ring-purple-100" : "border-[#E8E4DF] hover:border-slate-300"
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-purple-600">GitHub Repos</span>
            <GitBranch className="w-4 h-4 text-purple-500" />
          </div>
          <span className="text-xl font-black text-slate-900 mt-1 block">{githubCount}</span>
        </div>
      </div>

      {/* Filter & Search Controls */}
      <div className="bg-white p-4 rounded-2xl border border-[#E8E4DF] flex flex-col md:flex-row items-center justify-between gap-4 shadow-xs">
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Category Tabs */}
          {[
            { id: "all", label: "All Items" },
            { id: "Domain Record", label: "Domains" },
            { id: "Cloud Platform", label: "Cloud Platforms" },
            { id: "Gmail", label: "Gmail" },
            { id: "GitHub Repo", label: "GitHub Repos" }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveCategoryTab(tab.id)}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-bold transition-all",
                activeCategoryTab === tab.id
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          {/* Status Dropdown */}
          <select
            value={selectedStatusFilter}
            onChange={e => setSelectedStatusFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="In Use">In Use</option>
            <option value="Available">Available</option>
            <option value="Transferred">Transferred</option>
            <option value="Archived">Archived</option>
            <option value="Suspended">Suspended</option>
          </select>

          {/* Search Box */}
          <div className="relative flex-1 md:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search records, domain, email..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:border-indigo-500 transition-all"
            />
          </div>

          {/* Toggle Columns Button & Checkbox Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowColumnToggleMenu(!showColumnToggleMenu)}
              className="p-2 bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 shadow-2xs"
              title="Toggle Columns"
            >
              <SlidersHorizontal className="w-4 h-4 text-slate-600" />
            </button>

            {showColumnToggleMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-white border border-[#E8E4DF] rounded-2xl shadow-xl z-50 p-3 overflow-hidden animate-in fade-in zoom-in-95">
                <div className="flex items-center justify-between border-b border-[#E8E4DF] pb-2 mb-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                    TOGGLE COLUMNS
                  </span>
                  <button
                    onClick={() =>
                      setVisibleColumns({
                        id: true,
                        category: true,
                        name: true,
                        platform: true,
                        status: true,
                        attachedEmail: true,
                        credentials: true,
                        dates: true,
                        cost: true,
                        url: true,
                        remarks: true,
                        actions: true
                      })
                    }
                    className="text-[10px] text-indigo-600 font-bold hover:underline"
                  >
                    Reset All
                  </button>
                </div>
                <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                  {[
                    { key: "id", label: "Record ID" },
                    { key: "category", label: "Category" },
                    { key: "name", label: "Name / Domain" },
                    { key: "platform", label: "Platform" },
                    { key: "status", label: "Status" },
                    { key: "attachedEmail", label: "Attached Email / User" },
                    { key: "credentials", label: "Credentials (Password)" },
                    { key: "dates", label: "Dates" },
                    { key: "cost", label: "Cost (INR)" },
                    { key: "url", label: "Access URL" },
                    { key: "remarks", label: "Remarks" },
                    { key: "actions", label: "Actions" }
                  ].map(col => (
                    <label
                      key={col.key}
                      className="flex items-center gap-2.5 px-2 py-1 hover:bg-slate-50 rounded-lg cursor-pointer text-xs font-semibold text-slate-700 transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={!!visibleColumns[col.key]}
                        onChange={() => toggleColumn(col.key)}
                        className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 accent-indigo-600 cursor-pointer"
                      />
                      <span>{col.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Records Data Table */}
      {(() => {
        const activeColumnCount = Object.values(visibleColumns).filter(Boolean).length || 1;
        return (
          <div className="bg-white rounded-2xl border border-[#E8E4DF] shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-[#E8E4DF] text-[10px] font-black uppercase tracking-wider text-slate-500">
                    {visibleColumns.id && <th className="py-3 px-4">Record ID</th>}
                    {visibleColumns.category && <th className="py-3 px-4">Category</th>}
                    {visibleColumns.name && <th className="py-3 px-4">Name / Domain</th>}
                    {visibleColumns.platform && <th className="py-3 px-4">Platform</th>}
                    {visibleColumns.status && <th className="py-3 px-4">Status</th>}
                    {visibleColumns.attachedEmail && <th className="py-3 px-4">Attached Email / User</th>}
                    {visibleColumns.credentials && <th className="py-3 px-4">Credentials (Password)</th>}
                    {visibleColumns.dates && <th className="py-3 px-4">Dates</th>}
                    {visibleColumns.cost && <th className="py-3 px-4">Cost (INR)</th>}
                    {visibleColumns.url && <th className="py-3 px-4">Access URL</th>}
                    {visibleColumns.remarks && <th className="py-3 px-4">Remarks</th>}
                    {visibleColumns.actions && <th className="py-3 px-4 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                  {loading ? (
                    <tr>
                      <td colSpan={activeColumnCount} className="py-8 text-center text-slate-400">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
                        Loading infrastructure records...
                      </td>
                    </tr>
                  ) : filteredRecords.length === 0 ? (
                    <tr>
                      <td colSpan={activeColumnCount} className="py-8 text-center text-slate-400">
                        <Globe className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                        No records found matching filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredRecords.map(item => {
                      const isPassVisible = visiblePasswords[item.id];
                      return (
                        <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                          
                          {/* ID Badge */}
                          {visibleColumns.id && (
                            <td className="py-3 px-4 font-mono font-bold text-indigo-900 whitespace-nowrap">
                              {item.id}
                            </td>
                          )}

                          {/* Category Badge */}
                          {visibleColumns.category && (
                            <td className="py-3 px-4 whitespace-nowrap">
                              <span className={cn(
                                "px-2.5 py-0.5 rounded-lg text-[10px] font-bold uppercase inline-flex items-center gap-1",
                                item.recordType === "Domain Record" && "bg-indigo-100 text-indigo-800",
                                item.recordType === "Cloud Platform" && "bg-sky-100 text-sky-800",
                                item.recordType === "Gmail" && "bg-rose-100 text-rose-800",
                                item.recordType === "GitHub Repo" && "bg-purple-100 text-purple-800"
                              )}>
                                {item.recordType === "Domain Record" && <Globe className="w-3 h-3" />}
                                {item.recordType === "Cloud Platform" && <Cloud className="w-3 h-3" />}
                                {item.recordType === "Gmail" && <Mail className="w-3 h-3" />}
                                {item.recordType === "GitHub Repo" && <GitBranch className="w-3 h-3" />}
                                {item.recordType}
                              </span>
                            </td>
                          )}

                          {/* Name / Domain */}
                          {visibleColumns.name && (
                            <td className="py-3 px-4 font-bold text-slate-900 max-w-xs truncate">
                              <div className="flex items-center gap-1.5">
                                <span>{item.name}</span>
                                {item.url && (
                                  <a href={item.url} target="_blank" rel="noreferrer" className="text-indigo-500 hover:text-indigo-700">
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                )}
                              </div>
                            </td>
                          )}

                          {/* Platform */}
                          {visibleColumns.platform && (
                            <td className="py-3 px-4 text-slate-600 font-semibold">
                              {item.platform || "—"}
                            </td>
                          )}

                          {/* Status */}
                          {visibleColumns.status && (
                            <td className="py-3 px-4 whitespace-nowrap">
                              <span className={cn(
                                "px-2 py-0.5 rounded-md text-[10px] font-bold uppercase",
                                item.status === "Available" && "bg-emerald-100 text-emerald-800",
                                item.status === "In Use" && "bg-blue-100 text-blue-800",
                                item.status === "Transferred" && "bg-amber-100 text-amber-800",
                                item.status === "Archived" && "bg-slate-200 text-slate-700",
                                item.status === "Suspended" && "bg-rose-100 text-rose-800"
                              )}>
                                {item.status}
                              </span>
                            </td>
                          )}

                          {/* Attached Email / User ID */}
                          {visibleColumns.attachedEmail && (
                            <td className="py-3 px-4">
                              <div className="space-y-0.5 text-[11px]">
                                {item.attachedEmail && (
                                  <div className="font-mono text-slate-800 flex items-center gap-1 truncate max-w-xs">
                                    <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                                    <span>{item.attachedEmail}</span>
                                  </div>
                                )}
                                {item.userId && (
                                  <div className="text-slate-500 text-[10px] font-mono">
                                    User: <span className="font-bold text-slate-700">{item.userId}</span>
                                  </div>
                                )}
                              </div>
                            </td>
                          )}

                          {/* Credentials (Password & Auth Code) */}
                          {visibleColumns.credentials && (
                            <td className="py-3 px-4">
                              {item.password ? (
                                <div className="flex items-center gap-1.5 font-mono text-xs">
                                  <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-200 font-bold">
                                    {isPassVisible ? item.password : "••••••••••••"}
                                  </span>
                                  <button
                                    onClick={() => togglePasswordVisibility(item.id)}
                                    className="p-1 text-slate-400 hover:text-slate-700 transition-colors"
                                    title={isPassVisible ? "Hide password" : "Show password"}
                                  >
                                    {isPassVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                  </button>
                                  <button
                                    onClick={() => copyToClipboard(item.password, `pass-${item.id}`)}
                                    className="p-1 text-slate-400 hover:text-indigo-600 transition-colors"
                                    title="Copy password"
                                  >
                                    <Copy className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ) : (
                                <span className="text-slate-400 text-[10px]">No Password</span>
                              )}
                            </td>
                          )}

                          {/* Dates (Purchase / Expiry / Renewal) */}
                          {visibleColumns.dates && (
                            <td className="py-3 px-4 text-[10px] space-y-0.5 whitespace-nowrap font-mono text-slate-500">
                              {item.expiryDate && (
                                <div className="text-rose-600 font-bold">Exp: {item.expiryDate}</div>
                              )}
                              {item.renewalDate && (
                                <div>Ren: {item.renewalDate}</div>
                              )}
                              {item.purchaseDate && (
                                <div>Pur: {item.purchaseDate}</div>
                              )}
                            </td>
                          )}

                          {/* Cost (INR) */}
                          {visibleColumns.cost && (
                            <td className="py-3 px-4 whitespace-nowrap font-bold text-slate-800">
                              {item.cost ? `₹ ${item.cost}` : "—"}
                            </td>
                          )}

                          {/* Access URL */}
                          {visibleColumns.url && (
                            <td className="py-3 px-4 max-w-xs truncate">
                              {item.url ? (
                                <a href={item.url} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline font-mono text-[11px] flex items-center gap-1">
                                  <span>{item.url}</span>
                                  <ExternalLink className="w-3 h-3 text-indigo-400 shrink-0" />
                                </a>
                              ) : (
                                <span className="text-slate-400">—</span>
                              )}
                            </td>
                          )}

                          {/* Remarks */}
                          {visibleColumns.remarks && (
                            <td className="py-3 px-4 max-w-xs truncate text-slate-600 text-[11px]" title={item.remarks || ""}>
                              {item.remarks || "—"}
                            </td>
                          )}

                          {/* Action Buttons */}
                          {visibleColumns.actions && (
                            <td className="py-3 px-4 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => handleOpenViewModal(item)}
                                  className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                                  title="View Full Specifications"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleOpenEditModal(item)}
                                  className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                  title="Edit Record"
                                >
                                  <Edit3 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => setDeleteConfirm({ show: true, id: item.id, name: item.name })}
                                  className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                  title="Delete Record"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          )}

                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}

      {/* CREATE / EDIT / VIEW MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col font-sans max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="p-4 border-b border-[#E8E4DF] flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                {selectedCategory === "Domain Record" && <Globe className="w-5 h-5 text-indigo-600" />}
                {selectedCategory === "Cloud Platform" && <Cloud className="w-5 h-5 text-sky-600" />}
                {selectedCategory === "Gmail" && <Mail className="w-5 h-5 text-rose-600" />}
                {selectedCategory === "GitHub Repo" && <GitBranch className="w-5 h-5 text-purple-600" />}
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
                  {modalMode === "add" && `New ${selectedCategory}`}
                  {modalMode === "edit" && `Edit ${selectedCategory} (${currentRecord?.id})`}
                  {modalMode === "view" && `${selectedCategory} Dossier (${currentRecord?.id})`}
                </h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            {modalMode === "view" ? (
              currentRecord && (
                <div className="p-6 space-y-4 text-xs overflow-y-auto">
                  {(() => {
                    let extras: any = {};
                    try {
                      extras = currentRecord.customFields ? JSON.parse(currentRecord.customFields) : {};
                    } catch (_) {}

                    return (
                      <div className="space-y-4">
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="text-[10px] font-black uppercase text-indigo-600">{currentRecord.recordType}</span>
                              <h2 className="text-lg font-black text-slate-900">{currentRecord.name}</h2>
                              <p className="text-xs text-slate-500 font-semibold">{currentRecord.platform || "Platform N/A"}</p>
                            </div>
                            <span className="px-2.5 py-1 bg-slate-900 text-white font-mono font-bold text-xs rounded-lg">
                              {currentRecord.id}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-3 pt-2 font-semibold">
                            <div><span className="text-slate-400 text-[10px] block uppercase">Status:</span> {currentRecord.status}</div>
                            {currentRecord.attachedEmail && <div><span className="text-slate-400 text-[10px] block uppercase">Attached Email:</span> {currentRecord.attachedEmail}</div>}
                            {extras.recoveryEmail && <div><span className="text-slate-400 text-[10px] block uppercase">Recovery Email:</span> {extras.recoveryEmail}</div>}
                            {currentRecord.userId && <div><span className="text-slate-400 text-[10px] block uppercase">{currentRecord.recordType === "GitHub Repo" ? "Lead Dev / Maintainer:" : "User ID / Username:"}</span> {currentRecord.userId}</div>}
                            {extras.assignedUser && <div><span className="text-slate-400 text-[10px] block uppercase">Assigned Custodian:</span> {extras.assignedUser}</div>}
                            {currentRecord.phoneNumber && <div><span className="text-slate-400 text-[10px] block uppercase">Registered Mobile:</span> {currentRecord.phoneNumber}</div>}
                            {extras.recoveryNumber && <div><span className="text-slate-400 text-[10px] block uppercase">Recovery Mobile:</span> {extras.recoveryNumber}</div>}
                            {extras.visibility && <div><span className="text-slate-400 text-[10px] block uppercase">Visibility:</span> {extras.visibility}</div>}
                            {currentRecord.purchaseDate && <div><span className="text-slate-400 text-[10px] block uppercase">Purchase / Created:</span> {currentRecord.purchaseDate}</div>}
                            {currentRecord.expiryDate && <div><span className="text-slate-400 text-[10px] block uppercase">Expiry Date:</span> {currentRecord.expiryDate}</div>}
                            {currentRecord.renewalDate && <div><span className="text-slate-400 text-[10px] block uppercase">Renewal Date:</span> {currentRecord.renewalDate}</div>}
                            {currentRecord.cost && <div><span className="text-slate-400 text-[10px] block uppercase">Cost / Value:</span> ₹ {currentRecord.cost}</div>}
                          </div>
                        </div>

                        {/* Sensitive Credentials Card */}
                        <div className="bg-amber-50/70 border border-amber-200 p-4 rounded-xl space-y-2">
                          <h4 className="text-xs font-bold text-amber-900 uppercase flex items-center gap-1.5">
                            <Key className="w-4 h-4 text-amber-600" /> Access Credentials & Auth Codes
                          </h4>
                          <div className="space-y-2 font-mono">
                            {currentRecord.password && (
                              <div className="flex items-center justify-between bg-white p-2.5 rounded-lg border border-amber-200">
                                <div>
                                  <span className="text-[9px] text-amber-700 block font-sans font-bold uppercase">Password / Key</span>
                                  <span className="text-xs font-bold text-slate-800">
                                    {visiblePasswords[currentRecord.id] ? currentRecord.password : "••••••••••••••••"}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => togglePasswordVisibility(currentRecord.id)}
                                    className="p-1 text-slate-500 hover:text-slate-700"
                                  >
                                    {visiblePasswords[currentRecord.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => copyToClipboard(currentRecord.password, "modal-pass")}
                                    className="px-2 py-1 bg-amber-600 text-white rounded text-[10px] font-bold"
                                  >
                                    Copy
                                  </button>
                                </div>
                              </div>
                            )}

                            {currentRecord.authCode && (
                              <div className="bg-white p-2.5 rounded-lg border border-amber-200 space-y-1">
                                <span className="text-[9px] text-amber-700 block font-sans font-bold uppercase">Code / EPP Key / 2FA / SSH</span>
                                <p className="text-xs text-slate-800 break-all font-mono">{currentRecord.authCode}</p>
                              </div>
                            )}
                          </div>
                        </div>

                        {currentRecord.remarks && (
                          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                            <span className="text-[10px] font-bold text-slate-500 uppercase">Remarks / Instructions</span>
                            <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">{currentRecord.remarks}</p>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )
            ) : (
              /* ADD / EDIT FORM - 4 DISTINCT CATEGORY FORMS */
              <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto text-xs">
                
                {/* FORM 1: 🌐 DOMAIN RECORD FORM */}
                {selectedCategory === "Domain Record" && (
                  <div className="space-y-4">
                    <div className="bg-indigo-50/60 p-3 rounded-xl border border-indigo-100 flex items-center justify-between">
                      <span className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                        <Globe className="w-4 h-4 text-indigo-600" /> Domain Record Registration Form
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase text-slate-900">Domain Name *</label>
                        <input type="text" required value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="e.g. cfiindia.com" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:border-indigo-500" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase text-slate-900">Registrar / Platform</label>
                        <input type="text" value={form.platform} onChange={e => setForm({...form, platform: e.target.value})} placeholder="e.g. GoDaddy, Hostinger, Namecheap" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:border-indigo-500" />
                      </div>
                      {/* Status Dropdown - Domain Record */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase text-slate-900">Status Dropdown</label>
                        <select value={form.status} onChange={e => setForm({...form, status: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-indigo-500">
                          <option value="In Use">In Use</option>
                          <option value="Available">Available</option>
                          <option value="Transferred">Transferred</option>
                          <option value="Archived">Archived</option>
                          <option value="Suspended">Suspended</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase text-slate-900">Attached Gmail / Owner Email</label>
                        <input type="email" value={form.attachedEmail} onChange={e => setForm({...form, attachedEmail: e.target.value})} placeholder="e.g. owner@gmail.com" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:border-indigo-500" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase text-slate-900">Registrar User ID / Username</label>
                        <input type="text" value={form.userId} onChange={e => setForm({...form, userId: e.target.value})} placeholder="e.g. godaddy_admin" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:border-indigo-500" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase text-slate-900">Registered Phone Number</label>
                        <input type="text" value={form.phoneNumber} onChange={e => setForm({...form, phoneNumber: e.target.value})} placeholder="e.g. 9876543210" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:border-indigo-500" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase text-slate-900">Purchase Date</label>
                        <input type="date" value={form.purchaseDate} onChange={e => setForm({...form, purchaseDate: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase text-slate-900">Expiry Date</label>
                        <input type="date" value={form.expiryDate} onChange={e => setForm({...form, expiryDate: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none" />
                      </div>

                      {/* Renewal Date - Only appears when expiry date is close (<= 60 days) or active renewal date */}
                      {(() => {
                        let isClose = Boolean(form.renewalDate && form.renewalDate !== "Invalid date");
                        if (!isClose && form.expiryDate && form.expiryDate !== "Invalid date") {
                          try {
                            const exp = new Date(form.expiryDate).getTime();
                            const now = new Date().getTime();
                            if (!isNaN(exp)) {
                              const diffDays = (exp - now) / (1000 * 3600 * 24);
                              if (diffDays <= 60) isClose = true;
                            }
                          } catch (_) {}
                        }
                        return isClose ? (
                          <div className="space-y-1 animate-in fade-in">
                            <div className="flex items-center justify-between">
                              <label className="text-[10px] font-bold uppercase text-amber-900">Renewal Date *</label>
                              <span className="text-[9px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">⚠️ Expiry Approaching</span>
                            </div>
                            <input type="date" value={form.renewalDate} onChange={e => setForm({...form, renewalDate: e.target.value})} className="w-full px-3 py-2 bg-amber-50/80 border border-amber-300 rounded-xl text-xs font-semibold text-slate-900 outline-none" />
                          </div>
                        ) : (
                          <div className="flex items-end pb-2">
                            <button type="button" onClick={() => setForm({...form, renewalDate: new Date().toISOString().slice(0,10)})} className="text-[11px] text-indigo-600 hover:text-indigo-800 font-bold underline">
                              + Add Renewal Date (Optional)
                            </button>
                          </div>
                        );
                      })()}

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase text-slate-900">Annual Cost (INR)</label>
                        <input type="number" value={form.cost} onChange={e => setForm({...form, cost: e.target.value})} placeholder="e.g. 1200" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none" />
                      </div>
                    </div>

                    <div className="bg-indigo-50/50 p-3 rounded-xl border border-indigo-100">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase text-indigo-900">Password</label>
                        <input type="text" value={form.password} onChange={e => setForm({...form, password: e.target.value})} placeholder="Enter domain password" className="w-full px-3 py-2 bg-white border border-indigo-200 rounded-xl text-xs font-mono font-bold text-slate-800 outline-none" />
                      </div>
                    </div>
                  </div>
                )}

                {/* FORM 2: ☁️ CLOUD PLATFORM FORM */}
                {selectedCategory === "Cloud Platform" && (
                  <div className="space-y-4">
                    <div className="bg-sky-50/60 p-3 rounded-xl border border-sky-100 flex items-center justify-between">
                      <span className="text-xs font-bold text-sky-900 flex items-center gap-1.5">
                        <Cloud className="w-4 h-4 text-sky-600" /> Cloud Infrastructure Configuration Form
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Cloud Platform / Server Name */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase text-slate-900">Cloud Platform / Server Name *</label>
                        <input type="text" required value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="e.g. AWS Production EC2" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:border-sky-500" />
                      </div>

                      {/* Server IP / Host Domain */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase text-slate-900">Server IP / Host Domain</label>
                        <input type="text" value={form.url} onChange={e => setForm({...form, url: e.target.value})} placeholder="e.g. 192.168.1.100 or app.vercel.app" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:border-sky-500" />
                      </div>

                      {/* Status Dropdown */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase text-slate-900">Status Dropdown</label>
                        <select value={form.status} onChange={e => setForm({...form, status: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-sky-500">
                          <option value="In Use">In Use</option>
                          <option value="Available">Available</option>
                          <option value="Transferred">Transferred</option>
                          <option value="Archived">Archived</option>
                          <option value="Suspended">Suspended</option>
                        </select>
                      </div>

                      {/* Account Owner Email */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase text-slate-900">Account Owner Email</label>
                        <input type="email" value={form.attachedEmail} onChange={e => setForm({...form, attachedEmail: e.target.value})} placeholder="e.g. devops@company.com" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none" />
                      </div>

                      {/* Linked Mobile Number */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase text-slate-900">Linked Mobile Number</label>
                        <input type="text" value={form.phoneNumber} onChange={e => setForm({...form, phoneNumber: e.target.value})} placeholder="e.g. 9876543210" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none" />
                      </div>

                      {/* Monthly Billing Cost */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase text-slate-900">Monthly Billing Cost (INR)</label>
                        <input type="number" value={form.cost} onChange={e => setForm({...form, cost: e.target.value})} placeholder="e.g. 4500" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none" />
                      </div>

                      {/* Subscription Date */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase text-slate-900">Subscription Date</label>
                        <input type="date" value={form.purchaseDate} onChange={e => setForm({...form, purchaseDate: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none" />
                      </div>

                      {/* Expiry Date */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase text-slate-900">Expiry / Billing Date</label>
                        <input type="date" value={form.expiryDate} onChange={e => setForm({...form, expiryDate: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none" />
                      </div>
                    </div>

                    {/* Password Box */}
                    <div className="bg-sky-50/50 p-3 rounded-xl border border-sky-100">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase text-sky-900">Password</label>
                        <input type="text" value={form.password} onChange={e => setForm({...form, password: e.target.value})} placeholder="Enter cloud password" className="w-full px-3 py-2 bg-white border border-sky-200 rounded-xl text-xs font-mono font-bold text-slate-800 outline-none" />
                      </div>
                    </div>
                  </div>
                )}

                {/* FORM 3: 📧 GMAIL / EMAIL ACCOUNT FORM */}
                {selectedCategory === "Gmail" && (
                  <div className="space-y-4">
                    <div className="bg-rose-50/60 p-3 rounded-xl border border-rose-100 flex items-center justify-between">
                      <span className="text-xs font-bold text-rose-900 flex items-center gap-1.5">
                        <Mail className="w-4 h-4 text-rose-600" /> Email Account Credentials & Security Form
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Email Address / ID */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase text-slate-900">Email Address / ID *</label>
                        <input type="email" required value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="e.g. hr.cfipl@gmail.com" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:border-rose-500" />
                      </div>

                      {/* Email Suite / Provider Dropdown */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase text-slate-900">Email Suite / Provider</label>
                        <select
                          value={
                            ["Google Workspace", "Personal Gmail", "Microsoft Office 365", "cPanel / Webmail", "Zoho Mail"].includes(form.platform)
                              ? form.platform
                              : form.platform ? "Other" : ""
                          }
                          onChange={e => {
                            const val = e.target.value;
                            if (val === "Other") {
                              setForm({ ...form, platform: "Other" });
                            } else {
                              setForm({ ...form, platform: val });
                            }
                          }}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-rose-500"
                        >
                          <option value="">Select Provider...</option>
                          <option value="Google Workspace">Google Workspace</option>
                          <option value="Personal Gmail">Personal Gmail</option>
                          <option value="Microsoft Office 365">Microsoft Office 365</option>
                          <option value="cPanel / Webmail">cPanel / Webmail</option>
                          <option value="Zoho Mail">Zoho Mail</option>
                          <option value="Other">Other (Specify Custom Provider)</option>
                        </select>

                        {(!["Google Workspace", "Personal Gmail", "Microsoft Office 365", "cPanel / Webmail", "Zoho Mail"].includes(form.platform) || form.platform === "Other") && (
                          <input
                            type="text"
                            value={form.platform === "Other" ? "" : form.platform}
                            onChange={e => setForm({ ...form, platform: e.target.value })}
                            placeholder="Enter custom provider (e.g. ProtonMail)"
                            className="w-full mt-1.5 px-3 py-2 bg-white border border-rose-300 rounded-xl text-xs font-semibold text-slate-800 outline-none"
                          />
                        )}
                      </div>

                      {/* Status Dropdown */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase text-slate-900">Status Dropdown</label>
                        <select value={form.status} onChange={e => setForm({...form, status: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-rose-500">
                          <option value="In Use">In Use</option>
                          <option value="Available">Available</option>
                          <option value="Transferred">Transferred</option>
                          <option value="Archived">Archived</option>
                          <option value="Suspended">Suspended</option>
                        </select>
                      </div>

                      {/* Attached Mobile Number */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase text-slate-900">Attached Mobile Number *</label>
                        <input type="text" value={form.phoneNumber} onChange={e => setForm({...form, phoneNumber: e.target.value})} placeholder="e.g. 9876543210 (Registered SIM)" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none" />
                      </div>

                      {/* Recovery Email */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase text-slate-900">Recovery Email</label>
                        <input type="email" value={form.recoveryEmail} onChange={e => setForm({...form, recoveryEmail: e.target.value})} placeholder="e.g. recovery@company.com" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none" />
                      </div>

                      {/* Recovery Mobile Number */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase text-slate-900">Recovery Mobile Number</label>
                        <input type="text" value={form.recoveryNumber} onChange={e => setForm({...form, recoveryNumber: e.target.value})} placeholder="e.g. 9123456789 (Backup Phone)" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none" />
                      </div>

                      {/* Assigned Staff / Custodian */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase text-slate-900">Assigned Staff / Employee Custodian</label>
                        <input type="text" value={form.assignedUser} onChange={e => setForm({...form, assignedUser: e.target.value})} placeholder="e.g. Himanshu Akodiya" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none" />
                      </div>

                      {/* Account Creation Date */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase text-slate-900">Account Creation Date</label>
                        <input type="date" value={form.purchaseDate} onChange={e => setForm({...form, purchaseDate: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none" />
                      </div>
                    </div>

                    {/* Email Password Box */}
                    <div className="bg-rose-50/50 p-3 rounded-xl border border-rose-100">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase text-rose-900">Email Account Password *</label>
                        <input type="text" required value={form.password} onChange={e => setForm({...form, password: e.target.value})} placeholder="Enter Gmail password" className="w-full px-3 py-2 bg-white border border-rose-200 rounded-xl text-xs font-mono font-bold text-slate-800 outline-none" />
                      </div>
                    </div>
                  </div>
                )}

                {/* FORM 4: 🐙 GITHUB REPO FORM */}
                {selectedCategory === "GitHub Repo" && (
                  <div className="space-y-4">
                    <div className="bg-purple-50/60 p-3 rounded-xl border border-purple-100 flex items-center justify-between">
                      <span className="text-xs font-bold text-purple-900 flex items-center gap-1.5">
                        <GitBranch className="w-4 h-4 text-purple-600" /> GitHub & Code Repository Management Form
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase text-slate-900">Repository / Project Name *</label>
                        <input type="text" required value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="e.g. HRMS-Rs9-Group" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:border-purple-500" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase text-slate-900">Repository Access URL</label>
                        <input type="url" value={form.url} onChange={e => setForm({...form, url: e.target.value})} placeholder="https://github.com/org/repo" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:border-purple-500" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase text-slate-900">Visibility / Access Level</label>
                        <select value={form.visibility} onChange={e => setForm({...form, visibility: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none">
                          <option value="Private">Private</option>
                          <option value="Public">Public</option>
                          <option value="Internal Team">Internal Team</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase text-slate-900">Status Dropdown</label>
                        <select value={form.status} onChange={e => setForm({...form, status: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none">
                          <option value="In Use">In Use</option>
                          <option value="Available">Available</option>
                          <option value="Transferred">Transferred</option>
                          <option value="Archived">Archived</option>
                          <option value="Suspended">Suspended</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase text-slate-900">Lead Developer / Maintainer</label>
                        <input type="text" value={form.userId} onChange={e => setForm({...form, userId: e.target.value})} placeholder="e.g. Senior Tech Lead" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase text-slate-900">Account / Owner Email</label>
                        <input type="email" value={form.attachedEmail} onChange={e => setForm({...form, attachedEmail: e.target.value})} placeholder="e.g. dev@company.com" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase text-slate-900">Contact Phone Number</label>
                        <input type="text" value={form.phoneNumber} onChange={e => setForm({...form, phoneNumber: e.target.value})} placeholder="e.g. 9876543210" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase text-slate-900">Repo Creation Date</label>
                        <input type="date" value={form.purchaseDate} onChange={e => setForm({...form, purchaseDate: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none" />
                      </div>
                    </div>

                    <div className="bg-purple-50/50 p-3 rounded-xl border border-purple-100">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase text-purple-900">Password</label>
                        <input type="text" value={form.password} onChange={e => setForm({...form, password: e.target.value})} placeholder="Enter repository password" className="w-full px-3 py-2 bg-white border border-purple-200 rounded-xl text-xs font-mono font-bold text-slate-800 outline-none" />
                      </div>
                    </div>
                  </div>
                )}

                {/* Shared Remarks Field */}
                <div className="space-y-1 pt-2 border-t border-slate-100">
                  <label className="text-[10px] font-bold uppercase text-slate-900">Remarks / Security Notes</label>
                  <textarea
                    rows={2}
                    value={form.remarks}
                    onChange={e => setForm({ ...form, remarks: e.target.value })}
                    placeholder="Add specific instructions, recovery details, or renewal notes..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none resize-none"
                  />
                </div>

                {/* Submit Buttons */}
                <div className="flex justify-end gap-2 pt-2 border-t border-[#E8E4DF]">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
                  >
                    {submitting ? "Saving..." : modalMode === "add" ? "Save Record" : "Update Record"}
                  </button>
                </div>

              </form>
            )}

          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteConfirm.show && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-2xl text-center">
            <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto" />
            <div>
              <h3 className="text-sm font-bold text-slate-900">Delete Record Confirmation</h3>
              <p className="text-xs text-slate-500 mt-1">
                Are you sure you want to delete <span className="font-bold text-slate-800">{deleteConfirm.name}</span>? This action cannot be undone.
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setDeleteConfirm({ show: false })}
                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
