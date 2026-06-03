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
} from "lucide-react";

interface Task {
  _id: string;
  taskTitle: string;
  taskType: string;
  description: string;
  progressNotes: string;
  status: "Pending" | "In Progress" | "Completed";
  createdAt: string;
  date: string;
  employee?: { _id: string; name: string; role: string } | null;
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

  // Task Editing & Deletion
  const [isEditingTask, setIsEditingTask] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editType, setEditType] = useState("Meeting");
  const [editDesc, setEditDesc] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  // Drag state
  const dragIdRef = useRef<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);

  useEffect(() => {
    fetchTasks();
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
    setUpdatingId(taskId);
    // Optimistic UI
    setTasks(prev => prev.map(t => t._id === taskId ? { ...t, status: newStatus as Task["status"] } : t));
    // Also update selectedTask if open
    if (selectedTask?._id === taskId) {
      setSelectedTask(prev => prev ? { ...prev, status: newStatus as Task["status"] } : null);
    }
    try {
      await fetch("/api/tasks", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId, status: newStatus }),
      });
    } catch (err) {
      console.error(err);
      fetchTasks();
    } finally {
      setUpdatingId(null);
    }
  };

  const saveProgressNotes = async () => {
    if (!selectedTask) return;
    setSavingNotes(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId: selectedTask._id, progressNotes: editNotes }),
      });
      const data = await res.json();
      if (data.success) {
        setTasks(prev => prev.map(t => t._id === selectedTask._id ? { ...t, progressNotes: editNotes } : t));
        setSelectedTask(prev => prev ? { ...prev, progressNotes: editNotes } : null);
      }
    } catch (err) {
      console.error(err);
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
          taskId: selectedTask._id,
          taskTitle: editTitle,
          taskType: editType,
          description: editDesc,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setTasks(prev => prev.map(t => t._id === selectedTask._id ? {
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
        setTasks(prev => prev.filter(t => t._id !== taskId));
        setSelectedTask(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const openTask = (task: Task) => {
    setSelectedTask(task);
    setEditNotes(task.progressNotes || "");
    setIsEditingTask(false);
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
    const task = tasks.find(t => t._id === taskId);
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
    const isUpdating = updatingId === task._id;
    const typeColor = TYPE_COLORS[task.taskType] || TYPE_COLORS.Other;
    const creatorName = (task.employee as any)?.name || "Unknown User";

    return (
      <div
        key={task._id}
        draggable
        onDragStart={e => handleDragStart(e, task._id)}
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

        {/* Footer */}
        <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-100">
          <div className="flex items-center gap-1 text-[9px] font-bold text-slate-400 font-mono">
            <Clock className="w-3 h-3" />
            {new Date(task.createdAt || task.date).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
          </div>

          {/* Mobile move buttons */}
          <div className="flex lg:hidden gap-1" onClick={e => e.stopPropagation()}>
            {task.status !== "In Progress" && task.status !== "Completed" && (
              <button
                onClick={() => updateStatus(task._id, "In Progress")}
                className="p-1.5 bg-amber-50 text-amber-600 rounded-lg hover:bg-amber-100 transition-all"
                title="Move to In Progress"
              >
                <ArrowRight className="w-3 h-3" />
              </button>
            )}
            {task.status === "In Progress" && (
              <button
                onClick={() => updateStatus(task._id, "Pending")}
                className="p-1.5 bg-slate-50 text-slate-600 rounded-lg hover:bg-slate-100 transition-all"
                title="Move to Pending"
              >
                <AlertCircle className="w-3 h-3" />
              </button>
            )}
            {task.status !== "Completed" && (
              <button
                onClick={() => updateStatus(task._id, "Completed")}
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
            {filteredTasks.length} tasks today
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
                      onClick={() => handleDeleteTask(selectedTask._id)}
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
                        onClick={() => updateStatus(selectedTask._id, s)}
                        disabled={selectedTask.status === s || updatingId === selectedTask._id}
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
                    <button
                      onClick={saveProgressNotes}
                      disabled={savingNotes || editNotes === selectedTask.progressNotes}
                      className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all"
                    >
                      {savingNotes ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                      {savingNotes ? "Saving..." : "Save Notes"}
                    </button>
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
