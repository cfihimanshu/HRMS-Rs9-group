"use client";
import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import {
  Plus, Search, AlertCircle, ShieldAlert, CheckCircle, RefreshCw,
  EyeOff, FileText, UserCheck, ShieldCheck, Building2, Edit, X,
  Lock, MessageSquare, Clock, CheckCircle2, Send, CornerDownRight,
  Filter, Sparkles, AlertTriangle
} from "lucide-react";

interface ComplianceProps {
  riskAlertList: any[];
  toggleModal: (modalId: string, open: boolean) => void;
  triggerToast: (msg: string) => void;
  onResolveAlert: (id: string) => void;
}

export function GrievanceResolution({ toggleModal, triggerToast }: { toggleModal: (modalId: string, open: boolean) => void; triggerToast: (msg: string) => void; }) {
  const { data: session } = useSession();
  const [grievances, setGrievances] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [loading, setLoading] = useState(false);
  const [selectedGrievanceId, setSelectedGrievanceId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [replyStatus, setReplyStatus] = useState("In-Progress");
  const [isOfficialResponse, setIsOfficialResponse] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [reactions, setReactions] = useState<Record<string, Record<string, number>>>({});
  const [userReacted, setUserReacted] = useState<Record<string, boolean>>({});

  const userRole = (session?.user as any)?.role || "";
  const isHrOrAdmin = ["Owner", "Director", "IT Admin", "HR Head", "HR Executive", "Department Manager"].some(r => userRole.toLowerCase().includes(r.toLowerCase()));

  const loadGrievances = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/grievances");
      const data = await res.json();
      if (data.success) {
        const items = data.data || [];
        setGrievances(items);
        if (items.length > 0 && !selectedGrievanceId) {
          setSelectedGrievanceId(items[0].id);
        }
      }
    } catch (err) {
      triggerToast("Failed to load problem reports");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGrievances();
  }, []);

  const handleSendReply = async () => {
    if (!selectedGrievanceId) return;
    if (!replyText || !replyText.trim()) {
      triggerToast("Please write a message before sending.");
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch("/api/grievances", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reply",
          grievanceId: selectedGrievanceId,
          messageText: replyText.trim(),
          isOfficial: isOfficialResponse && isHrOrAdmin,
          status: isHrOrAdmin ? replyStatus : undefined
        })
      });
      const data = await res.json();
      if (data.success) {
        triggerToast(isOfficialResponse ? "Official HR response posted!" : "Reply added to thread!");
        setReplyText("");
        await loadGrievances();
      } else {
        triggerToast("Error: " + (data.error || "Failed to send"));
      }
    } catch (err) {
      triggerToast("Failed to send message");
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickResolve = async (id: string, newStatus: string, reportText?: string) => {
    try {
      setSubmitting(true);
      const res = await fetch("/api/grievances", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          grievanceId: id,
          status: newStatus,
          resolutionReport: reportText || "Issue investigated and resolved by HR management."
        })
      });
      const data = await res.json();
      if (data.success) {
        triggerToast(`Updated problem #${id.slice(-4).toUpperCase()} to ${newStatus}`);
        await loadGrievances();
      } else {
        triggerToast("Error: " + data.error);
      }
    } catch (err) {
      triggerToast("Failed to update status");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleReaction = (msgId: string, emoji: string) => {
    const key = `${msgId}_${emoji}`;
    const alreadyReacted = !!userReacted[key];

    setUserReacted(prev => ({
      ...prev,
      [key]: !alreadyReacted
    }));

    setReactions(prev => {
      const msgReactions = { ...(prev[msgId] || {}) };
      const current = msgReactions[emoji] || 0;
      if (alreadyReacted) {
        const next = Math.max(0, current - 1);
        if (next === 0) {
          delete msgReactions[emoji];
        } else {
          msgReactions[emoji] = next;
        }
      } else {
        msgReactions[emoji] = current + 1;
      }
      return {
        ...prev,
        [msgId]: msgReactions
      };
    });
  };

  // Metrics
  const totalCount = grievances.length;
  const openCount = grievances.filter(g => g.status === "Open" || !g.status).length;
  const inProgressCount = grievances.filter(g => g.status === "In-Progress").length;
  const resolvedCount = grievances.filter(g => g.status === "Resolved").length;

  // Filtered List
  const filteredGrievances = grievances.filter(g => {
    const matchesSearch =
      (g.category || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (g.description || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (g.id || "").toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === "ALL" ? true :
        statusFilter === "OPEN" ? (g.status === "Open" || !g.status) :
          statusFilter === "IN-PROGRESS" ? g.status === "In-Progress" :
            statusFilter === "RESOLVED" ? g.status === "Resolved" : true;

    return matchesSearch && matchesStatus;
  });

  const selectedGrievance = grievances.find(g => g.id === selectedGrievanceId) || filteredGrievances[0] || null;

  const getPriorityBadge = (priority: string) => {
    const p = (priority || "").toLowerCase();
    if (p === "high") return "bg-rose-50 text-rose-700 border-rose-200 font-black";
    if (p === "normal" || p === "medium") return "bg-amber-50 text-amber-700 border-amber-200 font-bold";
    return "bg-emerald-50 text-emerald-700 border-emerald-200 font-bold";
  };

  const getCategoryIcon = (category: string) => {
    const c = (category || "").toLowerCase();
    if (c.includes("facility") || c.includes("infrastructure")) return "🏢";
    if (c.includes("payroll") || c.includes("salary") || c.includes("hr")) return "💳";
    if (c.includes("management") || c.includes("team")) return "👔";
    if (c.includes("misconduct") || c.includes("ethics")) return "⚖️";
    if (c.includes("suggestion") || c.includes("feedback")) return "💡";
    return "📌";
  };

  return (
    <div className="space-y-4 animate-fadeIn text-slate-800">

      {/* Top Banner Header */}
      <div className="p-4 sm:p-5 rounded-3xl border border-[#714B67]/20 bg-gradient-to-r from-[#714B67]/15 via-[#9D688E]/8 to-white dark:to-slate-900 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs relative overflow-hidden backdrop-blur-md">
        <div className="space-y-1 z-10">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="p-2 rounded-2xl bg-gradient-to-br from-[#714B67] to-[#4A2B42] text-white shadow-sm">
              <Lock className="w-4 h-4" />
            </span>
            <h1 className="text-base sm:text-lg font-black tracking-tight text-slate-900 dark:text-white">
              Anonymous Grievance &amp; Problem Hub
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              100% Identity Protected
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium">
            Interactive, company-wide confidential chat &amp; problem redressal feed.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start md:self-auto z-10">
          <button
            onClick={() => toggleModal("grievance", true)}
            className="bg-gradient-to-r from-[#714B67] to-[#4A2B42] hover:from-[#5F3F56] hover:to-[#381F31] text-white px-4 py-2 rounded-2xl text-xs font-black transition-all shadow-md shadow-[#714B67]/20 hover:shadow-lg flex items-center gap-1.5 active:scale-[0.98] cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Share Problem Anonymously
          </button>
          <button
            onClick={loadGrievances}
            disabled={loading}
            title="Refresh Feed"
            className="p-2 border border-slate-200 bg-white rounded-2xl hover:bg-slate-50 text-slate-600 transition-all shadow-xs cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 text-[#714B67] ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Main 2-Column Modern Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-[720px] max-h-[85vh]">

        {/* LEFT COLUMN: Problem Explorer & Threads List (4 of 12 cols on desktop) */}
        <div className="lg:col-span-4 xl:col-span-4 flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xs">
          
          {/* Search & Filter Header */}
          <div className="p-3.5 border-b border-slate-100 dark:border-slate-800 space-y-2.5 bg-slate-50/50">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search issues, ticket ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl pl-8.5 pr-3 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#714B67] shadow-2xs placeholder:text-slate-400"
              />
            </div>

            {/* Quick Filter Tabs */}
            <div className="flex items-center gap-1 overflow-x-auto pb-0.5 no-scrollbar text-[11px] font-bold">
              {[
                { key: "ALL", label: "All", count: totalCount },
                { key: "OPEN", label: "Pending", count: openCount },
                { key: "IN-PROGRESS", label: "In-Progress", count: inProgressCount },
                { key: "RESOLVED", label: "Resolved", count: resolvedCount },
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setStatusFilter(tab.key)}
                  className={`px-2.5 py-1 rounded-xl whitespace-nowrap transition-all flex items-center gap-1 cursor-pointer ${
                    statusFilter === tab.key
                      ? "bg-[#714B67] text-white shadow-2xs"
                      : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80"
                  }`}
                >
                  <span>{tab.label}</span>
                  <span className={`px-1 rounded-md text-[9px] font-mono ${statusFilter === tab.key ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"}`}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Scrollable Threads List */}
          <div className="flex-1 overflow-y-auto p-2.5 space-y-2 divide-y divide-transparent">
            {loading ? (
              <div className="text-center py-16 space-y-2">
                <RefreshCw className="w-5 h-5 text-[#714B67] animate-spin mx-auto" />
                <p className="text-xs text-slate-400 font-bold">Loading issues...</p>
              </div>
            ) : filteredGrievances.length === 0 ? (
              <div className="text-center py-16 px-4 space-y-2">
                <p className="text-xs font-bold text-slate-700">No issues found</p>
                <p className="text-[11px] text-slate-400">Try changing your filters or post a new problem.</p>
              </div>
            ) : (
              filteredGrievances.map((item) => {
                const isSelected = selectedGrievance?.id === item.id;
                const isResolved = item.status === "Resolved";
                const isInProgress = item.status === "In-Progress";
                const msgCount = (item.messages && item.messages.length > 0) ? item.messages.length : (item.resolutionReport ? 2 : 1);

                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      setSelectedGrievanceId(item.id);
                      setIsOfficialResponse(isHrOrAdmin);
                      setReplyStatus(item.status || "In-Progress");
                    }}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer relative space-y-2 ${
                      isSelected
                        ? "bg-[#714B67]/8 border-[#714B67]/40 shadow-sm ring-1 ring-[#714B67]/20"
                        : "bg-white border-slate-200/80 hover:bg-slate-50 hover:border-slate-300"
                    }`}
                  >
                    {/* Header line */}
                    <div className="flex items-center justify-between gap-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9px] font-mono font-black text-[#714B67] bg-[#714B67]/10 px-1.5 py-0.2 rounded border border-[#714B67]/20">
                          #GR-{item.id.slice(-4).toUpperCase()}
                        </span>
                        <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                          <span>{getCategoryIcon(item.category)}</span>
                          <span className="truncate max-w-[120px]">{item.category || "General"}</span>
                        </span>
                      </div>

                      <span className={`text-[9px] px-2 py-0.2 rounded-full font-bold border ${
                        isResolved
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : isInProgress
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : "bg-slate-100 text-slate-600 border-slate-200"
                      }`}>
                        {item.status || "Open"}
                      </span>
                    </div>

                    {/* Excerpt */}
                    <p className="text-xs text-slate-800 font-medium line-clamp-2 leading-snug">
                      {item.description}
                    </p>

                    {/* Footer info */}
                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono pt-1 border-t border-slate-100">
                      <span className="flex items-center gap-1 text-slate-500">
                        <ShieldCheck className="w-3 h-3 text-emerald-600" />
                        {item.anonymous ? "Anonymous" : (item.raisedBy?.name || "Employee")}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="flex items-center gap-0.5 text-[#714B67] font-bold bg-[#714B67]/10 px-1.5 py-0.2 rounded">
                          <MessageSquare className="w-2.5 h-2.5" /> {msgCount}
                        </span>
                        <span>
                          {new Date(item.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

        </div>


        {/* RIGHT COLUMN: Interactive Live Conversation Hub (8 of 12 cols on desktop) */}
        <div className="lg:col-span-8 xl:col-span-8 flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xs">
          
          {selectedGrievance ? (
            <>
              {/* Thread Header Bar */}
              <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-mono font-black text-[#714B67] bg-[#714B67]/10 px-2 py-0.5 rounded-lg border border-[#714B67]/20">
                      #GR-{selectedGrievance.id.slice(-4).toUpperCase()}
                    </span>
                    <span className="text-xs font-black text-slate-850 flex items-center gap-1.5">
                      <span>{getCategoryIcon(selectedGrievance.category)}</span>
                      <span>{selectedGrievance.category || "General"}</span>
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-md border ${getPriorityBadge(selectedGrievance.priority)}`}>
                      ⚡ {selectedGrievance.priority || "Normal"} Priority
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono flex items-center gap-2">
                    <span>Logged on {new Date(selectedGrievance.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                    <span>•</span>
                    <span className="text-emerald-700 font-bold">100% Identity Protected</span>
                  </div>
                </div>

                {/* Right Status Controls & Stepper */}
                <div className="flex items-center gap-2">
                  <div className="hidden sm:flex items-center gap-1 text-[10px] font-mono font-bold bg-white border border-slate-200 p-1 rounded-xl shadow-2xs">
                    <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                      ✓ Logged
                    </span>
                    <span className="text-slate-300">➔</span>
                    <span className={`px-2 py-0.5 rounded-md border ${selectedGrievance.status === "In-Progress" || selectedGrievance.status === "Resolved"
                      ? "bg-amber-50 text-amber-700 border-amber-200 font-black"
                      : "bg-transparent text-slate-400 border-transparent"
                    }`}>
                      Investigating
                    </span>
                    <span className="text-slate-300">➔</span>
                    <span className={`px-2 py-0.5 rounded-md border ${selectedGrievance.status === "Resolved"
                      ? "bg-emerald-600 text-white border-emerald-700 font-black"
                      : "bg-transparent text-slate-400 border-transparent"
                    }`}>
                      Resolved
                    </span>
                  </div>

                  {isHrOrAdmin && selectedGrievance.status !== "Resolved" && (
                    <button
                      onClick={() => handleQuickResolve(selectedGrievance.id, "Resolved")}
                      disabled={submitting}
                      className="px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shadow-2xs"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> Quick Resolve
                    </button>
                  )}
                </div>
              </div>

              {/* Chat Stream Canvas (Scrollable) */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 bg-gradient-to-b from-slate-50/40 via-white to-slate-50/30">
                {(() => {
                  const threadMessages: any[] = (selectedGrievance.messages && selectedGrievance.messages.length > 0)
                    ? selectedGrievance.messages
                    : [
                        {
                          id: "msg_init_" + selectedGrievance.id,
                          senderName: selectedGrievance.anonymous ? "Anonymous Colleague" : (selectedGrievance.raisedBy?.name || "Employee"),
                          senderRole: selectedGrievance.anonymous ? "Employee" : (selectedGrievance.raisedBy?.role || "Employee"),
                          isOfficial: false,
                          message: selectedGrievance.description,
                          createdAt: selectedGrievance.createdAt,
                        },
                        ...(selectedGrievance.resolutionReport ? [{
                          id: "msg_res_" + selectedGrievance.id,
                          senderName: selectedGrievance.assignedTo?.name ? `Official Redressal (by ${selectedGrievance.assignedTo.name})` : "Official HR & Management Redressal",
                          senderRole: "HR / Management",
                          isOfficial: true,
                          message: selectedGrievance.resolutionReport,
                          createdAt: selectedGrievance.updatedAt || selectedGrievance.createdAt,
                        }] : [])
                      ];

                  return (
                    <div className="space-y-4 w-full">
                      {threadMessages.map((msg: any, idx: number) => {
                        const isOfficialMsg = !!msg.isOfficial;
                        const msgId = msg.id || `msg_${idx}`;
                        const msgReactions = reactions[msgId] || {};

                        return (
                          <div key={msgId} className="flex items-start gap-3 group animate-fadeIn">
                            {/* Avatar */}
                            {isOfficialMsg ? (
                              <div className="w-8 h-8 rounded-2xl bg-gradient-to-br from-[#714B67] to-[#4A2B42] text-white flex items-center justify-center text-xs shrink-0 shadow-md font-bold ring-2 ring-[#714B67]/20 mt-0.5">
                                🏢
                              </div>
                            ) : (
                              <div className="w-8 h-8 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 border border-slate-300 text-slate-700 flex items-center justify-center text-xs shrink-0 shadow-2xs mt-0.5">
                                🕵️
                              </div>
                            )}

                            {/* Message Box */}
                            <div className="space-y-1.5 max-w-[88%]">
                              <div className="flex flex-wrap items-center gap-2 text-[11px]">
                                <span className={`font-bold ${isOfficialMsg ? "text-[#714B67]" : "text-slate-800"}`}>
                                  {msg.senderName || (isOfficialMsg ? "Official HR Redressal" : "Anonymous Colleague")}
                                </span>

                                {isOfficialMsg ? (
                                  <span className="text-[9px] font-bold text-purple-700 bg-purple-100 px-2 py-0.2 rounded-full border border-purple-200 flex items-center gap-1">
                                    <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" /> Official Redressal
                                  </span>
                                ) : (
                                  <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.2 rounded-full border border-emerald-200">
                                    Verified Employee
                                  </span>
                                )}

                                <span className="text-[10px] text-slate-400 font-mono">
                                  {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "Just now"}
                                </span>
                              </div>

                              <div className={`p-3.5 rounded-2xl rounded-tl-xs text-xs font-medium leading-relaxed whitespace-pre-wrap ${
                                isOfficialMsg
                                  ? "bg-gradient-to-r from-purple-50 via-[#714B67]/5 to-transparent border border-[#714B67]/30 text-slate-900 shadow-xs"
                                  : "bg-white border border-slate-200 text-slate-850 shadow-2xs"
                              }`}>
                                {msg.message}
                              </div>

                              {/* Interactive Emoji Reactions Bar */}
                              <div className="flex items-center gap-1.5 pt-0.5">
                                {["👍", "💡", "🙌", "❤️"].map(emoji => {
                                  const count = msgReactions[emoji] || 0;
                                  const isMine = !!userReacted[`${msgId}_${emoji}`];
                                  return (
                                    <button
                                      key={emoji}
                                      onClick={() => toggleReaction(msgId, emoji)}
                                      className={`px-2 py-0.5 rounded-lg text-[11px] border transition-all cursor-pointer flex items-center gap-1 ${
                                        isMine
                                          ? "bg-[#714B67]/15 border-[#714B67]/50 text-[#714B67] font-black shadow-2xs scale-105 ring-1 ring-[#714B67]/20"
                                          : count > 0
                                            ? "bg-slate-100 border-slate-300 text-slate-700 font-bold"
                                            : "bg-white/80 hover:bg-slate-100 border-slate-200 text-slate-500 opacity-60 hover:opacity-100"
                                      }`}
                                    >
                                      <span>{emoji}</span>
                                      {count > 0 && <span className="font-mono text-[10px]">{count}</span>}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>

              {/* Bottom Sticky Interactive Chat Composer */}
              <div className="p-3.5 sm:p-4 border-t border-slate-100 bg-white dark:bg-slate-900 space-y-2.5">
                {/* Quick Suggestion Chips */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-[11px]">
                  <span className="text-[10px] font-mono text-slate-400 uppercase font-black tracking-wider">Quick:</span>
                  {[
                    "⚡ Need an update on this",
                    "✅ Issue is resolved, thank you!",
                    "🏢 Checked with facility team",
                    "🙏 Follow-up requested"
                  ].map(prompt => (
                    <button
                      key={prompt}
                      onClick={() => setReplyText(prompt)}
                      className="px-2.5 py-0.5 rounded-lg bg-slate-50 hover:bg-[#714B67]/10 border border-slate-200 hover:border-[#714B67]/30 text-slate-600 hover:text-[#714B67] font-medium whitespace-nowrap cursor-pointer transition-all text-[11px]"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>

                {/* Input row */}
                <div className="flex items-end gap-2 bg-slate-50 border border-slate-200 rounded-2xl p-2 focus-within:ring-2 focus-within:ring-[#714B67]/20 focus-within:border-[#714B67] focus-within:bg-white transition-all shadow-2xs">
                  <textarea
                    rows={2}
                    placeholder={isOfficialResponse ? "Type official resolution or leadership response..." : "Write your anonymous comment or follow-up note..."}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendReply();
                      }
                    }}
                    className="w-full bg-transparent p-1.5 text-xs font-medium text-slate-900 focus:outline-none placeholder:text-slate-400 resize-none leading-relaxed"
                  />

                  <div className="flex flex-col sm:flex-row items-center gap-2 shrink-0">
                    <button
                      onClick={handleSendReply}
                      disabled={submitting || !replyText.trim()}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#714B67] to-[#4A2B42] hover:from-[#5F3F56] hover:to-[#381F31] text-white text-xs font-black transition-all shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-40 active:scale-[0.98]"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{submitting ? "Sending..." : "Send"}</span>
                    </button>
                  </div>
                </div>

                {/* Optional HR / Leadership Settings Bar */}
                {isHrOrAdmin && (
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
                    <label className="flex items-center gap-1.5 text-slate-700 font-bold cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isOfficialResponse}
                        onChange={(e) => setIsOfficialResponse(e.target.checked)}
                        className="rounded text-[#714B67] focus:ring-[#714B67] w-3.5 h-3.5"
                      />
                      <span>Post as Official HR Response</span>
                    </label>

                    {isOfficialResponse && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold uppercase text-slate-400 font-mono">Update Status:</span>
                        <select
                          value={replyStatus}
                          onChange={(e) => setReplyStatus(e.target.value)}
                          className="bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs font-bold text-slate-850 focus:outline-none focus:ring-1 focus:ring-[#714B67]"
                        >
                          <option value="Open">Open</option>
                          <option value="In-Progress">In-Progress</option>
                          <option value="Resolved">Resolved</option>
                        </select>
                      </div>
                    )}
                  </div>
                )}

              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-3">
              <div className="w-14 h-14 rounded-3xl bg-[#714B67]/10 text-[#714B67] flex items-center justify-center border border-[#714B67]/20 shadow-xs">
                <MessageSquare className="w-7 h-7" />
              </div>
              <h3 className="text-sm font-black text-slate-800">Select a Problem Thread</h3>
              <p className="text-xs text-slate-400 max-w-xs">
                Click any ticket from the left panel to open the interactive live discussion.
              </p>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}

export function SystemRiskAlerts({ toggleModal, triggerToast, riskAlertList, onResolveAlert }: { toggleModal?: any, triggerToast: (msg: string) => void, riskAlertList?: any[], onResolveAlert?: (id: string) => void }) {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [selectedAlert, setSelectedAlert] = useState<any>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Resolution Form State
  const [resolutionStatus, setResolutionStatus] = useState("Open");

  // Create Form State
  const [createForm, setCreateForm] = useState({
    source: "High-risk candidate",
    level: "Medium",
    title: "",
    targetEntity: "",
    description: "",
    mitigationAction: ""
  });

  const loadAlerts = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/alerts");
      const data = await res.json();
      if (data.success) {
        setAlerts(data.data);
        if (!selectedAlert && !isCreating && data.data.length > 0) {
          handleSelectAlert(data.data[0]);
        }
      }
    } catch (err) {
      triggerToast("Failed to load risk alerts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAlerts();
  }, []);

  const handleSelectAlert = (alert: any) => {
    setIsCreating(false);
    setSelectedAlert(alert);
    setResolutionStatus(alert.status || "Open");
  };

  const handleCreateNew = () => {
    setSelectedAlert(null);
    setIsCreating(true);
    setCreateForm({
      source: "High-risk candidate",
      level: "Medium",
      title: "",
      targetEntity: "",
      description: "",
      mitigationAction: ""
    });
  };

  const handleResolveAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAlert) return;

    try {
      setSubmitting(true);
      const res = await fetch("/api/alerts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          alertId: selectedAlert.id,
          status: resolutionStatus
        })
      });
      const data = await res.json();
      if (data.success) {
        triggerToast(`Alert RA-${selectedAlert.id.slice(-4).toUpperCase()} marked as ${resolutionStatus}`);
        loadAlerts();
      } else {
        triggerToast("Error: " + data.error);
      }
    } catch (err) {
      triggerToast("Failed to update alert");
    } finally {
      setSubmitting(false);
    }
  };

  const handleTriggerAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.title.trim()) {
      triggerToast("Risk Title / Summary is required!");
      return;
    }
    if (!createForm.targetEntity.trim()) {
      triggerToast("Target Entity / Employee / Dept is required!");
      return;
    }
    if (!createForm.description.trim()) {
      triggerToast("Risk Description & Evidence is required!");
      return;
    }

    const formattedDescription = `📌 RISK TITLE: ${createForm.title.trim()}\n🎯 TARGET ENTITY / DEPT: ${createForm.targetEntity.trim()}\n\n📝 DESCRIPTION & EVIDENCE:\n${createForm.description.trim()}${createForm.mitigationAction.trim() ? `\n\n🛡️ SUGGESTED MITIGATION:\n${createForm.mitigationAction.trim()}` : ""}`;

    try {
      setSubmitting(true);
      const res = await fetch("/api/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: createForm.source,
          level: createForm.level,
          description: formattedDescription
        })
      });
      const data = await res.json();
      if (data.success) {
        triggerToast("New Risk Alert broadcasted successfully!");
        setIsCreating(false);
        await loadAlerts();
        handleSelectAlert(data.data);
      } else {
        triggerToast("Error: " + data.error);
      }
    } catch (err) {
      triggerToast("Failed to trigger alert");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredAlerts = alerts.filter(a =>
    a.source?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.id.slice(-4).toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-fadeIn text-slate-800">

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-black text-slate-800">Enterprise Risk & Alerts Management</h1>
          <p className="text-xs text-slate-500 mt-1">Automatic vetting triggers and manual compliance risk logs</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleCreateNew}
            className="bg-rose-600 hover:bg-rose-700 px-4 py-2 rounded-lg text-xs font-bold text-white transition-all shadow-sm flex items-center gap-1.5"
          >
            <ShieldAlert className="w-4 h-4" /> Trigger Alert
          </button>
          <button
            onClick={loadAlerts}
            disabled={loading}
            className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 transition duration-150 shrink-0"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

        {/* Left Side: Alert List */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-4 flex flex-col h-[750px] shadow-sm">
          <h3 className="text-xs font-black tracking-widest text-slate-400 uppercase font-mono mb-3">Active Risk Logs</h3>

          <div className="relative mb-3">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by ID or Category..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-4 py-2 text-xs font-semibold focus:outline-none focus:border-rose-400 text-slate-800"
            />
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
            {loading ? (
              <div className="text-center py-10 font-bold text-slate-400 text-[10px] animate-pulse">Loading alerts...</div>
            ) : filteredAlerts.length === 0 ? (
              <div className="text-center py-10 text-slate-400 font-bold text-[10px]">No alerts found</div>
            ) : (
              filteredAlerts.map((alert, i) => {
                const isSelected = selectedAlert && selectedAlert.id === alert.id;

                return (
                  <button
                    key={i}
                    onClick={() => handleSelectAlert(alert)}
                    className={`w-full text-left p-3 rounded-lg border transition-all flex flex-col gap-2 ${isSelected
                      ? "bg-rose-50/50 border-rose-200 shadow-sm"
                      : "bg-white border-slate-100 hover:border-slate-300 hover:bg-slate-50/50"
                      }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-slate-800 text-xs truncate flex items-center gap-1.5">
                        <span className="text-[10px] font-mono text-slate-400">RA-{alert.id.slice(-4).toUpperCase()}</span>
                        <span className="truncate max-w-[140px]">{alert.source}</span>
                      </div>
                      {(alert.level === 'High' || alert.level === 'Critical') && <AlertCircle className="w-4 h-4 text-rose-500" />}
                    </div>
                    <div className="flex items-center justify-between mt-1 text-[10px] font-mono">
                      <span className={`font-bold px-1.5 py-0.5 rounded ${alert.level === 'Critical' ? 'bg-rose-600 text-white' : alert.level === 'High' ? 'bg-rose-100 text-rose-600' : alert.level === 'Medium' ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'}`}>
                        {alert.level} Risk
                      </span>
                      <span className={`font-bold px-1.5 py-0.5 rounded ${alert.status === 'Resolved' ? 'bg-emerald-50 text-emerald-600' : alert.status === 'Investigating' ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-600'}`}>
                        {alert.status}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Side: Alert Workspace */}
        <div className="lg:col-span-8">
          {isCreating ? (
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col h-[750px]">
              <div className="flex justify-between items-start gap-4 pb-4 border-b border-slate-150 shrink-0">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-black text-slate-850 flex items-center gap-2">
                      <ShieldAlert className="w-5 h-5 text-rose-600 animate-pulse" />
                      Trigger System Risk Alert
                    </h2>
                    <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-rose-50 text-rose-600 border border-rose-200 font-mono">
                      Mandatory Risk Log
                    </span>
                  </div>
                  <p className="text-slate-500 text-[10px] mt-1.5 font-medium">Log an anomaly, fraud, or compliance risk for immediate investigation by HR & Leadership.</p>
                </div>
                {alerts.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreating(false);
                      if (alerts[0]) setSelectedAlert(alerts[0]);
                    }}
                    className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 text-xs font-bold transition-all border border-slate-200"
                  >
                    ✕ Cancel
                  </button>
                )}
              </div>

              <div className="flex-1 overflow-y-auto py-5 pr-2 scrollbar-thin">
                <form onSubmit={handleTriggerAlert} className="space-y-5">

                  {/* Row 1: Category & Severity */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-[10px] uppercase font-black text-slate-500 font-mono tracking-wider mb-1.5">
                        Risk Category <span className="text-rose-600 font-black">*</span>
                      </label>
                      <select
                        required
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs font-bold text-slate-850 focus:outline-none focus:ring-1 focus:ring-rose-500 focus:bg-white transition-all"
                        value={createForm.source}
                        onChange={e => setCreateForm({ ...createForm, source: e.target.value })}
                      >
                        <option value="High-risk candidate">1. High-risk candidate</option>
                        <option value="Fraud risk">2. Fraud risk / Financial anomaly</option>
                        <option value="Payment diversion">3. Payment diversion</option>
                        <option value="Data leakage">4. Data leakage / Confidentiality breach</option>
                        <option value="Groupism">5. Groupism & Workplace misconduct</option>
                        <option value="Client diversion">6. Client diversion / PO Poaching</option>
                        <option value="Emotional instability">7. Emotional instability / Behavioral concern</option>
                        <option value="Leadership complaint">8. Leadership complaint</option>
                        <option value="Vendor risk">9. Vendor risk</option>
                        <option value="Territory risk">10. Territory & Field visit risk</option>
                      </select>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-1.5">
                        <label className="block text-[10px] uppercase font-black text-slate-500 font-mono tracking-wider">
                          Severity Level <span className="text-rose-600 font-black">*</span>
                        </label>
                        <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded border ${createForm.level === "Critical" ? "bg-rose-600 text-white border-rose-700 animate-pulse" :
                          createForm.level === "High" ? "bg-rose-100 text-rose-700 border-rose-300" :
                            createForm.level === "Medium" ? "bg-amber-100 text-amber-700 border-amber-300" :
                              "bg-emerald-100 text-emerald-700 border-emerald-300"
                          }`}>
                          {createForm.level} Risk
                        </span>
                      </div>
                      <select
                        required
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs font-bold text-slate-850 focus:outline-none focus:ring-1 focus:ring-rose-500 focus:bg-white transition-all"
                        value={createForm.level}
                        onChange={e => setCreateForm({ ...createForm, level: e.target.value })}
                      >
                        <option value="Low">Low Risk (Minor Flag)</option>
                        <option value="Medium">Medium Risk (Requires Review)</option>
                        <option value="High">High Risk (Immediate Action Required)</option>
                        <option value="Critical">Critical (Emergency Containment)</option>
                      </select>
                    </div>
                  </div>

                  {/* Row 2: Risk Title & Target Entity */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-[10px] uppercase font-black text-slate-500 font-mono tracking-wider mb-1.5">
                        Risk Title / Headline <span className="text-rose-600 font-black">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Discrepancy in experience certificate & bank statement"
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs font-bold text-slate-850 focus:outline-none focus:ring-1 focus:ring-rose-500 focus:bg-white transition-all"
                        value={createForm.title}
                        onChange={e => setCreateForm({ ...createForm, title: e.target.value })}
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase font-black text-slate-500 font-mono tracking-wider mb-1.5">
                        Target Entity / Employee / Dept <span className="text-rose-600 font-black">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Employee ID / Candidate Name / Sales Dept / Vendor Name"
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs font-bold text-slate-850 focus:outline-none focus:ring-1 focus:ring-rose-500 focus:bg-white transition-all"
                        value={createForm.targetEntity}
                        onChange={e => setCreateForm({ ...createForm, targetEntity: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Row 3: Description & Evidence */}
                  <div>
                    <label className="block text-[10px] uppercase font-black text-slate-500 font-mono tracking-wider mb-1.5">
                      Detailed Risk Description &amp; Evidence <span className="text-rose-600 font-black">*</span>
                    </label>
                    <textarea
                      required
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg p-3 text-xs font-medium text-slate-800 h-28 focus:outline-none focus:ring-1 focus:ring-rose-500 focus:bg-white transition-all leading-relaxed"
                      placeholder="Detail the anomaly, incident timeline, system logs, discrepancies or evidence links..."
                      value={createForm.description}
                      onChange={e => setCreateForm({ ...createForm, description: e.target.value })}
                    />
                  </div>

                  {/* Row 4: Suggested Mitigation Action */}
                  <div>
                    <label className="block text-[10px] uppercase font-black text-slate-500 font-mono tracking-wider mb-1.5">
                      Immediate Containment / Suggested Action <span className="text-slate-400 font-normal">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Hold salary release, initiate background re-verification, freeze system access"
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs font-semibold text-slate-850 focus:outline-none focus:ring-1 focus:ring-rose-500 focus:bg-white transition-all"
                      value={createForm.mitigationAction}
                      onChange={e => setCreateForm({ ...createForm, mitigationAction: e.target.value })}
                    />
                  </div>

                  {/* Submit Button */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full bg-rose-600 hover:bg-rose-700 text-white py-3.5 rounded-xl text-xs font-black tracking-widest uppercase transition-all shadow-md flex items-center justify-center gap-2 active:scale-[0.99] disabled:opacity-50"
                    >
                      <ShieldAlert className="w-4 h-4" /> {submitting ? "Broadcasting Risk Alert..." : "Broadcast Risk Alert"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          ) : selectedAlert ? (
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col h-[750px]">

              <div className="flex justify-between items-start gap-4 pb-4 border-b border-slate-150 shrink-0">
                <div>
                  <h2 className="text-lg font-black text-slate-850 flex items-center gap-2">
                    <ShieldAlert className="w-5 h-5 text-rose-600" />
                    Risk Alert — RA-{selectedAlert.id.slice(-4).toUpperCase()}
                  </h2>
                  <div className="text-slate-500 text-[10px] mt-1.5 flex gap-4">
                    <span>Triggered By: <strong className="text-slate-700">{selectedAlert.triggeredBy?.name || "System Automation"}</strong></span>
                    <span>Date: <strong className="text-slate-700">{new Date(selectedAlert.createdAt).toLocaleString()}</strong></span>
                  </div>
                </div>

                <div className={`px-4 py-2 ${selectedAlert.level === 'Critical' ? 'bg-rose-600 text-white' : selectedAlert.level === 'High' ? 'bg-rose-100 text-rose-600' : 'bg-slate-50 text-slate-600'} border border-slate-200 rounded-lg text-center min-w-28`}>
                  <span className={`text-[9px] uppercase font-black tracking-widest block mb-0.5 ${selectedAlert.level === 'Critical' ? 'text-rose-100' : 'text-slate-500'}`}>Severity Level</span>
                  <span className="text-xs font-bold">
                    {selectedAlert.level} Risk
                  </span>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto py-5 pr-2 scrollbar-thin">
                <div className="space-y-8">

                  <div>
                    <h4 className="text-[10px] font-black tracking-widest text-slate-400 uppercase font-mono mb-4 border-b border-slate-100 pb-2">Anomaly Details</h4>

                    <div className="mb-4">
                      <span className="text-[10px] uppercase font-black text-slate-500 font-mono tracking-wider">Risk Category</span>
                      <div className="mt-1.5 p-2.5 bg-slate-50 border border-slate-200 rounded text-xs font-bold text-slate-800">
                        {selectedAlert.source}
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-black text-slate-500 font-mono tracking-wider">Flagged Details & Evidence</span>
                      <div className="mt-1.5 p-4 bg-rose-50/30 border border-rose-100 rounded text-xs font-medium text-slate-800 leading-relaxed whitespace-pre-wrap min-h-[100px]">
                        {selectedAlert.description}
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 shadow-sm">
                    <h4 className="text-[10px] font-black tracking-widest text-slate-400 uppercase font-mono mb-4 border-b border-slate-200 pb-2">Investigation & Vetting</h4>

                    <form onSubmit={handleResolveAlert} className="space-y-5">
                      <div>
                        <label className="text-[10px] uppercase font-black text-slate-500 font-mono tracking-wider">Update Status</label>
                        <select className="w-full bg-white border border-slate-300 rounded p-2.5 text-xs font-bold text-slate-900 mt-1.5 focus:outline-none focus:border-rose-400"
                          value={resolutionStatus} onChange={e => setResolutionStatus(e.target.value)}>
                          <option value="Open">Open (Pending Review)</option>
                          <option value="Investigating">Investigating (Active)</option>
                          <option value="Resolved">Resolved (Cleared/Mitigated)</option>
                        </select>
                      </div>

                      <button
                        type="submit"
                        disabled={submitting}
                        className="w-full bg-slate-800 hover:bg-slate-900 text-white py-3.5 rounded-xl text-xs font-black tracking-widest uppercase transition-all shadow-md flex items-center justify-center gap-2 mt-2"
                      >
                        <CheckCircle className="w-4 h-4" /> Save Vetting Status
                      </button>
                    </form>
                  </div>

                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-32 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center items-center h-[750px]">
              <ShieldAlert className="w-12 h-12 text-slate-300 mb-4" />
              <h4 className="text-sm font-black text-slate-800 uppercase tracking-wide">No Risk Alert Selected</h4>
              <p className="text-xs text-slate-400 mt-2 max-w-xs leading-normal">
                Select an alert from the left to investigate, or click "Trigger Alert" to log a new risk manually.
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

export function ExitSeparation({ sessionUser, triggerToast }: { sessionUser?: any; triggerToast: (msg: string) => void; }) {
  const [employees, setEmployees] = useState<any[]>([]);
  const [exits, setExits] = useState<any[]>([]);
  const [form13Records, setForm13Records] = useState<any[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);

  const userRole = (sessionUser?.role || "Employee").toLowerCase();
  const isSubmitter = Boolean(selectedRecord && (selectedRecord.submittedBy === sessionUser?.id || selectedRecord.name === sessionUser?.name));
  const isAssignedManager = Boolean(
    selectedRecord && (
      selectedRecord.managerId === sessionUser?.id ||
      (selectedRecord.managerName && sessionUser?.name && selectedRecord.managerName.toLowerCase().includes(sessionUser.name.toLowerCase())) ||
      (selectedRecord.managerEmail && sessionUser?.email && selectedRecord.managerEmail.toLowerCase() === sessionUser.email.toLowerCase())
    )
  );
  const isManagerOrAbove = isAssignedManager || (!isSubmitter && (
    sessionUser?.role !== "Employee" ||
    userRole.includes("manager") ||
    userRole.includes("owner") ||
    userRole.includes("director") ||
    userRole.includes("hr") ||
    userRole.includes("admin") ||
    userRole.includes("head")
  ));
  const isOwnerOrHR = !isSubmitter && (
    userRole.includes("owner") ||
    userRole.includes("director") ||
    userRole.includes("hr") ||
    userRole.includes("admin") ||
    userRole.includes("head")
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Manager Decision Form State
  const [managerDecision, setManagerDecision] = useState({
    exitType: "Direct Exit" as "Direct Exit" | "Notice Period",
    noticePeriodDays: 30,
    lastWorkingDay: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    remarks: ""
  });

  // Owner Decision Form State
  const [ownerDecision, setOwnerDecision] = useState({
    remarks: ""
  });

  // HR Decision Form State
  const [hrDecision, setHrDecision] = useState({
    remarks: "",
    salaryStatus: "Pending" as "Pending" | "Paid / Released" | "Included in Full & Final (F&F)",
    pendingDuesRemarks: "",
    assetReturn: false,
    accessRevoke: false,
    handover: false,
    finalSettlement: false
  });

  // Full Edit Form State (For Owner / Director / HR)
  const [showFullEditModal, setShowFullEditModal] = useState(false);
  const [fullEditForm, setFullEditForm] = useState({
    name: "",
    category: "Employee",
    resignationDate: "",
    lastWorkingDay: "",
    handoverTo: "",
    exitReason: "",
    exitFeedback: "",
    salaryStatus: "Pending",
    pendingDuesRemarks: "",
    assetReturn: false,
    accessRevoke: false,
    handover: false,
    finalSettlement: false,
    managerRemarks: "",
    ownerRemarks: "",
    hrRemarks: "",
    approvalStage: "Pending Manager",
    exitType: "Direct Exit",
    noticePeriodDays: 30
  });

  // FORM-13 State
  const [showForm13, setShowForm13] = useState(false);
  const [form13, setForm13] = useState({
    name: sessionUser?.name || "",
    category: "Employee" as "Employee" | "Associate" | "Vendor",
    resignationDate: new Date().toISOString().split("T")[0],
    lastWorkingDay: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    handoverTo: "",
    department: "",
    exitReason: "",
    assetReturn: false,
    accessRevoke: false,
    handover: false,
    finalSettlement: false,
    dataAudit: false,
    clientTransfer: false,
    ndaReminder: false,
    postExitWatch: false,
    finalSettlementStatus: "Pending Audit",
    exitFeedback: "",
    postExitRisk: "Low"
  });

  useEffect(() => {
    if (sessionUser) {
      setForm13(prev => ({
        ...prev,
        name: sessionUser.name || prev.name,
        category: (sessionUser.category || "Employee") as any,
        department: sessionUser.department || sessionUser.role || prev.department
      }));
    }
  }, [sessionUser]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [empRes, exitRes, form13Res] = await Promise.all([
        fetch("/api/employees"),
        fetch("/api/exits"),
        fetch("/api/reports/form13")
      ]);

      const empData = await empRes.json();
      const exitData = await exitRes.json();
      const form13Data = await form13Res.json();

      if (empData.success) {
        setEmployees(empData.data || []);
        if (sessionUser) {
          const myEmpProfile = (empData.data || []).find((e: any) => e.id === sessionUser.id || e.email === sessionUser.email);
          if (myEmpProfile) {
            setForm13(prev => ({
              ...prev,
              department: myEmpProfile.department || myEmpProfile.role || prev.department
            }));
          }
        }
      }
      if (exitData.success) setExits(exitData.data || []);
      if (form13Data.success) {
        const recordsList = form13Data.data || [];
        setForm13Records(recordsList);
        if (recordsList.length > 0) {
          setSelectedRecord((prevRec: any) => {
            const fresh = prevRec ? recordsList.find((r: any) => r.id === prevRec.id) : null;
            const recordToUse = fresh || recordsList[0];
            // Update decision form values
            setManagerDecision({
              exitType: recordToUse.exitType || "Direct Exit",
              noticePeriodDays: recordToUse.noticePeriodDays || 30,
              lastWorkingDay: recordToUse.lastWorkingDay || new Date().toISOString().split("T")[0],
              remarks: recordToUse.managerRemarks || ""
            });
            setOwnerDecision({
              remarks: recordToUse.ownerRemarks || ""
            });
            setHrDecision({
              remarks: recordToUse.hrRemarks || "",
              salaryStatus: recordToUse.salaryStatus || "Pending",
              pendingDuesRemarks: recordToUse.pendingDuesRemarks || "",
              assetReturn: recordToUse.assetReturn || false,
              accessRevoke: recordToUse.accessRevoke || false,
              handover: recordToUse.handover || false,
              finalSettlement: recordToUse.finalSettlement || false
            });
            return recordToUse;
          });
        }
      }
    } catch (err) {
      triggerToast("Failed to load exit separation data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSelectRecord = (record: any) => {
    setSelectedRecord(record);
    const emp = employees.find((e: any) => e.id === record.submittedBy || e.name === record.name);
    setSelectedEmployee(emp || { name: record.name, email: record.submittedByUser?.email || "N/A", role: record.submittedByUser?.role || "Staff" });

    // Pre-populate forms
    setManagerDecision({
      exitType: record.exitType || "Direct Exit",
      noticePeriodDays: record.noticePeriodDays || 30,
      lastWorkingDay: record.lastWorkingDay || new Date().toISOString().split("T")[0],
      remarks: record.managerRemarks || ""
    });

    setOwnerDecision({
      remarks: record.ownerRemarks || ""
    });

    setHrDecision({
      remarks: record.hrRemarks || "",
      salaryStatus: record.salaryStatus || "Pending",
      pendingDuesRemarks: record.pendingDuesRemarks || "",
      assetReturn: record.assetReturn || false,
      accessRevoke: record.accessRevoke || false,
      handover: record.handover || false,
      finalSettlement: record.finalSettlement || false
    });
  };

  const handleOpenFullEditModal = () => {
    if (!selectedRecord) return;
    setFullEditForm({
      name: selectedRecord.name || "",
      category: selectedRecord.category || "Employee",
      resignationDate: selectedRecord.resignationDate || "",
      lastWorkingDay: selectedRecord.lastWorkingDay || "",
      handoverTo: selectedRecord.handoverTo || "",
      exitReason: selectedRecord.exitReason || "",
      exitFeedback: selectedRecord.exitFeedback || "",
      salaryStatus: selectedRecord.salaryStatus || "Pending",
      pendingDuesRemarks: selectedRecord.pendingDuesRemarks || "",
      assetReturn: !!selectedRecord.assetReturn,
      accessRevoke: !!selectedRecord.accessRevoke,
      handover: !!selectedRecord.handover,
      finalSettlement: !!selectedRecord.finalSettlement,
      managerRemarks: selectedRecord.managerRemarks || "",
      ownerRemarks: selectedRecord.ownerRemarks || "",
      hrRemarks: selectedRecord.hrRemarks || "",
      approvalStage: selectedRecord.approvalStage || "Pending Manager",
      exitType: selectedRecord.exitType || "Direct Exit",
      noticePeriodDays: selectedRecord.noticePeriodDays || 30
    });
    setShowFullEditModal(true);
  };

  const handleSaveFullEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecord) return;
    try {
      setSubmitting(true);
      const res = await fetch("/api/reports/form13", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          formId: selectedRecord.id,
          action: "full_edit",
          ...fullEditForm
        })
      });
      const data = await res.json();
      if (data.success) {
        triggerToast("Exit Clearance details updated successfully!");
        setShowFullEditModal(false);
        if (data.data) {
          handleSelectRecord(data.data);
        }
        await loadData();
      } else {
        triggerToast("Error updating exit details: " + data.error);
      }
    } catch (err: any) {
      triggerToast("Failed to save exit clearance edits: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleForm13Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const res = await fetch("/api/reports/form13", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form13)
      });
      const data = await res.json();
      if (data.success) {
        triggerToast("FORM-13 Exit Request Submitted! Notification email sent to Department Reporting Manager.");
        setShowForm13(false);
        setForm13({
          name: sessionUser?.name || "",
          category: "Employee",
          resignationDate: new Date().toISOString().split("T")[0],
          lastWorkingDay: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
          handoverTo: "",
          department: "",
          exitReason: "",
          assetReturn: false,
          accessRevoke: false,
          handover: false,
          finalSettlement: false,
          dataAudit: false,
          clientTransfer: false,
          ndaReminder: false,
          postExitWatch: false,
          finalSettlementStatus: "Pending Audit",
          exitFeedback: "",
          postExitRisk: "Low"
        });
        loadData();
      } else {
        triggerToast("Failed to submit FORM-13: " + data.error);
      }
    } catch (err) {
      triggerToast("Error submitting FORM-13");
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Manager Decision (Stage 1)
  const handleProcessManagerDecision = async (decision: "approve" | "reject") => {
    if (!selectedRecord) return;
    try {
      setSubmitting(true);
      const res = await fetch("/api/reports/form13", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          formId: selectedRecord.id,
          action: "manager_decision",
          decision,
          exitType: managerDecision.exitType,
          noticePeriodDays: managerDecision.noticePeriodDays,
          lastWorkingDay: managerDecision.lastWorkingDay,
          remarks: managerDecision.remarks
        })
      });
      const data = await res.json();
      if (data.success) {
        triggerToast(decision === "approve" ? "Approved by Manager! Forwarded to Owner for Executive Approval & Notification Email Sent to Employee." : "Exit request rejected by Manager & Notification Email Sent to Employee.");
        if (data.data) {
          handleSelectRecord(data.data);
        }
        await loadData();
      } else {
        triggerToast("Error: " + data.error);
      }
    } catch (err) {
      triggerToast("Failed to process manager decision");
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Owner Decision (Stage 2)
  const handleProcessOwnerDecision = async (decision: "approve" | "reject") => {
    if (!selectedRecord) return;
    try {
      setSubmitting(true);
      const res = await fetch("/api/reports/form13", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          formId: selectedRecord.id,
          action: "owner_decision",
          decision,
          remarks: ownerDecision.remarks
        })
      });
      const data = await res.json();
      if (data.success) {
        triggerToast(decision === "approve" ? "Approved by Executive Management! Forwarded to HR for Final Clearance & Notification Email Sent to Employee." : "Exit request rejected by Management & Notification Email Sent to Employee.");
        if (data.data) {
          handleSelectRecord(data.data);
        }
        await loadData();
      } else {
        triggerToast("Error: " + data.error);
      }
    } catch (err) {
      triggerToast("Failed to process owner decision");
    } finally {
      setSubmitting(false);
    }
  };

  // Submit HR Decision (Stage 3)
  const handleProcessHrDecision = async (decision: "approve" | "reject") => {
    if (!selectedRecord) return;
    try {
      setSubmitting(true);
      const res = await fetch("/api/reports/form13", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          formId: selectedRecord.id,
          action: "hr_decision",
          decision,
          remarks: hrDecision.remarks,
          salaryStatus: hrDecision.salaryStatus,
          pendingDuesRemarks: hrDecision.pendingDuesRemarks,
          assetReturn: hrDecision.assetReturn,
          accessRevoke: hrDecision.accessRevoke,
          handover: hrDecision.handover,
          finalSettlement: hrDecision.finalSettlement
        })
      });
      const data = await res.json();
      if (data.success) {
        triggerToast(decision === "approve" ? "Exit Clearance Fully Approved & Completed by HR! Notification Email Sent to Employee." : "Exit clearance rejected by HR & Notification Email Sent to Employee.");
        if (data.data) {
          handleSelectRecord(data.data);
        }
        await loadData();
      } else {
        triggerToast("Error: " + data.error);
      }
    } catch (err) {
      triggerToast("Failed to process HR decision");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredRecords = form13Records.filter(rec =>
    rec.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    rec.submittedByUser?.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-fadeIn text-slate-800">

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-4 border-slate-200">
        <div>
          <h1 className="text-xl font-black text-slate-800 flex items-center gap-2">
            Exit & Separation Clearance
          </h1>
          <p className="text-xs text-slate-500 mt-1">Multi-Stage Exit Approval Workflow (Manager → Owner → HR) with Automated Email Alerts</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowForm13(true)}
            className="bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg text-xs font-bold text-white transition-all shadow-sm flex items-center gap-1.5"
          >
            <FileText className="w-4 h-4" />FORM-13 (Exit)
          </button>
          <button
            onClick={loadData}
            disabled={loading}
            className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 transition duration-150 shrink-0 shadow-sm"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

        {/* Left Side: Exit Requests Directory */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-4 flex flex-col h-[750px] shadow-sm">
          <h3 className="text-xs font-black tracking-widest text-[#714B67] uppercase font-mono mb-3">Exit Requests Directory</h3>

          <div className="relative mb-3">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by employee name..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-4 py-2 text-xs font-semibold focus:outline-none focus:border-[#714B67] text-slate-800"
            />
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
            {loading ? (
              <div className="text-center py-10 font-bold text-slate-400 text-[10px] animate-pulse">Loading exit requests...</div>
            ) : filteredRecords.length === 0 ? (
              <div className="text-center py-10 text-slate-400 font-bold text-[10px]">No exit clearance requests found</div>
            ) : (
              filteredRecords.map((rec, i) => {
                const isSelected = selectedRecord && selectedRecord.id === rec.id;
                const stage = rec.approvalStage || "Pending Manager";

                return (
                  <button
                    key={i}
                    onClick={() => handleSelectRecord(rec)}
                    className={`w-full text-left p-3 rounded-xl border transition-all flex flex-col gap-2 ${isSelected
                      ? "bg-indigo-50/50 border-indigo-600 shadow-sm"
                      : "bg-white border-slate-100 hover:border-slate-300 hover:bg-slate-50/50"
                      }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-slate-800 text-xs truncate flex items-center gap-2">
                        {rec.name}
                      </div>
                      <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${stage === "Approved" ? "bg-emerald-100 text-emerald-800" :
                        stage === "Rejected" ? "bg-rose-100 text-rose-800" :
                          stage === "Pending Manager" ? "bg-amber-100 text-amber-800" :
                            stage === "Pending Owner" ? "bg-blue-100 text-blue-800" : "bg-purple-100 text-purple-800"
                        }`}>
                        {stage}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-1 text-[10px] text-slate-500 font-mono">
                      <span className="truncate">{rec.submittedByUser?.email || "Staff"}</span>
                      <span className="font-bold text-slate-600">{rec.exitType || "Exit Requested"}</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Side: Exit Clearance Workspace & Multi-Stage Approvals */}
        <div className="lg:col-span-8">
          {selectedRecord ? (
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col h-[750px] overflow-y-auto">

              {/* Header Info */}
              <div className="flex justify-between items-start gap-4 pb-4 border-b border-slate-150 shrink-0">
                <div>
                  <h2 className="text-lg font-black text-slate-850 flex items-center gap-2">
                    Exit Clearance — {selectedRecord.name}
                  </h2>
                  <div className="text-slate-500 text-[10px] mt-1.5 flex flex-wrap gap-4 font-mono">
                    <span>Form ID: <strong className="text-slate-700">{selectedRecord.id}</strong></span>
                    <span>Submitter: <strong className="text-slate-700">{selectedRecord.submittedByUser?.email || "Employee"}</strong></span>
                    <span>Dept Manager: <strong className="text-slate-700">{selectedRecord.managerName || "Department Manager"}</strong></span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {isOwnerOrHR && (
                    <button
                      onClick={handleOpenFullEditModal}
                      className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs"
                    >
                      <Edit className="w-3.5 h-3.5" /> Edit Exit Form
                    </button>
                  )}
                  <div className={`px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-center min-w-32`}>
                    <span className="text-[9px] uppercase font-black tracking-widest text-slate-500 block mb-0.5">Approval Stage</span>
                    <span className={`text-xs font-bold ${selectedRecord.approvalStage === 'Approved' ? 'text-emerald-600' :
                      selectedRecord.approvalStage === 'Rejected' ? 'text-rose-600' : 'text-amber-600'
                      }`}>
                      {selectedRecord.approvalStage || "Pending Manager"}
                    </span>
                  </div>
                </div>
              </div>

              {/* 3-Stage Progress Timeline */}
              <div className="my-6 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-[#714B67] mb-3 font-mono">Multi-Stage Approval Pipeline</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-center text-xs font-bold">

                  {/* Stage 1 */}
                  <div className={`p-3 rounded-lg border flex flex-col items-center justify-center ${selectedRecord.managerApprovalStatus === 'Approved' ? 'bg-emerald-50 border-emerald-300 text-emerald-900' :
                    selectedRecord.managerApprovalStatus === 'Rejected' ? 'bg-rose-50 border-rose-300 text-rose-900' : 'bg-white border-amber-300 text-amber-900'
                    }`}>
                    <span className="text-[9px] uppercase tracking-wider text-slate-500 font-mono">Stage 1: Dept Manager</span>
                    <span className="mt-1 font-extrabold">{selectedRecord.managerApprovalStatus === 'Approved' ? `Approved (${selectedRecord.exitType || 'Direct Exit'})` : selectedRecord.managerApprovalStatus === 'Rejected' ? 'Rejected' : 'Pending Review'}</span>
                    {selectedRecord.exitType === 'Notice Period' && (
                      <span className="text-[10px] text-slate-600 font-normal mt-0.5">Notice: {selectedRecord.noticePeriodDays || 30} days (LWD: {selectedRecord.lastWorkingDay || 'N/A'})</span>
                    )}
                  </div>

                  {/* Stage 2 */}
                  <div className={`p-3 rounded-lg border flex flex-col items-center justify-center ${selectedRecord.ownerApprovalStatus === 'Approved' ? 'bg-emerald-50 border-emerald-300 text-emerald-900' :
                    selectedRecord.ownerApprovalStatus === 'Rejected' ? 'bg-rose-50 border-rose-300 text-rose-900' : 'bg-white border-slate-200 text-slate-600'
                    }`}>
                    <span className="text-[9px] uppercase tracking-wider text-slate-500 font-mono">Stage 2: Owner / Management</span>
                    <span className="mt-1 font-extrabold">{selectedRecord.ownerApprovalStatus === 'Approved' ? 'Executive Approved' : selectedRecord.ownerApprovalStatus === 'Rejected' ? 'Executive Rejected' : 'Pending Stage 1'}</span>
                  </div>

                  {/* Stage 3 */}
                  <div className={`p-3 rounded-lg border flex flex-col items-center justify-center ${selectedRecord.hrApprovalStatus === 'Approved' ? 'bg-emerald-50 border-emerald-300 text-emerald-900' :
                    selectedRecord.hrApprovalStatus === 'Rejected' ? 'bg-rose-50 border-rose-300 text-rose-900' : 'bg-white border-slate-200 text-slate-600'
                    }`}>
                    <span className="text-[9px] uppercase tracking-wider text-slate-500 font-mono">Stage 3: HR Final Clearance</span>
                    <span className="mt-1 font-extrabold">{selectedRecord.hrApprovalStatus === 'Approved' ? 'Fully Cleared' : selectedRecord.hrApprovalStatus === 'Rejected' ? 'Clearance Rejected' : 'Pending Stage 2'}</span>
                  </div>

                </div>
              </div>

              {/* Submitted Exit Application Details Card */}
              <div className="mb-6 bg-slate-50 border border-purple-200/80 rounded-xl p-4 space-y-3 shadow-2xs">
                <div className="flex items-center justify-between border-b border-purple-100 pb-2">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-[#714B67] font-mono flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-purple-700" /> Submitted Exit Application Details
                  </h4>
                  <span className="text-[9px] font-bold bg-purple-100 text-purple-800 px-2 py-0.5 rounded font-mono">
                    {selectedRecord.category || "Employee"}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-semibold text-slate-800">
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200/80 space-y-0.5 shadow-2xs">
                    <span className="text-[9px] font-black uppercase text-slate-400 block font-mono">Employee Name</span>
                    <span className="font-bold text-slate-900 text-xs block truncate">{selectedRecord.name}</span>
                  </div>

                  <div className="bg-white p-2.5 rounded-lg border border-slate-200/80 space-y-0.5 shadow-2xs">
                    <span className="text-[9px] font-black uppercase text-slate-400 block font-mono">Department / Role</span>
                    <span className="font-bold text-slate-900 text-xs block truncate">{selectedRecord.department || selectedRecord.submittedByUser?.role || "Staff"}</span>
                  </div>

                  <div className="bg-white p-2.5 rounded-lg border border-slate-200/80 space-y-0.5 shadow-2xs">
                    <span className="text-[9px] font-black uppercase text-slate-400 block font-mono">Resignation Date</span>
                    <span className="font-bold text-indigo-700 text-xs block">📅 {selectedRecord.resignationDate || "N/A"}</span>
                  </div>

                  <div className="bg-white p-2.5 rounded-lg border border-slate-200/80 space-y-0.5 shadow-2xs">
                    <span className="text-[9px] font-black uppercase text-slate-400 block font-mono">Proposed LWD</span>
                    <span className="font-bold text-purple-700 text-xs block">🗓️ {selectedRecord.lastWorkingDay || "N/A"}</span>
                  </div>

                  <div className="bg-white p-2.5 rounded-lg border border-slate-200/80 space-y-0.5 col-span-2 shadow-2xs">
                    <span className="text-[9px] font-black uppercase text-slate-400 block font-mono">Handover / KT Person</span>
                    <span className="font-bold text-slate-900 text-xs block truncate">👤 {selectedRecord.handoverTo || "Not Specified"}</span>
                  </div>

                  <div className="bg-white p-2.5 rounded-lg border border-slate-200/80 space-y-0.5 col-span-2 shadow-2xs">
                    <span className="text-[9px] font-black uppercase text-slate-400 block font-mono">Personal Contact / Email</span>
                    <span className="font-bold text-slate-900 text-xs block truncate">
                      📞 {selectedRecord.personalMobile || selectedRecord.submittedByUser?.mobile || selectedRecord.submittedByUser?.phone || "N/A"} | ✉️ {selectedRecord.personalEmail || selectedRecord.submittedByUser?.email || "N/A"}
                    </span>
                  </div>

                  <div className="bg-white p-2.5 rounded-lg border border-slate-200/80 space-y-0.5 col-span-2 shadow-2xs">
                    <span className="text-[9px] font-black uppercase text-slate-400 block font-mono">Salary Settlement Status</span>
                    <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-extrabold ${selectedRecord.salaryStatus === "Paid / Released" ? "bg-emerald-100 text-emerald-800" :
                      selectedRecord.salaryStatus === "Included in Full & Final (F&F)" ? "bg-blue-100 text-blue-800" :
                        "bg-amber-100 text-amber-800"
                      }`}>
                      {selectedRecord.salaryStatus || "Pending"}
                    </span>
                  </div>
                </div>

                {selectedRecord.pendingDuesRemarks && (
                  <div className="bg-amber-50/70 p-3 rounded-lg border border-amber-200 space-y-1 shadow-2xs text-amber-900">
                    <span className="text-[9px] font-black uppercase text-amber-700 block font-mono">⚠️ Pending Dues / Hold Items Details</span>
                    <p className="text-xs font-bold leading-normal">{selectedRecord.pendingDuesRemarks}</p>
                  </div>
                )}

                <div className="bg-white p-3 rounded-lg border border-slate-200/80 space-y-1 shadow-2xs">
                  <span className="text-[9px] font-black uppercase text-slate-400 block font-mono">Exit Reason & Remarks</span>
                  <p className="text-xs font-bold text-slate-800 leading-normal">{selectedRecord.exitReason || "N/A"}</p>
                  {selectedRecord.exitFeedback && (
                    <p className="text-[11px] font-medium text-slate-600 border-t border-slate-100 pt-1 mt-1">
                      <strong>Feedback:</strong> {selectedRecord.exitFeedback}
                    </p>
                  )}
                </div>
              </div>

              {/* COMPLETE APPROVAL AUDIT & REMARKS LOG CARD */}
              <div className="mb-6 bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3 shadow-2xs">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-[#714B67] font-mono flex items-center gap-1.5 border-b border-slate-200 pb-2">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> Complete Approval Audit & Remarks Log
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  {/* Stage 1: Department Reporting Manager Audit */}
                  <div className={`p-3 rounded-lg border bg-white ${selectedRecord.managerApprovalStatus === 'Approved' ? 'border-emerald-200 bg-emerald-50/20' :
                    selectedRecord.managerApprovalStatus === 'Rejected' ? 'border-rose-200 bg-rose-50/20' : 'border-slate-200'
                    }`}>
                    <span className="text-[9px] font-black uppercase text-slate-400 block font-mono">Stage 1: Dept Manager</span>
                    <div className="font-bold text-slate-900 mt-1">{selectedRecord.managerName || "Department Manager"}</div>
                    <div className={`text-[10px] font-bold mt-0.5 ${selectedRecord.managerApprovalStatus === 'Approved' ? 'text-emerald-700' :
                      selectedRecord.managerApprovalStatus === 'Rejected' ? 'text-rose-700' : 'text-amber-700'
                      }`}>
                      Status: {selectedRecord.managerApprovalStatus || "Pending"} {selectedRecord.exitType ? `(${selectedRecord.exitType})` : ""}
                    </div>
                    {selectedRecord.exitType === "Notice Period" && (
                      <div className="text-[9.5px] text-slate-600 mt-1 font-mono bg-slate-50 p-1.5 rounded border border-slate-100">
                        Notice: {selectedRecord.noticePeriodDays || 30} Days <br /> LWD: {selectedRecord.lastWorkingDay || "N/A"}
                      </div>
                    )}
                    {selectedRecord.managerRemarks ? (
                      <div className="text-[10.5px] text-slate-700 bg-slate-50 p-2 rounded mt-2 border border-slate-200/60 leading-tight">
                        <strong>Remarks:</strong> "{selectedRecord.managerRemarks}"
                      </div>
                    ) : null}
                  </div>

                  {/* Stage 2: Owner / Executive Management Audit */}
                  <div className={`p-3 rounded-lg border bg-white ${selectedRecord.ownerApprovalStatus === 'Approved' ? 'border-blue-200 bg-blue-50/20' :
                    selectedRecord.ownerApprovalStatus === 'Rejected' ? 'border-rose-200 bg-rose-50/20' : 'border-slate-200'
                    }`}>
                    <span className="text-[9px] font-black uppercase text-slate-400 block font-mono">Stage 2: Owner / Management</span>
                    <div className="font-bold text-slate-900 mt-1">Executive Board</div>
                    <div className={`text-[10px] font-bold mt-0.5 ${selectedRecord.ownerApprovalStatus === 'Approved' ? 'text-blue-700' :
                      selectedRecord.ownerApprovalStatus === 'Rejected' ? 'text-rose-700' : 'text-slate-500'
                      }`}>
                      Status: {selectedRecord.ownerApprovalStatus || "Pending"}
                    </div>
                    {selectedRecord.ownerRemarks ? (
                      <div className="text-[10.5px] text-slate-700 bg-slate-50 p-2 rounded mt-2 border border-slate-200/60 leading-tight">
                        <strong>Remarks:</strong> "{selectedRecord.ownerRemarks}"
                      </div>
                    ) : null}
                  </div>

                  {/* Stage 3: HR Final Clearance Audit */}
                  <div className={`p-3 rounded-lg border bg-white ${selectedRecord.hrApprovalStatus === 'Approved' ? 'border-purple-200 bg-purple-50/20' :
                    selectedRecord.hrApprovalStatus === 'Rejected' ? 'border-rose-200 bg-rose-50/20' : 'border-slate-200'
                    }`}>
                    <span className="text-[9px] font-black uppercase text-slate-400 block font-mono">Stage 3: HR Final Clearance</span>
                    <div className="font-bold text-slate-900 mt-1">HR Department</div>
                    <div className={`text-[10px] font-bold mt-0.5 ${selectedRecord.hrApprovalStatus === 'Approved' ? 'text-purple-700' :
                      selectedRecord.hrApprovalStatus === 'Rejected' ? 'text-rose-700' : 'text-slate-500'
                      }`}>
                      Status: {selectedRecord.hrApprovalStatus || "Pending"}
                    </div>
                    {selectedRecord.hrApprovalStatus === 'Approved' && (
                      <div className="text-[9.5px] text-slate-600 mt-1 space-y-0.5 font-semibold">
                        <div>✓ Assets Returned: {selectedRecord.assetReturn ? "Yes" : "N/A"}</div>
                        <div>✓ Access Revoked: {selectedRecord.accessRevoke ? "Yes" : "N/A"}</div>
                        <div>✓ KT Handover: {selectedRecord.handover ? "Yes" : "N/A"}</div>
                        <div>✓ Final F&F: {selectedRecord.finalSettlement ? "Done" : "N/A"}</div>
                      </div>
                    )}
                    {selectedRecord.hrRemarks ? (
                      <div className="text-[10.5px] text-slate-700 bg-slate-50 p-2 rounded mt-2 border border-slate-200/60 leading-tight">
                        <strong>Remarks:</strong> "{selectedRecord.hrRemarks}"
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>

              {/* READ-ONLY SUMMARY CARD WHEN REQUEST IS FULLY APPROVED */}
              {selectedRecord.approvalStage === "Approved" && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 mb-6 text-center space-y-2">
                  <CheckCircle className="w-8 h-8 text-emerald-600 mx-auto" />
                  <h4 className="text-sm font-black uppercase tracking-wider text-emerald-900">
                    Exit & Separation Clearance Fully Approved & Completed
                  </h4>
                  <p className="text-xs text-emerald-800 max-w-lg mx-auto">
                    This exit request has been fully processed and approved across all 3 stages (Department Reporting Manager → Owner → HR Final Clearance). All records and decision remarks are locked in Read-Only archive.
                  </p>
                </div>
              )}

              {/* EMPLOYEE STATUS VIEW FOR SUBMITTER */}
              {isSubmitter ? (
                <div className="bg-indigo-50/50 border border-indigo-200 rounded-xl p-5 mb-6">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="w-5 h-5 text-indigo-700" />
                    <h4 className="text-xs font-black uppercase tracking-wider text-indigo-900 font-mono">Your Exit Request Status</h4>
                  </div>
                  <div className="text-xs text-indigo-900 space-y-1">
                    {selectedRecord.approvalStage === "Pending Manager" && (
                      <p>⏳ Your request has been submitted and is currently <strong>Pending Review by your Department Reporting Manager</strong> ({selectedRecord.managerName || "Manager"}). An automated email notification has been sent.</p>
                    )}
                    {selectedRecord.approvalStage === "Pending Owner" && (
                      <p>✅ Approved by Department Manager (<strong>{selectedRecord.exitType || "Direct Exit"}</strong>{selectedRecord.exitType === "Notice Period" ? ` — ${selectedRecord.noticePeriodDays} Days, Last Working Day: ${selectedRecord.lastWorkingDay}` : ""}). Currently <strong>Pending Stage 2 Executive Approval by Owner</strong>.</p>
                    )}
                    {selectedRecord.approvalStage === "Pending HR" && (
                      <p>✅ Executive Approval Granted by Management! Currently <strong>Pending Stage 3 HR Final Clearance & Asset Handovers</strong>.</p>
                    )}
                    {selectedRecord.approvalStage === "Approved" && (
                      <p>🎉 Your Exit & Separation Clearance is <strong>FULLY APPROVED & COMPLETED</strong> by HR Department.</p>
                    )}
                    {selectedRecord.approvalStage === "Rejected" && (
                      <p className="text-rose-700">❌ Your exit request was rejected. Remarks: {selectedRecord.rejectionReason || selectedRecord.managerRemarks || selectedRecord.ownerRemarks || selectedRecord.hrRemarks || "Request rejected."}</p>
                    )}
                  </div>
                </div>
              ) : null}

              {/* STAGE 1: DEPARTMENT REPORTING MANAGER DECISION PANEL */}
              {(isManagerOrAbove && selectedRecord.approvalStage === "Pending Manager") && (
                <div className="bg-amber-50/50 border border-amber-200 rounded-xl p-5 mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <UserCheck className="w-5 h-5 text-amber-700" />
                    <h4 className="text-xs font-black uppercase tracking-wider text-amber-900 font-mono">Stage 1 — Department Reporting Manager Decision</h4>
                  </div>
                  <p className="text-xs text-amber-800 mb-4">
                    As the Department Reporting Manager, please review this exit request and choose whether to grant an <strong>Immediate Direct Exit</strong> or put the employee on a <strong>Notice Period</strong>.
                  </p>

                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <label className={`p-3 rounded-xl border cursor-pointer flex items-center gap-3 transition-all ${managerDecision.exitType === "Direct Exit" ? "bg-white border-indigo-600 shadow-sm" : "bg-white/50 border-slate-200"
                        }`}>
                        <input
                          type="radio"
                          name="exitType"
                          checked={managerDecision.exitType === "Direct Exit"}
                          onChange={() => setManagerDecision({ ...managerDecision, exitType: "Direct Exit" })}
                          className="accent-indigo-600"
                        />
                        <div>
                          <div className="text-xs font-bold text-slate-800">Direct Exit (Immediate)</div>
                          <div className="text-[10px] text-slate-500">Employee leaves immediately without serving notice period.</div>
                        </div>
                      </label>

                      <label className={`p-3 rounded-xl border cursor-pointer flex items-center gap-3 transition-all ${managerDecision.exitType === "Notice Period" ? "bg-white border-indigo-600 shadow-sm" : "bg-white/50 border-slate-200"
                        }`}>
                        <input
                          type="radio"
                          name="exitType"
                          checked={managerDecision.exitType === "Notice Period"}
                          onChange={() => setManagerDecision({ ...managerDecision, exitType: "Notice Period" })}
                          className="accent-indigo-600"
                        />
                        <div>
                          <div className="text-xs font-bold text-slate-800">Notice Period</div>
                          <div className="text-[10px] text-slate-500">Employee serves mandatory notice period days.</div>
                        </div>
                      </label>
                    </div>

                    {managerDecision.exitType === "Notice Period" && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white p-4 rounded-xl border border-slate-200">
                        <div>
                          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">Notice Period Days *</label>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={managerDecision.noticePeriodDays || ""}
                            onChange={e => {
                              const val = e.target.value.replace(/\D/g, "");
                              setManagerDecision({ ...managerDecision, noticePeriodDays: val ? Number(val) : 0 });
                            }}
                            className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs font-bold text-slate-800 mt-1 focus:outline-none focus:border-indigo-500"
                            placeholder="Enter notice period days (e.g. 30)"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">Last Working Day (LWD) *</label>
                          <input
                            type="date"
                            value={managerDecision.lastWorkingDay}
                            onChange={e => setManagerDecision({ ...managerDecision, lastWorkingDay: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs font-bold text-slate-800 mt-1"
                          />
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">Manager Remarks / Feedback</label>
                      <textarea
                        rows={2}
                        value={managerDecision.remarks}
                        onChange={e => setManagerDecision({ ...managerDecision, remarks: e.target.value })}
                        className="w-full bg-white border border-slate-200 rounded p-2.5 text-xs font-medium text-slate-800 mt-1 focus:outline-none focus:border-amber-600"
                        placeholder="Add manager remarks regarding the exit..."
                      />
                    </div>

                    <div className="flex gap-3 pt-2">
                      <button
                        onClick={() => handleProcessManagerDecision("approve")}
                        disabled={submitting}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 disabled:opacity-50"
                      >
                        <CheckCircle className="w-4 h-4" /> Approve & Forward to Owner
                      </button>
                      <button
                        onClick={() => handleProcessManagerDecision("reject")}
                        disabled={submitting}
                        className="px-5 bg-rose-600 hover:bg-rose-700 text-white py-2.5 rounded-lg text-xs font-bold transition-all shadow-sm disabled:opacity-50"
                      >
                        Reject Exit Request
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* STAGE 2: OWNER / EXECUTIVE BOARD DECISION PANEL */}
              {(isManagerOrAbove && selectedRecord.approvalStage === "Pending Owner") && (
                <div className="bg-blue-50/50 border border-blue-200 rounded-xl p-5 mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <ShieldCheck className="w-5 h-5 text-blue-700" />
                    <h4 className="text-xs font-black uppercase tracking-wider text-blue-900 font-mono">Stage 2 — Owner / Executive Management Approval</h4>
                  </div>
                  <p className="text-xs text-blue-800 mb-4">
                    Department Manager has approved this request for <strong>{selectedRecord.exitType || 'Direct Exit'}</strong>. Executive Board approval is required before forwarding to HR.
                  </p>

                  <div className="space-y-4">
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">Executive Remarks</label>
                      <textarea
                        rows={2}
                        value={ownerDecision.remarks}
                        onChange={e => setOwnerDecision({ ...ownerDecision, remarks: e.target.value })}
                        className="w-full bg-white border border-slate-200 rounded p-2.5 text-xs font-medium text-slate-800 mt-1 focus:outline-none focus:border-blue-600"
                        placeholder="Add executive management notes..."
                      />
                    </div>

                    <div className="flex gap-3 pt-2">
                      <button
                        onClick={() => handleProcessOwnerDecision("approve")}
                        disabled={submitting}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 disabled:opacity-50"
                      >
                        <CheckCircle className="w-4 h-4" /> Approve & Forward to HR
                      </button>
                      <button
                        onClick={() => handleProcessOwnerDecision("reject")}
                        disabled={submitting}
                        className="px-5 bg-rose-600 hover:bg-rose-700 text-white py-2.5 rounded-lg text-xs font-bold transition-all shadow-sm disabled:opacity-50"
                      >
                        Reject Exit Request
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* STAGE 3: HR DEPARTMENT FINAL CLEARANCE PANEL (ONLY WHEN PENDING HR) */}
              {(isManagerOrAbove && selectedRecord.approvalStage === "Pending HR") && (
                <div className="bg-purple-50/50 border border-purple-200 rounded-xl p-5 mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Building2 className="w-5 h-5 text-purple-700" />
                    <h4 className="text-xs font-black uppercase tracking-wider text-purple-900 font-mono">Stage 3 — HR Department Final Clearance & Handovers</h4>
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-white p-4 rounded-xl border border-slate-200">
                      {[
                        { key: "assetReturn", label: "Company Assets Returned" },
                        { key: "accessRevoke", label: "System & Email Access Revoked" },
                        { key: "handover", label: "Work & Client Handovers Complete" },
                        { key: "finalSettlement", label: "Final Financial Settlement (F&F)" },
                      ].map(({ key, label }) => (
                        <label key={key} className="flex items-center gap-3 p-2.5 rounded-lg border border-slate-150 cursor-pointer hover:bg-purple-50/30">
                          <input
                            type="checkbox"
                            className="accent-purple-600 w-4 h-4"
                            checked={(hrDecision as any)[key]}
                            onChange={e => setHrDecision({ ...hrDecision, [key]: e.target.checked })}
                          />
                          <span className="text-xs font-bold text-slate-700">{label}</span>
                        </label>
                      ))}
                    </div>

                    {/* Salary Settlement Status Options */}
                    <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-600 font-mono block">
                        Salary Settlement Status *
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs font-bold">
                        <label className={`p-2.5 rounded-lg border cursor-pointer flex items-center gap-2 transition-all ${hrDecision.salaryStatus === "Pending" ? "bg-amber-50 border-amber-300 text-amber-900" : "bg-slate-50 border-slate-200 text-slate-700"
                          }`}>
                          <input
                            type="radio"
                            name="hrSalaryStatus"
                            checked={hrDecision.salaryStatus === "Pending"}
                            onChange={() => setHrDecision({ ...hrDecision, salaryStatus: "Pending" })}
                            className="accent-amber-600"
                          />
                          <span>🔴 Pending (Due)</span>
                        </label>

                        <label className={`p-2.5 rounded-lg border cursor-pointer flex items-center gap-2 transition-all ${hrDecision.salaryStatus === "Paid / Released" ? "bg-emerald-50 border-emerald-300 text-emerald-900" : "bg-slate-50 border-slate-200 text-slate-700"
                          }`}>
                          <input
                            type="radio"
                            name="hrSalaryStatus"
                            checked={hrDecision.salaryStatus === "Paid / Released"}
                            onChange={() => setHrDecision({ ...hrDecision, salaryStatus: "Paid / Released" })}
                            className="accent-emerald-600"
                          />
                          <span>🟢 Paid / Released</span>
                        </label>

                        <label className={`p-2.5 rounded-lg border cursor-pointer flex items-center gap-2 transition-all ${hrDecision.salaryStatus === "Included in Full & Final (F&F)" ? "bg-blue-50 border-blue-300 text-blue-900" : "bg-slate-50 border-slate-200 text-slate-700"
                          }`}>
                          <input
                            type="radio"
                            name="hrSalaryStatus"
                            checked={hrDecision.salaryStatus === "Included in Full & Final (F&F)"}
                            onChange={() => setHrDecision({ ...hrDecision, salaryStatus: "Included in Full & Final (F&F)" })}
                            className="accent-blue-600"
                          />
                          <span>🔵 Included in F&F</span>
                        </label>
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">
                        Pending Dues / Hold Items Details (If Any)
                      </label>
                      <textarea
                        rows={2}
                        value={hrDecision.pendingDuesRemarks}
                        onChange={e => setHrDecision({ ...hrDecision, pendingDuesRemarks: e.target.value })}
                        className="w-full bg-white border border-slate-200 rounded p-2.5 text-xs font-medium text-slate-800 mt-1 focus:outline-none focus:border-purple-600"
                        placeholder="Detail any pending salary, hold amount, or dues that can be updated later..."
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">HR Final Clearance Remarks</label>
                      <textarea
                        rows={2}
                        value={hrDecision.remarks}
                        onChange={e => setHrDecision({ ...hrDecision, remarks: e.target.value })}
                        className="w-full bg-white border border-slate-200 rounded p-2.5 text-xs font-medium text-slate-800 mt-1 focus:outline-none focus:border-purple-600"
                        placeholder="Document final settlement details or HR clearance notes..."
                      />
                    </div>

                    <div className="flex gap-3 pt-2">
                      <button
                        onClick={() => handleProcessHrDecision("approve")}
                        disabled={submitting}
                        className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-2.5 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 disabled:opacity-50"
                      >
                        <CheckCircle className="w-4 h-4" /> Final Approve & Complete Exit
                      </button>
                      <button
                        onClick={() => handleProcessHrDecision("reject")}
                        disabled={submitting}
                        className="px-5 bg-rose-600 hover:bg-rose-700 text-white py-2.5 rounded-lg text-xs font-bold transition-all shadow-sm disabled:opacity-50"
                      >
                        Reject Clearance
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Separation Details */}
              <div className="space-y-6">
                <div>
                  <h4 className="text-[10px] font-black tracking-widest text-[#714B67] uppercase font-mono mb-2 border-b border-slate-100 pb-2">Exit Request Reason & Feedback</h4>
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800">
                    <p><strong>Reason:</strong> {selectedRecord.exitReason || "N/A"}</p>
                    {selectedRecord.exitFeedback && <p className="mt-2 text-slate-600"><strong>Feedback:</strong> {selectedRecord.exitFeedback}</p>}
                  </div>
                </div>
              </div>

            </div>
          ) : (
            <div className="text-center py-32 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center items-center h-[750px]">
              <FileText className="w-12 h-12 text-slate-300 mb-4 animate-bounce" />
              <h4 className="text-sm font-black text-slate-800 uppercase tracking-wide">No Exit Request Selected</h4>
              <p className="text-xs text-slate-400 mt-2 max-w-xs leading-normal">
                Select an exit request from the directory to process manager decisions, executive approvals, and HR clearance.
              </p>
            </div>
          )}
        </div>

      </div>

      {/* FORM-13 Exit Form Modal */}
      {showForm13 && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-slate-100">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-indigo-900 via-indigo-800 to-purple-900 text-white rounded-t-2xl">
              <div>
                <h2 className="text-lg font-black tracking-tight flex items-center gap-2">
                  <FileText className="w-5 h-5 text-indigo-300" /> FORM-13 Exit Request
                </h2>
                <p className="text-xs text-indigo-200 font-medium mt-0.5">Formal employee separation & clearance workflow submission</p>
              </div>
              <button onClick={() => setShowForm13(false)} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all text-white">
                <AlertCircle className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <form onSubmit={handleForm13Submit} className="space-y-6">
                {/* Basic Details & Dates */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] uppercase font-black text-slate-500 tracking-wider">1. Employee Name *</label>
                    <input required className="w-full bg-slate-50 border border-slate-300 focus:border-indigo-600 focus:bg-white rounded-lg p-2.5 text-xs font-bold text-slate-800 mt-1 focus:outline-none transition-all" value={form13.name} onChange={e => setForm13({ ...form13, name: e.target.value })} placeholder="Full Name" />
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-black text-slate-500 tracking-wider">2. Employment Category *</label>
                    <select required className="w-full bg-slate-50 border border-slate-300 focus:border-indigo-600 focus:bg-white rounded-lg p-2.5 text-xs font-bold text-slate-800 mt-1 focus:outline-none transition-all" value={form13.category} onChange={e => setForm13({ ...form13, category: e.target.value as any })}>
                      <option value="Employee">Full-time Employee</option>
                      <option value="Associate">Business Associate</option>
                      <option value="Vendor">Vendor / Contractor</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-black text-slate-500 tracking-wider">3. Resignation Date *</label>
                    <input type="date" required className="w-full bg-slate-50 border border-slate-300 focus:border-indigo-600 focus:bg-white rounded-lg p-2.5 text-xs font-bold text-slate-800 mt-1 focus:outline-none transition-all" value={form13.resignationDate} onChange={e => setForm13({ ...form13, resignationDate: e.target.value })} />
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-black text-slate-500 tracking-wider">4. Proposed Last Working Day (LWD)</label>
                    <input type="date" className="w-full bg-slate-50 border border-slate-300 focus:border-indigo-600 focus:bg-white rounded-lg p-2.5 text-xs font-bold text-slate-800 mt-1 focus:outline-none transition-all" value={form13.lastWorkingDay} onChange={e => setForm13({ ...form13, lastWorkingDay: e.target.value })} />
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-black text-slate-500 tracking-wider">5. Department</label>
                    <input className="w-full bg-slate-50 border border-slate-300 focus:border-indigo-600 focus:bg-white rounded-lg p-2.5 text-xs font-bold text-slate-800 mt-1 focus:outline-none transition-all" value={form13.department} onChange={e => setForm13({ ...form13, department: e.target.value })} placeholder="e.g. Operations / Technology / HR" />
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-black text-slate-500 tracking-wider">6. Handover / KT Replacement Person</label>
                    <input className="w-full bg-slate-50 border border-slate-300 focus:border-indigo-600 focus:bg-white rounded-lg p-2.5 text-xs font-bold text-slate-800 mt-1 focus:outline-none transition-all" value={form13.handoverTo} onChange={e => setForm13({ ...form13, handoverTo: e.target.value })} placeholder="Name of team member receiving KT" />
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-black text-slate-500 tracking-wider">7. Personal Contact Mobile (Post-Exit)</label>
                    <input className="w-full bg-slate-50 border border-slate-300 focus:border-indigo-600 focus:bg-white rounded-lg p-2.5 text-xs font-bold text-slate-800 mt-1 focus:outline-none transition-all" value={(form13 as any).personalMobile || ""} onChange={e => setForm13({ ...form13, personalMobile: e.target.value } as any)} placeholder="+91 98765 43210" />
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-black text-slate-500 tracking-wider">8. Personal Email (For F&F & Experience Letter)</label>
                    <input type="email" className="w-full bg-slate-50 border border-slate-300 focus:border-indigo-600 focus:bg-white rounded-lg p-2.5 text-xs font-bold text-slate-800 mt-1 focus:outline-none transition-all" value={(form13 as any).personalEmail || ""} onChange={e => setForm13({ ...form13, personalEmail: e.target.value } as any)} placeholder="personal@gmail.com" />
                  </div>

                  <div className="md:col-span-2">
                    <label className="text-[10px] uppercase font-black text-slate-500 tracking-wider">9. Exit Reason *</label>
                    <textarea required rows={2} className="w-full bg-slate-50 border border-slate-300 focus:border-indigo-600 focus:bg-white rounded-lg p-2.5 text-xs font-bold text-slate-800 mt-1 focus:outline-none resize-none transition-all" value={form13.exitReason} onChange={e => setForm13({ ...form13, exitReason: e.target.value })} placeholder="Reason for exit (Resignation, Career Switch, Contract End, Personal Reasons, etc.)" />
                  </div>
                </div>

                {/* IT & Compliance Clearance Checklist Section */}
                <div className="bg-indigo-50/50 border border-indigo-200 rounded-xl p-4 space-y-3">
                  <h4 className="text-[10px] font-black tracking-widest text-indigo-900 uppercase pb-2 border-b border-indigo-200/60 flex items-center justify-between">
                    <span>IT & Compliance Clearance Checklist</span>
                    <span className="text-[9px] font-bold text-indigo-600">Verification Items</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {[
                      { key: "accessRevoke", label: "1. System & CRM Access Revoked" },
                      { key: "assetReturn", label: "2. Company Assets Returned" },
                      { key: "dataAudit", label: "3. Data Security Audit Passed" },
                      { key: "clientTransfer", label: "4. Client Handovers Complete" },
                      { key: "ndaReminder", label: "5. Signed NDA & Non-Compete Sent" },
                      { key: "postExitWatch", label: "6. Active Post-Exit Tracking" },
                    ].map(({ key, label }) => (
                      <label key={key} className={`flex items-center gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-all ${(form13 as any)[key] ? "bg-emerald-50 border-emerald-300 text-emerald-800" : "bg-white border-slate-200 text-slate-700 hover:bg-indigo-50/40"
                        }`}>
                        <input
                          type="checkbox"
                          className="accent-indigo-600 w-4 h-4 rounded"
                          checked={(form13 as any)[key]}
                          onChange={e => setForm13({ ...form13, [key]: e.target.checked })}
                        />
                        <span className="text-[10px] font-extrabold uppercase tracking-wider">{label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="text-[10px] uppercase font-black text-slate-500 tracking-wider">Final Settlement Status (F&F)</label>
                    <select className="w-full bg-slate-50 border border-slate-300 focus:border-indigo-600 focus:bg-white rounded-lg p-2.5 text-xs font-bold text-slate-800 mt-1 focus:outline-none transition-all" value={form13.finalSettlementStatus} onChange={e => setForm13({ ...form13, finalSettlementStatus: e.target.value })}>
                      <option value="Pending Audit">Pending Audit</option>
                      <option value="On Hold">On Hold (Issues Found)</option>
                      <option value="Completed & Paid">Completed & Paid</option>
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="text-[10px] uppercase font-black text-slate-500 tracking-wider">Exit Feedback (Optional)</label>
                    <textarea rows={2} className="w-full bg-slate-50 border border-slate-300 focus:border-indigo-600 focus:bg-white rounded-lg p-2.5 text-xs font-bold text-slate-800 mt-1 focus:outline-none resize-none transition-all" value={form13.exitFeedback} onChange={e => setForm13({ ...form13, exitFeedback: e.target.value })} placeholder="Feedback from the exiting person (optional)..." />
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                  <button type="button" onClick={() => setShowForm13(false)} className="px-5 py-2.5 rounded-lg text-xs font-black uppercase text-slate-500 hover:bg-slate-100 transition-all">Cancel</button>
                  <button type="submit" disabled={submitting} className="px-6 py-2.5 rounded-lg text-xs font-black uppercase text-white bg-indigo-600 hover:bg-indigo-700 shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                    <CheckCircle className="w-4 h-4" /> Submit FORM-13 Exit Request
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* FULL EXIT CLEARANCE EDIT MODAL FOR OWNER / HR */}
      {showFullEditModal && selectedRecord && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto border border-slate-200 animate-fade-in">
            <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-slate-900 text-white rounded-t-3xl">
              <div>
                <h3 className="text-base font-extrabold tracking-tight flex items-center gap-2">
                  <Edit className="w-5 h-5 text-indigo-400" /> Edit Exit Clearance Details
                </h3>
                <p className="text-xs text-slate-400 font-semibold mt-0.5">
                  Form ID: {selectedRecord.id} | Employee: {selectedRecord.name}
                </p>
              </div>
              <button
                onClick={() => setShowFullEditModal(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveFullEdit} className="p-6 space-y-4 text-xs font-semibold">

              {/* Basic Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-600 mb-1 font-mono">Employee Name</label>
                  <input
                    type="text"
                    value={fullEditForm.name}
                    onChange={e => setFullEditForm({ ...fullEditForm, name: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl p-2.5 font-bold focus:outline-none focus:border-indigo-600"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-600 mb-1 font-mono">Handover / KT Person</label>
                  <input
                    type="text"
                    value={fullEditForm.handoverTo}
                    onChange={e => setFullEditForm({ ...fullEditForm, handoverTo: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl p-2.5 font-bold focus:outline-none focus:border-indigo-600"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-600 mb-1 font-mono">Resignation Date</label>
                  <input
                    type="date"
                    value={fullEditForm.resignationDate}
                    onChange={e => setFullEditForm({ ...fullEditForm, resignationDate: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl p-2.5 font-bold focus:outline-none focus:border-indigo-600"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-600 mb-1 font-mono">Last Working Day (LWD)</label>
                  <input
                    type="date"
                    value={fullEditForm.lastWorkingDay}
                    onChange={e => setFullEditForm({ ...fullEditForm, lastWorkingDay: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl p-2.5 font-bold focus:outline-none focus:border-indigo-600"
                  />
                </div>
              </div>

              {/* Salary Settlement Status & Pending Dues */}
              <div className="bg-purple-50/60 p-4 rounded-2xl border border-purple-200 space-y-3">
                <h4 className="text-[10px] font-black uppercase tracking-wider text-purple-900 font-mono">
                  💰 Salary & Financial Settlement Options
                </h4>

                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-600 mb-1">
                    Salary Settlement Status *
                  </label>
                  <select
                    value={fullEditForm.salaryStatus}
                    onChange={e => setFullEditForm({ ...fullEditForm, salaryStatus: e.target.value })}
                    className="w-full bg-white border border-purple-300 rounded-xl p-2.5 font-extrabold text-slate-800 focus:outline-none focus:border-purple-600"
                  >
                    <option value="Pending">🔴 Pending (Salary / Dues Pending)</option>
                    <option value="Paid / Released">🟢 Paid / Released (Salary Paid)</option>
                    <option value="Included in Full & Final (F&F)">🔵 Included in Full & Final (F&F)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-600 mb-1">
                    Pending Dues / Hold Items Details (Fill when completed or updated later)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Describe any pending salary, hold amount, or dues that were completed or resolved..."
                    value={fullEditForm.pendingDuesRemarks}
                    onChange={e => setFullEditForm({ ...fullEditForm, pendingDuesRemarks: e.target.value })}
                    className="w-full bg-white border border-purple-200 rounded-xl p-2.5 font-bold text-slate-800 focus:outline-none focus:border-purple-600"
                  />
                </div>
              </div>

              {/* Clearance Checkboxes */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-600 font-mono">
                  Clearance Items Checklist
                </h4>
                <div className="grid grid-cols-2 gap-2 text-xs font-bold">
                  <label className="flex items-center gap-2 cursor-pointer bg-white p-2 rounded-lg border border-slate-200">
                    <input
                      type="checkbox"
                      checked={fullEditForm.assetReturn}
                      onChange={e => setFullEditForm({ ...fullEditForm, assetReturn: e.target.checked })}
                      className="accent-indigo-600 w-4 h-4"
                    />
                    <span>Company Assets Returned</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer bg-white p-2 rounded-lg border border-slate-200">
                    <input
                      type="checkbox"
                      checked={fullEditForm.accessRevoke}
                      onChange={e => setFullEditForm({ ...fullEditForm, accessRevoke: e.target.checked })}
                      className="accent-indigo-600 w-4 h-4"
                    />
                    <span>System Access Revoked</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer bg-white p-2 rounded-lg border border-slate-200">
                    <input
                      type="checkbox"
                      checked={fullEditForm.handover}
                      onChange={e => setFullEditForm({ ...fullEditForm, handover: e.target.checked })}
                      className="accent-indigo-600 w-4 h-4"
                    />
                    <span>Work Handover Complete</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer bg-white p-2 rounded-lg border border-slate-200">
                    <input
                      type="checkbox"
                      checked={fullEditForm.finalSettlement}
                      onChange={e => setFullEditForm({ ...fullEditForm, finalSettlement: e.target.checked })}
                      className="accent-indigo-600 w-4 h-4"
                    />
                    <span>Final F&F Settlement Done</span>
                  </label>
                </div>
              </div>

              {/* Reason & Remarks */}
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-600 mb-1">Exit Reason</label>
                <textarea
                  rows={2}
                  value={fullEditForm.exitReason}
                  onChange={e => setFullEditForm({ ...fullEditForm, exitReason: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl p-2.5 font-bold focus:outline-none focus:border-indigo-600"
                />
              </div>

              {/* Approval Stage & Remarks */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-600 mb-1">Overall Approval Stage</label>
                  <select
                    value={fullEditForm.approvalStage}
                    onChange={e => setFullEditForm({ ...fullEditForm, approvalStage: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl p-2.5 font-extrabold text-slate-800 focus:outline-none"
                  >
                    <option value="Pending Manager">Pending Manager (Stage 1)</option>
                    <option value="Pending Owner">Pending Owner (Stage 2)</option>
                    <option value="Pending HR">Pending HR (Stage 3)</option>
                    <option value="Approved">Approved & Completed</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-600 mb-1">HR Remarks</label>
                  <input
                    type="text"
                    value={fullEditForm.hrRemarks}
                    onChange={e => setFullEditForm({ ...fullEditForm, hrRemarks: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl p-2.5 font-bold focus:outline-none focus:border-indigo-600"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowFullEditModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md disabled:opacity-50 flex items-center gap-1.5"
                >
                  {submitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                  Save All Changes
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
