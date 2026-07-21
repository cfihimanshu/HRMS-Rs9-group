import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Search, Trash2, PhoneCall, Calendar, History, FileText, CheckCircle2, Clock, Upload, ShieldCheck, Edit } from "lucide-react";

export default function NbfcMasterView({
  nbfcsList,
  nbfcBranchesList,
  loading,
  onEditNbfc,
  onDeleteNbfc,
  triggerToast,
}: {
  nbfcsList: any[];
  nbfcBranchesList: any[];
  loading: boolean;
  onEditNbfc?: (nbfc: any) => void;
  onDeleteNbfc?: (id: number) => void;
  triggerToast?: (msg: string) => void;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Follow Up Modal State
  const [showFollowUpModal, setShowFollowUpModal] = useState<{ show: boolean; nbfc: any | null }>({
    show: false,
    nbfc: null,
  });
  const [followUpForm, setFollowUpForm] = useState({
    callDate: new Date().toISOString().split("T")[0],
    callStatus: "Connected",
    nextFollowUpDate: "",
    conversationDetails: "",
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [submittingFollowUp, setSubmittingFollowUp] = useState(false);

  // Call History State
  const [showHistoryModal, setShowHistoryModal] = useState<{ show: boolean; nbfc: any | null }>({
    show: false,
    nbfc: null,
  });
  const [historyLogs, setHistoryLogs] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const filteredNbfcs = nbfcsList.filter(
    (b) =>
      b.nbfcName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.nbfcCode?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleOpenFollowUpModal = (nbfc: any) => {
    setShowFollowUpModal({ show: true, nbfc });
    setFollowUpForm({
      callDate: new Date().toISOString().split("T")[0],
      callStatus: "Connected",
      nextFollowUpDate: "",
      conversationDetails: "",
    });
    setSelectedFile(null);
  };

  const fetchHistory = async (nbfcId: number) => {
    try {
      setLoadingHistory(true);
      const res = await fetch(`/api/legal-recovery/nbfc-followup?nbfcId=${nbfcId}`);
      const data = await res.json();
      if (data.success) {
        setHistoryLogs(data.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleOpenHistoryModal = (nbfc: any) => {
    setShowHistoryModal({ show: true, nbfc });
    fetchHistory(nbfc.id);
  };

  const handleFollowUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showFollowUpModal.nbfc) return;
    if (!followUpForm.conversationDetails.trim()) {
      triggerToast?.("Please enter conversation details / kya baat hui");
      return;
    }

    setSubmittingFollowUp(true);
    try {
      let attachmentUrl: string | null = null;

      // Handle file upload if file is selected
      if (selectedFile) {
        const formData = new FormData();
        formData.append("file", selectedFile);
        const uploadRes = await fetch("/api/documents/upload", {
          method: "POST",
          body: formData,
        });
        const uploadData = await uploadRes.json();
        if (uploadData.success && uploadData.url) {
          attachmentUrl = uploadData.url;
        }
      }

      const payload = {
        nbfcId: showFollowUpModal.nbfc.id,
        nbfcName: showFollowUpModal.nbfc.nbfcName,
        nbfcCode: showFollowUpModal.nbfc.nbfcCode,
        callDate: followUpForm.callDate,
        callStatus: followUpForm.callStatus,
        nextFollowUpDate: followUpForm.nextFollowUpDate || null,
        conversationDetails: followUpForm.conversationDetails,
        attachmentUrl: attachmentUrl,
      };

      const res = await fetch("/api/legal-recovery/nbfc-followup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        triggerToast?.(
          data.taskId
            ? `Follow-up call saved & Auto-task #${data.taskId} created!`
            : "Follow-up call logged successfully!"
        );
        setShowFollowUpModal({ show: false, nbfc: null });
      } else {
        triggerToast?.(data.error || "Failed to save follow-up call");
      }
    } catch (err) {
      console.error(err);
      triggerToast?.("Error saving follow-up call");
    } finally {
      setSubmittingFollowUp(false);
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Search Header */}
      <div className="bg-[#FCFBF9] border border-[#E8E4DF] p-4 rounded-xl flex items-center gap-3">
        <Search className="w-4 h-4 text-[#9C9890]" />
        <input
          type="text"
          className="bg-transparent border-none focus:outline-none text-xs w-full font-semibold text-slate-700 placeholder:text-[#9C9890] placeholder:font-normal"
          placeholder="Search NBFC Master by Name or Code..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Table */}
      <div className="bg-[#FCFBF9] border border-[#E8E4DF] rounded-xl overflow-hidden shadow-sm">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-[#E8E4DF] bg-[#F5F0EA]/40 text-[#5D5B57] text-[10px] uppercase font-bold tracking-wider">
              <th className="py-3.5 px-4 text-center">ID</th>
              <th className="py-3.5 px-6">NBFC Name</th>
              <th className="py-3.5 px-6">NBFC Code</th>
              <th className="py-3.5 px-6 text-center">Total Branches</th>
              <th className="py-3.5 px-6">Status</th>
              <th className="py-3.5 px-6 text-right">Created On</th>
              <th className="py-3.5 px-6 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E8E4DF] text-xs">
            {filteredNbfcs.map((b) => (
              <tr key={b.id} className="hover:bg-white transition-colors">
                <td className="py-3 px-4 text-center font-mono font-bold text-indigo-700">#{b.id}</td>
                <td className="py-3 px-6 font-bold text-[#1C1C1A]">{b.nbfcName}</td>
                <td className="py-3 px-6 text-indigo-700 font-mono font-bold">{b.nbfcCode || "—"}</td>
                <td className="py-3 px-6 text-center font-bold text-slate-600">
                  {nbfcBranchesList.filter((br) => br.nbfcId === b.id).length}
                </td>
                <td className="py-3 px-6">
                  <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
                    Active
                  </span>
                </td>
                <td className="py-3 px-6 text-[#9C9890] text-right">
                  {b.createdAt ? new Date(b.createdAt).toLocaleDateString("en-IN") : "—"}
                </td>
                <td className="py-3 px-6 text-center">
                  <div className="flex items-center justify-center gap-2">
                    {/* Log Follow Up Action */}
                    <button
                      onClick={() => handleOpenFollowUpModal(b)}
                      className="px-2.5 py-1 text-[11px] font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg flex items-center gap-1.5 transition-all shadow-2xs"
                      title="Log Follow-Up Call & Create Task"
                    >
                      <PhoneCall className="w-3.5 h-3.5 text-purple-600" />
                      <span>Log Call</span>
                    </button>

                    {/* View History Action */}
                    <button
                      onClick={() => handleOpenHistoryModal(b)}
                      className="p-1.5 text-indigo-600 hover:bg-indigo-50 border border-transparent hover:border-indigo-200 rounded-lg transition-all"
                      title="View Call History"
                    >
                      <History className="w-3.5 h-3.5" />
                    </button>

                    {/* Edit NBFC Action */}
                    {onEditNbfc && (
                      <button
                        onClick={() => onEditNbfc(b)}
                        className="p-1.5 text-amber-600 hover:bg-amber-50 border border-transparent hover:border-amber-200 rounded-lg transition-all"
                        title="Edit NBFC Master"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {onDeleteNbfc && (
                      <button
                        onClick={() => onDeleteNbfc(b.id)}
                        className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition-colors border border-transparent hover:border-rose-200"
                        title="Delete NBFC"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filteredNbfcs.length === 0 && !loading && (
              <tr>
                <td colSpan={7} className="text-center py-12 text-[#9C9890] text-xs uppercase tracking-wider font-semibold">
                  No NBFCs Registered Yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── Log Follow Up Call Modal ── */}
      {showFollowUpModal.show && showFollowUpModal.nbfc && mounted && createPortal(
        <div className="fixed inset-0 z-[99999] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-slate-200/80 overflow-hidden animate-scale-in my-auto max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="px-6 py-4 bg-purple-50/90 border-b border-purple-100 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-purple-100 text-purple-700 rounded-xl border border-purple-200">
                  <PhoneCall className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-sm">Log Follow Up Call</h3>
                  <p className="text-[11px] font-bold text-purple-700 truncate max-w-[320px]">
                    {showFollowUpModal.nbfc.nbfcName} ({showFollowUpModal.nbfc.nbfcCode || "NBFC"})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowFollowUpModal({ show: false, nbfc: null })}
                className="w-7 h-7 rounded-full bg-slate-200/70 hover:bg-slate-300/80 text-slate-600 flex items-center justify-center font-bold text-xs transition-all"
              >
                ✕
              </button>
            </div>

            {/* Summary Box */}
            <div className="px-6 pt-4 shrink-0">
              <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 text-xs flex justify-between items-center">
                <div>
                  <p className="font-black text-slate-900 text-xs">
                    {showFollowUpModal.nbfc.nbfcName}
                  </p>
                  <p className="text-[10px] text-slate-500 font-mono">
                    Code: {showFollowUpModal.nbfc.nbfcCode || "—"}
                  </p>
                </div>
                <div className="bg-purple-100/70 text-purple-800 border border-purple-200 px-2.5 py-1 rounded-full text-[10px] font-black">
                  {nbfcBranchesList.filter((br) => br.nbfcId === showFollowUpModal.nbfc.id).length} Branches
                </div>
              </div>
            </div>

            {/* Form Body */}
            <form onSubmit={handleFollowUpSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Call Date */}
                <div>
                  <label className="block text-[10px] uppercase font-black text-slate-500 tracking-wider mb-1">
                    Call Date *
                  </label>
                  <input
                    type="date"
                    required
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-purple-600"
                    value={followUpForm.callDate}
                    onChange={(e) => setFollowUpForm({ ...followUpForm, callDate: e.target.value })}
                  />
                </div>

                {/* Call Status */}
                <div>
                  <label className="block text-[10px] uppercase font-black text-slate-500 tracking-wider mb-1">
                    Call Status *
                  </label>
                  <select
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-purple-600"
                    value={followUpForm.callStatus}
                    onChange={(e) => setFollowUpForm({ ...followUpForm, callStatus: e.target.value })}
                  >
                    <option value="Connected">Connected</option>
                    <option value="Switched Off / Busy">Switched Off / Busy</option>
                    <option value="Not Reachable">Not Reachable</option>
                    <option value="Promise To Pay (PTP)">Promise To Pay (PTP)</option>
                    <option value="Meeting Scheduled">Meeting Scheduled</option>
                    <option value="Call Back Requested">Call Back Requested</option>
                    <option value="Wrong Number">Wrong Number</option>
                  </select>
                </div>
              </div>

              {/* Next Follow Up Date */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-[10px] uppercase font-black text-slate-500 tracking-wider">
                    Next Follow Up Date (Auto Task)
                  </label>
                  <span className="text-[9px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                    Creates Task in Task Logs
                  </span>
                </div>
                <input
                  type="date"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-purple-600"
                  value={followUpForm.nextFollowUpDate}
                  onChange={(e) => setFollowUpForm({ ...followUpForm, nextFollowUpDate: e.target.value })}
                />
              </div>

              {/* Conversation Details */}
              <div>
                <label className="block text-[10px] uppercase font-black text-slate-500 tracking-wider mb-1">
                  Conversation Details / Kya Baat Hui *
                </label>
                <textarea
                  rows={3}
                  required
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-purple-600 resize-none"
                  placeholder="Summarize the conversation here (e.g. Discussed security deposit clearance, manager requested follow up on Monday)..."
                  value={followUpForm.conversationDetails}
                  onChange={(e) => setFollowUpForm({ ...followUpForm, conversationDetails: e.target.value })}
                />
              </div>

              {/* Upload Document / Recording */}
              <div>
                <label className="block text-[10px] uppercase font-black text-slate-500 tracking-wider mb-1">
                  Upload Document / Recording (Optional)
                </label>
                <div className="flex items-center gap-2">
                  <label className="cursor-pointer px-4 py-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-2 transition-all">
                    <Upload className="w-3.5 h-3.5 text-purple-600" />
                    Choose File
                    <input
                      type="file"
                      className="hidden"
                      onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    />
                  </label>
                  <span className="text-xs text-slate-500 truncate max-w-[240px]">
                    {selectedFile ? selectedFile.name : "No file chosen"}
                  </span>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowFollowUpModal({ show: false, nbfc: null })}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingFollowUp}
                  className="px-5 py-2.5 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-black shadow transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {submittingFollowUp ? "Saving..." : "Save Follow Up"}
                </button>
              </div>

            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ── Follow Up History Modal ── */}
      {showHistoryModal.show && showHistoryModal.nbfc && mounted && createPortal(
        <div className="fixed inset-0 z-[99999] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl border border-slate-200/80 overflow-hidden animate-scale-in my-auto max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-50 text-indigo-700 rounded-xl border border-indigo-100">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-sm">Follow Up Call History</h3>
                  <p className="text-[11px] font-bold text-indigo-600">
                    {showHistoryModal.nbfc.nbfcName} ({showHistoryModal.nbfc.nbfcCode || "NBFC"})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowHistoryModal({ show: false, nbfc: null })}
                className="w-7 h-7 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-600 flex items-center justify-center font-bold text-xs"
              >
                ✕
              </button>
            </div>

            {/* History Logs Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-3">
              {loadingHistory ? (
                <div className="text-center py-8 text-xs font-bold text-slate-400">Loading call history...</div>
              ) : historyLogs.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs font-semibold uppercase">
                  No Follow-Up Calls Logged Yet.
                </div>
              ) : (
                historyLogs.map((log) => (
                  <div key={log.id} className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 space-y-2">
                    <div className="flex justify-between items-center text-xs border-b border-slate-200/60 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">{log.callerName || "User"}</span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {log.callDate ? log.callDate.split("-").reverse().join("/") : "—"}
                        </span>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-purple-100 text-purple-800 border border-purple-200">
                        {log.callStatus}
                      </span>
                    </div>

                    <p className="text-xs text-slate-700 leading-relaxed">{log.conversationDetails}</p>

                    <div className="flex justify-between items-center text-[10px] pt-1 border-t border-slate-200/50">
                      {log.nextFollowUpDate ? (
                        <span className="text-indigo-700 font-bold flex items-center gap-1 font-mono">
                          <Calendar className="w-3 h-3 text-indigo-600" /> Next Follow-Up: {log.nextFollowUpDate.split("-").reverse().join("/")}
                          {log.taskId && <span className="bg-indigo-100 text-indigo-800 px-1.5 py-0.2 rounded font-black font-mono ml-1">#{log.taskId}</span>}
                        </span>
                      ) : (
                        <span className="text-slate-400">No next follow-up date set</span>
                      )}

                      {log.attachmentUrl && (
                        <a
                          href={log.attachmentUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-purple-600 font-bold hover:underline flex items-center gap-1"
                        >
                          <FileText className="w-3 h-3" /> View Attachment
                        </a>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
