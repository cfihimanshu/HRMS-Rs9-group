"use client";
import React, { useState, useEffect, useMemo } from "react";
import { Search, Shield, ShieldCheck, ShieldAlert, Key, UserCheck, RefreshCw, CheckSquare, Square, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface AdministratorAccessProps {
  userRole?: string;
  triggerToast: (msg: string) => void;
  sessionUser?: any;
}

export default function AdministratorAccess({ userRole, triggerToast, sessionUser }: AdministratorAccessProps) {
  const [employees, setEmployees] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<"admin" | "users">("admin");
  const [activePopover, setActivePopover] = useState<{ userId: string, category: string } | null>(null);
  const [draftAccess, setDraftAccess] = useState<string[]>([]);

  const menuCategories = [
    "Core Workspace",
    "Employee Self Service",
    "AI & Vetting Hub",
    "Training & Probation",
    "Daily Operations",
    "Network Partners",
    "Compliance & Exit"
  ];

  const menuCategoriesWithPages = [
    {
      category: "Core Workspace",
      pages: [
        { id: "dashboard", label: "Owner Dashboard" },
        { id: "hr-dash", label: "HR Dashboard" },
        { id: "dept-dash", label: "Department Dashboard" },
        { id: "hiring", label: "Hiring Approvals" },
        { id: "jobs", label: "Vacancy Postings" },
        { id: "business-leads", label: "HR Leads" },
        { id: "employees", label: "Employees Directory" },
        { id: "bda-directory", label: "BDA Network (Sales)" },
        { id: "assets-registry", label: "Assets Registry" },
        { id: "inventory-management", label: "Inventory Management" },
        { id: "admin-access", label: "Administrator Access" },
        { id: "legal-recovery", label: "Legal Recovery" }
      ]
    },
    {
      category: "Employee Self Service",
      pages: [
        { id: "ess-dashboard", label: "ESS Dashboard" },
        { id: "ess-leaves", label: "Leave Management" },
        { id: "ess-payroll", label: "My Payslips & Salary" },
        { id: "ess-expenses", label: "Expense Claims" },
        { id: "asset-request", label: "Asset Request" }
      ]
    },
    {
      category: "AI & Vetting Hub",
      pages: [
        { id: "screening", label: "AI Screening Module" },
        { id: "interviews", label: "Interviews Queue" },
        { id: "verification", label: "Vetting Checks Registry" },
        { id: "onboarding", label: "NDA Onboarding SLA" }
      ]
    },
    {
      category: "Training & Probation",
      pages: [
        { id: "training", label: "Training Classroom" },
        { id: "probation", label: "6-Month Probation Audit" }
      ]
    },
    {
      category: "Daily Operations",
      pages: [
        { id: "attendance", label: "Attendance Punch & SOD" },
        { id: "tasks", label: "My Tasks (Kanban)" },
        { id: "performance", label: "Work Report" },
        { id: "live-tracking", label: "Live GPS Tracking" },
        { id: "field-visit", label: "Field Visit Logs" },
        { id: "leave-request", label: "Leave Request" }
      ]
    },
    {
      category: "Network Partners",
      pages: [
        { id: "associates", label: "Business Associates" },
        { id: "vendors", label: "Vendor SLA Contracts" },
        { id: "franchise", label: "Franchise Brand Audits" }
      ]
    },
    {
      category: "Compliance & Exit",
      pages: [
        { id: "grievance", label: "Anonymous Grievance" },
        { id: "risks", label: "Critical Risk Warnings" },
        { id: "exit", label: "Exit Separation Clearance" }
      ]
    }
  ];

  const getRoleDefaultPageIds = (role: string) => {
    const SYSTEM_ROLES = [
      "Owner",
      "Director",
      "HR Head",
      "HR Executive",
      "Department Manager",
      "Employee",
      "Accounts",
      "Trainer",
      "IT Admin",
      "DSM",
      "RIBP / Risk Officer",
      "Business Associate",
      "Vendor",
      "Franchisee",
      "Territory Partner"
    ];
    const systemRole = SYSTEM_ROLES.find(r => r.toLowerCase() === role?.toLowerCase()) || "Employee";
    const roleLower = systemRole.toLowerCase();
    
    if (["owner", "director"].includes(roleLower)) {
      const allIds: string[] = [];
      menuCategoriesWithPages.forEach(cat => {
        cat.pages.forEach(p => allIds.push(p.id));
      });
      return allIds;
    }

    const defaultIds: string[] = [];
    const sidebarItems = [
      { id: "dashboard", roles: ["Owner", "Director"] },
      { id: "hr-dash", roles: ["Owner", "Director", "HR Head", "HR Executive"] },
      { id: "dept-dash", roles: ["Owner", "Director", "Department Manager"] },
      { id: "ess-dashboard", roles: ["Employee"] },
      { id: "ess-leaves", roles: ["Employee"] },
      { id: "ess-payroll", roles: ["Owner", "Director", "HR Head", "HR Executive"] },
      { id: "ess-expenses", roles: ["Employee"] },
      { id: "asset-request", roles: ["Employee", "Owner", "Director", "HR Head", "HR Executive", "Department Manager"] },
      { id: "hiring", roles: ["Owner", "Director", "HR Head", "HR Executive", "Department Manager", "Accounts"] },
      { id: "jobs", roles: ["Owner", "Director", "HR Head", "HR Executive"] },
      { id: "hr-leads", roles: ["Owner", "Director", "HR Head", "HR Executive"] },
      { id: "business-leads", roles: ["Owner", "Director", "HR Head", "HR Executive"] },
      { id: "employees", roles: ["Owner", "Director", "HR Head", "HR Executive"] },
      { id: "bda-directory", roles: ["Owner", "Director", "HR Head", "HR Executive", "Department Manager"] },
      { id: "assets-registry", roles: ["Owner", "Director", "HR Head", "HR Executive"] },
      { id: "inventory-management", roles: ["Owner"] },
      { id: "admin-access", roles: ["Owner"] },
      { id: "legal-recovery", roles: ["Owner"] },
      { id: "screening", roles: ["Owner", "Director", "HR Head", "HR Executive"] },
      { id: "interviews", roles: ["Owner", "Director", "HR Head", "HR Executive", "Trainer"] },
      { id: "verification", roles: ["Owner", "Director", "HR Head", "HR Executive", "RIBP / Risk Officer"] },
      { id: "onboarding", roles: ["Owner", "Director", "HR Head", "HR Executive"] },
      { id: "training", roles: ["Owner", "Director", "HR Head", "HR Executive", "Trainer"] },
      { id: "probation", roles: ["Owner", "Director", "HR Head", "HR Executive", "Trainer"] },
      { id: "attendance", roles: ["Owner", "Director", "HR Head", "HR Executive", "Department Manager", "Accounts", "Trainer", "IT Admin", "DSM", "RIBP / Risk Officer"] },
      { id: "tasks", roles: ["Owner", "Director", "HR Head", "HR Executive", "Department Manager", "Accounts", "Trainer", "Employee", "IT Admin", "DSM", "RIBP / Risk Officer"] },
      { id: "performance", roles: ["Owner", "Director", "HR Head", "HR Executive", "Department Manager", "Employee"] },
      { id: "live-tracking", roles: ["Owner", "Director", "HR Head", "Department Manager"] },
      { id: "field-visit", roles: ["Owner", "Director", "HR Head", "HR Executive", "Department Manager", "Employee"] },
      { id: "leave-request", roles: ["Owner", "Director", "HR Head", "HR Executive", "Department Manager", "Accounts", "Trainer", "Employee", "IT Admin", "DSM", "RIBP / Risk Officer", "Business Associate", "Vendor", "Franchisee", "Territory Partner"] },
      { id: "associates", roles: ["Owner", "Director", "HR Head", "Franchisee", "Territory Partner", "Business Associate"] },
      { id: "vendors", roles: ["Owner", "Director", "HR Head", "Accounts", "Vendor"] },
      { id: "franchise", roles: ["Owner", "Director", "HR Head", "Accounts", "Franchisee", "Territory Partner"] },
      { id: "grievance", roles: ["Owner", "Director", "HR Head", "HR Executive", "Department Manager", "Accounts", "Trainer", "Business Associate", "Vendor", "Franchisee", "Territory Partner"] },
      { id: "risks", roles: ["Owner", "Director", "HR Head", "RIBP / Risk Officer"] },
      { id: "exit", roles: ["Owner", "Director", "HR Head", "Employee"] }
    ];

    sidebarItems.forEach(item => {
      if (item.roles.some(r => r.toLowerCase() === roleLower)) {
        defaultIds.push(item.id);
      }
    });

    return defaultIds;
  };

  const getEmployeeAccess = (emp: any): string[] => {
    let currentAccess: string[] = [];
    if (Array.isArray(emp.menuAccess) && emp.menuAccess.length > 0) {
      currentAccess = emp.menuAccess.map(String);
    } else if (typeof emp.menuAccess === "string" && emp.menuAccess) {
      try {
        const parsed = JSON.parse(emp.menuAccess);
        if (Array.isArray(parsed) && parsed.length > 0) {
          currentAccess = parsed.map(String);
        } else {
          currentAccess = getRoleDefaultPageIds(emp.role);
        }
      } catch {
        currentAccess = getRoleDefaultPageIds(emp.role);
      }
    } else {
      currentAccess = getRoleDefaultPageIds(emp.role);
    }
    return currentAccess;
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [empRes, compRes, deptRes] = await Promise.all([
        fetch("/api/employees"),
        fetch("/api/companies"),
        fetch("/api/departments")
      ]);

      const [empData, compData, deptData] = await Promise.all([
        empRes.json(),
        compRes.json(),
        deptRes.json()
      ]);

      if (empRes.ok) setEmployees(empData.data || []);
      if (compRes.ok) setCompanies(compData.data || []);
      if (deptRes.ok) setDepartments(deptData.data || []);
    } catch (error) {
      console.error("Error fetching admin access data:", error);
      triggerToast("Failed to load users or companies data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Find the Administration department
  const adminDept = useMemo(() => {
    return departments.find(d => d.name?.toLowerCase().includes("administration"));
  }, [departments]);

  // Filtered employees list
  const displayEmployees = useMemo(() => {
    return employees.filter(emp => {
      // If we are in "admin" tab, only show administrators
      if (activeSubTab === "admin") {
        const isCurrentlyAdmin = emp.employeeProfile?.department?.id === adminDept?.id ||
          emp.employeeProfile?.department === adminDept?.id ||
          String(emp.employeeProfile?.department?.name || emp.employeeProfile?.department || "").toLowerCase().includes("administration");
        if (!isCurrentlyAdmin) return false;
      }

      const q = searchQuery.toLowerCase();
      if (!q) return true;

      const nameMatch = emp.name?.toLowerCase().includes(q);
      const emailMatch = emp.email?.toLowerCase().includes(q);
      const roleMatch = emp.role?.toLowerCase().includes(q);
      return nameMatch || emailMatch || roleMatch;
    });
  }, [employees, adminDept, searchQuery, activeSubTab]);

  const handleToggleAdmin = async (emp: any) => {
    const isCurrentlyAdmin = emp.employeeProfile?.department?.id === adminDept?.id ||
      emp.employeeProfile?.department === adminDept?.id ||
      String(emp.employeeProfile?.department?.name || emp.employeeProfile?.department || "").toLowerCase().includes("administration");

    if (!adminDept) {
      triggerToast("Administration department is not configured in the system.");
      return;
    }

    try {
      setSavingUserId(emp.id);
      const newDeptId = isCurrentlyAdmin ? "" : adminDept.id;

      const payload: any = {
        employeeId: emp.employeeProfile?.employeeId,
        department: newDeptId
      };

      // If becoming an admin and companies list is empty, pre-fill with their own company
      let currentComps: string[] = [];
      if (Array.isArray(emp.companies)) {
        currentComps = emp.companies.map((c: any) => String(c.id || c));
      }
      if (!isCurrentlyAdmin && currentComps.length === 0) {
        // Try to get their default company
        let defaultCompId = "";
        if (emp.employeeProfile?.company) {
          defaultCompId = String(emp.employeeProfile.company.id || emp.employeeProfile.company);
        }
        if (!defaultCompId && companies.length > 0) {
          defaultCompId = String(companies[0].id);
        }
        if (defaultCompId) {
          payload.companies = [defaultCompId];
        }
      }

      const res = await fetch("/api/employees", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data.success) {
        triggerToast(isCurrentlyAdmin ? `Removed Admin access for ${emp.name}` : `Granted Admin access for ${emp.name}`);
        fetchData();
      } else {
        triggerToast(data.error || "Failed to update admin department");
      }
    } catch (error) {
      console.error(error);
      triggerToast("An error occurred during update");
    } finally {
      setSavingUserId(null);
    }
  };

  const handleToggleCompany = async (emp: any, companyId: string) => {
    let currentComps: string[] = [];
    if (Array.isArray(emp.companies)) {
      currentComps = emp.companies.map((c: any) => String(c.id || c));
    } else if (typeof emp.companies === "string") {
      try {
        const parsed = JSON.parse(emp.companies);
        if (Array.isArray(parsed)) currentComps = parsed.map(String);
      } catch { }
    }

    const isChecked = currentComps.includes(String(companyId));
    let updatedComps: string[];
    if (isChecked) {
      updatedComps = currentComps.filter(id => id !== String(companyId));
    } else {
      updatedComps = [...currentComps, String(companyId)];
    }

    const isCurrentlyAdmin = emp.employeeProfile?.department?.id === adminDept?.id ||
      emp.employeeProfile?.department === adminDept?.id ||
      String(emp.employeeProfile?.department?.name || emp.employeeProfile?.department || "").toLowerCase().includes("administration");

    try {
      setSavingUserId(emp.id);

      const payload: any = {
        employeeId: emp.employeeProfile?.employeeId,
        companies: updatedComps
      };

      // Auto-assign to Administration department if they are granted any company access and not currently an admin
      if (!isChecked && !isCurrentlyAdmin && adminDept) {
        payload.department = adminDept.id;
        triggerToast(`Added ${emp.name} to Administration department`);
      }

      const res = await fetch("/api/employees", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data.success) {
        triggerToast(`Updated company access for ${emp.name}`);
        fetchData();
      } else {
        triggerToast(data.error || "Failed to update company access");
      }
    } catch (error) {
      console.error(error);
      triggerToast("An error occurred during company update");
    } finally {
      setSavingUserId(null);
    }
  };

  const handleOpenPopover = (emp: any, cat: string) => {
    const currentAccess = getEmployeeAccess(emp);
    setDraftAccess(currentAccess);
    setActivePopover({ userId: emp.id, category: cat });
  };

  const handleToggleDraftPage = (pageId: string) => {
    setDraftAccess(prev =>
      prev.includes(pageId) ? prev.filter(id => id !== pageId) : [...prev, pageId]
    );
  };

  const handleDraftCategoryAll = (categoryName: string, checkAll: boolean) => {
    const catPages = menuCategoriesWithPages.find(c => c.category === categoryName)?.pages || [];
    const catPageIds = catPages.map(p => p.id);
    if (checkAll) {
      setDraftAccess(prev => Array.from(new Set([...prev, ...catPageIds])));
    } else {
      setDraftAccess(prev => prev.filter(id => !catPageIds.includes(id)));
    }
  };

  const handleSaveDraftAccess = async (emp: any) => {
    try {
      setSavingUserId(emp.id);
      const payload: any = {
        employeeId: emp.employeeProfile?.employeeId,
        menuAccess: draftAccess
      };
      const res = await fetch("/api/employees", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        triggerToast(`Assigned page permissions successfully for ${emp.name}`);
        fetchData();
        setActivePopover(null);
      } else {
        triggerToast(data.error || "Failed to assign page permissions");
      }
    } catch (error) {
      console.error(error);
      triggerToast("An error occurred during save");
    } finally {
      setSavingUserId(null);
    }
  };

  if (sessionUser?.role !== "Owner") {
    return (
      <div className="bg-white border border-[#E8E4DF] rounded-2xl p-12 text-center shadow-sm">
        <ShieldAlert className="w-8 h-8 text-rose-500 mx-auto mb-2" />
        <p className="text-[#1C1C1A] text-sm font-bold uppercase tracking-widest">Access Denied</p>
        <p className="text-[#9C9890] text-xs mt-1">This page is restricted to Owners only.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-serif font-light text-[#1C1C1A]" style={{ fontFamily: "'Playfair Display', serif" }}>
            Administrator Access Control
          </h1>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="p-2 bg-[#FCFBF9] hover:bg-[#F5F0EA] border border-[#E8E4DF] text-[#5D5B57] hover:text-[#1C1C1A] rounded-xl transition-all shadow-sm"
        >
          <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
        </button>
      </div>

      {/* Sub-Tabs Selector */}
      <div className="flex bg-[#F5F0EA]/60 p-1 rounded-xl border border-[#E8E4DF] max-w-[340px]">
        <button
          type="button"
          onClick={() => setActiveSubTab("admin")}
          className={cn(
            "flex-1 px-4 py-2 text-[10px] uppercase font-bold tracking-wider rounded-lg transition-all",
            activeSubTab === "admin"
              ? "bg-[#C9A84C] text-white shadow-sm"
              : "text-[#5D5B57] hover:text-[#1C1C1A]"
          )}
        >
          Admin Access
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab("users")}
          className={cn(
            "flex-1 px-4 py-2 text-[10px] uppercase font-bold tracking-wider rounded-lg transition-all",
            activeSubTab === "users"
              ? "bg-[#C9A84C] text-white shadow-sm"
              : "text-[#5D5B57] hover:text-[#1C1C1A]"
          )}
        >
          Users Access
        </button>
      </div>

      {/* Filter and Search */}
      <div className="bg-[#FCFBF9] border border-[#E8E4DF] p-4 rounded-xl">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9C9890]" />
          <input
            type="text"
            placeholder="Search users by name, email, department..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg pl-9 pr-3 py-2 text-xs text-[#1C1C1A] placeholder-[#9C9890] focus:outline-none transition-all font-sans"
          />
        </div>
      </div>

      {/* Users Table */}
      {loading ? (
        <div className="bg-white border border-[#E8E4DF] rounded-2xl p-12 text-center shadow-sm">
          <RefreshCw className="w-8 h-8 text-[#C9A84C] animate-spin mx-auto mb-3" />
          <p className="text-[#9C9890] text-xs uppercase tracking-widest font-semibold">Loading access controls...</p>
        </div>
      ) : displayEmployees.length === 0 ? (
        <div className="bg-white border border-[#E8E4DF] rounded-2xl p-12 text-center shadow-sm">
          <ShieldAlert className="w-8 h-8 text-[#9C9890] mx-auto mb-2" />
          <p className="text-[#9C9890] text-xs uppercase tracking-widest font-semibold">No users found matching search query</p>
        </div>
      ) : (
        <div className="bg-white border border-[#E8E4DF] rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-[#E8E4DF] bg-[#F5F0EA]/30 text-[#5D5B57] text-[10px] uppercase font-bold tracking-wider">
                  <th className="py-4 px-6 font-bold">User Information</th>
                  <th className="py-4 px-4 font-bold text-center">Is Admin?</th>
                  {activeSubTab === "admin" ? (
                    companies.map(comp => (
                      <th key={comp.id} className="py-4 px-4 font-bold text-center text-[9px] max-w-[120px] truncate" title={comp.name}>
                        {comp.name}
                      </th>
                    ))
                  ) : (
                    menuCategories.map(cat => (
                      <th key={cat} className="py-4 px-2 font-bold text-center text-[8px] max-w-[100px] truncate" title={cat}>
                        {cat}
                      </th>
                    ))
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8E4DF] text-xs">
                {displayEmployees.map((emp) => {
                  const isUserSaving = savingUserId === emp.id;

                  const isCurrentlyAdmin = emp.employeeProfile?.department?.id === adminDept?.id ||
                    emp.employeeProfile?.department === adminDept?.id ||
                    String(emp.employeeProfile?.department?.name || emp.employeeProfile?.department || "").toLowerCase().includes("administration");

                  let userCompIds: string[] = [];
                  if (Array.isArray(emp.companies)) {
                    userCompIds = emp.companies.map((c: any) => String(c.id || c));
                  } else if (typeof emp.companies === "string") {
                    try {
                      const parsed = JSON.parse(emp.companies);
                      if (Array.isArray(parsed)) userCompIds = parsed.map(String);
                    } catch { }
                  }

                  const userDeptName = emp.employeeProfile?.department?.name || emp.employeeProfile?.department || "No Department";
                  const initial = emp.name ? emp.name.charAt(0).toUpperCase() : "?";

                  return (
                    <tr key={emp.id} className={cn("hover:bg-[#FAFAF7]/50 transition-colors", isUserSaving && "opacity-60 pointer-events-none")}>
                      {/* User Info */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-[#F5F0EA] border border-[#E8E4DF] text-[#5D5B57] flex items-center justify-center font-serif text-sm font-light">
                            {initial}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                              {emp.name}
                              {isCurrentlyAdmin && (
                                <span className="px-1.5 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-600 text-[8px] uppercase tracking-wider font-bold">
                                  Admin
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-[#9C9890]">{emp.email}</div>
                            <div className="text-[9px] text-[#5D5B57] mt-0.5 uppercase tracking-wider font-medium">
                              {userDeptName} &bull; {emp.role || "Employee"}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Admin Toggle */}
                      <td className="py-4 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleAdmin(emp)}
                          className={cn(
                            "mx-auto flex items-center justify-center w-8 h-8 rounded-xl border transition-all shadow-sm",
                            isCurrentlyAdmin
                              ? "bg-emerald-50 border-emerald-200 text-emerald-600 hover:bg-emerald-100"
                              : "bg-white border-[#E8E4DF] text-[#9C9890] hover:text-[#1C1C1A] hover:bg-[#F5F0EA]/40"
                          )}
                        >
                          {isCurrentlyAdmin ? <ShieldCheck className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
                        </button>
                      </td>

                      {/* Toggle-based Access Checkboxes */}
                      {activeSubTab === "admin" ? (
                        companies.map(comp => {
                          const isChecked = userCompIds.includes(String(comp.id));
                          return (
                            <td key={comp.id} className="py-4 px-4 text-center">
                              <button
                                type="button"
                                onClick={() => handleToggleCompany(emp, comp.id)}
                                className={cn(
                                  "mx-auto flex items-center justify-center w-6 h-6 rounded-md transition-all",
                                  isChecked
                                    ? "text-[#C9A84C] hover:scale-105"
                                    : "text-[#E8E4DF] hover:text-[#9C9890]"
                                )}
                              >
                                {isChecked
                                  ? <CheckSquare className="w-4 h-4" />
                                  : <Square className="w-4 h-4" />
                                }
                              </button>
                            </td>
                          );
                        })
                      ) : (
                        menuCategories.map(cat => {
                          const catPages = menuCategoriesWithPages.find(c => c.category === cat)?.pages || [];
                          const currentAccess = getEmployeeAccess(emp);

                          const checkedPages = catPages.filter(p => currentAccess.includes(p.id));
                          const checkedCount = checkedPages.length;
                          const totalCount = catPages.length;
                          const isAllChecked = checkedCount === totalCount;
                          const isSomeChecked = checkedCount > 0 && checkedCount < totalCount;

                          return (
                            <td key={cat} className="py-4 px-2 text-center relative">
                              <button
                                type="button"
                                onClick={() => handleOpenPopover(emp, cat)}
                                className={cn(
                                  "mx-auto flex items-center gap-1.5 px-2 py-1 rounded-lg border transition-all text-[9px] font-bold tracking-wider",
                                  isAllChecked
                                    ? "bg-[#C9A84C]/5 border-[#C9A84C] text-[#C9A84C]"
                                    : isSomeChecked
                                      ? "bg-[#C9A84C]/5 border-[#C9A84C]/50 text-[#C9A84C]/80"
                                      : "bg-white border-[#E8E4DF] text-[#9C9890] hover:text-[#1C1C1A] hover:bg-[#F5F0EA]/40"
                                )}
                              >
                                {isAllChecked ? (
                                  <CheckSquare className="w-3.5 h-3.5" />
                                ) : isSomeChecked ? (
                                  <div className="w-3.5 h-3.5 border border-current rounded flex items-center justify-center shrink-0">
                                    <div className="w-1.5 h-[1px] bg-current" />
                                  </div>
                                ) : (
                                  <Square className="w-3.5 h-3.5" />
                                )}
                                <span>{checkedCount}/{totalCount}</span>
                              </button>

                              {activePopover?.userId === emp.id && activePopover?.category === cat && (
                                <>
                                  <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setActivePopover(null)} />
                                  <div className="absolute right-0 mt-2 w-60 bg-[#FCFBF9] border border-[#E8E4DF] rounded-xl shadow-xl z-50 p-3 text-left animate-fadeIn">
                                    <div className="flex justify-between items-center mb-2 pb-1 border-b border-[#E8E4DF]">
                                      <span className="text-[9px] font-black uppercase text-[#C9A84C] tracking-widest truncate max-w-[130px]" title={cat}>{cat}</span>
                                      <div className="flex gap-1.5 items-center">
                                        <button
                                          type="button"
                                          onClick={() => handleDraftCategoryAll(cat, true)}
                                          className="text-[9px] text-[#C9A84C] hover:underline font-bold"
                                        >
                                          All
                                        </button>
                                        <span className="text-[#E8E4DF] text-[10px] font-bold">|</span>
                                        <button
                                          type="button"
                                          onClick={() => handleDraftCategoryAll(cat, false)}
                                          className="text-[9px] text-slate-400 hover:underline font-bold"
                                        >
                                          None
                                        </button>
                                      </div>
                                    </div>
                                    
                                    <div className="max-h-48 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                                      {catPages.map(page => {
                                        const isPageChecked = draftAccess.includes(page.id);
                                        return (
                                          <label
                                            key={page.id}
                                            className="flex items-center gap-2 px-1.5 py-1 rounded-lg hover:bg-[#F5F0EA]/40 cursor-pointer transition-all text-[10px] text-[#5D5B57] hover:text-[#1C1C1A] font-medium"
                                          >
                                            <input
                                              type="checkbox"
                                              checked={isPageChecked}
                                              onChange={() => handleToggleDraftPage(page.id)}
                                              className="rounded border-[#E8E4DF] text-[#C9A84C] focus:ring-[#C9A84C] w-3 h-3 accent-[#C9A84C]"
                                            />
                                            <span className="truncate">{page.label}</span>
                                          </label>
                                        );
                                      })}
                                    </div>

                                    <button
                                      type="button"
                                      onClick={() => handleSaveDraftAccess(emp)}
                                      className="w-full mt-3 py-1.5 bg-[#C9A84C] hover:bg-[#B8973B] text-white rounded-lg text-[9px] font-bold uppercase tracking-widest shadow-sm transition-all flex items-center justify-center gap-1.5"
                                    >
                                      <CheckCircle2 className="w-3.5 h-3.5" />
                                      Assign Access
                                    </button>
                                  </div>
                                </>
                              )}
                            </td>
                          );
                        })
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
