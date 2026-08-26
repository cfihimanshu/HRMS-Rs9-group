"use client";

import React from "react";
import {
  AlertTriangle, ArrowUpRight, Building2, CalendarDays,
  Clock3, FileCheck2, IndianRupee, ListChecks, Mail,
  MapPin, RefreshCw, Scale, ShieldCheck, TrendingUp, UserCheck, Users,
  Package, WalletCards, UserPlus, Megaphone, FileText, Car, Database,
  ClipboardList, FolderKanban, UserRoundCheck
} from "lucide-react";

type Props = {
  sessionUser?: any;
  stats: any;
  riskAlertList: any[];
  onResolveAlert: (id: string) => void;
  onNavigateTab: (tab: string, filter?: string) => void;
  triggerToast: (msg: string) => void;
  companies?: any[];
  selectedCompanyId?: string;
  onCompanyChange?: (id: string) => void;
};

const completedStatuses = new Set(["completed", "complete", "done", "approved", "resolved"]);
const safeArray = (value: any) => Array.isArray(value) ? value : [];
const indiaDateKey = (value: any) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
};

function companyNames(value: any): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.flatMap(item => companyNames(item)).filter(Boolean);
  if (typeof value === "string") {
    try { return companyNames(JSON.parse(value)); } catch {
      return value.split(",").map(item => item.trim()).filter(Boolean);
    }
  }
  if (typeof value === "object") {
    return [value.id, value.companyId, value.code, value.name, value.label, value.value].map(item => String(item || "").trim()).filter(Boolean);
  }
  return [String(value)].filter(Boolean);
}

const normalizedCompanyKey = (value: any) => String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
const companyReferenceKeys = (company: any) => new Set(
  [company?.id, company?.code, company?.name, company?.shortName].map(normalizedCompanyKey).filter(Boolean)
);
const memberMatchesCompany = (member: any, company: any) => {
  const targetKeys = companyReferenceKeys(company);
  return companyNames(member?.companies || member?.company || member?.companyId)
    .map(normalizedCompanyKey)
    .some(key => targetKeys.has(key));
};

function readableProgressNote(value: any): string {
  if (!value) return "";
  if (Array.isArray(value)) {
    for (let index = value.length - 1; index >= 0; index -= 1) {
      const note = readableProgressNote(value[index]);
      if (note) return note;
    }
    return "";
  }
  if (typeof value === "object") {
    for (const key of ["note", "progressNote", "text", "message", "details", "description"]) {
      const note = readableProgressNote(value[key]);
      if (note) return note;
    }
    return "";
  }
  const text = String(value).trim();
  if (!text) return "";
  if ((text.startsWith("[") && text.endsWith("]")) || (text.startsWith("{") && text.endsWith("}"))) {
    try { return readableProgressNote(JSON.parse(text)); } catch { return ""; }
  }
  return text.replace(/\s+/g, " ");
}

function readableWorkDetail(task: any): string {
  const progress = readableProgressNote(task?.progressNotes);
  if (progress) return `Progress: ${progress}`;
  const description = String(task?.description || "").replace(/\s+/g, " ").trim();
  return description;
}

function MetricCard({ label, value, detail, icon: Icon, tone, onClick }: any) {
  const colors: any = {
    plum: "bg-purple-50 text-[#714B67] border-purple-100",
    green: "bg-emerald-50 text-emerald-700 border-emerald-100",
    amber: "bg-amber-50 text-amber-700 border-amber-100",
    red: "bg-rose-50 text-rose-700 border-rose-100",
    blue: "bg-sky-50 text-sky-700 border-sky-100"
  };
  return <button onClick={onClick} className="text-left rounded-2xl border border-[#e8e1da] bg-white p-4 shadow-[0_3px_16px_rgba(58,42,53,0.05)] hover:-translate-y-0.5 hover:shadow-md transition-all min-w-0">
    <div className="flex items-start justify-between gap-3">
      <div className={`w-10 h-10 rounded-full border flex items-center justify-center ${colors[tone] || colors.plum}`}><Icon className="w-5 h-5" /></div>
      <ArrowUpRight className="w-3.5 h-3.5 text-slate-300" />
    </div>
    <div className="mt-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate">{label}</div>
    <div className="mt-0.5 text-2xl font-black text-slate-900 tracking-tight">{value}</div>
    <div className={`mt-1 text-[9px] font-bold ${tone === "red" ? "text-rose-600" : tone === "amber" ? "text-amber-600" : "text-emerald-600"}`}>{detail}</div>
  </button>;
}

export default function OwnerCommandCentre({ sessionUser, stats, riskAlertList, onNavigateTab, triggerToast, companies = [], selectedCompanyId, onCompanyChange }: Props) {
  const [tasks, setTasks] = React.useState<any[]>([]);
  const [verticals, setVerticals] = React.useState<any[]>([]);
  const [departments, setDepartments] = React.useState<any[]>([]);
  const [vertical, setVertical] = React.useState("");
  const [department, setDepartment] = React.useState("");
  const [range, setRange] = React.useState("today");
  const [loading, setLoading] = React.useState(false);
  const [workSummary, setWorkSummary] = React.useState({ total: 0, completed: 0, pending: 0, overdue: 0, legalRecovery: 0, securityWork: 0 });
  const [employeeStatusGroups, setEmployeeStatusGroups] = React.useState<any[]>([]);
  const [operations, setOperations] = React.useState({
    documents: 0, documentsToday: 0, inventory: 0, inventoryToday: 0,
    vehicles: 0, vehiclesToday: 0, vehiclesAssigned: 0
  });
  const mountedRef = React.useRef(true);
  const requestIdRef = React.useRef(0);
  const toastRef = React.useRef(triggerToast);
  React.useEffect(() => { toastRef.current = triggerToast; }, [triggerToast]);
  React.useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const loadWorkData = React.useCallback(async (signal?: AbortSignal) => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setTasks([]);
    setEmployeeStatusGroups([]);
    setWorkSummary({ total: 0, completed: 0, pending: 0, overdue: 0, legalRecovery: 0, securityWork: 0 });
    try {
      const params = new URLSearchParams({ scope: range === "today" ? "today" : "overall" });
      if (selectedCompanyId) params.set("companyId", selectedCompanyId);
      if (vertical) params.set("vertical", vertical);
      if (department) params.set("department", department);
      const taskRes = await fetch(`/api/dashboard/owner-work?${params.toString()}`, { cache: "no-store", signal });
      const taskData = await taskRes.json();
      if (signal?.aborted || requestId !== requestIdRef.current || !mountedRef.current) return;
      if (!taskData?.success) throw new Error(taskData?.error || "Work summary failed");
      setTasks(safeArray(taskData.data?.recentTasks));
      setEmployeeStatusGroups(safeArray(taskData.data?.employeeStatusGroups));
      setWorkSummary({
        total: Number(taskData.data?.summary?.total || 0),
        completed: Number(taskData.data?.summary?.completed || 0),
        pending: Number(taskData.data?.summary?.pending || 0),
        overdue: Number(taskData.data?.summary?.overdue || 0),
        legalRecovery: Number(taskData.data?.modules?.legalRecovery || 0),
        securityWork: Number(taskData.data?.modules?.securityWork || 0)
      });
    } catch (error: any) {
      if (error?.name !== "AbortError") toastRef.current("Work data could not be refreshed");
    } finally {
      if (!signal?.aborted && requestId === requestIdRef.current && mountedRef.current) setLoading(false);
    }
  }, [range, selectedCompanyId, vertical, department]);

  const loadOperations = React.useCallback(async (signal?: AbortSignal) => {
    try {
      const companyQuery = selectedCompanyId ? `?companyId=${encodeURIComponent(selectedCompanyId)}` : "";
      const [documentRes, inventoryRes, vehicleRes] = await Promise.all([
        fetch("/api/document-movement?limit=100", { cache: "no-store", signal }),
        fetch(`/api/assets/inventory${companyQuery}`, { cache: "no-store", signal }),
        fetch(`/api/vehicles${companyQuery}`, { cache: "no-store", signal })
      ]);
      const [documentData, inventoryData, vehicleData] = await Promise.all([documentRes.json(), inventoryRes.json(), vehicleRes.json()]);
      if (signal?.aborted || !mountedRef.current) return;
      const documentRows = documentData?.success ? safeArray(documentData.data) : [];
      const inventoryRows = inventoryData?.success ? safeArray(inventoryData.data) : [];
      const vehicleRows = vehicleData?.success ? safeArray(vehicleData.data) : [];
      setOperations({
        documents: Number(documentData?.summary?.total || documentData?.pagination?.total || documentRows.length),
        documentsToday: documentRows.filter((item: any) => indiaDateKey(item.createdAt || item.receivedAt) === indiaDateKey(new Date())).length,
        inventory: inventoryRows.length,
        inventoryToday: inventoryRows.filter((item: any) => indiaDateKey(item.createdAt) === indiaDateKey(new Date())).length,
        vehicles: Number(vehicleData?.summary?.total || vehicleRows.length),
        vehiclesToday: vehicleRows.filter((item: any) => indiaDateKey(item.createdAt) === indiaDateKey(new Date())).length,
        vehiclesAssigned: Number(vehicleData?.summary?.assigned || vehicleRows.filter((item: any) => String(item.status).toLowerCase() === "assigned").length)
      });
    } catch (error: any) {
      if (error?.name !== "AbortError") toastRef.current("Operational data could not be refreshed");
    }
  }, [selectedCompanyId]);

  React.useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      fetch("/api/verticals", { cache: "force-cache", signal: controller.signal }).then(response => response.json()),
      fetch("/api/departments", { cache: "force-cache", signal: controller.signal }).then(response => response.json())
    ]).then(([verticalData, deptData]) => {
      if (controller.signal.aborted) return;
      setVerticals(verticalData?.success ? safeArray(verticalData.data) : []);
      setDepartments(deptData?.success ? safeArray(deptData.data) : []);
    }).catch(error => { if (error?.name !== "AbortError") toastRef.current("Dashboard master data could not be loaded"); });
    return () => controller.abort();
  }, []);

  React.useEffect(() => {
    const controller = new AbortController();
    loadWorkData(controller.signal);
    return () => controller.abort();
  }, [loadWorkData]);

  React.useEffect(() => {
    const controller = new AbortController();
    loadOperations(controller.signal);
    return () => controller.abort();
  }, [loadOperations]);

  const refreshDashboard = React.useCallback(() => {
    loadWorkData();
    loadOperations();
  }, [loadWorkData, loadOperations]);

  const staff = React.useMemo(() => safeArray(stats?.staffList || stats?.deptStats?.teamList), [stats]);
  const filteredStaff = React.useMemo(() => staff.filter((member: any) => {
    const memberVertical = String(member.vertical || member.employeeProfile?.vertical || member.department || "").toLowerCase();
    const memberDept = String(member.department?.name || member.department || member.employeeProfile?.department || "").toLowerCase();
    if (vertical && !memberVertical.includes(vertical.toLowerCase())) return false;
    if (department && !memberDept.includes(department.toLowerCase())) return false;
    if (selectedCompanyId) {
      const selected = companies.find(c => String(c.id) === String(selectedCompanyId));
      if (!selected || !memberMatchesCompany(member, selected)) return false;
    }
    return true;
  }), [staff, vertical, department, selectedCompanyId, companies]);

  const allowedIds = React.useMemo(() => new Set(filteredStaff.map((member: any) => String(member.id || member.user || member.employeeId)).filter(Boolean)), [filteredStaff]);
  const filteredTasks = React.useMemo(() => tasks.filter((task: any) => {
    if (!vertical && !department && !selectedCompanyId) return true;
    const id = String(task.employee?.id || task.employee || task.forwardedUser?.id || "");
    return !allowedIds.size || allowedIds.has(id);
  }), [tasks, allowedIds, vertical, department, selectedCompanyId]);

  const totalWork = workSummary.total;
  const completed = workSummary.completed;
  const pending = workSummary.pending;
  const overdue = workSummary.overdue;
  const present = filteredStaff.filter((member: any) => member.isPresent || member.attendanceStatus === "Present" || member.sodTime).length;
  const onLeave = filteredStaff.filter((member: any) => member.isOnLeave || member.attendanceStatus === "On Leave").length;
  const absent = filteredStaff.filter((member: any) => member.attendanceStatus === "Absent").length;
  const sodFiled = filteredStaff.filter((member: any) => Boolean(member.sodTime)).length;
  const completionRate = totalWork ? Math.round((completed / totalWork) * 100) : 0;
  const pendingApprovals = Number(stats?.pendingApprovals?.pendingRequestsTotal || 0) + Number(stats?.pendingApprovals?.pendingWarningApprovals || 0);
  const criticalCount = riskAlertList.length + overdue;

  const actionRows = [
    { label: "Leave & Expense Approvals", count: stats?.pendingApprovals?.pendingRequestsTotal || 0, age: "Action required", priority: "High", tab: "ess-leaves" },
    { label: "Hiring Approvals", count: stats?.pendingApprovals?.hiring || stats?.hiring?.pending || 0, age: "Management queue", priority: "Medium", tab: "hiring" },
    { label: "Disciplinary Reviews", count: stats?.operations?.disciplinaryWarnings?.pendingApprovals || 0, age: "HR escalation", priority: "High", tab: "disciplinary-warnings" },
    { label: "Overdue Work Items", count: overdue, age: "Past deadline", priority: "High", tab: "tasks" }
  ].filter(row => Number(row.count) > 0);

  const teamWorkload = React.useMemo(() => filteredStaff.map((member: any) => {
    const memberGroups = employeeStatusGroups.filter((group: any) => String(group.employee) === String(member.id || member.user));
    const total = memberGroups.reduce((sum: number, group: any) => sum + Number(group.count || 0), 0);
    const done = memberGroups.filter((group: any) => completedStatuses.has(String(group.status || "").toLowerCase())).reduce((sum: number, group: any) => sum + Number(group.count || 0), 0);
    return {
      id: String(member.id || member.user),
      name: member.name || "Team Member",
      vertical: member.vertical || member.department || member.role || "Unassigned",
      total,
      done,
      pending: Math.max(0, total - done),
      score: total ? Math.round(done / total * 100) : 0
    };
  }).filter(item => item.total > 0).sort((a, b) => b.pending - a.pending || b.total - a.total).slice(0, 4), [filteredStaff, employeeStatusGroups]);

  const performanceGroups = React.useMemo(() => {
    const names = verticals.length ? verticals.map(v => v.name) : ["Legal Recovery", "Security", "Media GPDE", "Operations"];
    return names.slice(0, 5).map((name: string) => {
      const ids = new Set(filteredStaff.filter((member: any) => String(member.vertical || member.department || "").toLowerCase().includes(name.toLowerCase())).map((m: any) => String(m.id || m.user)));
      const relevant = employeeStatusGroups.filter((group: any) => ids.has(String(group.employee || "")));
      const total = relevant.reduce((sum: number, group: any) => sum + Number(group.count || 0), 0);
      const done = relevant.filter((group: any) => completedStatuses.has(String(group.status || "").toLowerCase())).reduce((sum: number, group: any) => sum + Number(group.count || 0), 0);
      return { name, total, done, score: total ? Math.round(done / total * 100) : null };
    });
  }, [verticals, filteredStaff, employeeStatusGroups]);

  const companyPerformance = React.useMemo(() => companies.map((company: any) => {
    const members = staff.filter((member: any) => memberMatchesCompany(member, company));
    const companyPresent = members.filter((member: any) => member.isPresent || member.attendanceStatus === "Present" || Boolean(member.sodTime)).length;
    return { name: company.name, present: companyPresent, total: members.length, score: members.length ? Math.round(companyPresent / members.length * 100) : null };
  }), [companies, staff]);

  const dateLabel = new Date().toLocaleDateString("en-IN", { weekday: "long", day: "2-digit", month: "short", year: "numeric" });
  const moduleCards = [
    { label: "Employees Directory", value: filteredStaff.length || stats?.roles?.employees || 0, detail: "Employee profiles & access", icon: Users, tab: "employees", color: "text-purple-700 bg-purple-50" },
    { label: "Attendance & Work", value: `${present}/${filteredStaff.length || stats?.roles?.employees || 0}`, detail: "SOD, EOD and performance", icon: UserRoundCheck, tab: "performance", color: "text-emerald-700 bg-emerald-50" },
    { label: "Tasks & Kanban", value: totalWork, detail: `${pending} pending · ${overdue} overdue`, icon: FolderKanban, tab: "tasks", color: "text-blue-700 bg-blue-50" },
    { label: "Hiring Approvals", value: stats?.pendingApprovals?.hiring || stats?.hiring?.pending || 0, detail: "Requisitions and vacancies", icon: UserPlus, tab: "hiring", color: "text-indigo-700 bg-indigo-50" },
    { label: "HR & BDA Leads", value: stats?.hrStats?.hrLeadsCount || stats?.candidates?.total || 0, detail: "Lead and conversion pipeline", icon: Megaphone, tab: "business-leads", color: "text-pink-700 bg-pink-50" },
    { label: "Leave Requests", value: stats?.pendingApprovals?.pendingRequestsTotal || 0, detail: "Pending employee requests", icon: CalendarDays, tab: "ess-leaves", color: "text-amber-700 bg-amber-50" },
    { label: "Payroll & Salary", value: stats?.payroll?.pending || 0, detail: "Payroll processing centre", icon: WalletCards, tab: "ess-payroll", color: "text-emerald-700 bg-emerald-50" },
    { label: "Assets & Inventory", value: operations.inventory, detail: `${operations.inventoryToday} added today · Live inventory`, icon: Package, tab: "inventory-management", color: "text-cyan-700 bg-cyan-50" },
    { label: "Legal Recovery", value: workSummary.legalRecovery, detail: range === "today" ? "Today’s scheduled legal work" : "All scheduled legal work", icon: Scale, tab: "legal-recovery", color: "text-violet-700 bg-violet-50" },
    { label: "Documents", value: operations.documents, detail: `${operations.documentsToday} received today · Custody register`, icon: FileText, tab: "document-movement", color: "text-orange-700 bg-orange-50" },
    { label: "Vehicles & Tracking", value: operations.vehicles, detail: `${operations.vehiclesAssigned} assigned · ${operations.vehiclesToday} added today`, icon: Car, tab: "vehicle-registry", color: "text-sky-700 bg-sky-50" },
    { label: "System Audit", value: stats?.operations?.auditEvents || 0, detail: "Security and activity trail", icon: Database, tab: "audit-trail", color: "text-slate-700 bg-slate-100" }
  ];

  const recentTasks = [...filteredTasks].sort((a: any, b: any) => new Date(b.updatedAt || b.createdAt || b.date || 0).getTime() - new Date(a.updatedAt || a.createdAt || a.date || 0).getTime()).slice(0, 6);
  const recentActivities = React.useMemo(() => safeArray(stats?.hrActivities)
    .filter((activity: any) => activity?.timestamp || activity?.createdAt)
    .sort((a: any, b: any) => new Date(b.timestamp || b.createdAt).getTime() - new Date(a.timestamp || a.createdAt).getTime())
    .slice(0, 8), [stats?.hrActivities]);

  return <div className="space-y-5 text-slate-900 animate-fade-in font-semibold [&_.text-slate-400]:text-slate-600 [&_.text-slate-500]:text-slate-700 [&_.font-medium]:font-bold [&_p]:font-bold">
    <div className="rounded-2xl border-2 border-[#dfd3ca] bg-gradient-to-r from-white to-[#f7f1ed] px-5 py-5 shadow-[0_5px_20px_rgba(75,47,68,0.08)]">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div><div className="text-[10px] font-black uppercase tracking-[0.22em] text-[#8b5d7e]">RS9 Group Executive Workspace</div><h1 className="text-3xl font-black text-[#351d30] tracking-tight">Owner Command Centre</h1><p className="text-[11px] font-bold text-slate-600 mt-1">{dateLabel} · Welcome, {sessionUser?.name?.split(" ")[0] || "Owner"}</p></div>
        <div className="flex flex-wrap gap-2">
          <div className="h-9 rounded-xl border-2 border-[#d8cbc3] bg-white p-0.5 flex items-center" title="Choose today's work or complete historical work">
            <button onClick={() => setRange("today")} className={`h-7 rounded-lg px-3 text-[10px] font-black transition-colors ${range === "today" ? "bg-[#714B67] text-white" : "text-slate-700 hover:bg-slate-100"}`}>Today&apos;s Work</button>
            <button onClick={() => setRange("all")} className={`h-7 rounded-lg px-3 text-[10px] font-black transition-colors ${range === "all" ? "bg-[#714B67] text-white" : "text-slate-700 hover:bg-slate-100"}`}>Overall Work</button>
          </div>
          <select value={selectedCompanyId || ""} onChange={e => onCompanyChange?.(e.target.value)} className="h-9 rounded-xl border border-[#ddd2ca] bg-white px-3 text-[10px] font-bold"><option value="">All Companies</option>{companies.map(company => <option key={company.id} value={company.id}>{company.name}</option>)}</select>
          <select value={vertical} onChange={e => setVertical(e.target.value)} className="h-9 rounded-xl border border-[#ddd2ca] bg-white px-3 text-[10px] font-bold"><option value="">All Verticals</option>{verticals.map(item => <option key={item.id} value={item.name}>{item.name}</option>)}</select>
          <select value={department} onChange={e => setDepartment(e.target.value)} className="h-9 rounded-xl border border-[#ddd2ca] bg-white px-3 text-[10px] font-bold"><option value="">All Departments</option>{departments.map(item => <option key={item.id} value={item.name}>{item.name}</option>)}</select>
          <button onClick={refreshDashboard} disabled={loading} className="h-9 rounded-xl bg-[#714B67] text-white px-3 text-[10px] font-black flex items-center gap-1.5 disabled:opacity-60"><RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh</button>
        </div>
      </div>
    </div>

    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
      <MetricCard label="Active Employees" value={filteredStaff.length || stats?.roles?.employees || 0} detail="Group workforce" icon={Users} tone="plum" onClick={() => onNavigateTab("employees")} />
      <MetricCard label="Present Today" value={present || stats?.todayCompliance?.attendance || 0} detail={`${filteredStaff.length ? Math.round(present / filteredStaff.length * 100) : 0}% attendance`} icon={UserCheck} tone="green" onClick={() => onNavigateTab("performance")} />
      <MetricCard label="Pending Approvals" value={pendingApprovals} detail="Needs owner action" icon={FileCheck2} tone="amber" onClick={() => onNavigateTab("ess-leaves")} />
      <MetricCard label="Overdue Tasks" value={overdue} detail={`${pending} total pending`} icon={Clock3} tone="red" onClick={() => onNavigateTab("tasks")} />
      <MetricCard label="Task Completion" value={`${completionRate}%`} detail={`${completed} of ${totalWork} completed`} icon={TrendingUp} tone="green" onClick={() => onNavigateTab("performance")} />
      <MetricCard label="Critical Alerts" value={criticalCount} detail="Immediate attention" icon={AlertTriangle} tone="red" onClick={() => onNavigateTab("audit-trail")} />
    </div>

    <div className="rounded-xl border-2 border-[#d9c9d5] bg-[#f8f1f6] px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
      <div><div className="text-[11px] font-black uppercase tracking-wide text-[#4d3047]">{range === "today" ? "Today’s Software Work Summary" : "Overall Software Work Summary"}</div><div className="text-[10px] font-bold text-slate-700">{range === "today" ? "Only today’s tasks, completion and pending work are shown." : "Complete task history across the system is shown."}</div></div>
      <div className="flex items-center gap-4 text-[10px] font-black"><span className="text-slate-800">Total <b className="text-lg ml-1">{totalWork}</b></span><span className="text-emerald-700">Completed <b className="text-lg ml-1">{completed}</b></span><span className="text-amber-700">Pending <b className="text-lg ml-1">{pending}</b></span><span className="text-rose-700">Overdue <b className="text-lg ml-1">{overdue}</b></span></div>
    </div>

    <section className="rounded-2xl border-2 border-[#e1d7d0] bg-white p-4 shadow-[0_4px_18px_rgba(58,42,53,0.06)]">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div><h2 className="text-sm font-black text-[#3e2739] uppercase tracking-wide">Complete System Overview</h2><p className="text-[10px] font-bold text-slate-500">Owner access to every major HRMS workspace from one screen</p></div>
        <ClipboardList className="w-5 h-5 text-[#714B67]" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2.5">
        {moduleCards.map(module => <button key={module.label} onClick={() => onNavigateTab(module.tab)} className="group rounded-xl border border-[#e8e0da] bg-[#fdfcfb] p-3 text-left hover:border-[#714B67] hover:shadow-md transition-all min-h-[116px] flex flex-col">
          <div className="flex justify-between items-start"><span className={`w-8 h-8 rounded-lg flex items-center justify-center ${module.color}`}><module.icon className="w-4 h-4" /></span><ArrowUpRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-[#714B67]" /></div>
          <div className="text-xl font-black text-slate-900 mt-2">{module.value}</div>
          <div className="text-[10px] font-black text-[#4d3047] leading-tight">{module.label}</div>
          <div className="text-[8px] font-bold text-slate-400 mt-1 leading-tight">{module.detail}</div>
        </button>)}
      </div>
    </section>

    <div className="grid grid-cols-1 xl:grid-cols-[1.15fr_1fr] gap-4">
      <section className="rounded-2xl border border-[#e7dfd8] bg-white shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-[#eee7e1] flex items-center justify-between"><div><h2 className="text-xs font-black text-[#4d3047]">Critical Action Centre</h2><p className="text-[9px] text-slate-400">Approvals and escalations waiting for a decision</p></div><button onClick={() => onNavigateTab("ess-leaves")} className="text-[9px] font-black text-[#714B67]">View all <ArrowUpRight className="inline w-3 h-3" /></button></div>
        <div className="divide-y divide-[#f0ebe7]">
          {(actionRows.length ? actionRows : [{ label: "No critical approvals pending", count: 0, age: "All caught up", priority: "Clear", tab: "dashboard" }]).map((row, index) => <div key={index} className="px-4 py-3 grid grid-cols-[1fr_auto_auto] items-center gap-3">
            <div className="min-w-0"><div className="text-[11px] font-bold text-slate-800 truncate">{row.label}</div><div className="text-[9px] text-slate-400">{row.age}</div></div>
            <span className={`text-[9px] font-black rounded-full px-2 py-1 ${row.priority === "High" ? "bg-rose-50 text-rose-700" : row.priority === "Clear" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{row.count} · {row.priority}</span>
            <button onClick={() => onNavigateTab(row.tab)} className="rounded-lg bg-[#714B67] text-white px-3 py-1.5 text-[9px] font-black">Review</button>
          </div>)}
        </div>
      </section>
      <section className="rounded-2xl border border-[#e7dfd8] bg-white p-4 shadow-sm"><div className="flex items-center justify-between mb-4"><div><h2 className="text-xs font-black text-[#4d3047]">Company Attendance Today</h2><p className="text-[9px] text-slate-500">All registered companies · Present employees out of mapped active staff</p></div><div className="flex items-center gap-2"><span className="rounded-full bg-purple-50 px-2 py-1 text-[9px] font-black text-[#714B67]">{companyPerformance.length} companies</span><Building2 className="w-4 h-4 text-[#9a7a91]" /></div></div><div className="space-y-3 max-h-64 overflow-y-auto pr-1 custom-scrollbar">{(companyPerformance.length ? companyPerformance : [{ name: "RS9 Group", present, total: filteredStaff.length, score: filteredStaff.length ? Math.round(present / filteredStaff.length * 100) : null }]).map((item, index) => <div key={`${item.name}-${index}`}><div className="flex justify-between gap-3 text-[9px] font-bold mb-1"><span className="truncate" title={item.name}>{item.name}</span><span className={item.score === null ? "text-slate-500" : "text-emerald-700"}>{item.score === null ? "No staff mapped" : `${item.present}/${item.total} present · ${item.score}%`}</span></div><div className="h-2 rounded-full bg-[#eee9f0] overflow-hidden"><div className="h-full rounded-full bg-[#714B67] transition-all" style={{ width: `${item.score || 0}%` }} /></div></div>)}</div></section>
    </div>

    <div className="grid grid-cols-1 xl:grid-cols-[1.3fr_0.7fr] gap-4">
      <section className="rounded-2xl border-2 border-[#e1d7d0] bg-white shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-[#e9e1da] flex items-center justify-between"><div><h2 className="text-sm font-black text-[#3e2739]">Latest Work Across the System</h2><p className="text-[9px] font-bold text-slate-500">Most recently updated work visible to the owner</p></div><button onClick={() => onNavigateTab("performance")} className="text-[9px] font-black text-[#714B67]">Full report <ArrowUpRight className="inline w-3 h-3" /></button></div>
        <div className="divide-y divide-[#eee7e1]">
          {recentTasks.length ? recentTasks.map((task: any) => {
            const done = completedStatuses.has(String(task.status || "").toLowerCase());
            const assignee = task.employee?.name || task.forwardedUser?.name || "Team Member";
            const updatedLabel = task.updatedAt || task.date ? new Date(task.updatedAt || task.date).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "";
            const workDetail = readableWorkDetail(task);
            return <button key={task.id || `${task.taskTitle}-${task.updatedAt}`} onClick={() => onNavigateTab("tasks")} className="w-full px-4 py-3 text-left grid grid-cols-[1fr_auto] gap-3 hover:bg-[#fbf8f6]">
              <div className="min-w-0"><div className="text-[11px] font-black text-slate-800 truncate">{task.taskTitle || "Untitled Task"}</div><div className="text-[9px] font-bold text-slate-600 truncate">{assignee} · {task.taskType || "General"}{updatedLabel ? ` · ${updatedLabel}` : ""}</div>{workDetail && <div className="text-[9px] font-semibold text-slate-500 truncate mt-0.5" title={workDetail}>{workDetail}</div>}</div>
              <span className={`self-center rounded-full px-2 py-1 text-[8px] font-black uppercase ${done ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{task.status || "Pending"}</span>
            </button>;
          }) : <div className="p-8 text-center text-[10px] font-bold text-slate-400">No work items found for selected filters.</div>}
        </div>
      </section>
      <section className="rounded-2xl border-2 border-[#e1d7d0] bg-white shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-[#e9e1da] flex items-center justify-between"><div><h2 className="text-sm font-black text-[#3e2739]">Recent Software Activity</h2><p className="text-[9px] font-bold text-slate-500">Who performed which action and when</p></div><button onClick={() => onNavigateTab("audit-trail")} className="text-[9px] font-black text-[#714B67]">View audit <ArrowUpRight className="inline w-3 h-3" /></button></div>
        <div className="max-h-[330px] overflow-y-auto divide-y divide-[#eee7e1] custom-scrollbar">
          {recentActivities.length ? recentActivities.map((activity: any, index: number) => {
            const actor = activity.actor || activity.user?.name || "System";
            const work = activity.title || String(activity.action || "System activity").replace(/_/g, " ");
            const detail = readableProgressNote(activity.description || activity.details);
            const activityDate = new Date(activity.timestamp || activity.createdAt);
            const dateTime = Number.isNaN(activityDate.getTime()) ? "Time unavailable" : activityDate.toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true });
            return <button key={activity.id || `${activity.action}-${index}`} onClick={() => onNavigateTab("audit-trail")} className="w-full p-3 text-left hover:bg-[#fbf8f6] transition-colors">
              <div className="flex items-start gap-3"><span className="mt-0.5 w-8 h-8 rounded-full bg-purple-50 text-[#714B67] flex items-center justify-center shrink-0"><ClipboardList className="w-4 h-4" /></span><div className="min-w-0 flex-1"><div className="text-[10px] font-black text-slate-800 truncate">{work}</div>{detail && <div className="text-[9px] font-semibold text-slate-500 line-clamp-2 mt-0.5">{detail}</div>}<div className="flex items-center justify-between gap-3 mt-1.5 text-[9px] font-bold"><span className="text-[#714B67] truncate">{actor}</span><span className="text-slate-500 shrink-0">{dateTime}</span></div></div></div>
            </button>;
          }) : <div className="p-8 text-center"><Clock3 className="w-7 h-7 text-slate-400 mx-auto" /><div className="text-[10px] font-black text-slate-600 mt-2">No software activity recorded yet</div></div>}
        </div>
      </section>
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <section className="rounded-2xl border border-[#e7dfd8] bg-white p-4 shadow-sm"><div className="flex items-center justify-between"><div><h2 className="text-xs font-black text-[#4d3047]">Today’s Workforce Status</h2><p className="text-[9px] text-slate-500 mt-0.5">Live attendance and SOD compliance</p></div><MapPin className="w-4 h-4 text-emerald-600" /></div><div className="grid grid-cols-2 gap-2 mt-4">{[["Active Staff", filteredStaff.length, "text-[#714B67]"], ["Present", present, "text-emerald-700"], ["Absent", absent, "text-rose-600"], ["SOD Submitted", sodFiled, "text-sky-700"]].map(([label, value, color]) => <div key={String(label)} className="rounded-xl bg-[#faf8f6] border border-[#eee7e1] p-3"><div className={`text-xl font-black ${color}`}>{value}</div><div className="text-[9px] font-bold text-slate-600 uppercase">{label}</div></div>)}</div><div className="mt-2 text-[9px] font-bold text-amber-700">{onLeave} employee{onLeave === 1 ? "" : "s"} on approved leave</div><button onClick={() => onNavigateTab("live-tracking")} className="mt-2 text-[9px] font-black text-[#714B67]">Open live tracking <ArrowUpRight className="inline w-3 h-3" /></button></section>
      <section className="rounded-2xl border border-[#e7dfd8] bg-white p-4 shadow-sm"><div className="flex items-center justify-between"><div><h2 className="text-xs font-black text-[#4d3047]">{range === "today" ? "Today’s" : "Overall"} Task Completion</h2><p className="text-[9px] text-slate-500 mt-0.5">Completed versus pending recorded tasks</p></div><ListChecks className="w-4 h-4 text-[#9a7a91]" /></div><div className="flex items-center gap-5 mt-4"><div className="w-28 h-28 rounded-full flex items-center justify-center" style={{ background: `conic-gradient(#22a06b ${completionRate}%, #f0b44d ${completionRate}% ${Math.min(100, completionRate + (totalWork ? Math.round(pending / totalWork * 100) : 0))}%, #eee8e3 0)` }}><div className="w-20 h-20 bg-white rounded-full flex flex-col items-center justify-center"><span className="text-xl font-black">{totalWork}</span><span className="text-[8px] text-slate-500">RECORDED TASKS</span></div></div><div className="space-y-2 text-[10px] flex-1"><div className="flex justify-between"><span className="text-slate-600">Completed</span><b className="text-emerald-700">{completed}</b></div><div className="flex justify-between"><span className="text-slate-600">Pending</span><b className="text-amber-700">{pending}</b></div><div className="flex justify-between"><span className="text-slate-600">Overdue</span><b className="text-rose-700">{overdue}</b></div></div></div><button onClick={() => onNavigateTab("tasks")} className="mt-3 text-[9px] font-black text-[#714B67]">View task board <ArrowUpRight className="inline w-3 h-3" /></button></section>
      <section className="rounded-2xl border border-[#e7dfd8] bg-white p-4 shadow-sm"><div className="flex items-center justify-between"><div><h2 className="text-xs font-black text-[#4d3047]">Vertical Task Completion</h2><p className="text-[9px] text-slate-500 mt-0.5">{range === "today" ? "Today’s" : "Overall"} completed work by vertical</p></div><TrendingUp className="w-4 h-4 text-emerald-600" /></div><div className="space-y-2 mt-3">{performanceGroups.slice(0, 4).map(item => <div key={item.name} className="rounded-xl border border-[#eee7e1] px-3 py-2"><div className="flex justify-between text-[9px] font-bold"><span className="truncate">{item.name}</span><span className={item.score === null ? "text-slate-500" : item.score >= 80 ? "text-emerald-700" : item.score >= 50 ? "text-amber-700" : "text-rose-600"}>{item.score === null ? "No tasks" : `${item.score}%`}</span></div><div className="mt-1 h-1.5 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-[#714B67] rounded-full transition-all" style={{ width: `${item.score || 0}%` }} /></div><div className="text-[8px] font-bold text-slate-500 mt-1">{item.total ? `${item.done} of ${item.total} tasks completed` : "No work recorded for this period"}</div></div>)}</div></section>
    </div>

    <div className="grid grid-cols-1 xl:grid-cols-[1.15fr_1fr] gap-4">
      <section className="rounded-2xl border border-[#e7dfd8] bg-white p-4 shadow-sm"><div className="flex items-center justify-between mb-3"><div><h2 className="text-xs font-black text-[#4d3047]">Legal & Security Operations</h2><p className="text-[9px] text-slate-500">{range === "today" ? "Today’s" : "Overall"} verified operational counts</p></div><Scale className="w-4 h-4 text-[#9a7a91]" /></div><div className="grid grid-cols-2 md:grid-cols-4 gap-2">{[
        { label: range === "today" ? "Legal Work Today" : "All Legal Work", value: workSummary.legalRecovery, icon: CalendarDays, tab: "scheduled-work" },
        { label: range === "today" ? "Security Work Today" : "All Security Work", value: workSummary.securityWork, icon: ShieldCheck, tab: "legal-recovery" },
        { label: "Warnings Pending", value: stats?.operations?.disciplinaryWarnings?.pendingApprovals || 0, icon: AlertTriangle, tab: "disciplinary-warnings" },
        { label: "Active Risk Alerts", value: riskAlertList.length, icon: Scale, tab: "alerts" }
      ].map(item => <button key={item.label} onClick={() => onNavigateTab(item.tab)} className="rounded-xl border border-[#eee7e1] bg-[#fbfaf8] p-3 text-left"><item.icon className="w-4 h-4 text-[#714B67]" /><div className="text-xl font-black mt-2">{item.value}</div><div className="text-[9px] font-bold text-slate-500">{item.label}</div></button>)}</div></section>
      <section className="rounded-2xl border border-[#e7dfd8] bg-white p-4 shadow-sm"><div className="flex items-center justify-between mb-3"><div><h2 className="text-xs font-black text-[#4d3047]">Team Workload Watch</h2><p className="text-[9px] text-slate-500">{range === "today" ? "Today’s" : "Overall"} highest pending workload by employee</p></div><Users className="w-4 h-4 text-[#9a7a91]" /></div><div className="space-y-2">{teamWorkload.length ? teamWorkload.map(member => <button key={member.id} onClick={() => onNavigateTab("tasks", member.name)} className="w-full rounded-lg border border-[#eee7e1] px-3 py-2 text-left hover:bg-[#fbf8f6]"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="text-[9px] font-black text-slate-800 truncate">{member.name}</div><div className="text-[8px] font-bold text-slate-500 truncate mt-0.5">{member.vertical} · {member.done}/{member.total} completed</div></div><span className={`text-[8px] font-black rounded-full px-2 py-1 shrink-0 ${member.pending ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}>{member.pending ? `${member.pending} pending` : "All complete"}</span></div><div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mt-2"><div className="h-full bg-[#714B67] rounded-full" style={{ width: `${member.score}%` }} /></div></button>) : <div className="rounded-xl border border-dashed border-[#ddd2ca] p-6 text-center text-[9px] font-bold text-slate-500">No employee workload found for selected filters.</div>}</div><button onClick={() => onNavigateTab("tasks")} className="mt-3 text-[9px] font-black text-[#714B67]">Open team task board <ArrowUpRight className="inline w-3 h-3" /></button></section>
    </div>
  </div>;
}
