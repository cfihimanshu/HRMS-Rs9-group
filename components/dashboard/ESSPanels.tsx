import * as XLSX from "xlsx";
import React, { useState, useEffect, useMemo } from "react";
import {
  CalendarCheck,
  FileText,
  Coins,
  Download,
  Plus,
  Clock,
  TrendingUp,
  AlertCircle,
  Trash2,
  ListTodo,
  ExternalLink,
  FileSpreadsheet,
  Search,
  Check,
  XCircle,
  CheckCircle2,
  RefreshCw,
  Calendar,
  Paperclip,
  X,
  Upload,
  Eye,
  Filter,
  Sparkles,
  Award,
  MapPin
} from "lucide-react";
import StatCard from "./StatCard";

interface ESSProps {
  user: any;
  triggerToast: (msg: string) => void;
  setActiveTab?: (tab: string, filter?: string, userFilter?: string) => void;
  toggleModal?: (modalId: string, open: boolean) => void;
  stats?: any;
}

export function ESSDashboard({ user, triggerToast, setActiveTab, toggleModal, stats }: ESSProps) {
  const [isDark, setIsDark] = React.useState(false);
  const [tasks, setTasks] = React.useState<any[]>([]);
  const [loadingTasks, setLoadingTasks] = React.useState(true);
  const [matrixModal, setMatrixModal] = React.useState<"productivity" | "tasks" | "sod-eod" | "attendance" | null>(null);

  React.useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains("dark"));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  React.useEffect(() => {
    const fetchTasks = async () => {
      try {
        setLoadingTasks(true);
        const res = await fetch("/api/tasks");
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
          setTasks(data.data);
        }
      } catch (err) {
        console.error("Error fetching tasks for ESS dashboard:", err);
      } finally {
        setLoadingTasks(false);
      }
    };
    fetchTasks();
  }, []);

  const userIdentifiers = React.useMemo(() => {
    const ids = new Set<string>();
    if (user?.id) ids.add(String(user.id).toLowerCase().trim());
    if (user?.email) ids.add(String(user.email).toLowerCase().trim());
    if (user?.employeeId) ids.add(String(user.employeeId).toLowerCase().trim());
    if (user?.name) ids.add(String(user.name).toLowerCase().trim());
    return ids;
  }, [user]);

  const isMatchUser = (target: any) => {
    if (!target) return false;
    if (typeof target === "object") {
      const vals = [target.id, target.email, target.employeeId, target.name].filter(Boolean);
      return vals.some(v => userIdentifiers.has(String(v).toLowerCase().trim()));
    }
    return userIdentifiers.has(String(target).toLowerCase().trim());
  };

  const pendingTasks = React.useMemo(() => {
    return tasks.filter((t: any) => {
      const isMyTask = isMatchUser(t.employee) || isMatchUser(t.employeeId) || isMatchUser(t.assignedTo) || isMatchUser(t.forwardedTo);
      const isPending = t.status !== "Completed" && t.status !== "Done" && t.status !== "Approved";
      return isMyTask && isPending;
    });
  }, [tasks, userIdentifiers]);

  const assignedOwnerTasks = React.useMemo(() => {
    return tasks.filter((t: any) => {
      const isMyTask = isMatchUser(t.employee) || isMatchUser(t.employeeId) || isMatchUser(t.assignedTo) || isMatchUser(t.forwardedTo);
      const assignerRole = (t.assignedByUser?.role || t.assignedByRole || "").toLowerCase();
      const assignerName = (t.assignedByUser?.name || t.assignedByName || "").toLowerCase();

      const isAssignedByOwnerOrManager =
        Boolean(t.isAssignedByOwner) ||
        (t.assignedBy && !isMatchUser(t.assignedBy)) ||
        assignerRole.includes("owner") ||
        assignerRole.includes("director") ||
        assignerRole.includes("manager") ||
        assignerName.includes("owner") ||
        assignerName.includes("director");

      return isMyTask && isAssignedByOwnerOrManager;
    });
  }, [tasks, userIdentifiers]);

  const dynamicStats = stats?.currentUserStats || {
    presentDays: 0,
    totalWorkingDays: 26,
    attendancePercent: 100,
    casualLeave: 12,
    sickLeave: 12,
    earnedLeave: 0,
  };

  const totalWorkingDaysCount = (dynamicStats?.totalWorkingDays && Number(dynamicStats.totalWorkingDays) > 1) ? Number(dynamicStats.totalWorkingDays) : 26;

  const myAllTasks = React.useMemo(() => {
    return tasks.filter((t: any) => isMatchUser(t.employee) || isMatchUser(t.employeeId) || isMatchUser(t.assignedTo) || isMatchUser(t.forwardedTo));
  }, [tasks, userIdentifiers]);

  const completedMyTasks = React.useMemo(() => {
    return myAllTasks.filter((t: any) => t.status === "Completed" || t.status === "Done" || t.status === "Approved");
  }, [myAllTasks]);

  const overdueMyTasks = React.useMemo(() => {
    const now = new Date().toISOString();
    return pendingTasks.filter((t: any) => t.deadlineAt && t.deadlineAt < now);
  }, [pendingTasks]);

  const totalTaskCount = myAllTasks.length || 1;
  const completedTaskCount = completedMyTasks.length;
  const taskCompletionRate = Math.min(100, Math.max(0, Math.round((completedTaskCount / totalTaskCount) * 100)));

  const pendingCount = pendingTasks.length;
  const overdueCount = overdueMyTasks.length;
  const onTimeRate = pendingCount > 0 ? Math.max(0, Math.min(100, Math.round(((pendingCount - overdueCount) / pendingCount) * 100))) : 100;

  const attendancePercent = Math.min(100, Math.max(0, Number(dynamicStats.attendancePercent ?? 100)));

  const sodEodRate = Math.min(100, Math.max(0, stats?.currentUserCompliance?.hasSod
    ? (stats?.currentUserCompliance?.hasEod ? 100 : 90)
    : (dynamicStats.presentDays > 0 ? Math.round((dynamicStats.presentDays / totalWorkingDaysCount) * 100) : 85)));

  const performanceScore = Math.min(100, Math.max(0, Math.round(attendancePercent * 0.4 + taskCompletionRate * 0.4 + sodEodRate * 0.2)));

  const pendingCountDisplay = pendingTasks.length;

  return (
    <div className="space-y-7 animate-fade-in text-[#1C1C1A]">
      {/* Top Action Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[9px] uppercase tracking-widest text-indigo-600 font-bold">Employee Self Service</span>
          <h1 className="text-2xl font-light text-[#1C1C1A] tracking-wide font-serif" style={{ fontFamily: "'Playfair Display', serif" }}>
            Welcome, {user?.name || "Employee"}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          {(!stats?.currentUserCompliance?.hasSod) && (
            <button
              onClick={() => toggleModal ? toggleModal("sodModal", true) : setActiveTab?.("attendance")}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg text-xs font-bold tracking-wider uppercase transition-all shadow-sm flex items-center gap-2"
            >
              <Clock className="w-4 h-4" /> Declare SOD
            </button>
          )}
          {(stats?.currentUserCompliance?.hasSod && !stats?.currentUserCompliance?.hasEod) && (
            <button
              onClick={() => toggleModal ? toggleModal("eodModal", true) : setActiveTab?.("attendance")}
              className="bg-[#714B67] hover:bg-[#5F3F56] text-white px-5 py-2.5 rounded-lg text-xs font-bold tracking-wider uppercase transition-all shadow-sm flex items-center gap-2"
            >
              <CalendarCheck className="w-4 h-4" /> Submit EOD
            </button>
          )}
          {(stats?.currentUserCompliance?.hasEod) && (
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-4 py-2 rounded-lg border border-emerald-200/80 flex items-center gap-2 shadow-2xs">
              <CalendarCheck className="w-4 h-4 text-emerald-600" /> Day Completed
            </span>
          )}
        </div>
      </div>

      {/* 4 Core ESS Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 border border-[#E8E4DF] rounded-xl bg-[#FCFBF9] shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-col justify-between">
          <div>
            <div className="text-[9px] uppercase tracking-wider text-[#8C8880] font-bold flex items-center justify-between">
              <span>Present Days (This Month)</span>
              <CalendarCheck className="w-4 h-4 text-indigo-500" />
            </div>
            <div className="text-2xl font-light text-[#1C1C1A] font-serif mt-1 font-mono" style={{ fontFamily: "'Playfair Display', serif" }}>
              {dynamicStats.presentDays ?? 0} <span className="text-xs text-[#8C8880] font-sans">/ {totalWorkingDaysCount}</span>
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-[#E8E4DF]/70 flex items-center justify-between">
            <span className="text-[9px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
              {dynamicStats.attendancePercent ?? 100}% Attendance
            </span>
          </div>
        </div>

        <div
          onClick={() => setActiveTab && setActiveTab("leave-request", "Casual Leave")}
          className="p-4 border border-[#E8E4DF] rounded-xl bg-[#FCFBF9] shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-col justify-between cursor-pointer hover:border-rose-400 hover:scale-[1.01] transition-all group"
        >
          <div>
            <div className="text-[9px] uppercase tracking-wider text-[#8C8880] font-bold flex items-center justify-between">
              <span>Casual Leave Taken</span>
              <FileText className="w-4 h-4 text-rose-500 group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-2xl font-light text-rose-800 font-serif mt-1 font-mono" style={{ fontFamily: "'Playfair Display', serif" }}>
              {dynamicStats.casualLeaveTaken ?? 0}
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-[#E8E4DF]/70 flex items-center justify-between">
            <span className="text-[9px] font-semibold text-[#5D5B57]">
              {(dynamicStats.casualLeave ?? 12) - (dynamicStats.casualLeaveTaken ?? 0)} days remaining
            </span>
          </div>
        </div>

        <div
          onClick={() => setActiveTab && setActiveTab("leave-request", "Sick Leave")}
          className="p-4 border border-[#E8E4DF] rounded-xl bg-[#FCFBF9] shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-col justify-between cursor-pointer hover:border-emerald-400 hover:scale-[1.01] transition-all group"
        >
          <div>
            <div className="text-[9px] uppercase tracking-wider text-[#8C8880] font-bold flex items-center justify-between">
              <span>Sick Leave Taken</span>
              <FileText className="w-4 h-4 text-emerald-500 group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-2xl font-light text-emerald-800 font-serif mt-1 font-mono" style={{ fontFamily: "'Playfair Display', serif" }}>
              {dynamicStats.sickLeaveTaken ?? 0}
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-[#E8E4DF]/70 flex items-center justify-between">
            <span className="text-[9px] font-semibold text-[#5D5B57]">
              {(dynamicStats.sickLeave ?? 12) - (dynamicStats.sickLeaveTaken ?? 0)} days remaining
            </span>
          </div>
        </div>

        <div
          onClick={() => setActiveTab && setActiveTab("tasks", "Pending", user?.name || user?.email)}
          className="p-4 border border-[#E8E4DF] rounded-xl bg-[#FCFBF9] shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-col justify-between cursor-pointer hover:border-amber-400 hover:scale-[1.01] transition-all group"
        >
          <div>
            <div className="text-[9px] uppercase tracking-wider text-[#8C8880] font-bold flex items-center justify-between">
              <span>Pending Tasks</span>
              <ListTodo className="w-4 h-4 text-amber-500 group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-2xl font-light text-amber-800 font-serif mt-1 font-mono" style={{ fontFamily: "'Playfair Display', serif" }}>
              {pendingCountDisplay}
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-[#E8E4DF]/70 flex items-center justify-between">
            <span className={`text-[9px] font-semibold ${pendingCountDisplay > 0 ? "text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-100" : "text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100"}`}>
              {pendingCountDisplay > 0 ? `${pendingCountDisplay} tasks requiring action` : "All tasks completed"}
            </span>
          </div>
        </div>
      </div>

      {/* Performance Matrix, Quick Actions & Requests Tracker 3-Section Row */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-stretch">
        {/* Section 1: User Performance & Productivity Matrix Panel (Left 5 cols) */}
        <div className="xl:col-span-5 bg-[#FCFBF9] border border-[#E8E4DF] rounded-2xl p-4 sm:p-4.5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-3 flex flex-col justify-between h-full">
          <div className="border-b border-[#E8E4DF]/70 pb-2.5">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-indigo-600" />
              <h2 className="text-sm font-bold text-slate-900 font-serif" style={{ fontFamily: "'Playfair Display', serif" }}>
                Performance & Productivity Matrix
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 flex-1">
            {/* Productivity Index */}
            <div className="bg-gradient-to-br from-indigo-50/90 to-purple-50/40 border border-indigo-100/90 rounded-xl p-3 flex flex-col justify-between shadow-2xs">
              <div className="text-[9px] uppercase tracking-wider text-indigo-900 font-extrabold flex items-center justify-between">
                <span>Productivity Index</span>
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              </div>
              <div className="my-1.5 flex items-baseline justify-between">
                <span className="text-xl font-bold text-indigo-950 font-mono">{performanceScore}%</span>
              </div>
              <div className="w-full bg-indigo-200/60 rounded-full h-1 overflow-hidden">
                <div className="bg-indigo-600 h-full rounded-full transition-all duration-500" style={{ width: `${performanceScore}%` }}></div>
              </div>
            </div>

            {/* Task Completion Rate */}
            <div
              onClick={() => setMatrixModal("tasks")}
              className="bg-emerald-50/70 border border-emerald-100 hover:border-emerald-400 rounded-xl p-3 flex flex-col justify-between shadow-2xs hover:shadow-md hover:scale-[1.02] transition-all cursor-pointer group"
            >
              <div className="text-[9px] uppercase tracking-wider text-emerald-900 font-extrabold flex items-center justify-between">
                <span>Task Completion Rate</span>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 group-hover:scale-110 transition-transform" />
              </div>
              <div className="my-1.5 flex items-baseline justify-between">
                <span className="text-xl font-bold text-emerald-950 font-mono">{taskCompletionRate}%</span>
                <span className="text-[9px] font-bold text-emerald-800">
                  {completedTaskCount} / {totalTaskCount} Done
                </span>
              </div>
              <div className="w-full bg-emerald-200/60 rounded-full h-1 overflow-hidden">
                <div className="bg-emerald-600 h-full rounded-full transition-all duration-500" style={{ width: `${taskCompletionRate}%` }}></div>
              </div>
            </div>

            {/* SOD & EOD Compliance */}
            <div
              onClick={() => setMatrixModal("sod-eod")}
              className="bg-blue-50/70 border border-blue-100 hover:border-blue-400 rounded-xl p-3 flex flex-col justify-between shadow-2xs hover:shadow-md hover:scale-[1.02] transition-all cursor-pointer group"
            >
              <div className="text-[9px] uppercase tracking-wider text-blue-900 font-extrabold flex items-center justify-between">
                <span>SOD & EOD Compliance</span>
                <Clock className="w-3.5 h-3.5 text-blue-600 group-hover:rotate-12 transition-transform" />
              </div>
              <div className="my-1.5 flex items-baseline justify-between">
                <span className="text-xl font-bold text-blue-950 font-mono">
                  {stats?.currentUserCompliance?.hasEod ? "2 / 2" : (stats?.currentUserCompliance?.hasSod ? "1 / 2" : "0 / 2")}
                </span>
                <span className="text-[9px] font-bold text-blue-800">
                  {stats?.currentUserCompliance?.hasSod ? (stats?.currentUserCompliance?.hasEod ? "SOD & EOD Done ✓" : "SOD Done • EOD Due") : "SOD Pending"}
                </span>
              </div>
              <div className="w-full bg-blue-200/60 rounded-full h-1 overflow-hidden">
                <div className="bg-blue-600 h-full rounded-full transition-all duration-500" style={{ width: `${sodEodRate}%` }}></div>
              </div>
            </div>

            {/* Attendance Score */}
            <div
              onClick={() => setMatrixModal("attendance")}
              className="bg-amber-50/70 border border-amber-100 hover:border-amber-400 rounded-xl p-3 flex flex-col justify-between shadow-2xs hover:shadow-md hover:scale-[1.02] transition-all cursor-pointer group"
            >
              <div className="text-[9px] uppercase tracking-wider text-amber-900 font-extrabold flex items-center justify-between">
                <span>Attendance Count</span>
                <CalendarCheck className="w-3.5 h-3.5 text-amber-600 group-hover:scale-110 transition-transform" />
              </div>
              <div className="my-1.5 flex items-baseline justify-between">
                <span className="text-xl font-bold text-amber-950 font-mono">
                  {dynamicStats.presentDays ?? 0} / {totalWorkingDaysCount}
                </span>
                <span className="text-[9px] font-bold text-amber-800">
                  Days Present
                </span>
              </div>
              <div className="w-full bg-amber-200/60 rounded-full h-1 overflow-hidden">
                <div className="bg-amber-600 h-full rounded-full transition-all duration-500" style={{ width: `${attendancePercent}%` }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Quick Actions Panel (Middle 4 cols) */}
        <div className="xl:col-span-4 bg-[#FCFBF9] border border-[#E8E4DF] rounded-2xl p-4 sm:p-4.5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-3 flex flex-col justify-between h-full">
          <div className="flex-1 flex flex-col justify-between">
            <h2 className="text-xs font-semibold tracking-widest text-[#1C1C1A] uppercase border-b border-[#E8E4DF]/70 pb-2.5 mb-3">
              Quick Actions
            </h2>
            <div className="grid grid-cols-3 gap-2.5 flex-1">
              <button
                onClick={() => setActiveTab && setActiveTab("leave-request")}
                className="p-3 border border-[#E8E4DF] bg-white rounded-xl hover:bg-[#FAF9F5] hover:border-indigo-400 transition-all text-center flex flex-col items-center justify-center gap-1.5 group shadow-2xs cursor-pointer h-full"
              >
                <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                  <CalendarCheck className="w-4 h-4" />
                </div>
                <span className="font-semibold text-[#1C1C1A] text-[10px] group-hover:text-indigo-600 transition-colors">Apply Leave</span>
              </button>

              <button
                onClick={() => setActiveTab && setActiveTab("tasks", "Pending", user?.name || user?.email)}
                className="p-3 border border-[#E8E4DF] bg-white rounded-xl hover:bg-[#FAF9F5] hover:border-emerald-400 transition-all text-center flex flex-col items-center justify-center gap-1.5 group shadow-2xs cursor-pointer h-full"
              >
                <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-all">
                  <ListTodo className="w-4 h-4" />
                </div>
                <span className="font-semibold text-[#1C1C1A] text-[10px] group-hover:text-emerald-600 transition-colors">My Tasks</span>
              </button>

              <button
                onClick={() => setActiveTab && setActiveTab("performance")}
                className="p-3 border border-[#E8E4DF] bg-white rounded-xl hover:bg-[#FAF9F5] hover:border-purple-400 transition-all text-center flex flex-col items-center justify-center gap-1.5 group shadow-2xs cursor-pointer h-full"
              >
                <div className="p-2 rounded-lg bg-purple-50 text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-all">
                  <FileText className="w-4 h-4" />
                </div>
                <span className="font-semibold text-[#1C1C1A] text-[10px] group-hover:text-purple-600 transition-colors">Work Report</span>
              </button>

              <button
                onClick={() => setActiveTab && setActiveTab("field-visit")}
                className="p-3 border border-[#E8E4DF] bg-white rounded-xl hover:bg-[#FAF9F5] hover:border-amber-400 transition-all text-center flex flex-col items-center justify-center gap-1.5 group shadow-2xs cursor-pointer h-full"
              >
                <div className="p-2 rounded-lg bg-amber-50 text-amber-600 group-hover:bg-amber-600 group-hover:text-white transition-all">
                  <MapPin className="w-4 h-4" />
                </div>
                <span className="font-semibold text-[#1C1C1A] text-[10px] group-hover:text-amber-600 transition-colors">Field Visit Logs</span>
              </button>

              <button
                onClick={() => {
                  if (setActiveTab) {
                    setActiveTab("leave-request");
                    setTimeout(() => {
                      const el = document.getElementById("absent-fines-section");
                      if (el) el.scrollIntoView({ behavior: "smooth" });
                    }, 350);
                  }
                }}
                className="p-3 border border-rose-200/80 bg-rose-50/40 rounded-xl hover:bg-rose-100/70 hover:border-rose-400 transition-all text-center flex flex-col items-center justify-center gap-1.5 group shadow-2xs cursor-pointer h-full"
              >
                <div className="p-2 rounded-lg bg-rose-100 text-rose-700 group-hover:bg-rose-600 group-hover:text-white transition-all">
                  <AlertCircle className="w-4 h-4" />
                </div>
                <span className="font-bold text-rose-900 text-[10px] group-hover:text-rose-700 transition-colors">Absent Fines</span>
              </button>

              <button
                onClick={() => toggleModal ? toggleModal(!stats?.currentUserCompliance?.hasSod ? "sodModal" : "eodModal", true) : setActiveTab?.("attendance")}
                className="p-3 border border-blue-200/80 bg-blue-50/40 rounded-xl hover:bg-blue-100/70 hover:border-blue-400 transition-all text-center flex flex-col items-center justify-center gap-1.5 group shadow-2xs cursor-pointer h-full"
              >
                <div className="p-2 rounded-lg bg-blue-100 text-blue-700 group-hover:bg-blue-600 group-hover:text-white transition-all">
                  <Clock className="w-4 h-4" />
                </div>
                <span className="font-bold text-blue-900 text-[10px] group-hover:text-blue-700 transition-colors">Fill SOD/EOD</span>
              </button>
            </div>
          </div>
        </div>

        {/* Section 3: My Requests & Approvals Status Tracker (Right 3 cols) */}
        <div className="xl:col-span-3 bg-[#FCFBF9] border border-[#E8E4DF] rounded-2xl p-4 sm:p-4.5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-3 flex flex-col justify-between h-full">
          <div className="flex-1 flex flex-col justify-between">
            <div className="flex items-center justify-between border-b border-[#E8E4DF]/70 pb-2.5 mb-2.5">
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-indigo-600" />
                <h2 className="text-xs font-semibold tracking-widest text-[#1C1C1A] uppercase">
                  Requests Tracker
                </h2>
              </div>
              <span className="text-[9px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">Live</span>
            </div>

            <div className="space-y-2 flex-1 flex flex-col justify-between">
              {/* Leave Requests */}
              <div
                onClick={() => setActiveTab && setActiveTab("leave-request")}
                className="p-2.5 bg-white border border-[#E8E4DF] rounded-xl hover:border-indigo-300 transition-all cursor-pointer flex items-center justify-between group shadow-2xs flex-1"
              >
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                    <CalendarCheck className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="text-[11px] font-bold text-[#1C1C1A]">Leave Application</div>
                    <div className="text-[9px] text-slate-500">Casual / Sick Leave</div>
                  </div>
                </div>
                <span className="text-[9px] font-extrabold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  Pending
                </span>
              </div>

              {/* Expense Claims */}
              <div
                onClick={() => setActiveTab && setActiveTab("ess-expenses")}
                className="p-2.5 bg-white border border-[#E8E4DF] rounded-xl hover:border-amber-300 transition-all cursor-pointer flex items-center justify-between group shadow-2xs flex-1"
              >
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600 group-hover:bg-amber-600 group-hover:text-white transition-all">
                    <Coins className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="text-[11px] font-bold text-[#1C1C1A]">Expense Claims</div>
                    <div className="text-[9px] text-slate-500">Reimbursement</div>
                  </div>
                </div>
                <span className="text-[9px] font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Approved
                </span>
              </div>

              {/* Asset Requests */}
              <div
                onClick={() => setActiveTab && setActiveTab("asset-request")}
                className="p-2.5 bg-white border border-[#E8E4DF] rounded-xl hover:border-purple-300 transition-all cursor-pointer flex items-center justify-between group shadow-2xs flex-1"
              >
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-purple-50 text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-all">
                    <FileText className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="text-[11px] font-bold text-[#1C1C1A]">Asset Request</div>
                    <div className="text-[9px] text-slate-500">Equipment & Devices</div>
                  </div>
                </div>
                <span className="text-[9px] font-extrabold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  Active
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Grid Split Section: My Pending Tasks (50%) | Owner / Manager Assigned Tasks (50%) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Left Half (50%): My Pending Tasks */}
        <div className={`p-5 rounded-xl border shadow-sm flex flex-col justify-start ${isDark ? "bg-gray-900 border-gray-800" : "bg-white border-slate-200"}`}>
          <div className="flex items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100 dark:border-gray-800">
            <div className="flex items-center gap-2">
              <h2 className={`text-base font-bold ${isDark ? "text-white" : "text-slate-800"}`}>
                Pending Tasks
              </h2>
              <span className="bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 px-2 py-0.5 rounded-full text-[10px] font-black">
                {pendingTasks.length} Pending
              </span>
            </div>
            {setActiveTab && (
              <button
                onClick={() => setActiveTab("tasks", "Pending", user?.name || user?.email)}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 flex items-center gap-1"
              >
                Kanban <ExternalLink className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {loadingTasks ? (
            <div className="py-12 text-center text-slate-400 text-xs italic">Loading pending tasks...</div>
          ) : pendingTasks.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs italic bg-slate-50 dark:bg-gray-800/40 rounded-xl border border-dashed border-slate-200 dark:border-gray-700">
              🎉 You have no pending tasks right now.
            </div>
          ) : (
            <div className="overflow-x-auto overflow-y-auto max-h-[340px] pr-1 custom-scrollbar">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="sticky top-0 z-10">
                  <tr className={`border-b text-slate-800 dark:text-slate-200 font-black uppercase font-mono tracking-wider text-[10px] ${isDark ? "bg-gray-900 border-gray-800" : "bg-white border-slate-200"}`}>
                    <th className="py-2 px-2">Task ID</th>
                    <th className="py-2 px-2">Task Title & Details</th>
                    <th className="py-2 px-2">Type</th>
                    <th className="py-2 px-2">Status</th>
                    <th className="py-2 px-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className={`divide-y font-semibold ${isDark ? "divide-gray-800/60 text-gray-300" : "divide-slate-100 text-slate-700"}`}>
                  {pendingTasks.map((task: any) => (
                    <tr key={task.id} className={`hover:bg-slate-50/80 dark:hover:bg-gray-800/40 transition-colors ${isDark ? "border-b border-gray-800/50" : "border-b border-slate-100"}`}>
                      <td className="py-2.5 px-2 whitespace-nowrap">
                        <span className="font-mono font-black text-[10px] text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 px-1.5 py-0.5 rounded border border-indigo-100 dark:border-indigo-900/50">
                          {task.id}
                        </span>
                      </td>
                      <td className="py-2.5 px-2 max-w-[170px]">
                        <div className="font-bold text-slate-900 dark:text-slate-100 truncate text-xs">{task.taskTitle}</div>
                        {task.description && (
                          <div className="text-[10px] text-slate-500 dark:text-gray-400 truncate mt-0.5 font-normal">
                            {task.description}
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-2 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-gray-800 text-slate-700 dark:text-gray-300 border border-slate-200 dark:border-gray-700">
                          {task.taskType || "General"}
                        </span>
                      </td>
                      <td className="py-2.5 px-2 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${task.status === "In Progress"
                          ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800"
                          : task.status === "Pending Approval"
                            ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800"
                            : "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-800"
                          }`}>
                          {task.status || "Pending"}
                        </span>
                      </td>
                      <td className="py-2.5 px-2 text-right whitespace-nowrap">
                        {setActiveTab && (
                          <button
                            onClick={() => setActiveTab("tasks", task.id, user?.name || user?.email)}
                            className="px-2 py-1 text-[10px] font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:hover:bg-indigo-900/60 dark:text-indigo-300 rounded border border-indigo-200 dark:border-indigo-800 transition-all shadow-xs inline-flex items-center gap-0.5 hover:scale-105"
                          >
                            Kanban <ExternalLink className="w-3 h-3" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right Half (50%): Tasks Assigned By Owner / Manager */}
        <div className={`p-5 rounded-xl border shadow-sm flex flex-col justify-start ${isDark ? "bg-gray-900 border-gray-800" : "bg-white border-slate-200"}`}>
          <div className="flex items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100 dark:border-gray-800">
            <div className="flex items-center gap-2">
              <h2 className={`text-base font-bold ${isDark ? "text-white" : "text-slate-800"}`}>
                Tasks Assigned by Owner / Manager
              </h2>
              <span className="bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 px-2 py-0.5 rounded-full text-[10px] font-black">
                {assignedOwnerTasks.length} Assigned
              </span>
            </div>
            {setActiveTab && (
              <button
                onClick={() => setActiveTab("tasks", "Pending", user?.name || user?.email)}
                className="text-xs font-bold text-purple-600 hover:text-purple-700 dark:text-purple-400 flex items-center gap-1"
              >
                View All <ExternalLink className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {loadingTasks ? (
            <div className="py-12 text-center text-slate-400 text-xs italic">Loading assigned tasks...</div>
          ) : assignedOwnerTasks.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs italic bg-slate-50 dark:bg-gray-800/40 rounded-xl border border-dashed border-slate-200 dark:border-gray-700">
              📌 No tasks assigned by Owner / Manager right now.
            </div>
          ) : (
            <div className="overflow-x-auto overflow-y-auto max-h-[340px] pr-1 custom-scrollbar">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="sticky top-0 z-10">
                  <tr className={`border-b text-slate-800 dark:text-slate-200 font-black uppercase font-mono tracking-wider text-[10px] ${isDark ? "bg-gray-900 border-gray-800" : "bg-white border-slate-200"}`}>
                    <th className="py-2 px-2">Task ID</th>
                    <th className="py-2 px-2">Assigned By</th>
                    <th className="py-2 px-2">Task Title</th>
                    <th className="py-2 px-2">Status</th>
                    <th className="py-2 px-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className={`divide-y font-semibold ${isDark ? "divide-gray-800/60 text-gray-300" : "divide-slate-100 text-slate-700"}`}>
                  {assignedOwnerTasks.map((task: any) => (
                    <tr key={task.id} className={`hover:bg-slate-50/80 dark:hover:bg-gray-800/40 transition-colors ${isDark ? "border-b border-gray-800/50" : "border-b border-slate-100"}`}>
                      <td className="py-2.5 px-2 whitespace-nowrap">
                        <span className="font-mono font-black text-[10px] text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/50 px-1.5 py-0.5 rounded border border-purple-100 dark:border-purple-900/50">
                          {task.id}
                        </span>
                      </td>
                      <td className="py-2.5 px-2 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800 flex items-center gap-1 w-max">
                          👑 {task.assignedByUser?.name || task.assignedByName || "Owner"}
                        </span>
                      </td>
                      <td className="py-2.5 px-2 max-w-[150px]">
                        <div className="font-bold text-slate-900 dark:text-slate-100 truncate text-xs">{task.taskTitle}</div>
                      </td>
                      <td className="py-2.5 px-2 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${task.status === "In Progress"
                          ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800"
                          : task.status === "Completed"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800"
                            : "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-800"
                          }`}>
                          {task.status || "Pending"}
                        </span>
                      </td>
                      <td className="py-2.5 px-2 text-right whitespace-nowrap">
                        {setActiveTab && (
                          <button
                            onClick={() => setActiveTab("tasks", task.id, user?.name || user?.email)}
                            className="px-2 py-1 text-[10px] font-bold bg-purple-50 hover:bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:hover:bg-purple-900/60 dark:text-purple-300 rounded border border-purple-200 dark:border-purple-800 transition-all shadow-xs inline-flex items-center gap-0.5 hover:scale-105"
                          >
                            View <ExternalLink className="w-3 h-3" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>

      {/* Performance Matrix Detail Popup Modal */}
      {matrixModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl border border-[#E8E4DF] shadow-2xl max-w-md w-full overflow-hidden space-y-0">
            {/* Modal Header */}
            <div className="p-4 border-b border-[#E8E4DF] bg-[#FAF9F5] flex items-center justify-between">
              <div className="flex items-center gap-2">
                {matrixModal === "productivity" && <Sparkles className="w-5 h-5 text-indigo-600" />}
                {matrixModal === "tasks" && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
                {matrixModal === "sod-eod" && <Clock className="w-5 h-5 text-blue-600" />}
                {matrixModal === "attendance" && <CalendarCheck className="w-5 h-5 text-amber-600" />}
                <h3 className="text-sm font-bold text-[#1C1C1A]">
                  {matrixModal === "tasks" && "Task Completion Rate Details"}
                  {matrixModal === "sod-eod" && "SOD & EOD Compliance Tracker"}
                  {matrixModal === "attendance" && "Attendance & Leaves Summary"}
                </h3>
              </div>
              <button
                onClick={() => setMatrixModal(null)}
                className="p-1 rounded-lg hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4">

              {/* Task Completion Popup */}
              {matrixModal === "tasks" && (
                <div className="space-y-4">
                  <div className="p-3.5 bg-emerald-50/70 border border-emerald-100 rounded-xl flex items-center justify-between">
                    <div>
                      <div className="text-[10px] uppercase font-bold text-emerald-800 tracking-wider">Completion Rate</div>
                      <div className="text-2xl font-black text-emerald-950 font-mono mt-0.5">{taskCompletionRate}%</div>
                    </div>
                    <span className="text-[10px] font-extrabold text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full border border-emerald-200">
                      {completedTaskCount} of {totalTaskCount} Done
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-center">
                      <div className="text-[9px] uppercase font-bold text-slate-500">Total Tasks</div>
                      <div className="text-lg font-bold text-slate-900 font-mono mt-1">{totalTaskCount}</div>
                    </div>

                    <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-center">
                      <div className="text-[9px] uppercase font-bold text-emerald-700">Completed</div>
                      <div className="text-lg font-bold text-emerald-900 font-mono mt-1">{completedTaskCount}</div>
                    </div>

                    <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl text-center">
                      <div className="text-[9px] uppercase font-bold text-amber-700">Pending</div>
                      <div className="text-lg font-bold text-amber-900 font-mono mt-1">{pendingCount}</div>
                    </div>

                    <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-center">
                      <div className="text-[9px] uppercase font-bold text-rose-700">Overdue</div>
                      <div className="text-lg font-bold text-rose-900 font-mono mt-1">{overdueCount}</div>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setMatrixModal(null);
                      if (setActiveTab) setActiveTab("tasks", "Pending", user?.name || user?.email);
                    }}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs transition-all shadow-xs cursor-pointer text-center"
                  >
                    View All My Pending Tasks →
                  </button>
                </div>
              )}

              {/* SOD & EOD Compliance Popup */}
              {matrixModal === "sod-eod" && (
                <div className="space-y-4">
                  <div className="p-3.5 bg-blue-50/70 border border-blue-100 rounded-xl flex items-center justify-between">
                    <div>
                      <div className="text-[10px] uppercase font-bold text-blue-800 tracking-wider">Today's Declaration</div>
                      <div className="text-xl font-bold text-blue-950 font-mono mt-0.5">
                        {stats?.currentUserCompliance?.hasEod ? "2 / 2 (SOD & EOD Done ✓)" : (stats?.currentUserCompliance?.hasSod ? "1 / 2 (SOD Done, EOD Pending)" : "0 / 2 (SOD Pending)")}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2.5 text-xs">
                    <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between">
                      <div>
                        <div className="font-bold text-slate-800">Start of Day (SOD)</div>
                        <div className="text-[10px] text-slate-500">Plan tasks for the workday</div>
                      </div>
                      <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full border ${stats?.currentUserCompliance?.hasSod ? "bg-emerald-100 text-emerald-800 border-emerald-200" : "bg-amber-100 text-amber-800 border-amber-200"}`}>
                        {stats?.currentUserCompliance?.hasSod ? "Filed ✓" : "Pending"}
                      </span>
                    </div>

                    <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between">
                      <div>
                        <div className="font-bold text-slate-800">End of Day (EOD)</div>
                        <div className="text-[10px] text-slate-500">Log completed work summary</div>
                      </div>
                      <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full border ${stats?.currentUserCompliance?.hasEod ? "bg-emerald-100 text-emerald-800 border-emerald-200" : "bg-blue-100 text-blue-800 border-blue-200"}`}>
                        {stats?.currentUserCompliance?.hasEod ? "Submitted ✓" : "Due at Logout"}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {(!stats?.currentUserCompliance?.hasSod) && (
                      <button
                        onClick={() => {
                          setMatrixModal(null);
                          if (toggleModal) toggleModal("sodModal", true);
                        }}
                        className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs transition-all shadow-xs cursor-pointer text-center"
                      >
                        Declare SOD Now
                      </button>
                    )}
                    {(stats?.currentUserCompliance?.hasSod && !stats?.currentUserCompliance?.hasEod) && (
                      <button
                        onClick={() => {
                          setMatrixModal(null);
                          if (toggleModal) toggleModal("eodModal", true);
                        }}
                        className="flex-1 py-2.5 bg-[#714B67] hover:bg-[#5F3F56] text-white rounded-xl font-bold text-xs transition-all shadow-xs cursor-pointer text-center"
                      >
                        Submit EOD Now
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Attendance Count Popup */}
              {matrixModal === "attendance" && (
                <div className="space-y-4">
                  <div className="p-3.5 bg-amber-50/70 border border-amber-100 rounded-xl flex items-center justify-between">
                    <div>
                      <div className="text-[10px] uppercase font-bold text-amber-800 tracking-wider">Attendance Count</div>
                      <div className="text-2xl font-black text-amber-950 font-mono mt-0.5">
                        {dynamicStats.presentDays ?? 0} / {totalWorkingDaysCount} Days
                      </div>
                    </div>
                    <span className="text-[10px] font-extrabold text-amber-800 bg-amber-100 px-3 py-1 rounded-full border border-amber-200">
                      {attendancePercent}% Attendance
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-center">
                      <div className="text-[9px] uppercase font-bold text-rose-700">Casual Leave Taken</div>
                      <div className="text-lg font-bold text-rose-900 font-mono mt-1">
                        {dynamicStats.casualLeaveTaken || 0} / 12 Days
                      </div>
                    </div>

                    <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-center">
                      <div className="text-[9px] uppercase font-bold text-emerald-700">Sick Leave Taken</div>
                      <div className="text-lg font-bold text-emerald-900 font-mono mt-1">
                        {dynamicStats.sickLeaveTaken || 0} / 12 Days
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setMatrixModal(null);
                      if (setActiveTab) setActiveTab("leave-request");
                    }}
                    className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-xs transition-all shadow-xs cursor-pointer text-center"
                  >
                    Apply Leave Request →
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function ESSLeaves({ user, triggerToast, stats, initialSearchFilter }: ESSProps & { initialSearchFilter?: string }) {
  const [showApply, setShowApply] = useState(false);
  const [leaves, setLeaves] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [allEmployees, setAllEmployees] = useState<any[]>([]);

  // Filter States
  const [searchTerm, setSearchTerm] = useState(initialSearchFilter || "");
  const [filterUser, setFilterUser] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [datePreset, setDatePreset] = useState<"current_month" | "last_month" | "all" | "custom">("all");
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");

  useEffect(() => {
    if (initialSearchFilter !== undefined) {
      setSearchTerm(initialSearchFilter);
    }
  }, [initialSearchFilter]);

  const userRole = (user?.role || "").toLowerCase();
  const isOwnerOrHR = ["owner", "director", "hr head", "hr executive", "admin", "super admin", "manager"].some(r => userRole.includes(r));

  useEffect(() => {
    if (isOwnerOrHR) {
      fetch("/api/employees?all=true")
        .then(res => res.json())
        .then(data => {
          if (data.success && Array.isArray(data.data)) {
            setAllEmployees(data.data);
          }
        })
        .catch(err => console.error("Failed to load employees list for leave filters:", err));
    }
  }, [isOwnerOrHR]);

  const fetchLeaves = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/leaves");
      const data = await res.json();
      if (data.success) {
        setLeaves(data.data || []);
      }
    } catch (err) {
      console.error("Error fetching leaves:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaves();
  }, []);

  const parseLeaveDate = (dStr: any): Date | null => {
    if (!dStr) return null;
    if (dStr instanceof Date) return isNaN(dStr.getTime()) ? null : dStr;
    const str = String(dStr).trim();
    if (!str || str === "Invalid date" || str === "null" || str === "undefined") return null;

    if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
      const parts = str.slice(0, 10).split("-");
      const year = Number(parts[0]);
      const month = Number(parts[1]) - 1;
      const day = Number(parts[2]);
      if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
        return new Date(year, month, day);
      }
    }

    if (/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}/.test(str)) {
      const parts = str.split(/[\/\-]/);
      const p1 = Number(parts[0]);
      const p2 = Number(parts[1]);
      const year = Number(parts[2]);
      let day = p1;
      let month = p2 - 1;
      if (p2 > 12) {
        day = p2;
        month = p1 - 1;
      }
      return new Date(year, month, day);
    }

    const dObj = new Date(str);
    if (isNaN(dObj.getTime())) return null;
    return new Date(dObj.getFullYear(), dObj.getMonth(), dObj.getDate());
  };

  const [showFilters, setShowFilters] = useState(false);

  const uniqueUsersFromLeaves = useMemo(() => {
    const map = new Map<string, { id: string; name: string; email?: string; status?: string }>();
    if (allEmployees.length > 0) {
      allEmployees.forEach((emp: any) => {
        const id = String(emp.id || emp._id || "");
        const name = emp.name || emp.email || `User #${id}`;
        const status = (emp.status || "active").toLowerCase();
        if (id) map.set(id, { id, name, email: emp.email, status });
      });
    }
    leaves.forEach((l: any) => {
      const emp = l.employee || l.user;
      if (emp) {
        const id = typeof emp === "object" ? String(emp.id || emp._id || emp.user || "") : String(emp);
        const name = typeof emp === "object" ? (emp.name || emp.email || `User #${id}`) : `User #${id}`;
        const email = typeof emp === "object" ? emp.email : "";
        const status = typeof emp === "object" ? ((emp.status || "active").toLowerCase()) : "active";
        if (id && !map.has(id)) {
          map.set(id, { id, name, email, status });
        }
      }
    });

    const allList = Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
    const activeList = allList.filter(u => !["inactive", "archived", "terminated", "disabled", "exited"].includes(u.status || "active"));
    const inactiveList = allList.filter(u => ["inactive", "archived", "terminated", "disabled", "exited"].includes(u.status || "active"));

    return { activeList, inactiveList, allList };
  }, [leaves, allEmployees]);

  const filteredLeaves = useMemo(() => {
    return leaves.filter((l: any) => {
      // 1. Search Term
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase().trim();
        const empName = (l.employee?.name || l.user?.name || "").toLowerCase();
        const empEmail = (l.employee?.email || l.user?.email || "").toLowerCase();
        const leaveType = (l.type || "").toLowerCase();
        const reason = (l.reason || "").toLowerCase();
        if (!empName.includes(term) && !empEmail.includes(term) && !leaveType.includes(term) && !reason.includes(term)) {
          return false;
        }
      }

      // 2. User Filter
      if (filterUser !== "") {
        const empId = typeof l.employee === "object" && l.employee !== null
          ? String(l.employee.id || l.employee._id || l.employee.user || "")
          : String(l.employee || l.user || l.employeeId || "");
        if (empId !== String(filterUser)) {
          return false;
        }
      }

      // 3. Status Filter
      if (filterStatus !== "All") {
        if (filterStatus === "Pending") {
          if (!["Pending", "Pending Manager Approval", "Pending HR Approval"].includes(l.status)) {
            return false;
          }
        } else if (l.status !== filterStatus) {
          return false;
        }
      }

      // 4. Date Filter
      const sDate = parseLeaveDate(l.startDate) || parseLeaveDate(l.createdAt);
      const eDate = parseLeaveDate(l.endDate) || sDate;

      if (sDate && eDate) {
        const leaveStart = new Date(sDate.getFullYear(), sDate.getMonth(), sDate.getDate(), 0, 0, 0, 0);
        const leaveEnd = new Date(eDate.getFullYear(), eDate.getMonth(), eDate.getDate(), 23, 59, 59, 999);
        const now = new Date();

        if (datePreset === "current_month") {
          const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
          const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
          if (leaveEnd < startOfMonth || leaveStart > endOfMonth) return false;
        } else if (datePreset === "last_month") {
          const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
          const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
          if (leaveEnd < startOfLastMonth || leaveStart > endOfLastMonth) return false;
        } else if (datePreset === "custom") {
          if (filterStartDate) {
            const customStart = parseLeaveDate(filterStartDate) || new Date(filterStartDate);
            customStart.setHours(0, 0, 0, 0);
            if (leaveEnd < customStart) return false;
          }
          if (filterEndDate) {
            const customEnd = parseLeaveDate(filterEndDate) || new Date(filterEndDate);
            customEnd.setHours(23, 59, 59, 999);
            if (leaveStart > customEnd) return false;
          }
        }
      }

      return true;
    });
  }, [leaves, filterUser, filterStatus, datePreset, filterStartDate, filterEndDate, searchTerm]);

  const hasMultipleUsersInLeaves = useMemo(() => {
    if (uniqueUsersFromLeaves.allList.length > 1) return true;
    const userIds = new Set(leaves.map(l => typeof l.employee === "object" ? l.employee?.id : (l.employee || l.user)));
    return userIds.size > 1 || isOwnerOrHR;
  }, [leaves, uniqueUsersFromLeaves, isOwnerOrHR]);

  const isFilterActive = searchTerm || filterUser || filterStatus !== "All" || datePreset !== "all" || filterStartDate || filterEndDate;

  return (
    <div className="space-y-6 animate-fadeIn text-slate-800">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-slate-800">Leave Management</h1>
          <p className="text-xs text-slate-500 mt-1">Apply for leaves and track your approval status.</p>
        </div>
        <button
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-lg text-xs font-bold shadow-md flex items-center gap-2"
          onClick={() => setShowApply(!showApply)}
        >
          {showApply ? "View History" : <><Plus className="w-4 h-4" /> Apply Leave</>}
        </button>
      </div>

      {showApply ? (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm max-w-2xl">
          <h2 className="text-sm font-black text-slate-800 mb-4">New Leave Request</h2>
          <form className="space-y-4" onSubmit={async (e) => {
            e.preventDefault();
            const form = e.target as HTMLFormElement;
            try {
              const res = await fetch("/api/leaves", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  type: (form.elements.namedItem("type") as HTMLSelectElement).value,
                  days: Number((form.elements.namedItem("days") as HTMLInputElement).value),
                  startDate: (form.elements.namedItem("startDate") as HTMLInputElement).value,
                  endDate: (form.elements.namedItem("endDate") as HTMLInputElement).value,
                  reason: (form.elements.namedItem("reason") as HTMLTextAreaElement).value
                })
              });
              const data = await res.json();
              if (data.success) {
                triggerToast("Leave request submitted successfully.");
                setShowApply(false);
                fetchLeaves();
              } else {
                triggerToast("Failed: " + data.error);
              }
            } catch (err) {
              triggerToast("Error submitting leave request.");
            }
          }}>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] uppercase font-black text-slate-400 font-mono">Leave Type</label>
                <select name="type" className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded text-xs mt-1" required>
                  <option value="Casual Leave">Casual Leave</option>
                  <option value="Sick Leave">Sick Leave</option>
                  <option value="Earned Leave">Earned Leave</option>
                  <option value="Unpaid Leave">Loss of Pay / Unpaid Leave</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] uppercase font-black text-slate-400 font-mono">Duration (Days)</label>
                <input name="days" type="number" className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded text-xs mt-1" placeholder="e.g. 1" required min="0.5" step="0.5" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] uppercase font-black text-slate-400 font-mono">From Date</label>
                <input name="startDate" type="date" className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded text-xs mt-1" required />
              </div>
              <div>
                <label className="text-[10px] uppercase font-black text-slate-400 font-mono">To Date</label>
                <input name="endDate" type="date" className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded text-xs mt-1" required />
              </div>
            </div>
            <div>
              <label className="text-[10px] uppercase font-black text-slate-400 font-mono">Reason for Leave</label>
              <textarea name="reason" className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded text-xs mt-1" rows={3} placeholder="Please provide a valid reason..." required />
            </div>
            <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-lg text-xs font-bold shadow">
              Submit Leave Request
            </button>
          </form>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <h2 className="text-xs font-black uppercase text-[#714B67] tracking-wider font-mono flex items-center gap-2">
              📋 Leave History ({filteredLeaves.length} Records)
            </h2>

            <div className="flex items-center gap-3 relative">
              {/* Quick Preset Date Pills */}
              <div className="hidden md:flex items-center gap-1 bg-[#F5F2EC] p-1 rounded-xl border border-[#E8E4DF] text-[10px] font-bold">
                <button
                  type="button"
                  onClick={() => setDatePreset("current_month")}
                  className={`px-3 py-1 rounded-lg transition-all ${datePreset === "current_month" ? "bg-[#714B67] text-white font-black shadow-xs" : "text-[#6B665E] hover:text-[#1C1C1A]"}`}
                >
                  Current Month
                </button>
                <button
                  type="button"
                  onClick={() => setDatePreset("last_month")}
                  className={`px-3 py-1 rounded-lg transition-all ${datePreset === "last_month" ? "bg-[#714B67] text-white font-black shadow-xs" : "text-[#6B665E] hover:text-[#1C1C1A]"}`}
                >
                  Last Month
                </button>
                <button
                  type="button"
                  onClick={() => setDatePreset("all")}
                  className={`px-3 py-1 rounded-lg transition-all ${datePreset === "all" ? "bg-[#714B67] text-white font-black shadow-xs" : "text-[#6B665E] hover:text-[#1C1C1A]"}`}
                >
                  All Time
                </button>
                <button
                  type="button"
                  onClick={() => setDatePreset("custom")}
                  className={`px-3 py-1 rounded-lg transition-all ${datePreset === "custom" ? "bg-[#714B67] text-white font-black shadow-xs" : "text-[#6B665E] hover:text-[#1C1C1A]"}`}
                >
                  Custom Range
                </button>
              </div>

              {/* Top-Right Compact Filter Popover Toggle Button */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowFilters(!showFilters)}
                  className={`flex items-center gap-2 border px-4 py-2 text-xs font-bold transition-all rounded-xl shadow-xs focus:outline-none ${showFilters
                    ? "bg-[#C9A84C] border-[#C9A84C] text-[#FCFBF9]"
                    : "bg-[#FCFBF9] hover:bg-[#F5F2EC] border-[#E8E4DF] text-[#1C1C1A]"
                    }`}
                >
                  <Filter className="w-3.5 h-3.5" />
                  <span>Filter Leaves</span>
                  {isFilterActive && (
                    <span className="w-2 h-2 rounded-full bg-[#C9A84C] animate-pulse" />
                  )}
                </button>

                {/* Floating Filter Popover */}
                {showFilters && (
                  <div className="absolute right-0 mt-3 z-50 bg-[#FCFBF9] border border-[#E8E4DF] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.15)] rounded-2xl p-5 w-[320px] space-y-4 text-left normal-case font-sans animate-fadeIn">
                    <div className="flex justify-between items-center border-b border-[#E8E4DF] pb-2">
                      <span className="text-xs font-bold text-[#1C1C1A] tracking-wider uppercase font-mono">Filter Leaves</span>
                      <button
                        type="button"
                        onClick={() => setShowFilters(false)}
                        className="text-[#9C9890] hover:text-[#1C1C1A] transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="space-y-3.5 text-xs">
                      {/* Search Keyword */}
                      <div>
                        <label className="text-[9px] uppercase font-bold text-[#9C9890] font-mono tracking-widest block mb-1">Search Keyword</label>
                        <input
                          type="text"
                          placeholder="Search employee, leave type..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-full bg-white border border-[#E8E4DF] rounded-xl p-2.5 text-xs font-semibold text-[#1C1C1A] focus:outline-none focus:border-[#C9A84C]"
                        />
                      </div>

                      {/* Select Employee Dropdown (Active Users first, Inactive Users grouped at the end) */}
                      <div>
                        <label className="text-[9px] uppercase font-bold text-[#9C9890] font-mono tracking-widest block mb-1">Select Employee</label>
                        <select
                          value={filterUser}
                          onChange={(e) => setFilterUser(e.target.value)}
                          className="w-full bg-white border border-[#E8E4DF] rounded-xl p-2.5 text-xs font-bold text-[#1C1C1A] focus:outline-none focus:border-[#C9A84C]"
                        >
                          <option value="">All Employees</option>
                          <optgroup label="Active Employees">
                            {uniqueUsersFromLeaves.activeList.map((u) => (
                              <option key={u.id} value={u.id}>
                                {u.name} {u.email ? `(${u.email})` : ""}
                              </option>
                            ))}
                          </optgroup>
                          {uniqueUsersFromLeaves.inactiveList.length > 0 && (
                            <optgroup label="Inactive / Archived Employees">
                              {uniqueUsersFromLeaves.inactiveList.map((u) => (
                                <option key={u.id} value={u.id}>
                                  {u.name} (Inactive) {u.email ? `(${u.email})` : ""}
                                </option>
                              ))}
                            </optgroup>
                          )}
                        </select>
                      </div>

                      {/* Status Dropdown */}
                      <div>
                        <label className="text-[9px] uppercase font-bold text-[#9C9890] font-mono tracking-widest block mb-1">Approval Status</label>
                        <select
                          value={filterStatus}
                          onChange={(e) => setFilterStatus(e.target.value)}
                          className="w-full bg-white border border-[#E8E4DF] rounded-xl p-2.5 text-xs font-bold text-[#1C1C1A] focus:outline-none focus:border-[#C9A84C]"
                        >
                          <option value="All">All Statuses</option>
                          <option value="Pending">Pending</option>
                          <option value="Approved">Approved</option>
                          <option value="Rejected">Rejected</option>
                        </select>
                      </div>

                      {/* Date Preset */}
                      <div>
                        <label className="text-[9px] uppercase font-bold text-[#9C9890] font-mono tracking-widest block mb-1">Date Preset</label>
                        <select
                          value={datePreset}
                          onChange={(e) => setDatePreset(e.target.value as any)}
                          className="w-full bg-white border border-[#E8E4DF] rounded-xl p-2.5 text-xs font-bold text-[#1C1C1A] focus:outline-none focus:border-[#C9A84C]"
                        >
                          <option value="all">All Time</option>
                          <option value="current_month">Current Month</option>
                          <option value="last_month">Last Month</option>
                          <option value="custom">Custom Date Range</option>
                        </select>
                      </div>

                      {/* Custom Date Range Inputs */}
                      {datePreset === "custom" && (
                        <div className="space-y-2 pt-1 border-t border-[#E8E4DF]">
                          <div>
                            <label className="text-[8px] uppercase font-bold text-[#9C9890] font-mono tracking-widest block mb-1">From Date</label>
                            <input
                              type="date"
                              value={filterStartDate}
                              onChange={(e) => setFilterStartDate(e.target.value)}
                              className="w-full bg-white border border-[#E8E4DF] rounded-xl p-2 text-xs font-bold text-[#1C1C1A] focus:outline-none focus:border-[#C9A84C]"
                            />
                          </div>
                          <div>
                            <label className="text-[8px] uppercase font-bold text-[#9C9890] font-mono tracking-widest block mb-1">To Date</label>
                            <input
                              type="date"
                              value={filterEndDate}
                              onChange={(e) => setFilterEndDate(e.target.value)}
                              className="w-full bg-white border border-[#E8E4DF] rounded-xl p-2 text-xs font-bold text-[#1C1C1A] focus:outline-none focus:border-[#C9A84C]"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="pt-2 flex gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setSearchTerm("");
                          setFilterUser("");
                          setFilterStatus("All");
                          setDatePreset("all");
                          setFilterStartDate("");
                          setFilterEndDate("");
                          setShowFilters(false);
                        }}
                        className="flex-1 bg-[#FCFBF9] hover:bg-[#F5F2EC] text-[#6B665E] py-2.5 rounded-xl text-[10px] font-bold transition-all border border-[#E8E4DF]"
                      >
                        Clear All
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowFilters(false)}
                        className="flex-1 bg-[#C9A84C] hover:bg-[#B5963D] text-[#FCFBF9] py-2.5 rounded-xl text-[10px] font-bold transition-all shadow-md"
                      >
                        Apply Filters
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto border border-slate-100 rounded-xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-400 font-black uppercase font-mono tracking-wider">
                  {hasMultipleUsersInLeaves && <th className="py-3 px-3">Employee</th>}
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3">Type</th>
                  <th className="py-3 px-3">Days</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Approver Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                {loading ? (
                  <tr>
                    <td colSpan={hasMultipleUsersInLeaves ? 6 : 5} className="py-8 text-center text-slate-400 italic">
                      Loading leave requests...
                    </td>
                  </tr>
                ) : filteredLeaves.length === 0 ? (
                  <tr>
                    <td colSpan={hasMultipleUsersInLeaves ? 6 : 5} className="py-8 text-center text-slate-400 italic">
                      No leave records found matching selected criteria.
                    </td>
                  </tr>
                ) : (
                  filteredLeaves.map((l: any) => (
                    <tr key={l.id} className="hover:bg-slate-50/50 border-b border-slate-50">
                      {hasMultipleUsersInLeaves && (
                        <td className="py-3 px-3">
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-800">{l.employee?.name || l.user?.name || "Self"}</span>
                            <span className="text-[10px] text-slate-400 font-mono">{l.employee?.email || l.user?.email || ""}</span>
                          </div>
                        </td>
                      )}
                      <td className="py-3 px-3 whitespace-nowrap font-semibold">
                        {new Date(l.startDate).toLocaleDateString()} {l.endDate && l.endDate !== l.startDate ? ` - ${new Date(l.endDate).toLocaleDateString()}` : ""}
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-600 border border-indigo-100">
                          {l.type}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-slate-800">{l.days}</td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${l.status === 'Approved' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : l.status === 'Rejected' ? 'bg-rose-50 text-rose-700 border border-rose-200' : l.status === 'Pending HR Approval' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                          {l.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-500 text-[11px] italic">
                        {l.status !== "Pending Manager Approval" && l.status !== "Pending HR Approval" ?
                          (l.approvedBy?.name ? `By: ${l.approvedBy?.name} ${l.remarks ? `(${l.remarks})` : ''}` : (l.remarks || 'No remarks')) :
                          'Awaiting Approval'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export function ESSPayroll({ user, triggerToast }: ESSProps) {
  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedEmpId, setSelectedEmpId] = useState("");
  const [baseSalary, setBaseSalary] = useState<number | "">(13000);
  const monthsList = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const [payrollMonth, setPayrollMonth] = useState(monthsList[new Date().getMonth()]);
  const [payrollYear, setPayrollYear] = useState<number | "">(new Date().getFullYear());
  const [processedPayslips, setProcessedPayslips] = useState<any[]>([]);
  const [sodReports, setSodReports] = useState<any[]>([]);
  const [eodReports, setEodReports] = useState<any[]>([]);
  const [leaveReports, setLeaveReports] = useState<any[]>([]);
  const [fineReports, setFineReports] = useState<any[]>([]);
  const [paidLeavesInput, setPaidLeavesInput] = useState<number | "">(0);
  const [absentFineOverride, setAbsentFineOverride] = useState<number | "">("");
  const [calcBase, setCalcBase] = useState(true);
  const [calcOvertime, setCalcOvertime] = useState(true);

  const [loading, setLoading] = useState(false);
  const roleLower = (user?.role || "").toLowerCase();
  const isAdmin = ["owner", "director", "hr", "admin", "cfo", "manager", "executive"].some(r => roleLower.includes(r)) || true;

  const monthMap: { [key: string]: number } = {
    "January": 0, "February": 1, "March": 2, "April": 3, "May": 4, "June": 5,
    "July": 6, "August": 7, "September": 8, "October": 9, "November": 10, "December": 11
  };

  const selectedMonthIndex = useMemo(() => {
    return monthMap[payrollMonth] ?? new Date().getMonth();
  }, [payrollMonth]);

  const numericYear = useMemo(() => {
    return typeof payrollYear === "number" && !isNaN(payrollYear) && payrollYear > 0 ? payrollYear : new Date().getFullYear();
  }, [payrollYear]);

  const daysInSelectedMonth = useMemo(() => {
    return new Date(numericYear, selectedMonthIndex + 1, 0).getDate();
  }, [payrollMonth, numericYear, selectedMonthIndex]);

  const sundaysInSelectedMonth = useMemo(() => {
    let count = 0;
    for (let day = 1; day <= daysInSelectedMonth; day++) {
      const d = new Date(numericYear, selectedMonthIndex, day);
      if (d.getDay() === 0) count++;
    }
    return count;
  }, [daysInSelectedMonth, numericYear, selectedMonthIndex]);

  const employeeSods = useMemo(() => {
    if (!selectedEmpId) return [];
    return sodReports.filter((report: any) => {
      const empIdStr = report.employee?.id ? String(report.employee.id) : String(report.employee || "");
      if (empIdStr !== String(selectedEmpId)) return false;
      const d = new Date(report.date || report.createdAt);
      return d.getMonth() === selectedMonthIndex && d.getFullYear() === numericYear;
    });
  }, [sodReports, selectedEmpId, selectedMonthIndex, numericYear]);

  const employeeEods = useMemo(() => {
    if (!selectedEmpId) return [];
    return eodReports.filter((report: any) => {
      const empIdStr = report.employee?.id ? String(report.employee.id) : String(report.employee || "");
      if (empIdStr !== String(selectedEmpId)) return false;
      const d = new Date(report.date || report.createdAt);
      return d.getMonth() === selectedMonthIndex && d.getFullYear() === numericYear;
    });
  }, [eodReports, selectedEmpId, selectedMonthIndex, numericYear]);

  const employeeLeaves = useMemo(() => {
    if (!selectedEmpId) return [];
    return leaveReports.filter((leave: any) => {
      const empIdStr = leave.employee ? (typeof leave.employee === "object" ? String(leave.employee.id || "") : String(leave.employee)) : "";
      if (empIdStr !== String(selectedEmpId)) return false;

      const st = (leave.status || leave.hrStatus || "").toLowerCase();
      if (st.includes("reject")) return false; // Ignore rejected leave applications

      const start = new Date(leave.startDate || leave.createdAt);
      const end = new Date(leave.endDate || leave.startDate || leave.createdAt);

      const startInMonth = start.getMonth() === selectedMonthIndex && start.getFullYear() === numericYear;
      const endInMonth = end.getMonth() === selectedMonthIndex && end.getFullYear() === numericYear;

      return startInMonth || endInMonth;
    });
  }, [leaveReports, selectedEmpId, selectedMonthIndex, numericYear]);

  const totalAppliedLeaveDays = useMemo(() => {
    return employeeLeaves.reduce((sum: number, l: any) => sum + Number(l.days || 1), 0);
  }, [employeeLeaves]);

  const employeeFines = useMemo(() => {
    if (!selectedEmpId) return [];
    return fineReports.filter((fine: any) => {
      const empIdStr = fine.employee ? String(fine.employee) : "";
      if (empIdStr !== String(selectedEmpId)) return false;

      const fineDate = new Date(fine.date || fine.createdAt);
      return fineDate.getMonth() === selectedMonthIndex && fineDate.getFullYear() === numericYear;
    });
  }, [fineReports, selectedEmpId, selectedMonthIndex, numericYear]);

  const totalImposedAbsentFineAmount = useMemo(() => {
    return employeeFines.reduce((sum: number, f: any) => sum + Number(f.amount || 0), 0);
  }, [employeeFines]);

  // Sync paidLeavesInput & reset absentFineOverride whenever selected employee or month changes
  useEffect(() => {
    const approvedPaidLeaves = employeeLeaves
      .filter((l: any) => (l.type || "").toLowerCase() !== "unpaid leave")
      .reduce((sum: number, l: any) => sum + Number(l.days || 1), 0);

    setPaidLeavesInput(approvedPaidLeaves);
    setAbsentFineOverride("");
  }, [selectedEmpId, selectedMonthIndex, payrollYear, employeeLeaves]);

  const getLocalDateString = (dateObj: any) => {
    const d = new Date(dateObj);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const dailyWorkSummary = useMemo(() => {
    const summary: { [dateStr: string]: { sod?: any; eod?: any; minutes: number } } = {};

    employeeSods.forEach((sod) => {
      const dateStr = getLocalDateString(sod.date || sod.createdAt);
      if (!summary[dateStr]) summary[dateStr] = { minutes: 0 };
      summary[dateStr].sod = sod;
    });

    employeeEods.forEach((eod) => {
      const dateStr = getLocalDateString(eod.date || eod.createdAt);
      if (!summary[dateStr]) summary[dateStr] = { minutes: 0 };
      summary[dateStr].eod = eod;
    });

    let totalMinutes = 0;
    let totalBaseMinutes = 0;
    let totalOtMinutes = 0;
    Object.keys(summary).forEach((dateStr) => {
      const day = summary[dateStr];
      let dayMinutes = 0;
      if (day.sod && day.eod) {
        const sodTime = new Date(day.sod.createdAt);
        const eodTime = new Date(day.eod.createdAt);
        let diffMs = eodTime.getTime() - sodTime.getTime();
        if (diffMs < 0) diffMs = 0;

        let diffMins = Math.round(diffMs / 60000);
        if (diffMins > 1440) diffMins = 1440;
        dayMinutes = diffMins;
      } else if (day.sod) {
        dayMinutes = 540; // standard 9-hour shift fallback
      }

      day.minutes = dayMinutes;
      totalMinutes += dayMinutes;

      const baseMins = Math.min(dayMinutes, 540);
      const otMins = Math.max(0, dayMinutes - 540);
      totalBaseMinutes += baseMins;
      totalOtMinutes += otMins;
    });

    const registeredWorkDays = Object.keys(summary).length;
    const numPaidLeaves = Number(paidLeavesInput || 0);

    // Total Payable Days = Present Worked Days + Weekly Offs (Sundays) + Paid Leaves (capped at 30 days standard)
    // If no SOD/EOD entries exist yet for employee in month, default to full month minus unpaid leaves
    let payableDays = registeredWorkDays > 0
      ? Math.min(30, registeredWorkDays + sundaysInSelectedMonth + numPaidLeaves)
      : Math.min(30, 30 - Math.max(0, totalAppliedLeaveDays - numPaidLeaves));

    if (payableDays < 0) payableDays = 0;

    // Unpaid leaves / LOP days = Total applied leaves in month minus marked Paid Leaves
    const unpaidLeaveDays = Math.max(0, 30 - payableDays);

    return {
      days: summary,
      registeredWorkDays,
      payableDays,
      unpaidLeaveDays,
      numPaidLeaves,
      totalMinutes,
      totalBaseMinutes,
      totalOtMinutes
    };
  }, [employeeSods, employeeEods, sundaysInSelectedMonth, paidLeavesInput, totalAppliedLeaveDays]);

  const numBaseSalary = Number(baseSalary || 0);
  // Base Salary is constant (e.g. 13,000) across 28, 30, or 31 day months, based on standard 30 days per-day rate
  const perDaySalary = numBaseSalary / 30;
  const perMinuteSalary = perDaySalary / 540;

  // Unpaid absent days fine calculated from leaves
  const calculatedUnpaidFine = Math.round(dailyWorkSummary.unpaidLeaveDays * perDaySalary);

  // Dynamic Absent Fine: Automatically fetches imposed absent fines from "Impose Absent Fine" form + unpaid absent days
  const dynamicFetchedAbsentFine = Math.max(calculatedUnpaidFine, totalImposedAbsentFineAmount);

  // Absent Fine Amount used in salary deduction (supports manual override if HR edits)
  const absentFineAmount = absentFineOverride !== "" ? Number(absentFineOverride) : dynamicFetchedAbsentFine;

  const calculatedBaseAmount = calcBase ? Math.max(0, Math.round(numBaseSalary - absentFineAmount)) : 0;
  const calculatedOtAmount = calcOvertime ? Math.round(dailyWorkSummary.totalOtMinutes * perMinuteSalary) : 0;

  const calculatedNetSalary = calculatedBaseAmount + calculatedOtAmount;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch employee list, payroll list, work reports, leaves, and imposed fines in parallel for instant rendering
      const [empRes, pRes, res, leaveRes, fineRes] = await Promise.all([
        fetch("/api/employees?all=true").catch(() => null),
        fetch("/api/payroll").catch(() => null),
        fetch("/api/reports/work-report").catch(() => null),
        fetch("/api/leaves").catch(() => null),
        fetch("/api/fines").catch(() => null)
      ]);

      if (empRes) {
        try {
          const empData = await empRes.json();
          if (empData.success && Array.isArray(empData.data) && empData.data.length > 0) {
            const activeEmployees = empData.data.filter((e: any) => {
              if (!e || !(e.id || e._id)) return false;
              const st = (e.status || e.employeeProfile?.status || "active").toLowerCase();
              return !["inactive", "archived", "terminated", "disabled", "exited"].includes(st);
            });
            setEmployees(activeEmployees);
            if (activeEmployees.length > 0) {
              const firstId = String(activeEmployees[0].id || activeEmployees[0]._id || "");
              setSelectedEmpId(prev => prev || firstId);
              const bSal = activeEmployees[0].employeeProfile?.baseSalary || activeEmployees[0].baseSalary || 13000;
              setBaseSalary(Number(bSal));
            }
          } else if (user?.id) {
            setSelectedEmpId(String(user.id));
          }
        } catch (eErr) {
          console.error("Error parsing employees list:", eErr);
          if (user?.id) setSelectedEmpId(String(user.id));
        }
      }

      if (pRes) {
        try {
          const pData = await pRes.json();
          if (pData.success) {
            setProcessedPayslips(pData.data || []);
          }
        } catch (pErr) {
          console.error("Error parsing payroll data:", pErr);
        }
      }

      if (res) {
        try {
          const rData = await res.json();
          if (rData.success && rData.data) {
            setSodReports(rData.data.sod || []);
            setEodReports(rData.data.eod || []);
          }
        } catch (rErr) {
          console.error("Error parsing work report data:", rErr);
        }
      }

      if (leaveRes) {
        try {
          const lData = await leaveRes.json();
          if (lData.success && Array.isArray(lData.data)) {
            setLeaveReports(lData.data);
          }
        } catch (lErr) {
          console.error("Error parsing leaves data:", lErr);
        }
      }

      if (fineRes) {
        try {
          const fData = await fineRes.json();
          if (fData.success && Array.isArray(fData.data)) {
            setFineReports(fData.data);
          }
        } catch (fErr) {
          console.error("Error parsing fines data:", fErr);
        }
      }
    } catch (err) {
      console.error("Error fetching payroll data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleEmployeeChange = (empId: string) => {
    setSelectedEmpId(String(empId));
    const emp = employees.find(e => String(e.id) === String(empId));
    if (emp && emp.employeeProfile?.baseSalary) {
      setBaseSalary(Number(emp.employeeProfile.baseSalary));
    } else if (emp && emp.baseSalary) {
      setBaseSalary(Number(emp.baseSalary));
    } else {
      setBaseSalary(13000);
    }
  };

  const handleProcessPayroll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmpId) {
      triggerToast("Please select an employee.");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        employeeId: selectedEmpId,
        month: payrollMonth,
        year: Number(payrollYear),
        basicPay: calculatedNetSalary,
        hra: 0,
        conveyance: 0,
        specialAllowance: 0,
        pfDeduction: 0,
        ptDeduction: 0,
        tdsDeduction: 0
      };

      const res = await fetch("/api/payroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        triggerToast(`🎉 Payroll processed successfully for ${payrollMonth} ${payrollYear}`);
        fetchData();
      } else {
        triggerToast(`Error: ${data.error}`);
      }
    } catch (err) {
      triggerToast("Failed to process payroll.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePayslip = async (id: string) => {
    if (!confirm("Are you sure you want to delete this processed payslip record?")) {
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/payroll?id=${id}`, {
        method: "DELETE"
      });
      const data = await res.json();
      if (data.success) {
        triggerToast("🎉 Payslip deleted successfully.");
        fetchData();
      } else {
        triggerToast(`Error: ${data.error}`);
      }
    } catch (err) {
      triggerToast("Failed to delete payslip.");
    } finally {
      setLoading(false);
    }
  };



  return (
    <div className="space-y-8 animate-fade-in text-[#1C1C1A]">

      {/* Header */}
      <div className="border-b border-[#E8E4DF] pb-5">
        <span className="text-[9px] uppercase tracking-widest text-[#C9A84C] font-bold">Compensation</span>
        <h1 className="text-xl font-light tracking-wide font-serif" style={{ fontFamily: "'Playfair Display', serif" }}>
          Payroll & Salary Administration
        </h1>
        {/* <p className="text-[10px] text-[#9C9890] uppercase tracking-wider mt-1.5 font-semibold">
          {isAdmin
            ? "Calculate, audit and process employee salaries based on performance weights."
            : "Monitor salary structures, payslips and run simulators."
          }
        </p> */}
      </div>

      {isAdmin && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Payroll Generator Form */}
          <div className="lg:col-span-2 bg-[#FCFBF9] border border-[#E8E4DF] rounded-xl p-6 shadow-[0_2px_20px_rgba(0,0,0,0.02)]">
            <h2 className="text-[10px] font-bold uppercase text-[#C9A84C] tracking-widest mb-6">
              Calculate Salary & Generate Payslip
            </h2>

            <form onSubmit={handleProcessPayroll} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-[9px] uppercase font-bold text-[#9C9890] tracking-wider">Select Employee</label>
                  <select
                    value={String(selectedEmpId || "")}
                    onChange={(e) => handleEmployeeChange(e.target.value)}
                    className="w-full bg-[#FCFBF9] border border-[#E8E4DF] focus:border-[#C9A84C] p-2.5 rounded-lg text-xs mt-1 text-[#1C1C1A] outline-none font-medium"
                    required
                  >
                    <option value="">-- Select Employee --</option>
                    {employees.map(emp => {
                      const idStr = String(emp.id || emp._id || "");
                      const nameStr = emp.name || emp.email || `Employee #${idStr}`;
                      return (
                        <option key={idStr} value={idStr}>
                          {nameStr}
                        </option>
                      );
                    })}
                  </select>
                </div>
                <div>
                  <label className="text-[9px] uppercase font-bold text-[#9C9890] tracking-wider">Payroll Month</label>
                  <select
                    value={payrollMonth}
                    onChange={(e) => setPayrollMonth(e.target.value)}
                    className="w-full bg-[#FCFBF9] border border-[#E8E4DF] focus:border-[#C9A84C] p-2.5 rounded-lg text-xs mt-1 text-[#1C1C1A] outline-none"
                    required
                  >
                    {["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[9px] uppercase font-bold text-[#9C9890] tracking-wider">Payroll Year</label>
                  <input
                    type="number"
                    value={payrollYear}
                    onChange={(e) => setPayrollYear(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full bg-[#FCFBF9] border border-[#E8E4DF] focus:border-[#C9A84C] p-2.5 rounded-lg text-xs mt-1 text-[#1C1C1A] outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-[#FAFAF7] rounded-xl border border-[#E8E4DF]">
                <div>
                  <label className="text-[9px] uppercase font-bold text-[#9C9890] tracking-wider block">Base Salary</label>
                  <input
                    type="number"
                    value={baseSalary}
                    onChange={(e) => setBaseSalary(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full bg-[#FCFBF9] border border-[#E8E4DF] focus:border-[#C9A84C] p-2 rounded text-xs mt-1 font-bold text-[#1C1C1A] outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    placeholder="Enter Base Salary"
                    required
                  />
                </div>
                <div>
                  <label className="text-[9px] uppercase font-bold text-[#9C9890] tracking-wider block">Per-Day Salary</label>
                  <div className="w-full bg-[#FCFBF9] border border-[#E8E4DF] p-2.5 rounded-lg text-xs mt-1 font-bold text-[#C9A84C]">
                    ₹{perDaySalary.toFixed(2)}
                  </div>
                </div>
                <div>
                  <label className="text-[9px] uppercase font-bold text-[#9C9890] tracking-wider block">Per-Minute Salary</label>
                  <div className="w-full bg-[#FCFBF9] border border-[#E8E4DF] p-2.5 rounded-lg text-xs mt-1 font-bold text-[#C9A84C]">
                    ₹{perMinuteSalary.toFixed(4)}
                  </div>
                </div>
                <div>
                  <label className="text-[9px] uppercase font-bold text-[#9C9890] tracking-wider block">Worked Base + Overtime</label>
                  <div className="w-full bg-[#FCFBF9] border border-[#E8E4DF] p-2.5 rounded-lg text-xs mt-1 font-bold text-[#1C1C1A]">
                    {dailyWorkSummary.totalBaseMinutes} + {dailyWorkSummary.totalOtMinutes} mins
                  </div>
                </div>
              </div>

              {/* Month Leaves & Imposed Absent Fines Record Section */}
              <div className="p-4 bg-[#FAFAF7] rounded-xl border border-[#E8E4DF] space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E8E4DF] pb-2">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-[#C9A84C] tracking-wider block">
                      🌴 Month Leaves & ⚠️ Imposed Fines ({payrollMonth} {payrollYear})
                    </span>
                    <span className="text-xs font-bold text-[#1C1C1A]">
                      Leaves: <span className="text-[#714B67]">{totalAppliedLeaveDays} Days</span> | Imposed Fines: <span className="text-rose-700">₹{totalImposedAbsentFineAmount.toLocaleString()}</span>
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                      <label className="text-[9px] uppercase font-bold text-[#9C9890] tracking-wider whitespace-nowrap">
                        Mark Paid Leaves:
                      </label>
                      <input
                        type="number"
                        min="0"
                        max={daysInSelectedMonth}
                        value={paidLeavesInput}
                        onChange={(e) => setPaidLeavesInput(e.target.value === "" ? "" : Math.max(0, Number(e.target.value)))}
                        className="w-20 bg-[#FCFBF9] border border-[#E8E4DF] focus:border-[#C9A84C] px-2 py-1 rounded text-xs font-bold text-[#1C1C1A] outline-none shadow-inner [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        placeholder="0"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-[9px] uppercase font-bold text-rose-700 tracking-wider whitespace-nowrap">
                        Absent Fine (₹):
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={absentFineOverride !== "" ? absentFineOverride : absentFineAmount}
                        onChange={(e) => setAbsentFineOverride(e.target.value === "" ? "" : Math.max(0, Number(e.target.value)))}
                        className="w-28 bg-[#FCFBF9] border border-rose-300 focus:border-rose-600 px-2.5 py-1 rounded text-xs font-bold text-rose-700 outline-none shadow-inner [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        placeholder={String(dynamicFetchedAbsentFine)}
                      />
                    </div>
                  </div>
                </div>

                {/* Display Individual Imposed Absent Fines */}
                {employeeFines.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-[9px] uppercase font-bold text-rose-700 tracking-wider block">
                      ⚠️ Imposed Absent Fines (From Impose Absent Fine Form):
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {employeeFines.map((f: any, idx: number) => (
                        <div key={idx} className="bg-rose-50/60 border border-rose-200 p-2 rounded-lg flex justify-between items-center text-rose-900 shadow-sm">
                          <div>
                            <span className="font-bold block">₹{f.amount} Fine</span>
                            <span className="text-[10px] text-rose-700 block font-mono">
                              {f.date ? new Date(f.date).toLocaleDateString("en-IN") : ""} {f.reason ? `• ${f.reason}` : ""}
                            </span>
                          </div>
                          <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-rose-200 text-rose-800">
                            Imposed
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Display Registered Month Leaves */}
                {employeeLeaves.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-[9px] uppercase font-bold text-[#C9A84C] tracking-wider block">
                      🌴 Month Leave Applications:
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {employeeLeaves.map((l: any, idx: number) => (
                        <div key={idx} className="bg-white border border-[#E8E4DF] p-2 rounded-lg flex justify-between items-center shadow-sm">
                          <div>
                            <span className="font-bold text-[#1C1C1A]">{l.type || "Leave"}</span>
                            <span className="text-[10px] text-[#9C9890] block font-mono">
                              {l.startDate ? new Date(l.startDate).toLocaleDateString("en-IN") : ""} to {l.endDate ? new Date(l.endDate).toLocaleDateString("en-IN") : ""}
                            </span>
                          </div>
                          <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-[#F4EFE6] text-[#714B67] border border-[#E8E4DF]">
                            {l.days || 1} Days
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {employeeLeaves.length === 0 && employeeFines.length === 0 && (
                  <div className="text-[11px] text-[#9C9890] italic">
                    No leave applications or imposed fines registered for this employee in {payrollMonth} {payrollYear}.
                  </div>
                )}
              </div>

              {/* Checkboxes Row */}
              <div className="flex gap-6 items-center p-3.5 bg-[#FAFAF7] rounded-xl border border-[#E8E4DF]">
                <span className="text-[10px] uppercase font-bold text-[#9C9890] tracking-wider">Salary Components:</span>
                <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-semibold text-[#1C1C1A]">
                  <input
                    type="checkbox"
                    checked={calcBase}
                    onChange={(e) => setCalcBase(e.target.checked)}
                    className="accent-[#C9A84C] h-4 w-4 rounded border-[#E8E4DF]"
                  />
                  Base Salary
                </label>
                <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-semibold text-[#1C1C1A]">
                  <input
                    type="checkbox"
                    checked={calcOvertime}
                    onChange={(e) => setCalcOvertime(e.target.checked)}
                    className="accent-[#C9A84C] h-4 w-4 rounded border-[#E8E4DF]"
                  />
                  Calculate Overtime
                </label>
              </div>

              {/* Dynamic Formula Board */}
              <div className="border border-[#E8E4DF] rounded-xl p-4 space-y-3 bg-[#FCFBF9]">
                <div className="flex justify-between border-b border-[#E8E4DF]/50 pb-2 text-[11px] font-medium">
                  <div className="text-[#5D5B57]">
                    Base Monthly Salary:
                  </div>
                  <div className="text-[#1C1C1A] font-bold">
                    ₹{baseSalary.toLocaleString()} ({payrollMonth} {payrollYear})
                  </div>
                </div>
                <div className="flex justify-between border-b border-[#E8E4DF]/50 pb-2 text-[11px] font-medium">
                  <div className="text-[#5D5B57]">
                    Per-Day Salary Rate (Standard 30 Days):
                  </div>
                  <div className="text-[#1C1C1A] font-bold">
                    ₹{perDaySalary.toFixed(2)} / day
                  </div>
                </div>
                <div className="flex justify-between border-b border-[#E8E4DF]/50 pb-2 text-[11px] font-medium">
                  <div className="text-[#5D5B57]">
                    Attendance & Present Days Breakdown:
                  </div>
                  <div className="text-[#1C1C1A] font-bold">
                    {dailyWorkSummary.registeredWorkDays} Days Present (SOD/EOD) + {sundaysInSelectedMonth} Sundays + {dailyWorkSummary.numPaidLeaves} Paid Leaves
                  </div>
                </div>
                <div className="flex justify-between border-b border-[#E8E4DF]/50 pb-2 text-[11px] font-medium">
                  <div className="text-[#5D5B57]">
                    Calculated Total Payable Days:
                  </div>
                  <div className="text-[#1C1C1A] font-bold">
                    {dailyWorkSummary.payableDays} Paid Days <span className="text-[9px] text-[#9C9890]">({dailyWorkSummary.unpaidLeaveDays} Unpaid Absent Days)</span>
                  </div>
                </div>
                {absentFineAmount > 0 ? (
                  <div className="flex justify-between border-b border-[#E8E4DF]/50 pb-2 text-[11px] font-medium text-rose-700">
                    <div>
                      Absent Fine Deduction (Deducted for {dailyWorkSummary.unpaidLeaveDays} Unpaid Days / Imposed Fines):
                    </div>
                    <div className="font-bold">
                      - ₹{absentFineAmount.toLocaleString()}
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-between border-b border-[#E8E4DF]/50 pb-2 text-[11px] font-medium text-emerald-700">
                    <div>
                      Absent Fine Deduction:
                    </div>
                    <div className="font-bold">
                      ₹0 (100% Full Attendance Retained)
                    </div>
                  </div>
                )}
                <div className="flex justify-between border-b border-[#E8E4DF]/50 pb-2 text-[11px] font-medium">
                  <div className="text-[#5D5B57]">
                    Earned Base Salary {calcBase ? "✅" : "❌"}:
                  </div>
                  <div className="text-[#1C1C1A] font-bold">
                    ₹{calculatedBaseAmount.toLocaleString()}
                  </div>
                </div>
                <div className="flex justify-between border-b border-[#E8E4DF]/50 pb-2 text-[11px] font-medium">
                  <div className="text-[#5D5B57]">
                    Calculate Overtime {calcOvertime ? "✅" : "❌"}:
                  </div>
                  <div className="text-[#1C1C1A] font-bold">
                    {calculatedOtAmount > 0
                      ? `+ ₹${calculatedOtAmount.toLocaleString()} (${dailyWorkSummary.totalOtMinutes} mins OT)`
                      : "—"
                    }
                  </div>
                </div>
                <div className="flex justify-between pt-2 text-xs font-bold uppercase tracking-widest text-[#1C1C1A]">
                  <div>Calculated Net Payout</div>
                  <div className="text-[#6B8F71] text-sm">₹{calculatedNetSalary.toLocaleString()}</div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !selectedEmpId}
                className="w-full bg-[#C9A84C] hover:bg-[#B3923E] text-white py-3 rounded-lg text-[10px] font-semibold uppercase tracking-widest transition-all shadow-[0_2px_15px_rgba(201,168,76,0.15)]"
              >
                {loading ? "Processing..." : "Approve & Save Processed Payslip"}
              </button>
            </form>
          </div>

          {/* Configuration Card */}
          <div className="bg-[#FCFBF9] border border-[#E8E4DF] rounded-xl p-6 space-y-4 shadow-[0_2px_20px_rgba(0,0,0,0.02)]">
            <h2 className="text-[10px] font-bold uppercase text-[#C9A84C] tracking-widest">
              Calculation Rules
            </h2>

            <div className="text-[11px] leading-relaxed space-y-3 font-medium text-[#5D5B57]">
              <div className="p-3 bg-[#FAFAF7] rounded-lg border border-[#E8E4DF]">
                <span className="font-semibold text-[#1C1C1A] block mb-1">📅 Constant Base Monthly Salary</span>
                Base Salary remains constant.
              </div>

              <div className="p-3 bg-[#FAFAF7] rounded-lg border border-[#E8E4DF]">
                <span className="font-semibold text-[#1C1C1A] block mb-1">⚠️ Dynamic Imposed Absent Fine</span>
                Absent Fines imposed via "Impose Absent Fine" form & unpaid absent days are dynamically fetched and deducted from the Base Salary.
              </div>

              <div className="p-3 bg-[#FAFAF7] rounded-lg border border-[#E8E4DF]">
                <span className="font-semibold text-[#1C1C1A] block mb-1">🌴 Paid Leave Benefit</span>
                Marking a leave as Paid Leave waives the daily absent fine and retains full salary.
              </div>

              <div className="p-3 bg-[#FAFAF7] rounded-lg border border-[#E8E4DF]">
                <span className="font-semibold text-[#1C1C1A] block mb-1">⏰ Overtime Payout</span>
                Adds overtime pay for extra working minutes calculated at (Per-Day ÷ 540) rate when enabled.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payslip History Section */}
      <div className="grid grid-cols-1 gap-6">
        <div className="bg-[#FCFBF9] border border-[#E8E4DF] rounded-xl p-6 shadow-[0_2px_20px_rgba(0,0,0,0.02)]">
          <h2 className="text-[10px] font-bold uppercase text-[#C9A84C] tracking-widest mb-6">
            {isAdmin ? "Processed Payslip Registry" : "My Personal Salary structure & Simulator"}
          </h2>

          {!isAdmin && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* Employee Payout Simulator */}
              <div className="p-5 bg-[#FAFAF7] rounded-xl border border-[#E8E4DF]">
                <h3 className="text-[10px] font-bold text-[#C9A84C] uppercase mb-4 tracking-widest">Salary Calculator & Simulator</h3>
                <div className="space-y-4 text-[11px] font-medium">
                  <div>
                    <label className="text-[9px] uppercase font-bold text-[#9C9890] tracking-wider">Base Salary Target</label>
                    <input
                      type="number"
                      value={baseSalary}
                      onChange={(e) => setBaseSalary(Number(e.target.value))}
                      className="w-full bg-[#FCFBF9] border border-[#E8E4DF] focus:border-[#C9A84C] p-2 rounded text-xs mt-1 text-[#1C1C1A] outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-[9px] uppercase font-bold text-[#9C9890] tracking-wider block">Per-Day Salary</span>
                      <div className="text-xs font-bold text-[#C9A84C] mt-1">₹{perDaySalary.toFixed(2)}</div>
                    </div>
                    <div>
                      <span className="text-[9px] uppercase font-bold text-[#9C9890] tracking-wider block">Per-Minute Salary</span>
                      <div className="text-xs font-bold text-[#C9A84C] mt-1">₹{perMinuteSalary.toFixed(4)}</div>
                    </div>
                  </div>
                  {/* Checkboxes Row */}
                  <div className="flex gap-4 items-center p-2.5 bg-[#FCFBF9] rounded-lg border border-[#E8E4DF]">
                    <span className="text-[9px] uppercase font-bold text-[#9C9890] tracking-wider">Components:</span>
                    <label className="flex items-center gap-1.5 cursor-pointer select-none text-[11px] font-semibold text-[#1C1C1A]">
                      <input
                        type="checkbox"
                        checked={calcBase}
                        onChange={(e) => setCalcBase(e.target.checked)}
                        className="accent-[#C9A84C] h-3.5 w-3.5 rounded border-[#E8E4DF]"
                      />
                      Base
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer select-none text-[11px] font-semibold text-[#1C1C1A]">
                      <input
                        type="checkbox"
                        checked={calcOvertime}
                        onChange={(e) => setCalcOvertime(e.target.checked)}
                        className="accent-[#C9A84C] h-3.5 w-3.5 rounded border-[#E8E4DF]"
                      />
                      Calculate Overtime
                    </label>
                  </div>

                  <div className="p-3 bg-[#FCFBF9] rounded-lg space-y-2 border border-[#E8E4DF]">
                    <div className="flex justify-between">
                      <span className="text-[#5D5B57]">Total Working Days (SOD/EOD):</span>
                      <span>{Object.keys(dailyWorkSummary.days).length} Days</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#5D5B57]">Total Worked Time (Base + OT):</span>
                      <span>{(dailyWorkSummary.totalMinutes / 60).toFixed(1)} Hours ({dailyWorkSummary.totalBaseMinutes} + {dailyWorkSummary.totalOtMinutes} mins)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#5D5B57]">Base Portion {calcBase ? "✅" : "❌"}:</span>
                      <span>₹{calculatedBaseAmount.toLocaleString()} ({dailyWorkSummary.totalBaseMinutes} mins)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#5D5B57]">Calculate Overtime {calcOvertime ? "✅" : "❌"}:</span>
                      <span>
                        {calculatedOtAmount > 0
                          ? `₹${calculatedOtAmount.toLocaleString()} (${dailyWorkSummary.totalOtMinutes} mins)`
                          : "—"
                        }
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#5D5B57]">Per-Minute Rate:</span>
                      <span>₹{perMinuteSalary.toFixed(4)} / min</span>
                    </div>
                    <div className="flex justify-between pt-1 border-t border-[#E8E4DF] text-xs font-semibold uppercase tracking-wider text-[#1C1C1A]">
                      <span>Simulated Net Payout:</span>
                      <span className="text-[#6B8F71]">₹{calculatedNetSalary.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Explanatory Policy Card */}
              <div className="p-5 bg-[#FAFAF7] rounded-xl border border-[#E8E4DF] text-[11px] leading-relaxed space-y-3 font-medium text-[#5D5B57]">
                <h3 className="text-[10px] font-bold text-[#C9A84C] uppercase tracking-widest">Salary Payout Policy</h3>
                <p>Your monthly salary is dynamically calculated based on actual logged working time over a standard <strong>30-day calendar month</strong>:</p>
                <ul className="list-disc pl-4 space-y-1">
                  <li><strong>Per-Day</strong>: Computed as Base Salary ÷ 30 calendar days.</li>
                  <li><strong>Per-Minute</strong>: Computed as Per-Day ÷ 540 minutes (standard 9-hour shift).</li>
                  <li><strong>Dynamic Logging</strong>: Calculated based on the precise duration between your daily EOD and SOD report submissions.</li>
                </ul>
              </div>
            </div>
          )}

          {/* Payslips Registry List */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[700px]">
              <thead>
                <tr className="border-b border-[#E8E4DF] text-[#9C9890] font-bold uppercase tracking-wider">
                  {isAdmin && <th className="pb-3 pr-2">Employee</th>}
                  <th className="pb-3 px-2">Month / Year</th>
                  <th className="pb-3 px-2">Basic Salary</th>
                  <th className="pb-3 px-2 text-center">Net Salary</th>
                  <th className="pb-3 px-2">Status</th>
                  {isAdmin && <th className="pb-3 pl-2 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8E4DF] text-[#5D5B57] font-medium">
                {processedPayslips.length === 0 ? (
                  <tr>
                    <td colSpan={isAdmin ? 6 : 4} className="py-8 text-center text-[#9C9890] italic">
                      No processed payroll records found.
                    </td>
                  </tr>
                ) : (
                  processedPayslips.map((slip, i) => (
                    <tr key={i} className="hover:bg-[#FAFAF7]">
                      {isAdmin && (
                        <td className="py-4 pr-2 font-serif text-sm font-light text-[#1C1C1A]">
                          {slip.employee?.name || "Employee"}
                        </td>
                      )}
                      <td className="py-4 px-2 font-semibold text-[#1C1C1A]">{slip.month} {slip.year}</td>
                      <td className="py-4 px-2">₹{(slip.employee?.baseSalary || 13000).toLocaleString()}</td>
                      <td className="py-4 px-2 text-center">
                        <span className="px-3 py-1.5 rounded bg-[#C9A84C] text-white font-bold text-xs tracking-wider shadow-[0_2px_10px_rgba(201,168,76,0.15)]">
                          ₹{slip.netPay?.toLocaleString()}
                        </span>
                      </td>
                      <td className="py-4 px-2">
                        <span className="px-2.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest bg-[#E2EFE0] text-[#4E6D53]">
                          {slip.status}
                        </span>
                      </td>
                      {isAdmin && (
                        <td className="py-4 pl-2 text-right">
                          <button
                            onClick={() => handleDeletePayslip(slip.id)}
                            disabled={loading}
                            className="border border-red-500 text-red-500 hover:bg-red-500 hover:text-white px-3 py-1.5 rounded-lg text-[9px] uppercase tracking-wider font-bold transition-all flex items-center gap-1 ml-auto"
                          >
                            <Trash2 className="w-3 h-3" />
                            Delete
                          </button>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ESSExpenses({ user, triggerToast }: ESSProps) {
  const [claims, setClaims] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showClaimModal, setShowClaimModal] = useState<boolean>(false);
  const [selectedReceiptUrl, setSelectedReceiptUrl] = useState<string | null>(null);

  // Filters State
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [startDateFilter, setStartDateFilter] = useState<string>("");
  const [endDateFilter, setEndDateFilter] = useState<string>("");

  // Form State
  const [category, setCategory] = useState<string>("Travel / Conveyance");
  const [customCategory, setCustomCategory] = useState<string>("");
  const [dateIncurred, setDateIncurred] = useState<string>(new Date().toISOString().split("T")[0]);
  const [amount, setAmount] = useState<string>("");
  const [merchant, setMerchant] = useState<string>("");
  const [paymentMode, setPaymentMode] = useState<string>("Cash");
  const [description, setDescription] = useState<string>("");
  const [advanceAmount, setAdvanceAmount] = useState<string>("0");
  const [receiptUrl, setReceiptUrl] = useState<string>("");
  const [uploadingReceipt, setUploadingReceipt] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const isOwnerOrAdmin = user?.role === "Owner" || user?.role === "Admin" || user?.role === "HR" || String(user?.role || "").toLowerCase().includes("owner");

  const fetchClaims = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/ess/expenses");
      const data = await res.json();
      if (data.success) {
        setClaims(data.data || []);
      }
    } catch (err) {
      console.error("Failed to fetch expenses:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClaims();
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const formData = new FormData();
    formData.append("file", file);

    setUploadingReceipt(true);
    try {
      const res = await fetch("/api/documents/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.success && data.url) {
        setReceiptUrl(data.url);
        triggerToast("✓ Receipt uploaded successfully!");
      } else {
        alert("Receipt upload failed: " + (data.error || "Unknown error"));
      }
    } catch (err: any) {
      console.error("Upload error:", err);
      alert("File upload error: " + err.message);
    } finally {
      setUploadingReceipt(false);
    }
  };

  const handleSubmitClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalAmount = Number(amount);
    if (!finalAmount || finalAmount <= 0) {
      alert("Please enter a valid Claim Amount.");
      return;
    }
    if (!description.trim()) {
      alert("Please enter Business Purpose / Description.");
      return;
    }

    const finalCategory = category === "Other" ? (customCategory.trim() || "Other Expense") : category;
    const parsedAdvance = Number(advanceAmount) || 0;
    const computedNet = Math.max(0, finalAmount - parsedAdvance);

    setSubmitting(true);
    try {
      const res = await fetch("/api/ess/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: finalAmount,
          category: finalCategory,
          customCategory,
          dateIncurred,
          vendorName: merchant.trim(),
          paymentMode,
          description: description.trim(),
          advanceAmount: parsedAdvance,
          netPayable: computedNet,
          receiptUrl,
        }),
      });

      const data = await res.json();
      if (data.success) {
        triggerToast("✓ Expense Claim submitted & request sent to Owner!");
        setShowClaimModal(false);
        // Reset Form
        setCategory("Travel / Conveyance");
        setCustomCategory("");
        setAmount("");
        setMerchant("");
        setPaymentMode("Cash");
        setDescription("");
        setAdvanceAmount("0");
        setReceiptUrl("");
        fetchClaims();
      } else {
        alert("Failed to submit claim: " + (data.error || "Unknown error"));
      }
    } catch (err: any) {
      console.error("Error submitting claim:", err);
      alert("Error submitting claim: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (claimId: string, newStatus: string) => {
    try {
      const res = await fetch("/api/ess/expenses", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: claimId,
          status: newStatus,
        }),
      });
      const data = await res.json();
      if (data.success) {
        triggerToast(`✓ Claim status updated to ${newStatus}!`);
        fetchClaims();
      } else {
        alert("Failed to update status: " + (data.error || "Unknown error"));
      }
    } catch (err: any) {
      alert("Error updating status: " + err.message);
    }
  };

  // Filter Claims
  const filteredClaims = claims.filter((claim) => {
    if (categoryFilter && claim.category !== categoryFilter) return false;
    if (statusFilter && claim.status !== statusFilter) return false;

    const rawDate = claim.dateIncurred || claim.createdAt;
    if (rawDate) {
      const claimDateStr = new Date(rawDate).toISOString().split("T")[0];
      if (startDateFilter && claimDateStr < startDateFilter) return false;
      if (endDateFilter && claimDateStr > endDateFilter) return false;
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        claim.id?.toLowerCase().includes(q) ||
        claim.category?.toLowerCase().includes(q) ||
        claim.vendorName?.toLowerCase().includes(q) ||
        claim.employeeName?.toLowerCase().includes(q) ||
        claim.description?.toLowerCase().includes(q) ||
        claim.paymentMode?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleExportExcel = () => {
    if (filteredClaims.length === 0) {
      alert("No expense claims available to export.");
      return;
    }

    const exportData = filteredClaims.map((c, idx) => ({
      "S.No": idx + 1,
      "Claim ID": c.id || "",
      "Employee": c.employeeName || "Employee",
      "Date Incurred": new Date(c.dateIncurred || c.createdAt).toLocaleDateString("en-IN"),
      "Category": c.category || "",
      "Merchant / Vendor": c.vendorName || "N/A",
      "Payment Mode": c.paymentMode || "Cash",
      "Claim Amount (₹)": c.amount || 0,
      "Advance Received (₹)": c.advanceAmount || 0,
      "Net Payable (₹)": c.netPayable || c.amount || 0,
      "Business Purpose": c.description || "",
      "Status": c.status || "Pending",
      "Approved By": c.approvedBy || "N/A",
      "Receipt Link": c.receiptUrl || "None",
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Expense Claims");
    const dateStr = new Date().toISOString().split("T")[0];
    XLSX.writeFile(workbook, `Expense_Claims_${dateStr}.xlsx`);
  };

  const totalClaimed = claims.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
  const pendingAmount = claims.filter(c => c.status === "Pending").reduce((acc, curr) => acc + (Number(curr.netPayable || curr.amount) || 0), 0);
  const approvedAmount = claims.filter(c => c.status === "Approved" || c.status === "Reimbursed").reduce((acc, curr) => acc + (Number(curr.netPayable || curr.amount) || 0), 0);

  return (
    <div className="space-y-6 animate-fadeIn text-slate-800">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-800">Expense Claims &amp; Reimbursements</h1>
          <p className="text-xs text-slate-500 mt-1">Submit bills, track approval status, and manage expense claims.</p>
        </div>
        <button
          className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-2"
          onClick={() => setShowClaimModal(true)}
        >
          <Plus className="w-4 h-4" /> File New Claim
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Total Claims</p>
            <h3 className="text-2xl font-serif font-light text-slate-800 mt-1">₹{totalClaimed.toLocaleString("en-IN")}</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">{claims.length} Entries Filed</p>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Coins className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase text-amber-600 tracking-wider">Pending Approval</p>
            <h3 className="text-2xl font-serif font-light text-amber-950 mt-1">₹{pendingAmount.toLocaleString("en-IN")}</h3>
            <p className="text-[11px] text-amber-700 mt-0.5">{claims.filter(c => c.status === "Pending").length} Claims Awaiting Review</p>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase text-emerald-600 tracking-wider">Approved / Reimbursed</p>
            <h3 className="text-2xl font-serif font-light text-emerald-950 mt-1">₹{approvedAmount.toLocaleString("en-IN")}</h3>
            <p className="text-[11px] text-emerald-700 mt-0.5">{claims.filter(c => c.status === "Approved" || c.status === "Reimbursed").length} Approved Claims</p>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Search & Export Excel Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search Bar */}
        <div className="flex-1 flex items-center gap-2 bg-slate-50 border border-slate-200 px-3.5 py-2.5 rounded-xl w-full">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            className="bg-transparent text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none w-full"
            placeholder="Search claims by ID, Category, Merchant, Employee, Purpose..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Export Excel & Refresh */}
        <div className="flex items-center gap-2.5 w-full md:w-auto justify-end">
          {(startDateFilter || endDateFilter || categoryFilter || statusFilter || searchQuery) && (
            <button
              onClick={() => {
                setStartDateFilter("");
                setEndDateFilter("");
                setCategoryFilter("");
                setStatusFilter("");
                setSearchQuery("");
              }}
              className="text-[11px] font-bold text-rose-600 hover:text-rose-800 bg-rose-50 px-3 py-2 rounded-xl border border-rose-200 transition-all"
            >
              Reset Filters
            </button>
          )}

          <button
            onClick={handleExportExcel}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
            title="Export Expense Claims to Excel"
          >
            <FileSpreadsheet className="w-4 h-4" /> Export Excel
          </button>

          <button
            onClick={fetchClaims}
            className="p-2.5 bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded-xl text-slate-700 transition-all"
            title="Refresh List"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Claims Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-700">
            {isOwnerOrAdmin ? "All Expense Claims (Review & Approvals)" : "My Submitted Claims"}
          </h3>
          <span className="text-xs font-bold text-slate-500">{filteredClaims.length} records</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-max">
            <thead className="bg-slate-100/90 border-b border-slate-200">
              <tr className="text-[11px] font-bold text-slate-700 tracking-wide">
                {/* Date Incurred Excel Filter Header */}
                <th className="py-3 px-3">
                  <div className="flex items-center gap-1.5">
                    <span>Date Incurred</span>
                    <div className="relative inline-flex items-center">
                      <Filter className={`w-3.5 h-3.5 cursor-pointer ${startDateFilter ? "text-amber-600 font-bold" : "text-slate-400 hover:text-slate-600"}`} />
                      <input
                        type="date"
                        value={startDateFilter}
                        onChange={(e) => setStartDateFilter(e.target.value)}
                        className="absolute inset-0 opacity-0 w-4 h-4 cursor-pointer"
                        title="Filter by Date"
                      />
                    </div>
                  </div>
                </th>

                {/* Submitted By Header (Owner View) */}
                {isOwnerOrAdmin && (
                  <th className="py-3 px-3">
                    <div className="flex items-center gap-1.5">
                      <span>Submitted By</span>
                      <Filter className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                  </th>
                )}

                {/* Category & Merchant Excel Column Filter */}
                <th className="py-3 px-3">
                  <div className="flex items-center gap-1.5">
                    <span>Category &amp; Merchant</span>
                    <div className="relative inline-flex items-center">
                      <Filter className={`w-3.5 h-3.5 cursor-pointer ${categoryFilter ? "text-amber-600 font-bold" : "text-slate-400 hover:text-slate-600"}`} />
                      <select
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        className="absolute inset-0 opacity-0 w-4 h-4 cursor-pointer"
                        title="Filter by Category"
                      >
                        <option value="">(All Categories)</option>
                        <option value="Field Visit / Site Travel">Field Visit / Site Travel</option>
                        <option value="Fuel & Mileage Allowance">Fuel & Mileage Allowance</option>
                        <option value="Branch / Client Site Visit">Branch / Client Visit</option>
                        <option value="Legal & Court Work Expense">Legal Court Fee</option>
                        <option value="Printing, Xerox & Courier">Printing / Courier</option>
                        <option value="Travel / Conveyance">Travel / Conveyance</option>
                        <option value="Food & Meals">Food & Meals</option>
                        <option value="Hotel / Accommodation">Hotel Stay</option>
                        <option value="Client Meeting / Entertainment">Client Meeting</option>
                        <option value="Mobile / Internet Bill">Mobile / Internet</option>
                        <option value="Office Supplies & Stationary">Office Supplies</option>
                        <option value="Medical Expenses">Medical Expenses</option>
                      </select>
                    </div>
                  </div>
                </th>

                <th className="py-3 px-3">
                  <div className="flex items-center gap-1.5">
                    <span>Business Purpose</span>
                  </div>
                </th>

                <th className="py-3 px-3">
                  <div className="flex items-center gap-1.5">
                    <span>Claim Amount</span>
                    <Filter className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                </th>

                <th className="py-3 px-3">
                  <div className="flex items-center gap-1.5">
                    <span>Net Payable</span>
                    <Filter className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                </th>

                <th className="py-3 px-3">Receipt</th>

                {/* Status Excel Column Filter */}
                <th className="py-3 px-3">
                  <div className="flex items-center gap-1.5">
                    <span>Status</span>
                    <div className="relative inline-flex items-center">
                      <Filter className={`w-3.5 h-3.5 cursor-pointer ${statusFilter ? "text-amber-600 font-bold" : "text-slate-400 hover:text-slate-600"}`} />
                      <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="absolute inset-0 opacity-0 w-4 h-4 cursor-pointer"
                        title="Filter by Status"
                      >
                        <option value="">(All Status)</option>
                        <option value="Pending">⏳ Pending</option>
                        <option value="Approved">✅ Approved</option>
                        <option value="Rejected">❌ Rejected</option>
                        <option value="Reimbursed">💸 Reimbursed</option>
                      </select>
                    </div>
                  </div>
                </th>

                {(isOwnerOrAdmin || claims.some(c => c.employee && String(c.employee) !== String(user?.id))) && <th className="py-3 px-3 text-center">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
              {filteredClaims.map((claim) => (
                <tr key={claim.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-4 text-slate-600">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>{new Date(claim.dateIncurred || claim.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</span>
                    </div>
                  </td>

                  {isOwnerOrAdmin && (
                    <td className="py-3 px-4 text-slate-800 font-bold">
                      {claim.employeeName || "Employee"}
                    </td>
                  )}

                  <td className="py-3 px-4">
                    <div className="font-bold text-slate-800">{claim.category}</div>
                    {claim.vendorName && (
                      <div className="text-[10px] text-slate-400 font-medium">Merchant: {claim.vendorName}</div>
                    )}
                  </td>

                  <td className="py-3 px-4 max-w-xs truncate text-slate-600 font-medium" title={claim.description}>
                    {claim.description || "N/A"}
                  </td>

                  <td className="py-3 px-4 font-mono font-bold text-slate-800">
                    ₹{(Number(claim.amount) || 0).toLocaleString("en-IN")}
                  </td>

                  <td className="py-3 px-4 font-mono font-black text-emerald-700">
                    ₹{(Number(claim.netPayable || claim.amount) || 0).toLocaleString("en-IN")}
                  </td>

                  <td className="py-3 px-4">
                    {claim.receiptUrl ? (
                      <button
                        onClick={() => setSelectedReceiptUrl(claim.receiptUrl)}
                        className="text-[11px] font-black text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-xl border border-indigo-300 transition-all inline-flex items-center gap-1.5 shadow-2xs"
                        title="View Attached Receipt Document"
                      >
                        <Paperclip className="w-3.5 h-3.5 text-indigo-600" />
                        <span>View Doc</span>
                        <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                      </button>
                    ) : (
                      <span className="text-[10px] text-slate-400 italic">No File</span>
                    )}
                  </td>

                  <td className="py-3 px-4">
                    {(() => {
                      const st = claim.status || "Pending";
                      let badge = "bg-amber-50 text-amber-700 border-amber-200";
                      let icon = "⏳";
                      if (st === "Approved") {
                        badge = "bg-emerald-50 text-emerald-700 border-emerald-200";
                        icon = "✅";
                      } else if (st === "Rejected") {
                        badge = "bg-rose-50 text-rose-700 border-rose-200";
                        icon = "❌";
                      } else if (st === "Reimbursed") {
                        badge = "bg-blue-50 text-blue-700 border-blue-200";
                        icon = "💸";
                      }
                      return (
                        <span className={`px-2.5 py-1 rounded-lg border text-[10px] font-black tracking-wide inline-flex items-center gap-1 ${badge}`}>
                          <span>{icon}</span> {st}
                        </span>
                      );
                    })()}
                  </td>

                  {(isOwnerOrAdmin || (claim.employee && String(claim.employee) !== String(user?.id))) && (
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {claim.receiptUrl && (
                          <button
                            onClick={() => setSelectedReceiptUrl(claim.receiptUrl)}
                            className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-[10px] font-bold rounded-lg transition-all flex items-center gap-1"
                            title="View Attached Receipt Document"
                          >
                            <Paperclip className="w-3 h-3 text-indigo-600" /> Doc
                          </button>
                        )}
                        {claim.status === "Pending" ? (
                          <>
                            <button
                              onClick={() => handleUpdateStatus(claim.id, "Approved")}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black rounded-lg shadow-xs transition-all flex items-center gap-1"
                              title="Approve Claim"
                            >
                              <Check className="w-3 h-3" /> Approve
                            </button>
                            <button
                              onClick={() => handleUpdateStatus(claim.id, "Rejected")}
                              className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-black rounded-lg shadow-xs transition-all flex items-center gap-1"
                              title="Reject Claim"
                            >
                              <XCircle className="w-3 h-3" /> Reject
                            </button>
                          </>
                        ) : (
                          <span className="text-[10px] font-bold text-slate-400">
                            {claim.approvedBy ? `By ${claim.approvedBy}` : "Processed"}
                          </span>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}

              {filteredClaims.length === 0 && !loading && (
                <tr>
                  <td colSpan={isOwnerOrAdmin ? 9 : 7} className="py-12 text-center text-slate-400 text-xs font-bold uppercase tracking-wider">
                    No Expense Claims Found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* FILE NEW CLAIM MODAL */}
      {showClaimModal && (
        <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-md z-[9999] flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-2xl overflow-hidden my-auto transform transition-all">
            {/* Modal Header */}
            <div className="p-5 bg-gradient-to-r from-amber-700 via-amber-800 to-amber-950 text-white flex items-center justify-between border-b border-amber-700">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-2xl bg-amber-500/20 border border-amber-400/30 text-amber-300 flex items-center justify-center">
                  <Coins className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold tracking-wide">File Expense Reimbursement Claim</h3>
                  <p className="text-[11px] text-amber-200 font-medium">Fill out the receipt details below for manager approval.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowClaimModal(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white flex items-center justify-center transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmitClaim} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto custom-scrollbar">

              {/* Category & Date Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="text-xs font-black text-slate-700 uppercase tracking-wider block mb-1">
                    Expense Category <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full text-xs p-3 border-2 border-slate-200 focus:border-amber-500 rounded-xl bg-slate-50 focus:bg-white font-bold text-slate-800 focus:outline-none transition-all"
                  >
                    <option value="Field Visit / Site Travel">🗺️ Field Visit / Site Travel (Local Conveyance, Toll, Parking)</option>
                    <option value="Fuel & Mileage Allowance">🛵 Fuel &amp; Mileage Allowance (Personal Vehicle)</option>
                    <option value="Branch / Client Site Visit">🏢 Branch / Client Site Visit Expense</option>
                    <option value="Legal & Court Work Expense">⚖️ Legal &amp; Official Court Filing Fee</option>
                    <option value="Printing, Xerox & Courier">📄 Printing, Xerox &amp; Courier Charges</option>
                    <option value="Travel / Conveyance">🚗 Travel / Conveyance (Cab, Auto, Bus, Train)</option>
                    <option value="Food & Meals">🍽️ Food &amp; Meals (Field Duty / Meeting)</option>
                    <option value="Hotel / Accommodation">🏨 Hotel Stay &amp; Accommodation</option>
                    <option value="Client Meeting / Entertainment">🤝 Client Meeting / Entertainment</option>
                    <option value="Mobile / Internet Bill">📱 Mobile &amp; Internet Bill</option>
                    <option value="Office Supplies & Stationary">📝 Office Supplies &amp; Stationary</option>
                    <option value="Medical Expenses">🏥 Medical Expenses</option>
                    <option value="Other">❓ Other Expense (Custom)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-black text-slate-700 uppercase tracking-wider block mb-1">
                    Date Incurred <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={dateIncurred}
                    onChange={(e) => setDateIncurred(e.target.value)}
                    className="w-full text-xs p-3 border-2 border-slate-200 focus:border-amber-500 rounded-xl bg-slate-50 focus:bg-white font-bold text-slate-800 focus:outline-none transition-all"
                  />
                </div>
              </div>

              {category === "Other" && (
                <div>
                  <label className="text-xs font-black text-slate-700 uppercase tracking-wider block mb-1">
                    Specify Custom Category Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    placeholder="e.g. Toll Tax, Parking Fee, Courier Charges..."
                    className="w-full text-xs p-3 border-2 border-slate-200 focus:border-amber-500 rounded-xl bg-slate-50 focus:bg-white font-bold text-slate-800 focus:outline-none transition-all"
                  />
                </div>
              )}

              {/* Amount, Merchant & Payment Mode Grid - Fixed Heights for Labels */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 items-start">
                <div>
                  <label className="text-xs font-black text-slate-700 uppercase tracking-wider h-5 flex items-center mb-1">
                    Claim Amount (₹) <span className="text-rose-500 ml-1">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    required
                    value={amount}
                    onWheel={(e) => e.currentTarget.blur()}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="e.g. 1500"
                    className="w-full text-xs p-3 border-2 border-slate-200 focus:border-amber-500 rounded-xl bg-slate-50 focus:bg-white font-bold text-slate-800 focus:outline-none transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-black text-slate-700 uppercase tracking-wider h-5 flex items-center mb-1">
                    Merchant / Vendor
                  </label>
                  <input
                    type="text"
                    value={merchant}
                    onChange={(e) => setMerchant(e.target.value)}
                    placeholder="e.g. Uber, Swiggy, HP Fuel"
                    className="w-full text-xs p-3 border-2 border-slate-200 focus:border-amber-500 rounded-xl bg-slate-50 focus:bg-white font-bold text-slate-800 focus:outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="text-xs font-black text-slate-700 uppercase tracking-wider h-5 flex items-center mb-1">
                    Payment Mode
                  </label>
                  <select
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value)}
                    className="w-full text-xs p-3 border-2 border-slate-200 focus:border-amber-500 rounded-xl bg-slate-50 focus:bg-white font-bold text-slate-800 focus:outline-none transition-all"
                  >
                    <option value="Cash">Cash</option>
                    <option value="UPI / Online">UPI / Online (GPay/Paytm)</option>
                    <option value="Credit Card">Credit Card</option>
                    <option value="Debit Card">Debit Card</option>
                    <option value="Corporate Card">Corporate Card</option>
                  </select>
                </div>
              </div>

              {/* Advance & Net Payable Grid */}
              <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-2xl grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                <div>
                  <label className="text-[10px] font-black uppercase text-amber-800 block mb-1">
                    Advance Amount Received (If Any ₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={advanceAmount}
                    onWheel={(e) => e.currentTarget.blur()}
                    onChange={(e) => setAdvanceAmount(e.target.value)}
                    className="w-full text-xs p-2.5 border border-amber-300 rounded-xl bg-white font-bold text-slate-800 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>
                <div className="bg-white p-3 rounded-xl border border-amber-200 text-right">
                  <span className="text-[10px] font-black uppercase text-amber-800 block">Net Reimbursement Payable:</span>
                  <span className="text-base font-black font-mono text-emerald-700">
                    ₹{Math.max(0, (Number(amount) || 0) - (Number(advanceAmount) || 0)).toLocaleString("en-IN")}
                  </span>
                </div>
              </div>

              {/* Description / Business Purpose */}
              <div>
                <label className="text-xs font-black text-slate-700 uppercase tracking-wider block mb-1">
                  Business Purpose / Details <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={2}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Explain why this expense was incurred (e.g. Travel to client site at Jaipur Branch)..."
                  className="w-full text-xs p-3 border-2 border-slate-200 focus:border-amber-500 rounded-xl bg-slate-50 focus:bg-white font-medium text-slate-800 focus:outline-none transition-all resize-none"
                />
              </div>

              {/* Upload Receipt */}
              <div>
                <label className="text-xs font-black text-slate-700 uppercase tracking-wider block mb-1 flex items-center justify-between">
                  <span>Upload Bill / Receipt Photo</span>
                  {uploadingReceipt && <span className="text-[10px] text-amber-600 font-bold animate-pulse">Uploading file...</span>}
                </label>
                <div className="border-2 border-dashed border-slate-200 hover:border-amber-400 rounded-2xl p-4 text-center bg-slate-50 hover:bg-amber-50/40 transition-all relative cursor-pointer">
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={handleFileUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <div className="flex flex-col items-center justify-center gap-1">
                    <Paperclip className="w-5 h-5 text-slate-400" />
                    <p className="text-xs font-bold text-slate-700">Click or Drag &amp; Drop receipt file</p>
                    <p className="text-[10px] text-slate-400 font-medium">Supports JPG, PNG, PDF</p>
                  </div>
                </div>
                {receiptUrl && (
                  <div className="mt-2 text-[11px] font-bold text-emerald-700 bg-emerald-50 p-2 rounded-xl border border-emerald-200 flex items-center justify-between">
                    <span>✓ Receipt attached successfully</span>
                    <a href={receiptUrl} target="_blank" rel="noreferrer" className="text-amber-700 underline">View</a>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowClaimModal(false)}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-black rounded-xl shadow-md transition-all flex items-center gap-2"
                >
                  <Coins className="w-4 h-4" />
                  {submitting ? "Submitting..." : "Submit Claim"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RECEIPT VIEW MODAL */}
      {selectedReceiptUrl && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl overflow-hidden max-w-3xl w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <Paperclip className="w-4 h-4 text-amber-600" />
                <h3 className="text-sm font-bold text-slate-800">Uploaded Bill / Receipt Document</h3>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={selectedReceiptUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 rounded-lg text-xs font-bold transition-all flex items-center gap-1"
                >
                  <ExternalLink className="w-3 h-3" /> Open in New Tab
                </a>
                <button onClick={() => setSelectedReceiptUrl(null)} className="text-slate-400 hover:text-slate-700 p-1">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="max-h-[75vh] overflow-auto flex items-center justify-center bg-slate-100 rounded-2xl p-3 border border-slate-200">
              {selectedReceiptUrl.toLowerCase().split("?")[0].endsWith(".pdf") ? (
                <iframe src={selectedReceiptUrl} className="w-full h-[65vh] rounded-xl border-none" title="PDF Receipt Document" />
              ) : (
                <img src={selectedReceiptUrl} alt="Receipt Document" className="max-w-full max-h-[70vh] object-contain rounded-xl shadow-sm" />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
