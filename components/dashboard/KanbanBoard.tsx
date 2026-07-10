"use client";

import React, { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import * as XLSX from "xlsx";
import { cn } from "@/lib/utils";
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
  ChevronUp,
  ChevronDown,
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
  Download,
  List,
  Paperclip,
  Image as ImageIcon
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
  followUpHistory?: string | null;
  forwardedTo?: string | null;
  forwardedUser?: { id: string; name: string; role: string } | null;
  employee?: { id: string; name: string; role: string } | null;
  timerStart?: string | null;
  timerState?: "Running" | "Paused" | "Stopped" | string;
  elapsedSeconds?: number;
  proofAttachment?: string | null;
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
  const { data: session, status } = useSession();
  const sessionUser = session?.user;

  const cleanDescription = (desc: string): string => {
    if (!desc) return "";
    return desc
      .split("\n")
      .filter(
        (line) =>
          !line.toLowerCase().includes("screenshot proof link:") &&
          !line.toLowerCase().includes("call recording link:")
      )
      .join("\n")
      .trim();
  };

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
  const [expandNotesHistory, setExpandNotesHistory] = useState(false);
  const [expandFollowUpHistory, setExpandFollowUpHistory] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteText, setEditingNoteText] = useState("");
  const [savingEditNote, setSavingEditNote] = useState(false);

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

  // Views & Date Filters
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [showFiltersDropdown, setShowFiltersDropdown] = useState(false);

  // Drag state
  const dragIdRef = useRef<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);

  const [uploadingProof, setUploadingProof] = useState(false);

  // Pagination state
  const [pagePending, setPagePending] = useState(1);
  const [pageInProgress, setPageInProgress] = useState(1);
  const [pageCompleted, setPageCompleted] = useState(1);
  const ITEMS_PER_PAGE = 5;

  useEffect(() => {
    if (status !== "loading") {
      fetchTasks();
    }
  }, [session, status]);

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
      } else {
        alert(data.error || "Failed to add task.");
      }
    } catch (err) {
      console.error(err);
      alert("An unexpected error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  const updateStatus = async (taskId: string, newStatus: string) => {
    // Guard: cannot complete without progressNotes and proofAttachment
    if (newStatus === "Completed") {
      const task = tasks.find(t => t.id === taskId);
      if (!task?.progressNotes?.trim() || !task?.proofAttachment?.trim()) {
        alert("To complete this task, you must provide Progress Notes AND upload Proof of Work (Screenshot/Photo). Please open the task to do this.");
        if (task) {
          openTask(task);
        }
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
    if (!selectedTask || !editNotes.trim()) return false;
    setSavingNotes(true);
    try {
      let currentNotesList: any[] = [];
      if (selectedTask.progressNotes) {
        try {
          const parsed = JSON.parse(selectedTask.progressNotes);
          currentNotesList = Array.isArray(parsed) ? parsed : [{ id: 'legacy', note: selectedTask.progressNotes, createdAt: selectedTask.createdAt || new Date(), userName: "System" }];
        } catch (e) {
          currentNotesList = [{ id: 'legacy', note: selectedTask.progressNotes, createdAt: selectedTask.createdAt || new Date(), userName: "System" }];
        }
      }

      const newNoteObj = {
        id: Date.now().toString(),
        note: editNotes.trim(),
        createdAt: new Date().toISOString(),
        userName: sessionUser?.name || "System"
      };

      const updatedNotesList = [...currentNotesList, newNoteObj];
      const serializedNotes = JSON.stringify(updatedNotesList);

      const res = await fetch("/api/tasks", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId: selectedTask.id, progressNotes: serializedNotes }),
      });
      const data = await res.json();
      if (data.success) {
        setTasks(prev => prev.map(t => t.id === selectedTask.id ? { ...t, progressNotes: serializedNotes } : t));
        setSelectedTask(prev => prev ? { ...prev, progressNotes: serializedNotes } : null);
        setEditNotes("");
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

  const handleUploadProof = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedTask || !e.target.files?.[0]) return;
    const file = e.target.files[0];

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      const base64String = reader.result as string;
      setUploadingProof(true);
      try {
        const res = await fetch("/api/tasks", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ taskId: selectedTask.id, proofAttachment: base64String }),
        });
        const data = await res.json();
        if (data.success) {
          setTasks(prev => prev.map(t => t.id === selectedTask.id ? { ...t, proofAttachment: base64String } : t));
          setSelectedTask(prev => prev ? { ...prev, proofAttachment: base64String } : null);
          alert("Proof uploaded successfully!");
        } else {
          alert(data.error || "Failed to upload proof.");
        }
      } catch (err) {
        console.error(err);
        alert("Failed to upload proof.");
      } finally {
        setUploadingProof(false);
      }
    };
  };

  const handleSaveEditNote = async (noteId: string) => {
    if (!selectedTask || !editingNoteText.trim()) return;
    setSavingEditNote(true);
    try {
      let currentNotesList: any[] = [];
      if (selectedTask.progressNotes) {
        try {
          const parsed = JSON.parse(selectedTask.progressNotes);
          currentNotesList = Array.isArray(parsed) ? parsed : [{ id: 'legacy', note: selectedTask.progressNotes, createdAt: selectedTask.createdAt || new Date(), userName: "System" }];
        } catch (e) {
          currentNotesList = [{ id: 'legacy', note: selectedTask.progressNotes, createdAt: selectedTask.createdAt || new Date(), userName: "System" }];
        }
      }

      const updatedNotesList = currentNotesList.map(n => {
        if (n.id === noteId || (noteId === 'legacy' && n.id === 'legacy')) {
          return { ...n, note: editingNoteText.trim(), updatedAt: new Date().toISOString() };
        }
        return n;
      });

      const serializedNotes = JSON.stringify(updatedNotesList);

      const res = await fetch("/api/tasks", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId: selectedTask.id, progressNotes: serializedNotes }),
      });
      const data = await res.json();
      if (data.success) {
        setTasks(prev => prev.map(t => t.id === selectedTask.id ? { ...t, progressNotes: serializedNotes } : t));
        setSelectedTask(prev => prev ? { ...prev, progressNotes: serializedNotes } : null);
        setEditingNoteId(null);
        setEditingNoteText("");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSavingEditNote(false);
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
    setEditNotes("");
    setExpandNotesHistory(false);
    setExpandFollowUpHistory(false);
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
    if (!selectedTask || !editScheduleDate) return;
    setSavingSchedule(true);
    let scheduledAt: string | null = null;
    if (editScheduleDate && editScheduleTime) {
      scheduledAt = new Date(`${editScheduleDate}T${editScheduleTime}`).toISOString();
    } else if (editScheduleDate) {
      scheduledAt = new Date(`${editScheduleDate}T00:00:00`).toISOString();
    }
    if (!scheduledAt) {
      setSavingSchedule(false);
      return;
    }
    try {
      let currentHistoryList: any[] = [];
      if (selectedTask.followUpHistory) {
        try {
          const parsed = JSON.parse(selectedTask.followUpHistory);
          currentHistoryList = Array.isArray(parsed) ? parsed : [];
        } catch (e) {
          currentHistoryList = [];
        }
      }

      const newHistoryObj = {
        id: Date.now().toString(),
        scheduledAt,
        createdAt: new Date().toISOString(),
        userName: sessionUser?.name || "System"
      };

      const updatedHistoryList = [...currentHistoryList, newHistoryObj];
      const serializedHistory = JSON.stringify(updatedHistoryList);

      const res = await fetch("/api/tasks", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId: selectedTask.id, scheduledAt, followUpHistory: serializedHistory }),
      });
      const data = await res.json();
      if (data.success) {
        setTasks(prev => prev.map(t => t.id === selectedTask.id ? { ...t, scheduledAt, followUpHistory: serializedHistory } : t));
        setSelectedTask(prev => prev ? { ...prev, scheduledAt, followUpHistory: serializedHistory } : null);
        setEditScheduleDate("");
        setEditScheduleTime("");
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
  const [filterDate, setFilterDate] = useState("");

  const uniqueUsers = Array.from(new Set(tasks.map(t => (t.employee as any)?.name).filter(Boolean)));

  const filteredTasks = tasks.filter(t => {
    let matchUser = filterUser === "All" || (t.employee as any)?.name === filterUser;

    let matchDate = true;
    if (filterDate) {
      const taskDate = t.date ? new Date(t.date) : (t.createdAt ? new Date(t.createdAt) : null);
      if (taskDate) {
        // adjust to local date string matching yyyy-mm-dd
        const offset = taskDate.getTimezoneOffset() * 60000;
        const localDate = new Date(taskDate.getTime() - offset).toISOString().split("T")[0];
        if (localDate !== filterDate) matchDate = false;
      } else {
        matchDate = false;
      }
    }

    return matchUser && matchDate;
  });

  const handleExportTasks = () => {
    const headers = ["Task ID", "Title", "Type", "Description", "Status", "Assigned User", "Created At", "Progress Notes"];
    const rows = filteredTasks.map(t => {
      let notesText = "";
      if (t.progressNotes) {
        try {
          const parsed = JSON.parse(t.progressNotes);
          if (Array.isArray(parsed)) {
            notesText = parsed.map(n => `[${n.userName || "System"} at ${new Date(n.createdAt).toLocaleDateString("en-IN")}]: ${n.note}`).join("\n");
          } else {
            notesText = t.progressNotes;
          }
        } catch (e) {
          notesText = t.progressNotes;
        }
      }
      const assignedUser = (t.employee as any)?.name || "Unassigned";
      return {
        "Task ID": t.id,
        "Title": t.taskTitle,
        "Type": t.taskType,
        "Description": t.description || "",
        "Status": t.status,
        "Assigned User": assignedUser,
        "Created At": t.createdAt ? new Date(t.createdAt).toLocaleDateString("en-IN") : t.date || "",
        "Progress Notes": notesText
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(rows, { header: headers });

    // Set auto widths based on content
    const max_widths = headers.map(h => {
      let max_len = h.length;
      rows.forEach(r => {
        const val = String((r as any)[h] || "");
        const lines = val.split("\n");
        lines.forEach(l => {
          if (l.length > max_len) max_len = l.length;
        });
      });
      return { wch: Math.min(Math.max(max_len + 2, 10), 60) };
    });
    worksheet["!cols"] = max_widths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Tasks");

    const fileName = `Tasks_Export_${filterUser === "All" ? "All_Users" : filterUser.replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  const pending = filteredTasks.filter(t => t.status === "Pending");
  const inProgress = filteredTasks.filter(t => t.status === "In Progress");
  const completed = filteredTasks.filter(t => t.status === "Completed");

  const paginatedPending = pending.slice((pagePending - 1) * ITEMS_PER_PAGE, pagePending * ITEMS_PER_PAGE);
  const paginatedInProgress = inProgress.slice((pageInProgress - 1) * ITEMS_PER_PAGE, pageInProgress * ITEMS_PER_PAGE);
  const paginatedCompleted = completed.slice((pageCompleted - 1) * ITEMS_PER_PAGE, pageCompleted * ITEMS_PER_PAGE);

  const cols = [
    {
      id: "Pending",
      label: "Pending",
      count: pending.length,
      tasks: paginatedPending,
      page: pagePending,
      setPage: setPagePending,
      totalPages: Math.ceil(pending.length / ITEMS_PER_PAGE),
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
      tasks: paginatedInProgress,
      page: pageInProgress,
      setPage: setPageInProgress,
      totalPages: Math.ceil(inProgress.length / ITEMS_PER_PAGE),
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
      tasks: paginatedCompleted,
      page: pageCompleted,
      setPage: setPageCompleted,
      totalPages: Math.ceil(completed.length / ITEMS_PER_PAGE),
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
        {task.description && cleanDescription(task.description) && (
          <p className="text-[10px] text-slate-500 mt-2 font-medium line-clamp-2 leading-relaxed whitespace-pre-line">{cleanDescription(task.description)}</p>
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
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-800 flex items-center gap-2">
            <LayoutGrid className="w-5 h-5 text-[#714B67]" />
            My Tasks
          </h1>
          <p className="text-xs text-slate-500 mt-1">Manage your daily workload — view as Kanban or list, filter by dates.</p>
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
          <input
            type="date"
            className="bg-white border border-slate-200 text-slate-700 text-[10px] font-black uppercase tracking-wider rounded-lg px-3 py-2 focus:outline-none focus:border-[#714B67] shadow-sm cursor-pointer"
            value={filterDate}
            onChange={e => setFilterDate(e.target.value)}
            title="Filter by Date"
          />
          {filterDate && (
            <button
              onClick={() => setFilterDate("")}
              className="text-[10px] text-slate-400 hover:text-slate-600 font-bold uppercase tracking-wider -ml-1"
            >
              Clear
            </button>
          )}
          <div className="flex bg-slate-100 rounded-lg p-1 shadow-sm border border-slate-200">
            <button
              onClick={() => setViewMode("kanban")}
              className={`px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all ${viewMode === "kanban" ? "bg-white text-slate-800 shadow" : "text-slate-500 hover:text-slate-700"}`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              Kanban
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all ${viewMode === "list" ? "bg-white text-slate-800 shadow" : "text-slate-500 hover:text-slate-700"}`}
            >
              <List className="w-3.5 h-3.5" />
              List
            </button>
          </div>
          <button
            onClick={handleExportTasks}
            className="flex items-center gap-1.5 bg-[#714B67] hover:bg-[#5b3c53] text-white text-[10px] font-black uppercase tracking-wider rounded-lg px-3 py-2 transition-all shadow-sm font-sans"
          >
            <Download className="w-3.5 h-3.5" />
            Export Excel
          </button>
          <div className="bg-slate-100 rounded-lg px-3 py-1.5 text-[10px] font-black text-slate-600 font-mono shadow-sm">
            {filteredTasks.length} tasks total
          </div>
        </div>
      </div>

      {viewMode === "kanban" ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 flex-1 items-start">
          {/* Kanban Grid */}
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
                          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold focus:outline-none focus:border-[#714B67] text-slate-700 bg-white"
                          value={type}
                          onChange={e => setType(e.target.value)}
                        >
                          <option value="Meeting">Meeting</option>
                          <option value="Call">Call</option>
                          <option value="Development">Development</option>
                          <option value="Marketing">Marketing</option>
                          <option value="Field Visit">Field Visit</option>
                          <option value="Operations">Operations</option>
                          <option value="Support">Support</option>
                          <option value="Other">Other</option>
                        </select>
                        <textarea
                          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold focus:outline-none focus:border-[#714B67] placeholder-slate-400 text-slate-800"
                          placeholder="Task Description"
                          rows={3}
                          value={desc}
                          onChange={e => setDesc(e.target.value)}
                        />
                        <div className="flex gap-2">
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

                  {/* Pagination Controls */}
                  {col.totalPages > 1 && (
                    <div className="flex items-center justify-between pt-4 mt-2 border-t border-slate-200/60 pb-2">
                      <button
                        onClick={() => col.setPage((p: number) => Math.max(1, p - 1))}
                        disabled={col.page === 1}
                        className="px-2 py-1 bg-white border border-slate-200 rounded text-[10px] font-bold text-slate-500 disabled:opacity-40 hover:bg-slate-50 transition-colors"
                      >
                        Prev
                      </button>
                      <span className="text-[10px] font-black tracking-widest text-slate-400">
                        {col.page} / {col.totalPages}
                      </span>
                      <button
                        onClick={() => col.setPage((p: number) => Math.min(col.totalPages, p + 1))}
                        disabled={col.page === col.totalPages}
                        className="px-2 py-1 bg-white border border-slate-200 rounded text-[10px] font-bold text-slate-500 disabled:opacity-40 hover:bg-slate-50 transition-colors"
                      >
                        Next
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex-1 bg-white border border-slate-200 rounded-2xl overflow-auto shadow-sm">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead className="bg-slate-50 sticky top-0 z-10">
              <tr>
                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-500 border-b border-slate-200">Task Title & Info</th>
                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-500 border-b border-slate-200">Assigned To</th>
                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-500 border-b border-slate-200">Status</th>
                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-500 border-b border-slate-200">Date Logged</th>
                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-500 border-b border-slate-200">Progress Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTasks.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400 text-xs font-bold">No tasks found.</td>
                </tr>
              ) : (
                filteredTasks.map(t => {
                  let parsedNotes: any[] = [];
                  if (t.progressNotes) {
                    try {
                      parsedNotes = JSON.parse(t.progressNotes);
                    } catch (e) { }
                  }

                  return (
                    <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4 align-top">
                        <div className="font-bold text-slate-800 text-sm mb-1">{t.taskTitle}</div>
                        <div className="text-[10px] font-black uppercase tracking-wider text-[#714B67] bg-[#714B67]/10 inline-block px-2 py-0.5 rounded-md mb-2">{t.taskType}</div>
                        <p className="text-xs text-slate-650 line-clamp-2 whitespace-pre-line">{cleanDescription(t.description)}</p>
                      </td>
                      <td className="p-4 align-top text-xs font-bold text-slate-700">
                        {(t.employee as any)?.name || "Unknown"}
                      </td>
                      <td className="p-4 align-top">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider
                          ${t.status === "Pending" ? "bg-amber-100 text-amber-700" : t.status === "In Progress" ? "bg-blue-100 text-blue-700" : "bg-emerald-100 text-emerald-700"}
                        `}>
                          {t.status}
                        </span>
                      </td>
                      <td className="p-4 align-top text-xs text-slate-600 font-mono">
                        {t.date ? new Date(t.date).toLocaleDateString() : t.createdAt ? new Date(t.createdAt).toLocaleDateString() : "-"}
                      </td>
                      <td className="p-4 align-top">
                        {parsedNotes.length > 0 ? (
                          <div className="space-y-3 max-h-[120px] overflow-y-auto pr-2 custom-scrollbar">
                            {parsedNotes.map((note: any, i: number) => (
                              <div key={i} className="text-xs bg-slate-50 p-2 rounded border border-slate-100">
                                <div className="font-bold text-slate-700 text-[10px] uppercase mb-1">{note.userName || "User"} &bull; {new Date(note.createdAt).toLocaleString()}</div>
                                <div className="text-slate-600">{note.note}</div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">No notes</span>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      )}

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
                    {selectedTask.description && cleanDescription(selectedTask.description) && (
                      <p className="text-xs text-slate-500 mt-1 font-medium whitespace-pre-line">{cleanDescription(selectedTask.description)}</p>
                    )}
                  </div>

                  {/* Action buttons: Edit, Delete, Close */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => {
                        setEditTitle(selectedTask.taskTitle);
                        setEditType(selectedTask.taskType);
                        setEditDesc(cleanDescription(selectedTask.description || ""));
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
                  <div
                    className="flex items-center gap-2 mb-3 cursor-pointer select-none"
                    onClick={() => setExpandFollowUpHistory(!expandFollowUpHistory)}
                  >
                    <CalendarClock className="w-4 h-4 text-violet-500" />
                    <p className="text-[10px] uppercase font-black text-violet-700 tracking-wider">Call Follow-up Date &amp; Time</p>
                    {expandFollowUpHistory ? <ChevronUp className="w-3.5 h-3.5 text-violet-500" /> : <ChevronDown className="w-3.5 h-3.5 text-violet-500" />}
                    {selectedTask.scheduledAt && (
                      <span className="ml-auto text-[9px] font-bold text-violet-500 bg-violet-100 px-2 py-0.5 rounded-full border border-violet-200">
                        Latest: {new Date(selectedTask.scheduledAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                        {" "}
                        {new Date(selectedTask.scheduledAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    )}
                  </div>

                  {expandFollowUpHistory && (
                    <div className="space-y-3 animate-fadeIn">
                      <div className="grid grid-cols-2 gap-3">
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
                          {savingSchedule ? "Saving..." : "Add Follow-up"}
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
                            Clear Latest
                          </button>
                        )}
                      </div>

                      {/* Previous Schedules List */}
                      {(() => {
                        let historyList: any[] = [];
                        if (selectedTask.followUpHistory) {
                          try {
                            const parsed = JSON.parse(selectedTask.followUpHistory);
                            historyList = Array.isArray(parsed) ? parsed : [];
                          } catch (e) {
                            historyList = [];
                          }
                        }

                        return historyList.length > 0 && (
                          <div className="mt-3 space-y-2 border-t border-slate-100 pt-3 max-h-40 overflow-y-auto pr-1">
                            <p className="text-[8px] uppercase font-black text-slate-400 tracking-wider">Scheduled History</p>
                            {historyList.map((h, idx) => (
                              <div key={h.id || idx} className="p-2 rounded-lg border border-slate-100 bg-slate-50/40 flex items-center justify-between text-xs font-semibold text-slate-700">
                                <span className="flex items-center gap-1.5">
                                  <CalendarClock className="w-3.5 h-3.5 text-violet-400" />
                                  {new Date(h.scheduledAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                                  {" "}
                                  {new Date(h.scheduledAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                                </span>
                                <span className="text-[8px] text-slate-400 font-bold uppercase">
                                  By {h.userName || "System"}
                                </span>
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                  )}
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
                    <span className={`ml-auto text-[11px] font-black px-3 py-1 rounded-full border font-mono ${selectedTask.timerState === "Running"
                        ? "bg-green-100 text-green-700 border-green-200"
                        : "bg-slate-100 text-slate-500 border-slate-200"
                      }`}>
                      {selectedTask.timerState === "Running" && <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse mr-1.5" />}
                      {formatTimer(getLiveElapsed(selectedTask))}
                    </span>
                  </div>
                </div>

                {/* Proof of Work & Progress Notes */}
                <div className="px-6 py-4 space-y-5">
                  {/* Proof of Work Section */}
                  <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50">
                    <div className="flex items-center gap-2 mb-3">
                      <ImageIcon className="w-4 h-4 text-emerald-500" />
                      <p className="text-[10px] uppercase font-black text-slate-700 tracking-wider">Proof of Work (Mandatory for Completion)</p>
                    </div>
                    {selectedTask.proofAttachment ? (
                      <div className="space-y-2">
                        {(() => {
                          const url = selectedTask.proofAttachment.toLowerCase();
                          if (url.includes('application/pdf')) {
                            return <div className="p-3 bg-white rounded border border-slate-200 text-xs font-bold text-slate-700 flex items-center gap-2"><Paperclip className="w-4 h-4" /> PDF Document Uploaded</div>;
                          }
                          if (url.includes('audio/')) {
                            return <audio controls className="w-full h-10"><source src={selectedTask.proofAttachment} /></audio>;
                          }
                          return (
                            <img
                              src={selectedTask.proofAttachment}
                              alt="Proof"
                              className="max-h-48 rounded-lg border border-slate-200 object-contain shadow-sm bg-slate-100"
                            />
                          );
                        })()}
                        <p className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded inline-block">Proof uploaded</p>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2">
                        <label className="flex items-center justify-center w-full h-24 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
                          <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            {uploadingProof ? (
                              <Loader2 className="w-6 h-6 text-slate-400 animate-spin mb-2" />
                            ) : (
                              <Paperclip className="w-6 h-6 text-slate-400 mb-2" />
                            )}
                            <p className="mb-2 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                              {uploadingProof ? "Uploading..." : "Click to upload Proof"}
                            </p>
                          </div>
                          <input type="file" className="hidden" accept="image/*,.pdf,audio/*" onChange={handleUploadProof} disabled={uploadingProof} />
                        </label>
                      </div>
                    )}
                  </div>

                  {/* Progress Notes */}
                  <div>
                    <div
                      className="flex items-center gap-2 mb-3 cursor-pointer select-none"
                      onClick={() => setExpandNotesHistory(!expandNotesHistory)}
                    >
                      <StickyNote className="w-4 h-4 text-indigo-500" />
                      <p className="text-[10px] uppercase font-black text-slate-700 tracking-wider">Progress Notes History</p>
                      {expandNotesHistory ? <ChevronUp className="w-3.5 h-3.5 text-indigo-500" /> : <ChevronDown className="w-3.5 h-3.5 text-indigo-500" />}
                    </div>

                    {/* Previous Notes List */}
                    {expandNotesHistory && (() => {
                      let notesList: any[] = [];
                      if (selectedTask.progressNotes) {
                        try {
                          const parsed = JSON.parse(selectedTask.progressNotes);
                          notesList = Array.isArray(parsed) ? parsed : [{ id: 'legacy', note: selectedTask.progressNotes, createdAt: selectedTask.createdAt || new Date(), userName: "System" }];
                        } catch (e) {
                          notesList = [{ id: 'legacy', note: selectedTask.progressNotes, createdAt: selectedTask.createdAt || new Date(), userName: "System" }];
                        }
                      }

                      return notesList.length > 0 && (
                        <div className="mb-4 space-y-2.5 max-h-48 overflow-y-auto pr-1 animate-fadeIn">
                          {notesList.map((n, idx) => {
                            const noteId = n.id || idx.toString();
                            const isEditingThisNote = editingNoteId === noteId;
                            const canEdit = (sessionUser as any)?.role === "Owner" || (n.userName && sessionUser?.name && n.userName.trim() === sessionUser.name.trim());

                            return (
                              <div key={noteId} className="p-2.5 rounded-xl border border-slate-100 bg-slate-50/60 text-left">
                                <div className="flex items-center justify-between gap-2 mb-1">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[9px] font-black uppercase text-indigo-650 tracking-wider">
                                      {n.userName || "System"}
                                    </span>
                                    {n.updatedAt && (
                                      <span className="text-[7px] font-bold text-slate-400 bg-slate-100 px-1 rounded uppercase tracking-wider">Edited</span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-[9px] text-slate-450 font-medium">
                                      {new Date(n.createdAt).toLocaleString("en-IN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "short" })}
                                    </span>
                                    {canEdit && !isEditingThisNote && (
                                      <button
                                        onClick={() => {
                                          setEditingNoteId(noteId);
                                          setEditingNoteText(n.note);
                                        }}
                                        className="text-slate-455 hover:text-indigo-600 transition-colors p-0.5"
                                        title="Edit Note"
                                      >
                                        <Edit2 className="w-3 h-3" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                                {isEditingThisNote ? (
                                  <div className="mt-1 space-y-1.5">
                                    <textarea
                                      className="w-full border border-indigo-200 rounded-lg p-2 text-xs font-semibold focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100 text-slate-700 bg-white"
                                      rows={2}
                                      value={editingNoteText}
                                      onChange={e => setEditingNoteText(e.target.value)}
                                    />
                                    <div className="flex justify-end gap-1.5">
                                      <button
                                        onClick={() => {
                                          setEditingNoteId(null);
                                          setEditingNoteText("");
                                        }}
                                        disabled={savingEditNote}
                                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-655 rounded text-[9px] font-black uppercase transition-all"
                                      >
                                        Cancel
                                      </button>
                                      <button
                                        onClick={() => handleSaveEditNote(noteId)}
                                        disabled={savingEditNote || !editingNoteText.trim() || editingNoteText.trim() === n.note.trim()}
                                        className="px-2.5 py-1 bg-indigo-650 hover:bg-indigo-700 disabled:opacity-50 text-white rounded text-[9px] font-black uppercase flex items-center gap-1 transition-all"
                                      >
                                        {savingEditNote ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Save className="w-2.5 h-2.5" />}
                                        Save
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <p className="text-[11px] text-slate-700 leading-relaxed font-semibold break-words whitespace-pre-wrap">
                                    {n.note}
                                  </p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}

                    <textarea
                      className="w-full border border-slate-200 rounded-xl px-4 py-3 text-xs font-medium text-slate-800 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 resize-none placeholder-slate-400 leading-relaxed"
                      rows={3}
                      placeholder="Add a new progress note, blocker, or update here..."
                      value={editNotes}
                      onChange={e => setEditNotes(e.target.value)}
                    />
                    <div className="flex items-center justify-between mt-3">
                      <p className="text-[9px] text-slate-450 font-medium">
                        Created: {new Date(selectedTask.createdAt || selectedTask.date).toLocaleString("en-IN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "short" })}
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={saveProgressNotes}
                          disabled={savingNotes || !editNotes.trim()}
                          className="flex items-center gap-2 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 disabled:opacity-40 disabled:cursor-not-allowed text-indigo-700 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all"
                        >
                          {savingNotes ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                          {savingNotes ? "Saving..." : "Add Note"}
                        </button>
                        <button
                          onClick={async () => {
                            if (editNotes.trim()) {
                              const success = await saveProgressNotes();
                              if (!success) return;
                            }
                            setSelectedTask(null);
                            setIsEditingTask(false);
                          }}
                          disabled={savingNotes}
                          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all"
                        >
                          <CheckCircle2 className="w-3 h-3" /> Close Task View
                        </button>
                      </div>
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
