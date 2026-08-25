export interface NavItem {
  id: string;
  label: string;
  category: string;
}

export const CATEGORIES_ORDER = [
  "Dashboards",
  "Human Resources (HR)",
  "Administration & IT",
  "Employee Self Service",
  "Daily Operations",
  "Sales & Business Network",
  "Compliance & Exit"
];

export const MASTER_NAV_ITEMS: NavItem[] = [
  // Dashboards
  { id: "dashboard", label: "Owner Dashboard", category: "Dashboards" },
  { id: "hr-dash", label: "HR Dashboard", category: "Dashboards" },
  { id: "dept-dash", label: "Department Dashboard", category: "Dashboards" },
  { id: "ess-dashboard", label: "ESS Dashboard", category: "Dashboards" },

  // Human Resources (HR)
  { id: "business-leads", label: "HR Leads", category: "Human Resources (HR)" },
  { id: "hiring", label: "Hiring Approvals", category: "Human Resources (HR)" },
  { id: "jobs", label: "Vacancy Postings", category: "Human Resources (HR)" },
  { id: "screening", label: "AI Screening Module", category: "Human Resources (HR)" },
  { id: "interviews", label: "Interviews Queue", category: "Human Resources (HR)" },
  { id: "verification", label: "Vetting Checks Registry", category: "Human Resources (HR)" },
  { id: "onboarding", label: "NDA Onboarding SLA", category: "Human Resources (HR)" },
  { id: "training", label: "Training Classroom", category: "Human Resources (HR)" },
  { id: "probation", label: "6-Month Probation Audit", category: "Human Resources (HR)" },

  // Administration & IT
  { id: "employees", label: "Employees Directory", category: "Administration & IT" },
  { id: "admin-access", label: "Administrator Access", category: "Administration & IT" },
  { id: "inventory-management", label: "Inventory Management", category: "Administration & IT" },
  { id: "assets-registry", label: "Assets Registry", category: "Administration & IT" },
  { id: "document-movement", label: "Document Movement", category: "Administration & IT" },
  { id: "vehicle-registry", label: "Vehicle Registry", category: "Administration & IT" },
  { id: "domain-record", label: "Domain Record", category: "Administration & IT" },
  { id: "legal-recovery", label: "Legal Recovery", category: "Administration & IT" },
  { id: "audit-trail", label: "System Audit Trail", category: "Administration & IT" },

  // Employee Self Service
  { id: "ess-leaves", label: "Leave Management", category: "Employee Self Service" },
  { id: "ess-payroll", label: "My Payslips & Salary", category: "Employee Self Service" },
  { id: "ess-expenses", label: "Expense Claims", category: "Employee Self Service" },
  { id: "asset-request", label: "Asset Request", category: "Employee Self Service" },

  // Daily Operations
  { id: "attendance", label: "Attendance Punch & SOD", category: "Daily Operations" },
  { id: "scheduled-work", label: "Schedule Work Report", category: "Daily Operations" },
  { id: "tasks", label: "My Tasks (Kanban)", category: "Daily Operations" },
  { id: "performance", label: "Work Report", category: "Daily Operations" },
  { id: "live-tracking", label: "Live GPS Tracking", category: "Daily Operations" },
  { id: "field-visit", label: "Field Visit Logs", category: "Daily Operations" },
  { id: "leave-request", label: "Leave Request", category: "Daily Operations" },

  // Sales & Business Network
  { id: "bda-directory", label: "BDA Network (Sales)", category: "Sales & Business Network" },
  { id: "bda-leads", label: "BDA Leads", category: "Sales & Business Network" },
  { id: "associates", label: "Business Associates", category: "Sales & Business Network" },
  { id: "vendors", label: "Vendor Contracts", category: "Sales & Business Network" },
  { id: "franchise", label: "Franchise Brand Audits", category: "Sales & Business Network" },

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
