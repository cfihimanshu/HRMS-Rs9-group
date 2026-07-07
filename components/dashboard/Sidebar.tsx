"use client";
import React, { useState, useEffect, useCallback } from "react";
import ReactDOM from "react-dom";
import {
  LayoutDashboard, UserSquare2, FileEdit, Briefcase, Users2, ScanLine,
  Video, ShieldCheck, FileText, GraduationCap, Clock, CalendarCheck,
  TrendingUp, BriefcaseIcon, Building2, Coins, HelpCircle, AlertTriangle,
  LogOut, ChevronDown, ChevronRight, MapPin, Cpu, Package, Key, Scale
} from "lucide-react";
import { signOut } from "next-auth/react";

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
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

  const allMenuItems = [
    { id: "dashboard", label: "Owner Dashboard", icon: LayoutDashboard, category: "Core Workspace", roles: ["Owner", "Director"] },
    { id: "hr-dash", label: "HR Dashboard", icon: UserSquare2, category: "Core Workspace", roles: ["Owner", "Director", "HR Head", "HR Executive"] },
    { id: "dept-dash", label: "Department Dashboard", icon: Building2, category: "Core Workspace", roles: ["Owner", "Director", "Department Manager"] },

    // Employee Self Service (ESS)
    { id: "ess-dashboard", label: "ESS Dashboard", icon: LayoutDashboard, category: "Employee Self Service", roles: ["Employee"] },
    { id: "ess-leaves", label: "Leave Management", icon: CalendarCheck, category: "Employee Self Service", roles: ["Employee"] },
    { id: "ess-payroll", label: "My Payslips & Salary", icon: FileText, category: "Employee Self Service", roles: ["Owner", "Director", "HR Head", "HR Executive"] },
    { id: "ess-expenses", label: "Expense Claims", icon: Coins, category: "Employee Self Service", roles: ["Employee"] },
    { id: "asset-request", label: "Asset Request", icon: Cpu, category: "Employee Self Service", roles: ["Employee", "Owner", "Director", "HR Head", "HR Executive", "Department Manager"] },

    { id: "hiring", label: "Hiring Approvals", icon: FileEdit, category: "Core Workspace", roles: ["Owner", "Director", "HR Head", "HR Executive", "Department Manager", "Accounts"] },
    { id: "jobs", label: "Vacancy Postings", icon: Briefcase, category: "Core Workspace", roles: ["Owner", "Director", "HR Head", "HR Executive"] },
    { id: "hr-leads", label: "HR Leads", icon: FileText, category: "Core Workspace", roles: ["Owner", "Director", "HR Head", "HR Executive"] },
    { id: "employees", label: "Employees Directory", icon: Users2, category: "Core Workspace", roles: ["Owner", "Director", "HR Head", "HR Executive"] },
    { id: "bda-directory", label: "BDA Network (Sales)", icon: Users2, category: "Core Workspace", roles: ["Owner", "Director", "HR Head", "HR Executive", "Department Manager"] },
    { id: "assets-registry", label: "Assets Registry", icon: Cpu, category: "Core Workspace", roles: ["Owner", "Director", "HR Head", "HR Executive"] },
    { id: "inventory-management", label: "Inventory Management", icon: Package, category: "Core Workspace", roles: ["Owner"] },
    { id: "admin-access", label: "Administrator Access", icon: Key, category: "Core Workspace", roles: ["Owner"] },
    { id: "legal-recovery", label: "Legal Recovery", icon: Scale, category: "Core Workspace", roles: ["Owner"] },

    { id: "screening", label: "AI Screening Module", icon: ScanLine, category: "AI & Vetting Hub", roles: ["Owner", "Director", "HR Head", "HR Executive"] },
    { id: "interviews", label: "Interviews Queue", icon: Video, category: "AI & Vetting Hub", badge: stats?.interviews?.pending, roles: ["Owner", "Director", "HR Head", "HR Executive", "Trainer"] },
    { id: "verification", label: "Vetting Checks Registry", icon: ShieldCheck, category: "AI & Vetting Hub", roles: ["Owner", "Director", "HR Head", "HR Executive", "RIBP / Risk Officer"] },
    { id: "onboarding", label: "NDA Onboarding SLA", icon: FileText, category: "AI & Vetting Hub", roles: ["Owner", "Director", "HR Head", "HR Executive"] },

    { id: "training", label: "Training Classroom", icon: GraduationCap, category: "Training & Probation", roles: ["Owner", "Director", "HR Head", "HR Executive", "Trainer"] },
    { id: "probation", label: "6-Month Probation Audit", icon: Clock, category: "Training & Probation", badge: stats?.operations?.probationCases, roles: ["Owner", "Director", "HR Head", "HR Executive", "Trainer"] },

    { id: "attendance", label: "Attendance Punch & SOD", icon: CalendarCheck, category: "Daily Operations", roles: ["Owner", "Director", "HR Head", "HR Executive", "Department Manager", "Accounts", "Trainer", "IT Admin", "DSM", "RIBP / Risk Officer"] },
    { id: "tasks", label: "My Tasks (Kanban)", icon: FileEdit, category: "Daily Operations", roles: ["Owner", "Director", "HR Head", "HR Executive", "Department Manager", "Accounts", "Trainer", "Employee", "IT Admin", "DSM", "RIBP / Risk Officer"] },
    { id: "performance", label: "Work Report", icon: FileText, category: "Daily Operations", roles: ["Owner", "Director", "HR Head", "HR Executive", "Department Manager", "Employee"] },
    { id: "field-visit", label: "Field Visit Logs", icon: MapPin, category: "Daily Operations", roles: ["Owner", "Director", "HR Head", "HR Executive", "Department Manager", "Employee"] },
    { id: "leave-request", label: "Leave Request", icon: CalendarCheck, category: "Daily Operations", roles: ["Owner", "Director", "HR Head", "HR Executive", "Department Manager", "Accounts", "Trainer", "Employee", "IT Admin", "DSM", "RIBP / Risk Officer", "Business Associate", "Vendor", "Franchisee", "Territory Partner"] },

    { id: "associates", label: "Business Associates", icon: BriefcaseIcon, category: "Network Partners", roles: ["Owner", "Director", "HR Head", "Franchisee", "Territory Partner", "Business Associate"] },
    { id: "vendors", label: "Vendor SLA Contracts", icon: Building2, category: "Network Partners", roles: ["Owner", "Director", "HR Head", "Accounts", "Vendor"] },
    { id: "franchise", label: "Franchise Brand Audits", icon: Coins, category: "Network Partners", roles: ["Owner", "Director", "HR Head", "Accounts", "Franchisee", "Territory Partner"] },

    { id: "grievance", label: "Anonymous Grievance", icon: HelpCircle, category: "Compliance & Exit", badge: stats?.operations?.grievanceCases, roles: ["Owner", "Director", "HR Head", "HR Executive", "Department Manager", "Accounts", "Trainer", "Business Associate", "Vendor", "Franchisee", "Territory Partner"] },
    { id: "risks", label: "Critical Risk Warnings", icon: AlertTriangle, category: "Compliance & Exit", badge: stats?.alerts?.criticalRisk, urgent: true, roles: ["Owner", "Director", "HR Head", "RIBP / Risk Officer"] },
    { id: "exit", label: "Exit Separation Clearance", icon: LogOut, category: "Compliance & Exit", roles: ["Owner", "Director", "HR Head", "Employee"] }
  ];

  const userDept = user?.department || "";
  const isAdministration = userDept.toLowerCase().includes("administration");

  const isOwnerOrDirector = ["Owner", "Director"].includes(userRole);
  let allowedPageIds: string[] | null = null;
  if (Array.isArray(user?.menuAccess)) {
    allowedPageIds = user.menuAccess;
  } else if (typeof user?.menuAccess === "string" && user.menuAccess) {
    try {
      const parsed = JSON.parse(user.menuAccess);
      if (Array.isArray(parsed)) allowedPageIds = parsed;
    } catch {}
  }

  const menuItems = allMenuItems.filter(item => {
    if (!isOwnerOrDirector && allowedPageIds) {
      const hasPageLevelPermissions = allowedPageIds.some(p => 
        !["Core Workspace", "Employee Self Service", "AI & Vetting Hub", "Training & Probation", "Daily Operations", "Network Partners", "Compliance & Exit"].includes(p)
      );
      if (hasPageLevelPermissions) {
        // Page-level override: if the page ID is checkmarked, show it!
        return allowedPageIds.includes(item.id);
      } else {
        // Fallback to old category-level permissions
        if (!allowedPageIds.includes(item.category)) {
          return false;
        }
      }
    }
    if (item.id === "inventory-management") {
      return item.roles.includes(userRole) || isAdministration;
    }
    if (item.id === "assets-registry") {
      return item.roles.includes(userRole) || isAdministration;
    }
    if (item.id === "bda-directory") {
      const isITManager = (userRole === "Department Manager" && 
        ((user?.department || "").toLowerCase().includes("information technology") || 
         (user?.department || "").toLowerCase().includes("it")));
      if (isITManager) return false;
    }
    return item.roles.includes(userRole);
  });

  const groupedMenu = menuItems.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, typeof menuItems>);

  const categories = Object.keys(groupedMenu);

  const [openSections, setOpenSections] = useState<Record<string, boolean>>(
    categories.reduce((acc, cat) => ({ ...acc, [cat]: true }), {})
  );

  const toggle = (cat: string) => setOpenSections(prev => ({ ...prev, [cat]: !prev[cat] }));

  const catIcons: Record<string, any> = {
    "Core Workspace": LayoutDashboard,
    "Employee Self Service": UserSquare2,
    "AI & Vetting Hub": ScanLine,
    "Training & Probation": GraduationCap,
    "Daily Operations": CalendarCheck,
    "Network Partners": BriefcaseIcon,
    "Compliance & Exit": ShieldCheck,
  };

  return (
    <aside
      className={`fixed lg:static top-0 bottom-0 left-0 z-40 w-64 flex-shrink-0 flex flex-col h-screen overflow-y-auto border-r transition-all duration-300 transform ${
        mobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      } bg-[#FAFAF7] border-[#E8E4DF]`}
    >
      <div className="flex items-center gap-3 px-6 py-5 border-b border-[#E8E4DF]">
        <div className="text-xl font-light tracking-widest text-[#1C1C1A] font-serif" style={{ fontFamily: "'Playfair Display', serif" }}>
          RS9
        </div>
        <div className="h-4 w-px bg-[#E8E4DF]" />
        <div className="text-[10px] font-bold tracking-widest text-[#9C9890] uppercase">
          Group
        </div>
      </div>

      <nav className="flex-1 py-4 px-3 space-y-1.5 custom-scrollbar">
        {categories.map((cat) => {
          const isAI = cat === "AI & Vetting Hub";
          const isOpen = openSections[cat];
          const Icon = catIcons[cat] || LayoutDashboard;
          const anyActive = groupedMenu[cat].some(i => i.id === activeTab);

          return (
            <div key={cat}>
              {isAI && (
                <div className="mx-2.5 my-3 border-t border-[#E8E4DF]/85 text-[9px] font-bold uppercase tracking-widest pt-3 text-[#C9A84C]">
                  ✦ AI Features
                </div>
              )}

              <button
                onClick={() => toggle(cat)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-[10px] font-bold tracking-wider transition-all uppercase ${anyActive
                    ? "bg-[#F0EAE4] text-[#1C1C1A]"
                    : "text-[#5D5B57] hover:bg-[#F0EAE4]/50 hover:text-[#1C1C1A]"
                  }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Icon className={`w-4 h-4 shrink-0 ${anyActive ? "text-[#C9A84C]" : "text-[#9C9890]"}`} />
                  <span className="truncate">{cat}</span>
                </div>
                {isOpen
                  ? <ChevronDown className="w-3.5 h-3.5 shrink-0 opacity-60" />
                  : <ChevronRight className="w-3.5 h-3.5 shrink-0 opacity-60" />
                }
              </button>

              {isOpen && (
                <div className="ml-4 mt-1 space-y-1 pl-2 border-l border-[#E8E4DF]">
                  {groupedMenu[cat].map((item) => {
                    const isActive = activeTab === item.id;
                    const ItemIcon = item.icon;
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          if (userRole === "Employee" && stats?.currentUserCompliance && !stats.currentUserCompliance.hasSod) {
                            if (item.id !== "attendance" && item.id !== "ess-dashboard") {
                              if (triggerToast) {
                                triggerToast("⚠️ Please submit your Start of Day (SOD) declaration first to unlock other modules.");
                              }
                              if (toggleModal) {
                                toggleModal("sodModal", true);
                              } else {
                                setActiveTab("attendance");
                              }
                              return;
                            }
                          }
                          setActiveTab(item.id);
                          if (setMobileMenuOpen) {
                            setMobileMenuOpen(false);
                          }
                        }}
                        className={`w-full flex items-center justify-between text-[11px] py-2 px-2.5 rounded-lg font-medium transition-all ${isActive
                            ? "bg-[#F0EAE4] text-[#1C1C1A] font-semibold border-l-2 border-[#C9A84C]"
                            : "text-[#5D5B57] hover:bg-[#F5F0EA] hover:text-[#1C1C1A]"
                          }`}
                      >
                        <div className="flex items-center gap-2">
                          <ItemIcon className="w-3.5 h-3.5 shrink-0 opacity-80" />
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
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="p-4 border-t border-[#E8E4DF]">
        <div className="flex items-center gap-3 p-2.5 rounded-xl bg-[#FCFBF9] border border-[#E8E4DF] shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
          <div className="w-8 h-8 rounded-full bg-[#C9A84C] flex items-center justify-center text-white text-xs font-semibold shrink-0 shadow-sm">
            {user?.name ? user.name[0].toUpperCase() : "U"}
          </div>
          <div className="min-w-0 flex-1 text-left">
            <div className="text-xs font-semibold truncate text-[#1C1C1A]">{user?.name || "System User"}</div>
            <div className="text-[10px] text-[#9C9890] truncate font-medium uppercase tracking-wide">
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
