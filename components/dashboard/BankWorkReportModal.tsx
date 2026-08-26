"use client";

import React, { useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { AlertTriangle, Building2, CalendarDays, CheckCircle2, ChevronRight, Clock3, Download, FileText, Printer, Search, UserRound, X } from "lucide-react";

type ReportTask = {
  id: string;
  taskTitle?: string;
  taskType?: string;
  description?: string;
  progressNotes?: string;
  status?: string;
  date?: string;
  createdAt?: string;
  scheduledAt?: string | null;
  deadlineAt?: string | null;
  proofAttachment?: string | null;
  forwardedTo?: string | null;
  forwardedUser?: { id?: string; name?: string; role?: string } | null;
  employee?: { id?: string; name?: string; role?: string } | null;
};

type Bank = { id: string | number; bankName: string; bankCode?: string };
type Staff = { id: string; name: string; role?: string };

const readDetail = (description: string | undefined, label: string) => {
  const line = String(description || "").split("\n").find(item => item.toLowerCase().startsWith(`${label.toLowerCase()}:`));
  return line ? line.slice(line.indexOf(":") + 1).trim() : "";
};

const displayDate = (value?: string | null) => {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const statusStyle: Record<string, string> = {
  Pending: "bg-amber-50 text-amber-700 border-amber-200",
  "In Progress": "bg-blue-50 text-blue-700 border-blue-200",
  Completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

export default function BankWorkReportModal({ open, onClose, tasks, banks, staff, embedded = false }: { open: boolean; onClose: () => void; tasks: ReportTask[]; banks: Bank[]; staff: Staff[]; embedded?: boolean }) {
  const [bankName, setBankName] = useState("");
  const [status, setStatus] = useState("");
  const [staffId, setStaffId] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [query, setQuery] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("");

  const parseBankInfoFromTask = (task: ReportTask) => {
    let bName = (task as any).bankName || readDetail(task.description, "Bank");
    let brName = (task as any).branchName || readDetail(task.description, "Branch");

    if (!bName && task.taskTitle && task.taskTitle.toLowerCase().includes("bank:")) {
      const match = task.taskTitle.match(/bank:\s*([^-]+)(?:\s*-\s*([^(]+))?/i);
      if (match) {
        bName = match[1]?.trim() || "";
        if (!brName && match[2]) {
          brName = match[2]?.trim() || "General Branch";
        }
      }
    }

    return {
      bankName: bName || "",
      branchName: brName || (bName ? "General Branch" : "")
    };
  };

  const reportRows = useMemo(() => tasks.map(task => {
    const { bankName: bName, branchName: brName } = parseBankInfoFromTask(task);
    return {
      ...task,
      bankName: bName,
      branchName: brName,
      category: readDetail(task.description, "Related Category") || (task as any).category || "General",
      callbackDate: readDetail(task.description, "Call Back Date") || task.deadlineAt || (task as any).scheduledAt || "",
      employeeId: String(task.employee?.id || ""),
      employeeName: task.employee?.name || "Unknown Staff",
      forwardedName: task.forwardedUser?.name || staff.find(person => String(person.id) === String(task.forwardedTo))?.name || "-",
    };
  }).filter(task => {
    if (!task.bankName) return false;
    if (bankName && !task.bankName.toLowerCase().includes(bankName.toLowerCase()) && !bankName.toLowerCase().includes(task.bankName.toLowerCase())) return false;
    if (status && task.status !== status) return false;
    if (staffId && task.employeeId !== staffId) return false;
    const taskDate = String(task.date || task.createdAt || "").slice(0, 10);
    if (fromDate && taskDate < fromDate) return false;
    if (toDate && taskDate > toDate) return false;
    const searchText = `${task.branchName} ${task.taskTitle} ${task.description}`.toLowerCase();
    return !query || searchText.includes(query.toLowerCase());
  }), [tasks, bankName, status, staffId, fromDate, toDate, query, staff]);

  const branchRows = useMemo(() => {
    const grouped = new Map<string, typeof reportRows>();
    reportRows.forEach(task => grouped.set(task.branchName, [...(grouped.get(task.branchName) || []), task]));
    return Array.from(grouped.entries()).map(([branch, items]) => ({
      branch,
      items,
      total: items.length,
      pending: items.filter(item => item.status === "Pending").length,
      inProgress: items.filter(item => item.status === "In Progress").length,
      completed: items.filter(item => item.status === "Completed").length,
      general: items.filter(item => item.category === "General").length,
      branchRelated: items.filter(item => item.category === "Branch Related").length,
      caseRelated: items.filter(item => item.category === "Case Related").length,
      lastActivity: items.map(item => String(item.date || item.createdAt || "")).sort().reverse()[0],
    })).sort((a, b) => b.total - a.total || a.branch.localeCompare(b.branch));
  }, [reportRows]);

  const reportStaff = useMemo(() => {
    const people = new Map(staff.map(person => [String(person.id), person]));
    tasks.forEach(task => {
      if (task.employee?.id) people.set(String(task.employee.id), { id: String(task.employee.id), name: task.employee.name || "Unknown Staff", role: task.employee.role });
    });
    return Array.from(people.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [staff, tasks]);

  const overdueCallbacks = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return reportRows.filter(task => {
      if (!task.callbackDate || task.status === "Completed") return false;
      const callback = new Date(task.callbackDate);
      return !Number.isNaN(callback.getTime()) && callback < today;
    }).sort((a, b) => new Date(a.callbackDate).getTime() - new Date(b.callbackDate).getTime());
  }, [reportRows]);

  const monthlyActivity = useMemo(() => {
    const now = new Date();
    const months = Array.from({ length: 6 }, (_, offset) => {
      const date = new Date(now.getFullYear(), now.getMonth() - (5 - offset), 1);
      return { key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`, label: date.toLocaleDateString("en-IN", { month: "short" }), count: 0 };
    });
    reportRows.forEach(task => {
      const date = new Date(task.date || task.createdAt || "");
      const key = Number.isNaN(date.getTime()) ? "" : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const month = months.find(item => item.key === key);
      if (month) month.count += 1;
    });
    return months;
  }, [reportRows]);

  if (!open) return null;
  const activeBranch = branchRows.find(row => row.branch === selectedBranch);
  const uniqueBankNames = Array.from(new Set(banks.map(bank => bank.bankName).filter(Boolean))).sort();
  const clearFilters = () => { setStatus(""); setStaffId(""); setFromDate(""); setToDate(""); setQuery(""); };
  const exportReport = () => {
    const rows = reportRows.map(task => ({ Bank: task.bankName, Branch: task.branchName, Category: task.category, Task: task.taskTitle || "", Status: task.status || "", "Work Date": displayDate(task.date || task.createdAt), Staff: task.employeeName, "Progress Notes": task.progressNotes || "", "Callback Date": displayDate(task.callbackDate), "Forwarded To": task.forwardedName, Proof: task.proofAttachment || "" }));
    const sheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, "Bank Work Report");
    XLSX.writeFile(workbook, `${bankName || "Bank"}-Work-Report.xlsx`);
  };

  return <div className={embedded ? "w-full" : "fixed inset-0 z-[10000] bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-3"} onMouseDown={event => { if (!embedded && event.target === event.currentTarget) onClose(); }}>
    <div className={embedded ? "bg-slate-50 rounded-2xl border w-full min-h-[calc(100vh-9rem)] overflow-hidden" : "bg-slate-50 rounded-2xl shadow-2xl w-full max-w-7xl max-h-[94vh] overflow-y-auto"}>
      <div className="sticky top-0 z-20 bg-white border-b px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3"><span className="p-2 rounded-xl bg-purple-50 text-[#714B67]"><Building2 className="w-5 h-5" /></span><div><h2 className="font-black text-slate-900">Bank Work Report</h2><p className="text-[10px] text-slate-500">Bank- and branch-wise task activity dashboard</p></div></div>
        <div className="flex items-center gap-2"><button type="button" disabled={!reportRows.length} onClick={exportReport} className="flex items-center gap-1.5 border rounded-lg px-3 py-2 text-[10px] font-black text-slate-600 hover:bg-slate-50 disabled:opacity-40"><Download className="w-3.5 h-3.5" /> Excel</button><button type="button" disabled={!reportRows.length} onClick={() => window.print()} className="flex items-center gap-1.5 border rounded-lg px-3 py-2 text-[10px] font-black text-slate-600 hover:bg-slate-50 disabled:opacity-40"><Printer className="w-3.5 h-3.5" /> Print</button>{!embedded && <button type="button" onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5 text-slate-500" /></button>}</div>
      </div>

      <div className="p-5 space-y-4">
        <div className="bg-white border rounded-2xl p-4 grid md:grid-cols-6 gap-3 shadow-sm">
          <label className="md:col-span-2 text-[10px] font-black text-slate-600">BANK *<select value={bankName} onChange={event => { setBankName(event.target.value); setSelectedBranch(""); }} className="mt-1 w-full border rounded-lg p-2.5 text-xs bg-white"><option value="">Select bank</option>{uniqueBankNames.map(name => <option key={name} value={name}>{name}</option>)}</select></label>
          <label className="text-[10px] font-black text-slate-600">STATUS<select value={status} onChange={event => setStatus(event.target.value)} className="mt-1 w-full border rounded-lg p-2.5 text-xs bg-white"><option value="">All statuses</option><option>Pending</option><option>In Progress</option><option>Completed</option></select></label>
          <label className="text-[10px] font-black text-slate-600">STAFF<select value={staffId} onChange={event => setStaffId(event.target.value)} className="mt-1 w-full border rounded-lg p-2.5 text-xs bg-white"><option value="">All staff</option>{reportStaff.map(person => <option key={person.id} value={person.id}>{person.name}</option>)}</select></label>
          <label className="text-[10px] font-black text-slate-600">FROM DATE<input type="date" value={fromDate} onChange={event => setFromDate(event.target.value)} className="mt-1 w-full border rounded-lg p-2 text-xs bg-white" /></label>
          <label className="text-[10px] font-black text-slate-600">TO DATE<input type="date" value={toDate} onChange={event => setToDate(event.target.value)} className="mt-1 w-full border rounded-lg p-2 text-xs bg-white" /></label>
          <label className="md:col-span-5 relative"><Search className="absolute left-3 bottom-2.5 w-4 h-4 text-slate-400" /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search branch, task or work details..." className="w-full border rounded-lg py-2.5 pl-9 pr-3 text-xs bg-white" /></label>
          <button type="button" onClick={clearFilters} className="border rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50">Clear filters</button>
        </div>

        {!bankName ? <div className="bg-white border border-dashed rounded-2xl py-20 text-center"><Building2 className="w-10 h-10 mx-auto text-slate-300 mb-3" /><h3 className="font-black text-slate-700">Select a bank</h3><p className="text-xs text-slate-400 mt-1">The selected bank&apos;s branch-wise work summary will appear here.</p></div> : <>
          <div className="grid sm:grid-cols-4 gap-3">
            {[{ label: "Branches", value: branchRows.length, icon: Building2, color: "text-purple-700 bg-purple-50" }, { label: "Total Tasks", value: reportRows.length, icon: FileText, color: "text-slate-700 bg-slate-100" }, { label: "In Progress", value: reportRows.filter(row => row.status === "In Progress").length, icon: Clock3, color: "text-blue-700 bg-blue-50" }, { label: "Completed", value: reportRows.filter(row => row.status === "Completed").length, icon: CheckCircle2, color: "text-emerald-700 bg-emerald-50" }].map(item => <div key={item.label} className="bg-white border rounded-xl p-4 flex items-center gap-3 shadow-sm"><span className={`p-2.5 rounded-xl ${item.color}`}><item.icon className="w-5 h-5" /></span><div><p className="text-2xl font-black text-slate-900">{item.value}</p><p className="text-[10px] uppercase font-black text-slate-400">{item.label}</p></div></div>)}
          </div>

          <div className="grid lg:grid-cols-3 gap-4">
            <section className="lg:col-span-2 bg-white border rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-4"><div><h3 className="text-sm font-black text-slate-800">Monthly Activity</h3><p className="text-[10px] text-slate-400">Last 6 months task volume</p></div><span className="text-[10px] font-black text-[#714B67]">{reportRows.length} total</span></div>
              <div className="h-36 flex items-end gap-3 border-b border-slate-100 pb-1">{monthlyActivity.map(month => { const max = Math.max(1, ...monthlyActivity.map(item => item.count)); return <div key={month.key} className="flex-1 h-full flex flex-col justify-end items-center gap-1"><span className="text-[10px] font-black text-slate-600">{month.count}</span><div className="w-full max-w-12 rounded-t-md bg-gradient-to-t from-[#714B67] to-purple-300 min-h-1 transition-all" style={{ height: `${Math.max(4, (month.count / max) * 100)}%` }} /><span className="text-[9px] font-bold text-slate-400">{month.label}</span></div>; })}</div>
            </section>
            <section className="bg-white border rounded-2xl p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-3"><span className="p-2 bg-rose-50 rounded-lg text-rose-600"><AlertTriangle className="w-4 h-4" /></span><div><h3 className="text-sm font-black text-slate-800">Overdue Callbacks</h3><p className="text-[10px] text-slate-400">Pending follow-ups past date</p></div><span className="ml-auto bg-rose-100 text-rose-700 rounded-full px-2 py-1 text-[10px] font-black">{overdueCallbacks.length}</span></div>
              <div className="space-y-2 max-h-28 overflow-y-auto">{overdueCallbacks.slice(0, 5).map(task => <button type="button" key={task.id} onClick={() => setSelectedBranch(task.branchName)} className="w-full text-left border rounded-lg p-2 hover:bg-rose-50"><p className="text-[11px] font-black truncate text-slate-700">{task.taskTitle}</p><p className="text-[9px] text-rose-600 mt-0.5">{task.branchName} · {displayDate(task.callbackDate)}</p></button>)}{!overdueCallbacks.length && <div className="py-6 text-center text-[11px] text-slate-400">No overdue callback</div>}</div>
            </section>
          </div>

          <div className="bg-white border rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead className="bg-slate-50 text-[10px] uppercase text-slate-500"><tr><th className="p-3">Branch</th><th className="p-3 text-center">Tasks</th><th className="p-3 text-center">Pending</th><th className="p-3 text-center">In Progress</th><th className="p-3 text-center">Completed</th><th className="p-3 min-w-36">Completion</th><th className="p-3">Category breakup</th><th className="p-3">Last activity</th><th className="p-3"></th></tr></thead><tbody className="divide-y">{branchRows.map(row => { const completion = row.total ? Math.round((row.completed / row.total) * 100) : 0; return <tr key={row.branch} className="hover:bg-purple-50/40 cursor-pointer" onClick={() => setSelectedBranch(row.branch)}><td className="p-3 font-black text-slate-800">{row.branch}</td><td className="p-3 text-center font-black">{row.total}</td><td className="p-3 text-center text-amber-700">{row.pending}</td><td className="p-3 text-center text-blue-700">{row.inProgress}</td><td className="p-3 text-center text-emerald-700">{row.completed}</td><td className="p-3"><div className="flex items-center gap-2"><div className="h-1.5 flex-1 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-emerald-500 rounded-full" style={{ width: `${completion}%` }} /></div><span className="text-[10px] font-black text-slate-500">{completion}%</span></div></td><td className="p-3"><div className="flex flex-wrap gap-1"><span className="bg-slate-100 rounded px-1.5 py-1">General {row.general}</span><span className="bg-purple-50 text-purple-700 rounded px-1.5 py-1">Branch {row.branchRelated}</span><span className="bg-rose-50 text-rose-700 rounded px-1.5 py-1">Case {row.caseRelated}</span></div></td><td className="p-3 text-slate-500">{displayDate(row.lastActivity)}</td><td className="p-3"><ChevronRight className="w-4 h-4 text-slate-400" /></td></tr>; })}</tbody></table></div>
            {branchRows.length === 0 && <div className="py-16 text-center text-sm text-slate-400">No branch work records match the selected filters.</div>}
          </div>
        </>}
      </div>
    </div>

    {activeBranch && <div className="fixed inset-0 z-[10001] bg-slate-950/40 flex justify-end" onMouseDown={event => { if (event.target === event.currentTarget) setSelectedBranch(""); }}><div className="bg-white w-full max-w-2xl h-full overflow-y-auto shadow-2xl"><div className="sticky top-0 bg-white z-10 border-b p-5 flex justify-between"><div><p className="text-[10px] uppercase font-black text-[#714B67]">{bankName}</p><h3 className="font-black text-xl text-slate-900">{activeBranch.branch}</h3><p className="text-xs text-slate-500 mt-1">{activeBranch.total} work record(s)</p></div><button type="button" onClick={() => setSelectedBranch("")}><X className="w-5 h-5 text-slate-500" /></button></div><div className="p-5 space-y-3">{activeBranch.items.map(task => <article key={task.id} className="border rounded-xl p-4 space-y-3"><div className="flex gap-3 justify-between"><div><p className="text-[10px] font-black text-[#714B67]">{task.category}</p><h4 className="font-black text-slate-900 mt-1">{task.taskTitle || "Untitled task"}</h4></div><span className={`h-fit border rounded-full px-2 py-1 text-[10px] font-black ${statusStyle[task.status || ""] || "bg-slate-50 text-slate-600"}`}>{task.status || "-"}</span></div><p className="text-xs text-slate-600 whitespace-pre-line">{task.description || "No work details"}</p><div className="grid sm:grid-cols-2 gap-2 text-[11px] text-slate-500"><span className="flex gap-1.5"><CalendarDays className="w-3.5 h-3.5" /> Work: {displayDate(task.date || task.createdAt)}</span><span className="flex gap-1.5"><UserRound className="w-3.5 h-3.5" /> Staff: {task.employeeName}</span><span>Callback: {displayDate(task.callbackDate)}</span><span>Forwarded to: {task.forwardedName}</span></div>{task.progressNotes && <div className="bg-slate-50 rounded-lg p-3 text-xs"><b>Progress:</b> {task.progressNotes}</div>}{task.proofAttachment && <a href={task.proofAttachment} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs font-black text-[#714B67] hover:underline"><FileText className="w-3.5 h-3.5" /> View proof</a>}</article>)}</div></div></div>}
  </div>;
}
