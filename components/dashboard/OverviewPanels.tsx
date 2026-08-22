import React from "react";
import {
  RotateCw,
  AlertTriangle,
  Users,
  UserCheck,
  UserPlus,
  UserMinus,
  User,
  ShieldAlert,
  Briefcase,
  Store,
  BookOpen,
  Scale,
  FileWarning,
  ShieldX,
  Shield,
  Clock,
  CheckCircle,
  FileCheck,
  FileText,
  ShieldCheck,
  CalendarClock,
  FileSearch,
  LogOut,
  TrendingUp,
  PlusCircle,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Download,
  X,
  Car,
  CalendarCheck,
  Zap,
  CheckSquare,
  Building2,
  Activity,
  ListChecks,
  Mail,
  Loader2,
  Package
} from "lucide-react";
import StatCard from "./StatCard";
import AttendanceChart from "./AttendanceChart";
import PerformanceChart from "./PerformanceChart";
import ActivityFeed from "./ActivityFeed";
import HiringRequisitionModal from "./HiringRequisitionModal";
import * as XLSX from "xlsx";

interface OverviewProps {
  sessionUser?: any;
  stats: any;
  riskAlertList: any[];
  onResolveAlert: (id: string) => void;
  onNavigateTab: (tab: string, filter?: string) => void;
  triggerToast: (msg: string) => void;
  companies?: any[];
  selectedCompanyId?: string;
  onCompanyChange?: (id: string) => void;
}

export function OwnerDashboard({
  sessionUser,
  stats,
  riskAlertList,
  onResolveAlert,
  onNavigateTab,
  triggerToast,
  companies,
  selectedCompanyId,
  onCompanyChange
}: OverviewProps) {
  const firstName = sessionUser?.name ? sessionUser.name.split(' ')[0] : 'Admin';
  const [isDark, setIsDark] = React.useState(false);
  const [showStaffModal, setShowStaffModal] = React.useState(false);
  const [showActivityModal, setShowActivityModal] = React.useState(false);
  const [staffModalFilter, setStaffModalFilter] = React.useState<"all" | "present" | "absent">("all");
  const [todayTasks, setTodayTasks] = React.useState<any[]>([]);
  const [sendingDailyReport, setSendingDailyReport] = React.useState(false);
  const [deviceInventory, setDeviceInventory] = React.useState<any[]>([]);
  const [devicesLoading, setDevicesLoading] = React.useState(true);
  React.useEffect(() => {
    const syncTheme = () => setIsDark(document.documentElement.classList.contains("dark"));
    syncTheme();
    const observer = new MutationObserver(syncTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  React.useEffect(() => {
    let active = true;
    setDevicesLoading(true);
    const query = selectedCompanyId ? `?companyId=${encodeURIComponent(selectedCompanyId)}` : "";
    fetch(`/api/assets/inventory${query}`, { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => {
        if (active) setDeviceInventory(data?.success && Array.isArray(data.data) ? data.data : []);
      })
      .catch(() => {
        if (active) setDeviceInventory([]);
      })
      .finally(() => {
        if (active) setDevicesLoading(false);
      });
    return () => { active = false; };
  }, [selectedCompanyId]);

  React.useEffect(() => {
    let active = true;
    fetch("/api/tasks?range=today", { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => {
        if (active && data?.success && Array.isArray(data.data)) {
          const indiaDateKey = (value: unknown) => {
            if (!value) return "";
            const date = new Date(String(value));
            if (Number.isNaN(date.getTime())) return "";
            return new Intl.DateTimeFormat("en-CA", {
              year: "numeric", month: "2-digit", day: "2-digit", timeZone: "Asia/Kolkata"
            }).format(date);
          };
          const todayKey = indiaDateKey(new Date());
          const seen = new Set<string>();
          const strictlyToday = data.data.filter((task: any) => {
            // `date` is the actual work date. Fall back only for old records where it is missing.
            const workDate = task.date || task.scheduledAt || task.createdAt;
            const identity = String(task.id || task.scheduleId || `${task.taskTitle}-${workDate}`);
            if (indiaDateKey(workDate) !== todayKey || seen.has(identity)) return false;
            seen.add(identity);
            return true;
          });
          setTodayTasks(strictlyToday);
        }
      })
      .catch(() => {
        if (active) setTodayTasks([]);
      });
    return () => { active = false; };
  }, []);

  const allEmployeeTaskRows = React.useMemo(() => {
    const completedStatuses = new Set(["completed", "complete", "done"]);
    const taskSummary = new Map<string, { total: number; completed: number; name: string; role: string }>();

    todayTasks.forEach((task: any) => {
      const assignee = task.forwardedUser || task.employee || {};
      const key = String(assignee.id || assignee.name || "unknown").toLowerCase();
      const summary = taskSummary.get(key) || {
        total: 0,
        completed: 0,
        name: assignee.name || "Team Member",
        role: assignee.role || "Employee"
      };
      summary.total += 1;
      if (completedStatuses.has(String(task.status || "").trim().toLowerCase())) summary.completed += 1;
      taskSummary.set(key, summary);
    });

    const matchedKeys = new Set<string>();
    const teamRows = [...(stats?.deptStats?.teamList || [])].map((member: any) => {
      const idKey = String(member.id || "").toLowerCase();
      const nameKey = String(member.name || "").toLowerCase();
      const matchedEntry = Array.from(taskSummary.entries()).find(([key, summary]) =>
        key === idKey || summary.name.toLowerCase() === nameKey
      );
      if (matchedEntry) matchedKeys.add(matchedEntry[0]);
      const summary = matchedEntry?.[1] || { total: 0, completed: 0 };
      return {
        ...member,
        total: summary.total,
        completed: summary.completed,
        pending: Math.max(0, summary.total - summary.completed)
      };
    });

    const otherRows = Array.from(taskSummary.entries())
      .filter(([key]) => !matchedKeys.has(key))
      .map(([key, summary]) => ({
        id: key,
        name: summary.name,
        role: summary.role,
        department: summary.role,
        total: summary.total,
        completed: summary.completed,
        pending: Math.max(0, summary.total - summary.completed),
        sodTime: null,
        eodTime: null
      }));

    return [...teamRows, ...otherRows];
  }, [stats?.deptStats?.teamList, todayTasks]);

  const employeeTaskRows = React.useMemo(() => {
    return [...allEmployeeTaskRows]
      .sort((a: any, b: any) => b.total - a.total || b.pending - a.pending || String(a.name).localeCompare(String(b.name)))
      .slice(0, 5);
  }, [allEmployeeTaskRows]);

  const employeeTaskTotals = React.useMemo(() => {
    return allEmployeeTaskRows.reduce((totals: any, member: any) => {
      totals.total += member.total;
      totals.completed += member.completed;
      totals.pending += member.pending;
      return totals;
    }, { total: 0, completed: 0, pending: 0 });
  }, [allEmployeeTaskRows]);

  const todayWorkGroups = React.useMemo(() => {
    const teamList = stats?.deptStats?.teamList || [];
    const memberMap = new Map<string, any>();
    teamList.forEach((member: any) => {
      if (member.id) memberMap.set(String(member.id), member);
      if (member.name) memberMap.set(String(member.name).toLowerCase(), member);
    });

    const groups = new Map<string, any[]>();
    todayTasks.forEach((task: any) => {
      const assignee = task.forwardedUser || task.employee || {};
      const member = memberMap.get(String(assignee.id || "")) || memberMap.get(String(assignee.name || "").toLowerCase());
      const vertical = member?.department || member?.vertical || assignee.role || task.taskType || "Other Work";
      if (!groups.has(vertical)) groups.set(vertical, []);
      groups.get(vertical)?.push({ ...task, assigneeName: assignee.name || member?.name || "Team Member" });
    });

    return Array.from(groups.entries()).sort((a, b) => b[1].length - a[1].length);
  }, [stats?.deptStats?.teamList, todayTasks]);

  const deviceCategories = React.useMemo(() => {
    const categories = new Map<string, { total: number; inUse: number; available: number }>();
    deviceInventory.forEach((device: any) => {
      const category = String(device.assetType || "Other Device").trim() || "Other Device";
      const current = categories.get(category) || { total: 0, inUse: 0, available: 0 };
      current.total += 1;
      const status = String(device.status || "").toLowerCase();
      if (status === "in use" || device.assignedToUserId) current.inUse += 1;
      if (status === "available" && !device.assignedToUserId) current.available += 1;
      categories.set(category, current);
    });
    return Array.from(categories.entries())
      .map(([name, counts]) => ({ name, ...counts }))
      .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));
  }, [deviceInventory]);

  const sendDailyReport = async () => {
    if (sendingDailyReport) return;
    setSendingDailyReport(true);
    try {
      const response = await fetch("/api/dashboard/send-daily-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          totals: employeeTaskTotals,
          employees: allEmployeeTaskRows.map((member: any) => ({
            ...member,
            tasksTotal: member.total,
            tasksCompleted: member.completed
          })),
          verticals: todayWorkGroups.map(([name, tasks]) => ({
            name,
            tasks: tasks.map((task: any) => ({
              title: task.taskTitle || task.description || "Untitled work",
              employee: task.assigneeName,
              status: task.status || "Pending",
              completed: ["completed", "complete", "done"].includes(String(task.status || "").toLowerCase())
            }))
          }))
        })
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || "Report could not be sent");
      triggerToast(data.message || "Daily report emailed successfully");
    } catch (error: any) {
      triggerToast(`Failed to send report: ${error?.message || "Unknown error"}`);
    } finally {
      setSendingDailyReport(false);
    }
  };
  const exportAttendanceReport = () => {
    if (!stats?.staffList) return;

    const headers = ["Employee Name", "Email", "Role", "Department", "Company", "Status", "Attendance Today", "SOD Time", "EOD Time"];

    const formatTime = (isoString: string | null) => {
      if (!isoString) return "-";
      try {
        return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      } catch (e) {
        return "-";
      }
    };

    const rows = stats.staffList.map((staff: any) => [
      staff.name || "Unknown",
      staff.email || "N/A",
      staff.role || "N/A",
      staff.department || "N/A",
      staff.companies || "N/A",
      staff.status || "N/A",
      staff.isPresent ? "Present" : "Absent",
      formatTime(staff.sodTime),
      formatTime(staff.eodTime)
    ]);

    let excelTemplate = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">`;
    excelTemplate += `<head><meta charset="utf-8"><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Attendance Report</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head><body>`;
    excelTemplate += `<table border="1" style="border-collapse:collapse; font-family: 'Segoe UI', Arial, sans-serif; font-size: 11px;">`;

    excelTemplate += `<tr style="height: 30px;">`;
    headers.forEach(h => {
      excelTemplate += `<th style="background-color: #C9A84C; color: #ffffff; font-weight: bold; border: 1px solid #cbd5e1; padding: 6px; text-align: left; vertical-align: middle;">${h}</th>`;
    });
    excelTemplate += `</tr>`;

    rows.forEach((row: any[]) => {
      excelTemplate += `<tr>`;
      row.forEach((cell: any) => {
        excelTemplate += `<td style="border: 1px solid #cbd5e1; padding: 6px; text-align: left; vertical-align: middle; white-space: nowrap;">${cell}</td>`;
      });
      excelTemplate += `</tr>`;
    });
    excelTemplate += `</table></body></html>`;

    const blob = new Blob([excelTemplate], { type: "application/vnd.ms-excel" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Attendance_Report_${new Date().toISOString().split("T")[0]}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    triggerToast?.("Attendance report exported successfully");
  };

  return (
    <div className="space-y-8 animate-fade-in text-[#1C1C1A] dark:text-gray-100">

      {/* Top Action Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <span className="text-[9px] uppercase tracking-widest text-indigo-600 font-bold">Command Center</span>
          <h1 className="text-lg sm:text-xl font-light text-[#1C1C1A] dark:text-gray-100 tracking-wide font-serif" style={{ fontFamily: "'Playfair Display', serif" }}>
            Enterprise Workspace
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
          {companies && (
            <select
              value={selectedCompanyId || ""}
              onChange={(e) => onCompanyChange?.(e.target.value)}
              className="w-full sm:w-auto text-[10px] uppercase tracking-wider font-semibold px-3 py-2 bg-[#FCFBF9] dark:bg-gray-900 border border-[#E8E4DF] dark:border-gray-700 rounded-lg focus:outline-none focus:border-indigo-500 transition-colors shadow-2xs text-[#1C1C1A] dark:text-gray-100"
            >
              <option value="">All Companies</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          )}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              className="flex-1 sm:flex-initial px-3.5 sm:px-4 py-2 border border-indigo-200 dark:border-indigo-800 rounded-lg text-xs font-semibold tracking-wider uppercase bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-950 text-indigo-700 dark:text-indigo-300 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
              onClick={sendDailyReport}
              disabled={sendingDailyReport}
            >
              {sendingDailyReport ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
              {sendingDailyReport ? "Sending" : "Email Report"}
            </button>
            <button
              className="flex-1 sm:flex-initial px-3.5 sm:px-4 py-2 border border-[#E8E4DF] dark:border-gray-700 rounded-lg text-xs font-semibold tracking-wider uppercase bg-[#FCFBF9] dark:bg-gray-900 hover:bg-[#F5F0EA] dark:hover:bg-gray-800 text-[#5D5B57] dark:text-gray-300 transition-all flex items-center justify-center gap-2"
              onClick={exportAttendanceReport}
            >
              <Download className="w-3.5 h-3.5" /> Export
            </button>
            <button
              className="flex-1 sm:flex-initial px-3.5 sm:px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold tracking-wider uppercase transition-all shadow-sm flex items-center justify-center gap-2"
              onClick={() => triggerToast("Enterprise metrics synchronized successfully")}
            >
              <RotateCw className="w-3.5 h-3.5" /> Sync
            </button>
          </div>
        </div>
      </div>

      {/* Hero Greeting Card */}
      <div className="bg-[#FCFBF9] dark:bg-gray-900 border border-[#E8E4DF] dark:border-gray-800 rounded-xl p-4 sm:p-6 md:p-7 shadow-[0_2px_12px_rgba(0,0,0,0.03)] relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-5 md:gap-6 transition-colors">
        <div className="absolute right-0 bottom-0 pointer-events-none opacity-[0.025] text-[#1C1C1A]">
          <svg className="w-48 h-48 md:w-64 md:h-64" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="0.5">
            <circle cx="90" cy="90" r="80" />
            <circle cx="90" cy="90" r="60" />
            <circle cx="90" cy="90" r="40" />
          </svg>
        </div>

        <div className="relative z-10 w-full md:w-1/3">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-light tracking-wide text-[#1C1C1A] dark:text-gray-100 font-serif" style={{ fontFamily: "'Playfair Display', serif" }}>
            Good morning, {firstName}.
          </h1>
          <div className="h-0.5 w-12 bg-indigo-600 mt-2" />
          <p className="text-[9px] text-[#8C8880] uppercase tracking-widest mt-2 sm:mt-3 font-bold">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        <div className="relative z-10 w-full md:w-2/3 grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4 md:gap-6 divide-y-0 sm:divide-x divide-[#E8E4DF] dark:divide-gray-700">
          <div
            className="pl-2 sm:pl-3 md:pl-5 sm:first:pl-0 cursor-pointer hover:bg-[#FAF9F5] dark:hover:bg-gray-800 transition-all p-2 rounded-lg group"
            onClick={() => onNavigateTab("employees")}
            title="Click to view Employees Directory"
          >
            <div className="text-xl sm:text-2xl font-light text-indigo-950 dark:text-indigo-300 font-serif" style={{ fontFamily: "'Playfair Display', serif" }}>
              {stats?.roles?.employees || 0}
            </div>
            <div className="text-[9px] uppercase tracking-wider text-[#8C8880] mt-1 font-semibold flex items-center gap-1 group-hover:text-indigo-600 transition-colors">
              <Users className="w-3 h-3 text-indigo-500 group-hover:text-indigo-700 shrink-0" /> <span className="truncate">Total Staff</span> <ArrowUpRight className="w-3 h-3 text-[#8C8880] group-hover:text-indigo-600 shrink-0" />
            </div>
          </div>
          <div
            className="pl-2 sm:pl-3 md:pl-5 cursor-pointer hover:bg-[#FAF9F5] dark:hover:bg-gray-800 transition-all p-2 rounded-lg group"
            onClick={() => onNavigateTab("performance", "sod")}
            title="Click to view Work Report (SOD)"
          >
            <div className="text-xl sm:text-2xl font-light text-emerald-800 dark:text-emerald-400 font-serif" style={{ fontFamily: "'Playfair Display', serif" }}>
              {stats?.todayCompliance?.attendance || 0}
            </div>
            <div className="text-[9px] uppercase tracking-wider text-[#8C8880] mt-1 font-semibold flex items-center gap-1 group-hover:text-emerald-700 transition-colors">
              <UserCheck className="w-3 h-3 text-emerald-600 shrink-0" /> <span className="truncate">Present Today</span> <ArrowUpRight className="w-3 h-3 text-[#8C8880] group-hover:text-emerald-700 shrink-0" />
            </div>
          </div>

          <div
            className="pl-2 sm:pl-3 md:pl-5 cursor-pointer hover:bg-[#FAF9F5] dark:hover:bg-gray-800 transition-all p-2 rounded-lg group"
            onClick={() => onNavigateTab("tasks")}
            title="Click to view Pending Tasks"
          >
            <div className="text-xl sm:text-2xl font-light text-amber-700 dark:text-amber-400 font-serif" style={{ fontFamily: "'Playfair Display', serif" }}>
              {stats?.pendingApprovals?.pendingTasks ?? stats?.currentUserStats?.pendingTasksCount ?? 0}
            </div>
            <div className="text-[9px] uppercase tracking-wider text-[#8C8880] mt-1 font-semibold flex items-center gap-1 group-hover:text-amber-600 transition-colors">
              <Clock className="w-3 h-3 text-amber-500 shrink-0" /> <span className="truncate">Pending Tasks</span> <ArrowUpRight className="w-3 h-3 text-[#8C8880] group-hover:text-amber-600 shrink-0" />
            </div>
          </div>

          <div
            className="pl-2 sm:pl-3 md:pl-5 cursor-pointer hover:bg-[#FAF9F5] dark:hover:bg-gray-800 transition-all p-2 rounded-lg group"
            onClick={() => onNavigateTab("ess-leaves")}
            title="Click to view Pending Requests (Leaves & Assets)"
          >
            <div className="text-xl sm:text-2xl font-light text-purple-900 dark:text-purple-400 font-serif" style={{ fontFamily: "'Playfair Display', serif" }}>
              {stats?.pendingApprovals?.pendingRequestsTotal ?? 0}
            </div>
            <div className="text-[9px] uppercase tracking-wider text-[#8C8880] mt-1 font-semibold flex items-center gap-1 group-hover:text-purple-600 transition-colors">
              <FileCheck className="w-3 h-3 text-purple-500 shrink-0" /> <span className="truncate">Pending Requests</span> <ArrowUpRight className="w-3 h-3 text-[#8C8880] group-hover:text-purple-600 shrink-0" />
            </div>
          </div>
        </div>
      </div>

      <section className="bg-[#FCFBF9] dark:bg-gray-900 border border-[#E8E4DF] dark:border-gray-800 rounded-xl p-4 shadow-[0_2px_12px_rgba(0,0,0,0.03)] transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <ListChecks className="w-4 h-4 text-indigo-600" />
            <h2 className="text-[10px] font-bold tracking-widest uppercase">Today&apos;s Employee Tasks</h2>
          </div>
          <div className="flex items-center gap-3 text-[9px] font-bold uppercase tracking-wide">
            <span className="text-indigo-700 dark:text-indigo-400">Total {employeeTaskTotals.total}</span>
            <span className="text-emerald-700 dark:text-emerald-400">Done {employeeTaskTotals.completed}</span>
            <span className="text-amber-700 dark:text-amber-400">Pending {employeeTaskTotals.pending}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2 content-start">
            {employeeTaskRows.map((member: any) => (
              <div key={member.id || member.name} className="rounded-lg border border-[#E8E4DF] dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2 min-w-0 flex items-center justify-between gap-2">
                <div className="text-[10px] font-semibold truncate text-[#1C1C1A] dark:text-gray-100">{member.name || "Unnamed Employee"}</div>
                <div className="flex items-center gap-2 text-[9px] font-bold shrink-0">
                  <span className="text-indigo-600">{member.total}</span>
                  <span className="text-emerald-600">✓ {member.completed}</span>
                  <span className="text-amber-600">⏳ {member.pending}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-lg border border-[#E8E4DF] dark:border-gray-700 bg-white dark:bg-gray-950 overflow-hidden">
            <div className="px-3 py-2 border-b border-[#EEEAE4] dark:border-gray-800 flex items-center justify-between">
              <span className="text-[9px] font-bold uppercase tracking-wider text-[#5D5B57] dark:text-gray-300">Work done across all verticals</span>
              <span className="text-[9px] text-[#8C8880]">{todayTasks.length} work items</span>
            </div>
            <div className="max-h-56 overflow-y-auto custom-scrollbar divide-y divide-[#EEEAE4] dark:divide-gray-800">
              {todayWorkGroups.map(([vertical, tasks]) => (
                <div key={vertical} className="px-3 py-2.5">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-[9px] font-black uppercase tracking-wider text-indigo-700 dark:text-indigo-400">{vertical}</span>
                    <span className="text-[8px] rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 px-1.5 py-0.5 font-bold">{tasks.length}</span>
                  </div>
                  <div className="space-y-1.5">
                    {tasks.map((task: any) => {
                      const isComplete = ["completed", "complete", "done"].includes(String(task.status || "").toLowerCase());
                      return (
                        <div key={task.id} className="flex items-start justify-between gap-3 text-[10px]">
                          <div className="min-w-0">
                            <span className="font-medium text-[#1C1C1A] dark:text-gray-100">{task.taskTitle || task.description || "Untitled work"}</span>
                            <span className="text-[#8C8880]"> · {task.assigneeName}</span>
                          </div>
                          <span className={`shrink-0 text-[8px] font-bold uppercase ${isComplete ? "text-emerald-600" : "text-amber-600"}`}>{isComplete ? "Done" : task.status || "Pending"}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
              {todayWorkGroups.length === 0 && <div className="px-3 py-6 text-center text-[10px] text-[#8C8880]">No work entries found for today.</div>}
            </div>
          </div>
        </div>

        <button onClick={() => onNavigateTab("tasks")} className="mt-3 text-[9px] uppercase tracking-wider font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 flex items-center gap-1">
          View all tasks <ArrowUpRight className="w-3 h-3" />
        </button>
      </section>

      {/* Main Grid: Simplified & Minimal */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-7">

        {/* Left Column: Operations Overview & HR Pipeline */}
        <div className="space-y-7">
          <div className="bg-[#FCFBF9] dark:bg-gray-900 border border-[#E8E4DF] dark:border-gray-800 rounded-xl p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] transition-colors">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xs font-semibold tracking-widest text-[#1C1C1A] dark:text-gray-100 uppercase">Today's Operations</h2>
              <button
                onClick={() => onNavigateTab("performance", "visual-dashboard")}
                className="text-[9px] uppercase tracking-wider font-bold text-indigo-600 hover:text-indigo-800 transition-colors flex items-center gap-1"
              >
                View Operations <ArrowUpRight className="w-3 h-3" />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* SOD Declared Card */}
              <div
                className="p-3.5 border border-[#E8E4DF] dark:border-gray-700 rounded-lg bg-white dark:bg-gray-950 cursor-pointer hover:border-indigo-400 hover:bg-[#FAF9F5] dark:hover:bg-gray-800 transition-all group flex flex-col justify-between"
                onClick={() => onNavigateTab("performance", "sod")}
                title="Click to view SOD Work Reports"
              >
                <div>
                  <div className="text-[9px] uppercase tracking-wider text-[#8C8880] font-bold flex items-center justify-between">
                    <span>SOD Declared</span>
                    <ArrowUpRight className="w-3 h-3 text-[#9C9890] group-hover:text-indigo-600" />
                  </div>
                  <div className="text-lg font-light text-[#1C1C1A] dark:text-gray-100 font-serif mt-1 font-mono">
                    {stats?.todayCompliance?.sod || 0} <span className="text-xs text-[#8C8880] font-sans">/ {stats?.roles?.employees || 0}</span>
                  </div>
                </div>
                <div className="w-full bg-[#E8E4DF] rounded-full h-1 mt-2.5 overflow-hidden">
                  <div className="bg-indigo-600 h-1 rounded-full" style={{ width: `${stats?.roles?.employees ? Math.min(100, Math.round(((stats.todayCompliance?.sod || 0) / stats.roles.employees) * 100)) : 0}%` }}></div>
                </div>
              </div>

              {/* EOD Logs Submitted Card */}
              <div
                className="p-3.5 border border-[#E8E4DF] dark:border-gray-700 rounded-lg bg-white dark:bg-gray-950 cursor-pointer hover:border-blue-400 hover:bg-[#FAF9F5] dark:hover:bg-gray-800 transition-all group flex flex-col justify-between"
                onClick={() => onNavigateTab("performance", "eod")}
                title="Click to view EOD Work Reports"
              >
                <div>
                  <div className="text-[9px] uppercase tracking-wider text-[#8C8880] font-bold flex items-center justify-between">
                    <span>EOD Logs</span>
                    <ArrowUpRight className="w-3 h-3 text-[#9C9890] group-hover:text-blue-600" />
                  </div>
                  <div className="text-lg font-light text-[#1C1C1A] dark:text-gray-100 font-serif mt-1 font-mono">
                    {stats?.todayCompliance?.eod || 0} <span className="text-xs text-[#8C8880] font-sans">/ {stats?.roles?.employees || 0}</span>
                  </div>
                </div>
                <div className="w-full bg-[#E8E4DF] rounded-full h-1 mt-2.5 overflow-hidden">
                  <div className="bg-blue-600 h-1 rounded-full" style={{ width: `${stats?.roles?.employees ? Math.min(100, Math.round(((stats.todayCompliance?.eod || 0) / stats.roles.employees) * 100)) : 0}%` }}></div>
                </div>
              </div>

              {/* Late Check-ins Card */}
              <div
                className="p-3.5 border border-[#E8E4DF] dark:border-gray-700 rounded-lg bg-white dark:bg-gray-950 cursor-pointer hover:border-rose-300 hover:bg-[#FAF9F5] dark:hover:bg-gray-800 transition-all group flex flex-col justify-between"
                onClick={() => onNavigateTab("performance", "sod")}
                title="Click to view Late Check-ins & SOD Reports"
              >
                <div>
                  <div className="text-[9px] uppercase tracking-wider text-[#8C8880] font-bold flex items-center justify-between">
                    <span>Late Check-ins</span>
                    <ArrowUpRight className="w-3 h-3 text-[#9C9890] group-hover:text-rose-600" />
                  </div>
                  <div className="text-lg font-light text-[#1C1C1A] dark:text-gray-100 font-serif mt-1 font-mono">
                    {stats?.todayCompliance?.lateCheckins || 0}
                  </div>
                </div>
                <div className="text-[9px] font-medium mt-2 text-rose-600">
                  {stats?.todayCompliance?.lateCheckins > 0 ? "Requires review" : "On schedule"}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-[#FCFBF9] dark:bg-gray-900 border border-[#E8E4DF] dark:border-gray-800 rounded-xl p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] transition-colors">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-semibold tracking-widest text-[#1C1C1A] dark:text-gray-100 uppercase">HR & Hiring Pipeline</h2>
              <button onClick={() => onNavigateTab("business-leads", "All")} className="text-[9px] uppercase tracking-wider font-bold text-indigo-600 hover:text-indigo-800 transition-colors flex items-center gap-1">Manage Leads <ArrowUpRight className="w-3 h-3" /></button>
            </div>

            {/* 6 Uniform Core Metric Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3">
              <div
                className="p-3.5 border border-[#E8E4DF] dark:border-gray-700 rounded-lg bg-white dark:bg-gray-950 cursor-pointer hover:border-indigo-400 hover:bg-[#FAF9F5] dark:hover:bg-gray-800 transition-all group"
                onClick={() => onNavigateTab("business-leads", "All")}
                title="Click to view Total HR Leads"
              >
                <div className="text-xl font-light text-indigo-950 dark:text-indigo-300 font-serif" style={{ fontFamily: "'Playfair Display', serif" }}>
                  {stats?.hrStats?.hrLeadsCount || stats?.candidates?.total || 0}
                </div>
                <div className="text-[9px] uppercase tracking-wider text-[#8C8880] mt-1 font-bold flex items-center justify-between">
                  <span>Total Leads</span>
                  <ArrowUpRight className="w-3 h-3 text-[#9C9890] group-hover:text-indigo-600" />
                </div>
              </div>

              <div
                className="p-3.5 border border-[#E8E4DF] dark:border-gray-700 rounded-lg bg-white dark:bg-gray-950 cursor-pointer hover:border-amber-400 hover:bg-[#FAF9F5] dark:hover:bg-gray-800 transition-all group"
                onClick={() => onNavigateTab("business-leads", "Pending")}
                title="Click to view Pending Leads"
              >
                <div className="text-xl font-light text-amber-800 dark:text-amber-400 font-serif" style={{ fontFamily: "'Playfair Display', serif" }}>
                  {stats?.hrStats?.pendingLeadsCount || stats?.candidates?.pending || 0}
                </div>
                <div className="text-[9px] uppercase tracking-wider text-[#8C8880] mt-1 font-bold flex items-center justify-between">
                  <span>Pending Leads</span>
                  <ArrowUpRight className="w-3 h-3 text-[#9C9890] group-hover:text-amber-600" />
                </div>
              </div>

              <div
                className="p-3.5 border border-[#E8E4DF] dark:border-gray-700 rounded-lg bg-white dark:bg-gray-950 cursor-pointer hover:border-emerald-400 hover:bg-[#FAF9F5] dark:hover:bg-gray-800 transition-all group"
                onClick={() => onNavigateTab("business-leads", "Selected")}
                title="Click to view Selected Leads"
              >
                <div className="text-xl font-light text-emerald-800 dark:text-emerald-400 font-serif" style={{ fontFamily: "'Playfair Display', serif" }}>
                  {stats?.hrStats?.selectedLeadsCount !== undefined ? stats.hrStats.selectedLeadsCount : (stats?.candidates?.selected || 0)}
                </div>
                <div className="text-[9px] uppercase tracking-wider text-[#8C8880] mt-1 font-bold flex items-center justify-between">
                  <span>Selected Leads</span>
                  <ArrowUpRight className="w-3 h-3 text-[#9C9890] group-hover:text-emerald-600" />
                </div>
              </div>

              <div
                className="p-3.5 border border-[#E8E4DF] dark:border-gray-700 rounded-lg bg-white dark:bg-gray-950 cursor-pointer hover:border-rose-400 hover:bg-[#FAF9F5] dark:hover:bg-gray-800 transition-all group"
                onClick={() => onNavigateTab("business-leads", "Rejected")}
                title="Click to view Rejected Leads"
              >
                <div className="text-xl font-light text-rose-700 dark:text-rose-400 font-serif" style={{ fontFamily: "'Playfair Display', serif" }}>
                  {stats?.hrStats?.rejectedLeadsCount !== undefined ? stats.hrStats.rejectedLeadsCount : 0}
                </div>
                <div className="text-[9px] uppercase tracking-wider text-[#8C8880] mt-1 font-bold flex items-center justify-between">
                  <span>Rejected Leads</span>
                  <ArrowUpRight className="w-3 h-3 text-[#9C9890] group-hover:text-rose-600" />
                </div>
              </div>

              <div
                className="p-3.5 border border-[#E8E4DF] dark:border-gray-700 rounded-lg bg-white dark:bg-gray-950 cursor-pointer hover:border-blue-400 hover:bg-[#FAF9F5] dark:hover:bg-gray-800 transition-all group"
                onClick={() => onNavigateTab("interviews")}
                title="Click to view Interviews Queue"
              >
                <div className="text-xl font-light text-blue-900 dark:text-blue-400 font-serif" style={{ fontFamily: "'Playfair Display', serif" }}>
                  {stats?.hrStats?.interviewsToday || 0}
                </div>
                <div className="text-[9px] uppercase tracking-wider text-[#8C8880] mt-1 font-bold flex items-center justify-between">
                  <span>Interviews Today</span>
                  <ArrowUpRight className="w-3 h-3 text-[#9C9890] group-hover:text-blue-600" />
                </div>
              </div>

              <div
                className="p-3.5 border border-[#E8E4DF] dark:border-gray-700 rounded-lg bg-white dark:bg-gray-950 cursor-pointer hover:border-purple-400 hover:bg-[#FAF9F5] dark:hover:bg-gray-800 transition-all group"
                onClick={() => onNavigateTab("verification")}
                title="Click to view Vetting Checks Registry"
              >
                <div className="text-xl font-light text-purple-900 dark:text-purple-400 font-serif" style={{ fontFamily: "'Playfair Display', serif" }}>
                  {stats?.hrStats?.verificationPending || 0}
                </div>
                <div className="text-[9px] uppercase tracking-wider text-[#8C8880] mt-1 font-bold flex items-center justify-between">
                  <span>Pending Verify</span>
                  <ArrowUpRight className="w-3 h-3 text-[#9C9890] group-hover:text-purple-600" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Quick Actions & Activity Feed */}
        <div className="space-y-7">

          <div className="bg-[#FCFBF9] dark:bg-gray-900 border border-[#E8E4DF] dark:border-gray-800 rounded-xl p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] transition-colors">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center"><Package className="w-3.5 h-3.5" /></div>
                <div>
                  <h2 className="text-[10px] font-semibold tracking-widest text-[#1C1C1A] dark:text-gray-100 uppercase">Device Inventory</h2>
                  <p className="text-[9px] text-[#8C8880]">{deviceInventory.length} total devices</p>
                </div>
              </div>
              <button onClick={() => onNavigateTab("inventory-management")} className="text-[9px] uppercase tracking-wider font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1">View All <ArrowUpRight className="w-3 h-3" /></button>
            </div>

            <div className="max-h-56 overflow-y-auto custom-scrollbar divide-y divide-[#EEEAE4] dark:divide-gray-800 border border-[#E8E4DF] dark:border-gray-700 rounded-lg bg-white dark:bg-gray-950">
              {devicesLoading ? (
                <div className="py-8 flex items-center justify-center gap-2 text-[10px] text-[#8C8880]"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading devices...</div>
              ) : deviceCategories.length > 0 ? deviceCategories.map((category) => (
                <button key={category.name} onClick={() => onNavigateTab("inventory-management")} className="w-full px-3 py-2.5 flex items-center justify-between gap-3 hover:bg-[#FAF9F5] dark:hover:bg-gray-800 transition-colors text-left">
                  <span className="text-[10px] font-semibold text-[#1C1C1A] dark:text-gray-100 truncate">{category.name}</span>
                  <span className="flex items-center gap-2 shrink-0 text-[8px] font-bold">
                    <span className="text-emerald-600">Available {category.available}</span>
                    <span className="text-amber-600">In Use {category.inUse}</span>
                    <span className="min-w-6 text-center rounded-md bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 px-1.5 py-1 text-[10px]">{category.total}</span>
                  </span>
                </button>
              )) : (
                <div className="py-8 text-center text-[10px] text-[#8C8880]">No devices found.</div>
              )}
            </div>
          </div>

          <div className="bg-[#FCFBF9] dark:bg-gray-900 border border-[#E8E4DF] dark:border-gray-800 rounded-xl p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] transition-colors">
            <h2 className="text-xs font-semibold tracking-widest text-[#1C1C1A] dark:text-gray-100 uppercase mb-4">Quick Actions</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { name: "Add Employee", tab: "employees", icon: UserPlus },
                { name: "Approve Leaves", tab: "ess-leaves", icon: CalendarClock },
                { name: "Process Payroll", tab: "ess-payroll", icon: FileText },
                { name: "Post Job", tab: "jobs", icon: Briefcase },
                { name: "Schedule Work Report", tab: "scheduled-work", icon: CalendarClock },
                { name: "Vendor Management", tab: "vendors", icon: Building2 },
                { name: "Disciplinary Warnings", tab: "disciplinary-warnings", icon: ShieldAlert },
                { name: "Work Report", tab: "performance", icon: FileSearch }
              ].map((action, i) => {
                const IconComponent = action.icon;
                return (
                  <button
                    key={i}
                    onClick={() => onNavigateTab(action.tab)}
                    className="text-[9px] uppercase tracking-wider font-bold p-2.5 sm:p-3 rounded-xl border border-[#E8E4DF] dark:border-gray-700 bg-white dark:bg-gray-950 text-[#4A4844] dark:text-gray-300 hover:bg-[#FAF9F5] dark:hover:bg-gray-800 hover:border-indigo-400 hover:shadow-2xs transition-all text-left cursor-pointer flex flex-col justify-between h-auto min-h-[76px] sm:h-20 group"
                    title={`Navigate to ${action.name}`}
                  >
                    <div className="w-full flex items-center justify-between">
                      <div className="p-1.5 rounded-lg bg-indigo-50/80 border border-indigo-100/80 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-600 transition-all shadow-2xs">
                        <IconComponent className="w-3.5 h-3.5" />
                      </div>
                      <ArrowUpRight className="w-3 h-3 text-[#9C9890] group-hover:text-indigo-600 transition-colors" />
                    </div>
                    <span className="font-semibold text-[#1C1C1A] dark:text-gray-100 text-[9.5px] leading-snug group-hover:text-indigo-600 transition-colors">{action.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="bg-[#FCFBF9] dark:bg-gray-900 border border-[#E8E4DF] dark:border-gray-800 rounded-xl p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] transition-colors">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xs font-semibold tracking-widest text-[#1C1C1A] dark:text-gray-100 uppercase">Recent Activity</h2>
              <button
                onClick={() => setShowActivityModal(true)}
                className="text-[9px] uppercase tracking-wider font-bold text-indigo-600 hover:text-indigo-800 transition-colors flex items-center gap-1"
              >
                View All <ArrowUpRight className="w-3 h-3" />
              </button>
            </div>
            <ActivityFeed dark={isDark} companyId={selectedCompanyId} logs={stats?.hrActivities} maxHeight="max-h-[310px]" />
          </div>
        </div>
      </div>

      {showStaffModal && (
        <div className="fixed inset-0 bg-black/20 z-50 flex justify-center items-center backdrop-blur-md p-3 sm:p-6" onClick={() => setShowStaffModal(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden animate-slideUp" onClick={e => e.stopPropagation()}>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 sm:p-6 gap-3 border-b border-gray-100 bg-[#FCFBF9]">
              <h2 className="text-lg sm:text-xl font-serif text-[#1C1C1A]">
                Team Roster {staffModalFilter === "present" ? "(Present)" : staffModalFilter === "absent" ? "(Absent)" : ""}
              </h2>
              <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                <button
                  onClick={() => { setShowStaffModal(false); onNavigateTab("employees"); }}
                  className="text-xs font-bold text-[#C9A84C] hover:text-[#B3923E] flex items-center gap-1 uppercase tracking-wider transition-colors"
                >
                  Open Employees Directory <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => setShowStaffModal(false)} className="text-gray-400 hover:text-gray-800 transition-colors">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-0">
              <table className="w-full text-left border-collapse">
                <thead className="bg-[#FCFBF9] sticky top-0 z-10 shadow-sm">
                  <tr>
                    <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-[#9C9890] font-bold border-b border-[#E8E4DF]">Employee</th>
                    <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-[#9C9890] font-bold border-b border-[#E8E4DF]">Role / Dept</th>
                    <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-[#9C9890] font-bold border-b border-[#E8E4DF]">Company</th>
                    <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-[#9C9890] font-bold border-b border-[#E8E4DF]">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8E4DF]">
                  {stats?.staffList?.length > 0 ? stats.staffList
                    .filter((staff: any) => {
                      const st = String(staff.status || "").toLowerCase();
                      if (["inactive", "archived", "terminated", "disabled"].includes(st)) return false;
                      if (staffModalFilter === "present") return staff.isPresent;
                      if (staffModalFilter === "absent") return !staff.isPresent;
                      return true;
                    })
                    .map((staff: any) => (
                      <tr key={staff.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-semibold text-slate-800">{staff.name}</div>
                          <div className="text-[10px] text-slate-500 mt-0.5">{staff.email}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-slate-800">{staff.role}</div>
                          <div className="text-[10px] text-[#C9A84C] font-semibold mt-0.5 tracking-wider uppercase">{staff.department}</div>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600 font-medium">
                          {staff.companies}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest ${staff.status === 'active' || staff.status === 'Active'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-rose-100 text-rose-700'
                            }`}>
                            {staff.status}
                          </span>
                          {staffModalFilter !== "all" && (
                            <div className={`text-[9px] mt-1 font-bold uppercase ${staff.isPresent ? 'text-[#6B8F71]' : 'text-rose-500'}`}>
                              {staff.isPresent ? "Present Today" : "Absent Today"}
                            </div>
                          )}
                        </td>
                      </tr>
                    )) : (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-slate-500 font-medium">
                        No staff data available.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="p-4 border-t border-[#E8E4DF] bg-[#FCFBF9] text-right">
              <button
                onClick={() => setShowStaffModal(false)}
                className="px-6 py-2 bg-slate-800 text-white rounded-lg text-xs font-semibold tracking-wider uppercase hover:bg-slate-900 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showActivityModal && (
        <div className="fixed inset-0 bg-black/30 z-50 flex justify-center items-center backdrop-blur-md p-4 sm:p-6" onClick={() => setShowActivityModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-slideUp border border-[#E8E4DF]" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center px-6 py-4 border-b border-[#E8E4DF] bg-[#FCFBF9]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-2xs">
                  <Activity className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-lg font-serif font-medium text-[#1C1C1A]" style={{ fontFamily: "'Playfair Display', serif" }}>
                    Recent Enterprise Activities
                  </h2>
                  <p className="text-[10px] text-[#8C8880] uppercase tracking-wider font-semibold">
                    Real-time operational & HR updates ({stats?.hrActivities?.length || 0} events)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowActivityModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[68vh] custom-scrollbar bg-white">
              <ActivityFeed dark={false} companyId={selectedCompanyId} logs={stats?.hrActivities} maxHeight="max-h-none" />
            </div>

            <div className="p-4 border-t border-[#E8E4DF] bg-[#FCFBF9] text-right">
              <button
                onClick={() => setShowActivityModal(false)}
                className="px-5 py-2 bg-slate-800 text-white rounded-lg text-xs font-semibold tracking-wider uppercase hover:bg-slate-900 transition-colors shadow-2xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export function HrDashboard({
  stats,
  candidates = [],
  interviews = [],
  onNavigateTab
}: {
  stats: any;
  candidates?: any[];
  interviews?: any[];
  onNavigateTab: (tab: string, filter?: string) => void;
}) {
  const hrStats = stats?.hrStats || {};
  const [isDark, setIsDark] = React.useState(false);
  const [showHiringModal, setShowHiringModal] = React.useState(false);
  const [showAllActivities, setShowAllActivities] = React.useState(false);
  const [showAttendanceModal, setShowAttendanceModal] = React.useState(false);
  const [attendanceFilter, setAttendanceFilter] = React.useState<"all" | "present" | "absent" | "leave">("all");
  const [attendanceSearchQuery, setAttendanceSearchQuery] = React.useState("");

  const formatCleanDepartment = (rawDept: any, role?: string, designation?: string): string => {
    if (rawDept) {
      const str = String(rawDept).trim();
      if (str && str !== "N/A" && !/^\d+$/.test(str)) {
        if (str.startsWith("DEPT_") || str.startsWith("dept_")) {
          const parts = str.split("_");
          if (parts.length >= 3) {
            const code = parts[2].toUpperCase();
            if (code === "MAN" || code === "MGMT") return "Management";
            if (code === "OPE" || code === "OPS") return "Operations";
            if (code === "SEC" || code === "LEG") return "Security & Legal";
            if (code === "HR") return "Human Resources";
            if (code === "FIN" || code === "ACC") return "Finance & Accounts";
            if (code === "IT" || code === "TECH" || code === "DEV") return "IT & Software";
            return code.charAt(0) + code.slice(1).toLowerCase();
          }
        }
        return str;
      }
    }

    const roleStr = `${role || ""} ${designation || ""}`.toLowerCase();
    if (roleStr.includes("hr") || roleStr.includes("human") || roleStr.includes("recruit") || roleStr.includes("hiring")) return "Human Resources";
    if (roleStr.includes("engineer") || roleStr.includes("developer") || roleStr.includes("it") || roleStr.includes("tech") || roleStr.includes("wordpress") || roleStr.includes("network") || roleStr.includes("software")) return "IT & Software";
    if (roleStr.includes("owner") || roleStr.includes("director") || roleStr.includes("ceo") || roleStr.includes("coo") || roleStr.includes("cco") || roleStr.includes("cfmo") || roleStr.includes("head")) return "Management";
    if (roleStr.includes("legal") || roleStr.includes("recovery") || roleStr.includes("security") || roleStr.includes("facility") || roleStr.includes("guard")) return "Security & Legal";
    if (roleStr.includes("finance") || roleStr.includes("account") || roleStr.includes("billing") || roleStr.includes("payroll")) return "Finance & Accounts";
    if (roleStr.includes("admin") || roleStr.includes("operation") || roleStr.includes("logistics") || roleStr.includes("manager")) return "Operations";

    return "Operations";
  };

  const attendanceCounts = React.useMemo(() => {
    const activeStaff = (stats?.staffList || []).filter((s: any) => {
      const st = String(s.status || "").toLowerCase();
      return !["inactive", "archived", "terminated", "disabled"].includes(st);
    });
    const present = activeStaff.filter((s: any) => s.isPresent).length;
    const leave = activeStaff.filter((s: any) => s.isOnLeave || s.attendanceStatus === "On Leave").length;
    const absent = activeStaff.filter((s: any) => !s.isPresent && !s.isOnLeave && s.attendanceStatus !== "On Leave").length;
    const total = activeStaff.length;
    return {
      present: stats?.todayCompliance?.attendance ?? present,
      absent: stats?.todayCompliance?.absent ?? absent,
      leave: stats?.todayCompliance?.leaves ?? leave,
      total: total
    };
  }, [stats]);

  const filteredAttendanceStaffList = React.useMemo(() => {
    const activeStaff = (stats?.staffList || []).filter((member: any) => {
      const st = String(member.status || "").toLowerCase();
      return !["inactive", "archived", "terminated", "disabled"].includes(st);
    });
    return activeStaff.filter((member: any) => {
      const isPresent = member.isPresent;
      const isOnLeave = member.isOnLeave || member.attendanceStatus === "On Leave";
      const isAbsent = !isPresent && !isOnLeave;

      if (attendanceFilter === "present" && !isPresent) return false;
      if (attendanceFilter === "absent" && !isAbsent) return false;
      if (attendanceFilter === "leave" && !isOnLeave) return false;

      const q = attendanceSearchQuery.trim().toLowerCase();
      if (!q) return true;

      return [
        member.name,
        member.email,
        member.role,
        member.department,
        member.companies,
        member.company,
        member.leaveReason
      ].some(val => String(val || "").toLowerCase().includes(q));
    });
  }, [stats, attendanceFilter, attendanceSearchQuery]);

  const recentInterviews = React.useMemo(() => {
    return [...(interviews || [])]
      .sort((a, b) => new Date(b.createdAt || b.scheduleTime).getTime() - new Date(a.createdAt || a.scheduleTime).getTime())
      .slice(0, 5);
  }, [interviews]);

  const dynamicTotalLeadsCount = React.useMemo(() => {
    return (candidates || []).length;
  }, [candidates]);

  const dynamicHrLeadsCount = React.useMemo(() => {
    return (candidates || []).filter((c: any) => c.status === "Selected" || c.status === "Hired").length;
  }, [candidates]);

  const dynamicPendingLeadsCount = React.useMemo(() => {
    return (candidates || []).filter((c: any) => c.status === "Pending" || !c.status).length;
  }, [candidates]);

  const dynamicRejectedCount = React.useMemo(() => {
    return (candidates || []).filter((c: any) => c.status === "Rejected").length;
  }, [candidates]);

  const dynamicInterviewsToday = React.useMemo(() => {
    const todayStr = new Date().toDateString();
    return (interviews || []).filter((iv: any) => {
      if (!iv.scheduleTime) return false;
      return new Date(iv.scheduleTime).toDateString() === todayStr;
    }).length;
  }, [interviews]);

  // Use real pipeline trend data from stats API if available, else fallback to computed from candidates
  const chartData = React.useMemo(() => {
    if (hrStats?.pipelineTrend && hrStats.pipelineTrend.length > 0) {
      // Check if there's any real data (non-zero)
      const hasData = hrStats.pipelineTrend.some((d: any) => d["Total Leads"] > 0);
      if (hasData) return hrStats.pipelineTrend;
    }

    // Fallback: compute from candidates
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const counts = days.reduce((acc, day) => {
      acc[day] = { selected: 0, applied: 0 };
      return acc;
    }, {} as Record<string, { selected: number; applied: number }>);

    (candidates || []).forEach((c: any) => {
      const date = new Date(c.createdAt || c.applicationDate || new Date());
      const dayName = days[date.getDay()];
      if (counts[dayName]) {
        counts[dayName].applied += 1;
        if (c.status === "Selected" || c.status === "Hired") {
          counts[dayName].selected += 1;
        }
      }
    });

    const order = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    return order.map(day => ({
      name: day,
      "Total Leads": counts[day]?.applied || 0,
      "Selected for Joining": counts[day]?.selected || 0,
    }));
  }, [hrStats, candidates]);

  // Export HR Report as XLSX (Server-side generated)
  const exportHrReport = () => {
    window.location.href = "/api/dashboard/export-hr-report";
  };

  React.useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains("dark"));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  return (
    <div className="space-y-6 animate-fade-in text-slate-800">
      {/* Dashboard Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className={`text-xl sm:text-2xl font-black tracking-tight ${isDark ? "text-white" : "text-slate-800"}`}>
            HR Operations Dashboard
          </h1>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
          <button
            onClick={exportHrReport}
            className={`flex-1 sm:flex-initial px-3.5 sm:px-4 py-2 border rounded-lg text-xs sm:text-sm font-medium transition-colors shadow-sm flex items-center justify-center gap-2 ${isDark ? "bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700" : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"}`}
          >
            <Download className="w-4 h-4" /> Export HR Report
          </button>
          <button
            onClick={() => setShowHiringModal(true)}
            className="flex-1 sm:flex-initial px-3.5 sm:px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs sm:text-sm font-medium transition-colors shadow-sm flex items-center justify-center gap-2"
          >
            <UserPlus className="w-4 h-4" /> New Hire
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2.5 sm:gap-4">
        <StatCard
          title="Today's Interviews"
          value={dynamicInterviewsToday.toString()}
          trend="Scheduled for today"
          trendUp={true}
          icon={<CalendarClock className="w-5 h-5 text-blue-500" />}
          dark={isDark}
          onClick={() => onNavigateTab("interviews")}
        />
        <StatCard
          title="Verification Pending"
          value={hrStats.verificationPending?.toString() || "0"}
          trend="Requires action"
          trendUp={false}
          icon={<FileSearch className="w-5 h-5 text-slate-500" />}
          dark={isDark}
          onClick={() => onNavigateTab("verification")}
        />
        <StatCard
          title="HR Leads"
          value={(hrStats.hrLeadsCount ?? 0).toString()}
          trend="Total candidate profiles"
          trendUp={true}
          icon={<Users className="w-5 h-5 text-indigo-500" />}
          dark={isDark}
          onClick={() => onNavigateTab("business-leads", "All")}
        />
        <StatCard
          title="Selected Leads"
          value={(hrStats.selectedLeadsCount ?? 0).toString()}
          trend="Selected profiles"
          trendUp={true}
          icon={<CheckCircle className="w-5 h-5 text-emerald-500" />}
          dark={isDark}
          onClick={() => onNavigateTab("business-leads", "Selected")}
        />
        <StatCard
          title="Pending Leads"
          value={(hrStats.pendingLeadsCount ?? 0).toString()}
          trend="Under review leads"
          trendUp={true}
          icon={<Clock className="w-5 h-5 text-amber-500" />}
          dark={isDark}
          onClick={() => onNavigateTab("business-leads", "Pending")}
        />
        <StatCard
          title="Rejected Leads"
          value={(hrStats.rejectedLeadsCount ?? 0).toString()}
          trend="Rejected candidate"
          trendUp={false}
          icon={<ShieldX className="w-5 h-5 text-rose-500" />}
          dark={isDark}
          onClick={() => onNavigateTab("business-leads", "Rejected")}
        />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">

          {/* Today's Attendance Status (Sleek Compact Box) */}
          <div className={`p-4 rounded-xl border shadow-xs transition-all ${isDark ? "bg-gray-900 border-gray-800" : "bg-white border-slate-200"}`}>
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                  <UserCheck className="w-4 h-4" />
                </div>
                <h2 className={`text-sm font-bold tracking-tight ${isDark ? "text-white" : "text-slate-800"}`}>
                  Today's Attendance Status
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  Live
                </span>
              </div>
              <button
                onClick={() => { setAttendanceFilter("all"); setAttendanceSearchQuery(""); setShowAttendanceModal(true); }}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 flex items-center gap-1 hover:underline"
              >
                View Roster <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {/* Present Box */}
              <div
                onClick={() => { setAttendanceFilter("present"); setAttendanceSearchQuery(""); setShowAttendanceModal(true); }}
                className="p-3 rounded-lg border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/40 dark:bg-emerald-950/20 hover:bg-emerald-100/70 dark:hover:bg-emerald-950/40 cursor-pointer transition-all group"
              >
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">Present</span>
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600 group-hover:scale-110 transition-transform" />
                </div>
                <div className="text-xl font-black text-emerald-700 dark:text-emerald-400">
                  {attendanceCounts.present}
                </div>
                <div className="text-[9px] font-medium text-emerald-600/90 dark:text-emerald-400/90 mt-0.5 flex items-center gap-0.5">
                  Tap to view <ArrowUpRight className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>

              {/* Absent Box */}
              <div
                onClick={() => { setAttendanceFilter("absent"); setAttendanceSearchQuery(""); setShowAttendanceModal(true); }}
                className="p-3 rounded-lg border border-rose-200 dark:border-rose-900/60 bg-rose-50/40 dark:bg-rose-950/20 hover:bg-rose-100/70 dark:hover:bg-rose-950/40 cursor-pointer transition-all group"
              >
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-[11px] font-bold text-rose-800 dark:text-rose-300 uppercase tracking-wider">Absent</span>
                  <UserMinus className="w-3.5 h-3.5 text-rose-600 group-hover:scale-110 transition-transform" />
                </div>
                <div className="text-xl font-black text-rose-700 dark:text-rose-400">
                  {attendanceCounts.absent}
                </div>
                <div className="text-[9px] font-medium text-rose-600/90 dark:text-rose-400/90 mt-0.5 flex items-center gap-0.5">
                  Tap to view <ArrowUpRight className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>

              {/* On Leave Box */}
              <div
                onClick={() => { setAttendanceFilter("leave"); setAttendanceSearchQuery(""); setShowAttendanceModal(true); }}
                className="p-3 rounded-lg border border-amber-200 dark:border-amber-900/60 bg-amber-50/40 dark:bg-amber-950/20 hover:bg-amber-100/70 dark:hover:bg-amber-950/40 cursor-pointer transition-all group"
              >
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-[11px] font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider">On Leave</span>
                  <CalendarClock className="w-3.5 h-3.5 text-amber-600 group-hover:scale-110 transition-transform" />
                </div>
                <div className="text-xl font-black text-amber-700 dark:text-amber-400">
                  {attendanceCounts.leave}
                </div>
                <div className="text-[9px] font-medium text-amber-600/90 dark:text-amber-400/90 mt-0.5 flex items-center gap-0.5">
                  Tap to view <ArrowUpRight className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            </div>
          </div>

          {/* Quick Action Links Bar */}
          <div className={`p-4 rounded-xl border shadow-xs ${isDark ? "bg-gray-900 border-gray-800" : "bg-white border-slate-200"}`}>
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 flex items-center justify-center">
                  <Zap className="w-3.5 h-3.5" />
                </div>
                <h2 className={`text-xs font-extrabold uppercase tracking-wider ${isDark ? "text-white" : "text-slate-800"}`}>
                  Quick Action Links
                </h2>
              </div>
              <span className="text-[10px] font-semibold text-slate-400">Direct Module Navigation</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
              <button
                onClick={() => onNavigateTab("vehicle-registry")}
                className={`p-3 rounded-xl border text-left transition-all hover:scale-[1.03] flex items-center gap-3 cursor-pointer ${isDark ? "bg-gray-800 border-gray-700 text-gray-200 hover:bg-gray-750" : "bg-amber-50/60 border-amber-200/80 text-amber-950 hover:bg-amber-100/90 shadow-2xs"}`}
              >
                <div className="p-2 rounded-lg bg-amber-600 text-white shrink-0 shadow-2xs">
                  <Car className="w-5 h-5" />
                </div>
                <div className="min-w-0 font-bold text-xs truncate">Vehicle Registry</div>
              </button>

              <button
                onClick={() => onNavigateTab("leave-request")}
                className={`p-3 rounded-xl border text-left transition-all hover:scale-[1.03] flex items-center gap-3 cursor-pointer ${isDark ? "bg-gray-800 border-gray-700 text-gray-200 hover:bg-gray-750" : "bg-blue-50/60 border-blue-200/80 text-blue-950 hover:bg-blue-100/90 shadow-2xs"}`}
              >
                <div className="p-2 rounded-lg bg-blue-600 text-white shrink-0 shadow-2xs">
                  <CalendarCheck className="w-5 h-5" />
                </div>
                <div className="min-w-0 font-bold text-xs truncate">Leave Requests</div>
              </button>

              <button
                onClick={() => onNavigateTab("interviews")}
                className={`p-3 rounded-xl border text-left transition-all hover:scale-[1.03] flex items-center gap-3 cursor-pointer ${isDark ? "bg-gray-800 border-gray-700 text-gray-200 hover:bg-gray-750" : "bg-indigo-50/60 border-indigo-200/80 text-indigo-950 hover:bg-indigo-100/90 shadow-2xs"}`}
              >
                <div className="p-2 rounded-lg bg-indigo-600 text-white shrink-0 shadow-2xs">
                  <CalendarClock className="w-5 h-5" />
                </div>
                <div className="min-w-0 font-bold text-xs truncate">Interviews</div>
              </button>

              <button
                onClick={() => onNavigateTab("performance")}
                className={`p-3 rounded-xl border text-left transition-all hover:scale-[1.03] flex items-center gap-3 cursor-pointer ${isDark ? "bg-gray-800 border-gray-700 text-gray-200 hover:bg-gray-750" : "bg-teal-50/60 border-teal-200/80 text-teal-950 hover:bg-teal-100/90 shadow-2xs"}`}
              >
                <div className="p-2 rounded-lg bg-teal-600 text-white shrink-0 shadow-2xs">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="min-w-0 font-bold text-xs truncate">Work Report</div>
              </button>

              <button
                onClick={() => onNavigateTab("business-leads")}
                className={`p-3 rounded-xl border text-left transition-all hover:scale-[1.03] flex items-center gap-3 cursor-pointer ${isDark ? "bg-gray-800 border-gray-700 text-gray-200 hover:bg-gray-750" : "bg-emerald-50/60 border-emerald-200/80 text-emerald-950 hover:bg-emerald-100/90 shadow-2xs"}`}
              >
                <div className="p-2 rounded-lg bg-emerald-600 text-white shrink-0 shadow-2xs">
                  <Users className="w-5 h-5" />
                </div>
                <div className="min-w-0 font-bold text-xs truncate">HR Leads</div>
              </button>

              <button
                onClick={() => onNavigateTab("tasks")}
                className={`p-3 rounded-xl border text-left transition-all hover:scale-[1.03] flex items-center gap-3 cursor-pointer ${isDark ? "bg-gray-800 border-gray-700 text-gray-200 hover:bg-gray-750" : "bg-purple-50/60 border-purple-200/80 text-purple-950 hover:bg-purple-100/90 shadow-2xs"}`}
              >
                <div className="p-2 rounded-lg bg-purple-600 text-white shrink-0 shadow-2xs">
                  <CheckSquare className="w-5 h-5" />
                </div>
                <div className="min-w-0 font-bold text-xs truncate">My Tasks</div>
              </button>
            </div>
          </div>

          <div className={`p-6 rounded-xl border shadow-sm ${isDark ? "bg-gray-900 border-gray-800" : "bg-white border-slate-200"}`}>
            <div className="flex items-center justify-between mb-4">
              <h2 className={`text-lg font-bold ${isDark ? "text-white" : "text-slate-800"}`}>Hiring Pipeline Trends</h2>
              <select className={`text-xs border rounded px-2 py-1 outline-none ${isDark ? "bg-gray-800 border-gray-700 text-gray-300" : "bg-white border-slate-200 text-slate-600"}`}>
                <option>This Quarter</option>
                <option>Last Quarter</option>
              </select>
            </div>
            <AttendanceChart dark={isDark} data={chartData} />
          </div>
        </div>

        <div className="space-y-6">
          <div className={`p-6 rounded-xl border shadow-sm ${isDark ? "bg-gray-900 border-gray-800" : "bg-white border-slate-200"}`}>
            <div className="flex items-center justify-between mb-6">
              <h2 className={`text-lg font-bold ${isDark ? "text-white" : "text-slate-800"}`}>Recent HR Activity</h2>
              <button
                onClick={() => setShowAllActivities(true)}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 hover:underline transition-colors dark:text-indigo-400 dark:hover:text-indigo-300"
              >
                View All
              </button>
            </div>
            <ActivityFeed dark={isDark} logs={stats?.hrActivities?.slice(0, 8)} />
          </div>
        </div>
      </div>

      {/* View All Activities Modal */}
      {showAllActivities && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className={`relative w-full max-w-2xl max-h-[85vh] rounded-2xl shadow-2xl flex flex-col ${isDark ? "bg-gray-900 border border-gray-700" : "bg-white border border-slate-200"}`}>
            {/* Modal Header */}
            <div className={`flex items-center justify-between px-6 py-4 border-b ${isDark ? "border-gray-700" : "border-slate-100"}`}>
              <div>
                <h2 className={`text-lg font-bold ${isDark ? "text-white" : "text-slate-800"}`}>All HR Activities</h2>
                <p className={`text-xs mt-0.5 ${isDark ? "text-gray-400" : "text-slate-500"}`}>
                  {(stats?.hrActivities || []).length} total activities recorded
                </p>
              </div>
              <button
                onClick={() => setShowAllActivities(false)}
                className={`p-2 rounded-lg hover:bg-slate-100 transition-colors ${isDark ? "hover:bg-gray-800 text-gray-300" : "text-slate-600"}`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Activity List - Scrollable */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {(stats?.hrActivities || []).length === 0 ? (
                <p className={`text-sm text-center py-8 ${isDark ? "text-gray-400" : "text-slate-500"}`}>No activities found.</p>
              ) : (
                (stats?.hrActivities || []).map((log: any, idx: number) => {
                  const actionLabel = log.title || (log.action ? log.action.replace(/_/g, " ") : "Activity");
                  const actionUpper = (log.action || "").toUpperCase();
                  let badgeColor = "bg-purple-100 text-purple-700";
                  if (actionUpper.includes("CREATE") || actionUpper.includes("ADD") || actionUpper.includes("SOD")) badgeColor = "bg-emerald-100 text-emerald-700";
                  else if (actionUpper.includes("APPROVE") || actionUpper.includes("SELECT")) badgeColor = "bg-green-100 text-green-700";
                  else if (actionUpper.includes("REJECT") || actionUpper.includes("DELETE")) badgeColor = "bg-rose-100 text-rose-700";
                  else if (actionUpper.includes("INTERVIEW") || actionUpper.includes("SCHEDULE")) badgeColor = "bg-amber-100 text-amber-700";
                  else if (actionUpper.includes("UPDATE") || actionUpper.includes("EDIT")) badgeColor = "bg-blue-100 text-blue-700";

                  return (
                    <div key={log.id || idx} className={`rounded-xl border p-4 transition-all hover:shadow-sm ${isDark ? "bg-gray-800 border-gray-700" : "bg-slate-50 border-slate-100"}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-2">
                            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${badgeColor}`}>
                              {actionLabel}
                            </span>
                            <span className={`text-[10px] ${isDark ? "text-gray-500" : "text-slate-400"}`}>
                              {log.timestamp ? new Date(log.timestamp).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : ""}
                            </span>
                          </div>
                          <p className={`text-sm leading-relaxed ${isDark ? "text-gray-200" : "text-slate-700"}`}>
                            {log.description || log.details || "No details available."}
                          </p>
                        </div>
                      </div>
                      <div className={`mt-3 pt-2 border-t flex items-center gap-2 ${isDark ? "border-gray-700" : "border-slate-200"}`}>
                        <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center">
                          <span className="text-[9px] font-bold text-indigo-700">
                            {(log.actor || log.user?.name || "S").charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <span className={`text-xs font-semibold ${isDark ? "text-indigo-400" : "text-indigo-600"}`}>
                          {log.actor || log.user?.name || "System"}
                        </span>
                        {log.actorRole && (
                          <span className={`text-[10px] ${isDark ? "text-gray-500" : "text-slate-400"}`}>
                            • {log.actorRole}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className={`px-6 py-4 border-t ${isDark ? "border-gray-700" : "border-slate-100"}`}>
              <button
                onClick={() => setShowAllActivities(false)}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-semibold transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showHiringModal && (
        <HiringRequisitionModal
          onClose={() => setShowHiringModal(false)}
          triggerToast={(msg) => alert(msg)}
        />
      )}

      {showAttendanceModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex justify-center items-center backdrop-blur-sm p-4 sm:p-6" onClick={() => setShowAttendanceModal(false)}>
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800 animate-slideUp" onClick={e => e.stopPropagation()}>

            {/* Modal Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-slate-800 dark:text-white">
                    Today's Attendance Roster
                  </h2>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${attendanceFilter === "present" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" :
                      attendanceFilter === "absent" ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300" :
                        attendanceFilter === "leave" ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300" :
                          "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300"
                    }`}>
                    {attendanceFilter === "present" ? `Present (${attendanceCounts.present})` :
                      attendanceFilter === "absent" ? `Absent (${attendanceCounts.absent})` :
                        attendanceFilter === "leave" ? `On Leave (${attendanceCounts.leave})` :
                          `All Staff (${attendanceCounts.total})`}
                  </span>
                </div>
              </div>
              <button onClick={() => setShowAttendanceModal(false)} className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-800">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Filter Tabs & Search Bar */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900">
              <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl w-full sm:w-auto overflow-x-auto">
                <button
                  onClick={() => setAttendanceFilter("all")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${attendanceFilter === "all" ? "bg-white dark:bg-slate-900 text-slate-800 dark:text-white shadow-xs" : "text-slate-500 hover:text-slate-800 dark:text-slate-400"
                    }`}
                >
                  All ({attendanceCounts.total})
                </button>
                <button
                  onClick={() => setAttendanceFilter("present")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${attendanceFilter === "present" ? "bg-emerald-500 text-white shadow-xs" : "text-slate-500 hover:text-slate-800 dark:text-slate-400"
                    }`}
                >
                  Present ({attendanceCounts.present})
                </button>
                <button
                  onClick={() => setAttendanceFilter("absent")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${attendanceFilter === "absent" ? "bg-rose-500 text-white shadow-xs" : "text-slate-500 hover:text-slate-800 dark:text-slate-400"
                    }`}
                >
                  Absent ({attendanceCounts.absent})
                </button>
                <button
                  onClick={() => setAttendanceFilter("leave")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${attendanceFilter === "leave" ? "bg-amber-500 text-white shadow-xs" : "text-slate-500 hover:text-slate-800 dark:text-slate-400"
                    }`}
                >
                  On Leave ({attendanceCounts.leave})
                </button>
              </div>

              <input
                type="text"
                placeholder="Search by name, role, dept, company..."
                value={attendanceSearchQuery}
                onChange={e => setAttendanceSearchQuery(e.target.value)}
                className="w-full sm:w-64 px-3.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-800 dark:text-white"
              />
            </div>

            {/* Staff Table */}
            <div className="flex-1 overflow-auto p-0">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50/80 dark:bg-slate-800/80 sticky top-0 z-10 backdrop-blur-xs">
                  <tr>
                    <th className="px-6 py-3.5 text-[10px] uppercase tracking-widest text-slate-500 dark:text-slate-400 font-bold border-b border-slate-100 dark:border-slate-800">Employee</th>
                    <th className="px-6 py-3.5 text-[10px] uppercase tracking-widest text-slate-500 dark:text-slate-400 font-bold border-b border-slate-100 dark:border-slate-800">Role & Department</th>
                    <th className="px-6 py-3.5 text-[10px] uppercase tracking-widest text-slate-500 dark:text-slate-400 font-bold border-b border-slate-100 dark:border-slate-800">Attendance Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredAttendanceStaffList.length > 0 ? (
                    filteredAttendanceStaffList.map((staff: any) => {
                      const isPresent = staff.isPresent;
                      const isOnLeave = staff.isOnLeave || staff.attendanceStatus === "On Leave";
                      return (
                        <tr key={staff.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="font-bold text-slate-800 dark:text-slate-100">{staff.name}</div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400">{staff.email}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">{staff.role}</div>
                            <div className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mt-0.5">{formatCleanDepartment(staff.department, staff.role, staff.designation)}</div>
                          </td>
                          <td className="px-6 py-4">
                            {isOnLeave ? (
                              <div>
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                                  <CalendarClock className="w-3 h-3" /> On Leave
                                </span>
                                {staff.leaveReason && (
                                  <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 italic">
                                    "{staff.leaveReason}"
                                  </div>
                                )}
                              </div>
                            ) : isPresent ? (
                              <div>
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                  <CheckCircle className="w-3 h-3" /> Present Today
                                </span>
                                {staff.sodTime && (
                                  <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 font-medium">
                                    SOD: {new Date(staff.sodTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div>
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                                  <UserMinus className="w-3 h-3" /> Absent Today
                                </span>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={3} className="px-6 py-12 text-center text-slate-400 font-medium text-xs">
                        No staff members match the selected filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between">
              <button
                onClick={() => { setShowAttendanceModal(false); onNavigateTab("employees"); }}
                className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
              >
                Open Employees Directory <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setShowAttendanceModal(false)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold tracking-wider uppercase transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function DepartmentDashboard({
  stats,
  onNavigateTab,
  userRole,
  selectedDeptId = "all",
  onDeptChange,
  onNavigateTodayTasks,
  onRefresh
}: {
  stats: any;
  onNavigateTab: (tab: string) => void;
  userRole?: string;
  selectedDeptId?: string;
  onDeptChange?: (dept: string) => void;
  onNavigateTodayTasks?: () => void;
  onRefresh?: () => void;
}) {
  const deptStats = stats?.deptStats || {};
  const [isDark, setIsDark] = React.useState(false);
  const [showHiringModal, setShowHiringModal] = React.useState(false);
  const [showTeamModal, setShowTeamModal] = React.useState(false);
  const [showSodEodModal, setShowSodEodModal] = React.useState(false);
  const [departments, setDepartments] = React.useState<any[]>([]);
  const [teamSearch, setTeamSearch] = React.useState("");
  const [attendanceFilter, setAttendanceFilter] = React.useState("all");

  React.useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains("dark"));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

    // Fetch active departments
    const fetchDepts = async () => {
      try {
        const res = await fetch("/api/departments");
        const data = await res.json();
        if (data.success) {
          setDepartments(data.data || []);
        }
      } catch (err) {
        console.error("Failed to load departments:", err);
      }
    };
    fetchDepts();

    return () => observer.disconnect();
  }, []);

  const isGlobal = ["Owner", "Director", "HR Head", "HR Executive"].includes(userRole || "");
  const teamList = deptStats.teamList || [];

  const uniqueDepartments = departments.filter((department, index, list) =>
    department?.name && list.findIndex(item => item.name === department.name) === index
  );
  const filteredTeamList = teamList.filter((member: any) => {
    const search = teamSearch.trim().toLowerCase();
    const matchesSearch = !search || [
      member.name,
      member.designation,
      member.role,
      member.department
    ].some(value => String(value || "").toLowerCase().includes(search));
    const matchesAttendance = attendanceFilter === "all" ||
      String(member.attendanceStatus || "").toLowerCase() === attendanceFilter;
    return matchesSearch && matchesAttendance;
  });
  const taskCompletionRate = deptStats.tasksToday
    ? Math.round(((deptStats.completedTasks || 0) / deptStats.tasksToday) * 100)
    : 0;
  const sodComplianceRate = deptStats.teamMembers
    ? Math.round(((deptStats.sod || 0) / deptStats.teamMembers) * 100)
    : 0;
  const eodComplianceRate = deptStats.teamMembers
    ? Math.round(((deptStats.eod || 0) / deptStats.teamMembers) * 100)
    : 0;
  const teamWorkload = [...teamList]
    .sort((a: any, b: any) =>
      (b.tasksOverdue || 0) - (a.tasksOverdue || 0) ||
      (b.tasksTotal || 0) - (a.tasksTotal || 0)
    )
    .slice(0, 6);

  const exportDepartmentReport = () => {
    if (teamList.length === 0) return;
    const rows = teamList.map((member: any) => ({
      "Employee Name": member.name || "",
      "Designation": member.designation || member.role || "",
      "Department": member.department || "",
      "Employment Status": member.status || "",
      "Attendance Today": member.attendanceStatus || "Absent",
      "SOD Time": member.sodTime ? new Date(member.sodTime).toLocaleTimeString("en-IN") : "",
      "EOD Time": member.eodTime ? new Date(member.eodTime).toLocaleTimeString("en-IN") : "",
      "Tasks Today": member.tasksTotal || 0,
      "Tasks Completed": member.tasksCompleted || 0,
      "Tasks Pending": Math.max(0, (member.tasksTotal || 0) - (member.tasksCompleted || 0)),
      "Tasks Overdue": member.tasksOverdue || 0
    }));
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(rows);
    worksheet["!cols"] = Object.keys(rows[0]).map((key) => ({
      wch: Math.max(key.length + 2, ...rows.map((row: any) => String(row[key] ?? "").length + 2))
    }));
    XLSX.utils.book_append_sheet(workbook, worksheet, "Department Team");
    XLSX.writeFile(
      workbook,
      `Department_Report_${selectedDeptId === "all" ? "All" : selectedDeptId}_${new Date().toISOString().slice(0, 10)}.xlsx`
    );
  };

  return (
    <div className="space-y-6 animate-fade-in overflow-x-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className={`text-xl sm:text-2xl font-bold tracking-tight ${isDark ? "text-white" : "text-slate-800"}`}>
            Department Head Dashboard
          </h1>
          <p className={`text-xs sm:text-sm mt-0.5 sm:mt-1 ${isDark ? "text-gray-400" : "text-slate-500"}`}>
            Manager view — team performance, daily tasks, and approvals
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
          {isGlobal && (
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className={`text-xs font-bold uppercase tracking-wider ${isDark ? "text-gray-400" : "text-slate-550"}`}>
                Department:
              </span>
              <select
                value={selectedDeptId}
                onChange={(e) => onDeptChange?.(e.target.value)}
                className={`w-full sm:w-auto text-xs sm:text-sm border rounded-lg px-3 py-1.5 outline-none font-semibold transition-all shadow-sm ${isDark
                  ? "bg-gray-800 border-gray-700 text-gray-200 focus:border-indigo-500"
                  : "bg-white border-slate-200 text-slate-700 focus:border-indigo-500"
                  }`}
              >
                <option value="all">All Departments</option>
                {uniqueDepartments.map((department: any) => (
                  <option key={department.id || department.name} value={department.id || department.name}>
                    {department.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={onRefresh}
              className="flex-1 sm:flex-initial border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-colors flex items-center justify-center gap-1.5"
            >
              <RotateCw className="w-4 h-4" /> Refresh
            </button>
            <button
              onClick={exportDepartmentReport}
              disabled={teamList.length === 0}
              className="flex-1 sm:flex-initial border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 disabled:opacity-50 text-emerald-700 px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-colors flex items-center justify-center gap-1.5"
            >
              <Download className="w-4 h-4" /> Export
            </button>
            <button
              onClick={() => setShowHiringModal(true)}
              className="flex-1 sm:flex-initial bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors shadow-sm flex items-center justify-center gap-1.5 shrink-0"
            >
              <PlusCircle className="w-4 h-4" /> Add Requirement
            </button>
          </div>
        </div>
      </div>

      {showHiringModal && (
        <HiringRequisitionModal
          onClose={() => setShowHiringModal(false)}
          triggerToast={(msg) => alert(msg)}
        />
      )}

      {/* 1. Team Members Popup Modal */}
      {showTeamModal && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-md z-[9999] flex items-center justify-center p-4">
          <div className={`w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden border ${isDark ? "bg-gray-900 border-gray-800 text-white" : "bg-white border-slate-200 text-slate-800"}`}>
            <div className="px-6 py-4 border-b border-slate-200 dark:border-gray-800 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold">Team Directory</h3>
                <p className="text-xs text-slate-500 dark:text-gray-400">Total active team members</p>
              </div>
              <button
                onClick={() => setShowTeamModal(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-gray-800 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 pt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                value={teamSearch}
                onChange={(event) => setTeamSearch(event.target.value)}
                placeholder="Search employee, role..."
                className="border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-indigo-400"
              />
              <select
                value={attendanceFilter}
                onChange={(event) => setAttendanceFilter(event.target.value)}
                className="border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-indigo-400"
              >
                <option value="all">All Attendance</option>
                <option value="present">Present</option>
                <option value="absent">Absent</option>
                <option value="on leave">On Leave</option>
              </select>
            </div>
            <div className="p-6 max-h-[60vh] overflow-y-auto space-y-3">
              {filteredTeamList.length === 0 ? (
                <p className="text-center text-sm text-slate-400 py-4">No team members found.</p>
              ) : (
                filteredTeamList.map((m: any) => (
                  <div key={m.id} className={`p-4 rounded-xl border flex items-center justify-between ${isDark ? "bg-gray-800/50 border-gray-700" : "bg-slate-50/50 border-slate-150"}`}>
                    <div>
                      <h4 className="text-sm font-bold">{m.name}</h4>
                      <p className="text-xs text-slate-500 dark:text-gray-400 mt-0.5">
                        {m.designation || m.role} • {m.department}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-1">
                        Tasks {m.tasksCompleted || 0}/{m.tasksTotal || 0}
                        {m.tasksOverdue ? ` • ${m.tasksOverdue} overdue` : ""}
                      </p>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${m.attendanceStatus === "Present"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : m.attendanceStatus === "On Leave"
                          ? "bg-amber-50 text-amber-700 border-amber-200"
                          : "bg-rose-50 text-rose-700 border-rose-200"
                      }`}>
                      {m.attendanceStatus || "Absent"}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* 2. SOD/EOD Compliance Popup Modal */}
      {showSodEodModal && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-md z-[9999] flex items-center justify-center p-4">
          <div className={`w-full max-w-3xl rounded-2xl shadow-xl overflow-hidden border ${isDark ? "bg-gray-900 border-gray-800 text-white" : "bg-white border-slate-200 text-slate-800"}`}>
            <div className="px-6 py-4 border-b border-slate-200 dark:border-gray-800 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold">Today's Compliance Status</h3>
                <p className="text-xs text-slate-500 dark:text-gray-400">SOD and EOD submissions check</p>
              </div>
              <button
                onClick={() => setShowSodEodModal(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-gray-800 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 max-h-[60vh] overflow-y-auto">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-gray-800 text-xs font-bold uppercase tracking-wider text-slate-400">
                      <th className="pb-3 pl-2">Employee</th>
                      <th className="pb-3">SOD Status / Time</th>
                      <th className="pb-3">EOD Status / Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-gray-800/60">
                    {teamList.map((m: any) => {
                      const sodTimeLabel = m.sodTime
                        ? new Date(m.sodTime).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
                        : null;
                      const eodTimeLabel = m.eodTime
                        ? new Date(m.eodTime).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
                        : null;

                      return (
                        <tr key={m.id} className="text-xs font-medium">
                          <td className="py-3.5 pl-2">
                            <div className="font-bold">{m.name}</div>
                            <div className="text-[10px] text-slate-400 mt-0.5">{m.designation || m.role}</div>
                          </td>
                          <td className="py-3.5">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-bold border ${m.sodTime ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400" : "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/20 dark:text-rose-400"}`}>
                              {m.sodTime ? sodTimeLabel : "Pending"}
                            </span>
                          </td>
                          <td className="py-3.5">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-bold border ${m.eodTime ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400" : "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/20 dark:text-rose-450"}`}>
                              {m.eodTime ? eodTimeLabel : "Pending"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-4">
        <StatCard
          title="Team Members"
          value={deptStats.teamMembers?.toString() || "0"}
          trend="Total active"
          trendUp={true}
          icon={<Users className="w-5 h-5 text-indigo-500" />}
          dark={isDark}
          onClick={() => setShowTeamModal(true)}
        />
        <StatCard
          title="Today's Tasks"
          value={deptStats.tasksToday?.toString() || "0"}
          trend="Pending completion"
          trendUp={true}
          icon={<Briefcase className="w-5 h-5 text-amber-500" />}
          dark={isDark}
          onClick={() => onNavigateTodayTasks?.()}
        />
        <StatCard
          title="SOD / EOD"
          value={`${deptStats.sod || 0} / ${deptStats.eod || 0}`}
          trend="Team compliance"
          trendUp={true}
          icon={<Clock className="w-5 h-5 text-emerald-500" />}
          dark={isDark}
          onClick={() => setShowSodEodModal(true)}
        />
        <StatCard
          title="Pending Approvals"
          value={(deptStats.pendingApprovals !== undefined ? deptStats.pendingApprovals : (stats?.pendingApprovals?.pendingRequestsTotal || 0)).toString()}
          trend="Requires Manager action"
          trendUp={false}
          icon={<ShieldCheck className="w-5 h-5 text-indigo-500" />}
          dark={isDark}
          onClick={() => onNavigateTab("ess-leaves")}
        />
        <StatCard
          title="Avg Performance"
          value={`${deptStats.performanceAvg || 0}%`}
          trend="Current quarter"
          trendUp={true}
          icon={<TrendingUp className="w-5 h-5 text-teal-500" />}
          dark={isDark}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <button
          type="button"
          onClick={() => onNavigateTodayTasks?.()}
          className={`p-4 sm:p-5 rounded-xl border shadow-sm text-left transition-colors ${isDark ? "bg-gray-900 border-gray-800 hover:border-indigo-700" : "bg-white border-slate-200 hover:border-indigo-300"}`}
        >
          <div className="flex items-center justify-between">
            <h2 className={`text-sm font-bold ${isDark ? "text-white" : "text-slate-800"}`}>Today's Task Pipeline</h2>
            <span className="text-xs font-bold text-indigo-600">{taskCompletionRate}% done</span>
          </div>
          <div className="grid grid-cols-4 gap-2 mt-4 text-center">
            {[
              ["Completed", deptStats.completedTasks || 0, "text-emerald-600"],
              ["In Progress", deptStats.inProgressTasks || 0, "text-amber-600"],
              ["Pending", deptStats.pendingTasks || 0, "text-slate-600"],
              ["Overdue", deptStats.overdueTasks || 0, "text-rose-600"]
            ].map(([label, value, color]) => (
              <div key={String(label)}>
                <div className={`text-base sm:text-lg font-bold ${color}`}>{value}</div>
                <div className="text-[9px] sm:text-[10px] text-slate-500 mt-0.5">{label}</div>
              </div>
            ))}
          </div>
          <div className={`h-2 rounded-full mt-4 overflow-hidden ${isDark ? "bg-gray-800" : "bg-slate-100"}`}>
            <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${Math.min(100, taskCompletionRate)}%` }} />
          </div>
        </button>

        <button
          type="button"
          onClick={() => setShowTeamModal(true)}
          className={`p-4 sm:p-5 rounded-xl border shadow-sm text-left transition-colors ${isDark ? "bg-gray-900 border-gray-800 hover:border-emerald-700" : "bg-white border-slate-200 hover:border-emerald-300"}`}
        >
          <div className="flex items-center justify-between">
            <h2 className={`text-sm font-bold ${isDark ? "text-white" : "text-slate-800"}`}>Attendance Today</h2>
            <Users className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="grid grid-cols-3 gap-2.5 sm:gap-3 mt-4">
            {[
              ["Present", deptStats.presentToday || 0, "bg-emerald-50 text-emerald-700"],
              ["On Leave", deptStats.onLeaveToday || 0, "bg-amber-50 text-amber-700"],
              ["Absent", deptStats.absentToday || 0, "bg-rose-50 text-rose-700"]
            ].map(([label, value, color]) => (
              <div key={String(label)} className={`rounded-lg p-2.5 sm:p-3 ${color}`}>
                <div className="text-lg sm:text-xl font-bold">{value}</div>
                <div className="text-[9px] sm:text-[10px] font-semibold mt-1">{label}</div>
              </div>
            ))}
          </div>
        </button>

        <div className={`p-4 sm:p-5 rounded-xl border shadow-sm ${isDark ? "bg-gray-900 border-gray-800" : "bg-white border-slate-200"}`}>
          <div className="flex items-center justify-between">
            <h2 className={`text-sm font-bold ${isDark ? "text-white" : "text-slate-800"}`}>Manager Attention</h2>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="grid grid-cols-2 gap-2 mt-4 text-xs">
            <button onClick={() => onNavigateTab("ess-leaves")} className="rounded-lg border border-slate-200 p-2.5 sm:p-3 text-left hover:bg-slate-50">
              <span className="block text-base sm:text-lg font-bold text-indigo-600">{deptStats.pendingLeaves || 0}</span>
              Pending Leaves
            </button>
            <button onClick={() => onNavigateTab("ess-expenses")} className="rounded-lg border border-slate-200 p-2.5 sm:p-3 text-left hover:bg-slate-50">
              <span className="block text-base sm:text-lg font-bold text-indigo-600">{deptStats.pendingExpenses || 0}</span>
              Pending Expenses
            </button>
            <button onClick={() => setShowSodEodModal(true)} className="rounded-lg border border-slate-200 p-2.5 sm:p-3 text-left hover:bg-slate-50">
              <span className="block text-base sm:text-lg font-bold text-rose-600">{deptStats.sodPending || 0}</span>
              SOD Pending
            </button>
            <button onClick={() => setShowSodEodModal(true)} className="rounded-lg border border-slate-200 p-2.5 sm:p-3 text-left hover:bg-slate-50">
              <span className="block text-base sm:text-lg font-bold text-rose-600">{deptStats.eodPending || 0}</span>
              EOD Pending
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className={`p-4 sm:p-5 rounded-xl border shadow-sm ${isDark ? "bg-gray-900 border-gray-800" : "bg-white border-slate-200"}`}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className={`text-base sm:text-lg font-bold ${isDark ? "text-white" : "text-slate-800"}`}>Team Workload Today</h2>
                <p className="text-xs text-slate-500 mt-0.5">Overdue and high-workload employees appear first</p>
              </div>
              <button onClick={() => setShowTeamModal(true)} className="text-xs font-bold text-indigo-600 hover:text-indigo-700">View all</button>
            </div>
            {teamWorkload.length === 0 ? (
              <div className="py-8 text-center text-sm text-slate-400">No team data available for this department.</div>
            ) : (
              <div className="overflow-x-auto custom-scrollbar">
                <div className="min-w-[460px] divide-y divide-slate-100">
                  {teamWorkload.map((member: any) => {
                    const completion = member.tasksTotal
                      ? Math.round(((member.tasksCompleted || 0) / member.tasksTotal) * 100)
                      : 0;
                    return (
                      <div key={member.id} className="grid grid-cols-[minmax(140px,1fr)_minmax(110px,1fr)_70px_80px] items-center gap-3 py-3 text-xs">
                        <div className="min-w-0">
                          <div className={`font-bold truncate ${isDark ? "text-gray-100" : "text-slate-700"}`}>{member.name}</div>
                          <div className="text-[10px] text-slate-400 truncate">{member.designation || member.role || "Team member"}</div>
                        </div>
                        <div>
                          <div className={`h-1.5 rounded-full overflow-hidden ${isDark ? "bg-gray-800" : "bg-slate-100"}`}>
                            <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${Math.min(100, completion)}%` }} />
                          </div>
                          <div className="text-[10px] text-slate-400 mt-1">{member.tasksCompleted || 0}/{member.tasksTotal || 0} completed</div>
                        </div>
                        <span className={`font-bold ${member.tasksOverdue ? "text-rose-600" : "text-slate-400"}`}>
                          {member.tasksOverdue || 0} overdue
                        </span>
                        <span className={`text-[10px] font-bold text-center px-2 py-1 rounded-full ${member.attendanceStatus === "Present"
                            ? "bg-emerald-50 text-emerald-700"
                            : member.attendanceStatus === "On Leave"
                              ? "bg-amber-50 text-amber-700"
                              : "bg-rose-50 text-rose-700"
                          }`}>
                          {member.attendanceStatus || "Absent"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className={`p-6 rounded-xl border shadow-sm ${isDark ? "bg-gray-900 border-gray-800" : "bg-white border-slate-200"}`}>
            <div className="flex items-center justify-between mb-4">
              <h2 className={`text-lg font-bold ${isDark ? "text-white" : "text-slate-800"}`}>Team Performance Trends</h2>
              <span className={`text-xs font-medium ${isDark ? "text-gray-400" : "text-slate-500"}`}>SOD Compliance — Last 6 Months</span>
            </div>
            <PerformanceChart dark={isDark} data={deptStats.performanceTrend || []} />
          </div>
        </div>

        <div className="space-y-6">
          <div className={`p-5 rounded-xl border shadow-sm ${isDark ? "bg-gray-900 border-gray-800" : "bg-white border-slate-200"}`}>
            <div className="flex items-center justify-between mb-4">
              <h2 className={`text-sm font-bold ${isDark ? "text-white" : "text-slate-800"}`}>Daily Compliance</h2>
              <button onClick={() => setShowSodEodModal(true)} className="text-[10px] font-bold text-indigo-600">Inspect</button>
            </div>
            {[
              ["SOD submitted", deptStats.sod || 0, sodComplianceRate, "bg-indigo-500"],
              ["EOD submitted", deptStats.eod || 0, eodComplianceRate, "bg-emerald-500"]
            ].map(([label, value, percent, color]) => (
              <div key={String(label)} className="mb-4 last:mb-0">
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-slate-500">{label}</span>
                  <span className={`font-bold ${isDark ? "text-white" : "text-slate-700"}`}>{value}/{deptStats.teamMembers || 0} ({percent}%)</span>
                </div>
                <div className={`h-2 rounded-full overflow-hidden ${isDark ? "bg-gray-800" : "bg-slate-100"}`}>
                  <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(100, Number(percent))}%` }} />
                </div>
              </div>
            ))}
          </div>
          <div className={`p-6 rounded-xl border shadow-sm ${isDark ? "bg-gray-900 border-gray-800" : "bg-white border-slate-200"}`}>
            <div className="flex items-center justify-between mb-6">
              <h2 className={`text-lg font-bold ${isDark ? "text-white" : "text-slate-800"}`}>Team Activity</h2>
            </div>
            <ActivityFeed dark={isDark} logs={deptStats.teamActivities || []} maxHeight="max-h-[390px]" />
          </div>
        </div>
      </div>
    </div>
  );
}
