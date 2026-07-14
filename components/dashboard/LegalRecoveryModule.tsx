"use client";
import React, { useState, useEffect } from "react";
import {
  Search, PlusCircle, PhoneCall, RefreshCw, X, Building, Banknote,
  FileAudio, History, Calendar, CheckCircle, ArrowLeft, LayoutGrid, FileText,
  Landmark, Network, Filter, Briefcase
} from "lucide-react";
import { cn } from "@/lib/utils";
import BankMasterView from "./legal-recovery/BankMasterView";
import BranchMasterView from "./legal-recovery/BranchMasterView";
import CasesMasterView from "./legal-recovery/CasesMasterView";
import DailyCallReportsView from "./legal-recovery/DailyCallReportsView";
import PaymentCollectionsView from "./legal-recovery/PaymentCollectionsView";
import LegalWorkLogsView from "./legal-recovery/LegalWorkLogsView";
import NoticeBoardView from "./legal-recovery/NoticeBoardView";

interface LegalRecoveryModuleProps {
  userRole?: string;
  triggerToast: (msg: string) => void;
  sessionUser?: any;
}

const WORK_CATEGORIES: Record<string, string[]> = {
  "ADVOCATE NOTICE": [
    "TAKE NOTICE ASSIGNMENT", "COLLECT NOTICE DATA", "PREPARE NOTICE LIST",
    "GENERATE NOTICE VIA SOFTWARE/MAIL MERGE", "DISPATCH NOTICES", "PREPARE BILL (BILL BANWANA)", "REQUEST PAYMENT"
  ],
  "RECOVERY SUIT / PSA APPLICATION": [
    "PREPARE RECOVERY SUIT / PSA APPLICATION", "COLLECT DOCUMENTS FROM BRANCH",
    "PREPARE CASE FILE", "SUBMIT TO ADVOCATE", "PREPARE BILL (BILL BANWANA)", "REQUEST PAYMENT"
  ],
  "RACO RODA": [
    "SCAN RODA FILE", "PREPARE RODA SET", "PREPARE RODA FILE",
    "SUBMIT RODA FILE TO SDM OFFICE", "PREPARE BILL (BILL BANWANA)", "REQUEST PAYMENT", "ISSUE SUMMONS"
  ],
  "SARFEASI NOTICE": [
    "COLLECT SARFAESI NOTICE DATA", "DRAFT SARFAESI NOTICE",
    "DISPATCH NOTICE", "OBTAIN POST OFFICE TRACKING", "PREPARE BILL (BILL BANWANA)", "REQUEST PAYMENT"
  ],
  "SY. POSSESSION": [
    "SOE TYPING & PRINTING", "TAKE SYMBOLIC POSSESSION", "DISPATCH POSSESSION NOTICE",
    "PUBLISH IN NEWSPAPER", "PREPARE BILL (BILL BANWANA)", "REQUEST PAYMENT"
  ],
  "DM ORDER": [
    "DM APPLICATION TYPING & PRINTING", "PREPARE DM APPLICATION",
    "SUBMIT APPLICATION IN DM COURT", "OBTAIN DM ORDER", "PREPARE BILL (BILL BANWANA)", "REQUEST PAYMENT"
  ],
  "SP ORDER": [
    "SP APPLICATION TYPING & PRINTING", "SUBMIT SP APPLICATION", "OBTAIN ASSESSMENT REPORT FROM POLICE STATION",
    "OBTAIN ORDER FOR DD", "SUBMIT DD WITH SP OFFICE LETTER",
    "OBTAIN ORDER FOR POSSESSION", "ARRANGE POLICE ASSISTANCE", "PREPARE BILL (BILL BANWANA)", "REQUEST PAYMENT"
  ],
  "PY. POSSESSION": [
    "SOE TYPING & PRINTING", "TAKE PHYSICAL POSSESSION", "DISPATCH POSSESSION NOTICE",
    "PUBLISH IN NEWSPAPER", "PREPARE BILL (BILL BANWANA)", "REQUEST PAYMENT"
  ],
  "SEIZER": [
    "COLLECT NOTICE DATA", "PREPARE NOTICE", "DISPATCH NOTICE", "TRACK POSTAL DELIVERY", "PREPARE BILL (BILL BANWANA)", "REQUEST PAYMENT"
  ]
};

export default function LegalRecoveryModule({ userRole, triggerToast, sessionUser }: LegalRecoveryModuleProps) {
  const [activeSubModule, setActiveSubModule] = useState<"launcher" | "follow-up" | "masters" | "history" | "banks" | "branches" | "collections" | "work-logs" | "notices">("launcher");

  const [cases, setCases] = useState<any[]>([]);
  const [banksList, setBanksList] = useState<any[]>([]);
  const [branchesList, setBranchesList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [showAddCaseForm, setShowAddCaseForm] = useState(false);
  const [showAddBankForm, setShowAddBankForm] = useState(false);
  const [showAddBranchForm, setShowAddBranchForm] = useState(false);
  const [editBranchId, setEditBranchId] = useState<number | null>(null);
  const [showFollowUpForm, setShowFollowUpForm] = useState<{ show: boolean, master: any | null }>({ show: false, master: null });
  const [showWorkLogForm, setShowWorkLogForm] = useState<{ show: boolean, master: any | null }>({ show: false, master: null });
  const [showMarketingForm, setShowMarketingForm] = useState<{ show: boolean, branch: any | null }>({ show: false, branch: null });
  const [showHistoryModal, setShowHistoryModal] = useState<{ show: boolean, masterId: number | null }>({ show: false, masterId: null });
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [workLogHistoryData, setWorkLogHistoryData] = useState<any[]>([]);
  const [globalHistory, setGlobalHistory] = useState<any[]>([]);
  const [loadingGlobalHistory, setLoadingGlobalHistory] = useState(false);
  const [globalWorkLogs, setGlobalWorkLogs] = useState<any[]>([]);
  const [loadingGlobalWorkLogs, setLoadingGlobalWorkLogs] = useState(false);
  const [payments, setPayments] = useState<any[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState<{ show: boolean, master: any | null }>({ show: false, master: null });

  // Submitting States
  const [submittingCase, setSubmittingCase] = useState(false);
  const [submittingBank, setSubmittingBank] = useState(false);
  const [submittingBranch, setSubmittingBranch] = useState(false);
  const [submittingFollowUp, setSubmittingFollowUp] = useState(false);
  const [submittingWorkLog, setSubmittingWorkLog] = useState(false);
  const [submittingMarketing, setSubmittingMarketing] = useState(false);
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Forms
  const [bankForm, setBankForm] = useState({ bankName: "", bankCode: "" });
  const [branchForm, setBranchForm] = useState({ bankId: "", branchName: "", branchCode: "", branchEmail: "", branchManager: "", branchManagerContact: "", aoName: "", foName: "", foContact: "", rbo: "" });
  const [caseForm, setCaseForm] = useState({
    bankName: "", branchName: "", branchId: "", aoName: "",
    deptManagerName: "", contactNumber: "", pendingAmount: "", pendingSince: ""
  });
  const [editCaseId, setEditCaseId] = useState<number | null>(null);
  const [selectedBankIdForCase, setSelectedBankIdForCase] = useState("");

  const [followUpForm, setFollowUpForm] = useState({
    callStatus: "Connected", conversationDetails: "", nextFollowUpDate: "", callDate: new Date().toISOString().split('T')[0]
  });
  const [workLogForm, setWorkLogForm] = useState({
    category: "ADVOCATE NOTICE", subCategory: "NOTICE KA KAM LENA", remarks: "", workDate: new Date().toISOString().split('T')[0]
  });
  const [marketingForm, setMarketingForm] = useState({
    callType: "Business Development", callStatus: "Connected", conversationDetails: "", nextFollowUpDate: "", callDate: new Date().toISOString().split('T')[0]
  });
  const [customCallType, setCustomCallType] = useState("");
  const [customCallStatus, setCustomCallStatus] = useState("");
  const [audioFile, setAudioFile] = useState<File | null>(null);

  const [paymentForm, setPaymentForm] = useState({
    amount: "", paymentDate: new Date().toISOString().split('T')[0], paymentMode: "NEFT/RTGS", otherPaymentMode: "", transactionId: "", remarks: ""
  });
  const [proofFile, setProofFile] = useState<File | null>(null);

  const fetchCases = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/legal-recovery");
      const data = await res.json();
      if (res.ok && data.success) {
        setCases(data.data || []);
      }
    } catch (error) {
      console.error("Error fetching cases:", error);
      triggerToast("Failed to load legal recovery cases");
    } finally {
      setLoading(false);
    }
  };

  const fetchBanks = async () => {
    try {
      const res = await fetch("/api/legal-recovery/banks");
      const data = await res.json();
      if (res.ok && data.success) {
        setBanksList(data.data || []);
      }
    } catch (error) {
      console.error("Error fetching banks:", error);
    }
  };

  const fetchBranches = async () => {
    try {
      const res = await fetch("/api/legal-recovery/branches");
      const data = await res.json();
      if (res.ok && data.success) {
        setBranchesList(data.data || []);
      }
    } catch (error) {
      console.error("Error fetching branches:", error);
    }
  };

  useEffect(() => {
    fetchBanks();
    fetchBranches();
  }, []);

  useEffect(() => {
    if (activeSubModule !== "launcher" && activeSubModule !== "banks" && activeSubModule !== "branches" && activeSubModule !== "collections" && activeSubModule !== "work-logs") {
      fetchCases();
    }
    if (activeSubModule === "history") {
      fetchGlobalHistory();
    }
    if (activeSubModule === "collections") {
      fetchPayments();
    }
    if (activeSubModule === "work-logs") {
      fetchGlobalWorkLogs();
      fetchCases();
    }
  }, [activeSubModule]);

  const fetchGlobalHistory = async () => {
    try {
      setLoadingGlobalHistory(true);
      const [resFollowup, resMarketing, resWorkLog, resPayment] = await Promise.all([
        fetch("/api/legal-recovery/followup"),
        fetch("/api/legal-recovery/marketing-call"),
        fetch("/api/legal-recovery/work-log"),
        fetch("/api/legal-recovery/payment")
      ]);
      const dataFollowup = await resFollowup.json();
      const dataMarketing = await resMarketing.json();
      const dataWorkLog = await resWorkLog.json();
      const dataPayment = await resPayment.json();

      let merged: any[] = [];
      if (dataFollowup.success && dataFollowup.data) {
        merged = [...merged, ...dataFollowup.data.map((item: any) => ({ ...item, logType: 'Follow-up' }))];
      }
      if (dataMarketing.success && dataMarketing.data) {
        merged = [...merged, ...dataMarketing.data.map((item: any) => ({ ...item, logType: 'Business Development' }))];
      }
      if (dataWorkLog.success && dataWorkLog.data) {
        merged = [...merged, ...dataWorkLog.data.map((item: any) => ({ ...item, logType: 'Legal Work Log' }))];
      }
      if (dataPayment.success && dataPayment.data) {
        merged = [...merged, ...dataPayment.data.map((item: any) => ({ ...item, logType: 'Payment Collection' }))];
      }

      merged.sort((a, b) => {
        const dateA = new Date(a.callDate || a.workDate || a.paymentDate || a.createdAt).getTime();
        const dateB = new Date(b.callDate || b.workDate || b.paymentDate || b.createdAt).getTime();
        return dateB - dateA;
      });

      setGlobalHistory(merged);
    } catch (error) {
      console.error("Error fetching global history:", error);
    } finally {
      setLoadingGlobalHistory(false);
    }
  };

  const fetchGlobalWorkLogs = async () => {
    try {
      setLoadingGlobalWorkLogs(true);
      const res = await fetch("/api/legal-recovery/work-log");
      const data = await res.json();
      if (res.ok && data.success) {
        setGlobalWorkLogs(data.data || []);
      }
    } catch (error) {
      console.error("Error fetching global work logs:", error);
    } finally {
      setLoadingGlobalWorkLogs(false);
    }
  };

  const fetchPayments = async () => {
    try {
      setLoadingPayments(true);
      const res = await fetch("/api/legal-recovery/payment");
      const data = await res.json();
      if (res.ok && data.success) {
        setPayments(data.data || []);
      }
    } catch (error) {
      console.error("Error fetching payments:", error);
    } finally {
      setLoadingPayments(false);
    }
  };

  const handleAddBankSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bankForm.bankName) {
      triggerToast("Bank Name is required.");
      return;
    }
    if (submittingBank) return;
    try {
      setSubmittingBank(true);
      const res = await fetch("/api/legal-recovery/banks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bankForm)
      });
      const result = await res.json();
      if (result.success) {
        triggerToast(`Bank Registered Successfully! ID: ${result.data.bankCode}`);
        setShowAddBankForm(false);
        setBankForm({ bankName: "", bankCode: "" });
        fetchBanks();
      } else {
        triggerToast(result.error || "Failed to add bank");
      }
    } catch (error) {
      console.error(error);
      triggerToast("Error adding bank");
    } finally {
      setSubmittingBank(false);
    }
  };

  const handleAddBranchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchForm.bankId || !branchForm.branchName) {
      triggerToast("Bank and Branch Name are required.");
      return;
    }
    if (submittingBranch) return;
    try {
      setSubmittingBranch(true);
      if (editBranchId) {
        // Edit existing branch
        const res = await fetch("/api/legal-recovery/branches", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editBranchId,
            ...branchForm,
            bankId: parseInt(branchForm.bankId)
          })
        });
        const result = await res.json();
        if (result.success) {
          triggerToast("Branch Updated Successfully!");
          setShowAddBranchForm(false);
          setEditBranchId(null);
          setBranchForm({ bankId: "", branchName: "", branchCode: "", branchEmail: "", branchManager: "", branchManagerContact: "", aoName: "", foName: "", foContact: "", rbo: "" });
          fetchBranches();
        } else {
          triggerToast(result.error || "Failed to update branch");
        }
      } else {
        // Add new branch
        const res = await fetch("/api/legal-recovery/branches", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...branchForm,
            bankId: parseInt(branchForm.bankId)
          })
        });
        const result = await res.json();
        if (result.success) {
          triggerToast(`Branch Registered Successfully! ID: ${result.data.branchCode}`);
          setShowAddBranchForm(false);
          setBranchForm({ bankId: "", branchName: "", branchCode: "", branchEmail: "", branchManager: "", branchManagerContact: "", aoName: "", foName: "", foContact: "", rbo: "" });
          fetchBranches();
        } else {
          triggerToast(result.error || "Failed to add branch");
        }
      }
    } catch (error) {
      console.error(error);
      triggerToast("Error saving branch");
    } finally {
      setSubmittingBranch(false);
    }
  };

  const handleAddCaseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!caseForm.bankName || !caseForm.pendingAmount) {
      triggerToast("Bank Name and Pending Amount are required.");
      return;
    }
    if (submittingCase) return;
    try {
      setSubmittingCase(true);
      const isEdit = !!editCaseId;
      const res = await fetch("/api/legal-recovery", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isEdit ? { ...caseForm, id: editCaseId } : caseForm)
      });
      const result = await res.json();
      if (result.success) {
        triggerToast(isEdit ? "Case Updated Successfully!" : "New Case Registered Successfully!");
        setShowAddCaseForm(false);
        setEditCaseId(null);
        setSelectedBankIdForCase("");
        setCaseForm({
          bankName: "", branchName: "", branchId: "", aoName: "",
          deptManagerName: "", contactNumber: "", pendingAmount: "", pendingSince: ""
        });
        fetchCases();
      } else {
        triggerToast(result.error || "Failed to add case");
      }
    } catch (error) {
      console.error(error);
      triggerToast("Error adding case");
    } finally {
      setSubmittingCase(false);
    }
  };

  const handleDeleteCase = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this case? This action cannot be undone.")) return;
    try {
      const res = await fetch(`/api/legal-recovery?id=${id}`, { method: "DELETE" });
      const result = await res.json();
      if (result.success) {
        triggerToast("Case deleted successfully");
        fetchCases();
      } else {
        triggerToast(result.error || "Failed to delete case");
      }
    } catch (error) {
      console.error(error);
      triggerToast("Error deleting case");
    }
  };

  const handleEditCase = (c: any) => {
    setCaseForm({
      bankName: c.bankName || "", branchName: c.branchName || "", branchId: c.branchId || "", aoName: c.aoName || "",
      deptManagerName: c.deptManagerName || "", contactNumber: c.contactNumber || "", pendingAmount: c.pendingAmount || "", pendingSince: c.pendingSince ? new Date(c.pendingSince).toISOString().split('T')[0] : ""
    });
    setEditCaseId(c.id);
    setShowAddCaseForm(true);
  };

  const handleFollowUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showFollowUpForm.master?.id) return;
    if (submittingFollowUp) return;
    try {
      setSubmittingFollowUp(true);
      let callRecordingUrl = "";

      if (audioFile) {
        const formData = new FormData();
        formData.append("file", audioFile);

        const uploadRes = await fetch("/api/documents/upload", {
          method: "POST",
          body: formData,
        });
        const uploadResult = await uploadRes.json();
        if (uploadResult.success) {
          callRecordingUrl = uploadResult.url;
        } else {
          triggerToast("Warning: Failed to upload audio. Proceeding without recording.");
        }
      }

      const payload = {
        masterId: showFollowUpForm.master.id,
        bankName: showFollowUpForm.master.bankName,
        branchName: showFollowUpForm.master.branchName,
        callerId: sessionUser?.id || "",
        callerName: sessionUser?.name || (sessionUser?.firstName ? `${sessionUser.firstName} ${sessionUser.lastName || ''}`.trim() : "Employee"),
        callStatus: followUpForm.callStatus,
        conversationDetails: followUpForm.conversationDetails,
        nextFollowUpDate: followUpForm.nextFollowUpDate,
        callDate: followUpForm.callDate,
        callRecordingUrl
      };

      const res = await fetch("/api/legal-recovery/followup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const result = await res.json();
      if (result.success) {
        triggerToast("Follow up saved & Task created successfully!");
        setShowFollowUpForm({ show: false, master: null });
        setFollowUpForm({ callStatus: "Connected", conversationDetails: "", nextFollowUpDate: "", callDate: new Date().toISOString().split('T')[0] });
        setAudioFile(null);
      } else {
        triggerToast(result.error || "Failed to save follow up");
      }
    } catch (error) {
      console.error(error);
      triggerToast("Error saving follow up");
    } finally {
      setSubmittingFollowUp(false);
    }
  };

  const handleMarketingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showMarketingForm.branch) return;
    if (submittingMarketing) return;
    try {
      setSubmittingMarketing(true);

      let callRecordingUrl = "";

      if (audioFile) {
        const formData = new FormData();
        formData.append("file", audioFile);

        const uploadRes = await fetch("/api/documents/upload", {
          method: "POST",
          body: formData,
        });
        const uploadResult = await uploadRes.json();
        if (uploadResult.success) {
          callRecordingUrl = uploadResult.url;
        } else {
          triggerToast("Warning: Failed to upload audio. Proceeding without recording.");
        }
      }

      const res = await fetch("/api/legal-recovery/marketing-call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...marketingForm,
          callType: marketingForm.callType === "Others" ? customCallType : marketingForm.callType,
          callStatus: marketingForm.callStatus === "Others" ? customCallStatus : marketingForm.callStatus,
          branchCode: showMarketingForm.branch.branchCode,
          branchName: showMarketingForm.branch.branchName,
          bankName: banksList.find((b: any) => b.id === showMarketingForm.branch.bankId)?.bankName || 'Unknown Bank',
          callRecordingUrl
        })
      });

      const result = await res.json();
      if (result.success) {
        triggerToast("Business Development call logged & Task created successfully!");
        setShowMarketingForm({ show: false, branch: null });
        setMarketingForm({ callType: "Business Development", callStatus: "Connected", conversationDetails: "", nextFollowUpDate: "", callDate: new Date().toISOString().split('T')[0] });
        setCustomCallType("");
        setCustomCallStatus("");
        setAudioFile(null);
      } else {
        triggerToast(result.error || "Failed to log branch call");
      }
    } catch (error) {
      console.error(error);
      triggerToast("Error saving call log");
    } finally {
      setSubmittingMarketing(false);
    }
  };

  const handleWorkLogSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showWorkLogForm.master) return;
    setSubmittingWorkLog(true);

    try {
      const res = await fetch("/api/legal-recovery/work-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...workLogForm,
          masterId: showWorkLogForm.master.id,
        })
      });

      const result = await res.json();
      if (result.success) {
        triggerToast("Work Logged Successfully!");
        setShowWorkLogForm({ show: false, master: null });
        setWorkLogForm({ category: "ADVOCATE NOTICE", subCategory: "NOTICE KA KAM LENA", remarks: "", workDate: new Date().toISOString().split('T')[0] });
      } else {
        triggerToast(result.error || "Failed to log work");
      }
    } catch (error) {
      console.error(error);
      triggerToast("Error saving work log");
    } finally {
      setSubmittingWorkLog(false);
    }
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showPaymentForm.master) return;
    setSubmittingPayment(true);

    try {
      let uploadedProofUrl = null;
      if (proofFile) {
        const formData = new FormData();
        formData.append("file", proofFile);
        formData.append("type", "recovery-proof");
        const uploadRes = await fetch("/api/documents/upload", { method: "POST", body: formData });
        const uploadData = await uploadRes.json();
        if (uploadData.success) {
          uploadedProofUrl = uploadData.url;
        } else {
          triggerToast("Failed to upload proof");
          setSubmittingPayment(false);
          return;
        }
      }

      const finalPaymentMode = paymentForm.paymentMode === "Others" ? paymentForm.otherPaymentMode : paymentForm.paymentMode;

      const res = await fetch("/api/legal-recovery/payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...paymentForm,
          paymentMode: finalPaymentMode,
          masterId: showPaymentForm.master.id,
          receivedBy: sessionUser?.name || "System",
          proofUrl: uploadedProofUrl
        })
      });

      const data = await res.json();
      if (data.success) {
        triggerToast("Payment recorded successfully!");
        setShowPaymentForm({ show: false, master: null });
        setPaymentForm({ amount: "", paymentDate: new Date().toISOString().split('T')[0], paymentMode: "NEFT/RTGS", otherPaymentMode: "", transactionId: "", remarks: "" });
        setProofFile(null);
        if (activeSubModule === "collections") {
          fetchPayments();
        } else {
          fetchCases(); // Refresh pending amounts
        }
      } else {
        triggerToast("Error recording payment");
      }
    } catch (error) {
      console.error(error);
      triggerToast("Error recording payment");
    } finally {
      setSubmittingPayment(false);
    }
  };

  const openHistory = async (masterId: number) => {
    setShowHistoryModal({ show: true, masterId });
    setLoadingHistory(true);
    setHistoryData([]);
    setWorkLogHistoryData([]);
    try {
      const [resFollowup, resWorkLogs] = await Promise.all([
        fetch(`/api/legal-recovery/followup?masterId=${masterId}`),
        fetch(`/api/legal-recovery/work-log?masterId=${masterId}`)
      ]);
      const resultFollowup = await resFollowup.json();
      const resultWorkLogs = await resWorkLogs.json();
      if (resultFollowup.success) {
        setHistoryData(resultFollowup.data);
      }
      if (resultWorkLogs.success) {
        setWorkLogHistoryData(resultWorkLogs.data);
      }
    } catch (error) {
      console.error(error);
      triggerToast("Failed to load history");
    } finally {
      setLoadingHistory(false);
    }
  };

  // ODOO-STYLE LAUNCHER VIEW
  if (activeSubModule === "launcher") {
    return (
      <div className="space-y-6 animate-fade-in text-[#1C1C1A]">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#E8E4DF] pb-5">
          <div>
            <span className="text-[9px] uppercase tracking-widest text-indigo-600 font-bold flex items-center gap-1">
              <LayoutGrid className="w-3 h-3 text-[#C9A84C]" /> App Modules
            </span>
            <h2 className="text-xl font-light tracking-wide font-serif" style={{ fontFamily: "'Playfair Display', serif" }}>
              Legal Recovery Apps
            </h2>
          </div>
        </div>

        {/* Apps Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6 pt-4">

          {/* Module 2: Masters */}
          <button
            onClick={() => setActiveSubModule("masters")}
            className="group flex flex-col items-center justify-center p-6 bg-white border border-[#E8E4DF] rounded-2xl hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:border-emerald-200 transition-all duration-300"
          >
            <div className="w-16 h-16 bg-gradient-to-br from-emerald-50 to-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-sm">
              <Building size={28} strokeWidth={2} />
            </div>
            <span className="font-bold text-sm text-slate-800">Bank Cases</span>
            <span className="text-[10px] text-slate-500 mt-1 uppercase tracking-wider font-semibold">Add Cases</span>
          </button>

          {/* Module 3: Manage Banks */}
          <button
            onClick={() => setActiveSubModule("banks")}
            className="group flex flex-col items-center justify-center p-6 bg-white border border-[#E8E4DF] rounded-2xl hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:border-sky-200 transition-all duration-300"
          >
            <div className="w-16 h-16 bg-gradient-to-br from-sky-50 to-sky-100 text-sky-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-sm">
              <Landmark size={28} strokeWidth={2} />
            </div>
            <span className="font-bold text-sm text-slate-800">Bank Master</span>
            <span className="text-[10px] text-slate-500 mt-1 uppercase tracking-wider font-semibold">Add Banks</span>
          </button>

          {/* Module 4: Manage Branches */}
          <button
            onClick={() => setActiveSubModule("branches")}
            className="group flex flex-col items-center justify-center p-6 bg-white border border-[#E8E4DF] rounded-2xl hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:border-pink-200 transition-all duration-300"
          >
            <div className="w-16 h-16 bg-gradient-to-br from-pink-50 to-pink-100 text-pink-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-sm">
              <Network size={28} strokeWidth={2} />
            </div>
            <span className="font-bold text-sm text-slate-800">Branch Master</span>
            <span className="text-[10px] text-slate-500 mt-1 uppercase tracking-wider font-semibold">Add Branches</span>
          </button>

          {/* Module 5: History */}
          <button
            onClick={() => setActiveSubModule("history")}
            className="group flex flex-col items-center justify-center p-6 bg-white border border-[#E8E4DF] rounded-2xl hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:border-amber-200 transition-all duration-300"
          >
            <div className="w-16 h-16 bg-gradient-to-br from-amber-50 to-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-sm">
              <FileText size={28} strokeWidth={2} />
            </div>
            <span className="font-bold text-sm text-slate-800">All Reports</span>
            <span className="text-[10px] text-slate-500 mt-1 uppercase tracking-wider font-semibold">Call History</span>
          </button>

          {/* Module 6: Collections */}
          <button
            onClick={() => setActiveSubModule("collections")}
            className="group flex flex-col items-center justify-center p-6 bg-white border border-[#E8E4DF] rounded-2xl hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:border-emerald-200 transition-all duration-300"
          >
            <div className="w-16 h-16 bg-gradient-to-br from-emerald-50 to-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-sm">
              <Banknote size={28} strokeWidth={2} />
            </div>
            {/* <span className="font-bold text-sm text-slate-800">Collections</span> */}
            <span className="font-bold text-sm text-slate-800">Collections</span>
            <span className="text-[10px] text-slate-500 mt-1 uppercase tracking-wider font-semibold">Payments Received</span>
          </button>

          {/* Module 7: Legal Work Logs */}
          <button
            onClick={() => setActiveSubModule("work-logs")}
            className="group flex flex-col items-center justify-center p-6 bg-white border border-[#E8E4DF] rounded-2xl hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:border-blue-200 transition-all duration-300"
          >
            <div className="w-16 h-16 bg-gradient-to-br from-blue-50 to-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-sm">
              <Briefcase size={28} strokeWidth={2} />
            </div>
            <span className="font-bold text-sm text-slate-800">Legal Work</span>
            <span className="text-[10px] text-slate-500 mt-1 uppercase tracking-wider font-semibold">Work Log History</span>
          </button>

          {/* Module 8: Notice Board */}
          <button
            onClick={() => setActiveSubModule("notices")}
            className="group flex flex-col items-center justify-center p-6 bg-white border border-[#E8E4DF] rounded-2xl hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:border-purple-200 transition-all duration-300"
          >
            <div className="w-16 h-16 bg-gradient-to-br from-purple-50 to-purple-100 text-purple-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-sm">
              <FileText size={28} strokeWidth={2} />
            </div>
            <span className="font-bold text-sm text-slate-800">Notice Board</span>
            <span className="text-[10px] text-slate-500 mt-1 uppercase tracking-wider font-semibold">Track & Manage Notices</span>
          </button>

        </div>
      </div>
    );
  }

  // INNER MODULE VIEW
  return (
    <>
      <div className="space-y-6 animate-fade-in text-[#1C1C1A] ">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#E8E4DF] pb-5">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setActiveSubModule("launcher")}
              className="p-2 bg-slate-100 text-slate-600 rounded-full hover:bg-slate-200 transition-colors"
              title="Back to Apps"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <span className="text-[9px] uppercase tracking-widest text-indigo-600 font-bold flex items-center gap-1">
                <LayoutGrid className="w-3 h-3 text-[#C9A84C]" /> Legal Recovery / {activeSubModule.replace('-', ' ')}
              </span>
              <h2 className="text-xl font-light tracking-wide font-serif capitalize" style={{ fontFamily: "'Playfair Display', serif" }}>
                {activeSubModule.replace('-', ' ')}
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                fetchBanks();
                fetchBranches();
                if (activeSubModule !== "banks" && activeSubModule !== "branches") fetchCases();
              }}
              className="px-3 py-1.5 bg-[#FCFBF9] border border-[#E8E4DF] hover:bg-[#F5F0EA] text-[#5D5B57] hover:text-[#1C1C1A] rounded-lg text-[10px] font-semibold tracking-wider uppercase transition-all flex items-center gap-1.5"
            >
              <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} /> Refresh
            </button>

            {activeSubModule === "banks" && (
              <button
                onClick={() => setShowAddBankForm(!showAddBankForm)}
                className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-[10px] font-semibold tracking-wider uppercase transition-all flex items-center gap-1.5 shadow-sm"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                {showAddBankForm ? "Close Form" : "Add Bank Master"}
              </button>
            )}

            {activeSubModule === "branches" && (
              <button
                onClick={() => {
                  if (showAddBranchForm) {
                    setShowAddBranchForm(false);
                    setEditBranchId(null);
                    setBranchForm({ bankId: "", branchName: "", branchCode: "", branchEmail: "", branchManager: "", branchManagerContact: "", aoName: "", foName: "", foContact: "", rbo: "" });
                  } else {
                    setShowAddBranchForm(true);
                  }
                }}
                className="px-3 py-1.5 bg-pink-600 hover:bg-pink-700 text-white rounded-lg text-[10px] font-semibold tracking-wider uppercase transition-all flex items-center gap-1.5 shadow-sm"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                {showAddBranchForm ? "Close Form" : "Add Branch Master"}
              </button>
            )}

            {activeSubModule === "masters" && (
              <button
                onClick={() => setShowAddCaseForm(!showAddCaseForm)}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-semibold tracking-wider uppercase transition-all flex items-center gap-1.5 shadow-sm"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                {showAddCaseForm ? "Close Form" : "Add New Case"}
              </button>
            )}
          </div>
        </div>

        {/* Add New Bank Form */}
        {showAddBankForm && activeSubModule === "banks" && (
          <div className="bg-white border border-[#E8E4DF] rounded-xl p-5 shadow-sm animate-slide-down">
            <div className="flex justify-between items-center border-b border-[#E8E4DF] pb-3 mb-4">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                <Landmark className="w-4 h-4 text-sky-600" /> Register New Bank
              </h3>
              <button onClick={() => setShowAddBankForm(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleAddBankSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Bank Name *</label>
                  <input required type="text" placeholder="e.g. State Bank of India" value={bankForm.bankName}
                    onChange={e => {
                      const val = e.target.value;
                      const words = val.split(/\s+/).filter(w => !['of', 'and', 'the', 'in'].includes(w.toLowerCase()));
                      let autoCode = "";
                      if (words.length === 1) {
                        autoCode = words[0].substring(0, 3).toUpperCase();
                      } else if (words.length > 1) {
                        autoCode = words.map(w => w[0]).join('').substring(0, 4).toUpperCase();
                      }
                      setBankForm({ ...bankForm, bankName: val, bankCode: autoCode });
                    }}
                    className="w-full bg-white border border-[#E8E4DF] focus:border-sky-500 rounded-lg px-3 py-2 text-xs focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Bank Code (Auto / Editable) *</label>
                  <input required type="text" placeholder="e.g. SBI" value={bankForm.bankCode}
                    onChange={e => setBankForm({ ...bankForm, bankCode: e.target.value.toUpperCase() })}
                    className="w-full bg-white border border-[#E8E4DF] focus:border-sky-500 rounded-lg px-3 py-2 text-xs focus:outline-none font-mono font-bold"
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <button disabled={submittingBank} type="submit" className="px-4 py-2 bg-sky-600 text-white rounded-lg text-xs font-semibold uppercase tracking-wider hover:bg-sky-700 disabled:opacity-50">
                  {submittingBank ? "Saving..." : "Save Bank Master"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Add / Edit Branch Form */}
        {showAddBranchForm && activeSubModule === "branches" && (
          <div className="bg-white border border-[#E8E4DF] rounded-xl p-5 shadow-sm animate-slide-down">
            <div className="flex justify-between items-center border-b border-[#E8E4DF] pb-3 mb-4">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                <Network className="w-4 h-4 text-pink-600" /> {editBranchId ? "✏️ Edit Branch Details" : "Register New Branch"}
              </h3>
              <button onClick={() => { setShowAddBranchForm(false); setEditBranchId(null); setBranchForm({ bankId: "", branchName: "", branchCode: "", branchEmail: "", branchManager: "", branchManagerContact: "", aoName: "", foName: "", foContact: "", rbo: "" }); }} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleAddBranchSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Select Bank *</label>
                  <select
                    required
                    value={branchForm.bankId}
                    onChange={e => setBranchForm({ ...branchForm, bankId: e.target.value })}
                    className="w-full bg-white border border-[#E8E4DF] focus:border-pink-500 rounded-lg px-3 py-2 text-xs focus:outline-none"
                  >
                    <option value="">-- Choose a Bank --</option>
                    {banksList.map(b => (
                      <option key={b.id} value={b.id}>{b.bankName} ({b.bankCode})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Branch Name / Area *</label>
                  <input required type="text" placeholder="e.g. Connaught Place" value={branchForm.branchName}
                    onChange={e => setBranchForm({ ...branchForm, branchName: e.target.value })}
                    className="w-full bg-white border border-[#E8E4DF] focus:border-pink-500 rounded-lg px-3 py-2 text-xs focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Branch Code (Manual / Numeric) *</label>
                  <input required type="number" placeholder="e.g. 10025" value={branchForm.branchCode}
                    onChange={e => setBranchForm({ ...branchForm, branchCode: e.target.value })}
                    className="w-full bg-white border border-[#E8E4DF] focus:border-pink-500 rounded-lg px-3 py-2 text-xs focus:outline-none font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Branch Email</label>
                  <input type="email" placeholder="Email" value={branchForm.branchEmail} onChange={e => setBranchForm({ ...branchForm, branchEmail: e.target.value })} className="w-full bg-white border border-[#E8E4DF] focus:border-pink-500 rounded-lg px-3 py-2 text-xs focus:outline-none" />
                </div>
                <div>
                  <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Branch Manager</label>
                  <input type="text" placeholder="Manager Name" value={branchForm.branchManager} onChange={e => setBranchForm({ ...branchForm, branchManager: e.target.value })} className="w-full bg-white border border-[#E8E4DF] focus:border-pink-500 rounded-lg px-3 py-2 text-xs focus:outline-none" />
                </div>
                <div>
                  <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Manager Contact</label>
                  <input type="text" placeholder="Mobile Number" value={branchForm.branchManagerContact} onChange={e => setBranchForm({ ...branchForm, branchManagerContact: e.target.value })} className="w-full bg-white border border-[#E8E4DF] focus:border-pink-500 rounded-lg px-3 py-2 text-xs focus:outline-none" />
                </div>
                <div>
                  <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">AO Name</label>
                  <input type="text" placeholder="Account Officer" value={branchForm.aoName} onChange={e => setBranchForm({ ...branchForm, aoName: e.target.value })} className="w-full bg-white border border-[#E8E4DF] focus:border-pink-500 rounded-lg px-3 py-2 text-xs focus:outline-none" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">FO Name</label>
                  <input type="text" placeholder="Field Officer Name" value={branchForm.foName} onChange={e => setBranchForm({ ...branchForm, foName: e.target.value })} className="w-full bg-white border border-[#E8E4DF] focus:border-pink-500 rounded-lg px-3 py-2 text-xs focus:outline-none" />
                </div>
                <div>
                  <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">FO Contact Number</label>
                  <input type="text" placeholder="Phone Number" value={branchForm.foContact} onChange={e => setBranchForm({ ...branchForm, foContact: e.target.value })} className="w-full bg-white border border-[#E8E4DF] focus:border-pink-500 rounded-lg px-3 py-2 text-xs focus:outline-none" />
                </div>
                <div>
                  <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">RBO</label>
                  <input type="text" placeholder="Regional Business Office" value={branchForm.rbo} onChange={e => setBranchForm({ ...branchForm, rbo: e.target.value })} className="w-full bg-white border border-[#E8E4DF] focus:border-pink-500 rounded-lg px-3 py-2 text-xs focus:outline-none" />
                </div>
              </div>

              <div className="flex justify-end">
                <button disabled={submittingBranch} type="submit" className="px-4 py-2 bg-pink-600 text-white rounded-lg text-xs font-semibold uppercase tracking-wider hover:bg-pink-700 disabled:opacity-50">
                  {submittingBranch ? "Saving..." : (editBranchId ? "Update Branch" : "Save Branch")}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Add New Case Form */}
        {showAddCaseForm && activeSubModule === "masters" && (
          <div className="bg-white border border-[#E8E4DF] rounded-xl p-5 shadow-sm animate-slide-down">
            <div className="flex justify-between items-center border-b border-[#E8E4DF] pb-3 mb-4">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                <Building className="w-4 h-4 text-emerald-600" /> {editCaseId ? "Edit Recovery Case" : "Register New Recovery Case"}
              </h3>
              <button onClick={() => { setShowAddCaseForm(false); setEditCaseId(null); }} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleAddCaseSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Bank Name *</label>
                  <select
                    required
                    value={selectedBankIdForCase}
                    onChange={e => {
                      const bId = e.target.value;
                      setSelectedBankIdForCase(bId);
                      const bName = banksList.find(b => b.id.toString() === bId)?.bankName || "";
                      setCaseForm({ ...caseForm, bankName: bName, branchName: "", branchId: "" }); // reset branch on bank change
                    }}
                    className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs focus:outline-none"
                  >
                    <option value="">-- Select Registered Bank --</option>
                    {banksList.map(b => (
                      <option key={b.id} value={b.id}>{b.bankName} ({b.bankCode})</option>
                    ))}
                  </select>
                  {banksList.length === 0 && (
                    <p className="text-[10px] text-rose-500 mt-1">Please add a Bank in 'Bank Master' first.</p>
                  )}
                </div>
                <div>
                  <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Branch Name</label>
                  <select
                    value={caseForm.branchId}
                    onChange={e => {
                      const brId = e.target.value;
                      const branch = branchesList.find(br => br.branchCode === brId);
                      setCaseForm({
                        ...caseForm,
                        branchId: brId,
                        branchName: branch?.branchName || "",
                        aoName: branch?.aoName || "",
                        deptManagerName: branch?.branchManager || "",
                        contactNumber: branch?.branchManagerContact || branch?.foContact || ""
                      });
                    }}
                    className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs focus:outline-none"
                    disabled={!selectedBankIdForCase}
                  >
                    <option value="">-- Select Branch --</option>
                    {branchesList.filter(br => br.bankId.toString() === selectedBankIdForCase).map(br => (
                      <option key={br.id} value={br.branchCode}>{br.branchName} ({br.branchCode})</option>
                    ))}
                  </select>
                  {selectedBankIdForCase && branchesList.filter(br => br.bankId.toString() === selectedBankIdForCase).length === 0 && (
                    <p className="text-[10px] text-amber-500 mt-1">No branches found. Add them in 'Branch Master'.</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">AO Name</label>
                  <input type="text" readOnly placeholder="Auto-filled from Branch" value={caseForm.aoName} className="w-full bg-slate-50 border border-[#E8E4DF] rounded-lg px-3 py-2 text-xs focus:outline-none text-slate-500 cursor-not-allowed" />
                </div>
                <div>
                  <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Dept Manager Name</label>
                  <input type="text" readOnly placeholder="Auto-filled from Branch" value={caseForm.deptManagerName} className="w-full bg-slate-50 border border-[#E8E4DF] rounded-lg px-3 py-2 text-xs focus:outline-none text-slate-500 cursor-not-allowed" />
                </div>
                <div>
                  <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Contact Number</label>
                  <input type="text" readOnly placeholder="Auto-filled from Branch" value={caseForm.contactNumber} className="w-full bg-slate-50 border border-[#E8E4DF] rounded-lg px-3 py-2 text-xs focus:outline-none text-slate-500 cursor-not-allowed" />
                </div>
                <div>
                  <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Pending Amount (₹) *</label>
                  <input required type="number" step="0.01" value={caseForm.pendingAmount} onChange={e => setCaseForm({ ...caseForm, pendingAmount: e.target.value })} className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs focus:outline-none font-semibold" />
                </div>
              </div>
              <div>
                <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Pending Since (Date)</label>
                <input type="date" value={caseForm.pendingSince} onChange={e => setCaseForm({ ...caseForm, pendingSince: e.target.value })} className="w-full max-w-xs bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs focus:outline-none" />
              </div>
              <div className="flex justify-end pt-3">
                <button disabled={submittingCase} type="submit" className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-semibold uppercase tracking-wider hover:bg-emerald-700 disabled:opacity-50">
                  {submittingCase ? "Saving..." : (editCaseId ? "Update Case" : "Save Case")}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Render Subcomponents based on activeSubModule */}
        {activeSubModule === "banks" && (
          <BankMasterView banksList={banksList} branchesList={branchesList} loading={loading} />
        )}

        {activeSubModule === "branches" && (
          <BranchMasterView
            branchesList={branchesList}
            banksList={banksList}
            loading={loading}
            setShowMarketingForm={setShowMarketingForm}
            onEditBranch={(br: any) => {
              const parentBank = banksList.find((b: any) => b.id === br.bankId);
              setBranchForm({
                bankId: br.bankId?.toString() || "",
                branchName: br.branchName || "",
                branchCode: br.branchCode || "",
                branchEmail: br.branchEmail || "",
                branchManager: br.branchManager || "",
                branchManagerContact: br.branchManagerContact || "",
                aoName: br.aoName || "",
                foName: br.foName || "",
                foContact: br.foContact || "",
                rbo: br.rbo || ""
              });
              setEditBranchId(br.id);
              setShowAddBranchForm(true);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          />
        )}

        {activeSubModule !== "banks" && activeSubModule !== "branches" && activeSubModule !== "history" && activeSubModule !== "collections" && activeSubModule !== "work-logs" && activeSubModule !== "notices" && (
          <CasesMasterView cases={cases} loading={loading} setShowFollowUpForm={setShowFollowUpForm} setShowPaymentForm={setShowPaymentForm} openHistory={openHistory} userRole={userRole} onEditCase={handleEditCase} onDeleteCase={handleDeleteCase} />
        )}

        {activeSubModule === "history" && (
          <DailyCallReportsView
            globalHistory={globalHistory}
            cases={cases}
            loadingGlobalHistory={loadingGlobalHistory}
            branchesList={branchesList}
            banksList={banksList}
          />
        )}

        {activeSubModule === "collections" && (
          <PaymentCollectionsView payments={payments} cases={cases} loadingPayments={loadingPayments} />
        )}

        {activeSubModule === "work-logs" && (
          <LegalWorkLogsView workLogs={globalWorkLogs} branches={branchesList} banks={banksList} loading={loadingGlobalWorkLogs} onRefresh={fetchGlobalWorkLogs} />
        )}

        {activeSubModule === "notices" && (
          <NoticeBoardView
            banksList={banksList}
            branchesList={branchesList}
            triggerToast={triggerToast}
          />
        )}
      </div>


      {/* Follow Up Modal */}
      {showFollowUpForm.show && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-sm flex justify-center items-start p-4 sm:p-8">
          <div className="bg-white rounded-xl w-full max-w-xl overflow-hidden shadow-2xl animate-scale-in flex flex-col relative mt-4 sm:mt-10 mb-10 max-h-[90vh]">
            <div className="flex justify-between items-center p-4 border-b border-[#E8E4DF] bg-[#FCFBF9] shrink-0">
              <h3 className="font-serif text-lg text-slate-800 flex items-center gap-2">
                <PhoneCall className="w-5 h-5 text-indigo-600" /> Log Follow Up Call
              </h3>
              <button onClick={() => setShowFollowUpForm({ show: false, master: null })} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1">
              {/* Display Master Info */}
              <div className="p-4 bg-indigo-50/50 border-b border-[#E8E4DF] text-xs">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="font-bold text-slate-800">{showFollowUpForm.master?.bankName} - {showFollowUpForm.master?.branchName}</div>
                    <div className="text-slate-500 mt-1">Branch Code: {showFollowUpForm.master?.branchId}</div>
                    {(() => {
                      const br = branchesList.find(b => b.branchCode === showFollowUpForm.master?.branchId);
                      return (
                        <div className="mt-2 space-y-1">
                          <div className="text-slate-600">Manager: <span className="font-semibold">{br?.branchManager || 'N/A'}</span> ({br?.branchManagerContact || 'N/A'})</div>
                          <div className="text-slate-600">AO: <span className="font-semibold">{br?.aoName || 'N/A'}</span></div>
                          <div className="text-slate-600">RBO: <span className="font-semibold">{br?.rbo || 'N/A'}</span></div>
                        </div>
                      );
                    })()}
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-rose-600">Due: ₹{showFollowUpForm.master?.pendingAmount || '0.00'}</div>
                  </div>
                </div>
              </div>

              <form onSubmit={handleFollowUpSubmit} className="p-5 space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Call Date *</label>
                    <input
                      type="date"
                      required
                      value={followUpForm.callDate}
                      onChange={e => setFollowUpForm({ ...followUpForm, callDate: e.target.value })}
                      className="w-full bg-white border border-[#E8E4DF] focus:border-indigo-500 rounded-lg px-3 py-2 text-xs focus:outline-none font-semibold text-indigo-700"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Call Status *</label>
                    <select
                      value={followUpForm.callStatus}
                      onChange={e => setFollowUpForm({ ...followUpForm, callStatus: e.target.value })}
                      className="w-full bg-white border border-[#E8E4DF] focus:border-indigo-500 rounded-lg px-3 py-2 text-xs focus:outline-none"
                    >
                      <option value="Connected">Connected</option>
                      <option value="Not Answered">Not Answered</option>
                      <option value="Switched Off">Switched Off</option>
                      <option value="Busy">Busy</option>
                      <option value="Invalid Number">Invalid Number</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Next Follow Up Date</label>
                    <input
                      type="date"
                      value={followUpForm.nextFollowUpDate}
                      onChange={e => setFollowUpForm({ ...followUpForm, nextFollowUpDate: e.target.value })}
                      className="w-full bg-white border border-[#E8E4DF] focus:border-indigo-500 rounded-lg px-3 py-2 text-xs focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Conversation Details / Kya Baat Hui *</label>
                  <textarea
                    required
                    rows={4}
                    value={followUpForm.conversationDetails}
                    onChange={e => setFollowUpForm({ ...followUpForm, conversationDetails: e.target.value })}
                    className="w-full bg-white border border-[#E8E4DF] focus:border-indigo-500 rounded-lg px-3 py-2 text-xs focus:outline-none resize-none"
                    placeholder="Summarize the conversation here..."
                  ></textarea>
                </div>

                <div>
                  <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Upload Document / Recording</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="file"
                      accept="*/*"
                      onChange={e => setAudioFile(e.target.files ? e.target.files[0] : null)}
                      className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer border border-[#E8E4DF] rounded-lg"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-[#E8E4DF] flex justify-end gap-2">
                  <button type="button" onClick={() => setShowFollowUpForm({ show: false, master: null })} className="px-4 py-2 border border-[#E8E4DF] rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50">
                    Cancel
                  </button>
                  <button disabled={submittingFollowUp} type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold uppercase tracking-wider hover:bg-indigo-700 disabled:opacity-50">
                    {submittingFollowUp ? "Saving & Creating Task..." : "Save Follow Up"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Work Log Form Modal */}
      {showWorkLogForm.show && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[#FCFBF9] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-slide-up">
            <div className="px-6 py-4 border-b border-[#E8E4DF] flex justify-between items-center bg-white">
              <h2 className="text-sm font-black text-[#1C1C1A] uppercase tracking-wider flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-[#C9A84C]" /> Log Legal Work
              </h2>
              <button onClick={() => setShowWorkLogForm({ show: false, master: null })} className="text-slate-400 hover:text-rose-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1">
              <div className="p-4 bg-amber-50/50 border-b border-[#E8E4DF] text-xs">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-slate-500 font-bold mb-1">Bank Name</div>
                    <div className="font-semibold text-slate-800">{showWorkLogForm.master?.bankName || 'N/A'}</div>
                  </div>
                  <div>
                    <div className="text-slate-500 font-bold mb-1">Branch</div>
                    <div className="font-semibold text-slate-800">{showWorkLogForm.master?.branchName || 'N/A'}</div>
                  </div>
                </div>
              </div>

              <div className="p-6">
                <form onSubmit={handleWorkLogSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Work Date *</label>
                      <input
                        type="date"
                        required
                        value={workLogForm.workDate}
                        onChange={e => setWorkLogForm({ ...workLogForm, workDate: e.target.value })}
                        className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs focus:outline-none font-semibold text-slate-700"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Work Category *</label>
                      <select
                        value={workLogForm.category}
                        onChange={e => {
                          const cat = e.target.value;
                          setWorkLogForm({
                            ...workLogForm,
                            category: cat,
                            subCategory: WORK_CATEGORIES[cat][0]
                          });
                        }}
                        className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs focus:outline-none"
                      >
                        {Object.keys(WORK_CATEGORIES).map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Work Step / Action *</label>
                      <select
                        value={workLogForm.subCategory}
                        onChange={e => setWorkLogForm({ ...workLogForm, subCategory: e.target.value })}
                        className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs focus:outline-none"
                      >
                        {WORK_CATEGORIES[workLogForm.category]?.map(sub => (
                          <option key={sub} value={sub}>{sub}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Remarks / Details</label>
                    <textarea
                      rows={3}
                      value={workLogForm.remarks}
                      onChange={e => setWorkLogForm({ ...workLogForm, remarks: e.target.value })}
                      className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs focus:outline-none resize-none"
                      placeholder="Any specific details regarding this work step..."
                    ></textarea>
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t border-[#E8E4DF]">
                    <button
                      type="button"
                      onClick={() => setShowWorkLogForm({ show: false, master: null })}
                      className="px-4 py-2 bg-white border border-[#E8E4DF] text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submittingWorkLog}
                      className="px-4 py-2 bg-[#1C1C1A] text-white rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-[#323230] disabled:opacity-50 transition-colors flex items-center gap-2"
                    >
                      {submittingWorkLog ? "Saving..." : "Save Work Log"} <CheckCircle className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Business Development Form Modal */}
      {showMarketingForm.show && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[#FCFBF9] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-slide-up">
            <div className="px-6 py-4 border-b border-[#E8E4DF] flex justify-between items-center bg-white">
              <h2 className="text-sm font-black text-indigo-900 uppercase tracking-wider flex items-center gap-2">
                <PhoneCall className="w-5 h-5 text-indigo-500" /> Business Development
              </h2>
              <button onClick={() => setShowMarketingForm({ show: false, branch: null })} className="text-slate-400 hover:text-rose-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <div className="mb-4 bg-indigo-50 p-3 rounded-lg border border-indigo-100 flex justify-between items-center">
                <div>
                  <h4 className="text-xs font-bold text-indigo-900">{showMarketingForm.branch?.branchName}</h4>
                  <p className="text-[10px] text-indigo-700 font-mono mt-0.5">Code: {showMarketingForm.branch?.branchCode}</p>
                </div>
              </div>
              <form onSubmit={handleMarketingSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Call Type *</label>
                    <select
                      value={marketingForm.callType}
                      onChange={e => setMarketingForm({ ...marketingForm, callType: e.target.value })}
                      className="w-full bg-white border border-[#E8E4DF] focus:border-indigo-500 rounded-lg px-3 py-2 text-xs focus:outline-none font-semibold text-slate-700"
                    >
                      <option>Business Development</option>
                      <option>General </option>
                      <option value="Others">Others</option>
                    </select>
                  </div>
                  {marketingForm.callType === "Others" && (
                    <div className="col-span-2">
                      <label className="block text-[9px] uppercase tracking-wider text-rose-600 font-bold mb-1">Mention Custom Call Type *</label>
                      <input
                        type="text"
                        required
                        placeholder="E.g., Client Visit, Escalation, etc."
                        value={customCallType}
                        onChange={e => setCustomCallType(e.target.value)}
                        className="w-full bg-white border border-[#E8E4DF] focus:border-indigo-500 rounded-lg px-3 py-2 text-xs focus:outline-none font-semibold text-slate-700"
                      />
                    </div>
                  )}
                  <div>
                    <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Call Date *</label>
                    <input
                      type="date"
                      required
                      value={marketingForm.callDate}
                      onChange={e => setMarketingForm({ ...marketingForm, callDate: e.target.value })}
                      className="w-full bg-white border border-[#E8E4DF] focus:border-indigo-500 rounded-lg px-3 py-2 text-xs focus:outline-none"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Call Status *</label>
                    <select
                      value={marketingForm.callStatus}
                      onChange={e => setMarketingForm({ ...marketingForm, callStatus: e.target.value })}
                      className="w-full bg-white border border-[#E8E4DF] focus:border-indigo-500 rounded-lg px-3 py-2 text-xs focus:outline-none font-semibold text-slate-700"
                    >
                      <option>Connected</option>
                      <option>Not Answered</option>
                      <option>Switched Off</option>
                      <option>Busy</option>
                      <option>Invalid Number</option>
                      <option value="Others">Others</option>
                    </select>
                  </div>
                  {marketingForm.callStatus === "Others" && (
                    <div className="col-span-2">
                      <label className="block text-[9px] uppercase tracking-wider text-rose-600 font-bold mb-1">Mention Custom Call Status *</label>
                      <input
                        type="text"
                        required
                        placeholder="E.g., Call Back Later, Line Busy, etc."
                        value={customCallStatus}
                        onChange={e => setCustomCallStatus(e.target.value)}
                        className="w-full bg-white border border-[#E8E4DF] focus:border-indigo-500 rounded-lg px-3 py-2 text-xs focus:outline-none font-semibold text-slate-700"
                      />
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Conversation Details *</label>
                  <textarea
                    rows={4}
                    required
                    value={marketingForm.conversationDetails}
                    onChange={e => setMarketingForm({ ...marketingForm, conversationDetails: e.target.value })}
                    className="w-full bg-white border border-[#E8E4DF] focus:border-indigo-500 rounded-lg px-3 py-2 text-xs focus:outline-none resize-none"
                    placeholder="Enter discussion details about our company services..."
                  ></textarea>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Next Follow Up Date (Optional)</label>
                    <input
                      type="date"
                      value={marketingForm.nextFollowUpDate}
                      onChange={e => setMarketingForm({ ...marketingForm, nextFollowUpDate: e.target.value })}
                      className="w-full bg-white border border-[#E8E4DF] focus:border-indigo-500 rounded-lg px-3 py-2 text-xs focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Upload Document (Optional)</label>
                    <input
                      type="file"
                      accept="*/*"
                      onChange={e => setAudioFile(e.target.files ? e.target.files[0] : null)}
                      className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer border border-[#E8E4DF] rounded-lg"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4 border-t border-[#E8E4DF]">
                  <button
                    type="button"
                    onClick={() => {
                      setShowMarketingForm({ show: false, branch: null });
                      setAudioFile(null);
                    }}
                    className="flex-1 px-4 py-3 bg-white border border-[#E8E4DF] text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingMarketing}
                    className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-xl text-xs font-black shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-colors disabled:opacity-50"
                  >
                    {submittingMarketing ? "Saving & Creating Task..." : "Save Call Log "}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* History Modal */}
      {showHistoryModal.show && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-sm flex justify-center items-start p-4 sm:p-8">
          <div className="bg-white rounded-xl w-full max-w-2xl overflow-hidden shadow-2xl animate-scale-in flex flex-col relative mt-4 sm:mt-10 mb-10 max-h-[85vh]">
            <div className="flex justify-between items-center p-4 border-b border-[#E8E4DF] bg-[#FCFBF9]">
              <h3 className="font-serif text-lg text-slate-800 flex items-center gap-2">
                <History className="w-5 h-5 text-indigo-600" /> Call History Logs
              </h3>
              <button onClick={() => setShowHistoryModal({ show: false, masterId: null })} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto bg-slate-50 flex-1 space-y-8">
              {loadingHistory ? (
                <div className="text-center py-8 text-slate-500 text-xs">Loading history...</div>
              ) : (
                <>
                  {/* Follow Up Calls Section */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 border-b border-slate-200 pb-2 flex items-center gap-2">
                      <PhoneCall className="w-3.5 h-3.5 text-indigo-500" /> Follow Up Calls
                    </h4>
                    {historyData.length === 0 ? (
                      <div className="text-center py-4 text-slate-400 text-[10px] font-semibold bg-white rounded-lg border border-slate-200 border-dashed">No follow ups recorded.</div>
                    ) : (
                      <div className="space-y-3">
                        {historyData.map(log => (
                          <div key={log.id} className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm relative">
                            <div className="absolute top-4 right-4 text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded">
                              {log.callDate ? new Date(log.callDate).toLocaleDateString() : new Date(log.createdAt).toLocaleDateString()}
                            </div>
                            <div className="flex items-center gap-2 mb-2">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${log.callStatus === 'Connected' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                {log.callStatus}
                              </span>
                              <span className="text-xs font-semibold text-slate-700">Called by: {log.callerName || 'Unknown'}</span>
                            </div>
                            <p className="text-xs text-slate-600 mt-2 whitespace-pre-wrap">{log.conversationDetails}</p>

                            <div className="mt-3 flex items-center gap-4 border-t border-slate-100 pt-3">
                              {log.callRecordingUrl && (
                                <a href={log.callRecordingUrl} target="_blank" rel="noreferrer" className="text-[10px] flex items-center gap-1 font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-2 py-1 rounded">
                                  <FileAudio className="w-3 h-3" /> View Attachment
                                </a>
                              )}
                              {log.nextFollowUpDate && (
                                <span className="text-[10px] flex items-center gap-1 text-amber-600 font-bold bg-amber-50 px-2 py-1 rounded">
                                  <Calendar className="w-3 h-3" /> Next Call: {new Date(log.nextFollowUpDate).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Work Logs Section */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 border-b border-slate-200 pb-2 flex items-center gap-2">
                      <Briefcase className="w-3.5 h-3.5 text-blue-500" /> Work Logs
                    </h4>
                    {workLogHistoryData.length === 0 ? (
                      <div className="text-center py-4 text-slate-400 text-[10px] font-semibold bg-white rounded-lg border border-slate-200 border-dashed">No work logged yet.</div>
                    ) : (
                      <div className="space-y-3">
                        {workLogHistoryData.map(log => (
                          <div key={log.id} className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm relative border-l-4 border-l-blue-400">
                            <div className="absolute top-4 right-4 text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded">
                              {log.workDate ? new Date(log.workDate).toLocaleDateString() : new Date(log.createdAt).toLocaleDateString()}
                            </div>
                            <div className="mb-2">
                              <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-[10px] font-black uppercase tracking-wider border border-blue-100">
                                {log.category}
                              </span>
                            </div>
                            <div className="text-xs font-bold text-slate-800 mb-1">{log.subCategory}</div>
                            {log.remarks && <p className="text-xs text-slate-600 mt-1 whitespace-pre-wrap">{log.remarks}</p>}

                            <div className="mt-3 flex items-center gap-4 border-t border-slate-100 pt-3">
                              <span className="text-[10px] font-bold text-slate-500">Logged by: <span className="text-slate-700">{log.employeeName || 'Unknown'}</span></span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Payment Form Modal */}
      {showPaymentForm.show && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-sm flex justify-center items-start p-4 sm:p-8">
          <div className="bg-white rounded-xl w-full max-w-xl overflow-hidden shadow-2xl animate-scale-in flex flex-col relative mt-4 sm:mt-10 mb-10 max-h-[90vh]">
            <div className="flex justify-between items-center p-4 border-b border-[#E8E4DF] bg-[#FCFBF9] shrink-0">
              <h3 className="font-serif text-lg text-slate-800 flex items-center gap-2">
                <Banknote className="w-5 h-5 text-emerald-600" /> Log Payment Received
              </h3>
              <button onClick={() => setShowPaymentForm({ show: false, master: null })} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1">
              <div className="p-4 bg-emerald-50/50 border-b border-[#E8E4DF] text-xs">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="font-bold text-slate-800">{showPaymentForm.master?.bankName} - {showPaymentForm.master?.branchName}</div>
                    <div className="text-slate-500 mt-1">Branch Code: {showPaymentForm.master?.branchId}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-rose-600">Total Due: ₹{showPaymentForm.master?.pendingAmount || '0.00'}</div>
                  </div>
                </div>
              </div>

              <form onSubmit={handlePaymentSubmit} className="p-5 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Amount Received (₹) *</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={paymentForm.amount}
                      onChange={e => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                      className="w-full bg-white border border-[#E8E4DF] focus:border-emerald-500 rounded-lg px-3 py-2 text-xs focus:outline-none font-semibold text-emerald-700"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Payment Date *</label>
                    <input
                      type="date"
                      required
                      value={paymentForm.paymentDate}
                      onChange={e => setPaymentForm({ ...paymentForm, paymentDate: e.target.value })}
                      className="w-full bg-white border border-[#E8E4DF] focus:border-emerald-500 rounded-lg px-3 py-2 text-xs focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Payment Mode *</label>
                    <select
                      value={paymentForm.paymentMode}
                      onChange={e => setPaymentForm({ ...paymentForm, paymentMode: e.target.value })}
                      className="w-full bg-white border border-[#E8E4DF] focus:border-emerald-500 rounded-lg px-3 py-2 text-xs focus:outline-none mb-1"
                    >
                      <option value="NEFT/RTGS">NEFT / RTGS</option>
                      <option value="IMPS">IMPS</option>
                      <option value="UPI">UPI</option>
                      <option value="Cheque">Cheque</option>
                      <option value="Cash">Cash</option>
                      <option value="Others">Others</option>
                    </select>
                    {paymentForm.paymentMode === "Others" && (
                      <input
                        type="text"
                        required
                        value={paymentForm.otherPaymentMode}
                        onChange={e => setPaymentForm({ ...paymentForm, otherPaymentMode: e.target.value })}
                        className="w-full bg-white border border-[#E8E4DF] focus:border-emerald-500 rounded-lg px-3 py-2 text-xs focus:outline-none mt-2"
                        placeholder="Specify Payment Mode"
                      />
                    )}
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Transaction ID / Ref No.</label>
                    <input
                      type="text"
                      value={paymentForm.transactionId}
                      onChange={e => setPaymentForm({ ...paymentForm, transactionId: e.target.value })}
                      className="w-full bg-white border border-[#E8E4DF] focus:border-emerald-500 rounded-lg px-3 py-2 text-xs focus:outline-none uppercase"
                      placeholder="e.g. UTR NO."
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Upload Proof (Receipt / Screenshot)</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={e => setProofFile(e.target.files ? e.target.files[0] : null)}
                      className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer border border-[#E8E4DF] rounded-lg"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Remarks (Optional)</label>
                  <textarea
                    rows={2}
                    value={paymentForm.remarks}
                    onChange={e => setPaymentForm({ ...paymentForm, remarks: e.target.value })}
                    className="w-full bg-white border border-[#E8E4DF] focus:border-emerald-500 rounded-lg px-3 py-2 text-xs focus:outline-none resize-none"
                    placeholder="Any additional notes about this payment..."
                  ></textarea>
                </div>

                <div className="pt-4 border-t border-[#E8E4DF] flex justify-end gap-2">
                  <button type="button" onClick={() => setShowPaymentForm({ show: false, master: null })} className="px-4 py-2 border border-[#E8E4DF] rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50">
                    Cancel
                  </button>
                  <button disabled={submittingPayment} type="submit" className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-semibold uppercase tracking-wider hover:bg-emerald-700 disabled:opacity-50">
                    {submittingPayment ? "Saving..." : "Save Payment"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
