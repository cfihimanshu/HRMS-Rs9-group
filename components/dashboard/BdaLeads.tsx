"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  FileSpreadsheet,
  Upload,
  UserPlus,
  Users,
  User,
  Search,
  Filter,
  CheckSquare,
  Square,
  CheckCircle2,
  Trash2,
  Edit,
  Download,
  AlertCircle,
  Building2,
  Phone,
  Mail,
  MapPin,
  RefreshCw,
  Plus,
  X,
  ChevronRight,
  Briefcase,
  Layers,
  ArrowRight,
  Eye,
  Paperclip,
  FileText,
  Music,
  Mic,
  Volume2,
  PlusCircle,
  DollarSign,
  XCircle,
  ChevronDown,
  ChevronUp,
  Clock,
  History,
  UserCheck,
  Activity,
  Calendar
} from "lucide-react";
import * as XLSX from "xlsx";

interface BdaLeadItem {
  id: number;
  leadId: string;
  name: string;
  phone?: string;
  email?: string;
  companyName?: string;
  city?: string;
  source?: string;
  status: string;
  salesReason?: string;
  assignedTo?: string;
  assignedToName?: string;
  assignedBy?: string;
  assignedAt?: string;
  remarks?: string;
  rawExtraJson?: string;
  convertedServicesJson?: string;
  convertedAmount?: number;
  lostReason?: string;
  attachmentsJson?: string;
  createdAt?: string;
}

interface BdaUserItem {
  id: string;
  name: string;
  role: string;
  email: string;
  department?: string;
}

// Helper to fix audio Data URLs & MIME types for browser HTML5 audio playback (.aac, .m4a, .mp3, etc.)
const fixAudioDataUrl = (url: string, fileName?: string, fileType?: string) => {
  if (!url) return url;
  const ext = (fileName || "").split('.').pop()?.toLowerCase() || '';
  let mime = fileType || '';

  if (ext === 'aac') mime = 'audio/aac';
  else if (ext === 'm4a') mime = 'audio/mp4';
  else if (ext === 'mp3') mime = 'audio/mpeg';
  else if (ext === 'wav') mime = 'audio/wav';
  else if (ext === 'ogg') mime = 'audio/ogg';
  else if (ext === 'webm') mime = 'audio/webm';
  else if (ext === '3gp' || ext === '3gpp') mime = 'audio/3gpp';

  if (url.startsWith("data:") && (url.startsWith("data:application/octet-stream") || url.startsWith("data:;") || (ext === "aac" && !url.startsWith("data:audio/aac")))) {
    return url.replace(/^data:[^;]*/, `data:${mime || "audio/aac"}`);
  }
  return url;
};

interface BdaLeadsProps {
  userRole?: string;
  triggerToast?: (msg: string) => void;
  sessionUser?: any;
}

const parseTaskAttachments = (proofAttachment: any): Array<{ name: string; url: string; type?: string }> => {
  if (!proofAttachment) return [];
  let rawList: any[] = [];
  if (Array.isArray(proofAttachment)) {
    rawList = proofAttachment;
  } else if (typeof proofAttachment === 'string') {
    const trimmed = proofAttachment.trim();
    if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          rawList = parsed;
        } else if (parsed && typeof parsed === 'object') {
          rawList = [parsed];
        }
      } catch (e) {
        rawList = [trimmed];
      }
    } else {
      rawList = [trimmed];
    }
  }

  const map = new Map<string, { name: string; url: string; type?: string }>();
  rawList.forEach(a => {
    if (!a) return;
    const url = typeof a === 'string' ? a : (a.url || a.src || '');
    const name = typeof a === 'string' ? 'Attachment' : (a.name || 'Attachment');
    const type = typeof a === 'string' ? undefined : a.type;
    const key = url.trim() || name.trim();
    if (!key) return;

    if (map.has(key)) {
      const existing = map.get(key)!;
      if (existing.name === 'Attachment' && name !== 'Attachment') {
        map.set(key, { name, url, type });
      }
    } else {
      map.set(key, { name, url, type });
    }
  });

  return Array.from(map.values());
};

const parseTaskProgressNotes = (progressNotes: any): Array<{ id?: string; note: string; createdAt?: string; userName?: string }> => {
  if (!progressNotes) return [];
  if (Array.isArray(progressNotes)) {
    return progressNotes.map(n => typeof n === 'string' ? { note: n } : n);
  }
  if (typeof progressNotes === 'string') {
    const trimmed = progressNotes.trim();
    if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed.map(n => typeof n === 'string' ? { note: n } : n);
        } else if (parsed && typeof parsed === 'object') {
          return [parsed];
        }
      } catch (e) {}
    }
    return [{ note: trimmed }];
  }
  return [];
};

const openBlobInNewTab = (url: string) => {
  if (!url) return;
  if (url.startsWith("data:")) {
    try {
      const arr = url.split(",");
      const mime = arr[0].match(/:(.*?);/)?.[1] || "image/png";
      const bstr = atob(arr[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      const blob = new Blob([u8arr], { type: mime });
      const blobUrl = URL.createObjectURL(blob);
      const newWin = window.open(blobUrl, "_blank");
      if (!newWin) {
        window.location.href = blobUrl;
      }
      return;
    } catch (e) {
      console.error("Error creating blob URL:", e);
    }
  }
  window.open(url, "_blank");
};

export default function BdaLeads({
  userRole = "Employee",
  triggerToast = (msg: string) => alert(msg),
  sessionUser
}: BdaLeadsProps) {
  const [leads, setLeads] = useState<BdaLeadItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [bdas, setBdas] = useState<BdaUserItem[]>([]);

  // Preview Image Lightbox State
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null);

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [assignmentFilter, setAssignmentFilter] = useState("All");

  // Toggle Columns Filter State
  const [showColumnToggleMenu, setShowColumnToggleMenu] = useState(false);
  const columnToggleDropdownRef = useRef<HTMLDivElement>(null);
  const [visibleColumns, setVisibleColumns] = useState<{ [key: string]: boolean }>({
    leadId: true,
    client: true,
    company: true,
    reason: true,
    assignedBda: true,
    status: true,
    actions: true,
  });

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        columnToggleDropdownRef.current &&
        !columnToggleDropdownRef.current.contains(event.target as Node)
      ) {
        setShowColumnToggleMenu(false);
      }
    }
    if (showColumnToggleMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showColumnToggleMenu]);

  // Selection State for Bulk Operations
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // Modals
  const [showImportModal, setShowImportModal] = useState(false);
  const [importStep, setImportStep] = useState<"upload" | "map" | "preview">("upload");
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showBdaBreakdownModal, setShowBdaBreakdownModal] = useState(false);
  const [showStatusUserBreakdownModal, setShowStatusUserBreakdownModal] = useState(false);
  const [targetBreakdownStatus, setTargetBreakdownStatus] = useState<"Converted" | "Lost" | "Assigned">("Converted");
  const [activeLead, setActiveLead] = useState<BdaLeadItem | null>(null);
  const [showAllEmployees, setShowAllEmployees] = useState(false);

  // Expanded Row State for Pipeline & Follow-up History Dropdown
  const [expandedLeadId, setExpandedLeadId] = useState<number | null>(null);
  const [historyDataMap, setHistoryDataMap] = useState<{
    [leadId: number]: { loading: boolean; lead: any; tasks: any[] }
  }>({});

  const toggleRowExpand = async (lead: BdaLeadItem) => {
    if (expandedLeadId === lead.id) {
      setExpandedLeadId(null);
      return;
    }

    setExpandedLeadId(lead.id);

    // Fetch history from API if not already loaded
    if (!historyDataMap[lead.id] || !historyDataMap[lead.id].lead) {
      setHistoryDataMap(prev => ({
        ...prev,
        [lead.id]: { loading: true, lead: null, tasks: [] }
      }));

      try {
        const res = await fetch(`/api/bda-leads/history?id=${lead.id}`);
        const data = await res.json();
        if (data.success) {
          setHistoryDataMap(prev => ({
            ...prev,
            [lead.id]: { loading: false, lead: data.lead, tasks: data.tasks || [] }
          }));
        } else {
          setHistoryDataMap(prev => ({
            ...prev,
            [lead.id]: { loading: false, lead: null, tasks: [] }
          }));
        }
      } catch (err) {
        console.error("Error fetching lead history:", err);
        setHistoryDataMap(prev => ({
          ...prev,
          [lead.id]: { loading: false, lead: null, tasks: [] }
        }));
      }
    }
  };

  // Status Action Modal States (Converted / Lost Popup)
  const [showStatusActionModal, setShowStatusActionModal] = useState(false);
  const [targetStatusLead, setTargetStatusLead] = useState<BdaLeadItem | null>(null);
  const [targetNewStatus, setTargetNewStatus] = useState<"Converted" | "Lost">("Converted");

  // Converted / Lost Form Fields
  const [serviceRows, setServiceRows] = useState<{ serviceName: string; amount: string }[]>([
    { serviceName: "", amount: "" }
  ]);
  const [statusLostReason, setStatusLostReason] = useState("");
  const [statusRemarks, setStatusRemarks] = useState("");
  const [statusAttachments, setStatusAttachments] = useState<{ name: string; type: string; url: string; blobUrl?: string; size?: number }[]>([]);
  const [isSavingStatusModal, setIsSavingStatusModal] = useState(false);
  const statusFileInputRef = useRef<HTMLInputElement | null>(null);

  // Section Edit Toggles for Master Details & Edit Popup
  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [isEditingServices, setIsEditingServices] = useState(false);
  const [isEditingLost, setIsEditingLost] = useState(false);
  const [isEditingAtts, setIsEditingAtts] = useState(false);
  const [isEditingRemarks, setIsEditingRemarks] = useState(false);

  // Dynamic BDA User Filter
  const isBdaUser = (u: any) => {
    const r = (u.role || "").toLowerCase();
    const dep = (u.department || "").toLowerCase();
    const des = (u.designation || "").toLowerCase();
    return (
      r.includes("bda") ||
      r.includes("sales") ||
      r.includes("business development") ||
      dep.includes("sales") ||
      dep.includes("bda") ||
      dep.includes("business development") ||
      des.includes("bda") ||
      des.includes("sales") ||
      des.includes("business development")
    );
  };

  const filteredBdaUsers = bdas.filter(bda => {
    if (showAllEmployees) return true;
    return isBdaUser(bda);
  });

  const finalBdaList = filteredBdaUsers.length > 0 ? filteredBdaUsers : bdas;

  const roleLower = (userRole || "").toLowerCase();
  const isManagerial = ["owner", "director", "hr head", "hr executive", "department manager", "operation manager", "manager", "dsm", "head"].some(
    r => roleLower.includes(r)
  ) || roleLower.includes("manager");

  // Breakdown list for modal: Management sees all BDAs, regular BDA user sees ONLY their own user
  const currentBdaUser = bdas.find(b =>
    (sessionUser?.id && String(b.id) === String(sessionUser.id)) ||
    (sessionUser?.email && b.email && b.email.toLowerCase() === sessionUser.email.toLowerCase()) ||
    (sessionUser?.name && b.name && b.name.toLowerCase() === sessionUser.name.toLowerCase())
  );

  const userBreakdownBdaList: BdaUserItem[] = isManagerial
    ? finalBdaList
    : (currentBdaUser
        ? [currentBdaUser]
        : (sessionUser ? [{ id: String(sessionUser.id), name: sessionUser.name || "My Account", role: sessionUser.role || "BDA", email: sessionUser.email || "", department: sessionUser.department || "" }] : finalBdaList)
      );

  // Raw Excel/CSV Import Data & Column Mapping State
  const [importFileName, setImportFileName] = useState("");
  const [rawRows, setRawRows] = useState<any[]>([]);
  const [rawHeaders, setRawHeaders] = useState<string[]>([]);
  const [mappedData, setMappedData] = useState<any[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Dynamic Column Mapping Selections
  const [columnMapping, setColumnMapping] = useState({
    name: "",
    phone: "",
    companyName: "",
    email: "",
    city: "",
    salesReason: "",
    remarks: ""
  });
  const [saveExtraColumns, setSaveExtraColumns] = useState(true);

  // Bulk Assign Target BDA
  const [targetBdaId, setTargetBdaId] = useState("");
  const [isAssigning, setIsAssigning] = useState(false);

  // Manual Add Lead Form
  const [manualForm, setManualForm] = useState({
    name: "",
    phone: "",
    email: "",
    companyName: "",
    city: "",
    salesReason: "Pitching",
    customSalesReason: "",
    remarks: ""
  });

  // Fetch Leads & BDAs on mount
  useEffect(() => {
    fetchLeads();
    fetchBdas();
  }, []);

  const fetchLeads = async () => {
    setLoading(true);
    try {
      // Always fetch all master leads so top KPI cards remain fixed & accurate
      const res = await fetch("/api/bda-leads?status=All");
      const data = await res.json();
      if (data.success) {
        setLeads(data.data || []);
      } else {
        triggerToast?.("Failed to load leads: " + data.error);
      }
    } catch (err) {
      console.error("fetchLeads error:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchBdas = async () => {
    try {
      const res = await fetch("/api/tasks/company-users");
      const data = await res.json();
      if (data.success) {
        setBdas(data.data || []);
      }
    } catch (err) {
      console.error("fetchBdas error:", err);
    }
  };

  // Helper: Smart Column Matcher
  const findBestColumnMatch = (headers: string[], keywords: string[]) => {
    for (const kw of keywords) {
      const found = headers.find(h => h.toLowerCase().includes(kw.toLowerCase()));
      if (found) return found;
    }
    return "";
  };

  // Handle File Upload & Extract Raw Headers & Rows
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFileName(file.name);
    const reader = new FileReader();

    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const workbook = XLSX.read(bstr, { type: "binary" });
        const wsname = workbook.SheetNames[0];
        const ws = workbook.Sheets[wsname];
        const data: any[] = XLSX.utils.sheet_to_json(ws, { defval: "" });

        if (!data || data.length === 0) {
          triggerToast?.("Uploaded file is empty or formatted incorrectly!");
          return;
        }

        // Extract all column headers
        const headers = Object.keys(data[0] || {});
        setRawHeaders(headers);
        setRawRows(data);

        // Smart auto-detection for mapping dropdowns
        const autoMap = {
          name: findBestColumnMatch(headers, ["name", "client", "person", "contact person", "customer"]),
          phone: findBestColumnMatch(headers, ["phone", "mobile", "contact no", "number", "contact"]),
          companyName: findBestColumnMatch(headers, ["company", "org", "firm", "business"]),
          email: findBestColumnMatch(headers, ["email", "mail"]),
          city: findBestColumnMatch(headers, ["city", "location", "address", "state"]),
          salesReason: findBestColumnMatch(headers, ["reason", "purpose"]),
          remarks: findBestColumnMatch(headers, ["remark", "note", "comment", "detail"])
        };

        setColumnMapping(autoMap);
        setImportStep("map");
      } catch (err: any) {
        console.error("Excel parse error:", err);
        triggerToast?.("Failed to parse file: " + err.message);
      }
    };

    reader.readAsBinaryString(file);
  };

  // Step 2 -> Step 3: Process Rows Based on User's Custom Column Mapping
  const handleGenerateMappingPreview = () => {
    if (rawRows.length === 0) return;

    const mapped = rawRows.map((row: any) => {
      const nameVal = columnMapping.name ? row[columnMapping.name] : "";
      const phoneVal = columnMapping.phone ? String(row[columnMapping.phone]) : "";
      const companyVal = columnMapping.companyName ? row[columnMapping.companyName] : "";
      const emailVal = columnMapping.email ? row[columnMapping.email] : "";
      const cityVal = columnMapping.city ? row[columnMapping.city] : "";
      const reasonVal = columnMapping.salesReason ? row[columnMapping.salesReason] : "Pitching";
      const remarksVal = columnMapping.remarks ? row[columnMapping.remarks] : "";

      // Collect all unmapped extra fields into rawExtraJson so NO data is lost
      const extraData: Record<string, any> = {};
      if (saveExtraColumns) {
        const mappedHeaderKeys = Object.values(columnMapping).filter(Boolean);
        Object.keys(row).forEach(key => {
          if (!mappedHeaderKeys.includes(key) && row[key] !== undefined && row[key] !== "") {
            extraData[key] = row[key];
          }
        });
      }

      return {
        name: String(nameVal || companyVal || "Prospective Client").trim(),
        phone: phoneVal.trim(),
        email: String(emailVal).trim(),
        companyName: String(companyVal).trim(),
        city: String(cityVal).trim(),
        source: "Excel Import",
        salesReason: String(reasonVal || "Pitching").trim(),
        remarks: String(remarksVal).trim(),
        rawExtraJson: Object.keys(extraData).length > 0 ? JSON.stringify(extraData) : null
      };
    }).filter(item => item.name || item.companyName || item.phone);

    if (mapped.length === 0) {
      triggerToast?.("No valid lead rows found with the selected column mapping!");
      return;
    }

    setMappedData(mapped);
    setImportStep("preview");
  };

  // Step 3: Confirm Import Mapped Leads to DB
  const handleConfirmImport = async () => {
    if (mappedData.length === 0) return;
    setIsImporting(true);
    try {
      const res = await fetch("/api/bda-leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leads: mappedData })
      });
      const data = await res.json();
      if (data.success) {
        if (data.skippedCount && data.skippedCount > 0) {
          triggerToast?.(`🎉 Imported ${data.createdCount} new lead(s)! (${data.skippedCount} duplicate lead(s) skipped by company name)`);
        } else {
          triggerToast?.(`🎉 ${data.createdCount || data.data?.length || 0} Leads imported successfully!`);
        }
        setShowImportModal(false);
        setImportStep("upload");
        setRawRows([]);
        setMappedData([]);
        setImportFileName("");
        fetchLeads();
      } else {
        triggerToast?.("Import failed: " + data.error);
      }
    } catch (err: any) {
      triggerToast?.("Network error during import: " + err.message);
    } finally {
      setIsImporting(false);
    }
  };

  // Bulk Assign Leads to Selected BDA (with Auto-Task Creation)
  const handleConfirmBulkAssign = async () => {
    if (selectedIds.length === 0) {
      triggerToast?.("Please select at least one lead to assign!");
      return;
    }
    if (!targetBdaId) {
      triggerToast?.("Please select a target BDA user!");
      return;
    }

    setIsAssigning(true);
    try {
      const res = await fetch("/api/bda-leads/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadIds: selectedIds,
          assignedTo: targetBdaId
        })
      });

      const data = await res.json();
      if (data.success) {
        triggerToast?.(`✅ ${data.message}`);
        setShowAssignModal(false);
        setSelectedIds([]);
        setTargetBdaId("");
        fetchLeads();
      } else {
        triggerToast?.("Bulk assign failed: " + data.error);
      }
    } catch (err: any) {
      triggerToast?.("Network error: " + err.message);
    } finally {
      setIsAssigning(false);
    }
  };

  // Create Single Lead Manually
  const handleAddSingleLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualForm.name && !manualForm.companyName) {
      triggerToast?.("Please enter at least Contact Person Name or Company Name!");
      return;
    }

    try {
      const finalSalesReason = manualForm.salesReason === "Other"
        ? (manualForm.customSalesReason.trim() || "Other")
        : manualForm.salesReason;

      const payload = {
        ...manualForm,
        salesReason: finalSalesReason
      };

      const res = await fetch("/api/bda-leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        if (data.skippedCount && data.skippedCount > 0) {
          triggerToast?.(`⚠️ A lead with this company name/phone already exists in DB! Skipped creating duplicate.`);
        } else {
          triggerToast?.("✅ Lead created successfully!");
          setShowAddModal(false);
          setManualForm({ name: "", phone: "", email: "", companyName: "", city: "", salesReason: "Pitching", customSalesReason: "", remarks: "" });
          fetchLeads();
        }
      } else {
        triggerToast?.("Error: " + data.error);
      }
    } catch (err: any) {
      triggerToast?.("Failed to add lead: " + err.message);
    }
  };

  // Export Filtered Leads to Excel (.xlsx) with Attachments, Follow-up History & Summary Sheet
  const handleExportLeads = async () => {
    try {
      const targetLeads = selectedIds.length > 0
        ? leads.filter(l => selectedIds.includes(l.id))
        : filteredLeads;

      if (!targetLeads || targetLeads.length === 0) {
        triggerToast?.("No leads available to export matching the current filter!");
        return;
      }

      triggerToast?.("⌛ Preparing Excel export with attachments & follow-up history...");

      // Fetch history for any lead that hasn't been fetched yet
      const historyMapCopy: { [id: number]: any } = { ...historyDataMap };
      const missingHistoryIds = targetLeads.filter(l => !historyMapCopy[l.id] || !historyMapCopy[l.id].tasks).map(l => l.id);

      if (missingHistoryIds.length > 0) {
        await Promise.all(
          missingHistoryIds.map(async (id) => {
            try {
              const res = await fetch(`/api/bda-leads/history?id=${id}`);
              const data = await res.json();
              if (data.success) {
                historyMapCopy[id] = { loading: false, lead: data.lead, tasks: data.tasks || [] };
              }
            } catch (e) {}
          })
        );
      }

      const exportRows = targetLeads.map((lead: any) => {
        // 1. Converted Services Text
        let convertedServicesText = "";
        if (lead.convertedServicesJson) {
          try {
            const services = typeof lead.convertedServicesJson === "string" ? JSON.parse(lead.convertedServicesJson) : lead.convertedServicesJson;
            if (Array.isArray(services)) {
              convertedServicesText = services.map((s: any) => `${s.serviceName || s.name || "Service"} (₹${s.amount || 0})`).join("; ");
            }
          } catch (e) {}
        }

        // 2. Attached Image & File URLs
        let attachmentUrlsText = "";
        if (lead.attachmentsJson) {
          try {
            const atts = typeof lead.attachmentsJson === "string" ? JSON.parse(lead.attachmentsJson) : lead.attachmentsJson;
            if (Array.isArray(atts) && atts.length > 0) {
              attachmentUrlsText = atts.map((att: any, idx: number) => {
                const name = att.name || `Attachment-${idx + 1}`;
                const url = att.url || att.src || att.blobUrl || "";
                const displayUrl = url.length > 120 && url.startsWith("data:") ? "[Data URL Image/Media]" : url;
                return `[${idx + 1}] ${name}: ${displayUrl}`;
              }).join(" | ");
            }
          } catch (e) {}
        }

        // 3. Task Follow-up History & Progress Notes
        let followUpHistoryText = "";
        const historyObj = historyMapCopy[lead.id];
        if (historyObj && Array.isArray(historyObj.tasks) && historyObj.tasks.length > 0) {
          followUpHistoryText = historyObj.tasks.map((task: any, tIdx: number) => {
            const tTitle = task.taskTitle || "Task";
            const tStatus = task.status || "Pending";
            const tUser = task.employeeName || "BDA";

            let notesText = "";
            if (task.progressNotes) {
              try {
                const pNotes = typeof task.progressNotes === "string" ? JSON.parse(task.progressNotes) : task.progressNotes;
                if (Array.isArray(pNotes)) {
                  notesText = pNotes.map((n: any) => n.note || n.text || "").filter(Boolean).join("; ");
                } else if (typeof pNotes === "string") {
                  notesText = pNotes;
                }
              } catch (e) {
                notesText = String(task.progressNotes);
              }
            }

            let schedStr = "";
            if (task.scheduledAt) {
              try {
                schedStr = new Date(task.scheduledAt).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
              } catch (e) {}
            }

            return `[${tIdx + 1}] (${tStatus}) ${tTitle} by ${tUser}${schedStr ? ` (Scheduled: ${schedStr})` : ""}${notesText ? ` - Notes: ${notesText}` : ""}`;
          }).join(" \n");
        }

        if (!followUpHistoryText && lead.remarks) {
          followUpHistoryText = `Remarks: ${lead.remarks}`;
        }

        return {
          "Lead ID": lead.leadId || `BDALEAD-${lead.id}`,
          "Contact Name": lead.name || "N/A",
          "Phone": lead.phone || "N/A",
          "Email": lead.email || "N/A",
          "Company Name": lead.companyName || "N/A",
          "City": lead.city || "N/A",
          "Sales Reason": lead.salesReason || "Pitching",
          "Assigned BDA": lead.assignedToName || (lead.assignedTo ? `BDA #${lead.assignedTo}` : "Unassigned"),
          "Assigned By": historyObj?.lead?.assignedByName || lead.assignedBy || "N/A",
          "Assigned Date": lead.assignedAt ? new Date(lead.assignedAt).toLocaleString("en-IN") : "N/A",
          "Status (Stage)": lead.status || "New",
          "Converted Amount (₹)": lead.convertedAmount ? Number(lead.convertedAmount) : 0,
          "Converted Services": convertedServicesText || "N/A",
          "Lost Reason": lead.lostReason || "N/A",
          "Lead Remarks": lead.remarks || "N/A",
          "Attached Image / File URLs": attachmentUrlsText || "No Attachments",
          "Task Follow-up History": followUpHistoryText || "No Follow-up Logs",
          "Created Date": lead.createdAt ? new Date(lead.createdAt).toLocaleDateString("en-IN") : "N/A"
        };
      });

      const worksheet = XLSX.utils.json_to_sheet(exportRows);

      // Auto-fit column widths
      const headers = Object.keys(exportRows[0]);
      const max_widths = headers.map(h => {
        let max_len = h.length;
        exportRows.forEach((r: any) => {
          const val = String(r[h] || "");
          const lines = val.split("\n");
          lines.forEach(l => {
            if (l.length > max_len) max_len = l.length;
          });
        });
        return { wch: Math.min(Math.max(max_len + 3, 14), 70) };
      });
      worksheet["!cols"] = max_widths;

      // Summary Sheet
      const summaryRows = [
        { Metric: "Total Exported Leads", Value: targetLeads.length },
        { Metric: "Active Status Filter", Value: statusFilter },
        { Metric: "Active Assignment Filter", Value: assignmentFilter === "All" ? "All Assignment" : assignmentFilter === "unassigned" ? "Unassigned Only" : assignmentFilter },
        { Metric: "Active Search Query", Value: searchQuery || "None" },
        { Metric: "Converted Leads Count", Value: targetLeads.filter(l => l.status === "Converted").length },
        { Metric: "Total Converted Revenue (₹)", Value: targetLeads.filter(l => l.status === "Converted").reduce((sum, l) => sum + (Number(l.convertedAmount) || 0), 0) },
        { Metric: "Lost Leads Count", Value: targetLeads.filter(l => l.status === "Lost").length },
        { Metric: "Export Date & Time", Value: new Date().toLocaleString("en-IN") }
      ];

      const summaryWorksheet = XLSX.utils.json_to_sheet(summaryRows);
      summaryWorksheet["!cols"] = [{ wch: 28 }, { wch: 35 }];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "BDA Leads Details");
      XLSX.utils.book_append_sheet(workbook, summaryWorksheet, "Export Summary");

      const fileDate = new Date().toISOString().split("T")[0];
      XLSX.writeFile(workbook, `BDA_Leads_Report_${statusFilter.replace(/\s+/g, "_")}_${fileDate}.xlsx`);

      triggerToast?.(`✅ Exported ${targetLeads.length} leads with attachments & history to Excel!`);
    } catch (err: any) {
      console.error("Export BDA leads error:", err);
      triggerToast?.("Export failed: " + err.message);
    }
  };

  // Quick Update Lead Status
  const handleUpdateStatus = async (leadIdNum: number, newStatus: string) => {
    const targetLead = leads.find(l => l.id === leadIdNum);
    if (!targetLead) return;

    if (newStatus === "Assigned") {
      setSelectedIds([leadIdNum]);
      setTargetBdaId(targetLead.assignedTo || "");
      setShowAssignModal(true);
      return;
    }

    if (newStatus === "Converted" || newStatus === "Lost") {
      setTargetStatusLead(targetLead);
      setTargetNewStatus(newStatus as "Converted" | "Lost");
      setStatusRemarks(targetLead.remarks || "");
      setStatusLostReason(targetLead.lostReason || "");

      // Parse existing converted services if available
      if (newStatus === "Converted") {
        try {
          const parsed = targetLead.convertedServicesJson ? JSON.parse(targetLead.convertedServicesJson) : null;
          if (Array.isArray(parsed) && parsed.length > 0) {
            setServiceRows(parsed.map((s: any) => ({ serviceName: s.serviceName || "", amount: String(s.amount || "") })));
          } else {
            setServiceRows([{ serviceName: "", amount: String(targetLead.convertedAmount || "") }]);
          }
        } catch {
          setServiceRows([{ serviceName: "", amount: "" }]);
        }
      }

      // Parse existing attachments if available
      try {
        const parsedAtts = targetLead.attachmentsJson ? JSON.parse(targetLead.attachmentsJson) : [];
        const fixedAtts = (Array.isArray(parsedAtts) ? parsedAtts : []).map((att: any) => ({
          ...att,
          url: fixAudioDataUrl(att.url, att.name, att.type)
        }));
        setStatusAttachments(fixedAtts);
      } catch {
        setStatusAttachments([]);
      }

      setShowStatusActionModal(true);
      return;
    }

    try {
      const res = await fetch("/api/bda-leads", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: leadIdNum, status: newStatus })
      });
      const data = await res.json();
      if (data.success) {
        triggerToast?.(`Lead status updated to ${newStatus}`);
        setLeads(prev => prev.map(l => l.id === leadIdNum ? {
          ...l,
          status: newStatus,
          assignedTo: newStatus === "New" ? undefined : l.assignedTo,
          assignedToName: newStatus === "New" ? undefined : l.assignedToName
        } : l));
      }
    } catch (err) {
      console.error("Status update error:", err);
    }
  };

  // Master helper to open Lead Details & Management Popup with section-level Edit toggles
  const handleOpenEditModal = (lead: BdaLeadItem, startInEditMode = true) => {
    setActiveLead(lead);

    // Parse converted services
    let parsedServices = [{ serviceName: "", amount: "" }];
    if (lead.convertedServicesJson) {
      try {
        const arr = typeof lead.convertedServicesJson === "string" ? JSON.parse(lead.convertedServicesJson) : lead.convertedServicesJson;
        if (Array.isArray(arr) && arr.length > 0) {
          parsedServices = arr.map((s: any) => ({
            serviceName: s.serviceName || "",
            amount: String(s.amount || "")
          }));
        }
      } catch {}
    } else if (lead.convertedAmount) {
      parsedServices = [{ serviceName: "", amount: String(lead.convertedAmount) }];
    }

    // Parse attachments
    let parsedAtts: any[] = [];
    if (lead.attachmentsJson) {
      try {
        const arr = typeof lead.attachmentsJson === "string" ? JSON.parse(lead.attachmentsJson) : lead.attachmentsJson;
        if (Array.isArray(arr)) {
          parsedAtts = arr.map((att: any) => ({
            ...att,
            url: fixAudioDataUrl(att.url, att.name, att.type)
          }));
        }
      } catch {}
    }

    setServiceRows(parsedServices);
    setStatusLostReason(lead.lostReason || "");
    setStatusAttachments(parsedAtts);

    setIsEditingInfo(startInEditMode);
    setIsEditingServices(startInEditMode);
    setIsEditingLost(startInEditMode);
    setIsEditingAtts(startInEditMode);
    setIsEditingRemarks(startInEditMode);

    setShowDetailsModal(true);
  };

  // Add / Remove Service Rows for Converted Lead
  const handleAddServiceRow = () => {
    setServiceRows(prev => [...prev, { serviceName: "", amount: "" }]);
  };

  const handleRemoveServiceRow = (index: number) => {
    setServiceRows(prev => prev.filter((_, i) => i !== index));
  };

  const handleServiceChange = (index: number, field: "serviceName" | "amount", val: string) => {
    setServiceRows(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: val };
      return copy;
    });
  };

  // Total Converted Amount Sum
  const totalConvertedAmount = serviceRows.reduce((sum, row) => sum + (parseFloat(row.amount) || 0), 0);

  // File Upload Handler (+ Add More Attachments)
  const handleStatusFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach(file => {
      let localBlobUrl = "";
      try {
        localBlobUrl = URL.createObjectURL(file);
      } catch {}

      const reader = new FileReader();
      reader.onload = (evt) => {
        const rawDataUrl = evt.target?.result as string;
        if (rawDataUrl) {
          const ext = file.name.split('.').pop()?.toLowerCase() || '';
          let mimeType = file.type;
          if (ext === 'aac') mimeType = 'audio/aac';
          else if (ext === 'm4a') mimeType = 'audio/mp4';
          else if (ext === 'mp3') mimeType = 'audio/mpeg';
          else if (ext === 'wav') mimeType = 'audio/wav';
          else if (ext === 'ogg') mimeType = 'audio/ogg';
          else if (ext === 'webm') mimeType = 'audio/webm';

          const finalDataUrl = fixAudioDataUrl(rawDataUrl, file.name, mimeType);

          setStatusAttachments(prev => [
            ...prev,
            {
              name: file.name,
              type: mimeType || (ext === 'aac' ? 'audio/aac' : 'application/octet-stream'),
              url: finalDataUrl,
              blobUrl: localBlobUrl,
              size: file.size
            }
          ]);
        }
      };
      reader.readAsDataURL(file);
    });

    if (statusFileInputRef.current) {
      statusFileInputRef.current.value = "";
    }
  };

  const handleRemoveAttachment = (index: number) => {
    setStatusAttachments(prev => prev.filter((_, i) => i !== index));
  };

  // Save Status Action Modal (Converted / Lost)
  const handleSaveStatusActionModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetStatusLead) return;

    if (targetNewStatus === "Converted" && serviceRows.filter(s => s.serviceName.trim()).length === 0) {
      triggerToast?.("Please enter at least one Service Name!");
      return;
    }

    if (targetNewStatus === "Lost" && !statusLostReason.trim()) {
      triggerToast?.("Please enter a Reason for marking lead as Lost!");
      return;
    }

    setIsSavingStatusModal(true);
    try {
      const validServices = serviceRows.filter(s => s.serviceName.trim()).map(s => ({
        serviceName: s.serviceName.trim(),
        amount: parseFloat(s.amount) || 0
      }));

      const newConvertedServicesJson = targetNewStatus === "Converted"
        ? (validServices.length > 0 ? JSON.stringify(validServices) : targetStatusLead.convertedServicesJson || null)
        : (targetStatusLead.convertedServicesJson || null);

      const newConvertedAmount = targetNewStatus === "Converted"
        ? totalConvertedAmount
        : (targetStatusLead.convertedAmount !== undefined ? targetStatusLead.convertedAmount : null);

      const newLostReason = targetNewStatus === "Lost"
        ? statusLostReason.trim()
        : (targetStatusLead.lostReason || null);

      const payload = {
        id: targetStatusLead.id,
        status: targetNewStatus,
        convertedServicesJson: newConvertedServicesJson,
        convertedAmount: newConvertedAmount,
        lostReason: newLostReason,
        remarks: statusRemarks.trim(),
        attachmentsJson: JSON.stringify(statusAttachments)
      };

      const res = await fetch("/api/bda-leads", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data.success) {
        triggerToast?.(`🎉 Lead ${targetStatusLead.leadId} marked as ${targetNewStatus}!`);
        setShowStatusActionModal(false);
        setLeads(prev => prev.map(l => l.id === targetStatusLead.id ? {
          ...l,
          status: targetNewStatus,
          convertedServicesJson: payload.convertedServicesJson || l.convertedServicesJson,
          convertedAmount: payload.convertedAmount !== null ? payload.convertedAmount : l.convertedAmount,
          lostReason: payload.lostReason || l.lostReason,
          remarks: payload.remarks,
          attachmentsJson: payload.attachmentsJson
        } : l));
      } else {
        triggerToast?.("Failed to save status: " + data.error);
      }
    } catch (err: any) {
      triggerToast?.("Network error: " + err.message);
    } finally {
      setIsSavingStatusModal(false);
    }
  };

  // Delete Single Lead
  const handleDeleteLead = async (leadIdNum: number) => {
    if (!confirm("Are you sure you want to delete this lead?")) return;
    try {
      const res = await fetch(`/api/bda-leads?id=${leadIdNum}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        triggerToast?.("Lead deleted");
        setLeads(prev => prev.filter(l => l.id !== leadIdNum));
        setSelectedIds(prev => prev.filter(id => id !== leadIdNum));
      }
    } catch (err) {
      console.error("Delete lead error:", err);
    }
  };

  // Bulk Delete Selected Leads
  const handleBulkDeleteLeads = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`Are you sure you want to permanently delete the ${selectedIds.length} selected lead(s)?`)) return;

    try {
      const res = await fetch("/api/bda-leads", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds })
      });
      const data = await res.json();
      if (data.success) {
        triggerToast?.(`✅ Successfully deleted ${selectedIds.length} selected lead(s)!`);
        setLeads(prev => prev.filter(l => !selectedIds.includes(l.id)));
        setSelectedIds([]);
      } else {
        triggerToast?.("Failed to delete selected leads: " + data.error);
      }
    } catch (err: any) {
      console.error("Bulk delete error:", err);
      triggerToast?.("Bulk delete error: " + err.message);
    }
  };

  // Toggle selection
  const toggleSelectAll = () => {
    if (selectedIds.length === filteredLeads.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredLeads.map(l => l.id));
    }
  };

  const toggleSelectRow = (id: number) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]);
  };

  // Filtered Leads Client View
  const filteredLeads = leads.filter(item => {
    if (statusFilter !== "All" && item.status !== statusFilter) {
      return false;
    }
    if (assignmentFilter !== "All") {
      if (assignmentFilter === "unassigned") {
        if (item.assignedTo) return false;
      } else {
        const matchesId = item.assignedTo === assignmentFilter;
        const matchesName = item.assignedToName && item.assignedToName.toLowerCase() === assignmentFilter.toLowerCase();
        if (!matchesId && !matchesName) return false;
      }
    }
    if (searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase();
      const match =
        item.name?.toLowerCase().includes(q) ||
        item.phone?.toLowerCase().includes(q) ||
        item.email?.toLowerCase().includes(q) ||
        item.companyName?.toLowerCase().includes(q) ||
        item.city?.toLowerCase().includes(q) ||
        item.leadId?.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  // Calculate Summary Stats from Master leads array so stats NEVER change when filters are applied
  const totalLeads = leads.length;
  const unassignedCount = leads.filter(l => !l.assignedTo || l.assignedTo === "" || l.status === "New").length;
  const assignedCount = leads.filter(l => l.status === "Assigned" || (l.assignedTo && l.status !== "Converted" && l.status !== "Lost" && l.status !== "New")).length;

  const convertedLeads = leads.filter(l => l.status === "Converted");
  const convertedCount = convertedLeads.length;
  const convertedTotalAmount = convertedLeads.reduce((sum, lead) => {
    let amt = parseFloat(String(lead.convertedAmount || 0)) || 0;
    if (!amt && lead.convertedServicesJson) {
      try {
        const parsed = typeof lead.convertedServicesJson === "string" ? JSON.parse(lead.convertedServicesJson) : lead.convertedServicesJson;
        if (Array.isArray(parsed)) {
          amt = parsed.reduce((s: number, item: any) => s + (parseFloat(item.amount) || 0), 0);
        }
      } catch {}
    }
    return sum + amt;
  }, 0);

  const lostLeads = leads.filter(l => l.status === "Lost");
  const lostCount = lostLeads.length;

  return (
    <div className="p-4 md:p-6 space-y-6 bg-slate-50 min-h-screen text-slate-900">

      {/* Top Header & Overview Bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-gradient-to-tr from-purple-600 to-indigo-600 rounded-xl text-white shadow-md">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight text-slate-900">
                BDA Leads Management
              </h1>
              <p className="text-xs font-semibold text-slate-500">
                Dynamic Excel/CSV column mapping, bulk lead import & instant auto-task creation for BDAs
              </p>
            </div>
          </div>
        </div>

        {/* Top Actions */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {isManagerial && (
            <button
              onClick={() => {
                setShowImportModal(true);
                setImportStep("upload");
                setRawRows([]);
                setMappedData([]);
                setImportFileName("");
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm hover:shadow"
            >
              <Upload className="w-4 h-4" />
              Bulk Import (Excel/CSV)
            </button>
          )}

          <button
            onClick={handleExportLeads}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm hover:shadow"
            title="Export current BDA leads list to Excel (.xlsx)"
          >
            <Download className="w-4 h-4" />
            Export Leads (Excel/CSV)
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Add Single Lead
          </button>
        </div>
      </div>

      {/* Summary KPI Cards (Click to Filter & View User Breakdown) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 md:gap-4">
        
        {/* 1. Total Leads */}
        <div
          onClick={() => {
            setStatusFilter("All");
            setAssignmentFilter("All");
          }}
          className={`bg-white border rounded-2xl p-4 shadow-sm flex items-center justify-between cursor-pointer transition-all hover:shadow-md ${
            statusFilter === "All" && assignmentFilter === "All"
              ? "border-purple-600 ring-2 ring-purple-400/30 bg-purple-50/20"
              : "border-slate-200 hover:border-purple-300"
          }`}
          title="Click to view all leads"
        >
          <div>
            <p className="text-[10px] uppercase font-black tracking-wider text-slate-400">Total Leads</p>
            <h3 className="text-2xl font-black text-slate-800 mt-1">{totalLeads}</h3>
          </div>
          <div className="p-3 bg-slate-100 rounded-xl text-slate-600 shrink-0">
            <Users className="w-5 h-5" />
          </div>
        </div>

        {/* 2. Unassigned Leads */}
        <div
          onClick={() => {
            setStatusFilter("All");
            setAssignmentFilter("unassigned");
          }}
          className={`bg-white border rounded-2xl p-4 shadow-sm flex items-center justify-between cursor-pointer transition-all hover:shadow-md ${
            assignmentFilter === "unassigned"
              ? "border-amber-600 ring-2 ring-amber-400/30 bg-amber-50/30"
              : "border-amber-200 hover:border-amber-400"
          }`}
          title="Click to filter unassigned leads"
        >
          <div>
            <p className="text-[10px] uppercase font-black tracking-wider text-amber-700">Unassigned Leads</p>
            <h3 className="text-2xl font-black text-amber-600 mt-1">{unassignedCount}</h3>
          </div>
          <div className="p-3 bg-amber-50 rounded-xl text-amber-600 shrink-0">
            <AlertCircle className="w-5 h-5" />
          </div>
        </div>

        {/* 3. Assigned to BDAs (Opens Breakdown Modal) */}
        <div
          onClick={() => {
            setTargetBreakdownStatus("Assigned");
            setShowStatusUserBreakdownModal(true);
          }}
          className={`bg-white border rounded-2xl p-4 shadow-sm flex items-center justify-between cursor-pointer transition-all hover:shadow-md ${
            assignmentFilter !== "All" && assignmentFilter !== "unassigned"
              ? "border-blue-600 ring-2 ring-blue-400/30 bg-blue-50/30"
              : "border-blue-200 hover:border-blue-400"
          }`}
          title="Click to view BDA lead assignments summary & filter by BDA"
        >
          <div>
            <p className="text-[10px] uppercase font-black tracking-wider text-blue-700">Assigned to BDAs</p>
            <h3 className="text-2xl font-black text-blue-600 mt-1">{assignedCount}</h3>
          </div>
          <div className="p-3 bg-blue-50 rounded-xl text-blue-600 shrink-0">
            <UserPlus className="w-5 h-5" />
          </div>
        </div>

        {/* 4. Converted Clients (Count + Total Value + Breakdown Modal) */}
        <div
          onClick={() => {
            setTargetBreakdownStatus("Converted");
            setShowStatusUserBreakdownModal(true);
          }}
          className={`bg-white border rounded-2xl p-4 shadow-sm flex items-center justify-between cursor-pointer transition-all hover:shadow-md ${
            statusFilter === "Converted"
              ? "border-emerald-600 ring-2 ring-emerald-400/30 bg-emerald-50/30"
              : "border-emerald-200 hover:border-emerald-400"
          }`}
          title="Click to view converted clients breakdown by BDA user"
        >
          <div>
            <p className="text-[10px] uppercase font-black tracking-wider text-emerald-700">Converted Clients</p>
            <h3 className="text-2xl font-black text-emerald-600 mt-0.5">{convertedCount}</h3>
            <p className="text-[11px] font-extrabold text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded-lg border border-emerald-200 inline-block mt-1 shadow-2xs">
              ₹ {convertedTotalAmount.toLocaleString('en-IN')} Total
            </p>
          </div>
          <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600 shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        {/* 5. Lost Leads (Count + Breakdown Modal) */}
        <div
          onClick={() => {
            setTargetBreakdownStatus("Lost");
            setShowStatusUserBreakdownModal(true);
          }}
          className={`bg-white border rounded-2xl p-4 shadow-sm flex items-center justify-between cursor-pointer transition-all hover:shadow-md ${
            statusFilter === "Lost"
              ? "border-rose-600 ring-2 ring-rose-400/30 bg-rose-50/30"
              : "border-rose-200 hover:border-rose-400"
          }`}
          title="Click to view lost leads breakdown by BDA user"
        >
          <div>
            <p className="text-[10px] uppercase font-black tracking-wider text-rose-700">Lost Leads</p>
            <h3 className="text-2xl font-black text-rose-600 mt-1">{lostCount}</h3>
          </div>
          <div className="p-3 bg-rose-50 rounded-xl text-rose-600 shrink-0">
            <XCircle className="w-5 h-5" />
          </div>
        </div>

      </div>

      {/* Filter & Toolbar Section */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">

          {/* Search Box */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search leads by Client Name, Phone, Email, Company, City, or Lead ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-purple-500 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
            {/* Status Filter */}
            <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-700 focus:outline-none"
              >
                <option value="All">All Status</option>
                <option value="New">New</option>
                <option value="Assigned">Assigned</option>
                <option value="In Progress">In Progress</option>
                <option value="Qualified">Qualified</option>
                <option value="Converted">Converted</option>
                <option value="Lost">Lost</option>
              </select>
            </div>

            {/* Assignment Filter */}
            {isManagerial && (
              <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
                <Users className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={assignmentFilter}
                  onChange={(e) => setAssignmentFilter(e.target.value)}
                  className="bg-transparent text-xs font-bold text-slate-700 focus:outline-none"
                >
                  <option value="All">All Assignment</option>
                  <option value="unassigned">Unassigned Only</option>
                  {finalBdaList.map(bda => (
                    <option key={bda.id} value={bda.id}>
                      {bda.name} ({bda.role})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Toggle Columns Filter */}
            <div className="relative" ref={columnToggleDropdownRef}>
              <button
                type="button"
                onClick={() => setShowColumnToggleMenu(!showColumnToggleMenu)}
                className="flex items-center gap-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 transition-all cursor-pointer shadow-2xs"
                title="Show/Hide Table Columns"
              >
                <Layers className="w-3.5 h-3.5 text-purple-600" />
                <span>Columns</span>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${showColumnToggleMenu ? "rotate-180" : ""}`} />
              </button>

              {showColumnToggleMenu && (
                <div className="absolute left-0 sm:left-auto sm:right-0 top-full mt-2 z-50 w-56 max-w-[calc(100vw-32px)] bg-white rounded-2xl shadow-xl border border-slate-200 p-3 space-y-2 animate-in fade-in zoom-in-95 font-sans">
                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                    <span className="text-[10px] font-black uppercase text-purple-900 tracking-wider flex items-center gap-1">
                      <Layers className="w-3 h-3 text-purple-600" /> Toggle Columns
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowColumnToggleMenu(false)}
                      className="text-slate-400 hover:text-slate-600 text-xs p-0.5 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="space-y-1 max-h-52 overflow-y-auto">
                    {[
                      { key: "leadId", label: "Lead ID" },
                      { key: "client", label: "Client / Contact" },
                      { key: "company", label: "Company & Location" },
                      { key: "reason", label: "Sales Reason" },
                      { key: "assignedBda", label: "Assigned BDA" },
                      { key: "status", label: "Status" },
                      { key: "actions", label: "Actions" },
                    ].map((col) => (
                      <label key={col.key} className="flex items-center justify-between text-xs font-bold text-slate-700 hover:bg-purple-50/50 p-1.5 rounded-lg cursor-pointer select-none">
                        <span>{col.label}</span>
                        <input
                          type="checkbox"
                          checked={visibleColumns[col.key] ?? true}
                          onChange={() => setVisibleColumns(prev => ({ ...prev, [col.key]: !prev[col.key] }))}
                          className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500 cursor-pointer"
                        />
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={fetchLeads}
              className="p-2 text-slate-500 hover:text-purple-700 hover:bg-purple-50 rounded-xl border border-slate-200 transition-all cursor-pointer"
              title="Refresh Data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* Selected Banner */}
        {selectedIds.length > 0 && (
          <div className="flex items-center justify-between bg-purple-50 border border-purple-200 p-2.5 rounded-xl text-xs font-bold text-purple-900 animate-fade-in">
            <span className="flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-purple-700" />
              {selectedIds.length} Lead(s) Selected
            </span>
            <div className="flex items-center gap-2">
              {isManagerial && (
                <button
                  onClick={() => setShowAssignModal(true)}
                  className="bg-purple-700 hover:bg-purple-800 text-white px-3 py-1 rounded-lg text-xs font-bold transition-all shadow-2xs"
                >
                  Assign Selected to BDA →
                </button>
              )}

              <button
                onClick={handleBulkDeleteLeads}
                className="bg-rose-600 hover:bg-rose-700 text-white px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 shadow-2xs cursor-pointer"
                title="Delete all selected leads from database"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete Selected ({selectedIds.length})
              </button>

              <button
                onClick={() => setSelectedIds([])}
                className="text-purple-600 hover:underline text-xs ml-1"
              >
                Clear Selection
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Leads Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        {/* Table Data Container: Vertical Scroll & Sticky Header */}
        <div className="overflow-x-auto max-h-[620px] overflow-y-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-20 bg-slate-100/95 backdrop-blur-md border-b border-slate-200 shadow-2xs">
              <tr className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
                <th className="p-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={filteredLeads.length > 0 && selectedIds.length === filteredLeads.length}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500 cursor-pointer"
                  />
                </th>
                {visibleColumns.leadId && <th className="p-3">Lead ID</th>}
                {visibleColumns.client && <th className="p-3">Client / Contact</th>}
                {visibleColumns.company && <th className="p-3">Company & Location</th>}
                {visibleColumns.reason && <th className="p-3">Reason</th>}
                {visibleColumns.assignedBda && <th className="p-3">Assigned BDA</th>}
                {visibleColumns.status && <th className="p-3">Status</th>}
                {visibleColumns.actions && <th className="p-3 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-semibold">
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400 font-bold">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-purple-600" />
                    Loading BDA leads...
                  </td>
                </tr>
              ) : filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400 font-bold">
                    No BDA leads found matching the filters.
                  </td>
                </tr>
              ) : (
                filteredLeads.map((lead) => {
                  const isSelected = selectedIds.includes(lead.id);
                  const isExpanded = expandedLeadId === lead.id;
                  const history = historyDataMap[lead.id];

                  return (
                    <React.Fragment key={lead.id}>
                      <tr
                        onClick={() => toggleRowExpand(lead)}
                        className={`hover:bg-purple-50/40 transition-colors cursor-pointer select-none ${isSelected ? "bg-purple-50/70" : isExpanded ? "bg-purple-50/40 font-bold" : ""}`}
                        title="Click anywhere on row to view/hide detailed dropdown"
                      >
                        <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectRow(lead.id)}
                            className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500 cursor-pointer"
                          />
                        </td>

                        {/* Lead ID */}
                        {visibleColumns.leadId && (
                          <td className="p-3 font-mono font-bold text-purple-900 whitespace-nowrap">
                            <div className="text-purple-700 flex items-center gap-1">
                              {lead.leadId}
                              {lead.rawExtraJson && <span className="w-2 h-2 rounded-full bg-emerald-500" title="Contains extra raw columns" />}
                            </div>
                          </td>
                        )}

                        {/* Client / Contact */}
                        {visibleColumns.client && (
                          <td className="p-3">
                            <div className="font-extrabold text-slate-900">{lead.name}</div>
                            <div className="flex items-center gap-3 text-[11px] font-bold text-slate-500 mt-0.5">
                              {lead.phone && (
                                <span className="flex items-center gap-1">
                                  <Phone className="w-3 h-3 text-slate-400" /> {lead.phone}
                                </span>
                              )}
                              {lead.email && (
                                <span className="flex items-center gap-1">
                                  <Mail className="w-3 h-3 text-slate-400" /> {lead.email}
                                </span>
                              )}
                            </div>
                          </td>
                        )}

                        {/* Company & Location */}
                        {visibleColumns.company && (
                          <td className="p-3">
                            <div className="font-bold text-slate-800 flex items-center gap-1">
                              {lead.companyName ? (
                                <>
                                  <Building2 className="w-3.5 h-3.5 text-slate-400" />
                                  {lead.companyName}
                                </>
                              ) : (
                                <span className="text-slate-400 italic">No Company</span>
                              )}
                            </div>
                            {lead.city && (
                              <div className="text-[11px] font-semibold text-slate-500 flex items-center gap-1 mt-0.5">
                                <MapPin className="w-3 h-3 text-slate-400" /> {lead.city}
                              </div>
                            )}
                          </td>
                        )}

                        {/* Reason */}
                        {visibleColumns.reason && (
                          <td className="p-3">
                            <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded-md text-[11px] font-bold">
                              {lead.salesReason || "Pitching"}
                            </span>
                          </td>
                        )}

                        {/* Assigned BDA */}
                        {visibleColumns.assignedBda && (
                          <td className="p-3" onClick={(e) => e.stopPropagation()}>
                            {lead.assignedToName ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedIds([lead.id]);
                                  setTargetBdaId(lead.assignedTo || "");
                                  setShowAssignModal(true);
                                }}
                                className="flex items-center gap-1.5 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 px-2.5 py-1 rounded-xl w-fit transition-all cursor-pointer"
                                title="Click to re-assign BDA"
                              >
                                <UserPlus className="w-3.5 h-3.5 text-blue-600" />
                                <span className="font-bold text-xs">{lead.assignedToName}</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedIds([lead.id]);
                                  setTargetBdaId("");
                                  setShowAssignModal(true);
                                }}
                                className="bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-lg text-[10px] font-black uppercase transition-all cursor-pointer flex items-center gap-1"
                                title="Click to assign to BDA"
                              >
                                <Plus className="w-3 h-3" />
                                Unassigned
                              </button>
                            )}
                          </td>
                        )}

                        {/* Status Dropdown */}
                        {visibleColumns.status && (
                          <td className="p-3" onClick={(e) => e.stopPropagation()}>
                            <select
                              value={lead.status}
                              onChange={(e) => handleUpdateStatus(lead.id, e.target.value)}
                              className={`text-xs font-bold rounded-lg px-2 py-1 border focus:outline-none ${lead.status === "Converted"
                                  ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                                  : lead.status === "Assigned"
                                    ? "bg-blue-50 text-blue-800 border-blue-300"
                                    : lead.status === "In Progress"
                                      ? "bg-indigo-50 text-indigo-800 border-indigo-300"
                                      : lead.status === "Lost"
                                      ? "bg-rose-50 text-rose-800 border-rose-300"
                                      : "bg-slate-100 text-slate-800 border-slate-300"
                              }`}
                          >
                            <option value="New">New</option>
                            <option value="Assigned">Assigned</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Qualified">Qualified</option>
                            <option value="Converted">Converted</option>
                            <option value="Lost">Lost</option>
                          </select>
                        </td>
                      )}

                        {/* Actions */}
                        {visibleColumns.actions && (
                          <td className="p-3 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => handleOpenEditModal(lead, false)}
                                className="p-1.5 text-slate-500 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-all"
                                title="View Full Lead & Stage Details"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleOpenEditModal(lead, true)}
                                className="p-1.5 text-slate-500 hover:text-purple-700 hover:bg-purple-50 rounded-lg transition-all"
                                title="Edit Lead Details, Stage Info & Recordings"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteLead(lead.id)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                                title="Delete Lead"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>

                      {/* Expandable Pipeline Audit & Follow-up History Sub-row */}
                      {isExpanded && (
                        <tr className="bg-purple-50/20 animate-fade-in">
                          <td colSpan={8} className="p-4 bg-gradient-to-r from-purple-50/60 via-slate-50 to-indigo-50/50 border-t border-b border-purple-100 shadow-inner">
                            <div className="space-y-4 text-xs">

                              {/* Top Bar Summary */}
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white/95 p-3 rounded-xl border border-purple-100 shadow-2xs">
                                <div className="flex items-center gap-2">
                                  <span className="px-2.5 py-1 bg-purple-100 text-purple-800 rounded-lg font-mono font-black text-xs border border-purple-200">
                                    {lead.leadId}
                                  </span>
                                  <div>
                                    <h4 className="font-extrabold text-slate-900 text-sm">{lead.name}</h4>
                                    <p className="text-[11px] font-semibold text-slate-500">
                                      {lead.companyName || "No Company"} {lead.city ? `• ${lead.city}` : ""}
                                    </p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-3">
                                  <span className="text-[11px] font-bold text-slate-500">
                                    Created: <span className="text-slate-800 font-mono">{lead.createdAt ? new Date(lead.createdAt).toLocaleDateString("en-IN") : "N/A"}</span>
                                  </span>
                                  <span className={`px-2.5 py-1 rounded-lg text-xs font-black uppercase tracking-wider ${
                                    lead.status === "Converted" ? "bg-emerald-100 text-emerald-800 border border-emerald-300" :
                                    lead.status === "Lost" ? "bg-rose-100 text-rose-800 border border-rose-300" :
                                    lead.status === "Assigned" ? "bg-blue-100 text-blue-800 border border-blue-300" :
                                    "bg-indigo-100 text-indigo-800 border border-indigo-300"
                                  }`}>
                                    Stage: {lead.status || "New"}
                                  </span>
                                </div>
                              </div>

                              {/* Grid: Assignment Audit Trail & Task Follow-ups */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                
                                {/* Left: Assignment Audit & Stage Record */}
                                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-3">
                                  <h5 className="text-[11px] font-black uppercase tracking-wider text-purple-900 flex items-center gap-1.5 border-b pb-2">
                                    <UserCheck className="w-3.5 h-3.5 text-purple-600" />
                                    Lead Assignment & Audit Trail
                                  </h5>

                                  <div className="space-y-2 text-xs">
                                    <div className="p-2.5 bg-purple-50/50 rounded-lg border border-purple-100 flex items-center justify-between">
                                      <div>
                                        <span className="text-[10px] font-bold text-slate-400 block uppercase">Assigned BDA User</span>
                                        <span className="font-extrabold text-slate-800">{lead.assignedToName || "Unassigned"}</span>
                                      </div>
                                      {lead.assignedBy && (
                                        <div className="text-right">
                                          <span className="text-[10px] font-bold text-slate-400 block uppercase">Assigned By</span>
                                          <span className="font-extrabold text-purple-700">{history?.lead?.assignedByName || lead.assignedBy}</span>
                                        </div>
                                      )}
                                    </div>

                                    {lead.assignedAt && (
                                      <div className="text-[11px] font-medium text-slate-600 flex items-center gap-1">
                                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                                        Assigned Date: <span className="font-bold text-slate-800">{new Date(lead.assignedAt).toLocaleString("en-IN")}</span>
                                      </div>
                                    )}

                                    {lead.salesReason && (
                                      <div className="text-[11px] font-medium text-slate-600">
                                        Sales Reason: <span className="font-bold text-slate-800">{lead.salesReason}</span>
                                      </div>
                                    )}

                                    {lead.remarks && (
                                      <div className="p-2 bg-slate-50 rounded-lg border border-slate-200 text-[11px]">
                                        <span className="font-bold text-slate-700 block">Lead Remarks:</span>
                                        <p className="text-slate-600 font-medium italic mt-0.5">{lead.remarks}</p>
                                      </div>
                                    )}

                                    {/* Converted Services Details if Converted */}
                                    {lead.status === "Converted" && (
                                      <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-200 space-y-1.5">
                                        <span className="text-[10px] font-black uppercase text-emerald-800 tracking-wider block">
                                          🎉 Client Converted Services Details:
                                        </span>
                                        <div className="text-xs font-bold text-emerald-900">
                                          Total Amount: ₹ {lead.convertedAmount ? lead.convertedAmount.toLocaleString('en-IN') : 0}
                                        </div>
                                      </div>
                                    )}

                                    {/* Lost Reason if Lost */}
                                    {lead.status === "Lost" && lead.lostReason && (
                                      <div className="p-2.5 bg-rose-50 rounded-xl border border-rose-200">
                                        <span className="text-[10px] font-black uppercase text-rose-800 tracking-wider block">
                                          ❌ Lost Reason:
                                        </span>
                                        <p className="text-xs font-bold text-rose-900 mt-1">{lead.lostReason}</p>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Right: Corresponding Task & Follow-up History */}
                                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-3">
                                  <h5 className="text-[11px] font-black uppercase tracking-wider text-indigo-900 flex items-center justify-between border-b pb-2">
                                    <span className="flex items-center gap-1.5">
                                      <History className="w-3.5 h-3.5 text-indigo-600" />
                                      Task Follow-up History ({history?.tasks?.length || 0})
                                    </span>
                                  </h5>

                                  {history?.loading ? (
                                    <div className="p-4 text-center text-slate-400 font-semibold italic flex items-center justify-center gap-2">
                                      <RefreshCw className="w-4 h-4 animate-spin text-purple-600" />
                                      Fetching task follow-up history...
                                    </div>
                                  ) : !history?.tasks || history.tasks.length === 0 ? (
                                    <div className="p-4 text-center text-slate-400 font-medium italic bg-slate-50 rounded-lg border border-dashed">
                                      No task follow-up logs recorded yet for this lead.
                                    </div>
                                  ) : (
                                    <div className="space-y-3 max-h-72 overflow-y-auto custom-scrollbar pr-1">
                                      {history.tasks.map((task: any, tIdx: number) => (
                                        <div key={tIdx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2.5 shadow-2xs">
                                          
                                          {/* Task Header */}
                                          <div className="flex flex-wrap items-center justify-between gap-1 border-b border-slate-200/70 pb-2">
                                            <div>
                                              <span className="font-extrabold text-indigo-900 block">{task.taskTitle || "Sales"} ({task.id})</span>
                                              <span className="text-[11px] font-bold text-slate-600">
                                                BDA User: <span className="text-purple-700">{task.employeeName}</span>
                                              </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                                task.status === "Completed" ? "bg-emerald-100 text-emerald-800 border border-emerald-300" :
                                                task.status === "In Progress" ? "bg-blue-100 text-blue-800 border border-blue-300" :
                                                "bg-amber-100 text-amber-800 border border-amber-300"
                                              }`}>
                                                {task.status || "Pending"}
                                              </span>
                                            </div>
                                          </div>

                                          {/* Latest Scheduled Date if set */}
                                          {task.scheduledAt && (
                                            <div className="p-2 bg-indigo-50/70 rounded-lg border border-indigo-100 flex items-center justify-between text-[11px]">
                                              <span className="font-bold text-indigo-900 flex items-center gap-1">
                                                <Clock className="w-3.5 h-3.5 text-indigo-600" /> Latest Scheduled Follow-up:
                                              </span>
                                              <span className="font-extrabold text-indigo-800 font-mono">
                                                {new Date(task.scheduledAt).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true })}
                                              </span>
                                            </div>
                                          )}

                                          {/* Scheduled Follow-ups History List */}
                                          {Array.isArray(task.followUpHistory) && task.followUpHistory.length > 0 && (
                                            <div className="space-y-1.5 bg-white p-2.5 rounded-lg border border-slate-200">
                                              <span className="text-[10px] uppercase font-black tracking-wider text-purple-700 block">
                                                📅 Scheduled Follow-ups History ({task.followUpHistory.length}):
                                              </span>
                                              <div className="space-y-1.5">
                                                {task.followUpHistory.map((h: any, hIdx: number) => (
                                                  <div key={h.id || hIdx} className="p-2 bg-purple-50/60 rounded-md border border-purple-100 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px] font-semibold text-slate-800">
                                                    <span className="flex items-center gap-1.5 font-mono">
                                                      <Clock className="w-3 h-3 text-purple-600 shrink-0" />
                                                      {h.scheduledAt || h.createdAt ? new Date(h.scheduledAt || h.createdAt).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true }) : "N/A"}
                                                    </span>
                                                    <span className="text-[9px] font-black uppercase text-purple-800 bg-purple-100 px-2 py-0.5 rounded-full border border-purple-200 w-fit">
                                                      BY {h.userName || "System"}
                                                    </span>
                                                  </div>
                                                ))}
                                              </div>
                                            </div>
                                          )}

                                          {/* Progress Notes History Timeline */}
                                          {(() => {
                                            const notes = parseTaskProgressNotes(task.progressNotes);
                                            if (notes.length === 0) return null;

                                            return (
                                              <div className="text-[11px] text-slate-700 bg-white p-2.5 rounded-lg border border-slate-200 space-y-1.5">
                                                <span className="font-extrabold text-slate-900 flex items-center gap-1.5 border-b border-slate-100 pb-1">
                                                  <FileText className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                                                  Progress Notes History ({notes.length}):
                                                </span>
                                                <div className="space-y-1.5">
                                                  {notes.map((n: any, nIdx: number) => (
                                                    <div key={n.id || nIdx} className="p-2 bg-slate-50/70 rounded-md border border-slate-100 space-y-0.5">
                                                      <div className="flex items-center justify-between text-[10px]">
                                                        <span className="font-bold text-indigo-800">{n.userName || task.employeeName || "User"}</span>
                                                        {n.createdAt && (
                                                          <span className="text-slate-400 font-mono">
                                                            {new Date(n.createdAt).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: true })}
                                                          </span>
                                                        )}
                                                      </div>
                                                      <p className="text-slate-700 font-medium whitespace-pre-wrap leading-relaxed">
                                                        {n.note || (typeof n === 'string' ? n : '')}
                                                      </p>
                                                    </div>
                                                  ))}
                                                </div>
                                              </div>
                                            );
                                          })()}

                                          {/* Proof of Work / Attachments (Multiple Supported & Fully Viewable) */}
                                          {(() => {
                                            const attachments = parseTaskAttachments(task.proofAttachment);
                                            if (attachments.length === 0) return null;

                                            return (
                                              <div className="p-2.5 bg-white rounded-lg border border-purple-200 space-y-2">
                                                <span className="text-[10px] font-black uppercase tracking-wider text-purple-800 flex items-center gap-1">
                                                  <Paperclip className="w-3.5 h-3.5 text-purple-600" />
                                                  Proof of Work / Attachments ({attachments.length}):
                                                </span>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                  {attachments.map((att: any, attIdx: number) => {
                                                    const rawUrl = att.url || "";
                                                    const fixedUrl = fixAudioDataUrl(rawUrl, att.name, att.type);
                                                    const isAudio = fixedUrl.startsWith("data:audio") || rawUrl.endsWith(".mp3") || rawUrl.endsWith(".m4a") || rawUrl.endsWith(".aac");
                                                    const isImage = fixedUrl.startsWith("data:image") || rawUrl.match(/\.(png|jpe?g|gif|webp|svg)($|\?)/i);

                                                    return (
                                                      <div key={attIdx} className="p-2 bg-purple-50/50 rounded-lg border border-purple-100 space-y-1">
                                                        <span className="text-[10px] font-bold text-slate-700 block truncate" title={att.name || "Attachment"}>
                                                          {att.name || `Attachment #${attIdx + 1}`}
                                                        </span>

                                                        {isAudio ? (
                                                          <audio controls className="w-full h-8 mt-1 rounded-lg">
                                                            <source src={fixedUrl} />
                                                          </audio>
                                                        ) : isImage ? (
                                                          <div className="space-y-1">
                                                            <img
                                                              src={fixedUrl}
                                                              alt={att.name || "Proof Image"}
                                                              className="w-full h-28 object-cover rounded-md border border-slate-200 cursor-pointer hover:opacity-90 transition-opacity shadow-2xs"
                                                              onClick={() => setPreviewImage({ url: fixedUrl, title: att.name || "Proof Image" })}
                                                            />
                                                            <div className="flex items-center gap-2 pt-0.5">
                                                              <button
                                                                type="button"
                                                                onClick={() => setPreviewImage({ url: fixedUrl, title: att.name || "Proof Image" })}
                                                                className="text-[10px] font-bold text-purple-700 hover:underline flex items-center gap-1 cursor-pointer"
                                                              >
                                                                <Eye className="w-3 h-3 text-purple-600" /> View Full Image
                                                              </button>
                                                              <button
                                                                type="button"
                                                                onClick={() => openBlobInNewTab(fixedUrl)}
                                                                className="text-[10px] font-bold text-indigo-600 hover:underline flex items-center gap-1 cursor-pointer"
                                                              >
                                                                <Download className="w-3 h-3 text-indigo-500" /> Open in New Tab
                                                              </button>
                                                            </div>
                                                          </div>
                                                        ) : (
                                                          <button
                                                            type="button"
                                                            onClick={() => openBlobInNewTab(fixedUrl)}
                                                            className="text-xs font-bold text-purple-700 hover:underline flex items-center gap-1.5 pt-0.5 cursor-pointer"
                                                          >
                                                            <Paperclip className="w-3.5 h-3.5 text-purple-600" /> View / Download Attachment
                                                          </button>
                                                        )}
                                                      </div>
                                                    );
                                                  })}
                                                </div>
                                              </div>
                                            );
                                          })()}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>

                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: BULK IMPORT WIZARD (WITH DYNAMIC COLUMN MAPPER) */}
      {/* ========================================================================= */}
      {showImportModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 space-y-4 border border-slate-200 shadow-2xl animate-fade-in max-h-[92vh] flex flex-col">

            {/* Modal Header & Steps Indicator */}
            <div className="flex justify-between items-center pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">
                    Dynamic Bulk Lead Import Wizard
                  </h3>
                  <p className="text-xs font-semibold text-slate-500">
                    Supports ANY Excel/CSV file layout with interactive column mapping
                  </p>
                </div>
              </div>
              <button
                onClick={() => { setShowImportModal(false); setImportStep("upload"); setRawRows([]); setMappedData([]); setImportFileName(""); }}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Step Wizard Indicator */}
            <div className="flex items-center justify-center gap-4 text-xs font-bold py-1 bg-slate-50 rounded-xl border border-slate-200">
              <span className={`flex items-center gap-1.5 px-3 py-1 rounded-lg ${importStep === "upload" ? "bg-emerald-600 text-white shadow-sm" : "text-slate-500"}`}>
                1. Upload File
              </span>
              <ChevronRight className="w-4 h-4 text-slate-400" />
              <span className={`flex items-center gap-1.5 px-3 py-1 rounded-lg ${importStep === "map" ? "bg-emerald-600 text-white shadow-sm" : "text-slate-500"}`}>
                2. Map File Columns
              </span>
              <ChevronRight className="w-4 h-4 text-slate-400" />
              <span className={`flex items-center gap-1.5 px-3 py-1 rounded-lg ${importStep === "preview" ? "bg-emerald-600 text-white shadow-sm" : "text-slate-500"}`}>
                3. Preview & Confirm
              </span>
            </div>

            {/* STEP 1: FILE UPLOAD */}
            {importStep === "upload" && (
              <div className="border-2 border-dashed border-emerald-300 hover:border-emerald-500 bg-emerald-50/40 rounded-2xl p-8 text-center space-y-3 transition-colors cursor-pointer"
                onClick={() => fileInputRef.current?.click()}>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".xlsx, .xls, .csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <FileSpreadsheet className="w-12 h-12 text-emerald-600 mx-auto" />
                <div>
                  <p className="text-sm font-extrabold text-slate-800">
                    {importFileName ? importFileName : "Click to choose Excel / CSV file"}
                  </p>
                  <p className="text-xs font-semibold text-slate-500 mt-1">
                    Upload ANY layout Excel (.xlsx, .xls) or CSV file. You will map columns in the next step!
                  </p>
                </div>
              </div>
            )}

            {/* STEP 2: DYNAMIC COLUMN MAPPER */}
            {importStep === "map" && (
              <div className="space-y-4 flex-1 overflow-auto">
                <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl text-xs font-bold text-emerald-900 flex items-center justify-between">
                  <span>📄 File Uploaded: <strong>{importFileName}</strong> ({rawRows.length} Rows Found)</span>
                  <span className="text-[11px] bg-emerald-200 px-2 py-0.5 rounded text-emerald-800">Smart Headers Detected</span>
                </div>

                <p className="text-xs font-bold text-slate-600">
                  Select which column in your uploaded file matches each standard Lead field:
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-bold">

                  {/* Contact Name */}
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                    <label className="block text-[10px] font-black uppercase text-slate-600">
                      👤 Contact / Client Name Field *
                    </label>
                    <select
                      value={columnMapping.name}
                      onChange={e => setColumnMapping({ ...columnMapping, name: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-lg p-2 font-bold text-slate-800 focus:outline-none focus:border-emerald-600"
                    >
                      <option value="">-- Do Not Map / Auto --</option>
                      {rawHeaders.map(h => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>

                  {/* Phone */}
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                    <label className="block text-[10px] font-black uppercase text-slate-600">
                      📱 Phone / Mobile Field
                    </label>
                    <select
                      value={columnMapping.phone}
                      onChange={e => setColumnMapping({ ...columnMapping, phone: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-lg p-2 font-bold text-slate-800 focus:outline-none focus:border-emerald-600"
                    >
                      <option value="">-- Do Not Map --</option>
                      {rawHeaders.map(h => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>

                  {/* Company Name */}
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                    <label className="block text-[10px] font-black uppercase text-slate-600">
                      🏢 Company / Business Name Field
                    </label>
                    <select
                      value={columnMapping.companyName}
                      onChange={e => setColumnMapping({ ...columnMapping, companyName: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-lg p-2 font-bold text-slate-800 focus:outline-none focus:border-emerald-600"
                    >
                      <option value="">-- Do Not Map --</option>
                      {rawHeaders.map(h => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>

                  {/* Email */}
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                    <label className="block text-[10px] font-black uppercase text-slate-600">
                      📧 Email Address Field
                    </label>
                    <select
                      value={columnMapping.email}
                      onChange={e => setColumnMapping({ ...columnMapping, email: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-lg p-2 font-bold text-slate-800 focus:outline-none focus:border-emerald-600"
                    >
                      <option value="">-- Do Not Map --</option>
                      {rawHeaders.map(h => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>

                  {/* City / Location */}
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                    <label className="block text-[10px] font-black uppercase text-slate-600">
                      📍 City / Location Field
                    </label>
                    <select
                      value={columnMapping.city}
                      onChange={e => setColumnMapping({ ...columnMapping, city: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-lg p-2 font-bold text-slate-800 focus:outline-none focus:border-emerald-600"
                    >
                      <option value="">-- Do Not Map --</option>
                      {rawHeaders.map(h => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>

                  {/* Sales Reason */}
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                    <label className="block text-[10px] font-black uppercase text-slate-600">
                      📋 Sales Reason / Purpose Field
                    </label>
                    <select
                      value={columnMapping.salesReason}
                      onChange={e => setColumnMapping({ ...columnMapping, salesReason: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-lg p-2 font-bold text-slate-800 focus:outline-none focus:border-emerald-600"
                    >
                      <option value="">-- Default to "Pitching" --</option>
                      {rawHeaders.map(h => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Preserve Extra Unmapped Columns */}
                <div className="flex items-center gap-2 p-3 bg-purple-50 border border-purple-200 rounded-xl text-xs font-bold text-purple-900">
                  <input
                    type="checkbox"
                    id="saveExtra"
                    checked={saveExtraColumns}
                    onChange={e => setSaveExtraColumns(e.target.checked)}
                    className="w-4 h-4 text-purple-600 rounded cursor-pointer"
                  />
                  <label htmlFor="saveExtra" className="cursor-pointer">
                    Save all unmapped extra columns (e.g. Budget, GST, Campaign, Notes) in Lead Details view (Zero Data Loss)
                  </label>
                </div>
              </div>
            )}

            {/* STEP 3: PREVIEW GRID & CONFIRMATION */}
            {importStep === "preview" && (
              <div className="flex-1 overflow-hidden flex flex-col space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-black text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-lg">
                    Preview: {mappedData.length} Mapped Lead Rows Ready to Import
                  </span>
                  <span className="text-[11px] font-semibold text-slate-500">Review mapped columns before database insertion</span>
                </div>

                <div className="flex-1 border border-slate-200 rounded-xl overflow-auto max-h-60">
                  <table className="w-full text-left text-xs font-semibold border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-[10px] font-black uppercase text-slate-500">
                        <th className="p-2 border-b">#</th>
                        <th className="p-2 border-b">Contact Name</th>
                        <th className="p-2 border-b">Phone</th>
                        <th className="p-2 border-b">Email</th>
                        <th className="p-2 border-b">Company</th>
                        <th className="p-2 border-b">City</th>
                        <th className="p-2 border-b">Reason</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {mappedData.slice(0, 100).map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="p-2 font-mono text-slate-400">{idx + 1}</td>
                          <td className="p-2 font-bold text-slate-900">{row.name || "N/A"}</td>
                          <td className="p-2 text-slate-700">{row.phone || "N/A"}</td>
                          <td className="p-2 text-slate-600">{row.email || "N/A"}</td>
                          <td className="p-2 text-slate-800">{row.companyName || "N/A"}</td>
                          <td className="p-2 text-slate-600">{row.city || "N/A"}</td>
                          <td className="p-2 text-slate-600">{row.salesReason || "Pitching"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Modal Navigation Actions */}
            <div className="flex justify-between items-center pt-3 border-t border-slate-200">
              <div>
                {importStep === "map" && (
                  <button
                    type="button"
                    onClick={() => setImportStep("upload")}
                    className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl"
                  >
                    ← Back to File Selection
                  </button>
                )}
                {importStep === "preview" && (
                  <button
                    type="button"
                    onClick={() => setImportStep("map")}
                    className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl"
                  >
                    ← Back to Column Mapping
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => { setShowImportModal(false); setImportStep("upload"); setRawRows([]); setMappedData([]); setImportFileName(""); }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl"
                >
                  Cancel
                </button>

                {importStep === "map" && (
                  <button
                    type="button"
                    onClick={handleGenerateMappingPreview}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-1"
                  >
                    Generate Preview →
                  </button>
                )}

                {importStep === "preview" && (
                  <button
                    type="button"
                    disabled={mappedData.length === 0 || isImporting}
                    onClick={handleConfirmImport}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {isImporting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                    Confirm & Save {mappedData.length} Leads to DB
                  </button>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: BULK ASSIGN LEADS TO BDA (WITH AUTO TASK CREATION) */}
      {/* ========================================================================= */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 border border-slate-200 shadow-2xl animate-fade-in">
            <div className="flex justify-between items-center pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-purple-100 text-purple-800 rounded-xl">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">
                    {selectedIds.length === 1 ? "Assign Lead to BDA" : "Bulk Assign to BDA"}
                  </h3>
                  <p className="text-xs font-semibold text-slate-500">Auto-create task for assigned BDA</p>
                </div>
              </div>
              <button
                onClick={() => setShowAssignModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl text-xs font-bold text-purple-900">
              {selectedIds.length === 1 ? (
                (() => {
                  const singleLead = leads.find(l => l.id === selectedIds[0]);
                  return (
                    <div>
                      ⚡ Assigning lead <strong>{singleLead?.leadId || `ID #${selectedIds[0]}`}</strong>
                      {singleLead?.name ? ` (${singleLead.name})` : ""}. Automatic Sales Task will be created in the selected BDA's My Tasks!
                    </div>
                  );
                })()
              ) : (
                `⚡ Selected ${selectedIds.length} lead(s) will be assigned and automatic Sales Tasks will be seeded in the target BDA's My Tasks Kanban board!`
              )}
            </div>

            {/* Select BDA Dropdown */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-600">
                  Select BDA / Sales Team Member *
                </label>
                <button
                  type="button"
                  onClick={() => setShowAllEmployees(!showAllEmployees)}
                  className="text-[10px] font-bold text-purple-700 hover:underline bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200"
                >
                  {showAllEmployees ? "Show BDA Users Only" : "Show All Employees"}
                </button>
              </div>

              <select
                value={targetBdaId}
                onChange={(e) => setTargetBdaId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-extrabold text-slate-800 focus:outline-none focus:border-purple-600"
              >
                <option value="">-- Choose BDA User ({finalBdaList.length}) --</option>
                {finalBdaList.map((bda) => (
                  <option key={bda.id} value={bda.id}>
                    {bda.name} ({bda.role}) - {bda.email}
                  </option>
                ))}
              </select>
            </div>

            {/* Modal Actions */}
            <div className="flex justify-end items-center gap-2 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setShowAssignModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!targetBdaId || isAssigning}
                onClick={handleConfirmBulkAssign}
                className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl shadow-md disabled:opacity-50 flex items-center gap-1.5"
              >
                {isAssigning ? <RefreshCw className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                Assign Leads & Create Tasks
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MASTER MODAL: VIEW & IN-CONTEXT EDIT LEAD DETAILS & STAGES */}
      {/* ========================================================================= */}
      {showDetailsModal && activeLead && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 space-y-4 border border-slate-200 shadow-2xl animate-fade-in max-h-[90vh] overflow-y-auto">

            {/* Modal Header */}
            <div className="flex justify-between items-center pb-3 border-b border-slate-200">
              <div>
                <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-purple-600" />
                  Lead Details & Management ({activeLead.leadId})
                </h3>
                <p className="text-xs font-semibold text-slate-500">Source: {activeLead.source || "Excel Import"}</p>
              </div>
              <button onClick={() => setShowDetailsModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* CARD 1: BASIC LEAD INFO & STATUS */}
            <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <User className="w-4 h-4 text-purple-600" />
                  Basic Information & Status
                </h4>
                <button
                  type="button"
                  onClick={() => setIsEditingInfo(!isEditingInfo)}
                  className={`text-[11px] font-black px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1 cursor-pointer ${
                    isEditingInfo ? "bg-purple-600 text-white border-purple-600" : "bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100"
                  }`}
                >
                  <Edit className="w-3 h-3" />
                  {isEditingInfo ? "Done Editing Info" : "Edit Info"}
                </button>
              </div>

              {!isEditingInfo ? (
                /* READ-ONLY VIEW GRID */
                <div className="grid grid-cols-2 gap-3 text-xs font-bold">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-black block">Contact Person</span>
                    <span className="text-slate-900 text-sm">{activeLead.name}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-black block">Phone / Mobile</span>
                    <span className="text-slate-800">{activeLead.phone || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-black block">Company Name</span>
                    <span className="text-slate-800">{activeLead.companyName || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-black block">Email Address</span>
                    <span className="text-slate-800">{activeLead.email || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-black block">City / Location</span>
                    <span className="text-slate-800">{activeLead.city || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-black block">Sales Purpose</span>
                    <span className="text-slate-800">{activeLead.salesReason || "Pitching"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-black block">Assigned BDA</span>
                    <span className="text-blue-700">{activeLead.assignedToName || "Unassigned"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-black block">Status</span>
                    <span className={`px-2 py-0.5 rounded text-[11px] font-extrabold ${
                      activeLead.status === "Converted" ? "bg-emerald-100 text-emerald-800" :
                      activeLead.status === "Lost" ? "bg-rose-100 text-rose-800" :
                      "bg-purple-100 text-purple-800"
                    }`}>
                      {activeLead.status}
                    </span>
                  </div>
                </div>
              ) : (
                /* INLINE EDIT FORM FIELDS */
                <div className="space-y-3 text-xs font-semibold">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-600 mb-1">Contact Person Name *</label>
                      <input
                        type="text"
                        required
                        value={activeLead.name || ""}
                        onChange={e => setActiveLead({ ...activeLead, name: e.target.value })}
                        className="w-full bg-white border border-purple-300 rounded-xl p-2 font-bold text-slate-900 focus:outline-none focus:border-purple-600"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-600 mb-1">Phone / Mobile</label>
                      <input
                        type="text"
                        value={activeLead.phone || ""}
                        onChange={e => setActiveLead({ ...activeLead, phone: e.target.value })}
                        className="w-full bg-white border border-purple-300 rounded-xl p-2 font-bold text-slate-900 focus:outline-none focus:border-purple-600"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-600 mb-1">Email Address</label>
                      <input
                        type="email"
                        value={activeLead.email || ""}
                        onChange={e => setActiveLead({ ...activeLead, email: e.target.value })}
                        className="w-full bg-white border border-purple-300 rounded-xl p-2 font-bold text-slate-900 focus:outline-none focus:border-purple-600"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-600 mb-1">Company Name</label>
                      <input
                        type="text"
                        value={activeLead.companyName || ""}
                        onChange={e => setActiveLead({ ...activeLead, companyName: e.target.value })}
                        className="w-full bg-white border border-purple-300 rounded-xl p-2 font-bold text-slate-900 focus:outline-none focus:border-purple-600"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-600 mb-1">City / Location</label>
                      <input
                        type="text"
                        value={activeLead.city || ""}
                        onChange={e => setActiveLead({ ...activeLead, city: e.target.value })}
                        className="w-full bg-white border border-purple-300 rounded-xl p-2 font-bold text-slate-900 focus:outline-none focus:border-purple-600"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-600 mb-1">Sales Reason / Purpose</label>
                      <select
                        value={["Pitching", "Follow Up", "Client Meeting", "Proposal Shared"].includes(activeLead.salesReason || "") ? activeLead.salesReason : "Other"}
                        onChange={e => {
                          const val = e.target.value;
                          if (val === "Other") {
                            setActiveLead({ ...activeLead, salesReason: "Other" });
                          } else {
                            setActiveLead({ ...activeLead, salesReason: val });
                          }
                        }}
                        className="w-full bg-white border border-purple-300 rounded-xl p-2 font-bold text-slate-900 focus:outline-none focus:border-purple-600"
                      >
                        <option value="Pitching">Pitching</option>
                        <option value="Follow Up">Follow Up</option>
                        <option value="Client Meeting">Client Meeting</option>
                        <option value="Proposal Shared">Proposal Shared</option>
                        <option value="Other">Other</option>
                      </select>

                      {(!["Pitching", "Follow Up", "Client Meeting", "Proposal Shared"].includes(activeLead.salesReason || "") || activeLead.salesReason === "Other") && (
                        <input
                          type="text"
                          placeholder="Specify custom sales reason / purpose..."
                          value={activeLead.salesReason === "Other" ? "" : activeLead.salesReason}
                          onChange={e => setActiveLead({ ...activeLead, salesReason: e.target.value || "Other" })}
                          className="w-full bg-white border border-purple-300 rounded-xl p-2 mt-2 font-bold text-slate-900 focus:outline-none focus:border-purple-600 animate-fade-in"
                        />
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-600 mb-1">Lead Status</label>
                      <select
                        value={activeLead.status}
                        onChange={e => setActiveLead({ ...activeLead, status: e.target.value })}
                        className="w-full bg-white border border-purple-300 rounded-xl p-2 font-extrabold text-slate-900 focus:outline-none focus:border-purple-600"
                      >
                        <option value="New">New</option>
                        <option value="Assigned">Assigned</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Qualified">Qualified</option>
                        <option value="Converted">Converted</option>
                        <option value="Lost">Lost</option>
                      </select>
                    </div>

                    {isManagerial && (
                      <div>
                        <label className="block text-[10px] font-black uppercase text-slate-600 mb-1">Assigned BDA</label>
                        <select
                          value={activeLead.assignedTo || ""}
                          onChange={e => {
                            const bdaId = e.target.value;
                            const bdaObj = finalBdaList.find(b => b.id === bdaId);
                            setActiveLead({
                              ...activeLead,
                              assignedTo: bdaId || undefined,
                              assignedToName: bdaObj ? bdaObj.name : undefined
                            });
                          }}
                          className="w-full bg-white border border-purple-300 rounded-xl p-2 font-extrabold text-slate-900 focus:outline-none focus:border-purple-600"
                        >
                          <option value="">-- Unassigned --</option>
                          {finalBdaList.map(bda => (
                            <option key={bda.id} value={bda.id}>
                              {bda.name} ({bda.role})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* CARD 2: CONVERTED SERVICES & TOTAL VALUE */}
            {(activeLead.convertedServicesJson || activeLead.status === "Converted" || isEditingServices) && (
              <div className="space-y-2.5 bg-emerald-50/70 border border-emerald-200 p-3.5 rounded-2xl">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-extrabold text-emerald-900 flex items-center gap-1.5">
                    <DollarSign className="w-4 h-4 text-emerald-600" />
                    Converted Services & Amount Breakdown
                  </h4>
                  <button
                    type="button"
                    onClick={() => setIsEditingServices(!isEditingServices)}
                    className={`text-[11px] font-black px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1 cursor-pointer ${
                      isEditingServices ? "bg-emerald-600 text-white border-emerald-600" : "bg-white text-emerald-800 border-emerald-300 hover:bg-emerald-100"
                    }`}
                  >
                    <Edit className="w-3 h-3" />
                    {isEditingServices ? "Done Editing Services" : "Edit Services"}
                  </button>
                </div>

                {!isEditingServices ? (
                  /* READ-ONLY TABLE VIEW */
                  <div className="space-y-2">
                    {(() => {
                      try {
                        const parsed = typeof activeLead.convertedServicesJson === "string" ? JSON.parse(activeLead.convertedServicesJson) : activeLead.convertedServicesJson;
                        const serviceList = Array.isArray(parsed) && parsed.length > 0 ? parsed : serviceRows.filter(r => r.serviceName.trim() !== "");
                        if (serviceList.length === 0) return <p className="text-xs italic text-emerald-700">No specific services added yet.</p>;

                        return (
                          <table className="w-full text-left text-xs font-semibold">
                            <thead>
                              <tr className="border-b border-emerald-200 text-[10px] uppercase font-black text-emerald-800">
                                <th className="pb-1.5">#</th>
                                <th className="pb-1.5">Service Name</th>
                                <th className="pb-1.5 text-right">Amount (₹)</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-emerald-100">
                              {serviceList.map((s: any, idx: number) => (
                                <tr key={idx}>
                                  <td className="py-1.5 font-mono text-emerald-700 text-[11px]">{idx + 1}</td>
                                  <td className="py-1.5 text-slate-900 font-extrabold">{s.serviceName}</td>
                                  <td className="py-1.5 text-right font-mono font-bold text-emerald-900">₹ {(parseFloat(s.amount) || 0).toLocaleString('en-IN')}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        );
                      } catch { return <p className="text-xs italic text-emerald-700">No services parsed.</p>; }
                    })()}

                    <div className="flex justify-between items-center bg-emerald-600 text-white p-2.5 rounded-xl font-bold text-xs shadow-sm mt-2">
                      <span>Total Conversion Value:</span>
                      <span className="text-sm font-black">₹ {(activeLead.convertedAmount || serviceRows.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0)).toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                ) : (
                  /* INTERACTIVE SERVICES EDIT BUILDER */
                  <div className="space-y-2 text-xs font-semibold">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black uppercase text-emerald-800">Add / Edit Services</span>
                      <button
                        type="button"
                        onClick={() => setServiceRows([...serviceRows, { serviceName: "", amount: "" }])}
                        className="text-[10px] font-extrabold bg-emerald-600 hover:bg-emerald-700 text-white px-2 py-0.5 rounded-md flex items-center gap-1 shadow-2xs cursor-pointer"
                      >
                        <Plus className="w-3 h-3" /> Add Row
                      </button>
                    </div>

                    {serviceRows.map((row, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="e.g. GST Filing"
                          value={row.serviceName}
                          onChange={(e) => {
                            const updated = [...serviceRows];
                            updated[idx].serviceName = e.target.value;
                            setServiceRows(updated);
                          }}
                          className="flex-1 bg-white border border-emerald-300 rounded-xl p-2 font-bold text-slate-900 focus:outline-none focus:border-emerald-600"
                        />
                        <div className="relative w-32 shrink-0">
                          <span className="absolute left-2.5 top-2 text-xs font-bold text-emerald-700">₹</span>
                          <input
                            type="number"
                            placeholder="Amount"
                            value={row.amount}
                            onChange={(e) => {
                              const updated = [...serviceRows];
                              updated[idx].amount = e.target.value;
                              setServiceRows(updated);
                            }}
                            className="w-full pl-6 bg-white border border-emerald-300 rounded-xl p-2 font-bold text-slate-900 focus:outline-none focus:border-emerald-600"
                          />
                        </div>
                        {serviceRows.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setServiceRows(serviceRows.filter((_, i) => i !== idx))}
                            className="text-rose-500 hover:text-rose-700 p-1"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}

                    <div className="flex justify-between items-center bg-emerald-600 text-white p-2 rounded-xl font-bold text-xs shadow-xs mt-1">
                      <span>Total Value:</span>
                      <span className="text-sm font-black">
                        ₹ {serviceRows.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0).toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* CARD 3: REASON FOR LOST LEAD */}
            {(activeLead.lostReason || activeLead.status === "Lost" || isEditingLost) && (
              <div className="space-y-2 bg-rose-50 border border-rose-200 p-3.5 rounded-2xl">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-extrabold text-rose-900 flex items-center gap-1.5">
                    <XCircle className="w-4 h-4 text-rose-600" />
                    Reason for Lost Lead
                  </h4>
                  <button
                    type="button"
                    onClick={() => setIsEditingLost(!isEditingLost)}
                    className={`text-[11px] font-black px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1 cursor-pointer ${
                      isEditingLost ? "bg-rose-600 text-white border-rose-600" : "bg-white text-rose-800 border-rose-300 hover:bg-rose-100"
                    }`}
                  >
                    <Edit className="w-3 h-3" />
                    {isEditingLost ? "Done Editing Reason" : "Edit Reason"}
                  </button>
                </div>

                {!isEditingLost ? (
                  <p className="text-xs font-semibold text-rose-800 bg-white p-2.5 rounded-xl border border-rose-200">
                    {activeLead.lostReason || statusLostReason || "No lost reason specified."}
                  </p>
                ) : (
                  <textarea
                    rows={2}
                    placeholder="Specify why lead was lost (e.g. Price high, Chosen competitor)..."
                    value={statusLostReason}
                    onChange={(e) => setStatusLostReason(e.target.value)}
                    className="w-full bg-white border border-rose-300 rounded-xl p-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-rose-600"
                  />
                )}
              </div>
            )}

            {/* CARD 4: ATTACHMENTS & AUDIO RECORDINGS */}
            {(statusAttachments.length > 0 || activeLead.attachmentsJson || activeLead.status === "Converted" || activeLead.status === "Lost" || isEditingAtts) && (
              <div className="space-y-2.5 bg-slate-50 border border-slate-200 p-3.5 rounded-2xl">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                    <Paperclip className="w-4 h-4 text-purple-600" />
                    Attachments & Audio Recordings ({statusAttachments.length})
                  </h4>
                  <button
                    type="button"
                    onClick={() => setIsEditingAtts(!isEditingAtts)}
                    className={`text-[11px] font-black px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1 cursor-pointer ${
                      isEditingAtts ? "bg-purple-600 text-white border-purple-600" : "bg-white text-purple-800 border-purple-300 hover:bg-purple-100"
                    }`}
                  >
                    <Edit className="w-3 h-3" />
                    {isEditingAtts ? "Done Editing Recordings" : "Add / Edit Recordings"}
                  </button>
                </div>

                {isEditingAtts && (
                  <div className="flex justify-end pb-1">
                    <input
                      type="file"
                      ref={statusFileInputRef}
                      onChange={handleStatusFileUpload}
                      className="hidden"
                      accept="audio/*,.aac,.mp3,.wav,.m4a,image/*,.pdf"
                    />
                    <button
                      type="button"
                      onClick={() => statusFileInputRef.current?.click()}
                      className="text-[10px] font-extrabold bg-purple-600 hover:bg-purple-700 text-white px-2.5 py-1 rounded-lg flex items-center gap-1 shadow-2xs cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      Add Attachment / Call Recording
                    </button>
                  </div>
                )}

                {statusAttachments.length > 0 ? (
                  <div className="space-y-2 max-h-56 overflow-y-auto">
                    {statusAttachments.map((att, idx) => {
                      const isAudio = att.type?.includes("audio") || att.name?.endsWith(".aac") || att.name?.endsWith(".mp3") || att.name?.endsWith(".wav") || att.name?.endsWith(".m4a");
                      const isImage = att.type?.includes("image") || att.name?.endsWith(".png") || att.name?.endsWith(".jpg") || att.name?.endsWith(".jpeg");

                      return (
                        <div key={idx} className="bg-white p-3 rounded-xl border border-slate-200 space-y-1.5 shadow-sm">
                          <div className="flex justify-between items-center text-xs font-bold">
                            <span className="flex items-center gap-1.5 truncate max-w-[280px]">
                              {isAudio ? <Mic className="w-4 h-4 text-purple-600 shrink-0" /> : isImage ? <FileText className="w-4 h-4 text-emerald-600 shrink-0" /> : <Paperclip className="w-4 h-4 text-blue-600 shrink-0" />}
                              <span className="truncate text-slate-900">{att.name}</span>
                            </span>
                            <div className="flex items-center gap-1.5">
                              <a
                                href={att.url}
                                download={att.name}
                                className="text-[11px] font-bold text-purple-700 hover:underline bg-purple-50 px-2 py-0.5 rounded border border-purple-200"
                              >
                                Download
                              </a>
                              {isEditingAtts && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveAttachment(idx)}
                                  className="text-slate-400 hover:text-rose-600 p-1"
                                  title="Remove Attachment"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Audio Player */}
                          {isAudio && (() => {
                            const playableUrl = att.blobUrl || fixAudioDataUrl(att.url, att.name, att.type);
                            const ext = (att.name || "").split('.').pop()?.toLowerCase() || '';
                            const audioType = att.type?.includes("audio") ? att.type : (ext === 'aac' ? 'audio/aac' : ext === 'm4a' ? 'audio/mp4' : 'audio/mpeg');

                            return (
                              <div className="bg-purple-50 p-2.5 rounded-lg border border-purple-100 space-y-1">
                                <audio
                                  key={playableUrl.slice(0, 80) + idx}
                                  controls
                                  preload="metadata"
                                  src={playableUrl}
                                  className="w-full h-9 text-xs"
                                >
                                  <source src={playableUrl} type={audioType} />
                                  <source src={playableUrl} type="audio/aac" />
                                  <source src={playableUrl} type="audio/mp4" />
                                  <source src={playableUrl} type="audio/mpeg" />
                                  Your browser does not support audio playback.
                                </audio>
                              </div>
                            );
                          })()}

                          {/* Image Preview */}
                          {isImage && (
                            <a href={att.url} target="_blank" rel="noopener noreferrer">
                              <img src={att.url} alt={att.name} className="h-24 object-cover rounded-lg border border-slate-200 hover:opacity-95 transition-opacity" />
                            </a>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs italic text-slate-500">No attachments uploaded.</p>
                )}
              </div>
            )}

            {/* CARD 5: REMARKS & ACTIVITY NOTES */}
            <div className="space-y-2 bg-slate-50 border border-slate-200 p-3.5 rounded-2xl">
              <div className="flex justify-between items-center">
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-purple-600" />
                  Remarks & Details
                </h4>
                <button
                  type="button"
                  onClick={() => setIsEditingRemarks(!isEditingRemarks)}
                  className={`text-[11px] font-black px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1 cursor-pointer ${
                    isEditingRemarks ? "bg-purple-600 text-white border-purple-600" : "bg-white text-purple-800 border-purple-300 hover:bg-purple-100"
                  }`}
                >
                  <Edit className="w-3 h-3" />
                  {isEditingRemarks ? "Done Editing Remarks" : "Edit Remarks"}
                </button>
              </div>

              {!isEditingRemarks ? (
                <p className="text-xs font-bold text-slate-800 bg-white p-2.5 rounded-xl border border-slate-200">
                  {activeLead.remarks || "No additional remarks."}
                </p>
              ) : (
                <textarea
                  rows={2}
                  value={activeLead.remarks || ""}
                  onChange={e => setActiveLead({ ...activeLead, remarks: e.target.value })}
                  className="w-full bg-white border border-purple-300 rounded-xl p-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-purple-600"
                />
              )}
            </div>

            {/* Raw Unmapped Extra Columns from Excel/CSV File */}
            {activeLead.rawExtraJson && (
              <div className="space-y-2">
                <h4 className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-emerald-600" />
                  Preserved Extra Columns from Uploaded File
                </h4>
                <div className="bg-emerald-50/60 border border-emerald-200 p-3 rounded-2xl max-h-48 overflow-y-auto">
                  <table className="w-full text-left text-xs font-semibold">
                    <thead>
                      <tr className="border-b border-emerald-200 text-[10px] uppercase font-black text-emerald-800">
                        <th className="pb-1.5">Excel Column Header</th>
                        <th className="pb-1.5">Value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-emerald-100">
                      {(() => {
                        try {
                          const parsed = typeof activeLead.rawExtraJson === "string" ? JSON.parse(activeLead.rawExtraJson) : activeLead.rawExtraJson;
                          return Object.entries(parsed).map(([key, val]) => (
                            <tr key={key}>
                              <td className="py-1.5 text-slate-600 font-mono text-[11px]">{key}</td>
                              <td className="py-1.5 text-slate-900 font-bold">{String(val || "N/A")}</td>
                            </tr>
                          ));
                        } catch { return <tr><td colSpan={2}>Raw data format error</td></tr>; }
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* MASTER FOOTER ACTIONS */}
            <div className="flex justify-end items-center gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={async () => {
                  try {
                    const cleanedServices = serviceRows.filter(r => r.serviceName.trim() !== "");
                    const finalConvertedServicesJson = JSON.stringify(cleanedServices);
                    const finalConvertedAmount = cleanedServices.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);

                    const sanitizedAtts = statusAttachments.map(att => ({
                      name: att.name,
                      type: att.type,
                      url: att.url,
                      size: att.size
                    }));

                    const updatedPayload = {
                      ...activeLead,
                      convertedServicesJson: finalConvertedServicesJson,
                      convertedAmount: finalConvertedAmount,
                      lostReason: statusLostReason,
                      attachmentsJson: JSON.stringify(sanitizedAtts)
                    };

                    const res = await fetch("/api/bda-leads", {
                      method: "PUT",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify(updatedPayload)
                    });
                    const data = await res.json();
                    if (data.success) {
                      triggerToast?.("✅ Lead & corresponding Task updated successfully in DB!");
                      setShowDetailsModal(false);
                      fetchLeads();
                    } else {
                      triggerToast?.("Failed to update lead: " + data.error);
                    }
                  } catch (err: any) {
                    console.error(err);
                    triggerToast?.("Update failed: " + err.message);
                  }
                }}
                className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
              >
                <Edit className="w-4 h-4" />
                Save & Update Lead & Sync Task
              </button>

              <button
                onClick={() => setShowDetailsModal(false)}
                className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: CONVERTED / LOST STATUS ACTION POPUP */}
      {/* ========================================================================= */}
      {showStatusActionModal && targetStatusLead && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 space-y-4 border border-slate-200 shadow-2xl animate-fade-in max-h-[92vh] flex flex-col">

            {/* Header */}
            <div className="flex justify-between items-center pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <div className={`p-2.5 rounded-2xl text-white shadow-md ${targetNewStatus === "Converted" ? "bg-emerald-600" : "bg-rose-600"}`}>
                  {targetNewStatus === "Converted" ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">
                    Mark Lead as {targetNewStatus} ({targetStatusLead.leadId})
                  </h3>
                  <p className="text-xs font-semibold text-slate-500">
                    {targetNewStatus === "Converted"
                      ? "Add converted services, amounts & recordings/documents"
                      : "Record loss reason & attachments"}
                  </p>
                </div>
              </div>
              <button onClick={() => setShowStatusActionModal(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveStatusActionModal} className="space-y-4 flex-1 overflow-y-auto pr-1 text-xs font-semibold">

              {/* Lead Summary Header Card */}
              <div className="bg-slate-50 border border-slate-200 p-3 rounded-2xl flex items-center justify-between text-xs">
                <div>
                  <span className="text-[10px] uppercase font-black text-slate-400 block">Client / Company</span>
                  <span className="font-extrabold text-slate-900">{targetStatusLead.name}</span>
                  {targetStatusLead.companyName && <span className="text-slate-500 ml-1.5">({targetStatusLead.companyName})</span>}
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-black text-slate-400 block">Current Status</span>
                  <span className="font-bold text-purple-700">{targetStatusLead.status}</span>
                </div>
              </div>

              {/* CONVERTED FIELDS: MULTIPLE SERVICES BUILDER */}
              {targetNewStatus === "Converted" && (
                <div className="space-y-3 bg-emerald-50/50 border border-emerald-200 p-4 rounded-2xl">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-extrabold text-emerald-900 flex items-center gap-1.5">
                      <DollarSign className="w-4 h-4 text-emerald-600" />
                      Converted Services & Value *
                    </label>
                    <button
                      type="button"
                      onClick={handleAddServiceRow}
                      className="text-xs font-bold text-emerald-700 hover:text-emerald-900 bg-emerald-100 hover:bg-emerald-200 px-2.5 py-1 rounded-lg border border-emerald-300 flex items-center gap-1 transition-all"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      + Add Another Service
                    </button>
                  </div>

                  <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                    {serviceRows.map((row, idx) => (
                      <div key={idx} className="flex items-center gap-2 bg-white p-2.5 rounded-xl border border-emerald-200 shadow-sm">
                        <span className="text-[11px] font-mono font-bold text-emerald-800 w-5">{idx + 1}.</span>
                        <input
                          type="text"
                          required
                          placeholder="Service Name (e.g. GST Registration, Audit, Payroll)"
                          value={row.serviceName}
                          onChange={e => handleServiceChange(idx, "serviceName", e.target.value)}
                          className="flex-1 bg-slate-50 border border-slate-300 rounded-lg p-2 font-bold text-slate-800 focus:outline-none focus:border-emerald-600 text-xs"
                        />
                        <div className="relative w-32">
                          <span className="absolute left-2.5 top-2 text-slate-400 font-bold text-xs">₹</span>
                          <input
                            type="number"
                            placeholder="Amount"
                            value={row.amount}
                            onChange={e => handleServiceChange(idx, "amount", e.target.value)}
                            className="w-full bg-slate-50 border border-slate-300 rounded-lg py-2 pl-6 pr-2 font-extrabold text-slate-900 focus:outline-none focus:border-emerald-600 text-xs"
                          />
                        </div>
                        {serviceRows.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveServiceRow(idx)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                            title="Remove Service"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Total Value Summary Box */}
                  <div className="flex justify-between items-center bg-emerald-600 text-white p-3 rounded-xl shadow-sm">
                    <span className="text-xs font-bold uppercase tracking-wider">Total Converted Value</span>
                    <span className="text-base font-black">₹ {totalConvertedAmount.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              )}

              {/* LOST FIELDS: REASON FOR LOSS */}
              {targetNewStatus === "Lost" && (
                <div className="space-y-1.5 bg-rose-50/50 border border-rose-200 p-4 rounded-2xl">
                  <label className="block text-xs font-extrabold text-rose-900">
                    Reason for Losing Lead *
                  </label>
                  <textarea
                    rows={3}
                    required
                    placeholder="Enter reason why client opted out, price constraints, competitor chosen, or no requirement..."
                    value={statusLostReason}
                    onChange={e => setStatusLostReason(e.target.value)}
                    className="w-full bg-white border border-rose-300 rounded-xl p-2.5 font-semibold text-slate-900 focus:outline-none focus:border-rose-600 text-xs"
                  />
                </div>
              )}

              {/* ATTACHMENTS & RECORDINGS SECTION WITH + ADD MORE */}
              <div className="space-y-2 bg-slate-50 border border-slate-200 p-4 rounded-2xl">
                <div className="flex justify-between items-center">
                  <div>
                    <label className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                      <Paperclip className="w-4 h-4 text-purple-600" />
                      Recordings & Attachments
                    </label>
                    <span className="text-[10px] text-slate-500 block">Supports call recordings (.aac, .mp3), screenshots, invoices & PDFs</span>
                  </div>

                  <input
                    type="file"
                    ref={statusFileInputRef}
                    onChange={handleStatusFileUpload}
                    multiple
                    accept=".aac, .mp3, .wav, .m4a, .png, .jpg, .jpeg, .webp, .pdf, .doc, .docx, audio/*, image/*, application/pdf"
                    className="hidden"
                  />

                  <button
                    type="button"
                    onClick={() => statusFileInputRef.current?.click()}
                    className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    + Add More Attachment
                  </button>
                </div>

                {/* Uploaded Attachments List */}
                {statusAttachments.length > 0 ? (
                  <div className="space-y-2 pt-2">
                    {statusAttachments.map((att, idx) => {
                      const isAudio = att.type?.includes("audio") || att.name?.endsWith(".aac") || att.name?.endsWith(".mp3") || att.name?.endsWith(".wav") || att.name?.endsWith(".m4a");
                      const isImage = att.type?.includes("image") || att.name?.endsWith(".png") || att.name?.endsWith(".jpg") || att.name?.endsWith(".jpeg");

                      return (
                        <div key={idx} className="bg-white p-3 rounded-xl border border-slate-200 space-y-1.5 shadow-sm">
                          <div className="flex justify-between items-center text-xs font-bold">
                            <span className="flex items-center gap-1.5 truncate max-w-[280px]">
                              {isAudio ? <Mic className="w-4 h-4 text-purple-600 shrink-0" /> : isImage ? <FileText className="w-4 h-4 text-emerald-600 shrink-0" /> : <Paperclip className="w-4 h-4 text-blue-600 shrink-0" />}
                              <span className="truncate text-slate-900">{att.name}</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveAttachment(idx)}
                              className="text-slate-400 hover:text-rose-600 p-1"
                              title="Remove Attachment"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>

                          {/* Audio Player Preview */}
                          {isAudio && (() => {
                            const playableUrl = att.blobUrl || fixAudioDataUrl(att.url, att.name, att.type);
                            const ext = (att.name || "").split('.').pop()?.toLowerCase() || '';
                            const audioType = att.type?.includes("audio") ? att.type : (ext === 'aac' ? 'audio/aac' : ext === 'm4a' ? 'audio/mp4' : 'audio/mpeg');

                            return (
                              <div className="bg-purple-50 p-2.5 rounded-lg border border-purple-100 space-y-1">
                                <audio
                                  key={playableUrl.slice(0, 80) + idx}
                                  controls
                                  preload="metadata"
                                  src={playableUrl}
                                  className="w-full h-9 text-xs"
                                >
                                  <source src={playableUrl} type={audioType} />
                                  <source src={playableUrl} type="audio/aac" />
                                  <source src={playableUrl} type="audio/mp4" />
                                  <source src={playableUrl} type="audio/mpeg" />
                                  Your browser does not support audio playback.
                                </audio>
                              </div>
                            );
                          })()}

                          {/* Image Preview */}
                          {isImage && (
                            <img src={att.url} alt={att.name} className="h-20 object-cover rounded-lg border border-slate-200" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div
                    onClick={() => statusFileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-300 hover:border-purple-500 rounded-xl p-4 text-center cursor-pointer bg-white transition-colors space-y-1"
                  >
                    <Paperclip className="w-6 h-6 text-slate-400 mx-auto" />
                    <p className="text-xs font-bold text-slate-600">Click to browse or drag & drop files</p>
                    <p className="text-[10px] text-slate-400">Audio recordings (.aac), Call logs, Images, PDFs</p>
                  </div>
                )}
              </div>

              {/* REMARKS FIELD */}
              <div className="space-y-1">
                <label className="block text-[10px] font-black uppercase text-slate-600">
                  Additional Remarks / Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="Enter any additional details or final status notes..."
                  value={statusRemarks}
                  onChange={e => setStatusRemarks(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl p-2.5 font-bold focus:outline-none focus:border-purple-600 text-xs"
                />
              </div>

              {/* Modal Actions */}
              <div className="flex justify-end items-center gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowStatusActionModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingStatusModal}
                  className={`px-5 py-2 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-1.5 ${targetNewStatus === "Converted" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700"
                    }`}
                >
                  {isSavingStatusModal ? <RefreshCw className="w-4 h-4 animate-spin" /> : targetNewStatus === "Converted" ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                  Save & Mark as {targetNewStatus}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* MODAL 4: MANUAL SINGLE LEAD ADDITION */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 border border-slate-200 shadow-2xl animate-fade-in">
            <div className="flex justify-between items-center pb-3 border-b border-slate-200">
              <h3 className="font-extrabold text-base text-slate-900">Add New Single Lead</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSingleLead} className="space-y-3 text-xs font-semibold">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-600 mb-1">Contact Person Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rahul Sharma"
                    value={manualForm.name}
                    onChange={e => setManualForm({ ...manualForm, name: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl p-2 font-bold focus:outline-none focus:border-purple-600"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-600 mb-1">Phone / Mobile</label>
                  <input
                    type="text"
                    placeholder="e.g. +91 9876543210"
                    value={manualForm.phone}
                    onChange={e => setManualForm({ ...manualForm, phone: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl p-2 font-bold focus:outline-none focus:border-purple-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-600 mb-1">Company Name</label>
                  <input
                    type="text"
                    placeholder="e.g. ABC Tech Ltd"
                    value={manualForm.companyName}
                    onChange={e => setManualForm({ ...manualForm, companyName: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl p-2 font-bold focus:outline-none focus:border-purple-600"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-600 mb-1">Email Address</label>
                  <input
                    type="email"
                    placeholder="e.g. client@example.com"
                    value={manualForm.email}
                    onChange={e => setManualForm({ ...manualForm, email: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl p-2 font-bold focus:outline-none focus:border-purple-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-600 mb-1">City / Location</label>
                  <input
                    type="text"
                    placeholder="e.g. Jaipur"
                    value={manualForm.city}
                    onChange={e => setManualForm({ ...manualForm, city: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl p-2 font-bold focus:outline-none focus:border-purple-600"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-600 mb-1">Sales Reason / Purpose</label>
                  <select
                    value={manualForm.salesReason}
                    onChange={e => setManualForm({ ...manualForm, salesReason: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl p-2 font-bold focus:outline-none focus:border-purple-600"
                  >
                    <option value="Pitching">Pitching</option>
                    <option value="Follow Up">Follow Up</option>
                    <option value="Client Meeting">Client Meeting</option>
                    <option value="Proposal Shared">Proposal Shared</option>
                    <option value="Other">Other</option>
                  </select>

                  {manualForm.salesReason === "Other" && (
                    <input
                      type="text"
                      required
                      placeholder="Specify sales reason / purpose..."
                      value={manualForm.customSalesReason}
                      onChange={e => setManualForm({ ...manualForm, customSalesReason: e.target.value })}
                      className="w-full border border-purple-300 rounded-xl p-2 mt-2 font-bold focus:outline-none focus:border-purple-600 animate-fade-in text-slate-900"
                    />
                  )}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-600 mb-1">Remarks / Details</label>
                <textarea
                  rows={2}
                  placeholder="Additional lead details..."
                  value={manualForm.remarks}
                  onChange={e => setManualForm({ ...manualForm, remarks: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl p-2 font-bold focus:outline-none focus:border-purple-600"
                />
              </div>

              <div className="flex justify-end items-center gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md"
                >
                  Save Lead
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 6: BDA LEAD ASSIGNMENT BREAKDOWN */}
      {showBdaBreakdownModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 space-y-4 border border-slate-200 shadow-2xl animate-fade-in max-h-[85vh] flex flex-col">
            
            {/* Header */}
            <div className="flex justify-between items-center pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-blue-100 text-blue-700 rounded-2xl">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">BDA Lead Assignment Breakdown</h3>
                  <p className="text-xs text-slate-500 font-semibold">Click on any BDA to filter their assigned leads list</p>
                </div>
              </div>
              <button
                onClick={() => setShowBdaBreakdownModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-xl hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content List */}
            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
              {(() => {
                // Group assigned leads count by BDA user
                const bdaCountsMap: Record<string, { bdaId: string; bdaName: string; count: number; converted: number; lost: number; inProgress: number }> = {};

                // Include allowed BDAs for breakdown
                userBreakdownBdaList.forEach(bda => {
                  bdaCountsMap[String(bda.id)] = {
                    bdaId: String(bda.id),
                    bdaName: bda.name,
                    count: 0,
                    converted: 0,
                    lost: 0,
                    inProgress: 0
                  };
                });

                // Tally lead assignments
                leads.forEach(lead => {
                  if (lead.assignedTo) {
                    const key = String(lead.assignedTo);
                    if (!bdaCountsMap[key]) {
                      bdaCountsMap[key] = {
                        bdaId: key,
                        bdaName: lead.assignedToName || `BDA #${key}`,
                        count: 0,
                        converted: 0,
                        lost: 0,
                        inProgress: 0
                      };
                    }
                    bdaCountsMap[key].count += 1;
                    if (lead.status === "Converted") bdaCountsMap[key].converted += 1;
                    else if (lead.status === "Lost") bdaCountsMap[key].lost += 1;
                    else bdaCountsMap[key].inProgress += 1;
                  }
                });

                const bdaList = Object.values(bdaCountsMap).sort((a, b) => b.count - a.count);

                if (bdaList.length === 0) {
                  return (
                    <div className="p-8 text-center text-slate-500 font-bold text-xs">
                      No BDA users found.
                    </div>
                  );
                }

                return (
                  <div className="grid grid-cols-1 gap-2.5">
                    {bdaList.map(item => {
                      const percentage = totalLeads > 0 ? Math.round((item.count / totalLeads) * 100) : 0;
                      const isSelected = assignmentFilter === item.bdaId;

                      return (
                        <div
                          key={item.bdaId}
                          onClick={() => {
                            setAssignmentFilter(item.bdaId);
                            setStatusFilter("All");
                            setShowBdaBreakdownModal(false);
                            triggerToast?.(`Filtered leads for ${item.bdaName}`);
                          }}
                          className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                            isSelected
                              ? "bg-blue-50/80 border-blue-400 ring-2 ring-blue-300/40 shadow-sm"
                              : "bg-slate-50/60 hover:bg-blue-50/40 border-slate-200 hover:border-blue-300"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-black text-sm flex items-center justify-center shadow-sm">
                              {item.bdaName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <h4 className="font-extrabold text-xs text-slate-900">{item.bdaName}</h4>
                              <div className="flex items-center gap-2 text-[10px] text-slate-500 font-semibold mt-0.5">
                                <span className="text-emerald-700 font-bold">{item.converted} Converted</span>
                                <span>•</span>
                                <span className="text-indigo-700 font-bold">{item.inProgress} Active</span>
                                {item.lost > 0 && (
                                  <>
                                    <span>•</span>
                                    <span className="text-rose-600 font-bold">{item.lost} Lost</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <span className="px-2.5 py-1 bg-blue-600 text-white text-xs font-black rounded-xl shadow-sm">
                                {item.count} Leads
                              </span>
                              <span className="block text-[9px] text-slate-400 font-bold mt-1">
                                {percentage}% of Total
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

            {/* Footer */}
            <div className="flex justify-between items-center pt-3 border-t border-slate-200 text-xs font-bold">
              <button
                type="button"
                onClick={() => {
                  setAssignmentFilter("All");
                  setStatusFilter("All");
                  setShowBdaBreakdownModal(false);
                }}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors"
              >
                Clear Filter (Show All Leads)
              </button>
              <button
                type="button"
                onClick={() => setShowBdaBreakdownModal(false)}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl shadow-sm transition-colors"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: BDA PERFORMANCE & STATUS BREAKDOWN BY USER */}
      {/* ========================================================================= */}
      {showStatusUserBreakdownModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 space-y-4 border border-slate-200 shadow-2xl animate-fade-in max-h-[85vh] flex flex-col">
            
            {/* Header */}
            <div className="flex justify-between items-center pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <div className={`p-2.5 rounded-2xl text-white shadow-md ${
                  targetBreakdownStatus === "Converted" ? "bg-emerald-600" :
                  targetBreakdownStatus === "Lost" ? "bg-rose-600" :
                  "bg-blue-600"
                }`}>
                  {targetBreakdownStatus === "Converted" ? <CheckCircle2 className="w-5 h-5" /> :
                   targetBreakdownStatus === "Lost" ? <XCircle className="w-5 h-5" /> :
                   <Users className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">
                    {targetBreakdownStatus === "Converted" ? "Converted Clients by BDA User" :
                     targetBreakdownStatus === "Lost" ? "Lost Leads by BDA User" :
                     "BDA Lead Assignments Breakdown"}
                  </h3>
                  <p className="text-xs font-semibold text-slate-500">
                    Select a BDA user below to view their specific {targetBreakdownStatus.toLowerCase()} leads
                  </p>
                </div>
              </div>
              <button onClick={() => setShowStatusUserBreakdownModal(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Overview Summary Banner */}
            <div className={`p-3.5 rounded-2xl flex items-center justify-between font-bold text-xs shadow-xs ${
              targetBreakdownStatus === "Converted" ? "bg-emerald-50 border border-emerald-200 text-emerald-900" :
              targetBreakdownStatus === "Lost" ? "bg-rose-50 border border-rose-200 text-rose-900" :
              "bg-blue-50 border border-blue-200 text-blue-900"
            }`}>
              <div>
                <span className="text-[10px] uppercase font-black tracking-wider block opacity-75">
                  Total {targetBreakdownStatus} Leads
                </span>
                <span className="text-lg font-black">
                  {targetBreakdownStatus === "Converted" ? convertedCount :
                   targetBreakdownStatus === "Lost" ? lostCount :
                   assignedCount} Leads
                </span>
              </div>
              {targetBreakdownStatus === "Converted" && (
                <div className="text-right">
                  <span className="text-[10px] uppercase font-black tracking-wider block opacity-75">
                    Total Converted Value
                  </span>
                  <span className="text-lg font-black text-emerald-800">
                    ₹ {convertedTotalAmount.toLocaleString('en-IN')}
                  </span>
                </div>
              )}
            </div>

            {/* Quick Action: Show All */}
            <button
              onClick={() => {
                setStatusFilter(targetBreakdownStatus);
                setAssignmentFilter(isManagerial ? "All" : (currentBdaUser?.id || "All"));
                setShowStatusUserBreakdownModal(false);
              }}
              className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-all border border-slate-300 flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <Eye className="w-4 h-4 text-slate-600" />
              {isManagerial
                ? `Show All ${targetBreakdownStatus} Leads Across All Users (${targetBreakdownStatus === "Converted" ? convertedCount : targetBreakdownStatus === "Lost" ? lostCount : assignedCount})`
                : `Show My ${targetBreakdownStatus} Assigned Leads`}
            </button>

            {/* BDA User List Cards */}
            <div className="space-y-2.5 flex-1 overflow-y-auto pr-1">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                User-wise Breakdown ({userBreakdownBdaList.length} BDA {userBreakdownBdaList.length === 1 ? "User" : "Users"})
              </span>

              {userBreakdownBdaList.map(bda => {
                const userLeads = leads.filter(l => {
                  const matchesUser = l.assignedTo === bda.id || (l.assignedToName && l.assignedToName.toLowerCase() === bda.name.toLowerCase());
                  if (!matchesUser) return false;
                  if (targetBreakdownStatus === "Assigned") return l.status === "Assigned" || (l.status !== "Converted" && l.status !== "Lost" && l.status !== "New");
                  return l.status === targetBreakdownStatus;
                });

                const count = userLeads.length;
                const bdaTotalAmt = userLeads.reduce((sum, lead) => {
                  let amt = parseFloat(String(lead.convertedAmount || 0)) || 0;
                  if (!amt && lead.convertedServicesJson) {
                    try {
                      const parsed = typeof lead.convertedServicesJson === "string" ? JSON.parse(lead.convertedServicesJson) : lead.convertedServicesJson;
                      if (Array.isArray(parsed)) {
                        amt = parsed.reduce((s: number, item: any) => s + (parseFloat(item.amount) || 0), 0);
                      }
                    } catch {}
                  }
                  return sum + amt;
                }, 0);

                const isCurrentlySelected = assignmentFilter === bda.id && statusFilter === targetBreakdownStatus;

                return (
                  <div
                    key={bda.id}
                    onClick={() => {
                      setAssignmentFilter(bda.id);
                      setStatusFilter(targetBreakdownStatus);
                      setShowStatusUserBreakdownModal(false);
                    }}
                    className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between cursor-pointer hover:shadow-md ${
                      isCurrentlySelected
                        ? "bg-purple-50 border-purple-500 ring-2 ring-purple-300"
                        : count > 0
                        ? "bg-white border-slate-200 hover:border-purple-300"
                        : "bg-slate-50/60 border-slate-200 opacity-60 hover:opacity-100"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-black text-sm">
                        {bda.name.charAt(0)}
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-slate-900">{bda.name}</h4>
                        <p className="text-[10px] font-semibold text-slate-500">{bda.role}{bda.department ? ` • ${bda.department}` : ""}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-right">
                      {targetBreakdownStatus === "Converted" && bdaTotalAmt > 0 && (
                        <div className="hidden sm:block">
                          <span className="text-[10px] uppercase font-black text-emerald-600 block">Value</span>
                          <span className="text-xs font-extrabold text-emerald-800">₹ {bdaTotalAmt.toLocaleString('en-IN')}</span>
                        </div>
                      )}

                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-1 rounded-xl text-xs font-black ${
                          count > 0 ? "bg-purple-600 text-white" : "bg-slate-200 text-slate-600"
                        }`}>
                          {count} {count === 1 ? "Lead" : "Leads"}
                        </span>
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-2 border-t border-slate-200 text-right">
              <button
                onClick={() => setShowStatusUserBreakdownModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Fullscreen Image Lightbox Modal */}
      {previewImage && (
        <div className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-slate-900 rounded-2xl max-w-4xl w-full max-h-[92vh] overflow-hidden flex flex-col shadow-2xl border border-slate-800">
            <div className="p-4 bg-slate-950 text-white flex items-center justify-between border-b border-slate-800">
              <h3 className="font-extrabold text-xs flex items-center gap-2 truncate max-w-md">
                <Eye className="w-4 h-4 text-purple-400 shrink-0" />
                {previewImage.title}
              </h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => openBlobInNewTab(previewImage.url)}
                  className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
                >
                  <Download className="w-3.5 h-3.5" /> Open in New Tab
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewImage(null)}
                  className="p-1.5 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-4 overflow-auto flex-1 flex items-center justify-center bg-slate-950/90 min-h-[300px]">
              <img
                src={previewImage.url}
                alt={previewImage.title}
                className="max-w-full max-h-[78vh] object-contain rounded-lg shadow-2xl border border-slate-800/80"
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
