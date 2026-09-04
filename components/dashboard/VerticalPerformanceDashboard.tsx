"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowRight, BarChart3, Briefcase, CalendarDays, CheckCircle2, Clock3, Download, Eye, IndianRupee, MapPin, RefreshCw, Scale, Shield, Target, TrendingUp, Users, X } from "lucide-react";

type Row = Record<string, any>;
type SecurityOperationRow = Row & { attendance: { present: number; absent: number; payout: number } };
const money = (value: number) => `₹${Math.round(value || 0).toLocaleString("en-IN")}`;
const dateLabel = (value: any) => value ? new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";
const numeric = (value: any) => Number(String(value ?? 0).replace(/[^0-9.-]/g, "")) || 0;
const currentMonth = () => { const now = new Date(); return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 7); };
let verticalDashboardCache: { at: number; data: any } | null = null;

export default function VerticalPerformanceDashboard({ onNavigate }: { onNavigate?: (tab: string, filter?: string) => void }) {
  const [data, setData] = useState<{ leads: Row[]; calls: Row[]; cases: Row[]; followups: Row[]; security: Row[]; legalBills: Row[]; payments: Row[]; users: Row[]; securityProjects: Row[]; guardAttendance: Row[] }>({ leads: [], calls: [], cases: [], followups: [], security: [], legalBills: [], payments: [], users: [], securityProjects: [], guardAttendance: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [period, setPeriod] = useState("month");
  const [vertical, setVertical] = useState("All");
  const [followupTab, setFollowupTab] = useState("Today");
  const [showPayments, setShowPayments] = useState(false);

  const loadData = useCallback(async (force = false) => {
    if (!force && verticalDashboardCache && Date.now() - verticalDashboardCache.at < 60_000) {
      setData(verticalDashboardCache.data);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const urls = [
        "/api/bda-leads?status=All",
        "/api/bda-leads/calls",
        "/api/legal-recovery",
        "/api/legal-recovery/followup",
        "/api/legal-recovery/security",
        "/api/legal-recovery/payment",
        "/api/tasks/company-users",
        "/api/legal-recovery/security/projects",
        `/api/legal-recovery/security/guard-attendance?month=${currentMonth()}`
      ];
      const results = await Promise.all(
        urls.map(url =>
          fetch(url, { cache: "no-store" })
            .then(async res => {
              if (!res.ok) return { success: true, data: [] };
              const j = await res.json().catch(() => ({ success: true, data: [] }));
              return j;
            })
            .catch(() => ({ success: true, data: [] }))
        )
      );

      const nextData = {
        leads: Array.isArray(results[0]?.data) ? results[0].data : [],
        calls: Array.isArray(results[1]?.data) ? results[1].data : [],
        cases: Array.isArray(results[2]?.data) ? results[2].data : [],
        followups: Array.isArray(results[3]?.data) ? results[3].data : [],
        security: Array.isArray(results[4]?.data) ? results[4].data : [],
        legalBills: [],
        payments: Array.isArray(results[5]?.data) ? results[5].data : [],
        users: Array.isArray(results[6]?.data) ? results[6].data : [],
        securityProjects: Array.isArray(results[7]?.data) ? results[7].data : [],
        guardAttendance: Array.isArray(results[8]?.data) ? results[8].data : []
      };
      setData(nextData);
      verticalDashboardCache = { at: Date.now(), data: nextData };
    } catch (e: any) {
      setError(e.message || "Dashboard data could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { loadData(); }, [loadData]);

  const since = useMemo(() => { const d = new Date(); if (period === "all") return null; if (period === "month") d.setDate(1); else d.setDate(d.getDate() - Number(period)); d.setHours(0, 0, 0, 0); return d; }, [period]);
  const inPeriod = (value: any) => !since || !value || new Date(value) >= since;
  const leads = useMemo(() => data.leads.filter(x => inPeriod(x.createdAt)), [data.leads, since]);
  const calls = useMemo(() => data.calls.filter(x => inPeriod(x.callDateTime || x.createdAt)), [data.calls, since]);
  // Bank Cases are outstanding master records, not period activity. Their pending
  // balance must remain visible even when the case was created before the filter.
  const cases = data.cases;
  const security = useMemo(() => data.security.filter(x => inPeriod(x.createdAt || x.billDate)), [data.security, since]);
  const now = new Date(); const todayKey = now.toLocaleDateString("sv-SE");

  const verticals = useMemo(() => {
    const isMediaLead = (lead: Row) => /\b(media|gpde|gdpe)\b/i.test(`${lead.salesReason || ""} ${lead.convertedServicesJson || ""} ${lead.serviceName || ""}`);
    const mediaLeads = leads.filter(isMediaLead);
    const businessLeads = leads.filter(x => !isMediaLead(x));
    
    // Legal Recovery dynamic metrics from active cases
    const legalTotalBilled = cases.reduce((s, x) => s + numeric(x.totalBillAmount), 0);
    const legalTotalReceived = cases.reduce((s, x) => s + numeric(x.receivedAmount), 0);
    const legalTotalPending = cases.reduce((s, x) => s + numeric(x.pendingAmount), 0);
    const legalCompletedCount = cases.filter(x => /closed|completed|recovered|settled/i.test(x.status || "") || numeric(x.pendingAmount) <= 0).length;

    // Security Services dynamic metrics
    const securityBilled = security.reduce((s, x) => s + numeric(x.billAmount), 0);
    const securityReceived = security.reduce((s, x) => s + numeric(x.receivedAmount), 0);
    const securityPending = security.reduce((s, x) => s + Math.max(0, numeric(x.billAmount) - numeric(x.receivedAmount)), 0);
    const securityCompletedCount = security.filter(x => /paid|received|complete/i.test(x.paymentStatus || "") || (numeric(x.billAmount) > 0 && numeric(x.receivedAmount) >= numeric(x.billAmount))).length;

    // Sales & Business Consultancy dynamic metrics
    const salesRevenue = businessLeads.filter(x => /converted/i.test(x.status || "")).reduce((s, x) => s + numeric(x.convertedAmount), 0);
    const salesPending = businessLeads.filter(x => !/converted|lost/i.test(x.status || "")).reduce((s, x) => s + numeric(x.convertedAmount), 0);
    const mediaRevenue = mediaLeads.filter(x => /converted/i.test(x.status || "")).reduce((s, x) => s + numeric(x.convertedAmount), 0);
    const mediaPending = mediaLeads.filter(x => !/converted|lost/i.test(x.status || "")).reduce((s, x) => s + numeric(x.convertedAmount), 0);

    return [
      { name: "Legal Recovery", icon: Scale, color: "purple", assigned: cases.length, completed: legalCompletedCount, billed: legalTotalBilled, collected: legalTotalReceived, pending: legalTotalPending },
      { name: "Security Services", icon: Shield, color: "blue", assigned: security.length, completed: securityCompletedCount, billed: securityBilled, collected: securityReceived, pending: securityPending },
      { name: "Business Consultancy / Sales BDA", icon: Users, color: "green", assigned: businessLeads.length, completed: businessLeads.filter(x => /converted/i.test(x.status || "")).length, billed: salesRevenue, collected: salesRevenue, pending: salesPending },
      { name: "Media GPDE", icon: BarChart3, color: "violet", assigned: mediaLeads.length, completed: mediaLeads.filter(x => /converted/i.test(x.status || "")).length, billed: mediaRevenue, collected: mediaRevenue, pending: mediaPending },
    ].map(v => ({ ...v, achievement: v.assigned ? Math.round(v.completed / v.assigned * 100) : 0 }));
  }, [leads, cases, security]);

  const totalBusiness = verticals.reduce((s, x) => s + x.billed, 0);
  const collected = verticals.reduce((s, x) => s + x.collected, 0);
  const pendingBillsTotal = verticals.reduce((s, x) => s + x.pending, 0);
  const followups = useMemo(() => {
    const legal = data.followups.map(x => ({ id: `l-${x.id}`, date: x.nextFollowUpDate, client: x.bankName || "Legal case", detail: x.branchName || x.conversationDetails, vertical: "Legal Recovery", owner: x.callerName || "Unassigned", amount: numeric(cases.find(c => String(c.id) === String(x.masterId))?.pendingAmount) }));
    const sales = data.calls.filter(x => x.nextCallbackAt).map(x => { const lead = data.leads.find(l => String(l.id) === String(x.leadId)); const media = /\b(media|gpde|gdpe)\b/i.test(`${lead?.salesReason || ""} ${lead?.convertedServicesJson || ""} ${lead?.serviceName || ""}`); return { id: `s-${x.id}`, date: x.nextCallbackAt, client: x.leadName || x.customerName || "Sales lead", detail: x.conversationNotes, vertical: media ? "Media GPDE" : "Business Consultancy / Sales BDA", owner: x.bdaName || "Unassigned", amount: numeric(lead?.convertedAmount) }; });
    return [...legal, ...sales].filter(x => x.date).sort((a, b) => +new Date(a.date) - +new Date(b.date));
  }, [data.followups, data.calls, data.leads, cases]);
  const categorized = (item: any) => { const key = new Date(item.date).toLocaleDateString("sv-SE"); return key < todayKey ? "Overdue" : key === todayKey ? "Today" : "Upcoming"; };
  const visibleFollowups = followups.filter(x => categorized(x) === followupTab && (vertical === "All" || x.vertical === vertical));

  const activeSecurityRows = useMemo<SecurityOperationRow[]>(() => {
    const attendanceByAssignment = new Map<string, { present: number; absent: number; payout: number }>();
    data.guardAttendance.forEach(record => {
      const key = `${record.securityId}-${record.guardId}`;
      const value = attendanceByAssignment.get(key) || { present: 0, absent: 0, payout: 0 };
      if (record.status === "Present") value.present += 1;
      if (record.status === "Absent") value.absent += 1;
      value.payout += numeric(record.payoutAmount);
      attendanceByAssignment.set(key, value);
    });
    return data.securityProjects
      .filter(project => String(project.status || "").toLowerCase() === "ongoing")
      .map(project => ({
        ...project,
        attendance: attendanceByAssignment.get(`${project.sourceSecurityId}-${project.guardId}`) || { present: 0, absent: 0, payout: 0 },
      } as SecurityOperationRow))
      .sort((a, b) => String(a.nbfcName).localeCompare(String(b.nbfcName)) || String(a.siteName).localeCompare(String(b.siteName)) || String(a.guardName).localeCompare(String(b.guardName)));
  }, [data.securityProjects, data.guardAttendance]);
  const securityOperations = useMemo(() => ({
    projects: new Set(activeSecurityRows.map(row => row.sourceSecurityId ? `source-${row.sourceSecurityId}` : `site-${row.nbfcName}-${row.siteName}`)).size,
    guards: new Set(activeSecurityRows.map(row => String(row.guardId || row.guardName))).size,
    present: activeSecurityRows.reduce((sum, row) => sum + row.attendance.present, 0),
    payout: activeSecurityRows.reduce((sum, row) => sum + row.attendance.payout, 0),
  }), [activeSecurityRows]);

  const people = useMemo(() => {
    const map = new Map<string, any>();
    const userNames = new Map(data.users.map(user => [String(user.id), String(user.name || user.id)]));
    
    // Helper to sanitize and check if a name is a real internal staff member
    const isValidStaffName = (name: string) => {
      if (!name) return false;
      const lower = name.trim().toLowerCase();
      if (
        lower === "unassigned" ||
        lower === "system" ||
        lower === "fo" ||
        lower === "fieldofficertest" ||
        lower === "test user" ||
        lower === "test" ||
        lower === "not assigned" ||
        lower === "n/a" ||
        /^\d+$/.test(lower) || // purely numeric string like 1782911515580
        /^user_\d+/i.test(lower) // raw ID like USER_314515_708
      ) {
        return false;
      }
      return true;
    };

    const get = (name: string, role: string) => {
      const cleanName = (userNames.get(String(name || "")) || name || "").trim();
      if (!isValidStaffName(cleanName)) return null;
      const key = `${cleanName}-${role}`;
      if (!map.has(key)) {
        map.set(key, { name: cleanName, role, assigned: 0, completed: 0, followups: 0, payments: 0, revenue: 0 });
      }
      return map.get(key);
    };

    // 1. Sales & BDA leads (Assigned employees)
    leads.forEach(x => {
      const role = /\b(media|gpde|gdpe)\b/i.test(`${x.salesReason || ""} ${x.convertedServicesJson || ""} ${x.serviceName || ""}`) ? "Media GPDE" : "Business Consultancy / Sales BDA";
      const p = get(x.assignedToName, role);
      if (p) {
        p.assigned++;
        if (/converted/i.test(x.status || "")) {
          p.completed++;
          p.revenue += numeric(x.convertedAmount);
        }
      }
    });

    // 2. Sales Calling executives
    calls.forEach(x => {
      const lead = data.leads.find(item => String(item.id) === String(x.leadId));
      const role = /\b(media|gpde|gdpe)\b/i.test(`${lead?.salesReason || ""} ${lead?.convertedServicesJson || ""} ${lead?.serviceName || ""}`) ? "Media GPDE" : "Business Consultancy / Sales BDA";
      const p = get(x.bdaName, role);
      if (p && x.nextCallbackAt) p.followups++;
    });

    // 3. Legal Recovery calling staff (Follow-up callers)
    data.followups.forEach(x => {
      const p = get(x.callerName, "Legal Recovery");
      if (p) p.followups++;
    });

    // 4. Legal Recovery payment collectors
    data.payments.forEach(x => {
      const p = get(x.receivedBy || x.employeeName, "Legal Recovery");
      if (p) { p.payments++; p.completed++; p.revenue += numeric(x.amount); }
    });

    // 5. Security services staff. `createdBy` is only the data-entry user and
    // must not be credited as the person who performed the security work.
    security.forEach(x => {
      const p = get(x.guardName || x.assignedStaffName || x.employeeName, "Security Services");
      if (p) {
        p.assigned++;
        if (/paid|received|complete/i.test(x.paymentStatus || "")) p.completed++;
        p.revenue += numeric(x.receivedAmount);
      }
    });

    return [...map.values()]
      .map(x => ({ ...x, activity: x.completed + x.followups, score: x.completed + x.followups }))
      .sort((a, b) => b.score - a.score || b.revenue - a.revenue || b.completed - a.completed);
  }, [leads, calls, data.leads, data.followups, data.payments, security, data.users]);

  const pendingRows = useMemo(() => {
    const legalRows = cases
      .filter(x => numeric(x.pendingAmount) > 0)
      .map(x => ({
        id: `b-${x.id}`,
        client: x.bankName || "Unknown Bank",
        vertical: "Legal Recovery",
        ref: x.noticesList?.[0]?.billNo || (x.branchId && x.branchId !== "N/A" ? x.branchId : `CASE-${x.id}`),
        due: x.pendingSince || x.createdAt,
        amount: numeric(x.pendingAmount),
        location: x.branchName || "General Branch",
        amountDetail: "Bank-case pending amount"
      }));

    const securityRows = security
      .filter(x => numeric(x.billAmount) > numeric(x.receivedAmount))
      .map(x => ({
        id: `q-${x.id}`,
        client: x.nbfcName || x.company || x.clientName || "Security Client",
        vertical: x.nbfcName || x.nbfcId ? "Security Services (NBFC)" : "Security Services",
        ref: x.billNo || `SEC-${x.id}`,
        due: x.billDate || x.createdAt,
        amount: numeric(x.billAmount) - numeric(x.receivedAmount),
        location: x.branchName || x.location || x.siteType || "General Site",
        amountDetail: `Bill ${money(numeric(x.billAmount))} − received ${money(numeric(x.receivedAmount))}`
      }));

    return [...legalRows, ...securityRows].sort((a, b) => b.amount - a.amount);
  }, [cases, security]);

  const aging = useMemo(() => {
    const buckets = [0, 0, 0, 0];
    pendingRows.forEach(x => {
      const days = x.due ? Math.max(0, Math.floor((Date.now() - +new Date(x.due)) / 86400000)) : 0;
      if (days <= 30) buckets[0] += x.amount;
      else if (days <= 60) buckets[1] += x.amount;
      else if (days <= 90) buckets[2] += x.amount;
      else buckets[3] += x.amount;
    });
    return buckets;
  }, [pendingRows]);

  const overdueCount = followups.filter(x => categorized(x) === "Overdue").length;
  const filteredVerticals = vertical === "All" ? verticals : verticals.filter(x => x.name === vertical);

  if (loading) return <div className="min-h-[65vh] bg-white border rounded-2xl flex items-center justify-center gap-3"><RefreshCw className="w-7 h-7 animate-spin text-[#744868]"/><b className="text-slate-600">Loading vertical dashboard...</b></div>;
  if (error) return <div className="min-h-[50vh] bg-white border rounded-2xl flex flex-col items-center justify-center"><AlertTriangle className="text-rose-500"/><b className="mt-2">{error}</b><button onClick={() => loadData(true)} className="mt-4 bg-[#744868] text-white px-4 py-2 rounded-lg">Retry</button></div>;

  return (
    <div className="p-4 md:p-6 bg-[#f7f7f9] min-h-screen space-y-4 text-slate-800">
      <header className="bg-white border rounded-2xl p-5 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black flex items-center gap-2"><BarChart3 className="text-[#744868]"/>Sales & Vertical Performance Dashboard</h1>
          <p className="text-xs text-slate-500 mt-1">Unified sales, operations, collections and follow-up overview</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select value={period} onChange={e=>setPeriod(e.target.value)} className="input">
            <option value="month">This Month</option>
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="all">All Time</option>
          </select>
          <select value={vertical} onChange={e=>setVertical(e.target.value)} className="input">
            <option>All</option>
            {verticals.map(x=><option key={x.name}>{x.name}</option>)}
          </select>
          <button onClick={() => loadData(true)} className="btn"><RefreshCw className="w-4 h-4"/>Refresh</button>
          <button onClick={()=>window.print()} className="btn bg-[#744868] text-white"><Download className="w-4 h-4"/>Export</button>
        </div>
      </header>

      {(overdueCount > 0 || aging[3] > 0) && (
        <div className="border border-rose-200 bg-rose-50 text-rose-700 rounded-xl px-4 py-3 text-xs font-bold flex gap-4">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5"/>
          <span>{overdueCount} overdue follow-ups • {money(aging[3])} bills older than 90 days</span>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3">
        {[
          ["Total Business", money(totalBusiness), Briefcase],
          ["Collected", money(collected), CheckCircle2],
          ["Pending Bills", money(pendingBillsTotal), IndianRupee],
          ["Active Leads", leads.filter(x=>!/converted|lost/i.test(x.status||"")).length, Users],
          ["Follow-ups Due", followups.filter(x=>categorized(x)!=="Overdue").length, CalendarDays],
          ["Overdue", overdueCount, Clock3],
          ["Conversion", `${leads.length?Math.round(leads.filter(x=>/converted/i.test(x.status||"")).length/leads.length*100):0}%`, Target]
        ].map(([label,value,Icon]:any)=>(
          <div key={label} className="card p-4">
            <Icon className="w-8 h-8 p-2 rounded-lg bg-purple-50 text-[#744868]"/>
            <p className="label mt-3">{label}</p>
            <p className="text-xl font-black mt-1">{value}</p>
          </div>
        ))}
      </div>

      <section>
        <h2 className="font-black mb-2">Vertical Performance</h2>
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredVerticals.map(v=>(
            <div key={v.name} className="card p-4 border-t-2 border-t-[#744868]">
              <div className="flex items-center gap-2">
                <v.icon className="w-5 h-5 text-[#744868]"/>
                <b>{v.name}</b>
              </div>
              <div className="grid grid-cols-2 gap-y-2 text-xs mt-4">
                <span>Work completed</span>
                <b className="text-right">{v.completed} / {v.assigned}</b>
                <span>{v.name === "Legal Recovery" ? "Total case amount" : "Billed amount"}</span>
                {v.name === "Legal Recovery" ? <button type="button" onClick={() => onNavigate?.("legal-recovery", "masters")} className="text-right font-bold underline underline-offset-2 hover:text-[#744868]">{money(v.billed)}</button> : <b className="text-right">{money(v.billed)}</b>}
                <span>{v.name === "Legal Recovery" ? "Payments received" : "Collected"}</span>
                {v.name === "Legal Recovery" ? (
                  <button type="button" onClick={() => onNavigate?.("legal-recovery", "masters")} className="text-right text-emerald-600 font-bold underline underline-offset-2 hover:text-emerald-800" title="Open Bank Cases">
                    {money(v.collected)} <Eye className="inline w-3 h-3 ml-1"/>
                  </button>
                ) : (
                  <b className="text-right text-emerald-600">{money(v.collected)}</b>
                )}
                <span>{v.name === "Legal Recovery" ? "Remaining amount" : "Pending"}</span>
                {v.name === "Legal Recovery" ? <button type="button" onClick={() => onNavigate?.("legal-recovery", "masters")} className="text-right text-rose-600 font-bold underline underline-offset-2 hover:text-rose-800">{money(v.pending)}</button> : <b className="text-right text-rose-600">{money(v.pending)}</b>}
              </div>
              <div className="mt-4 h-2 rounded-full bg-slate-100">
                <div className="h-2 rounded-full bg-[#744868]" style={{width:`${Math.min(100,v.achievement)}%`}}/>
              </div>
              <p className="label mt-2 text-right">{v.achievement}% achievement</p>
            </div>
          ))}
        </div>
      </section>

      {(vertical === "All" || vertical === "Security Services") && <section className="card overflow-hidden">
        <div className="p-5 border-b flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div><h2 className="font-black flex items-center gap-2"><Shield className="w-5 h-5 text-blue-600"/>Live Security Projects & Guard Deployment</h2><p className="sub mt-1">{currentMonth()} attendance ke according ongoing sites, guard presence aur payable payout</p></div>
          <button type="button" onClick={() => onNavigate?.("security", "attendance")} className="btn self-start"><Eye className="w-4 h-4"/>Open Security Attendance</button>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 p-4 bg-slate-50 border-b">
          <div className="bg-white border rounded-xl p-3"><p className="label">Ongoing Projects</p><b className="text-xl">{securityOperations.projects}</b></div>
          <div className="bg-white border rounded-xl p-3"><p className="label">Deployed Guards</p><b className="text-xl">{securityOperations.guards}</b></div>
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3"><p className="label text-emerald-700">Present Duties</p><b className="text-xl text-emerald-700">{securityOperations.present}</b></div>
          <div className="bg-violet-50 border border-violet-200 rounded-xl p-3"><p className="label text-violet-700">Current Payout</p><b className="text-xl text-violet-700">{money(securityOperations.payout)}</b></div>
        </div>
        <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-xs border-collapse">
          <thead className="bg-[#F3F0EC] text-[9px] uppercase"><tr>{["#", "NBFC / Project", "Site", "Guard", "Started Date", "Present Days", "Absent Days", "Current Payout", "Status"].map(title => <th key={title} className="p-3 border-r last:border-r-0 text-left whitespace-nowrap">{title}</th>)}</tr></thead>
          <tbody>{activeSecurityRows.map((row, index) => <tr key={`${row.id}-${row.guardId}`} className="border-t hover:bg-slate-50">
            <td className="p-3 border-r">{index + 1}</td><td className="p-3 border-r font-bold">{row.nbfcName}</td><td className="p-3 border-r"><span className="flex items-center gap-1 font-semibold"><MapPin className="w-3.5 h-3.5 text-blue-500"/>{row.siteName}</span></td><td className="p-3 border-r"><b>{row.guardName}</b><span className="block text-[9px] text-slate-400">{row.contactNumber || "—"}</span></td><td className="p-3 border-r whitespace-nowrap">{dateLabel(row.siteStartedDate)}</td><td className="p-3 border-r font-black text-emerald-700 text-center">{row.attendance.present}</td><td className="p-3 border-r font-black text-rose-600 text-center">{row.attendance.absent}</td><td className="p-3 border-r font-black text-violet-700 text-right">{money(row.attendance.payout)}</td><td className="p-3"><span className="rounded-full px-2 py-1 bg-amber-50 text-amber-700 border border-amber-200 font-bold">Ongoing</span></td>
          </tr>)}{!activeSecurityRows.length && <tr><td colSpan={9} className="p-10 text-center text-slate-400">Koi ongoing security project available nahi hai.</td></tr>}</tbody>
        </table></div>
      </section>}

      <div className="grid xl:grid-cols-3 gap-4">
        {/* Work Completed by Vertical */}
        <section className="card p-5 xl:col-span-2 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="font-black text-base text-slate-900">Work Completed by Vertical</h2>
              <p className="sub">Assigned versus completed work volume</p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-slate-300 inline-block"/> <span className="text-slate-600 font-semibold">Assigned</span></div>
              <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-[#744868] inline-block"/> <span className="text-[#744868] font-bold">Completed</span></div>
            </div>
          </div>

          <div className="h-64 flex items-end justify-around gap-6 pt-8 pb-2 border-b border-slate-100">
            {filteredVerticals.map(v => {
              const maxVal = Math.max(1, ...verticals.map(x => Math.max(x.assigned, x.completed)));
              const maxHeightPx = 160;
              const assignedHeight = Math.max(16, Math.round((v.assigned / maxVal) * maxHeightPx));
              const completedHeight = v.completed > 0 ? Math.max(16, Math.round((v.completed / maxVal) * maxHeightPx)) : 6;
              const completionRate = v.assigned > 0 ? Math.round((v.completed / v.assigned) * 100) : 0;

              return (
                <div key={v.name} className="flex-1 flex flex-col items-center justify-end h-full">
                  <div className="flex items-end justify-center gap-3 w-full h-[180px]">
                    {/* Assigned bar */}
                    <div className="flex flex-col items-center justify-end h-full">
                      <span className="text-[11px] font-black text-slate-500 mb-1">{v.assigned}</span>
                      <div
                        className="w-8 sm:w-12 bg-slate-200 hover:bg-slate-300 rounded-t-lg transition-all duration-500 border border-slate-300/60 shadow-xs"
                        style={{ height: `${assignedHeight}px` }}
                        title={`Assigned: ${v.assigned}`}
                      />
                    </div>
                    {/* Completed bar */}
                    <div className="flex flex-col items-center justify-end h-full">
                      <span className="text-[11px] font-black text-[#744868] mb-1">{v.completed}</span>
                      <div
                        className="w-8 sm:w-12 bg-gradient-to-t from-[#744868] to-[#9c638d] hover:brightness-110 rounded-t-lg transition-all duration-500 shadow-md border border-[#744868]"
                        style={{ height: `${completedHeight}px` }}
                        title={`Completed: ${v.completed} (${completionRate}%)`}
                      />
                    </div>
                  </div>
                  <div className="mt-3 text-center">
                    <p className="text-xs font-bold text-slate-800 max-w-[140px] truncate" title={v.name}>{v.name}</p>
                    <span className="inline-block mt-0.5 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                      {completionRate}% Done
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Revenue Contribution */}
        <section className="card p-5">
          <h2 className="font-black">Revenue Contribution</h2>
          <p className="sub">Recorded business by vertical</p>
          <div className="space-y-4 mt-6">
            {verticals.map(v => {
              const sharePct = totalBusiness > 0 ? ((v.billed / totalBusiness) * 100) : 0;
              return (
                <div key={v.name}>
                  <div className="flex justify-between text-xs font-bold mb-1">
                    <span className="text-slate-700">{v.name}</span>
                    <span className="text-slate-900">{money(v.billed)} <span className="text-[10px] text-slate-500 font-normal">({sharePct.toFixed(1)}%)</span></span>
                  </div>
                  <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-[#744868] to-[#9c638d] rounded-full transition-all duration-500" style={{ width: `${Math.max(3, sharePct)}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* Team Performance Table */}
      <section className="card overflow-hidden">
        <div className="p-4 border-b flex justify-between items-center">
          <div>
            <h2 className="font-black">Team Performance</h2>
            <p className="sub">Employee-wise completed work, follow-ups and revenue</p>
          </div>
          <span className="text-xs text-slate-500 font-semibold">{people.length} Active Contributors</span>
        </div>
        <div className="overflow-x-auto">
          <table>
            <thead>
              <tr>
                <th>Employee</th>
                <th>Role / Vertical</th>
                <th>Assigned</th>
                <th>Completed</th>
                <th>Follow-ups</th>
                <th>Payments</th>
                <th>Amount Collected</th>
                <th>Activity</th>
              </tr>
            </thead>
            <tbody>
              {people.map((p, i) => (
                <tr key={`${p.name}-${p.role}`}>
                  <td>
                    <b>{p.name}</b>
                    {i === 0 && p.score > 0 ? <span className="badge ml-2 bg-purple-100 text-purple-800">Top performer</span> : null}
                  </td>
                  <td>{p.role}</td>
                  <td>{p.assigned}</td>
                  <td>{p.completed}</td>
                  <td>{p.followups}</td>
                  <td className="font-black text-emerald-700">{p.payments}</td>
                  <td className="font-black text-emerald-700">{money(p.revenue)}</td>
                  <td><span className="badge">{p.activity} action{p.activity === 1 ? "" : "s"}</span></td>
                </tr>
              ))}
              {!people.length && <tr><td colSpan={8} className="empty">No employee activity recorded.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      {/* Pending Bills & Follow-up Planner */}
      <div className="grid xl:grid-cols-2 gap-4">
        {/* Pending Bills & Aging */}
        <section className="card overflow-hidden">
          <div className="p-4 border-b">
            <h2 className="font-black">Pending Bills &amp; Aging</h2>
            <p className="sub">Outstanding amount grouped by age</p>
          </div>
          <div className="grid grid-cols-4 gap-2 p-4 bg-slate-50/50 border-b">
            {[["0–30 Days", aging[0]], ["31–60 Days", aging[1]], ["61–90 Days", aging[2]], ["90+ Days", aging[3]]].map(([l, v]: any) => (
              <div key={l} className="bg-white border rounded-lg p-2.5 text-center shadow-2xs">
                <p className="label">{l}</p>
                <b className={`text-xs ${l === "90+ Days" && v > 0 ? "text-rose-600" : "text-slate-800"}`}>{money(v)}</b>
              </div>
            ))}
          </div>
          <div className="overflow-x-auto max-h-72">
            <table>
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Vertical</th>
                  <th>Branch Code / Bill No.</th>
                  <th>Pending Since / Bill Date</th>
                  <th>Pending Amount</th>
                  <th>Branch / Site</th>
                </tr>
              </thead>
              <tbody>
                {pendingRows.slice(0, 12).map(x => (
                  <tr key={x.id}>
                    <td><b>{x.client || "Unknown"}</b></td>
                    <td>{x.vertical}</td>
                    <td>{x.ref}</td>
                    <td>{dateLabel(x.due)}</td>
                    <td className="text-rose-600 font-bold" title={x.amountDetail}>{money(x.amount)}</td>
                    <td>{x.location}</td>
                  </tr>
                ))}
                {!pendingRows.length && <tr><td colSpan={6} className="empty">No pending bills recorded.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>

        {/* Follow-up Planner */}
        <section className="card overflow-hidden">
          <div className="p-4 border-b">
            <h2 className="font-black">Follow-up Planner</h2>
            <p className="sub">Legal and sales callbacks in one place</p>
            <div className="flex gap-2 mt-3">
              {["Today", "Upcoming", "Overdue"].map(x => (
                <button
                  key={x}
                  onClick={() => setFollowupTab(x)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                    followupTab === x ? "bg-[#744868] text-white" : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                  }`}
                >
                  {x} ({followups.filter(f => categorized(f) === x).length})
                </button>
              ))}
            </div>
          </div>
          <div className="divide-y max-h-96 overflow-y-auto">
            {visibleFollowups.map(x => (
              <div key={x.id} className={`p-4 ${followupTab === "Overdue" ? "bg-rose-50/40" : ""}`}>
                <div className="flex justify-between gap-3">
                  <div>
                    <b className="text-sm">{x.client}</b>
                    <p className="text-[10px] text-slate-500 mt-1">{x.vertical} • {x.owner}</p>
                  </div>
                  <span className={`badge ${followupTab === "Overdue" ? "text-rose-700 bg-rose-100" : ""}`}>
                    {dateLabel(x.date)}
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-2 line-clamp-2">{x.detail || "Follow-up scheduled"}</p>
                {x.amount > 0 && <p className="text-xs font-black mt-2">Amount: {money(x.amount)}</p>}
              </div>
            ))}
            {!visibleFollowups.length && <div className="empty">No {followupTab.toLowerCase()} follow-ups.</div>}
          </div>
        </section>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <button onClick={() => onNavigate?.("sales-dashboard")} className="btn hover:bg-slate-50">
          Open Sales Dashboard <ArrowRight className="w-4 h-4"/>
        </button>
        <button onClick={() => onNavigate?.("legal-recovery", "masters")} className="btn bg-[#744868] text-white hover:bg-[#5e3853]">
          Open Legal Recovery <ArrowRight className="w-4 h-4"/>
        </button>
      </div>

      {showPayments && (
        <div className="fixed inset-0 z-[100] bg-slate-950/50 backdrop-blur-[2px] flex items-center justify-center p-4" onMouseDown={() => setShowPayments(false)}>
          <div className="bg-white rounded-2xl shadow-2xl border w-full max-w-6xl max-h-[85vh] overflow-hidden animate-scale-in" onMouseDown={e => e.stopPropagation()}>
            <div className="p-5 border-b flex items-start justify-between">
              <div>
                <h2 className="text-lg font-black flex items-center gap-2"><IndianRupee className="w-5 h-5 text-emerald-600"/>Legal Recovery Payments</h2>
                <p className="sub mt-1">Bank and branch-wise payment collection details</p>
              </div>
              <button onClick={() => setShowPayments(false)} className="p-2 rounded-lg hover:bg-slate-100"><X className="w-5 h-5"/></button>
            </div>
            <div className="grid grid-cols-3 gap-3 p-4 bg-slate-50 border-b">
              <div className="card p-3"><p className="label">Payment Entries</p><b className="text-lg">{data.payments.length}</b></div>
              <div className="card p-3"><p className="label">Total Received</p><b className="text-lg text-emerald-600">{money(cases.reduce((s, x) => s + numeric(x.receivedAmount), 0))}</b></div>
              <div className="card p-3"><p className="label">Remaining</p><b className="text-lg text-rose-600">{money(cases.reduce((s, x) => s + numeric(x.pendingAmount), 0))}</b></div>
            </div>
            <div className="overflow-auto max-h-[58vh]">
              <table>
                <thead className="sticky top-0 z-10">
                  <tr>
                    <th>Payment Date</th>
                    <th>Bank</th>
                    <th>Branch</th>
                    <th>Case ID</th>
                    <th>Amount Received</th>
                    <th>Payment Mode</th>
                    <th>Transaction ID</th>
                    <th>Received By</th>
                    <th>Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {data.payments.map(payment => (
                    <tr key={payment.id}>
                      <td>{dateLabel(payment.paymentDate || payment.createdAt)}</td>
                      <td><b>{payment.bankName || "Unknown Bank"}</b></td>
                      <td>{payment.branchName || "General"}</td>
                      <td>CASE-{payment.masterId}</td>
                      <td className="font-black text-emerald-600">{money(numeric(payment.amount))}</td>
                      <td>{payment.paymentMode || "—"}</td>
                      <td>{payment.transactionId || "—"}</td>
                      <td>{payment.receivedBy || payment.employeeName || "System"}</td>
                      <td className="max-w-56 truncate" title={payment.remarks || ""}>{payment.remarks || "—"}</td>
                    </tr>
                  ))}
                  {!data.payments.length && <tr><td colSpan={9} className="empty">No Legal Recovery payment logs found.</td></tr>}
                </tbody>
              </table>
            </div>
            <div className="p-4 border-t flex justify-end">
              <button onClick={() => setShowPayments(false)} className="btn bg-[#744868] text-white">Close</button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .card { background: white; border: 1px solid #e2e8f0; border-radius: 14px; box-shadow: 0 1px 2px #00000008; }
        .input, .btn { border: 1px solid #e2e8f0; border-radius: 10px; padding: 9px 12px; font-size: 12px; font-weight: 700; background-color: white; }
        .btn { display: flex; align-items: center; gap: 6px; cursor: pointer; }
        .label { font-size: 9px; text-transform: uppercase; font-weight: 800; color: #94a3b8; }
        .sub { font-size: 10px; color: #64748b; margin-top: 2px; }
        table { width: 100%; font-size: 11px; text-align: left; }
        th { background: #f8fafc; color: #64748b; text-transform: uppercase; font-size: 9px; padding: 11px; }
        td { padding: 11px; border-top: 1px solid #f1f5f9; white-space: nowrap; }
        .badge { display: inline-block; border-radius: 99px; background: #f5f3ff; color: #744868; padding: 3px 7px; font-size: 9px; font-weight: 800; }
        .empty { text-align: center; color: #94a3b8; padding: 38px !important; }
      `}</style>
    </div>
  );
}
