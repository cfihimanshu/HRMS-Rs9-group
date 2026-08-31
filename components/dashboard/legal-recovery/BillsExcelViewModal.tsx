"use client";
import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import * as XLSX from "xlsx";
import { Download, Edit2, Loader2, Search, X } from "lucide-react";

const money = (value: unknown) => Number(value || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const date = (value: unknown) => value ? new Date(String(value)).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).replace(/ /g, "-") : "";
const INITIAL_VISIBLE_ROWS = 200;

export default function BillsExcelViewModal({ onClose }: { onClose: () => void }) {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [company, setCompany] = useState("All");
  const [status, setStatus] = useState("All");
  const [poc, setPoc] = useState("All");
  const [editingRow, setEditingRow] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({ billDate: "", billAmount: "", paymentReceivedDate: "", receivedAmount: "", tdsAmount: "", tdsPercent: "", remark: "", status: "Pending", internalRemark: "" });
  const [savingEdit, setSavingEdit] = useState(false);
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_ROWS);
  useEffect(() => {
    fetch("/api/legal-recovery/import-bills?refresh=1", { cache: "no-store" })
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          const nextRows = data.data || [];
          setRows(nextRows);
        }
      })
      .finally(() => setLoading(false));
  }, []);
  const companies = useMemo(() => Array.from(new Set(rows.map(row => String(row.company || "").trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b)), [rows]);
  const pocs = useMemo(() => Array.from(new Set(rows.map(row => String(row.pocName || "Not Assigned").trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b)), [rows]);
  const statusCounts = useMemo(() => {
    const q = query.toLowerCase();
    const matchingRows = rows.filter(row => (company === "All" || String(row.company) === company) && (poc === "All" || String(row.pocName || "Not Assigned") === poc) && (!q || [row.company, row.bankName, row.branchName, row.branchCode, row.invoiceNo, row.remark, row.pocName].some(v => String(v || "").toLowerCase().includes(q))));
    return {
      All: matchingRows.length,
      Pending: matchingRows.filter(row => row.status === "Pending").length,
      Received: matchingRows.filter(row => row.status === "Received").length,
      Cancelled: matchingRows.filter(row => row.status === "Cancelled").length,
    };
  }, [rows, query, company, poc]);
  const filtered = useMemo(() => rows.filter(row => {
    const q = query.toLowerCase();
    return (company === "All" || String(row.company) === company) && (poc === "All" || String(row.pocName || "Not Assigned") === poc) && (status === "All" || row.status === status) && (!q || [row.company, row.bankName, row.branchName, row.branchCode, row.invoiceNo, row.remark, row.pocName].some(v => String(v || "").toLowerCase().includes(q)));
  }), [rows, query, company, status, poc]);
  useEffect(() => { setVisibleCount(INITIAL_VISIBLE_ROWS); }, [query, company, status, poc]);
  const visibleRows = useMemo(() => filtered.slice(0, visibleCount), [filtered, visibleCount]);
  const totals = useMemo(() => ({ bill: filtered.reduce((s, r) => s + Number(r.billAmount || 0), 0), received: filtered.filter(r => r.status === "Received").reduce((s, r) => s + Number(r.receivedAmount || 0), 0), tds: filtered.reduce((s, r) => s + Number(r.tdsAmount || 0), 0), due: filtered.filter(r => r.status === "Pending").reduce((s, r) => s + Number(r.dueAmount || 0), 0) }), [filtered]);
  const exportExcel = () => {
    const data = filtered.map(r => ({ Company: r.company, "Bill Date": date(r.billDate), "Invoice No.": r.invoiceNo, Bank: r.bankName, Branch: r.branchName, "Br. Code": r.branchCode, "POC Employee": r.pocName || "Not Assigned", "Bill Amount": Number(r.billAmount), "Pmt Rect. Date": date(r.paymentReceivedDate), "Receive Amount": Number(r.receivedAmount), TDS: Number(r.tdsAmount), "TDS %": Number(r.tdsPercent), Due: Number(r.dueAmount), Remark: r.remark, Status: r.status, "Revenue Type": r.revenueType, "Revenue Amount": Number(r.revenueAmount), "Internal Remark": r.internalRemark, "Assigned To": r.assignedTo }));
    const wb = XLSX.utils.book_new(); const ws = XLSX.utils.json_to_sheet(data); ws["!cols"] = [12,15,22,28,32,13,22,16,18,18,12,10,16,28,14,20,18,30,20].map(w => ({ wch: w })); XLSX.utils.book_append_sheet(wb, ws, "Bills"); XLSX.writeFile(wb, `Legal_Recovery_Bill_Register_${new Date().toISOString().slice(0,10)}.xlsx`);
  };
  const openEdit = (row: any) => {
    setEditingRow(row);
    setEditForm({
      billDate: String(row.billDate || "").slice(0, 10),
      billAmount: String(row.billAmount ?? ""),
      paymentReceivedDate: String(row.paymentReceivedDate || "").slice(0, 10),
      receivedAmount: String(row.receivedAmount ?? ""),
      tdsAmount: String(row.tdsAmount ?? ""),
      tdsPercent: String(row.tdsPercent ?? ""),
      remark: row.remark || "",
      status: row.status || "Pending",
      internalRemark: row.internalRemark || ""
    });
  };
  const saveEdit = async () => {
    if (!editingRow || savingEdit) return;
    setSavingEdit(true);
    try {
      const response = await fetch("/api/legal-recovery/import-bills", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: editingRow.id, ...editForm }) });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || "Invoice update failed");
      setRows(current => current.map(row => row.id === editingRow.id ? { ...row, ...result.data } : row));
      setEditingRow(null);
    } catch (error: any) {
      alert(error.message || "Invoice update failed");
    } finally {
      setSavingEdit(false);
    }
  };
  const columns = ["Company","Bill Date","Invoice No.","Bank","Branch","Br. Code","POC Employee","Bill Amount","Pmt Rect. Date","Receive Amount","TDS","TDS %","Due","Remark","Status","Revenue Type","Revenue Amount","Internal Remark","Assigned To","Actions"];
  const modal = <div className="fixed inset-0 z-[9999] bg-slate-950/55 backdrop-blur-[1px] p-2 sm:p-4 flex items-center justify-center"><div className="bg-white rounded-2xl shadow-2xl w-full max-w-[1850px] h-[calc(100vh-1rem)] sm:h-[calc(100vh-2rem)] overflow-hidden flex flex-col border border-white/60">
    <div className="px-5 py-4 border-b flex items-center justify-between bg-white"><div><h3 className="font-serif text-xl font-bold text-slate-900">Legal Recovery Bill Register</h3><p className="text-xs font-medium text-slate-500 mt-0.5">Excel View · Invoice-wise financial register</p></div><button onClick={onClose} className="p-2.5 hover:bg-slate-100 rounded-xl border border-transparent hover:border-slate-200" title="Close"><X className="w-5 h-5" /></button></div>
    <div className="p-3 border-b bg-slate-50/70 space-y-2.5"><div className="flex flex-wrap gap-2 items-center"><div className="relative flex-1 min-w-64"><Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400"/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search company, bank, branch, invoice or POC..." className="w-full bg-white border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-amber-300"/></div><span className="text-[10px] font-bold text-slate-500 whitespace-nowrap">Showing {Math.min(visibleCount, filtered.length)} of {filtered.length}</span><select aria-label="Filter by company" title="Company" value={company} onChange={e=>setCompany(e.target.value)} className="min-w-36 bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold"><option value="All">All Companies</option>{companies.map(name=><option key={name} value={name}>{name}</option>)}</select><select aria-label="Filter by POC employee" title="POC Employee" value={poc} onChange={e=>setPoc(e.target.value)} className="min-w-44 bg-white border border-violet-200 rounded-lg px-3 py-2 text-xs font-semibold text-violet-800"><option value="All">All POC Employees</option>{pocs.map(name=><option key={name} value={name}>{name}</option>)}</select><button onClick={exportExcel} className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-2"><Download className="w-4 h-4"/> Export Excel</button></div><div className="flex flex-wrap items-center gap-2"><span className="text-[10px] font-black uppercase tracking-wide text-slate-600 mr-1">Invoice Status:</span>{(["All", "Pending", "Received", "Cancelled"] as const).map(item => { const active = status === item; const tone = item === "Pending" ? "border-rose-200 text-rose-700 bg-rose-50" : item === "Received" ? "border-emerald-200 text-emerald-700 bg-emerald-50" : item === "Cancelled" ? "border-slate-300 text-slate-700 bg-slate-100" : "border-blue-200 text-blue-700 bg-blue-50"; return <button key={item} type="button" onClick={() => setStatus(item)} aria-pressed={active} className={`rounded-full border px-3 py-1.5 text-[10px] font-black transition ${tone} ${active ? "ring-2 ring-offset-1 ring-[#714B67] shadow-sm" : "opacity-75 hover:opacity-100"}`}>{item === "All" ? "All Invoices" : item} <span className="ml-1 rounded-full bg-white/80 px-1.5 py-0.5">{statusCounts[item]}</span></button>})}</div></div>
    <div className="grid grid-cols-2 md:grid-cols-5 gap-px border-b bg-slate-200"><div className="bg-white px-4 py-3"><small className="text-[10px] font-bold uppercase text-slate-500">Rows</small><b className="block text-lg text-slate-900">{filtered.length}</b></div><div className="bg-white px-4 py-3"><small className="text-[10px] font-bold uppercase text-slate-500">Total Bill</small><b className="block text-lg text-slate-900">₹{money(totals.bill)}</b></div><div className="bg-emerald-50 px-4 py-3"><small className="text-[10px] font-bold uppercase text-emerald-700">Received</small><b className="block text-lg text-emerald-700">₹{money(totals.received)}</b></div><div className="bg-white px-4 py-3"><small className="text-[10px] font-bold uppercase text-slate-500">TDS</small><b className="block text-lg text-slate-900">₹{money(totals.tds)}</b></div><div className="bg-rose-50 px-4 py-3"><small className="text-[10px] font-bold uppercase text-rose-700">Pending</small><b className="block text-lg text-rose-700">₹{money(totals.due)}</b></div></div>
    <div className="flex-1 min-h-0 overflow-auto bg-white">{loading ? <div className="h-full flex items-center justify-center gap-2 font-bold text-slate-500"><Loader2 className="animate-spin"/>Loading bills...</div> : <table className="min-w-[2450px] w-full text-[11px]"><thead className="sticky top-0 z-20 bg-amber-300 text-slate-950 shadow-sm"><tr>{columns.map(c=><th key={c} className="border border-amber-500/60 px-3 py-2.5 text-left font-black whitespace-nowrap">{c}</th>)}</tr></thead><tbody>{visibleRows.map(r=><tr key={r.id} className={`${r.status === "Pending" ? "bg-rose-50/70" : r.status === "Received" ? "bg-emerald-50/70" : "bg-slate-50"} hover:bg-amber-50`}><td className="border p-2 font-bold">{r.company}</td><td className="border p-2 whitespace-nowrap">{date(r.billDate)}</td><td className="border p-2 font-bold whitespace-nowrap">{r.invoiceNo}</td><td className="border p-2 font-semibold">{r.bankName}</td><td className="border p-2">{r.branchName}</td><td className="border p-2">{r.branchCode}</td><td className="border p-2 font-bold text-violet-700">{r.pocName || "Not Assigned"}</td><td className="border p-2 text-right font-bold">{money(r.billAmount)}</td><td className="border p-2 whitespace-nowrap">{date(r.paymentReceivedDate)}</td><td className="border p-2 text-right text-emerald-700 font-bold">{money(r.receivedAmount)}</td><td className="border p-2 text-right">{money(r.tdsAmount)}</td><td className="border p-2 text-right">{Number(r.tdsPercent || 0)}</td><td className="border p-2 text-right font-bold">{money(r.dueAmount)}</td><td className="border p-2">{r.remark}</td><td className="border p-2 font-bold">{r.status}</td><td className="border p-2">{r.revenueType}</td><td className="border p-2 text-right">{money(r.revenueAmount)}</td><td className="border p-2">{r.internalRemark}</td><td className="border p-2">{r.assignedTo}</td><td className="border p-2"><button type="button" onClick={() => openEdit(r)} className="inline-flex items-center gap-1 rounded-md border border-amber-300 bg-amber-50 px-2 py-1 font-black text-amber-800 hover:bg-amber-100"><Edit2 className="h-3 w-3"/> Edit</button></td></tr>)}{visibleCount < filtered.length && <tr><td colSpan={columns.length} className="border p-4 text-center bg-white"><button type="button" onClick={() => setVisibleCount(count => count + INITIAL_VISIBLE_ROWS)} className="rounded-lg bg-slate-900 px-5 py-2 text-xs font-bold text-white hover:bg-slate-700">Load next {Math.min(INITIAL_VISIBLE_ROWS, filtered.length - visibleCount)} rows</button></td></tr>}</tbody></table>}</div>
    {editingRow && <div className="absolute inset-0 z-40 flex items-center justify-center bg-slate-950/40 p-4"><div className="w-full max-w-3xl rounded-2xl bg-white p-5 shadow-2xl"><div className="flex items-start justify-between"><div><h4 className="text-base font-black text-slate-900">Edit Invoice</h4><p className="mt-1 text-xs text-slate-500">{editingRow.invoiceNo} · {editingRow.bankName} · {editingRow.branchName}</p></div><button type="button" onClick={() => setEditingRow(null)}><X className="h-5 w-5"/></button></div><div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">{([['billDate','Bill Date','date'],['billAmount','Bill Amount','number'],['paymentReceivedDate','Payment Received Date','date'],['receivedAmount','Received Amount','number'],['tdsAmount','TDS Amount','number'],['tdsPercent','TDS %','number']] as const).map(([key,label,type])=><label key={key} className="text-[10px] font-bold text-slate-600">{label}<input type={type} step={type === 'number' ? '0.01' : undefined} value={editForm[key]} onChange={e=>setEditForm({...editForm,[key]:e.target.value})} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-amber-400 focus:outline-none"/></label>)}<label className="text-[10px] font-bold text-slate-600">Status<select value={editForm.status} onChange={e=>setEditForm({...editForm,status:e.target.value})} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"><option>Pending</option><option>Received</option><option>Cancelled</option></select></label><label className="text-[10px] font-bold text-slate-600 sm:col-span-2">Remark<input value={editForm.remark} onChange={e=>setEditForm({...editForm,remark:e.target.value})} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"/></label><label className="text-[10px] font-bold text-slate-600 sm:col-span-2 lg:col-span-3">Internal Remark<input value={editForm.internalRemark} onChange={e=>setEditForm({...editForm,internalRemark:e.target.value})} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"/></label></div><p className="mt-3 text-[10px] text-slate-500">Due amount Bill − Received − TDS se automatically calculate hoga.</p><div className="mt-5 flex justify-end gap-2"><button type="button" onClick={()=>setEditingRow(null)} className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-bold">Cancel</button><button type="button" disabled={savingEdit} onClick={saveEdit} className="rounded-lg bg-amber-500 px-4 py-2 text-xs font-black text-white disabled:opacity-50">{savingEdit ? 'Saving...' : 'Update Invoice'}</button></div></div></div>}
  </div></div>;
  return typeof document !== "undefined" ? createPortal(modal, document.body) : null;
}
