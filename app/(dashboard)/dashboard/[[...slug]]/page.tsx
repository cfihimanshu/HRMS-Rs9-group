"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  X,
  Loader2,
  Clock,
  Calendar
} from "lucide-react";

// Import modular panels
import DashboardSidebar from "@/components/dashboard/Sidebar";
import Topbar from "@/components/dashboard/Topbar";
import HiringRequisitionModal from "@/components/dashboard/HiringRequisitionModal";
import { OwnerDashboard, HrDashboard, DepartmentDashboard } from "@/components/dashboard/OverviewPanels";
import {
  HiringApproval,
  JobPostings,
  CandidatesPipeline,
  AiScreening,
  VerificationChecklist,
  InterviewsQueue,
  HrLeads
} from "@/components/dashboard/RecruitmentPanels";
import {
  OnboardingRoadmap,
  TrainingClassroom,
  ProbationEvaluation
} from "@/components/dashboard/OnboardingPanels";
import { DailyCommitments, PerformanceCompliance, LeaveRequestTab } from "@/components/dashboard/OpsPanels";
import { FieldVisitLogs } from "@/components/dashboard/FieldVisitPanels";
import {
  BusinessAssociates,
  VendorOperations,
  FranchiseTerritories
} from "@/components/dashboard/PartnersPanels";
import {
  GrievanceResolution,
  SystemRiskAlerts,
  ExitSeparation
} from "@/components/dashboard/CompliancePanels";
import {
  ESSDashboard,
  ESSLeaves,
  ESSPayroll,
  ESSExpenses
} from "@/components/dashboard/ESSPanels";
import EmployeeDirectory from "@/components/dashboard/EmployeePanels";
import BDADirectory from "@/components/dashboard/BDAPanels";
import AssetsRegistry from "@/components/dashboard/AssetsRegistry";
import KanbanBoard from "@/components/dashboard/KanbanBoard";
import { AssetRequestLogs } from "@/components/dashboard/AssetRequestPanels";

export default function UnifiedEnterpriseDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const rawRole = (session?.user as any)?.role || "Employee";
  const SYSTEM_ROLES = [
    "Owner",
    "Director",
    "HR Head",
    "HR Executive",
    "Department Manager",
    "Employee",
    "Accounts",
    "Trainer",
    "IT Admin",
    "DSM",
    "RIBP / Risk Officer",
    "Business Associate",
    "Vendor",
    "Franchisee",
    "Territory Partner"
  ];
  const userRole = SYSTEM_ROLES.map(r => r.toLowerCase()).includes(rawRole.toLowerCase())
    ? SYSTEM_ROLES.find(r => r.toLowerCase() === rawRole.toLowerCase()) || "Employee"
    : "Employee";

  // Active navigation tab matching hr.html panel toggles
  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  // Dynamic Clock States
  const [localTime, setLocalTime] = useState<string>("");
  const [localDate, setLocalDate] = useState<string>("");

  // Toast System
  const [toastMsg, setToastMsg] = useState<string>("");
  const [toastShow, setToastShow] = useState<boolean>(false);
  const [toastTimer, setToastTimer] = useState<any>(null);

  const triggerToast = (msg: string) => {
    setToastMsg(msg);
    setToastShow(true);
    if (toastTimer) clearTimeout(toastTimer);
    const timer = setTimeout(() => {
      setToastShow(false);
    }, 3500);
    setToastTimer(timer);
  };

  // Database Data States
  const [stats, setStats] = useState<any>(null);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [interviews, setInterviews] = useState<any[]>([]);
  const [allCompanies, setAllCompanies] = useState<any[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");
  const [jobs, setJobs] = useState<any[]>([]);
  const [probationList, setProbationList] = useState<any[]>([]);
  const [grievanceList, setGrievanceList] = useState<any[]>([]);
  const [riskAlertList, setRiskAlertList] = useState<any[]>([]);
  const [exitRecordList, setExitRecordList] = useState<any[]>([]);
  const [requisitions, setRequisitions] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Selected Candidate for detailed view
  const [selectedCandidate, setSelectedCandidate] = useState<any>(null);
  const [preselectedWorkReportUserId, setPreselectedWorkReportUserId] = useState<string>("");

  // Modal Open/Close States
  const [modals, setModals] = useState<{ [key: string]: boolean }>({
    hiring: false,
    job: false,
    cand: false,
    interview: false,
    feedback: false,
    grievance: false,
    assoc: false,
    vendor: false,
    franchise: false,
    sodModal: false,
    eodModal: false
  });

  const toggleModal = (modalId: string, open: boolean) => {
    setModals(prev => ({ ...prev, [modalId]: open }));
  };

  // Form Inputs
  const [hiringForm, setHiringForm] = useState({
    companyName: "Acolyte Group of Companies",
    department: "Sales",
    role: "",
    category: "Staff" as "Staff" | "Associate" | "Vendor" | "Franchise",
    location: "",
    qty: 1,
    jd: "",
    kra: "",
    kpi: "",
    qualification: "",
    salaryBudget: "",
    riskLevel: "Low" as "Low" | "Medium" | "High" | "Critical",
    expectedOutput: "",
  });
  const [aiGenerating, setAiGenerating] = useState<boolean>(false);

  const handleGenerateJD = async () => {
    if (!hiringForm.role || !hiringForm.department) {
      triggerToast("Please fill Role and Department first before generating JD!");
      return;
    }
    setAiGenerating(true);
    try {
      const res = await fetch("/api/hiring/generate-jd", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: hiringForm.role,
          department: hiringForm.department,
          category: hiringForm.category,
          expectedOutput: hiringForm.expectedOutput,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setHiringForm(prev => ({
          ...prev,
          jd: data.data.jd || prev.jd,
          kra: data.data.kra || prev.kra,
          kpi: data.data.kpi || prev.kpi,
        }));
        triggerToast("✨ AI generated JD, KRA & KPI successfully! Review and edit if needed.");
      } else {
        triggerToast("AI generation failed: " + data.error);
      }
    } catch (err) {
      triggerToast("Network error during AI JD generation.");
    } finally {
      setAiGenerating(false);
    }
  };

  const [jobForm, setJobForm] = useState({
    title: "",
    companyName: "",
    departmentName: "",
    location: "",
    category: "" as any,
    qualification: "",
    experience: "",
    salaryRange: "",
    description: "",
    applicationLink: "",
    source: "" as any,
    requisitionId: ""
  });

  const [candForm, setCandForm] = useState({
    name: "",
    mobile: "",
    email: "",
    experience: "",
    jobId: "",
    qualification: "",
    currentSalary: "",
    expectedSalary: "",
    noticePeriod: "",
    sideBusiness: false,
    loanPressure: false,
    legalMatter: false,
    bgvAgreement: true,
    dataConfidentiality: true
  });

  const [interviewForm, setInterviewForm] = useState({
    candidateId: "",
    round: "1",
    date: "",
    time: "11:00",
    mode: "Video Call"
  });

  const [feedbackForm, setFeedbackForm] = useState({
    traineeId: "",
    dayNumber: "1",
    sopScore: "",
    crmScore: "",
    discipline: "Excellent",
    behaviour: "Excellent",
    notes: ""
  });

  const [grievanceForm, setGrievanceForm] = useState({
    name: "",
    category: "Harassment",
    priority: "High",
    description: "",
  });

  const [assocForm, setAssocForm] = useState({
    name: "",
    mobile: "",
    territory: "",
  });

  const [vendorForm, setVendorForm] = useState({
    name: "",
    category: "IT Vendor",
    panGst: "",
  });

  const [franchiseForm, setFranchiseForm] = useState({
    name: "",
    territory: "",
    brand: "Acolyte Prime",
  });

  // Daily Operations inputs




  const [dataLoaded, setDataLoaded] = useState(false);

  // Check login and update URL based on user info
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated" && session?.user) {
      const u = session.user as any;
      const comp = u.company ? u.company.replace(/\\s+/g, '-') : "Company";
      const dept = u.department ? u.department.replace(/\\s+/g, '-') : "Department";
      const role = u.role ? u.role.replace(/\\s+/g, '-') : "Role";
      const empId = u.employeeId || u.id || "EMP";
      const expectedPath = `/dashboard/${encodeURIComponent(comp)}/${encodeURIComponent(dept)}/${encodeURIComponent(role)}/${encodeURIComponent(empId)}`;
      
      if (window.location.pathname !== expectedPath && window.location.pathname.startsWith('/dashboard')) {
        window.history.replaceState(null, '', expectedPath + window.location.search);
      }
    }
  }, [status, session, router]);

  // Tick clock (IST)
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setLocalTime(now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
      setLocalDate(now.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" }));
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch Database Data
  const loadCompanies = async () => {
    try {
      const res = await fetch("/api/companies");
      const data = await res.json();
      if (data.success) setAllCompanies(data.data);
    } catch (err) {
      console.error(err);
    }
  };

  const loadStats = async (companyId?: string) => {
    try {
      const url = companyId ? `/api/dashboard/stats?companyId=${companyId}` : "/api/dashboard/stats";
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) setStats(data.stats);
    } catch (err) {
      console.error("Failed to load statistics", err);
    }
  };

  const loadCandidates = async () => {
    try {
      const res = await fetch("/api/candidates");
      const data = await res.json();
      if (data.success) {
        setCandidates(data.data);
        if (data.data.length > 0 && !selectedCandidate) {
          setSelectedCandidate(data.data[0]);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadInterviews = async () => {
    try {
      const res = await fetch("/api/interviews");
      const data = await res.json();
      if (data.success) setInterviews(data.data);
    } catch (err) {
      console.error(err);
    }
  };

  const loadPostedJobs = async () => {
    try {
      const res = await fetch("/api/jobs");
      const data = await res.json();
      if (data.success) setJobs(data.data);
    } catch (err) {
      console.error(err);
    }
  };

  const loadProbation = async () => {
    try {
      const res = await fetch("/api/probation");
      const data = await res.json();
      if (data.success) setProbationList(data.data);
    } catch (err) {
      console.error(err);
    }
  };

  const loadGrievances = async () => {
    try {
      const res = await fetch("/api/grievances");
      const data = await res.json();
      if (data.success) setGrievanceList(data.data);
    } catch (err) {
      console.error(err);
    }
  };

  const loadRiskAlerts = async () => {
    try {
      const res = await fetch("/api/alerts");
      const data = await res.json();
      if (data.success) setRiskAlertList(data.data);
    } catch (err) {
      console.error(err);
    }
  };

  const loadExits = async () => {
    try {
      const res = await fetch("/api/exits");
      const data = await res.json();
      if (data.success) setExitRecordList(data.data);
    } catch (err) {
      console.error(err);
    }
  };

  const loadRequisitions = async () => {
    try {
      const res = await fetch("/api/hiring");
      const data = await res.json();
      if (data.success) setRequisitions(data.data);
    } catch (err) {
      console.error(err);
    }
  };

  const loadAllData = async () => {
    setLoading(true);
    const role = userRole;
    const isManagerial = ["Owner", "Director", "HR Head", "HR Executive", "Department Manager"].includes(role);

    const promises: Promise<any>[] = [
      loadCompanies(),
      loadStats(selectedCompanyId)
    ];

    if (isManagerial) {
      promises.push(
        loadCandidates(),
        loadInterviews(),
        loadPostedJobs(),
        loadProbation(),
        loadGrievances(),
        loadRiskAlerts(),
        loadExits(),
        loadRequisitions()
      );
    }

    await Promise.all(promises);
    setLoading(false);
  };

  useEffect(() => {
    if (status === "authenticated" && !loading) {
      loadStats(selectedCompanyId);
    }
  }, [selectedCompanyId]);

  useEffect(() => {
    if (status === "authenticated" && !dataLoaded) {
      if (typeof window !== "undefined") {
        const urlParams = new URLSearchParams(window.location.search);
        const tab = urlParams.get("tab");
        const role = userRole;

        if (tab && tab !== activeTab) {
           setActiveTab(tab);
        } else if (role === "Owner" || role === "Director") {
          setActiveTab("dashboard");
        } else if (role === "HR Head" || role === "HR Executive") {
          setActiveTab("hr-dash");
        } else if (role === "Trainer") {
          setActiveTab("training");
        } else if (role === "Employee") {
          setActiveTab("ess-dashboard"); // Stay on ESS dashboard
        } else if (role === "Vendor") {
          setActiveTab("vendors");
        } else if (role === "Franchisee" || role === "Territory Partner") {
          setActiveTab("franchise");
        } else if (role === "Accounts") {
          setActiveTab("hiring");
        } else {
          setActiveTab("attendance");
        }
      }
      loadAllData();
      setDataLoaded(true);
    }
  }, [status, session, dataLoaded]);

  // Auto popup SOD on load if missing
  useEffect(() => {
    if (stats?.currentUserCompliance && userRole === "Employee") {
       if (!stats.currentUserCompliance.hasSod && !modals.sodModal && activeTab !== "attendance") {
           toggleModal("sodModal", true);
       }
    }
  }, [stats]);

  // Form Handlers
  const handleAttendancePunch = async () => {
    try {
      const res = await fetch("/api/attendance", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        triggerToast(data.data.checkOut ? "Checked out successfully!" : "Checked in successfully!");
        await loadStats();
      } else {
        triggerToast("Punch failed: " + data.error);
      }
    } catch (err: any) {
      triggerToast("Error: " + err.message);
    }
  };

  const handleSodSubmit = async (payload: any): Promise<boolean> => {
    try {
      const res = await fetch("/api/reports/sod", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        triggerToast("SOD commitments saved successfully!");
        await loadStats();
        return true;
      } else {
        triggerToast("Submission failed: " + data.error);
        return false;
      }
    } catch (err: any) {
      triggerToast("Error: " + err.message);
      return false;
    }
  };

  const handleEodSubmit = async (payload: any): Promise<boolean> => {
    try {
      const res = await fetch("/api/reports/eod", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        triggerToast("EOD outcomes registered successfully!");
        await loadStats();
        return true;
      } else {
        triggerToast("Submission failed: " + data.error);
        return false;
      }
    } catch (err: any) {
      triggerToast("Error: " + err.message);
      return false;
    }
  };

  const handleHiringSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !hiringForm.companyName ||
      !hiringForm.department ||
      !hiringForm.role ||
      !hiringForm.category ||
      !hiringForm.location ||
      !hiringForm.qty ||
      !hiringForm.jd ||
      !hiringForm.kra ||
      !hiringForm.kpi ||
      !hiringForm.qualification ||
      !hiringForm.salaryBudget ||
      !hiringForm.riskLevel ||
      !hiringForm.expectedOutput
    ) {
      triggerToast("Please fill in all 12 hiring requirement fields!");
      return;
    }
    try {
      const res = await fetch("/api/hiring", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(hiringForm)
      });
      const data = await res.json();
      if (data.success) {
         triggerToast("Hiring requisition registered at Stage 1 (Dept Head Desk)!");
         setHiringForm({
           companyName: "Acolyte Group of Companies",
           department: "Sales",
           role: "",
           category: "Staff",
           location: "",
           qty: 1,
           jd: "",
           kra: "",
           kpi: "",
           qualification: "",
           salaryBudget: "",
           riskLevel: "Low",
           expectedOutput: "",
         });
        toggleModal("hiring", false);
        await loadRequisitions();
        await loadStats();
      } else {
        triggerToast("Requisition failed: " + data.error);
      }
    } catch (err) {
      triggerToast("Network/API error saving requisition");
    }
  };

  const handleApproveRequisition = async (
    id: string,
    nextStatus: string,
    remarks: string,
    sourcingBudget?: string,
    postingPlatform?: string,
    postingDuration?: number
  ) => {
    try {
      const res = await fetch("/api/hiring", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          status: nextStatus,
          remarks,
          sourcingBudget,
          postingPlatform,
          postingDuration
        })
      });
      const data = await res.json();
      if (data.success) {
        if (nextStatus === "Pending Owner Approval") {
          triggerToast("✅ Budget cleared by Accounts! Forwarded to Owner for final approval.");
        } else if (nextStatus === "Approved — Pending HR Post") {
          triggerToast("✅ Approved by Owner! HR can now post the job vacancy.");
        } else if (nextStatus === "Job Posted") {
          triggerToast("🎉 Job vacancy POSTED by HR! Application link is now live.");
          await loadPostedJobs();
        } else if (nextStatus === "Rejected") {
          triggerToast("Requisition REJECTED.");
        } else if (nextStatus === "Hold") {
          triggerToast("Requisition put on HOLD.");
        }
        await loadRequisitions();
        await loadStats();
      } else {
        triggerToast("Action failed: " + data.error);
      }
    } catch (err) {
      triggerToast("API error executing workflow state transition");
    }
  };

  const handleJobTitleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVal = e.target.value;
    
    if (!newVal) {
      setJobForm({
        title: "",
        companyName: "",
        departmentName: "",
        location: "",
        category: "" as any,
        qualification: "",
        experience: "",
        salaryRange: "",
        description: "",
        applicationLink: "",
        source: "" as any,
        requisitionId: ""
      });
      return;
    }

    // Check if newVal matches any approved pending requisition
    const matchedReq = requisitions.find(
      r => r.status === "Approved — Pending HR Post" && r.role.trim().toLowerCase() === newVal.trim().toLowerCase()
    );
    
    if (matchedReq) {
      const expMin = matchedReq.experience?.min || 0;
      const expMax = matchedReq.experience?.max || 0;
      const expString = (expMin === 0 && expMax === 0)
        ? "Fresher"
        : expMin === expMax
          ? `${expMin} Years`
          : `${expMin}-${expMax} Years`;

      const budgetMin = matchedReq.budget?.min || 0;
      const budgetMax = matchedReq.budget?.max || 0;
      const salaryString = (budgetMin === 0 && budgetMax === 0)
        ? "As per industry standards"
        : budgetMin === budgetMax
          ? `₹${budgetMin.toLocaleString("en-IN")} P.A.`
          : `₹${budgetMin.toLocaleString("en-IN")} - ₹${budgetMax.toLocaleString("en-IN")} P.A.`;

      setJobForm({
        title: matchedReq.role,
        companyName: matchedReq.companyName || "",
        departmentName: matchedReq.department || "",
        location: matchedReq.location || "",
        category: matchedReq.category || "" as any,
        qualification: matchedReq.qualification || "",
        experience: expString,
        salaryRange: salaryString,
        description: `Role: ${matchedReq.role}\nDepartment: ${matchedReq.department}\nJob Category: ${matchedReq.category}\nJD: ${matchedReq.jd}\nKRA: ${matchedReq.kra}\nKPI: ${matchedReq.kpi}\nQualification: ${matchedReq.qualification}`,
        applicationLink: "",
        source: "Indeed",
        requisitionId: matchedReq.id
      });
    } else {
      // Just update the title, clear requisitionId since it's custom
      setJobForm(prev => ({
        ...prev,
        title: newVal,
        requisitionId: ""
      }));
    }
  };

  const handlePostJobSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jobForm.title || !jobForm.companyName || !jobForm.departmentName || !jobForm.location || !jobForm.description) {
      triggerToast("Please fill in all required job fields!");
      return;
    }
    try {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: jobForm.title,
          companyId: jobForm.companyName,
          departmentId: jobForm.departmentName,
          location: jobForm.location,
          category: jobForm.category,
          qualification: jobForm.qualification,
          experience: jobForm.experience,
          salaryRange: jobForm.salaryRange,
          description: jobForm.description,
          applicationLink: jobForm.applicationLink,
          source: jobForm.source,
          requisitionId: jobForm.requisitionId,
        }),
      });
      const data = await res.json();
      if (data.success) {
        triggerToast("Module 3 Job Posted! Share link generated and copied automatically.");
        if (data.data?.shareableLink) {
          try {
            navigator.clipboard.writeText(data.data.shareableLink);
          } catch (e) { }
        }
        setJobForm({
          title: "",
          companyName: "",
          departmentName: "",
          location: "",
          category: "" as any,
          qualification: "",
          experience: "",
          salaryRange: "",
          description: "",
          applicationLink: "",
          source: "" as any,
          requisitionId: ""
        });
        toggleModal("job", false);
        await loadPostedJobs();
        await loadRequisitions();
        await loadStats();
      } else {
        triggerToast("Failed to post: " + data.error);
      }
    } catch (err) {
      triggerToast("Error posting vacancy");
    }
  };

  const handleAddCandidateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!candForm.name || !candForm.email) {
      triggerToast("Please fill in candidate details");
      return;
    }
    try {
      const res = await fetch("/api/candidates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId: candForm.jobId || undefined,
          name: candForm.name,
          email: candForm.email,
          mobile: candForm.mobile,
          address: "Not Provided",
          qualification: candForm.qualification || "Graduate",
          experience: candForm.experience || "2 yrs",
          currentSalary: candForm.currentSalary || "Not Disclosed",
          expectedSalary: candForm.expectedSalary || "Negotiable",
          noticePeriod: candForm.noticePeriod || "Immediate",
          currentRound: 1,
          status: "Pending",
          riskAnswers: {
            sideBusiness: candForm.sideBusiness ? "Yes" : "No",
            loanPressure: candForm.loanPressure ? "Yes" : "No",
            courtCase: candForm.legalMatter ? "Yes" : "No",
            backgroundVerification: candForm.bgvAgreement ? "Yes" : "No",
            confidentialityAgreement: candForm.dataConfidentiality ? "Yes" : "No",
            targetWork: "Yes",
            fieldWork: "Yes"
          }
        }),
      });
      const data = await res.json();
      if (data.success) {
        triggerToast("Applicant added and sent for AI screening");
        setCandForm({
          name: "",
          mobile: "",
          email: "",
          experience: "",
          jobId: "",
          qualification: "",
          currentSalary: "",
          expectedSalary: "",
          noticePeriod: "",
          sideBusiness: false,
          loanPressure: false,
          legalMatter: false,
          bgvAgreement: true,
          dataConfidentiality: true
        });
        toggleModal("cand", false);
        await loadCandidates();
        await loadStats();
      } else {
        triggerToast("Failed: " + data.error);
      }
    } catch (err) {
      triggerToast("Error saving candidate");
    }
  };

  const handleScheduleInterviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!interviewForm.candidateId) {
      triggerToast("Please select a candidate");
      return;
    }
    try {
      const isOnline = interviewForm.mode === "Video Call";
      const link = isOnline ? `https://meet.acolyte.in/r${interviewForm.round}-${interviewForm.candidateId.slice(-6)}` : "In-Office (Offline)";
      
      const res = await fetch("/api/interviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidateId: interviewForm.candidateId,
          round: parseInt(interviewForm.round),
          scheduleTime: `${interviewForm.date}T${interviewForm.time}`,
          videoLink: link,
        }),
      });
      const data = await res.json();
      if (data.success) {
        triggerToast("Calendar invite sent. Interview scheduled!");
        toggleModal("interview", false);
        await loadInterviews();
        await loadStats();
      } else {
        triggerToast("Failed: " + data.error);
      }
    } catch (err) {
      triggerToast("Error scheduling");
    }
  };

  const handleGrievanceFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/grievances", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: grievanceForm.category,
          priority: grievanceForm.priority,
          anonymous: !grievanceForm.name,
          description: grievanceForm.description,
        }),
      });
      const data = await res.json();
      if (data.success) {
        triggerToast("Grievance filed successfully!");
        setGrievanceForm({ name: "", category: "Harassment", priority: "High", description: "" });
        toggleModal("grievance", false);
        await loadGrievances();
        await loadStats();
      } else {
        triggerToast("Failed: " + data.error);
      }
    } catch (err) {
      triggerToast("Grievance submission error");
    }
  };

  const handlePartnerSubmit = async (modalId: string, url: string, payload: any) => {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        triggerToast("Partner successfully added to network!");
        toggleModal(modalId, false);
        await loadAllData();
      } else {
        triggerToast("Submission failed: " + data.error);
      }
    } catch (err) {
      triggerToast("Network/API error saving partner details");
    }
  };

  const handleAlertResolve = async (alertId: string) => {
    try {
      const res = await fetch("/api/alerts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alertId, status: "Resolved" })
      });
      const data = await res.json();
      if (data.success) {
        triggerToast("Risk Alert marked resolved!");
        await loadRiskAlerts();
        await loadStats();
      } else {
        triggerToast("Failed: " + data.error);
      }
    } catch (err) {
      triggerToast("Error updating alert");
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-[#F4F5F7] flex flex-col justify-center items-center gap-4 select-none">
        <Loader2 className="w-10 h-10 text-[#714B67] animate-spin" />
        <span className="text-[10px] font-black tracking-widest text-slate-400 uppercase font-mono">Loading...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F5F7] dark:bg-gray-950 flex text-slate-800 dark:text-gray-100 relative font-sans overflow-hidden transition-colors duration-300">

      {/* Sidebar Component */}
      <DashboardSidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        stats={stats}
        user={{ ...session?.user, role: userRole }}
        triggerToast={triggerToast}
        toggleModal={toggleModal}
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
      />

      {/* Mobile Sidebar Backdrop overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Main Command Workspace */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">

        {/* Upper Header status bar */}
        <Topbar
          activeTabLabel={activeTab.replace("-", " ").toUpperCase()}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          user={session?.user}
          mobileMenuOpen={mobileMenuOpen}
          setMobileMenuOpen={setMobileMenuOpen}
        />

        {/* Tab Panel Body container */}
        <div className="flex-1 overflow-y-auto px-4 py-4 md:px-8 md:py-8 custom-scrollbar">

          {activeTab === "dashboard" && (
            <OwnerDashboard 
              stats={stats} 
              riskAlertList={riskAlertList} 
              onResolveAlert={handleAlertResolve} 
              onNavigateTab={setActiveTab} 
              triggerToast={triggerToast} 
              companies={allCompanies}
              selectedCompanyId={selectedCompanyId}
              onCompanyChange={setSelectedCompanyId}
            />
          )}

          {activeTab === "hr-dash" && (
            <HrDashboard
              stats={stats}
              candidates={candidates}
              interviews={interviews}
              onNavigateTab={setActiveTab}
            />
          )}

          {/* ESS Panels */}
          {activeTab === "ess-dashboard" && (
            <ESSDashboard user={session?.user} triggerToast={triggerToast} setActiveTab={setActiveTab} toggleModal={toggleModal} stats={stats} />
          )}
          {activeTab === "ess-leaves" && (
            <ESSLeaves user={session?.user} triggerToast={triggerToast} stats={stats} />
          )}
          {activeTab === "ess-payroll" && (
            <ESSPayroll user={session?.user} triggerToast={triggerToast} />
          )}
          {activeTab === "ess-expenses" && (
            <ESSExpenses user={session?.user} triggerToast={triggerToast} />
          )}
          {activeTab === "asset-request" && (
            <AssetRequestLogs sessionUser={session?.user} triggerToast={triggerToast} />
          )}

          {activeTab === "dept-dash" && (
            <DepartmentDashboard
              stats={stats}
              onNavigateTab={setActiveTab}
            />
          )}

          {activeTab === "hiring" && (
            <HiringApproval
              requisitions={requisitions}
              jobs={jobs}
              onApproveRequisition={handleApproveRequisition}
              toggleModal={toggleModal}
              triggerToast={triggerToast}
              userRole={userRole}
            />
          )}

          {activeTab === "jobs" && (
            <JobPostings
              jobs={jobs}
              toggleModal={toggleModal}
              triggerToast={triggerToast}
            />
          )}

          {activeTab === "hr-leads" && (
            <HrLeads
              candidates={candidates}
              jobs={jobs}
              triggerToast={triggerToast}
              toggleModal={toggleModal}
            />
          )}

          {activeTab === "employees" && (
            <EmployeeDirectory
              userRole={userRole}
              triggerToast={triggerToast}
              sessionUser={session?.user}
            />
          )}

          {activeTab === "bda-directory" && (
            <BDADirectory
              userRole={userRole}
              triggerToast={triggerToast}
              sessionUser={session?.user}
            />
          )}

          {activeTab === "assets-registry" && (
            <AssetsRegistry
              userRole={userRole}
              triggerToast={triggerToast}
              sessionUser={session?.user}
            />
          )}

          {activeTab === "screening" && (
            <AiScreening
              selectedCandidate={selectedCandidate}
              triggerToast={triggerToast}
              onCandidateUpdated={loadCandidates}
            />
          )}

          {activeTab === "interviews" && (
            <InterviewsQueue
              triggerToast={triggerToast}
            />
          )}

          {activeTab === "verification" && (
            <VerificationChecklist
              selectedCandidate={selectedCandidate}
              triggerToast={triggerToast}
              onCandidateUpdated={loadCandidates}
            />
          )}

          {activeTab === "onboarding" && (
            <OnboardingRoadmap
              selectedCandidate={selectedCandidate}
              triggerToast={triggerToast}
              toggleModal={toggleModal}
            />
          )}

          {activeTab === "training" && (
            <TrainingClassroom
              toggleModal={toggleModal}
              triggerToast={triggerToast}
            />
          )}

          {activeTab === "probation" && (
            <ProbationEvaluation
              triggerToast={triggerToast}
              onViewWorkReport={(employeeId: string) => {
                setPreselectedWorkReportUserId(employeeId);
                setActiveTab("performance");
              }}
            />
          )}

          {activeTab === "attendance" && (
            <DailyCommitments
              sessionUser={session?.user}
              stats={stats}
              handleAttendancePunch={handleAttendancePunch}
              handleSodSubmit={handleSodSubmit}
              handleEodSubmit={handleEodSubmit}
            />
          )}

          {activeTab === "tasks" && (
            <KanbanBoard />
          )}

          {activeTab === "performance" && (
            <PerformanceCompliance
              sessionUser={session?.user}
              preselectedUserId={preselectedWorkReportUserId}
              clearPreselectedUserId={() => setPreselectedWorkReportUserId("")}
            />
          )}

          {activeTab === "field-visit" && (
            <FieldVisitLogs sessionUser={session?.user} triggerToast={triggerToast} />
          )}

          {activeTab === "leave-request" && (
            <LeaveRequestTab sessionUser={session?.user} />
          )}

          {activeTab === "associates" && (
            <BusinessAssociates
              toggleModal={toggleModal}
              triggerToast={triggerToast}
            />
          )}

          {activeTab === "vendors" && (
            <VendorOperations
              toggleModal={toggleModal}
              triggerToast={triggerToast}
            />
          )}

          {activeTab === "franchise" && (
            <FranchiseTerritories
              toggleModal={toggleModal}
              triggerToast={triggerToast}
            />
          )}

          {activeTab === "grievance" && (
            <GrievanceResolution
              toggleModal={toggleModal}
              triggerToast={triggerToast}
            />
          )}

          {activeTab === "risks" && (
            <SystemRiskAlerts
              riskAlertList={riskAlertList}
              onResolveAlert={handleAlertResolve}
              triggerToast={triggerToast}
              toggleModal={toggleModal}
            />
          )}

          {activeTab === "exit" && (
            <ExitSeparation
              sessionUser={session?.user}
              triggerToast={triggerToast}
            />
          )}

        </div>
      </main>

      {/* Floating Toast Notification */}
      {toastShow && (
        <div className="fixed bottom-6 right-6 z-[9999] bg-[#714B67] text-white px-5 py-3.5 rounded-lg shadow-2xl flex items-center justify-between gap-4 animate-slideIn">
          <span className="text-xs font-bold font-mono tracking-wide">{toastMsg}</span>
          <button onClick={() => setToastShow(false)} className="text-slate-200 hover:text-white"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* MODAL 1: HIRING REQUISITION FORM */}
      {modals.hiring && (
        <HiringRequisitionModal
          onClose={() => toggleModal("hiring", false)}
          triggerToast={triggerToast}
          userCompany={(session?.user as any)?.companyName}
          userDepartment={(session?.user as any)?.department}
        />
      )}

      {/* MODAL 2: POST JOB VACANCY */}
      {modals.job && (
        <div className="fixed inset-0 bg-[#070810]/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white border border-slate-200 w-full max-w-2xl rounded-xl p-6 relative shadow-2xl text-slate-800 max-h-[85vh] overflow-y-auto">
            <button className="absolute top-4 right-4 text-slate-400 hover:text-slate-600" onClick={() => toggleModal("job", false)}><X className="w-5 h-5" /></button>
            <h3 className="text-sm font-black text-[#714B67] uppercase tracking-wider mb-6">MODULE-3: Create Shareable Job Vacancy Link</h3>

            <form onSubmit={handlePostJobSubmit} className="space-y-4 text-xs font-semibold text-slate-600">

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] uppercase font-black text-slate-500 font-mono tracking-widest">1. Job Title</label>
                  <input
                    list="vacancy-options"
                    className="w-full bg-white border border-slate-300 rounded p-2.5 text-slate-900 mt-1 focus:outline-none focus:border-[#714B67]"
                    placeholder="e.g. BDA Executive"
                    value={jobForm.title}
                    onChange={handleJobTitleInputChange}
                    required
                  />
                  <datalist id="vacancy-options">
                    {requisitions
                      .filter(r => r.status === "Approved — Pending HR Post")
                      .map(r => (
                        <option key={r.id} value={r.role}>
                          {r.companyName || "Acolyte"} - {r.department}
                        </option>
                      ))
                    }
                  </datalist>
                </div>
                <div>
                  <label className="text-[10px] uppercase font-black text-slate-500 font-mono tracking-widest">2. Company</label>
                  <input
                    className="w-full bg-white border border-slate-300 rounded p-2.5 text-slate-900 mt-1 focus:outline-none focus:border-[#714B67]"
                    placeholder="e.g. Acolyte Group of Companies"
                    value={jobForm.companyName}
                    onChange={e => setJobForm({ ...jobForm, companyName: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] uppercase font-black text-slate-500 font-mono tracking-widest">3. Department</label>
                  <select
                    className="w-full bg-white border border-slate-300 rounded p-2.5 text-slate-750 mt-1 focus:outline-none focus:border-[#714B67]"
                    value={jobForm.departmentName}
                    onChange={e => setJobForm({ ...jobForm, departmentName: e.target.value })}
                    required
                  >
                    <option value="">-- Select Department --</option>
                    <option value="Sales">Sales</option>
                    <option value="Accounts">Accounts</option>
                    <option value="HR">HR</option>
                    <option value="Operations">Operations</option>
                    <option value="IT">IT</option>
                    <option value="Marketing">Marketing</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] uppercase font-black text-slate-500 font-mono tracking-widest">4. Location</label>
                  <input
                    className="w-full bg-white border border-slate-300 rounded p-2.5 text-slate-900 mt-1 focus:outline-none focus:border-[#714B67]"
                    placeholder="e.g. Jaipur Office"
                    value={jobForm.location}
                    onChange={e => setJobForm({ ...jobForm, location: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] uppercase font-black text-slate-500 font-mono tracking-widest">5. Category</label>
                  <select
                    className="w-full bg-white border border-slate-300 rounded p-2.5 text-slate-750 mt-1 focus:outline-none focus:border-[#714B67]"
                    value={jobForm.category}
                    onChange={e => setJobForm({ ...jobForm, category: e.target.value as any })}
                    required
                  >
                    <option value="">-- Select Category --</option>
                    <option value="Staff">Staff</option>
                    <option value="Associate">Associate</option>
                    <option value="Vendor">Vendor</option>
                    <option value="Franchise">Franchise</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] uppercase font-black text-slate-500 font-mono tracking-widest">6. Qualification Required</label>
                  <input
                    className="w-full bg-white border border-slate-300 rounded p-2.5 text-slate-900 mt-1 focus:outline-none focus:border-[#714B67]"
                    placeholder="e.g. MBA / B.Tech / Graduate"
                    value={jobForm.qualification}
                    onChange={e => setJobForm({ ...jobForm, qualification: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] uppercase font-black text-slate-500 font-mono tracking-widest">7. Experience Required</label>
                  <input
                    className="w-full bg-white border border-slate-300 rounded p-2.5 text-slate-900 mt-1 focus:outline-none focus:border-[#714B67]"
                    placeholder="e.g. 1-3 Years"
                    value={jobForm.experience}
                    onChange={e => setJobForm({ ...jobForm, experience: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-black text-slate-500 font-mono tracking-widest">8. Salary Range / Payout P.A.</label>
                  <input
                    className="w-full bg-white border border-slate-300 rounded p-2.5 text-slate-900 mt-1 focus:outline-none focus:border-[#714B67]"
                    placeholder="e.g. ₹3,50,000 - ₹5,00,000"
                    value={jobForm.salaryRange}
                    onChange={e => setJobForm({ ...jobForm, salaryRange: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] uppercase font-black text-slate-500 font-mono tracking-widest">10. Software Form Link</label>
                  <input
                    className="w-full bg-slate-100 border border-slate-300 rounded p-2.5 text-slate-500 mt-1 focus:outline-none cursor-not-allowed font-mono"
                    value="System Auto-Generated Form"
                    disabled
                  />
                  <p className="text-[9px] text-[#714B67] mt-1 font-bold">✓ 3-Step Risk Profiling & Document Upload form active</p>
                </div>
                <div>
                  <label className="text-[10px] uppercase font-black text-slate-500 font-mono tracking-widest">11. Source Linkage</label>
                  <select
                    className="w-full bg-white border border-slate-300 rounded p-2.5 text-slate-750 mt-1 focus:outline-none focus:border-[#714B67]"
                    value={jobForm.source}
                    onChange={e => setJobForm({ ...jobForm, source: e.target.value as any })}
                    required
                  >
                    <option value="">-- Select Source --</option>
                    <option value="Indeed">Indeed</option>
                    <option value="Naukri">Naukri</option>
                    <option value="WhatsApp">WhatsApp</option>
                    <option value="Walk-in">Walk-in</option>
                    <option value="Referral">Referral</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase font-black text-slate-500 font-mono tracking-widest">9. Job Description (JD)</label>
                <textarea
                  className="w-full bg-white border border-slate-300 rounded p-2.5 text-slate-900 mt-1 h-24 focus:outline-none focus:border-[#714B67] leading-relaxed"
                  placeholder="Explain candidate responsibility, targets, timing..."
                  value={jobForm.description}
                  onChange={e => setJobForm({ ...jobForm, description: e.target.value })}
                  required
                />
              </div>

              <button type="submit" className="w-full bg-[#714B67] hover:bg-[#5F3F56] py-3 rounded text-xs font-bold text-white transition-all shadow-md mt-4 flex items-center justify-center gap-1.5">
                Generate Live Shareable Link & Post Job
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: ADD CANDIDATE */}
      {modals.cand && (
        <div className="fixed inset-0 bg-[#070810]/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white border border-slate-200 w-full max-w-lg rounded-xl p-6 relative shadow-2xl text-slate-800 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <button className="absolute top-4 right-4 text-slate-400 hover:text-slate-600" onClick={() => toggleModal("cand", false)}><X className="w-5 h-5" /></button>
            <h3 className="text-sm font-black text-[#714B67] uppercase tracking-wider mb-6">Add Candidate Profile</h3>
            <form onSubmit={handleAddCandidateSubmit} className="space-y-4 text-xs font-semibold text-slate-600">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] uppercase font-black text-slate-500 font-mono tracking-widest">Full Name</label>
                  <input className="w-full bg-white border border-slate-300 rounded p-2.5 text-slate-900 mt-1 focus:outline-none focus:border-[#714B67]" value={candForm.name} onChange={e => setCandForm({ ...candForm, name: e.target.value })} required />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-black text-slate-500 font-mono tracking-widest">Mobile Number</label>
                  <input className="w-full bg-white border border-slate-300 rounded p-2.5 text-slate-900 mt-1 font-mono focus:outline-none focus:border-[#714B67]" value={candForm.mobile} onChange={e => setCandForm({ ...candForm, mobile: e.target.value })} required />
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase font-black text-slate-500 font-mono tracking-widest">Email Address</label>
                <input className="w-full bg-white border border-slate-300 rounded p-2.5 text-slate-900 mt-1 font-mono focus:outline-none focus:border-[#714B67]" type="email" value={candForm.email} onChange={e => setCandForm({ ...candForm, email: e.target.value })} required />
              </div>

              <div>
                <label className="text-[10px] uppercase font-black text-slate-500 font-mono tracking-widest">Select Applied Job Vacancy</label>
                <select
                  className="w-full bg-white border border-slate-300 rounded p-2.5 text-slate-700 mt-1 focus:outline-none focus:border-[#714B67]"
                  value={candForm.jobId}
                  onChange={e => setCandForm({ ...candForm, jobId: e.target.value })}
                >
                  <option value="">General Application (None)</option>
                  {jobs.filter(j => j.status === "active").map(job => (
                    <option key={job.id} value={job.id}>{job.title} ({job.company?.name || "Acolyte"})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] uppercase font-black text-slate-500 font-mono tracking-widest">Qualifications</label>
                  <input className="w-full bg-white border border-slate-300 rounded p-2.5 text-slate-900 mt-1 focus:outline-none focus:border-[#714B67]" placeholder="e.g. B.Tech / MBA / Graduate" value={candForm.qualification} onChange={e => setCandForm({ ...candForm, qualification: e.target.value })} required />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-black text-slate-500 font-mono tracking-widest">Work Experience Details</label>
                  <input className="w-full bg-white border border-slate-300 rounded p-2.5 text-slate-900 mt-1 focus:outline-none focus:border-[#714B67]" placeholder="e.g. 2 Years at XYZ Ltd." value={candForm.experience} onChange={e => setCandForm({ ...candForm, experience: e.target.value })} required />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] uppercase font-black text-slate-500 font-mono tracking-widest">Current Salary</label>
                  <input className="w-full bg-white border border-slate-300 rounded p-2.5 text-slate-900 mt-1 focus:outline-none focus:border-[#714B67]" placeholder="e.g. 30,000 / Not Disclosed" value={candForm.currentSalary} onChange={e => setCandForm({ ...candForm, currentSalary: e.target.value })} required />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-black text-slate-500 font-mono tracking-widest">Expected Salary</label>
                  <input className="w-full bg-white border border-slate-300 rounded p-2.5 text-slate-900 mt-1 focus:outline-none focus:border-[#714B67]" placeholder="e.g. 40,000 / Negotiable" value={candForm.expectedSalary} onChange={e => setCandForm({ ...candForm, expectedSalary: e.target.value })} required />
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase font-black text-slate-500 font-mono tracking-widest">Notice Period</label>
                <input className="w-full bg-white border border-slate-300 rounded p-2.5 text-slate-900 mt-1 focus:outline-none focus:border-[#714B67]" placeholder="e.g. Immediate / 30 Days" value={candForm.noticePeriod} onChange={e => setCandForm({ ...candForm, noticePeriod: e.target.value })} required />
              </div>

              <div className="p-3.5 bg-slate-50 rounded-lg space-y-2 border border-slate-200">
                <h4 className="text-[9px] uppercase font-black tracking-widest text-[#714B67] font-mono">AI Risks Vetting Pre-screener</h4>
                <div className="space-y-1.5 font-bold text-slate-700">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={candForm.sideBusiness} onChange={e => setCandForm({ ...candForm, sideBusiness: e.target.checked })} />
                    <span>Involved in side business / parallel payouts?</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={candForm.loanPressure} onChange={e => setCandForm({ ...candForm, loanPressure: e.target.checked })} />
                    <span>Severe debt / loan pressure flagged?</span>
                  </label>
                </div>
              </div>
              <button type="submit" className="w-full bg-[#714B67] hover:bg-[#5F3F56] py-3 rounded text-xs font-bold text-white transition-all shadow-md mt-4">Save and Screen</button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: SCHEDULE INTERVIEW */}
      {modals.interview && (
        <div className="fixed inset-0 bg-[#070810]/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white border border-slate-200 w-full max-w-lg rounded-xl p-6 relative shadow-2xl text-slate-800 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <button className="absolute top-4 right-4 text-slate-400 hover:text-slate-600" onClick={() => toggleModal("interview", false)}><X className="w-5 h-5" /></button>
            <h3 className="text-sm font-black text-[#714B67] uppercase tracking-wider mb-6">Schedule Vetting Interview</h3>
            <form onSubmit={handleScheduleInterviewSubmit} className="space-y-4 text-xs font-semibold text-slate-600">
              <div>
                <label className="text-[10px] uppercase font-black text-slate-500 font-mono tracking-widest">Candidate Profile</label>
                <select className="w-full bg-white border border-slate-300 rounded p-2.5 text-slate-700 mt-1 focus:outline-none focus:border-[#714B67]" value={interviewForm.candidateId} onChange={e => setInterviewForm({ ...interviewForm, candidateId: e.target.value })} required>
                  <option value="">Select Candidate...</option>
                  {candidates.map((c, i) => (
                    <option key={i} value={c.id}>{c.name} ({c.role || "DSM"})</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] uppercase font-black text-slate-500 font-mono tracking-widest">Round Number</label>
                  <select className="w-full bg-white border border-slate-300 rounded p-2.5 text-slate-700 mt-1 focus:outline-none focus:border-[#714B67]" value={interviewForm.round} onChange={e => setInterviewForm({ ...interviewForm, round: e.target.value })}>
                    <option>1</option>
                    <option>2</option>
                    <option>3</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] uppercase font-black text-slate-500 font-mono tracking-widest">Schedule Date</label>
                  <input className="w-full bg-white border border-slate-300 rounded p-2.5 text-slate-900 mt-1 font-mono focus:outline-none focus:border-[#714B67]" type="date" value={interviewForm.date} onChange={e => setInterviewForm({ ...interviewForm, date: e.target.value })} required />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-black text-slate-500 font-mono tracking-widest">Time</label>
                  <input className="w-full bg-white border border-slate-300 rounded p-2.5 text-slate-900 mt-1 font-mono focus:outline-none focus:border-[#714B67]" type="time" value={interviewForm.time} onChange={e => setInterviewForm({ ...interviewForm, time: e.target.value })} required />
                </div>
              </div>
              <div>
                <label className="text-[10px] uppercase font-black text-slate-500 font-mono tracking-widest">Interview Mode</label>
                <select className="w-full bg-white border border-slate-300 rounded p-2.5 text-slate-700 mt-1 focus:outline-none focus:border-[#714B67]" value={interviewForm.mode} onChange={e => setInterviewForm({ ...interviewForm, mode: e.target.value })}>
                  <option value="Video Call">Online (Video Call)</option>
                  <option value="In-Office">In-Office (Offline)</option>
                </select>
              </div>
              <button type="submit" className="w-full bg-[#714B67] hover:bg-[#5F3F56] py-3 rounded text-xs font-bold text-white transition-all shadow-md mt-4">Send Calendar Invite</button>
            </form>
          </div>
        </div>
      )}


      {/* MODAL 6: FILE CONFIDENTIAL GRIEVANCE */}
      {modals.grievance && (
        <div className="fixed inset-0 bg-[#070810]/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white border border-slate-200 w-full max-w-lg rounded-xl p-6 relative shadow-2xl text-slate-800 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <button className="absolute top-4 right-4 text-slate-400 hover:text-slate-600" onClick={() => toggleModal("grievance", false)}><X className="w-5 h-5" /></button>
            <h3 className="text-sm font-black text-[#714B67] uppercase tracking-wider mb-6">Anonymous Grievance Filing</h3>
            <form onSubmit={handleGrievanceFormSubmit} className="space-y-4 text-xs font-semibold text-slate-600">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] uppercase font-black text-slate-500 font-mono tracking-widest">Confidential category</label>
                  <select className="w-full bg-white border border-slate-300 rounded p-2.5 text-slate-700 mt-1 focus:outline-none focus:border-[#714B67]" value={grievanceForm.category} onChange={e => setGrievanceForm({ ...grievanceForm, category: e.target.value })}>
                    <option>Harassment</option>
                    <option>Financial Anomaly</option>
                    <option>Asset Diversion</option>
                    <option>Branding Infringement</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] uppercase font-black text-slate-500 font-mono tracking-widest">Urgency level</label>
                  <select className="w-full bg-white border border-slate-300 rounded p-2.5 text-slate-700 mt-1 focus:outline-none focus:border-[#714B67]" value={grievanceForm.priority} onChange={e => setGrievanceForm({ ...grievanceForm, priority: e.target.value })}>
                    <option>High</option>
                    <option>Normal</option>
                    <option>Low</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[10px] uppercase font-black text-slate-500 font-mono tracking-widest">Grievance / Incident Rationale</label>
                <textarea className="w-full bg-white border border-slate-300 rounded p-2.5 text-slate-900 mt-1 h-24 focus:outline-none focus:border-[#714B67]" placeholder="Confidential details..." value={grievanceForm.description} onChange={e => setGrievanceForm({ ...grievanceForm, description: e.target.value })} required />
              </div>
              <button type="submit" className="w-full bg-[#714B67] hover:bg-[#5F3F56] py-3 rounded text-xs font-bold text-white transition-all shadow-md mt-4">File Anonymous Grievance</button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 7: ADD BUSINESS ASSOCIATE */}
      {modals.assoc && (
        <div className="fixed inset-0 bg-[#070810]/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white border border-slate-200 w-full max-w-lg rounded-xl p-6 relative shadow-2xl text-slate-800 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <button className="absolute top-4 right-4 text-slate-400 hover:text-slate-600" onClick={() => toggleModal("assoc", false)}><X className="w-5 h-5" /></button>
            <h3 className="text-sm font-black text-[#714B67] uppercase tracking-wider mb-6">Register Business Associate</h3>
            <form onSubmit={(e) => {
              e.preventDefault();
              handlePartnerSubmit("assoc", "/api/associates", {
                name: assocForm.name,
                mobile: assocForm.mobile,
                assignedTerritory: assocForm.territory,
                status: "active"
              });
            }} className="space-y-4 text-xs font-semibold text-slate-600">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] uppercase font-black text-slate-500 font-mono tracking-widest">Associate Name</label>
                  <input className="w-full bg-white border border-slate-300 rounded p-2.5 text-slate-900 mt-1 focus:outline-none focus:border-[#714B67]" value={assocForm.name} onChange={e => setAssocForm({ ...assocForm, name: e.target.value })} required />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-black text-slate-500 font-mono tracking-widest">Mobile Number</label>
                  <input className="w-full bg-white border border-slate-300 rounded p-2.5 text-slate-900 mt-1 font-mono focus:outline-none focus:border-[#714B67]" value={assocForm.mobile} onChange={e => setAssocForm({ ...assocForm, mobile: e.target.value })} required />
                </div>
              </div>
              <div>
                <label className="text-[10px] uppercase font-black text-slate-500 font-mono tracking-widest">Assigned Zone / Territory</label>
                <input className="w-full bg-white border border-slate-300 rounded p-2.5 text-slate-900 mt-1 focus:outline-none focus:border-[#714B67]" placeholder="e.g. Agra North" value={assocForm.territory} onChange={e => setAssocForm({ ...assocForm, territory: e.target.value })} required />
              </div>
              <button type="submit" className="w-full bg-[#714B67] hover:bg-[#5F3F56] py-3 rounded text-xs font-bold text-white transition-all shadow-md mt-4">Save Associate Channel</button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 8: REGISTER VENDOR CONTRACT */}
      {modals.vendor && (
        <div className="fixed inset-0 bg-[#070810]/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white border border-slate-200 w-full max-w-lg rounded-xl p-6 relative shadow-2xl text-slate-800 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <button className="absolute top-4 right-4 text-slate-400 hover:text-slate-600" onClick={() => toggleModal("vendor", false)}><X className="w-5 h-5" /></button>
            <h3 className="text-sm font-black text-[#714B67] uppercase tracking-wider mb-6">Register Contractor Vendor</h3>
            <form onSubmit={(e) => {
              e.preventDefault();
              handlePartnerSubmit("vendor", "/api/vendors", {
                name: vendorForm.name,
                category: vendorForm.category,
                panGst: vendorForm.panGst,
                status: "active"
              });
            }} className="space-y-4 text-xs font-semibold text-slate-600">
              <div>
                <label className="text-[10px] uppercase font-black text-slate-500 font-mono tracking-widest">Vendor Company Name</label>
                <input className="w-full bg-white border border-slate-300 rounded p-2.5 text-slate-900 mt-1 focus:outline-none focus:border-[#714B67]" value={vendorForm.name} onChange={e => setVendorForm({ ...vendorForm, name: e.target.value })} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] uppercase font-black text-slate-500 font-mono tracking-widest">Division Category</label>
                  <select className="w-full bg-white border border-slate-300 rounded p-2.5 text-slate-700 mt-1 focus:outline-none focus:border-[#714B67]" value={vendorForm.category} onChange={e => setVendorForm({ ...vendorForm, category: e.target.value })}>
                    <option>IT Vendor</option>
                    <option>Office Supply</option>
                    <option>Legal Service</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] uppercase font-black text-slate-500 font-mono tracking-widest">GST / PAN Record</label>
                  <input className="w-full bg-white border border-slate-300 rounded p-2.5 text-slate-900 mt-1 font-mono focus:outline-none focus:border-[#714B67]" placeholder="PAN/GST No" value={vendorForm.panGst} onChange={e => setVendorForm({ ...vendorForm, panGst: e.target.value })} required />
                </div>
              </div>
              <button type="submit" className="w-full bg-[#714B67] hover:bg-[#5F3F56] py-3 rounded text-xs font-bold text-white transition-all shadow-md mt-4">Save Vendor Partner</button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 9: REGISTER FRANCHISE OWNER */}
      {modals.franchise && (
        <div className="fixed inset-0 bg-[#070810]/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white border border-slate-200 w-full max-w-lg rounded-xl p-6 relative shadow-2xl text-slate-800 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <button className="absolute top-4 right-4 text-slate-400 hover:text-slate-600" onClick={() => toggleModal("franchise", false)}><X className="w-5 h-5" /></button>
            <h3 className="text-sm font-black text-[#714B67] uppercase tracking-wider mb-6">Register Franchise Partner</h3>
            <form onSubmit={(e) => {
              e.preventDefault();
              handlePartnerSubmit("franchise", "/api/franchises", {
                ownerName: franchiseForm.name,
                territoryZone: franchiseForm.territory,
                assignedBrand: franchiseForm.brand,
                status: "active"
              });
            }} className="space-y-4 text-xs font-semibold text-slate-600">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] uppercase font-black text-slate-500 font-mono tracking-widest">Owner Full Name</label>
                  <input className="w-full bg-white border border-slate-300 rounded p-2.5 text-slate-900 mt-1 focus:outline-none focus:border-[#714B67]" value={franchiseForm.name} onChange={e => setFranchiseForm({ ...franchiseForm, name: e.target.value })} required />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-black text-slate-500 font-mono tracking-widest">Territory Zone</label>
                  <input className="w-full bg-white border border-slate-300 rounded p-2.5 text-slate-900 mt-1 focus:outline-none focus:border-[#714B67]" placeholder="e.g. Zone A" value={franchiseForm.territory} onChange={e => setFranchiseForm({ ...franchiseForm, territory: e.target.value })} required />
                </div>
              </div>
              <button type="submit" className="w-full bg-[#714B67] hover:bg-[#5F3F56] py-3 rounded text-xs font-bold text-white transition-all shadow-md mt-4">Save Franchise Partner</button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 10: SOD MODAL */}
      {modals.sodModal && (
        <div className="fixed inset-0 bg-[#070810]/40 z-[90] flex items-center justify-center p-4 backdrop-blur-sm animate-fadeIn">
           <div className="bg-[#F4F5F7] w-full max-w-3xl max-h-[90vh] overflow-y-auto custom-scrollbar rounded-2xl shadow-2xl relative border border-slate-200">
              <button className="absolute top-6 right-6 text-slate-500 hover:text-slate-800 bg-white hover:bg-slate-100 rounded-full p-1.5 border shadow-sm z-10 transition-all" onClick={() => toggleModal("sodModal", false)}><X className="w-5 h-5" /></button>
              <div className="p-8">
                 <DailyCommitments 
                    sessionUser={session?.user} 
                    stats={stats} 
                    handleAttendancePunch={handleAttendancePunch}
                    formMode="sod"
                    handleSodSubmit={async (payload) => {
                      const success = await handleSodSubmit(payload);
                      if (success) toggleModal("sodModal", false);
                    }}
                    handleEodSubmit={handleEodSubmit}
                 />
              </div>
           </div>
        </div>
      )}

      {/* MODAL 11: EOD MODAL */}
      {modals.eodModal && (
        <div className="fixed inset-0 bg-[#070810]/40 z-[90] flex items-center justify-center p-4 backdrop-blur-sm animate-fadeIn">
           <div className="bg-[#F4F5F7] w-full max-w-3xl max-h-[90vh] overflow-y-auto custom-scrollbar rounded-2xl shadow-2xl relative border border-slate-200">
              <button className="absolute top-6 right-6 text-slate-500 hover:text-slate-800 bg-white hover:bg-slate-100 rounded-full p-1.5 border shadow-sm z-10 transition-all" onClick={() => toggleModal("eodModal", false)}><X className="w-5 h-5" /></button>
              <div className="p-8">
                 <DailyCommitments 
                    sessionUser={session?.user} 
                    stats={stats} 
                    handleAttendancePunch={handleAttendancePunch}
                    formMode="eod"
                    handleSodSubmit={handleSodSubmit}
                    handleEodSubmit={async (payload) => {
                      const success = await handleEodSubmit(payload);
                      if (success) toggleModal("eodModal", false);
                    }}
                 />
              </div>
           </div>
        </div>
      )}

    </div>
  );
}
