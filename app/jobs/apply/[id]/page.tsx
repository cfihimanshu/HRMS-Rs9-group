"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

interface Job {
  id: string;
  title: string;
  location: string;
  category: string;
  salaryRange: string;
  company: { name: string };
  department: { name: string };
  description: string;
  qualification: string;
  experience: string;
  postingDuration?: number;
  createdAt?: string;
}

interface FormField {
  id: string;
  label: string;
  type: string;
  required: boolean;
  hasOther: boolean;
  order: number;
}

interface FormFieldOption {
  id: number;
  fieldId: string;
  value: string;
  order: number;
}

export default function CandidateApplyPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params.id as string;

  const [job, setJob] = useState<Job | null>(null);
  const [jobLoading, setJobLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [autoResponseMsg, setAutoResponseMsg] = useState("");
  const [submitError, setSubmitError] = useState("");

  // Dynamic Form Config States
  const [formConfig, setFormConfig] = useState<{ fields: FormField[]; options: FormFieldOption[] } | null>(null);
  const [configLoading, setConfigLoading] = useState(true);

  // Dynamic values state
  const [formValues, setFormValues] = useState<{ [key: string]: any }>({});
  const [uploadingField, setUploadingField] = useState<string | null>(null);

  // Fetch Job Details
  useEffect(() => {
    const fetchJob = async () => {
      try {
        const res = await fetch("/api/jobs");
        const data = await res.json();
        if (data.success) {
          const matched = data.data.find((j: any) => j.id === jobId);
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

  // Fetch Form Config and pre-fill default state values
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await fetch("/api/job-form-config");
        const data = await res.json();
        if (data.success) {
          setFormConfig(data.data);
          
          const initialValues: any = {};
          data.data.fields.forEach((field: FormField) => {
            initialValues[field.id] = "";
            if (field.hasOther) {
              initialValues[`${field.id}_other`] = "";
            }
            if (field.type === "date_time") {
              initialValues[`${field.id}_date`] = "";
              initialValues[`${field.id}_time`] = "";
            }
          });

          // Prefill Date of Application with today's date/time
          const today = new Date();
          const dateStr = today.toISOString().split("T")[0]; // YYYY-MM-DD
          const hours = String(today.getHours()).padStart(2, "0");
          const minutes = String(today.getMinutes()).padStart(2, "0");

          if (initialValues.applicationDate !== undefined) {
            initialValues.applicationDate = `${dateStr} ${hours}:${minutes}`;
            initialValues.applicationDate_date = dateStr;
            initialValues.applicationDate_time = `${hours}:${minutes}`;
          }

          setFormValues(initialValues);
        }
      } catch (err) {
        console.error("Failed to load job form configuration:", err);
      } finally {
        setConfigLoading(false);
      }
    };
    fetchConfig();
  }, []);

  const handleRealUpload = async (fieldId: string, file: File) => {
    setUploadingField(fieldId);
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
        setFormValues((prev) => ({ ...prev, [fieldId]: data.url }));
      } else {
        alert("Upload failed: " + (data.error || "Unknown error"));
      }
    } catch (err) {
      alert("Upload error. Check your internet connection.");
    } finally {
      setUploadingField(null);
    }
  };

  const handleFieldChange = (fieldId: string, val: any) => {
    setFormValues((prev) => ({ ...prev, [fieldId]: val }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSubmitError("");

    if (!formConfig) {
      setSubmitError("Form configuration is not loaded yet.");
      setLoading(false);
      return;
    }

    // Consolidated mappings of dynamic variables for compatibility check
    const educationVal = formValues.highestEducation === "Other" ? formValues.highestEducation_other : formValues.highestEducation;
    const experienceVal = formValues.totalExperience === "Other" ? formValues.totalExperience_other : formValues.totalExperience;
    
    // Construct payload dynamically
    const payload: any = {
      jobId: jobId || undefined,
      name: formValues.name || "",
      mobile: formValues.mobile || "",
      email: formValues.email || "",
      address: formValues.currentCity || "",
      qualification: educationVal || "",
      experience: experienceVal || "",
      currentSalary: formValues.currentSalary || "",
      expectedSalary: formValues.expectedWages || "",
      noticePeriod: formValues.joiningTime || "",
      uploads: {
        resume: formValues.cvUpload || "",
        photo: formValues.photoUpload || "",
      },
      riskAnswers: {}
    };

    // Pull remaining values dynamically from formValues map
    formConfig.fields.forEach((field) => {
      const key = field.id;
      let val = formValues[key];
      if (field.hasOther && val === "Other") {
        val = formValues[`${key}_other`] || "";
      }
      payload[key] = val;
    });

    // Custom validations
    if (formValues.cvUpload === undefined || !formValues.cvUpload) {
      setSubmitError("CV/Resume upload is required!");
      setLoading(false);
      return;
    }
    if (formValues.declaration && formValues.declaration !== "Yes") {
      setSubmitError("Please accept the declaration checkbox to submit your application.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/candidates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSubmitted(true);
        setAutoResponseMsg(data.message || "Thank you. Your details are recorded.");
      } else {
        setSubmitError(data.error || "Failed to submit application");
      }
    } catch (err) {
      setSubmitError("Network connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (jobLoading || configLoading || !formConfig) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-[#714B67]/20 border-t-[#714B67] rounded-full animate-spin" />
          <span className="text-xs font-semibold text-slate-500">Loading Application Form Config...</span>
        </div>
      </div>
    );
  }

  const isExpired = !!(job?.postingDuration && job?.createdAt && (new Date().getTime() - new Date(job.createdAt).getTime()) > job.postingDuration * 24 * 60 * 60 * 1000);

  if (isExpired) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-lg bg-white border border-slate-200 rounded-3xl p-8 text-center shadow-lg relative">
          <div className="w-16 h-16 bg-rose-50 border border-rose-200 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-6 text-2xl">
            ⚠️
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Job Posting Expired</h1>
          <p className="text-slate-600 text-sm mt-3 px-2 leading-relaxed">
            This job vacancy posting has expired and is no longer accepting new applications.
          </p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F4F5F7] px-4">
        <div className="w-full max-w-xl bg-white border border-slate-200 rounded-3xl p-8 text-center shadow-xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-2 bg-[#714B67]" />
          <div className="w-16 h-16 bg-emerald-50 border border-emerald-250 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="w-8 h-8 animate-[bounce_1.5s_infinite]"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
          </div>

          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Application Submitted Successfully!</h1>
          <p className="text-slate-500 text-xs mt-3 px-2 leading-relaxed font-medium">
            Thank you for applying. Your application details are logged in our hiring system database.
          </p>

          <div className="mt-8 bg-slate-50 border border-slate-200 rounded-2xl p-5 text-left space-y-3 shadow-inner">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-[#714B67] font-mono">
              <span className="w-2 h-2 bg-[#714B67] rounded-full animate-ping" />
              Automated Response Gateway
            </div>
            <p className="text-xs text-slate-600 italic font-mono leading-relaxed bg-white p-3 rounded-lg border border-slate-100 shadow-sm whitespace-pre-line">
              "{autoResponseMsg}"
            </p>
          </div>

          <button
            onClick={() => router.push("/login")}
            className="w-full mt-8 bg-[#714B67] hover:bg-[#5F3F56] text-white rounded-xl py-3.5 text-xs font-bold uppercase tracking-wider transition-all shadow active:scale-[0.99]"
          >
            Go to Acolyte Portal Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F5F7] text-slate-800 py-10 px-4 md:px-8 relative overflow-hidden">
      {/* Decorative Blurs */}
      <div className="absolute top-[-10%] right-[-10%] w-[35rem] h-[35rem] rounded-full bg-[#714B67]/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[35rem] h-[35rem] rounded-full bg-[#714B67]/5 blur-[120px] pointer-events-none" />

      <div className="max-w-2xl mx-auto relative z-10 space-y-6">
        {/* Main Header Card */}
        <div className="bg-white border-t-[10px] border-t-[#714B67] border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Hiring - {new Date().toLocaleDateString("en-GB").replace(/\//g, " ")}</h1>
          
          <div className="mt-4 pt-4 border-t border-slate-100 text-xs leading-relaxed space-y-4">
            <div>
              <strong className="block text-slate-900 font-bold mb-1">About Us (हमारे बारे में):</strong>
              <p className="text-slate-600 font-medium">
                हम <span className="font-bold text-[#714B67]">Acolyte Group</span> हैं – जयपुर आधारित एक बहु-उद्योग समूह जो Legal Recovery, Banking Services, Startup Consultancy, Digital Media, Property & Security Solutions जैसे क्षेत्रों में कार्यरत है।
              </p>
              <p className="text-slate-600 font-medium mt-1">
                हमारा लक्ष्य है – युवाओं को रोजगार, प्रशिक्षण और साझेदारी के माध्यम से आर्थिक सशक्तिकरण और डिजिटल विकास की दिशा में जोड़ना।
              </p>
            </div>

            <div>
              <strong className="block text-slate-900 font-bold mb-1">Application From Candidate:</strong>
              <p className="text-slate-600 font-mono italic">
                I, want to apply for the vacancy in your group of companies, with following details:
              </p>
            </div>
          </div>
        </div>

        {/* Selected Job Vacancy Card */}
        {job && (
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm relative overflow-hidden">
            <div className="absolute right-0 top-0 bg-[#714B67]/10 text-[#714B67] text-[10px] font-black uppercase tracking-wider font-mono px-3 py-1.5 rounded-bl-xl border-l border-b border-[#714B67]/10">
              Active Vacancy
            </div>
            <span className="text-[9px] font-black uppercase tracking-widest text-[#714B67] font-mono">Job Applied For</span>
            <h2 className="text-base font-black text-slate-900 mt-0.5">{job.title}</h2>
            <div className="text-[10px] text-slate-500 font-bold mt-2 flex flex-wrap gap-x-4 gap-y-1 font-mono">
              <span>🏢 {job.company?.name}</span>
              <span>📁 {job.department?.name}</span>
              <span>📍 {job.location}</span>
              <span>💰 {job.salaryRange}</span>
            </div>
          </div>
        )}

        {submitError && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold p-4 rounded-xl shadow-sm flex items-center gap-2">
            <span>⚠️</span> {submitError}
          </div>
        )}

        {/* Dynamically Loaded Form Fields */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {formConfig.fields.map((field) => {
            const options = formConfig.options.filter((opt) => opt.fieldId === field.id);
            const value = formValues[field.id] || "";

            return (
              <div key={field.id} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
                <label className="block text-xs font-bold text-slate-800 tracking-wide mb-2">
                  {field.label} {field.required && <span className="text-rose-500 font-bold">*</span>}
                </label>

                {/* Render field according to configured type */}
                {field.type === "email" && (
                  <input
                    type="email"
                    required={field.required}
                    placeholder="Your email address"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#714B67] transition-all"
                    value={value}
                    onChange={(e) => handleFieldChange(field.id, e.target.value)}
                  />
                )}

                {field.type === "text" && (
                  <input
                    type="text"
                    required={field.required}
                    placeholder="Your answer"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#714B67] transition-all"
                    value={value}
                    onChange={(e) => handleFieldChange(field.id, e.target.value)}
                  />
                )}

                {field.type === "textarea" && (
                  <textarea
                    required={field.required}
                    placeholder="Your answer"
                    rows={3}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#714B67] transition-all resize-none"
                    value={value}
                    onChange={(e) => handleFieldChange(field.id, e.target.value)}
                  />
                )}

                {field.type === "select" && (
                  <select
                    required={field.required}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#714B67] transition-all"
                    value={value}
                    onChange={(e) => handleFieldChange(field.id, e.target.value)}
                  >
                    <option value="">Choose...</option>
                    {options.map((opt) => (
                      <option key={opt.id} value={opt.value}>
                        {opt.value}
                      </option>
                    ))}
                  </select>
                )}

                {field.type === "radio" && (
                  <div className={`space-y-2.5 text-xs font-medium text-slate-700 ${options.length > 10 ? "max-h-[300px] overflow-y-auto custom-scrollbar p-1" : ""}`}>
                    {options.map((opt) => (
                      <label key={opt.id} className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-slate-50 select-none">
                        <input
                          type="radio"
                          name={field.id}
                          required={field.required && !value}
                          checked={value === opt.value}
                          onChange={() => {
                            handleFieldChange(field.id, opt.value);
                            if (field.hasOther) handleFieldChange(`${field.id}_other`, "");
                          }}
                          className="w-4 h-4 text-[#714B67] focus:ring-[#714B67]"
                        />
                        <span>{opt.value}</span>
                      </label>
                    ))}
                    {field.hasOther && (
                      <div className="p-2 rounded-lg hover:bg-slate-50">
                        <label className="flex items-center gap-3 cursor-pointer select-none">
                          <input
                            type="radio"
                            name={field.id}
                            checked={value === "Other"}
                            onChange={() => handleFieldChange(field.id, "Other")}
                            className="w-4 h-4 text-[#714B67] focus:ring-[#714B67]"
                          />
                          <span>Other:</span>
                        </label>
                        {value === "Other" && (
                          <input
                            type="text"
                            required={field.required}
                            placeholder="Please specify"
                            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 mt-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#714B67]"
                            value={formValues[`${field.id}_other`] || ""}
                            onChange={(e) => handleFieldChange(`${field.id}_other`, e.target.value)}
                          />
                        )}
                      </div>
                    )}
                  </div>
                )}

                {field.type === "file" && (
                  <div>
                    <span className="block text-[10px] text-slate-400 font-semibold mb-3">Upload file (Max 100 MB)</span>
                    <div className="flex items-center gap-4">
                      <label className="bg-[#714B67]/5 hover:bg-[#714B67]/15 border border-[#714B67]/15 text-[#714B67] font-bold text-xs px-4 py-2.5 rounded-xl cursor-pointer shadow-sm hover:shadow transition-all inline-flex items-center gap-1.5 animate-fadeIn">
                        📁 Choose file
                        <input
                          type="file"
                          accept={field.id === "cvUpload" ? ".pdf,.doc,.docx" : "image/*"}
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleRealUpload(field.id, file);
                          }}
                        />
                      </label>

                      {uploadingField === field.id && (
                        <div className="flex items-center gap-1.5 text-xs text-[#714B67] font-semibold animate-pulse font-mono">
                          <div className="w-4 h-4 border-2 border-[#714B67]/20 border-t-[#714B67] rounded-full animate-spin" />
                          Uploading...
                        </div>
                      )}

                      {value && (
                        <div className="text-xs text-emerald-600 font-black flex items-center gap-1">
                          <span>✓ File uploaded successfully!</span>
                          <a href={value} target="_blank" rel="noreferrer" className="underline ml-1 font-mono text-[10px]">View</a>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {field.type === "date_time" && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="block text-[9px] uppercase font-mono font-black text-slate-400 mb-1">Date</span>
                      <input
                        type="date"
                        required={field.required}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-semibold focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#714B67]"
                        value={formValues[`${field.id}_date`] || ""}
                        onChange={(e) => {
                          const dateVal = e.target.value;
                          const timeVal = formValues[`${field.id}_time`] || "";
                          setFormValues((prev) => ({
                            ...prev,
                            [field.id]: `${dateVal} ${timeVal}`.trim(),
                            [`${field.id}_date`]: dateVal
                          }));
                        }}
                      />
                    </div>
                    <div>
                      <span className="block text-[9px] uppercase font-mono font-black text-slate-400 mb-1">Time</span>
                      <input
                        type="time"
                        required={field.required}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-semibold focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#714B67]"
                        value={formValues[`${field.id}_time`] || ""}
                        onChange={(e) => {
                          const timeVal = e.target.value;
                          const dateVal = formValues[`${field.id}_date`] || "";
                          setFormValues((prev) => ({
                            ...prev,
                            [field.id]: `${dateVal} ${timeVal}`.trim(),
                            [`${field.id}_time`]: timeVal
                          }));
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Submit/Clear button panel */}
          <div className="flex items-center justify-between gap-4 pt-4">
            <button
              type="button"
              onClick={() => {
                if (window.confirm("Are you sure you want to clear all form fields?")) {
                  const cleared: any = {};
                  formConfig.fields.forEach((field) => {
                    cleared[field.id] = "";
                    if (field.hasOther) cleared[`${field.id}_other`] = "";
                    if (field.type === "date_time") {
                      cleared[`${field.id}_date`] = "";
                      cleared[`${field.id}_time`] = "";
                    }
                  });
                  setFormValues(cleared);
                }
              }}
              className="text-slate-500 hover:text-slate-700 text-xs font-bold uppercase font-mono px-4 py-2 hover:bg-slate-200/50 rounded-lg transition-all"
            >
              Clear form
            </button>

            <button
              type="submit"
              disabled={loading}
              className={`bg-[#714B67] hover:bg-[#5F3F56] text-white rounded-xl px-8 py-3 text-xs font-bold uppercase tracking-wider transition-all shadow-md active:scale-[0.99] flex items-center gap-2 ${
                loading ? "opacity-75 cursor-not-allowed" : ""
              }`}
            >
              {loading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit"
              )}
            </button>
          </div>
        </form>

        {/* Footer Info */}
        <p className="text-center text-[10px] text-slate-400 font-medium pt-8">
          This content is neither created nor endorsed by Google. Report Abuse - Terms of Service - Privacy Policy
        </p>
      </div>
    </div>
  );
}
