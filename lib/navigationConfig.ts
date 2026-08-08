export interface NavItem {
  id: string;
  label: string;
  category: string;
}

export const CATEGORIES_ORDER = [
  "Core Workspace",
  "Employee Self Service",
  "AI & Vetting Hub",
  "Training & Probation",
  "Daily Operations",
  "Network Partners",
  "Compliance & Exit"
];

export const MASTER_NAV_ITEMS: NavItem[] = [
  // Core Workspace
  { id: "dashboard", label: "Owner Dashboard", category: "Core Workspace" },
  { id: "hr-dash", label: "HR Dashboard", category: "Core Workspace" },
  { id: "dept-dash", label: "Department Dashboard", category: "Core Workspace" },
  { id: "hiring", label: "Hiring Approvals", category: "Core Workspace" },
  { id: "jobs", label: "Vacancy Postings", category: "Core Workspace" },
  { id: "business-leads", label: "HR Leads", category: "Core Workspace" },
  { id: "employees", label: "Employees Directory", category: "Core Workspace" },
  { id: "bda-directory", label: "BDA Network (Sales)", category: "Core Workspace" },
  { id: "assets-registry", label: "Assets Registry", category: "Core Workspace" },
  { id: "domain-record", label: "Domain Record", category: "Core Workspace" },
  { id: "inventory-management", label: "Inventory Management", category: "Core Workspace" },
  { id: "admin-access", label: "Administrator Access", category: "Core Workspace" },
  { id: "audit-trail", label: "System Audit Trail", category: "Core Workspace" },
  { id: "document-movement", label: "Document Movement", category: "Core Workspace" },
  { id: "vehicle-registry", label: "Vehicle Registry", category: "Core Workspace" },
  { id: "legal-recovery", label: "Legal Recovery", category: "Core Workspace" },

  // Employee Self Service
  { id: "ess-dashboard", label: "ESS Dashboard", category: "Employee Self Service" },
  { id: "ess-leaves", label: "Leave Management", category: "Employee Self Service" },
  { id: "ess-payroll", label: "My Payslips & Salary", category: "Employee Self Service" },
  { id: "ess-expenses", label: "Expense Claims", category: "Employee Self Service" },
  { id: "asset-request", label: "Asset Request", category: "Employee Self Service" },

  // AI & Vetting Hub
  { id: "screening", label: "AI Screening Module", category: "AI & Vetting Hub" },
  { id: "interviews", label: "Interviews Queue", category: "AI & Vetting Hub" },
  { id: "verification", label: "Vetting Checks Registry", category: "AI & Vetting Hub" },
  { id: "onboarding", label: "NDA Onboarding SLA", category: "AI & Vetting Hub" },

  // Training & Probation
  { id: "training", label: "Training Classroom", category: "Training & Probation" },
  { id: "probation", label: "6-Month Probation Audit", category: "Training & Probation" },

  // Daily Operations
  { id: "attendance", label: "Attendance Punch & SOD", category: "Daily Operations" },
  { id: "scheduled-work", label: "Schedule Work Report", category: "Daily Operations" },
  { id: "tasks", label: "My Tasks (Kanban)", category: "Daily Operations" },
  { id: "performance", label: "Work Report", category: "Daily Operations" },
  { id: "live-tracking", label: "Live GPS Tracking", category: "Daily Operations" },
  { id: "field-visit", label: "Field Visit Logs", category: "Daily Operations" },
  { id: "leave-request", label: "Leave Request", category: "Daily Operations" },

  // Network Partners
  { id: "associates", label: "Business Associates", category: "Network Partners" },
  { id: "vendors", label: "Vendor Contracts", category: "Network Partners" },
  { id: "franchise", label: "Franchise Brand Audits", category: "Network Partners" },

  // Compliance & Exit
  { id: "grievance", label: "Anonymous Grievance", category: "Compliance & Exit" },
  { id: "disciplinary-warnings", label: "Disciplinary Warnings", category: "Compliance & Exit" },
  { id: "risks", label: "Critical Risk Warnings", category: "Compliance & Exit" },
  { id: "exit", label: "Exit Separation Clearance", category: "Compliance & Exit" }
];

export const getDynamicMenuCategoriesWithPages = () => {
  return CATEGORIES_ORDER.map(cat => ({
    category: cat,
    pages: MASTER_NAV_ITEMS.filter(item => item.category === cat).map(item => ({
      id: item.id,
      label: item.label
    }))
  }));
};
