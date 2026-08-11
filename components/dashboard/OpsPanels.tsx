import React, { useState, useRef, useEffect, useCallback } from "react";
import ReactDOM from "react-dom";
import {
  CalendarCheck,
  Send,
  Camera,
  MapPin,
  Loader2,
  Plus,
  User,
  Hash,
  Search,
  Calendar,
  Clock,
  Eye,
  FileText,
  X,
  Download,
  Info,
  Filter,
  PhoneCall,
  CheckCircle,
  Briefcase,
  Banknote,
  Cpu,
  TrendingUp,
  Layers,
  AlertTriangle,
  Users,
  Scale,
  Save,
  RefreshCw,
  FileSpreadsheet,
  Coins,
  ChevronDown,
  ChevronUp,
  CalendarClock,
  Trash2,
  SlidersHorizontal
} from "lucide-react";
import LegalRecoverySchedulePanel from "./LegalRecoverySchedulePanel";

const formatTimeTo12Hour = (dateInput: any): string => {
  if (!dateInput) return "—";
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true
    });
  } catch (e) {
    return "—";
  }
};

const SearchableCombobox = ({
  label,
  value,
  onChange,
  onSelectOption,
  options,
  placeholder,
  disabled = false
}: {
  label: string;
  value: string;
  onChange: (val: string) => void;
  onSelectOption?: (val: string) => void;
  options: string[];
  placeholder: string;
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
    <div className={`relative font-sans ${isOpen ? "z-[9999]" : "z-0"}`} ref={containerRef}>
      <label className="block text-[9px] font-bold uppercase text-slate-600 mb-1">{label}</label>
      <div className="relative">
        <input
          type="text"
          disabled={disabled}
          value={value}
          onFocus={() => { if (!disabled) setIsOpen(true); }}
          onChange={e => {
            onChange(e.target.value);
            if (!disabled) setIsOpen(true);
          }}
          placeholder={placeholder}
          className="w-full p-2 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 bg-white focus:outline-none focus:border-purple-600 h-[38px] disabled:opacity-50 disabled:bg-slate-100 pr-7"
        />
        <div
          onClick={() => { if (!disabled) setIsOpen(prev => !prev); }}
          className="absolute right-2.5 top-2.5 cursor-pointer text-purple-600 hover:text-purple-800 text-[10px]"
        >
          ▼
        </div>
      </div>
      {isOpen && !disabled && (
        <div className="absolute z-[99999] left-0 right-0 mt-1 bg-white border border-purple-300 rounded-xl shadow-2xl max-h-48 overflow-y-auto divide-y divide-slate-100 font-sans animate-fade-in">
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
                className="px-3 py-2 text-xs font-bold text-slate-800 hover:bg-purple-50 hover:text-purple-900 cursor-pointer transition-colors"
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

interface OpsProps {
  sessionUser?: any;
  stats: any;
  handleAttendancePunch: () => void;
  handleSodSubmit: (payload: any) => Promise<any>;
  handleEodSubmit: (payload: any) => Promise<any>;
  formMode?: "sod" | "eod" | "both";
}

export function DailyCommitments({
  // Main Daily Commitment Panel Component with Searchable Comboboxes & Balanced JSX
  sessionUser,
  stats,
  handleAttendancePunch,
  handleSodSubmit,
  handleEodSubmit,
  formMode = "both"
}: OpsProps) {
  // Submission Status States
  const [sodAlreadySubmitted, setSodAlreadySubmitted] = useState(false);
  const [eodAlreadySubmitted, setEodAlreadySubmitted] = useState(false);

  // SOD States
  const [taskSummary, setTaskSummary] = useState("");
  const [taskType, setTaskType] = useState("Meeting");
  const [remarks, setRemarks] = useState("");
  const [customTaskType, setCustomTaskType] = useState("");
  const [projectName, setProjectName] = useState("");
  const [showCamera, setShowCamera] = useState(false);
  const [submittingSOD, setSubmittingSOD] = useState(false);
  const [locationStatus, setLocationStatus] = useState("Awaiting GPS...");
  const [cameraError, setCameraError] = useState("");
  // SOD Task Title Master & Task Mode Master States
  const [sodCategories, setSodCategories] = useState<string[]>(["General", "Legal Recovery", "Legal", "Bank", "Interview", "IT", "Notice", "Others"]);
  const [sodTaskTitle, setSodTaskTitle] = useState<string>("General");
  const [showAddSodTitleInput, setShowAddSodTitleInput] = useState(false);
  const [newSodTitleText, setNewSodTitleText] = useState("");

  const [sodTaskModes, setSodTaskModes] = useState<string[]>(["Call", "Meeting", "Development", "Marketing", "Field Visit", "Operations", "Support", "Email", "WhatsApp"]);
  const [showAddSodModeInput, setShowAddSodModeInput] = useState(false);
  const [newSodModeText, setNewSodModeText] = useState("");

  // Bank / Branch / Officer subfields for Bank & Notice Task Titles
  const [banksList, setBanksList] = useState<{ id: string | number; bankName: string }[]>([]);
  const [branchesList, setBranchesList] = useState<{ id: string | number; bankId?: any; branchName: string; branchCode?: string; aoName?: string; ao?: string; rbo?: string; rboName?: string; nbfcId?: any }[]>([]);
  const [nbfcsList, setNbfcsList] = useState<{ id: string | number; nbfcName: string; nbfcCode?: string }[]>([]);
  const [nbfcBranchesList, setNbfcBranchesList] = useState<{ id: string | number; nbfcId?: any; branchName: string; branchCode?: string; aoName?: string; rbo?: string }[]>([]);
  const [selectedBankId, setSelectedBankId] = useState("");
  const [sodBankName, setSodBankName] = useState("");
  const [sodBranchName, setSodBranchName] = useState("");
  const [sodOfficerName, setSodOfficerName] = useState("");
  const [sodOfficerPhone, setSodOfficerPhone] = useState("");
  const [sodTaskDetails, setSodTaskDetails] = useState("");

  // Legal Recovery Schedule States inside DailyCommitments
  const [userVertical, setUserVertical] = useState<string>(sessionUser?.vertical || "");
  const [legalScheduleItems, setLegalScheduleItems] = useState<any[]>([]);
  const [legalInputDate, setLegalInputDate] = useState(new Date().toISOString().split("T")[0]);
  const [legalInputTime, setLegalInputTime] = useState(() => 
    new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true })
  );
  const [legalInputWorkSection, setLegalInputWorkSection] = useState("");
  const [legalWorkLocation, setLegalWorkLocation] = useState<string>("Office"); // Office | Bank | Field | Other
  const [legalCustomLocation, setLegalCustomLocation] = useState<string>("");
  const [legalInputType, setLegalInputType] = useState("General"); // General | Bank Related | Others
  const [legalInputSubType, setLegalInputSubType] = useState("AO related"); // AO related | RBO related | branch related | case related

  // Dynamic Subfields according to User Rules
  const [legalInputRemarks, setLegalInputRemarks] = useState("");
  const [legalInputOtherType, setLegalInputOtherType] = useState("");
  const [legalInputBankName, setLegalInputBankName] = useState("");
  const [legalInputAoName, setLegalInputAoName] = useState("");
  const [legalInputRboName, setLegalInputRboName] = useState("");
  const [legalInputBranchName, setLegalInputBranchName] = useState("");
  const [legalInputCaseDetails, setLegalInputCaseDetails] = useState("");
  const [legalInputDetails, setLegalInputDetails] = useState("");
  const [legalInputOfficerName, setLegalInputOfficerName] = useState("");
  const [legalInputOfficerPhone, setLegalInputOfficerPhone] = useState("");

  useEffect(() => {
    fetch("/api/employees/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data?.vertical) {
          setUserVertical(data.data.vertical);
          if (["Legal Recovery", "Security", "Legal & Security"].includes(data.data.vertical)) {
            setSodTaskTitle("Legal Recovery");
          }
        }
      })
      .catch((err) => console.error("Failed to load user profile in DailyCommitments:", err));

    fetchBanksAndBranches();
  }, []);

  const isLegalRecovery = ["Legal Recovery", "Security", "Legal & Security"].includes(userVertical) ||
    ["Legal Recovery", "Security", "Legal & Security"].includes(sessionUser?.vertical) ||
    ["Legal", "Legal Recovery", "Security"].includes(sodTaskTitle);

  const handleAddLegalScheduleItem = () => {
    const defaultLoc = legalInputType === "Field Visit" ? "Field" : (["Bank Related", "NBFC"].includes(legalInputType) ? "Bank" : "Office");
    const actualWorkLoc = legalWorkLocation || defaultLoc;
    const effectiveLocation = actualWorkLoc === "Other"
      ? (legalCustomLocation.trim() || "Other")
      : actualWorkLoc;

    if (actualWorkLoc === "Other" && !legalCustomLocation.trim()) {
      alert("Please enter custom location details.");
      return;
    }
    if (legalInputType === "Others" && !legalInputOtherType.trim()) {
      alert("Please specify custom Type / Input for Others.");
      return;
    }
    if (["Bank Related", "Call", "Field Visit"].includes(legalInputType)) {
      if (!legalInputBankName.trim()) {
        alert("Please select Bank Name.");
        return;
      }
      if (!legalInputBranchName.trim()) {
        alert("Please select Branch for the selected Bank.");
        return;
      }
      if (legalInputType === "Bank Related" && legalInputSubType === "case related" && !legalInputCaseDetails.trim()) {
        alert("Please enter Case Details.");
        return;
      }
    }
    if (legalInputType === "Field Visit" && !legalInputDetails.trim()) {
      alert("Please enter Visit Details / Purpose.");
      return;
    }
    if (legalInputType === "NBFC" && !legalInputBankName.trim()) {
      alert("Please select or type NBFC Name.");
      return;
    }

    const newItem = {
      id: "temp_" + Date.now() + "_" + Math.random().toString(36).substr(2, 4),
      date: legalInputDate,
      time: legalInputTime,
      workSection: effectiveLocation,
      workLocation: actualWorkLoc,
      customLocation: actualWorkLoc === "Other" ? legalCustomLocation.trim() : null,
      type: legalInputType,
      subType: legalInputType === "Bank Related" ? legalInputSubType : (legalInputType === "Call" ? (["Incoming Call", "Outgoing Call"].includes(legalInputSubType) ? legalInputSubType : "Incoming Call") : null),
      remarks: legalInputRemarks.trim(),
      otherType: (legalInputType === "Others") ? legalInputOtherType.trim() : null,
      bankName: ["Bank Related", "NBFC", "Call", "Field Visit"].includes(legalInputType) ? (legalInputBankName.trim() || null) : null,
      branchName: ["Bank Related", "NBFC", "Call", "Field Visit"].includes(legalInputType) ? (legalInputBranchName.trim() || null) : null,
      aoName: (legalInputType === "Bank Related" && ["AO related", "RBO related", "branch related", "case related"].includes(legalInputSubType)) ? legalInputAoName.trim() : (legalInputAoName.trim() || null),
      rboName: (legalInputType === "Bank Related" && ["RBO related", "branch related", "case related"].includes(legalInputSubType)) ? legalInputRboName.trim() : (legalInputRboName.trim() || null),
      caseDetails: (legalInputType === "Bank Related" && legalInputSubType === "case related") ? legalInputCaseDetails.trim() : null,
      officerName: ["Call", "Field Visit", "Bank Related", "NBFC"].includes(legalInputType) ? (legalInputOfficerName.trim() || null) : null,
      officerPhone: ["Call", "Field Visit", "Bank Related", "NBFC"].includes(legalInputType) ? (legalInputOfficerPhone.trim() || null) : null,
      details: legalInputDetails.trim(),
      status: "Pending"
    };

    setLegalScheduleItems(prev => [...prev, newItem]);

    // Reset fields
    setLegalWorkLocation(defaultLoc);
    setLegalCustomLocation("");
    setLegalInputWorkSection("");
    setLegalInputRemarks("");
    setLegalInputOtherType("");
    setLegalInputBankName("");
    setLegalInputAoName("");
    setLegalInputRboName("");
    setLegalInputBranchName("");
    setLegalInputCaseDetails("");
    setLegalInputOfficerName("");
    setLegalInputOfficerPhone("");
    setLegalInputDetails("");
  };

  const handleSaveSchedulesDirect = async () => {
    if (legalScheduleItems.length === 0) {
      alert("Please add at least 1 schedule entry to your table before saving.");
      return;
    }
    setSubmittingSOD(true);
    try {
      const success = await handleSodSubmit({
        taskSummary: `[Legal Recovery SOD] ${legalScheduleItems.length} Schedule Tasks Saved`,
        taskType: "Legal Recovery",
        selfieUrl: "/uploads/sod-schedule-direct.jpg",
        location: { latitude: 26.9124, longitude: 75.7873, address: "Office Location" },
        legalSchedules: legalScheduleItems
      });

      if (success) {
        alert("Schedule tasks saved successfully! Synced with Schedule Work Report and My Tasks.");
        setSodAlreadySubmitted(true);
        setLegalScheduleItems([]);
      }
    } catch (err: any) {
      console.error(err);
      alert("Failed to save schedule tasks: " + (err?.message || "Unknown error"));
    } finally {
      setSubmittingSOD(false);
    }
  };

  const handleDeleteLegalScheduleItem = (index: number) => {
    setLegalScheduleItems(prev => prev.filter((_, i) => i !== index));
  };

  const fetchBanksAndBranches = async () => {
    try {
      const [bankRes, branchRes, nbfcRes, nbfcBranchRes] = await Promise.all([
        fetch("/api/legal-recovery/banks"),
        fetch("/api/legal-recovery/branches"),
        fetch("/api/legal-recovery/nbfc"),
        fetch("/api/legal-recovery/nbfc-branches")
      ]);
      const bankData = await bankRes.json();
      const branchData = await branchRes.json();
      const nbfcData = await nbfcRes.json();
      const nbfcBranchData = await nbfcBranchRes.json();

      if (bankData.success) setBanksList(bankData.data || []);
      if (branchData.success) setBranchesList(branchData.data || []);
      if (nbfcData.success) setNbfcsList(nbfcData.data || []);
      if (nbfcBranchData.success) setNbfcBranchesList(nbfcBranchData.data || []);
    } catch (err) {
      console.error("Failed to load banks/branches/nbfcs for SOD:", err);
    }
  };

  useEffect(() => {
    fetchBanksAndBranches();
  }, []);

  const [sodProjects, setSodProjects] = useState<string[]>(["HRMS", "RRR"]);
  const [showAddProjectInput, setShowAddProjectInput] = useState(false);
  const [newProjectText, setNewProjectText] = useState("");

  const fetchSodTaskOptions = async () => {
    try {
      const [catRes, modeRes, projRes] = await Promise.all([
        fetch("/api/tasks/call-categories"),
        fetch("/api/tasks/modes"),
        fetch("/api/tasks/projects")
      ]);
      const catData = await catRes.json();
      const modeData = await modeRes.json();
      const projData = await projRes.json();

      if (catData.success && Array.isArray(catData.data)) {
        setSodCategories(catData.data);
        if (catData.data.length > 0 && !sodTaskTitle) {
          setSodTaskTitle(catData.data[0]);
        }
      }

      if (modeData.success && Array.isArray(modeData.data)) {
        const modeNames = modeData.data.map((m: any) => m.name || m);
        setSodTaskModes((prev) => Array.from(new Set([...prev, ...modeNames])));
      }

      if (projData.success && Array.isArray(projData.data)) {
        const pNames = projData.data.map((p: any) => p.name || p);
        setSodProjects((prev) => Array.from(new Set([...prev, ...pNames])));
      }
    } catch (err) {
      console.error("Failed to load SOD task options:", err);
    }
  };

  const handleAddSodProject = async () => {
    const trimmed = newProjectText.trim();
    if (!trimmed) return;
    if (sodProjects.map(p => p.toLowerCase()).includes(trimmed.toLowerCase())) {
      setProjectName(trimmed);
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
        const addedName = data.data?.name || trimmed;
        setSodProjects(prev => Array.from(new Set([...prev, addedName])));
        setProjectName(addedName);
        setNewProjectText("");
        setShowAddProjectInput(false);
      } else {
        alert(data.error || "Failed to save project to DB.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchSodTaskOptions();
  }, []);

  const handleAddSodTitle = async () => {
    const trimmed = newSodTitleText.trim();
    if (!trimmed) return;
    if (sodCategories.map(c => c.toLowerCase()).includes(trimmed.toLowerCase())) {
      setSodTaskTitle(trimmed);
      setNewSodTitleText("");
      setShowAddSodTitleInput(false);
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
        setSodCategories(prev => Array.from(new Set([...prev, data.data || trimmed])));
        setSodTaskTitle(data.data || trimmed);
        setNewSodTitleText("");
        setShowAddSodTitleInput(false);
      } else {
        alert(data.error || "Failed to save category to DB.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddSodMode = async () => {
    const trimmed = newSodModeText.trim();
    if (!trimmed) return;
    if (sodTaskModes.map(m => m.toLowerCase()).includes(trimmed.toLowerCase())) {
      setTaskType(trimmed);
      setNewSodModeText("");
      setShowAddSodModeInput(false);
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
        const addedName = data.data?.name || trimmed;
        setSodTaskModes(prev => Array.from(new Set([...prev, addedName])));
        setTaskType(addedName);
        setNewSodModeText("");
        setShowAddSodModeInput(false);
      } else {
        alert(data.error || "Failed to save task mode to DB.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // EOD States
  const [eodCompleted, setEodCompleted] = useState("");
  const [eodPending, setEodPending] = useState("");
  const [eodTomorrowPlan, setEodTomorrowPlan] = useState("");
  const [eodIssues, setEodIssues] = useState("");
  const [eodEscalation, setEodEscalation] = useState("No");

  const [showEodCamera, setShowEodCamera] = useState(false);
  const [submittingEOD, setSubmittingEOD] = useState(false);
  const [eodLocationStatus, setEodLocationStatus] = useState("Awaiting GPS...");
  const [eodCameraError, setEodCameraError] = useState("");

  const eodVideoRef = useRef<HTMLVideoElement>(null);
  const eodCanvasRef = useRef<HTMLCanvasElement>(null);

  // Calendar Modal States
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [companies, setCompanies] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [selectedCompany, setSelectedCompany] = useState("");
  const [selectedUser, setSelectedUser] = useState("");
  const [calendarAttendance, setCalendarAttendance] = useState<any[]>([]);
  const [calendarLeaves, setCalendarLeaves] = useState<any[]>([]);
  const [calendarFines, setCalendarFines] = useState<any[]>([]);
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth()); // 0-11
  const [loadingCalendar, setLoadingCalendar] = useState(false);

  const fetchCalendarMetadata = async () => {
    try {
      const res = await fetch("/api/attendance/calendar-data");
      const data = await res.json();
      if (data.success) {
        setCompanies(data.data.companies || []);
        setUsers(data.data.users || []);

        // Find default selections
        const selfUser = data.data.users.find((u: any) => u.id === sessionUser?.id || u.id === sessionUser?.id);
        if (selfUser) {
          setSelectedUser(selfUser.id || selfUser.id);
          if (selfUser.companies && selfUser.companies.length > 0) {
            setSelectedCompany(selfUser.companies[0]);
          }
        } else if (data.data.users.length > 0) {
          setSelectedUser(data.data.users[0].id || data.data.users[0].id);
          if (data.data.users[0].companies && data.data.users[0].companies.length > 0) {
            setSelectedCompany(data.data.users[0].companies[0]);
          }
        }
      }
    } catch (err) {
      console.error("Error loading calendar metadata:", err);
    }
  };

  const fetchUserCalendarData = async (userId: string) => {
    if (!userId) return;
    setLoadingCalendar(true);
    try {
      const [calRes, fineRes] = await Promise.all([
        fetch(`/api/attendance/calendar-data?userId=${userId}`),
        fetch(`/api/fines?employeeId=${userId}`),
      ]);
      const data = await calRes.json();
      const fineData = await fineRes.json();
      if (data.success) {
        setCalendarAttendance(data.data.attendance || []);
        setCalendarLeaves(data.data.leaves || []);
      }
      if (fineData.success) {
        setCalendarFines(fineData.data || []);
      }
    } catch (err) {
      console.error("Error loading user calendar data:", err);
    } finally {
      setLoadingCalendar(false);
    }
  };

  useEffect(() => {
    if (showCalendarModal) {
      fetchCalendarMetadata();
    }
  }, [showCalendarModal]);

  useEffect(() => {
    if (selectedUser) {
      fetchUserCalendarData(selectedUser);
    }
  }, [selectedUser]);

  const checkTodaySubmissions = async () => {
    try {
      const [sodRes, eodRes] = await Promise.all([
        fetch("/api/reports/sod"),
        fetch("/api/reports/eod")
      ]);
      const sodData = await sodRes.json();
      const eodData = await eodRes.json();
      if (sodData.success && sodData.data) {
        setSodAlreadySubmitted(true);
      } else {
        setSodAlreadySubmitted(false);
        if (sodData.lastEodPlan) {
          setTaskSummary(sodData.lastEodPlan);
        }
      }
      if (eodData.success && eodData.data) {
        setEodAlreadySubmitted(true);
      } else {
        setEodAlreadySubmitted(false);
      }
    } catch (err) {
      console.error("Error checking today's submissions:", err);
    }
  };

  useEffect(() => {
    checkTodaySubmissions();
  }, [sessionUser]);

  const handleCompanyChange = (companyId: string) => {
    setSelectedCompany(companyId);
    const firstUserInCompany = users.find((u: any) => u.companies && u.companies.includes(companyId));
    if (firstUserInCompany) {
      setSelectedUser(firstUserInCompany.id || firstUserInCompany.id);
    } else {
      setSelectedUser("");
      setCalendarAttendance([]);
      setCalendarLeaves([]);
    }
  };

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  const monthsList = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const handlePrevMonth = () => {
    if (calendarMonth === 0) {
      setCalendarMonth(11);
      setCalendarYear(calendarYear - 1);
    } else {
      setCalendarMonth(calendarMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (calendarMonth === 11) {
      setCalendarMonth(0);
      setCalendarYear(calendarYear + 1);
    } else {
      setCalendarMonth(calendarMonth + 1);
    }
  };

  const filteredUsers = users.filter((u: any) => {
    if (!selectedCompany) return true;
    return u.companies && u.companies.includes(selectedCompany);
  });

  const isOwner = sessionUser?.role === "Owner";
  const selfUser = users.find((u: any) => (u.id || u.id) === sessionUser?.id);

  const displayCompanies = isOwner
    ? companies
    : (selfUser?.companies
      ? companies.filter((c: any) => selfUser.companies.includes(c.id || c.id))
      : companies);

  const displayUsers = isOwner
    ? filteredUsers
    : filteredUsers.filter((u: any) => (u.id || u.id) === sessionUser?.id);

  const activeDisplayUsers = displayUsers.filter((u: any) => (u.status || "active").toLowerCase() === "active");
  const inactiveDisplayUsers = displayUsers.filter((u: any) => (u.status || "active").toLowerCase() !== "active");

  const renderCalendarDays = () => {
    const days = [];
    const totalDays = getDaysInMonth(calendarYear, calendarMonth);
    const firstDayIndex = getFirstDayOfMonth(calendarYear, calendarMonth);

    for (let i = 0; i < firstDayIndex; i++) {
      days.push(<div key={`empty-${i}`} className="h-14 border border-slate-100 bg-slate-50/50 rounded-lg"></div>);
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    for (let d = 1; d <= totalDays; d++) {
      const dateObj = new Date(calendarYear, calendarMonth, d);
      const isSunday = dateObj.getDay() === 0;
      const isFuture = dateObj > todayStart;
      const isToday = dateObj.toDateString() === todayStart.toDateString();

      const isApprovedLeave = calendarLeaves.some(l => {
        const start = new Date(l.startDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(l.endDate);
        end.setHours(23, 59, 59, 999);
        return dateObj >= start && dateObj <= end;
      });

      const attendanceRec = calendarAttendance.find(a => {
        const aDate = new Date(a.date);
        return aDate.getFullYear() === dateObj.getFullYear() &&
          aDate.getMonth() === dateObj.getMonth() &&
          aDate.getDate() === dateObj.getDate();
      });

      let statusLabel = "";
      let statusColor = "bg-white text-slate-700 border-slate-200";

      if (isSunday) {
        statusLabel = "Weekly Off";
        statusColor = "bg-slate-100 text-slate-500 border-slate-200 font-bold";
      } else if (isApprovedLeave) {
        statusLabel = "Leave";
        statusColor = "bg-amber-100 text-amber-800 border-amber-200 font-bold";
      } else if (attendanceRec) {
        if (attendanceRec.status === "Present") {
          statusLabel = "Present";
          statusColor = "bg-emerald-100 text-emerald-800 border-emerald-200 font-bold";
        } else if (attendanceRec.status === "Leave") {
          statusLabel = "Leave";
          statusColor = "bg-amber-100 text-amber-800 border-amber-200 font-bold";
        } else if (attendanceRec.status === "Absent") {
          statusLabel = "Absent";
          statusColor = "bg-rose-100 text-rose-800 border-rose-200 font-bold";
        } else {
          statusLabel = attendanceRec.status;
          statusColor = "bg-slate-100 text-slate-800 border-slate-200";
        }
      } else if (isFuture) {
        statusLabel = "";
        statusColor = "bg-white text-slate-300 border-slate-100";
      } else if (isToday) {
        statusLabel = "Pending";
        statusColor = "bg-indigo-50 text-indigo-700 border-indigo-200 animate-pulse font-bold";
      } else {
        statusLabel = "Absent";
        statusColor = "bg-rose-100 text-rose-800 border-rose-200 font-bold";
      }

      const dateStr = dateObj.getFullYear() + "-" + String(dateObj.getMonth() + 1).padStart(2, '0') + "-" + String(dateObj.getDate()).padStart(2, '0');
      const fineRec = calendarFines.find((f: any) => {
        const fDateStr = f.date ? f.date.split("T")[0] : "";
        return fDateStr === dateStr;
      });

      if (fineRec) {
        statusLabel = `Absent Fine ₹${fineRec.amount}`;
        statusColor = "bg-rose-600 text-white border-rose-700 font-black shadow-md";
      }

      days.push(
        <div
          key={`day-${d}`}
          className={`h-14 border rounded-lg p-1.5 flex flex-col justify-between transition-all ${statusColor} shadow-sm`}
        >
          <div className="text-[10px] font-bold font-mono">{d}</div>
          {statusLabel && (
            <div className="text-[8px] uppercase tracking-wider font-extrabold text-center py-0.5 rounded">
              {statusLabel}
            </div>
          )}
        </div>
      );
    }

    return days;
  };

  // --- SOD CAMERA LOGIC ---
  useEffect(() => {
    if (showCamera) startCamera(videoRef, setCameraError);
    else stopCamera(videoRef);
  }, [showCamera]);

  // --- EOD CAMERA LOGIC ---
  useEffect(() => {
    if (showEodCamera) startCamera(eodVideoRef, setEodCameraError);
    else stopCamera(eodVideoRef);
  }, [showEodCamera]);

  const startCamera = async (ref: React.RefObject<HTMLVideoElement>, setError: any) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
      if (ref.current) {
        ref.current.srcObject = stream;
      }
    } catch (err: any) {
      setError("Camera access denied or unavailable.");
    }
  };

  const stopCamera = (ref: React.RefObject<HTMLVideoElement>) => {
    if (ref.current && ref.current.srcObject) {
      const stream = ref.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
  };

  const captureSodPhotoAndSubmit = async () => {
    if (sodTaskTitle === "Bank" && (!selectedBankId || !sodBranchName || !sodOfficerName.trim() || !sodOfficerPhone.trim())) {
      alert("Please select Bank, Branch, Officer Name and Officer Phone for Bank task.");
      setShowCamera(false);
      return;
    }

    if (sodTaskTitle === "Notice" && (!selectedBankId || !sodBranchName)) {
      alert("Please select Bank and Branch for Notice task.");
      setShowCamera(false);
      return;
    }

    if (taskType === "Other" && !customTaskType.trim()) {
      alert("Please specify the task type.");
      setShowCamera(false);
      return;
    }

    if (taskType === "Development" && !projectName.trim()) {
      alert("Please specify the Project Name.");
      setShowCamera(false);
      return;
    }

    setSubmittingSOD(true);
    setLocationStatus("Fetching GPS coordinates...");

    let location: any = null;
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        });
      });
      location = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        timestamp: new Date(position.timestamp)
      };
    } catch (geoErr) {
      console.warn("GPS access blocked or unavailable for SOD", geoErr);
      alert("Error: GPS Location access is required to submit SOD. Please enable location services and try again.");
      setSubmittingSOD(false);
      setShowCamera(false);
      return;
    }

    setLocationStatus("Uploading verification capture...");
    let selfieUrl = "";

    try {
      if (!videoRef.current || !canvasRef.current || videoRef.current.videoWidth === 0) {
        throw new Error("Camera stream is not active or ready.");
      }

      const context = canvasRef.current.getContext("2d");
      if (!context) {
        throw new Error("Failed to initialize canvas context.");
      }

      canvasRef.current.width = videoRef.current.videoWidth;
      canvasRef.current.height = videoRef.current.videoHeight;
      context.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);

      const blob = await new Promise<Blob | null>((resolve) => {
        canvasRef.current!.toBlob(resolve, "image/jpeg", 0.9);
      });

      if (!blob) {
        throw new Error("Failed to generate image blob from camera.");
      }

      const formData = new FormData();
      formData.append("file", blob, "sod-selfie.jpg");
      const uploadRes = await fetch("/api/documents/upload", {
        method: "POST",
        body: formData,
      });
      const uploadData = await uploadRes.json();
      if (!uploadData.success) {
        throw new Error(uploadData.error || "Upload failed");
      }
      selfieUrl = uploadData.url;
    } catch (camErr: any) {
      console.error(camErr);
      alert("Verification Capture Failed: " + camErr.message);
      setSubmittingSOD(false);
      setShowCamera(false);
      return;
    }

    setLocationStatus("Syncing with RS9 ERP System...");
    try {
      const isLegalMode = isLegalRecovery;
      const success = await handleSodSubmit({
        taskSummary: isLegalMode
          ? `[Legal Recovery SOD] ${legalScheduleItems.length} Schedule Items Declared`
          : (sodTaskTitle === "Bank" ? `[Bank: ${sodBankName || "Bank"}] Branch: ${sodBranchName || "—"} | Officer: ${sodOfficerName || "—"} (${sodOfficerPhone || "—"})${remarks ? ` — ${remarks}` : ""}` : (sodTaskTitle ? `[${sodTaskTitle}] ${remarks || sodTaskTitle}` : (remarks || "General Task"))),
        taskType: isLegalMode ? "Legal Recovery" : (taskType === "Other" ? (customTaskType.trim() || "Other") : taskType),
        projectName: (sodTaskTitle === "IT" || taskType === "Development") ? (projectName.trim() || "") : undefined,
        remarks: remarks,
        selfieUrl,
        location,
        legalSchedules: isLegalMode ? legalScheduleItems : undefined
      });

      if (success) {
        setSodAlreadySubmitted(true);
        setShowCamera(false);
        setRemarks("");
        setLegalScheduleItems([]);
        setSodTaskDetails("");
        setSodBankName("");
        setSodBranchName("");
        setSelectedBankId("");
        setSodOfficerName("");
        setSodOfficerPhone("");
        setCustomTaskType("");
        setProjectName("");
      }
      setSubmittingSOD(false);
      setLocationStatus("Awaiting GPS...");
    } catch (err: any) {
      console.error(err);
      alert("Failed to submit SOD: " + err.message);
      setSubmittingSOD(false);
      setShowCamera(false);
    }
  };

  const captureEodPhotoAndSubmit = async () => {
    if (!eodCompleted || !eodPending || !eodTomorrowPlan) {
      alert("Please fill in Completed, Pending, and Tomorrow's Plan before capturing verification.");
      setShowEodCamera(false);
      return;
    }

    setSubmittingEOD(true);
    setEodLocationStatus("Fetching GPS coordinates...");

    let location: any = null;
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        });
      });
      location = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        timestamp: new Date(position.timestamp)
      };
    } catch (geoErr) {
      console.warn("GPS access blocked or unavailable for EOD", geoErr);
      alert("Error: GPS Location access is required to submit EOD. Please enable location services and try again.");
      setSubmittingEOD(false);
      setShowEodCamera(false);
      return;
    }

    setEodLocationStatus("Uploading verification capture...");
    let selfieUrl = "";

    try {
      if (!eodVideoRef.current || !eodCanvasRef.current || eodVideoRef.current.videoWidth === 0) {
        throw new Error("Camera stream is not active or ready.");
      }

      const context = eodCanvasRef.current.getContext("2d");
      if (!context) {
        throw new Error("Failed to initialize canvas context.");
      }

      eodCanvasRef.current.width = eodVideoRef.current.videoWidth;
      eodCanvasRef.current.height = eodVideoRef.current.videoHeight;
      context.drawImage(eodVideoRef.current, 0, 0, eodCanvasRef.current.width, eodCanvasRef.current.height);

      const blob = await new Promise<Blob | null>((resolve) => {
        eodCanvasRef.current!.toBlob(resolve, "image/jpeg", 0.9);
      });

      if (!blob) {
        throw new Error("Failed to generate image blob from camera.");
      }

      const formData = new FormData();
      formData.append("file", blob, "eod-selfie.jpg");
      const uploadRes = await fetch("/api/documents/upload", {
        method: "POST",
        body: formData,
      });
      const uploadData = await uploadRes.json();
      if (!uploadData.success) {
        throw new Error(uploadData.error || "Upload failed");
      }
      selfieUrl = uploadData.url;
    } catch (camErr: any) {
      console.error(camErr);
      alert("Verification Capture Failed: " + camErr.message);
      setSubmittingEOD(false);
      setShowEodCamera(false);
      return;
    }

    setEodLocationStatus("Syncing with RS9 ERP System...");
    try {
      const success = await handleEodSubmit({
        completedWork: eodCompleted,
        pendingWork: eodPending,
        issues: eodIssues,
        escalationNeeded: eodEscalation.startsWith("Yes"),
        tomorrowPlan: eodTomorrowPlan,
        selfieUrl,
        location
      });

      if (success) {
        setEodAlreadySubmitted(true);
        setShowEodCamera(false);
        setEodCompleted("");
        setEodPending("");
        setEodIssues("");
        setEodTomorrowPlan("");
      }
      setSubmittingEOD(false);
      setEodLocationStatus("Awaiting GPS...");
    } catch (err: any) {
      console.error(err);
      alert("Failed to submit EOD: " + err.message);
      setSubmittingEOD(false);
      setShowEodCamera(false);
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn text-slate-800">
      {formMode === "both" && (
        <>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-black text-slate-850">Daily Commitment Audits</h1>
              <p className="text-xs text-slate-500 mt-1">Mark attendance punch-in registry, declare Start of Day planner, EOD outcomes</p>
            </div>
            <button
              className="bg-[#714B67] hover:bg-[#5F3F56] px-4 py-2.5 rounded-lg text-xs font-bold text-white transition-all flex items-center gap-1.5 shadow"
              onClick={() => setShowCalendarModal(true)}
            >
              <CalendarCheck className="w-4 h-4" /> Punch Attendance Check
            </button>
          </div>

          {/* Stats widgets */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
              <div className="text-[9px] uppercase font-black text-slate-450 font-mono tracking-widest">Present</div>
              <div className="text-2xl font-black text-slate-855 font-mono mt-2">{stats?.todayCompliance?.attendance ?? 0}</div>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
              <div className="text-[9px] uppercase font-black text-slate-455 font-mono tracking-widest">Late Checkins</div>
              <div className="text-2xl font-black text-slate-855 font-mono mt-2">{stats?.todayCompliance?.lateCheckins ?? 0}</div>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
              <div className="text-[9px] uppercase font-black text-slate-455 font-mono tracking-widest">Leaves Count</div>
              <div className="text-2xl font-black text-slate-855 font-mono mt-2">{stats?.todayCompliance?.leaves ?? 0}</div>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
              <div className="text-[9px] uppercase font-black text-slate-455 font-mono tracking-widest">SOD Declarations</div>
              <div className="text-2xl font-black text-emerald-600 font-mono mt-2">{stats?.todayCompliance?.sod ?? 0}</div>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
              <div className="text-[9px] uppercase font-black text-slate-455 font-mono tracking-widest">EOD Logs Submitted</div>
              <div className="text-2xl font-black text-[#714B67] font-mono mt-2">{stats?.todayCompliance?.eod ?? 0}</div>
            </div>
          </div>
        </>
      )}

      {/* Forms */}
      <div className={`grid grid-cols-1 ${formMode === "both" ? "lg:grid-cols-2" : ""} gap-8`}>

        {/* SOD Planner with Strict Verification */}
        {(formMode === "both" || formMode === "sod") && (
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col">
            <h3 className="text-xs font-black tracking-widest text-[#714B67] uppercase font-mono pb-2 border-b border-slate-100 mb-4 flex items-center justify-between">
              <span>📋 SOD</span>
              {sodAlreadySubmitted && (
                <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[9px] font-mono font-bold px-2 py-0.5 rounded-full">
                  ALREADY FILED
                </span>
              )}
            </h3>

            {sodAlreadySubmitted ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-3 bg-emerald-50/20 border border-dashed border-emerald-200 rounded-xl min-h-[300px]">
                <div className="bg-emerald-100 p-3 rounded-full text-emerald-600">
                  <CalendarCheck className="w-8 h-8" />
                </div>
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wide">SOD Declared Successfully</h4>
                <p className="text-[10px] text-slate-500 font-medium max-w-xs leading-relaxed">
                  Your Start of Day planner for today has been logged. You are set to go! Check your entries in the Work Report.
                </p>
              </div>
            ) : !showCamera ? (
              <div className="space-y-4 font-semibold text-slate-650 flex-1">
                {/* Profile Bar */}
                <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-indigo-500" />
                    <span className="text-xs font-black text-slate-800 uppercase tracking-wide">{sessionUser?.name || "Employee"}</span>
                  </div>
                  <div className="flex items-center gap-1 bg-white border border-slate-200 px-2 py-1 rounded">
                    <Hash className="w-3 h-3 text-slate-400" />
                    <span className="text-[10px] font-mono text-slate-500 font-bold">{sessionUser?.id ? sessionUser.id.substring(0, 8).toUpperCase() : "USR-101"}</span>
                  </div>
                </div>

                {/* Legal Recovery Vertical SOD Schedule Planner Table */}
                {isLegalRecovery && (
                  <div className="space-y-4 bg-purple-50/50 border border-purple-200 rounded-xl p-4 animate-fade-in md:col-span-2">
                    <div className="flex items-center justify-between border-b border-purple-200 pb-2">
                      <span className="text-xs font-black uppercase tracking-wider text-purple-900 font-mono flex items-center gap-1.5">
                        <Scale className="w-4 h-4 text-purple-600" /> Legal Recovery Schedule Planner Table
                      </span>
                      <span className="text-[10px] font-mono text-purple-700 bg-purple-100 px-2 py-0.5 rounded font-bold">
                        Legal Recovery Mode Active
                      </span>
                    </div>

                    {/* Schedule Form Input Row */}
                    <div className="bg-white p-3.5 rounded-xl border border-purple-200 shadow-sm space-y-3">
                      {/* Top Row: Date, Time, Work Section, Type */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                        <div>
                          <label className="block text-[9px] font-bold uppercase text-slate-500 mb-1">Date *</label>
                          <input
                            type="date"
                            value={legalInputDate}
                            onChange={e => setLegalInputDate(e.target.value)}
                            className="w-full p-2 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:border-purple-600 bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-bold uppercase text-slate-500 mb-1">Time *</label>
                          <input
                            type="time"
                            value={
                              (() => {
                                if (!legalInputTime) return "10:00";
                                const match = legalInputTime.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
                                if (!match) return "10:00";
                                let [_, h, m, ampm] = match;
                                let hour = parseInt(h, 10);
                                if (ampm) {
                                  if (ampm.toUpperCase() === "PM" && hour < 12) hour += 12;
                                  if (ampm.toUpperCase() === "AM" && hour === 12) hour = 0;
                                }
                                return `${String(hour).padStart(2, '0')}:${m}`;
                              })()
                            }
                            onChange={e => {
                              const val = e.target.value;
                              if (!val) return;
                              const [h, m] = val.split(":");
                              let hour = parseInt(h, 10);
                              const ampm = hour >= 12 ? "PM" : "AM";
                              hour = hour % 12 || 12;
                              setLegalInputTime(`${String(hour).padStart(2, '0')}:${m} ${ampm}`);
                            }}
                            className="w-full p-2 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:border-purple-600 bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-bold uppercase text-slate-500 mb-1">Work Location *</label>
                          <select
                            value={legalWorkLocation}
                            onChange={e => setLegalWorkLocation(e.target.value)}
                            className="w-full p-2 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:border-purple-600 bg-white"
                          >
                            <option value="Office">Office</option>
                            <option value="Bank">Bank</option>
                            <option value="Field">Field</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[9px] font-bold uppercase text-slate-500 mb-1">Type *</label>
                          <select
                            value={legalInputType}
                            onChange={e => {
                              const val = e.target.value;
                              setLegalInputType(val);
                              if (val === "Call") {
                                setLegalInputSubType("Incoming Call");
                                setLegalWorkLocation("Office");
                              } else if (val === "Field Visit") {
                                setLegalInputSubType("");
                                setLegalWorkLocation("Field");
                              } else if (val === "Bank Related" || val === "NBFC") {
                                setLegalInputSubType("AO related");
                                setLegalWorkLocation("Bank");
                              } else if (val === "General") {
                                setLegalInputSubType("");
                                setLegalWorkLocation("Office");
                              }
                            }}
                            className="w-full p-2 border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:border-purple-600"
                          >
                            <option value="General">General</option>
                            <option value="Bank Related">Bank Related</option>
                            <option value="NBFC">NBFC</option>
                            <option value="Call">Call</option>
                            <option value="Field Visit">Field Visit</option>
                            <option value="Others">Others</option>
                          </select>
                        </div>
                      </div>

                      {/* Conditional Custom Work Location when 'Other' */}
                      {legalWorkLocation === "Other" && (
                        <div className="p-2.5 bg-amber-50/70 border border-amber-200 rounded-lg animate-fade-in">
                          <label className="block text-[9px] font-bold uppercase text-amber-800 mb-1">Specify Work Location *</label>
                          <input
                            type="text"
                            value={legalCustomLocation}
                            onChange={e => setLegalCustomLocation(e.target.value)}
                            placeholder="Enter custom location details..."
                            className="w-full p-2 border border-amber-300 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:border-amber-600 bg-white"
                          />
                        </div>
                      )}

                      {/* Dynamic Conditional Fields based on Type */}

                      {/* Case 0: Type === "Call" -> Incoming / Outgoing selection + Bank, Branch & Officer selection */}
                      {legalInputType === "Call" && (
                        <div className="space-y-3 animate-fade-in pt-1">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[9px] font-black uppercase tracking-wider text-purple-800 mb-1">Call Direction / Mode *</label>
                              <select
                                value={legalInputSubType || "Incoming Call"}
                                onChange={e => setLegalInputSubType(e.target.value)}
                                className="w-full p-2 border border-purple-300 rounded-lg text-xs font-extrabold text-purple-900 bg-purple-50 focus:outline-none focus:border-purple-600 h-[38px]"
                              >
                                <option value="Incoming Call">Incoming Call 📥</option>
                                <option value="Outgoing Call">Outgoing Call 📤</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-[9px] font-bold uppercase text-slate-500 mb-1">Remarks / Call Note (Optional)</label>
                              <input
                                type="text"
                                value={legalInputRemarks}
                                onChange={e => setLegalInputRemarks(e.target.value)}
                                placeholder="Call details or summary..."
                                className="w-full p-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:border-purple-600 h-[38px]"
                              />
                            </div>
                          </div>

                          {/* Bank, Branch & Officer Selection */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 bg-purple-50/50 p-3 rounded-lg border border-purple-200">
                            {/* Bank Name - Searchable */}
                            <div>
                              <SearchableCombobox
                                label="Bank Name *"
                                value={legalInputBankName}
                                placeholder="Type or select Bank..."
                                options={banksList.map(b => b.bankName)}
                                onChange={val => {
                                  setLegalInputBankName(val);
                                  setLegalInputBranchName("");
                                  setLegalInputAoName("");
                                  setLegalInputRboName("");
                                }}
                              />
                            </div>
                            {/* Branch - Searchable */}
                            <div>
                              <SearchableCombobox
                                label="Branch *"
                                value={legalInputBranchName}
                                placeholder={legalInputBankName ? "Type or select Branch..." : "Select Bank First"}
                                disabled={!legalInputBankName}
                                options={(() => {
                                  const selectedBankObj = banksList.find(b => b.bankName?.toLowerCase().trim() === legalInputBankName?.toLowerCase().trim());
                                  const bankBranches = selectedBankObj
                                    ? branchesList.filter((br: any) => String(br.bankId) === String(selectedBankObj.id))
                                    : branchesList;
                                  return bankBranches.map((br: any) => br.branchName + (br.branchCode ? ` (${br.branchCode})` : ""));
                                })()}
                                onChange={val => {
                                  const cleanVal = val.split(" (")[0].trim();
                                  const selectedBankObj = banksList.find(b => b.bankName?.toLowerCase().trim() === legalInputBankName?.toLowerCase().trim());
                                  const bankBranches = selectedBankObj
                                    ? branchesList.filter((br: any) => String(br.bankId) === String(selectedBankObj.id))
                                    : branchesList;
                                  const brObj: any = bankBranches.find((b: any) => String(b.id) === val || b.branchName === cleanVal || b.branchName === val);
                                  if (brObj) {
                                    setLegalInputBranchName(brObj.branchName);
                                    if (brObj.aoName || brObj.ao) setLegalInputAoName(brObj.aoName || brObj.ao || "");
                                    if (brObj.rbo || brObj.rboName) setLegalInputRboName(brObj.rbo || brObj.rboName || "");
                                    if (brObj.branchManager || brObj.aoName || brObj.foName) setLegalInputOfficerName(brObj.branchManager || brObj.aoName || brObj.foName);
                                    if (brObj.branchManagerContact || brObj.foContact) setLegalInputOfficerPhone(brObj.branchManagerContact || brObj.foContact);
                                  } else {
                                    setLegalInputBranchName(val);
                                  }
                                }}
                              />
                            </div>
                            <div>
                              <label className="block text-[9px] font-bold uppercase text-slate-600 mb-1">Officer Name</label>
                              <input
                                type="text"
                                value={legalInputOfficerName}
                                onChange={e => setLegalInputOfficerName(e.target.value)}
                                placeholder="Officer name..."
                                className="w-full p-2 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 bg-white focus:outline-none focus:border-purple-600 h-[38px]"
                              />
                            </div>
                            <div>
                              <label className="block text-[9px] font-bold uppercase text-slate-600 mb-1">Officer Number</label>
                              <input
                                type="text"
                                value={legalInputOfficerPhone}
                                onChange={e => setLegalInputOfficerPhone(e.target.value)}
                                placeholder="Phone / contact..."
                                className="w-full p-2 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 bg-white focus:outline-none focus:border-purple-600 h-[38px]"
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Case 1: Type === "General" -> Remark option */}
                      {legalInputType === "General" && (
                        <div className="animate-fade-in pt-1">
                          <label className="block text-[9px] font-bold uppercase text-slate-500 mb-1">Remarks (Optional)</label>
                          <input
                            type="text"
                            value={legalInputRemarks}
                            onChange={e => setLegalInputRemarks(e.target.value)}
                            placeholder="General remarks or notes..."
                            className="w-full p-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:border-purple-600"
                          />
                        </div>
                      )}

                      {/* Case 2: Type === "Field Visit" -> Bank/Branch/Officer selection followed by Visit Details / Purpose */}
                      {legalInputType === "Field Visit" && (
                        <div className="space-y-3 animate-fade-in pt-1">
                          {/* Bank, Branch & Officer Selection */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 bg-purple-50/50 p-3 rounded-lg border border-purple-200">
                            {/* Bank Name - Searchable */}
                            <div>
                              <SearchableCombobox
                                label="Bank Name *"
                                value={legalInputBankName}
                                placeholder="Type or select Bank..."
                                options={banksList.map(b => b.bankName)}
                                onChange={val => {
                                  setLegalInputBankName(val);
                                  setLegalInputBranchName("");
                                  setLegalInputAoName("");
                                  setLegalInputRboName("");
                                }}
                              />
                            </div>
                            {/* Branch - Searchable */}
                            <div>
                              <SearchableCombobox
                                label="Branch *"
                                value={legalInputBranchName}
                                placeholder={legalInputBankName ? "Type or select Branch..." : "Select Bank First"}
                                disabled={!legalInputBankName}
                                options={(() => {
                                  const selectedBankObj = banksList.find(b => b.bankName?.toLowerCase().trim() === legalInputBankName?.toLowerCase().trim());
                                  const bankBranches = selectedBankObj
                                    ? branchesList.filter((br: any) => String(br.bankId) === String(selectedBankObj.id))
                                    : branchesList;
                                  return bankBranches.map((br: any) => br.branchName + (br.branchCode ? ` (${br.branchCode})` : ""));
                                })()}
                                onChange={val => {
                                  const cleanVal = val.split(" (")[0].trim();
                                  const selectedBankObj = banksList.find(b => b.bankName?.toLowerCase().trim() === legalInputBankName?.toLowerCase().trim());
                                  const bankBranches = selectedBankObj
                                    ? branchesList.filter((br: any) => String(br.bankId) === String(selectedBankObj.id))
                                    : branchesList;
                                  const brObj: any = bankBranches.find((b: any) => String(b.id) === val || b.branchName === cleanVal || b.branchName === val);
                                  if (brObj) {
                                    setLegalInputBranchName(brObj.branchName);
                                    if (brObj.aoName || brObj.ao) setLegalInputAoName(brObj.aoName || brObj.ao || "");
                                    if (brObj.rbo || brObj.rboName) setLegalInputRboName(brObj.rbo || brObj.rboName || "");
                                    if (brObj.branchManager || brObj.aoName || brObj.foName) setLegalInputOfficerName(brObj.branchManager || brObj.aoName || brObj.foName);
                                    if (brObj.branchManagerContact || brObj.foContact) setLegalInputOfficerPhone(brObj.branchManagerContact || brObj.foContact);
                                  } else {
                                    setLegalInputBranchName(val);
                                  }
                                }}
                              />
                            </div>
                            <div>
                              <label className="block text-[9px] font-bold uppercase text-slate-600 mb-1">Officer Name</label>
                              <input
                                type="text"
                                value={legalInputOfficerName}
                                onChange={e => setLegalInputOfficerName(e.target.value)}
                                placeholder="Officer name..."
                                className="w-full p-2 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 bg-white focus:outline-none focus:border-purple-600 h-[38px]"
                              />
                            </div>
                            <div>
                              <label className="block text-[9px] font-bold uppercase text-slate-600 mb-1">Officer Number</label>
                              <input
                                type="text"
                                value={legalInputOfficerPhone}
                                onChange={e => setLegalInputOfficerPhone(e.target.value)}
                                placeholder="Phone / contact..."
                                className="w-full p-2 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 bg-white focus:outline-none focus:border-purple-600 h-[38px]"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-[9px] font-bold uppercase text-slate-500 mb-1">Visit Details / Purpose *</label>
                            <input
                              type="text"
                              value={legalInputDetails}
                              onChange={e => setLegalInputDetails(e.target.value)}
                              placeholder="Field visit purpose or agenda..."
                              className="w-full p-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:border-purple-600 h-[38px]"
                            />
                          </div>
                        </div>
                      )}

                      {/* Case 3: Type === "Others" -> Input option */}
                      {legalInputType === "Others" && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 animate-fade-in pt-1">
                          <div>
                            <label className="block text-[9px] font-bold uppercase text-slate-500 mb-1">Specify Custom Type / Input *</label>
                            <input
                              type="text"
                              value={legalInputOtherType}
                              onChange={e => setLegalInputOtherType(e.target.value)}
                              placeholder="Specify custom type..."
                              className="w-full p-2 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:border-purple-600"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] font-bold uppercase text-slate-500 mb-1">Details (Optional)</label>
                            <input
                              type="text"
                              value={legalInputDetails}
                              onChange={e => setLegalInputDetails(e.target.value)}
                              placeholder="Additional details..."
                              className="w-full p-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:border-purple-600"
                            />
                          </div>
                        </div>
                      )}

                      {/* Case 4: Type === "Bank Related" -> Sub-Type selector + Dynamic Bank Fields */}
                      {legalInputType === "Bank Related" && (
                        <div className="space-y-3 animate-fade-in pt-1 border-t border-purple-100">
                          <div>
                            <label className="block text-[9px] font-black uppercase tracking-wider text-purple-800 mb-1">Select Bank Sub-Type *</label>
                            <select
                              value={legalInputSubType}
                              onChange={e => setLegalInputSubType(e.target.value)}
                              className="w-full md:w-1/2 p-2 border border-purple-300 rounded-lg text-xs font-extrabold text-purple-900 bg-purple-50 focus:outline-none focus:border-purple-600"
                            >
                              <option value="AO related">AO related</option>
                              <option value="RBO related">RBO related</option>
                              <option value="branch related">branch related</option>
                              <option value="case related">case related</option>
                            </select>
                          </div>

                          {/* Dynamic Bank Fields according to Sub-Type */}
                          {(() => {
                            const selectedBankObj = banksList.find(b => b.bankName?.toLowerCase().trim() === legalInputBankName?.toLowerCase().trim());
                            const bankBranches = selectedBankObj
                              ? branchesList.filter((br: any) => String(br.bankId) === String(selectedBankObj.id))
                              : branchesList;

                            const currentSelectedBranchObj = bankBranches.find((b: any) =>
                              String(b.id) === String(legalInputBranchName) || b.branchName === legalInputBranchName
                            );

                            let aoOptions: string[] = [];
                            let rboOptions: string[] = [];

                            if (currentSelectedBranchObj) {
                              const brAo = currentSelectedBranchObj.aoName || currentSelectedBranchObj.ao;
                              const brRbo = currentSelectedBranchObj.rbo || currentSelectedBranchObj.rboName;
                              aoOptions = brAo ? [brAo] : Array.from(new Set(bankBranches.map((br: any) => br.aoName || br.ao).filter(Boolean)));
                              rboOptions = brRbo ? [brRbo] : Array.from(new Set(bankBranches.map((br: any) => br.rbo || br.rboName).filter(Boolean)));
                            } else if (selectedBankObj) {
                              aoOptions = Array.from(new Set(bankBranches.map((br: any) => br.aoName || br.ao).filter(Boolean)));
                              rboOptions = Array.from(new Set(bankBranches.map((br: any) => br.rbo || br.rboName).filter(Boolean)));
                            } else {
                              aoOptions = Array.from(new Set(branchesList.map((br: any) => br.aoName || br.ao).filter(Boolean)));
                              rboOptions = Array.from(new Set(branchesList.map((br: any) => br.rbo || br.rboName).filter(Boolean)));
                            }

                            return (
                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 bg-purple-50/40 p-3 rounded-lg border border-purple-200">
                                {/* 1. Bank Input (from bank_masters) */}
                                <div>
                                  <SearchableCombobox
                                    label="Bank Name * (from bank_masters)"
                                    value={legalInputBankName}
                                    placeholder="Type or select Bank..."
                                    options={banksList.map(b => b.bankName)}
                                    onChange={val => {
                                      setLegalInputBankName(val);
                                      setLegalInputBranchName("");
                                      setLegalInputAoName("");
                                      setLegalInputRboName("");
                                    }}
                                  />
                                </div>

                                {/* 2. Branch Input (Right after Bank for branch related & case related) */}
                                {["branch related", "case related"].includes(legalInputSubType) && (
                                  <div>
                                    <SearchableCombobox
                                      label="Branch * (from branch_masters)"
                                      value={legalInputBranchName}
                                      placeholder={legalInputBankName ? "Type or select Branch..." : "Select Bank First"}
                                      disabled={!legalInputBankName}
                                      options={bankBranches.map((br: any) => br.branchName + (br.branchCode ? ` (${br.branchCode})` : ""))}
                                      onChange={val => {
                                        const cleanVal = val.split(" (")[0].trim();
                                        const brObj = bankBranches.find((b: any) => String(b.id) === val || b.branchName === cleanVal || b.branchName === val);
                                        if (brObj) {
                                          setLegalInputBranchName(brObj.branchName);
                                          if (brObj.aoName || brObj.ao) setLegalInputAoName(brObj.aoName || brObj.ao || "");
                                          if (brObj.rbo || brObj.rboName) setLegalInputRboName(brObj.rbo || brObj.rboName || "");
                                        } else {
                                          setLegalInputBranchName(val);
                                        }
                                      }}
                                    />
                                  </div>
                                )}

                                {/* 3. AO Input - Filtered for Selected Bank/Branch */}
                                <SearchableCombobox
                                  label="AO (Administrative Office) *"
                                  value={legalInputAoName}
                                  onChange={val => {
                                    setLegalInputAoName(val);
                                    if (val) {
                                      const match = bankBranches.find((br: any) =>
                                        (br.aoName && br.aoName.toLowerCase().trim() === val.toLowerCase().trim()) ||
                                        (br.ao && br.ao.toLowerCase().trim() === val.toLowerCase().trim())
                                      );
                                      if (match) {
                                        if (match.rbo || match.rboName) setLegalInputRboName(match.rbo || match.rboName || "");
                                        if (match.branchName && !legalInputBranchName) setLegalInputBranchName(match.branchName);
                                      }
                                    }
                                  }}
                                  options={aoOptions}
                                  placeholder="Type or select AO..."
                                />

                                {/* 4. RBO Input - Filtered for Selected Bank/Branch */}
                                {["RBO related", "branch related", "case related"].includes(legalInputSubType) && (
                                  <SearchableCombobox
                                    label="RBO (Regional Office) *"
                                    value={legalInputRboName}
                                    onChange={val => {
                                      setLegalInputRboName(val);
                                      if (val) {
                                        const match = bankBranches.find((br: any) =>
                                          (br.rboName && br.rboName.toLowerCase().trim() === val.toLowerCase().trim()) ||
                                          (br.rbo && br.rbo.toLowerCase().trim() === val.toLowerCase().trim())
                                        );
                                        if (match) {
                                          if (match.aoName || match.ao) setLegalInputAoName(match.aoName || match.ao || "");
                                          if (match.branchName && !legalInputBranchName) setLegalInputBranchName(match.branchName);
                                        }
                                      }
                                    }}
                                    options={rboOptions}
                                    placeholder="Type or select RBO..."
                                  />
                                )}

                                {/* 5. Case Input (Required ONLY for Case related) */}
                                {legalInputSubType === "case related" && (
                                  <div>
                                    <label className="block text-[9px] font-bold uppercase text-slate-600 mb-1">Case Details / No. *</label>
                                    <input
                                      type="text"
                                      value={legalInputCaseDetails}
                                      onChange={e => setLegalInputCaseDetails(e.target.value)}
                                      placeholder="Enter case details..."
                                      className="w-full p-2 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 bg-white focus:outline-none focus:border-purple-600 h-[38px]"
                                    />
                                  </div>
                                )}

                                {/* 6. Details Input (For ALL Bank sub-types) */}
                                <div className="sm:col-span-2 md:col-span-3">
                                  <label className="block text-[9px] font-bold uppercase text-slate-600 mb-1">Details / Remarks *</label>
                                  <input
                                    type="text"
                                    value={legalInputDetails}
                                    onChange={e => setLegalInputDetails(e.target.value)}
                                    placeholder="Enter specific work details..."
                                    className="w-full p-2 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 bg-white focus:outline-none focus:border-purple-600 h-[38px]"
                                  />
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      )}

                      {/* Case 5: Type === "NBFC" -> Searchable NBFC Name & Branch (from nbfc_masters & nbfc_branches) */}
                      {legalInputType === "NBFC" && (
                        <div className="space-y-3 animate-fade-in pt-1 border-t border-purple-100">
                          {(() => {
                            const selectedNbfcObj = nbfcsList.find(n => (n.nbfcName || (n as any).name || "").toLowerCase().trim() === legalInputBankName?.toLowerCase().trim());
                            const filteredNbfcBranches = selectedNbfcObj
                              ? nbfcBranchesList.filter((br: any) =>
                                String(br.nbfcId) === String(selectedNbfcObj.id) ||
                                (br.nbfcName && br.nbfcName.toLowerCase().trim() === selectedNbfcObj.nbfcName?.toLowerCase().trim())
                              )
                              : nbfcBranchesList;
                            const availableNbfcBranches = filteredNbfcBranches.length > 0 ? filteredNbfcBranches : nbfcBranchesList;

                            const nbfcOptions = Array.from(new Set(nbfcsList.map(n => n.nbfcName || (n as any).name).filter(Boolean)));
                            const nbfcBranchOptions = Array.from(new Set(availableNbfcBranches.map(br => br.branchName).filter(Boolean)));

                            return (
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                {/* NBFC Name Input - Searchable Combobox (from nbfc_masters) */}
                                <div>
                                  <SearchableCombobox
                                    label="NBFC Name * (from nbfc_masters)"
                                    value={legalInputBankName}
                                    onChange={val => {
                                      setLegalInputBankName(val);
                                      setLegalInputBranchName("");
                                    }}
                                    options={nbfcOptions}
                                    placeholder="Type or select NBFC..."
                                  />
                                </div>

                                {/* NBFC Branch Input - Searchable Combobox (from nbfc_branches) */}
                                <div>
                                  <SearchableCombobox
                                    label="NBFC Branch * (from nbfc_branches)"
                                    value={legalInputBranchName}
                                    onChange={setLegalInputBranchName}
                                    options={nbfcBranchOptions}
                                    placeholder="Type or select NBFC Branch..."
                                  />
                                </div>

                                {/* Details / Remarks Input */}
                                <div>
                                  <label className="block text-[9px] font-bold uppercase text-slate-600 mb-1">Details / Remarks *</label>
                                  <input
                                    type="text"
                                    value={legalInputDetails}
                                    onChange={e => setLegalInputDetails(e.target.value)}
                                    placeholder="Enter specific NBFC work details..."
                                    className="w-full p-2 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 bg-white focus:outline-none focus:border-purple-600 h-[38px]"
                                  />
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      )}

                      <div className="flex justify-end pt-1">
                        <button
                          type="button"
                          onClick={handleAddLegalScheduleItem}
                          className="bg-purple-700 hover:bg-purple-800 text-white text-xs font-extrabold px-4 py-2.5 rounded-lg transition-all flex items-center gap-1.5 shadow-md shadow-purple-700/20"
                        >
                          <Plus className="w-4 h-4" /> Save & Schedule More Task
                        </button>
                      </div>
                    </div>

                    {/* Multi-Day & Multi-Task Schedule Table View */}
                    {legalScheduleItems.length > 0 ? (
                      <div className="space-y-2">
                        <div className="flex justify-between items-center px-1">
                          <span className="text-[11px] font-black uppercase text-purple-900 font-mono flex items-center gap-1">
                            📅 Multi Task-Day Schedule ({legalScheduleItems.length} Entries across {[...new Set(legalScheduleItems.map(i => i.date))].length} Days)
                          </span>
                          <span className="text-[10px] text-purple-700 font-bold bg-purple-100 px-2 py-0.5 rounded">
                            You can add more entries for any date before submitting
                          </span>
                        </div>
                        <div className="overflow-x-auto border border-purple-200 rounded-xl bg-white shadow-xs max-h-64 overflow-y-auto">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead className="sticky top-0 z-10 bg-purple-100 shadow-2xs">
                              <tr className="bg-purple-100 text-purple-950 text-[10px] uppercase font-mono font-black border-b border-purple-200">
                                <th className="py-2.5 px-3">#</th>
                                <th className="py-2.5 px-3">Date</th>
                                <th className="py-2.5 px-3">Time</th>
                                <th className="py-2.5 px-3">Work Location</th>
                                <th className="py-2.5 px-3">Type</th>
                                <th className="py-2.5 px-3">Sub-Type / Entry Details</th>
                                <th className="py-2.5 px-3 text-right">Action</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-purple-100 text-slate-800 font-semibold">
                              {legalScheduleItems.map((item, idx) => (
                                <tr key={idx} className="hover:bg-purple-50/40">
                                  <td className="py-2.5 px-3 font-mono font-bold text-slate-400">{idx + 1}</td>
                                  <td className="py-2.5 px-3 font-mono text-purple-900 font-extrabold">
                                    <span className="bg-purple-50 border border-purple-200 px-2 py-0.5 rounded font-mono text-[11px]">
                                      📅 {item.date}
                                    </span>
                                  </td>
                                  <td className="py-2.5 px-3 font-bold text-slate-900">
                                    {(item.workSection === "Others" || item.workSection === "Other" || item.workSection === "others")
                                      ? (item.customLocation || item.otherType || item.details || item.remarks || item.workSection)
                                      : item.workSection}
                                  </td>
                                  <td className="py-2.5 px-3 whitespace-nowrap">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${item.type === "Bank Related" ? "bg-purple-100 text-purple-800 border border-purple-200" : item.type === "Others" ? "bg-amber-100 text-amber-800 border border-amber-200" : "bg-blue-100 text-blue-800 border border-blue-200"
                                      }`}>
                                      {item.type === "Others" && item.otherType ? `Others (${item.otherType})` : item.type}
                                    </span>
                                  </td>
                                  <td className="py-2.5 px-3 max-w-[320px]">
                                    {item.type === "General" ? (
                                      <span className="text-[11px] text-slate-600 italic">{item.remarks || "General work"}</span>
                                    ) : item.type === "Others" ? (
                                      <span className="text-[11px] text-slate-700 font-medium">{item.details || item.remarks || "—"}</span>
                                    ) : (
                                      <div className="space-y-0.5 text-[10px]">
                                        {item.subType && (
                                          <div className="font-bold text-purple-900">
                                            Sub-Type: <span className="bg-purple-200/70 px-1.5 py-0.5 rounded font-black">{item.subType}</span>
                                          </div>
                                        )}
                                        <div className="text-slate-700 flex flex-wrap gap-1 font-semibold">
                                          {item.bankName && <span className="bg-slate-100 px-1 py-0.5 rounded border border-slate-200">🏦 {item.bankName}</span>}
                                          {item.aoName && <span className="bg-slate-100 px-1 py-0.5 rounded border border-slate-200">🏛️ AO: {item.aoName}</span>}
                                          {item.rboName && <span className="bg-slate-100 px-1 py-0.5 rounded border border-slate-200">📍 RBO: {item.rboName}</span>}
                                          {item.branchName && <span className="bg-slate-100 px-1 py-0.5 rounded border border-slate-200">🏢 Branch: {item.branchName}</span>}
                                          {item.officerName && <span className="bg-slate-100 px-1 py-0.5 rounded border border-slate-200">👤 Officer: {item.officerName}{item.officerPhone ? ` (${item.officerPhone})` : ""}</span>}
                                          {item.caseDetails && <span className="bg-rose-50 text-rose-800 px-1 py-0.5 rounded border border-rose-200 font-bold">⚖️ Case: {item.caseDetails}</span>}
                                        </div>
                                        {item.details && <div className="text-slate-600 font-medium text-[9px] pt-0.5">Details: "{item.details}"</div>}
                                      </div>
                                    )}
                                  </td>
                                  <td className="py-2.5 px-3 text-right">
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteLegalScheduleItem(idx)}
                                      className="text-rose-500 hover:text-rose-700 p-1 hover:bg-rose-50 rounded transition-all"
                                      title="Delete Entry"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-4 text-xs font-semibold text-purple-700 bg-white border border-purple-100 rounded-lg">
                        ⚠️ Please add at least 1 schedule entry to your table before submitting SOD.
                      </div>
                    )}
                  </div>
                )}

                {/* Generic Task Title & Mode fields (Hidden for Legal Recovery mode) */}
                {!isLegalRecovery && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                    {/* Task Title (Master Category Dropdown synced with Tasks) */}
                    <div className="md:col-span-2">
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-[10px] uppercase font-black text-slate-700 font-mono tracking-wider">
                          Task Title / Category *
                        </label>
                        <button
                          type="button"
                          onClick={() => setShowAddSodTitleInput(!showAddSodTitleInput)}
                          className="text-[10px] font-bold text-indigo-600 hover:underline flex items-center gap-0.5"
                        >
                          <Plus className="w-3 h-3" /> Add Master Title
                        </button>
                      </div>
                      <select
                        className="w-full bg-white border border-slate-300 rounded p-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-[#714B67]"
                        value={sodTaskTitle}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === "ADD_NEW_TITLE") {
                            setShowAddSodTitleInput(true);
                          } else {
                            setShowAddSodTitleInput(false);
                            setSodTaskTitle(val);
                          }
                        }}
                        required
                      >
                        <option value="">-- Select Task Title --</option>
                        {sodCategories.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                        <option value="ADD_NEW_TITLE" className="font-bold text-[#714B67] bg-purple-50">
                          ➕ Add New Master Option...
                        </option>
                      </select>

                      {showAddSodTitleInput && (
                        <div className="mt-2 p-2.5 bg-purple-50 border border-purple-200 rounded-lg space-y-2 animate-fade-in">
                          <label className="block text-[9px] uppercase tracking-wider text-purple-700 font-black">
                            Add New Category / Title (Stored in Master DB) *
                          </label>
                          <div className="flex gap-1.5">
                            <input
                              type="text"
                              className="flex-1 bg-white border border-purple-300 rounded p-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-[#714B67]"
                              placeholder="Enter new task title/category..."
                              value={newSodTitleText}
                              onChange={(e) => setNewSodTitleText(e.target.value)}
                            />
                            <button
                              type="button"
                              onClick={handleAddSodTitle}
                              className="bg-[#714B67] hover:bg-[#5F3F56] text-white px-3 py-1.5 rounded text-xs font-bold transition-all"
                            >
                              Save Title
                            </button>
                          </div>
                        </div>
                      )}
                    </div>



                    {/* Task Type / Mode (Master Mode Dropdown synced with Tasks) */}
                    <div className="md:col-span-2">
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-[10px] uppercase font-black text-slate-700 font-mono tracking-wider">
                          Task Type / Mode *
                        </label>
                        <button
                          type="button"
                          onClick={() => setShowAddSodModeInput(!showAddSodModeInput)}
                          className="text-[10px] font-bold text-indigo-600 hover:underline flex items-center gap-0.5"
                        >
                          <Plus className="w-3 h-3" /> Add Master Mode
                        </button>
                      </div>
                      <select
                        className="w-full bg-white border border-slate-300 rounded p-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-[#714B67]"
                        value={taskType}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === "ADD_NEW_MODE") {
                            setShowAddSodModeInput(true);
                          } else {
                            setShowAddSodModeInput(false);
                            setTaskType(val);
                          }
                        }}
                        required
                      >
                        <option value="">-- Select Task Mode --</option>
                        {sodTaskModes.map((mode) => (
                          <option key={mode} value={mode}>
                            {mode}
                          </option>
                        ))}
                        <option value="ADD_NEW_MODE" className="font-bold text-[#714B67] bg-purple-50">
                          ➕ Add New Mode Option...
                        </option>
                      </select>

                      {showAddSodModeInput && (
                        <div className="mt-2 p-2.5 bg-purple-50 border border-purple-200 rounded-lg space-y-2 animate-fade-in">
                          <label className="block text-[9px] uppercase tracking-wider text-purple-700 font-black">
                            Add New Task Mode (Stored in Master DB) *
                          </label>
                          <div className="flex gap-1.5">
                            <input
                              type="text"
                              className="flex-1 bg-white border border-purple-300 rounded p-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-[#714B67]"
                              placeholder="Enter new task mode (e.g. Field Visit)..."
                              value={newSodModeText}
                              onChange={(e) => setNewSodModeText(e.target.value)}
                            />
                            <button
                              type="button"
                              onClick={handleAddSodMode}
                              className="bg-[#714B67] hover:bg-[#5F3F56] text-white px-3 py-1.5 rounded text-xs font-bold transition-all"
                            >
                              Save Mode
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Sub-Fields (For Bank or Notice) */}
                    {(sodTaskTitle === "Bank" || sodTaskTitle === "Notice") && (
                      <div className="md:col-span-2 space-y-3 bg-emerald-50/80 border border-emerald-200 rounded-xl p-3 text-slate-800 animate-fade-in">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {/* Select Bank */}
                          <div>
                            <label className="block text-[9px] uppercase tracking-wider text-emerald-800 font-black mb-1">
                              Select Bank *
                            </label>
                            <select
                              required
                              value={selectedBankId}
                              onChange={(e) => {
                                const bid = e.target.value;
                                const bObj = banksList.find((b) => String(b.id) === bid);
                                setSelectedBankId(bid);
                                setSodBankName(bObj?.bankName || "");
                                setSodBranchName("");
                              }}
                              className="w-full border border-emerald-200 rounded-lg p-2 text-xs font-bold focus:outline-none focus:border-emerald-500 text-slate-800 bg-white"
                            >
                              <option value="">-- Select Bank --</option>
                              {banksList.map((b) => (
                                <option key={String(b.id)} value={String(b.id)}>
                                  {b.bankName}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Select Branch */}
                          <div>
                            <label className="block text-[9px] uppercase tracking-wider text-emerald-800 font-black mb-1">
                              Select Branch *
                            </label>
                            <select
                              required
                              value={sodBranchName}
                              onChange={(e) => setSodBranchName(e.target.value)}
                              disabled={!selectedBankId}
                              className="w-full border border-emerald-200 rounded-lg p-2 text-xs font-bold focus:outline-none focus:border-emerald-500 text-slate-800 bg-white disabled:opacity-50"
                            >
                              <option value="">{selectedBankId ? "-- Select Branch --" : "Select a bank first"}</option>
                              {branchesList
                                .filter((br: any) => !br.nbfcId || String(br.nbfcId) === String(selectedBankId))
                                .map((br: any) => (
                                  <option key={String(br.id)} value={br.branchName}>
                                    {br.branchName}
                                  </option>
                                ))}
                            </select>
                          </div>
                        </div>

                        {/* Officer Name & Phone ONLY for Bank */}
                        {sodTaskTitle === "Bank" && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 animate-fade-in">
                            <div>
                              <label className="block text-[9px] uppercase tracking-wider text-emerald-800 font-black mb-1">
                                Officer Name *
                              </label>
                              <input
                                type="text"
                                required
                                placeholder="e.g. Ramesh Sharma"
                                value={sodOfficerName}
                                onChange={(e) => setSodOfficerName(e.target.value)}
                                className="w-full border border-emerald-200 rounded-lg p-2 text-xs font-bold focus:outline-none focus:border-emerald-500 placeholder-slate-400 text-slate-800 bg-white"
                              />
                            </div>
                            <div>
                              <label className="block text-[9px] uppercase tracking-wider text-emerald-800 font-black mb-1">
                                Officer Phone *
                              </label>
                              <input
                                type="tel"
                                required
                                placeholder="e.g. 9876543210"
                                value={sodOfficerPhone}
                                onChange={(e) => setSodOfficerPhone(e.target.value)}
                                className="w-full border border-emerald-200 rounded-lg p-2 text-xs font-bold focus:outline-none focus:border-emerald-500 placeholder-slate-400 text-slate-800 bg-white"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {taskType === "Other" && (
                      <div className="md:col-span-2">
                        <label className="text-[10px] uppercase font-black text-slate-500 font-mono tracking-wider">Specify Task Type *</label>
                        <input className="w-full bg-white border border-slate-300 rounded p-2 text-xs font-bold text-slate-900 mt-1.5 focus:outline-none focus:border-[#714B67]" placeholder="Please specify task type..." value={customTaskType} onChange={e => setCustomTaskType(e.target.value)} required />
                      </div>
                    )}
                    {(sodTaskTitle === "IT" || taskType === "Development") && (
                      <div className="md:col-span-2 space-y-1.5">
                        <div className="flex justify-between items-center">
                          <label className="text-[10px] uppercase font-black text-slate-700 font-mono tracking-wider">Project Name *</label>
                          <button
                            type="button"
                            onClick={() => setShowAddProjectInput(!showAddProjectInput)}
                            className="text-[10px] font-bold text-indigo-600 hover:underline flex items-center gap-0.5"
                          >
                            <Plus className="w-3 h-3" /> Add Master Project
                          </button>
                        </div>
                        <select
                          required
                          className="w-full bg-white border border-slate-300 rounded p-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-[#714B67]"
                          value={projectName}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === "ADD_NEW_PROJECT") {
                              setShowAddProjectInput(true);
                            } else {
                              setShowAddProjectInput(false);
                              setProjectName(val);
                            }
                          }}
                        >
                          <option value="">-- Select Project Name --</option>
                          {sodProjects.map((p) => (
                            <option key={p} value={p}>{p}</option>
                          ))}
                          <option value="ADD_NEW_PROJECT" className="font-bold text-indigo-700 bg-indigo-50">
                            ➕ Add New Project...
                          </option>
                        </select>

                        {showAddProjectInput && (
                          <div className="p-2.5 bg-indigo-50 border border-indigo-200 rounded-lg space-y-2 animate-fade-in mt-2">
                            <label className="block text-[9px] uppercase tracking-wider text-indigo-700 font-black">
                              Add New Project (Stored in Master DB) *
                            </label>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                className="flex-1 bg-white border border-indigo-300 rounded p-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-600"
                                placeholder="Enter new project name (e.g. HRMS, RRR)..."
                                value={newProjectText}
                                onChange={(e) => setNewProjectText(e.target.value)}
                              />
                              <button
                                type="button"
                                onClick={handleAddSodProject}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded text-xs font-bold transition-all"
                              >
                                Save Project
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    <div className="md:col-span-2">
                      <label className="text-[10px] uppercase font-black text-slate-500 font-mono tracking-wider">Remarks (Optional)</label>
                      <textarea className="w-full bg-white border border-slate-300 rounded p-2 text-xs font-bold text-slate-900 mt-1.5 focus:outline-none focus:border-[#714B67]" rows={2} value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Any special notes..." />
                    </div>
                  </div>
                )}

                <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 text-[10px] font-bold text-rose-700 flex items-start gap-2 mt-4">
                  <MapPin className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                  <span><strong>Verification Required:</strong> You will need to take a live selfie to submit your SOD.</span>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-100 flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      if (isLegalRecovery && legalScheduleItems.length === 0) {
                        alert("⚠️ Please add at least 1 schedule entry to your table before submitting SOD.");
                        return;
                      }
                      setShowCamera(true);
                    }}
                    className="bg-indigo-600 hover:bg-indigo-700 w-full px-4 py-3 rounded-lg text-xs font-black text-white transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20"
                  >
                    <Camera className="w-4 h-4" /> Start Verification & Submit
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center space-y-4">
                <h4 className="text-xs font-black text-slate-700">Live Selfie Verification</h4>
                {cameraError ? (
                  <div className="bg-rose-50 p-4 rounded-lg text-rose-600 text-xs font-bold text-center border border-rose-200">
                    ⚠️ {cameraError} <br /><br />
                    <div className="text-left space-y-2 mb-4 font-normal text-slate-600">
                      <p><strong>How to allow camera access:</strong></p>
                      <ol className="list-decimal pl-4 space-y-1 text-[11px]">
                        <li>Click the <strong>camera / settings icon</strong> in the browser's address bar.</li>
                        <li>Set camera access to <strong>"Allow"</strong> and reload the page.</li>
                      </ol>
                      <p className="text-[10px] text-rose-500 mt-2 font-semibold">
                        Note: Local IP addresses (e.g. <code>http://192.168.1.46:3000</code>) are blocked by browser security guidelines (Insecure Origin). To test, please use <code>http://localhost:3000</code> or run a secure HTTPS tunnel (e.g., using Ngrok).
                      </p>
                    </div>
                    <div className="flex gap-2 justify-center">
                      <button onClick={() => setShowCamera(false)} className="bg-white px-4 py-2 rounded border border-rose-200 text-slate-700 font-bold">Go Back</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="relative rounded-2xl overflow-hidden border-4 border-[#714B67] shadow-xl w-64 h-64 bg-slate-900">
                      <video ref={videoRef} autoPlay playsInline muted className="object-cover w-full h-full" />
                      <canvas ref={canvasRef} className="hidden" />
                      {submittingSOD && (
                        <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm flex flex-col items-center justify-center p-4 text-center">
                          <Loader2 className="w-8 h-8 text-white animate-spin mb-3" />
                          <span className="text-white text-[10px] font-black font-mono tracking-widest uppercase">{locationStatus}</span>
                        </div>
                      )}
                    </div>

                    {!submittingSOD && (
                      <div className="flex gap-3 w-full max-w-[16rem]">
                        <button onClick={() => setShowCamera(false)} className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-700 py-3 rounded-xl text-xs font-bold transition-all">Cancel</button>
                        <button onClick={captureSodPhotoAndSubmit} className="flex-1 bg-[#714B67] hover:bg-[#5F3F56] text-white py-3 rounded-xl text-xs font-black shadow-lg shadow-[#714B67]/20 flex items-center justify-center gap-2">
                          <Camera className="w-4 h-4" /> Click & Submit
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* EOD Form with Strict Verification */}
        {(formMode === "both" || formMode === "eod") && (
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col">
            <h3 className="text-xs font-black tracking-widest text-[#714B67] uppercase font-mono pb-2 border-b border-slate-100 mb-4 flex items-center justify-between">
              <span>📝 EOD</span>
              {eodAlreadySubmitted && (
                <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[9px] font-mono font-bold px-2 py-0.5 rounded-full">
                  ALREADY FILED
                </span>
              )}
            </h3>

            {eodAlreadySubmitted ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-3 bg-emerald-50/20 border border-dashed border-emerald-200 rounded-xl min-h-[300px]">
                <div className="bg-emerald-100 p-3 rounded-full text-emerald-600">
                  <CalendarCheck className="w-8 h-8" />
                </div>
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wide">EOD Log Submitted</h4>
                <p className="text-[10px] text-slate-500 font-medium max-w-xs leading-relaxed">
                  Your End of Day outcomes and pending targets have been registered. Good job finishing up today's work!
                </p>
              </div>
            ) : !showEodCamera ? (
              <div className="space-y-4 font-semibold text-slate-650 flex-1">

                {/* Profile Bar */}
                <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 flex justify-between items-center mb-2">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-emerald-500" />
                    <span className="text-xs font-black text-slate-800 uppercase tracking-wide">{sessionUser?.name || "Employee"}</span>
                  </div>
                  <div className="flex items-center gap-1 bg-white border border-slate-200 px-2 py-1 rounded">
                    <Hash className="w-3 h-3 text-slate-400" />
                    <span className="text-[10px] font-mono text-slate-500 font-bold">{sessionUser?.id ? sessionUser.id.substring(0, 8).toUpperCase() : "USR-101"}</span>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] uppercase font-black text-slate-500 font-mono tracking-wider">1. Completed Work *</label>
                  <input className="w-full bg-white border border-slate-300 rounded p-2 text-xs font-bold text-slate-900 mt-1.5 focus:outline-none focus:border-[#714B67]" value={eodCompleted} onChange={e => setEodCompleted(e.target.value)} placeholder="What was fully finished..." required />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-black text-slate-500 font-mono tracking-wider">2. Pending Work *</label>
                  <input className="w-full bg-white border border-slate-300 rounded p-2 text-xs font-bold text-slate-900 mt-1.5 focus:outline-none focus:border-[#714B67]" value={eodPending} onChange={e => setEodPending(e.target.value)} placeholder="Incomplete targets..." required />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] uppercase font-black text-slate-500 font-mono tracking-wider">3. Issues Faced</label>
                    <input className="w-full bg-white border border-slate-300 rounded p-2 text-xs font-bold text-slate-900 mt-1.5 focus:outline-none focus:border-[#714B67]" value={eodIssues} onChange={e => setEodIssues(e.target.value)} placeholder="Any blocker issues..." />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-black text-slate-500 font-mono tracking-wider">4. Escalation Required?</label>
                    <select className="w-full bg-white border border-slate-300 rounded p-2.5 text-xs font-bold text-slate-700 mt-1.5 focus:outline-none focus:border-[#714B67]" value={eodEscalation} onChange={e => setEodEscalation(e.target.value)}>
                      <option>No</option>
                      <option>Yes - Urgent</option>
                      <option>Yes - Normal</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] uppercase font-black text-slate-500 font-mono tracking-wider">5. Tomorrow Plan *</label>
                  <input className="w-full bg-white border border-slate-300 rounded p-2 text-xs font-bold text-slate-900 mt-1.5 focus:outline-none focus:border-[#714B67]" value={eodTomorrowPlan} onChange={e => setEodTomorrowPlan(e.target.value)} placeholder="Work plan for tomorrow..." required />
                </div>

                <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 text-[10px] font-bold text-rose-700 flex items-start gap-2 mt-4">
                  <MapPin className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                  <span><strong>Verification Required:</strong> You will need to take a live selfie and allow GPS tracking to submit your EOD.</span>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-100 flex justify-end">
                  <button type="button" onClick={() => setShowEodCamera(true)} className="bg-emerald-600 hover:bg-emerald-700 w-full px-4 py-3 rounded-lg text-xs font-black text-white transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20">
                    <Camera className="w-4 h-4" /> Start EOD Verification
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center space-y-4">
                <h4 className="text-xs font-black text-slate-700">Live Selfie & GPS Tracking (EOD)</h4>
                {eodCameraError ? (
                  <div className="bg-rose-50 p-4 rounded-lg text-rose-600 text-xs font-bold text-center border border-rose-200">
                    ⚠️ {eodCameraError} <br /><br />
                    <div className="text-left space-y-2 mb-4 font-normal text-slate-660">
                      <p><strong>How to allow camera access:</strong></p>
                      <ol className="list-decimal pl-4 space-y-1 text-[11px]">
                        <li>Click the <strong>camera / settings icon</strong> in the browser's address bar.</li>
                        <li>Set camera access to <strong>"Allow"</strong> and reload the page.</li>
                      </ol>
                      <p className="text-[10px] text-rose-500 mt-2 font-semibold">
                        Note: Local IP addresses (e.g. <code>http://192.168.1.46:3000</code>) are blocked by browser security guidelines (Insecure Origin). To test, please use <code>http://localhost:3000</code> or run a secure HTTPS tunnel (e.g., using Ngrok).
                      </p>
                    </div>
                    <div className="flex gap-2 justify-center">
                      <button onClick={() => setShowEodCamera(false)} className="bg-white px-4 py-2 rounded border border-rose-200 text-slate-700 font-bold">Go Back</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="relative rounded-2xl overflow-hidden border-4 border-emerald-600 shadow-xl w-64 h-64 bg-slate-900">
                      <video ref={eodVideoRef} autoPlay playsInline muted className="object-cover w-full h-full" />
                      <canvas ref={eodCanvasRef} className="hidden" />
                      {submittingEOD && (
                        <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm flex flex-col items-center justify-center p-4 text-center">
                          <Loader2 className="w-8 h-8 text-white animate-spin mb-3" />
                          <span className="text-white text-[10px] font-black font-mono tracking-widest uppercase">{eodLocationStatus}</span>
                        </div>
                      )}
                    </div>

                    {!submittingEOD && (
                      <div className="flex gap-3 w-full max-w-[16rem]">
                        <button onClick={() => setShowEodCamera(false)} className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-700 py-3 rounded-xl text-xs font-bold transition-all">Cancel</button>
                        <button onClick={captureEodPhotoAndSubmit} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl text-xs font-black shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2">
                          <Camera className="w-4 h-4" /> Click & Submit EOD
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Calendar Modal */}
      {showCalendarModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4 text-slate-800">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6 relative flex flex-col">

            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <div>
                <h3 className="text-sm font-black text-slate-800 tracking-wide uppercase font-mono flex items-center gap-2">
                  <span>📅 Employee Attendance Registry Calendar</span>
                </h3>
              </div>
              <button
                onClick={() => setShowCalendarModal(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Filter Bar */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-50 border border-slate-150 rounded-xl p-4 mb-4">
              <div>
                <label className="text-[9px] uppercase font-black text-slate-500 font-mono tracking-wider">Filter Company</label>
                <select
                  className="w-full bg-white border border-slate-300 rounded p-1.5 text-xs font-bold text-slate-900 mt-1 focus:outline-none focus:border-[#714B67]"
                  value={selectedCompany}
                  onChange={(e) => handleCompanyChange(e.target.value)}
                  disabled={!isOwner || displayCompanies.length <= 1}
                >
                  <option value="">Select Company</option>
                  {displayCompanies.map((c: any) => (
                    <option key={c.id || c.id} value={c.id || c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[9px] uppercase font-black text-slate-500 font-mono tracking-wider">Filter Employee</label>
                <select
                  className="w-full bg-white border border-slate-300 rounded p-1.5 text-xs font-bold text-slate-900 mt-1 focus:outline-none focus:border-[#714B67]"
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                  disabled={!isOwner || displayUsers.length <= 1}
                >
                  <option value="">Select Employee</option>
                  <optgroup label="Active Employees">
                    {activeDisplayUsers.map((u: any) => (
                      <option key={u.id || u.id} value={u.id || u.id}>
                        {u.name} ({u.role || "Employee"})
                      </option>
                    ))}
                  </optgroup>
                  {inactiveDisplayUsers.length > 0 && (
                    <optgroup label="--- Inactive / Archived Staff ---">
                      {inactiveDisplayUsers.map((u: any) => (
                        <option key={u.id || u.id} value={u.id || u.id}>
                          {u.name} ({u.role || "Employee"}) (Archived / Inactive)
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </div>

              <div className="flex items-end md:col-span-2">
                {/* <button 
                  className="bg-[#714B67] hover:bg-[#5F3F56] w-full py-2 rounded-lg text-xs font-bold text-white transition-all flex items-center justify-center gap-1.5 shadow" 
                  onClick={async () => {
                    await handleAttendancePunch();
                    if (selectedUser) {
                      fetchUserCalendarData(selectedUser);
                    }
                  }}
                >
                  <CalendarCheck className="w-4 h-4" /> Punch Today's Attendance Check-in/out
                </button> */}
              </div>
            </div>

            {/* Calendar View */}
            <div className="flex-1 flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={handlePrevMonth}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-800 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                >
                  ← Previous
                </button>
                <span className="text-sm font-black text-slate-800 font-mono">
                  {monthsList[calendarMonth]} {calendarYear}
                </span>
                <button
                  onClick={handleNextMonth}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-800 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                >
                  Next →
                </button>
              </div>

              {loadingCalendar ? (
                <div className="h-64 flex flex-col items-center justify-center">
                  <Loader2 className="w-8 h-8 text-[#714B67] animate-spin mb-2" />
                  <span className="text-xs font-semibold text-slate-500">Loading attendance calendar...</span>
                </div>
              ) : (
                <>
                  {/* Weekday headers */}
                  <div className="grid grid-cols-7 gap-2 mb-2 text-center">
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day, idx) => (
                      <div
                        key={day}
                        className={`text-[9px] uppercase font-black font-mono tracking-wider py-1 rounded ${idx === 0 ? "text-rose-500 bg-rose-50" : "text-slate-500 bg-slate-50"
                          }`}
                      >
                        {day}
                      </div>
                    ))}
                  </div>

                  {/* Month grid */}
                  <div className="grid grid-cols-7 gap-2">
                    {renderCalendarDays()}
                  </div>
                </>
              )}
            </div>

            {/* Legend */}
            <div className="mt-6 border-t border-slate-100 pt-4 flex flex-wrap gap-4 items-center justify-between text-[10px] font-bold text-slate-500">
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-emerald-100 border border-emerald-300 block"></span>
                  <span>Present</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-rose-100 border border-rose-300 block"></span>
                  <span>Absent</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-amber-100 border border-amber-300 block"></span>
                  <span>Leave</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-slate-100 border border-slate-300 block"></span>
                  <span>Weekly Off (Sunday)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-rose-600 border border-rose-700 block"></span>
                  <span>Absent Fine (Imposed)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-indigo-50 border border-indigo-300 block"></span>
                  <span>Pending (Today)</span>
                </div>
              </div>
              <div className="text-[9px] text-slate-400 font-mono">
                All Sundays are automatically marked as Weekly Off.
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

export function PerformanceCompliance({
  sessionUser,
  preselectedUserId,
  clearPreselectedUserId,
  initialSubTab,
  triggerToast
}: {
  sessionUser?: any;
  preselectedUserId?: string;
  clearPreselectedUserId?: () => void;
  initialSubTab?: "visual-dashboard" | "sod" | "eod" | "attendance-calendar" | "legal-recovery-schedule";
  triggerToast?: (msg: string) => void;
}) {
  const userRoleNorm = (sessionUser?.role || "").toString().trim().toLowerCase();
  const isGlobalRole = ["owner", "director", "hr head", "hr-head", "hr executive", "hr-executive", "cfo", "legal head", "it admin"].includes(userRoleNorm);
  const isOwnerOrDirector = isGlobalRole || userRoleNorm.includes("manager") || userRoleNorm === "dsm";
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<{ sod: any[]; eod: any[]; tasks?: any[]; fieldVisits?: any[] }>({ sod: [], eod: [], tasks: [], fieldVisits: [] });
  const [activeSubTab, setActiveSubTab] = useState<"visual-dashboard" | "sod" | "eod" | "attendance-calendar" | "legal-recovery-schedule">(
    initialSubTab || (sessionUser?.vertical === "Legal Recovery" ? "legal-recovery-schedule" : isOwnerOrDirector ? "visual-dashboard" : "sod")
  );

  useEffect(() => {
    if (initialSubTab) {
      setActiveSubTab(initialSubTab);
    }
  }, [initialSubTab]);
  const [searchTerm, setSearchTerm] = useState("");
  const [callsHistory, setCallsHistory] = useState<any[]>([]);
  const [paymentsHistory, setPaymentsHistory] = useState<any[]>([]);
  const [candidatesList, setCandidatesList] = useState<any[]>([]);
  const [selectedDetailUser, setSelectedDetailUser] = useState<any>(null);
  const [selectedDetailBranch, setSelectedDetailBranch] = useState<any>(null);
  const [activeDetailsTab, setActiveDetailsTab] = useState<"tasks" | "attendance">("tasks");
  const [selectedDashboardCategory, setSelectedDashboardCategory] = useState<"staff" | "calls" | "tasks" | "payments" | "pendingTasks" | "hrCalls" | null>(null);
  const [loadingExtra, setLoadingExtra] = useState(false);
  const [dateFilterType, setDateFilterType] = useState<"overall" | "current-month" | "custom">("current-month");
  const [startDateFilter, setStartDateFilter] = useState("");
  const [endDateFilter, setEndDateFilter] = useState("");
  const [selectedSelfie, setSelectedSelfie] = useState<string | null>(null);

  // Filters state for Owner
  const [companies, setCompanies] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [selectedCompany, setSelectedCompany] = useState("");
  const [selectedUser, setSelectedUser] = useState("");
  const [selectedDept, setSelectedDept] = useState("");
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const [expandedUserRows, setExpandedUserRows] = useState<Record<string, boolean>>({});
  const [showFilters, setShowFilters] = useState(false);
  const [exportingMasterReport, setExportingMasterReport] = useState(false);
  // User status filter: 'active' (default), 'inactive', 'all'
  const [userStatusFilter, setUserStatusFilter] = useState<"active" | "inactive" | "all">("active");

  // Export Columns Toggle State
  const [showColumnPicker, setShowColumnPicker] = useState(false);
  const [selectedExportColumns, setSelectedExportColumns] = useState<Record<string, boolean>>({
    date: true,
    empName: true,
    empEmail: true,
    department: true,
    attendanceStatus: true,
    sodTime: true,
    sodTaskType: true,
    sodSummary: true,
    eodTime: true,
    duration: true,
    completedWork: true,
    pendingTargets: true,
    issuesFaced: true,
    escalation: true,
    tomorrowPlan: true,
    tasksDetails: true,
    fieldVisitKm: true,
    fieldVisitDetails: true,
    gpsLocation: true,
  });

  const availableColumnsList = React.useMemo(() => [
    { key: "date", label: "Report Date" },
    { key: "empName", label: "Employee Name" },
    { key: "empEmail", label: "Employee Email" },
    { key: "department", label: "Department" },
    { key: "attendanceStatus", label: "Attendance Status" },
    { key: "sodTime", label: "SOD Time" },
    { key: "sodTaskType", label: "SOD Planned Task Type" },
    { key: "sodSummary", label: "SOD Planned Summary" },
    { key: "eodTime", label: "EOD Time" },
    { key: "duration", label: "Total Work Duration (Hours)" },
    { key: "completedWork", label: "EOD Completed Work" },
    { key: "pendingTargets", label: "EOD Pending Work" },
    { key: "issuesFaced", label: "EOD Issues Faced" },
    { key: "escalation", label: "EOD Escalation Required" },
    { key: "tomorrowPlan", label: "EOD Tomorrow Plan" },
    { key: "tasksDetails", label: "Tasks Details & Work Summary" },
    { key: "fieldVisitKm", label: "Field Visits Travelled (KM)" },
    { key: "fieldVisitDetails", label: "Field Visits Details" },
    { key: "gpsLocation", label: "GPS Coordinates" },
  ], []);

  const loggedInDbUser = React.useMemo(() => {
    if (!sessionUser?.id || users.length === 0) return null;
    return users.find((u: any) => u.id?.toString() === sessionUser.id?.toString());
  }, [users, sessionUser]);

  const userCompanyIds = React.useMemo(() => {
    const dbUser = loggedInDbUser;
    const compsSource = dbUser?.companies || sessionUser?.companies;
    if (!compsSource) return [];
    try {
      const parsed = typeof compsSource === "string"
        ? JSON.parse(compsSource)
        : compsSource;
      if (Array.isArray(parsed)) return parsed.map(String);
      return [String(parsed)];
    } catch {
      if (typeof compsSource === "string") {
        return compsSource.split(",").map((s: string) => s.trim()).filter(Boolean);
      }
      return [String(compsSource)];
    }
  }, [loggedInDbUser, sessionUser]);

  const visibleCompanies = React.useMemo(() => {
    if (isGlobalRole || sessionUser?.role === "Owner") {
      return companies;
    }
    return companies.filter((c: any) => {
      const cid = (c.id || "").toString();
      return userCompanyIds.includes(cid);
    });
  }, [companies, sessionUser, userCompanyIds, isGlobalRole]);

  // Set default company for non-owners
  useEffect(() => {
    if (!isGlobalRole && sessionUser?.role !== "Owner" && visibleCompanies.length > 0) {
      const isValid = visibleCompanies.some((c: any) => c.id?.toString() === selectedCompany);
      if (!isValid) {
        setSelectedCompany(visibleCompanies[0].id.toString());
      }
    }
  }, [visibleCompanies, sessionUser, selectedCompany, isGlobalRole]);

  // Calendar states
  const [calendarAttendance, setCalendarAttendance] = useState<any[]>([]);
  const [calendarLeaves, setCalendarLeaves] = useState<any[]>([]);
  const [calendarFines, setCalendarFines] = useState<any[]>([]);
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth()); // 0-11
  const [loadingCalendar, setLoadingCalendar] = useState(false);

  const isOwner = isOwnerOrDirector || users.length > 1;

  const fetchUserCalendarData = async (userId: string) => {
    if (!userId) return;
    setLoadingCalendar(true);
    try {
      const [calRes, fineRes] = await Promise.all([
        fetch(`/api/attendance/calendar-data?userId=${userId}`),
        fetch(`/api/fines?employeeId=${userId}`),
      ]);
      const data = await calRes.json();
      const fineData = await fineRes.json();
      if (data.success) {
        setCalendarAttendance(data.data.attendance || []);
        setCalendarLeaves(data.data.leaves || []);
      }
      if (fineData.success) {
        setCalendarFines(fineData.data || []);
      }
    } catch (err) {
      console.error("Error loading user calendar data:", err);
    } finally {
      setLoadingCalendar(false);
    }
  };

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  const monthsList = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const handlePrevMonth = () => {
    if (calendarMonth === 0) {
      setCalendarMonth(11);
      setCalendarYear(calendarYear - 1);
    } else {
      setCalendarMonth(calendarMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (calendarMonth === 11) {
      setCalendarMonth(0);
      setCalendarYear(calendarYear + 1);
    } else {
      setCalendarMonth(calendarMonth + 1);
    }
  };

  const renderCalendarDays = () => {
    const days = [];
    const totalDays = getDaysInMonth(calendarYear, calendarMonth);
    const firstDayIndex = getFirstDayOfMonth(calendarYear, calendarMonth);

    for (let i = 0; i < firstDayIndex; i++) {
      days.push(<div key={`empty-${i}`} className="h-14 border border-slate-100 bg-slate-50/50 rounded-lg"></div>);
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    for (let d = 1; d <= totalDays; d++) {
      const dateObj = new Date(calendarYear, calendarMonth, d);
      const isSunday = dateObj.getDay() === 0;
      const isFuture = dateObj > todayStart;
      const isToday = dateObj.toDateString() === todayStart.toDateString();

      const isApprovedLeave = calendarLeaves.some(l => {
        const start = new Date(l.startDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(l.endDate);
        end.setHours(23, 59, 59, 999);
        return dateObj >= start && dateObj <= end;
      });

      const attendanceRec = calendarAttendance.find(a => {
        const aDate = new Date(a.date);
        return aDate.getFullYear() === dateObj.getFullYear() &&
          aDate.getMonth() === dateObj.getMonth() &&
          aDate.getDate() === dateObj.getDate();
      });

      let statusLabel = "";
      let statusColor = "bg-white text-slate-700 border-slate-200";

      if (isSunday) {
        statusLabel = "Holiday";
        statusColor = "bg-slate-100 text-rose-500 border-slate-200 font-bold";
      } else if (isApprovedLeave) {
        statusLabel = "Leave";
        statusColor = "bg-amber-100 text-amber-800 border-amber-200 font-bold";
      } else if (attendanceRec) {
        if (attendanceRec.status === "Present") {
          statusLabel = "Present";
          statusColor = "bg-emerald-100 text-emerald-800 border-emerald-200 font-bold";
        } else if (attendanceRec.status === "Leave") {
          statusLabel = "Leave";
          statusColor = "bg-amber-100 text-amber-800 border-amber-200 font-bold";
        } else if (attendanceRec.status === "Absent") {
          statusLabel = "Absent";
          statusColor = "bg-rose-100 text-rose-800 border-rose-200 font-bold";
        } else {
          statusLabel = attendanceRec.status;
          statusColor = "bg-slate-100 text-slate-800 border-slate-200";
        }
      } else if (isFuture) {
        statusLabel = "";
        statusColor = "bg-white text-slate-350 border-slate-100";
      } else if (isToday) {
        statusLabel = "Pending";
        statusColor = "bg-indigo-50 text-indigo-705 border-indigo-200 animate-pulse font-bold";
      } else {
        statusLabel = "Absent";
        statusColor = "bg-rose-100 text-rose-800 border-rose-200 font-bold";
      }

      const dateStr = dateObj.getFullYear() + "-" + String(dateObj.getMonth() + 1).padStart(2, '0') + "-" + String(dateObj.getDate()).padStart(2, '0');
      const fineRec = calendarFines.find((f: any) => {
        const fDateStr = f.date ? f.date.split("T")[0] : "";
        return fDateStr === dateStr;
      });

      if (fineRec) {
        statusLabel = `Absent Fine ₹${fineRec.amount}`;
        statusColor = "bg-rose-600 text-white border-rose-700 font-black shadow-md";
      }

      days.push(
        <div
          key={`day-${d}`}
          className={`h-14 border rounded-lg p-1.5 flex flex-col justify-between transition-all ${statusColor} shadow-sm`}
        >
          <div className="text-[10px] font-bold font-mono">{d}</div>
          {statusLabel && (
            <div className="text-[8px] uppercase tracking-wider font-extrabold text-center py-0.5 rounded">
              {statusLabel}
            </div>
          )}
        </div>
      );
    }

    return days;
  };

  const departmentsList = React.useMemo(() => {
    const depts = new Set<string>();
    (reports.sod || []).forEach((s: any) => s.employee?.department && depts.add(s.employee.department));
    (reports.eod || []).forEach((e: any) => e.employee?.department && depts.add(e.employee.department));
    return Array.from(depts).sort();
  }, [reports]);

  useEffect(() => {
    fetchReports();
  }, [sessionUser, dateFilterType, startDateFilter, endDateFilter]);

  useEffect(() => {
    fetchFilterMetadata();
  }, [sessionUser]);

  useEffect(() => {
    if (selectedUser) {
      fetchUserCalendarData(selectedUser);
    } else if (sessionUser && !isOwner) {
      setSelectedUser(sessionUser.id);
      fetchUserCalendarData(sessionUser.id);
    }
  }, [selectedUser, sessionUser]);

  useEffect(() => {
    if (preselectedUserId) {
      setSelectedUser(preselectedUserId);
    }
  }, [preselectedUserId]);

  useEffect(() => {
    return () => {
      if (clearPreselectedUserId) clearPreselectedUserId();
    };
  }, []);

  const fetchReports = async () => {
    try {
      setLoading(true);
      // Tier 1: Load Today's reports for instant 0ms speed
      const resToday = await fetch("/api/reports/work-report?range=today");
      const dataToday = await resToday.json();
      if (dataToday.success) {
        setReports(dataToday.data || { sod: [], eod: [], tasks: [], fieldVisits: [] });
      }
      setLoading(false); // Hide loading spinner early!

      // Tier 2: Load Recent 3 Days (Yesterday & Day Before Yesterday) fast
      const resRecent = await fetch("/api/reports/work-report?range=recent");
      const dataRecent = await resRecent.json();
      if (dataRecent.success) {
        setReports(dataRecent.data || { sod: [], eod: [], tasks: [], fieldVisits: [] });
      }

      // Tier 3: Determine active query range for full reports
      let queryRange = "all";
      if (dateFilterType === "current-month") {
        queryRange = "current-month";
      } else if (dateFilterType === "custom" && (startDateFilter || endDateFilter)) {
        queryRange = `custom&startDate=${startDateFilter || ""}&endDate=${endDateFilter || ""}`;
      }

      // Load all remaining matching reports in background
      const resAll = await fetch(`/api/reports/work-report?range=${queryRange}`);
      const dataAll = await resAll.json();
      if (dataAll.success) {
        setReports(dataAll.data || { sod: [], eod: [], tasks: [], fieldVisits: [] });
      }

      // Fetch extra statistics in background if user is Owner/Director
      if (isOwnerOrDirector) {
        setLoadingExtra(true);
        const [resFollowup, resMarketing, resPayment, resCandidates] = await Promise.all([
          fetch("/api/legal-recovery/followup"),
          fetch("/api/legal-recovery/marketing-call"),
          fetch("/api/legal-recovery/payment"),
          fetch("/api/candidates")
        ]);
        const dataFollowup = await resFollowup.json();
        const dataMarketing = await resMarketing.json();
        const dataPayment = await resPayment.json();
        const dataCandidates = await resCandidates.json();

        let mergedCalls: any[] = [];
        if (dataFollowup.success && dataFollowup.data) {
          mergedCalls = [...mergedCalls, ...dataFollowup.data.map((item: any) => ({ ...item, logType: 'Follow-up' }))];
        }
        if (dataMarketing.success && dataMarketing.data) {
          mergedCalls = [...mergedCalls, ...dataMarketing.data.map((item: any) => ({ ...item, logType: 'Business Development' }))];
        }
        setCallsHistory(mergedCalls);

        if (dataPayment.success && dataPayment.data) {
          setPaymentsHistory(dataPayment.data);
        }
        if (dataCandidates.success && dataCandidates.data) {
          setCandidatesList(dataCandidates.data);
        }
      }
    } catch (error) {
      console.error("Error fetching work reports:", error);
    } finally {
      setLoading(false);
      setLoadingExtra(false);
    }
  };

  const fetchFilterMetadata = async () => {
    try {
      const res = await fetch("/api/attendance/calendar-data");
      const data = await res.json();
      if (data.success) {
        setCompanies(data.data.companies || []);
        setUsers(data.data.users || []);
      }
    } catch (err) {
      console.error("Error loading filter metadata:", err);
    }
  };

  const isUserInCompany = (user: any, companyId: string): boolean => {
    if (!user) return false;
    const targetUser = (user.companies !== undefined)
      ? user
      : users.find((u: any) => u.id?.toString() === (user.id || user).toString());

    if (!targetUser || !targetUser.companies || !companyId) return false;
    let comps: any[] = [];
    if (Array.isArray(targetUser.companies)) {
      comps = targetUser.companies;
    } else if (typeof targetUser.companies === "string") {
      try {
        const parsed = JSON.parse(targetUser.companies);
        comps = Array.isArray(parsed) ? parsed : [parsed];
      } catch (e) {
        comps = [targetUser.companies];
      }
    } else {
      comps = [targetUser.companies];
    }
    return comps.some((c: any) => {
      const cid = (c.id || c.id || c || "").toString().trim();
      return cid === companyId.toString().trim();
    });
  };

  const filteredUsers = users.filter((u: any) => {
    if (!selectedCompany) return true;
    return isUserInCompany(u, selectedCompany);
  });

  // Merge SOD, EOD, Tasks, and Field Visits
  const mergedList = React.useMemo(() => {
    const map = new Map<string, { sod: any; eod: any; tasks: any[]; fieldVisits: any[]; date: Date; dateStr: string; employee: any }>();

    const getEmpIdStr = (emp: any): string => {
      if (!emp) return "unknown";
      if (typeof emp === "string") return emp.trim();
      return (emp.id || emp.id || "unknown").toString().trim();
    };

    // Process SODs
    (reports.sod || []).forEach((sod: any) => {
      const empId = getEmpIdStr(sod.employee);
      if (!sod.date) return;
      const dObj = new Date(sod.date);
      const dateStr = dObj.toDateString();
      const key = `${empId}_${dateStr}`;
      map.set(key, { sod, eod: null, tasks: [], fieldVisits: [], date: dObj, dateStr, employee: sod.employee });
    });

    // Process EODs
    (reports.eod || []).forEach((eod: any) => {
      const empId = getEmpIdStr(eod.employee);
      if (!eod.date) return;
      const dObj = new Date(eod.date);
      const dateStr = dObj.toDateString();
      const key = `${empId}_${dateStr}`;
      const existing = map.get(key);
      if (existing) {
        existing.eod = eod;
      } else {
        map.set(key, { sod: null, eod, tasks: [], fieldVisits: [], date: dObj, dateStr, employee: eod.employee });
      }
    });

    // Process Tasks - group under assignee (task.employee field = the person the task belongs to)
    (reports.tasks || []).forEach((task: any) => {
      const empId = getEmpIdStr(task.employee);
      if (!task.date) return;

      const dObjCreate = new Date(task.date);
      const dateStrCreate = dObjCreate.toDateString();

      // If task is forwarded/scheduled to a different date (scheduledAt), show it ONLY on that target date's work report!
      if (task.scheduledAt) {
        const dObjSched = new Date(task.scheduledAt);
        const dateStrSched = dObjSched.toDateString();

        if (dateStrSched !== dateStrCreate) {
          const keySched = `${empId}_${dateStrSched}`;
          const existingSched = map.get(keySched);
          if (existingSched) {
            if (!existingSched.tasks.some((t: any) => t.id === task.id)) {
              existingSched.tasks.push(task);
            }
          } else {
            map.set(keySched, { sod: null, eod: null, tasks: [task], fieldVisits: [], date: dObjSched, dateStr: dateStrSched, employee: task.employee });
          }
          return; // Skip adding to original date work report
        }
      }

      // Group under the original creation date (for the assignee)
      const keyCreate = `${empId}_${dateStrCreate}`;
      const existingCreate = map.get(keyCreate);
      if (existingCreate) {
        if (!existingCreate.tasks.some((t: any) => t.id === task.id)) {
          existingCreate.tasks.push(task);
        }
      } else {
        map.set(keyCreate, { sod: null, eod: null, tasks: [task], fieldVisits: [], date: dObjCreate, dateStr: dateStrCreate, employee: task.employee });
      }
    });

    // Process Field Visits
    (reports.fieldVisits || []).forEach((visit: any) => {
      const empId = visit.employee_id || getEmpIdStr(visit.employee);
      if (!visit.date) return;
      const dObj = new Date(visit.date);
      const dateStr = dObj.toDateString();
      const key = `${empId}_${dateStr}`;
      const existing = map.get(key);
      if (existing) {
        existing.fieldVisits.push(visit);
      } else {
        map.set(key, { sod: null, eod: null, tasks: [], fieldVisits: [visit], date: dObj, dateStr, employee: visit.employee });
      }
    });

    // Sort by date (descending)
    const result = Array.from(map.values()).sort((a, b) => b.date.getTime() - a.date.getTime());
    return result;
  }, [reports]);

  const uniqueUsersFromReports = React.useMemo(() => {
    const role = sessionUser?.role || "Employee";
    const userId = (sessionUser?.id || "").toString();

    const userMap = new Map<string, { id: string; name: string; email: string; role: string; status: string }>();

    let addSelf = true;
    if (selectedCompany) {
      if (!isUserInCompany(sessionUser, selectedCompany)) {
        addSelf = false;
      }
    }

    if (addSelf && sessionUser && sessionUser.id) {
      userMap.set(userId, {
        id: userId,
        name: `${sessionUser.name || "Self"} (Self)`,
        email: sessionUser.email || "",
        role: sessionUser.role || "Employee",
        status: (sessionUser.status || "active").toLowerCase()
      });
    }

    // Add users from system users list (both active and inactive)
    users.forEach((u: any) => {
      const empId = (u.id || "").toString();
      if (!empId) return;
      if (!isOwner && empId !== userId) return;
      if (selectedCompany && !isUserInCompany(u, selectedCompany)) return;
      if (selectedDept && u.department !== selectedDept) return;

      if (!userMap.has(empId)) {
        userMap.set(empId, {
          id: empId,
          name: u.name,
          email: u.email || "",
          role: u.role || "Employee",
          status: (u.status || "active").toLowerCase()
        });
      }
    });

    // Add employees from mergedList (past SOD/EOD/Task reports)
    mergedList.forEach((item: any) => {
      if (item.employee && item.employee.id) {
        const empId = item.employee.id.toString();
        const empRole = item.employee.role || "Employee";
        const empStatus = (item.employee.status || "active").toLowerCase();

        if (!isOwner && empId !== userId) return;
        if (selectedCompany && !isUserInCompany(item.employee, selectedCompany)) return;
        if (selectedDept && item.employee.department !== selectedDept) return;

        if (!userMap.has(empId)) {
          userMap.set(empId, {
            id: empId,
            name: item.employee.name,
            email: item.employee.email || "",
            role: empRole,
            status: empStatus
          });
        }
      }
    });

    const allList = Array.from(userMap.values()).filter(u => u.name && u.name.trim() !== "" && !u.name.toLowerCase().includes("unknown"));
    const activeList = allList.filter(u => (u.status || "active").toLowerCase() === "active").sort((a, b) => a.name.localeCompare(b.name));
    const inactiveList = allList.filter(u => (u.status || "active").toLowerCase() !== "active").sort((a, b) => a.name.localeCompare(b.name));

    return { activeList, inactiveList, allUsers: allList };
  }, [mergedList, users, sessionUser, selectedCompany, selectedDept]);

  // Synchronize selection — auto-switch filter when inactive user is selected
  useEffect(() => {
    if (selectedUser) {
      const userObj = uniqueUsersFromReports.allUsers.find((u) => u.id === selectedUser);
      if (!userObj) {
        setSelectedUser("");
      } else if ((userObj.status === "inactive" || userObj.status === "archived") && userStatusFilter === "active") {
        setUserStatusFilter("all");
      }
    }
  }, [selectedCompany, selectedDept, uniqueUsersFromReports, selectedUser]);

  const exportConsolidatedExcel = () => {
    try {
      const headers = [
        "Date",
        "Employee Name",
        "Employee Email",
        "Department",
        "Attendance Status",
        "SOD Submitted At",
        "SOD Planned Task Type",
        "SOD Planned Summary",
        "EOD Submitted At",
        "Total Work Duration (Hours)",
        "EOD Completed Work",
        "EOD Pending Work",
        "EOD Issues Faced",
        "EOD Escalation Required",
        "EOD Tomorrow Plan",
        "Tasks Details & Work Summary",
        "Field Visits Travelled (KM)",
        "Field Visits Details"
      ];

      // 1. Sort existing records ascending by date
      const sortedRecords = [...filteredList].sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());

      // 2. Map dateStr -> record item
      const recordMap = new Map<string, any>();
      sortedRecords.forEach(item => {
        const dObj = new Date(item.date);
        const dateKey = `${dObj.getFullYear()}-${String(dObj.getMonth() + 1).padStart(2, '0')}-${String(dObj.getDate()).padStart(2, '0')}`;
        recordMap.set(dateKey, item);
      });

      // Find fallback employee info if present
      const fallbackEmp = sortedRecords.find(r => r.employee?.name)?.employee || { name: "N/A", email: "N/A", department: "General" };

      // Determine date bounds
      let startDateObj: Date | null = null;
      let endDateObj: Date | null = null;

      if (dateFilterType === "custom" && startDateFilter && endDateFilter) {
        startDateObj = new Date(startDateFilter);
        endDateObj = new Date(endDateFilter);
      } else if (sortedRecords.length > 0) {
        startDateObj = new Date(sortedRecords[0].date);
        endDateObj = new Date(sortedRecords[sortedRecords.length - 1].date);
      }

      const exportList: any[] = [];

      if (startDateObj && endDateObj && !isNaN(startDateObj.getTime()) && !isNaN(endDateObj.getTime())) {
        const curr = new Date(startDateObj);
        const last = new Date(endDateObj);
        curr.setHours(0, 0, 0, 0);
        last.setHours(0, 0, 0, 0);

        while (curr <= last) {
          const dateKey = `${curr.getFullYear()}-${String(curr.getMonth() + 1).padStart(2, '0')}-${String(curr.getDate()).padStart(2, '0')}`;
          const existingItem = recordMap.get(dateKey);

          if (existingItem) {
            exportList.push(existingItem);
          } else {
            // Continuous missing date row
            exportList.push({
              date: new Date(curr),
              employee: fallbackEmp,
              sod: null,
              eod: null,
              tasks: [],
              fieldVisits: []
            });
          }
          curr.setDate(curr.getDate() + 1);
        }
      } else {
        exportList.push(...sortedRecords);
      }

      let totalWorkHoursSum = 0;
      let totalFieldKmSum = 0;

      const getAttendanceStatus = (item: any) => {
        if (item.sod) return "Present";
        if (item.eod) return "Present (EOD Only)";
        if (item.tasks && item.tasks.length > 0) return "Tasks Only";
        const isSunday = item.date.getDay() === 0;
        if (isSunday) return "Sunday";
        return "Absent";
      };

      const rows = exportList.map((item: any) => {
        const sodTime = item.sod ? formatTimeTo12Hour(item.sod.createdAt) : "-";
        const sodTaskType = item.sod?.taskType || "-";
        const sodSummary = item.sod?.taskSummary || "-";

        const eodTime = item.eod ? formatTimeTo12Hour(item.eod.createdAt) : "-";
        const eodCompleted = item.eod?.completedWork || "-";
        const eodPending = item.eod?.pendingWork || "-";
        const eodIssues = item.eod?.issuesFaced || "-";
        const eodEscalation = item.eod?.escalationRequired || "No";
        const eodTomorrow = item.eod?.tomorrowPlan || "-";

        // Calculate Total Work Duration (Hours worked today)
        let totalDuration = "-";
        let numericHours = 0;

        if (item.eod?.hoursWorked || item.eod?.totalHours || item.eod?.workHours) {
          const val = Number(item.eod.hoursWorked || item.eod.totalHours || item.eod.workHours);
          if (!isNaN(val) && val > 0) {
            numericHours = val;
            totalDuration = `${val.toFixed(2)} Hrs`;
          }
        } else if (item.sod?.createdAt && item.eod?.createdAt) {
          const sodMs = new Date(item.sod.createdAt).getTime();
          const eodMs = new Date(item.eod.createdAt).getTime();
          if (eodMs > sodMs) {
            const diffHours = (eodMs - sodMs) / (1000 * 60 * 60);
            numericHours = diffHours;
            totalDuration = `${diffHours.toFixed(2)} Hrs`;
          }
        }
        if (totalDuration === "-" && item.tasks && item.tasks.length > 0) {
          const totalTaskSeconds = item.tasks.reduce((sum: number, t: any) => sum + (t.elapsedSeconds || 0), 0);
          if (totalTaskSeconds > 0) {
            numericHours = totalTaskSeconds / 3600;
            totalDuration = `${numericHours.toFixed(2)} Hrs`;
          }
        }

        totalWorkHoursSum += numericHours;

        const parseTaskSummary = (text: string) => {
          if (!text) return "";
          let raw = text.trim();
          if (raw.startsWith("[") || raw.startsWith("{")) {
            try {
              const parsed = JSON.parse(raw);
              if (Array.isArray(parsed) && parsed.length > 0) {
                raw = parsed.map((p: any) => p.note || p.text || p.description || p.summary || "").filter(Boolean).join(", ") || raw;
              } else if (parsed && typeof parsed === "object") {
                raw = parsed.note || parsed.text || parsed.description || parsed.summary || raw;
              }
            } catch (_) {}
          }
          return raw.replace(/(\r\n|\n|\r)/gm, " ").trim();
        };

        const tasksDetails = item.tasks && item.tasks.length > 0
          ? item.tasks.map((t: any, index: number) => {
            let suffix = "";
            if (t.updatedAt && new Date(t.updatedAt).toDateString() !== item.date.toDateString() && item.date.toDateString() === new Date(t.date).toDateString()) {
              const dateStr = new Date(t.updatedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
              suffix = ` (Shifted to ${dateStr})`;
            }
            const cleanDesc = parseTaskSummary(t.description || t.progressNotes || t.remarks);
            const workSummary = cleanDesc ? ` [Summary: ${cleanDesc}]` : "";
            return `${index + 1}. [${t.status || 'Pending'}] ${t.taskTitle || 'Task'} (${t.taskType || 'General'})${workSummary}${suffix}`;
          }).join("\n")
          : "-";

        const fieldVisitKm = item.fieldVisits && item.fieldVisits.length > 0
          ? item.fieldVisits.reduce((sum: number, v: any) => sum + (v.distance_travelled || 0), 0)
          : 0;
        totalFieldKmSum += fieldVisitKm;

        const fieldVisitDetails = item.fieldVisits && item.fieldVisits.length > 0
          ? item.fieldVisits.map((v: any, index: number) => `${index + 1}. Client: ${v.client_name || "N/A"}, Purpose: ${v.purpose || "N/A"}, Dist: ${v.distance_travelled || 0} KM, Notes: ${v.visit_notes || "N/A"}`).join("\n")
          : "-";

        return [
          item.date.toLocaleDateString("en-IN"),
          item.employee?.name || "Unknown",
          item.employee?.email || "N/A",
          item.employee?.department || "General",
          getAttendanceStatus(item),
          sodTime,
          sodTaskType,
          sodSummary,
          eodTime,
          totalDuration,
          eodCompleted,
          eodPending,
          eodIssues,
          eodEscalation,
          eodTomorrow,
          tasksDetails,
          fieldVisitKm,
          fieldVisitDetails
        ];
      });

      // Construct native Excel representation
      let excelTemplate = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">`;
      excelTemplate += `<head><meta charset="utf-8"><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Consolidated Work Report</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head><body>`;
      excelTemplate += `<table border="1" style="border-collapse:collapse; font-family: 'Segoe UI', Arial, sans-serif; font-size: 11px;">`;

      // Header row
      excelTemplate += `<tr style="height: 30px;">`;
      headers.forEach(h => {
        excelTemplate += `<th style="background-color: #0f766e; color: #ffffff; font-weight: bold; border: 1px solid #cbd5e1; padding: 6px; text-align: left; vertical-align: middle;">${h}</th>`;
      });
      excelTemplate += `</tr>`;

      // Data rows
      rows.forEach(row => {
        excelTemplate += `<tr>`;
        row.forEach(cell => {
          const valStr = String(cell ?? "");
          const isMultiLine = valStr.includes("\n");
          const formattedCell = isMultiLine
            ? valStr.replace(/\n/g, '<br style="mso-data-placement:same-cell;" />')
            : valStr;
          const style = isMultiLine
            ? "border: 1px solid #cbd5e1; padding: 6px; text-align: left; vertical-align: top; white-space: pre-wrap;"
            : "border: 1px solid #cbd5e1; padding: 6px; text-align: left; vertical-align: middle; white-space: nowrap;";
          excelTemplate += `<td style="${style}">${formattedCell}</td>`;
        });
        excelTemplate += `</tr>`;
      });

      // Summary Total row at bottom
      const totalHoursFormatted = totalWorkHoursSum > 0 ? `${totalWorkHoursSum.toFixed(2)} Hrs` : "0 Hrs";
      const totalKmFormatted = totalFieldKmSum > 0 ? `${totalFieldKmSum.toFixed(2)} KM` : "0 KM";

      const summaryRow = [
        "TOTAL",
        "", "", "", "", "", "", "", "",
        totalHoursFormatted,
        "", "", "", "", "", "",
        totalKmFormatted,
        ""
      ];

      excelTemplate += `<tr style="height: 32px; background-color: #f1f5f9; font-weight: bold; border-top: 2px solid #0f766e;">`;
      summaryRow.forEach((cell) => {
        excelTemplate += `<td style="border: 1px solid #cbd5e1; padding: 6px; text-align: left; vertical-align: middle; font-weight: bold; background-color: #f1f5f9;">${cell}</td>`;
      });
      excelTemplate += `</tr>`;

      excelTemplate += `</table></body></html>`;

      const blob = new Blob([excelTemplate], { type: "application/vnd.ms-excel;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `Consolidated_Work_Report_${new Date().toISOString().split('T')[0]}.xls`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Failed to export consolidated Excel:", error);
    }
  };

  const exportMasterEmployeeReport = async () => {
    try {
      setExportingMasterReport(true);
      const now = new Date();
      const defaultStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
      const defaultEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];
      const reportStart = dateFilterType === "custom" && startDateFilter ? startDateFilter : defaultStart;
      const reportEnd = dateFilterType === "custom" && endDateFilter ? endDateFilter : defaultEnd;
      const params = new URLSearchParams({ startDate: reportStart, endDate: reportEnd });
      if (selectedUser) params.set("userId", selectedUser);

      const res = await fetch(`/api/reports/master-employee-report?${params.toString()}`);
      const payload = await res.json();
      if (!res.ok || !payload.success) throw new Error(payload.error || "Master report could not be generated");

      const data = payload.data;
      const XLSX = await import("xlsx");
      const profileMap = new Map((data.profiles || []).map((p: any) => [String(p.user), p]));
      const deptMap = new Map((data.departments || []).map((d: any) => [String(d.id), d.name]));
      const userMap = new Map((data.users || []).map((u: any) => [String(u.id), u]));
      const fmtDate = (value: any) => value ? new Date(value).toLocaleDateString("en-IN") : "";
      const fmtTime = (value: any) => value ? new Date(value).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "";
      const dateKey = (value: any) => value ? new Date(value).toISOString().split("T")[0] : "";
      const workingDates: string[] = [];
      for (let cursor = new Date(`${reportStart}T00:00:00`), last = new Date(`${reportEnd}T00:00:00`); cursor <= last; cursor.setDate(cursor.getDate() + 1)) {
        if (cursor.getDay() !== 0) workingDates.push(cursor.toISOString().split("T")[0]);
      }

      const summary = (data.users || []).map((user: any) => {
        const id = String(user.id);
        const profile: any = profileMap.get(id) || {};
        const employeeAttendance = (data.attendance || []).filter((a: any) => String(a.employee) === id);
        const employeeEods = (data.eods || []).filter((e: any) => String(e.employee) === id);
        const employeeSods = (data.sods || []).filter((s: any) => String(s.employee) === id);
        const employeeTasks = (data.tasks || []).filter((t: any) => String(t.employee) === id);

        const presentDates = new Set(employeeAttendance.map((a: any) => dateKey(a.date)));
        const employeeLeaves = (data.leaves || []).filter((l: any) => String(l.employee) === id);
        const leaveDates = new Set<string>();
        employeeLeaves.forEach((leave: any) => {
          const leaveStart = new Date(leave.startDate) < new Date(`${reportStart}T00:00:00`) ? new Date(`${reportStart}T00:00:00`) : new Date(leave.startDate);
          const leaveEnd = new Date(leave.endDate) > new Date(`${reportEnd}T23:59:59`) ? new Date(`${reportEnd}T23:59:59`) : new Date(leave.endDate);
          for (const d = new Date(leaveStart); d <= leaveEnd; d.setDate(d.getDate() + 1)) {
            if (d.getDay() !== 0) leaveDates.add(d.toISOString().split("T")[0]);
          }
        });

        const present = workingDates.filter(d => presentDates.has(d)).length;
        const leave = workingDates.filter(d => leaveDates.has(d) && !presentDates.has(d)).length;
        const absent = Math.max(0, workingDates.length - present - leave);

        // Robust Work Hours Calculation across Attendance, EOD Reports, and Task Timers
        let workMs = 0;
        employeeAttendance.forEach((a: any) => {
          const hw = Number(a.hoursWorked || a.totalHours || a.workHours || 0);
          if (hw > 0) {
            workMs += hw * 3600000;
          } else if (a.checkIn && a.checkOut) {
            const diff = new Date(a.checkOut).getTime() - new Date(a.checkIn).getTime();
            if (diff > 0) workMs += diff;
          }
        });

        if (workMs === 0) {
          employeeEods.forEach((e: any) => {
            const hw = Number(e.hoursWorked || e.totalHours || e.workHours || 0);
            if (hw > 0) {
              workMs += hw * 3600000;
            } else if (e.createdAt) {
              const eodDateStr = dateKey(e.date || e.createdAt);
              const matchingSod = employeeSods.find((s: any) => dateKey(s.date || s.createdAt) === eodDateStr);
              if (matchingSod?.createdAt) {
                const diff = new Date(e.createdAt).getTime() - new Date(matchingSod.createdAt).getTime();
                if (diff > 0 && diff < 16 * 3600000) workMs += diff;
              }
            }
          });
        }

        if (workMs === 0 && employeeTasks.length > 0) {
          const totalTaskSecs = employeeTasks.reduce((sum: number, t: any) => sum + (t.elapsedSeconds || 0), 0);
          if (totalTaskSecs > 0) workMs = totalTaskSecs * 1000;
        }

        if (workMs === 0 && present > 0) {
          workMs = present * 8 * 3600000;
        }

        const completedTasks = employeeTasks.filter((t: any) => ["completed", "done"].includes(String(t.status || "").toLowerCase())).length;
        const totalTasks = employeeTasks.length;
        const completionPct = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : (present > 0 ? Math.min(100, Number(((present / workingDates.length) * 100).toFixed(1))) : 0);
        const workHoursFormatted = workMs > 0 
          ? `${Math.floor(workMs / 3600000)}h ${Math.floor((workMs % 3600000) / 60000)}m`
          : "0h 0m";

        return {
          "Employee ID": profile.employeeId || id,
          "Employee Name": user.name || "",
          Email: user.email || "",
          Role: user.role || "",
          Designation: profile.designation || "",
          Department: deptMap.get(String(profile.department)) || "General",
          Vertical: profile.vertical || "Not Assigned",
          "Period From": reportStart,
          "Period To": reportEnd,
          "Working Days": workingDates.length,
          "Total Present": present,
          "Total Absent": absent,
          "Work Hours": workHoursFormatted,
          "Productivity": `${completionPct.toFixed(1)}%`
        };
      });

      const employeeName = (id: any) => (userMap.get(String(id)) as any)?.name || String(id || "");
      const attendanceRows = (data.attendance || []).map((a: any) => ({
        Employee: employeeName(a.employee), Date: fmtDate(a.date), Status: a.status || "Present",
        "Check In": fmtTime(a.checkIn), "Check Out": fmtTime(a.checkOut),
        "Working Hours": a.checkIn && a.checkOut ? Number(((new Date(a.checkOut).getTime() - new Date(a.checkIn).getTime()) / 3600000).toFixed(2)) : 0
      }));
      const leaveRows = (data.leaves || []).map((leave: any) => ({
        Employee: employeeName(leave.employee), Type: leave.type || "Leave", "Start Date": fmtDate(leave.startDate),
        "End Date": fmtDate(leave.endDate), Days: leave.days || "", Status: leave.status,
        Reason: leave.reason || "", Remarks: leave.remarks || "", Attachment: leave.attachmentUrl || ""
      }));
      const taskRows = (data.tasks || []).map((t: any) => ({
        Employee: employeeName(t.employee), Date: fmtDate(t.date), Title: t.taskTitle, Type: t.taskType,
        Status: t.status, Description: t.description || t.remarks || "", "Scheduled At": t.scheduledAt ? new Date(t.scheduledAt).toLocaleString("en-IN") : ""
      }));
      const scheduleRows = (data.schedules || []).map((s: any) => ({
        Employee: employeeName(s.employeeId), Date: s.date, Time: s.time,
        Location: (s.workSection === "Others" || s.workSection === "Other" || s.workSection === "others")
          ? (s.customLocation || s.otherType || s.details || s.remarks || s.workSection)
          : s.workSection,
        Type: s.type, "Sub Type": s.subType, Bank: s.bankName, Branch: s.branchName, AO: s.aoName, RBO: s.rboName,
        Status: s.status, Details: s.details || s.remarks || "", Attachment: s.proofAttachment || ""
      }));
      const sodEodRows = [
        ...(data.sods || []).map((s: any) => ({ Employee: employeeName(s.employee), Date: fmtDate(s.date), Report: "SOD", Time: fmtTime(s.createdAt), Details: s.taskSummary || "", Issues: "" })),
        ...(data.eods || []).map((e: any) => ({ Employee: employeeName(e.employee), Date: fmtDate(e.date), Report: "EOD", Time: fmtTime(e.createdAt), Details: e.completedWork || "", Issues: e.issuesFaced || "" }))
      ];
      const visitRows = (data.fieldVisits || []).map((v: any) => ({
        Employee: employeeName(v.employee_id), Date: v.date, Client: v.client_name, Purpose: v.purpose,
        "Opening Time": fmtTime(v.opening_time), "Closing Time": fmtTime(v.closing_time), "Distance KM": v.distance_travelled || 0,
        Expenses: JSON.stringify(v.expenses_json || ""), Notes: v.visit_summary || v.visit_notes || ""
      }));
      const auditRows = (data.audits || []).map((a: any) => ({
        Employee: employeeName(a.user), Timestamp: a.timestamp ? new Date(a.timestamp).toLocaleString("en-IN") : "",
        Action: a.action, Entity: a.entity, "Entity ID": a.entityId, Changes: a.details, "IP Address": a.ipAddress
      }));

      const workbook = XLSX.utils.book_new();
      let summarySheet: any = null;

      const addSheet = (name: string, rows: any[]) => {
        const sheetData = rows.length ? rows : [{ Info: "No records in selected period" }];
        const ws = XLSX.utils.json_to_sheet(sheetData);
        if (rows.length > 0) {
          const colKeys = Object.keys(rows[0]);
          ws['!cols'] = colKeys.map(key => {
            let maxLen = key.length;
            rows.forEach(r => {
              const valStr = r[key] !== undefined && r[key] !== null ? String(r[key]) : "";
              if (valStr.length > maxLen) maxLen = valStr.length;
            });
            return { wch: Math.max(maxLen + 6, 16) };
          });
        }
        XLSX.utils.book_append_sheet(workbook, ws, name);
        return ws;
      };

      summarySheet = addSheet("Employee Summary", summary);
      addSheet("Attendance Timings", attendanceRows);
      addSheet("Approved Leaves", leaveRows);
      addSheet("Tasks", taskRows);
      addSheet("Scheduled Work", scheduleRows);
      addSheet("SOD EOD", sodEodRows);
      addSheet("Field Visits", visitRows);
      addSheet("Audit Trail", auditRows);

      // Download single clean structured CSV file
      if (summarySheet) {
        const csvString = XLSX.utils.sheet_to_csv(summarySheet);
        const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `Master_Employee_Report_${reportStart}_to_${reportEnd}.csv`);
        link.style.visibility = "hidden";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }

      triggerToast?.("Structured master employee report exported successfully (CSV)");
    } catch (error: any) {
      console.error("Failed to export master employee report:", error);
      triggerToast?.(error.message || "Master report export failed");
    } finally {
      setExportingMasterReport(false);
    }
  };

  const exportEmployeeWorkSummary = () => {
    try {
      const formatWorkHoursRaw = (totalMs: number) => {
        if (!totalMs || totalMs <= 0) return "0h 0m";
        const totalMins = Math.floor(totalMs / (1000 * 60));
        return `${Math.floor(totalMins / 60)}h ${totalMins % 60}m`;
      };
      const fmtDate = (d: any) => d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";
      const fmtTime = (d: any) => d ? formatTimeTo12Hour(d) : "—";

      // Neutral light gray default header style with dark text
      const TH = (text: string, bg = "#f1f5f9", color = "#475569") =>
        `<th style="background:${bg};color:${color};font-weight:bold;border:1px solid #cbd5e1;padding:8px 10px;text-align:left;vertical-align:middle;white-space:nowrap;">${text}</th>`;
      const TD = (val: any, style = "") =>
        `<td style="border:1px solid #e2e8f0;padding:6px 8px;vertical-align:middle;color:#334155;${style}">${val ?? "—"}</td>`;
      const BLANK = `<td style="border:none;"></td>`;

      const filteredEmps = visualStats.employeesData.filter((emp: any) => {
        if (emp.role === "Owner") return false;
        if (selectedUser && emp.id.toString() !== selectedUser.toString()) return false;
        return true;
      });

      const dateLabel = dateFilterType === "custom"
        ? `${startDateFilter || "Start"} to ${endDateFilter || "End"}`
        : dateFilterType === "current-month" ? "Current Month" : "All Time";

      let html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">`;
      html += `<head><meta charset="utf-8"><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Work Report</x:Name></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head><body>`;
      html += `<table border="1" style="border-collapse:collapse;font-family:'Segoe UI',Arial,sans-serif;font-size:11px;">`;

      // ── SECTION 1: Summary ────────────────────────────────────────────────────
      html += `<tr><td colspan="10" style="background:#f8fafc;color:#1e293b;font-size:13px;font-weight:bold;padding:12px 10px;border:1px solid #cbd5e1;text-align:left;">📊 Employee Work Summary — ${dateLabel}</td></tr>`;
      html += `<tr>${TH("Employee Name")}${TH("Email")}${TH("Department")}${TH("Tasks Assigned")}${TH("Tasks Completed")}${TH("Pending Tasks")}${TH("Completion %")}${TH("Work Hours")}${TH("Productivity %")}${TH("Status")}</tr>`;

      filteredEmps.forEach((emp: any) => {
        const total = emp.tasksDone + emp.tasksPending;
        const pct = total > 0 ? (emp.tasksDone / total) * 100 : 0;
        const statusBg = pct >= 90 ? "#d1fae5" : pct >= 70 ? "#dbeafe" : pct >= 50 ? "#fef3c7" : "#fee2e2";
        const statusTxt = pct >= 90 ? "Excellent" : pct >= 70 ? "Good" : pct >= 50 ? "Average" : "Poor";
        html += `<tr>${TD(emp.name, "font-weight:bold;")}${TD(emp.email || "N/A")}${TD(emp.department)}${TD(total, "text-align:center;")}${TD(emp.tasksDone, "text-align:center;color:#059669;font-weight:bold;")}${TD(emp.tasksPending, "text-align:center;color:#dc2626;font-weight:bold;")}${TD(pct.toFixed(1) + "%", "text-align:center;")}${TD(formatWorkHoursRaw(emp.totalWorkMs), "text-align:center;")}${TD(pct.toFixed(1) + "%", "text-align:center;")}${TD(statusTxt, `text-align:center;background:${statusBg};font-weight:bold;`)}</tr>`;
      });

      // ── SECTION 2: Date-wise Details ─────────────────────────────────────────
      html += `<tr><td colspan="10" style="height:16px;border:none;"></td></tr>`;
      html += `<tr><td colspan="10" style="background:#f8fafc;color:#1e293b;font-size:13px;font-weight:bold;padding:10px;border:1px solid #cbd5e1;">📋 Date-wise Work Details — ${dateLabel}</td></tr>`;

      filteredEmps.forEach((emp: any) => {
        // Soft pink-lavender name header banner
        html += `<tr><td colspan="10" style="background:#fdf2f8;color:#86198f;font-weight:bold;padding:10px;font-size:12px;border:1px solid #cbd5e1;">👤 ${emp.name} &nbsp;|&nbsp; ${emp.department} &nbsp;|&nbsp; ${emp.email || "—"}</td></tr>`;

        // Tasks - Soft Indigo
        const empTasks = (reports.tasks || []).filter((t: any) => {
          const tid = (typeof t.employee === "object" ? (t.employee?.id || "") : t.employee)?.toString();
          return tid === emp.id.toString() && matchDateFilter(t.date);
        }).sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());

        html += `<tr>${TH("Task Date", "#e0e7ff", "#3730a3")}${TH("Task Title", "#e0e7ff", "#3730a3")}${TH("Task Type", "#e0e7ff", "#3730a3")}${TH("Status", "#e0e7ff", "#3730a3")}${TH("Assigned By", "#e0e7ff", "#3730a3")}${TH("Description / Remarks", "#e0e7ff", "#3730a3")}${BLANK}${BLANK}${BLANK}${BLANK}</tr>`;
        if (empTasks.length === 0) {
          html += `<tr><td colspan="6" style="color:#94a3b8;padding:6px 8px;font-style:italic;border:1px solid #e2e8f0;">No tasks found in selected period.</td>${BLANK}${BLANK}${BLANK}${BLANK}</tr>`;
        } else {
          empTasks.forEach((t: any) => {
            const assignerUser = (users as any[]).find((u: any) => u.id?.toString() === t.assignedBy?.toString());
            const sBg = (t.status === "Completed" || t.status === "Done") ? "background:#d1fae5;color:#065f46;" : t.status === "In Progress" ? "background:#fef3c7;color:#92400e;" : "";
            html += `<tr>${TD(fmtDate(t.date))}${TD(t.taskTitle || "—", "font-weight:bold;")}${TD(t.taskType || "—")}${TD(t.status || "—", sBg + "text-align:center;font-weight:bold;")}${TD(assignerUser?.name || (t.assignedBy ? "Manager" : "Self"))}${TD(t.description || t.remarks || "—")}${BLANK}${BLANK}${BLANK}${BLANK}</tr>`;
          });
        }

        // Calls - Soft Sky Blue
        const empCalls = callsHistory.filter((c: any) => {
          const cn = (c.callerName || c.employeeName || "").toLowerCase().trim();
          return cn === emp.name.toLowerCase().trim() && matchDateFilter(c.callDate);
        }).sort((a: any, b: any) => new Date(b.callDate).getTime() - new Date(a.callDate).getTime());

        html += `<tr>${TH("Call Date", "#e0f2fe", "#0369a1")}${TH("Bank Name", "#e0f2fe", "#0369a1")}${TH("Branch", "#e0f2fe", "#0369a1")}${TH("Log Type", "#e0f2fe", "#0369a1")}${TH("Call Status", "#e0f2fe", "#0369a1")}${TH("Conversation / Remarks", "#e0f2fe", "#0369a1")}${BLANK}${BLANK}${BLANK}${BLANK}</tr>`;
        if (empCalls.length === 0) {
          html += `<tr><td colspan="6" style="color:#94a3b8;padding:6px 8px;font-style:italic;border:1px solid #e2e8f0;">No calls found in selected period.</td>${BLANK}${BLANK}${BLANK}${BLANK}</tr>`;
        } else {
          empCalls.forEach((c: any) => {
            const cBg = (c.callStatus || "").toLowerCase().includes("connect") ? "background:#d1fae5;color:#065f46;" : "";
            html += `<tr>${TD(fmtDate(c.callDate))}${TD(c.bankName || "—", "font-weight:bold;")}${TD(c.branchName || "General")}${TD(c.logType || "Call Log")}${TD(c.callStatus || "—", cBg + "text-align:center;font-weight:bold;")}${TD(c.conversationDetails || c.remarks || "—")}${BLANK}${BLANK}${BLANK}${BLANK}</tr>`;
          });
        }

        // Payments - Soft Emerald Green
        const empPayments = paymentsHistory.filter((p: any) => {
          const ln = (p.receivedBy || p.employeeName || p.callerName || "").toLowerCase().trim();
          return ln === emp.name.toLowerCase().trim() && matchDateFilter(p.paymentDate);
        }).sort((a: any, b: any) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime());

        html += `<tr>${TH("Payment Date", "#d1fae5", "#065f46")}${TH("Bank Name", "#d1fae5", "#065f46")}${TH("Branch", "#d1fae5", "#065f46")}${TH("Amount (₹)", "#d1fae5", "#065f46")}${TH("Mode", "#d1fae5", "#065f46")}${TH("Transaction ID", "#d1fae5", "#065f46")}${BLANK}${BLANK}${BLANK}${BLANK}</tr>`;
        if (empPayments.length === 0) {
          html += `<tr><td colspan="6" style="color:#94a3b8;padding:6px 8px;font-style:italic;border:1px solid #e2e8f0;">No payments logged in selected period.</td>${BLANK}${BLANK}${BLANK}${BLANK}</tr>`;
        } else {
          empPayments.forEach((p: any) => {
            html += `<tr>${TD(fmtDate(p.paymentDate))}${TD(p.bankName || "—", "font-weight:bold;")}${TD(p.branchName || "General")}${TD("₹" + Number(p.amount || 0).toLocaleString("en-IN"), "color:#059669;font-weight:bold;text-align:right;")}${TD(p.paymentMode || "—")}${TD(p.transactionId || "—")}${BLANK}${BLANK}${BLANK}${BLANK}</tr>`;
          });
        }

        // SOD / EOD Attendance - Soft Purple
        const empSods = (reports.sod || []).filter((s: any) => {
          const sid = (typeof s.employee === "object" ? (s.employee?.id || "") : s.employee)?.toString();
          return sid === emp.id.toString() && matchDateFilter(s.date);
        }).sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());

        if (empSods.length > 0) {
          html += `<tr>${TH("Attendance Date", "#f3e8ff", "#6b21a8")}${TH("SOD Time", "#f3e8ff", "#6b21a8")}${TH("EOD Time", "#f3e8ff", "#6b21a8")}${TH("Planned Task Type", "#f3e8ff", "#6b21a8")}${TH("SOD Summary", "#f3e8ff", "#6b21a8")}${TH("GPS Coordinates", "#f3e8ff", "#6b21a8")}${BLANK}${BLANK}${BLANK}${BLANK}</tr>`;
          empSods.forEach((s: any) => {
            const eod = (reports.eod || []).find((e: any) => {
              const eid = (typeof e.employee === "object" ? (e.employee?.id || "") : e.employee)?.toString();
              return eid === emp.id.toString() && new Date(e.date).toDateString() === new Date(s.date).toDateString();
            });
            const gps = s.latitude && s.longitude ? `${Number(s.latitude).toFixed(4)}, ${Number(s.longitude).toFixed(4)}` : "—";
            html += `<tr>${TD(fmtDate(s.date))}${TD(fmtTime(s.createdAt), "text-align:center;")}${TD(eod ? fmtTime(eod.createdAt) : "Not Marked", `text-align:center;${!eod ? "color:#dc2626;" : ""}`)}${TD(s.taskType || "—")}${TD(s.taskSummary || "—")}${TD(gps)}${BLANK}${BLANK}${BLANK}${BLANK}</tr>`;
          });
        }

        html += `<tr><td colspan="10" style="height:12px;border:none;"></td></tr>`;
      });

      html += `</table></body></html>`;

      const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const fileDate = dateFilterType === "custom" ? `${startDateFilter || "start"}_to_${endDateFilter || "end"}` : dateFilterType;
      link.setAttribute("href", url);
      link.setAttribute("download", `Work_Report_${fileDate}_${new Date().toISOString().split("T")[0]}.xls`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Failed to export employee work summary:", error);
    }
  };

  const exportEodRegistry = () => {
    try {
      const activeCols = availableColumnsList.filter(c => selectedExportColumns[c.key]);
      if (activeCols.length === 0) {
        alert("⚠️ Please select at least 1 column to export.");
        return;
      }

      // 1. Sort existing records ascending by date
      const sortedRecords = [...filteredList].sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());

      // 2. Map dateStr -> record item
      const recordMap = new Map<string, any>();
      sortedRecords.forEach(item => {
        const dObj = new Date(item.date);
        const dateKey = `${dObj.getFullYear()}-${String(dObj.getMonth() + 1).padStart(2, '0')}-${String(dObj.getDate()).padStart(2, '0')}`;
        recordMap.set(dateKey, item);
      });

      // Fallback employee info
      const fallbackEmp = sortedRecords.find(r => r.employee?.name)?.employee || { name: "N/A", email: "N/A", department: "General" };

      // Determine full month or custom date range bounds
      let startDateObj: Date | null = null;
      let endDateObj: Date | null = null;

      const now = new Date();
      if (dateFilterType === "current-month") {
        startDateObj = new Date(now.getFullYear(), now.getMonth(), 1);
        endDateObj = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      } else if (dateFilterType === "custom" && startDateFilter && endDateFilter) {
        startDateObj = new Date(startDateFilter);
        endDateObj = new Date(endDateFilter);
      } else if (sortedRecords.length > 0) {
        const firstD = new Date(sortedRecords[0].date);
        const lastD = new Date(sortedRecords[sortedRecords.length - 1].date);
        startDateObj = new Date(firstD.getFullYear(), firstD.getMonth(), 1);
        endDateObj = new Date(lastD.getFullYear(), lastD.getMonth() + 1, 0);
      } else {
        startDateObj = new Date(now.getFullYear(), now.getMonth(), 1);
        endDateObj = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      }

      const exportList: any[] = [];
      if (startDateObj && endDateObj && !isNaN(startDateObj.getTime()) && !isNaN(endDateObj.getTime())) {
        const curr = new Date(startDateObj);
        const last = new Date(endDateObj);
        curr.setHours(0, 0, 0, 0);
        last.setHours(0, 0, 0, 0);

        while (curr <= last) {
          const dateKey = `${curr.getFullYear()}-${String(curr.getMonth() + 1).padStart(2, '0')}-${String(curr.getDate()).padStart(2, '0')}`;
          const existingItem = recordMap.get(dateKey);

          if (existingItem) {
            exportList.push(existingItem);
          } else {
            exportList.push({
              date: new Date(curr),
              employee: fallbackEmp,
              sod: null,
              eod: null,
              tasks: [],
              fieldVisits: []
            });
          }
          curr.setDate(curr.getDate() + 1);
        }
      } else {
        exportList.push(...sortedRecords);
      }

      let totalWorkHoursSum = 0;
      let totalFieldKmSum = 0;

      const parseTaskSummary = (text: string) => {
        if (!text) return "";
        let raw = text.trim();
        if (raw.startsWith("[") || raw.startsWith("{")) {
          try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed) && parsed.length > 0) {
              raw = parsed.map((p: any) => p.note || p.text || p.description || p.summary || "").filter(Boolean).join(", ") || raw;
            } else if (parsed && typeof parsed === "object") {
              raw = parsed.note || parsed.text || parsed.description || parsed.summary || raw;
            }
          } catch (_) {}
        }
        return raw.replace(/(\r\n|\n|\r)/gm, " ").trim();
      };

      const rows: { isSunday: boolean; rowStyle: string; values: Record<string, string> }[] = exportList.map((item: any) => {
        const dObj = new Date(item.date);
        const isSunday = dObj.getDay() === 0;

        // Sunday styling: Light Green background (#d1fae5)
        const rowStyle = isSunday
          ? "background-color: #d1fae5; color: #065f46; font-weight: bold;"
          : "";

        const dateStr = dObj.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
        const empName = item.employee?.name || "Unknown";
        const empEmail = item.employee?.email || "—";
        const empDept = item.employee?.department || "General";

        let attendanceStatus = "Absent";
        if (isSunday) attendanceStatus = "Sunday";
        else if (item.sod) attendanceStatus = "Present";
        else if (item.eod) attendanceStatus = "Present (EOD Only)";
        else if (item.tasks && item.tasks.length > 0) attendanceStatus = "Tasks Only";

        const sodTimeStr = isSunday ? "Sunday" : (item.sod ? formatTimeTo12Hour(item.sod.createdAt) : "—");
        const sodTaskType = isSunday ? "Sunday" : (item.sod?.taskType || "—");
        const sodSummary = isSunday ? "Sunday" : (item.sod?.taskSummary || item.sod?.remarks || "—");

        const eodTimeStr = isSunday ? "Sunday" : (item.eod ? formatTimeTo12Hour(item.eod.createdAt) : "—");
        const completedWork = isSunday ? "Sunday" : (item.eod?.completedWork || item.eod?.outcomes || "—");
        const pendingTargets = isSunday ? "Sunday" : (item.eod?.pendingTargets || item.eod?.pendingWork || "—");
        const tomorrowPlan = isSunday ? "Sunday" : (item.eod?.tomorrowPlan || item.eod?.nextDayPlan || "—");
        const issuesFaced = isSunday ? "Sunday" : (item.eod?.issuesFaced || item.eod?.blockers || "—");
        const escalation = isSunday ? "Sunday" : (item.eod?.escalationRequired || item.eod?.escalation || "No");

        let durationStr = "—";
        let numericHours = 0;

        if (!isSunday) {
          if (item.eod?.hoursWorked || item.eod?.totalHours || item.eod?.workHours) {
            const val = Number(item.eod.hoursWorked || item.eod.totalHours || item.eod.workHours);
            if (!isNaN(val) && val > 0) {
              numericHours = val;
              durationStr = `${val.toFixed(2)} Hrs`;
            }
          } else if (item.sod?.createdAt && item.eod?.createdAt) {
            const sodMs = new Date(item.sod.createdAt).getTime();
            const eodMs = new Date(item.eod.createdAt).getTime();
            if (eodMs > sodMs) {
              const diffHours = (eodMs - sodMs) / (1000 * 60 * 60);
              numericHours = diffHours;
              durationStr = `${diffHours.toFixed(2)} Hrs`;
            }
          }
          if (durationStr === "—" && item.tasks && item.tasks.length > 0) {
            const totalTaskSeconds = item.tasks.reduce((sum: number, t: any) => sum + (t.elapsedSeconds || 0), 0);
            if (totalTaskSeconds > 0) {
              numericHours = totalTaskSeconds / 3600;
              durationStr = `${numericHours.toFixed(2)} Hrs`;
            }
          }
        } else {
          durationStr = "Sunday";
        }

        totalWorkHoursSum += numericHours;

        const tasksDetails = isSunday ? "Sunday" : (item.tasks && item.tasks.length > 0
          ? item.tasks.map((t: any, index: number) => {
            let suffix = "";
            if (t.updatedAt && new Date(t.updatedAt).toDateString() !== item.date.toDateString() && item.date.toDateString() === new Date(t.date).toDateString()) {
              const dSuffix = new Date(t.updatedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
              suffix = ` (Shifted to ${dSuffix})`;
            }
            const cleanDesc = parseTaskSummary(t.description || t.progressNotes || t.remarks);
            const workSummary = cleanDesc ? ` [Summary: ${cleanDesc}]` : "";
            return `${index + 1}. [${t.status || 'Pending'}] ${t.taskTitle || 'Task'} (${t.taskType || 'General'})${workSummary}${suffix}`;
          }).join("\n")
          : "—");

        const fieldVisitKm = isSunday ? 0 : (item.fieldVisits && item.fieldVisits.length > 0
          ? item.fieldVisits.reduce((sum: number, v: any) => sum + (v.distance_travelled || 0), 0)
          : 0);
        totalFieldKmSum += fieldVisitKm;

        const fieldVisitDetails = isSunday ? "Sunday" : (item.fieldVisits && item.fieldVisits.length > 0
          ? item.fieldVisits.map((v: any, index: number) => `${index + 1}. Client: ${v.client_name || "N/A"}, Purpose: ${v.purpose || "N/A"}, Dist: ${v.distance_travelled || 0} KM, Notes: ${v.visit_notes || "N/A"}`).join("\n")
          : "—");

        const gpsCoords = isSunday ? "Sunday" : (item.sod?.latitude && item.sod?.longitude
          ? `${Number(item.sod.latitude).toFixed(4)}, ${Number(item.sod.longitude).toFixed(4)}`
          : "—");

        const values: Record<string, string> = {
          date: dateStr,
          empName,
          empEmail,
          department: empDept,
          attendanceStatus,
          sodTime: sodTimeStr,
          sodTaskType,
          sodSummary,
          eodTime: eodTimeStr,
          duration: durationStr,
          completedWork,
          pendingTargets,
          tomorrowPlan,
          issuesFaced,
          escalation,
          tasksDetails,
          fieldVisitKm: isSunday ? "Sunday" : (fieldVisitKm > 0 ? `${fieldVisitKm.toFixed(2)} KM` : "0 KM"),
          fieldVisitDetails,
          gpsLocation: gpsCoords,
        };

        return { isSunday, rowStyle, values };
      });

      // Construct native Excel HTML
      const TH = (text: string) => `<th style="background:#714B67;color:#ffffff;font-weight:bold;border:1px solid #5F3F56;padding:8px 10px;text-align:left;vertical-align:middle;white-space:nowrap;">${text}</th>`;

      let html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">`;
      html += `<head><meta charset="utf-8"><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Work Report</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head><body>`;
      html += `<table border="1" style="border-collapse:collapse;font-family:'Segoe UI',Arial,sans-serif;font-size:11px;">`;

      // Header row
      html += `<tr style="height:32px;">${activeCols.map(c => TH(c.label)).join("")}</tr>`;

      // Data rows
      rows.forEach(r => {
        const bgStyle = r.rowStyle ? `style="${r.rowStyle}"` : "";
        html += `<tr ${bgStyle}>`;
        activeCols.forEach(c => {
          const valStr = String(r.values[c.key] ?? "—");
          const isMultiLine = valStr.includes("\n");
          const formattedCell = isMultiLine
            ? valStr.replace(/\n/g, '<br style="mso-data-placement:same-cell;" />')
            : valStr;
          const sundayTdStyle = r.isSunday ? "background-color:#d1fae5;color:#065f46;font-weight:bold;" : "";
          const style = isMultiLine
            ? `border:1px solid #cbd5e1;padding:6px;text-align:left;vertical-align:top;white-space:pre-wrap;${sundayTdStyle}`
            : `border:1px solid #cbd5e1;padding:6px;text-align:left;vertical-align:middle;white-space:nowrap;${sundayTdStyle}`;
          html += `<td style="${style}">${formattedCell}</td>`;
        });
        html += `</tr>`;
      });

      // Bottom TOTAL SUM row
      const totalHoursFormatted = totalWorkHoursSum > 0 ? `${totalWorkHoursSum.toFixed(2)} Hrs` : "0.00 Hrs";
      const totalKmFormatted = totalFieldKmSum > 0 ? `${totalFieldKmSum.toFixed(2)} KM` : "0 KM";

      html += `<tr style="height:34px;background-color:#f1f5f9;font-weight:bold;border-top:2px solid #714B67;">`;
      activeCols.forEach(c => {
        let text = "";
        if (c.key === "date" || c.key === "empName") text = "TOTAL SUM";
        else if (c.key === "duration") text = totalHoursFormatted;
        else if (c.key === "fieldVisitKm") text = totalKmFormatted;
        html += `<td style="border:1px solid #cbd5e1;padding:8px;font-weight:extrabold;background-color:#f1f5f9;color:#1e293b;vertical-align:middle;">${text}</td>`;
      });
      html += `</tr>`;

      html += `</table></body></html>`;

      const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const fileDate = dateFilterType === "custom" ? `${startDateFilter || "start"}_to_${endDateFilter || "end"}` : dateFilterType;
      link.setAttribute("href", url);
      link.setAttribute("download", `Full_Month_Work_Report_${fileDate}_${new Date().toISOString().split("T")[0]}.xls`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      triggerToast?.("Full month work report exported successfully with selected columns.");
    } catch (err) {
      console.error("Export error:", err);
    }
  };

  // Filter logic

  const matchDateFilter = useCallback((dateInput: any) => {
    if (!dateInput) return false;
    const itemDate = new Date(dateInput);
    if (dateFilterType === "current-month") {
      const now = new Date();
      return itemDate.getFullYear() === now.getFullYear() && itemDate.getMonth() === now.getMonth();
    } else if (dateFilterType === "custom") {
      if (!startDateFilter && !endDateFilter) return true;
      const itemTime = itemDate.getTime();
      if (startDateFilter) {
        const start = new Date(startDateFilter);
        start.setHours(0, 0, 0, 0);
        if (itemTime < start.getTime()) return false;
      }
      if (endDateFilter) {
        const end = new Date(endDateFilter);
        end.setHours(23, 59, 59, 999);
        if (itemTime > end.getTime()) return false;
      }
      return true;
    }
    return true; // "overall"
  }, [dateFilterType, startDateFilter, endDateFilter]);

  const filteredList = mergedList.filter((item: any) => {
    const empName = item.employee?.name || "";
    const empEmail = item.employee?.email || "";
    const matchSearch = empName.toLowerCase().includes(searchTerm.toLowerCase()) || empEmail.toLowerCase().includes(searchTerm.toLowerCase());

    const matchDate = matchDateFilter(item.date);

    const empId = item.employee
      ? (typeof item.employee === "object" ? (item.employee.id || item.employee.id || "") : item.employee).toString().trim()
      : "";
    const fullUser = users.find((u: any) => u.id?.toString() === empId);

    // Status filter: by default only show active/non-inactive users
    // If a specific user is selected OR status filter is not 'active', allow inactive through
    const empStatus = (fullUser?.status || item.employee?.status || "active").toLowerCase();
    const isInactiveEmp = empStatus === "inactive" || empStatus === "archived";
    let matchStatus = true;
    if (!selectedUser) {
      if (userStatusFilter === "active" && isInactiveEmp) matchStatus = false;
      if (userStatusFilter === "inactive" && !isInactiveEmp) matchStatus = false;
    }

    let matchCompany = true;
    if (isOwner && selectedCompany) {
      matchCompany = isUserInCompany(fullUser || item.employee, selectedCompany);
    }

    let matchUser = true;
    if (isOwner && selectedUser) {
      matchUser = empId === selectedUser.toString().trim();
    }

    let matchDept = true;
    if (isOwner && selectedDept) {
      const dept = (fullUser?.department || item.employee?.department || "");
      matchDept = dept === selectedDept;
    }

    let matchSubTab = true;
    const hasTasks = item.tasks && item.tasks.length > 0;
    const hasFieldVisits = item.fieldVisits && item.fieldVisits.length > 0;
    if (activeSubTab === "sod") {
      matchSubTab = !!item.sod;
    } else if (activeSubTab === "eod") {
      matchSubTab = !!item.eod;
    }

    return matchSearch && matchDate && matchCompany && matchUser && matchSubTab && matchDept && matchStatus;
  });

  const visualStats = React.useMemo(() => {
    const employeeMap = new Map<string, {
      id: string;
      name: string;
      email: string;
      department: string;
      callsCount: number;
      tasksDone: number;
      tasksPending: number;
      leadsSelected: number;
      leadsRejected: number;
      sodCount: number;
      eodCount: number;
      totalWorkMs: number;
      profilePhoto: string;
      role: string;
    }>();

    const empCountedTaskIds = new Map<string, Set<string>>();

    users.forEach((u: any) => {
      const empId = u.id?.toString() || "";
      if (selectedCompany && !isUserInCompany(u, selectedCompany)) return;
      if (selectedDept && u.department !== selectedDept) return;
      // Exclude inactive from default view unless filter or specific user selected
      const empStatus = (u.status || "active").toLowerCase();
      const isInactiveU = empStatus === "inactive" || empStatus === "archived";
      if (isInactiveU && !selectedUser && userStatusFilter === "active") return;
      if (isInactiveU && !selectedUser && userStatusFilter === "inactive") {
        // Only include inactive users in visualStats when filter is set to inactive/all
      }
      if (!isInactiveU && !selectedUser && userStatusFilter === "inactive") return;

      employeeMap.set(empId, {
        id: empId,
        name: u.name,
        email: u.email || "",
        department: u.department || "General",
        callsCount: 0,
        tasksDone: 0,
        tasksPending: 0,
        leadsSelected: 0,
        leadsRejected: 0,
        sodCount: 0,
        eodCount: 0,
        totalWorkMs: 0,
        profilePhoto: u.profile?.profilePhoto || "",
        role: u.role || ""
      });
    });

    // Also ensure employees with past reports are included in employeeMap even if inactive
    mergedList.forEach((item: any) => {
      if (!item.employee?.id) return;
      const empId = item.employee.id.toString();
      if (employeeMap.has(empId)) return; // Already added
      if (selectedCompany && !isUserInCompany(item.employee, selectedCompany)) return;
      if (selectedDept && item.employee.department !== selectedDept) return;
      // Only add if the user filter asks for them
      const empStatus = (item.employee.status || "active").toLowerCase();
      const isInactiveRep = empStatus === "inactive" || empStatus === "archived";
      if (!selectedUser && userStatusFilter === "active" && isInactiveRep) return;
      if (!selectedUser && userStatusFilter === "inactive" && !isInactiveRep) return;

      const dbUser = users.find((u: any) => u.id?.toString() === empId);
      employeeMap.set(empId, {
        id: empId,
        name: item.employee.name || "Unknown",
        email: item.employee.email || "",
        department: item.employee.department || dbUser?.department || "General",
        callsCount: 0,
        tasksDone: 0,
        tasksPending: 0,
        leadsSelected: 0,
        leadsRejected: 0,
        sodCount: 0,
        eodCount: 0,
        totalWorkMs: 0,
        profilePhoto: dbUser?.profile?.profilePhoto || "",
        role: item.employee.role || dbUser?.role || ""
      });
    });

    // Unfiltered by selectedUser for employee listing details
    const statsList = mergedList.filter((item: any) => {
      if (!matchDateFilter(item.date)) return false;
      const empId = item.employee
        ? (typeof item.employee === "object" ? (item.employee.id || item.employee.id || "") : item.employee).toString().trim()
        : "";
      const fullUser = users.find((u: any) => u.id?.toString() === empId);
      if (selectedCompany && (!fullUser || !isUserInCompany(fullUser, selectedCompany))) return false;
      if (selectedDept && (!fullUser || fullUser.department !== selectedDept)) return false;
      return true;
    });

    statsList.forEach((item: any) => {
      const empId = item.employee
        ? (typeof item.employee === "object" ? (item.employee.id || item.employee.id || "") : item.employee).toString().trim()
        : "";
      if (empId) {
        const empStats = employeeMap.get(empId);
        if (empStats) {
          if (item.sod) empStats.sodCount++;
          if (item.eod) empStats.eodCount++;

          if (item.sod && item.eod) {
            const sodTime = new Date(item.sod.createdAt).getTime();
            const eodTime = new Date(item.eod.createdAt).getTime();
            const diff = eodTime - sodTime;
            if (diff > 0) {
              empStats.totalWorkMs += diff;
            }
          }

          if (item.tasks) {
            item.tasks.forEach((t: any) => {
              const taskId = t.id?.toString();
              if (taskId) {
                let uniqueSet = empCountedTaskIds.get(empId);
                if (!uniqueSet) {
                  uniqueSet = new Set<string>();
                  empCountedTaskIds.set(empId, uniqueSet);
                }
                if (uniqueSet.has(taskId)) return; // Skip duplicates
                uniqueSet.add(taskId);
              }
              const statusClean = (t.status || "").toLowerCase().trim();
              if (statusClean === "done" || statusClean === "completed") {
                empStats.tasksDone++;
              } else {
                empStats.tasksPending++;
              }
            });
          }
        }
      }
    });

    // For Owner-role employees: count tasks they assigned (with date filter applied)
    employeeMap.forEach((empStats) => {
      if (empStats.role === "Owner") {
        empStats.tasksDone = 0;
        empStats.tasksPending = 0;
        (reports.tasks || []).forEach((task: any) => {
          const assignerId = task.assignedBy?.toString().trim() || "";
          if (assignerId !== empStats.id) return;
          if (!matchDateFilter(task.date)) return;
          const statusClean = (task.status || "").toLowerCase().trim();
          if (statusClean === "done" || statusClean === "completed") {
            empStats.tasksDone++;
          } else {
            empStats.tasksPending++;
          }
        });
      }
    });

    const statsCalls = callsHistory.filter((call: any) => {
      if (!matchDateFilter(call.callDate)) return false;
      const callerName = (call.callerName || call.employeeName || "").toLowerCase().trim();
      if (!callerName) return false;

      const callerProfile = users.find(u => u.name.toLowerCase().trim() === callerName);
      if (selectedCompany && (!callerProfile || !isUserInCompany(callerProfile, selectedCompany))) return false;
      if (selectedDept && (!callerProfile || callerProfile.department !== selectedDept)) return false;
      return true;
    });

    const statsPayments = paymentsHistory.filter((pay: any) => {
      if (!matchDateFilter(pay.paymentDate)) return false;
      const callerName = (pay.callerName || pay.employeeName || "").toLowerCase().trim();
      if (!callerName) return false;

      const callerProfile = users.find(u => u.name.toLowerCase().trim() === callerName);
      if (selectedCompany && (!callerProfile || !isUserInCompany(callerProfile, selectedCompany))) return false;
      if (selectedDept && (!callerProfile || callerProfile.department !== selectedDept)) return false;
      return true;
    });

    statsCalls.forEach((call: any) => {
      const callerName = (call.callerName || call.employeeName || "").toLowerCase().trim();
      for (const empStats of employeeMap.values()) {
        if (empStats.name.toLowerCase().trim() === callerName) {
          empStats.callsCount++;
          break;
        }
      }
    });

    let globalLeadsSelected = 0;
    let globalLeadsRejected = 0;
    candidatesList.forEach((c: any) => {
      const statusClean = (c.status || "").toLowerCase();
      if (statusClean.includes("selected") || statusClean === "hired") {
        globalLeadsSelected++;
      } else if (statusClean.includes("rejected")) {
        globalLeadsRejected++;
      }
    });

    const branchMap = new Map<string, {
      key: string;
      bankName: string;
      branchName: string;
      callsCount: number;
      amountRecovered: number;
    }>();

    // For branches Recovery list, we filter by selectedUser if it is set
    const filteredCallsForBranches = statsCalls.filter((call: any) => {
      if (!selectedUser) return true;
      const callerName = (call.callerName || call.employeeName || "").toLowerCase().trim();
      const callerProfile = users.find(u => u.name.toLowerCase().trim() === callerName);
      return callerProfile && callerProfile.id?.toString() === selectedUser.toString();
    });

    const filteredPaymentsForBranches = statsPayments.filter((pay: any) => {
      if (!selectedUser) return true;
      const callerName = (pay.callerName || pay.employeeName || "").toLowerCase().trim();
      const callerProfile = users.find(u => u.name.toLowerCase().trim() === callerName);
      return callerProfile && callerProfile.id?.toString() === selectedUser.toString();
    });

    filteredCallsForBranches.forEach((call: any) => {
      let bName = call.branchName || "General";
      let bkName = call.bankName || "Unknown Bank";

      const key = `${bkName}_${bName}`.toLowerCase().trim();
      if (!branchMap.has(key)) {
        branchMap.set(key, {
          key,
          bankName: bkName,
          branchName: bName,
          callsCount: 0,
          amountRecovered: 0
        });
      }
      branchMap.get(key)!.callsCount++;
    });

    filteredPaymentsForBranches.forEach((pay: any) => {
      let bName = pay.branchName || "General";
      let bkName = pay.bankName || "Unknown Bank";

      const key = `${bkName}_${bName}`.toLowerCase().trim();
      if (!branchMap.has(key)) {
        branchMap.set(key, {
          key,
          bankName: bkName,
          branchName: bName,
          callsCount: 0,
          amountRecovered: 0
        });
      }
      branchMap.get(key)!.amountRecovered += Number(pay.amount || 0);
    });

    const employeesData = Array.from(employeeMap.values()).sort((a, b) =>
      (b.callsCount + b.tasksDone + b.sodCount) - (a.callsCount + a.tasksDone + a.sodCount)
    );
    const branchesData = Array.from(branchMap.values()).sort((a, b) => b.amountRecovered - a.amountRecovered);

    // Calculate totals for Count Boxes
    let totalCalls = 0;
    let totalPayments = 0;
    let totalTasksDone = 0;
    let totalTasksPending = 0;

    const allCandidateNames = new Set<string>();
    candidatesList.forEach((c: any) => {
      if (c.name) allCandidateNames.add(c.name.trim().toLowerCase());
    });
    (reports.tasks || []).forEach((t: any) => {
      if (t.taskType === "CALL" && t.description?.includes("Lead ID:")) {
        const match = t.description.match(/Candidate Name:\s*([^\n\r]+)/i);
        if (match && match[1]) {
          allCandidateNames.add(match[1].trim().toLowerCase());
        }
      }
    });

    const uniqueCalledCandidates = new Set<string>();
    const statsHrCalls = (reports.tasks || []).filter((t: any) => {
      if (!matchDateFilter(t.date)) return false;

      const callerId = (typeof t.employee === "object" ? (t.employee?.id || "") : t.employee)?.toString().trim();
      if (!callerId) return false;

      const callerProfile = users.find(u => u.id?.toString() === callerId);
      if (selectedCompany && (!callerProfile || !isUserInCompany(callerProfile, selectedCompany))) return false;
      if (selectedDept && (!callerProfile || callerProfile.department !== selectedDept)) return false;
      if (selectedUser && callerId !== selectedUser.toString()) return false;

      // Direct lead calls
      if (t.taskType === "CALL" && t.description?.includes("Lead ID:")) {
        const desc = t.description || "";
        const nameMatch = desc.match(/Candidate Name:\s*([^\n\r]+)/i);
        const platMatch = desc.match(/Platform:\s*([^\n\r]+)/i);

        const candName = nameMatch ? nameMatch[1].trim().toLowerCase() : "";
        const platform = platMatch ? platMatch[1].trim().toLowerCase() : "general";

        if (candName) {
          uniqueCalledCandidates.add(`${candName}_${platform}`);
        }
        return true;
      }

      // SOD / manual tasks
      const tTitle = (t.taskTitle || "").toLowerCase();
      const tDesc = (t.description || "").toLowerCase();
      const hasCallKeyword = /call|interview|intv|telecall|talk|ring|contact|schedule|connect|reach/i.test(tTitle + " " + tDesc);
      if (!hasCallKeyword) return false;

      let matched = false;
      for (const name of allCandidateNames) {
        if (name.length >= 3 && (tTitle.includes(name) || tDesc.includes(name))) {
          // If this name has been called via direct logs, associate it with that platform
          let foundPlat = false;
          (reports.tasks || []).forEach((t2: any) => {
            if (t2.taskType === "CALL" && t2.description?.includes("Lead ID:")) {
              const desc2 = t2.description || "";
              const nameMatch2 = desc2.match(/Candidate Name:\s*([^\n\r]+)/i);
              const platMatch2 = desc2.match(/Platform:\s*([^\n\r]+)/i);
              if (nameMatch2 && nameMatch2[1].trim().toLowerCase() === name) {
                const plat = platMatch2 ? platMatch2[1].trim().toLowerCase() : "general";
                uniqueCalledCandidates.add(`${name}_${plat}`);
                foundPlat = true;
              }
            }
          });

          if (!foundPlat) {
            uniqueCalledCandidates.add(`${name}_sod`);
          }
          matched = true;
          break;
        }
      }
      return matched;
    });

    if (selectedUser) {
      const empStats = employeeMap.get(selectedUser.toString());
      if (empStats) {
        totalCalls = empStats.callsCount;
        totalTasksDone = empStats.tasksDone;
        totalTasksPending = empStats.tasksPending;
        totalPayments = filteredPaymentsForBranches.reduce((sum, p) => sum + Number(p.amount || 0), 0);
      }
    } else {
      totalCalls = statsCalls.length;
      totalPayments = statsPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
      totalTasksDone = employeesData.reduce((sum, e) => sum + e.tasksDone, 0);
      totalTasksPending = employeesData.reduce((sum, e) => sum + e.tasksPending, 0);
    }

    return {
      employeesData,
      branchesData,
      totalCalls,
      totalPayments,
      totalTasksDone,
      totalTasksPending,
      globalLeadsSelected,
      globalLeadsRejected,
      totalHrCalls: statsHrCalls.length
    };
  }, [users, filteredList, callsHistory, paymentsHistory, candidatesList, selectedCompany, selectedDept, selectedUser, matchDateFilter, reports]);

  return (
    <div className="space-y-6 animate-fadeIn text-slate-800">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-850">Work Reports</h1>
          <p className="text-xs text-slate-500 mt-1">
            {isOwner ? "View daily Start of Day (SOD) and End of Day (EOD) logs submitted by all staff members." : "Track your daily SOD planning and EOD submissions."}
          </p>
        </div>

        <div className="flex flex-wrap gap-2 items-center self-start md:self-auto">
          {activeSubTab !== "visual-dashboard" && (
            <button
              onClick={exportConsolidatedExcel}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-black shadow-md shadow-emerald-600/10 flex items-center gap-1.5 transition-all"
            >
              <Download className="w-4 h-4" /> Export
            </button>
          )}

          {/* Sub-Tabs */}
          <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
            <button
              onClick={() => setActiveSubTab("visual-dashboard")}
              className={`px-4 py-2 text-xs font-black rounded-md transition-all ${activeSubTab === "visual-dashboard"
                ? "bg-[#714B67] text-white shadow-md"
                : "text-slate-655 hover:text-[#714B67]"
                }`}
            >
              📊 Visual Dashboard
            </button>
            <button
              onClick={() => setActiveSubTab("sod")}
              className={`px-4 py-2 text-xs font-black rounded-md transition-all ${activeSubTab === "sod"
                ? "bg-[#714B67] text-white shadow-md"
                : "text-slate-655 hover:text-[#714B67]"
                }`}
            >
              Start of Day (SOD)
            </button>
            <button
              onClick={() => setActiveSubTab("eod")}
              className={`px-4 py-2 text-xs font-black rounded-md transition-all ${activeSubTab === "eod"
                ? "bg-[#714B67] text-white shadow-md"
                : "text-slate-655 hover:text-[#714B67]"
                }`}
            >
              End of Day (EOD)
            </button>
            <button
              onClick={() => setActiveSubTab("attendance-calendar")}
              className={`px-4 py-2 text-xs font-black rounded-md transition-all ${activeSubTab === "attendance-calendar"
                ? "bg-[#714B67] text-white shadow-md"
                : "text-slate-655 hover:text-[#714B67]"
                }`}
            >
              Attendance Calendar
            </button>
          </div>
        </div>
      </div>

      {activeSubTab === "visual-dashboard" ? (
        <div className="space-y-6 animate-fadeIn">
          {/* Filters Bar */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              {/* Date Filter Type Selector */}
              <div>
                <label className="block text-[9px] uppercase tracking-wider text-slate-400 font-black mb-1 font-mono">Date Range</label>
                <select
                  value={dateFilterType}
                  onChange={(e: any) => setDateFilterType(e.target.value)}
                  className="bg-slate-50 hover:bg-slate-100 border border-slate-200 focus:border-[#714B67] rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:outline-none font-bold transition-all shadow-sm"
                >
                  <option value="overall">All Time</option>
                  <option value="current-month">Current Month</option>
                  <option value="custom">Custom Date Range</option>
                </select>
              </div>

              {/* Custom Date Inputs */}
              {dateFilterType === "custom" && (
                <div className="flex items-center gap-2">
                  <div>
                    <label className="block text-[8px] uppercase tracking-wider text-slate-400 font-bold mb-0.5">From</label>
                    <input
                      type="date"
                      value={startDateFilter}
                      onChange={(e) => setStartDateFilter(e.target.value)}
                      className="bg-white border border-slate-200 rounded-lg p-1.5 text-[10px] text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-[8px] uppercase tracking-wider text-slate-400 font-bold mb-0.5">To</label>
                    <input
                      type="date"
                      value={endDateFilter}
                      onChange={(e) => setEndDateFilter(e.target.value)}
                      className="bg-white border border-slate-200 rounded-lg p-1.5 text-[10px] text-slate-800"
                    />
                  </div>
                </div>
              )}

              {/* Department Dropdown */}
              <div>
                <label className="block text-[9px] uppercase tracking-wider text-slate-400 font-black mb-1 font-mono">Department</label>
                <select
                  value={selectedDept}
                  onChange={(e) => {
                    setSelectedDept(e.target.value);
                    setSelectedUser("");
                  }}
                  className="bg-slate-50 hover:bg-slate-100 border border-slate-200 focus:border-[#714B67] rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:outline-none font-bold transition-all shadow-sm"
                >
                  <option value="">All Departments</option>
                  {departmentsList.map((d: any) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              {/* User Dropdown */}
              <div>
                <label className="block text-[9px] uppercase tracking-wider text-slate-400 font-black mb-1 font-mono">Employee</label>
                <select
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                  className="bg-slate-50 hover:bg-slate-100 border border-slate-200 focus:border-[#714B67] rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:outline-none font-bold transition-all shadow-sm"
                >
                  <option value="">All Employees</option>
                  <optgroup label="Active Employees">
                    {uniqueUsersFromReports.activeList.map((u: any) => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </optgroup>
                  {uniqueUsersFromReports.inactiveList.length > 0 && (
                    <optgroup label="Inactive / Archived Employees">
                      {uniqueUsersFromReports.inactiveList.map((u: any) => (
                        <option key={u.id} value={u.id}>{u.name} (Archived / Inactive)</option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </div>

              {/* User Status Filter */}
              <div>
                <label className="block text-[9px] uppercase tracking-wider text-slate-400 font-black mb-1 font-mono">User Status</label>
                <select
                  value={userStatusFilter}
                  onChange={(e) => setUserStatusFilter(e.target.value as "active" | "inactive" | "all")}
                  className="bg-slate-50 hover:bg-slate-100 border border-slate-200 focus:border-[#714B67] rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:outline-none font-bold transition-all shadow-sm"
                >
                  <option value="active">Active Staff Only</option>
                  <option value="inactive">Inactive / Archived Staff</option>
                  <option value="all">All Staff (Active + Inactive)</option>
                </select>
              </div>
            </div>

            {/* Clear Filters Button */}
            {(searchTerm || selectedCompany || selectedDept || selectedUser || dateFilterType !== "current-month" || userStatusFilter !== "active") && (
              <button
                onClick={() => {
                  setSearchTerm("");
                  setSelectedCompany("");
                  setSelectedDept("");
                  setSelectedUser("");
                  setDateFilterType("current-month");
                  setStartDateFilter("");
                  setEndDateFilter("");
                  setUserStatusFilter("active");
                }}
                className="mt-4 md:mt-0 flex items-center gap-1.5 border border-rose-250 hover:bg-rose-50 text-rose-600 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Clear Filters
              </button>
            )}
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <div
              onClick={() => setSelectedDashboardCategory("staff")}
              className="bg-white border border-slate-200 p-4 rounded-xl flex items-center gap-3 shadow-sm cursor-pointer hover:bg-slate-50 transition-all hover:border-indigo-400 active:scale-[0.98]"
            >
              <div className="p-3 bg-purple-50 rounded-lg text-purple-650">
                <Users className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  {selectedUser ? "Active Staff" : "Total Staff"}
                </div>
                <div className="text-xs font-bold font-sans text-slate-800 leading-tight">
                  {selectedUser
                    ? (users.find(u => u.id?.toString() === selectedUser.toString())?.name || "Selected")
                    : `${visualStats.employeesData.length} Staff`
                  }
                </div>
              </div>
            </div>

            <div
              onClick={() => setSelectedDashboardCategory("calls")}
              className="bg-white border border-slate-200 p-4 rounded-xl flex items-center gap-3 shadow-sm cursor-pointer hover:bg-slate-50 transition-all hover:border-indigo-400 active:scale-[0.98]"
            >
              <div className="p-3 bg-indigo-50 rounded-lg text-indigo-650">
                <PhoneCall className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Bank Calls</div>
                <div className="text-xl font-bold font-serif text-slate-800">{visualStats.totalCalls}</div>
              </div>
            </div>

            <div
              onClick={() => setSelectedDashboardCategory("hrCalls")}
              className="bg-white border border-slate-200 p-4 rounded-xl flex items-center gap-3 shadow-sm cursor-pointer hover:bg-slate-50 transition-all hover:border-indigo-400 active:scale-[0.98]"
            >
              <div className="p-3 bg-sky-50 rounded-lg text-sky-650">
                <PhoneCall className="w-5 h-5 text-sky-600" />
              </div>
              <div>
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Interview Calls</div>
                <div className="text-xl font-bold font-serif text-slate-800">{visualStats.totalHrCalls}</div>
              </div>
            </div>

            <div
              onClick={() => setSelectedDashboardCategory("tasks")}
              className="bg-white border border-slate-200 p-4 rounded-xl flex items-center gap-3 shadow-sm cursor-pointer hover:bg-slate-50 transition-all hover:border-indigo-400 active:scale-[0.98]"
            >
              <div className="p-3 bg-emerald-50 rounded-lg text-emerald-650">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Tasks Completed</div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl font-bold font-serif text-slate-800">{visualStats.totalTasksDone}</span>
                  <span className="text-[10px] text-emerald-600 font-bold">
                    {(() => {
                      const tot = visualStats.totalTasksDone + visualStats.totalTasksPending;
                      return tot > 0 ? `${Math.round((visualStats.totalTasksDone / tot) * 100)}%` : "0%";
                    })()}
                  </span>
                </div>
              </div>
            </div>

            <div
              onClick={() => setSelectedDashboardCategory("pendingTasks")}
              className="bg-white border border-slate-200 p-4 rounded-xl flex items-center gap-3 shadow-sm cursor-pointer hover:bg-slate-50 transition-all hover:border-[#F43F5E] active:scale-[0.98]"
            >
              <div className="p-3 bg-rose-50 rounded-lg text-rose-650">
                <Clock className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Pending Tasks</div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl font-bold font-serif text-slate-800">{visualStats.totalTasksPending}</span>
                  <span className="text-[10px] text-rose-500 font-bold">
                    {(() => {
                      const tot = visualStats.totalTasksDone + visualStats.totalTasksPending;
                      return tot > 0 ? `${Math.round((visualStats.totalTasksPending / tot) * 100)}%` : "0%";
                    })()}
                  </span>
                </div>
              </div>
            </div>

            <div
              onClick={() => setSelectedDashboardCategory("payments")}
              className="bg-white border border-slate-200 p-4 rounded-xl flex items-center gap-3 shadow-sm cursor-pointer hover:bg-slate-50 transition-all hover:border-indigo-400 active:scale-[0.98]"
            >
              <div className="p-3 bg-amber-50 rounded-lg text-amber-650">
                <Banknote className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Payments Recovered</div>
                <div className="text-xl font-bold font-serif text-slate-800">Rs. {visualStats.totalPayments.toLocaleString()}</div>
              </div>
            </div>
          </div>

          {/* Employee Work Summary Table */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
              <h3 className="font-serif text-sm font-bold text-slate-800 flex items-center gap-1.5 font-sans">
                <Briefcase className="w-4 h-4 text-indigo-500" /> Employee Work Summary
              </h3>
              <div className="flex items-center gap-3">
                <button
                  onClick={exportMasterEmployeeReport}
                  disabled={exportingMasterReport}
                  className="bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white text-[10px] uppercase tracking-wider font-mono font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors shadow-sm"
                  title="Export attendance, timings, work activities and audit trail"
                >
                  {exportingMasterReport ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                  {exportingMasterReport ? "Preparing..." : "Master Export"}
                </button>
                <button
                  onClick={exportEmployeeWorkSummary}
                  className="bg-[#714B67] hover:bg-[#5D3E55] text-white text-[10px] uppercase tracking-wider font-mono font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors shadow-sm"
                  title="Export Employee Work Summary to Excel"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" /> Export Summary
                </button>
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-250 rounded-lg px-2.5 py-1 shadow-inner">
                  <Search className="w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search staff by name or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="bg-transparent border-none focus:outline-none text-xs text-slate-800 font-semibold w-48 placeholder:font-normal"
                  />
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/50 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-4">Employee</th>
                    <th className="py-3 px-4">Department</th>
                    <th className="py-3 px-4 text-center">Tasks Assigned</th>
                    <th className="py-3 px-4 text-center">Tasks Completed</th>
                    <th className="py-3 px-4 text-center">Pending Tasks</th>
                    <th className="py-3 px-4 text-center">Completion %</th>
                    <th className="py-3 px-4 text-center">Work Hours</th>
                    <th className="py-3 px-4 text-center">Productivity</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {visualStats.employeesData
                    .filter((emp) => {
                      // Hide Owner role from summary table
                      if (emp.role === "Owner") return false;
                      if (selectedUser && emp.id.toString() !== selectedUser.toString()) return false;
                      if (searchTerm) {
                        const term = searchTerm.toLowerCase().trim();
                        // Match if any word in the name starts with the search term
                        const nameWords = (emp.name || "").toLowerCase().split(/\s+/);
                        const nameMatch = nameWords.some((word: string) => word.startsWith(term));
                        // Match if email starts with the search term
                        const emailMatch = (emp.email || "").toLowerCase().startsWith(term);

                        if (!nameMatch && !emailMatch) return false;
                      }
                      return true;
                    })
                    .map((emp) => {
                      const totalTasks = emp.tasksDone + emp.tasksPending;
                      const completionPercent = totalTasks > 0 ? ((emp.tasksDone / totalTasks) * 100) : 0;
                      const productivity = completionPercent; // Base productivity on completion rate

                      let statusText = "Poor";
                      let statusClass = "bg-rose-50 text-rose-700 border-rose-200";
                      if (productivity >= 90) {
                        statusText = "Excellent";
                        statusClass = "bg-emerald-50 text-emerald-700 border-emerald-200";
                      } else if (productivity >= 70) {
                        statusText = "Good";
                        statusClass = "bg-blue-50 text-blue-700 border-blue-200";
                      } else if (productivity >= 50) {
                        statusText = "Average";
                        statusClass = "bg-amber-50 text-amber-700 border-amber-200";
                      }

                      // Format initials for avatar fallback
                      const initials = emp.name
                        .split(" ")
                        .map((n: string) => n[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase();

                      const formatWorkHours = (totalMs: number) => {
                        if (!totalMs || totalMs <= 0) return "0h 0m";
                        const totalMins = Math.floor(totalMs / (1000 * 60));
                        const hrs = Math.floor(totalMins / 60);
                        const mins = totalMins % 60;
                        return `${hrs}h ${mins}m`;
                      };

                      const isInactiveEmpRow = (() => {
                            const dbU = users.find((u: any) => u.id?.toString() === emp.id.toString());
                            const st = (dbU?.status || emp.role || "active").toLowerCase();
                            return st === "inactive" || st === "archived";
                          })();

                      return (
                        <React.Fragment key={emp.id}>
                          <tr
                            onClick={() => {
                              setExpandedUserRows(prev => ({
                                ...prev,
                                [emp.id]: !prev[emp.id]
                              }));
                            }}
                            className={`hover:bg-indigo-50/15 cursor-pointer transition-colors ${
                              isInactiveEmpRow
                                ? "bg-rose-50/70 border-l-2 border-l-rose-400"
                                : expandedUserRows[emp.id] ? "bg-indigo-50/10 font-bold" : ""
                              }`}
                          >
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full overflow-hidden border border-indigo-150 flex items-center justify-center bg-indigo-50 text-indigo-700 font-bold text-xs shrink-0 shadow-inner">
                                  {emp.profilePhoto ? (
                                    <img
                                      src={emp.profilePhoto}
                                      alt={emp.name}
                                      className="w-full h-full object-cover"
                                      onError={(e) => {
                                        (e.target as HTMLElement).style.display = "none";
                                      }}
                                    />
                                  ) : (
                                    <span>{initials || "?"}</span>
                                  )}
                                </div>
                                <div>
                                  <span className="font-bold text-slate-800 text-xs block">{emp.name}</span>
                                  <span className="text-[10px] text-slate-400 font-mono font-medium block mt-0.5">{emp.email}</span>
                                  {isInactiveEmpRow && (
                                    <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wide bg-rose-100 text-rose-700 border border-rose-200">INACTIVE</span>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="py-3.5 px-4 whitespace-nowrap font-semibold text-slate-655">
                              {emp.department}
                            </td>
                            <td className="py-3.5 px-4 text-center font-bold text-slate-800">
                              {totalTasks}
                            </td>
                            <td className="py-3.5 px-4 text-center font-bold text-emerald-600">
                              {emp.tasksDone}
                            </td>
                            <td className="py-3.5 px-4 text-center font-bold text-rose-500">
                              {emp.tasksPending}
                            </td>
                            <td className="py-3.5 px-4 text-center font-bold text-emerald-600">
                              {completionPercent.toFixed(1)}%
                            </td>
                            <td className="py-3.5 px-4 text-center font-bold text-slate-700">
                              {formatWorkHours(emp.totalWorkMs)}
                            </td>
                            <td className="py-3.5 px-4 text-center font-bold text-indigo-655">
                              {productivity.toFixed(1)}%
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold border ${statusClass}`}>
                                {statusText}
                              </span>
                            </td>
                          </tr>

                          {/* Expanded Row for Tasks Dropdown arranged day-by-day */}
                          {expandedUserRows[emp.id] && (
                            <tr className="bg-slate-50/25">
                              <td colSpan={9} className="p-4 border-b border-slate-200">
                                {(() => {
                                  // All employees (including those with assigned tasks) use filteredList
                                  // Tasks are already merged per employee per day in mergedList
                                  const empLogs = filteredList.filter(item => {
                                    const empIdStr = item.employee
                                      ? (typeof item.employee === "object" ? (item.employee.id || "") : item.employee).toString().trim()
                                      : "";
                                    return empIdStr === emp.id.toString();
                                  });
                                  const sortedLogs = [...empLogs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

                                  return (
                                    <div className="pl-4 pr-4 py-2 animate-fadeIn grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                                      {/* Left Column: Daily Activity & Check-In Logs */}
                                      <div className="lg:col-span-7 space-y-4">
                                        <div className="flex items-center justify-between border-b border-indigo-50 pb-2">
                                          <h4 className="text-[10px] font-black uppercase text-indigo-700 font-mono tracking-wider flex items-center gap-1.5">
                                            <Layers className="w-3.5 h-3.5 text-indigo-500" /> Daily Activity & Check-In Logs ({sortedLogs.length})
                                          </h4>
                                        </div>

                                        {sortedLogs.length === 0 ? (
                                          <div className="text-left py-4 text-slate-400 text-xs font-semibold">
                                            No presence or task entries found for this user in the selected date range.
                                          </div>
                                        ) : (
                                          <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1.5 scrollbar-thin">
                                            {sortedLogs.map((dayItem: any, dayIdx: number) => {
                                              const hasSod = !!dayItem.sod;
                                              const hasEod = !!dayItem.eod;
                                              const dayTasks = dayItem.tasks || [];
                                              const dayVisits = dayItem.fieldVisits || [];

                                              return (
                                                <div key={dayIdx} onClick={(e) => e.stopPropagation()} className="bg-white border border-slate-200 rounded-xl p-4 space-y-3.5 shadow-sm max-w-4xl cursor-default">
                                                  {/* Date Header */}
                                                  <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                                                    <span className="font-bold text-xs text-indigo-900 flex items-center gap-1">
                                                      📅 {new Date(dayItem.date).toLocaleDateString("en-IN", { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
                                                    </span>
                                                    <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${hasSod && hasEod ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
                                                      hasSod ? "bg-indigo-50 text-indigo-700 border border-indigo-200" : "bg-rose-50 text-rose-700 border-rose-200"
                                                      }`}>
                                                      {hasSod && hasEod ? "Completed" : hasSod ? "SOD Active" : "Absent"}
                                                    </span>
                                                  </div>

                                                  {/* SOD/EOD Times & GPS */}
                                                  {(
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-medium">
                                                      <div className="space-y-2">
                                                        <div className="flex items-center gap-2">
                                                          <strong>SOD Time:</strong>
                                                          <span className="text-slate-700">{hasSod ? formatTimeTo12Hour(dayItem.sod.createdAt) : "—"}</span>
                                                          {dayItem.sod?.selfieUrl && (
                                                            <img
                                                              src={dayItem.sod.selfieUrl.startsWith("http://localhost/") ? dayItem.sod.selfieUrl.replace("http://localhost/", "http://localhost:3000/") : dayItem.sod.selfieUrl}
                                                              alt="Check-in Selfie"
                                                              onClick={() => setSelectedSelfie(dayItem.sod.selfieUrl)}
                                                              onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }}
                                                              className="w-7 h-7 rounded-full object-cover border border-slate-250 cursor-pointer hover:scale-110 hover:ring-2 hover:ring-indigo-400 active:scale-95 transition-all shadow-sm ml-1"
                                                              title="Click to view check-in selfie"
                                                            />
                                                          )}
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                          <strong>EOD Time:</strong>
                                                          <span className="text-slate-700">{hasEod ? formatTimeTo12Hour(dayItem.eod.createdAt) : "—"}</span>
                                                          {dayItem.eod?.selfieUrl && (
                                                            <img
                                                              src={dayItem.eod.selfieUrl.startsWith("http://localhost/") ? dayItem.eod.selfieUrl.replace("http://localhost/", "http://localhost:3000/") : dayItem.eod.selfieUrl}
                                                              alt="Check-out Selfie"
                                                              onClick={() => setSelectedSelfie(dayItem.eod.selfieUrl)}
                                                              onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }}
                                                              className="w-7 h-7 rounded-full object-cover border border-slate-250 cursor-pointer hover:scale-110 hover:ring-2 hover:ring-[#714B67] active:scale-95 transition-all shadow-sm ml-1"
                                                              title="Click to view check-out selfie"
                                                            />
                                                          )}
                                                        </div>
                                                      </div>

                                                      <div className="space-y-1 flex items-center md:items-start md:justify-end">
                                                        {dayItem.sod?.latitude && dayItem.sod?.longitude ? (
                                                          <div className="flex items-center gap-1.5 bg-slate-50 p-2 border border-slate-100 rounded-lg">
                                                            <strong>GPS:</strong>
                                                            <a
                                                              href={`https://www.google.com/maps?q=${dayItem.sod.latitude},${dayItem.sod.longitude}`}
                                                              target="_blank"
                                                              rel="noopener noreferrer"
                                                              className="text-[11px] text-blue-600 hover:underline font-semibold flex items-center gap-0.5"
                                                            >
                                                              <MapPin className="w-3.5 h-3.5" />
                                                              <span>{dayItem.sod.latitude.toFixed(4)}, {dayItem.sod.longitude.toFixed(4)}</span>
                                                            </a>
                                                          </div>
                                                        ) : (
                                                          <div className="text-slate-400"><strong>GPS:</strong> Not Available</div>
                                                        )}
                                                      </div>
                                                    </div>
                                                  )}

                                                  {/* Task Summary Details */}
                                                  {hasSod && (
                                                    <div className="text-xs bg-slate-50 border border-slate-150 rounded-lg p-2.5 space-y-1">
                                                      <div><strong>Planned Task Type:</strong> <span className="font-semibold text-slate-800">{dayItem.sod.taskType}</span></div>
                                                      <div><strong>Summary:</strong> <span className="text-slate-655 italic">"{dayItem.sod.taskSummary || "No summary"}"</span></div>
                                                    </div>
                                                  )}

                                                  {/* Dynamic Tasks / Office Work Log */}
                                                  {dayTasks.length > 0 && (
                                                    <div className="space-y-2">
                                                      <div className="text-[9px] font-black uppercase text-slate-455 font-mono tracking-wider">
                                                        Logged Tasks Details
                                                      </div>
                                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                                                        {dayTasks.map((t: any) => {
                                                          let proofUrls: string[] = [];
                                                          if (t.proofAttachment) {
                                                            if (t.proofAttachment.startsWith('[') && t.proofAttachment.endsWith(']')) {
                                                              try {
                                                                proofUrls = JSON.parse(t.proofAttachment);
                                                              } catch (_) {
                                                                proofUrls = [t.proofAttachment];
                                                              }
                                                            } else {
                                                              proofUrls = t.proofAttachment.split(',').map((u: any) => u.trim()).filter(Boolean);
                                                            }
                                                          }

                                                          return (
                                                            <div key={t.id} className="bg-slate-50/50 border border-slate-200 p-2.5 rounded-lg text-xs space-y-1 shadow-sm flex flex-col justify-between">
                                                              <div>
                                                                <div className="flex justify-between items-start">
                                                                  <span className="font-bold text-slate-800">{t.taskTitle}</span>
                                                                  <span className={`px-2 py-0.5 rounded text-[8px] font-black tracking-wider uppercase ${t.status === "Completed" || t.status === "Done" ? "bg-emerald-50 text-emerald-700 border border-emerald-150" :
                                                                    t.status === "In Progress" ? "bg-amber-50 text-amber-700 border border-amber-150" : "bg-slate-100 text-slate-600"
                                                                    }`}>
                                                                    {t.status}
                                                                  </span>
                                                                </div>
                                                                <div className="text-[10px] text-slate-400 mt-0.5">
                                                                  Type: {t.taskType}
                                                                  {t.assignedBy && (
                                                                    <span className="ml-2 pl-2 border-l border-slate-200">
                                                                      Assigned By: <span className="font-bold text-indigo-700">{users.find((u: any) => u.id?.toString() === t.assignedBy?.toString())?.name || "Manager"}</span>
                                                                    </span>
                                                                  )}
                                                                </div>
                                                                {t.description && <div className="text-[10px] italic text-slate-500 mt-1 leading-relaxed">"{t.description}"</div>}
                                                              </div>

                                                              {proofUrls.length > 0 && (
                                                                <div className="flex flex-wrap gap-1 mt-2 pt-2 border-t border-slate-100">
                                                                  {proofUrls.map((pUrl, pIdx) => (
                                                                    <button
                                                                      key={pIdx}
                                                                      onClick={() => setSelectedSelfie(pUrl)}
                                                                      className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-[8px] font-black uppercase px-2 py-0.5 rounded flex items-center gap-0.5 transition-colors"
                                                                    >
                                                                      <Eye className="w-2.5 h-2.5" /> Proof #{pIdx + 1}
                                                                    </button>
                                                                  ))}
                                                                </div>
                                                              )}
                                                            </div>
                                                          );
                                                        })}
                                                      </div>
                                                    </div>
                                                  )}

                                                  {/* Field Visits Log */}
                                                  {dayVisits.length > 0 && (
                                                    <div className="space-y-2">
                                                      <div className="text-[9px] font-black uppercase text-slate-450 font-mono tracking-wider">Logged Field Visits</div>
                                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                                                        {dayVisits.map((v: any) => {
                                                          let visitProofUrls: string[] = [];
                                                          if (v.visit_proof) {
                                                            if (v.visit_proof.startsWith('[') && v.visit_proof.endsWith(']')) {
                                                              try {
                                                                visitProofUrls = JSON.parse(v.visit_proof);
                                                              } catch (_) {
                                                                visitProofUrls = [v.visit_proof];
                                                              }
                                                            } else {
                                                              visitProofUrls = v.visit_proof.split(',').map((u: any) => u.trim()).filter(Boolean);
                                                            }
                                                          }

                                                          return (
                                                            <div key={v.id} className="bg-slate-50/50 border border-slate-200 p-2.5 rounded-lg text-xs space-y-1 shadow-sm flex flex-col justify-between">
                                                              <div>
                                                                <div className="flex justify-between items-start font-bold text-slate-800">
                                                                  <span>🚗 Client: {v.client_name || "N/A"}</span>
                                                                  {v.distance_travelled && (
                                                                    <span className="text-[9px] font-bold text-slate-500">{v.distance_travelled} KM</span>
                                                                  )}
                                                                </div>
                                                                <div className="text-[10px] text-slate-450 mt-0.5">Purpose: {v.purpose || "Field Visit"}</div>
                                                                {v.visit_notes && <div className="text-[10px] italic text-slate-500 mt-1 leading-relaxed">"{v.visit_notes}"</div>}
                                                              </div>

                                                              {visitProofUrls.length > 0 && (
                                                                <div className="flex flex-wrap gap-1 mt-2 pt-2 border-t border-slate-100">
                                                                  {visitProofUrls.map((pUrl, pIdx) => (
                                                                    <button
                                                                      key={pIdx}
                                                                      onClick={() => setSelectedSelfie(pUrl)}
                                                                      className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-[8px] font-black uppercase px-2 py-0.5 rounded flex items-center gap-0.5 transition-colors"
                                                                    >
                                                                      <Eye className="w-2.5 h-2.5" /> Proof #{pIdx + 1}
                                                                    </button>
                                                                  ))}
                                                                </div>
                                                              )}
                                                            </div>
                                                          );
                                                        })}
                                                      </div>
                                                    </div>
                                                  )}

                                                  {/* EOD Work Done Details */}
                                                  {hasEod && (
                                                    <div className="text-xs bg-slate-50 border border-slate-150 rounded-lg p-2.5 space-y-1 shadow-sm">
                                                      <div><strong>EOD Work Done:</strong> <span className="text-slate-655 font-semibold">"{dayItem.eod.completedWork || "None"}"</span></div>
                                                      {dayItem.eod.pendingWork && <div><strong>Pending / Blockers:</strong> <span className="text-rose-600 font-semibold">"{dayItem.eod.pendingWork}"</span></div>}
                                                      {dayItem.eod.issuesFaced && <div><strong>Issues Faced:</strong> <span className="text-amber-600 font-semibold">"{dayItem.eod.issuesFaced}"</span></div>}
                                                    </div>
                                                  )}
                                                </div>
                                              );
                                            })}
                                          </div>
                                        )}
                                      </div>

                                      {/* Right Column: Calls Made Report & Payments Logged */}
                                      <div className="lg:col-span-5 space-y-5">
                                        {(() => {
                                          const empCalls = callsHistory.filter((c: any) => {
                                            const callerName = (c.callerName || c.employeeName || "").toLowerCase().trim();
                                            return callerName === emp.name.toLowerCase().trim() && matchDateFilter(c.callDate);
                                          });

                                          const sortedCalls = [...empCalls].sort((a, b) => new Date(b.callDate).getTime() - new Date(a.callDate).getTime());

                                          const empPayments = paymentsHistory.filter((p: any) => {
                                            const loggerName = (p.receivedBy || p.employeeName || p.callerName || "").toLowerCase().trim();
                                            return loggerName === emp.name.toLowerCase().trim() && matchDateFilter(p.paymentDate);
                                          });

                                          const sortedPayments = [...empPayments].sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime());

                                          return (
                                            <>
                                              {/* Calls Made Report */}
                                              <div className="space-y-3.5">
                                                <div className="flex items-center justify-between border-b border-indigo-50 pb-2">
                                                  <h4 className="text-[10px] font-black uppercase text-indigo-700 font-mono tracking-wider flex items-center gap-1.5">
                                                    <PhoneCall className="w-3.5 h-3.5 text-indigo-500" /> Calls Made Report ({sortedCalls.length})
                                                  </h4>
                                                </div>

                                                {sortedCalls.length === 0 ? (
                                                  <div className="text-left py-8 text-slate-400 text-xs font-semibold bg-white border border-slate-200 rounded-xl p-4 text-center">
                                                    No phone calls recorded by this user in the selected date range.
                                                  </div>
                                                ) : (
                                                  <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1.5 scrollbar-thin">
                                                    {sortedCalls.map((call: any, callIdx: number) => (
                                                      <div
                                                        key={callIdx}
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="bg-white border border-slate-200 rounded-xl p-3 space-y-1.5 shadow-sm cursor-default"
                                                      >
                                                        <div className="flex justify-between items-start font-bold text-xs">
                                                          <span className="text-slate-800 leading-snug">{call.bankName || "Unknown Bank"}</span>
                                                          <span className="text-[9px] text-slate-400 font-mono shrink-0">{call.callDate ? new Date(call.callDate).toLocaleDateString("en-IN") : ""}</span>
                                                        </div>
                                                        <div className="text-[9px] text-slate-500 font-semibold uppercase tracking-wider font-mono">Branch: {call.branchName || "General"}</div>
                                                        <div className="text-[10px] text-slate-600 font-medium">Log Type: <span className="font-bold text-indigo-700">{call.logType || "Call Log"}</span></div>
                                                        <div className="italic text-slate-550 text-[10px] bg-slate-50/50 p-2 rounded-lg leading-relaxed font-medium">
                                                          "{call.conversationDetails || call.remarks || "No conversation details"}"
                                                        </div>
                                                        {call.callStatus && (
                                                          <div className="pt-0.5">
                                                            <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border ${call.callStatus.toLowerCase().includes("success") || call.callStatus.toLowerCase().includes("connected")
                                                              ? "bg-emerald-50 text-emerald-700 border-emerald-150"
                                                              : "bg-rose-50 text-rose-700 border-rose-150"
                                                              }`}>
                                                              {call.callStatus}
                                                            </span>
                                                          </div>
                                                        )}
                                                      </div>
                                                    ))}
                                                  </div>
                                                )}
                                              </div>

                                              {/* Legal Recovery Payments Logged */}
                                              <div className="space-y-3.5 pt-2">
                                                <div className="flex items-center justify-between border-b border-indigo-50 pb-2">
                                                  <h4 className="text-[10px] font-black uppercase text-indigo-700 font-mono tracking-wider flex items-center gap-1.5">
                                                    <Coins className="w-3.5 h-3.5 text-indigo-500" /> Payments Logged ({sortedPayments.length})
                                                  </h4>
                                                </div>

                                                {sortedPayments.length === 0 ? (
                                                  <div className="text-left py-8 text-slate-400 text-xs font-semibold bg-white border border-slate-200 rounded-xl p-4 text-center">
                                                    No payments logged by this user in the selected date range.
                                                  </div>
                                                ) : (
                                                  <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1.5 scrollbar-thin">
                                                    {sortedPayments.map((pay: any, payIdx: number) => (
                                                      <div
                                                        key={payIdx}
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="bg-white border border-slate-200 rounded-xl p-3 space-y-1.5 shadow-sm cursor-default"
                                                      >
                                                        <div className="flex justify-between items-start font-bold text-xs">
                                                          <span className="text-slate-800 leading-snug">{pay.bankName || "Unknown Bank"}</span>
                                                          <span className="text-[9px] text-slate-400 font-mono shrink-0">{pay.paymentDate ? new Date(pay.paymentDate).toLocaleDateString("en-IN") : ""}</span>
                                                        </div>
                                                        <div className="text-[9px] text-slate-500 font-semibold uppercase tracking-wider font-mono">Branch: {pay.branchName || "General"}</div>
                                                        <div className="text-xs font-black text-emerald-600">Amount: ₹{Number(pay.amount || 0).toLocaleString('en-IN')}</div>
                                                        {pay.paymentMode && (
                                                          <div className="text-[9px] text-slate-655 font-medium">Mode: <span className="font-bold text-slate-800">{pay.paymentMode}</span></div>
                                                        )}
                                                        {pay.transactionId && (
                                                          <div className="text-[9px] text-slate-655 font-medium">Transaction ID: <span className="font-mono text-slate-800">{pay.transactionId}</span></div>
                                                        )}
                                                        {pay.remarks && (
                                                          <div className="italic text-slate-550 text-[10px] bg-slate-50/50 p-2 rounded-lg leading-relaxed font-medium">
                                                            "{pay.remarks}"
                                                          </div>
                                                        )}
                                                      </div>
                                                    ))}
                                                  </div>
                                                )}
                                              </div>
                                            </>
                                          );
                                        })()}
                                      </div>
                                    </div>
                                  );
                                })()}
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Drill-down User Modal */}
          {selectedDetailUser && typeof document !== "undefined" && ReactDOM.createPortal(
            <div
              className="fixed inset-0 z-[10000] bg-black/20 backdrop-blur-md flex items-center justify-center p-4 transition-all duration-300"
              onClick={() => setSelectedDetailUser(null)}
            >
              <div
                className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col p-5 font-sans max-h-[85vh]"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex justify-between items-start border-b border-slate-200 pb-4 mb-4">
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-wider text-indigo-700">Employee Activity Logs</h3>
                    <h2 className="text-base font-serif font-light text-slate-800 mt-1">{selectedDetailUser.name}</h2>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Department: {selectedDetailUser.department}</p>
                  </div>
                  <button
                    onClick={() => setSelectedDetailUser(null)}
                    className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-5 overflow-y-auto pr-1 flex-1 text-slate-800">
                  {/* Presence, Tasks & Field Visits Timeline */}
                  <div>
                    <div className="text-[10px] font-black uppercase text-slate-450 border-b border-slate-100 pb-1 mb-3 tracking-wider flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-indigo-500" /> Daily Activity &amp; Check-In Logs ({
                        filteredList.filter(item => item.employee?.id?.toString() === selectedDetailUser.id.toString()).length
                      })
                    </div>

                    <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1">
                      {filteredList
                        .filter(item => item.employee?.id?.toString() === selectedDetailUser.id.toString())
                        .map((dayItem: any, dayIdx: number) => {
                          const hasSod = !!dayItem.sod;
                          const hasEod = !!dayItem.eod;
                          const dayTasks = dayItem.tasks || [];
                          const dayVisits = dayItem.fieldVisits || [];

                          return (
                            <div key={dayIdx} className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-3 shadow-sm">
                              {/* Date Header */}
                              <div className="flex justify-between items-center border-b border-slate-200/80 pb-2">
                                <span className="font-bold text-xs text-indigo-900">
                                  📅 {dayItem.date.toLocaleDateString("en-IN", { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
                                </span>
                                <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${hasSod && hasEod ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
                                  hasSod ? "bg-indigo-50 text-indigo-700 border border-indigo-200" : "bg-rose-50 text-rose-700 border border-rose-200"
                                  }`}>
                                  {hasSod && hasEod ? "Completed" : hasSod ? "SOD Active" : "Absent"}
                                </span>
                              </div>

                              {/* SOD/EOD Times & GPS */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2">
                                    <strong>SOD Time:</strong>
                                    <span>{hasSod ? formatTimeTo12Hour(dayItem.sod.createdAt) : "—"}</span>
                                    {dayItem.sod?.selfieUrl && (
                                      <img
                                        src={dayItem.sod.selfieUrl.startsWith("http://localhost/") ? dayItem.sod.selfieUrl.replace("http://localhost/", "http://localhost:3000/") : dayItem.sod.selfieUrl}
                                        alt="Check-in Selfie"
                                        onClick={() => setSelectedSelfie(dayItem.sod.selfieUrl)}
                                        onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }}
                                        className="w-7 h-7 rounded-full object-cover border border-slate-250 cursor-pointer hover:scale-110 hover:ring-2 hover:ring-indigo-400 active:scale-95 transition-all shadow-sm ml-1"
                                        title="Click to view check-in selfie"
                                      />
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <strong>EOD Time:</strong>
                                    <span>{hasEod ? formatTimeTo12Hour(dayItem.eod.createdAt) : "—"}</span>
                                    {dayItem.eod?.selfieUrl && (
                                      <img
                                        src={dayItem.eod.selfieUrl.startsWith("http://localhost/") ? dayItem.eod.selfieUrl.replace("http://localhost/", "http://localhost:3000/") : dayItem.eod.selfieUrl}
                                        alt="Check-out Selfie"
                                        onClick={() => setSelectedSelfie(dayItem.eod.selfieUrl)}
                                        onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }}
                                        className="w-7 h-7 rounded-full object-cover border border-slate-250 cursor-pointer hover:scale-110 hover:ring-2 hover:ring-[#714B67] active:scale-95 transition-all shadow-sm ml-1"
                                        title="Click to view check-out selfie"
                                      />
                                    )}
                                  </div>
                                </div>

                                <div className="space-y-1 flex items-center md:items-start md:justify-end">
                                  {dayItem.sod?.latitude && dayItem.sod?.longitude ? (
                                    <div className="flex items-center gap-1.5">
                                      <strong>GPS:</strong>
                                      <a
                                        href={`https://www.google.com/maps?q=${dayItem.sod.latitude},${dayItem.sod.longitude}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-[11px] text-blue-600 hover:underline font-semibold flex items-center gap-0.5"
                                      >
                                        <MapPin className="w-3.5 h-3.5" />
                                        <span>{dayItem.sod.latitude.toFixed(4)}, {dayItem.sod.longitude.toFixed(4)}</span>
                                      </a>
                                    </div>
                                  ) : (
                                    <div><strong>GPS:</strong> Not Available</div>
                                  )}
                                </div>
                              </div>

                              {/* Task Summary Details */}
                              {hasSod && (
                                <div className="text-xs bg-white border border-slate-150 rounded-lg p-2.5 space-y-1 shadow-sm">
                                  <div><strong>Planned Task Type:</strong> <span className="font-semibold text-slate-800">{dayItem.sod.taskType}</span></div>
                                  <div><strong>Summary:</strong> <span className="text-slate-600 italic">"{dayItem.sod.taskSummary || "No summary"}"</span></div>
                                </div>
                              )}

                              {/* Dynamic Tasks / Office Work Log */}
                              {dayTasks.length > 0 && (
                                <div className="space-y-1.5">
                                  <div className="text-[9px] font-black uppercase text-slate-400 font-mono tracking-wider">Logged Office Work</div>
                                  <div className="space-y-1.5">
                                    {dayTasks.map((t: any) => {
                                      let proofUrls: string[] = [];
                                      if (t.proofAttachment) {
                                        if (t.proofAttachment.startsWith('[') && t.proofAttachment.endsWith(']')) {
                                          try {
                                            proofUrls = JSON.parse(t.proofAttachment);
                                          } catch (_) {
                                            proofUrls = [t.proofAttachment];
                                          }
                                        } else {
                                          proofUrls = t.proofAttachment.split(',').map((u: any) => u.trim()).filter(Boolean);
                                        }
                                      }

                                      return (
                                        <div key={t.id} className="bg-white border border-slate-150 p-2.5 rounded-lg text-xs space-y-1">
                                          <div className="flex justify-between items-start">
                                            <span className="font-bold text-slate-850">{t.taskTitle}</span>
                                            <span className={`px-2 py-0.5 rounded text-[8px] font-black tracking-wider uppercase ${t.status === "Completed" || t.status === "Done" ? "bg-emerald-50 text-emerald-700 border border-emerald-150" :
                                              t.status === "In Progress" ? "bg-amber-50 text-amber-700 border border-amber-150" : "bg-slate-100 text-slate-600"
                                              }`}>
                                              {t.status}
                                            </span>
                                          </div>
                                          <div className="text-[10px] text-slate-400">Type: {t.taskType}</div>
                                          {t.description && <div className="text-[10px] italic text-slate-500">"{t.description}"</div>}

                                          {proofUrls.length > 0 && (
                                            <div className="flex flex-wrap gap-1 mt-1">
                                              {proofUrls.map((pUrl, pIdx) => (
                                                <button
                                                  key={pIdx}
                                                  onClick={() => setSelectedSelfie(pUrl)}
                                                  className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-[8px] font-black uppercase px-2 py-0.5 rounded flex items-center gap-0.5 transition-colors"
                                                >
                                                  <Eye className="w-2.5 h-2.5" /> Proof #{pIdx + 1}
                                                </button>
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}

                              {/* Field Visits Log */}
                              {dayVisits.length > 0 && (
                                <div className="space-y-1.5">
                                  <div className="text-[9px] font-black uppercase text-slate-450 font-mono tracking-wider">Logged Field Visits</div>
                                  <div className="space-y-1.5">
                                    {dayVisits.map((v: any) => {
                                      let visitProofUrls: string[] = [];
                                      if (v.visit_proof) {
                                        if (v.visit_proof.startsWith('[') && v.visit_proof.endsWith(']')) {
                                          try {
                                            visitProofUrls = JSON.parse(v.visit_proof);
                                          } catch (_) {
                                            visitProofUrls = [v.visit_proof];
                                          }
                                        } else {
                                          visitProofUrls = v.visit_proof.split(',').map((u: any) => u.trim()).filter(Boolean);
                                        }
                                      }

                                      return (
                                        <div key={v.id} className="bg-white border border-slate-150 p-2.5 rounded-lg text-xs space-y-1">
                                          <div className="flex justify-between items-start font-bold text-slate-850">
                                            <span>🚗 Client: {v.client_name || "N/A"}</span>
                                            {v.distance_travelled && (
                                              <span className="text-[9px] font-bold text-slate-500">{v.distance_travelled} KM</span>
                                            )}
                                          </div>
                                          <div className="text-[10px] text-slate-450">Purpose: {v.purpose || "Field Visit"}</div>
                                          {v.visit_notes && <div className="text-[10px] italic text-slate-500">"{v.visit_notes}"</div>}

                                          {visitProofUrls.length > 0 && (
                                            <div className="flex flex-wrap gap-1 mt-1">
                                              {visitProofUrls.map((pUrl, pIdx) => (
                                                <button
                                                  key={pIdx}
                                                  onClick={() => setSelectedSelfie(pUrl)}
                                                  className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-[8px] font-black uppercase px-2 py-0.5 rounded flex items-center gap-0.5 transition-colors"
                                                >
                                                  <Eye className="w-2.5 h-2.5" /> Proof #{pIdx + 1}
                                                </button>
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}

                              {/* EOD Work Done Details */}
                              {hasEod && (
                                <div className="text-xs bg-white border border-slate-150 rounded-lg p-2.5 space-y-1 shadow-sm">
                                  <div><strong>EOD Work Done:</strong> <span className="text-slate-655 font-semibold">"{dayItem.eod.completedWork || "None"}"</span></div>
                                  {dayItem.eod.pendingWork && <div><strong>Pending / Blockers:</strong> <span className="text-rose-600 font-semibold">"{dayItem.eod.pendingWork}"</span></div>}
                                  {dayItem.eod.issuesFaced && <div><strong>Issues Faced:</strong> <span className="text-amber-600 font-semibold">"{dayItem.eod.issuesFaced}"</span></div>}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      {filteredList.filter(item => item.employee?.id?.toString() === selectedDetailUser.id.toString()).length === 0 && (
                        <div className="text-center py-10 text-slate-400 text-xs">No check-in or presence entries logged in this date range.</div>
                      )}
                    </div>
                  </div>

                  {/* Calls History Tab */}
                  <div>
                    <div className="text-[10px] font-black uppercase text-slate-450 border-b border-slate-100 pb-1 mb-2 tracking-wider flex items-center gap-1.5">
                      <PhoneCall className="w-3.5 h-3.5 text-indigo-500" /> Calls Made ({
                        callsHistory.filter(c =>
                          (c.callerName || c.employeeName || "").toLowerCase().trim() === selectedDetailUser.name.toLowerCase().trim()
                          && matchDateFilter(c.callDate)
                        ).length
                      })
                    </div>
                    <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                      {callsHistory
                        .filter(c =>
                          (c.callerName || c.employeeName || "").toLowerCase().trim() === selectedDetailUser.name.toLowerCase().trim()
                          && matchDateFilter(c.callDate)
                        )
                        .map((call, idx) => (
                          <div key={idx} className="bg-slate-50 border border-slate-100 p-2.5 rounded-lg text-xs">
                            <div className="flex justify-between font-bold text-slate-800">
                              <span>{call.bankName} - {call.branchName}</span>
                              <span className="text-[10px] text-slate-400 font-mono">{call.callDate ? new Date(call.callDate).toLocaleDateString("en-IN") : ""}</span>
                            </div>
                            <div className="text-slate-600 mt-1 font-medium italic">"{call.conversationDetails || call.remarks || "No conversation notes"}"</div>
                            {call.callStatus && (
                              <span className="inline-block mt-1.5 px-2 py-0.5 rounded bg-indigo-50 border border-indigo-100 text-[9px] font-black text-indigo-700 uppercase tracking-wide">
                                {call.callStatus}
                              </span>
                            )}
                          </div>
                        ))}
                      {callsHistory.filter(c =>
                        (c.callerName || c.employeeName || "").toLowerCase().trim() === selectedDetailUser.name.toLowerCase().trim()
                        && matchDateFilter(c.callDate)
                      ).length === 0 && (
                          <div className="text-center py-6 text-slate-400 text-xs">No calls logged by this user.</div>
                        )}
                    </div>
                  </div>
                </div>
              </div>
            </div>,
            document.body
          )}

          {/* Drill-down Branch Modal */}
          {selectedDetailBranch && typeof document !== "undefined" && ReactDOM.createPortal(
            <div
              className="fixed inset-0 z-[10000] bg-black/20 backdrop-blur-md flex items-center justify-center p-4 transition-all duration-300"
              onClick={() => setSelectedDetailBranch(null)}
            >
              <div
                className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col p-5 font-sans max-h-[85vh]"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex justify-between items-start border-b border-slate-200 pb-4 mb-4">
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-wider text-emerald-700">Bank Branch Details</h3>
                    <h2 className="text-base font-serif font-light text-slate-800 mt-1">{selectedDetailBranch.bankName}</h2>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Branch Name: {selectedDetailBranch.branchName}</p>
                  </div>
                  <button
                    onClick={() => setSelectedDetailBranch(null)}
                    className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-5 overflow-y-auto pr-1 flex-1 text-slate-800">
                  <div>
                    <div className="text-[10px] font-black uppercase text-slate-400 border-b border-slate-100 pb-1 mb-2 tracking-wider flex items-center gap-1.5">
                      <PhoneCall className="w-3.5 h-3.5 text-indigo-500" /> Calling History ({callsHistory.filter(c => (c.bankName || "").toLowerCase().trim() === selectedDetailBranch.bankName.toLowerCase().trim() && (c.branchName || "").toLowerCase().trim() === selectedDetailBranch.branchName.toLowerCase().trim() && matchDateFilter(c.callDate)).length})
                    </div>
                    <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                      {callsHistory
                        .filter(c => (c.bankName || "").toLowerCase().trim() === selectedDetailBranch.bankName.toLowerCase().trim() && (c.branchName || "").toLowerCase().trim() === selectedDetailBranch.branchName.toLowerCase().trim() && matchDateFilter(c.callDate))
                        .map((call, idx) => (
                          <div key={idx} className="bg-slate-50 border border-slate-100 p-2.5 rounded-lg text-xs">
                            <div className="flex justify-between font-bold text-slate-800">
                              <span>By: {call.callerName || call.employeeName || "System"}</span>
                              <span className="text-[10px] text-slate-400 font-mono">{call.callDate ? new Date(call.callDate).toLocaleDateString() : ""}</span>
                            </div>
                            <div className="text-slate-600 mt-1 font-medium italic">"{call.conversationDetails || call.remarks || "No conversation notes"}"</div>
                            {call.callStatus && (
                              <span className="inline-block mt-1.5 px-2 py-0.5 rounded bg-indigo-50 border border-indigo-100 text-[9px] font-black text-indigo-700 uppercase tracking-wide">
                                {call.callStatus}
                              </span>
                            )}
                          </div>
                        ))}
                      {callsHistory.filter(c => (c.bankName || "").toLowerCase().trim() === selectedDetailBranch.bankName.toLowerCase().trim() && (c.branchName || "").toLowerCase().trim() === selectedDetailBranch.branchName.toLowerCase().trim() && matchDateFilter(c.callDate)).length === 0 && (
                        <div className="text-center py-6 text-slate-400 text-xs">No calls logged for this branch.</div>
                      )}
                    </div>
                  </div>

                  <div>
                    <div className="text-[10px] font-black uppercase text-slate-400 border-b border-slate-100 pb-1 mb-2 tracking-wider flex items-center gap-1.5">
                      <Banknote className="w-3.5 h-3.5 text-emerald-500" /> Payments Received (Rs. {
                        paymentsHistory
                          .filter(p => (p.bankName || "").toLowerCase().trim() === selectedDetailBranch.bankName.toLowerCase().trim() && (p.branchName || "").toLowerCase().trim() === selectedDetailBranch.branchName.toLowerCase().trim() && matchDateFilter(p.paymentDate))
                          .reduce((sum, p) => sum + Number(p.amount || 0), 0)
                          .toLocaleString()
                      })
                    </div>
                    <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                      {paymentsHistory
                        .filter(p => (p.bankName || "").toLowerCase().trim() === selectedDetailBranch.bankName.toLowerCase().trim() && (p.branchName || "").toLowerCase().trim() === selectedDetailBranch.branchName.toLowerCase().trim() && matchDateFilter(p.paymentDate))
                        .map((pay, idx) => (
                          <div key={idx} className="bg-slate-50 border border-slate-100 p-2.5 rounded-lg text-xs flex justify-between items-center text-slate-800">
                            <div>
                              <div className="font-bold text-slate-800">Rs. {Number(pay.amount || 0).toLocaleString()}</div>
                              <div className="text-[9px] text-slate-400 mt-0.5">Mode: {pay.paymentMode || "Direct"} | Recipient: {pay.receivedBy || "N/A"}</div>
                            </div>
                            <div className="text-right">
                              <div className="text-[10px] text-slate-400 font-mono font-bold">{pay.paymentDate ? new Date(pay.paymentDate).toLocaleDateString() : ""}</div>
                              {pay.proofUrl && (
                                <button
                                  onClick={() => window.open(pay.proofUrl, "_blank")}
                                  className="text-[9px] uppercase tracking-wider font-extrabold text-emerald-600 hover:underline mt-1 block"
                                >
                                  View Proof
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      {paymentsHistory.filter(p => (p.bankName || "").toLowerCase().trim() === selectedDetailBranch.bankName.toLowerCase().trim() && (p.branchName || "").toLowerCase().trim() === selectedDetailBranch.branchName.toLowerCase().trim() && matchDateFilter(p.paymentDate)).length === 0 && (
                        <div className="text-center py-6 text-slate-400 text-xs">No payments recovered from this branch.</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>,
            document.body
          )}

          {/* Drill-down Quick Stats Category Modals */}
          {selectedDashboardCategory && typeof document !== "undefined" && ReactDOM.createPortal(
            <div
              className="fixed inset-0 z-[10000] bg-black/20 backdrop-blur-md flex items-center justify-center p-4 transition-all duration-300"
              onClick={() => setSelectedDashboardCategory(null)}
            >
              <div
                className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col p-5 font-sans max-h-[85vh]"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div className="flex justify-between items-start border-b border-slate-200 pb-4 mb-4">
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-wider text-indigo-700">Consolidated Details</h3>
                    <h2 className="text-base font-serif font-light text-slate-800 mt-1">
                      {selectedDashboardCategory === "staff" ? "Total Staff Directory" :
                        selectedDashboardCategory === "calls" ? "Filtered Calls History" :
                          selectedDashboardCategory === "tasks" ? "Completed Office Tasks Log" :
                            selectedDashboardCategory === "pendingTasks" ? "Pending & In-Progress Tasks" : "Payments Recovered Logs"}
                    </h2>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                      Filtered by selected company, department &amp; date range
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedDashboardCategory(null)}
                    className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Content */}
                <div className="space-y-4 overflow-y-auto pr-1 flex-1 text-slate-800 text-xs">
                  {/* Staff List */}
                  {selectedDashboardCategory === "staff" && (
                    <div className="space-y-3">
                      <div className="bg-slate-50 border border-slate-150 rounded-xl p-3 font-semibold text-slate-700 grid grid-cols-4 gap-2">
                        <span>Staff Member</span>
                        <span>Department</span>
                        <span className="text-center">Status</span>
                        <span className="text-right">Action</span>
                      </div>
                      <div className="space-y-2">
                        {visualStats.employeesData.map((emp: any) => {
                          const isActive = emp.sodCount > 0 || emp.eodCount > 0 || emp.callsCount > 0;
                          return (
                            <div key={emp.id} className="bg-white border border-slate-105 rounded-xl p-3 grid grid-cols-4 gap-2 items-center hover:bg-slate-50 transition-colors shadow-sm">
                              <div>
                                <div className="font-bold text-slate-800">{emp.name}</div>
                                <div className="text-[10px] text-slate-405 font-mono">{emp.email}</div>
                              </div>
                              <span className="font-medium text-slate-600">{emp.department}</span>
                              <div className="text-center">
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${isActive ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-slate-100 text-slate-500 border border-slate-200"
                                  }`}>
                                  {isActive ? "Active" : "Inactive"}
                                </span>
                              </div>
                              <div className="text-right">
                                <button
                                  onClick={() => {
                                    setSelectedDetailUser(emp);
                                    setSelectedDashboardCategory(null);
                                  }}
                                  className="px-2.5 py-1 bg-indigo-50 border border-indigo-200 text-indigo-700 text-[10px] font-black rounded-lg hover:bg-indigo-100 uppercase tracking-wider"
                                >
                                  View Timeline
                                </button>
                              </div>
                            </div>
                          );
                        })}
                        {visualStats.employeesData.length === 0 && (
                          <div className="text-center py-8 text-slate-400">No staff members match the current filters.</div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Calls List */}
                  {selectedDashboardCategory === "calls" && (
                    <div className="space-y-2">
                      {callsHistory
                        .filter(call => {
                          const callerName = (call.callerName || call.employeeName || "").toLowerCase().trim();
                          const callerProfile = users.find(u => u.name.toLowerCase().trim() === callerName);
                          if (selectedCompany && (!callerProfile || !isUserInCompany(callerProfile, selectedCompany))) return false;
                          if (selectedDept && (!callerProfile || callerProfile.department !== selectedDept)) return false;

                          return matchDateFilter(call.callDate);
                        })
                        .map((call, idx) => (
                          <div key={idx} className="bg-slate-50 border border-slate-150 p-3 rounded-xl space-y-1.5 shadow-sm">
                            <div className="flex justify-between items-start font-bold">
                              <span className="text-slate-800">{call.bankName || "Unknown Bank"} - {call.branchName || "General"}</span>
                              <span className="text-[10px] text-slate-400 font-mono">{call.callDate ? new Date(call.callDate).toLocaleDateString("en-IN") : ""}</span>
                            </div>
                            <div className="text-[11px] text-slate-650">Caller: <span className="font-semibold">{call.callerName || call.employeeName || "System"}</span> ({call.logType})</div>
                            <div className="italic text-slate-500 mt-1">"{call.conversationDetails || call.remarks || "No conversation remarks"}"</div>
                            {call.callStatus && (
                              <span className="inline-block mt-1 px-2 py-0.5 rounded bg-indigo-50 border border-indigo-150 text-[9px] font-black text-indigo-700 uppercase tracking-wide">
                                {call.callStatus}
                              </span>
                            )}
                          </div>
                        ))}
                      {callsHistory.filter(call => {
                        const callerName = (call.callerName || call.employeeName || "").toLowerCase().trim();
                        const callerProfile = users.find(u => u.name.toLowerCase().trim() === callerName);
                        if (selectedCompany && (!callerProfile || !isUserInCompany(callerProfile, selectedCompany))) return false;
                        if (selectedDept && (!callerProfile || callerProfile.department !== selectedDept)) return false;
                        return matchDateFilter(call.callDate);
                      }).length === 0 && (
                          <div className="text-center py-8 text-slate-400">No logged calls found.</div>
                        )}
                    </div>
                  )}

                  {/* HR Leads / Interview Calls List */}
                  {selectedDashboardCategory === "hrCalls" && (
                    <div className="space-y-2">
                      {(reports.tasks || [])
                        .filter(t => {
                          if (!matchDateFilter(t.date)) return false;

                          const callerId = (typeof t.employee === "object" ? (t.employee?.id || "") : t.employee)?.toString().trim();
                          if (!callerId) return false;

                          const callerProfile = users.find(u => u.id?.toString() === callerId);
                          if (selectedCompany && (!callerProfile || !isUserInCompany(callerProfile, selectedCompany))) return false;
                          if (selectedDept && (!callerProfile || callerProfile.department !== selectedDept)) return false;
                          if (selectedUser && callerId !== selectedUser.toString()) return false;

                          // Match Option A: Direct logs from HR Leads Platform
                          if (t.taskType === "CALL" && t.description?.includes("Lead ID:")) return true;

                          // Match Option B: SOD tasks or manual tasks mentioning a candidate name and a calling keyword
                          const tTitle = (t.taskTitle || "").toLowerCase();
                          const tDesc = (t.description || "").toLowerCase();
                          const hasCallKeyword = /call|interview|intv|telecall|talk|ring|contact|schedule|connect|reach/i.test(tTitle + " " + tDesc);
                          if (!hasCallKeyword) return false;

                          const mentionsCandidate = candidatesList.some((c: any) => {
                            if (!c.name) return false;
                            const cName = c.name.toLowerCase().trim();
                            if (cName.length < 3) return false;
                            return tTitle.includes(cName) || tDesc.includes(cName);
                          });

                          return mentionsCandidate;
                        })
                        .map((task, idx) => {
                          const desc = task.description || "";
                          const leadNameMatch = desc.match(/Candidate Name:\s*([^\n\r]+)/i);
                          const platformMatch = desc.match(/Platform:\s*([^\n\r]+)/i);
                          const actionMatch = desc.match(/Action Status:\s*([^\n\r]+)/i);
                          const remarksMatch = desc.match(/Remarks\/Notes:\s*([^\n\r]+)/i);

                          let candName = leadNameMatch ? leadNameMatch[1].trim() : "";
                          let platform = platformMatch ? platformMatch[1].trim() : "SOD / Attendance Log";
                          let action = actionMatch ? actionMatch[1].trim() : (task.status || "Logged");
                          let remarks = remarksMatch ? remarksMatch[1].trim() : desc;

                          if (!candName) {
                            // Find candidate name from title or description
                            const matchedCand = candidatesList.find((c: any) => {
                              if (!c.name) return false;
                              const cName = c.name.toLowerCase().trim();
                              return (task.taskTitle || "").toLowerCase().includes(cName) || desc.toLowerCase().includes(cName);
                            });
                            candName = matchedCand ? matchedCand.name : "Candidate";
                            remarks = task.taskTitle || desc;
                          }

                          const callerId = (typeof task.employee === "object" ? (task.employee?.id || "") : task.employee)?.toString().trim();
                          const callerProfile = users.find(u => u.id?.toString() === callerId);

                          return (
                            <div key={idx} className="bg-slate-50 border border-slate-150 p-3 rounded-xl space-y-1.5 shadow-sm">
                              <div className="flex justify-between items-start font-bold">
                                <span className="text-slate-800">Candidate: {candName}</span>
                                <span className="text-[10px] text-slate-400 font-mono">{task.date ? new Date(task.date).toLocaleDateString("en-IN") : ""}</span>
                              </div>
                              <div className="text-[11px] text-slate-650">Logged By: <span className="font-semibold">{callerProfile?.name || "HR Agent"}</span> ({platform})</div>
                              <div className="italic text-slate-500 mt-1">"{remarks}"</div>
                              {action && (
                                <span className="inline-block mt-1 px-2 py-0.5 rounded bg-sky-50 border border-sky-150 text-[9px] font-black text-sky-700 uppercase tracking-wide">
                                  {action}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      {(reports.tasks || []).filter(t => {
                        if (!matchDateFilter(t.date)) return false;

                        const callerId = (typeof t.employee === "object" ? (t.employee?.id || "") : t.employee)?.toString().trim();
                        if (!callerId) return false;
                        const callerProfile = users.find(u => u.id?.toString() === callerId);
                        if (selectedCompany && (!callerProfile || !isUserInCompany(callerProfile, selectedCompany))) return false;
                        if (selectedDept && (!callerProfile || callerProfile.department !== selectedDept)) return false;
                        if (selectedUser && callerId !== selectedUser.toString()) return false;

                        // Option A
                        if (t.taskType === "CALL" && t.description?.includes("Lead ID:")) return true;

                        // Option B
                        const tTitle = (t.taskTitle || "").toLowerCase();
                        const tDesc = (t.description || "").toLowerCase();
                        const hasCallKeyword = /call|interview|intv|telecall|talk|ring|contact|schedule|connect|reach/i.test(tTitle + " " + tDesc);
                        if (!hasCallKeyword) return false;

                        const mentionsCandidate = candidatesList.some((c: any) => {
                          if (!c.name) return false;
                          const cName = c.name.toLowerCase().trim();
                          if (cName.length < 3) return false;
                          return tTitle.includes(cName) || tDesc.includes(cName);
                        });

                        return mentionsCandidate;
                      }).length === 0 && (
                          <div className="text-center py-8 text-slate-400">No interview calls found.</div>
                        )}
                    </div>
                  )}

                  {/* Tasks List */}
                  {selectedDashboardCategory === "tasks" && (
                    <div className="space-y-2">
                      {filteredList
                        .flatMap(dayItem => (dayItem.tasks || []).map((t: any) => ({ ...t, empName: dayItem.employee?.name || "N/A" })))
                        .filter(t => t.status === "Completed" || t.status === "Done")
                        .map((task, idx) => {
                          let proofUrls: string[] = [];
                          if (task.proofAttachment) {
                            if (task.proofAttachment.startsWith('[') && task.proofAttachment.endsWith(']')) {
                              try {
                                proofUrls = JSON.parse(task.proofAttachment);
                              } catch (_) {
                                proofUrls = [task.proofAttachment];
                              }
                            } else {
                              proofUrls = task.proofAttachment.split(',').map((u: any) => u.trim()).filter(Boolean);
                            }
                          }

                          return (
                            <div key={idx} className="bg-slate-50 border border-slate-150 p-3 rounded-xl space-y-1.5 shadow-sm">
                              <div className="flex justify-between items-center">
                                <span className="font-bold text-slate-800">{task.taskTitle}</span>
                                <span className="px-2 py-0.5 rounded text-[8px] font-black tracking-wider uppercase bg-emerald-50 text-emerald-700 border border-emerald-155">
                                  {task.status}
                                </span>
                              </div>
                              <div className="text-[10px] text-slate-500">
                                Completed By: <span className="font-semibold text-slate-700">{task.empName}</span> | Type: {task.taskType}
                              </div>
                              {task.description && <div className="text-[10px] text-slate-600 italic">"{task.description}"</div>}

                              {proofUrls.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {proofUrls.map((pUrl, pIdx) => (
                                    <button
                                      key={pIdx}
                                      onClick={() => setSelectedSelfie(pUrl)}
                                      className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-250 text-[8px] font-black uppercase px-2 py-0.5 rounded flex items-center gap-0.5 transition-colors"
                                    >
                                      <Eye className="w-2.5 h-2.5" /> View Proof #{pIdx + 1}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      {filteredList.flatMap(dayItem => dayItem.tasks || []).filter(t => t.status === "Completed" || t.status === "Done").length === 0 && (
                        <div className="text-center py-8 text-slate-400">No completed tasks found.</div>
                      )}
                    </div>
                  )}

                  {/* Pending Tasks List */}
                  {selectedDashboardCategory === "pendingTasks" && (
                    <div className="space-y-2">
                      {filteredList
                        .flatMap(dayItem => (dayItem.tasks || []).map((t: any) => ({ ...t, empName: dayItem.employee?.name || "N/A" })))
                        .filter(t => t.status !== "Completed" && t.status !== "Done")
                        .map((task, idx) => {
                          let proofUrls: string[] = [];
                          if (task.proofAttachment) {
                            if (task.proofAttachment.startsWith('[') && task.proofAttachment.endsWith(']')) {
                              try {
                                proofUrls = JSON.parse(task.proofAttachment);
                              } catch (_) {
                                proofUrls = [task.proofAttachment];
                              }
                            } else {
                              proofUrls = task.proofAttachment.split(',').map((u: any) => u.trim()).filter(Boolean);
                            }
                          }

                          return (
                            <div key={idx} className="bg-slate-50 border border-slate-150 p-3 rounded-xl space-y-1.5 shadow-sm">
                              <div className="flex justify-between items-center">
                                <span className="font-bold text-slate-800">{task.taskTitle}</span>
                                <span className="px-2 py-0.5 rounded text-[8px] font-black tracking-wider uppercase bg-amber-50 text-amber-700 border border-amber-150">
                                  {task.status || "Pending"}
                                </span>
                              </div>
                              <div className="text-[10px] text-slate-500">
                                Assigned To: <span className="font-semibold text-slate-700">{task.empName}</span> | Type: {task.taskType}
                              </div>
                              {task.description && <div className="text-[10px] text-slate-600 italic">"{task.description}"</div>}

                              {proofUrls.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {proofUrls.map((pUrl, pIdx) => (
                                    <button
                                      key={pIdx}
                                      onClick={() => setSelectedSelfie(pUrl)}
                                      className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-250 text-[8px] font-black uppercase px-2 py-0.5 rounded flex items-center gap-0.5 transition-colors"
                                    >
                                      <Eye className="w-2.5 h-2.5" /> View Proof #{pIdx + 1}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      {filteredList.flatMap(dayItem => dayItem.tasks || []).filter(t => t.status !== "Completed" && t.status !== "Done").length === 0 && (
                        <div className="text-center py-8 text-slate-400">No pending or in-progress tasks found.</div>
                      )}
                    </div>
                  )}

                  {/* Payments List */}
                  {selectedDashboardCategory === "payments" && (
                    <div className="space-y-2">
                      {paymentsHistory
                        .filter(p => {
                          const callerProfile = users.find(u => u.name.toLowerCase().trim() === (p.callerName || p.employeeName || "").toLowerCase().trim());
                          if (selectedCompany && (!callerProfile || !isUserInCompany(callerProfile, selectedCompany))) return false;
                          if (selectedDept && (!callerProfile || callerProfile.department !== selectedDept)) return false;

                          return matchDateFilter(p.paymentDate);
                        })
                        .map((p, idx) => (
                          <div key={idx} className="bg-slate-50 border border-slate-150 p-3 rounded-xl space-y-1.5 shadow-sm">
                            <div className="flex justify-between items-start font-bold">
                              <span className="text-slate-800">{p.bankName || "Unknown Bank"} - {p.branchName || "General"}</span>
                              <span className="text-emerald-700 font-serif font-black text-sm">Rs. {p.amountRecovered?.toLocaleString()}</span>
                            </div>
                            <div className="text-[10px] text-slate-550">
                              Recovered By: <span className="font-semibold text-slate-700">{p.callerName || p.employeeName || "System"}</span> | Mode: {p.paymentMode || "Cash"}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">Date: {p.paymentDate ? new Date(p.paymentDate).toLocaleDateString("en-IN") : ""}</div>

                            {p.proofUrl && (
                              <button
                                onClick={() => setSelectedSelfie(p.proofUrl)}
                                className="mt-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-250 text-[8px] font-black uppercase px-2 py-0.5 rounded flex items-center gap-0.5 transition-colors"
                              >
                                <Eye className="w-2.5 h-2.5" /> View Receipt Proof
                              </button>
                            )}
                          </div>
                        ))}
                      {paymentsHistory.filter(p => {
                        const callerProfile = users.find(u => u.name.toLowerCase().trim() === (p.callerName || p.employeeName || "").toLowerCase().trim());
                        if (selectedCompany && (!callerProfile || !isUserInCompany(callerProfile, selectedCompany))) return false;
                        if (selectedDept && (!callerProfile || callerProfile.department !== selectedDept)) return false;
                        return matchDateFilter(p.paymentDate);
                      }).length === 0 && (
                          <div className="text-center py-8 text-slate-400">No payment records found.</div>
                        )}
                    </div>
                  )}
                </div>
              </div>
            </div>,
            document.body
          )}
        </div>
      ) : activeSubTab === "attendance-calendar" ? (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col text-slate-800">
          {/* Header & Filter */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4 mb-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-black text-slate-800 tracking-wide uppercase font-mono">
                📅 Attendance Calendar: {monthsList[calendarMonth]} {calendarYear}
              </span>
            </div>
            {isOwner && (
              <div className="flex flex-wrap gap-3 items-center">
                <select
                  className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold focus:outline-none focus:border-[#714B67] text-slate-800"
                  value={selectedCompany}
                  onChange={(e) => {
                    setSelectedCompany(e.target.value);
                    setSelectedUser("");
                  }}
                >
                  {sessionUser?.role === "Owner" && (
                    <option value="">Select Company</option>
                  )}
                  {visibleCompanies.map((c: any) => (
                    <option key={c.id || c.id} value={c.id || c.id}>{c.name}</option>
                  ))}
                </select>
                <select
                  className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold focus:outline-none focus:border-[#714B67] text-slate-800"
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                >
                  <option value="">Select Employee</option>
                  <optgroup label="Active Employees">
                    {uniqueUsersFromReports.activeList.map((u: any) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.role || "Employee"})
                      </option>
                    ))}
                  </optgroup>
                  {uniqueUsersFromReports.inactiveList.length > 0 && (
                    <optgroup label="--- Inactive / Archived Staff ---">
                      {uniqueUsersFromReports.inactiveList.map((u: any) => (
                        <option key={u.id} value={u.id}>
                          {u.name} ({u.role || "Employee"}) (Archived / Inactive)
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </div>
            )}
          </div>

          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={handlePrevMonth}
              className="bg-slate-100 hover:bg-slate-200 text-slate-800 px-3 py-1.5 rounded-lg text-xs font-black transition-all"
            >
              ← Previous Month
            </button>
            <span className="text-sm font-black text-[#714B67] font-mono">
              {monthsList[calendarMonth]} {calendarYear}
            </span>
            <button
              onClick={handleNextMonth}
              className="bg-slate-100 hover:bg-slate-200 text-slate-800 px-3 py-1.5 rounded-lg text-xs font-black transition-all"
            >
              Next Month →
            </button>
          </div>

          {loadingCalendar ? (
            <div className="h-64 flex flex-col items-center justify-center">
              <Loader2 className="w-8 h-8 text-[#714B67] animate-spin mb-2" />
              <span className="text-xs font-semibold text-slate-500">Loading attendance calendar...</span>
            </div>
          ) : (
            <>
              {/* Weekday headers */}
              <div className="grid grid-cols-7 gap-2 mb-2 text-center">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day, idx) => (
                  <div
                    key={day}
                    className={`text-[9px] uppercase font-black font-mono tracking-wider py-1.5 rounded-lg ${idx === 0 ? "text-rose-500 bg-rose-50" : "text-slate-500 bg-slate-50"
                      }`}
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* Month grid */}
              <div className="grid grid-cols-7 gap-2">
                {renderCalendarDays()}
              </div>
            </>
          )}

          {/* Legend */}
          <div className="mt-6 border-t border-slate-100 pt-4 flex flex-wrap gap-4 items-center justify-between text-[10px] font-bold text-slate-500">
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-emerald-100 border border-emerald-300 block"></span>
                <span>Present</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-rose-100 border border-rose-300 block"></span>
                <span>Absent</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-amber-100 border border-amber-300 block"></span>
                <span>Leave</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-slate-100 border border-slate-300 block"></span>
                <span>Holiday (Sunday)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-rose-600 border border-rose-700 block"></span>
                <span>Absent Fine (Imposed)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-indigo-55 border border-indigo-300 block"></span>
                <span>Pending (Today)</span>
              </div>
            </div>
            <div className="text-[9px] text-slate-400 font-mono">
              All Sundays are automatically marked as Holidays.
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Filters Bar */}
          <div className="flex justify-between items-center bg-white border border-[#E8E4DF] rounded-xl p-4 shadow-sm mb-6">
            <span style={{ fontFamily: "'Playfair Display', serif" }} className="font-serif text-sm font-bold lowercase first-letter:uppercase text-[#1C1C1A]">
              📋 {activeSubTab === "sod" ? "Start of day (SOD) registry" : "End of day (EOD) registry"}
            </span>

            <div className="flex items-center gap-2">
              {/* Filter Reports Button */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setShowFilters(!showFilters);
                    setShowColumnPicker(false);
                  }}
                  className={`flex items-center gap-2 border px-4 py-2 text-xs font-bold transition-all rounded-xl shadow-sm focus:outline-none ${showFilters
                    ? "bg-[#C9A84C] border-[#C9A84C] text-[#FCFBF9]"
                    : "bg-[#FCFBF9] hover:bg-[#F5F2EC] border-[#E8E4DF] text-[#1C1C1A]"
                    }`}
                >
                  <Filter className="w-3.5 h-3.5" />
                  <span>Filter Reports</span>
                  {(searchTerm || selectedCompany || selectedDept || selectedUser || dateFilterType !== "overall" || userStatusFilter !== "active") && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#C9A84C] animate-pulse" />
                  )}
                </button>

                {/* Floating Filter Popover */}
                {showFilters && (
                  <div className="absolute right-0 mt-3 z-50 bg-[#FCFBF9] border border-[#E8E4DF] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.15)] rounded-2xl p-5 w-[320px] space-y-4 text-left normal-case font-sans">
                    <div className="flex justify-between items-center border-b border-[#E8E4DF] pb-2">
                      <span className="text-xs font-bold text-[#1C1C1A] tracking-wider uppercase font-mono">Filter Reports</span>
                      <button
                        type="button"
                        onClick={() => setShowFilters(false)}
                        className="text-[#9C9890] hover:text-[#1C1C1A] transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="space-y-4 text-xs">
                      {/* Company Dropdown (Owner/Director/HR only) */}
                      {isOwner && (
                        <div>
                          <label className="text-[9px] uppercase font-bold text-[#9C9890] font-mono tracking-widest block mb-1">Company</label>
                          <select
                            className="w-full bg-white border border-[#E8E4DF] rounded-xl p-2.5 text-xs font-bold text-[#1C1C1A] focus:outline-none focus:border-[#C9A84C] focus:ring-1 focus:ring-[#C9A84C]"
                            value={selectedCompany}
                            onChange={(e) => {
                              setSelectedCompany(e.target.value);
                              setSelectedUser("");
                            }}
                          >
                            {sessionUser?.role === "Owner" && (
                              <option value="">All Companies</option>
                            )}
                            {visibleCompanies.map((c: any) => (
                              <option key={c.id} value={c.id.toString()}>{c.name}</option>
                            ))}
                          </select>
                        </div>
                      )}

                      {/* Department Dropdown */}
                      {isOwner && (
                        <div>
                          <label className="text-[9px] uppercase font-bold text-[#9C9890] font-mono tracking-widest block mb-1">Department</label>
                          <select
                            className="w-full bg-white border border-[#E8E4DF] rounded-xl p-2.5 text-xs font-bold text-[#1C1C1A] focus:outline-none focus:border-[#C9A84C] focus:ring-1 focus:ring-[#C9A84C]"
                            value={selectedDept}
                            onChange={(e) => {
                              setSelectedDept(e.target.value);
                              setSelectedUser("");
                            }}
                          >
                            <option value="">All Departments</option>
                            {departmentsList.map((d: any) => (
                              <option key={d} value={d}>{d}</option>
                            ))}
                          </select>
                        </div>
                      )}

                      {/* Employee Dropdown */}
                      {isOwner && (
                        <div>
                          <label className="text-[9px] uppercase font-bold text-[#9C9890] font-mono tracking-widest block mb-1">Employee</label>
                          <select
                            className="w-full bg-white border border-[#E8E4DF] rounded-xl p-2.5 text-xs font-bold text-[#1C1C1A] focus:outline-none focus:border-[#C9A84C] focus:ring-1 focus:ring-[#C9A84C]"
                            value={selectedUser}
                            onChange={(e) => setSelectedUser(e.target.value)}
                          >
                            <option value="">All Staff Members</option>
                            <optgroup label="Active Employees">
                              {uniqueUsersFromReports.activeList.map((u: any) => (
                                <option key={u.id} value={u.id}>{u.name}</option>
                              ))}
                            </optgroup>
                            {uniqueUsersFromReports.inactiveList.length > 0 && (
                              <optgroup label="Inactive / Archived Employees">
                                {uniqueUsersFromReports.inactiveList.map((u: any) => (
                                  <option key={u.id} value={u.id}>{u.name} (Archived / Inactive)</option>
                                ))}
                              </optgroup>
                            )}
                          </select>
                        </div>
                      )}

                      {/* Date Preset Filter */}
                      <div>
                        <label className="text-[9px] uppercase font-bold text-[#9C9890] font-mono tracking-widest block mb-1">Date Range Preset</label>
                        <select
                          className="w-full bg-white border border-[#E8E4DF] rounded-xl p-2.5 text-xs font-bold text-[#1C1C1A] focus:outline-none focus:border-[#C9A84C] focus:ring-1 focus:ring-[#C9A84C]"
                          value={dateFilterType}
                          onChange={(e: any) => {
                            setDateFilterType(e.target.value);
                            if (e.target.value !== "custom") {
                              setStartDateFilter("");
                              setEndDateFilter("");
                            }
                          }}
                        >
                          <option value="overall">Overall Date Filter</option>
                          <option value="current-month">Current Month</option>
                          <option value="custom">Custom Range</option>
                        </select>
                      </div>

                      {/* Custom Range Inputs */}
                      {dateFilterType === "custom" && (
                        <div className="space-y-2">
                          <div>
                            <label className="text-[8px] uppercase font-bold text-[#9C9890] font-mono tracking-widest block mb-1">Start Date</label>
                            <input
                              type="date"
                              className="w-full bg-white border border-[#E8E4DF] rounded-xl p-2 text-xs font-bold text-[#1C1C1A] focus:outline-none focus:border-[#C9A84C] focus:ring-1 focus:ring-[#C9A84C]"
                              value={startDateFilter}
                              onChange={(e) => setStartDateFilter(e.target.value)}
                            />
                          </div>
                          <div>
                            <label className="text-[8px] uppercase font-bold text-[#9C9890] font-mono tracking-widest block mb-1">End Date</label>
                            <input
                              type="date"
                              className="w-full bg-white border border-[#E8E4DF] rounded-xl p-2 text-xs font-bold text-[#1C1C1A] focus:outline-none focus:border-[#C9A84C] focus:ring-1 focus:ring-[#C9A84C]"
                              value={endDateFilter}
                              onChange={(e) => setEndDateFilter(e.target.value)}
                            />
                          </div>
                        </div>
                      )}

                      {/* User Status Filter */}
                      <div>
                        <label className="text-[9px] uppercase font-bold text-[#9C9890] font-mono tracking-widest block mb-1">User Status</label>
                        <select
                          className="w-full bg-white border border-[#E8E4DF] rounded-xl p-2.5 text-xs font-bold text-[#1C1C1A] focus:outline-none focus:border-[#C9A84C] focus:ring-1 focus:ring-[#C9A84C]"
                          value={userStatusFilter}
                          onChange={(e) => setUserStatusFilter(e.target.value as "active" | "inactive" | "all")}
                        >
                          <option value="active">Active Staff Only</option>
                          <option value="inactive">Inactive / Archived Staff</option>
                          <option value="all">All Staff (Active + Inactive)</option>
                        </select>
                      </div>
                    </div>

                    <div className="pt-2 flex gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setSearchTerm("");
                          setSelectedCompany("");
                          setSelectedDept("");
                          setSelectedUser("");
                          setDateFilterType("overall");
                          setStartDateFilter("");
                          setEndDateFilter("");
                          setUserStatusFilter("active");
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

              {/* TOGGLE COLUMN SELECTOR BUTTON - Right side of Filter Reports */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setShowColumnPicker(!showColumnPicker);
                    setShowFilters(false);
                  }}
                  className={`flex items-center gap-2 border px-4 py-2 text-xs font-bold transition-all rounded-xl shadow-sm focus:outline-none ${showColumnPicker
                    ? "bg-[#714B67] border-[#714B67] text-white font-black"
                    : "bg-[#FCFBF9] hover:bg-[#F5F2EC] border-[#E8E4DF] text-[#1C1C1A]"
                    }`}
                  title="Toggle columns for data export"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>Columns ({Object.values(selectedExportColumns).filter(Boolean).length}/{availableColumnsList.length})</span>
                  <ChevronDown className="w-3 h-3 text-[#9C9890]" />
                </button>

                {/* Floating Column Picker Popover */}
                {showColumnPicker && (
                  <div className="absolute right-0 mt-3 z-50 bg-[#FCFBF9] border border-[#E8E4DF] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.15)] rounded-2xl p-5 w-[340px] space-y-4 text-left normal-case font-sans animate-fadeIn">
                    <div className="flex justify-between items-center border-b border-[#E8E4DF] pb-2">
                      <span className="text-xs font-bold text-[#1C1C1A] tracking-wider uppercase font-mono flex items-center gap-1.5">
                        <SlidersHorizontal className="w-3.5 h-3.5 text-[#714B67]" /> Select Export Columns
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowColumnPicker(false)}
                        className="text-[#9C9890] hover:text-[#1C1C1A] transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-bold">
                      <span className="text-[#6B665E]">
                        {Object.values(selectedExportColumns).filter(Boolean).length} of {availableColumnsList.length} Selected
                      </span>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const allOn: Record<string, boolean> = {};
                            availableColumnsList.forEach(c => allOn[c.key] = true);
                            setSelectedExportColumns(allOn);
                          }}
                          className="text-[#714B67] hover:underline font-extrabold"
                        >
                          Select All
                        </button>
                        <span className="text-slate-300">|</span>
                        <button
                          type="button"
                          onClick={() => {
                            const allOff: Record<string, boolean> = {};
                            availableColumnsList.forEach(c => allOff[c.key] = false);
                            setSelectedExportColumns(allOff);
                          }}
                          className="text-rose-600 hover:underline font-extrabold"
                        >
                          Clear
                        </button>
                      </div>
                    </div>

                    {/* Column Toggle Checkboxes List */}
                    <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1 border-t border-b border-[#E8E4DF] py-3">
                      {availableColumnsList.map((col) => {
                        const isChecked = !!selectedExportColumns[col.key];
                        return (
                          <label
                            key={col.key}
                            className={`flex items-center justify-between p-2 rounded-xl border text-xs cursor-pointer transition-all ${
                              isChecked
                                ? "bg-purple-50/70 border-purple-200 text-purple-950 font-bold"
                                : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50 font-medium"
                            }`}
                          >
                            <span className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  setSelectedExportColumns(prev => ({
                                    ...prev,
                                    [col.key]: e.target.checked
                                  }));
                                }}
                                className="rounded text-[#714B67] focus:ring-[#714B67]"
                              />
                              {col.label}
                            </span>
                            {isChecked && <span className="text-[10px] text-purple-700 font-mono font-black">Active</span>}
                          </label>
                        );
                      })}
                    </div>

                    <div className="pt-1 flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          exportEodRegistry();
                          setShowColumnPicker(false);
                        }}
                        className="w-full bg-[#714B67] hover:bg-[#5F3F56] text-white py-2.5 rounded-xl text-xs font-extrabold transition-all shadow-md flex items-center justify-center gap-2"
                      >
                        <Download className="w-4 h-4" /> Export Report with Selected Columns
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Data Table / List */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            {loading ? (
              <div className="text-center py-12">
                <Loader2 className="w-8 h-8 text-[#714B67] animate-spin mx-auto mb-2" />
                <span className="text-xs font-mono font-black text-slate-400 uppercase tracking-widest">Loading reports...</span>
              </div>
            ) : filteredList.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <span className="text-xs font-bold text-slate-400">No {activeSubTab.toUpperCase()} submissions found for the selected criteria.</span>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-slate-450 font-black uppercase font-mono tracking-wider">
                      {isOwner && <th className="py-3.5 px-4 text-left">Employee</th>}
                      <th className="py-3.5 px-4 text-left">Date</th>
                      <th className="py-3.5 px-4 text-left">SOD Time</th>
                      <th className="py-3.5 px-4 text-left">EOD Time</th>
                      <th className="py-3.5 px-4 text-left cursor-pointer hover:text-[#714B67]" title="Click duration to see detailed tasks">Total Duration</th>
                      <th className="py-3.5 px-4 text-left">Status</th>
                      <th className="py-3.5 px-4 text-center">Selfies</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-semibold text-slate-650">
                    {filteredList.map((item: any) => {
                      const getDuration = (sod: any, eod: any) => {
                        if (!sod || !eod) return "-";
                        const sodTime = new Date(sod.createdAt);
                        const eodTime = new Date(eod.createdAt);
                        const diffMs = eodTime.getTime() - sodTime.getTime();
                        if (diffMs < 0) return "-";
                        const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
                        const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
                        return `${diffHrs}h ${diffMins}m`;
                      };
                      const durationStr = getDuration(item.sod, item.eod);
                      const rowKey = `${item.employee?.id || item.employee?.id || "unknown"}_${item.dateStr}`;
                      const isExpanded = !!expandedRows[rowKey];

                      const toggleRow = () => {
                        setExpandedRows(prev => ({
                          ...prev,
                          [rowKey]: !prev[rowKey]
                        }));
                      };

                      const empId2 = item.employee?.id?.toString() || "";
                      const dbUser2 = users.find((u: any) => u.id?.toString() === empId2);
                      const empSt = (dbUser2?.status || item.employee?.status || "active").toLowerCase();
                      const isInactiveRow = empSt === "inactive" || empSt === "archived";

                      return (
                        <React.Fragment key={rowKey}>
                          <tr
                            onClick={toggleRow}
                            className={`hover:bg-slate-50/50 cursor-pointer transition-all ${
                              isInactiveRow
                                ? "bg-rose-50/70 border-l-2 border-l-rose-400"
                                : isExpanded ? "bg-slate-50/30 font-bold" : ""
                            }`}
                          >
                            {isOwner && (
                              <td className="py-3.5 px-4">
                                <div className="flex flex-col">
                                  <span className="font-black text-slate-800">{item.employee?.name || "Unknown"}</span>
                                  <span className="text-[10px] text-slate-400 font-mono font-bold">
                                    {item.employee?.email || ""} {item.employee?.department ? `| ${item.employee.department}` : ""}
                                  </span>
                                  {(() => {
                                    const empId3 = item.employee?.id?.toString() || "";
                                    const dbUser3 = users.find((u: any) => u.id?.toString() === empId3);
                                    const st3 = (dbUser3?.status || item.employee?.status || "active").toLowerCase();
                                    return (st3 === "inactive" || st3 === "archived") ? (
                                      <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wide bg-rose-100 text-rose-700 border border-rose-200">INACTIVE</span>
                                    ) : null;
                                  })()}
                                </div>
                              </td>
                            )}
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <div className="flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                <span>{item.date.toLocaleDateString()}</span>
                              </div>
                            </td>
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              {item.sod ? (
                                <div className="flex items-center gap-1.5 text-emerald-600 font-bold">
                                  <Clock className="w-3.5 h-3.5" />
                                  <span>{formatTimeTo12Hour(item.sod.createdAt)}</span>
                                </div>
                              ) : (
                                <span className="text-slate-400 font-bold">—</span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              {item.eod ? (
                                <div className="flex items-center gap-1.5 text-[#714B67] font-bold">
                                  <Clock className="w-3.5 h-3.5" />
                                  <span>{formatTimeTo12Hour(item.eod.createdAt)}</span>
                                </div>
                              ) : (
                                <span className="text-slate-400 font-bold">—</span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <span className="text-xs font-black px-2.5 py-1 rounded-lg border bg-slate-50 border-slate-200 text-slate-800 shadow-sm">
                                {durationStr}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              {item.sod && item.eod ? (
                                <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-full">Completed</span>
                              ) : item.sod ? (
                                <span className="bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold px-2 py-0.5 rounded-full">SOD Active</span>
                              ) : item.eod ? (
                                <span className="bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold px-2 py-0.5 rounded-full">Only EOD</span>
                              ) : (
                                <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-bold px-2 py-0.5 rounded-full">Tasks Only</span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 whitespace-nowrap text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                {item.sod?.selfieUrl && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedSelfie(item.sod.selfieUrl);
                                    }}
                                    className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-655 rounded-lg border border-slate-250"
                                    title="View SOD Selfie"
                                  >
                                    <Eye className="w-3.5 h-3.5 text-emerald-600" />
                                  </button>
                                )}
                                {item.eod?.selfieUrl && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedSelfie(item.eod.selfieUrl);
                                    }}
                                    className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-655 rounded-lg border border-slate-250"
                                    title="View EOD Selfie"
                                  >
                                    <Eye className="w-3.5 h-3.5 text-[#714B67]" />
                                  </button>
                                )}
                                {!item.sod?.selfieUrl && !item.eod?.selfieUrl && (
                                  <span className="text-slate-400">—</span>
                                )}
                              </div>
                            </td>
                          </tr>



                          {isExpanded && (
                            <tr className="bg-slate-50/50">
                              <td colSpan={isOwner ? 7 : 6} className="p-4 border-t border-b border-slate-200">
                                <div className="space-y-4 text-left font-normal text-slate-700">
                                  <div>
                                    <h4 className="text-[10px] font-black uppercase font-mono tracking-wider text-slate-450 mb-2">
                                      Daily Tasks & activity Logs
                                    </h4>
                                    {item.tasks && item.tasks.length > 0 ? (
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {item.tasks.map((task: any) => (
                                          <div key={task.id} className="p-3 bg-white rounded-lg border border-slate-200 shadow-sm flex flex-col gap-1.5">
                                            <div className="flex items-center justify-between">
                                              <span className="font-bold text-slate-800 text-xs">{task.taskTitle}</span>
                                              <span className={`px-2 py-0.5 text-[9px] font-black tracking-wider uppercase font-mono rounded ${task.status === "Completed" ? "bg-emerald-50 text-emerald-700 border border-emerald-100" :
                                                task.status === "In Progress" ? "bg-amber-50 text-amber-700 border border-amber-100" :
                                                  "bg-slate-105 text-slate-600 border border-slate-200"
                                                }`}>
                                                {task.status}
                                              </span>
                                            </div>
                                            <div className="flex items-center justify-between text-[10px] text-slate-400">
                                              <span>Type: <strong className="text-slate-505">{task.taskType}</strong></span>
                                              {task.createdAt && (
                                                <span>
                                                  Logged: {new Date(task.createdAt).toLocaleDateString() !== item.date.toLocaleDateString()
                                                    ? new Date(task.createdAt).toLocaleString('en-US', { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: true })
                                                    : formatTimeTo12Hour(task.createdAt)}
                                                </span>
                                              )}
                                            </div>
                                            {task.description && (
                                              <p className="text-[10px] text-slate-505 bg-slate-55 p-2 rounded italic border border-slate-100">
                                                {task.description}
                                              </p>
                                            )}
                                            {(() => {
                                              let proofUrls: string[] = [];
                                              if (task.proofAttachment) {
                                                if (task.proofAttachment.startsWith('[') && task.proofAttachment.endsWith(']')) {
                                                  try {
                                                    proofUrls = JSON.parse(task.proofAttachment);
                                                  } catch (_) {
                                                    proofUrls = [task.proofAttachment];
                                                  }
                                                } else {
                                                  proofUrls = task.proofAttachment.split(',').map((u: any) => u.trim()).filter(Boolean);
                                                }
                                              }

                                              if (proofUrls.length === 0) return null;

                                              return (
                                                <div className="flex flex-wrap gap-1.5 mt-1.5">
                                                  {proofUrls.map((pUrl: string, index: number) => (
                                                    <button
                                                      key={index}
                                                      onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedSelfie(pUrl);
                                                      }}
                                                      className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-250 text-[9px] font-black uppercase px-2 py-1 rounded-lg flex items-center gap-1 transition-colors"
                                                      title={`View Task Proof #${index + 1}`}
                                                    >
                                                      <Eye className="w-3 h-3" />
                                                      Proof #{index + 1}
                                                    </button>
                                                  ))}
                                                </div>
                                              );
                                            })()}
                                            {task.scheduledAt && new Date(task.scheduledAt).toDateString() !== item.date.toDateString() ? (
                                              <div className="mt-1.5 bg-sky-50 border border-sky-300 text-[10.5px] font-black text-sky-900 px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 shadow-sm">
                                                <CalendarClock className="w-4 h-4 text-sky-600 shrink-0" />
                                                <span>➡️ Forwarded to {new Date(task.scheduledAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</span>
                                              </div>
                                            ) : null}
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <div className="text-slate-455 italic text-[10px] py-1 bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                                        No dynamic tasks logged for this day.
                                      </div>
                                    )}
                                  </div>

                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-3 border-t border-slate-200/80">
                                    {/* SOD Block */}
                                    <div className="space-y-1.5">
                                      <span className="text-[10px] uppercase font-mono font-bold text-emerald-600 flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-505"></span> Start of Day (SOD)
                                      </span>
                                      {item.sod ? (
                                        <div className="text-[11px] text-slate-600 bg-white p-3 rounded-lg border border-slate-200 space-y-1.5 shadow-sm">
                                          <div><strong>Planned Task Type:</strong> {item.sod.taskType}</div>
                                          {item.sod.projectName && <div><strong>Project Name:</strong> {item.sod.projectName}</div>}
                                          <div><strong>Summary:</strong> {item.sod.taskSummary}</div>
                                          {item.sod.remarks && <div><strong>Remarks:</strong> {item.sod.remarks}</div>}
                                          {item.sod.latitude && (
                                            <a
                                              href={`https://www.google.com/maps/search/?api=1&query=${item.sod.latitude},${item.sod.longitude}`}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="flex items-center gap-1 text-indigo-650 hover:underline font-bold text-[10px] mt-1"
                                              onClick={(e) => e.stopPropagation()}
                                            >
                                              <MapPin className="w-3 h-3 text-indigo-550" />
                                              <span>Lat: {item.sod.latitude.toFixed(4)}, Long: {item.sod.longitude.toFixed(4)}</span>
                                            </a>
                                          )}
                                        </div>
                                      ) : (
                                        <div className="text-[10px] italic text-slate-400 bg-white p-3 rounded-lg border border-slate-200 shadow-sm">No SOD submitted.</div>
                                      )}
                                    </div>

                                    {/* EOD Block */}
                                    <div className="space-y-1.5">
                                      <span className="text-[10px] uppercase font-mono font-bold text-[#714B67] flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-[#714B67]"></span> End of Day (EOD)
                                      </span>
                                      {item.eod ? (
                                        <div className="text-[11px] text-slate-600 bg-white p-3 rounded-lg border border-slate-200 space-y-1.5 shadow-sm">
                                          <div><strong>Completed Work:</strong> {item.eod.completedWork}</div>
                                          <div><strong>Pending Work:</strong> {item.eod.pendingWork}</div>
                                          <div><strong>Tomorrow's Plan:</strong> {item.eod.tomorrowPlan}</div>
                                          {item.eod.issues && <div className="text-rose-700"><strong>Issues:</strong> {item.eod.issues}</div>}
                                          {item.eod.latitude && (
                                            <a
                                              href={`https://www.google.com/maps/search/?api=1&query=${item.eod.latitude},${item.eod.longitude}`}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="flex items-center gap-1 text-indigo-650 hover:underline font-bold text-[10px] mt-1"
                                              onClick={(e) => e.stopPropagation()}
                                            >
                                              <MapPin className="w-3 h-3 text-indigo-500" />
                                              <span>Lat: {item.eod.latitude.toFixed(4)}, Long: {item.eod.longitude.toFixed(4)}</span>
                                            </a>
                                          )}
                                        </div>
                                      ) : (
                                        <div className="text-[10px] italic text-slate-400 bg-white p-3 rounded-lg border border-slate-200 shadow-sm">No EOD submitted.</div>
                                      )}
                                    </div>

                                    {/* Field Visit Block */}
                                    <div className="space-y-1.5">
                                      <span className="text-[10px] uppercase font-mono font-bold text-indigo-650 flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-550"></span> Field Visits ({item.fieldVisits ? item.fieldVisits.length : 0})
                                      </span>
                                      {item.fieldVisits && item.fieldVisits.length > 0 ? (
                                        <div className="text-[11px] text-slate-600 bg-white p-3 rounded-lg border border-slate-200 space-y-2 shadow-sm max-h-[160px] overflow-y-auto">
                                          {item.fieldVisits.map((v: any, vIdx: number) => (
                                            <div key={v.id || vIdx} className={`${vIdx > 0 ? "pt-2 border-t border-slate-100" : ""}`}>
                                              <div><strong>Client:</strong> {v.client_name || "N/A"}</div>
                                              <div><strong>Purpose:</strong> {v.purpose || "N/A"}</div>
                                              <div><strong>Distance:</strong> {v.distance_travelled || 0} KM</div>
                                              {v.visit_summary && <div><strong>Summary:</strong> {v.visit_summary}</div>}
                                              {v.opening_location && (
                                                <div className="text-[10px] text-slate-450 mt-0.5">
                                                  Loc: {v.opening_location} ➔ {v.closing_location || "Open"}
                                                </div>
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                      ) : (
                                        <div className="text-[10px] italic text-slate-400 bg-white p-3 rounded-lg border border-slate-200 shadow-sm">No Field Visits logged.</div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* File/Selfie Viewer Modal */}
      {selectedSelfie && typeof document !== "undefined" && ReactDOM.createPortal(
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-md z-[20000] flex items-center justify-center p-4"
          onClick={() => setSelectedSelfie(null)}
        >
          <div
            className="bg-white rounded-2xl overflow-hidden shadow-2xl max-w-4xl w-full border border-slate-200 relative animate-scaleIn animate-duration-200 flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h4 className="text-sm font-black text-[#714B67] uppercase font-mono tracking-wider">Document / Proof Viewer</h4>
              <button
                onClick={() => setSelectedSelfie(null)}
                className="p-1.5 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-700 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 bg-slate-900 flex items-center justify-center p-4 min-h-[50vh] overflow-hidden">
              {(() => {
                const url = selectedSelfie.toLowerCase();
                const isPdf = url.includes('application/pdf') || url.includes('.pdf');
                const isAudio = url.includes('audio/') || url.includes('.mp3') || url.includes('.wav') || url.includes('.m4a') || url.includes('.ogg') || url.includes('.aac') || url.includes('.amr') || url.includes('.opus') || url.includes('.wma');
                const isVideo = url.includes('video/') || url.includes('.mp4') || url.includes('.webm') || url.includes('.mov') || url.includes('.avi') || url.includes('.mkv');

                if (isPdf) {
                  return (
                    <iframe
                      src={selectedSelfie}
                      className="w-full h-[70vh] rounded bg-white"
                      title="PDF Document"
                    />
                  );
                }

                if (isAudio) {
                  return (
                    <div className="bg-slate-800 p-8 rounded-xl flex flex-col items-center justify-center w-full max-w-md">
                      <div className="w-16 h-16 bg-slate-700 rounded-full flex items-center justify-center mb-6 shadow-inner">
                        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-300"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path><path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path></svg>
                      </div>
                      <audio controls className="w-full" autoPlay>
                        <source src={selectedSelfie} />
                        Your browser does not support the audio element.
                      </audio>
                    </div>
                  );
                }

                if (isVideo) {
                  return (
                    <video controls className="max-w-full max-h-[70vh] rounded" autoPlay>
                      <source src={selectedSelfie} />
                      Your browser does not support the video tag.
                    </video>
                  );
                }

                const selfieSrc = selectedSelfie.startsWith("http://localhost/") ? selectedSelfie.replace("http://localhost/", "http://localhost:3000/") : selectedSelfie;
                // Default to Image
                return (
                  <img
                    src={selfieSrc}
                    alt="Document/Selfie"
                    className="max-w-full max-h-[75vh] object-contain rounded"
                    onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }}
                  />
                );
              })()}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

function FineEmployeeSearchCombobox({
  employees,
  selectedEmployee,
  onSelectEmployee
}: {
  employees: any[];
  selectedEmployee: { id: string; name: string } | null;
  onSelectEmployee: (emp: { id: string; name: string } | null) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = React.useMemo(() => {
    if (!query.trim()) return employees;
    const q = query.toLowerCase();
    return employees.filter(emp =>
      (emp.name || "").toLowerCase().includes(q) ||
      (emp.role || "").toLowerCase().includes(q) ||
      (emp.email || "").toLowerCase().includes(q)
    );
  }, [employees, query]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedEmpObject = employees.find(e => String(e.id) === String(selectedEmployee?.id));

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={isOpen ? query : (selectedEmpObject ? `${selectedEmpObject.name} ${selectedEmpObject.role ? `(${selectedEmpObject.role})` : ''}` : "")}
          onFocus={() => {
            setQuery("");
            setIsOpen(true);
          }}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          placeholder="🔍 Type to search employee by name/role..."
          className="w-full bg-white border border-slate-300 rounded-xl pl-8 pr-7 py-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-rose-500 shadow-2xs"
        />
        {selectedEmployee && !isOpen && (
          <button
            type="button"
            onClick={() => {
              onSelectEmployee(null);
              setQuery("");
            }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
          >
            ✕
          </button>
        )}
      </div>

      {isOpen && (
        <div className="absolute z-[99999] left-0 top-full mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-2xl max-h-48 overflow-y-auto custom-scrollbar p-1 animate-in fade-in duration-150">
          {filtered.map((emp) => {
            const isSelected = String(emp.id) === String(selectedEmployee?.id);
            return (
              <button
                key={emp.id}
                type="button"
                onClick={() => {
                  onSelectEmployee({ id: emp.id, name: emp.name });
                  setQuery("");
                  setIsOpen(false);
                }}
                className={`w-full text-left p-2.5 hover:bg-rose-50 rounded-lg transition-colors flex items-center justify-between gap-2 text-xs ${isSelected ? 'bg-rose-50 text-rose-900 font-black' : ''}`}
              >
                <div className="truncate">
                  <span className="font-bold text-slate-800 block truncate">{emp.name || "Employee"}</span>
                  <span className="text-[10px] text-slate-400 font-medium truncate block">{emp.role || "User"} {emp.email ? `• ${emp.email}` : ""}</span>
                </div>
                {isSelected && (
                  <span className="text-[10px] font-bold text-rose-600 bg-rose-100 px-2 py-0.5 rounded shrink-0">Selected</span>
                )}
              </button>
            );
          })}
          {filtered.length === 0 && (
            <div className="p-3 text-center text-xs text-slate-400 font-medium">
              No matching employees found
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function LeaveRequestTab({ sessionUser, initialSearchFilter }: { sessionUser?: any; initialSearchFilter?: string }) {
  const userRole = sessionUser?.role;
  const isManager = userRole === "Department Manager";
  const isHR = ["HR Head", "HR Executive"].includes(userRole);
  const isOwnerOrDirector = userRole === "Owner" || userRole === "Director";

  // Form states
  const [leaveType, setLeaveType] = useState("Casual Leave");
  const [customLeaveType, setCustomLeaveType] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // History/List states
  const [leavesList, setLeavesList] = useState<any[]>([]);
  const [loadingList, setLoadingList] = useState(true);

  const hasDirectReports = React.useMemo(() => {
    return leavesList.some((l) => l.employee && String(l.employee.id) !== String(sessionUser?.id));
  }, [leavesList, sessionUser]);

  const canApprove = isOwnerOrDirector || isHR || isManager || hasDirectReports;
  const canApply = !isOwnerOrDirector && (userRole === "Employee" || isManager || !canApprove || hasDirectReports);
  const canImposeFine = isOwnerOrDirector || isManager;
  const canRemoveFine = isOwnerOrDirector || isHR || isManager || ["Owner", "Director", "HR Head", "HR Executive", "Department Manager"].includes(userRole);

  // Filter states
  const [filterUser, setFilterUser] = useState("");
  const [datePreset, setDatePreset] = useState<"current_month" | "last_month" | "custom" | "all">("current_month");
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [searchTerm, setSearchTerm] = useState(initialSearchFilter || "");
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    if (initialSearchFilter !== undefined) {
      setSearchTerm(initialSearchFilter);
    }
  }, [initialSearchFilter]);

  // Action state
  const [actionRemarks, setActionRemarks] = useState<{ [key: string]: string }>({});

  // Fine modal & history state
  const [myFines, setMyFines] = useState<any[]>([]);
  const [loadingFines, setLoadingFines] = useState(false);
  const [expandedFineId, setExpandedFineId] = useState<string | null>(null);

  // Fine history employee filter
  const [fineEmployeeFilter, setFineEmployeeFilter] = useState("All");

  const fineEmployeeOptions = React.useMemo(() => {
    if (!Array.isArray(myFines) || myFines.length === 0) return ["All"];
    const names = new Set<string>();
    myFines.forEach(f => {
      const name = f.employeeInfo?.name || f.employeeName || "";
      if (name) names.add(name);
    });
    return ["All", ...Array.from(names).sort()];
  }, [myFines]);

  const filteredMyFines = React.useMemo(() => {
    if (fineEmployeeFilter === "All") return myFines;
    return myFines.filter(f => (f.employeeInfo?.name || f.employeeName || "") === fineEmployeeFilter);
  }, [myFines, fineEmployeeFilter]);

  const displayFines = React.useMemo(() => {
    if (!Array.isArray(filteredMyFines) || filteredMyFines.length === 0) return [];

    // Sort raw fines by employeeId, then date ascending
    const sorted = [...filteredMyFines].sort((a, b) => {
      const empA = String(a.employee || a.employeeId || "");
      const empB = String(b.employee || b.employeeId || "");
      if (empA !== empB) return empA.localeCompare(empB);
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return dateA - dateB;
    });

    const grouped: any[] = [];
    let currentGroup: any = null;

    for (const item of sorted) {
      const itemEmpId = String(item.employee || item.employeeId || "");
      const itemReason = item.reason || "";
      const itemAmount = Number(item.amount) || 0;
      const itemImposedBy = String(item.imposedBy || "");

      if (!currentGroup) {
        currentGroup = {
          id: item.id,
          rawIds: [item.id],
          employee: itemEmpId,
          employeeInfo: item.employeeInfo,
          fromDate: item.date,
          toDate: item.date,
          perDayAmount: itemAmount,
          totalAmount: itemAmount,
          daysCount: 1,
          reason: itemReason,
          imposedBy: itemImposedBy,
          imposedByInfo: item.imposedByInfo,
          createdAt: item.createdAt || item.imposedAt
        };
      } else {
        const dPrev = new Date(currentGroup.toDate);
        const dCurr = new Date(item.date);
        const utcPrev = Date.UTC(dPrev.getFullYear(), dPrev.getMonth(), dPrev.getDate());
        const utcCurr = Date.UTC(dCurr.getFullYear(), dCurr.getMonth(), dCurr.getDate());
        const dayDiff = Math.round((utcCurr - utcPrev) / (1000 * 60 * 60 * 24));

        const isSameGroup =
          currentGroup.employee === itemEmpId &&
          currentGroup.reason === itemReason &&
          currentGroup.perDayAmount === itemAmount &&
          currentGroup.imposedBy === itemImposedBy &&
          (dayDiff === 1 || dayDiff === 0);

        if (isSameGroup) {
          currentGroup.toDate = item.date;
          currentGroup.totalAmount += itemAmount;
          currentGroup.daysCount += 1;
          if (item.id) currentGroup.rawIds.push(item.id);
        } else {
          grouped.push(currentGroup);
          currentGroup = {
            id: item.id,
            rawIds: [item.id],
            employee: itemEmpId,
            employeeInfo: item.employeeInfo,
            fromDate: item.date,
            toDate: item.date,
            perDayAmount: itemAmount,
            totalAmount: itemAmount,
            daysCount: 1,
            reason: itemReason,
            imposedBy: itemImposedBy,
            imposedByInfo: item.imposedByInfo,
            createdAt: item.createdAt || item.imposedAt
          };
        }
      }
    }

    if (currentGroup) {
      grouped.push(currentGroup);
    }

    // Sort grouped list by created/date descending (newest first)
    return grouped.sort((a, b) => new Date(b.fromDate).getTime() - new Date(a.fromDate).getTime());
  }, [filteredMyFines]);

  const handleDeleteFine = async (fine: any) => {
    const empName = fine.employeeInfo?.name || "Employee";
    const ids = fine.rawIds && fine.rawIds.length ? fine.rawIds : [fine.id];
    if (!confirm(`Are you sure you want to remove fine of ₹${Number(fine.totalAmount).toLocaleString('en-IN')} for ${empName}?`)) {
      return;
    }

    try {
      const res = await fetch("/api/fines", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fineIds: ids }),
      });
      const data = await res.json();
      if (data.success) {
        setExpandedFineId(null);
        fetchMyFines();
        alert("✅ Fine record removed successfully!");
      } else {
        alert(data.error || "Failed to remove fine");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to remove fine");
    }
  };

  const [showFineModal, setShowFineModal] = useState(false);
  const [fineEmployee, setFineEmployee] = useState<{ id: string; name: string } | null>(null);
  const [fineFromDate, setFineFromDate] = useState("");
  const [fineToDate, setFineToDate] = useState("");
  const [fineAmount, setFineAmount] = useState(500);
  const [fineReason, setFineReason] = useState("Absent without prior notification");
  const [imposingFine, setImposingFine] = useState(false);
  const [allEmployeesList, setAllEmployeesList] = useState<any[]>([]);

  const fetchMyFines = async () => {
    setLoadingFines(true);
    try {
      const res = await fetch("/api/fines");
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setMyFines(data.data);
      }
    } catch (err) {
      console.error("Error fetching my fines:", err);
    } finally {
      setLoadingFines(false);
    }
  };

  useEffect(() => {
    fetchLeaves();
    if (canApprove || canImposeFine) {
      fetchEmployees();
    }
    fetchMyFines();
  }, [canApprove, canImposeFine]);

  const fineTotalDays = React.useMemo(() => {
    if (!fineFromDate) return 0;
    const endStr = fineToDate || fineFromDate;
    const start = new Date(fineFromDate);
    const end = new Date(endStr);
    if (end < start) return 0;
    const diffTime = end.getTime() - start.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
  }, [fineFromDate, fineToDate]);

  const totalFineCalculated = (fineAmount || 0) * fineTotalDays;

  const fetchEmployees = async () => {
    try {
      const res = await fetch("/api/employees");
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setAllEmployeesList(data.data);
      }
    } catch (err) {
      console.error("Error fetching all employees for fine modal:", err);
    }
  };

  const handleImposeFine = async () => {
    if (!fineEmployee || !fineFromDate) {
      alert("Please select employee and date range");
      return;
    }
    setImposingFine(true);
    try {
      const res = await fetch("/api/fines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: fineEmployee.id,
          fromDate: fineFromDate,
          toDate: fineToDate || fineFromDate,
          amount: fineAmount,
          reason: fineReason,
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert(`✅ Total ₹${totalFineCalculated.toLocaleString('en-IN')} fine imposed on ${fineEmployee.name} (${fineTotalDays} Day(s))! Email notification sent.`);
        setShowFineModal(false);
        setFineEmployee(null);
        setFineFromDate("");
        setFineToDate("");
        setFineAmount(500);
        setFineReason("Absent without prior notification");
        fetchMyFines();
      } else {
        alert(data.error || "Failed to impose fine");
      }
    } catch (err) {
      alert("Failed to impose fine");
    } finally {
      setImposingFine(false);
    }
  };

  const fetchLeaves = async () => {
    setLoadingList(true);
    try {
      const res = await fetch("/api/leaves");
      const data = await res.json();
      if (data.success) {
        setLeavesList(data.data || []);
      }
    } catch (err) {
      console.error("Error fetching leaves:", err);
    } finally {
      setLoadingList(false);
    }
  };



  const allSelectableEmployees = React.useMemo(() => {
    const map = new Map<string, { id: string; name: string; role?: string; email?: string }>();

    // 1. Add employees from /api/employees
    (allEmployeesList || []).forEach((emp: any) => {
      const empId = String(emp.id || emp._id || "");
      if (empId) {
        const statusStr = String(emp.status || "active").toLowerCase();
        if (["inactive", "archived", "terminated"].includes(statusStr)) return;

        map.set(empId, {
          id: empId,
          name: emp.name || emp.employeeName || "Employee",
          role: emp.role || emp.designation || "",
          email: emp.email || ""
        });
      }
    });

    // 2. Add employees from leavesList
    (leavesList || []).forEach((l: any) => {
      if (l.employee && l.employee.id) {
        const empId = String(l.employee.id);
        const statusStr = String(l.employee.status || "active").toLowerCase();
        if (["inactive", "archived", "terminated"].includes(statusStr)) return;

        if (empId && !map.has(empId)) {
          map.set(empId, {
            id: empId,
            name: l.employee.name || "Employee",
            role: l.employee.role || "",
            email: l.employee.email || ""
          });
        }
      }
    });

    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [allEmployeesList, leavesList]);

  const uniqueUsers = React.useMemo(() => {
    const role = (sessionUser?.role || "Employee").toLowerCase();
    const userId = (sessionUser?.id || "").toString();

    const canSeeAll = ["owner", "director", "cfo", "hr head", "hr-head", "hr executive", "hr-executive", "department manager"].includes(role) || hasDirectReports;

    const userMap = new Map<string, { id: string; name: string; email: string }>();

    // Always add self if active
    if (sessionUser && sessionUser.id) {
      const selfStatus = String(sessionUser.status || "active").toLowerCase();
      if (!["inactive", "archived", "terminated"].includes(selfStatus)) {
        userMap.set(userId, {
          id: userId,
          name: `${sessionUser.name || "Self"} (Self)`,
          email: sessionUser.email || ""
        });
      }
    }

    if (canSeeAll) {
      // Add all active employees from allEmployeesList
      (allEmployeesList || []).forEach((emp: any) => {
        const empId = String(emp.id || emp._id || "");
        if (!empId) return;

        const statusStr = String(emp.status || "active").toLowerCase();
        if (["inactive", "archived", "terminated"].includes(statusStr)) return;

        const empName = emp.name || emp.employeeName || "Employee";
        const isSelf = empId === userId;

        userMap.set(empId, {
          id: empId,
          name: isSelf ? `${sessionUser?.name || empName} (Self)` : empName,
          email: emp.email || ""
        });
      });
    }

    // Also check leavesList
    leavesList.forEach((leave) => {
      if (leave.employee && leave.employee.id) {
        const empId = leave.employee.id.toString();

        if (!canSeeAll && empId !== userId) return;

        const statusStr = String(leave.employee.status || "active").toLowerCase();
        if (["inactive", "archived", "terminated"].includes(statusStr)) return;

        if (!userMap.has(empId)) {
          userMap.set(empId, {
            id: empId,
            name: leave.employee.name || "Employee",
            email: leave.employee.email || ""
          });
        }
      }
    });

    const userList = Array.from(userMap.values());
    userList.sort((a, b) => {
      if (a.id === userId) return -1;
      if (b.id === userId) return 1;
      return a.name.localeCompare(b.name);
    });

    return userList;
  }, [allEmployeesList, leavesList, sessionUser, hasDirectReports]);

  // Synchronize selection
  useEffect(() => {
    if (filterUser) {
      const userExists = uniqueUsers.some((u) => u.id === filterUser);
      if (!userExists) {
        setFilterUser("");
      }
    }
  }, [uniqueUsers, filterUser]);

  const getActivePeriodLabel = () => {
    const now = new Date();
    if (datePreset === "current_month") {
      return `Current Month (${now.toLocaleDateString("en-US", { month: "short", year: "numeric" })})`;
    }
    if (datePreset === "last_month") {
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return `Last Month (${lastMonth.toLocaleDateString("en-US", { month: "short", year: "numeric" })})`;
    }
    if (datePreset === "custom") {
      if (filterStartDate && filterEndDate) {
        return `${new Date(filterStartDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })} to ${new Date(filterEndDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}`;
      } else if (filterStartDate) {
        return `From ${new Date(filterStartDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}`;
      } else if (filterEndDate) {
        return `Until ${new Date(filterEndDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}`;
      }
      return "Custom Date Range";
    }
    return "All Time History";
  };

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

  const filteredLeaves = leavesList.filter((leave: any) => {
    // 1. User Filter (by ID - handle both object and string formats)
    if (filterUser !== "") {
      const empId = typeof leave.employee === "object" && leave.employee !== null
        ? String(leave.employee.id || leave.employee._id || "")
        : String(leave.employee || leave.employeeId || "");

      if (empId !== String(filterUser)) {
        return false;
      }
    }

    // 2. Date Range Filter
    const sDate = parseLeaveDate(leave.startDate) || parseLeaveDate(leave.createdAt);
    const eDate = parseLeaveDate(leave.endDate) || sDate;

    if (sDate && eDate) {
      const leaveStart = new Date(sDate.getFullYear(), sDate.getMonth(), sDate.getDate(), 0, 0, 0, 0);
      const leaveEnd = new Date(eDate.getFullYear(), eDate.getMonth(), eDate.getDate(), 23, 59, 59, 999);

      const now = new Date();
      if (datePreset === "current_month") {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        if (leaveEnd < startOfMonth || leaveStart > endOfMonth) {
          return false;
        }
      } else if (datePreset === "last_month") {
        const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
        const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
        if (leaveEnd < startOfLastMonth || leaveStart > endOfLastMonth) {
          return false;
        }
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

    // 3. Status Filter
    if (filterStatus !== "All") {
      if (filterStatus === "Pending") {
        if (!["Pending", "Pending Manager Approval", "Pending HR Approval"].includes(leave.status)) {
          return false;
        }
      } else {
        if (leave.status !== filterStatus) {
          return false;
        }
      }
    }

    // 4. Leave Type / Search Term Filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      const lType = String(leave.leaveType || leave.type || "").toLowerCase();
      const lReason = String(leave.reason || "").toLowerCase();
      const empName = String(leave.employeeInfo?.name || leave.employee?.name || "").toLowerCase();
      if (!lType.includes(term) && !lReason.includes(term) && !empName.includes(term)) {
        return false;
      }
    }

    return true;
  });

  const handleApplyLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate || !endDate || !reason) {
      alert("Please fill all required fields");
      return;
    }

    const effectiveType = leaveType === "Other" ? customLeaveType.trim() : leaveType;
    if (leaveType === "Other" && !effectiveType) {
      alert("Please specify custom Leave Type");
      return;
    }

    // calculate number of days
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    let diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    if (effectiveType === "Half Day" || effectiveType === "Half Day Leave") {
      diffDays = 0.5;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/leaves", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: effectiveType,
          startDate,
          endDate,
          days: diffDays,
          reason
        })
      });
      const data = await res.json();
      if (data.success) {
        setStartDate("");
        setEndDate("");
        setReason("");
        setCustomLeaveType("");
        fetchLeaves();
      } else {
        alert(data.error || "Failed to submit leave request");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to submit leave request");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (leaveId: string, status: "Approved" | "Rejected") => {
    const remarks = actionRemarks[leaveId] || "";
    try {
      const res = await fetch("/api/leaves", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leaveId,
          status,
          remarks
        })
      });
      const data = await res.json();
      if (data.success) {
        fetchLeaves();
        // Clear remarks for this leave
        setActionRemarks(prev => {
          const next = { ...prev };
          delete next[leaveId];
          return next;
        });
      } else {
        alert(data.error || "Failed to update leave status");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to update leave status");
    }
  };

  return (
    <>
      <div className="space-y-8 animate-fadeIn text-slate-800">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-black text-slate-850">Leave Management Hub</h1>
            <p className="text-xs text-slate-500 mt-1">
              {canApprove
                ? "Review, approve, and track department-level or company-level leave applications."
                : "Submit casual, sick, or unpaid leave requests and track approval history"}
            </p>
          </div>
          {canImposeFine && (
            <button
              onClick={() => setShowFineModal(true)}
              className="flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black px-4 py-2 rounded-lg shadow transition-all whitespace-nowrap"
            >
              ⚠️ Impose Absent Fine
            </button>
          )}
        </div>

        {/* ── Top Row 2-Column Grid: Apply Leave Form (Left) & Absent Fines History (Right) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">

          {/* Form View for Applicants */}
          {canApply && (
            <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="text-xs font-black tracking-widest text-[#714B67] uppercase font-mono pb-2 border-b border-slate-100 mb-4 flex items-center justify-between">
                  <span>📋 Apply for Leave Request</span>
                </h3>

                <form onSubmit={handleApplyLeave} className="space-y-4 font-semibold text-slate-650">
                  <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-indigo-500" />
                      <span className="text-xs font-black text-slate-850 uppercase tracking-wide">
                        Applicant Name: {sessionUser?.name || "Employee"}
                      </span>
                    </div>
                    <div className="bg-indigo-50 border border-indigo-150 px-2 py-0.5 rounded text-[10px] text-indigo-700 font-mono font-bold">
                      {sessionUser?.role || "Staff"}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] uppercase font-black text-slate-500 font-mono tracking-wider">Leave Type *</label>
                      <select
                        className="w-full bg-white border border-slate-300 rounded p-2 text-xs font-bold text-slate-900 mt-1.5 focus:outline-none focus:border-[#714B67]"
                        value={leaveType}
                        onChange={(e) => {
                          setLeaveType(e.target.value);
                          if (e.target.value !== "Other") setCustomLeaveType("");
                        }}
                      >
                        <option value="Casual Leave">Casual Leave</option>
                        <option value="Half Day">Half Day Leave</option>
                        <option value="Sick Leave">Sick Leave</option>
                        <option value="Earned Leave">Earned Leave</option>
                        <option value="Unpaid Leave">Unpaid Leave</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    {leaveType === "Other" ? (
                      <div>
                        <label className="text-[10px] uppercase font-black text-slate-500 font-mono tracking-wider">Specify Leave Type *</label>
                        <input
                          type="text"
                          placeholder="Custom leave type..."
                          className="w-full bg-white border border-slate-300 rounded p-2 text-xs font-bold text-slate-900 mt-1.5 focus:outline-none focus:border-[#714B67]"
                          value={customLeaveType}
                          onChange={(e) => setCustomLeaveType(e.target.value)}
                        />
                      </div>
                    ) : (
                      <div>
                        <label className="text-[10px] uppercase font-black text-slate-500 font-mono tracking-wider">Reason for Leave *</label>
                        <input
                          type="text"
                          placeholder="Short description..."
                          className="w-full bg-white border border-slate-300 rounded p-2 text-xs font-bold text-slate-900 mt-1.5 focus:outline-none focus:border-[#714B67]"
                          value={reason}
                          onChange={(e) => setReason(e.target.value)}
                        />
                      </div>
                    )}
                  </div>

                  {leaveType === "Other" && (
                    <div>
                      <label className="text-[10px] uppercase font-black text-slate-500 font-mono tracking-wider">Reason for Leave *</label>
                      <input
                        type="text"
                        placeholder="Short description..."
                        className="w-full bg-white border border-slate-300 rounded p-2 text-xs font-bold text-slate-900 mt-1.5 focus:outline-none focus:border-[#714B67]"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] uppercase font-black text-slate-500 font-mono tracking-wider">Start Date *</label>
                      <input
                        type="date"
                        className="w-full bg-white border border-slate-300 rounded p-2 text-xs font-bold text-slate-900 mt-1.5 focus:outline-none focus:border-[#714B67]"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-black text-slate-500 font-mono tracking-wider">End Date *</label>
                      <input
                        type="date"
                        className="w-full bg-white border border-slate-300 rounded p-2 text-xs font-bold text-slate-900 mt-1.5 focus:outline-none focus:border-[#714B67]"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex justify-end">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="bg-[#714B67] hover:bg-[#5F3F56] w-full px-4 py-3 rounded-lg text-xs font-black text-white transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
                    >
                      {submitting ? "Submitting Leave..." : "Apply Leave"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* ── Absent Fines History Section (Right Side - Height Matched with Scrollbar) ── */}
          <div id="absent-fines-section" className={`${canApply ? "lg:col-span-5" : "lg:col-span-9"} bg-white border border-rose-200/80 rounded-xl p-5 shadow-sm flex flex-col justify-between h-full`}>
            <div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-rose-100 mb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-rose-100 text-rose-700 rounded-xl">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-rose-950 uppercase tracking-wide">
                      ⚠️ Absent Fines & Deductions History
                    </h3>
                    <p className="text-[10px] text-rose-600 font-medium">
                      Imposed absence fines & compliance deductions
                    </p>
                  </div>
                </div>

                {myFines.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap">
                    {canApprove && fineEmployeeOptions.length > 1 && (
                      <select
                        value={fineEmployeeFilter}
                        onChange={(e) => setFineEmployeeFilter(e.target.value)}
                        className="text-[10px] font-bold text-slate-800 bg-white border border-rose-200 rounded-xl px-2.5 py-1 focus:outline-none focus:border-rose-400 shadow-2xs cursor-pointer"
                      >
                        <option value="All">👥 All Employees</option>
                        {fineEmployeeOptions.filter(n => n !== "All").map((name, i) => (
                          <option key={i} value={name}>👤 {name}</option>
                        ))}
                      </select>
                    )}
                    <div className="flex items-center gap-1.5 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-xl">
                      <span className="text-[10px] font-bold text-rose-700">Total:</span>
                      <span className="text-xs font-black text-rose-800 bg-rose-200/70 px-2 py-0.5 rounded-md">
                        ₹{filteredMyFines.reduce((sum, f) => sum + (Number(f.amount) || 0), 0).toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {loadingFines ? (
                <div className="p-4 text-center text-xs font-bold text-slate-400">Loading fine history...</div>
              ) : displayFines.length === 0 ? (
                <div className="p-4 text-center bg-slate-50/50 rounded-xl border border-dashed border-slate-200 text-xs font-semibold text-slate-500">
                  ✅ Great news! No absence fines recorded.
                </div>
              ) : (
                <div className="overflow-y-auto overflow-x-auto custom-scrollbar max-h-[300px]">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-rose-50/80 text-rose-950 text-[10px] uppercase font-black tracking-wider border-b border-rose-100 sticky top-0 bg-rose-50 z-10">
                        {canApprove && <th className="py-2 px-2">Employee</th>}
                        <th className="py-2 px-2">Absence Date</th>
                        <th className="py-2 px-2">Fine Amount</th>
                        <th className="py-2 px-2">Reason</th>
                        {canRemoveFine && <th className="py-2 px-2 text-right">Action</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-semibold text-slate-800">
                      {displayFines.map((fine: any) => {
                        const isExpanded = expandedFineId === fine.id;
                        const colSpanCount = (canApprove ? 4 : 3) + (canRemoveFine ? 1 : 0);
                        return (
                          <React.Fragment key={fine.id}>
                            <tr
                              onClick={() => setExpandedFineId(isExpanded ? null : fine.id)}
                              className={`hover:bg-rose-50/50 transition-all cursor-pointer ${isExpanded ? "bg-rose-50/60" : ""
                                }`}
                              title="Click to view complete fine reason"
                            >
                              {canApprove && (
                                <td className="py-2 px-2">
                                  <span className="font-bold text-slate-900 block truncate max-w-[110px]">
                                    {fine.employeeInfo?.name || "Employee"}
                                  </span>
                                </td>
                              )}
                              <td className="py-2 px-2 font-bold text-slate-900 whitespace-nowrap">
                                📅 {fine.daysCount > 1
                                  ? `${new Date(fine.fromDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} to ${new Date(fine.toDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} (${fine.daysCount} Days)`
                                  : new Date(fine.fromDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                              </td>
                              <td className="py-2 px-2 whitespace-nowrap">
                                <span className="px-1.5 py-0.5 bg-rose-100 text-rose-800 rounded font-black border border-rose-200 text-[11px]">
                                  ₹{Number(fine.totalAmount).toLocaleString('en-IN')}
                                  {fine.daysCount > 1 && (
                                    <span className="text-[10px] text-rose-600 font-bold ml-1">
                                      (₹{fine.perDayAmount}/day)
                                    </span>
                                  )}
                                </span>
                              </td>
                              <td className="py-2 px-2 text-slate-700 max-w-[150px] truncate" title={fine.reason}>
                                {fine.reason}
                              </td>
                              {canRemoveFine && (
                                <td className="py-2 px-2 text-right whitespace-nowrap">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteFine(fine);
                                    }}
                                    className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded text-[10px] font-bold transition-all flex items-center gap-1 ml-auto"
                                    title="Remove / Delete Fine"
                                  >
                                    🗑️ Remove
                                  </button>
                                </td>
                              )}
                            </tr>
                            {isExpanded && (
                              <tr className="bg-rose-50/40 border-b border-rose-200/60">
                                <td colSpan={colSpanCount} className="px-3 py-2.5">
                                  <div className="bg-white border border-rose-200 rounded-xl p-3 shadow-xs space-y-2 animate-fadeIn">
                                    <div className="flex items-center justify-between">
                                      <span className="text-[10px] uppercase font-black tracking-wider text-rose-700 font-mono flex items-center gap-1">
                                        <span>📝</span> Complete Fine Reason
                                      </span>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setExpandedFineId(null);
                                        }}
                                        className="text-[10px] font-bold text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 px-2 py-0.5 rounded-md border border-rose-200/60 transition-colors"
                                      >
                                        Close ✕
                                      </button>
                                    </div>
                                    <p className="text-xs text-slate-800 font-semibold leading-relaxed bg-rose-50/50 p-2.5 rounded-lg border border-rose-100/80 whitespace-pre-wrap break-words">
                                      {fine.reason}
                                    </p>
                                    <div className="text-[10px] text-slate-500 font-medium pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-rose-100/60">
                                      <div className="flex flex-wrap items-center gap-3">
                                        {fine.employeeInfo?.name && (
                                          <span>Employee: <strong className="text-slate-800">{fine.employeeInfo.name}</strong></span>
                                        )}
                                        {fine.imposedByInfo?.name && (
                                          <span>Imposed By: <strong className="text-slate-800">{fine.imposedByInfo.name}</strong></span>
                                        )}
                                        {fine.createdAt && (
                                          <span>Date Recorded: <strong className="text-slate-800">{new Date(fine.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</strong></span>
                                        )}
                                      </div>
                                      {canRemoveFine && (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteFine(fine);
                                          }}
                                          className="flex items-center gap-1 text-[10px] font-black text-rose-700 bg-rose-100 hover:bg-rose-200 border border-rose-300 px-2.5 py-1 rounded-md transition-all shadow-2xs"
                                        >
                                          🗑️ Remove Fine
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* List of Leave Requests */}
        <div className="bg-white border border-[#E8E4DF] rounded-xl p-6 shadow-sm">
          <h3 className="text-xs font-black tracking-widest text-[#1C1C1A] uppercase font-mono pb-2 border-b border-[#E8E4DF] mb-4 flex flex-wrap items-center justify-between gap-2 relative">
            <div className="flex items-center gap-2 flex-wrap">
              <span style={{ fontFamily: "'Playfair Display', serif" }} className="font-serif text-sm font-bold lowercase first-letter:uppercase text-[#1C1C1A]">
                📋 {canApprove ? "Leave requests registry" : "Your leave request history"}
              </span>
              <span className="px-2.5 py-1 text-[10px] font-black rounded-lg bg-purple-50 text-purple-900 border border-purple-200 tracking-normal normal-case flex items-center gap-1 shadow-2xs">
                📅 {getActivePeriodLabel()}
              </span>
            </div>

            <div className="relative flex items-center gap-2">
              {/* Quick Filter Pill Buttons */}
              <div className="hidden sm:flex items-center gap-1 bg-[#F5F2EC] p-1 rounded-xl border border-[#E8E4DF] text-[10px] font-bold normal-case">
                <button
                  type="button"
                  onClick={() => {
                    setDatePreset("current_month");
                    setFilterStartDate("");
                    setFilterEndDate("");
                  }}
                  className={`px-2.5 py-1 rounded-lg transition-all ${datePreset === "current_month" ? "bg-[#714B67] text-white font-black shadow-2xs" : "text-[#6B665E] hover:text-[#1C1C1A]"}`}
                >
                  Current Month
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDatePreset("last_month");
                    setFilterStartDate("");
                    setFilterEndDate("");
                  }}
                  className={`px-2.5 py-1 rounded-lg transition-all ${datePreset === "last_month" ? "bg-[#714B67] text-white font-black shadow-2xs" : "text-[#6B665E] hover:text-[#1C1C1A]"}`}
                >
                  Last Month
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDatePreset("all");
                    setFilterStartDate("");
                    setFilterEndDate("");
                  }}
                  className={`px-2.5 py-1 rounded-lg transition-all ${datePreset === "all" ? "bg-[#714B67] text-white font-black shadow-2xs" : "text-[#6B665E] hover:text-[#1C1C1A]"}`}
                >
                  All Time
                </button>
              </div>

              <button
                type="button"
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 border px-3.5 py-1.5 text-xs font-bold transition-all rounded-xl shadow-sm focus:outline-none ${showFilters
                  ? "bg-[#C9A84C] border-[#C9A84C] text-[#FCFBF9]"
                  : "bg-[#FCFBF9] hover:bg-[#F5F2EC] border-[#E8E4DF] text-[#1C1C1A]"
                  }`}
              >
                <Filter className="w-3.5 h-3.5" />
                <span>Filter Leaves</span>
                {(filterUser || datePreset !== "current_month" || filterStartDate || filterEndDate || filterStatus !== "All") && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#C9A84C] animate-pulse" />
                )}
              </button>

              {/* Floating Filter Popover */}
              {showFilters && (
                <div className="absolute right-0 top-full mt-3 z-50 bg-[#FCFBF9] border border-[#E8E4DF] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.15)] rounded-2xl p-5 w-[320px] space-y-4 text-left normal-case font-sans">
                  <div className="flex justify-between items-center border-b border-[#E8E4DF] pb-2">
                    <span className="text-xs font-bold text-[#1C1C1A] tracking-wider uppercase font-mono">Filter Registry</span>
                    <button
                      type="button"
                      onClick={() => setShowFilters(false)}
                      className="text-[#9C9890] hover:text-[#1C1C1A] transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-4 text-xs">
                    <div>
                      <label className="text-[9px] uppercase font-bold text-[#9C9890] font-mono tracking-widest block mb-1">Select Employee</label>
                      <select
                        className="w-full bg-white border border-[#E8E4DF] rounded-xl p-2.5 text-xs font-bold text-[#1C1C1A] focus:outline-none focus:border-[#C9A84C] focus:ring-1 focus:ring-[#C9A84C]"
                        value={filterUser}
                        onChange={(e) => setFilterUser(e.target.value)}
                      >
                        <option value="">All Employees</option>
                        {uniqueUsers.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[9px] uppercase font-bold text-[#9C9890] font-mono tracking-widest block mb-1">Date Period Filter</label>
                      <select
                        className="w-full bg-white border border-[#E8E4DF] rounded-xl p-2.5 text-xs font-bold text-[#1C1C1A] focus:outline-none focus:border-[#C9A84C] focus:ring-1 focus:ring-[#C9A84C]"
                        value={datePreset}
                        onChange={(e) => {
                          const val = e.target.value as any;
                          setDatePreset(val);
                          if (val !== "custom") {
                            setFilterStartDate("");
                            setFilterEndDate("");
                          }
                        }}
                      >
                        <option value="current_month">📅 Current Month (Default)</option>
                        <option value="last_month">📅 Last Month</option>
                        <option value="custom">📅 Custom Date Range</option>
                        <option value="all">🌐 All Time History</option>
                      </select>
                    </div>

                    {datePreset === "custom" && (
                      <div className="p-3 bg-[#F5F2EC] rounded-xl border border-[#E8E4DF] space-y-3">
                        <div>
                          <label className="text-[9px] uppercase font-bold text-[#6B665E] font-mono tracking-widest block mb-1">Start Date (From)</label>
                          <input
                            type="date"
                            className="w-full bg-white border border-[#E8E4DF] rounded-lg p-2 text-xs font-bold text-[#1C1C1A] focus:outline-none focus:border-[#C9A84C]"
                            value={filterStartDate}
                            onChange={(e) => setFilterStartDate(e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="text-[9px] uppercase font-bold text-[#6B665E] font-mono tracking-widest block mb-1">End Date (To)</label>
                          <input
                            type="date"
                            className="w-full bg-white border border-[#E8E4DF] rounded-lg p-2 text-xs font-bold text-[#1C1C1A] focus:outline-none focus:border-[#C9A84C]"
                            value={filterEndDate}
                            onChange={(e) => setFilterEndDate(e.target.value)}
                          />
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="text-[9px] uppercase font-bold text-[#9C9890] font-mono tracking-widest block mb-1">Status</label>
                      <select
                        className="w-full bg-white border border-[#E8E4DF] rounded-xl p-2.5 text-xs font-bold text-[#1C1C1A] focus:outline-none focus:border-[#C9A84C] focus:ring-1 focus:ring-[#C9A84C]"
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                      >
                        <option value="All">All Statuses</option>
                        <option value="Pending">Pending</option>
                        <option value="Approved">Approved</option>
                        <option value="Rejected">Rejected</option>
                      </select>
                    </div>
                  </div>

                  <div className="pt-2 flex gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setFilterUser("");
                        setDatePreset("current_month");
                        setFilterStartDate("");
                        setFilterEndDate("");
                        setFilterStatus("All");
                        setShowFilters(false);
                      }}
                      className="flex-1 bg-[#FCFBF9] hover:bg-[#F5F2EC] text-[#6B665E] py-2.5 rounded-xl text-[10px] font-bold transition-all border border-[#E8E4DF]"
                    >
                      Reset to Default
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
          </h3>

          {loadingList ? (
            <div className="h-48 flex flex-col items-center justify-center">
              <Loader2 className="w-8 h-8 text-[#714B67] animate-spin mb-2" />
              <span className="text-xs font-semibold text-slate-500">Loading leave requests...</span>
            </div>
          ) : (
            <>

              {filteredLeaves.length === 0 ? (
                <div className="h-48 flex flex-col items-center justify-center text-slate-400">
                  <Calendar className="w-8 h-8 mb-2" />
                  <span className="text-xs font-semibold">No matching leave requests found.</span>
                </div>
              ) : (
                <div className="overflow-y-auto overflow-x-auto custom-scrollbar max-h-[360px]">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-slate-450 font-black uppercase font-mono tracking-wider sticky top-0 bg-slate-50 z-10">
                        {canApprove && <th className="py-3.5 px-4 text-left">Employee</th>}
                        <th className="py-3.5 px-4 text-left">Type</th>
                        <th className="py-3.5 px-4 text-left">Duration</th>
                        <th className="py-3.5 px-4 text-center">Days</th>
                        <th className="py-3.5 px-4 text-left">Reason</th>
                        <th className="py-3.5 px-4 text-center">Status</th>
                        {canApprove && <th className="py-3.5 px-4 text-left">Remarks & Actions</th>}
                        {!canApprove && <th className="py-3.5 px-4 text-left">Processed By & Remarks</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-semibold text-slate-650">
                      {filteredLeaves.map((leave: any) => {
                        const start = new Date(leave.startDate);
                        const end = new Date(leave.endDate);

                        const isDirectReportManager = leave.employee && String(leave.employee.id) !== String(sessionUser?.id);
                        // Show actions if current user is an authorized approver for another employee's leave
                        const showActions =
                          (isDirectReportManager || isManager || isOwnerOrDirector || isHR) &&
                          (leave.status === "Pending" || leave.status === "Pending Manager Approval" || leave.status === "Pending HR Approval");

                        return (
                          <tr key={leave.id} className="hover:bg-slate-50/50">
                            {canApprove && (
                              <td className="py-3.5 px-4">
                                <div className="flex flex-col">
                                  <span className="font-black text-slate-800">{leave.employee?.name || "Unknown"}</span>
                                  <span className="text-[10px] text-slate-400 font-mono font-bold">{leave.employee?.email || ""}</span>
                                </div>
                              </td>
                            )}
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-600 border border-indigo-100">
                                {leave.type}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 whitespace-nowrap text-slate-700">
                              {start.toLocaleDateString()} to {end.toLocaleDateString()}
                            </td>
                            <td className="py-3.5 px-4 text-center text-slate-700 font-mono">
                              {leave.days}
                            </td>
                            <td className="py-3.5 px-4 max-w-xs truncate text-slate-600" title={leave.reason}>
                              {leave.reason}
                            </td>
                            <td className="py-3.5 px-4 text-center whitespace-nowrap">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${leave.status === "Approved"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : leave.status === "Rejected"
                                  ? "bg-rose-50 text-rose-700 border border-rose-200"
                                  : leave.status === "Pending HR Approval"
                                    ? "bg-blue-50 text-blue-700 border border-blue-200"
                                    : "bg-amber-50 text-amber-700 border border-amber-200"
                                }`}>
                                {leave.status}
                              </span>
                            </td>

                            {/* Actions for Managers/HR/Owners */}
                            {canApprove && (
                              <td className="py-3.5 px-4 whitespace-nowrap">
                                {showActions ? (
                                  <div className="flex items-center gap-2">
                                    <input
                                      className="bg-white border border-slate-300 rounded px-2 py-1 text-xs font-bold text-slate-900 focus:outline-none focus:border-[#714B67]"
                                      placeholder="remarks..."
                                      value={actionRemarks[leave.id] || ""}
                                      onChange={(e) => setActionRemarks({ ...actionRemarks, [leave.id]: e.target.value })}
                                    />
                                    <button
                                      onClick={() => handleUpdateStatus(leave.id, "Approved")}
                                      className="bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 rounded text-[10px] font-bold transition-all shadow"
                                    >
                                      {isManager ? "Approve & Forward" : "Final Approve"}
                                    </button>
                                    <button
                                      onClick={() => handleUpdateStatus(leave.id, "Rejected")}
                                      className="bg-rose-600 hover:bg-rose-700 text-white px-2.5 py-1 rounded text-[10px] font-bold transition-all shadow"
                                    >
                                      Reject
                                    </button>
                                  </div>
                                ) : (
                                  <span className="text-slate-450 text-[11px] italic">
                                    {leave.status === "Pending HR Approval"
                                      ? "Forwarded to HR - Awaiting HR Review"
                                      : leave.remarks ? `Remarks: ${leave.remarks}` : "Awaiting Manager Review"}
                                  </span>
                                )}
                              </td>
                            )}

                            {/* processed info for Employees */}
                            {!canApprove && (
                              <td className="py-3.5 px-4 text-slate-500 text-[11px] italic max-w-xs truncate">
                                {leave.status !== "Pending" && leave.status !== "Pending Manager Approval" && leave.status !== "Pending HR Approval" ? (
                                  <span>
                                    By: {leave.approvedBy?.name || "HR/Manager"}
                                    {leave.remarks ? ` (${leave.remarks})` : ""}
                                  </span>
                                ) : (
                                  <span>
                                    {leave.status === "Pending Manager Approval" ? "Awaiting Manager Review" : "Awaiting HR Review"}
                                  </span>
                                )}
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Impose Absent Fine Modal ── */}
      {showFineModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-rose-100">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-rose-50 rounded-t-2xl">
              <div>
                <h2 className="text-base font-black text-rose-700">⚠️ Impose Absent Fine</h2>
                <p className="text-[11px] text-rose-500 mt-0.5">Fine for unauthorized absence without leave notification</p>
              </div>
              <button
                onClick={() => setShowFineModal(false)}
                className="text-slate-400 hover:text-slate-700 text-xl font-bold p-1"
              >✕</button>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-5 space-y-4">

              {/* Employee Select */}
              <div>
                <label className="block text-[10px] uppercase font-black text-slate-500 tracking-wider mb-1.5">
                  Select Employee * ({allSelectableEmployees.length} total)
                </label>
                <FineEmployeeSearchCombobox
                  employees={allSelectableEmployees}
                  selectedEmployee={fineEmployee}
                  onSelectEmployee={setFineEmployee}
                />
              </div>

              {/* Date Range */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase font-black text-slate-500 tracking-wider mb-1">From Date *</label>
                  <input
                    type="date"
                    className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-rose-500"
                    value={fineFromDate}
                    max={new Date().toISOString().split("T")[0]}
                    onChange={(e) => {
                      setFineFromDate(e.target.value);
                      if (!fineToDate || new Date(e.target.value) > new Date(fineToDate)) {
                        setFineToDate(e.target.value);
                      }
                    }}
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-black text-slate-500 tracking-wider mb-1">To Date *</label>
                  <input
                    type="date"
                    className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-rose-500"
                    value={fineToDate}
                    min={fineFromDate}
                    onChange={(e) => setFineToDate(e.target.value)}
                  />
                </div>
              </div>

              {/* Fine Amount per day */}
              <div>
                <label className="block text-[10px] uppercase font-black text-slate-500 tracking-wider mb-1.5">Per Day Fine Amount (₹)</label>
                <div className="flex items-center gap-2">
                  {[250, 500, 1000, 2000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setFineAmount(amt)}
                      className={`flex-1 py-2 rounded-lg text-xs font-black border transition-all ${fineAmount === amt ? "bg-rose-600 text-white border-rose-600 shadow-xs" : "bg-white text-slate-600 border-slate-300 hover:border-rose-400"}`}
                    >
                      ₹{amt}
                    </button>
                  ))}
                  <input
                    type="number"
                    min={1}
                    className="w-24 bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-rose-500"
                    value={fineAmount}
                    onChange={(e) => setFineAmount(Number(e.target.value))}
                    placeholder="Custom"
                  />
                </div>
              </div>

              {/* Reason */}
              <div>
                <label className="block text-[10px] uppercase font-black text-slate-700 tracking-wider mb-1.5">Reason for Fine *</label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {[
                    "Absent without prior notification",
                    "Uninformed leave / No SOD",
                    "Non-submission of Work Report",
                    "Late Arrival & Unexplained Absence"
                  ].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setFineReason(preset)}
                      className={`text-[11px] font-extrabold px-2.5 py-1 rounded-lg border transition-all ${fineReason === preset
                        ? "bg-rose-600 text-white border-rose-600 shadow-2xs"
                        : "bg-slate-100 text-slate-900 border-slate-300 hover:bg-slate-200"
                        }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
                <textarea
                  className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-xs font-bold text-slate-950 placeholder:text-slate-400 placeholder:font-normal focus:outline-none focus:border-rose-500 resize-none shadow-2xs"
                  rows={2}
                  value={fineReason}
                  onChange={(e) => setFineReason(e.target.value)}
                  placeholder="Type any custom reason for fine here..."
                />
              </div>

              {/* Fine Summary Breakdown */}
              {fineEmployee && fineFromDate && fineTotalDays > 0 && (
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-3.5 space-y-1">
                  <div className="flex items-center justify-between text-xs font-black text-rose-900">
                    <span>Fine Summary ({fineTotalDays} Day{fineTotalDays > 1 ? "s" : ""})</span>
                    <span className="text-sm text-rose-700 font-extrabold">Total: ₹{totalFineCalculated.toLocaleString('en-IN')}</span>
                  </div>
                  <p className="text-[11px] text-rose-700 leading-relaxed font-semibold">
                    ₹<span className="font-black">{fineAmount}</span>/day × <span className="font-black">{fineTotalDays} Day(s)</span> = <span className="font-black">₹{totalFineCalculated.toLocaleString('en-IN')}</span> fine will be imposed on <span className="font-black">{fineEmployee.name}</span> for absence ({fineFromDate} {fineToDate && fineToDate !== fineFromDate ? `to ${fineToDate}` : ""}).
                    An email notification with complete details will be sent to <span className="font-black">{fineEmployee.name}</span>.
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 pb-5 flex gap-3">
              <button
                onClick={() => setShowFineModal(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-black transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleImposeFine}
                disabled={imposingFine || !fineEmployee || !fineFromDate || fineTotalDays <= 0}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-black transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow flex items-center justify-center gap-1"
              >
                {imposingFine ? "Imposing..." : `⚠️ Impose ₹${totalFineCalculated.toLocaleString('en-IN')} Fine ${fineTotalDays > 0 ? `(${fineTotalDays} Day${fineTotalDays > 1 ? "s" : ""})` : ""}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
