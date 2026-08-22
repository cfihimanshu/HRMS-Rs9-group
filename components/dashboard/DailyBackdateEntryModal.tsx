"use client";

import React, { useEffect, useState } from "react";
import { CalendarClock, Loader2, Plus, Trash2, Upload, X } from "lucide-react";

type Staff = { id: string; name: string; role: string };
type Bank = { id: string | number; bankName: string; bankCode?: string };
type Branch = { id: string | number; bankId: string | number; branchName: string; branchCode?: string; rbo?: string };
type Nbfc = { id: string | number; nbfcName: string; nbfcCode?: string };
type WorkItem = { title: string; relatedCategory: string; type: string; details: string; status: "Pending" | "In Progress" | "Completed"; progressNote: string; proofAttachment: string; bankId: string; bankName: string; branchName: string; rboName: string; nbfcName: string; uploading?: boolean };

const emptyTask = (): WorkItem => ({ title: "", relatedCategory: "", type: "General", details: "", status: "Completed", progressNote: "", proofAttachment: "", bankId: "", bankName: "", branchName: "", rboName: "", nbfcName: "" });
const to24HourTime = (time: string, period: "AM" | "PM") => {
  const [hourText, minute = "00"] = time.split(":");
  const hour = Number(hourText);
  if (!Number.isInteger(hour) || hour < 1 || hour > 12) return "";
  const hour24 = period === "AM" ? hour % 12 : (hour % 12) + 12;
  return `${String(hour24).padStart(2, "0")}:${minute}`;
};

export default function DailyBackdateEntryModal({ open, onClose, onSaved, currentUser }: { open: boolean; onClose: () => void; onSaved: () => void; currentUser?: any }) {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [employeeId, setEmployeeId] = useState("");
  const [workDate, setWorkDate] = useState("");
  const [sodTime, setSodTime] = useState("09:00");
  const [sodPeriod, setSodPeriod] = useState<"AM" | "PM">("AM");
  const [eodTime, setEodTime] = useState("06:00");
  const [eodPeriod, setEodPeriod] = useState<"AM" | "PM">("PM");
  const [tasks, setTasks] = useState<WorkItem[]>([emptyTask()]);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [nbfcs, setNbfcs] = useState<Nbfc[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    Promise.all([
      fetch("/api/banks").then(r => r.json()),
      fetch("/api/legal-recovery/branches").then(r => r.json()),
      fetch("/api/legal-recovery/nbfc").then(r => r.json())
    ]).then(([bankData, branchData, nbfcData]) => {
      if (bankData.success) setBanks(bankData.data || []);
      if (branchData.success) setBranches(branchData.data || []);
      if (nbfcData.success) setNbfcs((nbfcData.data || []).filter((item: Nbfc & { isActive?: boolean }) => item.isActive !== false));
    }).catch(() => setError("Bank/branch master load nahi hua."));
    if (currentUser?.role !== "Owner") {
      setEmployeeId(String(currentUser?.id || ""));
      return;
    }
    fetch("/api/tasks/company-users").then(r => r.json()).then(data => {
      if (data.success) setStaff(data.data || []);
    }).catch(() => setError("Staff list load nahi hui."));
  }, [open, currentUser]);

  if (!open) return null;
  const updateTask = (index: number, patch: Partial<WorkItem>) => setTasks(rows => rows.map((row, i) => i === index ? { ...row, ...patch } : row));

  const uploadProof = async (index: number, file?: File) => {
    if (!file) return;
    updateTask(index, { uploading: true });
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("purpose", "task-proof");
      const res = await fetch("/api/documents/upload", { method: "POST", body: form });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Upload failed");
      updateTask(index, { proofAttachment: data.url, uploading: false });
    } catch (e: any) {
      updateTask(index, { uploading: false });
      setError(e.message || "Proof upload failed");
    }
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    if (!employeeId || !workDate || !sodTime || !eodTime) return setError("Staff, date, SOD aur EOD time required hain.");
    const sodTime24 = to24HourTime(sodTime, sodPeriod);
    const eodTime24 = to24HourTime(eodTime, eodPeriod);
    if (!sodTime24 || !eodTime24) return setError("SOD aur EOD time 01:00 se 12:59 ke beech select karein.");
    if (eodTime24 <= sodTime24) return setError("EOD time SOD time ke baad hona chahiye.");
    if (!tasks.length || tasks.some(t => !t.title.trim() || !t.relatedCategory || !t.type || !t.progressNote.trim() || !t.proofAttachment)) return setError("Har task mein title, related category, task type, progress note aur proof required hai.");
    if (tasks.some(t => t.relatedCategory === "Bank Related" && (!t.bankName || !t.branchName))) return setError("Bank Related task mein bank aur branch select karna required hai.");
    if (tasks.some(t => t.relatedCategory === "RBO Related" && (!t.bankName || !t.rboName))) return setError("RBO Related task mein bank aur RBO select karna required hai.");
    if (tasks.some(t => t.relatedCategory === "Fix Security Related" && !t.nbfcName)) return setError("Fix Security Related task mein NBFC select karna required hai.");
    setSaving(true);
    try {
      const res = await fetch("/api/tasks/backdate-daily", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ employeeId, workDate, sodTime: sodTime24, eodTime: eodTime24, tasks }) });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Entry save nahi hui");
      setEmployeeId(""); setWorkDate(""); setSodTime("09:00"); setSodPeriod("AM"); setEodTime("06:00"); setEodPeriod("PM"); setTasks([emptyTask()]);
      onSaved(); onClose();
    } catch (e: any) { setError(e.message || "Entry save nahi hui"); } finally { setSaving(false); }
  };

  return <div className="fixed inset-0 z-[10000] bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-3" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
    <form onSubmit={submit} className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[94vh] overflow-y-auto">
      <div className="sticky top-0 bg-white z-10 border-b px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2"><CalendarClock className="w-5 h-5 text-[#714B67]" /><div><h2 className="font-black text-slate-900">Daily Back-Date Entry</h2><p className="text-[10px] text-slate-500">SOD, EOD aur unlimited daily task records</p></div></div>
        <button type="button" onClick={onClose}><X className="w-5 h-5 text-slate-500" /></button>
      </div>
      <div className="p-5 space-y-4">
        <div className="grid sm:grid-cols-4 gap-3 rounded-xl bg-purple-50 border border-purple-100 p-3">
          <label className="text-[10px] font-black text-slate-600">STAFF *{currentUser?.role === "Owner" ? <select required value={employeeId} onChange={e => setEmployeeId(e.target.value)} className="mt-1 w-full border rounded-lg p-2 text-xs bg-white"><option value="">Select staff</option>{staff.map(s => <option key={s.id} value={s.id}>{s.name} ({s.role})</option>)}</select> : <div className="mt-1 w-full border rounded-lg p-2 text-xs bg-slate-100 text-slate-700">{currentUser?.name || "Logged-in Staff"} (Self)</div>}</label>
          <label className="text-[10px] font-black text-slate-600">WORK DATE *<input required type="date" max={new Date().toISOString().slice(0, 10)} value={workDate} onChange={e => setWorkDate(e.target.value)} className="mt-1 w-full border rounded-lg p-2 text-xs bg-white" /></label>
          <label className="text-[10px] font-black text-slate-600">SOD TIME *<div className="mt-1 flex gap-1"><input required type="time" min="01:00" max="12:59" value={sodTime} onChange={e => setSodTime(e.target.value)} className="min-w-0 flex-1 border rounded-lg p-2 text-xs bg-white" /><select value={sodPeriod} onChange={e => setSodPeriod(e.target.value as "AM" | "PM")} className="border rounded-lg px-2 text-xs font-bold bg-white"><option>AM</option><option>PM</option></select></div></label>
          <label className="text-[10px] font-black text-slate-600">EOD TIME *<div className="mt-1 flex gap-1"><input required type="time" min="01:00" max="12:59" value={eodTime} onChange={e => setEodTime(e.target.value)} className="min-w-0 flex-1 border rounded-lg p-2 text-xs bg-white" /><select value={eodPeriod} onChange={e => setEodPeriod(e.target.value as "AM" | "PM")} className="border rounded-lg px-2 text-xs font-bold bg-white"><option>AM</option><option>PM</option></select></div></label>
        </div>
        <div className="flex justify-between items-center"><div><h3 className="text-sm font-black">Daily Tasks ({tasks.length})</h3><p className="text-[10px] text-slate-500">Har task ka proof aur progress note mandatory hai.</p></div><button type="button" onClick={() => setTasks(r => [...r, emptyTask()])} className="bg-[#714B67] text-white rounded-lg px-3 py-2 text-xs font-black flex gap-1"><Plus className="w-4 h-4" /> Add Task</button></div>
        <div className="space-y-3">{tasks.map((task, index) => <div key={index} className="border rounded-xl p-3 bg-slate-50">
          <div className="flex justify-between mb-2"><span className="text-xs font-black text-[#714B67]">Task #{index + 1}</span>{tasks.length > 1 && <button type="button" onClick={() => setTasks(r => r.filter((_, i) => i !== index))}><Trash2 className="w-4 h-4 text-rose-500" /></button>}</div>
          <div className="grid sm:grid-cols-3 gap-2">
            <input required placeholder="Task title / kaam" value={task.title} onChange={e => updateTask(index, { title: e.target.value })} className="border rounded-lg p-2 text-xs font-bold bg-white" />
            <select required value={task.relatedCategory} onChange={e => updateTask(index, { relatedCategory: e.target.value, bankId: "", bankName: "", branchName: "", rboName: "", nbfcName: "" })} className="border rounded-lg p-2 text-xs bg-white">
              <option value="">Select related category</option>
              <option>Bank Related</option>
              <option>RBO Related</option>
              <option>Fix Security Related</option>
            </select>
            <select value={task.status} onChange={e => updateTask(index, { status: e.target.value as WorkItem["status"] })} className="border rounded-lg p-2 text-xs bg-white"><option>Pending</option><option>In Progress</option><option>Completed</option></select>
            {task.relatedCategory === "Bank Related" && <>
              <select required value={task.bankId} onChange={e => { const selected = banks.find(bank => String(bank.id) === e.target.value); updateTask(index, { bankId: e.target.value, bankName: selected?.bankName || "", branchName: "" }); }} className="border rounded-lg p-2 text-xs bg-white">
                <option value="">Select bank</option>
                {banks.map(bank => <option key={bank.id} value={String(bank.id)}>{bank.bankName}{bank.bankCode ? ` (${bank.bankCode})` : ""}</option>)}
              </select>
              <div>
                <input
                  required
                  type="text"
                  list={`backdate-branches-${index}`}
                  value={task.branchName}
                  disabled={!task.bankId}
                  onChange={e => updateTask(index, { branchName: e.target.value })}
                  placeholder={task.bankId ? "Search branch name / code" : "Select bank first"}
                  className="w-full border rounded-lg p-2 text-xs bg-white disabled:bg-slate-100 disabled:text-slate-400"
                />
                <datalist id={`backdate-branches-${index}`}>
                  {branches.filter(branch => String(branch.bankId) === task.bankId).map(branch => <option key={branch.id} value={branch.branchName}>{branch.branchCode || "Branch"}</option>)}
                </datalist>
              </div>
            </>}
            {task.relatedCategory === "RBO Related" && <>
              <select required value={task.bankId} onChange={e => { const selected = banks.find(bank => String(bank.id) === e.target.value); updateTask(index, { bankId: e.target.value, bankName: selected?.bankName || "", rboName: "" }); }} className="border rounded-lg p-2 text-xs bg-white">
                <option value="">Select bank</option>
                {banks.map(bank => <option key={bank.id} value={String(bank.id)}>{bank.bankName}{bank.bankCode ? ` (${bank.bankCode})` : ""}</option>)}
              </select>
              <select required value={task.rboName} disabled={!task.bankId} onChange={e => updateTask(index, { rboName: e.target.value })} className="border rounded-lg p-2 text-xs bg-white disabled:bg-slate-100 disabled:text-slate-400">
                <option value="">Select RBO</option>
                {Array.from(new Set(branches.filter(branch => String(branch.bankId) === task.bankId).map(branch => String(branch.rbo || "").trim()).filter(Boolean))).map(rbo => <option key={rbo} value={rbo}>{rbo}</option>)}
              </select>
            </>}
            {task.relatedCategory === "Fix Security Related" && <select required value={task.nbfcName} onChange={e => updateTask(index, { nbfcName: e.target.value })} className="border rounded-lg p-2 text-xs bg-white">
              <option value="">Select NBFC</option>
              {nbfcs.map(nbfc => <option key={nbfc.id} value={nbfc.nbfcName}>{nbfc.nbfcName}{nbfc.nbfcCode ? ` (${nbfc.nbfcCode})` : ""}</option>)}
            </select>}
            <select value={task.type} onChange={e => updateTask(index, { type: e.target.value })} className="border rounded-lg p-2 text-xs bg-white">
              <option>General</option><option>Office Work</option><option>Bank Work</option><option>Meeting</option><option>Call</option><option>Field Visit</option><option>Legal</option><option>Development</option><option>Operations</option>
            </select>
            <textarea placeholder="Work details" value={task.details} onChange={e => updateTask(index, { details: e.target.value })} className="sm:col-span-1 border rounded-lg p-2 text-xs bg-white" />
            <textarea required placeholder="Progress note *" value={task.progressNote} onChange={e => updateTask(index, { progressNote: e.target.value })} className="sm:col-span-1 border rounded-lg p-2 text-xs bg-white" />
            <label className="border border-dashed rounded-lg p-2 text-xs bg-white flex items-center justify-center gap-2 cursor-pointer"><Upload className="w-4 h-4" />{task.uploading ? "Uploading..." : task.proofAttachment ? "Proof uploaded ✓" : "Upload proof *"}<input type="file" className="hidden" accept="image/*,.pdf,audio/*,video/*" onChange={e => uploadProof(index, e.target.files?.[0])} /></label>
          </div>
        </div>)}</div>
        {error && <div className="text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 p-3 rounded-lg">{error}</div>}
      </div>
      <div className="sticky bottom-0 bg-white border-t p-4 flex justify-end gap-2"><button type="button" onClick={onClose} className="px-4 py-2 text-xs font-bold bg-slate-100 rounded-lg">Cancel</button><button disabled={saving || tasks.some(t => t.uploading)} className="px-5 py-2 text-xs font-black text-white bg-[#714B67] rounded-lg disabled:opacity-50">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Daily Entry"}</button></div>
    </form>
  </div>;
}
