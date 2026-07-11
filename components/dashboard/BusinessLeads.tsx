"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  UploadCloud,
  FileSpreadsheet,
  Plus,
  Search,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Clock,
  ArrowRight,
  Database,
  Tag,
  Download,
  Building,
  Mail,
  Phone,
  FileText,
  User,
  Image as ImageIcon,
  Play,
  CalendarRange as CalendarClock,
  History
} from "lucide-react";
import * as XLSX from "xlsx";

interface Platform {
  id: string;
  name: string;
  prefix: string;
  tableName: string;
}

export default function BusinessLeads({
  triggerToast
}: {
  triggerToast: (msg: string) => void;
}) {
  // App States
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [activePlatformId, setActivePlatformId] = useState<string>("");
  const [leads, setLeads] = useState<any[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [stats, setStats] = useState<any>({
    totalLeads: 0,
    leadsCalled: 0,
    connected: 0,
    notConnected: 0,
    interviewScheduled: 0,
    selected: 0,
    rejected: 0,
    systemJobLink: 0
  });
  const [activeFilterCard, setActiveFilterCard] = useState<string>("all");

  // Modal/Wizard States
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
  const [importStep, setImportStep] = useState<number>(1); // 1: Select Platform, 2: Upload File, 3: Preview/Confirm

  // New Platform Form
  const [isCreatingPlatform, setIsCreatingPlatform] = useState<boolean>(false);
  const [newPlatformName, setNewPlatformName] = useState<string>("");
  const [newPlatformPrefix, setNewPlatformPrefix] = useState<string>("");
  const [selectedPlatformId, setSelectedPlatformId] = useState<string>("");

  // Excel Parsing States
  const [parsedLeads, setParsedLeads] = useState<any[]>([]);
  const [parsedHeaders, setParsedHeaders] = useState<string[]>([]);
  const [fileName, setFileName] = useState<string>("");
  const [uploading, setUploading] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Leads Department & Role States
  const [departments, setDepartments] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>("");
  const [selectedRoleId, setSelectedRoleId] = useState<string>("");
  const [isCreatingDept, setIsCreatingDept] = useState<boolean>(false);
  const [isCreatingRole, setIsCreatingRole] = useState<boolean>(false);
  const [expandedLeadId, setExpandedLeadId] = useState<string | null>(null);
  const [newDeptName, setNewDeptName] = useState<string>("");
  const [newRoleName, setNewRoleName] = useState<string>("");
  const [savingDept, setSavingDept] = useState<boolean>(false);
  const [savingRole, setSavingRole] = useState<boolean>(false);

  // Call Status hooks & helpers
  const [leadStatuses, setLeadStatuses] = useState<any[]>([]);
  const [isCreatingStatus, setIsCreatingStatus] = useState<boolean>(false);
  const [newStatusName, setNewStatusName] = useState<string>("");
  const [savingStatus, setSavingStatus] = useState<boolean>(false);
  const selectedDeptObj = departments.find((d) => String(d.id) === String(selectedDepartmentId));
  const selectedDeptName = selectedDeptObj ? selectedDeptObj.name : "";
  const filteredRoles = roles.filter((r) => r.department === selectedDeptName);

  // Fetch departments and roles when modal opens
  useEffect(() => {
    if (isImportModalOpen) {
      fetchDepartments();
      fetchRoles();
      setSelectedDepartmentId("");
      setSelectedRoleId("");
      setIsCreatingDept(false);
      setIsCreatingRole(false);
      setNewDeptName("");
      setNewRoleName("");
    }
  }, [isImportModalOpen]);

  const fetchDepartments = async () => {
    try {
      const res = await fetch("/api/business-leads/departments");
      const data = await res.json();
      if (data.success) {
        setDepartments(data.data);
      }
    } catch (err) {
      console.error("Failed to load departments", err);
    }
  };

  const fetchRoles = async () => {
    try {
      const res = await fetch("/api/business-leads/roles");
      const data = await res.json();
      if (data.success) {
        setRoles(data.data || []);
      }
    } catch (err) {
      console.error("Failed to load roles", err);
    }
  };

  const handleCreateDepartment = async () => {
    if (!newDeptName.trim()) return;
    setSavingDept(true);
    try {
      const res = await fetch("/api/business-leads/departments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newDeptName })
      });
      const data = await res.json();
      if (data.success) {
        triggerToast("🎉 Department created successfully!");
        await fetchDepartments();
        setSelectedDepartmentId(String(data.data.id));
        setIsCreatingDept(false);
        setNewDeptName("");
      } else {
        triggerToast(data.error || "Failed to create department");
      }
    } catch (err) {
      triggerToast("Error creating department");
    } finally {
      setSavingDept(false);
    }
  };

  const handleCreateRole = async () => {
    if (!newRoleName.trim() || !selectedDeptName) return;
    setSavingRole(true);
    try {
      const res = await fetch("/api/business-leads/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newRoleName, department: selectedDeptName })
      });
      const data = await res.json();
      if (data.success) {
        triggerToast("🎉 Role created successfully!");
        await fetchRoles();
        setSelectedRoleId(String(data.data.id));
        setIsCreatingRole(false);
        setNewRoleName("");
      } else {
        triggerToast(data.error || "Failed to create role");
      }
    } catch (err) {
      triggerToast("Error creating role");
    } finally {
      setSavingRole(false);
    }
  };

  const fetchStatuses = async () => {
    try {
      const res = await fetch("/api/business-leads/statuses");
      const data = await res.json();
      if (data.success) {
        setLeadStatuses(data.data || []);
      }
    } catch (err) {
      console.error("Failed to load lead statuses", err);
    }
  };

  const handleCreateStatus = async () => {
    if (!newStatusName.trim()) return;
    setSavingStatus(true);
    try {
      const res = await fetch("/api/business-leads/statuses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newStatusName })
      });
      const data = await res.json();
      if (data.success) {
        triggerToast("🎉 Status created successfully!");
        await fetchStatuses();
        setEditStatus(data.data.name);
        setIsCreatingStatus(false);
        setNewStatusName("");
      } else {
        triggerToast(data.error || "Failed to create status");
      }
    } catch (err) {
      triggerToast("Error creating status");
    } finally {
      setSavingStatus(false);
    }
  };

  // Lead Call Edit States
  const [selectedLeadForEdit, setSelectedLeadForEdit] = useState<any | null>(null);
  const [editStatus, setEditStatus] = useState<string>("No Answer");
  const [editCallRemarks, setEditCallRemarks] = useState<string>("");
  const [editFollowupDate, setEditFollowupDate] = useState<string>("");
  const [editFollowupTime, setEditFollowupTime] = useState<string>("");
  const [savingEdit, setSavingEdit] = useState<boolean>(false);

  // File Upload states
  const [screenshotUrl, setScreenshotUrl] = useState<string>("");
  const [recordingUrl, setRecordingUrl] = useState<string>("");
  const [uploadingFile, setUploadingFile] = useState<boolean>(false);

  // Scheduled Interview states
  const [schedRound, setSchedRound] = useState<string>("1");
  const [schedDate, setSchedDate] = useState<string>("");
  const [schedTime, setSchedTime] = useState<string>("");
  const [schedMode, setSchedMode] = useState<"online" | "offline">("online");
  const [schedVideoLink, setSchedVideoLink] = useState<string>("");

  // Date Filter States
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [customStartDate, setCustomStartDate] = useState<string>("");
  const [customEndDate, setCustomEndDate] = useState<string>("");

  // Auto suggest video link
  useEffect(() => {
    if (selectedLeadForEdit) {
      setSchedVideoLink(`https://meet.acolyte.in/round${schedRound}-${selectedLeadForEdit.id.slice(-6)}`);
    }
  }, [selectedLeadForEdit, schedRound]);

  const handleOpenLeadEdit = (lead: any) => {
    setSelectedLeadForEdit(lead);
    setEditStatus(lead.status === "New" ? "No Answer" : (lead.status || "No Answer"));
    setEditCallRemarks("");
    setScreenshotUrl("");
    setRecordingUrl("");

    // Reset interview values to defaults
    setSchedRound("1");
    setSchedDate("");
    setSchedTime("");
    setSchedMode("online");
    setSchedVideoLink("");
    setEditFollowupDate("");
    setEditFollowupTime("");
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: "screenshot" | "recording") => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingFile(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/documents/upload", {
        method: "POST",
        body: formData
      });
      const data = await res.json();
      if (data.success) {
        if (type === "screenshot") {
          setScreenshotUrl(data.url);
          triggerToast("📸 Screenshot uploaded successfully!");
        } else {
          setRecordingUrl(data.url);
          triggerToast("🎙️ Recording uploaded successfully!");
        }
      } else {
        triggerToast(data.error || "Failed to upload file.");
      }
    } catch (err) {
      triggerToast("Error uploading file.");
    } finally {
      setUploadingFile(false);
    }
  };

  const clearEditForm = () => {
    setEditStatus("No Answer");
    setEditCallRemarks("");
    setEditFollowupDate("");
    setEditFollowupTime("");
    setScreenshotUrl("");
    setRecordingUrl("");
    setSchedRound("1");
    setSchedDate("");
    setSchedTime("");
    setSchedMode("online");
    setSchedVideoLink("");
  };

  const handleSaveLeadEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLeadForEdit || !activePlatformId) return;
    setSavingEdit(true);

    const updateFields: any = {
      status: editStatus,
      call_remarks: editCallRemarks,
      followup_date: ["No Answer", "Busy", "Connected & Interested"].includes(editStatus) ? (editFollowupDate || null) : null,
      followup_time: ["No Answer", "Busy", "Connected & Interested"].includes(editStatus) ? (editFollowupTime || null) : null,
      screenshot_url: ["No Answer", "Busy"].includes(editStatus) ? (screenshotUrl || null) : null,
      recording_url: ["Connected", "Not Interested", "Connected & Interested"].includes(editStatus) ? (recordingUrl || null) : null
    };

    if (editStatus === "Interview Scheduled") {
      updateFields.interview_round = schedRound;
      updateFields.interview_date = schedDate || null;
      updateFields.interview_time = schedTime || null;
      updateFields.interview_mode = schedMode;
      updateFields.interview_video_link = schedMode === "offline" ? "" : schedVideoLink;
    }

    try {
      const res = await fetch("/api/business-leads", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platformId: activePlatformId,
          leadId: selectedLeadForEdit.id,
          fields: updateFields
        })
      });
      const data = await res.json();
      if (data.success) {
        triggerToast("Lead details updated successfully.");
        setSelectedLeadForEdit(null);
        clearEditForm();
        await loadLeads(activePlatformId);
      } else {
        triggerToast(data.error || "Failed to update lead.");
      }
    } catch (err) {
      triggerToast("Error updating lead details.");
    } finally {
      setSavingEdit(false);
    }
  };

  // Fetch platforms on load
  const loadPlatforms = async () => {
    try {
      const res = await fetch("/api/lead-platforms");
      const data = await res.json();
      if (data.success) {
        setPlatforms(data.data);
        if (data.data.length > 0 && !activePlatformId) {
          setActivePlatformId(data.data[0].id);
        }
      }
    } catch (err) {
      triggerToast("Failed to load lead platforms.");
    }
  };

  // Fetch leads on platform change
  const loadLeads = async (platformId: string) => {
    if (!platformId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/business-leads?platformId=${platformId}`);
      const data = await res.json();
      if (data.success) {
        setLeads(data.data.leads || []);
        setColumns(data.data.columns || []);
        if (data.data.stats) {
          setStats(data.data.stats);
        } else {
          setStats({
            totalLeads: data.data.leads?.length || 0,
            leadsCalled: 0,
            connected: 0,
            notConnected: 0,
            interviewScheduled: 0,
            selected: 0,
            rejected: 0,
            systemJobLink: 0
          });
        }
      } else {
        triggerToast(data.error || "Failed to load leads.");
      }
    } catch (err) {
      triggerToast("Error fetching leads.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlatforms();
    fetchStatuses();
  }, []);

  useEffect(() => {
    if (activePlatformId) {
      loadLeads(activePlatformId);
      setExpandedLeadId(null);
      setActiveFilterCard("all");
    }
  }, [activePlatformId]);

  // Handle Drag & Drop / File Select
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  const processFile = (file: File) => {
    if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
      triggerToast("Please upload a valid Excel file (.xlsx or .xls)");
      return;
    }

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const buffer = e.target?.result;
        const workbook = XLSX.read(buffer, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json: any[] = XLSX.utils.sheet_to_json(worksheet);
        const headers = XLSX.utils.sheet_to_json(worksheet, { header: 1 })[0] as string[];

        if (json.length === 0 || !headers || headers.length === 0) {
          triggerToast("The selected Excel sheet seems to be empty.");
          return;
        }

        setParsedLeads(json);
        setParsedHeaders(headers);
        setImportStep(3); // Move to Preview step
      } catch (err) {
        triggerToast("Failed to parse the Excel file.");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Submit Import data to API
  const handleImportSubmit = async () => {
    if (parsedLeads.length === 0 || !selectedPlatformId) return;
    setUploading(true);
    try {
      const res = await fetch("/api/business-leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platformId: selectedPlatformId,
          leads: parsedLeads,
          headers: parsedHeaders,
          departmentId: selectedDepartmentId || null,
          roleId: selectedRoleId || null
        })
      });
      const data = await res.json();
      if (data.success) {
        const skippedMsg = data.skippedCount > 0 ? ` Skipped ${data.skippedCount} duplicate leads.` : "";
        triggerToast(`Successfully imported ${data.count} leads.${skippedMsg}`);
        setIsImportModalOpen(false);
        setImportStep(1);
        setParsedLeads([]);
        setParsedHeaders([]);
        setFileName("");
        // Reload active tab
        setActivePlatformId(selectedPlatformId);
        await loadLeads(selectedPlatformId);
      } else {
        triggerToast(data.error || "Failed to import leads.");
      }
    } catch (err) {
      triggerToast("Network error submitting import.");
    } finally {
      setUploading(false);
    }
  };

  // Create New Platform Submit
  const handleCreatePlatformSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlatformName || !newPlatformPrefix) {
      triggerToast("Please enter platform name and prefix.");
      return;
    }
    try {
      const res = await fetch("/api/lead-platforms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newPlatformName,
          prefix: newPlatformPrefix
        })
      });
      const data = await res.json();
      if (data.success) {
        triggerToast(`Platform '${newPlatformName}' created successfully.`);
        setNewPlatformName("");
        setNewPlatformPrefix("");
        setIsCreatingPlatform(false);
        // Refresh platforms dropdown
        const updatedRes = await fetch("/api/lead-platforms");
        const updatedData = await updatedRes.json();
        if (updatedData.success) {
          setPlatforms(updatedData.data);
          // Set as currently selected for import
          setSelectedPlatformId(data.data.id);
          setImportStep(2); // Auto proceed to file upload
        }
      } else {
        triggerToast(data.error || "Failed to create platform.");
      }
    } catch (err) {
      triggerToast("Error creating platform.");
    }
  };

  // Filter by date first
  const dateFilteredLeads = useMemo(() => {
    return leads.filter((lead: any) => {
      if (!lead.createdAt) return true;
      const leadDate = new Date(lead.createdAt);
      if (isNaN(leadDate.getTime())) return true;

      if (dateFilter === "today") {
        const today = new Date();
        return leadDate.toDateString() === today.toDateString();
      }
      if (dateFilter === "this-month") {
        const today = new Date();
        return leadDate.getMonth() === today.getMonth() && leadDate.getFullYear() === today.getFullYear();
      }
      if (dateFilter === "custom") {
        const leadTime = leadDate.getTime();
        if (customStartDate) {
          const start = new Date(customStartDate + "T00:00:00").getTime();
          if (leadTime < start) return false;
        }
        if (customEndDate) {
          const end = new Date(customEndDate + "T23:59:59").getTime();
          if (leadTime > end) return false;
        }
      }
      return true;
    });
  }, [leads, dateFilter, customStartDate, customEndDate]);

  // Compute stats dynamically based on dateFilteredLeads
  const computedStats = useMemo(() => {
    let totalLeads = dateFilteredLeads.length;
    let leadsCalled = 0;
    let connected = 0;
    let notConnected = 0;
    let interviewScheduled = 0;
    let selected = 0;
    let rejected = 0;
    let systemJobLink = 0;

    dateFilteredLeads.forEach((lead: any) => {
      const status = lead.status || "";
      if (status && status !== "New") {
        leadsCalled++;
      }
      const statusLower = status.toLowerCase();
      if (statusLower.includes("connected")) {
        connected++;
      }
      if (statusLower.includes("no answer") || statusLower.includes("busy") || statusLower.includes("not interested") || statusLower.includes("not intrested")) {
        notConnected++;
      }
      if (statusLower.includes("interview")) {
        interviewScheduled++;
      }
      if (statusLower.includes("select")) {
        selected++;
      }
      if (statusLower.includes("reject")) {
        rejected++;
      }
      if (lead.isSystemLink) {
        systemJobLink++;
      }
    });

    return {
      totalLeads,
      leadsCalled,
      connected,
      notConnected,
      interviewScheduled,
      selected,
      rejected,
      systemJobLink
    };
  }, [dateFilteredLeads]);

  // Generate and Download Sample Excel template
  const downloadTemplate = () => {
    const headers = [["Name", "Email", "Phone", "Company", "Notes", "Status", "Source"]];
    const ws = XLSX.utils.aoa_to_sheet(headers);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "Leads_Import_Template.xlsx");
  };

  // Export filtered/all leads to Excel
  const exportToExcel = () => {
    if (filteredLeads.length === 0) {
      triggerToast("No data available to export.");
      return;
    }

    const platObj = platforms.find((p) => p.id === activePlatformId);
    const platformName = platObj ? platObj.name : "Leads";

    // 1. Build main sheet rows (Table starts at Row 1!)
    const sheetRows: any[] = [];
    
    // Add headers row (exactly matches frontend visible columns + Call History Timeline)
    const headers = visibleColumns.map((col) => formatHeader(col));
    headers.push("Call History Timeline");
    sheetRows.push(headers);

    // Add candidate records rows
    filteredLeads.forEach((lead: any) => {
      const recordRow = visibleColumns.map((col) => {
        if (col === "createdAt") {
          if (!lead[col]) return "-";
          const d = new Date(lead[col]);
          return isNaN(d.getTime()) ? lead[col] : d.toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric"
          });
        }
        if (col === "updatedAt") {
          const status = (lead.status || "").toLowerCase();
          if (status === "new" || !lead[col]) return "-";
          const d = new Date(lead[col]);
          return isNaN(d.getTime()) ? lead[col] : d.toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric"
          });
        }
        return lead[col] || "-";
      });

      // Calculate call history timeline text
      let historyList: any[] = [];
      if (lead.call_history) {
        try {
          const parsed = JSON.parse(lead.call_history);
          if (Array.isArray(parsed)) {
            historyList = parsed;
          }
        } catch (_) {}
      }
      if (historyList.length === 0) {
        const remarksText = lead.call_remarks || lead.remarks;
        const hasCurrentCallInfo = remarksText || (lead.status && lead.status !== "New");
        if (hasCurrentCallInfo) {
          historyList.push({
            status: lead.status || "No Answer",
            call_remarks: remarksText || "No remarks logged.",
            followup_date: lead.followup_date || null,
            followup_time: lead.followup_time || null,
            interview_round: lead.interview_round || null,
            interview_date: lead.interview_date || null,
            interview_time: lead.interview_time || null,
            interview_mode: lead.interview_mode || null,
            interview_video_link: lead.interview_video_link || null,
            screenshot_url: lead.screenshot_url || null,
            recording_url: lead.recording_url || null,
            updatedAt: lead.updatedAt || lead.createdAt || new Date().toISOString(),
            updatedBy: "HR System"
          });
        }
      }

      const sortedHistory = [...historyList].reverse();
      const timelineText = sortedHistory.map((log) => {
        const dateStr = new Date(log.updatedAt).toLocaleString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit"
        });
        const status = log.status || "-";
        const remarks = log.call_remarks || "-";
        const by = log.updatedBy || "HR System";
        
        let extra = "";
        if (log.followup_date) {
          let fUp = new Date(log.followup_date).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric"
          });
          if (log.followup_time) fUp += ` ${log.followup_time}`;
          extra += ` (Follow-up: ${fUp})`;
        }
        if (log.interview_date) {
          const intv = `Round-${log.interview_round || "1"} on ${new Date(log.interview_date).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric"
          })} ${log.interview_time || ""} (${log.interview_mode || "online"})`;
          extra += ` (Interview: ${intv})`;
        }
        
        return `[${dateStr} by ${by}]: ${status} - Remarks: ${remarks}${extra}`;
      }).join("\n");

      recordRow.push(timelineText || "-");
      sheetRows.push(recordRow);
    });

    // Append summary stats block at the bottom of the main sheet
    sheetRows.push([]);
    sheetRows.push([]);
    sheetRows.push([`${platformName} Leads Summary Statistics`, ""]);
    sheetRows.push(["Metric Statistics", "Count Value"]);
    sheetRows.push(["Total Leads", computedStats.totalLeads]);
    sheetRows.push(["New Leads", computedStats.totalLeads - computedStats.leadsCalled]);
    sheetRows.push(["Called by HR", computedStats.leadsCalled]);
    sheetRows.push(["Connected", computedStats.connected]);
    sheetRows.push(["Not Connected", computedStats.notConnected]);
    sheetRows.push(["Scheduled", computedStats.interviewScheduled]);
    sheetRows.push(["Selected", computedStats.selected]);
    sheetRows.push(["Rejected", computedStats.rejected]);
    sheetRows.push(["System Link Added", computedStats.systemJobLink]);

    const ws = XLSX.utils.aoa_to_sheet(sheetRows);
    
    // Set auto widths for HR Leads worksheet
    if (sheetRows.length > 0) {
      const numCols = sheetRows[0].length;
      const colWidths = Array(numCols).fill(10);
      sheetRows.forEach((row) => {
        row.forEach((cell: any, colIdx: number) => {
          if (cell !== null && cell !== undefined) {
            const val = String(cell);
            const lines = val.split("\n");
            lines.forEach((l) => {
              if (l.length > colWidths[colIdx]) {
                colWidths[colIdx] = l.length;
              }
            });
          }
        });
      });
      ws["!cols"] = colWidths.map((w) => ({ wch: Math.min(Math.max(w + 2, 10), 80) }));
    }

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "HR Leads");

    // 2. Call Logs History Sheet (Flat timeline table of calls across all leads)
    const callLogsRows: any[] = [];
    filteredLeads.forEach((lead: any) => {
      let historyList: any[] = [];
      if (lead.call_history) {
        try {
          const parsed = JSON.parse(lead.call_history);
          if (Array.isArray(parsed)) {
            historyList = parsed;
          }
        } catch (_) {}
      }
      if (historyList.length === 0) {
        const remarksText = lead.call_remarks || lead.remarks;
        const hasCurrentCallInfo = remarksText || (lead.status && lead.status !== "New");
        if (hasCurrentCallInfo) {
          historyList.push({
            status: lead.status || "No Answer",
            call_remarks: remarksText || "No remarks logged.",
            followup_date: lead.followup_date || null,
            followup_time: lead.followup_time || null,
            interview_round: lead.interview_round || null,
            interview_date: lead.interview_date || null,
            interview_time: lead.interview_time || null,
            interview_mode: lead.interview_mode || null,
            interview_video_link: lead.interview_video_link || null,
            screenshot_url: lead.screenshot_url || null,
            recording_url: lead.recording_url || null,
            updatedAt: lead.updatedAt || lead.createdAt || new Date().toISOString(),
            updatedBy: "HR System"
          });
        }
      }

      const candidateName = lead.name || lead.full_name || lead.fullname || lead.candidate_name || lead.lead_name || "Unknown";

      historyList.forEach((log) => {
        const dateStr = new Date(log.updatedAt).toLocaleString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit"
        });

        let followupStr = "-";
        if (log.followup_date) {
          followupStr = new Date(log.followup_date).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric"
          });
          if (log.followup_time) {
            followupStr += ` ${log.followup_time}`;
          }
        }

        let interviewStr = "-";
        if (log.interview_date) {
          interviewStr = `Round-${log.interview_round || "1"} on ${new Date(log.interview_date).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric"
          })} ${log.interview_time || ""} (${log.interview_mode || "online"})`;
        }

        let proofStr = "-";
        if (log.screenshot_url) proofStr = `Screenshot: ${log.screenshot_url}`;
        else if (log.recording_url) proofStr = `Recording: ${log.recording_url}`;

        callLogsRows.push({
          "Lead ID": lead.id,
          "Candidate Name": candidateName,
          "Call Date & Time": dateStr,
          "Called By (HR Agent)": log.updatedBy || "HR System",
          "Call Status": log.status || "-",
          "Call Remarks": log.call_remarks || "-",
          "Follow-up Set": followupStr,
          "Interview Details": interviewStr,
          "Proof Attachment": proofStr
        });
      });
    });

    const wsCallLogs = XLSX.utils.json_to_sheet(callLogsRows);
    if (callLogsRows.length > 0) {
      const callLogsHeaders = Object.keys(callLogsRows[0]);
      const callLogsColWidths = callLogsHeaders.map((h) => {
        let maxLen = h.length;
        callLogsRows.forEach((r) => {
          const val = String(r[h] || "");
          if (val.length > maxLen) maxLen = val.length;
        });
        return { wch: Math.min(Math.max(maxLen + 2, 10), 60) };
      });
      wsCallLogs["!cols"] = callLogsColWidths;
    }
    XLSX.utils.book_append_sheet(wb, wsCallLogs, "Call Logs History");

    // 3. Stats Summary Sheet
    const summaryData = [
      { "Metric Statistics": "Total Leads", "Count Value": computedStats.totalLeads },
      { "Metric Statistics": "New Leads", "Count Value": computedStats.totalLeads - computedStats.leadsCalled },
      { "Metric Statistics": "Called by HR", "Count Value": computedStats.leadsCalled },
      { "Metric Statistics": "Connected", "Count Value": computedStats.connected },
      { "Metric Statistics": "Not Connected", "Count Value": computedStats.notConnected },
      { "Metric Statistics": "Scheduled", "Count Value": computedStats.interviewScheduled },
      { "Metric Statistics": "Selected", "Count Value": computedStats.selected },
      { "Metric Statistics": "Rejected", "Count Value": computedStats.rejected },
      { "Metric Statistics": "System Link Added", "Count Value": computedStats.systemJobLink }
    ];
    const wsStats = XLSX.utils.json_to_sheet(summaryData);
    if (summaryData.length > 0) {
      const statsHeaders = Object.keys(summaryData[0]);
      const statsColWidths = statsHeaders.map((h) => {
        let maxLen = h.length;
        summaryData.forEach((r) => {
          const val = String((r as any)[h] || "");
          if (val.length > maxLen) maxLen = val.length;
        });
        return { wch: Math.min(Math.max(maxLen + 2, 10), 60) };
      });
      wsStats["!cols"] = statsColWidths;
    }
    XLSX.utils.book_append_sheet(wb, wsStats, "Summary Stats");

    XLSX.writeFile(wb, `${platformName}_Leads_Export.xlsx`);
    triggerToast("📊 Leads, summary stats, and call logs exported to Excel successfully!");
  };

  // Filtered Leads list for display search and card filters
  const filteredLeads = dateFilteredLeads.filter((lead: any) => {
    // 1. Filter by Active Card
    const status = (lead.status || "").toLowerCase();

    if (activeFilterCard === "new") {
      if (status !== "new") return false;
    } else if (activeFilterCard === "called") {
      if (!status || status === "new") return false;
    } else if (activeFilterCard === "connected") {
      if (!status.includes("connected")) return false;
    } else if (activeFilterCard === "not_connected") {
      if (!status.includes("no answer") && !status.includes("busy") && !status.includes("not interested") && !status.includes("not intrested")) return false;
    } else if (activeFilterCard === "scheduled") {
      if (!status.includes("interview") && !status.includes("schedule")) return false;
    } else if (activeFilterCard === "selected_rejected") {
      if (!status.includes("select") && !status.includes("reject")) return false;
    } else if (activeFilterCard === "system_link") {
      if (!lead.isSystemLink) return false;
    }

    // 2. Filter by search text
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return Object.values(lead).some((val) =>
      String(val).toLowerCase().includes(term)
    );
  });

  const visibleColumns = columns.filter((col) => {
    const cleaned = col.toLowerCase().replace(/[^a-z0-9]/g, "");
    const excludedKeywords = [
      "callremarks", "remarks", "screenshoturl", "recordingurl",
      "interviewround", "interviewdate", "interviewtime", "interviewmode",
      "interviewvideolink", "followupdate", "callhistory",
      "srno", "srno", "sr_no", "sr",
      "unlockedat",
      "coursestarttime", "courcestarttime", "courcesstarttime",
      "courseendtime", "courceendtime", "courcesendtime",
      "platformid", "platform_id",
      "departmentid", "department_id",
      "roleid", "role_id",
      "lastactive", "last_active"
    ];
    if (excludedKeywords.includes(cleaned)) return false;

    if (["id", "status", "createdAt", "updatedAt"].includes(col)) return true;
    return leads.some((lead: any) => lead[col] !== null && lead[col] !== undefined && String(lead[col]).trim() !== "");
  });

  const getSourceDisplay = (platId: string) => {
    return platforms.find((p) => p.id === platId)?.name || platId.toUpperCase();
  };

  // Format database column name back to human readable header
  const formatHeader = (col: string) => {
    if (col === "id") return "Lead ID";
    if (col === "createdAt") return "Created Date";
    if (col === "updatedAt") return "Updated Date";
    return col
      .replace(/_/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

  return (
    <div className="space-y-6 animate-fadeIn text-slate-800 dark:text-gray-100 select-none">

      {/* Header and Import button */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-[#714B67] to-[#9D688E] bg-clip-text text-transparent">
            HR Leads Directory
          </h1>
          <p className="text-slate-500 dark:text-gray-400 text-xs font-medium">
            Manage your sales leads, import lists dynamically from multiple platforms, and evolve schemas automatically.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Date Filter Dropdown */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-gray-800 text-xs font-semibold bg-white dark:bg-slate-900 text-slate-600 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-gray-850 hover:shadow-sm transition-all relative">
            <CalendarClock className="w-3.5 h-3.5 text-slate-450" />
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="bg-transparent text-slate-650 dark:text-gray-300 focus:outline-none cursor-pointer pr-1 text-xs font-semibold"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="this-month">This Month</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>

          {/* Custom Range Inputs */}
          {dateFilter === "custom" && (
            <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-gray-800 rounded-lg px-3 py-1.5 shadow-sm animate-fadeIn">
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="bg-transparent text-slate-600 dark:text-gray-350 focus:outline-none font-semibold text-xs cursor-pointer"
              />
              <span className="text-[10px] text-slate-400 font-bold uppercase">to</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="bg-transparent text-slate-600 dark:text-gray-350 focus:outline-none font-semibold text-xs cursor-pointer"
              />
            </div>
          )}

          {/* Export Excel (Downloads filtered leads or all leads) */}
          <button
            onClick={exportToExcel}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-gray-800 text-xs font-semibold bg-white dark:bg-slate-900 text-slate-600 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-gray-850 hover:shadow-sm active:scale-95 transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            Export
          </button>

          {/* Import Excel */}
          <button
            onClick={() => {
              setIsImportModalOpen(true);
              setImportStep(1);
            }}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[#714B67] text-white text-xs font-semibold shadow-md hover:bg-[#8A5B7D] active:scale-95 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            Import Excel
          </button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div
          onClick={() => setActiveFilterCard("all")}
          className={`bg-white dark:bg-slate-900 border border-slate-100 dark:border-gray-900/60 p-4 rounded-xl shadow-sm flex items-center gap-4 cursor-pointer transition-all hover:scale-[1.02] hover:shadow-md ${activeFilterCard === "all" ? "ring-2 ring-[#714B67] bg-[#714B67]/5" : ""
            }`}
        >
          <div className="w-10 h-10 rounded-lg bg-[#714B67]/10 flex items-center justify-center text-[#714B67]">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Total Leads</p>
            <p className="text-xl font-bold text-slate-800 dark:text-gray-100">{computedStats.totalLeads}</p>
          </div>
        </div>

        <div
          onClick={() => setActiveFilterCard("new")}
          className={`bg-white dark:bg-slate-900 border border-slate-100 dark:border-gray-900/60 p-4 rounded-xl shadow-sm flex items-center gap-4 cursor-pointer transition-all hover:scale-[1.02] hover:shadow-md ${activeFilterCard === "new" ? "ring-2 ring-green-600 bg-green-600/5" : ""
            }`}
        >
          <div className="w-10 h-10 rounded-lg bg-green-550/10 flex items-center justify-center text-green-600">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">New Leads</p>
            <p className="text-xl font-bold text-slate-800 dark:text-gray-100">
              {computedStats.totalLeads - computedStats.leadsCalled}
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-gray-900/60 p-4 rounded-xl shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-blue-550/10 flex items-center justify-center text-blue-600">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Active Platform</p>
            <p className="text-xs font-bold text-slate-800 dark:text-gray-100 truncate w-32">
              {getSourceDisplay(activePlatformId)}
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-gray-900/60 p-4 rounded-xl shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-purple-550/10 flex items-center justify-center text-purple-600">
            <Tag className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Unique Prefix</p>
            <p className="text-xl font-bold text-slate-800 dark:text-gray-100">
              {platforms.find((p) => p.id === activePlatformId)?.prefix || "N/A"}
            </p>
          </div>
        </div>
      </div>

      {/* Dynamic HR Calling & System Job Link Stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        {/* Called by HR */}
        <div
          onClick={() => setActiveFilterCard("called")}
          className={`bg-white dark:bg-slate-900 border border-slate-100 dark:border-gray-900/60 p-4 rounded-xl shadow-sm flex items-center gap-3.5 cursor-pointer transition-all hover:scale-[1.02] hover:shadow-md ${activeFilterCard === "called" ? "ring-2 ring-indigo-650 bg-indigo-600/5" : ""
            }`}
        >
          <div className="w-9 h-9 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-600">
            <Phone className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-black tracking-wider text-slate-400">Called by HR</p>
            <p className="text-lg font-black text-slate-800 dark:text-gray-150">{computedStats.leadsCalled}</p>
          </div>
        </div>

        {/* Connected */}
        <div
          onClick={() => setActiveFilterCard("connected")}
          className={`bg-white dark:bg-slate-900 border border-slate-100 dark:border-gray-900/60 p-4 rounded-xl shadow-sm flex items-center gap-3.5 cursor-pointer transition-all hover:scale-[1.02] hover:shadow-md ${activeFilterCard === "connected" ? "ring-2 ring-emerald-650 bg-emerald-650/5" : ""
            }`}
        >
          <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-black tracking-wider text-slate-400">Connected</p>
            <p className="text-lg font-black text-slate-800 dark:text-gray-150">{computedStats.connected}</p>
          </div>
        </div>

        {/* Not Connected */}
        <div
          onClick={() => setActiveFilterCard("not_connected")}
          className={`bg-white dark:bg-slate-900 border border-slate-100 dark:border-gray-900/60 p-4 rounded-xl shadow-sm flex items-center gap-3.5 cursor-pointer transition-all hover:scale-[1.02] hover:shadow-md ${activeFilterCard === "not_connected" ? "ring-2 ring-rose-650 bg-rose-650/5" : ""
            }`}
        >
          <div className="w-9 h-9 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-600">
            <AlertCircle className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-black tracking-wider text-slate-400">Not Connected</p>
            <p className="text-lg font-black text-slate-800 dark:text-gray-150">{computedStats.notConnected}</p>
          </div>
        </div>

        {/* Interview Scheduled */}
        <div
          onClick={() => setActiveFilterCard("scheduled")}
          className={`bg-white dark:bg-slate-900 border border-slate-100 dark:border-gray-900/60 p-4 rounded-xl shadow-sm flex items-center gap-3.5 cursor-pointer transition-all hover:scale-[1.02] hover:shadow-md ${activeFilterCard === "scheduled" ? "ring-2 ring-cyan-650 bg-cyan-650/5" : ""
            }`}
        >
          <div className="w-9 h-9 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-600">
            <CalendarClock className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-black tracking-wider text-slate-400">Scheduled</p>
            <p className="text-lg font-black text-slate-800 dark:text-gray-150">{computedStats.interviewScheduled}</p>
          </div>
        </div>

        {/* Select & Reject */}
        <div
          onClick={() => setActiveFilterCard("selected_rejected")}
          className={`bg-white dark:bg-slate-900 border border-slate-100 dark:border-gray-900/60 p-4 rounded-xl shadow-sm flex items-center gap-3.5 cursor-pointer transition-all hover:scale-[1.02] hover:shadow-md ${activeFilterCard === "selected_rejected" ? "ring-2 ring-amber-650 bg-amber-650/5" : ""
            }`}
        >
          <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-600">
            <User className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-black tracking-wider text-slate-400">Selected/Rejected</p>
            <p className="text-xs font-bold text-slate-800 dark:text-gray-150 mt-0.5">
              🟢 <span className="font-extrabold">{computedStats.selected}</span> &nbsp;&nbsp; 🔴 <span className="font-extrabold">{computedStats.rejected}</span>
            </p>
          </div>
        </div>

        {/* Added from System Job Link */}
        <div
          onClick={() => setActiveFilterCard("system_link")}
          className={`bg-white dark:bg-slate-900 border border-slate-100 dark:border-gray-900/60 p-4 rounded-xl shadow-sm flex items-center gap-3.5 cursor-pointer transition-all hover:scale-[1.02] hover:shadow-md ${activeFilterCard === "system_link" ? "ring-2 ring-purple-650 bg-purple-650/5" : ""
            }`}
        >
          <div className="w-9 h-9 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-600">
            <Plus className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-black tracking-wider text-slate-400">System Link Added</p>
            <p className="text-lg font-black text-slate-800 dark:text-gray-150">{computedStats.systemJobLink}</p>
          </div>
        </div>
      </div>

      {/* Main Tabs and Actions toolbar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-gray-900/60 rounded-2xl shadow-sm overflow-hidden">

        {/* Platform Tabs */}
        <div className="flex border-b border-slate-100 dark:border-gray-800/80 overflow-x-auto bg-slate-50/50 dark:bg-slate-950/20">
          {platforms.map((plat) => (
            <button
              key={plat.id}
              onClick={() => setActivePlatformId(plat.id)}
              className={`px-5 py-3 text-xs font-bold whitespace-nowrap transition-all border-b-2 ${activePlatformId === plat.id
                ? "border-[#714B67] text-[#714B67] bg-white dark:bg-slate-900"
                : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-gray-300"
                }`}
            >
              {plat.name} ({plat.prefix})
            </button>
          ))}
        </div>

        {/* Toolbar */}
        <div className="p-4 border-b border-slate-50 dark:border-gray-850 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search leads across columns..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 dark:border-gray-800 rounded-lg bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-1 focus:ring-[#714B67]"
            />
          </div>

          <div className="text-[10px] font-medium text-slate-400">
            Showing {filteredLeads.length} of {dateFilteredLeads.length} leads
          </div>
        </div>

        {/* Datatable */}
        <div className="overflow-x-auto overflow-y-auto w-full max-h-[580px] custom-scrollbar">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-2">
              <div className="w-6 h-6 border-2 border-[#714B67] border-t-transparent animate-spin rounded-full"></div>
              <span className="text-xs text-slate-400 font-medium">Loading leads table...</span>
            </div>
          ) : filteredLeads.length === 0 ? (
            <div className="py-20 text-center">
              <FileSpreadsheet className="w-10 h-10 text-slate-300 dark:text-gray-755 mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-600 dark:text-gray-400">No leads found</p>
              <p className="text-xs text-slate-400 mt-1">Upload an Excel file to start importing leads for this platform.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-950 text-slate-450 border-b border-slate-100 dark:border-gray-850">
                  {visibleColumns.map((col) => (
                    <th
                      key={col}
                      className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider sticky top-0 bg-slate-50 dark:bg-slate-950 z-10 border-b border-slate-200 dark:border-gray-800 shadow-sm"
                    >
                      {formatHeader(col)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-gray-850">
                {filteredLeads.map((lead: any) => (
                  <React.Fragment key={lead.id}>
                    <tr
                      onClick={() => setExpandedLeadId(expandedLeadId === lead.id ? null : lead.id)}
                      className={`hover:bg-slate-50/50 dark:hover:bg-slate-950/10 text-slate-600 dark:text-gray-300 transition-colors cursor-pointer select-none ${expandedLeadId === lead.id ? "bg-slate-50/30 dark:bg-slate-950/5" : ""}`}
                    >
                      {visibleColumns.map((col) => {
                        const isNameCol = ["name", "full_name", "fullname", "candidate_name", "lead_name"].includes(col);
                        let displayVal = lead[col] || "";
                        if (col === "createdAt") {
                          if (lead[col]) {
                            const d = new Date(lead[col]);
                            displayVal = isNaN(d.getTime()) ? lead[col] : d.toLocaleDateString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric"
                            });
                          } else {
                            displayVal = "-";
                          }
                        } else if (col === "updatedAt") {
                          const status = (lead.status || "").toLowerCase();
                          if (status === "new" || !lead[col]) {
                            displayVal = "-";
                          } else {
                            const d = new Date(lead[col]);
                            displayVal = isNaN(d.getTime()) ? lead[col] : d.toLocaleDateString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric"
                            });
                          }
                        }

                        const isResumeCol = col.toLowerCase().includes("resume") || col.toLowerCase().includes("cv");
                        const isProfileCol = col.toLowerCase().includes("profile");
                        const isUrl = typeof displayVal === "string" && (displayVal.startsWith("http://") || displayVal.startsWith("https://"));

                        return (
                          <td key={col} className="px-4 py-3 text-xs truncate max-w-[200px]">
                            {isNameCol ? (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenLeadEdit(lead);
                                }}
                                className="font-extrabold text-[#714B67] hover:underline text-left"
                              >
                                {displayVal || "Unknown Candidate"}
                              </button>
                            ) : isUrl && displayVal && displayVal !== "-" ? (
                              <a
                                href={displayVal}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="text-blue-650 dark:text-blue-450 hover:underline font-extrabold inline-flex items-center gap-1"
                              >
                                {isResumeCol ? "View Resume 📄" : isProfileCol ? "View Profile 👤" : "Open Link 🔗"}
                              </a>
                            ) : (
                              displayVal || <span className="text-slate-300 dark:text-gray-700">-</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                    {expandedLeadId === lead.id && (
                      <tr className="bg-slate-50/20 dark:bg-slate-955/5">
                        <td colSpan={visibleColumns.length} className="px-8 py-5">
                          <div className="border border-slate-150/60 dark:border-gray-800 rounded-xl bg-white dark:bg-slate-900/60 p-5 shadow-inner">
                            <div className="flex items-center gap-2 mb-4 border-b border-slate-100 dark:border-gray-800 pb-2">
                              <History className="w-4 h-4 text-[#714B67]" />
                              <h4 className="text-xs font-extrabold text-slate-800 dark:text-gray-150 uppercase tracking-widest font-mono">Call logs history timeline</h4>
                            </div>

                            {(() => {
                              let historyList: any[] = [];
                              if (lead.call_history) {
                                try {
                                  const parsed = JSON.parse(lead.call_history);
                                  if (Array.isArray(parsed)) {
                                    historyList = parsed;
                                  }
                                } catch (e) {
                                  console.error("Error parsing history:", e);
                                }
                              }

                              if (historyList.length === 0) {
                                // Synthesize fallback entry if they have existing call metadata logged on the lead row
                                const remarksText = lead.call_remarks || lead.remarks;
                                const hasCurrentCallInfo = remarksText || (lead.status && lead.status !== "New");
                                if (hasCurrentCallInfo) {
                                  historyList.push({
                                    id: "fallback",
                                    status: lead.status || "No Answer",
                                    call_remarks: remarksText || "No remarks logged.",
                                    followup_date: lead.followup_date || null,
                                    interview_round: lead.interview_round || null,
                                    interview_date: lead.interview_date || null,
                                    interview_time: lead.interview_time || null,
                                    interview_mode: lead.interview_mode || null,
                                    interview_video_link: lead.interview_video_link || null,
                                    screenshot_url: lead.screenshot_url || null,
                                    recording_url: lead.recording_url || null,
                                    updatedAt: lead.updatedAt || lead.createdAt || new Date().toISOString(),
                                    updatedBy: "HR System"
                                  });
                                }
                              }

                              if (historyList.length === 0) {
                                return (
                                  <p className="text-xs text-slate-400 font-semibold italic text-center py-2">
                                    No calls logged for this candidate yet.
                                  </p>
                                );
                              }

                              const sortedHistory = [...historyList].reverse();

                              return (
                                <div className="max-h-[300px] overflow-y-auto pr-3 custom-scrollbar">
                                  <div className="relative flex flex-col gap-5 pl-5 border-l border-slate-200 dark:border-gray-800 ml-2 py-1">
                                    {sortedHistory.map((item, index) => {
                                      let colorClass = "bg-slate-400";
                                      if (item.status === "Interview Scheduled") colorClass = "bg-emerald-500";
                                      else if (item.status === "Connected") colorClass = "bg-blue-500";
                                      else if (["Busy", "No Answer"].includes(item.status)) colorClass = "bg-amber-500";
                                      else if (item.status === "Not Interested") colorClass = "bg-rose-500";

                                      return (
                                        <div key={item.id || index} className="relative flex flex-col gap-1.5 pb-2 last:pb-0 group">
                                          <div className={`absolute -left-[26px] top-1 w-3 h-3 rounded-full border-2 border-white dark:border-slate-900 ${colorClass} shadow-sm transition-transform group-hover:scale-110`} />

                                          <div className="flex items-center justify-between text-xs">
                                            <div className="flex items-center gap-2">
                                              <span className="font-extrabold text-slate-800 dark:text-gray-150 uppercase tracking-widest text-[11px]">
                                                {item.status || "Unknown Status"}
                                              </span>
                                              <span className="text-[10px] text-slate-400 dark:text-gray-500 font-bold uppercase tracking-wider">
                                                by {item.updatedBy || "System"}
                                              </span>
                                            </div>
                                            <span className="text-[10px] text-slate-400 dark:text-gray-500 font-bold font-mono">
                                              {new Date(item.updatedAt).toLocaleString("en-IN", {
                                                day: "2-digit",
                                                month: "short",
                                                year: "numeric",
                                                hour: "2-digit",
                                                minute: "2-digit"
                                              })}
                                            </span>
                                          </div>

                                          {item.call_remarks && (
                                            <p className="text-xs text-slate-650 dark:text-gray-300 font-medium leading-relaxed bg-slate-50 dark:bg-slate-950/40 p-3 rounded-lg border border-slate-100 dark:border-gray-850 whitespace-pre-wrap">
                                              {item.call_remarks}
                                            </p>
                                          )}

                                          {(item.screenshot_url || item.recording_url) && (
                                            <div className="flex items-center gap-2 flex-wrap pt-0.5">
                                              {item.screenshot_url && (
                                                <a
                                                  href={item.screenshot_url}
                                                  target="_blank"
                                                  rel="noopener noreferrer"
                                                  onClick={(e) => e.stopPropagation()}
                                                  className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider text-indigo-600 hover:text-indigo-855 bg-indigo-50 hover:bg-indigo-100/80 px-2.5 py-1 rounded-md border border-indigo-150 transition-colors"
                                                >
                                                  <ImageIcon className="w-3.5 h-3.5" /> View Screenshot
                                                </a>
                                              )}
                                              {item.recording_url && (
                                                <a
                                                  href={item.recording_url}
                                                  target="_blank"
                                                  rel="noopener noreferrer"
                                                  onClick={(e) => e.stopPropagation()}
                                                  className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider text-teal-600 hover:text-teal-855 bg-teal-50 hover:bg-teal-100/80 px-2.5 py-1 rounded-md border border-teal-150 transition-colors"
                                                >
                                                  <Play className="w-3.5 h-3.5" /> Play Recording
                                                </a>
                                              )}
                                            </div>
                                          )}

                                          {(item.followup_date || item.status === "Interview Scheduled") && (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1.5">
                                              {item.followup_date && (
                                                <div className="bg-amber-500/5 border border-amber-500/10 p-2.5 rounded-lg text-[10px] font-bold text-amber-700 dark:text-amber-500 flex items-center gap-2">
                                                  <CalendarClock className="w-4 h-4 text-amber-500" />
                                                  <span>Follow-up Date: <strong className="text-slate-800 dark:text-gray-250 font-extrabold">{new Date(item.followup_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</strong></span>
                                                </div>
                                              )}
                                              {item.status === "Interview Scheduled" && (
                                                <div className="bg-emerald-500/5 border border-emerald-555/10 p-2.5 rounded-lg text-[10px] font-bold text-emerald-800 dark:text-emerald-500 space-y-1 col-span-1 sm:col-span-2">
                                                  <p className="font-extrabold flex items-center gap-1.5 text-[11px] text-emerald-700 dark:text-emerald-400">
                                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Interview Details
                                                  </p>
                                                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-extrabold text-[9px] uppercase text-slate-500 dark:text-gray-400 tracking-wider">
                                                    <div>Round: <span className="text-slate-800 dark:text-gray-250 font-black">{item.interview_round || "1"}</span></div>
                                                    <div>Mode: <span className="text-slate-800 dark:text-gray-250 font-black">{item.interview_mode || "online"}</span></div>
                                                    <div>Date: <span className="text-slate-800 dark:text-gray-250 font-black">{item.interview_date || "N/A"}</span></div>
                                                    <div>Time: <span className="text-slate-800 dark:text-gray-250 font-black">{item.interview_time || "N/A"}</span></div>
                                                  </div>
                                                  {item.interview_video_link && item.interview_mode !== "offline" && (
                                                    <p className="text-[9px] pt-1">
                                                      Meeting Link: <a href={item.interview_video_link} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-indigo-600 hover:underline font-black break-all">{item.interview_video_link}</a>
                                                    </p>
                                                  )}
                                                </div>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* IMPORT MULTI-STEP WIZARD MODAL */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl shadow-xl border border-slate-100 dark:border-gray-800/80 overflow-hidden flex flex-col max-h-[85vh] animate-scaleIn">

            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 dark:border-gray-850 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-800 dark:text-gray-150">Excel Lead Importer</h2>
                <p className="text-[10px] text-slate-400 font-medium">Dynamic table & column schema builder</p>
              </div>
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-gray-300 font-bold"
              >
                ✕
              </button>
            </div>

            {/* Stepper Progress Indicator */}
            <div className="px-6 py-4 bg-slate-50/50 dark:bg-slate-950/20 border-b border-slate-100 dark:border-gray-850 flex items-center justify-center gap-3">
              <div className={`flex items-center gap-1.5 text-xs font-semibold ${importStep >= 1 ? "text-[#714B67]" : "text-slate-400"}`}>
                <span className={`w-5 h-5 rounded-full flex items-center justify-center border text-[10px] ${importStep >= 1 ? "border-[#714B67] bg-[#714B67]/10" : "border-slate-350"}`}>1</span>
                Platform
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-slate-300" />
              <div className={`flex items-center gap-1.5 text-xs font-semibold ${importStep >= 2 ? "text-[#714B67]" : "text-slate-400"}`}>
                <span className={`w-5 h-5 rounded-full flex items-center justify-center border text-[10px] ${importStep >= 2 ? "border-[#714B67] bg-[#714B67]/10" : "border-slate-350"}`}>2</span>
                Upload
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-slate-300" />
              <div className={`flex items-center gap-1.5 text-xs font-semibold ${importStep >= 3 ? "text-[#714B67]" : "text-slate-400"}`}>
                <span className={`w-5 h-5 rounded-full flex items-center justify-center border text-[10px] ${importStep >= 3 ? "border-[#714B67] bg-[#714B67]/10" : "border-slate-350"}`}>3</span>
                Confirm
              </div>
            </div>

            {/* Step Content Area */}
            <div className="flex-1 overflow-y-auto p-6">

              {/* STEP 1: Select or Create Platform */}
              {importStep === 1 && (
                <div className="space-y-4">
                  {!isCreatingPlatform ? (
                    <div className="space-y-3">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Choose Destination Platform</label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {platforms.map((plat) => (
                          <div
                            key={plat.id}
                            onClick={() => {
                              setSelectedPlatformId(plat.id);
                            }}
                            className={`p-4 border rounded-xl cursor-pointer hover:border-[#714B67] hover:bg-[#714B67]/5 dark:hover:bg-slate-950/20 transition-all flex items-center gap-3 group ${selectedPlatformId === plat.id ? "border-[#714B67] bg-[#714B67]/5 dark:bg-slate-950/30" : "border-slate-200 dark:border-gray-800"
                              }`}
                          >
                            <div className="w-8 h-8 rounded-lg bg-[#714B67]/10 text-[#714B67] flex items-center justify-center font-bold text-xs">
                              {plat.prefix}
                            </div>
                            <div className="flex-1">
                              <p className="text-xs font-bold text-slate-700 dark:text-gray-200 group-hover:text-[#714B67]">{plat.name}</p>
                              <p className="text-[9px] text-slate-400">Table: {plat.tableName}</p>
                            </div>
                            <ChevronRightIcon className="w-4 h-4 text-slate-300 group-hover:text-[#714B67] transition-all" />
                          </div>
                        ))}
                      </div>

                      {/* Department & Role Dropdowns */}
                      {selectedPlatformId && (
                        <div className="p-4 bg-slate-50/50 dark:bg-slate-955/10 border border-slate-100 dark:border-gray-850 rounded-xl space-y-4 animate-fadeIn">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Department Dropdown */}
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-slate-450 uppercase block">Assign Department</label>
                              {!isCreatingDept ? (
                                <div className="flex gap-2">
                                  <select
                                    value={selectedDepartmentId}
                                    onChange={(e) => {
                                      if (e.target.value === "add-new") {
                                        setIsCreatingDept(true);
                                        setSelectedDepartmentId("");
                                      } else {
                                        setSelectedDepartmentId(e.target.value);
                                      }
                                    }}
                                    className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-gray-800 rounded-lg bg-white dark:bg-slate-955/20 focus:outline-none focus:ring-1 focus:ring-[#714B67]"
                                  >
                                    <option value="">-- Select Department --</option>
                                    {departments.map((dept) => (
                                      <option key={dept.id} value={dept.id}>{dept.name}</option>
                                    ))}
                                    <option value="add-new" className="text-[#714B67] font-bold">+ Add New Department</option>
                                  </select>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2 animate-scaleIn">
                                  <input
                                    type="text"
                                    placeholder="New Department Name"
                                    value={newDeptName}
                                    onChange={(e) => setNewDeptName(e.target.value)}
                                    className="flex-1 px-3 py-1.5 text-xs border border-slate-200 dark:border-gray-800 rounded-lg dark:bg-slate-950 focus:outline-none focus:ring-1 focus:ring-[#714B67]"
                                  />
                                  <button
                                    type="button"
                                    onClick={handleCreateDepartment}
                                    disabled={savingDept}
                                    className="px-3 py-1.5 bg-[#714B67] hover:bg-[#8A5B7D] text-white text-xs font-bold rounded-lg disabled:opacity-50"
                                  >
                                    {savingDept ? "Saving..." : "Save"}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setIsCreatingDept(false);
                                      setNewDeptName("");
                                    }}
                                    className="px-2 py-1.5 text-xs text-slate-500 hover:text-slate-700"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              )}
                            </div>

                            {/* Role Dropdown */}
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-slate-450 uppercase block">Assign Role</label>
                              {selectedDepartmentId ? (
                                !isCreatingRole ? (
                                  <div className="flex gap-2">
                                    <select
                                      value={selectedRoleId}
                                      onChange={(e) => {
                                        if (e.target.value === "add-new") {
                                          setIsCreatingRole(true);
                                          setSelectedRoleId("");
                                        } else {
                                          setSelectedRoleId(e.target.value);
                                        }
                                      }}
                                      className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-gray-800 rounded-lg bg-white dark:bg-slate-955/20 focus:outline-none focus:ring-1 focus:ring-[#714B67]"
                                    >
                                      <option value="">-- Select Role --</option>
                                      {filteredRoles.map((role) => (
                                        <option key={role.id} value={role.id}>{role.name}</option>
                                      ))}
                                      <option value="add-new" className="text-[#714B67] font-bold">+ Add New Role</option>
                                    </select>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2 animate-scaleIn">
                                    <input
                                      type="text"
                                      placeholder="New Role Name"
                                      value={newRoleName}
                                      onChange={(e) => setNewRoleName(e.target.value)}
                                      className="flex-1 px-3 py-1.5 text-xs border border-slate-200 dark:border-gray-850 rounded-lg dark:bg-slate-955/20 focus:outline-none focus:ring-1 focus:ring-[#714B67]"
                                    />
                                    <button
                                      type="button"
                                      onClick={handleCreateRole}
                                      disabled={savingRole}
                                      className="px-3 py-1.5 bg-[#714B67] hover:bg-[#8A5B7D] text-white text-xs font-bold rounded-lg disabled:opacity-50"
                                    >
                                      {savingRole ? "Saving..." : "Save"}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setIsCreatingRole(false);
                                        setNewRoleName("");
                                      }}
                                      className="px-2 py-1.5 text-xs text-slate-500 hover:text-slate-700"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                )
                              ) : (
                                <select
                                  disabled
                                  className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-gray-150 rounded-lg bg-slate-100/60 dark:bg-slate-955/10 text-slate-400 dark:text-gray-500 cursor-not-allowed focus:outline-none"
                                >
                                  <option>-- Select Department First --</option>
                                </select>
                              )}
                            </div>
                          </div>

                          {/* Proceed to Upload Button */}
                          <div className="pt-2 flex justify-end">
                            <button
                              type="button"
                              onClick={() => setImportStep(2)}
                              disabled={!selectedPlatformId || !selectedDepartmentId || !selectedRoleId}
                              className="px-5 py-2 rounded-lg bg-[#714B67] hover:bg-[#8A5B7D] text-white font-bold text-xs shadow-md disabled:opacity-50 active:scale-95 transition-all"
                            >
                              Proceed to Upload →
                            </button>
                          </div>
                        </div>
                      )}

                      <div className="pt-4 border-t border-slate-100 dark:border-gray-850 flex justify-center">
                        <button
                          onClick={() => setIsCreatingPlatform(true)}
                          className="flex items-center gap-1.5 text-xs font-bold text-[#714B67] hover:text-[#8A5B7D]"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Create A New Platform Table
                        </button>
                      </div>
                    </div>
                  ) : (
                    <form onSubmit={handleCreatePlatformSubmit} className="space-y-4 max-w-md mx-auto">
                      <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wide">Register New Platform & Physical Table</h3>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Platform Name</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Glassdoor, Naukri"
                          value={newPlatformName}
                          onChange={(e) => setNewPlatformName(e.target.value)}
                          className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-gray-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#714B67] dark:bg-slate-950"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">ID Prefix (3-Letters)</label>
                        <input
                          type="text"
                          required
                          maxLength={3}
                          placeholder="e.g. GLD, NAK"
                          value={newPlatformPrefix}
                          onChange={(e) => setNewPlatformPrefix(e.target.value.toUpperCase())}
                          className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-gray-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#714B67] dark:bg-slate-950"
                        />
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => setIsCreatingPlatform(false)}
                          className="px-3 py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-4 py-1.5 text-xs font-bold bg-[#714B67] hover:bg-[#8A5B7D] text-white rounded-lg"
                        >
                          Create Table
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}

              {/* STEP 2: Drag and Drop Excel */}
              {importStep === 2 && (
                <div className="space-y-4">
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-200 dark:border-gray-850 hover:border-[#714B67] rounded-xl p-10 text-center cursor-pointer transition-all bg-slate-50/50 dark:bg-slate-950/10 hover:bg-[#714B67]/5"
                  >
                    <UploadCloud className="w-10 h-10 text-slate-350 mx-auto mb-3 animate-bounce" />
                    <p className="text-xs font-bold text-slate-700 dark:text-gray-250">Click or drag Excel file to upload</p>
                    <p className="text-[10px] text-slate-400 mt-1">Supports .xlsx or .xls spreadsheets</p>
                    <input
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      accept=".xlsx, .xls"
                      onChange={handleFileChange}
                    />
                  </div>

                  <div className="flex justify-between items-center text-xs pt-4">
                    <button
                      onClick={() => setImportStep(1)}
                      className="text-slate-500 hover:text-slate-700 font-semibold"
                    >
                      ← Back to Platform
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3: Preview Data and Verify Column Mapping */}
              {importStep === 3 && (
                <div className="space-y-4 flex flex-col h-full">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-slate-600">File: <span className="text-[#714B67]">{fileName}</span></p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Parsed {parsedLeads.length} rows and {parsedHeaders.length} columns</p>
                    </div>
                    <span className="bg-green-550/10 text-green-600 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Ready
                    </span>
                  </div>

                  {/* Columns to Create Notification */}
                  <div className="p-3 bg-amber-500/10 border border-amber-550/20 rounded-lg text-amber-700 dark:text-amber-500 text-[11px] font-medium flex gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Schema Sync Alert</p>
                      <p className="text-[10px] mt-0.5 opacity-90">
                        Any columns in this Excel file that do not currently exist in the database table will be created dynamically as new database columns. No columns will be skipped.
                      </p>
                    </div>
                  </div>

                  {/* Table Preview */}
                  <div className="border border-slate-100 dark:border-gray-850 rounded-lg overflow-x-auto max-h-[30vh]">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-950 text-slate-450 border-b border-slate-100 dark:border-gray-850">
                          {parsedHeaders.map((header) => (
                            <th key={header} className="px-3 py-2 text-[10px] font-bold uppercase whitespace-nowrap">
                              {header}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-gray-850">
                        {parsedLeads.slice(0, 5).map((row, idx) => (
                          <tr key={idx} className="text-slate-500 dark:text-gray-305">
                            {parsedHeaders.map((header) => (
                              <td key={header} className="px-3 py-2 text-xs truncate max-w-[150px]">
                                {row[header] !== undefined ? String(row[header]) : "-"}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {parsedLeads.length > 5 && (
                    <p className="text-center text-[10px] text-slate-400 font-semibold italic">
                      + {parsedLeads.length - 5} more rows parsed...
                    </p>
                  )}

                  <div className="flex justify-between items-center text-xs pt-4 border-t border-slate-50 dark:border-gray-850">
                    <button
                      onClick={() => {
                        setParsedLeads([]);
                        setParsedHeaders([]);
                        setImportStep(2);
                      }}
                      className="text-slate-500 hover:text-slate-700 font-semibold"
                    >
                      ← Re-upload File
                    </button>

                    <button
                      onClick={handleImportSubmit}
                      disabled={uploading}
                      className="px-5 py-2 rounded-lg bg-[#714B67] hover:bg-[#8A5B7D] text-white font-semibold flex items-center gap-1.5 shadow-md disabled:opacity-50 active:scale-95 transition-all"
                    >
                      {uploading ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent animate-spin rounded-full"></div>
                          Syncing DB & Columns...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Confirm & Import
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* LEAD CALL DETAILS / INTERVIEW WIZARD MODAL */}
      {selectedLeadForEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 w-full max-w-3xl rounded-2xl shadow-xl border border-slate-100 dark:border-gray-850 overflow-hidden flex flex-col max-h-[85vh] animate-scaleIn">

            <div className="px-6 py-4 border-b border-slate-100 dark:border-gray-850 flex items-center justify-between">
              <div>
                <h2 className="text-base font-extrabold text-black dark:text-white">Update Call Details & Actions</h2>
                <p className="text-[10px] text-slate-400 font-medium">Lead: {selectedLeadForEdit.name || selectedLeadForEdit.full_name || selectedLeadForEdit.fullname || selectedLeadForEdit.candidate_name || selectedLeadForEdit.lead_name || "Unknown Candidate"} ({selectedLeadForEdit.id})</p>
              </div>
              <button
                onClick={() => {
                  setSelectedLeadForEdit(null);
                  clearEditForm();
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-gray-300 font-bold"
              >
                ✕
              </button>
            </div>

            {/* Split Grid for Details and Edit Form */}
            <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-6">

              {/* Left Side: Candidate Info Overview */}
              <div className="space-y-4">
                <h3 className="text-xs font-extrabold text-black dark:text-white uppercase tracking-wider">Candidate Profile</h3>
                <div className="grid grid-cols-2 gap-2 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
                  {Object.keys(selectedLeadForEdit)
                    .filter((k) => ["id", "name", "full_name", "fullname", "candidate_name", "lead_name", "phone", "mobile", "mobile_no", "phone_no", "phone_number", "contact_no", "contact", "email", "email_id", "emailid", "email_address", "city", "qualification", "experience", "level_of_experience", "level_of_experien", "exp", "relevant_experience"].includes(k) && selectedLeadForEdit[k])
                    .map((k) => (
                      <div key={k} className="p-2.5 bg-slate-50 dark:bg-slate-955/20 border border-slate-100 dark:border-gray-855 rounded-lg">
                        <p className="text-[9px] uppercase font-bold text-slate-400">{formatHeader(k)}</p>
                        <p className="text-xs font-semibold text-slate-700 dark:text-gray-300 whitespace-pre-wrap break-all">{String(selectedLeadForEdit[k])}</p>
                      </div>
                    ))}
                </div>
              </div>

              {/* Right Side: Edit Form */}
              <form onSubmit={handleSaveLeadEdit} className="space-y-4">
                <h3 className="text-xs font-extrabold text-black dark:text-white uppercase tracking-wider">Log Call & Schedule</h3>

                {/* Call Status Dropdown */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Call/Lead Status</label>
                  {!isCreatingStatus ? (
                    <select
                      value={editStatus}
                      onChange={(e) => {
                        if (e.target.value === "add-new") {
                          setIsCreatingStatus(true);
                        } else {
                          setEditStatus(e.target.value);
                        }
                      }}
                      className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-gray-800 rounded-lg bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-1 focus:ring-[#714B67]"
                    >
                      <option value="">-- Select Status --</option>
                      {leadStatuses.map((st) => (
                        <option key={st.id} value={st.name}>{st.name}</option>
                      ))}
                      <option value="add-new" className="text-[#714B67] font-bold">+ Add New Status</option>
                    </select>
                  ) : (
                    <div className="flex items-center gap-2 animate-scaleIn">
                      <input
                        type="text"
                        placeholder="New Status Name"
                        value={newStatusName}
                        onChange={(e) => setNewStatusName(e.target.value)}
                        className="flex-1 px-3 py-1.5 text-xs border border-slate-200 dark:border-gray-800 rounded-lg bg-white dark:bg-slate-900 text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#714B67]"
                      />
                      <button
                        type="button"
                        onClick={handleCreateStatus}
                        disabled={savingStatus}
                        className="px-3 py-1.5 bg-[#714B67] hover:bg-[#8A5B7D] text-white text-xs font-bold rounded-lg disabled:opacity-50"
                      >
                        {savingStatus ? "Saving..." : "Save"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsCreatingStatus(false);
                          setNewStatusName("");
                        }}
                        className="px-2 py-1.5 text-xs text-slate-500 hover:text-slate-700"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>

                {/* Call Remarks / Conversation Notes */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Remarks / Discussion Notes</label>
                  <textarea
                    rows={3}
                    placeholder="E.g., Candidate is interested, scheduled round 1 interview..."
                    value={editCallRemarks}
                    onChange={(e) => setEditCallRemarks(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-gray-800 rounded-lg bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-1 focus:ring-[#714B67]"
                  />
                </div>

                {/* Conditional Screenshot Upload Proof (No Answer / Busy) */}
                {["No Answer", "Busy"].includes(editStatus) && (
                  <div className="space-y-1.5 p-3 bg-slate-50 dark:bg-slate-955/20 border border-slate-100 dark:border-gray-850 rounded-xl animate-fadeIn">
                    <label className="text-[10px] font-bold text-slate-400 uppercase block">Upload Screenshot Proof</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileUpload(e, "screenshot")}
                        className="hidden"
                        id="screenshot-upload"
                        disabled={uploadingFile}
                      />
                      <label
                        htmlFor="screenshot-upload"
                        className="px-3 py-1.5 bg-[#714B67] hover:bg-[#8A5B7D] text-white text-[11px] font-bold rounded-lg cursor-pointer flex items-center gap-1 active:scale-95 transition-all"
                      >
                        {uploadingFile ? "Uploading..." : "Choose Screenshot"}
                      </label>
                      {screenshotUrl ? (
                        <span className="text-[10px] text-green-600 font-bold truncate max-w-[150px]">
                          ✓ Uploaded (
                          <a href={screenshotUrl} target="_blank" rel="noopener noreferrer" className="underline hover:text-green-800">
                            View
                          </a>
                          )
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-medium">No screenshot uploaded</span>
                      )}
                    </div>
                  </div>
                )}

                {/* Conditional Call Recording Upload Proof (Connected / Not Interested) */}
                {["Connected", "Not Interested", "Connected & Interested"].includes(editStatus) && (
                  <div className="space-y-1.5 p-3 bg-slate-50 dark:bg-slate-955/20 border border-slate-100 dark:border-gray-850 rounded-xl animate-fadeIn">
                    <label className="text-[10px] font-bold text-slate-400 uppercase block">Upload Call Recording Proof</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="file"
                        accept="audio/*"
                        onChange={(e) => handleFileUpload(e, "recording")}
                        className="hidden"
                        id="recording-upload"
                        disabled={uploadingFile}
                      />
                      <label
                        htmlFor="recording-upload"
                        className="px-3 py-1.5 bg-[#714B67] hover:bg-[#8A5B7D] text-white text-[11px] font-bold rounded-lg cursor-pointer flex items-center gap-1 active:scale-95 transition-all"
                      >
                        {uploadingFile ? "Uploading..." : "Choose Audio"}
                      </label>
                      {recordingUrl ? (
                        <span className="text-[10px] text-green-600 font-bold truncate max-w-[150px]">
                          ✓ Uploaded (
                          <a href={recordingUrl} target="_blank" rel="noopener noreferrer" className="underline hover:text-green-800">
                            Listen
                          </a>
                          )
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-medium">No recording uploaded</span>
                      )}
                    </div>
                  </div>
                )}

                {/* Conditional Virtual Scheduler (Interview Scheduled) */}
                {editStatus === "Interview Scheduled" && (
                  <div className="p-4 bg-slate-50/50 dark:bg-slate-950/20 border border-slate-100 dark:border-gray-850 rounded-xl space-y-3 animate-fadeIn text-xs">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">Virtual Scheduler Settings</p>

                    <div className="grid grid-cols-2 gap-3 font-semibold text-slate-650">

                      {/* Assessment Round */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Assessment Round</label>
                        <select
                          value={schedRound}
                          onChange={(e) => setSchedRound(e.target.value)}
                          className="w-full px-2 py-1.5 border border-slate-200 dark:border-gray-800 rounded bg-white dark:bg-slate-900 text-slate-800 focus:outline-none"
                        >
                          <option value="1">Round-1: HR Assessment</option>
                          <option value="2">Round-2: Department Manager</option>
                          <option value="3">Round-3: DSM + Management (Mandatory)</option>
                        </select>
                      </div>

                      {/* Interview Mode */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Interview Mode</label>
                        <select
                          value={schedMode}
                          onChange={(e) => setSchedMode(e.target.value as "online" | "offline")}
                          className="w-full px-2 py-1.5 border border-slate-200 dark:border-gray-800 rounded bg-white dark:bg-slate-900 text-slate-800 focus:outline-none"
                        >
                          <option value="online">Online</option>
                          <option value="offline">Offline</option>
                        </select>
                      </div>

                      {/* Schedule Date */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Schedule Date</label>
                        <input
                          type="date"
                          value={schedDate}
                          onChange={(e) => setSchedDate(e.target.value)}
                          className="w-full px-2 py-1.5 border border-slate-200 dark:border-gray-800 rounded bg-white dark:bg-slate-900 text-slate-800 focus:outline-none"
                          required={editStatus === "Interview Scheduled"}
                        />
                      </div>

                      {/* Schedule Time */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Schedule Time</label>
                        <input
                          type="time"
                          value={schedTime}
                          onChange={(e) => setSchedTime(e.target.value)}
                          className="w-full px-2 py-1.5 border border-slate-200 dark:border-gray-800 rounded bg-white dark:bg-slate-900 text-slate-800 focus:outline-none"
                          required={editStatus === "Interview Scheduled"}
                        />
                      </div>

                      {/* Meeting Link (Suggested Google Meet) */}
                      {schedMode === "online" && (
                        <div className="col-span-2 flex flex-col gap-1.5 animate-fadeIn">
                          <label className="text-[10px] font-bold text-slate-400 uppercase">Virtual Meeting Link (Suggested Google Meet)</label>
                          <input
                            type="url"
                            value={schedVideoLink}
                            onChange={(e) => setSchedVideoLink(e.target.value)}
                            placeholder="Google Meet or Zoom Video url"
                            className="w-full px-2 py-1.5 border border-slate-200 dark:border-gray-800 rounded bg-white dark:bg-slate-900 text-slate-800 focus:outline-none"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Follow-up Date & Time (Conditional on No Answer / Busy / Connected & Interested) */}
                {["No Answer", "Busy", "Connected & Interested"].includes(editStatus) && (
                  <div className="grid grid-cols-2 gap-3 mt-2 p-3 bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-slate-100 dark:border-gray-850 animate-fadeIn">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-450 uppercase">Set Follow-up Date</label>
                      <input
                        type="date"
                        value={editFollowupDate}
                        onChange={(e) => setEditFollowupDate(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-gray-800 rounded-lg bg-white dark:bg-slate-900 text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#714B67]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-450 uppercase">Set Follow-up Time</label>
                      <input
                        type="time"
                        value={editFollowupTime}
                        onChange={(e) => setEditFollowupTime(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-gray-800 rounded-lg bg-white dark:bg-slate-900 text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#714B67]"
                      />
                    </div>
                  </div>
                )}

                {/* Submit button */}
                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedLeadForEdit(null);
                      clearEditForm();
                    }}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700"
                  >
                    Close
                  </button>
                  <button
                    type="submit"
                    disabled={savingEdit || uploadingFile}
                    className="px-4 py-1.5 text-xs font-bold bg-[#714B67] hover:bg-[#8A5B7D] text-white rounded-lg disabled:opacity-50 active:scale-95 transition-all shadow-md"
                  >
                    {savingEdit ? "Saving..." : "Save details"}
                  </button>
                </div>
              </form>

            </div>
          </div>
        </div>
      )}
    </div>

  );
}

// Micro-helper components for local icons to prevent imports mismatch
function ChevronRightIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      className={props.className}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  );
}
// Hot-reload recompile trigger comment
