"use client";

import React from "react";
import { AlertTriangle, ArrowUpRight, Briefcase, Clock3, IndianRupee, RefreshCw, Scale, ShieldCheck, TrendingUp } from "lucide-react";

type Row = Record<string, any>;
const num = (value: any) => Number(String(value ?? 0).replace(/[^0-9.-]/g, "")) || 0;
const money = (value: number) => `₹${Math.round(value || 0).toLocaleString("en-IN")}`;
const when = (value: any) => value ? new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";
const isMedia = (lead: Row) => /\b(media|gpde|gdpe)\b/i.test(`${lead.salesReason || ""} ${lead.convertedServicesJson || ""} ${lead.serviceName || ""}`);

export default function OwnerFinanceOverview({ onNavigate }: { onNavigate: (tab: string) => void }) {
  const [rows, setRows] = React.useState<{ cases: Row[]; payments: Row[]; security: Row[]; leads: Row[] }>({ cases: [], payments: [], security: [], leads: [] });
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");

  const load = React.useCallback(async () => {
    setLoading(true); setError("");
    try {
      const responses = await Promise.all(["/api/legal-recovery", "/api/legal-recovery/payment", "/api/legal-recovery/security", "/api/bda-leads?status=All"].map(url => fetch(url, { cache: "no-store" })));
      const json = await Promise.all(responses.map(response => response.json().catch(() => ({}))));
      setRows({ cases: json[0].data || [], payments: json[1].data || [], security: json[2].data || [], leads: json[3].data || [] });
      if (responses.every(response => !response.ok)) throw new Error("Finance data could not be loaded");
    } catch (e: any) { setError(e.message || "Finance data could not be loaded"); }
    finally { setLoading(false); }
  }, []);
  React.useEffect(() => { void load(); }, [load]);

  const summary = React.useMemo(() => {
    const legalRemaining = rows.cases.reduce((s, x) => s + num(x.pendingAmount), 0);
    const legalReceived = rows.payments.reduce((s, x) => s + num(x.amount), 0);
    const securityTotal = rows.security.reduce((s, x) => s + num(x.billAmount), 0);
    const securityReceived = rows.security.reduce((s, x) => s + num(x.receivedAmount), 0);
    const converted = rows.leads.filter(x => /converted/i.test(x.status || ""));
    const mediaReceived = converted.filter(isMedia).reduce((s, x) => s + num(x.convertedAmount), 0);
    const consultancyReceived = converted.filter(x => !isMedia(x)).reduce((s, x) => s + num(x.convertedAmount), 0);
    return [
      { name: "Legal Recovery", icon: Scale, total: legalRemaining + legalReceived, received: legalReceived, pending: legalRemaining, tab: "legal-recovery" },
      { name: "Security Services", icon: ShieldCheck, total: securityTotal, received: securityReceived, pending: Math.max(0, securityTotal - securityReceived), tab: "legal-recovery" },
      { name: "Business Consultancy / Sales BDA", icon: Briefcase, total: consultancyReceived, received: consultancyReceived, pending: 0, tab: "bda-leads" },
      { name: "Media GPDE", icon: TrendingUp, total: mediaReceived, received: mediaReceived, pending: 0, tab: "bda-leads" },
    ];
  }, [rows]);

  const pendingBills = React.useMemo(() => rows.cases.filter(x => num(x.pendingAmount) > 0).map(x => ({ id: `l-${x.id}`, client: x.bankName || "Unknown Bank", detail: x.branchName || "General", vertical: "Legal Recovery", date: x.pendingSince || x.createdAt, amount: num(x.pendingAmount) })).concat(rows.security.filter(x => num(x.billAmount) > num(x.receivedAmount)).map(x => ({ id: `s-${x.id}`, client: x.company || "Security Client", detail: x.branchName || x.location || "General", vertical: "Security Services", date: x.billDate || x.createdAt, amount: Math.max(0, num(x.billAmount) - num(x.receivedAmount)) }))), [rows.cases, rows.security]);
  const age = (date: any) => date ? Math.max(0, Math.floor((Date.now() - +new Date(date)) / 86400000)) : 0;
  const aging = [
    { label: "New · 0–30 days", amount: pendingBills.filter(x => age(x.date) < 31).reduce((s, x) => s + x.amount, 0), style: "bg-emerald-50 border-emerald-100 text-emerald-700" },
    { label: "31–60 days", amount: pendingBills.filter(x => age(x.date) >= 31 && age(x.date) <= 60).reduce((s, x) => s + x.amount, 0), style: "bg-amber-50 border-amber-100 text-amber-700" },
    { label: "61–90 days", amount: pendingBills.filter(x => age(x.date) >= 61 && age(x.date) <= 90).reduce((s, x) => s + x.amount, 0), style: "bg-orange-50 border-orange-100 text-orange-700" },
    { label: "Old · 90+ days", amount: pendingBills.filter(x => age(x.date) > 90).reduce((s, x) => s + x.amount, 0), style: "bg-rose-50 border-rose-100 text-rose-700" },
  ];
  const receipts = React.useMemo(() => rows.payments.map(x => ({ id: `l-${x.id}`, vertical: "Legal Recovery", client: `${x.bankName || "Unknown Bank"} · ${x.branchName || "General"}`, amount: num(x.amount), date: x.paymentDate || x.createdAt, by: x.receivedBy || "System" })).concat(rows.security.filter(x => num(x.receivedAmount) > 0).map(x => ({ id: `s-${x.id}`, vertical: "Security Services", client: x.company || "Security Client", amount: num(x.receivedAmount), date: x.receivedDate || x.updatedAt, by: x.createdBy || "System" }))).sort((a, b) => +new Date(b.date || 0) - +new Date(a.date || 0)).slice(0, 8), [rows.payments, rows.security]);

  return <section className="rounded-2xl border-2 border-[#d8cbc3] bg-white shadow-sm overflow-hidden text-slate-900 [&_p]:font-extrabold [&_.text-slate-500]:text-slate-700 [&_.text-slate-600]:text-slate-800">
    <div className="px-4 py-3 border-b border-[#e9e1da] flex items-center justify-between"><div><h2 className="text-base font-black text-[#321f2e]">Vertical Finance & Collections</h2><p className="text-[10px] font-extrabold text-slate-700">Vertical-wise received money, remaining amount and bill aging</p></div><button onClick={load} disabled={loading} className="text-[10px] font-black text-[#5e3856] flex items-center gap-1"><RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`}/> Refresh</button></div>
    {error ? <div className="p-5 text-xs text-rose-600 flex gap-2"><AlertTriangle className="w-4 h-4"/>{error}</div> : <>
      <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-3 p-4">{summary.map(item => <div key={item.name} className="rounded-xl border border-[#ddd2ca] p-3 text-left hover:border-[#714B67]"><button type="button" onClick={() => onNavigate(item.tab)} className="w-full flex items-center justify-between"><span className="flex items-center gap-2 text-[11px] font-black text-slate-900"><item.icon className="w-4 h-4 text-[#714B67]"/>{item.name}</span><ArrowUpRight className="w-3.5 h-3.5 text-slate-600"/></button><div className="grid grid-cols-3 gap-2 mt-3"><button type="button" onClick={() => onNavigate(item.tab)} className="text-left rounded-md hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#714B67]/30"><p className="text-[9px] font-black text-slate-700">TOTAL</p><b className="text-sm text-slate-950 underline decoration-dotted underline-offset-2">{money(item.total)}</b></button><button type="button" onClick={() => onNavigate(item.tab)} className="text-left rounded-md hover:bg-emerald-50 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"><p className="text-[9px] font-black text-slate-700">RECEIVED</p><b className="text-sm text-emerald-700 underline decoration-dotted underline-offset-2">{money(item.received)}</b></button><button type="button" onClick={() => onNavigate(item.tab)} className="text-left rounded-md hover:bg-rose-50 focus:outline-none focus:ring-2 focus:ring-rose-500/30"><p className="text-[9px] font-black text-slate-700">REMAINING</p><b className="text-sm text-rose-700 underline decoration-dotted underline-offset-2">{money(item.pending)}</b></button></div></div>)}</div>
      <div className="grid xl:grid-cols-[0.8fr_1.2fr] border-t border-[#eee7e1]"><div className="p-4 xl:border-r border-[#eee7e1]"><h3 className="text-[11px] font-black text-[#321f2e] flex items-center gap-1"><Clock3 className="w-4 h-4"/> Pending Amount Age</h3><p className="text-[9px] text-slate-700 mt-1">Legal case remaining and Security bill pending amounts</p><div className="grid grid-cols-2 gap-2 mt-3">{aging.map(x => <button type="button" onClick={() => onNavigate("legal-recovery")} key={x.label} className={`rounded-lg border p-3 text-left hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#714B67]/30 ${x.style}`}><p className="text-[9px] font-black uppercase text-slate-800">{x.label}</p><b className="text-base font-black underline decoration-dotted underline-offset-2">{money(x.amount)}</b></button>)}</div><button onClick={() => onNavigate("vertical-dashboard")} className="mt-3 text-[10px] font-black text-[#5e3856]">Open complete finance dashboard <ArrowUpRight className="inline w-3.5 h-3.5"/></button></div>
      <div className="p-4"><h3 className="text-[11px] font-black text-[#321f2e] flex items-center gap-1"><IndianRupee className="w-4 h-4"/> Recently Received Money</h3><div className="mt-2 divide-y max-h-48 overflow-y-auto">{receipts.map(x => <button type="button" onClick={() => onNavigate("legal-recovery")} key={x.id} className="w-full py-2.5 grid grid-cols-[1fr_auto] gap-3 text-left hover:bg-slate-50"><div className="min-w-0"><p className="text-[10px] font-black text-slate-900 truncate">{x.client}</p><p className="text-[9px] font-extrabold text-slate-700">{x.vertical} · {x.by} · {when(x.date)}</p></div><b className="text-[12px] font-black text-emerald-700 underline decoration-dotted underline-offset-2">+{money(x.amount)}</b></button>)}{!receipts.length && <p className="py-6 text-center text-[10px] font-bold text-slate-700">No received payment records found.</p>}</div></div></div>
    </>}
  </section>;
}
