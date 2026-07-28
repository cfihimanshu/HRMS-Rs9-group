"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  History,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
} from "lucide-react";

interface AuditChange {
  field: string;
  before: unknown;
  after: unknown;
}

interface AuditEntry {
  id: string;
  action: string;
  entity: string;
  entityId?: string;
  details: string;
  ipAddress?: string;
  timestamp: string;
  changes: AuditChange[];
  user?: { id?: string; name?: string; role?: string; email?: string };
}

function displayValue(value: unknown) {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "object") return JSON.stringify(value, null, 2);
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

function actionStyle(action: string) {
  const upper = action.toUpperCase();
  if (upper.includes("DELETE") || upper.includes("REMOVE"))
    return "bg-red-50 text-red-700 border-red-200";
  if (upper.includes("CREATE") || upper.includes("ADD"))
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (upper.includes("UPDATE") || upper.includes("EDIT"))
    return "bg-blue-50 text-blue-700 border-blue-200";
  return "bg-amber-50 text-amber-700 border-amber-200";
}

export default function AuditTrail() {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [expanded, setExpanded] = useState<string | null>(null);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "25",
      });
      if (query) params.set("search", query);
      if (from) params.set("from", from);
      if (to) params.set("to", to);

      const response = await fetch(`/api/audit?${params.toString()}`, {
        cache: "no-store",
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || "Unable to load audit history");
      }
      setLogs(result.data || []);
      setTotalPages(result.pagination?.totalPages || 1);
      setTotal(result.pagination?.total || 0);
    } catch (loadError: any) {
      setError(loadError.message || "Unable to load audit history");
    } finally {
      setLoading(false);
    }
  }, [from, page, query, to]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const submitSearch = (event: React.FormEvent) => {
    event.preventDefault();
    setPage(1);
    setQuery(search.trim());
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-[#9A7B2F]" />
            <h1 className="text-2xl font-bold text-slate-900">System Audit Trail</h1>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            User actions, affected records, and before/after changes.
          </p>
        </div>
        <button
          type="button"
          onClick={loadLogs}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      <form
        onSubmit={submitSearch}
        className="grid gap-2 rounded-lg border border-slate-200 bg-white p-3 md:grid-cols-[1fr_160px_160px_auto]"
      >
        <label className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search user action, module, record ID..."
            className="h-9 w-full rounded-md border border-slate-300 pl-9 pr-3 text-sm outline-none focus:border-[#C9A84C]"
          />
        </label>
        <input
          type="date"
          value={from}
          onChange={(event) => {
            setPage(1);
            setFrom(event.target.value);
          }}
          aria-label="From date"
          className="h-9 rounded-md border border-slate-300 px-2 text-sm"
        />
        <input
          type="date"
          value={to}
          onChange={(event) => {
            setPage(1);
            setTo(event.target.value);
          }}
          aria-label="To date"
          className="h-9 rounded-md border border-slate-300 px-2 text-sm"
        />
        <button
          type="submit"
          className="h-9 rounded-md bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-800"
        >
          Search
        </button>
      </form>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="min-w-[1050px] text-left text-xs">
          <thead>
            <tr>
              <th>Date &amp; Time</th>
              <th>User</th>
              <th>Action</th>
              <th>Module / Record</th>
              <th>Summary</th>
              <th>IP Address</th>
              <th className="w-20 text-center">Changes</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="h-28 text-center">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin text-slate-500" />
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={7} className="h-28 text-center text-slate-500">
                  No matching audit entries found.
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <>
                  <tr key={log.id}>
                    <td className="whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString("en-IN")}
                    </td>
                    <td>
                      <div className="font-semibold text-slate-800">
                        {log.user?.name || "System"}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {log.user?.role || "System"}
                      </div>
                    </td>
                    <td>
                      <span
                        className={`inline-flex rounded border px-2 py-0.5 font-semibold ${actionStyle(
                          log.action
                        )}`}
                      >
                        {log.action.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td>
                      <div className="font-semibold">{log.entity || "—"}</div>
                      <div className="max-w-40 truncate text-[10px] text-slate-500">
                        {log.entityId || "—"}
                      </div>
                    </td>
                    <td className="max-w-sm">{log.details || "—"}</td>
                    <td className="whitespace-nowrap">{log.ipAddress || "—"}</td>
                    <td className="text-center">
                      {log.changes?.length ? (
                        <button
                          type="button"
                          onClick={() =>
                            setExpanded((current) => (current === log.id ? null : log.id))
                          }
                          className="inline-flex items-center gap-1 rounded border border-slate-300 px-2 py-1 font-semibold hover:bg-slate-50"
                        >
                          {log.changes.length}
                          {expanded === log.id ? (
                            <ChevronUp className="h-3 w-3" />
                          ) : (
                            <ChevronDown className="h-3 w-3" />
                          )}
                        </button>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                  {expanded === log.id && log.changes?.length > 0 && (
                    <tr key={`${log.id}-changes`}>
                      <td colSpan={7} className="bg-slate-50">
                        <div className="flex items-center gap-2 pb-2 font-semibold text-slate-700">
                          <History className="h-4 w-4" />
                          Field-level changes
                        </div>
                        <table className="text-xs">
                          <thead>
                            <tr>
                              <th>Field</th>
                              <th className="text-red-700">Before</th>
                              <th className="text-emerald-700">After</th>
                            </tr>
                          </thead>
                          <tbody>
                            {log.changes.map((change) => (
                              <tr key={change.field}>
                                <td className="font-semibold">{change.field}</td>
                                <td className="max-w-md whitespace-pre-wrap break-all bg-red-50/50">
                                  {displayValue(change.before)}
                                </td>
                                <td className="max-w-md whitespace-pre-wrap break-all bg-emerald-50/50">
                                  {displayValue(change.after)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  )}
                </>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm text-slate-600">
        <span>{total.toLocaleString("en-IN")} audit entries</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={page <= 1 || loading}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            className="rounded border border-slate-300 bg-white p-2 disabled:opacity-40"
            aria-label="Previous audit page"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span>
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages || loading}
            onClick={() => setPage((current) => current + 1)}
            className="rounded border border-slate-300 bg-white p-2 disabled:opacity-40"
            aria-label="Next audit page"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </section>
  );
}
