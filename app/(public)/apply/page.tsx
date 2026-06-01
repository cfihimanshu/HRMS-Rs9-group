"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export default function CandidateApplicationForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    mobile: "",
    email: "",
    address: "",
    qualification: "",
    experience: "",
    currentSalary: "",
    expectedSalary: "",
    noticePeriod: "",
    sideBusiness: "No",
    loanPressure: "No",
    courtCase: "No",
    targetWork: "Yes",
    fieldWork: "Yes",
    backgroundVerification: "Yes",
    confidentialityAgreement: "Yes",
  });

  const [files, setFiles] = useState({
    resume: null as File | null,
    aadhaar: null as File | null,
    pan: null as File | null,
    bankStatement: null as File | null,
  });

  const handleInputChange = (e: any) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: any) => {
    const { name, files: selectedFiles } = e.target;
    if (selectedFiles.length > 0) {
      setFiles((prev) => ({ ...prev, [name]: selectedFiles[0] }));
    }
  };

  const uploadFileToCloudinary = async (file: File) => {
    const uploadData = new FormData();
    uploadData.append("file", file);

    const res = await fetch("/api/documents/upload", {
      method: "POST",
      body: uploadData,
    });
    
    const data = await res.json();
    if (!data.success) throw new Error(data.error || "Upload failed");
    return data.url;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // 1. Upload files first
      let resumeUrl = "";
      let aadhaarUrl = "";
      let panUrl = "";
      let bankStatementUrl = "";

      if (files.resume) resumeUrl = await uploadFileToCloudinary(files.resume);
      if (files.aadhaar) aadhaarUrl = await uploadFileToCloudinary(files.aadhaar);
      if (files.pan) panUrl = await uploadFileToCloudinary(files.pan);
      if (files.bankStatement) bankStatementUrl = await uploadFileToCloudinary(files.bankStatement);

      // 2. Submit candidate data
      const payload = {
        name: formData.name,
        mobile: formData.mobile,
        email: formData.email,
        address: formData.address,
        qualification: formData.qualification,
        experience: formData.experience,
        currentSalary: formData.currentSalary,
        expectedSalary: formData.expectedSalary,
        noticePeriod: formData.noticePeriod,
        riskAnswers: {
          sideBusiness: formData.sideBusiness,
          loanPressure: formData.loanPressure,
          courtCase: formData.courtCase,
          targetWork: formData.targetWork,
          fieldWork: formData.fieldWork,
          backgroundVerification: formData.backgroundVerification,
          confidentialityAgreement: formData.confidentialityAgreement,
        },
        uploads: {
          resume: resumeUrl,
          aadhaar: aadhaarUrl,
          pan: panUrl,
          bankStatement: bankStatementUrl,
        }
      };

      const res = await fetch("/api/candidates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Failed to submit application");

      setSuccess(true);
      
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white p-10 rounded-2xl shadow-xl max-w-md w-full text-center">
          <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl">
            ✓
          </div>
          <h2 className="text-2xl font-black text-slate-800 mb-2">Application Submitted!</h2>
          <p className="text-slate-500 mb-8">
            Thank you for applying to Acolyte Group. Our HR team will review your profile and get back to you shortly.
          </p>
          <Button onClick={() => window.location.reload()} className="w-full bg-slate-800 hover:bg-slate-900">
            Submit Another Application
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-3xl mx-auto">
        
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-gradient-to-tr from-indigo-600 to-violet-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20 mx-auto mb-4">
            <span className="text-white text-2xl font-bold font-serif">A</span>
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Acolyte Careers</h1>
          <p className="text-slate-500 mt-2">Official Candidate Application Portal</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white shadow-xl shadow-slate-200/50 rounded-3xl overflow-hidden border border-slate-200/60">
          
          {error && (
            <div className="bg-rose-50 text-rose-600 p-4 font-semibold text-sm border-b border-rose-100">
              ⚠️ {error}
            </div>
          )}

          {/* Section 1: Basic Details */}
          <div className="p-8 border-b border-slate-100">
            <h3 className="text-sm font-black tracking-widest text-indigo-600 uppercase font-mono mb-6">1. Personal Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">Full Name *</label>
                <Input name="name" required value={formData.name} onChange={handleInputChange} placeholder="John Doe" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">Mobile Number *</label>
                <Input name="mobile" required value={formData.mobile} onChange={handleInputChange} placeholder="+91 9999999999" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-2">Email Address *</label>
                <Input name="email" type="email" required value={formData.email} onChange={handleInputChange} placeholder="john@example.com" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-2">Residential Address *</label>
                <Textarea name="address" required value={formData.address} onChange={handleInputChange} placeholder="Full address" />
              </div>
            </div>
          </div>

          {/* Section 2: Professional Details */}
          <div className="p-8 border-b border-slate-100 bg-slate-50/50">
            <h3 className="text-sm font-black tracking-widest text-indigo-600 uppercase font-mono mb-6">2. Professional Profile</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">Highest Qualification *</label>
                <Input name="qualification" required value={formData.qualification} onChange={handleInputChange} placeholder="e.g. MBA, B.Tech" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">Total Experience *</label>
                <Input name="experience" required value={formData.experience} onChange={handleInputChange} placeholder="e.g. 5 Years" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">Current Salary (CTC) *</label>
                <Input name="currentSalary" required value={formData.currentSalary} onChange={handleInputChange} placeholder="₹" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">Expected Salary (CTC) *</label>
                <Input name="expectedSalary" required value={formData.expectedSalary} onChange={handleInputChange} placeholder="₹" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-2">Notice Period *</label>
                <Input name="noticePeriod" required value={formData.noticePeriod} onChange={handleInputChange} placeholder="e.g. 30 Days, Immediate" />
              </div>
            </div>
          </div>

          {/* Section 3: Declarations */}
          <div className="p-8 border-b border-slate-100">
            <h3 className="text-sm font-black tracking-widest text-indigo-600 uppercase font-mono mb-6">3. Background Declarations</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
              
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-slate-700">Are you running any side business?</label>
                <select name="sideBusiness" value={formData.sideBusiness} onChange={handleInputChange} className="border-slate-200 rounded-lg text-sm p-2 w-24">
                  <option value="No">No</option>
                  <option value="Yes">Yes</option>
                </select>
              </div>

              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-slate-700">Any severe EMI/Loan pressure?</label>
                <select name="loanPressure" value={formData.loanPressure} onChange={handleInputChange} className="border-slate-200 rounded-lg text-sm p-2 w-24">
                  <option value="No">No</option>
                  <option value="Yes">Yes</option>
                </select>
              </div>

              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-slate-700">Any active police/court case?</label>
                <select name="courtCase" value={formData.courtCase} onChange={handleInputChange} className="border-slate-200 rounded-lg text-sm p-2 w-24">
                  <option value="No">No</option>
                  <option value="Yes">Yes</option>
                </select>
              </div>

              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-slate-700">Ready for target-based work?</label>
                <select name="targetWork" value={formData.targetWork} onChange={handleInputChange} className="border-slate-200 rounded-lg text-sm p-2 w-24">
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
              </div>

              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-slate-700">Ready for daily field visits?</label>
                <select name="fieldWork" value={formData.fieldWork} onChange={handleInputChange} className="border-slate-200 rounded-lg text-sm p-2 w-24">
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
              </div>

            </div>
          </div>

          {/* Section 4: Document Uploads */}
          <div className="p-8 bg-slate-50/50">
            <h3 className="text-sm font-black tracking-widest text-indigo-600 uppercase font-mono mb-6">4. Document Uploads (Cloudinary)</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <label className="block text-xs font-bold text-slate-700 mb-2">Resume / CV *</label>
                <input type="file" name="resume" required onChange={handleFileChange} className="text-sm w-full file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100" />
              </div>
              
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <label className="block text-xs font-bold text-slate-700 mb-2">Aadhaar Card *</label>
                <input type="file" name="aadhaar" required onChange={handleFileChange} className="text-sm w-full file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100" />
              </div>
              
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <label className="block text-xs font-bold text-slate-700 mb-2">PAN Card *</label>
                <input type="file" name="pan" required onChange={handleFileChange} className="text-sm w-full file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100" />
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <label className="block text-xs font-bold text-slate-700 mb-2">Latest Bank Statement</label>
                <input type="file" name="bankStatement" onChange={handleFileChange} className="text-sm w-full file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100" />
              </div>
            </div>
            
            <p className="text-[10px] text-slate-500 mt-4 text-center">Files are securely encrypted and uploaded to Cloudinary</p>
          </div>

          <div className="p-8 bg-slate-100 border-t border-slate-200 flex justify-end">
            <Button 
              type="submit" 
              disabled={loading}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-6 rounded-xl font-bold shadow-lg shadow-indigo-600/20 text-lg w-full md:w-auto"
            >
              {loading ? "Uploading & Submitting..." : "Submit Application"}
            </Button>
          </div>

        </form>
      </div>
    </div>
  );
}
