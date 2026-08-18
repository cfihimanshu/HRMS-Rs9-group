"use client";

import React, { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import * as XLSX from "xlsx";
import { cn } from "@/lib/utils";
import DailyBackdateEntryModal from "./DailyBackdateEntryModal";
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
  Image as ImageIcon,
  Search
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
  assignedBy?: string | null;
  assignedByUser?: { id: string; name: string; role: string } | null;
  deadlineHours?: number | null;
  deadlineAt?: string | null;
  updatedAt?: string | null;
  completedAt?: string | null;
  scheduleId?: string | null;
  leadStatus?: string | null;
  callStatus?: string | null;
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

const SearchableCombobox = ({
  label,
  value,
  onChange,
  onSelectOption,
  options,
  placeholder,
  required = false,
  disabled = false
}: {
  label: string;
  value: string;
  onChange: (val: string) => void;
  onSelectOption?: (val: string) => void;
  options: string[];
  placeholder: string;
  required?: boolean;
  disabled?: boolean;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = options.filter(opt =>
    opt && opt.toLowerCase().includes((value || "").toLowerCase())
  );

  return (
    <div className={`relative font-sans ${isOpen ? "z-[99999]" : "z-1"}`} ref={containerRef}>
      <label className="block text-[9px] uppercase tracking-wider text-emerald-700 font-black mb-1">{label}</label>
      <div className="relative">
        <input
          type="text"
          required={required}
          disabled={disabled}
          value={value}
          onFocus={() => { if (!disabled) setIsOpen(true); }}
          onChange={e => {
            onChange(e.target.value);
            if (!disabled) setIsOpen(true);
          }}
          placeholder={placeholder}
          className="w-full border border-emerald-200 rounded-lg px-2.5 py-2 text-xs font-bold focus:outline-none focus:border-emerald-500 placeholder-slate-400 text-slate-800 bg-white shadow-2xs pr-7 disabled:opacity-50 disabled:bg-slate-100"
        />
        <div
          onClick={() => { if (!disabled) setIsOpen(prev => !prev); }}
          className="absolute right-2 top-2.5 cursor-pointer text-emerald-600 hover:text-emerald-800 text-[10px]"
        >
          ▼
        </div>
      </div>
      {isOpen && !disabled && (
        <div className="absolute z-[999999] left-0 right-0 mt-1 bg-white border border-emerald-300 rounded-xl shadow-2xl max-h-48 overflow-y-auto divide-y divide-slate-100 font-sans animate-fade-in">
          {filteredOptions.length > 0 ? (
            filteredOptions.map((opt, i) => (
              <div
                key={i}
                onMouseDown={(e) => {
                  e.preventDefault();
                  onChange(opt);
                  if (onSelectOption) onSelectOption(opt);
                  setIsOpen(false);
                }}
                className="px-3 py-2 text-xs font-bold text-slate-800 hover:bg-emerald-50 hover:text-emerald-900 cursor-pointer transition-colors"
              >
                {opt}
              </div>
            ))
          ) : (
            <div className="px-3 py-2 text-xs text-slate-400 italic">No matching options found (keep typing for custom)</div>
          )}
        </div>
      )}
    </div>
  );
};

export default function KanbanBoard({
  initialDateFilter,
  initialSearchFilter,
  initialUserFilter
}: {
  initialDateFilter?: string;
  initialSearchFilter?: string;
  initialUserFilter?: string;
}) {
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
  const [showDailyBackdate, setShowDailyBackdate] = useState(false);
  const [title, setTitle] = useState("");
  const [type, setType] = useState("Meeting");
  const [desc, setDesc] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Call sub-fields & masters
  const [callCategory, setCallCategory] = useState<"Interview" | "Bank" | "Others" | "">("");
  const [otherCategoryDesc, setOtherCategoryDesc] = useState("");
  const [selectedBankId, setSelectedBankId] = useState<string>("");
  const [bankName, setBankName] = useState("");
  const [branchName, setBranchName] = useState("");
  const [officerName, setOfficerName] = useState("");
  const [officerPhone, setOfficerPhone] = useState("");
  const [bankCategory, setBankCategory] = useState("Operations");
  const [bankCategoryOther, setBankCategoryOther] = useState("");
  const [bankSubType, setBankSubType] = useState<string>("AO related");
  const [aoName, setAoName] = useState<string>("");
  const [rboName, setRboName] = useState<string>("");
  const [caseDetails, setCaseDetails] = useState<string>("");
  const [callDirection, setCallDirection] = useState<string>("Incoming Call");
  const [personName, setPersonName] = useState<string>("");
  const [contactNo, setContactNo] = useState<string>("");
  const [companyName, setCompanyName] = useState<string>("");
  const [emailAddress, setEmailAddress] = useState<string>("");
  const [visitLocation, setVisitLocation] = useState<string>("");
  const [salesReason, setSalesReason] = useState<string>("");
  const [otherSalesReason, setOtherSalesReason] = useState<string>("");
  const [callStatus, setCallStatus] = useState<string>("");

  // Dynamic Task Category Master List (General, Legal, IT, Bank, Interview, Others, etc.)
  const [bankCategories, setBankCategories] = useState<string[]>([]);
  const [selectedTaskCategory, setSelectedTaskCategory] = useState<string>("General");
  const [showAddCategoryInput, setShowAddCategoryInput] = useState(false);
  const [newCategoryText, setNewCategoryText] = useState("");

  // Dynamic Task Modes List (Call, Meeting, Email, WhatsApp, SMS, Field Visit, Social Media, etc.)
  const [taskModes, setTaskModes] = useState<{ id: number; name: string }[]>([]);
  const [showAddModeInput, setShowAddModeInput] = useState(false);
  const [newModeText, setNewModeText] = useState("");

  // Dynamic Project Masters List (HRMS, RRR, etc.)
  const [projectList, setProjectList] = useState<{ id: number | string; name: string }[]>([]);
  const [selectedProjectName, setSelectedProjectName] = useState("");
  const [showAddProjectInput, setShowAddProjectInput] = useState(false);
  const [newProjectText, setNewProjectText] = useState("");

  // Dynamic Custom Fields
  const [customCallFields, setCustomCallFields] = useState<{ key: string; value: string }[]>([]);

  // Bank / Branch master data (from Legal Recovery)
  const [banksList, setBanksList] = useState<{ id: string | number; bankName: string; bankCode: string }[]>([]);
  const [branchesList, setBranchesList] = useState<{
    id: string | number;
    branchName: string;
    branchCode: string;
    bankId?: string | number;
    rbo?: string;
    rboName?: string;
    branchManager?: string;
    branchManagerContact?: string;
    aoName?: string;
    foName?: string;
    foContact?: string;
  }[]>([]);
  const isBillFollowUp = selectedTaskCategory.trim().toLowerCase() === "bill follow up";

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

  // Forward Task Date (Postpone to future date)
  const [forwardDateInput, setForwardDateInput] = useState("");
  const [forwardingDate, setForwardingDate] = useState(false);

  // Owner task assignment and deadline states
  const [assigneeId, setAssigneeId] = useState("");
  const [deadlineDate, setDeadlineDate] = useState("");
  const [deadlineTime, setDeadlineTime] = useState("");
  const [entryDate, setEntryDate] = useState("");
  const [entryTime, setEntryTime] = useState("09:00");
  const [entryStatus, setEntryStatus] = useState<"Pending" | "In Progress" | "Completed">("Pending");

  // Task Editing & Deletion
  const [isEditingTask, setIsEditingTask] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editType, setEditType] = useState("Call");
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
      fetchBanks();
      fetchCategories();
      fetchModes();
      fetchProjects();
    }
  }, [session, status]);

  const fetchProjects = async () => {
    try {
      const res = await fetch("/api/tasks/projects");
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setProjectList(data.data);
      }
    } catch (err) {
      console.error("Failed to load project masters:", err);
    }
  };

  const handleAddProject = async () => {
    const trimmed = newProjectText.trim();
    if (!trimmed) return;
    if (projectList.map(p => p.name.toLowerCase()).includes(trimmed.toLowerCase())) {
      alert("Project already exists in master database!");
      setSelectedProjectName(trimmed);
      setNewProjectText("");
      setShowAddProjectInput(false);
      return;
    }

    try {
      const res = await fetch("/api/tasks/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      const data = await res.json();
      if (data.success) {
        setProjectList(prev => [...prev.filter(p => p.id !== data.data.id), data.data]);
        setSelectedProjectName(data.data.name);
        setNewProjectText("");
        setShowAddProjectInput(false);
      } else {
        alert(data.error || "Failed to save project master to DB.");
      }
    } catch (err) {
      console.error("Failed to save project master:", err);
      alert("Failed to save project master.");
    }
  };

  useEffect(() => {
    if (showAdd && (sessionUser as any)?.role === "Owner") {
      const fetchUsers = async () => {
        try {
          const res = await fetch("/api/tasks/company-users");
          const data = await res.json();
          if (data.success) setCompanyUsers(data.data);
        } catch (e) {
          console.error("Failed to fetch users for task assignment:", e);
        }
      };
      fetchUsers();
    }
  }, [showAdd, sessionUser]);

  const sortCategoriesList = (cats: string[]): string[] => {
    const list = [...cats];
    list.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
    const idx = list.findIndex(c => c.trim().toLowerCase() === "others");
    if (idx !== -1) {
      const [others] = list.splice(idx, 1);
      list.push(others);
    }
    return list;
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch("/api/tasks/call-categories");
      const data = await res.json();
      if (data.success) {
        setBankCategories(sortCategoriesList(data.data || []));
      }
    } catch (err) {
      console.error("Failed to load call categories:", err);
    }
  };

  const fetchModes = async () => {
    try {
      const res = await fetch("/api/tasks/modes");
      const data = await res.json();
      if (data.success) {
        setTaskModes(data.data || []);
      }
    } catch (err) {
      console.error("Failed to load task modes:", err);
    }
  };

  const handleAddMode = async () => {
    const trimmed = newModeText.trim();
    if (!trimmed) return;
    if (taskModes.map(m => m.name.toLowerCase()).includes(trimmed.toLowerCase())) {
      alert("Task mode already exists in database!");
      setType(trimmed);
      setNewModeText("");
      setShowAddModeInput(false);
      return;
    }

    try {
      const res = await fetch("/api/tasks/modes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      const data = await res.json();
      if (data.success) {
        setTaskModes(prev => [...prev, data.data]);
        setType(data.data.name);
        setNewModeText("");
        setShowAddModeInput(false);
      } else {
        alert(data.error || "Failed to save task mode to DB.");
      }
    } catch (err) {
      console.error("Failed to save task mode to DB:", err);
      alert("Failed to save task mode to DB.");
    }
  };

  const handleAddCategory = async () => {
    const trimmed = newCategoryText.trim();
    if (!trimmed) return;
    if (bankCategories.map(c => c.toLowerCase()).includes(trimmed.toLowerCase())) {
      alert("Category already exists in master database!");
      setSelectedTaskCategory(trimmed);
      if (!title || bankCategories.includes(title)) setTitle(trimmed);
      setNewCategoryText("");
      setShowAddCategoryInput(false);
      return;
    }

    try {
      const res = await fetch("/api/tasks/call-categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      const data = await res.json();
      if (data.success) {
        const updated = sortCategoriesList([...bankCategories, data.data]);
        setBankCategories(updated);
        setSelectedTaskCategory(data.data);
        if (!title || bankCategories.includes(title)) setTitle(data.data);
        setType("Call");
        setCallCategory("Others");
        setOtherCategoryDesc(data.data);
        setNewCategoryText("");
        setShowAddCategoryInput(false);
      } else {
        alert(data.error || "Failed to save category to DB.");
      }
    } catch (err) {
      console.error("Failed to save category to DB:", err);
      alert("Failed to save category to DB.");
    }
  };

  const fetchBanks = async () => {
    try {
      const res = await fetch("/api/legal-recovery/banks");
      const data = await res.json();
      if (data.success) setBanksList(data.data || []);
    } catch (err) {
      console.error("Failed to load banks:", err);
    }
  };

  const fetchBranches = async (bankId: string) => {
    if (!bankId) { setBranchesList([]); return; }
    try {
      const res = await fetch(`/api/legal-recovery/branches?bankId=${bankId}`);
      const data = await res.json();
      if (data.success) setBranchesList(data.data || []);
    } catch (err) {
      console.error("Failed to load branches:", err);
    }
  };

  const fetchTasks = async () => {
    try {
      // Tier 1: Load Today's tasks for instant 0ms speed
      const resToday = await fetch("/api/tasks?range=today");
      const dataToday = await resToday.json();
      if (dataToday.success && Array.isArray(dataToday.data)) {
        setTasks(dataToday.data);
      }
      setLoading(false); // Hide loading spinner early!

      // Tier 2: Load Recent 3 Days (Yesterday & Day Before Yesterday) fast
      const resRecent = await fetch("/api/tasks?range=recent");
      const dataRecent = await resRecent.json();
      if (dataRecent.success && Array.isArray(dataRecent.data)) {
        setTasks(dataRecent.data);
      }

      // Tier 3: Load all tasks in background
      const resAll = await fetch("/api/tasks?range=all&limit=all");
      const dataAll = await resAll.json();
      if (dataAll.success && Array.isArray(dataAll.data)) {
        setTasks(dataAll.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Live tick every second to update running timer display
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    const effectiveTitle = selectedTaskCategory.trim() || title.trim();
    if (!effectiveTitle) return;
    setSubmitting(true);

    if ((sessionUser as any)?.role === "Owner") {
      if (!assigneeId) {
        alert("Please select a user to assign this task to.");
        setSubmitting(false);
        return;
      }
    }

    // Build structured description for Bank or Call tasks
    let finalDesc = desc;
    if (selectedTaskCategory === "Bank" || callCategory === "Bank" || selectedTaskCategory === "Notice" || isBillFollowUp) {
      const customLines = customCallFields
        .filter(f => f.key.trim() && f.value.trim())
        .map(f => `${f.key.trim()}: ${f.value.trim()}`);

      finalDesc = [
        `Category: ${selectedTaskCategory}${type === "Call" ? ` (${callDirection})` : ` (${bankSubType})`}`,
        bankName ? `Bank: ${bankName}` : "",
        branchName ? `Branch: ${branchName}` : "",
        aoName ? `AO: ${aoName}` : "",
        rboName ? `RBO: ${rboName}` : "",
        caseDetails ? `Case Details: ${caseDetails}` : "",
        officerName ? `Officer Name: ${officerName}` : "",
        officerPhone ? `Officer Phone: ${officerPhone}` : "",
        ...customLines,
        desc ? `Remark: ${desc}` : "",
      ].filter(Boolean).join("\n");
    } else if (selectedTaskCategory === "Sales") {
      const effectiveReason = salesReason === "Other" ? (otherSalesReason ? `Other: ${otherSalesReason}` : "Other") : salesReason;
      finalDesc = [
        type === "Call" ? `Call Mode: ${callDirection}` : `Task Mode: ${type}`,
        personName ? `Person Name: ${personName}` : "",
        contactNo ? `Contact No: ${contactNo}` : "",
        companyName ? `Company Name: ${companyName}` : "",
        emailAddress ? `Email: ${emailAddress}` : "",
        visitLocation ? `Location: ${visitLocation}` : "",
        effectiveReason ? `Reason: ${effectiveReason}` : "",
        callStatus ? `Status: ${callStatus}` : "",
        otherCategoryDesc ? `Describe: ${otherCategoryDesc}` : "",
        desc ? `Remark: ${desc}` : "",
      ].filter(Boolean).join("\n");
    } else if (type === "Call" && callCategory === "Interview") {
      finalDesc = [`Call Category: Interview (${callDirection})`, desc ? `Remark: ${desc}` : ""].filter(Boolean).join("\n");
    } else if (type === "Call" && callCategory === "Others") {
      finalDesc = [
        `Call Mode: ${callDirection}`,
        otherCategoryDesc ? `Describe: ${otherCategoryDesc}` : "",
        desc ? `Remark: ${desc}` : "",
      ].filter(Boolean).join("\n");
    } else if (type === "Call") {
      finalDesc = [`Call Mode: ${callDirection}`, desc].filter(Boolean).join("\n");
    } else if ((selectedTaskCategory === "IT" || type === "Development") && selectedProjectName) {
      finalDesc = [`[Project: ${selectedProjectName}]`, desc].filter(Boolean).join(" ");
    }

    let deadlineAt: string | null = null;
    if (deadlineDate) {
      const timeVal = deadlineTime || "18:00";
      deadlineAt = new Date(`${deadlineDate}T${timeVal}`).toISOString();
    }

    let historicalEntryAt: string | null = null;
    if (entryDate) {
      const selectedEntryDate = new Date(`${entryDate}T${entryTime || "09:00"}:00`);
      if (selectedEntryDate.getTime() > Date.now()) {
        alert("Back-date entry future date ki nahi ho sakti.");
        setSubmitting(false);
        return;
      }
      historicalEntryAt = selectedEntryDate.toISOString();
    }

    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskTitle: effectiveTitle,
          taskType: ["AO related", "RBO related", "branch related", "case related"].includes(type) ? "Bank Related" : (type || "General"),
          subType: type === "Call" ? callDirection : (selectedTaskCategory === "Bank" ? bankSubType : undefined),
          bankName: bankName || undefined,
          branchName: branchName || undefined,
          aoName: aoName || undefined,
          rboName: rboName || undefined,
          caseDetails: caseDetails || undefined,
          description: finalDesc,
          status: entryDate ? entryStatus : "Pending",
          employeeId: assigneeId || undefined,
          entryDate: historicalEntryAt || undefined,
          deadlineAt: deadlineAt || undefined,
          personName: personName || undefined,
          contactNo: contactNo || undefined,
          companyName: companyName || undefined,
          emailAddress: emailAddress || undefined,
          visitLocation: visitLocation || undefined,
          salesReason: salesReason === "Other" ? (otherSalesReason || "Other") : (salesReason || undefined),
          callStatus: callStatus || undefined
        }),
      });
      const data = await res.json();
      if (data.success) {
        setTitle("");
        setSelectedTaskCategory("General");
        setDesc("");
        setCallCategory("");
        setCallDirection("Incoming Call");
        setPersonName("");
        setContactNo("");
        setCompanyName("");
        setEmailAddress("");
        setVisitLocation("");
        setSalesReason("");
        setOtherSalesReason("");
        setCallStatus("");
        setOtherCategoryDesc("");
        setSelectedProjectName("");
        setBankName("");
        setBranchName("");
        setAoName("");
        setRboName("");
        setCaseDetails("");
        setBankSubType("AO related");
        setSelectedBankId("");
        setBranchesList([]);
        setOfficerName("");
        setOfficerPhone("");
        setBankCategory("Operations");
        setBankCategoryOther("");
        setCustomCallFields([]);
        setAssigneeId("");
        setDeadlineDate("");
        setDeadlineTime("");
        setEntryDate("");
        setEntryTime("09:00");
        setEntryStatus("Pending");
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
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    // Guard: cannot complete without progressNotes and proofAttachment
    if (newStatus === "Completed") {
      let proofUrls: string[] = [];
      if (task.proofAttachment) {
        if (task.proofAttachment.startsWith('[') && task.proofAttachment.endsWith(']')) {
          try {
            proofUrls = JSON.parse(task.proofAttachment);
          } catch (_) {
            proofUrls = [task.proofAttachment];
          }
        } else {
          proofUrls = task.proofAttachment.split(',').map((u: string) => u.trim()).filter(Boolean);
        }
      }
      const hasProof = proofUrls.length > 0;

      if (!task.progressNotes?.trim() || !hasProof) {
        alert("To complete this task, you must provide Progress Notes AND upload Proof of Work (Screenshot/Photo). Please open the task to do this.");
        openTask(task);
        return;
      }
    }

    setUpdatingId(taskId);

    // Calculate current live elapsed BEFORE status changes to Completed
    let finalElapsed = getLiveElapsed(task);
    const nowISO = new Date().toISOString();

    // If finalElapsed is 0 or uncounted, compute from creation/start date as a fallback
    if (newStatus === "Completed" && finalElapsed <= 0) {
      const createMs = new Date(task.createdAt || task.date).getTime();
      if (!isNaN(createMs) && createMs > 0) {
        finalElapsed = Math.max(1, Math.floor((Date.now() - createMs) / 1000));
      }
    }

    const payloadFields: any = {
      taskId,
      status: newStatus
    };

    if (newStatus === "In Progress") {
      payloadFields.timerState = "Running";
      payloadFields.timerStart = nowISO;
    } else if (newStatus === "Completed") {
      payloadFields.elapsedSeconds = finalElapsed;
      payloadFields.completedAt = nowISO;
      payloadFields.timerState = "Stopped";
      payloadFields.timerStart = null;
    } else if (newStatus === "Pending") {
      payloadFields.timerState = "Stopped";
      payloadFields.timerStart = null;
    }

    // Optimistic UI update
    setTasks(prev => prev.map(t => t.id === taskId ? {
      ...t,
      status: newStatus as Task["status"],
      ...(newStatus === "In Progress" ? {
        timerState: "Running",
        timerStart: nowISO
      } : newStatus === "Completed" ? {
        elapsedSeconds: finalElapsed,
        completedAt: nowISO,
        timerState: "Stopped",
        timerStart: null
      } : {
        timerState: "Stopped",
        timerStart: null
      })
    } : t));

    if (selectedTask?.id === taskId) {
      setSelectedTask(prev => prev ? {
        ...prev,
        status: newStatus as Task["status"],
        ...(newStatus === "In Progress" ? {
          timerState: "Running",
          timerStart: nowISO
        } : newStatus === "Completed" ? {
          elapsedSeconds: finalElapsed,
          completedAt: nowISO,
          timerState: "Stopped",
          timerStart: null
        } : {
          timerState: "Stopped",
          timerStart: null
        })
      } : null);
    }

    try {
      const res = await fetch("/api/tasks", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payloadFields),
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
  const [, setTimerTick] = useState<number>(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimerTick(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTimer = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const getLiveElapsed = (task: Task): number => {
    if (!task) return 0;

    const baseSeconds = Number(task.elapsedSeconds) || 0;

    if (task.status === "Completed") {
      return Math.max(0, baseSeconds);
    }

    const nowMs = Date.now();
    const refTimeStr = task.updatedAt || task.createdAt || task.date;
    const refMs = refTimeStr ? new Date(refTimeStr).getTime() : nowMs;
    
    let liveDiff = 0;
    if (!isNaN(refMs) && refMs > 0 && refMs <= nowMs) {
      const diff = Math.floor((nowMs - refMs) / 1000);
      if (diff <= 86400) {
        liveDiff = Math.max(0, diff);
      }
    }
    return baseSeconds + liveDiff;
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

    setUploadingProof(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("purpose", "task-proof");

      const uploadRes = await fetch("/api/documents/upload", {
        method: "POST",
        body: formData,
      });
      const uploadData = await uploadRes.json();

      if (!uploadData.success) {
        alert(uploadData.error || "Failed to upload file to FTP.");
        setUploadingProof(false);
        return;
      }

      const fileUrl = uploadData.url;

      // Parse existing proofs
      let currentProofs: string[] = [];
      if (selectedTask.proofAttachment) {
        if (selectedTask.proofAttachment.startsWith('[') && selectedTask.proofAttachment.endsWith(']')) {
          try {
            currentProofs = JSON.parse(selectedTask.proofAttachment);
          } catch (_) {
            currentProofs = [selectedTask.proofAttachment];
          }
        } else {
          currentProofs = selectedTask.proofAttachment.split(',').map((u: string) => u.trim()).filter(Boolean);
        }
      }

      const updatedProofs = [...currentProofs, fileUrl];
      const payloadStr = JSON.stringify(updatedProofs);

      const res = await fetch("/api/tasks", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId: selectedTask.id, proofAttachment: payloadStr }),
      });
      const data = await res.json();
      if (data.success) {
        setTasks(prev => prev.map(t => t.id === selectedTask.id ? { ...t, proofAttachment: payloadStr } : t));
        setSelectedTask(prev => prev ? { ...prev, proofAttachment: payloadStr } : null);
        alert("Proof uploaded successfully via FTP!");
      } else {
        alert(data.error || "Failed to link proof to task.");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to upload proof.");
    } finally {
      setUploadingProof(false);
      e.target.value = "";
    }
  };

  const handleRemoveProofAt = async (indexToRemove: number) => {
    if (!selectedTask) return;
    if (!confirm("Are you sure you want to remove this proof item?")) return;
    try {
      // Parse existing proofs
      let currentProofs: string[] = [];
      if (selectedTask.proofAttachment) {
        if (selectedTask.proofAttachment.startsWith('[') && selectedTask.proofAttachment.endsWith(']')) {
          try {
            currentProofs = JSON.parse(selectedTask.proofAttachment);
          } catch (_) {
            currentProofs = [selectedTask.proofAttachment];
          }
        } else {
          currentProofs = selectedTask.proofAttachment.split(',').map((u: string) => u.trim()).filter(Boolean);
        }
      }

      const updatedProofs = currentProofs.filter((_, idx) => idx !== indexToRemove);
      const payloadStr = updatedProofs.length > 0 ? JSON.stringify(updatedProofs) : "";

      const res = await fetch("/api/tasks", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId: selectedTask.id, proofAttachment: payloadStr }),
      });
      const data = await res.json();
      if (data.success) {
        setTasks(prev => prev.map(t => t.id === selectedTask.id ? { ...t, proofAttachment: payloadStr } : t));
        setSelectedTask(prev => prev ? { ...prev, proofAttachment: payloadStr } : null);
      } else {
        alert(data.error || "Failed to remove proof.");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to remove proof.");
    }
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

  const handleDeleteTask = async (taskId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!confirm("Are you sure you want to delete this task?")) return;
    try {
      const res = await fetch(`/api/tasks?taskId=${encodeURIComponent(taskId)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        setTasks(prev => prev.filter(t => String(t.id) !== String(taskId) && String(t.scheduleId || "") !== String(taskId)));
        if (selectedTask?.id === taskId) {
          setSelectedTask(null);
        }
      } else {
        alert(data.error || "Failed to delete task");
      }
    } catch (err: any) {
      console.error("Failed to delete task:", err);
      alert("Failed to delete task: " + (err.message || err));
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
        body: JSON.stringify({ taskId: selectedTask.id, scheduledAt, followUpHistory: serializedHistory, timerState: "Stopped", timerStart: null }),
      });
      const data = await res.json();
      if (data.success) {
        setTasks(prev => prev.map(t => t.id === selectedTask.id ? { ...t, scheduledAt, followUpHistory: serializedHistory, timerState: "Stopped", timerStart: null } : t));
        setSelectedTask(prev => prev ? { ...prev, scheduledAt, followUpHistory: serializedHistory, timerState: "Stopped", timerStart: null } : null);
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
        body: JSON.stringify({
          taskId: selectedTask.id,
          forwardedTo: selectedForwardTo || null,
          timerState: "Stopped",
          timerStart: null
        }),
      });
      const data = await res.json();
      if (data.success) {
        setTasks(prev => prev.map(t => t.id === selectedTask.id ? { ...t, forwardedTo: selectedForwardTo || null, timerState: "Stopped", timerStart: null } : t));
        setSelectedTask(prev => prev ? { ...prev, forwardedTo: selectedForwardTo || null, timerState: "Stopped", timerStart: null } : null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSavingForward(false);
    }
  };

  const handleForwardTaskDate = async (targetDateStr: string) => {
    if (!selectedTask || !targetDateStr) return;
    setForwardingDate(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId: selectedTask.id,
          targetDate: targetDateStr,
          timerState: "Stopped",
          timerStart: null
        }),
      });
      const data = await res.json();
      if (data.success) {
        const formattedDate = new Date(targetDateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
        alert(`This task is forwarded to ${formattedDate}!`);
        setTasks(prev => prev.map(t => t.id === selectedTask.id ? { ...t, scheduledAt: targetDateStr, timerState: "Stopped", timerStart: null } : t));
        setSelectedTask(prev => prev ? { ...prev, scheduledAt: targetDateStr, timerState: "Stopped", timerStart: null } : null);
        setForwardDateInput("");
      } else {
        alert(data.error || "Failed to forward task date.");
      }
    } catch (err) {
      console.error("Failed to forward task date:", err);
      alert("Error forwarding task date.");
    } finally {
      setForwardingDate(false);
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

  const [filterUser, setFilterUser] = useState(initialUserFilter || "All");
  const [filterDate, setFilterDate] = useState(initialDateFilter || "");
  const [searchQuery, setSearchQuery] = useState(initialSearchFilter || "");

  useEffect(() => {
    if (initialUserFilter !== undefined) {
      setFilterUser(initialUserFilter || "All");
    }
  }, [initialUserFilter]);

  useEffect(() => {
    setFilterDate(initialDateFilter || "");
  }, [initialDateFilter]);

  useEffect(() => {
    setSearchQuery(initialSearchFilter || "");
  }, [initialSearchFilter]);

  const uniqueUsers = Array.from(new Set(tasks.map(t => (t.employee as any)?.name).filter(Boolean)));

  const filteredTasks = tasks.filter(t => {
    const tEmpName = (t.employee as any)?.name?.trim().toLowerCase() || "";
    const selUser = filterUser.trim().toLowerCase();
    let matchUser = filterUser === "All" || tEmpName === selUser;

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

    let matchQuery = true;
    if (searchQuery) {
      const query = searchQuery.trim().toLowerCase();
      const title = (t.taskTitle || "").toLowerCase();
      const description = (t.description || "").toLowerCase();
      const taskId = String(t.id || "").toLowerCase();
      const status = String(t.status || "").toLowerCase();
      matchQuery = title.includes(query) || description.includes(query) || taskId.includes(query) || status.includes(query) || query.includes(title);
    }

    return matchUser && matchDate && matchQuery;
  });

  const parseTaskDescription = (rawDesc: string = "", task: Task) => {
    let bankName = (task as any).bankName || "";
    let branchName = (task as any).branchName || "";
    let staffParts: string[] = [];
    let billParts: string[] = [];
    let cleanRemarksParts: string[] = [];

    if (rawDesc) {
      const segments = rawDesc.split("|").map(s => s.trim()).filter(Boolean);
      segments.forEach(seg => {
        // Filter out N/A sub-items
        const subItems = seg.split(",").map(i => i.trim()).filter(i => {
          return i && !i.match(/^[\w\s]+:\s*N\/A$/i) && !i.match(/^N\/A$/i);
        });

        if (subItems.length === 0) return;

        subItems.forEach(item => {
          if (/^Bank:\s*/i.test(item)) {
            if (!bankName) bankName = item.replace(/^Bank:\s*/i, "").trim();
          } else if (/^Branch:\s*/i.test(item)) {
            if (!branchName) branchName = item.replace(/^Branch:\s*/i, "").trim();
          } else if (/^(Brought By|Printed By|Dispatched By|Prepared By|Person):\s*/i.test(item)) {
            staffParts.push(item);
          } else if (/^(Bill No|Amount|Per Notice Rate|Officer\/Notice|Own Expenses|GP before dispatch):\s*/i.test(item)) {
            billParts.push(item);
          } else if (/^Remarks:\s*/i.test(item)) {
            const remVal = item.replace(/^Remarks:\s*/i, "").trim();
            if (remVal) cleanRemarksParts.push(remVal);
          } else {
            cleanRemarksParts.push(item);
          }
        });
      });
    }

    const fallbackDesc = rawDesc
      ? rawDesc
        .replace(/Brought By: N\/A,?\s*/gi, "")
        .replace(/Printed By: N\/A,?\s*/gi, "")
        .replace(/Dispatched By: N\/A,?\s*/gi, "")
        .replace(/Bill No: N\/A,?\s*/gi, "")
        .replace(/\|\s*\|/g, "|")
        .replace(/^\|\s*|\s*\|$/g, "")
        .trim()
      : "";

    return {
      bankName: bankName || "-",
      branchName: branchName || "-",
      staffInCharge: staffParts.length > 0 ? staffParts.join("; ") : "-",
      financials: billParts.length > 0 ? billParts.join("; ") : "-",
      cleanDescription: cleanRemarksParts.length > 0 ? cleanRemarksParts.join(" | ") : (fallbackDesc || "-")
    };
  };

  const getFormattedProgressNotes = (t: Task) => {
    const noteList: string[] = [];

    if (t.progressNotes) {
      try {
        const parsed = typeof t.progressNotes === "string" ? JSON.parse(t.progressNotes) : t.progressNotes;
        if (Array.isArray(parsed) && parsed.length > 0) {
          parsed.forEach((n: any) => {
            const author = n.userName || n.author || n.user || "System";
            const dtStr = n.createdAt
              ? new Date(n.createdAt).toLocaleString("en-IN", {
                day: "2-digit",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit"
              })
              : "";
            const text = n.note || n.text || n.message || "";
            if (text) {
              noteList.push(dtStr ? `[${author} on ${dtStr}]: ${text}` : `[${author}]: ${text}`);
            }
          });
        } else if (typeof parsed === "string" && parsed.trim()) {
          noteList.push(parsed.trim());
        } else if (typeof parsed === "object" && parsed !== null && (parsed as any).note) {
          noteList.push((parsed as any).note);
        }
      } catch (e) {
        if (typeof t.progressNotes === "string" && t.progressNotes.trim()) {
          noteList.push(t.progressNotes.trim());
        }
      }
    }

    if (t.followUpHistory) {
      try {
        const parsedFwd = typeof t.followUpHistory === "string" ? JSON.parse(t.followUpHistory) : t.followUpHistory;
        if (Array.isArray(parsedFwd) && parsedFwd.length > 0) {
          parsedFwd.forEach((f: any) => {
            const author = f.userName || f.user || f.callerName || "System";
            const dtStr = f.createdAt || f.scheduledAt
              ? new Date(f.createdAt || f.scheduledAt).toLocaleString("en-IN", {
                day: "2-digit",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit"
              })
              : "";
            const details = f.details || f.remarks || f.note || (f.scheduledAt ? `Follow-up scheduled for ${dtStr}` : "");
            if (details) {
              noteList.push(dtStr ? `[Follow-Up by ${author} on ${dtStr}]: ${details}` : `[Follow-Up by ${author}]: ${details}`);
            }
          });
        } else if (typeof t.followUpHistory === "string" && t.followUpHistory.trim()) {
          noteList.push(t.followUpHistory.trim());
        }
      } catch (e) {
        if (typeof t.followUpHistory === "string" && t.followUpHistory.trim()) {
          noteList.push(t.followUpHistory.trim());
        }
      }
    }

    return noteList.length > 0 ? noteList.join("\n") : "-";
  };

  const handleExportTasks = () => {
    const headers = [
      "Task ID",
      "Task Title",
      "Type / Category",
      "Bank Name",
      "Branch Name",
      "Staff In-Charge",
      "Financial Details",
      "Description / Remarks",
      "Status",
      "Created By",
      "Forwarded To",
      "Scheduled Date & Time",
      "Created Date",
      "Progress Notes"
    ];

    const rows = filteredTasks.map(t => {
      const notesText = getFormattedProgressNotes(t);

      const createdBy = (t.employee as any)?.name || (t.assignedByUser as any)?.name || "System User";

      let forwardedTo = "-";
      if ((t.forwardedUser as any)?.name) {
        forwardedTo = (t.forwardedUser as any).name;
      } else if (t.forwardedTo) {
        const matched = companyUsers.find((u: any) =>
          String(u.id) === String(t.forwardedTo) ||
          String(u.email || "").toLowerCase() === String(t.forwardedTo).toLowerCase() ||
          String(u.name || "").toLowerCase() === String(t.forwardedTo).toLowerCase()
        );
        if (matched) {
          forwardedTo = matched.name;
        } else {
          const rawFwd = String(t.forwardedTo).trim();
          if (rawFwd && rawFwd !== "null" && rawFwd !== "undefined") {
            forwardedTo = rawFwd;
          }
        }
      }

      const parsedDesc = parseTaskDescription(t.description || "", t);

      let scheduledStr = "-";
      if (t.scheduledAt) {
        try {
          scheduledStr = new Date(t.scheduledAt).toLocaleString("en-IN", {
            day: "2-digit", month: "short", year: "numeric",
            hour: "2-digit", minute: "2-digit"
          });
        } catch (e) {
          scheduledStr = String(t.scheduledAt);
        }
      }

      return {
        "Task ID": t.id || "-",
        "Task Title": t.taskTitle || "-",
        "Type / Category": t.taskType || "General",
        "Bank Name": parsedDesc.bankName,
        "Branch Name": parsedDesc.branchName,
        "Staff In-Charge": parsedDesc.staffInCharge,
        "Financial Details": parsedDesc.financials,
        "Description / Remarks": parsedDesc.cleanDescription,
        "Status": t.status || "Pending",
        "Created By": createdBy,
        "Forwarded To": forwardedTo,
        "Scheduled Date & Time": scheduledStr,
        "Created Date": t.createdAt ? new Date(t.createdAt).toLocaleDateString("en-IN") : (t.date || "-"),
        "Progress Notes": notesText
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(rows, { header: headers });

    // Set auto column widths
    const max_widths = headers.map(h => {
      let max_len = h.length;
      rows.forEach(r => {
        const val = String((r as any)[h] || "");
        const lines = val.split("\n");
        lines.forEach(l => {
          if (l.length > max_len) max_len = l.length;
        });
      });
      return { wch: Math.min(Math.max(max_len + 2, 12), 65) };
    });
    worksheet["!cols"] = max_widths;

    // Create Summary Sheet
    const summaryRows = [
      { Metric: "Total Exported Tasks", Value: filteredTasks.length },
      { Metric: "Pending Tasks", Value: filteredTasks.filter(t => t.status === "Pending").length },
      { Metric: "In Progress Tasks", Value: filteredTasks.filter(t => t.status === "In Progress").length },
      { Metric: "Completed Tasks", Value: filteredTasks.filter(t => t.status === "Completed").length },
      { Metric: "Export Date", Value: new Date().toLocaleString("en-IN") },
      { Metric: "Exported By Filter", Value: filterUser === "All" ? "All Users" : filterUser }
    ];
    const summaryWorksheet = XLSX.utils.json_to_sheet(summaryRows);
    summaryWorksheet["!cols"] = [{ wch: 25 }, { wch: 30 }];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Task Details");
    XLSX.utils.book_append_sheet(workbook, summaryWorksheet, "Report Summary");

    const fileName = `Task_Report_${filterUser === "All" ? "All_Users" : filterUser.replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}.xlsx`;
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

    let deadlineBadge = null;
    if (task.deadlineAt && !task.scheduledAt) {
      const deadline = new Date(task.deadlineAt);
      const now = new Date();
      const diffMs = deadline.getTime() - now.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);

      if (task.status === "Completed") {
        let overdueText = "";
        if (task.deadlineAt && task.updatedAt) {
          const deadline = new Date(task.deadlineAt);
          const completedAt = new Date(task.updatedAt);
          const diffMs = completedAt.getTime() - deadline.getTime();
          if (diffMs > 0) {
            const overdueHrs = Math.floor(diffMs / (1000 * 60 * 60));
            const overdueMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
            overdueText = `⚠️ Overdue by ${overdueHrs}h ${overdueMins}m when completed`;
          }
        }
        deadlineBadge = {
          text: `Deadline: ${new Date(task.deadlineAt).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}`,
          className: "bg-slate-50 text-slate-400 border-slate-200",
          overdueText
        };
      } else if (diffHours < 0) {
        const overdueMs = Math.abs(diffMs);
        const overdueHrs = Math.floor(overdueMs / (1000 * 60 * 60));
        const overdueMins = Math.floor((overdueMs % (1000 * 60 * 60)) / (1000 * 60));
        const overdueSecs = Math.floor((overdueMs % (1000 * 60)) / 1000);
        deadlineBadge = {
          text: `⚠️ Overdue by ${overdueHrs}h ${overdueMins}m ${overdueSecs}s`,
          className: "bg-rose-50 text-rose-700 border-rose-200 font-extrabold animate-pulse"
        };
      } else {
        const remainingHours = Math.floor(diffHours);
        if (remainingHours === 0) {
          const remainingMinutes = Math.floor(diffMs / (1000 * 60));
          deadlineBadge = {
            text: `⏰ Due in ${remainingMinutes}m`,
            className: "bg-amber-50 text-amber-700 border-amber-200 font-extrabold animate-pulse"
          };
        } else {
          deadlineBadge = {
            text: `⏰ Remaining: ${remainingHours}h`,
            className: "bg-indigo-50 text-indigo-700 border-indigo-200 font-extrabold"
          };
        }
      }
    }

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
        <div className="text-[9px] font-bold text-slate-400 mb-2 uppercase tracking-wide flex flex-col gap-0.5">
          <div>
            Employee: <span className="text-slate-600 font-extrabold">{creatorName}</span>
          </div>
          {(task as any).assignedByUser && (
            <div className="text-rose-500 font-extrabold">
              Assigned by: <span>{(task as any).assignedByUser.name}</span>
            </div>
          )}
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



        {/* Forwarded badge */}
        {task.forwardedTo && (
          <div className="mt-1.5 flex items-center gap-1 text-[9px] text-teal-600 font-bold bg-teal-50 rounded-lg px-2 py-1 border border-teal-200">
            <Send className="w-3 h-3" />
            <span>Forwarded to: {task.forwardedUser?.name || "Team Member"}</span>
          </div>
        )}

        {/* Deadline Badge */}
        {deadlineBadge && (
          <div>
            <div className={`mt-1.5 flex items-center gap-1 text-[9px] font-bold rounded-lg px-2 py-1 border ${deadlineBadge.className}`}>
              <span>{deadlineBadge.text}</span>
            </div>
            {(deadlineBadge as any).overdueText && (
              <div className="mt-1 text-[9px] font-extrabold text-rose-600 bg-rose-50 border border-rose-100 rounded-lg px-2 py-0.5 inline-block">
                {(deadlineBadge as any).overdueText}
              </div>
            )}
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

            {/* Timer Badge (Always Visible on every task card) */}
            <span className={cn(
              "flex items-center gap-1 text-[10px] font-mono font-black px-2 py-1 rounded-lg border transition-all shadow-2xs",
              task.status === "Completed"
                ? "bg-slate-100 text-slate-500 border-slate-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700"
                : task.status === "In Progress"
                  ? "bg-emerald-100 text-emerald-800 border-emerald-400 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-700"
                  : "bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-700"
            )}>
              {task.status !== "Completed" ? (
                <span className={`w-1.5 h-1.5 rounded-full animate-pulse inline-block ${task.status === "In Progress" ? "bg-emerald-600" : "bg-indigo-600"}`} />
              ) : (
                <Timer className="w-3 h-3 text-slate-400" />
              )}
              {formatTimer(getLiveElapsed(task))}
            </span>
          </div>

          {/* Card Action Button: Click to open */}
          <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
            <span className="hidden lg:block text-[9px] text-slate-300 font-bold uppercase tracking-wider ml-1">click to open</span>
          </div>
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
          <div className="relative flex items-center">
            <input
              type="text"
              placeholder="Search tasks..."
              className="bg-white border border-slate-200 text-slate-700 text-[10px] font-bold rounded-lg pl-8 pr-7 py-2 focus:outline-none focus:border-[#714B67] shadow-sm w-44"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none" />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="text-slate-400 hover:text-slate-600 absolute right-2.5 focus:outline-none text-[11px]"
                title="Clear Search"
              >
                ✕
              </button>
            )}
          </div>

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
            onClick={() => setShowDailyBackdate(true)}
            className="flex items-center gap-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-[10px] font-black uppercase tracking-wider rounded-lg px-3 py-2 transition-all shadow-sm"
          >
            <CalendarClock className="w-3.5 h-3.5" /> Daily Back-Date
          </button>
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

      <DailyBackdateEntryModal open={showDailyBackdate} onClose={() => setShowDailyBackdate(false)} onSaved={fetchTasks} currentUser={sessionUser} />

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
                        {/* Task Title Master Category Dropdown */}
                        <div>
                          <label className="block text-[9px] uppercase tracking-wider text-[#714B67] font-black mb-1">
                            Task Title *
                          </label>
                          <select
                            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold focus:outline-none focus:border-[#714B67] text-slate-800 bg-white"
                            value={selectedTaskCategory}
                            onChange={e => {
                              const val = e.target.value;
                              if (val === "ADD_NEW") {
                                setShowAddCategoryInput(true);
                              } else {
                                setShowAddCategoryInput(false);
                                setSelectedTaskCategory(val);
                                setTitle(val);
                                if (val === "Bank" || val === "Notice" || val.trim().toLowerCase() === "bill follow up") {
                                  setType("Call");
                                  setCallCategory("Bank");
                                } else if (val === "Interview") {
                                  setType("Call");
                                  setCallCategory("Interview");
                                } else {
                                  setType("Call");
                                  setCallCategory("Others");
                                }
                              }
                            }}
                            required
                          >
                            <option value="">-- Select Task Title --</option>
                            {sortCategoriesList(bankCategories).map(cat => (
                              <option key={cat} value={cat}>{cat}</option>
                            ))}
                            <option value="ADD_NEW" className="font-bold text-[#714B67] bg-purple-50">
                              ➕ Add New Master Option...
                            </option>
                          </select>

                          {/* Render Describe Category ONLY when 'Others' is selected in Task Title */}
                          {selectedTaskCategory === "Others" && (
                            <div className="mt-2 animate-fade-in">
                              <label className="block text-[9px] uppercase tracking-wider text-[#714B67] font-black mb-1">
                                Describe Category *
                              </label>
                              <input
                                type="text"
                                required
                                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold focus:outline-none focus:border-[#714B67] placeholder-slate-400 text-slate-800 bg-white"
                                placeholder="Describe the category details..."
                                value={otherCategoryDesc}
                                onChange={e => setOtherCategoryDesc(e.target.value)}
                              />
                            </div>
                          )}

                          {/* Inline Add New Category input */}
                          {showAddCategoryInput && (
                            <div className="mt-2 p-2.5 bg-purple-50 border border-purple-200 rounded-lg space-y-2 animate-fade-in">
                              <label className="block text-[9px] uppercase tracking-wider text-purple-700 font-black">
                                Add New Category / Title (Stored in DB) *
                              </label>
                              <div className="flex gap-1.5">
                                <input
                                  type="text"
                                  placeholder="e.g. Legal, General, IT, Bank..."
                                  value={newCategoryText}
                                  onChange={e => setNewCategoryText(e.target.value)}
                                  className="flex-1 border border-purple-300 rounded-md px-2.5 py-1.5 text-xs font-bold focus:outline-none text-slate-800 bg-white"
                                  autoFocus
                                />
                                <button
                                  type="button"
                                  onClick={handleAddCategory}
                                  className="bg-[#714B67] text-white px-3 py-1.5 rounded-md text-xs font-black uppercase tracking-wider hover:bg-[#5F3F56]"
                                >
                                  Save to DB
                                </button>
                                <button
                                  type="button"
                                  onClick={() => { setShowAddCategoryInput(false); setNewCategoryText(""); }}
                                  className="bg-slate-200 text-slate-600 px-2 py-1.5 rounded-md text-xs font-bold"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Dynamic Task Mode Selector (Call, Meeting, Email, WhatsApp, SMS, Field Visit, Social Media, etc.) */}
                        <div>
                          <label className="block text-[9px] uppercase tracking-wider text-slate-500 font-black mb-1">
                            Task Mode *
                          </label>
                          <select
                            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold focus:outline-none focus:border-[#714B67] text-slate-700 bg-white"
                            value={type}
                            onChange={e => {
                              const val = e.target.value;
                              if (val === "ADD_NEW_MODE") {
                                setShowAddModeInput(true);
                              } else {
                                setShowAddModeInput(false);
                                setType(val);
                                if (["AO related", "RBO related", "branch related", "case related"].includes(val)) {
                                  setBankSubType(val);
                                }
                              }
                            }}
                            required
                          >
                            {selectedTaskCategory === "Bank" && (
                              <optgroup label="Bank Modes / Sub-Types">
                                <option value="AO related">AO related</option>
                                <option value="RBO related">RBO related</option>
                                <option value="branch related">branch related</option>
                                <option value="case related">case related</option>
                              </optgroup>
                            )}
                            <optgroup label={selectedTaskCategory === "Bank" ? "Other Task Modes" : "Task Modes"}>
                              {taskModes.map(modeObj => (
                                <option key={modeObj.id} value={modeObj.name}>{modeObj.name}</option>
                              ))}
                            </optgroup>
                            <option value="ADD_NEW_MODE" className="font-bold text-[#714B67] bg-purple-50">
                              ➕ Add New Task Mode...
                            </option>
                          </select>

                          {/* Inline Add New Mode input */}
                          {showAddModeInput && (
                            <div className="mt-2 p-2.5 bg-purple-50 border border-purple-200 rounded-lg space-y-2 animate-fade-in">
                              <label className="block text-[9px] uppercase tracking-wider text-purple-700 font-black">
                                Add New Task Mode (Stored in DB) *
                              </label>
                              <div className="flex gap-1.5">
                                <input
                                  type="text"
                                  placeholder="e.g. Video Call, Postal Letter..."
                                  value={newModeText}
                                  onChange={e => setNewModeText(e.target.value)}
                                  className="flex-1 border border-purple-300 rounded-md px-2.5 py-1.5 text-xs font-bold focus:outline-none text-slate-800 bg-white"
                                  autoFocus
                                />
                                <button
                                  type="button"
                                  onClick={handleAddMode}
                                  className="bg-[#714B67] text-white px-3 py-1.5 rounded-md text-xs font-black uppercase tracking-wider hover:bg-[#5F3F56]"
                                >
                                  Save to DB
                                </button>
                                <button
                                  type="button"
                                  onClick={() => { setShowAddModeInput(false); setNewModeText(""); }}
                                  className="bg-slate-200 text-slate-600 px-2 py-1.5 rounded-md text-xs font-bold"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Standard Call Direction Panel (for non-Sales task titles when Task Mode is Call) */}
                          {selectedTaskCategory !== "Sales" && type === "Call" && (
                            <div className="mt-2 p-2.5 bg-purple-50/70 border border-purple-200 rounded-xl space-y-1 animate-fade-in">
                              <label className="block text-[9px] font-black uppercase tracking-wider text-purple-800">
                                Call Direction / Mode *
                              </label>
                              <select
                                value={callDirection}
                                onChange={e => setCallDirection(e.target.value)}
                                className="w-full border border-purple-300 rounded-lg px-2.5 py-2 text-xs font-extrabold text-purple-900 bg-white focus:outline-none focus:border-purple-600"
                              >
                                <option value="Incoming Call">Incoming Call 📥</option>
                                <option value="Outgoing Call">Outgoing Call 📤</option>
                              </select>
                            </div>
                          )}

                          {/* Sales Details Panel (ONLY when Task Category is Sales) */}
                          {selectedTaskCategory === "Sales" && (
                            <div className="mt-2 p-3 bg-purple-50/80 border border-purple-200 rounded-xl space-y-2.5 animate-fade-in text-slate-800">
                              {type === "Call" && (
                                <div>
                                  <label className="block text-[9px] font-black uppercase tracking-wider text-purple-800 mb-1">
                                    Call Direction / Mode *
                                  </label>
                                  <select
                                    value={callDirection}
                                    onChange={e => setCallDirection(e.target.value)}
                                    className="w-full border border-purple-300 rounded-lg px-2.5 py-2 text-xs font-extrabold text-purple-900 bg-white focus:outline-none focus:border-purple-600"
                                  >
                                    <option value="Incoming Call">Incoming Call</option>
                                    <option value="Outgoing Call">Outgoing Call</option>
                                  </select>
                                </div>
                              )}

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                <div>
                                  <label className="block text-[9px] font-black uppercase tracking-wider text-purple-800 mb-1">
                                    Person Name
                                  </label>
                                  <input
                                    type="text"
                                    placeholder="e.g. Rahul Sharma"
                                    value={personName}
                                    onChange={e => setPersonName(e.target.value)}
                                    className="w-full border border-purple-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 bg-white focus:outline-none focus:border-purple-500"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[9px] font-black uppercase tracking-wider text-purple-800 mb-1">
                                    Contact No
                                  </label>
                                  <input
                                    type="text"
                                    placeholder="e.g. +91 9876543210"
                                    value={contactNo}
                                    onChange={e => setContactNo(e.target.value)}
                                    className="w-full border border-purple-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 bg-white focus:outline-none focus:border-purple-500"
                                  />
                                </div>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                <div>
                                  <label className="block text-[9px] font-black uppercase tracking-wider text-purple-800 mb-1">
                                    Company Name
                                  </label>
                                  <input
                                    type="text"
                                    placeholder="e.g. ABC Technologies"
                                    value={companyName}
                                    onChange={e => setCompanyName(e.target.value)}
                                    className="w-full border border-purple-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 bg-white focus:outline-none focus:border-purple-500"
                                  />
                                </div>
                                {type === "Email" && (
                                  <div>
                                    <label className="block text-[9px] font-black uppercase tracking-wider text-purple-800 mb-1">
                                      Email Address *
                                    </label>
                                    <input
                                      type="email"
                                      placeholder="e.g. client@example.com"
                                      value={emailAddress}
                                      onChange={e => setEmailAddress(e.target.value)}
                                      className="w-full border border-purple-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 bg-white focus:outline-none focus:border-purple-500"
                                    />
                                  </div>
                                )}
                                {(type === "Field Visit" || type === "Visit") && (
                                  <div>
                                    <label className="block text-[9px] font-black uppercase tracking-wider text-purple-800 mb-1">
                                      Visit Location / Address *
                                    </label>
                                    <input
                                      type="text"
                                      placeholder="e.g. Malviya Nagar, Jaipur / Office Premises"
                                      value={visitLocation}
                                      onChange={e => setVisitLocation(e.target.value)}
                                      className="w-full border border-purple-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 bg-white focus:outline-none focus:border-purple-500"
                                    />
                                  </div>
                                )}
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                <div>
                                  <label className="block text-[9px] font-black uppercase tracking-wider text-purple-800 mb-1">
                                    Reason / Purpose
                                  </label>
                                  <select
                                    value={salesReason}
                                    onChange={e => setSalesReason(e.target.value)}
                                    className="w-full border border-purple-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 bg-white focus:outline-none focus:border-purple-500"
                                  >
                                    <option value="">-- Select Reason --</option>
                                    <option value="Pitching">Pitching</option>
                                    <option value="Follow Up">Follow Up</option>
                                    <option value="Client Meeting">Client Meeting</option>
                                    <option value="Proposal Shared">Proposal Shared</option>
                                    <option value="Other">Other</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-[9px] font-black uppercase tracking-wider text-purple-800 mb-1">
                                    Status
                                  </label>
                                  <select
                                    value={callStatus}
                                    onChange={e => setCallStatus(e.target.value)}
                                    className="w-full border border-purple-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 bg-white focus:outline-none focus:border-purple-500"
                                  >
                                    <option value="">-- Select Status --</option>
                                    <option value="Interested">Interested</option>
                                    <option value="Not Interested">Not Interested</option>
                                    <option value="Call Not Received">Call Not Received</option>
                                    <option value="Busy">Busy</option>
                                  </select>
                                </div>
                              </div>

                              {salesReason === "Other" && (
                                <div>
                                  <label className="block text-[9px] font-black uppercase tracking-wider text-purple-800 mb-1">
                                    Specify Other Reason *
                                  </label>
                                  <input
                                    type="text"
                                    placeholder="Please enter custom sales reason..."
                                    value={otherSalesReason}
                                    onChange={e => setOtherSalesReason(e.target.value)}
                                    className="w-full border border-purple-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 bg-white focus:outline-none focus:border-purple-500"
                                  />
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Dynamic Project Name Selector (when Task Title is IT or Task Mode is Development) */}
                        {(selectedTaskCategory === "IT" || type === "Development") && (
                          <div className="space-y-2 bg-indigo-50/60 border border-indigo-200 rounded-xl p-3 animate-fade-in text-slate-800">
                            <div>
                              <label className="block text-[9px] uppercase tracking-wider text-indigo-700 font-black mb-1">
                                Project Name *
                              </label>
                              <select
                                required
                                className="w-full border border-indigo-200 rounded-lg px-3 py-2 text-xs font-bold focus:outline-none focus:border-indigo-500 text-slate-800 bg-white"
                                value={selectedProjectName}
                                onChange={e => {
                                  const val = e.target.value;
                                  if (val === "ADD_NEW_PROJECT") {
                                    setShowAddProjectInput(true);
                                  } else {
                                    setShowAddProjectInput(false);
                                    setSelectedProjectName(val);
                                  }
                                }}
                              >
                                <option value="">-- Select Project Name --</option>
                                {projectList.map(proj => (
                                  <option key={proj.id} value={proj.name}>{proj.name}</option>
                                ))}
                                <option value="ADD_NEW_PROJECT" className="font-bold text-indigo-700 bg-indigo-50">
                                  ➕ Add New Project...
                                </option>
                              </select>

                              {/* Inline Add New Project input */}
                              {showAddProjectInput && (
                                <div className="mt-2 p-2.5 bg-indigo-100/70 border border-indigo-300 rounded-lg space-y-2 animate-fade-in">
                                  <label className="block text-[9px] uppercase tracking-wider text-indigo-800 font-black">
                                    Add New Project (Stored in DB) *
                                  </label>
                                  <div className="flex gap-1.5">
                                    <input
                                      type="text"
                                      placeholder="e.g. HRMS, RRR, ERP..."
                                      value={newProjectText}
                                      onChange={e => setNewProjectText(e.target.value)}
                                      className="flex-1 border border-indigo-300 rounded-md px-2.5 py-1.5 text-xs font-bold focus:outline-none text-slate-800 bg-white"
                                      autoFocus
                                    />
                                    <button
                                      type="button"
                                      onClick={handleAddProject}
                                      className="bg-indigo-700 text-white px-3 py-1.5 rounded-md text-xs font-black uppercase tracking-wider hover:bg-indigo-800"
                                    >
                                      Save to DB
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => { setShowAddProjectInput(false); setNewProjectText(""); }}
                                      className="bg-slate-200 text-slate-600 px-2 py-1.5 rounded-md text-xs font-bold"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* ── Sub-Fields (For Bank, Notice or Interview) ── */}
                        {(selectedTaskCategory === "Bank" || selectedTaskCategory === "Notice" || selectedTaskCategory === "Interview" || isBillFollowUp) && (
                          <div className="space-y-2 bg-emerald-50 border border-emerald-200 rounded-xl p-3 animate-fade-in text-[#1C1C1A] relative z-30">

                            {/* Bank & Notice — Bank & Branch selection */}
                            {(selectedTaskCategory === "Bank" || selectedTaskCategory === "Notice" || callCategory === "Bank" || isBillFollowUp) && (
                              <div className="space-y-3 animate-fade-in relative z-40">

                                {/* Case 1: When Task Mode is a Bank Sub-Type (AO related, RBO related, branch related, case related) */}
                                {selectedTaskCategory === "Bank" && ["AO related", "RBO related", "branch related", "case related"].includes(type) ? (
                                  <>
                                    <div>
                                      <label className="block text-[9px] font-black uppercase tracking-wider text-emerald-800 mb-1">Select Bank Sub-Type *</label>
                                      <select
                                        value={bankSubType}
                                        onChange={e => {
                                          const val = e.target.value;
                                          setBankSubType(val);
                                          setType(val);
                                        }}
                                        className="w-full border border-emerald-300 rounded-lg px-2.5 py-2 text-xs font-extrabold text-emerald-900 bg-white focus:outline-none focus:border-emerald-600"
                                      >
                                        <option value="AO related">AO related</option>
                                        <option value="RBO related">RBO related</option>
                                        <option value="branch related">branch related</option>
                                        <option value="case related">case related</option>
                                      </select>
                                    </div>

                                    {(() => {
                                      const selectedBankObj = banksList.find(b => String(b.id) === selectedBankId || b.bankName?.toLowerCase().trim() === bankName?.toLowerCase().trim());
                                      const bankBranches = selectedBankObj
                                        ? branchesList.filter((br: any) => String(br.bankId) === String(selectedBankObj.id))
                                        : branchesList;

                                      const currentSelectedBranchObj = bankBranches.find((b: any) =>
                                        String(b.id) === String(branchName) || b.branchName === branchName
                                      );

                                      let aoOptions: string[] = [];
                                      let rboOptions: string[] = [];

                                      if (currentSelectedBranchObj) {
                                        const brAo = (currentSelectedBranchObj as any).aoName || (currentSelectedBranchObj as any).ao;
                                        const brRbo = (currentSelectedBranchObj as any).rbo || (currentSelectedBranchObj as any).rboName;
                                        aoOptions = brAo ? [brAo] : Array.from(new Set(bankBranches.map((br: any) => br.aoName || br.ao).filter(Boolean)));
                                        rboOptions = brRbo ? [brRbo] : Array.from(new Set(bankBranches.map((br: any) => br.rbo || br.rboName).filter(Boolean)));
                                      } else if (selectedBankObj) {
                                        aoOptions = Array.from(new Set(bankBranches.map((br: any) => br.aoName || br.ao).filter(Boolean)));
                                        rboOptions = Array.from(new Set(bankBranches.map((br: any) => br.rbo || br.rboName).filter(Boolean)));
                                      } else {
                                        aoOptions = Array.from(new Set(branchesList.map((br: any) => (br as any).aoName || (br as any).ao).filter(Boolean)));
                                        rboOptions = Array.from(new Set(branchesList.map((br: any) => (br as any).rbo || (br as any).rboName).filter(Boolean)));
                                      }

                                      return (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 relative z-20">
                                          {/* Bank Input - Searchable */}
                                          <SearchableCombobox
                                            label="Select Bank *"
                                            value={bankName}
                                            placeholder="Type to search bank..."
                                            options={banksList.map(b => b.bankName)}
                                            required
                                            onChange={(val) => {
                                              setBankName(val);
                                              const bObj = banksList.find(b => b.bankName.toLowerCase() === val.toLowerCase() || String(b.id) === val);
                                              if (bObj) {
                                                setSelectedBankId(String(bObj.id));
                                                setBranchName("");
                                                setAoName("");
                                                setRboName("");
                                                setOfficerName("");
                                                setOfficerPhone("");
                                                fetchBranches(String(bObj.id));
                                              } else {
                                                setSelectedBankId("");
                                              }
                                            }}
                                            onSelectOption={(val) => {
                                              const bObj = banksList.find(b => b.bankName.toLowerCase() === val.toLowerCase() || String(b.id) === val);
                                              if (bObj) {
                                                setSelectedBankId(String(bObj.id));
                                                setBankName(bObj.bankName);
                                                setBranchName("");
                                                setAoName("");
                                                setRboName("");
                                                setOfficerName("");
                                                setOfficerPhone("");
                                                fetchBranches(String(bObj.id));
                                              }
                                            }}
                                          />

                                          {/* Branch Input - Searchable */}
                                          {["branch related", "case related"].includes(bankSubType) && (
                                            <SearchableCombobox
                                              label="Select Branch *"
                                              value={branchName}
                                              placeholder={selectedBankId ? "Type to search branch..." : "Select a bank first"}
                                              options={bankBranches.map((br: any) => br.branchName + (br.branchCode ? ` (${br.branchCode})` : ""))}
                                              disabled={!selectedBankId}
                                              required
                                              onChange={(val) => {
                                                setBranchName(val);
                                                const cleanVal = val.split(" (")[0].trim();
                                                const brObj = bankBranches.find((b: any) => String(b.id) === val || b.branchName === cleanVal || b.branchName === val);
                                                if (brObj) {
                                                  setBranchName(brObj.branchName);
                                                  if ((brObj as any).aoName || (brObj as any).ao) setAoName((brObj as any).aoName || (brObj as any).ao || "");
                                                  if ((brObj as any).rbo || (brObj as any).rboName) setRboName((brObj as any).rbo || (brObj as any).rboName || "");
                                                  setOfficerName(brObj.branchManager || brObj.aoName || brObj.foName || "");
                                                  setOfficerPhone(brObj.branchManagerContact || brObj.foContact || "");
                                                }
                                              }}
                                              onSelectOption={(val) => {
                                                const cleanVal = val.split(" (")[0].trim();
                                                const brObj = bankBranches.find((b: any) => String(b.id) === val || b.branchName === cleanVal || b.branchName === val);
                                                if (brObj) {
                                                  setBranchName(brObj.branchName);
                                                  if ((brObj as any).aoName || (brObj as any).ao) setAoName((brObj as any).aoName || (brObj as any).ao || "");
                                                  if ((brObj as any).rbo || (brObj as any).rboName) setRboName((brObj as any).rbo || (brObj as any).rboName || "");
                                                  setOfficerName(brObj.branchManager || brObj.aoName || brObj.foName || "");
                                                  setOfficerPhone(brObj.branchManagerContact || brObj.foContact || "");
                                                }
                                              }}
                                            />
                                          )}

                                          {/* AO Input */}
                                          {["AO related", "branch related", "case related"].includes(bankSubType) && (
                                            <SearchableCombobox
                                              label="AO (Administrative Office) *"
                                              value={aoName}
                                              onChange={setAoName}
                                              options={aoOptions}
                                              placeholder="Type or select AO..."
                                              required
                                            />
                                          )}

                                          {/* RBO Input */}
                                          {["RBO related", "branch related", "case related"].includes(bankSubType) && (
                                            <SearchableCombobox
                                              label="RBO (Regional Office) *"
                                              value={rboName}
                                              onChange={setRboName}
                                              options={rboOptions}
                                              placeholder="Type or select RBO..."
                                              required
                                            />
                                          )}

                                          {/* Case Details Input */}
                                          {bankSubType === "case related" && (
                                            <div className="sm:col-span-2">
                                              <label className="block text-[9px] uppercase tracking-wider text-emerald-700 font-black mb-1">Case Details / No. *</label>
                                              <input
                                                type="text"
                                                required
                                                placeholder="Enter case details or case number..."
                                                value={caseDetails}
                                                onChange={e => setCaseDetails(e.target.value)}
                                                className="w-full border border-emerald-200 rounded-lg px-2 py-2 text-xs font-bold focus:outline-none focus:border-emerald-500 placeholder-slate-400 text-slate-800 bg-white"
                                              />
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })()}
                                  </>
                                ) : (
                                  /* Case 2: For all other Task Modes (Call, SMS, Email, Meeting, WhatsApp, Field Visit, etc.) -> Original Bank Fields */
                                  <div className="space-y-2 animate-fade-in">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 relative z-20">
                                      {/* Bank Input - Searchable */}
                                      <SearchableCombobox
                                        label="Select Bank *"
                                        value={bankName}
                                        placeholder="Type to search bank..."
                                        options={banksList.map(b => b.bankName)}
                                        required
                                        onChange={(val) => {
                                          setBankName(val);
                                          const bObj = banksList.find(b => b.bankName.toLowerCase() === val.toLowerCase() || String(b.id) === val);
                                          if (bObj) {
                                            setSelectedBankId(String(bObj.id));
                                            setBranchName("");
                                            setOfficerName("");
                                            setOfficerPhone("");
                                            fetchBranches(String(bObj.id));
                                          } else {
                                            setSelectedBankId("");
                                          }
                                        }}
                                        onSelectOption={(val) => {
                                          const bObj = banksList.find(b => b.bankName.toLowerCase() === val.toLowerCase() || String(b.id) === val);
                                          if (bObj) {
                                            setSelectedBankId(String(bObj.id));
                                            setBankName(bObj.bankName);
                                            setBranchName("");
                                            setOfficerName("");
                                            setOfficerPhone("");
                                            fetchBranches(String(bObj.id));
                                          }
                                        }}
                                      />

                                      {/* Branch Input - Searchable */}
                                      <SearchableCombobox
                                        label="Select Branch *"
                                        value={branchName}
                                        placeholder={selectedBankId ? "Type to search branch..." : "Select a bank first"}
                                        options={branchesList.map((br: any) => br.branchName + (br.branchCode ? ` (${br.branchCode})` : ""))}
                                        disabled={!selectedBankId}
                                        required
                                        onChange={(val) => {
                                          setBranchName(val);
                                          const cleanVal = val.split(" (")[0].trim();
                                          const brObj = branchesList.find((b: any) => String(b.id) === val || b.branchName === cleanVal || b.branchName === val);
                                          if (brObj) {
                                            setBranchName(brObj.branchName);
                                            if ((brObj as any).rbo || (brObj as any).rboName) setRboName((brObj as any).rbo || (brObj as any).rboName || "");
                                            setOfficerName(brObj.branchManager || brObj.aoName || brObj.foName || "");
                                            setOfficerPhone(brObj.branchManagerContact || brObj.foContact || "");
                                          }
                                        }}
                                        onSelectOption={(val) => {
                                          const cleanVal = val.split(" (")[0].trim();
                                          const brObj = branchesList.find((b: any) => String(b.id) === val || b.branchName === cleanVal || b.branchName === val);
                                          if (brObj) {
                                            setBranchName(brObj.branchName);
                                            if ((brObj as any).rbo || (brObj as any).rboName) setRboName((brObj as any).rbo || (brObj as any).rboName || "");
                                            setOfficerName(brObj.branchManager || brObj.aoName || brObj.foName || "");
                                            setOfficerPhone(brObj.branchManagerContact || brObj.foContact || "");
                                          }
                                        }}
                                      />
                                    </div>

                                    {isBillFollowUp && (
                                      <SearchableCombobox
                                        label="RBO (Regional Office) *"
                                        value={rboName}
                                        onChange={setRboName}
                                        options={Array.from(
                                          new Set(
                                            branchesList
                                              .map(branch => branch.rbo || branch.rboName)
                                              .filter((value): value is string => Boolean(value))
                                          )
                                        )}
                                        placeholder="Type or select RBO..."
                                        required
                                      />
                                    )}

                                    {/* Officer Name & Phone for Bank */}
                                    {selectedTaskCategory === "Bank" && (
                                      <div className="grid grid-cols-2 gap-2 animate-fade-in">
                                        <div>
                                          <label className="block text-[9px] uppercase tracking-wider text-emerald-700 font-black mb-1">Officer Name *</label>
                                          <input
                                            type="text"
                                            required
                                            placeholder="e.g. Ramesh Sharma"
                                            value={officerName}
                                            onChange={e => setOfficerName(e.target.value)}
                                            className="w-full border border-emerald-200 rounded-lg px-2 py-2 text-xs font-bold focus:outline-none focus:border-emerald-500 placeholder-slate-400 text-slate-800 bg-white"
                                          />
                                        </div>
                                        <div>
                                          <label className="block text-[9px] uppercase tracking-wider text-emerald-700 font-black mb-1">Officer Phone *</label>
                                          <input
                                            type="tel"
                                            required
                                            placeholder="e.g. 9876543210"
                                            value={officerPhone}
                                            onChange={e => setOfficerPhone(e.target.value)}
                                            className="w-full border border-emerald-200 rounded-lg px-2 py-2 text-xs font-bold focus:outline-none focus:border-emerald-500 placeholder-slate-400 text-slate-800 bg-white"
                                          />
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Remark / Task Details */}
                            <div className="animate-fade-in relative z-0">
                              <label className="block text-[9px] uppercase tracking-wider text-emerald-700 font-black mb-1">Remark / Task Details</label>
                              <textarea
                                className="w-full border border-emerald-200 rounded-lg px-3 py-2 text-xs font-bold focus:outline-none focus:border-emerald-500 placeholder-slate-400 text-slate-800 bg-white"
                                placeholder="Enter task instructions or details..."
                                rows={2}
                                value={desc}
                                onChange={e => setDesc(e.target.value)}
                              />
                            </div>
                          </div>
                        )}

                        {/* Remark / Task Details for all other task titles (General, IT, Legal, Others etc.) */}
                        {selectedTaskCategory !== "Bank" && selectedTaskCategory !== "Notice" && selectedTaskCategory !== "Interview" && (
                          <div className="animate-fade-in">
                            <label className="block text-[9px] uppercase tracking-wider text-slate-500 font-black mb-1">
                              Remark / Task Details
                            </label>
                            <textarea
                              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold focus:outline-none focus:border-[#714B67] placeholder-slate-400 text-slate-800 bg-white"
                              placeholder="Enter task instructions or details..."
                              rows={2}
                              value={desc}
                              onChange={e => setDesc(e.target.value)}
                            />
                          </div>
                        )}
                        {/* Owner Task Assignment, historical entry and deadline fields */}
                        {(sessionUser as any)?.role === "Owner" && (
                          <div className="space-y-3 border-t border-slate-100 pt-3">
                            <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3">
                              <div className="flex items-start gap-2 mb-2.5">
                                <CalendarClock className="w-4 h-4 text-amber-700 mt-0.5 shrink-0" />
                                <div>
                                  <p className="text-[10px] font-black uppercase tracking-wider text-amber-900">Back Date Entry (Optional)</p>
                                  <p className="text-[9px] text-amber-700 mt-0.5">Purana task record karne ke liye original work date, time aur us samay ka status select karein.</p>
                                </div>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                <div>
                                  <label className="block text-[9px] uppercase tracking-wider text-amber-800 font-black mb-1">Original Date</label>
                                  <input type="date" max={new Date().toISOString().split("T")[0]} value={entryDate} onChange={e => setEntryDate(e.target.value)} className="w-full border border-amber-200 rounded-lg px-2 py-2 text-xs font-bold text-slate-800 bg-white focus:outline-none focus:border-amber-500" />
                                </div>
                                <div>
                                  <label className="block text-[9px] uppercase tracking-wider text-amber-800 font-black mb-1">Original Time</label>
                                  <input type="time" disabled={!entryDate} value={entryTime} onChange={e => setEntryTime(e.target.value)} className="w-full border border-amber-200 rounded-lg px-2 py-2 text-xs font-bold text-slate-800 bg-white disabled:bg-slate-100 focus:outline-none focus:border-amber-500" />
                                </div>
                                <div>
                                  <label className="block text-[9px] uppercase tracking-wider text-amber-800 font-black mb-1">Historical Status</label>
                                  <select disabled={!entryDate} value={entryStatus} onChange={e => setEntryStatus(e.target.value as typeof entryStatus)} className="w-full border border-amber-200 rounded-lg px-2 py-2 text-xs font-bold text-slate-800 bg-white disabled:bg-slate-100 focus:outline-none focus:border-amber-500">
                                    <option value="Pending">Pending</option>
                                    <option value="In Progress">In Progress</option>
                                    <option value="Completed">Completed</option>
                                  </select>
                                </div>
                              </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[9px] uppercase tracking-wider text-slate-500 font-black mb-1">Assign To *</label>
                              <select
                                required
                                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold focus:outline-none focus:border-[#714B67] text-slate-700 bg-white"
                                value={assigneeId}
                                onChange={e => setAssigneeId(e.target.value)}
                              >
                                <option value="">-- Select User --</option>
                                {companyUsers.map((u: any) => (
                                  <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="block text-[9px] uppercase tracking-wider text-slate-500 font-black mb-1">Deadline Date</label>
                                  <input
                                    type="date"
                                    className="w-full border border-slate-200 rounded-lg px-2 py-2 text-xs font-bold focus:outline-none focus:border-[#714B67] text-slate-800 bg-white"
                                    value={deadlineDate}
                                    onChange={e => setDeadlineDate(e.target.value)}
                                  />
                                </div>
                                <div>
                                  <label className="block text-[9px] uppercase tracking-wider text-slate-500 font-black mb-1">Deadline Time</label>
                                  <input
                                    type="time"
                                    className="w-full border border-slate-200 rounded-lg px-2 py-2 text-xs font-bold focus:outline-none focus:border-[#714B67] text-slate-800 bg-white"
                                    value={deadlineTime}
                                    onChange={e => setDeadlineTime(e.target.value)}
                                  />
                                </div>
                              </div>
                            </div>
                            </div>
                          </div>
                        )}

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
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <div className="text-[10px] font-black uppercase tracking-wider text-[#714B67] bg-[#714B67]/10 inline-block px-2 py-0.5 rounded-md">{t.taskType}</div>
                          {t.deadlineAt && !t.scheduledAt && (() => {
                            const deadline = new Date(t.deadlineAt);
                            const now = new Date();
                            const diffMs = deadline.getTime() - now.getTime();
                            const diffHours = diffMs / (1000 * 60 * 60);
                            let text = "";
                            let className = "";

                            let overdueText = "";
                            if (t.status === "Completed") {
                              text = `Deadline: ${new Date(t.deadlineAt).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}`;
                              className = "bg-slate-50 text-slate-400 border-slate-200";
                              if (t.updatedAt) {
                                const completedAt = new Date(t.updatedAt);
                                const overdueMs = completedAt.getTime() - deadline.getTime();
                                if (overdueMs > 0) {
                                  const overdueHrs = Math.floor(overdueMs / (1000 * 60 * 60));
                                  const overdueMins = Math.floor((overdueMs % (1000 * 60 * 60)) / (1000 * 60));
                                  overdueText = `⚠️ Overdue by ${overdueHrs}h ${overdueMins}m when completed`;
                                }
                              }
                            } else if (diffHours < 0) {
                              const overdueMs = Math.abs(diffMs);
                              const overdueHrs = Math.floor(overdueMs / (1000 * 60 * 60));
                              const overdueMins = Math.floor((overdueMs % (1000 * 60 * 60)) / (1000 * 60));
                              const overdueSecs = Math.floor((overdueMs % (1000 * 60)) / 1000);
                              text = `⚠️ Overdue by ${overdueHrs}h ${overdueMins}m ${overdueSecs}s`;
                              className = "bg-rose-50 text-rose-700 border-rose-200 animate-pulse font-extrabold";
                            } else {
                              const remainingHours = Math.floor(diffHours);
                              text = remainingHours === 0
                                ? `⏰ Due in ${Math.floor(diffMs / (1000 * 60))}m`
                                : `⏰ Remaining: ${remainingHours}h`;
                              className = remainingHours === 0
                                ? "bg-amber-50 text-amber-700 border-amber-200 animate-pulse font-extrabold"
                                : "bg-indigo-50 text-indigo-700 border-indigo-200 font-extrabold";
                            }
                            return (
                              <div className="flex flex-col gap-1">
                                <div className={`text-[9px] font-bold px-2 py-0.5 rounded-md border ${className}`}>
                                  {text}
                                </div>
                                {overdueText && (
                                  <div className="text-[9px] font-extrabold text-rose-600 bg-rose-50 border border-rose-100 rounded-md px-2 py-0.5 inline-block">
                                    {overdueText}
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                          {(t as any).assignedByUser && (
                            <div className="text-[9px] font-extrabold text-rose-500 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-md">
                              Assigned by: {(t as any).assignedByUser.name}
                            </div>
                          )}
                        </div>
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
          className="fixed inset-0 bg-slate-900/20 backdrop-blur-md z-50 flex items-center justify-center p-4"
          onClick={() => {
            setSelectedTask(null);
            setIsEditingTask(false);
          }}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto overflow-x-hidden"
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
                <div className="flex items-start justify-between p-6 border-b border-slate-100 min-w-0">
                  <div className="flex-1 pr-4 min-w-0">
                    <span className={`inline-block text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border mb-2 ${TYPE_COLORS[selectedTask.taskType] || TYPE_COLORS.Other}`}>
                      {selectedTask.taskType}
                    </span>
                    <h2 className="text-base font-black text-slate-800 leading-tight break-words">{selectedTask.taskTitle}</h2>
                    {selectedTask.description && cleanDescription(selectedTask.description) && (
                      <p className="text-xs text-slate-500 mt-1 font-medium whitespace-pre-line break-all">{cleanDescription(selectedTask.description)}</p>
                    )}

                    {/* Dynamic Real-Time Lead Status Badge */}
                    {(() => {
                      const leadStatusVal = selectedTask.leadStatus || selectedTask.callStatus || (selectedTask.description?.match(/Lead Status:\s*([^\n]+)/)?.[1]) || (selectedTask.description?.match(/Status:\s*([^\n]+)/)?.[1]);
                      if (!leadStatusVal) return null;

                      const statusBadgeStyle = 
                        leadStatusVal === "Converted" ? "bg-emerald-50 text-emerald-700 border-emerald-300 ring-1 ring-emerald-400/30" :
                        leadStatusVal === "Lost" ? "bg-rose-50 text-rose-700 border-rose-300 ring-1 ring-rose-400/30" :
                        leadStatusVal === "In Progress" ? "bg-blue-50 text-blue-700 border-blue-300 ring-1 ring-blue-400/30" :
                        leadStatusVal === "Qualified" ? "bg-indigo-50 text-indigo-700 border-indigo-300 ring-1 ring-indigo-400/30" :
                        "bg-amber-50 text-amber-700 border-amber-300";

                      return (
                        <div className="mt-2.5 flex items-center gap-2">
                          <span className="text-[9px] uppercase font-black tracking-wider text-slate-400">Lead Status:</span>
                          <span className={`px-2.5 py-0.5 rounded-xl text-xs font-black border ${statusBadgeStyle}`}>
                            {leadStatusVal}
                          </span>
                        </div>
                      );
                    })()}

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


                {/* Automatic Live Task Timer Display */}
                <div className="px-6 py-3 border-b border-slate-100 bg-slate-50/50">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Timer className="w-4 h-4 text-slate-500" />
                      <span className="text-[10px] uppercase font-black text-slate-600 tracking-wider">Time Elapsed</span>
                      <span className={`text-[12px] font-black px-3 py-1 rounded-full border font-mono ${selectedTask.status === "Completed"
                        ? "bg-slate-100 text-slate-700 border-slate-300"
                        : selectedTask.status === "In Progress"
                          ? "bg-emerald-100 text-emerald-700 border-emerald-300"
                          : "bg-indigo-50 text-indigo-700 border-indigo-200"
                        }`}>
                        {selectedTask.status === "In Progress" && (
                          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse mr-1.5" />
                        )}
                        {selectedTask.status === "Completed" ? "✓ " : ""}
                        {formatTimer(getLiveElapsed(selectedTask))}
                      </span>
                    </div>
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
                    {(() => {
                      let proofUrls: string[] = [];
                      if (selectedTask.proofAttachment) {
                        if (selectedTask.proofAttachment.startsWith('[') && selectedTask.proofAttachment.endsWith(']')) {
                          try {
                            proofUrls = JSON.parse(selectedTask.proofAttachment);
                          } catch (_) {
                            proofUrls = [selectedTask.proofAttachment];
                          }
                        } else {
                          proofUrls = selectedTask.proofAttachment.split(',').map((u: string) => u.trim()).filter(Boolean);
                        }
                      }

                      return (
                        <div className="space-y-4">
                          {proofUrls.length > 0 && (
                            <div className="space-y-3">
                              {proofUrls.map((proofObj: any, idx) => {
                                const actualUrl = typeof proofObj === "string" ? proofObj : (proofObj?.url || proofObj?.src || "");
                                const displayName = typeof proofObj === "object" ? (proofObj?.name || `Proof #${idx + 1}`) : `Proof #${idx + 1}`;
                                const url = (actualUrl || "").toLowerCase();
                                return (
                                  <div key={idx} className="border border-slate-200 rounded-xl p-3 bg-white space-y-2 relative shadow-sm">
                                    <div className="text-[9px] font-black text-slate-400 uppercase tracking-wider">{displayName}</div>
                                    <div className="pr-10">
                                      {(() => {
                                        if (url.includes('application/pdf') || url.includes('.pdf')) {
                                          return <a href={actualUrl} target="_blank" rel="noopener noreferrer" download={`${displayName}.pdf`} className="p-2.5 bg-slate-50 hover:bg-slate-100 transition-colors rounded-lg border border-slate-200 text-xs font-bold text-slate-700 flex items-center justify-between gap-2 cursor-pointer"><div className="flex items-center gap-2"><Paperclip className="w-4 h-4" /> {displayName}</div> <Download className="w-4 h-4 text-slate-400" /></a>;
                                        }
                                        if (url.includes('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') || url.includes('application/vnd.ms-excel') || url.includes('text/csv') || url.includes('.xls') || url.includes('.xlsx') || url.includes('.csv')) {
                                          return <a href={actualUrl} target="_blank" rel="noopener noreferrer" download={`${displayName}.xlsx`} className="p-2.5 bg-slate-50 hover:bg-slate-100 transition-colors rounded-lg border border-slate-200 text-xs font-bold text-slate-700 flex items-center justify-between gap-2 cursor-pointer"><div className="flex items-center gap-2"><Paperclip className="w-4 h-4" /> {displayName}</div> <Download className="w-4 h-4 text-slate-400" /></a>;
                                        }

                                        const isAudio = /\.(mp3|wav|wave|m4a|ogg|oga|aac|wma|amr|opus|flac|aiff|aif|caf|ac3|mp2|weba|mka|ra)(?:$|[?#])/i.test(url) || url.includes('audio/');
                                        const isVideo = /\.(mp4|mov|webm|avi|mkv|3gp|3g2|mpeg|mpg|m4v|wmv|flv)(?:$|[?#])/i.test(url) || url.includes('video/');
                                        const isImage = /\.(png|jpe?g|gif|webp|bmp|tiff?|heic|heif|avif)(?:$|[?#])/i.test(url) || url.includes('image/');

                                        if (isAudio) {
                                          return <div className="space-y-2"><audio controls src={actualUrl} className="w-full mt-1 border border-slate-100 rounded-lg p-1 bg-slate-50 shadow-sm" /><a href={actualUrl} target="_blank" rel="noopener noreferrer" download className="text-[10px] font-bold text-indigo-600 hover:underline">Open / download audio</a></div>;
                                        }
                                        if (isVideo) {
                                          return <div className="space-y-2"><video controls src={actualUrl} className="max-h-48 w-full rounded-lg border border-slate-200 object-contain shadow-sm bg-slate-50 mt-1" /><a href={actualUrl} target="_blank" rel="noopener noreferrer" download className="text-[10px] font-bold text-indigo-600 hover:underline">Open / download video</a></div>;
                                        }
                                        if (!isImage) {
                                          return <a href={actualUrl} target="_blank" rel="noopener noreferrer" download className="p-2.5 bg-slate-50 hover:bg-slate-100 transition-colors rounded-lg border border-slate-200 text-xs font-bold text-slate-700 flex items-center justify-between gap-2"><div className="flex items-center gap-2"><Paperclip className="w-4 h-4" /> {displayName}</div><Download className="w-4 h-4 text-slate-400" /></a>;
                                        }
                                        return (
                                          <img
                                            src={actualUrl}
                                            alt={displayName}
                                            className="max-h-36 rounded-lg border border-slate-200 object-contain shadow-sm bg-slate-50"
                                          />
                                        );
                                      })()}
                                    </div>

                                    <button
                                      type="button"
                                      onClick={() => handleRemoveProofAt(idx)}
                                      className="absolute top-2 right-2 p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg border border-rose-100 transition-colors"
                                      title="Remove this proof"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {/* Upload Area Dropzone */}
                          <div className="flex flex-col gap-2">
                            <label className="flex items-center justify-center w-full h-11 border border-dashed border-slate-300 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors bg-white/70">
                              <div className="flex items-center justify-center gap-2 py-1">
                                {uploadingProof ? (
                                  <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
                                ) : (
                                  <Paperclip className="w-4 h-4 text-slate-400" />
                                )}
                                <p className="text-[9px] uppercase font-black text-slate-500 tracking-wider">
                                  {uploadingProof ? "Uploading..." : proofUrls.length > 0 ? "+ Add Another Proof" : "Click to upload Proof"}
                                </p>
                              </div>
                              <input type="file" className="hidden" accept="*/*" onChange={handleUploadProof} disabled={uploadingProof} />
                            </label>
                          </div>
                        </div>
                      );
                    })()}
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
