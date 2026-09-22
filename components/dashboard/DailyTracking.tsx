"use client";

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";

type Payment = { id: string; source: string; payer: string; branch: string; amount: number; paymentDate: string; recordedAt: string; receivedBy: string; mode: string; reference: string };
type Person = { id: string; name: string; checkIn: string | null; source: string; late: boolean };
type Task = { id: string; title: string; creator: string; assignedTo: string; forwardedTo: string; status: string; createdAt: string };
type Forward = { id: string; taskId: string; from: string; to: string; previousRecipient: string; at: string };
type Data = { payments: Payment[]; attendance: Person[]; tasks: Task[]; forwards: Forward[]; errors: string[]; paymentsAvailable: boolean; attendanceAvailable: boolean; tasksAvailable: boolean; forwardsAvailable: boolean };
type View = "payments" | "attendance" | "tasks" | "forwards";
const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
const money = (amount: number) => amount.toLocaleString("en-IN", { style: "currency", currency: "INR" });
const time = (value: string | null) => value ? new Date(value).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "Not recorded";

export default function DailyTracking({ initialView = "payments" }: { initialView?: View }) {
  const [date, setDate] = useState(today);
  const [view, setView] = useState<View>(initialView);
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(0);
  const [search, setSearch] = useState("");
  const [lateOnly, setLateOnly] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    setData(null);
    fetch(`/api/dashboard/daily-tracking?date=${encodeURIComponent(date)}`, { cache: "no-store", signal: controller.signal })
      .then(async response => {
        const result = await response.json();
        if (!response.ok || !result.success) throw new Error(result.error || "Could not load tracking");
        if (!controller.signal.aborted) { setData(result.data); setUpdatedAt(new Date().toISOString()); }
      })
      .catch(reason => { if (!controller.signal.aborted) setError(reason.message || "Could not load tracking"); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [date, refresh]);

  useEffect(() => {
    const interval = setInterval(() => { if (!document.hidden) setRefresh(value => value + 1); }, 60000);
    return () => clearInterval(interval);
  }, []);

  const matches = (values: unknown[]) => values.join(" ").toLowerCase().includes(search.toLowerCase().trim());
  const tabs: { id: View; label: string; value: string | number }[] = [
    { id: "payments", label: "Received payments", value: data?.paymentsAvailable ? money(data.payments.reduce((sum, payment) => sum + payment.amount, 0)) : "—" },
    { id: "attendance", label: "Present / Late", value: data?.attendanceAvailable ? `${data.attendance.length} / ${data.attendance.filter(person => person.late).length}` : "—" },
    { id: "tasks", label: "Tasks created", value: data?.tasksAvailable ? data.tasks.length : "—" },
    { id: "forwards", label: "Task forwards", value: data?.forwardsAvailable ? data.forwards.length : "—" },
  ];
  const headers: Record<View, string[]> = {
    payments: ["Received from", "Source / Branch", "Amount", "Payment date", "Recorded at (IST)", "Logged by", "Mode / Reference"],
    attendance: ["Employee", "Status", "First punch / SOD (IST)", "Source"],
    tasks: ["Task", "Created by", "Assigned to", "Current forwarded recipient", "Status", "Created (IST)"],
    forwards: ["Task ID", "Forwarded by", "Forwarded to", "Previous recipient", "Forwarded at (IST)"],
  };
  const tableRows: { id: string; cells: (string | number)[] }[] = !data ? [] : view === "payments" ? data.payments.filter(row => matches([row.payer, row.branch, row.source, row.receivedBy, row.reference])).map(row => ({ id: row.id, cells: [row.payer, `${row.source} / ${row.branch}`, money(row.amount), new Date(row.paymentDate).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" }), time(row.recordedAt), row.receivedBy, `${row.mode} / ${row.reference}`] }))
    : view === "attendance" ? data.attendance.filter(row => (!lateOnly || row.late) && matches([row.name, row.source])).map(row => ({ id: row.id, cells: [row.name, row.late ? "Present · Late" : "Present", time(row.checkIn), row.source] }))
    : view === "tasks" ? data.tasks.filter(row => matches([row.id, row.title, row.creator, row.assignedTo, row.forwardedTo, row.status])).map(row => ({ id: row.id, cells: [`${row.id} · ${row.title}`, row.creator, row.assignedTo, row.forwardedTo, row.status || "—", time(row.createdAt)] }))
    : data.forwards.filter(row => matches([row.taskId, row.from, row.to])).map(row => ({ id: row.id, cells: [row.taskId, row.from, row.to, row.previousRecipient, time(row.at)] }));

  return <section className="mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4 dark:border-slate-700">
      <div><h2 className="text-lg font-bold">Daily HR & Business Tracking</h2><p className="text-xs text-slate-500 dark:text-slate-400">All companies · India time (IST) · Refreshes every minute{updatedAt ? ` · Updated ${time(updatedAt)}` : ""}</p></div>
      <div className="flex items-center gap-3"><label className="text-xs font-semibold">Tracking date <input aria-label="Tracking date" type="date" value={date} onChange={event => { if (event.target.value) setDate(event.target.value); }} className="ml-2 rounded border border-slate-300 bg-transparent p-2 dark:border-slate-600" /></label><button type="button" onClick={() => setRefresh(value => value + 1)} disabled={loading} className="flex items-center gap-1 rounded border border-slate-300 p-2 text-xs disabled:opacity-50 dark:border-slate-600"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />Refresh</button></div>
    </div>
    <div className="grid grid-cols-2 gap-3 p-4 lg:grid-cols-4">{tabs.map(tab => <button type="button" key={tab.id} aria-pressed={view === tab.id} onClick={() => { setView(tab.id); setSearch(""); }} className={`rounded-xl border p-3 text-left ${view === tab.id ? "border-violet-500 bg-violet-50 dark:bg-violet-950" : "border-slate-200 dark:border-slate-700"}`}><span className="block text-xs font-semibold">{tab.label}</span><strong className="mt-1 block text-xl">{loading ? "…" : tab.value}</strong></button>)}</div>
    <div className="space-y-3 px-4 pb-4">
      {error && <p role="alert" className="text-sm text-red-600">{error}. Use Refresh to retry.</p>}
      {!!data?.errors.length && <p role="alert" className="text-sm text-amber-700 dark:text-amber-400">Partial data: {data.errors.join("; ")}. Unavailable totals show —.</p>}
      <div className="flex flex-wrap items-center gap-3"><input aria-label="Search tracking records" placeholder="Search name, task or payment…" value={search} onChange={event => setSearch(event.target.value)} className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-transparent p-2 text-sm dark:border-slate-600" />{view === "attendance" && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={lateOnly} onChange={event => setLateOnly(event.target.checked)} />Late only</label>}</div>
      <p className="text-xs text-slate-500 dark:text-slate-400">{view === "payments" ? "Legal Recovery and Security receipt transactions only; sales conversions are not confirmed receipts. Payment date determines the daily total; recorded time shows when the entry was made. TDS is excluded." : view === "attendance" ? "Present = attendance or SOD record. Late = marked Late, or first punch/SOD at or after 11:00 AM IST. SOD is used when no attendance record exists." : view === "tasks" ? "Tasks created on the selected date, including backdated work entered that day. Current assignment and status are shown." : "Forwarding events from saved audit history, including repeated forwards. Older forwards without audit history cannot be reconstructed."}</p>
      {loading ? <p role="status" className="p-6 text-center text-sm">Loading tracking records…</p> : data && <div className="max-h-96 overflow-auto rounded-lg border border-slate-200 dark:border-slate-700"><table className="w-full text-left text-xs"><thead className="sticky top-0 bg-slate-100 dark:bg-slate-800"><tr>{headers[view].map(header => <th key={header} className="whitespace-nowrap p-3 font-semibold">{header}</th>)}</tr></thead><tbody>{tableRows.map(row => <tr key={row.id} className="border-t border-slate-100 dark:border-slate-800">{row.cells.map((cell, index) => <td key={index} className="min-w-28 p-3">{cell}</td>)}</tr>)}{!tableRows.length && <tr><td colSpan={headers[view].length} className="p-6 text-center">{data.errors.length ? "No matching records in the available data. Check the loading errors above." : "No matching records for this date."}</td></tr>}</tbody></table></div>}
    </div>
  </section>;
}
