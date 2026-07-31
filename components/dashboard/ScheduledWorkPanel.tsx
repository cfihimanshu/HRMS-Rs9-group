import React, { useState, useEffect } from "react";
import {
  CalendarClock,
  Search,
  RefreshCw,
  Download,
  Calendar,
  Clock,
  User,
  Building2,
  CheckCircle2,
  AlertCircle,
  Clock3,
  FileSpreadsheet,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Eye,
  X
} from "lucide-react";

interface ScheduledWorkPanelProps {
  sessionUser?: any;
  triggerToast?: (msg: string) => void;
}

const getCleanAttachmentUrl = (raw: string | null | undefined): string | null => {
  if (!raw) return null;
  let str = String(raw).trim();
  if (str.startsWith("[")) {
    try {
      const parsed = JSON.parse(str);
      if (Array.isArray(parsed) && parsed.length > 0) {
        str = String(parsed[0]).trim();
      }
    } catch (e) {
      str = str.replace(/[\[\]"']/g, "").trim();
    }
  }
  str = str.replace(/^[\[\]"']+|[\[\]"']+$/g, "").trim();
  if (!str || str === "null" || str === "undefined") return null;
  if (str.startsWith("http://") || str.startsWith("https://") || str.startsWith("data:") || str.startsWith("/")) {
    return str;
  }
  return `https://${str}`;
};

const getCleanRemarks = (item: any): string => {
  let text = item.details || item.remarks || "";
  if (!text) return "—";

  // If text contains "Details: ", extract the actual user detail portion
  if (text.includes("Details: ")) {
    const parts = text.split("Details: ");
    const actualDetail = parts[parts.length - 1].trim();
    if (actualDetail && actualDetail !== "N/A" && !actualDetail.includes("Call Category:")) {
      return actualDetail;
    }
  }

  // Strip out auto-generated boilerplate headers (Call Category: Bank Bank: ... Category: Operations)
  if (text.includes("Call Category:") || text.includes("Bank:") || text.includes("Officer Name:")) {
    const cleaned = text
      .replace(/Call Category:[^:]*Bank:[^:]*Branch:[^:]*Officer Name:[^:]*Phone:[^:]*Category:[^:]*/gi, "")
      .replace(/Call Category:[^\n]*/gi, "")
      .trim();
    if (cleaned && cleaned !== "—") return cleaned;
    return "—";
  }

  if (text.startsWith("SOD Scheduled Work") || text.startsWith("Declared SOD schedule")) {
    return "—";
  }

  return text;
};

const getCleanProgressNoteText = (rawNotes: any): string => {
  if (!rawNotes) return "";

  if (typeof rawNotes === "string") {
    const trimmed = rawNotes.trim();
    if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          const texts = parsed
            .map((n: any) => (typeof n === "string" ? n : n?.text || n?.note || n?.message || n?.comment || "").trim())
            .filter(Boolean);
          if (texts.length > 0) return texts.join("\n• ");
        } else if (parsed && typeof parsed === "object") {
          const text = (parsed.text || parsed.note || parsed.message || parsed.comment || "").trim();
          if (text) return text;
        }
      } catch (e) {}
    }

    // Clean JSON metadata strings like {"createdAt":"...", "userName":"..."}
    let cleaned = trimmed
      .replace(/\[\s*\{\s*"text"\s*:\s*"/g, "")
      .replace(/"\s*,\s*"createdAt"\s*:[^\]\}]*/gi, "")
      .replace(/\{\s*"text"\s*:\s*"/g, "")
      .replace(/"\s*,\s*"userName"\s*:[^\]\}]*/gi, "")
      .replace(/[\{\}\[\]"]/g, "")
      .trim();

    return cleaned;
  }

  return String(rawNotes);
};

export default function ScheduledWorkPanel({ sessionUser, triggerToast }: ScheduledWorkPanelProps) {
  const [schedules, setSchedules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDetailItem, setSelectedDetailItem] = useState<any | null>(null);

  // Filter States
  const [searchTerm, setSearchTerm] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  const fetchAllSchedules = async () => {
    setLoading(true);
    try {
      let url = "/api/legal-recovery/schedule?all=true&verticalOnly=true";
      if (fromDate && toDate) {
        url += `&fromDate=${fromDate}&toDate=${toDate}`;
      } else if (fromDate) {
        url += `&date=${fromDate}`;
      }

      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setSchedules(data.data || []);
      } else {
        console.error("Failed to fetch schedules:", data.error);
      }
    } catch (err) {
      console.error("Error loading scheduled work:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllSchedules();
  }, [fromDate, toDate]);

  // Quick Date Range Shortcuts
  const setQuickDateRange = (preset: "today" | "week" | "month" | "clear") => {
    const todayStr = new Date().toISOString().split("T")[0];
    if (preset === "today") {
      setFromDate(todayStr);
      setToDate(todayStr);
    } else if (preset === "week") {
      const now = new Date();
      const firstDay = new Date(now.setDate(now.getDate() - now.getDay()));
      const lastDay = new Date(now.setDate(now.getDate() - now.getDay() + 6));
      setFromDate(firstDay.toISOString().split("T")[0]);
      setToDate(lastDay.toISOString().split("T")[0]);
    } else if (preset === "month") {
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      setFromDate(firstDay.toISOString().split("T")[0]);
      setToDate(lastDay.toISOString().split("T")[0]);
    } else {
      setFromDate("");
      setToDate("");
    }
    setCurrentPage(1);
  };

  const handleUpdateStatus = async (item: any, newStatus: string) => {
    try {
      const res = await fetch("/api/legal-recovery/schedule", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, status: newStatus })
      });
      const data = await res.json();
      if (data.success) {
        setSchedules(prev => prev.map(s => s.id === item.id ? { ...s, status: newStatus, completedAt: newStatus === "Completed" ? new Date().toISOString() : null } : s));
        if (triggerToast) triggerToast(`Status updated to "${newStatus}"!`);
      } else {
        alert("Failed to update status: " + data.error);
      }
    } catch (err) {
      console.error("Error updating status:", err);
    }
  };

  const handleDeleteSchedule = async (id: string) => {
    if (!confirm("Are you sure you want to delete this scheduled work entry?")) return;
    try {
      const res = await fetch(`/api/legal-recovery/schedule?id=${id}`, {
        method: "DELETE"
      });
      const data = await res.json();
      if (data.success) {
        setSchedules(prev => prev.filter(s => s.id !== id));
        if (triggerToast) triggerToast("Scheduled entry deleted.");
      } else {
        alert("Failed to delete: " + data.error);
      }
    } catch (err) {
      console.error("Error deleting schedule:", err);
    }
  };

  // Helper to format time taken / completion duration
  const formatTimeTaken = (item: any) => {
    if (item.status !== "Completed") {
      return (
        <span className="text-amber-600 font-bold text-[10px] bg-amber-50 px-2 py-0.5 rounded border border-amber-200 inline-flex items-center gap-1">
          <Clock3 className="w-3 h-3 text-amber-500" /> Pending / In Progress
        </span>
      );
    }

    const startMs = new Date(item.createdAt).getTime();
    const endMs = item.completedAt
      ? new Date(item.completedAt).getTime()
      : item.updatedAt
      ? new Date(item.updatedAt).getTime()
      : 0;

    if (isNaN(startMs) || isNaN(endMs) || endMs <= startMs) {
      return (
        <span className="text-emerald-700 font-bold text-[10px] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 inline-flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Completed
        </span>
      );
    }

    const diffMins = Math.floor((endMs - startMs) / (1000 * 60));
    if (diffMins < 60) {
      return (
        <div className="space-y-0.5">
          <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-black px-2 py-0.5 rounded inline-flex items-center gap-1">
            ⏱️ {diffMins} min{diffMins !== 1 ? "s" : ""}
          </span>
          <span className="text-[9px] text-slate-400 block font-mono">
            {new Date(endMs).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>
      );
    }

    const hours = Math.floor(diffMins / 60);
    const remainingMins = diffMins % 60;
    return (
      <div className="space-y-0.5">
        <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-black px-2 py-0.5 rounded inline-flex items-center gap-1">
          ⏱️ {hours} hr {remainingMins > 0 ? `${remainingMins}m` : ""}
        </span>
        <span className="text-[9px] text-slate-400 block font-mono">
          {new Date(endMs).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>
    );
  };

  // Client-side search & status/type filtering
  const filteredSchedules = schedules.filter(item => {
    // 1. Status Filter
    if (statusFilter !== "all") {
      const itemStatus = (item.status || "Pending").toLowerCase();
      if (itemStatus !== statusFilter.toLowerCase()) {
        return false;
      }
    }

    // 2. Type Filter
    if (typeFilter !== "all") {
      const itemType = (item.type || "").toLowerCase().trim();
      const itemSub = (item.subType || "").toLowerCase().trim();
      const filterT = typeFilter.toLowerCase().trim();

      if (filterT === "bank related" || filterT === "bank") {
        if (itemType !== "bank related" && itemType !== "bank") return false;
      } else if (filterT === "nbfc") {
        if (itemType !== "nbfc" && itemSub !== "nbfc") return false;
      } else if (filterT === "field visit") {
        if (itemType !== "field visit" && itemSub !== "field visit") return false;
      } else if (filterT === "call") {
        if (itemType !== "call" && !itemSub.includes("call")) return false;
      } else if (filterT === "general") {
        if (itemType !== "general") return false;
      } else {
        if (itemType !== filterT && itemSub !== filterT) return false;
      }
    }

    // 3. Search Term Filter
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    const empName = item.user?.name || item.employeeId || "";
    const workSec = item.workSection || "";
    const bank = item.bankName || "";
    const branch = item.branchName || "";
    const ao = item.aoName || "";
    const rbo = item.rboName || "";
    const cases = item.caseDetails || "";
    const remarks = item.remarks || item.details || "";
    const notes = item.progressNotes || item.taskLog?.progressNotes || item.taskLog?.followUpHistory || "";

    return (
      empName.toLowerCase().includes(term) ||
      workSec.toLowerCase().includes(term) ||
      bank.toLowerCase().includes(term) ||
      branch.toLowerCase().includes(term) ||
      ao.toLowerCase().includes(term) ||
      rbo.toLowerCase().includes(term) ||
      cases.toLowerCase().includes(term) ||
      remarks.toLowerCase().includes(term) ||
      notes.toLowerCase().includes(term)
    );
  });

  // Pagination calculation
  const totalPages = Math.ceil(filteredSchedules.length / itemsPerPage) || 1;
  const paginatedSchedules = filteredSchedules.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Summary counts
  const totalCount = schedules.length;
  const pendingCount = schedules.filter(s => (s.status || "Pending").toLowerCase() === "pending").length;
  const inProgressCount = schedules.filter(s => (s.status || "").toLowerCase() === "in progress").length;
  const completedCount = schedules.filter(s => (s.status || "").toLowerCase() === "completed").length;
  const bankCount = schedules.filter(s => {
    const typeStr = (s.type || "").toLowerCase().trim();
    return typeStr === "bank related" || typeStr === "bank";
  }).length;

  const nbfcCount = schedules.filter(s => {
    const typeStr = (s.type || "").toLowerCase().trim();
    const subStr = (s.subType || "").toLowerCase().trim();
    return typeStr === "nbfc" || subStr === "nbfc";
  }).length;

  const cleanCsvCell = (val: any): string => {
    if (val === null || val === undefined) return '""';
    let str = String(val);
    // Replace newlines and carriage returns with semicolon separator so Excel rows stay structured on 1 line
    str = str.replace(/[\r\n]+/g, " ; ").trim();
    // Escape double quotes
    str = str.replace(/"/g, '""');
    return `"${str}"`;
  };

  const exportToCSV = () => {
    if (filteredSchedules.length === 0) {
      alert("No matching data available to export for current filters.");
      return;
    }

    const headers = [
      "Employee Name",
      "Employee ID",
      "Date",
      "Time",
      "Work Location",
      "Type",
      "Sub Type",
      "Bank / NBFC Name",
      "Branch",
      "AO Name",
      "RBO Name",
      "Case Details",
      "Remarks / Details",
      "Status",
      "Completed At"
    ];

    const rows = filteredSchedules.map(s => {
      const empName = s.user?.name || s.employeeId || "—";
      const empId = s.employeeId || "—";
      const workDate = s.date || "—";
      const workTime = s.time || "—";
      const workLoc = s.workSection || "—";
      const typeStr = s.type || "General";
      const subTypeStr = s.subType || "—";
      const bankNameStr = s.bankName || "—";
      const branchNameStr = s.branchName || "—";
      const aoNameStr = s.aoName || "—";
      const rboNameStr = s.rboName || "—";
      const caseStr = s.caseDetails || "—";
      const remarksStr = getCleanRemarks(s);
      const statusStr = s.status || "Pending";
      const completedAtStr = s.completedAt ? new Date(s.completedAt).toLocaleString("en-IN") : "—";

      return [
        cleanCsvCell(empName),
        cleanCsvCell(empId),
        cleanCsvCell(workDate),
        cleanCsvCell(workTime),
        cleanCsvCell(workLoc),
        cleanCsvCell(typeStr),
        cleanCsvCell(subTypeStr),
        cleanCsvCell(bankNameStr),
        cleanCsvCell(branchNameStr),
        cleanCsvCell(aoNameStr),
        cleanCsvCell(rboNameStr),
        cleanCsvCell(caseStr),
        cleanCsvCell(remarksStr),
        cleanCsvCell(statusStr),
        cleanCsvCell(completedAtStr)
      ].join(",");
    });

    const csvData = "\uFEFF" + [headers.map(h => `"${h}"`).join(","), ...rows].join("\n");
    const blob = new Blob([csvData], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const dateStr = fromDate && toDate ? `${fromDate}_to_${toDate}` : (fromDate || "filtered");
    link.setAttribute("download", `Schedule_Work_Report_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4 animate-fadeIn text-slate-800">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 pb-2 border-b border-slate-200">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <CalendarClock className="w-5 h-5 text-[#714B67]" />
            <h1 className="text-lg font-black tracking-tight text-slate-900">Schedule Work Report</h1>
          </div>
          <p className="text-xs text-slate-500 font-medium">
            Master report of all SOD work schedules declared across employees, banks, NBFCs & departments
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchAllSchedules}
            className="bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 border border-slate-300 shadow-2xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-600 ${loading ? "animate-spin" : ""}`} /> Refresh
          </button>
          <button
            onClick={exportToCSV}
            className="bg-[#714B67] hover:bg-[#5F3F56] text-white text-xs font-extrabold px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-1.5 shadow-md"
          >
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
        </div>
      </div>

      {/* Summary KPI Cards (Clickable Filter Shortcuts) */}
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5">
        <div
          onClick={() => { setStatusFilter("all"); setTypeFilter("all"); setCurrentPage(1); }}
          className={`bg-white border p-3 rounded-xl shadow-2xs space-y-1 cursor-pointer transition-all hover:scale-[1.02] hover:shadow-md ${
            statusFilter === "all" && typeFilter === "all" ? "border-purple-600 ring-2 ring-purple-600/20 bg-purple-50/20" : "border-purple-100"
          }`}
        >
          <span className="text-[10px] font-black uppercase text-slate-500 font-mono tracking-wider">Total Schedules</span>
          <div className="text-lg font-black text-purple-950 flex items-center gap-1.5">
            <FileSpreadsheet className="w-4 h-4 text-purple-600" /> {totalCount}
          </div>
        </div>

        <div
          onClick={() => { setStatusFilter("Pending"); setTypeFilter("all"); setCurrentPage(1); }}
          className={`bg-white border p-3 rounded-xl shadow-2xs space-y-1 cursor-pointer transition-all hover:scale-[1.02] hover:shadow-md ${
            statusFilter.toLowerCase() === "pending" ? "border-amber-600 ring-2 ring-amber-500/20 bg-amber-50/30" : "border-amber-100"
          }`}
        >
          <span className="text-[10px] font-black uppercase text-amber-600 font-mono tracking-wider">Pending</span>
          <div className="text-lg font-black text-amber-700 flex items-center gap-1.5">
            <Clock3 className="w-4 h-4 text-amber-500" /> {pendingCount}
          </div>
        </div>

        <div
          onClick={() => { setStatusFilter("In Progress"); setTypeFilter("all"); setCurrentPage(1); }}
          className={`bg-white border p-3 rounded-xl shadow-2xs space-y-1 cursor-pointer transition-all hover:scale-[1.02] hover:shadow-md ${
            statusFilter.toLowerCase() === "in progress" ? "border-blue-600 ring-2 ring-blue-500/20 bg-blue-50/30" : "border-blue-100"
          }`}
        >
          <span className="text-[10px] font-black uppercase text-blue-600 font-mono tracking-wider">In Progress</span>
          <div className="text-lg font-black text-blue-700 flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-blue-500" /> {inProgressCount}
          </div>
        </div>

        <div
          onClick={() => { setStatusFilter("Completed"); setTypeFilter("all"); setCurrentPage(1); }}
          className={`bg-white border p-3 rounded-xl shadow-2xs space-y-1 cursor-pointer transition-all hover:scale-[1.02] hover:shadow-md ${
            statusFilter.toLowerCase() === "completed" ? "border-emerald-600 ring-2 ring-emerald-500/20 bg-emerald-50/30" : "border-emerald-100"
          }`}
        >
          <span className="text-[10px] font-black uppercase text-emerald-600 font-mono tracking-wider">Completed</span>
          <div className="text-lg font-black text-emerald-700 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" /> {completedCount}
          </div>
        </div>

        <div
          onClick={() => { setTypeFilter("Bank Related"); setStatusFilter("all"); setCurrentPage(1); }}
          className={`bg-white border p-3 rounded-xl shadow-2xs space-y-1 cursor-pointer transition-all hover:scale-[1.02] hover:shadow-md ${
            typeFilter.toLowerCase() === "bank related" ? "border-indigo-600 ring-2 ring-indigo-500/20 bg-indigo-50/30" : "border-indigo-100"
          }`}
        >
          <span className="text-[10px] font-black uppercase text-indigo-600 font-mono tracking-wider">Bank</span>
          <div className="text-lg font-black text-indigo-900 flex items-center gap-1.5">
            <Building2 className="w-4 h-4 text-indigo-600" /> {bankCount}
          </div>
        </div>

        <div
          onClick={() => { setTypeFilter("NBFC"); setStatusFilter("all"); setCurrentPage(1); }}
          className={`bg-white border p-3 rounded-xl shadow-2xs space-y-1 cursor-pointer transition-all hover:scale-[1.02] hover:shadow-md ${
            typeFilter.toLowerCase() === "nbfc" ? "border-teal-600 ring-2 ring-teal-500/20 bg-teal-50/30" : "border-teal-100"
          }`}
        >
          <span className="text-[10px] font-black uppercase text-teal-600 font-mono tracking-wider">NBFC</span>
          <div className="text-lg font-black text-teal-900 flex items-center gap-1.5">
            <Building2 className="w-4 h-4 text-teal-600" /> {nbfcCount}
          </div>
        </div>
      </div>

      {/* Filter Bar with From - To Date Range */}
      <div className="bg-white border border-purple-200/80 p-3 rounded-xl shadow-2xs space-y-2.5">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search Box */}
          <div className="flex-1 min-w-[200px] relative">
            <Search className="w-4 h-4 absolute left-2.5 top-2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              placeholder="Search employee, bank, branch, AO, RBO, case..."
              className="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:border-purple-600"
            />
          </div>

          {/* Date Range Filter: From & To */}
          <div className="flex items-center gap-1.5 bg-purple-50/50 p-1.5 rounded-lg border border-purple-200">
            <Calendar className="w-3.5 h-3.5 text-purple-700" />
            <div className="flex items-center gap-1">
              <span className="text-[9px] font-bold uppercase text-slate-600">From:</span>
              <input
                type="date"
                value={fromDate}
                onChange={e => { setFromDate(e.target.value); setCurrentPage(1); }}
                className="border border-slate-300 rounded px-1.5 py-0.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-purple-600 bg-white"
              />
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[9px] font-bold uppercase text-slate-600">To:</span>
              <input
                type="date"
                value={toDate}
                onChange={e => { setToDate(e.target.value); setCurrentPage(1); }}
                className="border border-slate-300 rounded px-1.5 py-0.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-purple-600 bg-white"
              />
            </div>
            <div className="flex items-center gap-1 ml-1">
              <button
                onClick={() => setQuickDateRange("today")}
                className="text-[9px] font-extrabold bg-purple-100 text-purple-900 px-1.5 py-0.5 rounded hover:bg-purple-200"
              >
                Today
              </button>
              <button
                onClick={() => setQuickDateRange("week")}
                className="text-[9px] font-extrabold bg-purple-100 text-purple-900 px-1.5 py-0.5 rounded hover:bg-purple-200"
              >
                Week
              </button>
              <button
                onClick={() => setQuickDateRange("month")}
                className="text-[9px] font-extrabold bg-purple-100 text-purple-900 px-1.5 py-0.5 rounded hover:bg-purple-200"
              >
                Month
              </button>
              {(fromDate || toDate) && (
                <button
                  onClick={() => setQuickDateRange("clear")}
                  className="text-[9px] font-extrabold text-rose-600 hover:underline px-1"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Type Filter */}
          <div className="flex items-center gap-1">
            <label className="text-[10px] font-bold uppercase text-slate-500 font-mono">Type:</label>
            <select
              value={typeFilter}
              onChange={e => { setTypeFilter(e.target.value); setCurrentPage(1); }}
              className="border border-slate-300 rounded-lg p-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-purple-600 bg-white"
            >
              <option value="all">All Types</option>
              <option value="General">General</option>
              <option value="Bank Related">Bank Related</option>
              <option value="NBFC">NBFC</option>
              <option value="Call">Call (Incoming / Outgoing)</option>
              <option value="Field Visit">Field Visit</option>
              <option value="Others">Others</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1">
            <label className="text-[10px] font-bold uppercase text-slate-500 font-mono">Status:</label>
            <select
              value={statusFilter}
              onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1); }}
              className="border border-slate-300 rounded-lg p-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-purple-600 bg-white"
            >
              <option value="all">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Data Table with Compact Padding & Reduced Column Gaps */}
      <div className="bg-white border border-purple-200/80 rounded-xl shadow-2xs overflow-hidden">
        <div className="overflow-x-auto max-h-[750px] overflow-y-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 z-10 bg-purple-100/90 backdrop-blur-xs border-b border-purple-200">
              <tr className="text-purple-950 text-[10px] uppercase font-mono font-black">
                <th className="py-2.5 px-2 w-8">#</th>
                <th className="py-2.5 px-2 w-36">Employee</th>
                <th className="py-2.5 px-2 w-28">Date & Time</th>
                <th className="py-2.5 px-2 w-44">Work Section</th>
                <th className="py-2.5 px-2 w-28">Type & Sub-Type</th>
                <th className="py-2.5 px-2 w-44">Bank / Branch / Details</th>
                <th className="py-2.5 px-2">Remarks / Details</th>
                <th className="py-2.5 px-2 w-28">Status</th>
                <th className="py-2.5 px-2 w-32">Time Taken</th>
                <th className="py-2.5 px-2 w-14 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-purple-100 text-slate-800 font-semibold">
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-10 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-purple-600" />
                    Loading scheduled work database...
                  </td>
                </tr>
              ) : paginatedSchedules.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-10 text-center text-slate-400">
                    <AlertCircle className="w-7 h-7 mx-auto mb-2 text-purple-400 opacity-50" />
                    No scheduled work entries found matching your filters.
                  </td>
                </tr>
              ) : (
                paginatedSchedules.map((item, idx) => {
                  const globalIdx = (currentPage - 1) * itemsPerPage + idx + 1;
                  return (
                    <tr key={item.id || idx} className="hover:bg-purple-50/40 transition-colors">
                      <td className="py-1.5 px-2 font-mono text-slate-400 font-bold">{globalIdx}</td>

                      {/* Employee Column */}
                      <td className="py-1.5 px-2">
                        <div className="space-y-0.5">
                          <div className="font-bold text-slate-900 flex items-center gap-1 truncate">
                            <User className="w-3 h-3 text-purple-700 shrink-0" />
                            <span className="truncate">{item.user?.name || item.employeeId || "—"}</span>
                          </div>
                          {item.user?.role && (
                            <span className="bg-purple-100 text-purple-800 text-[9px] font-black px-1.5 py-0.2 rounded font-mono">
                              {item.user.role}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Date & Time Column */}
                      <td className="py-1.5 px-2 font-mono whitespace-nowrap">
                        <div className="space-y-0.5">
                          <span className="bg-purple-50 border border-purple-200 text-purple-950 font-black px-1.5 py-0.5 rounded text-[10px] block">
                            📅 {item.date}
                          </span>
                          <span className="text-purple-700 font-bold text-[10px] block">
                            ⏰ {item.time}
                          </span>
                        </div>
                      </td>

                      {/* Work Section Column */}
                      <td className="py-1.5 px-2 font-extrabold text-slate-900">
                        <div className="space-y-1">
                          <span className="line-clamp-2 block">
                            {(item.workSection === "Others" || item.workSection === "Other" || item.workSection === "others")
                              ? (item.customLocation || item.otherType || item.details || item.remarks || item.workSection)
                              : item.workSection}
                          </span>
                          {item.sodId ? (
                            <span className="bg-indigo-50 border border-indigo-200 text-indigo-700 text-[8.5px] font-black px-1.5 py-0.3 rounded inline-flex items-center gap-0.5 w-fit">
                              ✨ SOD Scheduled
                            </span>
                          ) : (
                            <span className="bg-slate-100 border border-slate-200 text-slate-600 text-[8.5px] font-bold px-1.5 py-0.3 rounded inline-flex items-center gap-0.5 w-fit">
                              📌 Direct Task
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Type Column */}
                      <td className="py-1.5 px-2 whitespace-nowrap">
                        <div className="space-y-0.5">
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-black inline-block ${
                            item.type === "Bank Related" || item.type === "NBFC"
                              ? "bg-purple-100 text-purple-800 border border-purple-200"
                              : item.type === "Field Visit"
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                              : item.type === "Others"
                              ? "bg-amber-100 text-amber-800 border border-amber-200"
                              : "bg-blue-100 text-blue-800 border border-blue-200"
                          }`}>
                            {item.type === "Others" && item.otherType ? `Others (${item.otherType})` : item.type}
                          </span>
                          {item.subType && (
                            <span className="bg-purple-200/60 text-purple-950 text-[9px] font-black px-1.5 py-0.2 rounded block w-fit">
                              {item.subType}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Bank / Branch / Officer / Details Column */}
                      <td className="py-1.5 px-2">
                        {(item.bankName || item.branchName || item.officerName || item.caseDetails || item.otherType || item.aoName || item.rboName) ? (
                          <div className="flex flex-wrap gap-1 text-[9px]">
                            {item.bankName && <span className="bg-slate-100 px-1 py-0.2 rounded border border-slate-200 font-bold text-slate-800">🏦 {item.bankName}</span>}
                            {item.branchName && <span className="bg-slate-100 px-1 py-0.2 rounded border border-slate-200 font-bold text-slate-800">🏢 {item.branchName}</span>}
                            {item.officerName && <span className="bg-purple-50 text-purple-900 px-1 py-0.2 rounded border border-purple-200 font-bold">👤 {item.officerName}{item.officerPhone ? ` (${item.officerPhone})` : ""}</span>}
                            {item.aoName && <span className="bg-slate-100 px-1 py-0.2 rounded border border-slate-200 font-bold text-slate-800">🏛️ {item.aoName}</span>}
                            {item.rboName && <span className="bg-slate-100 px-1 py-0.2 rounded border border-slate-200 font-bold text-slate-800">📍 {item.rboName}</span>}
                            {item.caseDetails && <span className="bg-rose-50 text-rose-800 px-1 py-0.2 rounded border border-rose-200 font-black">⚖️ {item.caseDetails}</span>}
                            {item.otherType && <span className="bg-emerald-50 text-emerald-800 px-1 py-0.2 rounded border border-emerald-200 font-bold">📍 Site: {item.otherType}</span>}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-[10px]">—</span>
                        )}
                      </td>

                      {/* Remarks Column & Attachment */}
                      <td className="py-1.5 px-2">
                        <div className="space-y-1">
                          <span className="text-slate-700 text-[10px] font-medium leading-tight block line-clamp-2">
                            {getCleanRemarks(item)}
                          </span>
                          {(() => {
                            const cleanNote = getCleanProgressNoteText(item.progressNotes || item.taskLog?.progressNotes || item.taskLog?.followUpHistory);
                            if (!cleanNote) return null;
                            return (
                              <div
                                onClick={() => setSelectedDetailItem(item)}
                                className="bg-amber-50 hover:bg-amber-100/90 border border-amber-200/90 text-amber-900 rounded p-1 text-[9px] font-medium leading-tight space-y-0.5 shadow-2xs cursor-pointer transition-colors group"
                                title="Click to open full task details & full progress note"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-bold text-amber-800 block">📝 Progress Note:</span>
                                  <span className="text-[8px] font-black text-purple-700 opacity-70 group-hover:opacity-100 flex items-center gap-0.5">
                                    <Eye className="w-2.5 h-2.5" /> Tap to expand
                                  </span>
                                </div>
                                <span className="text-slate-800 block line-clamp-2 whitespace-pre-line">
                                  {cleanNote}
                                </span>
                              </div>
                            );
                          })()}
                          {(() => {
                            const url = getCleanAttachmentUrl(item.proofAttachment || item.taskLog?.proofAttachment);
                            if (!url) return null;
                            return (
                              <a
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 bg-purple-100 hover:bg-purple-200 text-purple-900 text-[9px] font-black px-1.5 py-0.5 rounded border border-purple-300 transition-colors"
                              >
                                📎 View Attachment
                              </a>
                            );
                          })()}
                        </div>
                      </td>

                      {/* Status Column - Read-only badge mapped dynamically from My Tasks */}
                      <td className="py-1.5 px-2 whitespace-nowrap">
                        <span className={`text-[10px] font-black rounded-lg px-2 py-0.5 border inline-flex items-center gap-1 ${
                          item.status === "Completed"
                            ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                            : item.status === "In Progress"
                            ? "bg-blue-100 text-blue-800 border-blue-300"
                            : "bg-amber-100 text-amber-800 border-amber-300"
                        }`}>
                          {item.status === "Completed" ? "✅ Completed" : item.status === "In Progress" ? "⏳ In Progress" : "🕒 Pending"}
                        </span>
                      </td>

                      {/* Completion Time / Duration Column */}
                      <td className="py-1.5 px-2 whitespace-nowrap">
                        {formatTimeTaken(item)}
                      </td>

                      {/* Actions Column */}
                      <td className="py-1.5 px-2 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setSelectedDetailItem(item)}
                            className="text-purple-600 hover:text-purple-800 p-1 hover:bg-purple-100 rounded-lg transition-all"
                            title="View Full Task & Progress Note Details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteSchedule(item.id)}
                            className="text-rose-500 hover:text-rose-700 p-1 hover:bg-rose-50 rounded-lg transition-all"
                            title="Delete Scheduled Entry"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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

        {/* Table Footer Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-3 py-2 bg-purple-50/50 border-t border-purple-200 text-xs text-slate-600 font-semibold">
            <span>
              Showing {paginatedSchedules.length} of {filteredSchedules.length} Entries (Page {currentPage} of {totalPages})
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="p-1 rounded border border-slate-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-2 font-mono font-bold">{currentPage} / {totalPages}</span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="p-1 rounded border border-slate-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Task & Full Progress Note Detail Modal */}
      {selectedDetailItem && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl border border-purple-200 shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white p-4 flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold bg-white/20 px-2 py-0.5 rounded text-purple-100">
                    📅 {selectedDetailItem.date} {selectedDetailItem.time}
                  </span>
                  {selectedDetailItem.sodId ? (
                    <span className="bg-indigo-500/30 text-indigo-200 border border-indigo-400/40 text-[10px] font-black px-2 py-0.5 rounded">
                      ✨ SOD Scheduled Task
                    </span>
                  ) : (
                    <span className="bg-slate-700/50 text-slate-300 border border-slate-600/40 text-[10px] font-bold px-2 py-0.5 rounded">
                      📌 Direct Task
                    </span>
                  )}
                </div>
                <h2 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
                  <span>{selectedDetailItem.workSection}</span>
                </h2>
                <div className="text-xs text-purple-200 flex items-center gap-1 font-medium">
                  <User className="w-3.5 h-3.5 text-purple-300" />
                  <span>{selectedDetailItem.user?.name || selectedDetailItem.employeeId}</span>
                  {selectedDetailItem.user?.role && (
                    <span className="bg-purple-800/80 text-purple-100 text-[9px] font-bold px-1.5 py-0.2 rounded font-mono ml-1">
                      {selectedDetailItem.user.role}
                    </span>
                  )}
                </div>
              </div>

              <button
                onClick={() => setSelectedDetailItem(null)}
                className="p-1.5 rounded-full hover:bg-white/20 text-white/80 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4 flex-1 text-slate-800 text-xs">
              {/* Status & Category Info */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-purple-50/60 p-3 rounded-xl border border-purple-100">
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-500 block">Status</span>
                  <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-black mt-0.5 ${
                    selectedDetailItem.status === "Completed"
                      ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                      : selectedDetailItem.status === "In Progress"
                      ? "bg-blue-100 text-blue-800 border border-blue-300"
                      : "bg-amber-100 text-amber-800 border border-amber-300"
                  }`}>
                    {selectedDetailItem.status || "Pending"}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-500 block">Type</span>
                  <span className="font-bold text-slate-900 text-xs mt-0.5 block">
                    {selectedDetailItem.type} {selectedDetailItem.subType ? `(${selectedDetailItem.subType})` : ""}
                  </span>
                </div>

                {(selectedDetailItem.bankName || selectedDetailItem.branchName) && (
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-500 block">Bank / Branch</span>
                    <span className="font-bold text-purple-900 text-xs mt-0.5 block truncate">
                      {selectedDetailItem.bankName || "—"} {selectedDetailItem.branchName ? `(${selectedDetailItem.branchName})` : ""}
                    </span>
                  </div>
                )}
              </div>

              {/* Bank & Officer Extra Meta if available */}
              {(selectedDetailItem.aoName || selectedDetailItem.rboName || selectedDetailItem.officerName || selectedDetailItem.caseDetails) && (
                <div className="space-y-1.5 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">Additional Details</span>
                  <div className="flex flex-wrap gap-2 text-xs font-bold">
                    {selectedDetailItem.aoName && <span className="bg-white px-2 py-1 rounded border border-slate-300">🏛️ AO: {selectedDetailItem.aoName}</span>}
                    {selectedDetailItem.rboName && <span className="bg-white px-2 py-1 rounded border border-slate-300">📍 RBO: {selectedDetailItem.rboName}</span>}
                    {selectedDetailItem.officerName && <span className="bg-purple-50 text-purple-900 px-2 py-1 rounded border border-purple-200">👤 Officer: {selectedDetailItem.officerName}{selectedDetailItem.officerPhone ? ` (${selectedDetailItem.officerPhone})` : ""}</span>}
                    {selectedDetailItem.caseDetails && <span className="bg-rose-50 text-rose-800 px-2 py-1 rounded border border-rose-200">⚖️ Case: {selectedDetailItem.caseDetails}</span>}
                  </div>
                </div>
              )}

              {/* Initial Remarks / Details */}
              {getCleanRemarks(selectedDetailItem) !== "—" && (
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase text-slate-500 block">Task Description / Remarks</span>
                  <div className="bg-slate-100/80 p-3 rounded-xl border border-slate-200 text-slate-800 font-medium whitespace-pre-line leading-relaxed">
                    {getCleanRemarks(selectedDetailItem)}
                  </div>
                </div>
              )}

              {/* Full Progress Notes & Updates Section */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 block flex items-center gap-1">
                  📝 Full Progress Notes & History
                </span>
                {(() => {
                  const fullNote = getCleanProgressNoteText(
                    selectedDetailItem.progressNotes ||
                    selectedDetailItem.taskLog?.progressNotes ||
                    selectedDetailItem.taskLog?.followUpHistory
                  );
                  if (!fullNote) {
                    return (
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-slate-400 italic">
                        No progress notes added for this task yet.
                      </div>
                    );
                  }
                  return (
                    <div className="bg-amber-50/90 border border-amber-200/90 p-4 rounded-xl text-slate-900 text-xs font-normal leading-relaxed whitespace-pre-line shadow-2xs">
                      {fullNote}
                    </div>
                  );
                })()}
              </div>

              {/* Proof Attachment if available */}
              {(() => {
                const url = getCleanAttachmentUrl(selectedDetailItem.proofAttachment || selectedDetailItem.taskLog?.proofAttachment);
                if (!url) return null;
                return (
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[10px] font-bold uppercase text-slate-500 block">Proof Attachment</span>
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs px-3 py-2 rounded-xl transition-colors shadow-2xs"
                    >
                      📎 View Full Proof Attachment / Document
                    </a>
                  </div>
                );
              })()}
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 p-3 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setSelectedDetailItem(null)}
                className="bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold px-4 py-2 rounded-xl transition-colors"
              >
                Close Detail View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
