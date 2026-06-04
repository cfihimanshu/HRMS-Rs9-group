import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import {
  Plus,
  Copy,
  UserPlus,
  Cpu,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  ExternalLink,
  MessageSquare,
  PhoneCall,
  Send,
  Smartphone,
  TrendingUp,
  AlertTriangle,
  Heart,
  ShieldAlert,
  FileText,
  CheckSquare,
  Square,
  Search,
  Brain,
  ThumbsUp,
  ThumbsDown,
  RotateCcw,
  Sparkles,
  Video,
  Trash,
  Paperclip
} from "lucide-react";

interface RecruitmentProps {
  candidates: any[];
  selectedCandidate: any;
  setSelectedCandidate: (c: any) => void;
  jobs: any[];
  interviews: any[];
  toggleModal: (modalId: string, open: boolean) => void;
  triggerToast: (msg: string) => void;
  requisitions?: any[];
}

const getAttachmentUrl = (url: string) => {
  if (!url) return "";
  if (url.includes("/fl_attachment/")) {
    return url.replace("/fl_attachment/", "/");
  }
  return url;
};

export function HiringApproval({
  requisitions,
  onApproveRequisition,
  toggleModal,
  triggerToast,
  userRole
}: {
  requisitions: any[];
  onApproveRequisition: (id: string, nextStatus: string, remarks: string, budget?: string, platform?: string, postingDuration?: number) => void;
  toggleModal: (modalId: string, open: boolean) => void;
  triggerToast: (msg: string) => void;
  userRole?: string;
}) {
  const [activeTab, setActiveTab] = useState<string>("Manager");
  const [hasSetDefaultTab, setHasSetDefaultTab] = useState(false);
  const [expandedReq, setExpandedReq] = useState<string | null>(null);
  const [remarksInput, setRemarksInput] = useState<{ [key: string]: string }>({});
  const [budgetInput, setBudgetInput] = useState<{ [key: string]: string }>({});
  const [platformInput, setPlatformInput] = useState<{ [key: string]: string }>({});
  const [durationInput, setDurationInput] = useState<{ [key: string]: string }>({});

  const isHR = userRole === "HR Head" || userRole === "HR Executive" || userRole === "HR";
  const isAllowedRequisition = userRole === "Owner" || userRole === "Director" || userRole === "HR Head" || userRole === "Department Manager";
  const hrVisibleStatuses = ["Pending HR Sourcing Review", "Approved — Pending HR Post", "Job Posted"];
  const visibleRequisitions = isHR
    ? requisitions.filter((req) => hrVisibleStatuses.includes(req.status))
    : requisitions;

  const filteredRequisitions = visibleRequisitions.filter((req) => {
    if (userRole === "Accounts" && activeTab !== "Accounts") return false;
    if (activeTab === "HRSourcing") return req.status === "Pending HR Sourcing Review";
    if (activeTab === "Accounts") return req.status === "Pending Accounts Review";
    if (activeTab === "Owner") return req.status === "Pending Owner Approval";
    if (activeTab === "HRPosting") return req.status === "Approved — Pending HR Post" || req.status === "Job Posted";
    return true;
  });

  useEffect(() => {
    if (userRole && !hasSetDefaultTab) {
      if (userRole === "Accounts") {
        setActiveTab("Accounts");
      }
      setHasSetDefaultTab(true);
    }
  }, [userRole, hasSetDefaultTab]);

  useEffect(() => {
    if (isHR && activeTab !== "HRSourcing" && activeTab !== "HRPosting") {
      setActiveTab("HRSourcing");
    }
  }, [isHR, activeTab]);

  const handleRemarksChange = (reqId: string, val: string) => {
    setRemarksInput(prev => ({ ...prev, [reqId]: val }));
  };

  const handleBudgetChange = (reqId: string, val: string) => {
    setBudgetInput(prev => ({ ...prev, [reqId]: val }));
  };

  const handlePlatformChange = (reqId: string, val: string) => {
    setPlatformInput(prev => ({ ...prev, [reqId]: val }));
  };

  const handleDurationChange = (reqId: string, val: string) => {
    setDurationInput(prev => ({ ...prev, [reqId]: val }));
  };

  const stats = {
    pendingHRSourcing: requisitions.filter(r => r.status === "Pending HR Sourcing Review").length,
    pendingAccounts: requisitions.filter(r => r.status === "Pending Accounts Review").length,
    pendingOwner: requisitions.filter(r => r.status === "Pending Owner Approval").length,
    pendingHRPost: requisitions.filter(r => r.status === "Approved — Pending HR Post" || r.status === "Approved").length,
    posted: requisitions.filter(r => r.status === "Job Posted").length,
  };

  const statusColor = (status: string) => {
    if (status === "Job Posted") return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
    if (status === "Rejected") return "bg-rose-500/10 text-rose-600 border-rose-500/20";
    if (status === "Hold") return "bg-blue-500/10 text-blue-600 border-blue-500/20";
    if (status === "Approved — Pending HR Post" || status === "Approved") return "bg-violet-500/10 text-violet-600 border-violet-500/20";
    if (status === "Pending HR Sourcing Review") return "bg-fuchsia-500/10 text-fuchsia-600 border-fuchsia-500/20 animate-pulse";
    return "bg-amber-500/10 text-amber-600 border-amber-500/20 animate-pulse";
  };

  return (
    <div className="space-y-8 animate-fadeIn text-slate-800">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-slate-800">MODULE-2: Hiring Requisition Workflow</h1>
          <p className="text-xs text-slate-500 mt-1">Dept Manager → Accounts Budget Check → Owner Approval → HR Job Posting</p>
        </div>
        {isAllowedRequisition && (
          <button
            className="bg-[#714B67] hover:bg-[#5F3F56] px-4 py-2.5 rounded-lg text-xs font-bold text-white transition-all flex items-center gap-1.5 shadow"
            onClick={() => toggleModal("hiring", true)}
          >
            <Plus className="w-4 h-4" /> New Requisition
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "Pending HR Sourcing", val: stats.pendingHRSourcing, color: "fuchsia" },
          { label: "Pending Accounts", val: stats.pendingAccounts, color: "amber" },
          { label: "Pending Owner", val: stats.pendingOwner, color: "orange" },
          { label: "Pending HR Post", val: stats.pendingHRPost, color: "violet" },
          { label: "Job Posted", val: stats.posted, color: "emerald" },
        ].map((s, i) => (
          <div key={i} className={`bg-${s.color}-500/10 border border-${s.color}-500/20 p-4 rounded-xl shadow-sm`}>
            <div className={`text-[9px] font-black uppercase text-${s.color}-600 tracking-widest font-mono`}>{s.label}</div>
            <div className={`text-2xl font-black text-${s.color}-700 mt-1`}>{s.val}</div>
          </div>
        ))}
      </div>

      {/* Visual Flow */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 flex items-center justify-between gap-4 overflow-x-auto shadow-sm select-none">
        {[
          { step: 1, label: "Manager", desc: "Files Requisition + AI JD", color: "bg-slate-600" },
          { step: 2, label: "HR Sourcing", desc: "Sourcing Budget Add", color: "bg-fuchsia-600" },
          { step: 3, label: "Accounts", desc: "Budget Review & Clear", color: "bg-amber-600" },
          { step: 4, label: "Owner", desc: "Final Approve / Reject", color: "bg-[#714B67]" },
          { step: 5, label: "HR Posting", desc: "Posts Job Vacancy", color: "bg-emerald-600" },
        ].map((item, idx) => (
          <React.Fragment key={idx}>
            <div className="flex items-center gap-3 shrink-0">
              <div className={`w-8 h-8 rounded-full ${item.color} flex items-center justify-center font-bold text-white text-xs shadow-md`}>
                {item.step}
              </div>
              <div>
                <span className="block text-[10px] font-black text-slate-700 uppercase tracking-wider font-mono">{item.label}</span>
                <span className="block text-[8px] font-bold text-slate-400 font-mono mt-0.5">{item.desc}</span>
              </div>
            </div>
            {idx < 4 && <ArrowRight className="w-4 h-4 text-slate-350 shrink-0" />}
          </React.Fragment>
        ))}
      </div>

      {/* Desk Tabs */}
      <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 w-fit flex-wrap gap-1">
        {[
          { id: "Manager", label: "1. Dept Manager", available: !isHR },
          { id: "HRSourcing", label: "2. HR Sourcing", available: true },
          { id: "Accounts", label: "3. Accounts", available: !isHR },
          { id: "Owner", label: "4. Owner", available: !isHR },
          { id: "HRPosting", label: "5. HR Posting", available: true },
        ].map((tab) => {
          const isLocked = isHR && !["HRSourcing", "HRPosting"].includes(tab.id);
          return (
            <button
              key={tab.id}
              className={`px-4 py-2 rounded text-xs font-bold transition-all ${activeTab === tab.id
                ? "bg-[#714B67] text-white shadow-sm"
                : isLocked
                  ? "text-slate-400 bg-slate-100 cursor-not-allowed"
                  : "text-slate-500 hover:text-slate-800 hover:bg-slate-200/50"
                }`}
              onClick={() => !isLocked && setActiveTab(tab.id)}
              disabled={isLocked}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Requisition Cards */}
      <div className="space-y-4">
        {filteredRequisitions.map((req, idx) => {
          const isExpanded = expandedReq === req._id;
          const remarks = remarksInput[req._id] || "";
          const budget = budgetInput[req._id] || "";
          const platform = platformInput[req._id] || "Indeed";
          const duration = durationInput[req._id] || "";

          return (
            <div key={idx} className="bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-all overflow-hidden">

              {/* Card Header */}
              <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-black text-slate-800">{req.role}</span>
                    <span className="text-[9px] font-black tracking-widest px-2 py-0.5 rounded uppercase font-mono bg-slate-100 border border-slate-200 text-slate-600">
                      {req.category || "Staff"}
                    </span>
                    <span className={`text-[9px] font-black tracking-widest px-2 py-0.5 rounded border uppercase font-mono ${statusColor(req.status)}`}>
                      {req.status}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-500 font-bold font-mono flex items-center gap-1.5 flex-wrap">
                    <span>🏢 {req.companyName || "Acolyte Group"}</span>
                    <span>|</span>
                    <span>📂 {req.department}</span>
                    <span>|</span>
                    <span>👤 By {req.createdBy}</span>
                    <span>|</span>
                    <span className="text-[#714B67] bg-[#714B67]/5 px-1.5 py-0.5 rounded border border-[#714B67]/10 font-bold">
                      📅 Posted on: {req.createdAt ? new Date(req.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "N/A"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-6 shrink-0 font-mono text-xs">
                  <div>
                    <span className="block text-[8px] font-black uppercase text-slate-400 tracking-wider">Headcount</span>
                    <span className="block text-sm font-black text-[#714B67] mt-0.5">👤 {req.qty} Position(s)</span>
                  </div>
                  <div>
                    <span className="block text-[8px] font-black uppercase text-slate-400 tracking-wider">Salary Budget</span>
                    <span className="block text-sm font-black text-[#714B67] mt-0.5">
                      ₹{req.salaryBudget ? req.salaryBudget.toLocaleString("en-IN") : req.salaryRange} P.A.
                    </span>
                  </div>
                  <button
                    onClick={() => setExpandedReq(isExpanded ? null : req._id)}
                    className="bg-slate-100 hover:bg-slate-200 border border-slate-250 text-slate-700 px-3.5 py-1.5 rounded-lg text-[10px] font-black transition-all shadow-sm"
                  >
                    {isExpanded ? "Hide Details" : "View All Fields"}
                  </button>
                </div>
              </div>

              {/* Expanded Details */}
              {isExpanded && (
                <div className="px-5 pb-5 border-t border-slate-100 pt-5 bg-slate-50/50 space-y-6 text-xs animate-fadeIn">

                  {/* Fields Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-semibold text-slate-700">
                    {[
                      { label: "1. Company Name", val: req.companyName || "Acolyte Group" },
                      { label: "2. Department", val: req.department },
                      { label: "3. Role / Post", val: req.role },
                      { label: "4. Category", val: req.category || "Staff" },
                      { label: "5. Required Number", val: `${req.qty} Position(s)` },
                      { label: "10. Salary Budget P.A.", val: `₹${req.salaryBudget ? req.salaryBudget.toLocaleString("en-IN") : req.salaryRange}` },
                      { label: "11. Risk Level", val: req.riskLevel || "Low" },
                      { label: "12. Expected Output", val: req.expectedOutput || "Not Specified" },
                      { label: "13. Qualification Required", val: req.qualification || "Not Specified" },
                      { label: "14. Job Location", val: req.location || "Not Specified" },
                    ].map((f, i) => (
                      <div key={i}>
                        <span className="block text-[9px] font-black uppercase tracking-wider text-slate-400 font-mono">{f.label}</span>
                        <span className="block text-slate-900 mt-1">{f.val}</span>
                      </div>
                    ))}
                  </div>

                  {/* JD/KRA/KPI */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      { label: "6. Job Description (JD)", val: req.jd },
                      { label: "7. Key Result Areas (KRA)", val: req.kra },
                      { label: "8. Key Perf. Indicators (KPI)", val: req.kpi },
                    ].map((f, i) => (
                      <div key={i} className="bg-white border border-slate-200 p-3.5 rounded-xl">
                        <span className="block text-[9px] font-black uppercase tracking-wider text-[#714B67] font-mono">{f.label}</span>
                        <p className="mt-2 text-slate-600 leading-relaxed font-medium whitespace-pre-line">{f.val}</p>
                      </div>
                    ))}
                  </div>

                  {/* Remarks Audit Trail */}
                  <div className="bg-slate-100 border border-slate-200 rounded-xl p-4 space-y-2">
                    <span className="block text-[9px] font-black uppercase tracking-wider text-slate-500 font-mono">Review Audit Trail:</span>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-[10px] mt-2">
                      <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                        <span className="block font-black text-fuchsia-600 uppercase font-mono">Step 2: HR Sourcing</span>
                        <p className="text-slate-600 mt-1 font-medium italic">{req.hrSourcingRemarks || "Pending HR review..."}</p>
                        {(req.sourcingBudget || req.postingPlatform || req.postingDuration) && (
                          <div className="mt-1.5 pt-1.5 border-t border-slate-100 font-bold text-slate-750 flex flex-col gap-0.5">
                            {req.sourcingBudget && <div>Budget: ₹{req.sourcingBudget.toLocaleString("en-IN")}</div>}
                            {req.postingPlatform && <div>Platform: {req.postingPlatform}</div>}
                            {req.postingDuration && <div>Duration: {req.postingDuration} Days</div>}
                          </div>
                        )}
                      </div>
                      <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                        <span className="block font-black text-amber-600 uppercase font-mono">Step 3: Accounts</span>
                        <p className="text-slate-600 mt-1 font-medium italic">{req.accountsRemarks || "Pending Accounts review..."}</p>
                      </div>
                      <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                        <span className="block font-black text-[#714B67] uppercase font-mono">Step 4: Owner</span>
                        <p className="text-slate-600 mt-1 font-medium italic">{req.ownerRemarks || "Pending Owner approval..."}</p>
                      </div>
                    </div>
                  </div>
 
                  {/* Action Desks */}
                  <div className="pt-2">
 
                    {/* HR SOURCING DESK */}
                    {activeTab === "HRSourcing" && req.status === "Pending HR Sourcing Review" && (
                      <div className="bg-gradient-to-r from-fuchsia-500/5 to-pink-500/5 border border-fuchsia-500/20 rounded-xl p-4 space-y-3">
                        <span className="block text-[10px] font-black text-fuchsia-600 uppercase tracking-wider font-mono">🎯 HR Sourcing Desk — Validate & Add Budget</span>
                        {!userRole?.includes("HR") && userRole !== "Owner" && userRole !== "Director" ? (
                          <div className="p-3 bg-fuchsia-50/50 text-fuchsia-800 rounded-lg text-xs font-medium border border-fuchsia-200/50 flex items-center gap-2">
                            <span className="text-sm">🔒</span> You must be an HR to take action here.
                          </div>
                        ) : (
                          <div className="flex flex-col md:flex-row gap-3 items-end">
                            <div className="w-1/5">
                              <label className="text-[8px] uppercase font-black text-slate-400 font-mono tracking-widest">Sourcing Budget (₹)</label>
                              <input
                                type="number"
                                className="w-full bg-white border border-slate-300 p-2.5 rounded text-xs focus:outline-none mt-1 text-slate-900"
                                placeholder="e.g. 5000"
                                value={budget}
                                onChange={e => handleBudgetChange(req._id, e.target.value)}
                              />
                            </div>
                            <div className="w-1/4">
                              <label className="text-[8px] uppercase font-black text-slate-400 font-mono tracking-widest">Posting Platform</label>
                              <select
                                className="w-full bg-white border border-slate-300 p-2.5 rounded text-xs focus:outline-none mt-1 text-slate-900"
                                value={platform}
                                onChange={e => handlePlatformChange(req._id, e.target.value)}
                              >
                                <option value="Indeed">Indeed</option>
                                <option value="Naukri">Naukri</option>
                                <option value="Linkedin">Linkedin</option>
                              </select>
                            </div>
                            <div className="w-1/5">
                              <label className="text-[8px] uppercase font-black text-slate-400 font-mono tracking-widest">Posting Duration (Days)</label>
                              <input
                                type="number"
                                className="w-full bg-white border border-slate-300 p-2.5 rounded text-xs focus:outline-none mt-1 text-slate-900"
                                placeholder="e.g. 30"
                                value={duration}
                                onChange={e => handleDurationChange(req._id, e.target.value)}
                              />
                            </div>
                            <div className="flex-1">
                              <label className="text-[8px] uppercase font-black text-slate-400 font-mono tracking-widest">HR Remarks / Other Details</label>
                              <input
                                className="w-full bg-white border border-slate-300 p-2.5 rounded text-xs focus:outline-none mt-1 text-slate-900"
                                placeholder="Enter sourcing strategy or notes..."
                                value={remarks}
                                onChange={e => handleRemarksChange(req._id, e.target.value)}
                              />
                            </div>
                            <div className="flex gap-2 shrink-0">
                              <button
                                className="bg-fuchsia-600 hover:bg-fuchsia-700 px-4 py-2.5 rounded-lg text-xs font-bold text-white transition-all shadow-sm"
                                onClick={() => onApproveRequisition(req._id, "Pending Accounts Review", remarks || "Forwarded to Accounts.", budget, platform, duration ? Number(duration) : undefined)}
                              >
                                ✅ Forward to Accounts
                              </button>
                              <button
                                className="bg-blue-600 hover:bg-blue-700 px-3 py-2.5 rounded-lg text-xs font-bold text-white transition-all shadow-sm"
                                onClick={() => onApproveRequisition(req._id, "Hold", remarks || "Put on hold by HR.")}
                              >
                                Hold
                              </button>
                              <button
                                className="bg-rose-600 hover:bg-rose-700 px-3 py-2.5 rounded-lg text-xs font-bold text-white transition-all shadow-sm"
                                onClick={() => onApproveRequisition(req._id, "Rejected", remarks || "Rejected by HR.")}
                              >
                                Reject
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* ACCOUNTS DESK */}
                    {activeTab === "Accounts" && req.status === "Pending Accounts Review" && (
                      <div className="bg-gradient-to-r from-amber-500/5 to-yellow-500/5 border border-amber-500/20 rounded-xl p-4 space-y-3">
                        <span className="block text-[10px] font-black text-amber-600 uppercase tracking-wider font-mono">💰 Accounts Budget Desk — Review & Recommend</span>
                        {userRole !== "Accounts" && userRole !== "Owner" && userRole !== "Director" ? (
                          <div className="p-3 bg-amber-50/50 text-amber-800 rounded-lg text-xs font-medium border border-amber-200/50 flex items-center gap-2">
                            <span className="text-sm">🔒</span> You must be an Accounts representative to take action here.
                          </div>
                        ) : (
                          <div className="flex flex-col md:flex-row gap-3 items-end">
                            <div className="flex-1">
                              <label className="text-[8px] uppercase font-black text-slate-400 font-mono tracking-widest">Budget Vetting Remarks</label>
                              <input
                                className="w-full bg-white border border-slate-300 p-2.5 rounded text-xs focus:outline-none mt-1 text-slate-900"
                                placeholder="Enter budget review remarks..."
                                value={remarks}
                                onChange={e => handleRemarksChange(req._id, e.target.value)}
                              />
                            </div>
                            <div className="flex gap-2 shrink-0">
                              <button
                                className="bg-amber-600 hover:bg-amber-700 px-4 py-2.5 rounded-lg text-xs font-bold text-white transition-all shadow-sm"
                                onClick={() => onApproveRequisition(req._id, "Pending Owner Approval", remarks || "Budget cleared. Forwarded to Owner for approval.")}
                              >
                                ✅ Recommend to Owner
                              </button>
                              <button
                                className="bg-blue-600 hover:bg-blue-700 px-3 py-2.5 rounded-lg text-xs font-bold text-white transition-all shadow-sm"
                                onClick={() => onApproveRequisition(req._id, "Hold", remarks || "Put on hold by Accounts.")}
                              >
                                Hold
                              </button>
                              <button
                                className="bg-rose-600 hover:bg-rose-700 px-3 py-2.5 rounded-lg text-xs font-bold text-white transition-all shadow-sm"
                                onClick={() => onApproveRequisition(req._id, "Rejected", remarks || "Rejected by Accounts — insufficient budget.")}
                              >
                                Reject
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* OWNER DESK */}
                    {activeTab === "Owner" && req.status === "Pending Owner Approval" && (
                      <div className="bg-gradient-to-r from-[#714B67]/5 to-purple-500/5 border border-[#714B67]/20 rounded-xl p-4 space-y-3">
                        <span className="block text-[10px] font-black text-[#714B67] uppercase tracking-wider font-mono">👑 Owner Desk — Final Approval</span>
                        {userRole !== "Owner" && userRole !== "Director" ? (
                          <div className="p-3 bg-[#714B67]/5 text-[#714B67] rounded-lg text-xs font-medium border border-[#714B67]/20 flex items-center gap-2">
                            <span className="text-sm">🔒</span> You must be an Owner or Director to take action here.
                          </div>
                        ) : (
                          <div className="flex flex-col md:flex-row gap-3 items-end">
                            <div className="flex-1">
                              <label className="text-[8px] uppercase font-black text-slate-400 font-mono tracking-widest">Owner Remarks</label>
                              <input
                                className="w-full bg-white border border-slate-300 p-2.5 rounded text-xs focus:outline-none mt-1 text-slate-900"
                                placeholder="Enter owner decision remarks..."
                                value={remarks}
                                onChange={e => handleRemarksChange(req._id, e.target.value)}
                              />
                            </div>
                            <div className="flex gap-2 shrink-0">
                              <button
                                className="bg-[#714B67] hover:bg-[#5F3F56] px-4 py-2.5 rounded-lg text-xs font-bold text-white transition-all shadow-sm"
                                onClick={() => onApproveRequisition(req._id, "Approved — Pending HR Post", remarks || "Approved by Owner. HR to post the job.")}
                              >
                                ✅ Approve → Send to HR
                              </button>
                              <button
                                className="bg-blue-600 hover:bg-blue-700 px-3 py-2.5 rounded-lg text-xs font-bold text-white transition-all shadow-sm"
                                onClick={() => onApproveRequisition(req._id, "Hold", remarks || "Put on hold by Owner.")}
                              >
                                Hold
                              </button>
                              <button
                                className="bg-rose-600 hover:bg-rose-700 px-3 py-2.5 rounded-lg text-xs font-bold text-white transition-all shadow-sm"
                                onClick={() => onApproveRequisition(req._id, "Rejected", remarks || "Rejected by Owner.")}
                              >
                                Reject
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* HR POSTING DESK */}
                    {activeTab === "HRPosting" && req.status === "Approved — Pending HR Post" && (
                      <div className="bg-gradient-to-r from-emerald-500/5 to-teal-500/5 border border-emerald-500/20 rounded-xl p-4 space-y-3">
                        <span className="block text-[10px] font-black text-emerald-600 uppercase tracking-wider font-mono">📋 HR Posting Desk — Post Job Vacancy</span>
                        {!userRole?.includes("HR") && userRole !== "Owner" && userRole !== "Director" ? (
                          <div className="p-3 bg-emerald-50/50 text-emerald-800 rounded-lg text-xs font-medium border border-emerald-200/50 flex items-center gap-2">
                            <span className="text-sm">🔒</span> You must be an HR to post jobs.
                          </div>
                        ) : (
                          <>
                            <p className="text-xs text-slate-600 font-medium">
                              ✅ This requisition has been approved by the Owner. Click below to publish the job vacancy and generate a shareable application link.
                            </p>
                            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-xs font-semibold text-emerald-700">
                              📌 Job will be posted as: <strong>{req.role}</strong> | Dept: <strong>{req.department}</strong> | Budget: <strong>₹{req.salaryBudget?.toLocaleString("en-IN")} P.A.</strong>
                              {req.sourcingBudget && <span> | Sourcing: <strong>₹{req.sourcingBudget?.toLocaleString("en-IN")}</strong></span>}
                            </div>
                            <button
                              className="bg-emerald-600 hover:bg-emerald-700 px-6 py-3 rounded-lg text-xs font-bold text-white transition-all shadow-md flex items-center gap-2"
                              onClick={() => onApproveRequisition(req._id, "Job Posted", "Job vacancy published by HR.")}
                            >
                              <CheckCircle2 className="w-4 h-4" /> Post Job & Generate Application Link
                            </button>
                          </>
                        )}
                      </div>
                    )}

                    {/* Status Badges */}
                    {req.status === "Job Posted" && (
                      <div className="text-xs font-bold text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-lg flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        Job vacancy is LIVE! Application link has been generated and posted.
                      </div>
                    )}
                    {req.status === "Rejected" && (
                      <div className="text-xs font-bold text-rose-600 bg-rose-500/10 border border-rose-500/20 p-3 rounded-lg">
                        ⚠️ Requisition REJECTED during evaluation.
                      </div>
                    )}
                    {req.status === "Hold" && (
                      <div className="text-xs font-bold text-blue-600 bg-blue-500/10 border border-blue-500/20 p-3 rounded-lg">
                        ℹ️ Requisition is on HOLD.
                      </div>
                    )}
                    {req.status === "Pending HR Sourcing Review" && activeTab !== "HRSourcing" && (
                      <div className="text-xs font-semibold text-fuchsia-600 bg-fuchsia-50 border border-fuchsia-200 p-3 rounded-lg">
                        ⏳ Awaiting HR Sourcing review and budget addition. Switch to "HR Sourcing" tab.
                      </div>
                    )}
                    {req.status === "Pending Accounts Review" && activeTab !== "Accounts" && (
                      <div className="text-xs font-semibold text-amber-600 bg-amber-50 border border-amber-200 p-3 rounded-lg">
                        ⏳ Awaiting Accounts desk review. Switch to "Accounts" tab to take action.
                      </div>
                    )}
                    {req.status === "Pending Owner Approval" && activeTab !== "Owner" && (
                      <div className="text-xs font-semibold text-purple-600 bg-purple-50 border border-purple-200 p-3 rounded-lg">
                        ⏳ Awaiting Owner approval. Switch to "Owner" tab to take action.
                      </div>
                    )}
                    {req.status === "Approved — Pending HR Post" && activeTab !== "HRPosting" && (
                      <div className="text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 p-3 rounded-lg">
                        ✅ Owner approved! Awaiting HR to post the job. Switch to "HR Posting" tab.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {filteredRequisitions.length === 0 && (
          <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-400 font-bold">
            {isHR
              ? activeTab === "HRSourcing"
                ? "No HR Sourcing requisitions are available right now."
                : "No HR Posting requisitions are available right now."
              : "No active hiring requisitions. Click \"New Requisition\" to file one."}
          </div>
        )}
      </div>
    </div>
  );
}


export function JobPostings({
  jobs,
  toggleModal,
  triggerToast
}: {
  jobs: any[];
  toggleModal: (modalId: string, open: boolean) => void;
  triggerToast: (msg: string) => void;
}) {
  // Module 4 Simulator State
  const [simPhone, setSimPhone] = useState("");
  const [simJobId, setSimJobId] = useState("");
  const [simChannel, setSimChannel] = useState("WhatsApp"); // "WhatsApp" | "Call"
  const [chatLog, setChatLog] = useState<Array<{ sender: "candidate" | "system", text: string, time: string }>>([]);
  const [isTyping, setIsTyping] = useState(false);

  const handleSimulateAutoResponse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!simPhone) {
      triggerToast("Please enter candidate phone number!");
      return;
    }
    if (!simJobId) {
      triggerToast("Please select a job vacancy!");
      return;
    }

    const job = jobs.find(j => j._id === simJobId);
    const jobTitle = job ? job.title : "BDA Sales";
    const applyLink = `http://localhost:3001/jobs/apply/${simJobId}`;

    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Add incoming message
    const incomingText = simChannel === "WhatsApp"
      ? `Hi, I saw your job post for "${jobTitle}" and want to apply!`
      : `📞 [Simulated Missed Call to Acolyte Recruitment Number]`;

    setChatLog([
      { sender: "candidate", text: incomingText, time: now }
    ]);
    setIsTyping(true);

    setTimeout(() => {
      setIsTyping(false);
      setChatLog(prev => [
        ...prev,
        {
          sender: "system",
          text: `Thank you. To proceed with the Acolyte Group Recruitment Process, please fill out this form. The HR Team will contact you once the form is submitted. \n\nApply here: ${applyLink}`,
          time: now
        }
      ]);
      triggerToast("Auto-Reply Sent via WhatsApp/SMS Gateway!");
    }, 1500);
  };

  return (
    <div className="space-y-8 animate-fadeIn text-slate-800">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-slate-800">MODULE-3: Vacancy Postings</h1>
          <p className="text-xs text-slate-500 mt-1">Configure live recruitment links and view active job postings</p>
        </div>
        <button
          className="bg-[#714B67] hover:bg-[#5F3F56] px-4 py-2.5 rounded-lg text-xs font-bold text-white transition-all flex items-center gap-1.5 shadow"
          onClick={() => toggleModal("job", true)}
        >
          <Plus className="w-4 h-4" /> Create Custom Job Link
        </button>
      </div>

      {/* Main Table Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <h2 className="text-xs font-black uppercase text-[#714B67] tracking-wider mb-4 font-mono">Active Vacancy Postings</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 font-black uppercase font-mono tracking-wider">
                <th className="pb-3 pr-2">1. Job Title & Company details</th>
                <th className="pb-3 px-2">3. Dept & 5. Category</th>
                <th className="pb-3 px-2">6. Qual. & 7. Experience</th>
                <th className="pb-3 px-2">8. Salary Payout</th>
                <th className="pb-3 px-2">11. Source & Status</th>
                <th className="pb-3 px-2">10. Software Form Link</th>
                <th className="pb-3 pl-2 text-right">System Job Link</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
              {jobs.map((jb, idx) => {
                const companyName = jb.company?.name || "Acolyte Group";
                const deptName = jb.department?.name || "Sales";
                const isExpired = !!(jb.postingDuration && (new Date().getTime() - new Date(jb.createdAt).getTime()) > jb.postingDuration * 24 * 60 * 60 * 1000);

                return (
                  <tr key={idx} className={`hover:bg-slate-50/50 transition-all ${isExpired ? "bg-white opacity-40 select-none pointer-events-none" : ""}`}>
                    {/* 1. Title, 2. Company, 4. Location */}
                    <td className="py-4 pr-2 max-w-[280px]">
                      <div className="font-bold text-slate-800 text-sm">{jb.title}</div>
                      <div className="text-[10px] text-slate-500 font-bold mt-1 font-mono">
                        🏢 {companyName} | 📍 {jb.location || "Jaipur Office"}
                      </div>
                    </td>

                    {/* 3. Dept, 5. Category */}
                    <td className="py-4 px-2">
                      <div className="text-slate-800">{deptName}</div>
                      <span className="inline-block px-2 py-0.5 bg-slate-100 text-slate-600 text-[9px] rounded font-black font-mono border border-slate-200 uppercase mt-1">
                        {jb.category || "Staff"}
                      </span>
                    </td>

                    {/* 6. Qualification, 7. Experience */}
                    <td className="py-4 px-2">
                      <div className="text-slate-850 font-bold">{jb.qualification || "Graduate"}</div>
                      <div className="text-[10px] text-[#714B67] mt-0.5 font-bold font-mono">⌛ {jb.experience || "1-3 Years"}</div>
                    </td>

                    {/* 8. Salary Range */}
                    <td className="py-4 px-2 font-mono text-[#714B67] font-bold text-sm">
                      {jb.salaryRange || "₹25,000 - ₹35,000"}
                    </td>

                    {/* 11. Source & Status */}
                    <td className="py-4 px-2">
                      <span className="inline-block px-2 py-0.5 bg-indigo-500/10 text-indigo-700 text-[9px] rounded font-black font-mono border border-indigo-500/15 uppercase">
                        {jb.source || "Indeed"}
                      </span>
                      <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                        <span className={`w-1.5 h-1.5 rounded-full ${isExpired ? "bg-rose-500" : (jb.status === "active" ? "bg-emerald-500" : "bg-slate-400")}`}></span>
                        <span className={`text-[9px] font-bold uppercase tracking-wider font-mono ${isExpired ? "text-rose-500" : "text-slate-400"}`}>
                          {isExpired ? "DEACTIVATED" : (jb.status || "active")}
                        </span>
                      </div>
                      {jb.postingDuration && (
                        <div className="text-[8px] font-bold font-mono text-slate-500 mt-0.5 uppercase tracking-wide">
                          {isExpired 
                            ? "Duration: Over" 
                            : `Ends in: ${Math.max(0, Math.ceil(jb.postingDuration - (new Date().getTime() - new Date(jb.createdAt).getTime()) / (24 * 60 * 60 * 1000)))} days`
                          }
                        </div>
                      )}
                    </td>

                    {/* 10. Software Form Link */}
                    <td className="py-4 px-2">
                      <a
                        href={`http://localhost:3001/jobs/apply/${jb._id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-[10px] font-black text-[#714B67] hover:text-[#5F3F56] bg-[#714B67]/5 border border-[#714B67]/15 px-2.5 py-1 rounded shadow-sm hover:shadow transition-all"
                      >
                        <ExternalLink className="w-3.5 h-3.5 shrink-0" /> Open Software Form
                      </a>
                    </td>

                    {/* Copy Shareable Link */}
                    <td className="py-4 pl-2 text-right">
                      <button
                        className="bg-slate-100 hover:bg-slate-200 border border-slate-250 text-slate-700 px-3 py-2 rounded-lg text-[10px] font-black flex items-center gap-1.5 ml-auto shadow-sm transition-all"
                        onClick={() => {
                          const link = jb.shareableLink || `http://localhost:3001/jobs/apply/${jb._id}`;
                          navigator.clipboard.writeText(link);
                          triggerToast(`Job Share Link Copied!`);
                        }}
                      >
                        <Copy className="w-3.5 h-3.5" /> Copy System Link
                      </button>
                    </td>
                  </tr>
                );
              })}
              {jobs.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-400 font-bold">No active custom job posts live yet. Click "Create Custom Job Link" to build one!</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export function CandidatesPipeline({
  candidates,
  selectedCandidate,
  setSelectedCandidate,
  toggleModal,
  triggerToast,
  requisitions = []
}: RecruitmentProps) {
  const [previewFile, setPreviewFile] = useState<{ url: string; title: string } | null>(null);

  return (
    <div className="space-y-8 animate-fadeIn text-slate-800">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-slate-800">Candidate Pipeline</h1>
          <p className="text-xs text-slate-500 mt-1">Sourcing applications tracking roster</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className={selectedCandidate ? "lg:col-span-2" : "lg:col-span-3"}>
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 font-black uppercase font-mono tracking-wider">
                    <th className="pb-3 pr-2">ID</th>
                    <th className="pb-3 px-2">Applicant Name</th>
                    <th className="pb-3 px-2">Role Applied</th>
                    <th className="pb-3 px-2">Vetting Status</th>
                    <th className="pb-3 pl-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                  {candidates.map((c, idx) => {
                    const matchingReq = requisitions.find(r => r.role === c.job?.title);
                    let vettingStatusText = c.status;
                    let statusColorClass = "bg-amber-500/10 text-amber-600 border-amber-500/20";

                    if (matchingReq) {
                      if (matchingReq.status === "Pending Accounts Review") {
                        vettingStatusText = "Waiting for Accounts";
                        statusColorClass = "bg-amber-500/10 text-amber-600 border-amber-500/20 animate-pulse";
                      } else if (matchingReq.status === "Pending Owner Approval") {
                        vettingStatusText = "Waiting for Owner";
                        statusColorClass = "bg-[#714B67]/10 text-[#714B67] border-[#714B67]/20 animate-pulse";
                      } else if (matchingReq.status === "Approved — Pending HR Post") {
                        vettingStatusText = "Waiting for HR Posting";
                        statusColorClass = "bg-violet-500/10 text-violet-600 border-violet-500/20 animate-pulse";
                      }
                    }

                    if (c.status === "Selected") {
                      vettingStatusText = "Selected";
                      statusColorClass = "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
                    } else if (c.status === "Rejected") {
                      vettingStatusText = "Rejected";
                      statusColorClass = "bg-rose-500/10 text-rose-600 border-rose-500/20";
                    } else if (c.status === "High Risk") {
                      vettingStatusText = "High Risk";
                      statusColorClass = "bg-red-500/10 text-red-600 border-red-500/20";
                    } else if (c.status === "Hold") {
                      vettingStatusText = "Hold";
                      statusColorClass = "bg-blue-500/10 text-blue-600 border-blue-500/20";
                    }

                    return (
                      <tr
                        key={idx}
                        className={`hover:bg-slate-50/50 cursor-pointer transition-all ${selectedCandidate?._id === c._id ? "bg-fuchsia-50/40" : ""}`}
                        onClick={() => setSelectedCandidate(c)}
                      >
                        <td className="py-3.5 text-slate-500 font-mono">{c._id.slice(-6).toUpperCase()}</td>
                        <td className="py-3.5 px-2">
                          <div className="font-bold text-slate-800">{c.name}</div>
                          <div className="text-[10px] text-slate-450 mt-0.5">{c.email} · {c.mobile}</div>
                        </td>
                        <td className="py-3.5 px-2">{c.job?.title || "General Inquiry"}</td>
                        <td className="py-3.5 px-2">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${statusColorClass}`}>
                            {vettingStatusText}
                          </span>
                        </td>
                        <td className="py-3.5 pl-2 text-right">
                          <button
                            className="bg-[#714B67] hover:bg-[#5F3F56] px-2.5 py-1 rounded text-[10px] font-bold text-white shadow-sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedCandidate(c);
                            }}
                          >
                            Review
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Selected Candidate Details Panel */}
        {selectedCandidate && (
          <div className="lg:col-span-1 bg-white border border-slate-200 rounded-xl p-5 shadow-md space-y-5 animate-fadeIn relative">
            <button
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 font-black text-base"
              onClick={() => setSelectedCandidate(null)}
            >
              ✕
            </button>
            <div className="pb-3 border-b border-slate-100">
              <h3 className="text-[9px] font-black uppercase text-slate-400 tracking-wider font-mono">Candidate Profile Details</h3>
              <h2 className="text-base font-black text-slate-850 mt-1">{selectedCandidate.name}</h2>
              <span className={`text-[9px] font-bold px-2 py-0.5 rounded border mt-1 inline-block ${selectedCandidate.status === "Selected" ? "bg-emerald-55 border-emerald-200 text-emerald-600" : "bg-[#714B67]/10 text-[#714B67] border-[#714B67]/20"
                }`}>
                Status: {selectedCandidate.status}
              </span>
            </div>

            {/* Profile Info */}
            <div className="space-y-4 text-[11px] leading-relaxed text-slate-650">
              <div>
                <span className="text-[9px] font-black uppercase text-[#714B67] tracking-wider font-mono block mb-1">Contact Details</span>
                <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-150">
                  <div>
                    <span className="text-slate-400 block text-[9px] uppercase font-mono">Mobile</span>
                    <strong className="text-slate-800 font-bold">{selectedCandidate.mobile}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[9px] uppercase font-mono">Email</span>
                    <strong className="text-slate-800 font-bold break-all">{selectedCandidate.email}</strong>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-400 block text-[9px] uppercase font-mono">Address</span>
                    <strong className="text-slate-800 font-semibold">{selectedCandidate.address}</strong>
                  </div>
                </div>
              </div>

              <div>
                <span className="text-[9px] font-black uppercase text-[#714B67] tracking-wider font-mono block mb-1">Application Info</span>
                <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-150">
                  <div>
                    <span className="text-slate-400 block text-[9px] uppercase font-mono">Role Applied</span>
                    <strong className="text-slate-800 font-bold">{selectedCandidate.job?.title || "General Inquiry"}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[9px] uppercase font-mono">Experience</span>
                    <strong className="text-slate-800 font-bold">{selectedCandidate.experience}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[9px] uppercase font-mono">Qualification</span>
                    <strong className="text-slate-800 font-bold">{selectedCandidate.qualification}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[9px] uppercase font-mono">Notice Period</span>
                    <strong className="text-slate-800 font-bold">{selectedCandidate.noticePeriod}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[9px] uppercase font-mono">Current Salary</span>
                    <strong className="text-slate-800 font-bold">{selectedCandidate.currentSalary}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[9px] uppercase font-mono">Expected Salary</span>
                    <strong className="text-slate-800 font-bold">{selectedCandidate.expectedSalary}</strong>
                  </div>
                </div>
              </div>

              {/* Uploaded Documents */}
              {selectedCandidate.uploads && Object.keys(selectedCandidate.uploads).length > 0 && (
                <div>
                  <span className="text-[9px] font-black uppercase text-[#714B67] tracking-wider font-mono block mb-1">Attachments</span>
                  <div className="flex flex-col gap-1.5">
                    {selectedCandidate.uploads.resume && (
                      <button
                        type="button"
                        onClick={() => setPreviewFile({
                          url: getAttachmentUrl(selectedCandidate.uploads.resume),
                          title: `Resume - ${selectedCandidate.name}`
                        })}
                        className="flex items-center justify-between p-2 bg-indigo-50/50 border border-indigo-100 rounded text-indigo-700 hover:bg-indigo-50 font-bold text-left w-full"
                      >
                        <span>📄 Resume Document</span>
                        <span className="text-[9px] uppercase bg-indigo-600 text-white px-2 py-0.5 rounded font-mono">View</span>
                      </button>
                    )}
                    {selectedCandidate.uploads.photo && (
                      <button
                        type="button"
                        onClick={() => setPreviewFile({
                          url: getAttachmentUrl(selectedCandidate.uploads.photo),
                          title: `Profile Photo - ${selectedCandidate.name}`
                        })}
                        className="flex items-center justify-between p-2 bg-indigo-50/50 border border-indigo-100 rounded text-indigo-700 hover:bg-indigo-50 font-bold text-left w-full"
                      >
                        <span>🖼️ Profile Photo</span>
                        <span className="text-[9px] uppercase bg-indigo-600 text-white px-2 py-0.5 rounded font-mono">View</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {previewFile && (
        <FilePreviewModal
          url={previewFile.url}
          title={previewFile.title}
          onClose={() => setPreviewFile(null)}
        />
      )}
    </div>
  );
}

export function AiScreening({
  selectedCandidate,
  triggerToast,
  onCandidateUpdated,
}: {
  selectedCandidate: any;
  triggerToast: (msg: string) => void;
  onCandidateUpdated?: () => void;
}) {
  const [candidate, setCandidate] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [scanStep, setScanStep] = useState(0);
  const [overrideLoading, setOverrideLoading] = useState(false);
  const [previewFile, setPreviewFile] = useState<{ url: string; title: string } | null>(null);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [loadingCands, setLoadingCands] = useState(false);

  const loadCandidates = async () => {
    setLoadingCands(true);
    try {
      const res = await fetch("/api/candidates");
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        const list = data.data.filter((c: any) => c && c.status !== "inactive");
        setCandidates(list);
        if (selectedCandidate) {
          const match = list.find((c: any) => c._id === selectedCandidate._id);
          if (match) setCandidate(match);
        }
      }
    } catch (err) {
      console.error("Error loading candidates:", err);
    } finally {
      setLoadingCands(false);
    }
  };

  useEffect(() => {
    loadCandidates();
  }, [selectedCandidate]);

  const runAiScreening = async () => {
    if (!candidate?._id) return;
    setLoading(true);
    setScanStep(0);

    const stepIntervals = [
      { step: 1, delay: 1000 },
      { step: 2, delay: 2000 },
      { step: 3, delay: 3000 },
      { step: 4, delay: 4200 },
    ];

    stepIntervals.forEach(({ step, delay }) => {
      setTimeout(() => setScanStep(step), delay);
    });

    try {
      const res = await fetch("/api/candidates/screen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidateId: candidate._id }),
      });
      const data = await res.json();

      setTimeout(() => {
        if (data.success) {
          setCandidate((prev: any) => ({
            ...prev,
            screeningResult: data.data,
            status: data.data.recommendation === "High Risk" ? "High Risk" : prev.status,
          }));
          triggerToast(`AI Screening completed for ${candidate.name}!`);
          onCandidateUpdated?.();
        } else {
          triggerToast(`Screening failed: ${data.error}`);
        }
        setLoading(false);
      }, 5000);

    } catch (err) {
      setTimeout(() => {
        triggerToast("Network error executing AI models");
        setLoading(false);
      }, 5000);
    }
  };

  const handleStatusOverride = async (newStatus: string) => {
    if (!candidate?._id) return;
    setOverrideLoading(true);

    try {
      const res = await fetch(`/api/candidates/${candidate._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        setCandidate((prev: any) => ({
          ...prev,
          status: newStatus,
        }));
        triggerToast(`Manual override successful! Candidate marked: ${newStatus}`);
        onCandidateUpdated?.();
      } else {
        triggerToast(`Failed to update status: ${data.error}`);
      }
    } catch (err) {
      triggerToast("Error updating candidate decision");
    } finally {
      setOverrideLoading(false);
    }
  };

  if (!candidate) {
    return (
      <div className="space-y-8 animate-fadeIn text-slate-800">
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
          <div>
            <h1 className="text-xl font-black text-slate-800">AI Screening Module</h1>
            <p className="text-xs text-slate-500 mt-1">Cross-referencing candidate declarations vs job description</p>
          </div>

          <div className="flex flex-col gap-1.5 max-w-sm">
            <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider font-mono">Select Candidate to Screen</label>
            <select
              value=""
              onChange={(e) => {
                const selected = candidates.find((c) => c._id === e.target.value);
                if (selected) setCandidate(selected);
              }}
              className="rounded border border-slate-250 p-2 text-xs text-slate-800 focus:ring-[#714B67] bg-white font-semibold"
            >
              <option value="">-- Choose Candidate --</option>
              {candidates.map((c) => {
                const vacancy = c.job?.title || "General Application";
                return (
                  <option key={c._id} value={c._id}>
                    {c.name} ({vacancy}) [{c.status}]
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        <div className="text-center py-20 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col items-center justify-center p-6">
          <Brain className="w-16 h-16 text-[#714B67]/30 mb-4 animate-pulse" />
          <p className="text-sm font-bold text-slate-700">Please select a candidate above to view or run AI screening</p>
          <p className="text-xs text-slate-400 mt-1.5 max-w-[280px]">AI Screening reviews credentials, matches experiences, calculates stability scores and parses risk profiles.</p>
        </div>
      </div>
    );
  }

  const result = candidate.screeningResult;
  const hasScreened = !!(result && result.candidateSummary && result.skillMatchScore !== undefined);

  return (
    <div className="space-y-8 animate-fadeIn text-slate-800">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
        <div className="space-y-2 flex-1">
          <h1 className="text-xl font-black text-slate-800">AI Screening Module</h1>
          <p className="text-xs text-slate-500">Automatic vetting & customized assessment question sets</p>

          <div className="flex flex-col gap-1.5 max-w-sm pt-2">
            <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider font-mono">Select Candidate to Screen</label>
            <select
              value={candidate?._id || ""}
              onChange={(e) => {
                const selected = candidates.find((c) => c._id === e.target.value);
                if (selected) setCandidate(selected);
              }}
              className="rounded border border-slate-250 p-2 text-xs text-slate-800 focus:ring-[#714B67] bg-white font-semibold"
            >
              <option value="">-- Choose Candidate --</option>
              {candidates.map((c) => {
                const vacancy = c.job?.title || "General Application";
                return (
                  <option key={c._id} value={c._id}>
                    {c.name} ({vacancy}) [{c.status}]
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {!hasScreened && !loading && (
            <button
              onClick={runAiScreening}
              className="bg-[#714B67] hover:bg-[#5F3F56] text-white px-5 py-2.5 rounded-lg text-xs font-black shadow-md flex items-center gap-2 hover:scale-[1.01] active:scale-[0.99] transition-all"
            >
              <Sparkles className="w-4 h-4 animate-spin" /> Run AI Screening Model
            </button>
          )}
          {hasScreened && !loading && (
            <button
              onClick={runAiScreening}
              className="bg-slate-100 hover:bg-slate-200 text-slate-750 px-4 py-2.5 rounded-lg text-xs font-bold border border-slate-300 flex items-center gap-1.5 transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Re-Screen candidate
            </button>
          )}
        </div>
      </div>

      {/* AI Processing Screen Vetting State */}
      {loading && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-white space-y-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#714B67] via-indigo-500 to-[#128C7E] animate-pulse" />
          <Brain className="w-16 h-16 text-[#714B67] mx-auto animate-bounce" />

          <div className="max-w-md mx-auto space-y-2">
            <h3 className="text-base font-bold tracking-tight">AI Screening Core Active</h3>
            <p className="text-xs text-slate-400 font-mono">Screening Candidate ID: {candidate._id.toUpperCase()}</p>
          </div>

          {/* Stepper progress */}
          <div className="max-w-md mx-auto bg-slate-950/80 border border-slate-800 rounded-xl p-4 text-left space-y-3 font-mono text-[10px] text-slate-300">
            <div className="flex items-center gap-2.5">
              <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center font-bold ${scanStep >= 0 ? "bg-emerald-500 text-slate-950" : "bg-slate-800 text-slate-500"}`}>
                {scanStep > 0 ? "✓" : "1"}
              </span>
              <span className={scanStep === 0 ? "text-indigo-400 font-black" : "text-slate-500"}>Connecting database & loading candidate details...</span>
            </div>
            <div className="flex items-center gap-2.5">
              <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center font-bold ${scanStep >= 1 ? "bg-emerald-500 text-slate-950" : "bg-slate-800 text-slate-500"}`}>
                {scanStep > 1 ? "✓" : "2"}
              </span>
              <span className={scanStep === 1 ? "text-indigo-400 font-black" : "text-slate-500"}>Reading candidate documents & simulated resume highlights...</span>
            </div>
            <div className="flex items-center gap-2.5">
              <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center font-bold ${scanStep >= 2 ? "bg-emerald-500 text-slate-950" : "bg-slate-800 text-slate-500"}`}>
                {scanStep > 2 ? "✓" : "3"}
              </span>
              <span className={scanStep === 2 ? "text-indigo-400 font-black" : "text-slate-500"}>Evaluating responses vs job description experience criteria...</span>
            </div>
            <div className="flex items-center gap-2.5">
              <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center font-bold ${scanStep >= 3 ? "bg-emerald-500 text-slate-950" : "bg-slate-800 text-slate-500"}`}>
                {scanStep > 3 ? "✓" : "4"}
              </span>
              <span className={scanStep === 3 ? "text-indigo-400 font-black" : "text-slate-500"}>Analyzing 7-point declarations & dual employment risk indicators...</span>
            </div>
            <div className="flex items-center gap-2.5">
              <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center font-bold ${scanStep >= 4 ? "bg-emerald-500 text-slate-950" : "bg-slate-800 text-slate-500"}`}>
                {scanStep > 4 ? "✓" : "5"}
              </span>
              <span className={scanStep === 4 ? "text-indigo-400 font-black" : "text-slate-500"}>Formulating 15 to 25 tailored situational interview questions...</span>
            </div>
          </div>

          <div className="max-w-xs mx-auto pt-2">
            <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-indigo-500 h-full transition-all duration-1000"
                style={{ width: `${(scanStep + 1) * 20}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Side by Side Assessment Columns */}
      {!loading && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* LEFT: Candidate Application Details */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-6">
              <div className="pb-3 border-b border-slate-100">
                <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider font-mono">Candidate Profile Details</h3>
                <h2 className="text-base font-black text-slate-850 mt-1">{candidate.name}</h2>
                <span className="text-[10px] bg-slate-100 px-2 py-0.5 border border-slate-250 rounded font-semibold text-slate-650 mt-1 inline-block">
                  Status: <strong className="text-slate-800">{candidate.status}</strong>
                </span>
              </div>

              {/* Step 1 Basic Details */}
              <div className="space-y-3">
                <h4 className="text-[10px] font-black uppercase text-[#714B67] tracking-wider font-mono">1. Basic Information</h4>
                <div className="grid grid-cols-2 gap-3 text-[11px] leading-relaxed text-slate-600">
                  <div>
                    <span className="text-slate-400 block">Mobile:</span>
                    <strong className="text-slate-750 font-bold">{candidate.mobile}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Email:</span>
                    <strong className="text-slate-750 font-bold break-all">{candidate.email}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Highest Qualification:</span>
                    <strong className="text-slate-750 font-bold">{candidate.qualification}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Total Experience:</span>
                    <strong className="text-slate-750 font-bold">{candidate.experience}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Current Salary:</span>
                    <strong className="text-slate-750 font-bold">{candidate.currentSalary}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Expected Salary:</span>
                    <strong className="text-slate-750 font-bold">{candidate.expectedSalary}</strong>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-400 block">Notice Period:</span>
                    <strong className="text-slate-750 font-bold">{candidate.noticePeriod}</strong>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-400 block">Address:</span>
                    <strong className="text-slate-750 font-semibold">{candidate.address}</strong>
                  </div>
                </div>
              </div>

              {/* Step 2 Screening Declarations */}
              <div className="space-y-2.5 pt-3 border-t border-slate-100">
                <h4 className="text-[10px] font-black uppercase text-[#714B67] tracking-wider font-mono">2. Risk screening declarations</h4>
                <div className="space-y-2 text-[10.5px]">
                  <div className="flex justify-between items-center gap-4 bg-slate-50 p-2 rounded border border-slate-150">
                    <span className="font-semibold text-slate-650">Side business profile</span>
                    <span className={`px-2 py-0.5 rounded font-black text-[9px] border ${candidate.riskAnswers?.sideBusiness === "Yes" ? "bg-rose-55 border-rose-200 text-rose-600" : "bg-emerald-50 border-emerald-200 text-emerald-600"}`}>
                      {candidate.riskAnswers?.sideBusiness || "No"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center gap-4 bg-slate-50 p-2 rounded border border-slate-150">
                    <span className="font-semibold text-slate-650">Personal Loan / EMI Pressure</span>
                    <span className={`px-2 py-0.5 rounded font-black text-[9px] border ${candidate.riskAnswers?.loanPressure === "Yes" ? "bg-amber-50 border-amber-200 text-amber-600" : "bg-emerald-50 border-emerald-200 text-emerald-600"}`}>
                      {candidate.riskAnswers?.loanPressure || "No"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center gap-4 bg-slate-50 p-2 rounded border border-slate-150">
                    <span className="font-semibold text-slate-650">Police Case / Court Matter</span>
                    <span className={`px-2 py-0.5 rounded font-black text-[9px] border ${candidate.riskAnswers?.courtCase === "Yes" ? "bg-rose-100 border-rose-300 text-rose-700 font-bold" : "bg-emerald-50 border-emerald-200 text-emerald-600"}`}>
                      {candidate.riskAnswers?.courtCase || "No"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center gap-4 bg-slate-50 p-2 rounded border border-slate-150">
                    <span className="font-semibold text-slate-650">Target-based workload comfort</span>
                    <span className={`px-2 py-0.5 rounded font-black text-[9px] border ${candidate.riskAnswers?.targetWork === "No" ? "bg-rose-55 border-rose-200 text-rose-600" : "bg-emerald-50 border-emerald-200 text-emerald-600"}`}>
                      {candidate.riskAnswers?.targetWork || "Yes"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center gap-4 bg-slate-50 p-2 rounded border border-slate-150">
                    <span className="font-semibold text-slate-650">Outdoor touring / Field visits comfort</span>
                    <span className={`px-2 py-0.5 rounded font-black text-[9px] border ${candidate.riskAnswers?.fieldWork === "No" ? "bg-rose-55 border-rose-200 text-rose-600" : "bg-emerald-50 border-emerald-200 text-emerald-600"}`}>
                      {candidate.riskAnswers?.fieldWork || "Yes"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center gap-4 bg-slate-50 p-2 rounded border border-slate-150">
                    <span className="font-semibold text-slate-650">Background Check Consent</span>
                    <span className={`px-2 py-0.5 rounded font-black text-[9px] border ${candidate.riskAnswers?.backgroundVerification === "No" ? "bg-rose-100 border-rose-200 text-rose-700" : "bg-emerald-50 border-emerald-200 text-emerald-600"}`}>
                      {candidate.riskAnswers?.backgroundVerification || "Yes"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center gap-4 bg-slate-50 p-2 rounded border border-slate-150">
                    <span className="font-semibold text-slate-650">Confidentiality NDA Acceptance</span>
                    <span className={`px-2 py-0.5 rounded font-black text-[9px] border ${candidate.riskAnswers?.confidentialityAgreement === "No" ? "bg-rose-100 border-rose-200 text-rose-700" : "bg-emerald-50 border-emerald-200 text-emerald-600"}`}>
                      {candidate.riskAnswers?.confidentialityAgreement || "Yes"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Step 3 Documents Submitted */}
              <div className="space-y-2 pt-3 border-t border-slate-100">
                <h4 className="text-[10px] font-black uppercase text-[#714B67] tracking-wider font-mono">3. Document Upload Links</h4>
                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  {Object.entries(candidate.uploads || {}).map(([key, val]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setPreviewFile({
                        url: getAttachmentUrl(val as string),
                        title: `${key} - ${candidate.name}`
                      })}
                      className="flex items-center gap-1.5 p-2 bg-indigo-50/50 hover:bg-indigo-100/50 border border-indigo-100 text-indigo-700 rounded transition-all font-semibold text-left w-full"
                    >
                      <FileText className="w-3.5 h-3.5 shrink-0" />
                      <span className="capitalize break-all truncate">{key}</span>
                      <ExternalLink className="w-3 h-3 shrink-0 ml-auto" />
                    </button>
                  ))}
                  {Object.keys(candidate.uploads || {}).length === 0 && (
                    <span className="text-slate-400 italic font-medium col-span-2">No documents submitted.</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: AI Assessment Insights & Questions Checklist */}
          <div className="lg:col-span-7 space-y-6">
            {!hasScreened ? (
              <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl p-10 text-center flex flex-col items-center justify-center h-full min-h-[350px]">
                <Cpu className="w-12 h-12 text-[#714B67]/40 mb-3 animate-pulse" />
                <h3 className="text-sm font-bold text-slate-800">Candidate Screening Pending</h3>
                <p className="text-xs text-slate-500 mt-2 max-w-sm">
                  This profile has not undergone AI screening assessment. Run models now to inspect skill matches, stability ratios, fraud indicators and tailored questions.
                </p>
                <button
                  onClick={runAiScreening}
                  className="mt-6 bg-[#714B67] hover:bg-[#5F3F56] text-white px-5 py-2.5 rounded-lg text-xs font-black shadow flex items-center gap-2 hover:scale-[1.01] active:scale-[0.99] transition-all"
                >
                  <Sparkles className="w-4 h-4" /> Run AI Assessment Now
                </button>
              </div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-6 shadow-sm">

                {/* AI Scores Summary Grid */}
                <div>
                  <h3 className="text-xs font-black uppercase text-[#714B67] tracking-wider font-mono mb-4">AI Score Analytics Vetting</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-center">
                      <span className="text-[9px] uppercase font-black text-slate-450 tracking-wider block font-mono">Skill Match</span>
                      <strong className="text-xl font-mono text-[#714B67] block mt-1">{result.skillMatchScore}%</strong>
                      <div className="w-full bg-slate-200 h-1 rounded-full mt-2 overflow-hidden">
                        <div className="bg-[#714B67] h-full" style={{ width: `${result.skillMatchScore}%` }} />
                      </div>
                    </div>
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-center">
                      <span className="text-[9px] uppercase font-black text-slate-450 tracking-wider block font-mono">Stability</span>
                      <strong className="text-xl font-mono text-emerald-600 block mt-1">{result.stabilityScore}%</strong>
                      <div className="w-full bg-slate-200 h-1 rounded-full mt-2 overflow-hidden">
                        <div className="bg-emerald-500 h-full" style={{ width: `${result.stabilityScore}%` }} />
                      </div>
                    </div>
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-center">
                      <span className="text-[9px] uppercase font-black text-slate-450 tracking-wider block font-mono">Risk Factor</span>
                      <strong className={`text-xl font-mono block mt-1 ${result.riskScore > 50 ? "text-rose-600" : "text-amber-500"}`}>{result.riskScore}%</strong>
                      <div className="w-full bg-slate-200 h-1 rounded-full mt-2 overflow-hidden">
                        <div className={`h-full ${result.riskScore > 50 ? "bg-rose-500" : "bg-amber-400"}`} style={{ width: `${result.riskScore}%` }} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* AI Rationale Summary Block */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5">
                  <div className="flex items-center gap-1 text-[10px] font-black uppercase text-[#714B67] tracking-wider font-mono">
                    <Brain className="w-3.5 h-3.5 text-[#714B67]" />
                    AI Vetting Rationale Summary
                  </div>
                  <p className="text-[11.5px] leading-relaxed text-slate-650 font-semibold italic">
                    "{result.candidateSummary}"
                  </p>
                  <div className="pt-2 flex justify-between items-center text-[10px]">
                    <span className="text-slate-400">Score Engine: Parameter-Correlated Model V2.1</span>
                    <span className="font-bold text-slate-500">Screened: {new Date(result.screenedAt).toLocaleDateString()}</span>
                  </div>
                </div>



                {/* AI recommendation selection */}
                <div className="pt-4 border-t border-slate-150 flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider font-mono">AI Suggestion:</span>
                    <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded border tracking-wide ${result.recommendation === "Shortlist"
                      ? "bg-emerald-50 border-emerald-250 text-emerald-600 animate-pulse"
                      : result.recommendation === "Hold"
                        ? "bg-amber-50 border-amber-200 text-amber-600"
                        : "bg-rose-100 border-rose-300 text-rose-700"
                      }`}>
                      {result.recommendation}
                    </span>
                  </div>

                  {/* CRITICAL AI DISCLAIMER VETO badge */}
                  <div className="bg-amber-50 border border-amber-250 text-amber-700 text-[10px] font-bold p-3 rounded-lg flex items-start gap-2 max-w-md">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                    <div>
                      <strong>Important Notice:</strong> AI screening is only a support system. The final hiring veto and decision remains with the HR Team + Management.
                    </div>
                  </div>
                </div>

                {/* Final Decision Manual Override Panel (Veto Controls) */}
                <div className="bg-[#714B67]/5 border border-[#714B67]/20 rounded-xl p-4.5 space-y-3.5 mt-2">
                  <div className="flex items-center justify-between border-b border-[#714B67]/10 pb-2">
                    <h4 className="text-[11px] font-black uppercase text-[#714B67] tracking-wider font-mono">
                      Final Decision Override & Veto Controls
                    </h4>
                    <span className="text-[9px] bg-[#714B67] text-white px-2 py-0.5 rounded font-bold uppercase font-mono">HR / Owner Veto Only</span>
                  </div>

                  <div className="flex gap-2.5 flex-wrap">
                    <button
                      disabled={overrideLoading}
                      onClick={() => handleStatusOverride("Selected")}
                      className={`text-[10px] font-black px-4 py-2.5 rounded-lg border shadow-sm transition-all flex items-center gap-1.5 ${candidate.status === "Selected"
                        ? "bg-emerald-600 border-emerald-600 text-white"
                        : "bg-white border-slate-250 hover:bg-emerald-50 text-emerald-600"
                        }`}
                    >
                      <ThumbsUp className="w-3.5 h-3.5" /> Shortlist & Schedule
                    </button>

                    <button
                      disabled={overrideLoading}
                      onClick={() => handleStatusOverride("Hold")}
                      className={`text-[10px] font-black px-4 py-2.5 rounded-lg border shadow-sm transition-all flex items-center gap-1.5 ${candidate.status === "Hold"
                        ? "bg-amber-500 border-amber-500 text-white"
                        : "bg-white border-slate-250 hover:bg-amber-50 text-amber-600"
                        }`}
                    >
                      <RotateCcw className="w-3.5 h-3.5" /> Put on Hold
                    </button>

                    <button
                      disabled={overrideLoading}
                      onClick={() => handleStatusOverride("Rejected")}
                      className={`text-[10px] font-black px-4 py-2.5 rounded-lg border shadow-sm transition-all flex items-center gap-1.5 ${candidate.status === "Rejected"
                        ? "bg-slate-700 border-slate-700 text-white"
                        : "bg-white border-slate-250 hover:bg-slate-100 text-slate-650"
                        }`}
                    >
                      <ThumbsDown className="w-3.5 h-3.5" /> Reject Profile
                    </button>

                    <button
                      disabled={overrideLoading}
                      onClick={() => handleStatusOverride("High Risk")}
                      className={`text-[10px] font-black px-4 py-2.5 rounded-lg border shadow-sm transition-all flex items-center gap-1.5 ${candidate.status === "High Risk"
                        ? "bg-rose-600 border-rose-600 text-white animate-pulse"
                        : "bg-white border-slate-250 hover:bg-rose-50 text-rose-600"
                        }`}
                    >
                      <ShieldAlert className="w-3.5 h-3.5" /> Mark High Risk
                    </button>
                  </div>
                </div>

              </div>
            )}
          </div>

        </div>
      )}

      {previewFile && (
        <FilePreviewModal
          url={previewFile.url}
          title={previewFile.title}
          onClose={() => setPreviewFile(null)}
        />
      )}
    </div>
  );
}

export function VerificationChecklist({
  selectedCandidate,
  triggerToast,
  onCandidateUpdated,
}: {
  selectedCandidate: any;
  triggerToast: (msg: string) => void;
  onCandidateUpdated?: () => void;
}) {
  const [candidates, setCandidates] = useState<any[]>([]);
  const [selectedCand, setSelectedCand] = useState<any>(null);
  const [verifications, setVerifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [previewFile, setPreviewFile] = useState<{ url: string; title: string } | null>(null);
  const [uploadingField, setUploadingField] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const handleAttachDocument = async (field: string, file: File) => {
    if (!selectedCand?._id) return;
    setUploadingField(field);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const uploadRes = await fetch("/api/documents/upload", {
        method: "POST",
        body: formData,
      });
      const uploadData = await uploadRes.json();
      if (!uploadData.success || !uploadData.url) {
        throw new Error(uploadData.error || "Upload failed");
      }

      const fileUrl = uploadData.url;

      // Update candidate database profile
      const updateRes = await fetch(`/api/candidates/${selectedCand._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uploads: {
            [field]: fileUrl,
          },
        }),
      });
      const updateData = await updateRes.json();
      if (updateData.success) {
        // Also update verification record with the newly uploaded document URL
        const urlFieldMap: Record<string, string> = {
          aadhaar: "aadhaarUrl",
          pan: "panUrl",
          salarySlip: "salarySlipUrl",
          bankStatement: "bankStatementUrl",
        };
        const dbUrlField = urlFieldMap[field];
        if (dbUrlField) {
          await fetch("/api/verifications", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              candidateId: selectedCand._id,
              [dbUrlField]: fileUrl,
            }),
          });
        }

        // Update selectedCand state
        setSelectedCand((prev: any) => ({
          ...prev,
          uploads: {
            ...prev.uploads,
            [field]: fileUrl,
          },
        }));
        // Update local candidates list state
        setCandidates((prevList) =>
          prevList.map((c) =>
            c._id === selectedCand._id
              ? { ...c, uploads: { ...c.uploads, [field]: fileUrl } }
              : c
          )
        );
        triggerToast(`Document attached successfully for ${field === "salarySlip" ? "Salary Slip" : field === "bankStatement" ? "Bank Statement" : field.toUpperCase()}!`);
        if (onCandidateUpdated) {
          onCandidateUpdated();
        }
      } else {
        triggerToast(`Failed to update candidate: ${updateData.error}`);
      }
    } catch (err: any) {
      triggerToast(`Upload error: ${err.message}`);
    } finally {
      setUploadingField(null);
    }
  };

  // 9 Check Statuses
  const [aadhaarStatus, setAadhaarStatus] = useState("Pending");
  const [panStatus, setPanStatus] = useState("Pending");
  const [addressStatus, setAddressStatus] = useState("Pending");
  const [employerStatus, setEmployerStatus] = useState("Pending");
  const [referencesStatus, setReferencesStatus] = useState("Pending");
  const [cibilStatus, setCibilStatus] = useState("Pending");
  const [bankStatus, setBankStatus] = useState("Pending");
  const [policeStatus, setPoliceStatus] = useState("Pending");
  const [socialMediaStatus, setSocialMediaStatus] = useState("Pending");

  const [remarks, setRemarks] = useState("");
  const [overallStatus, setOverallStatus] = useState("Pending");

  const applyVerificationData = (verObj: any) => {
    if (verObj) {
      setAadhaarStatus(verObj.aadhaarStatus || "Pending");
      setPanStatus(verObj.panStatus || "Pending");
      setAddressStatus(verObj.addressStatus || "Pending");
      setEmployerStatus(verObj.employerStatus || "Pending");
      setReferencesStatus(verObj.referencesStatus || "Pending");
      setCibilStatus(verObj.cibilStatus || "Pending");
      setBankStatus(verObj.bankStatus || "Pending");
      setPoliceStatus(verObj.policeStatus || "Pending");
      setSocialMediaStatus(verObj.socialMediaStatus || "Pending");
      setRemarks(verObj.remarks || "");
      setOverallStatus(verObj.status || "Pending");
    } else {
      setAadhaarStatus("Pending");
      setPanStatus("Pending");
      setAddressStatus("Pending");
      setEmployerStatus("Pending");
      setReferencesStatus("Pending");
      setCibilStatus("Pending");
      setBankStatus("Pending");
      setPoliceStatus("Pending");
      setSocialMediaStatus("Pending");
      setRemarks("");
      setOverallStatus("Pending");
    }
  };

  const loadData = async (selectId?: string) => {
    setLoading(true);
    try {
      // 1. Fetch Candidates, Interviews & Verifications
      const [resCand, resInt, resVer] = await Promise.all([
        fetch("/api/candidates"),
        fetch("/api/interviews"),
        fetch("/api/verifications")
      ]);
      const dataCand = await resCand.json();
      const dataInt = await resInt.json();
      const dataVer = await resVer.json();

      let activeCands: any[] = [];
      if (dataCand.success && Array.isArray(dataCand.data) && dataInt.success && Array.isArray(dataInt.data)) {
        const interviews = dataInt.data;
        const candidateInterviewsMap: Record<string, Set<number>> = {};

        interviews.forEach((iv: any) => {
          if (iv.candidate && iv.candidate._id && iv.status === "Selected") {
            const cid = iv.candidate._id.toString();
            if (!candidateInterviewsMap[cid]) {
              candidateInterviewsMap[cid] = new Set();
            }
            candidateInterviewsMap[cid].add(iv.round);
          }
        });

        // Filter: Candidate ID must have 1, 2, and 3 all selected
        const eligibleCandIds = Object.keys(candidateInterviewsMap).filter(cid => {
          const rounds = candidateInterviewsMap[cid];
          return rounds.has(1) && rounds.has(2) && rounds.has(3);
        });

        activeCands = dataCand.data.filter((c: any) => c && c.status !== "inactive" && eligibleCandIds.includes(c._id.toString()));
        setCandidates(activeCands);
      }

      let verList: any[] = [];
      if (dataVer.success && Array.isArray(dataVer.data)) {
        verList = dataVer.data;
        setVerifications(verList);
      }

      // Determine candidate to auto-select
      let currentSelectId = selectId;
      if (!currentSelectId && selectedCandidate) {
        currentSelectId = selectedCandidate._id;
      }

      let activeSelect = null;
      if (currentSelectId) {
        activeSelect = activeCands.find((c: any) => c._id === currentSelectId);
      }
      if (!activeSelect && activeCands.length > 0) {
        activeSelect = activeCands[0];
      }

      if (activeSelect) {
        setSelectedCand(activeSelect);
        const matchVer = verList.find((v: any) => v.candidate?._id === activeSelect._id || v.candidate === activeSelect._id);
        applyVerificationData(matchVer);
        setIsEditing(!matchVer);
      } else {
        setSelectedCand(null);
        applyVerificationData(null);
        setIsEditing(false);
      }
    } catch (err) {
      triggerToast("Error loading vetting checks");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedCandidate]);

  const handleSelectCandidate = (cand: any) => {
    setSelectedCand(cand);
    const matchVer = verifications.find((v: any) => v.candidate?._id === cand._id || v.candidate === cand._id);
    applyVerificationData(matchVer);
    setIsEditing(!matchVer);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCand) return;
    setSubmitting(true);

    try {
      const res = await fetch("/api/verifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidateId: selectedCand._id,
          aadhaarStatus,
          panStatus,
          addressStatus,
          employerStatus,
          referencesStatus,
          cibilStatus,
          bankStatus,
          policeStatus,
          socialMediaStatus,
          remarks,
          status: overallStatus,
          aadhaarUrl: selectedCand.uploads?.aadhaar || "",
          panUrl: selectedCand.uploads?.pan || "",
          salarySlipUrl: selectedCand.uploads?.salarySlip || "",
          bankStatementUrl: selectedCand.uploads?.bankStatement || "",
        }),
      });
      const data = await res.json();
      if (data.success) {
        triggerToast("Vetting verification matrix saved successfully!");
        setIsEditing(false);
        loadData(selectedCand._id);
      } else {
        triggerToast(`Failed: ${data.error}`);
      }
    } catch (err) {
      triggerToast("Network error saving vetting status");
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Verified":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "Hold":
        return "bg-purple-50 text-purple-700 border-purple-200";
      case "Rejected":
        return "bg-rose-50 text-rose-700 border-rose-200";
      case "High Risk":
        return "bg-red-50 text-red-700 border-red-200 animate-pulse";
      default:
        return "bg-amber-50 text-amber-700 border-amber-200";
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn text-slate-800">

      {/* Top Header Card */}
      <div>
        <h1 className="text-xl font-black text-slate-800">Vetting Checks Registry</h1>
        <p className="text-xs text-slate-500 mt-1">Compliance & background verification command center for shortlists</p>
      </div>

      {loading && candidates.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-slate-200 shadow-sm font-mono text-xs font-bold text-slate-400">
          Loading vetting metrics registry...
        </div>
      ) : candidates.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-slate-200 shadow-sm">
          <ShieldCheck className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-sm font-bold text-slate-650">No candidates available for verification.</p>
          <p className="text-[10px] text-slate-400 mt-1">Shortlist candidates in candidate application stages first.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* LEFT: CANDIDATES DIRECTORY */}
          <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4 max-h-[640px] overflow-y-auto custom-scrollbar">
            <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider font-mono">Select Profile</h3>

            <div className="space-y-2">
              {candidates.map((c) => {
                const isSelected = selectedCand?._id === c._id;
                const matchVer = verifications.find((v: any) => v.candidate?._id === c._id || v.candidate === c._id);
                const currentOverallStatus = matchVer?.status || "Pending";

                return (
                  <div
                    key={c._id}
                    onClick={() => handleSelectCandidate(c)}
                    className={`p-3 rounded-lg border cursor-pointer transition-all hover:scale-[1.01] ${isSelected
                      ? "bg-[#714B67]/5 border-[#714B67] shadow-sm"
                      : "bg-slate-50/50 border-slate-200 hover:bg-slate-50"
                      }`}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <h4 className="text-xs font-black text-slate-800 leading-snug">{c.name}</h4>
                        <p className="text-[10px] text-slate-400 mt-0.5">{c.job?.title || "Direct Applicant"}</p>
                      </div>
                      <span className={`text-[8.5px] font-black uppercase tracking-wider font-mono px-2 py-0.5 rounded border shrink-0 ${getStatusColor(currentOverallStatus)
                        }`}>
                        {currentOverallStatus}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* RIGHT: VETTING ASSESSMENT MATRIX */}
          {selectedCand && (
            <div className="lg:col-span-8 space-y-4">
              <form onSubmit={handleSave} className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6 animate-fadeIn">
                {/* Profile header bar */}
                <div className="pb-4 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <span className="text-[9px] font-black tracking-widest text-[#714B67] uppercase font-mono">Verification Matrix Portal</span>
                    <h2 className="text-base font-black text-slate-800 mt-1">{selectedCand.name}</h2>
                    <p className="text-[10.5px] text-slate-500 mt-0.5">
                      Email: <strong className="text-slate-700 font-mono pr-2">{selectedCand.email}</strong> | Mobile: <strong className="text-slate-700 font-mono">{selectedCand.mobile}</strong>
                    </p>
                  </div>

                  {/* General status display and Edit button */}
                  <div className="flex items-center gap-3">
                    {!isEditing && (
                      <button
                        type="button"
                        onClick={() => setIsEditing(true)}
                        className="bg-[#714B67] hover:bg-[#5F3F56] text-white px-3 py-1.5 rounded text-xs font-bold shadow-sm transition-all"
                      >
                        Edit Details
                      </button>
                    )}
                    {isEditing && (
                      <button
                        type="button"
                        onClick={() => {
                          const matchVer = verifications.find((v: any) => v.candidate?._id === selectedCand._id || v.candidate === selectedCand._id);
                          applyVerificationData(matchVer);
                          setIsEditing(!matchVer);
                        }}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 px-3 py-1.5 rounded text-xs font-bold transition-all"
                      >
                        Cancel
                      </button>
                    )}
                    <span className="text-[9.5px] font-bold text-slate-600 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded font-mono uppercase">
                      Workflow status: <strong>{selectedCand.status}</strong>
                    </span>
                  </div>
                </div>

                {/* 9-Point Compliance checklist grid */}
                <div className="space-y-3">
                  <h4 className="text-[10px] font-black uppercase text-[#714B67] tracking-wider font-mono">
                    {!isEditing ? "Attached Documents & Vetting" : "9-Point Verification Checklist"}
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                    {/* 1. Aadhaar Check */}
                    {(isEditing || !!selectedCand.uploads?.aadhaar) && (
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex flex-col gap-1.5 justify-between">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-slate-800">1. Aadhaar Check</span>
                          <div className="flex items-center gap-2">
                            {selectedCand.uploads?.aadhaar && (
                              <button
                                type="button"
                                onClick={() => setPreviewFile({
                                  url: getAttachmentUrl(selectedCand.uploads.aadhaar),
                                  title: `Aadhaar Card - ${selectedCand.name}`
                                })}
                                className="text-[9px] font-bold text-indigo-600 hover:underline flex items-center gap-0.5"
                              >
                                <ExternalLink className="w-2.5 h-2.5" /> View Aadhaar
                              </button>
                            )}
                            {isEditing && (
                              <label className="text-[9px] font-bold text-[#714B67] hover:underline cursor-pointer flex items-center gap-0.5">
                                <Paperclip className="w-2.5 h-2.5" />
                                {uploadingField === "aadhaar" ? "Uploading..." : selectedCand.uploads?.aadhaar ? "Re-attach" : "Attach Document"}
                                <input
                                  type="file"
                                  accept="image/*,application/pdf"
                                  className="hidden"
                                  disabled={uploadingField !== null}
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) handleAttachDocument("aadhaar", file);
                                  }}
                                />
                              </label>
                            )}
                          </div>
                        </div>
                        {isEditing ? (
                          <select
                            value={aadhaarStatus}
                            onChange={(e) => setAadhaarStatus(e.target.value)}
                            className="rounded border border-slate-250 p-1.5 text-xs text-slate-800 focus:ring-[#714B67]"
                          >
                            <option value="Pending">Pending</option>
                            <option value="Verified">Verified</option>
                            <option value="Hold">Hold</option>
                            <option value="Rejected">Rejected</option>
                            <option value="High Risk">High Risk</option>
                          </select>
                        ) : (
                          <div className="flex items-center mt-1">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getStatusColor(aadhaarStatus)}`}>
                              {aadhaarStatus}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* 2. PAN Check */}
                    {(isEditing || !!selectedCand.uploads?.pan) && (
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex flex-col gap-1.5 justify-between">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-slate-800">2. PAN Check</span>
                          <div className="flex items-center gap-2">
                            {selectedCand.uploads?.pan && (
                              <button
                                type="button"
                                onClick={() => setPreviewFile({
                                  url: getAttachmentUrl(selectedCand.uploads.pan),
                                  title: `PAN Card - ${selectedCand.name}`
                                })}
                                className="text-[9px] font-bold text-indigo-600 hover:underline flex items-center gap-0.5"
                              >
                                <ExternalLink className="w-2.5 h-2.5" /> View PAN
                              </button>
                            )}
                            {isEditing && (
                              <label className="text-[9px] font-bold text-[#714B67] hover:underline cursor-pointer flex items-center gap-0.5">
                                <Paperclip className="w-2.5 h-2.5" />
                                {uploadingField === "pan" ? "Uploading..." : selectedCand.uploads?.pan ? "Re-attach" : "Attach Document"}
                                <input
                                  type="file"
                                  accept="image/*,application/pdf"
                                  className="hidden"
                                  disabled={uploadingField !== null}
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) handleAttachDocument("pan", file);
                                  }}
                                />
                              </label>
                            )}
                          </div>
                        </div>
                        {isEditing ? (
                          <select
                            value={panStatus}
                            onChange={(e) => setPanStatus(e.target.value)}
                            className="rounded border border-slate-250 p-1.5 text-xs text-slate-800 focus:ring-[#714B67]"
                          >
                            <option value="Pending">Pending</option>
                            <option value="Verified">Verified</option>
                            <option value="Hold">Hold</option>
                            <option value="Rejected">Rejected</option>
                            <option value="High Risk">High Risk</option>
                          </select>
                        ) : (
                          <div className="flex items-center mt-1">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getStatusColor(panStatus)}`}>
                              {panStatus}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* 3. Address Check */}
                    {isEditing && (
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex flex-col gap-1.5 justify-between">
                        <span className="text-xs font-bold text-slate-800">3. Address Vetting</span>
                        <select
                          value={addressStatus}
                          onChange={(e) => setAddressStatus(e.target.value)}
                          className="rounded border border-slate-250 p-1.5 text-xs text-slate-800 focus:ring-[#714B67]"
                        >
                          <option value="Pending">Pending</option>
                          <option value="Verified">Verified</option>
                          <option value="Hold">Hold</option>
                          <option value="Rejected">Rejected</option>
                          <option value="High Risk">High Risk</option>
                        </select>
                      </div>
                    )}

                    {/* 4. Previous Employer Check */}
                    {(isEditing || !!selectedCand.uploads?.salarySlip) && (
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex flex-col gap-1.5 justify-between">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-slate-800">4. Previous Employer</span>
                          <div className="flex items-center gap-2">
                            {selectedCand.uploads?.salarySlip && (
                              <button
                                type="button"
                                onClick={() => setPreviewFile({
                                  url: getAttachmentUrl(selectedCand.uploads.salarySlip),
                                  title: `Salary Slip - ${selectedCand.name}`
                                })}
                                className="text-[9px] font-bold text-indigo-600 hover:underline flex items-center gap-0.5"
                              >
                                <ExternalLink className="w-2.5 h-2.5" /> Salary Slip
                              </button>
                            )}
                            {isEditing && (
                              <label className="text-[9px] font-bold text-[#714B67] hover:underline cursor-pointer flex items-center gap-0.5">
                                <Paperclip className="w-2.5 h-2.5" />
                                {uploadingField === "salarySlip" ? "Uploading..." : selectedCand.uploads?.salarySlip ? "Re-attach" : "Attach Document"}
                                <input
                                  type="file"
                                  accept="image/*,application/pdf"
                                  className="hidden"
                                  disabled={uploadingField !== null}
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) handleAttachDocument("salarySlip", file);
                                  }}
                                />
                              </label>
                            )}
                          </div>
                        </div>
                        {isEditing ? (
                          <select
                            value={employerStatus}
                            onChange={(e) => setEmployerStatus(e.target.value)}
                            className="rounded border border-slate-250 p-1.5 text-xs text-slate-800 focus:ring-[#714B67]"
                          >
                            <option value="Pending">Pending</option>
                            <option value="Verified">Verified</option>
                            <option value="Hold">Hold</option>
                            <option value="Rejected">Rejected</option>
                            <option value="High Risk">High Risk</option>
                          </select>
                        ) : (
                          <div className="flex items-center mt-1">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getStatusColor(employerStatus)}`}>
                              {employerStatus}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* 5. References Check */}
                    {isEditing && (
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex flex-col gap-1.5 justify-between">
                        <span className="text-xs font-bold text-slate-800">5. References Vetting</span>
                        <select
                          value={referencesStatus}
                          onChange={(e) => setReferencesStatus(e.target.value)}
                          className="rounded border border-slate-250 p-1.5 text-xs text-slate-800 focus:ring-[#714B67]"
                        >
                          <option value="Pending">Pending</option>
                          <option value="Verified">Verified</option>
                          <option value="Hold">Hold</option>
                          <option value="Rejected">Rejected</option>
                          <option value="High Risk">High Risk</option>
                        </select>
                      </div>
                    )}

                    {/* 6. CIBIL Score Check */}
                    {isEditing && (
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex flex-col gap-1.5 justify-between">
                        <span className="text-xs font-bold text-slate-800">6. CIBIL Verification</span>
                        <select
                          value={cibilStatus}
                          onChange={(e) => setCibilStatus(e.target.value)}
                          className="rounded border border-slate-250 p-1.5 text-xs text-slate-800 focus:ring-[#714B67]"
                        >
                          <option value="Pending">Pending</option>
                          <option value="Verified">Verified</option>
                          <option value="Hold">Hold</option>
                          <option value="Rejected">Rejected</option>
                          <option value="High Risk">High Risk</option>
                        </select>
                      </div>
                    )}

                    {/* 7. Bank Statement Check */}
                    {(isEditing || !!selectedCand.uploads?.bankStatement) && (
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex flex-col gap-1.5 justify-between">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-slate-800">7. Bank Statement Vetting</span>
                          <div className="flex items-center gap-2">
                            {selectedCand.uploads?.bankStatement && (
                              <button
                                type="button"
                                onClick={() => setPreviewFile({
                                  url: getAttachmentUrl(selectedCand.uploads.bankStatement),
                                  title: `Bank Statement - ${selectedCand.name}`
                                })}
                                className="text-[9px] font-bold text-indigo-600 hover:underline flex items-center gap-0.5"
                              >
                                <ExternalLink className="w-2.5 h-2.5" /> Bank Statement
                              </button>
                            )}
                            {isEditing && (
                              <label className="text-[9px] font-bold text-[#714B67] hover:underline cursor-pointer flex items-center gap-0.5">
                                <Paperclip className="w-2.5 h-2.5" />
                                {uploadingField === "bankStatement" ? "Uploading..." : selectedCand.uploads?.bankStatement ? "Re-attach" : "Attach Document"}
                                <input
                                  type="file"
                                  accept="image/*,application/pdf"
                                  className="hidden"
                                  disabled={uploadingField !== null}
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) handleAttachDocument("bankStatement", file);
                                  }}
                                />
                              </label>
                            )}
                          </div>
                        </div>
                        {isEditing ? (
                          <select
                            value={bankStatus}
                            onChange={(e) => setBankStatus(e.target.value)}
                            className="rounded border border-slate-250 p-1.5 text-xs text-slate-800 focus:ring-[#714B67]"
                          >
                            <option value="Pending">Pending</option>
                            <option value="Verified">Verified</option>
                            <option value="Hold">Hold</option>
                            <option value="Rejected">Rejected</option>
                            <option value="High Risk">High Risk</option>
                          </select>
                        ) : (
                          <div className="flex items-center mt-1">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getStatusColor(bankStatus)}`}>
                              {bankStatus}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* 8. Police Verification Check */}
                    {isEditing && (
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex flex-col gap-1.5 justify-between">
                        <span className="text-xs font-bold text-slate-800">8. Police Verification</span>
                        <select
                          value={policeStatus}
                          onChange={(e) => setPoliceStatus(e.target.value)}
                          className="rounded border border-slate-250 p-1.5 text-xs text-slate-800 focus:ring-[#714B67]"
                        >
                          <option value="Pending">Pending</option>
                          <option value="Verified">Verified</option>
                          <option value="Hold">Hold</option>
                          <option value="Rejected">Rejected</option>
                          <option value="High Risk">High Risk</option>
                        </select>
                      </div>
                    )}

                    {/* 9. Social Media Review Check */}
                    {isEditing && (
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex flex-col gap-1.5 justify-between md:col-span-2">
                        <span className="text-xs font-bold text-slate-800">9. Social Media Compliance Audit</span>
                        <select
                          value={socialMediaStatus}
                          onChange={(e) => setSocialMediaStatus(e.target.value)}
                          className="rounded border border-slate-250 p-1.5 text-xs text-slate-800 focus:ring-[#714B67]"
                        >
                          <option value="Pending">Pending</option>
                          <option value="Verified">Verified</option>
                          <option value="Hold">Hold</option>
                          <option value="Rejected">Rejected</option>
                          <option value="High Risk">High Risk</option>
                        </select>
                      </div>
                    )}

                  </div>
                </div>

                {/* Remarks & Notes */}
                <div className="space-y-4 pt-2">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-slate-650">Compliance Remarks & Assessment Notes:</label>
                    {isEditing ? (
                      <textarea
                        value={remarks}
                        onChange={(e) => setRemarks(e.target.value)}
                        placeholder="Input references log, audit markers, CIBIL score flags, and address verification notes..."
                        className="rounded border border-slate-250 p-2 text-slate-800 focus:ring-[#714B67] focus:border-[#714B67] h-20 text-xs font-semibold"
                        required
                      />
                    ) : (
                      <div className="w-full bg-slate-50 border border-slate-200 rounded p-3 text-xs text-slate-700 min-h-[60px] font-semibold whitespace-pre-wrap">
                        {remarks || "No remarks entered."}
                      </div>
                    )}
                  </div>

                  {isEditing ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-slate-650">Final Background Vetting Status:</label>
                        <select
                          value={overallStatus}
                          onChange={(e) => setOverallStatus(e.target.value)}
                          className="rounded border border-slate-250 p-2 text-slate-800 focus:ring-[#714B67] focus:border-[#714B67] font-bold text-xs"
                        >
                          <option value="Pending">Pending Audit</option>
                          <option value="Verified">Verified & Cleared</option>
                          <option value="Hold">On Hold (Pending Docs)</option>
                          <option value="Rejected">Rejected Compliance</option>
                          <option value="High Risk">High Risk Flagged</option>
                        </select>
                      </div>

                      <div className="flex items-end">
                        <button
                          type="submit"
                          disabled={submitting}
                          className="w-full bg-[#714B67] hover:bg-[#5F3F56] text-white p-2.5 rounded font-black shadow flex items-center justify-center gap-1.5 hover:scale-[1.01] active:scale-[0.99] transition-all text-xs"
                        >
                          {submitting ? "Saving Matrix..." : "Save Verification Record"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase text-[#714B67] tracking-wider font-mono">Final Vetting Status:</span>
                        <span className={`text-xs font-black uppercase px-2.5 py-1 rounded border tracking-wide ${getStatusColor(overallStatus)}`}>
                          {overallStatus === "Verified" ? "Verified & Cleared" : overallStatus === "Hold" ? "Hold / Addl. Docs" : overallStatus}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Police high risk trigger notice */}
                {(overallStatus === "High Risk" || policeStatus === "High Risk") && (
                  <div className="bg-red-50 border border-red-250 rounded-lg p-3 text-[10px] text-red-700 font-bold flex items-start gap-2 animate-bounce">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-red-600 mt-0.5" />
                    <div>
                      <strong>Critical Action Flagged:</strong> Saving this vetting record with "High Risk" status will automatically transition the candidate's core profile status to **High Risk** and trigger warning indicators on the Owner & Director command panels!
                    </div>
                  </div>
                )}

              </form>
            </div>
          )}

        </div>
      )}

      {previewFile && (
        <FilePreviewModal
          url={previewFile.url}
          title={previewFile.title}
          onClose={() => setPreviewFile(null)}
        />
      )}
    </div>
  );
}

export function InterviewsQueue({ triggerToast }: { triggerToast: (msg: string) => void; }) {
  const { data: session } = useSession();
  const userRole = (session?.user as any)?.role;
  const isAuthorized = userRole === "HR Head" || userRole === "Owner";

  const [editingInterviewId, setEditingInterviewId] = useState<string | null>(null);
  const [interviews, setInterviews] = useState<any[]>([]);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedInt, setSelectedInt] = useState<any>(null);

  // Schedule Form State
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [schedCandidateId, setSchedCandidateId] = useState("");
  const [schedRound, setSchedRound] = useState("1");
  const [schedDate, setSchedDate] = useState("");
  const [schedTime, setSchedTime] = useState("");
  const [schedVideoLink, setSchedVideoLink] = useState("");
  const [schedInterviewMode, setSchedInterviewMode] = useState<"online" | "offline">("online");

  // Assessment State
  const [communicationScore, setCommunicationScore] = useState<number>(80);
  const [skillScore, setSkillScore] = useState<number>(80);
  const [behaviourScore, setBehaviourScore] = useState<number>(80);
  const [stabilityScore, setStabilityScore] = useState<number>(80);
  const [riskScore, setRiskScore] = useState<number>(20);
  const [remarks, setRemarks] = useState("");
  const [roundStatus, setRoundStatus] = useState("Selected");
  const [submitting, setSubmitting] = useState(false);
  const [customQuestions, setCustomQuestions] = useState<{ question: string; isCorrect: boolean | null }[]>([]);
  const [newQuestionText, setNewQuestionText] = useState("");
  const [tailoringId, setTailoringId] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const resInt = await fetch("/api/interviews");
      const dataInt = await resInt.json();
      if (dataInt.success) {
        setInterviews(Array.isArray(dataInt.data) ? dataInt.data : []);
      }

      const resCand = await fetch("/api/candidates");
      const dataCand = await resCand.json();
      if (dataCand.success) {
        const list = Array.isArray(dataCand.data) ? dataCand.data : [];
        setCandidates(list.filter((c: any) => c && c.status === "Selected"));
      }
    } catch (err) {
      triggerToast("Error loading interview dashboard data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Update proposed video link when candidate changes
  useEffect(() => {
    if (schedCandidateId) {
      setSchedVideoLink(`https://meet.acolyte.in/round${schedRound}-${schedCandidateId.slice(-6)}`);
    }
  }, [schedCandidateId, schedRound]);

  const handleEditClick = (item: any) => {
    setEditingInterviewId(item._id);
    setSchedCandidateId(item.candidate?._id || "");
    setSchedRound(item.round ? item.round.toString() : "1");
    if (item.scheduleTime) {
      const d = new Date(item.scheduleTime);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      setSchedDate(`${year}-${month}-${day}`);

      const hours = String(d.getHours()).padStart(2, "0");
      const minutes = String(d.getMinutes()).padStart(2, "0");
      setSchedTime(`${hours}:${minutes}`);
    } else {
      setSchedDate("");
      setSchedTime("");
    }
    setSchedInterviewMode(item.mode || "online");
    setSchedVideoLink(item.videoLink || "");
    setShowScheduleForm(true);
  };

  const handleDeleteClick = async (id: string) => {
    try {
      const res = await fetch(`/api/interviews?id=${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        triggerToast("Scheduled interview deleted successfully!");
        loadData();
      } else {
        triggerToast(`Failed to delete: ${data.error}`);
      }
    } catch (err) {
      triggerToast("Network error deleting interview");
    }
  };

  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schedCandidateId || !schedDate || !schedTime) {
      triggerToast("Please fill in candidate, date and time parameters!");
      return;
    }

    // Validate round progression: Candidate can only be scheduled for round if they've cleared previous rounds
    const targetRound = parseInt(schedRound);
    if (targetRound > 1) {
      const selectedCand = candidates.find(c => c._id === schedCandidateId);
      if (selectedCand) {
        const currentRound = selectedCand.currentRound || 1;
        if (currentRound < targetRound) {
          triggerToast(`Cannot schedule Round-${targetRound} interview. Candidate must clear Round-${targetRound - 1} first.`);
          return;
        }
      }
    }

    try {
      if (editingInterviewId) {
        const res = await fetch("/api/interviews", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            interviewId: editingInterviewId,
            round: parseInt(schedRound),
            scheduleTime: `${schedDate}T${schedTime}`,
            videoLink: schedInterviewMode === "offline" ? "" : schedVideoLink,
            mode: schedInterviewMode,
          }),
        });
        const data = await res.json();
        if (data.success) {
          triggerToast(`Interview schedule successfully updated!`);
          setShowScheduleForm(false);
          setEditingInterviewId(null);
          setSchedCandidateId("");
          setSchedInterviewMode("online");
          loadData();
        } else {
          triggerToast(`Failed to update schedule: ${data.error}`);
        }
      } else {
        const res = await fetch("/api/interviews", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            candidateId: schedCandidateId,
            round: parseInt(schedRound),
            scheduleTime: `${schedDate}T${schedTime}`,
            videoLink: schedInterviewMode === "offline" ? "" : (schedVideoLink || `https://meet.acolyte.in/round${schedRound}-${schedCandidateId.slice(-6)}`),
            mode: schedInterviewMode,
          }),
        });
        const data = await res.json();
        if (data.success) {
          triggerToast(`Round-${schedRound} interview successfully scheduled!`);
          setShowScheduleForm(false);
          setSchedCandidateId("");
          setSchedInterviewMode("online");
          loadData();
        } else {
          triggerToast(`Failed to schedule: ${data.error}`);
        }
      }
    } catch (err) {
      triggerToast("Network error submitting interview");
    }
  };

  const handleAssessmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInt) return;

    const isBeforeScheduleTime = new Date() < new Date(selectedInt.scheduleTime);
    if (isBeforeScheduleTime) {
      triggerToast("Assessment cannot be logged before the scheduled interview time.");
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch("/api/interviews", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          interviewId: selectedInt._id,
          communicationScore,
          skillScore,
          behaviourScore,
          stabilityScore,
          riskScore,
          remarks,
          status: roundStatus,
          customQuestions: customQuestions.filter((q: any) => q.isCorrect === true || q.isCorrect === false),
        }),
      });
      const data = await res.json();
      if (data.success) {
        triggerToast(`Assessment logged! Candidate advanced/marked as: ${roundStatus}`);
        setSelectedInt(null);
        setRemarks("");
        loadData();
      } else {
        triggerToast(`Failed: ${data.error}`);
      }
    } catch (err) {
      triggerToast("Network error submitting assessment");
    } finally {
      setSubmitting(false);
    }
  };

  const handleTailorQuestions = async (interviewId: string) => {
    setTailoringId(interviewId);
    try {
      const res = await fetch("/api/interviews/tailor-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interviewId }),
      });
      const data = await res.json();
      if (data.success) {
        setCustomQuestions(data.questions);
        triggerToast("✨ AI customized questions generated successfully!");
      } else {
        triggerToast(`Failed to tailor questions: ${data.error}`);
      }
    } catch (err) {
      triggerToast("Network error generating assessment questions");
    } finally {
      setTailoringId(null);
    }
  };

  const formatInterviewTime = (timeStr: any) => {
    if (!timeStr) return "N/A";
    const d = new Date(timeStr);
    if (isNaN(d.getTime())) return "N/A";
    return `${d.toLocaleDateString()} @ ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  return (
    <div className="space-y-8 animate-fadeIn text-slate-800">

      {/* Upper header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-800">Interviews Queue Tab</h1>
          <p className="text-xs text-slate-500 mt-1">Schedules, Google Meet URLs, and AI custom interview question desks</p>
        </div>
        <button
          onClick={() => {
            if (showScheduleForm) {
              setEditingInterviewId(null);
              setSchedCandidateId("");
              setSchedRound("1");
              setSchedDate("");
              setSchedTime("");
              setSchedVideoLink("");
              setSchedInterviewMode("online");
            }
            setShowScheduleForm(!showScheduleForm);
          }}
          className="bg-[#714B67] hover:bg-[#5F3F56] text-white px-4 py-2.5 rounded-lg text-xs font-black shadow transition-all flex items-center gap-1.5 self-start"
        >
          <Plus className="w-4 h-4" /> {showScheduleForm ? "Close Scheduler" : "Schedule New Interview"}
        </button>
      </div>

      {/* SCHEDULE FORM MODULE */}
      {showScheduleForm && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4 animate-fadeIn">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <Video className="w-4 h-4 text-[#714B67]" />
            <h3 className="text-xs font-black uppercase text-slate-700 tracking-wider font-mono">
              {editingInterviewId ? "Edit Scheduled Interview" : "Schedule New Virtual Interview"}
            </h3>
          </div>

          <form onSubmit={handleScheduleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs font-semibold text-slate-650">

            {/* Candidate selection */}
            <div className="flex flex-col gap-1.5">
              <label>Select Candidate:</label>
              <select
                value={schedCandidateId}
                onChange={(e) => setSchedCandidateId(e.target.value)}
                disabled={!!editingInterviewId}
                className="rounded border border-slate-250 p-2 text-slate-800 focus:ring-[#714B67] focus:border-[#714B67] disabled:bg-slate-50 disabled:text-slate-500"
                required
              >
                <option value="">-- Choose Candidate --</option>
                {candidates.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name} ({c.job?.title || "DSM"} - Round {c.currentRound || 1})
                  </option>
                ))}
              </select>
            </div>

            {/* Rounds selection */}
            <div className="flex flex-col gap-1.5">
              <label>Assessment Round:</label>
              <select
                value={schedRound}
                onChange={(e) => setSchedRound(e.target.value)}
                className="rounded border border-slate-250 p-2 text-slate-800 focus:ring-[#714B67] focus:border-[#714B67]"
              >
                <option value="1">Round-1: HR Assessment</option>
                <option value="2">Round-2: HR + Department Manager</option>
                <option value="3">Round-3: HR + DSM + Management (Mandatory)</option>
              </select>
            </div>

            {/* Date selection */}
            <div className="flex flex-col gap-1.5">
              <label>Schedule Date:</label>
              <input
                type="date"
                value={schedDate}
                onChange={(e) => setSchedDate(e.target.value)}
                className="rounded border border-slate-250 p-2 text-slate-800 focus:ring-[#714B67]"
                required
              />
            </div>
            {/* Time selection */}
            <div className="flex flex-col gap-1.5">
              <label>Schedule Time:</label>
              <input
                type="time"
                value={schedTime}
                onChange={(e) => setSchedTime(e.target.value)}
                className="rounded border border-slate-250 p-2 text-slate-800 focus:ring-[#714B67]"
                required
              />
            </div>

            {/* Interview Mode selection */}
            <div className="flex flex-col gap-1.5">
              <label>Interview Mode:</label>
              <select
                value={schedInterviewMode}
                onChange={(e) => setSchedInterviewMode(e.target.value as "online" | "offline")}
                className="rounded border border-slate-250 p-2 text-slate-800 focus:ring-[#714B67] focus:border-[#714B67]"
              >
                <option value="online">Online</option>
                <option value="offline">Offline</option>
              </select>
            </div>

            {/* Video link preview */}
            {schedInterviewMode === "online" ? (
              <div className="md:col-span-2 flex flex-col gap-1.5 animate-fadeIn">
                <label>Virtual Meeting Link (Suggested Google Meet):</label>
                <input
                  type="url"
                  value={schedVideoLink}
                  onChange={(e) => setSchedVideoLink(e.target.value)}
                  placeholder="Google Meet or Zoom Video url"
                  className="rounded border border-slate-250 p-2 text-slate-800 focus:ring-[#714B67]"
                />
              </div>
            ) : (
              <div className="md:col-span-2" />
            )}

            <div className="flex items-end gap-2">
              {editingInterviewId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingInterviewId(null);
                    setShowScheduleForm(false);
                    setSchedCandidateId("");
                    setSchedRound("1");
                    setSchedDate("");
                    setSchedTime("");
                    setSchedVideoLink("");
                    setSchedInterviewMode("online");
                  }}
                  className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-700 p-2 rounded font-bold shadow text-center transition-all"
                >
                  Cancel
                </button>
              )}
              <button
                type="submit"
                className="flex-1 bg-[#714B67] hover:bg-[#5F3F56] text-white p-2 rounded font-bold shadow text-center transition-all"
              >
                {editingInterviewId ? "Save Changes" : "Confirm Schedule"}
              </button>
            </div>
          </form>

          {/* Round 3 warning message */}
          <div className="bg-amber-50 border border-amber-250 rounded-lg p-3 text-[10px] text-amber-700 font-bold flex items-start gap-2">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-600 mt-0.5" />
            <div>
              <strong>Process Notice:</strong> Round-3: HR + DSM + Management is strictly mandatory for ultimate recruitment finalization. Ensure previous assessment scores are documented.
            </div>
          </div>
        </div>
      )}

      {/* INTERVIEW QUEUE FEED PANEL */}
      <div className="grid grid-cols-1 gap-8">

        {/* PANEL: LIST OF SCHEDULED INTERVIEWS */}
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider font-mono">Scheduled Assessment Feed</h3>

            {loading && interviews.length === 0 ? (
              <div className="text-center py-10 font-bold text-slate-400 font-mono text-xs">Loading schedules queue...</div>
            ) : interviews.length === 0 ? (
              <div className="text-center py-12 bg-slate-50 border border-dashed rounded-lg text-slate-450 p-4">
                <Video className="w-10 h-10 mx-auto text-[#714B67]/30 mb-2" />
                <p className="text-xs font-bold text-slate-655">No interviews currently queued.</p>
                <p className="text-[10px] text-slate-400 mt-1">Use the scheduler tool above to create assessment schedules.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 font-black uppercase font-mono tracking-wider">
                      <th className="pb-3 pr-2">Candidate</th>
                      <th className="pb-3 px-2">Vacancy</th>
                      <th className="pb-3 px-2">Mode</th>
                      <th className="pb-3 px-2">Round</th>
                      <th className="pb-3 px-2">Timing</th>
                      <th className="pb-3 px-2">Round Status</th>
                      <th className="pb-3 pl-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                    {interviews.map((item) => {
                      if (!item) return null;
                      const cand = item.candidate || {};
                      const isSelected = selectedInt?._id === item._id;
                      const isBeforeScheduleTime = new Date() < new Date(item.scheduleTime);
                      return (
                        <React.Fragment key={item._id}>
                          <tr
                            onClick={() => {
                              if (isSelected) {
                                setSelectedInt(null);
                              } else {
                                setSelectedInt(item);
                                setRemarks(item.remarks || "");
                                setCommunicationScore(item.communicationScore || 80);
                                setSkillScore(item.skillScore || 80);
                                setBehaviourScore(item.behaviourScore || 80);
                                setStabilityScore(item.stabilityScore || 80);
                                setRiskScore(item.riskScore || 20);
                                setRoundStatus(item.status || "Selected");

                                // Set customQuestions from database, or fallback to candidate's AI screening questions if not assessed yet
                                const isAssessed = item.status !== "Pending";
                                const initialQuestions = isAssessed
                                  ? (item.customQuestions || [])
                                    .filter((q: any) => q.isCorrect === true || q.isCorrect === false)
                                    .map((q: any) => ({ question: q.question, isCorrect: q.isCorrect }))
                                  : (item.customQuestions && item.customQuestions.length > 0
                                    ? item.customQuestions.map((q: any) => ({ question: q.question, isCorrect: q.isCorrect }))
                                    : (cand.screeningResult?.suggestedQuestions || []).map((q: string) => ({ question: q, isCorrect: null })));
                                setCustomQuestions(initialQuestions);
                                setNewQuestionText("");
                              }
                            }}
                            className={`hover:bg-slate-50/50 cursor-pointer transition-all ${isSelected ? "bg-indigo-50/40" : ""}`}
                          >
                            <td className="py-3 pr-2">
                              <div className="font-bold text-slate-800">{cand.name || "Deleted Candidate"}</div>
                              <div className="text-[10px] text-slate-400 mt-0.5">{cand.mobile || "N/A"}</div>
                            </td>
                            <td className="py-3 px-2">
                              <span className="text-[10.5px] text-[#714B67] font-bold">
                                {item.vacancyName || cand.job?.title || "General Application"}
                              </span>
                            </td>
                            <td className="py-3 px-2">
                              <span className={`text-[9px] font-black px-2 py-0.5 rounded border uppercase font-mono ${(item.mode === "offline" || (!item.mode && !item.videoLink))
                                ? "bg-rose-50 border-rose-250 text-rose-700 font-bold"
                                : "bg-sky-50 border-sky-250 text-sky-700 font-bold"
                                }`}>
                                {item.mode ? item.mode : (item.videoLink ? "online" : "offline")}
                              </span>
                            </td>
                            <td className="py-3 px-2">
                              <span className={`text-[9px] font-black px-2 py-0.5 rounded border ${item.round === 3 ? "bg-indigo-50 border-indigo-200 text-indigo-600" : "bg-slate-50 border-slate-200 text-slate-600"
                                }`}>
                                Round {item.round}
                              </span>
                            </td>
                            <td className="py-3 px-2 font-mono text-[10px] text-slate-500">
                              {formatInterviewTime(item.scheduleTime)}
                            </td>
                            <td className="py-3 px-2">
                              <span className={`text-[9px] font-bold px-2 py-0.5 rounded border ${item.status === "Selected"
                                ? "bg-emerald-50 border-emerald-250 text-emerald-600 font-bold"
                                : item.status === "Pending"
                                  ? "bg-amber-50 border-amber-250 text-amber-600"
                                  : "bg-rose-100 border-rose-250 text-rose-700"
                                }`}>
                                {item.status}
                              </span>
                            </td>
                            <td className="py-3 pl-2 text-right space-x-1.5 whitespace-nowrap">
                              <button className="bg-[#714B67] hover:bg-[#5F3F56] text-white font-bold px-2.5 py-1 rounded text-[10.5px]">
                                {isSelected ? "Hide" : "Show"}
                              </button>
                              {isAuthorized && (
                                <>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleEditClick(item);
                                    }}
                                    className="bg-[#714B67] hover:bg-amber-600 text-white font-bold px-2.5 py-1 rounded text-[10.5px] transition-all"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (confirm("Are you sure you want to delete this scheduled interview?")) {
                                        handleDeleteClick(item._id);
                                      }
                                    }}
                                    className="bg-[#714B67] hover:bg-rose-700 text-white font-bold px-2.5 py-1 rounded text-[10.5px] transition-all"
                                  >
                                    Delete
                                  </button>
                                </>
                              )}
                            </td>
                          </tr>
                          {isSelected && (
                            <tr className="bg-slate-50/70 border-b border-slate-250">
                              <td colSpan={7} className="px-6 py-5">
                                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-md space-y-5 animate-fadeIn max-w-4xl mx-auto text-slate-800">

                                  <div className="pb-3 border-b border-slate-100 flex justify-between items-start gap-4">
                                    <div>
                                      <span className="text-[9px] font-black tracking-widest text-[#714B67] uppercase font-mono">Conducting Assessment Portal</span>
                                      <h2 className="text-base font-black text-slate-800 mt-1">{item.candidate?.name || "Deleted Candidate"}</h2>
                                      <p className="text-[10.5px] text-slate-500 mt-0.5">Round Applied: <strong className="text-slate-700">Round-{item.round}</strong></p>
                                    </div>
                                    {item.videoLink && (
                                      <a
                                        href={item.videoLink}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="bg-[#128C7E] hover:bg-[#0e7065] text-white px-3 py-2 rounded text-[10.5px] font-black shadow flex items-center gap-1.5 transition-all"
                                      >
                                        <Video className="w-3.5 h-3.5 shrink-0 animate-pulse" /> Join Video Interview
                                      </a>
                                    )}
                                  </div>

                                  {isBeforeScheduleTime && (
                                    <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg text-xs font-semibold flex items-center gap-2">
                                      <span className="text-lg">⚠️</span>
                                      <div>
                                        <strong>Assessment Locked:</strong> This interview is scheduled for {formatInterviewTime(item.scheduleTime)}. You can only fill out and submit the assessment form once the scheduled interview time has crossed.
                                      </div>
                                    </div>
                                  )}

                                  <form onSubmit={handleAssessmentSubmit} className="space-y-4 text-xs font-semibold text-slate-650">

                                    {/* 1. Video Meeting URL Link */}
                                    <div className="flex flex-col gap-1.5">
                                      <label>Scheduled Video Call url:</label>
                                      <div className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded font-mono text-[10.5px] text-slate-600">
                                        <Video className="w-4 h-4 shrink-0 text-slate-400" />
                                        <span className="truncate break-all select-all flex-1">{item.videoLink || "No Link Provided"}</span>
                                      </div>
                                    </div>

                                    {/* 2. AI Tailored Screening Questions Display */}
                                    <div className="space-y-2">
                                      <div className="flex justify-between items-center pb-1">
                                        <label className="text-[10px] font-black uppercase text-[#714B67] tracking-wider font-mono">
                                          AI Customized Assessment Questions
                                        </label>
                                        <button
                                          type="button"
                                          onClick={() => handleTailorQuestions(item._id)}
                                          disabled={tailoringId === item._id}
                                          className="text-[9.5px] font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 border border-indigo-200 px-2 py-1 rounded flex items-center gap-1 transition-all"
                                        >
                                          {tailoringId === item._id ? "Tailoring..." : "✨ Tailor with AI"}
                                        </button>
                                      </div>

                                      <div className="space-y-3">
                                        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar space-y-2.5">
                                          {customQuestions.length > 0 ? (
                                            customQuestions.map((qObj, idx) => (
                                              <div key={idx} className="flex items-center justify-between gap-3 text-[10.5px] leading-relaxed border-b border-slate-150 pb-2 last:border-b-0">
                                                <div className="flex items-start gap-1 flex-1">
                                                  <strong className="text-[#714B67] font-mono pr-1">{idx + 1}.</strong>
                                                  <span className="break-words text-slate-700">{qObj.question}</span>
                                                </div>

                                                <div className="flex items-center gap-3 shrink-0">
                                                  {/* Correct Option */}
                                                  <label className="flex items-center gap-1 cursor-pointer select-none">
                                                    <input
                                                      type="checkbox"
                                                      disabled={isBeforeScheduleTime}
                                                      checked={qObj.isCorrect === true}
                                                      onChange={() => {
                                                        const newVal = qObj.isCorrect === true ? null : true;
                                                        setCustomQuestions(prev => prev.map((q, i) => i === idx ? { ...q, isCorrect: newVal } : q));
                                                      }}
                                                      className="w-3.5 h-3.5 text-emerald-600 focus:ring-emerald-500 rounded border-slate-350 disabled:opacity-50 disabled:cursor-not-allowed"
                                                    />
                                                    <span className={`text-[9.5px] font-bold ${qObj.isCorrect === true ? "text-emerald-600" : "text-slate-400"}`}>Correct</span>
                                                  </label>

                                                  {/* Incorrect Option */}
                                                  <label className="flex items-center gap-1 cursor-pointer select-none">
                                                    <input
                                                      type="checkbox"
                                                      disabled={isBeforeScheduleTime}
                                                      checked={qObj.isCorrect === false}
                                                      onChange={() => {
                                                        const newVal = qObj.isCorrect === false ? null : false;
                                                        setCustomQuestions(prev => prev.map((q, i) => i === idx ? { ...q, isCorrect: newVal } : q));
                                                      }}
                                                      className="w-3.5 h-3.5 text-rose-600 focus:ring-rose-500 rounded border-slate-355 disabled:opacity-50 disabled:cursor-not-allowed"
                                                    />
                                                    <span className={`text-[9.5px] font-bold ${qObj.isCorrect === false ? "text-rose-600" : "text-slate-400"}`}>Incorrect</span>
                                                  </label>

                                                  {/* Delete Question Button */}
                                                  <button
                                                    type="button"
                                                    disabled={isBeforeScheduleTime}
                                                    onClick={() => {
                                                      setCustomQuestions(prev => prev.filter((_, i) => i !== idx));
                                                    }}
                                                    className="text-slate-400 hover:text-rose-600 transition-colors p-0.5 ml-1 disabled:opacity-50 disabled:cursor-not-allowed"
                                                    title="Remove Question"
                                                  >
                                                    <Trash className="w-3.5 h-3.5" />
                                                  </button>
                                                </div>
                                              </div>
                                            ))
                                          ) : (
                                            <span className="text-slate-400 italic block text-center py-2 font-medium">No custom questions added yet. You can add one below.</span>
                                          )}
                                        </div>

                                        {/* Input to add a new question */}
                                        <div className="flex gap-2">
                                          <input
                                            type="text"
                                            disabled={isBeforeScheduleTime}
                                            value={newQuestionText}
                                            onChange={(e) => setNewQuestionText(e.target.value)}
                                            placeholder={isBeforeScheduleTime ? "Locked until scheduled interview time" : "Write a custom assessment question..."}
                                            className="flex-1 bg-white border border-slate-250 rounded px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#714B67] placeholder-slate-400 font-semibold disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed"
                                            onKeyDown={(e) => {
                                              if (e.key === "Enter") {
                                                e.preventDefault();
                                                if (newQuestionText.trim()) {
                                                  setCustomQuestions(prev => [...prev, { question: newQuestionText.trim(), isCorrect: null }]);
                                                  setNewQuestionText("");
                                                }
                                              }
                                            }}
                                          />
                                          <button
                                            type="button"
                                            disabled={isBeforeScheduleTime}
                                            onClick={() => {
                                              if (newQuestionText.trim()) {
                                                setCustomQuestions(prev => [...prev, { question: newQuestionText.trim(), isCorrect: null }]);
                                                setNewQuestionText("");
                                              }
                                            }}
                                            className="bg-[#714B67] hover:bg-[#5F3F56] text-white px-3 py-1.5 rounded text-xs font-bold transition-all shadow-sm shrink-0 disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed"
                                          >
                                            + Add
                                          </button>
                                        </div>
                                      </div>
                                    </div>

                                    {/* 3. Granular FORM-4 Score Entry */}
                                    <div className="space-y-4 bg-slate-50 border border-slate-200 p-4 rounded-xl">
                                      <h4 className="text-[10px] font-black uppercase text-[#714B67] tracking-wider font-mono border-b border-slate-200 pb-2 mb-2">Form-4: Assessment Metrics</h4>

                                      {[
                                        { label: "Communication Score", val: communicationScore, setter: setCommunicationScore },
                                        { label: "Skill / Technical Score", val: skillScore, setter: setSkillScore },
                                        { label: "Behaviour / Culture Fit", val: behaviourScore, setter: setBehaviourScore },
                                        { label: "Stability Score", val: stabilityScore, setter: setStabilityScore },
                                        { label: "Risk Factor (Lower is better)", val: riskScore, setter: setRiskScore }
                                      ].map((metric, idx) => (
                                        <div key={idx} className="flex flex-col gap-1.5">
                                          <div className="flex justify-between items-center text-[10.5px]">
                                            <label>{metric.label}:</label>
                                            <strong className="text-xs font-mono text-[#714B67]">{metric.val}%</strong>
                                          </div>
                                          <input
                                            type="range"
                                            min="0"
                                            max="100"
                                            disabled={isBeforeScheduleTime}
                                            value={metric.val}
                                            onChange={(e) => metric.setter(parseInt(e.target.value))}
                                            className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#714B67] disabled:opacity-50 disabled:cursor-not-allowed"
                                          />
                                        </div>
                                      ))}
                                    </div>

                                    {/* 4. Remarks entry */}
                                    <div className="flex flex-col gap-1.5">
                                      <label>Interviewer Feedback Remarks:</label>
                                      <textarea
                                        value={remarks}
                                        disabled={isBeforeScheduleTime}
                                        onChange={(e) => setRemarks(e.target.value)}
                                        placeholder={isBeforeScheduleTime ? "Locked until scheduled interview time" : "Enter assessment remarks, strengths, values and compliance flags..."}
                                        className="rounded border border-slate-250 p-2 text-slate-800 focus:ring-[#714B67] focus:border-[#714B67] h-20 text-xs disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed"
                                        required={!isBeforeScheduleTime}
                                      />
                                    </div>

                                    {/* 5. Round Status & Final override */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                      <div className="flex flex-col gap-1.5">
                                        <label>Assign Round Decision:</label>
                                        <select
                                          value={roundStatus}
                                          disabled={isBeforeScheduleTime}
                                          onChange={(e) => setRoundStatus(e.target.value)}
                                          className="rounded border border-slate-250 p-2 text-slate-800 focus:ring-[#714B67] focus:border-[#714B67] disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed"
                                        >
                                          <option value="Selected">Select / Advance Candidate</option>
                                          <option value="Pending">Keep Pending</option>
                                          <option value="Hold">Put on Hold</option>
                                          <option value="Rejected">Reject Profile</option>
                                          <option value="High Risk">Flag High Risk</option>
                                        </select>
                                      </div>

                                      <div className="flex items-end">
                                        <button
                                          type="submit"
                                          disabled={isBeforeScheduleTime || submitting}
                                          className={`w-full p-2.5 rounded font-black shadow flex items-center justify-center gap-1.5 transition-all ${isBeforeScheduleTime
                                            ? "bg-slate-300 text-slate-500 cursor-not-allowed"
                                            : "bg-[#714B67] hover:bg-[#5F3F56] text-white hover:scale-[1.01] active:scale-[0.99]"
                                            }`}
                                        >
                                          {submitting ? "Saving..." : isBeforeScheduleTime ? "Locked (Pre-Interview)" : "Log Round Assessment"}
                                        </button>
                                      </div>
                                    </div>

                                    {/* Mandatory Round 3 Disclaimer */}
                                    {item.round === 3 && (
                                      <div className="bg-emerald-50 border border-emerald-250 rounded-lg p-3 text-[10px] text-emerald-700 font-bold flex items-start gap-2">
                                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-600 mt-0.5" />
                                        <div>
                                          <strong>Final Phase:</strong> Since this is Round-3 (HR + DSM + Management), marking "Select / Advance" here will automatically transition the candidate's ultimate status to "Selected" for standard NDA onboarding!
                                        </div>
                                      </div>
                                    )}

                                  </form>

                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

export function HrLeads({
  candidates = [],
  jobs = [],
  triggerToast,
  toggleModal
}: {
  candidates: any[];
  jobs: any[];
  triggerToast: (msg: string) => void;
  toggleModal: (modalId: string, open: boolean) => void;
}) {
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [selectedJobFilter, setSelectedJobFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [previewFile, setPreviewFile] = useState<{ url: string; title: string } | null>(null);
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);

  const filteredLeads = candidates.filter((cand) => {
    if (cand.status !== "Selected") {
      return false;
    }
    if (selectedJobFilter !== "all" && cand.job?._id !== selectedJobFilter) {
      return false;
    }
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      const nameMatch = cand.name?.toLowerCase().includes(lowerSearch);
      const emailMatch = cand.email?.toLowerCase().includes(lowerSearch);
      const mobileMatch = cand.mobile?.includes(searchTerm);
      if (!nameMatch && !emailMatch && !mobileMatch) {
        return false;
      }
    }
    return true;
  });

  const groupedLeads = React.useMemo(() => {
    const groups: { [key: string]: { job: any; candidates: any[] } } = {};

    // First initialize groups from active jobs to preserve their order/existence
    jobs.forEach(job => {
      groups[job._id] = {
        job: job,
        candidates: []
      };
    });

    // Populate candidates into groups
    filteredLeads.forEach(cand => {
      const jobId = cand.job?._id;
      if (jobId && groups[jobId]) {
        groups[jobId].candidates.push(cand);
      } else {
        const key = "general";
        if (!groups[key]) {
          groups[key] = {
            job: { _id: "general", title: "General Application", company: { name: "Acolyte Group" } },
            candidates: []
          };
        }
        groups[key].candidates.push(cand);
      }
    });

    // Filter out groups that have 0 candidates, to avoid showing empty dropdowns
    return Object.values(groups).filter(group => group.candidates.length > 0);
  }, [filteredLeads, jobs]);

  return (
    <div className="space-y-8 animate-fadeIn text-slate-800">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-slate-800">HR Leads</h1>
          <p className="text-xs text-slate-500 mt-1">Real-time candidate submissions from job software form links</p>
        </div>
        <button
          className="bg-[#714B67] hover:bg-[#5F3F56] px-4 py-2.5 rounded-lg text-xs font-bold text-white transition-all flex items-center gap-1.5 shadow"
          onClick={() => toggleModal("cand", true)}
        >
          <UserPlus className="w-4 h-4" /> Add Candidate
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="w-full md:w-1/3">
          <label className="text-[10px] uppercase font-black text-slate-400 font-mono tracking-widest block mb-1">Search Candidates</label>
          <input
            type="text"
            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:outline-none focus:border-[#714B67] text-slate-900"
            placeholder="Search by Name, Email or Phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="w-full md:w-1/3">
          <label className="text-[10px] uppercase font-black text-slate-400 font-mono tracking-widest block mb-1">Filter By Job Posting</label>
          <select
            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:outline-none focus:border-[#714B67] text-slate-700"
            value={selectedJobFilter}
            onChange={(e) => setSelectedJobFilter(e.target.value)}
          >
            <option value="all">All Jobs</option>
            {jobs.map((job) => (
              <option key={job._id} value={job._id}>{job.title} ({job.company?.name || "Acolyte"})</option>
            ))}
          </select>
        </div>
        <div className="text-right text-xs font-mono font-bold text-slate-450">
          Showing {filteredLeads.length} Lead(s)
        </div>
      </div>

      <div className="space-y-4">
        {groupedLeads.map((group) => {
          const isJobExpanded = expandedJobId === group.job._id;
          const companyName = group.job.company?.name || "Acolyte Group";

          return (
            <div key={group.job._id} className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden transition-all duration-200">
              {/* Job Row Header */}
              <div
                className={`p-5 flex items-center justify-between cursor-pointer transition-colors ${isJobExpanded ? "bg-slate-50 border-b border-slate-150" : "hover:bg-slate-50/50"
                  }`}
                onClick={() => setExpandedJobId(isJobExpanded ? null : group.job._id)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#714B67]/10 flex items-center justify-center text-[#714B67]">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-800 tracking-wide">{group.job.title}</h3>
                    <span className="text-[10px] text-slate-450 block font-bold">{companyName}</span>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <span className="px-3 py-1 bg-slate-100 text-slate-655 text-[10px] rounded-full font-black font-mono">
                    {group.candidates.length} Candidate(s)
                  </span>
                  <span className="text-slate-450 text-[11px] font-black uppercase tracking-wider font-mono">
                    {isJobExpanded ? "Collapse ▲" : "Expand ▼"}
                  </span>
                </div>
              </div>

              {/* Job Candidates Dropdown Table */}
              {isJobExpanded && (
                <div className="p-6 overflow-x-auto bg-white border-t border-slate-100">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-400 font-black uppercase font-mono tracking-wider">
                        <th className="pb-3 pr-2">Date & Time</th>
                        <th className="pb-3 px-2">Candidate Details</th>
                        <th className="pb-3 px-2">Experience</th>
                        <th className="pb-3 px-2">Resume</th>
                        <th className="pb-3 pl-2 text-right">Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                      {group.candidates.map((cand, idx) => {
                        const appliedDate = new Date(cand.createdAt).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric"
                        });
                        const appliedTime = new Date(cand.createdAt).toLocaleTimeString("en-IN", {
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: true
                        });
                        const isExpanded = selectedLead?._id === cand._id;

                        return (
                          <React.Fragment key={cand._id || idx}>
                            <tr
                              className={`hover:bg-slate-50/50 cursor-pointer ${isExpanded ? "bg-slate-50 border-b-0" : ""}`}
                              onClick={() => {
                                if (isExpanded) {
                                  setSelectedLead(null);
                                } else {
                                  setSelectedLead(cand);
                                }
                              }}
                            >
                              <td className="py-4 pr-2">
                                <span className="block text-slate-900 font-bold">{appliedDate}</span>
                                <span className="text-[10px] text-slate-400 block font-mono">{appliedTime}</span>
                              </td>

                              <td className="py-4 px-2">
                                <div className="flex flex-wrap items-center gap-2 mb-0.5">
                                  <span className="text-slate-900 font-black text-sm">{cand.name}</span>
                                  {cand.status && (
                                    <span className={`text-[8.5px] font-black uppercase font-mono px-2 py-0.5 rounded border ${cand.status === "Selected"
                                      ? "bg-emerald-50 border-emerald-250 text-emerald-600 font-bold"
                                      : cand.status === "Rejected"
                                        ? "bg-rose-50 border-rose-250 text-rose-700"
                                        : cand.status === "Hold"
                                          ? "bg-amber-50 border-amber-250 text-amber-600"
                                          : cand.status === "High Risk"
                                            ? "bg-rose-100 border-rose-250 text-rose-700 font-bold"
                                            : "bg-slate-50 border-slate-200 text-slate-500"
                                      }`}>
                                      {cand.status}
                                    </span>
                                  )}
                                </div>
                                <span className="text-[10px] text-slate-400 block font-mono">{cand.email} | {cand.mobile}</span>
                              </td>

                              <td className="py-4 px-2 font-mono text-slate-900">
                                {cand.experience}
                              </td>

                              <td className="py-4 px-2">
                                {cand.uploads?.resume ? (
                                  <button
                                    type="button"
                                    className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-2 py-1 rounded border border-emerald-250/30"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setPreviewFile({
                                        url: getAttachmentUrl(cand.uploads.resume),
                                        title: `Resume - ${cand.name}`
                                      });
                                    }}
                                  >
                                    <ExternalLink className="w-3 h-3" /> Resume
                                  </button>
                                ) : (
                                  <span className="text-slate-400 font-mono text-[10px]">No Resume</span>
                                )}
                              </td>

                              <td className="py-4 pl-2 text-right">
                                <button
                                  type="button"
                                  className="bg-slate-100 hover:bg-slate-200 text-[#714B67] px-2.5 py-1.5 rounded text-[10px] font-black shadow-sm transition-all"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (isExpanded) {
                                      setSelectedLead(null);
                                    } else {
                                      setSelectedLead(cand);
                                    }
                                  }}
                                >
                                  {isExpanded ? "Hide Details" : "View All"}
                                </button>
                              </td>
                            </tr>
                            {isExpanded && (
                              <tr className="bg-slate-50/70">
                                <td colSpan={5} className="px-6 py-4 border-b border-slate-200">
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-slate-700 animate-fadeIn">
                                    {/* Box 1: Basic Profile */}
                                    <div className="bg-white border border-slate-150 rounded-xl p-4 shadow-sm space-y-2">
                                      <span className="text-[10px] uppercase font-black text-[#714B67] tracking-wider block border-b pb-1 font-mono">Basic Profile</span>
                                      <div>
                                        <span className="text-slate-400 block text-[9px] uppercase font-mono">Full Name</span>
                                        <strong className="text-slate-800 font-bold text-sm">{cand.name}</strong>
                                      </div>
                                      <div>
                                        <span className="text-slate-400 block text-[9px] uppercase font-mono">Mobile</span>
                                        <strong className="text-slate-800 font-bold font-mono">{cand.mobile}</strong>
                                      </div>
                                      <div>
                                        <span className="text-slate-400 block text-[9px] uppercase font-mono">Email</span>
                                        <strong className="text-slate-800 font-bold font-mono">{cand.email}</strong>
                                      </div>
                                      <div>
                                        <span className="text-slate-400 block text-[9px] uppercase font-mono">Address</span>
                                        <strong className="text-slate-800 font-bold">{cand.address}</strong>
                                      </div>
                                    </div>

                                    {/* Box 2: Salary & Availability */}
                                    <div className="bg-white border border-slate-150 rounded-xl p-4 shadow-sm space-y-2">
                                      <span className="text-[10px] uppercase font-black text-[#714B67] tracking-wider block border-b pb-1 font-mono">Salary & Availability</span>
                                      <div className="grid grid-cols-2 gap-2">
                                        <div>
                                          <span className="text-slate-400 block text-[9px] uppercase font-mono">Qualification</span>
                                          <strong className="text-slate-800 font-bold">{cand.qualification}</strong>
                                        </div>
                                        <div>
                                          <span className="text-slate-400 block text-[9px] uppercase font-mono">Experience</span>
                                          <strong className="text-slate-800 font-bold">{cand.experience}</strong>
                                        </div>
                                        <div>
                                          <span className="text-slate-400 block text-[9px] uppercase font-mono">Current Salary</span>
                                          <strong className="text-slate-800 font-bold font-mono">{cand.currentSalary}</strong>
                                        </div>
                                        <div>
                                          <span className="text-slate-400 block text-[9px] uppercase font-mono">Expected Salary</span>
                                          <strong className="text-slate-800 font-bold font-mono">{cand.expectedSalary}</strong>
                                        </div>
                                        <div className="col-span-2">
                                          <span className="text-slate-400 block text-[9px] uppercase font-mono">Notice Period (Days)</span>
                                          <strong className="text-slate-800 font-bold font-mono">{cand.noticePeriod}</strong>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Box 3: Self Declarations & Attachments */}
                                    <div className="bg-white border border-slate-150 rounded-xl p-4 shadow-sm space-y-3">
                                      {cand.riskAnswers && (
                                        <div>
                                          <span className="text-[10px] uppercase font-black text-[#714B67] tracking-wider block border-b pb-1 mb-2 font-mono">Self Declarations</span>
                                          <div className="space-y-1.5 text-[11px]">
                                            <div className="flex justify-between items-center py-0.5">
                                              <span className="text-slate-500 font-medium">Side Business?</span>
                                              <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase font-mono ${cand.riskAnswers.sideBusiness === "Yes" ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"
                                                }`}>{cand.riskAnswers.sideBusiness}</span>
                                            </div>
                                            <div className="flex justify-between items-center py-0.5">
                                              <span className="text-slate-500 font-medium">Loan EMI Pressure?</span>
                                              <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase font-mono ${cand.riskAnswers.loanPressure === "Yes" ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"
                                                }`}>{cand.riskAnswers.loanPressure}</span>
                                            </div>
                                            <div className="flex justify-between items-center py-0.5">
                                              <span className="text-slate-500 font-medium">Police/Court Matters?</span>
                                              <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase font-mono ${cand.riskAnswers.courtCase === "Yes" ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"
                                                }`}>{cand.riskAnswers.courtCase}</span>
                                            </div>
                                            <div className="flex justify-between items-center py-0.5">
                                              <span className="text-slate-500 font-medium">Comfortable with targets?</span>
                                              <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase font-mono ${cand.riskAnswers.targetWork === "Yes" ? "bg-[#714B67]/10 text-[#714B67]" : "bg-rose-100 text-rose-700"
                                                }`}>{cand.riskAnswers.targetWork}</span>
                                            </div>
                                          </div>
                                        </div>
                                      )}

                                      {cand.uploads && Object.keys(cand.uploads).length > 0 && (
                                        <div>
                                          <span className="text-[10px] uppercase font-black text-[#714B67] tracking-wider block border-b pb-1 mb-2 font-mono">Attachments</span>
                                          <div className="grid grid-cols-2 gap-2 text-[10px] font-bold">
                                            {cand.uploads.resume && (
                                              <button
                                                type="button"
                                                onClick={() => setPreviewFile({
                                                  url: getAttachmentUrl(cand.uploads.resume),
                                                  title: `Resume - ${cand.name}`
                                                })}
                                                className="flex items-center justify-between p-2 bg-indigo-50/50 border border-indigo-100 rounded text-indigo-700 hover:bg-indigo-50 text-left w-full"
                                              >
                                                <span>📄 Resume</span>
                                                <span className="text-[8px] uppercase bg-indigo-600 text-white px-1.5 py-0.5 rounded font-mono">View</span>
                                              </button>
                                            )}
                                            {cand.uploads.photo && (
                                              <button
                                                type="button"
                                                onClick={() => setPreviewFile({
                                                  url: getAttachmentUrl(cand.uploads.photo),
                                                  title: `Passport Photo - ${cand.name}`
                                                })}
                                                className="flex items-center justify-between p-2 bg-indigo-50/50 border border-indigo-100 rounded text-indigo-700 hover:bg-indigo-50 text-left w-full"
                                              >
                                                <span>📷 Photo</span>
                                                <span className="text-[8px] uppercase bg-indigo-600 text-white px-1.5 py-0.5 rounded font-mono">View</span>
                                              </button>
                                            )}
                                            {cand.uploads.aadhaar && (
                                              <button
                                                type="button"
                                                onClick={() => setPreviewFile({
                                                  url: getAttachmentUrl(cand.uploads.aadhaar),
                                                  title: `Aadhaar Card - ${cand.name}`
                                                })}
                                                className="flex items-center justify-between p-2 bg-indigo-50/50 border border-indigo-100 rounded text-indigo-700 hover:bg-indigo-50 text-left w-full"
                                              >
                                                <span>🆔 Aadhaar</span>
                                                <span className="text-[8px] uppercase bg-indigo-600 text-white px-1.5 py-0.5 rounded font-mono">View</span>
                                              </button>
                                            )}
                                            {cand.uploads.pan && (
                                              <button
                                                type="button"
                                                onClick={() => setPreviewFile({
                                                  url: getAttachmentUrl(cand.uploads.pan),
                                                  title: `PAN Card - ${cand.name}`
                                                })}
                                                className="flex items-center justify-between p-2 bg-indigo-50/50 border border-indigo-100 rounded text-indigo-700 hover:bg-indigo-50 text-left w-full"
                                              >
                                                <span>💳 PAN</span>
                                                <span className="text-[8px] uppercase bg-indigo-600 text-white px-1.5 py-0.5 rounded font-mono">View</span>
                                              </button>
                                            )}
                                            {cand.uploads.bankStatement && (
                                              <button
                                                type="button"
                                                onClick={() => setPreviewFile({
                                                  url: getAttachmentUrl(cand.uploads.bankStatement),
                                                  title: `Bank Statement - ${cand.name}`
                                                })}
                                                className="flex items-center justify-between p-2 bg-indigo-50/50 border border-indigo-100 rounded text-indigo-700 hover:bg-indigo-50 text-left w-full col-span-2"
                                              >
                                                <span>🏦 Bank Statement</span>
                                                <span className="text-[8px] uppercase bg-indigo-600 text-white px-1.5 py-0.5 rounded font-mono">View</span>
                                              </button>
                                            )}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}

        {groupedLeads.length === 0 && (
          <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-400 font-bold">
            No active jobs or candidate leads found.
          </div>
        )}
      </div>

      {previewFile && (
        <FilePreviewModal
          url={previewFile.url}
          title={previewFile.title}
          onClose={() => setPreviewFile(null)}
        />
      )}
    </div>
  );
}

export function FilePreviewModal({
  url,
  title,
  onClose
}: {
  url: string;
  title: string;
  onClose: () => void;
}) {
  const cleanUrl = url.split("?")[0].toLowerCase();
  const isImage = cleanUrl.endsWith(".png") ||
    cleanUrl.endsWith(".jpg") ||
    cleanUrl.endsWith(".jpeg") ||
    cleanUrl.endsWith(".gif") ||
    cleanUrl.endsWith(".webp") ||
    (url.includes("image/upload") && !cleanUrl.endsWith(".pdf"));

  // Check if it's a PDF and browser can display it, or use Google Docs Viewer for other docs (docx, xlsx, etc.)
  const isPdf = cleanUrl.endsWith(".pdf") || 
    url.toLowerCase().includes(".pdf") ||
    url.includes("/raw/upload/") ||
    title.toLowerCase().includes("resume") ||
    title.toLowerCase().includes("aadhaar") ||
    title.toLowerCase().includes("pan") ||
    title.toLowerCase().includes("statement");
  const proxyUrl = `/api/documents/proxy?url=${encodeURIComponent(url)}`;
  const previewUrl = isImage
    ? url
    : isPdf
      ? proxyUrl
      : `https://docs.google.com/gview?url=${encodeURIComponent(url)}&embedded=true`;

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden border border-slate-200">
        <div className="bg-[#714B67] text-white px-5 py-4 flex items-center justify-between">
          <span className="text-sm font-black tracking-wide uppercase">{title}</span>
          <div className="flex items-center gap-3">
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white/10 hover:bg-white/20 text-white px-3 py-1 rounded text-xs font-bold transition-all flex items-center gap-1"
            >
              Open Original
            </a>
            <button
              onClick={onClose}
              className="text-white hover:text-slate-200 font-bold text-xl px-2"
            >
              ✕
            </button>
          </div>
        </div>
        <div className="flex-1 bg-slate-100 p-4 flex items-center justify-center overflow-hidden">
          {isImage ? (
            <div className="w-full h-full flex items-center justify-center overflow-auto">
              <img
                src={url}
                alt={title}
                className="max-w-full max-h-full object-contain rounded-lg shadow-md"
              />
            </div>
          ) : (
            <iframe
              src={previewUrl}
              className="w-full h-full border-0 rounded-lg bg-white shadow-md"
              title={title}
            />
          )}
        </div>
      </div>
    </div>
  );
}
