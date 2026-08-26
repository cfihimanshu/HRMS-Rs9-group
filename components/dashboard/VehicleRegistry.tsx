"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, Car, CheckCircle2, Edit3, Eye, FilePlus2, FileText, History, Loader2, Paperclip, Plus, RotateCcw, Search, Tag, Trash2, Upload, UserRound, X } from "lucide-react";

const localNow = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16); };
const emptyVehicle = { registrationNumber: "", ownerName: "", vehicleName: "", vehicleType: "Car", manufacturingYear: "", fuelType: "Petrol", chassisNumber: "", engineNumber: "", purchaseDate: "", purchaseValue: "", odometer: "", ownershipType: "Company Owned", location: "", photoUrl: "", remarks: "" };
const emptyRegistrationDocs = [
  { documentType: "RC", documentNumber: "", issueDate: "", expiryDate: "", fileUrl: "", remarks: "" },
  { documentType: "Insurance", documentNumber: "", issueDate: "", expiryDate: "", fileUrl: "", remarks: "" },
];
const emptyDocument = { documentType: "RC", documentNumber: "", issueDate: "", expiryDate: "", fileUrl: "", remarks: "" };
const emptyAssignment = { toPersonId: "", toPersonName: "", assignedAt: localNow(), purpose: "", odometer: "", handoverProofUrl: "", remarks: "" };
const emptySale = {
  buyerName: "",
  buyerContact: "",
  buyerAddress: "",
  saleDate: new Date().toISOString().slice(0, 10),
  saleAmount: "",
  paymentType: "Full Payment",
  paymentMode: "Cash",
  paymentModeOther: "",
  paymentReference: "",
  paymentInstallments: [
    { installmentNo: 1, amount: "", date: new Date().toISOString().slice(0, 10), paymentMode: "Cash", paymentReference: "", status: "Received" }
  ],
  rcTransferStatus: "Pending",
  saleWitness: "",
  buyerIdProofType: "Aadhaar Card",
  buyerIdProofTypeOther: "",
  buyerIdProofNumber: "",
  buyerIdProofUrl: "",
  saleRemarks: "",
  handoverDate: new Date().toISOString().slice(0, 10),
  handoverLocation: "",
  handoverBy: "",
  receivedBy: "",
  rcHandedOver: "No",
  insuranceHandedOver: "No",
};

const fmt = (v: string) => v ? new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(v)) : "—";

const getPaymentRefLabelAndPlaceholder = (mode: string) => {
  if (mode === "Cheque") {
    return { label: "Cheque No. & Bank Name", placeholder: "e.g. Cheque #458912 - HDFC Bank" };
  }
  if (mode === "Bank Transfer / NEFT / RTGS") {
    return { label: "UTR No. / Transaction Ref", placeholder: "e.g. UTR9876543210" };
  }
  if (mode === "UPI / Online") {
    return { label: "Transaction ID / UPI Reference", placeholder: "e.g. UPI/6543219870" };
  }
  if (mode === "Other") {
    return { label: "Reference / Receipt No.", placeholder: "e.g. Agreement Ref / Receipt #102" };
  }
  return { label: "Cash Receipt / Voucher No. (Optional)", placeholder: "e.g. Receipt #402" };
};

function Modal({ children, close, wide = false }: any) {
  return <div className="fixed inset-0 z-[120] bg-black/45 p-4 flex items-center justify-center" onMouseDown={close}><div className={`bg-[#FAFAF7] rounded-2xl max-h-[94vh] overflow-y-auto w-full ${wide ? "max-w-5xl" : "max-w-2xl"}`} onMouseDown={e => e.stopPropagation()}>{children}</div></div>;
}
const Input = ({ label, value, ...p }: any) => <label className="block"><span className="block text-[10px] uppercase tracking-wider font-bold text-[#77736C] mb-1.5">{label}{p.required ? " *" : ""}</span><input {...p} value={value ?? ""} className="w-full border border-[#DDD8D0] rounded-lg bg-white px-3 py-2.5 text-xs outline-none focus:border-[#C9A84C]" /></label>;
const Select = ({ label, children, value, ...p }: any) => <label className="block"><span className="block text-[10px] uppercase tracking-wider font-bold text-[#77736C] mb-1.5">{label}</span><select {...p} value={value ?? ""} className="w-full border border-[#DDD8D0] rounded-lg bg-white px-3 py-2.5 text-xs outline-none">{children}</select></label>;

export default function VehicleRegistry({ triggerToast }: { triggerToast?: (m: string) => void }) {
  const toastRef = useRef(triggerToast); useEffect(() => { toastRef.current = triggerToast; }, [triggerToast]);
  const notify = useCallback((m: string) => toastRef.current?.(m), []);
  const [vehicles, setVehicles] = useState<any[]>([]), [people, setPeople] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({}), [loading, setLoading] = useState(true), [saving, setSaving] = useState(false);
  const [search, setSearch] = useState(""), [status, setStatus] = useState("All");
  const [vehicleForm, setVehicleForm] = useState<any>(emptyVehicle), [docForm, setDocForm] = useState<any>(emptyDocument), [assignForm, setAssignForm] = useState<any>(emptyAssignment), [saleForm, setSaleForm] = useState<any>(emptySale);
  const [registrationDocs, setRegistrationDocs] = useState<any[]>(emptyRegistrationDocs);
  const [modal, setModal] = useState<"vehicle" | "edit" | "document" | "assign" | "return" | "sale" | null>(null), [selected, setSelected] = useState<any>(null);
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
    fetch("/api/vehicles/people").then(r => r.json()).then(p => { if (p.success) setPeople(p.data || []); });
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
  const saveSale = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      const payload = {
        ...saleForm,
        action: "SALE",
        vehicleId: selected.id,
        isInstallmentSale: saleForm.paymentType === "Installments",
        paymentInstallments: saleForm.paymentInstallments,
      };
      const r = await fetch("/api/vehicles", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      notify("✓ Vehicle marked as Sold with buyer details, installments & handover details recorded");
      setModal(null);
      setSaleForm(emptySale);
      await load();
      await detail(selected);
    } catch (x: any) {
      notify(x.message);
    } finally {
      setSaving(false);
    }
  };

  const openSaleModal = (v: any) => {
    let parsedInstallments = [
      { installmentNo: 1, amount: v.saleAmount || "", date: v.saleDate || new Date().toISOString().slice(0, 10), paymentMode: v.paymentMode || "Cash", paymentReference: v.paymentReference || "", status: "Received" }
    ];
    if (v.paymentInstallments) {
      try {
        const arr = typeof v.paymentInstallments === "string" ? JSON.parse(v.paymentInstallments) : v.paymentInstallments;
        if (Array.isArray(arr) && arr.length > 0) parsedInstallments = arr;
      } catch (e) {
        console.warn("Error parsing paymentInstallments", e);
      }
    }

    const isInst = v.isInstallmentSale || parsedInstallments.length > 1;

    setSaleForm({
      buyerName: v.buyerName || "",
      buyerContact: v.buyerContact || "",
      buyerAddress: v.buyerAddress || "",
      saleDate: v.saleDate || new Date().toISOString().slice(0, 10),
      saleAmount: v.saleAmount || "",
      paymentType: isInst ? "Installments" : "Full Payment",
      paymentMode: v.paymentMode || "Cash",
      paymentModeOther: v.paymentModeOther || "",
      paymentReference: v.paymentReference || "",
      paymentInstallments: parsedInstallments,
      rcTransferStatus: v.rcTransferStatus || "Pending",
      saleWitness: v.saleWitness || "",
      buyerIdProofType: v.buyerIdProofType || "Aadhaar Card",
      buyerIdProofTypeOther: v.buyerIdProofTypeOther || "",
      buyerIdProofNumber: v.buyerIdProofNumber || "",
      buyerIdProofUrl: v.buyerIdProofUrl || "",
      saleRemarks: v.saleRemarks || "",
      handoverDate: v.handoverDate || v.saleDate || new Date().toISOString().slice(0, 10),
      handoverLocation: v.handoverLocation || v.location || "",
      handoverBy: v.handoverBy || v.saleWitness || "",
      receivedBy: v.receivedBy || v.buyerName || "",
      rcHandedOver: v.rcHandedOver || "No",
      insuranceHandedOver: v.insuranceHandedOver || "No",
    });
    setModal("sale");
  };

  const addInstallment = () => {
    setSaleForm((f: any) => {
      const currentList = Array.isArray(f.paymentInstallments) ? f.paymentInstallments : [];
      return {
        ...f,
        paymentInstallments: [
          ...currentList,
          {
            installmentNo: currentList.length + 1,
            amount: "",
            date: new Date().toISOString().slice(0, 10),
            paymentMode: "Cash",
            paymentReference: "",
            status: "Pending",
          },
        ],
      };
    });
  };

  const removeInstallment = (idx: number) => {
    setSaleForm((f: any) => ({
      ...f,
      paymentInstallments: (f.paymentInstallments || []).filter((_: any, i: number) => i !== idx).map((inst: any, newIdx: number) => ({ ...inst, installmentNo: newIdx + 1 })),
    }));
  };

  const updateInstallment = (idx: number, field: string, value: any) => {
    setSaleForm((f: any) => ({
      ...f,
      paymentInstallments: (f.paymentInstallments || []).map((inst: any, i: number) => i === idx ? { ...inst, [field]: value } : inst),
    }));
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
    if (!window.confirm(`Permanently delete ${selected.registrationNumber}? Its documents and assignment history will also be removed.`)) return;
    setSaving(true);
    try {
      const r = await fetch(`/api/vehicles?vehicleId=${encodeURIComponent(selected.id)}`, { method: "DELETE" });
      const j = await r.json(); if (!r.ok) throw new Error(j.error);
      notify("✓ Vehicle deleted"); setSelected(null); await load();
    } catch (e: any) { notify(e.message); } finally { setSaving(false); }
  };
  const deleteDocument = async (documentId: string) => {
    if (!window.confirm("Delete this document?")) return;
    const r = await fetch(`/api/vehicles?documentId=${encodeURIComponent(documentId)}`, { method: "DELETE" });
    const j = await r.json(); if (!r.ok) return notify(j.error || "Document delete failed");
    notify("✓ Document deleted"); await detail(selected);
  };
  const stats = [
    { label: "Total Vehicles", value: summary.total || 0, key: "All" },
    { label: "Available", value: summary.available || 0, key: "Available" },
    { label: "Assigned", value: summary.assigned || 0, key: "Assigned" },
    { label: "Maintenance", value: summary.maintenance || 0, key: "Maintenance" },
    { label: "Sold", value: summary.sold || 0, key: "Sold" },
    { label: "Docs Expiring (30d)", value: summary.expiringDocuments || 0, key: "Docs Expiring (30d)" },
  ];

  return <div className="space-y-5">
    <datalist id="vehicle-people">{people.map(p => <option key={p.id} value={p.name}>{p.employeeId} · {p.department}</option>)}</datalist>
    <div className="flex flex-col md:flex-row justify-between gap-3"><div><h1 className="text-2xl font-serif">Vehicle Registry</h1><p className="text-xs text-[#77736C] mt-1">Company vehicles, documents, expiry and assignment history.</p></div><button onClick={() => setModal("vehicle")} className="bg-[#1C1C1A] text-white rounded-xl px-4 py-2.5 text-xs font-semibold flex items-center gap-2"><Plus className="w-4 h-4" /> Add Vehicle</button></div>
    <div className="grid grid-cols-2 xl:grid-cols-6 gap-3">
      {stats.map(({ label, value, key }) => {
        const isActive = status === key;
        const activeStyles: Record<string, string> = {
          "All": "bg-[#F9F5EA] text-[#4A3C17] border-[#C9A84C] ring-2 ring-[#C9A84C]/40 shadow-sm scale-[1.02]",
          "Available": "bg-emerald-50 text-emerald-900 border-emerald-400 ring-2 ring-emerald-400/40 shadow-sm scale-[1.02]",
          "Assigned": "bg-blue-50 text-blue-900 border-blue-400 ring-2 ring-blue-400/40 shadow-sm scale-[1.02]",
          "Maintenance": "bg-rose-50 text-rose-900 border-rose-400 ring-2 ring-rose-400/40 shadow-sm scale-[1.02]",
          "Sold": "bg-amber-100/80 text-amber-950 border-amber-400 ring-2 ring-amber-400/40 shadow-sm scale-[1.02]",
          "Docs Expiring (30d)": "bg-orange-50 text-orange-950 border-orange-400 ring-2 ring-orange-400/40 shadow-sm scale-[1.02]",
        };
        return (
          <button
            key={label}
            type="button"
            onClick={() => setStatus(isActive && key !== "All" ? "All" : key)}
            className={`text-left rounded-xl p-4 transition-all border cursor-pointer select-none ${
              isActive
                ? activeStyles[key] || "bg-[#F9F5EA] text-[#4A3C17] border-[#C9A84C] ring-2 ring-[#C9A84C]/40 shadow-sm scale-[1.02]"
                : "bg-white text-slate-800 border-[#E8E4DF] hover:border-[#C9A84C] hover:shadow-xs hover:-translate-y-0.5"
            }`}
          >
            <div className="text-xl font-bold">{value}</div>
            <div className={`text-[9px] uppercase tracking-wider mt-1 font-semibold ${isActive ? "opacity-90" : "text-[#77736C]"}`}>{label}</div>
          </button>
        );
      })}
    </div>
    <div className="bg-white border border-[#E8E4DF] rounded-xl overflow-hidden">
      <div className="p-4 border-b flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]"><Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Registration, make, model, assignee, buyer..." className="w-full border rounded-lg pl-9 pr-3 py-2 text-xs" /></div>
        <div className="flex items-center gap-2">
          <select value={status} onChange={e => setStatus(e.target.value)} className="border rounded-lg px-3 py-2 text-xs bg-white">{["All", "Available", "Assigned", "Maintenance", "Out of Service", "Sold", "Docs Expiring (30d)"].map(x => <option key={x} value={x}>{x}</option>)}</select>
          {status !== "All" && (
            <button
              onClick={() => setStatus("All")}
              className="text-[10px] bg-amber-100 text-amber-900 border border-amber-300 rounded-lg px-2.5 py-1.5 font-bold flex items-center gap-1 hover:bg-amber-200 transition-colors"
              title="Clear status filter"
            >
              <span>Filter: {status}</span>
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
      <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left"><thead className="bg-[#F7F4EF] text-[9px] uppercase tracking-wider text-[#77736C]"><tr>{["Number Plate", "Owner Name", "Vehicle Details", "Current Assignee / Buyer", "Location", "Status", "Action"].map(x => <th key={x} className="px-4 py-3">{x}</th>)}</tr></thead><tbody className="divide-y">
        {loading ? <tr><td colSpan={7} className="py-14 text-center"><Loader2 className="animate-spin mx-auto" /></td></tr> : vehicles.map(v => <tr key={v.id} onClick={() => detail(v)} className="hover:bg-[#FCFAF7] cursor-pointer">
      <td className="px-4 py-3"><div className="font-mono font-bold text-sm">{v.registrationNumber}</div><div className="text-[10px] text-slate-500">{v.vehicleType}</div></td>
          <td className="px-4 py-3 text-xs font-medium">{v.ownerName}</td><td className="px-4 py-3"><div className="text-xs font-semibold">{v.vehicleName}</div><div className="text-[10px] text-slate-500">{v.fuelType || "—"} · {v.manufacturingYear || "—"}</div></td>
          <td className="px-4 py-3 text-xs">
            {v.status === "Sold" ? (
              <div>
                <div className="font-bold text-amber-900">Sold to: {v.buyerName || "—"}</div>
                <div className="text-[10px] text-slate-500">{v.saleAmount ? `₹${Number(v.saleAmount).toLocaleString("en-IN")}` : ""} · {fmt(v.saleDate)}</div>
              </div>
            ) : v.currentAssigneeName ? (
              <><div className="font-medium">{v.currentAssigneeName}</div><div className="text-[10px] text-slate-500">{v.currentAssigneeType}</div></>
            ) : <span className="text-slate-400">Unassigned</span>}
          </td>
          <td className="px-4 py-3 text-xs">{v.location || "—"}</td>
          <td className="px-4 py-3">
            <span className={`text-[9px] font-bold rounded-full px-2.5 py-1 ${
              v.status === "Sold" ? "bg-amber-100 text-amber-900 border border-amber-300 font-extrabold" :
              v.status === "Available" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
              v.status === "Assigned" ? "bg-blue-50 text-blue-700 border border-blue-200" :
              v.status === "Maintenance" ? "bg-rose-50 text-rose-700 border border-rose-200" :
              "bg-slate-100 text-slate-700"
            }`}>
              {v.status}
            </span>
          </td>
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
      <label className="md:col-span-3 text-xs"><span className="block text-[10px] uppercase font-bold mb-1">Remarks</span><textarea value={vehicleForm.remarks ?? ""} onChange={e => setVehicleForm({ ...vehicleForm, remarks: e.target.value })} className="w-full border rounded-lg p-3" /></label>
      {modal !== "edit" && <div className="md:col-span-3 border-t pt-5"><h3 className="text-sm font-semibold mb-1">Vehicle Documents</h3><p className="text-[10px] text-slate-500 mb-4">Upload the registration certificate and insurance now. Renewal documents can be added later.</p>
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
      <div className="grid md:grid-cols-4 gap-3 mb-5">{[["Owner", selected.ownerName], ["Vehicle Name", selected.vehicleName], ["Assignee / Status", selected.status === "Sold" ? `Sold to ${selected.buyerName || "Buyer"}` : (selected.currentAssigneeName || "Unassigned")], ["Odometer", `${selected.odometer || 0} KM`]].map(([a,b]) => <div key={a} className="border bg-white rounded-xl p-3"><div className="text-[9px] uppercase text-slate-500">{a}</div><div className="text-xs font-semibold mt-1">{b}</div></div>)}</div>
      
      {(selected.status === "Sold" || selected.buyerName || selected.saleAmount) && (
        <div className="rounded-2xl bg-amber-50/70 border border-amber-200 p-5 mb-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-amber-200/80 pb-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-amber-950 flex items-center gap-2">
              <Tag className="w-4 h-4 text-amber-700" /> Vehicle Sale Record &amp; Buyer Details
            </h4>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => openSaleModal(selected)}
                className="px-2.5 py-1 bg-amber-700 hover:bg-amber-800 text-white text-[10px] font-bold rounded-lg flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
              >
                <Edit3 className="w-3 h-3" /> Edit Sale Record
              </button>
              <span className="px-3 py-0.5 bg-amber-200/80 text-amber-900 text-[10px] font-extrabold rounded-full uppercase border border-amber-300">
                Vehicle Sold
              </span>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-3 text-xs">
            <div className="bg-white/90 border border-amber-100 rounded-xl p-3">
              <span className="text-[9px] uppercase font-bold text-slate-500 block mb-0.5">Buyer Name</span>
              <strong className="text-slate-900 font-bold">{selected.buyerName || "—"}</strong>
            </div>
            <div className="bg-white/90 border border-amber-100 rounded-xl p-3">
              <span className="text-[9px] uppercase font-bold text-slate-500 block mb-0.5">Buyer Contact</span>
              <span className="font-semibold text-slate-800">{selected.buyerContact || "—"}</span>
            </div>
            <div className="bg-white/90 border border-amber-100 rounded-xl p-3">
              <span className="text-[9px] uppercase font-bold text-slate-500 block mb-0.5">Buyer Address</span>
              <span className="font-semibold text-slate-800">{selected.buyerAddress || "—"}</span>
            </div>

            <div className="bg-white/90 border border-amber-100 rounded-xl p-3">
              <span className="text-[9px] uppercase font-bold text-slate-500 block mb-0.5">Sale Date</span>
              <strong className="text-slate-900 font-bold">{fmt(selected.saleDate)}</strong>
            </div>
            <div className="bg-white/90 border border-amber-100 rounded-xl p-3">
              <span className="text-[9px] uppercase font-bold text-emerald-700 block mb-0.5">Total Sale Amount</span>
              <strong className="text-emerald-700 font-black text-sm">
                {selected.saleAmount ? `₹${Number(selected.saleAmount).toLocaleString("en-IN")}` : "—"}
              </strong>
            </div>
            <div className="bg-white/90 border border-amber-100 rounded-xl p-3">
              <span className="text-[9px] uppercase font-bold text-slate-500 block mb-0.5">Payment Structure</span>
              <div className="font-bold text-slate-800">
                {selected.isInstallmentSale ? "Payment in Installments" : (selected.paymentMode === "Other" ? (selected.paymentModeOther || "Other") : (selected.paymentMode || "Full Payment"))}
              </div>
              {!selected.isInstallmentSale && selected.paymentReference && (
                <div className="text-[10px] text-amber-900 font-mono font-semibold mt-0.5 break-words">
                  Ref: {selected.paymentReference}
                </div>
              )}
            </div>

            <div className="bg-white/90 border border-amber-100 rounded-xl p-3">
              <span className="text-[9px] uppercase font-bold text-slate-500 block mb-0.5">RC Transfer Status</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${selected.rcTransferStatus === "Transferred" || selected.rcTransferStatus === "Completed / Transferred" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-900"}`}>
                {selected.rcTransferStatus || "Pending"}
              </span>
            </div>

            <div className="bg-white/90 border border-amber-100 rounded-xl p-3">
              <span className="text-[9px] uppercase font-bold text-slate-500 block mb-0.5">Sales Executed By</span>
              <span className="font-semibold text-slate-800">{selected.saleWitness || "—"}</span>
            </div>

            <div className="bg-white/90 border border-amber-100 rounded-xl p-3 md:col-span-2">
              <span className="text-[9px] uppercase font-bold text-slate-500 block mb-0.5">Buyer ID Proof &amp; Deed</span>
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-slate-800">
                  {selected.buyerIdProofType === "Other" ? (selected.buyerIdProofTypeOther || "Other Document") : (selected.buyerIdProofType || "ID Proof")} {selected.buyerIdProofNumber ? `(${selected.buyerIdProofNumber})` : ""}
                </span>
                {selected.buyerIdProofUrl ? (
                  <button
                    type="button"
                    onClick={() => setViewer({ url: selected.buyerIdProofUrl, title: `Buyer ID Proof — ${selected.buyerName || selected.registrationNumber}` })}
                    className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-bold rounded-lg inline-flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Paperclip className="w-3 h-3" /> View ID Proof Document
                  </button>
                ) : (
                  <span className="text-slate-400 text-[10px] italic">No document attached</span>
                )}
              </div>
            </div>
          </div>

          {/* Vehicle Handover Details Sub-Card */}
          <div className="bg-white/90 border border-amber-200/80 rounded-xl p-4 space-y-3">
            <h5 className="text-xs font-bold uppercase tracking-wider text-amber-900 border-b pb-2 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-amber-700" /> Vehicle Handover &amp; Document Delivery Details
            </h5>
            <div className="grid md:grid-cols-3 gap-3 text-xs">
              <div><span className="text-[9px] uppercase font-bold text-slate-500 block">Handover Date</span><strong className="text-slate-800">{fmt(selected.handoverDate || selected.saleDate)}</strong></div>
              <div><span className="text-[9px] uppercase font-bold text-slate-500 block">Handover Location</span><span className="font-semibold text-slate-800">{selected.handoverLocation || "—"}</span></div>
              <div><span className="text-[9px] uppercase font-bold text-slate-500 block">Handover By (Staff)</span><span className="font-semibold text-slate-800">{selected.handoverBy || "—"}</span></div>
              <div><span className="text-[9px] uppercase font-bold text-slate-500 block">Received By (Purchaser)</span><span className="font-semibold text-slate-800">{selected.receivedBy || "—"}</span></div>
              <div>
                <span className="text-[9px] uppercase font-bold text-slate-500 block mb-0.5">RC Handed Over</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${selected.rcHandedOver === "Yes" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-900"}`}>
                  {selected.rcHandedOver || "No"}
                </span>
              </div>
              <div>
                <span className="text-[9px] uppercase font-bold text-slate-500 block mb-0.5">Insurance Docs Handed Over</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${selected.insuranceHandedOver === "Yes" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-900"}`}>
                  {selected.insuranceHandedOver || "No"}
                </span>
              </div>
            </div>
          </div>

          {/* Payment Installments Breakdown Table if Installment Sale */}
          {(() => {
            let instList: any[] = [];
            if (selected.paymentInstallments) {
              try {
                instList = typeof selected.paymentInstallments === "string" ? JSON.parse(selected.paymentInstallments) : selected.paymentInstallments;
              } catch (e) { console.warn(e); }
            }
            if (!Array.isArray(instList) || instList.length === 0) return null;

            const totalInstReceived = instList.filter(i => i.status === "Received").reduce((acc, i) => acc + (Number(i.amount) || 0), 0);
            const totalSaleAmt = Number(selected.saleAmount) || 0;
            const totalPending = Math.max(0, totalSaleAmt - totalInstReceived);

            return (
              <div className="bg-white/90 border border-amber-200/80 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between border-b pb-2">
                  <h5 className="text-xs font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-amber-700" /> Payment Installments Schedule &amp; Log
                  </h5>
                  <div className="flex gap-3 text-xs font-bold">
                    <span className="text-emerald-700">Received: ₹{totalInstReceived.toLocaleString("en-IN")}</span>
                    {totalPending > 0 ? (
                      <span className="text-amber-800">Pending: ₹{totalPending.toLocaleString("en-IN")}</span>
                    ) : (
                      <span className="text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded text-[10px]">Fully Paid ✓</span>
                    )}
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 text-[9px] uppercase text-slate-500">
                      <tr>
                        <th className="p-2">#</th>
                        <th className="p-2">Amount (₹)</th>
                        <th className="p-2">Due / Date</th>
                        <th className="p-2">Payment Mode</th>
                        <th className="p-2">Ref / Voucher</th>
                        <th className="p-2">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {instList.map((inst: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="p-2 font-bold text-slate-700">Installment {inst.installmentNo || idx + 1}</td>
                          <td className="p-2 font-bold text-slate-900">₹{Number(inst.amount || 0).toLocaleString("en-IN")}</td>
                          <td className="p-2 text-slate-600">{fmt(inst.date)}</td>
                          <td className="p-2 text-slate-700 font-semibold">{inst.paymentMode || "Cash"}</td>
                          <td className="p-2 font-mono text-[10px] text-slate-600">{inst.paymentReference || "—"}</td>
                          <td className="p-2">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${inst.status === "Received" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-900"}`}>
                              {inst.status || "Received"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}

          {selected.saleRemarks && (
            <div className="bg-white/80 border border-amber-100 rounded-xl p-3 text-xs">
              <span className="text-[9px] uppercase font-bold text-amber-800 block mb-0.5">Sale Notes &amp; Remarks</span>
              <p className="text-slate-700">{selected.saleRemarks}</p>
            </div>
          )}
        </div>
      )}

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
      <div className="flex flex-wrap gap-2 mb-6">
        <button onClick={() => setModal("document")} className="border rounded-lg px-3 py-2 text-xs flex gap-1"><FilePlus2 className="w-4 h-4" /> Add Document</button>
        <button onClick={() => openSaleModal(selected)} className="bg-amber-600 hover:bg-amber-700 text-white rounded-lg px-3 py-2 text-xs font-semibold flex items-center gap-1 shadow-2xs transition-colors"><Tag className="w-4 h-4" /> {selected.status === "Sold" ? "Edit Sale Details" : "Mark as Sold"}</button>
        {selected.status !== "Sold" && (
          <>
            <button onClick={() => { setAssignForm({ ...emptyAssignment, odometer: selected.odometer || "" }); setModal("assign"); }} className="bg-blue-600 text-white rounded-lg px-3 py-2 text-xs flex gap-1"><UserRound className="w-4 h-4" /> {selected.currentAssigneeName ? "Transfer" : "Assign"}</button>
            {selected.currentAssigneeName && <button onClick={() => { setAssignForm({ ...emptyAssignment, odometer: selected.odometer || "" }); setModal("return"); }} className="bg-amber-500 text-white rounded-lg px-3 py-2 text-xs flex gap-1"><RotateCcw className="w-4 h-4" /> Return</button>}
          </>
        )}
        <button onClick={editVehicle} className="border rounded-lg px-3 py-2 text-xs flex gap-1"><Edit3 className="w-4 h-4" /> Edit</button>
        <button onClick={deleteVehicle} disabled={saving} className="border border-rose-200 text-rose-700 rounded-lg px-3 py-2 text-xs flex gap-1"><Trash2 className="w-4 h-4" /> Delete</button>
      </div>
      <h3 className="text-xs font-bold uppercase tracking-wider mb-3">Documents &amp; Images</h3><div className="grid md:grid-cols-2 gap-3 mb-6">{selected.documents?.length ? selected.documents.map((d: any) => <div key={d.id} className="border bg-white rounded-xl p-3 flex justify-between items-center"><button onClick={() => setViewer({ url: d.fileUrl, title: `${d.documentType} — ${d.documentNumber || selected.registrationNumber}` })} className="flex-1 text-left"><div className="text-xs font-semibold">{d.documentType}</div><div className="text-[10px] text-slate-500">{d.documentNumber || "No number"} · Expiry {fmt(d.expiryDate)}</div><div className="text-[10px] text-blue-600 mt-1 flex items-center gap-1"><Eye className="w-3 h-3"/> View document</div></button><button onClick={() => deleteDocument(d.id)} className="p-2 text-rose-600 bg-rose-50 rounded-lg" title="Delete document"><Trash2 className="w-3.5 h-3.5"/></button></div>) : <div className="text-xs text-slate-400">No documents uploaded.</div>}</div>
      <h3 className="text-xs font-bold uppercase tracking-wider mb-3">Assignment History</h3><div className="space-y-2">{selected.assignments?.length ? selected.assignments.map((a: any) => <div key={a.id} className="border bg-white rounded-xl p-3 text-xs"><b>{a.action}</b> · {a.fromPersonName || "Company"} → {a.toPersonName || "Company"} <span className="text-slate-500">({fmt(a.returnedAt || a.assignedAt)})</span></div>) : <div className="text-xs text-slate-400">Not assigned yet.</div>}</div>
    </div></Modal>}

    {modal === "document" && selected && <Modal close={() => setModal(null)}><form onSubmit={saveDoc}><Header title="Upload Vehicle Document" close={() => setModal(null)} /><div className="p-6 grid md:grid-cols-2 gap-4"><Select label="Document Type" value={docForm.documentType} onChange={(e:any) => setDocForm({...docForm, documentType:e.target.value})}>{["RC", "Insurance", "Permit", "Tax Receipt", "Invoice", "Loan/Hypothecation", "Service Record", "Other"].map(x=><option key={x}>{x}</option>)}</Select><Input label="Document Number" value={docForm.documentNumber} onChange={(e:any)=>setDocForm({...docForm,documentNumber:e.target.value})}/><Input label="Issue Date" type="date" value={docForm.issueDate} onChange={(e:any)=>setDocForm({...docForm,issueDate:e.target.value})}/><Input label="Expiry Date" type="date" value={docForm.expiryDate} onChange={(e:any)=>setDocForm({...docForm,expiryDate:e.target.value})}/><label className="md:col-span-2 border border-dashed border-[#C9A84C] rounded-lg p-3 text-xs cursor-pointer flex gap-2"><Upload className="w-4 h-4"/>{docForm.fileUrl ? "File uploaded ✓" : "Select document file *"}<input className="hidden" type="file" required={!docForm.fileUrl} onChange={async e=>{try{const u=await upload(e.target.files?.[0]);setDocForm({...docForm,fileUrl:u});}catch(x:any){notify(x.message)}}}/></label></div><Footer saving={saving} text="Save Document" close={()=>setModal(null)}/></form></Modal>}

    {(modal === "assign" || modal === "return") && selected && <Modal close={() => setModal(null)}><form onSubmit={saveAssignment}><Header title={modal === "return" ? "Return Vehicle" : selected.currentAssigneeName ? "Transfer Vehicle" : "Assign Vehicle"} close={() => setModal(null)} /><div className="p-6 grid md:grid-cols-2 gap-4">
      {modal === "assign" && <><Input label="Employee or Manual Person Name" required list="vehicle-people" value={assignForm.toPersonName} onChange={(e:any)=>choosePerson(e.target.value)} placeholder="Select employee or type external name"/><Input label="Purpose" value={assignForm.purpose} onChange={(e:any)=>setAssignForm({...assignForm,purpose:e.target.value})}/><Input label="Assignment Date" type="datetime-local" value={assignForm.assignedAt} onChange={(e:any)=>setAssignForm({...assignForm,assignedAt:e.target.value})}/></>}
      <Input label="Odometer (KM)" type="number" value={assignForm.odometer} onChange={(e:any)=>setAssignForm({...assignForm,odometer:e.target.value})}/><Input label="Remarks" value={assignForm.remarks} onChange={(e:any)=>setAssignForm({...assignForm,remarks:e.target.value})}/>
    </div><Footer saving={saving} text={modal === "return" ? "Confirm Return" : "Confirm Assignment"} close={()=>setModal(null)}/></form></Modal>}

    {modal === "sale" && selected && (
      <Modal close={() => setModal(null)} wide>
        <form onSubmit={saveSale}>
          <Header title={selected?.status === "Sold" ? `Edit Vehicle Sale Record — ${selected.registrationNumber}` : `Record Vehicle Sale — ${selected.registrationNumber}`} close={() => setModal(null)} />
          <div className="p-6 space-y-6">
            
            {/* 1. Buyer & Basic Sale Information */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 mb-3 flex items-center gap-1.5 border-b pb-2">
                <UserRound className="w-4 h-4 text-[#C9A84C]" /> Purchaser &amp; Sale Information
              </h4>
              <div className="grid md:grid-cols-2 gap-4">
                <Input
                  label="Buyer / Purchaser Name"
                  required
                  value={saleForm.buyerName}
                  onChange={(e: any) => setSaleForm({ ...saleForm, buyerName: e.target.value })}
                  placeholder="e.g. Ramesh Sharma"
                />
                <Input
                  label="Buyer Contact Number"
                  value={saleForm.buyerContact}
                  onChange={(e: any) => setSaleForm({ ...saleForm, buyerContact: e.target.value })}
                  placeholder="e.g. 9876543210"
                />
                <Input
                  label="Buyer Address / Location"
                  value={saleForm.buyerAddress}
                  onChange={(e: any) => setSaleForm({ ...saleForm, buyerAddress: e.target.value })}
                  placeholder="City, State or Full Address"
                />
                <Input
                  label="Date of Sale"
                  type="date"
                  required
                  value={saleForm.saleDate}
                  onChange={(e: any) => setSaleForm({ ...saleForm, saleDate: e.target.value })}
                />
                <Input
                  label="Total Sale Amount (₹)"
                  type="number"
                  required
                  value={saleForm.saleAmount}
                  onChange={(e: any) => setSaleForm({ ...saleForm, saleAmount: e.target.value })}
                  placeholder="e.g. 150000"
                />
                <Select
                  label="RC Transfer Status"
                  value={saleForm.rcTransferStatus}
                  onChange={(e: any) => setSaleForm({ ...saleForm, rcTransferStatus: e.target.value })}
                >
                  {["Pending", "In Progress", "Completed / Transferred", "N/A"].map(x => (
                    <option key={x} value={x}>{x}</option>
                  ))}
                </Select>
                <Input
                  label="Sales Executed By / Witness Staff"
                  value={saleForm.saleWitness}
                  onChange={(e: any) => setSaleForm({ ...saleForm, saleWitness: e.target.value })}
                  placeholder="e.g. Rahul Sharma"
                />
              </div>
            </div>

            {/* 2. Payment Structure & Installment Details */}
            <div className="border bg-amber-50/40 border-amber-200/70 rounded-2xl p-5 space-y-4">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 border-b border-amber-200/80 pb-3">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-amber-950 flex items-center gap-1.5">
                    <Tag className="w-4 h-4 text-amber-700" /> Payment Structure &amp; Installments
                  </h4>
                  <p className="text-[10px] text-amber-800 mt-0.5">Select full single payment or split into multiple installments.</p>
                </div>
                <div className="flex gap-2">
                  {["Full Payment", "Installments"].map(type => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setSaleForm({ ...saleForm, paymentType: type })}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        saleForm.paymentType === type ? "bg-amber-700 text-white shadow-2xs" : "bg-white text-slate-700 border border-amber-200"
                      }`}
                    >
                      {type === "Installments" ? "⚡ Installment Payment" : "Single Full Payment"}
                    </button>
                  ))}
                </div>
              </div>

              {saleForm.paymentType === "Full Payment" ? (
                <div className="grid md:grid-cols-2 gap-4">
                  <Select
                    label="Payment Mode"
                    value={saleForm.paymentMode}
                    onChange={(e: any) => setSaleForm({ ...saleForm, paymentMode: e.target.value })}
                  >
                    {["Cash", "Bank Transfer / NEFT / RTGS", "Cheque", "UPI / Online", "Other"].map(x => (
                      <option key={x} value={x}>{x}</option>
                    ))}
                  </Select>

                  {saleForm.paymentMode === "Other" && (
                    <Input
                      label="Specify Other Payment Mode *"
                      required
                      value={saleForm.paymentModeOther}
                      onChange={(e: any) => setSaleForm({ ...saleForm, paymentModeOther: e.target.value })}
                      placeholder="e.g. Vehicle Exchange / Finance Payoff"
                    />
                  )}

                  {(() => {
                    const { label, placeholder } = getPaymentRefLabelAndPlaceholder(saleForm.paymentMode);
                    return (
                      <Input
                        label={label}
                        value={saleForm.paymentReference}
                        onChange={(e: any) => setSaleForm({ ...saleForm, paymentReference: e.target.value })}
                        placeholder={placeholder}
                      />
                    );
                  })()}
                </div>
              ) : (
                /* Dynamic Installment Builder */
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">Installments Schedule:</span>
                    <button
                      type="button"
                      onClick={addInstallment}
                      className="px-3 py-1.5 bg-amber-700 hover:bg-amber-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                    >
                      <Plus className="w-4 h-4" /> Add Installment
                    </button>
                  </div>

                  <div className="space-y-3">
                    {(saleForm.paymentInstallments || []).map((inst: any, idx: number) => (
                      <div key={idx} className="bg-white border border-amber-200 rounded-xl p-4 space-y-3 relative group shadow-2xs">
                        <div className="flex items-center justify-between border-b pb-2">
                          <span className="text-xs font-extrabold text-amber-900">Installment #{inst.installmentNo || idx + 1}</span>
                          {(saleForm.paymentInstallments || []).length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeInstallment(idx)}
                              className="text-rose-600 hover:text-rose-800 text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" /> Remove
                            </button>
                          )}
                        </div>

                        <div className="grid md:grid-cols-5 gap-3">
                          <Input
                            label="Amount (₹)"
                            type="number"
                            required
                            value={inst.amount}
                            onChange={(e: any) => updateInstallment(idx, "amount", e.target.value)}
                            placeholder="e.g. 50000"
                          />
                          <Input
                            label="Due / Received Date"
                            type="date"
                            required
                            value={inst.date}
                            onChange={(e: any) => updateInstallment(idx, "date", e.target.value)}
                          />
                          <Select
                            label="Payment Mode"
                            value={inst.paymentMode || "Cash"}
                            onChange={(e: any) => updateInstallment(idx, "paymentMode", e.target.value)}
                          >
                            {["Cash", "Bank Transfer / NEFT / RTGS", "Cheque", "UPI / Online", "Other"].map(x => (
                              <option key={x} value={x}>{x}</option>
                            ))}
                          </Select>
                          <Select
                            label="Payment Status"
                            value={inst.status || "Received"}
                            onChange={(e: any) => updateInstallment(idx, "status", e.target.value)}
                          >
                            <option value="Received">Received ✓</option>
                            <option value="Pending">Pending ⏳</option>
                          </Select>
                          <Input
                            label="Ref / Cheque / UTR No."
                            value={inst.paymentReference}
                            onChange={(e: any) => updateInstallment(idx, "paymentReference", e.target.value)}
                            placeholder="e.g. UTR / Cheque #"
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Installment totals calculation */}
                  {(() => {
                    const instList = saleForm.paymentInstallments || [];
                    const totalInstReceived = instList.filter((i: any) => i.status === "Received").reduce((acc: number, i: any) => acc + (Number(i.amount) || 0), 0);
                    const totalSaleAmt = Number(saleForm.saleAmount) || 0;
                    const totalPending = Math.max(0, totalSaleAmt - totalInstReceived);

                    return (
                      <div className="bg-amber-100/70 border border-amber-300 rounded-xl p-3 flex flex-col md:flex-row justify-between items-center text-xs font-bold gap-2">
                        <span>Total Sale Amount: ₹{totalSaleAmt.toLocaleString("en-IN")}</span>
                        <span className="text-emerald-800">Total Received: ₹{totalInstReceived.toLocaleString("en-IN")}</span>
                        <span className={totalPending > 0 ? "text-amber-900" : "text-emerald-800"}>
                          {totalPending > 0 ? `Pending Balance: ₹${totalPending.toLocaleString("en-IN")}` : "Fully Paid ✓"}
                        </span>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>

            {/* 3. Vehicle Handover Details Section */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 mb-3 flex items-center gap-1.5 border-b pb-2">
                <CheckCircle2 className="w-4 h-4 text-[#C9A84C]" /> Vehicle Handover &amp; Document Delivery Details
              </h4>
              <div className="grid md:grid-cols-2 gap-4">
                <Input
                  label="Handover Date"
                  type="date"
                  value={saleForm.handoverDate}
                  onChange={(e: any) => setSaleForm({ ...saleForm, handoverDate: e.target.value })}
                />
                <Input
                  label="Handover Location"
                  value={saleForm.handoverLocation}
                  onChange={(e: any) => setSaleForm({ ...saleForm, handoverLocation: e.target.value })}
                  placeholder="e.g. Head Office Yard / Showroom"
                />
                <Input
                  label="Handover By (Company Staff)"
                  value={saleForm.handoverBy}
                  onChange={(e: any) => setSaleForm({ ...saleForm, handoverBy: e.target.value })}
                  placeholder="e.g. Manager / Staff Name"
                />
                <Input
                  label="Received By (Purchaser / Representative)"
                  value={saleForm.receivedBy}
                  onChange={(e: any) => setSaleForm({ ...saleForm, receivedBy: e.target.value })}
                  placeholder="e.g. Purchaser Name"
                />
                <Select
                  label="RC Handed Over"
                  value={saleForm.rcHandedOver}
                  onChange={(e: any) => setSaleForm({ ...saleForm, rcHandedOver: e.target.value })}
                >
                  <option value="No">No</option>
                  <option value="Yes">Yes</option>
                </Select>
                <Select
                  label="Insurance Documents Handed Over"
                  value={saleForm.insuranceHandedOver}
                  onChange={(e: any) => setSaleForm({ ...saleForm, insuranceHandedOver: e.target.value })}
                >
                  <option value="No">No</option>
                  <option value="Yes">Yes</option>
                </Select>
              </div>
            </div>

            {/* 4. Buyer ID Proof & Agreement Upload */}
            <div className="border-t pt-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3">Buyer ID Proof &amp; Agreement Upload</h4>
              <div className="grid md:grid-cols-2 gap-4">
                <Select
                  label="ID Proof Document Type"
                  value={saleForm.buyerIdProofType}
                  onChange={(e: any) => setSaleForm({ ...saleForm, buyerIdProofType: e.target.value })}
                >
                  {["Aadhaar Card", "PAN Card", "Driving License", "Voter ID", "Sale Agreement / Deed", "NOC Document", "Other"].map(x => (
                    <option key={x} value={x}>{x}</option>
                  ))}
                </Select>

                {saleForm.buyerIdProofType === "Other" && (
                  <Input
                    label="Specify Other Document Type *"
                    required
                    value={saleForm.buyerIdProofTypeOther}
                    onChange={(e: any) => setSaleForm({ ...saleForm, buyerIdProofTypeOther: e.target.value })}
                    placeholder="e.g. Passport / Ration Card / Partnership Deed"
                  />
                )}

                <Input
                  label="ID Proof / Document Number"
                  value={saleForm.buyerIdProofNumber}
                  onChange={(e: any) => setSaleForm({ ...saleForm, buyerIdProofNumber: e.target.value })}
                  placeholder="e.g. 1234 5678 9012"
                />

                {saleForm.buyerIdProofUrl ? (
                  <div className="md:col-span-2 border border-emerald-300 bg-emerald-50/70 rounded-xl p-3 text-xs flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-emerald-900 font-semibold truncate">
                      <Upload className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Buyer ID proof file uploaded ✓</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => setViewer({ url: saleForm.buyerIdProofUrl, title: "Buyer ID Proof Preview" })}
                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded-md transition-colors cursor-pointer"
                      >
                        Preview
                      </button>
                      <button
                        type="button"
                        onClick={() => setSaleForm({ ...saleForm, buyerIdProofUrl: "" })}
                        className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold rounded-md transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" /> Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <label className="md:col-span-2 border border-dashed border-[#C9A84C] bg-white rounded-xl p-3 text-xs cursor-pointer flex items-center gap-2 hover:bg-amber-50/40 transition-colors">
                    <Upload className="w-4 h-4 text-[#C9A84C]" />
                    <span>Upload Buyer ID Proof / Sale Deed Attachment</span>
                    <input
                      type="file"
                      className="hidden"
                      accept=".pdf,.jpg,.jpeg,.png,.webp"
                      onChange={async e => {
                        try {
                          const u = await upload(e.target.files?.[0]);
                          setSaleForm({ ...saleForm, buyerIdProofUrl: u });
                        } catch (x: any) {
                          notify(x.message);
                        }
                      }}
                    />
                  </label>
                )}
              </div>
            </div>

            {/* 5. Remarks */}
            <label className="block text-xs">
              <span className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Sale Notes &amp; Remarks</span>
              <textarea
                value={saleForm.saleRemarks ?? ""}
                onChange={e => setSaleForm({ ...saleForm, saleRemarks: e.target.value })}
                className="w-full border border-[#DDD8D0] rounded-lg p-3 text-xs outline-none focus:border-[#C9A84C]"
                placeholder="Add any additional sale conditions, NOC terms, or notes..."
              />
            </label>
          </div>
          <Footer saving={saving} text={selected?.status === "Sold" ? "Update Sale Record" : "Save & Mark as Sold"} close={() => setModal(null)} />
        </form>
      </Modal>
    )}

    {viewer && <Modal close={() => setViewer(null)} wide><Header title={viewer.title} close={() => setViewer(null)} /><div className="p-4 bg-slate-100 min-h-[60vh] flex items-center justify-center">
      {/\.(jpe?g|png|webp|gif)(\?|$)/i.test(viewer.url) ? <img src={viewer.url} alt={viewer.title} className="max-w-full max-h-[75vh] object-contain" /> : <iframe src={viewer.url} title={viewer.title} className="w-full h-[75vh] bg-white rounded-lg" />}
    </div><div className="border-t p-3 flex justify-end"><a href={viewer.url} target="_blank" rel="noreferrer" className="border rounded-lg px-4 py-2 text-xs">Open in New Tab</a></div></Modal>}
  </div>;
}

function Header({ title, close }: any) { return <div className="sticky top-0 bg-[#FAFAF7] z-10 border-b px-6 py-4 flex justify-between"><h2 className="text-xl font-serif">{title}</h2><button type="button" onClick={close}><X className="w-5 h-5"/></button></div>; }
function Footer({ saving, text, close }: any) { return <div className="border-t px-6 py-4 flex justify-end gap-2"><button type="button" onClick={close} className="border rounded-lg px-4 py-2 text-xs">Cancel</button><button disabled={saving} className="bg-[#1C1C1A] text-white rounded-lg px-5 py-2 text-xs disabled:opacity-50">{saving ? "Saving..." : text}</button></div>; }
