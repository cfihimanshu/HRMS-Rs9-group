"use client";
import React, { useEffect, useState } from "react";
import { Search, Bell, Moon, Sun, Menu } from "lucide-react";

interface TopbarProps {
  activeTabLabel: string;
  user?: any;
  mobileMenuOpen?: boolean;
  setMobileMenuOpen?: (open: boolean) => void;
}

export default function Topbar({ activeTabLabel, user, mobileMenuOpen, setMobileMenuOpen }: TopbarProps) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  const toggleDark = () => {
    if (isDark) {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    } else {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    }
    setIsDark(!isDark);
  };

  return (
    <header className={`h-14 border-b px-4 lg:px-8 flex items-center justify-between shrink-0 transition-colors duration-300 ${isDark ? "bg-gray-900 border-gray-800" : "bg-white border-slate-200 shadow-sm"}`}>

      {/* Mobile Toggle & Breadcrumbs */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setMobileMenuOpen?.(!mobileMenuOpen)}
          className={`p-2 -ml-2 mr-1 rounded-lg lg:hidden transition-colors focus:outline-none ${
            isDark ? "text-gray-300 hover:bg-gray-800" : "text-slate-600 hover:bg-slate-100"
          }`}
          title="Toggle Sidebar Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="hidden md:flex items-center gap-2 text-sm">
          <span className={isDark ? "text-gray-400" : "text-slate-400 font-medium"}>HRMS</span>
          <span className={isDark ? "text-gray-600" : "text-slate-300"}>/</span>
          <span className={`font-bold ${isDark ? "text-gray-200" : "text-slate-700"}`}>
            {activeTabLabel}
          </span>
        </div>
      </div>

      {/* Right side actions */}
      <div className="flex items-center gap-3 w-full md:w-auto justify-end">
        {/* Search */}
        <div className={`hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-colors ${isDark ? "bg-gray-800 border-gray-700 text-gray-300" : "bg-slate-50 border-slate-200 text-slate-600"}`}>
          <Search className="w-4 h-4 opacity-50" />
          <input
            type="text"
            placeholder="Search across modules..."
            className="bg-transparent text-sm outline-none w-48"
          />
          <kbd className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${isDark ? "bg-gray-700 text-gray-400" : "bg-white text-slate-400 border border-slate-200 shadow-sm"}`}>
            ⌘K
          </kbd>
        </div>

        <div className={`w-px h-6 mx-1 ${isDark ? "bg-gray-800" : "bg-slate-200"}`}></div>

        {/* Dark mode toggle */}
        <button
          onClick={toggleDark}
          className={`p-2 rounded-full transition-colors ${isDark ? "hover:bg-gray-800 text-yellow-400" : "hover:bg-slate-100 text-slate-600"}`}
        >
          {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Notifications */}
        <button className={`p-2 rounded-full transition-colors relative ${isDark ? "hover:bg-gray-800 text-gray-300" : "hover:bg-slate-100 text-slate-600"}`}>
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 border-2 border-white dark:border-gray-900"></span>
        </button>

      </div>
    </header>
  );
}
