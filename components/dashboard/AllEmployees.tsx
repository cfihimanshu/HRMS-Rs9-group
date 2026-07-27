"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Search, Plus, Edit2, Trash2, Mail, Phone, Building2, Briefcase, Layers, X, Check, ShieldAlert, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface Company {
  id: string;
  name: string;
  code: string;
}

interface Vertical {
  id: string;
  name: string;
  code: string;
  description?: string;
  status: string;
}

interface Department {
  id: string;
  name: string;
  company?: string;
}

interface Employee {
  id: string;
  name: string;
  email: string;
  mobile: string;
  role: string;
  status: string;
  designation: string;
  companies?: Company[] | any;
  vertical?: string;
  department?: {
    id: string;
    name: string;
  };
  employeeProfile?: {
    employeeId?: string;
    designation?: string;
    department?: any;
    vertical?: string;
    baseSalary?: number;
    dateOfJoining?: string;
  };
  reportingManager?: string;
  dateOfJoining?: string;
  profilePhoto?: string;
}

export default function AllEmployees() {
  const { data: session } = useSession();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  // Master Data States
  const [companies, setCompanies] = useState<Company[]>([]);
  const [verticals, setVerticals] = useState<Vertical[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);

  // Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [companyFilter, setCompanyFilter] = useState("all");
  const [verticalFilter, setVerticalFilter] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");

  // Modals States
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  const [isVerticalModalOpen, setIsVerticalModalOpen] = useState(false);
  const [newVerticalName, setNewVerticalName] = useState("");
  const [newVerticalCode, setNewVerticalCode] = useState("");
  const [newVerticalDesc, setNewVerticalDesc] = useState("");
  const [savingVertical, setSavingVertical] = useState(false);

  // Employee Form State
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    mobile: "",
    role: "Employee",
    employeeId: "",
    designation: "Executive",
    companyId: "",
    vertical: "",
    department: "",
    baseSalary: 30000,
    dateOfJoining: new Date().toISOString().split("T")[0]
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    await Promise.all([
      fetchEmployees(),
      fetchCompanies(),
      fetchVerticals(),
      fetchDepartments()
    ]);
    setLoading(false);
  };

  const fetchEmployees = async () => {
    try {
      const res = await fetch("/api/employees?all=true");
      if (res.ok) {
        const data = await res.json();
        setEmployees(data.data || []);
        setFilteredEmployees(data.data || []);
      }
    } catch (error) {
      console.error("Error fetching employees:", error);
    }
  };

  const fetchCompanies = async () => {
    try {
      const res = await fetch("/api/companies");
      if (res.ok) {
        const data = await res.json();
        setCompanies(data.data || []);
      }
    } catch (error) {
      console.error("Error fetching companies:", error);
    }
  };

  const fetchVerticals = async () => {
    try {
      const res = await fetch("/api/verticals");
      if (res.ok) {
        const data = await res.json();
        setVerticals(data.data || []);
      }
    } catch (error) {
      console.error("Error fetching verticals:", error);
    }
  };

  const fetchDepartments = async () => {
    try {
      const res = await fetch("/api/departments");
      if (res.ok) {
        const data = await res.json();
        setDepartments(data.data || []);
      }
    } catch (error) {
      console.error("Error fetching departments:", error);
    }
  };

  useEffect(() => {
    let filtered = employees;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (emp) =>
          emp.name?.toLowerCase().includes(q) ||
          emp.email?.toLowerCase().includes(q) ||
          emp.designation?.toLowerCase().includes(q) ||
          emp.employeeProfile?.employeeId?.toLowerCase().includes(q)
      );
    }

    if (companyFilter !== "all") {
      filtered = filtered.filter((emp) => {
        let empComps: any[] = [];
        if (Array.isArray(emp.companies)) empComps = emp.companies;
        else if (typeof emp.companies === "string") {
          try { empComps = JSON.parse(emp.companies); } catch (e) {}
        }
        return empComps.some((c: any) => (typeof c === "object" ? c.id : c) === companyFilter);
      });
    }

    if (verticalFilter !== "all") {
      filtered = filtered.filter((emp) => {
        const empVert = emp.vertical || emp.employeeProfile?.vertical;
        return empVert === verticalFilter;
      });
    }

    if (departmentFilter !== "all") {
      filtered = filtered.filter((emp) => {
        const deptId = emp.department?.id || (typeof emp.employeeProfile?.department === 'object' ? emp.employeeProfile?.department?.id : emp.employeeProfile?.department);
        return deptId === departmentFilter;
      });
    }

    setFilteredEmployees(filtered);
  }, [searchQuery, companyFilter, verticalFilter, departmentFilter, employees]);

  const handleOpenAddEmployee = () => {
    setEditingEmployee(null);
    setFormData({
      name: "",
      email: "",
      password: "User@123",
      mobile: "",
      role: "Employee",
      employeeId: "RS9-" + Math.floor(1000 + Math.random() * 9000),
      designation: "Executive",
      companyId: companies[0]?.id || "",
      vertical: verticals[0]?.name || "",
      department: departments[0]?.name || "Operations",
      baseSalary: 35000,
      dateOfJoining: new Date().toISOString().split("T")[0]
    });
    setIsEmployeeModalOpen(true);
  };

  const handleOpenEditEmployee = (emp: Employee) => {
    setEditingEmployee(emp);
    let compId = "";
    if (Array.isArray(emp.companies) && emp.companies.length > 0) {
      compId = typeof emp.companies[0] === "object" ? emp.companies[0].id : emp.companies[0];
    }
    const currentVert = emp.vertical || emp.employeeProfile?.vertical || "";
    const currentDeptName = emp.department?.name || (typeof emp.employeeProfile?.department === "object" ? emp.employeeProfile?.department?.name : emp.employeeProfile?.department) || "";

    setFormData({
      name: emp.name || "",
      email: emp.email || "",
      password: "",
      mobile: emp.mobile || "",
      role: emp.role || "Employee",
      employeeId: emp.employeeProfile?.employeeId || emp.id,
      designation: emp.designation || emp.employeeProfile?.designation || "Employee",
      companyId: compId || companies[0]?.id || "",
      vertical: currentVert,
      department: currentDeptName,
      baseSalary: emp.employeeProfile?.baseSalary || 35000,
      dateOfJoining: emp.dateOfJoining ? new Date(emp.dateOfJoining).toISOString().split("T")[0] : new Date().toISOString().split("T")[0]
    });
    setIsEmployeeModalOpen(true);
  };

  const handleSaveEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingEmployee) {
        // PUT update
        const res = await fetch("/api/employees", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            employeeId: formData.employeeId,
            name: formData.name,
            email: formData.email,
            mobile: formData.mobile,
            role: formData.role,
            designation: formData.designation,
            baseSalary: Number(formData.baseSalary),
            vertical: formData.vertical,
            department: formData.department,
            companies: [formData.companyId],
            dateOfJoining: formData.dateOfJoining
          })
        });

        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.error || "Failed to update employee");
        alert("Employee profile updated successfully!");
      } else {
        // POST create
        const res = await fetch("/api/employees", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData)
        });

        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.error || "Failed to onboard employee");
        alert("New employee onboarded successfully!");
      }
      setIsEmployeeModalOpen(false);
      fetchEmployees();
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  const handleSaveVertical = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVerticalName.trim()) return;
    setSavingVertical(true);
    try {
      const res = await fetch("/api/verticals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newVerticalName,
          code: newVerticalCode,
          description: newVerticalDesc
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to add vertical");

      alert("Business Vertical added successfully!");
      setNewVerticalName("");
      setNewVerticalCode("");
      setNewVerticalDesc("");
      fetchVerticals();
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setSavingVertical(false);
    }
  };

  const handleDeleteVertical = async (id: string) => {
    if (!confirm("Are you sure you want to deactivate this vertical?")) return;
    try {
      const res = await fetch(`/api/verticals?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchVerticals();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const deleteEmployee = async (id: string) => {
    if (confirm("Are you sure you want to remove this employee record?")) {
      try {
        const res = await fetch(`/api/employees?id=${id}`, { method: "DELETE" });
        if (res.ok) {
          setEmployees(employees.filter((emp) => emp.id !== id));
          alert("Employee record deleted successfully");
        }
      } catch (error) {
        console.error("Error deleting employee:", error);
      }
    }
  };

  const getStatusBadgeColor = (status?: string) => {
    switch (status?.toLowerCase()) {
      case "active":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "probation":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "separated":
        return "bg-rose-50 text-rose-700 border-rose-200";
      default:
        return "bg-stone-100 text-stone-700 border-stone-200";
    }
  };

  return (
    <div className="space-y-8 animate-fade-in text-[#1C1C1A]">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-[#E8E4DF] pb-5">
        <div>
          <span className="text-[10px] uppercase tracking-widest text-[#C9A84C] font-bold flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5" /> RS9 Global Personnel Directory
          </span>
          <h2 className="text-2xl font-light tracking-wide font-serif mt-1" style={{ fontFamily: "'Playfair Display', serif" }}>
            Employee Directory & Verticals
          </h2>
          <p className="text-[11px] text-[#9C9890] uppercase tracking-wider mt-1 font-semibold">
            Group Headcount: {filteredEmployees.length} profiles listed
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setIsVerticalModalOpen(true)}
            className="px-3.5 py-2.5 bg-[#FCFBF9] border border-[#E8E4DF] hover:border-[#C9A84C] text-[#1C1C1A] rounded-lg text-xs font-semibold tracking-wider uppercase transition-all flex items-center gap-2 shadow-sm"
          >
            <Layers className="w-4 h-4 text-[#C9A84C]" /> Manage Verticals Master
          </button>

          <button 
            onClick={handleOpenAddEmployee}
            className="px-4 py-2.5 bg-[#C9A84C] hover:bg-[#B3923E] text-white rounded-lg text-xs font-semibold tracking-wider uppercase transition-all shadow-[0_2px_15px_rgba(201,168,76,0.2)] flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Add Record
          </button>
        </div>
      </div>

      {/* Filter Matrix Row */}
      <div className="bg-[#FCFBF9] border border-[#E8E4DF] rounded-xl p-5 space-y-4 shadow-sm">
        <div className="flex flex-col lg:flex-row gap-4 justify-between items-stretch lg:items-center">
          {/* Search bar */}
          <div className="relative flex-1 max-w-lg">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9C9890]" />
            <input
              type="text"
              placeholder="Search by name, email, ID, or designation..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg pl-10 pr-4 py-2.5 text-xs text-[#1C1C1A] placeholder-[#9C9890] focus:outline-none transition-all shadow-inner"
            />
          </div>

          {/* Select Dropdowns for Filters */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Company Filter */}
            <div className="flex items-center gap-1.5 bg-white border border-[#E8E4DF] rounded-lg px-3 py-1.5 text-xs">
              <Building2 className="w-3.5 h-3.5 text-[#C9A84C]" />
              <select
                value={companyFilter}
                onChange={(e) => setCompanyFilter(e.target.value)}
                className="bg-transparent text-xs font-medium text-[#1C1C1A] focus:outline-none cursor-pointer pr-1"
              >
                <option value="all">All Companies ({companies.length})</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                ))}
              </select>
            </div>

            {/* Business Vertical Filter */}
            <div className="flex items-center gap-1.5 bg-white border border-[#E8E4DF] rounded-lg px-3 py-1.5 text-xs">
              <Layers className="w-3.5 h-3.5 text-[#C9A84C]" />
              <select
                value={verticalFilter}
                onChange={(e) => setVerticalFilter(e.target.value)}
                className="bg-transparent text-xs font-medium text-[#1C1C1A] focus:outline-none cursor-pointer pr-1"
              >
                <option value="all">All Verticals ({verticals.length})</option>
                {verticals.map((v) => (
                  <option key={v.id} value={v.name}>{v.name}</option>
                ))}
              </select>
            </div>

            {/* Department Filter */}
            <div className="flex items-center gap-1.5 bg-white border border-[#E8E4DF] rounded-lg px-3 py-1.5 text-xs">
              <Briefcase className="w-3.5 h-3.5 text-[#C9A84C]" />
              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="bg-transparent text-xs font-medium text-[#1C1C1A] focus:outline-none cursor-pointer pr-1"
              >
                <option value="all">All Departments ({departments.length})</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Quick Vertical Badges Selector Bar */}
        <div className="pt-3 border-t border-[#E8E4DF] flex items-center gap-2 overflow-x-auto pb-1">
          <span className="text-[9px] uppercase tracking-widest text-[#9C9890] font-bold whitespace-nowrap mr-1">
            Quick Verticals:
          </span>
          <button
            onClick={() => setVerticalFilter("all")}
            className={cn(
              "text-[9px] uppercase tracking-widest font-semibold px-3 py-1 border rounded-full transition-all whitespace-nowrap",
              verticalFilter === "all"
                ? "bg-[#C9A84C] border-[#C9A84C] text-white shadow-sm"
                : "bg-white border-[#E8E4DF] text-[#5D5B57] hover:bg-[#F5F0EA] hover:text-[#1C1C1A]"
            )}
          >
            All Verticals
          </button>
          {verticals.map((v) => (
            <button
              key={v.id}
              onClick={() => setVerticalFilter(v.name)}
              className={cn(
                "text-[9px] uppercase tracking-widest font-semibold px-3 py-1 border rounded-full transition-all whitespace-nowrap flex items-center gap-1",
                verticalFilter === v.name
                  ? "bg-[#C9A84C] border-[#C9A84C] text-white shadow-sm"
                  : "bg-white border-[#E8E4DF] text-[#5D5B57] hover:bg-[#F5F0EA] hover:text-[#1C1C1A]"
              )}
            >
              <span>{v.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Employee Grid */}
      {loading ? (
        <div className="text-center py-16">
          <Sparkles className="w-6 h-6 text-[#C9A84C] animate-spin mx-auto mb-2" />
          <p className="text-[#9C9890] text-xs uppercase tracking-widest animate-pulse font-medium">
            Fetching RS9 Global personnel registry...
          </p>
        </div>
      ) : filteredEmployees.length === 0 ? (
        <div className="bg-[#FCFBF9] border border-[#E8E4DF] rounded-xl p-12 text-center">
          <Building2 className="w-10 h-10 text-[#C9A84C] opacity-40 mx-auto mb-3" />
          <p className="text-[#1C1C1A] font-serif text-lg font-light">No personnel matches found</p>
          <p className="text-[#9C9890] text-xs uppercase tracking-widest mt-1">Try adjusting company, vertical, or search filters</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEmployees.map((employee) => {
            const empCompany = Array.isArray(employee.companies) && employee.companies.length > 0
              ? (typeof employee.companies[0] === 'object' ? employee.companies[0].name : employee.companies[0])
              : "RS9 Global";

            const empVertical = employee.vertical || employee.employeeProfile?.vertical || "General Corporate";
            const empDeptName = employee.department?.name || (typeof employee.employeeProfile?.department === 'object' ? employee.employeeProfile?.department?.name : employee.employeeProfile?.department) || "Operations";

            return (
              <div 
                key={employee.id} 
                className="bg-[#FCFBF9] border border-[#E8E4DF] hover:border-[#C9A84C] hover:shadow-[0_4px_25px_rgba(0,0,0,0.06)] rounded-xl p-6 transition-all duration-300 relative flex flex-col justify-between"
              >
                <div>
                  {/* Top Badges Row */}
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <span className="bg-[#F4EFE6] text-[#8C6D23] border border-[#E8DFC8] text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded">
                      {empCompany}
                    </span>
                    <span className={cn("px-2 py-0.5 rounded border text-[9px] font-bold uppercase tracking-widest", getStatusBadgeColor(employee.status))}>
                      {employee.status || "Active"}
                    </span>
                  </div>

                  {/* Employee Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3.5">
                      {/* Avatar */}
                      <div className="w-12 h-12 bg-gradient-to-br from-[#F0EAE4] to-[#DFD7CE] border border-[#E8E4DF] rounded-full flex items-center justify-center text-sm font-semibold text-[#1C1C1A] select-none shadow-sm">
                        {employee.name ? employee.name.charAt(0).toUpperCase() : "E"}
                      </div>
                      <div>
                        <h3 className="font-serif text-base font-medium text-[#1C1C1A] leading-snug" style={{ fontFamily: "'Playfair Display', serif" }}>
                          {employee.name}
                        </h3>
                        <p className="text-[10px] uppercase tracking-wider text-[#9C9890] font-bold mt-0.5">
                          {employee.designation || employee.employeeProfile?.designation || "Executive"}
                        </p>
                        <p className="text-[9px] text-[#C9A84C] font-mono font-medium">
                          ID: {employee.employeeProfile?.employeeId || employee.id}
                        </p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-1">
                      <button 
                        onClick={() => handleOpenEditEmployee(employee)}
                        title="Edit Employee"
                        className="p-1.5 hover:bg-[#F0EAE4] text-[#9C9890] hover:text-[#1C1C1A] rounded-lg transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => deleteEmployee(employee.id)}
                        title="Delete Employee"
                        className="p-1.5 hover:bg-rose-50 text-[#9C9890] hover:text-rose-600 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Business Vertical Tag */}
                  <div className="mb-4 bg-white border border-[#E8E4DF] rounded-lg p-2.5">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-[#9C9890] uppercase tracking-wider font-semibold flex items-center gap-1">
                        <Layers className="w-3 h-3 text-[#C9A84C]" /> Business Vertical
                      </span>
                      <span className="font-semibold text-[#1C1C1A] bg-[#FAF8F5] px-2 py-0.5 rounded border border-[#E8E4DF]">
                        {empVertical}
                      </span>
                    </div>
                  </div>

                  {/* Contact Info */}
                  <div className="space-y-2 mb-5 text-[11px] text-[#5D5B57] font-medium">
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-[#9C9890]" />
                      <span className="truncate">{employee.email}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-[#9C9890]" />
                      <span>{employee.mobile || "N/A"}</span>
                    </div>
                  </div>
                </div>

                {/* Footer Dept & Date */}
                <div className="border-t border-[#E8E4DF] pt-4 mt-auto space-y-2">
                  <div className="flex justify-between items-center text-[10px] text-[#5D5B57]">
                    <span className="uppercase tracking-wider text-[#9C9890] font-semibold">Department</span>
                    <span className="font-semibold text-[#1C1C1A]">{empDeptName}</span>
                  </div>

                  <div className="flex justify-between items-center text-[10px] text-[#5D5B57]">
                    <span className="uppercase tracking-wider text-[#9C9890] font-semibold">Role Access</span>
                    <span className="font-semibold text-[#8C6D23]">{employee.role}</span>
                  </div>

                  <button 
                    onClick={() => handleOpenEditEmployee(employee)}
                    className="w-full text-center py-2 border border-[#E8E4DF] hover:border-[#C9A84C] text-[#1C1C1A] hover:bg-[#FAFAF7] rounded-lg transition-colors uppercase tracking-widest text-[9px] font-semibold mt-2"
                  >
                    Edit & View Profile
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Corporate Headcount Summary */}
      <div className="bg-[#FCFBF9] border border-[#E8E4DF] rounded-xl p-6 shadow-sm">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 divide-x divide-[#E8E4DF]">
          <div className="pl-4 first:pl-0">
            <p className="text-[9px] uppercase tracking-wider text-[#9C9890] font-semibold">Total Personnel</p>
            <p className="text-2xl font-light text-[#1C1C1A] font-serif mt-1" style={{ fontFamily: "'Playfair Display', serif" }}>{employees.length}</p>
          </div>
          <div className="pl-6">
            <p className="text-[9px] uppercase tracking-wider text-[#9C9890] font-semibold">Active Verticals</p>
            <p className="text-2xl font-light text-[#C9A84C] font-serif mt-1" style={{ fontFamily: "'Playfair Display', serif" }}>{verticals.length}</p>
          </div>
          <div className="pl-6">
            <p className="text-[9px] uppercase tracking-wider text-[#9C9890] font-semibold">Sub Companies</p>
            <p className="text-2xl font-light text-[#4E6D53] font-serif mt-1" style={{ fontFamily: "'Playfair Display', serif" }}>{companies.length}</p>
          </div>
          <div className="pl-6">
            <p className="text-[9px] uppercase tracking-wider text-[#9C9890] font-semibold">Common Departments</p>
            <p className="text-2xl font-light text-[#B4463D] font-serif mt-1" style={{ fontFamily: "'Playfair Display', serif" }}>{departments.length}</p>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: ADD / EDIT EMPLOYEE MODAL WITH VERTICAL & COMPANY SELECTION      */}
      {/* ========================================================================= */}
      {isEmployeeModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-[#E8E4DF] rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl p-6 animate-scale-up">
            <div className="flex justify-between items-center border-b border-[#E8E4DF] pb-4 mb-6">
              <div>
                <span className="text-[9px] uppercase tracking-widest text-[#C9A84C] font-bold">Personnel Record</span>
                <h3 className="text-xl font-serif font-light text-[#1C1C1A]" style={{ fontFamily: "'Playfair Display', serif" }}>
                  {editingEmployee ? `Update Profile: ${editingEmployee.name}` : "Onboard New Employee"}
                </h3>
              </div>
              <button 
                onClick={() => setIsEmployeeModalOpen(false)}
                className="p-2 text-[#9C9890] hover:text-[#1C1C1A] hover:bg-[#F5F0EA] rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEmployee} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#5D5B57] mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-[#FCFBF9] border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] outline-none"
                    placeholder="e.g. Rahul Sharma"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#5D5B57] mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-[#FCFBF9] border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] outline-none"
                    placeholder="e.g. rahul@rs9global.com"
                  />
                </div>

                {!editingEmployee && (
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-[#5D5B57] mb-1">
                      Password *
                    </label>
                    <input
                      type="password"
                      required
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full bg-[#FCFBF9] border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] outline-none"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#5D5B57] mb-1">
                    Mobile Number
                  </label>
                  <input
                    type="text"
                    value={formData.mobile}
                    onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                    className="w-full bg-[#FCFBF9] border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] outline-none"
                    placeholder="+91 9876543210"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#5D5B57] mb-1">
                    Employee ID *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.employeeId}
                    onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                    className="w-full bg-[#FCFBF9] border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#5D5B57] mb-1">
                    Designation
                  </label>
                  <input
                    type="text"
                    value={formData.designation}
                    onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                    className="w-full bg-[#FCFBF9] border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] outline-none"
                    placeholder="e.g. Senior Manager"
                  />
                </div>

                {/* Company Selection */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#5D5B57] mb-1">
                    Company / Sub-Entity *
                  </label>
                  <select
                    value={formData.companyId}
                    onChange={(e) => setFormData({ ...formData, companyId: e.target.value })}
                    className="w-full bg-[#FCFBF9] border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] outline-none cursor-pointer"
                  >
                    <option value="">-- Select Company --</option>
                    {companies.map((c) => (
                      <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                    ))}
                  </select>
                </div>

                {/* Business Vertical Selection */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#5D5B57] mb-1">
                    Business Vertical *
                  </label>
                  <select
                    value={formData.vertical}
                    onChange={(e) => setFormData({ ...formData, vertical: e.target.value })}
                    className="w-full bg-[#FCFBF9] border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] outline-none cursor-pointer"
                  >
                    <option value="">-- Select Vertical --</option>
                    {verticals.map((v) => (
                      <option key={v.id} value={v.name}>{v.name}</option>
                    ))}
                  </select>
                </div>

                {/* Common Department Selection */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#5D5B57] mb-1">
                    Department *
                  </label>
                  <select
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full bg-[#FCFBF9] border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] outline-none cursor-pointer"
                  >
                    <option value="">-- Select Department --</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.name}>{d.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#5D5B57] mb-1">
                    System Access Role
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full bg-[#FCFBF9] border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] outline-none cursor-pointer"
                  >
                    <option value="Employee">Employee</option>
                    <option value="Department Manager">Department Manager</option>
                    <option value="HR Executive">HR Executive</option>
                    <option value="HR Head">HR Head</option>
                    <option value="Director">Director</option>
                    <option value="Owner">Owner</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#5D5B57] mb-1">
                    Base Monthly Salary (₹)
                  </label>
                  <input
                    type="number"
                    value={formData.baseSalary}
                    onChange={(e) => setFormData({ ...formData, baseSalary: Number(e.target.value) })}
                    className="w-full bg-[#FCFBF9] border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#5D5B57] mb-1">
                    Date Of Joining
                  </label>
                  <input
                    type="date"
                    value={formData.dateOfJoining}
                    onChange={(e) => setFormData({ ...formData, dateOfJoining: e.target.value })}
                    className="w-full bg-[#FCFBF9] border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-[#E8E4DF] pt-5 mt-6">
                <button
                  type="button"
                  onClick={() => setIsEmployeeModalOpen(false)}
                  className="px-4 py-2 border border-[#E8E4DF] rounded-lg text-xs font-semibold text-[#5D5B57] hover:bg-[#F5F0EA]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#C9A84C] hover:bg-[#B3923E] text-white font-semibold rounded-lg text-xs tracking-wider uppercase transition-all shadow-md"
                >
                  {editingEmployee ? "Save Changes" : "Onboard Employee"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: DYNAMIC BUSINESS VERTICALS MASTER MANAGEMENT MODAL               */}
      {/* ========================================================================= */}
      {isVerticalModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-[#E8E4DF] rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl p-6">
            <div className="flex justify-between items-center border-b border-[#E8E4DF] pb-4 mb-5">
              <div>
                <span className="text-[9px] uppercase tracking-widest text-[#C9A84C] font-bold">Master Table</span>
                <h3 className="text-xl font-serif font-light text-[#1C1C1A]" style={{ fontFamily: "'Playfair Display', serif" }}>
                  Business Verticals Master Management
                </h3>
              </div>
              <button 
                onClick={() => setIsVerticalModalOpen(false)}
                className="p-2 text-[#9C9890] hover:text-[#1C1C1A] hover:bg-[#F5F0EA] rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form to add new vertical */}
            <form onSubmit={handleSaveVertical} className="bg-[#FCFBF9] border border-[#E8E4DF] rounded-xl p-4 mb-6 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#C9A84C] flex items-center gap-1.5">
                <Plus className="w-4 h-4" /> Add New Business Vertical Dynamically
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[9px] font-bold uppercase text-[#5D5B57] mb-1">
                    Vertical Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Legal Recovery"
                    value={newVerticalName}
                    onChange={(e) => setNewVerticalName(e.target.value)}
                    className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-1.5 text-xs outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-bold uppercase text-[#5D5B57] mb-1">
                    Short Code
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. LR"
                    value={newVerticalCode}
                    onChange={(e) => setNewVerticalCode(e.target.value)}
                    className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-1.5 text-xs outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-bold uppercase text-[#5D5B57] mb-1">
                    Description
                  </label>
                  <input
                    type="text"
                    placeholder="Brief description..."
                    value={newVerticalDesc}
                    onChange={(e) => setNewVerticalDesc(e.target.value)}
                    className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-1.5 text-xs outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={savingVertical}
                  className="px-4 py-2 bg-[#C9A84C] hover:bg-[#B3923E] text-white rounded-lg text-xs font-semibold uppercase tracking-wider transition-all"
                >
                  {savingVertical ? "Saving..." : "+ Add Business Vertical"}
                </button>
              </div>
            </form>

            {/* List of Verticals */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#1C1C1A] mb-3">
                Active Business Verticals ({verticals.length})
              </h4>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {verticals.map((v) => (
                  <div key={v.id} className="flex items-center justify-between bg-white border border-[#E8E4DF] rounded-lg p-3 hover:border-[#C9A84C] transition-all">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-[#1C1C1A]">{v.name}</span>
                        <span className="bg-[#F4EFE6] text-[#8C6D23] text-[9px] font-mono px-2 py-0.5 rounded font-bold">
                          {v.code}
                        </span>
                      </div>
                      {v.description && (
                        <p className="text-[10px] text-[#9C9890] mt-0.5">{v.description}</p>
                      )}
                    </div>

                    <button
                      onClick={() => handleDeleteVertical(v.id)}
                      className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Deactivate Vertical"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
