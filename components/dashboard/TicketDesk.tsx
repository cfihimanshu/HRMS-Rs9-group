"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Download, LifeBuoy, Plus, Search, Send, X } from "lucide-react";

const money = (value: unknown) => Number(value || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const csvCell = (value: unknown) => '"' + String(value ?? "").replaceAll('"', '""') + '"';
const ownerRoles = ["owner", "director"];
const adminHints = ["owner", "director", "it admin", "hr head", "hr executive", "department manager", "accounts", "payroll"];

function isOwnerRole(role: string) {
  const lower = String(role || "").toLowerCase();
  return ownerRoles.some(item => lower.includes(item));
}

function isAdminRole(role: string) {
  const lower = String(role || "").toLowerCase();
  return adminHints.some(item => lower.includes(item));
}

export default function TicketDesk({ sessionUser, triggerToast }: { sessionUser: any; triggerToast: (message: string) => void }) {
  const [tickets, setTickets] = useState<any[]>([]);
  const [admins, setAdmins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [assignedFilter, setAssignedFilter] = useState("All");
  const [saving, setSaving] = useState(false);
  const role = String(sessionUser?.role || "Employee");
  const canManage = isOwnerRole(role) || isAdminRole(role);
  const [form, setForm] = useState({
    title: "",
    category: "Requirement",
    moduleName: "",
    issueType: "Issue",
    priority: "Medium",
    amount: "",
    assignedToId: "",
    dueDate: "",
    description: "",
    expectedResolution: "",
  });

  const load = async () => {
    setLoading(true);
    try {
      const result = await fetch("/api/tickets", { cache: "no-store" }).then(response => response.json());
      if (!result.success) return triggerToast(result.error || "Tickets load nahi hue");
      setTickets(result.data || []);
      setAdmins(result.admins || []);
    } catch {
      triggerToast("Tickets load nahi hue");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return tickets.filter(ticket => {
      const matchesSearch = !needle || [ticket.ticketNo, ticket.title, ticket.category, ticket.moduleName, ticket.issueType, ticket.priority, ticket.status, ticket.raisedByName, ticket.assignedToName, ticket.description, ticket.amount].some(value => String(value || "").toLowerCase().includes(needle));
      const matchesStatus = statusFilter === "All" || ticket.status === statusFilter;
      const matchesAssigned = assignedFilter === "All" || String(ticket.assignedToId || "") === assignedFilter;
      return matchesSearch && matchesStatus && matchesAssigned;
    });
  }, [tickets, search, statusFilter, assignedFilter]);

  const summary = useMemo(() => ({
    total: filtered.length,
    open: filtered.filter(ticket => ["Open", "In Progress", "Waiting"].includes(ticket.status)).length,
    closed: filtered.filter(ticket => ["Resolved", "Closed", "Rejected"].includes(ticket.status)).length,
    amount: filtered.reduce((sum, ticket) => sum + Number(ticket.amount || 0), 0),
  }), [filtered]);

  const resetForm = () => setForm({ title: "", category: "Requirement", moduleName: "", issueType: "Issue", priority: "Medium", amount: "", assignedToId: "", dueDate: "", description: "", expectedResolution: "" });

  const createTicket = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      const result = await fetch("/api/tickets", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) }).then(response => response.json());
      if (!result.success) return triggerToast(result.error || "Ticket create nahi hua");
      setTickets(previous => [result.data, ...previous]);
      resetForm();
      setShowForm(false);
      triggerToast("Ticket raise ho gaya");
    } catch {
      triggerToast("Ticket create nahi hua");
    } finally {
      setSaving(false);
    }
  };

  const updateTicket = async (ticket: any, changes: any) => {
    const result = await fetch("/api/tickets", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: ticket.id, ...changes }) }).then(response => response.json());
    if (!result.success) return triggerToast(result.error || "Ticket update nahi hua");
    setTickets(previous => previous.map(item => item.id === ticket.id ? result.data : item));
    triggerToast("Ticket update ho gaya");
  };

  const exportCsv = () => {
    const headers = ["Ticket No", "Title", "Category", "Module", "Issue Type", "Amount", "Priority", "Status", "Raised By", "Assigned To", "Due Date", "Created At", "Description", "Expected Resolution", "Resolution"];
    const lines = filtered.map(ticket => [ticket.ticketNo, ticket.title, ticket.category, ticket.moduleName, ticket.issueType, ticket.amount, ticket.priority, ticket.status, ticket.raisedByName, ticket.assignedToName, ticket.dueDate, ticket.createdAt, ticket.description, ticket.expectedResolution, ticket.resolution].map(csvCell).join(","));
    const blob = new Blob(["\uFEFF" + headers.map(csvCell).join(",") + "\n" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "tickets-register-" + new Date().toISOString().slice(0, 10) + ".csv";
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return <div className="space-y-4">
    <div className="flex flex-col gap-3 rounded-xl border bg-white p-4 dark:bg-gray-900 lg:flex-row lg:items-center lg:justify-between">
      <div><h2 className="flex items-center gap-2 text-base font-black"><LifeBuoy className="h-5 w-5 text-emerald-600"/>Ticket Raising Desk</h2><p className="mt-1 text-[10px] font-semibold text-slate-500">Issue, requirement, amount correction ya kisi bhi help ke liye ticket raise karein.</p></div>
      <div className="flex flex-wrap gap-2"><button type="button" onClick={() => setShowForm(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700"><Plus className="h-4 w-4"/>Raise Ticket</button><button type="button" onClick={exportCsv} className="inline-flex items-center gap-1.5 rounded-lg border px-4 py-2 text-xs font-bold hover:bg-slate-50"><Download className="h-4 w-4"/>Export CSV</button></div>
    </div>

    <div className="grid gap-3 md:grid-cols-4"><div className="rounded-xl border bg-white p-4"><p className="text-[9px] font-bold uppercase text-slate-400">Total Tickets</p><b className="text-xl">{summary.total}</b></div><div className="rounded-xl border border-amber-200 bg-amber-50 p-4"><p className="text-[9px] font-bold uppercase text-amber-700">Open / Working</p><b className="text-xl text-amber-800">{summary.open}</b></div><div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4"><p className="text-[9px] font-bold uppercase text-emerald-700">Closed</p><b className="text-xl text-emerald-800">{summary.closed}</b></div><div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4"><p className="text-[9px] font-bold uppercase text-indigo-700">Amount Mentioned</p><b className="text-xl text-indigo-800">Rs. {money(summary.amount)}</b></div></div>

    <div className="rounded-xl border bg-white dark:bg-gray-900">
      <div className="flex flex-col gap-2 border-b p-3 lg:flex-row lg:items-center lg:justify-between"><label className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400"/><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search ticket, amount, admin..." className="w-full rounded-lg border py-2 pl-9 pr-3 text-xs lg:w-80"/></label><div className="flex flex-wrap gap-2"><select value={statusFilter} onChange={event => setStatusFilter(event.target.value)} className="rounded-lg border bg-white px-3 py-2 text-xs"><option>All</option><option>Open</option><option>In Progress</option><option>Waiting</option><option>Resolved</option><option>Closed</option><option>Rejected</option></select><select value={assignedFilter} onChange={event => setAssignedFilter(event.target.value)} className="rounded-lg border bg-white px-3 py-2 text-xs"><option value="All">All Admins</option>{admins.map(admin => <option key={admin.id} value={admin.id}>{admin.name}</option>)}</select></div></div>
      <div className="max-h-[62vh] overflow-auto"><table className="w-full min-w-max border-collapse text-[10px]"><thead className="sticky top-0 bg-[#F3F0EC]"><tr>{["Ticket", "Title", "Category", "Module", "Type", "Amount", "Priority", "Status", "Raised By", "Assigned Admin", "Due", "Created", "Description", "Resolution"].map(header => <th key={header} className="border-b border-r p-3 text-left uppercase">{header}</th>)}</tr></thead><tbody>{filtered.map(ticket => <tr key={ticket.id} className="border-b hover:bg-slate-50"><td className="border-r p-3 font-mono font-bold">{ticket.ticketNo}</td><td className="border-r p-3 font-bold">{ticket.title}</td><td className="border-r p-3">{ticket.category}</td><td className="border-r p-3">{ticket.moduleName || "-"}</td><td className="border-r p-3">{ticket.issueType}</td><td className="border-r p-3 text-right font-bold">{ticket.amount ? "Rs. " + money(ticket.amount) : "-"}</td><td className="border-r p-3"><span className="rounded-full bg-indigo-50 px-2 py-1 font-bold text-indigo-700">{ticket.priority}</span></td><td className="border-r p-3">{canManage ? <select value={ticket.status} onChange={event => updateTicket(ticket, { status: event.target.value })} className="rounded border px-2 py-1 text-[10px]"><option>Open</option><option>In Progress</option><option>Waiting</option><option>Resolved</option><option>Closed</option><option>Rejected</option></select> : <b>{ticket.status}</b>}</td><td className="border-r p-3">{ticket.raisedByName}<span className="block text-[9px] text-slate-400">{ticket.raisedByRole}</span></td><td className="border-r p-3">{canManage ? <select value={ticket.assignedToId || ""} onChange={event => updateTicket(ticket, { assignedToId: event.target.value })} className="rounded border px-2 py-1 text-[10px]"><option value="">Unassigned</option>{admins.map(admin => <option key={admin.id} value={admin.id}>{admin.name}</option>)}</select> : (ticket.assignedToName || "-")}</td><td className="border-r p-3 whitespace-nowrap">{ticket.dueDate || "-"}</td><td className="border-r p-3 whitespace-nowrap">{ticket.createdAt ? new Date(ticket.createdAt).toLocaleDateString("en-IN") : "-"}</td><td className="max-w-sm border-r p-3 whitespace-normal">{ticket.description}</td><td className="max-w-xs p-3 whitespace-normal">{canManage ? <input value={ticket.resolution || ""} onChange={event => setTickets(previous => previous.map(item => item.id === ticket.id ? { ...item, resolution: event.target.value } : item))} onBlur={event => updateTicket(ticket, { resolution: event.target.value })} placeholder="Action / resolution" className="w-52 rounded border px-2 py-1 text-[10px]"/> : (ticket.resolution || "-")}</td></tr>)}{!filtered.length && <tr><td colSpan={14} className="p-10 text-center text-slate-400">{loading ? "Loading tickets..." : "No tickets found."}</td></tr>}</tbody></table></div>
    </div>

    {showForm && <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/60 p-4" onClick={() => setShowForm(false)}><form onSubmit={createTicket} onClick={event => event.stopPropagation()} className="w-full max-w-4xl overflow-hidden rounded-xl bg-white shadow-2xl"><div className="flex items-center justify-between border-b p-4"><div><h3 className="font-black">Raise New Ticket</h3><p className="text-[10px] text-slate-500">Jis admin se kaam karwana hai use assign karein.</p></div><button type="button" onClick={() => setShowForm(false)} className="rounded-lg p-2 hover:bg-slate-100"><X className="h-5 w-5"/></button></div><div className="grid gap-3 p-4 md:grid-cols-2"><label className="text-xs font-bold">Title *<input required value={form.title} onChange={event => setForm({ ...form, title: event.target.value })} className="mt-1 w-full rounded-lg border p-2"/></label><label className="text-xs font-bold">Assign To<select value={form.assignedToId} onChange={event => setForm({ ...form, assignedToId: event.target.value })} className="mt-1 w-full rounded-lg border bg-white p-2"><option value="">Select admin</option>{admins.map(admin => <option key={admin.id} value={admin.id}>{admin.name} - {admin.role}</option>)}</select></label><label className="text-xs font-bold">Category<select value={form.category} onChange={event => setForm({ ...form, category: event.target.value })} className="mt-1 w-full rounded-lg border bg-white p-2"><option>Requirement</option><option>Issue</option><option>Amount Problem</option><option>Correction</option><option>Access Request</option><option>Other</option></select></label><label className="text-xs font-bold">Module / Page<input value={form.moduleName} onChange={event => setForm({ ...form, moduleName: event.target.value })} placeholder="Payroll, Security, Attendance..." className="mt-1 w-full rounded-lg border p-2"/></label><label className="text-xs font-bold">Issue Type<select value={form.issueType} onChange={event => setForm({ ...form, issueType: event.target.value })} className="mt-1 w-full rounded-lg border bg-white p-2"><option>Issue</option><option>Requirement</option><option>Amount Mismatch</option><option>Data Correction</option><option>Permission</option></select></label><label className="text-xs font-bold">Amount if any<input type="number" step="0.01" value={form.amount} onChange={event => setForm({ ...form, amount: event.target.value })} className="mt-1 w-full rounded-lg border p-2"/></label><label className="text-xs font-bold">Priority<select value={form.priority} onChange={event => setForm({ ...form, priority: event.target.value })} className="mt-1 w-full rounded-lg border bg-white p-2"><option>Low</option><option>Medium</option><option>High</option><option>Urgent</option></select></label><label className="text-xs font-bold">Due Date<input type="date" value={form.dueDate} onChange={event => setForm({ ...form, dueDate: event.target.value })} className="mt-1 w-full rounded-lg border p-2"/></label><label className="md:col-span-2 text-xs font-bold">Description *<textarea required value={form.description} onChange={event => setForm({ ...form, description: event.target.value })} rows={4} className="mt-1 w-full rounded-lg border p-2"/></label><label className="md:col-span-2 text-xs font-bold">Expected Resolution<textarea value={form.expectedResolution} onChange={event => setForm({ ...form, expectedResolution: event.target.value })} rows={2} className="mt-1 w-full rounded-lg border p-2"/></label></div><div className="flex justify-end gap-2 border-t p-4"><button type="button" onClick={() => setShowForm(false)} className="rounded-lg border px-4 py-2 text-xs font-bold">Cancel</button><button disabled={saving} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-60"><Send className="h-4 w-4"/>{saving ? "Saving..." : "Submit Ticket"}</button></div></form></div>}
  </div>;
}
