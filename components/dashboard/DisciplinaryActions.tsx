"use client";
import React, { useState, useEffect, useMemo } from "react";
import {
  Plus, Search, RefreshCw, X, ShieldAlert, CheckCircle, AlertTriangle,
  Eye, EyeOff, User, Download, Calendar, Mail, FileText, HelpCircle,
  AlertOctagon, BadgeAlert, Building
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DisciplinaryActionsProps {
  sessionUser?: any;
  triggerToast: (msg: string) => void;
}

const REASONS = [
  "Misbehavior with Senior",
  "Misbehavior with Colleague",
  "Abusive Language",
  "Fighting",
  "Attendance Issue",
  "Unauthorized Leave",
  "Poor Performance",
  "Policy Violation",
  "Data Leak",
  "Security Violation",
  "Fraud",
  "Harassment",
  "Others"
];

export default function DisciplinaryActions({ sessionUser, triggerToast }: DisciplinaryActionsProps) {
  const [warnings, setWarnings] = useState<any[]>([]);
  const [selectedWarning, setSelectedWarning] = useState<any>(null);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Modal states
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [targetEmployeeId, setTargetEmployeeId] = useState("");
  const [reason, setReason] = useState(REASONS[0]);
  const [description, setDescription] = useState("");
  const [improvementPeriodDays, setImprovementPeriodDays] = useState(15);
  const [pipPlan, setPipPlan] = useState("");
  const [salaryHold, setSalaryHold] = useState<number>(0);
  const [promotionHold, setPromotionHold] = useState(false);
  const [bonusHold, setBonusHold] = useState(false);
  const [customReason, setCustomReason] = useState("");

  // Filter employee search for issue warning form
  const [empSearch, setEmpSearch] = useState("");
  const [empDropdownOpen, setEmpDropdownOpen] = useState(false);

  const loggedInUserId = sessionUser?.id;
  const loggedInRole = sessionUser?.role;
  const loggedInDesignation = sessionUser?.designation;
  const userRoleLower = (loggedInRole || "").toLowerCase();

  const isGlobalViewer = ["owner", "director", "hr head", "hr executive"].includes(userRoleLower);
  const isManager = isManagerRole(loggedInRole) || isManagerRole(loggedInDesignation);

  function isManagerRole(roleStr: string) {
    const r = (roleStr || "").toLowerCase();
    return r === "department manager" || r.includes("manager") || r === "dsm" || r === "owner" || r === "director" || r === "hr head" || r === "hr executive";
  }

  const loadWarnings = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/warnings");
      const data = await res.json();
      if (data.success) {
        setWarnings(data.data || []);
        // Preserve selection or select first
        if (data.data && data.data.length > 0) {
          const current = data.data.find((w: any) => selectedWarning && w.id === selectedWarning.id);
          setSelectedWarning(current || data.data[0]);
        } else {
          setSelectedWarning(null);
        }
      } else {
        triggerToast("Failed to load warnings: " + data.error);
      }
    } catch (err) {
      triggerToast("Error loading warnings list");
    } finally {
      setLoading(false);
    }
  };

  const loadEmployees = async () => {
    try {
      const res = await fetch("/api/employees");
      const data = await res.json();
      if (data.success) {
        setEmployees(data.data || []);
      }
    } catch (err) {
      console.error("Error loading employees directory:", err);
    }
  };

  useEffect(() => {
    loadWarnings();
    if (isManager) {
      loadEmployees();
    }
  }, []);

  // Filtered employees for warning issue form autocomplete
  const filteredEmployees = useMemo(() => {
    if (!empSearch.trim()) return employees;
    return employees.filter(emp =>
      emp.name?.toLowerCase().includes(empSearch.toLowerCase()) ||
      emp.email?.toLowerCase().includes(empSearch.toLowerCase())
    );
  }, [empSearch, employees]);

  // Determine warning level dynamically for warning issue preview
  const previewWarningLevel = useMemo(() => {
    if (!targetEmployeeId) return 1;
    // Count active/final warnings for selected employee
    const count = warnings.filter(w => w.employeeId === targetEmployeeId && w.status !== "Rejected").length;
    if (count === 0) return 1;
    if (count === 1) return 2;
    return 3;
  }, [targetEmployeeId, warnings]);

  // Handle warning submission
  const handleSubmitWarning = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetEmployeeId) {
      triggerToast("Please select a target employee");
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch("/api/warnings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: targetEmployeeId,
          reason: reason === "Others" ? customReason : reason,
          description,
          improvementPeriodDays: null,
          pipPlan: previewWarningLevel === 2 ? pipPlan : null,
          salaryHold: previewWarningLevel === 2 ? Number(salaryHold) : 0,
          promotionHold: previewWarningLevel === 2 ? promotionHold : false,
          bonusHold: previewWarningLevel === 2 ? bonusHold : false,
        })
      });

      const data = await res.json();
      if (data.success) {
        triggerToast(
          isGlobalViewer 
            ? "Warning issued and active successfully!" 
            : "Warning request submitted and sent to Owner for approval!"
        );
        setShowIssueModal(false);
        // Reset form
        setTargetEmployeeId("");
        setEmpSearch("");
        setDescription("");
        setReason(REASONS[0]);
        setCustomReason("");
        setImprovementPeriodDays(15);
        setPipPlan("");
        setSalaryHold(0);
        setPromotionHold(false);
        setBonusHold(false);
        loadWarnings();
      } else {
        triggerToast("Failed to issue warning: " + data.error);
      }
    } catch (err) {
      triggerToast("Error submitting warning request");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Owner approval / rejection
  const handleOwnerApproval = async (warningId: string, approve: boolean) => {
    try {
      setSubmitting(true);
      const res = await fetch("/api/warnings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          warningId,
          action: approve ? "approve" : "reject"
        })
      });
      const data = await res.json();
      if (data.success) {
        triggerToast(approve ? "Warning approved and activated successfully!" : "Warning request rejected.");
        loadWarnings();
      } else {
        triggerToast("Error: " + data.error);
      }
    } catch (err) {
      triggerToast("Error updating warning approval status");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle employee acknowledgment
  const handleEmployeeAcknowledgment = async (warningId: string) => {
    try {
      setSubmitting(true);
      const res = await fetch("/api/warnings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          warningId,
          action: "acknowledge"
        })
      });
      const data = await res.json();
      if (data.success) {
        triggerToast("You have acknowledged receipt of this disciplinary warning.");
        loadWarnings();
      } else {
        triggerToast("Error: " + data.error);
      }
    } catch (err) {
      triggerToast("Error updating warning acknowledgment");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle manual removal by Owner
  const handleRemoveWarning = async (warningId: string) => {
    if (!window.confirm("Are you sure you want to manually remove this disciplinary warning?")) return;
    try {
      setSubmitting(true);
      const res = await fetch(`/api/warnings?id=${warningId}`, {
        method: "DELETE"
      });
      const data = await res.json();
      if (data.success) {
        triggerToast("Disciplinary warning removed successfully.");
        setSelectedWarning(null);
        loadWarnings();
      } else {
        triggerToast("Error: " + data.error);
      }
    } catch (err) {
      triggerToast("Error removing disciplinary warning");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Level 3 termination review approvals
  const handleTerminationApproval = async (warningId: string) => {
    try {
      setSubmitting(true);
      const res = await fetch("/api/warnings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          warningId,
          action: "approve_termination"
        })
      });
      const data = await res.json();
      if (data.success) {
        triggerToast("Disciplinary review board approval logged successfully.");
        loadWarnings();
      } else {
        triggerToast("Error: " + data.error);
      }
    } catch (err) {
      triggerToast("Error submitting review approval");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Owner direct fire (Warning 3 only)
  const handleFireEmployee = async (warningId: string, employeeName: string) => {
    if (!window.confirm(`Are you sure you want to FIRE ${employeeName}? This action is irreversible and will immediately terminate their employment.`)) return;
    try {
      setSubmitting(true);
      const res = await fetch("/api/warnings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          warningId,
          action: "fire_employee"
        })
      });
      const data = await res.json();
      if (data.success) {
        triggerToast(`${employeeName} has been terminated. A formal notice has been sent via email.`);
        loadWarnings();
      } else {
        triggerToast("Error: " + data.error);
      }
    } catch (err) {
      triggerToast("Error firing employee");
    } finally {
      setSubmitting(false);
    }
  };

  // Filter warnings list
  const filteredWarnings = warnings.filter(w =>
    w.employeeDetails?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    w.reason?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    w.id.slice(-4).toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Check review board approval checkboxes
  const isHr = ["hr head", "hr executive"].includes(userRoleLower);
  const isOwner = ["owner", "director"].includes(userRoleLower);
  
  const isTargetEmployeeDeptHead = useMemo(() => {
    if (!selectedWarning || !sessionUser) return false;
    const targetDept = selectedWarning.employeeDetails?.department;
    const sessionDept = sessionUser.department;
    return targetDept && sessionDept && targetDept === sessionDept && (isManagerRole(sessionUser.role) || isManagerRole(sessionUser.designation));
  }, [selectedWarning, sessionUser]);

  return (
    <div className="space-y-8 animate-fadeIn text-slate-800">
      
      {/* 1. Header Section */}
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div>
          <h1 className="text-xl font-black text-slate-800 flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-rose-600 animate-pulse" />
            Disciplinary Warnings & Actions
          </h1>
          <p className="text-xs text-slate-500 mt-1">Record behavioral warnings, pipeline acknowledgments, and manage critical PIP hold policies</p>
        </div>
        
        {isManager && (
          <div className="flex gap-2">
            <button 
              onClick={() => setShowIssueModal(true)}
              className="bg-rose-600 hover:bg-rose-700 px-4 py-2.5 rounded-xl text-xs font-black text-white transition-all shadow flex items-center gap-1.5 uppercase tracking-wider"
            >
              <Plus className="w-4 h-4" /> Issue Warning
            </button>
            <button 
              onClick={loadWarnings} 
              disabled={loading}
              className="p-2.5 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-650 transition duration-150 shrink-0 shadow-sm"
            >
              <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
            </button>
          </div>
        )}
      </div>

      {/* 2. List & Detail Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left List Pane */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl p-4 flex flex-col h-[750px] shadow-sm">
          <h3 className="text-xs font-black tracking-widest text-slate-400 uppercase font-mono mb-3">Warnings Ledger</h3>
          
          <div className="relative mb-3">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input 
              type="text" 
              placeholder="Search by Employee or Reason..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs font-semibold focus:outline-none focus:border-rose-500 text-slate-800"
            />
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
            {loading ? (
              <div className="text-center py-10 font-bold text-slate-450 text-[10px] animate-pulse uppercase tracking-wider">Loading warnings...</div>
            ) : filteredWarnings.length === 0 ? (
              <div className="text-center py-10 text-slate-400 font-bold text-[10px] uppercase tracking-wider">No warnings recorded</div>
            ) : (
              filteredWarnings.map((w) => {
                const isSelected = selectedWarning && selectedWarning.id === w.id;
                const levelColor = w.warningLevel === 1 ? "bg-amber-100 text-amber-800" : w.warningLevel === 2 ? "bg-orange-100 text-orange-800" : "bg-red-100 text-red-800";
                
                return (
                  <button
                    key={w.id}
                    onClick={() => setSelectedWarning(w)}
                    className={cn(
                      "w-full text-left p-3.5 rounded-xl border transition-all flex flex-col gap-2 shadow-sm",
                      isSelected 
                        ? "bg-rose-50/30 border-rose-350" 
                        : "bg-white border-slate-100 hover:border-slate-350 hover:bg-slate-50/30"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono text-slate-400 font-bold">{w.id.slice(0, 8)}...</span>
                      <span className={cn("text-[9px] font-black uppercase px-2 py-0.5 rounded-full", levelColor)}>
                        Warning {w.warningLevel}
                      </span>
                    </div>

                    <div className="font-bold text-slate-800 text-xs truncate">
                      {w.employeeDetails?.name || "Target Employee"}
                    </div>

                    <div className="flex items-center justify-between mt-1 text-[10px] font-semibold text-slate-500">
                      <span className="truncate max-w-[150px]">{w.reason}</span>
                      <span className={cn(
                        "font-bold px-1.5 py-0.5 rounded",
                        w.status === "Pending Approval" && "bg-sky-50 text-sky-600 border border-sky-100",
                        w.status === "Acknowledged" && "bg-emerald-55 text-emerald-700 border border-emerald-100",
                        w.status === "Rejected" && "bg-rose-50 text-rose-600 border border-rose-100",
                        w.status === "Resolved" && "bg-slate-100 text-slate-700 border border-slate-200",
                        w.status === "Terminated" && "bg-slate-700 text-white",
                        ["Active Warning", "Final Warning", "Termination Review"].includes(w.status) && "bg-amber-50 text-amber-700 border border-amber-150"
                      )}>
                        {w.status}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Details Pane */}
        <div className="lg:col-span-8">
          {selectedWarning ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col h-[750px]">
              
              {/* Profile/Header info */}
              <div className="flex justify-between items-start gap-4 pb-4 border-b border-slate-150 shrink-0">
                <div className="space-y-1">
                  <h2 className="text-base font-black text-slate-850 flex items-center gap-2">
                    <ShieldAlert className="w-5 h-5 text-rose-600" />
                    Warning Report — {selectedWarning.id}
                  </h2>
                  <div className="text-slate-500 text-[10px] mt-1.5 flex flex-wrap gap-x-4 gap-y-1">
                    <span>Target Employee: <strong className="text-slate-800">{selectedWarning.employeeDetails?.name || "N/A"}</strong></span>
                    <span>Department: <strong className="text-slate-800">{selectedWarning.employeeDetails?.department || "N/A"}</strong></span>
                    <span>Issued By: <strong className="text-slate-750">{selectedWarning.issuedByDetails?.name || "N/A"} (${selectedWarning.issuedByDetails?.role || "Manager"})</strong></span>
                    <span>Date: <strong className="text-slate-750">{new Date(selectedWarning.createdAt).toLocaleString()}</strong></span>
                  </div>
                </div>
                
                <div className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-center min-w-28 shadow-sm">
                  <span className="text-[8px] uppercase font-black tracking-widest text-slate-450 block mb-0.5">Warning Status</span>
                  <span className={cn(
                    "text-xs font-bold",
                    selectedWarning.status === "Pending Approval" && "text-sky-600",
                    selectedWarning.status === "Acknowledged" && "text-emerald-600",
                    selectedWarning.status === "Rejected" && "text-rose-600",
                    selectedWarning.status === "Terminated" && "text-slate-800",
                    selectedWarning.status === "Resolved" && "text-slate-500",
                    ["Active Warning", "Final Warning", "Termination Review"].includes(selectedWarning.status) && "text-amber-600"
                  )}>
                    {selectedWarning.status}
                  </span>
                </div>
              </div>

              {/* Scrollable details */}
              <div className="flex-1 overflow-y-auto py-5 pr-2 scrollbar-thin space-y-6">
                <div className="bg-white p-8 font-sans leading-relaxed text-black animate-fadeIn select-text shadow-sm border border-slate-200 rounded-xl">
                  
                  {/* Memo Header */}
                  <div className="text-center border-b-2 border-black pb-4 mb-6">
                    <h2 className="text-2xl font-extrabold tracking-widest text-black">RS9 GROUP</h2>
                    <p className="text-[9px] font-bold tracking-widest uppercase text-slate-600">HUMAN RESOURCES & DISCIPLINARY COMPLIANCE BOARD</p>
                  </div>

                  <div className="space-y-6 text-xs text-black">
                    
                    {/* Memo Details */}
                    <div className="grid grid-cols-2 gap-4 text-xs font-sans text-black pb-4 border-b border-slate-200">
                      <div className="space-y-1.5 text-left">
                        <p><strong>DATE:</strong> {new Date(selectedWarning.createdAt).toLocaleDateString()}</p>
                        <p><strong>TO:</strong> {selectedWarning.employeeDetails?.name} <span className="text-slate-500">({selectedWarning.employeeDetails?.role || "Employee"})</span></p>
                        <p><strong>DEPARTMENT:</strong> {selectedWarning.employeeDetails?.department || "N/A"}</p>
                      </div>
                      <div className="text-right space-y-1.5">
                        <p><strong>MEMO REF:</strong> {selectedWarning.id}</p>
                        <p><strong>FROM:</strong> {selectedWarning.issuedByDetails?.name} <span className="text-slate-500">({selectedWarning.issuedByDetails?.role || "Authorized Manager"})</span></p>
                        <p><strong>COMPANY:</strong> RS9 GROUP</p>
                      </div>
                    </div>

                    {/* Subject */}
                    <div className="border-t border-b border-black py-2.5 my-4 text-center">
                      <h3 className="font-extrabold uppercase text-xs tracking-wider text-black">
                        SUBJECT: OFFICIAL DISCIPLINARY DIRECTIVE — WARNING {selectedWarning.warningLevel}
                      </h3>
                    </div>

                    {/* Salutation */}
                    <p className="font-bold pt-2 text-left">Dear {selectedWarning.employeeDetails?.name},</p>

                    {/* Letter Body */}
                    <p className="text-left">
                      This memorandum serves as an official notice of disciplinary action directive issued in accordance with Company Professional Policies. A formal complaint and subsequent administrative review have recorded a misconduct violation of category <strong>"{selectedWarning.reason}"</strong>.
                    </p>

                    <p className="text-left">
                      The specific incident rationale and details filed by the complainant are documented below:
                    </p>

                    <div className="my-4 pl-6 border-l-2 border-black italic text-black whitespace-pre-wrap leading-relaxed text-left">
                      "{selectedWarning.description}"
                    </div>

                    {selectedWarning.warningLevel === 2 && (
                      <div className="my-5 p-5 border border-slate-350 rounded-xl bg-slate-50/50 space-y-3 font-sans text-left">
                        <h5 className="font-bold uppercase text-[10px] tracking-wider text-black">Warning 2 Final Warning Holds & PIP Activated:</h5>
                        <ul className="list-disc pl-5 space-y-1 text-slate-800 font-sans">
                          {selectedWarning.salaryHold && Number(selectedWarning.salaryHold) > 0 && <li><strong>Salary increment hold:</strong> Active ({selectedWarning.salaryHold} Months)</li>}
                          {selectedWarning.promotionHold && <li><strong>Promotion eligibility hold:</strong> Active (3 to 6 Months)</li>}
                          {selectedWarning.bonusHold && <li><strong>Performance bonus payout hold:</strong> Active (3 to 6 Months)</li>}
                        </ul>
                        <div className="mt-4 pt-3 border-t border-slate-200">
                          <p className="font-bold text-[9px] uppercase tracking-wider text-black">Performance Improvement Plan Targets:</p>
                          <p className="mt-1 text-slate-700 italic">"{selectedWarning.pipPlan || "No target targets entered."}"</p>
                        </div>
                      </div>
                    )}

                    <p className="text-left">
                      Please be advised that failure to show required improvements, or any subsequent recurrence of company policy violations, will result in immediate escalation to the next disciplinary severity tier, <strong>up to and including service contract termination</strong>.
                    </p>

                    {/* Signature Block */}
                    <div className="grid grid-cols-2 gap-8 pt-10 border-t border-slate-100 font-sans">
                      <div className="space-y-1 text-left font-sans">
                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Issued By Authority:</p>
                        <p className="font-extrabold text-black pt-1">{selectedWarning.issuedByDetails?.name}</p>
                        <p className="text-slate-600 font-semibold">{selectedWarning.issuedByDetails?.role || "Authorized Manager"}</p>
                        <p className="text-[10px] text-slate-400 font-mono">RS9 Group Corporate Division</p>
                      </div>
                      <div className="text-right space-y-1 font-sans">
                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Target Recipient:</p>
                        <p className="font-extrabold text-black pt-1">{selectedWarning.employeeDetails?.name}</p>
                        <p className="text-slate-655 font-semibold">{selectedWarning.employeeDetails?.role || "Employee"}</p>
                        <p className="text-[10px] text-slate-400 font-mono">RS9 Group Operations Division</p>
                      </div>
                    </div>

                  </div>
                </div>

                {/* Management controls for Owner, HR, Managers */}
                {loggedInUserId !== selectedWarning.employeeId && (
                  <div className="mt-8 pt-6 border-t-2 border-dashed border-slate-200 space-y-6">
                    <h4 className="font-sans text-xs font-black text-slate-800 uppercase tracking-wider text-left">Management Review & Action Controls</h4>
                    
                    {/* Management indicator */}
                    <div className="p-4 bg-slate-55/40 border border-slate-100 rounded-xl flex items-center justify-between gap-4">
                      <div className="text-left">
                        <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 font-mono">Disciplinary Tier</span>
                        <h4 className="text-sm font-black text-slate-850 mt-0.5">
                          Warning {selectedWarning.warningLevel} - {
                            selectedWarning.warningLevel === 1 ? "First Written Warning" : selectedWarning.warningLevel === 2 ? "Final Written Warning" : "Termination Review Process"
                          }
                        </h4>
                      </div>
                      <div className="flex gap-1.5 shrink-0">
                        <span className={cn("w-3.5 h-3.5 rounded-full", selectedWarning.warningLevel >= 1 ? "bg-amber-400" : "bg-slate-200")} />
                        <span className={cn("w-3.5 h-3.5 rounded-full", selectedWarning.warningLevel >= 2 ? "bg-orange-500" : "bg-slate-200")} />
                        <span className={cn("w-3.5 h-3.5 rounded-full", selectedWarning.warningLevel >= 3 ? "bg-red-650 animate-pulse" : "bg-slate-200")} />
                      </div>
                    </div>

                    {/* Level 3 Approval Workflow Panel */}
                    {/* Render Termination Letter if terminated, visible to everyone */}
                    {selectedWarning.warningLevel === 3 && selectedWarning.status === "Terminated" && (
                      <div className="p-4 bg-emerald-50 border border-emerald-250 rounded-xl space-y-3 shadow-inner text-left">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-5 h-5 text-emerald-600" />
                          <div>
                            <h5 className="text-xs font-black text-slate-800 uppercase tracking-wide">termination cleared</h5>
                            <p className="text-[9px] text-slate-500 font-semibold mt-0.5">Required approvals obtained. Service contract termination finalized.</p>
                          </div>
                        </div>

                        <div className="p-4 bg-white border border-emerald-100 rounded-lg space-y-4">
                          <h4 className="text-xs font-serif font-black text-rose-700 tracking-wider text-center uppercase">official service termination notice</h4>
                          <div className="text-[9px] text-slate-700 font-semibold space-y-2 leading-relaxed border-t border-b border-slate-100 py-3 font-mono">
                            <p>Date: {selectedWarning.terminatedAt ? new Date(selectedWarning.terminatedAt).toLocaleDateString() : new Date().toLocaleDateString()}</p>
                            <p>To: {selectedWarning.employeeDetails?.name}</p>
                            <p>Re: Termination of Employment Services due to repeated policy non-compliance.</p>
                            <p>Following the Disciplinary Review Board's evaluation regarding Warning 3 and repeated failure to meet policy goals, we regret to inform you that your employment services have been terminated.</p>
                            <p>Approved By: HR Head &amp; Department manager.</p>
                          </div>
                          <button
                            onClick={() => {
                              const element = document.createElement("a");
                              const file = new Blob([`Official Termination Letter for ${selectedWarning.employeeDetails?.name}\nDate: ${new Date().toLocaleDateString()}\nReason: ${selectedWarning.reason}`], {type: 'text/plain'});
                              element.href = URL.createObjectURL(file);
                              element.download = `termination_letter_${selectedWarning.employeeDetails?.name}.txt`;
                              document.body.appendChild(element);
                              element.click();
                              triggerToast("Termination document generated and downloaded.");
                            }}
                            className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold text-[10px] py-2 rounded-xl flex items-center justify-center gap-1.5 uppercase tracking-wider transition-colors shadow-sm"
                          >
                            <Download className="w-3.5 h-3.5" /> Download PDF Notice
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Show Board Approvals panel only if not terminated and NOT Owner */}
                    {selectedWarning.warningLevel === 3 && selectedWarning.status !== "Terminated" && !isOwner && (
                      <div className="bg-red-50/20 border border-red-100 rounded-xl p-5 space-y-4">
                        <h4 className="text-[9px] font-black tracking-widest text-red-600 uppercase font-mono pb-2 border-b border-red-100 flex items-center gap-1.5 text-left">
                          <AlertOctagon className="w-3.5 h-3.5" /> Disciplinary Review Board Approvals (Direct Fire Guard)
                        </h4>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {/* HR Head approval check */}
                          <div className="bg-white border border-slate-250 p-4 rounded-xl flex flex-col justify-between h-28 shadow-sm text-left">
                            <div>
                              <span className="text-[8px] font-black uppercase tracking-wider text-slate-400">Step 1</span>
                              <h5 className="text-xs font-bold text-slate-800">HR Review</h5>
                            </div>
                            {selectedWarning.hrApproved ? (
                              <div className="text-emerald-600 text-xs font-bold flex items-center gap-1">
                                <CheckCircle className="w-4 h-4" /> APPROVED
                              </div>
                            ) : (
                              <button
                                disabled={!isHr || submitting}
                                onClick={() => handleTerminationApproval(selectedWarning.id)}
                                className="w-full bg-[#5D3E53] hover:bg-[#4a3142] disabled:opacity-40 text-white font-bold text-[10px] py-1.5 rounded-lg uppercase tracking-wider transition-colors shadow-sm"
                              >
                                Approve HR
                              </button>
                            )}
                          </div>

                          {/* Department Head approval check */}
                          <div className="bg-white border border-slate-250 p-4 rounded-xl flex flex-col justify-between h-28 shadow-sm text-left">
                            <div>
                              <span className="text-[8px] font-black uppercase tracking-wider text-slate-400">Step 2</span>
                              <h5 className="text-xs font-bold text-slate-800">Dept Head Approval</h5>
                            </div>
                            {selectedWarning.deptHeadApproved ? (
                              <div className="text-emerald-600 text-xs font-bold flex items-center gap-1">
                                <CheckCircle className="w-4 h-4" /> APPROVED
                              </div>
                            ) : (
                              <button
                                disabled={(!isTargetEmployeeDeptHead && !isOwner) || submitting}
                                onClick={() => handleTerminationApproval(selectedWarning.id)}
                                className="w-full bg-[#5D3E53] hover:bg-[#4a3142] disabled:opacity-40 text-white font-bold text-[10px] py-1.5 rounded-lg uppercase tracking-wider transition-colors shadow-sm"
                              >
                                Approve Dept
                              </button>
                            )}
                          </div>

                          {/* Director Approval check */}
                          <div className="bg-white border border-slate-250 p-4 rounded-xl flex flex-col justify-between h-28 shadow-sm text-left">
                            <div>
                              <span className="text-[8px] font-black uppercase tracking-wider text-slate-450">Step 3 (Optional)</span>
                              <h5 className="text-xs font-bold text-slate-800">Director Approval</h5>
                            </div>
                            {selectedWarning.directorApproved ? (
                              <div className="text-emerald-600 text-xs font-bold flex items-center gap-1">
                                <CheckCircle className="w-4 h-4" /> APPROVED
                              </div>
                            ) : (
                              <button
                                disabled={!isOwner || submitting}
                                onClick={() => handleTerminationApproval(selectedWarning.id)}
                                className="w-full bg-[#5D3E53] hover:bg-[#4a3142] disabled:opacity-40 text-white font-bold text-[10px] py-1.5 rounded-lg uppercase tracking-wider transition-colors shadow-sm"
                              >
                                Approve Director
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Complete Letter Generation section */}
                        {selectedWarning.hrApproved && selectedWarning.deptHeadApproved && (
                          <div className="p-4 bg-emerald-50 border border-emerald-250 rounded-xl space-y-3 shadow-inner text-left">
                            <div className="flex items-center gap-2">
                              <CheckCircle className="w-5 h-5 text-emerald-600" />
                              <div>
                                <h5 className="text-xs font-black text-slate-800 uppercase tracking-wide">termination cleared</h5>
                                <p className="text-[9px] text-slate-500 font-semibold mt-0.5">Required approvals obtained. Service contract termination finalized.</p>
                              </div>
                            </div>
                            <button
                              onClick={() => handleTerminationApproval(selectedWarning.id)}
                              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-3 rounded-xl flex items-center justify-center gap-1.5 uppercase tracking-widest transition-colors shadow-md"
                            >
                              Generate Termination Letter
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 6. Dynamic Action Workspace Footer */}
              <div className="mt-4 pt-4 border-t border-slate-150 shrink-0">
                {selectedWarning.status === "Pending Approval" && isOwner && (
                  <div className="flex gap-3">
                    <button
                      disabled={submitting}
                      onClick={() => handleOwnerApproval(selectedWarning.id, true)}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow flex items-center justify-center gap-1.5"
                    >
                      <CheckCircle className="w-4 h-4" /> Approve Warning
                    </button>
                    <button
                      disabled={submitting}
                      onClick={() => handleOwnerApproval(selectedWarning.id, false)}
                      className="flex-1 bg-rose-600 hover:bg-rose-700 text-white py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow flex items-center justify-center gap-1.5"
                    >
                      <X className="w-4 h-4" /> Reject Warning
                    </button>
                  </div>
                )}

              {/* Manual removal option for Owner */}
                {selectedWarning.status !== "Pending Approval" && selectedWarning.status !== "Resolved" && selectedWarning.status !== "Terminated" && isOwner && (
                  <button
                    disabled={submitting}
                    onClick={() => handleRemoveWarning(selectedWarning.id)}
                    className="w-full bg-rose-600 hover:bg-rose-700 text-white py-3.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow flex items-center justify-center gap-1.5"
                  >
                    <X className="w-4 h-4" /> Remove Disciplinary Warning
                  </button>
                )}

                {/* Owner — Direct Fire Employee button for Warning 3 only */}
                {isOwner && selectedWarning.warningLevel === 3 && selectedWarning.status !== "Terminated" && selectedWarning.status !== "Resolved" && (
                  <div className="mt-3 p-4 bg-red-950/5 border-2 border-red-700/30 rounded-xl space-y-3">
                    <div className="flex items-center gap-2">
                      <AlertOctagon className="w-5 h-5 text-red-700 shrink-0" />
                      <div>
                        <h5 className="text-[10px] font-black uppercase tracking-widest text-red-700">Owner — Direct Termination Authority</h5>
                        <p className="text-[9px] text-slate-500 mt-0.5">As Owner, you may terminate this employee immediately without waiting for board approvals.</p>
                      </div>
                    </div>
                    <button
                      disabled={submitting}
                      onClick={() => handleFireEmployee(selectedWarning.id, selectedWarning.employeeDetails?.name || "Employee")}
                      className="w-full bg-red-700 hover:bg-red-800 text-white py-3.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg flex items-center justify-center gap-2 animate-pulse"
                    >
                      <AlertOctagon className="w-4 h-4" /> 🔥 FIRE EMPLOYEE — Terminate Immediately
                    </button>
                  </div>
                )}

                {selectedWarning.status === "Terminated" && (
                  <div className="mt-3 p-4 bg-slate-800 border border-slate-700 rounded-xl flex items-center gap-3 text-white">
                    <AlertOctagon className="w-5 h-5 text-rose-400 shrink-0" />
                    <div>
                      <p className="text-xs font-black uppercase tracking-wider text-rose-400">Employee Terminated</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Termination notice sent via email. {selectedWarning.terminatedAt ? `Date: ${new Date(selectedWarning.terminatedAt).toLocaleDateString()}` : ""}</p>
                    </div>
                  </div>
                )}

                {selectedWarning.status === "Resolved" && (
                  <div className="p-3 bg-slate-100 border border-slate-200 rounded-xl flex items-center justify-center gap-2 text-slate-700 text-xs font-bold w-full">
                    <CheckCircle className="w-5 h-5" /> Warning Resolved &amp; Removed from Employee view
                  </div>
                )}

                {selectedWarning.status === "Acknowledged" && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-center gap-2 text-emerald-750 text-xs font-bold">
                    <CheckCircle className="w-5 h-5" /> Warning Acknowledged on {selectedWarning.acknowledgedAt ? new Date(selectedWarning.acknowledgedAt).toLocaleString() : "N/A"}
                  </div>
                )}
              </div>

            </div>
          ) : (
            <div className="text-center py-32 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-center items-center h-[750px]">
              <ShieldAlert className="w-12 h-12 text-slate-300 mb-4" />
              <h4 className="text-sm font-black text-slate-800 uppercase tracking-wide">No Warning Selected</h4>
              <p className="text-xs text-slate-400 mt-2 max-w-xs leading-normal">
                Select a disciplinary record from the ledger list to view warning status, acknowledgments, and holds.
              </p>
            </div>
          )}
        </div>

      </div>

      {/* 3. Issue Warning Modal Popup */}
      {showIssueModal && (
        <div className="fixed inset-0 z-[9999] overflow-y-auto bg-black/40 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl animate-scale-in flex flex-col relative max-h-[90vh] border border-[#E8E4DF]">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-[#E8E4DF] flex justify-between items-center bg-[#FCFBF9]">
              <h3 className="font-serif text-base text-slate-800 flex items-center gap-2 font-semibold">
                <ShieldAlert className="w-5 h-5 text-rose-600" />
                ISSUE DISCIPLINARY WARNING
              </h3>
              <button 
                onClick={() => setShowIssueModal(false)}
                className="p-1.5 text-slate-450 hover:text-rose-600 rounded-lg transition-colors border border-transparent hover:border-rose-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <form onSubmit={handleSubmitWarning} className="p-6 overflow-y-auto flex-1 space-y-6">
              
              {/* Employee selector autocomplete style */}
              <div className="relative">
                <label className="block text-[9px] uppercase tracking-wider text-black font-black mb-1">Select Employee *</label>
                <input
                  type="text"
                  placeholder="Type name or email to search employee..."
                  value={empSearch}
                  onFocus={() => setEmpDropdownOpen(true)}
                  onChange={e => {
                    setEmpSearch(e.target.value);
                    setEmpDropdownOpen(true);
                  }}
                  className="w-full bg-white border border-[#E8E4DF] focus:border-rose-450 rounded-lg px-3 py-2 text-xs focus:outline-none font-semibold text-slate-700"
                  required={!targetEmployeeId}
                />
                
                {empDropdownOpen && filteredEmployees.length > 0 && (
                  <div className="absolute left-0 right-0 z-[10000] mt-1 bg-white border border-[#E8E4DF] rounded-xl shadow-xl max-h-48 overflow-y-auto divide-y divide-[#E8E4DF] font-sans">
                    {filteredEmployees.map(emp => (
                      <button
                        key={emp.id}
                        type="button"
                        onClick={() => {
                          setTargetEmployeeId(emp.id);
                          setEmpSearch(emp.name || "");
                          setEmpDropdownOpen(false);
                        }}
                        className="w-full text-left px-4 py-2.5 text-xs hover:bg-slate-50 transition-colors flex justify-between items-center"
                      >
                        <span className="font-bold text-slate-750">{emp.name}</span>
                        <span className="text-[9px] font-mono text-slate-450 font-semibold">{emp.email} (${emp.role})</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Misconduct Reason dropdown */}
              <div>
                <label className="block text-[9px] uppercase tracking-wider text-black font-black mb-1">Offense Category *</label>
                <select
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  className="w-full bg-white border border-[#E8E4DF] focus:border-rose-450 rounded-lg px-3 py-2 text-xs focus:outline-none font-bold text-slate-700"
                >
                  {REASONS.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              {reason === "Others" && (
                <div className="animate-fadeIn">
                  <label className="block text-[9px] uppercase tracking-wider text-black font-black mb-1">Specify Custom Reason *</label>
                  <input
                    type="text"
                    required
                    placeholder="Enter custom misconduct reason..."
                    value={customReason}
                    onChange={e => setCustomReason(e.target.value)}
                    className="w-full bg-white border border-[#E8E4DF] focus:border-rose-450 rounded-lg px-3 py-2 text-xs focus:outline-none font-semibold text-slate-700"
                  />
                </div>
              )}

              {/* Warning Rationale details */}
              <div>
                <label className="block text-[9px] uppercase tracking-wider text-black font-black mb-1">Incident Rationale Description *</label>
                <textarea
                  placeholder="Document specific details, date, and description of misconduct..."
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  required
                  rows={4}
                  className="w-full bg-white border border-[#E8E4DF] focus:border-rose-450 rounded-lg p-3 text-xs focus:outline-none font-semibold text-slate-800 leading-relaxed"
                />
              </div>

              {/* Level preview box */}
              {targetEmployeeId && (
                <div className="p-4 bg-slate-50 border border-slate-205 rounded-xl space-y-1">
                  <span className="text-[8px] font-black uppercase tracking-wider text-slate-450">calculated severity</span>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">
                      Disciplinary Tier Assigned: <strong>Warning {previewWarningLevel}</strong>
                    </span>
                    <span className={cn(
                      "text-[9px] font-black px-2 py-0.5 rounded-full uppercase",
                      previewWarningLevel === 1 ? "bg-amber-100 text-amber-800" : previewWarningLevel === 2 ? "bg-orange-100 text-orange-800" : "bg-red-100 text-red-800"
                    )}>
                      {previewWarningLevel === 1 ? "verbal/written" : previewWarningLevel === 2 ? "final warning" : "termination review"}
                    </span>
                  </div>
                  <p className="text-[9px] text-slate-455 font-semibold mt-1">
                    {previewWarningLevel === 1 && "* Warning 1 does not have any timeline."}
                    {previewWarningLevel === 2 && "* Warning 2 requires warning hold configurations and performance plan."}
                    {previewWarningLevel === 3 && "* Warning 3 forwards case directly to HR and Department review boards."}
                  </p>
                </div>
              )}
                            {/* Level 2 PIP holds configuration */}
              {targetEmployeeId && previewWarningLevel === 2 && (
                <div className="bg-orange-50/20 border border-orange-100 rounded-xl p-4 space-y-4 font-sans text-left">
                  <h4 className="text-[9px] font-black tracking-widest text-orange-600 uppercase font-mono border-b border-orange-100 pb-2">
                    Warning 2 Policy Holds & PIP
                  </h4>
                  
                  <div className="space-y-3 font-sans text-left">
                    <label className="text-[10px] font-bold text-slate-655 block">Optional Warning Holds:</label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[9px] uppercase tracking-wider text-slate-400 font-bold mb-1 font-sans">Salary Hold Duration</label>
                        <select
                          value={salaryHold}
                          onChange={e => setSalaryHold(Number(e.target.value))}
                          className="w-full bg-white border border-[#E8E4DF] focus:border-rose-455 rounded-lg px-2.5 py-1.5 text-[10px] focus:outline-none font-bold text-slate-700"
                        >
                          <option value={0}>No Hold</option>
                          <option value={1}>1 Month</option>
                          <option value={2}>2 Months</option>
                          <option value={3}>3 Months</option>
                          <option value={4}>4 Months</option>
                          <option value={5}>5 Months</option>
                          <option value={6}>6 Months</option>
                        </select>
                      </div>
                      
                      <div className="flex flex-col justify-end">
                        <label className="flex items-center gap-2 p-2.5 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-700 cursor-pointer h-[34px] font-sans">
                          <input type="checkbox" checked={promotionHold} onChange={e => setPromotionHold(e.target.checked)} className="accent-orange-500 w-3.5 h-3.5" />
                          Promotion Hold
                        </label>
                      </div>

                      <div className="flex flex-col justify-end">
                        <label className="flex items-center gap-2 p-2.5 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-700 cursor-pointer h-[34px] font-sans">
                          <input type="checkbox" checked={bonusHold} onChange={e => setBonusHold(e.target.checked)} className="accent-orange-500 w-3.5 h-3.5" />
                          Bonus Hold
                        </label>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[9px] uppercase tracking-wider text-black font-black mb-1 font-mono">Performance Improvement Plan (PIP) details *</label>
                    <textarea
                      placeholder="Specify targets, tasks, daily checkpoints, and PIP feedback criteria..."
                      value={pipPlan}
                      onChange={e => setPipPlan(e.target.value)}
                      required={previewWarningLevel === 2}
                      rows={3}
                      className="w-full bg-white border border-[#E8E4DF] focus:border-rose-450 rounded-lg p-2.5 text-xs focus:outline-none font-semibold text-slate-850 leading-relaxed"
                    />
                  </div>
                </div>
              )}

              {/* Informative Approval message */}
              {!isGlobalViewer && (
                <div className="p-3.5 bg-sky-50 border border-sky-150 rounded-xl flex items-start gap-2.5 text-sky-750 text-[10px] font-bold">
                  <HelpCircle className="w-4 h-4 shrink-0 text-sky-600 mt-0.5" />
                  <div>
                    Approval Required: Since you are a Department Manager, this warning request will start as "Pending Approval" and require the Owner's review before being issued to the employee.
                  </div>
                </div>
              )}

              {/* Modal buttons */}
              <div className="flex gap-3 pt-4 border-t border-[#E8E4DF] mt-6">
                <button
                  type="button"
                  onClick={() => setShowIssueModal(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-[#E8E4DF] text-xs font-black uppercase tracking-wider text-slate-500 hover:bg-[#F5F0EA] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-rose-600 text-white text-xs font-black uppercase tracking-wider hover:bg-rose-700 disabled:opacity-50 transition-colors shadow-sm flex items-center justify-center gap-1.5"
                >
                  {submitting ? "Submitting..." : (isGlobalViewer ? "Issue Warning" : "Submit Request")}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
