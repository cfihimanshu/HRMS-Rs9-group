import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { PlusCircle, Search, RefreshCw, FileText, Building, User, Trash2, Edit3, X, Paperclip, CheckCircle, Landmark, Calendar, DollarSign, ArrowRight, Eye, UserCheck } from "lucide-react";

export default function NoticeBoardView({
  banksList = [],
  branchesList = [],
  triggerToast = (msg: string) => alert(msg)
}: {
  banksList: any[];
  branchesList: any[];
  triggerToast?: (msg: string) => void;
}) {
  const [notices, setNotices] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [customNoticeType, setCustomNoticeType] = useState("");
  const [noticeTypes, setNoticeTypes] = useState<any[]>([]);
  const [isAddingType, setIsAddingType] = useState(false);
  const [newNoticeTypeName, setNewNoticeTypeName] = useState("");

  // Handover & View Details States
  const [viewingNotice, setViewingNotice] = useState<any | null>(null);
  const [handoverNotice, setHandoverNotice] = useState<any | null>(null);
  const [handoverForm, setHandoverForm] = useState({
    handoverTo: "",
    handedOverBy: "",
    handoverRemarks: ""
  });
  const [handoverFile, setHandoverFile] = useState<File | null>(null);
  const [submittingHandover, setSubmittingHandover] = useState(false);

  // Billing States
  const [billingNotice, setBillingNotice] = useState<any | null>(null);
  const [billingForm, setBillingForm] = useState({
    billDate: "",
    billNo: "",
    billAmount: "",
    billMailedToBM: false,
    paymentRcvdDate: "",
    amountRcvd: "",
    tdsDeduction: "",
    gstDeduction: "",
    expenses: ""
  });
  const [submittingBilling, setSubmittingBilling] = useState(false);

  // Form State
  const [form, setForm] = useState({
    bankId: "",
    branchId: "",
    noticeOrderDate: "",
    noticeDate: "",
    noticeTypeId: "",
    noticeType: "",
    quantity: "1",
    broughtBy: "",
    noOfPrint: "",
    printedBy: "",
    noOfScan: "",
    scannedBy: "",
    renamedBy: "",
    noticeRenameBy: "",
    dispatchedBy: "",
    billDate: "",
    billNo: "",
    billAmount: "",
    billMailedToBM: false,
    paymentRcvdDate: "",
    amountRcvd: "",
    tdsDeduction: "",
    gstDeduction: "",
    expenses: ""
  });

  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [documentUrl, setDocumentUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Fetch Notices list
  const fetchNotices = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/legal-recovery/notices");
      const result = await res.json();
      if (res.ok && result.success) {
        setNotices(result.data || []);
      } else {
        triggerToast(result.error || "Failed to load notices");
      }
    } catch (err: any) {
      triggerToast("Error fetching notices: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchNoticeTypes = async () => {
    try {
      const res = await fetch("/api/legal-recovery/notice-types");
      const result = await res.json();
      if (res.ok && result.success) {
        setNoticeTypes(result.data || []);
      }
    } catch (err: any) {
      console.error("Error fetching notice types:", err);
    }
  };

  const handleAddNewNoticeType = async () => {
    if (!newNoticeTypeName.trim()) return;
    try {
      setIsAddingType(true);
      const res = await fetch("/api/legal-recovery/notice-types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newNoticeTypeName.trim() })
      });
      const result = await res.json();
      if (res.ok && result.success) {
        triggerToast("New notice type added successfully!");
        // Re-fetch all notice types
        await fetchNoticeTypes();
        // Auto-select the newly added type
        setForm(prev => ({
          ...prev,
          noticeTypeId: result.data.id.toString(),
          noticeType: result.data.name
        }));
        setNewNoticeTypeName("");
      } else {
        triggerToast(result.error || "Failed to add notice type");
      }
    } catch (err: any) {
      triggerToast("Error: " + err.message);
    } finally {
      setIsAddingType(false);
    }
  };

  const handleOpenHandoverModal = (notice: any) => {
    setHandoverNotice(notice);
    setHandoverForm({
      handoverTo: notice.handoverTo || "",
      handedOverBy: notice.handedOverBy || "",
      handoverRemarks: notice.handoverRemarks || ""
    });
    setHandoverFile(null);
  };

  const handleSaveHandover = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!handoverNotice) return;
    try {
      setSubmittingHandover(true);
      let uploadedUrl = handoverNotice.handoverReceiptUrl || "";

      if (handoverFile) {
        const formData = new FormData();
        formData.append("file", handoverFile);
        const uploadRes = await fetch("/api/documents/upload", {
          method: "POST",
          body: formData
        });
        const uploadResult = await uploadRes.json();
        if (uploadResult.success) {
          uploadedUrl = uploadResult.url;
        } else {
          triggerToast("Warning: Handover photo upload failed. Saving text details only.");
        }
      }

      const res = await fetch("/api/legal-recovery/notices", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: handoverNotice.id,
          handoverTo: handoverForm.handoverTo,
          handedOverBy: handoverForm.handedOverBy,
          handoverRemarks: handoverForm.handoverRemarks,
          handoverReceiptUrl: uploadedUrl
        })
      });

      const result = await res.json();
      if (res.ok && result.success) {
        triggerToast("Notice Handover updated successfully!");
        setHandoverNotice(null);
        fetchNotices();
      } else {
        triggerToast(result.error || "Failed to update notice handover");
      }
    } catch (err: any) {
      triggerToast("Error: " + err.message);
    } finally {
      setSubmittingHandover(false);
    }
  };

  const handleOpenBillingModal = (notice: any) => {
    setBillingNotice(notice);
    setBillingForm({
      billDate: notice.billDate || "",
      billNo: notice.billNo || "",
      billAmount: notice.billAmount && parseFloat(notice.billAmount) !== 0 ? parseFloat(notice.billAmount).toString() : "",
      billMailedToBM: !!notice.billMailedToBM,
      paymentRcvdDate: notice.paymentRcvdDate || "",
      amountRcvd: notice.amountRcvd && parseFloat(notice.amountRcvd) !== 0 ? parseFloat(notice.amountRcvd).toString() : "",
      tdsDeduction: notice.tdsDeduction && parseFloat(notice.tdsDeduction) !== 0 ? parseFloat(notice.tdsDeduction).toString() : "",
      gstDeduction: notice.gstDeduction && parseFloat(notice.gstDeduction) !== 0 ? parseFloat(notice.gstDeduction).toString() : "",
      expenses: notice.expenses && parseFloat(notice.expenses) !== 0 ? parseFloat(notice.expenses).toString() : ""
    });
  };

  const handleSaveBilling = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!billingNotice) return;
    try {
      setSubmittingBilling(true);
      const res = await fetch("/api/legal-recovery/notices", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: billingNotice.id,
          billDate: billingForm.billDate || null,
          billNo: billingForm.billNo || null,
          billAmount: billingForm.billAmount !== "" ? parseFloat(billingForm.billAmount) : null,
          billMailedToBM: billingForm.billMailedToBM,
          paymentRcvdDate: billingForm.paymentRcvdDate || null,
          amountRcvd: billingForm.amountRcvd !== "" ? parseFloat(billingForm.amountRcvd) : null,
          tdsDeduction: billingForm.tdsDeduction !== "" ? parseFloat(billingForm.tdsDeduction) : null,
          gstDeduction: billingForm.gstDeduction !== "" ? parseFloat(billingForm.gstDeduction) : null,
          expenses: billingForm.expenses !== "" ? parseFloat(billingForm.expenses) : null
        })
      });

      const result = await res.json();
      if (res.ok && result.success) {
        triggerToast("Notice Billing details updated successfully!");
        setBillingNotice(null);
        fetchNotices();
      } else {
        triggerToast(result.error || "Failed to update notice billing");
      }
    } catch (err: any) {
      triggerToast("Error: " + err.message);
    } finally {
      setSubmittingBilling(false);
    }
  };

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    fetchNotices();
    fetchNoticeTypes();
  }, []);

  const handleEdit = (notice: any) => {
    setEditingId(notice.id);
    const matchedType = notice.noticeTypeId
      ? noticeTypes.find((t: any) => t.id?.toString() === notice.noticeTypeId?.toString())
      : (notice.noticeType ? noticeTypes.find((t: any) => t.name?.toLowerCase() === notice.noticeType?.toLowerCase()) : null);
    const typeIdVal = matchedType ? matchedType.id.toString() : "";

    setForm({
      bankId: notice.bankId?.toString() || "",
      branchId: notice.branchId?.toString() || "",
      noticeOrderDate: notice.noticeOrderDate || "",
      noticeDate: notice.noticeDate || "",
      noticeTypeId: typeIdVal,
      noticeType: matchedType ? matchedType.name : (notice.noticeType || ""),
      quantity: notice.quantity?.toString() || "1",
      broughtBy: notice.broughtBy || "",
      noOfPrint: notice.noOfPrint ? notice.noOfPrint.toString() : "",
      printedBy: notice.printedBy || "",
      noOfScan: notice.noOfScan ? notice.noOfScan.toString() : "",
      scannedBy: notice.scannedBy || "",
      renamedBy: notice.renamedBy || "",
      noticeRenameBy: notice.noticeRenameBy || "",
      dispatchedBy: notice.dispatchedBy || "",
      billDate: notice.billDate || "",
      billNo: notice.billNo || "",
      billAmount: notice.billAmount && parseFloat(notice.billAmount) !== 0 ? parseFloat(notice.billAmount).toString() : "",
      billMailedToBM: !!notice.billMailedToBM,
      paymentRcvdDate: notice.paymentRcvdDate || "",
      amountRcvd: notice.amountRcvd && parseFloat(notice.amountRcvd) !== 0 ? parseFloat(notice.amountRcvd).toString() : "",
      tdsDeduction: notice.tdsDeduction && parseFloat(notice.tdsDeduction) !== 0 ? parseFloat(notice.tdsDeduction).toString() : "",
      gstDeduction: notice.gstDeduction && parseFloat(notice.gstDeduction) !== 0 ? parseFloat(notice.gstDeduction).toString() : "",
      expenses: notice.expenses && parseFloat(notice.expenses) !== 0 ? parseFloat(notice.expenses).toString() : ""
    });
    setCustomNoticeType("");
    setDocumentUrl(notice.documentUrl || "");
    setDocumentFile(null);
    setShowAddForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this notice?")) return;
    try {
      const res = await fetch(`/api/legal-recovery/notices?id=${id}`, { method: "DELETE" });
      const result = await res.json();
      if (res.ok && result.success) {
        triggerToast("Notice deleted successfully");
        fetchNotices();
      } else {
        triggerToast(result.error || "Failed to delete notice");
      }
    } catch (err: any) {
      triggerToast("Error: " + err.message);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    try {
      setSubmitting(true);
      let uploadedUrl = documentUrl;

      // Handle document upload if file selected
      if (documentFile) {
        const formData = new FormData();
        formData.append("file", documentFile);
        const uploadRes = await fetch("/api/documents/upload", {
          method: "POST",
          body: formData
        });
        const uploadResult = await uploadRes.json();
        if (uploadResult.success) {
          uploadedUrl = uploadResult.url;
        } else {
          triggerToast("Warning: Document upload failed. Saving notice without softcopy.");
        }
      }

      const isCreate = !editingId;
      const payload = {
        ...form,
        noticeOrderDate: form.noticeOrderDate || null,
        noticeDate: form.noticeDate || null,

        // Billing & Financial fields
        billDate: isCreate ? null : (form.billDate || null),
        billNo: isCreate ? null : (form.billNo || null),
        billAmount: isCreate ? null : (form.billAmount !== "" ? parseFloat(form.billAmount) : null),
        billMailedToBM: isCreate ? null : form.billMailedToBM,
        paymentRcvdDate: isCreate ? null : (form.paymentRcvdDate || null),
        amountRcvd: isCreate ? null : (form.amountRcvd !== "" ? parseFloat(form.amountRcvd) : null),
        tdsDeduction: isCreate ? null : (form.tdsDeduction !== "" ? parseFloat(form.tdsDeduction) : null),
        gstDeduction: isCreate ? null : (form.gstDeduction !== "" ? parseFloat(form.gstDeduction) : null),
        expenses: isCreate ? null : (form.expenses !== "" ? parseFloat(form.expenses) : null),

        quantity: parseInt(form.quantity) || 1,
        noOfPrint: parseInt(form.noOfPrint) || 0,
        noOfScan: parseInt(form.noOfScan) || 0,
        noticeTypeId: form.noticeTypeId && form.noticeTypeId !== "add-new" ? parseInt(form.noticeTypeId) : undefined,
        documentUrl: uploadedUrl,
        id: editingId || undefined
      };

      const endpoint = "/api/legal-recovery/notices";
      const method = editingId ? "PUT" : "POST";

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const result = await res.json();
      if (res.ok && result.success) {
        triggerToast(editingId ? "Notice updated successfully!" : "Notice created successfully!");
        handleCancel();
        fetchNotices();
      } else {
        triggerToast(result.error || "Failed to save notice record");
      }
    } catch (err: any) {
      triggerToast("Error: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    setShowAddForm(false);
    setEditingId(null);
    setCustomNoticeType("");
    setDocumentFile(null);
    setDocumentUrl("");
    setForm({
      bankId: "",
      branchId: "",
      noticeOrderDate: "",
      noticeDate: "",
      noticeTypeId: "",
      noticeType: "",
      quantity: "1",
      broughtBy: "",
      noOfPrint: "",
      printedBy: "",
      noOfScan: "",
      scannedBy: "",
      renamedBy: "",
      noticeRenameBy: "",
      dispatchedBy: "",
      billDate: "",
      billNo: "",
      billAmount: "",
      billMailedToBM: false,
      paymentRcvdDate: "",
      amountRcvd: "",
      tdsDeduction: "",
      gstDeduction: "",
      expenses: ""
    });
  };

  // Filter branches based on selected bank
  const filteredBranches = branchesList.filter(
    br => br.bankId?.toString() === form.bankId
  );

  // Search filter
  const filteredNotices = notices.filter(n => {
    const bank = banksList.find(b => b.id?.toString() === n.bankId?.toString());
    const branch = branchesList.find(br => br.branchCode === n.branchId?.toString());
    const typeRecord = noticeTypes.find(t => t.id?.toString() === n.noticeTypeId?.toString());
    const typeName = typeRecord ? typeRecord.name : (n.noticeType || "");
    const searchStr = `${bank?.bankName || ""} ${branch?.branchName || ""} ${typeName} ${n.broughtBy || ""} ${n.billNo || ""}`.toLowerCase();
    return searchStr.includes(searchQuery.toLowerCase());
  });

  return (
    <div className="space-y-6">
      {/* 1. Add Notice Form View */}
      {showAddForm ? (
        <div className="bg-white border border-[#E8E4DF] rounded-2xl overflow-hidden shadow-sm animate-fade-in">
          <div className="px-6 py-4 border-b border-[#E8E4DF] flex justify-between items-center bg-[#FCFBF9]">
            <h3 className="font-serif text-base text-slate-800 flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-700" />
              {editingId ? "EDIT NOTICE RECORD" : "CREATE NEW NOTICE RECORD"}
            </h3>
            <button onClick={handleCancel} className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition-colors border border-transparent hover:border-rose-100">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-8">
            {/* SECTION 1: BANKING & NOTICE INFO */}
            <div className="bg-slate-50/50 p-5 rounded-xl border border-slate-100 space-y-4">
              <h4 className="text-[10px] uppercase tracking-wider text-slate-500 font-extrabold flex items-center gap-1.5 pb-2 border-b border-slate-100">
                <Building className="w-3.5 h-3.5 text-indigo-500" /> 1. BANKING & NOTICE INFO
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[9px] uppercase tracking-wider text-black font-black mb-1">Bank *</label>
                  <select
                    required
                    value={form.bankId}
                    onChange={e => setForm({ ...form, bankId: e.target.value, branchId: "" })}
                    className="w-full bg-white border border-[#E8E4DF] focus:border-indigo-500 rounded-lg px-3 py-2 text-xs focus:outline-none font-semibold text-slate-700"
                  >
                    <option value="">Select Bank...</option>
                    {banksList.map(b => (
                      <option key={b.id} value={b.id}>{b.bankName}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[9px] uppercase tracking-wider text-black font-black mb-1">Branch *</label>
                  <select
                    required
                    disabled={!form.bankId}
                    value={form.branchId}
                    onChange={e => setForm({ ...form, branchId: e.target.value })}
                    className="w-full bg-white border border-[#E8E4DF] focus:border-indigo-500 rounded-lg px-3 py-2 text-xs focus:outline-none font-semibold text-slate-700 disabled:opacity-60"
                  >
                    <option value="">Select Branch...</option>
                    {filteredBranches.map(br => (
                      <option key={br.id} value={br.branchCode}>{br.branchName} ({br.branchCode})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[9px] uppercase tracking-wider text-black font-black mb-1">Notice Order Date</label>
                  <input
                    type="date"
                    value={form.noticeOrderDate}
                    onChange={e => setForm({ ...form, noticeOrderDate: e.target.value })}
                    className="w-full bg-white border border-[#E8E4DF] focus:border-indigo-500 rounded-lg px-3 py-2 text-xs focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[9px] uppercase tracking-wider text-black font-black mb-1">Notice Date</label>
                  <input
                    type="date"
                    value={form.noticeDate}
                    onChange={e => setForm({ ...form, noticeDate: e.target.value })}
                    className="w-full bg-white border border-[#E8E4DF] focus:border-indigo-500 rounded-lg px-3 py-2 text-xs focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[9px] uppercase tracking-wider text-black font-black mb-1">Type of Notice *</label>
                  <select
                    required
                    value={form.noticeTypeId}
                    onChange={e => {
                      const val = e.target.value;
                      if (val === "add-new") {
                        setForm({ ...form, noticeTypeId: "add-new", noticeType: "" });
                      } else {
                        const matched = noticeTypes.find(nt => nt.id?.toString() === val);
                        setForm({
                          ...form,
                          noticeTypeId: val,
                          noticeType: matched ? matched.name : ""
                        });
                      }
                    }}
                    className="w-full bg-white border border-[#E8E4DF] focus:border-indigo-500 rounded-lg px-3 py-2 text-xs focus:outline-none font-semibold text-slate-700"
                  >
                    <option value="">Select Notice Type...</option>
                    {noticeTypes.map(nt => (
                      <option key={nt.id} value={nt.id.toString()}>{nt.name}</option>
                    ))}
                    <option value="add-new">Add New...</option>
                  </select>

                  {form.noticeTypeId === "add-new" && (
                    <div className="mt-2 animate-fade-in flex gap-2 items-end">
                      <div className="flex-1">
                        <label className="block text-[9px] uppercase tracking-wider text-black font-black mb-1">New Notice Type *</label>
                        <input
                          type="text"
                          required
                          placeholder="Type new notice name..."
                          value={newNoticeTypeName}
                          onChange={e => setNewNoticeTypeName(e.target.value)}
                          className="w-full bg-white border border-[#E8E4DF] focus:border-indigo-500 rounded-lg px-3 py-2 text-xs focus:outline-none font-semibold text-slate-700"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleAddNewNoticeType}
                        disabled={isAddingType || !newNoticeTypeName.trim()}
                        className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-750 text-white rounded-lg text-xs font-bold transition-all disabled:opacity-50 h-[38px] flex items-center justify-center whitespace-nowrap border border-transparent shadow-sm"
                      >
                        {isAddingType ? "Adding..." : "Add to DB"}
                      </button>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-[9px] uppercase tracking-wider text-black font-black mb-1">No. of Notices</label>
                  <input
                    type="text"
                    value={form.quantity}
                    onChange={e => {
                      const val = e.target.value.replace(/[^0-9]/g, '');
                      setForm({ ...form, quantity: val });
                    }}
                    className="w-full bg-white border border-[#E8E4DF] focus:border-indigo-500 rounded-lg px-3 py-2 text-xs focus:outline-none font-mono font-semibold"
                  />
                </div>

                <div className="md:col-span-3">
                  <label className="block text-[9px] uppercase tracking-wider text-black font-black mb-1">Document (Mail/Letter/PDF/img)</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="file"
                      onChange={e => setDocumentFile(e.target.files?.[0] || null)}
                      className="w-full bg-white border border-[#E8E4DF] rounded-lg px-3 py-1.5 text-xs focus:outline-none"
                    />
                    {documentUrl && (
                      <span className="text-[10px] bg-slate-100 px-2 py-1.5 rounded text-slate-500 truncate max-w-xs font-mono">
                        Exists: {documentUrl.substring(documentUrl.lastIndexOf('/') + 1)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 2: OPERATIONS & EXECUTION */}
            <div className="bg-slate-50/50 p-5 rounded-xl border border-slate-100 space-y-4">
              <h4 className="text-[10px] uppercase tracking-wider text-slate-500 font-extrabold flex items-center gap-1.5 pb-2 border-b border-slate-100">
                <User className="w-3.5 h-3.5 text-indigo-500" /> 2. OPERATIONS & EXECUTION
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[9px] uppercase tracking-wider text-black font-black mb-1">Brought By</label>
                  <input
                    type="text"
                    value={form.broughtBy}
                    onChange={e => setForm({ ...form, broughtBy: e.target.value })}
                    className="w-full bg-white border border-[#E8E4DF] focus:border-indigo-500 rounded-lg px-3 py-2 text-xs focus:outline-none"
                    placeholder="E.g. samay"
                  />
                </div>

                <div>
                  <label className="block text-[9px] uppercase tracking-wider text-black font-black mb-1">No. of Print</label>
                  <input
                    type="text"
                    value={form.noOfPrint}
                    onChange={e => {
                      const val = e.target.value.replace(/[^0-9]/g, '');
                      setForm({ ...form, noOfPrint: val });
                    }}
                    className="w-full bg-white border border-[#E8E4DF] focus:border-indigo-500 rounded-lg px-3 py-2 text-xs focus:outline-none font-mono font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-[9px] uppercase tracking-wider text-black font-black mb-1">Printed By</label>
                  <input
                    type="text"
                    value={form.printedBy}
                    onChange={e => setForm({ ...form, printedBy: e.target.value })}
                    className="w-full bg-white border border-[#E8E4DF] focus:border-indigo-500 rounded-lg px-3 py-2 text-xs focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[9px] uppercase tracking-wider text-black font-black mb-1">No. of Scan</label>
                  <input
                    type="text"
                    value={form.noOfScan}
                    onChange={e => {
                      const val = e.target.value.replace(/[^0-9]/g, '');
                      setForm({ ...form, noOfScan: val });
                    }}
                    className="w-full bg-white border border-[#E8E4DF] focus:border-indigo-500 rounded-lg px-3 py-2 text-xs focus:outline-none font-mono font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-[9px] uppercase tracking-wider text-black font-black mb-1">Scanned By</label>
                  <input
                    type="text"
                    value={form.scannedBy}
                    onChange={e => setForm({ ...form, scannedBy: e.target.value })}
                    className="w-full bg-white border border-[#E8E4DF] focus:border-indigo-500 rounded-lg px-3 py-2 text-xs focus:outline-none"
                  />
                </div>


                <div>
                  <label className="block text-[9px] uppercase tracking-wider text-black font-black mb-1">Notice Rename By</label>
                  <input
                    type="text"
                    value={form.noticeRenameBy}
                    onChange={e => setForm({ ...form, noticeRenameBy: e.target.value })}
                    className="w-full bg-white border border-[#E8E4DF] focus:border-indigo-500 rounded-lg px-3 py-2 text-xs focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[9px] uppercase tracking-wider text-black font-black mb-1">Dispatched By</label>
                  <input
                    type="text"
                    value={form.dispatchedBy}
                    onChange={e => setForm({ ...form, dispatchedBy: e.target.value })}
                    className="w-full bg-white border border-[#E8E4DF] focus:border-indigo-500 rounded-lg px-3 py-2 text-xs focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex justify-end items-center gap-3 pt-4 border-t border-[#E8E4DF]">
              <button
                type="button"
                onClick={handleCancel}
                className="px-5 py-2.5 bg-white border border-[#E8E4DF] text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 transition-colors"
              >
                CANCEL
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2.5 bg-[#5D3E53] hover:bg-[#4a3142] text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md disabled:opacity-50 transition-colors flex items-center gap-2"
              >
                {submitting ? "Saving Notice..." : "SAVE NOTICE RECORD"}
                <CheckCircle className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>
      ) : (
        /* 2. Notice Tracking Board List View */
        <div className="bg-white border border-[#E8E4DF] rounded-2xl overflow-hidden shadow-sm animate-fade-in">
          {/* List View Header */}
          <div className="px-5 py-4 border-b border-[#E8E4DF] flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#FCFBF9]">
            <h3 className="font-serif text-base text-slate-800 flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-750" />
              NOTICE TRACKING BOARD
            </h3>

            <div className="flex items-center gap-2 w-full md:w-auto">
              <div className="bg-white border border-[#E8E4DF] px-3 py-1.5 rounded-lg flex items-center gap-2 flex-1 md:flex-none md:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search notices..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="bg-transparent border-none text-xs w-full focus:outline-none text-slate-700 font-semibold"
                />
              </div>

              <button
                onClick={fetchNotices}
                className="p-2 border border-[#E8E4DF] hover:bg-[#F5F0EA] rounded-lg text-slate-550 transition-all shadow-sm"
                title="Refresh List"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading && 'animate-spin'}`} />
              </button>

              <button
                onClick={() => setShowAddForm(true)}
                className="px-3 py-2 bg-[#5D3E53] hover:bg-[#4a3142] text-white rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-sm whitespace-nowrap"
              >
                <PlusCircle className="w-3.5 h-3.5" /> ADD NOTICE
              </button>
            </div>
          </div>

          {/* Notices Table */}
          <div className="overflow-x-auto">
            {loading ? (
              <div className="text-center py-16 text-slate-400 text-xs flex flex-col items-center gap-2">
                <RefreshCw className="w-6 h-6 animate-spin text-indigo-600" /> LOADING NOTICES...
              </div>
            ) : filteredNotices.length === 0 ? (
              <div className="text-center py-16 text-slate-400 text-xs uppercase tracking-wider font-semibold">
                No Notice Records Found.
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-[#E8E4DF] text-[9px] uppercase tracking-wider text-slate-500 font-black">
                    <th className="px-4 py-3.5">BANK/BRANCH</th>
                    <th className="px-4 py-3.5">NOTICE TYPE</th>
                    <th className="px-4 py-3.5">ORDER DATE</th>
                    <th className="px-4 py-3.5">QTY</th>
                    <th className="px-4 py-3.5">EXECUTION INFO</th>
                    <th className="px-4 py-3.5">HANDOVER</th>
                    <th className="px-4 py-3.5">BILLING</th>
                    <th className="px-4 py-3.5">GP</th>
                    <th className="px-4 py-3.5 text-right">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8E4DF] text-xs font-semibold text-slate-700">
                  {filteredNotices.map((n) => {
                    const bank = banksList.find(b => b.id?.toString() === n.bankId?.toString());
                    const branch = branchesList.find(br => br.branchCode === n.branchId?.toString());

                    // GP = billAmount - (TDS + GST + expenses)
                    const billAmt = parseFloat(n.billAmount) || 0;
                    const deduction = (parseFloat(n.tdsDeduction) || 0) + (parseFloat(n.gstDeduction) || 0) + (parseFloat(n.expenses) || 0);
                    const grossProfit = billAmt - deduction;

                    return (
                      <tr key={n.id} className="hover:bg-slate-50/50 transition-colors">
                        {/* BANK/BRANCH */}
                        <td className="px-4 py-4 max-w-[180px]">
                          <div className="font-extrabold text-slate-900 truncate">{bank?.bankName || "Unknown Bank"}</div>
                          <div className="text-[10px] text-slate-500 truncate mt-0.5">
                            {branch?.branchName || "Unknown Branch"} ({n.branchId})
                          </div>
                        </td>

                        {/* NOTICE TYPE */}
                        <td className="px-4 py-4">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-850 border border-indigo-100">
                            {noticeTypes.find(t => t.id?.toString() === n.noticeTypeId?.toString())?.name || n.noticeType || "-"}
                          </span>
                        </td>

                        {/* ORDER DATE */}
                        <td className="px-4 py-4 text-[11px] font-mono">
                          {n.noticeOrderDate ? new Date(n.noticeOrderDate).toLocaleDateString('en-IN') : "-"}
                          {n.noticeDate && (
                            <div className="text-[9px] text-slate-400 mt-0.5">
                              Notice Date: {new Date(n.noticeDate).toLocaleDateString('en-IN')}
                            </div>
                          )}
                        </td>

                        {/* QTY */}
                        <td className="px-4 py-4 font-mono font-bold text-slate-800 text-sm">
                          {n.quantity || 1}
                        </td>

                        {/* EXECUTION INFO */}
                        <td className="px-4 py-4 text-[10px] leading-relaxed max-w-[200px]">
                          {n.broughtBy && <div>Brought: <strong className="text-slate-800">{n.broughtBy}</strong></div>}
                          {(n.noOfPrint > 0 || n.printedBy) && (
                            <div>Print: <strong className="text-slate-800">{n.noOfPrint}</strong> by {n.printedBy || "-"}</div>
                          )}
                          {(n.noOfScan > 0 || n.scannedBy) && (
                            <div>Scan: <strong className="text-slate-800">{n.noOfScan}</strong> by {n.scannedBy || "-"}</div>
                          )}
                          {n.renamedBy && <div>Rename: {n.renamedBy} / {n.noticeRenameBy || "-"}</div>}
                          {n.dispatchedBy && <div>Dispatch: <strong className="text-slate-800">{n.dispatchedBy}</strong></div>}
                          {!n.broughtBy && !n.printedBy && !n.scannedBy && !n.dispatchedBy && <span className="text-slate-400">-</span>}
                        </td>

                        {/* HANDOVER */}
                        <td className="px-4 py-4 leading-normal">
                          <div className="flex flex-col gap-1.5 items-start">
                            {n.documentUrl && (
                              <a
                                href={n.documentUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 font-bold text-emerald-700 hover:text-emerald-900 bg-emerald-50/70 px-2 py-0.5 rounded border border-emerald-100 text-[10px]"
                              >
                                <Paperclip className="w-2.5 h-2.5" /> Softcopy
                              </a>
                            )}
                            <div>
                              {n.handoverTo ? (
                                <span className="inline-flex items-center gap-1 text-emerald-700 font-extrabold text-[10px] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                                  <CheckCircle className="w-3 h-3 text-emerald-500" /> Handed Over
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-slate-400 italic text-[10px] bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                                  Pending
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* BILLING */}
                        <td className="px-4 py-4 leading-normal max-w-[150px]">
                          {billAmt > 0 ? (
                            <>
                              <div className="font-bold text-slate-800">₹{billAmt.toLocaleString('en-IN')}</div>
                              <div className="text-[9px] text-slate-400 font-mono mt-0.5">
                                No: {n.billNo || "-"}
                                {n.billMailedToBM && <span className="text-emerald-600 ml-1">✓ Mailed</span>}
                              </div>
                            </>
                          ) : (
                            <span className="text-slate-400 italic">No bill</span>
                          )}
                        </td>

                        {/* GP */}
                        <td className="px-4 py-4">
                          {n.billAmount !== null && n.billAmount !== undefined ? (
                            <>
                              <div className={`font-black font-mono ${grossProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                                ₹{grossProfit.toLocaleString('en-IN')}
                              </div>
                              {n.amountRcvd > 0 && (
                                <div className="text-[9px] text-slate-500 mt-0.5">
                                  Recd: ₹{parseFloat(n.amountRcvd).toLocaleString('en-IN')}
                                </div>
                              )}
                            </>
                          ) : (
                            <span className="text-slate-400 font-mono">-</span>
                          )}
                        </td>

                        {/* ACTIONS */}
                        <td className="px-4 py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setViewingNotice(n)}
                              className="p-1.5 text-slate-500 hover:text-[#5D3E53] hover:bg-slate-100 rounded-lg transition-colors"
                              title="View Details"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleOpenHandoverModal(n)}
                              className={`px-2 py-0.5 rounded text-[10px] font-black tracking-wider uppercase border transition-all ${n.handoverTo
                                  ? 'border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                                  : 'border-[#E8E4DF] text-slate-650 bg-white hover:bg-slate-50 shadow-sm'
                                }`}
                              title={n.handoverTo ? "Edit Handover Details" : "Handover Notice"}
                            >
                              {n.handoverTo ? "Edit Handover" : "Handover"}
                            </button>
                            <button
                              onClick={() => handleOpenBillingModal(n)}
                              className={`px-2 py-0.5 rounded text-[10px] font-black tracking-wider uppercase border transition-all ${(n.billNo || parseFloat(n.billAmount) > 0)
                                  ? 'border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100'
                                  : 'border-[#E8E4DF] text-slate-650 bg-white hover:bg-slate-50 shadow-sm'
                                }`}
                              title={(n.billNo || parseFloat(n.billAmount) > 0) ? "Edit Billing Details" : "Add Billing Details"}
                            >
                              {(n.billNo || parseFloat(n.billAmount) > 0) ? "Edit Billing" : "Add Billing"}
                            </button>
                            <button
                              onClick={() => handleEdit(n)}
                              className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors"
                              title="Edit Notice"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(n.id)}
                              className="p-1.5 text-slate-555 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Delete Notice"
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
            )}
          </div>
        </div>
      )}

      {/* 3. Notice Complete Details Modal */}
      {viewingNotice && mounted && createPortal((() => {
        const billAmt = parseFloat(viewingNotice.billAmount) || 0;
        const deductions = (parseFloat(viewingNotice.tdsDeduction) || 0) + (parseFloat(viewingNotice.gstDeduction) || 0) + (parseFloat(viewingNotice.expenses) || 0);
        const grossProfit = billAmt - deductions;
        return (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[9999] overflow-y-auto">
            <div className="flex min-h-screen items-center justify-center p-4 text-center">
              <div className="bg-white border border-[#E8E4DF] rounded-2xl max-w-4xl w-full shadow-2xl overflow-hidden text-left align-middle my-8 relative z-50 animate-scale-in">
                {/* Header */}
                <div className="px-6 py-4 border-b border-[#E8E4DF] flex justify-between items-center bg-[#FCFBF9]">
                  <h3 className="font-serif text-base text-slate-800 flex items-center gap-2 font-bold">
                    <FileText className="w-5 h-5 text-indigo-700" />
                    NOTICE COMPLETE DETAILS
                  </h3>
                  <button
                    onClick={() => setViewingNotice(null)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6 overflow-y-auto">
                  {/* Section 1 */}
                  <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100 space-y-3 text-left">
                    <h4 className="text-[10px] uppercase tracking-wider text-slate-500 font-extrabold pb-2 border-b border-slate-100">
                      1. BANKING & NOTICE INFO
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                      <div>
                        <span className="block text-[9px] uppercase tracking-wider text-slate-400 font-bold mb-1">Bank</span>
                        <span className="font-extrabold text-slate-850">
                          {banksList.find(b => b.id?.toString() === viewingNotice.bankId?.toString())?.bankName || "Unknown Bank"}
                        </span>
                      </div>
                      <div>
                        <span className="block text-[9px] uppercase tracking-wider text-slate-400 font-bold mb-1">Branch</span>
                        <span className="font-extrabold text-slate-850">
                          {branchesList.find(br => br.branchCode === viewingNotice.branchId?.toString())?.branchName || "Unknown Branch"} ({viewingNotice.branchId})
                        </span>
                      </div>
                      <div>
                        <span className="block text-[9px] uppercase tracking-wider text-slate-400 font-bold mb-1">Notice Order Date</span>
                        <span className="font-mono text-slate-850">
                          {viewingNotice.noticeOrderDate ? new Date(viewingNotice.noticeOrderDate).toLocaleDateString('en-IN') : "-"}
                        </span>
                      </div>
                      <div>
                        <span className="block text-[9px] uppercase tracking-wider text-slate-400 font-bold mb-1">Notice Date</span>
                        <span className="font-mono text-slate-850">
                          {viewingNotice.noticeDate ? new Date(viewingNotice.noticeDate).toLocaleDateString('en-IN') : "-"}
                        </span>
                      </div>
                      <div>
                        <span className="block text-[9px] uppercase tracking-wider text-slate-400 font-bold mb-1">Notice Type</span>
                        <span className="font-extrabold text-slate-850">
                          {noticeTypes.find(t => t.id?.toString() === viewingNotice.noticeTypeId?.toString())?.name || viewingNotice.noticeType || "-"}
                        </span>
                      </div>
                      <div>
                        <span className="block text-[9px] uppercase tracking-wider text-slate-400 font-bold mb-1">Quantity</span>
                        <span className="font-mono font-extrabold text-slate-850">{viewingNotice.quantity || 1}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="block text-[9px] uppercase tracking-wider text-slate-400 font-bold mb-1">Uploaded Document</span>
                        {viewingNotice.documentUrl ? (
                          <a
                            href={viewingNotice.documentUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 font-bold text-indigo-600 hover:text-indigo-850"
                          >
                            <Paperclip className="w-3.5 h-3.5" /> View Uploaded Document
                          </a>
                        ) : (
                          <span className="italic text-slate-400">No Document Uploaded</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Section 2 */}
                  <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100 space-y-3 text-left">
                    <h4 className="text-[10px] uppercase tracking-wider text-slate-500 font-extrabold pb-2 border-b border-slate-100">
                      2. OPERATIONS & EXECUTION
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                      <div>
                        <span className="block text-[9px] uppercase tracking-wider text-slate-400 font-bold mb-1">Brought By</span>
                        <span className="font-extrabold text-slate-850">{viewingNotice.broughtBy || "-"}</span>
                      </div>
                      <div>
                        <span className="block text-[9px] uppercase tracking-wider text-slate-400 font-bold mb-1">Printed By</span>
                        <span className="font-extrabold text-slate-850">
                          {viewingNotice.printedBy ? `${viewingNotice.printedBy} (Qty: ${viewingNotice.noOfPrint || 0})` : "-"}
                        </span>
                      </div>
                      <div>
                        <span className="block text-[9px] uppercase tracking-wider text-slate-400 font-bold mb-1">Scanned By</span>
                        <span className="font-extrabold text-slate-850">
                          {viewingNotice.scannedBy ? `${viewingNotice.scannedBy} (Qty: ${viewingNotice.noOfScan || 0})` : "-"}
                        </span>
                      </div>
                      <div>
                        <span className="block text-[9px] uppercase tracking-wider text-slate-400 font-bold mb-1">Renamed By</span>
                        <span className="font-extrabold text-slate-850">{viewingNotice.renamedBy || "-"}</span>
                      </div>
                      <div>
                        <span className="block text-[9px] uppercase tracking-wider text-slate-400 font-bold mb-1">Notice Renamed By</span>
                        <span className="font-extrabold text-slate-850">{viewingNotice.noticeRenameBy || "-"}</span>
                      </div>
                      <div>
                        <span className="block text-[9px] uppercase tracking-wider text-slate-400 font-bold mb-1">Dispatched By</span>
                        <span className="font-extrabold text-slate-850">{viewingNotice.dispatchedBy || "-"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Section 3 */}
                  <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100 space-y-3 text-left">
                    <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                      <h4 className="text-[10px] uppercase tracking-wider text-slate-500 font-extrabold">
                        3. NOTICE HANDOVER
                      </h4>
                      <button
                        onClick={() => {
                          handleOpenHandoverModal(viewingNotice);
                          setViewingNotice(null);
                        }}
                        className="px-2.5 py-1 bg-white border border-[#E8E4DF] hover:bg-slate-50 text-slate-700 rounded-lg text-[10px] font-bold transition-all shadow-sm flex items-center gap-1"
                      >
                        {viewingNotice.handoverTo ? "Edit Handover" : "+ Update Handover"}
                      </button>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                      <div>
                        <span className="block text-[9px] uppercase tracking-wider text-slate-400 font-bold mb-1">Handover To</span>
                        <span className="font-extrabold text-slate-850">{viewingNotice.handoverTo || "-"}</span>
                      </div>
                      <div>
                        <span className="block text-[9px] uppercase tracking-wider text-slate-400 font-bold mb-1">Handed Over By</span>
                        <span className="font-extrabold text-slate-850">{viewingNotice.handedOverBy || "-"}</span>
                      </div>
                      <div className="col-span-2 md:col-span-1">
                        <span className="block text-[9px] uppercase tracking-wider text-slate-400 font-bold mb-1">Remarks</span>
                        <span className="text-slate-700">{viewingNotice.handoverRemarks || "-"}</span>
                      </div>
                      <div>
                        <span className="block text-[9px] uppercase tracking-wider text-slate-400 font-bold mb-1">Handover Photo</span>
                        {viewingNotice.handoverReceiptUrl ? (
                          <a
                            href={viewingNotice.handoverReceiptUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 font-bold text-emerald-600 hover:text-emerald-800"
                          >
                            <Paperclip className="w-3.5 h-3.5" /> View Photo
                          </a>
                        ) : (
                          <span className="italic text-slate-400">No Photo</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Section 4 */}
                  <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100 space-y-3 text-left">
                    <h4 className="text-[10px] uppercase tracking-wider text-slate-500 font-extrabold pb-2 border-b border-slate-100">
                      4. FINANCIALS
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-xs">
                      <div>
                        <span className="block text-[9px] uppercase tracking-wider text-slate-400 font-bold mb-1">Bill No & Date</span>
                        <span className="font-mono text-slate-850 font-extrabold">
                          {viewingNotice.billNo || "-"} {viewingNotice.billDate ? new Date(viewingNotice.billDate).toLocaleDateString('en-IN') : ""}
                        </span>
                      </div>
                      <div>
                        <span className="block text-[9px] uppercase tracking-wider text-slate-400 font-bold mb-1">Bill Amount</span>
                        <span className="font-mono font-extrabold text-slate-900">
                          {viewingNotice.billAmount !== null && viewingNotice.billAmount !== undefined ? `₹${parseFloat(viewingNotice.billAmount).toLocaleString('en-IN')}` : "-"}
                        </span>
                      </div>
                      <div>
                        <span className="block text-[9px] uppercase tracking-wider text-slate-400 font-bold mb-1">Amount Received</span>
                        <span className="font-mono font-extrabold text-slate-900">
                          {viewingNotice.amountRcvd !== null && viewingNotice.amountRcvd !== undefined ? `₹${parseFloat(viewingNotice.amountRcvd).toLocaleString('en-IN')}` : "-"}
                        </span>
                      </div>
                      <div>
                        <span className="block text-[9px] uppercase tracking-wider text-slate-400 font-bold mb-1">Deductions</span>
                        <div className="leading-tight text-slate-500 font-mono text-[10px] font-semibold">
                          <div>TDS: {viewingNotice.tdsDeduction !== null && viewingNotice.tdsDeduction !== undefined ? `₹${parseFloat(viewingNotice.tdsDeduction).toLocaleString('en-IN')}` : "-"}</div>
                          <div>GST: {viewingNotice.gstDeduction !== null && viewingNotice.gstDeduction !== undefined ? `₹${parseFloat(viewingNotice.gstDeduction).toLocaleString('en-IN')}` : "-"}</div>
                        </div>
                      </div>
                      <div>
                        <span className="block text-[9px] uppercase tracking-wider text-slate-400 font-bold mb-1">Expenses & GP</span>
                        <div className="leading-tight font-mono text-[10px] font-semibold">
                          <div className="text-slate-500">Exp: {viewingNotice.expenses !== null && viewingNotice.expenses !== undefined ? `₹${parseFloat(viewingNotice.expenses).toLocaleString('en-IN')}` : "-"}</div>
                          <div className={`font-black ${grossProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                            GP: {viewingNotice.billAmount !== null && viewingNotice.billAmount !== undefined ? `₹${grossProfit.toLocaleString('en-IN')}` : "-"}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        );
      })(), document.body)}

      {/* 4. Update Notice Handover Modal */}
      {handoverNotice && mounted && createPortal(
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[9999] overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4 text-center">
            <div className="bg-white border border-[#E8E4DF] rounded-2xl max-w-md w-full shadow-2xl overflow-hidden text-left align-middle my-8 relative z-50 animate-scale-in">
              {/* Header */}
              <div className="px-6 py-4 border-b border-[#E8E4DF] flex justify-between items-center bg-[#FCFBF9]">
                <h3 className="font-serif text-base text-slate-800 flex items-center gap-2 font-bold">
                  <FileText className="w-5 h-5 text-indigo-700" />
                  UPDATE NOTICE HANDOVER
                </h3>
                <button
                  onClick={() => setHandoverNotice(null)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSaveHandover}>
                <div className="p-6 space-y-4 text-left">
                  <div>
                    <label className="block text-[9px] uppercase tracking-wider text-black font-black mb-1">Handover To *</label>
                    <input
                      type="text"
                      required
                      value={handoverForm.handoverTo}
                      onChange={e => setHandoverForm({ ...handoverForm, handoverTo: e.target.value })}
                      className="w-full bg-white border border-[#E8E4DF] focus:border-indigo-500 rounded-lg px-3 py-2 text-xs focus:outline-none font-semibold text-slate-700"
                      placeholder="Enter recipient name"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] uppercase tracking-wider text-black font-black mb-1">Handed Over By *</label>
                    <input
                      type="text"
                      required
                      value={handoverForm.handedOverBy}
                      onChange={e => setHandoverForm({ ...handoverForm, handedOverBy: e.target.value })}
                      className="w-full bg-white border border-[#E8E4DF] focus:border-indigo-500 rounded-lg px-3 py-2 text-xs focus:outline-none font-semibold text-slate-700"
                      placeholder="Enter dispatch staff name"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] uppercase tracking-wider text-black font-black mb-1">Remarks</label>
                    <input
                      type="text"
                      value={handoverForm.handoverRemarks}
                      onChange={e => setHandoverForm({ ...handoverForm, handoverRemarks: e.target.value })}
                      className="w-full bg-white border border-[#E8E4DF] focus:border-indigo-500 rounded-lg px-3 py-2 text-xs focus:outline-none text-slate-750 font-semibold"
                      placeholder="Enter remarks..."
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] uppercase tracking-wider text-black font-black mb-1">Upload Receipt Photo (Optional)</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={e => setHandoverFile(e.target.files?.[0] || null)}
                      className="w-full bg-white border border-[#E8E4DF] rounded-lg px-3 py-1.5 text-xs focus:outline-none font-semibold text-slate-700"
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className="px-6 py-4 border-t border-[#E8E4DF] flex justify-end gap-3 bg-slate-50">
                  <button
                    type="button"
                    onClick={() => setHandoverNotice(null)}
                    className="px-5 py-2.5 bg-white border border-[#E8E4DF] text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 transition-colors"
                  >
                    CANCEL
                  </button>
                  <button
                    type="submit"
                    disabled={submittingHandover}
                    className="px-5 py-2.5 bg-[#5D3E53] hover:bg-[#4a3142] text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md disabled:opacity-50 transition-all flex items-center gap-2"
                  >
                    {submittingHandover ? "Saving..." : "SAVE HANDOVER"}
                    <CheckCircle className="w-4 h-4" />
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* 5. Update Notice Billing Modal */}
      {billingNotice && mounted && createPortal(
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[9999] overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4 text-center">
            <div className="bg-white border border-[#E8E4DF] rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden text-left align-middle my-8 relative z-50 animate-scale-in">
              {/* Header */}
              <div className="px-6 py-4 border-b border-[#E8E4DF] flex justify-between items-center bg-[#FCFBF9]">
                <h3 className="font-serif text-base text-slate-800 flex items-center gap-2 font-bold">
                  <DollarSign className="w-5 h-5 text-indigo-700" />
                  {(billingForm.billNo || parseFloat(billingForm.billAmount) > 0) ? "EDIT NOTICE BILLING" : "ADD NOTICE BILLING"}
                </h3>
                <button
                  onClick={() => setBillingNotice(null)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSaveBilling}>
                <div className="p-6 space-y-4 text-left max-h-[70vh] overflow-y-auto">

                  {/* Notice summary header inside the modal */}
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-[11px] text-slate-600 space-y-1">
                    <div><strong>Bank:</strong> {banksList.find(b => b.id?.toString() === billingNotice.bankId?.toString())?.bankName || "Unknown Bank"}</div>
                    <div><strong>Branch:</strong> {branchesList.find(br => br.branchCode === billingNotice.branchId?.toString())?.branchName || "Unknown Branch"} ({billingNotice.branchId})</div>
                    <div><strong>Notice Type:</strong> {noticeTypes.find(t => t.id?.toString() === billingNotice.noticeTypeId?.toString())?.name || billingNotice.noticeType || "-"}</div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[9px] uppercase tracking-wider text-black font-black mb-1">Bill Date</label>
                      <input
                        type="date"
                        value={billingForm.billDate}
                        onChange={e => setBillingForm({ ...billingForm, billDate: e.target.value })}
                        className="w-full bg-white border border-[#E8E4DF] focus:border-indigo-500 rounded-lg px-3 py-2 text-xs focus:outline-none text-slate-700"
                      />
                    </div>

                    <div>
                      <label className="block text-[9px] uppercase tracking-wider text-black font-black mb-1">Bill No</label>
                      <input
                        type="text"
                        value={billingForm.billNo}
                        onChange={e => setBillingForm({ ...billingForm, billNo: e.target.value })}
                        className="w-full bg-white border border-[#E8E4DF] focus:border-indigo-500 rounded-lg px-3 py-2 text-xs focus:outline-none font-semibold text-slate-700"
                        placeholder="Enter Bill No"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[9px] uppercase tracking-wider text-black font-black mb-1">Bill Amount (₹)</label>
                    <input
                      type="text"
                      placeholder="E.g. 150.50"
                      value={billingForm.billAmount}
                      onChange={e => {
                        const val = e.target.value.replace(/[^0-9.]/g, '');
                        setBillingForm({ ...billingForm, billAmount: val });
                      }}
                      className="w-full bg-white border border-[#E8E4DF] focus:border-indigo-500 rounded-lg px-3 py-2 text-xs focus:outline-none font-mono font-semibold text-slate-700"
                    />
                  </div>

                  <div className="flex items-center gap-2 py-1">
                    <input
                      type="checkbox"
                      id="modalBillMailed"
                      checked={billingForm.billMailedToBM}
                      onChange={e => setBillingForm({ ...billingForm, billMailedToBM: e.target.checked })}
                      className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                    />
                    <label htmlFor="modalBillMailed" className="text-xs font-bold text-slate-700 cursor-pointer">
                      Bill Mailed to BM?
                    </label>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[9px] uppercase tracking-wider text-black font-black mb-1">Payment Rcvd Date</label>
                      <input
                        type="date"
                        value={billingForm.paymentRcvdDate}
                        onChange={e => setBillingForm({ ...billingForm, paymentRcvdDate: e.target.value })}
                        className="w-full bg-white border border-[#E8E4DF] focus:border-indigo-500 rounded-lg px-3 py-2 text-xs focus:outline-none text-slate-700"
                      />
                    </div>

                    <div>
                      <label className="block text-[9px] uppercase tracking-wider text-black font-black mb-1">Amount Rcvd (₹)</label>
                      <input
                        type="text"
                        placeholder="E.g. 150.50"
                        value={billingForm.amountRcvd}
                        onChange={e => {
                          const val = e.target.value.replace(/[^0-9.]/g, '');
                          setBillingForm({ ...billingForm, amountRcvd: val });
                        }}
                        className="w-full bg-white border border-[#E8E4DF] focus:border-indigo-500 rounded-lg px-3 py-2 text-xs focus:outline-none font-mono font-semibold text-slate-700"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[9px] uppercase tracking-wider text-black font-black mb-1">TDS Deduction (₹)</label>
                      <input
                        type="text"
                        placeholder="E.g. 150.50"
                        value={billingForm.tdsDeduction}
                        onChange={e => {
                          const val = e.target.value.replace(/[^0-9.]/g, '');
                          setBillingForm({ ...billingForm, tdsDeduction: val });
                        }}
                        className="w-full bg-white border border-[#E8E4DF] focus:border-indigo-500 rounded-lg px-3 py-2 text-xs focus:outline-none font-mono font-semibold text-slate-700"
                      />
                    </div>

                    <div>
                      <label className="block text-[9px] uppercase tracking-wider text-black font-black mb-1">GST Deduction (₹)</label>
                      <input
                        type="text"
                        placeholder="E.g. 150.50"
                        value={billingForm.gstDeduction}
                        onChange={e => {
                          const val = e.target.value.replace(/[^0-9.]/g, '');
                          setBillingForm({ ...billingForm, gstDeduction: val });
                        }}
                        className="w-full bg-white border border-[#E8E4DF] focus:border-indigo-500 rounded-lg px-3 py-2 text-xs focus:outline-none font-mono font-semibold text-slate-700"
                      />
                    </div>

                    <div>
                      <label className="block text-[9px] uppercase tracking-wider text-black font-black mb-1">Expenses (₹)</label>
                      <input
                        type="text"
                        placeholder="E.g. 150.50"
                        value={billingForm.expenses}
                        onChange={e => {
                          const val = e.target.value.replace(/[^0-9.]/g, '');
                          setBillingForm({ ...billingForm, expenses: val });
                        }}
                        className="w-full bg-white border border-[#E8E4DF] focus:border-indigo-500 rounded-lg px-3 py-2 text-xs focus:outline-none font-mono font-semibold text-slate-700"
                      />
                    </div>
                  </div>

                </div>

                {/* Actions */}
                <div className="px-6 py-4 border-t border-[#E8E4DF] flex justify-end gap-3 bg-slate-50">
                  <button
                    type="button"
                    onClick={() => setBillingNotice(null)}
                    className="px-5 py-2.5 bg-white border border-[#E8E4DF] text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 transition-colors"
                  >
                    CANCEL
                  </button>
                  <button
                    type="submit"
                    disabled={submittingBilling}
                    className="px-5 py-2.5 bg-[#5D3E53] hover:bg-[#4a3142] text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md disabled:opacity-50 transition-all flex items-center gap-2"
                  >
                    {submittingBilling ? "Saving..." : "SAVE BILLING"}
                    <CheckCircle className="w-4 h-4" />
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
