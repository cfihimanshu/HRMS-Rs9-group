import React, { useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { PlusCircle, Search, RefreshCw, FileText, Building, User, Trash2, Edit3, X, Paperclip, CheckCircle, Landmark, Calendar, DollarSign, ArrowRight, Eye, UserCheck, SlidersHorizontal, Download, Filter } from "lucide-react";

// Custom Autocomplete Component with premium UI suggestions
function EmployeeAutocomplete({
  label,
  value,
  onChange,
  employees,
  placeholder = ""
}: {
  label: string;
  value: string;
  onChange: (val: string) => void;
  employees: any[];
  placeholder?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState(value);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync internal search state with value prop
  useEffect(() => {
    setSearch(value);
  }, [value]);

  // Filter employees based on query
  const suggestions = useMemo(() => {
    if (!search.trim()) return employees;
    return employees.filter(emp =>
      emp.name?.toLowerCase().includes(search.toLowerCase())
    );
  }, [search, employees]);

  // Click outside listener to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative w-full">
      <label className="block text-[9px] uppercase tracking-wider text-black font-black mb-1">{label}</label>
      <input
        type="text"
        value={search}
        onChange={e => {
          setSearch(e.target.value);
          onChange(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        placeholder={placeholder}
        className="w-full bg-white border border-[#E8E4DF] focus:border-indigo-500 rounded-lg px-3 py-2 text-xs focus:outline-none"
      />
      {isOpen && suggestions.length > 0 && (
        <div className="absolute left-0 right-0 z-[100] mt-1 bg-white border border-[#E8E4DF] rounded-xl shadow-xl max-h-48 overflow-y-auto divide-y divide-[#E8E4DF] animate-fade-in font-sans">
          {suggestions.map(emp => (
            <button
              key={emp.id}
              type="button"
              onClick={() => {
                onChange(emp.name || "");
                setSearch(emp.name || "");
                setIsOpen(false);
              }}
              className="w-full text-left px-3 py-2.5 text-xs text-slate-700 hover:bg-slate-50 active:bg-slate-100 transition-colors font-medium flex items-center gap-2"
            >
              {emp.profilePhoto ? (
                <img src={emp.profilePhoto} alt="" className="w-5 h-5 rounded-full object-cover border border-slate-100" />
              ) : (
                <div className="w-5 h-5 rounded-full bg-indigo-50 text-indigo-650 text-[10px] font-bold flex items-center justify-center border border-indigo-100">
                  {emp.name ? emp.name.charAt(0).toUpperCase() : "?"}
                </div>
              )}
              <span className="truncate text-slate-800">{emp.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Custom Header Filter Component (Excel-like filtering dropdown panel)
function HeaderFilter({
  filterKey,
  options,
  selectedValues,
  onChange,
  onClose
}: {
  filterKey: string;
  options: string[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
  onClose: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [tempSelected, setTempSelected] = useState<string[]>(selectedValues);

  useEffect(() => {
    setTempSelected(selectedValues);
  }, [selectedValues]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  const handleToggle = (val: string) => {
    if (tempSelected.includes(val)) {
      setTempSelected(tempSelected.filter(v => v !== val));
    } else {
      setTempSelected([...tempSelected, val]);
    }
  };

  const handleSelectAll = () => {
    setTempSelected(options);
  };

  const handleClearAll = () => {
    setTempSelected([]);
  };

  const handleApply = () => {
    onChange(tempSelected);
    onClose();
  };

  return (
    <div
      ref={containerRef}
      className="absolute top-full left-0 mt-1 z-[99] bg-white border border-[#E8E4DF] rounded-xl shadow-2xl p-3 w-56 text-xs text-slate-750 font-sans normal-case font-bold"
      onClick={e => e.stopPropagation()}
    >
      <div className="flex justify-between items-center mb-2 pb-1.5 border-b border-slate-100 font-bold uppercase tracking-wider text-[9px] text-slate-400">
        <span>Filter Options</span>
        <div className="flex gap-1.5">
          <button type="button" onClick={handleSelectAll} className="text-indigo-650 hover:underline">All</button>
          <button type="button" onClick={handleClearAll} className="text-rose-500 hover:underline">Clear</button>
        </div>
      </div>
      <div className="max-h-36 overflow-y-auto space-y-1.5 mb-3">
        {options.map(opt => (
          <label key={opt} className="flex items-center gap-2 cursor-pointer py-0.5 hover:bg-slate-50 rounded px-1">
            <input
              type="checkbox"
              checked={tempSelected.includes(opt)}
              onChange={() => handleToggle(opt)}
              className="rounded border-slate-300 text-indigo-650 focus:ring-indigo-500 w-3.5 h-3.5 cursor-pointer"
            />
            <span className="truncate max-w-[170px]" title={opt}>{opt}</span>
          </label>
        ))}
      </div>
      <div className="flex gap-2 justify-end pt-2 border-t border-slate-100">
        <button
          type="button"
          onClick={onClose}
          className="px-2.5 py-1.5 border border-[#E8E4DF] hover:bg-slate-50 rounded-lg text-[10px] font-bold text-slate-500 transition-all"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleApply}
          className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-750 text-white rounded-lg text-[10px] font-black transition-all"
        >
          Apply
        </button>
      </div>
    </div>
  );
}

function LocalImagePreview({ file }: { file: File }) {
  const [src, setSrc] = useState<string>("");
  useEffect(() => {
    const url = URL.createObjectURL(file);
    setSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  if (!src) return null;
  return (
    <img
      src={src}
      alt={file.name}
      className="w-8 h-8 object-cover rounded border border-slate-200 cursor-zoom-in hover:opacity-80 transition-opacity shrink-0"
      onClick={() => window.open(src, "_blank")}
      title="Click to preview image in new tab"
    />
  );
}

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
  const [employees, setEmployees] = useState<any[]>([]);

  // Column Visibility state
  const [visibleColumns, setVisibleColumns] = useState({
    bankBranch: true,
    noticeType: true,
    orderDate: true,
    noticeDate: true,
    qty: true,
    broughtBy: true,
    noOfPrint: true,
    printedBy: true,
    noOfScan: true,
    scannedBy: true,
    noticeRenameBy: true,
    dispatchedBy: true,
    handover: true,
    billDate: true,
    billNo: true,
    billAmount: true,
    billMailedToBM: true,
    paymentRcvdDate: true,
    amountRcvd: true,
    tdsDeduction: true,
    gstDeduction: true,
    expenses: true,
    billingAttachments: true,
    gp: true,
  });
  const [showColumnToggle, setShowColumnToggle] = useState(false);
  const columnToggleRef = useRef<HTMLDivElement>(null);

  // Excel-like column filters state
  const [activeFilterKey, setActiveFilterKey] = useState<string | null>(null);
  const [selectedFilters, setSelectedFilters] = useState<Record<string, string[]>>({
    bank: [],
    noticeType: [],
    orderDate: [],
    noticeDate: [],
    qty: [],
    broughtBy: [],
    noOfPrint: [],
    printedBy: [],
    noOfScan: [],
    scannedBy: [],
    noticeRenameBy: [],
    dispatchedBy: [],
    handover: [],
    billDate: [],
    billNo: [],
    billAmount: [],
    billMailedToBM: [],
    paymentRcvdDate: [],
    amountRcvd: [],
    tdsDeduction: [],
    gstDeduction: [],
    expenses: [],
    billingAttachments: [],
    gp: [],
  });

  // Dynamic filter values
  const uniqueBanks = useMemo(() => Array.from(new Set(notices.map(n => banksList.find(b => b.id?.toString() === n.bankId?.toString())?.bankName || "Unknown Bank"))), [notices, banksList]);
  const uniqueNoticeTypes = useMemo(() => Array.from(new Set(notices.map(n => noticeTypes.find(t => t.id?.toString() === n.noticeTypeId?.toString())?.name || n.noticeType || "-"))), [notices, noticeTypes]);
  const uniqueOrderDates = useMemo(() => Array.from(new Set(notices.map(n => n.noticeOrderDate ? new Date(n.noticeOrderDate).toLocaleDateString('en-IN') : "-"))), [notices]);
  const uniqueNoticeDates = useMemo(() => Array.from(new Set(notices.map(n => n.noticeDate ? new Date(n.noticeDate).toLocaleDateString('en-IN') : "-"))), [notices]);
  const uniqueQties = useMemo(() => Array.from(new Set(notices.map(n => String(n.quantity || 1)))), [notices]);
  const uniqueBroughtBy = useMemo(() => Array.from(new Set(notices.map(n => n.broughtBy || "-"))), [notices]);
  const uniqueNoOfPrint = useMemo(() => Array.from(new Set(notices.map(n => String(n.noOfPrint || 0)))), [notices]);
  const uniquePrintedBy = useMemo(() => Array.from(new Set(notices.map(n => n.printedBy || "-"))), [notices]);
  const uniqueNoOfScan = useMemo(() => Array.from(new Set(notices.map(n => String(n.noOfScan || 0)))), [notices]);
  const uniqueScannedBy = useMemo(() => Array.from(new Set(notices.map(n => n.scannedBy || "-"))), [notices]);
  const uniqueNoticeRenameBy = useMemo(() => Array.from(new Set(notices.map(n => n.noticeRenameBy || "-"))), [notices]);
  const uniqueDispatchedBy = useMemo(() => Array.from(new Set(notices.map(n => n.dispatchedBy || "-"))), [notices]);
  const uniqueHandover = useMemo(() => {
    const opts = new Set<string>(["Handed Over", "Pending"]);
    notices.forEach(n => {
      if (n.handoverTo) opts.add(`To: ${n.handoverTo}`);
    });
    return Array.from(opts);
  }, [notices]);
  const uniqueBillDates = useMemo(() => Array.from(new Set(notices.map(n => n.billDate ? new Date(n.billDate).toLocaleDateString('en-IN') : "-"))), [notices]);
  const uniqueBillNos = useMemo(() => Array.from(new Set(notices.map(n => n.billNo || "-"))), [notices]);
  const uniqueBillAmounts = useMemo(() => Array.from(new Set(notices.map(n => n.billAmount ? `₹${parseFloat(n.billAmount).toLocaleString('en-IN')}` : "-"))), [notices]);
  const uniqueBillMailedToBM = ["Yes", "No"];
  const uniquePaymentRcvdDates = useMemo(() => Array.from(new Set(notices.map(n => n.paymentRcvdDate ? new Date(n.paymentRcvdDate).toLocaleDateString('en-IN') : "-"))), [notices]);
  const uniqueAmountRcvds = useMemo(() => Array.from(new Set(notices.map(n => n.amountRcvd ? `₹${parseFloat(n.amountRcvd).toLocaleString('en-IN')}` : "-"))), [notices]);
  const uniqueTdsDeductions = useMemo(() => Array.from(new Set(notices.map(n => n.tdsDeduction ? `₹${parseFloat(n.tdsDeduction).toLocaleString('en-IN')}` : "-"))), [notices]);
  const uniqueGstDeductions = useMemo(() => Array.from(new Set(notices.map(n => n.gstDeduction ? `₹${parseFloat(n.gstDeduction).toLocaleString('en-IN')}` : "-"))), [notices]);
  const uniqueExpenses = useMemo(() => Array.from(new Set(notices.map(n => n.expenses ? `₹${parseFloat(n.expenses).toLocaleString('en-IN')}` : "-"))), [notices]);
  const uniqueBillingAttachmentsOpts = ["Has Attachments", "No Attachments"];
  const uniqueGPOpts = ["Profit (> 0)", "Loss (< 0)", "No Profit/Loss (= 0)"];

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
  const [billingAttachments, setBillingAttachments] = useState<{ name: string; url: string; type: string }[]>([]);
  const [billingNewFiles, setBillingNewFiles] = useState<File[]>([]);
  const [uploadingBilling, setUploadingBilling] = useState(false);
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

  const fetchEmployees = async () => {
    try {
      const res = await fetch("/api/employees");
      const result = await res.json();
      if (res.ok && result.success) {
        setEmployees(result.data || []);
      }
    } catch (err: any) {
      console.error("Error fetching employees:", err);
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
    // Load existing billing attachments
    try {
      const existing = JSON.parse(notice.billingAttachments || "[]");
      setBillingAttachments(Array.isArray(existing) ? existing : []);
    } catch { setBillingAttachments([]); }
    setBillingNewFiles([]);
  };

  const handleSaveBilling = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!billingNotice) return;
    try {
      setSubmittingBilling(true);

      // Upload any newly selected files first
      let allAttachments = [...billingAttachments];
      if (billingNewFiles.length > 0) {
        setUploadingBilling(true);
        for (const file of billingNewFiles) {
          const fd = new FormData();
          fd.append("file", file);
          try {
            const uploadRes = await fetch("/api/documents/upload", { method: "POST", body: fd });
            const uploadResult = await uploadRes.json();
            if (uploadResult.success && uploadResult.url) {
              const fileType = file.type.startsWith("image/") ? "image"
                : file.type === "application/pdf" ? "pdf"
                : file.type.includes("sheet") || file.type.includes("excel") ? "excel"
                : file.type.startsWith("audio/") || file.type.startsWith("video/") ? "recording"
                : "file";
              allAttachments.push({ name: file.name, url: uploadResult.url, type: fileType });
            } else {
              triggerToast(`Warning: Could not upload "${file.name}". Continuing without it.`);
            }
          } catch {
            triggerToast(`Warning: Upload failed for "${file.name}".`);
          }
        }
        setUploadingBilling(false);
      }

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
          expenses: billingForm.expenses !== "" ? parseFloat(billingForm.expenses) : null,
          billingAttachments: JSON.stringify(allAttachments)
        })
      });

      const result = await res.json();
      if (res.ok && result.success) {
        triggerToast("Notice Billing details updated successfully!");
        setBillingNotice(null);
        setBillingNewFiles([]);
        setBillingAttachments([]);
        fetchNotices();
      } else {
        triggerToast(result.error || "Failed to update notice billing");
      }
    } catch (err: any) {
      triggerToast("Error: " + err.message);
    } finally {
      setSubmittingBilling(false);
      setUploadingBilling(false);
    }
  };

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    fetchNotices();
    fetchNoticeTypes();
    fetchEmployees();
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (columnToggleRef.current && !columnToggleRef.current.contains(event.target as Node)) {
        setShowColumnToggle(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
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

  const handleExportToExcel = () => {
    // Dynamically build headers and row values based on visibleColumns state
    const exportColumns: { header: string; getValue: (n: any) => any }[] = [];

    if (visibleColumns.bankBranch) {
      exportColumns.push(
        {
          header: "Bank Name",
          getValue: n => banksList.find(b => b.id?.toString() === n.bankId?.toString())?.bankName || "Unknown Bank"
        },
        {
          header: "Branch Name",
          getValue: n => branchesList.find(br => br.branchCode === n.branchId?.toString())?.branchName || "Unknown Branch"
        },
        {
          header: "Branch Code",
          getValue: n => n.branchId || ""
        }
      );
    }

    if (visibleColumns.noticeType) {
      exportColumns.push({
        header: "Notice Type",
        getValue: n => noticeTypes.find(t => t.id?.toString() === n.noticeTypeId?.toString())?.name || n.noticeType || "-"
      });
    }

    if (visibleColumns.orderDate) {
      exportColumns.push({
        header: "Order Date",
        getValue: n => n.noticeOrderDate ? new Date(n.noticeOrderDate).toLocaleDateString('en-IN') : ""
      });
    }

    if (visibleColumns.noticeDate) {
      exportColumns.push({
        header: "Notice Date",
        getValue: n => n.noticeDate ? new Date(n.noticeDate).toLocaleDateString('en-IN') : ""
      });
    }

    if (visibleColumns.qty) {
      exportColumns.push({
        header: "Quantity",
        getValue: n => n.quantity || 1
      });
    }

    if (visibleColumns.broughtBy) {
      exportColumns.push({ header: "Brought By", getValue: n => n.broughtBy || "" });
    }
    if (visibleColumns.noOfPrint) {
      exportColumns.push({ header: "No. of Print", getValue: n => n.noOfPrint || 0 });
    }
    if (visibleColumns.printedBy) {
      exportColumns.push({ header: "Printed By", getValue: n => n.printedBy || "" });
    }
    if (visibleColumns.noOfScan) {
      exportColumns.push({ header: "No. of Scan", getValue: n => n.noOfScan || 0 });
    }
    if (visibleColumns.scannedBy) {
      exportColumns.push({ header: "Scanned By", getValue: n => n.scannedBy || "" });
    }
    if (visibleColumns.noticeRenameBy) {
      exportColumns.push({ header: "Notice Rename By", getValue: n => n.noticeRenameBy || "" });
    }
    if (visibleColumns.dispatchedBy) {
      exportColumns.push({ header: "Dispatched By", getValue: n => n.dispatchedBy || "" });
    }

    if (visibleColumns.handover) {
      exportColumns.push(
        { header: "Handover To", getValue: n => n.handoverTo || "" },
        { header: "Handed Over By", getValue: n => n.handedOverBy || "" },
        { header: "Handover Remarks", getValue: n => n.handoverRemarks || "" }
      );
    }

    if (visibleColumns.billDate) {
      exportColumns.push({
        header: "Bill Date",
        getValue: n => n.billDate ? new Date(n.billDate).toLocaleDateString('en-IN') : ""
      });
    }
    if (visibleColumns.billNo) {
      exportColumns.push({ header: "Bill No", getValue: n => n.billNo || "" });
    }
    if (visibleColumns.billAmount) {
      exportColumns.push({ header: "Bill Amount", getValue: n => parseFloat(n.billAmount) || 0 });
    }
    if (visibleColumns.billMailedToBM) {
      exportColumns.push({ header: "Mailed to BM", getValue: n => n.billMailedToBM ? "Yes" : "No" });
    }
    if (visibleColumns.paymentRcvdDate) {
      exportColumns.push({
        header: "Paid Date",
        getValue: n => n.paymentRcvdDate ? new Date(n.paymentRcvdDate).toLocaleDateString('en-IN') : ""
      });
    }
    if (visibleColumns.amountRcvd) {
      exportColumns.push({ header: "Paid Amount", getValue: n => parseFloat(n.amountRcvd) || 0 });
    }
    if (visibleColumns.tdsDeduction) {
      exportColumns.push({ header: "TDS Deduction", getValue: n => parseFloat(n.tdsDeduction) || 0 });
    }
    if (visibleColumns.gstDeduction) {
      exportColumns.push({ header: "GST Deduction", getValue: n => parseFloat(n.gstDeduction) || 0 });
    }
    if (visibleColumns.expenses) {
      exportColumns.push({ header: "Expenses", getValue: n => parseFloat(n.expenses) || 0 });
    }
    if (visibleColumns.billingAttachments) {
      exportColumns.push({
        header: "Billing Attachments",
        getValue: n => {
          if (!n.billingAttachments) return "";
          try {
            const parsed = JSON.parse(n.billingAttachments);
            if (Array.isArray(parsed)) return parsed.map((a: any) => a.url).join(", ");
          } catch (_) {}
          return "";
        }
      });
    }

    if (visibleColumns.gp) {
      exportColumns.push({
        header: "Gross Profit",
        getValue: n => {
          const billAmt = parseFloat(n.billAmount) || 0;
          const deduction = (parseFloat(n.tdsDeduction) || 0) + (parseFloat(n.gstDeduction) || 0) + (parseFloat(n.expenses) || 0);
          return billAmt - deduction;
        }
      });
    }

    // Fallback if no columns are selected
    if (exportColumns.length === 0) {
      triggerToast("Please make at least one column visible before exporting.");
      return;
    }

    const headers = exportColumns.map(c => c.header);
    const rows = filteredNotices.map(n => exportColumns.map(c => c.getValue(n)));

    let excelTemplate = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">`;
    excelTemplate += `<head><meta charset="utf-8"><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Legal Notice Tracking</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head><body>`;
    excelTemplate += `<table border="1" style="border-collapse:collapse; font-family: 'Segoe UI', Arial, sans-serif; font-size: 11px;">`;

    // Headers
    excelTemplate += `<tr style="height: 30px;">`;
    headers.forEach(h => {
      excelTemplate += `<th style="background-color: #5D3E53; color: #ffffff; font-weight: bold; border: 1px solid #cbd5e1; padding: 6px; text-align: left; vertical-align: middle;">${h}</th>`;
    });
    excelTemplate += `</tr>`;

    // Rows
    rows.forEach(row => {
      excelTemplate += `<tr>`;
      row.forEach(cell => {
        excelTemplate += `<td style="border: 1px solid #cbd5e1; padding: 6px; text-align: left; vertical-align: middle; white-space: nowrap;">${cell}</td>`;
      });
      excelTemplate += `</tr>`;
    });
    excelTemplate += `</table></body></html>`;

    const blob = new Blob([excelTemplate], { type: "application/vnd.ms-excel" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Legal_Notice_Tracking_${new Date().toISOString().split("T")[0]}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    triggerToast("Excel report exported successfully");
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

  // Search and Excel Column filters combined
  const filteredNotices = useMemo(() => {
    return notices.filter(n => {
      // 1. Search Query filter
      const bank = banksList.find(b => b.id?.toString() === n.bankId?.toString());
      const branch = branchesList.find(br => br.branchCode === n.branchId?.toString());
      const typeRecord = noticeTypes.find(t => t.id?.toString() === n.noticeTypeId?.toString());
      const typeName = typeRecord ? typeRecord.name : (n.noticeType || "");
      const searchStr = `${bank?.bankName || ""} ${branch?.branchName || ""} ${typeName} ${n.broughtBy || ""} ${n.billNo || ""}`.toLowerCase();
      
      if (searchQuery.trim() && !searchStr.includes(searchQuery.toLowerCase())) {
        return false;
      }
 
      // 2. Excel Column Filters
      // Bank filter
      if (selectedFilters.bank?.length > 0) {
        const bName = bank?.bankName || "Unknown Bank";
        if (!selectedFilters.bank.includes(bName)) return false;
      }
      // Notice Type filter
      if (selectedFilters.noticeType?.length > 0) {
        const tName = typeName || "-";
        if (!selectedFilters.noticeType.includes(tName)) return false;
      }
      // Order Date filter
      if (selectedFilters.orderDate?.length > 0) {
        const oDate = n.noticeOrderDate ? new Date(n.noticeOrderDate).toLocaleDateString('en-IN') : "-";
        if (!selectedFilters.orderDate.includes(oDate)) return false;
      }
      // Notice Date filter
      if (selectedFilters.noticeDate?.length > 0) {
        const nDate = n.noticeDate ? new Date(n.noticeDate).toLocaleDateString('en-IN') : "-";
        if (!selectedFilters.noticeDate.includes(nDate)) return false;
      }
      // Qty filter
      if (selectedFilters.qty?.length > 0) {
        const qVal = String(n.quantity || 1);
        if (!selectedFilters.qty.includes(qVal)) return false;
      }
      // Brought By filter
      if (selectedFilters.broughtBy?.length > 0) {
        if (!selectedFilters.broughtBy.includes(n.broughtBy || "-")) return false;
      }
      // No Of Print filter
      if (selectedFilters.noOfPrint?.length > 0) {
        if (!selectedFilters.noOfPrint.includes(String(n.noOfPrint || 0))) return false;
      }
      // Printed By filter
      if (selectedFilters.printedBy?.length > 0) {
        if (!selectedFilters.printedBy.includes(n.printedBy || "-")) return false;
      }
      // No Of Scan filter
      if (selectedFilters.noOfScan?.length > 0) {
        if (!selectedFilters.noOfScan.includes(String(n.noOfScan || 0))) return false;
      }
      // Scanned By filter
      if (selectedFilters.scannedBy?.length > 0) {
        if (!selectedFilters.scannedBy.includes(n.scannedBy || "-")) return false;
      }
      // Notice Rename By filter
      if (selectedFilters.noticeRenameBy?.length > 0) {
        if (!selectedFilters.noticeRenameBy.includes(n.noticeRenameBy || "-")) return false;
      }
      // Dispatched By filter
      if (selectedFilters.dispatchedBy?.length > 0) {
        if (!selectedFilters.dispatchedBy.includes(n.dispatchedBy || "-")) return false;
      }
      // Handover status filter
      if (selectedFilters.handover?.length > 0) {
        const hStatus = n.handoverTo ? "Handed Over" : "Pending";
        const hToVal = n.handoverTo ? `To: ${n.handoverTo}` : "";
        const matchesHandover = selectedFilters.handover.includes(hStatus) || (hToVal && selectedFilters.handover.includes(hToVal));
        if (!matchesHandover) return false;
      }
      // Bill Date filter
      if (selectedFilters.billDate?.length > 0) {
        const val = n.billDate ? new Date(n.billDate).toLocaleDateString('en-IN') : "-";
        if (!selectedFilters.billDate.includes(val)) return false;
      }
      // Bill No filter
      if (selectedFilters.billNo?.length > 0) {
        const val = n.billNo || "-";
        if (!selectedFilters.billNo.includes(val)) return false;
      }
      // Bill Amount filter
      if (selectedFilters.billAmount?.length > 0) {
        const val = n.billAmount ? `₹${parseFloat(n.billAmount).toLocaleString('en-IN')}` : "-";
        if (!selectedFilters.billAmount.includes(val)) return false;
      }
      // Bill Mailed to BM filter
      if (selectedFilters.billMailedToBM?.length > 0) {
        const val = n.billMailedToBM ? "Yes" : "No";
        if (!selectedFilters.billMailedToBM.includes(val)) return false;
      }
      // Payment Received Date filter
      if (selectedFilters.paymentRcvdDate?.length > 0) {
        const val = n.paymentRcvdDate ? new Date(n.paymentRcvdDate).toLocaleDateString('en-IN') : "-";
        if (!selectedFilters.paymentRcvdDate.includes(val)) return false;
      }
      // Amount Received filter
      if (selectedFilters.amountRcvd?.length > 0) {
        const val = n.amountRcvd ? `₹${parseFloat(n.amountRcvd).toLocaleString('en-IN')}` : "-";
        if (!selectedFilters.amountRcvd.includes(val)) return false;
      }
      // TDS filter
      if (selectedFilters.tdsDeduction?.length > 0) {
        const val = n.tdsDeduction ? `₹${parseFloat(n.tdsDeduction).toLocaleString('en-IN')}` : "-";
        if (!selectedFilters.tdsDeduction.includes(val)) return false;
      }
      // GST filter
      if (selectedFilters.gstDeduction?.length > 0) {
        const val = n.gstDeduction ? `₹${parseFloat(n.gstDeduction).toLocaleString('en-IN')}` : "-";
        if (!selectedFilters.gstDeduction.includes(val)) return false;
      }
      // Expenses filter
      if (selectedFilters.expenses?.length > 0) {
        const val = n.expenses ? `₹${parseFloat(n.expenses).toLocaleString('en-IN')}` : "-";
        if (!selectedFilters.expenses.includes(val)) return false;
      }
      // Attachments filter
      if (selectedFilters.billingAttachments?.length > 0) {
        let hasAtt = false;
        if (n.billingAttachments) {
          try {
            const parsed = JSON.parse(n.billingAttachments);
            hasAtt = Array.isArray(parsed) && parsed.length > 0;
          } catch (_) {}
        }
        const val = hasAtt ? "Has Attachments" : "No Attachments";
        if (!selectedFilters.billingAttachments.includes(val)) return false;
      }
      // GP filter
      if (selectedFilters.gp?.length > 0) {
        const billAmt = parseFloat(n.billAmount) || 0;
        const deduction = (parseFloat(n.tdsDeduction) || 0) + (parseFloat(n.gstDeduction) || 0) + (parseFloat(n.expenses) || 0);
        const grossProfit = billAmt - deduction;
        
        let gpCat = "No Profit/Loss (= 0)";
        if (grossProfit > 0) gpCat = "Profit (> 0)";
        else if (grossProfit < 0) gpCat = "Loss (< 0)";
        
        if (!selectedFilters.gp.includes(gpCat)) return false;
      }
 
      return true;
    });
  }, [notices, searchQuery, selectedFilters, banksList, branchesList, noticeTypes]);

  const visibleColumnsCount = Object.values(visibleColumns).filter(Boolean).length + 1;

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
                    {documentFile && documentFile.type.startsWith("image/") && (
                      <LocalImagePreview file={documentFile} />
                    )}
                    <input
                      type="file"
                      onChange={e => setDocumentFile(e.target.files?.[0] || null)}
                      className="w-full bg-white border border-[#E8E4DF] rounded-lg px-3 py-1.5 text-xs focus:outline-none"
                    />
                    {documentUrl && (
                      <div className="flex items-center gap-2 shrink-0">
                        {/\.(png|jpe?g|webp|gif)$/i.test(documentUrl) && (
                          <img
                            src={documentUrl}
                            alt="preview"
                            className="w-8 h-8 object-cover rounded border border-slate-200 cursor-zoom-in hover:opacity-85 transition-opacity"
                            onClick={() => window.open(documentUrl, "_blank")}
                            title="Click to preview"
                          />
                        )}
                        <span className="text-[10px] bg-slate-100 px-2 py-1.5 rounded text-slate-500 truncate max-w-xs font-mono font-bold">
                          Exists: {documentUrl.substring(documentUrl.lastIndexOf('/') + 1)}
                        </span>
                      </div>
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
                <EmployeeAutocomplete
                  label="Brought By"
                  value={form.broughtBy}
                  onChange={val => setForm({ ...form, broughtBy: val })}
                  employees={employees}
                  placeholder="E.g. samay"
                />

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

                <EmployeeAutocomplete
                  label="Printed By"
                  value={form.printedBy}
                  onChange={val => setForm({ ...form, printedBy: val })}
                  employees={employees}
                />

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

                <EmployeeAutocomplete
                  label="Scanned By"
                  value={form.scannedBy}
                  onChange={val => setForm({ ...form, scannedBy: val })}
                  employees={employees}
                />

                <EmployeeAutocomplete
                  label="Notice Rename By"
                  value={form.noticeRenameBy}
                  onChange={val => setForm({ ...form, noticeRenameBy: val })}
                  employees={employees}
                />

                <EmployeeAutocomplete
                  label="Dispatched By"
                  value={form.dispatchedBy}
                  onChange={val => setForm({ ...form, dispatchedBy: val })}
                  employees={employees}
                />
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

              {/* Column Visibility checklist dropdown panel */}
              <div className="relative" ref={columnToggleRef}>
                <button
                  type="button"
                  onClick={() => setShowColumnToggle(!showColumnToggle)}
                  className={`p-2 border border-[#E8E4DF] hover:bg-[#F5F0EA] rounded-lg text-slate-550 transition-all shadow-sm flex items-center gap-1.5 ${showColumnToggle ? 'bg-[#F5F0EA]' : ''}`}
                  title="Toggle Column Visibility"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                </button>
                {showColumnToggle && (
                  <div className="absolute right-0 mt-1 z-[100] bg-white border border-[#E8E4DF] rounded-xl shadow-2xl p-4 w-56 text-xs text-slate-700 font-sans select-none">
                    <div className="font-bold uppercase tracking-wider text-[9px] text-slate-400 mb-2 border-b border-slate-100 pb-1.5">
                      Toggle Columns
                    </div>
                    <div className="space-y-1.5 max-h-[320px] overflow-y-auto pr-1">
                      {Object.keys(visibleColumns).map(colKey => {
                        const labelMap: Record<string, string> = {
                          bankBranch: "Bank/Branch",
                          noticeType: "Notice Type",
                          orderDate: "Order Date",
                          noticeDate: "Notice Date",
                          qty: "Quantity",
                          broughtBy: "Brought By",
                          noOfPrint: "No. of Print",
                          printedBy: "Printed By",
                          noOfScan: "No. of Scan",
                          scannedBy: "Scanned By",
                          noticeRenameBy: "Rename By",
                          dispatchedBy: "Dispatched By",
                          handover: "Handover Status",
                          billDate: "Bill Date",
                          billNo: "Bill No",
                          billAmount: "Bill Amount",
                          billMailedToBM: "Mailed to BM",
                          paymentRcvdDate: "Paid Date",
                          amountRcvd: "Paid Amount",
                          tdsDeduction: "TDS Deduction",
                          gstDeduction: "GST Deduction",
                          expenses: "Expenses",
                          billingAttachments: "Bill Attachments",
                          gp: "Gross Profit"
                        };
                        return (
                          <label key={colKey} className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded font-bold">
                            <input
                              type="checkbox"
                              checked={visibleColumns[colKey as keyof typeof visibleColumns]}
                              onChange={() => setVisibleColumns(prev => ({
                                ...prev,
                                [colKey]: !prev[colKey as keyof typeof visibleColumns]
                              }))}
                              className="rounded border-slate-300 text-indigo-650 focus:ring-indigo-500 w-3.5 h-3.5 cursor-pointer"
                            />
                            <span>{labelMap[colKey] || colKey}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Export to Excel button */}
              <button
                type="button"
                onClick={handleExportToExcel}
                className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-sm whitespace-nowrap"
                title="Export list to Excel"
              >
                <Download className="w-3.5 h-3.5" /> EXPORT
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
          <div className="overflow-x-auto" style={{ minHeight: "450px" }}>
            {loading ? (
              <div className="text-center py-16 text-slate-400 text-xs flex flex-col items-center gap-2">
                <RefreshCw className="w-6 h-6 animate-spin text-indigo-600" /> LOADING NOTICES...
              </div>
            ) : (
              <>
                <style>{`
                  .notice-tracking-table th,
                  .notice-tracking-table td {
                    padding-left: 10px !important;
                    padding-right: 10px !important;
                    padding-top: 12px !important;
                    padding-bottom: 12px !important;
                    white-space: nowrap;
                  }
                  .notice-tracking-table td.allow-wrap {
                    white-space: normal !important;
                  }
                `}</style>
                <table className="notice-tracking-table min-w-[2800px] w-full text-left border-collapse text-[11px] font-sans">
                <thead>
                  <tr className="bg-slate-50 border-b border-[#E8E4DF] text-[9px] uppercase tracking-wider text-slate-500 font-black">
                    {visibleColumns.bankBranch && (
                      <th className="px-3 py-2.5 relative">
                        <div className="flex items-center justify-between gap-1">
                          <span>BANK/BRANCH</span>
                          <button
                            type="button"
                            onClick={() => setActiveFilterKey(activeFilterKey === "bank" ? null : "bank")}
                            className="p-0.5 rounded hover:bg-slate-200 transition-colors"
                          >
                            <Filter className={`w-3.5 h-3.5 ${selectedFilters.bank.length > 0 ? "text-indigo-650 fill-indigo-100" : "text-slate-450"}`} />
                          </button>
                        </div>
                        {activeFilterKey === "bank" && (
                          <HeaderFilter
                            filterKey="bank"
                            options={uniqueBanks}
                            selectedValues={selectedFilters.bank}
                            onChange={vals => setSelectedFilters(prev => ({ ...prev, bank: vals }))}
                            onClose={() => setActiveFilterKey(null)}
                          />
                        )}
                      </th>
                    )}
                    {visibleColumns.noticeType && (
                      <th className="px-3 py-2.5 relative">
                        <div className="flex items-center justify-between gap-1">
                          <span>NOTICE TYPE</span>
                          <button
                            type="button"
                            onClick={() => setActiveFilterKey(activeFilterKey === "noticeType" ? null : "noticeType")}
                            className="p-0.5 rounded hover:bg-slate-200 transition-colors"
                          >
                            <Filter className={`w-3.5 h-3.5 ${selectedFilters.noticeType.length > 0 ? "text-indigo-650 fill-indigo-100" : "text-slate-450"}`} />
                          </button>
                        </div>
                        {activeFilterKey === "noticeType" && (
                          <HeaderFilter
                            filterKey="noticeType"
                            options={uniqueNoticeTypes}
                            selectedValues={selectedFilters.noticeType}
                            onChange={vals => setSelectedFilters(prev => ({ ...prev, noticeType: vals }))}
                            onClose={() => setActiveFilterKey(null)}
                          />
                        )}
                      </th>
                    )}
                    {visibleColumns.orderDate && (
                      <th className="px-3 py-2.5 relative">
                        <div className="flex items-center justify-between gap-1">
                          <span>ORDER DATE</span>
                          <button
                            type="button"
                            onClick={() => setActiveFilterKey(activeFilterKey === "orderDate" ? null : "orderDate")}
                            className="p-0.5 rounded hover:bg-slate-200 transition-colors"
                          >
                            <Filter className={`w-3.5 h-3.5 ${selectedFilters.orderDate.length > 0 ? "text-indigo-650 fill-indigo-100" : "text-slate-450"}`} />
                          </button>
                        </div>
                        {activeFilterKey === "orderDate" && (
                          <HeaderFilter
                            filterKey="orderDate"
                            options={uniqueOrderDates}
                            selectedValues={selectedFilters.orderDate}
                            onChange={vals => setSelectedFilters(prev => ({ ...prev, orderDate: vals }))}
                            onClose={() => setActiveFilterKey(null)}
                          />
                        )}
                      </th>
                    )}
                    {visibleColumns.noticeDate && (
                      <th className="px-3 py-2.5 relative">
                        <div className="flex items-center justify-between gap-1">
                          <span>NOTICE DATE</span>
                          <button
                            type="button"
                            onClick={() => setActiveFilterKey(activeFilterKey === "noticeDate" ? null : "noticeDate")}
                            className="p-0.5 rounded hover:bg-slate-200 transition-colors"
                          >
                            <Filter className={`w-3.5 h-3.5 ${selectedFilters.noticeDate.length > 0 ? "text-indigo-650 fill-indigo-100" : "text-slate-450"}`} />
                          </button>
                        </div>
                        {activeFilterKey === "noticeDate" && (
                          <HeaderFilter
                            filterKey="noticeDate"
                            options={uniqueNoticeDates}
                            selectedValues={selectedFilters.noticeDate}
                            onChange={vals => setSelectedFilters(prev => ({ ...prev, noticeDate: vals }))}
                            onClose={() => setActiveFilterKey(null)}
                          />
                        )}
                      </th>
                    )}
                    {visibleColumns.qty && (
                      <th className="px-3 py-2.5 relative text-center">
                        <div className="flex items-center justify-center gap-1">
                          <span>QTY</span>
                          <button
                            type="button"
                            onClick={() => setActiveFilterKey(activeFilterKey === "qty" ? null : "qty")}
                            className="p-0.5 rounded hover:bg-slate-200 transition-colors"
                          >
                            <Filter className={`w-3.5 h-3.5 ${selectedFilters.qty.length > 0 ? "text-indigo-650 fill-indigo-100" : "text-slate-450"}`} />
                          </button>
                        </div>
                        {activeFilterKey === "qty" && (
                          <HeaderFilter
                            filterKey="qty"
                            options={uniqueQties}
                            selectedValues={selectedFilters.qty}
                            onChange={vals => setSelectedFilters(prev => ({ ...prev, qty: vals }))}
                            onClose={() => setActiveFilterKey(null)}
                          />
                        )}
                      </th>
                    )}
                    {visibleColumns.broughtBy && (
                      <th className="px-3 py-2.5 relative">
                        <div className="flex items-center justify-between gap-1">
                          <span>BROUGHT BY</span>
                          <button
                            type="button"
                            onClick={() => setActiveFilterKey(activeFilterKey === "broughtBy" ? null : "broughtBy")}
                            className="p-0.5 rounded hover:bg-slate-200 transition-colors"
                          >
                            <Filter className={`w-3.5 h-3.5 ${selectedFilters.broughtBy.length > 0 ? "text-indigo-650 fill-indigo-100" : "text-slate-450"}`} />
                          </button>
                        </div>
                        {activeFilterKey === "broughtBy" && (
                          <HeaderFilter
                            filterKey="broughtBy"
                            options={uniqueBroughtBy}
                            selectedValues={selectedFilters.broughtBy}
                            onChange={vals => setSelectedFilters(prev => ({ ...prev, broughtBy: vals }))}
                            onClose={() => setActiveFilterKey(null)}
                          />
                        )}
                      </th>
                    )}
                    {visibleColumns.noOfPrint && (
                      <th className="px-3 py-2.5 relative text-center">
                        <div className="flex items-center justify-center gap-1">
                          <span>NO. OF PRINT</span>
                          <button
                            type="button"
                            onClick={() => setActiveFilterKey(activeFilterKey === "noOfPrint" ? null : "noOfPrint")}
                            className="p-0.5 rounded hover:bg-slate-200 transition-colors"
                          >
                            <Filter className={`w-3.5 h-3.5 ${selectedFilters.noOfPrint.length > 0 ? "text-indigo-650 fill-indigo-100" : "text-slate-450"}`} />
                          </button>
                        </div>
                        {activeFilterKey === "noOfPrint" && (
                          <HeaderFilter
                            filterKey="noOfPrint"
                            options={uniqueNoOfPrint}
                            selectedValues={selectedFilters.noOfPrint}
                            onChange={vals => setSelectedFilters(prev => ({ ...prev, noOfPrint: vals }))}
                            onClose={() => setActiveFilterKey(null)}
                          />
                        )}
                      </th>
                    )}
                    {visibleColumns.printedBy && (
                      <th className="px-3 py-2.5 relative">
                        <div className="flex items-center justify-between gap-1">
                          <span>PRINTED BY</span>
                          <button
                            type="button"
                            onClick={() => setActiveFilterKey(activeFilterKey === "printedBy" ? null : "printedBy")}
                            className="p-0.5 rounded hover:bg-slate-200 transition-colors"
                          >
                            <Filter className={`w-3.5 h-3.5 ${selectedFilters.printedBy.length > 0 ? "text-indigo-650 fill-indigo-100" : "text-slate-450"}`} />
                          </button>
                        </div>
                        {activeFilterKey === "printedBy" && (
                          <HeaderFilter
                            filterKey="printedBy"
                            options={uniquePrintedBy}
                            selectedValues={selectedFilters.printedBy}
                            onChange={vals => setSelectedFilters(prev => ({ ...prev, printedBy: vals }))}
                            onClose={() => setActiveFilterKey(null)}
                          />
                        )}
                      </th>
                    )}
                    {visibleColumns.noOfScan && (
                      <th className="px-3 py-2.5 relative text-center">
                        <div className="flex items-center justify-center gap-1">
                          <span>NO. OF SCAN</span>
                          <button
                            type="button"
                            onClick={() => setActiveFilterKey(activeFilterKey === "noOfScan" ? null : "noOfScan")}
                            className="p-0.5 rounded hover:bg-slate-200 transition-colors"
                          >
                            <Filter className={`w-3.5 h-3.5 ${selectedFilters.noOfScan.length > 0 ? "text-indigo-650 fill-indigo-100" : "text-slate-450"}`} />
                          </button>
                        </div>
                        {activeFilterKey === "noOfScan" && (
                          <HeaderFilter
                            filterKey="noOfScan"
                            options={uniqueNoOfScan}
                            selectedValues={selectedFilters.noOfScan}
                            onChange={vals => setSelectedFilters(prev => ({ ...prev, noOfScan: vals }))}
                            onClose={() => setActiveFilterKey(null)}
                          />
                        )}
                      </th>
                    )}
                    {visibleColumns.scannedBy && (
                      <th className="px-3 py-2.5 relative">
                        <div className="flex items-center justify-between gap-1">
                          <span>SCANNED BY</span>
                          <button
                            type="button"
                            onClick={() => setActiveFilterKey(activeFilterKey === "scannedBy" ? null : "scannedBy")}
                            className="p-0.5 rounded hover:bg-slate-200 transition-colors"
                          >
                            <Filter className={`w-3.5 h-3.5 ${selectedFilters.scannedBy.length > 0 ? "text-indigo-650 fill-indigo-100" : "text-slate-450"}`} />
                          </button>
                        </div>
                        {activeFilterKey === "scannedBy" && (
                          <HeaderFilter
                            filterKey="scannedBy"
                            options={uniqueScannedBy}
                            selectedValues={selectedFilters.scannedBy}
                            onChange={vals => setSelectedFilters(prev => ({ ...prev, scannedBy: vals }))}
                            onClose={() => setActiveFilterKey(null)}
                          />
                        )}
                      </th>
                    )}
                    {visibleColumns.noticeRenameBy && (
                      <th className="px-3 py-2.5 relative">
                        <div className="flex items-center justify-between gap-1">
                          <span>RENAME BY</span>
                          <button
                            type="button"
                            onClick={() => setActiveFilterKey(activeFilterKey === "noticeRenameBy" ? null : "noticeRenameBy")}
                            className="p-0.5 rounded hover:bg-slate-200 transition-colors"
                          >
                            <Filter className={`w-3.5 h-3.5 ${selectedFilters.noticeRenameBy.length > 0 ? "text-indigo-650 fill-indigo-100" : "text-slate-450"}`} />
                          </button>
                        </div>
                        {activeFilterKey === "noticeRenameBy" && (
                          <HeaderFilter
                            filterKey="noticeRenameBy"
                            options={uniqueNoticeRenameBy}
                            selectedValues={selectedFilters.noticeRenameBy}
                            onChange={vals => setSelectedFilters(prev => ({ ...prev, noticeRenameBy: vals }))}
                            onClose={() => setActiveFilterKey(null)}
                          />
                        )}
                      </th>
                    )}
                    {visibleColumns.dispatchedBy && (
                      <th className="px-3 py-2.5 relative">
                        <div className="flex items-center justify-between gap-1">
                          <span>DISPATCHED BY</span>
                          <button
                            type="button"
                            onClick={() => setActiveFilterKey(activeFilterKey === "dispatchedBy" ? null : "dispatchedBy")}
                            className="p-0.5 rounded hover:bg-slate-200 transition-colors"
                          >
                            <Filter className={`w-3.5 h-3.5 ${selectedFilters.dispatchedBy.length > 0 ? "text-indigo-650 fill-indigo-100" : "text-slate-450"}`} />
                          </button>
                        </div>
                        {activeFilterKey === "dispatchedBy" && (
                          <HeaderFilter
                            filterKey="dispatchedBy"
                            options={uniqueDispatchedBy}
                            selectedValues={selectedFilters.dispatchedBy}
                            onChange={vals => setSelectedFilters(prev => ({ ...prev, dispatchedBy: vals }))}
                            onClose={() => setActiveFilterKey(null)}
                          />
                        )}
                      </th>
                    )}
                    {visibleColumns.handover && (
                      <th className="px-3 py-2.5 relative">
                        <div className="flex items-center justify-between gap-1">
                          <span>HANDOVER</span>
                          <button
                            type="button"
                            onClick={() => setActiveFilterKey(activeFilterKey === "handover" ? null : "handover")}
                            className="p-0.5 rounded hover:bg-slate-200 transition-colors"
                          >
                            <Filter className={`w-3.5 h-3.5 ${selectedFilters.handover.length > 0 ? "text-indigo-650 fill-indigo-100" : "text-slate-450"}`} />
                          </button>
                        </div>
                        {activeFilterKey === "handover" && (
                          <HeaderFilter
                            filterKey="handover"
                            options={uniqueHandover}
                            selectedValues={selectedFilters.handover}
                            onChange={vals => setSelectedFilters(prev => ({ ...prev, handover: vals }))}
                            onClose={() => setActiveFilterKey(null)}
                          />
                        )}
                      </th>
                    )}
                    {/* BILL DATE */}
                    {visibleColumns.billDate && (
                      <th className="px-3 py-2.5 relative">
                        <div className="flex items-center justify-between gap-1">
                          <span>BILL DATE</span>
                          <button
                            type="button"
                            onClick={() => setActiveFilterKey(activeFilterKey === "billDate" ? null : "billDate")}
                            className="p-0.5 rounded hover:bg-slate-200 transition-colors"
                          >
                            <Filter className={`w-3.5 h-3.5 ${selectedFilters.billDate.length > 0 ? "text-indigo-650 fill-indigo-100" : "text-slate-455"}`} />
                          </button>
                        </div>
                        {activeFilterKey === "billDate" && (
                          <HeaderFilter
                            filterKey="billDate"
                            options={uniqueBillDates}
                            selectedValues={selectedFilters.billDate}
                            onChange={vals => setSelectedFilters(prev => ({ ...prev, billDate: vals }))}
                            onClose={() => setActiveFilterKey(null)}
                          />
                        )}
                      </th>
                    )}

                    {/* BILL NO */}
                    {visibleColumns.billNo && (
                      <th className="px-3 py-2.5 relative">
                        <div className="flex items-center justify-between gap-1">
                          <span>BILL NO</span>
                          <button
                            type="button"
                            onClick={() => setActiveFilterKey(activeFilterKey === "billNo" ? null : "billNo")}
                            className="p-0.5 rounded hover:bg-slate-200 transition-colors"
                          >
                            <Filter className={`w-3.5 h-3.5 ${selectedFilters.billNo.length > 0 ? "text-indigo-650 fill-indigo-100" : "text-slate-455"}`} />
                          </button>
                        </div>
                        {activeFilterKey === "billNo" && (
                          <HeaderFilter
                            filterKey="billNo"
                            options={uniqueBillNos}
                            selectedValues={selectedFilters.billNo}
                            onChange={vals => setSelectedFilters(prev => ({ ...prev, billNo: vals }))}
                            onClose={() => setActiveFilterKey(null)}
                          />
                        )}
                      </th>
                    )}

                    {/* BILL AMOUNT */}
                    {visibleColumns.billAmount && (
                      <th className="px-3 py-2.5 relative">
                        <div className="flex items-center justify-between gap-1">
                          <span>BILL AMOUNT</span>
                          <button
                            type="button"
                            onClick={() => setActiveFilterKey(activeFilterKey === "billAmount" ? null : "billAmount")}
                            className="p-0.5 rounded hover:bg-slate-200 transition-colors"
                          >
                            <Filter className={`w-3.5 h-3.5 ${selectedFilters.billAmount.length > 0 ? "text-indigo-650 fill-indigo-100" : "text-slate-455"}`} />
                          </button>
                        </div>
                        {activeFilterKey === "billAmount" && (
                          <HeaderFilter
                            filterKey="billAmount"
                            options={uniqueBillAmounts}
                            selectedValues={selectedFilters.billAmount}
                            onChange={vals => setSelectedFilters(prev => ({ ...prev, billAmount: vals }))}
                            onClose={() => setActiveFilterKey(null)}
                          />
                        )}
                      </th>
                    )}

                    {/* MAILED TO BM */}
                    {visibleColumns.billMailedToBM && (
                      <th className="px-3 py-2.5 relative">
                        <div className="flex items-center justify-between gap-1">
                          <span>MAILED TO BM</span>
                          <button
                            type="button"
                            onClick={() => setActiveFilterKey(activeFilterKey === "billMailedToBM" ? null : "billMailedToBM")}
                            className="p-0.5 rounded hover:bg-slate-200 transition-colors"
                          >
                            <Filter className={`w-3.5 h-3.5 ${selectedFilters.billMailedToBM.length > 0 ? "text-indigo-650 fill-indigo-100" : "text-slate-455"}`} />
                          </button>
                        </div>
                        {activeFilterKey === "billMailedToBM" && (
                          <HeaderFilter
                            filterKey="billMailedToBM"
                            options={uniqueBillMailedToBM}
                            selectedValues={selectedFilters.billMailedToBM}
                            onChange={vals => setSelectedFilters(prev => ({ ...prev, billMailedToBM: vals }))}
                            onClose={() => setActiveFilterKey(null)}
                          />
                        )}
                      </th>
                    )}

                    {/* PAID DATE */}
                    {visibleColumns.paymentRcvdDate && (
                      <th className="px-3 py-2.5 relative">
                        <div className="flex items-center justify-between gap-1">
                          <span>PAID DATE</span>
                          <button
                            type="button"
                            onClick={() => setActiveFilterKey(activeFilterKey === "paymentRcvdDate" ? null : "paymentRcvdDate")}
                            className="p-0.5 rounded hover:bg-slate-200 transition-colors"
                          >
                            <Filter className={`w-3.5 h-3.5 ${selectedFilters.paymentRcvdDate.length > 0 ? "text-indigo-650 fill-indigo-100" : "text-slate-455"}`} />
                          </button>
                        </div>
                        {activeFilterKey === "paymentRcvdDate" && (
                          <HeaderFilter
                            filterKey="paymentRcvdDate"
                            options={uniquePaymentRcvdDates}
                            selectedValues={selectedFilters.paymentRcvdDate}
                            onChange={vals => setSelectedFilters(prev => ({ ...prev, paymentRcvdDate: vals }))}
                            onClose={() => setActiveFilterKey(null)}
                          />
                        )}
                      </th>
                    )}

                    {/* PAID AMOUNT */}
                    {visibleColumns.amountRcvd && (
                      <th className="px-3 py-2.5 relative">
                        <div className="flex items-center justify-between gap-1">
                          <span>PAID AMOUNT</span>
                          <button
                            type="button"
                            onClick={() => setActiveFilterKey(activeFilterKey === "amountRcvd" ? null : "amountRcvd")}
                            className="p-0.5 rounded hover:bg-slate-200 transition-colors"
                          >
                            <Filter className={`w-3.5 h-3.5 ${selectedFilters.amountRcvd.length > 0 ? "text-indigo-650 fill-indigo-100" : "text-slate-455"}`} />
                          </button>
                        </div>
                        {activeFilterKey === "amountRcvd" && (
                          <HeaderFilter
                            filterKey="amountRcvd"
                            options={uniqueAmountRcvds}
                            selectedValues={selectedFilters.amountRcvd}
                            onChange={vals => setSelectedFilters(prev => ({ ...prev, amountRcvd: vals }))}
                            onClose={() => setActiveFilterKey(null)}
                          />
                        )}
                      </th>
                    )}

                    {/* TDS DEDUCTION */}
                    {visibleColumns.tdsDeduction && (
                      <th className="px-3 py-2.5 relative">
                        <div className="flex items-center justify-between gap-1">
                          <span>TDS DEDUCTION</span>
                          <button
                            type="button"
                            onClick={() => setActiveFilterKey(activeFilterKey === "tdsDeduction" ? null : "tdsDeduction")}
                            className="p-0.5 rounded hover:bg-slate-200 transition-colors"
                          >
                            <Filter className={`w-3.5 h-3.5 ${selectedFilters.tdsDeduction.length > 0 ? "text-indigo-650 fill-indigo-100" : "text-slate-455"}`} />
                          </button>
                        </div>
                        {activeFilterKey === "tdsDeduction" && (
                          <HeaderFilter
                            filterKey="tdsDeduction"
                            options={uniqueTdsDeductions}
                            selectedValues={selectedFilters.tdsDeduction}
                            onChange={vals => setSelectedFilters(prev => ({ ...prev, tdsDeduction: vals }))}
                            onClose={() => setActiveFilterKey(null)}
                          />
                        )}
                      </th>
                    )}

                    {/* GST DEDUCTION */}
                    {visibleColumns.gstDeduction && (
                      <th className="px-3 py-2.5 relative">
                        <div className="flex items-center justify-between gap-1">
                          <span>GST DEDUCTION</span>
                          <button
                            type="button"
                            onClick={() => setActiveFilterKey(activeFilterKey === "gstDeduction" ? null : "gstDeduction")}
                            className="p-0.5 rounded hover:bg-slate-200 transition-colors"
                          >
                            <Filter className={`w-3.5 h-3.5 ${selectedFilters.gstDeduction.length > 0 ? "text-indigo-650 fill-indigo-100" : "text-slate-455"}`} />
                          </button>
                        </div>
                        {activeFilterKey === "gstDeduction" && (
                          <HeaderFilter
                            filterKey="gstDeduction"
                            options={uniqueGstDeductions}
                            selectedValues={selectedFilters.gstDeduction}
                            onChange={vals => setSelectedFilters(prev => ({ ...prev, gstDeduction: vals }))}
                            onClose={() => setActiveFilterKey(null)}
                          />
                        )}
                      </th>
                    )}

                    {/* EXPENSES */}
                    {visibleColumns.expenses && (
                      <th className="px-3 py-2.5 relative">
                        <div className="flex items-center justify-between gap-1">
                          <span>EXPENSES</span>
                          <button
                            type="button"
                            onClick={() => setActiveFilterKey(activeFilterKey === "expenses" ? null : "expenses")}
                            className="p-0.5 rounded hover:bg-slate-200 transition-colors"
                          >
                            <Filter className={`w-3.5 h-3.5 ${selectedFilters.expenses.length > 0 ? "text-indigo-650 fill-indigo-100" : "text-slate-455"}`} />
                          </button>
                        </div>
                        {activeFilterKey === "expenses" && (
                          <HeaderFilter
                            filterKey="expenses"
                            options={uniqueExpenses}
                            selectedValues={selectedFilters.expenses}
                            onChange={vals => setSelectedFilters(prev => ({ ...prev, expenses: vals }))}
                            onClose={() => setActiveFilterKey(null)}
                          />
                        )}
                      </th>
                    )}

                    {/* BILL ATTACHMENTS */}
                    {visibleColumns.billingAttachments && (
                      <th className="px-3 py-2.5 relative">
                        <div className="flex items-center justify-between gap-1">
                          <span>BILL ATTACHMENTS</span>
                          <button
                            type="button"
                            onClick={() => setActiveFilterKey(activeFilterKey === "billingAttachments" ? null : "billingAttachments")}
                            className="p-0.5 rounded hover:bg-slate-200 transition-colors"
                          >
                            <Filter className={`w-3.5 h-3.5 ${selectedFilters.billingAttachments.length > 0 ? "text-indigo-650 fill-indigo-100" : "text-slate-455"}`} />
                          </button>
                        </div>
                        {activeFilterKey === "billingAttachments" && (
                          <HeaderFilter
                            filterKey="billingAttachments"
                            options={uniqueBillingAttachmentsOpts}
                            selectedValues={selectedFilters.billingAttachments}
                            onChange={vals => setSelectedFilters(prev => ({ ...prev, billingAttachments: vals }))}
                            onClose={() => setActiveFilterKey(null)}
                          />
                        )}
                      </th>
                    )}
                    {visibleColumns.gp && (
                      <th className="px-3 py-2.5 relative text-right font-black">
                        <div className="flex items-center justify-end gap-1">
                          <span>GP</span>
                          <button
                            type="button"
                            onClick={() => setActiveFilterKey(activeFilterKey === "gp" ? null : "gp")}
                            className="p-0.5 rounded hover:bg-slate-200 transition-colors"
                          >
                            <Filter className={`w-3.5 h-3.5 ${selectedFilters.gp.length > 0 ? "text-indigo-650 fill-indigo-100" : "text-slate-450"}`} />
                          </button>
                        </div>
                        {activeFilterKey === "gp" && (
                          <HeaderFilter
                            filterKey="gp"
                            options={uniqueGPOpts}
                            selectedValues={selectedFilters.gp}
                            onChange={vals => setSelectedFilters(prev => ({ ...prev, gp: vals }))}
                            onClose={() => setActiveFilterKey(null)}
                          />
                        )}
                      </th>
                    )}
                    <th className="px-1 py-2.5 text-right font-black w-[150px] min-w-[150px]">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8E4DF] text-xs font-semibold text-slate-700">
                  {filteredNotices.length === 0 ? (
                    <tr>
                      <td colSpan={visibleColumnsCount} className="text-center py-16 text-slate-400 text-xs uppercase tracking-wider font-bold">
                        <div className="flex flex-col items-center gap-3">
                          <span>No Notice Records Found.</span>
                          <button
                            type="button"
                            onClick={() => setSelectedFilters({
                              bank: [],
                              noticeType: [],
                              orderDate: [],
                              noticeDate: [],
                              qty: [],
                              broughtBy: [],
                              noOfPrint: [],
                              printedBy: [],
                              noOfScan: [],
                              scannedBy: [],
                              noticeRenameBy: [],
                              dispatchedBy: [],
                              handover: [],
                              billDate: [],
                              billNo: [],
                              billAmount: [],
                              billMailedToBM: [],
                              paymentRcvdDate: [],
                              amountRcvd: [],
                              tdsDeduction: [],
                              gstDeduction: [],
                              expenses: [],
                              billingAttachments: [],
                              gp: [],
                            })}
                            className="px-3.5 py-2 bg-slate-50 hover:bg-slate-100 text-slate-650 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-colors border border-[#E8E4DF] shadow-sm"
                          >
                            Clear All Filters
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredNotices.map((n) => {
                    const bank = banksList.find(b => b.id?.toString() === n.bankId?.toString());
                    const branch = branchesList.find(br => br.branchCode === n.branchId?.toString());
 
                    // GP = billAmount - (TDS + GST + expenses)
                    const billAmt = parseFloat(n.billAmount) || 0;
                    const deduction = (parseFloat(n.tdsDeduction) || 0) + (parseFloat(n.gstDeduction) || 0) + (parseFloat(n.expenses) || 0);
                    const grossProfit = billAmt - deduction;
 
                    return (
                      <tr key={n.id} className="hover:bg-slate-50/50 transition-colors">
                        {/* BANK/BRANCH */}
                        {visibleColumns.bankBranch && (
                          <td className="allow-wrap px-3 py-3 max-w-[180px]">
                            <div className="font-extrabold text-slate-900 truncate">{bank?.bankName || "Unknown Bank"}</div>
                            <div className="text-[10px] text-slate-500 truncate mt-0.5">
                              {branch?.branchName || "Unknown Branch"} ({n.branchId})
                            </div>
                          </td>
                        )}
 
                        {/* NOTICE TYPE */}
                        {visibleColumns.noticeType && (
                          <td className="px-3 py-3">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-850 border border-indigo-100">
                              {noticeTypes.find(t => t.id?.toString() === n.noticeTypeId?.toString())?.name || n.noticeType || "-"}
                            </span>
                          </td>
                        )}
 
                        {/* ORDER DATE */}
                        {visibleColumns.orderDate && (
                          <td className="px-3 py-3 text-[11px] font-mono">
                            {n.noticeOrderDate ? new Date(n.noticeOrderDate).toLocaleDateString('en-IN') : "-"}
                          </td>
                        )}

                        {/* NOTICE DATE */}
                        {visibleColumns.noticeDate && (
                          <td className="px-3 py-3 text-[11px] font-mono">
                            {n.noticeDate ? new Date(n.noticeDate).toLocaleDateString('en-IN') : "-"}
                          </td>
                        )}
 
                        {/* QTY */}
                        {visibleColumns.qty && (
                          <td className="px-3 py-3 font-mono font-bold text-slate-800 text-center text-sm">
                            {n.quantity || 1}
                          </td>
                        )}
 
                        {/* BROUGHT BY */}
                        {visibleColumns.broughtBy && (
                          <td className="px-3 py-3 text-slate-700 font-semibold truncate max-w-[120px]">
                            {n.broughtBy || <span className="text-slate-350">-</span>}
                          </td>
                        )}
 
                        {/* NO. OF PRINT */}
                        {visibleColumns.noOfPrint && (
                          <td className="px-3 py-3 text-center font-mono font-bold text-slate-650">
                            {n.noOfPrint || 0}
                          </td>
                        )}
 
                        {/* PRINTED BY */}
                        {visibleColumns.printedBy && (
                          <td className="px-3 py-3 text-slate-700 font-semibold truncate max-w-[120px]">
                            {n.printedBy || <span className="text-slate-350">-</span>}
                          </td>
                        )}
 
                        {/* NO. OF SCAN */}
                        {visibleColumns.noOfScan && (
                          <td className="px-3 py-3 text-center font-mono font-bold text-slate-650">
                            {n.noOfScan || 0}
                          </td>
                        )}
 
                        {/* SCANNED BY */}
                        {visibleColumns.scannedBy && (
                          <td className="px-3 py-3 text-slate-700 font-semibold truncate max-w-[120px]">
                            {n.scannedBy || <span className="text-slate-350">-</span>}
                          </td>
                        )}
 
                        {/* NOTICE RENAME BY */}
                        {visibleColumns.noticeRenameBy && (
                          <td className="px-3 py-3 text-slate-700 font-semibold truncate max-w-[120px]">
                            {n.noticeRenameBy || <span className="text-slate-350">-</span>}
                          </td>
                        )}
 
                        {/* DISPATCHED BY */}
                        {visibleColumns.dispatchedBy && (
                          <td className="px-3 py-3 text-slate-700 font-semibold truncate max-w-[120px]">
                            {n.dispatchedBy || <span className="text-slate-350">-</span>}
                          </td>
                        )}
 
                        {/* HANDOVER */}
                        {visibleColumns.handover && (
                          <td className="px-3 py-3 leading-normal">
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
                        )}
 
                        {/* BILL DATE */}
                        {visibleColumns.billDate && (
                          <td className="px-3 py-3 text-[11px] font-mono">
                            {n.billDate ? new Date(n.billDate).toLocaleDateString('en-IN') : "-"}
                          </td>
                        )}

                        {/* BILL NO */}
                        {visibleColumns.billNo && (
                          <td className="px-3 py-3 text-[11px] font-mono font-bold text-slate-800">
                            {n.billNo || <span className="text-slate-400">-</span>}
                          </td>
                        )}

                        {/* BILL AMOUNT */}
                        {visibleColumns.billAmount && (
                          <td className="px-3 py-3 text-[11px] font-mono font-black text-slate-800">
                            {n.billAmount ? `₹${parseFloat(n.billAmount).toLocaleString('en-IN')}` : <span className="text-slate-400">-</span>}
                          </td>
                        )}

                        {/* MAILED TO BM */}
                        {visibleColumns.billMailedToBM && (
                          <td className="px-3 py-3">
                            {n.billMailedToBM ? (
                              <span className="px-2 py-0.5 rounded text-[9px] font-black bg-emerald-50 text-emerald-700 border border-emerald-100">
                                ✓ Mailed
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-slate-50 text-slate-400 border border-slate-100">
                                Pending
                              </span>
                            )}
                          </td>
                        )}

                        {/* PAID DATE */}
                        {visibleColumns.paymentRcvdDate && (
                          <td className="px-3 py-3 text-[11px] font-mono">
                            {n.paymentRcvdDate ? new Date(n.paymentRcvdDate).toLocaleDateString('en-IN') : "-"}
                          </td>
                        )}

                        {/* PAID AMOUNT */}
                        {visibleColumns.amountRcvd && (
                          <td className="px-3 py-3 text-[11px] font-mono font-bold text-emerald-700">
                            {n.amountRcvd ? `₹${parseFloat(n.amountRcvd).toLocaleString('en-IN')}` : <span className="text-slate-400">-</span>}
                          </td>
                        )}

                        {/* TDS DEDUCTION */}
                        {visibleColumns.tdsDeduction && (
                          <td className="px-3 py-3 text-[11px] font-mono text-rose-700">
                            {n.tdsDeduction ? `₹${parseFloat(n.tdsDeduction).toLocaleString('en-IN')}` : <span className="text-slate-400">-</span>}
                          </td>
                        )}

                        {/* GST DEDUCTION */}
                        {visibleColumns.gstDeduction && (
                          <td className="px-3 py-3 text-[11px] font-mono text-rose-700">
                            {n.gstDeduction ? `₹${parseFloat(n.gstDeduction).toLocaleString('en-IN')}` : <span className="text-slate-400">-</span>}
                          </td>
                        )}

                        {/* EXPENSES */}
                        {visibleColumns.expenses && (
                          <td className="px-3 py-3 text-[11px] font-mono text-rose-700">
                            {n.expenses ? `₹${parseFloat(n.expenses).toLocaleString('en-IN')}` : <span className="text-slate-400">-</span>}
                          </td>
                        )}

                        {/* BILL ATTACHMENTS */}
                        {visibleColumns.billingAttachments && (
                          <td className="px-3 py-3">
                            {(() => {
                              if (!n.billingAttachments) return <span className="text-slate-350">-</span>;
                              try {
                                const parsed = JSON.parse(n.billingAttachments);
                                if (!Array.isArray(parsed) || parsed.length === 0) return <span className="text-slate-350">-</span>;
                                return (
                                  <div className="flex items-center gap-1">
                                    {parsed.map((att: any, attIdx: number) => {
                                      const isImg = att.type === "image";
                                      if (isImg) {
                                        return (
                                          <img
                                            key={attIdx}
                                            src={att.url}
                                            alt={att.name}
                                            className="w-6 h-6 object-cover rounded border border-slate-200 cursor-zoom-in hover:scale-110 transition-transform"
                                            onClick={() => window.open(att.url, "_blank")}
                                            title={`Preview: ${att.name}`}
                                          />
                                        );
                                      }
                                      const icon = att.type === "pdf" ? "📄" : att.type === "excel" ? "📊" : att.type === "recording" ? "🎵" : "📎";
                                      return (
                                        <a
                                          key={attIdx}
                                          href={att.url}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="w-6 h-6 flex items-center justify-center bg-slate-50 border border-slate-200 rounded text-xs hover:bg-slate-100 transition-colors"
                                          title={`Open: ${att.name}`}
                                        >
                                          {icon}
                                        </a>
                                      );
                                    })}
                                  </div>
                                );
                              } catch (_) {
                                return <span className="text-slate-350">-</span>;
                              }
                            })()}
                          </td>
                        )}
 
                        {/* GP */}
                        {visibleColumns.gp && (
                          <td className="px-3 py-3">
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
                        )}
 
                        {/* ACTIONS */}
                        <td className="px-1 py-2 text-right w-[100px] min-w-[100px]">
                          <div className="flex flex-col items-end gap-1 w-full">
                            {/* Top row: 2 workflow actions */}
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleOpenHandoverModal(n)}
                                className={`p-1 rounded border transition-all flex items-center justify-center ${n.handoverTo
                                    ? 'border-emerald-250 text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                                    : 'border-slate-250 text-slate-500 bg-slate-50 hover:bg-slate-100 hover:text-slate-700'
                                  }`}
                                title={n.handoverTo ? `Handed Over to ${n.handoverTo} (Click to Edit)` : "Click to Handover Notice"}
                              >
                                <UserCheck className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenBillingModal(n)}
                                className={`p-1 rounded border transition-all flex items-center justify-center ${(n.billNo || parseFloat(n.billAmount) > 0)
                                    ? 'border-indigo-250 text-indigo-700 bg-indigo-50 hover:bg-indigo-100'
                                    : 'border-amber-250 text-amber-700 bg-amber-50 hover:bg-amber-100 hover:text-amber-850'
                                  }`}
                                title={(n.billNo || parseFloat(n.billAmount) > 0) ? `Billed (Click to Edit Billing)` : "Click to Add Billing"}
                              >
                                <DollarSign className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {/* Bottom row: 3 utility actions */}
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => setViewingNotice(n)}
                                className="p-1 text-slate-550 hover:text-indigo-650 hover:bg-slate-100 rounded border border-slate-200 bg-white transition-colors"
                                title="View Details"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleEdit(n)}
                                className="p-1 text-slate-550 hover:text-indigo-650 hover:bg-slate-100 rounded border border-slate-200 bg-white transition-colors"
                                title="Edit Notice"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDelete(n.id)}
                                className="p-1 text-slate-550 hover:text-rose-600 hover:bg-rose-50 rounded border border-slate-200 bg-white transition-colors"
                                title="Delete Notice"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              </table>
              </>
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

                  {/* ---- BILLING ATTACHMENTS ---- */}
                  <div>
                    <label className="block text-[9px] uppercase tracking-wider text-black font-black mb-2">
                      Billing Attachments
                      <span className="ml-1.5 text-slate-400 normal-case font-semibold tracking-normal text-[9px]">(Image, PDF, Excel, Recording — multiple)</span>
                    </label>

                    {/* Drop zone / file picker */}
                    <label
                      htmlFor="billing-file-input"
                      className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-[#D8D0E8] hover:border-indigo-400 rounded-xl px-4 py-5 cursor-pointer transition-all bg-slate-50 hover:bg-indigo-50/30 group"
                    >
                      <div className="flex items-center gap-2 text-slate-400 group-hover:text-indigo-600 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                        </svg>
                        <span className="text-[11px] font-bold">Click to select files</span>
                      </div>
                      <span className="text-[9px] text-slate-400">PDF, Images (JPG/PNG/WEBP), Excel (XLS/XLSX), Audio/Video</span>
                      <input
                        id="billing-file-input"
                        type="file"
                        multiple
                        accept="image/*,application/pdf,.xls,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,audio/*,video/*"
                        className="hidden"
                        onChange={e => {
                          if (e.target.files) {
                            setBillingNewFiles(prev => [...prev, ...Array.from(e.target.files!)]);
                            e.target.value = "";
                          }
                        }}
                      />
                    </label>

                    {/* Pending new files (not yet uploaded) */}
                    {billingNewFiles.length > 0 && (
                      <div className="mt-2 space-y-1.5">
                        <p className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Pending Upload ({billingNewFiles.length})</p>
                        {billingNewFiles.map((f, idx) => {
                          const isImg = f.type.startsWith("image/");
                          const isPDF = f.type === "application/pdf";
                          const isExcel = f.type.includes("sheet") || f.type.includes("excel") || f.name.endsWith(".xls") || f.name.endsWith(".xlsx");
                          const isAudio = f.type.startsWith("audio/") || f.type.startsWith("video/");
                          const icon = isImg ? "🖼️" : isPDF ? "📄" : isExcel ? "📊" : isAudio ? "🎵" : "📎";
                          return (
                            <div key={idx} className="flex items-center gap-3 bg-amber-50/70 border border-amber-200/80 rounded-lg px-3 py-2 text-xs">
                              {isImg ? (
                                <LocalImagePreview file={f} />
                              ) : (
                                <span className="text-base leading-none">{icon}</span>
                              )}
                              <span className="flex-1 truncate text-slate-700 font-semibold">{f.name}</span>
                              <span className="text-[9px] text-amber-600 font-bold shrink-0">Pending</span>
                              <button
                                type="button"
                                onClick={() => setBillingNewFiles(prev => prev.filter((_, i) => i !== idx))}
                                className="p-0.5 text-slate-400 hover:text-rose-600 rounded transition-colors shrink-0"
                                title="Remove"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Already saved attachments */}
                    {billingAttachments.length > 0 && (
                      <div className="mt-2 space-y-1.5">
                        <p className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Saved Attachments ({billingAttachments.length})</p>
                        {billingAttachments.map((att, idx) => {
                          const icon = att.type === "image" ? "🖼️" : att.type === "pdf" ? "📄" : att.type === "excel" ? "📊" : att.type === "recording" ? "🎵" : "📎";
                          const isImg = att.type === "image";
                          return (
                            <div key={idx} className="flex items-center gap-3 bg-emerald-50/70 border border-emerald-200/80 rounded-lg px-3 py-2 text-xs">
                              {isImg ? (
                                <img
                                  src={att.url}
                                  alt={att.name}
                                  className="w-8 h-8 object-cover rounded border border-slate-200 cursor-zoom-in hover:opacity-80 transition-opacity shrink-0"
                                  onClick={() => window.open(att.url, "_blank")}
                                  title="Click to preview image in new tab"
                                />
                              ) : (
                                <span className="text-base leading-none shrink-0">{icon}</span>
                              )}
                              <a
                                href={att.url}
                                target="_blank"
                                rel="noreferrer"
                                className="flex-1 truncate text-emerald-700 font-semibold hover:text-emerald-900 underline underline-offset-2"
                                title={att.name}
                              >
                                {att.name}
                              </a>
                              <span className="text-[9px] text-emerald-600 font-bold uppercase shrink-0">{att.type}</span>
                              <button
                                type="button"
                                onClick={() => setBillingAttachments(prev => prev.filter((_, i) => i !== idx))}
                                className="p-0.5 text-slate-400 hover:text-rose-600 rounded transition-colors shrink-0"
                                title="Remove attachment"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
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
                    disabled={submittingBilling || uploadingBilling}
                    className="px-5 py-2.5 bg-[#5D3E53] hover:bg-[#4a3142] text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md disabled:opacity-50 transition-all flex items-center gap-2"
                  >
                    {uploadingBilling ? "Uploading files..." : submittingBilling ? "Saving..." : "SAVE BILLING"}
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
