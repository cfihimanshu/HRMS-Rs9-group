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
  RefreshCw
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
          .map((v: any) => (v.candidate?._id || v.candidate)?.toString());

        const filtered = data.data.filter((c: any) => 
          verifiedCandIds.includes(c._id.toString())
        );

        const sorted = filtered.sort((a: any, b: any) => {
          const statusOrder: Record<string, number> = { Selected: 1, Shortlisted: 2, Applied: 3 };
          return (statusOrder[a.status] || 99) - (statusOrder[b.status] || 99);
        });
        setCandidates(sorted);

        // Auto-select candidate if none is selected or if current is not in the eligible list
        const isEligible = selectedCandidate && sorted.some((c: any) => c._id === selectedCandidate._id);
        if (!isEligible) {
          if (sorted.length > 0) {
            const initialEligible = initialCandidate && sorted.find((c: any) => c._id === initialCandidate._id);
            const defaultSelect = initialEligible || sorted[0];
            setSelectedCandidate(defaultSelect);
            loadOnboardingRecord(defaultSelect._id);
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
      const isEligible = candidates.some(c => c._id === initialCandidate._id);
      if (isEligible) {
        setSelectedCandidate(initialCandidate);
        loadOnboardingRecord(initialCandidate._id);
      }
    }
  }, [initialCandidate, candidates]);

  const handleSelectCandidate = (candidate: any) => {
    setSelectedCandidate(candidate);
    loadOnboardingRecord(candidate._id);
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
          candidateId: selectedCandidate._id,
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
          candidateId: selectedCandidate._id,
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

  // Filter candidates list
  const filteredCandidates = candidates.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.job && c.job.title.toLowerCase().includes(searchQuery.toLowerCase()))
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
                const isSelected = selectedCandidate && selectedCandidate._id === c._id;
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
                          {onboardingRecord.signedDocs?.length || 0} / {onboardingRecord.generatedDocs?.length || 0}
                        </span>
                        <span className="text-[9px] text-slate-400 font-bold block">Documents Signed</span>
                      </div>
                    </div>

                    <div className="h-2.5 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#714B67] rounded-full transition-all duration-550"
                        style={{
                          width: `${onboardingRecord.generatedDocs?.length
                              ? ((onboardingRecord.signedDocs?.length || 0) / onboardingRecord.generatedDocs.length) * 100
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
                          {onboardingRecord.generatedDocs?.map((doc: any, i: number) => {
                            const isSigned = onboardingRecord.signedDocs?.some((s: any) => s.name === doc.name);
                            return (
                              <tr key={i} className="hover:bg-slate-50/50">
                                <td className="py-3 pr-2 font-bold text-slate-805 flex items-center gap-2">
                                  <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                                  <span>{doc.name}</span>
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
                                        onClick={() => handleSignDoc(doc.name)}
                                        disabled={submitting}
                                        className="bg-amber-600 hover:bg-amber-700 text-white px-2.5 py-1.5 rounded text-[10px] font-black flex items-center gap-1 transition-all shadow-sm"
                                        title="Simulate candidate signature"
                                      >
                                        <PenTool className="w-3.5 h-3.5" /> Simulate E-Sign
                                      </button>
                                    )}
                                    <a
                                      href={doc.url}
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
  const isHR = userRole === "HR Head" || userRole === "HR Executive";
  const canSubmitFinalVerdict = userRole === "HR Head" || userRole === "Owner";

  const [trainees, setTrainees] = useState<any[]>([]);
  const [selectedTrainee, setSelectedTrainee] = useState<any>(null);
  const [trainingRecord, setTrainingRecord] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [assessmentForm, setAssessmentForm] = useState({ dayNumber: 1, sopScore: 0, crmScore: 0, reportingScore: 0, behaviourScore: 0, remarks: "" });
  const [finalRec, setFinalRec] = useState("Activation");

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
          .map((v: any) => (v.candidate?._id || v.candidate)?.toString());

        // Identify candidates with exactly 3 selected interview rounds
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

        // Filter: Candidate ID must have 1, 2, and 3 all selected, AND must be vetting-verified
        const eligibleCandIds = Object.keys(candidateInterviewsMap).filter(cid => {
          const rounds = candidateInterviewsMap[cid];
          const isThreeRoundsSelected = rounds.has(1) && rounds.has(2) && rounds.has(3);
          const isVettingVerified = verifiedCandIds.includes(cid);
          return isThreeRoundsSelected && isVettingVerified;
        });

        // Merge: all active training records + candidates who don't have a training record
        // ONLY candidates in eligibleCandIds are shown!
        const traineesList: any[] = [];

        // Add candidates from training records ONLY if they are eligible
        activeTrainings.forEach((tr: any) => {
          if (tr.candidate && eligibleCandIds.includes(tr.candidate._id)) {
            traineesList.push({ ...tr.candidate, trainingRecord: tr });
          }
        });

        // Add eligible candidates who aren't in training yet
        candidates.forEach((c: any) => {
          if (eligibleCandIds.includes(c._id) && !activeTrainings.some((tr: any) => tr.candidate && tr.candidate._id === c._id)) {
            traineesList.push({ ...c, trainingRecord: null });
          }
        });

        setTrainees(traineesList);

        // Auto-select first or update selected
        if (traineesList.length > 0) {
          const stillExists = selectedTrainee && traineesList.some(t => t._id === selectedTrainee._id);
          if (!stillExists) {
            handleSelectTrainee(traineesList[0]);
          } else {
            const updatedTrainee = traineesList.find(t => t._id === selectedTrainee._id);
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
    setTrainingRecord(trainee.trainingRecord);
    // Reset forms
    if (trainee.trainingRecord && trainee.trainingRecord.assessments?.length > 0) {
      setAssessmentForm(prev => ({ ...prev, dayNumber: trainee.trainingRecord.assessments.length + 1 > 3 ? 3 : trainee.trainingRecord.assessments.length + 1 }));
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
          candidateId: selectedTrainee._id,
          status: "Orientation"
        })
      });
      const data = await res.json();
      if (data.success) {
        triggerToast("Training started successfully");
        setTrainingRecord(data.data);
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
          candidateId: selectedTrainee._id,
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
        setTrainingRecord(data.data);
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
          candidateId: selectedTrainee._id,
          status: nextStatus,
          recommendation: finalRec
        })
      });
      const data = await res.json();
      if (data.success) {
        triggerToast(`Final recommendation submitted: ${finalRec}`);
        setTrainingRecord(data.data);
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
                const isSelected = selectedTrainee && selectedTrainee._id === t._id;
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
                  <div className="text-slate-500 text-[10px] mt-1">
                    Email: <strong className="text-slate-700">{selectedTrainee.email}</strong> • Mobile: <strong className="text-slate-700">{selectedTrainee.mobile}</strong>
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
                    {isHR ? (
                      <button
                        onClick={handleStartTraining}
                        disabled={submitting}
                        className="bg-[#714B67] hover:bg-[#5F3F56] text-white px-6 py-3 rounded-lg text-xs font-bold transition-all shadow-md inline-flex items-center gap-2"
                      >
                        <Plus className="w-4 h-4" /> Start Orientation & Training
                      </button>
                    ) : (
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wide block bg-slate-50 border border-slate-200 rounded-lg p-3 max-w-xs mx-auto text-center">
                        Awaiting HR to Start Training
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

                        {isHR ? (
                          <>
                            {/* Daily Assessment Form */}
                            {trainingRecord.status !== "Activation" && trainingRecord.status !== "Final Status" && (
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
                          </>
                        ) : (
                          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 text-center shadow-sm">
                            <AlertCircle className="w-5 h-5 text-slate-400 mx-auto mb-2" />
                            <span className="text-[11px] text-slate-650 font-black uppercase tracking-wider block">Access Restricted</span>
                            <p className="text-[10.5px] text-slate-500 mt-1 font-semibold leading-relaxed">
                              Only HR Head or HR Executive role is authorized to submit assessments, set scores, or decide final verdicts.
                            </p>
                          </div>
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

export function ProbationEvaluation({ triggerToast }: { triggerToast: (msg: string) => void; }) {
  const [probationers, setProbationers] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedProbationer, setSelectedProbationer] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showInitForm, setShowInitForm] = useState(false);
  const [newProbationEmployee, setNewProbationEmployee] = useState("");

  // Evaluation Form State
  const [evalForm, setEvalForm] = useState({
    kpi: 0,
    attendance: 0,
    sodeod: 0,
    behaviour: 0,
    reporting: 0,
    loyalty: 0,
    risk: 0,
    feedback: "",
    verdict: "Confirm"
  });

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

    // Auto-fill existing KPIs if available
    const getScore = (name: string) => {
      const found = prob.kpis?.find((k: any) => k.kpiName === name);
      return found ? found.score : 0;
    };

    setEvalForm({
      kpi: getScore("KPI"),
      attendance: getScore("Attendance"),
      sodeod: getScore("SOD/EOD"),
      behaviour: getScore("Behaviour"),
      reporting: getScore("Reporting"),
      loyalty: getScore("Loyalty"),
      risk: getScore("Risk Score"),
      feedback: prob.feedback || "",
      verdict: prob.status === "active" ? "Confirm" : prob.status
    });
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
          probationId: selectedProbationer._id,
          status: evalForm.verdict,
          kpis: kpisArray,
          feedback: evalForm.feedback
        })
      });

      const data = await res.json();
      if (data.success) {
        triggerToast(`Probation evaluated! Verdict: ${evalForm.verdict}`);
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

  const filteredProbationers = probationers.filter(p => p.employee?.name?.toLowerCase().includes(searchQuery.toLowerCase()));

  // Filter out employees who are already in the probation list
  const availableEmployees = employees.filter(emp => !probationers.some(p => p.employee?._id === emp._id));

  return (
    <div className="space-y-8 animate-fadeIn text-slate-800">

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-black text-slate-800">Probation Evaluation Matrix</h1>
          <p className="text-xs text-slate-500 mt-1">Standard 6-Month Track — Performance, Behaviour, & Final Confirmation</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowInitForm(true)}
            className="bg-[#714B67] hover:bg-[#5F3F56] px-4 py-2 rounded-lg text-xs font-bold text-white transition-all shadow-sm flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Initialize Track
          </button>
          <button
            onClick={loadData}
            disabled={loading}
            className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 transition duration-150 shrink-0"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

        {/* Left Side: Probationers list */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-4 flex flex-col h-[680px] shadow-sm">
          <h3 className="text-xs font-black tracking-widest text-[#714B67] uppercase font-mono mb-3">Active Probationers</h3>

          <div className="relative mb-3">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search employee..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-4 py-2 text-xs font-semibold focus:outline-none focus:border-[#714B67] text-slate-800"
            />
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
            {loading ? (
              <div className="text-center py-10 font-bold text-slate-400 text-[10px] animate-pulse">Loading probation records...</div>
            ) : filteredProbationers.length === 0 ? (
              <div className="text-center py-10 text-slate-400 font-bold text-[10px]">No active probationers found</div>
            ) : (
              filteredProbationers.map((p, i) => {
                const isSelected = selectedProbationer && selectedProbationer._id === p._id && !showInitForm;
                const status = p.status;
                const monthsElapsed = Math.round((new Date().getTime() - new Date(p.startDate).getTime()) / (1000 * 60 * 60 * 24 * 30));

                return (
                  <button
                    key={i}
                    onClick={() => handleSelectProbationer(p)}
                    className={`w-full text-left p-3 rounded-lg border transition-all flex flex-col gap-2 ${isSelected
                        ? "bg-[#714B67]/5 border-[#714B67] shadow-sm"
                        : "bg-white border-slate-100 hover:border-slate-350 hover:bg-slate-50/50"
                      }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-slate-800 text-xs truncate">{p.employee?.name || "Unknown"}</div>
                      <span className="text-[10px] text-slate-500 font-mono">M-{Math.max(1, Math.min(6, monthsElapsed))}/6</span>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border self-start ${status === "Confirm" ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" :
                          status === "Exit" ? "bg-red-500/10 text-red-600 border-red-500/20" :
                            status === "Restrict role" ? "bg-orange-500/10 text-orange-600 border-orange-500/20" :
                              status === "Extend" ? "bg-purple-500/10 text-purple-600 border-purple-500/20" :
                                "bg-blue-500/10 text-blue-600 border-blue-500/20"
                        }`}>
                        {status === "active" ? "In Progress" : status}
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
            <div className="bg-white border border-slate-200 rounded-xl p-8 shadow-sm flex flex-col h-[680px]">
              <div className="mb-8 border-b border-slate-100 pb-4">
                <h2 className="text-xl font-black text-slate-850 flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-[#714B67]" />
                  Initialize 6-Month Probation
                </h2>
                <p className="text-xs text-slate-500 mt-2 max-w-lg leading-relaxed">
                  Select an employee who has just completed their training or onboarding to officially start their 6-month probation tracking journey.
                </p>
              </div>

              <form onSubmit={handleInitializeProbation} className="space-y-6 max-w-md">
                <div>
                  <label className="text-[10px] uppercase font-black tracking-widest text-slate-500 block mb-2">Select Employee</label>
                  <select
                    className="w-full border border-slate-200 rounded-lg p-3 text-xs focus:border-[#714B67] outline-none text-slate-700 bg-slate-50"
                    value={newProbationEmployee}
                    onChange={e => setNewProbationEmployee(e.target.value)}
                    required
                  >
                    <option value="">-- Select an employee --</option>
                    {availableEmployees.map((emp, i) => (
                      <option key={i} value={emp._id}>{emp.name} ({emp.role})</option>
                    ))}
                  </select>
                </div>

                <div className="bg-blue-50/50 border border-blue-100 p-4 rounded-lg flex gap-3 text-blue-800">
                  <Clock className="w-5 h-5 shrink-0 text-blue-500" />
                  <div className="text-xs font-semibold leading-relaxed">
                    By initializing, the system will automatically calculate the probation end date as 6 months from today. You can monitor their progress during this period.
                  </div>
                </div>

                <div className="pt-4 flex gap-3">
                  <button
                    type="submit"
                    disabled={submitting || !newProbationEmployee}
                    className="bg-[#714B67] hover:bg-[#5F3F56] text-white px-6 py-2.5 rounded-lg text-xs font-bold transition-all shadow-md flex-1 disabled:opacity-50"
                  >
                    Start Probation Track
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowInitForm(false); if (probationers.length > 0) handleSelectProbationer(probationers[0]); }}
                    className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 px-6 py-2.5 rounded-lg text-xs font-bold transition-all flex-1"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          ) : selectedProbationer ? (
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col h-[680px]">

              {/* Profile details banner */}
              <div className="flex justify-between items-start gap-4 pb-4 border-b border-slate-150 shrink-0">
                <div>
                  <h2 className="text-lg font-black text-slate-850 flex items-center gap-2">
                    <UserPlus className="w-5 h-5 text-[#714B67]" />
                    {selectedProbationer.employee?.name || "Unknown"}
                  </h2>
                  <div className="text-slate-500 text-[10px] mt-1.5 flex gap-4">
                    <span>Role: <strong className="text-slate-700">{selectedProbationer.employee?.role}</strong></span>
                    <span>Started: <strong className="text-slate-700">{new Date(selectedProbationer.startDate).toLocaleDateString()}</strong></span>
                    <span>Ends: <strong className="text-[#714B67]">{new Date(selectedProbationer.endDate).toLocaleDateString()}</strong></span>
                  </div>
                </div>

                <div className={`px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-center min-w-32`}>
                  <span className="text-[9px] uppercase font-black tracking-widest text-slate-500 block mb-0.5">Verdict Status</span>
                  <span className={`text-xs font-bold ${selectedProbationer.status === 'active' ? 'text-blue-600' : 'text-[#714B67]'}`}>
                    {selectedProbationer.status === 'active' ? "In Progress" : selectedProbationer.status}
                  </span>
                </div>
              </div>

              {/* Scrollable Form Content */}
              <div className="flex-1 overflow-y-auto py-5 pr-2 scrollbar-thin">
                <form id="eval-form" onSubmit={handleSubmitEvaluation} className="space-y-8">

                  {/* The 7 Metrics Grid */}
                  <div>
                    <h4 className="text-[10px] font-black tracking-widest text-slate-400 uppercase font-mono mb-4 border-b border-slate-100 pb-2">Scoring Metrics (0-100 Scale)</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">

                      {/* Metric 1 */}
                      <div>
                        <div className="flex justify-between mb-1">
                          <label className="text-[10px] font-bold text-slate-700">1. Core KPI Delivery</label>
                          <span className="text-[10px] font-mono text-[#714B67] font-black">{evalForm.kpi}%</span>
                        </div>
                        <input type="range" min="0" max="100" className="w-full accent-[#714B67] h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                          value={evalForm.kpi} onChange={e => setEvalForm({ ...evalForm, kpi: Number(e.target.value) })} />
                      </div>

                      {/* Metric 2 */}
                      <div>
                        <div className="flex justify-between mb-1">
                          <label className="text-[10px] font-bold text-slate-700">2. Attendance & Punctuality</label>
                          <span className="text-[10px] font-mono text-[#714B67] font-black">{evalForm.attendance}%</span>
                        </div>
                        <input type="range" min="0" max="100" className="w-full accent-[#714B67] h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                          value={evalForm.attendance} onChange={e => setEvalForm({ ...evalForm, attendance: Number(e.target.value) })} />
                      </div>

                      {/* Metric 3 */}
                      <div>
                        <div className="flex justify-between mb-1">
                          <label className="text-[10px] font-bold text-slate-700">3. SOD / EOD Regularity</label>
                          <span className="text-[10px] font-mono text-[#714B67] font-black">{evalForm.sodeod}%</span>
                        </div>
                        <input type="range" min="0" max="100" className="w-full accent-[#714B67] h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                          value={evalForm.sodeod} onChange={e => setEvalForm({ ...evalForm, sodeod: Number(e.target.value) })} />
                      </div>

                      {/* Metric 4 */}
                      <div>
                        <div className="flex justify-between mb-1">
                          <label className="text-[10px] font-bold text-slate-700">4. Behaviour & Culture Fit</label>
                          <span className="text-[10px] font-mono text-[#714B67] font-black">{evalForm.behaviour}%</span>
                        </div>
                        <input type="range" min="0" max="100" className="w-full accent-[#714B67] h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                          value={evalForm.behaviour} onChange={e => setEvalForm({ ...evalForm, behaviour: Number(e.target.value) })} />
                      </div>

                      {/* Metric 5 */}
                      <div>
                        <div className="flex justify-between mb-1">
                          <label className="text-[10px] font-bold text-slate-700">5. Reporting Discipline</label>
                          <span className="text-[10px] font-mono text-[#714B67] font-black">{evalForm.reporting}%</span>
                        </div>
                        <input type="range" min="0" max="100" className="w-full accent-[#714B67] h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                          value={evalForm.reporting} onChange={e => setEvalForm({ ...evalForm, reporting: Number(e.target.value) })} />
                      </div>

                      {/* Metric 6 */}
                      <div>
                        <div className="flex justify-between mb-1">
                          <label className="text-[10px] font-bold text-slate-700">6. Loyalty & Stability Index</label>
                          <span className="text-[10px] font-mono text-[#714B67] font-black">{evalForm.loyalty}%</span>
                        </div>
                        <input type="range" min="0" max="100" className="w-full accent-[#714B67] h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                          value={evalForm.loyalty} onChange={e => setEvalForm({ ...evalForm, loyalty: Number(e.target.value) })} />
                      </div>

                      {/* Metric 7 */}
                      <div>
                        <div className="flex justify-between mb-1">
                          <label className="text-[10px] font-bold text-slate-700">7. Risk Score (Higher is better)</label>
                          <span className="text-[10px] font-mono text-[#714B67] font-black">{evalForm.risk}%</span>
                        </div>
                        <input type="range" min="0" max="100" className="w-full accent-amber-500 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                          value={evalForm.risk} onChange={e => setEvalForm({ ...evalForm, risk: Number(e.target.value) })} />
                      </div>

                    </div>
                  </div>

                  {/* Manager Feedback */}
                  <div>
                    <h4 className="text-[10px] font-black tracking-widest text-slate-400 uppercase font-mono mb-3 border-b border-slate-100 pb-2">8. Manager Descriptive Feedback</h4>
                    <textarea
                      required rows={3}
                      className="w-full border border-slate-200 bg-slate-50 rounded-lg p-3 text-xs font-semibold focus:border-[#714B67] outline-none text-slate-700"
                      placeholder="Enter detailed feedback on the employee's performance during the probation period..."
                      value={evalForm.feedback}
                      onChange={e => setEvalForm({ ...evalForm, feedback: e.target.value })}
                    />
                  </div>

                  {/* Final Action Verdict */}
                  <div className="bg-amber-50/50 border border-amber-200 rounded-xl p-5 shadow-sm">
                    <h4 className="text-[10px] font-black tracking-widest text-amber-700 uppercase font-mono mb-4 flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4" /> Final Probation Verdict
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
                      <div>
                        <label className="text-[10px] font-bold text-slate-600 block mb-2">Select Outcome Decision</label>
                        <select
                          className="w-full border border-slate-300 rounded-lg p-3 text-xs font-bold text-slate-800 focus:border-[#714B67] outline-none shadow-sm"
                          value={evalForm.verdict}
                          onChange={e => setEvalForm({ ...evalForm, verdict: e.target.value })}
                        >
                          <option value="Confirm">Confirm (Passed Probation)</option>
                          <option value="Extend">Extend Probation Period</option>
                          <option value="Restrict role">Restrict Role / Demote</option>
                          <option value="Exit">Terminate / Exit Employee</option>
                        </select>
                      </div>

                      <button
                        type="submit"
                        disabled={submitting}
                        className="w-full bg-gradient-to-r from-[#714B67] to-[#5F3F56] hover:opacity-90 text-white py-3 rounded-lg text-xs font-black tracking-wide transition-all shadow-md flex items-center justify-center gap-2"
                      >
                        <CheckCircle className="w-4 h-4" /> Finalize Evaluation
                      </button>
                    </div>
                  </div>

                </form>
              </div>
            </div>
          ) : (
            <div className="text-center py-32 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center items-center h-[680px]">
              <FileText className="w-12 h-12 text-slate-300 mb-4 animate-bounce" />
              <h4 className="text-sm font-black text-slate-800 uppercase tracking-wide">No Probationer Selected</h4>
              <p className="text-xs text-slate-400 mt-2 max-w-xs leading-normal">
                Select an employee from the left panel to evaluate their probation metrics, or initialize a new probation track.
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
