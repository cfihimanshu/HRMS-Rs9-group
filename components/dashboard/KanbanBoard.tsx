"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Plus,
  GripVertical,
  Clock,
  CheckCircle2,
  Loader2,
  ArrowRight,
  Activity,
  Calendar,
  X,
  StickyNote,
  Save,
  ChevronRight,
  LayoutGrid,
  AlertCircle,
  Trash2,
  Edit2,
  CalendarClock,
  Send,
  Users,
  Play,
  Pause,
  Square,
  Timer,
} from "lucide-react";

interface Task {
  id: string;
  taskTitle: string;
  taskType: string;
  description: string;
  progressNotes: string;
  status: "Pending" | "In Progress" | "Completed";
  createdAt: string;
  date: string;
  scheduledAt?: string | null;
  forwardedTo?: string | null;
  forwardedUser?: { id: string; name: string; role: string } | null;
  employee?: { id: string; name: string; role: string } | null;
  timerStart?: string | null;
  timerState?: "Running" | "Paused" | "Stopped" | string;
  elapsedSeconds?: number;
}

const TYPE_COLORS: Record<string, string> = {
  Call: "bg-emerald-100 text-emerald-700 border-emerald-200",
  Meeting: "bg-blue-100 text-blue-700 border-blue-200",
  Development: "bg-purple-100 text-purple-700 border-purple-200",
  Marketing: "bg-pink-100 text-pink-700 border-pink-200",
  "Field Visit": "bg-orange-100 text-orange-700 border-orange-200",
  Operations: "bg-cyan-100 text-cyan-700 border-cyan-200",
  Support: "bg-rose-100 text-rose-700 border-rose-200",
  Other: "bg-slate-100 text-slate-600 border-slate-200",
};

export default function KanbanBoard() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Add Task form
  const [showAdd, setShowAdd] = useState(false);
  const [title, setTitle] = useState("");
  const [type, setType] = useState("Meeting");
  const [desc, setDesc] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Progress Notes Modal & Task Details
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [editNotes, setEditNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);

  // Call Follow-up date/time in popup
  const [editScheduleDate, setEditScheduleDate] = useState("");
  const [editScheduleTime, setEditScheduleTime] = useState("");
  const [savingSchedule, setSavingSchedule] = useState(false);

  // Forward To
  const [companyUsers, setCompanyUsers] = useState<{ id: string; name: string; role: string }[]>([]);
  const [selectedForwardTo, setSelectedForwardTo] = useState("");
  const [savingForward, setSavingForward] = useState(false);

  // Task Editing & Deletion
  const [isEditingTask, setIsEditingTask] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editType, setEditType] = useState("Meeting");
  const [editDesc, setEditDesc] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  // Timer
  const [savingTimer, setSavingTimer] = useState(false);
  const [, setTick] = useState(0); // force re-render every second for live clock

  // Drag state
  const dragIdRef = useRef<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);

  useEffect(() => {
    fetchTasks();
  }, []);

  // Live tick every second to update running timer display
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchTasks = async () => {
    try {
      const res = await fetch("/api/tasks");
      const data = await res.json();
      if (data.success) setTasks(data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskTitle: title, taskType: type, description: desc, status: "Pending" }),
      });
      const data = await res.json();
      if (data.success) {
        setTitle("");
        setDesc("");
        setShowAdd(false);
        fetchTasks();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const updateStatus = async (taskId: string, newStatus: string) => {
    // Guard: cannot complete without progressNotes
    if (newStatus === "Completed") {
      const task = tasks.find(t => t.id === taskId);
      if (!task?.progressNotes?.trim()) {
        alert("Please write Progress Notes before marking this task as Completed.");
        return;
      }
    }
    setUpdatingId(taskId);
    // Optimistic UI
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus as Task["status"] } : t));
    if (selectedTask?.id === taskId) {
      setSelectedTask(prev => prev ? { ...prev, status: newStatus as Task["status"] } : null);
    }
    try {
      const res = await fetch("/api/tasks", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId, status: newStatus }),
      });
      const data = await res.json();
      if (!data.success) {
        alert(data.error || "Update failed.");
        fetchTasks();
      }
    } catch (err) {
      console.error(err);
      fetchTasks();
    } finally {
      setUpdatingId(null);
    }
  };

  // ── Timer helpers ──────────────────────────────────────────────────────────
  const formatTimer = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const getLiveElapsed = (task: Task): number => {
    if (task.status === "Completed") {
      return task.elapsedSeconds || 0;
    }
    const start = task.timerStart || task.createdAt || task.date;
    if (!start) return 0;
    const startTime = new Date(start).getTime();
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    return Math.max(0, elapsed);
  };

  const timerAction = async (task: Task, action: "start" | "pause" | "stop") => {
    if (savingTimer) return;
    setSavingTimer(true);
    const nowISO = new Date().toISOString();
    let newState: string;
    let newElapsed = getLiveElapsed(task);
    let newTimerStart: string | null = task.timerStart || null;

    if (action === "start") {
      newState = "Running";
      newTimerStart = nowISO;
    } else if (action === "pause") {
      newState = "Paused";
      newTimerStart = null;
    } else {
      // stop
      newState = "Stopped";
      newElapsed = 0;
      newTimerStart = null;
    }

    // Optimistic update
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, timerState: newState, timerStart: newTimerStart, elapsedSeconds: newElapsed } : t));
    if (selectedTask?.id === task.id) {
      setSelectedTask(prev => prev ? { ...prev, timerState: newState, timerStart: newTimerStart, elapsedSeconds: newElapsed } : null);
    }

    try {
      await fetch("/api/tasks", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId: task.id, timerState: newState, timerStart: newTimerStart, elapsedSeconds: newElapsed }),
      });
    } catch (err) {
      console.error(err);
    } finally {
      setSavingTimer(false);
    }
  };

  const saveProgressNotes = async () => {
    if (!selectedTask) return false;
    setSavingNotes(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId: selectedTask.id, progressNotes: editNotes }),
      });
      const data = await res.json();
      if (data.success) {
        setTasks(prev => prev.map(t => t.id === selectedTask.id ? { ...t, progressNotes: editNotes } : t));
        setSelectedTask(prev => prev ? { ...prev, progressNotes: editNotes } : null);
        return true;
      }
      return false;
    } catch (err) {
      console.error(err);
      return false;
    } finally {
      setSavingNotes(false);
    }
  };

  const handleEditTask = async () => {
    if (!selectedTask || !editTitle.trim()) return;
    setSavingEdit(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId: selectedTask.id,
          taskTitle: editTitle,
          taskType: editType,
          description: editDesc,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setTasks(prev => prev.map(t => t.id === selectedTask.id ? {
          ...t,
          taskTitle: editTitle,
          taskType: editType,
          description: editDesc,
        } : t));
        setSelectedTask(prev => prev ? {
          ...prev,
          taskTitle: editTitle,
          taskType: editType,
          description: editDesc,
        } : null);
        setIsEditingTask(false);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm("Are you sure you want to delete this task?")) return;
    try {
      const res = await fetch(`/api/tasks?taskId=${taskId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        setTasks(prev => prev.filter(t => t.id !== taskId));
        setSelectedTask(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const openTask = async (task: Task) => {
    setSelectedTask(task);
    setEditNotes(task.progressNotes || "");
    setIsEditingTask(false);
    setSelectedForwardTo(task.forwardedTo || "");
    // Pre-populate follow-up fields
    if (task.scheduledAt) {
      const d = new Date(task.scheduledAt);
      setEditScheduleDate(d.toISOString().slice(0, 10));
      setEditScheduleTime(d.toTimeString().slice(0, 5));
    } else {
      setEditScheduleDate("");
      setEditScheduleTime("");
    }
    // Fetch company users for Forward To dropdown
    try {
      const res = await fetch("/api/tasks/company-users");
      const data = await res.json();
      if (data.success) setCompanyUsers(data.data);
    } catch (e) { console.error(e); }
  };

  const saveSchedule = async () => {
    if (!selectedTask) return;
    setSavingSchedule(true);
    let scheduledAt: string | null = null;
    if (editScheduleDate && editScheduleTime) {
      scheduledAt = new Date(`${editScheduleDate}T${editScheduleTime}`).toISOString();
    } else if (editScheduleDate) {
      scheduledAt = new Date(`${editScheduleDate}T00:00:00`).toISOString();
    }
    try {
      const res = await fetch("/api/tasks", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId: selectedTask.id, scheduledAt }),
      });
      const data = await res.json();
      if (data.success) {
        setTasks(prev => prev.map(t => t.id === selectedTask.id ? { ...t, scheduledAt } : t));
        setSelectedTask(prev => prev ? { ...prev, scheduledAt } : null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSavingSchedule(false);
    }
  };

  const saveForward = async () => {
    if (!selectedTask) return;
    setSavingForward(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId: selectedTask.id, forwardedTo: selectedForwardTo || null }),
      });
      const data = await res.json();
      if (data.success) {
        setTasks(prev => prev.map(t => t.id === selectedTask.id ? { ...t, forwardedTo: selectedForwardTo || null } : t));
        setSelectedTask(prev => prev ? { ...prev, forwardedTo: selectedForwardTo || null } : null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSavingForward(false);
    }
  };

  // --- Drag & Drop ---
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    dragIdRef.current = taskId;
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, col: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverCol(col);
  };

  const handleDrop = (e: React.DragEvent, newStatus: string) => {
    e.preventDefault();
    setDragOverCol(null);
    const taskId = dragIdRef.current;
    if (!taskId) return;
    const task = tasks.find(t => t.id === taskId);
    if (task && task.status !== newStatus) {
      updateStatus(taskId, newStatus);
    }
    dragIdRef.current = null;
  };

  const handleDragEnd = () => {
    dragIdRef.current = null;
    setDragOverCol(null);
  };

  const [filterUser, setFilterUser] = useState("All");

  const uniqueUsers = Array.from(new Set(tasks.map(t => (t.employee as any)?.name).filter(Boolean)));

  const filteredTasks = tasks.filter(t => {
    if (filterUser === "All") return true;
    return (t.employee as any)?.name === filterUser;
  });

  const pending = filteredTasks.filter(t => t.status === "Pending");
  const inProgress = filteredTasks.filter(t => t.status === "In Progress");
  const completed = filteredTasks.filter(t => t.status === "Completed");

  const cols = [
    {
      id: "Pending",
      label: "Pending",
      count: pending.length,
      tasks: pending,
      icon: <Calendar className="w-4 h-4 text-slate-400" />,
      accent: "border-slate-200",
      headerBg: "bg-white",
      headerText: "text-slate-700",
      dropBg: "bg-slate-50",
      dropBorder: "border-slate-200",
      dropHighlight: "bg-blue-50 border-blue-300",
      emptyText: "text-slate-300",
    },
    {
      id: "In Progress",
      label: "In Progress",
      count: inProgress.length,
      tasks: inProgress,
      icon: <Activity className="w-4 h-4 text-amber-500" />,
      accent: "border-amber-200",
      headerBg: "bg-amber-50",
      headerText: "text-amber-700",
      dropBg: "bg-amber-50/40",
      dropBorder: "border-amber-200",
      dropHighlight: "bg-amber-100 border-amber-400",
      emptyText: "text-amber-300",
    },
    {
      id: "Completed",
      label: "Completed",
      count: completed.length,
      tasks: completed,
      icon: <CheckCircle2 className="w-4 h-4 text-emerald-500" />,
      accent: "border-emerald-200",
      headerBg: "bg-emerald-50",
      headerText: "text-emerald-700",
      dropBg: "bg-emerald-50/40",
      dropBorder: "border-emerald-200",
      dropHighlight: "bg-emerald-100 border-emerald-400",
      emptyText: "text-emerald-300",
    },
  ];

  const renderCard = (task: Task) => {
    const isUpdating = updatingId === task.id;
    const typeColor = TYPE_COLORS[task.taskType] || TYPE_COLORS.Other;
    const creatorName = (task.employee as any)?.name || "Unknown User";

    return (
      <div
        key={task.id}
        draggable
        onDragStart={e => handleDragStart(e, task.id)}
        onDragEnd={handleDragEnd}
        onClick={() => openTask(task)}
        className={`bg-white p-4 rounded-xl border border-slate-200 shadow-sm cursor-grab active:cursor-grabbing hover:border-[#714B67]/40 hover:shadow-md transition-all group select-none ${isUpdating ? "opacity-50 scale-95" : "opacity-100"}`}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <h4 className="text-xs font-black text-slate-800 leading-tight flex-1 line-clamp-2">{task.taskTitle}</h4>
          <GripVertical className="w-4 h-4 text-slate-300 shrink-0 mt-0.5 group-hover:text-slate-400 transition-colors" />
        </div>

        {/* Creator Name */}
        <div className="text-[9px] font-bold text-slate-400 mb-2 uppercase tracking-wide">
          Created by: <span className="text-slate-600">{creatorName}</span>
        </div>

        {/* Type badge */}
        <span className={`inline-block text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${typeColor}`}>
          {task.taskType}
        </span>

        {/* Description */}
        {task.description && (
          <p className="text-[10px] text-slate-500 mt-2 font-medium line-clamp-2 leading-relaxed">{task.description}</p>
        )}

        {/* Progress notes indicator */}
        {task.progressNotes && (
          <div className="mt-2 flex items-center gap-1 text-[9px] text-indigo-500 font-bold">
            <StickyNote className="w-3 h-3" />
            <span>Progress notes added</span>
          </div>
        )}

        {/* Scheduled / Follow-up badge */}
        {task.scheduledAt && (
          <div className="mt-2 flex items-center gap-1 text-[9px] text-violet-600 font-bold bg-violet-50 rounded-lg px-2 py-1 border border-violet-200">
            <CalendarClock className="w-3 h-3" />
            <span>Follow-up: {new Date(task.scheduledAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })} {new Date(task.scheduledAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</span>
          </div>
        )}

        {/* Forwarded badge */}
        {task.forwardedTo && (
          <div className="mt-1.5 flex items-center gap-1 text-[9px] text-teal-600 font-bold bg-teal-50 rounded-lg px-2 py-1 border border-teal-200">
            <Send className="w-3 h-3" />
            <span>Forwarded to: {task.forwardedUser?.name || "Team Member"}</span>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-100">
          <div className="flex items-center gap-4">
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-1 text-[9px] font-bold text-slate-400 font-mono">
                <Calendar className="w-3 h-3" />
                {new Date(task.createdAt || task.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" })}
              </div>
              <div className="flex items-center gap-1 text-[9px] font-bold text-slate-300 font-mono">
                <Clock className="w-3 h-3" />
                {new Date(task.createdAt || task.date).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
              </div>
            </div>
            
            {/* Timer Next to Date/Time */}
            {task.status !== "Completed" && (
              <span className="flex items-center gap-1 text-[10px] font-mono font-black px-2 py-1 rounded-lg border bg-green-50 text-green-700 border-green-200">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse inline-block" />
                {formatTimer(getLiveElapsed(task))}
              </span>
            )}
            {task.status === "Completed" && getLiveElapsed(task) > 0 && (
              <span className="flex items-center gap-1 text-[10px] font-mono font-black px-2 py-1 rounded-lg border bg-slate-50 text-slate-400 border-slate-200">
                <Timer className="w-3 h-3 text-slate-400" />
                {formatTimer(getLiveElapsed(task))}
              </span>
            )}
          </div>

          {/* Mobile move buttons */}
          <div className="flex lg:hidden gap-1" onClick={e => e.stopPropagation()}>
            {task.status !== "In Progress" && task.status !== "Completed" && (
              <button
                onClick={() => updateStatus(task.id, "In Progress")}
                className="p-1.5 bg-amber-50 text-amber-600 rounded-lg hover:bg-amber-100 transition-all"
                title="Move to In Progress"
              >
                <ArrowRight className="w-3 h-3" />
              </button>
            )}
            {task.status === "In Progress" && (
              <button
                onClick={() => updateStatus(task.id, "Pending")}
                className="p-1.5 bg-slate-50 text-slate-600 rounded-lg hover:bg-slate-100 transition-all"
                title="Move to Pending"
              >
                <AlertCircle className="w-3 h-3" />
              </button>
            )}
            {task.status !== "Completed" && (
              <button
                onClick={() => updateStatus(task.id, "Completed")}
                className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-all"
                title="Mark Complete"
              >
                <CheckCircle2 className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Desktop hint */}
          <span className="hidden lg:block text-[9px] text-slate-300 font-bold uppercase tracking-wider">click to open</span>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col justify-center items-center h-[50vh]">
        <Loader2 className="w-8 h-8 text-[#714B67] animate-spin" />
        <span className="text-[10px] uppercase font-black tracking-widest text-slate-500 mt-3 font-mono">Loading Kanban...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn h-full flex flex-col">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-800 flex items-center gap-2">
            <LayoutGrid className="w-5 h-5 text-[#714B67]" />
            My Tasks Kanban
          </h1>
          <p className="text-xs text-slate-500 mt-1">Manage your daily workload — drag cards across columns or click to open.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {uniqueUsers.length > 1 && (
            <select
              className="bg-white border border-slate-200 text-slate-700 text-[10px] font-black uppercase tracking-wider rounded-lg px-3 py-2 focus:outline-none focus:border-[#714B67] shadow-sm cursor-pointer"
              value={filterUser}
              onChange={e => setFilterUser(e.target.value)}
            >
              <option value="All">All Users</option>
              {uniqueUsers.map((u: any) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          )}
          <div className="bg-slate-100 rounded-lg px-3 py-1.5 text-[10px] font-black text-slate-600 font-mono shadow-sm">
            {filteredTasks.length} tasks total
          </div>
        </div>
      </div>

      {/* Kanban Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 flex-1 items-start">
        {cols.map(col => {
          const isOver = dragOverCol === col.id;
          return (
            <div
              key={col.id}
              className={`rounded-2xl border flex flex-col min-h-[520px] transition-all duration-200 ${isOver ? col.dropHighlight : `${col.dropBg} ${col.dropBorder}`}`}
              onDragOver={e => handleDragOver(e, col.id)}
              onDragLeave={() => setDragOverCol(null)}
              onDrop={e => handleDrop(e, col.id)}
            >
              {/* Column header */}
              <div className={`p-4 border-b ${col.dropBorder} flex items-center justify-between ${col.headerBg} rounded-t-2xl`}>
                <h3 className={`text-[11px] uppercase font-black tracking-wider font-mono flex items-center gap-2 ${col.headerText}`}>
                  {col.icon}
                  {col.label} ({col.count})
                </h3>
                {isOver && (
                  <span className="text-[9px] font-black text-indigo-500 uppercase tracking-wider animate-pulse">Drop here</span>
                )}
              </div>

              {/* Cards area */}
              <div className="p-4 space-y-3 flex-1 overflow-y-auto">
                {/* Add task button — only in Pending */}
                {col.id === "Pending" && (
                  !showAdd ? (
                    <button
                      onClick={() => setShowAdd(true)}
                      className="w-full border-2 border-dashed border-slate-300 hover:border-[#714B67] bg-white hover:bg-[#714B67]/5 rounded-xl p-3 flex items-center justify-center gap-2 text-xs font-black text-slate-400 hover:text-[#714B67] transition-all"
                    >
                      <Plus className="w-4 h-4" /> Add Task
                    </button>
                  ) : (
                    <form
                      onSubmit={handleAddTask}
                      className="bg-white border border-[#714B67]/30 shadow-lg rounded-xl p-4 space-y-3"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="text-[10px] uppercase font-black text-[#714B67] tracking-wider">New Task</h4>
                        <button type="button" onClick={() => setShowAdd(false)} className="text-slate-400 hover:text-slate-600">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <input
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold focus:outline-none focus:border-[#714B67] placeholder-slate-400 text-slate-800"
                        placeholder="Task Title *"
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        required
                        autoFocus
                      />
                      <select
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold focus:outline-none focus:border-[#714B67] text-slate-700"
                        value={type}
                        onChange={e => setType(e.target.value)}
                      >
                        <option>Call</option>
                        <option>Meeting</option>
                        <option>Development</option>
                        <option>Field Visit</option>
                        <option>Operations</option>
                        <option>Support</option>
                        <option>Other</option>
                      </select>
                      <textarea
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium focus:outline-none focus:border-[#714B67] placeholder-slate-400 resize-none text-slate-800"
                        rows={2}
                        placeholder="Description (optional)..."
                        value={desc}
                        onChange={e => setDesc(e.target.value)}
                      />
                      <div className="flex gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setShowAdd(false)}
                          className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 py-2 rounded-lg text-[10px] font-black uppercase transition-all"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={submitting}
                          className="flex-1 bg-[#714B67] hover:bg-[#5F3F56] disabled:opacity-50 text-white py-2 rounded-lg text-[10px] font-black uppercase flex items-center justify-center gap-1 transition-all"
                        >
                          {submitting ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Plus className="w-3 h-3" /> Save</>}
                        </button>
                      </div>
                    </form>
                  )
                )}

                {/* Task cards */}
                {col.tasks.map(renderCard)}

                {/* Empty state */}
                {col.tasks.length === 0 && (
                  <div className={`flex flex-col items-center justify-center pt-16 text-[10px] font-black uppercase tracking-wider ${col.emptyText}`}>
                    <div className="w-10 h-10 rounded-full border-2 border-dashed border-current flex items-center justify-center mb-3 opacity-50">
                      {col.icon}
                    </div>
                    Drop tasks here
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ===================== TASK DETAIL MODAL ===================== */}
      {selectedTask && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => {
            setSelectedTask(null);
            setIsEditingTask(false);
          }}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            {isEditingTask ? (
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-sm font-black uppercase tracking-wider text-[#714B67]">Edit Task Details</h3>
                  <button
                    type="button"
                    onClick={() => setIsEditingTask(false)}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-[9px] uppercase font-black text-slate-800 font-mono tracking-wider">Task Title *</label>
                    <input
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold focus:outline-none focus:border-[#714B67] text-slate-800"
                      placeholder="Task Title *"
                      value={editTitle}
                      onChange={e => setEditTitle(e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <label className="text-[9px] uppercase font-black text-slate-450 font-mono tracking-wider">Task Type</label>
                    <select
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold focus:outline-none focus:border-[#714B67] text-slate-700"
                      value={editType}
                      onChange={e => setEditType(e.target.value)}
                    >
                      <option>Call</option>
                      <option>Meeting</option>
                      <option>Development</option>
                      <option>Field Visit</option>
                      <option>Operations</option>
                      <option>Support</option>
                      <option>Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[9px] uppercase font-black text-slate-450 font-mono tracking-wider">Description</label>
                    <textarea
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium focus:outline-none focus:border-[#714B67] text-slate-800 resize-none"
                      rows={3}
                      placeholder="Description (optional)..."
                      value={editDesc}
                      onChange={e => setEditDesc(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsEditingTask(false)}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-650 py-2 rounded-lg text-[10px] font-black uppercase transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleEditTask}
                    disabled={savingEdit}
                    className="flex-1 bg-[#714B67] hover:bg-[#5F3F56] disabled:opacity-50 text-white py-2 rounded-lg text-[10px] font-black uppercase flex items-center justify-center gap-1 transition-all"
                  >
                    {savingEdit ? <Loader2 className="w-3 h-3 animate-spin" /> : "Save Changes"}
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Modal header */}
                <div className="flex items-start justify-between p-6 border-b border-slate-100">
                  <div className="flex-1 pr-4">
                    <span className={`inline-block text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border mb-2 ${TYPE_COLORS[selectedTask.taskType] || TYPE_COLORS.Other}`}>
                      {selectedTask.taskType}
                    </span>
                    <h2 className="text-base font-black text-slate-800 leading-tight">{selectedTask.taskTitle}</h2>
                    {selectedTask.description && (
                      <p className="text-xs text-slate-500 mt-1 font-medium">{selectedTask.description}</p>
                    )}
                  </div>

                  {/* Action buttons: Edit, Delete, Close */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => {
                        setEditTitle(selectedTask.taskTitle);
                        setEditType(selectedTask.taskType);
                        setEditDesc(selectedTask.description || "");
                        setIsEditingTask(true);
                      }}
                      className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-all"
                      title="Edit Task"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteTask(selectedTask.id)}
                      className="w-8 h-8 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center transition-all"
                      title="Delete Task"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        setSelectedTask(null);
                        setIsEditingTask(false);
                      }}
                      className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-all"
                      title="Close"
                    >
                      <X className="w-4 h-4 text-slate-500" />
                    </button>
                  </div>
                </div>

                {/* Status change buttons */}
                <div className="px-6 py-4 border-b border-slate-100">
                  <p className="text-[10px] uppercase font-black text-slate-400 tracking-wider mb-3">Move To</p>
                  <div className="flex gap-2 flex-wrap">
                    {["Pending", "In Progress", "Completed"].map(s => (
                      <button
                        key={s}
                        onClick={() => updateStatus(selectedTask.id, s)}
                        disabled={selectedTask.status === s || updatingId === selectedTask.id}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all border ${selectedTask.status === s
                          ? s === "Pending"
                            ? "bg-slate-100 text-slate-700 border-slate-300 cursor-default"
                            : s === "In Progress"
                              ? "bg-amber-100 text-amber-700 border-amber-300 cursor-default"
                              : "bg-emerald-100 text-emerald-700 border-emerald-300 cursor-default"
                          : "bg-white text-slate-500 border-slate-200 hover:border-[#714B67] hover:text-[#714B67]"
                          }`}
                      >
                        {selectedTask.status === s && <CheckCircle2 className="w-3 h-3" />}
                        {s}
                        {selectedTask.status !== s && <ChevronRight className="w-3 h-3" />}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Call Follow-up Date & Time Section */}
                <div className="px-6 py-4 border-b border-slate-100 bg-violet-50/30">
                  <div className="flex items-center gap-2 mb-3">
                    <CalendarClock className="w-4 h-4 text-violet-500" />
                    <p className="text-[10px] uppercase font-black text-violet-700 tracking-wider">Call Follow-up Date &amp; Time</p>
                    {selectedTask.scheduledAt && (
                      <span className="ml-auto text-[9px] font-bold text-violet-500 bg-violet-100 px-2 py-0.5 rounded-full border border-violet-200">
                        {new Date(selectedTask.scheduledAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                        {" "}
                        {new Date(selectedTask.scheduledAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className="text-[8px] uppercase font-black text-slate-500 tracking-wider block mb-1">Date</label>
                      <input
                        type="date"
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 text-slate-700 bg-white"
                        value={editScheduleDate}
                        onChange={e => setEditScheduleDate(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-[8px] uppercase font-black text-slate-500 tracking-wider block mb-1">Time</label>
                      <input
                        type="time"
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 text-slate-700 bg-white"
                        value={editScheduleTime}
                        onChange={e => setEditScheduleTime(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={saveSchedule}
                      disabled={savingSchedule || (!editScheduleDate)}
                      className="flex items-center gap-1.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all"
                    >
                      {savingSchedule ? <Loader2 className="w-3 h-3 animate-spin" /> : <CalendarClock className="w-3 h-3" />}
                      {savingSchedule ? "Saving..." : "Save Follow-up"}
                    </button>
                    {selectedTask.scheduledAt && (
                      <button
                        onClick={async () => {
                          setEditScheduleDate("");
                          setEditScheduleTime("");
                          setSavingSchedule(true);
                          try {
                            const res = await fetch("/api/tasks", {
                              method: "PUT",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ taskId: selectedTask.id, scheduledAt: null }),
                            });
                            const data = await res.json();
                            if (data.success) {
                              setTasks(prev => prev.map(t => t.id === selectedTask.id ? { ...t, scheduledAt: null } : t));
                              setSelectedTask(prev => prev ? { ...prev, scheduledAt: null } : null);
                            }
                          } catch (err) { console.error(err); }
                          finally { setSavingSchedule(false); }
                        }}
                        className="text-[10px] font-black text-rose-500 hover:text-rose-700 uppercase tracking-wider transition-colors"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>

                {/* Forward To Section */}
                <div className="px-6 py-4 border-b border-slate-100 bg-teal-50/20">
                  <div className="flex items-center gap-2 mb-3">
                    <Users className="w-4 h-4 text-teal-600" />
                    <p className="text-[10px] uppercase font-black text-teal-700 tracking-wider">Forward To</p>
                    {selectedTask.forwardedTo && (() => {
                      const fwd = companyUsers.find(u => u.id === selectedTask.forwardedTo);
                      return fwd ? (
                        <span className="ml-auto text-[9px] font-bold text-teal-600 bg-teal-100 px-2 py-0.5 rounded-full border border-teal-200 flex items-center gap-1">
                          <Send className="w-2.5 h-2.5" />
                          {fwd.name}
                        </span>
                      ) : null;
                    })()}
                  </div>
                  <div className="flex gap-2">
                    <select
                      className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 text-slate-700 bg-white"
                      value={selectedForwardTo}
                      onChange={e => setSelectedForwardTo(e.target.value)}
                    >
                      <option value="">— Select a user —</option>
                      {companyUsers.map(u => (
                        <option key={u.id} value={u.id}>
                          {u.name} ({u.role})
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={saveForward}
                      disabled={savingForward || selectedForwardTo === (selectedTask.forwardedTo || "")}
                      className="flex items-center gap-1.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-40 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all"
                    >
                      {savingForward ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                      {savingForward ? "Saving..." : "Forward"}
                    </button>
                  </div>
                  {companyUsers.length === 0 && (
                    <p className="text-[9px] text-slate-400 mt-2 font-medium">No other users in your company found.</p>
                  )}
                </div>

                {/* Timer Display (read-only — auto-starts on create, stops on complete) */}
                <div className="px-6 py-3 border-b border-slate-100 bg-slate-50/50">
                  <div className="flex items-center gap-2">
                    <Timer className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-[9px] uppercase font-black text-slate-400 tracking-wider">Time Elapsed</span>
                    <span className={`ml-auto text-[11px] font-black px-3 py-1 rounded-full border font-mono ${
                      selectedTask.timerState === "Running"
                        ? "bg-green-100 text-green-700 border-green-200"
                        : "bg-slate-100 text-slate-500 border-slate-200"
                    }`}>
                      {selectedTask.timerState === "Running" && <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse mr-1.5" />}
                      {formatTimer(getLiveElapsed(selectedTask))}
                    </span>
                  </div>
                </div>

                {/* Progress Notes */}

                <div className="px-6 py-4">
                  <div className="flex items-center gap-2 mb-3">
                    <StickyNote className="w-4 h-4 text-indigo-500" />
                    <p className="text-[10px] uppercase font-black text-slate-700 tracking-wider">Progress Notes</p>
                  </div>
                  <textarea
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-xs font-medium text-slate-800 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 resize-none placeholder-slate-400 leading-relaxed"
                    rows={5}
                    placeholder="Write your progress notes, blockers, or updates here..."
                    value={editNotes}
                    onChange={e => setEditNotes(e.target.value)}
                  />
                  <div className="flex items-center justify-between mt-3">
                    <p className="text-[9px] text-slate-400 font-medium">
                      Created: {new Date(selectedTask.createdAt || selectedTask.date).toLocaleString("en-IN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "short" })}
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={saveProgressNotes}
                        disabled={savingNotes || editNotes === selectedTask.progressNotes}
                        className="flex items-center gap-2 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 disabled:opacity-40 disabled:cursor-not-allowed text-indigo-700 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all"
                      >
                        {savingNotes ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                        {savingNotes ? "Saving..." : "Save Notes"}
                      </button>
                      <button
                        onClick={async () => {
                          if (editNotes !== selectedTask.progressNotes) {
                            const success = await saveProgressNotes();
                            if (!success) return;
                          }
                          setSelectedTask(null);
                          setIsEditingTask(false);
                        }}
                        disabled={savingNotes}
                        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all"
                      >
                        <CheckCircle2 className="w-3 h-3" /> Save & Close
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
