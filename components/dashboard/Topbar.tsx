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
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleMarkAllRead = async () => {
    try {
      const res = await fetch("/api/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAllAsRead: true })
      });
      if (res.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleMarkSingleRead = async (id: string) => {
    try {
      const res = await fetch("/api/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id })
      });
      if (res.ok) {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
      }
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
            className={cn(
              "p-2 rounded-full text-[#9C9890] hover:text-[#1C1C1A] hover:bg-[#F0EAE4]/60 transition-all relative focus:outline-none",
              showNotifications && "text-[#1C1C1A] bg-[#F0EAE4]/60"
            )}
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-[#C9A84C] animate-pulse" />
            )}
          </button>

          {/* Notifications Dropdown Popover */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 z-50 bg-white border border-[#E8E4DF] shadow-2xl rounded-2xl p-4 w-[320px] space-y-3 text-left">
              <div className="flex justify-between items-center border-b border-[#E8E4DF] pb-2 mb-1.5">
                <h4 className="text-xs font-serif font-bold text-[#1C1C1A]" style={{ fontFamily: "'Playfair Display', serif" }}>
                  Notifications ({unreadCount})
                </h4>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-[9px] text-[#C9A84C] hover:text-[#B5963D] font-bold uppercase tracking-wider transition-colors"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              {notifications.length === 0 ? (
                <div className="text-center py-8 text-[#9C9890] text-xs flex flex-col items-center justify-center gap-2">
                  <BellOff className="w-6 h-6 text-slate-300" />
                  <span>No notifications yet</span>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 max-h-[260px] overflow-y-auto space-y-2 pr-1">
                  {notifications.map(n => {
                    const dateStr = n.createdAt 
                      ? new Date(n.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) 
                      : "";
                    
                    return (
                      <div
                        key={n.id}
                        onClick={() => handleMarkSingleRead(n.id)}
                        className={cn(
                          "py-2 px-1.5 hover:bg-[#F5F0EA]/30 transition-colors cursor-pointer rounded-lg flex gap-2 items-start",
                          !n.read && "bg-amber-50/20 border-l-2 border-[#C9A84C]"
                        )}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span className={cn("text-[11px] font-semibold truncate text-slate-800", !n.read && "font-bold text-[#1C1C1A]")}>
                              {n.title}
                            </span>
                            {!n.read && (
                              <span className="w-1.5 h-1.5 rounded-full bg-[#C9A84C] shrink-0" />
                            )}
                          </div>
                          <p className="text-[10px] text-slate-500 leading-relaxed mt-0.5 break-words font-medium">
                            {n.message}
                          </p>
                          <span className="text-[8px] text-[#9C9890] font-mono block mt-1">
                            {dateStr}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
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
    </>
  );
}
