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
  const [isDark, setIsDark] = React.useState(false);

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
            Enterprise Owner Command Center
          </h1>

        </div>
        <div className="flex items-center gap-3">
          {companies && (
            <select
              value={selectedCompanyId || ""}
              onChange={(e) => onCompanyChange?.(e.target.value)}
              className={`text-xs font-bold px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors shadow-sm ${isDark ? "bg-gray-800 border-gray-700 text-white" : "bg-white border-slate-200 text-slate-800"}`}
            >
              <option value="">All Companies</option>
              {companies.map((c) => (
                <option key={c.mongo_id} value={c.mongo_id}>{c.name}</option>
              ))}
            </select>
          )}
          <button 
            className={`px-4 py-2 border rounded-lg text-sm font-medium transition-colors shadow-sm ${isDark ? "bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700" : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"}`}
            onClick={() => triggerToast("Exporting comprehensive report...")}
          >
            Export Report
          </button>
          <button 
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm flex items-center gap-2"
            onClick={() => triggerToast("Enterprise metrics synchronized successfully")}
          >
            <RotateCw className="w-4 h-4" /> Sync Core
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Active Employees" 
          value={stats?.roles?.employees?.toString() || "0"} 
          trend="+5.2%" 
          trendUp={true} 
          icon={<Users className="w-5 h-5" />} 
          dark={isDark}
        />
        <StatCard 
          title="Total Candidates" 
          value={stats?.candidates?.total?.toString() || "0"} 
          trend="+12 this week" 
          trendUp={true} 
          icon={<UserPlus className="w-5 h-5" />} 
          dark={isDark}
        />
        <StatCard 
          title="Pending Interviews" 
          value={stats?.interviews?.pending?.toString() || "0"} 
          trend="Action required" 
          trendUp={false} 
          icon={<Clock className="w-5 h-5" />} 
          dark={isDark}
        />
        <StatCard 
          title="High-Risk Alerts" 
          value={stats?.alerts?.criticalRisk?.toString() || "0"} 
          trend="Needs immediate review" 
          trendUp={false} 
          icon={<ShieldAlert className="w-5 h-5 text-rose-500" />} 
          dark={isDark}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Charts */}
        <div className="lg:col-span-2 space-y-6">
          <div className={`p-6 rounded-xl border shadow-sm ${isDark ? "bg-gray-900 border-gray-800" : "bg-white border-slate-200"}`}>
            <div className="flex items-center justify-between mb-4">
              <h2 className={`text-lg font-bold ${isDark ? "text-white" : "text-slate-800"}`}>Attendance Overview</h2>
              <select className={`text-xs border rounded px-2 py-1 outline-none ${isDark ? "bg-gray-800 border-gray-700 text-gray-300" : "bg-white border-slate-200 text-slate-600"}`}>
                <option>This Week</option>
                <option>Last Week</option>
                <option>This Month</option>
              </select>
            </div>
            <AttendanceChart dark={isDark} />
          </div>

          <div className={`p-6 rounded-xl border shadow-sm ${isDark ? "bg-gray-900 border-gray-800" : "bg-white border-slate-200"}`}>
            <div className="flex items-center justify-between mb-4">
              <h2 className={`text-lg font-bold ${isDark ? "text-white" : "text-slate-800"}`}>Performance Trends</h2>
              <select className={`text-xs border rounded px-2 py-1 outline-none ${isDark ? "bg-gray-800 border-gray-700 text-gray-300" : "bg-white border-slate-200 text-slate-600"}`}>
                <option>2026</option>
                <option>2025</option>
              </select>
            </div>
            <PerformanceChart dark={isDark} />
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          {/* Recent Activity */}
          <div className={`p-6 rounded-xl border shadow-sm ${isDark ? "bg-gray-900 border-gray-800" : "bg-white border-slate-200"}`}>
            <div className="flex items-center justify-between mb-6">
              <h2 className={`text-lg font-bold ${isDark ? "text-white" : "text-slate-800"}`}>Recent Activity</h2>
              <button className="text-xs font-semibold text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300">View All</button>
            </div>
            <ActivityFeed dark={isDark} />
          </div>

          {/* Quick Actions Panel */}
          <div className={`p-6 rounded-xl border shadow-sm ${isDark ? "bg-gray-900 border-gray-800" : "bg-white border-slate-200"}`}>
            <h2 className={`text-lg font-bold mb-4 ${isDark ? "text-white" : "text-slate-800"}`}>Quick Actions</h2>
            <div className="grid grid-cols-2 gap-3">
              {[
                "Add Employee", "Approve Leaves", "Process Payroll", "Post Job",
                "Start Appraisal", "Assign Training", "Announce", "Export Data"
              ].map((action, i) => {
                const handleClick = () => {
                  if (action === "Add Employee") onNavigateTab("employees");
                  else if (action === "Approve Leaves") onNavigateTab("ess-leaves");
                  else if (action === "Process Payroll") onNavigateTab("ess-payroll");
                  else if (action === "Post Job") onNavigateTab("jobs");
                  else triggerToast(`Navigating to ${action}`);
                };
                
                return (
                  <button 
                    key={i}
                    onClick={handleClick}
                    className={`text-xs font-semibold p-3 rounded-lg border transition-colors ${
                      isDark 
                        ? "bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700 hover:border-gray-600" 
                        : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-white hover:border-purple-300 hover:shadow-sm hover:text-purple-700"
                    }`}
                  >
                    {action}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function HrDashboard({ 
  stats,
  onNavigateTab 
}: { 
  stats: any;
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
      {/* Main Grid: Left part spans 3 columns, right part spans 1 column */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        <div className="xl:col-span-3 space-y-6">

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
