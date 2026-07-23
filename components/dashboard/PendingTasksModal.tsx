"use client";

import React, { useState, useEffect } from "react";
import {
  ClipboardList,
  CheckCircle2,
  Clock,
  ArrowRight,
  X,
  Loader2,
  Sparkles,
  Calendar,
  AlertCircle,
  ChevronRight
} from "lucide-react";

interface PendingTasksModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTask: (taskTitle?: string) => void;
  sessionUser: any;
}

const TYPE_COLORS: Record<string, string> = {
  Call: "bg-blue-50 text-blue-700 border-blue-200",
  Meeting: "bg-purple-50 text-purple-700 border-purple-200",
  Development: "bg-indigo-50 text-indigo-700 border-indigo-200",
  "Field Visit": "bg-amber-50 text-amber-700 border-amber-200",
  Operations: "bg-teal-50 text-teal-700 border-teal-200",
  Support: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Other: "bg-slate-50 text-slate-700 border-slate-200",
};

export default function PendingTasksModal({
  isOpen,
  onClose,
  onSelectTask,
  sessionUser,
}: PendingTasksModalProps) {
  const [loading, setLoading] = useState<boolean>(true);
  const [pendingTasks, setPendingTasks] = useState<any[]>([]);

  useEffect(() => {
    if (!isOpen || !sessionUser) return;

    let isMounted = true;
    setLoading(true);

    const fetchPendingTasks = async () => {
      try {
        const res = await fetch(`/api/tasks?_=${Date.now()}`);
        const data = await res.json();
        if (isMounted && data.success && Array.isArray(data.data)) {
          const userId = sessionUser.id;

          // Filter pending or in-progress tasks assigned to or forwarded to this user
          const userTasks = data.data.filter((t: any) => {
            const empId = typeof t.employee === "object" ? t.employee?.id : t.employee;
            const fwdId = typeof t.forwardedUser === "object" ? t.forwardedUser?.id : t.forwardedTo;

            const isMine =
              String(empId) === String(userId) ||
              (fwdId && String(fwdId) === String(userId));
            const isNotCompleted = t.status !== "Completed";

            return isMine && isNotCompleted;
          });

          setPendingTasks(userTasks);
        }
      } catch (err) {
        console.error("Failed to fetch pending tasks for popup:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchPendingTasks();

    return () => {
      isMounted = false;
    };
  }, [isOpen, sessionUser]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[999] flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh] animate-scaleUp">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-[#714B67] to-[#5F3F56] p-5 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
              <ClipboardList className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black uppercase tracking-wider">Your Pending Tasks</h3>
                {!loading && (
                  <span className="bg-amber-400/20 text-amber-200 border border-amber-300/30 px-2 py-0.5 rounded-full text-[10px] font-black">
                    {pendingTasks.length}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-purple-200 font-medium mt-0.5">
                SOD declaration recorded. Review your task list for today.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto flex-1 custom-scrollbar space-y-3">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-3 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-[#714B67]" />
              <p className="text-xs font-semibold">Loading your pending tasks...</p>
            </div>
          ) : pendingTasks.length === 0 ? (
            <div className="py-10 text-center space-y-3 bg-slate-50 rounded-xl p-6 border border-dashed border-slate-200">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-black text-slate-800">All Caught Up!</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                  You have no pending tasks right now. Great job keeping your workload clear!
                </p>
              </div>
              <button
                onClick={() => {
                  onClose();
                  onSelectTask();
                }}
                className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#714B67] hover:bg-[#5F3F56] text-white text-xs font-bold transition-all shadow-sm"
              >
                Go to Tasks Page <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between px-1">
                <span className="text-[10px] uppercase font-black text-slate-400 tracking-wider">
                  Click any task to open task board
                </span>
                <span className="text-[10px] font-bold text-slate-400">
                  {pendingTasks.length} task{pendingTasks.length > 1 ? "s" : ""} pending
                </span>
              </div>

              {pendingTasks.map((task) => {
                const typeStyle = TYPE_COLORS[task.taskType] || TYPE_COLORS.Other;

                return (
                  <div
                    key={task.id}
                    onClick={() => {
                      onClose();
                      onSelectTask();
                    }}
                    className="group p-3.5 rounded-xl border border-slate-200 hover:border-[#714B67] bg-white hover:bg-slate-50/80 transition-all cursor-pointer shadow-sm hover:shadow flex items-center justify-between gap-3 min-w-0"
                  >
                    <div className="space-y-1.5 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap min-w-0">
                        <span
                          className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${typeStyle}`}
                        >
                          {task.taskType || "Task"}
                        </span>
                        <span
                          className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                            task.status === "In Progress"
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : "bg-slate-100 text-slate-600 border-slate-200"
                          }`}
                        >
                          {task.status || "Pending"}
                        </span>
                      </div>
                      <h4 className="text-xs font-black text-slate-800 group-hover:text-[#714B67] transition-colors truncate">
                        {task.taskTitle}
                      </h4>
                      {task.description && (
                        <p className="text-[11px] text-slate-500 line-clamp-1">
                          {task.description.replace(/^\[.*?\]\s*/, "")}
                        </p>
                      )}
                    </div>

                    <div className="shrink-0 flex items-center gap-1 text-xs font-extrabold text-[#714B67] opacity-80 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all">
                      <span>View</span>
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between shrink-0">
          <button
            onClick={onClose}
            className="text-xs font-bold text-slate-500 hover:text-slate-700 px-3 py-1.5 rounded-lg hover:bg-slate-200/60 transition-all"
          >
            Dismiss
          </button>
          <button
            onClick={() => {
              onClose();
              onSelectTask();
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#714B67] hover:bg-[#5F3F56] text-white text-xs font-bold transition-all shadow-sm"
          >
            Open Tasks Page <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
