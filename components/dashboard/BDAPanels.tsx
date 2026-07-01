"use client";
import React, { useState, useEffect } from "react";
import { Users, Plus, Building2, Mail, Phone, ShieldCheck, Target, TrendingUp, Search, UserCheck } from "lucide-react";

interface BDADirectoryProps {
  userRole: string;
  triggerToast: (msg: string) => void;
  sessionUser?: any;
}

export default function BDADirectory({ userRole, triggerToast, sessionUser }: BDADirectoryProps) {
  const [bdas, setBdas] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [search, setSearch] = useState<string>("");
  const [filterCompany, setFilterCompany] = useState<string>("All");

  const [topCompany, setTopCompany] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "BDA",
    mobile: "",
    companyId: "",
    employeeId: "",
    designation: "Business Development Associate",
    dateOfJoining: "",
    baseSalary: "",
    department: "Sales"
  });

  const handleTopCompanyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setTopCompany(val);
    if (val) {
      const matched = companies.find(c => {
        const nameLower = c.name.toLowerCase();
        if (val === "CFI") return nameLower.includes("cfi") || nameLower.includes("chartered");
        if (val === "RAA") return nameLower.includes("raa") || nameLower.includes("ruksana");
        if (val === "CTPL") return nameLower.includes("ctpl") || nameLower.includes("citiline");
        if (val === "ATPL") return nameLower.includes("atpl") || nameLower.includes("acolyte");
        if (val === "RNPL") return nameLower.includes("rnpl") || nameLower.includes("ruhan");
        if (val === "MVPL") return nameLower.includes("mvpl") || nameLower.includes("mavics");
        return false;
      });
      if (matched) setFormData(prev => ({ ...prev, companyId: matched.id }));
      else {
        const fallback = companies.find(c => c.name.toLowerCase().includes(val.toLowerCase()));
        setFormData(prev => ({ ...prev, companyId: fallback ? fallback.id : "" }));
      }
    } else {
      setFormData(prev => ({ ...prev, companyId: "" }));
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [empRes, compRes] = await Promise.all([
        fetch("/api/employees"),
        fetch("/api/companies")
      ]);
      const empData = await empRes.json();
      const compData = await compRes.json();
      
      if (compData.success) setCompanies(compData.data);
      if (empData.success) {
        // Filter only BDAs or Sales department
        const bdaList = empData.data.filter((emp: any) => 
          emp.role === "BDA" || (emp.employeeProfile?.department && emp.employeeProfile.department.name === "Sales")
        );
        setBdas(bdaList);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  useEffect(() => {
    if (!formData.companyId) {
      setFormData(prev => ({ ...prev, employeeId: "" }));
      return;
    }
    const fetchNextEmployeeId = async () => {
      try {
        const res = await fetch(`/api/employees/next-id?companyId=${formData.companyId}`);
        const data = await res.json();
        if (data.success && data.employeeId) {
          setFormData(prev => ({ ...prev, employeeId: data.employeeId }));
        }
      } catch (err) {}
    };
    fetchNextEmployeeId();
  }, [formData.companyId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    triggerToast("Submitting BDA Profile...");
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
        triggerToast("BDA onboarded successfully!");
        setShowAddForm(false);
        setTopCompany("");
        setFormData({
          name: "", email: "", password: "", role: "BDA", mobile: "",
          companyId: "", employeeId: "", designation: "Business Development Associate", dateOfJoining: "", baseSalary: "",
          department: "Sales"
        });
        fetchData();
      } else {
        triggerToast("Error: " + data.error);
      }
    } catch (err) {
      triggerToast("Network error while adding BDA");
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const allowedCompanies = ["CFI", "RAA", "CTPL", "ATPL", "RNPL", "MVPL"];

  const filteredBdas = bdas.filter(emp => {
    const matchesSearch = emp.name.toLowerCase().includes(search.toLowerCase()) ||
      emp.email.toLowerCase().includes(search.toLowerCase());

    let empComps: any[] = [];
    if (Array.isArray(emp.companies)) {
      empComps = emp.companies;
    }

    let matchesCompanyFilter = true;
    if (filterCompany !== "All") {
      matchesCompanyFilter = empComps.some((c: any) => c.id === filterCompany);
    }
    return matchesSearch && matchesCompanyFilter;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className={`text-2xl font-bold tracking-tight ${isDark ? "text-white" : "text-slate-800"}`}>
            BDA Sales Network
          </h1>
          <p className={`text-sm mt-1 ${isDark ? "text-gray-400" : "text-slate-500"}`}>
            Manage Business Development Associates company-wise.
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-[#714B67] hover:bg-[#5F3F56] text-white px-4 py-2.5 rounded-lg text-sm font-bold shadow-md transition-all flex items-center gap-2"
        >
          {showAddForm ? "Cancel Registration" : <><Plus className="w-4 h-4" /> Add BDA</>}
        </button>
      </div>

      {showAddForm ? (
        <div className={`p-6 rounded-xl border shadow-sm ${isDark ? "bg-gray-900 border-gray-800" : "bg-white border-slate-200"}`}>
          <h2 className={`text-lg font-bold mb-6 ${isDark ? "text-white" : "text-slate-800"}`}>Register New BDA (Sales)</h2>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className={`p-4 rounded-xl border mb-6 grid grid-cols-1 md:grid-cols-2 gap-6 ${isDark ? "bg-gray-800/40 border-gray-700" : "bg-slate-50 border-slate-200"}`}>
              <div>
                <label className={`block text-xs font-bold mb-1.5 ${isDark ? "text-indigo-400" : "text-indigo-600"}`}>Company Selection *</label>
                <select
                  value={topCompany}
                  onChange={handleTopCompanyChange}
                  required
                  className={`w-full p-2.5 rounded-lg border text-sm font-bold focus:border-indigo-500 focus:outline-none ${isDark ? "bg-gray-800 border-gray-700 text-white" : "bg-white border-slate-350"}`}
                >
                  <option value="">-- Choose Company --</option>
                  {allowedCompanies.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </div>
              <div>
                <label className={`block text-xs font-bold mb-1.5 ${isDark ? "text-indigo-400" : "text-indigo-600"}`}>Department & Role *</label>
                <div className="flex gap-2">
                  <input type="text" value="Sales" disabled className="w-1/2 p-2.5 rounded-lg border text-sm font-bold bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed" />
                  <input type="text" value="BDA" disabled className="w-1/2 p-2.5 rounded-lg border text-sm font-bold bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className={`text-xs font-bold uppercase tracking-wider font-mono ${isDark ? "text-indigo-400" : "text-[#714B67]"}`}>1. Account Details</h3>
                <div>
                  <label className="block text-xs font-bold mb-1.5 text-slate-700 dark:text-gray-300">Full Name *</label>
                  <input type="text" name="name" value={formData.name} onChange={handleChange} required className="w-full p-2.5 rounded-lg border text-sm focus:border-indigo-500 bg-white dark:bg-gray-800" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold mb-1.5 text-slate-700 dark:text-gray-300">Email *</label>
                    <input type="email" name="email" value={formData.email} onChange={handleChange} required className="w-full p-2.5 rounded-lg border text-sm focus:border-indigo-500 bg-white dark:bg-gray-800" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold mb-1.5 text-slate-700 dark:text-gray-300">Password *</label>
                    <input type="password" name="password" value={formData.password} onChange={handleChange} required className="w-full p-2.5 rounded-lg border text-sm focus:border-indigo-500 bg-white dark:bg-gray-800" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1.5 text-slate-700 dark:text-gray-300">Mobile *</label>
                  <input type="text" name="mobile" value={formData.mobile} onChange={handleChange} required className="w-full p-2.5 rounded-lg border text-sm focus:border-indigo-500 bg-white dark:bg-gray-800" />
                </div>
              </div>

              <div className="space-y-4">
                <h3 className={`text-xs font-bold uppercase tracking-wider font-mono ${isDark ? "text-emerald-400" : "text-emerald-600"}`}>2. Employment Profile</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold mb-1.5 text-slate-700 dark:text-gray-300">Employee ID *</label>
                    <input type="text" name="employeeId" value={formData.employeeId} readOnly required className="w-full p-2.5 rounded-lg border text-sm bg-slate-100 text-slate-500 dark:bg-gray-800 dark:text-gray-400 cursor-not-allowed" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold mb-1.5 text-slate-700 dark:text-gray-300">Date of Joining *</label>
                    <input type="date" name="dateOfJoining" value={formData.dateOfJoining} onChange={handleChange} required className="w-full p-2.5 rounded-lg border text-sm focus:border-indigo-500 bg-white dark:bg-gray-800" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1.5 text-slate-700 dark:text-gray-300">Base Salary (Monthly) *</label>
                  <input type="number" name="baseSalary" value={formData.baseSalary} onChange={handleChange} required className="w-full p-2.5 rounded-lg border text-sm focus:border-indigo-500 bg-white dark:bg-gray-800" />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t">
              <button type="submit" className="bg-[#714B67] hover:bg-[#5F3F56] text-white px-6 py-2.5 rounded-lg text-sm font-bold shadow-md">Complete Onboarding</button>
            </div>
          </form>
        </div>
      ) : (
        <div className={`rounded-xl border shadow-sm overflow-hidden ${isDark ? "bg-gray-900 border-gray-800" : "bg-white border-slate-200"}`}>
          {loading ? (
            <div className="text-center py-10 font-bold text-slate-400 text-xs animate-pulse">Loading BDA network...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className={`${isDark ? "bg-gray-800 text-gray-400" : "bg-slate-50 text-slate-500"}`}>
                  <tr>
                    <th className="px-6 py-4 font-bold text-xs uppercase font-mono">BDA Name</th>
                    <th className="px-6 py-4 font-bold text-xs uppercase font-mono">Company</th>
                    <th className="px-6 py-4 font-bold text-xs uppercase font-mono">Contact</th>
                    <th className="px-6 py-4 font-bold text-xs uppercase font-mono">Status</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDark ? "divide-gray-800" : "divide-slate-100"}`}>
                  {filteredBdas.length === 0 ? (
                    <tr><td colSpan={4} className="px-6 py-8 text-center italic text-slate-400">No BDAs found.</td></tr>
                  ) : (
                    filteredBdas.map(emp => (
                      <tr key={emp.id} className="hover:bg-slate-50 dark:hover:bg-gray-800/50">
                        <td className="px-6 py-4">
                          <div className="font-bold">{emp.name}</div>
                          <div className="text-[10px] text-slate-500 font-mono mt-1">ID: {emp.employeeProfile?.employeeId}</div>
                        </td>
                        <td className="px-6 py-4">
                          {emp.companies && emp.companies.length > 0 ? (
                            <div className="font-bold text-[#714B67]">{emp.companies[0].name}</div>
                          ) : "Unassigned"}
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-xs">{emp.email}</div>
                          <div className="text-xs text-slate-500">{emp.mobile}</div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 text-[10px] font-black uppercase rounded ${emp.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                            {emp.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
