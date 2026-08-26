"use client";

import React, { useEffect, useRef, useState } from "react";
import { AlertCircle, Building2, Loader2, RefreshCw } from "lucide-react";
import BankWorkReportModal from "./BankWorkReportModal";

export default function BankWorkReportDashboard() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [banks, setBanks] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const initialLoadStarted = useRef(false);

  const loadReportData = async () => {
    setLoading(true);
    setError("");
    try {
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 20000);
      const [taskResponse, bankResponse, nbfcResponse, staffResponse] = await Promise.all([
        fetch("/api/tasks?range=recent&limit=500", { signal: controller.signal }),
        fetch("/api/banks", { signal: controller.signal }),
        fetch("/api/legal-recovery/nbfc", { signal: controller.signal }),
        fetch("/api/tasks/company-users", { signal: controller.signal }),
      ]);
      window.clearTimeout(timeoutId);
      const [taskData, bankData, nbfcData, staffData] = await Promise.all([taskResponse.json(), bankResponse.json(), nbfcResponse.json(), staffResponse.json()]);
      if (!taskData.success) throw new Error(taskData.error || "Tasks could not be loaded");
      setTasks(Array.isArray(taskData.data) ? taskData.data : []);
      const nbfcNames = new Set((nbfcData.success && Array.isArray(nbfcData.data) ? nbfcData.data : []).map((item: any) => String(item.nbfcName || "").trim().toLowerCase()).filter(Boolean));
      const bankRecords = bankData.success && Array.isArray(bankData.data) ? bankData.data : [];
      setBanks(bankRecords.filter((item: any) => !nbfcNames.has(String(item.bankName || "").trim().toLowerCase())));
      setStaff(staffData.success && Array.isArray(staffData.data) ? staffData.data : []);
    } catch (err: any) {
      setError(err?.name === "AbortError" ? "The report is taking too long to load. Please retry." : err.message || "The bank work report could not be loaded");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialLoadStarted.current) return;
    initialLoadStarted.current = true;
    void loadReportData();
  }, []);

  if (loading) return <div className="min-h-[65vh] bg-white border rounded-2xl flex flex-col items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-[#714B67]" /><p className="mt-3 text-sm font-bold text-slate-500">Bank work report loading...</p></div>;

  if (error) return <div className="min-h-[65vh] bg-white border rounded-2xl flex flex-col items-center justify-center p-6 text-center"><span className="p-3 bg-rose-50 text-rose-600 rounded-full"><AlertCircle className="w-7 h-7" /></span><h2 className="mt-3 font-black text-slate-800">Report could not be loaded</h2><p className="mt-1 text-xs text-slate-500">{error}</p><button type="button" onClick={loadReportData} className="mt-4 flex items-center gap-2 bg-[#714B67] text-white rounded-lg px-4 py-2 text-xs font-black"><RefreshCw className="w-4 h-4" /> Retry</button></div>;

  return <div className="space-y-4"><div className="flex items-center justify-between"><div><div className="flex items-center gap-2"><Building2 className="w-6 h-6 text-[#714B67]" /><h1 className="text-2xl font-black text-slate-900">Bank Work Dashboard</h1></div><p className="text-xs text-slate-500 mt-1">Bank- and branch-wise monitoring of recent task data</p></div><button type="button" onClick={loadReportData} className="flex items-center gap-2 border bg-white hover:bg-slate-50 rounded-lg px-3 py-2 text-xs font-black text-slate-600"><RefreshCw className="w-4 h-4" /> Refresh</button></div><BankWorkReportModal open onClose={() => undefined} tasks={tasks} banks={banks} staff={staff} embedded /></div>;
}
