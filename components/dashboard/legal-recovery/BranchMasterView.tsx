import React, { useState } from "react";
import ReactDOM from "react-dom";
import { Search, PhoneCall, Filter, RefreshCw, Pencil, TrendingUp, Briefcase, Paperclip, X, FileText, Upload, Building, Building2, Layers, CheckCircle2, Calendar } from "lucide-react";

export default function BranchMasterView({
  branchesList,
  banksList,
  loading,
  setShowMarketingForm,
  onEditBranch,
}: {
  branchesList: any[];
  banksList: any[];
  loading: boolean;
  setShowMarketingForm: (state: any) => void;
  onEditBranch?: (branch: any) => void;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [bankFilter, setBankFilter] = useState("");
  const [showFilterOptions, setShowFilterOptions] = useState(false);

  // Work Log Modal States
  const [showWorkModal, setShowWorkModal] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<any>(null);
  const [workType, setWorkType] = useState<string>("");
  const [workDateStr, setWorkDateStr] = useState<string>(new Date().toISOString().split("T")[0]);
  const [selectedBankId, setSelectedBankId] = useState<string>("");
  const [selectedBranchId, setSelectedBranchId] = useState<string>("");
  const [officeWorkDetail, setOfficeWorkDetail] = useState<string>("");
  const [otherWorkDetail, setOtherWorkDetail] = useState<string>("");
  const [uploadedFileUrl, setUploadedFileUrl] = useState<string>("");
  const [uploadingFile, setUploadingFile] = useState<boolean>(false);
  const [remarks, setRemarks] = useState<string>("");
  const [workStatus, setWorkStatus] = useState<string>("Pending");
  const [submittingWork, setSubmittingWork] = useState<boolean>(false);

  const uniqueBanks = Array.from(new Set(banksList.map((b) => b.bankName).filter(Boolean)));

  const filteredBranches = branchesList.filter((br) => {
    const parentBank = banksList.find((b) => b.id === br.bankId);

    if (
      searchQuery &&
      !(
        br.branchName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        parentBank?.bankName?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    )
      return false;

    if (bankFilter && parentBank?.bankName !== bankFilter) return false;

    return true;
  });

  const handleOpenWorkModal = (br: any) => {
    setSelectedBranch(br);
    setWorkType("Bank");
    setWorkDateStr(new Date().toISOString().split("T")[0]);
    setSelectedBankId(br.bankId?.toString() || "");
    setSelectedBranchId(br.id?.toString() || "");
    setOfficeWorkDetail("");
    setOtherWorkDetail("");
    setUploadedFileUrl("");
    setRemarks("");
    setWorkStatus("Pending");
    setShowWorkModal(true);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const formData = new FormData();
    formData.append("file", file);

    setUploadingFile(true);
    try {
      const res = await fetch("/api/documents/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.success && data.url) {
        setUploadedFileUrl(data.url);
      } else {
        alert("File upload failed: " + (data.error || "Unknown error"));
      }
    } catch (err: any) {
      console.error("Upload error:", err);
      alert("File upload error: " + (err.message || "Upload failed"));
    } finally {
      setUploadingFile(false);
    }
  };

  const handleSubmitWork = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workType) {
      alert("Please select a Work Type.");
      return;
    }

    const targetBank = banksList.find((b) => b.id?.toString() === selectedBankId);
    const targetBranch = branchesList.find((b) => b.id?.toString() === selectedBranchId);

    if (workType === "Bank") {
      if (!selectedBankId || !selectedBranchId) {
        alert("Please select both Bank and Branch.");
        return;
      }
    } else if (workType === "Office work") {
      if (!officeWorkDetail.trim()) {
        alert("Please enter Office Work details.");
        return;
      }
    } else if (workType === "Other") {
      if (!otherWorkDetail.trim()) {
        alert("Please specify custom work description.");
        return;
      }
    }

    setSubmittingWork(true);
    try {
      const subCat =
        workType === "Bank"
          ? `${targetBank?.bankName || "Bank"} - ${targetBranch?.branchName || "Branch"}`
          : workType === "Office work"
          ? officeWorkDetail.trim()
          : otherWorkDetail.trim();

      const selectedWorkDate = workDateStr ? new Date(workDateStr) : new Date();

      // 1. Post to /api/legal-recovery/work-log (saves to legal_work_logs DB table)
      const resLog = await fetch("/api/legal-recovery/work-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          masterId: selectedBranch?.id || 0,
          category: workType,
          subCategory: subCat,
          remarks: [
            remarks ? `Remark: ${remarks}` : "",
            uploadedFileUrl ? `Attachment: ${uploadedFileUrl}` : "",
          ]
            .filter(Boolean)
            .join("\n"),
          workDate: selectedWorkDate,
        }),
      });
      const dataLog = await resLog.json();
      if (!dataLog.success) {
        console.warn("Work log DB save notice:", dataLog.error);
      }

      // 2. Post to /api/tasks (creates TaskLog entry in tasks DB table)
      const taskTitle = `[Branch Work] ${workType}: ${subCat}`;
      const taskDesc = [
        `Branch: ${selectedBranch?.branchName || ""}`,
        `Bank: ${targetBank?.bankName || ""}`,
        `Work Type: ${workType}`,
        `Work Date: ${selectedWorkDate.toLocaleDateString("en-IN")}`,
        `Detail: ${subCat}`,
        uploadedFileUrl ? `Attachment: ${uploadedFileUrl}` : "",
        remarks ? `Remark: ${remarks}` : "",
      ]
        .filter(Boolean)
        .join("\n");

      const resTask = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskTitle,
          taskType: "Other",
          description: taskDesc,
          proofAttachment: uploadedFileUrl || null,
          attachmentUrl: uploadedFileUrl || null,
          status: workStatus || "Pending",
          priority: "Medium",
          dueDate: selectedWorkDate,
        }),
      });

      // 3. Post to /api/legal-recovery/work-history (saves to legal_work_history DB table)
      await fetch("/api/legal-recovery/work-history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          masterId: selectedBranch?.id || 0,
          category: workType,
          subCategory: subCat,
          bankName: targetBank?.bankName || "",
          branchName: selectedBranch?.branchName || "",
          attachmentUrl: uploadedFileUrl || "",
          remarks: remarks || "",
          status: workStatus || "Pending",
          workDate: selectedWorkDate,
        }),
      });

      const dataTask = await resTask.json();
      if (dataTask.success) {
        alert("Work Entry & Task saved successfully!");
      } else {
        alert("Work log saved successfully!");
      }
      setShowWorkModal(false);
    } catch (err: any) {
      console.error("Failed to submit work log:", err);
      alert("Error submitting work log: " + (err.message || "Unknown error"));
    } finally {
      setSubmittingWork(false);
    }
  };

  const parentBankOfSelected = banksList.find((b) => b.id === selectedBranch?.bankId);

  return (
    <div className="space-y-4 animate-fade-in relative">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="bg-[#FCFBF9] border border-[#E8E4DF] p-4 rounded-xl flex-1 flex items-center gap-3">
          <Search className="w-4 h-4 text-[#9C9890]" />
          <input
            type="text"
            className="bg-transparent border-none focus:outline-none text-xs w-full font-semibold text-slate-700 placeholder:text-[#9C9890] placeholder:font-normal"
            placeholder="Search Branches by Name or Bank..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="relative flex items-center">
          <button
            onClick={() => setShowFilterOptions(!showFilterOptions)}
            className={`px-4 py-4 h-full border border-[#E8E4DF] hover:bg-[#F5F0EA] rounded-xl text-[10px] font-semibold tracking-wider uppercase transition-all flex items-center gap-1.5 shadow-sm ${
              showFilterOptions || bankFilter
                ? "bg-[#F5F0EA] text-[#1C1C1A]"
                : "bg-[#FCFBF9] text-[#5D5B57]"
            }`}
          >
            <Filter className="w-3.5 h-3.5" /> {bankFilter ? "Filtered" : "Filter"}
          </button>

          {showFilterOptions && (
            <div className="absolute right-0 top-full mt-2 w-72 bg-white border border-[#E8E4DF] rounded-xl shadow-2xl z-50 overflow-hidden animate-fade-in p-4 grid gap-4">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">
                  Bank
                </label>
                <select
                  value={bankFilter}
                  onChange={(e) => setBankFilter(e.target.value)}
                  className="w-full text-xs p-2.5 border border-[#E8E4DF] rounded-lg bg-slate-50 focus:outline-none focus:border-indigo-400 font-semibold text-slate-700"
                >
                  <option value="">All Banks</option>
                  {uniqueBanks.map((b) => (
                    <option key={String(b)} value={String(b)}>
                      {String(b)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end mt-2 pt-3 border-t border-slate-100">
                <button
                  onClick={() => {
                    setBankFilter("");
                    setShowFilterOptions(false);
                  }}
                  className="text-[10px] text-rose-600 font-bold uppercase tracking-wider hover:underline flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" /> Clear Filters
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#FCFBF9] border border-[#E8E4DF] rounded-xl overflow-hidden shadow-sm overflow-x-auto max-h-[600px] overflow-y-auto">
        <table className="w-full border-collapse text-left min-w-max">
          <thead className="sticky top-0 bg-[#F5F0EA] z-10">
            <tr className="border-b border-[#E8E4DF] text-[#5D5B57] text-[10px] uppercase font-bold tracking-wider">
              <th className="py-3.5 px-4 bg-[#F5F0EA]">Bank &amp; Branch</th>
              <th className="py-3.5 px-4 bg-[#F5F0EA]">Manager Details</th>
              <th className="py-3.5 px-4 bg-[#F5F0EA]">Recovery Officers</th>
              <th className="py-3.5 px-4 bg-[#F5F0EA]">RBO Details</th>
              <th className="py-3.5 px-4 text-right bg-[#F5F0EA]">Created On</th>
              <th className="py-3.5 px-4 text-center bg-[#F5F0EA]">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E8E4DF] text-xs">
            {filteredBranches.map((br) => {
              const parentBank = banksList.find((b) => b.id === br.bankId);
              return (
                <tr key={br.id} className="hover:bg-white transition-colors">
                  <td className="py-3 px-4">
                    <div className="font-bold text-[#1C1C1A]">{parentBank?.bankName || "Unknown"}</div>
                    <div className="font-semibold text-slate-700">{br.branchName}</div>
                    <div className="text-pink-700 font-mono font-semibold text-[10px]">Code: {br.branchCode}</div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-semibold text-slate-700">{br.branchManager || "N/A"}</div>
                    <div className="text-[#9C9890] text-[10px] flex items-center gap-1 mt-0.5">
                      <PhoneCall className="w-3 h-3" /> {br.branchManagerContact || "N/A"}
                    </div>
                    {br.branchEmail && (
                      <div className="text-[#9C9890] text-[10px] mt-0.5">{br.branchEmail}</div>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-semibold text-slate-700">AO: {br.aoName || "N/A"}</div>
                    <div className="text-slate-600">FO: {br.foName || "N/A"}</div>
                    <div className="text-[#9C9890] text-[10px] flex items-center gap-1 mt-0.5">
                      <PhoneCall className="w-3 h-3" /> {br.foContact || "N/A"}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="text-slate-600 font-semibold mt-1">RBO: {br.rbo || "N/A"}</div>
                  </td>
                  <td className="py-3 px-4 text-[#9C9890] text-right">
                    {new Date(br.createdAt).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-center gap-2">
                      {/* Work Log Button */}
                      <button
                        onClick={() => handleOpenWorkModal(br)}
                        className="px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-600 hover:text-white rounded text-[10px] font-bold uppercase tracking-wide transition-all flex items-center gap-1 whitespace-nowrap shadow-sm hover:shadow"
                        title="Log Branch Work Entry"
                      >
                        <Briefcase className="w-3 h-3" /> Work
                      </button>

                      {/* Edit Branch button */}
                      {onEditBranch && (
                        <button
                          onClick={() => onEditBranch(br)}
                          className="px-3 py-1.5 bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-600 hover:text-white rounded text-[10px] font-bold uppercase tracking-wide transition-colors flex items-center gap-1 whitespace-nowrap"
                          title="Edit Branch Details"
                        >
                          <Pencil className="w-3 h-3" /> Edit
                        </button>
                      )}
                      {/* Business Development (formerly Marketing Pitch) button */}
                      <button
                        onClick={() => setShowMarketingForm({ show: true, branch: br })}
                        className="px-3 py-1.5 bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-600 hover:text-white rounded text-[10px] font-bold uppercase tracking-wide transition-colors flex items-center gap-1 whitespace-nowrap"
                      >
                        <TrendingUp className="w-3 h-3" /> Business Development
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filteredBranches.length === 0 && !loading && (
              <tr>
                <td colSpan={6} className="text-center py-12 text-[#9C9890] text-xs uppercase tracking-wider">
                  No Branches Added Yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* PORTAL MODAL - FULL OVERLAY HIGH-AESTHETIC WORK LOG FORM */}
      {showWorkModal && typeof window !== "undefined" && ReactDOM.createPortal(
        <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-md z-[9999] flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-xl overflow-hidden my-auto transform transition-all">
            
            {/* Modal Header */}
            <div className="p-5 sm:p-6 bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-400 flex items-center justify-center shadow-inner">
                  <Briefcase className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black tracking-wide flex items-center gap-2">
                    Add Branch Work Entry
                    <span className="px-2 py-0.5 bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-[10px] font-bold uppercase rounded-md tracking-wider">
                      Branch Log
                    </span>
                  </h3>
                  <p className="text-xs text-slate-300 font-medium mt-0.5">
                    {selectedBranch?.branchName} &bull; <span className="text-emerald-300 font-bold">{parentBankOfSelected?.bankName || "Bank"}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowWorkModal(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleSubmitWork} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto custom-scrollbar">
              
              {/* Work Type, Work Date & Work Status Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Work Type Selection */}
                <div>
                  <label className="text-xs font-black text-slate-800 uppercase tracking-wider block mb-2 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-emerald-600" />
                    Work Type <span className="text-rose-500">*</span>
                  </label>
                  <select
                    required
                    value={workType}
                    onChange={(e) => {
                      setWorkType(e.target.value);
                      if (e.target.value === "Bank") {
                        setSelectedBankId(selectedBranch?.bankId?.toString() || "");
                        setSelectedBranchId(selectedBranch?.id?.toString() || "");
                      }
                    }}
                    className="w-full text-xs p-3.5 border-2 border-slate-200 hover:border-slate-300 rounded-2xl bg-slate-50/70 focus:bg-white focus:outline-none focus:border-emerald-500 font-bold text-slate-800 transition-all shadow-sm"
                  >
                    <option value="">-- Select Work Type --</option>
                    <option value="Bank">Bank Work</option>
                    <option value="Office work">Office Work</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                {/* Work Date Selection (Supports Past/Custom Dates) */}
                <div>
                  <label className="text-xs font-black text-slate-800 uppercase tracking-wider block mb-2 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                    Work Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={workDateStr}
                    onChange={(e) => setWorkDateStr(e.target.value)}
                    className="w-full text-xs p-3.5 border-2 border-slate-200 hover:border-slate-300 rounded-2xl bg-slate-50/70 focus:bg-white focus:outline-none focus:border-emerald-500 font-bold text-slate-800 transition-all shadow-sm"
                  />
                </div>

                {/* Work Status Selection */}
                <div>
                  <label className="text-xs font-black text-slate-800 uppercase tracking-wider block mb-2 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Work Status <span className="text-rose-500">*</span>
                  </label>
                  <select
                    required
                    value={workStatus}
                    onChange={(e) => setWorkStatus(e.target.value)}
                    className="w-full text-xs p-3.5 border-2 border-slate-200 hover:border-slate-300 rounded-2xl bg-slate-50/70 focus:bg-white focus:outline-none focus:border-emerald-500 font-bold text-slate-800 transition-all shadow-sm"
                  >
                    <option value="Pending">⏳ Pending</option>
                    <option value="In Progress">🔄 In Progress</option>
                    <option value="Completed">✅ Completed</option>
                  </select>
                </div>
              </div>

              {/* Dynamic Sub-Sections Based on Selection */}
              {workType === "Bank" && (
                <div className="p-4 bg-emerald-50/60 rounded-2xl border-2 border-emerald-100/80 space-y-3.5 animate-in fade-in slide-in-from-top-1 duration-150">
                  <div className="flex items-center gap-1.5 text-emerald-800 text-xs font-black uppercase tracking-wider">
                    <Building2 className="w-4 h-4 text-emerald-600" />
                    Bank &amp; Branch Selection
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Bank Select */}
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                        Bank <span className="text-rose-500">*</span>
                      </label>
                      <select
                        required
                        value={selectedBankId}
                        onChange={(e) => {
                          setSelectedBankId(e.target.value);
                          const bankBranches = branchesList.filter(
                            (b) => b.bankId?.toString() === e.target.value
                          );
                          if (bankBranches.length > 0) {
                            setSelectedBranchId(bankBranches[0].id?.toString() || "");
                          } else {
                            setSelectedBranchId("");
                          }
                        }}
                        className="w-full text-xs p-3 border border-emerald-200 rounded-xl bg-white focus:outline-none focus:border-emerald-600 font-bold text-slate-800 shadow-sm"
                      >
                        <option value="">-- Select Bank --</option>
                        {banksList.map((b) => (
                          <option key={b.id} value={b.id?.toString()}>
                            {b.bankName}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Branch Select */}
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                        Branch <span className="text-rose-500">*</span>
                      </label>
                      <select
                        required
                        value={selectedBranchId}
                        onChange={(e) => setSelectedBranchId(e.target.value)}
                        className="w-full text-xs p-3 border border-emerald-200 rounded-xl bg-white focus:outline-none focus:border-emerald-600 font-bold text-slate-800 shadow-sm"
                      >
                        <option value="">-- Select Branch --</option>
                        {branchesList
                          .filter((b) => !selectedBankId || b.bankId?.toString() === selectedBankId)
                          .map((b) => (
                            <option key={b.id} value={b.id?.toString()}>
                              {b.branchName} {b.branchCode ? `(${b.branchCode})` : ""}
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {workType === "Office work" && (
                <div className="p-4 bg-indigo-50/60 rounded-2xl border-2 border-indigo-100/80 space-y-2 animate-in fade-in slide-in-from-top-1 duration-150">
                  <label className="text-xs font-black text-indigo-900 uppercase tracking-wider block flex items-center gap-1.5">
                    <Building className="w-3.5 h-3.5 text-indigo-600" />
                    Office Work Details <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={officeWorkDetail}
                    onChange={(e) => setOfficeWorkDetail(e.target.value)}
                    placeholder="e.g. Notice Drafting, File Audit, Document Verification..."
                    className="w-full text-xs p-3 border border-indigo-200 rounded-xl bg-white focus:outline-none focus:border-indigo-600 font-semibold text-slate-800 shadow-sm"
                  />
                </div>
              )}

              {workType === "Other" && (
                <div className="p-4 bg-amber-50/60 rounded-2xl border-2 border-amber-100/80 space-y-2 animate-in fade-in slide-in-from-top-1 duration-150">
                  <label className="text-xs font-black text-amber-900 uppercase tracking-wider block flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-amber-600" />
                    Specify Work Description <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={otherWorkDetail}
                    onChange={(e) => setOtherWorkDetail(e.target.value)}
                    placeholder="Enter custom work description..."
                    className="w-full text-xs p-3 border border-amber-200 rounded-xl bg-white focus:outline-none focus:border-amber-600 font-semibold text-slate-800 shadow-sm"
                  />
                </div>
              )}

              {/* Upload Attachment */}
              <div>
                <label className="text-xs font-black text-slate-800 uppercase tracking-wider block mb-2 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Upload className="w-3.5 h-3.5 text-emerald-600" />
                    Upload Attachment (Image / Document)
                  </span>
                  {uploadingFile && (
                    <span className="text-[10px] text-emerald-600 font-bold animate-pulse">Uploading file...</span>
                  )}
                </label>

                <div className="border-2 border-dashed border-slate-200 hover:border-emerald-400 rounded-2xl p-4 text-center bg-slate-50/70 hover:bg-emerald-50/30 transition-all relative group cursor-pointer">
                  <input
                    type="file"
                    accept="image/*,.pdf,.doc,.docx"
                    onChange={handleFileUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <div className="flex flex-col items-center justify-center gap-1">
                    <Upload className="w-6 h-6 text-slate-400 group-hover:text-emerald-600 transition-colors" />
                    <p className="text-xs font-bold text-slate-700 group-hover:text-emerald-900">
                      Click or Drag &amp; Drop file here
                    </p>
                    <p className="text-[10px] text-slate-400 font-medium">
                      Supports JPG, PNG, PDF, DOCX
                    </p>
                  </div>
                </div>

                {uploadedFileUrl && (
                  <div className="mt-3 flex items-center justify-between gap-2 p-3 bg-emerald-50 text-emerald-900 rounded-2xl border border-emerald-200 text-xs font-bold shadow-sm">
                    <div className="flex items-center gap-2 min-w-0">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <a
                        href={uploadedFileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="underline hover:text-emerald-950 truncate max-w-[280px]"
                      >
                        {uploadedFileUrl.split("/").pop()}
                      </a>
                    </div>
                    <button
                      type="button"
                      onClick={() => setUploadedFileUrl("")}
                      className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Remove attachment"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Remarks Textarea */}
              <div>
                <label className="text-xs font-black text-slate-800 uppercase tracking-wider block mb-2 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-emerald-600" />
                  Remarks / Notes
                </label>
                <textarea
                  rows={3}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Enter detailed work remarks or notes..."
                  className="w-full text-xs p-3.5 border-2 border-slate-200 hover:border-slate-300 rounded-2xl bg-slate-50/70 focus:bg-white focus:outline-none focus:border-emerald-500 font-medium text-slate-800 transition-all resize-none shadow-sm"
                />
              </div>

              {/* Modal Footer Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowWorkModal(false)}
                  className="px-5 py-2.5 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  disabled={submittingWork || uploadingFile}
                  type="submit"
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider disabled:opacity-50 transition-all shadow-lg hover:shadow-emerald-200 flex items-center gap-2"
                >
                  <Briefcase className="w-4 h-4" />
                  {submittingWork ? "Saving Entry..." : "Save Work Entry"}
                </button>
              </div>

            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
