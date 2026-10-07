"use client";
import React, { useState, useEffect, useCallback } from "react";
import ReactDOM from "react-dom";
import Image from "next/image";
import { LayoutDashboard, UserSquare2, Users2, ShieldCheck, CalendarCheck, TrendingUp, BriefcaseIcon, Coins, LogOut, ChevronDown, ChevronRight, Key, FolderKanban } from "lucide-react";
import { signOut } from "next-auth/react";
import { CATEGORIES_ORDER } from "@/lib/navigationConfig";
import { getDashboardMenuItems } from "@/lib/dashboardNavigation";

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string, filter?: string) => void;
  stats: any;
  user: any;
  triggerToast?: (msg: string) => void;
  toggleModal?: (modalId: string, open: boolean) => void;
  mobileMenuOpen?: boolean;
  setMobileMenuOpen?: (open: boolean) => void;
}

export default function DashboardSidebar({
  activeTab,
  setActiveTab,
  stats,
  user,
  triggerToast,
  toggleModal,
  mobileMenuOpen,
  setMobileMenuOpen
}: SidebarProps) {
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [securityMenuOpen, setSecurityMenuOpen] = useState(activeTab === "security");

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

  const userRole = user?.role || "Employee";
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains("dark"));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    setIsDark(document.documentElement.classList.contains("dark"));
    return () => observer.disconnect();
  }, []);

  const menuItems = getDashboardMenuItems(user, stats);

  const groupedMenu = menuItems.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, typeof menuItems>);

  const categories = CATEGORIES_ORDER.filter(cat => groupedMenu[cat] && groupedMenu[cat].length > 0);

  const [openSections, setOpenSections] = useState<Record<string, boolean>>(() => {
    return categories.reduce((acc, cat) => {
      acc[cat] = true;
      return acc;
    }, {} as Record<string, boolean>);
  });

  // Ensure active tab category is expanded
  useEffect(() => {
    for (const cat of categories) {
      if (groupedMenu[cat]?.some(i => i.id === activeTab)) {
        setOpenSections(prev => ({ ...prev, [cat]: true }));
        break;
      }
    }
  }, [activeTab]);

  const toggle = (cat: string) => setOpenSections(prev => ({ ...prev, [cat]: !prev[cat] }));

  const catIcons: Record<string, any> = {
    "Dashboards": LayoutDashboard,
    "Human Resources (HR)": UserSquare2,
    "Administration & IT": Key,
    "Employee Self Service": Users2,
    "Daily Operations": CalendarCheck,
    "Sales & Business Network": BriefcaseIcon,
    "Compliance & Exit": ShieldCheck,
  };

  return (
    <aside
      className={`fixed lg:static top-0 bottom-0 left-0 z-40 w-64 flex-shrink-0 flex flex-col h-screen overflow-y-auto border-r transition-all duration-300 transform ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        } bg-[#FAFAF7] dark:bg-gray-950 border-[#E8E4DF] dark:border-gray-800 text-[#1C1C1A] dark:text-gray-100`}
    >
      <div className="flex items-center px-6 py-4 border-b border-[#E8E4DF] dark:border-gray-800">
        <div className="relative h-10 w-40 shrink-0 overflow-hidden">
          <Image
            src="/citiline-logo.png"
            alt="Citiline logo"
            width={160}
            height={160}
            preload
            className="absolute left-0 top-1/2 -translate-y-1/2 dark:brightness-0 dark:invert"
          />
        </div>
      </div>

      <nav className="flex-1 py-4 px-3 space-y-1.5 custom-scrollbar">
        {categories.map((cat) => {
          const isOpen = openSections[cat] ?? true;
          const Icon = catIcons[cat] || LayoutDashboard;
          const anyActive = groupedMenu[cat]?.some(i => i.id === activeTab);
          const totalBadge = groupedMenu[cat]?.reduce((sum, i) => sum + (i.badge || 0), 0) || 0;
          const hasUrgent = groupedMenu[cat]?.some(i => (i.badge || 0) > 0 && i.urgent);

          return (
            <div key={cat} className="space-y-1">
              <button
                onClick={() => toggle(cat)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-[10px] font-bold tracking-wider transition-all uppercase ${anyActive
                  ? "bg-[#F0EAE4] dark:bg-gray-800/90 text-[#1C1C1A] dark:text-white shadow-xs"
                  : "text-[#6B6965] dark:text-gray-400 hover:bg-[#F0EAE4]/60 dark:hover:bg-gray-800/60 hover:text-[#1C1C1A] dark:hover:text-white"
                  }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Icon className={`w-3.5 h-3.5 shrink-0 ${anyActive ? "text-[#C9A84C]" : "text-[#9C9890] dark:text-gray-500"}`} />
                  <span className="truncate">{cat}</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {!isOpen && totalBadge > 0 && (
                    <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${hasUrgent ? "bg-rose-500 text-white animate-pulse" : "bg-[#C9A84C] text-white"}`}>
                      {totalBadge}
                    </span>
                  )}
                  {isOpen
                    ? <ChevronDown className="w-3.5 h-3.5 opacity-60 transition-transform duration-200" />
                    : <ChevronRight className="w-3.5 h-3.5 opacity-60 transition-transform duration-200" />
                  }
                </div>
              </button>

              {isOpen && (
                <div className="ml-3 mt-1 space-y-0.5 pl-2.5 border-l-2 border-[#E8E4DF]/70 dark:border-gray-800/80">
                  {groupedMenu[cat]?.map((item) => {
                    const isActive = activeTab === item.id;
                    const ItemIcon = item.icon;
                    const isSecurityMenu = item.id === "security";
                    return (
                      <div key={item.id}>
                      <button
                        onClick={() => {
                          if (isSecurityMenu) {
                            setSecurityMenuOpen(open => !open);
                            return;
                          }
                          const isOwner = user?.role === "Owner" || String(user?.role || "").toLowerCase() === "owner";
                          if (!isOwner && stats?.currentUserCompliance && !stats.currentUserCompliance.hasSod) {
                            if (item.id !== "attendance" && item.id !== "ess-dashboard" && item.id !== "dashboard" && item.id !== "ess") {
                              if (triggerToast) {
                                triggerToast("⚠️ Please submit your Start of Day (SOD) declaration first to unlock other modules.");
                              }
                              if (toggleModal) {
                                toggleModal("sodModal", true);
                              }
                              return;
                            }
                          }
                          setActiveTab(item.id);
                          if (setMobileMenuOpen) {
                            setMobileMenuOpen(false);
                          }
                        }}
                        className={`w-full flex items-center justify-between text-[11px] py-1.5 px-2.5 rounded-md font-medium transition-all ${isActive
                          ? "bg-[#EBE4DC] dark:bg-gray-800 text-[#1C1C1A] dark:text-white font-semibold border-l-2 border-[#C9A84C]"
                          : "text-[#666460] dark:text-gray-400 hover:bg-[#F5F0EA] dark:hover:bg-gray-800/60 hover:text-[#1C1C1A] dark:hover:text-white"
                          }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <ItemIcon className={`w-3.5 h-3.5 shrink-0 ${isActive ? "text-[#C9A84C]" : "opacity-75"}`} />
                          <span className="truncate">{item.label}</span>
                        </div>

                        {item.badge !== undefined && item.badge > 0 && (
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${item.urgent
                            ? "bg-rose-500 text-white animate-pulse"
                            : "bg-[#C9A84C] text-white"
                            }`}>
                            {item.badge}
                          </span>
                        )}
                        {isSecurityMenu && (securityMenuOpen ? <ChevronDown className="w-3.5 h-3.5 opacity-60"/> : <ChevronRight className="w-3.5 h-3.5 opacity-60"/>)}
                      </button>
                      {isSecurityMenu && securityMenuOpen && (
                        <div className="ml-5 mt-1 space-y-0.5 border-l border-[#DED7CF] dark:border-gray-800 pl-2">
                          {[
                            { id: "attendance", label: "Attendance", icon: CalendarCheck },
                            { id: "projects", label: "Projects", icon: FolderKanban },
                            { id: "business-development", label: "Business Development", icon: TrendingUp },
                            { id: "payments", label: "Payments", icon: Coins },
                          ].map(child => {
                            const ChildIcon = child.icon;
                            return <button key={child.id} onClick={() => { setActiveTab("security", child.id); if (setMobileMenuOpen) setMobileMenuOpen(false); }} className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-[10px] text-[#666460] dark:text-gray-400 hover:bg-[#F0EAE4] dark:hover:bg-gray-800 hover:text-[#1C1C1A] dark:hover:text-white">
                              <ChildIcon className="w-3 h-3 shrink-0"/><span>{child.label}</span>
                            </button>;
                          })}
                        </div>
                      )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="p-4 border-t border-[#E8E4DF] dark:border-gray-800">
        <div className="flex items-center gap-3 p-2.5 rounded-xl bg-[#FCFBF9] dark:bg-gray-900 border border-[#E8E4DF] dark:border-gray-800 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
          <div className="w-8 h-8 rounded-full bg-[#C9A84C] flex items-center justify-center text-white text-xs font-semibold shrink-0 shadow-sm overflow-hidden">
            {user?.profilePhoto ? (
              <img
                src={user.profilePhoto}
                alt={user?.name || "Profile"}
                className="w-full h-full object-cover"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
            ) : (
              user?.name ? user.name[0].toUpperCase() : "U"
            )}
          </div>
          <div className="min-w-0 flex-1 text-left">
            <div className="text-xs font-semibold truncate text-[#1C1C1A] dark:text-gray-100">{user?.name || "System User"}</div>
            <div className="text-[10px] text-[#9C9890] dark:text-gray-400 truncate font-medium uppercase tracking-wide">
              {user?.designation || userRole}
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 rounded-lg text-[#9C9890] hover:bg-red-50 hover:text-red-600 transition-colors"
            title="Log Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

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
    </aside>
  );
}
