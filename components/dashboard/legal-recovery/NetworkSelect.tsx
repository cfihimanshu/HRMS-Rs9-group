"use client";

import { useEffect, useState } from "react";

export default function NetworkSelect({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [options, setOptions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    fetch("/api/legal-recovery/networks", { signal: controller.signal, cache: "no-store" })
      .then(async response => {
        const result = await response.json();
        if (!response.ok || !result.success) throw new Error(result.error || "Network list could not be loaded");
        setOptions(result.data || []);
      })
      .catch(error => { if (!controller.signal.aborted) setError(error.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [reload]);

  const saveNetwork = async () => {
    const trimmed = name.trim();
    if (!trimmed || saving) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/legal-recovery/networks", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: trimmed }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || "Network could not be saved");
      setOptions(current => [...new Set([...current, result.data])]);
      onChange(result.data);
      setAdding(false);
      setName("");
    } catch (error: any) {
      setError(error.message);
    } finally {
      setSaving(false);
    }
  };

  const allOptions = [...new Set([...options, ...(value ? [value] : [])])].sort((a, b) => a.localeCompare(b, "en", { numeric: true }));
  const inputClass = "w-full bg-white border border-[#E8E4DF] focus:border-pink-500 rounded-lg px-3 py-2 text-xs focus:outline-none";
  return <div>
    <div className="flex gap-2">
      <select aria-label="Network" value={value} onChange={event => onChange(event.target.value)} disabled={loading || saving} className={inputClass}>
        <option value="">{loading ? "Loading Networks..." : "Select Network"}</option>
        {allOptions.map(option => <option key={option} value={option}>{option}</option>)}
      </select>
      <button type="button" onClick={() => setAdding(true)} disabled={saving} className="shrink-0 rounded-lg border border-pink-200 px-3 py-2 text-xs font-bold text-pink-600 disabled:opacity-50">+ Add Network</button>
    </div>
    {adding && <div className="mt-2 rounded-lg border border-pink-100 bg-pink-50 p-2 space-y-2">
      <input autoFocus aria-label="New Network name" maxLength={255} value={name} onChange={event => setName(event.target.value)} disabled={saving} placeholder="Enter new Network name" className={inputClass} onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); void saveNetwork(); } }}/>
      <div className="flex justify-end gap-2">
        <button type="button" disabled={saving} onClick={() => { setAdding(false); setName(""); }} className="px-3 py-1.5 text-xs font-bold text-slate-600">Cancel</button>
        <button type="button" disabled={saving || !name.trim()} onClick={saveNetwork} className="rounded-lg bg-pink-600 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50">{saving ? "Saving..." : "Save Network"}</button>
      </div>
    </div>}
    {error && <p role="alert" className="mt-2 text-xs text-rose-600">{error} <button type="button" onClick={() => setReload(current => current + 1)} className="underline">Reload list</button></p>}
  </div>;
}
