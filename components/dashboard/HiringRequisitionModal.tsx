"use client";
import React, { useState, useEffect } from "react";
import { Sparkles, X, Briefcase, DollarSign, ListChecks, ArrowRight } from "lucide-react";

interface HiringRequisitionModalProps {
  onClose: () => void;
  triggerToast: (msg: string) => void;
  userCompany?: string;
  userDepartment?: string;
}

export default function HiringRequisitionModal({ onClose, triggerToast, userCompany, userDepartment }: HiringRequisitionModalProps) {
  const [isDark, setIsDark] = useState(false);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [skillsList, setSkillsList] = useState<string[]>([]);
  const [currentSkill, setCurrentSkill] = useState("");
  const [roles, setRoles] = useState<string[]>([
    "Employee", "HR Head", "HR Executive", "Department Manager",
    "Trainer", "Accounts", "IT Admin"
  ]);
  const [showCustomRoleInput, setShowCustomRoleInput] = useState(false);
  const [customRoleName, setCustomRoleName] = useState("");
  const [dbCompanies, setDbCompanies] = useState<any[]>([]);

  const [form, setForm] = useState({
    companyName: userCompany || "Acolyte Technologies",
    department: userDepartment || "Sales",
    role: "",
    category: "Staff",
    location: "",
    qty: "1",
    gender: "Any",
    expMin: "",
    expMax: "",
    budgetMin: "",
    budgetMax: "",
    skills: "",
    jd: "",
    kra: "",
    kpi: "",
    qualification: "",
    monitoringBenefits: "",
    companyGrowthBenefits: "",
    dateOfRequirement: new Date().toISOString().split("T")[0],
    riskLevel: "Low",
    expectedOutput: ""
  });

  const fetchRoles = async (companyNameVal: string) => {
    try {
      const res = await fetch(`/api/roles?companyName=${encodeURIComponent(companyNameVal)}`);
      const data = await res.json();
      if (data.success && data.data) {
        const dbRoleNames = data.data.map((r: any) => r.name);
        const coreRoles = [
          "Employee", "HR Head", "HR Executive", "Department Manager",
          "Trainer", "Accounts", "IT Admin"
        ];
        const combined = [...coreRoles, ...dbRoleNames];
        setRoles(Array.from(new Set(combined)));
      }
    } catch (err) {
      console.error("Error fetching roles:", err);
    }
  };

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
    const fetchCompanies = async () => {
      try {
        const res = await fetch("/api/companies");
        const data = await res.json();
        if (data.success && data.data) {
          setDbCompanies(data.data);
          // If companyName is not custom set by prop and we have DB companies, set to the first one
          if (!userCompany && data.data.length > 0) {
            setForm(prev => ({ ...prev, companyName: data.data[0].name }));
          }
        }
      } catch (err) {
        console.error("Error fetching companies:", err);
      }
    };
    fetchCompanies();
  }, []);

  useEffect(() => {
    if (form.companyName) {
      fetchRoles(form.companyName);
    }
  }, [form.companyName]);

  const handleAddCustomRole = async () => {
    if (!customRoleName.trim()) return;
    try {
      const res = await fetch("/api/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          name: customRoleName.trim(), 
          companyName: form.companyName 
        })
      });
      const data = await res.json();
      if (data.success) {
        const newRoleName = data.data.name;
        setRoles(prev => Array.from(new Set([...prev, newRoleName])));
        setForm(prev => ({ ...prev, role: newRoleName }));
        setShowCustomRoleInput(false);
        setCustomRoleName("");
        triggerToast(`Role "${newRoleName}" added and mapped to ${form.companyName} successfully!`);
      } else {
        triggerToast("Failed to create role: " + data.error);
      }
    } catch (err) {
      triggerToast("Error creating new role.");
    }
  };




  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleGenerateAI = async () => {
    if (!form.role || !form.department) {
      triggerToast("Please enter Designation (Role) and Department first.");
      return;
    }
    setGenerating(true);
    triggerToast("Generating JD, KRA, KPI & SOP using AI...");
    try {
      const res = await fetch("/api/hiring/generate-jd", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: form.role,
          department: form.department,
          category: form.category,
          gender: form.gender,
          expMin: form.expMin,
          expMax: form.expMax,
          budgetMin: form.budgetMin,
          budgetMax: form.budgetMax,
          skills: skillsList.join(", "),
          expectedOutput: form.expectedOutput
        })
      });
      const data = await res.json();
      if (data.success && data.data) {
        setForm(prev => ({
          ...prev,
          jd: data.data.jd || prev.jd,
          kra: data.data.kra || prev.kra,
          kpi: data.data.kpi || prev.kpi,
          expectedOutput: data.data.expectedOutput || prev.expectedOutput,
          monitoringBenefits: data.data.monitoringBenefits || prev.monitoringBenefits,
          companyGrowthBenefits: data.data.companyGrowthBenefits || prev.companyGrowthBenefits
        }));
        triggerToast("AI content generated successfully! Please review.");
      } else {
        triggerToast("AI generation failed. You can type manually.");
      }
    } catch (err) {
      triggerToast("Failed to connect to AI service.");
    } finally {
      setGenerating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/hiring", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          skills: skillsList.join(", "),
          qty: Number(form.qty),
          experience: { min: Number(form.expMin), max: Number(form.expMax) },
          budget: { min: Number(form.budgetMin), max: Number(form.budgetMax) }
        })
      });
      const data = await res.json();
      if (data.success) {
        triggerToast("Hiring Requisition submitted for Accounts Approval!");
        onClose();
      } else {
        triggerToast("Submission failed: " + data.error);
      }
    } catch (err) {
      triggerToast("Network error submitting form.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] p-4 sm:p-6 backdrop-blur-md bg-black/20 overflow-y-auto">
      <div className={`w-full max-w-5xl mx-auto my-8 rounded-2xl shadow-2xl relative animate-scaleUp ${isDark ? "bg-gray-900 border border-gray-800 text-white" : "bg-white border border-slate-200 text-slate-800"}`}>

        <div className={`sticky top-0 z-50 flex items-center justify-between p-6 border-b ${isDark ? "bg-gray-900/95 border-gray-800" : "bg-white/95 border-slate-100"} backdrop-blur`}>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-400 rounded-lg">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tight">NEW HIRING REQUISITION</h2>
              <p className={`text-xs mt-0.5 ${isDark ? "text-gray-400" : "text-slate-500"}`}>Fill in details. Use AI to auto-generate JD, KRA, & KPI instantly.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-rose-100 hover:text-rose-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-8">

          {/* Section 1: Basic Info */}
          <div>
            <h3 className={`text-xs font-black uppercase tracking-widest mb-4 font-mono ${isDark ? "text-indigo-400" : "text-indigo-600"}`}>1. Core Requirement</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div>
                <label className="block text-[11px] font-bold mb-1.5 uppercase tracking-wide">Company Name *</label>
                <select name="companyName" value={form.companyName} onChange={handleChange} required
                  className={`w-full p-2.5 rounded-lg border text-sm focus:border-indigo-500 focus:outline-none ${isDark ? "bg-gray-800 border-gray-700" : "bg-slate-50 border-slate-200"}`}>
                  {dbCompanies.length > 0 ? (
                    dbCompanies.map(c => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))
                  ) : (
                    <option value={form.companyName}>{form.companyName}</option>
                  )}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold mb-1.5 uppercase tracking-wide">Department *</label>
                <select name="department" value={form.department} onChange={handleChange} required
                  className={`w-full p-2.5 rounded-lg border text-sm focus:border-indigo-500 focus:outline-none ${isDark ? "bg-gray-800 border-gray-700" : "bg-slate-50 border-slate-200"}`}>
                  <option value="">-- Select Department --</option>
                  <option value="HR">HR</option>
                  <option value="IT">IT</option>
                  <option value="Sales">Sales</option>
                  <option value="Admin">Admin</option>
                  <option value="Operation">Operation</option>
                  <option value="Data Entry">Data Entry</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold mb-1.5 uppercase tracking-wide">Designation (Role) *</label>
                {!showCustomRoleInput ? (
                  <select name="role" value={form.role} onChange={(e) => {
                    if (e.target.value === "ADD_NEW") {
                      setShowCustomRoleInput(true);
                      setForm(prev => ({ ...prev, role: "" }));
                    } else {
                      handleChange(e);
                    }
                  }} required
                    className={`w-full p-2.5 rounded-lg border text-sm focus:border-indigo-500 focus:outline-none ${isDark ? "bg-gray-800 border-gray-700" : "bg-slate-50 border-slate-200"}`}>
                    <option value="">-- Select Role --</option>
                    {roles.map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                    <option value="ADD_NEW" className="font-bold text-indigo-650 dark:text-indigo-400">+ Add New Role...</option>
                  </select>
                ) : (
                  <div className="flex gap-2">
                    <input type="text" value={customRoleName} onChange={e => setCustomRoleName(e.target.value)} placeholder="Enter new designation..." required
                      className={`flex-1 p-2.5 rounded-lg border text-sm focus:border-indigo-500 focus:outline-none ${isDark ? "bg-gray-800 border-gray-700" : "bg-slate-50 border-slate-200"}`} />
                    <button type="button" onClick={handleAddCustomRole}
                      className="px-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm">
                      Add
                    </button>
                    <button type="button" onClick={() => { setShowCustomRoleInput(false); setCustomRoleName(""); }}
                      className="px-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-650 rounded-lg text-xs font-bold transition-all">
                      Cancel
                    </button>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-[11px] font-bold mb-1.5 uppercase tracking-wide">Location *</label>
                <input type="text" name="location" value={form.location} onChange={handleChange} placeholder="e.g. Delhi Corporate Office" required
                  className={`w-full p-2.5 rounded-lg border text-sm focus:border-indigo-500 focus:outline-none ${isDark ? "bg-gray-800 border-gray-700" : "bg-slate-50 border-slate-200"}`} />
              </div>
              <div>
                <label className="block text-[11px] font-bold mb-1.5 uppercase tracking-wide">Category *</label>
                <select name="category" value={form.category} onChange={handleChange} required
                  className={`w-full p-2.5 rounded-lg border text-sm focus:border-indigo-500 focus:outline-none ${isDark ? "bg-gray-800 border-gray-700" : "bg-slate-50 border-slate-200"}`}>
                  <option value="Staff">Staff</option>
                  <option value="Vendor">Vendor</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold mb-1.5 uppercase tracking-wide">Number of Requirements *</label>
                <input type="number" name="qty" value={form.qty} onChange={handleChange} required min="1"
                  className={`w-full p-2.5 rounded-lg border text-sm focus:border-indigo-500 focus:outline-none ${isDark ? "bg-gray-800 border-gray-700" : "bg-slate-50 border-slate-200"}`} />
              </div>
              <div>
                <label className="block text-[11px] font-bold mb-1.5 uppercase tracking-wide">Date of Requirement *</label>
                <input type="date" name="dateOfRequirement" value={form.dateOfRequirement} onChange={handleChange} required
                  className={`w-full p-2.5 rounded-lg border text-sm focus:border-indigo-500 focus:outline-none ${isDark ? "bg-gray-800 border-gray-700" : "bg-slate-50 border-slate-200"}`} />
              </div>
            </div>
          </div>

          {/* Section 2: Profiling */}
          <div>
            <h3 className={`text-xs font-black uppercase tracking-widest mb-4 font-mono ${isDark ? "text-emerald-400" : "text-emerald-600"}`}>2. Candidate Profiling</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div>
                <label className="block text-[11px] font-bold mb-1.5 uppercase tracking-wide">Gender</label>
                <select name="gender" value={form.gender} onChange={handleChange}
                  className={`w-full p-2.5 rounded-lg border text-sm focus:border-indigo-500 focus:outline-none ${isDark ? "bg-gray-800 border-gray-700" : "bg-slate-50 border-slate-200"}`}>
                  <option value="Any">Any</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-[11px] font-bold mb-1.5 uppercase tracking-wide">Experience (Years) *</label>
                <div className="flex items-center gap-3">
                  <input type="number" name="expMin" value={form.expMin} onChange={handleChange} placeholder="Min" required min="0"
                    className={`w-full p-2.5 rounded-lg border text-sm focus:border-indigo-500 focus:outline-none ${isDark ? "bg-gray-800 border-gray-700" : "bg-slate-50 border-slate-200"}`} />
                  <span className="font-bold">-</span>
                  <input type="number" name="expMax" value={form.expMax} onChange={handleChange} placeholder="Max" required min="0"
                    className={`w-full p-2.5 rounded-lg border text-sm focus:border-indigo-500 focus:outline-none ${isDark ? "bg-gray-800 border-gray-700" : "bg-slate-50 border-slate-200"}`} />
                </div>
              </div>

              <div className="col-span-1 md:col-span-2">
                <label className="block text-[11px] font-bold mb-1.5 uppercase tracking-wide">Budget (P.A. or Monthly) *</label>
                <div className="flex items-center gap-3">
                  <input type="number" name="budgetMin" value={form.budgetMin} onChange={handleChange} placeholder="Min Budget" required min="0"
                    className={`w-full p-2.5 rounded-lg border text-sm focus:border-indigo-500 focus:outline-none ${isDark ? "bg-gray-800 border-gray-700" : "bg-slate-50 border-slate-200"}`} />
                  <span className="font-bold">-</span>
                  <input type="number" name="budgetMax" value={form.budgetMax} onChange={handleChange} placeholder="Max Budget" required min="0"
                    className={`w-full p-2.5 rounded-lg border text-sm focus:border-indigo-500 focus:outline-none ${isDark ? "bg-gray-800 border-gray-700" : "bg-slate-50 border-slate-200"}`} />
                </div>
              </div>
              <div className="col-span-1 md:col-span-2">
                <label className="block text-[11px] font-bold mb-1.5 uppercase tracking-wide">Qualification *</label>
                <input type="text" name="qualification" value={form.qualification} onChange={handleChange} placeholder="e.g. MBA, B.Tech, Any Graduate" required
                  className={`w-full p-2.5 rounded-lg border text-sm focus:border-indigo-500 focus:outline-none ${isDark ? "bg-gray-800 border-gray-700" : "bg-slate-50 border-slate-200"}`} />
              </div>
              <div className="col-span-1 md:col-span-2 lg:col-span-4">
                <label className="block text-[11px] font-bold mb-1.5 uppercase tracking-wide">Required Skills</label>
                <div className={`flex flex-col gap-2 p-2 rounded-lg border ${isDark ? "bg-gray-800 border-gray-700" : "bg-slate-50 border-slate-200"}`}>
                  <div className="flex flex-wrap gap-2">
                    {skillsList.map((skill, idx) => (
                      <span key={idx} className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300">
                        {skill}
                        <button type="button" onClick={() => setSkillsList(skillsList.filter((_, i) => i !== idx))} className="hover:text-indigo-900 dark:hover:text-indigo-100">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                    <input
                      type="text"
                      placeholder={skillsList.length === 0 ? "e.g. B2B Sales, CRM (Press Enter to add)" : "Add more..."}
                      value={currentSkill}
                      onChange={(e) => setCurrentSkill(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ',') {
                          e.preventDefault();
                          const val = currentSkill.trim().replace(/,$/, '');
                          if (val && !skillsList.includes(val)) {
                            setSkillsList([...skillsList, val]);
                            setCurrentSkill("");
                          }
                        }
                      }}
                      className="flex-1 min-w-[200px] bg-transparent text-sm focus:outline-none placeholder-slate-400"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* AI GENERATION BANNER */}
          <div className={`p-4 rounded-xl border flex flex-col md:flex-row items-center justify-between gap-4 ${isDark ? "bg-purple-900/20 border-purple-800/30" : "bg-purple-50 border-purple-100"}`}>
            <div>
              <h4 className="font-bold text-purple-700 dark:text-purple-400 flex items-center gap-2"><Sparkles className="w-4 h-4" /> AI Auto-Generate Content</h4>
              <p className="text-xs text-purple-600/70 dark:text-purple-300/70 mt-1">Make sure Role and Department are filled above to generate precise JD, KRA & KPI.</p>
            </div>
            <button
              type="button"
              onClick={handleGenerateAI}
              disabled={generating}
              className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-2.5 rounded-lg text-sm font-bold shadow-md transition-all flex items-center gap-2 whitespace-nowrap disabled:opacity-50"
            >
              {generating ? "Generating..." : <><Sparkles className="w-4 h-4" /> Generate with AI</>}
            </button>
          </div>

          {/* Section 3: Descriptive (JD/KRA/KPI) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="col-span-1 md:col-span-2">
              <label className="block text-[11px] font-bold mb-1.5 uppercase tracking-wide">Job Description (JD) *</label>
              <textarea name="jd" value={form.jd} onChange={handleChange} rows={4} required placeholder="Job responsibilities..."
                className={`w-full p-3 rounded-lg border text-sm focus:border-indigo-500 focus:outline-none ${isDark ? "bg-gray-800 border-gray-700" : "bg-slate-50 border-slate-200"}`} />
            </div>
            <div>
              <label className="block text-[11px] font-bold mb-1.5 uppercase tracking-wide">Key Result Areas (KRA) *</label>
              <textarea name="kra" value={form.kra} onChange={handleChange} rows={3} required placeholder="Key result areas..."
                className={`w-full p-3 rounded-lg border text-sm focus:border-indigo-500 focus:outline-none ${isDark ? "bg-gray-800 border-gray-700" : "bg-slate-50 border-slate-200"}`} />
            </div>
            <div>
              <label className="block text-[11px] font-bold mb-1.5 uppercase tracking-wide">Key Performance Indicators (KPI) *</label>
              <textarea name="kpi" value={form.kpi} onChange={handleChange} rows={3} required placeholder="Performance indicators..."
                className={`w-full p-3 rounded-lg border text-sm focus:border-indigo-500 focus:outline-none ${isDark ? "bg-gray-800 border-gray-700" : "bg-slate-50 border-slate-200"}`} />
            </div>
            <div className="col-span-1 md:col-span-2">
              <label className="block text-[11px] font-bold mb-1.5 uppercase tracking-wide">Expected Output / Revenue Target *</label>
              <textarea name="expectedOutput" value={form.expectedOutput} onChange={handleChange} rows={3} required placeholder="Revenue/Output targets..."
                className={`w-full p-3 rounded-lg border text-sm focus:border-indigo-500 focus:outline-none ${isDark ? "bg-gray-800 border-gray-700" : "bg-slate-50 border-slate-200"}`} />
            </div>
          </div>

          {/* Section 4: Benefits */}
          <div>
            <h3 className={`text-xs font-black uppercase tracking-widest mb-4 font-mono ${isDark ? "text-amber-400" : "text-amber-600"}`}>3. Benefits & Value Proposition</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-[11px] font-bold mb-1.5 uppercase tracking-wide">Monitoring Benefits</label>
                <textarea name="monitoringBenefits" value={form.monitoringBenefits} onChange={handleChange} rows={2} placeholder="Monitoring tools & benefits..."
                  className={`w-full p-3 rounded-lg border text-sm focus:border-indigo-500 focus:outline-none ${isDark ? "bg-gray-800 border-gray-700" : "bg-slate-50 border-slate-200"}`} />
              </div>
              <div>
                <label className="block text-[11px] font-bold mb-1.5 uppercase tracking-wide">Benefits of Company Growth</label>
                <textarea name="companyGrowthBenefits" value={form.companyGrowthBenefits} onChange={handleChange} rows={2} placeholder="Growth opportunities..."
                  className={`w-full p-3 rounded-lg border text-sm focus:border-indigo-500 focus:outline-none ${isDark ? "bg-gray-800 border-gray-700" : "bg-slate-50 border-slate-200"}`} />
              </div>
            </div>
          </div>

          <div className={`pt-6 border-t flex justify-end gap-4 ${isDark ? "border-gray-800" : "border-slate-100"}`}>
            <button type="button" onClick={onClose} className="px-6 py-2.5 rounded-lg text-sm font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-gray-800 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-2.5 rounded-lg text-sm font-bold shadow-lg transition-all flex items-center gap-2 disabled:opacity-50">
              {loading ? "Submitting..." : "Submit to Accounts"} <ArrowRight className="w-4 h-4" />
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
