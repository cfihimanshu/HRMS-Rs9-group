"use client";
import React, { useState, useEffect } from "react";
import { Users, Plus, Building2, Mail, Phone, ShieldCheck, FileText, Trash2, Search, ShieldAlert, UserCheck, UserPlus, Edit3, X } from "lucide-react";

interface EmployeeDirectoryProps {
  userRole: string;
  triggerToast: (msg: string) => void;
  sessionUser?: any;
}

const departmentRoles: Record<string, string[]> = {
  "Management": ["CEO", "Managing Director", "COO", "CTO", "CFO", "CIO", "VP", "General Manager", "Business Head"],
  "Human Resources (HR)": ["HR Executive", "HR Recruiter", "HR Generalist", "HR Manager", "HR Business Partner", "Payroll Executive", "Training Executive"],
  "Information Technology (IT)": ["Software Developer", "Frontend Developer", "Backend Developer", "Full Stack Developer", "Mobile Developer", "QA Tester", "DevOps Engineer", "System Administrator", "Network Engineer", "Database Administrator", "IT Support Engineer", "Cyber Security Analyst", "UI/UX Designer"],
  "Sales": ["Sales Executive", "Sales Representative", "Sales Manager", "Area Sales Manager", "Regional Sales Manager", "Business Development Executive (BDE)", "Business Development Manager (BDM)", "Key Account Manager"],
  "Marketing": ["Marketing Executive", "Digital Marketing Executive", "SEO Executive", "SEM Specialist", "Social Media Manager", "Content Writer", "Graphic Designer", "Brand Manager", "Marketing Manager"],
  "Accounts": ["Accounts Assistant", "Accounts Executive", "Senior Accountant", "Billing Executive", "GST Executive", "Audit Executive"],
  "Administration (Admin)": ["Admin Executive", "Office Administrator", "Office Manager", "Facility Manager", "Receptionist"],
  "Operations": ["Operation Executive", "Operation Coordinator", "Operation Manager", "Process Manager", "Logistics Coordinator"],
  "Customer Support": ["Customer Support Executive", "Customer Success Executive", "Customer Relationship Manager (CRM)", "Helpdesk Executive", "Technical Support Engineer"],
  "Legal": ["Legal Executive", "Legal Advisor", "Compliance Officer", "Corporate Lawyer", "Legal Manager"],
  "Data Entry": ["Data Entry Operator", "Documentation Executive", "MIS Executive", "Data Processing Executive"],
  "Business Analyst": ["Business Analyst", "Senior Business Analyst", "Product Analyst"]
};

export default function EmployeeDirectory({ userRole, triggerToast, sessionUser }: EmployeeDirectoryProps) {
  const [employees, setEmployees] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [isOnboardingOwner, setIsOnboardingOwner] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [search, setSearch] = useState<string>("");
  const [filterRole, setFilterRole] = useState<string>("All");
  const [filterCompany, setFilterCompany] = useState<string>("All");
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const toggleRow = (id: string) => {
    setExpandedRow(prev => prev === id ? null : id);
  };

  const [topCompany, setTopCompany] = useState("");
  const [topRole, setTopRole] = useState("Employee");
  const [dbRoles, setDbRoles] = useState<any[]>([]);
  const [dbDesignations, setDbDesignations] = useState<any[]>([]);
  const [customDeptName, setCustomDeptName] = useState("");
  const [customRoleName, setCustomRoleName] = useState("");
  const [customDesignationName, setCustomDesignationName] = useState("");
  const [showCustomDeptInput, setShowCustomDeptInput] = useState(false);
  const [showCustomRoleInput, setShowCustomRoleInput] = useState(false);
  const [showCustomDesignationInput, setShowCustomDesignationInput] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [isDeptManager, setIsDeptManager] = useState(false);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingPhoto(true);
    triggerToast("Uploading profile photo...");

    const fd = new FormData();
    fd.append("file", file);

    try {
      const res = await fetch("/api/documents/upload", {
        method: "POST",
        body: fd
      });
      const data = await res.json();
      if (data.success && data.url) {
        setFormData(prev => ({ ...prev, profilePhoto: data.url }));
        triggerToast("Profile photo uploaded successfully!");
      } else {
        triggerToast("Failed to upload photo: " + (data.error || "unknown error"));
      }
    } catch (err) {
      console.error(err);
      triggerToast("Error uploading profile photo.");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const [uploadingEditPhoto, setUploadingEditPhoto] = useState(false);

  const handleEditPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingEditPhoto(true);
    triggerToast("Uploading profile photo...");

    const fd = new FormData();
    fd.append("file", file);

    try {
      const res = await fetch("/api/documents/upload", {
        method: "POST",
        body: fd
      });
      const data = await res.json();
      if (data.success && data.url) {
        setEditForm(prev => ({ ...prev, profilePhoto: data.url }));
        triggerToast("Profile photo uploaded successfully!");
      } else {
        triggerToast("Failed to upload photo: " + (data.error || "unknown error"));
      }
    } catch (err) {
      console.error(err);
      triggerToast("Error uploading profile photo.");
    } finally {
      setUploadingEditPhoto(false);
    }
  };

  const handleTopCompanyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setTopCompany(val);

    if (val) {
      const matched = companies.find(c => c.name === val || (c.code || "").toUpperCase() === val.toUpperCase());
      if (matched) {
        setFormData(prev => ({ ...prev, companyId: matched.id }));
      } else {
        const fallback = companies.find(c => c.name.toLowerCase().includes(val.toLowerCase()) || (c.code && c.code.toLowerCase() === val.toLowerCase()));
        if (fallback) {
          setFormData(prev => ({ ...prev, companyId: fallback.id }));
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
    if (val === "add_custom_role") {
      setShowCustomRoleInput(true);
      return;
    }
    setTopRole(val);
    setFormData(prev => ({ ...prev, role: val, jobTitle: val }));
  };

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "Employee",
    mobile: "",
    companyId: "",
    employeeId: "",
    designation: "Employee",
    dateOfJoining: "",
    baseSalary: "",
    department: "Human Resources (HR)",
    jobTitle: "Employee",
    reportingManager: "",
    assignedManager: "",
    profilePhoto: "",
    dailyWorkingHours: "8",
    workingDays: "Mon,Tue,Wed,Thu,Fri,Sat"
  });

  const [showCustomCompanyInput, setShowCustomCompanyInput] = useState(false);
  const [customCompanyName, setCustomCompanyName] = useState("");
  const [customCompanyCode, setCustomCompanyCode] = useState("");

  const handleAddCustomCompany = async () => {
    if (!customCompanyName.trim() || !customCompanyCode.trim()) {
      triggerToast("Please fill both Company Name and Code");
      return;
    }
    try {
      const res = await fetch("/api/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: customCompanyName.trim(),
          code: customCompanyCode.trim().toUpperCase()
        })
      });
      const data = await res.json();
      if (data.success && data.data) {
        triggerToast("Company created successfully!");
        
        const updatedCompRes = await fetch("/api/companies");
        const updatedCompData = await updatedCompRes.json();
        if (updatedCompData.success && updatedCompData.data) {
          setCompanies(updatedCompData.data);
        }

        const newComp = data.data;
        setTopCompany(newComp.name);
        setFormData(prev => ({ ...prev, companyId: newComp.id }));
        setShowCustomCompanyInput(false);
        setCustomCompanyName("");
        setCustomCompanyCode("");
      } else {
        triggerToast("Failed to create company: " + (data.error || "unknown error"));
      }
    } catch (err) {
      console.error(err);
      triggerToast("Error creating company");
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [empRes, compRes, roleRes, desigRes] = await Promise.all([
        fetch("/api/employees"),
        fetch("/api/companies"),
        fetch("/api/roles"),
        fetch("/api/designations")
      ]);
      const empData = await empRes.json();
      const compData = await compRes.json();
      const roleData = await roleRes.json();
      const desigData = await desigRes.json();
      if (empData.success) setEmployees(empData.data);
      if (compData.success) setCompanies(compData.data);
      if (roleData.success && roleData.data) {
        setDbRoles(roleData.data);
      }
      if (desigData.success && desigData.data) {
        setDbDesignations(desigData.data);
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
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains("dark"));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  const fetchGlobalRoles = async () => {
    try {
      const res = await fetch("/api/roles");
      const data = await res.json();
      if (data.success && data.data) {
        setDbRoles(data.data);
      }
    } catch (err) {
      console.error("Error fetching global roles:", err);
    }
  };

  const fetchCompanyRoles = async (compId: string) => {
    try {
      const res = await fetch(`/api/roles?companyId=${compId}`);
      const data = await res.json();
      if (data.success && data.data) {
        setDbRoles(data.data);
      }
    } catch (err) {
      console.error("Error fetching company roles:", err);
    }
  };

  const fetchNextEmployeeId = async (compId: string) => {
    try {
      const res = await fetch(`/api/employees/next-id?companyId=${compId}`);
      const data = await res.json();
      if (data.success && data.employeeId) {
        setFormData(prev => ({ ...prev, employeeId: data.employeeId }));
      }
    } catch (err) {
      console.error("Error fetching next employeeId:", err);
    }
  };

  // Auto-generate employeeId and fetch roles on companyId selection
  useEffect(() => {
    if (!formData.companyId) {
      setFormData(prev => ({ ...prev, employeeId: "" }));
      fetchGlobalRoles();
      return;
    }
    fetchNextEmployeeId(formData.companyId);
    fetchCompanyRoles(formData.companyId);
  }, [formData.companyId]);

  // Synchronize topRole and formData.role when department or dbRoles changes
  useEffect(() => {
    const currentList = dbRoles.length > 0
      ? Array.from(new Set(dbRoles.filter((r: any) => (r.department || "").toLowerCase() === (formData.department || "Human Resources (HR)").toLowerCase()).map((r: any) => r.name)))
      : (departmentRoles[formData.department || "Human Resources (HR)"] || ["Employee"]);

    const finalRoles = currentList.length > 0 ? currentList : ["Employee"];
    if (!finalRoles.includes(formData.role)) {
      const defaultRole = finalRoles[0];
      setTopRole(defaultRole);
      // Only update role, NOT designation (designation is independent)
      setFormData(prev => ({
        ...prev,
        role: defaultRole
      }));
    }
  }, [formData.department, dbRoles]);

  // Synchronize designation when department changes
  useEffect(() => {
    const currentList = dbDesignations.filter(
      (d: any) => (d.department_id || "").toLowerCase() === (formData.department || "Human Resources (HR)").toLowerCase()
    );
    const validNames = currentList.map((d: any) => d.name);
    if (validNames.length > 0) {
      if (!validNames.includes(formData.designation)) {
        setFormData(prev => ({
          ...prev,
          designation: validNames[0]
        }));
      }
    } else {
      const globalList = dbDesignations.filter((d: any) => d.department_id === "global").map((d: any) => d.name);
      const fallbackList = globalList.length > 0 ? globalList : ["Intern", "Employee", "Department Head", "Manager"];
      if (!fallbackList.includes(formData.designation)) {
        setFormData(prev => ({
          ...prev,
          designation: fallbackList[0]
        }));
      }
    }
  }, [formData.department, dbDesignations]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    triggerToast("Submitting employee data...");
    try {
      const payload = isOnboardingOwner ? {
        ...formData,
        role: "Owner",
        department: "Management",
        designation: "Owner",
        employeeId: "OWNER-" + Date.now(), // Generate a unique OWNER-timestamp value behind the scenes
        baseSalary: 0
      } : {
        ...formData,
        baseSalary: Number(formData.baseSalary)
      };

      const res = await fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        triggerToast(isOnboardingOwner ? "Owner registered successfully!" : "Employee onboarded successfully!");
        setShowAddForm(false);
        setIsOnboardingOwner(false);
        setTopCompany("");
        setTopRole("Employee");
        setIsDeptManager(false);
        setFormData({
          name: "", email: "", password: "", role: "HR Executive", mobile: "",
          companyId: "", employeeId: "", designation: "Employee", dateOfJoining: "", baseSalary: "",
          department: "Human Resources (HR)", jobTitle: "HR Executive", reportingManager: "", assignedManager: "",
          profilePhoto: "", dailyWorkingHours: "8", workingDays: "Mon,Tue,Wed,Thu,Fri,Sat"
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
    const { name, value } = e.target;

    if (name === "department") {
      const newDept = value;
      if (newDept === "add_custom_department") {
        setShowCustomDeptInput(true);
        return;
      }
      const currentList = dbRoles.length > 0
        ? Array.from(new Set(dbRoles.filter((r: any) => (r.department || "").toLowerCase() === newDept.toLowerCase()).map((r: any) => r.name)))
        : (departmentRoles[newDept] || ["Employee"]);

      const finalRoles = currentList.length > 0 ? currentList : ["Employee"];
      const defaultRole = finalRoles[0];

      setTopRole(defaultRole);
      // Only update role, NOT designation (designation is independent)
      setFormData(prev => ({
        ...prev,
        department: newDept,
        role: defaultRole
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleAddCustomDept = async () => {
    if (!customDeptName.trim()) {
      triggerToast("Department name cannot be empty");
      return;
    }
    try {
      const res = await fetch("/api/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Employee",
          department: customDeptName.trim(),
          companyId: formData.companyId || undefined
        })
      });
      const data = await res.json();
      if (data.success) {
        triggerToast(`Department "${customDeptName.trim()}" created successfully!`);
        setShowCustomDeptInput(false);
        setCustomDeptName("");

        if (formData.companyId) {
          await fetchCompanyRoles(formData.companyId);
        } else {
          await fetchGlobalRoles();
        }

        setFormData(prev => ({
          ...prev,
          department: customDeptName.trim(),
          role: "Employee"
        }));
        setTopRole("Employee");
      } else {
        triggerToast("Failed to create department: " + data.error);
      }
    } catch (err) {
      triggerToast("Error creating custom department");
    }
  };

  const handleAddCustomRole = async () => {
    if (!customRoleName.trim()) {
      triggerToast("Role name cannot be empty");
      return;
    }
    try {
      const res = await fetch("/api/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: customRoleName.trim(),
          department: formData.department,
          companyId: formData.companyId || undefined
        })
      });
      const data = await res.json();
      if (data.success) {
        triggerToast(`Role "${customRoleName.trim()}" created under "${formData.department}" successfully!`);
        setShowCustomRoleInput(false);
        setCustomRoleName("");

        if (formData.companyId) {
          await fetchCompanyRoles(formData.companyId);
        } else {
          await fetchGlobalRoles();
        }

        setFormData(prev => ({
          ...prev,
          role: customRoleName.trim()
        }));
        setTopRole(customRoleName.trim());
      } else {
        triggerToast("Failed to create role: " + data.error);
      }
    } catch (err) {
      triggerToast("Error creating custom role");
    }
  };

  const handleAddCustomDesignation = async () => {
    if (!customDesignationName.trim()) {
      triggerToast("Designation name cannot be empty");
      return;
    }
    try {
      const res = await fetch("/api/designations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: customDesignationName.trim(),
          departmentId: formData.department
        })
      });
      const data = await res.json();
      if (data.success) {
        triggerToast(`Designation "${customDesignationName.trim()}" created successfully!`);
        setShowCustomDesignationInput(false);
        // Refresh designations list
        const desigRes = await fetch("/api/designations");
        const desigData = await desigRes.json();
        if (desigData.success && desigData.data) {
          setDbDesignations(desigData.data);
        }
        setFormData(prev => ({ ...prev, designation: customDesignationName.trim() }));
        setCustomDesignationName("");
      } else {
        triggerToast("Failed to create designation: " + data.error);
      }
    } catch (err) {
      triggerToast("Error creating custom designation");
    }
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

  // Edit Employee Modal states
  const [showEditModal, setShowEditModal] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [editForm, setEditForm] = useState({
    employeeId: "",
    companyId: "",
    name: "",
    email: "",
    mobile: "",
    role: "Employee",
    status: "active",
    designation: "",
    department: "",
    dateOfJoining: "",
    baseSalary: "",
    gender: "",
    bloodGroup: "",
    dateOfBirth: "",
    panNumber: "",
    aadhaarNumber: "",
    bankName: "",
    accountNumber: "",
    ifscCode: "",
    pfNumber: "",
    uanNumber: "",
    esiNumber: "",
    dailyWorkingHours: "8",
    workingDays: "Mon,Tue,Wed,Thu,Fri,Sat",
    reportingManager: "",
    profilePhoto: ""
  });

  const [showEditCustomDeptInput, setShowEditCustomDeptInput] = useState(false);
  const [showEditCustomRoleInput, setShowEditCustomRoleInput] = useState(false);
  const [showEditCustomDesignationInput, setShowEditCustomDesignationInput] = useState(false);
  const [editCustomDeptName, setEditCustomDeptName] = useState("");
  const [editCustomRoleName, setEditCustomRoleName] = useState("");
  const [editCustomDesignationName, setEditCustomDesignationName] = useState("");

  const handleEditAddCustomDept = async () => {
    if (!editCustomDeptName.trim()) {
      triggerToast("Department name cannot be empty");
      return;
    }
    const currentCompanyId = editForm.companyId || (employees.find(emp => emp.id === editForm.employeeId)?.employeeProfile?.companyId || undefined);
    try {
      const res = await fetch("/api/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Employee",
          department: editCustomDeptName.trim(),
          companyId: currentCompanyId
        })
      });
      const data = await res.json();
      if (data.success) {
        triggerToast(`Department "${editCustomDeptName.trim()}" created successfully!`);
        setShowEditCustomDeptInput(false);
        setEditCustomDeptName("");

        if (currentCompanyId) {
          await fetchCompanyRoles(currentCompanyId);
        } else {
          await fetchGlobalRoles();
        }

        setEditForm(prev => ({
          ...prev,
          department: editCustomDeptName.trim(),
          role: "Employee"
        }));
      } else {
        triggerToast("Failed to create department: " + data.error);
      }
    } catch (err) {
      triggerToast("Error creating custom department");
    }
  };

  const handleEditAddCustomRole = async () => {
    if (!editCustomRoleName.trim()) {
      triggerToast("Role name cannot be empty");
      return;
    }
    const currentCompanyId = editForm.companyId || (employees.find(emp => emp.id === editForm.employeeId)?.employeeProfile?.companyId || undefined);
    try {
      const res = await fetch("/api/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editCustomRoleName.trim(),
          department: editForm.department,
          companyId: currentCompanyId
        })
      });
      const data = await res.json();
      if (data.success) {
        triggerToast(`Role "${editCustomRoleName.trim()}" created under "${editForm.department}" successfully!`);
        setShowEditCustomRoleInput(false);
        setEditCustomRoleName("");

        if (currentCompanyId) {
          await fetchCompanyRoles(currentCompanyId);
        } else {
          await fetchGlobalRoles();
        }

        setEditForm(prev => ({
          ...prev,
          role: editCustomRoleName.trim()
        }));
      } else {
        triggerToast("Failed to create role: " + data.error);
      }
    } catch (err) {
      triggerToast("Error creating custom role");
    }
  };

  const handleEditAddCustomDesignation = async () => {
    if (!editCustomDesignationName.trim()) {
      triggerToast("Designation name cannot be empty");
      return;
    }
    try {
      const res = await fetch("/api/designations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editCustomDesignationName.trim(),
          departmentId: editForm.department
        })
      });
      const data = await res.json();
      if (data.success) {
        triggerToast(`Designation "${editCustomDesignationName.trim()}" created successfully!`);
        setShowEditCustomDesignationInput(false);
        // Refresh designations list
        const desigRes = await fetch("/api/designations");
        const desigData = await desigRes.json();
        if (desigData.success && desigData.data) {
          setDbDesignations(desigData.data);
        }
        setEditForm(prev => ({ ...prev, designation: editCustomDesignationName.trim() }));
        setEditCustomDesignationName("");
      } else {
        triggerToast("Failed to create designation: " + data.error);
      }
    } catch (err) {
      triggerToast("Error creating custom designation");
    }
  };

  const handleStartEditEmployee = (emp: any) => {
    const profile = emp.employeeProfile || {};

    setShowEditCustomDeptInput(false);
    setShowEditCustomRoleInput(false);
    setShowEditCustomDesignationInput(false);
    setEditCustomDeptName("");
    setEditCustomRoleName("");
    setEditCustomDesignationName("");

    const formatDate = (dateStr: any) => {
      if (!dateStr) return "";
      try {
        return new Date(dateStr).toISOString().split('T')[0];
      } catch (e) {
        return "";
      }
    };

    setEditForm({
      employeeId: profile.employeeId || "",
      companyId: profile.companyId || "",
      name: emp.name || "",
      email: emp.email || "",
      mobile: emp.mobile || "",
      role: emp.role || "Employee",
      status: emp.status || "active",
      designation: profile.designation || "",
      department: typeof profile.department === "object" ? (profile.department?.name || "") : (profile.department || ""),
      dateOfJoining: formatDate(profile.dateOfJoining),
      baseSalary: profile.baseSalary !== undefined ? String(profile.baseSalary) : "",
      gender: profile.gender || "",
      bloodGroup: profile.bloodGroup || "",
      dateOfBirth: formatDate(profile.dateOfBirth),
      panNumber: profile.panNumber || "",
      aadhaarNumber: profile.aadhaarNumber || "",
      bankName: profile.bankName || "",
      accountNumber: profile.accountNumber || "",
      ifscCode: profile.ifscCode || "",
      pfNumber: profile.pfNumber || "",
      uanNumber: profile.uanNumber || "",
      esiNumber: profile.esiNumber || "",
      dailyWorkingHours: profile.dailyWorkingHours !== undefined ? String(profile.dailyWorkingHours) : "8",
      workingDays: profile.workingDays || "Mon,Tue,Wed,Thu,Fri,Sat",
      reportingManager: profile.reportingManager || "",
      profilePhoto: profile.profilePhoto || ""
    });

    setShowEditModal(true);
  };

  const handleEditEmployeeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    triggerToast("Saving employee details...");
    try {
      setUpdating(true);
      const res = await fetch("/api/employees", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...editForm,
          baseSalary: editForm.baseSalary ? Number(editForm.baseSalary) : null,
          dateOfBirth: editForm.dateOfBirth === "" ? null : editForm.dateOfBirth,
          dateOfJoining: editForm.dateOfJoining === "" ? null : editForm.dateOfJoining,
          dailyWorkingHours: editForm.dailyWorkingHours ? Number(editForm.dailyWorkingHours) : 8,
        })
      });
      const data = await res.json();
      if (data.success) {
        triggerToast("Employee details updated successfully!");
        setShowEditModal(false);
        fetchData();
      } else {
        triggerToast("Failed to update employee: " + data.error);
      }
    } catch (err) {
      triggerToast("Error updating employee");
    } finally {
      setUpdating(false);
    }
  };

  const isManagement = ["Owner", "Director", "HR Head"].includes(userRole);

  const defaultDepts = [
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
  const availableDepartments = dbRoles.length > 0
    ? Array.from(new Set(dbRoles.map((r: any) => r.department).filter(Boolean))).sort()
    : defaultDepts;

  // const allowedCompanies = ["CFI", "RAA", "CTPL", "ATPL", "RNPL", "MVPL"];

  // Find current user profile
  const currentUser = employees.find(emp => emp.id === sessionUser?.id);

  let currentUserComps: any[] = [];
  if (currentUser) {
    let comps = currentUser.companies;
    while (typeof comps === "string") {
      try {
        const parsed = JSON.parse(comps);
        if (parsed === comps) {
          comps = [parsed];
          break;
        }
        comps = parsed;
      } catch (e) {
        if (comps.startsWith("[") && comps.endsWith("]")) {
          comps = [comps];
        } else {
          comps = comps.split(",").map((s: string) => s.trim()).filter(Boolean);
        }
        break;
      }
    }
    if (Array.isArray(comps)) {
      currentUserComps = comps.map(c => typeof c === "string" ? c.replace(/[\[\]"'\\]/g, "").trim() : c);
    } else if (comps) {
      currentUserComps = [typeof comps === "string" ? comps.replace(/[\[\]"'\\]/g, "").trim() : comps];
    }
  }

  const defaultCompanyRef = currentUserComps[0];
  let defaultCompanyId = "";
  if (defaultCompanyRef) {
    const refId = typeof defaultCompanyRef === 'string' ? defaultCompanyRef : defaultCompanyRef.id?.toString();
    const exists = companies.some((c: any) => c.id?.toString() === refId);
    if (exists) {
      defaultCompanyId = refId;
    }
  }
  if (!defaultCompanyId && companies.length > 0) {
    defaultCompanyId = companies[0].id?.toString() || "";
  }

  let hrCompany: any = null;
  if (currentUserComps.length > 0) {
    const compRef = currentUserComps[0];
    const compId = typeof compRef === 'string' ? compRef : compRef?.id?.toString();
    hrCompany = companies.find((c: any) => c.id?.toString() === compId) || (typeof compRef === 'object' ? compRef : null);
  }
  if (!hrCompany && companies.length > 0) {
    hrCompany = companies[0];
  }

  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = emp.name.toLowerCase().includes(search.toLowerCase()) ||
      emp.email.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filterRole === "All" || emp.role === filterRole;

    let empComps: any[] = [];
    if (Array.isArray(emp.companies)) {
      empComps = emp.companies;
    } else if (typeof emp.companies === 'string') {
      try {
        const parsed = JSON.parse(emp.companies);
        empComps = Array.isArray(parsed) ? parsed : (parsed ? [parsed] : []);
      } catch (e) {
        empComps = [];
      }
    } else if (emp.companies) {
      empComps = [emp.companies];
    }

    // Company filter from UI dropdown
    let matchesCompanyFilter = true;
    if (filterCompany !== "All") {
      matchesCompanyFilter = empComps.some((c: any) => {
        const cid = typeof c === 'string' ? c : c?.id?.toString();
        return cid === filterCompany;
      });
    }

    // Role-based visibility check
    let matchesCompany = true;
    const normalizedRole = (userRole || "").trim().toLowerCase();
    const isHrRole = normalizedRole === "hr head" || normalizedRole === "hr executive";
    if (isHrRole) {
      if (hrCompany) {
        matchesCompany = empComps.some((c: any) => {
          const cid = typeof c === 'string' ? c : c?.id?.toString();
          return cid === hrCompany.id?.toString();
        });
      } else {
        matchesCompany = false;
      }
    }

    return matchesSearch && matchesFilter && matchesCompanyFilter && matchesCompany;
  });

  // Filter top company dropdown options based on role
  let visibleCompanyOptions = companies.map(c => c.name);
  const normalizedRoleOptions = (userRole || "").trim().toLowerCase();
  const isHrRoleOptions = normalizedRoleOptions === "hr head" || normalizedRoleOptions === "hr executive";
  if (isHrRoleOptions) {
    if (hrCompany && hrCompany.name) {
      const hrCompName = hrCompany.name.toLowerCase();
      const matched = companies.find(c => c.name.toLowerCase() === hrCompName || hrCompName.includes(c.name.toLowerCase()) || (c.code && hrCompName.includes(c.code.toLowerCase())));
      visibleCompanyOptions = matched ? [matched.name] : [];
    } else {
      visibleCompanyOptions = []; // HR has no company assigned yet
    }
  }

  // When showAddForm is toggled or visibleCompanyOptions changes, auto-select for HR
  useEffect(() => {
    const nRole = (userRole || "").trim().toLowerCase();
    const isHr = nRole === "hr head" || nRole === "hr executive";
    if (showAddForm && isHr && visibleCompanyOptions.length === 1) {
      const defaultCompany = visibleCompanyOptions[0];
      setTopCompany(defaultCompany);

      const matched = companies.find(c => c.name === defaultCompany || (c.code || "").toUpperCase() === defaultCompany.toUpperCase());
      if (matched) {
        setFormData(prev => ({ ...prev, companyId: matched.id }));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showAddForm, visibleCompanyOptions.join(','), companies, userRole]);

  // Filter roles based on selected department for display
  const finalRolesList = dbRoles.length > 0
    ? Array.from(new Set(dbRoles.filter((r: any) => (r.department || "").toLowerCase() === (formData.department || "Human Resources (HR)").toLowerCase()).map((r: any) => r.name)))
    : (departmentRoles[formData.department || "Human Resources (HR)"] || ["Employee"]);

  // Get all unique roles of actually created users/employees across all companies
  const uniqueRoleNames = Array.from(new Set(employees.map((emp: any) => emp.role).filter(Boolean))).sort();

  // Employees in the same company (for Department Manager dropdown, showing all departments of the company)
  const deptEmployeesForManager = employees.filter((emp: any) => {
    let compMatch = true;
    if (formData.companyId) {
      let empComps: any[] = [];
      if (Array.isArray(emp.companies)) empComps = emp.companies;
      else if (typeof emp.companies === "string") { try { empComps = JSON.parse(emp.companies); } catch { empComps = []; } }
      compMatch = empComps.some((c: any) => (typeof c === "string" ? c : c?.id?.toString()) === formData.companyId);
    }
    return compMatch;
  });

  // Manager-role users in selected company (for Assign Manager dropdown)
  const managerRoleKeywords = ["manager", "head", "director", "ceo", "coo", "cfo", "cto", "vp", "owner", "lead"];
  const companyManagersList = employees.filter((emp: any) => {
    const roleLower = (emp.role || "").toLowerCase();
    const isManagerRole = managerRoleKeywords.some(kw => roleLower.includes(kw));
    if (!isManagerRole) return false;
    if (!formData.companyId) return true;
    let empComps: any[] = [];
    if (Array.isArray(emp.companies)) empComps = emp.companies;
    else if (typeof emp.companies === "string") { try { empComps = JSON.parse(emp.companies); } catch { empComps = []; } }
    return empComps.some((c: any) => (typeof c === "string" ? c : c?.id?.toString()) === formData.companyId);
  });

  // Filter designations based on selected department
  const filteredDesignations = dbDesignations.filter(
    (d: any) => (d.department_id || "").toLowerCase() === (formData.department || "Human Resources (HR)").toLowerCase()
  );
  let displayDesignations = filteredDesignations.length > 0
    ? [...filteredDesignations]
    : dbDesignations.filter((d: any) => d.department_id === "global").length > 0
      ? [...dbDesignations.filter((d: any) => d.department_id === "global")]
      : [
          { id: "desig_intern", name: "Intern" },
          { id: "desig_employee", name: "Employee" },
          { id: "desig_dept_head", name: "Department Head" },
          { id: "desig_manager", name: "Manager" }
        ];
  if (!displayDesignations.some((d: any) => (d.name || "").toLowerCase() === "employee")) {
    displayDesignations.push({ id: "desig_employee_default", name: "Employee" });
  }

  // Helper definitions for editing employee designations and roles dynamically based on department selection
  const editFilteredDesignations = dbDesignations.filter(
    (d: any) => (d.department_id || "").toLowerCase() === (editForm.department || "Human Resources (HR)").toLowerCase()
  );
  let editDisplayDesignations = editFilteredDesignations.length > 0
    ? [...editFilteredDesignations]
    : dbDesignations.filter((d: any) => d.department_id === "global").length > 0
      ? [...dbDesignations.filter((d: any) => d.department_id === "global")]
      : [
          { id: "desig_intern", name: "Intern" },
          { id: "desig_employee", name: "Employee" },
          { id: "desig_dept_head", name: "Department Head" },
          { id: "desig_manager", name: "Manager" }
        ];
  if (!editDisplayDesignations.some((d: any) => (d.name || "").toLowerCase() === "employee")) {
    editDisplayDesignations.push({ id: "desig_employee_default", name: "Employee" });
  }

  const editRolesList = dbRoles.length > 0
    ? Array.from(new Set(dbRoles.filter((r: any) => (r.department || "").toLowerCase() === (editForm.department || "Human Resources (HR)").toLowerCase()).map((r: any) => r.name)))
    : (departmentRoles[editForm.department || "Human Resources (HR)"] || ["Employee"]);

  const editDeptEmployees = employees.filter((emp: any) => {
    if (emp.employeeProfile?.employeeId === editForm.employeeId) return false;

    const currentCompanyId = editForm.companyId || (employees.find(e => e.employeeProfile?.employeeId === editForm.employeeId)?.employeeProfile?.companyId || "");
    if (!currentCompanyId) return true;

    let empComps: any[] = [];
    if (Array.isArray(emp.companies)) empComps = emp.companies;
    else if (typeof emp.companies === "string") { try { empComps = JSON.parse(emp.companies); } catch { empComps = []; } }
    
    return empComps.some((c: any) => (typeof c === "string" ? c : c?.id?.toString()) === currentCompanyId);
  });

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
        <div className="flex items-center gap-2">
          {(userRole === "Owner" || userRole === "HR Head" || userRole === "HR Executive") && (
            <button
              onClick={() => {
                if (showAddForm && !isOnboardingOwner) {
                  setShowAddForm(false);
                } else {
                  setShowAddForm(true);
                  setIsOnboardingOwner(false);
                   setFormData({
                    name: "", email: "", password: "", role: "HR Executive", mobile: "",
                    companyId: "", employeeId: "", designation: "Employee", dateOfJoining: "", baseSalary: "",
                    department: "Human Resources (HR)", jobTitle: "HR Executive", reportingManager: "", assignedManager: "",
                    profilePhoto: "", dailyWorkingHours: "8", workingDays: "Mon,Tue,Wed,Thu,Fri,Sat"
                  });
                  setIsDeptManager(false);
                }
              }}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-lg text-sm font-bold shadow-md transition-all flex items-center gap-2"
            >
              {(showAddForm && !isOnboardingOwner) ? "Cancel Registration" : <><UserPlus className="w-4 h-4" /> Add Employee</>}
            </button>
          )}
          {userRole === "Owner" && (
            <button
              onClick={() => {
                if (showAddForm && isOnboardingOwner) {
                  setShowAddForm(false);
                  setIsOnboardingOwner(false);
                  setFormData({
                    name: "", email: "", password: "", role: "HR Executive", mobile: "",
                    companyId: "", employeeId: "", designation: "Employee", dateOfJoining: "", baseSalary: "",
                    department: "Human Resources (HR)", jobTitle: "HR Executive", reportingManager: "", assignedManager: "",
                    profilePhoto: "", dailyWorkingHours: "8", workingDays: "Mon,Tue,Wed,Thu,Fri,Sat"
                  });
                  setIsDeptManager(false);
                } else {
                  setShowAddForm(true);
                  setIsOnboardingOwner(true);
                  setFormData(prev => ({
                    ...prev,
                    companyId: defaultCompanyId,
                    role: "Owner",
                    department: "Management",
                    designation: "Owner"
                  }));
                }
              }}
              className="bg-slate-700 hover:bg-slate-800 text-white px-4 py-2.5 rounded-lg text-sm font-bold shadow-md transition-all flex items-center gap-2"
            >
              {(showAddForm && isOnboardingOwner) ? "Cancel Registration" : <><UserPlus className="w-4 h-4 text-indigo-400" /> Add Owner</>}
            </button>
          )}
        </div>
      </div>

      {showAddForm && (userRole === "Owner" || userRole === "HR Head" || userRole === "HR Executive") ? (
        <div className={`p-6 rounded-xl border shadow-sm ${isDark ? "bg-gray-900 border-gray-800" : "bg-white border-slate-200"}`}>
          <h2 className={`text-lg font-bold mb-6 ${isDark ? "text-white" : "text-slate-800"}`}>
            {isOnboardingOwner ? "Owner Onboarding" : "Onboard New Employee"}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
              
              {/* Left Column: Personal Information */}
              <div className="space-y-6">
                <div className="flex items-center gap-2 mb-2 pb-2 border-b border-dashed border-slate-200 dark:border-gray-800">
                  <div className={`w-1.5 h-4 rounded-full ${isDark ? "bg-indigo-400" : "bg-indigo-500"}`} />
                  <span className={`text-xs font-black tracking-widest uppercase font-mono ${isDark ? "text-indigo-400" : "text-indigo-600"}`}>Personal Information</span>
                </div>

                <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-start p-4 rounded-xl border border-indigo-50/50 dark:border-gray-800 bg-slate-50/30 dark:bg-gray-800/10">
                  {/* Photo Upload Area */}
                  <div className="flex flex-col items-center justify-center p-3 border-2 border-dashed rounded-xl w-32 h-32 text-center cursor-pointer relative group transition-all hover:border-indigo-500 hover:bg-indigo-50/5 dark:hover:bg-indigo-950/10">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="absolute inset-0 opacity-0 cursor-pointer z-10"
                      disabled={uploadingPhoto}
                    />
                    {uploadingPhoto ? (
                      <div className="text-[10px] font-semibold text-slate-400 animate-pulse">Uploading...</div>
                    ) : formData.profilePhoto ? (
                      <div className="w-full h-full relative">
                        <img
                          src={formData.profilePhoto}
                          alt="Preview"
                          className="w-full h-full object-cover rounded-lg"
                        />
                        <div className="absolute inset-0 bg-black/40 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <span className="text-white text-[10px] font-bold">Change</span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center">
                        <UserPlus className="w-5 h-5 text-indigo-500 mb-1" />
                        <span className="text-[10px] font-bold text-slate-700 dark:text-gray-300">Upload Photo</span>
                        <span className="text-[8px] text-slate-400 mt-0.5">PNG, JPG</span>
                      </div>
                    )}
                  </div>

                  <div className="text-center sm:text-left">
                    <h4 className="font-bold text-xs text-slate-800 dark:text-slate-200">Profile Photograph</h4>
                    <p className="text-[10px] text-slate-500 dark:text-gray-400 mt-1 max-w-[200px] leading-relaxed">
                      Upload a passport size photograph of the employee. Accepted formats: JPG, PNG under 5MB.
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className={`block text-xs font-bold mb-1.5 ${isDark ? "text-gray-300" : "text-slate-700"}`}>Full Name *</label>
                    <input type="text" name="name" value={formData.name} onChange={handleChange} required
                      className={`w-full p-2.5 rounded-lg border text-xs focus:border-indigo-500 focus:outline-none ${isDark ? "bg-gray-800 border-gray-700 text-white" : "bg-slate-50 border-slate-200"}`} />
                  </div>

                  <div>
                    <label className={`block text-xs font-bold mb-1.5 ${isDark ? "text-gray-300" : "text-slate-700"}`}>Email *</label>
                    <input type="email" name="email" value={formData.email} onChange={handleChange} required
                      className={`w-full p-2.5 rounded-lg border text-xs focus:border-indigo-500 focus:outline-none ${isDark ? "bg-gray-800 border-gray-700 text-white" : "bg-slate-50 border-slate-200"}`} />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className={`block text-xs font-bold mb-1.5 ${isDark ? "text-gray-300" : "text-slate-700"}`}>Password *</label>
                      <input type="password" name="password" value={formData.password} onChange={handleChange} required
                        className={`w-full p-2.5 rounded-lg border text-xs focus:border-indigo-500 focus:outline-none ${isDark ? "bg-gray-800 border-gray-700 text-white" : "bg-slate-50 border-slate-200"}`} />
                    </div>
                    <div>
                      <label className={`block text-xs font-bold mb-1.5 ${isDark ? "text-gray-300" : "text-slate-700"}`}>Mobile Number</label>
                      <input type="text" name="mobile" value={formData.mobile} onChange={handleChange}
                        className={`w-full p-2.5 rounded-lg border text-xs focus:border-indigo-500 focus:outline-none ${isDark ? "bg-gray-800 border-gray-700 text-white" : "bg-slate-50 border-slate-200"}`} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Company & Employment Details */}
              <div className="space-y-6">
                <div className="flex items-center gap-2 mb-2 pb-2 border-b border-dashed border-slate-200 dark:border-gray-800">
                  <div className={`w-1.5 h-4 rounded-full ${isDark ? "bg-emerald-400" : "bg-emerald-500"}`} />
                  <span className={`text-xs font-black tracking-widest uppercase font-mono ${isDark ? "text-emerald-400" : "text-emerald-600"}`}>
                    {isOnboardingOwner ? "Owner Configuration" : "Company & Employment Details"}
                  </span>
                </div>

                {!isOnboardingOwner ? (
                  <div className="space-y-4">
                    {/* Row 1: Company & Department */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className={`block text-xs font-bold mb-1.5 ${isDark ? "text-indigo-400" : "text-indigo-600"}`}>Company *</label>
                        <select
                          value={topCompany}
                          onChange={(e) => {
                            if (e.target.value === "add_custom_company") {
                              setShowCustomCompanyInput(true);
                            } else {
                              setShowCustomCompanyInput(false);
                              handleTopCompanyChange(e);
                            }
                          }}
                          required
                          className={`w-full p-2.5 rounded-lg border text-sm font-bold focus:border-indigo-500 focus:outline-none transition-all ${isDark ? "bg-gray-800 border-gray-700 text-white" : "bg-white border-slate-300 hover:border-indigo-400"}`}
                        >
                          {visibleCompanyOptions.length > 1 && <option value="">-- Choose Company --</option>}
                          {visibleCompanyOptions.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                          <option value="add_custom_company">+ Add Custom Company...</option>
                        </select>
                        {showCustomCompanyInput && (
                          <div className="mt-2 p-3 border border-dashed rounded bg-slate-50 dark:bg-gray-800 space-y-2">
                            <div>
                              <input
                                type="text"
                                value={customCompanyName}
                                onChange={e => setCustomCompanyName(e.target.value)}
                                placeholder="Company Name (e.g. Acolyte)"
                                className={`w-full p-2 rounded border text-xs focus:outline-none focus:border-indigo-500 ${isDark ? "bg-gray-850 border-gray-700 text-white" : "bg-slate-50 border-slate-200 text-slate-700"}`}
                              />
                            </div>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={customCompanyCode}
                                onChange={e => setCustomCompanyCode(e.target.value)}
                                placeholder="Code (e.g. ACT)"
                                className={`flex-1 p-2 rounded border text-xs focus:outline-none focus:border-indigo-500 ${isDark ? "bg-gray-850 border-gray-700 text-white" : "bg-slate-50 border-slate-200 text-slate-700"}`}
                              />
                              <button type="button" onClick={handleAddCustomCompany} className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-3 py-1.5 rounded font-bold transition-all">Add</button>
                              <button type="button" onClick={() => { setShowCustomCompanyInput(false); setCustomCompanyName(""); setCustomCompanyCode(""); }} className={`text-xs px-3 py-1.5 rounded font-bold border transition-all ${isDark ? "bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"}`}>Cancel</button>
                            </div>
                          </div>
                        )}
                      </div>

                      <div>
                        <label className={`block text-xs font-bold mb-1.5 ${isDark ? "text-indigo-400" : "text-indigo-600"}`}>Department *</label>
                        <select
                          name="department"
                          value={formData.department}
                          onChange={handleChange}
                          required
                          className={`w-full p-2.5 rounded-lg border text-sm font-bold focus:border-indigo-500 focus:outline-none transition-all ${isDark ? "bg-gray-800 border-gray-700 text-white" : "bg-white border-slate-300 hover:border-indigo-400"}`}
                        >
                          {availableDepartments.map(dept => (
                            <option key={dept} value={dept}>{dept}</option>
                          ))}
                          <option value="add_custom_department">+ Add Custom Department...</option>
                        </select>
                        {showCustomDeptInput && (
                          <div className="mt-2 flex gap-2">
                            <input
                              type="text"
                              value={customDeptName}
                              onChange={e => setCustomDeptName(e.target.value)}
                              placeholder="New Dept Name"
                              className={`flex-1 p-2 rounded border text-xs focus:outline-none focus:border-indigo-500 ${isDark ? "bg-gray-800 border-gray-700 text-white" : "bg-slate-50 border-slate-200 text-slate-700"}`}
                            />
                            <button type="button" onClick={handleAddCustomDept} className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-3 py-1.5 rounded font-bold transition-all">Add</button>
                            <button type="button" onClick={() => { setShowCustomDeptInput(false); setCustomDeptName(""); }} className={`text-xs px-3 py-1.5 rounded font-bold border transition-all ${isDark ? "bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"}`}>Cancel</button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Row 2: Role & Job Title */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className={`block text-xs font-bold mb-1.5 ${isDark ? "text-indigo-400" : "text-indigo-600"}`}>Role *</label>
                        <select
                          value={topRole}
                          onChange={handleTopRoleChange}
                          required
                          className={`w-full p-2.5 rounded-lg border text-sm font-bold focus:border-indigo-500 focus:outline-none transition-all ${isDark ? "bg-gray-800 border-gray-700 text-white" : "bg-white border-slate-300 hover:border-indigo-400"}`}
                        >
                          {finalRolesList.map((r, i) => (
                            <option key={i} value={r}>{r}</option>
                          ))}
                          <option value="add_custom_role">+ Add Custom Role...</option>
                        </select>
                        {showCustomRoleInput && (
                          <div className="mt-2 flex gap-2">
                            <input
                              type="text"
                              value={customRoleName}
                              onChange={e => setCustomRoleName(e.target.value)}
                              placeholder="New Role Name"
                              className={`flex-1 p-2 rounded border text-xs focus:outline-none focus:border-indigo-500 ${isDark ? "bg-gray-800 border-gray-700 text-white" : "bg-slate-50 border-slate-200 text-slate-700"}`}
                        />
                            <button type="button" onClick={handleAddCustomRole} className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-3 py-1.5 rounded font-bold transition-all">Add</button>
                            <button type="button" onClick={() => { setShowCustomRoleInput(false); setCustomRoleName(""); }} className={`text-xs px-3 py-1.5 rounded font-bold border transition-all ${isDark ? "bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"}`}>Cancel</button>
                      </div>
                        )}
                      </div>

                      <div>
                        <label className={`block text-xs font-bold mb-1.5 ${isDark ? "text-emerald-400" : "text-emerald-600"}`}>
                          Job Title
                          <span className={`ml-1.5 text-[9px] font-normal px-1.5 py-0.5 rounded ${isDark ? "bg-emerald-900/40 text-emerald-400" : "bg-emerald-50 text-emerald-600"}`}>Auto-filled</span>
                        </label>
                        <input
                          type="text"
                          value={formData.jobTitle || formData.role}
                          onChange={(e) => setFormData(prev => ({ ...prev, jobTitle: e.target.value, designation: e.target.value }))}
                          placeholder="Job title"
                          className={`w-full p-2.5 rounded-lg border text-sm font-bold focus:border-emerald-500 focus:outline-none transition-all ${isDark ? "bg-gray-800 border-gray-700 text-white" : "bg-white border-slate-300 hover:border-emerald-400"}`}
                        />
                      </div>
                    </div>

                    {/* Department Manager Switch Toggle */}
                    <div className="flex items-center gap-2 pt-1">
                      <label className="relative inline-flex items-center cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={isDeptManager}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setIsDeptManager(checked);
                            if (checked) {
                              setFormData(prev => ({
                                ...prev,
                                reportingManager: ""
                              }));
                            }
                          }}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-gray-200 dark:bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 dark:after:border-gray-600 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                        <span className="ml-2.5 text-xs font-bold text-slate-700 dark:text-gray-300">
                          Make this user the Manager of this Department
                        </span>
                      </label>
                    </div>

                    {/* Row 3: Department Manager (Assign Manager is removed) */}
                    <div>
                      {!isDeptManager ? (
                        <div>
                          <label className={`block text-xs font-bold mb-1 ${isDark ? "text-amber-400" : "text-amber-700"}`}>
                            Department Reporting Manager
                          </label>
                          <select
                            value={formData.reportingManager}
                            onChange={(e) => setFormData(prev => ({ ...prev, reportingManager: e.target.value }))}
                            className={`w-full p-2.5 rounded-lg border text-sm font-bold focus:border-amber-500 focus:outline-none transition-all ${isDark ? "bg-gray-800 border-gray-700 text-white" : "bg-white border-slate-300 hover:border-amber-400"}`}
                          >
                            <option value="">— No direct dept. manager —</option>
                            {deptEmployeesForManager.map((emp: any) => (
                              <option key={emp.id} value={emp.name}>{emp.name} ({emp.role})</option>
                            ))}
                          </select>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center p-3 bg-indigo-50/30 dark:bg-indigo-950/20 border border-dashed border-indigo-200 dark:border-indigo-800 rounded-lg">
                          <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-400 text-center">
                            ⭐ Onboarding as Department Manager. Reporting manager dropdown disabled.
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Row 4: ID, Joining Date, Salary */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className={`block text-xs font-bold mb-1.5 ${isDark ? "text-gray-300" : "text-slate-700"}`}>Employee ID *</label>
                        <input type="text" name="employeeId" value={formData.employeeId} readOnly required placeholder="Auto-generated"
                          className={`w-full p-2.5 rounded-lg border text-sm focus:outline-none opacity-80 cursor-not-allowed ${isDark ? "bg-gray-800/80 border-gray-700 text-gray-400" : "bg-slate-100 border-slate-200 text-slate-500"}`} />
                      </div>
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

                    {/* Row 5: Daily Working Hours & Working Days Selector */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className={`block text-xs font-bold mb-1.5 ${isDark ? "text-gray-300" : "text-slate-700"}`}>Daily Working Hours *</label>
                        <input type="number" name="dailyWorkingHours" min="1" max="24" value={formData.dailyWorkingHours} onChange={handleChange} required
                          className={`w-full p-2.5 rounded-lg border text-sm focus:border-indigo-500 focus:outline-none ${isDark ? "bg-gray-800 border-gray-700 text-white" : "bg-slate-50 border-slate-200"}`} />
                      </div>
                      <div>
                        <label className={`block text-xs font-bold mb-1.5 ${isDark ? "text-gray-300" : "text-slate-700"}`}>Working Days *</label>
                        <div className="flex gap-1.5 pt-1">
                          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => {
                            const isWorking = formData.workingDays ? formData.workingDays.split(",").includes(day) : day !== "Sun";
                            return (
                              <button
                                type="button"
                                key={day}
                                onClick={() => {
                                  const currentDays = formData.workingDays ? formData.workingDays.split(",").filter(Boolean) : ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
                                  let newDays = [];
                                  if (currentDays.includes(day)) {
                                    newDays = currentDays.filter(d => d !== day);
                                  } else {
                                    newDays = [...currentDays, day];
                                  }
                                  setFormData(prev => ({ ...prev, workingDays: newDays.join(",") }));
                                }}
                                className={`w-8 h-8 rounded-lg text-[10px] font-black uppercase transition-all shadow-sm border ${
                                  isWorking
                                    ? "bg-blue-600 border-blue-600 text-white hover:bg-blue-700"
                                    : "bg-white dark:bg-gray-850 border-slate-250 dark:border-gray-750 text-slate-500 dark:text-gray-450 hover:bg-slate-50"
                                }`}
                              >
                                {day.slice(0, 1)}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Owner specific profile inputs */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className={`block text-xs font-bold mb-1.5 ${isDark ? "text-gray-300" : "text-slate-700"}`}>Employee ID *</label>
                        <input type="text" name="employeeId" value="Auto-generated Owner ID" readOnly
                          className={`w-full p-2.5 rounded-lg border text-sm focus:outline-none opacity-80 cursor-not-allowed ${isDark ? "bg-gray-800/80 border-gray-700 text-gray-400" : "bg-slate-100 border-slate-200 text-slate-500"}`} />
                      </div>
                      <div>
                        <label className={`block text-xs font-bold mb-1.5 ${isDark ? "text-gray-300" : "text-slate-700"}`}>Date of Joining *</label>
                        <input type="date" name="dateOfJoining" value={formData.dateOfJoining} onChange={handleChange} required
                          className={`w-full p-2.5 rounded-lg border text-sm focus:border-indigo-500 focus:outline-none ${isDark ? "bg-gray-800 border-gray-700 text-white" : "bg-slate-50 border-slate-200"}`} />
                      </div>
                    </div>
                  </div>
                )}
              </div>

            </div>

            <div className={`p-4 rounded-lg flex items-start gap-3 mt-4 border ${isDark ? "bg-gray-800/50 border-gray-700" : "bg-slate-50 border-slate-200"}`}>
              <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0" />
              <p className={`text-[10px] leading-relaxed ${isDark ? "text-gray-400" : "text-slate-500"}`}>
                Submitting this form will securely create a System User Account and an Employee Profile. Passwords are safely stored.
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
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <span className={`text-xs font-bold font-mono ${isDark ? "text-gray-400" : "text-slate-500"}`}>Company Filter:</span>
                <select
                  className={`border rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none focus:border-indigo-500 ${isDark ? "bg-gray-800 border-gray-700 text-gray-300" : "bg-slate-50 border-slate-200 text-slate-700"}`}
                  value={filterCompany}
                  onChange={e => setFilterCompany(e.target.value)}
                >
                  <option value="All">All Companies</option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-bold font-mono ${isDark ? "text-gray-400" : "text-slate-500"}`}>Role Filter:</span>
                <select
                  className={`border rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none focus:border-indigo-500 ${isDark ? "bg-gray-800 border-gray-700 text-gray-300" : "bg-slate-50 border-slate-200 text-slate-700"}`}
                  value={filterRole}
                  onChange={e => setFilterRole(e.target.value)}
                >
                  <option value="All">All Roles</option>
                  {uniqueRoleNames.map((r, i) => (
                    <option key={i} value={r as string}>{r as string}</option>
                  ))}
                </select>
              </div>
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
                        <React.Fragment key={emp.id}>
                          <tr
                            className={`cursor-pointer transition-colors ${isDark ? "hover:bg-gray-800/50" : "hover:bg-slate-50"} ${expandedRow === emp.id ? (isDark ? "bg-gray-800/30" : "bg-indigo-50/30") : ""}`}
                            onClick={() => toggleRow(emp.id)}
                          >
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                {emp.profilePhoto || emp.employeeProfile?.profilePhoto ? (
                                  <img
                                    src={emp.profilePhoto || emp.employeeProfile.profilePhoto}
                                    alt={emp.name}
                                    className="w-9 h-9 rounded-full object-cover border border-indigo-200 dark:border-gray-700 shadow-sm"
                                  />
                                ) : (
                                  <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-500 to-violet-600 text-white font-black text-xs flex items-center justify-center shadow-sm border border-indigo-400">
                                    {(emp.name || "E").split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)}
                                  </div>
                                )}
                                <div>
                                  <div className="font-bold text-slate-800 dark:text-slate-200">{emp.name}</div>
                                  <div className={`text-xs mt-0.5 flex items-center gap-1 ${isDark ? "text-gray-500" : "text-slate-500"}`}>
                                    <Mail className="w-3 h-3 text-slate-400" /> {emp.email}
                                  </div>
                                </div>
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
                                <div className={`text-xs font-mono mt-1 flex flex-col gap-0.5 ${isDark ? "text-emerald-400" : "text-emerald-600"}`}>
                                  <div className="flex items-center gap-1">
                                    <UserCheck className="w-3 h-3" /> {emp.employeeProfile.employeeId} - {emp.employeeProfile.designation}
                                  </div>
                                  {emp.employeeProfile.department && (
                                    <div className="text-[10px] text-slate-450 dark:text-gray-400 italic">
                                      Dept: {typeof emp.employeeProfile.department === "object" ? emp.employeeProfile.department.name : emp.employeeProfile.department}
                                    </div>
                                  )}
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              {emp.isOnProbation ? (
                                <span className="px-2.5 py-1 text-[10px] font-black tracking-wider uppercase font-mono rounded bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
                                  Probation
                                </span>
                              ) : emp.status === "on notice" ? (
                                <span className="px-2.5 py-1 text-[10px] font-black tracking-wider uppercase font-mono rounded bg-orange-100 text-orange-800 dark:bg-orange-950/50 dark:text-orange-300">
                                  On Notice
                                </span>
                              ) : (
                                <span className={`px-2.5 py-1 text-[10px] font-black tracking-wider uppercase font-mono rounded ${emp.status === "active" ? "badge-active" : "badge-inactive"}`}>
                                  {emp.status}
                                </span>
                              )}
                            </td>
                            {isManagement && (
                              <td className="px-6 py-4 text-right flex justify-end gap-2">
                                <button
                                  className="text-indigo-500 hover:text-white hover:bg-indigo-600 p-1.5 rounded transition-all"
                                  onClick={(e) => { e.stopPropagation(); handleStartEditEmployee(emp); }}
                                  title="Edit Staff Member"
                                >
                                  <Edit3 className="w-4 h-4" />
                                </button>
                                <button
                                  className="text-rose-500 hover:text-white hover:bg-rose-600 p-1.5 rounded transition-all"
                                  onClick={(e) => { e.stopPropagation(); handleDelete(emp.id, emp.name); }}
                                  title="Terminate Staff Member"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            )}
                          </tr>
                          {expandedRow === emp.id && (
                            <tr className={`border-b ${isDark ? "border-gray-800" : "border-slate-100"}`}>
                              <td colSpan={isManagement ? 5 : 4} className="p-0">
                                <div className={`p-6 m-4 rounded-xl border shadow-inner ${isDark ? "bg-gray-900/50 border-gray-800" : "bg-white border-slate-200"}`}>
                                  <div className="flex items-center gap-2 mb-4 pb-2 border-b border-dashed border-slate-300 dark:border-gray-700">
                                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                                    <h4 className="font-bold text-xs uppercase tracking-wider">Complete Employee Profile</h4>
                                  </div>

                                  <div className="flex flex-col lg:flex-row gap-6">
                                    {/* Left Profile Card */}
                                    <div className="flex flex-col items-center justify-center p-4 border rounded-xl bg-slate-50/50 dark:bg-gray-800/30 w-full lg:w-48 text-center shrink-0">
                                      {emp.profilePhoto || emp.employeeProfile?.profilePhoto ? (
                                        <img
                                          src={emp.profilePhoto || emp.employeeProfile.profilePhoto}
                                          alt={emp.name}
                                          className="w-20 h-20 rounded-full object-cover border-4 border-white dark:border-gray-800 shadow-md mb-3"
                                        />
                                      ) : (
                                        <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-indigo-500 to-violet-600 text-white font-black text-2xl flex items-center justify-center shadow-md border-4 border-white dark:border-gray-800 mb-3">
                                          {(emp.name || "E").split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)}
                                        </div>
                                      )}
                                      <h5 className="font-bold text-slate-800 dark:text-slate-100 text-sm line-clamp-1">{emp.name}</h5>
                                      <p className="text-[10px] text-slate-450 dark:text-gray-400 mt-1 font-mono uppercase tracking-wider">{emp.employeeProfile?.employeeId || "No ID"}</p>
                                    </div>

                                    {/* Right Grid Details */}
                                    <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-6">
                                      {/* Column 1 */}
                                      <div className="space-y-3">
                                        <div>
                                          <div className="text-[10px] font-bold uppercase text-slate-400 dark:text-gray-500 mb-0.5">Contact Number</div>
                                          <div className="text-sm font-semibold">{emp.mobile || <span className="italic text-slate-300">Not provided</span>}</div>
                                        </div>
                                        <div>
                                          <div className="text-[10px] font-bold uppercase text-slate-400 dark:text-gray-500 mb-0.5">Base Salary</div>
                                          <div className="text-sm font-mono text-indigo-600 dark:text-indigo-400 font-bold">
                                            ₹{emp.employeeProfile?.baseSalary ? emp.employeeProfile.baseSalary.toLocaleString('en-IN') : "0"} / mo
                                          </div>
                                        </div>
                                      </div>

                                      {/* Column 2 */}
                                      <div className="space-y-3">
                                        <div>
                                          <div className="text-[10px] font-bold uppercase text-slate-400 dark:text-gray-500 mb-0.5">Date of Joining</div>
                                          <div className="text-sm font-semibold">{emp.employeeProfile?.dateOfJoining ? new Date(emp.employeeProfile.dateOfJoining).toLocaleDateString() : "N/A"}</div>
                                        </div>
                                        <div>
                                          <div className="text-[10px] font-bold uppercase text-slate-400 dark:text-gray-500 mb-0.5">System Access</div>
                                          <div className="text-xs font-mono">{emp.role} Access Level</div>
                                        </div>
                                        <div>
                                          <div className="text-[10px] font-bold uppercase text-slate-400 dark:text-gray-500 mb-0.5">Required Work Duration</div>
                                          <div className="text-xs font-semibold">{emp.dailyWorkingHours || emp.employeeProfile?.dailyWorkingHours || 8} Hours / Day</div>
                                        </div>
                                        <div>
                                          <div className="text-[10px] font-bold uppercase text-slate-400 dark:text-gray-500 mb-0.5">Working Days</div>
                                          <div className="flex gap-1 mt-1">
                                            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => {
                                              const wDays = emp.workingDays || emp.employeeProfile?.workingDays || "Mon,Tue,Wed,Thu,Fri,Sat";
                                              const isWorking = wDays.split(",").includes(day);
                                              return (
                                                <span
                                                  key={day}
                                                  className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase border ${
                                                    isWorking
                                                      ? "bg-blue-600 border-blue-600 text-white"
                                                      : "bg-white dark:bg-gray-800 border-slate-200 dark:border-gray-700 text-slate-400"
                                                  }`}
                                                >
                                                  {day.slice(0, 1)}
                                                </span>
                                              );
                                            })}
                                          </div>
                                        </div>
                                      </div>

                                      {/* Column 3 */}
                                      <div className="space-y-3">
                                        <div>
                                          <div className="text-[10px] font-bold uppercase text-slate-400 dark:text-gray-500 mb-0.5">Leave Balances</div>
                                          <div className="text-xs grid grid-cols-2 gap-2 mt-1">
                                            <div className="flex justify-between border-b border-dashed border-slate-200 dark:border-gray-700 pb-1">
                                              <span className="text-slate-500">Casual:</span>
                                              <span className="font-bold">{emp.employeeProfile?.leaveBalances?.casualLeave || 0}</span>
                                            </div>
                                            <div className="flex justify-between border-b border-dashed border-slate-200 dark:border-gray-700 pb-1">
                                              <span className="text-slate-500">Sick:</span>
                                              <span className="font-bold">{emp.employeeProfile?.leaveBalances?.sickLeave || 0}</span>
                                            </div>
                                          </div>
                                        </div>
                                        {/* Display reporting manager if present */}
                                        {(emp.reportingManager || emp.employeeProfile?.reportingManager) && (
                                          <div>
                                            <div className="text-[10px] font-bold uppercase text-slate-400 dark:text-gray-500 mb-0.5">Reporting Manager</div>
                                            <div className="text-xs font-bold text-slate-700 dark:text-gray-300">
                                              {emp.reportingManager || emp.employeeProfile.reportingManager}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
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

      {/* EDIT EMPLOYEE MODAL */}
      {showEditModal && (
        <div className="fixed inset-0 bg-[#070810]/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto">
          <div className={`border w-full max-w-2xl rounded-2xl p-6 relative shadow-2xl animate-fade-in ${isDark ? "bg-gray-900 border-gray-800 text-white" : "bg-white border-slate-200 text-slate-800"}`}>
            <button
              onClick={() => setShowEditModal(false)}
              className={`absolute top-4 right-4 p-1.5 rounded-lg border transition-all ${isDark ? "bg-gray-800 border-gray-700 text-gray-400 hover:text-white" : "bg-slate-50 border-slate-200 text-slate-500 hover:text-slate-700"}`}
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-6 border-b pb-3 border-slate-200 dark:border-gray-800">
              <Edit3 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <h3 className="text-base font-bold uppercase tracking-wider font-mono">Edit Employee Details</h3>
            </div>

            <form onSubmit={handleEditEmployeeSubmit} className="flex flex-col h-full max-h-[85vh] text-left">
              {/* Scrollable inputs */}
              <div className="flex-1 overflow-y-auto pr-2 space-y-6 max-h-[55vh]">
                {/* Photo Upload Area in Edit Form */}
                <div className="flex flex-col sm:flex-row gap-4 items-center sm:items-start p-4 rounded-xl border border-indigo-50/50 dark:border-gray-800 bg-slate-50/30 dark:bg-gray-800/10">
                  <div className="flex flex-col items-center justify-center p-2 border-2 border-dashed rounded-xl w-24 h-24 text-center cursor-pointer relative group transition-all hover:border-indigo-500 hover:bg-indigo-50/5 dark:hover:bg-indigo-950/10">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleEditPhotoUpload}
                      className="absolute inset-0 opacity-0 cursor-pointer z-10"
                      disabled={uploadingEditPhoto}
                    />
                    {uploadingEditPhoto ? (
                      <div className="text-[9px] font-semibold text-slate-400 animate-pulse">Uploading...</div>
                    ) : editForm.profilePhoto ? (
                      <div className="w-full h-full relative">
                        <img
                          src={editForm.profilePhoto}
                          alt="Preview"
                          className="w-full h-full object-cover rounded-lg"
                        />
                        <div className="absolute inset-0 bg-black/40 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <span className="text-white text-[9px] font-bold">Change</span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center">
                        <UserPlus className="w-4 h-4 text-indigo-500 mb-1" />
                        <span className="text-[9px] font-bold text-slate-700 dark:text-gray-300">Upload Photo</span>
                      </div>
                    )}
                  </div>
                  <div className="text-center sm:text-left">
                    <h4 className="font-bold text-xs text-slate-805 dark:text-slate-200">Profile Photograph</h4>
                    <p className="text-[9px] text-slate-450 dark:text-gray-400 mt-1 max-w-[320px] leading-relaxed">
                      Upload employee photograph. JPEG or PNG formats supported.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Company (disabled) */}
                  <div>
                    <label className="block text-xs font-bold mb-1.5 text-slate-700 dark:text-gray-300">Company</label>
                    <select
                      disabled
                      value={editForm.companyId || (employees.find(emp => emp.id === editForm.employeeId)?.employeeProfile?.companyId || "")}
                      className="w-full p-2.5 rounded-lg border text-sm focus:outline-none opacity-60 cursor-not-allowed bg-slate-200 border-slate-200 text-slate-655 dark:bg-gray-850 dark:border-gray-700 dark:text-gray-400 font-semibold"
                    >
                      <option value="">-- Assigned Company --</option>
                      {companies.map(c => (
                        <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                      ))}
                    </select>
                  </div>

                  {/* Employee ID (read-only) */}
                  <div>
                    <label className="block text-xs font-bold mb-1.5 text-slate-700 dark:text-gray-300">Employee ID</label>
                    <input
                      type="text"
                      readOnly
                      value={editForm.employeeId}
                      className="w-full p-2.5 rounded-lg border text-sm focus:outline-none opacity-80 cursor-not-allowed bg-slate-100 border-slate-200 text-slate-500 dark:bg-gray-800/80 dark:border-gray-700 dark:text-gray-400"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Full Name */}
                  <div>
                    <label className="block text-xs font-bold mb-1.5 text-slate-700 dark:text-gray-300">Full Name *</label>
                    <input
                      type="text"
                      required
                      value={editForm.name}
                      onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                      className={`w-full p-2.5 rounded-lg border text-sm focus:border-indigo-500 focus:outline-none ${isDark ? "bg-gray-800 border-gray-700 text-white" : "bg-slate-50 border-slate-200"}`}
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-xs font-bold mb-1.5 text-slate-700 dark:text-gray-300">Email Address *</label>
                    <input
                      type="email"
                      required
                      value={editForm.email}
                      onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                      className={`w-full p-2.5 rounded-lg border text-sm focus:border-indigo-500 focus:outline-none ${isDark ? "bg-gray-800 border-gray-700 text-white" : "bg-slate-50 border-slate-200"}`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Mobile */}
                  <div>
                    <label className="block text-xs font-bold mb-1.5 text-slate-700 dark:text-gray-300">Mobile Number *</label>
                    <input
                      type="text"
                      required
                      value={editForm.mobile}
                      onChange={(e) => setEditForm(prev => ({ ...prev, mobile: e.target.value }))}
                      className={`w-full p-2.5 rounded-lg border text-sm focus:border-indigo-500 focus:outline-none ${isDark ? "bg-gray-800 border-gray-700 text-white" : "bg-slate-50 border-slate-200"}`}
                    />
                  </div>

                  {/* Base Salary */}
                  <div>
                    <label className="block text-xs font-bold mb-1.5 text-slate-700 dark:text-gray-300">Base Salary (Monthly) *</label>
                    <input
                      type="number"
                      required
                      value={editForm.baseSalary}
                      onChange={(e) => setEditForm(prev => ({ ...prev, baseSalary: e.target.value }))}
                      className={`w-full p-2.5 rounded-lg border text-sm focus:border-indigo-500 focus:outline-none ${isDark ? "bg-gray-800 border-gray-700 text-white" : "bg-slate-50 border-slate-200"}`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Department */}
                  <div>
                    <label className="block text-xs font-bold mb-1.5 text-slate-700 dark:text-gray-300">Department *</label>
                    <select
                      value={editForm.department}
                      onChange={(e) => {
                        const newDept = e.target.value;
                        if (newDept === "add_custom_department") {
                          setShowEditCustomDeptInput(true);
                          return;
                        }
                        setShowEditCustomDeptInput(false);
                        const currentList = dbRoles.length > 0
                          ? Array.from(new Set(dbRoles.filter((r: any) => (r.department || "").toLowerCase() === newDept.toLowerCase()).map((r: any) => r.name)))
                          : (departmentRoles[newDept] || ["Employee"]);
                        const defaultRole = currentList[0] || "Employee";
                        setEditForm(prev => ({
                          ...prev,
                          department: newDept,
                          role: defaultRole,
                          designation: defaultRole
                        }));
                      }}
                      required
                      className={`w-full p-2.5 rounded-lg border text-sm focus:border-indigo-500 focus:outline-none ${isDark ? "bg-gray-800 border-gray-700 text-white" : "bg-slate-50 border-slate-200 font-semibold"}`}
                    >
                      <option value="">-- Choose Department --</option>
                      {availableDepartments.map(dept => (
                        <option key={dept} value={dept}>{dept}</option>
                      ))}
                      <option value="add_custom_department">+ Add Custom Department...</option>
                    </select>
                    {showEditCustomDeptInput && (
                      <div className="mt-2 flex gap-2">
                        <input
                          type="text"
                          value={editCustomDeptName}
                          onChange={e => setEditCustomDeptName(e.target.value)}
                          placeholder="New Dept Name"
                          className={`flex-1 p-2 rounded border text-xs focus:outline-none focus:border-indigo-500 ${isDark ? "bg-gray-800 border-gray-700 text-white" : "bg-slate-50 border-slate-200 text-slate-700"}`}
                        />
                        <button
                          type="button"
                          onClick={handleEditAddCustomDept}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-3 py-1.5 rounded font-bold transition-all shadow-sm"
                        >
                          Add
                        </button>
                        <button
                          type="button"
                          onClick={() => { setShowEditCustomDeptInput(false); setEditCustomDeptName(""); }}
                          className={`text-xs px-3 py-1.5 rounded font-bold border transition-all ${isDark ? "bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"}`}
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>

                  {/* System Role */}
                  <div>
                    <label className="block text-xs font-bold mb-1.5 text-slate-700 dark:text-gray-300">System Role *</label>
                    <select
                      value={editForm.role}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === "add_custom_role") {
                          setShowEditCustomRoleInput(true);
                        } else {
                          setShowEditCustomRoleInput(false);
                          setEditForm(prev => ({ ...prev, role: val, designation: val }));
                        }
                      }}
                      required
                      className={`w-full p-2.5 rounded-lg border text-sm focus:border-indigo-500 focus:outline-none ${isDark ? "bg-gray-800 border-gray-700 text-white" : "bg-slate-50 border-slate-200 font-semibold"}`}
                    >
                      {editRolesList.map((r: any, idx: number) => (
                        <option key={idx} value={r}>{r}</option>
                      ))}
                      <option value="add_custom_role">+ Add Custom Role...</option>
                    </select>
                    {showEditCustomRoleInput && (
                      <div className="mt-2 flex gap-2">
                        <input
                          type="text"
                          value={editCustomRoleName}
                          onChange={e => setEditCustomRoleName(e.target.value)}
                          placeholder="New Role Name"
                          className={`flex-1 p-2 rounded border text-xs focus:outline-none focus:border-indigo-500 ${isDark ? "bg-gray-800 border-gray-700 text-white" : "bg-slate-50 border-slate-200 text-slate-700"}`}
                        />
                        <button
                          type="button"
                          onClick={handleEditAddCustomRole}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-3 py-1.5 rounded font-bold transition-all shadow-sm"
                        >
                          Add
                        </button>
                        <button
                          type="button"
                          onClick={() => { setShowEditCustomRoleInput(false); setEditCustomRoleName(""); }}
                          className={`text-xs px-3 py-1.5 rounded font-bold border transition-all ${isDark ? "bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"}`}
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Job Title / Designation */}
                  <div>
                    <label className="block text-xs font-bold mb-1.5 text-emerald-650 dark:text-emerald-400">
                      Job Title
                      <span className={`ml-1.5 text-[9px] font-normal px-1.5 py-0.5 rounded ${isDark ? "bg-emerald-900/40 text-emerald-400" : "bg-emerald-50 text-emerald-600"}`}>Auto-filled</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={editForm.designation}
                      onChange={(e) => setEditForm(prev => ({ ...prev, designation: e.target.value }))}
                      placeholder="Job title"
                      className={`w-full p-2.5 rounded-lg border text-sm font-bold focus:border-emerald-500 focus:outline-none transition-all ${isDark ? "bg-gray-800 border-gray-700 text-white" : "bg-white border-slate-350 hover:border-emerald-400"}`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Department Reporting Manager */}
                  <div>
                    <label className="block text-xs font-bold mb-1.5 text-slate-700 dark:text-gray-300">Department Reporting Manager</label>
                    <select
                      value={editForm.reportingManager || ""}
                      onChange={(e) => setEditForm(prev => ({ ...prev, reportingManager: e.target.value }))}
                      className={`w-full p-2.5 rounded-lg border text-sm focus:border-indigo-500 focus:outline-none ${isDark ? "bg-gray-800 border-gray-700 text-white" : "bg-slate-50 border-slate-200"}`}
                    >
                      <option value="">— No direct dept. manager —</option>
                      {editDeptEmployees.map((emp: any) => (
                        <option key={emp.id} value={emp.name}>{emp.name} ({emp.role})</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Date of Joining */}
                  <div>
                    <label className="block text-xs font-bold mb-1.5 text-slate-700 dark:text-gray-300">Date of Joining *</label>
                    <input
                      type="date"
                      required
                      value={editForm.dateOfJoining}
                      onChange={(e) => setEditForm(prev => ({ ...prev, dateOfJoining: e.target.value }))}
                      className={`w-full p-2.5 rounded-lg border text-sm focus:border-indigo-500 focus:outline-none ${isDark ? "bg-gray-800 border-gray-700 text-white" : "bg-slate-50 border-slate-200"}`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Daily Working Hours */}
                  <div>
                    <label className="block text-xs font-bold mb-1.5 text-slate-700 dark:text-gray-300">Daily Working Hours *</label>
                    <input
                      type="number"
                      required
                      min="1"
                      max="24"
                      value={editForm.dailyWorkingHours}
                      onChange={(e) => setEditForm(prev => ({ ...prev, dailyWorkingHours: e.target.value }))}
                      className={`w-full p-2.5 rounded-lg border text-sm focus:border-indigo-500 focus:outline-none ${isDark ? "bg-gray-800 border-gray-700 text-white" : "bg-slate-50 border-slate-200"}`}
                    />
                  </div>

                  {/* Working Days */}
                  <div>
                    <label className="block text-xs font-bold mb-1.5 text-slate-700 dark:text-gray-300">Working Days *</label>
                    <div className="flex gap-1.5 pt-1.5">
                      {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => {
                        const isWorking = editForm.workingDays ? editForm.workingDays.split(",").includes(day) : day !== "Sun";
                        return (
                          <button
                            type="button"
                            key={day}
                            onClick={() => {
                              const currentDays = editForm.workingDays ? editForm.workingDays.split(",").filter(Boolean) : ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
                              let newDays = [];
                              if (currentDays.includes(day)) {
                                newDays = currentDays.filter(d => d !== day);
                              } else {
                                newDays = [...currentDays, day];
                              }
                              setEditForm(prev => ({ ...prev, workingDays: newDays.join(",") }));
                            }}
                            className={`w-8 h-8 rounded-lg text-[10px] font-black uppercase transition-all shadow-sm border ${
                              isWorking
                                ? "bg-blue-600 border-blue-600 text-white hover:bg-blue-700"
                                : "bg-white dark:bg-gray-850 border-slate-250 dark:border-gray-750 text-slate-500 dark:text-gray-450 hover:bg-slate-50"
                            }`}
                          >
                            {day.slice(0, 1)}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons Footer */}
              <div className="flex gap-4 pt-4 mt-6 border-t border-slate-200 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all border ${isDark ? "bg-gray-800 border-gray-700 text-white hover:bg-gray-700" : "bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-250"}`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl text-xs font-bold transition-all shadow-md disabled:opacity-50"
                >
                  {updating ? "Updating..." : "Update Details"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
