"use client";
import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Plus, Search, RefreshCw, ShieldCheck, DollarSign, CheckCircle2,
  Clock, Edit, Trash2, Download, Filter, SlidersHorizontal, Tag, Calendar,
  Building2, MapPin, Banknote
} from "lucide-react";

interface SecurityMasterViewProps {
  nbfcsList: any[];
  nbfcBranchesList: any[];
  triggerToast: (msg: string) => void;
}

// Custom Date Picker Input formatting as DD/MM/YYYY
function DatePickerInput({
  label,
  value,
  onChange,
  placeholder = "DD/MM/YYYY",
}: {
  label: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const formatDisplayDate = (val: string) => {
    if (!val) return "";
    if (val.includes("-")) {
      const parts = val.split("-");
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
    }
    return val;
  };

  const [inputText, setInputText] = useState(formatDisplayDate(value));

  useEffect(() => {
    setInputText(formatDisplayDate(value));
  }, [value]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const [activeDate, setActiveDate] = useState(() => {
    if (value && value.includes("-")) {
      const d = new Date(value);
      if (!isNaN(d.getTime())) return d;
    }
    return new Date();
  });

  const activeYear = activeDate.getFullYear();
  const activeMonth = activeDate.getMonth();

  const handleSelectDay = (day: number) => {
    const formattedDay = String(day).padStart(2, "0");
    const formattedMonth = String(activeMonth + 1).padStart(2, "0");
    const formattedDateStr = `${activeYear}-${formattedMonth}-${formattedDay}`;
    onChange(formattedDateStr);
    setInputText(`${formattedDay}/${formattedMonth}/${activeYear}`);
    setIsOpen(false);
  };

  const daysInMonth = new Date(activeYear, activeMonth + 1, 0).getDate();
  const startDayOfWeek = new Date(activeYear, activeMonth, 1).getDay();
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const offset = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;
  const daysGrid = [];
  for (let i = 0; i < offset; i++) daysGrid.push(null);
  for (let d = 1; d <= daysInMonth; d++) daysGrid.push(d);

  return (
    <div ref={containerRef} className="relative w-full">
      <label className="block text-[10px] uppercase font-black text-slate-500 tracking-wider mb-1">
        {label}
      </label>
      <div className="relative">
        <input
          type="text"
          placeholder={placeholder}
          value={inputText}
          onChange={(e) => {
            const val = e.target.value;
            setInputText(val);
            if (val.length === 10 && val.includes("/")) {
              const parts = val.split("/");
              if (parts.length === 3 && parts[2].length === 4) {
                const dbDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
                onChange(dbDate);
              }
            } else if (!val) {
              onChange("");
            }
          }}
          onFocus={() => setIsOpen(true)}
          className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-[#714B67] pr-9"
        />
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-[#714B67] transition-colors"
        >
          <Calendar className="w-4 h-4" />
        </button>
      </div>

      {isOpen && (
        <div className="absolute left-0 mt-1 w-64 bg-white border border-slate-200 rounded-xl shadow-2xl z-[99999] p-3 text-slate-800 font-sans">
          <div className="flex justify-between items-center mb-2 font-bold text-xs text-slate-700">
            <button type="button" onClick={() => setActiveDate(new Date(activeYear, activeMonth - 1, 1))} className="p-1 hover:bg-slate-100 rounded text-slate-500">&lt;</button>
            <span>{monthNames[activeMonth]} {activeYear}</span>
            <button type="button" onClick={() => setActiveDate(new Date(activeYear, activeMonth + 1, 1))} className="p-1 hover:bg-slate-100 rounded text-slate-500">&gt;</button>
          </div>
          <div className="grid grid-cols-7 text-center text-[10px] font-black uppercase text-slate-400 mb-1">
            <span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span><span>S</span>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-xs">
            {daysGrid.map((day, idx) => {
              if (day === null) return <div key={`empty-${idx}`} />;
              return (
                <button
                  key={`day-${day}`}
                  type="button"
                  onClick={() => handleSelectDay(day)}
                  className="py-1 rounded font-bold hover:bg-[#714B67] hover:text-white text-slate-700 transition-all"
                >
                  {day}
                </button>
              );
            })}
          </div>
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
  onClose,
  alignRight = false,
}: {
  filterKey: string;
  options: string[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
  onClose: () => void;
  alignRight?: boolean;
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
      setTempSelected(tempSelected.filter((v) => v !== val));
    } else {
      setTempSelected([...tempSelected, val]);
    }
  };

  const handleSelectAll = () => setTempSelected(options);
  const handleClearAll = () => setTempSelected([]);

  const handleApply = () => {
    onChange(tempSelected);
    onClose();
  };

  return (
    <div
      ref={containerRef}
      className={`absolute top-full ${alignRight ? "right-0" : "left-0"} mt-1 z-[9999] bg-white border border-slate-200 rounded-xl shadow-2xl p-3 w-56 text-xs text-slate-800 font-sans normal-case font-bold`}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex justify-between items-center mb-2 pb-1.5 border-b border-slate-100 font-bold uppercase tracking-wider text-[9px] text-slate-400">
        <span>Filter {filterKey}</span>
        <div className="flex gap-2">
          <button type="button" onClick={handleSelectAll} className="text-indigo-600 hover:underline">
            All
          </button>
          <button type="button" onClick={handleClearAll} className="text-rose-500 hover:underline">
            Clear
          </button>
        </div>
      </div>
      <div className="max-h-48 overflow-y-auto space-y-1 mb-3">
        {options.map((opt) => (
          <label key={opt} className="flex items-center gap-2 cursor-pointer py-1 hover:bg-slate-50 rounded px-1 text-xs font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={tempSelected.includes(opt)}
              onChange={() => handleToggle(opt)}
              className="rounded border-slate-300 text-[#714B67] focus:ring-[#714B67]"
            />
            <span className="truncate">{opt || "(Blank)"}</span>
          </label>
        ))}
      </div>
      <div className="flex justify-end gap-1.5 pt-2 border-t border-slate-100">
        <button
          type="button"
          onClick={onClose}
          className="px-2.5 py-1 text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-600 rounded font-bold"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleApply}
          className="px-3 py-1 text-[10px] bg-[#714B67] hover:bg-[#5F3F56] text-white rounded font-black shadow-sm"
        >
          Apply
        </button>
      </div>
    </div>
  );
}

export default function SecurityMasterView({
  nbfcsList = [],
  nbfcBranchesList = [],
  triggerToast,
}: SecurityMasterViewProps) {
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCompany, setFilterCompany] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");

  // Dynamic Companies List State
  const [companiesList, setCompaniesList] = useState<string[]>([
    "Force009",
    "ATPL (Acolyte Technologies Private Limited)",
  ]);
  const [showAddCompanyModal, setShowAddCompanyModal] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState("");

  // Payment Timeline Value & Unit (Days / Months Pill Buttons)
  const [timelineVal, setTimelineVal] = useState("30");
  const [timelineUnit, setTimelineUnit] = useState<"Days" | "Months">("Days");

  // Receive Payment Action Modal State
  const [showReceiveModal, setShowReceiveModal] = useState<{ show: boolean; item: any | null }>({
    show: false,
    item: null,
  });
  const [receiveForm, setReceiveForm] = useState({
    receivedAmount: "",
    receivedDate: new Date().toISOString().split("T")[0],
    remarks: "",
  });
  const [submittingReceive, setSubmittingReceive] = useState(false);

  // Excel-like Column Filters
  const [activeFilterKey, setActiveFilterKey] = useState<string | null>(null);
  const [columnFilters, setColumnFilters] = useState<Record<string, string[]>>({
    company: [],
    billNo: [],
    billDate: [],
    billAmount: [],
    nbfcName: [],
    branchName: [],
    location: [],
    paymentStatus: [],
    source: [],
    receivedAmount: [],
    receivedDate: [],
  });

  // Toggle Columns state
  const [showColumnToggle, setShowColumnToggle] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState({
    company: true,
    billNo: true,
    billDate: true,
    billAmount: true,
    nbfcName: true,
    branchName: true,
    location: true,
    paymentDays: true,
    paymentStatus: true,
    source: true,
    receivedAmount: true,
    receivedDate: true,
    remarks: true,
    actions: true,
  });

  // Form Modal States
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form State (Only Section 1 fields)
  const [form, setForm] = useState({
    company: "Force009",
    billNo: "",
    billDate: "",
    billAmount: "",
    nbfcId: "",
    nbfcName: "",
    branchId: "",
    branchName: "",
    location: "",
    paymentStatus: "Due",
    source: "BDA",
    remarks: "",
  });

  // Fetch Companies from DB table legal_companies
  const fetchCompanies = async () => {
    try {
      const res = await fetch("/api/legal-recovery/company");
      const data = await res.json();
      if (data.success && data.data && data.data.length > 0) {
        const fetchedNames = data.data.map((c: any) => c.companyName);
        setCompaniesList(fetchedNames);
      }
    } catch (err) {
      console.error("Error fetching companies:", err);
    }
  };

  const fetchEntries = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/legal-recovery/security");
      const data = await res.json();
      if (data.success) {
        const fetched = data.data || [];
        setEntries(fetched);
        // Extract existing company names
        const dbCompanies = fetched.map((e: any) => e.company).filter(Boolean);
        setCompaniesList((prev) => Array.from(new Set([...prev, ...dbCompanies])));
      } else {
        triggerToast(data.error || "Failed to load security entries");
      }
    } catch (err) {
      console.error(err);
      triggerToast("Error loading security entries");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
    fetchEntries();
  }, []);

  const filteredBranches = useMemo(() => {
    if (!form.nbfcId) return [];
    return nbfcBranchesList.filter((b: any) => String(b.nbfcId) === String(form.nbfcId));
  }, [form.nbfcId, nbfcBranchesList]);

  const resetForm = () => {
    setForm({
      company: companiesList[0] || "Force009",
      billNo: "",
      billDate: "",
      billAmount: "",
      nbfcId: "",
      nbfcName: "",
      branchId: "",
      branchName: "",
      location: "",
      paymentStatus: "Due",
      source: "BDA",
      remarks: "",
    });
    setTimelineVal("30");
    setTimelineUnit("Days");
    setEditingId(null);
  };

  const handleOpenAddModal = () => {
    resetForm();
    setShowModal(true);
  };

  const handleOpenEditModal = (item: any) => {
    setEditingId(item.id);
    setForm({
      company: item.company || companiesList[0] || "Force009",
      billNo: item.billNo || "",
      billDate: item.billDate || "",
      billAmount: item.billAmount !== undefined ? String(item.billAmount) : "",
      nbfcId: item.nbfcId ? String(item.nbfcId) : "",
      nbfcName: item.nbfcName || "",
      branchId: item.branchId ? String(item.branchId) : "",
      branchName: item.branchName || "",
      location: item.location || "",
      paymentStatus: item.paymentStatus || "Due",
      source: item.source || "BDA",
      remarks: item.remarks || "",
    });

    // Parse Timeline Value & Unit
    const rawTimeline = String(item.paymentDays || "30 Days");
    if (rawTimeline.includes("Month")) {
      setTimelineUnit("Months");
      setTimelineVal(rawTimeline.replace(/[^0-9]/g, "") || "1");
    } else {
      setTimelineUnit("Days");
      setTimelineVal(rawTimeline.replace(/[^0-9]/g, "") || "30");
    }

    setShowModal(true);
  };

  const handleAddCustomCompany = async () => {
    if (!newCompanyName.trim()) {
      triggerToast("Please enter company name");
      return;
    }
    const cleanName = newCompanyName.trim();
    try {
      // Save company permanently in legal_companies table
      const res = await fetch("/api/legal-recovery/company", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyName: cleanName }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchCompanies();
        setForm({ ...form, company: cleanName });
        setNewCompanyName("");
        setShowAddCompanyModal(false);
        triggerToast(`Company "${cleanName}" saved to database!`);
      } else {
        triggerToast(data.error || "Failed to add company");
      }
    } catch (err) {
      triggerToast("Error saving company");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.company) {
      triggerToast("Please select Company");
      return;
    }
    setSubmitting(true);
    try {
      const formattedTimeline = timelineVal ? `${timelineVal} ${timelineUnit}` : "";
      const url = "/api/legal-recovery/security";
      const method = editingId ? "PUT" : "POST";
      const payload = editingId
        ? { id: editingId, ...form, paymentDays: formattedTimeline }
        : { ...form, paymentDays: formattedTimeline };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        triggerToast(editingId ? "Security record updated successfully!" : "Security record added successfully!");
        setShowModal(false);
        resetForm();
        fetchEntries();
      } else {
        triggerToast(data.error || "Failed to save record");
      }
    } catch (err) {
      console.error(err);
      triggerToast("Error saving security record");
    } finally {
      setSubmitting(false);
    }
  };

  // Receive Payment Action Modal Handler
  const handleOpenReceiveModal = (item: any) => {
    setShowReceiveModal({ show: true, item });
    setReceiveForm({
      receivedAmount: item.receivedAmount && Number(item.receivedAmount) > 0 ? String(item.receivedAmount) : "",
      receivedDate: item.receivedDate || new Date().toISOString().split("T")[0],
      remarks: item.remarks || "",
    });
  };

  const handleReceiveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showReceiveModal.item?.id) return;
    setSubmittingReceive(true);
    try {
      const payload = {
        id: showReceiveModal.item.id,
        receivedAmount: Number(receiveForm.receivedAmount || 0),
        receivedDate: receiveForm.receivedDate,
        paymentStatus: "Payment Done",
        remarks: receiveForm.remarks || showReceiveModal.item.remarks || "",
      };

      const res = await fetch("/api/legal-recovery/security", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        triggerToast("Received payment logged successfully!");
        setShowReceiveModal({ show: false, item: null });
        fetchEntries();
      } else {
        triggerToast(data.error || "Failed to log received payment");
      }
    } catch (err) {
      console.error(err);
      triggerToast("Error logging received payment");
    } finally {
      setSubmittingReceive(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this security entry?")) return;
    try {
      const res = await fetch(`/api/legal-recovery/security?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        triggerToast("Security record deleted successfully");
        fetchEntries();
      } else {
        triggerToast(data.error || "Failed to delete record");
      }
    } catch (err) {
      triggerToast("Error deleting record");
    }
  };

  const getUniqueOptions = (key: string) => {
    const vals = entries.map((item) => String(item[key] || ""));
    return Array.from(new Set(vals)).filter(Boolean).sort();
  };

  // Filtered List for Table with Search & Column Filters
  const filteredEntries = useMemo(() => {
    return entries.filter((item) => {
      const matchesSearch =
        (item.billNo || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.nbfcName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.branchName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.location || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.source || "").toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCompany = filterCompany === "All" || item.company === filterCompany;
      const matchesStatus = filterStatus === "All" || item.paymentStatus === filterStatus;

      if (!matchesSearch || !matchesCompany || !matchesStatus) return false;

      // Excel Column Filters
      if (columnFilters.company?.length > 0 && !columnFilters.company.includes(item.company)) return false;
      if (columnFilters.billNo?.length > 0 && !columnFilters.billNo.includes(item.billNo || "")) return false;
      if (columnFilters.billDate?.length > 0 && !columnFilters.billDate.includes(item.billDate || "")) return false;
      if (columnFilters.billAmount?.length > 0 && !columnFilters.billAmount.includes(String(item.billAmount || 0))) return false;
      if (columnFilters.nbfcName?.length > 0 && !columnFilters.nbfcName.includes(item.nbfcName || "")) return false;
      if (columnFilters.branchName?.length > 0 && !columnFilters.branchName.includes(item.branchName || "")) return false;
      if (columnFilters.location?.length > 0 && !columnFilters.location.includes(item.location || "")) return false;
      if (columnFilters.paymentStatus?.length > 0 && !columnFilters.paymentStatus.includes(item.paymentStatus || "Due")) return false;
      if (columnFilters.source?.length > 0 && !columnFilters.source.includes(item.source || "")) return false;
      if (columnFilters.receivedAmount?.length > 0 && !columnFilters.receivedAmount.includes(String(item.receivedAmount || 0))) return false;
      if (columnFilters.receivedDate?.length > 0 && !columnFilters.receivedDate.includes(item.receivedDate || "")) return false;

      return true;
    });
  }, [entries, searchTerm, filterCompany, filterStatus, columnFilters]);

  // Metrics
  const totalBilled = useMemo(() => entries.reduce((acc, curr) => acc + Number(curr.billAmount || 0), 0), [entries]);
  const totalReceived = useMemo(() => entries.reduce((acc, curr) => acc + Number(curr.receivedAmount || 0), 0), [entries]);
  const totalDueCount = useMemo(() => entries.filter((item) => item.paymentStatus === "Due").length, [entries]);

  // Dynamic Export CSV Functionality respecting Visible Columns
  const exportToCSV = () => {
    if (filteredEntries.length === 0) {
      triggerToast("No security records available to export");
      return;
    }

    const columnDefs: { key: keyof typeof visibleColumns; label: string; getValue: (item: any) => any }[] = [
      { key: "company", label: "Company", getValue: (item) => item.company || "" },
      { key: "billNo", label: "Bill No.", getValue: (item) => item.billNo || "" },
      { key: "billDate", label: "Bill Date", getValue: (item) => item.billDate || "" },
      { key: "billAmount", label: "Bill Amount (INR)", getValue: (item) => item.billAmount || 0 },
      { key: "nbfcName", label: "Bank / NBFC Name", getValue: (item) => item.nbfcName || "" },
      { key: "branchName", label: "Branch", getValue: (item) => item.branchName || "" },
      { key: "location", label: "Site", getValue: (item) => item.location || "" },
      { key: "paymentDays", label: "Payment Timeline", getValue: (item) => item.paymentDays || "" },
      { key: "paymentStatus", label: "Payment Status", getValue: (item) => item.paymentStatus || "" },
      { key: "source", label: "Source", getValue: (item) => item.source || "" },
      { key: "receivedAmount", label: "Received Amount (INR)", getValue: (item) => item.receivedAmount || 0 },
      { key: "receivedDate", label: "Received Date", getValue: (item) => item.receivedDate || "" },
      { key: "remarks", label: "Remarks", getValue: (item) => item.remarks || "" },
    ];

    // Filter only visible columns
    const activeDefs = columnDefs.filter((col) => visibleColumns[col.key]);

    const headers = ["#", ...activeDefs.map((col) => col.label)];

    const rows = filteredEntries.map((item, idx) => [
      idx + 1,
      ...activeDefs.map((col) => {
        const val = col.getValue(item);
        if (typeof val === "string") {
          return `"${val.replace(/"/g, '""')}"`;
        }
        return val;
      }),
    ]);

    const csvString = [headers.join(","), ...rows.map((e) => e.join(","))].join("\r\n");
    const blob = new Blob(["\uFEFF" + csvString], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Security_Records_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    triggerToast("Security records exported according to visible columns!");
  };

  const hasActiveColumnFilters = useMemo(() => {
    return Object.values(columnFilters).some((arr) => arr.length > 0);
  }, [columnFilters]);

  const clearAllColumnFilters = () => {
    setColumnFilters({
      company: [],
      billNo: [],
      billDate: [],
      billAmount: [],
      nbfcName: [],
      branchName: [],
      location: [],
      paymentStatus: [],
      source: [],
      receivedAmount: [],
      receivedDate: [],
    });
  };

  return (
    <div className="space-y-6 animate-fadeIn text-slate-800">
      {/* Hide number spinners CSS */}
      <style jsx global>{`
        input[type="number"]::-webkit-inner-spin-button,
        input[type="number"]::-webkit-outer-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        input[type="number"] {
          -moz-appearance: textfield;
        }
      `}</style>

      {/* Top Header Card */}
      <div className="bg-white border border-[#E8E4DF] rounded-2xl p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-indigo-50 text-indigo-700 rounded-xl">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900">Security Management</h1>
              <p className="text-xs text-slate-500 mt-0.5">Manage Company Security Deposits, Bill Details &amp; Received Payments</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchEntries}
            className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all"
            title="Refresh List"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-2 bg-[#714B67] hover:bg-[#5F3F56] text-white text-xs font-black px-4 py-2.5 rounded-xl shadow transition-all"
          >
            <Plus className="w-4 h-4" /> Add Security Entry
          </button>
        </div>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div
          onClick={() => setFilterStatus("All")}
          title="Click to view all entries"
          className={`bg-white border rounded-xl p-4 shadow-sm flex items-center gap-3 cursor-pointer hover:shadow-md transition-all ${filterStatus === "All" ? "border-indigo-400 ring-2 ring-indigo-100" : "border-slate-200"
            }`}
        >
          <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-black text-slate-400">Total Entries</p>
            <p className="text-lg font-black text-slate-900">{entries.length}</p>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-black text-slate-400">Total Bill Amount</p>
            <p className="text-lg font-black text-blue-700">₹{totalBilled.toLocaleString("en-IN")}</p>
          </div>
        </div>

        <div
          onClick={() => setFilterStatus("Payment Done")}
          title="Click to filter Payment Done entries"
          className={`bg-white border rounded-xl p-4 shadow-sm flex items-center gap-3 cursor-pointer hover:shadow-md transition-all ${filterStatus === "Payment Done" ? "border-emerald-400 ring-2 ring-emerald-100" : "border-slate-200"
            }`}
        >
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-black text-slate-400">Total Received</p>
            <p className="text-lg font-black text-emerald-700">₹{totalReceived.toLocaleString("en-IN")}</p>
          </div>
        </div>

        <div
          onClick={() => setFilterStatus("Due")}
          title="Click to filter Pending Due Cases"
          className={`bg-white border rounded-xl p-4 shadow-sm flex items-center gap-3 cursor-pointer hover:shadow-md transition-all ${filterStatus === "Due" ? "border-rose-400 ring-2 ring-rose-100" : "border-slate-200"
            }`}
        >
          <div className="w-10 h-10 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-black text-slate-400">Pending Due Cases</p>
            <p className="text-lg font-black text-rose-700">{totalDueCount} Entries</p>
          </div>
        </div>
      </div>

      {/* Filter, Export & Toggle Columns Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col md:flex-row gap-3 justify-between items-center relative z-20">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#714B67]"
            placeholder="Search by Bill No, Bank, Branch, Site..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {hasActiveColumnFilters && (
            <button
              onClick={clearAllColumnFilters}
              className="text-[10px] font-bold text-rose-600 hover:underline px-2 py-1 bg-rose-50 rounded-lg border border-rose-200"
            >
              Clear Column Filters
            </button>
          )}

          {/* Export CSV Button */}
          <button
            onClick={exportToCSV}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-2 rounded-xl transition-all shadow-sm"
            title="Export Records to CSV"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>

          {/* Toggle Columns Icon Button */}
          <div className="relative">
            <button
              onClick={() => setShowColumnToggle(!showColumnToggle)}
              className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all border border-slate-200 flex items-center justify-center"
              title="Toggle Columns"
            >
              <SlidersHorizontal className="w-4 h-4 text-slate-600" />
            </button>

            {showColumnToggle && (
              <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-2xl z-[9999] p-3 text-xs">
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 mb-2">
                  <span className="font-black text-slate-700 uppercase tracking-wider text-[10px]">
                    Visible Columns
                  </span>
                  <button onClick={() => setShowColumnToggle(false)} className="text-slate-400 hover:text-slate-600">
                    ✕
                  </button>
                </div>
                <div className="space-y-1.5 max-h-64 overflow-y-auto">
                  {Object.entries({
                    company: "Company",
                    billNo: "Bill No.",
                    billDate: "Bill Date",
                    billAmount: "Bill Amount",
                    nbfcName: "Bank / NBFC Name",
                    branchName: "Branch",
                    location: "Site",
                    paymentDays: "Payment Timeline",
                    paymentStatus: "Payment Status",
                    source: "Source",
                    receivedAmount: "Received Amount",
                    receivedDate: "Received Date",
                    remarks: "Remarks",
                    actions: "Actions",
                  }).map(([key, label]) => (
                    <label key={key} className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded">
                      <input
                        type="checkbox"
                        checked={(visibleColumns as any)[key]}
                        onChange={(e) =>
                          setVisibleColumns({ ...visibleColumns, [key]: e.target.checked })
                        }
                        className="rounded border-slate-300 text-[#714B67] focus:ring-[#714B67]"
                      />
                      <span className="text-slate-700 font-semibold text-xs">{label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm z-10 relative min-h-[420px]">
        {loading ? (
          <div className="h-64 flex flex-col items-center justify-center text-slate-500">
            <RefreshCw className="w-8 h-8 animate-spin mb-2 text-[#714B67]" />
            <span className="text-xs font-bold">Loading security records...</span>
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-slate-400">
            <ShieldCheck className="w-10 h-10 mb-2 text-slate-300" />
            <span className="text-xs font-bold">No security entries found.</span>
          </div>
        ) : (
          <div className="overflow-x-auto min-h-[380px] pb-32">
            <table className="min-w-[1700px] w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100/80 text-black font-black uppercase font-mono tracking-wider border-b border-slate-300 text-[11px]">
                  <th className="py-3.5 px-3 text-center min-w-[40px]">#</th>

                  {/* Company */}
                  {visibleColumns.company && (
                    <th className="py-3.5 px-3.5 min-w-[220px] relative">
                      <div className="flex items-center gap-1.5 cursor-pointer select-none" onClick={() => setActiveFilterKey(activeFilterKey === "company" ? null : "company")}>
                        <span>Company</span>
                        <Filter className={`w-3 h-3 ${columnFilters.company?.length ? "text-indigo-600 font-bold" : "text-slate-400"}`} />
                      </div>
                      {activeFilterKey === "company" && (
                        <HeaderFilter
                          filterKey="Company"
                          options={getUniqueOptions("company")}
                          selectedValues={columnFilters.company}
                          onChange={(vals) => setColumnFilters({ ...columnFilters, company: vals })}
                          onClose={() => setActiveFilterKey(null)}
                        />
                      )}
                    </th>
                  )}

                  {/* Bill No. */}
                  {visibleColumns.billNo && (
                    <th className="py-3.5 px-3.5 min-w-[120px] relative">
                      <div className="flex items-center gap-1.5 cursor-pointer select-none" onClick={() => setActiveFilterKey(activeFilterKey === "billNo" ? null : "billNo")}>
                        <span>Bill No.</span>
                        <Filter className={`w-3 h-3 ${columnFilters.billNo?.length ? "text-indigo-600 font-bold" : "text-slate-400"}`} />
                      </div>
                      {activeFilterKey === "billNo" && (
                        <HeaderFilter
                          filterKey="Bill No."
                          options={getUniqueOptions("billNo")}
                          selectedValues={columnFilters.billNo}
                          onChange={(vals) => setColumnFilters({ ...columnFilters, billNo: vals })}
                          onClose={() => setActiveFilterKey(null)}
                        />
                      )}
                    </th>
                  )}

                  {/* Bill Date */}
                  {visibleColumns.billDate && (
                    <th className="py-3.5 px-3.5 min-w-[110px] relative">
                      <div className="flex items-center gap-1.5 cursor-pointer select-none" onClick={() => setActiveFilterKey(activeFilterKey === "billDate" ? null : "billDate")}>
                        <span>Bill Date</span>
                        <Filter className={`w-3 h-3 ${columnFilters.billDate?.length ? "text-indigo-600 font-bold" : "text-slate-400"}`} />
                      </div>
                      {activeFilterKey === "billDate" && (
                        <HeaderFilter
                          filterKey="Bill Date"
                          options={getUniqueOptions("billDate")}
                          selectedValues={columnFilters.billDate}
                          onChange={(vals) => setColumnFilters({ ...columnFilters, billDate: vals })}
                          onClose={() => setActiveFilterKey(null)}
                        />
                      )}
                    </th>
                  )}

                  {/* Bill Amount */}
                  {visibleColumns.billAmount && (
                    <th className="py-3.5 px-3.5 min-w-[130px] text-right relative">
                      <div className="flex items-center justify-end gap-1.5 cursor-pointer select-none" onClick={() => setActiveFilterKey(activeFilterKey === "billAmount" ? null : "billAmount")}>
                        <span>Bill Amount</span>
                        <Filter className={`w-3 h-3 ${columnFilters.billAmount?.length ? "text-indigo-600 font-bold" : "text-slate-400"}`} />
                      </div>
                      {activeFilterKey === "billAmount" && (
                        <HeaderFilter
                          filterKey="Bill Amount"
                          options={getUniqueOptions("billAmount")}
                          selectedValues={columnFilters.billAmount}
                          onChange={(vals) => setColumnFilters({ ...columnFilters, billAmount: vals })}
                          onClose={() => setActiveFilterKey(null)}
                        />
                      )}
                    </th>
                  )}

                  {/* Bank / NBFC Name */}
                  {visibleColumns.nbfcName && (
                    <th className="py-3.5 px-3.5 min-w-[180px] relative">
                      <div className="flex items-center gap-1.5 cursor-pointer select-none" onClick={() => setActiveFilterKey(activeFilterKey === "nbfcName" ? null : "nbfcName")}>
                        <span>Bank / NBFC Name</span>
                        <Filter className={`w-3 h-3 ${columnFilters.nbfcName?.length ? "text-indigo-600 font-bold" : "text-slate-400"}`} />
                      </div>
                      {activeFilterKey === "nbfcName" && (
                        <HeaderFilter
                          filterKey="Bank/NBFC"
                          options={getUniqueOptions("nbfcName")}
                          selectedValues={columnFilters.nbfcName}
                          onChange={(vals) => setColumnFilters({ ...columnFilters, nbfcName: vals })}
                          onClose={() => setActiveFilterKey(null)}
                        />
                      )}
                    </th>
                  )}

                  {/* Branch */}
                  {visibleColumns.branchName && (
                    <th className="py-3.5 px-3.5 min-w-[120px] relative">
                      <div className="flex items-center gap-1.5 cursor-pointer select-none" onClick={() => setActiveFilterKey(activeFilterKey === "branchName" ? null : "branchName")}>
                        <span>Branch</span>
                        <Filter className={`w-3 h-3 ${columnFilters.branchName?.length ? "text-indigo-600 font-bold" : "text-slate-400"}`} />
                      </div>
                      {activeFilterKey === "branchName" && (
                        <HeaderFilter
                          filterKey="Branch"
                          options={getUniqueOptions("branchName")}
                          selectedValues={columnFilters.branchName}
                          onChange={(vals) => setColumnFilters({ ...columnFilters, branchName: vals })}
                          onClose={() => setActiveFilterKey(null)}
                        />
                      )}
                    </th>
                  )}

                  {/* Site (Formerly Location) */}
                  {visibleColumns.location && (
                    <th className="py-3.5 px-3.5 min-w-[120px] relative">
                      <div className="flex items-center gap-1.5 cursor-pointer select-none" onClick={() => setActiveFilterKey(activeFilterKey === "location" ? null : "location")}>
                        <span>Site</span>
                        <Filter className={`w-3 h-3 ${columnFilters.location?.length ? "text-indigo-600 font-bold" : "text-slate-400"}`} />
                      </div>
                      {activeFilterKey === "location" && (
                        <HeaderFilter
                          filterKey="Site"
                          options={getUniqueOptions("location")}
                          selectedValues={columnFilters.location}
                          onChange={(vals) => setColumnFilters({ ...columnFilters, location: vals })}
                          onClose={() => setActiveFilterKey(null)}
                        />
                      )}
                    </th>
                  )}

                  {/* Payment Timeline */}
                  {visibleColumns.paymentDays && <th className="py-3.5 px-3.5 min-w-[130px] text-center">Payment Timeline</th>}

                  {/* Payment Status */}
                  {visibleColumns.paymentStatus && (
                    <th className="py-3.5 px-3.5 min-w-[130px] text-center relative">
                      <div className="flex items-center justify-center gap-1.5 cursor-pointer select-none" onClick={() => setActiveFilterKey(activeFilterKey === "paymentStatus" ? null : "paymentStatus")}>
                        <span>Payment Status</span>
                        <Filter className={`w-3 h-3 ${columnFilters.paymentStatus?.length ? "text-indigo-600 font-bold" : "text-slate-400"}`} />
                      </div>
                      {activeFilterKey === "paymentStatus" && (
                        <HeaderFilter
                          filterKey="Status"
                          options={["Due", "Payment Done"]}
                          selectedValues={columnFilters.paymentStatus}
                          onChange={(vals) => setColumnFilters({ ...columnFilters, paymentStatus: vals })}
                          onClose={() => setActiveFilterKey(null)}
                        />
                      )}
                    </th>
                  )}

                  {/* Source */}
                  {visibleColumns.source && (
                    <th className="py-3.5 px-3.5 min-w-[100px] relative">
                      <div className="flex items-center gap-1.5 cursor-pointer select-none" onClick={() => setActiveFilterKey(activeFilterKey === "source" ? null : "source")}>
                        <span>Source</span>
                        <Filter className={`w-3 h-3 ${columnFilters.source?.length ? "text-indigo-600 font-bold" : "text-slate-400"}`} />
                      </div>
                      {activeFilterKey === "source" && (
                        <HeaderFilter
                          filterKey="Source"
                          options={getUniqueOptions("source")}
                          selectedValues={columnFilters.source}
                          onChange={(vals) => setColumnFilters({ ...columnFilters, source: vals })}
                          onClose={() => setActiveFilterKey(null)}
                        />
                      )}
                    </th>
                  )}

                  {/* Received Amount */}
                  {visibleColumns.receivedAmount && (
                    <th className="py-3.5 px-3.5 min-w-[140px] text-right relative">
                      <div className="flex items-center justify-end gap-1.5 cursor-pointer select-none" onClick={() => setActiveFilterKey(activeFilterKey === "receivedAmount" ? null : "receivedAmount")}>
                        <span>Received Amount</span>
                        <Filter className={`w-3 h-3 ${columnFilters.receivedAmount?.length ? "text-indigo-600 font-bold" : "text-slate-400"}`} />
                      </div>
                      {activeFilterKey === "receivedAmount" && (
                        <HeaderFilter
                          filterKey="Received Amount"
                          options={getUniqueOptions("receivedAmount")}
                          selectedValues={columnFilters.receivedAmount}
                          onChange={(vals) => setColumnFilters({ ...columnFilters, receivedAmount: vals })}
                          onClose={() => setActiveFilterKey(null)}
                          alignRight
                        />
                      )}
                    </th>
                  )}

                  {/* Received Date */}
                  {visibleColumns.receivedDate && (
                    <th className="py-3.5 px-3.5 min-w-[110px] relative">
                      <div className="flex items-center gap-1.5 cursor-pointer select-none" onClick={() => setActiveFilterKey(activeFilterKey === "receivedDate" ? null : "receivedDate")}>
                        <span>Received Date</span>
                        <Filter className={`w-3 h-3 ${columnFilters.receivedDate?.length ? "text-indigo-600 font-bold" : "text-slate-400"}`} />
                      </div>
                      {activeFilterKey === "receivedDate" && (
                        <HeaderFilter
                          filterKey="Received Date"
                          options={getUniqueOptions("receivedDate")}
                          selectedValues={columnFilters.receivedDate}
                          onChange={(vals) => setColumnFilters({ ...columnFilters, receivedDate: vals })}
                          onClose={() => setActiveFilterKey(null)}
                          alignRight
                        />
                      )}
                    </th>
                  )}

                  {/* Remarks */}
                  {visibleColumns.remarks && <th className="py-3.5 px-3.5 min-w-[160px]">Remarks</th>}

                  {/* Actions */}
                  {visibleColumns.actions && <th className="py-3.5 px-3.5 min-w-[110px] text-center">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                {filteredEntries.map((item, index) => (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-3 text-center text-slate-400 font-mono">{index + 1}</td>
                    {visibleColumns.company && <td className="py-3.5 px-3.5 font-bold text-slate-900 leading-snug">{item.company}</td>}
                    {visibleColumns.billNo && <td className="py-3.5 px-3.5 font-bold text-indigo-700 font-mono whitespace-nowrap">{item.billNo || "—"}</td>}
                    {visibleColumns.billDate && (
                      <td className="py-3.5 px-3.5 text-slate-600 font-mono whitespace-nowrap">
                        {item.billDate ? item.billDate.split("-").reverse().join("/") : "—"}
                      </td>
                    )}
                    {visibleColumns.billAmount && (
                      <td className="py-3.5 px-3.5 text-right font-black text-slate-900 whitespace-nowrap">
                        ₹{Number(item.billAmount || 0).toLocaleString("en-IN")}
                      </td>
                    )}
                    {visibleColumns.nbfcName && <td className="py-3.5 px-3.5 font-bold text-slate-850 leading-snug">{item.nbfcName || "—"}</td>}
                    {visibleColumns.branchName && <td className="py-3.5 px-3.5 text-slate-600 whitespace-nowrap">{item.branchName || "—"}</td>}
                    {visibleColumns.location && <td className="py-3.5 px-3.5 text-slate-600 whitespace-nowrap">{item.location || "—"}</td>}
                    {visibleColumns.paymentDays && (
                      <td className="py-3.5 px-3.5 text-center font-mono font-bold text-slate-700 whitespace-nowrap">
                        {item.paymentDays || "—"}
                      </td>
                    )}
                    {visibleColumns.paymentStatus && (
                      <td className="py-3.5 px-3.5 text-center whitespace-nowrap">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${item.paymentStatus === "Payment Done"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-rose-50 text-rose-700 border-rose-200"
                            }`}
                        >
                          {item.paymentStatus || "Due"}
                        </span>
                      </td>
                    )}
                    {visibleColumns.source && (
                      <td className="py-3.5 px-3.5 text-center whitespace-nowrap">
                        <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[10px] font-bold">
                          {item.source || "—"}
                        </span>
                      </td>
                    )}
                    {visibleColumns.receivedAmount && (
                      <td className="py-3.5 px-3.5 text-right font-black text-emerald-700 whitespace-nowrap">
                        {Number(item.receivedAmount || 0) > 0 ? (
                          `₹${Number(item.receivedAmount).toLocaleString("en-IN")}`
                        ) : (
                          <span className="text-slate-300 font-normal">—</span>
                        )}
                      </td>
                    )}
                    {visibleColumns.receivedDate && (
                      <td className="py-3.5 px-3.5 text-slate-500 font-mono whitespace-nowrap">
                        {item.receivedDate ? item.receivedDate.split("-").reverse().join("/") : "—"}
                      </td>
                    )}
                    {visibleColumns.remarks && <td className="py-3.5 px-3.5 text-slate-600 max-w-[200px] truncate">{item.remarks || "—"}</td>}
                    {visibleColumns.actions && (
                      <td className="py-3.5 px-3.5 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Quick Action: Log Received Payment */}
                          <button
                            onClick={() => handleOpenReceiveModal(item)}
                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded transition-all"
                            title="Log Received Payment"
                          >
                            <Banknote className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenEditModal(item)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-all"
                            title="Edit Record"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="p-1.5 text-rose-600 hover:bg-rose-50 rounded transition-all"
                            title="Delete Record"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Add / Edit Security Form Modal ── */}
      {showModal && (
        <div className="fixed inset-0 z-[9999] overflow-y-auto backdrop-blur-md bg-slate-900/20 flex justify-center items-start p-4 sm:p-8 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl border border-slate-200 flex flex-col overflow-hidden my-auto max-h-[90vh]">

            {/* Fixed Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-50 text-indigo-700 rounded-lg">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-900">
                    {editingId ? "Edit Security Record" : "Add Security Entry"}
                  </h2>
                  <p className="text-[11px] text-slate-500 font-medium">Enter bill, security deposit, and site details</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="w-8 h-8 rounded-full bg-slate-200 hover:bg-rose-100 hover:text-rose-700 flex items-center justify-center text-slate-600 font-bold transition-all"
                title="Close"
              >
                ✕
              </button>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
              <div className="p-6 overflow-y-auto flex-1 space-y-5">

                <div className="flex items-center gap-2 pb-2.5 border-b border-indigo-100 text-indigo-900">
                  <Tag className="w-4 h-4 text-indigo-600" />
                  <h3 className="text-xs font-black uppercase tracking-wider font-mono">
                    BILL &amp; SECURITY DETAILS
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Company with Dynamic Add Option */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-[10px] uppercase font-black text-slate-500 tracking-wider">
                        Company *
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowAddCompanyModal(true)}
                        className="text-[10px] font-bold text-indigo-600 hover:underline flex items-center gap-0.5"
                      >
                        <Plus className="w-3 h-3" /> Add Company
                      </button>
                    </div>
                    <select
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-[#714B67]"
                      value={form.company}
                      onChange={(e) => {
                        if (e.target.value === "ADD_NEW_COMPANY") {
                          setShowAddCompanyModal(true);
                        } else {
                          setForm({ ...form, company: e.target.value });
                        }
                      }}
                      required
                    >
                      {companiesList.map((comp) => (
                        <option key={comp} value={comp}>
                          {comp}
                        </option>
                      ))}
                      <option value="ADD_NEW_COMPANY" className="font-bold text-indigo-600">
                        + Add New Company...
                      </option>
                    </select>
                  </div>

                  {/* Bill No */}
                  <div>
                    <label className="block text-[10px] uppercase font-black text-slate-500 tracking-wider mb-1">
                      Bill No.
                    </label>
                    <input
                      type="text"
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-[#714B67]"
                      placeholder="e.g. BILL-2026-089"
                      value={form.billNo}
                      onChange={(e) => setForm({ ...form, billNo: e.target.value })}
                    />
                  </div>

                  {/* Bill Date */}
                  <DatePickerInput
                    label="Bill Date"
                    value={form.billDate}
                    onChange={(val) => setForm({ ...form, billDate: val })}
                    placeholder="DD/MM/YYYY"
                  />

                  {/* Bill Amount */}
                  <div>
                    <label className="block text-[10px] uppercase font-black text-slate-500 tracking-wider mb-1">
                      Bill Amount (₹)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-[#714B67]"
                      placeholder="0.00"
                      value={form.billAmount}
                      onChange={(e) => setForm({ ...form, billAmount: e.target.value })}
                    />
                  </div>

                  {/* Bank / NBFC Name */}
                  <div>
                    <label className="block text-[10px] uppercase font-black text-slate-500 tracking-wider mb-1">
                      Bank / NBFC Name
                    </label>
                    <select
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-[#714B67]"
                      value={form.nbfcId}
                      onChange={(e) => {
                        const selId = e.target.value;
                        const selItem = nbfcsList.find((n: any) => String(n.id) === String(selId));
                        setForm({
                          ...form,
                          nbfcId: selId,
                          nbfcName: selItem ? selItem.nbfcName : "",
                          branchId: "",
                          branchName: "",
                        });
                      }}
                    >
                      <option value="">-- Select Bank / NBFC --</option>
                      {nbfcsList.map((nbfc: any) => (
                        <option key={nbfc.id} value={nbfc.id}>
                          {nbfc.nbfcName} ({nbfc.nbfcCode || "NBFC"})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Branch */}
                  <div>
                    <label className="block text-[10px] uppercase font-black text-slate-500 tracking-wider mb-1">
                      Branch
                    </label>
                    <select
                      disabled={!form.nbfcId}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-[#714B67] disabled:opacity-60 disabled:cursor-not-allowed"
                      value={form.branchId}
                      onChange={(e) => {
                        const selId = e.target.value;
                        const selBranch = nbfcBranchesList.find((b: any) => String(b.id) === String(selId));
                        setForm({
                          ...form,
                          branchId: selId,
                          branchName: selBranch ? selBranch.branchName : "",
                        });
                      }}
                    >
                      <option value="">
                        {form.nbfcId ? "-- Select Branch --" : "-- Select Bank / NBFC First --"}
                      </option>
                      {filteredBranches.map((br: any) => (
                        <option key={br.id} value={br.id}>
                          {br.branchName} ({br.branchCode || "Branch"})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Site */}
                  <div>
                    <label className="block text-[10px] uppercase font-black text-slate-500 tracking-wider mb-1">
                      Site
                    </label>
                    <input
                      type="text"
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-[#714B67]"
                      placeholder="e.g. Jaipur Site, Project A"
                      value={form.location}
                      onChange={(e) => setForm({ ...form, location: e.target.value })}
                    />
                  </div>

                  {/* Sleek Payment Timeline (Input + Days/Months Pill Buttons) */}
                  <div>
                    <label className="block text-[10px] uppercase font-black text-slate-500 tracking-wider mb-1">
                      Payment Timeline
                    </label>
                    <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 rounded-lg p-1">
                      <input
                        type="number"
                        min="1"
                        className="w-full bg-transparent px-2.5 py-1 text-xs font-bold text-slate-900 focus:outline-none"
                        placeholder="e.g. 30"
                        value={timelineVal}
                        onChange={(e) => setTimelineVal(e.target.value)}
                      />
                      <div className="flex items-center bg-slate-200/80 p-0.5 rounded-md text-[11px] font-bold shrink-0">
                        <button
                          type="button"
                          onClick={() => setTimelineUnit("Days")}
                          className={`px-3 py-1 rounded transition-all ${timelineUnit === "Days"
                            ? "bg-[#714B67] text-white shadow-sm font-black"
                            : "text-slate-600 hover:text-slate-900"
                            }`}
                        >
                          Days
                        </button>
                        <button
                          type="button"
                          onClick={() => setTimelineUnit("Months")}
                          className={`px-3 py-1 rounded transition-all ${timelineUnit === "Months"
                            ? "bg-[#714B67] text-white shadow-sm font-black"
                            : "text-slate-600 hover:text-slate-900"
                            }`}
                        >
                          Months
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Payment Status */}
                  <div>
                    <label className="block text-[10px] uppercase font-black text-slate-500 tracking-wider mb-1">
                      Payment Status
                    </label>
                    <select
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-[#714B67]"
                      value={form.paymentStatus}
                      onChange={(e) => setForm({ ...form, paymentStatus: e.target.value })}
                    >
                      <option value="Due">Due</option>
                      <option value="Payment Done">Payment Done</option>
                    </select>
                  </div>

                  {/* Source */}
                  <div>
                    <label className="block text-[10px] uppercase font-black text-slate-500 tracking-wider mb-1">
                      Source
                    </label>
                    <div className="flex flex-col gap-1.5">
                      <div className="flex gap-1.5 flex-wrap">
                        {["BDA", "Direct", "Reference", "Agent"].map((src) => (
                          <button
                            key={src}
                            type="button"
                            onClick={() => setForm({ ...form, source: src })}
                            className={`px-2.5 py-0.5 text-[10px] font-bold rounded border transition-all ${form.source === src
                              ? "bg-[#714B67] text-white border-[#714B67]"
                              : "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200"
                              }`}
                          >
                            {src}
                          </button>
                        ))}
                      </div>
                      <input
                        type="text"
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-[#714B67]"
                        placeholder="e.g. BDA or custom source..."
                        value={form.source}
                        onChange={(e) => setForm({ ...form, source: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                {/* Additional Remarks */}
                <div>
                  <label className="block text-[10px] uppercase font-black text-slate-500 tracking-wider mb-1">
                    Remarks / Notes
                  </label>
                  <textarea
                    rows={2}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-[#714B67] resize-none"
                    placeholder="Additional security or payment notes..."
                    value={form.remarks}
                    onChange={(e) => setForm({ ...form, remarks: e.target.value })}
                  />
                </div>

              </div>

              {/* Fixed Modal Footer */}
              <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-5 py-2.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 bg-[#714B67] hover:bg-[#5F3F56] text-white rounded-xl text-xs font-black shadow transition-all disabled:opacity-50"
                >
                  {submitting ? "Saving..." : editingId ? "Update Security Record" : "Save Security Entry"}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ── Add New Company Sub-Modal ── */}
      {showAddCompanyModal && (
        <div className="fixed inset-0 z-[10000] backdrop-blur-md bg-slate-900/30 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl border border-slate-200 space-y-4 animate-scale-in">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100">
              <h3 className="font-black text-slate-900 text-sm flex items-center gap-2">
                <Building2 className="w-4 h-4 text-indigo-600" /> Add New Company
              </h3>
              <button onClick={() => setShowAddCompanyModal(false)} className="text-slate-400 hover:text-slate-700 font-bold">
                ✕
              </button>
            </div>
            <div>
              <label className="block text-[10px] uppercase font-black text-slate-500 tracking-wider mb-1">
                Company Name *
              </label>
              <input
                type="text"
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-[#714B67]"
                placeholder="e.g. Acme Tech Solutions Pvt Ltd"
                value={newCompanyName}
                onChange={(e) => setNewCompanyName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddCompanyModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddCustomCompany}
                className="px-4 py-2 bg-[#714B67] hover:bg-[#5F3F56] text-white rounded-xl text-xs font-black shadow"
              >
                Add &amp; Save to DB
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Separate Log Received Payment Modal (From Table Actions) ── */}
      {showReceiveModal.show && showReceiveModal.item && (
        <div className="fixed inset-0 z-[10000] backdrop-blur-md bg-slate-900/30 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-slate-200 overflow-hidden animate-scale-in">
            {/* Header */}
            <div className="px-6 py-4 bg-emerald-50 border-b border-emerald-100 flex justify-between items-center">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
                  <Banknote className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-sm">Log Received Payment</h3>
                  <p className="text-[10px] font-bold text-emerald-800">
                    {showReceiveModal.item.company} | Bill: {showReceiveModal.item.billNo || "No Bill"} (₹{Number(showReceiveModal.item.billAmount || 0).toLocaleString("en-IN")})
                  </p>
                </div>
              </div>
              <button onClick={() => setShowReceiveModal({ show: false, item: null })} className="text-slate-400 hover:text-slate-700 font-bold">
                ✕
              </button>
            </div>

            {/* Body */}
            <form onSubmit={handleReceiveSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Received Amount */}
                <div>
                  <label className="block text-[10px] uppercase font-black text-slate-500 tracking-wider mb-1">
                    Received Amount (₹) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    required
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-emerald-500"
                    placeholder="Enter amount e.g. 45000"
                    value={receiveForm.receivedAmount}
                    onChange={(e) => setReceiveForm({ ...receiveForm, receivedAmount: e.target.value })}
                  />
                </div>

                {/* Received Date */}
                <DatePickerInput
                  label="Received Date *"
                  value={receiveForm.receivedDate}
                  onChange={(val) => setReceiveForm({ ...receiveForm, receivedDate: val })}
                  placeholder="DD/MM/YYYY"
                />
              </div>

              {/* Remarks */}
              <div>
                <label className="block text-[10px] uppercase font-black text-slate-500 tracking-wider mb-1">
                  Payment Remarks / Reference
                </label>
                <textarea
                  rows={2}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-emerald-500 resize-none"
                  placeholder="Transaction UTR / Ref / Notes..."
                  value={receiveForm.remarks}
                  onChange={(e) => setReceiveForm({ ...receiveForm, remarks: e.target.value })}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowReceiveModal({ show: false, item: null })}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingReceive}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow disabled:opacity-50"
                >
                  {submittingReceive ? "Saving..." : "Save Received Payment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
