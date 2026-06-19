"use client";
import React, { useState, useEffect } from "react";
import {
  LayoutDashboard, UserSquare2, FileEdit, Briefcase, Users2, ScanLine,
  Video, ShieldCheck, FileText, GraduationCap, Clock, CalendarCheck,
  TrendingUp, BriefcaseIcon, Building2, Coins, HelpCircle, AlertTriangle,
  LogOut, ChevronDown, ChevronRight, MapPin, Cpu
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
    { id: "asset-request", label: "Asset Request", icon: Cpu, category: "Employee Self Service", roles: ["Employee", "Owner", "Director", "HR Head", "HR Executive"] },

    { id: "hiring", label: "Hiring Approvals", icon: FileEdit, category: "Core Workspace", roles: ["Owner", "Director", "HR Head", "HR Executive", "Department Manager", "Accounts"] },
    { id: "jobs", label: "Vacancy Postings", icon: Briefcase, category: "Core Workspace", roles: ["Owner", "Director", "HR Head", "HR Executive"] },
    { id: "hr-leads", label: "HR Leads", icon: FileText, category: "Core Workspace", roles: ["Owner", "Director", "HR Head", "HR Executive"] },
    { id: "employees", label: "Employees Directory", icon: Users2, category: "Core Workspace", roles: ["Owner", "Director", "HR Head", "HR Executive"] },

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

  const menuItems = allMenuItems.filter(item => item.roles.includes(userRole));

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
      } ${isDark ? "bg-gray-900 border-gray-800" : "bg-slate-50 border-slate-200"}`}
    >
      <div className={`flex items-center gap-2.5 px-4 py-4 border-b ${isDark ? "border-gray-800" : "border-slate-200"}`}>
        <div className="w-8 h-8 rounded-lg bg-purple-600 flex items-center justify-center shrink-0 shadow-sm text-white font-bold text-sm">
          A
        </div>
        <div>
          <div className={`text-sm font-bold leading-tight ${isDark ? "text-white" : "text-slate-900"}`}>Rs9 Group</div>
          <div className="text-[10px] text-purple-500 font-medium tracking-wide uppercase">HRMS</div>
        </div>
      </div>

      <nav className="flex-1 py-3 px-2 space-y-0.5 custom-scrollbar">
        {categories.map((cat) => {
          const isAI = cat === "AI & Vetting Hub";
          const isOpen = openSections[cat];
          const Icon = catIcons[cat] || LayoutDashboard;
          const anyActive = groupedMenu[cat].some(i => i.id === activeTab);

          return (
            <div key={cat}>
              {isAI && (
                <div className={`mx-2 my-3 border-t text-[10px] font-bold uppercase tracking-widest pt-3 ${isDark ? "border-gray-700 text-purple-400" : "border-slate-200 text-purple-600"}`}>
                  ✦ AI Features
                </div>
              )}

              <button
                onClick={() => toggle(cat)}
                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-md text-xs font-semibold transition-all ${anyActive
                    ? isDark ? "bg-purple-900/40 text-purple-300" : "bg-purple-50 text-purple-700"
                    : isDark ? "text-gray-400 hover:bg-gray-800 hover:text-gray-200" : "text-slate-600 hover:bg-white hover:text-slate-800"
                  }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Icon className={`w-4 h-4 shrink-0 ${isAI ? "text-purple-500" : anyActive ? "text-purple-600" : ""}`} />
                  <span className="truncate uppercase">{cat}</span>
                </div>
                {isOpen
                  ? <ChevronDown className="w-3 h-3 shrink-0 opacity-60" />
                  : <ChevronRight className="w-3 h-3 shrink-0 opacity-60" />
                }
              </button>

              {isOpen && (
                <div className="ml-6 mt-0.5 space-y-0.5">
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
                        className={`w-full flex items-center justify-between text-[11px] py-2 px-2 rounded-md font-medium transition-all ${isActive
                            ? isDark ? "bg-gray-800 text-white font-semibold" : "bg-white text-slate-900 font-semibold shadow-sm border border-slate-100"
                            : isDark ? "text-gray-400 hover:bg-gray-800/50 hover:text-gray-200" : "text-slate-500 hover:bg-white/50 hover:text-slate-700"
                          }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className={`w-1 h-1 rounded-full shrink-0 ${isActive ? "bg-purple-600" : isDark ? "bg-gray-600" : "bg-slate-300"}`} />
                          <ItemIcon className={`w-3 h-3 shrink-0 opacity-70`} />
                          <span className="truncate">{item.label}</span>
                        </div>

                        {item.badge !== undefined && item.badge > 0 && (
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${item.urgent
                              ? "bg-rose-500 text-white animate-pulse"
                              : "bg-purple-600 text-white"
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

      <div className={`p-3 border-t ${isDark ? "border-gray-800" : "border-slate-200"}`}>
        <div className={`flex items-center gap-2.5 p-2 rounded-lg ${isDark ? "bg-gray-800" : "bg-white border border-slate-200"}`}>
          <div className="w-7 h-7 rounded-full bg-purple-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
            {user?.name ? user.name[0].toUpperCase() : "U"}
          </div>
          <div className="min-w-0 flex-1 text-left">
            <div className={`text-xs font-semibold truncate ${isDark ? "text-white" : "text-slate-800"}`}>{user?.name || "System User"}</div>
            <div className="text-[10px] text-slate-400 truncate">
              {user?.department || "General"} | {userRole}
            </div>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: `${window.location.origin}/login` })}
            className={`p-1.5 rounded-md hover:bg-rose-50 hover:text-rose-600 transition-colors ${isDark ? "text-gray-400 hover:bg-rose-900/30" : "text-slate-400"}`}
            title="Log Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
