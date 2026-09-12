"use client";

import { useState } from "react";
import { INVOICE_COLLECTION_STATUSES, collectionRemarkRequired, validateCollectionUpdate } from "@/lib/invoice-collection";

export default function InvoiceCollectionModal({ invoice, initialStatus, onSaved, onClose }: {
  invoice: any;
  initialStatus: string;
  onSaved: (invoice: any) => void;
  onClose: () => void;
}) {
  const [status, setStatus] = useState(initialStatus);
  const [remark, setRemark] = useState(String(invoice.collectionRemark || ""));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const required = collectionRemarkRequired(status);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (saving) return;
    const validationError = validateCollectionUpdate(status, remark);
    if (validationError) { setError(validationError); return; }
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/legal-recovery/import-bills", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: invoice.id, collectionStatus: status, collectionRemark: remark }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || "Collection update could not be saved");
      onSaved(result.data);
      onClose();
    } catch (error: any) {
      setError(error.message);
    } finally { setSaving(false); }
  };

  return <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
    <form onSubmit={save} role="dialog" aria-modal="true" aria-labelledby="collection-title" className="w-full max-w-lg space-y-4 rounded-2xl bg-white p-5 shadow-2xl">
      <div><h4 id="collection-title" className="font-bold text-slate-900">Update Invoice Collection</h4><p className="mt-1 text-xs text-slate-500">{invoice.invoiceNo} · {invoice.bankName} · {invoice.branchName}</p></div>
      <label className="block text-xs font-bold text-slate-700">Collection Status<select value={status} disabled={saving} onChange={event => setStatus(event.target.value)} className="mt-1 w-full rounded-lg border p-2.5">{INVOICE_COLLECTION_STATUSES.map(option => <option key={option}>{option}</option>)}</select></label>
      <label className="block text-xs font-bold text-slate-700">Collection Remark {required ? "*" : "(optional)"}<textarea autoFocus required={required} maxLength={2000} disabled={saving} value={remark} onChange={event => setRemark(event.target.value)} rows={4} placeholder="Reason / payment collection details" className="mt-1 w-full rounded-lg border p-2.5 font-normal"/></label>
      <p className="text-xs text-slate-500">This update will be saved with your name and the update date.</p>
      {error && <p role="alert" className="text-xs text-rose-600">{error}</p>}
      <div className="flex justify-end gap-2"><button type="button" onClick={onClose} disabled={saving} className="rounded-lg border px-4 py-2 text-xs font-bold">Cancel</button><button type="submit" disabled={saving} className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-50">{saving ? "Saving..." : "Save Collection Update"}</button></div>
    </form>
  </div>;
}
