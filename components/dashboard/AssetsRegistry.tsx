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
  const [editingEmployee, setEditingEmployee] = useState<any>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    allocatedAsset: "",
    allocatedSim: "",
    allocatedGmail: "",
    allocatedWhatsapp: "",
    name: "",
    email: "",
    password: ""
  });
  const [updating, setUpdating] = useState(false);

  // Structured Edit Modal states
  const [editModeType, setEditModeType] = useState<"structured" | "raw">("structured");
  const [editAssetType, setEditAssetType] = useState("Mobile Phone");
  const [editAssetFields, setEditAssetFields] = useState<Record<string, any>>({});
  const [editSimSlots, setEditSimSlots] = useState("1 SIM");
  const [editSim1No, setEditSim1No] = useState("");
  const [editSim1Operator, setEditSim1Operator] = useState("Jio");
  const [editSim1OperatorCustom, setEditSim1OperatorCustom] = useState("");
  const [editSim1Whatsapp, setEditSim1Whatsapp] = useState("No");
  const [editSim1WhatsappType, setEditSim1WhatsappType] = useState("Personal");
  const [editSim2No, setEditSim2No] = useState("");
  const [editSim2Operator, setEditSim2Operator] = useState("Airtel");
  const [editSim2OperatorCustom, setEditSim2OperatorCustom] = useState("");
  const [editSim2Whatsapp, setEditSim2Whatsapp] = useState("No");
  const [editSim2WhatsappType, setEditSim2WhatsappType] = useState("Personal");
  const [editEmailsList, setEditEmailsList] = useState<string[]>([""]);

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
    customEmployeeName: "",
    isCustomEmployee: false,
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
          try { comps = JSON.parse(matchedEmp.companies); } catch (e) { }
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
    const isCustom = assignForm.isCustomEmployee || assignForm.assignedToId === "CUSTOM_OTHER";
    if (isCustom) {
      if (!assignForm.customEmployeeName.trim()) {
        triggerToast("Please enter employee name.");
        return;
      }
    } else if (!assignForm.assignedToId) {
      triggerToast("Please select an employee to assign the asset to.");
      return;
    }

    try {
      setUpdating(true);

      const effectiveEmpId = isCustom ? `EMP_${Date.now()}` : assignForm.assignedToId;
      const payload: any = {
        employeeId: effectiveEmpId,
        allocatedGmail: assignForm.allocatedGmail,
        allocatedWhatsapp: assignForm.allocatedWhatsapp,
      };

      if (isCustom) {
        payload.createIfMissing = true;
        payload.name = assignForm.customEmployeeName.trim();
        payload.companyId = assignForm.companyId;
      }

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

      if (isCustom) {
        const customName = assignForm.customEmployeeName.trim();
        if (assignForm.selectedInventoryId) {
          await fetch("/api/assets/inventory", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              assetId: assignForm.selectedInventoryId,
              assignedToName: customName,
              userId: null
            })
          });
        } else {
          let notesText = "";
          if (filteredEmails.length > 0) notesText += `Logged-in Emails: ${filteredEmails.join(", ")}\n`;
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
          if (createInvResult.success && createInvResult.data?.id) {
            await fetch("/api/assets/inventory", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                assetId: createInvResult.data.id,
                assignedToName: customName,
                userId: null
              })
            });
          }
        }
        triggerToast(`Asset assigned to ${customName}`);
        setShowAssignModal(false);
        fetchData();
        return;
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
            const selectedEmployee = employees.find((employee: any) =>
              String(employee.employeeProfile?.employeeId) === String(assignForm.assignedToId)
            );
            const inventoryResponse = await fetch("/api/assets/inventory", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                assetId: assignForm.selectedInventoryId,
                userId: selectedEmployee?.id || null
              })
            });
            const inventoryResult = await inventoryResponse.json();
            if (!inventoryResponse.ok || !inventoryResult.success) {
              throw new Error(inventoryResult.error || "Failed to link inventory assignment");
            }
          } catch (invErr) {
            console.error("Failed to update inventory status:", invErr);
            triggerToast("Employee updated, but inventory assignment link failed. Please retry from Inventory Management.");
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
        const assignedEmpName = isCustom ? assignForm.customEmployeeName.trim() : (employees.find(emp => emp.employeeProfile?.employeeId === assignForm.assignedToId)?.name || "employee");
        triggerToast(`Asset assigned successfully to ${assignedEmpName}`);
        setShowAssignModal(false);
        fetchData();
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
      try { comps = JSON.parse(loggedInUserObj.companies); } catch (e) { }
    }
    const allowedIds = comps.map((c: any) => String(c.id || c));
    return companies.filter(comp => allowedIds.includes(String(comp.id)));
  }, [companies, employees, sessionUser, userRole]);

  const handleStartEdit = (emp: any) => {
    setEditingEmployee(emp);
    const assetStr = emp.employeeProfile?.allocatedAsset || "";
    const simStr = emp.employeeProfile?.allocatedSim || "";
    const gmailStr = emp.employeeProfile?.allocatedGmail || "";
    const waStr = emp.employeeProfile?.allocatedWhatsapp || "";

    setEditForm({
      allocatedAsset: assetStr,
      allocatedSim: simStr,
      allocatedGmail: gmailStr,
      allocatedWhatsapp: waStr,
      name: emp.name || "",
      email: emp.email || "",
      password: ""
    });

    // Detect asset type
    let type = "Mobile Phone";
    if (assetStr.toLowerCase().includes("laptop")) type = "Laptop";
    else if (assetStr.toLowerCase().includes("desktop")) type = "Desktop";
    else if (assetStr.toLowerCase().includes("sim card") || assetStr.toLowerCase().includes("sim")) type = "SIM Card";
    else if (assetStr.toLowerCase().includes("headset") || assetStr.toLowerCase().includes("accessory")) type = "Headset / Accessories";
    else if (assetStr.toLowerCase().includes("id card") || assetStr.toLowerCase().includes("lanyard")) type = "ID Card / Lanyard";
    else if (assetStr.toLowerCase().includes("chair") || assetStr.toLowerCase().includes("table")) type = "Office Chair / Table";
    else if (assetStr.toLowerCase().includes("router")) type = "Router / Networking";
    else if (assetStr.toLowerCase().includes("printer") || assetStr.toLowerCase().includes("scanner")) type = "Printer / Scanner";
    setEditAssetType(type);

    // Extract IMEI 1, IMEI 2 & Serial
    const imei1Match = assetStr.match(/IMEI 1:\s*([0-9a-zA-Z]+)/i);
    const imei2Match = assetStr.match(/IMEI 2:\s*([0-9a-zA-Z]+)/i);
    const snMatch = assetStr.match(/\[S\/N:\s*([^\]]+)\]/i);

    // Extract Logged-in Emails
    const emailsMatch = assetStr.match(/Logged-in Emails:\s*([^\|\n\)]+)/i);
    let extractedEmails: string[] = [];
    if (emailsMatch && emailsMatch[1]) {
      extractedEmails = emailsMatch[1].split(",").map((e: string) => e.trim()).filter(Boolean);
    } else if (gmailStr) {
      extractedEmails = [gmailStr];
    }
    if (extractedEmails.length === 0) extractedEmails = [""];
    setEditEmailsList(extractedEmails);

    // Extract SIM details
    const sim1Match = simStr.match(/SIM 1:\s*([^\s\[\]]+)/i);
    const sim2Match = simStr.match(/SIM 2:\s*([^\s\[\]]+)/i);
    const sim1OpMatch = simStr.match(/SIM 1:[^\[]*\[Company:\s*([^\]]+)\]/i);
    const sim2OpMatch = simStr.match(/SIM 2:[^\[]*\[Company:\s*([^\]]+)\]/i);

    setEditSim1No(sim1Match ? sim1Match[1] : "");
    setEditSim2No(sim2Match ? sim2Match[1] : "");

    if (sim1OpMatch && sim1OpMatch[1]) {
      const op = sim1OpMatch[1].trim();
      if (["Jio", "Airtel", "Vodafone Idea (Vi)", "BSNL"].includes(op)) {
        setEditSim1Operator(op);
        setEditSim1OperatorCustom("");
      } else {
        setEditSim1Operator("Other");
        setEditSim1OperatorCustom(op);
      }
    } else {
      setEditSim1Operator("Jio");
      setEditSim1OperatorCustom("");
    }

    if (sim2OpMatch && sim2OpMatch[1]) {
      const op = sim2OpMatch[1].trim();
      if (["Jio", "Airtel", "Vodafone Idea (Vi)", "BSNL"].includes(op)) {
        setEditSim2Operator(op);
        setEditSim2OperatorCustom("");
      } else {
        setEditSim2Operator("Other");
        setEditSim2OperatorCustom(op);
      }
    } else {
      setEditSim2Operator("Airtel");
      setEditSim2OperatorCustom("");
    }

    setEditSimSlots(sim2Match ? "2 SIMs" : sim1Match ? "1 SIM" : "None");

    let cleanModel = assetStr.replace(/^[^:]+:\s*/, '').replace(/\[S\/N:[^\]]+\]\s*/, '').replace(/\| Logged-in Emails:[^\n\)]+/, '').replace(/\(Assigned:[^\)]+\)/, '').trim();

    setEditAssetFields({
      phoneModel: cleanModel || "",
      phoneSpecs: "",
      phoneImei1: imei1Match ? imei1Match[1] : (snMatch ? snMatch[1] : ""),
      phoneImei2: imei2Match ? imei2Match[1] : "",
      laptopModel: cleanModel || "",
      laptopSerial: snMatch ? snMatch[1] : "",
      accName: cleanModel || "",
      simMobile: sim1Match ? sim1Match[1] : "",
      simOperator: "Jio"
    });

    setEditModeType("structured");
    setShowEditModal(true);
  };

  const handleCancelEdit = () => {
    setShowEditModal(false);
    setEditingEmployee(null);
  };

  const handleSaveEdit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!editingEmployee) return;

    const employeeId = editingEmployee.employeeProfile?.employeeId;
    if (!employeeId) {
      triggerToast("Employee ID not found");
      return;
    }

    let finalAllocatedAsset = editForm.allocatedAsset;
    let finalAllocatedSim = editForm.allocatedSim;
    let finalAllocatedGmail = editForm.allocatedGmail;
    let finalAllocatedWhatsapp = editForm.allocatedWhatsapp;

    if (editModeType === "structured") {
      const tc = editAssetType.toLowerCase();
      let detail = "";
      let serial = "";

      if (tc === "mobile phone") {
        const model = editAssetFields.phoneModel || "Mobile Phone";
        const specs = editAssetFields.phoneSpecs ? ` (${editAssetFields.phoneSpecs})` : "";
        const imei1 = editAssetFields.phoneImei1 || "";
        const imei2 = editAssetFields.phoneImei2 || "";
        detail = `${model}${specs}`;
        serial = imei2 ? `IMEI 1: ${imei1}, IMEI 2: ${imei2}` : imei1;
      } else if (tc === "laptop") {
        detail = `${editAssetFields.laptopModel || "Laptop"} (${editAssetFields.laptopSpecs || ""})`;
        serial = editAssetFields.laptopSerial || "";
      } else if (tc === "desktop") {
        detail = editAssetFields.desktopModel || "Desktop PC";
        serial = editAssetFields.desktopSerial || "";
      } else {
        detail = editAssetFields.phoneModel || editAssetFields.accName || editAssetType;
        serial = editAssetFields.phoneImei1 || editAssetFields.laptopSerial || "";
      }

      const filteredEmails = editEmailsList.map((e: string) => e.trim()).filter(Boolean);
      const emailsStr = filteredEmails.length > 0 ? ` | Logged-in Emails: ${filteredEmails.join(", ")}` : "";
      const displayValue = serial ? `[S/N: ${serial}] ${detail}` : detail;

      finalAllocatedAsset = `${editAssetType}: ${displayValue}${emailsStr}`;
      if (filteredEmails.length > 0) {
        finalAllocatedGmail = filteredEmails[0];
      }

      if (editSimSlots !== "None") {
        let simDetails = `SIM Slots Used: ${editSimSlots}`;
        if (editSim1No) {
          const op1 = (editSim1Operator === "Other" && editSim1OperatorCustom) ? editSim1OperatorCustom : editSim1Operator;
          const wa1Type = editSim1Whatsapp === "Yes" ? ` (${editSim1WhatsappType})` : "";
          simDetails += `, SIM 1: ${editSim1No} [Company: ${op1}] [WhatsApp: ${editSim1Whatsapp}${wa1Type}]`;
          if (!finalAllocatedWhatsapp && editSim1Whatsapp === "Yes") {
            finalAllocatedWhatsapp = `${editSim1No} (${editSim1WhatsappType})`;
          }
        }
        if (editSim2No) {
          const op2 = (editSim2Operator === "Other" && editSim2OperatorCustom) ? editSim2OperatorCustom : editSim2Operator;
          const wa2Type = editSim2Whatsapp === "Yes" ? ` (${editSim2WhatsappType})` : "";
          simDetails += `, SIM 2: ${editSim2No} [Company: ${op2}] [WhatsApp: ${editSim2Whatsapp}${wa2Type}]`;
        }
        finalAllocatedSim = simDetails;
      }
    }

    try {
      setUpdating(true);
      const payload: any = {
        employeeId,
        allocatedAsset: finalAllocatedAsset,
        allocatedSim: finalAllocatedSim,
        allocatedGmail: finalAllocatedGmail,
        allocatedWhatsapp: finalAllocatedWhatsapp,
        name: editForm.name,
        email: editForm.email
      };
      if (editForm.password) {
        payload.password = editForm.password;
      }

      const res = await fetch("/api/employees", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const result = await res.json();
      if (result.success) {
        triggerToast("Asset allocation updated successfully");
        setShowEditModal(false);
        setEditingEmployee(null);
        // Refresh local data state
        setEmployees(prev => prev.map(emp => {
          if (emp.employeeProfile?.employeeId === employeeId) {
            return {
              ...emp,
              employeeProfile: {
                ...emp.employeeProfile,
                allocatedAsset: finalAllocatedAsset,
                allocatedSim: finalAllocatedSim,
                allocatedGmail: finalAllocatedGmail,
                allocatedWhatsapp: finalAllocatedWhatsapp
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
          <h2 className="text-xl font-light tracking-wide font-serif" style={{ fontFamily: "'Playfair Display', serif" }}>
            Company Assets & SIM Registry
          </h2>
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
                customEmployeeName: "",
                isCustomEmployee: false,
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
                        <span className={cn("font-medium text-xs block whitespace-pre-wrap max-w-xs", profile?.allocatedAsset ? "text-[#1C1C1A]" : "text-[#9C9890] italic")}>
                          {profile?.allocatedAsset || "Not Assigned"}
                        </span>
                      </td>

                      {/* Allocated SIM */}
                      <td className="py-4 px-4">
                        <span className={cn("font-mono text-xs font-semibold block whitespace-pre-wrap max-w-xs", profile?.allocatedSim ? "text-[#1C1C1A]" : "text-[#9C9890] italic")}>
                          {profile?.allocatedSim || "No SIM"}
                        </span>
                      </td>

                      {/* Allocated Gmail */}
                      <td className="py-4 px-4">
                        <span className={cn("font-semibold text-xs", profile?.allocatedGmail ? "text-indigo-650" : "text-[#9C9890] italic")}>
                          {profile?.allocatedGmail || "No Gmail"}
                        </span>
                      </td>

                      {/* Allocated WhatsApp */}
                      <td className="py-4 px-4">
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
                      </td>

                      {/* Action buttons */}
                      <td className="py-4 px-4 text-center">
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
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold">Assigned To (Employee) *</label>
                  <button
                    type="button"
                    onClick={() => {
                      setAssignForm(prev => ({
                        ...prev,
                        isCustomEmployee: !prev.isCustomEmployee,
                        assignedToId: !prev.isCustomEmployee ? "CUSTOM_OTHER" : "",
                        customEmployeeName: ""
                      }));
                    }}
                    className="text-[10px] font-bold text-[#C9A84C] hover:underline flex items-center gap-1"
                  >
                    {assignForm.isCustomEmployee ? "📋 Select from DB" : "✏️ Type Custom Name"}
                  </button>
                </div>

                {!assignForm.isCustomEmployee && assignForm.assignedToId !== "CUSTOM_OTHER" ? (
                  <select
                    required={!assignForm.isCustomEmployee}
                    value={assignForm.assignedToId}
                    disabled={!assignForm.companyId}
                    onChange={(e) => {
                      const empId = e.target.value;
                      if (empId === "CUSTOM_OTHER") {
                        setAssignForm(prev => ({
                          ...prev,
                          assignedToId: empId,
                          isCustomEmployee: true,
                          customEmployeeName: ""
                        }));
                      } else {
                        const matchedEmp = employees.find(emp => emp.employeeProfile?.employeeId === empId || emp.id === empId);
                        setAssignForm(prev => ({
                          ...prev,
                          assignedToId: empId,
                          allocatedGmail: matchedEmp?.employeeProfile?.allocatedGmail || "",
                          allocatedWhatsapp: matchedEmp?.employeeProfile?.allocatedWhatsapp || ""
                        }));
                      }
                    }}
                    className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-semibold disabled:opacity-50"
                  >
                    <option value="">-- Select Employee --</option>
                    {employees.filter(emp => {
                      let comps: any[] = [];
                      if (Array.isArray(emp.companies)) comps = emp.companies;
                      else if (typeof emp.companies === "string") {
                        try { comps = JSON.parse(emp.companies); } catch (e) { }
                      }
                      if (!Array.isArray(comps)) comps = [];
                      return comps.some((c: any) => String(c.id || c) === String(assignForm.companyId));
                    }).map(emp => (
                      <option key={emp.employeeProfile?.employeeId || emp.id} value={emp.employeeProfile?.employeeId || emp.id}>
                        {emp.name} ({emp.employeeProfile?.employeeId || "No ID"})
                      </option>
                    ))}
                    <option value="CUSTOM_OTHER">✏️ Type Custom Employee Name (Not in DB)</option>
                  </select>
                ) : (
                  <input
                    type="text"
                    required
                    value={assignForm.customEmployeeName}
                    onChange={(e) => setAssignForm(prev => ({ ...prev, customEmployeeName: e.target.value, assignedToId: "CUSTOM_OTHER", isCustomEmployee: true }))}
                    placeholder="Enter full employee name (e.g. Ramesh Kumar)..."
                    className="w-full bg-white border border-[#C9A84C] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-semibold shadow-sm"
                  />
                )}
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

      {/* --- Edit Allocation Modal Portal --- */}
      {showEditModal && editingEmployee && typeof document !== "undefined" && ReactDOM.createPortal(
        <div className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col font-sans max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-4 border-b border-[#E8E4DF] flex items-center justify-between bg-[#FCFBF9]">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-50 border border-indigo-100 rounded-lg text-indigo-600">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#1C1C1A] uppercase tracking-wide">Edit Asset Allocation & Records</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] bg-[#F4F1EA] text-[#1C1C1A] px-2 py-0.5 rounded font-bold">
                      {editingEmployee.name}
                    </span>
                    <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded font-mono font-bold">
                      ID: {editingEmployee.employeeProfile?.employeeId || "N/A"}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={handleCancelEdit}
                className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveEdit} className="p-5 space-y-4 overflow-y-auto text-xs">
              {/* Employee Account Credentials & Profile Info */}
              <div className="bg-[#FCFBF9] border border-[#E8E4DF] p-3 rounded-xl space-y-2.5">
                <label className="block text-[10px] uppercase font-bold tracking-wider text-[#9C9890]">
                  Employee Account Details (Name, Email & Login Password)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[9px] uppercase font-bold text-[#5D5B57] mb-1">Employee Name</label>
                    <input
                      type="text"
                      required
                      value={editForm.name}
                      onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g. Sonu Kumar"
                      className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-1.5 text-xs font-semibold text-[#1C1C1A]"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase font-bold text-[#5D5B57] mb-1">Login Email ID *</label>
                    <input
                      type="email"
                      required
                      value={editForm.email}
                      onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="e.g. sonu@company.com"
                      className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-1.5 text-xs font-semibold font-mono text-indigo-700"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase font-bold text-[#5D5B57] mb-1">New Password (Optional)</label>
                    <input
                      type="password"
                      placeholder="Leave blank if unchanged"
                      value={editForm.password}
                      onChange={(e) => setEditForm(prev => ({ ...prev, password: e.target.value }))}
                      className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-1.5 text-xs font-semibold text-[#1C1C1A]"
                    />
                  </div>
                </div>
              </div>

              {/* Mode Toggle */}
              <div className="flex items-center justify-between bg-slate-50 border border-[#E8E4DF] p-2 rounded-lg">
                <span className="text-[10px] uppercase font-bold text-slate-600 tracking-wider">Form Edit Mode</span>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => setEditModeType("structured")}
                    className={cn(
                      "px-3 py-1 rounded text-[10px] font-bold transition-all",
                      editModeType === "structured" ? "bg-indigo-600 text-white shadow-sm" : "bg-white text-slate-600 border border-[#E8E4DF]"
                    )}
                  >
                    Structured Form
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditModeType("raw")}
                    className={cn(
                      "px-3 py-1 rounded text-[10px] font-bold transition-all",
                      editModeType === "raw" ? "bg-indigo-600 text-white shadow-sm" : "bg-white text-slate-600 border border-[#E8E4DF]"
                    )}
                  >
                    Direct Text Override
                  </button>
                </div>
              </div>

              {editModeType === "structured" ? (
                <div className="space-y-3">
                  {/* Asset Type Dropdown */}
                  <div>
                    <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Asset Category / Type *</label>
                    <select
                      value={editAssetType}
                      onChange={(e) => setEditAssetType(e.target.value)}
                      className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-semibold"
                    >
                      <option value="Mobile Phone">Mobile Phone</option>
                      <option value="Laptop">Laptop</option>
                      <option value="Desktop">Desktop PC</option>
                      <option value="SIM Card">SIM Card</option>
                      <option value="Headset / Accessories">Headset / Accessories</option>
                      <option value="ID Card / Lanyard">ID Card / Lanyard</option>
                      <option value="Office Chair / Table">Office Chair / Table</option>
                      <option value="Router / Networking">Router / Networking</option>
                      <option value="Printer / Scanner">Printer / Scanner</option>
                    </select>
                  </div>

                  {/* Device Spec Fields */}
                  {editAssetType === "Mobile Phone" && (
                    <div className="space-y-3 bg-[#FCFBF9] border border-[#E8E4DF] p-3 rounded-lg">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Phone Brand & Model *</label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. Samsung Galaxy S23"
                            value={editAssetFields.phoneModel || ""}
                            onChange={(e) => setEditAssetFields(p => ({ ...p, phoneModel: e.target.value }))}
                            className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-semibold"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">RAM & Storage</label>
                          <input
                            type="text"
                            placeholder="e.g. 8GB/128GB"
                            value={editAssetFields.phoneSpecs || ""}
                            onChange={(e) => setEditAssetFields(p => ({ ...p, phoneSpecs: e.target.value }))}
                            className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-semibold"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">IMEI Number 1 *</label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. 358901234567890"
                            value={editAssetFields.phoneImei1 || ""}
                            onChange={(e) => setEditAssetFields(p => ({ ...p, phoneImei1: e.target.value }))}
                            className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">IMEI Number 2</label>
                          <input
                            type="text"
                            placeholder="e.g. 358901234567891 (Optional)"
                            value={editAssetFields.phoneImei2 || ""}
                            onChange={(e) => setEditAssetFields(p => ({ ...p, phoneImei2: e.target.value }))}
                            className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-mono"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {editAssetType === "Laptop" && (
                    <div className="space-y-3 bg-[#FCFBF9] border border-[#E8E4DF] p-3 rounded-lg">
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Laptop Brand & Model *</label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. HP EliteBook 840 G8"
                            value={editAssetFields.laptopModel || ""}
                            onChange={(e) => setEditAssetFields(p => ({ ...p, laptopModel: e.target.value }))}
                            className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-semibold"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Processor / RAM / Storage *</label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. Intel i5, 16GB, 512GB SSD"
                            value={editAssetFields.laptopSpecs || ""}
                            onChange={(e) => setEditAssetFields(p => ({ ...p, laptopSpecs: e.target.value }))}
                            className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-semibold"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Serial Number</label>
                          <input
                            type="text"
                            placeholder="e.g. SN-H1G4691X"
                            value={editAssetFields.laptopSerial || ""}
                            onChange={(e) => setEditAssetFields(p => ({ ...p, laptopSerial: e.target.value }))}
                            className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-mono"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* SIM Slots Section */}
                  {editAssetType === "Mobile Phone" && (
                    <div className="space-y-3 bg-[#FCFBF9] border border-[#E8E4DF] p-3 rounded-lg">
                      <div>
                        <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">SIM Slots Used</label>
                        <select
                          value={editSimSlots}
                          onChange={(e) => setEditSimSlots(e.target.value)}
                          className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-semibold"
                        >
                          <option value="None">None</option>
                          <option value="1 SIM">1 SIM</option>
                          <option value="2 SIMs">2 SIMs</option>
                        </select>
                      </div>

                      {(editSimSlots === "1 SIM" || editSimSlots === "2 SIMs") && (
                        <div className="bg-white border border-[#E8E4DF] p-3 rounded-lg space-y-2">
                          <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold">SIM 1 Config</label>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">SIM 1 Phone Number *</label>
                              <input
                                type="text"
                                required
                                placeholder="e.g. 9876543210"
                                value={editSim1No}
                                onChange={(e) => setEditSim1No(e.target.value)}
                                className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-semibold"
                              />
                            </div>
                            <div>
                              <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">SIM 1 Company / Operator</label>
                              <select
                                value={["Jio", "Airtel", "Vodafone Idea (Vi)", "BSNL"].includes(editSim1Operator) ? editSim1Operator : "Other"}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setEditSim1Operator(val);
                                  if (val !== "Other") setEditSim1OperatorCustom("");
                                }}
                                className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-semibold"
                              >
                                <option value="Jio">Jio</option>
                                <option value="Airtel">Airtel</option>
                                <option value="Vodafone Idea (Vi)">Vodafone Idea (Vi)</option>
                                <option value="BSNL">BSNL</option>
                                <option value="Other">Other (Custom Company)</option>
                              </select>
                              {(editSim1Operator === "Other" || (!["Jio", "Airtel", "Vodafone Idea (Vi)", "BSNL"].includes(editSim1Operator) && editSim1OperatorCustom !== undefined)) && (
                                <input
                                  type="text"
                                  placeholder="Enter SIM Company Name..."
                                  value={editSim1OperatorCustom}
                                  onChange={(e) => setEditSim1OperatorCustom(e.target.value)}
                                  className="mt-1.5 w-full bg-white border border-[#C9A84C] rounded-lg px-3 py-1.5 text-xs font-semibold"
                                />
                              )}
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">WhatsApp On?</label>
                              <select
                                value={editSim1Whatsapp}
                                onChange={(e) => setEditSim1Whatsapp(e.target.value)}
                                className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-semibold"
                              >
                                <option value="No">No</option>
                                <option value="Yes">Yes</option>
                              </select>
                            </div>
                            {editSim1Whatsapp === "Yes" && (
                              <div>
                                <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">WhatsApp Type</label>
                                <select
                                  value={editSim1WhatsappType}
                                  onChange={(e) => setEditSim1WhatsappType(e.target.value)}
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

                      {editSimSlots === "2 SIMs" && (
                        <div className="bg-white border border-[#E8E4DF] p-3 rounded-lg space-y-2">
                          <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold">SIM 2 Config</label>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">SIM 2 Phone Number *</label>
                              <input
                                type="text"
                                required
                                placeholder="e.g. 9876543211"
                                value={editSim2No}
                                onChange={(e) => setEditSim2No(e.target.value)}
                                className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-semibold"
                              />
                            </div>
                            <div>
                              <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">SIM 2 Company / Operator</label>
                              <select
                                value={["Jio", "Airtel", "Vodafone Idea (Vi)", "BSNL"].includes(editSim2Operator) ? editSim2Operator : "Other"}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setEditSim2Operator(val);
                                  if (val !== "Other") setEditSim2OperatorCustom("");
                                }}
                                className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-semibold"
                              >
                                <option value="Jio">Jio</option>
                                <option value="Airtel">Airtel</option>
                                <option value="Vodafone Idea (Vi)">Vodafone Idea (Vi)</option>
                                <option value="BSNL">BSNL</option>
                                <option value="Other">Other (Custom Company)</option>
                              </select>
                              {(editSim2Operator === "Other" || (!["Jio", "Airtel", "Vodafone Idea (Vi)", "BSNL"].includes(editSim2Operator) && editSim2OperatorCustom !== undefined)) && (
                                <input
                                  type="text"
                                  placeholder="Enter SIM Company Name..."
                                  value={editSim2OperatorCustom}
                                  onChange={(e) => setEditSim2OperatorCustom(e.target.value)}
                                  className="mt-1.5 w-full bg-white border border-[#C9A84C] rounded-lg px-3 py-1.5 text-xs font-semibold"
                                />
                              )}
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">WhatsApp On?</label>
                              <select
                                value={editSim2Whatsapp}
                                onChange={(e) => setEditSim2Whatsapp(e.target.value)}
                                className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-semibold"
                              >
                                <option value="No">No</option>
                                <option value="Yes">Yes</option>
                              </select>
                            </div>
                            {editSim2Whatsapp === "Yes" && (
                              <div>
                                <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">WhatsApp Type</label>
                                <select
                                  value={editSim2WhatsappType}
                                  onChange={(e) => setEditSim2WhatsappType(e.target.value)}
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

                  {/* Standalone / External WhatsApp (Wi-Fi / Separate Number) Section */}
                  <div className="bg-[#FCFBF9] border border-[#E8E4DF] p-3 rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[9px] uppercase tracking-wider text-[#9C9890] font-bold flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        Standalone / External WhatsApp (Without Physical SIM)
                      </label>
                      <select
                        value={editAssetFields.phoneExternalWhatsapp || "No"}
                        onChange={(e) => setEditAssetFields(p => ({ ...p, phoneExternalWhatsapp: e.target.value }))}
                        className="bg-white border border-[#E8E4DF] rounded-md px-2 py-1 text-[10px] font-bold text-slate-700 focus:outline-none"
                      >
                        <option value="No">No (Disabled)</option>
                        <option value="Yes">Yes (Add External Number)</option>
                      </select>
                    </div>

                    {editAssetFields.phoneExternalWhatsapp === "Yes" && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 pt-1">
                        <div>
                          <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">WhatsApp Mobile Number *</label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. 9876543210"
                            value={editAssetFields.phoneExternalWhatsappNo || ""}
                            onChange={(e) => setEditAssetFields(p => ({ ...p, phoneExternalWhatsappNo: e.target.value }))}
                            className="w-full bg-white border border-emerald-300 focus:border-emerald-500 rounded-lg px-3 py-1.5 text-xs text-[#1C1C1A] font-semibold"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">WhatsApp Type *</label>
                          <select
                            value={editAssetFields.phoneExternalWhatsappType || "Business"}
                            onChange={(e) => setEditAssetFields(p => ({ ...p, phoneExternalWhatsappType: e.target.value }))}
                            className="w-full bg-white border border-[#E8E4DF] focus:border-emerald-500 rounded-lg px-3 py-1.5 text-xs text-[#1C1C1A] font-semibold"
                          >
                            <option value="Business">WhatsApp Business</option>
                            <option value="Personal">Personal WhatsApp</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Account Label / Remarks</label>
                          <input
                            type="text"
                            placeholder="e.g. Support WA / Wi-Fi Logged-in"
                            value={editAssetFields.phoneExternalWhatsappLabel || ""}
                            onChange={(e) => setEditAssetFields(p => ({ ...p, phoneExternalWhatsappLabel: e.target.value }))}
                            className="w-full bg-white border border-[#E8E4DF] focus:border-emerald-500 rounded-lg px-3 py-1.5 text-xs text-[#1C1C1A] font-semibold"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Logged-in Emails Section */}
                  <div className="space-y-2 bg-[#FCFBF9] border border-[#E8E4DF] p-3 rounded-lg">
                    <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold">Logged-in Email IDs</label>
                    <div className="space-y-2">
                      {editEmailsList.map((email, index) => (
                        <div key={index} className="flex gap-2 items-center">
                          <input
                            type="email"
                            placeholder="e.g. user@company.com"
                            value={email}
                            onChange={(e) => {
                              const newList = [...editEmailsList];
                              newList[index] = e.target.value;
                              setEditEmailsList(newList);
                            }}
                            className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-semibold"
                          />
                          {editEmailsList.length > 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                const newList = editEmailsList.filter((_, i) => i !== index);
                                setEditEmailsList(newList);
                              }}
                              className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg text-xs font-bold transition-all border border-rose-100"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => setEditEmailsList([...editEmailsList, ""])}
                        className="mt-1 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[10px] font-bold rounded-lg transition-all border border-indigo-150 flex items-center gap-1.5 w-fit"
                      >
                        + Add Email ID
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">
                      Allocated Asset (Hardware Description)
                    </label>
                    <textarea
                      rows={4}
                      value={editForm.allocatedAsset}
                      onChange={(e) => setEditForm(p => ({ ...p, allocatedAsset: e.target.value }))}
                      placeholder="e.g. Mobile Phone: [S/N: 356789123456799] Oppo Reno 14 (128GB) | Logged-in Emails: user@gmail.com"
                      className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-mono font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">
                      Allocated SIM & Mobile Number Details
                    </label>
                    <textarea
                      rows={3}
                      value={editForm.allocatedSim}
                      onChange={(e) => setEditForm(p => ({ ...p, allocatedSim: e.target.value }))}
                      placeholder="e.g. SIM Slots Used: 1 SIM, SIM 1: 9879879876 [Company: Jio] [WhatsApp: Yes]"
                      className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-mono font-semibold"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">
                        Corporate Gmail / Email Account
                      </label>
                      <input
                        type="text"
                        value={editForm.allocatedGmail}
                        onChange={(e) => setEditForm(p => ({ ...p, allocatedGmail: e.target.value }))}
                        placeholder="e.g. employee.name@gmail.com"
                        className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-semibold"
                      />
                    </div>

                    <div>
                      <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">
                        WhatsApp Status / Number
                      </label>
                      <input
                        type="text"
                        value={editForm.allocatedWhatsapp}
                        onChange={(e) => setEditForm(p => ({ ...p, allocatedWhatsapp: e.target.value }))}
                        placeholder="e.g. Personal WhatsApp / 9876543210"
                        className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-semibold"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Modal Footer */}
              <div className="pt-3 border-t border-[#E8E4DF] flex justify-end gap-3">
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  disabled={updating}
                  className="px-4 py-2 border border-[#E8E4DF] rounded-lg text-xs font-bold text-slate-500 hover:bg-slate-100 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="px-5 py-2 bg-[#C9A84C] hover:bg-[#b5953e] text-white rounded-lg text-xs font-bold transition-all disabled:opacity-50 shadow-sm"
                >
                  {updating ? "Saving..." : "Save Changes"}
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
