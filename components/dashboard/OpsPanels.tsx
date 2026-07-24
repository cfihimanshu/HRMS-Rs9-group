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
  RefreshCw,
  FileSpreadsheet,
  Coins,
  ChevronDown,
  ChevronUp,
  CalendarClock
} from "lucide-react";

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

interface OpsProps {
  sessionUser?: any;
  stats: any;
  handleAttendancePunch: () => void;
  handleSodSubmit: (payload: any) => Promise<any>;
  handleEodSubmit: (payload: any) => Promise<any>;
  formMode?: "sod" | "eod" | "both";
}

export function DailyCommitments({
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
  const [sodCategories, setSodCategories] = useState<string[]>(["General", "Legal", "Bank", "Interview", "IT", "Notice", "Others"]);
  const [sodTaskTitle, setSodTaskTitle] = useState<string>("General");
  const [showAddSodTitleInput, setShowAddSodTitleInput] = useState(false);
  const [newSodTitleText, setNewSodTitleText] = useState("");

  const [sodTaskModes, setSodTaskModes] = useState<string[]>(["Call", "Meeting", "Development", "Marketing", "Field Visit", "Operations", "Support", "Email", "WhatsApp"]);
  const [showAddSodModeInput, setShowAddSodModeInput] = useState(false);
  const [newSodModeText, setNewSodModeText] = useState("");

  // Bank / Branch / Officer subfields for Bank & Notice Task Titles
  const [banksList, setBanksList] = useState<{ id: string | number; bankName: string }[]>([]);
  const [branchesList, setBranchesList] = useState<{ id: string | number; branchName: string; nbfcId?: any }[]>([]);
  const [selectedBankId, setSelectedBankId] = useState("");
  const [sodBankName, setSodBankName] = useState("");
  const [sodBranchName, setSodBranchName] = useState("");
  const [sodOfficerName, setSodOfficerName] = useState("");
  const [sodOfficerPhone, setSodOfficerPhone] = useState("");
  const [sodTaskDetails, setSodTaskDetails] = useState("");

  const fetchBanksAndBranches = async () => {
    try {
      const [bankRes, branchRes] = await Promise.all([
        fetch("/api/legal-recovery/banks"),
        fetch("/api/legal-recovery/nbfc-branches")
      ]);
      const bankData = await bankRes.json();
      const branchData = await branchRes.json();
      if (bankData.success) setBanksList(bankData.data || []);
      if (branchData.success) setBranchesList(branchData.data || []);
    } catch (err) {
      console.error("Failed to load banks/branches for SOD:", err);
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
      let finalTaskSummary = "";
      if (sodTaskTitle === "Bank") {
        finalTaskSummary = `[Bank: ${sodBankName || "Bank"}] Branch: ${sodBranchName || "—"} | Officer: ${sodOfficerName || "—"} (${sodOfficerPhone || "—"})${remarks ? ` — ${remarks}` : ""}`;
      } else if (sodTaskTitle === "Notice") {
        finalTaskSummary = `[Notice] Bank: ${sodBankName || "Bank"}, Branch: ${sodBranchName || "—"}${remarks ? ` — ${remarks}` : ""}`;
      } else {
        finalTaskSummary = sodTaskTitle ? `[${sodTaskTitle}] ${remarks || sodTaskTitle}` : (remarks || "General Task");
      }

      const success = await handleSodSubmit({
        taskSummary: finalTaskSummary,
        taskType: taskType === "Other" ? (customTaskType.trim() || "Other") : taskType,
        projectName: (sodTaskTitle === "IT" || taskType === "Development") ? (projectName.trim() || "") : undefined,
        remarks: remarks,
        selfieUrl,
        location
      });

      if (success) {
        setSodAlreadySubmitted(true);
        setShowCamera(false);
        setRemarks("");
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

                <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 text-[10px] font-bold text-rose-700 flex items-start gap-2 mt-4">
                  <MapPin className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                  <span><strong>Verification Required:</strong> You will need to take a live selfie to submit your SOD.</span>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-100 flex justify-end">
                  <button type="button" onClick={() => setShowCamera(true)} className="bg-indigo-600 hover:bg-indigo-700 w-full px-4 py-3 rounded-lg text-xs font-black text-white transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20">
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
                  {displayUsers.map((u: any) => (
                    <option key={u.id || u.id} value={u.id || u.id}>{u.name} ({u.role})</option>
                  ))}
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
  initialSubTab
}: {
  sessionUser?: any;
  preselectedUserId?: string;
  clearPreselectedUserId?: () => void;
  initialSubTab?: "visual-dashboard" | "sod" | "eod" | "attendance-calendar";
}) {
  const isOwnerOrDirector = ["Owner", "Director", "HR Head", "HR Executive", "Department Manager"].includes(sessionUser?.role || "");
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<{ sod: any[]; eod: any[]; tasks?: any[]; fieldVisits?: any[] }>({ sod: [], eod: [], tasks: [], fieldVisits: [] });
  const [activeSubTab, setActiveSubTab] = useState<"visual-dashboard" | "sod" | "eod" | "attendance-calendar">(
    initialSubTab || (isOwnerOrDirector ? "visual-dashboard" : "sod")
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
  const [dateFilterType, setDateFilterType] = useState<"overall" | "current-month" | "custom">("overall");
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
    if (sessionUser?.role === "Owner") {
      return companies;
    }
    return companies.filter((c: any) => {
      const cid = (c.id || "").toString();
      return userCompanyIds.includes(cid);
    });
  }, [companies, sessionUser, userCompanyIds]);

  // Set default company for non-owners
  useEffect(() => {
    if (sessionUser?.role !== "Owner" && visibleCompanies.length > 0) {
      const isValid = visibleCompanies.some((c: any) => c.id?.toString() === selectedCompany);
      if (!isValid) {
        setSelectedCompany(visibleCompanies[0].id.toString());
      }
    }
  }, [visibleCompanies, sessionUser, selectedCompany]);

  // Calendar states
  const [calendarAttendance, setCalendarAttendance] = useState<any[]>([]);
  const [calendarLeaves, setCalendarLeaves] = useState<any[]>([]);
  const [calendarFines, setCalendarFines] = useState<any[]>([]);
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth()); // 0-11
  const [loadingCalendar, setLoadingCalendar] = useState(false);

  const isOwner = ["Owner", "Director", "HR Head", "HR Executive", "Department Manager"].includes(sessionUser?.role) || users.length > 1;

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

    const userMap = new Map<string, { id: string; name: string; email: string; role: string }>();

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
        role: sessionUser.role || "Employee"
      });
    }

    // Add employees from mergedList
    mergedList.forEach((item: any) => {
      if (item.employee && item.employee.id) {
        const empId = item.employee.id.toString();
        const empRole = item.employee.role || "Employee";

        // 1. If not Manager/Owner, they only see themselves
        if (!isOwner) {
          if (empId !== userId) return;
        }

        // 2. Filter by selectedCompany
        if (selectedCompany) {
          if (!isUserInCompany(item.employee, selectedCompany)) return;
        }

        // 3. Filter by selectedDept
        if (selectedDept) {
          if (item.employee.department !== selectedDept) return;
        }

        if (!userMap.has(empId)) {
          userMap.set(empId, {
            id: empId,
            name: item.employee.name,
            email: item.employee.email || "",
            role: empRole
          });
        }
      }
    });

    return Array.from(userMap.values());
  }, [mergedList, sessionUser, selectedCompany, selectedDept]);

  // Synchronize selection
  useEffect(() => {
    if (selectedUser) {
      const userExists = uniqueUsersFromReports.some((u) => u.id === selectedUser);
      if (!userExists) {
        setSelectedUser("");
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
        "EOD Completed Work",
        "EOD Pending Work",
        "EOD Issues Faced",
        "EOD Escalation Required",
        "EOD Tomorrow Plan",
        "Tasks Logged (Count)",
        "Tasks Details",
        "Field Visits Travelled (KM)",
        "Field Visits Details"
      ];

      const exportList = filteredList;

      const getAttendanceStatus = (item: any) => {
        if (item.sod) return "Present";
        if (item.eod) return "Present (EOD Only)";
        if (item.tasks && item.tasks.length > 0) return "Tasks Only";
        const isSunday = item.date.getDay() === 0;
        if (isSunday) return "Weekly Off";
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

        const tasksCount = item.tasks ? item.tasks.length : 0;
        const tasksDetails = item.tasks && item.tasks.length > 0
          ? item.tasks.map((t: any) => {
            let suffix = "";
            if (t.updatedAt && new Date(t.updatedAt).toDateString() !== item.date.toDateString() && item.date.toDateString() === new Date(t.date).toDateString()) {
              const dateStr = new Date(t.updatedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
              suffix = ` (This task is shifted for working on ${dateStr})`;
            }
            return `[${t.status}] ${t.taskTitle} (${t.taskType})${suffix}`;
          }).join(" | ")
          : "-";

        const fieldVisitKm = item.fieldVisits && item.fieldVisits.length > 0
          ? item.fieldVisits.reduce((sum: number, v: any) => sum + (v.distance_travelled || 0), 0)
          : 0;

        const fieldVisitDetails = item.fieldVisits && item.fieldVisits.length > 0
          ? item.fieldVisits.map((v: any) => `Client: ${v.client_name || "N/A"}, Purpose: ${v.purpose || "N/A"}, Dist: ${v.distance_travelled || 0} KM, Notes: ${v.visit_notes || "N/A"}`).join(" | ")
          : "-";

        return [
          item.date.toLocaleDateString(),
          item.employee?.name || "Unknown",
          item.employee?.email || "N/A",
          item.employee?.department || "General",
          getAttendanceStatus(item),
          sodTime,
          sodTaskType,
          sodSummary,
          eodTime,
          eodCompleted,
          eodPending,
          eodIssues,
          eodEscalation,
          eodTomorrow,
          tasksCount,
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
          excelTemplate += `<td style="border: 1px solid #cbd5e1; padding: 6px; text-align: left; vertical-align: middle; white-space: nowrap;">${cell}</td>`;
        });
        excelTemplate += `</tr>`;
      });
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

    return matchSearch && matchDate && matchCompany && matchUser && matchSubTab && matchDept;
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
                  {uniqueUsersFromReports
                    .map((u: any) => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))
                  }
                </select>
              </div>
            </div>

            {/* Clear Filters Button */}
            {(searchTerm || selectedCompany || selectedDept || selectedUser || dateFilterType !== "overall") && (
              <button
                onClick={() => {
                  setSearchTerm("");
                  setSelectedCompany("");
                  setSelectedDept("");
                  setSelectedUser("");
                  setDateFilterType("overall");
                  setStartDateFilter("");
                  setEndDateFilter("");
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

                      return (
                        <React.Fragment key={emp.id}>
                          <tr
                            onClick={() => {
                              setExpandedUserRows(prev => ({
                                ...prev,
                                [emp.id]: !prev[emp.id]
                              }));
                            }}
                            className={`hover:bg-indigo-50/15 cursor-pointer transition-colors ${expandedUserRows[emp.id] ? "bg-indigo-50/10 font-bold" : ""
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
                  {filteredUsers.map((u: any) => (
                    <option key={u.id || u.id} value={u.id || u.id}>{u.name} ({u.role})</option>
                  ))}
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

            <div className="relative">
              <button
                type="button"
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 border px-4 py-2 text-xs font-bold transition-all rounded-xl shadow-sm focus:outline-none ${showFilters
                  ? "bg-[#C9A84C] border-[#C9A84C] text-[#FCFBF9]"
                  : "bg-[#FCFBF9] hover:bg-[#F5F2EC] border-[#E8E4DF] text-[#1C1C1A]"
                  }`}
              >
                <Filter className="w-3.5 h-3.5" />
                <span>Filter Reports</span>
                {(searchTerm || selectedCompany || selectedDept || selectedUser || dateFilterType !== "overall") && (
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
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Department Dropdown (Owner/Director/HR only) */}
                    {isOwner && (
                      <div>
                        <label className="text-[9px] uppercase font-bold text-[#9C9890] font-mono tracking-widest block mb-1">Department</label>
                        <select
                          className="w-full bg-white border border-[#E8E4DF] rounded-xl p-2.5 text-xs font-bold text-[#1C1C1A] focus:outline-none focus:border-[#C9A84C] focus:ring-1 focus:ring-[#C9A84C]"
                          value={selectedDept}
                          onChange={(e) => setSelectedDept(e.target.value)}
                        >
                          <option value="">All Departments</option>
                          {departmentsList.map((dept) => (
                            <option key={dept} value={dept}>{dept}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Employee Dropdown (Visible to everyone) */}
                    <div>
                      <label className="text-[9px] uppercase font-bold text-[#9C9890] font-mono tracking-widest block mb-1">Select Employee</label>
                      <select
                        className="w-full bg-white border border-[#E8E4DF] rounded-xl p-2.5 text-xs font-bold text-[#1C1C1A] focus:outline-none focus:border-[#C9A84C] focus:ring-1 focus:ring-[#C9A84C]"
                        value={selectedUser}
                        onChange={(e) => setSelectedUser(e.target.value)}
                      >
                        {isOwner && (
                          <option value="">All Employees</option>
                        )}
                        {uniqueUsersFromReports.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Date Filter Type */}
                    <div>
                      <label className="text-[9px] uppercase font-bold text-[#9C9890] font-mono tracking-widest block mb-1">Date Filter</label>
                      <select
                        className="w-full bg-white border border-[#E8E4DF] rounded-xl p-2.5 text-xs font-bold text-[#1C1C1A] focus:outline-none focus:border-[#C9A84C] focus:ring-1 focus:ring-[#C9A84C]"
                        value={dateFilterType}
                        onChange={(e) => {
                          setDateFilterType(e.target.value as any);
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

                      return (
                        <React.Fragment key={rowKey}>
                          <tr
                            onClick={toggleRow}
                            className={`hover:bg-slate-50/50 cursor-pointer transition-all ${isExpanded ? "bg-slate-50/30 font-bold" : ""}`}
                          >
                            {isOwner && (
                              <td className="py-3.5 px-4">
                                <div className="flex flex-col">
                                  <span className="font-black text-slate-800">{item.employee?.name || "Unknown"}</span>
                                  <span className="text-[10px] text-slate-400 font-mono font-bold">
                                    {item.employee?.email || ""} {item.employee?.department ? `| ${item.employee.department}` : ""}
                                  </span>
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

export function LeaveRequestTab({ sessionUser }: { sessionUser?: any }) {
  const userRole = sessionUser?.role;
  const isManager = userRole === "Department Manager";
  const isHR = ["HR Head", "HR Executive"].includes(userRole);
  const isOwnerOrDirector = userRole === "Owner" || userRole === "Director";

  // Form states
  const [leaveType, setLeaveType] = useState("Casual Leave");
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

  // Filter states
  const [filterUser, setFilterUser] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [showFilters, setShowFilters] = useState(false);

  // Action state
  const [actionRemarks, setActionRemarks] = useState<{ [key: string]: string }>({});

  // Fine modal & history state
  const [myFines, setMyFines] = useState<any[]>([]);
  const [loadingFines, setLoadingFines] = useState(false);

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
        } else {
          grouped.push(currentGroup);
          currentGroup = {
            id: item.id,
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
    const role = sessionUser?.role || "Employee";
    const userId = (sessionUser?.id || "").toString();

    const userMap = new Map<string, { id: string; name: string; email: string }>();
    if (sessionUser && sessionUser.id) {
      userMap.set(userId, {
        id: userId,
        name: `${sessionUser.name || "Self"} (Self)`,
        email: sessionUser.email || ""
      });
    }

    leavesList.forEach((leave) => {
      if (leave.employee && leave.employee.id) {
        const empId = leave.employee.id.toString();

        // 1. If not Manager/Owner, they only see themselves (unless they have direct reports)
        if (!["Owner", "Director", "HR Head", "HR Executive", "Department Manager"].includes(role) && !hasDirectReports) {
          if (empId !== userId) return;
        }

        if (!userMap.has(empId)) {
          userMap.set(empId, {
            id: empId,
            name: leave.employee.name,
            email: leave.employee.email || ""
          });
        }
      }
    });

    return Array.from(userMap.values());
  }, [leavesList, sessionUser, hasDirectReports]);

  // Synchronize selection
  useEffect(() => {
    if (filterUser) {
      const userExists = uniqueUsers.some((u) => u.id === filterUser);
      if (!userExists) {
        setFilterUser("");
      }
    }
  }, [uniqueUsers, filterUser]);

  const filteredLeaves = leavesList.filter((leave: any) => {
    // 1. User Filter (by ID)
    if (filterUser !== "") {
      if (!leave.employee || leave.employee.id !== filterUser) {
        return false;
      }
    }

    // 2. Date Filter (checks if target date overlaps with leave duration)
    if (filterDate !== "") {
      const targetDate = new Date(filterDate);
      targetDate.setHours(0, 0, 0, 0);
      const leaveStart = new Date(leave.startDate);
      leaveStart.setHours(0, 0, 0, 0);
      const leaveEnd = new Date(leave.endDate);
      leaveEnd.setHours(0, 0, 0, 0);
      if (targetDate < leaveStart || targetDate > leaveEnd) {
        return false;
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

    return true;
  });

  const handleApplyLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate || !endDate || !reason) {
      alert("Please fill all required fields");
      return;
    }

    // calculate number of days
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    setSubmitting(true);
    try {
      const res = await fetch("/api/leaves", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: leaveType,
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">

          {/* Form View for Applicants */}
          {canApply && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col justify-between">
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
                        onChange={(e) => setLeaveType(e.target.value)}
                      >
                        <option value="Casual Leave">Casual Leave</option>
                        <option value="Sick Leave">Sick Leave</option>
                        <option value="Earned Leave">Earned Leave</option>
                        <option value="Unpaid Leave">Unpaid Leave</option>
                      </select>
                    </div>

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
                  </div>

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
          <div id="absent-fines-section" className="bg-white border border-rose-200/80 rounded-xl p-6 shadow-sm flex flex-col justify-between h-full">
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
                <div className="overflow-y-auto overflow-x-auto custom-scrollbar max-h-[220px]">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-rose-50/80 text-rose-950 text-[10px] uppercase font-black tracking-wider border-b border-rose-100 sticky top-0 bg-rose-50 z-10">
                        {canApprove && <th className="py-2 px-2.5">Employee</th>}
                        <th className="py-2 px-2.5">Absence Date</th>
                        <th className="py-2 px-2.5">Fine Amount</th>
                        <th className="py-2 px-2.5">Reason</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-semibold text-slate-800">
                      {displayFines.map((fine: any) => (
                        <tr key={fine.id} className="hover:bg-rose-50/30 transition-colors">
                          {canApprove && (
                            <td className="py-2 px-2.5">
                              <span className="font-bold text-slate-900 block truncate max-w-[120px]">{fine.employeeInfo?.name || "Employee"}</span>
                            </td>
                          )}
                          <td className="py-2 px-2.5 font-bold text-slate-900 whitespace-nowrap">
                            📅 {fine.daysCount > 1
                              ? `${new Date(fine.fromDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} to ${new Date(fine.toDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} (${fine.daysCount} Days)`
                              : new Date(fine.fromDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </td>
                          <td className="py-2 px-2.5 whitespace-nowrap">
                            <span className="px-2 py-0.5 bg-rose-100 text-rose-800 rounded font-black border border-rose-200 text-[11px]">
                              ₹{Number(fine.totalAmount).toLocaleString('en-IN')}
                              {fine.daysCount > 1 && (
                                <span className="text-[10px] text-rose-600 font-bold ml-1">
                                  (₹{fine.perDayAmount}/day)
                                </span>
                              )}
                            </span>
                          </td>
                          <td className="py-2 px-2.5 text-slate-700 max-w-[140px] truncate" title={fine.reason}>
                            {fine.reason}
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

        {/* List of Leave Requests */}
        <div className="bg-white border border-[#E8E4DF] rounded-xl p-6 shadow-sm">
          <h3 className="text-xs font-black tracking-widest text-[#1C1C1A] uppercase font-mono pb-2 border-b border-[#E8E4DF] mb-4 flex items-center justify-between relative">
            <span style={{ fontFamily: "'Playfair Display', serif" }} className="font-serif text-sm font-bold lowercase first-letter:uppercase text-[#1C1C1A]">
              📋 {canApprove ? "Leave requests registry" : "Your leave request history"}
            </span>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowFilters(!showFilters)}
                  className={`flex items-center gap-2 border px-4 py-2 text-xs font-bold transition-all rounded-xl shadow-sm focus:outline-none ${showFilters
                    ? "bg-[#C9A84C] border-[#C9A84C] text-[#FCFBF9]"
                    : "bg-[#FCFBF9] hover:bg-[#F5F2EC] border-[#E8E4DF] text-[#1C1C1A]"
                    }`}
                >
                  <Filter className="w-3.5 h-3.5" />
                  <span>Filter Leaves</span>
                  {(filterUser || filterDate || filterStatus !== "All") && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#C9A84C] animate-pulse" />
                  )}
                </button>

                {/* Floating Filter Popover */}
                {showFilters && (
                  <div className="absolute right-0 mt-3 z-50 bg-[#FCFBF9] border border-[#E8E4DF] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.15)] rounded-2xl p-5 w-[300px] space-y-4 text-left normal-case font-sans">
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
                        <label className="text-[9px] uppercase font-bold text-[#9C9890] font-mono tracking-widest block mb-1">Filter by Date</label>
                        <input
                          type="date"
                          className="w-full bg-white border border-[#E8E4DF] rounded-xl p-2.5 text-xs font-bold text-[#1C1C1A] focus:outline-none focus:border-[#C9A84C] focus:ring-1 focus:ring-[#C9A84C]"
                          value={filterDate}
                          onChange={(e) => setFilterDate(e.target.value)}
                        />
                      </div>

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
                          setFilterDate("");
                          setFilterStatus("All");
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
                      className={`text-[11px] font-extrabold px-2.5 py-1 rounded-lg border transition-all ${
                        fineReason === preset
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
