"use client";
import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import * as XLSX from "xlsx";
import { Download, Loader2, Search, X } from "lucide-react";

const money = (value: unknown) => Number(value || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const date = (value: unknown) => value ? new Date(String(value)).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).replace(/ /g, "-") : "";
const INITIAL_VISIBLE_ROWS = 200;
let registerClientCache: { rows: any[]; expiresAt: number } | null = null;

export default function BillsExcelViewModal({ onClose }: { onClose: () => void }) {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [company, setCompany] = useState("All");
  const [status, setStatus] = useState("All");
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_ROWS);
  useEffect(() => {
    if (registerClientCache && registerClientCache.expiresAt > Date.now()) {
      setRows(registerClientCache.rows); setLoading(false); return;
    }
    fetch("/api/legal-recovery/import-bills")
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          const nextRows = data.data || [];
          registerClientCache = { rows: nextRows, expiresAt: Date.now() + 30_000 };
          setRows(nextRows);
        }
      })
      .finally(() => setLoading(false));
  }, []);
  const companies = useMemo(() => Array.from(new Set(rows.map(row => String(row.company || "").trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b)), [rows]);
  const filtered = useMemo(() => rows.filter(row => {
    const q = query.toLowerCase();
    return (company === "All" || String(row.company) === company) && (status === "All" || row.status === status) && (!q || [row.company, row.bankName, row.branchName, row.branchCode, row.invoiceNo, row.remark].some(v => String(v || "").toLowerCase().includes(q)));
  }), [rows, query, company, status]);
  useEffect(() => { setVisibleCount(INITIAL_VISIBLE_ROWS); }, [query, company, status]);
  const visibleRows = useMemo(() => filtered.slice(0, visibleCount), [filtered, visibleCount]);
  const totals = useMemo(() => ({ bill: filtered.reduce((s, r) => s + Number(r.billAmount || 0), 0), received: filtered.filter(r => r.status === "Received").reduce((s, r) => s + Number(r.receivedAmount || 0), 0), tds: filtered.reduce((s, r) => s + Number(r.tdsAmount || 0), 0), due: filtered.filter(r => r.status === "Pending").reduce((s, r) => s + Number(r.dueAmount || 0), 0) }), [filtered]);
  const exportExcel = () => {
    const data = filtered.map(r => ({ Company: r.company, "Bill Date": date(r.billDate), "Invoice No.": r.invoiceNo, Bank: r.bankName, Branch: r.branchName, "Br. Code": r.branchCode, "Bill Amount": Number(r.billAmount), "Pmt Rect. Date": date(r.paymentReceivedDate), "Receive Amount": Number(r.receivedAmount), TDS: Number(r.tdsAmount), "TDS %": Number(r.tdsPercent), Due: Number(r.dueAmount), Remark: r.remark, Status: r.status, "Revenue Type": r.revenueType, "Revenue Amount": Number(r.revenueAmount), "Internal Remark": r.internalRemark, "Assigned To": r.assignedTo }));
    const wb = XLSX.utils.book_new(); const ws = XLSX.utils.json_to_sheet(data); ws["!cols"] = [12,15,22,28,32,13,16,18,18,12,10,16,28,14,20,18,30,20].map(w => ({ wch: w })); XLSX.utils.book_append_sheet(wb, ws, "Bills"); XLSX.writeFile(wb, `Legal_Recovery_Bill_Register_${new Date().toISOString().slice(0,10)}.xlsx`);
  };
  const columns = ["Company","Bill Date","Invoice No.","Bank","Branch","Br. Code","Bill Amount","Pmt Rect. Date","Receive Amount","TDS","TDS %","Due","Remark","Status","Revenue Type","Revenue Amount","Internal Remark","Assigned To"];
  const modal = <div className="fixed inset-0 z-[9999] bg-slate-950/55 backdrop-blur-[1px] p-2 sm:p-4 flex items-center justify-center"><div className="bg-white rounded-2xl shadow-2xl w-full max-w-[1850px] h-[calc(100vh-1rem)] sm:h-[calc(100vh-2rem)] overflow-hidden flex flex-col border border-white/60">
    <div className="px-5 py-4 border-b flex items-center justify-between bg-white"><div><h3 className="font-serif text-xl font-bold text-slate-900">Legal Recovery Bill Register</h3><p className="text-xs font-medium text-slate-500 mt-0.5">Excel View · Invoice-wise financial register</p></div><button onClick={onClose} className="p-2.5 hover:bg-slate-100 rounded-xl border border-transparent hover:border-slate-200" title="Close"><X className="w-5 h-5" /></button></div>
    <div className="p-3 border-b flex flex-wrap gap-2 items-center bg-slate-50/70"><div className="relative flex-1 min-w-64"><Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400"/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search company, bank, branch or invoice..." className="w-full bg-white border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-amber-300"/></div><span className="text-[10px] font-bold text-slate-500 whitespace-nowrap">Showing {Math.min(visibleCount, filtered.length)} of {filtered.length}</span><select aria-label="Filter by company" title="Company" value={company} onChange={e=>setCompany(e.target.value)} className="min-w-36 bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold"><option value="All">All Companies</option>{companies.map(name=><option key={name} value={name}>{name}</option>)}</select><select aria-label="Filter by status" title="Status" value={status} onChange={e=>setStatus(e.target.value)} className="min-w-32 bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold"><option value="All">All Statuses</option><option>Pending</option><option>Received</option><option>Cancelled</option></select><button onClick={exportExcel} className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-2"><Download className="w-4 h-4"/> Export Excel</button></div>
    <div className="grid grid-cols-2 md:grid-cols-5 gap-px border-b bg-slate-200"><div className="bg-white px-4 py-3"><small className="text-[10px] font-bold uppercase text-slate-500">Rows</small><b className="block text-lg text-slate-900">{filtered.length}</b></div><div className="bg-white px-4 py-3"><small className="text-[10px] font-bold uppercase text-slate-500">Total Bill</small><b className="block text-lg text-slate-900">₹{money(totals.bill)}</b></div><div className="bg-emerald-50 px-4 py-3"><small className="text-[10px] font-bold uppercase text-emerald-700">Received</small><b className="block text-lg text-emerald-700">₹{money(totals.received)}</b></div><div className="bg-white px-4 py-3"><small className="text-[10px] font-bold uppercase text-slate-500">TDS</small><b className="block text-lg text-slate-900">₹{money(totals.tds)}</b></div><div className="bg-rose-50 px-4 py-3"><small className="text-[10px] font-bold uppercase text-rose-700">Pending</small><b className="block text-lg text-rose-700">₹{money(totals.due)}</b></div></div>
    <div className="flex-1 min-h-0 overflow-auto bg-white">{loading ? <div className="h-full flex items-center justify-center gap-2 font-bold text-slate-500"><Loader2 className="animate-spin"/>Loading bills...</div> : <table className="min-w-[2200px] w-full text-[11px]"><thead className="sticky top-0 z-20 bg-amber-300 text-slate-950 shadow-sm"><tr>{columns.map(c=><th key={c} className="border border-amber-500/60 px-3 py-2.5 text-left font-black whitespace-nowrap">{c}</th>)}</tr></thead><tbody>{visibleRows.map(r=><tr key={r.id} className={`${r.status === "Pending" ? "bg-rose-50/70" : r.status === "Received" ? "bg-emerald-50/70" : "bg-slate-50"} hover:bg-amber-50`}><td className="border p-2 font-bold">{r.company}</td><td className="border p-2 whitespace-nowrap">{date(r.billDate)}</td><td className="border p-2 font-bold whitespace-nowrap">{r.invoiceNo}</td><td className="border p-2 font-semibold">{r.bankName}</td><td className="border p-2">{r.branchName}</td><td className="border p-2">{r.branchCode}</td><td className="border p-2 text-right font-bold">{money(r.billAmount)}</td><td className="border p-2 whitespace-nowrap">{date(r.paymentReceivedDate)}</td><td className="border p-2 text-right text-emerald-700 font-bold">{money(r.receivedAmount)}</td><td className="border p-2 text-right">{money(r.tdsAmount)}</td><td className="border p-2 text-right">{Number(r.tdsPercent || 0)}</td><td className="border p-2 text-right font-bold">{money(r.dueAmount)}</td><td className="border p-2">{r.remark}</td><td className="border p-2 font-bold">{r.status}</td><td className="border p-2">{r.revenueType}</td><td className="border p-2 text-right">{money(r.revenueAmount)}</td><td className="border p-2">{r.internalRemark}</td><td className="border p-2">{r.assignedTo}</td></tr>)}{visibleCount < filtered.length && <tr><td colSpan={columns.length} className="border p-4 text-center bg-white"><button type="button" onClick={() => setVisibleCount(count => count + INITIAL_VISIBLE_ROWS)} className="rounded-lg bg-slate-900 px-5 py-2 text-xs font-bold text-white hover:bg-slate-700">Load next {Math.min(INITIAL_VISIBLE_ROWS, filtered.length - visibleCount)} rows</button></td></tr>}</tbody></table>}</div>
  </div></div>;
  return typeof document !== "undefined" ? createPortal(modal, document.body) : null;
}
