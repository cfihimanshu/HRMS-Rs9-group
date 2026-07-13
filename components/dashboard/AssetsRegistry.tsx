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

  // Dynamic Emails, SIM, and Custom Fields states for Assign Asset form
  const [emailsList, setEmailsList] = useState<string[]>([""]);
  const [simSlots, setSimSlots] = useState("None");
  const [sim1No, setSim1No] = useState("");
  const [sim2No, setSim2No] = useState("");
  const [sim1Whatsapp, setSim1Whatsapp] = useState("No");
  const [sim1WhatsappType, setSim1WhatsappType] = useState("Personal");
  const [sim2Whatsapp, setSim2Whatsapp] = useState("No");
  const [sim2WhatsappType, setSim2WhatsappType] = useState("Personal");
  const [assetFields, setAssetFields] = useState<Record<string, string>>({});

  // Clear states when assetType changes or modal opens
  useEffect(() => {
    setEmailsList([""]);
    setSimSlots("None");
    setSim1No("");
    setSim2No("");
    setSim1Whatsapp("No");
    setSim1WhatsappType("Personal");
    setSim2Whatsapp("No");
    setSim2WhatsappType("Personal");
    setAssetFields({});
  }, [assignForm.assetType, showAssignModal]);

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

      const typeClean = assignForm.assetType.toLowerCase().trim();
      let finalDetail = assignForm.assetValue; // fallback
      let finalSerial = "";

      if (typeClean === "sim card" || typeClean === "sim") {
        const operator = assetFields.simOperator || "Jio";
        const network = assetFields.simNetwork || "5G";
        const mobile = assetFields.simMobile || "";
        if (!mobile) {
          triggerToast("SIM Mobile Number is required");
          return;
        }
        finalDetail = `${operator} - ${network} Network`;
        finalSerial = mobile;
      } else if (typeClean === "laptop") {
        const model = assetFields.laptopModel || "";
        const specs = assetFields.laptopSpecs || "";
        const serial = assetFields.laptopSerial || "";
        if (!model || !specs) {
          triggerToast("Laptop Brand & Model and Specifications are required");
          return;
        }
        finalDetail = `${model} (${specs})`;
        finalSerial = serial;
      } else if (typeClean === "mobile phone") {
        const model = assetFields.phoneModel || "";
        const imei1 = assetFields.phoneImei1 || "";
        const imei2 = assetFields.phoneImei2 || "";
        const specs = assetFields.phoneSpecs || "";
        if (!model || !imei1) {
          triggerToast("Phone Brand & Model and IMEI Number 1 are required");
          return;
        }
        finalDetail = `${model}${specs ? ` (${specs})` : ""}`;
        finalSerial = imei2 ? `IMEI 1: ${imei1}, IMEI 2: ${imei2}` : imei1;
      } else if (typeClean === "headset / accessories") {
        const name = assetFields.accName || "";
        const type = assetFields.accType || "Wired";
        const serial = assetFields.accSerial || "";
        if (!name) {
          triggerToast("Accessory Name/Brand is required");
          return;
        }
        finalDetail = `${name} (${type})`;
        finalSerial = serial;
      } else if (typeClean === "id card / lanyard") {
        const emp = assetFields.idEmployee || "";
        const barcode = assetFields.idBarcode || "";
        if (!emp || !barcode) {
          triggerToast("Employee Name/ID and Card ID Number are required");
          return;
        }
        finalDetail = `ID Card for: ${emp}`;
        finalSerial = barcode;
      } else if (typeClean === "office chair / table") {
        const desc = assetFields.furnitureDesc || "";
        const tag = assetFields.furnitureTag || "";
        if (!desc) {
          triggerToast("Furniture Description is required");
          return;
        }
        finalDetail = desc;
        finalSerial = tag;
      } else if (typeClean === "router / networking") {
        const model = assetFields.routerModel || "";
        const mac = assetFields.routerMac || "";
        if (!model || !mac) {
          triggerToast("Router Brand & Model and MAC Address are required");
          return;
        }
        finalDetail = model;
        finalSerial = `MAC: ${mac}`;
      } else if (typeClean === "printer / scanner") {
        const model = assetFields.printerModel || "";
        const type = assetFields.printerType || "Laser Printer";
        const serial = assetFields.printerSerial || "";
        if (!model || !serial) {
          triggerToast("Printer Brand & Model and Serial Number are required");
          return;
        }
        finalDetail = `${model} (${type})`;
        finalSerial = serial;
      }

      // Validation for Mobile Phone SIM slots
      if (typeClean === "mobile phone" && simSlots !== "None" && !sim1No) {
        triggerToast("SIM 1 Phone Number is required");
        return;
      }

      const filteredEmails = emailsList.map(e => e.trim()).filter(Boolean);
      const emailsStr = filteredEmails.length > 0 ? ` | Logged-in Emails: ${filteredEmails.join(", ")}` : "";

      let displayValue = finalSerial ? `[S/N: ${finalSerial}] ${finalDetail}` : finalDetail;
      const formattedDetails = `${displayValue}${emailsStr} (Assigned: ${assignForm.date} | By: ${assignForm.assignedBy})`;

      if (typeClean === "sim card" || typeClean === "sim") {
        payload.allocatedSim = formattedDetails;
      } else {
        payload.allocatedAsset = `${assignForm.assetType}: ${formattedDetails}`;
        if (typeClean === "mobile phone" && simSlots !== "None") {
          let simDetails = `SIM Slots Used: ${simSlots}`;
          if (sim1No) {
            const wa1Type = sim1Whatsapp === "Yes" ? ` (${sim1WhatsappType})` : "";
            simDetails += `, SIM 1: ${sim1No} [WhatsApp: ${sim1Whatsapp}${wa1Type}]`;
          }
          if (sim2No) {
            const wa2Type = sim2Whatsapp === "Yes" ? ` (${sim2WhatsappType})` : "";
            simDetails += `, SIM 2: ${sim2No} [WhatsApp: ${sim2Whatsapp}${wa2Type}]`;
          }
          payload.allocatedSim = `${simDetails} (Assigned with Mobile Phone | Assigned: ${assignForm.date} | By: ${assignForm.assignedBy})`;
        } else if (typeClean === "mobile phone") {
          payload.allocatedSim = "";
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
        } else {
          // AUTO-REGISTER MANUAL ASSET INTO INVENTORY MANAGEMENT WITH "In Use" STATUS
          try {
            let notesText = "";
            if (filteredEmails.length > 0) {
              notesText += `Logged-in Emails: ${filteredEmails.join(", ")}\n`;
            }
            if (typeClean === "mobile phone" && simSlots !== "None") {
              notesText += `SIM Slots Used: ${simSlots}\n`;
              if (sim1No) {
                const wa1Type = sim1Whatsapp === "Yes" ? ` (${sim1WhatsappType})` : "";
                notesText += `SIM 1 Mobile No: ${sim1No} [WhatsApp: ${sim1Whatsapp}${wa1Type}]\n`;
              }
              if (sim2No) {
                const wa2Type = sim2Whatsapp === "Yes" ? ` (${sim2WhatsappType})` : "";
                notesText += `SIM 2 Mobile No: ${sim2No} [WhatsApp: ${sim2Whatsapp}${wa2Type}]\n`;
              }
            } else if (typeClean === "sim card" || typeClean === "sim") {
              const iccid = assetFields.simIccid || "";
              if (iccid) {
                notesText += `SIM Number (ICCID): ${iccid}\n`;
              }
            }

            // 1. Create asset in inventory (returns default status "Available" first due to backend route code)
            const createInvRes = await fetch("/api/assets/inventory", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                assetType: assignForm.assetType,
                assetDetail: finalDetail,
                serialNumber: finalSerial,
                purchaseDate: assignForm.date,
                purchaseValue: "0",
                condition: "Good",
                companyId: assignForm.companyId || null,
                notes: notesText
              })
            });
            const createInvResult = await createInvRes.json();
            
            // 2. Mark it as "In Use" (assigned) in the inventory list
            if (createInvResult.success && createInvResult.data?.id) {
              await fetch("/api/assets/inventory", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  id: Number(createInvResult.data.id),
                  status: "In Use"
                })
              });
            }
          } catch (invCreateErr) {
            console.error("Failed to auto-register manual asset into inventory:", invCreateErr);
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
            className="bg-white rounded-2xl shadow-2xl p-6 w-[680px] max-w-[95vw] border border-[#E8E4DF] flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
             <div className="flex justify-between items-center border-b border-[#E8E4DF] pb-3 mb-4 flex-shrink-0">
              <h3 className="text-lg font-serif font-light text-[#1C1C1A]" style={{ fontFamily: "'Playfair Display', serif" }}>
                Assign New Asset
              </h3>
              <button onClick={() => setShowAssignModal(false)} className="text-[#9C9890] hover:text-[#1C1C1A] transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAssignSubmit} className="space-y-4 text-left overflow-y-auto max-h-[75vh] pr-2 scrollbar-thin">
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

                {/* Available Stock Selector */}
                {assignForm.companyId && (
                  <div className="bg-[#FCFBF9] border border-[#E8E4DF] p-3 rounded-lg space-y-2 mt-3">
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
                              assetValue: selectedInv ? `[S/N: ${selectedInv.serialNumber || 'N/A'}] ${selectedInv.assetDetail || ''}` : ""
                            }));

                            if (selectedInv) {
                              const typeClean = (selectedInv.assetType || "").toLowerCase().trim();
                              
                              // 1. Logged-in Emails
                              const emailMatch = selectedInv.notes?.match(/Logged-in Emails:\s*([^\n]+)/);
                              if (emailMatch) {
                                setEmailsList(emailMatch[1].split(",").map((em: any) => em.trim()).filter(Boolean));
                              } else {
                                setEmailsList([""]);
                              }

                              // 2. SIM Slots Used & SIM Mobile Nos
                              const slotsMatch = selectedInv.notes?.match(/SIM Slots Used:\s*([^\n]+)/);
                              if (slotsMatch) {
                                setSimSlots(slotsMatch[1].trim());
                              } else {
                                setSimSlots("None");
                              }

                              const sim1Match = selectedInv.notes?.match(/SIM 1 Mobile No:\s*([^\n]+)/);
                              if (sim1Match) setSim1No(sim1Match[1].trim());
                              else setSim1No("");

                              const sim2Match = selectedInv.notes?.match(/SIM 2 Mobile No:\s*([^\n]+)/);
                              if (sim2Match) setSim2No(sim2Match[1].trim());
                              else setSim2No("");

                              // 3. Custom Fields based on Asset Type
                              if (typeClean === "sim card" || typeClean === "sim") {
                                let operator = "Jio";
                                let network = "5G";
                                const simMatch = selectedInv.assetDetail?.match(/([^-]+)-\s*(.+)\s+Network/);
                                if (simMatch) {
                                  operator = simMatch[1].trim();
                                  network = simMatch[2].trim();
                                }
                                setAssetFields({
                                  simMobile: selectedInv.assetValue || "",
                                  simIccid: selectedInv.serialNumber || "",
                                  simOperator: operator,
                                  simNetwork: network
                                });
                              } else if (typeClean === "laptop") {
                                let model = selectedInv.assetDetail || "";
                                let specs = "";
                                const lpMatch = selectedInv.assetDetail?.match(/^([^(]+)\s*\(([^)]+)\)$/);
                                if (lpMatch) {
                                  model = lpMatch[1].trim();
                                  specs = lpMatch[2].trim();
                                }
                                setAssetFields({
                                  laptopModel: model,
                                  laptopSpecs: specs,
                                  laptopSerial: selectedInv.serialNumber || ""
                                });
                              } else if (typeClean === "mobile phone") {
                                let model = selectedInv.assetDetail || "";
                                let specs = "";
                                const mbMatch = selectedInv.assetDetail?.match(/^([^(]+)\s*\(([^)]+)\)$/);
                                if (mbMatch) {
                                  model = mbMatch[1].trim();
                                  specs = mbMatch[2].trim();
                                }
                                let imei1 = selectedInv.serialNumber || "";
                                let imei2 = "";
                                if (selectedInv.serialNumber?.includes("IMEI")) {
                                  const im1 = selectedInv.serialNumber.match(/IMEI 1:\s*([^,]+)/);
                                  const im2 = selectedInv.serialNumber.match(/IMEI 2:\s*([^\n]+)/);
                                  if (im1) imei1 = im1[1].trim();
                                  if (im2) imei2 = im2[1].trim();
                                }
                                setAssetFields({
                                  phoneModel: model,
                                  phoneSpecs: specs,
                                  phoneImei1: imei1,
                                  phoneImei2: imei2
                                });
                              } else if (typeClean === "headset / accessories") {
                                let name = selectedInv.assetDetail || "";
                                let type = "Wired";
                                const matchType = selectedInv.assetDetail?.match(/\(([^)]+)\)$/);
                                if (matchType) {
                                  type = matchType[1];
                                  name = name.replace(/\([^)]+\)$/, "").trim();
                                }
                                setAssetFields({
                                  accName: name,
                                  accType: type,
                                  accSerial: selectedInv.serialNumber || ""
                                });
                              } else if (typeClean === "id card / lanyard") {
                                const emp = selectedInv.assetDetail?.replace(/^ID Card for:\s*/, "") || "";
                                setAssetFields({
                                  idEmployee: emp,
                                  idBarcode: selectedInv.serialNumber || ""
                                });
                              } else if (typeClean === "office chair / table") {
                                setAssetFields({
                                  furnitureDesc: selectedInv.assetDetail || "",
                                  furnitureTag: selectedInv.serialNumber || ""
                                });
                              } else if (typeClean === "router / networking") {
                                setAssetFields({
                                  routerModel: selectedInv.assetDetail || "",
                                  routerMac: selectedInv.serialNumber?.replace(/^MAC:\s*/, "") || "",
                                  routerSerial: ""
                                });
                              } else if (typeClean === "printer / scanner") {
                                let model = selectedInv.assetDetail || "";
                                let ptype = "Laser Printer";
                                const matchType = selectedInv.assetDetail?.match(/\(([^)]+)\)$/);
                                if (matchType) {
                                  ptype = matchType[1];
                                  model = model.replace(/\([^)]+\)$/, "").trim();
                                }
                                setAssetFields({
                                  printerModel: model,
                                  printerType: ptype,
                                  printerSerial: selectedInv.serialNumber || ""
                                });
                              }
                            } else {
                              setEmailsList([""]);
                              setSimSlots("None");
                              setSim1No("");
                              setSim2No("");
                              setSim1Whatsapp("No");
                              setSim1WhatsappType("Personal");
                              setSim2Whatsapp("No");
                              setSim2WhatsappType("Personal");
                              setAssetFields({});
                            }
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

                {/* Dynamic Asset-Type Specific Fields */}
                {(() => {
                  const tc = assignForm.assetType.toLowerCase().trim();
                  if (tc === "sim card" || tc === "sim") return (
                    <div className="mt-3 grid grid-cols-1 gap-3 bg-[#FCFBF9] border border-[#E8E4DF] p-3 rounded-lg animate-fade-in">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">SIM Mobile Number *</label>
                          <input type="text" required placeholder="e.g. 9876543210" value={assetFields.simMobile || ""} onChange={(e) => setAssetFields(p => ({ ...p, simMobile: e.target.value }))} className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-semibold" />
                        </div>
                        <div>
                          <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">SIM Number / ICCID</label>
                          <input type="text" placeholder="e.g. 89910000..." value={assetFields.simIccid || ""} onChange={(e) => setAssetFields(p => ({ ...p, simIccid: e.target.value }))} className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-mono" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Operator</label>
                          <select value={assetFields.simOperator || "Jio"} onChange={(e) => setAssetFields(p => ({ ...p, simOperator: e.target.value }))} className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-semibold">
                            <option value="Jio">Jio</option><option value="Airtel">Airtel</option><option value="Vodafone Idea (Vi)">Vodafone Idea (Vi)</option><option value="BSNL">BSNL</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Network Type</label>
                          <select value={assetFields.simNetwork || "5G"} onChange={(e) => setAssetFields(p => ({ ...p, simNetwork: e.target.value }))} className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-semibold">
                            <option value="5G">5G</option><option value="4G">4G</option><option value="3G">3G</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  );
                  if (tc === "laptop") return (
                    <div className="mt-3 space-y-3 bg-[#FCFBF9] border border-[#E8E4DF] p-3 rounded-lg animate-fade-in">
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Laptop Brand & Model *</label>
                          <input type="text" required placeholder="e.g. HP EliteBook 840 G8" value={assetFields.laptopModel || ""} onChange={(e) => setAssetFields(p => ({ ...p, laptopModel: e.target.value }))} className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-semibold" />
                        </div>
                        <div>
                          <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Processor / RAM / Storage *</label>
                          <input type="text" required placeholder="e.g. Intel i5, 16GB, 512GB SSD" value={assetFields.laptopSpecs || ""} onChange={(e) => setAssetFields(p => ({ ...p, laptopSpecs: e.target.value }))} className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-semibold" />
                        </div>
                        <div>
                          <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Serial Number</label>
                          <input type="text" placeholder="e.g. SN-H1G4691X" value={assetFields.laptopSerial || ""} onChange={(e) => setAssetFields(p => ({ ...p, laptopSerial: e.target.value }))} className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-mono" />
                        </div>
                      </div>
                    </div>
                  );
                  if (tc === "mobile phone") return (
                    <div className="mt-3 space-y-3 bg-[#FCFBF9] border border-[#E8E4DF] p-3 rounded-lg animate-fade-in">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Phone Brand & Model *</label>
                          <input type="text" required placeholder="e.g. Samsung Galaxy S23" value={assetFields.phoneModel || ""} onChange={(e) => setAssetFields(p => ({ ...p, phoneModel: e.target.value }))} className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-semibold" />
                        </div>
                        <div>
                          <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">RAM & Storage</label>
                          <input type="text" placeholder="e.g. 8GB/128GB" value={assetFields.phoneSpecs || ""} onChange={(e) => setAssetFields(p => ({ ...p, phoneSpecs: e.target.value }))} className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-semibold" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">IMEI Number 1 *</label>
                          <input type="text" required placeholder="e.g. 358901234567890" value={assetFields.phoneImei1 || ""} onChange={(e) => setAssetFields(p => ({ ...p, phoneImei1: e.target.value }))} className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-mono" />
                        </div>
                        <div>
                          <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">IMEI Number 2</label>
                          <input type="text" placeholder="e.g. 358901234567891 (Optional)" value={assetFields.phoneImei2 || ""} onChange={(e) => setAssetFields(p => ({ ...p, phoneImei2: e.target.value }))} className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-mono" />
                        </div>
                      </div>
                    </div>
                  );
                  if (tc === "headset / accessories") return (
                    <div className="mt-3 grid grid-cols-3 gap-3 bg-[#FCFBF9] border border-[#E8E4DF] p-3 rounded-lg animate-fade-in">
                      <div>
                        <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Accessory Name *</label>
                        <input type="text" required placeholder="e.g. Sony WH-1000XM4" value={assetFields.accName || ""} onChange={(e) => setAssetFields(p => ({ ...p, accName: e.target.value }))} className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-semibold" />
                      </div>
                      <div>
                        <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Type</label>
                        <select value={assetFields.accType || "Wired"} onChange={(e) => setAssetFields(p => ({ ...p, accType: e.target.value }))} className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-semibold">
                          <option value="Wired">Wired</option><option value="Wireless">Wireless</option><option value="Bluetooth">Bluetooth</option><option value="USB Hub">USB Hub</option><option value="Other">Other</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Serial Number</label>
                        <input type="text" placeholder="e.g. SN-HS4521" value={assetFields.accSerial || ""} onChange={(e) => setAssetFields(p => ({ ...p, accSerial: e.target.value }))} className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-mono" />
                      </div>
                    </div>
                  );
                  if (tc === "id card / lanyard") return (
                    <div className="mt-3 grid grid-cols-2 gap-3 bg-[#FCFBF9] border border-[#E8E4DF] p-3 rounded-lg animate-fade-in">
                      <div>
                        <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Employee Name / ID *</label>
                        <input type="text" required placeholder="e.g. Rahul Sharma / EMP001" value={assetFields.idEmployee || ""} onChange={(e) => setAssetFields(p => ({ ...p, idEmployee: e.target.value }))} className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-semibold" />
                      </div>
                      <div>
                        <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Card ID Number / Barcode *</label>
                        <input type="text" required placeholder="e.g. ID-0042" value={assetFields.idBarcode || ""} onChange={(e) => setAssetFields(p => ({ ...p, idBarcode: e.target.value }))} className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-mono" />
                      </div>
                    </div>
                  );
                  if (tc === "office chair / table") return (
                    <div className="mt-3 grid grid-cols-2 gap-3 bg-[#FCFBF9] border border-[#E8E4DF] p-3 rounded-lg animate-fade-in">
                      <div>
                        <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Furniture Description *</label>
                        <input type="text" required placeholder="e.g. Ergonomic Black Mesh Chair" value={assetFields.furnitureDesc || ""} onChange={(e) => setAssetFields(p => ({ ...p, furnitureDesc: e.target.value }))} className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-semibold" />
                      </div>
                      <div>
                        <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Inventory Tag</label>
                        <input type="text" placeholder="e.g. TAG-CHR-0042" value={assetFields.furnitureTag || ""} onChange={(e) => setAssetFields(p => ({ ...p, furnitureTag: e.target.value }))} className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-mono" />
                      </div>
                    </div>
                  );
                  if (tc === "router / networking") return (
                    <div className="mt-3 grid grid-cols-3 gap-3 bg-[#FCFBF9] border border-[#E8E4DF] p-3 rounded-lg animate-fade-in">
                      <div>
                        <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Router Brand & Model *</label>
                        <input type="text" required placeholder="e.g. TP-Link Archer C6" value={assetFields.routerModel || ""} onChange={(e) => setAssetFields(p => ({ ...p, routerModel: e.target.value }))} className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-semibold" />
                      </div>
                      <div>
                        <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">MAC Address *</label>
                        <input type="text" required placeholder="e.g. 00:1A:2B:3C:4D:5E" value={assetFields.routerMac || ""} onChange={(e) => setAssetFields(p => ({ ...p, routerMac: e.target.value }))} className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-mono" />
                      </div>
                      <div>
                        <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Serial Number</label>
                        <input type="text" placeholder="e.g. SN-RTR99887" value={assetFields.routerSerial || ""} onChange={(e) => setAssetFields(p => ({ ...p, routerSerial: e.target.value }))} className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-mono" />
                      </div>
                    </div>
                  );
                  if (tc === "printer / scanner") return (
                    <div className="mt-3 grid grid-cols-3 gap-3 bg-[#FCFBF9] border border-[#E8E4DF] p-3 rounded-lg animate-fade-in">
                      <div>
                        <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Printer Brand & Model *</label>
                        <input type="text" required placeholder="e.g. HP LaserJet Pro M12w" value={assetFields.printerModel || ""} onChange={(e) => setAssetFields(p => ({ ...p, printerModel: e.target.value }))} className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-semibold" />
                      </div>
                      <div>
                        <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Printer Type</label>
                        <select value={assetFields.printerType || "Laser Printer"} onChange={(e) => setAssetFields(p => ({ ...p, printerType: e.target.value }))} className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-semibold">
                          <option value="Laser Printer">Laser Printer</option><option value="Inkjet Printer">Inkjet Printer</option><option value="Flatbed Scanner">Flatbed Scanner</option><option value="Multi-Function Printer">Multi-Function Printer</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Serial Number *</label>
                        <input type="text" required placeholder="e.g. SN-PRN1928" value={assetFields.printerSerial || ""} onChange={(e) => setAssetFields(p => ({ ...p, printerSerial: e.target.value }))} className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-mono" />
                      </div>
                    </div>
                  );
                  return null;
                })()}

                {assignForm.assetType === "Mobile Phone" && (
                  <div className="space-y-3 mt-2 bg-[#FCFBF9] border border-[#E8E4DF] p-3 rounded-lg">
                    <div>
                      <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">SIM Slots Used</label>
                      <select
                        value={simSlots}
                        onChange={(e) => setSimSlots(e.target.value)}
                        className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-semibold"
                      >
                        <option value="None">None</option>
                        <option value="1 SIM">1 SIM</option>
                        <option value="2 SIMs">2 SIMs</option>
                      </select>
                    </div>
                     {(simSlots === "1 SIM" || simSlots === "2 SIMs") && (
                      <div className="bg-white border border-[#E8E4DF] p-3 rounded-lg space-y-2 animate-fade-in">
                        <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold">SIM 1 Config</label>
                        <div>
                          <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">SIM 1 Phone Number *</label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. +91 9876543210"
                            value={sim1No}
                            onChange={(e) => setSim1No(e.target.value)}
                            className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-semibold"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">WhatsApp On?</label>
                            <select
                              value={sim1Whatsapp}
                              onChange={(e) => setSim1Whatsapp(e.target.value)}
                              className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-semibold"
                            >
                              <option value="No">No</option>
                              <option value="Yes">Yes</option>
                            </select>
                          </div>
                          {sim1Whatsapp === "Yes" && (
                            <div>
                              <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">WhatsApp Type</label>
                              <select
                                value={sim1WhatsappType}
                                onChange={(e) => setSim1WhatsappType(e.target.value)}
                                className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-semibold"
                              >
                                <option value="Personal">Personal</option>
                                <option value="Business">Business</option>
                              </select>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    {simSlots === "2 SIMs" && (
                      <div className="bg-white border border-[#E8E4DF] p-3 rounded-lg space-y-2 animate-fade-in">
                        <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold">SIM 2 Config</label>
                        <div>
                          <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">SIM 2 Phone Number *</label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. +91 9876543211"
                            value={sim2No}
                            onChange={(e) => setSim2No(e.target.value)}
                            className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-semibold"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">WhatsApp On?</label>
                            <select
                              value={sim2Whatsapp}
                              onChange={(e) => setSim2Whatsapp(e.target.value)}
                              className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-semibold"
                            >
                              <option value="No">No</option>
                              <option value="Yes">Yes</option>
                            </select>
                          </div>
                          {sim2Whatsapp === "Yes" && (
                            <div>
                              <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">WhatsApp Type</label>
                              <select
                                value={sim2WhatsappType}
                                onChange={(e) => setSim2WhatsappType(e.target.value)}
                                className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-semibold"
                              >
                                <option value="Personal">Personal</option>
                                <option value="Business">Business</option>
                              </select>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {(assignForm.assetType === "Laptop" || assignForm.assetType === "Mobile Phone") && (
                  <div className="space-y-2 mt-3 bg-[#FCFBF9] border border-[#E8E4DF] p-3 rounded-lg">
                    <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold">Logged-in Email IDs</label>
                    <div className="space-y-2">
                      {emailsList.map((email, index) => (
                        <div key={index} className="flex gap-2 items-center">
                          <input
                            type="email"
                            placeholder="e.g. user@company.com"
                            value={email}
                            onChange={(e) => {
                              const newList = [...emailsList];
                              newList[index] = e.target.value;
                              setEmailsList(newList);
                            }}
                            className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-semibold"
                          />
                          {emailsList.length > 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                const newList = emailsList.filter((_, i) => i !== index);
                                setEmailsList(newList);
                              }}
                              className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg text-xs font-bold transition-all border border-rose-100 animate-fade-in"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => setEmailsList([...emailsList, ""])}
                        className="mt-1 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[10px] font-bold rounded-lg transition-all border border-indigo-150 flex items-center gap-1.5 w-fit"
                      >
                        + Add Email ID
                      </button>
                    </div>
                  </div>
                )}
              </div>

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
