"use client";

import React, { useEffect, useMemo, useState } from "react";
import { FileSpreadsheet, Search } from "lucide-react";
const statuses = ["Ongoing", "Stuck", "Completed"];

export default function SecurityProjectsView({ triggerToast }: { triggerToast: (message: string) => void }) {
  const [projects, setProjects] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const load = async () => {
    const projectsResult = await fetch("/api/legal-recovery/security/projects").then(response => response.json());
    if (projectsResult.success) setProjects(projectsResult.data || []);
  };
  useEffect(() => { load().catch(() => triggerToast("Project register load nahi hua")); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const grouped = new Map<string, any>();
    projects.forEach(project => {
      const key = project.sourceSecurityId ? `source-${project.sourceSecurityId}` : `project-${project.id}`;
      const existing = grouped.get(key);
      if (!existing) {
        grouped.set(key, { ...project, projectIds: [project.id], guardNames: [project.guardName].filter(Boolean), contactNumbers: [project.contactNumber].filter(Boolean), statuses: [project.status] });
      } else {
        existing.projectIds.push(project.id);
        if (project.guardName && !existing.guardNames.includes(project.guardName)) existing.guardNames.push(project.guardName);
        if (project.contactNumber && !existing.contactNumbers.includes(project.contactNumber)) existing.contactNumbers.push(project.contactNumber);
        existing.statuses.push(project.status);
        if (project.siteStartedDate && project.siteStartedDate < existing.siteStartedDate) existing.siteStartedDate = project.siteStartedDate;
      }
    });
    const combined = [...grouped.values()].map(project => ({
      ...project,
      guardName: project.guardNames.join(", "),
      contactNumber: project.contactNumbers.join(", "),
      status: project.statuses.every((item: string) => item === project.statuses[0]) ? project.statuses[0] : "Ongoing",
    }));
    return needle ? combined.filter(project => [project.nbfcName, project.siteName, project.guardName, project.contactNumber, project.status].some(value => String(value || "").toLowerCase().includes(needle))) : combined;
  }, [projects, search]);
  const changeStatus = async (ids: number[], status: string) => {
    setProjects(previous => previous.map(project => ids.includes(project.id) ? { ...project, status } : project));
    const results = await Promise.all(ids.map(id => fetch("/api/legal-recovery/security/projects", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status }) }).then(response => response.json())));
    if (results.every(result => result.success)) triggerToast(`Project aur sabhi guards ka status ${status} ho gaya`);
    else { triggerToast("Kuch guard mappings ka status update nahi hua"); await load(); }
  };
  return <div className="space-y-5">
    <div className="bg-white dark:bg-gray-900 border rounded-xl overflow-hidden">
      <div className="p-3 flex flex-col sm:flex-row justify-between gap-3 border-b"><div><h3 className="text-sm font-bold flex items-center gap-2"><FileSpreadsheet className="w-4 h-4 text-emerald-600"/>Projects Excel Register</h3><p className="text-[9px] text-slate-400">Guard Deployment se auto-mapped · {filtered.length} project entries</p></div><label className="relative"><Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400"/><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search NBFC, site, guard..." className="border rounded-lg pl-9 pr-3 py-2 text-xs w-72 max-w-full"/></label></div>
      <div className="overflow-x-auto"><table className="w-full text-xs border-collapse"><thead className="bg-[#F3F0EC] dark:bg-gray-800 text-[9px] uppercase"><tr>{["#", "NBFC Name", "Site Name", "Started Date", "Guards", "Contact Numbers", "Status"].map(title => <th key={title} className="text-left p-3 border-r last:border-r-0 whitespace-nowrap">{title}</th>)}</tr></thead><tbody>{filtered.map((project, index) => <tr key={project.sourceSecurityId || project.id} className="border-t hover:bg-slate-50 dark:hover:bg-gray-800/50"><td className="p-3 border-r">{index + 1}</td><td className="p-3 border-r font-bold">{project.nbfcName}</td><td className="p-3 border-r">{project.siteName}</td><td className="p-3 border-r whitespace-nowrap">{project.siteStartedDate}</td><td className="p-3 border-r"><b>{project.guardName}</b><span className="block text-[9px] text-slate-400">{project.guardNames.length} guard{project.guardNames.length > 1 ? "s" : ""}</span></td><td className="p-3 border-r">{project.contactNumber || "-"}</td><td className="p-2"><select value={project.status} onChange={event => changeStatus(project.projectIds, event.target.value)} className={`rounded-lg border px-2 py-1.5 text-[10px] font-bold ${project.status === "Completed" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : project.status === "Stuck" ? "bg-rose-50 text-rose-700 border-rose-200" : "bg-amber-50 text-amber-700 border-amber-200"}`}>{statuses.map(status => <option key={status}>{status}</option>)}</select></td></tr>)}{!filtered.length && <tr><td colSpan={7} className="p-8 text-center text-slate-400">No security projects found.</td></tr>}</tbody></table></div>
    </div>
  </div>;
}
