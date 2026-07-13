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
  Download
} from "lucide-react";
import StatCard from "./StatCard";
import AttendanceChart from "./AttendanceChart";
import PerformanceChart from "./PerformanceChart";
import ActivityFeed from "./ActivityFeed";
import HiringRequisitionModal from "./HiringRequisitionModal";

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
  const [staffModalFilter, setStaffModalFilter] = React.useState<"all"|"present"|"absent">("all");
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
        <div className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center backdrop-blur-sm p-4 sm:p-6" onClick={() => setShowStaffModal(false)}>
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
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest ${
                          staff.status === 'active' || staff.status === 'Active' 
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
  onNavigateTab: (tab: string) => void;
}) {
  const hrStats = stats?.hrStats || {};
  const [isDark, setIsDark] = React.useState(false);

  const recentInterviews = React.useMemo(() => {
    return [...(interviews || [])]
      .sort((a, b) => new Date(b.createdAt || b.scheduleTime).getTime() - new Date(a.createdAt || a.scheduleTime).getTime())
      .slice(0, 5);
  }, [interviews]);

  const dynamicHrLeadsCount = React.useMemo(() => {
    return (candidates || []).filter((c: any) => c.status === "Selected").length;
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
          <p className={`text-xs mt-1 font-medium ${isDark ? "text-gray-400" : "text-slate-505"}`}>
            HR Head view — daily commitments, verification pipeline, and separation cases
          </p>
        </div>
        <div className="flex gap-3">
          <button className={`px-4 py-2 border rounded-lg text-sm font-medium transition-colors shadow-sm ${isDark ? "bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700" : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"}`}>
            Export HR Report
          </button>
          <button className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm flex items-center gap-2">
            <UserPlus className="w-4 h-4" /> New Hire
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Today's Interviews" 
          value={hrStats.interviewsToday?.toString() || "0"} 
          trend="Scheduled for today" 
          trendUp={true} 
          icon={<CalendarClock className="w-5 h-5" />} 
          dark={isDark}
          onClick={() => onNavigateTab("interviews")}
        />
        <StatCard 
          title="Verification Pending" 
          value={hrStats.verificationPending?.toString() || "0"} 
          trend="Requires action" 
          trendUp={false} 
          icon={<FileSearch className="w-5 h-5" />} 
          dark={isDark}
          onClick={() => onNavigateTab("verification")}
        />
        <StatCard 
          title="HR Logs" 
          value={hrStats.hrLeadsCount?.toString() || "0"} 
          trend="Candidate leads" 
          trendUp={true} 
          icon={<Users className="w-5 h-5 text-indigo-500" />} 
          dark={isDark}
          onClick={() => onNavigateTab("hr-leads")}
        />
        <StatCard 
          title="Rejected Logs" 
          value={hrStats.rejectedCount?.toString() || "0"} 
          trend="Rejected candidates" 
          trendUp={false} 
          icon={<ShieldX className="w-5 h-5 text-rose-500" />} 
          dark={isDark}
          onClick={() => onNavigateTab("hr-leads")}
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
            <AttendanceChart dark={isDark} />
          </div>
        </div>

        <div className="space-y-6">
          <div className={`p-6 rounded-xl border shadow-sm ${isDark ? "bg-gray-900 border-gray-800" : "bg-white border-slate-200"}`}>
            <div className="flex items-center justify-between mb-6">
              <h2 className={`text-lg font-bold ${isDark ? "text-white" : "text-slate-800"}`}>Recent HR Activity</h2>
              <button className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300">View All</button>
            </div>
            <ActivityFeed dark={isDark} />
          </div>
        </div>
      </div>
    </div>
  );
}

export function DepartmentDashboard({ 
  stats,
  onNavigateTab 
}: { 
  stats: any;
  onNavigateTab: (tab: string) => void;
}) {
  const deptStats = stats?.deptStats || {};
  const [isDark, setIsDark] = React.useState(false);
  const [showHiringModal, setShowHiringModal] = React.useState(false);

  React.useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains("dark"));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Team Members" 
          value={deptStats.teamMembers?.toString() || "0"} 
          trend="Total active" 
          trendUp={true} 
          icon={<Users className="w-5 h-5" />} 
          dark={isDark}
        />
        <StatCard 
          title="Today's Tasks" 
          value={deptStats.tasksToday?.toString() || "0"} 
          trend="Pending completion" 
          trendUp={true} 
          icon={<Briefcase className="w-5 h-5" />} 
          dark={isDark}
        />
        <StatCard 
          title="SOD / EOD" 
          value={`${deptStats.sod || 0} / ${deptStats.eod || 0}`} 
          trend="Team compliance" 
          trendUp={true} 
          icon={<Clock className="w-5 h-5" />} 
          dark={isDark}
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
            </div>
            <PerformanceChart dark={isDark} />
          </div>
        </div>

        <div className="space-y-6">
          <div className={`p-6 rounded-xl border shadow-sm ${isDark ? "bg-gray-900 border-gray-800" : "bg-white border-slate-200"}`}>
            <div className="flex items-center justify-between mb-6">
              <h2 className={`text-lg font-bold ${isDark ? "text-white" : "text-slate-800"}`}>Team Activity</h2>
            </div>
            <ActivityFeed dark={isDark} />
          </div>
        </div>
      </div>
    </div>
  );
}
