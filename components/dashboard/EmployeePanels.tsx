"use client";
import React, { useState, useEffect } from "react";
import { Users, Plus, Building2, Mail, Phone, ShieldCheck, FileText, Trash2, Search, ShieldAlert, UserCheck, UserPlus } from "lucide-react";

interface EmployeeDirectoryProps {
  userRole: string;
  triggerToast: (msg: string) => void;
  sessionUser?: any;
}

export default function EmployeeDirectory({ userRole, triggerToast, sessionUser }: EmployeeDirectoryProps) {
  const [employees, setEmployees] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [search, setSearch] = useState<string>("");
  const [filterRole, setFilterRole] = useState<string>("All");
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const [topCompany, setTopCompany] = useState("");
  const [topRole, setTopRole] = useState("Employee");

  const handleTopCompanyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setTopCompany(val);

    if (val) {
      const matched = companies.find(c => {
        const nameLower = c.name.toLowerCase();
        const codeLower = (c.code || "").toLowerCase();

        if (val === "Acolyte") return nameLower.includes("acolyte");
        if (val === "Startupflora") return nameLower.includes("startupflora");
        if (val === "Startupkare") return nameLower.includes("startupkare") || nameLower.includes("startup kare") || codeLower.includes("kare");
        if (val === "Force 009") return nameLower.includes("force") || codeLower.includes("force") || nameLower.includes("009");
        if (val === "Citiline") return nameLower.includes("citiline");
        if (val === "CFI") return nameLower.includes("cfi") || codeLower.includes("cfi");
        return false;
      });

      if (matched) {
        setFormData(prev => ({ ...prev, companyId: matched._id }));
      } else {
        const fallback = companies.find(c => c.name.toLowerCase().includes(val.toLowerCase()));
        if (fallback) {
          setFormData(prev => ({ ...prev, companyId: fallback._id }));
        } else {
          setFormData(prev => ({ ...prev, companyId: "" }));
        }
      }
    } else {
      setFormData(prev => ({ ...prev, companyId: "" }));
    }
  };

  const handleTopRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setTopRole(val);
    setFormData(prev => ({ ...prev, role: val, designation: val }));
  };

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "Employee",
    mobile: "",
    companyId: "",
    employeeId: "",
    designation: "",
    dateOfJoining: "",
    baseSalary: ""
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [empRes, compRes] = await Promise.all([
        fetch("/api/employees"),
        fetch("/api/companies")
      ]);
      const empData = await empRes.json();
      const compData = await compRes.json();
      if (empData.success) setEmployees(empData.data);
      if (compData.success) setCompanies(compData.data);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    setIsDark(document.documentElement.classList.contains("dark"));
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains("dark"));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    triggerToast("Submitting employee data...");
    try {
      const res = await fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          baseSalary: Number(formData.baseSalary)
        })
      });
      const data = await res.json();
      if (data.success) {
        triggerToast("Employee onboarded successfully!");
        setShowAddForm(false);
        setTopCompany("");
        setTopRole("Employee");
        setFormData({
          name: "", email: "", password: "", role: "Employee", mobile: "",
          companyId: "", employeeId: "", designation: "", dateOfJoining: "", baseSalary: ""
        });
        fetchData(); // Refresh list
      } else {
        triggerToast("Error: " + data.error);
      }
    } catch (err) {
      triggerToast("Network error while adding employee");
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleDelete = (id: string, name: string) => {
    setDeleteTarget({ id, name });
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/employees?id=${deleteTarget.id}`, {
        method: "DELETE"
      });
      const data = await res.json();
      if (data.success) {
        triggerToast(`Deactivated and deleted ${deleteTarget.name} successfully!`);
        fetchData();
      } else {
        triggerToast("Termination failed: " + data.error);
      }
    } catch (err) {
      triggerToast("Failed to delete user record");
    } finally {
      setDeleteTarget(null);
    }
  };

  const isManagement = ["Owner", "Director", "HR Head"].includes(userRole);

  const availableRoles = [
    "Employee", "HR Head", "HR Executive", "Department Manager",
    "DSM", "Trainer", "Accounts", "IT Admin", "RIBP / Risk Officer"
  ];

  const allowedCompanies = ["Acolyte", "Startupflora", "Startupkare", "Force 009", "Citiline", "CFI"];

  // Find current user profile
  const currentUser = employees.find(emp => emp._id === sessionUser?.id);
  const hrCompany = currentUser?.companies?.[0]; // e.g. { name: "Startupflora", code: "STARTUPFLORA" }

  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = emp.name.toLowerCase().includes(search.toLowerCase()) ||
      emp.email.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filterRole === "All" || emp.role === filterRole;

    // Role-based visibility check
    let matchesCompany = true;
    if (userRole === "HR Head" || userRole === "HR Executive") {
      if (hrCompany) {
        matchesCompany = emp.companies?.some((c: any) => c._id?.toString() === hrCompany._id?.toString()) || false;
      } else {
        matchesCompany = false;
      }
    }

    return matchesSearch && matchesFilter && matchesCompany;
  });

  // Filter top company dropdown options based on role
  let visibleCompanyOptions = allowedCompanies;
  if (userRole === "HR Head" || userRole === "HR Executive") {
    if (hrCompany) {
      const hrCompName = hrCompany.name.toLowerCase();
      const matchedOption = allowedCompanies.find(opt => {
        if (opt === "Startupkare") return hrCompName.includes("startupkare") || hrCompName.includes("startup kare");
        if (opt === "Force 009") return hrCompName.includes("force") || hrCompName.includes("009");
        return hrCompName.includes(opt.toLowerCase());
      });
      visibleCompanyOptions = matchedOption ? [matchedOption] : [];
    } else {
      visibleCompanyOptions = []; // HR has no company assigned yet
    }
  }

  // When showAddForm is toggled or visibleCompanyOptions changes, auto-select for HR
  useEffect(() => {
    if (showAddForm && (userRole === "HR Head" || userRole === "HR Executive") && visibleCompanyOptions.length === 1) {
      const defaultCompany = visibleCompanyOptions[0];
      setTopCompany(defaultCompany);

      const matched = companies.find(c => {
        const nameLower = c.name.toLowerCase();
        const codeLower = (c.code || "").toLowerCase();

        if (defaultCompany === "Acolyte") return nameLower.includes("acolyte");
        if (defaultCompany === "Startupflora") return nameLower.includes("startupflora");
        if (defaultCompany === "Startupkare") return nameLower.includes("startupkare") || nameLower.includes("startup kare") || codeLower.includes("kare");
        if (defaultCompany === "Force 009") return nameLower.includes("force") || codeLower.includes("force") || nameLower.includes("009");
        if (defaultCompany === "Citiline") return nameLower.includes("citiline");
        if (defaultCompany === "CFI") return nameLower.includes("cfi") || codeLower.includes("cfi");
        return false;
      });
      if (matched) {
        setFormData(prev => ({ ...prev, companyId: matched._id }));
      }
    }
  }, [showAddForm, visibleCompanyOptions, companies, userRole]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className={`text-2xl font-bold tracking-tight ${isDark ? "text-white" : "text-slate-800"}`}>
            Company-Wise Employee Directory
          </h1>
          <p className={`text-sm mt-1 ${isDark ? "text-gray-400" : "text-slate-500"}`}>
            Onboard and manage employees across multiple organizations.
          </p>
        </div>
        {(userRole === "Owner" || userRole === "HR Head" || userRole === "HR Executive") && (
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-lg text-sm font-bold shadow-md transition-all flex items-center gap-2"
          >
            {showAddForm ? "Cancel Registration" : <><UserPlus className="w-4 h-4" /> Add Employee</>}
          </button>
        )}
      </div>

      {showAddForm && (userRole === "Owner" || userRole === "HR Head" || userRole === "HR Executive") ? (
        <div className={`p-6 rounded-xl border shadow-sm ${isDark ? "bg-gray-900 border-gray-800" : "bg-white border-slate-200"}`}>
          <h2 className={`text-lg font-bold mb-6 ${isDark ? "text-white" : "text-slate-800"}`}>Onboard New Employee</h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Top Selection for Company and Role */}
            <div className={`p-4 rounded-xl border mb-6 grid grid-cols-1 md:grid-cols-2 gap-6 ${isDark ? "bg-gray-800/40 border-gray-700" : "bg-slate-50 border-slate-200"}`}>
              <div>
                <label className={`block text-xs font-bold mb-1.5 ${isDark ? "text-indigo-400" : "text-indigo-600"}`}>Company *</label>
                <select
                  value={topCompany}
                  onChange={handleTopCompanyChange}
                  required
                  className={`w-full p-2.5 rounded-lg border text-sm font-bold focus:border-indigo-500 focus:outline-none ${isDark ? "bg-gray-800 border-gray-700 text-white" : "bg-white border-slate-350"}`}
                >
                  {visibleCompanyOptions.length > 1 && <option value="">-- Choose Company --</option>}
                  {visibleCompanyOptions.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={`block text-xs font-bold mb-1.5 ${isDark ? "text-indigo-400" : "text-indigo-600"}`}>System Role *</label>
                <select
                  value={topRole}
                  onChange={handleTopRoleChange}
                  required
                  className={`w-full p-2.5 rounded-lg border text-sm font-bold focus:border-indigo-500 focus:outline-none ${isDark ? "bg-gray-800 border-gray-700 text-white" : "bg-white border-slate-355"}`}
                >
                  {availableRoles.map((r, i) => (
                    <option key={i} value={r}>{r}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Account Details */}
              <div className="space-y-4">
                <h3 className={`text-xs font-bold uppercase tracking-wider font-mono ${isDark ? "text-indigo-400" : "text-indigo-600"}`}>1. System Account Details</h3>

                <div>
                  <label className={`block text-xs font-bold mb-1.5 ${isDark ? "text-gray-300" : "text-slate-700"}`}>Full Name *</label>
                  <input type="text" name="name" value={formData.name} onChange={handleChange} required
                    className={`w-full p-2.5 rounded-lg border text-sm focus:border-indigo-500 focus:outline-none ${isDark ? "bg-gray-800 border-gray-700 text-white" : "bg-slate-50 border-slate-200"}`} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-xs font-bold mb-1.5 ${isDark ? "text-gray-300" : "text-slate-700"}`}>Email *</label>
                    <input type="email" name="email" value={formData.email} onChange={handleChange} required
                      className={`w-full p-2.5 rounded-lg border text-sm focus:border-indigo-500 focus:outline-none ${isDark ? "bg-gray-800 border-gray-700 text-white" : "bg-slate-50 border-slate-200"}`} />
                  </div>
                  <div>
                    <label className={`block text-xs font-bold mb-1.5 ${isDark ? "text-gray-300" : "text-slate-700"}`}>Password *</label>
                    <input type="password" name="password" value={formData.password} onChange={handleChange} required
                      className={`w-full p-2.5 rounded-lg border text-sm focus:border-indigo-500 focus:outline-none ${isDark ? "bg-gray-800 border-gray-700 text-white" : "bg-slate-50 border-slate-200"}`} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-xs font-bold mb-1.5 ${isDark ? "text-gray-300" : "text-slate-700"}`}>Mobile</label>
                    <input type="text" name="mobile" value={formData.mobile} onChange={handleChange}
                      className={`w-full p-2.5 rounded-lg border text-sm focus:border-indigo-500 focus:outline-none ${isDark ? "bg-gray-800 border-gray-700 text-white" : "bg-slate-50 border-slate-200"}`} />
                  </div>
                  <div>
                    <label className={`block text-xs font-bold mb-1.5 ${isDark ? "text-gray-300" : "text-slate-700"}`}>System Role *</label>
                    <select name="role" value={formData.role} onChange={handleChange} required disabled
                      className={`w-full p-2.5 rounded-lg border text-sm focus:border-indigo-500 focus:outline-none opacity-60 cursor-not-allowed ${isDark ? "bg-gray-800 border-gray-700 text-white" : "bg-slate-200 border-slate-200"}`}>
                      {availableRoles.map((r, i) => (
                        <option key={i} value={r}>{r}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Employment Details */}
              <div className="space-y-4">
                <h3 className={`text-xs font-bold uppercase tracking-wider font-mono ${isDark ? "text-emerald-400" : "text-emerald-600"}`}>2. Company & Employment Profile</h3>

                <div>
                  <label className={`block text-xs font-bold mb-1.5 ${isDark ? "text-gray-300" : "text-slate-700"}`}>Assign to Company *</label>
                  <select name="companyId" value={formData.companyId} onChange={handleChange} required disabled
                    className={`w-full p-2.5 rounded-lg border text-sm focus:border-indigo-500 focus:outline-none opacity-60 cursor-not-allowed ${isDark ? "bg-gray-800 border-gray-700 text-white" : "bg-slate-200 border-slate-200"}`}>
                    <option value="">-- Select Company --</option>
                    {companies.map(c => (
                      <option key={c._id} value={c._id}>{c.name} ({c.code})</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-xs font-bold mb-1.5 ${isDark ? "text-gray-300" : "text-slate-700"}`}>Employee ID *</label>
                    <input type="text" name="employeeId" value={formData.employeeId} onChange={handleChange} placeholder="e.g. EMP-101" required
                      className={`w-full p-2.5 rounded-lg border text-sm focus:border-indigo-500 focus:outline-none ${isDark ? "bg-gray-800 border-gray-700 text-white" : "bg-slate-50 border-slate-200"}`} />
                  </div>
                  <div>
                    <label className={`block text-xs font-bold mb-1.5 ${isDark ? "text-gray-300" : "text-slate-700"}`}>Designation *</label>
                    <input type="text" name="designation" value={formData.designation} onChange={handleChange} required
                      className={`w-full p-2.5 rounded-lg border text-sm focus:border-indigo-500 focus:outline-none ${isDark ? "bg-gray-800 border-gray-700 text-white" : "bg-slate-50 border-slate-200"}`} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-xs font-bold mb-1.5 ${isDark ? "text-gray-300" : "text-slate-700"}`}>Date of Joining *</label>
                    <input type="date" name="dateOfJoining" value={formData.dateOfJoining} onChange={handleChange} required
                      className={`w-full p-2.5 rounded-lg border text-sm focus:border-indigo-500 focus:outline-none ${isDark ? "bg-gray-800 border-gray-700 text-white" : "bg-slate-50 border-slate-200"}`} />
                  </div>
                  <div>
                    <label className={`block text-xs font-bold mb-1.5 ${isDark ? "text-gray-300" : "text-slate-700"}`}>Base Salary (Monthly) *</label>
                    <input type="number" name="baseSalary" value={formData.baseSalary} onChange={handleChange} required
                      className={`w-full p-2.5 rounded-lg border text-sm focus:border-indigo-500 focus:outline-none ${isDark ? "bg-gray-800 border-gray-700 text-white" : "bg-slate-50 border-slate-200"}`} />
                  </div>
                </div>
              </div>
            </div>

            <div className={`p-4 rounded-lg flex items-start gap-3 mt-4 border ${isDark ? "bg-gray-800/50 border-gray-700" : "bg-slate-50 border-slate-200"}`}>
              <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0" />
              <p className={`text-[10px] leading-relaxed ${isDark ? "text-gray-400" : "text-slate-500"}`}>
                Submitting this form will securely create a System User Account and an Employee Profile. Passwords are automatically hashed and safely stored.
              </p>
            </div>

            <div className={`flex justify-end pt-4 border-t ${isDark ? "border-gray-800" : "border-slate-100"}`}>
              <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-lg text-sm font-bold shadow-md transition-all">
                Complete Onboarding
              </button>
            </div>
          </form>
        </div>
      ) : (
        <>
          {/* Filter and Search Bar */}
          <div className={`border rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm ${isDark ? "bg-gray-900 border-gray-800" : "bg-white border-slate-200"}`}>
            <div className="flex-1 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                className={`w-full border rounded-lg pl-9 pr-4 py-2 text-xs font-semibold focus:outline-none focus:border-indigo-500 ${isDark ? "bg-gray-800 border-gray-700 text-white" : "bg-slate-50 border-slate-200 text-slate-800"}`}
                placeholder="Search employees by name or email..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-bold font-mono ${isDark ? "text-gray-400" : "text-slate-500"}`}>Role Filter:</span>
              <select
                className={`border rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none focus:border-indigo-500 ${isDark ? "bg-gray-800 border-gray-700 text-gray-300" : "bg-slate-50 border-slate-200 text-slate-700"}`}
                value={filterRole}
                onChange={e => setFilterRole(e.target.value)}
              >
                <option value="All">All Roles</option>
                {availableRoles.map((r, i) => (
                  <option key={i} value={r}>{r}</option>
                ))}
              </select>
            </div>
          </div>

          <div className={`rounded-xl border shadow-sm overflow-hidden ${isDark ? "bg-gray-900 border-gray-800" : "bg-white border-slate-200"}`}>
            {loading ? (
              <div className="text-center py-10 font-bold text-slate-400 text-xs animate-pulse">Loading directory entries...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className={`${isDark ? "bg-gray-800 text-gray-400" : "bg-slate-50 text-slate-500"}`}>
                    <tr>
                      <th className="px-6 py-4 font-bold text-xs uppercase font-mono">Employee</th>
                      <th className="px-6 py-4 font-bold text-xs uppercase font-mono">Company</th>
                      <th className="px-6 py-4 font-bold text-xs uppercase font-mono">Role & ID</th>
                      <th className="px-6 py-4 font-bold text-xs uppercase font-mono">Status</th>
                      {isManagement && <th className="px-6 py-4 font-bold text-xs uppercase font-mono text-right">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${isDark ? "divide-gray-800 text-gray-300" : "divide-slate-100 text-slate-700"}`}>
                    {filteredEmployees.length === 0 ? (
                      <tr>
                        <td colSpan={isManagement ? 5 : 4} className="px-6 py-8 text-center italic text-slate-400">No employees found.</td>
                      </tr>
                    ) : (
                      filteredEmployees.map(emp => (
                        <tr key={emp._id} className={`${isDark ? "hover:bg-gray-800/50" : "hover:bg-slate-50"}`}>
                          <td className="px-6 py-4">
                            <div className="font-bold">{emp.name}</div>
                            <div className={`text-xs mt-0.5 flex items-center gap-1 ${isDark ? "text-gray-500" : "text-slate-500"}`}>
                              <Mail className="w-3 h-3" /> {emp.email}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            {emp.companies && emp.companies.length > 0 ? (
                              <div className="flex flex-col">
                                <span className="font-bold text-indigo-600 dark:text-indigo-400">{emp.companies[0].name}</span>
                                <span className={`text-[10px] font-mono mt-0.5 ${isDark ? "text-gray-500" : "text-slate-400"}`}>CODE: {emp.companies[0].code}</span>
                              </div>
                            ) : (
                              <span className="text-slate-400 italic text-xs">Unassigned</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${isDark ? "bg-indigo-900/50 text-indigo-300" : "bg-indigo-50 text-indigo-700"}`}>{emp.role}</span>
                            {emp.employeeProfile?.employeeId && (
                              <div className={`text-xs font-mono mt-1 flex items-center gap-1 ${isDark ? "text-emerald-400" : "text-emerald-600"}`}>
                                <UserCheck className="w-3 h-3" /> {emp.employeeProfile.employeeId} - {emp.employeeProfile.designation}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2.5 py-1 text-[10px] font-black tracking-wider uppercase font-mono rounded ${emp.status === "active" ? "badge-active" : "badge-inactive"}`}>
                              {emp.status}
                            </span>
                          </td>
                          {isManagement && (
                            <td className="px-6 py-4 text-right">
                              <button
                                className="text-rose-500 hover:text-white hover:bg-rose-600 p-1.5 rounded transition-all ml-auto block"
                                onClick={() => handleDelete(emp._id, emp.name)}
                                title="Terminate Staff Member"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* TERMINATION MODAL */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-[#070810]/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className={`border w-full max-w-sm rounded-xl p-6 relative shadow-2xl animate-fade-in ${isDark ? "bg-gray-900 border-gray-800 text-white" : "bg-white border-slate-200 text-slate-800"}`}>
            <div className="flex items-center gap-3 text-rose-600 mb-4">
              <ShieldAlert className="w-6 h-6 shrink-0" />
              <h3 className="text-sm font-black uppercase tracking-wider font-mono">Terminate Staff Member</h3>
            </div>

            <p className={`text-xs leading-relaxed ${isDark ? "text-gray-400" : "text-slate-600"}`}>
              Are you absolutely sure you want to terminate <strong>{deleteTarget.name}</strong> from the active corporate staff database? This action is permanent and cannot be undone.
            </p>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setDeleteTarget(null)}
                className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all ${isDark ? "bg-gray-800 hover:bg-gray-700 text-white" : "bg-slate-100 hover:bg-slate-200 text-slate-700"}`}
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white py-2.5 rounded-lg text-xs font-bold transition-all shadow-md"
              >
                Confirm Termination
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
