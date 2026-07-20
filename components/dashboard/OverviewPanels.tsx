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
  CalendarClock,
  FileSearch,
  LogOut,
  TrendingUp,
  PlusCircle,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Download,
  Phone,
  X
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
  onNavigateTab: (tab: string) => void;
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
  const [showStaffModal, setShowStaffModal] = React.useState(false);
  const [staffModalFilter, setStaffModalFilter] = React.useState<"all" | "present" | "absent">("all");
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
    <div className="space-y-8 animate-fade-in text-[#1C1C1A]">

      {/* Top Action Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[9px] uppercase tracking-widest text-[#C9A84C] font-bold">Command Center</span>
          <h1 className="text-xl font-light text-[#1C1C1A] tracking-wide font-serif" style={{ fontFamily: "'Playfair Display', serif" }}>
            Enterprise Workspace
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {companies && (
            <select
              value={selectedCompanyId || ""}
              onChange={(e) => onCompanyChange?.(e.target.value)}
              className="text-[10px] uppercase tracking-wider font-semibold px-3 py-2 bg-[#FCFBF9] border border-[#E8E4DF] rounded-lg focus:outline-none focus:border-[#C9A84C] transition-colors shadow-sm text-[#1C1C1A]"
            >
              <option value="">All Companies</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          )}
          <button
            className="px-4 py-2 border border-[#E8E4DF] rounded-lg text-xs font-semibold tracking-wider uppercase bg-[#FCFBF9] hover:bg-[#F5F0EA] text-[#5D5B57] transition-all flex items-center gap-2"
            onClick={exportAttendanceReport}
          >
            <Download className="w-3.5 h-3.5" /> Export
          </button>
          <button
            className="px-4 py-2 bg-[#C9A84C] hover:bg-[#B3923E] text-white rounded-lg text-xs font-semibold tracking-wider uppercase transition-all shadow-[0_2px_15px_rgba(201,168,76,0.15)] flex items-center gap-2"
            onClick={() => triggerToast("Enterprise metrics synchronized successfully")}
          >
            <RotateCw className="w-3.5 h-3.5" /> Sync
          </button>
        </div>
      </div>

      {/* Hero Greeting Card */}
      <div className="bg-[#FCFBF9] border border-[#E8E4DF] rounded-xl p-8 shadow-[0_2px_20px_rgba(0,0,0,0.04)] relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-8">
        <div className="absolute right-0 bottom-0 pointer-events-none opacity-[0.03] text-[#1C1C1A]">
          <svg className="w-64 h-64" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="0.5">
            <circle cx="90" cy="90" r="80" />
            <circle cx="90" cy="90" r="60" />
            <circle cx="90" cy="90" r="40" />
          </svg>
        </div>

        <div className="relative z-10 w-full md:w-1/3">
          <h1 className="text-3xl font-light tracking-wide text-[#1C1C1A] font-serif" style={{ fontFamily: "'Playfair Display', serif" }}>
            Good morning, {firstName}.
          </h1>
          <div className="h-0.5 w-16 bg-[#C9A84C] mt-2.5" />
          <p className="text-[9px] text-[#9C9890] uppercase tracking-widest mt-3.5 font-bold">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        <div className="relative z-10 w-full md:w-2/3 grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 divide-x divide-[#E8E4DF]">
          <div className="pl-4 md:pl-6 first:pl-0 cursor-pointer hover:bg-slate-50 transition-colors p-2 rounded-lg -ml-2" onClick={() => { setStaffModalFilter("all"); setShowStaffModal(true); }}>
            <div className="text-2xl font-light text-[#1C1C1A] font-serif" style={{ fontFamily: "'Playfair Display', serif" }}>
              {stats?.roles?.employees || 0}
            </div>
            <div className="text-[9px] uppercase tracking-wider text-[#9C9890] mt-1 font-semibold flex items-center gap-1 hover:text-[#C9A84C]">
              <Users className="w-3 h-3" /> Total Staff <ArrowUpRight className="w-3 h-3" />
            </div>
          </div>
          <div className="pl-4 md:pl-6 cursor-pointer hover:bg-slate-50 transition-colors p-2 rounded-lg" onClick={() => { setStaffModalFilter("present"); setShowStaffModal(true); }}>
            <div className="text-2xl font-light text-[#6B8F71] font-serif" style={{ fontFamily: "'Playfair Display', serif" }}>
              {stats?.todayCompliance?.attendance || 0}
            </div>
            <div className="text-[9px] uppercase tracking-wider text-[#9C9890] mt-1 font-semibold flex items-center gap-1 hover:text-[#C9A84C]">
              <UserCheck className="w-3 h-3" /> Present Today <ArrowUpRight className="w-3 h-3" />
            </div>
          </div>
          <div className="pl-4 md:pl-6 cursor-pointer hover:bg-slate-50 transition-colors p-2 rounded-lg" onClick={() => { setStaffModalFilter("absent"); setShowStaffModal(true); }}>
            <div className="text-2xl font-light text-rose-500 font-serif" style={{ fontFamily: "'Playfair Display', serif" }}>
              {stats?.todayCompliance?.absent || 0}
            </div>
            <div className="text-[9px] uppercase tracking-wider text-[#9C9890] mt-1 font-semibold flex items-center gap-1 hover:text-[#C9A84C]">
              <UserMinus className="w-3 h-3" /> Absent Today <ArrowUpRight className="w-3 h-3" />
            </div>
          </div>
          <div className="pl-4 md:pl-6">
            <div className="text-2xl font-light text-[#C9A84C] font-serif" style={{ fontFamily: "'Playfair Display', serif" }}>
              {stats?.todayCompliance?.leaves || 0}
            </div>
            <div className="text-[9px] uppercase tracking-wider text-[#9C9890] mt-1 font-semibold flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> On Leave
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Simplified & Minimal */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* Left Column: Operations Overview */}
        <div className="space-y-8">
          <div className="bg-[#FCFBF9] border border-[#E8E4DF] rounded-xl p-6 shadow-[0_2px_20px_rgba(0,0,0,0.04)]">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-sm font-medium tracking-wider text-[#1C1C1A] uppercase">Today's Operations</h2>
            </div>

            <div className="space-y-6">
              <div>
                <div className="flex justify-between text-[11px] uppercase tracking-widest font-bold mb-2">
                  <span className="text-[#5D5B57]">SOD Declared</span>
                  <span className="text-[#1C1C1A]">{stats?.todayCompliance?.sod || 0} / {stats?.roles?.employees || 0}</span>
                </div>
                <div className="w-full bg-[#E8E4DF] rounded-full h-1.5 overflow-hidden">
                  <div className="bg-[#6B8F71] h-1.5 rounded-full" style={{ width: `${stats?.roles?.employees ? Math.min(100, Math.round(((stats.todayCompliance?.sod || 0) / stats.roles.employees) * 100)) : 0}%` }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[11px] uppercase tracking-widest font-bold mb-2">
                  <span className="text-[#5D5B57]">EOD Logs Submitted</span>
                  <span className="text-[#1C1C1A]">{stats?.todayCompliance?.eod || 0} / {stats?.roles?.employees || 0}</span>
                </div>
                <div className="w-full bg-[#E8E4DF] rounded-full h-1.5 overflow-hidden">
                  <div className="bg-[#C9A84C] h-1.5 rounded-full" style={{ width: `${stats?.roles?.employees ? Math.min(100, Math.round(((stats.todayCompliance?.eod || 0) / stats.roles.employees) * 100)) : 0}%` }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[11px] uppercase tracking-widest font-bold mb-2">
                  <span className="text-[#5D5B57]">Late Check-ins</span>
                  <span className="text-rose-500">{stats?.todayCompliance?.lateCheckins || 0}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-[#FCFBF9] border border-[#E8E4DF] rounded-xl p-6 shadow-[0_2px_20px_rgba(0,0,0,0.04)]">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-sm font-medium tracking-wider text-[#1C1C1A] uppercase">HR & Hiring Pipeline</h2>
              <button onClick={() => onNavigateTab("hr-leads")} className="text-[9px] uppercase tracking-wider font-bold text-[#C9A84C] hover:text-[#B3923E]">Manage</button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 border border-[#E8E4DF] rounded-lg bg-white">
                <div className="text-xl font-light text-[#1C1C1A]">{stats?.hrStats?.newCandidates || 0}</div>
                <div className="text-[9px] uppercase tracking-wider text-[#9C9890] mt-1 font-bold">New Leads</div>
              </div>
              <div className="p-4 border border-[#E8E4DF] rounded-lg bg-white">
                <div className="text-xl font-light text-[#C9A84C]">{stats?.hrStats?.interviewsToday || 0}</div>
                <div className="text-[9px] uppercase tracking-wider text-[#9C9890] mt-1 font-bold">Interviews Today</div>
              </div>
              <div className="p-4 border border-[#E8E4DF] rounded-lg bg-white">
                <div className="text-xl font-light text-rose-500">{stats?.hrStats?.verificationPending || 0}</div>
                <div className="text-[9px] uppercase tracking-wider text-[#9C9890] mt-1 font-bold">Pending Verification</div>
              </div>
              <div className="p-4 border border-[#E8E4DF] rounded-lg bg-white">
                <div className="text-xl font-light text-[#6B8F71]">{stats?.hrStats?.hrLeadsCount || 0}</div>
                <div className="text-[9px] uppercase tracking-wider text-[#9C9890] mt-1 font-bold">Selected Candidates</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Quick Actions & Activity Feed */}
        <div className="space-y-8">

          <div className="bg-[#FCFBF9] border border-[#E8E4DF] rounded-xl p-6 shadow-[0_2px_20px_rgba(0,0,0,0.04)]">
            <h2 className="text-sm font-medium tracking-wider text-[#1C1C1A] uppercase mb-4">Quick Actions</h2>
            <div className="grid grid-cols-2 gap-3">
              {[
                { name: "Add Employee", tab: "employees" },
                { name: "Approve Leaves", tab: "ess-leaves" },
                { name: "Process Payroll", tab: "ess-payroll" },
                { name: "Post Job", tab: "jobs" },
                { name: "Appraisal Logs", tab: "performance" },
                { name: "Risk Assessment", tab: "risks" },
                { name: "Verify Registry", tab: "verification" },
                { name: "Work Report", tab: "performance" } // changed tab to performance for Work Report
              ].map((action, i) => {
                const handleClick = () => {
                  if (["employees", "ess-leaves", "ess-payroll", "jobs", "performance", "risks", "verification"].includes(action.tab)) {
                    onNavigateTab(action.tab);
                  } else {
                    triggerToast?.(`Executing: ${action.name}`);
                  }
                };

                return (
                  <button
                    key={i}
                    onClick={handleClick}
                    className="text-[10px] uppercase tracking-wider font-semibold p-3 rounded-lg border border-[#E8E4DF] bg-[#FCFBF9] text-[#5D5B57] hover:bg-[#FAFAF7] hover:border-[#C9A84C] hover:text-[#1C1C1A] transition-all hover:scale-[1.01] active:scale-[0.99] text-center"
                  >
                    {action.name}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="bg-[#FCFBF9] border border-[#E8E4DF] rounded-xl p-6 shadow-[0_2px_20px_rgba(0,0,0,0.04)]">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-sm font-medium tracking-wider text-[#1C1C1A] uppercase">Recent Activity</h2>
              <button
                onClick={() => triggerToast?.("Displaying all activities...")}
                className="text-[9px] uppercase tracking-wider font-bold text-[#C9A84C] hover:text-[#B3923E] transition-colors"
              >
                View All
              </button>
            </div>
            <ActivityFeed dark={false} companyId={selectedCompanyId} />
          </div>

        </div>

      </div>

      {showStaffModal && (
        <div className="fixed inset-0 bg-black/20 z-50 flex justify-center items-center backdrop-blur-md p-4 sm:p-6" onClick={() => setShowStaffModal(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden animate-slideUp" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-[#FCFBF9]">
              <h2 className="text-xl font-serif text-[#1C1C1A]">
                Team Roster {staffModalFilter === "present" ? "(Present)" : staffModalFilter === "absent" ? "(Absent)" : ""}
              </h2>
              <button onClick={() => setShowStaffModal(false)} className="text-gray-400 hover:text-gray-800 transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className={`text-2xl font-black tracking-tight ${isDark ? "text-white" : "text-slate-800"}`}>
            HR Operations Dashboard
          </h1>
        </div>
        <div className="flex gap-3">
          <button
            onClick={exportHrReport}
            className={`px-4 py-2 border rounded-lg text-sm font-medium transition-colors shadow-sm flex items-center gap-2 ${isDark ? "bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700" : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"}`}
          >
            <Download className="w-4 h-4" /> Export HR Report
          </button>
          <button
            onClick={() => setShowHiringModal(true)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm flex items-center gap-2"
          >
            <UserPlus className="w-4 h-4" /> New Hire
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
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
    </div>
  );
}

export function DepartmentDashboard({
  stats,
  onNavigateTab,
  userRole,
  selectedDeptId = "all",
  onDeptChange,
  onNavigateTodayTasks
}: {
  stats: any;
  onNavigateTab: (tab: string) => void;
  userRole?: string;
  selectedDeptId?: string;
  onDeptChange?: (dept: string) => void;
  onNavigateTodayTasks?: () => void;
}) {
  const deptStats = stats?.deptStats || {};
  const [isDark, setIsDark] = React.useState(false);
  const [showHiringModal, setShowHiringModal] = React.useState(false);
  const [showTeamModal, setShowTeamModal] = React.useState(false);
  const [showSodEodModal, setShowSodEodModal] = React.useState(false);
  const [departments, setDepartments] = React.useState<any[]>([]);

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

  const isGlobal = ["Director", "HR Head", "HR Executive"].includes(userRole || "");
  const teamList = deptStats.teamList || [];

  // Deduplicate department names for filter dropdown
  const uniqueDeptNames = Array.from(new Set(departments.map(d => d.name).filter(Boolean)));

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className={`text-2xl font-bold tracking-tight ${isDark ? "text-white" : "text-slate-800"}`}>
            Department Head Dashboard
          </h1>
          <p className={`text-sm mt-1 ${isDark ? "text-gray-400" : "text-slate-500"}`}>
            Manager view — team performance, daily tasks, and approvals
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isGlobal && (
            <div className="flex items-center gap-2">
              <span className={`text-xs font-bold uppercase tracking-wider ${isDark ? "text-gray-400" : "text-slate-550"}`}>
                Department:
              </span>
              <select
                value={selectedDeptId}
                onChange={(e) => onDeptChange?.(e.target.value)}
                className={`text-sm border rounded-lg px-3 py-1.5 outline-none font-semibold transition-all shadow-sm ${isDark
                  ? "bg-gray-800 border-gray-700 text-gray-200 focus:border-indigo-500"
                  : "bg-white border-slate-200 text-slate-700 focus:border-indigo-500"
                  }`}
              >
                <option value="all">All Departments</option>
                {uniqueDeptNames.map((name: string) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <button
            onClick={() => setShowHiringModal(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm flex items-center gap-2"
          >
            <PlusCircle className="w-4 h-4" /> Add Requirement
          </button>
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
            <div className="p-6 max-h-[60vh] overflow-y-auto space-y-3">
              {teamList.length === 0 ? (
                <p className="text-center text-sm text-slate-400 py-4">No team members found.</p>
              ) : (
                teamList.map((m: any) => (
                  <div key={m.id} className={`p-4 rounded-xl border flex items-center justify-between ${isDark ? "bg-gray-800/50 border-gray-700" : "bg-slate-50/50 border-slate-150"}`}>
                    <div>
                      <h4 className="text-sm font-bold">{m.name}</h4>
                      <p className="text-xs text-slate-500 dark:text-gray-400 mt-0.5">
                        {m.designation || m.role} • {m.department}
                      </p>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${m.status === "active" ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400" : "bg-slate-100 text-slate-600 border-slate-200"}`}>
                      {m.status === "active" ? "Active" : "Inactive"}
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Team Members"
          value={deptStats.teamMembers?.toString() || "0"}
          trend="Total active"
          trendUp={true}
          icon={<Users className="w-5 h-5" />}
          dark={isDark}
          onClick={() => setShowTeamModal(true)}
        />
        <StatCard
          title="Today's Tasks"
          value={deptStats.tasksToday?.toString() || "0"}
          trend="Pending completion"
          trendUp={true}
          icon={<Briefcase className="w-5 h-5" />}
          dark={isDark}
          onClick={() => onNavigateTodayTasks?.()}
        />
        <StatCard
          title="SOD / EOD"
          value={`${deptStats.sod || 0} / ${deptStats.eod || 0}`}
          trend="Team compliance"
          trendUp={true}
          icon={<Clock className="w-5 h-5" />}
          dark={isDark}
          onClick={() => setShowSodEodModal(true)}
        />
        <StatCard
          title="Avg Performance"
          value={`${deptStats.performanceAvg || 0}%`}
          trend="Current quarter"
          trendUp={true}
          icon={<TrendingUp className="w-5 h-5" />}
          dark={isDark}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className={`p-6 rounded-xl border shadow-sm ${isDark ? "bg-gray-900 border-gray-800" : "bg-white border-slate-200"}`}>
            <div className="flex items-center justify-between mb-4">
              <h2 className={`text-lg font-bold ${isDark ? "text-white" : "text-slate-800"}`}>Team Performance Trends</h2>
              <span className={`text-xs font-medium ${isDark ? "text-gray-400" : "text-slate-500"}`}>SOD Compliance — Last 6 Months</span>
            </div>
            <PerformanceChart dark={isDark} data={deptStats.performanceTrend || []} />
          </div>
        </div>

        <div className="space-y-6">
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
