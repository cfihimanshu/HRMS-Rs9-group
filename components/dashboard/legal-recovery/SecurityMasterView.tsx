"use client";
import React, { useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import {
  Plus, Search, RefreshCw, ShieldCheck, DollarSign, CheckCircle2,
  Clock, Edit, Trash2, Download, Filter, SlidersHorizontal, Tag, Calendar,
  Building2, MapPin, Banknote, Receipt, FileText, Upload, PhoneCall, Zap, UserPlus,
  Camera, User, Image as ImageIcon, ChevronDown, ChevronRight
} from "lucide-react";

const STANDARD_SHIFTS = [
  "12 Hours Day Shift",
  "12 Hours Night Shift",
  "24 Hours Shift",
  "8 Hours Morning Shift",
  "8 Hours Evening Shift",
  "8 Hours Night Shift",
];

const STANDARD_TIMINGS = [
  "08:00 AM - 08:00 PM",
  "08:00 PM - 08:00 AM",
  "08:00 AM - 04:00 PM",
  "04:00 PM - 12:00 AM",
  "12:00 AM - 08:00 AM",
  "09:00 AM - 05:00 PM",
  "10:00 AM - 06:00 PM",
  "06:00 AM - 06:00 PM",
  "06:00 PM - 06:00 AM",
  "24 Hours Full Day",
];

// Helper to format YYYY-MM to Month Name Year, or date range
const formatMonthStr = (monthStr?: string, endDate?: string) => {
  if (!monthStr) return "";
  // Check if it is YYYY-MM-DD format
  if (monthStr.length > 7 && monthStr.includes("-")) {
    const formatSingleDate = (dStr: string) => {
      const parts = dStr.split("-");
      if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
      return dStr;
    };
    if (endDate) {
      return `${formatSingleDate(monthStr)} to ${formatSingleDate(endDate)}`;
    }
    return formatSingleDate(monthStr);
  }
  const parts = monthStr.split("-");
  if (parts.length >= 2) {
    const y = Number(parts[0]);
    const m = Number(parts[1]);
    if (!isNaN(y) && !isNaN(m) && m >= 1 && m <= 12) {
      const dateObj = new Date(y, m - 1, 1);
      return dateObj.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    }
  }
  return monthStr;
};

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
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (
        document.activeElement &&
        document.activeElement.tagName === "INPUT" &&
        (document.activeElement as HTMLInputElement).type === "number"
      ) {
        (document.activeElement as HTMLInputElement).blur();
      }
    };
    document.addEventListener("wheel", handleWheel, { passive: true });
    return () => {
      document.removeEventListener("wheel", handleWheel);
    };
  }, []);

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
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const [showAddCompanyModal, setShowAddCompanyModal] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState("");

  // Payment Timeline Value & Unit (Days / Months Pill Buttons)
  const [timelineVal, setTimelineVal] = useState("30");
  const [timelineUnit, setTimelineUnit] = useState<"Days" | "Months">("Days");

  // DB Guards Master State
  const [dbGuards, setDbGuards] = useState<any[]>([]);
  const [showAddGuardModal, setShowAddGuardModal] = useState(false);
  const [newGuardForm, setNewGuardForm] = useState({ name: "", phone: "", photoUrl: "" });
  const [savingGuard, setSavingGuard] = useState(false);
  // For additional guard cards - track which card is adding new
  const [addGuardForCard, setAddGuardForCard] = useState<"primary" | number | null>(null);

  // Receive Payment Action Modal State
  const [showReceiveModal, setShowReceiveModal] = useState<{ show: boolean; item: any | null }>({
    show: false,
    item: null,
  });
  const [receiveForm, setReceiveForm] = useState({
    receivedAmount: "",
    receivedDate: new Date().toISOString().split("T")[0],
    paymentMethod: "Bank Transfer (NEFT/RTGS)",
    customPaymentMethod: "",
    transactionId: "",
    bankName: "",
    chequeDate: "",
    payerName: "",
    remarks: "",
  });
  const [receiveProofFile, setReceiveProofFile] = useState<File | null>(null);
  const [submittingReceive, setSubmittingReceive] = useState(false);

  // View Day-Wise Roster Details Modal State
  const [showRosterDetailsModal, setShowRosterDetailsModal] = useState<{
    show: boolean;
    item: any | null;
  }>({
    show: false,
    item: null,
  });
  const [rosterModalFilterDate, setRosterModalFilterDate] = useState<string>("ALL");
  const [collapsedModalDates, setCollapsedModalDates] = useState<Record<string, boolean>>({});

  // Dedicated Add Billing Details Modal State
  const [showAddBillingModal, setShowAddBillingModal] = useState(false);
  const [billingForm, setBillingForm] = useState({
    company: "Force009",
    billNo: "",
    billDate: new Date().toISOString().split("T")[0],
    billAmount: "",
    nbfcId: "",
    nbfcName: "",
    branchId: "",
    branchName: "",
    location: "",
    siteType: "Building",
    customSiteType: "",
    paymentDays: "30 Days",
    paymentStatus: "Due",
    paymentMethod: "Bank Transfer (NEFT/RTGS)",
    source: "BDA",
    remarks: "",
  });
  const [billingFile, setBillingFile] = useState<File | null>(null);
  const [submittingBilling, setSubmittingBilling] = useState(false);

  // Dedicated Add Guard Modal State & Form
  const [addGuardForRosterIdx, setAddGuardForRosterIdx] = useState<number | null>(null);

  // Section 4 Collapsible Accordion State
  const [isRosterBreakdownExpanded, setIsRosterBreakdownExpanded] = useState(true);

  const handleOpenAddBillingModal = () => {
    setBillingForm({
      company: companiesList[0] || "Force009",
      billNo: "",
      billDate: new Date().toISOString().split("T")[0],
      billAmount: "",
      nbfcId: "",
      nbfcName: "",
      branchId: "",
      branchName: "",
      location: "",
      siteType: "Building",
      customSiteType: "",
      paymentDays: "30 Days",
      paymentStatus: "Due",
      paymentMethod: "Bank Transfer (NEFT/RTGS)",
      source: "BDA",
      remarks: "",
    });
    setTimelineVal("30");
    setTimelineUnit("Days");
    setBillingFile(null);
    setShowAddBillingModal(true);
  };

  const handleBillingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingBilling(true);

    try {
      let billInvoiceUrl = "";
      if (billingFile) {
        const formData = new FormData();
        formData.append("file", billingFile);
        const uploadRes = await fetch("/api/documents/upload", {
          method: "POST",
          body: formData,
        });
        const uploadData = await uploadRes.json();
        if (uploadData.success && uploadData.url) {
          billInvoiceUrl = uploadData.url;
        }
      }

      const finalSiteType = billingForm.siteType === "Other" && billingForm.customSiteType.trim()
        ? billingForm.customSiteType.trim()
        : billingForm.siteType;

      const payload = {
        company: billingForm.company,
        billNo: billingForm.billNo,
        billDate: billingForm.billDate,
        billAmount: Number(billingForm.billAmount) || 0,
        nbfcId: billingForm.nbfcId ? Number(billingForm.nbfcId) : null,
        nbfcName: billingForm.nbfcName,
        branchId: billingForm.branchId ? Number(billingForm.branchId) : null,
        branchName: billingForm.branchName,
        location: billingForm.location,
        siteType: finalSiteType,
        coverageHours: null,
        shiftHours: null,
        guardsPerShift: null,
        totalDailyGuards: null,
        durationDays: null,
        paymentDays: null,
        billInvoiceUrl,
        paymentStatus: billingForm.paymentStatus,
        paymentMethod: billingForm.paymentStatus !== "Due" ? billingForm.paymentMethod : null,
        source: billingForm.source,
        remarks: billingForm.remarks,
      };

      const res = await fetch("/api/legal-recovery/security", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        triggerToast("Billing entry added successfully!");
        setShowAddBillingModal(false);
        fetchEntries();
      } else {
        triggerToast(data.error || "Failed to add billing entry");
      }
    } catch (err) {
      console.error(err);
      triggerToast("Error adding billing entry");
    } finally {
      setSubmittingBilling(false);
    }
  };

  // Add/Update Bill Details Action Modal State
  const [showBillModal, setShowBillModal] = useState<{ show: boolean; item: any | null }>({
    show: false,
    item: null,
  });
  const [billForm, setBillForm] = useState({
    billNo: "",
    billDate: new Date().toISOString().split("T")[0],
    billAmount: "",
    receivedAmount: "",
    receivedDate: new Date().toISOString().split("T")[0],
    paymentDays: "30 Days",
    paymentStatus: "Due",
    paymentMethod: "Bank Transfer (NEFT/RTGS)",
    billInvoiceUrl: "",
    remarks: "",
  });
  const [billFile, setBillFile] = useState<File | null>(null);
  const [submittingBill, setSubmittingBill] = useState(false);

  // Log Payment Follow-Up Call Modal State
  const [showFollowUpModal, setShowFollowUpModal] = useState<{ show: boolean; item: any | null }>({
    show: false,
    item: null,
  });
  const [followUpForm, setFollowUpForm] = useState({
    callDate: new Date().toISOString().split("T")[0],
    callStatus: "Connected",
    nextFollowUpDate: "",
    nextFollowUpTime: "10:00",
    conversationDetails: "",
  });
  const [followUpFile, setFollowUpFile] = useState<File | null>(null);
  const [submittingFollowUp, setSubmittingFollowUp] = useState(false);
  const [followUpError, setFollowUpError] = useState<string>("");

  const handleOpenFollowUpModal = (item: any) => {
    setShowFollowUpModal({ show: true, item });
    setFollowUpForm({
      callDate: new Date().toISOString().split("T")[0],
      callStatus: "Connected",
      nextFollowUpDate: "",
      nextFollowUpTime: "10:00",
      conversationDetails: "",
    });
    setFollowUpFile(null);
    setFollowUpError("");
  };

  const handleFollowUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFollowUpError("");
    if (!showFollowUpModal.item) return;
    if (!followUpForm.conversationDetails.trim()) {
      const msg = "Please enter conversation details / kya baat hui";
      setFollowUpError(msg);
      triggerToast(msg);
      return;
    }

    setSubmittingFollowUp(true);
    try {
      let attachmentUrl: string | null = null;
      if (followUpFile) {
        try {
          const formData = new FormData();
          formData.append("file", followUpFile);
          const uploadRes = await fetch("/api/documents/upload", {
            method: "POST",
            body: formData,
          });
          const uploadData = await uploadRes.json();
          if (uploadData.success && uploadData.url) {
            attachmentUrl = uploadData.url;
          } else {
            console.warn("Attachment upload notice:", uploadData.error);
            if (uploadData.error) {
              triggerToast(`Upload notice: ${uploadData.error}`);
            }
          }
        } catch (fErr: any) {
          console.error("File upload error:", fErr);
        }
      }

      const item = showFollowUpModal.item;
      const fullFollowUpDateTime = followUpForm.nextFollowUpDate
        ? `${followUpForm.nextFollowUpDate}${followUpForm.nextFollowUpTime ? ` ${followUpForm.nextFollowUpTime}` : ""}`
        : null;

      const payload = {
        nbfcId: item.nbfcId ? Number(item.nbfcId) : null,
        nbfcName: item.nbfcName || item.company || "NBFC",
        nbfcCode: item.billNo || item.location || "Security Entry",
        callDate: followUpForm.callDate,
        callStatus: followUpForm.callStatus,
        nextFollowUpDate: fullFollowUpDateTime,
        nextFollowUpTime: followUpForm.nextFollowUpTime || "10:00",
        conversationDetails: `[Bill: ${item.billNo || "N/A"} | Site: ${item.location || "N/A"}]\n${followUpForm.conversationDetails}`,
        attachmentUrl: attachmentUrl,
      };

      const res = await fetch("/api/legal-recovery/nbfc-followup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        triggerToast(
          data.taskId
            ? `Follow-up call saved & Auto-task #${data.taskId} created!`
            : "Follow-up call logged successfully!"
        );
        setShowFollowUpModal({ show: false, item: null });
        setFollowUpError("");
      } else {
        const errMsg = data.error || "Failed to save follow-up call";
        setFollowUpError(errMsg);
        triggerToast(errMsg);
      }
    } catch (err: any) {
      console.error(err);
      const errMsg = err.message || "Error saving follow-up call";
      setFollowUpError(errMsg);
      triggerToast(errMsg);
    } finally {
      setSubmittingFollowUp(false);
    }
  };

  // Excel-like Column Filters
  const [activeFilterKey, setActiveFilterKey] = useState<string | null>(null);
  const [columnFilters, setColumnFilters] = useState<Record<string, string[]>>({
    company: [],
    nbfcName: [],
    branchName: [],
    location: [],
    siteType: [],
    deploymentInfo: [],
    shiftsInfo: [],
    guardContact: [],
    billNo: [],
    billDate: [],
    billAmount: [],
    paymentStatus: [],
    paymentDays: [],
    receivedAmount: [],
    receivedDate: [],
    source: [],
    remarks: [],
  });

  // Toggle Columns state
  const [showColumnToggle, setShowColumnToggle] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState({
    company: true,
    nbfcName: true,
    branchName: true,
    location: true,
    siteType: true,
    deploymentInfo: true,
    shiftsInfo: true,
    guardContact: true,
    billNo: true,
    billDate: true,
    billAmount: true,
    paymentStatus: true,
    paymentDays: true,
    receivedAmount: true,
    receivedDate: true,
    source: true,
    remarks: true,
    actions: true,
  });

  // Form Modal States
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form State
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
    siteType: "Building",
    customSiteType: "",
    offerRef: "",
    coverageHours: "24",
    shiftHours: "8",
    guardsPerShift: "1",
    shiftRate: "",
    allowancePerShift: "",
    durationDays: "1",
    guardName: "",
    guardPhone: "",
    guardPhotoUrl: "",
    guardShiftType: "8 Hours Shift",
    guardShiftTiming: "08:00 AM - 04:00 PM",
    billInvoiceUrl: "",
    receivedDate: "",
    paymentStatus: "Due",
    paymentMethod: "Bank Transfer (NEFT/RTGS)",
    source: "BDA",
    remarks: "",
  });

  const [primaryGuardFile, setPrimaryGuardFile] = useState<File | null>(null);

  // Dynamic Guard Contact List (For multiple guard details)
  const [guardList, setGuardList] = useState<{
    name: string;
    phone: string;
    photoUrl?: string;
    file?: File | null;
    shiftType?: string;
    shiftTiming?: string;
    shiftRate?: string;
    allowancePerShift?: string;
  }[]>([]);

  // Daily Roster Deployment State for Day-Wise Record
  const [dailyRosterList, setDailyRosterList] = useState<{
    dayNo: number;
    date?: string;
    startDate?: string;
    endDate?: string;
    shiftType: string;
    shiftTiming: string;
    guardName: string;
    guardPhone: string;
    guardPhotoUrl?: string;
    shiftRate: string;
    allowancePerShift: string;
    guardsCount: string;
    isSaved?: boolean;
  }[]>([]);

  const [selectedRosterFilterDate, setSelectedRosterFilterDate] = useState<string>("");

  // Helper to add a monthly/date-wise guard shift entry with date range
  const handleAddRosterRow = (overrideDate?: string) => {
    const currentMonth = new Date().toISOString().substring(0, 7);
    setDailyRosterList((prev) => [
      ...prev,
      {
        dayNo: prev.length + 1,
        date: currentMonth,
        startDate: undefined,
        endDate: undefined,
        shiftType: "12 Hours Day Shift",
        shiftTiming: "08:00 AM - 08:00 PM",
        guardName: "",
        guardPhone: "",
        shiftRate: "",
        allowancePerShift: "",
        guardsCount: "1",
        isSaved: false,
      },
    ]);
    setSelectedRosterFilterDate(currentMonth);
  };

  // Shift & Rate Live Calculation Engine
  const computedShiftDetails = useMemo(() => {
    // If dailyRosterList has entries, calculate directly from roster
    if (dailyRosterList.length > 0) {
      let totalGuards = 0;
      let totalBill = 0;
      let totalGuardCost = 0;
      let totalAllowanceCost = 0;
      const uniqueDates = new Set();

      dailyRosterList.forEach((row) => {
        if (row.isSaved === false) return;
        const count = Math.max(1, Number(row.guardsCount) || 1);
        const rate = Math.max(0, Number(row.shiftRate) || 0);
        const allowance = Math.max(0, Number(row.allowancePerShift) || 0);
        if (row.date) uniqueDates.add(row.date);
        totalGuards += count;
        totalGuardCost += rate * count;
        totalAllowanceCost += allowance * count;
        totalBill += (rate + allowance) * count;
      });

      const activeDaysCount = uniqueDates.size > 0 ? uniqueDates.size : dailyRosterList.length;

      return {
        totalDailyGuards: totalGuards,
        totalGuardsCount: totalGuards,
        days: activeDaysCount,
        dailyGuardCost: totalGuardCost,
        dailyAllowanceCost: totalAllowanceCost,
        dailyTotalCost: totalBill,
        totalGuardCost,
        totalAllowanceCost,
        grandTotalBill: totalBill,
      };
    }

    // Fallback if guardName or guardList exists
    const allGuardItems: { rate: number; allowance: number }[] = [];

    if (form.guardName || (form.shiftRate && Number(form.shiftRate) > 0)) {
      allGuardItems.push({
        rate: Math.max(0, Number(form.shiftRate) || 0),
        allowance: Math.max(0, Number(form.allowancePerShift) || 0),
      });
    }

    guardList.forEach((g) => {
      if (g.name || (g.shiftRate && Number(g.shiftRate) > 0)) {
        allGuardItems.push({
          rate: Math.max(0, Number(g.shiftRate) || 0),
          allowance: Math.max(0, Number(g.allowancePerShift) || 0),
        });
      }
    });

    if (allGuardItems.length > 0) {
      const totalGuardsCount = allGuardItems.length;
      const dailyGuardCost = allGuardItems.reduce((acc, curr) => acc + curr.rate, 0);
      const dailyAllowanceCost = allGuardItems.reduce((acc, curr) => acc + curr.allowance, 0);
      const dailyTotalCost = dailyGuardCost + dailyAllowanceCost;

      return {
        totalDailyGuards: totalGuardsCount,
        totalGuardsCount,
        days: 1,
        dailyGuardCost,
        dailyAllowanceCost,
        dailyTotalCost,
        totalGuardCost: dailyGuardCost,
        totalAllowanceCost: dailyAllowanceCost,
        grandTotalBill: dailyTotalCost,
      };
    }

    // Default when 0 guards/roster entries added
    return {
      totalDailyGuards: 0,
      totalGuardsCount: 0,
      days: 0,
      dailyGuardCost: 0,
      dailyAllowanceCost: 0,
      dailyTotalCost: 0,
      totalGuardCost: 0,
      totalAllowanceCost: 0,
      grandTotalBill: 0,
    };
  }, [
    dailyRosterList,
    form.guardName,
    form.shiftRate,
    form.allowancePerShift,
    guardList,
  ]);

  // Dynamic Site Type Options List
  const availableSiteOptions = useMemo(() => {
    const defaultSites = ["Building", "Land", "Plot", "Bank Branch", "ATM", "Warehouse", "Factory", "Residential"];
    const customFromEntries = entries.map((e: any) => e.siteType).filter(Boolean);
    const combined = Array.from(new Set([...defaultSites, ...customFromEntries, form.siteType].filter(Boolean)));
    return combined.filter((s) => s !== "Other");
  }, [entries, form.siteType]);

  // Fetch Companies from DB table legal_companies
  const fetchCompanies = async () => {
    try {
      const res = await fetch("/api/legal-recovery/company");
      if (!res.ok) return;
      const data = await res.json();
      if (data && data.success && Array.isArray(data.data) && data.data.length > 0) {
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

  // Fetch DB Guards Master
  const fetchDbGuards = async () => {
    try {
      const res = await fetch("/api/legal-recovery/guards");
      const data = await res.json();
      if (data.success && data.data) {
        setDbGuards(data.data);
      }
    } catch (err) {
      console.error("Error fetching DB guards:", err);
    }
  };

  // Add New Guard to DB from quick modal
  const handleAddNewGuard = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newGuardForm.name.trim()) {
      triggerToast("Please enter Guard Name");
      return;
    }
    setSavingGuard(true);
    try {
      const res = await fetch("/api/legal-recovery/guards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newGuardForm.name.trim(),
          phone: newGuardForm.phone.trim(),
          photoUrl: newGuardForm.photoUrl,
        }),
      });
      const data = await res.json();
      if (data.success) {
        triggerToast(`Guard "${newGuardForm.name.trim()}" registered in DB Master!`);
        await fetchDbGuards();

        // Auto-select guard if triggered from specific roster row
        if (addGuardForRosterIdx !== null && addGuardForRosterIdx >= 0) {
          const updated = [...dailyRosterList];
          if (updated[addGuardForRosterIdx]) {
            updated[addGuardForRosterIdx].guardName = newGuardForm.name.trim();
            updated[addGuardForRosterIdx].guardPhone = newGuardForm.phone.trim();
            if (newGuardForm.photoUrl) {
              updated[addGuardForRosterIdx].guardPhotoUrl = newGuardForm.photoUrl;
            }
          }
          setDailyRosterList(updated);
        } else if (addGuardForCard === "primary") {
          setForm({ ...form, guardName: newGuardForm.name.trim(), guardPhone: newGuardForm.phone });
        }

        setNewGuardForm({ name: "", phone: "", photoUrl: "" });
        setShowAddGuardModal(false);
        setAddGuardForRosterIdx(null);
        setAddGuardForCard(null);
      } else {
        triggerToast(data.error || "Failed to add guard");
      }
    } catch (err) {
      triggerToast("Error saving guard to DB");
    } finally {
      setSavingGuard(false);
    }
  };

  const handleGuardPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewGuardForm((prev) => ({ ...prev, photoUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    fetchCompanies();
    fetchEntries();
    fetchDbGuards();
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
      siteType: "Building",
      customSiteType: "",
      offerRef: "",
      coverageHours: "24",
      shiftHours: "8",
      guardsPerShift: "1",
      shiftRate: "",
      allowancePerShift: "",
      durationDays: "1",
      guardName: "",
      guardPhone: "",
      guardPhotoUrl: "",
      guardShiftType: "",
      guardShiftTiming: "",
      billInvoiceUrl: "",
      receivedDate: "",
      paymentStatus: "Due",
      paymentMethod: "Bank Transfer (NEFT/RTGS)",
      source: "",
      remarks: "",
    });
    setGuardList([]);
    setDailyRosterList([]);
    setSelectedRosterFilterDate("");
    setPrimaryGuardFile(null);
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
    let parsedGuardsList: { name: string; phone: string; photoUrl?: string; shiftType?: string; shiftTiming?: string }[] = [];
    let parsedRoster: any[] = [];
    let primaryGuardShiftType = "8 Hours Shift";
    let primaryGuardShiftTiming = "08:00 AM - 04:00 PM";

    if (item.guardDetailsJson) {
      try {
        const parsed = JSON.parse(item.guardDetailsJson);
        if (Array.isArray(parsed) && parsed.length > 0) {
          if (parsed[0].dayNo) {
            parsedRoster = parsed;
          } else {
            const first = parsed[0];
            if (first.shiftType) primaryGuardShiftType = first.shiftType;
            if (first.shiftTiming) primaryGuardShiftTiming = first.shiftTiming;
            parsedGuardsList = parsed.slice(1);
          }
        }
      } catch (e) {
        parsedGuardsList = [];
        parsedRoster = [];
      }
    }

    const rawSiteType = item.siteType || "Building";

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
      siteType: rawSiteType,
      customSiteType: "",
      offerRef: item.offerRef || "",
      coverageHours: item.coverageHours !== undefined ? String(item.coverageHours) : "24",
      shiftHours: item.shiftHours !== undefined ? String(item.shiftHours) : "8",
      guardsPerShift: item.guardsPerShift !== undefined ? String(item.guardsPerShift) : "1",
      shiftRate: item.shiftRate !== undefined ? String(item.shiftRate) : "",
      allowancePerShift: item.allowancePerShift !== undefined ? String(item.allowancePerShift) : "",
      durationDays: item.durationDays !== undefined ? String(item.durationDays) : "1",
      guardName: item.guardName || "",
      guardPhone: item.guardPhone || "",
      guardPhotoUrl: item.guardPhotoUrl || "",
      guardShiftType: primaryGuardShiftType,
      guardShiftTiming: primaryGuardShiftTiming,
      billInvoiceUrl: item.billInvoiceUrl || "",
      receivedDate: item.receivedDate || "",
      paymentStatus: item.paymentStatus || "Due",
      paymentMethod: item.paymentMethod || "Bank Transfer (NEFT/RTGS)",
      source: item.source || "BDA",
      remarks: item.remarks || "",
    });
    setGuardList(parsedGuardsList);
    setDailyRosterList(parsedRoster.map(r => ({ ...r, isSaved: true })));
    setSelectedRosterFilterDate("");
    setPrimaryGuardFile(null);

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
    const unsaved = dailyRosterList.filter(r => r.isSaved === false);
    if (unsaved.length > 0) {
      triggerToast(`⚠️ Please save Month #${unsaved.map(u => u.dayNo).join(", ")} Guard Log before submitting!`);
      return;
    }
    setSubmitting(true);
    try {
      const formattedTimeline = timelineVal ? `${timelineVal} ${timelineUnit}` : "";
      const url = "/api/legal-recovery/security";
      const method = editingId ? "PUT" : "POST";

      const finalBillAmount = form.billAmount !== "" && !isNaN(Number(form.billAmount))
        ? Number(form.billAmount)
        : computedShiftDetails.grandTotalBill;

      const effectiveSiteType = form.siteType === "Other" && form.customSiteType.trim()
        ? form.customSiteType.trim()
        : form.siteType;

      let uploadedPrimaryGuardPhoto = form.guardPhotoUrl;
      if (primaryGuardFile) {
        const formData = new FormData();
        formData.append("file", primaryGuardFile);
        const uploadRes = await fetch("/api/documents/upload", {
          method: "POST",
          body: formData,
        });
        const uploadData = await uploadRes.json();
        if (uploadData.success && uploadData.url) {
          uploadedPrimaryGuardPhoto = uploadData.url;
        }
      }

      // Auto-register guards to DB table legal_guards
      if (form.guardName && form.guardName.trim()) {
        try {
          await fetch("/api/legal-recovery/guards", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: form.guardName.trim(),
              phone: form.guardPhone || "",
              photoUrl: uploadedPrimaryGuardPhoto || "",
            }),
          });
        } catch (e) { }
      }

      // Helper to decode custom timing/shift-type encodings to readable strings
      const resolveShiftTiming = (timing: string) => {
        if (!timing) return "";
        if (timing.startsWith("__customFrom__")) {
          const parts = timing.replace("__customFrom__", "").split("__to__");
          const from = parts[0] || "00:00";
          const to = parts[1] || "00:00";
          const fmt = (t: string) => {
            const [h, m] = t.split(":").map(Number);
            const ampm = h >= 12 ? "PM" : "AM";
            const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
            return `${String(h12).padStart(2, "0")}:${String(m || 0).padStart(2, "0")} ${ampm}`;
          };
          return `${fmt(from)} - ${fmt(to)}`;
        }
        if (timing.startsWith("__customType__")) return timing.replace("__customType__", "");
        return timing;
      };
      const resolveShiftType = (type: string, timing: string) => {
        if (timing?.startsWith("__customType__")) return timing.replace("__customType__", "");
        return type || "";
      };

      // Process guard list to include shift timing mapping
      const primaryGuardItem = form.guardName ? [{
        name: form.guardName,
        phone: form.guardPhone || "",
        photoUrl: uploadedPrimaryGuardPhoto || "",
        shiftType: resolveShiftType(form.guardShiftType, form.guardShiftTiming),
        shiftTiming: resolveShiftTiming(form.guardShiftTiming),
      }] : [];

      const processedExtraGuards = await Promise.all(
        guardList.map(async (g) => {
          let pUrl = g.photoUrl || "";
          if (g.file) {
            const formData = new FormData();
            formData.append("file", g.file);
            const res = await fetch("/api/documents/upload", { method: "POST", body: formData });
            const data = await res.json();
            if (data.success && data.url) {
              pUrl = data.url;
            }
          }
          if (g.name && g.name.trim()) {
            try {
              await fetch("/api/legal-recovery/guards", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  name: g.name.trim(),
                  phone: g.phone || "",
                  photoUrl: pUrl,
                }),
              });
            } catch (e) { }
          }
          return {
            name: g.name,
            phone: g.phone,
            photoUrl: pUrl,
            shiftType: resolveShiftType(g.shiftType || "", g.shiftTiming || ""),
            shiftTiming: resolveShiftTiming(g.shiftTiming || ""),
          };
        })
      );

      let finalGuardDetailsJson = "";
      if (dailyRosterList.length > 0) {
        // Auto-save/update all roster guards to DB master legal_guards table
        for (const r of dailyRosterList) {
          if (r.guardName && r.guardName.trim()) {
            try {
              await fetch("/api/legal-recovery/guards", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  name: r.guardName.trim(),
                  phone: r.guardPhone || "",
                  photoUrl: r.guardPhotoUrl || "",
                }),
              });
            } catch (e) { }
          }
        }
        await fetchDbGuards();

        const resolvedRoster = dailyRosterList.map((r) => ({
          ...r,
          shiftType: resolveShiftType(r.shiftType || "", r.shiftTiming || ""),
          shiftTiming: resolveShiftTiming(r.shiftTiming || ""),
        }));
        finalGuardDetailsJson = JSON.stringify(resolvedRoster);
      } else {
        const processedGuardList = [...primaryGuardItem, ...processedExtraGuards];
        finalGuardDetailsJson = JSON.stringify(processedGuardList);
      }

      const payload = {
        ...(editingId ? { id: editingId } : {}),
        ...form,
        siteType: effectiveSiteType,
        guardPhotoUrl: uploadedPrimaryGuardPhoto,
        billAmount: finalBillAmount,
        totalDailyGuards: computedShiftDetails.totalDailyGuards,
        totalGuardCost: computedShiftDetails.totalGuardCost,
        totalAllowanceCost: computedShiftDetails.totalAllowanceCost,
        guardDetailsJson: finalGuardDetailsJson,
        paymentDays: formattedTimeline,
      };

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
      receivedAmount: "",
      receivedDate: new Date().toISOString().split("T")[0],
      paymentMethod: item.paymentMethod || "Bank Transfer (NEFT/RTGS)",
      customPaymentMethod: "",
      transactionId: "",
      bankName: "",
      chequeDate: "",
      payerName: "",
      remarks: "",
    });
    setReceiveProofFile(null);
  };

  const handleReceiveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showReceiveModal.item?.id) return;

    const amt = Number(receiveForm.receivedAmount);
    if (!amt || amt <= 0) {
      triggerToast("Please enter a valid received amount");
      return;
    }

    setSubmittingReceive(true);
    try {
      let proofUrl = "";
      if (receiveProofFile) {
        const formData = new FormData();
        formData.append("file", receiveProofFile);
        const uploadRes = await fetch("/api/documents/upload", {
          method: "POST",
          body: formData,
        });
        const uploadData = await uploadRes.json();
        if (uploadData.success && uploadData.url) {
          proofUrl = uploadData.url;
        }
      }

      // Determine final payment mode name
      const effectivePaymentMode = receiveForm.paymentMethod === "Other"
        ? (receiveForm.customPaymentMethod.trim() || "Other Custom Method")
        : receiveForm.paymentMethod;

      // Construct detailed reference string for DB storage
      const refParts: string[] = [];
      if (receiveForm.transactionId.trim()) {
        refParts.push(`Ref: ${receiveForm.transactionId.trim()}`);
      }
      if (receiveForm.bankName.trim()) {
        refParts.push(`Bank: ${receiveForm.bankName.trim()}`);
      }
      if (receiveForm.chequeDate.trim()) {
        refParts.push(`Date: ${receiveForm.chequeDate.trim()}`);
      }
      if (receiveForm.payerName.trim()) {
        refParts.push(`Details: ${receiveForm.payerName.trim()}`);
      }

      const formattedTransactionId = refParts.length > 0 ? refParts.join(" | ") : (receiveForm.transactionId.trim() || "N/A");

      const payload = {
        securityId: showReceiveModal.item.id,
        amount: amt,
        paymentDate: receiveForm.receivedDate,
        paymentMode: effectivePaymentMode,
        transactionId: formattedTransactionId,
        proofUrl: proofUrl,
        remarks: receiveForm.remarks,
      };

      const res = await fetch("/api/legal-recovery/security/payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        triggerToast(`Payment of ₹${amt.toLocaleString("en-IN")} logged successfully & saved to DB!`);
        setShowReceiveModal({ show: false, item: null });
        fetchEntries();
      } else {
        triggerToast(data.error || "Failed to log received payment");
      }
    } catch (err) {
      console.error(err);
      triggerToast("Error saving received payment");
    } finally {
      setSubmittingReceive(false);
    }
  };

  // Bill Details Action Modal Handler
  const handleOpenBillModal = (item: any) => {
    setShowBillModal({ show: true, item });
    setBillForm({
      billNo: item.billNo || "",
      billDate: item.billDate || new Date().toISOString().split("T")[0],
      billAmount: item.billAmount !== undefined && Number(item.billAmount) > 0 ? String(item.billAmount) : (item.totalGuardCost ? String(item.totalGuardCost) : ""),
      receivedAmount: item.receivedAmount !== undefined && Number(item.receivedAmount) > 0 ? String(item.receivedAmount) : "",
      receivedDate: item.receivedDate || new Date().toISOString().split("T")[0],
      paymentDays: item.paymentDays || "30 Days",
      paymentStatus: item.paymentStatus || "Due",
      paymentMethod: item.paymentMethod || "Bank Transfer (NEFT/RTGS)",
      billInvoiceUrl: item.billInvoiceUrl || "",
      remarks: item.remarks || "",
    });
    setBillFile(null);
  };

  const handleBillSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showBillModal.item?.id) return;
    setSubmittingBill(true);
    try {
      const billedVal = Number(billForm.billAmount || 0);
      const receivedVal = Number(billForm.receivedAmount || 0);

      let computedStatus = billForm.paymentStatus;
      if (receivedVal > 0) {
        if (billedVal > 0 && receivedVal >= billedVal) {
          computedStatus = "Payment Done";
        } else {
          computedStatus = "Partial Payment";
        }
      }

      const payload = {
        id: showBillModal.item.id,
        billNo: billForm.billNo,
        billDate: billForm.billDate,
        billAmount: billedVal,
        receivedAmount: receivedVal,
        receivedDate: billForm.receivedDate,
        paymentDays: billForm.paymentDays,
        paymentStatus: computedStatus,
        remarks: billForm.remarks || showBillModal.item.remarks || "",
      };

      const res = await fetch("/api/legal-recovery/security", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        triggerToast("Billing & Payment details updated successfully!");
        setShowBillModal({ show: false, item: null });
        fetchEntries();
      } else {
        triggerToast(data.error || "Failed to save billing & payment details");
      }
    } catch (err) {
      console.error(err);
      triggerToast("Error saving billing & payment details");
    } finally {
      setSubmittingBill(false);
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
    if (key === "deploymentInfo") {
      const vals = entries.map((item) =>
        item.totalDailyGuards && item.totalDailyGuards > 0
          ? `${item.totalDailyGuards} Guards/day (${item.durationDays || 1} Days)`
          : "—"
      );
      return Array.from(new Set(vals)).sort();
    }
    if (key === "shiftsInfo") {
      const vals = entries.map((item) =>
        item.shiftHours && item.coverageHours
          ? `${item.coverageHours}h Coverage | ${item.shiftHours}h Shift`
          : "—"
      );
      return Array.from(new Set(vals)).sort();
    }
    if (key === "guardContact") {
      let guardNames: string[] = [];
      entries.forEach((item) => {
        if (item.guardName) guardNames.push(item.guardName);
        if (item.guardDetailsJson) {
          try {
            const parsed = JSON.parse(item.guardDetailsJson);
            if (Array.isArray(parsed)) {
              parsed.forEach((g: any) => { if (g?.name) guardNames.push(g.name); });
            }
          } catch (e) { }
        }
      });
      return Array.from(new Set(guardNames)).filter(Boolean).sort();
    }
    if (key === "paymentDays") {
      const vals = entries.map((item) => String(item.paymentDays || "—"));
      return Array.from(new Set(vals)).sort();
    }
    if (key === "remarks") {
      const vals = entries.map((item) => String(item.remarks || "—"));
      return Array.from(new Set(vals)).sort();
    }
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
        (item.source || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.guardName || "").toLowerCase().includes(searchTerm.toLowerCase());

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
      if (columnFilters.siteType?.length > 0 && !columnFilters.siteType.includes(item.siteType || "Building")) return false;

      if (columnFilters.deploymentInfo?.length > 0) {
        const depStr = item.totalDailyGuards && item.totalDailyGuards > 0
          ? `${item.totalDailyGuards} Guards/day (${item.durationDays || 1} Days)`
          : "—";
        if (!columnFilters.deploymentInfo.includes(depStr)) return false;
      }
      if (columnFilters.shiftsInfo?.length > 0) {
        const shiftStr = item.shiftHours && item.coverageHours
          ? `${item.coverageHours}h Coverage | ${item.shiftHours}h Shift`
          : "—";
        if (!columnFilters.shiftsInfo.includes(shiftStr)) return false;
      }
      if (columnFilters.guardContact?.length > 0) {
        let allNames: string[] = [];
        if (item.guardName) allNames.push(item.guardName);
        if (item.guardDetailsJson) {
          try {
            const parsed = JSON.parse(item.guardDetailsJson);
            if (Array.isArray(parsed)) parsed.forEach((g: any) => { if (g?.name) allNames.push(g.name); });
          } catch (e) { }
        }
        if (!allNames.some((n) => columnFilters.guardContact.includes(n))) return false;
      }
      if (columnFilters.paymentDays?.length > 0 && !columnFilters.paymentDays.includes(item.paymentDays || "—")) return false;
      if (columnFilters.paymentStatus?.length > 0 && !columnFilters.paymentStatus.includes(item.paymentStatus || "Due")) return false;
      if (columnFilters.source?.length > 0 && !columnFilters.source.includes(item.source || "")) return false;
      if (columnFilters.receivedAmount?.length > 0 && !columnFilters.receivedAmount.includes(String(item.receivedAmount || 0))) return false;
      if (columnFilters.receivedDate?.length > 0 && !columnFilters.receivedDate.includes(item.receivedDate || "")) return false;
      if (columnFilters.remarks?.length > 0 && !columnFilters.remarks.includes(item.remarks || "—")) return false;

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
      { key: "location", label: "Site Area / Address", getValue: (item) => item.location || "" },
      { key: "siteType", label: "Site Type", getValue: (item) => item.siteType || "" },
      {
        key: "deploymentInfo",
        label: "Guard Deployment & Shift Breakdown",
        getValue: (item) =>
          `${item.totalDailyGuards || 0} Guards/day (${item.coverageHours || 24}h coverage, ${item.shiftHours || 8}h shift) | ${item.durationDays || 1} Days | Rate: ₹${item.shiftRate || 0}/shift`,
      },
      {
        key: "guardContact",
        label: "Assigned Guard Details",
        getValue: (item) =>
          `${item.guardName || ""}${item.guardPhone ? ` (${item.guardPhone})` : ""}`,
      },
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
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchEntries}
            className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all"
            title="Refresh List"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>

          {/* Add Billing Details Button */}
          <button
            onClick={handleOpenAddBillingModal}
            className="flex items-center gap-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 text-xs font-black px-4 py-2.5 rounded-xl shadow-2xs transition-all"
            title="Add Initial Billing & Work Order Entry"
          >
            <Receipt className="w-4 h-4 text-indigo-600" />
            <span>Add Billing Details</span>
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
                    nbfcName: "Bank / NBFC Name",
                    branchName: "Branch",
                    location: "Site Area",
                    siteType: "Site Type",
                    deploymentInfo: "Guards / Deployment",
                    shiftsInfo: "Shifts",
                    guardContact: "Guard Contact",
                    billNo: "Bill No.",
                    billDate: "Bill Date",
                    billAmount: "Bill Amount",
                    paymentStatus: "Payment Status",
                    paymentDays: "Payment Timeline",
                    receivedAmount: "Received Amount",
                    receivedDate: "Received Date",
                    source: "Source",
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
          <div className="overflow-auto max-h-[calc(100vh-280px)] min-h-[380px] rounded-b-xl border-t border-slate-200/80">
            <table className="min-w-[1950px] w-full text-left text-xs border-collapse">
              <thead className="sticky top-0 z-20 bg-slate-100 shadow-2xs">
                <tr className="bg-slate-100 text-black font-black uppercase font-mono tracking-wider border-b border-slate-300 text-[11px]">
                  <th className="py-3.5 px-3 text-center min-w-[45px]">#</th>

                  {/* 1. Company */}
                  {visibleColumns.company && (
                    <th className="py-3.5 px-3.5 min-w-[200px] relative">
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

                  {/* 2. Bank / NBFC Name */}
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

                  {/* 3. Branch */}
                  {visibleColumns.branchName && (
                    <th className="py-3.5 px-3.5 min-w-[130px] relative">
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

                  {/* 4. Site (Formerly Location) */}
                  {visibleColumns.location && (
                    <th className="py-3.5 px-3.5 min-w-[150px] relative">
                      <div className="flex items-center gap-1.5 cursor-pointer select-none" onClick={() => setActiveFilterKey(activeFilterKey === "location" ? null : "location")}>
                        <span>Site Area</span>
                        <Filter className={`w-3 h-3 ${columnFilters.location?.length ? "text-indigo-600 font-bold" : "text-slate-400"}`} />
                      </div>
                      {activeFilterKey === "location" && (
                        <HeaderFilter
                          filterKey="Site Area"
                          options={getUniqueOptions("location")}
                          selectedValues={columnFilters.location}
                          onChange={(vals) => setColumnFilters({ ...columnFilters, location: vals })}
                          onClose={() => setActiveFilterKey(null)}
                        />
                      )}
                    </th>
                  )}

                  {/* 5. Site Type */}
                  {visibleColumns.siteType && (
                    <th className="py-3.5 px-3.5 min-w-[120px] relative">
                      <div className="flex items-center gap-1.5 cursor-pointer select-none" onClick={() => setActiveFilterKey(activeFilterKey === "siteType" ? null : "siteType")}>
                        <span>Site Type</span>
                        <Filter className={`w-3 h-3 ${columnFilters.siteType?.length ? "text-indigo-600 font-bold" : "text-slate-400"}`} />
                      </div>
                      {activeFilterKey === "siteType" && (
                        <HeaderFilter
                          filterKey="Site Type"
                          options={getUniqueOptions("siteType")}
                          selectedValues={columnFilters.siteType}
                          onChange={(vals) => setColumnFilters({ ...columnFilters, siteType: vals })}
                          onClose={() => setActiveFilterKey(null)}
                        />
                      )}
                    </th>
                  )}

                  {/* 6. Deployment / Guards */}
                  {visibleColumns.deploymentInfo && (
                    <th className="py-3.5 px-3.5 min-w-[150px] relative">
                      <div className="flex items-center gap-1.5 cursor-pointer select-none" onClick={() => setActiveFilterKey(activeFilterKey === "deploymentInfo" ? null : "deploymentInfo")}>
                        <span>Guards / Deployment</span>
                        <Filter className={`w-3 h-3 ${columnFilters.deploymentInfo?.length ? "text-indigo-600 font-bold" : "text-slate-400"}`} />
                      </div>
                      {activeFilterKey === "deploymentInfo" && (
                        <HeaderFilter
                          filterKey="Guards / Deployment"
                          options={getUniqueOptions("deploymentInfo")}
                          selectedValues={columnFilters.deploymentInfo}
                          onChange={(vals) => setColumnFilters({ ...columnFilters, deploymentInfo: vals })}
                          onClose={() => setActiveFilterKey(null)}
                        />
                      )}
                    </th>
                  )}

                  {/* 7. Shifts */}
                  {visibleColumns.shiftsInfo && (
                    <th className="py-3.5 px-3.5 min-w-[160px] relative">
                      <div className="flex items-center gap-1.5 cursor-pointer select-none" onClick={() => setActiveFilterKey(activeFilterKey === "shiftsInfo" ? null : "shiftsInfo")}>
                        <span>Shifts</span>
                        <Filter className={`w-3 h-3 ${columnFilters.shiftsInfo?.length ? "text-indigo-600 font-bold" : "text-slate-400"}`} />
                      </div>
                      {activeFilterKey === "shiftsInfo" && (
                        <HeaderFilter
                          filterKey="Shifts"
                          options={getUniqueOptions("shiftsInfo")}
                          selectedValues={columnFilters.shiftsInfo}
                          onChange={(vals) => setColumnFilters({ ...columnFilters, shiftsInfo: vals })}
                          onClose={() => setActiveFilterKey(null)}
                        />
                      )}
                    </th>
                  )}

                  {/* 8. Guard Contact */}
                  {visibleColumns.guardContact && (
                    <th className="py-3.5 px-3.5 min-w-[210px] relative">
                      <div className="flex items-center gap-1.5 cursor-pointer select-none" onClick={() => setActiveFilterKey(activeFilterKey === "guardContact" ? null : "guardContact")}>
                        <span>Guard Contact</span>
                        <Filter className={`w-3 h-3 ${columnFilters.guardContact?.length ? "text-indigo-600 font-bold" : "text-slate-400"}`} />
                      </div>
                      {activeFilterKey === "guardContact" && (
                        <HeaderFilter
                          filterKey="Guard Contact"
                          options={getUniqueOptions("guardContact")}
                          selectedValues={columnFilters.guardContact}
                          onChange={(vals) => setColumnFilters({ ...columnFilters, guardContact: vals })}
                          onClose={() => setActiveFilterKey(null)}
                        />
                      )}
                    </th>
                  )}

                  {/* 9. Bill No. */}
                  {visibleColumns.billNo && (
                    <th className="py-3.5 px-3.5 min-w-[130px] relative">
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

                  {/* 10. Bill Date */}
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

                  {/* 11. Bill Amount */}
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

                  {/* 12. Payment Status */}
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

                  {/* 13. Payment Timeline */}
                  {visibleColumns.paymentDays && (
                    <th className="py-3.5 px-3.5 min-w-[130px] text-center relative">
                      <div className="flex items-center justify-center gap-1.5 cursor-pointer select-none" onClick={() => setActiveFilterKey(activeFilterKey === "paymentDays" ? null : "paymentDays")}>
                        <span>Payment Timeline</span>
                        <Filter className={`w-3 h-3 ${columnFilters.paymentDays?.length ? "text-indigo-600 font-bold" : "text-slate-400"}`} />
                      </div>
                      {activeFilterKey === "paymentDays" && (
                        <HeaderFilter
                          filterKey="Payment Timeline"
                          options={getUniqueOptions("paymentDays")}
                          selectedValues={columnFilters.paymentDays}
                          onChange={(vals) => setColumnFilters({ ...columnFilters, paymentDays: vals })}
                          onClose={() => setActiveFilterKey(null)}
                          alignRight
                        />
                      )}
                    </th>
                  )}

                  {/* 14. Received Amount */}
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

                  {/* 15. Received Date */}
                  {visibleColumns.receivedDate && (
                    <th className="py-3.5 px-3.5 min-w-[110px] text-center relative">
                      <div className="flex items-center justify-center gap-1.5 cursor-pointer select-none" onClick={() => setActiveFilterKey(activeFilterKey === "receivedDate" ? null : "receivedDate")}>
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

                  {/* 16. Source */}
                  {visibleColumns.source && (
                    <th className="py-3.5 px-3.5 min-w-[100px] text-center relative">
                      <div className="flex items-center justify-center gap-1.5 cursor-pointer select-none" onClick={() => setActiveFilterKey(activeFilterKey === "source" ? null : "source")}>
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

                  {/* 17. Remarks */}
                  {visibleColumns.remarks && (
                    <th className="py-3.5 px-3.5 min-w-[180px] relative">
                      <div className="flex items-center gap-1.5 cursor-pointer select-none" onClick={() => setActiveFilterKey(activeFilterKey === "remarks" ? null : "remarks")}>
                        <span>Remarks</span>
                        <Filter className={`w-3 h-3 ${columnFilters.remarks?.length ? "text-indigo-600 font-bold" : "text-slate-400"}`} />
                      </div>
                      {activeFilterKey === "remarks" && (
                        <HeaderFilter
                          filterKey="Remarks"
                          options={getUniqueOptions("remarks")}
                          selectedValues={columnFilters.remarks}
                          onChange={(vals) => setColumnFilters({ ...columnFilters, remarks: vals })}
                          onClose={() => setActiveFilterKey(null)}
                          alignRight
                        />
                      )}
                    </th>
                  )}

                  {/* 18. Actions */}
                  {visibleColumns.actions && <th className="py-3.5 px-3.5 min-w-[140px] text-center">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                {filteredEntries.map((item, index) => (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-3 text-center text-slate-400 font-mono">{index + 1}</td>

                    {/* 1. Company */}
                    {visibleColumns.company && <td className="py-3.5 px-3.5 font-bold text-slate-900 leading-snug">{item.company}</td>}

                    {/* 2. Bank / NBFC Name */}
                    {visibleColumns.nbfcName && <td className="py-3.5 px-3.5 font-bold text-slate-850 leading-snug">{item.nbfcName || "—"}</td>}

                    {/* 3. Branch */}
                    {visibleColumns.branchName && <td className="py-3.5 px-3.5 text-slate-600 whitespace-nowrap">{item.branchName || "—"}</td>}

                    {/* 4. Site Area */}
                    {visibleColumns.location && <td className="py-3.5 px-3.5 text-slate-700 font-bold whitespace-nowrap">{item.location || "—"}</td>}

                    {/* 5. Site Type */}
                    {visibleColumns.siteType && (
                      <td className="py-3.5 px-3.5 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                          {item.siteType || "Building"}
                        </span>
                      </td>
                    )}

                    {/* 6. Guards / Deployment */}
                    {visibleColumns.deploymentInfo && (
                      <td className="py-3.5 px-3.5 text-xs whitespace-nowrap">
                        {(() => {
                          let count = 0;
                          if (item.guardDetailsJson) {
                            try {
                              const parsed = JSON.parse(item.guardDetailsJson);
                              if (Array.isArray(parsed)) count = parsed.length;
                            } catch (e) { }
                          } else if (item.guardName) {
                            count = 1;
                          } else if (item.totalDailyGuards !== undefined && item.totalDailyGuards !== null) {
                            count = Number(item.totalDailyGuards);
                          }

                          if (count === 0) {
                            return (
                              <span className="text-slate-400 font-medium text-[11px] italic">
                                No guards assigned
                              </span>
                            );
                          }

                          return (
                            <div className="flex flex-col gap-1">
                              <span className="font-bold text-slate-900 font-mono">
                                {count} Guard Shift{count === 1 ? "" : "s"}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  setRosterModalFilterDate("ALL");
                                  setShowRosterDetailsModal({ show: true, item });
                                }}
                                className="text-[10px] font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded flex items-center gap-1 w-fit transition-all shadow-2xs"
                                title="View Day-Wise Guard Deployment & Payment Details"
                              >
                                <Calendar className="w-3 h-3 text-indigo-600" /> View Breakdown
                              </button>
                            </div>
                          );
                        })()}
                      </td>
                    )}

                    {/* 7. Shifts */}
                    {visibleColumns.shiftsInfo && (
                      <td className="py-3.5 px-3.5 text-xs whitespace-nowrap">
                        {item.shiftHours && item.coverageHours ? (
                          <>
                            <div className="font-bold text-indigo-700">
                              {item.shiftHours}h Shift ({item.coverageHours}h Coverage)
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono">
                              ₹{item.shiftRate || 0}/shift {item.allowancePerShift ? `(+₹${item.allowancePerShift} All.)` : ""}
                            </div>
                          </>
                        ) : (
                          <span className="text-slate-400 font-normal">—</span>
                        )}
                      </td>
                    )}

                    {/* 8. Guard Contact */}
                    {visibleColumns.guardContact && (
                      <td className="py-2.5 px-3 text-xs whitespace-nowrap">
                        {(() => {
                          let allGuards: { name: string; phone: string; photoUrl?: string; shiftType?: string; shiftTiming?: string }[] = [];
                          if (item.guardName) {
                            allGuards.push({
                              name: item.guardName,
                              phone: item.guardPhone || "",
                              photoUrl: item.guardPhotoUrl || "",
                              shiftType: item.guardShiftType || "",
                              shiftTiming: item.guardShiftTiming || "",
                            });
                          }
                          if (item.guardDetailsJson) {
                            try {
                              const parsed = JSON.parse(item.guardDetailsJson);
                              if (Array.isArray(parsed)) {
                                parsed.forEach((g: any) => {
                                  if (g && g.name && !allGuards.some((existing) => existing.name === g.name)) {
                                    allGuards.push(g);
                                  }
                                });
                              }
                            } catch (e) { }
                          }

                          if (allGuards.length === 0) return <span className="text-slate-400">—</span>;

                          return (
                            <div className="flex flex-col gap-1.5 max-w-[260px]">
                              {allGuards.map((g, i) => (
                                <div key={i} className="flex flex-col gap-0.5 bg-slate-50/80 p-1.5 rounded-lg border border-slate-200/70">
                                  <div className="flex items-center gap-1.5 text-xs leading-none">
                                    {g.photoUrl ? (
                                      <a href={g.photoUrl} target="_blank" rel="noreferrer" title={`Click to view photo of ${g.name}`}>
                                        <img src={g.photoUrl} alt={g.name} className="w-5 h-5 rounded-full object-cover border border-indigo-200 shadow-2xs shrink-0" />
                                      </a>
                                    ) : (
                                      <div className="w-5 h-5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center justify-center font-bold text-[9px] shrink-0">
                                        {g.name ? g.name.charAt(0).toUpperCase() : "G"}
                                      </div>
                                    )}
                                    <span className="font-bold text-slate-800 truncate">{g.name}</span>
                                    {g.phone && (
                                      <span className="text-[10px] font-mono text-indigo-600 font-bold whitespace-nowrap">
                                        ({g.phone})
                                      </span>
                                    )}
                                  </div>
                                  {(g.shiftType || g.shiftTiming) && (
                                    <div className="text-[9px] font-mono text-purple-700 font-bold pl-6">
                                      ⏰ {g.shiftType || "Shift"} {g.shiftTiming ? `(${g.shiftTiming})` : ""}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          );
                        })()}
                      </td>
                    )}

                    {/* 9. Bill No. */}
                    {visibleColumns.billNo && (
                      <td className="py-3.5 px-3.5 font-bold text-indigo-700 font-mono whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span>{item.billNo || "—"}</span>
                          {item.billInvoiceUrl && (
                            <a
                              href={item.billInvoiceUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-200 px-1.5 py-0.2 rounded hover:underline flex items-center gap-0.5"
                              title="View Bill Copy"
                            >
                              <Receipt className="w-3 h-3" /> Bill
                            </a>
                          )}
                        </div>
                      </td>
                    )}

                    {/* 10. Bill Date */}
                    {visibleColumns.billDate && (
                      <td className="py-3.5 px-3.5 text-slate-600 font-mono whitespace-nowrap">
                        {item.billDate ? item.billDate.split("-").reverse().join("/") : "—"}
                      </td>
                    )}

                    {/* 11. Bill Amount */}
                    {visibleColumns.billAmount && (
                      <td className="py-3.5 px-3.5 text-right font-black text-slate-900 whitespace-nowrap">
                        ₹{Number(item.billAmount || 0).toLocaleString("en-IN")}
                      </td>
                    )}

                    {/* 12. Payment Status */}
                    {visibleColumns.paymentStatus && (
                      <td className="py-3.5 px-3.5 text-center whitespace-nowrap">
                        <div className="flex flex-col items-center gap-0.5">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${item.paymentStatus === "Payment Done"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-rose-50 text-rose-700 border-rose-200"
                              }`}
                          >
                            {item.paymentStatus || "Due"}
                          </span>
                          {item.paymentStatus !== "Due" && item.paymentMethod && (
                            <span className="text-[9px] font-bold text-slate-500 font-mono">
                              ({item.paymentMethod})
                            </span>
                          )}
                        </div>
                      </td>
                    )}

                    {/* 13. Payment Timeline */}
                    {visibleColumns.paymentDays && (
                      <td className="py-3.5 px-3.5 text-center font-mono font-bold text-slate-700 whitespace-nowrap">
                        {item.paymentDays || "—"}
                      </td>
                    )}

                    {/* 14. Received Amount */}
                    {visibleColumns.receivedAmount && (
                      <td className="py-3.5 px-3.5 text-right font-black text-emerald-700 whitespace-nowrap">
                        {Number(item.receivedAmount || 0) > 0 ? (
                          `₹${Number(item.receivedAmount).toLocaleString("en-IN")}`
                        ) : (
                          <span className="text-slate-300 font-normal">—</span>
                        )}
                      </td>
                    )}

                    {/* 15. Received Date */}
                    {visibleColumns.receivedDate && (
                      <td className="py-3.5 px-3.5 text-center text-slate-500 font-mono whitespace-nowrap">
                        {item.receivedDate ? item.receivedDate.split("-").reverse().join("/") : "—"}
                      </td>
                    )}

                    {/* 16. Source */}
                    {visibleColumns.source && (
                      <td className="py-3.5 px-3.5 text-center whitespace-nowrap">
                        <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[10px] font-bold">
                          {item.source || "—"}
                        </span>
                      </td>
                    )}

                    {/* 17. Remarks */}
                    {visibleColumns.remarks && <td className="py-3.5 px-3.5 text-slate-600 max-w-[200px] truncate">{item.remarks || "—"}</td>}

                    {/* 18. Actions */}
                    {visibleColumns.actions && (
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Edit Record */}
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(item)}
                            className="p-2 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-all shadow-2xs"
                            title="Edit Record & Guard Details"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>

                          {/* Log Payment Follow-Up Call */}
                          <button
                            type="button"
                            onClick={() => handleOpenFollowUpModal(item)}
                            className="p-2 text-purple-600 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg transition-all shadow-2xs"
                            title="Log Payment Follow-Up Call"
                          >
                            <PhoneCall className="w-3.5 h-3.5" />
                          </button>

                          {/* Log Received Payment */}
                          <button
                            type="button"
                            onClick={() => handleOpenReceiveModal(item)}
                            className="p-2 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-all shadow-2xs"
                            title="Log Received Payment"
                          >
                            <Banknote className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete Record */}
                          <button
                            type="button"
                            onClick={() => handleDelete(item.id)}
                            className="p-2 text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-all shadow-2xs"
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
      {showModal && mounted && createPortal(
        <div className="fixed inset-0 z-[99999] bg-slate-900/50 backdrop-blur-sm flex justify-center items-center p-3 sm:p-6 overflow-y-auto animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl border border-slate-200 flex flex-col overflow-hidden my-auto max-h-[90vh]">

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

                {/* SECTION 1: BANK & COMPANY DETAILS */}
                <div className="flex items-center gap-2 pb-2 border-b border-indigo-100 text-indigo-900">
                  <Tag className="w-4 h-4 text-indigo-600" />
                  <h3 className="text-xs font-black uppercase tracking-wider font-mono">
                    1. COMPANY &amp; BANK/NBFC DETAILS
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Company */}
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

                  {/* Bank / NBFC Name (from NBFC Master) */}
                  <div>
                    <label className="block text-[10px] uppercase font-black text-slate-500 tracking-wider mb-1">
                      Bank / NBFC Name (Master)
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
                      <option value="">-- Select Bank / NBFC Master --</option>
                      {nbfcsList.map((nbfc: any) => (
                        <option key={nbfc.id} value={nbfc.id}>
                          {nbfc.nbfcName} ({nbfc.nbfcCode || "NBFC"})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Branch (from Branch Master) */}
                  <div>
                    <label className="block text-[10px] uppercase font-black text-slate-500 tracking-wider mb-1">
                      Branch (Master)
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
                        {form.nbfcId ? "-- Select Branch Master --" : "-- Select Bank / NBFC First --"}
                      </option>
                      {filteredBranches.map((br: any) => (
                        <option key={br.id} value={br.id}>
                          {br.branchName} ({br.branchCode || "Branch"})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* SECTION 2: SITE & OFFER DETAILS */}
                <div className="flex items-center gap-2 pt-2 pb-2 border-b border-indigo-100 text-indigo-900">
                  <MapPin className="w-4 h-4 text-indigo-600" />
                  <h3 className="text-xs font-black uppercase tracking-wider font-mono">
                    2. SITE &amp; WORK ORDER / OFFER DETAILS
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Site Location / Area */}
                  <div className="md:col-span-2">
                    <label className="block text-[10px] uppercase font-black text-slate-500 tracking-wider mb-1">
                      Site Name / Area / Jagah Address *
                    </label>
                    <input
                      type="text"
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-[#714B67]"
                      placeholder="e.g. Building Plot #4, Industrial Area, Jaipur"
                      value={form.location}
                      onChange={(e) => setForm({ ...form, location: e.target.value })}
                    />
                  </div>

                  {/* Site Type */}
                  <div>
                    <label className="block text-[10px] uppercase font-black text-slate-500 tracking-wider mb-1">
                      Site Type
                    </label>
                    <select
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-[#714B67]"
                      value={form.siteType}
                      onChange={(e) => setForm({ ...form, siteType: e.target.value, customSiteType: "" })}
                    >
                      {availableSiteOptions.map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                      <option value="Other">➕ Add New (Custom Type)</option>
                    </select>
                    {form.siteType === "Other" && (
                      <input
                        type="text"
                        required
                        autoFocus
                        className="w-full mt-2 bg-white border border-[#714B67] rounded-lg p-2.5 text-xs font-bold text-slate-900 focus:outline-none placeholder:text-slate-400"
                        placeholder="Type custom site type (e.g. Hospital, School, Construction Site)..."
                        value={form.customSiteType}
                        onChange={(e) => setForm({ ...form, customSiteType: e.target.value })}
                      />
                    )}
                  </div>
                </div>

                {/* SECTION 3: TOTAL CALCULATED BILL SUMMARY & GUARD DEPLOYMENT LOGS */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 pb-2 border-b border-indigo-100 text-indigo-900">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-indigo-600" />
                    <h3 className="text-xs font-black uppercase tracking-wider font-mono">
                      3. BILL SUMMARY &amp; MONTHLY GUARD LOGS
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    {dailyRosterList.length > 0 && (
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] font-bold text-slate-500 font-mono">Filter</span>
                        <select
                          className="bg-white border border-indigo-200 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-800 focus:outline-none shadow-2xs cursor-pointer"
                          value={selectedRosterFilterDate}
                          onChange={(e) => setSelectedRosterFilterDate(e.target.value)}
                        >
                          <option value="ALL">Show All Months</option>
                          {Array.from(new Set(dailyRosterList.map((r) => r.date).filter(Boolean))).map((dateVal) => (
                            <option key={dateVal} value={dateVal}>
                              📅 {formatMonthStr(dateVal, dailyRosterList.find((r) => r.date === dateVal)?.endDate)} Log
                            </option>
                          ))}
                          <option value="NONE">🙈 Hide All Shift</option>
                        </select>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => handleAddRosterRow()}
                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-black flex items-center gap-1.5 shadow transition-all"
                    >
                      <Plus className="w-4 h-4" /> Add Monthly Guard Shift
                    </button>
                  </div>
                </div>

                {/* Summary KPI Cards & Interactive Day Roster Cards */}
                <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-4 space-y-4">
                  {/* KPI Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="bg-white border border-slate-200 p-3 rounded-lg shadow-2xs">
                      <span className="text-[10px] text-slate-500 uppercase font-black block tracking-wider">Active Months Recorded</span>
                      <span className="text-sm font-bold text-slate-900 mt-0.5 block">{computedShiftDetails.days} {computedShiftDetails.days === 1 ? "Month" : "Months"}</span>
                    </div>
                    <div className="bg-white border border-slate-200 p-3 rounded-lg shadow-2xs">
                      <span className="text-[10px] text-slate-500 uppercase font-black block tracking-wider">Total Guard Shifts</span>
                      <span className="text-sm font-bold text-slate-900 mt-0.5 block">{computedShiftDetails.totalGuardsCount} Guards / Shifts</span>
                    </div>
                    <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-lg shadow-2xs">
                      <span className="text-[10px] text-emerald-800 uppercase font-black block tracking-wider">Calculated Grand Total</span>
                      <span className="text-base font-black font-mono text-emerald-700 mt-0.5 block">₹{computedShiftDetails.grandTotalBill.toLocaleString("en-IN")}</span>
                    </div>
                  </div>

                  {/* Editable Guard Shift Cards inside Summary Section */}
                  <div className="space-y-3 pt-2 border-t border-indigo-100">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-black uppercase text-indigo-900 font-mono flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-indigo-700" /> Monthly Guard &amp; Shift Records ({dailyRosterList.length})
                      </span>
                      <div className="flex items-center gap-2">
                        {selectedRosterFilterDate !== "ALL" && selectedRosterFilterDate !== "NONE" && (
                          <button
                            type="button"
                            onClick={() => setSelectedRosterFilterDate("ALL")}
                            className="text-[10px] font-bold text-indigo-600 hover:underline font-mono"
                          >
                            Show All Months
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setSelectedRosterFilterDate(selectedRosterFilterDate === "NONE" ? "ALL" : "NONE")}
                          className="text-[10px] font-bold text-indigo-700 hover:bg-indigo-100 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md font-mono transition-all flex items-center gap-1"
                        >
                          {selectedRosterFilterDate === "NONE" ? "👁️ View Cards" : "🙈 Hide Cards"}
                        </button>
                      </div>
                    </div>

                    {dailyRosterList.length === 0 ? (
                      <div className="bg-white border-2 border-dashed border-slate-200 rounded-xl p-6 text-center space-y-3">
                        <Clock className="w-8 h-8 text-indigo-400 mx-auto opacity-60" />
                        <div>
                          <p className="text-xs font-bold text-slate-700">No Monthly Guard Shift Logs Added Yet</p>
                          <p className="text-[11px] text-slate-500 mt-0.5">Click '+ Add Monthly Guard Shift' above to record monthly guard deployments and calculate total bill.</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleAddRosterRow()}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl shadow transition-all flex items-center gap-1.5 mx-auto"
                        >
                          <Plus className="w-4 h-4" /> Add Monthly Guard Shift Log
                        </button>
                      </div>
                    ) : selectedRosterFilterDate === "NONE" ? (
                      <div className="bg-white border border-slate-200 rounded-xl p-3.5 text-center flex items-center justify-between shadow-2xs">
                        <span className="text-[11px] text-slate-500 font-mono font-medium">
                          🙈 Shift log cards are currently hidden/collapsed.
                        </span>
                        <button
                          type="button"
                          onClick={() => setSelectedRosterFilterDate("ALL")}
                          className="px-3 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-bold transition-all"
                        >
                          👁️ Expand Shift Cards ({dailyRosterList.length})
                        </button>
                      </div>
                    ) : (
                      dailyRosterList
                        .filter((r) => selectedRosterFilterDate === "ALL" || r.date === selectedRosterFilterDate || r.isSaved === false)
                        .map((item) => {
                          const idx = dailyRosterList.indexOf(item);
                          if (item.isSaved) {
                            return (
                              <div key={`roster-row-${idx}`} className="bg-indigo-50/40 border border-slate-200 rounded-xl p-3 flex flex-wrap items-center justify-between gap-2 shadow-2xs">
                                <div className="flex items-center gap-2">
                                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-mono uppercase text-[9px] font-black">
                                    Month #{item.dayNo || idx + 1}
                                  </span>
                                  <span className="text-xs font-bold text-slate-700">
                                    {formatMonthStr(item.date, item.endDate)}: <span className="text-indigo-700">{item.guardName || "No Guard"}</span> - ₹{((Number(item.shiftRate) || 0) + (Number(item.allowancePerShift) || 0)).toLocaleString("en-IN")}
                                  </span>
                                </div>
                                <div className="flex items-center gap-3">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const updated = [...dailyRosterList];
                                      updated[idx].isSaved = false;
                                      setDailyRosterList(updated);
                                    }}
                                    className="text-xs font-black text-indigo-600 hover:text-indigo-800 hover:underline"
                                  >
                                    ✏️ Edit
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setDailyRosterList(dailyRosterList.filter((_, i) => i !== idx))}
                                    className="text-xs font-bold text-rose-500 hover:text-rose-700"
                                  >
                                    ✕ Remove
                                  </button>
                                </div>
                              </div>
                            );
                          }
                          return (
                            <div key={`roster-row-${idx}`} className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-3 shadow-2xs hover:border-indigo-200 transition-all">
                              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                                <div className="flex items-center gap-2">
                                  <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 font-black text-[10px] rounded-lg font-mono uppercase">
                                    Month #{item.dayNo || idx + 1}
                                  </span>
                                  {item.date && (
                                    <span className="text-xs font-bold text-slate-600 font-mono">
                                      Range: {formatMonthStr(item.date, item.endDate)}
                                    </span>
                                  )}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setDailyRosterList(dailyRosterList.filter((_, i) => i !== idx))}
                                  className="p-1 text-rose-500 hover:bg-rose-50 rounded font-bold text-xs"
                                  title="Remove Month Record"
                                >
                                  ✕ Remove
                                </button>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                {/* Date / Month Picker */}
                                <div className="space-y-2">
                                  {!(item.startDate && item.endDate) ? (
                                    <div>
                                      <label className="block text-[10px] uppercase font-black text-slate-500 tracking-wider mb-1">
                                        Month *
                                      </label>
                                      <input
                                        type="month"
                                        className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-bold text-slate-900 focus:outline-none"
                                        value={item.date || ""}
                                        onChange={(e) => {
                                          const newDate = e.target.value;
                                          const updated = [...dailyRosterList];
                                          updated[idx].date = newDate;
                                          updated[idx].isSaved = false;
                                          setDailyRosterList(updated);
                                          setSelectedRosterFilterDate(newDate);
                                        }}
                                      />
                                    </div>
                                  ) : (
                                    <div className="grid grid-cols-2 gap-2">
                                      <div>
                                        <label className="block text-[10px] uppercase font-black text-slate-500 tracking-wider mb-1">
                                          From *
                                        </label>
                                        <input
                                          type="date"
                                          className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-bold text-slate-900 focus:outline-none"
                                          value={item.startDate || item.date || ""}
                                          onChange={(e) => {
                                            const newStart = e.target.value;
                                            const updated = [...dailyRosterList];
                                            updated[idx].date = newStart;
                                            updated[idx].startDate = newStart;
                                            updated[idx].isSaved = false;
                                            setDailyRosterList(updated);
                                            setSelectedRosterFilterDate(newStart);
                                          }}
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-[10px] uppercase font-black text-slate-500 tracking-wider mb-1">
                                          To *
                                        </label>
                                        <input
                                          type="date"
                                          className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-bold text-slate-900 focus:outline-none"
                                          value={item.endDate || ""}
                                          onChange={(e) => {
                                            const newEnd = e.target.value;
                                            const updated = [...dailyRosterList];
                                            updated[idx].endDate = newEnd;
                                            updated[idx].isSaved = false;
                                            setDailyRosterList(updated);
                                            if (item.startDate) {
                                              setSelectedRosterFilterDate(item.startDate);
                                            }
                                          }}
                                        />
                                      </div>
                                    </div>
                                  )}

                                  <div className="flex items-center gap-1.5 pt-1">
                                    <input
                                      type="checkbox"
                                      id={`custom-range-toggle-${idx}`}
                                      className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer w-3.5 h-3.5"
                                      checked={!!(item.startDate && item.endDate)}
                                      onChange={(e) => {
                                        const isChecked = e.target.checked;
                                        const updated = [...dailyRosterList];
                                        if (isChecked) {
                                          const today = new Date().toISOString().split("T")[0];
                                          updated[idx].startDate = today;
                                          updated[idx].endDate = today;
                                          updated[idx].date = today;
                                        } else {
                                          const currentMonth = new Date().toISOString().substring(0, 7);
                                          updated[idx].date = currentMonth;
                                          updated[idx].startDate = undefined;
                                          updated[idx].endDate = undefined;
                                        }
                                        updated[idx].isSaved = false;
                                        setDailyRosterList(updated);
                                      }}
                                    />
                                    <label
                                      htmlFor={`custom-range-toggle-${idx}`}
                                      className="text-[10px] font-bold text-slate-500 uppercase cursor-pointer tracking-wide select-none"
                                    >
                                      📆 Select Custom Date Range
                                    </label>
                                  </div>
                                </div>

                                {/* Guard Name & Photo Upload */}
                                <div className="md:col-span-2">
                                  <div className="flex justify-between items-center mb-1">
                                    <label className="block text-[10px] uppercase font-black text-slate-500 tracking-wider flex items-center gap-1">
                                      Guard Deployed *
                                    </label>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setAddGuardForRosterIdx(idx);
                                        setShowAddGuardModal(true);
                                      }}
                                      className="text-[10px] font-bold text-indigo-600 hover:underline flex items-center gap-0.5"
                                    >
                                      + Add Guard (Master)
                                    </button>
                                  </div>
                                  <div className="flex gap-2 items-center">
                                    {/* Guard Photo Avatar & Camera Upload Button */}
                                    {(() => {
                                      const found = dbGuards.find((g: any) => g.name === item.guardName);
                                      const photo = item.guardPhotoUrl || (found ? found.photoUrl : null);
                                      return (
                                        <div className="relative group shrink-0" title="Click camera to upload/change guard photo">
                                          {photo ? (
                                            <img
                                              src={photo}
                                              alt={item.guardName || "Guard"}
                                              className="w-9 h-9 rounded-full object-cover border-2 border-indigo-200 shadow-2xs"
                                              onError={(e) => {
                                                (e.target as HTMLElement).style.display = "none";
                                              }}
                                            />
                                          ) : (
                                            <div className="w-9 h-9 rounded-full bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-400">
                                              <User className="w-4.5 h-4.5" />
                                            </div>
                                          )}
                                          <label className="absolute -bottom-1 -right-1 bg-indigo-600 hover:bg-indigo-700 text-white p-1 rounded-full shadow cursor-pointer transition-transform hover:scale-110 flex items-center justify-center">
                                            <Camera className="w-2.5 h-2.5" />
                                            <input
                                              type="file"
                                              accept="image/*"
                                              className="hidden"
                                              onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) {
                                                  const reader = new FileReader();
                                                  reader.onloadend = async () => {
                                                    const photoBase64 = reader.result as string;
                                                    const updated = [...dailyRosterList];
                                                    updated[idx].guardPhotoUrl = photoBase64;
                                                    setDailyRosterList(updated);
                                                    if (item.guardName) {
                                                      setDbGuards((prev: any) =>
                                                        prev.map((g: any) => (g.name === item.guardName ? { ...g, photoUrl: photoBase64 } : g))
                                                      );
                                                      // Save photo directly to DB Master
                                                      try {
                                                        await fetch("/api/legal-recovery/guards", {
                                                          method: "POST",
                                                          headers: { "Content-Type": "application/json" },
                                                          body: JSON.stringify({
                                                            name: item.guardName.trim(),
                                                            phone: item.guardPhone || "",
                                                            photoUrl: photoBase64,
                                                          }),
                                                        });
                                                        await fetchDbGuards();
                                                        triggerToast(`📷 Guard Photo updated & saved to DB for ${item.guardName}!`);
                                                      } catch (err) {
                                                        triggerToast(`📷 Photo updated for ${item.guardName}`);
                                                      }
                                                    } else {
                                                      triggerToast(`📷 Guard Photo uploaded!`);
                                                    }
                                                  };
                                                  reader.readAsDataURL(file);
                                                }
                                              }}
                                            />
                                          </label>
                                        </div>
                                      );
                                    })()}

                                    {/* Guard Select Dropdown */}
                                    <select
                                      className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-bold text-slate-900 focus:outline-none"
                                      value={item.guardName || ""}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        if (val === "__ADD_NEW_GUARD__") {
                                          setAddGuardForRosterIdx(idx);
                                          setShowAddGuardModal(true);
                                          return;
                                        }
                                        if (val && item.date && item.shiftType) {
                                          const isDup = dailyRosterList.some((r, i) => i !== idx && r.date === item.date && r.shiftType === item.shiftType && r.guardName?.trim().toLowerCase() === val.trim().toLowerCase());
                                          if (isDup) {
                                            triggerToast(`⚠️ Guard "${val}" is already assigned to ${formatMonthStr(item.date)} for ${item.shiftType}! Duplicate not allowed.`);
                                            return;
                                          }
                                        }
                                        const found = dbGuards.find((g: any) => g.name === val);
                                        const updated = [...dailyRosterList];
                                        updated[idx].guardName = val;
                                        updated[idx].guardPhone = found ? (found.phone || "") : "";
                                        if (found && found.photoUrl) {
                                          updated[idx].guardPhotoUrl = found.photoUrl;
                                        }
                                        setDailyRosterList(updated);
                                      }}
                                    >
                                      <option value="">-- Select Guard --</option>
                                      {dbGuards.map((g: any) => (
                                        <option key={g.id || g.name} value={g.name}>
                                          {g.name} {g.phone ? `(${g.phone})` : ""}
                                        </option>
                                      ))}
                                      <option value="__ADD_NEW_GUARD__">➕ Add New Guard (to DB Master)...</option>
                                    </select>
                                  </div>
                                </div>
                              </div>

                              {/* Row 2: Shift Type & Shift Time / Timing */}
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-slate-100">
                                {/* Shift Type */}
                                <div>
                                  <label className="block text-[10px] uppercase font-black text-slate-500 tracking-wider mb-1">
                                    Shift Type *
                                  </label>
                                  <select
                                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-bold text-slate-900 focus:outline-none"
                                    value={
                                      STANDARD_SHIFTS.includes(item.shiftType)
                                        ? item.shiftType
                                        : "__CUSTOM_SHIFT__"
                                    }
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      const updated = [...dailyRosterList];
                                      if (val === "__CUSTOM_SHIFT__") {
                                        updated[idx].shiftType = "Custom Shift";
                                      } else {
                                        if (item.guardName && item.date) {
                                          const isDup = dailyRosterList.some((r, i) => i !== idx && r.date === item.date && r.shiftType === val && r.guardName?.trim().toLowerCase() === item.guardName?.trim().toLowerCase());
                                          if (isDup) {
                                            triggerToast(`⚠️ Guard "${item.guardName}" is already assigned to ${formatMonthStr(item.date)} for ${val}!`);
                                            return;
                                          }
                                        }
                                        updated[idx].shiftType = val;
                                      }
                                      setDailyRosterList(updated);
                                    }}
                                  >
                                    <option value="12 Hours Day Shift">12 Hours Day Shift</option>
                                    <option value="12 Hours Night Shift">12 Hours Night Shift</option>
                                    <option value="24 Hours Shift">24 Hours Shift</option>
                                    <option value="8 Hours Morning Shift">8 Hours Morning Shift</option>
                                    <option value="8 Hours Evening Shift">8 Hours Evening Shift</option>
                                    <option value="8 Hours Night Shift">8 Hours Night Shift</option>
                                    <option value="__CUSTOM_SHIFT__">✏️ Custom Shift Type...</option>
                                  </select>

                                  {(!STANDARD_SHIFTS.includes(item.shiftType) || item.shiftType === "Custom Shift") && (
                                    <input
                                      type="text"
                                      placeholder="Type Custom Shift Name (e.g. 6 Hours Special Shift)"
                                      className="mt-1.5 w-full bg-amber-50 border border-amber-300 rounded-lg p-2 text-xs font-bold text-amber-900 focus:outline-none placeholder:font-normal placeholder:text-amber-500"
                                      value={item.shiftType || ""}
                                      onChange={(e) => {
                                        const updated = [...dailyRosterList];
                                        updated[idx].shiftType = e.target.value;
                                        setDailyRosterList(updated);
                                      }}
                                    />
                                  )}
                                </div>

                                {/* Shift Time / Timing */}
                                <div>
                                  <label className="block text-[10px] uppercase font-black text-slate-500 tracking-wider mb-1">
                                    Shift Time / Timing
                                  </label>
                                  <select
                                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-bold text-slate-900 focus:outline-none"
                                    value={
                                      !item.shiftTiming
                                        ? ""
                                        : STANDARD_TIMINGS.includes(item.shiftTiming)
                                          ? item.shiftTiming
                                          : "__CUSTOM_TIMING__"
                                    }
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      const updated = [...dailyRosterList];
                                      if (val === "__CUSTOM_TIMING__") {
                                        updated[idx].shiftTiming = "08:00 AM - 05:00 PM";
                                      } else {
                                        updated[idx].shiftTiming = val;
                                      }
                                      setDailyRosterList(updated);
                                    }}
                                  >
                                    <option value="">-- Select Shift Time --</option>
                                    <option value="08:00 AM - 08:00 PM">08:00 AM - 08:00 PM (12h Day)</option>
                                    <option value="08:00 PM - 08:00 AM">08:00 PM - 08:00 AM (12h Night)</option>
                                    <option value="08:00 AM - 04:00 PM">08:00 AM - 04:00 PM (8h Morning)</option>
                                    <option value="04:00 PM - 12:00 AM">04:00 PM - 12:00 AM (8h Evening)</option>
                                    <option value="12:00 AM - 08:00 AM">12:00 AM - 08:00 AM (8h Night)</option>
                                    <option value="09:00 AM - 05:00 PM">09:00 AM - 05:00 PM (8h Office)</option>
                                    <option value="10:00 AM - 06:00 PM">10:00 AM - 06:00 PM (8h General)</option>
                                    <option value="06:00 AM - 06:00 PM">06:00 AM - 06:00 PM (12h Morning)</option>
                                    <option value="06:00 PM - 06:00 AM">06:00 PM - 06:00 AM (12h Night)</option>
                                    <option value="24 Hours Full Day">24 Hours Full Day</option>
                                    <option value="__CUSTOM_TIMING__">✏️ Custom Timing...</option>
                                  </select>

                                  {(!STANDARD_TIMINGS.includes(item.shiftTiming || "") && (item.shiftTiming || "") !== "") && (
                                    <input
                                      type="text"
                                      placeholder="Type Custom Timing (e.g. 07:30 AM - 04:30 PM)"
                                      className="mt-1.5 w-full bg-amber-50 border border-amber-300 rounded-lg p-2 text-xs font-bold text-amber-900 focus:outline-none placeholder:font-normal placeholder:text-amber-500 font-mono"
                                      value={item.shiftTiming || ""}
                                      onChange={(e) => {
                                        const updated = [...dailyRosterList];
                                        updated[idx].shiftTiming = e.target.value;
                                        setDailyRosterList(updated);
                                      }}
                                    />
                                  )}
                                </div>

                                {/* Rate per Shift */}
                                <div>
                                  <label className="block text-[10px] uppercase font-black text-slate-500 tracking-wider mb-1">
                                    Rate / Guard / Month (₹)
                                  </label>
                                  <input
                                    type="number"
                                    min="0"
                                    step="any"
                                    placeholder="e.g. 15000"
                                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-bold text-slate-900 focus:outline-none"
                                    value={item.shiftRate === "" || item.shiftRate === undefined ? "" : item.shiftRate}
                                    onChange={(e) => {
                                      const updated = [...dailyRosterList];
                                      updated[idx].shiftRate = e.target.value;
                                      setDailyRosterList(updated);
                                    }}
                                  />
                                </div>
                              </div>

                              {/* Row 3: Allowance & Shift Subtotal */}
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-slate-100">
                                {/* Allowance per Shift */}
                                <div>
                                  <label className="block text-[10px] uppercase font-black text-slate-500 tracking-wider mb-1">
                                    Allowance / Month (₹)
                                  </label>
                                  <input
                                    type="number"
                                    min="0"
                                    step="any"
                                    placeholder="e.g. 1000"
                                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-bold text-slate-900 focus:outline-none"
                                    value={item.allowancePerShift === "" || item.allowancePerShift === undefined ? "" : item.allowancePerShift}
                                    onChange={(e) => {
                                      const updated = [...dailyRosterList];
                                      updated[idx].allowancePerShift = e.target.value;
                                      setDailyRosterList(updated);
                                    }}
                                  />
                                </div>

                                {/* Daily Subtotal */}
                                <div className="md:col-span-2 flex items-center justify-between md:justify-end gap-2 bg-emerald-50/60 p-2.5 rounded-lg border border-emerald-100 self-center">
                                  <span className="text-[10px] font-black uppercase text-emerald-800">Month Total:</span>
                                  <span className="text-sm font-black font-mono text-emerald-700">
                                    ₹{(((Number(item.shiftRate) || 0) + (Number(item.allowancePerShift) || 0)) * Math.max(1, Number(item.guardsCount) || 1)).toLocaleString("en-IN")}
                                  </span>
                                </div>
                              </div>

                              {/* Bottom Controls: Add Another & Save buttons inline */}
                              <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-3">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const sameDate = item.date;
                                    setDailyRosterList((prev) => [
                                      ...prev,
                                      {
                                        dayNo: prev.length + 1,
                                        date: sameDate,
                                        startDate: item.startDate,
                                        endDate: item.endDate,
                                        shiftType: "12 Hours Day Shift",
                                        shiftTiming: "08:00 AM - 08:00 PM",
                                        guardName: "",
                                        guardPhone: "",
                                        shiftRate: item.shiftRate || "",
                                        allowancePerShift: item.allowancePerShift || "",
                                        guardsCount: "1",
                                        isSaved: false,
                                      },
                                    ]);
                                    if (sameDate) setSelectedRosterFilterDate(sameDate);
                                  }}
                                  className="flex items-center justify-center gap-1 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-dashed border-indigo-300 rounded-lg text-[11px] font-bold transition-all"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                  <span>+ Add Another Guard</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    if (!item.guardName) {
                                      triggerToast("⚠️ Please select Guard Deployed!");
                                      return;
                                    }
                                    if (!item.shiftRate) {
                                      triggerToast("⚠️ Please enter Rate / Guard / Month!");
                                      return;
                                    }
                                    const updated = [...dailyRosterList];
                                    updated[idx].isSaved = true;
                                    setDailyRosterList(updated);
                                    triggerToast("✓ Guard details saved successfully!");
                                  }}
                                  className="flex items-center justify-center gap-1 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-black shadow transition-all"
                                >
                                  <span>✓ Save Guard Log</span>
                                </button>
                              </div>
                            </div>
                          );
                        })
                    )}
                  </div>
                </div>

                {/* SECTION 5: PAYMENT STATUS & REMARKS */}
                <div className="flex items-center gap-2 pt-2 pb-2 border-b border-indigo-100 text-indigo-900">
                  <DollarSign className="w-4 h-4 text-indigo-600" />
                  <h3 className="text-xs font-black uppercase tracking-wider font-mono">
                    5. PAYMENT STATUS &amp; REMARKS
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {/* Payment Date */}
                  <DatePickerInput
                    label="Payment Date"
                    value={form.receivedDate}
                    onChange={(val) => setForm({ ...form, receivedDate: val })}
                    placeholder="DD/MM/YYYY"
                  />

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

                  {/* Payment Method (Shown when Payment Done) */}
                  {form.paymentStatus !== "Due" && (
                    <div>
                      <label className="block text-[10px] uppercase font-black text-slate-500 tracking-wider mb-1">
                        Payment Method
                      </label>
                      <select
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-emerald-600"
                        value={form.paymentMethod}
                        onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}
                      >
                        <option value="Bank Transfer (NEFT/RTGS)">Bank Transfer (NEFT/RTGS)</option>
                        <option value="UPI / QR Code">UPI / QR Code</option>
                        <option value="Cheque">Cheque</option>
                        <option value="Cash">Cash</option>
                        <option value="Demand Draft (DD)">Demand Draft (DD)</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  )}

                  {/* Source */}
                  <div>
                    <label className="block text-[10px] uppercase font-black text-slate-500 tracking-wider mb-1">
                      Source
                    </label>
                    <select
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-[#714B67]"
                      value={form.source}
                      onChange={(e) => setForm({ ...form, source: e.target.value })}
                    >
                      <option value="">-- Select Source --</option>
                      <option value="BDA">BDA</option>
                      <option value="Direct">Direct</option>
                      <option value="Reference">Reference</option>
                      <option value="Agent">Agent</option>
                      <option value="Tender">Tender</option>
                      <option value="Online">Online</option>
                      <option value="Walk-In">Walk-In</option>
                    </select>
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
              <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
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
        </div>,
        document.body
      )}

      {/* ── Add New Company Sub-Modal ── */}
      {showAddCompanyModal && mounted && createPortal(
        <div className="fixed inset-0 z-[99999] backdrop-blur-md bg-slate-900/50 flex items-center justify-center p-4">
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
        </div>,
        document.body
      )}

      {/* ── Quick Add New Guard Modal ── */}
      {showAddGuardModal && mounted && createPortal(
        <div className="fixed inset-0 z-[999999] backdrop-blur-md bg-slate-900/60 flex items-center justify-center p-4 font-sans">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-slate-200 space-y-4 animate-scale-in">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100">
              <h3 className="font-black text-slate-900 text-sm flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-indigo-600" /> Add New Guard to DB
              </h3>
              <button onClick={() => { setShowAddGuardModal(false); setAddGuardForCard(null); setAddGuardForRosterIdx(null); }} className="text-slate-400 hover:text-slate-700 font-bold">✕</button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] uppercase font-black text-slate-500 tracking-wider mb-1">Guard Name *</label>
                <input
                  type="text"
                  autoFocus
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-500"
                  placeholder="e.g. Ramesh Kumar"
                  value={newGuardForm.name}
                  onChange={(e) => setNewGuardForm({ ...newGuardForm, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-black text-slate-500 tracking-wider mb-1">Guard Phone Number</label>
                <input
                  type="text"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-500 font-mono"
                  placeholder="e.g. 9876543210"
                  value={newGuardForm.phone}
                  onChange={(e) => setNewGuardForm({ ...newGuardForm, phone: e.target.value })}
                />
              </div>

              {/* Guard Photo / Image Upload */}
              <div>
                <label className="block text-[10px] uppercase font-black text-slate-500 tracking-wider mb-1">
                  Guard Photo / Image
                </label>
                <div className="flex items-center gap-3 bg-slate-50 p-2.5 border border-slate-300 rounded-lg">
                  {newGuardForm.photoUrl ? (
                    <img
                      src={newGuardForm.photoUrl}
                      alt="Guard Preview"
                      className="w-10 h-10 rounded-full object-cover border-2 border-indigo-300 shrink-0 shadow-2xs"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-400 text-sm font-bold shrink-0">
                      <User className="w-5 h-5" />
                    </div>
                  )}
                  <div className="flex flex-col gap-1">
                    <label className="cursor-pointer px-2.5 py-1 bg-white hover:bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-lg text-[11px] font-bold flex items-center gap-1.5 w-fit shadow-2xs transition-all">
                      <Upload className="w-3 h-3 text-indigo-600" />
                      <span>{newGuardForm.photoUrl ? "Change Photo" : "Upload Guard Photo"}</span>
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={handleGuardPhotoUpload}
                      />
                    </label>
                    <span className="text-[9px] text-slate-400 font-medium">JPG, PNG or WEBP (Max 5MB)</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => { setShowAddGuardModal(false); setAddGuardForCard(null); setAddGuardForRosterIdx(null); }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={savingGuard}
                onClick={handleAddNewGuard}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow disabled:opacity-50"
              >
                {savingGuard ? "Saving..." : "Save Guard to DB"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── Separate Log Received Payment Modal (From Table Actions) ── */}
      {showReceiveModal.show && showReceiveModal.item && mounted && createPortal(
        <div className="fixed inset-0 z-[99999] backdrop-blur-md bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl border border-slate-200 overflow-hidden animate-scale-in my-auto">
            {/* Header */}
            <div className="px-6 py-4 bg-emerald-50 border-b border-emerald-100 flex justify-between items-center">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
                  <Banknote className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-sm">Log Received Payment</h3>
                  <p className="text-[11px] font-bold text-emerald-800">
                    {showReceiveModal.item.nbfcName || showReceiveModal.item.company} | Branch: {showReceiveModal.item.branchName || "General"} | Bill: {showReceiveModal.item.billNo || "No Bill"}
                  </p>
                </div>
              </div>
              <button onClick={() => setShowReceiveModal({ show: false, item: null })} className="text-slate-400 hover:text-slate-700 font-bold">
                ✕
              </button>
            </div>

            {/* Bill Summary Card */}
            <div className="bg-slate-50 px-6 py-3 border-b border-slate-200/80 grid grid-cols-3 gap-2 text-center text-xs">
              <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-2xs">
                <span className="text-[9px] text-slate-500 uppercase font-black block">Total Bill Amount</span>
                <span className="font-black text-slate-800 font-mono text-sm">₹{Number(showReceiveModal.item.billAmount || 0).toLocaleString("en-IN")}</span>
              </div>
              <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-2xs">
                <span className="text-[9px] text-slate-500 uppercase font-black block">Already Received</span>
                <span className="font-black text-emerald-700 font-mono text-sm">₹{Number(showReceiveModal.item.receivedAmount || 0).toLocaleString("en-IN")}</span>
              </div>
              <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-2xs">
                <span className="text-[9px] text-slate-500 uppercase font-black block">Pending Balance</span>
                {(() => {
                  const pending = Math.max(0, Number(showReceiveModal.item.billAmount || 0) - Number(showReceiveModal.item.receivedAmount || 0));
                  return (
                    <span className="font-black text-rose-700 font-mono text-sm">
                      ₹{pending.toLocaleString("en-IN")}
                    </span>
                  );
                })()}
              </div>
            </div>

            {/* Form */}
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

              {/* Payment Method / Mode & Dynamic Mode Details */}
              <div className="space-y-3 bg-emerald-50/40 p-4 border border-emerald-100 rounded-xl">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Payment Method / Mode */}
                  <div>
                    <label className="block text-[10px] uppercase font-black text-slate-600 tracking-wider mb-1">
                      Payment Method / Mode *
                    </label>
                    <select
                      className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-emerald-500 font-bold"
                      value={receiveForm.paymentMethod}
                      onChange={(e) => setReceiveForm({ ...receiveForm, paymentMethod: e.target.value })}
                    >
                      <option value="Bank Transfer (NEFT/RTGS)">Bank Transfer (NEFT/RTGS)</option>
                      <option value="UPI / QR Code">UPI / QR Code</option>
                      <option value="Cheque">Cheque</option>
                      <option value="Cash">Cash</option>
                      <option value="Demand Draft (DD)">Demand Draft (DD)</option>
                      <option value="Credit / Debit Card">Credit / Debit Card</option>
                      <option value="Other">➕ Other (Specify Custom Method)</option>
                    </select>
                  </div>

                  {/* If "Other" selected -> Custom Method Input */}
                  {receiveForm.paymentMethod === "Other" && (
                    <div>
                      <label className="block text-[10px] uppercase font-black text-emerald-800 tracking-wider mb-1">
                        Specify Custom Payment Method *
                      </label>
                      <input
                        type="text"
                        required
                        autoFocus
                        className="w-full bg-white border border-emerald-600 rounded-lg p-2.5 text-xs font-bold text-slate-900 focus:outline-none placeholder:text-slate-400"
                        placeholder="e.g. Wallet, Crypto, Adjustment, Voucher..."
                        value={receiveForm.customPaymentMethod}
                        onChange={(e) => setReceiveForm({ ...receiveForm, customPaymentMethod: e.target.value })}
                      />
                    </div>
                  )}
                </div>

                {/* DYNAMIC FIELD LAYOUT BASED ON PAYMENT MODE */}
                {/* 1. Bank Transfer */}
                {receiveForm.paymentMethod === "Bank Transfer (NEFT/RTGS)" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-[10px] uppercase font-black text-slate-500 tracking-wider mb-1">
                        UTR / Transaction Ref No. *
                      </label>
                      <input
                        type="text"
                        required
                        className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-emerald-500"
                        placeholder="e.g. UTR129381923"
                        value={receiveForm.transactionId}
                        onChange={(e) => setReceiveForm({ ...receiveForm, transactionId: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-black text-slate-500 tracking-wider mb-1">
                        Sender Bank Name
                      </label>
                      <input
                        type="text"
                        className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-emerald-500"
                        placeholder="e.g. HDFC Bank / SBI"
                        value={receiveForm.bankName}
                        onChange={(e) => setReceiveForm({ ...receiveForm, bankName: e.target.value })}
                      />
                    </div>
                  </div>
                )}

                {/* 2. UPI / QR Code */}
                {receiveForm.paymentMethod === "UPI / QR Code" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-[10px] uppercase font-black text-slate-500 tracking-wider mb-1">
                        UPI Ref / UTR No. *
                      </label>
                      <input
                        type="text"
                        required
                        className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-emerald-500"
                        placeholder="e.g. 419283019283"
                        value={receiveForm.transactionId}
                        onChange={(e) => setReceiveForm({ ...receiveForm, transactionId: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-black text-slate-500 tracking-wider mb-1">
                        UPI App / VPA ID
                      </label>
                      <input
                        type="text"
                        className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-emerald-500"
                        placeholder="e.g. PhonePe / Google Pay / user@upi"
                        value={receiveForm.payerName}
                        onChange={(e) => setReceiveForm({ ...receiveForm, payerName: e.target.value })}
                      />
                    </div>
                  </div>
                )}

                {/* 3. Cheque */}
                {receiveForm.paymentMethod === "Cheque" && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                    <div>
                      <label className="block text-[10px] uppercase font-black text-slate-500 tracking-wider mb-1">
                        Cheque Number *
                      </label>
                      <input
                        type="text"
                        required
                        className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-emerald-500"
                        placeholder="e.g. CHQ-819203"
                        value={receiveForm.transactionId}
                        onChange={(e) => setReceiveForm({ ...receiveForm, transactionId: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-black text-slate-500 tracking-wider mb-1">
                        Issuing Bank Name
                      </label>
                      <input
                        type="text"
                        className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-emerald-500"
                        placeholder="e.g. ICICI Bank"
                        value={receiveForm.bankName}
                        onChange={(e) => setReceiveForm({ ...receiveForm, bankName: e.target.value })}
                      />
                    </div>
                    <div>
                      <DatePickerInput
                        label="Cheque Date"
                        value={receiveForm.chequeDate}
                        onChange={(val) => setReceiveForm({ ...receiveForm, chequeDate: val })}
                        placeholder="DD/MM/YYYY"
                      />
                    </div>
                  </div>
                )}

                {/* 4. Cash */}
                {receiveForm.paymentMethod === "Cash" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-[10px] uppercase font-black text-slate-500 tracking-wider mb-1">
                        Cash Receipt / Slip No.
                      </label>
                      <input
                        type="text"
                        className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-emerald-500"
                        placeholder="e.g. RCP-10293"
                        value={receiveForm.transactionId}
                        onChange={(e) => setReceiveForm({ ...receiveForm, transactionId: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-black text-slate-500 tracking-wider mb-1">
                        Handed Over By / Collector
                      </label>
                      <input
                        type="text"
                        className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-emerald-500"
                        placeholder="e.g. Ramesh Kumar (Agent)"
                        value={receiveForm.payerName}
                        onChange={(e) => setReceiveForm({ ...receiveForm, payerName: e.target.value })}
                      />
                    </div>
                  </div>
                )}

                {/* 5. Demand Draft (DD) */}
                {receiveForm.paymentMethod === "Demand Draft (DD)" && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                    <div>
                      <label className="block text-[10px] uppercase font-black text-slate-500 tracking-wider mb-1">
                        DD Number *
                      </label>
                      <input
                        type="text"
                        required
                        className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-emerald-500"
                        placeholder="e.g. DD-991823"
                        value={receiveForm.transactionId}
                        onChange={(e) => setReceiveForm({ ...receiveForm, transactionId: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-black text-slate-500 tracking-wider mb-1">
                        Issuing Bank Name
                      </label>
                      <input
                        type="text"
                        className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-emerald-500"
                        placeholder="e.g. Axis Bank"
                        value={receiveForm.bankName}
                        onChange={(e) => setReceiveForm({ ...receiveForm, bankName: e.target.value })}
                      />
                    </div>
                    <div>
                      <DatePickerInput
                        label="DD Issue Date"
                        value={receiveForm.chequeDate}
                        onChange={(val) => setReceiveForm({ ...receiveForm, chequeDate: val })}
                        placeholder="DD/MM/YYYY"
                      />
                    </div>
                  </div>
                )}

                {/* 6. Credit / Debit Card */}
                {receiveForm.paymentMethod === "Credit / Debit Card" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-[10px] uppercase font-black text-slate-500 tracking-wider mb-1">
                        Card Ref / Auth Code *
                      </label>
                      <input
                        type="text"
                        required
                        className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-emerald-500"
                        placeholder="e.g. AUTH-881920"
                        value={receiveForm.transactionId}
                        onChange={(e) => setReceiveForm({ ...receiveForm, transactionId: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-black text-slate-500 tracking-wider mb-1">
                        Card Type / Last 4 Digits
                      </label>
                      <input
                        type="text"
                        className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-emerald-500"
                        placeholder="e.g. HDFC Visa ending 4321"
                        value={receiveForm.payerName}
                        onChange={(e) => setReceiveForm({ ...receiveForm, payerName: e.target.value })}
                      />
                    </div>
                  </div>
                )}

                {/* 7. Other */}
                {receiveForm.paymentMethod === "Other" && (
                  <div className="pt-1">
                    <label className="block text-[10px] uppercase font-black text-slate-500 tracking-wider mb-1">
                      Transaction Ref / Receipt / Details
                    </label>
                    <input
                      type="text"
                      className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-emerald-500"
                      placeholder="e.g. Ref #12345 or transaction details..."
                      value={receiveForm.transactionId}
                      onChange={(e) => setReceiveForm({ ...receiveForm, transactionId: e.target.value })}
                    />
                  </div>
                )}
              </div>

              {/* Payment Proof File Upload */}
              <div>
                <label className="block text-[10px] uppercase font-black text-slate-500 tracking-wider mb-1">
                  Upload Payment Proof / Receipt Copy (Photo / PDF)
                </label>
                <div className="flex items-center gap-3 bg-slate-50 p-2.5 border border-slate-300 rounded-lg">
                  <label className="cursor-pointer px-3.5 py-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs">
                    <Upload className="w-3.5 h-3.5 text-emerald-600" />
                    Choose File
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*,application/pdf"
                      onChange={(e) => setReceiveProofFile(e.target.files?.[0] || null)}
                    />
                  </label>
                  <span className="text-xs text-slate-600 truncate max-w-[240px]">
                    {receiveProofFile ? receiveProofFile.name : "No proof file chosen"}
                  </span>
                </div>
              </div>

              {/* Remarks */}
              <div>
                <label className="block text-[10px] uppercase font-black text-slate-500 tracking-wider mb-1">
                  Payment Remarks / Notes
                </label>
                <textarea
                  rows={2}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-emerald-500 resize-none"
                  placeholder="Additional payment details or UTR notes..."
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
        </div>,
        document.body
      )}

      {/* ── Combined Billing & Payment Management Modal (From Table Actions) ── */}
      {showBillModal.show && showBillModal.item && mounted && createPortal(
        <div className="fixed inset-0 z-[99999] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl border border-slate-200/80 overflow-hidden animate-scale-in my-auto max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="px-6 py-4 bg-slate-50/90 border-b border-slate-200/80 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-50 text-indigo-700 rounded-xl border border-indigo-100">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-sm">Billing &amp; Payment Management</h3>
                  <p className="text-[11px] font-bold text-indigo-600 truncate max-w-[320px]">
                    {showBillModal.item.location} | {showBillModal.item.nbfcName || showBillModal.item.company}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowBillModal({ show: false, item: null })}
                className="w-7 h-7 rounded-full bg-slate-200/70 hover:bg-slate-300/80 text-slate-600 flex items-center justify-center font-bold text-xs transition-all"
              >
                ✕
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form onSubmit={handleBillSubmit} className="p-6 overflow-y-auto space-y-5 flex-1">

              {/* LIVE FINANCIAL CALCULATION WIDGET (ELEGANT LIGHT GRADIENT CARD) */}
              <div className="bg-gradient-to-br from-indigo-50/90 via-purple-50/40 to-slate-50 rounded-2xl p-4.5 border border-indigo-100/90 shadow-sm space-y-3.5">
                <div className="flex justify-between items-center pb-2 border-b border-indigo-100/80 text-[10px] font-mono font-black uppercase tracking-wider text-indigo-900">
                  <span className="flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-indigo-600" />
                    FINANCIAL SUMMARY &amp; G.P. CALCULATOR
                  </span>
                  <span className="text-indigo-600 font-sans normal-case font-bold bg-indigo-100/70 px-2.5 py-0.5 rounded-full text-[10px]">
                    Real-time Calculation
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
                  {/* Billed Amount (with Guard Expense subtext) */}
                  <div className="bg-white/90 p-3 rounded-xl border border-indigo-100/80 shadow-2xs">
                    <p className="text-[10px] uppercase font-bold text-indigo-600">Billed Amount</p>
                    <p className="text-base font-black text-indigo-700 font-mono">
                      ₹{(Number(billForm.billAmount) || Number(showBillModal.item?.billAmount) || 0).toLocaleString("en-IN")}
                    </p>
                    {(() => {
                      const cost = Number(showBillModal.item?.totalGuardCost || 0);
                      const allowance = Number(showBillModal.item?.totalAllowanceCost || 0);
                      const totalExp = cost + allowance;
                      return (
                        <p className="text-[9px] text-slate-500 font-mono mt-0.5">
                          Guard Expense: ₹{totalExp.toLocaleString("en-IN")} (₹{cost.toLocaleString("en-IN")} + ₹{allowance.toLocaleString("en-IN")} All.)
                        </p>
                      );
                    })()}
                  </div>

                  {/* Received Amount */}
                  <div className="bg-white/90 p-3 rounded-xl border border-emerald-100/80 shadow-2xs flex flex-col justify-center">
                    <p className="text-[10px] uppercase font-bold text-emerald-600">Received Amount</p>
                    <p className="text-base font-black text-emerald-700 font-mono">
                      ₹{(Number(billForm.receivedAmount) || 0).toLocaleString("en-IN")}
                    </p>
                  </div>

                  {/* Gross Profit (G.P.) Margin */}
                  <div className="bg-white/90 p-3 rounded-xl border border-purple-100/80 shadow-2xs flex flex-col justify-center">
                    <p className="text-[10px] uppercase font-bold text-purple-600">G.P. Profit Margin</p>
                    {(() => {
                      const billedVal = Number(billForm.billAmount) || Number(showBillModal.item?.billAmount) || 0;
                      const cost = Number(showBillModal.item?.totalGuardCost || 0);
                      const allowance = Number(showBillModal.item?.totalAllowanceCost || 0);
                      const totalGuardExpense = cost + allowance;
                      const gp = billedVal - totalGuardExpense;
                      return (
                        <p className={`text-base font-black font-mono ${gp >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                          {gp >= 0 ? `+₹${gp.toLocaleString("en-IN")}` : `-₹${Math.abs(gp).toLocaleString("en-IN")}`}
                        </p>
                      );
                    })()}
                  </div>
                </div>

                {/* Outstanding Pending Balance Notice (Kitna Bacha) */}
                <div className="pt-2.5 border-t border-indigo-100/80 flex justify-between items-center text-xs">
                  <span className="text-slate-700 font-bold">Outstanding Pending Balance (Baki Bacha):</span>
                  {(() => {
                    const billedVal = Number(billForm.billAmount) || Number(showBillModal.item.billAmount) || 0;
                    const recVal = Number(billForm.receivedAmount) || 0;
                    const pending = Math.max(0, billedVal - recVal);
                    return pending > 0 ? (
                      <span className="bg-rose-100 text-rose-800 border border-rose-200 px-3 py-0.5 rounded-full font-black font-mono text-xs shadow-2xs">
                        ₹{pending.toLocaleString("en-IN")} Due
                      </span>
                    ) : (
                      <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 px-3 py-0.5 rounded-full font-black text-xs shadow-2xs">
                        ✓ Fully Settled
                      </span>
                    );
                  })()}
                </div>
              </div>

              {/* 1. LOG RECEIVED PAYMENT DETAILS (FIRST SECTION) */}
              <div className="flex items-center gap-2 pb-1.5 border-b border-emerald-100 text-emerald-900">
                <Banknote className="w-4 h-4 text-emerald-600" />
                <h4 className="text-xs font-black uppercase tracking-wider font-mono">
                  1. LOG RECEIVED PAYMENT DETAILS
                </h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Received Amount */}
                <div>
                  <label className="block text-[10px] uppercase font-black text-slate-500 tracking-wider mb-1">
                    Received Amount (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-emerald-500"
                    placeholder="Enter collected amount e.g. 15000"
                    value={billForm.receivedAmount}
                    onChange={(e) => setBillForm({ ...billForm, receivedAmount: e.target.value })}
                  />
                </div>

                {/* Received Date */}
                <DatePickerInput
                  label="Received Date"
                  value={billForm.receivedDate}
                  onChange={(val) => setBillForm({ ...billForm, receivedDate: val })}
                  placeholder="DD/MM/YYYY"
                />
              </div>

              {/* 2. BILLING & INVOICE DETAILS (SECOND SECTION) */}
              <div className="flex items-center gap-2 pt-2 pb-1.5 border-b border-indigo-100 text-indigo-900">
                <Receipt className="w-4 h-4 text-indigo-600" />
                <h4 className="text-xs font-black uppercase tracking-wider font-mono">
                  2. BILLING &amp; INVOICE DETAILS
                </h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Bill No */}
                <div>
                  <label className="block text-[10px] uppercase font-black text-slate-500 tracking-wider mb-1">
                    Bill No.
                  </label>
                  <input
                    type="text"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-[#714B67]"
                    placeholder="e.g. BILL-2026-001"
                    value={billForm.billNo}
                    onChange={(e) => setBillForm({ ...billForm, billNo: e.target.value })}
                  />
                </div>

                {/* Bill Date */}
                <DatePickerInput
                  label="Bill Date"
                  value={billForm.billDate}
                  onChange={(val) => setBillForm({ ...billForm, billDate: val })}
                  placeholder="DD/MM/YYYY"
                />

                {/* Bill Amount */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-[10px] uppercase font-black text-slate-500 tracking-wider">
                      Bill Amount (₹)
                    </label>
                    {showBillModal.item && (Number(showBillModal.item?.totalGuardCost || 0) + Number(showBillModal.item?.totalAllowanceCost || 0)) > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          const cost = Number(showBillModal.item?.totalGuardCost || 0);
                          const allowance = Number(showBillModal.item?.totalAllowanceCost || 0);
                          setBillForm({ ...billForm, billAmount: String(cost + allowance) });
                        }}
                        className="text-[9px] font-bold text-indigo-600 hover:underline"
                        title="Copy Total Guard Deployment Expenses (Cost + Allowance)"
                      >
                        Auto-fill Total Expense
                      </button>
                    )}
                  </div>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-[#714B67]"
                    placeholder="0.00"
                    value={billForm.billAmount}
                    onChange={(e) => setBillForm({ ...billForm, billAmount: e.target.value })}
                  />
                </div>

                {/* Payment Timeline */}
                <div>
                  <label className="block text-[10px] uppercase font-black text-slate-500 tracking-wider mb-1">
                    Payment Timeline
                  </label>
                  <input
                    type="text"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-[#714B67]"
                    placeholder="e.g. 30 Days"
                    value={billForm.paymentDays}
                    onChange={(e) => setBillForm({ ...billForm, paymentDays: e.target.value })}
                  />
                </div>

                {/* Upload Bill / Invoice Image / PDF */}
                <div className="sm:col-span-2">
                  <label className="block text-[10px] uppercase font-black text-slate-500 tracking-wider mb-1">
                    Upload Bill / Invoice Copy (Photo / PDF)
                  </label>
                  <div className="flex items-center gap-3 bg-slate-50 p-2.5 border border-slate-300 rounded-lg">
                    <label className="cursor-pointer px-3.5 py-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs">
                      <Upload className="w-3.5 h-3.5 text-indigo-600" />
                      Choose Bill Copy
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*,application/pdf"
                        onChange={(e) => setBillFile(e.target.files?.[0] || null)}
                      />
                    </label>
                    <span className="text-xs text-slate-600 truncate max-w-[240px]">
                      {billFile ? billFile.name : (billForm.billInvoiceUrl ? "✓ Attached Copy" : "No file chosen")}
                    </span>
                    {billForm.billInvoiceUrl && (
                      <a
                        href={billForm.billInvoiceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1 ml-auto"
                      >
                        <Receipt className="w-3.5 h-3.5" /> View Uploaded Bill
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {/* Payment Status & Payment Method */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] uppercase font-black text-slate-500 tracking-wider mb-1">
                    Payment Status
                  </label>
                  <select
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-[#714B67]"
                    value={billForm.paymentStatus}
                    onChange={(e) => setBillForm({ ...billForm, paymentStatus: e.target.value })}
                  >
                    <option value="Due">Due</option>
                    <option value="Partial Payment">Partial Payment</option>
                    <option value="Payment Done">Payment Done</option>
                  </select>
                </div>

                {billForm.paymentStatus !== "Due" && (
                  <div>
                    <label className="block text-[10px] uppercase font-black text-slate-500 tracking-wider mb-1">
                      Payment Method
                    </label>
                    <select
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-emerald-600 font-bold"
                      value={billForm.paymentMethod}
                      onChange={(e) => setBillForm({ ...billForm, paymentMethod: e.target.value })}
                    >
                      <option value="Bank Transfer (NEFT/RTGS)">Bank Transfer (NEFT/RTGS)</option>
                      <option value="UPI / QR Code">UPI / QR Code</option>
                      <option value="Cheque">Cheque</option>
                      <option value="Cash">Cash</option>
                      <option value="Demand Draft (DD)">Demand Draft (DD)</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Remarks */}
              <div>
                <label className="block text-[10px] uppercase font-black text-slate-500 tracking-wider mb-1">
                  Billing &amp; Payment Notes
                </label>
                <textarea
                  rows={2}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-[#714B67] resize-none"
                  placeholder="Enter invoice details, payment receipt UTR, or notes..."
                  value={billForm.remarks}
                  onChange={(e) => setBillForm({ ...billForm, remarks: e.target.value })}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowBillModal({ show: false, item: null })}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingBill}
                  className="px-5 py-2.5 bg-[#714B67] hover:bg-[#5F3F56] text-white rounded-xl text-xs font-black shadow disabled:opacity-50"
                >
                  {submittingBill ? "Saving..." : "Save Billing & Payment"}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ── Log Payment Follow-Up Call Modal ── */}
      {showFollowUpModal.show && showFollowUpModal.item && mounted && createPortal(
        <div className="fixed inset-0 z-[99999] backdrop-blur-md bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-slate-200 overflow-hidden animate-scale-in">
            {/* Header */}
            <div className="px-6 py-4 bg-purple-50 border-b border-purple-100 flex justify-between items-center">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-purple-100 text-purple-700 rounded-lg">
                  <PhoneCall className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-sm">Log Payment Follow Up Call</h3>
                  <p className="text-[10px] font-bold text-purple-800">
                    {showFollowUpModal.item.company} | Bill: {showFollowUpModal.item.billNo || "No Bill"} (Site: {showFollowUpModal.item.location || "N/A"})
                  </p>
                </div>
              </div>
              <button onClick={() => setShowFollowUpModal({ show: false, item: null })} className="text-slate-400 hover:text-slate-700 font-bold">
                ✕
              </button>
            </div>

            {/* Financial Summary Snippet */}
            <div className="bg-slate-50 px-6 py-3 border-b border-slate-200/80 flex justify-between items-center text-xs">
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Billed Amount</span>
                <span className="font-black text-slate-800 font-mono">₹{Number(showFollowUpModal.item.billAmount || 0).toLocaleString("en-IN")}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Received Amount</span>
                <span className="font-black text-emerald-700 font-mono">₹{Number(showFollowUpModal.item.receivedAmount || 0).toLocaleString("en-IN")}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Outstanding Balance</span>
                {(() => {
                  const pending = Math.max(0, Number(showFollowUpModal.item.billAmount || 0) - Number(showFollowUpModal.item.receivedAmount || 0));
                  return (
                    <span className="font-black text-rose-700 font-mono bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                      ₹{pending.toLocaleString("en-IN")}
                    </span>
                  );
                })()}
              </div>
            </div>

            {/* Body Form */}
            <form onSubmit={handleFollowUpSubmit} className="p-6 space-y-4">
              {followUpError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-bold flex items-center justify-between gap-2 animate-shake">
                  <span>⚠️ {followUpError}</span>
                  <button type="button" onClick={() => setFollowUpError("")} className="text-rose-500 hover:text-rose-800">✕</button>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Call Date */}
                <DatePickerInput
                  label="Call Date *"
                  value={followUpForm.callDate}
                  onChange={(val) => setFollowUpForm({ ...followUpForm, callDate: val })}
                  placeholder="DD/MM/YYYY"
                />

                {/* Call Status */}
                <div>
                  <label className="block text-[10px] uppercase font-black text-slate-500 tracking-wider mb-1">
                    Call Status *
                  </label>
                  <select
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-purple-600"
                    value={followUpForm.callStatus}
                    onChange={(e) => setFollowUpForm({ ...followUpForm, callStatus: e.target.value })}
                  >
                    <option value="Connected">Connected</option>
                    <option value="Promise To Pay (PTP)">Promise To Pay (PTP)</option>
                    <option value="Call Back Requested">Call Back Requested</option>
                    <option value="Switched Off / Busy">Switched Off / Busy</option>
                    <option value="Not Reachable">Not Reachable</option>
                    <option value="Meeting Scheduled">Meeting Scheduled</option>
                  </select>
                </div>
              </div>

              {/* Next Follow Up Date & Time */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <DatePickerInput
                  label="Next Follow Up Date"
                  value={followUpForm.nextFollowUpDate}
                  onChange={(val) => setFollowUpForm({ ...followUpForm, nextFollowUpDate: val })}
                  placeholder="DD/MM/YYYY"
                />
                <div>
                  <label className="block text-[10px] uppercase font-black text-slate-500 tracking-wider mb-1">
                    Follow Up Time
                  </label>
                  <input
                    type="time"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-purple-600"
                    value={followUpForm.nextFollowUpTime}
                    onChange={(e) => setFollowUpForm({ ...followUpForm, nextFollowUpTime: e.target.value })}
                  />
                </div>
              </div>

              {/* Conversation Details */}
              <div>
                <label className="block text-[10px] uppercase font-black text-slate-500 tracking-wider mb-1">
                  Conversation Details / Kya Baat Hui *
                </label>
                <textarea
                  rows={3}
                  required
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-purple-600 resize-none"
                  placeholder="Enter details of conversation with NBFC / client regarding payment..."
                  value={followUpForm.conversationDetails}
                  onChange={(e) => setFollowUpForm({ ...followUpForm, conversationDetails: e.target.value })}
                />
              </div>

              {/* Upload Recording / Document */}
              <div>
                <label className="block text-[10px] uppercase font-black text-slate-500 tracking-wider mb-1">
                  Upload Call Recording / Document (Optional)
                </label>
                <div className="flex items-center gap-3 bg-slate-50 p-2.5 border border-slate-300 rounded-lg">
                  <label className="cursor-pointer px-3.5 py-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs">
                    <Upload className="w-3.5 h-3.5 text-purple-600" />
                    Choose File
                    <input
                      type="file"
                      className="hidden"
                      accept="audio/*,video/*,image/*,application/pdf,.mp3,.wav,.mp4,.m4a,.aac,.ogg,.m4v,.mov,.avi,.mkv"
                      onChange={(e) => setFollowUpFile(e.target.files?.[0] || null)}
                    />
                  </label>
                  <span className="text-xs text-slate-600 truncate max-w-[240px]">
                    {followUpFile ? followUpFile.name : "No file chosen"}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowFollowUpModal({ show: false, item: null })}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingFollowUp}
                  className="px-5 py-2.5 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-black shadow disabled:opacity-50"
                >
                  {submittingFollowUp ? "Saving..." : "Save Follow Up"}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ── Dedicated Add New Billing Entry Modal ── */}
      {showAddBillingModal && mounted && createPortal(
        <div className="fixed inset-0 z-[99999] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl border border-slate-200/80 overflow-hidden animate-scale-in my-auto max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-indigo-50/70 border-b border-indigo-100 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-100 text-indigo-700 rounded-xl">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base">Add New Billing Entry</h3>

                </div>
              </div>
              <button
                onClick={() => setShowAddBillingModal(false)}
                className="w-8 h-8 rounded-full bg-slate-200/70 hover:bg-slate-300/80 text-slate-600 flex items-center justify-center font-bold text-sm transition-all"
              >
                ✕
              </button>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleBillingSubmit} className="p-6 overflow-y-auto space-y-6 flex-1">

              {/* 1. COMPANY & BANK/NBFC DETAILS */}
              <div>
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100 text-[#714B67] mb-3">
                  <Tag className="w-4 h-4 text-indigo-600" />
                  <h4 className="text-xs font-black uppercase tracking-wider font-mono">
                    1. COMPANY &amp; DETAILS
                  </h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Company */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-[10px] uppercase font-black text-slate-500 tracking-wider">
                        Company *
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowAddCompanyModal(true)}
                        className="text-[10px] font-bold text-indigo-600 hover:underline"
                      >
                        + Add Company
                      </button>
                    </div>
                    <select
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-[#714B67]"
                      value={billingForm.company}
                      onChange={(e) => setBillingForm({ ...billingForm, company: e.target.value })}
                    >
                      {companiesList.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  {/* Bank / NBFC Master */}
                  <div>
                    <label className="block text-[10px] uppercase font-black text-slate-500 tracking-wider mb-1">
                      Bank / NBFC Name (Master)
                    </label>
                    <select
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-[#714B67]"
                      value={billingForm.nbfcId}
                      onChange={(e) => {
                        const selId = e.target.value;
                        const selObj = nbfcsList.find((n) => String(n.id) === selId);
                        setBillingForm({
                          ...billingForm,
                          nbfcId: selId,
                          nbfcName: selObj ? selObj.nbfcName : "",
                          branchId: "",
                          branchName: "",
                        });
                      }}
                    >
                      <option value="">-- Select Bank / NBFC Master --</option>
                      {nbfcsList.map((nbfc) => (
                        <option key={nbfc.id} value={nbfc.id}>
                          {nbfc.nbfcName} ({nbfc.nbfcCode || "NBFC"})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Branch Master */}
                  <div>
                    <label className="block text-[10px] uppercase font-black text-slate-500 tracking-wider mb-1">
                      Branch (Master)
                    </label>
                    <select
                      disabled={!billingForm.nbfcId}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-[#714B67] disabled:opacity-50"
                      value={billingForm.branchId}
                      onChange={(e) => {
                        const selBranchId = e.target.value;
                        const selBranchObj = nbfcBranchesList.find((b) => String(b.id) === selBranchId);
                        setBillingForm({
                          ...billingForm,
                          branchId: selBranchId,
                          branchName: selBranchObj ? selBranchObj.branchName : "",
                        });
                      }}
                    >
                      <option value="">
                        {!billingForm.nbfcId
                          ? "-- Select Bank / NBFC First --"
                          : "-- Select Branch --"}
                      </option>
                      {nbfcBranchesList
                        .filter((b) => String(b.nbfcId) === String(billingForm.nbfcId))
                        .map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.branchName} ({b.city || "Branch"})
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* 2. SITE & WORK ORDER / BILLING DETAILS */}
              <div>
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100 text-[#714B67] mb-3">
                  <MapPin className="w-4 h-4 text-indigo-600" />
                  <h4 className="text-xs font-black uppercase tracking-wider font-mono">
                    2. SITE &amp; WORK ORDER DETAILS
                  </h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  {/* Site Address */}
                  <div className="md:col-span-2">
                    <label className="block text-[10px] uppercase font-black text-slate-500 tracking-wider mb-1">
                      Site Name / Area Address *
                    </label>
                    <input
                      type="text"
                      required
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-[#714B67]"
                      placeholder="e.g. Building Plot #4, Industrial Area, Jaipur"
                      value={billingForm.location}
                      onChange={(e) => setBillingForm({ ...billingForm, location: e.target.value })}
                    />
                  </div>

                  {/* Site Type */}
                  <div className="md:col-span-1">
                    <label className="block text-[10px] uppercase font-black text-slate-500 tracking-wider mb-1">
                      Site Type
                    </label>
                    <select
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-[#714B67]"
                      value={billingForm.siteType}
                      onChange={(e) => setBillingForm({ ...billingForm, siteType: e.target.value })}
                    >
                      <option value="Building">Building / Commercial Property</option>
                      <option value="Plot">Plot / Open Land</option>
                      <option value="Residential">Residential Property / Flat</option>
                      <option value="Industrial Area">Industrial Area / Factory</option>
                      <option value="Vehicle Seizure">Vehicle Seizure Yard</option>
                      <option value="Other">Other (Custom Site Type)</option>
                    </select>
                  </div>
                </div>

                {billingForm.siteType === "Other" && (
                  <div className="mb-4">
                    <label className="block text-[10px] uppercase font-bold text-rose-600 tracking-wider mb-1">
                      Enter Custom Site Type *
                    </label>
                    <input
                      type="text"
                      required
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-rose-500"
                      placeholder="e.g. Warehouses, Mall, Mining Site, etc."
                      value={billingForm.customSiteType}
                      onChange={(e) => setBillingForm({ ...billingForm, customSiteType: e.target.value })}
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Bill No */}
                  <div>
                    <label className="block text-[10px] uppercase font-black text-slate-500 tracking-wider mb-1">
                      Bill No.
                    </label>
                    <input
                      type="text"
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-[#714B67]"
                      placeholder="e.g. BILL-2026-089"
                      value={billingForm.billNo}
                      onChange={(e) => setBillingForm({ ...billingForm, billNo: e.target.value })}
                    />
                  </div>

                  {/* Bill Date */}
                  <DatePickerInput
                    label="Bill Date"
                    value={billingForm.billDate}
                    onChange={(val) => setBillingForm({ ...billingForm, billDate: val })}
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
                      value={billingForm.billAmount}
                      onChange={(e) => setBillingForm({ ...billingForm, billAmount: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* 3. PAYMENT STATUS, SOURCE & REMARKS */}
              <div>
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100 text-[#714B67] mb-3">
                  <FileText className="w-4 h-4 text-indigo-600" />
                  <h4 className="text-xs font-black uppercase tracking-wider font-mono">
                    3. PAYMENT STATUS, SOURCE &amp; REMARKS
                  </h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  {/* Payment Status */}
                  <div>
                    <label className="block text-[10px] uppercase font-black text-slate-500 tracking-wider mb-1">
                      Payment Status
                    </label>
                    <select
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-[#714B67]"
                      value={billingForm.paymentStatus}
                      onChange={(e) => setBillingForm({ ...billingForm, paymentStatus: e.target.value })}
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
                            onClick={() => setBillingForm({ ...billingForm, source: src })}
                            className={`px-2.5 py-0.5 text-[10px] font-bold rounded border transition-all ${billingForm.source === src
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
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-[#714B67]"
                        placeholder="e.g. BDA or custom source..."
                        value={billingForm.source}
                        onChange={(e) => setBillingForm({ ...billingForm, source: e.target.value })}
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
                    value={billingForm.remarks}
                    onChange={(e) => setBillingForm({ ...billingForm, remarks: e.target.value })}
                  />
                </div>
              </div>

              {/* Fixed Modal Footer */}
              <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowAddBillingModal(false)}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingBilling}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow transition-all disabled:opacity-50"
                >
                  {submittingBilling ? "Saving..." : "Save Billing Entry"}
                </button>
              </div>

            </form>
          </div>
        </div>,
        document.body
      )}

      {/* DAY-WISE GUARD DEPLOYMENT & PAYMENT BREAKDOWN MODAL */}
      {showRosterDetailsModal.show && showRosterDetailsModal.item && createPortal(
        <div className="fixed inset-0 z-[99999] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200 font-sans">
            {/* Modal Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50/80 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-100 text-indigo-700 rounded-xl">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-900 leading-tight">
                    Day-Wise Guard Details
                  </h2>
                  <p className="text-xs text-slate-500 font-medium">
                    {showRosterDetailsModal.item.company} | {showRosterDetailsModal.item.location} ({showRosterDetailsModal.item.siteType || "Building"})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowRosterDetailsModal({ show: false, item: null })}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors font-bold"
              >
                ✕
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-4 text-slate-700">
              {/* Summary Badges Header */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-indigo-50 border border-indigo-100 p-3 rounded-xl">
                  <span className="text-[10px] font-black uppercase text-indigo-700 tracking-wider">Bill / Work Order</span>
                  <span className="text-sm font-bold text-slate-900 mt-0.5 block font-mono">
                    {showRosterDetailsModal.item.billNo || "N/A"}
                  </span>
                </div>
                <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl">
                  <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Bank / NBFC Branch</span>
                  <span className="text-sm font-bold text-slate-900 mt-0.5 block truncate">
                    {showRosterDetailsModal.item.nbfcName} ({showRosterDetailsModal.item.branchName || "Branch"})
                  </span>
                </div>
                <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl">
                  <span className="text-[10px] font-black uppercase text-emerald-800 tracking-wider">Total Bill Amount</span>
                  <span className="text-base font-black text-emerald-700 mt-0.5 block font-mono">
                    ₹{Number(showRosterDetailsModal.item.billAmount || 0).toLocaleString("en-IN")}
                  </span>
                </div>
              </div>

              {/* Roster Logs Table */}
              {(() => {
                let rosterList: any[] = [];
                if (showRosterDetailsModal.item.guardDetailsJson) {
                  try {
                    const parsed = JSON.parse(showRosterDetailsModal.item.guardDetailsJson);
                    if (Array.isArray(parsed)) rosterList = parsed;
                  } catch (e) { }
                }

                if (rosterList.length === 0 && showRosterDetailsModal.item.guardName) {
                  rosterList.push({
                    dayNo: 1,
                    date: showRosterDetailsModal.item.billDate || "—",
                    guardName: showRosterDetailsModal.item.guardName,
                    guardPhone: showRosterDetailsModal.item.guardPhone || "",
                    shiftType: showRosterDetailsModal.item.guardShiftType || "8 Hours Shift",
                    guardsCount: "1",
                    shiftRate: showRosterDetailsModal.item.shiftRate || "0",
                    allowancePerShift: showRosterDetailsModal.item.allowancePerShift || "0",
                  });
                }

                if (rosterList.length === 0) {
                  return (
                    <div className="p-6 text-center border-2 border-dashed border-slate-200 rounded-xl text-slate-500 text-xs">
                      No detailed day-wise roster logs found for this entry.
                    </div>
                  );
                }

                const availableDates = Array.from(new Set(rosterList.map((r) => r.date).filter(Boolean))).sort().reverse();
                const filteredRoster = rosterList.filter(
                  (r) => rosterModalFilterDate === "ALL" || r.date === rosterModalFilterDate
                );

                let totalRosterCost = 0;
                let totalGuardsDeployed = 0;
                const uniqueDates = new Set();

                filteredRoster.forEach((r) => {
                  const count = Math.max(1, Number(r.guardsCount) || 1);
                  const rate = Number(r.shiftRate) || 0;
                  const allowance = Number(r.allowancePerShift) || 0;
                  const daySubtotal = (rate + allowance) * count;
                  totalRosterCost += daySubtotal;
                  totalGuardsDeployed += count;
                  if (r.date) uniqueDates.add(r.date);
                });

                const allDatesCollapsed = availableDates.length > 0 && availableDates.every((d) => collapsedModalDates[d] !== false);

                return (
                  <div className="space-y-3">
                    <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                      <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex flex-wrap justify-between items-center gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black uppercase tracking-wider text-slate-800 font-mono flex items-center gap-1.5">
                            📅 Date-Wise Guards Shift Details
                          </span>
                          {availableDates.length > 1 && rosterModalFilterDate === "ALL" && (
                            <button
                              type="button"
                              onClick={() => {
                                if (allDatesCollapsed) {
                                  // Expand all
                                  const expMap: Record<string, boolean> = {};
                                  availableDates.forEach((d) => { expMap[d] = false; });
                                  setCollapsedModalDates(expMap);
                                } else {
                                  // Collapse all
                                  setCollapsedModalDates({});
                                }
                              }}
                              className="text-[10px] font-bold bg-white hover:bg-slate-100 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-lg transition-all shadow-2xs flex items-center gap-1 font-mono"
                              title="Toggle Expand / Collapse for all date headers"
                            >
                              {allDatesCollapsed ? "📂 Expand All Dates" : "📁 Collapse All Dates"}
                            </button>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          {availableDates.length > 0 && (
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] font-bold text-slate-500 font-mono uppercase">Filter Date:</span>
                              <select
                                className="bg-white border border-indigo-200 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-800 focus:outline-none shadow-2xs cursor-pointer font-mono"
                                value={rosterModalFilterDate}
                                onChange={(e) => setRosterModalFilterDate(e.target.value)}
                              >
                                <option value="ALL">Show All Dates ({rosterList.length} Total)</option>
                                {availableDates.map((dVal: any) => {
                                  const dateEntriesCount = rosterList.filter((r) => r.date === dVal).length;
                                  return (
                                    <option key={dVal} value={dVal}>
                                      📅 {dVal} ({dateEntriesCount} {dateEntriesCount === 1 ? "Entry" : "Entries"})
                                    </option>
                                  );
                                })}
                              </select>
                            </div>
                          )}
                          <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100 font-mono">
                            {filteredRoster.length} {filteredRoster.length === 1 ? "Entry" : "Entries"}
                          </span>
                        </div>
                      </div>

                      {/* Scrollable Container with Max Height */}
                      <div className="overflow-x-auto max-h-[350px] overflow-y-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead className="bg-slate-100 text-[10px] uppercase font-black text-slate-600 border-b border-slate-200 sticky top-0 z-10 shadow-2xs">
                            <tr>
                              <th className="py-2.5 px-3">Date</th>
                              <th className="py-2.5 px-3">Guard Name</th>
                              <th className="py-2.5 px-3">Guard Phone</th>
                              <th className="py-2.5 px-3">Shift Type &amp; Time</th>
                              <th className="py-2.5 px-3 text-center">Guards</th>
                              <th className="py-2.5 px-3 text-right">Rate</th>
                              <th className="py-2.5 px-3 text-right">Allowance</th>
                              <th className="py-2.5 px-3 text-right">Day Payment Total</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-bold text-slate-800">
                            {(() => {
                              let lastRenderedDate = "";
                              return filteredRoster.map((r, i) => {
                                const count = Math.max(1, Number(r.guardsCount) || 1);
                                const rate = Number(r.shiftRate) || 0;
                                const allowance = Number(r.allowancePerShift) || 0;
                                const daySubtotal = (rate + allowance) * count;
                                const currentDate = r.date || showRosterDetailsModal.item.billDate || "—";
                                const isNewDateGroup = rosterModalFilterDate === "ALL" && currentDate !== lastRenderedDate;
                                if (isNewDateGroup) {
                                  lastRenderedDate = currentDate;
                                }

                                // Default to collapsed (true) unless explicitly set to false (expanded)
                                const isCurrentDateCollapsed = Boolean(
                                  rosterModalFilterDate === "ALL" && collapsedModalDates[currentDate] !== false
                                );

                                return (
                                  <React.Fragment key={`rost-modal-${i}`}>
                                    {/* Collapsible Date Header Row */}
                                    {isNewDateGroup && (() => {
                                      const isCollapsed = collapsedModalDates[currentDate] !== false;
                                      const dateGroupEntries = rosterList.filter(
                                        (item) => (item.date || showRosterDetailsModal.item.billDate || "—") === currentDate
                                      );
                                      let dateGroupTotal = 0;
                                      dateGroupEntries.forEach((item) => {
                                        const c = Math.max(1, Number(item.guardsCount) || 1);
                                        const rt = Number(item.shiftRate) || 0;
                                        const al = Number(item.allowancePerShift) || 0;
                                        dateGroupTotal += (rt + al) * c;
                                      });

                                      return (
                                        <tr
                                          onClick={() =>
                                            setCollapsedModalDates((prev) => ({
                                              ...prev,
                                              [currentDate]: prev[currentDate] === false ? true : false,
                                            }))
                                          }
                                          className="bg-indigo-50/90 hover:bg-indigo-100/90 cursor-pointer select-none border-y border-indigo-200/80 transition-all font-mono group"
                                          title={isCollapsed ? "Click to Expand Guard Details" : "Click to Collapse Guard Details"}
                                        >
                                          <td colSpan={8} className="py-2 px-3">
                                            <div className="flex items-center justify-between">
                                              <div className="flex items-center gap-2">
                                                <span className="p-1 rounded bg-white text-indigo-700 border border-indigo-200 shadow-2xs group-hover:scale-105 transition-transform">
                                                  {isCollapsed ? (
                                                    <ChevronRight className="w-3.5 h-3.5" />
                                                  ) : (
                                                    <ChevronDown className="w-3.5 h-3.5" />
                                                  )}
                                                </span>
                                                <span className="text-xs font-black text-indigo-950 uppercase tracking-wider">
                                                  📅 Date: {currentDate}
                                                </span>
                                                <span className="text-[10px] font-bold bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full border border-indigo-200">
                                                  {dateGroupEntries.length} {dateGroupEntries.length === 1 ? "Guard Shift" : "Guard Shifts"}
                                                </span>
                                              </div>

                                              <div className="text-[11px] font-bold text-indigo-900 font-mono">
                                                <span>Day Subtotal: <strong className="text-emerald-700 font-mono font-black text-xs">₹{dateGroupTotal.toLocaleString("en-IN")}</strong></span>
                                              </div>
                                            </div>
                                          </td>
                                        </tr>
                                      );
                                    })()}

                                    {/* Guard Detail Row (Hidden when Date is Collapsed) */}
                                    {!isCurrentDateCollapsed && (
                                      <tr className="hover:bg-slate-50 transition-colors">
                                        <td className="py-2.5 px-3 font-mono text-indigo-700 whitespace-nowrap">
                                          {currentDate}
                                        </td>
                                        <td className="py-2.5 px-3 whitespace-nowrap">{r.guardName || r.name || "—"}</td>
                                        <td className="py-2.5 px-3 whitespace-nowrap text-slate-500 font-mono">{r.guardPhone || r.phone || "—"}</td>
                                        <td className="py-2.5 px-3 whitespace-nowrap">
                                          <div className="text-slate-800 font-bold">{r.shiftType || "—"}</div>
                                          {r.shiftTiming && (
                                            <div className="text-[10px] font-semibold text-indigo-600 font-mono flex items-center gap-1 mt-0.5">
                                              <Clock className="w-3 h-3 text-indigo-400 shrink-0" />
                                              <span>{r.shiftTiming}</span>
                                            </div>
                                          )}
                                        </td>
                                        <td className="py-2.5 px-3 text-center font-mono">{count}</td>
                                        <td className="py-2.5 px-3 text-right font-mono">₹{rate.toLocaleString("en-IN")}</td>
                                        <td className="py-2.5 px-3 text-right font-mono text-slate-500">₹{allowance.toLocaleString("en-IN")}</td>
                                        <td className="py-2.5 px-3 text-right font-mono font-black text-emerald-700">
                                          ₹{daySubtotal.toLocaleString("en-IN")}
                                        </td>
                                      </tr>
                                    )}
                                  </React.Fragment>
                                );
                              });
                            })()}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Bottom Total Summary Bar */}
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
                      <div className="flex items-center gap-6">
                        <div>
                          <span className="text-[10px] text-slate-500 uppercase font-black block tracking-wider">Active Dates</span>
                          <span className="text-base font-bold text-slate-900 font-mono">{uniqueDates.size || 1} {uniqueDates.size === 1 ? "Date" : "Dates"}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 uppercase font-black block tracking-wider">Total Guards Deployed</span>
                          <span className="text-base font-bold text-slate-900 font-mono">{totalGuardsDeployed} Guards</span>
                        </div>
                      </div>
                      <div className="bg-emerald-50 border border-emerald-200 px-4 py-2 rounded-xl text-right">
                        <span className="text-[10px] text-emerald-800 uppercase font-black block tracking-wider">Grand Calculated Total</span>
                        <span className="text-lg font-black font-mono text-emerald-700 block">
                          ₹{totalRosterCost.toLocaleString("en-IN")}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end shrink-0">
              <button
                onClick={() => setShowRosterDetailsModal({ show: false, item: null })}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-black rounded-xl transition-all shadow-2xs"
              >
                Close Window
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ADD NEW GUARD TO DB MASTER MODAL WITH PHOTO UPLOAD */}
      {showAddGuardModal && createPortal(
        <div className="fixed inset-0 z-[99999] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200 font-sans">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-indigo-50/80">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-100 text-indigo-700 rounded-lg">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">Register New Security Guard</h3>
                  <p className="text-[10px] text-slate-500 font-medium">Add Guard details &amp; photo directly to DB Master</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowAddGuardModal(false);
                  setAddGuardForRosterIdx(null);
                }}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddNewGuard} className="p-6 space-y-4">
              {/* Guard Name */}
              <div>
                <label className="block text-[10px] uppercase font-black text-slate-500 tracking-wider mb-1">
                  Guard Full Name *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-600"
                  placeholder="e.g. Ramesh Kumar / Vikram Singh"
                  value={newGuardForm.name}
                  onChange={(e) => setNewGuardForm({ ...newGuardForm, name: e.target.value })}
                />
              </div>

              {/* Guard Phone Number */}
              <div>
                <label className="block text-[10px] uppercase font-black text-slate-500 tracking-wider mb-1">
                  Contact Phone Number
                </label>
                <input
                  type="text"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-600 font-mono"
                  placeholder="e.g. 9876543210"
                  value={newGuardForm.phone}
                  onChange={(e) => setNewGuardForm({ ...newGuardForm, phone: e.target.value })}
                />
              </div>

              {/* Guard Photo / Image Upload */}
              <div>
                <label className="block text-[10px] uppercase font-black text-slate-500 tracking-wider mb-1">
                  Guard Photo / ID Card Image
                </label>
                <div className="flex items-center gap-3 bg-slate-50 p-3 border border-slate-300 rounded-lg">
                  {newGuardForm.photoUrl ? (
                    <img
                      src={newGuardForm.photoUrl}
                      alt="Guard Preview"
                      className="w-12 h-12 rounded-xl object-cover border border-indigo-300 shrink-0 shadow-2xs"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-slate-200 flex items-center justify-center text-slate-400 text-lg shrink-0">
                      👤
                    </div>
                  )}
                  <div className="flex flex-col gap-1">
                    <label className="cursor-pointer px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1.5 w-fit shadow-2xs transition-all">
                      <Upload className="w-3.5 h-3.5 text-indigo-600" />
                      <span>{newGuardForm.photoUrl ? "Change Photo" : "Upload Guard Photo"}</span>
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={handleGuardPhotoUpload}
                      />
                    </label>
                    <span className="text-[10px] text-slate-500">JPG, PNG or WEBP (Max 5MB)</span>
                  </div>
                </div>
              </div>

              {/* Modal Buttons */}
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddGuardModal(false);
                    setAddGuardForRosterIdx(null);
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingGuard}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow transition-all disabled:opacity-50"
                >
                  {savingGuard ? "Saving..." : "Save Guard to DB"}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
