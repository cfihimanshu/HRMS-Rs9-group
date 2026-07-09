"use client";
import React, { useEffect, useState, useCallback } from "react";
import ReactDOM from "react-dom";
import { Bell, Menu, LogOut, Sun, Moon, BellOff } from "lucide-react";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";

interface TopbarProps {
  activeTabLabel: string;
  activeTab: string;
  setActiveTab?: (tab: string) => void;
  user?: any;
  mobileMenuOpen?: boolean;
  setMobileMenuOpen?: (open: boolean) => void;
}

export default function Topbar({
  activeTabLabel,
  mobileMenuOpen,
  setMobileMenuOpen,
}: TopbarProps) {
  const [isDark, setIsDark] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // In-app Notifications State
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

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

  // Fetch Notifications
  const fetchNotifications = async () => {
    try {
      const res = await fetch("/api/notifications");
      const data = await res.json();
      if (res.ok && data.success) {
        setNotifications(data.data || []);
      }
    } catch (e) {
      console.error("Error fetching notifications:", e);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 20000);
    return () => clearInterval(interval);
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
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2 rounded-full text-[#9C9890] hover:text-[#1C1C1A] hover:bg-[#F0EAE4]/60 transition-all relative focus:outline-none"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#C9A84C] animate-pulse" />
              )}
            </button>

            {showNotifications && (
              <div className="absolute top-full right-0 mt-2 w-80 bg-white border border-[#E8E4DF] shadow-xl rounded-xl overflow-hidden z-50">
                <div className="p-3 bg-slate-50 border-b border-[#E8E4DF] flex justify-between items-center">
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest">Alerts <span className="text-[10px] text-slate-500 font-bold normal-case ml-1">({notifications.length})</span></h4>
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAsRead}
                      className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 hover:underline bg-indigo-50 px-2 py-1 rounded"
                    >
                      Mark all read
                    </button>
                  )}
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-500">No new alerts.</div>
                  ) : (
                    <div className="divide-y divide-[#E8E4DF]">
                      {notifications.map((notif: any) => (
                        <div key={notif.id} className={`p-3 ${notif.read ? 'bg-white' : 'bg-[#F0EAE4]/30'} hover:bg-slate-50 transition-colors`}>
                          <div className="flex justify-between items-start mb-1">
                            <h5 className="text-xs font-bold text-[#1C1C1A]">{notif.title}</h5>
                            <span className="text-[9px] font-mono text-[#9C9890] shrink-0 ml-2">
                              {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-[10px] text-[#9C9890] leading-relaxed mb-1">{notif.message}</p>
                          <p className="text-[9px] font-medium text-indigo-500/80">
                            {new Date(notif.createdAt).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                          </p>
                        </div>
                      ))}
                    </div>
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
