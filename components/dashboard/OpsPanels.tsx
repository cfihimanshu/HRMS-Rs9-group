import React, { useState, useRef, useEffect } from "react";
import {
  CalendarCheck,
  Send,
  Camera,
  MapPin,
  Loader2,
  User,
  Hash,
  Search,
  Calendar,
  Clock,
  Eye,
  FileText,
  X,
  Download
} from "lucide-react";

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
  const [showCamera, setShowCamera] = useState(false);
  const [submittingSOD, setSubmittingSOD] = useState(false);
  const [locationStatus, setLocationStatus] = useState("Awaiting GPS...");
  const [cameraError, setCameraError] = useState("");

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
      const res = await fetch(`/api/attendance/calendar-data?userId=${userId}`);
      const data = await res.json();
      if (data.success) {
        setCalendarAttendance(data.data.attendance || []);
        setCalendarLeaves(data.data.leaves || []);
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
    if (!taskSummary) {
      alert("Please fill in Task Summary before capturing verification.");
      setShowCamera(false);
      return;
    }

    if (taskType === "Other" && !customTaskType.trim()) {
      alert("Please specify the task type.");
      setShowCamera(false);
      return;
    }

    setSubmittingSOD(true);
    setLocationStatus("Uploading verification capture...");

    const location = { latitude: 28.6139, longitude: 77.2090, timestamp: new Date() };
    let selfieUrl = "https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg";

    try {
      if (videoRef.current && canvasRef.current && videoRef.current.videoWidth > 0) {
        const context = canvasRef.current.getContext("2d");
        if (context) {
          canvasRef.current.width = videoRef.current.videoWidth;
          canvasRef.current.height = videoRef.current.videoHeight;
          context.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);

          const blob = await new Promise<Blob | null>((resolve) => {
            canvasRef.current!.toBlob(resolve, "image/jpeg", 0.9);
          });

          if (blob) {
            const formData = new FormData();
            formData.append("file", blob, "sod-selfie.jpg");
            const uploadRes = await fetch("/api/documents/upload", {
              method: "POST",
              body: formData,
            });
            const uploadData = await uploadRes.json();
            if (uploadData.success) {
              selfieUrl = uploadData.url;
            }
          }
        }
      }
    } catch (camErr) {
      console.warn("Camera photo capture failed, using fallback selfie", camErr);
    }

    setLocationStatus("Syncing with RS9 ERP System...");
    try {
      const success = await handleSodSubmit({
        taskSummary,
        taskType: taskType === "Other" ? (customTaskType.trim() || "Other") : taskType,
        remarks,
        selfieUrl,
        location
      });

      if (success) {
        setSodAlreadySubmitted(true);
        setShowCamera(false);
        setTaskSummary("");
        setRemarks("");
        setCustomTaskType("");
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

    let location = { latitude: 28.6139, longitude: 77.2090, timestamp: new Date() };
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 4000,
        });
      });
      location = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        timestamp: new Date(position.timestamp)
      };
    } catch (geoErr) {
      console.warn("GPS access blocked or unavailable, using fallback location", geoErr);
    }

    setEodLocationStatus("Uploading verification capture...");
    let selfieUrl = "https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg";

    try {
      if (eodVideoRef.current && eodCanvasRef.current && eodVideoRef.current.videoWidth > 0) {
        const context = eodCanvasRef.current.getContext("2d");
        if (context) {
          eodCanvasRef.current.width = eodVideoRef.current.videoWidth;
          eodCanvasRef.current.height = eodVideoRef.current.videoHeight;
          context.drawImage(eodVideoRef.current, 0, 0, eodCanvasRef.current.width, eodCanvasRef.current.height);

          const blob = await new Promise<Blob | null>((resolve) => {
            eodCanvasRef.current!.toBlob(resolve, "image/jpeg", 0.9);
          });

          if (blob) {
            const formData = new FormData();
            formData.append("file", blob, "eod-selfie.jpg");
            const uploadRes = await fetch("/api/documents/upload", {
              method: "POST",
              body: formData,
            });
            const uploadData = await uploadRes.json();
            if (uploadData.success) {
              selfieUrl = uploadData.url;
            }
          }
        }
      }
    } catch (camErr) {
      console.warn("Camera photo capture failed, using fallback selfie", camErr);
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
                <div className="md:col-span-2">
                  <label className="text-[10px] uppercase font-black text-slate-500 font-mono tracking-wider">Task Summary *</label>
                  <input className="w-full bg-white border border-slate-300 rounded p-2 text-xs font-bold text-slate-900 mt-1.5 focus:outline-none focus:border-[#714B67]" placeholder="Briefly describe today's main agenda..." value={taskSummary} onChange={e => setTaskSummary(e.target.value)} required />
                </div>
                <div className="md:col-span-2">
                  <label className="text-[10px] uppercase font-black text-slate-500 font-mono tracking-wider">Task Type *</label>
                  <select className="w-full bg-white border border-slate-300 rounded p-2 text-xs font-bold text-slate-900 mt-1.5 focus:outline-none focus:border-[#714B67]" value={taskType} onChange={e => setTaskType(e.target.value)}>
                    <option>Call</option>
                    <option>Meeting</option>
                    <option>Development</option>
                    <option>Marketing</option>
                    <option>Field Visit</option>
                    <option>Operations</option>
                    <option>Support</option>
                    <option>Other</option>
                  </select>
                </div>
                {taskType === "Other" && (
                  <div className="md:col-span-2">
                    <label className="text-[10px] uppercase font-black text-slate-500 font-mono tracking-wider">Specify Task Type *</label>
                    <input className="w-full bg-white border border-slate-300 rounded p-2 text-xs font-bold text-slate-900 mt-1.5 focus:outline-none focus:border-[#714B67]" placeholder="Please specify task type..." value={customTaskType} onChange={e => setCustomTaskType(e.target.value)} required />
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
  clearPreselectedUserId
}: {
  sessionUser?: any;
  preselectedUserId?: string;
  clearPreselectedUserId?: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<{ sod: any[]; eod: any[]; tasks?: any[]; fieldVisits?: any[] }>({ sod: [], eod: [], tasks: [], fieldVisits: [] });
  const [activeSubTab, setActiveSubTab] = useState<"sod" | "eod">("sod");
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [selectedSelfie, setSelectedSelfie] = useState<string | null>(null);

  // Filters state for Owner
  const [companies, setCompanies] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [selectedCompany, setSelectedCompany] = useState("");
  const [selectedUser, setSelectedUser] = useState("");
  const [selectedDept, setSelectedDept] = useState("");
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  const isOwner = ["Owner", "Director", "HR Head", "HR Executive", "Department Manager"].includes(sessionUser?.role);

  const departmentsList = React.useMemo(() => {
    const depts = new Set<string>();
    (reports.sod || []).forEach((s: any) => s.employee?.department && depts.add(s.employee.department));
    (reports.eod || []).forEach((e: any) => e.employee?.department && depts.add(e.employee.department));
    return Array.from(depts).sort();
  }, [reports]);

  useEffect(() => {
    fetchReports();
    if (isOwner) {
      fetchFilterMetadata();
    }
  }, [sessionUser]);

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
      const res = await fetch("/api/reports/work-report");
      const data = await res.json();
      if (data.success) {
        setReports(data.data || { sod: [], eod: [], tasks: [], fieldVisits: [] });
      }
    } catch (error) {
      console.error("Error fetching work reports:", error);
    } finally {
      setLoading(false);
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

  const filteredUsers = users.filter((u: any) => {
    if (!selectedCompany) return true;
    return u.companies && u.companies.some((c: any) => (c.id || c.id || c).toString().trim() === selectedCompany.toString().trim());
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
      const empId = sod.employee?.id || sod.employee?.id || sod.employee?.id || "unknown";
      if (!sod.date) return;
      const dObj = new Date(sod.date);
      const dateStr = dObj.toDateString();
      const key = `${empId}_${dateStr}`;
      map.set(key, { sod, eod: null, tasks: [], fieldVisits: [], date: dObj, dateStr, employee: sod.employee });
    });

    // Process EODs
    (reports.eod || []).forEach((eod: any) => {
      const empId = eod.employee?.id || eod.employee?.id || eod.employee?.id || "unknown";
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

    // Process Tasks
    (reports.tasks || []).forEach((task: any) => {
      const empId = task.employee?.id || task.employee?.id || task.employee?.id || "unknown";
      if (!task.date) return;
      const dObj = new Date(task.date);
      const dateStr = dObj.toDateString();
      const key = `${empId}_${dateStr}`;
      const existing = map.get(key);
      if (existing) {
        existing.tasks.push(task);
      } else {
        map.set(key, { sod: null, eod: null, tasks: [task], fieldVisits: [], date: dObj, dateStr, employee: task.employee });
      }
    });

    // Process Field Visits
    (reports.fieldVisits || []).forEach((visit: any) => {
      const empId = visit.employee_id || (visit.employee?.id || visit.employee?.id || visit.employee?.id || "unknown");
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
    return Array.from(map.values()).sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [reports]);

  const exportConsolidatedCSV = () => {
    try {
      const headers = [
        "Date",
        "Employee Name",
        "Employee Email",
        "Department",
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

      const exportList = mergedList.filter((item: any) => {
        const empName = item.employee?.name || "";
        const empEmail = item.employee?.email || "";
        const matchSearch = empName.toLowerCase().includes(searchTerm.toLowerCase()) || empEmail.toLowerCase().includes(searchTerm.toLowerCase());

        let matchDate = true;
        if (dateFilter) {
          const reportDate = item.date.toDateString();
          const filterDate = new Date(dateFilter).toDateString();
          matchDate = reportDate === filterDate;
        }

        let matchCompany = true;
        if (isOwner && selectedCompany) {
          matchCompany = item.employee?.companies && item.employee.companies.includes(selectedCompany);
        }

        let matchUser = true;
        if (isOwner && selectedUser) {
          matchUser = (item.employee?.id || item.employee?.id) === selectedUser;
        }

        let matchDept = true;
        if (isOwner && selectedDept) {
          matchDept = item.employee?.department === selectedDept;
        }

        return matchSearch && matchDate && matchCompany && matchUser && matchDept;
      });

      const csvRows = exportList.map((item: any) => {
        const sodTime = item.sod ? new Date(item.sod.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "-";
        const sodTaskType = item.sod?.taskType || "-";
        const sodSummary = item.sod?.taskSummary || "-";

        const eodTime = item.eod ? new Date(item.eod.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "-";
        const eodCompleted = item.eod?.completedWork || "-";
        const eodPending = item.eod?.pendingWork || "-";
        const eodIssues = item.eod?.issuesFaced || "-";
        const eodEscalation = item.eod?.escalationRequired || "No";
        const eodTomorrow = item.eod?.tomorrowPlan || "-";

        const tasksCount = item.tasks ? item.tasks.length : 0;
        const tasksDetails = item.tasks && item.tasks.length > 0
          ? item.tasks.map((t: any) => `[${t.status}] ${t.taskTitle} (${t.taskType})`).join(" | ")
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

      const escapeCSV = (val: any) => {
        if (val === null || val === undefined) return '""';
        let str = String(val);
        str = str.replace(/"/g, '""');
        return `"${str}"`;
      };

      const csvContent = [
        headers.map(escapeCSV).join(","),
        ...csvRows.map((row: any[]) => row.map(escapeCSV).join(","))
      ].join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `Consolidated_Work_Report_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Failed to export consolidated CSV:", error);
    }
  };

  // Filter logic
  const filteredList = mergedList.filter((item: any) => {
    const empName = item.employee?.name || "";
    const empEmail = item.employee?.email || "";
    const matchSearch = empName.toLowerCase().includes(searchTerm.toLowerCase()) || empEmail.toLowerCase().includes(searchTerm.toLowerCase());

    let matchDate = true;
    if (dateFilter) {
      const reportDate = item.date.toDateString();
      const filterDate = new Date(dateFilter).toDateString();
      matchDate = reportDate === filterDate;
    }

    let matchCompany = true;
    if (isOwner && selectedCompany) {
      matchCompany = item.employee?.companies && item.employee.companies.some((c: any) => (c.id || c.id || c).toString().trim() === selectedCompany.toString().trim());
    }

    let matchUser = true;
    if (isOwner && selectedUser) {
      const itemEmpId = item.employee
        ? (typeof item.employee === "object" ? (item.employee.id || item.employee.id || "") : item.employee).toString().trim()
        : "";
      matchUser = itemEmpId === selectedUser.toString().trim();
    }

    let matchDept = true;
    if (isOwner && selectedDept) {
      matchDept = item.employee?.department === selectedDept;
    }

    let matchSubTab = true;
    if (activeSubTab === "sod") {
      matchSubTab = !!item.sod;
    } else {
      matchSubTab = !!item.eod;
    }

    return matchSearch && matchDate && matchCompany && matchUser && matchSubTab && matchDept;
  });

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
          <button
            onClick={exportConsolidatedCSV}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-black shadow-md shadow-emerald-600/10 flex items-center gap-1.5 transition-all"
          >
            <Download className="w-4 h-4" /> Export Consolidated Report (CSV)
          </button>

          {/* Sub-Tabs */}
          <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
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
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 items-center bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
        {isOwner && (
          <>
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search by Employee Name or Email..."
                className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-4 py-2.5 text-xs font-bold focus:outline-none focus:border-[#714B67] text-slate-800"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Filter by Company */}
            <div className="w-full md:w-48">
              <select
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-xs font-bold focus:outline-none focus:border-[#714B67] text-slate-800"
                value={selectedCompany}
                onChange={(e) => {
                  setSelectedCompany(e.target.value);
                  setSelectedUser("");
                }}
              >
                <option value="">All Companies</option>
                {companies.map((c: any) => (
                  <option key={c.id || c.id} value={c.id || c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Filter by Department */}
            <div className="w-full md:w-48">
              <select
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-xs font-bold focus:outline-none focus:border-[#714B67] text-slate-800"
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
              >
                <option value="">All Departments</option>
                {departmentsList.map((dept) => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>

            {/* Filter by Employee */}
            <div className="w-full md:w-48">
              <select
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-xs font-bold focus:outline-none focus:border-[#714B67] text-slate-800"
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
              >
                <option value="">All Employees</option>
                {filteredUsers.map((u: any) => (
                  <option key={u.id || u.id} value={u.id || u.id}>{u.name} ({u.role})</option>
                ))}
              </select>
            </div>
          </>
        )}
        <div className="relative w-full md:w-64">
          <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="date"
            className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-4 py-2.5 text-xs font-bold focus:outline-none focus:border-[#714B67] text-slate-800"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
          />
        </div>
        {(dateFilter || selectedCompany || selectedUser || selectedDept) && (
          <button
            onClick={() => {
              setDateFilter("");
              setSelectedCompany("");
              setSelectedUser("");
              setSelectedDept("");
            }}
            className="text-xs text-rose-600 hover:underline font-bold whitespace-nowrap"
          >
            Clear Filters
          </button>
        )}
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
                              <span>{new Date(item.sod.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                          ) : (
                            <span className="text-slate-400 font-bold">—</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {item.eod ? (
                            <div className="flex items-center gap-1.5 text-[#714B67] font-bold">
                              <Clock className="w-3.5 h-3.5" />
                              <span>{new Date(item.eod.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
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
                          ) : (
                            <span className="bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold px-2 py-0.5 rounded-full">Only EOD</span>
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
                                                "bg-slate-100 text-slate-600 border border-slate-200"
                                            }`}>
                                            {task.status}
                                          </span>
                                        </div>
                                        <div className="flex items-center justify-between text-[10px] text-slate-400">
                                          <span>Type: <strong className="text-slate-500">{task.taskType}</strong></span>
                                          {task.createdAt && (
                                            <span>Logged: {new Date(task.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                          )}
                                        </div>
                                        {task.description && (
                                          <p className="text-[10px] text-slate-505 bg-slate-50 p-2 rounded italic border border-slate-100">
                                            {task.description}
                                          </p>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="text-slate-450 italic text-[10px] py-1 bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                                    No dynamic tasks logged for this day.
                                  </div>
                                )}
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-3 border-t border-slate-200/80">
                                {/* SOD Block */}
                                <div className="space-y-1.5">
                                  <span className="text-[10px] uppercase font-mono font-bold text-emerald-600 flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Start of Day (SOD)
                                  </span>
                                  {item.sod ? (
                                    <div className="text-[11px] text-slate-600 bg-white p-3 rounded-lg border border-slate-200 space-y-1.5 shadow-sm">
                                      <div><strong>Planned Task Type:</strong> {item.sod.taskType}</div>
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
                                          <MapPin className="w-3 h-3 text-indigo-500" />
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
                                  <span className="text-[10px] uppercase font-mono font-bold text-indigo-600 flex items-center gap-1">
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
                                            <div className="text-[10px] text-slate-400 mt-0.5">
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

      {/* Selfie Lightbox Modal */}
      {selectedSelfie && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl overflow-hidden shadow-2xl max-w-sm w-full border border-slate-200 relative animate-scaleIn animate-duration-200">
            <button
              onClick={() => setSelectedSelfie(null)}
              className="absolute top-3 right-3 p-1.5 rounded-full bg-slate-900/60 hover:bg-slate-900 text-white transition-all z-10"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="aspect-square bg-slate-950 flex items-center justify-center">
              <img
                src={selectedSelfie}
                alt="Verification Selfie"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="p-4 text-center">
              <h4 className="text-xs font-black text-[#714B67] uppercase font-mono tracking-wider">Facial Verification Capture</h4>
            </div>
          </div>
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

  const canApprove = isOwnerOrDirector || isHR || isManager;
  const canApply = userRole === "Employee" || isManager;

  // Form states
  const [leaveType, setLeaveType] = useState("Casual Leave");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // History/List states
  const [leavesList, setLeavesList] = useState<any[]>([]);
  const [loadingList, setLoadingList] = useState(true);

  // Action state
  const [actionRemarks, setActionRemarks] = useState<{ [key: string]: string }>({});

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

  useEffect(() => {
    fetchLeaves();
  }, []);

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
    <div className="space-y-8 animate-fadeIn text-slate-800">
      <div>
        <h1 className="text-xl font-black text-slate-850">Leave Management Hub</h1>
        <p className="text-xs text-slate-500 mt-1">
          {canApprove
            ? "Review, approve, and track department-level or company-level leave applications."
            : "Submit casual, sick, or unpaid leave requests and track approval history"}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8">

        {/* Form View for Applicants */}
        {canApply && (
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm max-w-xl">
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
                    className="w-full bg-white border border-slate-300 rounded p-2 text-xs font-bold text-slate-900 mt-1.5 focus:outline-none focus:border-[#714B67]"
                    placeholder="Short description..."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase font-black text-slate-500 font-mono tracking-wider">Start Date *</label>
                  <input
                    type="date"
                    className="w-full bg-white border border-slate-300 rounded p-2 text-xs font-bold text-slate-900 mt-1.5 focus:outline-none focus:border-[#714B67]"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase font-black text-slate-500 font-mono tracking-wider">End Date *</label>
                  <input
                    type="date"
                    className="w-full bg-white border border-slate-300 rounded p-2 text-xs font-bold text-slate-900 mt-1.5 focus:outline-none focus:border-[#714B67]"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    required
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
        )}

        {/* List of Leave Requests */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
          <h3 className="text-xs font-black tracking-widest text-[#714B67] uppercase font-mono pb-2 border-b border-slate-100 mb-4 flex items-center justify-between">
            <span>📋 {canApprove ? "Leave Requests Registry" : "Your Leave Request History"}</span>
          </h3>

          {loadingList ? (
            <div className="h-48 flex flex-col items-center justify-center">
              <Loader2 className="w-8 h-8 text-[#714B67] animate-spin mb-2" />
              <span className="text-xs font-semibold text-slate-500">Loading leave requests...</span>
            </div>
          ) : leavesList.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center text-slate-400">
              <Calendar className="w-8 h-8 mb-2" />
              <span className="text-xs font-semibold">No leave requests found.</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-450 font-black uppercase font-mono tracking-wider">
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
                  {leavesList.map((leave: any) => {
                    const start = new Date(leave.startDate);
                    const end = new Date(leave.endDate);

                    // Show actions if the current user is authorized to approve this specific status level
                    const showActions = 
                      (isManager && (leave.status === "Pending Manager Approval" || leave.status === "Pending")) ||
                      ((isHR || isOwnerOrDirector) && (leave.status === "Pending HR Approval" || leave.status === "Pending Manager Approval" || leave.status === "Pending"));

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
        </div>

      </div>
    </div>
  );
}
