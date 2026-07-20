"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { AlertCircle, CheckCircle2, Clock, Crown, X, ArrowRight } from "lucide-react";

export default function AssignedTaskPopup() {
  const { data: session } = useSession();
  const [unacknowledgedTask, setUnacknowledgedTask] = useState<any | null>(null);

  useEffect(() => {
    if (!session || !session.user) return;
    const user = session.user as any;
    const userId = user?.id;

    const checkAssignedTasks = async () => {
      try {
        const res = await fetch("/api/tasks?range=all");
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
          // Find tasks assigned to this user by an Owner/Manager or forwarded to this user that have not been acknowledged
          const assigned = data.data.find((t: any) => {
            const empId = typeof t.employee === "object" ? t.employee?.id : t.employee;
            const fwdId = typeof t.forwardedUser === "object" ? t.forwardedUser?.id : t.forwardedTo;
            const assignerId = typeof t.assignedByUser === "object" ? t.assignedByUser?.id : t.assignedBy;

            const isAssignedToMe = String(empId) === String(userId) || (fwdId && String(fwdId) === String(userId));
            const isAssignedByOther = (assignerId && String(assignerId) !== String(userId)) || (fwdId && String(fwdId) === String(userId));
            const isNotCompleted = t.status !== "Completed";
            const isNotAck = typeof window !== "undefined" && !localStorage.getItem(`ack_task_${t.id}`);

            return isAssignedToMe && isAssignedByOther && isNotCompleted && isNotAck;
          });

          if (assigned) {
            setUnacknowledgedTask(assigned);
          }
        }
      } catch (err) {
        console.error("Failed to fetch assigned task notifications:", err);
      }
    };

    checkAssignedTasks();
    const intervalId = setInterval(checkAssignedTasks, 3000); // Auto-check every 3s for instant popup delivery
    return () => clearInterval(intervalId);
  }, [session]);

  const handleAcknowledge = () => {
    if (!unacknowledgedTask) return;
    if (typeof window !== "undefined") {
      localStorage.setItem(`ack_task_${unacknowledgedTask.id}`, "true");
    }
    setUnacknowledgedTask(null);
  };

  if (!unacknowledgedTask) return null;

  const assignerName = unacknowledgedTask.assignedByUser?.name || "Owner / Manager";
  const deadlineLabel = unacknowledgedTask.deadlineAt
    ? new Date(unacknowledgedTask.deadlineAt).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit"
      })
    : null;

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[9999] flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-purple-200 w-full max-w-md overflow-hidden transform transition-all scale-100">
        
        {/* Top Header Bar */}
        <div className="bg-gradient-to-r from-[#714B67] to-[#5F3F56] p-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-amber-400/20 p-2 rounded-xl border border-amber-300/30">
              <Crown className="w-5 h-5 text-amber-300 animate-bounce" />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider">New Task Assigned!</h3>
              <p className="text-[10px] text-purple-200 font-medium">Assigned by {assignerName}</p>
            </div>
          </div>
          <button
            onClick={handleAcknowledge}
            className="text-white/70 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4">
          {/* Task Info Box */}
          <div className="bg-purple-50/60 border border-purple-150 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-700 border border-purple-200">
                {unacknowledgedTask.taskType || "Task"}
              </span>
              {deadlineLabel && (
                <span className="text-[9px] font-extrabold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                  <Clock className="w-3 h-3 text-amber-600" />
                  Due: {deadlineLabel}
                </span>
              )}
            </div>

            <h4 className="text-sm font-black text-slate-800 leading-snug pt-1">
              {unacknowledgedTask.taskTitle}
            </h4>

            {unacknowledgedTask.description && (
              <p className="text-xs text-slate-600 font-medium line-clamp-3 bg-white/70 p-2.5 rounded-lg border border-purple-100 whitespace-pre-line">
                {unacknowledgedTask.description}
              </p>
            )}
          </div>

          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-[10.5px] font-bold text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>This task has been automatically linked to your Start of Day (SOD)!</span>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <button
              onClick={handleAcknowledge}
              className="flex-1 bg-[#714B67] hover:bg-[#5F3F56] text-white py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-lg shadow-[#714B67]/20 transition-all active:scale-95"
            >
              <span>Acknowledge &amp; Start</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
