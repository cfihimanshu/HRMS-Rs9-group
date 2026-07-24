import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom";
import {
  Search, RefreshCw, Briefcase, Paperclip, Calendar, User, FileText,
  Layers, ExternalLink, Download, FileSpreadsheet, Eye, X, CheckCircle2, Building2, Building, Edit, Save, Clock
} from "lucide-react";
import * as XLSX from "xlsx";

export default function WorkHistoryView() {
  const [historyLogs, setHistoryLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [submittedByFilter, setSubmittedByFilter] = useState("");
  const [startDateFilter, setStartDateFilter] = useState("");
  const [endDateFilter, setEndDateFilter] = useState("");

  // Detail Modal State
  const [selectedLogModal, setSelectedLogModal] = useState<any | null>(null);
  
  // Edit Modal State
  const [editLogModal, setEditLogModal] = useState<any | null>(null);
  const [editStatus, setEditStatus] = useState<string>("Pending");
  const [editRemarks, setEditRemarks] = useState<string>("");
  const [savingEdit, setSavingEdit] = useState<boolean>(false);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/legal-recovery/work-history");
      const data = await res.json();
      if (data.success) {
        setHistoryLogs(data.data || []);
      }
    } catch (err) {
      console.error("Failed to fetch work history:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const uniqueSubmittedUsers = Array.from(new Set(historyLogs.map((l) => l.employeeName).filter(Boolean)));

  const filteredLogs = historyLogs.filter((log) => {
    if (categoryFilter && log.category !== categoryFilter) return false;
    if (submittedByFilter && log.employeeName !== submittedByFilter) return false;

    const rawDate = log.workDate || log.createdAt;
    if (rawDate) {
      const logDateStr = new Date(rawDate).toISOString().split("T")[0];
      if (startDateFilter && logDateStr < startDateFilter) return false;
      if (endDateFilter && logDateStr > endDateFilter) return false;
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        log.category?.toLowerCase().includes(q) ||
        log.subCategory?.toLowerCase().includes(q) ||
        log.bankName?.toLowerCase().includes(q) ||
        log.branchName?.toLowerCase().includes(q) ||
        log.employeeName?.toLowerCase().includes(q) ||
        log.remarks?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const totalBankWorks = historyLogs.filter((l) => l.category === "Bank").length;
  const totalOfficeWorks = historyLogs.filter((l) => l.category === "Office work").length;
  const totalOtherWorks = historyLogs.filter((l) => l.category === "Other").length;

  const handleExportExcel = () => {
    if (filteredLogs.length === 0) {
      alert("No work history entries available to export.");
      return;
    }

    const exportData = filteredLogs.map((log, index) => ({
      "S.No": index + 1,
      "Work Date": new Date(log.workDate || log.createdAt).toLocaleDateString("en-IN"),
      "Work Time": new Date(log.workDate || log.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
      "Work Category": log.category || "",
      "Details / Entity": log.subCategory || "",
      "Bank Name": log.bankName || "",
      "Branch Name": log.branchName || "",
      "Work Status": log.status || "Pending",
      "Submitted By": log.employeeName || "System",
      "Attachment Link": log.attachmentUrl || "None",
      "Remarks / Notes": log.remarks || "",
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Work History");
    const dateStr = new Date().toISOString().split("T")[0];
    XLSX.writeFile(workbook, `Legal_Work_History_${dateStr}.xlsx`);
  };


  const handleSaveStatus = async () => {
    if (!editLogModal) return;
    setSavingEdit(true);
    try {
      const res = await fetch("/api/legal-recovery/work-history", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editLogModal.id,
          status: editStatus,
          remarks: editRemarks,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setEditLogModal(null);
        fetchHistory();
      } else {
        alert("Failed to update status: " + (data.error || "Unknown error"));
      }
    } catch (err: any) {
      alert("Error updating status: " + err.message);
    } finally {
      setSavingEdit(false);
    }
  };

  const isImageFile = (url: string) => {
    if (!url) return false;
    const cleanUrl = url.toLowerCase().split("?")[0];
    return (
      cleanUrl.endsWith(".png") ||
      cleanUrl.endsWith(".jpg") ||
      cleanUrl.endsWith(".jpeg") ||
      cleanUrl.endsWith(".webp") ||
      cleanUrl.endsWith(".gif") ||
      cleanUrl.includes("/doc_")
    );
  };

  return (
    <div className="space-y-6 animate-fade-in text-[#1C1C1A]">
      {/* Header & Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-[#FCFBF9] border border-[#E8E4DF] p-4 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total Entries</p>
            <h3 className="text-xl font-serif font-light text-slate-800 mt-0.5">{historyLogs.length}</h3>
          </div>
          <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
            <Briefcase className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-[#FCFBF9] border border-[#E8E4DF] p-4 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-emerald-600">Bank Works</p>
            <h3 className="text-xl font-serif font-light text-emerald-950 mt-0.5">{totalBankWorks}</h3>
          </div>
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-[#FCFBF9] border border-[#E8E4DF] p-4 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-indigo-600">Office Works</p>
            <h3 className="text-xl font-serif font-light text-indigo-950 mt-0.5">{totalOfficeWorks}</h3>
          </div>
          <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <FileText className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-[#FCFBF9] border border-[#E8E4DF] p-4 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-amber-600">Other Works</p>
            <h3 className="text-xl font-serif font-light text-amber-950 mt-0.5">{totalOtherWorks}</h3>
          </div>
          <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Briefcase className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter & Search Panel */}
      <div className="bg-[#FCFBF9] border border-[#E8E4DF] rounded-2xl p-4 shadow-sm space-y-3">
        {/* Top Tier: Search Bar & Actions */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              className="w-full pl-9 pr-8 py-2.5 bg-white border border-[#E8E4DF] rounded-xl text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 transition-all shadow-2xs"
              placeholder="Search work history by Category, Bank, Branch, Employee, Remarks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 text-xs"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto justify-end">
            <button
              onClick={handleExportExcel}
              className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-sm shrink-0"
              title="Export Work History to Excel"
            >
              <FileSpreadsheet className="w-4 h-4" /> Export Excel
            </button>

            <button
              onClick={fetchHistory}
              className="p-2.5 bg-white border border-[#E8E4DF] hover:bg-[#F5F0EA] rounded-xl text-slate-700 transition-all shadow-2xs shrink-0"
              title="Refresh History"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-indigo-600" : ""}`} />
            </button>
          </div>
        </div>

        {/* Bottom Tier: Filter Controls */}
        <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-[#E8E4DF]/60">
          {/* Date Range Picker Group */}
          <div className="flex items-center gap-2 bg-white border border-[#E8E4DF] p-1.5 rounded-xl shadow-2xs">
            <div className="flex items-center gap-1 px-2">
              <Calendar className="w-3.5 h-3.5 text-indigo-500" />
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Date Range</span>
            </div>

            <input
              type="date"
              value={startDateFilter}
              onChange={(e) => setStartDateFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-slate-700 focus:outline-none focus:border-indigo-400"
              title="From Date"
            />
            <span className="text-xs text-slate-400 font-bold">to</span>
            <input
              type="date"
              value={endDateFilter}
              onChange={(e) => setEndDateFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-slate-700 focus:outline-none focus:border-indigo-400"
              title="To Date"
            />
          </div>

          {/* Work Category Dropdown */}
          <div className="relative inline-flex items-center">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="text-xs py-2 px-3 pl-8 bg-white border border-[#E8E4DF] rounded-xl font-bold text-slate-700 focus:outline-none focus:border-indigo-500 shadow-2xs appearance-none cursor-pointer pr-8"
            >
              <option value="">All Work Categories</option>
              <option value="Bank">Bank Work</option>
              <option value="Office work">Office Work</option>
              <option value="Other">Other</option>
            </select>
            <Layers className="w-3.5 h-3.5 text-indigo-500 absolute left-2.5 pointer-events-none" />
            <span className="absolute right-2.5 text-slate-400 text-[10px] pointer-events-none">▼</span>
          </div>

          {/* Submitted By Dropdown */}
          <div className="relative inline-flex items-center">
            <select
              value={submittedByFilter}
              onChange={(e) => setSubmittedByFilter(e.target.value)}
              className="text-xs py-2 px-3 pl-8 bg-white border border-[#E8E4DF] rounded-xl font-bold text-slate-700 focus:outline-none focus:border-indigo-500 shadow-2xs appearance-none cursor-pointer pr-8 max-w-[200px] truncate"
            >
              <option value="">All Submitted By Users</option>
              {uniqueSubmittedUsers.map((user: string) => (
                <option key={user} value={user}>
                  {user}
                </option>
              ))}
            </select>
            <User className="w-3.5 h-3.5 text-amber-500 absolute left-2.5 pointer-events-none" />
            <span className="absolute right-2.5 text-slate-400 text-[10px] pointer-events-none">▼</span>
          </div>

          {/* Reset All Filters Button */}
          {(startDateFilter || endDateFilter || categoryFilter || submittedByFilter || searchQuery) && (
            <button
              onClick={() => {
                setStartDateFilter("");
                setEndDateFilter("");
                setCategoryFilter("");
                setSubmittedByFilter("");
                setSearchQuery("");
              }}
              className="text-[10px] font-black uppercase tracking-wider text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 px-3 py-2 rounded-xl border border-rose-200 transition-all shadow-2xs ml-auto"
              title="Reset All Filters"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-[#FCFBF9] border border-[#E8E4DF] rounded-2xl overflow-hidden shadow-sm overflow-x-auto">
        {/* Table Summary Bar */}
        <div className="px-5 py-3.5 border-b border-[#E8E4DF] bg-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-indigo-600" />
            <span className="text-xs font-black uppercase tracking-wider text-slate-700">Work History Registry</span>
          </div>
          <span className="text-xs font-bold text-slate-600 bg-slate-100 border border-slate-200 px-3 py-1 rounded-xl">
            Showing <strong className="text-indigo-700">{filteredLogs.length}</strong> of <strong className="text-slate-800">{historyLogs.length}</strong> entries
          </span>
        </div>

        <table className="w-full border-collapse text-left min-w-max">
          <thead className="bg-[#F5F0EA] border-b border-[#E8E4DF]">
            <tr className="text-[#5D5B57] text-[10px] uppercase font-bold tracking-wider">
              <th className="py-3.5 px-4">Date &amp; Time</th>
              <th className="py-3.5 px-4">Work Category</th>
              <th className="py-3.5 px-4">Details / Entity</th>
              <th className="py-3.5 px-4">Status</th>
              <th className="py-3.5 px-4">Submitted By</th>
              <th className="py-3.5 px-4">Attachment</th>
              <th className="py-3.5 px-4">Remarks</th>
              <th className="py-3.5 px-4 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E8E4DF] text-xs">
            {filteredLogs.map((log) => {
              let categoryBadge = "bg-slate-100 text-slate-700 border-slate-200";
              if (log.category === "Bank") categoryBadge = "bg-emerald-50 text-emerald-700 border-emerald-200";
              else if (log.category === "Office work") categoryBadge = "bg-indigo-50 text-indigo-700 border-indigo-200";
              else if (log.category === "Other") categoryBadge = "bg-amber-50 text-amber-700 border-amber-200";

              return (
                <tr key={log.id} className="hover:bg-white transition-colors">
                  <td className="py-3.5 px-4 text-slate-600 font-medium">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>{new Date(log.workDate || log.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 ml-5">
                      {new Date(log.workDate || log.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </td>

                  <td className="py-3.5 px-4">
                    <span className={`px-2.5 py-1 rounded-lg border text-[10px] font-black uppercase tracking-wide inline-block ${categoryBadge}`}>
                      {log.category}
                    </span>
                  </td>

                  <td className="py-3.5 px-4">
                    <div className="font-bold text-slate-800">{log.subCategory}</div>
                    {log.bankName && (
                      <div className="text-[10px] text-slate-500 font-medium">
                        Bank: {log.bankName} {log.branchName ? `• ${log.branchName}` : ""}
                      </div>
                    )}
                  </td>

                  {/* Status Column */}
                  <td className="py-3.5 px-4">
                    {(() => {
                      const st = log.status || "Pending";
                      let badgeStyle = "bg-amber-50 text-amber-700 border-amber-200";
                      let icon = "⏳";
                      if (st === "In Progress") {
                        badgeStyle = "bg-blue-50 text-blue-700 border-blue-200";
                        icon = "🔄";
                      } else if (st === "Completed") {
                        badgeStyle = "bg-emerald-50 text-emerald-700 border-emerald-200";
                        icon = "✅";
                      }
                      return (
                        <span className={`px-2.5 py-1 rounded-lg border text-[10px] font-black tracking-wide inline-flex items-center gap-1 ${badgeStyle}`}>
                          <span>{icon}</span> {st}
                        </span>
                      );
                    })()}
                  </td>

                  <td className="py-3.5 px-4 text-slate-700 font-semibold">
                    <div className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span>{log.employeeName || "System"}</span>
                    </div>
                  </td>

                  <td className="py-3.5 px-4">
                    {log.attachmentUrl ? (
                      <a
                        href={log.attachmentUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg border border-indigo-200 transition-all"
                      >
                        <Paperclip className="w-3 h-3" /> View Doc <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    ) : (
                      <span className="text-[10px] text-slate-400 italic">No File</span>
                    )}
                  </td>

                  <td
                    onClick={() => setSelectedLogModal(log)}
                    className="py-3.5 px-4 text-slate-600 font-medium max-w-xs truncate cursor-pointer hover:text-indigo-600 hover:underline"
                    title="Click to view full remarks and record details"
                  >
                    {log.remarks || <span className="text-slate-400 italic">N/A</span>}
                  </td>

                  <td className="py-3.5 px-4 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => setSelectedLogModal(log)}
                        className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors inline-flex items-center gap-1"
                        title="View Full Entry Details"
                      >
                        <Eye className="w-3 h-3 text-slate-600" /> View
                      </button>
                      <button
                        onClick={() => {
                          setEditLogModal(log);
                          setEditStatus(log.status || "Pending");
                          setEditRemarks(log.remarks || "");
                        }}
                        className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors inline-flex items-center gap-1"
                        title="Edit Work Status & Remarks"
                      >
                        <Edit className="w-3 h-3 text-indigo-600" /> Edit
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}

            {filteredLogs.length === 0 && !loading && (
              <tr>
                <td colSpan={8} className="text-center py-12 text-slate-400 text-xs font-bold uppercase tracking-wider">
                  No Work History Entries Found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* DETAILED VIEW MODAL */}
      {selectedLogModal && typeof window !== "undefined" && ReactDOM.createPortal(
        <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-md z-[9999] flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden my-auto transform transition-all">
            
            {/* Modal Header */}
            <div className="p-5 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 text-indigo-400 flex items-center justify-center">
                  <Briefcase className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold tracking-wide">Work History Record Details</h3>
                  <p className="text-[11px] text-slate-300 font-medium">
                    {new Date(selectedLogModal.workDate || selectedLogModal.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })} at {new Date(selectedLogModal.workDate || selectedLogModal.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLogModal(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              
              {/* Category Badge & Details */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Work Category</span>
                  <span className="px-2.5 py-1 bg-indigo-50 border border-indigo-200 text-indigo-700 text-[10px] font-black uppercase rounded-lg">
                    {selectedLogModal.category}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Details / Work Entity</span>
                  <h4 className="text-sm font-bold text-slate-800 mt-0.5">{selectedLogModal.subCategory}</h4>
                </div>

                {selectedLogModal.bankName && (
                  <div className="pt-2 border-t border-slate-200/60 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Bank</span>
                      <span className="font-semibold text-slate-700">{selectedLogModal.bankName}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Branch</span>
                      <span className="font-semibold text-slate-700">{selectedLogModal.branchName || "N/A"}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Submitted By */}
              <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                <span className="font-bold text-slate-500 uppercase text-[10px] tracking-wider">Submitted By</span>
                <span className="font-bold text-slate-800 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-slate-500" />
                  {selectedLogModal.employeeName || "System"}
                </span>
              </div>

              {/* Attachment Preview Section */}
              {selectedLogModal.attachmentUrl && (
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                    Attached Image / Document
                  </label>
                  
                  {isImageFile(selectedLogModal.attachmentUrl) ? (
                    <div className="space-y-2">
                      <div className="rounded-2xl border border-slate-200 overflow-hidden bg-slate-900 max-h-60 flex items-center justify-center p-2">
                        <img
                          src={selectedLogModal.attachmentUrl}
                          alt="Work Attachment"
                          className="max-h-56 max-w-full object-contain rounded-xl"
                        />
                      </div>
                      <a
                        href={selectedLogModal.attachmentUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center justify-center gap-1.5 w-full py-2 bg-indigo-50 text-indigo-700 rounded-xl border border-indigo-200 text-xs font-bold hover:bg-indigo-100 transition-colors"
                      >
                        <Paperclip className="w-3.5 h-3.5" /> Open Full Attachment <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  ) : (
                    <a
                      href={selectedLogModal.attachmentUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between p-3.5 bg-indigo-50 text-indigo-900 rounded-2xl border border-indigo-200 text-xs font-bold hover:bg-indigo-100 transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Paperclip className="w-4 h-4 text-indigo-600 shrink-0" />
                        <span className="truncate">{selectedLogModal.attachmentUrl.split("/").pop()}</span>
                      </div>
                      <ExternalLink className="w-4 h-4 text-indigo-600 shrink-0" />
                    </a>
                  )}
                </div>
              )}

              {/* Full Remarks / Notes */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                  Full Remarks / Notes
                </label>
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-800 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto custom-scrollbar font-medium">
                  {selectedLogModal.remarks || <span className="text-slate-400 italic">No remarks provided.</span>}
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedLogModal(null)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-colors"
              >
                Close
              </button>
            </div>

          </div>
        </div>,
        document.body
      )}

      {/* EDIT WORK STATUS MODAL */}
      {editLogModal && typeof window !== "undefined" && ReactDOM.createPortal(
        <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-md z-[9999] flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden my-auto transform transition-all">
            
            {/* Modal Header */}
            <div className="p-5 bg-gradient-to-r from-indigo-900 via-slate-800 to-slate-900 text-white flex items-center justify-between border-b border-indigo-800">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 text-indigo-400 flex items-center justify-center">
                  <Edit className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold tracking-wide">Edit Work Status</h3>
                  <p className="text-[11px] text-slate-300 font-medium truncate max-w-[240px]">
                    {editLogModal.subCategory}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditLogModal(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <div className="p-6 space-y-4">
              {/* Work Status Selection */}
              <div>
                <label className="text-xs font-black text-slate-700 uppercase tracking-wider block mb-1.5">
                  Work Status <span className="text-rose-500">*</span>
                </label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full text-xs p-3 border-2 border-slate-200 focus:border-indigo-500 rounded-xl bg-slate-50 focus:bg-white font-bold text-slate-800 focus:outline-none transition-all"
                >
                  <option value="Pending">⏳ Pending</option>
                  <option value="In Progress">🔄 In Progress</option>
                  <option value="Completed">✅ Completed</option>
                </select>
              </div>

              {/* Remarks Input */}
              <div>
                <label className="text-xs font-black text-slate-700 uppercase tracking-wider block mb-1.5">
                  Update Remarks / Notes
                </label>
                <textarea
                  rows={3}
                  value={editRemarks}
                  onChange={(e) => setEditRemarks(e.target.value)}
                  placeholder="Add any updated remarks or notes..."
                  className="w-full text-xs p-3 border-2 border-slate-200 focus:border-indigo-500 rounded-xl bg-slate-50 focus:bg-white font-semibold text-slate-800 focus:outline-none transition-all resize-none"
                />
              </div>

              {/* Modal Actions */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setEditLogModal(null)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={savingEdit}
                  onClick={handleSaveStatus}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl shadow-md transition-all flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  {savingEdit ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>

          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
