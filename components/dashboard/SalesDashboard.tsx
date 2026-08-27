"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, ArrowRight, BarChart3, BriefcaseBusiness, CalendarDays, CheckCircle2, Clock3, IndianRupee, Phone, RefreshCw, Target, Timer, TrendingUp, UserRound, Users } from "lucide-react";

interface SalesDashboardProps {
  onNavigate?: (tab: string) => void;
}

const statusColors: Record<string, string> = {
  New: "bg-slate-400",
  Assigned: "bg-blue-500",
  "In Progress": "bg-indigo-500",
  Qualified: "bg-amber-500",
  Converted: "bg-emerald-500",
  Lost: "bg-rose-500",
};

const parseServices = (value: any): Array<{ serviceName?: string; amount?: number | string }> => {
  if (!value) return [];
  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
};

const formatDuration = (seconds: number) => {
  if (!seconds) return "0 min";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.round((seconds % 3600) / 60);
  return hours ? `${hours}h ${minutes}m` : `${minutes} min`;
};

let salesDashboardCache: { at: number; leads: any[]; calls: any[] } | null = null;

export default function SalesDashboard({ onNavigate }: SalesDashboardProps) {
  const [leads, setLeads] = useState<any[]>([]);
  const [calls, setCalls] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [period, setPeriod] = useState("30");
  const [bdaFilter, setBdaFilter] = useState("All");

  const loadData = useCallback(async (force = false) => {
    if (!force && salesDashboardCache && Date.now() - salesDashboardCache.at < 60_000) {
      setLeads(salesDashboardCache.leads);
      setCalls(salesDashboardCache.calls);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const [leadResponse, callResponse] = await Promise.all([
        fetch("/api/bda-leads?status=All&lean=1"),
        fetch("/api/bda-leads/calls"),
      ]);
      const [leadData, callData] = await Promise.all([leadResponse.json(), callResponse.json()]);
      if (!leadData.success) throw new Error(leadData.error || "Sales leads could not be loaded");
      if (!callData.success) throw new Error(callData.error || "Sales call data could not be loaded");
      const filteredLeads = (leadData.data || []).filter((lead: any) => {
        if (lead.source !== "Work Report") return true;
        const title = String(lead.name || "").trim();
        return Boolean(title && !/^(general|others?)$/i.test(title));
      });
      const visibleLeadIds = new Set(filteredLeads.map((lead: any) => String(lead.id)));
      setLeads(filteredLeads);
      const filteredCalls = (callData.data || []).filter((call: any) => !String(call.leadCode || "").startsWith("TASK-") || visibleLeadIds.has(String(call.leadId)));
      setCalls(filteredCalls);
      salesDashboardCache = { at: Date.now(), leads: filteredLeads, calls: filteredCalls };
    } catch (loadError: any) {
      setError(loadError.message || "Sales dashboard could not be loaded");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const bdas = useMemo(() => {
    const map = new Map<string, string>();
    leads.forEach(lead => { if (lead.assignedTo) map.set(String(lead.assignedTo), lead.assignedToName || `BDA ${lead.assignedTo}`); });
    calls.forEach(call => { if (call.bdaUserId) map.set(String(call.bdaUserId), call.bdaName || `BDA ${call.bdaUserId}`); });
    return Array.from(map, ([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [leads, calls]);

  const periodStart = useMemo(() => {
    if (period === "all") return null;
    const date = new Date();
    date.setDate(date.getDate() - Number(period));
    date.setHours(0, 0, 0, 0);
    return date;
  }, [period]);

  const visibleLeads = useMemo(() => leads.filter(lead => bdaFilter === "All" || String(lead.assignedTo || "") === bdaFilter), [leads, bdaFilter]);
  const visibleCalls = useMemo(() => calls.filter(call => {
    const matchesBda = bdaFilter === "All" || String(call.bdaUserId || "") === bdaFilter;
    const matchesPeriod = !periodStart || new Date(call.callDateTime) >= periodStart;
    return matchesBda && matchesPeriod;
  }), [calls, bdaFilter, periodStart]);

  const metrics = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const connected = visibleCalls.filter(call => call.callStatus === "Connected").length;
    const converted = visibleLeads.filter(lead => lead.status === "Converted");
    const callbacks = visibleCalls.filter(call => call.nextCallbackAt && new Date(call.nextCallbackAt) >= today);
    const overdue = visibleCalls.filter(call => call.nextCallbackAt && new Date(call.nextCallbackAt) < new Date() && !["Converted", "Lost"].includes(call.leadStatus));
    const totalDuration = visibleCalls.reduce((sum, call) => sum + Number(call.durationSeconds || 0), 0);
    const durationCalls = visibleCalls.filter(call => Number(call.durationSeconds || 0) > 0).length;
    return {
      callsToday: visibleCalls.filter(call => new Date(call.callDateTime) >= today).length,
      connected,
      connectRate: visibleCalls.length ? Math.round((connected / visibleCalls.length) * 100) : 0,
      converted: converted.length,
      conversionRate: visibleLeads.length ? Math.round((converted.length / visibleLeads.length) * 100) : 0,
      revenue: converted.reduce((sum, lead) => sum + Number(lead.convertedAmount || 0), 0),
      callbacks: callbacks.length,
      overdue: overdue.length,
      totalDuration,
      averageDuration: durationCalls ? Math.round(totalDuration / durationCalls) : 0,
      qualified: visibleLeads.filter(lead => lead.status === "Qualified").length,
      activeValue: visibleLeads.filter(lead => !["Lost"].includes(lead.status)).reduce((sum, lead) => sum + Number(lead.convertedAmount || 0), 0),
    };
  }, [visibleCalls, visibleLeads]);

  const pipeline = useMemo(() => ["New", "Assigned", "In Progress", "Qualified", "Converted", "Lost"].map(status => ({ status, count: visibleLeads.filter(lead => lead.status === status).length })), [visibleLeads]);
  const maxPipeline = Math.max(1, ...pipeline.map(item => item.count));

  const performance = useMemo(() => bdas.map(bda => {
    const userLeads = leads.filter(lead => String(lead.assignedTo || "") === bda.id);
    const userCalls = visibleCalls.filter(call => String(call.bdaUserId || "") === bda.id);
    const connected = userCalls.filter(call => call.callStatus === "Connected").length;
    const converted = userLeads.filter(lead => lead.status === "Converted").length;
    return { ...bda, leads: userLeads.length, calls: userCalls.length, connected, converted, callbacks: userCalls.filter(call => call.nextCallbackAt && new Date(call.nextCallbackAt) >= new Date()).length, duration: userCalls.reduce((sum, call) => sum + Number(call.durationSeconds || 0), 0), amount: userLeads.filter(lead => lead.status === "Converted").reduce((sum, lead) => sum + Number(lead.convertedAmount || 0), 0) };
  }).filter(row => bdaFilter === "All" || row.id === bdaFilter).sort((a, b) => b.converted - a.converted || b.calls - a.calls), [bdas, leads, visibleCalls, bdaFilter]);

  const serviceSummary = useMemo(() => {
    const map = new Map<string, { name: string; leads: number; amount: number }>();
    visibleLeads.forEach(lead => {
      const services = parseServices(lead.convertedServicesJson);
      if (services.length === 0 && lead.salesReason) services.push({ serviceName: lead.salesReason, amount: lead.convertedAmount || 0 });
      services.forEach(service => {
        const name = service.serviceName || "Unspecified Service";
        const current = map.get(name) || { name, leads: 0, amount: 0 };
        current.leads += 1;
        current.amount += Number(service.amount || 0);
        map.set(name, current);
      });
    });
    return Array.from(map.values()).sort((a, b) => b.amount - a.amount || b.leads - a.leads);
  }, [visibleLeads]);

  const dealRows = useMemo(() => visibleLeads.map(lead => {
    const leadCalls = calls.filter(call => Number(call.leadId) === Number(lead.id)).sort((a, b) => new Date(b.callDateTime).getTime() - new Date(a.callDateTime).getTime());
    const services = parseServices(lead.convertedServicesJson);
    const createdAt = lead.createdAt ? new Date(lead.createdAt) : null;
    const ageDays = createdAt ? Math.max(0, Math.floor((Date.now() - createdAt.getTime()) / 86400000)) : null;
    return { ...lead, services, lastCall: leadCalls[0], totalCalls: leadCalls.length, totalDuration: leadCalls.reduce((sum, call) => sum + Number(call.durationSeconds || 0), 0), ageDays };
  }).sort((a, b) => Number(b.convertedAmount || 0) - Number(a.convertedAmount || 0)), [visibleLeads, calls]);

  if (loading) return <div className="min-h-[65vh] bg-white border rounded-2xl flex flex-col items-center justify-center"><RefreshCw className="w-8 h-8 animate-spin text-indigo-600" /><p className="mt-3 text-sm font-bold text-slate-500">Loading sales dashboard...</p></div>;
  if (error) return <div className="min-h-[55vh] bg-white border rounded-2xl flex flex-col items-center justify-center text-center p-6"><AlertCircle className="w-9 h-9 text-rose-500" /><h2 className="mt-3 font-black text-slate-800">Sales dashboard could not be loaded</h2><p className="text-xs text-slate-500 mt-1">{error}</p><button onClick={() => loadData(true)} className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-black">Retry</button></div>;

  return <div className="p-4 md:p-6 space-y-5 bg-slate-50 min-h-screen">
    <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-sm">
      <div><div className="flex items-center gap-2"><BarChart3 className="w-6 h-6 text-indigo-600" /><h1 className="text-xl font-black text-slate-900">Sales Dashboard</h1></div><p className="text-xs text-slate-500 mt-1">Lead pipeline, BDA calling, callbacks, conversions, and revenue overview</p></div>
      <div className="flex flex-wrap gap-2">
        <select value={period} onChange={event => setPeriod(event.target.value)} className="border rounded-xl px-3 py-2 text-xs font-bold bg-white"><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="90">Last 90 days</option><option value="all">All time</option></select>
        <select value={bdaFilter} onChange={event => setBdaFilter(event.target.value)} className="border rounded-xl px-3 py-2 text-xs font-bold bg-white"><option value="All">All BDA users</option>{bdas.map(bda => <option key={bda.id} value={bda.id}>{bda.name}</option>)}</select>
        <button onClick={() => loadData(true)} className="p-2.5 border rounded-xl bg-white hover:bg-slate-50" title="Refresh"><RefreshCw className="w-4 h-4" /></button>
        <button onClick={() => onNavigate?.("bda-leads")} className="px-3 py-2 bg-indigo-600 text-white rounded-xl text-xs font-black flex items-center gap-1">Open Leads <ArrowRight className="w-3.5 h-3.5" /></button>
      </div>
    </div>

    <div className="grid grid-cols-2 xl:grid-cols-6 gap-3">
      {[
        ["Total Leads", visibleLeads.length, Users, "text-indigo-700 bg-indigo-50"],
        ["Calls Today", metrics.callsToday, Phone, "text-blue-700 bg-blue-50"],
        ["Connect Rate", `${metrics.connectRate}%`, TrendingUp, "text-cyan-700 bg-cyan-50"],
        ["Converted", metrics.converted, CheckCircle2, "text-emerald-700 bg-emerald-50"],
        ["Conversion Rate", `${metrics.conversionRate}%`, Target, "text-purple-700 bg-purple-50"],
        ["Revenue", `₹${metrics.revenue.toLocaleString("en-IN")}`, IndianRupee, "text-amber-700 bg-amber-50"],
      ].map(([label, value, Icon, color]: any) => <div key={label} className="bg-white border rounded-2xl p-4 shadow-sm"><div className={`w-9 h-9 rounded-xl flex items-center justify-center ${color}`}><Icon className="w-4.5 h-4.5" /></div><p className="text-[10px] uppercase font-black text-slate-400 mt-3">{label}</p><p className="text-xl font-black text-slate-900 mt-1">{value}</p></div>)}
    </div>

    <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
      {[
        ["Qualified Opportunities", metrics.qualified, Target, "text-violet-700 bg-violet-50"],
        ["Total Call Duration", formatDuration(metrics.totalDuration), Timer, "text-blue-700 bg-blue-50"],
        ["Average Call Duration", formatDuration(metrics.averageDuration), Clock3, "text-cyan-700 bg-cyan-50"],
        ["Recorded Pipeline Value", `₹${metrics.activeValue.toLocaleString("en-IN")}`, IndianRupee, "text-emerald-700 bg-emerald-50"],
      ].map(([label, value, Icon, color]: any) => <div key={label} className="bg-white border rounded-2xl px-4 py-3 shadow-sm flex items-center gap-3"><div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}><Icon className="w-4.5 h-4.5" /></div><div><p className="text-[10px] uppercase font-black text-slate-400">{label}</p><p className="text-lg font-black text-slate-900 mt-0.5">{value}</p></div></div>)}
    </div>

    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
      <section className="xl:col-span-2 bg-white border rounded-2xl p-5 shadow-sm"><div className="flex items-center justify-between"><div><h2 className="font-black text-slate-900">Sales Pipeline</h2><p className="text-[10px] text-slate-500">Current lead distribution by stage</p></div><span className="text-xs font-black text-slate-500">{visibleLeads.length} leads</span></div><div className="mt-5 space-y-3">{pipeline.map(item => <div key={item.status} className="grid grid-cols-[100px_1fr_32px] items-center gap-3"><span className="text-xs font-bold text-slate-600">{item.status}</span><div className="h-3 bg-slate-100 rounded-full overflow-hidden"><div className={`h-full rounded-full ${statusColors[item.status]}`} style={{ width: `${Math.max(item.count ? 5 : 0, (item.count / maxPipeline) * 100)}%` }} /></div><span className="text-xs font-black text-slate-800 text-right">{item.count}</span></div>)}</div></section>
      <section className="bg-white border rounded-2xl p-5 shadow-sm"><h2 className="font-black text-slate-900">Callback Health</h2><p className="text-[10px] text-slate-500">Upcoming and overdue sales follow-ups</p><div className="grid grid-cols-2 gap-3 mt-5"><div className="bg-amber-50 border border-amber-100 rounded-xl p-4"><Clock3 className="w-5 h-5 text-amber-600" /><p className="text-2xl font-black text-amber-800 mt-3">{metrics.callbacks}</p><p className="text-[10px] font-black text-amber-700 uppercase">Upcoming</p></div><div className="bg-rose-50 border border-rose-100 rounded-xl p-4"><AlertCircle className="w-5 h-5 text-rose-600" /><p className="text-2xl font-black text-rose-800 mt-3">{metrics.overdue}</p><p className="text-[10px] font-black text-rose-700 uppercase">Overdue</p></div></div></section>
    </div>

    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
      <section className="bg-white border rounded-2xl shadow-sm overflow-hidden"><div className="p-5 border-b"><h2 className="font-black text-slate-900 flex items-center gap-2"><BriefcaseBusiness className="w-4 h-4 text-indigo-600" /> Service Performance</h2><p className="text-[10px] text-slate-500">Services/purposes and their recorded values</p></div><div className="divide-y max-h-80 overflow-y-auto">{serviceSummary.map(service => <div key={service.name} className="p-4 flex items-center justify-between gap-3"><div className="min-w-0"><p className="text-xs font-black text-slate-800 truncate">{service.name}</p><p className="text-[10px] text-slate-500 mt-0.5">{service.leads} lead{service.leads === 1 ? "" : "s"}</p></div><span className="text-xs font-black text-emerald-700">₹{service.amount.toLocaleString("en-IN")}</span></div>)}{serviceSummary.length === 0 && <div className="p-10 text-center text-xs text-slate-400">No service information has been recorded.</div>}</div></section>
      <section className="xl:col-span-2 bg-white border rounded-2xl shadow-sm overflow-hidden"><div className="p-5 border-b"><h2 className="font-black text-slate-900">Lead & Deal Details</h2><p className="text-[10px] text-slate-500">Service, amount, duration, age, and latest calling activity</p></div><div className="overflow-x-auto max-h-80 overflow-y-auto"><table className="w-full text-left text-xs"><thead className="sticky top-0 bg-slate-50 text-[10px] uppercase text-slate-500"><tr><th className="p-3">Lead</th><th className="p-3">Service</th><th className="p-3">Stage</th><th className="p-3 text-right">Amount</th><th className="p-3 text-center">Lead Age</th><th className="p-3 text-center">Calls / Duration</th><th className="p-3">Last Call</th></tr></thead><tbody className="divide-y">{dealRows.map(lead => <tr key={lead.id} className="hover:bg-slate-50"><td className="p-3"><p className="font-black text-slate-800">{lead.name}</p><p className="text-[10px] text-slate-500">{lead.companyName || lead.leadId}</p></td><td className="p-3 max-w-48"><p className="font-bold text-slate-700 truncate">{lead.services.length ? lead.services.map((service: any) => service.serviceName).filter(Boolean).join(", ") : lead.salesReason || "Not recorded"}</p></td><td className="p-3"><span className="text-[10px] font-black bg-slate-100 rounded-full px-2 py-1">{lead.status}</span></td><td className="p-3 text-right font-black text-emerald-700">{lead.convertedAmount ? `₹${Number(lead.convertedAmount).toLocaleString("en-IN")}` : "Not recorded"}</td><td className="p-3 text-center font-bold">{lead.ageDays == null ? "—" : `${lead.ageDays} days`}</td><td className="p-3 text-center"><p className="font-black">{lead.totalCalls} calls</p><p className="text-[10px] text-slate-500">{formatDuration(lead.totalDuration)}</p></td><td className="p-3"><p className="font-bold text-slate-700">{lead.lastCall?.callStatus || "No call"}</p><p className="text-[10px] text-slate-500">{lead.lastCall ? new Date(lead.lastCall.callDateTime).toLocaleDateString("en-IN") : "—"}</p></td></tr>)}{dealRows.length === 0 && <tr><td colSpan={7} className="p-10 text-center text-slate-400">No lead details found.</td></tr>}</tbody></table></div></section>
    </div>

    <section className="bg-white border rounded-2xl shadow-sm overflow-hidden"><div className="p-5 border-b"><h2 className="font-black text-slate-900">BDA Performance</h2><p className="text-[10px] text-slate-500">User-wise leads, calls, time, callbacks, conversions, and amount</p></div><div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead className="bg-slate-50 text-[10px] uppercase text-slate-500"><tr><th className="p-3">BDA User</th><th className="p-3 text-center">Assigned Leads</th><th className="p-3 text-center">Calls</th><th className="p-3 text-center">Connected</th><th className="p-3 text-center">Call Duration</th><th className="p-3 text-center">Callbacks</th><th className="p-3 text-center">Converted</th><th className="p-3 text-right">Amount</th></tr></thead><tbody className="divide-y">{performance.map(row => <tr key={row.id} className="hover:bg-slate-50"><td className="p-3 font-black text-slate-800"><span className="inline-flex items-center gap-2"><UserRound className="w-4 h-4 text-indigo-500" />{row.name}</span></td><td className="p-3 text-center font-bold">{row.leads}</td><td className="p-3 text-center font-bold">{row.calls}</td><td className="p-3 text-center font-bold text-cyan-700">{row.connected}</td><td className="p-3 text-center font-bold text-blue-700">{formatDuration(row.duration)}</td><td className="p-3 text-center font-bold text-amber-700">{row.callbacks}</td><td className="p-3 text-center font-black text-emerald-700">{row.converted}</td><td className="p-3 text-right font-black text-emerald-700">₹{row.amount.toLocaleString("en-IN")}</td></tr>)}{performance.length === 0 && <tr><td colSpan={8} className="p-10 text-center text-slate-400">No BDA performance data found.</td></tr>}</tbody></table></div></section>

    <section className="bg-white border rounded-2xl shadow-sm overflow-hidden"><div className="p-5 border-b"><h2 className="font-black text-slate-900">Recent Calls</h2><p className="text-[10px] text-slate-500">Latest call activity with duration, interest, and callback</p></div><div className="divide-y max-h-80 overflow-y-auto">{visibleCalls.slice(0, 12).map(call => <div key={call.id} className="p-4 flex items-start justify-between gap-4 hover:bg-slate-50"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="font-black text-xs text-slate-800">{call.bdaName || "BDA User"}</span><span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700">{call.callStatus}</span>{call.customerInterest && <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">{call.customerInterest}</span>}</div><p className="text-xs text-slate-600 mt-1 truncate">{call.conversationNotes}</p><div className="flex flex-wrap gap-3 mt-1.5 text-[10px] font-bold text-slate-500"><span><Timer className="w-3 h-3 inline mr-1" />{formatDuration(Number(call.durationSeconds || 0))}</span>{call.nextCallbackAt && <span><CalendarDays className="w-3 h-3 inline mr-1" />Callback: {new Date(call.nextCallbackAt).toLocaleString("en-IN")}</span>}</div></div><span className="text-[10px] font-bold text-slate-400 whitespace-nowrap">{new Date(call.callDateTime).toLocaleString("en-IN")}</span></div>)}{visibleCalls.length === 0 && <div className="p-10 text-center text-xs text-slate-400">No calls found for the selected filters.</div>}</div></section>
  </div>;
}
