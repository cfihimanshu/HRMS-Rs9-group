"use client";

import React, { useEffect, useState } from "react";
import { CalendarClock, Loader2, Plus, Trash2, Upload, X } from "lucide-react";

type Staff = { id: string; name: string; role: string };
type WorkItem = { title: string; type: string; details: string; status: "Pending" | "In Progress" | "Completed"; progressNote: string; proofAttachment: string; uploading?: boolean };

const emptyTask = (): WorkItem => ({ title: "", type: "General", details: "", status: "Completed", progressNote: "", proofAttachment: "" });

export default function DailyBackdateEntryModal({ open, onClose, onSaved, currentUser }: { open: boolean; onClose: () => void; onSaved: () => void; currentUser?: any }) {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [employeeId, setEmployeeId] = useState("");
  const [workDate, setWorkDate] = useState("");
  const [sodTime, setSodTime] = useState("09:00");
  const [eodTime, setEodTime] = useState("18:00");
  const [tasks, setTasks] = useState<WorkItem[]>([emptyTask()]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
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
    if (eodTime <= sodTime) return setError("EOD time SOD time ke baad hona chahiye.");
    if (!tasks.length || tasks.some(t => !t.title.trim() || !t.progressNote.trim() || !t.proofAttachment)) return setError("Har task mein title, progress note aur proof required hai.");
    setSaving(true);
    try {
      const res = await fetch("/api/tasks/backdate-daily", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ employeeId, workDate, sodTime, eodTime, tasks }) });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Entry save nahi hui");
      setEmployeeId(""); setWorkDate(""); setSodTime("09:00"); setEodTime("18:00"); setTasks([emptyTask()]);
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
          <label className="text-[10px] font-black text-slate-600">SOD TIME *<input required type="time" value={sodTime} onChange={e => setSodTime(e.target.value)} className="mt-1 w-full border rounded-lg p-2 text-xs bg-white" /></label>
          <label className="text-[10px] font-black text-slate-600">EOD TIME *<input required type="time" value={eodTime} onChange={e => setEodTime(e.target.value)} className="mt-1 w-full border rounded-lg p-2 text-xs bg-white" /></label>
        </div>
        <div className="flex justify-between items-center"><div><h3 className="text-sm font-black">Daily Tasks ({tasks.length})</h3><p className="text-[10px] text-slate-500">Har task ka proof aur progress note mandatory hai.</p></div><button type="button" onClick={() => setTasks(r => [...r, emptyTask()])} className="bg-[#714B67] text-white rounded-lg px-3 py-2 text-xs font-black flex gap-1"><Plus className="w-4 h-4" /> Add Task</button></div>
        <div className="space-y-3">{tasks.map((task, index) => <div key={index} className="border rounded-xl p-3 bg-slate-50">
          <div className="flex justify-between mb-2"><span className="text-xs font-black text-[#714B67]">Task #{index + 1}</span>{tasks.length > 1 && <button type="button" onClick={() => setTasks(r => r.filter((_, i) => i !== index))}><Trash2 className="w-4 h-4 text-rose-500" /></button>}</div>
          <div className="grid sm:grid-cols-3 gap-2">
            <input required placeholder="Task title / kaam" value={task.title} onChange={e => updateTask(index, { title: e.target.value })} className="border rounded-lg p-2 text-xs font-bold bg-white" />
            <select value={task.type} onChange={e => updateTask(index, { type: e.target.value })} className="border rounded-lg p-2 text-xs bg-white"><option>General</option><option>Call</option><option>Meeting</option><option>Field Visit</option><option>Bank Related</option><option>Legal</option><option>Development</option><option>Operations</option></select>
            <select value={task.status} onChange={e => updateTask(index, { status: e.target.value as WorkItem["status"] })} className="border rounded-lg p-2 text-xs bg-white"><option>Pending</option><option>In Progress</option><option>Completed</option></select>
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
