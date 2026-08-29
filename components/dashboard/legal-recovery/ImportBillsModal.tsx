"use client";
import React, { useState } from "react";
import * as XLSX from "xlsx";
import { AlertTriangle, CheckCircle2, Download, Loader2, Upload, X } from "lucide-react";

const fieldAliases: Record<string, string> = {
  company: "company", bank: "bank", billdate: "billDate", invoiceno: "invoiceNo", invoice: "invoiceNo",
  billno: "invoiceNo", billnumber: "invoiceNo",
  branch: "branch", brcode: "branchCode", branchcode: "branchCode", billamount: "billAmount",
  pmtrect: "paymentReceivedDate", pmtrectdate: "paymentReceivedDate", paymentreceiveddate: "paymentReceivedDate", receive: "receivedAmount",
  receiveamount: "receivedAmount", receivedamount: "receivedAmount", tds: "tds", tdspercent: "tdsPercent", due: "dueAmount",
  dueamount: "dueAmount", remark: "remark", status: "status", revenuetype: "revenueType",
  revenueic: "revenueType", revenueicremark: "internalRemark",
  revenueamount: "revenueAmount", internalremark: "internalRemark", khushal: "internalRemark",
  khushalremark: "internalRemark", priyankaremark: "internalRemark", assignedto: "assignedTo",
};
const keyOf = (value: unknown) => String(value ?? "").toLowerCase().replace(/%/g, "percent").replace(/[^a-z0-9]/g, "");

export default function ImportBillsModal({ onClose, onImported }: { onClose: () => void; onImported: () => void }) {
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<any[]>([]);
  const [result, setResult] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const validate = async (inputRows: any[]) => {
    setBusy(true); setError(""); setResult(null);
    try {
      const response = await fetch("/api/legal-recovery/import-bills", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rows: inputRows, commit: false }) });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || "Validation failed");
      setResult(data);
    } catch (e: any) { setError(e.message || "Unable to validate file"); }
    finally { setBusy(false); }
  };

  const selectFile = async (file?: File) => {
    if (!file) return;
    setFileName(file.name); setError(""); setResult(null);
    try {
      const workbook = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: true });
      const parsed: any[] = [];
      const importSheets = workbook.SheetNames.filter(name => ["cfi", "raa", "radv"].includes(name.trim().toLowerCase()));
      if (!importSheets.length && workbook.SheetNames.length === 1) importSheets.push(workbook.SheetNames[0]);
      importSheets.forEach(sheetName => {
        const matrix = XLSX.utils.sheet_to_json<any[]>(workbook.Sheets[sheetName], { header: 1, defval: "", raw: true });
        if (!matrix.length) return;
        const headers = matrix[0].map(keyOf);
        matrix.slice(1).forEach(values => {
          if (!values.some((v: any) => String(v ?? "").trim())) return;
          const row: any = { sourceSheet: sheetName };
          headers.forEach((header: string, index: number) => { const field = fieldAliases[header]; if (field) row[field] = values[index]; });
          row.company = row.company || (["cfi", "raa", "radv"].includes(sheetName.toLowerCase()) ? sheetName : "");
          parsed.push(row);
        });
      });
      if (!parsed.length) throw new Error("No rows found. The workbook must contain CFI, RAA or RADV sheets with headers in row 1.");
      setRows(parsed);
      await validate(parsed);
    } catch (e: any) { setRows([]); setError(e.message || "Invalid Excel/CSV file"); }
  };

  const importValid = async () => {
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/legal-recovery/import-bills", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rows, commit: true }) });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || "Import failed");
      setResult(data); onImported();
    } catch (e: any) { setError(e.message || "Import failed"); }
    finally { setBusy(false); }
  };

  return <div className="fixed inset-0 z-[100] bg-slate-950/45 p-4 flex items-center justify-center">
    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
      <div className="p-5 border-b flex items-center justify-between"><div><h3 className="font-serif text-xl font-bold text-slate-900">Import Legal Recovery Bills</h3><p className="text-xs text-slate-500 mt-1">Company, bank and branch are validated before anything is saved.</p></div><button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100"><X className="w-5 h-5" /></button></div>
      <div className="p-5 overflow-y-auto space-y-4">
        <div className="flex flex-wrap gap-3 items-center">
          <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-600 text-white text-xs font-bold cursor-pointer hover:bg-emerald-700"><Upload className="w-4 h-4" /> Select Excel / CSV<input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={e => selectFile(e.target.files?.[0])} /></label>
          <a href="/templates/Legal_Recovery_Pending_Bills_Import_Template.xlsx" download className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border text-xs font-bold text-slate-700 hover:bg-slate-50"><Download className="w-4 h-4" /> Download Template</a>
          {fileName && <span className="text-xs font-semibold text-slate-600">{fileName}</span>}
        </div>
        {busy && <div className="py-10 flex justify-center items-center gap-2 text-sm font-bold text-slate-600"><Loader2 className="w-5 h-5 animate-spin" /> Processing file...</div>}
        {error && <div className="rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs font-bold text-rose-700 flex gap-2"><AlertTriangle className="w-4 h-4 shrink-0" />{error}</div>}
        {result && !busy && <>
          <div className="grid grid-cols-3 gap-3"><div className="rounded-xl bg-slate-50 border p-3"><p className="text-[10px] uppercase font-bold text-slate-500">Total Rows</p><b className="text-xl">{result.summary.total}</b></div><div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3"><p className="text-[10px] uppercase font-bold text-emerald-700">Ready / Auto-create</p><b className="text-xl text-emerald-700">{result.summary.valid}</b></div><div className="rounded-xl bg-rose-50 border border-rose-200 p-3"><p className="text-[10px] uppercase font-bold text-rose-700">Needs Correction</p><b className="text-xl text-rose-700">{result.summary.invalid}</b></div></div>
          {result.summary.fileTotals && <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <div className="rounded-lg border p-2.5"><p className="text-[9px] font-bold uppercase text-slate-500">Bill Amount (F)</p><b className="text-sm">₹{Number(result.summary.fileTotals.billAmount).toLocaleString("en-IN", { maximumFractionDigits: 2 })}</b></div>
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-2.5"><p className="text-[9px] font-bold uppercase text-emerald-700">Receive Amount (H)</p><b className="text-sm text-emerald-700">₹{Number(result.summary.fileTotals.receivedAmount).toLocaleString("en-IN", { maximumFractionDigits: 2 })}</b></div>
            <div className="rounded-lg border p-2.5"><p className="text-[9px] font-bold uppercase text-slate-500">TDS (I)</p><b className="text-sm">₹{Number(result.summary.fileTotals.tdsAmount).toLocaleString("en-IN", { maximumFractionDigits: 2 })}</b></div>
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-2.5"><p className="text-[9px] font-bold uppercase text-rose-700">Pending Status Due (K)</p><b className="text-sm text-rose-700">₹{Number(result.summary.fileTotals.pendingAmount).toLocaleString("en-IN", { maximumFractionDigits: 2 })}</b></div>
          </div>}
          {result.summary.imported > 0 && <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-sm font-bold text-emerald-700 flex gap-2"><CheckCircle2 className="w-5 h-5" />{result.summary.imported} bills imported successfully.</div>}
          <div className="border rounded-xl overflow-auto max-h-80"><table className="w-full text-[11px]"><thead className="sticky top-0 bg-slate-100"><tr>{["Row","Company","Bank","Branch","Invoice","Bill","Received","TDS","Due","Result"].map(h => <th key={h} className="text-left p-2 border-b whitespace-nowrap">{h}</th>)}</tr></thead><tbody>{result.rows.map((r: any) => <tr key={`${r.sourceSheet}-${r.rowNumber}`} className={r.errors.length ? "bg-rose-50" : r.warnings?.length ? "bg-amber-50" : "bg-white"}><td className="p-2 border-b">{r.sourceSheet}:{r.rowNumber}</td><td className="p-2 border-b">{r.company || "—"}</td><td className="p-2 border-b">{r.bank || "—"}</td><td className="p-2 border-b">{r.branch || "—"}</td><td className="p-2 border-b font-semibold">{r.invoiceNo || "—"}</td><td className="p-2 border-b">₹{Number(r.billAmount).toLocaleString("en-IN")}</td><td className="p-2 border-b text-emerald-700 font-semibold">₹{Number(r.receivedAmount).toLocaleString("en-IN")}</td><td className="p-2 border-b">₹{Number(r.tdsAmount).toLocaleString("en-IN")}</td><td className="p-2 border-b">₹{Number(r.dueAmount).toLocaleString("en-IN")}</td><td className={`p-2 border-b font-bold ${r.errors.length ? "text-rose-700" : r.warnings?.length ? "text-amber-700" : "text-emerald-700"}`}>{r.errors.length ? r.errors.join("; ") : r.warnings?.length ? r.warnings.join("; ") : "Matched"}</td></tr>)}</tbody></table></div>
        </>}
      </div>
      <div className="p-4 border-t flex justify-end gap-2"><button onClick={onClose} className="px-4 py-2 rounded-lg bg-slate-100 text-xs font-bold">Close</button>{result?.summary?.valid > 0 && !result?.summary?.imported && <button disabled={busy} onClick={importValid} className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-xs font-bold disabled:opacity-50">Import {result.summary.valid} Matched Rows</button>}</div>
    </div>
  </div>;
}
