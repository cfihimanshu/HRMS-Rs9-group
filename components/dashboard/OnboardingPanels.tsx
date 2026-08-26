import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import {
  UserPlus,
  Plus,
  GraduationCap,
  Clock,
  Search,
  FileText,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  PenTool,
  Send,
  Download,
  RefreshCw,
  Target,
  Users,
  Award,
  Shield,
  Sparkles,
  TrendingUp,
  ChevronRight,
  Activity,
  MessageSquare,
  AlertTriangle,
  UserCheck,
  Calendar
} from "lucide-react";

interface OnboardingProps {
  selectedCandidate: any;
  triggerToast: (msg: string) => void;
  toggleModal?: (modalId: string, open: boolean) => void;
}

export function OnboardingRoadmap({ selectedCandidate: initialCandidate, triggerToast }: OnboardingProps) {
  const [candidates, setCandidates] = useState<any[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [onboardingRecord, setOnboardingRecord] = useState<any>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("Staff");
  const [loading, setLoading] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Document templates dictionary for preview
  const documentPreviews: Record<string, string[]> = {
    Staff: [
      "Offer Letter",
      "Appointment Letter",
      "Agreement with NDA & NCA",
      "HR Policy Acceptance",
      "Code of Conduct",
      "Asset Policy"
    ],
    Associate: [
      "Associate Engagement Letter",
      "Payout Terms",
      "SOP Acceptance",
      "NDA & NCA",
      "Confidentiality",
      "Non-diversion terms"
    ],
    Vendor: [
      "Vendor Agreement",
      "SLA",
      "Payment Terms",
      "NDA & NCA",
      "Data Security Terms"
    ],
    Franchise: [
      "Franchise Agreement",
      "Territory Terms",
      "Branding Rules",
      "Revenue Sharing Terms",
      "Escalation Matrix"
    ]
  };

  // Load all candidates for the sidebar who are vetting-verified
  const loadCandidates = async () => {
    try {
      setLoading(true);
      const [res, verRes] = await Promise.all([
        fetch("/api/candidates"),
        fetch("/api/verifications")
      ]);
      const data = await res.json();
      const verData = await verRes.json();

      if (data.success && verData.success) {
        // Get verified candidate IDs
        const verifiedCandIds = (verData.data || [])
          .filter((v: any) => v.status === "Verified")
          .map((v: any) => (v.candidate?.id || v.candidate)?.toString());

        const filtered = data.data.filter((c: any) => 
          verifiedCandIds.includes(c.id.toString())
        );

        const sorted = filtered.sort((a: any, b: any) => {
          const statusOrder: Record<string, number> = { Selected: 1, Shortlisted: 2, Applied: 3 };
          return (statusOrder[a.status] || 99) - (statusOrder[b.status] || 99);
        });
        setCandidates(sorted);

        // Auto-select candidate if none is selected or if current is not in the eligible list
        const isEligible = selectedCandidate && sorted.some((c: any) => c.id === selectedCandidate.id);
        if (!isEligible) {
          if (sorted.length > 0) {
            const initialEligible = initialCandidate && sorted.find((c: any) => c.id === initialCandidate.id);
            const defaultSelect = initialEligible || sorted[0];
            setSelectedCandidate(defaultSelect);
            loadOnboardingRecord(defaultSelect.id);
          } else {
            setSelectedCandidate(null);
            setOnboardingRecord(null);
          }
        }
      }
    } catch (err) {
      triggerToast("Error loading candidates directory");
    } finally {
      setLoading(false);
    }
  };

  // Load onboarding record for selected candidate
  const loadOnboardingRecord = async (candidateId: string) => {
    try {
      setOnboardingRecord(null);
      const res = await fetch(`/api/onboarding?candidateId=${candidateId}`);
      const data = await res.json();
      if (data.success && data.data) {
        setOnboardingRecord(data.data);
      }
    } catch (err) {
      console.error("Error loading onboarding details", err);
    }
  };

  useEffect(() => {
    loadCandidates();
  }, []);

  // Update when external prop changes
  useEffect(() => {
    if (initialCandidate && candidates.length > 0) {
      const isEligible = candidates.some(c => c.id === initialCandidate.id);
      if (isEligible) {
        setSelectedCandidate(initialCandidate);
        loadOnboardingRecord(initialCandidate.id);
      }
    }
  }, [initialCandidate, candidates]);

  const handleSelectCandidate = (candidate: any) => {
    setSelectedCandidate(candidate);
    loadOnboardingRecord(candidate.id);
  };

  // Generate compliance package
  const handleGeneratePackage = async () => {
    if (!selectedCandidate) return;
    try {
      setSubmitting(true);
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidateId: selectedCandidate.id,
          category: selectedCategory
        })
      });
      const data = await res.json();
      if (data.success) {
        triggerToast(`Successfully generated ${selectedCategory} documentation package!`);
        setOnboardingRecord(data.data);
      } else {
        triggerToast("Generation failed: " + data.error);
      }
    } catch (err: any) {
      triggerToast("Error connecting to server");
    } finally {
      setSubmitting(false);
    }
  };

  // Simulate signing a document
  const handleSignDoc = async (docName: string) => {
    if (!selectedCandidate) return;
    try {
      setSubmitting(true);
      const res = await fetch("/api/onboarding", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidateId: selectedCandidate.id,
          docName
        })
      });
      const data = await res.json();
      if (data.success) {
        triggerToast(`Successfully e-signed document: ${docName}`);
        setOnboardingRecord(data.data);
      } else {
        triggerToast("Signing failed: " + data.error);
      }
    } catch (err) {
      triggerToast("Error connecting to server");
    } finally {
      setSubmitting(false);
    }
  };

  // Safe array parsing for generatedDocs and signedDocs
  const generatedDocsList = React.useMemo(() => {
    if (!onboardingRecord?.generatedDocs) return [];
    let docs = onboardingRecord.generatedDocs;
    if (typeof docs === "string") {
      try { docs = JSON.parse(docs); } catch (e) { docs = []; }
    }
    return Array.isArray(docs) ? docs : [];
  }, [onboardingRecord?.generatedDocs]);

  const signedDocsList = React.useMemo(() => {
    if (!onboardingRecord?.signedDocs) return [];
    let docs = onboardingRecord.signedDocs;
    if (typeof docs === "string") {
      try { docs = JSON.parse(docs); } catch (e) { docs = []; }
    }
    return Array.isArray(docs) ? docs : [];
  }, [onboardingRecord?.signedDocs]);

  // Filter candidates list safely
  const filteredCandidates = (candidates || []).filter(c =>
    (c.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.job && c.job.title && c.job.title.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-8 animate-fadeIn text-slate-800">

      {/* Top Title Banner */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-black text-slate-800">Onboarding & Legal Contracts</h1>
          <p className="text-xs text-slate-500 mt-1">Generate NDA, SLA, and NCA policy documents based on profile categories</p>
        </div>
        <button
          onClick={loadCandidates}
          disabled={loading}
          className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 transition duration-150 shrink-0"
          title="Refresh Pipelines"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

        {/* Left Side: Candidates list */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-4 flex flex-col h-[520px] shadow-sm">
          <h3 className="text-xs font-black tracking-widest text-[#714B67] uppercase font-mono mb-3">Onboarding Candidates</h3>

          <div className="relative mb-3">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search candidate or job..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-4 py-2 text-xs font-semibold focus:outline-none focus:border-[#714B67] text-slate-800"
            />
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
            {loading ? (
              <div className="text-center py-10 font-bold text-slate-400 text-[10px] animate-pulse">Loading onboarding pipelines...</div>
            ) : filteredCandidates.length === 0 ? (
              <div className="text-center py-10 text-slate-400 font-bold text-[10px]">No active candidates found</div>
            ) : (
              filteredCandidates.map((c, i) => {
                const isSelected = selectedCandidate && selectedCandidate.id === c.id;
                return (
                  <button
                    key={i}
                    onClick={() => handleSelectCandidate(c)}
                    className={`w-full text-left p-3 rounded-lg border transition-all flex items-center justify-between gap-3 ${isSelected
                        ? "bg-[#714B67]/5 border-[#714B67] shadow-sm"
                        : "bg-white border-slate-100 hover:border-slate-350 hover:bg-slate-50/50"
                      }`}
                  >
                    <div className="min-w-0">
                      <div className="font-bold text-slate-800 text-xs truncate">{c.name}</div>
                      <div className="text-[10px] text-slate-500 truncate mt-0.5">{c.job?.title || "Staff Hire"}</div>
                    </div>
                    <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full border shrink-0 ${c.status === "Selected"
                        ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                        : c.status === "Shortlisted"
                          ? "bg-purple-500/10 text-purple-600 border-purple-500/20"
                          : "bg-slate-100 text-slate-500 border-slate-300"
                      }`}>
                      {c.status}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Side: Onboarding workspace panel */}
        <div className="lg:col-span-8 space-y-6">
          {selectedCandidate ? (
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6">

              {/* Profile details banner */}
              <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 pb-4 border-b border-slate-150">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-black text-slate-850">{selectedCandidate.name}</h2>
                    <span className="text-[9px] font-black uppercase px-2 py-0.5 bg-slate-100 text-slate-600 border border-slate-250 rounded-full">
                      {selectedCandidate.job?.title || "Associate"}
                    </span>
                  </div>
                  <div className="text-slate-500 text-[10px] mt-1 flex flex-wrap gap-x-3 gap-y-1">
                    <span>Email: <strong className="text-slate-700">{selectedCandidate.email}</strong></span>
                    <span>Mobile: <strong className="text-slate-700">{selectedCandidate.mobile || "—"}</strong></span>
                  </div>
                </div>

                {onboardingRecord && (
                  <div className="px-3.5 py-1.5 bg-[#714B67]/5 border border-[#714B67]/10 rounded-lg text-right shrink-0">
                    <span className="text-[9px] uppercase font-black tracking-widest text-[#714B67] block">Documentation Category</span>
                    <span className="text-xs font-bold text-slate-800">{onboardingRecord.category} System</span>
                  </div>
                )}
              </div>

              {/* Package Content workspace */}
              {!onboardingRecord ? (
                /* 1. Onboarding NOT started */
                <div className="space-y-6 py-4 animate-fadeIn">
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 flex gap-4 items-start">
                    <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-black text-slate-800 uppercase tracking-wide">Documentation Package Not Generated</h4>
                      <p className="text-[10px] text-slate-550 leading-relaxed mt-1">
                        There are no legal contracts or NDA policies drafted for this candidate yet. Choose an onboarding profile category below to compile their complete compliance documentation kit.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                      <span className="text-xs font-black text-slate-500 font-mono uppercase tracking-wider">Select Category:</span>
                      <select
                        value={selectedCategory}
                        onChange={e => setSelectedCategory(e.target.value)}
                        className="bg-white border border-slate-350 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:border-[#714B67]"
                      >
                        <option value="Staff">Staff (Offer, NDA, NCA, Asset, Conduct)</option>
                        <option value="Associate">Business Associate (SOP, Payout, NDA, NCA)</option>
                        <option value="Vendor">Vendor SLA (Agreement, Terms, NDA, Security)</option>
                        <option value="Franchise">Franchise & Territory Partner (Agreement, Sharing, Branding)</option>
                      </select>
                    </div>

                    {/* Preview of what will be generated */}
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                      <h5 className="text-[10px] font-black uppercase text-slate-500 tracking-wider font-mono mb-2">Documents Preview Package:</h5>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px] font-bold text-slate-650">
                        {documentPreviews[selectedCategory].map((doc, idx) => (
                          <div key={idx} className="flex items-center gap-2 bg-white px-2.5 py-1.5 rounded border border-slate-150">
                            <FileText className="w-3.5 h-3.5 text-[#714B67]" />
                            <span>{doc}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <button
                      onClick={handleGeneratePackage}
                      disabled={submitting}
                      className="w-full sm:w-auto bg-[#714B67] hover:bg-[#5F3F56] text-white px-5 py-3 rounded-lg text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      {submitting ? "Compiling Contract Pack..." : "Generate Compliance Onboarding Package"}
                    </button>
                  </div>
                </div>
              ) : (
                /* 2. Onboarding IS started */
                <div className="space-y-6 animate-fadeIn">

                  {/* Progression Tracker */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-3">
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="text-xs font-black text-slate-800 uppercase tracking-wide">Legal Onboarding progression</h4>
                        <span className="text-[9px] text-slate-500 font-semibold block mt-0.5">Overall compliance status: <strong>{onboardingRecord.status}</strong></span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-black text-[#714B67] font-mono">
                          {signedDocsList.length} / {generatedDocsList.length}
                        </span>
                        <span className="text-[9px] text-slate-400 font-bold block">Documents Signed</span>
                      </div>
                    </div>

                    <div className="h-2.5 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#714B67] rounded-full transition-all duration-550"
                        style={{
                          width: `${generatedDocsList.length
                              ? (signedDocsList.length / generatedDocsList.length) * 100
                              : 0
                            }%`
                        }}
                      />
                    </div>
                  </div>

                  {/* Documents table */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-black tracking-widest text-[#714B67] uppercase font-mono">Contracts Matrix</h4>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-slate-200 text-slate-450 font-black uppercase font-mono tracking-wider">
                            <th className="pb-2.5 pr-2">Document Name</th>
                            <th className="pb-2.5 px-2">Signature Status</th>
                            <th className="pb-2.5 pl-2 text-right">E-Sign & Downloads</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-semibold text-slate-650">
                          {generatedDocsList.map((doc: any, i: number) => {
                            const docName = typeof doc === "string" ? doc : (doc?.name || doc?.title || `Document #${i + 1}`);
                            const docUrl = typeof doc === "string" ? "#" : (doc?.url || "#");
                            const isSigned = signedDocsList.some((s: any) => {
                              const sName = typeof s === "string" ? s : s?.name;
                              return sName === docName;
                            });
                            return (
                              <tr key={i} className="hover:bg-slate-50/50">
                                <td className="py-3 pr-2 font-bold text-slate-805 flex items-center gap-2">
                                  <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                                  <span>{docName}</span>
                                </td>
                                <td className="py-3 px-2">
                                  {isSigned ? (
                                    <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase px-2 py-0.5 bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 rounded-full">
                                      <CheckCircle className="w-3 h-3 text-emerald-600 shrink-0" /> Signed
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase px-2 py-0.5 bg-amber-500/10 text-amber-600 border border-amber-500/20 rounded-full">
                                      <Clock className="w-3 h-3 text-amber-600 shrink-0 animate-pulse" /> Awaiting Signature
                                    </span>
                                  )}
                                </td>
                                <td className="py-3 pl-2 text-right">
                                  <div className="flex items-center justify-end gap-2">
                                    {!isSigned && (
                                      <button
                                        onClick={() => handleSignDoc(docName)}
                                        disabled={submitting}
                                        className="bg-amber-600 hover:bg-amber-700 text-white px-2.5 py-1.5 rounded text-[10px] font-black flex items-center gap-1 transition-all shadow-sm"
                                        title="Simulate candidate signature"
                                      >
                                        <PenTool className="w-3.5 h-3.5" /> Simulate E-Sign
                                      </button>
                                    )}
                                    <a
                                      href={docUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="border border-slate-200 hover:bg-slate-50 p-1.5 rounded transition-all inline-block"
                                      title="Download generated document"
                                    >
                                      <Download className="w-3.5 h-3.5 text-slate-500" />
                                    </a>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Sending packets options */}
                  <div className="flex flex-wrap gap-3 pt-4 border-t border-slate-150">
                    <button
                      onClick={() => triggerToast("All pending onboarding packets and legal bonds sent to candidate's registered mobile/email successfully")}
                      className="bg-[#714B67] hover:bg-[#5F3F56] px-4 py-2.5 rounded-lg text-xs font-bold text-white transition-all shadow flex items-center gap-1.5"
                    >
                      <Send className="w-3.5 h-3.5" /> Send All for E-Sign
                    </button>
                  </div>

                </div>
              )}

            </div>
          ) : (
            <div className="text-center py-20 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center items-center">
              <UserPlus className="w-12 h-12 text-slate-300 mb-4 animate-bounce" />
              <h4 className="text-sm font-black text-slate-800 uppercase tracking-wide">No Candidate Selected</h4>
              <p className="text-xs text-slate-400 mt-2 max-w-xs leading-normal">
                Please select a candidate in the onboarding directory pipeline on the left to review their legal contracts and compliance checklist.
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

export function TrainingClassroom({ triggerToast }: { triggerToast: (msg: string) => void; toggleModal?: any }) {
  const { data: session } = useSession();
  const userRole = (session?.user as any)?.role;
  const canLogProgress = userRole === "HR Head" || userRole === "HR Executive" || userRole === "Department Manager" || userRole === "Owner";
  const canSubmitFinalVerdict = userRole === "HR Head" || userRole === "Owner" || userRole === "HR Executive";

  const [trainees, setTrainees] = useState<any[]>([]);
  const [selectedTrainee, setSelectedTrainee] = useState<any>(null);
  const [trainingRecord, setTrainingRecord] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [assessmentForm, setAssessmentForm] = useState({ dayNumber: 1, sopScore: 0, crmScore: 0, reportingScore: 0, behaviourScore: 0, remarks: "" });
  const [finalRec, setFinalRec] = useState("Activation");

  const parseTrainingRecord = (record: any) => {
    if (!record) return null;
    let assessmentsArr = [];
    if (record.assessments) {
      try {
        assessmentsArr = typeof record.assessments === 'string' ? JSON.parse(record.assessments) : record.assessments;
      } catch {
        assessmentsArr = [];
      }
    }
    return { ...record, assessments: Array.isArray(assessmentsArr) ? assessmentsArr : [] };
  };

  const isThreeDaysCompleted = trainingRecord && (trainingRecord.status === "Final Status" || (trainingRecord.assessments?.length >= 3 && trainingRecord.status !== "Activation"));
  const showPendingFromHRHead = isThreeDaysCompleted && !canSubmitFinalVerdict;

  const trainingTopics = [
    "1. Company structure",
    "2. Job Role & Process",
    "3. Systems & Tools Usage",
    "4. Reporting",
    "5. Client handling",
    "6. Payment discipline",
    "7. Data security",
    "8. Anti-fraud",
    "9. Communication discipline",
    "10. Territory discipline"
  ];

  const loadData = async () => {
    try {
      setLoading(true);
      // Fetch trainees, candidates, interviews, and verifications
      const [res, candRes, intRes, verRes] = await Promise.all([
        fetch("/api/trainings"),
        fetch("/api/candidates"),
        fetch("/api/interviews"),
        fetch("/api/verifications")
      ]);
      const data = await res.json();
      const candData = await candRes.json();
      const intData = await intRes.json();
      const verData = await verRes.json();

      if (data.success && candData.success && intData.success && verData.success) {
        const activeTrainings = data.data || [];
        const candidates = candData.data || [];
        const interviews = intData.data || [];
        const verifications = verData.data || [];

        // Get verified candidate IDs
        const verifiedCandIds = verifications
          .filter((v: any) => v.status === "Verified")
          .map((v: any) => (v.candidate?.id || v.candidate)?.toString());

        // Identify candidates with exactly 3 selected interview rounds
        const candidateInterviewsMap: Record<string, Set<number>> = {};
        interviews.forEach((iv: any) => {
          if (iv.candidate && iv.candidate.id && iv.status === "Selected") {
            const cid = iv.candidate.id.toString();
            if (!candidateInterviewsMap[cid]) {
              candidateInterviewsMap[cid] = new Set();
            }
            candidateInterviewsMap[cid].add(iv.round);
          }
        });

        // Filter: Candidate must be vetting-verified AND (have passed all 3 rounds OR status === Selected & currentRound === 3)
        const eligibleCandIds = candidates
          .filter((c: any) => {
            const cid = c.id.toString();
            const rounds = candidateInterviewsMap[cid] || new Set();
            const isThreeRoundsSelected = rounds.has(1) && rounds.has(2) && rounds.has(3);
            const isDirectlyHired = c.status === "Selected" && c.currentRound === 3;
            const isVettingVerified = verifiedCandIds.includes(cid);
            return (isThreeRoundsSelected || isDirectlyHired) && isVettingVerified;
          })
          .map((c: any) => c.id.toString());

        // Merge: all active training records + candidates who don't have a training record
        // ONLY candidates in eligibleCandIds are shown!
        const traineesList: any[] = [];

        // Add candidates from training records ONLY if they are eligible
        activeTrainings.forEach((tr: any) => {
          if (tr.candidate && eligibleCandIds.includes(tr.candidate.id)) {
            traineesList.push({ ...tr.candidate, trainingRecord: parseTrainingRecord(tr) });
          }
        });

        // Add eligible candidates who aren't in training yet
        candidates.forEach((c: any) => {
          if (eligibleCandIds.includes(c.id) && !activeTrainings.some((tr: any) => tr.candidate && tr.candidate.id === c.id)) {
            traineesList.push({ ...c, trainingRecord: null });
          }
        });

        setTrainees(traineesList);

        // Auto-select first or update selected
        if (traineesList.length > 0) {
          const stillExists = selectedTrainee && traineesList.some(t => t.id === selectedTrainee.id);
          if (!stillExists) {
            handleSelectTrainee(traineesList[0]);
          } else {
            const updatedTrainee = traineesList.find(t => t.id === selectedTrainee.id);
            handleSelectTrainee(updatedTrainee);
          }
        } else {
          setSelectedTrainee(null);
          setTrainingRecord(null);
        }
      }
    } catch (err) {
      triggerToast("Error loading training pipeline");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSelectTrainee = (trainee: any) => {
    setSelectedTrainee(trainee);
    const parsedRecord = parseTrainingRecord(trainee.trainingRecord);
    setTrainingRecord(parsedRecord);
    // Reset forms
    if (parsedRecord && parsedRecord.assessments?.length > 0) {
      setAssessmentForm(prev => ({ ...prev, dayNumber: parsedRecord.assessments.length + 1 > 3 ? 3 : parsedRecord.assessments.length + 1 }));
    } else {
      setAssessmentForm({ dayNumber: 1, sopScore: 0, crmScore: 0, reportingScore: 0, behaviourScore: 0, remarks: "" });
    }
  };

  const handleStartTraining = async () => {
    if (!selectedTrainee) return;
    try {
      setSubmitting(true);
      const res = await fetch("/api/trainings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidateId: selectedTrainee.id,
          status: "Orientation"
        })
      });
      const data = await res.json();
      if (data.success) {
        triggerToast("Training started successfully");
        setTrainingRecord(parseTrainingRecord(data.data));
        loadData(); // refresh list
      }
    } catch (err) {
      triggerToast("Failed to start training");
    } finally {
      setSubmitting(false);
    }
  };

  const submitAssessment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTrainee) return;
    try {
      setSubmitting(true);

      // Determine next status
      let nextStatus = "Daily Assessment";
      if (assessmentForm.dayNumber === 3) nextStatus = "Final Status";
      if (assessmentForm.dayNumber < 3) nextStatus = "3 Days Training";

      const res = await fetch("/api/trainings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidateId: selectedTrainee.id,
          status: nextStatus,
          assessment: {
            dayNumber: assessmentForm.dayNumber,
            sopScore: assessmentForm.sopScore,
            crmScore: assessmentForm.crmScore,
            reportingScore: assessmentForm.reportingScore,
            behaviourScore: assessmentForm.behaviourScore,
            remarks: assessmentForm.remarks
          }
        })
      });
       const data = await res.json();
      if (data.success) {
        triggerToast(`Day ${assessmentForm.dayNumber} assessment saved!`);
        setTrainingRecord(parseTrainingRecord(data.data));
        if (assessmentForm.dayNumber < 3) {
          setAssessmentForm(prev => ({ ...prev, dayNumber: prev.dayNumber + 1, sopScore: 0, crmScore: 0, reportingScore: 0, behaviourScore: 0, remarks: "" }));
        }
      } else {
        triggerToast(`Error saving assessment: ${data.error}`);
      }
    } catch (err) {
      triggerToast("Error saving assessment");
    } finally {
      setSubmitting(false);
    }
  };

  const submitFinalRecommendation = async () => {
    if (!selectedTrainee) return;
    try {
      setSubmitting(true);
      const nextStatus = finalRec === "Activation" ? "Activation" : "Final Status";
      const res = await fetch("/api/trainings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidateId: selectedTrainee.id,
          status: nextStatus,
          recommendation: finalRec
        })
      });
      const data = await res.json();
      if (data.success) {
        triggerToast(`Final recommendation submitted: ${finalRec}`);
        setTrainingRecord(parseTrainingRecord(data.data));
        loadData();
      } else {
        triggerToast(`Error submitting recommendation: ${data.error}`);
      }
    } catch (err) {
      triggerToast("Error submitting recommendation");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredTrainees = trainees.filter(t => t.name.toLowerCase().includes(searchQuery.toLowerCase()));

  // Calculate progress
  const getProgressWidth = () => {
    if (!trainingRecord) return 0;
    const status = trainingRecord.status;
    if (status === "Activation") return 100;
    if (status === "Final Status") return 80;
    const numAssessments = trainingRecord.assessments?.length || 0;
    if (numAssessments === 3) return 60;
    if (numAssessments === 2) return 40;
    if (numAssessments === 1) return 20;
    if (status === "Orientation") return 5;
    return 0;
  };

  return (
    <div className="space-y-8 animate-fadeIn text-slate-800">

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-black text-slate-800">Training Classroom Dashboard</h1>
          <p className="text-xs text-slate-500 mt-1">Orientation → 3-Day Classroom → Assessment Vetting → Final Confirmation Activation</p>
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 transition duration-150 shrink-0"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

        {/* Left Side: Trainees list */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-4 flex flex-col h-[650px] shadow-sm">
          <h3 className="text-xs font-black tracking-widest text-[#714B67] uppercase font-mono mb-3">Assigned Trainees</h3>

          <div className="relative mb-3">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search trainee..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-4 py-2 text-xs font-semibold focus:outline-none focus:border-[#714B67] text-slate-800"
            />
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
            {loading ? (
              <div className="text-center py-10 font-bold text-slate-400 text-[10px] animate-pulse">Loading training roster...</div>
            ) : filteredTrainees.length === 0 ? (
              <div className="text-center py-10 text-slate-400 font-bold text-[10px]">No trainees found</div>
            ) : (
              filteredTrainees.map((t, i) => {
                const isSelected = selectedTrainee && selectedTrainee.id === t.id;
                const status = t.trainingRecord?.status || "Awaiting Orientation";
                const vacancyName = t.job?.title || "General Inquiry";
                const candidateStatus = t.status || "Pending";
                return (
                  <button
                    key={i}
                    onClick={() => handleSelectTrainee(t)}
                    className={`w-full text-left p-3.5 rounded-lg border transition-all flex flex-col gap-2 ${isSelected
                        ? "bg-[#714B67]/5 border-[#714B67] shadow-sm"
                        : "bg-white border-slate-100 hover:border-slate-350 hover:bg-slate-50/50"
                      }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-bold text-slate-800 text-xs truncate max-w-[70%]">{t.name}</div>
                      <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full border shrink-0 ${candidateStatus === "Selected" ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" :
                          candidateStatus === "Rejected" ? "bg-red-500/10 text-red-600 border-red-500/20" :
                            candidateStatus === "High Risk" ? "bg-rose-500/10 text-rose-600 border-rose-500/20" :
                              candidateStatus === "Hold" ? "bg-amber-500/10 text-amber-600 border-amber-500/20" :
                                "bg-blue-500/10 text-blue-600 border-blue-500/20"
                        }`}>
                        {candidateStatus}
                      </span>
                    </div>

                    <div className="text-[10px] text-slate-500 flex items-center gap-1">
                      <span className="font-semibold truncate">Vacancy:</span>
                      <strong className="text-slate-700 truncate">{vacancyName}</strong>
                    </div>

                    <div className="flex items-center justify-between mt-1 pt-1.5 border-t border-slate-100">
                      <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Training Phase:</span>
                      <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full border ${status === "Activation" ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" :
                          status === "Final Status" ? "bg-purple-500/10 text-purple-600 border-purple-500/20" :
                            status === "Awaiting Orientation" ? "bg-slate-100 text-slate-500 border-slate-300" :
                              "bg-amber-500/10 text-amber-600 border-amber-500/20"
                        }`}>
                        {status}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Side: Training Workspace */}
        <div className="lg:col-span-8">
          {selectedTrainee ? (
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col h-[650px]">

              {/* Profile details banner */}
              <div className="flex justify-between items-center gap-4 pb-4 border-b border-slate-150 shrink-0">
                <div>
                  <h2 className="text-base font-black text-slate-850 flex items-center gap-2">
                    <GraduationCap className="w-5 h-5 text-[#714B67]" />
                    {selectedTrainee.name}
                  </h2>
                  <div className="text-slate-500 text-[10px] mt-1 flex flex-wrap gap-x-4 gap-y-1">
                    <span>Email: <strong className="text-slate-700">{selectedTrainee.email}</strong></span>
                    <span>Mobile: <strong className="text-slate-700">{selectedTrainee.mobile}</strong></span>
                    <span>Company: <strong className="text-[#714B67]">{selectedTrainee.job?.company?.name || "N/A"}</strong></span>
                    <span>Role/Designation: <strong className="text-[#714B67]">{selectedTrainee.job?.title || "N/A"}</strong></span>
                  </div>
                </div>

                <div className="px-3.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-right">
                  <span className="text-[9px] uppercase font-black tracking-widest text-slate-500 block">Current Phase</span>
                  <span className="text-xs font-bold text-[#714B67]">
                    {trainingRecord 
                      ? (showPendingFromHRHead ? "Pending from HR Head" : trainingRecord.status)
                      : "Not Started"}
                  </span>
                </div>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto py-4 space-y-6 pr-2 scrollbar-thin">

                {!trainingRecord ? (
                  <div className="text-center py-10">
                    <GraduationCap className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <h4 className="text-sm font-black text-slate-800 uppercase tracking-wide">Ready for Orientation</h4>
                    <p className="text-xs text-slate-500 mt-2 mb-6 max-w-sm mx-auto">This candidate has completed onboarding and is ready to begin the Training Module.</p>
                    {canLogProgress ? (
                      <button
                        onClick={handleStartTraining}
                        disabled={submitting}
                        className="bg-[#714B67] hover:bg-[#5F3F56] text-white px-6 py-3 rounded-lg text-xs font-bold transition-all shadow-md inline-flex items-center gap-2"
                      >
                        <Plus className="w-4 h-4" /> Start Orientation & Training
                      </button>
                    ) : (
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wide block bg-slate-50 border border-slate-200 rounded-lg p-3 max-w-xs mx-auto text-center">
                        Awaiting Authorized Trainer/HR/Manager to Start Training
                      </span>
                    )}
                  </div>
                ) : (
                  <>
                    {/* Progression Tracker */}
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-3">
                      <div className="flex justify-between items-end">
                        <div>
                          <h4 className="text-xs font-black text-slate-800 uppercase tracking-wide">Training Progression</h4>
                          <span className="text-[10px] text-slate-500 font-semibold block mt-0.5">
                            {trainingRecord.status === "Activation" ? "Training successfully completed!" : "Track daily assessments and final vetting."}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-black text-[#714B67] font-mono">{trainingRecord.assessments?.length || 0} / 3</span>
                          <span className="text-[9px] text-slate-400 font-bold block uppercase tracking-wider">Days Evaluated</span>
                        </div>
                      </div>

                      <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                          style={{ width: `${getProgressWidth()}%` }}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                      {/* Left Column: Topics Checklist */}
                      <div className="space-y-3">
                        <h4 className="text-[10px] font-black tracking-widest text-[#714B67] uppercase font-mono">Core Training Topics</h4>
                        <div className="bg-slate-50 rounded-lg border border-slate-200 p-3 space-y-2">
                          {trainingTopics.map((topic, i) => (
                            <div key={i} className="flex items-center gap-2 text-[10px] font-bold text-slate-650">
                              <CheckCircle className="w-3.5 h-3.5 text-slate-400" />
                              <span>{topic}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Right Column: Assessment Action Center */}
                      <div className="space-y-4">

                        {/* Daily Assessment Form */}
                        {trainingRecord.status !== "Activation" && trainingRecord.status !== "Final Status" && (
                          canLogProgress ? (
                            <form onSubmit={submitAssessment} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-4 animate-fadeIn">
                              <h4 className="text-[10px] font-black tracking-widest text-[#714B67] uppercase font-mono flex items-center gap-1.5 border-b border-slate-100 pb-2 mb-2">
                                <PenTool className="w-3.5 h-3.5" /> Log Daily FORM-6 Feedback
                              </h4>

                              <div className="mb-4">
                                <label className="text-[9px] uppercase font-black text-slate-500">Day Number</label>
                                <select
                                  className="w-full border border-slate-200 rounded p-2 text-xs focus:border-[#714B67] outline-none mt-1"
                                  value={assessmentForm.dayNumber}
                                  onChange={e => setAssessmentForm({ ...assessmentForm, dayNumber: Number(e.target.value) })}
                                >
                                  <option value={1}>Day 1</option>
                                  <option value={2}>Day 2</option>
                                  <option value={3}>Day 3</option>
                                </select>
                              </div>

                              <div className="space-y-3">
                                {[
                                  { label: "Process Understanding", key: "sopScore" },
                                  { label: "Tools & Systems Understanding", key: "crmScore" },
                                  { label: "Reporting Discipline", key: "reportingScore" },
                                  { label: "Behaviour / Attitude", key: "behaviourScore" }
                                ].map((item, idx) => (
                                  <div key={idx} className="flex flex-col gap-1.5">
                                    <div className="flex justify-between items-center text-[10.5px]">
                                      <label className="font-bold text-slate-600">{item.label}:</label>
                                      <strong className="text-xs font-mono text-[#714B67]">{(assessmentForm as any)[item.key]}%</strong>
                                    </div>
                                    <input
                                      type="range"
                                      min="0"
                                      max="100"
                                      value={(assessmentForm as any)[item.key]}
                                      onChange={(e) => setAssessmentForm({ ...assessmentForm, [item.key]: parseInt(e.target.value) })}
                                      className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#714B67]"
                                    />
                                  </div>
                                ))}
                              </div>

                              <div className="mt-4">
                                <label className="text-[9px] uppercase font-black text-slate-500">Final Remarks / Observations</label>
                                <textarea
                                  required rows={2}
                                  className="w-full border border-slate-200 rounded p-2 text-xs focus:border-[#714B67] outline-none mt-1"
                                  placeholder="Trainee engagement and learning curve..."
                                  value={assessmentForm.remarks}
                                  onChange={e => setAssessmentForm({ ...assessmentForm, remarks: e.target.value })}
                                />
                              </div>
                              <button
                                disabled={submitting} type="submit"
                                className="w-full bg-[#714B67] hover:bg-[#5F3F56] text-white py-2 rounded text-xs font-bold transition-all"
                              >
                                Save Assessment
                              </button>
                            </form>
                          ) : (
                            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 text-center shadow-sm">
                              <AlertCircle className="w-5 h-5 text-slate-400 mx-auto mb-2" />
                              <span className="text-[11px] text-slate-650 font-black uppercase tracking-wider block">Access Restricted</span>
                              <p className="text-[10.5px] text-slate-500 mt-1 font-semibold leading-relaxed">
                                Only HR Executive, HR Head, Department Manager, or Owner are authorized to submit daily assessments.
                              </p>
                            </div>
                          )
                        )}

                        {/* Final Recommendation Action */}
                        {isThreeDaysCompleted && (
                          canSubmitFinalVerdict ? (
                            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 shadow-sm space-y-3 animate-fadeIn">
                              <h4 className="text-[10px] font-black tracking-widest text-amber-700 uppercase font-mono flex items-center gap-1.5">
                                <AlertCircle className="w-3.5 h-3.5" /> Final Verdict
                              </h4>
                              <select
                                className="w-full border border-amber-200 rounded p-2 text-xs text-amber-900 focus:border-amber-500 outline-none"
                                value={finalRec}
                                onChange={e => setFinalRec(e.target.value)}
                              >
                                <option value="Activation">Proceed to Activation (Passed)</option>
                                <option value="Extend Training">Extend Training Required</option>
                                <option value="Hold">Put on Hold</option>
                                <option value="Reject">Reject Trainee</option>
                              </select>
                              <button
                                onClick={submitFinalRecommendation}
                                disabled={submitting}
                                className="w-full bg-amber-600 hover:bg-amber-700 text-white py-2 rounded text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5"
                              >
                                <Send className="w-3 h-3" /> Submit Recommendation
                              </button>
                            </div>
                          ) : (
                            <div className="bg-amber-50/50 border border-amber-200 rounded-xl p-5 text-center shadow-sm space-y-2 animate-fadeIn">
                              <AlertCircle className="w-5 h-5 text-amber-600 mx-auto mb-2" />
                              <span className="text-[11px] text-amber-800 font-black uppercase tracking-wider block">Decision Pending</span>
                              <p className="text-[10px] text-amber-700 font-semibold leading-relaxed">
                                3 days of training is complete. Awaiting final decision / verdict recommendation from HR Head or Owner.
                              </p>
                            </div>
                          )
                        )}
                      </div>
                    </div>

                    {/* Assessment History Logs */}
                    {trainingRecord.assessments?.length > 0 && (
                      <div className="space-y-3 pt-4 border-t border-slate-150">
                        <h4 className="text-[10px] font-black tracking-widest text-slate-500 uppercase font-mono">Assessment History Logs</h4>
                        <div className="space-y-2">
                          {trainingRecord.assessments.map((a: any, i: number) => (
                            <div key={i} className="flex gap-4 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                              <div className="shrink-0 text-center px-3 py-1 bg-white border border-slate-200 rounded shadow-sm">
                                <span className="block text-[8px] font-black text-slate-400 uppercase">Day</span>
                                <span className="block text-sm font-black text-[#714B67]">{a.dayNumber}</span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start">
                                  <span className="text-xs font-bold text-slate-800">
                                    Average Score: {Math.round((a.sopScore + a.crmScore + a.reportingScore + a.behaviourScore) / 4)}/100
                                  </span>
                                  <span className="text-[9px] text-slate-400">{new Date(a.date).toLocaleDateString()}</span>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2 bg-white p-2 rounded border border-slate-100 text-[9px] font-semibold text-slate-500">
                                  <div>Process: <strong className="text-slate-700">{a.sopScore}%</strong></div>
                                  <div>Tools: <strong className="text-slate-700">{a.crmScore}%</strong></div>
                                  <div>Reporting: <strong className="text-slate-700">{a.reportingScore}%</strong></div>
                                  <div>Behaviour: <strong className="text-slate-700">{a.behaviourScore}%</strong></div>
                                </div>
                                {a.remarks && (
                                  <p className="text-[10px] text-slate-500 mt-2 font-semibold leading-relaxed">
                                    "{a.remarks}"
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}

              </div>
            </div>
          ) : (
            <div className="text-center py-32 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center items-center h-[650px]">
              <GraduationCap className="w-12 h-12 text-slate-300 mb-4 animate-bounce" />
              <h4 className="text-sm font-black text-slate-800 uppercase tracking-wide">No Trainee Selected</h4>
              <p className="text-xs text-slate-400 mt-2 max-w-xs leading-normal">
                Please select a trainee from the roster on the left to log their daily training assessments and track progression.
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

export function ProbationEvaluation({
  triggerToast,
  onViewWorkReport
}: {
  triggerToast: (msg: string) => void;
  onViewWorkReport?: (employeeId: string) => void;
}) {
  const [probationers, setProbationers] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedProbationer, setSelectedProbationer] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showInitForm, setShowInitForm] = useState(false);
  const [newProbationEmployee, setNewProbationEmployee] = useState("");
  const [selectedMonthIndex, setSelectedMonthIndex] = useState<number>(1);
  const [isEditing, setIsEditing] = useState<boolean>(true);
  const [activeTabFilter, setActiveTabFilter] = useState<"all" | "active" | "due" | "confirmed">("all");

  // Evaluation Form State
  const [evalForm, setEvalForm] = useState({
    kpi: 75,
    attendance: 80,
    sodeod: 75,
    behaviour: 85,
    reporting: 75,
    loyalty: 80,
    risk: 80,
    feedback: "",
    verdict: "Confirm"
  });

  const MILESTONE_TITLES = [
    { m: 1, code: "M1", title: "Induction & Basics", desc: "Orientation & SOP Understanding" },
    { m: 2, code: "M2", title: "SOP Check & Compliance", desc: "Process & Tool Discipline" },
    { m: 3, code: "M3", title: "Mid-Term Review", desc: "Quarterly Work Progress" },
    { m: 4, code: "M4", title: "Core KPI Sprint", desc: "Task Quality & Productivity" },
    { m: 5, code: "M5", title: "Audit Preparation", desc: "Behaviour & Team Alignment" },
    { m: 6, code: "M6", title: "Final Verdict Confirmation", desc: "Employment Confirmation Audit" }
  ];

  const getMonthDateName = (prob: any, mIdx: number) => {
    if (!prob?.startDate) return `Month ${mIdx}`;
    const d = new Date(prob.startDate);
    d.setMonth(d.getMonth() + (mIdx - 1));
    return d.toLocaleString("en-US", { month: "short", year: "numeric" });
  };

  const switchMonth = (prob: any, mIdx: number) => {
    setSelectedMonthIndex(mIdx);
    const monthlyData = prob?.monthlyEvaluations?.[mIdx];

    if (monthlyData) {
      const getScore = (name: string) => {
        const found = monthlyData.kpis?.find((k: any) => k.kpiName === name);
        return found ? Number(found.score) || 0 : 0;
      };

      setEvalForm({
        kpi: getScore("KPI"),
        attendance: getScore("Attendance"),
        sodeod: getScore("SOD/EOD"),
        behaviour: getScore("Behaviour"),
        reporting: getScore("Reporting"),
        loyalty: getScore("Loyalty"),
        risk: getScore("Risk Score"),
        feedback: monthlyData.feedback || "",
        verdict: prob?.status === "active" ? "Confirm" : (prob?.status || "Confirm")
      });
      setIsEditing(false); // Saved view mode
    } else {
      // Unfilled month: fresh active fill mode
      setEvalForm({
        kpi: 75,
        attendance: 80,
        sodeod: 75,
        behaviour: 85,
        reporting: 75,
        loyalty: 80,
        risk: 80,
        feedback: "",
        verdict: prob?.status === "active" ? "Confirm" : (prob?.status || "Confirm")
      });
      setIsEditing(true); // Active fill mode
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [probRes, empRes] = await Promise.all([
        fetch("/api/probation"),
        fetch("/api/employees")
      ]);
      const probData = await probRes.json();
      const empData = await empRes.json();

      if (probData.success) {
        setProbationers(probData.data);
        if (!selectedProbationer && probData.data.length > 0 && !showInitForm) {
          handleSelectProbationer(probData.data[0]);
        }
      }
      if (empData.success) {
        setEmployees(empData.data);
      }
    } catch (err) {
      triggerToast("Failed to load probation data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSelectProbationer = (prob: any) => {
    setSelectedProbationer(prob);
    setShowInitForm(false);

    // Auto-advance to the earliest unfilled month, or pick Month 1
    let defaultMonth = 1;
    if (prob.monthlyEvaluations) {
      let foundUnfilled = false;
      for (let m = 1; m <= 6; m++) {
        if (!prob.monthlyEvaluations[m]) {
          defaultMonth = m;
          foundUnfilled = true;
          break;
        }
      }
      if (!foundUnfilled) {
        defaultMonth = 6; // All filled, view Month 6
      }
    }
    switchMonth(prob, defaultMonth);
  };

  const handleInitializeProbation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProbationEmployee) return;

    try {
      setSubmitting(true);
      const startDate = new Date();
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 6); // 6 months probation

      const res = await fetch("/api/probation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: newProbationEmployee,
          startDate,
          endDate
        })
      });
      const data = await res.json();
      if (data.success) {
        triggerToast("Probation track initialized!");
        setShowInitForm(false);
        setNewProbationEmployee("");
        loadData();
      } else {
        triggerToast("Error: " + data.error);
      }
    } catch (err) {
      triggerToast("Failed to initialize probation");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitEvaluation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProbationer) return;

    try {
      setSubmitting(true);
      const kpisArray = [
        { kpiName: "KPI", score: evalForm.kpi },
        { kpiName: "Attendance", score: evalForm.attendance },
        { kpiName: "SOD/EOD", score: evalForm.sodeod },
        { kpiName: "Behaviour", score: evalForm.behaviour },
        { kpiName: "Reporting", score: evalForm.reporting },
        { kpiName: "Loyalty", score: evalForm.loyalty },
        { kpiName: "Risk Score", score: evalForm.risk }
      ];

      const res = await fetch("/api/probation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          probationId: selectedProbationer.id,
          monthIndex: selectedMonthIndex,
          status: evalForm.verdict,
          kpis: kpisArray,
          feedback: evalForm.feedback
        })
      });

      const data = await res.json();
      if (data.success) {
        const curTitle = MILESTONE_TITLES.find(t => t.m === selectedMonthIndex)?.title || `Month ${selectedMonthIndex}`;
        triggerToast(`${curTitle} saved successfully!`);

        // Update current selected probationer object locally
        const updatedMonthly = {
          ...(selectedProbationer.monthlyEvaluations || {}),
          [selectedMonthIndex]: {
            monthIndex: selectedMonthIndex,
            score: Math.round(
              ((evalForm.kpi || 0) +
                (evalForm.attendance || 0) +
                (evalForm.sodeod || 0) +
                (evalForm.behaviour || 0) +
                (evalForm.reporting || 0) +
                (evalForm.loyalty || 0) +
                (evalForm.risk || 0)) / 7
            ),
            kpis: kpisArray,
            feedback: evalForm.feedback,
            evaluatedAt: new Date().toISOString()
          }
        };

        const updatedProb = {
          ...selectedProbationer,
          ...data.data,
          monthlyEvaluations: updatedMonthly
        };
        setSelectedProbationer(updatedProb);

        // Advance to next month if available
        if (selectedMonthIndex < 6) {
          switchMonth(updatedProb, selectedMonthIndex + 1);
        } else {
          setIsEditing(false);
        }

        loadData();
      } else {
        triggerToast("Error evaluating probation: " + data.error);
      }
    } catch (err) {
      triggerToast("Failed to submit evaluation");
    } finally {
      setSubmitting(false);
    }
  };

  // Dynamic average score calculator across the 7 metrics
  const avgScore = Math.round(
    ((evalForm.kpi || 0) +
      (evalForm.attendance || 0) +
      (evalForm.sodeod || 0) +
      (evalForm.behaviour || 0) +
      (evalForm.reporting || 0) +
      (evalForm.loyalty || 0) +
      (evalForm.risk || 0)) / 7
  );

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-600 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800";
    if (score >= 60) return "text-indigo-600 bg-indigo-50 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800";
    if (score >= 40) return "text-amber-600 bg-amber-50 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800";
    return "text-rose-600 bg-rose-50 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800";
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Confirm":
        return "bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800";
      case "Extend":
        return "bg-purple-50 text-purple-700 border-purple-200/80 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800";
      case "Restrict role":
        return "bg-amber-50 text-amber-700 border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800";
      case "Exit":
        return "bg-rose-50 text-rose-700 border-rose-200/80 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800";
      default:
        return "bg-blue-50 text-blue-700 border-blue-200/80 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800";
    }
  };

  // Summary counts
  const totalProbationers = probationers.length;
  const activeCount = probationers.filter(p => p.status === "active").length;
  const dueCount = probationers.filter(p => {
    const months = Math.round((new Date().getTime() - new Date(p.startDate).getTime()) / (1000 * 60 * 60 * 24 * 30));
    return p.status === "active" && months >= 5;
  }).length;
  const confirmedCount = probationers.filter(p => p.status === "Confirm").length;

  const filteredProbationers = probationers.filter(p => {
    const matchesSearch = p.employee?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.employee?.employeeProfile?.designation?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.employee?.role?.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (activeTabFilter === "active") return p.status === "active";
    if (activeTabFilter === "confirmed") return p.status === "Confirm";
    if (activeTabFilter === "due") {
      const months = Math.round((new Date().getTime() - new Date(p.startDate).getTime()) / (1000 * 60 * 60 * 24 * 30));
      return p.status === "active" && months >= 5;
    }
    return true;
  });

  // Filter out employees who are already in the probation list
  const availableEmployees = employees.filter(emp => !probationers.some(p => p.employee?.id === emp.id));

  // Current selected month metadata
  const currentMilestone = MILESTONE_TITLES.find(t => t.m === selectedMonthIndex) || MILESTONE_TITLES[0];
  const isSelectedMonthSaved = Boolean(selectedProbationer?.monthlyEvaluations?.[selectedMonthIndex]);
  const currentMonthDate = selectedProbationer ? getMonthDateName(selectedProbationer, selectedMonthIndex) : "";

  const quickFeedbackSuggestions = [
    "Consistently delivers tasks on time.",
    "Strong technical execution and problem solving.",
    "Active participant in SOD/EOD daily reporting.",
    "Great team player with positive workplace etiquette.",
    "Needs improvement on reporting discipline.",
    "Recommend confirmation based on stellar performance."
  ];

  const handleAddFeedbackTag = (tag: string) => {
    setEvalForm(prev => ({
      ...prev,
      feedback: prev.feedback ? `${prev.feedback} ${tag}` : tag
    }));
  };

  return (
    <div className="space-y-6 animate-fade-in text-slate-800 dark:text-gray-100">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl border transition-all shadow-xs bg-gradient-to-r from-white via-slate-50/50 to-white dark:from-gray-900 dark:via-gray-900/80 dark:to-gray-900 border-slate-200/80 dark:border-gray-800">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              Probation Evaluation Matrix
            </h1>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60">
              6-Month Audit Track
            </span>
          </div>
          <p className="text-xs sm:text-sm mt-1 font-medium text-slate-500 dark:text-gray-400">
            Step-by-step 6-month evaluation progression. Fill each month to advance, view past scores, and edit anytime.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowInitForm(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all shadow-sm hover:shadow flex items-center justify-center gap-1.5 shrink-0 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Initialize Track
          </button>
          <button
            onClick={loadData}
            disabled={loading}
            className="p-2.5 border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-slate-50 dark:hover:bg-gray-750 text-slate-600 dark:text-gray-300 rounded-xl transition-all shadow-xs shrink-0 cursor-pointer"
            title="Refresh list"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Top 4 Stats Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl border bg-white dark:bg-gray-900 border-slate-200/80 dark:border-gray-800 shadow-xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500 dark:text-gray-400">Total In Track</div>
            <div className="text-xl font-black text-slate-900 dark:text-white mt-0.5">{totalProbationers}</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl border bg-white dark:bg-gray-900 border-slate-200/80 dark:border-gray-800 shadow-xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold shrink-0">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500 dark:text-gray-400">Active Probation</div>
            <div className="text-xl font-black text-slate-900 dark:text-white mt-0.5">{activeCount}</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl border bg-white dark:bg-gray-900 border-slate-200/80 dark:border-gray-800 shadow-xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500 dark:text-gray-400">Due for Review (M5-6)</div>
            <div className="text-xl font-black text-amber-600 dark:text-amber-400 mt-0.5">{dueCount}</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl border bg-white dark:bg-gray-900 border-slate-200/80 dark:border-gray-800 shadow-xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold shrink-0">
            <CheckCircle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500 dark:text-gray-400">Confirmed Staff</div>
            <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">{confirmedCount}</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: Probationers List */}
        <div className="lg:col-span-4 bg-white dark:bg-gray-900 border border-slate-200/80 dark:border-gray-800 rounded-2xl p-4 flex flex-col h-[820px] shadow-sm">
          {/* Quick Filter Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-gray-800 rounded-xl mb-3">
            {[
              { id: "all", label: "All" },
              { id: "active", label: "Active" },
              { id: "due", label: "Due M5-6" },
              { id: "confirmed", label: "Confirmed" }
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTabFilter(tab.id as any)}
                className={`flex-1 py-1.5 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${activeTabFilter === tab.id
                    ? "bg-white dark:bg-gray-900 text-slate-900 dark:text-white shadow-2xs"
                    : "text-slate-500 dark:text-gray-400 hover:text-slate-700 dark:hover:text-gray-200"
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative mb-3">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search employee, designation..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50/70 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-xl pl-9 pr-3 py-2 text-xs font-semibold focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-400 text-slate-800 dark:text-gray-100 transition-colors shadow-2xs"
            />
          </div>

          <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 custom-scrollbar">
            {loading ? (
              <div className="text-center py-20 font-bold text-slate-400 text-xs animate-pulse">
                Loading probation records...
              </div>
            ) : filteredProbationers.length === 0 ? (
              <div className="text-center py-20 text-slate-400 font-bold text-xs">
                No probationers found
              </div>
            ) : (
              filteredProbationers.map((p, i) => {
                const isSelected = selectedProbationer && selectedProbationer.id === p.id && !showInitForm;
                const status = p.status;
                const initials = (p.employee?.name || "U").split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase();
                const evaluatedCount = Object.keys(p.monthlyEvaluations || {}).length;
                const progressPercent = Math.round((evaluatedCount / 6) * 100);

                return (
                  <button
                    key={p.id || i}
                    onClick={() => handleSelectProbationer(p)}
                    className={`w-full text-left p-3.5 rounded-xl border transition-all flex flex-col gap-2.5 cursor-pointer ${isSelected
                        ? "bg-indigo-50/50 dark:bg-indigo-950/30 border-indigo-400 dark:border-indigo-600 shadow-xs ring-1 ring-indigo-400/30"
                        : "bg-slate-50/40 dark:bg-gray-800/40 border-slate-200/70 dark:border-gray-800 hover:border-slate-300 dark:hover:border-gray-700 hover:bg-white dark:hover:bg-gray-800"
                      }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${isSelected ? "bg-indigo-600 text-white" : "bg-slate-200 dark:bg-gray-700 text-slate-700 dark:text-gray-300"}`}>
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-xs text-slate-800 dark:text-gray-100 truncate">{p.employee?.name || "Unknown"}</div>
                          <div className="text-[10px] text-slate-400 truncate">{p.employee?.employeeProfile?.designation || p.employee?.designation || p.employee?.role || "Employee"}</div>
                        </div>
                      </div>

                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-gray-800 text-slate-600 dark:text-gray-300 shrink-0">
                        {evaluatedCount}/6 Done
                      </span>
                    </div>

                    {/* Progress indicator */}
                    <div className="space-y-1">
                      <div className="h-1.5 rounded-full overflow-hidden bg-slate-200/80 dark:bg-gray-700">
                        <div
                          className="h-full bg-gradient-to-r from-indigo-500 to-teal-400 rounded-full transition-all duration-300"
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-0.5">
                      <span className={`text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full border shadow-2xs ${getStatusBadge(status)}`}>
                        {status === "active" ? "In Progress" : status}
                      </span>
                      <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold flex items-center gap-1">
                        {evaluatedCount === 6 ? "✓ All 6 Months Filled" : `Next: M${evaluatedCount + 1}`}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Side: Evaluation Workspace */}
        <div className="lg:col-span-8">
          {showInitForm ? (
            <div className="bg-white dark:bg-gray-900 border border-slate-200/80 dark:border-gray-800 rounded-2xl p-7 shadow-sm flex flex-col h-[820px]">
              <div className="mb-6 border-b border-slate-100 dark:border-gray-800 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                    <UserPlus className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-slate-800 dark:text-white">
                      Initialize 6-Month Probation
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-gray-400 mt-0.5">
                      Select an employee to officially begin their 6-month probation journey
                    </p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleInitializeProbation} className="space-y-6 max-w-lg">
                <div>
                  <label className="text-[11px] uppercase font-bold tracking-wider text-slate-600 dark:text-gray-300 block mb-2">
                    Select Employee
                  </label>
                  <select
                    className="w-full border border-slate-200 dark:border-gray-700 rounded-xl p-3 text-xs font-semibold focus:border-indigo-500 dark:focus:border-indigo-400 outline-none text-slate-700 dark:text-gray-200 bg-slate-50/60 dark:bg-gray-800 shadow-2xs cursor-pointer"
                    value={newProbationEmployee}
                    onChange={e => setNewProbationEmployee(e.target.value)}
                    required
                  >
                    <option value="">-- Choose an employee --</option>
                    {availableEmployees.map((emp, i) => (
                      <option key={emp.id || i} value={emp.id}>
                        {emp.name} ({emp.employeeProfile?.designation || emp.role} • {emp.employeeProfile?.department || "General"})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-900/60 p-4 rounded-xl flex gap-3 text-indigo-900 dark:text-indigo-200">
                  <Clock className="w-5 h-5 shrink-0 text-indigo-600 dark:text-indigo-400 mt-0.5" />
                  <div className="text-xs font-medium leading-relaxed">
                    By initializing, the system will automatically calculate the probation end date as <strong>6 months from today</strong>. You will be able to evaluate each month sequentially.
                  </div>
                </div>

                <div className="pt-2 flex gap-3">
                  <button
                    type="submit"
                    disabled={submitting || !newProbationEmployee}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm hover:shadow flex-1 disabled:opacity-50 cursor-pointer"
                  >
                    {submitting ? "Initializing..." : "Start Probation Track"}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowInitForm(false); if (probationers.length > 0) handleSelectProbationer(probationers[0]); }}
                    className="bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 hover:bg-slate-50 dark:hover:bg-gray-750 text-slate-600 dark:text-gray-300 px-6 py-2.5 rounded-xl text-xs font-bold transition-all flex-1 cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          ) : selectedProbationer ? (
            <div className="bg-white dark:bg-gray-900 border border-slate-200/80 dark:border-gray-800 rounded-2xl p-6 shadow-sm flex flex-col h-[820px]">
              {/* Profile Details Banner */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-100 dark:border-gray-800 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-700 text-white flex items-center justify-center font-black text-sm shadow-xs">
                    {(selectedProbationer.employee?.name || "U").split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-slate-900 dark:text-white">
                      {selectedProbationer.employee?.name || "Unknown"}
                    </h2>
                    <div className="text-slate-500 dark:text-gray-400 text-[11px] mt-0.5 flex flex-wrap gap-x-3 gap-y-1">
                      <span>Role: <strong className="text-slate-700 dark:text-gray-200">{selectedProbationer.employee?.designation || selectedProbationer.employee?.role}</strong></span>
                      <span>•</span>
                      <span>Started: <strong className="text-slate-700 dark:text-gray-200">{new Date(selectedProbationer.startDate).toLocaleDateString()}</strong></span>
                      <span>•</span>
                      <span>Target: <strong className="text-indigo-600 dark:text-indigo-400">{new Date(selectedProbationer.endDate).toLocaleDateString()}</strong></span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                  {selectedProbationer.employee && (
                    <button
                      type="button"
                      onClick={() => {
                        const empId = selectedProbationer.employee?.id || selectedProbationer.employee?.id;
                        if (empId && onViewWorkReport) {
                          onViewWorkReport(empId);
                        }
                      }}
                      className="px-3.5 py-2 bg-indigo-50/70 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/50 border border-indigo-200/80 dark:border-indigo-800/60 rounded-xl flex items-center gap-1.5 text-indigo-700 dark:text-indigo-300 font-bold text-xs transition-all shadow-2xs cursor-pointer"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      Work Report
                    </button>
                  )}

                  <div className={`px-3.5 py-1.5 rounded-xl border text-center ${getStatusBadge(selectedProbationer.status)}`}>
                    <span className="text-[9px] uppercase font-bold tracking-wider block opacity-70">Verdict</span>
                    <span className="text-xs font-black">
                      {selectedProbationer.status === 'active' ? "In Progress" : selectedProbationer.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Compact & Classy 6-Month Milestone Stepper Strip */}
              <div className="my-2.5 shrink-0 space-y-2">
                <div className="flex items-center gap-1 p-1 bg-slate-100/90 dark:bg-gray-800/90 rounded-xl border border-slate-200/60 dark:border-gray-700/60">
                  {MILESTONE_TITLES.map(step => {
                    const isSelected = step.m === selectedMonthIndex;
                    const savedData = selectedProbationer?.monthlyEvaluations?.[step.m];
                    const isFilled = Boolean(savedData);

                    return (
                      <button
                        key={step.m}
                        type="button"
                        onClick={() => switchMonth(selectedProbationer, step.m)}
                        className={`flex-1 py-2 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${isSelected
                            ? "bg-indigo-600 text-white shadow-xs"
                            : isFilled
                              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 hover:bg-emerald-100"
                              : "text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-gray-700/60"
                          }`}
                      >
                        {isFilled ? (
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400 shrink-0" />
                        ) : (
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isSelected ? "bg-white" : "bg-slate-400"}`} />
                        )}
                        <span className="truncate">{step.code}: {step.title.split(" ")[0]}</span>
                        {isFilled && (
                          <span className={`text-[10px] font-mono font-black ${isSelected ? "text-indigo-100" : "text-emerald-600 dark:text-emerald-400"}`}>
                            {savedData.score}%
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Inline Milestone Header & Action Banner */}
                <div className="flex items-center justify-between px-1 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-slate-800 dark:text-gray-200">
                      {currentMilestone.code}: {currentMilestone.title} ({currentMonthDate})
                    </span>
                    <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
                      • {currentMilestone.desc}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {isSelectedMonthSaved && !isEditing ? (
                      <button
                        type="button"
                        onClick={() => setIsEditing(true)}
                        className="px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 border border-indigo-200/80 dark:border-indigo-800 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                      >
                        <PenTool className="w-3 h-3" /> Edit Details
                      </button>
                    ) : isSelectedMonthSaved && isEditing ? (
                      <button
                        type="button"
                        onClick={() => switchMonth(selectedProbationer, selectedMonthIndex)}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-gray-800 text-slate-600 dark:text-gray-300 rounded-lg text-xs font-bold transition-all cursor-pointer"
                      >
                        Cancel Edit
                      </button>
                    ) : (
                      <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-bold">
                        • New Review Fill Mode
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Scrollable Form Content */}
              <div className="flex-1 overflow-y-auto py-1 pr-1.5 custom-scrollbar">
                <form id="eval-form" onSubmit={handleSubmitEvaluation} className="space-y-4">
                  {/* 7 Performance Pillars - Professional 0-100 Numeric Scoring */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    {[
                      { label: "1. Core KPI Delivery", key: "kpi", val: evalForm.kpi, desc: "Task quality, speed & targets", icon: <Target className="w-3.5 h-3.5 text-indigo-500" /> },
                      { label: "2. Attendance & Punctuality", key: "attendance", val: evalForm.attendance, desc: "Punch timing & regularity", icon: <Calendar className="w-3.5 h-3.5 text-emerald-500" /> },
                      { label: "3. SOD / EOD Regularity", key: "sodeod", val: evalForm.sodeod, desc: "Daily task declarations", icon: <Clock className="w-3.5 h-3.5 text-teal-500" /> },
                      { label: "4. Behaviour & Culture Fit", key: "behaviour", val: evalForm.behaviour, desc: "Team collaboration & etiquette", icon: <Users className="w-3.5 h-3.5 text-purple-500" /> },
                      { label: "5. Reporting Discipline", key: "reporting", val: evalForm.reporting, desc: "Updates to reporting manager", icon: <MessageSquare className="w-3.5 h-3.5 text-blue-500" /> },
                      { label: "6. Loyalty & Stability Index", key: "loyalty", val: evalForm.loyalty, desc: "Long-term engagement & trust", icon: <Shield className="w-3.5 h-3.5 text-amber-500" /> },
                      { label: "7. Reliability & Risk Score", key: "risk", val: evalForm.risk, desc: "Dependability (higher is safer)", icon: <AlertTriangle className="w-3.5 h-3.5 text-rose-500" /> }
                    ].map(metric => (
                      <div
                        key={metric.key}
                        className="p-3 rounded-xl border border-slate-200/70 dark:border-gray-800 bg-slate-50/40 dark:bg-gray-850/40 space-y-2 transition-all hover:border-slate-300"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            {metric.icon}
                            <div>
                              <label className="text-xs font-bold text-slate-800 dark:text-gray-200 block leading-tight">{metric.label}</label>
                              <span className="text-[10px] text-slate-400 leading-tight">{metric.desc}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              min={0}
                              max={100}
                              disabled={!isEditing}
                              value={metric.val}
                              onChange={e => {
                                const v = Math.max(0, Math.min(100, Number(e.target.value) || 0));
                                setEvalForm({ ...evalForm, [metric.key]: v });
                              }}
                              className={`w-14 text-center font-mono font-black text-xs py-1 px-1 rounded-lg border transition-all ${getScoreColor(metric.val)} ${isEditing ? "bg-white dark:bg-gray-800 shadow-2xs focus:ring-2 focus:ring-indigo-500/30 outline-none" : "cursor-not-allowed opacity-75"}`}
                            />
                            <span className="text-[10px] font-bold text-slate-400">/ 100</span>
                          </div>
                        </div>

                        {/* Sleek Slider + Quick Jump Chips */}
                        <div className="flex items-center gap-2.5 pt-0.5">
                          <input
                            type="range"
                            min={0}
                            max={100}
                            disabled={!isEditing}
                            value={metric.val}
                            onChange={e => setEvalForm({ ...evalForm, [metric.key]: Number(e.target.value) })}
                            className={`flex-1 accent-indigo-600 h-1.5 bg-slate-200 dark:bg-gray-700 rounded-lg appearance-none ${isEditing ? "cursor-pointer" : "cursor-not-allowed opacity-60"}`}
                          />

                          {isEditing && (
                            <div className="flex items-center gap-1 shrink-0">
                              {[25, 50, 75, 100].map(pt => (
                                <button
                                  key={pt}
                                  type="button"
                                  onClick={() => setEvalForm({ ...evalForm, [metric.key]: pt })}
                                  className={`px-1.5 py-0.5 text-[9px] font-bold rounded transition-all border ${metric.val === pt
                                      ? "bg-indigo-600 text-white border-indigo-600"
                                      : "bg-white dark:bg-gray-800 text-slate-500 border-slate-200 dark:border-gray-700 hover:border-indigo-300"
                                    }`}
                                >
                                  {pt}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Summary Metric Strip */}
                  <div className="p-2.5 rounded-xl border border-indigo-200/80 dark:border-indigo-900/60 bg-indigo-50/40 dark:bg-indigo-950/20 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-black text-indigo-900 dark:text-indigo-200">
                        {currentMilestone.code} Overall Score Average
                      </span>
                      <p className="text-[10px] text-slate-500">Aggregated across all 7 evaluation pillars</p>
                    </div>
                    <span className={`text-sm font-black px-3 py-1 rounded-xl border shadow-2xs ${getScoreColor(avgScore)}`}>
                      {avgScore}%
                    </span>
                  </div>

                  {/* Manager Feedback */}
                  <div>
                    <h4 className="text-[11px] font-black tracking-wider text-slate-400 uppercase font-mono mb-2">
                      8. Manager Descriptive Feedback for {currentMilestone.code}
                    </h4>

                    {/* Quick suggestion tags (only in edit mode) */}
                    {isEditing && (
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {quickFeedbackSuggestions.map((tag, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handleAddFeedbackTag(tag)}
                            className="text-[10px] font-semibold px-2 py-0.5 rounded-lg border bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 dark:bg-gray-800 dark:hover:bg-indigo-950/50 dark:hover:text-indigo-300 dark:border-gray-700 transition-colors cursor-pointer"
                          >
                            + {tag}
                          </button>
                        ))}
                      </div>
                    )}

                    <textarea
                      required
                      rows={3}
                      disabled={!isEditing}
                      className={`w-full border border-slate-200 dark:border-gray-700 rounded-xl p-3.5 text-xs font-semibold focus:border-indigo-500 dark:focus:border-indigo-400 outline-none text-slate-700 dark:text-gray-200 transition-colors shadow-2xs ${isEditing ? "bg-slate-50/50 dark:bg-gray-800" : "bg-slate-100/70 dark:bg-gray-850 cursor-not-allowed opacity-80"}`}
                      placeholder={`Enter detailed observations and milestone remarks for ${currentMilestone.code} (${currentMonthDate})...`}
                      value={evalForm.feedback}
                      onChange={e => setEvalForm({ ...evalForm, feedback: e.target.value })}
                    />
                  </div>

                  {/* Final Action Verdict Cards & Save Action */}
                  <div className="p-5 rounded-2xl border border-slate-200/80 dark:border-gray-800 bg-gradient-to-br from-slate-50 via-white to-slate-50/50 dark:from-gray-900 dark:via-gray-850 dark:to-gray-900 shadow-xs space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Award className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        <h4 className="text-xs font-black tracking-wider text-slate-900 dark:text-white uppercase font-mono">
                          Overall Probation Outcome Decision
                        </h4>
                      </div>
                      <span className="text-[11px] font-bold text-slate-400">Current Status: {selectedProbationer.status}</span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      {[
                        { id: "Confirm", title: "Confirm", desc: "Passed & Permanent", color: "border-emerald-500 bg-emerald-50/80 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300" },
                        { id: "Extend", title: "Extend", desc: "Grant More Time", color: "border-purple-500 bg-purple-50/80 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300" },
                        { id: "Restrict role", title: "Restrict Role", desc: "Modify Scope", color: "border-amber-500 bg-amber-50/80 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300" },
                        { id: "Exit", title: "Exit", desc: "Terminate Journey", color: "border-rose-500 bg-rose-50/80 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300" }
                      ].map(outcome => {
                        const isSelected = evalForm.verdict === outcome.id;

                        return (
                          <button
                            key={outcome.id}
                            type="button"
                            disabled={!isEditing}
                            onClick={() => setEvalForm({ ...evalForm, verdict: outcome.id })}
                            className={`p-3 rounded-xl border text-left transition-all ${isEditing ? "cursor-pointer" : "cursor-not-allowed"} ${isSelected
                                ? `${outcome.color} shadow-xs ring-2 ring-indigo-500/30 font-bold scale-[1.02]`
                                : "bg-white dark:bg-gray-800 border-slate-200 dark:border-gray-700 text-slate-600 dark:text-gray-300 hover:border-slate-300"
                              }`}
                          >
                            <div className="font-black text-xs">{outcome.title}</div>
                            <div className="text-[10px] opacity-75 mt-0.5 truncate">{outcome.desc}</div>
                          </button>
                        );
                      })}
                    </div>

                    {/* Action button */}
                    {isEditing ? (
                      <button
                        type="submit"
                        disabled={submitting}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3.5 rounded-xl text-xs sm:text-sm font-black tracking-wide transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 hover:scale-[1.005] active:scale-[0.995] disabled:opacity-50 cursor-pointer"
                      >
                        <CheckCircle className="w-4 h-4" />
                        {submitting
                          ? "Saving Evaluation..."
                          : isSelectedMonthSaved
                            ? `Update & Save ${currentMilestone.code} (${currentMonthDate}) Evaluation`
                            : selectedMonthIndex < 6
                              ? `Save ${currentMilestone.code} (${currentMonthDate}) & Proceed to M${selectedMonthIndex + 1}`
                              : `Save Final ${currentMilestone.code} & Complete Probation Evaluation`
                        }
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setIsEditing(true)}
                        className="w-full bg-slate-900 hover:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-700 text-white py-3.5 rounded-xl text-xs sm:text-sm font-black tracking-wide transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 hover:scale-[1.005] active:scale-[0.995] cursor-pointer"
                      >
                        <PenTool className="w-4 h-4" /> Edit {currentMilestone.code} ({currentMonthDate}) Details
                      </button>
                    )}
                  </div>
                </form>
              </div>
            </div>
          ) : (
            <div className="text-center py-40 bg-white dark:bg-gray-900 rounded-2xl border border-slate-200/80 dark:border-gray-800 shadow-sm flex flex-col justify-center items-center h-[820px]">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-500 flex items-center justify-center mb-4">
                <FileText className="w-7 h-7" />
              </div>
              <h4 className="text-sm font-black text-slate-800 dark:text-gray-200">No Probationer Selected</h4>
              <p className="text-xs text-slate-400 mt-1 max-w-xs leading-relaxed">
                Select an employee from the left panel to evaluate their 6-month milestones or click Initialize Track to start a new journey.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
