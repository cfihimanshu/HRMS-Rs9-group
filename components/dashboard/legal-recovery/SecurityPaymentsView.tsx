"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Download, FileSpreadsheet, Search } from "lucide-react";

const amount = (value: unknown) => Number(value || 0);
const money = (value: unknown) => amount(value).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const csvCell = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;

export default function SecurityPaymentsView({ triggerToast }: { triggerToast: (message: string) => void }) {
  const [records, setRecords] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetch("/api/legal-recovery/security").then(response => response.json()).then(result => {
      if (result.success) setRecords((result.data || []).filter((record: any) => record.billNo || amount(record.billAmount) > 0));
      else triggerToast(result.error || "Security billing load nahi hui");
    }).catch(() => triggerToast("Security billing load nahi hui")).finally(() => setLoading(false));
  }, [triggerToast]);

  const rows = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return records.map(record => {
      const bill = amount(record.billAmount);
      const received = amount(record.receivedAmount);
      const pending = Math.max(0, bill - received);
      const paymentStatus = pending <= 0 && bill > 0 ? "Paid" : received > 0 ? "Partially Paid" : "Due";
      return { ...record, calculatedReceived: received, calculatedPending: pending, calculatedStatus: paymentStatus };
    }).filter(record => {
      const matchesSearch = !needle || [record.company, record.nbfcName, record.branchName, record.location, record.billNo, record.paymentMethod, record.calculatedStatus].some(value => String(value || "").toLowerCase().includes(needle));
      return matchesSearch && (status === "All" || record.calculatedStatus === status);
    });
  }, [records, search, status]);
  const totals = useMemo(() => rows.reduce((result, row) => ({
    bills: result.bills + 1,
    billed: result.billed + amount(row.billAmount),
    received: result.received + row.calculatedReceived,
    pending: result.pending + row.calculatedPending,
  }), { bills: 0, billed: 0, received: 0, pending: 0 }), [rows]);

  const exportCsv = () => {
    const headers = ["Company", "Bank / NBFC", "Branch", "Site", "Invoice No", "Bill Date", "Bill Amount", "Received", "Pending", "Payment Status", "Received Date", "Payment Method"];
    const body = rows.map(row => [row.company, row.nbfcName, row.branchName, row.location, row.billNo, row.billDate, amount(row.billAmount).toFixed(2), row.calculatedReceived.toFixed(2), row.calculatedPending.toFixed(2), row.calculatedStatus, row.receivedDate, row.paymentMethod].map(csvCell).join(","));
    const blob = new Blob([[headers.map(csvCell).join(","), ...body].join("\n")], { type: "text/csv;charset=utf-8" });
    const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = `Security_Payments_${new Date().toISOString().slice(0, 10)}.csv`; link.click(); URL.revokeObjectURL(link.href);
  };

  return <div className="space-y-4">
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
      <div className="bg-white border rounded-xl p-4"><p className="text-[9px] uppercase font-bold text-slate-400">Total Bills</p><b className="text-xl">{totals.bills}</b></div>
      <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4"><p className="text-[9px] uppercase font-bold text-indigo-600">Total Bill Amount</p><b className="text-xl text-indigo-700">₹{money(totals.billed)}</b></div>
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4"><p className="text-[9px] uppercase font-bold text-emerald-600">Total Received</p><b className="text-xl text-emerald-700">₹{money(totals.received)}</b></div>
      <div className="bg-rose-50 border border-rose-200 rounded-xl p-4"><p className="text-[9px] uppercase font-bold text-rose-600">Total Pending</p><b className="text-xl text-rose-700">₹{money(totals.pending)}</b></div>
    </div>

    <div className="bg-white dark:bg-gray-900 border rounded-xl overflow-hidden">
      <div className="p-4 border-b flex flex-col xl:flex-row xl:items-center justify-between gap-3">
        <div><h3 className="text-sm font-bold flex items-center gap-2"><FileSpreadsheet className="w-4 h-4 text-emerald-600"/>Security Billing &amp; Payment Register</h3><p className="text-[9px] text-slate-400 mt-1">Bank aur site-wise invoice, received aur outstanding payment details.</p></div>
        <div className="flex flex-col sm:flex-row gap-2"><label className="relative"><Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400"/><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search bank, site, invoice..." className="border rounded-lg pl-9 pr-3 py-2 text-xs w-72 max-w-full"/></label><select value={status} onChange={event => setStatus(event.target.value)} className="border rounded-lg px-3 py-2 text-xs bg-white dark:bg-gray-800"><option>All</option><option>Due</option><option>Partially Paid</option><option>Paid</option></select><button onClick={exportCsv} className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2"><Download className="w-3.5 h-3.5"/>Export Excel CSV</button></div>
      </div>
      <div className="overflow-auto max-h-[65vh]"><table className="border-collapse min-w-max w-full text-[10px]"><thead className="sticky top-0 z-10 bg-[#F3F0EC] dark:bg-gray-800"><tr>{["#", "Company", "Bank / NBFC", "Branch", "Site", "Invoice No.", "Bill Date", "Bill Amount", "Received", "Pending", "Payment Status", "Received Date", "Payment Method"].map(header => <th key={header} className="p-3 border-r border-b text-left uppercase whitespace-nowrap">{header}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={row.id} className="border-b hover:bg-slate-50 dark:hover:bg-gray-800/50"><td className="p-3 border-r">{index + 1}</td><td className="p-3 border-r font-bold">{row.company || "-"}</td><td className="p-3 border-r font-bold">{row.nbfcName || "-"}</td><td className="p-3 border-r">{row.branchName || "-"}</td><td className="p-3 border-r">{row.location || row.branchName || "-"}</td><td className="p-3 border-r font-mono font-semibold">{row.billNo || "-"}</td><td className="p-3 border-r whitespace-nowrap">{row.billDate || "-"}</td><td className="p-3 border-r text-right font-bold">₹{money(row.billAmount)}</td><td className="p-3 border-r text-right font-bold text-emerald-700">₹{money(row.calculatedReceived)}</td><td className="p-3 border-r text-right font-bold text-rose-700">₹{money(row.calculatedPending)}</td><td className="p-3 border-r"><span className={`inline-flex rounded-full border px-2 py-1 font-bold ${row.calculatedStatus === "Paid" ? "bg-emerald-50 border-emerald-200 text-emerald-700" : row.calculatedStatus === "Partially Paid" ? "bg-amber-50 border-amber-200 text-amber-700" : "bg-rose-50 border-rose-200 text-rose-700"}`}>{row.calculatedStatus}</span></td><td className="p-3 border-r">{row.receivedDate || "-"}</td><td className="p-3">{row.paymentMethod || "-"}</td></tr>)}{!rows.length && <tr><td colSpan={13} className="p-10 text-center text-slate-400">{loading ? "Loading security billing..." : "No billing records found."}</td></tr>}</tbody></table></div>
      <div className="p-3 border-t flex justify-end gap-6 text-xs"><span>Billed: <b>₹{money(totals.billed)}</b></span><span className="text-emerald-700">Received: <b>₹{money(totals.received)}</b></span><span className="text-rose-700">Pending: <b>₹{money(totals.pending)}</b></span></div>
    </div>
  </div>;
}
