"use client";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import ReactDOM from "react-dom";
import { Search, Edit3, Check, X, RefreshCw, Cpu, Smartphone, Mail, MessageCircle, Building2, Layers, Trash2, AlertTriangle, UserX } from "lucide-react";
import { cn } from "@/lib/utils";

const defaultDepartments = [
  "Management",
  "Human Resources (HR)",
  "Information Technology (IT)",
  "Sales",
  "Marketing",
  "Accounts",
  "Administration (Admin)",
  "Operations",
  "Customer Support",
  "Legal",
  "Data Entry",
  "Business Analyst"
];

const matchDepartmentNames = (name1: string, name2: string): boolean => {
  if (!name1 || !name2) return false;
  const n1 = name1.toLowerCase().trim();
  const n2 = name2.toLowerCase().trim();
  if (n1 === n2) return true;
  
  // Custom normalization rules
  const getTokens = (s: string) => {
    let cleaned = s.replace(/[^a-z0-9]/g, " ")
                   .replace(/\band\b/g, "")
                   .replace(/\btech\b/g, "")
                   .replace(/\bsupport\b/g, "")
                   .replace(/\bfinance\b/g, "");
    return cleaned.split(/\s+/).filter(Boolean);
  };
  
  const tokens1 = getTokens(n1);
  const tokens2 = getTokens(n2);
  
  if (n1 === "hr" && n2.includes("human resources")) return true;
  if (n2 === "hr" && n1.includes("human resources")) return true;
  if (n1 === "it" && n2.includes("information technology")) return true;
  if (n2 === "it" && n1.includes("information technology")) return true;
  
  return tokens1.some(t1 => tokens2.includes(t1));
};

interface AssetsRegistryProps {
  userRole?: string;
  triggerToast: (msg: string) => void;
  sessionUser?: any;
}

export default function AssetsRegistry({ userRole, triggerToast, sessionUser }: AssetsRegistryProps) {
  const [employees, setEmployees] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [departmentsDb, setDepartmentsDb] = useState<any[]>([]);
  const [dbRoles, setDbRoles] = useState<any[]>([]);
  const [inventoryTypes, setInventoryTypes] = useState<string[]>([]);
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Selected filters
  const [selectedCompany, setSelectedCompany] = useState("all");
  const [selectedDept, setSelectedDept] = useState("all");

  // Editing state
  const [editingEmployeeId, setEditingEmployeeId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    allocatedAsset: "",
    allocatedSim: "",
    allocatedGmail: "",
    allocatedWhatsapp: ""
  });
  const [updating, setUpdating] = useState(false);

  // Selection state for checkboxes
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());

  // Delete confirmation modal
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; type: "single" | "bulk"; empId?: string; empName?: string }>({ show: false, type: "single" });
  const [deleting, setDeleting] = useState(false);

  // Assign Asset Modal states
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignForm, setAssignForm] = useState({
    date: new Date().toISOString().split('T')[0],
    companyId: "",
    assignedToId: "",
    assignedBy: "",
    assetType: "Laptop",
    assetValue: "",
    simWithMobile: false,
    simPhoneNumber: "",
    allocatedGmail: "",
    allocatedWhatsapp: "",
    selectedInventoryId: ""
  });

  // Sync assignedBy with sessionUser name when sessionUser loads
  useEffect(() => {
    if (sessionUser?.name) {
      setAssignForm(prev => ({ ...prev, assignedBy: sessionUser.name }));
    }
  }, [sessionUser]);

  // Handle redirection from Grant Asset Request
  useEffect(() => {
    if (employees.length === 0) return;
    const shouldOpen = localStorage.getItem("open_assign_asset_form");
    if (shouldOpen === "true") {
      const userId = localStorage.getItem("assign_asset_user_id");
      const assetType = localStorage.getItem("assign_asset_type") || "Laptop";
      const assetVal = localStorage.getItem("assign_asset_value") || "";
      const inventoryId = localStorage.getItem("assign_asset_inventory_id") || "";

      // Find the matched employee to auto-select company & corporate employeeId
      const matchedEmp = employees.find(emp => String(emp.id) === String(userId));
      if (matchedEmp) {
        // Find their company
        let comps: any[] = [];
        if (Array.isArray(matchedEmp.companies)) comps = matchedEmp.companies;
        else if (typeof matchedEmp.companies === "string") {
          try { comps = JSON.parse(matchedEmp.companies); } catch(e) {}
        }
        const companyId = comps[0]?.id || comps[0] || "";

        setAssignForm(prev => ({
          ...prev,
          companyId: String(companyId),
          assignedToId: matchedEmp.employeeProfile?.employeeId || "",
          assetType: assetType,
          assetValue: assetVal,
          selectedInventoryId: inventoryId,
          allocatedGmail: matchedEmp.employeeProfile?.allocatedGmail || "",
          allocatedWhatsapp: matchedEmp.employeeProfile?.allocatedWhatsapp || ""
        }));
        setShowAssignModal(true);
      }

      // Cleanup
      localStorage.removeItem("open_assign_asset_form");
      localStorage.removeItem("assign_asset_user_id");
      localStorage.removeItem("assign_asset_type");
      localStorage.removeItem("assign_asset_value");
      localStorage.removeItem("assign_asset_inventory_id");
    }
  }, [employees]);

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignForm.assignedToId) {
      triggerToast("Please select an employee to assign the asset to.");
      return;
    }
    
    try {
      setUpdating(true);
      
      const payload: any = {
        employeeId: assignForm.assignedToId,
        allocatedGmail: assignForm.allocatedGmail,
        allocatedWhatsapp: assignForm.allocatedWhatsapp,
      };

      const formattedDetails = `${assignForm.assetValue}${assignForm.assetType === "Mobile Phone" && assignForm.simWithMobile ? " (SIM card included)" : ""} (Assigned: ${assignForm.date} | By: ${assignForm.assignedBy})`;

      if (assignForm.assetType === "SIM Card") {
        payload.allocatedSim = formattedDetails;
      } else {
        payload.allocatedAsset = `${assignForm.assetType}: ${formattedDetails}`;
        if (assignForm.assetType === "Mobile Phone" && assignForm.simWithMobile) {
          const simDetails = assignForm.simPhoneNumber ? assignForm.simPhoneNumber : "Yes";
          payload.allocatedSim = `${simDetails} (Assigned with Mobile Phone | Assigned: ${assignForm.date} | By: ${assignForm.assignedBy})`;
        }
      }

      const res = await fetch("/api/employees", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const result = await res.json();
      if (result.success) {
        // If an inventory item was selected from stock, mark it as "In Use"
        if (assignForm.selectedInventoryId) {
          try {
            await fetch("/api/assets/inventory", {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                id: Number(assignForm.selectedInventoryId),
                status: "In Use"
              })
            });
          } catch (invErr) {
            console.error("Failed to update inventory status:", invErr);
          }
        }
        triggerToast(`Asset assigned successfully to ${employees.find(emp => emp.employeeProfile?.employeeId === assignForm.assignedToId)?.name || "employee"}`);
        setShowAssignModal(false);
        // Refresh local data state
        setEmployees(prev => prev.map(emp => {
          if (emp.employeeProfile?.employeeId === assignForm.assignedToId) {
            return {
              ...emp,
              employeeProfile: {
                ...emp.employeeProfile,
                ...payload
              }
            };
          }
          return emp;
        }));
      } else {
        triggerToast(result.error || "Failed to assign asset");
      }
    } catch (error) {
      console.error(error);
      triggerToast("Error assigning asset");
    } finally {
      setUpdating(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch employees
      const empRes = await fetch("/api/employees");
      const empData = await empRes.json();
      
      // Fetch departments
      const deptRes = await fetch("/api/departments");
      const deptData = await deptRes.json();
      
      // Fetch companies
      const compRes = await fetch("/api/companies");
      const compData = await compRes.json();

      // Fetch roles
      const roleRes = await fetch("/api/roles");
      const roleData = await roleRes.json();

      if (empRes.ok) setEmployees(empData.data || []);
      if (deptRes.ok) setDepartmentsDb(deptData.data || []);
      if (compRes.ok) setCompanies(compData.data || []);
      if (roleRes.ok) setDbRoles(roleData.data || []);

      // Fetch inventory assets to extract dynamic types
      try {
        const invRes = await fetch("/api/assets/inventory");
        const invData = await invRes.json();
        if (invRes.ok && invData.success) {
          setInventoryItems(invData.data || []);
          const defaultTypes = [
            "Laptop",
            "Mobile Phone",
            "SIM Card",
            "Headset / Accessories",
            "ID Card / Lanyard",
            "Office Chair / Table",
            "Router / Networking",
            "Printer / Scanner",
            "Other Accessories"
          ];
          const existingTypes = (invData.data || []).map((item: any) => item.assetType).filter(Boolean);
          const combined = Array.from(new Set([...defaultTypes, ...existingTypes]));
          setInventoryTypes(combined.sort() as string[]);
        }
      } catch (err) {
        console.error("Error fetching inventory for types:", err);
      }
    } catch (error) {
      console.error("Error fetching assets data:", error);
      triggerToast("Failed to load assets registry data");
    } finally {
      setLoading(false);
    }
  };

  const allowedCompanies = useMemo(() => {
    const isOwnerOrHR = ["owner", "director", "hr head", "hr-head", "hr executive", "hr-executive"].includes((userRole || "").toLowerCase());
    if (isOwnerOrHR) return companies;
    
    // Find logged in user object
    const loggedInUserObj = employees.find(emp => String(emp.id) === String(sessionUser?.id));
    if (!loggedInUserObj) return [];
    
    let comps: any[] = [];
    if (Array.isArray(loggedInUserObj.companies)) {
      comps = loggedInUserObj.companies;
    } else if (typeof loggedInUserObj.companies === "string") {
      try { comps = JSON.parse(loggedInUserObj.companies); } catch(e) {}
    }
    const allowedIds = comps.map((c: any) => String(c.id || c));
    return companies.filter(comp => allowedIds.includes(String(comp.id)));
  }, [companies, employees, sessionUser, userRole]);

  const handleStartEdit = (emp: any) => {
    setEditingEmployeeId(emp.employeeProfile?.employeeId || null);
    setEditForm({
      allocatedAsset: emp.employeeProfile?.allocatedAsset || "",
      allocatedSim: emp.employeeProfile?.allocatedSim || "",
      allocatedGmail: emp.employeeProfile?.allocatedGmail || "",
      allocatedWhatsapp: emp.employeeProfile?.allocatedWhatsapp || ""
    });
  };

  const handleCancelEdit = () => {
    setEditingEmployeeId(null);
  };

  const handleSaveEdit = async (employeeId: string) => {
    try {
      setUpdating(true);
      const res = await fetch("/api/employees", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId,
          ...editForm
        })
      });

      const result = await res.json();
      if (result.success) {
        triggerToast("Asset allocation updated successfully");
        setEditingEmployeeId(null);
        // Refresh local data state
        setEmployees(prev => prev.map(emp => {
          if (emp.employeeProfile?.employeeId === employeeId) {
            return {
              ...emp,
              employeeProfile: {
                ...emp.employeeProfile,
                ...editForm
              }
            };
          }
          return emp;
        }));
      } else {
        triggerToast(result.error || "Failed to update assets");
      }
    } catch (error) {
      console.error(error);
      triggerToast("Error updating assets");
    } finally {
      setUpdating(false);
    }
  };

  // --- Delete asset allocations (clear all 4 fields) ---
  const handleClearAssets = async (employeeId: string) => {
    try {
      setDeleting(true);
      const res = await fetch("/api/employees", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId,
          allocatedAsset: "",
          allocatedSim: "",
          allocatedGmail: "",
          allocatedWhatsapp: ""
        })
      });
      const result = await res.json();
      if (result.success) {
        setEmployees(prev => prev.map(emp => {
          if (emp.employeeProfile?.employeeId === employeeId) {
            return {
              ...emp,
              employeeProfile: {
                ...emp.employeeProfile,
                allocatedAsset: "",
                allocatedSim: "",
                allocatedGmail: "",
                allocatedWhatsapp: ""
              }
            };
          }
          return emp;
        }));
        return true;
      } else {
        triggerToast(result.error || "Failed to clear assets");
        return false;
      }
    } catch (err) {
      console.error(err);
      triggerToast("Error clearing assets");
      return false;
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteConfirmed = async () => {
    if (deleteConfirm.type === "single" && deleteConfirm.empId) {
      const ok = await handleClearAssets(deleteConfirm.empId);
      if (ok) triggerToast(`Asset allocations cleared for ${deleteConfirm.empName || "employee"}`);
    } else if (deleteConfirm.type === "bulk") {
      setDeleting(true);
      let successCount = 0;
      for (const empId of selectedRows) {
        // empId here is the employee's employeeProfile.employeeId
        const ok = await handleClearAssets(empId);
        if (ok) successCount++;
      }
      setDeleting(false);
      triggerToast(`Cleared asset allocations for ${successCount} employee(s)`);
      setSelectedRows(new Set());
    }
    setDeleteConfirm({ show: false, type: "single" });
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Are you sure you want to PERMANENTLY delete this employee from the entire system? This cannot be undone.")) return;
    
    try {
      setDeleting(true);
      const res = await fetch(`/api/employees?id=${userId}`, {
        method: "DELETE",
      });
      const result = await res.json();
      if (result.success) {
        triggerToast("Employee deleted successfully");
        setEmployees(prev => prev.filter(emp => emp.id !== userId));
      } else {
        triggerToast(result.error || "Failed to delete employee");
      }
    } catch (err) {
      console.error(err);
      triggerToast("Error deleting employee");
    } finally {
      setDeleting(false);
    }
  };

  // --- Checkbox logic ---
  const toggleRowSelection = useCallback((empProfileId: string) => {
    setSelectedRows(prev => {
      const next = new Set(prev);
      if (next.has(empProfileId)) {
        next.delete(empProfileId);
      } else {
        next.add(empProfileId);
      }
      return next;
    });
  }, []);

  // Dynamically filter and deduplicate departments according to selected company using dbRoles
  const visibleDepartments = React.useMemo(() => {
    // Filter roles based on selected company
    const filteredRoles = dbRoles.filter((r: any) => {
      if (selectedCompany === "all") return true;
      let comps = r.companies;
      if (typeof comps === 'string') {
        try { comps = JSON.parse(comps); } catch (e) { comps = []; }
      }
      if (!Array.isArray(comps)) comps = [];
      
      return comps.length === 0 || comps.some((id: any) => String(id) === String(selectedCompany));
    });

    const deptNames = dbRoles.length > 0
      ? Array.from(new Set(filteredRoles.map((r: any) => r.department).filter(Boolean))).sort()
      : defaultDepartments;

    if (selectedCompany === "all") {
      const seenNames = new Set<string>();
      return deptNames.map(name => ({
        id: name,
        name: name
      })).filter((dept) => {
        const nameLower = dept.name.toLowerCase().trim();
        if (seenNames.has(nameLower)) return false;
        seenNames.add(nameLower);
        return true;
      });
    }

    return deptNames.map(name => ({
      id: name,
      name: name
    }));
  }, [dbRoles, selectedCompany]);

  // Reset department filter when company filter changes
  useEffect(() => {
    setSelectedDept("all");
  }, [selectedCompany]);

  // Filter logic
  const filteredEmployees = employees.filter((emp) => {
    const profile = emp.employeeProfile;
    
    // 1. Search Query (Name, ID, designation, assets details)
    const query = searchQuery.toLowerCase();
    const nameMatch = emp.name?.toLowerCase().includes(query);
    const idMatch = profile?.employeeId?.toLowerCase().includes(query);
    const assetMatch = profile?.allocatedAsset?.toLowerCase().includes(query);
    const simMatch = profile?.allocatedSim?.toLowerCase().includes(query);
    const gmailMatch = profile?.allocatedGmail?.toLowerCase().includes(query);
    const waMatch = profile?.allocatedWhatsapp?.toLowerCase().includes(query);
    const matchesSearch = !searchQuery || nameMatch || idMatch || assetMatch || simMatch || gmailMatch || waMatch;

    // 2. Company Filter
    let matchesCompany = true;
    if (selectedCompany !== "all") {
      let compList: any[] = [];
      if (Array.isArray(emp.companies)) {
        compList = emp.companies;
      } else if (typeof emp.companies === "string") {
        try {
          const parsed = JSON.parse(emp.companies);
          compList = Array.isArray(parsed) ? parsed : [parsed];
        } catch (e) {
          compList = [emp.companies];
        }
      } else if (emp.companies) {
        compList = [emp.companies];
      }
      
      matchesCompany = compList.some((c: any) => {
        if (!c) return false;
        const cId = typeof c === "object" ? c.id : c;
        return String(cId) === String(selectedCompany);
      });
    }

    // 3. Department Filter
    let matchesDept = true;
    if (selectedDept !== "all") {
      const currentDeptName = typeof profile?.department === "object"
        ? profile.department?.name
        : departmentsDb.find(d => d.id === profile?.department)?.name;

      matchesDept = matchDepartmentNames(currentDeptName, selectedDept);
    }

    return matchesSearch && matchesCompany && matchesDept;
  });

  const selectableIds = filteredEmployees
    .filter(emp => emp.employeeProfile?.employeeId)
    .map(emp => emp.employeeProfile.employeeId);

  const allSelected = selectableIds.length > 0 && selectableIds.every(id => selectedRows.has(id));
  const someSelected = selectedRows.size > 0;

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(selectableIds));
    }
  };

  return (
    <div className="space-y-6 animate-fade-in text-[#1C1C1A]">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#E8E4DF] pb-5">
        <div>
          <span className="text-[9px] uppercase tracking-widest text-[#C9A84C] font-bold">IT & Resource Management</span>
          <h2 className="text-xl font-light tracking-wide font-serif" style={{ fontFamily: "'Playfair Display', serif" }}>
            Company Assets & SIM Registry
          </h2>
          <p className="text-[10px] text-[#9C9890] uppercase tracking-wider mt-1.5 font-semibold">
            Track devices, numbers, Gmail, and WhatsApp by company and department
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Bulk Delete Button */}
          {someSelected && (
            <button
              onClick={() => setDeleteConfirm({ show: true, type: "bulk" })}
              className="px-3 py-1.5 bg-red-50 border border-red-200 hover:bg-red-100 text-red-600 hover:text-red-700 rounded-lg text-[10px] font-semibold tracking-wider uppercase transition-all flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" /> Clear Selected ({selectedRows.size})
            </button>
          )}
          <button 
            onClick={fetchData}
            className="px-3 py-1.5 bg-[#FCFBF9] border border-[#E8E4DF] hover:bg-[#F5F0EA] text-[#5D5B57] hover:text-[#1C1C1A] rounded-lg text-[10px] font-semibold tracking-wider uppercase transition-all flex items-center gap-1.5"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} /> Refresh
          </button>
          <button 
            onClick={() => {
              setShowAssignModal(true);
              setAssignForm({
                date: new Date().toISOString().split('T')[0],
                companyId: selectedCompany !== "all" ? selectedCompany : (allowedCompanies[0]?.id || ""),
                assignedToId: "",
                assignedBy: sessionUser?.name || "Owner",
                assetType: "Laptop",
                assetValue: "",
                simWithMobile: false,
                simPhoneNumber: "",
                allocatedGmail: "",
                allocatedWhatsapp: "",
                selectedInventoryId: ""
              });
            }}
            className="px-3 py-1.5 bg-[#C9A84C] hover:bg-[#B5963D] text-white rounded-lg text-[10px] font-semibold tracking-wider uppercase transition-all flex items-center gap-1.5 shadow-sm font-sans"
          >
            <Cpu className="w-3.5 h-3.5" /> Assign Asset
          </button>
        </div>
      </div>

      {/* Filter Options Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-[#FCFBF9] border border-[#E8E4DF] p-4 rounded-xl">
        {/* Search */}
        <div>
          <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1.5">Search Employee or Asset</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9C9890]" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg pl-9 pr-3 py-2 text-xs text-[#1C1C1A] placeholder-[#9C9890] focus:outline-none transition-all"
            />
          </div>
        </div>

        {/* Company Dropdown */}
        <div>
          <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1.5">Filter by Company</label>
          <select
            value={selectedCompany}
            onChange={(e) => setSelectedCompany(e.target.value)}
            className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-semibold"
          >
            <option value="all">All Companies</option>
            {allowedCompanies.map((comp: any) => (
              <option key={comp.id} value={comp.id}>
                {comp.name}
              </option>
            ))}
          </select>
        </div>

        {/* Department Dropdown */}
        <div>
          <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1.5">Filter by Department</label>
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-semibold"
          >
            <option value="all">All Departments</option>
            {visibleDepartments.map((dept) => (
              <option key={dept.id} value={dept.id}>
                {dept.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Table */}
      {loading ? (
        <div className="text-center py-12">
          <p className="text-[#9C9890] text-xs uppercase tracking-widest animate-pulse font-medium">Loading asset registry...</p>
        </div>
      ) : filteredEmployees.length === 0 ? (
        <div className="bg-[#FCFBF9] border border-[#E8E4DF] rounded-xl p-12 text-center">
          <p className="text-[#9C9890] text-xs uppercase tracking-widest font-medium">No asset records found</p>
        </div>
      ) : (
        <div className="bg-[#FCFBF9] border border-[#E8E4DF] rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-[#E8E4DF] bg-[#F5F0EA]/40 text-[#5D5B57] text-[10px] uppercase font-bold tracking-wider">
                  {/* Select All Checkbox */}
                  <th className="py-3.5 px-3 font-bold w-10">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 rounded border-[#E8E4DF] text-[#C9A84C] focus:ring-[#C9A84C] cursor-pointer accent-[#C9A84C]"
                      title="Select All"
                    />
                  </th>
                  <th className="py-3.5 px-4 font-bold">Company / Dept</th>
                  <th className="py-3.5 px-4 font-bold">Employee</th>
                  <th className="py-3.5 px-4 font-bold flex items-center gap-1.5"><Cpu className="w-3.5 h-3.5 text-[#C9A84C]" /> Asset (Device)</th>
                  <th className="py-3.5 px-4 font-bold"><Smartphone className="w-3.5 h-3.5 inline mr-1 text-[#C9A84C]" /> SIM Details</th>
                  <th className="py-3.5 px-4 font-bold"><Mail className="w-3.5 h-3.5 inline mr-1 text-[#C9A84C]" /> Gmail (Corporate)</th>
                  <th className="py-3.5 px-4 font-bold"><MessageCircle className="w-3.5 h-3.5 inline mr-1 text-[#C9A84C]" /> WhatsApp</th>
                  <th className="py-3.5 px-4 font-bold text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8E4DF] text-xs">
                {filteredEmployees.map((emp) => {
                  const profile = emp.employeeProfile;
                  const companyName = emp.companies?.[0]?.name || "General Company";
                  const deptName = typeof profile?.department === "object" ? profile.department?.name : "General / IT";
                  const isEditing = editingEmployeeId === profile?.employeeId;
                  const profileId = profile?.employeeId || "";
                  const isSelected = selectedRows.has(profileId);

                  return (
                    <tr key={emp.id} className={cn("hover:bg-white transition-colors", isSelected && "bg-amber-50/40")}>
                      {/* Row Checkbox */}
                      <td className="py-4 px-3">
                        {profileId && (
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleRowSelection(profileId)}
                            className="w-4 h-4 rounded border-[#E8E4DF] text-[#C9A84C] focus:ring-[#C9A84C] cursor-pointer accent-[#C9A84C]"
                          />
                        )}
                      </td>

                      {/* Company & Department */}
                      <td className="py-4 px-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1 text-[10px] font-bold text-slate-800 uppercase tracking-wide">
                            <Building2 className="w-3 h-3 text-[#C9A84C]" /> {companyName}
                          </div>
                          <div className="flex items-center gap-1 text-[9px] text-[#9C9890] font-semibold uppercase tracking-wider">
                            <Layers className="w-3 h-3" /> {deptName}
                          </div>
                        </div>
                      </td>

                      {/* Employee Details */}
                      <td className="py-4 px-4 font-medium text-[#1C1C1A]">
                        <div className="font-semibold">{emp.name}</div>
                        <div className="text-[10px] text-[#9C9890] uppercase tracking-wider font-semibold mt-0.5">
                          ID: {profile?.employeeId || "N/A"} • {profile?.designation || "Staff"}
                        </div>
                      </td>

                      {/* Allocated Asset */}
                      <td className="py-4 px-4">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editForm.allocatedAsset}
                            onChange={(e) => setEditForm({ ...editForm, allocatedAsset: e.target.value })}
                            className="bg-white border border-[#E8E4DF] rounded px-2 py-1 text-xs focus:outline-none w-full max-w-[150px] font-semibold"
                          />
                        ) : (
                          <span className={cn("font-medium", profile?.allocatedAsset ? "text-[#1C1C1A]" : "text-[#9C9890] italic")}>
                            {profile?.allocatedAsset || "Not Assigned"}
                          </span>
                        )}
                      </td>

                      {/* Allocated SIM */}
                      <td className="py-4 px-4">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editForm.allocatedSim}
                            onChange={(e) => setEditForm({ ...editForm, allocatedSim: e.target.value })}
                            className="bg-white border border-[#E8E4DF] rounded px-2 py-1 text-xs focus:outline-none w-full max-w-[150px] font-semibold"
                          />
                        ) : (
                          <span className={cn("font-mono font-bold", profile?.allocatedSim ? "text-[#1C1C1A]" : "text-[#9C9890] italic")}>
                            {profile?.allocatedSim || "No SIM"}
                          </span>
                        )}
                      </td>

                      {/* Allocated Gmail */}
                      <td className="py-4 px-4">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editForm.allocatedGmail}
                            onChange={(e) => setEditForm({ ...editForm, allocatedGmail: e.target.value })}
                            className="bg-white border border-[#E8E4DF] rounded px-2 py-1 text-xs focus:outline-none w-full max-w-[180px] font-semibold"
                          />
                        ) : (
                          <span className={cn("font-semibold", profile?.allocatedGmail ? "text-indigo-650" : "text-[#9C9890] italic")}>
                            {profile?.allocatedGmail || "No Gmail"}
                          </span>
                        )}
                      </td>

                      {/* Allocated WhatsApp */}
                      <td className="py-4 px-4">
                        {isEditing ? (
                          <select
                            value={editForm.allocatedWhatsapp}
                            onChange={(e) => setEditForm({ ...editForm, allocatedWhatsapp: e.target.value })}
                            className="bg-white border border-[#E8E4DF] rounded px-2 py-1 text-xs focus:outline-none font-semibold"
                          >
                            <option value="">None</option>
                            <option value="Personal WhatsApp">Personal WhatsApp</option>
                            <option value="Business WhatsApp">Business WhatsApp</option>
                            <option value="Corporate Number">Corporate WhatsApp</option>
                          </select>
                        ) : (
                          <span className={cn(
                            "inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold border",
                            profile?.allocatedWhatsapp?.includes("Business") 
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : profile?.allocatedWhatsapp 
                              ? "bg-blue-50 text-blue-700 border-blue-200" 
                              : "bg-slate-50 text-slate-400 border-slate-200 italic"
                          )}>
                            {profile?.allocatedWhatsapp || "None"}
                          </span>
                        )}
                      </td>

                      {/* Action buttons */}
                      <td className="py-4 px-4 text-center">
                        {isEditing ? (
                          <div className="flex justify-center items-center gap-1.5">
                            <button
                              onClick={() => handleSaveEdit(profile.employeeId)}
                              disabled={updating}
                              className="p-1 text-emerald-600 hover:bg-emerald-50 rounded border border-emerald-200 transition-all"
                              title="Save Allocation"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              disabled={updating}
                              className="p-1 text-rose-600 hover:bg-rose-50 rounded border border-rose-200 transition-all"
                              title="Cancel"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex justify-center items-center gap-1.5">
                            <button
                              onClick={() => handleStartEdit(emp)}
                              className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[#C9A84C] hover:text-white border border-[#C9A84C]/35 hover:bg-[#C9A84C] rounded-lg transition-all flex items-center gap-1"
                              title="Edit Allocation"
                            >
                              <Edit3 className="w-3 h-3" /> Edit
                            </button>
                            <button
                              onClick={() => setDeleteConfirm({ show: true, type: "single", empId: profileId, empName: emp.name })}
                              className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-red-400 hover:text-white border border-red-200 hover:bg-red-500 rounded-lg transition-all flex items-center gap-1"
                              title="Clear Asset Allocations"
                            >
                              <Trash2 className="w-3 h-3" /> Clear
                            </button>
                            <button
                              onClick={() => handleDeleteUser(emp.id)}
                              className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-rose-500 hover:text-white border border-rose-200 hover:bg-rose-500 rounded-lg transition-all flex items-center gap-1"
                              title="Delete Employee Permanently"
                            >
                              <UserX className="w-3 h-3" /> Delete
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal — rendered via Portal to bypass overflow:hidden */}
      {deleteConfirm.show && typeof document !== "undefined" && ReactDOM.createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center" style={{ backgroundColor: "rgba(0,0,0,0.45)" }} onClick={() => setDeleteConfirm({ show: false, type: "single" })}>
          <div
            className="bg-white rounded-2xl shadow-2xl p-6 w-[380px] max-w-[90vw] text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-7 h-7 text-red-500" />
            </div>
            <h3 className="text-lg font-semibold text-[#1C1C1A] mb-1">Clear Asset Allocations</h3>
            <p className="text-sm text-[#9C9890] mb-6">
              {deleteConfirm.type === "single"
                ? <>Are you sure you want to clear all asset allocations for <strong className="text-[#1C1C1A]">{deleteConfirm.empName}</strong>?</>
                : <>Are you sure you want to clear asset allocations for <strong className="text-[#1C1C1A]">{selectedRows.size} selected employee(s)</strong>?</>
              }
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm({ show: false, type: "single" })}
                disabled={deleting}
                className="flex-1 px-4 py-2.5 rounded-xl border border-[#E8E4DF] text-sm font-medium text-[#1C1C1A] hover:bg-[#F5F3F0] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirmed}
                disabled={deleting}
                className="flex-1 px-4 py-2.5 rounded-xl bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition-colors shadow-sm disabled:opacity-50"
              >
                {deleting ? "Clearing..." : "Yes, Clear All"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Assign Asset Modal — Portal */}
      {showAssignModal && typeof document !== "undefined" && ReactDOM.createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center" style={{ backgroundColor: "rgba(0,0,0,0.4)" }} onClick={() => setShowAssignModal(false)}>
          <div
            className="bg-white rounded-2xl shadow-2xl p-6 w-[450px] max-w-[95vw] border border-[#E8E4DF]"
            onClick={(e) => e.stopPropagation()}
          >
             <div className="flex justify-between items-center border-b border-[#E8E4DF] pb-3 mb-4">
              <h3 className="text-lg font-serif font-light text-[#1C1C1A]" style={{ fontFamily: "'Playfair Display', serif" }}>
                Assign New Asset
              </h3>
              <button onClick={() => setShowAssignModal(false)} className="text-[#9C9890] hover:text-[#1C1C1A] transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAssignSubmit} className="space-y-4 text-left">
              {/* Date field */}
              <div>
                <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Allocation Date *</label>
                <input
                  type="date"
                  required
                  value={assignForm.date}
                  onChange={(e) => setAssignForm(prev => ({ ...prev, date: e.target.value }))}
                  className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all"
                />
              </div>

              {/* Company field */}
              <div>
                <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Company *</label>
                <select
                  required
                  value={assignForm.companyId}
                  onChange={(e) => {
                    const val = e.target.value;
                    setAssignForm(prev => ({ ...prev, companyId: val, assignedToId: "", selectedInventoryId: "", assetValue: "" }));
                  }}
                  className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-semibold"
                >
                  <option value="">-- Select Company --</option>
                  {allowedCompanies.map((comp: any) => (
                    <option key={comp.id} value={comp.id}>{comp.name}</option>
                  ))}
                </select>
              </div>

              {/* Assigned To field */}
              <div>
                <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Assigned To (Employee) *</label>
                <select
                  required
                  value={assignForm.assignedToId}
                  disabled={!assignForm.companyId}
                  onChange={(e) => {
                    const empId = e.target.value;
                    const matchedEmp = employees.find(emp => emp.employeeProfile?.employeeId === empId);
                    setAssignForm(prev => ({
                      ...prev,
                      assignedToId: empId,
                      allocatedGmail: matchedEmp?.employeeProfile?.allocatedGmail || "",
                      allocatedWhatsapp: matchedEmp?.employeeProfile?.allocatedWhatsapp || ""
                    }));
                  }}
                  className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-semibold disabled:opacity-50"
                >
                  <option value="">-- Select Employee --</option>
                  {employees.filter(emp => {
                    let comps: any[] = [];
                    if (Array.isArray(emp.companies)) comps = emp.companies;
                    else if (typeof emp.companies === "string") {
                      try { comps = JSON.parse(emp.companies); } catch(e) {}
                    }
                    if (!Array.isArray(comps)) comps = [];
                    return comps.some((c: any) => String(c.id || c) === String(assignForm.companyId));
                  }).map(emp => (
                    <option key={emp.employeeProfile?.employeeId} value={emp.employeeProfile?.employeeId}>
                      {emp.name} ({emp.employeeProfile?.employeeId || "No ID"})
                    </option>
                  ))}
                </select>
              </div>

              {/* Gmail & WhatsApp fields */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Gmail (Corporate)</label>
                  <input
                    type="text"
                    value={assignForm.allocatedGmail}
                    onChange={(e) => setAssignForm(prev => ({ ...prev, allocatedGmail: e.target.value }))}
                    placeholder="e.g. name@company.com"
                    className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">WhatsApp (Official)</label>
                  <input
                    type="text"
                    value={assignForm.allocatedWhatsapp}
                    onChange={(e) => setAssignForm(prev => ({ ...prev, allocatedWhatsapp: e.target.value }))}
                    placeholder="e.g. +91 9999999999"
                    className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all"
                  />
                </div>
              </div>

              {/* Assigned By field */}
              <div>
                <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Assigned By *</label>
                <input
                  type="text"
                  required
                  value={assignForm.assignedBy}
                  onChange={(e) => setAssignForm(prev => ({ ...prev, assignedBy: e.target.value }))}
                  className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all"
                />
              </div>

              {/* Asset Type field */}
              <div>
                <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Asset Type *</label>
                <select
                  required
                  value={assignForm.assetType}
                  onChange={(e) => {
                    const val = e.target.value;
                    setAssignForm(prev => ({ ...prev, assetType: val, selectedInventoryId: "", assetValue: "" }));
                  }}
                  className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-semibold"
                >
                  {(inventoryTypes.length > 0 ? inventoryTypes : [
                    "Laptop",
                    "Mobile Phone",
                    "SIM Card",
                    "Headset / Accessories",
                    "ID Card / Lanyard",
                    "Office Chair / Table",
                    "Other Accessories"
                  ]).map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
                {assignForm.assetType === "Mobile Phone" && (
                  <div className="space-y-2 mt-2 bg-[#FCFBF9] border border-[#E8E4DF] p-2 rounded-lg">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="simWithMobile"
                        checked={assignForm.simWithMobile}
                        onChange={(e) => setAssignForm(prev => ({ 
                          ...prev, 
                          simWithMobile: e.target.checked,
                          simPhoneNumber: e.target.checked ? prev.simPhoneNumber : "" 
                        }))}
                        className="w-3.5 h-3.5 accent-[#C9A84C] rounded cursor-pointer"
                      />
                      <label htmlFor="simWithMobile" className="text-[10px] text-[#5D5B57] font-semibold cursor-pointer select-none">
                        Is SIM card included with mobile phone?
                      </label>
                    </div>
                    {assignForm.simWithMobile && (
                      <div className="mt-2 animate-fade-in">
                        <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">SIM Phone Number *</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. +91 9876543210"
                          value={assignForm.simPhoneNumber}
                          onChange={(e) => setAssignForm(prev => ({ ...prev, simPhoneNumber: e.target.value }))}
                          className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-semibold"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Available Stock Selector */}
              {assignForm.companyId && (
                <div className="bg-[#FCFBF9] border border-[#E8E4DF] p-3 rounded-lg space-y-2">
                  <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold">
                    Available Stock (Select to Auto-Fill details)
                  </label>
                  {(() => {
                    const available = inventoryItems.filter(item => 
                      item.assetType === assignForm.assetType &&
                      item.status === "Available"
                    ).sort((a, b) => {
                      const aMatches = String(a.companyId || "") === String(assignForm.companyId || "");
                      const bMatches = String(b.companyId || "") === String(assignForm.companyId || "");
                      if (aMatches && !bMatches) return -1;
                      if (!aMatches && bMatches) return 1;
                      return 0;
                    });

                    if (available.length === 0) {
                      return (
                        <p className="text-[10px] text-[#A67C1E] italic bg-[#FFFBF0] border border-[#FFEAB5] p-2 rounded">
                          No available items in stock for this asset type across all companies. You can still type details manually below.
                        </p>
                      );
                    }

                    return (
                      <select
                        value={assignForm.selectedInventoryId}
                        onChange={(e) => {
                          const val = e.target.value;
                          const selectedInv = available.find(i => String(i.id) === String(val));
                          setAssignForm(prev => ({
                            ...prev,
                            selectedInventoryId: val,
                            assetValue: selectedInv ? `[S/N: ${selectedInv.serialNumber || 'N/A'}] ${selectedInv.assetDetail || ''}` : prev.assetValue
                          }));
                        }}
                        className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-semibold"
                      >
                        <option value="">-- Select from Available Stock --</option>
                        {available.map(item => {
                          const compName = companies.find(c => String(c.id) === String(item.companyId))?.name || "General Stock";
                          const isMatch = String(item.companyId || "") === String(assignForm.companyId || "");
                          return (
                            <option key={item.id} value={item.id}>
                              {isMatch ? "★ " : ""}[S/N: {item.serialNumber || 'N/A'}] {item.assetDetail} ({compName} | {item.condition})
                            </option>
                          );
                        })}
                      </select>
                    );
                  })()}
                </div>
              )}

              {/* Asset Value field */}
              <div>
                <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Asset Detail / Value *</label>
                <input
                  type="text"
                  required
                  placeholder={assignForm.assetType === "SIM Card" ? "e.g. +91 9876543210" : "e.g. Serial: C02X12345, Macbook Pro"}
                  value={assignForm.assetValue}
                  onChange={(e) => setAssignForm(prev => ({ ...prev, assetValue: e.target.value }))}
                  className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all"
                />
              </div>

              <div className="flex gap-3 pt-3 border-t border-[#E8E4DF] mt-6">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="flex-1 px-4 py-2 rounded-lg border border-[#E8E4DF] text-xs font-semibold uppercase tracking-wider text-[#5D5B57] hover:bg-[#F5F0EA] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="flex-1 px-4 py-2 rounded-lg bg-[#C9A84C] text-white text-xs font-semibold uppercase tracking-wider hover:bg-[#B5963D] disabled:opacity-50 transition-colors shadow-sm"
                >
                  {updating ? "Saving..." : "Assign"}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
