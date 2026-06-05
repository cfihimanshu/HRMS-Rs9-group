import React from "react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
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
import HiringTrendsChart from "./HiringTrendsChart";

interface OverviewProps {
  stats: any;
  riskAlertList: any[];
  onResolveAlert: (id: string) => void;
  onNavigateTab: (tab: string) => void;
  triggerToast: (msg: string) => void;
}

export function OwnerDashboard({
  stats,
  riskAlertList,
  onResolveAlert,
  onNavigateTab,
  triggerToast
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
        <div className="flex gap-3">
          <button
            className={`px-4 py-2 border rounded-lg text-sm font-medium transition-colors shadow-sm ${isDark ? "bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700" : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"}`}
            onClick={() => triggerToast("Exporting comprehensive report...")}
          >
            Export Report
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
          title="Probation Employees"
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
              ].map((action, i) => (
                <button
                  key={i}
                  onClick={() => triggerToast(`Navigating to ${action}`)}
                  className={`text-xs font-semibold p-3 rounded-lg border transition-colors ${isDark
                    ? "bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700 hover:border-gray-600"
                    : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-white hover:border-purple-300 hover:shadow-sm hover:text-purple-700"
                    }`}
                >
                  {action}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const SparkBar = ({ color, values }: { color: string; values: number[] }) => {
  const max = Math.max(...values);
  return (
    <div className="flex items-end gap-0.5 h-10 w-16">
      {values.map((v, i) => {
        const heightPercent = max > 0 ? (v / max) * 100 : 10;
        return (
          <div
            key={i}
            style={{ height: `${heightPercent}%` }}
            className={`w-1 rounded-t-sm ${color}`}
          />
        );
      })}
    </div>
  );
};

function CustomStatCard({
  title,
  value,
  trendText,
  trendUp,
  sparklineColor,
  sparklineValues,
  icon,
  onClick,
  isDark
}: {
  title: string;
  value: string;
  trendText: string;
  trendUp: boolean;
  sparklineColor: string;
  sparklineValues: number[];
  icon: React.ReactNode;
  onClick?: () => void;
  isDark: boolean;
}) {
  return (
    <div
      onClick={onClick}
      className={`p-5 rounded-xl border shadow-sm flex justify-between items-center relative overflow-hidden transition-all duration-300 hover:shadow-md hover:scale-[1.01] ${onClick ? "cursor-pointer" : ""
        } ${isDark ? "bg-gray-900 border-gray-800" : "bg-white border-slate-200"}`}
    >
      <div className="space-y-3 z-10">
        <div>
          <p className={`text-[10px] font-black uppercase tracking-wider ${isDark ? "text-gray-400" : "text-slate-450"}`}>{title}</p>
          <h3 className={`text-3xl font-black mt-1 ${isDark ? "text-white" : "text-slate-800"}`}>{value}</h3>
        </div>
        <div className="flex items-center gap-1 text-[10px]">
          <span className={`font-black flex items-center ${trendUp ? "text-emerald-500" : "text-rose-500"}`}>
            {trendText}
          </span>
          <span className={`${isDark ? "text-gray-500" : "text-slate-400"}`}>vs last month</span>
        </div>
      </div>
      <div className="flex flex-col items-end justify-between h-full min-h-[72px] z-10">
        <div className={`p-1.5 rounded-lg ${isDark ? "bg-gray-800 text-gray-400" : "bg-slate-50 text-slate-500"}`}>
          {icon}
        </div>
        <SparkBar color={sparklineColor} values={sparklineValues} />
      </div>
    </div>
  );
}

export function HrDashboard({
  stats,
  candidates = [],
  interviews = [],
  onNavigateTab,
  onOpenHiringModal
}: {
  stats: any;
  candidates?: any[];
  interviews?: any[];
  onNavigateTab: (tab: string) => void;
  onOpenHiringModal?: () => void;
}) {
  const hrStats = stats?.hrStats || {};
  const [isDark, setIsDark] = React.useState(false);
  const [filterType, setFilterType] = React.useState<"this-week" | "last-week" | "prev-month">("this-week");

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
          <button className={`px-4 py-2 border rounded-lg text-xs font-bold transition-all shadow-sm ${isDark ? "bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700" : "bg-white border-slate-205 text-slate-700 hover:bg-slate-50"}`}>
            Export HR Report
          </button>
          <button
            onClick={onOpenHiringModal}
            className="px-4 py-2 bg-[#4f46e5] hover:bg-[#4338ca] text-white rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> New Hire
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <CustomStatCard
          title="Today's Interviews"
          value={dynamicInterviewsToday.toString()}
          trendText="Scheduled for today"
          trendUp={true}
          sparklineColor="bg-purple-500"
          sparklineValues={[10, 15, 8, 12, 18, 14, 20, dynamicInterviewsToday]}
          icon={<CalendarClock className="w-5 h-5 text-purple-500" />}
          isDark={isDark}
          onClick={() => onNavigateTab("interviews")}
        />
        <CustomStatCard
          title="Verification Pending"
          value={hrStats.verificationPending?.toString() || "0"}
          trendText="Requires action"
          trendUp={false}
          sparklineColor="bg-rose-500"
          sparklineValues={[8, 12, 14, 10, 18, 22, 25, hrStats.verificationPending || 0]}
          icon={<FileSearch className="w-5 h-5 text-rose-500" />}
          isDark={isDark}
          onClick={() => onNavigateTab("verification")}
        />
        <CustomStatCard
          title="HR Leads"
          value={dynamicHrLeadsCount.toString()}
          trendText="Active candidate leads"
          trendUp={true}
          sparklineColor="bg-blue-500"
          sparklineValues={[30, 45, 60, 50, 75, 90, 110, dynamicHrLeadsCount]}
          icon={<Users className="w-5 h-5 text-blue-500" />}
          isDark={isDark}
          onClick={() => onNavigateTab("hr-leads")}
        />
        <CustomStatCard
          title="Rejected Leads"
          value={dynamicRejectedCount.toString()}
          trendText="Rejected candidates"
          trendUp={false}
          sparklineColor="bg-amber-500"
          sparklineValues={[2, 4, 3, 5, 4, 6, 7, dynamicRejectedCount]}
          icon={<ShieldX className="w-5 h-5 text-amber-500" />}
          isDark={isDark}
          onClick={() => onNavigateTab("hr-leads")}
        />
      </div>
      {/* Main Grid: Left part spans 3 columns, right part spans 1 column */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        <div className="xl:col-span-3 space-y-6">

          {/* Middle Row: Hiring Trends Chart + Recent Interviews on Left, Applications by Source Donut on Right */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Left Column (spans 2 columns) */}
            <div className="lg:col-span-2 space-y-6">
              {/* Hiring Pipeline Trends */}
              <div className={`p-6 rounded-xl border shadow-sm ${isDark ? "bg-gray-900 border-gray-800" : "bg-white border-slate-200"}`}>
                <div className="flex items-center justify-between mb-4">
                  <h2 className={`text-base font-bold ${isDark ? "text-white" : "text-slate-800"}`}>Hiring Pipeline Trends</h2>
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value as any)}
                    className={`text-xs border rounded px-2 py-1 outline-none ${isDark ? "bg-gray-800 border-gray-700 text-gray-300" : "bg-white border-slate-200 text-slate-600"}`}
                  >
                    <option value="this-week">This Week</option>
                    <option value="last-week">Last Week</option>
                    <option value="prev-month">Previous Month</option>
                  </select>
                </div>
                <HiringTrendsChart candidates={candidates} filterType={filterType} dark={isDark} />
              </div>
            </div>

            {/* Applications by Source Donut Chart */}
            <div className={`p-6 rounded-xl border shadow-sm lg:col-span-1 flex flex-col justify-between ${isDark ? "bg-gray-900 border-gray-800" : "bg-white border-slate-200"}`}>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h2 className={`text-base font-bold ${isDark ? "text-white" : "text-slate-800"}`}>Applications by Source</h2>
                  <select className={`text-[10px] font-bold border rounded px-2 py-0.5 outline-none ${isDark ? "bg-gray-800 border-gray-700 text-gray-300" : "bg-white border-slate-200 text-slate-600"}`}>
                    <option>This Quarter</option>
                    <option>This Month</option>
                  </select>
                </div>

                <div className="relative h-44 w-full flex items-center justify-center mt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: "LinkedIn", value: 560, color: "#4f46e5" },
                          { name: "Naukri", value: 420, color: "#06b6d4" },
                          { name: "Referral", value: 310, color: "#10b981" },
                          { name: "Company Website", value: 210, color: "#f59e0b" },
                          { name: "Others", value: 100, color: "#94a3b8" }
                        ]}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={65}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {[
                          { color: "#4f46e5" },
                          { color: "#06b6d4" },
                          { color: "#10b981" },
                          { color: "#f59e0b" },
                          { color: "#94a3b8" }
                        ].map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute flex flex-col items-center justify-center">
                    <span className={`text-lg font-black ${isDark ? "text-white" : "text-slate-800"}`}>1,600</span>
                    <span className="text-[9px] text-slate-400 uppercase font-black tracking-wider">Total</span>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5 text-[11px] mt-4">
                {[
                  { name: "LinkedIn", value: 560, pct: "35%", color: "bg-[#4f46e5]" },
                  { name: "Naukri", value: 420, pct: "26%", color: "bg-[#06b6d4]" },
                  { name: "Referral", value: 310, pct: "19%", color: "bg-[#10b981]" },
                  { name: "Company Website", value: 210, pct: "13%", color: "bg-[#f59e0b]" },
                  { name: "Others", value: 100, pct: "7%", color: "bg-[#94a3b8]" }
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${item.color}`} />
                      <span className={`font-semibold ${isDark ? "text-gray-300" : "text-slate-600"}`}>{item.name}</span>
                    </div>
                    <span className={`font-bold font-mono ${isDark ? "text-gray-400" : "text-slate-500"}`}>
                      {item.value} ({item.pct})
                    </span>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Bottom Row: 4 Cards (Interview Status, Offer Status, Gender Diversity, Dept Strength) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">

            {/* Card 1: Interview Status */}
            <div className={`p-5 rounded-xl border shadow-sm flex flex-col justify-between ${isDark ? "bg-gray-900 border-gray-800" : "bg-white border-slate-200"}`}>
              <div>
                <h3 className={`text-sm font-bold mb-2 ${isDark ? "text-white" : "text-slate-800"}`}>Interview Status</h3>
                <div className="relative h-36 w-full flex items-center justify-center my-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: "Scheduled", value: 24, color: "#4f46e5" },
                          { name: "In Progress", value: 18, color: "#06b6d4" },
                          { name: "Completed", value: 20, color: "#10b981" },
                          { name: "Cancelled", value: 10, color: "#ef4444" }
                        ]}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={52}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {[
                          { color: "#4f46e5" },
                          { color: "#06b6d4" },
                          { color: "#10b981" },
                          { color: "#ef4444" }
                        ].map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute flex flex-col items-center justify-center">
                    <span className={`text-base font-black ${isDark ? "text-white" : "text-slate-800"}`}>72</span>
                    <span className="text-[8px] text-slate-400 uppercase font-black">Total</span>
                  </div>
                </div>
              </div>
              <div className="space-y-1 text-[10px] mt-2">
                {[
                  { name: "Scheduled", value: 24, pct: "33%", color: "bg-[#4f46e5]" },
                  { name: "In Progress", value: 18, pct: "25%", color: "bg-[#06b6d4]" },
                  { name: "Completed", value: 20, pct: "28%", color: "bg-[#10b981]" },
                  { name: "Cancelled", value: 10, pct: "14%", color: "bg-[#ef4444]" }
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <span className={`w-1.5 h-1.5 rounded-full ${item.color}`} />
                      <span className={`font-medium ${isDark ? "text-gray-300" : "text-slate-600"}`}>{item.name}</span>
                    </div>
                    <span className="font-bold">{item.value} ({item.pct})</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Card 2: Offer Status */}
            <div className={`p-5 rounded-xl border shadow-sm flex flex-col justify-between ${isDark ? "bg-gray-900 border-gray-800" : "bg-white border-slate-200"}`}>
              <div>
                <h3 className={`text-sm font-bold mb-2 ${isDark ? "text-white" : "text-slate-800"}`}>Offer Status</h3>
                <div className="relative h-36 w-full flex items-center justify-center my-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: "Offered", value: 20, color: "#4f46e5" },
                          { name: "Accepted", value: 10, color: "#10b981" },
                          { name: "Declined", value: 4, color: "#ef4444" },
                          { name: "On Hold", value: 2, color: "#f59e0b" }
                        ]}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={52}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {[
                          { color: "#4f46e5" },
                          { color: "#10b981" },
                          { color: "#ef4444" },
                          { color: "#f59e0b" }
                        ].map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute flex flex-col items-center justify-center">
                    <span className={`text-base font-black ${isDark ? "text-white" : "text-slate-800"}`}>36</span>
                    <span className="text-[8px] text-slate-400 uppercase font-black">Total</span>
                  </div>
                </div>
              </div>
              <div className="space-y-1 text-[10px] mt-2">
                {[
                  { name: "Offered", value: 20, pct: "56%", color: "bg-[#4f46e5]" },
                  { name: "Accepted", value: 10, pct: "28%", color: "bg-[#10b981]" },
                  { name: "Declined", value: 4, pct: "11%", color: "bg-[#ef4444]" },
                  { name: "On Hold", value: 2, pct: "5%", color: "bg-[#f59e0b]" }
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <span className={`w-1.5 h-1.5 rounded-full ${item.color}`} />
                      <span className={`font-medium ${isDark ? "text-gray-300" : "text-slate-600"}`}>{item.name}</span>
                    </div>
                    <span className="font-bold">{item.value} ({item.pct})</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Card 3: Gender Diversity */}
            <div className={`p-5 rounded-xl border shadow-sm flex flex-col justify-between ${isDark ? "bg-gray-900 border-gray-800" : "bg-white border-slate-205"}`}>
              <h3 className={`text-sm font-bold ${isDark ? "text-white" : "text-slate-800"}`}>Gender Diversity</h3>

              <div className="flex items-center justify-around my-2 py-1">
                <div className="text-center">
                  <div className={`p-3 rounded-full bg-blue-500/10 text-blue-600 mb-1.5 inline-block`}>
                    <User className="w-6 h-6" />
                  </div>
                  <div className="text-lg font-extrabold text-blue-600">62%</div>
                  <div className="text-[9px] font-bold text-slate-400">Male (992)</div>
                </div>

                <div className="text-center">
                  <div className={`p-3 rounded-full bg-pink-500/10 text-pink-600 mb-1.5 inline-block`}>
                    <User className="w-6 h-6 text-pink-500" />
                  </div>
                  <div className="text-lg font-extrabold text-pink-500">38%</div>
                  <div className="text-[9px] font-bold text-slate-400">Female (608)</div>
                </div>
              </div>

              <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5 overflow-hidden flex mt-1">
                <div className="bg-blue-500 h-full" style={{ width: "62%" }} />
                <div className="bg-pink-500 h-full" style={{ width: "38%" }} />
              </div>

              <div className="mt-3 text-center">
                <span className={`inline-block px-3 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400`}>
                  Total Employees: 1,600
                </span>
              </div>
            </div>

            {/* Card 4: Department Wise Strength */}
            <div className={`p-5 rounded-xl border shadow-sm flex flex-col justify-between ${isDark ? "bg-gray-900 border-gray-800" : "bg-white border-slate-200"}`}>
              <h3 className={`text-sm font-bold mb-2 ${isDark ? "text-white" : "text-slate-800"}`}>Department Wise Strength</h3>

              <div className="space-y-1.5">
                {[
                  { name: "HR", value: 120, max: 450, color: "bg-indigo-600" },
                  { name: "Operations", value: 320, max: 450, color: "bg-blue-500" },
                  { name: "Sales", value: 450, max: 450, color: "bg-emerald-500" },
                  { name: "IT", value: 280, max: 450, color: "bg-cyan-500" },
                  { name: "Finance", value: 180, max: 450, color: "bg-amber-500" },
                  { name: "Admin", value: 150, max: 450, color: "bg-pink-500" }
                ].map((dept, idx) => {
                  const widthPercent = (dept.value / dept.max) * 100;
                  return (
                    <div key={idx} className="space-y-0.5">
                      <div className="flex justify-between text-[10px]">
                        <span className={`font-semibold ${isDark ? "text-gray-300" : "text-slate-600"}`}>{dept.name}</span>
                        <span className="font-bold text-slate-500">{dept.value}</span>
                      </div>
                      <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1 overflow-hidden">
                        <div className={`h-full rounded-full ${dept.color}`} style={{ width: `${widthPercent}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

          {/* Row 3: Footer Stats bar */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { title: "Total Employees", value: "1,600", trend: "★ 12 vs last month", trendUp: true, icon: <Users className="w-4 h-4 text-indigo-500" /> },
              { title: "New Hires (Month)", value: "24", trend: "★ 8 vs last month", trendUp: true, icon: <UserPlus className="w-4 h-4 text-emerald-500" /> },
              { title: "Exits (Month)", value: "6", trend: "▼ 2 vs last month", trendUp: false, icon: <UserMinus className="w-4 h-4 text-rose-500" /> },
              { title: "Attendance Today", value: "1,482", trend: "92% Present", trendUp: true, icon: <CheckCircle className="w-4 h-4 text-blue-500" /> },
              { title: "On Leave Today", value: "118", trend: "7% of total", trendUp: false, icon: <Clock className="w-4 h-4 text-amber-500" /> },
              { title: "Pending Tasks", value: "34", trend: "Requires action", trendUp: false, icon: <AlertTriangle className="w-4 h-4 text-red-500" /> }
            ].map((item, idx) => (
              <div key={idx} className={`p-4 rounded-xl border shadow-sm flex flex-col justify-between ${isDark ? "bg-gray-900 border-gray-800" : "bg-white border-slate-200"}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">{item.title}</span>
                  {item.icon}
                </div>
                <div className={`text-lg font-black ${isDark ? "text-white" : "text-slate-800"}`}>{item.value}</div>
                <div className={`text-[9px] mt-1 font-semibold ${item.trendUp ? "text-emerald-500" : "text-rose-500"}`}>
                  {item.trend}
                </div>
              </div>
            ))}
          </div>

        </div>

        {/* Right Column: Tall Recent HR Activity Card */}
        <div className="xl:col-span-1">
          <div className={`p-6 rounded-xl border shadow-sm h-full flex flex-col justify-between min-h-[500px] ${isDark ? "bg-gray-900 border-gray-800" : "bg-white border-slate-200"}`}>
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className={`text-base font-bold ${isDark ? "text-white" : "text-slate-800"}`}>Recent HR Activity</h2>
                <button
                  onClick={() => onNavigateTab("activity")}
                  className="text-xs font-semibold text-indigo-650 hover:text-indigo-700 dark:text-indigo-400"
                >
                  View All
                </button>
              </div>
              <div className="max-h-[850px] overflow-y-auto pr-1 custom-scrollbar space-y-4">
                <ActivityFeed activities={stats?.hrActivities} dark={isDark} />
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

export function DepartmentDashboard({
  stats,
  onNavigateTab,
  onOpenHiringModal
}: {
  stats: any;
  onNavigateTab: (tab: string) => void;
  onOpenHiringModal?: () => void;
}) {
  const deptStats = stats?.deptStats || {};
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
            Department Head Dashboard
          </h1>
          <p className={`text-sm mt-1 ${isDark ? "text-gray-400" : "text-slate-500"}`}>
            Manager view — team performance, daily tasks, and approvals
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenHiringModal}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm flex items-center gap-2"
          >
            <PlusCircle className="w-4 h-4" /> Add Requirement
          </button>
        </div>
      </div>

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
