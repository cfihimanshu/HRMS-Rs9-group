"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

interface Job {
  _id: string;
  title: string;
  location: string;
  category: string;
  salaryRange: string;
  company: { name: string };
  department: { name: string };
  description: string;
  qualification: string;
  experience: string;
}

export default function CandidateApplyPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params.id as string;

  const [job, setJob] = useState<Job | null>(null);
  const [jobLoading, setJobLoading] = useState(true);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [autoResponseMsg, setAutoResponseMsg] = useState("");
  const [submitError, setSubmitError] = useState("");

  // Step 1: Basic Info
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [qualification, setQualification] = useState("");
  const [experience, setExperience] = useState("");
  const [currentSalary, setCurrentSalary] = useState("");
  const [expectedSalary, setExpectedSalary] = useState("");
  const [noticePeriod, setNoticePeriod] = useState("");

  // Step 2: Risk Profiling (Yes/No)
  const [sideBusiness, setSideBusiness] = useState<"Yes" | "No">("No");
  const [loanPressure, setLoanPressure] = useState<"Yes" | "No">("No");
  const [courtCase, setCourtCase] = useState<"Yes" | "No">("No");
  const [targetWork, setTargetWork] = useState<"Yes" | "No">("Yes");
  const [fieldWork, setFieldWork] = useState<"Yes" | "No">("Yes");
  const [backgroundVerification, setBackgroundVerification] = useState<"Yes" | "No">("Yes");
  const [confidentialityAgreement, setConfidentialityAgreement] = useState<"Yes" | "No">("Yes");

  // Step 3: Simulated uploads
  const [uploadingField, setUploadingField] = useState<string | null>(null);
  const [uploads, setUploads] = useState<{ [key: string]: string }>({
    resume: "",
    photo: "",
    aadhaar: "",
    pan: "",
    salarySlip: "",
    bankStatement: "",
  });

  useEffect(() => {
    const fetchJob = async () => {
      try {
        const res = await fetch("/api/jobs");
        const data = await res.json();
        if (data.success) {
          const matched = data.data.find((j: any) => j._id === jobId);
          if (matched) {
            setJob(matched);
          }
        }
      } catch (err) {
        console.error("Failed to load job details", err);
      } finally {
        setJobLoading(false);
      }
    };
    if (jobId) {
      fetchJob();
    } else {
      setJobLoading(false);
    }
  }, [jobId]);

  const handleRealUpload = async (field: string, file: File) => {
    setUploadingField(field);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "hr_erp_uploads");

    try {
      const res = await fetch("/api/documents/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.success && data.url) {
        setUploads((prev) => ({ ...prev, [field]: data.url }));
      } else {
        alert("Upload failed: " + (data.error || "Unknown error"));
      }
    } catch (err) {
      alert("Upload error. Check your internet connection.");
    } finally {
      setUploadingField(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSubmitError("");

    const payload = {
      jobId: jobId || undefined,
      name,
      mobile,
      email,
      address,
      qualification,
      experience,
      currentSalary,
      expectedSalary,
      noticePeriod,
      riskAnswers: {
        sideBusiness,
        loanPressure,
        courtCase,
        targetWork,
        fieldWork,
        backgroundVerification,
        confidentialityAgreement,
      },
      uploads,
    };

    try {
      const res = await fetch("/api/candidates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        setSubmitted(true);
        setAutoResponseMsg(data.message);
      } else {
        setSubmitError(data.error || "Failed to submit application");
      }
    } catch (err) {
      setSubmitError("Network connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (jobLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100">
        <div className="w-8 h-8 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
        <div className="w-full max-w-lg bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 text-center shadow-2xl relative">
          <div className="absolute top-[-10%] left-[-10%] w-60 h-60 rounded-full bg-emerald-500/10 blur-[80px] pointer-events-none" />
          
          <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-8 h-8 animate-bounce"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
          </div>

          <h1 className="text-2xl font-bold text-white tracking-tight">Application Submitted!</h1>
          <p className="text-slate-400 text-sm mt-3 px-2 leading-relaxed">
            Thank you for applying to Acolyte Group of Companies. Your details have been securely logged in our system.
          </p>

          <div className="mt-8 bg-slate-950 border border-slate-800 rounded-2xl p-5 text-left space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-indigo-400">
              <span className="w-2 h-2 bg-indigo-500 rounded-full" />
              Automated HR Notification
            </div>
            <p className="text-xs text-slate-300 italic font-mono leading-relaxed">
              "{autoResponseMsg}"
            </p>
          </div>

          <button
            onClick={() => router.push("/login")}
            className="w-full mt-8 bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white rounded-xl py-3.5 text-sm font-semibold transition-all shadow-lg shadow-indigo-500/20 hover:scale-[1.01] active:scale-[0.99]"
          >
            Acolyte Employee Portal
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-10 px-4 md:px-8 relative overflow-hidden">
      <div className="absolute top-[-10%] right-[-10%] w-[35rem] h-[35rem] rounded-full bg-indigo-500/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[35rem] h-[35rem] rounded-full bg-violet-600/5 blur-[120px] pointer-events-none" />

      <div className="max-w-3xl mx-auto relative z-10">
        {/* Company Header */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-gradient-to-tr from-indigo-500 to-violet-600 rounded-xl flex items-center justify-center mx-auto mb-3">
            <span className="text-white text-lg font-bold font-serif">A</span>
          </div>
          <h2 className="text-sm font-bold text-indigo-400 tracking-widest uppercase">
            Recruitment Portal
          </h2>
          <h1 className="text-2xl font-bold text-white mt-1">Acolyte Group of Companies</h1>
        </div>

        {/* Job Info Banner */}
        {job && (
          <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 mb-8 backdrop-blur-xl">
            <div className="flex justify-between items-start gap-4 flex-wrap">
              <div>
                <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">
                  Applying For
                </span>
                <h2 className="text-xl font-bold text-white mt-0.5">{job.title}</h2>
                <div className="text-xs text-slate-400 mt-1.5 flex gap-4 flex-wrap">
                  <span>🏢 {job.company?.name}</span>
                  <span>📁 {job.department?.name}</span>
                  <span>📍 {job.location}</span>
                </div>
              </div>
              <div className="bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs px-3 py-1.5 rounded-xl font-semibold">
                💰 {job.salaryRange}
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-800/80 text-xs text-slate-400 leading-relaxed">
              <p className="font-semibold text-slate-300 mb-1">Job Brief & Qualifications:</p>
              <p>{job.description}</p>
              <p className="mt-2">
                <span className="font-semibold text-slate-300">Required Experience:</span> {job.experience} |{" "}
                <span className="font-semibold text-slate-300">Qualifications:</span> {job.qualification}
              </p>
            </div>
          </div>
        )}

        {/* Step Indicator */}
        <div className="grid grid-cols-3 gap-2 mb-8 text-center text-xs font-semibold text-slate-400">
          <div className={`pb-2 border-b-2 transition-all ${step >= 1 ? "border-indigo-500 text-white" : "border-slate-800"}`}>
            1. Basic Information
          </div>
          <div className={`pb-2 border-b-2 transition-all ${step >= 2 ? "border-indigo-500 text-white" : "border-slate-800"}`}>
            2. Risk Profiling
          </div>
          <div className={`pb-2 border-b-2 transition-all ${step >= 3 ? "border-indigo-500 text-white" : "border-slate-800"}`}>
            3. Upload Documents
          </div>
        </div>

        {submitError && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-300 text-xs p-3.5 rounded-2xl mb-6">
            {submitError}
          </div>
        )}

        {/* Multi-Step Form */}
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-3xl p-6 md:p-8 backdrop-blur-xl shadow-xl">
          {step === 1 && (
            <div className="space-y-6">
              <h3 className="text-base font-bold text-white border-b border-slate-800/60 pb-3">Basic Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="John Doe"
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Mobile Number</label>
                  <input
                    type="tel"
                    required
                    placeholder="9876543210"
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Email Address</label>
                  <input
                    type="email"
                    required
                    placeholder="john@example.com"
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Highest Qualification</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. B.Tech / MBA / Graduate"
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                    value={qualification}
                    onChange={(e) => setQualification(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Current Address</label>
                <input
                  type="text"
                  required
                  placeholder="Street, City, Pin code"
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Total Experience</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 2 Years / Fresher"
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                    value={experience}
                    onChange={(e) => setExperience(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Notice Period</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Immediate / 30 Days"
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                    value={noticePeriod}
                    onChange={(e) => setNoticePeriod(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Current Salary (Monthly)</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 25,000 INR"
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                    value={currentSalary}
                    onChange={(e) => setCurrentSalary(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Expected Salary (Monthly)</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 35,000 INR"
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                    value={expectedSalary}
                    onChange={(e) => setExpectedSalary(e.target.value)}
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    if (!name || !mobile || !email || !address || !qualification || !experience || !currentSalary || !expectedSalary || !noticePeriod) {
                      setSubmitError("Please fill out all basic details before proceeding");
                      return;
                    }
                    setSubmitError("");
                    setStep(2);
                  }}
                  className="bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl px-6 py-2.5 text-sm font-semibold transition-all shadow-lg hover:scale-[1.01]"
                >
                  Proceed to Step 2 →
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-base font-bold text-white border-b border-slate-800/60 pb-3">
                  Verification & Risk Screening Questions
                </h3>
                <p className="text-slate-400 text-xs mt-1.5 leading-relaxed">
                  These responses are verified during detailed background verification rounds. Please provide honest declarations.
                </p>
              </div>

              <div className="space-y-4">
                {/* Q1 */}
                <div className="flex items-center justify-between p-4 bg-slate-950/60 border border-slate-850 rounded-2xl">
                  <div className="pr-4">
                    <p className="text-sm font-semibold text-slate-200">1. क्या आपका कोई side business है? / Side Business</p>
                    <p className="text-xs text-slate-500 mt-0.5">Do you possess, run, or associate with any side business or other dual employment?</p>
                  </div>
                  <div className="flex gap-2">
                    {["Yes", "No"].map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setSideBusiness(v as any)}
                        className={`text-xs font-bold px-4 py-2 rounded-lg transition-all border ${
                          sideBusiness === v
                            ? "bg-indigo-500 border-indigo-500 text-white"
                            : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Q2 */}
                <div className="flex items-center justify-between p-4 bg-slate-950/60 border border-slate-850 rounded-2xl">
                  <div className="pr-4">
                    <p className="text-sm font-semibold text-slate-200">2. क्या आपके ऊपर loan / EMI pressure है? / Financial EMI Pressures</p>
                    <p className="text-xs text-slate-500 mt-0.5">Do you have any severe financial liabilities, personal loans, or ongoing EMI pressure?</p>
                  </div>
                  <div className="flex gap-2">
                    {["Yes", "No"].map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setLoanPressure(v as any)}
                        className={`text-xs font-bold px-4 py-2 rounded-lg transition-all border ${
                          loanPressure === v
                            ? "bg-indigo-500 border-indigo-500 text-white"
                            : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Q3 */}
                <div className="flex items-center justify-between p-4 bg-slate-950/60 border border-slate-850 rounded-2xl">
                  <div className="pr-4">
                    <p className="text-sm font-semibold text-slate-200">3. क्या आपके खिलाफ कोई police / court matter है? / Police or Court Matter</p>
                    <p className="text-xs text-slate-500 mt-0.5">Is there any active police case, complaint, or court matter pending against you?</p>
                  </div>
                  <div className="flex gap-2">
                    {["Yes", "No"].map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setCourtCase(v as any)}
                        className={`text-xs font-bold px-4 py-2 rounded-lg transition-all border ${
                          courtCase === v
                            ? "bg-indigo-500 border-indigo-500 text-white"
                            : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Q4 */}
                <div className="flex items-center justify-between p-4 bg-slate-950/60 border border-slate-850 rounded-2xl">
                  <div className="pr-4">
                    <p className="text-sm font-semibold text-slate-200">4. क्या आप target-based काम कर सकते हैं? / Target-Based Comfort</p>
                    <p className="text-xs text-slate-500 mt-0.5">Are you completely comfortable working on high-performance target-oriented tasks?</p>
                  </div>
                  <div className="flex gap-2">
                    {["Yes", "No"].map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setTargetWork(v as any)}
                        className={`text-xs font-bold px-4 py-2 rounded-lg transition-all border ${
                          targetWork === v
                            ? "bg-indigo-500 border-indigo-500 text-white"
                            : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Q5 */}
                <div className="flex items-center justify-between p-4 bg-slate-950/60 border border-slate-850 rounded-2xl">
                  <div className="pr-4">
                    <p className="text-sm font-semibold text-slate-200">5. क्या आप field / touring work कर सकते हैं? / Field Operations & Touring</p>
                    <p className="text-xs text-slate-500 mt-0.5">Are you comfortable with client field visits, operations touring, or traveling?</p>
                  </div>
                  <div className="flex gap-2">
                    {["Yes", "No"].map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setFieldWork(v as any)}
                        className={`text-xs font-bold px-4 py-2 rounded-lg transition-all border ${
                          fieldWork === v
                            ? "bg-indigo-500 border-indigo-500 text-white"
                            : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Q6 */}
                <div className="flex items-center justify-between p-4 bg-slate-950/60 border border-slate-850 rounded-2xl">
                  <div className="pr-4">
                    <p className="text-sm font-semibold text-slate-200">6. क्या आप background verification के लिए ready हैं? / Background Verification Consent</p>
                    <p className="text-xs text-slate-500 mt-0.5">Do you authorize the company to verify your past employment, police record, and qualifications?</p>
                  </div>
                  <div className="flex gap-2">
                    {["Yes", "No"].map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setBackgroundVerification(v as any)}
                        className={`text-xs font-bold px-4 py-2 rounded-lg transition-all border ${
                          backgroundVerification === v
                            ? "bg-indigo-500 border-indigo-500 text-white"
                            : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Q7 */}
                <div className="flex items-center justify-between p-4 bg-slate-950/60 border border-slate-850 rounded-2xl">
                  <div className="pr-4">
                    <p className="text-sm font-semibold text-slate-200">7. क्या आप company data confidentiality follow करेंगे? / Data Confidentiality</p>
                    <p className="text-xs text-slate-500 mt-0.5">Will you maintain 100% data secrecy, privacy, and sign standard legal NDAs?</p>
                  </div>
                  <div className="flex gap-2">
                    {["Yes", "No"].map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setConfidentialityAgreement(v as any)}
                        className={`text-xs font-bold px-4 py-2 rounded-lg transition-all border ${
                          confidentialityAgreement === v
                            ? "bg-indigo-500 border-indigo-500 text-white"
                            : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-4 flex justify-between">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all border border-slate-700"
                >
                  ← Back to Step 1
                </button>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl px-6 py-2.5 text-sm font-semibold transition-all shadow-lg hover:scale-[1.01]"
                >
                  Proceed to Step 3 →
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <h3 className="text-base font-bold text-white border-b border-slate-800/60 pb-3">Document Upload (Cloudinary)</h3>

              {/* Real upload cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[
                  { key: "resume", label: "Resume / CV (PDF)", accept: ".pdf,.doc,.docx" },
                  { key: "photo", label: "Passport Photo", accept: "image/*" },
                  { key: "aadhaar", label: "Aadhaar Card", accept: "image/*,.pdf" },
                  { key: "pan", label: "PAN Card", accept: "image/*,.pdf" },
                  { key: "salarySlip", label: "Previous Salary Slip (Optional)", accept: "image/*,.pdf" },
                  { key: "bankStatement", label: "Last 6 Months Bank Statement", accept: "image/*,.pdf" },
                ].map(({ key, label, accept }) => (
                  <div key={key} className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex flex-col items-center justify-center text-center gap-2">
                    <div className="text-xs font-semibold text-slate-300">{label}</div>
                    {uploads[key] ? (
                      <div className="space-y-1">
                        <div className="text-xs text-emerald-400 font-semibold">✓ Uploaded Successfully</div>
                        <button
                          type="button"
                          onClick={() => setUploads(prev => ({ ...prev, [key]: "" }))}
                          className="text-[10px] text-rose-400 underline"
                        >
                          Remove
                        </button>
                      </div>
                    ) : (
                      <label className={`cursor-pointer bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 hover:bg-indigo-500 hover:text-white transition-all text-xs font-semibold px-4 py-2 rounded-lg ${
                        uploadingField === key ? "opacity-60 cursor-wait" : ""
                      }`}>
                        {uploadingField === key ? "Uploading..." : "Select File"}
                        <input
                          type="file"
                          accept={accept}
                          className="hidden"
                          disabled={uploadingField !== null}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleRealUpload(key, file);
                            e.target.value = "";
                          }}
                        />
                      </label>
                    )}
                  </div>
                ))}
              </div>

              <div className="pt-6 flex justify-between border-t border-slate-800/80 mt-6">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all border border-slate-700"
                >
                  ← Back to Step 2
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleSubmit}
                  className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-xl px-8 py-3 text-sm font-semibold transition-all shadow-lg shadow-emerald-500/20 hover:scale-[1.01] active:scale-[0.99] flex items-center gap-2"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    "Submit Application Form"
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
