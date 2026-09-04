"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Banknote, Download, Plus, RefreshCw, X } from "lucide-react";

const localMonth = () => { const now = new Date(); return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 7); };
const today = () => { const now = new Date(); return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10); };
const money = (value: unknown) => `₹${Number(value || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function StaffMonthlySettlement({ triggerToast }: { triggerToast: (message: string) => void }) {
  const [month, setMonth] = useState(localMonth());
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showAdvance, setShowAdvance] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ employeeId: "", amount: "", monthlyRecovery: "", issuedDate: today(), paymentMode: "Bank Transfer", transactionRef: "", proofUrl: "", notes: "" });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetch(`/api/payroll/settlement?month=${month}`, { cache: "no-store" }).then(response => response.json());
      if (!result.success) throw new Error(result.error || "Settlement load nahi hua");
      setRows(result.data || []);
    } catch (error: any) { triggerToast(error.message || "Settlement load nahi hua"); }
    finally { setLoading(false); }
  }, [month, triggerToast]);
  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return !needle ? rows : rows.filter(row => [row.employeeName, row.employeeCode].some(value => String(value || "").toLowerCase().includes(needle)));
  }, [rows, search]);
  const totals = useMemo(() => filtered.reduce((sum, row) => ({ salary: sum.salary + Number(row.earnedSalary || 0), expenses: sum.expenses + Number(row.approvedExpenses || 0), recovery: sum.recovery + Number(row.advanceRecovery || 0), payable: sum.payable + Number(row.finalPayable || 0) }), { salary: 0, expenses: 0, recovery: 0, payable: 0 }), [filtered]);

  const saveAdvance = async (event: React.FormEvent) => {
    event.preventDefault(); setSaving(true);
    try {
      const result = await fetch("/api/payroll/settlement", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) }).then(response => response.json());
      if (!result.success) throw new Error(result.error || "Advance save nahi hua");
      triggerToast("Staff advance ledger mein save ho gaya");
      setShowAdvance(false); setForm({ employeeId: "", amount: "", monthlyRecovery: "", issuedDate: today(), paymentMode: "Bank Transfer", transactionRef: "", proofUrl: "", notes: "" }); await load();
    } catch (error: any) { triggerToast(error.message || "Advance save nahi hua"); }
    finally { setSaving(false); }
  };

  const exportRows = () => {
    if (!filtered.length) return triggerToast("Export ke liye settlement data nahi hai");
    const cell = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;
    const headers = ["Employee", "Employee Code", "Present", "Absent", "Payroll Status", "Earned Salary", "Approved Expenses", "Outstanding Advance", "Advance Recovery", "Final Payable"];
    const body = filtered.map(row => [row.employeeName, row.employeeCode, row.presentDays, row.absentDays, row.payrollStatus, row.earnedSalary, row.approvedExpenses, row.outstandingAdvance, row.advanceRecovery, row.finalPayable].map(cell).join(","));
    const url = URL.createObjectURL(new Blob([`\uFEFF${headers.map(cell).join(",")}\n${body.join("\n")}`], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a"); link.href = url; link.download = `employee-settlement-${month}.csv`; link.click(); URL.revokeObjectURL(url);
  };

  return <div className="border border-[#E8E4DF] rounded-xl bg-white overflow-hidden">
    <div className="p-4 border-b flex flex-col lg:flex-row lg:items-center justify-between gap-3"><div><h2 className="font-black flex items-center gap-2"><Banknote className="w-5 h-5 text-emerald-600"/>Employee Monthly Settlement</h2><p className="text-[10px] text-slate-500 mt-1">Attendance-linked payroll + approved expenses − advance recovery</p></div><div className="flex flex-wrap gap-2"><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search employee..." className="border rounded-lg px-3 py-2 text-xs"/><input type="month" value={month} onChange={event => setMonth(event.target.value)} className="border rounded-lg px-3 py-2 text-xs"/><button onClick={() => load()} className="border rounded-lg px-3 py-2 text-xs"><RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}/></button><button onClick={exportRows} className="border border-emerald-200 bg-emerald-50 text-emerald-700 rounded-lg px-3 py-2 text-xs font-bold flex gap-1"><Download className="w-4 h-4"/>Export</button><button onClick={() => setShowAdvance(true)} className="bg-[#744868] text-white rounded-lg px-3 py-2 text-xs font-bold flex gap-1"><Plus className="w-4 h-4"/>Add Staff Advance</button></div></div>
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 p-4 bg-slate-50 border-b">{[["Earned Salary", totals.salary], ["Approved Expenses", totals.expenses], ["Advance Recovery", totals.recovery], ["Final Payable", totals.payable]].map(([label, value]) => <div key={String(label)} className="bg-white border rounded-lg p-3"><p className="text-[9px] uppercase font-black text-slate-400">{label}</p><b className="text-base">{money(value)}</b></div>)}</div>
    <div className="overflow-x-auto"><table className="w-full min-w-[1100px] text-xs"><thead className="bg-[#F3F0EC] text-[9px] uppercase"><tr>{["Employee", "Attendance", "Payroll", "Earned Salary", "Approved Expenses", "Advance Outstanding", "This Month Recovery", "Final Payable"].map(title => <th key={title} className="p-3 text-left border-r last:border-0">{title}</th>)}</tr></thead><tbody>{filtered.map(row => <tr key={row.employeeId} className="border-t"><td className="p-3 border-r"><b>{row.employeeName}</b><span className="block text-[9px] text-slate-400">{row.employeeCode || row.employeeId}</span></td><td className="p-3 border-r"><span className="text-emerald-700 font-bold">P: {row.presentDays}</span> · <span className="text-rose-600 font-bold">A: {row.absentDays}</span></td><td className="p-3 border-r"><span className={`rounded-full px-2 py-1 text-[9px] font-bold ${row.payrollId ? "bg-blue-50 text-blue-700" : "bg-amber-50 text-amber-700"}`}>{row.payrollStatus}</span></td><td className="p-3 border-r text-right font-bold">{money(row.earnedSalary)}</td><td className="p-3 border-r text-right text-emerald-700"><b>{money(row.approvedExpenses)}</b><span className="block text-[9px]">{row.approvedExpenseCount} claims</span></td><td className="p-3 border-r text-right text-rose-700 font-bold">{money(row.outstandingAdvance)}</td><td className="p-3 border-r text-right text-rose-700 font-bold">− {money(row.advanceRecovery)}</td><td className="p-3 text-right text-emerald-700 font-black">{money(row.finalPayable)}</td></tr>)}{!filtered.length && <tr><td colSpan={8} className="p-10 text-center text-slate-400">{loading ? "Settlement load ho raha hai..." : "Koi employee settlement nahi mila."}</td></tr>}</tbody></table></div>
    {showAdvance && <div className="fixed inset-0 z-[99999] bg-slate-900/60 flex items-center justify-center p-4" onClick={() => setShowAdvance(false)}><form onSubmit={saveAdvance} onClick={event => event.stopPropagation()} className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden"><div className="p-4 border-b flex justify-between"><div><h3 className="font-black">Add Staff Advance</h3><p className="text-[10px] text-slate-500">Advance aur monthly recovery DB ledger mein store hogi.</p></div><button type="button" onClick={() => setShowAdvance(false)}><X className="w-5 h-5"/></button></div><div className="p-5 grid md:grid-cols-2 gap-4"><label className="text-xs font-bold">Employee *<select required value={form.employeeId} onChange={event => setForm(previous => ({ ...previous, employeeId: event.target.value }))} className="block w-full border rounded-lg p-2.5 mt-1"><option value="">Select Employee</option>{rows.map(row => <option key={row.employeeId} value={row.employeeId}>{row.employeeName}</option>)}</select></label><label className="text-xs font-bold">Issued Date *<input required type="date" value={form.issuedDate} onChange={event => setForm(previous => ({ ...previous, issuedDate: event.target.value }))} className="block w-full border rounded-lg p-2.5 mt-1"/></label><label className="text-xs font-bold">Advance Amount *<input required min="1" type="number" value={form.amount} onChange={event => setForm(previous => ({ ...previous, amount: event.target.value }))} className="block w-full border rounded-lg p-2.5 mt-1"/></label><label className="text-xs font-bold">Monthly Recovery *<input required min="1" type="number" value={form.monthlyRecovery} onChange={event => setForm(previous => ({ ...previous, monthlyRecovery: event.target.value }))} className="block w-full border rounded-lg p-2.5 mt-1"/></label><label className="text-xs font-bold">Payment Mode<select value={form.paymentMode} onChange={event => setForm(previous => ({ ...previous, paymentMode: event.target.value }))} className="block w-full border rounded-lg p-2.5 mt-1"><option>Bank Transfer</option><option>Cash</option><option>UPI</option><option>Cheque</option></select></label><label className="text-xs font-bold">Transaction Reference<input value={form.transactionRef} onChange={event => setForm(previous => ({ ...previous, transactionRef: event.target.value }))} className="block w-full border rounded-lg p-2.5 mt-1"/></label><label className="text-xs font-bold md:col-span-2">Proof URL<input value={form.proofUrl} onChange={event => setForm(previous => ({ ...previous, proofUrl: event.target.value }))} placeholder="Uploaded payment proof URL" className="block w-full border rounded-lg p-2.5 mt-1"/></label><label className="text-xs font-bold md:col-span-2">Notes<textarea value={form.notes} onChange={event => setForm(previous => ({ ...previous, notes: event.target.value }))} className="block w-full border rounded-lg p-2.5 mt-1"/></label></div><div className="p-4 border-t flex justify-end gap-2"><button type="button" onClick={() => setShowAdvance(false)} className="border rounded-lg px-4 py-2 text-xs">Cancel</button><button disabled={saving} className="bg-[#744868] text-white rounded-lg px-4 py-2 text-xs font-bold disabled:opacity-50">{saving ? "Saving..." : "Save Advance"}</button></div></form></div>}
  </div>;
}
