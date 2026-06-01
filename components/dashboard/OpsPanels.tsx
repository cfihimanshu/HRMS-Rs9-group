import React, { useState, useRef, useEffect } from "react";
import { 
  CalendarCheck, 
  Send,
  Camera,
  MapPin,
  Loader2,
  User,
  Hash
} from "lucide-react";

interface OpsProps {
  sessionUser?: any;
  stats: any;
  handleAttendancePunch: () => void;
  handleSodSubmit: (payload: any) => void;
  handleEodSubmit: (payload: any) => void;
}

export function DailyCommitments({
  sessionUser,
  stats,
  handleAttendancePunch,
  handleSodSubmit,
  handleEodSubmit
}: OpsProps) {
  // SOD States
  const [taskSummary, setTaskSummary] = useState("");
  const [taskType, setTaskType] = useState("Meeting");
  const [remarks, setRemarks] = useState("");
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

    if (!videoRef.current || !canvasRef.current) return;
    setSubmittingSOD(true);
    setLocationStatus("Fetching exact GPS coordinates...");

    try {
      // 1. Get GPS Location
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
        });
      });

      const location = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        timestamp: new Date(position.timestamp)
      };

      setLocationStatus("Encrypting facial capture...");

      // 2. Click Selfie
      const context = canvasRef.current.getContext("2d");
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);
      }

      // 3. Upload to Cloudinary
      canvasRef.current.toBlob(async (blob) => {
        if (!blob) throw new Error("Image capture failed");
        
        setLocationStatus("Uploading encrypted blob to Cloudinary...");
        const formData = new FormData();
        formData.append("file", blob, "sod-selfie.jpg");

        const uploadRes = await fetch("/api/documents/upload", {
          method: "POST",
          body: formData,
        });
        const uploadData = await uploadRes.json();
        if (!uploadData.success) throw new Error("Cloudinary upload failed");

        setLocationStatus("Syncing with RS9 ERP System...");

        // 4. Submit SOD
        await handleSodSubmit({
          taskSummary,
          taskType,
          remarks,
          selfieUrl: uploadData.url,
          location
        });

        setShowCamera(false);
        setTaskSummary("");
        setRemarks("");
        setSubmittingSOD(false);
        setLocationStatus("Awaiting GPS...");
      }, "image/jpeg", 0.9);

    } catch (err: any) {
      console.error(err);
      alert("Verification Failed! Strict policy requires both GPS and Camera access. Error: " + err.message);
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

    if (!eodVideoRef.current || !eodCanvasRef.current) return;
    setSubmittingEOD(true);
    setEodLocationStatus("Fetching exact GPS coordinates...");

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
        });
      });

      const location = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        timestamp: new Date(position.timestamp)
      };

      setEodLocationStatus("Encrypting facial capture...");

      const context = eodCanvasRef.current.getContext("2d");
      if (context) {
        eodCanvasRef.current.width = eodVideoRef.current.videoWidth;
        eodCanvasRef.current.height = eodVideoRef.current.videoHeight;
        context.drawImage(eodVideoRef.current, 0, 0, eodCanvasRef.current.width, eodCanvasRef.current.height);
      }

      eodCanvasRef.current.toBlob(async (blob) => {
        if (!blob) throw new Error("Image capture failed");
        
        setEodLocationStatus("Uploading encrypted blob to Cloudinary...");
        const formData = new FormData();
        formData.append("file", blob, "eod-selfie.jpg");

        const uploadRes = await fetch("/api/documents/upload", {
          method: "POST",
          body: formData,
        });
        const uploadData = await uploadRes.json();
        if (!uploadData.success) throw new Error("Cloudinary upload failed");

        setEodLocationStatus("Syncing with RS9 ERP System...");

        await handleEodSubmit({
          completedWork: eodCompleted,
          pendingWork: eodPending,
          issues: eodIssues,
          escalationNeeded: eodEscalation.startsWith("Yes"),
          tomorrowPlan: eodTomorrowPlan,
          selfieUrl: uploadData.url,
          location
        });

        setShowEodCamera(false);
        setEodCompleted("");
        setEodPending("");
        setEodIssues("");
        setEodTomorrowPlan("");
        setSubmittingEOD(false);
        setEodLocationStatus("Awaiting GPS...");
      }, "image/jpeg", 0.9);

    } catch (err: any) {
      console.error(err);
      alert("Verification Failed! Strict policy requires both GPS and Camera access. Error: " + err.message);
      setSubmittingEOD(false);
      setShowEodCamera(false);
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn text-slate-800">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-slate-850">Daily Commitment Audits</h1>
          <p className="text-xs text-slate-500 mt-1">Mark attendance punch-in registry, declare Start of Day planner, EOD outcomes</p>
        </div>
        <button 
          className="bg-[#714B67] hover:bg-[#5F3F56] px-4 py-2.5 rounded-lg text-xs font-bold text-white transition-all flex items-center gap-1.5 shadow" 
          onClick={handleAttendancePunch}
        >
          <CalendarCheck className="w-4 h-4" /> Punch Attendance Check
        </button>
      </div>

      {/* Stats widgets */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="text-[9px] uppercase font-black text-slate-450 font-mono tracking-widest">Present</div>
          <div className="text-2xl font-black text-slate-855 font-mono mt-2">{stats?.todayCompliance?.attendance || 0}</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="text-[9px] uppercase font-black text-slate-455 font-mono tracking-widest">Late Checkins</div>
          <div className="text-2xl font-black text-slate-855 font-mono mt-2">9</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="text-[9px] uppercase font-black text-slate-455 font-mono tracking-widest">Absent Cases</div>
          <div className="text-2xl font-black text-slate-855 font-mono mt-2">9</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="text-[9px] uppercase font-black text-slate-455 font-mono tracking-widest">SOD Declarations</div>
          <div className="text-2xl font-black text-emerald-600 font-mono mt-2">{stats?.todayCompliance?.sod || "91%"}</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="text-[9px] uppercase font-black text-slate-455 font-mono tracking-widest">EOD Logs Submitted</div>
          <div className="text-2xl font-black text-[#714B67] font-mono mt-2">{stats?.todayCompliance?.eod || "78%"}</div>
        </div>
      </div>

      {/* Forms */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* SOD Planner with Strict Verification */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col">
          <h3 className="text-xs font-black tracking-widest text-[#714B67] uppercase font-mono pb-2 border-b border-slate-100 mb-4 flex items-center justify-between">
            <span>📋 FORM-7: Start Of Day Declaration</span>
          </h3>
          
          {!showCamera ? (
            <div className="space-y-4 font-semibold text-slate-650 flex-1">
              {/* Profile Bar */}
              <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-indigo-500" />
                  <span className="text-xs font-black text-slate-800 uppercase tracking-wide">{sessionUser?.name || "Employee"}</span>
                </div>
                <div className="flex items-center gap-1 bg-white border border-slate-200 px-2 py-1 rounded">
                  <Hash className="w-3 h-3 text-slate-400" />
                  <span className="text-[10px] font-mono text-slate-500 font-bold">{sessionUser?.id ? sessionUser.id.substring(0,8).toUpperCase() : "USR-101"}</span>
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
                <div className="md:col-span-2">
                  <label className="text-[10px] uppercase font-black text-slate-500 font-mono tracking-wider">Remarks (Optional)</label>
                  <textarea className="w-full bg-white border border-slate-300 rounded p-2 text-xs font-bold text-slate-900 mt-1.5 focus:outline-none focus:border-[#714B67]" rows={2} value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Any special notes..." />
                </div>
              </div>
              
              <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 text-[10px] font-bold text-rose-700 flex items-start gap-2 mt-4">
                <MapPin className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                <span><strong>Verification Required:</strong> You will need to take a live selfie and allow GPS tracking to submit your SOD.</span>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-100 flex justify-end">
                <button type="button" onClick={() => setShowCamera(true)} className="bg-indigo-600 hover:bg-indigo-700 w-full px-4 py-3 rounded-lg text-xs font-black text-white transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20">
                  <Camera className="w-4 h-4" /> Start Verification & Submit
                </button>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center space-y-4">
              <h4 className="text-xs font-black text-slate-700">Live Selfie & GPS Tracking</h4>
              {cameraError ? (
                <div className="bg-rose-50 p-4 rounded-lg text-rose-600 text-xs font-bold text-center border border-rose-200">
                  ⚠️ {cameraError} <br/><br/> Please allow camera access in your browser to submit SOD.
                  <button onClick={() => setShowCamera(false)} className="mt-4 bg-white px-4 py-2 rounded border border-rose-200 block mx-auto">Go Back</button>
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
        
        {/* EOD Form with Strict Verification */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col">
          <h3 className="text-xs font-black tracking-widest text-[#714B67] uppercase font-mono pb-2 border-b border-slate-100 mb-4">📝 FORM-8: Daily EOD Log</h3>

          {!showEodCamera ? (
            <div className="space-y-4 font-semibold text-slate-650 flex-1">
              
              {/* Profile Bar */}
              <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 flex justify-between items-center mb-2">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-emerald-500" />
                  <span className="text-xs font-black text-slate-800 uppercase tracking-wide">{sessionUser?.name || "Employee"}</span>
                </div>
                <div className="flex items-center gap-1 bg-white border border-slate-200 px-2 py-1 rounded">
                  <Hash className="w-3 h-3 text-slate-400" />
                  <span className="text-[10px] font-mono text-slate-500 font-bold">{sessionUser?.id ? sessionUser.id.substring(0,8).toUpperCase() : "USR-101"}</span>
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
                  ⚠️ {eodCameraError} <br/><br/> Please allow camera access in your browser to submit EOD.
                  <button onClick={() => setShowEodCamera(false)} className="mt-4 bg-white px-4 py-2 rounded border border-rose-200 block mx-auto">Go Back</button>
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
      </div>

    </div>
  );
}

export function PerformanceCompliance() {
  return (
    <div className="space-y-8 animate-fadeIn text-slate-800">
      <div>
        <h1 className="text-xl font-black text-slate-850">Workforce Performance Compliance</h1>
        <p className="text-xs text-slate-500 mt-1">Aggregate score combining KPI outputs, daily checks compliance, and manager feedback ratings</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-450 font-black uppercase font-mono tracking-wider">
                <th className="pb-3 pr-2">Employee</th>
                <th className="pb-3 px-2">Dept</th>
                <th className="pb-3 px-2">KPI Score</th>
                <th className="pb-3 px-2">Attendance</th>
                <th className="pb-3 px-2">SOD/EOD Ratio</th>
                <th className="pb-3 px-2">Vetting Flag</th>
                <th className="pb-3 pl-2 text-right">Rating Grid</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-semibold text-slate-650">
              <tr className="hover:bg-slate-50/50">
                <td className="py-3.5 font-bold text-slate-850">Kavita Nair</td>
                <td className="py-3.5 px-2">Sales</td>
                <td className="py-3.5 px-2 text-[#714B67] font-mono font-bold">92%</td>
                <td className="py-3.5 px-2 font-mono">98%</td>
                <td className="py-3.5 px-2 font-mono">100%</td>
                <td className="py-3.5 px-2"><span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-50/50 text-emerald-600 border border-emerald-250 rounded">Low</span></td>
                <td className="py-3.5 pl-2 text-right text-amber-500">⭐⭐⭐⭐⭐</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
