import React, { useState, useEffect, useRef } from "react";
import {
  Calendar,
  Clock,
  Briefcase,
  Plus,
  Trash2,
  CheckCircle,
  MapPin,
  Camera,
  Loader2,
  AlertCircle,
  FileSpreadsheet,
  Building2,
  Scale
} from "lucide-react";

interface ScheduleItem {
  id?: string;
  date: string;
  time: string;
  workSection: string;
  type: string; // "General" | "Bank Related" | "Others"
  subType: string; // "AO related" | "RBO related" | "branch related" | "case related"
  status?: string;
  remarks?: string;
}

interface LegalRecoverySchedulePanelProps {
  sessionUser?: any;
  triggerToast?: (msg: string) => void;
  isDark?: boolean;
}

export default function LegalRecoverySchedulePanel({
  sessionUser,
  triggerToast,
  isDark = false
}: LegalRecoverySchedulePanelProps) {
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);

  // New Schedule Entry Form States
  const [inputDate, setInputDate] = useState(new Date().toISOString().split("T")[0]);
  const [inputTime, setInputTime] = useState("10:00 AM");
  const [inputWorkSection, setInputWorkSection] = useState("");
  const [inputType, setInputType] = useState("General"); // General | Bank Related | Others
  const [inputSubType, setInputSubType] = useState("AO related"); // AO related | RBO related | branch related | case related
  const [inputRemarks, setInputRemarks] = useState("");

  // SOD Camera & Location States
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [locationStatus, setLocationStatus] = useState("");
  const [submittingSOD, setSubmittingSOD] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [sodAlreadyDone, setSodAlreadyDone] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Fetch today's schedule items
  const fetchSchedules = async (dateStr: string) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/legal-recovery/schedule?date=${dateStr}`);
      const data = await res.json();
      if (data.success) {
        setSchedules(data.data || []);
      }
    } catch (err) {
      console.error("Failed to load legal recovery schedules:", err);
    } finally {
      setLoading(false);
    }
  };

  // Check today's SOD status
  const checkSodStatus = async () => {
    try {
      const res = await fetch("/api/reports/sod");
      const data = await res.json();
      if (data.success && data.data) {
        setSodAlreadyDone(true);
      }
    } catch (err) {
      console.error("SOD check error:", err);
    }
  };

  useEffect(() => {
    fetchSchedules(selectedDate);
    checkSodStatus();
  }, [selectedDate]);

  // Add Item to local schedule list before SOD declaration
  const handleAddLocalItem = () => {
    if (!inputWorkSection.trim()) {
      if (triggerToast) triggerToast("Please enter Work Section description.");
      else alert("Please enter Work Section description.");
      return;
    }

    const newItem: ScheduleItem = {
      id: "temp_" + Date.now() + "_" + Math.random().toString(36).substr(2, 4),
      date: inputDate,
      time: inputTime,
      workSection: inputWorkSection.trim(),
      type: inputType,
      subType: inputType === "Bank Related" ? inputSubType : "",
      status: "Pending",
      remarks: inputRemarks.trim()
    };

    setSchedules(prev => [...prev, newItem]);
    setInputWorkSection("");
    setInputRemarks("");
    if (triggerToast) triggerToast("Schedule entry added to list!");
  };

  // Delete Item
  const handleDeleteItem = async (index: number, itemId?: string) => {
    if (itemId && !itemId.startsWith("temp_")) {
      try {
        await fetch(`/api/legal-recovery/schedule?id=${itemId}`, { method: "DELETE" });
      } catch (e) {
        console.error(e);
      }
    }
    setSchedules(prev => prev.filter((_, i) => i !== index));
    if (triggerToast) triggerToast("Schedule item removed.");
  };

  // Update Status in DB
  const handleUpdateStatus = async (item: ScheduleItem, newStatus: string) => {
    if (item.id && !item.id.startsWith("temp_")) {
      try {
        const res = await fetch("/api/legal-recovery/schedule", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: item.id, status: newStatus })
        });
        const data = await res.json();
        if (data.success) {
          fetchSchedules(selectedDate);
          if (triggerToast) triggerToast(`Status updated to ${newStatus}`);
        }
      } catch (err) {
        console.error("Status update failed:", err);
      }
    } else {
      setSchedules(prev => prev.map(s => s.id === item.id ? { ...s, status: newStatus } : s));
    }
  };

  // Start camera stream
  const startCamera = async () => {
    setCameraError("");
    setShowCameraModal(true);
    setTimeout(async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err: any) {
        setCameraError("Camera access denied or unavailable.");
      }
    }, 300);
  };

  // Stop camera stream
  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setShowCameraModal(false);
  };

  // Submit SOD with GPS, Camera Selfie & Schedule Items
  const handleFinalSubmitSOD = async () => {
    if (schedules.length === 0) {
      alert("Please add at least 1 Schedule Entry to your Legal Recovery plan before declaring SOD.");
      return;
    }

    setSubmittingSOD(true);
    setLocationStatus("Locking Live GPS Coordinates...");

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
    } catch (err) {
      alert("GPS Location is required for Legal Recovery SOD. Please enable Location Services.");
      setSubmittingSOD(false);
      return;
    }

    setLocationStatus("Capturing Photo Verification...");
    let selfieUrl = "";
    try {
      if (!videoRef.current || !canvasRef.current || videoRef.current.videoWidth === 0) {
        throw new Error("Camera stream not ready.");
      }

      const ctx = canvasRef.current.getContext("2d");
      canvasRef.current.width = videoRef.current.videoWidth;
      canvasRef.current.height = videoRef.current.videoHeight;
      ctx?.drawImage(videoRef.current, 0, 0);

      const blob = await new Promise<Blob | null>(res => canvasRef.current!.toBlob(res, "image/jpeg", 0.9));
      if (!blob) throw new Error("Selfie capture failed.");

      const fd = new FormData();
      fd.append("file", blob, "legal-sod-selfie.jpg");
      const upRes = await fetch("/api/documents/upload", { method: "POST", body: fd });
      const upData = await upRes.json();
      if (!upData.success) throw new Error(upData.error || "Upload failed");
      selfieUrl = upData.url;
    } catch (camErr: any) {
      alert("Photo verification failed: " + camErr.message);
      setSubmittingSOD(false);
      return;
    }

    setLocationStatus("Saving Legal Recovery SOD & Schedule to Database...");
    try {
      const taskSummary = `[Legal Recovery SOD] ${schedules.length} Schedule Tasks Declared`;
      const res = await fetch("/api/reports/sod", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskSummary,
          taskType: "Legal Recovery",
          remarks: `Total ${schedules.length} schedule entries`,
          selfieUrl,
          location,
          legalSchedules: schedules
        })
      });

      const data = await res.json();
      if (data.success) {
        setSodAlreadyDone(true);
        stopCamera();
        fetchSchedules(selectedDate);
        if (triggerToast) triggerToast("Legal Recovery SOD & Schedule declared successfully!");
        else alert("Legal Recovery SOD & Schedule declared successfully!");
      } else {
        alert("Failed to submit SOD: " + data.error);
      }
    } catch (err: any) {
      alert("Error submitting SOD: " + err.message);
    } finally {
      setSubmittingSOD(false);
    }
  };

  return (
    <div className={`space-y-6 animate-fade-in ${isDark ? "text-white" : "text-slate-800"}`}>
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase font-mono bg-purple-500/30 text-purple-200 border border-purple-400/30">
                Legal Recovery Vertical
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase font-mono bg-emerald-500/30 text-emerald-200 border border-emerald-400/30">
                SOD & Daily Schedule Planner
              </span>
            </div>
            <h2 className="text-xl md:text-2xl font-black tracking-tight flex items-center gap-2">
              <Scale className="w-6 h-6 text-purple-300" /> Legal Recovery Schedule Operations
            </h2>
            <p className="text-xs text-purple-200/80 mt-1">
              Capture mandatory GPS, Camera Selfie & build your daily work schedule planner table.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {!sodAlreadyDone ? (
              <button
                onClick={startCamera}
                className="bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs px-5 py-3 rounded-xl transition-all shadow-lg flex items-center gap-2"
              >
                <Camera className="w-4 h-4" /> Declare SOD & Verify Selfie
              </button>
            ) : (
              <div className="bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400" /> Today's SOD Declared
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Schedule Form Input Card */}
      <div className={`border rounded-2xl p-5 shadow-sm ${isDark ? "bg-gray-900 border-gray-800" : "bg-white border-slate-200"}`}>
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-dashed border-slate-200 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <Plus className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <h3 className="text-xs font-black uppercase tracking-wider font-mono">Add New Schedule Entry</h3>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="font-semibold text-slate-500">Filter Date:</span>
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className={`p-1.5 rounded border text-xs font-bold focus:outline-none focus:border-purple-500 ${isDark ? "bg-gray-800 border-gray-700 text-white" : "bg-slate-50 border-slate-200 text-slate-700"}`}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 items-end">
          {/* Date */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Date *</label>
            <input
              type="date"
              value={inputDate}
              onChange={e => setInputDate(e.target.value)}
              className={`w-full p-2.5 rounded-lg border text-xs font-bold focus:outline-none focus:border-purple-500 ${isDark ? "bg-gray-800 border-gray-700 text-white" : "bg-slate-50 border-slate-200 text-slate-800"}`}
            />
          </div>

          {/* Time */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Time *</label>
            <input
              type="time"
              value={
                (() => {
                  if (!inputTime) return "10:00";
                  const match = inputTime.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
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
                setInputTime(`${String(hour).padStart(2, '0')}:${m} ${ampm}`);
              }}
              className={`w-full p-2.5 rounded-lg border text-xs font-bold focus:outline-none focus:border-purple-500 ${isDark ? "bg-gray-800 border-gray-700 text-white" : "bg-slate-50 border-slate-200 text-slate-800"}`}
            />
          </div>

          {/* Work Section */}
          <div className="lg:col-span-2">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Work Section *</label>
            <input
              type="text"
              value={inputWorkSection}
              onChange={e => setInputWorkSection(e.target.value)}
              placeholder="Work area / Branch / Court description"
              className={`w-full p-2.5 rounded-lg border text-xs font-bold focus:outline-none focus:border-purple-500 ${isDark ? "bg-gray-800 border-gray-700 text-white" : "bg-slate-50 border-slate-200 text-slate-800"}`}
            />
          </div>

          {/* Type Dropdown */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Type *</label>
            <select
              value={inputType}
              onChange={e => setInputType(e.target.value)}
              className={`w-full p-2.5 rounded-lg border text-xs font-bold focus:outline-none focus:border-purple-500 ${isDark ? "bg-gray-800 border-gray-700 text-white" : "bg-slate-50 border-slate-200 text-slate-800"}`}
            >
              <option value="General">General</option>
              <option value="Bank Related">Bank Related</option>
              <option value="Others">Others</option>
            </select>
          </div>

          {/* Sub-Type Dropdown (Active when Type === "Bank Related") */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 mb-1">
              Bank Sub-Type
            </label>
            <select
              disabled={inputType !== "Bank Related"}
              value={inputSubType}
              onChange={e => setInputSubType(e.target.value)}
              className={`w-full p-2.5 rounded-lg border text-xs font-bold focus:outline-none focus:border-purple-500 transition-all ${
                inputType === "Bank Related"
                  ? isDark
                    ? "bg-purple-950/40 border-purple-800 text-purple-200"
                    : "bg-purple-50 border-purple-200 text-purple-900"
                  : "opacity-40 cursor-not-allowed bg-slate-100 dark:bg-gray-800 text-slate-400"
              }`}
            >
              <option value="AO related">AO related</option>
              <option value="RBO related">RBO related</option>
              <option value="branch related">branch related</option>
              <option value="case related">case related</option>
            </select>
          </div>
        </div>

        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={handleAddLocalItem}
            className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold px-4 py-2 rounded-lg transition-all shadow-sm flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" /> Add to Schedule Table
          </button>
        </div>
      </div>

      {/* Schedule Table View */}
      <div className={`border rounded-2xl p-5 shadow-sm ${isDark ? "bg-gray-900 border-gray-800" : "bg-white border-slate-200"}`}>
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <h3 className="text-xs font-black uppercase tracking-wider font-mono">
              Schedule Table ({schedules.length} Items for {selectedDate})
            </h3>
          </div>
          <span className="text-[10px] font-mono text-slate-400">
            Auto-synced with SOD Declaration
          </span>
        </div>

        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin mb-2 text-purple-600" />
            <span className="text-xs font-semibold">Loading schedule entries...</span>
          </div>
        ) : schedules.length === 0 ? (
          <div className="py-12 text-center text-slate-400">
            <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-40 text-purple-500" />
            <p className="text-xs font-semibold">No schedule entries added for {selectedDate}.</p>
            <p className="text-[10px] mt-1 text-slate-400">Use the form above to add tasks and declare your Legal Recovery SOD.</p>
          </div>
        ) : (
          <div className="overflow-x-auto max-h-64 overflow-y-auto border rounded-xl">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 z-10">
                <tr className={`border-b text-[10px] uppercase font-mono font-black tracking-wider ${isDark ? "bg-gray-800 text-gray-400 border-gray-700" : "bg-slate-100 text-slate-700 border-slate-200"}`}>
                  <th className="py-3 px-4">#</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Time</th>
                  <th className="py-3 px-4">Work Section</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Sub-Type (Bank)</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-gray-800 text-xs">
                {schedules.map((item, index) => (
                  <tr key={item.id || index} className={`hover:bg-purple-50/20 dark:hover:bg-purple-950/10 transition-colors`}>
                    <td className="py-3 px-4 font-mono font-bold text-slate-400">{index + 1}</td>
                    <td className="py-3 px-4 font-mono font-semibold">{item.date}</td>
                    <td className="py-3 px-4 font-mono font-bold text-purple-700 dark:text-purple-300">{item.time}</td>
                    <td className="py-3 px-4 font-bold text-slate-800 dark:text-slate-100">
                      {item.workSection}
                      {item.remarks && <div className="text-[10px] font-normal text-slate-400 italic mt-0.5">{item.remarks}</div>}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        item.type === "Bank Related"
                          ? "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-200"
                          : item.type === "General"
                          ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200"
                          : "bg-slate-100 text-slate-700 dark:bg-gray-800 dark:text-gray-300"
                      }`}>
                        {item.type}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {item.type === "Bank Related" && item.subType ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-200 border border-amber-300/40">
                          {item.subType}
                        </span>
                      ) : (
                        <span className="text-slate-300 dark:text-gray-600">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <select
                        value={item.status || "Pending"}
                        onChange={e => handleUpdateStatus(item, e.target.value)}
                        className={`text-[11px] font-bold rounded px-2 py-1 border focus:outline-none ${
                          item.status === "Completed"
                            ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                            : item.status === "In Progress"
                            ? "bg-amber-100 text-amber-800 border-amber-300"
                            : "bg-slate-100 text-slate-700 border-slate-300"
                        }`}
                      >
                        <option value="Pending">Pending</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Completed">Completed</option>
                      </select>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleDeleteItem(index, item.id)}
                        className="text-rose-500 hover:text-rose-700 p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                        title="Delete Schedule Entry"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* SOD CAMERA MODAL */}
      {showCameraModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className={`w-full max-w-lg rounded-2xl p-6 relative shadow-2xl ${isDark ? "bg-gray-900 border border-gray-800 text-white" : "bg-white text-slate-800"}`}>
            <h3 className="text-base font-black uppercase tracking-wider font-mono mb-4 text-center">
              Legal Recovery SOD Verification Capture
            </h3>

            {cameraError ? (
              <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs text-center">
                {cameraError}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="relative rounded-xl overflow-hidden bg-black aspect-video flex items-center justify-center border border-purple-500/30">
                  <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                  <canvas ref={canvasRef} className="hidden" />
                  <div className="absolute top-2 left-2 bg-black/60 text-white px-2 py-1 rounded text-[10px] font-mono flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-purple-400" /> GPS Lock Active
                  </div>
                </div>

                {locationStatus && (
                  <div className="text-center text-xs font-semibold text-purple-600 dark:text-purple-400 flex items-center justify-center gap-2">
                    {submittingSOD && <Loader2 className="w-4 h-4 animate-spin" />}
                    <span>{locationStatus}</span>
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={stopCamera}
                    disabled={submittingSOD}
                    className="flex-1 py-2.5 rounded-xl border text-xs font-bold hover:bg-slate-50 dark:hover:bg-gray-800 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleFinalSubmitSOD}
                    disabled={submittingSOD}
                    className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2"
                  >
                    {submittingSOD ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirm & Submit SOD"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
