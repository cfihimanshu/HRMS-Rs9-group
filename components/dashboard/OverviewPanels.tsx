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
  Plus
} from "lucide-react";
import StatCard from "./StatCard";
import AttendanceChart from "./AttendanceChart";
import PerformanceChart from "./PerformanceChart";
import ActivityFeed from "./ActivityFeed";
import HiringRequisitionModal from "./HiringRequisitionModal";

interface OverviewProps {
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
  stats, 
  riskAlertList, 
  onResolveAlert, 
  onNavigateTab, 
  triggerToast,
  companies,
  selectedCompanyId,
  onCompanyChange
}: OverviewProps) {
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
            className="px-4 py-2 border border-[#E8E4DF] rounded-lg text-xs font-semibold tracking-wider uppercase bg-[#FCFBF9] hover:bg-[#F5F0EA] text-[#5D5B57] transition-all"
            onClick={() => triggerToast("Exporting comprehensive report...")}
          >
            Export
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
      <div className="bg-[#FCFBF9] border border-[#E8E4DF] rounded-xl p-8 shadow-[0_2px_20px_rgba(0,0,0,0.04)] relative overflow-hidden">
        {/* Subtle decorative background graphic */}
        <div className="absolute right-0 bottom-0 pointer-events-none opacity-[0.03] text-[#1C1C1A]">
          <svg className="w-64 h-64" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="0.5">
            <circle cx="90" cy="90" r="80" />
            <circle cx="90" cy="90" r="60" />
            <circle cx="90" cy="90" r="40" />
          </svg>
        </div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl font-light tracking-wide text-[#1C1C1A] font-serif" style={{ fontFamily: "'Playfair Display', serif" }}>
              Good morning, Himanshu.
            </h1>
            <div className="h-0.5 w-16 bg-[#C9A84C] mt-2.5" />
            <p className="text-[9px] text-[#9C9890] uppercase tracking-widest mt-3.5 font-bold">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>

          {/* 3 KPI Tiles inline */}
          <div className="grid grid-cols-3 gap-6 md:gap-12 divide-x divide-[#E8E4DF] md:mr-4">
            <div className="pl-4 first:pl-0">
              <div className="text-2xl font-light text-[#1C1C1A] font-serif" style={{ fontFamily: "'Playfair Display', serif" }}>
                {stats?.roles?.employees || 0}
              </div>
              <div className="text-[9px] uppercase tracking-wider text-[#9C9890] mt-1 font-semibold">Total Staff</div>
            </div>
            <div className="pl-6">
              <div className="text-2xl font-light text-[#6B8F71] font-serif" style={{ fontFamily: "'Playfair Display', serif" }}>
                {stats?.roles?.employees ? Math.max(0, stats.roles.employees - 3) : 0}
              </div>
              <div className="text-[9px] uppercase tracking-wider text-[#9C9890] mt-1 font-semibold">Present Today</div>
            </div>
            <div className="pl-6">
              <div className="text-2xl font-light text-[#C9A84C] font-serif" style={{ fontFamily: "'Playfair Display', serif" }}>
                {stats?.interviews?.pending || 0}
              </div>
              <div className="text-[9px] uppercase tracking-wider text-[#9C9890] mt-1 font-semibold">Pending Leaves</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: 2 columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Attendance & Performance (span 2) */}
        <div className="lg:col-span-2 space-y-8">
          {/* Attendance Overview Card */}
          <div className="bg-[#FCFBF9] border border-[#E8E4DF] rounded-xl p-6 shadow-[0_2px_20px_rgba(0,0,0,0.04)]">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-sm font-medium tracking-wider text-[#1C1C1A] uppercase">Attendance Overview</h2>
              <select className="text-[10px] uppercase tracking-wider font-semibold border border-[#E8E4DF] bg-[#FCFBF9] rounded px-2.5 py-1 text-[#5D5B57] focus:outline-none focus:border-[#C9A84C]">
                <option>This Week</option>
                <option>Last Week</option>
                <option>This Month</option>
              </select>
            </div>
            <AttendanceChart dark={false} />
          </div>

          {/* Performance Trend Card */}
          <div className="bg-[#FCFBF9] border border-[#E8E4DF] rounded-xl p-6 shadow-[0_2px_20px_rgba(0,0,0,0.04)]">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-sm font-medium tracking-wider text-[#1C1C1A] uppercase">Performance Trends</h2>
              <select className="text-[10px] uppercase tracking-wider font-semibold border border-[#E8E4DF] bg-[#FCFBF9] rounded px-2.5 py-1 text-[#5D5B57] focus:outline-none focus:border-[#C9A84C]">
                <option>2026</option>
                <option>2025</option>
              </select>
            </div>
            <PerformanceChart dark={false} />
          </div>
        </div>

        {/* Right Column: Quick Actions & Activity Feed */}
        <div className="space-y-8">
          
          {/* Quick Actions Panel */}
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
                { name: "Export Analytics", tab: "dashboard" }
              ].map((action, i) => {
                const handleClick = () => {
                  if (action.tab === "dashboard" || action.tab === "employees" || action.tab === "ess-leaves" || action.tab === "ess-payroll" || action.tab === "jobs" || action.tab === "performance" || action.tab === "risks" || action.tab === "verification") {
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

          {/* Recent Activity Audit Feed */}
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
