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
  FileCheck2,
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
  Package,
  RefreshCw,
  CalendarDays,
  FolderKanban,
  UserRoundCheck,
  Clock3,
  Search,
  Filter,
  Megaphone,
  ChevronRight
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
  stats: initialStats,
  candidates: initialCandidates = [],
  interviews: initialInterviews = [],
  onNavigateTab,
  sessionUser,
  companies = [],
  selectedCompanyId,
  onCompanyChange,
  triggerToast
}: {
  stats: any;
  candidates?: any[];
  interviews?: any[];
  onNavigateTab: (tab: string, filter?: string) => void;
  sessionUser?: any;
  companies?: any[];
  selectedCompanyId?: string;
  onCompanyChange?: (id: string) => void;
  triggerToast?: (msg: string) => void;
}) {
  const [liveStats, setLiveStats] = React.useState<any>(initialStats || {});
  const [candidatesList, setCandidatesList] = React.useState<any[]>(initialCandidates || []);
  const [interviewsList, setInterviewsList] = React.useState<any[]>(initialInterviews || []);
  const [liveLeaves, setLiveLeaves] = React.useState<any[]>([]);
  const [operationsCounts, setOperationsCounts] = React.useState({ inventory: 0, vehicles: 0 });
  const [isDark, setIsDark] = React.useState(false);
  const [showHiringModal, setShowHiringModal] = React.useState(false);
  const [showAllActivities, setShowAllActivities] = React.useState(false);
  const [showAttendanceModal, setShowAttendanceModal] = React.useState(false);
  const [attendanceFilter, setAttendanceFilter] = React.useState<"all" | "present" | "absent" | "leave">("all");
  const [attendanceSearchQuery, setAttendanceSearchQuery] = React.useState("");
  const [selectedDept, setSelectedDept] = React.useState("");
  const [departments, setDepartments] = React.useState<any[]>([]);
  const [scopeRange, setScopeRange] = React.useState<"today" | "all">("today");
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  React.useEffect(() => {
    if (initialStats && Object.keys(initialStats).length > 0) {
      setLiveStats((prev: any) => ({ ...prev, ...initialStats }));
    }
  }, [initialStats]);

  React.useEffect(() => {
    if (initialCandidates && initialCandidates.length > 0) {
      setCandidatesList(initialCandidates);
    }
  }, [initialCandidates]);

  React.useEffect(() => {
    if (initialInterviews && initialInterviews.length > 0) {
      setInterviewsList(initialInterviews);
    }
  }, [initialInterviews]);

  React.useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains("dark"));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  React.useEffect(() => {
    const controller = new AbortController();
    fetch("/api/departments", { cache: "force-cache", signal: controller.signal })
      .then(res => res.json())
      .then(data => {
        if (data?.success && Array.isArray(data.data)) {
          setDepartments(data.data);
        }
      })
      .catch(() => {});
    return () => controller.abort();
  }, []);

  const indiaDateKey = (value: any) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
  };

  function parseCompanyNames(value: any): string[] {
    if (!value) return [];
    if (Array.isArray(value)) return value.map(item => String(item?.name || item?.id || item)).filter(Boolean);
    if (typeof value === "string") {
      try { return parseCompanyNames(JSON.parse(value)); } catch {
        return value.split(",").map(item => item.trim()).filter(Boolean);
      }
    }
    return [String(value?.name || value?.id || value)].filter(Boolean);
  }

  const loadLiveHrData = React.useCallback(async (signal?: AbortSignal) => {
    setIsRefreshing(true);
    try {
      const companyQuery = selectedCompanyId ? `?companyId=${encodeURIComponent(selectedCompanyId)}` : "";
      const [statsRes, candRes, interviewRes, leavesRes, invRes, vehRes] = await Promise.all([
        fetch(`/api/dashboard/stats${companyQuery}`, { cache: "no-store", signal }).catch(() => null),
        fetch(`/api/candidates${companyQuery}`, { cache: "no-store", signal }).catch(() => null),
        fetch(`/api/interviews`, { cache: "no-store", signal }).catch(() => null),
        fetch(`/api/leaves`, { cache: "no-store", signal }).catch(() => null),
        fetch(`/api/assets/inventory${companyQuery}`, { cache: "no-store", signal }).catch(() => null),
        fetch(`/api/vehicles${companyQuery}`, { cache: "no-store", signal }).catch(() => null),
      ]);

      if (signal?.aborted) return;

      if (statsRes && statsRes.ok) {
        const statsJson = await statsRes.json();
        if (statsJson?.success && statsJson.stats) {
          setLiveStats(statsJson.stats);
        }
      }
      if (candRes && candRes.ok) {
        const candJson = await candRes.json();
        if (candJson?.success && Array.isArray(candJson.data)) {
          setCandidatesList(candJson.data);
        }
      }
      if (interviewRes && interviewRes.ok) {
        const interviewJson = await interviewRes.json();
        if (interviewJson?.success && Array.isArray(interviewJson.data)) {
          setInterviewsList(interviewJson.data);
        }
      }
      if (leavesRes && leavesRes.ok) {
        const leavesJson = await leavesRes.json();
        if (leavesJson?.success && Array.isArray(leavesJson.data)) {
          setLiveLeaves(leavesJson.data);
        }
      }
      if (invRes || vehRes) {
        const [invJson, vehJson] = await Promise.all([
          invRes && invRes.ok ? invRes.json() : null,
          vehRes && vehRes.ok ? vehRes.json() : null
        ]);
        setOperationsCounts({
          inventory: invJson?.success ? (Array.isArray(invJson.data) ? invJson.data.length : 0) : 0,
          vehicles: vehJson?.success ? (Number(vehJson.summary?.total) || (Array.isArray(vehJson.data) ? vehJson.data.length : 0)) : 0
        });
      }
    } catch (err: any) {
      if (err?.name !== "AbortError") {
        console.error("Live HR Data fetch error:", err);
      }
    } finally {
      if (!signal?.aborted) setIsRefreshing(false);
    }
  }, [selectedCompanyId]);

  React.useEffect(() => {
    const controller = new AbortController();
    loadLiveHrData(controller.signal);
    return () => controller.abort();
  }, [loadLiveHrData]);

  const handleRefresh = () => {
    loadLiveHrData();
    triggerToast?.("HR Dashboard data refreshed");
  };

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

  const rawStaffList = React.useMemo(() => {
    return Array.isArray(liveStats?.staffList) ? liveStats.staffList : (Array.isArray(initialStats?.staffList) ? initialStats.staffList : []);
  }, [liveStats?.staffList, initialStats?.staffList]);

  const activeStaffList = React.useMemo(() => {
    return rawStaffList.filter((s: any) => {
      const st = String(s.status || "").toLowerCase();
      if (["inactive", "archived", "terminated", "disabled"].includes(st)) return false;
      if (selectedCompanyId) {
        const cNames = parseCompanyNames(s.companies || s.company);
        const target = companies.find(c => String(c.id) === String(selectedCompanyId));
        if (cNames.length && !cNames.some((n: string) => [selectedCompanyId, target?.name].filter(Boolean).some(t => n.toLowerCase() === String(t).toLowerCase()))) {
          return false;
        }
      }
      if (selectedDept) {
        const deptStr = String(s.department?.name || s.department || s.employeeProfile?.department || "").toLowerCase();
        if (!deptStr.includes(selectedDept.toLowerCase())) return false;
      }
      return true;
    });
  }, [rawStaffList, selectedCompanyId, selectedDept, companies]);

  const attendanceCounts = React.useMemo(() => {
    const present = activeStaffList.filter((s: any) => s.isPresent || s.attendanceStatus === "Present" || Boolean(s.sodTime)).length;
    const leave = activeStaffList.filter((s: any) => s.isOnLeave || s.attendanceStatus === "On Leave").length;
    const absent = activeStaffList.filter((s: any) => !s.isPresent && !s.isOnLeave && s.attendanceStatus !== "On Leave" && s.attendanceStatus !== "Present" && !s.sodTime).length;
    const sodFiled = activeStaffList.filter((s: any) => Boolean(s.sodTime)).length;
    const total = activeStaffList.length;

    const compliance = liveStats?.todayCompliance || initialStats?.todayCompliance;
    const isFiltered = Boolean(selectedCompanyId || selectedDept);

    return {
      present: isFiltered ? present : (compliance?.attendance ?? present),
      absent: isFiltered ? absent : (compliance?.absent ?? absent),
      leave: isFiltered ? leave : (compliance?.leaves ?? leave),
      sodFiled: isFiltered ? sodFiled : (compliance?.sod ?? sodFiled),
      total: isFiltered ? total : (total || Number(liveStats?.roles?.employees || initialStats?.roles?.employees || 0))
    };
  }, [activeStaffList, liveStats, initialStats, selectedCompanyId, selectedDept]);

  const filteredAttendanceStaffList = React.useMemo(() => {
    return activeStaffList.filter((member: any) => {
      const isPresent = member.isPresent || member.attendanceStatus === "Present" || Boolean(member.sodTime);
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
  }, [activeStaffList, attendanceFilter, attendanceSearchQuery]);

  const hrStatsData = liveStats?.hrStats || initialStats?.hrStats || {};

  const dynamicTotalLeadsCount = Number(hrStatsData.hrLeadsCount ?? (candidatesList.length || (liveStats?.candidates?.total ?? 0)));
  const dynamicSelectedCount = Number(hrStatsData.selectedLeadsCount ?? (candidatesList.filter((c: any) => c.status === "Selected" || c.status === "Hired").length || (liveStats?.candidates?.selected ?? 0)));
  const dynamicPendingLeadsCount = Number(hrStatsData.pendingLeadsCount ?? (candidatesList.filter((c: any) => c.status === "Pending" || !c.status).length || (liveStats?.candidates?.pending ?? 0)));

  const todayStr = indiaDateKey(new Date());
  const dynamicInterviewsToday = Number(
    hrStatsData.interviewsToday ??
    interviewsList.filter((iv: any) => iv.scheduleTime && indiaDateKey(iv.scheduleTime) === todayStr).length
  );

  const pendingLeavesCount = liveLeaves.length > 0
    ? liveLeaves.filter((l: any) => String(l.status || "").toLowerCase() === "pending").length
    : Number(liveStats?.pendingApprovals?.pendingLeaves ?? initialStats?.pendingApprovals?.pendingLeaves ?? 0);

  const pendingWarningsCount = Number(liveStats?.operations?.disciplinaryWarnings?.pendingApprovals ?? initialStats?.operations?.disciplinaryWarnings?.pendingApprovals ?? 0);
  const totalPendingApprovals = pendingLeavesCount + pendingWarningsCount;
  const verificationPendingCount = Number(hrStatsData.verificationPending ?? (initialStats?.hrStats?.verificationPending || 0));

  const chartData = React.useMemo(() => {
    if (hrStatsData?.pipelineTrend && hrStatsData.pipelineTrend.length > 0) {
      const hasData = hrStatsData.pipelineTrend.some((d: any) => d["Total Leads"] > 0);
      if (hasData) return hrStatsData.pipelineTrend;
    }

    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const counts = days.reduce((acc, day) => {
      acc[day] = { selected: 0, applied: 0 };
      return acc;
    }, {} as Record<string, { selected: number; applied: number }>);

    (candidatesList || []).forEach((c: any) => {
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
  }, [hrStatsData, candidatesList]);

  const exportHrReport = () => {
    window.location.href = "/api/dashboard/export-hr-report";
  };

  const dateLabel = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "2-digit",
    month: "short",
    year: "numeric"
  });

  const attendanceRate = attendanceCounts.total
    ? Math.round((attendanceCounts.present / attendanceCounts.total) * 100)
    : 0;

  const hrActionItems = [
    {
      id: "leaves",
      label: "Leave & Attendance Approvals",
      count: pendingLeavesCount,
      detail: `${pendingLeavesCount} employee request${pendingLeavesCount === 1 ? "" : "s"} waiting`,
      priority: "High",
      badgeColor: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300",
      actionText: "Review",
      tab: "ess-leaves"
    },
    {
      id: "verification",
      label: "Candidate Document Verification",
      count: verificationPendingCount,
      detail: `${verificationPendingCount} profile${verificationPendingCount === 1 ? "" : "s"} pending KYC`,
      priority: verificationPendingCount > 0 ? "High" : "Clear",
      badgeColor: verificationPendingCount > 0 ? "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300" : "bg-emerald-50 text-emerald-700 border-emerald-200",
      actionText: "Verify",
      tab: "verification"
    },
    {
      id: "interviews",
      label: "Interviews Scheduled Today",
      count: dynamicInterviewsToday,
      detail: `${dynamicInterviewsToday} candidate session${dynamicInterviewsToday === 1 ? "" : "s"} queued`,
      priority: dynamicInterviewsToday > 0 ? "Medium" : "Clear",
      badgeColor: dynamicInterviewsToday > 0 ? "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/50 dark:text-sky-300" : "bg-emerald-50 text-emerald-700 border-emerald-200",
      actionText: "View Queue",
      tab: "interviews"
    },
    {
      id: "disciplinary",
      label: "Disciplinary & Warning Reviews",
      count: pendingWarningsCount,
      detail: `${pendingWarningsCount} escalation${pendingWarningsCount === 1 ? "" : "s"} pending HR decision`,
      priority: pendingWarningsCount > 0 ? "High" : "Clear",
      badgeColor: pendingWarningsCount > 0 ? "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300" : "bg-emerald-50 text-emerald-700 border-emerald-200",
      actionText: "Take Action",
      tab: "disciplinary-warnings"
    },
    {
      id: "missing-sod",
      label: "Staff Missing SOD Check-in",
      count: Math.max(0, attendanceCounts.total - attendanceCounts.sodFiled - attendanceCounts.leave),
      detail: `${Math.max(0, attendanceCounts.total - attendanceCounts.sodFiled - attendanceCounts.leave)} staff yet to submit SOD`,
      priority: Math.max(0, attendanceCounts.total - attendanceCounts.sodFiled - attendanceCounts.leave) > 0 ? "Medium" : "Clear",
      badgeColor: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/50 dark:text-purple-300",
      actionText: "View Roster",
      onClick: () => { setAttendanceFilter("absent"); setShowAttendanceModal(true); }
    }
  ].filter(item => item.count > 0);

  const hrModules = [
    { label: "Employees Directory", count: attendanceCounts.total, detail: "Full staff roster & KYC", icon: Users, tab: "employees", color: "text-indigo-600 bg-indigo-50 dark:bg-indigo-950/50" },
    { label: "Candidates & Leads", count: dynamicTotalLeadsCount, detail: `${dynamicSelectedCount} selected · ${dynamicPendingLeadsCount} pending`, icon: Megaphone, tab: "business-leads", color: "text-pink-600 bg-pink-50 dark:bg-pink-950/50" },
    { label: "Interviews Queue", count: interviewsList.length || (initialStats?.interviews?.pending || 0), detail: `${dynamicInterviewsToday} scheduled today`, icon: CalendarClock, tab: "interviews", color: "text-sky-600 bg-sky-50 dark:bg-sky-950/50" },
    { label: "Leave Management", count: pendingLeavesCount, detail: `${pendingLeavesCount} pending approval`, icon: CalendarDays, tab: "ess-leaves", color: "text-amber-600 bg-amber-50 dark:bg-amber-950/50" },
    { label: "Work & Performance", count: `${attendanceCounts.present}/${attendanceCounts.total}`, detail: `${attendanceRate}% present today`, icon: UserRoundCheck, tab: "performance", color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50" },
    { label: "Asset Allocation", count: operationsCounts.inventory || (liveStats?.inventory?.total || 0), detail: "Devices & office assets", icon: Package, tab: "inventory-management", color: "text-cyan-600 bg-cyan-50 dark:bg-cyan-950/50" },
    { label: "Vehicle Registry", count: operationsCounts.vehicles || (liveStats?.vehicles?.total || 0), detail: "Assigned & tracked vehicles", icon: Car, tab: "vehicle-registry", color: "text-violet-600 bg-violet-50 dark:bg-violet-950/50" },
    { label: "Disciplinary & Grievances", count: liveStats?.operations?.disciplinaryWarnings?.total || initialStats?.operations?.disciplinaryWarnings?.total || 0, detail: `${pendingWarningsCount} warnings pending`, icon: ShieldAlert, tab: "disciplinary-warnings", color: "text-rose-600 bg-rose-50 dark:bg-rose-950/50" }
  ];

  return (
    <div className="space-y-5 animate-fade-in text-slate-800 dark:text-slate-100 font-semibold [&_.font-medium]:font-bold">
      {/* Top Header & Operational Controls */}
      <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-gradient-to-r from-white via-[#fcfbf9] to-[#f6f3f0] dark:from-gray-900 dark:via-gray-900 dark:to-gray-950 px-5 py-4 shadow-[0_4px_18px_rgba(0,0,0,0.03)]">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-400">
                HR & Workforce Operations Hub
              </span>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                Live Pulse
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight mt-0.5">
              HR Operations Dashboard
            </h1>
            <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mt-0.5">
              {dateLabel} · Welcome, {sessionUser?.name?.split(" ")[0] || "HR Manager"}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Today vs Monthly Scope */}
            <div className="h-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-gray-800 p-0.5 flex items-center shadow-xs">
              <button
                onClick={() => setScopeRange("today")}
                className={`h-7 rounded-lg px-3 text-[10px] font-black transition-colors ${scopeRange === "today" ? "bg-indigo-600 text-white shadow-xs" : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-gray-700"}`}
              >
                Today's Ops
              </button>
              <button
                onClick={() => setScopeRange("all")}
                className={`h-7 rounded-lg px-3 text-[10px] font-black transition-colors ${scopeRange === "all" ? "bg-indigo-600 text-white shadow-xs" : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-gray-700"}`}
              >
                Monthly View
              </button>
            </div>

            {/* Company Filter */}
            {companies && companies.length > 0 && (
              <select
                value={selectedCompanyId || ""}
                onChange={e => onCompanyChange?.(e.target.value)}
                className="h-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-gray-800 text-slate-800 dark:text-slate-200 px-3 text-[10px] font-bold shadow-xs outline-none"
              >
                <option value="">All Companies</option>
                {companies.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            )}

            {/* Department Filter */}
            {departments && departments.length > 0 && (
              <select
                value={selectedDept}
                onChange={e => setSelectedDept(e.target.value)}
                className="h-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-gray-800 text-slate-800 dark:text-slate-200 px-3 text-[10px] font-bold shadow-xs outline-none"
              >
                <option value="">All Departments</option>
                {departments.map(d => (
                  <option key={d.id} value={d.name}>{d.name}</option>
                ))}
              </select>
            )}

            {/* Live Refresh Button */}
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="h-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-gray-800 hover:bg-slate-50 dark:hover:bg-gray-700 text-slate-700 dark:text-slate-200 px-3 text-[10px] font-black flex items-center gap-1.5 shadow-xs transition-colors disabled:opacity-60"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-indigo-600" : ""}`} /> Refresh
            </button>

            {/* Export & New Hire Actions */}
            <button
              onClick={exportHrReport}
              className="h-9 px-3.5 bg-slate-800 hover:bg-slate-900 dark:bg-gray-800 dark:hover:bg-gray-700 text-white rounded-xl text-[10px] font-bold transition-colors shadow-xs flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" /> Export Report
            </button>

            <button
              onClick={() => setShowHiringModal(true)}
              className="h-9 px-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-black transition-colors shadow-xs flex items-center gap-1.5"
            >
              <UserPlus className="w-3.5 h-3.5" /> + New Hire
            </button>
          </div>
        </div>
      </div>

      {/* Top 6 KPI Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {/* Attendance Card */}
        <button
          onClick={() => { setAttendanceFilter("all"); setShowAttendanceModal(true); }}
          className="text-left rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-gray-900 p-4 shadow-xs hover:-translate-y-0.5 hover:shadow-md transition-all group"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-100 dark:border-emerald-900 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <UserCheck className="w-4.5 h-4.5" />
            </div>
            <ArrowUpRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-emerald-600 transition-colors" />
          </div>
          <div className="mt-3 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Workforce Attendance
          </div>
          <div className="mt-0.5 text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            {attendanceCounts.present}/{attendanceCounts.total}
          </div>
          <div className="mt-1 text-[9px] font-bold text-emerald-600 dark:text-emerald-400">
            {attendanceRate}% present · {attendanceCounts.sodFiled} SOD filed
          </div>
        </button>

        {/* Approvals Card */}
        <button
          onClick={() => onNavigateTab("ess-leaves")}
          className="text-left rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-gray-900 p-4 shadow-xs hover:-translate-y-0.5 hover:shadow-md transition-all group"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-100 dark:border-amber-900 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <FileCheck2 className="w-4.5 h-4.5" />
            </div>
            <ArrowUpRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-amber-600 transition-colors" />
          </div>
          <div className="mt-3 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Pending Approvals
          </div>
          <div className="mt-0.5 text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            {totalPendingApprovals}
          </div>
          <div className={`mt-1 text-[9px] font-bold ${totalPendingApprovals > 0 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"}`}>
            {totalPendingApprovals > 0 ? `${pendingLeavesCount} leaves · Action required` : "All approvals clear"}
          </div>
        </button>

        {/* Interviews Today Card */}
        <button
          onClick={() => onNavigateTab("interviews")}
          className="text-left rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-gray-900 p-4 shadow-xs hover:-translate-y-0.5 hover:shadow-md transition-all group"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="w-9 h-9 rounded-xl bg-sky-50 dark:bg-sky-950/60 border border-sky-100 dark:border-sky-900 flex items-center justify-center text-sky-600 dark:text-sky-400">
              <CalendarClock className="w-4.5 h-4.5" />
            </div>
            <ArrowUpRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-sky-600 transition-colors" />
          </div>
          <div className="mt-3 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Today's Interviews
          </div>
          <div className="mt-0.5 text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            {dynamicInterviewsToday}
          </div>
          <div className="mt-1 text-[9px] font-bold text-sky-600 dark:text-sky-400">
            {interviewsList.length} total scheduled
          </div>
        </button>

        {/* Candidate Leads Card */}
        <button
          onClick={() => onNavigateTab("business-leads", "All")}
          className="text-left rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-gray-900 p-4 shadow-xs hover:-translate-y-0.5 hover:shadow-md transition-all group"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <Users className="w-4.5 h-4.5" />
            </div>
            <ArrowUpRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-indigo-600 transition-colors" />
          </div>
          <div className="mt-3 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Candidate Pipeline
          </div>
          <div className="mt-0.5 text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            {dynamicTotalLeadsCount}
          </div>
          <div className="mt-1 text-[9px] font-bold text-indigo-600 dark:text-indigo-400">
            {dynamicSelectedCount} selected · {dynamicPendingLeadsCount} review
          </div>
        </button>

        {/* Verification Pending Card */}
        <button
          onClick={() => onNavigateTab("verification")}
          className="text-left rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-gray-900 p-4 shadow-xs hover:-translate-y-0.5 hover:shadow-md transition-all group"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-100 dark:border-rose-900 flex items-center justify-center text-rose-600 dark:text-rose-400">
              <FileSearch className="w-4.5 h-4.5" />
            </div>
            <ArrowUpRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-rose-600 transition-colors" />
          </div>
          <div className="mt-3 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            KYC Verification
          </div>
          <div className="mt-0.5 text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            {verificationPendingCount}
          </div>
          <div className={`mt-1 text-[9px] font-bold ${verificationPendingCount > 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"}`}>
            {verificationPendingCount > 0 ? "Requires document check" : "All verified"}
          </div>
        </button>

        {/* Disciplinary & Warnings Card */}
        <button
          onClick={() => onNavigateTab("disciplinary-warnings")}
          className="text-left rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-gray-900 p-4 shadow-xs hover:-translate-y-0.5 hover:shadow-md transition-all group"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/60 border border-purple-100 dark:border-purple-900 flex items-center justify-center text-purple-600 dark:text-purple-400">
              <ShieldAlert className="w-4.5 h-4.5" />
            </div>
            <ArrowUpRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-purple-600 transition-colors" />
          </div>
          <div className="mt-3 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            HR Compliance
          </div>
          <div className="mt-0.5 text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            {pendingWarningsCount}
          </div>
          <div className={`mt-1 text-[9px] font-bold ${pendingWarningsCount > 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"}`}>
            {pendingWarningsCount > 0 ? `${pendingWarningsCount} warnings pending` : "No pending warnings"}
          </div>
        </button>
      </div>

      {/* Action Centre & Live Workforce Hub (Split 1.15fr : 0.85fr) */}
      <div className="grid grid-cols-1 xl:grid-cols-[1.15fr_0.85fr] gap-4">
        {/* Left: HR Operations Action Centre */}
        <section className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-gray-900 shadow-xs overflow-hidden flex flex-col justify-between">
          <div>
            <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white">
                    HR Daily Action Centre
                  </h2>
                  <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500">
                    Prioritized tasks & approvals waiting for HR action
                  </p>
                </div>
              </div>
              <button
                onClick={() => onNavigateTab("ess-leaves")}
                className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
              >
                View all queues <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {hrActionItems.length > 0 ? (
                hrActionItems.map(item => (
                  <div key={item.id} className="px-5 py-3 grid grid-cols-[1fr_auto_auto] items-center gap-3 hover:bg-slate-50/70 dark:hover:bg-gray-800/40 transition-colors">
                    <div className="min-w-0">
                      <div className="text-[11px] font-black text-slate-800 dark:text-slate-200 truncate">
                        {item.label}
                      </div>
                      <div className="text-[9px] font-semibold text-slate-400 dark:text-slate-500 truncate">
                        {item.detail}
                      </div>
                    </div>
                    <span className={`text-[9px] font-black rounded-full px-2.5 py-0.5 border ${item.badgeColor}`}>
                      {item.count} · {item.priority}
                    </span>
                    <button
                      onClick={() => item.onClick ? item.onClick() : onNavigateTab(item.tab)}
                      className="rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 text-[9px] font-black shadow-xs transition-colors"
                    >
                      {item.actionText}
                    </button>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center">
                  <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto" />
                  <div className="text-xs font-black text-slate-700 dark:text-slate-300 mt-2">
                    All HR Operational Queues are Clear!
                  </div>
                  <p className="text-[10px] font-medium text-slate-400 mt-0.5">
                    No pending leaves, verifications, or warnings require immediate attention.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="px-5 py-2.5 bg-slate-50/50 dark:bg-gray-850 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[9px] font-bold text-slate-400">
            <span>{hrActionItems.length} active queue items</span>
            <button onClick={() => onNavigateTab("performance")} className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
              Open SOD / EOD Performance Tracking →
            </button>
          </div>
        </section>

        {/* Right: Live Workforce Status & Compliance Pulse */}
        <section className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-gray-900 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <UserRoundCheck className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white">
                    Today's Workforce Pulse
                  </h2>
                  <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500">
                    Live check-in, leave & SOD compliance
                  </p>
                </div>
              </div>
              <button
                onClick={() => { setAttendanceFilter("all"); setAttendanceSearchQuery(""); setShowAttendanceModal(true); }}
                className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
              >
                View Roster <ArrowUpRight className="w-3 h-3" />
              </button>
            </div>

            {/* Attendance 4-Box Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <button
                onClick={() => { setAttendanceFilter("present"); setShowAttendanceModal(true); }}
                className="p-3 rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/40 dark:bg-emerald-950/20 text-left hover:bg-emerald-100/50 transition-all group"
              >
                <div className="flex items-center justify-between text-[10px] font-bold text-emerald-800 dark:text-emerald-300 uppercase">
                  <span>Present</span>
                  <CheckCircle className="w-3 h-3 text-emerald-600" />
                </div>
                <div className="text-xl font-black text-emerald-700 dark:text-emerald-400 mt-1">
                  {attendanceCounts.present}
                </div>
                <div className="text-[8px] font-semibold text-emerald-600 mt-0.5">
                  {attendanceRate}% rate
                </div>
              </button>

              <button
                onClick={() => { setAttendanceFilter("absent"); setShowAttendanceModal(true); }}
                className="p-3 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/40 dark:bg-rose-950/20 text-left hover:bg-rose-100/50 transition-all group"
              >
                <div className="flex items-center justify-between text-[10px] font-bold text-rose-800 dark:text-rose-300 uppercase">
                  <span>Absent</span>
                  <UserMinus className="w-3 h-3 text-rose-600" />
                </div>
                <div className="text-xl font-black text-rose-700 dark:text-rose-400 mt-1">
                  {attendanceCounts.absent}
                </div>
                <div className="text-[8px] font-semibold text-rose-600 mt-0.5">
                  Not checked in
                </div>
              </button>

              <button
                onClick={() => { setAttendanceFilter("leave"); setShowAttendanceModal(true); }}
                className="p-3 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/40 dark:bg-amber-950/20 text-left hover:bg-amber-100/50 transition-all group"
              >
                <div className="flex items-center justify-between text-[10px] font-bold text-amber-800 dark:text-amber-300 uppercase">
                  <span>On Leave</span>
                  <CalendarClock className="w-3 h-3 text-amber-600" />
                </div>
                <div className="text-xl font-black text-amber-700 dark:text-amber-400 mt-1">
                  {attendanceCounts.leave}
                </div>
                <div className="text-[8px] font-semibold text-amber-600 mt-0.5">
                  Approved leaves
                </div>
              </button>

              <button
                onClick={() => { setAttendanceFilter("all"); setShowAttendanceModal(true); }}
                className="p-3 rounded-xl border border-sky-200 dark:border-sky-900/60 bg-sky-50/40 dark:bg-sky-950/20 text-left hover:bg-sky-100/50 transition-all group"
              >
                <div className="flex items-center justify-between text-[10px] font-bold text-sky-800 dark:text-sky-300 uppercase">
                  <span>SOD Filed</span>
                  <CalendarCheck className="w-3 h-3 text-sky-600" />
                </div>
                <div className="text-xl font-black text-sky-700 dark:text-sky-400 mt-1">
                  {attendanceCounts.sodFiled}
                </div>
                <div className="text-[8px] font-semibold text-sky-600 mt-0.5">
                  Submitted today
                </div>
              </button>
            </div>

            {/* Attendance Progress Bar */}
            <div className="mt-4 p-3 rounded-xl bg-slate-50 dark:bg-gray-800/60 border border-slate-100 dark:border-slate-800">
              <div className="flex justify-between items-center text-[10px] font-bold mb-1.5">
                <span className="text-slate-600 dark:text-slate-300">Overall Attendance Health</span>
                <span className="text-indigo-600 dark:text-indigo-400">{attendanceCounts.present} of {attendanceCounts.total} active staff</span>
              </div>
              <div className="h-2 rounded-full bg-slate-200 dark:bg-gray-700 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-indigo-600 transition-all"
                  style={{ width: `${attendanceRate}%` }}
                />
              </div>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between">
            <button
              onClick={() => onNavigateTab("live-tracking")}
              className="text-[10px] font-bold text-slate-500 hover:text-indigo-600 dark:text-slate-400 flex items-center gap-1"
            >
              Open Live Field Staff Map <ArrowUpRight className="w-3 h-3" />
            </button>
            <button
              onClick={() => { setAttendanceFilter("all"); setShowAttendanceModal(true); }}
              className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              Search Staff ({attendanceCounts.total}) →
            </button>
          </div>
        </section>
      </div>

      {/* HR Modules Quick Navigation Grid */}
      <section className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-gray-900 p-5 shadow-xs">
        <div className="flex items-center justify-between mb-3.5">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <FolderKanban className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white">
                HR Core Modules & Workspaces
              </h2>
              <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500">
                Direct access to daily employee & administrative workflows
              </p>
            </div>
          </div>
          <span className="text-[10px] font-bold text-slate-400">8 Modules Active</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-2.5">
          {hrModules.map(mod => (
            <button
              key={mod.label}
              onClick={() => onNavigateTab(mod.tab)}
              className="group rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/40 dark:bg-gray-800/40 p-3 text-left hover:border-indigo-500 hover:bg-white dark:hover:bg-gray-800 hover:shadow-xs transition-all flex flex-col justify-between min-h-[110px]"
            >
              <div className="flex justify-between items-start">
                <span className={`w-8 h-8 rounded-lg flex items-center justify-center ${mod.color}`}>
                  <mod.icon className="w-4 h-4" />
                </span>
                <ArrowUpRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-indigo-600 transition-colors" />
              </div>
              <div className="mt-2">
                <div className="text-lg font-black text-slate-900 dark:text-white leading-tight">
                  {mod.count}
                </div>
                <div className="text-[10px] font-black text-slate-700 dark:text-slate-200 leading-tight mt-0.5 truncate">
                  {mod.label}
                </div>
                <div className="text-[8px] font-semibold text-slate-400 dark:text-slate-500 truncate mt-0.5">
                  {mod.detail}
                </div>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Analytics & Activity Split Grid (1.15fr : 0.85fr) */}
      <div className="grid grid-cols-1 xl:grid-cols-[1.15fr_0.85fr] gap-4">
        {/* Left: Hiring & Leads Pipeline Trends */}
        <section className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-gray-900 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-pink-50 dark:bg-pink-950/60 text-pink-600 dark:text-pink-400 flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white">
                  Recruitment & Lead Trends
                </h2>
                <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500">
                  Applications received vs candidates selected for joining
                </p>
              </div>
            </div>
            <button
              onClick={() => onNavigateTab("business-leads")}
              className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
            >
              Open Pipeline <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          <div className="mb-3 flex items-center gap-3">
            <div className="px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-900 text-indigo-700 dark:text-indigo-300 text-[10px] font-black">
              Total Candidates: {dynamicTotalLeadsCount}
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-100 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300 text-[10px] font-black">
              Selected: {dynamicSelectedCount}
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/50 border border-amber-100 dark:border-amber-900 text-amber-700 dark:text-amber-300 text-[10px] font-black">
              In Review: {dynamicPendingLeadsCount}
            </div>
          </div>

          <AttendanceChart dark={isDark} data={chartData} />
        </section>

        {/* Right: Recent HR Activity Feed */}
        <section className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-gray-900 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <Activity className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white">
                    Recent HR & System Activity
                  </h2>
                  <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500">
                    Latest check-ins, approvals & recruiter actions
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAllActivities(true)}
                className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
              >
                View all ({liveStats?.hrActivities?.length || initialStats?.hrActivities?.length || 0}) <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            <ActivityFeed dark={isDark} logs={(liveStats?.hrActivities || initialStats?.hrActivities || []).slice(0, 7)} />
          </div>

          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[9px] font-bold text-slate-400">
            <span>Real-time enterprise audit log</span>
            <button onClick={() => onNavigateTab("audit-trail")} className="text-indigo-600 dark:text-indigo-400 hover:underline">
              System Audit Trail →
            </button>
          </div>
        </section>
      </div>

      {/* All Activities Modal */}
      {showAllActivities && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in" onClick={() => setShowAllActivities(false)}>
          <div className={`relative w-full max-w-2xl max-h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-slideUp ${isDark ? "bg-gray-900 border border-gray-700 text-white" : "bg-white border border-slate-200 text-slate-800"}`} onClick={e => e.stopPropagation()}>
            <div className={`flex items-center justify-between px-6 py-4 border-b ${isDark ? "border-gray-800 bg-gray-900" : "border-slate-100 bg-slate-50/50"}`}>
              <div>
                <h2 className="text-base font-black">All HR Activities & Logs</h2>
                <p className="text-[10px] font-bold text-slate-400 mt-0.5">
                  {(liveStats?.hrActivities || initialStats?.hrActivities || []).length} total events recorded
                </p>
              </div>
              <button
                onClick={() => setShowAllActivities(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3 custom-scrollbar">
              {(liveStats?.hrActivities || initialStats?.hrActivities || []).length === 0 ? (
                <p className="text-xs text-center py-8 text-slate-400">No activities found.</p>
              ) : (
                (liveStats?.hrActivities || initialStats?.hrActivities || []).map((log: any, idx: number) => {
                  const actionLabel = log.title || (log.action ? log.action.replace(/_/g, " ") : "Activity");
                  const actionUpper = (log.action || "").toUpperCase();
                  let badgeColor = "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300";
                  if (actionUpper.includes("CREATE") || actionUpper.includes("ADD") || actionUpper.includes("SOD")) badgeColor = "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300";
                  else if (actionUpper.includes("APPROVE") || actionUpper.includes("SELECT")) badgeColor = "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300";
                  else if (actionUpper.includes("REJECT") || actionUpper.includes("DELETE")) badgeColor = "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300";
                  else if (actionUpper.includes("INTERVIEW") || actionUpper.includes("SCHEDULE")) badgeColor = "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300";
                  else if (actionUpper.includes("UPDATE") || actionUpper.includes("EDIT")) badgeColor = "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300";

                  return (
                    <div key={log.id || idx} className={`rounded-xl border p-3.5 transition-all ${isDark ? "bg-gray-800/60 border-gray-700" : "bg-slate-50/80 border-slate-100"}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1.5">
                            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${badgeColor}`}>
                              {actionLabel}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {log.timestamp ? new Date(log.timestamp).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : ""}
                            </span>
                          </div>
                          <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-200">
                            {log.description || log.details || "No details available."}
                          </p>
                        </div>
                      </div>
                      <div className="mt-2.5 pt-2 border-t border-slate-200/60 dark:border-gray-700 flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-950 flex items-center justify-center">
                          <span className="text-[8px] font-black text-indigo-700 dark:text-indigo-300">
                            {(log.actor || log.user?.name || "S").charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                          {log.actor || log.user?.name || "System"}
                        </span>
                        {log.actorRole && (
                          <span className="text-[9px] text-slate-400">
                            • {log.actorRole}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className={`px-6 py-3 border-t ${isDark ? "border-gray-800 bg-gray-900" : "border-slate-100 bg-slate-50"}`}>
              <button
                onClick={() => setShowAllActivities(false)}
                className="w-full py-2 bg-slate-800 hover:bg-slate-900 dark:bg-gray-800 dark:hover:bg-gray-700 text-white rounded-xl text-xs font-bold transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Hiring Modal */}
      {showHiringModal && (
        <HiringRequisitionModal
          onClose={() => setShowHiringModal(false)}
          triggerToast={(msg) => triggerToast ? triggerToast(msg) : alert(msg)}
        />
      )}

      {/* Attendance Staff Roster Modal */}
      {showAttendanceModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex justify-center items-center backdrop-blur-xs p-4 sm:p-6 animate-fade-in" onClick={() => setShowAttendanceModal(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800 animate-slideUp" onClick={e => e.stopPropagation()}>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-gray-900/50 gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-black text-slate-900 dark:text-white">
                    Today's Attendance Roster
                  </h2>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                    attendanceFilter === "present" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" :
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
                <p className="text-[10px] font-bold text-slate-400 mt-0.5">
                  Real-time status of mapped active employees
                </p>
              </div>
              <button onClick={() => setShowAttendanceModal(false)} className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors rounded-lg hover:bg-slate-100 dark:hover:bg-gray-800">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Filter Tabs & Search Bar */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-gray-900">
              <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-gray-800 rounded-xl w-full sm:w-auto overflow-x-auto">
                <button
                  onClick={() => setAttendanceFilter("all")}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${attendanceFilter === "all" ? "bg-white dark:bg-gray-900 text-slate-800 dark:text-white shadow-xs" : "text-slate-500 hover:text-slate-800 dark:text-slate-400"}`}
                >
                  All ({attendanceCounts.total})
                </button>
                <button
                  onClick={() => setAttendanceFilter("present")}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${attendanceFilter === "present" ? "bg-emerald-500 text-white shadow-xs" : "text-slate-500 hover:text-slate-800 dark:text-slate-400"}`}
                >
                  Present ({attendanceCounts.present})
                </button>
                <button
                  onClick={() => setAttendanceFilter("absent")}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${attendanceFilter === "absent" ? "bg-rose-500 text-white shadow-xs" : "text-slate-500 hover:text-slate-800 dark:text-slate-400"}`}
                >
                  Absent ({attendanceCounts.absent})
                </button>
                <button
                  onClick={() => setAttendanceFilter("leave")}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${attendanceFilter === "leave" ? "bg-amber-500 text-white shadow-xs" : "text-slate-500 hover:text-slate-800 dark:text-slate-400"}`}
                >
                  On Leave ({attendanceCounts.leave})
                </button>
              </div>

              <div className="relative w-full sm:w-72">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search by name, role, dept, company..."
                  value={attendanceSearchQuery}
                  onChange={e => setAttendanceSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3.5 py-1.5 text-xs bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-800 dark:text-white"
                />
              </div>
            </div>

            {/* Staff Table */}
            <div className="flex-1 overflow-auto p-0 custom-scrollbar">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50/90 dark:bg-gray-800/90 sticky top-0 z-10 backdrop-blur-xs">
                  <tr>
                    <th className="px-6 py-3 text-[9px] uppercase tracking-widest text-slate-500 dark:text-slate-400 font-black border-b border-slate-100 dark:border-slate-800">Employee</th>
                    <th className="px-6 py-3 text-[9px] uppercase tracking-widest text-slate-500 dark:text-slate-400 font-black border-b border-slate-100 dark:border-slate-800">Role & Department</th>
                    <th className="px-6 py-3 text-[9px] uppercase tracking-widest text-slate-500 dark:text-slate-400 font-black border-b border-slate-100 dark:border-slate-800">Attendance Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredAttendanceStaffList.length > 0 ? (
                    filteredAttendanceStaffList.map((staff: any) => {
                      const isPresent = staff.isPresent || staff.attendanceStatus === "Present" || Boolean(staff.sodTime);
                      const isOnLeave = staff.isOnLeave || staff.attendanceStatus === "On Leave";
                      return (
                        <tr key={staff.id} className="hover:bg-slate-50/80 dark:hover:bg-gray-800/50 transition-colors">
                          <td className="px-6 py-3.5">
                            <div className="font-black text-xs text-slate-900 dark:text-slate-100">{staff.name}</div>
                            <div className="text-[10px] text-slate-400 dark:text-slate-500">{staff.email}</div>
                          </td>
                          <td className="px-6 py-3.5">
                            <div className="text-xs font-bold text-slate-800 dark:text-slate-200">{staff.role}</div>
                            <div className="text-[9px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mt-0.5">
                              {formatCleanDepartment(staff.department, staff.role, staff.designation)}
                            </div>
                          </td>
                          <td className="px-6 py-3.5">
                            {isOnLeave ? (
                              <div>
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                                  <CalendarClock className="w-3 h-3" /> On Leave
                                </span>
                                {staff.leaveReason && (
                                  <div className="text-[9px] text-slate-400 dark:text-slate-500 mt-1 italic">
                                    "{staff.leaveReason}"
                                  </div>
                                )}
                              </div>
                            ) : isPresent ? (
                              <div>
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                  <CheckCircle className="w-3 h-3" /> Present Today
                                </span>
                                {staff.sodTime && (
                                  <div className="text-[9px] text-slate-400 dark:text-slate-500 mt-1 font-semibold">
                                    SOD: {new Date(staff.sodTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div>
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
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
                      <td colSpan={3} className="px-6 py-12 text-center text-slate-400 font-bold text-xs">
                        No staff members match the selected filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-gray-900/50 flex items-center justify-between">
              <button
                onClick={() => { setShowAttendanceModal(false); onNavigateTab("employees"); }}
                className="text-xs font-black text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
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
    department?.name &&
    !/^\d+$/.test(String(department.name).trim()) &&
    !String(department.name).startsWith("DEPT_") &&
    list.findIndex(item => item.name === department.name) === index
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
      {/* Top Header & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl border transition-all shadow-sm bg-gradient-to-r from-white via-slate-50/50 to-white dark:from-gray-900 dark:via-gray-900/80 dark:to-gray-900 border-slate-200/80 dark:border-gray-800">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className={`text-xl sm:text-2xl font-black tracking-tight ${isDark ? "text-white" : "text-slate-900"}`}>
              Department Head Dashboard
            </h1>
            <span className="hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60">
              Manager View
            </span>
          </div>
          <p className={`text-xs sm:text-sm mt-1 font-medium ${isDark ? "text-gray-400" : "text-slate-500"}`}>
            Track team performance, daily attendance, active workload, and approvals
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {isGlobal && (
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className={`text-xs font-bold uppercase tracking-wider ${isDark ? "text-gray-400" : "text-slate-500"}`}>
                Dept:
              </span>
              <select
                value={selectedDeptId}
                onChange={(e) => onDeptChange?.(e.target.value)}
                className={`w-full sm:w-auto text-xs sm:text-sm border rounded-xl px-3.5 py-2 outline-none font-semibold transition-all shadow-xs cursor-pointer ${isDark
                  ? "bg-gray-800 border-gray-700 text-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                  : "bg-white border-slate-200 text-slate-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
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
              className={`flex-1 sm:flex-initial border px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-1.5 shadow-xs hover:scale-[1.02] active:scale-[0.98] ${isDark
                ? "border-gray-700 bg-gray-800 hover:bg-gray-750 text-gray-200"
                : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                }`}
            >
              <RotateCw className="w-3.5 h-3.5" /> Refresh
            </button>
            <button
              onClick={exportDepartmentReport}
              disabled={teamList.length === 0}
              className="flex-1 sm:flex-initial border border-emerald-200/80 bg-emerald-50/80 hover:bg-emerald-100 disabled:opacity-50 text-emerald-700 dark:bg-emerald-950/30 dark:border-emerald-800/60 dark:text-emerald-300 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-1.5 shadow-xs hover:scale-[1.02] active:scale-[0.98]"
            >
              <Download className="w-3.5 h-3.5" /> Export
            </button>
            <button
              onClick={() => setShowHiringModal(true)}
              className="flex-1 sm:flex-initial bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all shadow-sm hover:shadow flex items-center justify-center gap-1.5 shrink-0 hover:scale-[1.02] active:scale-[0.98]"
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
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className={`w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden border animate-scale-up ${isDark ? "bg-gray-900 border-gray-800 text-white" : "bg-white border-slate-200 text-slate-800"}`}>
            <div className="px-6 py-4.5 border-b border-slate-100 dark:border-gray-800 flex justify-between items-center bg-slate-50/50 dark:bg-gray-850/50">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold">Team Directory</h3>
                  <p className="text-xs text-slate-500 dark:text-gray-400">Total active team members ({filteredTeamList.length})</p>
                </div>
              </div>
              <button
                onClick={() => setShowTeamModal(false)}
                className="p-2 rounded-xl hover:bg-slate-200/60 dark:hover:bg-gray-800 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 pt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={teamSearch}
                  onChange={(event) => setTeamSearch(event.target.value)}
                  placeholder="Search employee, role, department..."
                  className={`w-full border rounded-xl pl-9 pr-3 py-2 text-xs outline-none transition-all ${isDark ? "bg-gray-800 border-gray-700 text-white focus:border-indigo-500" : "border-slate-200 focus:border-indigo-500 bg-white"}`}
                />
              </div>
              <div className="relative">
                <Filter className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <select
                  value={attendanceFilter}
                  onChange={(event) => setAttendanceFilter(event.target.value)}
                  className={`w-full border rounded-xl pl-9 pr-3 py-2 text-xs outline-none transition-all cursor-pointer ${isDark ? "bg-gray-800 border-gray-700 text-white focus:border-indigo-500" : "border-slate-200 focus:border-indigo-500 bg-white"}`}
                >
                  <option value="all">All Attendance</option>
                  <option value="present">Present</option>
                  <option value="absent">Absent</option>
                  <option value="on leave">On Leave</option>
                </select>
              </div>
            </div>
            <div className="p-6 max-h-[60vh] overflow-y-auto space-y-2.5 custom-scrollbar">
              {filteredTeamList.length === 0 ? (
                <div className="py-12 text-center text-sm text-slate-400">No team members found matching your search.</div>
              ) : (
                filteredTeamList.map((m: any) => {
                  const initials = (m.name || "U").split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase();
                  const isPresent = m.attendanceStatus === "Present";
                  const isOnLeave = m.attendanceStatus === "On Leave";

                  return (
                    <div key={m.id} className={`p-3.5 rounded-xl border flex items-center justify-between transition-all hover:border-indigo-200 dark:hover:border-indigo-800/60 ${isDark ? "bg-gray-800/40 border-gray-800" : "bg-slate-50/60 border-slate-200/70"}`}>
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shadow-xs ${isPresent ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300" : isOnLeave ? "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300" : "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300"}`}>
                            {initials}
                          </div>
                          <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 ${isDark ? "border-gray-900" : "border-white"} ${isPresent ? "bg-emerald-500" : isOnLeave ? "bg-amber-500" : "bg-rose-500"}`} />
                        </div>
                        <div>
                          <h4 className="text-xs sm:text-sm font-bold">{m.name}</h4>
                          <p className="text-[11px] text-slate-500 dark:text-gray-400 mt-0.5">
                            {m.designation || m.role} • <span className="font-semibold">{m.department}</span>
                          </p>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            Tasks: <span className="font-bold text-slate-600 dark:text-gray-300">{m.tasksCompleted || 0}/{m.tasksTotal || 0}</span>
                            {m.tasksOverdue ? <span className="text-rose-500 font-bold ml-1.5"> • {m.tasksOverdue} overdue</span> : ""}
                          </p>
                        </div>
                      </div>
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border shadow-xs ${isPresent
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
                          : isOnLeave
                            ? "bg-amber-50 text-amber-700 border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800"
                            : "bg-rose-50 text-rose-700 border-rose-200/80 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800"
                        }`}>
                        {m.attendanceStatus || "Absent"}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* 2. SOD/EOD Compliance Popup Modal */}
      {showSodEodModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className={`w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden border animate-scale-up ${isDark ? "bg-gray-900 border-gray-800 text-white" : "bg-white border-slate-200 text-slate-800"}`}>
            <div className="px-6 py-4.5 border-b border-slate-100 dark:border-gray-800 flex justify-between items-center bg-slate-50/50 dark:bg-gray-850/50">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400 flex items-center justify-center font-bold">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold">Today's Compliance Status</h3>
                  <p className="text-xs text-slate-500 dark:text-gray-400">SOD and EOD daily submissions audit</p>
                </div>
              </div>
              <button
                onClick={() => setShowSodEodModal(false)}
                className="p-2 rounded-xl hover:bg-slate-200/60 dark:hover:bg-gray-800 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-gray-800 text-[11px] font-bold uppercase tracking-wider text-slate-400">
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
                        <tr key={m.id} className="text-xs font-medium hover:bg-slate-50/50 dark:hover:bg-gray-800/30 transition-colors">
                          <td className="py-3 pl-2">
                            <div className="font-bold text-slate-800 dark:text-gray-100">{m.name}</div>
                            <div className="text-[10px] text-slate-400 mt-0.5">{m.designation || m.role}</div>
                          </td>
                          <td className="py-3">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-bold border shadow-xs ${m.sodTime ? "bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800/60" : "bg-rose-50 text-rose-700 border-rose-200/80 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-800/60"}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${m.sodTime ? "bg-emerald-500" : "bg-rose-500"}`} />
                              {m.sodTime ? sodTimeLabel : "Pending"}
                            </span>
                          </td>
                          <td className="py-3">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-bold border shadow-xs ${m.eodTime ? "bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800/60" : "bg-rose-50 text-rose-700 border-rose-200/80 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-800/60"}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${m.eodTime ? "bg-emerald-500" : "bg-rose-500"}`} />
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

      {/* Top 5 Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
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

      {/* Middle Row: 3 Widget Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Task Pipeline */}
        <button
          type="button"
          onClick={() => onNavigateTodayTasks?.()}
          className={`p-5 rounded-2xl border shadow-sm text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md group ${isDark ? "bg-gray-900 border-gray-800 hover:border-indigo-600/60" : "bg-white border-slate-200 hover:border-indigo-400/60"}`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                <Briefcase className="w-4 h-4" />
              </div>
              <h2 className={`text-sm font-bold ${isDark ? "text-white" : "text-slate-800"}`}>Today's Task Pipeline</h2>
            </div>
            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-full border border-indigo-100 dark:border-indigo-900/60">
              {taskCompletionRate}% done
            </span>
          </div>

          <div className="grid grid-cols-4 gap-2 mt-4 text-center">
            {[
              ["Completed", deptStats.completedTasks || 0, "text-emerald-600 dark:text-emerald-400", "bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-100 dark:border-emerald-900/40"],
              ["In Progress", deptStats.inProgressTasks || 0, "text-amber-600 dark:text-amber-400", "bg-amber-50/60 dark:bg-amber-950/30 border-amber-100 dark:border-amber-900/40"],
              ["Pending", deptStats.pendingTasks || 0, "text-slate-600 dark:text-slate-300", "bg-slate-50 dark:bg-gray-800 border-slate-100 dark:border-gray-700/60"],
              ["Overdue", deptStats.overdueTasks || 0, "text-rose-600 dark:text-rose-400", "bg-rose-50/60 dark:bg-rose-950/30 border-rose-100 dark:border-rose-900/40"]
            ].map(([label, value, color, bg]) => (
              <div key={String(label)} className={`rounded-xl p-2 border ${bg} transition-all`}>
                <div className={`text-base sm:text-lg font-black ${color}`}>{value}</div>
                <div className="text-[10px] font-semibold text-slate-500 dark:text-gray-400 mt-0.5 truncate">{label}</div>
              </div>
            ))}
          </div>

          <div className="mt-4">
            <div className={`h-2 rounded-full overflow-hidden ${isDark ? "bg-gray-800" : "bg-slate-100"}`}>
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-teal-400 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, taskCompletionRate)}%` }}
              />
            </div>
          </div>
        </button>

        {/* Card 2: Attendance Today */}
        <button
          type="button"
          onClick={() => setShowTeamModal(true)}
          className={`p-5 rounded-2xl border shadow-sm text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md group ${isDark ? "bg-gray-900 border-gray-800 hover:border-emerald-600/60" : "bg-white border-slate-200 hover:border-emerald-400/60"}`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                <Users className="w-4 h-4" />
              </div>
              <h2 className={`text-sm font-bold ${isDark ? "text-white" : "text-slate-800"}`}>Attendance Today</h2>
            </div>
            <span className="text-[11px] font-semibold text-slate-400 group-hover:text-emerald-600 transition-colors flex items-center gap-0.5">
              View <ChevronRight className="w-3 h-3" />
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2.5 mt-4">
            {[
              ["Present", deptStats.presentToday || 0, "bg-emerald-50/80 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/60"],
              ["On Leave", deptStats.onLeaveToday || 0, "bg-amber-50/80 text-amber-700 border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/60"],
              ["Absent", deptStats.absentToday || 0, "bg-rose-50/80 text-rose-700 border-rose-200/80 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/60"]
            ].map(([label, value, colorClass]) => (
              <div key={String(label)} className={`rounded-xl p-3 border shadow-2xs ${colorClass} transition-transform group-hover:scale-[1.02]`}>
                <div className="text-xl font-black">{value}</div>
                <div className="text-[10px] font-bold mt-0.5 opacity-90">{label}</div>
              </div>
            ))}
          </div>

          <div className="mt-3.5 flex items-center justify-between text-[11px] text-slate-400 font-medium pt-1 border-t border-slate-100 dark:border-gray-800">
            <span>Total Team Members</span>
            <span className="font-bold text-slate-700 dark:text-gray-200">{deptStats.teamMembers || 0}</span>
          </div>
        </button>

        {/* Card 3: Manager Attention */}
        <div className={`p-5 rounded-2xl border shadow-sm ${isDark ? "bg-gray-900 border-gray-800" : "bg-white border-slate-200"}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <h2 className={`text-sm font-bold ${isDark ? "text-white" : "text-slate-800"}`}>Manager Attention</h2>
            </div>
            <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-200/60 dark:border-amber-900/60">
              {(deptStats.pendingLeaves || 0) + (deptStats.pendingExpenses || 0) + (deptStats.sodPending || 0) + (deptStats.eodPending || 0)} Action items
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2.5 mt-4 text-xs">
            <button
              onClick={() => onNavigateTab("ess-leaves")}
              className={`rounded-xl border p-2.5 text-left transition-all duration-150 hover:border-indigo-300 hover:shadow-xs group ${isDark ? "border-gray-800 bg-gray-800/40 hover:bg-gray-800" : "border-slate-200/80 bg-slate-50/50 hover:bg-white"}`}
            >
              <span className="block text-lg font-black text-indigo-600 dark:text-indigo-400 group-hover:scale-105 transition-transform">{deptStats.pendingLeaves || 0}</span>
              <span className="text-[11px] font-semibold text-slate-600 dark:text-gray-300">Pending Leaves</span>
            </button>
            <button
              onClick={() => onNavigateTab("ess-expenses")}
              className={`rounded-xl border p-2.5 text-left transition-all duration-150 hover:border-indigo-300 hover:shadow-xs group ${isDark ? "border-gray-800 bg-gray-800/40 hover:bg-gray-800" : "border-slate-200/80 bg-slate-50/50 hover:bg-white"}`}
            >
              <span className="block text-lg font-black text-indigo-600 dark:text-indigo-400 group-hover:scale-105 transition-transform">{deptStats.pendingExpenses || 0}</span>
              <span className="text-[11px] font-semibold text-slate-600 dark:text-gray-300">Pending Expenses</span>
            </button>
            <button
              onClick={() => setShowSodEodModal(true)}
              className={`rounded-xl border p-2.5 text-left transition-all duration-150 hover:border-rose-300 hover:shadow-xs group ${isDark ? "border-gray-800 bg-gray-800/40 hover:bg-gray-800" : "border-slate-200/80 bg-slate-50/50 hover:bg-white"}`}
            >
              <span className="block text-lg font-black text-rose-600 dark:text-rose-400 group-hover:scale-105 transition-transform">{deptStats.sodPending || 0}</span>
              <span className="text-[11px] font-semibold text-slate-600 dark:text-gray-300">SOD Pending</span>
            </button>
            <button
              onClick={() => setShowSodEodModal(true)}
              className={`rounded-xl border p-2.5 text-left transition-all duration-150 hover:border-rose-300 hover:shadow-xs group ${isDark ? "border-gray-800 bg-gray-800/40 hover:bg-gray-800" : "border-slate-200/80 bg-slate-50/50 hover:bg-white"}`}
            >
              <span className="block text-lg font-black text-rose-600 dark:text-rose-400 group-hover:scale-105 transition-transform">{deptStats.eodPending || 0}</span>
              <span className="text-[11px] font-semibold text-slate-600 dark:text-gray-300">EOD Pending</span>
            </button>
          </div>
        </div>
      </div>

      {/* Lower Section: 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (Span 2): Workload & Trends */}
        <div className="lg:col-span-2 space-y-6">
          {/* Team Workload Card */}
          <div className={`p-5 rounded-2xl border shadow-sm ${isDark ? "bg-gray-900 border-gray-800" : "bg-white border-slate-200"}`}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className={`text-base sm:text-lg font-bold ${isDark ? "text-white" : "text-slate-800"}`}>Team Workload Today</h2>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 dark:bg-gray-800 dark:text-gray-300">
                    Top {teamWorkload.length}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">Overdue and high-workload employees prioritized</p>
              </div>
              <button
                onClick={() => setShowTeamModal(true)}
                className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 flex items-center gap-1 transition-colors"
              >
                View all team <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {teamWorkload.length === 0 ? (
              <div className="py-12 text-center text-sm text-slate-400">No team data available for this department.</div>
            ) : (
              <div className="overflow-x-auto custom-scrollbar">
                <div className="min-w-[500px] divide-y divide-slate-100 dark:divide-gray-800">
                  {teamWorkload.map((member: any) => {
                    const completion = member.tasksTotal
                      ? Math.round(((member.tasksCompleted || 0) / member.tasksTotal) * 100)
                      : 0;
                    const initials = (member.name || "U").split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase();
                    const isPresent = member.attendanceStatus === "Present";
                    const isOnLeave = member.attendanceStatus === "On Leave";

                    return (
                      <div key={member.id} className="grid grid-cols-[minmax(180px,1.4fr)_minmax(140px,1fr)_80px_90px] items-center gap-3 py-3 text-xs hover:bg-slate-50/50 dark:hover:bg-gray-850/40 rounded-xl px-2 transition-colors">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="relative shrink-0">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-[11px] ${isPresent ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300" : isOnLeave ? "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300" : "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300"}`}>
                              {initials}
                            </div>
                            <span className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border ${isDark ? "border-gray-900" : "border-white"} ${isPresent ? "bg-emerald-500" : isOnLeave ? "bg-amber-500" : "bg-rose-500"}`} />
                          </div>
                          <div className="min-w-0">
                            <div className={`font-bold truncate ${isDark ? "text-gray-100" : "text-slate-800"}`}>{member.name}</div>
                            <div className="text-[10px] text-slate-400 truncate">{member.designation || member.role || "Team member"}</div>
                          </div>
                        </div>

                        <div>
                          <div className={`h-2 rounded-full overflow-hidden ${isDark ? "bg-gray-800" : "bg-slate-100"}`}>
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${completion === 100 ? "bg-emerald-500" : completion > 50 ? "bg-indigo-500" : "bg-amber-500"}`}
                              style={{ width: `${Math.min(100, completion)}%` }}
                            />
                          </div>
                          <div className="text-[10px] text-slate-400 mt-1 flex justify-between">
                            <span>{member.tasksCompleted || 0}/{member.tasksTotal || 0} done</span>
                            <span className="font-semibold">{completion}%</span>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className={`font-bold inline-block px-2 py-0.5 rounded-md text-[11px] ${member.tasksOverdue ? "text-rose-600 bg-rose-50 dark:bg-rose-950/40 dark:text-rose-400" : "text-slate-400"}`}>
                            {member.tasksOverdue ? `${member.tasksOverdue} overdue` : "0 overdue"}
                          </span>
                        </div>

                        <div className="text-right">
                          <span className={`text-[10px] font-bold inline-block px-2.5 py-1 rounded-full border shadow-2xs ${isPresent
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
                              : isOnLeave
                                ? "bg-amber-50 text-amber-700 border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800"
                                : "bg-rose-50 text-rose-700 border-rose-200/80 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800"
                            }`}>
                            {member.attendanceStatus || "Absent"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Performance Trends Chart */}
          <div className={`p-5 rounded-2xl border shadow-sm ${isDark ? "bg-gray-900 border-gray-800" : "bg-white border-slate-200"}`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400 flex items-center justify-center font-bold">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <h2 className={`text-base sm:text-lg font-bold ${isDark ? "text-white" : "text-slate-800"}`}>Team Performance Trends</h2>
              </div>
              <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${isDark ? "bg-gray-800 border-gray-700 text-gray-400" : "bg-slate-50 border-slate-200 text-slate-500"}`}>
                SOD Compliance • Last 6 Months
              </span>
            </div>
            <PerformanceChart dark={isDark} data={deptStats.performanceTrend || []} />
          </div>
        </div>

        {/* Right Column (Span 1): Compliance & Activity Feed */}
        <div className="space-y-6">
          {/* Daily Compliance Card */}
          <div className={`p-5 rounded-2xl border shadow-sm ${isDark ? "bg-gray-900 border-gray-800" : "bg-white border-slate-200"}`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                  <Clock3 className="w-4 h-4" />
                </div>
                <h2 className={`text-sm font-bold ${isDark ? "text-white" : "text-slate-800"}`}>Daily Compliance</h2>
              </div>
              <button
                onClick={() => setShowSodEodModal(true)}
                className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 flex items-center gap-0.5"
              >
                Inspect <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            {[
              ["SOD Submitted", deptStats.sod || 0, sodComplianceRate, "from-indigo-500 to-indigo-600"],
              ["EOD Submitted", deptStats.eod || 0, eodComplianceRate, "from-teal-500 to-emerald-500"]
            ].map(([label, value, percent, gradient]) => (
              <div key={String(label)} className="mb-4 last:mb-0 p-3 rounded-xl border border-slate-100 dark:border-gray-800/80 bg-slate-50/50 dark:bg-gray-800/30">
                <div className="flex justify-between items-center text-xs mb-2">
                  <span className="font-semibold text-slate-600 dark:text-gray-300">{label}</span>
                  <span className={`font-bold px-2 py-0.5 rounded-full text-[11px] ${isDark ? "bg-gray-800 text-white" : "bg-white text-slate-700 border border-slate-200/60"}`}>
                    {value}/{deptStats.teamMembers || 0} ({percent}%)
                  </span>
                </div>
                <div className={`h-2.5 rounded-full overflow-hidden ${isDark ? "bg-gray-800" : "bg-slate-200/70"}`}>
                  <div className={`h-full rounded-full bg-gradient-to-r ${gradient} transition-all duration-500`} style={{ width: `${Math.min(100, Number(percent))}%` }} />
                </div>
              </div>
            ))}
          </div>

          {/* Team Activity Feed Card */}
          <div className={`p-5 rounded-2xl border shadow-sm ${isDark ? "bg-gray-900 border-gray-800" : "bg-white border-slate-200"}`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
                  <Activity className="w-4 h-4" />
                </div>
                <h2 className={`text-base font-bold ${isDark ? "text-white" : "text-slate-800"}`}>Team Activity</h2>
              </div>
            </div>
            <ActivityFeed dark={isDark} logs={deptStats.teamActivities || []} maxHeight="max-h-[380px]" />
          </div>
        </div>
      </div>
    </div>
  );
}
