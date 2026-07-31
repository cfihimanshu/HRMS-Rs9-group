import React, { useEffect, useState } from "react";
import { Briefcase, Search, ChevronDown, ChevronRight, LayoutList, Calendar, MapPin, Layers, FileText, Send, CheckCircle2 } from "lucide-react";

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
  ],
  "New RC file case": [
    "FILE PREPARATION", "COLLECT DOCUMENTS FROM BANK", "DRAFT CASE", "SUBMIT FILE TO COURT", "PREPARE BILL (BILL BANWANA)", "REQUEST PAYMENT"
  ],
  "New PSSA": [
    "APPLICATION PREPARATION", "COLLECT DOCUMENTS", "DRAFT PSSA APPLICATION", "SUBMIT APPLICATION", "PREPARE BILL (BILL BANWANA)", "REQUEST PAYMENT"
  ],
  "138 case": [
    "NOTICE ISSUED", "CHEQUE BOUNCE COMPLAINT DRAFTING", "FILE COMPLAINT IN COURT", "OBTAIN SUMMONS", "PREPARE BILL (BILL BANWANA)", "REQUEST PAYMENT"
  ]
};

export default function LegalWorkLogsView({ workLogs, branches, banks, loading, onRefresh }: { workLogs: any[], branches: any[], banks: any[], loading: boolean, onRefresh?: () => void }) {
  const [viewMode, setViewMode] = useState<"form" | "checklist">("form");
  
  // Form State
  const [workDate, setWorkDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [workLocation, setWorkLocation] = useState<string>("Office");
  const [customLocation, setCustomLocation] = useState<string>("");
  const [typeOfWork, setTypeOfWork] = useState<string>("General");
  const [bankWorkCategory, setBankWorkCategory] = useState<"Business Development" | "Bill Follow Up">("Business Development");
  const [businessDevOption, setBusinessDevOption] = useState<string>("ADVOCATE NOTICE");
  const [businessDevSubOption, setBusinessDevSubOption] = useState<string>("TAKE NOTICE ASSIGNMENT");
  const [noOfCount, setNoOfCount] = useState<string>("1");
  const [allocationDate, setAllocationDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [finalRate, setFinalRate] = useState<string>("");
  const [bankOfficerPerNotice, setBankOfficerPerNotice] = useState<string>("");
  const [assessmentExpenses, setAssessmentExpenses] = useState<string>("");
  const [broughtBy, setBroughtBy] = useState<string>("");
  const [preparedBy, setPreparedBy] = useState<string>("");
  const [printedBy, setPrintedBy] = useState<string>("");
  const [dispatchedBy, setDispatchedBy] = useState<string>("");
  const [dispatchAmount, setDispatchAmount] = useState<string>("");
  const [billDate, setBillDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [billAmount, setBillAmount] = useState<string>("");
  const [billNo, setBillNo] = useState<string>("");
  const [personName, setPersonName] = useState<string>("");
  const [uploadedFilePreview, setUploadedFilePreview] = useState<string>("");
  const [uploadedFileType, setUploadedFileType] = useState<string>("");
  const [uploadedFileName, setUploadedFileName] = useState<string>("");
  const [showPreviewModal, setShowPreviewModal] = useState<boolean>(false);
  const [selectedBankId, setSelectedBankId] = useState<string>("");
  const [selectedBranchName, setSelectedBranchName] = useState<string>("");
  const [remarks, setRemarks] = useState<string>("");
  const [submittingForm, setSubmittingForm] = useState<boolean>(false);
  const [formSuccessMessage, setFormSuccessMessage] = useState<string>("");
  const [pendingBills, setPendingBills] = useState<any[]>([]);
  const [pendingBillSummary, setPendingBillSummary] = useState({
    totalBills: 0,
    totalBillAmount: 0,
    totalReceivedAmount: 0,
    totalPendingAmount: 0,
  });
  const [loadingPendingBills, setLoadingPendingBills] = useState(false);
  const [callDate, setCallDate] = useState(new Date().toISOString().split("T")[0]);
  const [callTime, setCallTime] = useState("");
  const [contactedPerson, setContactedPerson] = useState("");
  const assessmentCount = Math.max(0, Number.parseInt(noOfCount || "0", 10) || 0);
  const perNoticeRate = Number.parseFloat(finalRate) || 0;
  const officerPerNotice = Number.parseFloat(bankOfficerPerNotice) || 0;
  const ownExpenses = Number.parseFloat(assessmentExpenses) || 0;
  const assessmentTotalRevenue = assessmentCount * perNoticeRate;
  const assessmentOfficerTotal = assessmentCount * officerPerNotice;
  const assessmentGrossProfit =
    assessmentTotalRevenue - assessmentOfficerTotal - ownExpenses;
  const isBillPreparationStep =
    businessDevSubOption === "PREPARE BILL (BILL BANWANA)";
  const isBroughtByStep =
    businessDevSubOption === "TAKE NOTICE ASSIGNMENT" ||
    businessDevSubOption === "COLLECT NOTICE DATA";
  const isPreparedByStep = businessDevSubOption === "PREPARE NOTICE LIST";
  const isPrintedByStep = businessDevSubOption.includes("GENERATE NOTICE");
  const isDispatchedByStep = businessDevSubOption.includes("DISPATCH NOTICE");
  const selectedBranchRecord = branches.find(
    branch =>
      String(branch.bankId) === String(selectedBankId) &&
      branch.branchName === selectedBranchName
  );

  useEffect(() => {
    if (
      bankWorkCategory !== "Bill Follow Up" ||
      !selectedBankId ||
      !selectedBranchRecord?.id
    ) {
      setPendingBills([]);
      setPendingBillSummary({
        totalBills: 0,
        totalBillAmount: 0,
        totalReceivedAmount: 0,
        totalPendingAmount: 0,
      });
      return;
    }

    let cancelled = false;
    const loadPendingBills = async () => {
      setLoadingPendingBills(true);
      try {
        const params = new URLSearchParams({
          bankId: selectedBankId,
          branchId: String(selectedBranchRecord.id),
        });
        const response = await fetch(`/api/legal-recovery/bill-follow-up?${params}`);
        const result = await response.json();
        if (!cancelled && response.ok && result.success) {
          setPendingBills(result.data || []);
          setPendingBillSummary(result.summary);
        } else if (!cancelled) {
          setPendingBills([]);
        }
      } catch (error) {
        if (!cancelled) setPendingBills([]);
        console.error("Failed to load pending bills:", error);
      } finally {
        if (!cancelled) setLoadingPendingBills(false);
      }
    };
    loadPendingBills();
    return () => {
      cancelled = true;
    };
  }, [bankWorkCategory, selectedBankId, selectedBranchRecord?.id]);

  // Active Notice Session Saved Stages State
  const [sessionSavedStages, setSessionSavedStages] = useState<Record<string, any>>({});

  // Reset session saved stages when Bank or Branch changes
  useEffect(() => {
    setSessionSavedStages({});
    setBroughtBy("");
    setPreparedBy("");
    setPrintedBy("");
    setDispatchedBy("");
    setDispatchAmount("");
    setBillNo("");
    setBillAmount("");
    setPersonName("");
    setUploadedFileName("");
    setRemarks("");
  }, [selectedBankId, selectedBranchName]);

  // Handle stage dropdown change: prefill if saved in current session, else clean inputs
  useEffect(() => {
    if (typeOfWork !== "Bank Related" || bankWorkCategory !== "Business Development" || !businessDevSubOption) {
      return;
    }

    const saved = sessionSavedStages[businessDevSubOption];
    if (saved) {
      if (saved.noOfCount) setNoOfCount(String(saved.noOfCount));
      if (saved.broughtBy) setBroughtBy(saved.broughtBy);
      if (saved.preparedBy) setPreparedBy(saved.preparedBy);
      if (saved.printedBy) setPrintedBy(saved.printedBy);
      if (saved.dispatchedBy) setDispatchedBy(saved.dispatchedBy);
      if (saved.dispatchAmount) setDispatchAmount(String(saved.dispatchAmount));
      if (saved.billDate) setBillDate(saved.billDate);
      if (saved.billAmount) setBillAmount(String(saved.billAmount));
      if (saved.billNo) setBillNo(saved.billNo);
      if (saved.personName) setPersonName(saved.personName);
      if (saved.uploadedFileName) setUploadedFileName(saved.uploadedFileName);
      if (saved.remarks) setRemarks(saved.remarks);
      if (saved.finalRate) setFinalRate(String(saved.finalRate));
      if (saved.bankOfficerPerNotice) setBankOfficerPerNotice(String(saved.bankOfficerPerNotice));
      if (saved.assessmentExpenses) setAssessmentExpenses(String(saved.assessmentExpenses));
    } else {
      setBroughtBy("");
      setPreparedBy("");
      setPrintedBy("");
      setDispatchedBy("");
      setDispatchAmount("");
      setBillNo("");
      setBillAmount("");
      setPersonName("");
      setUploadedFileName("");
      setRemarks("");
    }
  }, [businessDevSubOption, sessionSavedStages]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFileName(file.name);
      setUploadedFileType(file.type);
      if (file.type.startsWith("image/") || file.type.startsWith("audio/") || file.name.endsWith(".aac") || file.name.endsWith(".mp3") || file.name.endsWith(".wav") || file.name.endsWith(".m4a")) {
        const previewUrl = URL.createObjectURL(file);
        setUploadedFilePreview(previewUrl);
      } else {
        setUploadedFilePreview("");
      }
    }
  };

  // Checklist State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBranch, setSelectedBranch] = useState<number | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [updatingTask, setUpdatingTask] = useState<string | null>(null);
  const [activeStepForm, setActiveStepForm] = useState<string | null>(null);
  const [stepRemarks, setStepRemarks] = useState<string>("");

  const getBankName = (bankId: number) => {
    return banks?.find((b: any) => b.id == bankId)?.bankName || "Unknown Bank";
  };

  const filteredBranches = branches.filter(b => {
    const bankName = getBankName(b.bankId);
    return (
      (bankName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (b?.branchName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (b?.aoName || "").toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const toggleCategory = (cat: string) => {
    setExpandedCategories(prev => ({ ...prev, [cat]: !prev[cat] }));
  };

  const handleMarkTaskDone = async (branchId: number, category: string, subCategory: string, stepRem: string) => {
    const taskKey = `${branchId}-${category}-${subCategory}`;
    setUpdatingTask(taskKey);
    try {
      const res = await fetch("/api/legal-recovery/work-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          masterId: branchId,
          category,
          subCategory,
          remarks: stepRem || "Marked as completed",
          workDate: new Date().toISOString().split('T')[0]
        })
      });
      if (res.ok) {
        setActiveStepForm(null);
        setStepRemarks("");
        if (onRefresh) onRefresh();
      }
    } catch (error) {
      console.error(error);
      alert("Failed to update work task.");
    } finally {
      setUpdatingTask(null);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent, proceedToNext: boolean = false) => {
    if (e) e.preventDefault();
    if (workLocation === "Other" && !customLocation.trim()) {
      alert("Please specify the custom location.");
      return;
    }
    if ((typeOfWork === "Bank Related" || workLocation === "Bank")) {
      if (!selectedBankId) {
        alert("Please select Bank.");
        return;
      }
      if (!selectedBranchName) {
        alert("Please select Branch.");
        return;
      }
    }
    if (!remarks.trim()) {
      alert("Please enter work details or remarks.");
      return;
    }
    if (
      bankWorkCategory === "Bill Follow Up" &&
      (!callDate || !callTime || !contactedPerson.trim())
    ) {
      alert("Please enter call date, call time and contacted person.");
      return;
    }

    setSubmittingForm(true);
    setFormSuccessMessage("");

    try {
      const bankObj = banks.find((b: any) => String(b.id) === String(selectedBankId));
      const payload = {
        workDate,
        workLocation,
        customLocation: workLocation === "Other" ? customLocation.trim() : "",
        typeOfWork,
        category: typeOfWork === "Bank Related" && bankWorkCategory === "Business Development" ? businessDevOption : (typeOfWork === "Bank Related" ? bankWorkCategory : typeOfWork),
        subCategory: typeOfWork === "Bank Related" && bankWorkCategory === "Business Development" ? businessDevSubOption : (bankWorkCategory === "Bill Follow Up" ? "BILL FOLLOW UP" : workLocation),
        businessDevOption: typeOfWork === "Bank Related" && bankWorkCategory === "Business Development" ? businessDevOption : undefined,
        businessDevSubOption: typeOfWork === "Bank Related" && bankWorkCategory === "Business Development" ? businessDevSubOption : undefined,
        noOfCount: noOfCount || "1",
        allocationDate: allocationDate || workDate,
        finalRate: businessDevSubOption === "TAKE NOTICE ASSIGNMENT" ? finalRate : undefined,
        expenses: businessDevSubOption === "TAKE NOTICE ASSIGNMENT" ? (assessmentExpenses || "0") : undefined,
        financialDetails: businessDevSubOption === "TAKE NOTICE ASSIGNMENT"
          ? JSON.stringify({
              noticeCount: assessmentCount,
              perNoticeRate,
              bankOfficerPerNotice: officerPerNotice,
              ownExpenses,
            })
          : undefined,
        followUpDetails: bankWorkCategory === "Bill Follow Up"
          ? JSON.stringify({
              callDate,
              callTime,
              contactedPerson: contactedPerson.trim(),
              conversation: remarks.trim(),
              attachment: uploadedFileName || null,
              bankId: selectedBankId,
              branchId: selectedBranchRecord?.id || null,
              bills: pendingBills,
              summary: pendingBillSummary,
            })
          : undefined,
        broughtBy: isBroughtByStep ? (broughtBy || undefined) : undefined,
        preparedBy: isPreparedByStep ? (preparedBy || undefined) : undefined,
        printedBy: isPrintedByStep ? (printedBy || undefined) : undefined,
        dispatchedBy: isDispatchedByStep ? (dispatchedBy || undefined) : undefined,
        stageAmount: isDispatchedByStep ? dispatchAmount : undefined,
        billDate: isBillPreparationStep ? (billDate || undefined) : undefined,
        billAmount: isBillPreparationStep ? (billAmount || undefined) : undefined,
        billNo: isBillPreparationStep ? (billNo || undefined) : undefined,
        personName: personName || undefined,
        uploadedFileName: uploadedFileName || undefined,
        bankName: bankObj?.bankName || undefined,
        branchName: selectedBranchName || undefined,
        remarks: remarks.trim(),
        masterId: selectedBranchRecord?.id ? Number(selectedBranchRecord.id) : (selectedBankId ? Number(selectedBankId) : 0),
      };

      const res = await fetch("/api/legal-recovery/work-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        // Record current stage in session memory
        const stageSnapshot = {
          noOfCount,
          broughtBy,
          preparedBy,
          printedBy,
          dispatchedBy,
          dispatchAmount,
          billDate,
          billAmount,
          billNo,
          personName,
          uploadedFileName,
          remarks,
          finalRate,
          bankOfficerPerNotice,
          assessmentExpenses
        };
        setSessionSavedStages(prev => ({
          ...prev,
          [businessDevSubOption]: stageSnapshot
        }));

        if (onRefresh) onRefresh();

        if (proceedToNext && typeOfWork === "Bank Related" && bankWorkCategory === "Business Development") {
          const steps = WORK_CATEGORIES[businessDevOption] || [];
          const currentIdx = steps.indexOf(businessDevSubOption);
          if (currentIdx >= 0 && currentIdx < steps.length - 1) {
            const nextSub = steps[currentIdx + 1];
            setBusinessDevSubOption(nextSub);
            setFormSuccessMessage(`Stage saved! Advanced to next stage: ${nextSub}`);
          } else {
            setFormSuccessMessage("Legal Work Log entry saved successfully!");
          }
        } else {
          // Complete Form Reset on "Save Work Log"
          setSelectedBankId("");
          setSelectedBranchName("");
          setBusinessDevSubOption("TAKE NOTICE ASSIGNMENT");
          setNoOfCount("1");
          setBroughtBy("");
          setPreparedBy("");
          setPrintedBy("");
          setDispatchedBy("");
          setDispatchAmount("");
          setFinalRate("");
          setBankOfficerPerNotice("");
          setAssessmentExpenses("");
          setBillNo("");
          setBillAmount("");
          setPersonName("");
          setUploadedFileName("");
          setRemarks("");
          setCustomLocation("");
          setSessionSavedStages({});
          setFormSuccessMessage("Legal Work Log entry saved successfully! Form cleared for next notice.");
        }
        setTimeout(() => setFormSuccessMessage(""), 5000);
      } else {
        alert(data.error || "Failed to save work log.");
      }
    } catch (err) {
      console.error("Work log submit error:", err);
      alert("Failed to save work log.");
    } finally {
      setSubmittingForm(false);
    }
  };

  const getCompletedTaskLog = (branchId: number, category: string, subCategory: string) => {
    return workLogs.find(log => log.masterId === branchId && log.category === category && log.subCategory === subCategory);
  };

  const getTaskCompletionData = (branchId: number, category: string) => {
    const steps = WORK_CATEGORIES[category];
    const completed = steps.filter(step => getCompletedTaskLog(branchId, category, step)).length;
    return { completed, total: steps.length, percentage: Math.round((completed / steps.length) * 100) };
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Header & Mode Selector Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-2xl border border-[#E8E4DF] shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-purple-600 to-indigo-700 text-white rounded-xl shadow-md">
            <Briefcase className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-black text-[#1C1C1A] uppercase tracking-wider">
              {viewMode === "form" ? "Legal Work Entry Form" : "Legal Work Boards"}
            </h2>
            <p className="text-xs text-[#9C9890] font-semibold mt-0.5">
              {viewMode === "form" ? "Log daily work date, location, type, and execution details" : "Manage case execution checklists"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
          <button 
            onClick={() => setViewMode("form")}
            className={`px-3.5 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${viewMode === "form" ? 'bg-purple-700 text-white shadow-md' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'}`}
          >
            <FileText className="w-3.5 h-3.5" /> Work Entry Form
          </button>
          <button 
            onClick={() => setViewMode("checklist")}
            className={`px-3.5 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${viewMode === "checklist" ? 'bg-purple-700 text-white shadow-md' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'}`}
          >
            <LayoutList className="w-3.5 h-3.5" /> Checklists
          </button>
        </div>
      </div>

      {/* Mode 1: Legal Work Entry Form (Default) */}
      {viewMode === "form" && (
        <div className="w-full max-w-5xl ml-0 space-y-6 animate-fade-in">
          <div className="bg-white border border-purple-100 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-100">
              <h3 className="text-xs font-black text-slate-950 uppercase tracking-wider flex items-center gap-2">
                <FileText className="w-4 h-4 text-purple-600" />
                Legal Work Details Form
              </h3>
              <span className="text-[10px] font-black text-purple-900 bg-purple-50 border border-purple-200/60 px-3 py-1 rounded-full">
                Daily Operations
              </span>
            </div>

            {formSuccessMessage && (
              <div className="mb-5 p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-950 rounded-xl text-xs font-black flex items-center gap-2 animate-fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                {formSuccessMessage}
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="space-y-6">
              {/* Row 1: Core Fields (Date, Location, Type) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-black mb-1.5 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-purple-600" />
                    Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={workDate}
                    onChange={e => setWorkDate(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-xs font-black text-slate-950 bg-white focus:outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-600/10 shadow-2xs transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-black mb-1.5 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-purple-600" />
                    Work Location *
                  </label>
                  <select
                    value={workLocation}
                    onChange={e => setWorkLocation(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-xs font-black text-slate-950 bg-white focus:outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-600/10 shadow-2xs transition-all cursor-pointer"
                  >
                    <option value="Office">Office</option>
                    <option value="Bank">Bank</option>
                    <option value="Field">Field</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-black mb-1.5 flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5 text-purple-600" />
                    Type of Work *
                  </label>
                  <select
                    value={typeOfWork}
                    onChange={e => setTypeOfWork(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-xs font-black text-slate-950 bg-white focus:outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-600/10 shadow-2xs transition-all cursor-pointer"
                  >
                    <option value="General">General</option>
                    <option value="Bank Related">Bank Related</option>
                    <option value="Operations">Operations</option>
                  </select>
                </div>
              </div>

              {/* Conditional Bank Details (Select Bank & Branch) */}
              {(workLocation === "Bank" || typeOfWork === "Bank Related") && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-purple-50/60 border border-purple-200/80 rounded-xl animate-fade-in shadow-2xs">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-black mb-1.5 flex items-center gap-1">
                      <Briefcase className="w-3.5 h-3.5 text-purple-600" />
                      Select Bank *
                    </label>
                    <select
                      required
                      value={selectedBankId}
                      onChange={e => {
                        setSelectedBankId(e.target.value);
                        setSelectedBranchName("");
                      }}
                      className="w-full p-2.5 border border-purple-300/80 rounded-xl text-xs font-black text-slate-950 bg-white focus:outline-none focus:border-purple-600 shadow-2xs transition-all cursor-pointer"
                    >
                      <option value="">-- Select Bank --</option>
                      {banks.map(b => (
                        <option key={String(b.id)} value={String(b.id)}>{b.bankName}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-black mb-1.5 flex items-center gap-1">
                      <Layers className="w-3.5 h-3.5 text-purple-600" />
                      Select Branch *
                    </label>
                    <select
                      required
                      value={selectedBranchName}
                      onChange={e => setSelectedBranchName(e.target.value)}
                      disabled={!selectedBankId}
                      className="w-full p-2.5 border border-purple-300/80 rounded-xl text-xs font-black text-slate-950 bg-white focus:outline-none focus:border-purple-600 shadow-2xs transition-all cursor-pointer disabled:opacity-50"
                    >
                      <option value="">{selectedBankId ? "-- Select Branch --" : "Select Bank First"}</option>
                      {branches
                        .filter(br => String(br.bankId) === String(selectedBankId))
                        .map(br => (
                          <option key={String(br.id)} value={br.branchName}>
                            {br.branchName} {br.branchCode ? `(${br.branchCode})` : ""}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Conditional Bank Category & Business Development Options */}
              {typeOfWork === "Bank Related" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-purple-50/60 border border-purple-200/80 rounded-xl animate-fade-in shadow-2xs">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-black mb-1.5 flex items-center gap-1">
                      <Layers className="w-3.5 h-3.5 text-purple-600" />
                      Bank Category *
                    </label>
                    <select
                      value={bankWorkCategory}
                      onChange={e => setBankWorkCategory(e.target.value as any)}
                      className="w-full p-2.5 border border-purple-300/80 rounded-xl text-xs font-black text-slate-950 bg-white focus:outline-none focus:border-purple-600 shadow-2xs transition-all cursor-pointer"
                    >
                      <option value="Business Development">Business Development</option>
                      <option value="Bill Follow Up">Bill Follow Up</option>
                    </select>
                  </div>

                  {bankWorkCategory === "Business Development" && (
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-wider text-black mb-1.5 flex items-center gap-1">
                        <Briefcase className="w-3.5 h-3.5 text-purple-600" />
                        Business Development Option *
                      </label>
                      <select
                        value={businessDevOption}
                        onChange={e => {
                          const newOpt = e.target.value;
                          setBusinessDevOption(newOpt);
                          const steps = WORK_CATEGORIES[newOpt] || [];
                          setBusinessDevSubOption(steps.length > 0 ? steps[0] : "");
                        }}
                        className="w-full p-2.5 border border-purple-300/80 rounded-xl text-xs font-black text-slate-950 bg-white focus:outline-none focus:border-purple-600 shadow-2xs transition-all cursor-pointer"
                      >
                        <option value="ADVOCATE NOTICE">ADVOCATE NOTICE</option>
                        <option value="RECOVERY SUIT / PSA APPLICATION">RECOVERY SUIT / PSA APPLICATION</option>
                        <option value="RACO RODA">RACO RODA</option>
                        <option value="SARFEASI NOTICE">SARFEASI NOTICE</option>
                        <option value="SY. POSSESSION">SY. POSSESSION</option>
                        <option value="DM ORDER">DM ORDER</option>
                        <option value="SP ORDER">SP ORDER</option>
                        <option value="PY. POSSESSION">PY. POSSESSION</option>
                        <option value="SEIZER">SEIZER</option>
                        <option value="New RC file case">New RC file case</option>
                        <option value="New PSSA">New PSSA</option>
                        <option value="138 case">138 case</option>
                      </select>
                    </div>
                  )}

                  {bankWorkCategory === "Business Development" && (
                    <div className="sm:col-span-2 space-y-4 pt-2 border-t border-purple-200/60">
                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-wider text-black mb-1.5 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-purple-600" />
                          Work Step / Sub-Option * ({businessDevOption})
                        </label>
                        <select
                          value={businessDevSubOption}
                          onChange={e => setBusinessDevSubOption(e.target.value)}
                          className="w-full p-2.5 border border-purple-300/80 rounded-xl text-xs font-black text-slate-950 bg-white focus:outline-none focus:border-purple-600 shadow-2xs transition-all cursor-pointer"
                        >
                          {(WORK_CATEGORIES[businessDevOption] || []).map((step, idx) => (
                            <option key={idx} value={step}>{step}</option>
                          ))}
                        </select>
                      </div>

                      {/* Sub-Option A: TAKE NOTICE ASSIGNMENT */}
                      {businessDevSubOption === "TAKE NOTICE ASSIGNMENT" && (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-white p-3.5 rounded-xl border border-purple-200 shadow-2xs animate-fade-in">
                          <div>
                            <label className="block text-[10px] font-black uppercase tracking-wider text-black mb-1.5 flex items-center gap-1">
                              <Layers className="w-3.5 h-3.5 text-purple-600" />
                              No. of Counts *
                            </label>
                            <input
                              type="number"
                              min="1"
                              required
                              value={noOfCount}
                              onChange={e => setNoOfCount(e.target.value)}
                              className="w-full p-2 border border-purple-300 rounded-lg text-xs font-black text-slate-950 bg-white focus:outline-none focus:border-purple-600"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-black uppercase tracking-wider text-black mb-1.5 flex items-center gap-1">
                              <Briefcase className="w-3.5 h-3.5 text-purple-600" />
                              Bank Name *
                            </label>
                            <select
                              required
                              value={selectedBankId}
                              onChange={e => {
                                setSelectedBankId(e.target.value);
                                setSelectedBranchName("");
                              }}
                              className="w-full p-2 border border-purple-300 rounded-lg text-xs font-black text-slate-950 bg-white focus:outline-none focus:border-purple-600"
                            >
                              <option value="">-- Select Bank --</option>
                              {banks.map(b => (
                                <option key={String(b.id)} value={String(b.id)}>{b.bankName}</option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-[10px] font-black uppercase tracking-wider text-black mb-1.5 flex items-center gap-1">
                              <Layers className="w-3.5 h-3.5 text-purple-600" />
                              Branch Name *
                            </label>
                            <input
                              type="text"
                              required
                              value={selectedBranchName}
                              onChange={e => setSelectedBranchName(e.target.value)}
                              placeholder="Enter branch name..."
                              className="w-full p-2 border border-purple-300 rounded-lg text-xs font-black text-slate-950 bg-white focus:outline-none focus:border-purple-600"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-black uppercase tracking-wider text-black mb-1.5 flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 text-purple-600" />
                              Allocation Date *
                            </label>
                            <input
                              type="date"
                              required
                              value={allocationDate}
                              onChange={e => setAllocationDate(e.target.value)}
                              className="w-full p-2 border border-purple-300 rounded-lg text-xs font-black text-slate-950 bg-white focus:outline-none focus:border-purple-600"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-black uppercase tracking-wider text-black mb-1.5 flex items-center gap-1">
                              <Briefcase className="w-3.5 h-3.5 text-purple-600" />
                              Brought By *
                            </label>
                            <input
                              type="text"
                              required
                              value={broughtBy}
                              onChange={e => setBroughtBy(e.target.value)}
                              placeholder="Enter person name..."
                              className="w-full p-2 border border-purple-300 rounded-lg text-xs font-black text-slate-950 bg-white focus:outline-none focus:border-purple-600"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-black uppercase tracking-wider text-black mb-1.5">
                              Per Notice Rate (₹) *
                            </label>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              required
                              value={finalRate}
                              onChange={e => setFinalRate(e.target.value)}
                              placeholder="Rate per notice"
                              className="w-full p-2 border border-purple-300 rounded-lg text-xs font-black text-slate-950 bg-white focus:outline-none focus:border-purple-600"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-black uppercase tracking-wider text-black mb-1.5">
                              Bank Officer / Notice (₹) *
                            </label>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              required
                              value={bankOfficerPerNotice}
                              onChange={e => setBankOfficerPerNotice(e.target.value)}
                              placeholder="Officer share per notice"
                              className="w-full p-2 border border-purple-300 rounded-lg text-xs font-black text-slate-950 bg-white focus:outline-none focus:border-purple-600"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-black uppercase tracking-wider text-black mb-1.5">
                              Own Expenses (₹)
                            </label>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={assessmentExpenses}
                              onChange={e => setAssessmentExpenses(e.target.value)}
                              placeholder="Enter expenses"
                              className="w-full p-2 border border-purple-300 rounded-lg text-xs font-black text-slate-950 bg-white focus:outline-none focus:border-purple-600"
                            />
                          </div>

                          <div className="sm:col-span-4 grid grid-cols-2 sm:grid-cols-4 gap-2 rounded-lg border border-purple-200 bg-purple-50/50 p-2">
                            <div><span className="text-[9px] font-bold uppercase text-slate-500">Total Revenue</span><div className="font-black">₹{assessmentTotalRevenue.toLocaleString("en-IN")}</div></div>
                            <div><span className="text-[9px] font-bold uppercase text-slate-500">Officer Total</span><div className="font-black text-amber-700">₹{assessmentOfficerTotal.toLocaleString("en-IN")}</div></div>
                            <div><span className="text-[9px] font-bold uppercase text-slate-500">Own Expenses</span><div className="font-black text-rose-700">₹{ownExpenses.toLocaleString("en-IN")}</div></div>
                            <div><span className="text-[9px] font-bold uppercase text-slate-500">GP Before Dispatch</span><div className={`font-black ${assessmentGrossProfit >= 0 ? "text-emerald-700" : "text-rose-700"}`}>₹{assessmentGrossProfit.toLocaleString("en-IN")}</div></div>
                          </div>
                        </div>
                      )}

                      {/* Sub-Option B: COLLECT NOTICE DATA */}
                      {businessDevSubOption === "COLLECT NOTICE DATA" && (
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 bg-white p-3.5 rounded-xl border border-purple-200 shadow-2xs animate-fade-in">
                          <div>
                            <label className="block text-[10px] font-black uppercase tracking-wider text-black mb-1.5 flex items-center gap-1">
                              <Layers className="w-3.5 h-3.5 text-purple-600" />
                              No. of Counts *
                            </label>
                            <input
                              type="number"
                              min="1"
                              required
                              value={noOfCount}
                              onChange={e => setNoOfCount(e.target.value)}
                              className="w-full p-2 border border-purple-300 rounded-lg text-xs font-black text-slate-950 bg-white focus:outline-none focus:border-purple-600"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-black uppercase tracking-wider text-black mb-1.5 flex items-center gap-1">
                              <Briefcase className="w-3.5 h-3.5 text-purple-600" />
                              Brought By *
                            </label>
                            <input
                              type="text"
                              required
                              placeholder="Person name who brought data..."
                              value={broughtBy}
                              onChange={e => setBroughtBy(e.target.value)}
                              className="w-full p-2 border border-purple-300 rounded-lg text-xs font-black text-slate-950 bg-white focus:outline-none focus:border-purple-600"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-black uppercase tracking-wider text-black mb-1.5 flex items-center gap-1">
                              <FileText className="w-3.5 h-3.5 text-purple-600" />
                              Upload Notice Data File (Optional)
                            </label>
                            <div className="flex items-center gap-2">
                              <input
                                type="file"
                                accept=".xlsx,.xls,.csv,.pdf,.doc,.docx,.png,.jpg,.jpeg,.gif,.webp,image/*"
                                onChange={handleFileChange}
                                className="w-full text-xs font-bold text-slate-700 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[10px] file:font-black file:bg-purple-100 file:text-purple-800 hover:file:bg-purple-200 cursor-pointer"
                              />
                              {uploadedFileName && (
                                <button
                                  type="button"
                                  onClick={() => setShowPreviewModal(true)}
                                  className="px-2.5 py-1.5 bg-purple-700 text-white rounded-lg text-[10px] font-black hover:bg-purple-800 flex items-center gap-1 whitespace-nowrap shadow-xs cursor-pointer"
                                >
                                  👁️ Preview
                                </button>
                              )}
                            </div>
                            {uploadedFileName && (
                              <span className="text-[10px] font-bold text-purple-700 mt-1 block truncate">
                                📄 {uploadedFileName}
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Sub-Option C: PREPARE NOTICE LIST */}
                      {businessDevSubOption === "PREPARE NOTICE LIST" && (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-white p-3.5 rounded-xl border border-purple-200 shadow-2xs animate-fade-in">
                          <div>
                            <label className="block text-[10px] font-black uppercase tracking-wider text-black mb-1.5 flex items-center gap-1">
                              <Layers className="w-3.5 h-3.5 text-purple-600" />
                              No. of Counts *
                            </label>
                            <input
                              type="number"
                              min="1"
                              required
                              value={noOfCount}
                              onChange={e => setNoOfCount(e.target.value)}
                              className="w-full p-2 border border-purple-300 rounded-lg text-xs font-black text-slate-950 bg-white focus:outline-none focus:border-purple-600"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-black uppercase tracking-wider text-black mb-1.5 flex items-center gap-1">
                              <Briefcase className="w-3.5 h-3.5 text-purple-600" />
                              Prepared By *
                            </label>
                            <input
                              type="text"
                              required
                              placeholder="Person name who prepared list..."
                              value={preparedBy}
                              onChange={e => setPreparedBy(e.target.value)}
                              className="w-full p-2 border border-purple-300 rounded-lg text-xs font-black text-slate-950 bg-white focus:outline-none focus:border-purple-600"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-black uppercase tracking-wider text-black mb-1.5 flex items-center gap-1">
                              <FileText className="w-3.5 h-3.5 text-purple-600" />
                              Upload Notice List File (Optional)
                            </label>
                            <div className="flex items-center gap-2">
                              <input
                                type="file"
                                accept=".xlsx,.xls,.csv,.pdf,.doc,.docx,.png,.jpg,.jpeg,.gif,.webp,image/*"
                                onChange={handleFileChange}
                                className="w-full text-xs font-bold text-slate-700 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[10px] file:font-black file:bg-purple-100 file:text-purple-800 hover:file:bg-purple-200 cursor-pointer"
                              />
                              {uploadedFileName && (
                                <button
                                  type="button"
                                  onClick={() => setShowPreviewModal(true)}
                                  className="px-2.5 py-1.5 bg-purple-700 text-white rounded-lg text-[10px] font-black hover:bg-purple-800 flex items-center gap-1 whitespace-nowrap shadow-xs cursor-pointer"
                                >
                                  👁️ Preview
                                </button>
                              )}
                            </div>
                            {uploadedFileName && (
                              <span className="text-[10px] font-bold text-purple-700 mt-1 block truncate">
                                📄 {uploadedFileName}
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Sub-Option D: GENERATE NOTICE VIA SOFTWARE/MAIL MERGE */}
                      {(businessDevSubOption?.includes("GENERATE NOTICE")) && (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-white p-3.5 rounded-xl border border-purple-200 shadow-2xs animate-fade-in">
                          <div>
                            <label className="block text-[10px] font-black uppercase tracking-wider text-black mb-1.5 flex items-center gap-1">
                              <Layers className="w-3.5 h-3.5 text-purple-600" />
                              No. of Counts *
                            </label>
                            <input
                              type="number"
                              min="1"
                              required
                              value={noOfCount}
                              onChange={e => setNoOfCount(e.target.value)}
                              className="w-full p-2 border border-purple-300 rounded-lg text-xs font-black text-slate-950 bg-white focus:outline-none focus:border-purple-600"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-black uppercase tracking-wider text-black mb-1.5 flex items-center gap-1">
                              <Briefcase className="w-3.5 h-3.5 text-purple-600" />
                              Printed By *
                            </label>
                            <input
                              type="text"
                              required
                              placeholder="Person name who printed notices..."
                              value={printedBy}
                              onChange={e => setPrintedBy(e.target.value)}
                              className="w-full p-2 border border-purple-300 rounded-lg text-xs font-black text-slate-950 bg-white focus:outline-none focus:border-purple-600"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-black uppercase tracking-wider text-black mb-1.5 flex items-center gap-1">
                              <FileText className="w-3.5 h-3.5 text-purple-600" />
                              Upload Notice File (Optional)
                            </label>
                            <div className="flex items-center gap-2">
                              <input
                                type="file"
                                accept=".xlsx,.xls,.csv,.pdf,.doc,.docx,.png,.jpg,.jpeg,.gif,.webp,image/*"
                                onChange={handleFileChange}
                                className="w-full text-xs font-bold text-slate-700 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[10px] file:font-black file:bg-purple-100 file:text-purple-800 hover:file:bg-purple-200 cursor-pointer"
                              />
                              {uploadedFileName && (
                                <button
                                  type="button"
                                  onClick={() => setShowPreviewModal(true)}
                                  className="px-2.5 py-1.5 bg-purple-700 text-white rounded-lg text-[10px] font-black hover:bg-purple-800 flex items-center gap-1 whitespace-nowrap shadow-xs cursor-pointer"
                                >
                                  👁️ Preview
                                </button>
                              )}
                            </div>
                            {uploadedFileName && (
                              <span className="text-[10px] font-bold text-purple-700 mt-1 block truncate">
                                📄 {uploadedFileName}
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Sub-Option E: DISPATCH NOTICES */}
                      {(businessDevSubOption?.includes("DISPATCH NOTICE")) && (
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 bg-white p-3.5 rounded-xl border border-purple-200 shadow-2xs animate-fade-in">
                          <div>
                            <label className="block text-[10px] font-black uppercase tracking-wider text-black mb-1.5 flex items-center gap-1">
                              <Layers className="w-3.5 h-3.5 text-purple-600" />
                              No. of Counts *
                            </label>
                            <input
                              type="number"
                              min="1"
                              required
                              value={noOfCount}
                              onChange={e => setNoOfCount(e.target.value)}
                              className="w-full p-2 border border-purple-300 rounded-lg text-xs font-black text-slate-950 bg-white focus:outline-none focus:border-purple-600"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-black uppercase tracking-wider text-black mb-1.5 flex items-center gap-1">
                              <Briefcase className="w-3.5 h-3.5 text-purple-600" />
                              Dispatched By *
                            </label>
                            <input
                              type="text"
                              required
                              placeholder="Person name who dispatched..."
                              value={dispatchedBy}
                              onChange={e => setDispatchedBy(e.target.value)}
                              className="w-full p-2 border border-purple-300 rounded-lg text-xs font-black text-slate-950 bg-white focus:outline-none focus:border-purple-600"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-black uppercase tracking-wider text-black mb-1.5">
                              Amount (₹) *
                            </label>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              required
                              value={dispatchAmount}
                              onChange={e => setDispatchAmount(e.target.value)}
                              placeholder="Enter dispatch amount..."
                              className="w-full p-2 border border-purple-300 rounded-lg text-xs font-black text-slate-950 bg-white focus:outline-none focus:border-purple-600"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-black uppercase tracking-wider text-black mb-1.5 flex items-center gap-1">
                              <FileText className="w-3.5 h-3.5 text-purple-600" />
                              Upload Dispatch Proof / File (Optional)
                            </label>
                            <div className="flex items-center gap-2">
                              <input
                                type="file"
                                accept=".xlsx,.xls,.csv,.pdf,.doc,.docx,.png,.jpg,.jpeg,.gif,.webp,image/*"
                                onChange={handleFileChange}
                                className="w-full text-xs font-bold text-slate-700 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[10px] file:font-black file:bg-purple-100 file:text-purple-800 hover:file:bg-purple-200 cursor-pointer"
                              />
                              {uploadedFileName && (
                                <button
                                  type="button"
                                  onClick={() => setShowPreviewModal(true)}
                                  className="px-2.5 py-1.5 bg-purple-700 text-white rounded-lg text-[10px] font-black hover:bg-purple-800 flex items-center gap-1 whitespace-nowrap shadow-xs cursor-pointer"
                                >
                                  👁️ Preview
                                </button>
                              )}
                            </div>
                            {uploadedFileName && (
                              <span className="text-[10px] font-bold text-purple-700 mt-1 block truncate">
                                📄 {uploadedFileName}
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Sub-Option F: PREPARE BILL (BILL BANWANA) */}
                      {(businessDevSubOption?.includes("PREPARE BILL")) && (
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 bg-white p-3.5 rounded-xl border border-purple-200 shadow-2xs animate-fade-in">
                          <div>
                            <label className="block text-[10px] font-black uppercase tracking-wider text-black mb-1.5 flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 text-purple-600" />
                              Bill Date *
                            </label>
                            <input
                              type="date"
                              required
                              value={billDate}
                              onChange={e => setBillDate(e.target.value)}
                              className="w-full p-2 border border-purple-300 rounded-lg text-xs font-black text-slate-950 bg-white focus:outline-none focus:border-purple-600"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-black uppercase tracking-wider text-black mb-1.5 flex items-center gap-1">
                              <Briefcase className="w-3.5 h-3.5 text-purple-600" />
                              Bill Amount (₹) *
                            </label>
                            <input
                              type="number"
                              required
                              placeholder="Enter amount..."
                              value={billAmount}
                              onChange={e => setBillAmount(e.target.value)}
                              className="w-full p-2 border border-purple-300 rounded-lg text-xs font-black text-slate-950 bg-white focus:outline-none focus:border-purple-600"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-black uppercase tracking-wider text-black mb-1.5 flex items-center gap-1">
                              <Layers className="w-3.5 h-3.5 text-purple-600" />
                              Bill No. *
                            </label>
                            <input
                              type="text"
                              required
                              placeholder="Enter bill number..."
                              value={billNo}
                              onChange={e => setBillNo(e.target.value)}
                              className="w-full p-2 border border-purple-300 rounded-lg text-xs font-black text-slate-950 bg-white focus:outline-none focus:border-purple-600"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-black uppercase tracking-wider text-black mb-1.5 flex items-center gap-1">
                              <FileText className="w-3.5 h-3.5 text-purple-600" />
                              Upload Bill File (Optional)
                            </label>
                            <div className="flex items-center gap-2">
                              <input
                                type="file"
                                accept=".xlsx,.xls,.csv,.pdf,.doc,.docx,.png,.jpg,.jpeg,.gif,.webp,.mp3,.wav,.aac,.m4a,.ogg,audio/*,image/*"
                                onChange={handleFileChange}
                                className="w-full text-xs font-bold text-slate-700 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[10px] file:font-black file:bg-purple-100 file:text-purple-800 hover:file:bg-purple-200 cursor-pointer"
                              />
                              {uploadedFileName && (
                                <button
                                  type="button"
                                  onClick={() => setShowPreviewModal(true)}
                                  className="px-2.5 py-1.5 bg-purple-700 text-white rounded-lg text-[10px] font-black hover:bg-purple-800 flex items-center gap-1 whitespace-nowrap shadow-xs cursor-pointer"
                                >
                                  👁️ Preview
                                </button>
                              )}
                            </div>
                            {uploadedFileName && (
                              <span className="text-[10px] font-bold text-purple-700 mt-1 block truncate">
                                📄 {uploadedFileName}
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Sub-Option G: REQUEST PAYMENT */}
                      {(businessDevSubOption?.includes("REQUEST PAYMENT")) && (
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 bg-white p-3.5 rounded-xl border border-purple-200 shadow-2xs animate-fade-in">
                          <div>
                            <label className="block text-[10px] font-black uppercase tracking-wider text-black mb-1.5 flex items-center gap-1">
                              <Briefcase className="w-3.5 h-3.5 text-purple-600" />
                              Amount (₹) *
                            </label>
                            <input
                              type="number"
                              required
                              placeholder="Enter amount..."
                              value={billAmount}
                              onChange={e => setBillAmount(e.target.value)}
                              className="w-full p-2 border border-purple-300 rounded-lg text-xs font-black text-slate-950 bg-white focus:outline-none focus:border-purple-600"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-black uppercase tracking-wider text-black mb-1.5 flex items-center gap-1">
                              <Layers className="w-3.5 h-3.5 text-purple-600" />
                              Person Name (Optional)
                            </label>
                            <input
                              type="text"
                              placeholder="Enter person name..."
                              value={personName}
                              onChange={e => setPersonName(e.target.value)}
                              className="w-full p-2 border border-purple-300 rounded-lg text-xs font-black text-slate-950 bg-white focus:outline-none focus:border-purple-600"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-black uppercase tracking-wider text-black mb-1.5 flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 text-purple-600" />
                              Allocated Date *
                            </label>
                            <input
                              type="date"
                              required
                              value={allocationDate}
                              onChange={e => setAllocationDate(e.target.value)}
                              className="w-full p-2 border border-purple-300 rounded-lg text-xs font-black text-slate-950 bg-white focus:outline-none focus:border-purple-600"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-black uppercase tracking-wider text-black mb-1.5 flex items-center gap-1">
                              <FileText className="w-3.5 h-3.5 text-purple-600" />
                              Upload File (Optional)
                            </label>
                            <div className="flex items-center gap-2">
                              <input
                                type="file"
                                accept=".xlsx,.xls,.csv,.pdf,.doc,.docx,.png,.jpg,.jpeg,.gif,.webp,.mp3,.wav,.aac,.m4a,.ogg,audio/*,image/*"
                                onChange={handleFileChange}
                                className="w-full text-xs font-bold text-slate-700 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[10px] file:font-black file:bg-purple-100 file:text-purple-800 hover:file:bg-purple-200 cursor-pointer"
                              />
                              {uploadedFileName && (
                                <button
                                  type="button"
                                  onClick={() => setShowPreviewModal(true)}
                                  className="px-2.5 py-1.5 bg-purple-700 text-white rounded-lg text-[10px] font-black hover:bg-purple-800 flex items-center gap-1 whitespace-nowrap shadow-xs cursor-pointer"
                                >
                                  👁️ Preview
                                </button>
                              )}
                            </div>
                            {uploadedFileName && (
                              <span className="text-[10px] font-bold text-purple-700 mt-1 block truncate">
                                📄 {uploadedFileName}
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Default Fallback for other sub-options */}
                      {businessDevSubOption !== "TAKE NOTICE ASSIGNMENT" &&
                       businessDevSubOption !== "COLLECT NOTICE DATA" &&
                       businessDevSubOption !== "PREPARE NOTICE LIST" &&
                       !businessDevSubOption?.includes("GENERATE NOTICE") &&
                       !businessDevSubOption?.includes("DISPATCH NOTICE") &&
                       !businessDevSubOption?.includes("PREPARE BILL") &&
                       !businessDevSubOption?.includes("REQUEST PAYMENT") && (
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 bg-white p-3.5 rounded-xl border border-purple-200 shadow-2xs animate-fade-in">
                          <div>
                            <label className="block text-[10px] font-black uppercase tracking-wider text-black mb-1.5 flex items-center gap-1">
                              <Layers className="w-3.5 h-3.5 text-purple-600" />
                              No. of Count *
                            </label>
                            <input
                              type="number"
                              min="1"
                              required
                              value={noOfCount}
                              onChange={e => setNoOfCount(e.target.value)}
                              placeholder="Enter count..."
                              className="w-full p-2 border border-purple-300 rounded-lg text-xs font-black text-slate-950 bg-white focus:outline-none focus:border-purple-600"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-black uppercase tracking-wider text-black mb-1.5 flex items-center gap-1">
                              <Briefcase className="w-3.5 h-3.5 text-purple-600" />
                              Branch Name *
                            </label>
                            <input
                              type="text"
                              required
                              value={selectedBranchName}
                              onChange={e => setSelectedBranchName(e.target.value)}
                              placeholder="Enter branch name..."
                              className="w-full p-2 border border-purple-300 rounded-lg text-xs font-black text-slate-950 bg-white focus:outline-none focus:border-purple-600"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-black uppercase tracking-wider text-black mb-1.5 flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 text-purple-600" />
                              Allocation Date *
                            </label>
                            <input
                              type="date"
                              required
                              value={allocationDate}
                              onChange={e => setAllocationDate(e.target.value)}
                              className="w-full p-2 border border-purple-300 rounded-lg text-xs font-black text-slate-950 bg-white focus:outline-none focus:border-purple-600"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-black uppercase tracking-wider text-black mb-1.5 flex items-center gap-1">
                              <FileText className="w-3.5 h-3.5 text-purple-600" />
                              Upload File
                            </label>
                            <div className="flex items-center gap-2">
                              <input
                                type="file"
                                accept=".xlsx,.xls,.csv,.pdf,.doc,.docx,.png,.jpg,.jpeg,.gif,.webp,.mp3,.wav,.aac,.m4a,.ogg,audio/*,image/*"
                                onChange={handleFileChange}
                                className="w-full text-xs font-bold text-slate-700 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[10px] file:font-black file:bg-purple-100 file:text-purple-800 hover:file:bg-purple-200 cursor-pointer"
                              />
                              {uploadedFileName && (
                                <button
                                  type="button"
                                  onClick={() => setShowPreviewModal(true)}
                                  className="px-2.5 py-1.5 bg-purple-700 text-white rounded-lg text-[10px] font-black hover:bg-purple-800 flex items-center gap-1 whitespace-nowrap shadow-xs cursor-pointer"
                                >
                                  👁️ Preview
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {bankWorkCategory === "Bill Follow Up" && (
                    <div className="sm:col-span-2 space-y-4 border-t border-purple-200/60 pt-4">
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                        <div className="rounded-lg border border-slate-200 bg-white p-3">
                          <span className="text-[9px] font-black uppercase text-slate-500">Pending Bills</span>
                          <div className="mt-1 text-lg font-black text-slate-900">
                            {loadingPendingBills ? "..." : pendingBillSummary.totalBills}
                          </div>
                        </div>
                        <div className="rounded-lg border border-slate-200 bg-white p-3">
                          <span className="text-[9px] font-black uppercase text-slate-500">Total Bill Amount</span>
                          <div className="mt-1 text-sm font-black text-slate-900">
                            ₹{pendingBillSummary.totalBillAmount.toLocaleString("en-IN")}
                          </div>
                        </div>
                        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                          <span className="text-[9px] font-black uppercase text-emerald-700">Amount Received</span>
                          <div className="mt-1 text-sm font-black text-emerald-700">
                            ₹{pendingBillSummary.totalReceivedAmount.toLocaleString("en-IN")}
                          </div>
                        </div>
                        <div className="rounded-lg border border-rose-200 bg-rose-50 p-3">
                          <span className="text-[9px] font-black uppercase text-rose-700">Total Pending</span>
                          <div className="mt-1 text-sm font-black text-rose-700">
                            ₹{pendingBillSummary.totalPendingAmount.toLocaleString("en-IN")}
                          </div>
                        </div>
                      </div>

                      <div className="overflow-x-auto rounded-lg border border-purple-200 bg-white">
                        <table className="min-w-[620px] text-xs">
                          <thead>
                            <tr>
                              <th>Bill No.</th>
                              <th>Bill Date</th>
                              <th>Bill Amount</th>
                              <th>Received</th>
                              <th>Pending</th>
                            </tr>
                          </thead>
                          <tbody>
                            {loadingPendingBills ? (
                              <tr><td colSpan={5} className="text-center text-slate-500">Loading pending bills...</td></tr>
                            ) : pendingBills.length === 0 ? (
                              <tr><td colSpan={5} className="text-center text-slate-500">No pending bill found for selected branch.</td></tr>
                            ) : pendingBills.map(bill => (
                              <tr key={bill.id}>
                                <td className="font-bold">{bill.billNo || `#${bill.id}`}</td>
                                <td>{bill.billDate || "—"}</td>
                                <td>₹{Number(bill.billAmount).toLocaleString("en-IN")}</td>
                                <td className="text-emerald-700">₹{Number(bill.receivedAmount).toLocaleString("en-IN")}</td>
                                <td className="font-black text-rose-700">₹{Number(bill.pendingAmount).toLocaleString("en-IN")}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div className="grid grid-cols-1 gap-3 rounded-xl border border-purple-200 bg-white p-3 sm:grid-cols-3">
                        <div>
                          <label className="mb-1 block text-[10px] font-black uppercase">Call Date *</label>
                          <input type="date" required value={callDate} onChange={e => setCallDate(e.target.value)} className="w-full rounded-lg border border-purple-300 p-2 text-xs font-bold" />
                        </div>
                        <div>
                          <label className="mb-1 block text-[10px] font-black uppercase">Call Time *</label>
                          <input type="time" required value={callTime} onChange={e => setCallTime(e.target.value)} className="w-full rounded-lg border border-purple-300 p-2 text-xs font-bold" />
                        </div>
                        <div>
                          <label className="mb-1 block text-[10px] font-black uppercase">Contacted Person *</label>
                          <input type="text" required value={contactedPerson} onChange={e => setContactedPerson(e.target.value)} placeholder="Name / designation" className="w-full rounded-lg border border-purple-300 p-2 text-xs font-bold" />
                        </div>
                        <div className="sm:col-span-3">
                          <label className="mb-1 block text-[10px] font-black uppercase">Call Attachment</label>
                          <input
                            type="file"
                            accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.mp3,.wav,.aac,.m4a,.ogg,audio/*,image/*"
                            onChange={handleFileChange}
                            className="w-full text-xs font-bold file:mr-2 file:rounded-lg file:border-0 file:bg-purple-100 file:px-3 file:py-1.5 file:text-[10px] file:font-black file:text-purple-800"
                          />
                          {uploadedFileName && <span className="mt-1 block text-[10px] font-bold text-purple-700">📎 {uploadedFileName}</span>}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Custom Location Field */}
              {workLocation === "Other" && (
                <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl animate-fade-in shadow-2xs">
                  <label className="block text-[10px] font-black uppercase tracking-wider text-amber-950 mb-1.5">
                    Specify Custom Work Location *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Enter custom location details..."
                    value={customLocation}
                    onChange={e => setCustomLocation(e.target.value)}
                    className="w-full p-2.5 border border-amber-300 rounded-xl text-xs font-black text-slate-950 bg-white focus:outline-none focus:border-amber-600 shadow-2xs"
                  />
                </div>
              )}

              {/* Remarks Field */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-black mb-1.5">
                  Remarks / Work Details *
                </label>
                <textarea
                  required
                  rows={3}
                  value={remarks}
                  onChange={e => setRemarks(e.target.value)}
                  placeholder={bankWorkCategory === "Bill Follow Up" ? "Call par kya baat hui, payment commitment aur next follow-up details..." : "Enter specific work instructions, execution notes or completed tasks summary..."}
                  className="w-full p-3 border border-slate-300 rounded-xl text-xs font-bold text-slate-950 bg-white focus:outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-600/10 shadow-2xs transition-all"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex flex-col sm:flex-row justify-end gap-3 pt-2">
                {typeOfWork === "Bank Related" && bankWorkCategory === "Business Development" && (
                  <button
                    type="button"
                    disabled={submittingForm}
                    onClick={(e) => handleFormSubmit(e, true)}
                    className="w-full sm:w-auto px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 disabled:opacity-60 cursor-pointer active:scale-95"
                  >
                    <Send className="w-3.5 h-3.5" /> Save &amp; Proceed to Next Stage ➔
                  </button>
                )}
                <button
                  type="submit"
                  disabled={submittingForm}
                  className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-800 hover:to-indigo-800 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
                >
                  {submittingForm ? (
                    <>Saving Work Log...</>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" /> Save Work Log
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Mode 2: Checklist Boards */}
      {viewMode === "checklist" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start animate-fade-in">
          {/* Cases List */}
          <div className="lg:col-span-1 bg-white border border-[#E8E4DF] rounded-xl overflow-hidden shadow-sm h-[600px] flex flex-col">
            <div className="p-4 bg-slate-50 border-b border-[#E8E4DF]">
              <div className="relative w-full mb-3">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Search Branches..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-white border border-[#E8E4DF] focus:border-blue-500 rounded-xl text-xs focus:outline-none transition-colors"
                />
              </div>
              <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider">Select a Branch</h3>
            </div>
            <div className="overflow-y-auto flex-1 p-2 space-y-2">
              {filteredBranches.map(b => (
                <button
                  key={b.id}
                  onClick={() => setSelectedBranch(b.id)}
                  className={`w-full text-left p-3 rounded-lg border transition-all ${
                    selectedBranch === b.id 
                      ? 'border-blue-500 bg-blue-50 shadow-sm' 
                      : 'border-transparent hover:bg-slate-50 border-slate-100'
                  }`}
                >
                  <div className="font-bold text-xs text-slate-800">{getBankName(b.bankId)}</div>
                  <div className="text-[10px] text-slate-500 font-semibold mb-1">Branch: {b.branchName}</div>
                  <div className="text-[10px] text-[#9C9890]">AO: {b.aoName || 'N/A'}</div>
                </button>
              ))}
              {filteredBranches.length === 0 && (
                <div className="text-center p-6 text-xs text-slate-400 font-semibold">No branches match your search.</div>
              )}
            </div>
          </div>

          {/* Work Checklist Panel */}
          <div className="lg:col-span-2 bg-white border border-[#E8E4DF] rounded-xl overflow-hidden shadow-sm h-[600px] flex flex-col">
            {selectedBranch ? (
              <>
                {(() => {
                  const b = branches.find((branchObj: any) => branchObj.id === selectedBranch);
                  const bankName = b ? getBankName(b.bankId) : "";
                  return (
                    <div className="p-5 border-b border-[#E8E4DF] bg-slate-50 flex items-center justify-between">
                      <div>
                        <h2 className="text-sm font-black text-slate-800">{bankName}</h2>
                        <div className="text-xs text-slate-500 font-semibold mt-1">Branch: {b?.branchName}</div>
                      </div>
                    </div>
                  );
                })()}
                
                <div className="p-6 overflow-y-auto flex-1 space-y-4">
                  {Object.keys(WORK_CATEGORIES).map(category => {
                    const progress = getTaskCompletionData(selectedBranch, category);
                    const isExpanded = expandedCategories[category];
                    
                    return (
                      <div key={category} className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                        <button 
                          onClick={() => toggleCategory(category)}
                          className="w-full flex items-center justify-between p-4 bg-white hover:bg-slate-50 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            {isExpanded ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronRight className="w-5 h-5 text-slate-400" />}
                            <span className="font-black text-xs text-slate-800 tracking-wide uppercase">{category}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] font-bold text-slate-500">{progress.completed}/{progress.total} Steps</span>
                            <div className="w-16 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                              <div className="bg-blue-600 h-full rounded-full" style={{ width: `${progress.percentage}%` }}></div>
                            </div>
                          </div>
                        </button>

                        {isExpanded && (
                          <div className="p-4 bg-slate-50 border-t border-slate-100 space-y-3">
                            {WORK_CATEGORIES[category].map(step => {
                              const log = getCompletedTaskLog(selectedBranch, category, step);
                              const isStepDone = !!log;
                              const taskKey = `${selectedBranch}-${category}-${step}`;
                              const isUpdating = updatingTask === taskKey;
                              const isFormOpen = activeStepForm === taskKey;

                              return (
                                <div key={step} className="p-3 bg-white border border-slate-200 rounded-lg flex flex-col gap-2">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${isStepDone ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500'}`}>
                                        {isStepDone ? "✓" : "•"}
                                      </div>
                                      <span className={`text-xs font-bold ${isStepDone ? 'text-slate-800' : 'text-slate-600'}`}>{step}</span>
                                    </div>
                                    
                                    {!isStepDone && (
                                      <button 
                                        onClick={() => setActiveStepForm(isFormOpen ? null : taskKey)}
                                        className="px-3 py-1 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded text-[10px] font-bold uppercase transition-colors"
                                      >
                                        Mark Done
                                      </button>
                                    )}
                                  </div>

                                  {isFormOpen && !isStepDone && (
                                    <div className="mt-2 p-3 bg-blue-50/50 border border-blue-200 rounded-lg space-y-2 animate-fade-in">
                                      <input 
                                        type="text"
                                        placeholder="Add remarks or notes..."
                                        value={stepRemarks}
                                        onChange={(e) => setStepRemarks(e.target.value)}
                                        className="w-full p-2 bg-white border border-slate-300 rounded text-xs focus:outline-none focus:border-blue-500"
                                      />
                                      <div className="flex justify-end gap-2">
                                        <button 
                                          onClick={() => setActiveStepForm(null)}
                                          className="px-2.5 py-1 text-slate-500 text-[10px] font-bold"
                                        >
                                          Cancel
                                        </button>
                                        <button 
                                          disabled={isUpdating}
                                          onClick={() => handleMarkTaskDone(selectedBranch, category, step, stepRemarks)}
                                          className="px-3 py-1 bg-blue-600 text-white rounded text-[10px] font-bold uppercase hover:bg-blue-700"
                                        >
                                          {isUpdating ? "Saving..." : "Confirm Done"}
                                        </button>
                                      </div>
                                    </div>
                                  )}

                                  {isStepDone && (
                                    <div className="text-[10px] text-slate-500 bg-slate-50 p-2 rounded border border-slate-100 flex items-center justify-between">
                                      <span>Done by: <strong>{log.employeeName || 'Unknown'}</strong> ({log.remarks || 'No remarks'})</span>
                                      <span className="text-slate-400">{new Date(log.createdAt).toLocaleDateString()}</span>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                <Briefcase className="w-12 h-12 text-slate-200 mb-3" />
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-1">No Branch Selected</h3>
                <p className="text-xs text-slate-400 max-w-xs">Select a branch from the list on the left to manage its work execution checklist.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* File Preview Modal */}
      {showPreviewModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl p-5 max-w-lg w-full space-y-4 shadow-2xl relative border border-purple-100">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                📄 File Preview: {uploadedFileName}
              </h4>
              <button
                type="button"
                onClick={() => setShowPreviewModal(false)}
                className="text-slate-400 hover:text-slate-700 font-black text-sm px-2 py-0.5 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="max-h-[350px] overflow-auto flex items-center justify-center bg-slate-50 rounded-xl p-4 border border-slate-200">
              {uploadedFilePreview && (uploadedFileType.startsWith("image/") || uploadedFileName.match(/\.(png|jpg|jpeg|gif|webp)$/i)) ? (
                <img src={uploadedFilePreview} alt="Preview" className="max-h-[300px] object-contain rounded-lg shadow-sm" />
              ) : uploadedFilePreview && (uploadedFileType.startsWith("audio/") || uploadedFileName.match(/\.(mp3|wav|aac|m4a|ogg)$/i)) ? (
                <div className="text-center py-6 space-y-3 w-full max-w-sm">
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto text-purple-700 font-bold text-xl">
                    🎵
                  </div>
                  <p className="text-xs font-black text-slate-800 truncate">{uploadedFileName}</p>
                  <audio controls src={uploadedFilePreview} className="w-full rounded-lg shadow-xs" />
                </div>
              ) : (
                <div className="text-center py-8 space-y-2">
                  <FileText className="w-10 h-10 text-purple-600 mx-auto" />
                  <p className="text-xs font-bold text-slate-700">{uploadedFileName}</p>
                  <p className="text-[10px] text-slate-400 font-semibold">File / Recording selected and ready for submission.</p>
                </div>
              )}
            </div>
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowPreviewModal(false)}
                className="px-4 py-2 bg-purple-700 text-white rounded-xl text-xs font-black hover:bg-purple-800 cursor-pointer shadow-md"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
