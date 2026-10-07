"use client";

import React, { useEffect, useMemo, useState } from "react";
import { FileSpreadsheet, PlusCircle, Save, Search, Trash2, UserPlus, X } from "lucide-react";
const statuses = ["Ongoing", "Stuck", "Completed"];
const emptyDeployment = { nbfcId: "", nbfcName: "", siteName: "", siteStartedDate: "", status: "Ongoing" };
const emptyGuardRow = { mode: "existing", guardId: "", name: "", phone: "", monthlySalary: "" };

export default function SecurityProjectsView({ triggerToast, userRole }: { triggerToast: (message: string) => void; userRole?: string }) {
  const [projects, setProjects] = useState<any[]>([]);
  const [guards, setGuards] = useState<any[]>([]);
  const [nbfcs, setNbfcs] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [deploymentForm, setDeploymentForm] = useState(emptyDeployment);
  const [guardRows, setGuardRows] = useState([{ ...emptyGuardRow }]);
  const [savingDeployment, setSavingDeployment] = useState(false);
  const isOwner = /owner|director/i.test(String(userRole || ""));
  const load = async () => {
    const [projectsResult, guardsResult, nbfcsResult] = await Promise.all([
      fetch("/api/legal-recovery/security/projects", { cache: "no-store" }).then(response => response.json()),
      fetch("/api/legal-recovery/guards", { cache: "no-store" }).then(response => response.json()),
      fetch("/api/legal-recovery/nbfc", { cache: "no-store" }).then(response => response.json()),
    ]);
    if (projectsResult.success) setProjects(projectsResult.data || []);
    if (guardsResult.success) setGuards(guardsResult.data || []);
    if (nbfcsResult.success) setNbfcs(nbfcsResult.data || []);
  };
  useEffect(() => { load().catch(() => triggerToast("Project register load nahi hua")); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const grouped = new Map<string, any>();
    projects.forEach(project => {
      const key = project.sourceSecurityId ? `source-${project.sourceSecurityId}` : `project-${project.id}`;
      const existing = grouped.get(key);
      if (!existing) {
        grouped.set(key, { ...project, projectIds: [project.id], guardNames: [project.guardName].filter(Boolean), contactNumbers: [project.contactNumber].filter(Boolean), guardSalaries: [project.monthlySalary].filter((value: unknown) => Number(value) > 0), statuses: [project.status] });
      } else {
        existing.projectIds.push(project.id);
        if (project.guardName && !existing.guardNames.includes(project.guardName)) existing.guardNames.push(project.guardName);
        if (project.contactNumber && !existing.contactNumbers.includes(project.contactNumber)) existing.contactNumbers.push(project.contactNumber);
        if (Number(project.monthlySalary) > 0) existing.guardSalaries.push(project.monthlySalary);
        existing.statuses.push(project.status);
        if (project.siteStartedDate && project.siteStartedDate < existing.siteStartedDate) existing.siteStartedDate = project.siteStartedDate;
      }
    });
    const combined = [...grouped.values()].map(project => ({
      ...project,
      guardName: project.guardNames.join(", "),
      contactNumber: project.contactNumbers.join(", "),
      salaryLabel: project.guardSalaries.map((value: unknown) => `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`).join(", "),
      status: project.statuses.every((item: string) => item === project.statuses[0]) ? project.statuses[0] : "Ongoing",
    }));
    return needle ? combined.filter(project => [project.nbfcName, project.siteName, project.guardName, project.contactNumber, project.status].some(value => String(value || "").toLowerCase().includes(needle))) : combined;
  }, [projects, search]);
  const removeProjects = async (ids: number[], label: string) => {
    if (!ids.length) return;
    if (!window.confirm(`${label} ke ${ids.length} deployment mapping(s) aur unki poori attendance delete kar dein?`)) return;
    const results = await Promise.all(ids.map(id => fetch(`/api/legal-recovery/security/projects?id=${id}`, { method: "DELETE" }).then(response => response.json())));
    if (results.every(result => result.success)) {
      setProjects(previous => previous.filter(project => !ids.includes(project.id)));
      triggerToast("Deployment delete ho gaya");
    } else {
      triggerToast("Kuch mappings delete nahi hue");
      await load();
    }
  };
  const changeStatus = async (ids: number[], status: string) => {
    setProjects(previous => previous.map(project => ids.includes(project.id) ? { ...project, status } : project));
    const results = await Promise.all(ids.map(id => fetch("/api/legal-recovery/security/projects", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status }) }).then(response => response.json())));
    if (results.every(result => result.success)) triggerToast(`Project aur sabhi guards ka status ${status} ho gaya`);
    else { triggerToast("Kuch guard mappings ka status update nahi hua"); await load(); }
  };
  const addDeployment = async (event: React.FormEvent) => {
    event.preventDefault();
    setSavingDeployment(true);
    try {
      const selectedNbfc = nbfcs.find(nbfc => String(nbfc.id) === deploymentForm.nbfcId || String(nbfc.nbfcCode) === deploymentForm.nbfcId);
      const selectedGuards = guardRows
        .map(row => row.mode === "new"
          ? { name: row.name.trim(), phone: row.phone.trim(), monthlySalary: row.monthlySalary }
          : { guardId: row.guardId, monthlySalary: row.monthlySalary })
        .filter(row => ("guardId" in row ? row.guardId : row.name));
      if (!selectedGuards.length) return triggerToast("Kam se kam ek guard add/select karo");
      const payload = {
        ...deploymentForm,
        nbfcId: selectedNbfc?.id || deploymentForm.nbfcId || null,
        nbfcName: selectedNbfc?.nbfcName || deploymentForm.nbfcName,
        guards: selectedGuards,
      };
      const response = await fetch("/api/legal-recovery/security/projects", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const result = await response.json();
      if (!result.success) return triggerToast(result.error || "Deployment save nahi hua");
      triggerToast("Old site deployment add ho gaya. Ab Attendance me month select karke entry lagao.");
      setDeploymentForm(emptyDeployment);
      setGuardRows([{ ...emptyGuardRow }]);
      setShowAddForm(false);
      await load();
    } finally {
      setSavingDeployment(false);
    }
  };
  return <div className="space-y-5">
    <div className="bg-white dark:bg-gray-900 border dark:border-gray-700 rounded-xl p-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold flex items-center gap-2"><PlusCircle className="w-4 h-4 text-violet-600 dark:text-violet-300"/>Add Backdate Site Deployment</h3>
          <p className="text-[9px] text-slate-400 dark:text-gray-400 mt-1">Old site ko yahan map karo; attendance sheet me start date se row active ho jayegi.</p>
        </div>
        <button type="button" onClick={() => setShowAddForm(value => !value)} className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-violet-600 px-3 py-2 text-xs font-bold text-white hover:bg-violet-700"><PlusCircle className="w-3.5 h-3.5"/>{showAddForm ? "Close" : "Add Site"}</button>
      </div>
      {showAddForm && <form onSubmit={addDeployment} className="mt-4 space-y-4 border-t dark:border-gray-700 pt-4">
        <div className="grid md:grid-cols-4 gap-3">
        <label className="text-[10px] uppercase font-bold text-slate-500 dark:text-gray-400">NBFC *
          <input required list="security-nbfc-options" value={deploymentForm.nbfcName} onChange={event => setDeploymentForm({ ...deploymentForm, nbfcName: event.target.value, nbfcId: "" })} className="mt-1 w-full border dark:border-gray-700 rounded-lg px-3 py-2 text-xs normal-case dark:bg-gray-800 dark:text-gray-100 dark:[color-scheme:dark]" placeholder="NBFC name"/>
          <datalist id="security-nbfc-options">{nbfcs.map(nbfc => <option key={nbfc.id || nbfc.nbfcName} value={nbfc.nbfcName} />)}</datalist>
        </label>
        <label className="text-[10px] uppercase font-bold text-slate-500 dark:text-gray-400 md:col-span-2">Site Name / Location *
          <input required value={deploymentForm.siteName} onChange={event => setDeploymentForm({ ...deploymentForm, siteName: event.target.value })} className="mt-1 w-full border dark:border-gray-700 rounded-lg px-3 py-2 text-xs normal-case dark:bg-gray-800 dark:text-gray-100 dark:[color-scheme:dark]" placeholder="Site address or name"/>
        </label>
        <label className="text-[10px] uppercase font-bold text-slate-500 dark:text-gray-400">Start Date *
          <input required type="date" value={deploymentForm.siteStartedDate} onChange={event => setDeploymentForm({ ...deploymentForm, siteStartedDate: event.target.value })} className="mt-1 w-full border dark:border-gray-700 rounded-lg px-3 py-2 text-xs normal-case dark:bg-gray-800 dark:text-gray-100 dark:[color-scheme:dark]"/>
        </label>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h4 className="text-[10px] uppercase font-black text-slate-500 dark:text-gray-400">Guards & Site-wise Rate</h4>
            <button type="button" onClick={() => setGuardRows(rows => [...rows, { ...emptyGuardRow }])} className="inline-flex items-center gap-1.5 rounded-lg border dark:border-gray-700 px-3 py-2 text-[10px] font-bold text-violet-700 dark:text-violet-300 hover:bg-violet-50 dark:hover:bg-violet-950/50"><UserPlus className="w-3.5 h-3.5"/>Add More Guard</button>
          </div>
          {guardRows.map((row, index) => {
            const selectedGuard = guards.find(guard => String(guard.id) === row.guardId);
            const updateRow = (patch: Partial<typeof emptyGuardRow>) => setGuardRows(rows => rows.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item));
            return <div key={index} className="grid md:grid-cols-12 gap-2 rounded-lg border dark:border-gray-700 bg-slate-50/60 p-3 dark:bg-gray-800/40">
              <label className="md:col-span-2 text-[10px] uppercase font-bold text-slate-500 dark:text-gray-400">Type
                <select value={row.mode} onChange={event => updateRow({ ...emptyGuardRow, mode: event.target.value })} className="mt-1 w-full border dark:border-gray-700 rounded-lg px-3 py-2 text-xs normal-case bg-white dark:bg-gray-900 dark:text-gray-100 dark:[color-scheme:dark]"><option value="existing">Existing</option><option value="new">New Guard</option></select>
              </label>
              {row.mode === "existing" ? <label className="md:col-span-4 text-[10px] uppercase font-bold text-slate-500 dark:text-gray-400">Guard *
                <select required value={row.guardId} onChange={event => {
                  const guard = guards.find(item => String(item.id) === event.target.value);
                  updateRow({ guardId: event.target.value, phone: guard?.phone || "", monthlySalary: String(guard?.monthlySalary || "") });
                }} className="mt-1 w-full border dark:border-gray-700 rounded-lg px-3 py-2 text-xs normal-case bg-white dark:bg-gray-900 dark:text-gray-100 dark:[color-scheme:dark]"><option value="">Select guard</option>{guards.filter(guard => String(guard.status || "Active").toLowerCase() !== "inactive").map(guard => <option key={guard.id} value={guard.id}>{guard.name}</option>)}</select>
              </label> : <>
                <label className="md:col-span-3 text-[10px] uppercase font-bold text-slate-500 dark:text-gray-400">Guard Name *
                  <input required value={row.name} onChange={event => updateRow({ name: event.target.value })} className="mt-1 w-full border dark:border-gray-700 rounded-lg px-3 py-2 text-xs normal-case dark:bg-gray-800 dark:text-gray-100 dark:[color-scheme:dark]" placeholder="Guard name"/>
                </label>
                <label className="md:col-span-2 text-[10px] uppercase font-bold text-slate-500 dark:text-gray-400">Mobile
                  <input value={row.phone} onChange={event => updateRow({ phone: event.target.value.replace(/[^0-9+ -]/g, "") })} className="mt-1 w-full border dark:border-gray-700 rounded-lg px-3 py-2 text-xs normal-case dark:bg-gray-800 dark:text-gray-100 dark:[color-scheme:dark]" placeholder="Mobile"/>
                </label>
              </>}
              <label className={`${row.mode === "existing" ? "md:col-span-3" : "md:col-span-2"} text-[10px] uppercase font-bold text-slate-500 dark:text-gray-400`}>Monthly Rate For This Site *
                <input required min="0" step="0.01" type="number" value={row.monthlySalary} onChange={event => updateRow({ monthlySalary: event.target.value })} className="mt-1 w-full border dark:border-gray-700 rounded-lg px-3 py-2 text-xs normal-case dark:bg-gray-800 dark:text-gray-100 dark:[color-scheme:dark]" placeholder={selectedGuard?.monthlySalary ? String(selectedGuard.monthlySalary) : "Monthly salary"}/>
              </label>
              <div className="md:col-span-2 flex items-end gap-2">
                <span className="min-w-0 flex-1 rounded-lg border dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-[10px] text-slate-500 dark:text-gray-400 truncate">{row.mode === "existing" ? selectedGuard?.phone || "No mobile" : "New master"}</span>
                {guardRows.length > 1 && <button type="button" aria-label="Remove guard row" onClick={() => setGuardRows(rows => rows.filter((_, itemIndex) => itemIndex !== index))} className="rounded-lg border dark:border-gray-700 border-rose-200 p-2 text-rose-600 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/50"><X className="w-4 h-4"/></button>}
              </div>
            </div>;
          })}
        </div>
        <div className="flex justify-end">
          <button disabled={savingDeployment} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-60"><Save className="w-3.5 h-3.5"/>{savingDeployment ? "Saving..." : "Save Deployment"}</button>
        </div>
      </form>}
    </div>
    <div className="bg-white dark:bg-gray-900 border dark:border-gray-700 rounded-xl overflow-hidden">
      <div className="p-3 flex flex-col sm:flex-row justify-between gap-3 border-b dark:border-gray-700"><div><h3 className="text-sm font-bold flex items-center gap-2"><FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-300"/>Projects Excel Register</h3><p className="text-[9px] text-slate-400 dark:text-gray-400">Guard Deployment se auto-mapped · {filtered.length} project entries</p></div><label className="relative"><Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400 dark:text-gray-400"/><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search NBFC, site, guard..." className="border dark:border-gray-700 rounded-lg pl-9 pr-3 py-2 text-xs w-72 max-w-full dark:bg-gray-800 dark:text-gray-100 dark:[color-scheme:dark]"/></label></div>
      <div className="overflow-x-auto"><table className="w-full text-xs border-collapse"><thead className="bg-[#F3F0EC] dark:bg-gray-800 text-[9px] uppercase"><tr>{["#", "NBFC Name", "Site Name", "Started Date", "Guards", "Site Salary", "Contact Numbers", "Status", ...(isOwner ? ["Action"] : [])].map(title => <th key={title} className="text-left p-3 border-r last:border-r-0 whitespace-nowrap">{title}</th>)}</tr></thead><tbody>{filtered.map((project, index) => <tr key={project.sourceSecurityId || project.id} className="border-t dark:border-gray-700 hover:bg-slate-50 dark:hover:bg-gray-800/50"><td className="p-3 border-r">{index + 1}</td><td className="p-3 border-r font-bold">{project.nbfcName}</td><td className="p-3 border-r">{project.siteName}</td><td className="p-3 border-r whitespace-nowrap">{project.siteStartedDate}</td><td className="p-3 border-r"><b>{project.guardName}</b><span className="block text-[9px] text-slate-400 dark:text-gray-400">{project.guardNames.length} guard{project.guardNames.length > 1 ? "s" : ""}</span></td><td className="p-3 border-r font-bold whitespace-nowrap">{project.salaryLabel || "-"}</td><td className="p-3 border-r">{project.contactNumber || "-"}</td><td className={`p-2 ${isOwner ? "border-r" : ""}`}><select value={project.status} onChange={event => changeStatus(project.projectIds, event.target.value)} className={`rounded-lg border dark:border-gray-700 px-2 py-1.5 text-[10px] font-bold ${project.status === "Completed" ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200" : project.status === "Stuck" ? "bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-200" : "bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200"}`}>{statuses.map(status => <option key={status}>{status}</option>)}</select></td>{isOwner && <td className="p-2 dark:bg-gray-800 dark:text-gray-100 dark:[color-scheme:dark]"><button type="button" aria-label={`${project.siteName} deployment delete karein`} title="Is site ke sabhi guard mappings aur attendance delete karein" onClick={() => removeProjects(project.projectIds, project.siteName)} className="inline-flex items-center gap-1 rounded-lg border dark:border-gray-700 border-rose-200 px-2 py-1.5 text-[10px] font-bold text-rose-600 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/50"><Trash2 className="w-3.5 h-3.5"/>Delete</button></td>}</tr>)}{!filtered.length && <tr><td colSpan={isOwner ? 9 : 8} className="p-8 text-center text-slate-400 dark:text-gray-400">No security projects found.</td></tr>}</tbody></table></div>
    </div>
  </div>;
}
