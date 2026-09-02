"use client";

import React from "react";
import { AlertTriangle, ChevronDown, ChevronUp, Clock3, RefreshCw, X } from "lucide-react";

const duration = (minutes: number) => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return hours ? `${hours}h ${mins}m overdue` : `${mins}m overdue`;
};

export default function IncompleteWorkAlert({ onOpenTasks }: { onOpenTasks: () => void }) {
  const currentMonth = React.useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  }, []);
  const monthOptions = React.useMemo(() => Array.from({ length: 12 }, (_, index) => {
    const date = new Date(Number(currentMonth.slice(0, 4)), index, 1);
    return {
      value: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`,
      label: date.toLocaleDateString("en-IN", { month: "long", year: "numeric" })
    };
  }), [currentMonth]);
  const [selectedMonth, setSelectedMonth] = React.useState(currentMonth);
  const [items, setItems] = React.useState<any[]>([]);
  const [totalCount, setTotalCount] = React.useState(0);
  const [expanded, setExpanded] = React.useState(false);
  const [dismissed, setDismissed] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/tasks/incomplete-alerts?month=${encodeURIComponent(selectedMonth)}`, { cache: "no-store" });
      const result = await response.json();
      if (result.success) {
        setItems(Array.isArray(result.data) ? result.data : []);
        setTotalCount(Number(result.count || 0));
        if (result.count > 0) setDismissed(false);
      }
    } catch { /* notification bell remains the fallback */ }
    finally { setLoading(false); }
  }, [selectedMonth]);

  React.useEffect(() => {
    void load();
    const timer = window.setInterval(load, 60_000);
    return () => window.clearInterval(timer);
  }, [load]);

  if (!items.length || dismissed) return null;
  const visibleItems = items.slice(0, 5);
  return <div className="mb-4 rounded-xl border border-rose-300 bg-rose-50 shadow-sm overflow-hidden">
    <div className="px-4 py-3 flex items-center gap-3"><span className="w-9 h-9 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center shrink-0"><AlertTriangle className="w-5 h-5"/></span><button onClick={() => setExpanded(value => !value)} className="min-w-0 flex-1 text-left"><p className="text-sm font-black text-rose-900">{totalCount} overdue task{totalCount === 1 ? "" : "s"}</p><p className="text-[11px] font-semibold text-rose-700">Only tasks from the selected month are shown.</p></button><select value={selectedMonth} onChange={event => setSelectedMonth(event.target.value)} onClick={event => event.stopPropagation()} className="rounded-lg border border-rose-200 bg-white px-2.5 py-1.5 text-xs font-bold text-rose-800 outline-none">{monthOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select><button onClick={load} disabled={loading} title="Refresh" className="p-2 text-rose-700"><RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}/></button><button onClick={() => setExpanded(value => !value)} title={expanded ? "Collapse" : "Show tasks"} className="p-2 text-rose-700">{expanded ? <ChevronUp className="w-4 h-4"/> : <ChevronDown className="w-4 h-4"/>}</button><button onClick={() => setDismissed(true)} title="Dismiss" className="p-2 text-rose-700"><X className="w-4 h-4"/></button></div>
    {expanded && <div className="border-t border-rose-200 bg-white p-3"><div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">{visibleItems.map(item => <button key={item.id} onClick={onOpenTasks} className="min-w-0 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-left hover:border-rose-300 hover:bg-rose-50 transition-colors"><div className="flex items-start justify-between gap-3"><p className="truncate text-xs font-black text-slate-900" title={item.title}>{item.title}</p><span className="shrink-0 text-[10px] font-black text-rose-700 flex items-center gap-1"><Clock3 className="w-3 h-3"/>{duration(item.overdueMinutes)}</span></div><p className="mt-1 text-[10px] font-bold text-slate-600">Assigned to: {item.assigneeName}</p><p className="mt-1 line-clamp-2 text-[10px] font-semibold leading-4 text-slate-700" title={item.description}><span className="font-black text-slate-900">Work:</span> {item.description}</p><p className="mt-1 text-[9px] font-semibold text-slate-500">{item.status} · Task #{item.id}</p></button>)}</div><div className="mt-3 flex items-center justify-between"><p className="text-[10px] font-semibold text-slate-500">Showing {visibleItems.length} of {totalCount} overdue tasks</p><button onClick={onOpenTasks} className="rounded-lg bg-rose-700 px-3 py-1.5 text-[10px] font-black text-white hover:bg-rose-800">Open all tasks</button></div></div>}
  </div>;
}
