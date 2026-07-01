"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Search, Plus, Edit2, Trash2, Mail, Phone, Building } from "lucide-react";
import { cn } from "@/lib/utils";

interface Employee {
  id: string;
  name: string;
  email: string;
  mobile: string;
  designation: string;
  department: {
    id: string;
    name: string;
  };
  reportingManager?: string;
  status: "Active" | "OnLeave" | "OnProbation" | "OnNotice" | "Separated";
  dateOfJoining: string;
  profilePhoto?: string;
}

export default function AllEmployees() {
  const { data: session } = useSession();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [departments, setDepartments] = useState<any[]>([]);

  useEffect(() => {
    fetchEmployees();
    fetchDepartments();
  }, []);

  const fetchEmployees = async () => {
    try {
      const res = await fetch("/api/employees");
      if (res.ok) {
        const data = await res.json();
        setEmployees(data.data || []);
        setFilteredEmployees(data.data || []);
      }
    } catch (error) {
      console.error("Error fetching employees:", error);
    } finally {
      setLoading(false);
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
      filtered = filtered.filter(
        (emp) =>
          emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          emp.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
          emp.designation.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (departmentFilter !== "all") {
      filtered = filtered.filter((emp) => emp.department?.id === departmentFilter);
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((emp) => emp.status === statusFilter);
    }

    setFilteredEmployees(filtered);
  }, [searchQuery, departmentFilter, statusFilter, employees]);

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "Active":
        return "bg-[#E2EFE0] text-[#4E6D53]"; // Sage green
      case "Separated":
        return "bg-[#FCE8E6] text-[#B4463D]"; // Red
      default:
        return "bg-[#F5F0EA] text-[#5D5B57]";
    }
  };

  const deleteEmployee = async (id: string) => {
    if (confirm("Are you sure you want to delete this employee?")) {
      try {
        const res = await fetch(`/api/employees/${id}`, {
          method: "DELETE",
        });
        if (res.ok) {
          setEmployees(employees.filter((emp) => emp.id !== id));
          alert("Employee deleted successfully");
        }
      } catch (error) {
        console.error("Error deleting employee:", error);
      }
    }
  };

  return (
    <div className="space-y-8 animate-fade-in text-[#1C1C1A]">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#E8E4DF] pb-5">
        <div>
          <span className="text-[9px] uppercase tracking-widest text-[#C9A84C] font-bold">Registry</span>
          <h2 className="text-xl font-light tracking-wide font-serif" style={{ fontFamily: "'Playfair Display', serif" }}>
            Employee Directory
          </h2>
          <p className="text-[10px] text-[#9C9890] uppercase tracking-wider mt-1.5 font-semibold">
            Corporate headcount: {filteredEmployees.length} registered profiles
          </p>
        </div>
        <button 
          onClick={() => alert("Creating new employee record...")}
          className="px-4 py-2.5 bg-[#C9A84C] hover:bg-[#B3923E] text-white rounded-lg text-xs font-semibold tracking-wider uppercase transition-all shadow-[0_2px_15px_rgba(201,168,76,0.15)] flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Add Record
        </button>
      </div>

      {/* Inline Filters & Search Row */}
      <div className="space-y-4">
        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9C9890]" />
          <input
            type="text"
            placeholder="Search by name, email, designation..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#FCFBF9] border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg pl-10 pr-4 py-2.5 text-xs text-[#1C1C1A] placeholder-[#9C9890] focus:outline-none transition-all"
          />
        </div>

        {/* Inline Custom Tags for Department Filters */}
        <div className="space-y-2">
          <span className="text-[9px] uppercase tracking-widest text-[#9C9890] font-bold">Filter Department:</span>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setDepartmentFilter("all")}
              className={cn(
                "text-[9px] uppercase tracking-widest font-semibold px-4 py-1.5 border rounded-full transition-all focus:outline-none",
                departmentFilter === "all"
                  ? "bg-[#C9A84C] border-[#C9A84C] text-white shadow-sm"
                  : "bg-[#FCFBF9] border-[#E8E4DF] text-[#5D5B57] hover:bg-[#F5F0EA] hover:text-[#1C1C1A]"
              )}
            >
              All Departments
            </button>
            {departments.map((dept) => (
              <button
                key={dept.id}
                onClick={() => setDepartmentFilter(dept.id)}
                className={cn(
                  "text-[9px] uppercase tracking-widest font-semibold px-4 py-1.5 border rounded-full transition-all focus:outline-none",
                  departmentFilter === dept.id
                    ? "bg-[#C9A84C] border-[#C9A84C] text-white shadow-sm"
                    : "bg-[#FCFBF9] border-[#E8E4DF] text-[#5D5B57] hover:bg-[#F5F0EA] hover:text-[#1C1C1A]"
                )}
              >
                {dept.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Employee Grid */}
      {loading ? (
        <div className="text-center py-12">
          <p className="text-[#9C9890] text-xs uppercase tracking-widest animate-pulse font-medium">Retrieving personnel registry...</p>
        </div>
      ) : filteredEmployees.length === 0 ? (
        <div className="bg-[#FCFBF9] border border-[#E8E4DF] rounded-xl p-12 text-center">
          <p className="text-[#9C9890] text-xs uppercase tracking-widest font-medium">No personnel matches found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEmployees.map((employee) => (
            <div 
              key={employee.id} 
              className="bg-[#FCFBF9] border border-[#E8E4DF] hover:shadow-[0_4px_25px_rgba(0,0,0,0.04)] rounded-xl p-6 transition-all duration-300 relative flex flex-col justify-between"
            >
              <div>
                {/* Employee Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3.5">
                    {/* Avatar */}
                    <div className="w-11 h-11 bg-[#F0EAE4] border border-[#E8E4DF] rounded-full flex items-center justify-center text-xs font-semibold text-[#1C1C1A] select-none">
                      {employee.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-serif text-base font-light text-[#1C1C1A]" style={{ fontFamily: "'Playfair Display', serif" }}>
                        {employee.name}
                      </h3>
                      <p className="text-[10px] uppercase tracking-wider text-[#9C9890] font-semibold mt-0.5">
                        {employee.designation}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-1.5">
                    <button className="p-1.5 hover:bg-[#F0EAE4] text-[#9C9890] hover:text-[#1C1C1A] rounded-lg transition-colors">
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => deleteEmployee(employee.id)}
                      className="p-1.5 hover:bg-rose-50 text-[#9C9890] hover:text-rose-600 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Status Badge */}
                <div className="mb-4">
                  <span className={cn("inline-block px-2.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest", getStatusBadgeColor(employee.status))}>
                    {employee.status}
                  </span>
                </div>

                {/* Contact Info */}
                <div className="space-y-2 mb-5 text-[11px] text-[#5D5B57] font-medium">
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-[#9C9890]" />
                    <span className="truncate">{employee.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-[#9C9890]" />
                    <span>{employee.mobile}</span>
                  </div>
                </div>
              </div>

              {/* Department & Joining */}
              <div className="border-t border-[#E8E4DF] pt-4 mt-auto">
                <div className="flex justify-between items-center text-[10px] text-[#5D5B57] mb-1.5 font-medium">
                  <span className="uppercase tracking-wider text-[#9C9890]">Department</span>
                  <span className="font-semibold text-[#1C1C1A]">{employee.department?.name || "General"}</span>
                </div>
                <div className="flex justify-between items-center text-[10px] text-[#5D5B57] mb-4 font-medium">
                  <span className="uppercase tracking-wider text-[#9C9890]">Date Joined</span>
                  <span className="font-semibold text-[#1C1C1A]">
                    {new Date(employee.dateOfJoining).toLocaleDateString()}
                  </span>
                </div>

                <button 
                  onClick={() => alert(`Opening profile for ${employee.name}`)}
                  className="w-full text-center py-2.5 border border-[#E8E4DF] hover:border-[#C9A84C] text-[#1C1C1A] hover:bg-[#FAFAF7] rounded-lg transition-colors uppercase tracking-widest text-[9px] font-semibold"
                >
                  View Profile
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Summary Footer */}
      <div className="bg-[#FCFBF9] border border-[#E8E4DF] rounded-xl p-6 shadow-[0_2px_20px_rgba(0,0,0,0.02)]">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 divide-x divide-[#E8E4DF]">
          <div className="pl-4 first:pl-0">
            <p className="text-[9px] uppercase tracking-wider text-[#9C9890] font-semibold">Total Employees</p>
            <p className="text-2xl font-light text-[#1C1C1A] font-serif mt-1" style={{ fontFamily: "'Playfair Display', serif" }}>{employees.length}</p>
          </div>
          <div className="pl-6">
            <p className="text-[9px] uppercase tracking-wider text-[#9C9890] font-semibold">Active</p>
            <p className="text-2xl font-light text-[#4E6D53] font-serif mt-1" style={{ fontFamily: "'Playfair Display', serif" }}>
              {employees.filter((e) => e.status === "Active").length}
            </p>
          </div>
          <div className="pl-6">
            <p className="text-[9px] uppercase tracking-wider text-[#9C9890] font-semibold">On Leave</p>
            <p className="text-2xl font-light text-[#C9A84C] font-serif mt-1" style={{ fontFamily: "'Playfair Display', serif" }}>
              {employees.filter((e) => e.status === "OnLeave").length}
            </p>
          </div>
          <div className="pl-6">
            <p className="text-[9px] uppercase tracking-wider text-[#9C9890] font-semibold">On Notice</p>
            <p className="text-2xl font-light text-[#B4463D] font-serif mt-1" style={{ fontFamily: "'Playfair Display', serif" }}>
              {employees.filter((e) => e.status === "OnNotice").length}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
