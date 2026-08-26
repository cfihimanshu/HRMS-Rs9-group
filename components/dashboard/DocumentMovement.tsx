"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Archive, ArrowRight, CalendarClock, CheckCircle2, Clock3, Download,
  Eye, FilePlus2, FileText, History, Loader2, PackageCheck, RefreshCw,
  RotateCcw, Search, Send, Upload, UserRound, X, QrCode, Printer,
  AlertTriangle, ShieldCheck, FileDown, UserCheck
} from "lucide-react";

type Props = { triggerToast?: (message: string) => void };

const nowLocal = () => {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
};

const emptyRegister = () => ({
  documentNumber: "", title: "", documentType: "", documentNature: "Original",
  sourceName: "", sourceDepartment: "", sourceContact: "", purpose: "",
  receivedById: "", receivedByName: "", receivedByDepartment: "",
  receivedAt: nowLocal(), dueDate: "", fileUrl: "", acknowledgementUrl: "", remarks: "",
  visibility: "Internal", owningDepartment: "", linkedEntityType: "", linkedEntityId: "",
  physicalLocation: "", expiryDate: "",
});

const emptyMovement = () => ({
  action: "HANDOVER", toPersonId: "", toPersonName: "", toDepartment: "",
  purpose: "", movedAt: nowLocal(), dueDate: "", acknowledgementUrl: "", remarks: "",
  incidentStatus: "Missing", correctionTitle: "",
});

const formatDate = (value: string, withTime = true) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  }).format(date);
};

const statusStyle: Record<string, string> = {
  "In Custody": "bg-emerald-50 text-emerald-700 border-emerald-200",
  "Handed Over": "bg-blue-50 text-blue-700 border-blue-200",
  Returned: "bg-amber-50 text-amber-700 border-amber-200",
  Archived: "bg-slate-100 text-slate-600 border-slate-200",
};

function Modal({ children, onClose, wide = false }: { children: React.ReactNode; onClose: () => void; wide?: boolean }) {
  useEffect(() => {
    const key = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[100] bg-black/45 p-4 flex items-center justify-center" onMouseDown={onClose}>
      <div className={`bg-[#FAFAF7] rounded-2xl shadow-2xl max-h-[94vh] overflow-y-auto w-full ${wide ? "max-w-5xl" : "max-w-2xl"}`} onMouseDown={event => event.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

const Input = ({ label, required, ...props }: any) => (
  <label className="block">
    <span className="block text-[10px] font-bold uppercase tracking-wider text-[#77736C] mb-1.5">{label}{required && " *"}</span>
    <input {...props} required={required} className="w-full rounded-lg border border-[#DDD8D0] bg-white px-3 py-2.5 text-xs text-[#1C1C1A] outline-none focus:border-[#C9A84C]" />
  </label>
);

const Select = ({ label, children, ...props }: any) => (
  <label className="block">
    <span className="block text-[10px] font-bold uppercase tracking-wider text-[#77736C] mb-1.5">{label}</span>
    <select {...props} className="w-full rounded-lg border border-[#DDD8D0] bg-white px-3 py-2.5 text-xs text-[#1C1C1A] outline-none focus:border-[#C9A84C]">{children}</select>
  </label>
);

const TextArea = ({ label, required, ...props }: any) => (
  <label className="block">
    <span className="block text-[10px] font-bold uppercase tracking-wider text-[#77736C] mb-1.5">{label}{required && " *"}</span>
    <textarea {...props} required={required} rows={3} className="w-full rounded-lg border border-[#DDD8D0] bg-white px-3 py-2.5 text-xs text-[#1C1C1A] outline-none focus:border-[#C9A84C] resize-y" />
  </label>
);

export default function DocumentMovement({ triggerToast }: Props) {
  const searchParams = useSearchParams();
  const linkedDocumentId = searchParams.get("documentId") || "";
  const triggerToastRef = useRef(triggerToast);
  const [documents, setDocuments] = useState<any[]>([]);
  const [summary, setSummary] = useState({ total: 0, inCustody: 0, returned: 0, archived: 0 });
  const [employees, setEmployees] = useState<any[]>([]);
  const [view, setView] = useState<"all" | "mine">("all");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All");
  const [showRegister, setShowRegister] = useState(false);
  const [registerForm, setRegisterForm] = useState(emptyRegister);
  const [movementForm, setMovementForm] = useState(emptyMovement);
  const [selected, setSelected] = useState<any>(null);
  const [showMovement, setShowMovement] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [qrData, setQrData] = useState("");

  useEffect(() => {
    triggerToastRef.current = triggerToast;
  }, [triggerToast]);

  const notify = useCallback((message: string) => {
    triggerToastRef.current?.(message);
  }, []);

  useEffect(() => {
    if (!linkedDocumentId) return;
    fetch(`/api/document-movement?documentId=${encodeURIComponent(linkedDocumentId)}`, { cache: "no-store" })
      .then(response => response.json().then(result => ({ response, result })))
      .then(({ response, result }) => {
        if (response.ok) setSelected(result.data);
        else notify(result.error || "Document could not be opened");
      })
      .catch(() => notify("Document could not be opened"));
  }, [linkedDocumentId, notify]);

  const loadDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "100" });
      if (view === "mine") params.set("mine", "true");
      if (search.trim()) params.set("search", search.trim());
      if (status !== "All") params.set("status", status);
      const response = await fetch(`/api/document-movement?${params}`, { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to load documents");
      setDocuments(result.data || []);
      setSummary(result.summary || { total: 0, inCustody: 0, returned: 0, archived: 0 });
    } catch (error: any) {
      notify(error.message);
    } finally {
      setLoading(false);
    }
  }, [notify, search, status, view]);

  useEffect(() => {
    const timer = window.setTimeout(loadDocuments, 250);
    return () => window.clearTimeout(timer);
  }, [loadDocuments]);

  useEffect(() => {
    fetch("/api/document-movement/people", { cache: "no-store" })
      .then(response => response.json())
      .then(result => {
        if (result.success) setEmployees(result.data || []);
      })
      .catch(() => {});
  }, []);

  const selectEmployee = (name: string, target: "register" | "movement") => {
    const employee = employees.find(item => item.name === name);
    const department = employee?.department || "";
    if (target === "register") {
      setRegisterForm(form => ({ ...form, receivedByName: name, receivedById: employee?.id || "", receivedByDepartment: department, owningDepartment: form.owningDepartment || department }));
    } else {
      setMovementForm(form => ({ ...form, toPersonName: name, toPersonId: employee?.id || "", toDepartment: department }));
    }
  };

  const loadDetail = async (document: any) => {
    try {
      const response = await fetch(`/api/document-movement?documentId=${encodeURIComponent(document.id)}`, { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to load movement history");
      setSelected(result.data);
    } catch (error: any) {
      notify(error.message);
    }
  };

  const uploadFile = async (file?: File) => {
    if (!file) return "";
    setUploading(true);
    try {
      const data = new FormData();
      data.append("file", file);
      data.append("purpose", "document-custody");
      const response = await fetch("/api/documents/upload", { method: "POST", body: data });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Upload failed");
      return result.url as string;
    } finally {
      setUploading(false);
    }
  };

  const registerDocument = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      const response = await fetch("/api/document-movement", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(registerForm),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Document registration failed");
      notify(`✓ ${result.data.documentNumber} registered successfully`);
      setRegisterForm(emptyRegister());
      setShowRegister(false);
      await loadDocuments();
    } catch (error: any) {
      notify(error.message);
    } finally {
      setSaving(false);
    }
  };

  const openMovement = (document: any, action: string) => {
    setSelected(document);
    setMovementForm({ ...emptyMovement(), action, toPersonName: action === "ARCHIVED" ? "Records Archive" : "" });
    setShowMovement(true);
  };

  const saveMovement = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      const response = await fetch("/api/document-movement", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...movementForm,
          documentId: selected.id,
          changes: movementForm.action === "CORRECT" ? { title: movementForm.correctionTitle } : undefined,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Movement could not be saved");
      notify(`✓ Document ${movementForm.action.toLowerCase()} recorded`);
      setShowMovement(false);
      await loadDocuments();
      await loadDetail(result.data);
    } catch (error: any) {
      notify(error.message);
    } finally {
      setSaving(false);
    }
  };

  const stats = useMemo(() => [
    { label: "Total Documents", value: summary.total, icon: FileText, tone: "text-[#8D6E16] bg-[#FFF8DF]" },
    { label: "Active Custody", value: summary.inCustody, icon: PackageCheck, tone: "text-emerald-700 bg-emerald-50" },
    { label: "Returned", value: summary.returned, icon: RotateCcw, tone: "text-amber-700 bg-amber-50" },
    { label: "Archived", value: summary.archived, icon: Archive, tone: "text-slate-600 bg-slate-100" },
    { label: "Pending Accept", value: (summary as any).pendingAcceptance || 0, icon: UserCheck, tone: "text-blue-700 bg-blue-50" },
    { label: "Overdue", value: (summary as any).overdue || 0, icon: AlertTriangle, tone: "text-rose-700 bg-rose-50" },
    { label: "Expiring (30d)", value: (summary as any).expiring || 0, icon: CalendarClock, tone: "text-violet-700 bg-violet-50" },
  ], [summary]);

  const exportCsv = () => {
    const headers = ["Document No", "Title", "Type", "Nature", "Source", "Current Holder", "Department", "Status", "Purpose", "Received", "Due", "Expiry", "Location"];
    const rows = documents.map(item => [item.documentNumber, item.title, item.documentType, item.documentNature, item.sourceName, item.currentHolderName, item.currentHolderDepartment, item.status, item.purpose, item.receivedAt, item.dueDate, item.expiryDate, item.physicalLocation]);
    const csv = [headers, ...rows].map(row => row.map(value => `"${String(value || "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url; anchor.download = `document-register-${new Date().toISOString().slice(0, 10)}.csv`; anchor.click();
    URL.revokeObjectURL(url);
  };

  const generateQr = async (document: any) => {
    const response = await fetch(`/api/document-movement/qr?documentId=${encodeURIComponent(document.id)}`);
    const result = await response.json();
    if (!response.ok) return notify(result.error || "QR generation failed");
    setQrData(result.dataUrl);
    if (!selected?.movements) await loadDetail(document);
  };

  const sendAlerts = async () => {
    const response = await fetch("/api/document-movement/alerts", { method: "POST" });
    const result = await response.json();
    notify(response.ok ? `✓ ${result.notificationsCreated} reminder(s) sent` : result.error);
  };

  const importCsv = async (file?: File) => {
    if (!file) return;
    setSaving(true);
    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter(Boolean);
      if (lines.length < 2) throw new Error("The CSV must contain a header and at least one record");
      const parseLine = (line: string) => {
        const values: string[] = []; let value = ""; let quoted = false;
        for (let index = 0; index < line.length; index += 1) {
          const char = line[index];
          if (char === '"' && line[index + 1] === '"') { value += '"'; index += 1; }
          else if (char === '"') quoted = !quoted;
          else if (char === "," && !quoted) { values.push(value.trim()); value = ""; }
          else value += char;
        }
        values.push(value.trim());
        return values;
      };
      const headers = parseLine(lines[0]).map(item => item.toLowerCase().replace(/[^a-z0-9]/g, ""));
      let imported = 0; const errors: string[] = [];
      for (let index = 1; index < lines.length; index += 1) {
        const values = parseLine(lines[index]);
        const row = Object.fromEntries(headers.map((header, position) => [header, values[position] || ""]));
        const payload = {
          documentNumber: row.documentnumber, title: row.title, documentType: row.documenttype,
          documentNature: row.documentnature || "Original", sourceName: row.source || row.sourcename,
          purpose: row.purpose, receivedByName: row.receivedby, receivedByDepartment: row.department,
          owningDepartment: row.department, receivedAt: row.receivedat || nowLocal(),
          dueDate: row.duedate, expiryDate: row.expirydate, physicalLocation: row.location,
          visibility: row.visibility || "Internal",
        };
        const response = await fetch("/api/document-movement", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
        const result = await response.json();
        if (response.ok) imported += 1; else errors.push(`Row ${index + 1}: ${result.error}`);
      }
      notify(`✓ ${imported} document(s) imported${errors.length ? `, ${errors.length} failed` : ""}`);
      await loadDocuments();
    } catch (error: any) {
      notify(error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif text-[#1C1C1A]">Document Movement Register</h1>
          <p className="text-xs text-[#77736C] mt-1">A complete audit trail of original document custody, handover, return, and acknowledgement.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={sendAlerts} className="inline-flex items-center gap-2 rounded-xl border border-[#DDD8D0] px-3 py-2.5 text-xs"><AlertTriangle className="w-4 h-4" /> Run Alerts</button>
          <button onClick={exportCsv} className="inline-flex items-center gap-2 rounded-xl border border-[#DDD8D0] px-3 py-2.5 text-xs"><FileDown className="w-4 h-4" /> Export CSV</button>
          <label className="inline-flex items-center gap-2 rounded-xl border border-[#DDD8D0] px-3 py-2.5 text-xs cursor-pointer"><Upload className="w-4 h-4" /> Bulk Import<input type="file" accept=".csv" className="hidden" onChange={event => importCsv(event.target.files?.[0])} /></label>
          <button onClick={() => setShowRegister(true)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#1C1C1A] px-4 py-2.5 text-xs font-semibold text-white hover:bg-black">
            <FilePlus2 className="w-4 h-4" /> Register New Document
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-7 gap-3">
        {stats.map(item => (
          <div key={item.label} className="rounded-xl border border-[#E8E4DF] bg-white p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${item.tone}`}><item.icon className="w-5 h-5" /></div>
            <div><div className="text-xl font-semibold text-[#1C1C1A]">{item.value}</div><div className="text-[10px] uppercase tracking-wider text-[#77736C]">{item.label}</div></div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-[#E8E4DF] bg-white overflow-hidden">
        <div className="p-4 border-b border-[#E8E4DF] flex flex-col md:flex-row gap-3">
          <div className="inline-flex rounded-lg bg-[#F5F0EA] p-1">
            <button onClick={() => setView("all")} className={`px-3 py-1.5 rounded-md text-xs ${view === "all" ? "bg-white shadow-sm font-semibold" : ""}`}>All</button>
            <button onClick={() => setView("mine")} className={`px-3 py-1.5 rounded-md text-xs ${view === "mine" ? "bg-white shadow-sm font-semibold" : ""}`}>My Documents</button>
          </div>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-[#9C9890]" />
            <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search by document number, title, source, holder, or purpose..." className="w-full rounded-lg border border-[#DDD8D0] pl-9 pr-3 py-2 text-xs outline-none focus:border-[#C9A84C]" />
          </div>
          <select value={status} onChange={event => setStatus(event.target.value)} className="rounded-lg border border-[#DDD8D0] bg-white px-3 py-2 text-xs outline-none">
            {["All", "In Custody", "Handed Over", "Returned", "Archived"].map(option => <option key={option}>{option}</option>)}
          </select>
          <button onClick={loadDocuments} className="p-2 rounded-lg border border-[#DDD8D0] text-[#77736C] hover:bg-[#F5F0EA]" title="Refresh"><RefreshCw className="w-4 h-4" /></button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left">
            <thead className="bg-[#F7F4EF] text-[9px] uppercase tracking-widest text-[#77736C]">
              <tr>{["Document", "Received From", "Current Holder", "Purpose", "Received", "Status", "Actions"].map(head => <th key={head} className="px-4 py-3 font-bold">{head}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-[#EEEAE4]">
              {loading ? (
                <tr><td colSpan={7} className="py-14 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-[#C9A84C]" /></td></tr>
              ) : documents.length === 0 ? (
                <tr><td colSpan={7} className="py-14 text-center text-xs text-[#77736C]">No document records found.</td></tr>
              ) : documents.map(document => (
                <tr key={document.id} className="hover:bg-[#FCFAF7] align-top">
                  <td className="px-4 py-3"><div className="font-semibold text-xs text-[#1C1C1A]">{document.title}</div><div className="text-[10px] text-[#8D6E16] font-mono mt-1">{document.documentNumber}</div><div className="text-[10px] text-[#77736C]">{document.documentType} · {document.documentNature}</div></td>
                  <td className="px-4 py-3"><div className="text-xs font-medium">{document.sourceName}</div><div className="text-[10px] text-[#77736C]">{document.sourceDepartment || "—"}</div></td>
                  <td className="px-4 py-3"><div className="flex gap-2"><UserRound className="w-3.5 h-3.5 text-[#C9A84C] mt-0.5" /><div><div className="text-xs font-medium">{document.currentHolderName}</div><div className="text-[10px] text-[#77736C]">{document.currentHolderDepartment || "—"}</div></div></div></td>
                  <td className="px-4 py-3 text-[11px] text-[#5D5B57] max-w-[220px]"><div className="line-clamp-2">{document.purpose}</div>{document.dueDate && <div className="mt-1 text-amber-700 flex gap-1 items-center"><CalendarClock className="w-3 h-3" /> Due {formatDate(document.dueDate, false)}</div>}</td>
                  <td className="px-4 py-3 text-[11px] text-[#5D5B57]">{formatDate(document.receivedAt)}</td>
                  <td className="px-4 py-3"><span className={`inline-flex rounded-full border px-2 py-1 text-[9px] font-bold ${statusStyle[document.status] || ""}`}>{document.status}</span></td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button onClick={() => loadDetail(document)} className="p-2 rounded-lg bg-[#F5F0EA] text-[#6F5620]" title="View history"><History className="w-3.5 h-3.5" /></button>
                      <button onClick={() => generateQr(document)} className="p-2 rounded-lg bg-violet-50 text-violet-700" title="QR code"><QrCode className="w-3.5 h-3.5" /></button>
                      {document.pendingHolderId && <button onClick={() => openMovement(document, "ACCEPT")} className="p-2 rounded-lg bg-emerald-50 text-emerald-700" title="Accept pending handover"><UserCheck className="w-3.5 h-3.5" /></button>}
                      {document.pendingHolderId && <button onClick={() => openMovement(document, "REJECT")} className="p-2 rounded-lg bg-rose-50 text-rose-700" title="Reject pending handover"><X className="w-3.5 h-3.5" /></button>}
                      {!["Returned", "Archived"].includes(document.status) && <button onClick={() => openMovement(document, "HANDOVER")} className="p-2 rounded-lg bg-blue-50 text-blue-700" title="Handover"><Send className="w-3.5 h-3.5" /></button>}
                      {!["Returned", "Archived"].includes(document.status) && <button onClick={() => openMovement(document, "RETURNED")} className="p-2 rounded-lg bg-amber-50 text-amber-700" title="Return"><RotateCcw className="w-3.5 h-3.5" /></button>}
                      {document.status === "Returned" && <button onClick={() => openMovement(document, "REOPENED")} className="p-2 rounded-lg bg-emerald-50 text-emerald-700" title="Reopen"><RefreshCw className="w-3.5 h-3.5" /></button>}
                      {document.status !== "Archived" && <button onClick={() => openMovement(document, "ARCHIVED")} className="p-2 rounded-lg bg-slate-100 text-slate-600" title="Archive"><Archive className="w-3.5 h-3.5" /></button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showRegister && (
        <Modal onClose={() => setShowRegister(false)} wide>
          <form onSubmit={registerDocument}>
            <div className="sticky top-0 z-10 bg-[#FAFAF7] border-b border-[#E8E4DF] px-6 py-4 flex justify-between items-center">
              <div><h2 className="font-serif text-xl">Register New Document</h2><p className="text-[11px] text-[#77736C]">The initial receipt/custody entry will be saved to history automatically.</p></div>
              <button type="button" onClick={() => setShowRegister(false)}><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 grid md:grid-cols-3 gap-4">
              <datalist id="document-employee-list">{employees.map(employee => <option key={employee.id} value={employee.name}>{employee.email}</option>)}</datalist>
              <Input label="Document Number (auto if blank)" value={registerForm.documentNumber} onChange={(e: any) => setRegisterForm({ ...registerForm, documentNumber: e.target.value })} placeholder="DOC/LEGAL/2026/001" />
              <Input label="Document Title" required value={registerForm.title} onChange={(e: any) => setRegisterForm({ ...registerForm, title: e.target.value })} placeholder="Original Loan Agreement" />
              <Input label="Document Type" required value={registerForm.documentType} onChange={(e: any) => setRegisterForm({ ...registerForm, documentType: e.target.value })} placeholder="Agreement / Notice / Cheque" />
              <Select label="Document Nature" value={registerForm.documentNature} onChange={(e: any) => setRegisterForm({ ...registerForm, documentNature: e.target.value })}>
                {["Original", "Photocopy", "Certified Copy", "Digital"].map(option => <option key={option}>{option}</option>)}
              </Select>
              <Input label="Received From" required value={registerForm.sourceName} onChange={(e: any) => setRegisterForm({ ...registerForm, sourceName: e.target.value })} placeholder="Person / Bank / Company" />
              <Input label="Source Department" value={registerForm.sourceDepartment} onChange={(e: any) => setRegisterForm({ ...registerForm, sourceDepartment: e.target.value })} placeholder="Legal Department" />
              <Input label="Source Contact" value={registerForm.sourceContact} onChange={(e: any) => setRegisterForm({ ...registerForm, sourceContact: e.target.value })} placeholder="Phone / email" />
              <Input label="Received By" required list="document-employee-list" value={registerForm.receivedByName} onChange={(e: any) => selectEmployee(e.target.value, "register")} placeholder="Search employee name" />
              <Input label="Receiver Department" value={registerForm.receivedByDepartment} onChange={(e: any) => setRegisterForm({ ...registerForm, receivedByDepartment: e.target.value })} placeholder="Administration" />
              <Input label="Received Date & Time" required type="datetime-local" value={registerForm.receivedAt} onChange={(e: any) => setRegisterForm({ ...registerForm, receivedAt: e.target.value })} />
              <Input label="Expected Return / Due Date" type="date" value={registerForm.dueDate} onChange={(e: any) => setRegisterForm({ ...registerForm, dueDate: e.target.value })} />
              <Input label="Document Expiry Date" type="date" value={registerForm.expiryDate} onChange={(e: any) => setRegisterForm({ ...registerForm, expiryDate: e.target.value })} />
              <Select label="Confidentiality" value={registerForm.visibility} onChange={(e: any) => setRegisterForm({ ...registerForm, visibility: e.target.value })}>
                {["Internal", "Department Only", "Management", "Confidential", "Highly Confidential"].map(option => <option key={option}>{option}</option>)}
              </Select>
              <Input label="Owning Department" value={registerForm.owningDepartment} onChange={(e: any) => setRegisterForm({ ...registerForm, owningDepartment: e.target.value })} placeholder="Legal / HR / Accounts" />
              <Input label="Physical Location" value={registerForm.physicalLocation} onChange={(e: any) => setRegisterForm({ ...registerForm, physicalLocation: e.target.value })} placeholder="Office / Room / Rack / File" />
              <Select label="Linked Record Type" value={registerForm.linkedEntityType} onChange={(e: any) => setRegisterForm({ ...registerForm, linkedEntityType: e.target.value })}>
                <option value="">Not linked</option>{["Employee", "Candidate", "Legal Case", "Bank/NBFC", "Vendor", "Asset", "Client"].map(option => <option key={option}>{option}</option>)}
              </Select>
              <Input label="Linked Record ID" value={registerForm.linkedEntityId} onChange={(e: any) => setRegisterForm({ ...registerForm, linkedEntityId: e.target.value })} placeholder="Employee/Case/Asset ID" />
              <label className="block">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-[#77736C] mb-1.5">Document File</span>
                <span className="flex items-center gap-2 w-full rounded-lg border border-dashed border-[#C9A84C] bg-[#FFFDF7] px-3 py-2 text-xs cursor-pointer">
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  <span className="truncate">{registerForm.fileUrl ? "File uploaded ✓" : "Upload PDF / image / sheet"}</span>
                  <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.webp,.csv,.xls,.xlsx" onChange={async e => {
                    try { const url = await uploadFile(e.target.files?.[0]); if (url) setRegisterForm(form => ({ ...form, fileUrl: url })); }
                    catch (error: any) { notify(error.message); }
                  }} />
                </span>
              </label>
              <div className="md:col-span-3"><TextArea label="Purpose for receiving the document" required value={registerForm.purpose} onChange={(e: any) => setRegisterForm({ ...registerForm, purpose: e.target.value })} placeholder="Case filing, verification, audit, signature..." /></div>
              <div className="md:col-span-3"><TextArea label="Remarks" value={registerForm.remarks} onChange={(e: any) => setRegisterForm({ ...registerForm, remarks: e.target.value })} placeholder="Condition, pages, seal or any special note..." /></div>
            </div>
            <div className="px-6 py-4 border-t border-[#E8E4DF] flex justify-end gap-3">
              <button type="button" onClick={() => setShowRegister(false)} className="px-4 py-2 rounded-lg border text-xs">Cancel</button>
              <button disabled={saving || uploading} className="px-5 py-2 rounded-lg bg-[#1C1C1A] text-white text-xs font-semibold disabled:opacity-50">{saving ? "Saving..." : "Register Document"}</button>
            </div>
          </form>
        </Modal>
      )}

      {showMovement && selected && (
        <Modal onClose={() => setShowMovement(false)}>
          <form onSubmit={saveMovement}>
            <div className="border-b border-[#E8E4DF] px-6 py-4 flex justify-between">
              <div><h2 className="font-serif text-xl">{movementForm.action === "HANDOVER" ? "Next Handover" : movementForm.action === "RETURNED" ? "Return Document" : movementForm.action === "REOPENED" ? "Reopen Custody" : movementForm.action === "ACCEPT" ? "Accept Handover" : movementForm.action === "REJECT" ? "Reject Handover" : movementForm.action === "CORRECT" ? "Correct Document" : movementForm.action === "INCIDENT" ? "Report Incident" : "Archive Document"}</h2><p className="text-[11px] text-[#77736C]">{selected.documentNumber} · Currently with {selected.currentHolderName}</p></div>
              <button type="button" onClick={() => setShowMovement(false)}><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 grid md:grid-cols-2 gap-4">
              {!["CORRECT", "INCIDENT", "ACCEPT", "REJECT"].includes(movementForm.action) && <Input label="Handed/Returned To" required disabled={movementForm.action === "ARCHIVED"} list="document-employee-list" value={movementForm.toPersonName} onChange={(e: any) => selectEmployee(e.target.value, "movement")} placeholder="Search employee / external receiver" />}
              {!["ACCEPT", "REJECT"].includes(movementForm.action) && <Input label="Receiver Department" value={movementForm.toDepartment} onChange={(e: any) => setMovementForm({ ...movementForm, toDepartment: e.target.value })} placeholder="Legal / HR / External" />}
              {!["ACCEPT", "REJECT"].includes(movementForm.action) && <Input label="Movement Date & Time" required type="datetime-local" value={movementForm.movedAt} onChange={(e: any) => setMovementForm({ ...movementForm, movedAt: e.target.value })} />}
              {!["ACCEPT", "REJECT"].includes(movementForm.action) && <Input label="Next Due Date" type="date" value={movementForm.dueDate} onChange={(e: any) => setMovementForm({ ...movementForm, dueDate: e.target.value })} />}
              {!["ACCEPT", "REJECT"].includes(movementForm.action) && <div className="md:col-span-2"><TextArea label="Purpose / Reason" required value={movementForm.purpose} onChange={(e: any) => setMovementForm({ ...movementForm, purpose: e.target.value })} placeholder="Who received or returned the document, and why?" /></div>}
              {movementForm.action === "INCIDENT" && <Select label="Incident Status" value={movementForm.incidentStatus} onChange={(e: any) => setMovementForm({ ...movementForm, incidentStatus: e.target.value })}>{["Missing", "Damaged", "Under Investigation", "Destroyed", "Confidential Hold"].map(option => <option key={option}>{option}</option>)}</Select>}
              {movementForm.action === "CORRECT" && <div className="md:col-span-2"><Input label="Corrected Document Title" required value={movementForm.correctionTitle} onChange={(e: any) => setMovementForm({ ...movementForm, correctionTitle: e.target.value })} /></div>}
              {!["ACCEPT", "REJECT"].includes(movementForm.action) && <label className="md:col-span-2 block">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-[#77736C] mb-1.5">Acknowledgement / Receipt Proof</span>
                <span className="flex items-center gap-2 rounded-lg border border-dashed border-[#C9A84C] bg-[#FFFDF7] px-3 py-2.5 text-xs cursor-pointer">
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  {movementForm.acknowledgementUrl ? "Receipt uploaded ✓" : "Upload the signed receipt / acknowledgement"}
                  <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.webp" onChange={async e => {
                    try { const url = await uploadFile(e.target.files?.[0]); if (url) setMovementForm(form => ({ ...form, acknowledgementUrl: url })); }
                    catch (error: any) { notify(error.message); }
                  }} />
                </span>
              </label>}
              <div className="md:col-span-2"><TextArea label="Remarks" value={movementForm.remarks} onChange={(e: any) => setMovementForm({ ...movementForm, remarks: e.target.value })} /></div>
            </div>
            <div className="px-6 py-4 border-t border-[#E8E4DF] flex justify-end gap-3">
              <button type="button" onClick={() => setShowMovement(false)} className="px-4 py-2 rounded-lg border text-xs">Cancel</button>
              <button disabled={saving || uploading} className="px-5 py-2 rounded-lg bg-[#1C1C1A] text-white text-xs font-semibold disabled:opacity-50">{saving ? "Saving..." : "Save Movement"}</button>
            </div>
          </form>
        </Modal>
      )}

      {selected?.movements && !showMovement && (
        <Modal onClose={() => setSelected(null)} wide>
          <div className="border-b border-[#E8E4DF] px-6 py-4 flex justify-between items-start">
            <div><h2 className="font-serif text-xl">{selected.title}</h2><p className="text-[11px] text-[#8D6E16] font-mono mt-1">{selected.documentNumber}</p></div>
            <button onClick={() => setSelected(null)}><X className="w-5 h-5" /></button>
          </div>
          <div className="p-6">
            <div className="grid md:grid-cols-4 gap-3 mb-7">
              {[["Type", `${selected.documentType} · ${selected.documentNature}`], ["Received From", selected.sourceName], ["Current Holder", selected.currentHolderName], ["Status", selected.status]].map(([label, value]) => (
                <div key={label} className="rounded-xl bg-white border border-[#E8E4DF] p-3"><div className="text-[9px] uppercase tracking-wider text-[#77736C]">{label}</div><div className="text-xs font-semibold mt-1">{value}</div></div>
              ))}
            </div>
            {qrData && <div className="mb-6 rounded-xl border border-violet-200 bg-violet-50 p-4 flex items-center gap-4"><img src={qrData} alt="Document QR" className="w-28 h-28 bg-white rounded-lg" /><div><div className="font-semibold text-sm">Scan Document</div><div className="text-xs text-[#77736C] mt-1">Scan the QR code to open the custody record.</div></div></div>}
            <h3 className="text-xs font-bold uppercase tracking-widest text-[#77736C] mb-4">Complete Custody Timeline</h3>
            <div className="space-y-0">
              {selected.movements.map((movement: any, index: number) => (
                <div key={movement.id} className="relative pl-10 pb-6">
                  {index < selected.movements.length - 1 && <div className="absolute left-[14px] top-7 bottom-0 w-px bg-[#DDD8D0]" />}
                  <div className="absolute left-0 top-0 w-7 h-7 rounded-full bg-[#FFF8DF] border border-[#E6D38B] flex items-center justify-center text-[10px] font-bold text-[#8D6E16]">{movement.sequence}</div>
                  <div className="rounded-xl border border-[#E8E4DF] bg-white p-4">
                    <div className="flex flex-wrap justify-between gap-2">
                      <span className="text-[10px] font-bold rounded-full bg-[#F5F0EA] px-2 py-1 text-[#6F5620]">{movement.action}</span>
                      <span className="text-[10px] text-[#77736C] flex items-center gap-1"><Clock3 className="w-3 h-3" />{formatDate(movement.movedAt)}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-3 text-xs font-semibold"><span>{movement.fromPersonName}</span><ArrowRight className="w-4 h-4 text-[#C9A84C]" /><span>{movement.toPersonName}</span></div>
                    {movement.toDepartment && <div className="text-[10px] text-[#77736C] mt-1">{movement.toDepartment}</div>}
                    <p className="text-[11px] text-[#5D5B57] mt-3">{movement.purpose}</p>
                    <div className="flex flex-wrap gap-4 mt-3 text-[10px] text-[#77736C]">
                      <span>Recorded by: {movement.performedByName}</span>
                      {movement.dueDate && <span>Due: {formatDate(movement.dueDate, false)}</span>}
                      {movement.acknowledgementUrl && <a href={movement.acknowledgementUrl} target="_blank" rel="noreferrer" className="text-blue-700 flex items-center gap-1"><Eye className="w-3 h-3" /> Receipt proof</a>}
                    </div>
                    {movement.remarks && <div className="mt-2 text-[10px] italic text-[#77736C]">“{movement.remarks}”</div>}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-2 justify-end border-t border-[#E8E4DF] pt-4">
              {selected.fileUrl && <a href={selected.fileUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs"><Download className="w-3.5 h-3.5" /> Document File</a>}
              <button onClick={() => generateQr(selected)} className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs"><QrCode className="w-3.5 h-3.5" /> QR Code</button>
              <button onClick={() => window.print()} className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs"><Printer className="w-3.5 h-3.5" /> Print Receipt</button>
              <button onClick={() => openMovement(selected, "CORRECT")} className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs"><RefreshCw className="w-3.5 h-3.5" /> Correction</button>
              <button onClick={() => openMovement(selected, "INCIDENT")} className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 text-rose-700 px-3 py-2 text-xs"><AlertTriangle className="w-3.5 h-3.5" /> Incident</button>
              {!["Returned", "Archived"].includes(selected.status) && <button onClick={() => openMovement(selected, "HANDOVER")} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 text-white px-3 py-2 text-xs"><Send className="w-3.5 h-3.5" /> Next Handover</button>}
              {selected.pendingHolderId && <button onClick={() => openMovement(selected, "ACCEPT")} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 text-white px-3 py-2 text-xs"><UserCheck className="w-3.5 h-3.5" /> Accept</button>}
              {selected.pendingHolderId && <button onClick={() => openMovement(selected, "REJECT")} className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 text-white px-3 py-2 text-xs"><X className="w-3.5 h-3.5" /> Reject</button>}
              {!["Returned", "Archived"].includes(selected.status) && <button onClick={() => openMovement(selected, "RETURNED")} className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 text-white px-3 py-2 text-xs"><CheckCircle2 className="w-3.5 h-3.5" /> Mark Returned</button>}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
