"use client";
import React, { useEffect, useState, useCallback } from "react";
import ReactDOM from "react-dom";
import { Bell, Menu, LogOut, Sun, Moon } from "lucide-react";
import { signOut } from "next-auth/react";

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

  // Close modal on Escape key
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowLogoutConfirm(false);
    };
    if (showLogoutConfirm) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showLogoutConfirm]);

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
      <div className="flex items-center gap-2">
        {/* Notifications */}
        <button 
          className="p-2 rounded-full text-[#9C9890] hover:text-[#1C1C1A] hover:bg-[#F0EAE4]/60 transition-all relative focus:outline-none"
          title="Notifications"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-[#C9A84C]" />
        </button>

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

