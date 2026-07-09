"use client";
import React, { useState, useEffect, useRef } from "react";
import { 
  MapPin, Calendar, Car, Clock, Plus, Trash2, Image, 
  Search, Sparkles, UploadCloud, CheckCircle2, AlertCircle, 
  IndianRupee, ChevronDown, ChevronUp, Eye
} from "lucide-react";

interface FieldVisitLogsProps {
  sessionUser?: any;
  triggerToast: (msg: string) => void;
}

const parseJsonField = (field: any): any[] => {
  if (!field) return [];
  if (Array.isArray(field)) return field;
  if (typeof field === "string") {
    try {
      const parsed = JSON.parse(field);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }
  return [];
};

export function FieldVisitLogs({ sessionUser, triggerToast }: FieldVisitLogsProps) {
  const [visits, setVisits] = useState<any[]>([]);
  const [activeVisit, setActiveVisit] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [uploading, setUploading] = useState<boolean>(false);
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const [isDark, setIsDark] = useState<boolean>(false);

  // Filters (for managers)
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [selectedDept, setSelectedDept] = useState("");

  // Form states - Start Visit
  const [openingKm, setOpeningKm] = useState("");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [startPhotoUrl, setStartPhotoUrl] = useState("");

  // Form states - Close Visit
  const [closingKm, setClosingKm] = useState("");
  const [clientName, setClientName] = useState("");
  const [purpose, setPurpose] = useState("");
  const [visitNotes, setVisitNotes] = useState("");
  const [visitSummary, setVisitSummary] = useState("");
  const [endPhotoUrl, setEndPhotoUrl] = useState("");
  const [expenses, setExpenses] = useState<{ amount: string; reason: string; receiptUrl?: string }[]>([]);

  // GPS Camera States
  const [showCamera, setShowCamera] = useState(false);
  const [cameraMode, setCameraMode] = useState<"start" | "end">("start");
  const [cameraError, setCameraError] = useState("");
  const [cameraCoords, setCameraCoords] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // User role details
  const userRole = sessionUser?.role || "Employee";
  const isManager = ["Owner", "Director", "HR Head", "HR Executive", "Department Manager"].includes(userRole);

  useEffect(() => {
    fetchVisits();
    setIsDark(document.documentElement.classList.contains("dark"));
  }, [sessionUser]);

  const fetchVisits = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/field-visit");
      const data = await res.json();
      if (data.success) {
        setVisits(data.data || []);
        setActiveVisit(data.activeVisit || null);
      }
    } catch (error) {
      console.error("Error fetching field visits:", error);
      triggerToast("Failed to load field visit records");
    } finally {
      setLoading(false);
    }
  };

  const getCoordinates = (): Promise<string | null> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(null);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve(`${position.coords.latitude},${position.coords.longitude}`);
        },
        () => {
          resolve(null);
        },
        { timeout: 5000 }
      );
    });
  };

  // GPS Camera logic
  const startCamera = async (mode: "start" | "end") => {
    setCameraMode(mode);
    setCameraError("");
    setCameraCoords(null);
    setShowCamera(true);

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCameraCoords(`${pos.coords.latitude.toFixed(6)}, ${pos.coords.longitude.toFixed(6)}`);
        },
        () => {
          setCameraCoords("Location Blocked");
        },
        { enableHighAccuracy: true }
      );
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: { ideal: "environment" } } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.warn("Camera fallback to user mode", err);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err2) {
        setCameraError("Camera access denied or unavailable.");
        triggerToast("Could not access camera");
      }
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setShowCamera(false);
  };

  useEffect(() => {
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    try {
      setUploading(true);
      triggerToast("Uploading GPS Camera proof...");
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Draw GPS watermark overlay on image
      const watermarkText = `GPS: ${cameraCoords || "GPS Tagged"} | ${new Date().toLocaleString()}`;
      ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
      ctx.fillRect(0, canvas.height - 40, canvas.width, 40);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 14px sans-serif";
      ctx.fillText(watermarkText, 15, canvas.height - 15);

      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, "image/jpeg", 0.9);
      });

      if (!blob) {
        triggerToast("Failed to capture image blob");
        return;
      }

      const file = new File([blob], `${cameraMode}-odometer.jpg`, { type: "image/jpeg" });
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/documents/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (data.success && data.url) {
        if (cameraMode === "start") {
          setStartPhotoUrl(data.url);
        } else {
          setEndPhotoUrl(data.url);
        }
        triggerToast("GPS image saved successfully!");
        stopCamera();
      } else {
        triggerToast(data.error || "Failed to upload photo");
      }
    } catch (err) {
      console.error(err);
      triggerToast("Error during capture");
    } finally {
      setUploading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, isStart: boolean) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      triggerToast("Uploading odometer image...");
      
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/documents/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (data.success && data.url) {
        if (isStart) {
          setStartPhotoUrl(data.url);
        } else {
          setEndPhotoUrl(data.url);
        }
        triggerToast("Image uploaded successfully!");
      } else {
        triggerToast(data.error || "Upload failed");
      }
    } catch (err) {
      console.error(err);
      triggerToast("Error uploading file");
    } finally {
      setUploading(false);
    }
  };

  const handleStartVisit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!openingKm) {
      triggerToast("Opening KM reading is required");
      return;
    }
    if (!startPhotoUrl) {
      triggerToast("Please upload an odometer selfie/image to start");
      return;
    }

    try {
      setSubmitting(true);
      triggerToast("Getting GPS coordinates...");
      const coords = await getCoordinates();

      const res = await fetch("/api/field-visit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "start",
          opening_km: openingKm,
          opening_coordinates: coords,
          vehicle_number: vehicleNumber || "Self Owned",
          fuel_status: "N/A",
          photo_url: startPhotoUrl
        })
      });

      const data = await res.json();
      if (data.success) {
        triggerToast("Field visit started successfully!");
        setOpeningKm("");
        setVehicleNumber("");
        setStartPhotoUrl("");
        fetchVisits();
      } else {
        triggerToast(data.error || "Failed to start field visit");
      }
    } catch (error) {
      console.error(error);
      triggerToast("System error starting field visit");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseVisit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!closingKm) {
      triggerToast("Closing KM reading is required");
      return;
    }
    if (Number(closingKm) < Number(activeVisit?.opening_km)) {
      triggerToast(`Closing KM cannot be less than Opening KM (${activeVisit?.opening_km})`);
      return;
    }
    if (!endPhotoUrl) {
      triggerToast("Please upload the closing odometer selfie/image");
      return;
    }

    try {
      setSubmitting(true);
      triggerToast("Obtaining closing location...");
      const coords = await getCoordinates();

      const parsedExpenses = expenses
        .filter(exp => exp.amount && exp.reason)
        .map(exp => ({ amount: Number(exp.amount), reason: exp.reason }));

      const res = await fetch("/api/field-visit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "close",
          closing_km: closingKm,
          closing_coordinates: coords,
          client_name: clientName,
          purpose: purpose,
          visit_notes: visitNotes,
          visit_summary: visitSummary,
          photo_url: endPhotoUrl,
          expenses: parsedExpenses.length > 0 ? parsedExpenses : null
        })
      });

      const data = await res.json();
      if (data.success) {
        triggerToast("Field visit logged and closed successfully!");
        setClosingKm("");
        setClientName("");
        setPurpose("");
        setVisitNotes("");
        setVisitSummary("");
        setEndPhotoUrl("");
        setExpenses([]);
        fetchVisits();
      } else {
        triggerToast(data.error || "Failed to close field visit");
      }
    } catch (error) {
      console.error(error);
      triggerToast("Error closing field visit");
    } finally {
      setSubmitting(false);
    }
  };

  const addExpenseRow = () => {
    setExpenses([...expenses, { amount: "", reason: "", receiptUrl: "" }]);
  };

  const removeExpenseRow = (index: number) => {
    setExpenses(expenses.filter((_, i) => i !== index));
  };

  const handleExpenseChange = (index: number, field: "amount" | "reason" | "receiptUrl", value: string) => {
    const updated = [...expenses];
    updated[index] = { ...updated[index], [field]: value };
    setExpenses(updated);
  };

  const toggleRow = (id: string) => {
    setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const departmentsList = React.useMemo(() => {
    const depts = new Set<string>();
    visits.forEach((v: any) => v.employee?.department && depts.add(v.employee.department));
    return Array.from(depts).sort();
  }, [visits]);

  const filteredVisits = visits.filter((v: any) => {
    const empName = v.employee?.name || "";
    const empEmail = v.employee?.email || "";
    const matchSearch = empName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                        empEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        (v.vehicle_number || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
                        (v.client_name || "").toLowerCase().includes(searchTerm.toLowerCase());

    let matchDate = true;
    if (dateFilter) {
      matchDate = v.date === dateFilter;
    }

    let matchDept = true;
    if (isManager && selectedDept) {
      matchDept = v.employee?.department === selectedDept;
    }

    return matchSearch && matchDate && matchDept;
  });

  return (
    <div className={`space-y-8 animate-fadeIn ${isDark ? "text-gray-150" : "text-slate-800"}`}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className={`text-2xl font-black ${isDark ? "text-white" : "text-slate-850"}`}>Field Visit & KM Logs</h1>
          <p className={`text-xs mt-1 ${isDark ? "text-gray-400" : "text-slate-500"}`}>
            Track vehicle logs, odometer readings, and coordinate verifications for travel allowance calculations.
          </p>
        </div>
      </div>

      {/* Employee Submission Section */}
      {!isManager && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Active Status Header Card */}
          <div className="lg:col-span-12">
            <div className={`p-5 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm ${
              activeVisit 
                ? "bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-300"
                : "bg-emerald-500/10 border-emerald-500/30 text-emerald-900 dark:text-emerald-300"
            }`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${activeVisit ? "bg-amber-500 text-white" : "bg-emerald-500 text-white"}`}>
                  {activeVisit ? <Car className="w-5 h-5 animate-pulse" /> : <CheckCircle2 className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="font-bold text-sm">
                    {activeVisit ? "Field Visit Currently Active" : "No Active Field Visit"}
                  </h3>
                  <p className="text-xs opacity-80 mt-0.5">
                    {activeVisit 
                      ? `Started at ${new Date(activeVisit.opening_time).toLocaleTimeString()} with vehicle ${activeVisit.vehicle_number || "Self"}`
                      : "Start a visit to record vehicle KM logs and capture geolocation."}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Form Side */}
          <div className="lg:col-span-5">
            {!activeVisit ? (
              // START VISIT FORM
              <div className={`p-6 rounded-2xl border shadow-sm space-y-6 ${isDark ? "bg-gray-900 border-gray-800" : "bg-white border-slate-200"}`}>
                <h2 className="font-black text-sm uppercase tracking-wider text-indigo-650 dark:text-indigo-400 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500" /> Start Field Visit
                </h2>
                <form onSubmit={handleStartVisit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5">Vehicle Number *</label>
                    <input
                      type="text"
                      placeholder="e.g. DL-3C-AB-1234"
                      className={`w-full p-2.5 rounded-lg border text-xs font-bold focus:outline-none focus:border-indigo-500 ${isDark ? "bg-gray-800 border-gray-700 text-white" : "bg-slate-50 border-slate-200 text-slate-800"}`}
                      value={vehicleNumber}
                      onChange={(e) => setVehicleNumber(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5">Starting KM *</label>
                    <input
                      type="number"
                      placeholder="Current odometer reading"
                      className={`w-full p-2.5 rounded-lg border text-xs font-bold focus:outline-none focus:border-indigo-500 ${isDark ? "bg-gray-800 border-gray-700 text-white" : "bg-slate-50 border-slate-200 text-slate-800"}`}
                      value={openingKm}
                      onChange={(e) => setOpeningKm(e.target.value)}
                      required
                    />
                  </div>

                  {/* GPS Camera Component */}
                  <div className="space-y-3">
                    <label className="block text-xs font-bold text-slate-500 mb-1.5">Odometer Photo (KM proof) *</label>
                    {showCamera && cameraMode === "start" ? (
                      <div className={`border rounded-xl p-3 relative overflow-hidden bg-[#070810]/95`}>
                        {cameraError ? (
                          <div className="text-center py-6 text-xs text-rose-500 font-bold">{cameraError}</div>
                        ) : (
                          <div className="relative aspect-video w-full rounded-lg overflow-hidden bg-black">
                            <video
                              ref={videoRef}
                              autoPlay
                              playsInline
                              muted
                              className="w-full h-full object-cover"
                            />
                            {/* Watermark overlay in video UI */}
                            <div className="absolute bottom-2 left-2 right-2 bg-[#070810]/80 text-[10px] text-white p-2 rounded font-mono space-y-0.5 z-10">
                              <div className="flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                                <strong>GPS Coord:</strong> {cameraCoords || "Acquiring precision coordinates..."}
                              </div>
                              <div><strong>Timestamp:</strong> {new Date().toLocaleString()}</div>
                            </div>
                          </div>
                        )}
                        <div className="flex gap-2 mt-3 justify-center">
                          <button
                            type="button"
                            onClick={capturePhoto}
                            className="bg-emerald-650 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold shadow transition-all"
                            disabled={uploading || !!cameraError}
                          >
                            {uploading ? "Uploading..." : "📷 Capture Odometer"}
                          </button>
                          <button
                            type="button"
                            onClick={stopCamera}
                            className="bg-gray-650 hover:bg-gray-750 text-white px-3.5 py-2 rounded-xl text-xs font-bold shadow transition-all"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className={`border-2 border-dashed rounded-xl p-4 text-center relative hover:bg-slate-50/50 dark:hover:bg-gray-800/40 transition-all ${isDark ? "border-gray-700" : "border-slate-200"}`}>
                        {startPhotoUrl ? (
                          <div className="space-y-2">
                            <img src={startPhotoUrl} alt="Odometer Proof" className="max-h-24 mx-auto rounded-lg object-contain shadow-sm border border-slate-200" />
                            <div className="flex justify-center gap-2">
                              <button
                                type="button"
                                onClick={() => startCamera("start")}
                                className="text-[10px] text-indigo-500 font-bold hover:underline"
                              >
                                Recapture
                              </button>
                              <span className="text-[10px] text-slate-350">|</span>
                              <button
                                type="button"
                                onClick={() => setStartPhotoUrl("")}
                                className="text-[10px] text-rose-500 font-bold hover:underline"
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-3 py-1">
                            <div className="flex justify-center">
                              <button
                                type="button"
                                onClick={() => startCamera("start")}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-sm flex items-center gap-1.5 transition-all"
                              >
                                📷 Open GPS Camera
                              </button>
                            </div>
                            <div className="text-[10px] text-slate-400 font-semibold relative flex items-center justify-center my-2">
                              <span className="h-px bg-slate-200 dark:bg-gray-700 flex-1"></span>
                              <span className="px-2 bg-white dark:bg-gray-900">OR UPLOAD FILE</span>
                              <span className="h-px bg-slate-200 dark:bg-gray-700 flex-1"></span>
                            </div>
                            <div className="relative">
                              <div className="text-[10px] text-indigo-650 hover:underline cursor-pointer font-bold">Upload File Manually</div>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleFileUpload(e, true)}
                                className="absolute inset-0 opacity-0 cursor-pointer"
                                disabled={uploading}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-xl font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2"
                    disabled={submitting || uploading}
                  >
                    {submitting ? "Logging visit..." : "Start Field Visit"}
                  </button>
                </form>
              </div>
            ) : (
              // CLOSE VISIT FORM
              <div className={`p-6 rounded-2xl border shadow-sm space-y-5 ${isDark ? "bg-gray-900 border-gray-800" : "bg-white border-slate-200"}`}>
                <h2 className="font-black text-sm uppercase tracking-wider text-rose-600 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-500" /> Close Field Visit
                </h2>
                <form onSubmit={handleCloseVisit} className="space-y-4">
                  <div className="p-3 bg-amber-500/5 rounded-lg border border-amber-500/10 text-xs space-y-1">
                    <div><strong>Starting KM:</strong> {activeVisit.opening_km} km</div>
                    <div><strong>Start Time:</strong> {new Date(activeVisit.opening_time).toLocaleTimeString()}</div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1.5">Closing KM *</label>
                      <input
                        type="number"
                        placeholder="Odometer reading"
                        className={`w-full p-2.5 rounded-lg border text-xs font-bold focus:outline-none focus:border-indigo-500 ${isDark ? "bg-gray-800 border-gray-700 text-white" : "bg-slate-50 border-slate-200 text-slate-800"}`}
                        value={closingKm}
                        onChange={(e) => setClosingKm(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1.5">Client Visited *</label>
                      <input
                        type="text"
                        placeholder="Client name"
                        className={`w-full p-2.5 rounded-lg border text-xs font-bold focus:outline-none focus:border-indigo-500 ${isDark ? "bg-gray-800 border-gray-700 text-white" : "bg-slate-50 border-slate-200 text-slate-800"}`}
                        value={clientName}
                        onChange={(e) => setClientName(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5">Purpose of Visit *</label>
                    <input
                      type="text"
                      placeholder="e.g. Client Recovery / Legal notice delivery"
                      className={`w-full p-2.5 rounded-lg border text-xs font-bold focus:outline-none focus:border-indigo-500 ${isDark ? "bg-gray-800 border-gray-700 text-white" : "bg-slate-50 border-slate-200 text-slate-800"}`}
                      value={purpose}
                      onChange={(e) => setPurpose(e.target.value)}
                      required
                    />
                  </div>

                  {/* Expenses */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold text-slate-500">Claim Expenses (Optional)</label>
                      <button
                        type="button"
                        onClick={addExpenseRow}
                        className="text-[10px] text-indigo-650 hover:underline font-bold flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" /> Add Expense
                      </button>
                    </div>
                    {expenses.map((exp, idx) => (
                      <div key={idx} className="flex gap-2 items-center flex-wrap sm:flex-nowrap">
                        <input
                          type="number"
                          placeholder="Amount (₹)"
                          className={`w-24 p-2 rounded-lg border text-xs font-bold focus:outline-none focus:border-indigo-500 ${isDark ? "bg-gray-800 border-gray-700 text-white" : "bg-slate-50 border-slate-200 text-slate-800"}`}
                          value={exp.amount}
                          onChange={(e) => handleExpenseChange(idx, "amount", e.target.value)}
                        />
                        <input
                          type="text"
                          placeholder="Reason (e.g. Fuel, Toll)"
                          className={`flex-1 p-2 rounded-lg border text-xs font-bold focus:outline-none focus:border-indigo-500 ${isDark ? "bg-gray-800 border-gray-700 text-white" : "bg-slate-50 border-slate-200 text-slate-800"}`}
                          value={exp.reason}
                          onChange={(e) => handleExpenseChange(idx, "reason", e.target.value)}
                        />
                        
                        <div className="relative shrink-0">
                          <button
                            type="button"
                            className={`p-2 rounded-lg border text-xs font-bold flex items-center gap-1 ${
                              exp.receiptUrl 
                                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600" 
                                : isDark ? "bg-gray-800 border-gray-700 text-slate-400 hover:text-white" : "bg-slate-50 border-slate-200 text-slate-650 hover:text-slate-800"
                            }`}
                          >
                            <Image className="w-3.5 h-3.5" />
                            {exp.receiptUrl ? "Uploaded" : "Receipt"}
                          </button>
                          <input
                            type="file"
                            accept="image/*"
                            className="absolute inset-0 opacity-0 cursor-pointer"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              try {
                                triggerToast("Uploading receipt...");
                                const formData = new FormData();
                                formData.append("file", file);
                                const res = await fetch("/api/documents/upload", { method: "POST", body: formData });
                                const data = await res.json();
                                if (data.success && data.url) {
                                  handleExpenseChange(idx, "receiptUrl", data.url);
                                  triggerToast("Receipt uploaded!");
                                } else {
                                  triggerToast("Upload failed");
                                }
                              } catch (err) {
                                triggerToast("Upload error");
                              }
                            }}
                          />
                        </div>

                        {exp.receiptUrl && (
                          <a href={exp.receiptUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] text-indigo-500 hover:underline shrink-0 font-bold">
                            View
                          </a>
                        )}

                        <button
                          type="button"
                          onClick={() => removeExpenseRow(idx)}
                          className="text-rose-500 hover:text-rose-600 p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5">Visit Summary / Outcome</label>
                    <textarea
                      placeholder="Enter summary notes..."
                      className={`w-full p-2.5 rounded-lg border text-xs font-bold focus:outline-none focus:border-indigo-500 h-16 ${isDark ? "bg-gray-800 border-gray-700 text-white" : "bg-slate-50 border-slate-200 text-slate-800"}`}
                      value={visitSummary}
                      onChange={(e) => setVisitSummary(e.target.value)}
                    />
                  </div>

                  {/* GPS Camera for Closing KM */}
                  <div className="space-y-3">
                    <label className="block text-xs font-bold text-slate-500 mb-1.5">Closing Odometer Photo *</label>
                    {showCamera && cameraMode === "end" ? (
                      <div className={`border rounded-xl p-3 relative overflow-hidden bg-[#070810]/95`}>
                        {cameraError ? (
                          <div className="text-center py-6 text-xs text-rose-500 font-bold">{cameraError}</div>
                        ) : (
                          <div className="relative aspect-video w-full rounded-lg overflow-hidden bg-black">
                            <video
                              ref={videoRef}
                              autoPlay
                              playsInline
                              muted
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute bottom-2 left-2 right-2 bg-[#070810]/80 text-[10px] text-white p-2 rounded font-mono space-y-0.5 z-10">
                              <div className="flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                                <strong>GPS Coord:</strong> {cameraCoords || "Acquiring precision coordinates..."}
                              </div>
                              <div><strong>Timestamp:</strong> {new Date().toLocaleString()}</div>
                            </div>
                          </div>
                        )}
                        <div className="flex gap-2 mt-3 justify-center">
                          <button
                            type="button"
                            onClick={capturePhoto}
                            className="bg-emerald-650 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold shadow transition-all"
                            disabled={uploading || !!cameraError}
                          >
                            {uploading ? "Uploading..." : "📷 Capture Odometer"}
                          </button>
                          <button
                            type="button"
                            onClick={stopCamera}
                            className="bg-gray-650 hover:bg-gray-750 text-white px-3.5 py-2 rounded-xl text-xs font-bold shadow transition-all"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className={`border-2 border-dashed rounded-xl p-4 text-center relative hover:bg-slate-50/50 dark:hover:bg-gray-800/40 transition-all ${isDark ? "border-gray-700" : "border-slate-200"}`}>
                        {endPhotoUrl ? (
                          <div className="space-y-2">
                            <img src={endPhotoUrl} alt="Odometer Proof" className="max-h-24 mx-auto rounded-lg object-contain shadow-sm border border-slate-200" />
                            <div className="flex justify-center gap-2">
                              <button
                                type="button"
                                onClick={() => startCamera("end")}
                                className="text-[10px] text-indigo-500 font-bold hover:underline"
                              >
                                Recapture
                              </button>
                              <span className="text-[10px] text-slate-350">|</span>
                              <button
                                type="button"
                                onClick={() => setEndPhotoUrl("")}
                                className="text-[10px] text-rose-500 font-bold hover:underline"
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-3 py-1">
                            <div className="flex justify-center">
                              <button
                                type="button"
                                onClick={() => startCamera("end")}
                                className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-sm flex items-center gap-1.5 transition-all"
                              >
                                📷 Open GPS Camera
                              </button>
                            </div>
                            <div className="text-[10px] text-slate-400 font-semibold relative flex items-center justify-center my-2">
                              <span className="h-px bg-slate-200 dark:bg-gray-700 flex-1"></span>
                              <span className="px-2 bg-white dark:bg-gray-900">OR UPLOAD FILE</span>
                              <span className="h-px bg-slate-200 dark:bg-gray-700 flex-1"></span>
                            </div>
                            <div className="relative">
                              <div className="text-[10px] text-indigo-650 hover:underline cursor-pointer font-bold">Upload File Manually</div>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleFileUpload(e, false)}
                                className="absolute inset-0 opacity-0 cursor-pointer"
                                disabled={uploading}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-rose-600 hover:bg-rose-700 text-white py-2.5 rounded-xl font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2"
                    disabled={submitting || uploading}
                  >
                    {submitting ? "Submitting visit..." : "End & Log Visit"}
                  </button>
                </form>
              </div>
            )}
          </div>

          {/* Past Logs Side */}
          <div className="lg:col-span-7">
            <div className={`p-6 rounded-2xl border shadow-sm space-y-4 ${isDark ? "bg-gray-900 border-gray-800" : "bg-white border-slate-200"}`}>
              <h3 className="font-black text-sm uppercase tracking-wider text-slate-700 dark:text-gray-300">Your Field Visit Logs</h3>
              
              {loading ? (
                <div className="text-center py-10 font-bold text-xs text-slate-400 animate-pulse">Loading logs...</div>
              ) : visits.length === 0 ? (
                <div className="text-center py-10 italic text-slate-400 text-xs">No field visit history found.</div>
              ) : (
                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                  {visits.map((visit) => (
                    <div 
                      key={visit.id} 
                      className={`p-4 rounded-xl border transition-all ${isDark ? "bg-gray-800/40 border-gray-700 hover:bg-gray-800/60" : "bg-slate-50/50 border-slate-200 hover:bg-slate-50"}`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="text-xs font-black text-slate-850 dark:text-white flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-slate-450" />
                            <span>{new Date(visit.date).toLocaleDateString()}</span>
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                              visit.status === "Open" ? "bg-amber-500/10 text-amber-700" : "bg-emerald-500/10 text-emerald-700"
                            }`}>
                              {visit.status}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">Vehicle: {visit.vehicle_number}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs font-black text-indigo-650 dark:text-indigo-400">
                            {visit.distance_travelled ? `${visit.distance_travelled} km` : "-"}
                          </div>
                          <div className="text-[9px] text-slate-400">Travelled</div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mt-3 border-t border-dashed border-slate-200 dark:border-gray-700 pt-3 text-[10px]">
                        <div>
                          <div className="font-bold text-slate-450 uppercase tracking-wide">Starting Details</div>
                          <div className="mt-1 font-semibold">KM: {visit.opening_km} km</div>
                          <div className="text-[9px] text-slate-400 mt-0.5">{new Date(visit.opening_time).toLocaleTimeString()}</div>
                          {visit.opening_coordinates && (
                            <a
                              href={`https://www.google.com/maps/search/?api=1&query=${visit.opening_coordinates}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-indigo-500 hover:underline flex items-center gap-0.5 mt-1 font-bold"
                            >
                              <MapPin className="w-3.5 h-3.5" /> Start Location
                            </a>
                          )}
                        </div>
                        <div>
                          <div className="font-bold text-slate-450 uppercase tracking-wide">Closing Details</div>
                          {visit.status === "Closed" ? (
                            <>
                              <div className="mt-1 font-semibold">KM: {visit.closing_km} km</div>
                              <div className="text-[9px] text-slate-400 mt-0.5">{new Date(visit.closing_time).toLocaleTimeString()}</div>
                              {visit.closing_coordinates && (
                                <a
                                  href={`https://www.google.com/maps/search/?api=1&query=${visit.closing_coordinates}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-indigo-500 hover:underline flex items-center gap-0.5 mt-1 font-bold"
                                >
                                  <MapPin className="w-3.5 h-3.5" /> End Location
                                </a>
                              )}
                            </>
                          ) : (
                            <div className="text-slate-400 italic mt-1">Visit Active</div>
                          )}
                        </div>
                      </div>

                      {/* Display Photos */}
                      {(() => {
                        const photos = parseJsonField(visit.photos_json);
                        if (photos.length === 0) return null;
                        return (
                          <div className="flex gap-2 mt-3 pt-3 border-t border-dashed border-slate-200 dark:border-gray-700">
                            {photos.map((url: string, index: number) => (
                              <a 
                                key={index}
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="relative group block rounded border border-slate-250 bg-white"
                              >
                                <img src={url} alt="Odometer" className="w-12 h-12 object-cover rounded" />
                                <div className="absolute inset-0 bg-[#070810]/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all rounded">
                                  <Eye className="w-3 h-3 text-white" />
                                </div>
                              </a>
                            ))}
                          </div>
                        );
                      })()}

                      {/* Display Claimed Expenses */}
                      {(() => {
                        const exps = parseJsonField(visit.expenses_json);
                        if (exps.length === 0) return null;
                        return (
                          <div className="mt-3 pt-3 border-t border-dashed border-slate-200 dark:border-gray-700 space-y-1">
                            <div className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Claimed Expenses</div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                              {exps.map((exp: any, i: number) => (
                                <div key={i} className="bg-slate-50/50 dark:bg-gray-800 p-2 rounded border border-slate-100 dark:border-gray-700 text-xs flex justify-between items-center">
                                  <div>
                                    <span className="font-bold text-slate-700 dark:text-slate-300">{exp.reason}</span>
                                    {exp.receiptUrl && (
                                      <a
                                        href={exp.receiptUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-[10px] text-indigo-500 hover:underline block mt-0.5 font-bold"
                                      >
                                        View Bill Receipt
                                      </a>
                                    )}
                                  </div>
                                  <span className="font-black text-slate-800 dark:text-white flex items-center"><IndianRupee className="w-3 h-3" /> {exp.amount}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Manager Dashboard Section */}
      {isManager && (
        <div className="space-y-6">
          {/* Filters Panel */}
          <div className={`border rounded-xl p-4 flex flex-col md:flex-row gap-4 items-center shadow-sm ${isDark ? "bg-gray-900 border-gray-800" : "bg-white border-slate-200"}`}>
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                className={`w-full border rounded-lg pl-9 pr-4 py-2 text-xs font-semibold focus:outline-none focus:border-indigo-500 ${isDark ? "bg-gray-800 border-gray-700 text-white" : "bg-slate-50 border-slate-200 text-slate-800"}`}
                placeholder="Search by Employee, Vehicle or Client..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            {/* Filter by Department */}
            <div className="w-full md:w-48">
              <select
                className={`w-full border rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none focus:border-indigo-500 ${isDark ? "bg-gray-800 border-gray-700 text-gray-300" : "bg-slate-50 border-slate-200 text-slate-700"}`}
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
              >
                <option value="">All Departments</option>
                {departmentsList.map((dept) => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>

            {/* Filter by Date */}
            <div className="w-full md:w-48">
              <input
                type="date"
                className={`w-full border rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none focus:border-indigo-500 ${isDark ? "bg-gray-800 border-gray-700 text-gray-300" : "bg-slate-50 border-slate-200 text-slate-700"}`}
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
              />
            </div>

            {(dateFilter || selectedDept || searchTerm) && (
              <button
                onClick={() => {
                  setDateFilter("");
                  setSelectedDept("");
                  setSearchTerm("");
                }}
                className="text-xs text-rose-600 hover:underline font-bold whitespace-nowrap"
              >
                Clear Filters
              </button>
            )}
          </div>

          {/* Table Container */}
          <div className={`rounded-xl border shadow-sm overflow-hidden ${isDark ? "bg-gray-900 border-gray-800" : "bg-white border-slate-200"}`}>
            {loading ? (
              <div className="text-center py-12 font-bold text-xs text-slate-400 animate-pulse">Loading all field logs...</div>
            ) : filteredVisits.length === 0 ? (
              <div className="text-center py-12 italic text-slate-400 text-xs">No matching field visit logs found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs whitespace-nowrap border-collapse">
                  <thead className={`${isDark ? "bg-gray-800 text-gray-400" : "bg-slate-50 text-slate-550"} font-bold`}>
                    <tr className="border-b border-slate-200 dark:border-gray-800">
                      <th className="px-6 py-4 uppercase tracking-wider">Employee</th>
                      <th className="px-6 py-4 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-4 uppercase tracking-wider">Vehicle</th>
                      <th className="px-6 py-4 uppercase tracking-wider">Starting KM</th>
                      <th className="px-6 py-4 uppercase tracking-wider">Closing KM</th>
                      <th className="px-6 py-4 uppercase tracking-wider">Total Travel</th>
                      <th className="px-6 py-4 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${isDark ? "divide-gray-850 text-gray-300" : "divide-slate-100 text-slate-700"} font-semibold`}>
                    {filteredVisits.map((visit) => {
                      const isExpanded = !!expandedRows[visit.id];
                      return (
                        <React.Fragment key={visit.id}>
                          <tr 
                            className={`cursor-pointer hover:bg-slate-50/50 dark:hover:bg-gray-850/50 ${isExpanded ? (isDark ? "bg-gray-850/30" : "bg-indigo-50/15") : ""}`}
                            onClick={() => toggleRow(visit.id)}
                          >
                            <td className="px-6 py-4">
                              <div className="font-bold text-slate-850 dark:text-white">{visit.employee?.name || "Unknown"}</div>
                              <div className="text-[10px] text-slate-455 font-mono mt-0.5">{visit.employee?.email} | {visit.employee?.department}</div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                <span>{new Date(visit.date).toLocaleDateString()}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4">{visit.vehicle_number}</td>
                            <td className="px-6 py-4">{visit.opening_km} km</td>
                            <td className="px-6 py-4">{visit.status === "Closed" ? `${visit.closing_km} km` : "-"}</td>
                            <td className="px-6 py-4 font-black text-indigo-600 dark:text-indigo-400">
                              {visit.status === "Closed" ? `${visit.distance_travelled} km` : "Active"}
                            </td>
                            <td className="px-6 py-4">
                              <span className={`px-2 py-0.5 rounded text-[9px] uppercase font-bold ${
                                visit.status === "Open" ? "badge-active" : "badge-inactive"
                              }`}>
                                {visit.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <button
                                className="text-indigo-600 hover:text-indigo-800 p-1 flex items-center gap-1 mx-auto"
                                onClick={(e) => { e.stopPropagation(); toggleRow(visit.id); }}
                              >
                                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                              </button>
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr className={`border-b ${isDark ? "border-gray-800" : "border-slate-100"}`}>
                              <td colSpan={8} className="p-0">
                                <div className={`p-6 m-4 rounded-xl border shadow-inner ${isDark ? "bg-gray-900/60 border-gray-800" : "bg-slate-50 border-slate-200"}`}>
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    {/* Left: Travel Details */}
                                    <div className="space-y-4">
                                      <div>
                                        <h4 className="font-bold text-[10px] uppercase text-slate-400 mb-2">Check-in / Check-out Details</h4>
                                        <div className="space-y-1.5 text-xs">
                                          <div><strong>Starting:</strong> {visit.opening_km} km @ {new Date(visit.opening_time).toLocaleTimeString()}</div>
                                          {visit.status === "Closed" && (
                                            <div><strong>Closing:</strong> {visit.closing_km} km @ {new Date(visit.closing_time).toLocaleTimeString()}</div>
                                          )}
                                        </div>
                                      </div>
                                      
                                      {/* Coordinates */}
                                      <div className="space-y-2">
                                        {visit.opening_coordinates && (
                                          <a
                                            href={`https://www.google.com/maps/search/?api=1&query=${visit.opening_coordinates}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-indigo-500 hover:underline flex items-center gap-1 text-xs font-bold"
                                          >
                                            <MapPin className="w-4 h-4" /> Starting Location Map
                                          </a>
                                        )}
                                        {visit.closing_coordinates && (
                                          <a
                                            href={`https://www.google.com/maps/search/?api=1&query=${visit.closing_coordinates}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-indigo-500 hover:underline flex items-center gap-1 text-xs font-bold"
                                          >
                                            <MapPin className="w-4 h-4" /> Closing Location Map
                                          </a>
                                        )}
                                      </div>
                                    </div>

                                    {/* Middle: Client Details & Summary */}
                                    <div className="space-y-2">
                                      <h4 className="font-bold text-[10px] uppercase text-slate-400 mb-2">Visit Summary</h4>
                                      <div className="text-xs space-y-1">
                                        <div><strong>Client:</strong> {visit.client_name || "-"}</div>
                                        <div><strong>Purpose:</strong> {visit.purpose || "-"}</div>
                                        {visit.visit_summary && (
                                          <div className="mt-2 bg-white dark:bg-gray-800 p-2.5 rounded-lg border border-slate-200 dark:border-gray-700 text-[11px] leading-relaxed">
                                            {visit.visit_summary}
                                          </div>
                                        )}
                                      </div>
                                    </div>

                                    {/* Right: Expenses & Odometer Proofs */}
                                    <div className="space-y-4">
                                      {/* Claimed Expenses */}
                                      {(() => {
                                        const exps = parseJsonField(visit.expenses_json);
                                        if (exps.length === 0) return null;
                                        return (
                                          <div>
                                            <h4 className="font-bold text-[10px] uppercase text-slate-400 mb-2">Claimed Expenses</h4>
                                            <div className="space-y-1.5">
                                              {exps.map((exp: any, i: number) => (
                                                <div key={i} className="flex flex-col gap-1 text-xs bg-indigo-50/20 dark:bg-indigo-900/10 p-2.5 rounded border border-indigo-100/10">
                                                  <div className="flex justify-between items-center">
                                                    <span className="text-slate-500 font-bold">{exp.reason}</span>
                                                    <span className="font-bold text-slate-800 dark:text-white flex items-center"><IndianRupee className="w-3 h-3" />{exp.amount}</span>
                                                  </div>
                                                  {exp.receiptUrl && (
                                                    <a
                                                      href={exp.receiptUrl}
                                                      target="_blank"
                                                      rel="noopener noreferrer"
                                                      className="text-[10px] text-indigo-500 hover:underline flex items-center gap-1 font-bold mt-1"
                                                    >
                                                      <Image className="w-3 h-3" /> View Receipt Bill
                                                    </a>
                                                  )}
                                                </div>
                                              ))}
                                              <div className="flex justify-between border-t border-dashed border-slate-350 dark:border-gray-700 pt-1.5 font-black text-xs text-indigo-650 dark:text-indigo-400">
                                                <span>Total Claim:</span>
                                                <span className="flex items-center"><IndianRupee className="w-3.5 h-3.5" />
                                                  {exps.reduce((sum: number, e: any) => sum + Number(e.amount), 0)}
                                                </span>
                                              </div>
                                            </div>
                                          </div>
                                        );
                                      })()}

                                      {/* Photos */}
                                      {(() => {
                                        const photos = parseJsonField(visit.photos_json);
                                        if (photos.length === 0) return null;
                                        return (
                                          <div>
                                            <h4 className="font-bold text-[10px] uppercase text-slate-400 mb-2">Odometer Proofs</h4>
                                            <div className="flex gap-2">
                                              {photos.map((url: string, index: number) => (
                                                <a 
                                                  key={index}
                                                  href={url}
                                                  target="_blank"
                                                  rel="noopener noreferrer"
                                                  className="relative group block rounded border border-slate-200 dark:border-gray-700 bg-white"
                                                >
                                                  <img src={url} alt="Odometer" className="w-12 h-12 object-cover rounded" />
                                                  <div className="absolute inset-0 bg-[#070810]/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all rounded">
                                                    <Eye className="w-3.5 h-3.5 text-white" />
                                                  </div>
                                                </a>
                                              ))}
                                            </div>
                                          </div>
                                        );
                                      })()}
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
        </div>
      )}
      
      {/* Hidden canvas for taking photos */}
      <canvas ref={canvasRef} style={{ display: "none" }} />
    </div>
  );
}
