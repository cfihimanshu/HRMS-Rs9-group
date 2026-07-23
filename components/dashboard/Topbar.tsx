"use client";
import React, { useEffect, useState, useCallback, useRef } from "react";
import ReactDOM from "react-dom";
import { Bell, Menu, LogOut, Sun, Moon, BellOff, CheckCheck, Trash2, User, ClipboardList, CheckCircle2, ShieldAlert, Clock, X } from "lucide-react";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";

interface TopbarProps {
  activeTabLabel: string;
  activeTab: string;
  setActiveTab?: (tab: string, filter?: string) => void;
  user?: any;
  mobileMenuOpen?: boolean;
  setMobileMenuOpen?: (open: boolean) => void;
}

export default function Topbar({
  activeTabLabel,
  mobileMenuOpen,
  setMobileMenuOpen,
  user,
  setActiveTab
}: TopbarProps) {
  const [isDark, setIsDark] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);


  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  const toggleTheme = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    if (nextDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  const handleLogout = useCallback(() => {
    setShowLogoutConfirm(true);
  }, []);

  const confirmLogout = useCallback(() => {
    setShowLogoutConfirm(false);
    signOut({ callbackUrl: `${window.location.origin}/login` });
  }, []);


  // Close modals/dropdowns on Escape key
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowLogoutConfirm(false);
        setShowNotifications(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showLogoutConfirm]);

  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [latestToast, setLatestToast] = useState<any>(null);

  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (showNotifications && notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [showNotifications]);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications");
      const data = await res.json();
      if (data.success) {
        setNotifications(prev => {
          // If we have a new notification that we didn't have before, show toast
          if (data.data.length > 0 && prev.length > 0 && data.data[0].id !== prev[0].id && !data.data[0].read) {
            setLatestToast(data.data[0]);
            setTimeout(() => setLatestToast(null), 5000); // Hide toast after 5s
          } else if (data.data.length > 0 && prev.length === 0 && !data.data[0].read) {
            // First time load with unread
            setLatestToast(data.data[0]);
            setTimeout(() => setLatestToast(null), 5000);
          }
          return data.data;
        });
        setUnreadCount(data.unreadCount);
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // Check every 30s
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const handleMarkAsRead = async () => {
    if (unreadCount === 0) return;
    try {
      await fetch("/api/notifications", { method: "PUT" });
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (e) {
      console.error(e);
    }
  };

  const handleClearAll = async () => {
    if (notifications.length === 0) return;
    try {
      await fetch("/api/notifications", { method: "DELETE" });
      setNotifications([]);
      setUnreadCount(0);
    } catch (e) {
      console.error(e);
    }
  };

  const handleClearSingle = async (e: React.MouseEvent, notifId: string) => {
    e.stopPropagation();
    try {
      await fetch("/api/notifications", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: notifId })
      });
      setNotifications(prev => {
        const next = prev.filter(n => n.id !== notifId);
        setUnreadCount(next.filter(n => !n.read).length);
        return next;
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleNotificationClick = async (notif: any) => {
    // 1. Mark as read
    if (!notif.read) {
      try {
        await fetch("/api/notifications", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: notif.id })
        });
        setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
      } catch (e) {
        console.error(e);
      }
    }

    // 2. Determine target tab based on notification title/content
    if (setActiveTab) {
      const title = (notif.title || "").toLowerCase();
      let targetTab = "";

      const userRole = (user?.role || "").toLowerCase();
      const isEmployee = userRole === "employee" || (!["owner", "director", "hr head", "hr-head", "hr executive", "hr-executive", "department manager", "department-manager"].includes(userRole));

      if (title.includes("leave")) {
        targetTab = isEmployee ? "ess-leaves" : "leave-request";
      } else if (title.includes("hiring") || title.includes("requisition")) {
        targetTab = "hiring";
      } else if (title.includes("interview")) {
        targetTab = "interviews";
      } else if (title.includes("verification") || title.includes("vetting") || title.includes("verified")) {
        targetTab = "verification";
      } else if (title.includes("job") || title.includes("vacancy")) {
        targetTab = "jobs";
      } else if (title.includes("training")) {
        targetTab = "training";
      } else if (title.includes("probation")) {
        targetTab = "probation";
      } else if (title.includes("sod") || title.includes("eod") || title.includes("attendance")) {
        targetTab = "attendance";
      } else if (title.includes("task")) {
        targetTab = "tasks";
      } else if (title.includes("grievance")) {
        targetTab = "grievance";
      } else if (title.includes("asset")) {
        targetTab = isEmployee ? "asset-request" : "assets-registry";
      } else if (title.includes("risk") || title.includes("warning")) {
        targetTab = "risks";
      }

      if (targetTab) {
        if (targetTab === "tasks") {
          const isGeneral = notif.title === "Pending Tasks" || 
            (notif.message || "").toLowerCase().includes("pending task(s)") ||
            (notif.message || "").toLowerCase().startsWith("welcome back");
          if (isGeneral) {
            setActiveTab(targetTab);
          } else {
            setActiveTab(targetTab, notif.message);
          }
        } else {
          setActiveTab(targetTab);
        }
        setShowNotifications(false);
      }
    }
  };

  return (
    <>
      <header className="h-14 border-b px-6 lg:px-8 flex items-center justify-between shrink-0 bg-[#FCFBF9] border-[#E8E4DF] relative z-20">

        {/* Left side: Mobile menu toggle and breadcrumb */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileMenuOpen?.(!mobileMenuOpen)}
            className="p-2 -ml-2 mr-1 rounded-lg lg:hidden text-[#1C1C1A] hover:bg-[#F0EAE4] transition-colors focus:outline-none"
            title="Toggle Sidebar Menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <span className="font-serif text-lg font-light tracking-wide text-[#1C1C1A]" style={{ fontFamily: "'Playfair Display', serif" }}>
            {activeTabLabel}
          </span>
        </div>

        {/* Right side actions */}
        <div className="flex items-center gap-2 relative">
          {/* Notifications */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2 rounded-full text-[#9C9890] hover:text-[#1C1C1A] hover:bg-[#F0EAE4]/60 transition-all relative focus:outline-none"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-rose-500 border-2 border-white animate-pulse" />
              )}
            </button>

            {showNotifications && (
              <div className="absolute top-full right-0 mt-2 w-96 bg-white dark:bg-slate-900 backdrop-blur-md border border-slate-200 dark:border-gray-800 shadow-2xl rounded-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                
                {/* Header with Title and Action Buttons */}
                <div className="p-4 bg-slate-50/80 dark:bg-slate-900/80 border-b border-slate-200 dark:border-gray-800 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                      <Bell className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-slate-800 dark:text-gray-200 uppercase tracking-wider">
                        Alerts
                      </h4>
                      <p className="text-[10px] text-slate-400 dark:text-gray-400 font-medium">
                        {unreadCount > 0 ? `${unreadCount} unread` : `${notifications.length} total`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAsRead}
                        className="flex items-center gap-1 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-950/60 bg-indigo-50 dark:bg-indigo-950/30 px-2.5 py-1 rounded-lg transition-all"
                        title="Mark all notifications as read"
                      >
                        <CheckCheck className="w-3 h-3" />
                        Mark Read
                      </button>
                    )}
                    {notifications.length > 0 && (
                      <button
                        onClick={handleClearAll}
                        className="flex items-center gap-1 text-[10px] font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-950/60 bg-rose-50 dark:bg-rose-950/30 px-2.5 py-1 rounded-lg transition-all"
                        title="Clear all notifications"
                      >
                        <Trash2 className="w-3 h-3" />
                        Clear All
                      </button>
                    )}
                  </div>
                </div>

                {/* Notifications List */}
                <div className="max-h-80 overflow-y-auto custom-scrollbar divide-y divide-slate-100 dark:divide-gray-800/60">
                  {notifications.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-400 dark:text-gray-500 flex flex-col items-center justify-center gap-2">
                      <BellOff className="w-8 h-8 text-slate-300 dark:text-gray-700" />
                      <span className="font-semibold">No alerts. All clear!</span>
                    </div>
                  ) : (
                    notifications.map((notif: any) => {
                      const titleLower = (notif.title || "").toLowerCase();
                      
                      let IconComponent = Bell;
                      let iconBg = "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300";
                      let accentBorder = "border-l-transparent";

                      if (titleLower.includes("user login") || titleLower.includes("login")) {
                        IconComponent = User;
                        iconBg = "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400";
                        if (!notif.read) accentBorder = "border-l-4 border-l-amber-400";
                      } else if (titleLower.includes("task")) {
                        IconComponent = ClipboardList;
                        iconBg = "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400";
                        if (!notif.read) accentBorder = "border-l-4 border-l-indigo-500";
                      } else if (titleLower.includes("leave") || titleLower.includes("approval") || titleLower.includes("verified")) {
                        IconComponent = CheckCircle2;
                        iconBg = "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400";
                        if (!notif.read) accentBorder = "border-l-4 border-l-emerald-500";
                      } else if (titleLower.includes("risk") || titleLower.includes("warning") || titleLower.includes("overdue")) {
                        IconComponent = ShieldAlert;
                        iconBg = "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400";
                        if (!notif.read) accentBorder = "border-l-4 border-l-rose-500";
                      }

                      return (
                        <div
                          key={notif.id}
                          onClick={() => handleNotificationClick(notif)}
                          className={`group p-3.5 transition-all hover:bg-slate-50/80 dark:hover:bg-slate-800/40 flex items-start gap-3 cursor-pointer relative ${accentBorder} ${
                            notif.read ? "bg-transparent opacity-85" : "bg-indigo-50/30 dark:bg-indigo-950/15"
                          }`}
                        >
                          <div className={`w-8 h-8 rounded-xl shrink-0 flex items-center justify-center ${iconBg} mt-0.5`}>
                            <IconComponent className="w-4 h-4" />
                          </div>

                          <div className="flex-1 min-w-0 text-left pr-5">
                            <div className="flex items-center justify-between gap-1 mb-0.5">
                              <h5 className={`text-xs font-black truncate ${notif.read ? "text-slate-700 dark:text-gray-300" : "text-indigo-600 dark:text-indigo-400"}`}>
                                {notif.title}
                              </h5>
                              {!notif.read && (
                                <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
                              )}
                            </div>
                            <p className={`text-[11px] leading-relaxed mb-1.5 ${notif.read ? "text-slate-500 dark:text-gray-400" : "text-slate-800 dark:text-gray-200 font-semibold"}`}>
                              {notif.message}
                            </p>
                            <div className="flex items-center gap-1.5 text-[9px] font-bold text-slate-400 dark:text-slate-500">
                              <Clock className="w-2.5 h-2.5" />
                              <span>
                                {new Date(notif.createdAt).toLocaleDateString("en-IN", { weekday: "short", month: "short", day: "numeric" })}
                              </span>
                              <span>•</span>
                              <span>
                                {new Date(notif.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                              </span>
                            </div>
                          </div>

                          {/* Individual Clear Button on Hover */}
                          <button
                            type="button"
                            onClick={(e) => handleClearSingle(e, notif.id)}
                            className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                            title="Remove notification"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-full text-[#9C9890] hover:text-[#1C1C1A] hover:bg-[#F0EAE4]/60 transition-all focus:outline-none"
            title="Toggle Theme"
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          <div className="h-5 w-px bg-[#E8E4DF] mx-1" />

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="p-2 rounded-full text-[#9C9890] hover:text-[#B4463D] hover:bg-rose-50 transition-all focus:outline-none"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Logout Confirmation Modal — via Portal */}
      {showLogoutConfirm && typeof document !== "undefined" && ReactDOM.createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center" style={{ backgroundColor: "rgba(0,0,0,0.45)" }} onClick={() => setShowLogoutConfirm(false)}>
          <div
            className="bg-white rounded-2xl shadow-2xl p-6 w-[340px] max-w-[90vw] text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
              <LogOut className="w-7 h-7 text-red-500" />
            </div>
            <h3 className="text-lg font-semibold text-[#1C1C1A] mb-1">Logout</h3>
            <p className="text-sm text-[#9C9890] mb-6">Are you sure you want to logout?</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-[#E8E4DF] text-sm font-medium text-[#1C1C1A] hover:bg-[#F5F3F0] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmLogout}
                className="flex-1 px-4 py-2.5 rounded-xl bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition-colors shadow-sm"
              >
                Yes, Logout
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
      {/* Toast Notification Portal */}
      {latestToast && typeof document !== "undefined" && ReactDOM.createPortal(
        <div
          className="fixed top-20 right-6 z-[9999] bg-white border-l-4 border-[#C9A84C] shadow-2xl rounded-r-xl p-4 w-[320px] max-w-[90vw] animate-in slide-in-from-right-8 fade-in duration-300 cursor-pointer hover:bg-slate-50 transition-colors"
          onClick={() => {
            setLatestToast(null);
            setShowNotifications(true);
          }}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1.5">
                <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Bell className="w-3 h-3 text-[#C9A84C]" /> New Alert
                </h4>
                <span className="text-[9px] font-mono text-slate-400 font-bold bg-slate-100 px-1.5 py-0.5 rounded">
                  {new Date(latestToast.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <h5 className="text-sm font-bold text-[#1C1C1A] mb-1">{latestToast.title}</h5>
              <p className="text-xs text-[#9C9890] leading-snug line-clamp-2">{latestToast.message}</p>
              <p className="text-[9px] font-medium text-[#C9A84C] mt-1.5">
                {new Date(latestToast.createdAt).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); setLatestToast(null); }}
              className="text-slate-400 hover:text-slate-600 p-1"
            >
              ✕
            </button>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
