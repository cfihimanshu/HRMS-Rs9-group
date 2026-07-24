"use client";
import React, { useState, useEffect, useMemo } from "react";
import { Search, Shield, ShieldCheck, ShieldAlert, Key, UserCheck, RefreshCw, CheckSquare, Square, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface AdministratorAccessProps {
  userRole?: string;
  triggerToast: (msg: string) => void;
  sessionUser?: any;
}

function UserSearchCombobox({
  employees,
  selectedUserIds,
  onSelectUser,
  forceUpward = false
}: {
  employees: any[];
  selectedUserIds: string[];
  onSelectUser: (userId: string) => void;
  forceUpward?: boolean;
}) {
  const [query, setQuery] = React.useState("");
  const [isOpen, setIsOpen] = React.useState(false);
  const [openUpward, setOpenUpward] = React.useState(forceUpward);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const checkDirection = () => {
    if (forceUpward) {
      setOpenUpward(true);
      return;
    }
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      setOpenUpward(spaceBelow < 220);
    }
  };

  const filtered = React.useMemo(() => {
    return employees.filter(emp => {
      if (selectedUserIds.includes(emp.id)) return false;
      if (!query.trim()) return true;
      const q = query.toLowerCase();
      return (
        emp.name?.toLowerCase().includes(q) ||
        emp.email?.toLowerCase().includes(q) ||
        emp.role?.toLowerCase().includes(q)
      );
    });
  }, [employees, selectedUserIds, query]);

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative max-w-sm w-full">
      <div className="relative">
        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={query}
          onFocus={() => {
            checkDirection();
            setIsOpen(true);
          }}
          onChange={(e) => {
            checkDirection();
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          placeholder="🔍 Type to search &amp; select user..."
          className="w-full text-xs pl-8 pr-3 py-2 border border-[#E8E4DF] focus:border-[#C9A84C] rounded-xl bg-white font-bold text-slate-800 placeholder:text-slate-400 placeholder:font-medium focus:outline-none transition-all shadow-2xs"
        />
      </div>

      {isOpen && (
        <div
          className={`absolute z-[9999] left-0 ${openUpward ? "bottom-full mb-1.5" : "top-full mt-1.5"
            } w-full bg-white border border-[#E8E4DF] rounded-xl shadow-2xl max-h-44 overflow-y-auto custom-scrollbar p-1.5 animate-in fade-in duration-150`}
        >
          {filtered.map(emp => (
            <button
              key={emp.id}
              type="button"
              onClick={() => {
                onSelectUser(emp.id);
                setQuery("");
                setIsOpen(false);
              }}
              className="w-full text-left p-2 hover:bg-[#F5F0EA] rounded-lg transition-colors flex items-center justify-between gap-2 text-xs"
            >
              <div className="truncate">
                <span className="font-bold text-slate-800 block truncate">{emp.name || "Employee"}</span>
                <span className="text-[10px] text-slate-400 font-medium truncate block">{emp.email} &bull; {emp.role || "User"}</span>
              </div>
              <span className="text-[10px] font-bold text-[#C9A84C] bg-[#C9A84C]/10 px-2 py-0.5 rounded border border-[#C9A84C]/30 shrink-0">+ Add</span>
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="p-3 text-center text-[11px] text-slate-400 font-medium">
              No matching users found
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function RequesterOverrideSelector({
  employees,
  currentOverrides,
  onAddOverride,
  onRemoveOverride,
}: {
  employees: any[];
  currentOverrides: Array<{ applicantId: string; approverUserIds: string[] }>;
  onAddOverride: (reqId: string, appId: string) => void;
  onRemoveOverride: (reqId: string) => void;
}) {
  const [reqId, setReqId] = useState("");
  const [appId, setAppId] = useState("");

  return (
    <div className="pt-3 border-t border-slate-100 space-y-3">
      <label className="text-[11px] font-black uppercase text-indigo-600 tracking-wider block">
        ⚡ Requester Specific Override Rules (Optional):
      </label>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
        <div className="flex-1">
          <label className="text-[9px] uppercase font-bold text-slate-400 block mb-0.5">When Request Created By:</label>
          <select
            value={reqId}
            onChange={(e) => setReqId(e.target.value)}
            className="w-full text-xs font-bold bg-white border border-slate-200 rounded-lg p-1.5 focus:outline-none focus:border-indigo-500"
          >
            <option value="">Select Requester Employee...</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.name} ({emp.role || "User"})
              </option>
            ))}
          </select>
        </div>

        <span className="text-xs font-black text-indigo-500 self-center text-center">➔</span>

        <div className="flex-1">
          <label className="text-[9px] uppercase font-bold text-slate-400 block mb-0.5">Route Approval Specifically To:</label>
          <select
            value={appId}
            onChange={(e) => setAppId(e.target.value)}
            className="w-full text-xs font-bold bg-white border border-slate-200 rounded-lg p-1.5 focus:outline-none focus:border-indigo-500"
          >
            <option value="">Select Target Approver...</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.name} ({emp.role || "User"})
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          disabled={!reqId || !appId || reqId === appId}
          onClick={() => {
            if (reqId && appId && reqId !== appId) {
              onAddOverride(reqId, appId);
              setReqId("");
              setAppId("");
            }
          }}
          className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-lg text-xs font-bold transition-all self-end sm:self-center shrink-0"
        >
          + Add Override Pair
        </button>
      </div>

      {/* Active Override Pair Badges */}
      {currentOverrides && currentOverrides.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-1">
          {currentOverrides.map((ov) => {
            const reqEmp = employees.find((e: any) => e.id === ov.applicantId);
            const targetAppId = ov.approverUserIds?.[0];
            const appEmp = employees.find((e: any) => e.id === targetAppId);

            return (
              <span
                key={ov.applicantId}
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-900 border border-indigo-200 rounded-xl text-xs font-bold shadow-2xs"
              >
                <span>⚡ {reqEmp ? reqEmp.name : ov.applicantId} ➔ Approver: <strong className="text-indigo-700">{appEmp ? appEmp.name : targetAppId}</strong></span>
                <button
                  type="button"
                  onClick={() => onRemoveOverride(ov.applicantId)}
                  className="text-indigo-600 hover:text-indigo-950 font-black ml-1 text-sm leading-none"
                  title="Remove Override Pair"
                >
                  &times;
                </button>
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function AdministratorAccess({ userRole, triggerToast, sessionUser }: AdministratorAccessProps) {
  const [employees, setEmployees] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<"admin" | "users" | "approval-matrix">("admin");
  const [activePopover, setActivePopover] = useState<{ userId: string, category: string } | null>(null);
  const [draftAccess, setDraftAccess] = useState<string[]>([]);
  const [approvalMatrix, setApprovalMatrix] = useState<any[]>([]);
  const [loadingMatrix, setLoadingMatrix] = useState<boolean>(false);
  const [savingFormKey, setSavingFormKey] = useState<string | null>(null);

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
        { id: "attendance", label: "Attendance & Leaves" },
        { id: "tasks", label: "Tasks & Projects" },
        { id: "performance", label: "Performance Matrix" },
        { id: "live-tracking", label: "Live Location Tracking" },
        { id: "field-visit", label: "Field Visit Entries" },
        { id: "leave-request", label: "Leave Requests" }
      ]
    },
    {
      category: "Network Partners",
      pages: [
        { id: "associates", label: "Business Associates" },
        { id: "vendors", label: "Vendors Registry" },
        { id: "franchise", label: "Franchise Network" }
      ]
    },
    {
      category: "Compliance & Exit",
      pages: [
        { id: "grievance", label: "Grievance Redressal" },
        { id: "risks", label: "Risk & Incident Log" },
        { id: "exit", label: "Exit Management" }
      ]
    }
  ];

  const fetchData = async () => {
    try {
      setLoading(true);
      const [empRes, compRes, deptRes] = await Promise.all([
        fetch("/api/employees"),
        fetch("/api/companies"),
        fetch("/api/departments")
      ]);

      const empData = await empRes.json();
      const compData = await compRes.json();
      const deptData = await deptRes.json();

      if (empData.success) setEmployees(empData.data || []);
      if (compData.success) setCompanies(compData.data || []);
      if (deptData.success) setDepartments(deptData.data || []);
    } catch (error) {
      console.error(error);
      triggerToast("Error loading administrator data");
    } finally {
      setLoading(false);
    }
  };

  const fetchApprovalMatrix = async () => {
    setLoadingMatrix(true);
    try {
      const res = await fetch("/api/admin/approval-matrix");
      const data = await res.json();
      if (data.success) {
        setApprovalMatrix(data.data || []);
      }
    } catch (err) {
      console.error("Failed to fetch approval matrix:", err);
    } finally {
      setLoadingMatrix(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (activeSubTab === "approval-matrix") {
      fetchApprovalMatrix();
    }
  }, [activeSubTab]);

  const adminDept = useMemo(() => {
    return departments.find((d: any) => d.name?.toLowerCase().includes("administration"));
  }, [departments]);

  const getEmployeeAccess = (emp: any): string[] => {
    if (emp.menuAccess && Array.isArray(emp.menuAccess)) {
      return emp.menuAccess;
    }
    if (typeof emp.menuAccess === "string") {
      try {
        const parsed = JSON.parse(emp.menuAccess);
        if (Array.isArray(parsed)) return parsed;
      } catch { }
    }

    const role = emp.role || "Employee";
    const SYSTEM_ROLES = [
      "Owner",
      "Director",
      "HR Head",
      "HR Executive",
      "Department Manager",
      "Accounts",
      "Trainer",
      "Employee",
      "IT Admin",
      "IT MANAGER",
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
      { id: "ess-expenses", roles: ["Owner", "Director", "HR Head", "HR Executive", "Department Manager", "Accounts", "Employee"] },
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

  const displayEmployees = useMemo(() => {
    return employees.filter(emp => {
      if (activeSubTab === "admin") {
        const isAdmin = emp.employeeProfile?.department?.id === adminDept?.id ||
          emp.employeeProfile?.department === adminDept?.id ||
          String(emp.employeeProfile?.department?.name || emp.employeeProfile?.department || "").toLowerCase().includes("administration");
        if (!isAdmin) return false;
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

      let currentComps: string[] = [];
      if (Array.isArray(emp.companies)) {
        currentComps = emp.companies.map((c: any) => String(c.id || c));
      }
      if (!isCurrentlyAdmin && currentComps.length === 0) {
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
    try {
      setSavingUserId(emp.id);
      let currentComps: string[] = [];
      if (Array.isArray(emp.companies)) {
        currentComps = emp.companies.map((c: any) => String(c.id || c));
      }

      let newComps: string[];
      if (currentComps.includes(companyId)) {
        newComps = currentComps.filter(c => c !== companyId);
      } else {
        newComps = [...currentComps, companyId];
      }

      const payload = {
        employeeId: emp.employeeProfile?.employeeId,
        companies: newComps
      };

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
    const access = getEmployeeAccess(emp);
    setDraftAccess(access);
    setActivePopover({ userId: emp.id, category: cat });
  };

  const handleToggleAllCategoryPages = async (emp: any, category: string) => {
    const currentAccess = getEmployeeAccess(emp);
    const catPages = menuCategoriesWithPages.find(c => c.category === category)?.pages || [];
    const catPageIds = catPages.map(p => p.id);

    const isAllSelected = catPageIds.every(id => currentAccess.includes(id));
    let newAccess: string[];

    if (isAllSelected) {
      newAccess = currentAccess.filter(id => !catPageIds.includes(id));
    } else {
      const combined = new Set([...currentAccess, ...catPageIds]);
      newAccess = Array.from(combined);
    }

    try {
      setSavingUserId(emp.id);
      const payload = {
        employeeId: emp.employeeProfile?.employeeId,
        menuAccess: newAccess
      };

      const res = await fetch("/api/employees", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data.success) {
        triggerToast(`Updated ${category} permissions for ${emp.name}`);
        fetchData();
      } else {
        triggerToast(data.error || "Failed to update page permissions");
      }
    } catch (error) {
      console.error(error);
      triggerToast("An error occurred during update");
    } finally {
      setSavingUserId(null);
    }
  };

  const handleSaveDraftAccess = async (emp: any) => {
    try {
      setSavingUserId(emp.id);
      const payload = {
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

  const handleSaveMatrixRule = async (item: any) => {
    setSavingFormKey(item.formKey);
    try {
      const res = await fetch("/api/admin/approval-matrix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          formKey: item.formKey,
          formName: item.formName,
          category: item.category,
          approverRoles: item.approverRoles || [],
          approverUsers: item.approverUsers || [],
          userOverrides: item.userOverrides || [],
          notifyEmail: item.notifyEmail !== undefined ? item.notifyEmail : true,
          notifyApp: item.notifyApp !== undefined ? item.notifyApp : true,
        }),
      });
      const data = await res.json();
      if (data.success) {
        triggerToast(`✓ Approval routing saved for ${item.formName}!`);
        fetchApprovalMatrix();
      } else {
        triggerToast("Failed to save routing: " + (data.error || "Unknown error"));
      }
    } catch (err: any) {
      triggerToast("Error saving matrix: " + err.message);
    } finally {
      setSavingFormKey(null);
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
      <div className="flex bg-[#F5F0EA]/60 p-1 rounded-xl border border-[#E8E4DF] max-w-[560px]">
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
        <button
          type="button"
          onClick={() => setActiveSubTab("approval-matrix")}
          className={cn(
            "flex-1 px-4 py-2 text-[10px] uppercase font-bold tracking-wider rounded-lg transition-all flex items-center justify-center gap-1",
            activeSubTab === "approval-matrix"
              ? "bg-[#C9A84C] text-white shadow-sm"
              : "text-[#5D5B57] hover:text-[#1C1C1A]"
          )}
        >
          <ShieldCheck className="w-3.5 h-3.5" /> Request Routing Matrix
        </button>
      </div>

      {activeSubTab !== "approval-matrix" && (
        <>
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
            <div className="bg-white border border-[#E8E4DF] rounded-2xl overflow-visible shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-[#E8E4DF] bg-[#F5F0EA]/30 text-[#5D5B57] text-[10px] uppercase font-bold tracking-wider">
                      <th className="py-4 px-6 font-bold">User Information</th>
                      <th className="py-4 px-4 font-bold text-center">Is Admin?</th>
                      {activeSubTab === "admin" ? (
                        companies.map(comp => (
                          <th key={comp.id} className="py-4 px-4 font-bold text-center text-[9px] max-w-[120px] truncate" title={comp.companyName || comp.name}>
                            {comp.companyName || comp.name}
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
                                    {isChecked ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
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
                              const isPopoverOpen = activePopover?.userId === emp.id && activePopover?.category === cat;

                              return (
                                <td key={cat} className="py-4 px-2 text-center relative">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (isPopoverOpen) {
                                        setActivePopover(null);
                                      } else {
                                        handleOpenPopover(emp, cat);
                                      }
                                    }}
                                    className={cn(
                                      "mx-auto flex items-center gap-1.5 px-2 py-1 rounded-lg border transition-all text-[9px] font-bold tracking-wider",
                                      isAllChecked
                                        ? "bg-[#C9A84C]/10 border-[#C9A84C] text-[#C9A84C]"
                                        : isSomeChecked
                                          ? "bg-[#C9A84C]/5 border-[#C9A84C]/50 text-[#C9A84C]/80"
                                          : "bg-white border-[#E8E4DF] text-[#9C9890] hover:text-[#1C1C1A] hover:bg-[#F5F0EA]/40"
                                    )}
                                  >
                                    {isAllChecked ? (
                                      <CheckSquare className="w-3.5 h-3.5" />
                                    ) : isSomeChecked ? (
                                      <div className="w-3.5 h-3.5 border border-current rounded flex items-center justify-center shrink-0">
                                        <div className="w-2 h-2 bg-current rounded-xs" />
                                      </div>
                                    ) : (
                                      <Square className="w-3.5 h-3.5" />
                                    )}
                                    <span>{checkedCount}/{totalCount}</span>
                                  </button>

                                  {/* Popover Dropdown */}
                                  {isPopoverOpen && (
                                    <div className="absolute z-[9999] top-full mt-1.5 left-1/2 -translate-x-1/2 w-64 bg-white border border-[#E8E4DF] rounded-2xl shadow-2xl p-4 text-left animate-in fade-in duration-150">
                                      <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
                                        <div>
                                          <h5 className="text-xs font-black text-slate-800 uppercase tracking-wider">{cat}</h5>
                                          <p className="text-[10px] text-slate-400 font-medium truncate max-w-[170px]">{emp.name}</p>
                                        </div>
                                        <button
                                          type="button"
                                          onClick={() => setActivePopover(null)}
                                          className="text-slate-400 hover:text-slate-600 text-base font-bold leading-none p-1"
                                        >
                                          &times;
                                        </button>
                                      </div>

                                      <div className="space-y-1.5 max-h-52 overflow-y-auto custom-scrollbar pr-1">
                                        {catPages.map(page => {
                                          const isPageSelected = draftAccess.includes(page.id);
                                          return (
                                            <label
                                              key={page.id}
                                              className="flex items-center gap-2.5 p-1.5 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors text-xs text-slate-700 font-medium"
                                            >
                                              <input
                                                type="checkbox"
                                                checked={isPageSelected}
                                                onChange={(e) => {
                                                  if (e.target.checked) {
                                                    setDraftAccess(prev => [...prev, page.id]);
                                                  } else {
                                                    setDraftAccess(prev => prev.filter(id => id !== page.id));
                                                  }
                                                }}
                                                className="rounded text-amber-600 focus:ring-amber-500 w-3.5 h-3.5"
                                              />
                                              <span className="truncate">{page.label}</span>
                                            </label>
                                          );
                                        })}
                                      </div>

                                      <div className="flex items-center justify-between gap-2 pt-3 mt-3 border-t border-slate-100">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const catPageIds = catPages.map(p => p.id);
                                            const allSelected = catPageIds.every(id => draftAccess.includes(id));
                                            if (allSelected) {
                                              setDraftAccess(prev => prev.filter(id => !catPageIds.includes(id)));
                                            } else {
                                              setDraftAccess(prev => Array.from(new Set([...prev, ...catPageIds])));
                                            }
                                          }}
                                          className="text-[10px] font-bold text-slate-500 hover:text-slate-800 underline"
                                        >
                                          Toggle All
                                        </button>
                                        <div className="flex items-center gap-1.5">
                                          <button
                                            type="button"
                                            onClick={() => setActivePopover(null)}
                                            className="px-2 py-1 text-[11px] font-bold text-slate-500 hover:bg-slate-100 rounded-lg"
                                          >
                                            Cancel
                                          </button>
                                          <button
                                            type="button"
                                            onClick={async () => {
                                              await handleSaveDraftAccess(emp);
                                              setActivePopover(null);
                                            }}
                                            className="px-3 py-1 text-[11px] font-bold bg-[#C9A84C] text-white rounded-lg hover:bg-[#b5953e] shadow-2xs"
                                          >
                                            Save
                                          </button>
                                        </div>
                                      </div>
                                    </div>
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
        </>
      )}

      {/* APPROVAL ROUTING MATRIX TAB */}
      {activeSubTab === "approval-matrix" && (
        <div className="space-y-6 pb-44">
          <div className="pb-1 border-b border-[#E8E4DF]">
            <h2 className="text-lg font-bold text-[#1C1C1A] flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#C9A84C]" /> Requests & Approval Control Matrix
            </h2>
            <p className="text-xs text-[#5D5B57] mt-0.5">
              Decide which role or user receives request approvals and notifications.
            </p>
          </div>

          <div className="bg-white border border-[#E8E4DF] rounded-2xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-[#E8E4DF] bg-slate-50 flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-slate-700">Form Workflow Routing Table</span>
              <span className="text-xs text-slate-500 font-bold">{approvalMatrix.length} Workflows Configured</span>
            </div>

            <div className="divide-y divide-slate-100">
              {approvalMatrix.map((item, idx) => (
                <div key={item.formKey} className="p-5 hover:bg-slate-50/60 transition-colors space-y-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                    <div>
                      <span className="text-[10px] font-black uppercase text-[#C9A84C] bg-[#C9A84C]/10 border border-[#C9A84C]/30 px-2 py-0.5 rounded-md tracking-wider">
                        {item.category || "Workflow"}
                      </span>
                      <h4 className="text-sm font-bold text-slate-800 mt-1">{item.formName}</h4>
                      {/* <p className="text-[11px] text-slate-400 font-mono">Key: {item.formKey}</p> */}
                    </div>

                    <div className="flex items-center gap-4 bg-slate-50 border border-slate-200 p-2 rounded-xl">
                      <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={item.notifyEmail !== false}
                          onChange={(e) => {
                            const updated = approvalMatrix.map(m => m.formKey === item.formKey ? { ...m, notifyEmail: e.target.checked } : m);
                            setApprovalMatrix(updated);
                          }}
                          className="rounded text-amber-600 focus:ring-amber-500"
                        />
                        <span>📧 Email Alert</span>
                      </label>

                      <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={item.notifyApp !== false}
                          onChange={(e) => {
                            const updated = approvalMatrix.map(m => m.formKey === item.formKey ? { ...m, notifyApp: e.target.checked } : m);
                            setApprovalMatrix(updated);
                          }}
                          className="rounded text-amber-600 focus:ring-amber-500"
                        />
                        <span>🔔 In-App Alert</span>
                      </label>

                      <button
                        onClick={() => handleSaveMatrixRule(item)}
                        disabled={savingFormKey === item.formKey}
                        className="px-4 py-1.5 bg-[#C9A84C] hover:bg-[#B0913F] text-white text-xs font-black rounded-lg shadow-xs transition-all flex items-center gap-1"
                      >
                        {savingFormKey === item.formKey ? "Saving..." : "Save Rule"}
                      </button>
                    </div>
                  </div>

                  {/* Assign Approver Roles */}
                  <div>
                    <label className="text-[11px] font-black uppercase text-slate-500 tracking-wider block mb-2">
                      Assign Approver Roles (Who gets approval rights):
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {[
                        "Owner",
                        "HR Head",
                        "HR Executive",
                        "Department Manager",
                        "Accounts",
                        "IT MANAGER"
                      ].map((role) => {
                        const currentRoles: string[] = item.approverRoles || [];
                        const isAssigned = currentRoles.includes(role);
                        return (
                          <button
                            key={role}
                            type="button"
                            onClick={() => {
                              const newRoles = isAssigned
                                ? currentRoles.filter(r => r !== role)
                                : [...currentRoles, role];
                              const updated = approvalMatrix.map(m => m.formKey === item.formKey ? { ...m, approverRoles: newRoles } : m);
                              setApprovalMatrix(updated);
                            }}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 ${isAssigned
                              ? "bg-[#C9A84C] text-white border-[#B0913F] shadow-xs"
                              : "bg-[#FCFBF9] text-slate-600 border-[#E8E4DF] hover:bg-[#F5F0EA]/60"
                              }`}
                          >
                            <span>{isAssigned ? "✓" : "+"}</span>
                            <span>{role}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Assign Specific Employee Approvers */}
                  <div className="pt-2 border-t border-slate-100">
                    <label className="text-[11px] font-black uppercase text-slate-500 tracking-wider block mb-2">
                      Assign Specific Employee(s) (Optionally select specific user):
                    </label>

                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                      <UserSearchCombobox
                        employees={employees}
                        selectedUserIds={item.approverUsers || []}
                        forceUpward={idx >= Math.max(0, approvalMatrix.length - 3)}
                        onSelectUser={(selectedUserId) => {
                          const currentUsers: string[] = item.approverUsers || [];
                          if (!currentUsers.includes(selectedUserId)) {
                            const newUsers = [...currentUsers, selectedUserId];
                            const updated = approvalMatrix.map(m => m.formKey === item.formKey ? { ...m, approverUsers: newUsers } : m);
                            setApprovalMatrix(updated);
                          }
                        }}
                      />

                      <span className="text-[11px] text-slate-400 font-bold">
                        {(item.approverUsers || []).length} users assigned
                      </span>
                    </div>

                    {/* Removable Selected User Badges */}
                    {(item.approverUsers && item.approverUsers.length > 0) && (
                      <div className="flex flex-wrap gap-2 mt-2.5">
                        {item.approverUsers.map((uId: string) => {
                          const targetEmp = employees.find((e: any) => e.id === uId);
                          return (
                            <span
                              key={uId}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-900 border border-amber-300 rounded-xl text-xs font-bold shadow-2xs"
                            >
                              <span>👤 {targetEmp ? `${targetEmp.name} (${targetEmp.role || "User"})` : uId}</span>
                              <button
                                type="button"
                                onClick={() => {
                                  const newUsers = (item.approverUsers || []).filter((id: string) => id !== uId);
                                  const updated = approvalMatrix.map(m => m.formKey === item.formKey ? { ...m, approverUsers: newUsers } : m);
                                  setApprovalMatrix(updated);
                                }}
                                className="text-amber-700 hover:text-amber-950 font-black ml-1 text-sm leading-none"
                                title="Remove User"
                              >
                                &times;
                              </button>
                            </span>
                          );
                        })}
                      </div>
                    )}

                    {/* Requester Specific Override Rules */}
                    <RequesterOverrideSelector
                      employees={employees}
                      currentOverrides={item.userOverrides || []}
                      onAddOverride={(reqId, appId) => {
                        const current = item.userOverrides || [];
                        const filtered = current.filter((o: any) => o.applicantId !== reqId);
                        const updatedOverrides = [...filtered, { applicantId: reqId, approverUserIds: [appId] }];
                        const updated = approvalMatrix.map(m => m.formKey === item.formKey ? { ...m, userOverrides: updatedOverrides } : m);
                        setApprovalMatrix(updated);
                      }}
                      onRemoveOverride={(reqId) => {
                        const current = item.userOverrides || [];
                        const updatedOverrides = current.filter((o: any) => o.applicantId !== reqId);
                        const updated = approvalMatrix.map(m => m.formKey === item.formKey ? { ...m, userOverrides: updatedOverrides } : m);
                        setApprovalMatrix(updated);
                      }}
                    />
                  </div>
                </div>
              ))}

              {approvalMatrix.length === 0 && !loadingMatrix && (
                <div className="p-12 text-center text-slate-400 text-xs font-bold uppercase tracking-wider">
                  No approval workflows found.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
