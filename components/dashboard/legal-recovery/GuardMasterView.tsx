"use client";

import React, { useEffect, useState } from "react";
import { Pencil, Save, ShieldX, UserPlus } from "lucide-react";

const empty = { id: "", name: "", phone: "", monthlySalary: "" };
const money = (value: unknown) => Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });

export default function GuardMasterView({ triggerToast }: { triggerToast: (message: string) => void }) {
  const [guards, setGuards] = useState<any[]>([]);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const load = async () => {
    const response = await fetch("/api/legal-recovery/guards");
    const result = await response.json();
    if (result.success) setGuards(result.data || []);
  };
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setSaving(true);
    try {
      const response = await fetch("/api/legal-recovery/guards", { method: form.id ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const result = await response.json();
      if (!result.success) return triggerToast(result.error || "Guard save nahi hua");
      triggerToast(form.id ? "Guard Master update ho gaya" : "Guard Master mein add ho gaya"); setForm(empty); await load();
    } finally { setSaving(false); }
  };
  const disable = async (id: number) => {
    if (!confirm("Is guard ko inactive karna hai?")) return;
    const response = await fetch(`/api/legal-recovery/guards?id=${id}`, { method: "DELETE" });
    const result = await response.json();
    if (result.success) { triggerToast("Guard inactive ho gaya"); await load(); } else triggerToast(result.error || "Update failed");
  };
  return <div className="space-y-4">
    <form onSubmit={submit} className="bg-white dark:bg-gray-900 border rounded-xl p-5 space-y-4">
      <div><h3 className="font-bold text-sm flex items-center gap-2"><UserPlus className="w-4 h-4 text-violet-600"/>Guard Master</h3><p className="text-[10px] text-slate-500 mt-1">Guard ki permanent details yahan save hongi aur deployment/attendance dropdown mein yahi master use hoga.</p></div>
      <div className="grid md:grid-cols-3 gap-3">
        <label className="text-[10px] uppercase font-bold text-slate-500">Guard Name *<input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="mt-1 w-full border rounded-lg px-3 py-2 text-xs normal-case" placeholder="Full name"/></label>
        <label className="text-[10px] uppercase font-bold text-slate-500">Mobile Number *<input required value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value.replace(/[^0-9+ -]/g, "") })} className="mt-1 w-full border rounded-lg px-3 py-2 text-xs normal-case" placeholder="Mobile number"/></label>
        <label className="text-[10px] uppercase font-bold text-slate-500">Monthly Salary (₹) *<input required min="0" step="0.01" type="number" value={form.monthlySalary} onChange={e => setForm({ ...form, monthlySalary: e.target.value })} className="mt-1 w-full border rounded-lg px-3 py-2 text-xs normal-case" placeholder="e.g. 15000"/></label>
      </div>
      <div className="flex justify-end gap-2">{form.id && <button type="button" onClick={() => setForm(empty)} className="px-4 py-2 border rounded-lg text-xs font-bold">Cancel</button>}<button disabled={saving} className="px-5 py-2 bg-violet-600 text-white rounded-lg text-xs font-bold flex items-center gap-2"><Save className="w-4 h-4"/>{saving ? "Saving..." : form.id ? "Update Guard" : "Add Guard"}</button></div>
    </form>
    <div className="bg-white dark:bg-gray-900 border rounded-xl overflow-x-auto"><table className="w-full text-xs"><thead className="bg-[#F6F4F1] dark:bg-gray-800 text-[9px] uppercase"><tr><th className="text-left p-3">Guard Name</th><th className="text-left p-3">Mobile</th><th className="text-left p-3">Monthly Salary</th><th className="text-left p-3">Status</th><th className="text-right p-3">Actions</th></tr></thead><tbody>{guards.map(guard => <tr key={guard.id} className="border-t"><td className="p-3 font-bold">{guard.name}</td><td className="p-3">{guard.phone || "-"}</td><td className="p-3 font-bold">₹{money(guard.monthlySalary)}</td><td className="p-3">{guard.status || "Active"}</td><td className="p-3"><div className="flex justify-end gap-2"><button onClick={() => setForm({ id: String(guard.id), name: guard.name || "", phone: guard.phone || "", monthlySalary: String(guard.monthlySalary || "") })} className="p-2 text-indigo-600"><Pencil className="w-4 h-4"/></button>{String(guard.status).toLowerCase() !== "inactive" && <button onClick={() => disable(guard.id)} className="p-2 text-rose-600"><ShieldX className="w-4 h-4"/></button>}</div></td></tr>)}</tbody></table></div>
  </div>;
}
