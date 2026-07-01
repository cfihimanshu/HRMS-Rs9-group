"use client";
import React, { useState, useEffect, useCallback } from "react";
import ReactDOM from "react-dom";
import { Search, Edit3, Check, X, RefreshCw, Cpu, Smartphone, Mail, MessageCircle, Building2, Layers, Trash2, AlertTriangle, UserX } from "lucide-react";
import { cn } from "@/lib/utils";

interface AssetsRegistryProps {
  userRole?: string;
  triggerToast: (msg: string) => void;
  sessionUser?: any;
}

export default function AssetsRegistry({ userRole, triggerToast, sessionUser }: AssetsRegistryProps) {
  const [employees, setEmployees] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
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

      if (empRes.ok) setEmployees(empData.data || []);
      if (deptRes.ok) setDepartments(deptData.data || []);
      if (compRes.ok) setCompanies(compData.data || []);
    } catch (error) {
      console.error("Error fetching assets data:", error);
      triggerToast("Failed to load assets registry data");
    } finally {
      setLoading(false);
    }
  };

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
      matchesCompany = emp.companies?.some((c: any) => c.id === selectedCompany);
    }

    // 3. Department Filter
    let matchesDept = true;
    if (selectedDept !== "all") {
      const deptId = typeof profile?.department === "object" ? profile.department?.id : profile?.department;
      matchesDept = deptId === selectedDept;
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
            {companies.map((comp) => (
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
            {departments.map((dept) => (
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
    </div>
  );
}
