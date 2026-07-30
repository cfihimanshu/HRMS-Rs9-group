"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, Car, Edit3, Eye, FilePlus2, FileText, History, Loader2, Plus, RotateCcw, Search, Trash2, Upload, UserRound, X } from "lucide-react";

const localNow = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16); };
const emptyVehicle = { registrationNumber: "", ownerName: "", vehicleName: "", vehicleType: "Car", manufacturingYear: "", fuelType: "Petrol", chassisNumber: "", engineNumber: "", purchaseDate: "", purchaseValue: "", odometer: "", ownershipType: "Company Owned", location: "", photoUrl: "", remarks: "" };
const emptyRegistrationDocs = [
  { documentType: "RC", documentNumber: "", issueDate: "", expiryDate: "", fileUrl: "", remarks: "" },
  { documentType: "Insurance", documentNumber: "", issueDate: "", expiryDate: "", fileUrl: "", remarks: "" },
];
const emptyDocument = { documentType: "RC", documentNumber: "", issueDate: "", expiryDate: "", fileUrl: "", remarks: "" };
const emptyAssignment = { toPersonId: "", toPersonName: "", assignedAt: localNow(), purpose: "", odometer: "", handoverProofUrl: "", remarks: "" };
const fmt = (v: string) => v ? new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(v)) : "—";

function Modal({ children, close, wide = false }: any) {
  return <div className="fixed inset-0 z-[120] bg-black/45 p-4 flex items-center justify-center" onMouseDown={close}><div className={`bg-[#FAFAF7] rounded-2xl max-h-[94vh] overflow-y-auto w-full ${wide ? "max-w-5xl" : "max-w-2xl"}`} onMouseDown={e => e.stopPropagation()}>{children}</div></div>;
}
const Input = ({ label, ...p }: any) => <label className="block"><span className="block text-[10px] uppercase tracking-wider font-bold text-[#77736C] mb-1.5">{label}{p.required ? " *" : ""}</span><input {...p} className="w-full border border-[#DDD8D0] rounded-lg bg-white px-3 py-2.5 text-xs outline-none focus:border-[#C9A84C]" /></label>;
const Select = ({ label, children, ...p }: any) => <label className="block"><span className="block text-[10px] uppercase tracking-wider font-bold text-[#77736C] mb-1.5">{label}</span><select {...p} className="w-full border border-[#DDD8D0] rounded-lg bg-white px-3 py-2.5 text-xs outline-none">{children}</select></label>;

export default function VehicleRegistry({ triggerToast }: { triggerToast?: (m: string) => void }) {
  const toastRef = useRef(triggerToast); useEffect(() => { toastRef.current = triggerToast; }, [triggerToast]);
  const notify = useCallback((m: string) => toastRef.current?.(m), []);
  const [vehicles, setVehicles] = useState<any[]>([]), [people, setPeople] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({}), [loading, setLoading] = useState(true), [saving, setSaving] = useState(false);
  const [search, setSearch] = useState(""), [status, setStatus] = useState("All");
  const [vehicleForm, setVehicleForm] = useState<any>(emptyVehicle), [docForm, setDocForm] = useState<any>(emptyDocument), [assignForm, setAssignForm] = useState<any>(emptyAssignment);
  const [registrationDocs, setRegistrationDocs] = useState<any[]>(emptyRegistrationDocs);
  const [modal, setModal] = useState<"vehicle" | "edit" | "document" | "assign" | "return" | null>(null), [selected, setSelected] = useState<any>(null);
  const [viewer, setViewer] = useState<{ url: string; title: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams(); if (search) p.set("search", search); if (status !== "All") p.set("status", status);
      const r = await fetch(`/api/vehicles?${p}`, { cache: "no-store" }); const j = await r.json(); if (!r.ok) throw new Error(j.error);
      setVehicles(j.data || []); setSummary(j.summary || {});
    } catch (e: any) { notify(e.message); } finally { setLoading(false); }
  }, [notify, search, status]);
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [load]);
  useEffect(() => {
    fetch("/api/document-movement/people").then(r => r.json()).then(p => { if (p.success) setPeople(p.data || []); });
  }, []);
  const detail = async (v: any) => { const r = await fetch(`/api/vehicles?id=${v.id}`); const j = await r.json(); if (r.ok) setSelected(j.data); else notify(j.error); };
  const upload = async (file?: File) => {
    if (!file) return ""; const fd = new FormData(); fd.append("file", file); fd.append("purpose", "vehicle-document");
    const r = await fetch("/api/documents/upload", { method: "POST", body: fd }); const j = await r.json(); if (!r.ok) throw new Error(j.error); return j.url;
  };
  const saveVehicle = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      const editing = modal === "edit";
      const payload = editing ? { ...vehicleForm, action: "UPDATE", vehicleId: selected.id } : { ...vehicleForm, documents: registrationDocs.filter(d => d.fileUrl) };
      const r = await fetch("/api/vehicles", { method: editing ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }); const j = await r.json(); if (!r.ok) throw new Error(j.error);
      notify(editing ? "✓ Vehicle updated" : "✓ Vehicle and documents registered"); setModal(null); setVehicleForm(emptyVehicle); setRegistrationDocs(emptyRegistrationDocs); await load(); if (editing) await detail(selected);
    }
    catch (x: any) { notify(x.message); } finally { setSaving(false); }
  };
  const saveDoc = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try { const r = await fetch("/api/vehicles", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...docForm, action: "ADD_DOCUMENT", vehicleId: selected.id }) }); const j = await r.json(); if (!r.ok) throw new Error(j.error); notify("✓ Document added"); setModal(null); setDocForm(emptyDocument); await detail(selected); }
    catch (x: any) { notify(x.message); } finally { setSaving(false); }
  };
  const saveAssignment = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      const action = modal === "return" ? "RETURN" : "ASSIGN";
      const r = await fetch("/api/vehicles", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...assignForm, action, vehicleId: selected.id }) }); const j = await r.json(); if (!r.ok) throw new Error(j.error);
      notify(action === "RETURN" ? "✓ Vehicle returned" : "✓ Vehicle assigned"); setModal(null); setAssignForm(emptyAssignment); await load(); await detail(selected);
    } catch (x: any) { notify(x.message); } finally { setSaving(false); }
  };
  const choosePerson = (name: string) => { const p = people.find(x => x.name === name); setAssignForm((f: any) => ({ ...f, toPersonName: name, toPersonId: p?.id || "" })); };
  const editVehicle = () => {
    setVehicleForm({
      registrationNumber: selected.registrationNumber || "", ownerName: selected.ownerName || "",
      vehicleName: selected.vehicleName || "", vehicleType: selected.vehicleType || "Car",
      manufacturingYear: selected.manufacturingYear || "", fuelType: selected.fuelType || "Petrol",
      chassisNumber: selected.chassisNumber || "", engineNumber: selected.engineNumber || "",
      purchaseDate: selected.purchaseDate || "", purchaseValue: selected.purchaseValue || "",
      odometer: selected.odometer || "", ownershipType: selected.ownershipType || "Company Owned",
      location: selected.location || "", photoUrl: selected.photoUrl || "", remarks: selected.remarks || "",
    });
    setModal("edit");
  };
  const deleteVehicle = async () => {
    if (!window.confirm(`${selected.registrationNumber} ko permanently delete karein? Iske documents aur assignment history bhi remove ho jayegi.`)) return;
    setSaving(true);
    try {
      const r = await fetch(`/api/vehicles?vehicleId=${encodeURIComponent(selected.id)}`, { method: "DELETE" });
      const j = await r.json(); if (!r.ok) throw new Error(j.error);
      notify("✓ Vehicle deleted"); setSelected(null); await load();
    } catch (e: any) { notify(e.message); } finally { setSaving(false); }
  };
  const deleteDocument = async (documentId: string) => {
    if (!window.confirm("Is document ko delete karein?")) return;
    const r = await fetch(`/api/vehicles?documentId=${encodeURIComponent(documentId)}`, { method: "DELETE" });
    const j = await r.json(); if (!r.ok) return notify(j.error || "Document delete failed");
    notify("✓ Document deleted"); await detail(selected);
  };
  const stats = [["Total Vehicles", summary.total || 0], ["Available", summary.available || 0], ["Assigned", summary.assigned || 0], ["Maintenance", summary.maintenance || 0], ["Docs Expiring (30d)", summary.expiringDocuments || 0]];

  return <div className="space-y-5">
    <datalist id="vehicle-people">{people.map(p => <option key={p.id} value={p.name}>{p.employeeId} · {p.department}</option>)}</datalist>
    <div className="flex flex-col md:flex-row justify-between gap-3"><div><h1 className="text-2xl font-serif">Vehicle Registry</h1><p className="text-xs text-[#77736C] mt-1">Company vehicles, documents, expiry and assignment history.</p></div><button onClick={() => setModal("vehicle")} className="bg-[#1C1C1A] text-white rounded-xl px-4 py-2.5 text-xs font-semibold flex items-center gap-2"><Plus className="w-4 h-4" /> Add Vehicle</button></div>
    <div className="grid grid-cols-2 xl:grid-cols-5 gap-3">{stats.map(([l, v]) => <div key={l} className="bg-white border border-[#E8E4DF] rounded-xl p-4"><div className="text-xl font-semibold">{v}</div><div className="text-[9px] uppercase tracking-wider text-[#77736C] mt-1">{l}</div></div>)}</div>
    <div className="bg-white border border-[#E8E4DF] rounded-xl overflow-hidden">
      <div className="p-4 border-b flex gap-3"><div className="relative flex-1"><Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Registration, make, model, assignee..." className="w-full border rounded-lg pl-9 pr-3 py-2 text-xs" /></div><select value={status} onChange={e => setStatus(e.target.value)} className="border rounded-lg px-3 text-xs">{["All", "Available", "Assigned", "Maintenance", "Out of Service", "Sold"].map(x => <option key={x}>{x}</option>)}</select></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left"><thead className="bg-[#F7F4EF] text-[9px] uppercase tracking-wider text-[#77736C]"><tr>{["Number Plate", "Owner Name", "Vehicle Details", "Current Assignee", "Location", "Status", "Action"].map(x => <th key={x} className="px-4 py-3">{x}</th>)}</tr></thead><tbody className="divide-y">
        {loading ? <tr><td colSpan={7} className="py-14 text-center"><Loader2 className="animate-spin mx-auto" /></td></tr> : vehicles.map(v => <tr key={v.id} onClick={() => detail(v)} className="hover:bg-[#FCFAF7] cursor-pointer">
      <td className="px-4 py-3"><div className="font-mono font-bold text-sm">{v.registrationNumber}</div><div className="text-[10px] text-slate-500">{v.vehicleType}</div></td>
          <td className="px-4 py-3 text-xs font-medium">{v.ownerName}</td><td className="px-4 py-3"><div className="text-xs font-semibold">{v.vehicleName}</div><div className="text-[10px] text-slate-500">{v.fuelType || "—"} · {v.manufacturingYear || "—"}</div></td>
          <td className="px-4 py-3 text-xs">{v.currentAssigneeName ? <><div className="font-medium">{v.currentAssigneeName}</div><div className="text-[10px] text-slate-500">{v.currentAssigneeType}</div></> : <span className="text-slate-400">Unassigned</span>}</td>
          <td className="px-4 py-3 text-xs">{v.location || "—"}</td><td className="px-4 py-3"><span className="text-[9px] font-bold rounded-full bg-slate-100 px-2 py-1">{v.status}</span></td>
          <td className="px-4 py-3"><button onClick={e => { e.stopPropagation(); detail(v); }} className="p-2 bg-[#F5F0EA] rounded-lg" title="View all details"><Eye className="w-4 h-4" /></button></td>
        </tr>)}</tbody></table></div>
    </div>

    {(modal === "vehicle" || modal === "edit") && <Modal close={() => setModal(null)} wide><form onSubmit={saveVehicle}><Header title={modal === "edit" ? "Edit Vehicle" : "Register Vehicle"} close={() => setModal(null)} /><div className="p-6 grid md:grid-cols-3 gap-4">
      <Input label="Number Plate / Registration Number" required disabled={modal === "edit"} value={vehicleForm.registrationNumber} onChange={(e: any) => setVehicleForm({ ...vehicleForm, registrationNumber: e.target.value })} placeholder="UP80AB1234" />
      <Input label="Owner Name" required value={vehicleForm.ownerName} onChange={(e: any) => setVehicleForm({ ...vehicleForm, ownerName: e.target.value })} placeholder="Vehicle owner name" />
      <Input label="Name of Vehicle" required value={vehicleForm.vehicleName} onChange={(e: any) => setVehicleForm({ ...vehicleForm, vehicleName: e.target.value })} placeholder="e.g. Office Innova / Director Car" />
      <Select label="Vehicle Type" value={vehicleForm.vehicleType} onChange={(e: any) => setVehicleForm({ ...vehicleForm, vehicleType: e.target.value })}>{["Car", "SUV", "Bike", "Scooter", "Van", "Truck", "Bus", "Tractor", "Other"].map(x => <option key={x}>{x}</option>)}</Select>
      {["chassisNumber", "engineNumber", "location"].map(f => <Input key={f} label={f.replace(/([A-Z])/g, " $1")} value={vehicleForm[f]} onChange={(e: any) => setVehicleForm({ ...vehicleForm, [f]: e.target.value })} />)}
      <Input label="Manufacturing Year" type="number" value={vehicleForm.manufacturingYear} onChange={(e: any) => setVehicleForm({ ...vehicleForm, manufacturingYear: e.target.value })} />
      <Select label="Fuel Type" value={vehicleForm.fuelType} onChange={(e: any) => setVehicleForm({ ...vehicleForm, fuelType: e.target.value })}>{["Petrol", "Diesel", "CNG", "Electric", "Hybrid", "Other"].map(x => <option key={x}>{x}</option>)}</Select>
      <Select label="Ownership" value={vehicleForm.ownershipType} onChange={(e: any) => setVehicleForm({ ...vehicleForm, ownershipType: e.target.value })}>{["Company Owned", "Leased", "Financed", "Rented"].map(x => <option key={x}>{x}</option>)}</Select>
      <Input label="Purchase Date" type="date" value={vehicleForm.purchaseDate} onChange={(e: any) => setVehicleForm({ ...vehicleForm, purchaseDate: e.target.value })} /><Input label="Purchase Value" type="number" value={vehicleForm.purchaseValue} onChange={(e: any) => setVehicleForm({ ...vehicleForm, purchaseValue: e.target.value })} /><Input label="Odometer (KM)" type="number" value={vehicleForm.odometer} onChange={(e: any) => setVehicleForm({ ...vehicleForm, odometer: e.target.value })} />
      <label className="md:col-span-3 border border-dashed border-[#C9A84C] bg-white rounded-xl p-3 text-xs cursor-pointer flex items-center gap-2"><Upload className="w-4 h-4"/>{vehicleForm.photoUrl ? "Vehicle photo uploaded ✓" : "Upload Vehicle Photo"}<input type="file" className="hidden" accept=".jpg,.jpeg,.png,.webp" onChange={async e=>{try{const url=await upload(e.target.files?.[0]);setVehicleForm({...vehicleForm,photoUrl:url});}catch(x:any){notify(x.message)}}}/></label>
      <label className="md:col-span-3 text-xs"><span className="block text-[10px] uppercase font-bold mb-1">Remarks</span><textarea value={vehicleForm.remarks} onChange={e => setVehicleForm({ ...vehicleForm, remarks: e.target.value })} className="w-full border rounded-lg p-3" /></label>
      {modal !== "edit" && <div className="md:col-span-3 border-t pt-5"><h3 className="text-sm font-semibold mb-1">Vehicle Documents</h3><p className="text-[10px] text-slate-500 mb-4">RC aur Insurance abhi upload karein. Renewal documents baad mein bhi add ho sakte hain.</p>
        <div className="grid md:grid-cols-2 gap-3">{registrationDocs.map((doc, index) => <div key={doc.documentType} className="border bg-white rounded-xl p-3">
          <div className="font-semibold text-xs mb-3">{doc.documentType}</div><div className="grid grid-cols-2 gap-2">
            <Input label="Document Number" value={doc.documentNumber} onChange={(e:any)=>setRegistrationDocs(ds=>ds.map((d,i)=>i===index?{...d,documentNumber:e.target.value}:d))}/>
            <Input label="Expiry Date" type="date" value={doc.expiryDate} onChange={(e:any)=>setRegistrationDocs(ds=>ds.map((d,i)=>i===index?{...d,expiryDate:e.target.value}:d))}/>
          </div><label className="mt-3 border border-dashed border-[#C9A84C] rounded-lg p-2 text-[10px] cursor-pointer flex items-center gap-2"><Upload className="w-3.5 h-3.5"/>{doc.fileUrl ? `${doc.documentType} uploaded ✓` : `Upload ${doc.documentType}`}<input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.webp" onChange={async e=>{try{const url=await upload(e.target.files?.[0]);setRegistrationDocs(ds=>ds.map((d,i)=>i===index?{...d,fileUrl:url}:d));}catch(x:any){notify(x.message)}}}/></label>
        </div>)}</div>
      </div>}
    </div><Footer saving={saving} text={modal === "edit" ? "Save Changes" : "Register Vehicle"} close={() => setModal(null)} /></form></Modal>}

    {selected && !modal && <Modal close={() => setSelected(null)} wide><Header title={`${selected.registrationNumber} — ${selected.vehicleName}`} close={() => setSelected(null)} /><div className="p-6">
      {selected.photoUrl && <button onClick={() => setViewer({ url: selected.photoUrl, title: "Vehicle Photo" })} className="w-full mb-5 relative group"><img src={selected.photoUrl} alt={selected.vehicleName} className="w-full max-h-64 object-contain bg-white border rounded-xl" /><span className="absolute bottom-3 right-3 bg-black/70 text-white rounded-lg px-3 py-1.5 text-xs">View Full Image</span></button>}
      <div className="grid md:grid-cols-4 gap-3 mb-5">{[["Owner", selected.ownerName], ["Vehicle Name", selected.vehicleName], ["Assignee", selected.currentAssigneeName || "Unassigned"], ["Odometer", `${selected.odometer || 0} KM`]].map(([a,b]) => <div key={a} className="border bg-white rounded-xl p-3"><div className="text-[9px] uppercase text-slate-500">{a}</div><div className="text-xs font-semibold mt-1">{b}</div></div>)}</div>
      <h3 className="text-xs font-bold uppercase tracking-wider mb-3">Complete Vehicle Information</h3>
      <div className="grid md:grid-cols-3 gap-3 mb-6">{[
        ["Number Plate", selected.registrationNumber], ["Vehicle Type", selected.vehicleType],
        ["Chassis Number", selected.chassisNumber], ["Engine Number", selected.engineNumber],
        ["Manufacturing Year", selected.manufacturingYear], ["Fuel Type", selected.fuelType],
        ["Ownership", selected.ownershipType], ["Purchase Date", fmt(selected.purchaseDate)],
        ["Purchase Value", selected.purchaseValue ? `₹${Number(selected.purchaseValue).toLocaleString("en-IN")}` : "—"],
        ["Current Location", selected.location], ["Status", selected.status],
        ["Assigned Since", selected.assignedAt ? fmt(selected.assignedAt) : "—"],
      ].map(([label, value]) => <div key={label} className="border bg-white rounded-xl p-3"><div className="text-[9px] uppercase text-slate-500">{label}</div><div className="text-xs font-medium mt-1 break-words">{value || "—"}</div></div>)}</div>
      {selected.remarks && <div className="rounded-xl bg-amber-50 border border-amber-100 p-3 mb-6"><div className="text-[9px] uppercase font-bold text-amber-700">Remarks</div><div className="text-xs mt-1">{selected.remarks}</div></div>}
      <div className="flex flex-wrap gap-2 mb-6"><button onClick={() => setModal("document")} className="border rounded-lg px-3 py-2 text-xs flex gap-1"><FilePlus2 className="w-4 h-4" /> Add Document</button><button onClick={() => { setAssignForm({ ...emptyAssignment, odometer: selected.odometer || "" }); setModal("assign"); }} className="bg-blue-600 text-white rounded-lg px-3 py-2 text-xs flex gap-1"><UserRound className="w-4 h-4" /> {selected.currentAssigneeName ? "Transfer" : "Assign"}</button>{selected.currentAssigneeName && <button onClick={() => { setAssignForm({ ...emptyAssignment, odometer: selected.odometer || "" }); setModal("return"); }} className="bg-amber-500 text-white rounded-lg px-3 py-2 text-xs flex gap-1"><RotateCcw className="w-4 h-4" /> Return</button>}<button onClick={editVehicle} className="border rounded-lg px-3 py-2 text-xs flex gap-1"><Edit3 className="w-4 h-4" /> Edit</button><button onClick={deleteVehicle} disabled={saving} className="border border-rose-200 text-rose-700 rounded-lg px-3 py-2 text-xs flex gap-1"><Trash2 className="w-4 h-4" /> Delete</button></div>
      <h3 className="text-xs font-bold uppercase tracking-wider mb-3">Documents & Images</h3><div className="grid md:grid-cols-2 gap-3 mb-6">{selected.documents?.length ? selected.documents.map((d: any) => <div key={d.id} className="border bg-white rounded-xl p-3 flex justify-between items-center"><button onClick={() => setViewer({ url: d.fileUrl, title: `${d.documentType} — ${d.documentNumber || selected.registrationNumber}` })} className="flex-1 text-left"><div className="text-xs font-semibold">{d.documentType}</div><div className="text-[10px] text-slate-500">{d.documentNumber || "No number"} · Expiry {fmt(d.expiryDate)}</div><div className="text-[10px] text-blue-600 mt-1 flex items-center gap-1"><Eye className="w-3 h-3"/> View document</div></button><button onClick={() => deleteDocument(d.id)} className="p-2 text-rose-600 bg-rose-50 rounded-lg" title="Delete document"><Trash2 className="w-3.5 h-3.5"/></button></div>) : <div className="text-xs text-slate-400">No documents uploaded.</div>}</div>
      <h3 className="text-xs font-bold uppercase tracking-wider mb-3">Assignment History</h3><div className="space-y-2">{selected.assignments?.length ? selected.assignments.map((a: any) => <div key={a.id} className="border bg-white rounded-xl p-3 text-xs"><b>{a.action}</b> · {a.fromPersonName || "Company"} → {a.toPersonName || "Company"} <span className="text-slate-500">({fmt(a.returnedAt || a.assignedAt)})</span></div>) : <div className="text-xs text-slate-400">Not assigned yet.</div>}</div>
    </div></Modal>}

    {modal === "document" && selected && <Modal close={() => setModal(null)}><form onSubmit={saveDoc}><Header title="Upload Vehicle Document" close={() => setModal(null)} /><div className="p-6 grid md:grid-cols-2 gap-4"><Select label="Document Type" value={docForm.documentType} onChange={(e:any) => setDocForm({...docForm, documentType:e.target.value})}>{["RC", "Insurance", "Permit", "Tax Receipt", "Invoice", "Loan/Hypothecation", "Service Record", "Other"].map(x=><option key={x}>{x}</option>)}</Select><Input label="Document Number" value={docForm.documentNumber} onChange={(e:any)=>setDocForm({...docForm,documentNumber:e.target.value})}/><Input label="Issue Date" type="date" value={docForm.issueDate} onChange={(e:any)=>setDocForm({...docForm,issueDate:e.target.value})}/><Input label="Expiry Date" type="date" value={docForm.expiryDate} onChange={(e:any)=>setDocForm({...docForm,expiryDate:e.target.value})}/><label className="md:col-span-2 border border-dashed border-[#C9A84C] rounded-lg p-3 text-xs cursor-pointer flex gap-2"><Upload className="w-4 h-4"/>{docForm.fileUrl ? "File uploaded ✓" : "Select document file *"}<input className="hidden" type="file" required={!docForm.fileUrl} onChange={async e=>{try{const u=await upload(e.target.files?.[0]);setDocForm({...docForm,fileUrl:u});}catch(x:any){notify(x.message)}}}/></label></div><Footer saving={saving} text="Save Document" close={()=>setModal(null)}/></form></Modal>}

    {(modal === "assign" || modal === "return") && selected && <Modal close={() => setModal(null)}><form onSubmit={saveAssignment}><Header title={modal === "return" ? "Return Vehicle" : selected.currentAssigneeName ? "Transfer Vehicle" : "Assign Vehicle"} close={() => setModal(null)} /><div className="p-6 grid md:grid-cols-2 gap-4">
      {modal === "assign" && <><Input label="Employee or Manual Person Name" required list="vehicle-people" value={assignForm.toPersonName} onChange={(e:any)=>choosePerson(e.target.value)} placeholder="Select employee or type external name"/><Input label="Purpose" value={assignForm.purpose} onChange={(e:any)=>setAssignForm({...assignForm,purpose:e.target.value})}/><Input label="Assignment Date" type="datetime-local" value={assignForm.assignedAt} onChange={(e:any)=>setAssignForm({...assignForm,assignedAt:e.target.value})}/></>}
      <Input label="Odometer (KM)" type="number" value={assignForm.odometer} onChange={(e:any)=>setAssignForm({...assignForm,odometer:e.target.value})}/><Input label="Remarks" value={assignForm.remarks} onChange={(e:any)=>setAssignForm({...assignForm,remarks:e.target.value})}/>
    </div><Footer saving={saving} text={modal === "return" ? "Confirm Return" : "Confirm Assignment"} close={()=>setModal(null)}/></form></Modal>}
    {viewer && <Modal close={() => setViewer(null)} wide><Header title={viewer.title} close={() => setViewer(null)} /><div className="p-4 bg-slate-100 min-h-[60vh] flex items-center justify-center">
      {/\.(jpe?g|png|webp|gif)(\?|$)/i.test(viewer.url) ? <img src={viewer.url} alt={viewer.title} className="max-w-full max-h-[75vh] object-contain" /> : <iframe src={viewer.url} title={viewer.title} className="w-full h-[75vh] bg-white rounded-lg" />}
    </div><div className="border-t p-3 flex justify-end"><a href={viewer.url} target="_blank" rel="noreferrer" className="border rounded-lg px-4 py-2 text-xs">Open in New Tab</a></div></Modal>}
  </div>;
}

function Header({ title, close }: any) { return <div className="sticky top-0 bg-[#FAFAF7] z-10 border-b px-6 py-4 flex justify-between"><h2 className="text-xl font-serif">{title}</h2><button type="button" onClick={close}><X className="w-5 h-5"/></button></div>; }
function Footer({ saving, text, close }: any) { return <div className="border-t px-6 py-4 flex justify-end gap-2"><button type="button" onClick={close} className="border rounded-lg px-4 py-2 text-xs">Cancel</button><button disabled={saving} className="bg-[#1C1C1A] text-white rounded-lg px-5 py-2 text-xs disabled:opacity-50">{saving ? "Saving..." : text}</button></div>; }
