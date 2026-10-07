import { LayoutDashboard, UserSquare2, FileEdit, Briefcase, Users2, ScanLine, Video, ShieldCheck, FileText, FileSpreadsheet, GraduationCap, Clock, CalendarCheck, CalendarClock, TrendingUp, BarChart3, BriefcaseIcon, Building2, Coins, HelpCircle, AlertTriangle, ShieldAlert, LogOut, MapPin, Cpu, Package, Key, Scale, History, FolderKanban, Car, Globe } from "lucide-react";
import { CATEGORIES_ORDER } from "@/lib/navigationConfig";

export function getDashboardMenuItems(user: any, stats: any) {
  const userRole = user?.role || "Employee";
  const allMenuItems = [
    // Dashboards
    { id: "dashboard", label: "Owner Dashboard", icon: LayoutDashboard, category: "Dashboards", roles: ["Owner", "Director"] },
    { id: "hr-dash", label: "HR Dashboard", icon: UserSquare2, category: "Dashboards", roles: ["Owner", "Director", "HR Head", "HR Executive"] },
    { id: "dept-dash", label: "Department Dashboard", icon: Building2, category: "Dashboards", roles: ["Owner", "Director", "Department Manager"] },
    { id: "sales-dashboard", label: "Sales Dashboard", icon: TrendingUp, category: "Dashboards", roles: ["Owner", "Sales Manager", "DSM"] },
    { id: "vertical-dashboard", label: "Vertical Dashboard", icon: BarChart3, category: "Dashboards", roles: ["Owner", "Director", "Sales Manager", "DSM"] },
    { id: "ess-dashboard", label: "ESS Dashboard", icon: LayoutDashboard, category: "Dashboards", roles: ["Employee"] },

    // Human Resources (HR)
    { id: "business-leads", label: "HR Leads", icon: FileSpreadsheet, category: "Human Resources (HR)", roles: ["Owner", "Director", "HR Head", "HR Executive"] },
    { id: "hiring", label: "Hiring Approvals", icon: FileEdit, category: "Human Resources (HR)", roles: ["Owner", "Director", "HR Head", "HR Executive", "Department Manager", "Accounts"] },
    { id: "jobs", label: "Vacancy Postings", icon: Briefcase, category: "Human Resources (HR)", roles: ["Owner", "Director", "HR Head", "HR Executive"] },
    { id: "screening", label: "AI Screening Module", icon: ScanLine, category: "Human Resources (HR)", roles: ["Owner", "Director", "HR Head", "HR Executive"] },
    { id: "interviews", label: "Interviews Queue", icon: Video, category: "Human Resources (HR)", badge: stats?.interviews?.pending, roles: ["Owner", "Director", "HR Head", "HR Executive", "Trainer"] },
    { id: "verification", label: "Vetting Checks Registry", icon: ShieldCheck, category: "Human Resources (HR)", roles: ["Owner", "Director", "HR Head", "HR Executive", "RIBP / Risk Officer"] },
    { id: "onboarding", label: "NDA Onboarding SLA", icon: FileText, category: "Human Resources (HR)", roles: ["Owner", "Director", "HR Head", "HR Executive"] },
    { id: "training", label: "Training Classroom", icon: GraduationCap, category: "Human Resources (HR)", roles: ["Owner", "Director", "HR Head", "HR Executive", "Trainer"] },
    { id: "probation", label: "6-Month Probation Audit", icon: Clock, category: "Human Resources (HR)", badge: stats?.operations?.probationCases, roles: ["Owner", "Director", "HR Head", "HR Executive", "Trainer"] },

    // Administration & IT
    { id: "employees", label: "Employees Directory", icon: Users2, category: "Administration & IT", roles: ["Owner", "Director", "HR Head", "HR Executive"] },
    { id: "admin-access", label: "Administrator Access", icon: Key, category: "Administration & IT", roles: ["Owner"] },
    { id: "inventory-management", label: "Inventory Management", icon: Package, category: "Administration & IT", roles: ["Owner"] },
    { id: "assets-registry", label: "Assets Registry", icon: Cpu, category: "Administration & IT", roles: ["Owner", "Director", "HR Head", "HR Executive"] },
    { id: "document-movement", label: "Document Movement", icon: FolderKanban, category: "Administration & IT", roles: ["Owner", "Director", "HR Head", "HR Executive", "Department Manager", "IT Admin", "Accounts"] },
    { id: "vehicle-registry", label: "Vehicle Registry", icon: Car, category: "Administration & IT", roles: ["Owner", "Director", "HR Head", "HR Executive", "Department Manager", "IT Admin"] },
    { id: "domain-record", label: "Domain Record", icon: Globe, category: "Administration & IT", roles: ["Owner", "Director", "HR Head", "HR Executive", "IT Admin"] },
    { id: "legal-recovery", label: "Legal Recovery", icon: Scale, category: "Administration & IT", roles: ["Owner"] },
    { id: "security", label: "Security", icon: ShieldCheck, category: "Administration & IT", roles: ["Owner"] },
    { id: "audit-trail", label: "System Audit Trail", icon: History, category: "Administration & IT", roles: ["Owner", "Director", "HR Head"] },

    // Employee Self Service (ESS)
    { id: "ess-leaves", label: "Leave Management", icon: CalendarCheck, category: "Employee Self Service", roles: ["Employee"] },
    { id: "ess-payroll", label: "My Payslips & Salary", icon: FileText, category: "Employee Self Service", roles: ["Employee"] },
    { id: "ess-expenses", label: "Expense Claims", icon: Coins, category: "Employee Self Service", roles: ["Owner", "Director", "HR Head", "HR Executive", "Department Manager", "Accounts", "Employee"] },
    { id: "asset-request", label: "Asset Request", icon: Cpu, category: "Employee Self Service", roles: ["Employee", "Owner", "Director", "HR Head", "HR Executive", "Department Manager"] },
    { id: "tickets", label: "Tickets / Help Desk", icon: HelpCircle, category: "Employee Self Service", roles: ["Employee", "Owner", "Director", "HR Head", "HR Executive", "Department Manager", "Accounts", "Trainer", "IT Admin", "DSM", "RIBP / Risk Officer"] },

    // Daily Operations
    { id: "attendance", label: "Attendance Punch & SOD", icon: CalendarCheck, category: "Daily Operations", roles: ["Owner", "Director", "HR Head", "HR Executive", "Department Manager", "Accounts", "Trainer", "IT Admin", "DSM", "RIBP / Risk Officer"] },
    { id: "scheduled-work", label: "Schedule Work Report", icon: CalendarClock, category: "Daily Operations", roles: ["Owner", "Director", "HR Head", "HR Executive", "Department Manager", "Accounts", "Trainer", "Employee", "IT Admin", "DSM", "RIBP / Risk Officer"] },
    { id: "tasks", label: "My Tasks (Kanban)", icon: FileEdit, category: "Daily Operations", roles: ["Owner", "Director", "HR Head", "HR Executive", "Department Manager", "Accounts", "Trainer", "Employee", "IT Admin", "DSM", "RIBP / Risk Officer"] },
    { id: "payroll-management", label: "Payroll Management", icon: Coins, category: "Daily Operations", roles: ["Owner", "Director", "HR Head", "HR Executive", "Payroll Executive", "Accounts"] },
    { id: "bank-work-report", label: "Bank Work Dashboard", icon: Building2, category: "Daily Operations", roles: ["Owner", "Director", "HR Head", "HR Executive", "Department Manager", "Accounts", "Trainer", "Employee", "IT Admin", "DSM", "RIBP / Risk Officer"] },
    { id: "performance", label: "Work Report", icon: FileText, category: "Daily Operations", roles: ["Owner", "Director", "HR Head", "HR Executive", "Department Manager", "Employee"] },
    { id: "live-tracking", label: "Live GPS Tracking", icon: MapPin, category: "Daily Operations", roles: ["Owner", "Director", "HR Head", "Department Manager"] },
    { id: "field-visit", label: "Field Visit Logs", icon: MapPin, category: "Daily Operations", roles: ["Owner", "Director", "HR Head", "HR Executive", "Department Manager", "Employee"] },
    { id: "leave-request", label: "Leave Request", icon: CalendarCheck, category: "Daily Operations", roles: ["Owner", "Director", "HR Head", "HR Executive", "Department Manager", "Accounts", "Trainer", "Employee", "IT Admin", "DSM", "RIBP / Risk Officer", "Business Associate", "Vendor", "Franchisee", "Territory Partner"] },

    // Sales & Business Network
    { id: "bda-directory", label: "BDA Network (Sales)", icon: Users2, category: "Sales & Business Network", roles: ["Owner", "Director", "HR Head", "HR Executive", "Department Manager"] },
    { id: "bda-leads", label: "BDA Leads", icon: FileSpreadsheet, category: "Sales & Business Network", roles: ["Owner", "Director", "HR Head", "HR Executive", "Department Manager", "Employee"] },
    { id: "associates", label: "Business Associates", icon: BriefcaseIcon, category: "Sales & Business Network", roles: ["Owner", "Director", "HR Head", "Franchisee", "Territory Partner", "Business Associate"] },
    { id: "vendors", label: "Vendor Contracts", icon: Building2, category: "Sales & Business Network", roles: ["Owner", "Director", "HR Head", "Accounts", "Vendor"] },
    { id: "franchise", label: "Franchise Brand Audits", icon: Coins, category: "Sales & Business Network", roles: ["Owner", "Director", "HR Head", "Accounts", "Franchisee", "Territory Partner"] },

    // Compliance & Exit
    { id: "grievance", label: "Anonymous Grievance", icon: HelpCircle, category: "Compliance & Exit", badge: stats?.operations?.grievanceCases, roles: ["Owner", "Director", "HR Head", "HR Executive", "Department Manager", "Accounts", "Trainer", "Business Associate", "Vendor", "Franchisee", "Territory Partner"] },
    { id: "disciplinary-warnings", label: "Disciplinary Warnings", icon: ShieldAlert, category: "Compliance & Exit", badge: (["Owner", "Director", "HR Head", "HR Executive"].includes(userRole) ? (stats?.operations?.disciplinaryWarnings?.pendingApprovals || 0) : (stats?.operations?.disciplinaryWarnings?.myActive || 0)), urgent: (stats?.operations?.disciplinaryWarnings?.myActive > 0 && !["Owner", "Director", "HR Head", "HR Executive"].includes(userRole)), roles: ["Owner", "Director", "HR Head", "HR Executive", "Department Manager", "IT MANAGER", "DSM", "Employee", "Accounts", "Trainer", "IT Admin", "RIBP / Risk Officer", "Business Associate", "Vendor", "Franchisee", "Territory Partner"] },
    { id: "risks", label: "Critical Risk Warnings", icon: AlertTriangle, category: "Compliance & Exit", badge: stats?.alerts?.criticalRisk, urgent: true, roles: ["Owner", "Director", "HR Head", "RIBP / Risk Officer"] },
    { id: "exit", label: "Exit Separation Clearance", icon: LogOut, category: "Compliance & Exit", roles: ["Owner", "Director", "HR Head", "Employee"] }
  ];

  const userDept = user?.department || "";
  const userDesig = (user?.jobTitle || user?.designation || "");
  const isAdministration = userDept.toLowerCase().includes("administration");

  const isOwnerOrDirector = ["Owner", "Director"].some(r => userRole.toLowerCase().includes(r.toLowerCase()));
  const isSalesHead = userRole.toLowerCase().includes("sales head") || userDesig.toLowerCase().includes("sales head") || (userRole.toLowerCase().includes("head") && userDept.toLowerCase().includes("sales"));

  let allowedPageIds: string[] | null = null;
  if (Array.isArray(user?.menuAccess)) {
    allowedPageIds = user.menuAccess;
  } else if (typeof user?.menuAccess === "string" && user.menuAccess) {
    try {
      const parsed = JSON.parse(user.menuAccess);
      if (Array.isArray(parsed)) allowedPageIds = parsed;
    } catch { }
  }


  // Default ESS pages accessible to all employees & staff members ONLY when no custom menuAccess has been configured
  const DEFAULT_ESS_PAGES = [
    "ess-dashboard",
    "ess-leaves",
    "ess-payroll",
    "ess-expenses",
    "asset-request",
    "tickets",
    "tasks",
    "bank-work-report",
    "performance",
    "field-visit",
    "leave-request",
    "exit"
  ];

  let effectiveAllowedPageIds: string[] | null = allowedPageIds;

  // Only if menuAccess has NEVER been configured (is null), use default ESS + role rules
  if (effectiveAllowedPageIds === null) {
    effectiveAllowedPageIds = [...DEFAULT_ESS_PAGES];
    if ((userRole.toLowerCase().includes("bda") || userRole.toLowerCase().includes("manager") || userRole.toLowerCase().includes("director") || userRole.toLowerCase().includes("owner") || isSalesHead) && !effectiveAllowedPageIds.includes("bda-leads")) {
      effectiveAllowedPageIds.push("bda-leads");
    }
    if ((userRole.toLowerCase().includes("sales manager") || userRole.toLowerCase() === "dsm" || isSalesHead || (userRole.toLowerCase().includes("manager") && userDept.toLowerCase().includes("sales"))) && !effectiveAllowedPageIds.includes("sales-dashboard")) {
      effectiveAllowedPageIds.push("sales-dashboard");
    }
    if ((userRole.toLowerCase().includes("sales manager") || userRole.toLowerCase() === "dsm" || isSalesHead || (userRole.toLowerCase().includes("manager") && userDept.toLowerCase().includes("sales"))) && !effectiveAllowedPageIds.includes("vertical-dashboard")) {
      effectiveAllowedPageIds.push("vertical-dashboard");
    }
    if (isSalesHead) {
      const salesHeadPages = [
        "vertical-dashboard",
        "sales-dashboard",
        "legal-recovery",
        "security",
        "bank-work-report",
        "scheduled-work",
        "bda-leads",
        "bda-directory",
        "performance"
      ];
      if (effectiveAllowedPageIds) {
        salesHeadPages.forEach(p => {
          if (!effectiveAllowedPageIds!.includes(p)) effectiveAllowedPageIds!.push(p);
        });
      }
    }
  }

  const menuItems = allMenuItems.filter(item => {
    // 1. OWNER / DIRECTOR: Unconditional access to ALL pages & categories
    if (isOwnerOrDirector) return true;

    // 2. SALES HEAD: Unconditional access to sales & vertical dashboards, legal recovery, security, bank work, and schedule work report
    if (isSalesHead && [
      "vertical-dashboard",
      "sales-dashboard",
      "legal-recovery",
      "security",
      "bank-work-report",
      "scheduled-work",
      "bda-leads",
      "bda-directory",
      "performance",
      "attendance",
      "tasks",
      "field-visit",
      "leave-request",
      "ess-leaves",
      "ess-payroll",
      "ess-expenses",
      "asset-request",
      "disciplinary-warnings",
      "exit"
    ].includes(item.id)) {
      return true;
    }

    // 3. If explicit menuAccess is configured in DB (even if empty []), strictly filter by it!
    if (allowedPageIds !== null) {
      return allowedPageIds.includes(item.id) || allowedPageIds.includes(item.category);
    }

    if (item.id === "payroll-management") {
      return item.roles.some(role => role.toLowerCase() === userRole.toLowerCase());
    }

    // 4. NON-OWNER USERS: Filter by default permissions & role rules
    const roleLower = userRole.toLowerCase();

    if (effectiveAllowedPageIds && effectiveAllowedPageIds.length > 0) {
      const hasPageLevelPermissions = effectiveAllowedPageIds.some(p =>
        !CATEGORIES_ORDER.includes(p)
      );
      if (hasPageLevelPermissions) {
        return effectiveAllowedPageIds.includes(item.id);
      } else {
        if (!effectiveAllowedPageIds.includes(item.category)) {
          return false;
        }
      }
    }

    if (item.id === "disciplinary-warnings") {
      return item.roles.some(r => r.toLowerCase() === roleLower || (roleLower.includes("manager") && r.toLowerCase().includes("manager")));
    }
    if (item.id === "scheduled-work") {
      const userVert = user?.vertical || "";
      const isLegalOrSecVert = ["Legal Recovery", "Security", "Legal & Security"].includes(userVert);
      const isManagerialRole = roleLower.includes("manager") || roleLower.includes("hr") || roleLower.includes("head") || isSalesHead;
      return isManagerialRole || isLegalOrSecVert;
    }
    if (item.id === "legal-recovery" || item.id === "security") {
      return isAdministration || isSalesHead;
    }
    if (item.id === "inventory-management") {
      return isAdministration;
    }
    if (item.id === "assets-registry") {
      return isAdministration || roleLower.includes("manager") || roleLower.includes("hr");
    }
    if (item.id === "bda-directory") {
      const isITManager = (roleLower.includes("manager") &&
        ((user?.department || "").toLowerCase().includes("information technology") ||
          (user?.department || "").toLowerCase().includes("it")));
      if (isITManager) return false;
      if (isSalesHead) return true;
    }

    // Role-based matching for non-owner users
    return item.roles.some(r => {
      const rLower = r.toLowerCase();
      if (rLower === roleLower) return true;
      if (isSalesHead && (rLower.includes("sales") || rLower.includes("manager") || rLower.includes("dsm") || rLower === "employee")) return true;
      if (roleLower.includes("manager") && (rLower === "department manager" || rLower.includes("manager"))) return true;
      if (roleLower.includes("hr") && rLower.includes("hr")) return true;
      return false;
    });
  });

  return menuItems;
}

