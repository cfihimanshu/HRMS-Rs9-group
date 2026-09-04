"use client";

import React, { useEffect, useMemo, useState } from "react";
import { CalendarDays, CheckCircle2, Download, IndianRupee, Search, X, XCircle } from "lucide-react";

const localMonth = () => {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 7);
};
const money = (value: unknown) => Number(value || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const indiaDate = () => new Date(Date.now() + 330 * 60 * 1000).toISOString().slice(0, 10);

export default function GuardAttendancePayoutView({ triggerToast }: { nbfcsList: any[]; triggerToast: (message: string) => void }) {
  const [month, setMonth] = useState(localMonth());
  const [projects, setProjects] = useState<any[]>([]);
  const [guards, setGuards] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [nbfcFilter, setNbfcFilter] = useState("");
  const [siteFilter, setSiteFilter] = useState("");
  const [guardFilter, setGuardFilter] = useState("");
  const [savingCell, setSavingCell] = useState("");
  const [showPayoutBreakdown, setShowPayoutBreakdown] = useState(false);
  const daysInMonth = useMemo(() => { const [year, monthNumber] = month.split("-").map(Number); return new Date(year, monthNumber, 0).getDate(); }, [month]);
  const dates = useMemo(() => Array.from({ length: daysInMonth }, (_, index) => `${month}-${String(index + 1).padStart(2, "0")}`), [month, daysInMonth]);
  const presentLockActive = indiaDate() < `${month}-${String(daysInMonth).padStart(2, "0")}`;

  const loadMasters = async () => {
    const [projectResult, guardResult] = await Promise.all([
      fetch("/api/legal-recovery/security/projects").then(response => response.json()),
      fetch("/api/legal-recovery/guards").then(response => response.json()),
    ]);
    if (projectResult.success) setProjects((projectResult.data || []).filter((project: any) => project.sourceSecurityId && project.guardId));
    if (guardResult.success) setGuards(guardResult.data || []);
  };
  const loadAttendance = async () => {
    const result = await fetch(`/api/legal-recovery/security/guard-attendance?month=${month}`).then(response => response.json());
    if (result.success) setAttendance(result.data || []); else triggerToast(result.error || "Attendance load nahi hui");
  };
  useEffect(() => { loadMasters().catch(() => triggerToast("Projects aur guards load nahi hue")); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { loadAttendance().catch(() => triggerToast("Attendance load nahi hui")); }, [month]); // eslint-disable-line react-hooks/exhaustive-deps

  const mappedRows = useMemo(() => {
    const unique = new Map<string, any>();
    projects.forEach(project => unique.set(`${project.sourceSecurityId}-${project.guardId}`, project));
    return [...unique.values()];
  }, [projects]);
  const nbfcOptions = useMemo(() => [...new Set(mappedRows.map(project => String(project.nbfcName || "")).filter(Boolean))].sort(), [mappedRows]);
  const siteOptions = useMemo(() => [...new Set(mappedRows.filter(project => !nbfcFilter || project.nbfcName === nbfcFilter).map(project => String(project.siteName || "")).filter(Boolean))].sort(), [mappedRows, nbfcFilter]);
  const guardOptions = useMemo(() => [...new Map(mappedRows.filter(project => (!nbfcFilter || project.nbfcName === nbfcFilter) && (!siteFilter || project.siteName === siteFilter)).map(project => [String(project.guardId), { id: String(project.guardId), name: project.guardName }])).values()].sort((a, b) => String(a.name).localeCompare(String(b.name))), [mappedRows, nbfcFilter, siteFilter]);
  const rows = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return mappedRows.filter(project =>
      (!nbfcFilter || project.nbfcName === nbfcFilter) &&
      (!siteFilter || project.siteName === siteFilter) &&
      (!guardFilter || String(project.guardId) === guardFilter) &&
      (!needle || [project.nbfcName, project.siteName, project.guardName, project.contactNumber].some(value => String(value || "").toLowerCase().includes(needle)))
    );
  }, [mappedRows, search, nbfcFilter, siteFilter, guardFilter]);
  const recordMap = useMemo(() => new Map(attendance.map(record => [`${record.securityId}-${record.guardId}-${record.attendanceDate}`, record])), [attendance]);
  const visibleAttendance = useMemo(() => {
    const visibleKeys = new Set(rows.map(project => `${project.sourceSecurityId}-${project.guardId}`));
    return attendance.filter(record => visibleKeys.has(`${record.securityId}-${record.guardId}`));
  }, [attendance, rows]);
  const summary = useMemo(() => ({
    present: visibleAttendance.filter(record => record.status === "Present").length,
    absent: visibleAttendance.filter(record => record.status === "Absent").length,
    payout: visibleAttendance.reduce((sum, record) => sum + Number(record.payoutAmount || 0), 0),
  }), [visibleAttendance]);
  const guardPayoutBreakdown = useMemo(() => {
    const mapped = new Map<string, any>();
    rows.forEach(project => {
      const key = String(project.guardId);
      const guard = guards.find(item => String(item.id) === key);
      const current = mapped.get(key) || {
        guardId: project.guardId,
        guardName: guard?.name || project.guardName,
        monthlySalary: Number(guard?.monthlySalary || 0),
        nbfcs: new Set<string>(), sites: new Set<string>(), present: 0, absent: 0, payableDays: 0, payableSalary: 0,
      };
      if (project.nbfcName) current.nbfcs.add(project.nbfcName);
      if (project.siteName) current.sites.add(project.siteName);
      mapped.set(key, current);
    });
    visibleAttendance.forEach(record => {
      const current = mapped.get(String(record.guardId));
      if (!current) return;
      if (record.status === "Present") current.present += 1;
      if (record.status === "Absent") current.absent += 1;
      current.payableDays += Number(record.payableUnits || 0);
      current.payableSalary += Number(record.payoutAmount || 0);
    });
    return [...mapped.values()].map(item => ({ ...item, nbfcs: [...item.nbfcs].join(", "), sites: [...item.sites].join(", "), perDayRate: item.monthlySalary / daysInMonth })).sort((a, b) => String(a.guardName).localeCompare(String(b.guardName)));
  }, [rows, guards, visibleAttendance, daysInMonth]);

  const exportAttendance = () => {
    if (!rows.length) return triggerToast("Export ke liye attendance rows available nahi hain");
    const csvCell = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;
    const headers = ["NBFC", "Site", "Site Started Date", "Guard Name", "Mobile Number", ...dates.map(date => date.slice(-2)), "Present Days", "Absent Days", "Monthly Salary", "Payable Salary"];
    const lines = rows.map(project => {
      const guard = guards.find(item => String(item.id) === String(project.guardId));
      let present = 0;
      let absent = 0;
      let payableSalary = 0;
      const dailyStatuses = dates.map(date => {
        const record: any = recordMap.get(`${project.sourceSecurityId}-${project.guardId}-${date}`);
        if (record?.status === "Present") present += 1;
        if (record?.status === "Absent") absent += 1;
        payableSalary += Number(record?.payoutAmount || 0);
        return record?.status === "Present" ? "P" : record?.status === "Absent" ? "A" : "-";
      });
      return [project.nbfcName, project.siteName, project.siteStartedDate, project.guardName, project.contactNumber, ...dailyStatuses, present, absent, Number(guard?.monthlySalary || 0).toFixed(2), payableSalary.toFixed(2)].map(csvCell).join(",");
    });
    const csv = `\uFEFF${headers.map(csvCell).join(",")}\n${lines.join("\n")}`;
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `guard-attendance-${month}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportPayoutBreakdown = () => {
    if (!guardPayoutBreakdown.length) return triggerToast("Export ke liye salary data available nahi hai");
    const csvCell = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;
    const headers = ["Guard Name", "NBFC", "Site", "Monthly Salary", "Per-day Rate", "Present Days", "Absent Days", "Payable Days", "Payable Salary"];
    const lines = guardPayoutBreakdown.map(guard => [guard.guardName, guard.nbfcs, guard.sites, Number(guard.monthlySalary).toFixed(2), Number(guard.perDayRate).toFixed(2), guard.present, guard.absent, guard.payableDays, Number(guard.payableSalary).toFixed(2)].map(csvCell).join(","));
    const total = guardPayoutBreakdown.reduce((sum, guard) => sum + Number(guard.payableSalary || 0), 0);
    lines.push(["Total Payable", "", "", "", "", "", "", "", total.toFixed(2)].map(csvCell).join(","));
    const csv = `\uFEFF${headers.map(csvCell).join(",")}\n${lines.join("\n")}`;
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `guard-payable-salary-${month}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const mark = async (project: any, date: string, status: string) => {
    if (!status) return;
    const cellKey = `${project.sourceSecurityId}-${project.guardId}-${date}`;
    const guard = guards.find(item => String(item.id) === String(project.guardId));
    const perDayRate = Number(guard?.monthlySalary || 0) / daysInMonth;
    setSavingCell(cellKey);
    try {
      const response = await fetch("/api/legal-recovery/security/guard-attendance", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ securityId: project.sourceSecurityId, guardId: project.guardId, attendanceDate: date, status, perDayRate, remarks: "Monthly attendance sheet" }) });
      const result = await response.json();
      if (!result.success) return triggerToast(result.error || "Attendance save nahi hui");
      setAttendance(previous => [...previous.filter(record => !(String(record.securityId) === String(project.sourceSecurityId) && String(record.guardId) === String(project.guardId) && record.attendanceDate === date)), result.data]);
    } finally { setSavingCell(""); }
  };

  return <div className="space-y-4">
    <div className="bg-white dark:bg-gray-900 border rounded-xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
      <div><h3 className="text-sm font-bold flex items-center gap-2"><CalendarDays className="w-4 h-4 text-violet-600"/>Monthly Guard Attendance Sheet</h3><p className="text-[10px] text-slate-500 mt-1">Projects ke deployment data se NBFC, site aur guard rows automatic aati hain.</p></div>
      <div className="flex flex-wrap items-center gap-2">
        <label className="relative"><Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400"/><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search..." className="border rounded-lg pl-9 pr-3 py-2 text-xs w-44 max-w-full"/></label>
        <select aria-label="Filter by NBFC" value={nbfcFilter} onChange={event => { setNbfcFilter(event.target.value); setSiteFilter(""); setGuardFilter(""); }} className="border rounded-lg px-3 py-2 text-xs bg-white dark:bg-gray-800 max-w-48"><option value="">All NBFCs</option>{nbfcOptions.map(value => <option key={value} value={value}>{value}</option>)}</select>
        <select aria-label="Filter by site" value={siteFilter} onChange={event => { setSiteFilter(event.target.value); setGuardFilter(""); }} className="border rounded-lg px-3 py-2 text-xs bg-white dark:bg-gray-800 max-w-48"><option value="">All Sites</option>{siteOptions.map(value => <option key={value} value={value}>{value}</option>)}</select>
        <select aria-label="Filter by guard" value={guardFilter} onChange={event => setGuardFilter(event.target.value)} className="border rounded-lg px-3 py-2 text-xs bg-white dark:bg-gray-800 max-w-44"><option value="">All Guards</option>{guardOptions.map(guard => <option key={guard.id} value={guard.id}>{guard.name}</option>)}</select>
        <input type="month" value={month} onChange={event => setMonth(event.target.value)} className="border rounded-lg px-3 py-2 text-xs bg-white dark:bg-gray-800"/>
        <button type="button" onClick={exportAttendance} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 text-xs font-bold"><Download className="w-3.5 h-3.5"/>Export CSV</button>
      </div>
    </div>

    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <div className="bg-white border rounded-xl p-3"><p className="text-[9px] uppercase font-bold text-slate-400">Mapped Guards</p><b className="text-lg">{rows.length}</b></div>
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3"><p className="text-[9px] uppercase font-bold text-emerald-600">Present</p><b className="text-lg text-emerald-700">{summary.present}</b></div>
      <div className="bg-rose-50 border border-rose-200 rounded-xl p-3"><p className="text-[9px] uppercase font-bold text-rose-600">Absent</p><b className="text-lg text-rose-700">{summary.absent}</b></div>
      <button type="button" onClick={() => setShowPayoutBreakdown(true)} className="bg-violet-50 border border-violet-200 rounded-xl p-3 text-left hover:border-violet-500 hover:shadow-md transition-all"><p className="text-[9px] uppercase font-bold text-violet-600">Payable Salary · View Breakdown</p><b className="text-lg text-violet-700 flex items-center"><IndianRupee className="w-4 h-4"/>{money(summary.payout)}</b><span className="text-[9px] text-violet-600 underline">Tap for guard-wise salary</span></button>
    </div>

    <div className="bg-white dark:bg-gray-900 border rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b"><b className="text-xs">{month} · {daysInMonth} Days Attendance</b><p className="text-[9px] text-slate-400">P = Present, A = Absent. Project start date se attendance active hogi.</p></div>
      <div className="overflow-auto max-h-[62vh]"><table className="border-collapse text-[10px] min-w-max w-full">
        <thead className="sticky top-0 z-20 bg-[#F3F0EC] dark:bg-gray-800"><tr>
          <th className="sticky left-0 z-30 bg-[#F3F0EC] dark:bg-gray-800 border-r border-b p-2 text-left min-w-44">NBFC</th>
          <th className="sticky left-44 z-30 bg-[#F3F0EC] dark:bg-gray-800 border-r border-b p-2 text-left min-w-52">Site</th>
          <th className="sticky left-[24rem] z-30 bg-[#F3F0EC] dark:bg-gray-800 border-r border-b p-2 text-left min-w-40">Guard</th>
          {dates.map(date => <th key={date} className="border-r border-b p-1.5 text-center min-w-16"><span className="block font-black">{Number(date.slice(-2))}</span><span className="text-[8px] text-slate-400">{new Date(`${date}T00:00:00`).toLocaleDateString("en-IN", { weekday: "short" })}</span></th>)}
        </tr></thead>
        <tbody>{rows.map(project => <tr key={`${project.sourceSecurityId}-${project.guardId}`} className="border-b">
          <td className="sticky left-0 z-10 bg-white dark:bg-gray-900 border-r p-2 font-bold min-w-44">{project.nbfcName}</td>
          <td className="sticky left-44 z-10 bg-white dark:bg-gray-900 border-r p-2 min-w-52"><b>{project.siteName}</b><span className="block text-[8px] text-slate-400">Started: {project.siteStartedDate}</span></td>
          <td className="sticky left-[24rem] z-10 bg-white dark:bg-gray-900 border-r p-2 min-w-40"><b>{project.guardName}</b><span className="block text-[8px] text-slate-400">{project.contactNumber || ""}</span></td>
          {dates.map(date => {
            const key = `${project.sourceSecurityId}-${project.guardId}-${date}`;
            const record: any = recordMap.get(key);
            const beforeStart = Boolean(project.siteStartedDate && date < project.siteStartedDate);
            const presentLocked = record?.status === "Present" && presentLockActive;
            return <td key={date} className={`border-r p-1 text-center ${beforeStart ? "bg-slate-100" : record?.status === "Present" ? "bg-emerald-50" : record?.status === "Absent" ? "bg-rose-50" : ""}`}>
              {beforeStart ? <span className="text-slate-300">—</span> : <select aria-label={`${project.guardName} ${date} attendance`} title={presentLocked ? "Present attendance month-end tak locked hai" : undefined} disabled={savingCell === key || presentLocked} value={record?.status || ""} onChange={event => mark(project, date, event.target.value)} className={`w-12 rounded border px-1 py-1 text-[9px] font-bold disabled:opacity-60 disabled:cursor-not-allowed ${record?.status === "Present" ? "text-emerald-700 border-emerald-300" : record?.status === "Absent" ? "text-rose-700 border-rose-300" : "text-slate-500"}`}><option value="">-</option><option value="Present">P</option><option value="Absent">A</option></select>}
            </td>;
          })}
        </tr>)}{!rows.length && <tr><td colSpan={daysInMonth + 3} className="p-10 text-center text-slate-400">Guard Deployment se mapped projects abhi available nahi hain.</td></tr>}</tbody>
      </table></div>
    </div>
    <div className="flex flex-wrap gap-4 text-[10px] text-slate-500"><span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600"/>Present = 1 payable day</span><span className="flex items-center gap-1"><XCircle className="w-3.5 h-3.5 text-rose-600"/>Absent = 0 payable day</span><span>Saved Present month-end tak locked rahegi.</span></div>
    {showPayoutBreakdown && <div className="fixed inset-0 z-[99999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowPayoutBreakdown(false)}>
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border w-full max-w-6xl max-h-[85vh] overflow-hidden" onClick={event => event.stopPropagation()}>
        <div className="p-4 border-b flex items-center justify-between gap-3"><div><h3 className="font-bold text-base">Guard-wise Payable Salary</h3><p className="text-[10px] text-slate-500">{month} · Monthly salary aur marked attendance ke according</p></div><div className="flex items-center gap-2"><button type="button" onClick={exportPayoutBreakdown} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 text-xs font-bold"><Download className="w-3.5 h-3.5"/>Export CSV</button><button type="button" aria-label="Close salary breakdown" onClick={() => setShowPayoutBreakdown(false)} className="p-2 rounded-lg hover:bg-slate-100"><X className="w-5 h-5"/></button></div></div>
        <div className="overflow-auto max-h-[65vh]"><table className="w-full min-w-max text-xs border-collapse"><thead className="sticky top-0 bg-[#F3F0EC] dark:bg-gray-800"><tr>{["#", "Guard Name", "NBFC", "Site", "Monthly Salary", "Per-day Rate", "Present", "Absent", "Payable Days", "Payable Salary"].map(header => <th key={header} className="text-left p-3 border-r border-b uppercase text-[9px]">{header}</th>)}</tr></thead><tbody>{guardPayoutBreakdown.map((guard, index) => <tr key={guard.guardId} className="border-b"><td className="p-3 border-r">{index + 1}</td><td className="p-3 border-r font-bold">{guard.guardName}</td><td className="p-3 border-r">{guard.nbfcs || "-"}</td><td className="p-3 border-r">{guard.sites || "-"}</td><td className="p-3 border-r text-right font-bold">₹{money(guard.monthlySalary)}</td><td className="p-3 border-r text-right">₹{money(guard.perDayRate)}</td><td className="p-3 border-r text-center font-bold text-emerald-700">{guard.present}</td><td className="p-3 border-r text-center font-bold text-rose-700">{guard.absent}</td><td className="p-3 border-r text-center font-bold">{guard.payableDays}</td><td className="p-3 text-right font-black text-violet-700">₹{money(guard.payableSalary)}</td></tr>)}{!guardPayoutBreakdown.length && <tr><td colSpan={10} className="p-8 text-center text-slate-400">No mapped guards found.</td></tr>}</tbody><tfoot className="sticky bottom-0 bg-violet-50"><tr><td colSpan={9} className="p-3 text-right font-bold">Total Payable</td><td className="p-3 text-right font-black text-violet-700">₹{money(guardPayoutBreakdown.reduce((sum, guard) => sum + guard.payableSalary, 0))}</td></tr></tfoot></table></div>
      </div>
    </div>}
  </div>;
}
