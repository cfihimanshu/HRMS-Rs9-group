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
  ExternalLink
} from "lucide-react";
import StatCard from "./StatCard";

interface ESSProps {
  user: any;
  triggerToast: (msg: string) => void;
  setActiveTab?: (tab: string) => void;
  toggleModal?: (modalId: string, open: boolean) => void;
  stats?: any;
}

export function ESSDashboard({ user, triggerToast, setActiveTab, toggleModal, stats }: ESSProps) {
  const [isDark, setIsDark] = React.useState(false);
  const [tasks, setTasks] = React.useState<any[]>([]);
  const [loadingTasks, setLoadingTasks] = React.useState(true);

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

  const currentUserId = user?.id;

  const pendingTasks = React.useMemo(() => {
    return tasks.filter((t: any) => {
      const empId = typeof t.employee === "object" ? t.employee?.id : t.employee;
      const isMyTask = !currentUserId || String(empId) === String(currentUserId) || String(t.forwardedTo) === String(currentUserId);
      const isPending = t.status !== "Completed";
      return isMyTask && isPending;
    });
  }, [tasks, currentUserId]);

  const assignedOwnerTasks = React.useMemo(() => {
    return tasks.filter((t: any) => {
      const assignerId = t.assignedBy || t.assignedByUser?.id;
      const assignerRole = (t.assignedByUser?.role || t.assignedByRole || "").toLowerCase();
      const assignerName = (t.assignedByUser?.name || t.assignedByName || "").toLowerCase();

      return (
        (assignerId && String(assignerId) !== String(currentUserId)) ||
        Boolean(t.forwardedTo) ||
        Boolean(t.isAssignedByOwner) ||
        assignerRole.includes("owner") ||
        assignerRole.includes("director") ||
        assignerRole.includes("manager") ||
        assignerName.includes("owner") ||
        assignerName.includes("director")
      );
    });
  }, [tasks, currentUserId]);

  const dynamicStats = stats?.currentUserStats || {
    presentDays: 0,
    totalWorkingDays: 22,
    attendancePercent: 100,
    casualLeave: 12,
    sickLeave: 12,
    earnedLeave: 0,
  };

  const pendingCountDisplay = stats?.currentUserStats?.pendingTasksCount ?? pendingTasks.length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className={`text-2xl font-bold tracking-tight ${isDark ? "text-white" : "text-slate-800"}`}>
            Employee Dashboard
          </h1>
          <p className={`text-sm mt-1 ${isDark ? "text-gray-400" : "text-slate-500"}`}>
            Welcome {user?.name}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {(!stats?.currentUserCompliance?.hasSod) && (
            <button
              onClick={() => toggleModal ? toggleModal("sodModal", true) : setActiveTab?.("attendance")}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg text-xs font-black shadow-lg shadow-indigo-600/20 flex items-center gap-2 transition-all"
            >
              <Clock className="w-4 h-4" /> Declare SOD
            </button>
          )}
          {(stats?.currentUserCompliance?.hasSod && !stats?.currentUserCompliance?.hasEod) && (
            <button
              onClick={() => toggleModal ? toggleModal("eodModal", true) : setActiveTab?.("attendance")}
              className="bg-[#714B67] hover:bg-[#5F3F56] text-white px-5 py-2.5 rounded-lg text-xs font-black shadow-lg shadow-[#714B67]/20 flex items-center gap-2 transition-all"
            >
              <CalendarCheck className="w-4 h-4" /> Submit EOD
            </button>
          )}
          {(stats?.currentUserCompliance?.hasEod) && (
            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-4 py-2 rounded-lg border border-emerald-200 flex items-center gap-2">
              <CalendarCheck className="w-4 h-4" /> Day Completed
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Present Days (This Month)"
          value={`${dynamicStats.presentDays ?? 0} / ${dynamicStats.totalWorkingDays ?? 22}`}
          trend={`${dynamicStats.attendancePercent ?? 100}% Attendance`}
          trendUp={(dynamicStats.attendancePercent ?? 100) >= 90}
          icon={<CalendarCheck className="w-5 h-5 text-indigo-500" />}
          dark={isDark}
        />
        <StatCard
          title="Casual Leave (This Month)"
          value={`${dynamicStats.casualLeaveTaken ?? 0}`}
          trend={`${(dynamicStats.casualLeave ?? 12) - (dynamicStats.casualLeaveTaken ?? 0)} days remaining`}
          trendUp={true}
          icon={<FileText className="w-5 h-5 text-rose-500" />}
          dark={isDark}
        />
        <StatCard
          title="Sick Leave (This Month)"
          value={`${dynamicStats.sickLeaveTaken ?? 0}`}
          trend={`${(dynamicStats.sickLeave ?? 12) - (dynamicStats.sickLeaveTaken ?? 0)} days remaining`}
          trendUp={true}
          icon={<FileText className="w-5 h-5 text-emerald-500" />}
          dark={isDark}
        />
        <StatCard
          title="Pending Tasks"
          value={`${pendingCountDisplay}`}
          trend={pendingCountDisplay > 0 ? `${pendingCountDisplay} tasks requiring action` : "All tasks completed"}
          trendUp={pendingCountDisplay === 0}
          icon={<ListTodo className="w-5 h-5 text-amber-500" />}
          dark={isDark}
        />
      </div>

      <div className={`p-6 rounded-xl border shadow-sm ${isDark ? "bg-gray-900 border-gray-800" : "bg-white border-slate-200"}`}>
        <h2 className={`text-lg font-bold mb-4 ${isDark ? "text-white" : "text-slate-800"}`}>Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button onClick={() => setActiveTab && setActiveTab("ess-leaves")} className={`flex flex-col items-center justify-center p-4 border rounded-xl transition-all shadow-sm ${isDark ? "bg-gray-800 border-gray-700 hover:bg-gray-700" : "bg-slate-50 hover:bg-slate-100 border-slate-200"}`}>
            <CalendarCheck className="w-6 h-6 text-indigo-600 dark:text-indigo-400 mb-2" />
            <span className={`text-xs font-bold ${isDark ? "text-gray-300" : "text-slate-700"}`}>Apply Leave</span>
          </button>
          <button onClick={() => setActiveTab && setActiveTab("ess-payroll")} className={`flex flex-col items-center justify-center p-4 border rounded-xl transition-all shadow-sm ${isDark ? "bg-gray-800 border-gray-700 hover:bg-gray-700" : "bg-slate-50 hover:bg-slate-100 border-slate-200"}`}>
            <FileText className="w-6 h-6 text-emerald-600 dark:text-emerald-400 mb-2" />
            <span className={`text-xs font-bold ${isDark ? "text-gray-300" : "text-slate-700"}`}>View Payslip</span>
          </button>
          <button onClick={() => setActiveTab && setActiveTab("ess-expenses")} className={`flex flex-col items-center justify-center p-4 border rounded-xl transition-all shadow-sm ${isDark ? "bg-gray-800 border-gray-700 hover:bg-gray-700" : "bg-slate-50 hover:bg-slate-100 border-slate-200"}`}>
            <Coins className="w-6 h-6 text-amber-600 dark:text-amber-400 mb-2" />
            <span className={`text-xs font-bold ${isDark ? "text-gray-300" : "text-slate-700"}`}>Claim Expense</span>
          </button>
          <button onClick={() => toggleModal ? toggleModal(!stats?.currentUserCompliance?.hasSod ? "sodModal" : "eodModal", true) : setActiveTab?.("attendance")} className={`flex flex-col items-center justify-center p-4 border rounded-xl transition-all shadow-sm border-indigo-200 bg-indigo-50 hover:bg-indigo-100 dark:border-indigo-900/50 dark:bg-indigo-900/20 dark:hover:bg-indigo-900/40`}>
            <Clock className="w-6 h-6 text-indigo-600 dark:text-indigo-400 mb-2" />
            <span className={`text-xs font-bold text-indigo-700 dark:text-indigo-300`}>Fill SOD / EOD</span>
          </button>
        </div>
      </div>

      {/* Grid Split Section: My Pending Tasks (50%) | Owner / Manager Assigned Tasks (50%) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Left Half (50%): My Pending Tasks */}
        <div className={`p-5 rounded-xl border shadow-sm flex flex-col justify-start ${isDark ? "bg-gray-900 border-gray-800" : "bg-white border-slate-200"}`}>
          <div className="flex items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100 dark:border-gray-800">
            <div className="flex items-center gap-2">
              <h2 className={`text-base font-bold ${isDark ? "text-white" : "text-slate-800"}`}>
                My Pending Tasks
              </h2>
              <span className="bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 px-2 py-0.5 rounded-full text-[10px] font-black">
                {pendingTasks.length} Pending
              </span>
            </div>
            {setActiveTab && (
              <button
                onClick={() => setActiveTab("tasks")}
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
                            onClick={() => setActiveTab("tasks")}
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
                onClick={() => setActiveTab("tasks")}
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
                            onClick={() => setActiveTab("tasks")}
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
    </div>
  );
}

export function ESSLeaves({ user, triggerToast, stats }: ESSProps) {
  const [showApply, setShowApply] = useState(false);
  const [leaves, setLeaves] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const dynamicStats = stats?.currentUserStats || {
    casualLeave: 12,
    sickLeave: 12,
    earnedLeave: 0
  };

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
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
          <h2 className="text-xs font-black uppercase text-[#714B67] tracking-wider mb-4 font-mono">Leave History</h2>
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 font-black uppercase font-mono tracking-wider">
                <th className="pb-3 pr-2">Date</th>
                <th className="pb-3 px-2">Type</th>
                <th className="pb-3 px-2">Days</th>
                <th className="pb-3 px-2">Status</th>
                <th className="pb-3 pl-2">Approver Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400 italic">Loading...</td>
                </tr>
              ) : leaves.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400 italic">No leave records found.</td>
                </tr>
              ) : (
                leaves.map((l: any) => (
                  <tr key={l.id} className="hover:bg-slate-50/50 border-b border-slate-50">
                    <td className="py-3 pr-2 whitespace-nowrap">{new Date(l.startDate).toLocaleDateString()}</td>
                    <td className="py-3 px-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-600 border border-indigo-100">
                        {l.type}
                      </span>
                    </td>
                    <td className="py-3 px-2 font-mono">{l.days}</td>
                    <td className="py-3 px-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${l.status === 'Approved' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : l.status === 'Rejected' ? 'bg-rose-50 text-rose-700 border border-rose-200' : l.status === 'Pending HR Approval' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                        {l.status}
                      </span>
                    </td>
                    <td className="py-3 pl-2 text-slate-500 text-[11px] italic">
                      {l.status !== "Pending Manager Approval" && l.status !== "Pending HR Approval" ?
                        (l.approvedBy?.name ? `By: ${l.approvedBy?.name} ${l.remarks ? `(${l.remarks})` : ''}` : '') :
                        'Awaiting Approval'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function ESSPayroll({ user, triggerToast }: ESSProps) {
  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedEmpId, setSelectedEmpId] = useState("");
  const [baseSalary, setBaseSalary] = useState(13000);
  const monthsList = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const [payrollMonth, setPayrollMonth] = useState(monthsList[new Date().getMonth()]);
  const [payrollYear, setPayrollYear] = useState(new Date().getFullYear());
  const [processedPayslips, setProcessedPayslips] = useState<any[]>([]);
  const [sodReports, setSodReports] = useState<any[]>([]);
  const [eodReports, setEodReports] = useState<any[]>([]);
  const [calcBase, setCalcBase] = useState(true);
  const [calcOvertime, setCalcOvertime] = useState(true);

  const [loading, setLoading] = useState(false);
  const isAdmin = ["Owner", "Director", "HR Head"].includes(user?.role);

  const monthMap: { [key: string]: number } = {
    "January": 0, "February": 1, "March": 2, "April": 3, "May": 4, "June": 5,
    "July": 6, "August": 7, "September": 8, "October": 9, "November": 10, "December": 11
  };

  const selectedMonthIndex = useMemo(() => {
    return monthMap[payrollMonth] ?? 2;
  }, [payrollMonth]);

  const employeeSods = useMemo(() => {
    if (!selectedEmpId) return [];
    return sodReports.filter((report: any) => {
      const empIdStr = report.employee?.id ? report.employee.id.toString() : report.employee?.toString();
      if (empIdStr !== selectedEmpId.toString()) return false;
      const d = new Date(report.date || report.createdAt);
      return d.getMonth() === selectedMonthIndex && d.getFullYear() === payrollYear;
    });
  }, [sodReports, selectedEmpId, selectedMonthIndex, payrollYear]);

  const employeeEods = useMemo(() => {
    if (!selectedEmpId) return [];
    return eodReports.filter((report: any) => {
      const empIdStr = report.employee?.id ? report.employee.id.toString() : report.employee?.toString();
      if (empIdStr !== selectedEmpId.toString()) return false;
      const d = new Date(report.date || report.createdAt);
      return d.getMonth() === selectedMonthIndex && d.getFullYear() === payrollYear;
    });
  }, [eodReports, selectedEmpId, selectedMonthIndex, payrollYear]);

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

    return {
      days: summary,
      totalMinutes,
      totalBaseMinutes,
      totalOtMinutes
    };
  }, [employeeSods, employeeEods]);

  const perDaySalary = baseSalary / 30;
  const perMinuteSalary = perDaySalary / 540;

  const calculatedBaseAmount = calcBase ? Math.round(dailyWorkSummary.totalBaseMinutes * perMinuteSalary) : 0;
  const calculatedOtAmount = calcOvertime ? Math.round(dailyWorkSummary.totalOtMinutes * perMinuteSalary) : 0;

  const calculatedNetSalary = calculatedBaseAmount + calculatedOtAmount;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const pRes = await fetch("/api/payroll");
      const pData = await pRes.json();
      if (pData.success) {
        setProcessedPayslips(pData.data);
      }

      const res = await fetch("/api/reports/work-report");
      const rData = await res.json();
      if (rData.success && rData.data) {
        setSodReports(rData.data.sod || []);
        setEodReports(rData.data.eod || []);
      }

      if (isAdmin) {
        const empRes = await fetch("/api/employees");
        const empData = await empRes.json();
        if (empData.success) {
          setEmployees(empData.data);
          if (empData.data.length > 0) {
            setSelectedEmpId(empData.data[0].id);
            setBaseSalary(empData.data[0].employeeProfile?.baseSalary || 13000);
          }
        }
      } else if (user?.id) {
        setSelectedEmpId(user.id);
        try {
          const selfRes = await fetch(`/api/employees`);
          const selfData = await selfRes.json();
          if (selfData.success && selfData.data) {
            const selfEmp = selfData.data.find((e: any) => e.id.toString() === user.id.toString());
            if (selfEmp) {
              setBaseSalary(selfEmp.employeeProfile?.baseSalary || 13000);
            }
          }
        } catch (e) {
          console.error("Error fetching self profile details:", e);
        }
      }
    } catch (err) {
      console.error("Error fetching payroll data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleEmployeeChange = (empId: string) => {
    setSelectedEmpId(empId);
    const emp = employees.find(e => e.id === empId);
    if (emp && emp.employeeProfile?.baseSalary) {
      setBaseSalary(emp.employeeProfile.baseSalary);
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
                    value={selectedEmpId}
                    onChange={(e) => handleEmployeeChange(e.target.value)}
                    className="w-full bg-[#FCFBF9] border border-[#E8E4DF] focus:border-[#C9A84C] p-2.5 rounded-lg text-xs mt-1 text-[#1C1C1A] outline-none"
                    required
                  >
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} ({emp.employeeProfile?.employeeId || "Staff"})
                      </option>
                    ))}
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
                    onChange={(e) => setPayrollYear(Number(e.target.value))}
                    className="w-full bg-[#FCFBF9] border border-[#E8E4DF] focus:border-[#C9A84C] p-2.5 rounded-lg text-xs mt-1 text-[#1C1C1A] outline-none"
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
                    onChange={(e) => setBaseSalary(Number(e.target.value))}
                    className="w-full bg-[#FCFBF9] border border-[#E8E4DF] focus:border-[#C9A84C] p-2 rounded text-xs mt-1 font-bold text-[#1C1C1A] outline-none"
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
                    Total Registered SOD/EOD Working Days:
                  </div>
                  <div className="text-[#1C1C1A] font-bold">
                    {Object.keys(dailyWorkSummary.days).length} Days
                  </div>
                </div>
                <div className="flex justify-between border-b border-[#E8E4DF]/50 pb-2 text-[11px] font-medium">
                  <div className="text-[#5D5B57]">
                    Accumulated Working Time (Base + OT):
                  </div>
                  <div className="text-[#1C1C1A] font-bold">
                    {(dailyWorkSummary.totalMinutes / 60).toFixed(1)} Hours ({dailyWorkSummary.totalBaseMinutes} + {dailyWorkSummary.totalOtMinutes} Mins)
                  </div>
                </div>
                <div className="flex justify-between border-b border-[#E8E4DF]/50 pb-2 text-[11px] font-medium">
                  <div className="text-[#5D5B57]">
                    Base Salary Portion {calcBase ? "✅" : "❌"}:
                  </div>
                  <div className="text-[#1C1C1A] font-bold">
                    ₹{calculatedBaseAmount.toLocaleString()} <span className="text-[9px] text-[#9C9890]">({dailyWorkSummary.totalBaseMinutes} mins)</span>
                  </div>
                </div>
                <div className="flex justify-between border-b border-[#E8E4DF]/50 pb-2 text-[11px] font-medium">
                  <div className="text-[#5D5B57]">
                    Calculate Overtime {calcOvertime ? "✅" : "❌"}:
                  </div>
                  <div className="text-[#1C1C1A] font-bold">
                    {calculatedOtAmount > 0
                      ? `₹${calculatedOtAmount.toLocaleString()} (${dailyWorkSummary.totalOtMinutes} mins)`
                      : "—"
                    }
                  </div>
                </div>
                <div className="flex justify-between border-b border-[#E8E4DF]/50 pb-2 text-[11px] font-medium">
                  <div className="text-[#5D5B57]">
                    Per-Minute Salary Rate:
                  </div>
                  <div className="text-[#1C1C1A] font-bold">
                    ₹{perMinuteSalary.toFixed(4)} / min
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
                <span className="font-semibold text-[#1C1C1A] block mb-1">📅 Base Month Standard</span>
                Month is calculated on a standard of <strong className="text-[#C9A84C]">30 Calendar Days</strong>.
              </div>

              <div className="p-3 bg-[#FAFAF7] rounded-lg border border-[#E8E4DF]">
                <span className="font-semibold text-[#1C1C1A] block mb-1">⏱️ Per-Day </span>
                Per-Day Salary = Base Salary ÷ 30 calendar days.
              </div>

              <div className="p-3 bg-[#FAFAF7] rounded-lg border border-[#E8E4DF]">
                <span className="font-semibold text-[#1C1C1A] block mb-1">⏰ Per-Minute </span>
                Per-Minute Salary = Per-Day Salary ÷ 540 minutes (based on standard 9-hour shift).
              </div>

              <div className="p-3 bg-[#FAFAF7] rounded-lg border border-[#E8E4DF]">
                <span className="font-semibold text-[#1C1C1A] block mb-1">📊 Dynamic SOD/EOD Tracking</span>
                Calculates actual working minutes between EOD and SOD report submissions daily, and sums them up for the final payout.
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
  return (
    <div className="space-y-6 animate-fadeIn text-slate-800">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-slate-800">Expense Claims</h1>
          <p className="text-xs text-slate-500 mt-1">Submit receipts for reimbursement.</p>
        </div>
        <button
          className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2.5 rounded-lg text-xs font-bold shadow-md flex items-center gap-2"
          onClick={() => triggerToast("New Claim form opening... (Demo)")}
        >
          <Plus className="w-4 h-4" /> File New Claim
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <Coins className="w-12 h-12 text-amber-500/30 mb-3" />
          <h3 className="text-sm font-bold text-slate-700">No Expense Claims</h3>
          <p className="text-xs text-slate-500 max-w-sm mt-1">You haven't filed any reimbursement requests yet. Click the button above to upload a bill.</p>
        </div>
      </div>
    </div>
  );
}
