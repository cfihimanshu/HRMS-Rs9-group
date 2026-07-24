import React, { useState } from "react";
import { Search, Filter, RefreshCw, FileText, Banknote, Calendar, Pencil, Trash2, X, Check, Upload } from "lucide-react";

export default function PaymentCollectionsView({ 
  payments, 
  cases, 
  loadingPayments,
  onRefresh,
  triggerToast
}: { 
  payments: any[], 
  cases: any[],
  loadingPayments: boolean,
  onRefresh?: () => void,
  triggerToast?: (msg: string) => void
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [bankFilter, setBankFilter] = useState("");
  const [showFilterOptions, setShowFilterOptions] = useState(false);

  // Edit Modal State
  const [editingPayment, setEditingPayment] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({
    amount: "",
    paymentDate: "",
    paymentMode: "UPI",
    transactionId: "",
    remarks: "",
    proofUrl: "",
  });
  const [submittingEdit, setSubmittingEdit] = useState(false);
  const [uploadingProof, setUploadingProof] = useState(false);

  // Delete Modal State
  const [deletingPayment, setDeletingPayment] = useState<any | null>(null);
  const [submittingDelete, setSubmittingDelete] = useState(false);

  const uniqueBanks = Array.from(new Set(cases.map(c => c.bankName).filter(Boolean)));

  const finalPayments = payments.filter(p => {
    const caseObj = cases.find(c => String(c.id) === String(p.masterId));
    const bankName = p.bankName || caseObj?.bankName || "";
    const branchName = p.branchName || caseObj?.branchName || "";
    
    if (searchQuery && !(
      p.transactionId?.toLowerCase().includes(searchQuery.toLowerCase()) || 
      bankName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      branchName.toLowerCase().includes(searchQuery.toLowerCase())
    )) return false;
    
    if (dateFilter) {
      const pDate = new Date(p.paymentDate || p.createdAt).toISOString().split('T')[0];
      if (pDate !== dateFilter) return false;
    }
    
    if (bankFilter && bankName !== bankFilter) return false;

    return true;
  });

  const totalCollected = finalPayments.reduce((acc, curr) => acc + parseFloat(curr.amount || 0), 0);

  const handleOpenEdit = (p: any) => {
    setEditingPayment(p);
    const pDate = p.paymentDate ? new Date(p.paymentDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
    setEditForm({
      amount: String(p.amount || ""),
      paymentDate: pDate,
      paymentMode: p.paymentMode || "UPI",
      transactionId: p.transactionId || "",
      remarks: p.remarks || "",
      proofUrl: p.proofUrl || "",
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    const formData = new FormData();
    formData.append("file", file);

    setUploadingProof(true);
    try {
      const res = await fetch("/api/documents/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.success && data.url) {
        setEditForm(prev => ({ ...prev, proofUrl: data.url }));
        if (triggerToast) triggerToast("✓ Receipt document uploaded!");
      } else {
        alert("Upload failed: " + (data.error || "Unknown error"));
      }
    } catch (err: any) {
      alert("File upload error: " + err.message);
    } finally {
      setUploadingProof(false);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPayment) return;
    if (!editForm.amount || parseFloat(editForm.amount) <= 0) {
      alert("Please enter a valid payment amount.");
      return;
    }

    setSubmittingEdit(true);
    try {
      const res = await fetch("/api/legal-recovery/payment", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingPayment.id,
          amount: parseFloat(editForm.amount),
          paymentDate: editForm.paymentDate,
          paymentMode: editForm.paymentMode,
          transactionId: editForm.transactionId,
          remarks: editForm.remarks,
          proofUrl: editForm.proofUrl,
        }),
      });

      const result = await res.json();
      if (result.success) {
        if (triggerToast) triggerToast("✓ Collection record updated dynamically!");
        setEditingPayment(null);
        if (onRefresh) onRefresh();
      } else {
        alert("Failed to update payment: " + (result.error || "Unknown error"));
      }
    } catch (err: any) {
      alert("Error updating payment: " + err.message);
    } finally {
      setSubmittingEdit(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingPayment) return;
    setSubmittingDelete(true);
    try {
      const res = await fetch(`/api/legal-recovery/payment?id=${deletingPayment.id}`, {
        method: "DELETE",
      });
      const result = await res.json();
      if (result.success) {
        if (triggerToast) triggerToast("✓ Collection record deleted and pending balance updated!");
        setDeletingPayment(null);
        if (onRefresh) onRefresh();
      } else {
        alert("Failed to delete record: " + (result.error || "Unknown error"));
      }
    } catch (err: any) {
      alert("Error deleting record: " + err.message);
    } finally {
      setSubmittingDelete(false);
    }
  };

  return (
    <div className="bg-[#FCFBF9] border border-[#E8E4DF] rounded-xl shadow-sm p-5 animate-fade-in">
      {/* Header and Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 border-b border-[#E8E4DF] pb-4 gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h3 className="font-serif text-xl text-slate-800 flex items-center gap-2">
              <Banknote className="w-5 h-5 text-emerald-600" /> Collections Report
            </h3>
            <span className="text-xs font-bold text-slate-600 bg-slate-100 border border-slate-200 px-3 py-1 rounded-xl">
              Showing <strong className="text-emerald-700">{finalPayments.length}</strong> of <strong className="text-slate-800">{payments.length}</strong> collections
            </span>
          </div>
          <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mt-1">All payments received</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          {/* Direct Date Filter */}
          <input 
            type="date" 
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-3 py-1.5 border border-[#E8E4DF] rounded-lg text-[10px] uppercase font-bold tracking-wider text-slate-600 bg-white shadow-sm focus:outline-none focus:border-indigo-400"
          />

          <div className="relative">
            <button 
              onClick={() => setShowFilterOptions(!showFilterOptions)}
              className={`px-3 py-1.5 border border-[#E8E4DF] hover:bg-[#F5F0EA] rounded-lg text-[10px] font-semibold tracking-wider uppercase transition-all flex items-center gap-1.5 shadow-sm ${showFilterOptions || bankFilter ? 'bg-[#F5F0EA] text-[#1C1C1A]' : 'bg-[#FCFBF9] text-[#5D5B57]'}`}
            >
              <Filter className="w-3.5 h-3.5" /> {bankFilter ? "Filtered" : "Filter"}
            </button>
            
            {showFilterOptions && (
              <div className="absolute right-0 top-full mt-1.5 w-72 bg-white border border-[#E8E4DF] rounded-xl shadow-2xl z-50 overflow-hidden animate-fade-in p-4 grid gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Bank</label>
                  <select value={bankFilter} onChange={e => setBankFilter(e.target.value)} className="w-full text-xs p-2.5 border border-[#E8E4DF] rounded-lg bg-slate-50 focus:outline-none focus:border-indigo-400 font-semibold text-slate-700">
                    <option value="">All Banks</option>
                    {uniqueBanks.map(b => <option key={String(b)} value={String(b)}>{String(b)}</option>)}
                  </select>
                </div>
                
                <div className="flex justify-end mt-2 pt-3 border-t border-slate-100">
                  <button onClick={() => {
                    setBankFilter("");
                    setDateFilter("");
                    setShowFilterOptions(false);
                  }} className="text-[10px] text-rose-600 font-bold uppercase tracking-wider hover:underline flex items-center gap-1">
                    <RefreshCw className="w-3 h-3" /> Clear Filters
                  </button>
                </div>
              </div>
            )}
          </div>

          <span className="px-3 py-1.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-lg border border-emerald-200 ml-2">
            Total: ₹{totalCollected.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>
      
      {/* Search Input */}
      <div className="mb-4">
        <div className="bg-white border border-[#E8E4DF] p-3 rounded-lg flex items-center gap-3">
          <Search className="w-4 h-4 text-[#9C9890]" />
          <input 
            type="text" 
            className="bg-transparent border-none focus:outline-none text-xs w-full font-semibold text-slate-700 placeholder:text-[#9C9890] placeholder:font-normal" 
            placeholder="Search by bank name, branch, or transaction ID..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {loadingPayments ? (
        <div className="text-center py-12 text-[#9C9890] text-xs flex flex-col items-center gap-2">
          <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" /> Loading collections...
        </div>
      ) : finalPayments.length === 0 ? (
        <div className="text-center py-12 text-[#9C9890] text-xs uppercase tracking-wider">No collections found.</div>
      ) : (
        <div className="overflow-x-auto border border-[#E8E4DF] rounded-xl">
          <table className="w-full text-left border-collapse min-w-max">
            <thead>
              <tr className="bg-[#F5F0EA]/40 text-[#5D5B57] text-[10px] uppercase font-bold tracking-wider border-b border-[#E8E4DF]">
                <th className="p-4">Bank Details</th>
                <th className="p-4">Payment Info</th>
                <th className="p-4">Amount</th>
                <th className="p-4 text-center">Proof</th>
                <th className="p-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8E4DF] bg-white text-xs">
              {finalPayments.map(p => {
                const caseObj = cases.find(c => String(c.id) === String(p.masterId));
                const bankName = p.bankName || caseObj?.bankName || "Unknown Bank";
                const branchName = p.branchName || caseObj?.branchName || "N/A";
                return (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4">
                      <div className="font-bold text-slate-800">{bankName}</div>
                      <div className="text-slate-500 mt-1">{branchName} {caseObj?.branchId ? `(${caseObj.branchId})` : ''}</div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-[10px]">{p.paymentMode}</span>
                        <span className="text-slate-500 text-[10px] flex items-center gap-1"><Calendar className="w-3 h-3"/> {new Date(p.paymentDate || p.createdAt).toLocaleDateString()}</span>
                      </div>
                      <div className="text-slate-600 font-mono text-[10px] mt-1">Ref/UTR: {p.transactionId || 'N/A'}</div>
                      {p.remarks && <div className="text-slate-500 text-[10px] mt-1 italic">"{p.remarks}"</div>}
                    </td>
                    <td className="p-4">
                      <div className="font-bold text-emerald-600 text-sm">₹{parseFloat(p.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                      <div className="text-[9px] uppercase tracking-wider font-semibold text-slate-400 mt-1">By: {p.receivedBy}</div>
                    </td>
                    <td className="p-4 text-center">
                      {p.proofUrl ? (
                        <a href={p.proofUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-50 text-sky-700 border border-sky-200 hover:bg-sky-600 hover:text-white rounded-lg text-[10px] font-bold uppercase tracking-wide transition-colors">
                          <FileText className="w-3.5 h-3.5" /> View Receipt
                        </a>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">No Proof</span>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleOpenEdit(p)}
                          className="p-1.5 text-slate-600 hover:text-amber-700 hover:bg-amber-50 rounded-lg border border-slate-200 hover:border-amber-300 transition-all"
                          title="Edit Collection Record"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeletingPayment(p)}
                          className="p-1.5 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg border border-slate-200 hover:border-rose-300 transition-all"
                          title="Delete Collection Record"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit Collection Modal */}
      {editingPayment && (
        <div className="fixed inset-0 bg-slate-900/25 backdrop-blur-md z-[99999] flex items-center justify-center p-4">
          <form onSubmit={handleSaveEdit} className="bg-[#FCFBF9] border border-[#E8E4DF] rounded-2xl shadow-2xl max-w-lg w-full max-h-[88vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-left my-auto">
            {/* Header */}
            <div className="p-4 bg-white border-b border-[#E8E4DF] text-slate-800 flex items-center justify-between shrink-0">
              <div>
                <h4 className="font-serif font-bold text-sm tracking-wide flex items-center gap-2 text-slate-900">
                  <Pencil className="w-4 h-4 text-emerald-600" /> Edit Payment Collection
                </h4>
                <p className="text-[10px] text-slate-400 font-bold mt-0.5">
                  ID: #{editingPayment.id} • {editingPayment.bankName || "Collection"}
                </p>
              </div>
              <button 
                type="button"
                onClick={() => setEditingPayment(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <div className="p-5 space-y-4 overflow-y-auto max-h-[calc(88vh-130px)] bg-white">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
                  Collection Amount (₹) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  className="w-full p-2.5 border border-[#E8E4DF] rounded-xl text-xs font-bold focus:outline-none focus:border-indigo-500 bg-slate-50/50"
                  value={editForm.amount}
                  onChange={e => setEditForm({ ...editForm, amount: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
                    Payment Date *
                  </label>
                  <input
                    type="date"
                    className="w-full p-2.5 border border-[#E8E4DF] rounded-xl text-xs font-bold focus:outline-none focus:border-indigo-500 bg-slate-50/50"
                    value={editForm.paymentDate}
                    onChange={e => setEditForm({ ...editForm, paymentDate: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
                    Payment Mode *
                  </label>
                  <select
                    className="w-full p-2.5 border border-[#E8E4DF] rounded-xl text-xs font-bold focus:outline-none focus:border-indigo-500 bg-slate-50/50 text-slate-700"
                    value={editForm.paymentMode}
                    onChange={e => setEditForm({ ...editForm, paymentMode: e.target.value })}
                  >
                    <option value="UPI">UPI</option>
                    <option value="NetBanking">NetBanking</option>
                    <option value="NEFT/RTGS">NEFT / RTGS</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Cash">Cash</option>
                    <option value="Card">Card</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
                  Ref / UTR / Transaction ID
                </label>
                <input
                  type="text"
                  placeholder="e.g. UTR129837912"
                  className="w-full p-2.5 border border-[#E8E4DF] rounded-xl text-xs font-bold font-mono focus:outline-none focus:border-indigo-500 bg-slate-50/50"
                  value={editForm.transactionId}
                  onChange={e => setEditForm({ ...editForm, transactionId: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
                  Remarks / Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="Additional remarks..."
                  className="w-full p-2.5 border border-[#E8E4DF] rounded-xl text-xs font-semibold focus:outline-none focus:border-indigo-500 bg-slate-50/50"
                  value={editForm.remarks}
                  onChange={e => setEditForm({ ...editForm, remarks: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
                  Receipt Document Proof
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Document URL..."
                    className="flex-1 p-2.5 border border-[#E8E4DF] rounded-xl text-xs font-mono focus:outline-none focus:border-indigo-500 bg-slate-50/50"
                    value={editForm.proofUrl}
                    onChange={e => setEditForm({ ...editForm, proofUrl: e.target.value })}
                  />
                  <label className="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 border border-[#E8E4DF] rounded-xl text-xs font-bold text-slate-700 cursor-pointer transition-colors shrink-0 flex items-center gap-1">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{uploadingProof ? "..." : "Upload"}</span>
                    <input type="file" onChange={handleFileUpload} className="hidden" accept="image/*,.pdf" />
                  </label>
                </div>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="p-4 border-t border-[#E8E4DF] bg-[#FCFBF9] shrink-0 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingPayment(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200/60 rounded-xl transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submittingEdit}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" /> {submittingEdit ? "Updating..." : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingPayment && (
        <div className="fixed inset-0 bg-slate-900/25 backdrop-blur-md z-[99999] flex items-center justify-center p-4">
          <div className="bg-[#FCFBF9] border border-[#E8E4DF] rounded-2xl shadow-2xl max-w-sm w-full p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150 text-left my-auto">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 flex items-center justify-center shrink-0 border border-rose-100">
                <Trash2 className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-800">Delete Collection Record?</h4>
                <p className="text-[11px] text-slate-400 font-semibold mt-0.5">This action will adjust the master pending balance.</p>
              </div>
            </div>

            <div className="p-3 bg-white rounded-xl border border-[#E8E4DF] text-xs font-semibold space-y-1">
              <p><strong>Bank:</strong> {deletingPayment.bankName || "Collection"}</p>
              <p><strong>Amount:</strong> ₹{parseFloat(deletingPayment.amount || "0").toLocaleString('en-IN')}</p>
              <p><strong>Date:</strong> {new Date(deletingPayment.paymentDate || deletingPayment.createdAt).toLocaleDateString()}</p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E8E4DF]">
              <button
                type="button"
                onClick={() => setDeletingPayment(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submittingDelete}
                onClick={handleDeleteConfirm}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
              >
                {submittingDelete ? "Deleting..." : "Confirm Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
