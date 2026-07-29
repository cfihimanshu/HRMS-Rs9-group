"use client";
import React, { useState, useEffect, useCallback } from "react";
import ReactDOM from "react-dom";
import {
  Search, Edit3, Check, X, RefreshCw, Cpu, Layers, Building2,
  Trash2, AlertTriangle, PlusCircle, PackagePlus, Package,
  Sparkles, Filter, Calendar, Coins, CheckCircle, HelpCircle, Download,
  UserPlus, UserMinus, History, ArrowRightLeft
} from "lucide-react";
import { cn } from "@/lib/utils";

interface InventoryManagementProps {
  userRole?: string;
  triggerToast: (msg: string) => void;
  sessionUser?: any;
}

export default function InventoryManagement({ userRole, triggerToast, sessionUser }: InventoryManagementProps) {
  const [inventory, setInventory] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCompany, setSelectedCompany] = useState("all");
  const [selectedCondition, setSelectedCondition] = useState("all");
  const [selectedType, setSelectedType] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedAssignee, setSelectedAssignee] = useState("all");
  const [assignedFrom, setAssignedFrom] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [handoverFrom, setHandoverFrom] = useState("");
  const [handoverTo, setHandoverTo] = useState("");

  const formatDateDDMMYY = (dateStr?: string) => {
    if (!dateStr) return "";
    try {
      const parts = dateStr.split("-");
      if (parts.length === 3 && parts[0].length === 4) {
        const year = parts[0].slice(-2);
        const month = parts[1];
        const day = parts[2];
        return `${day}/${month}/${year}`;
      }
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const day = String(d.getDate()).padStart(2, "0");
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const year = String(d.getFullYear()).slice(-2);
      return `${day}/${month}/${year}`;
    } catch (_) {
      return dateStr;
    }
  };

  // Viewing state (tap any asset to view full details)
  const [viewingAsset, setViewingAsset] = useState<any>(null);

  // Editing state
  const [editingAssetId, setEditingAssetId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    oldAssetId: "",
    assetType: "Laptop",
    assetDetail: "",
    serialNumber: "",
    purchaseDate: "",
    purchaseValue: "",
    condition: "Good",
    status: "Available",
    companyId: "",
    notes: "",
    photoUrl: ""
  });
  const [updating, setUpdating] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingAsset, setEditingAsset] = useState<any>(null);
  const [editAssetFields, setEditAssetFields] = useState<Record<string, string>>({});
  const [editEmailsList, setEditEmailsList] = useState<string[]>([""]);

  // Registration form
  const [showRegisterForm, setShowRegisterForm] = useState(false);
  const [registerForm, setRegisterForm] = useState({
    id: "",
    oldAssetId: "",
    assetType: "Laptop",
    assetDetail: "",
    serialNumber: "",
    purchaseDate: "",
    purchaseValue: "",
    condition: "Good",
    companyId: "",
    notes: "",
    photoUrl: ""
  });
  const [submittingRegister, setSubmittingRegister] = useState(false);
  const [isCustomRegisterType, setIsCustomRegisterType] = useState(false);
  const [isCustomEditType, setIsCustomEditType] = useState(false);

  // Dynamic Asset Type Custom Fields State
  const [assetFields, setAssetFields] = useState<Record<string, string>>({});
  const [emailsList, setEmailsList] = useState<string[]>([""]);

  const defaultTypes = [
    "Laptop",
    "Mobile Phone",
    "SIM Card",
    "Headset / Accessories",
    "ID Card / Lanyard",
    "Office Chair / Table",
    "Router / Networking",
    "Printer / Scanner"
  ];

  const dynamicAssetTypes = React.useMemo(() => {
    const existingTypes = inventory.map(item => item.assetType).filter(Boolean);
    const combined = Array.from(new Set([...defaultTypes, ...existingTypes]));
    return combined.sort();
  }, [inventory]);

  // Delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; assetId?: string; assetType?: string; serialNumber?: string }>({ show: false });
  const [deleting, setDeleting] = useState(false);

  // Action roles mapping
  const loggedRole = (sessionUser?.role || "").toLowerCase();
  const loggedDept = (sessionUser?.department || "").toLowerCase();
  const isOwner = ["owner", "director"].includes(loggedRole);
  const isAdminDept = loggedDept.includes("administration");

  // Purchase Requests States
  const [activeSubTab, setActiveSubTab] = useState("stock");
  const [purchaseRequests, setPurchaseRequests] = useState<any[]>([]);
  const [loadingPurchases, setLoadingPurchases] = useState(false);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [assigningAsset, setAssigningAsset] = useState<any>(null);
  const [assignmentUserId, setAssignmentUserId] = useState("");
  const [assignmentDate, setAssignmentDate] = useState(new Date().toISOString().slice(0, 10));
  const [assignmentHandoverDate, setAssignmentHandoverDate] = useState("");
  const [assignmentNotes, setAssignmentNotes] = useState("");
  const [historyAsset, setHistoryAsset] = useState<any>(null);
  const [savingAssignment, setSavingAssignment] = useState(false);
  const [purchaseForm, setPurchaseForm] = useState({
    asset_type: "Laptop",
    asset_detail: "",
    estimated_cost: "",
    vendor_details: "",
    justification: "",
    company_id: "",
    asset_id: "",
    quantity: 1,
    expected_delivery_date: "",
    quotation_url: ""
  });
  const [submittingPurchase, setSubmittingPurchase] = useState(false);
  const [isCustomPurchaseType, setIsCustomPurchaseType] = useState(false);
  const [ownerRemarksMap, setOwnerRemarksMap] = useState<Record<string, string>>({});
  const [sourceRequestId, setSourceRequestId] = useState<string | null>(null);

  const generateNextAssetId = useCallback((type: string) => {
    const typeClean = (type || "").toLowerCase().trim();
    let prefix = "AST";
    if (typeClean.startsWith("laptop")) {
      prefix = "LAP";
    } else if (typeClean.startsWith("mobile") || typeClean.includes("phone")) {
      prefix = "MOB";
    } else if (typeClean.startsWith("sim")) {
      prefix = "SIM";
    } else if (typeClean.startsWith("headset") || typeClean.startsWith("accessor")) {
      prefix = "ACC";
    } else if (typeClean.startsWith("id card") || typeClean.startsWith("lanyard")) {
      prefix = "IDC";
    } else if (typeClean.startsWith("office") || typeClean.startsWith("chair") || typeClean.startsWith("table") || typeClean.startsWith("furniture")) {
      prefix = "FUR";
    } else if (typeClean.startsWith("router") || typeClean.startsWith("network")) {
      prefix = "NET";
    } else if (typeClean.startsWith("printer") || typeClean.startsWith("scanner")) {
      prefix = "PRN";
    } else {
      const alphaOnly = typeClean.replace(/[^a-z0-9]/g, "");
      if (alphaOnly.length >= 2) {
        prefix = alphaOnly.substring(0, Math.min(alphaOnly.length, 3)).toUpperCase();
      } else {
        prefix = "AST";
      }
    }

    let maxNum = 0;
    const regex = new RegExp(`^${prefix}-(\\d+)$`, "i");
    
    // Check existing inventory
    inventory.forEach(item => {
      if (item.id) {
        const match = String(item.id).trim().match(regex);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxNum) {
            maxNum = num;
          }
        }
      }
    });

    // Check existing purchase requests (to prevent duplicates)
    purchaseRequests.forEach(req => {
      if (req.asset_id) {
        const match = String(req.asset_id).trim().match(regex);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxNum) {
            maxNum = num;
          }
        }
      }
    });

    const nextNum = maxNum + 1;
    const suffix = nextNum < 10 ? `0${nextNum}` : `${nextNum}`;
    return `${prefix}-${suffix}`;
  }, [inventory, purchaseRequests]);

  useEffect(() => {
    setEmailsList([""]);
    const typeClean = registerForm.assetType?.toLowerCase().trim();
    if (typeClean === "sim card" || typeClean === "sim") {
      setAssetFields({
        simOperator: "Jio",
        simNetwork: "5G",
        simMobile: "",
        simIccid: ""
      });
    } else if (typeClean === "headset / accessories") {
      setAssetFields({
        accType: "Wired",
        accName: "",
        accSerial: ""
      });
    } else if (typeClean === "printer / scanner") {
      setAssetFields({
        printerType: "Laser Printer",
        printerModel: "",
        printerSerial: ""
      });
    } else if (typeClean === "laptop") {
      setAssetFields({
        laptopModel: "",
        laptopSpecs: "",
        laptopSerial: ""
      });
    } else if (typeClean === "mobile phone") {
      setAssetFields({
        phoneModel: "",
        phoneImei1: "",
        phoneImei2: "",
        phoneSpecs: ""
      });
    } else if (typeClean === "id card / lanyard") {
      setAssetFields({
        idEmployee: "",
        idBarcode: ""
      });
    } else if (typeClean === "office chair / table") {
      setAssetFields({
        furnitureDesc: "",
        furnitureTag: ""
      });
    } else if (typeClean === "router / networking") {
      setAssetFields({
        routerModel: "",
        routerMac: "",
        routerSerial: ""
      });
    } else {
      setAssetFields({});
    }

    const isFromPurchaseRequest = registerForm.notes?.includes("Approved Purchase Request ID:");
    if (!isFromPurchaseRequest) {
      setRegisterForm(p => ({
        ...p,
        id: generateNextAssetId(p.assetType)
      }));
    }
  }, [registerForm.assetType, generateNextAssetId, registerForm.notes]);

  useEffect(() => {
    if (showPurchaseModal) {
      setPurchaseForm(p => ({
        ...p,
        asset_id: generateNextAssetId(p.asset_type)
      }));
    }
  }, [purchaseForm.asset_type, showPurchaseModal, generateNextAssetId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      // Fetch inventory
      const [invRes, compRes, employeeRes] = await Promise.all([
        fetch("/api/assets/inventory"),
        fetch("/api/companies"),
        fetch("/api/employees?all=1")
      ]);
      const [invData, compData, employeeData] = await Promise.all([
        invRes.json(),
        compRes.json(),
        employeeRes.json()
      ]);

      if (invRes.ok) setInventory(invData.data || []);
      if (compRes.ok) setCompanies(compData.data || []);
      if (employeeRes.ok) setEmployees((employeeData.data || []).filter((employee: any) => employee.status === "active"));
    } catch (error) {
      console.error("Error fetching inventory data:", error);
      triggerToast("Failed to load inventory data");
    } finally {
      setLoading(false);
    }
  };

  const handleAssignmentSave = async () => {
    if (!assigningAsset) return;
    if (!assignmentUserId) {
      triggerToast("Please select an employee");
      return;
    }
    try {
      setSavingAssignment(true);
      const response = await fetch("/api/assets/inventory", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assetId: assigningAsset.id,
          userId: assignmentUserId,
          currentAssignedUserId: assigningAsset.assignedToUserId || null,
          assignedDate: assignmentDate,
          handoverDate: assignmentHandoverDate || null,
          notes: assignmentNotes
        })
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || "Assignment failed");
      triggerToast(`Asset assigned to ${result.data.assignedToName}`);
      setAssigningAsset(null);
      setAssignmentUserId("");
      setAssignmentHandoverDate("");
      setAssignmentNotes("");
      await fetchData();
    } catch (error: any) {
      triggerToast(error.message || "Failed to assign asset");
    } finally {
      setSavingAssignment(false);
    }
  };

  const handleUnassignAsset = async (asset: any) => {
    if (!confirm(`Unassign this asset from ${asset.assignedToName || "employee"}?`)) return;
    try {
      const response = await fetch("/api/assets/inventory", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assetId: asset.id,
          userId: null,
          currentAssignedUserId: asset.assignedToUserId || null,
          handoverDate: new Date().toISOString().slice(0, 10),
          notes: "Returned to inventory"
        })
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || "Unassignment failed");
      triggerToast("Asset unassigned and returned to available stock");
      await fetchData();
    } catch (error: any) {
      triggerToast(error.message || "Failed to unassign asset");
    }
  };

  const fetchPurchaseRequests = async () => {
    try {
      setLoadingPurchases(true);
      const res = await fetch("/api/assets/purchase");
      const data = await res.json();
      if (data.success) {
        setPurchaseRequests(data.data || []);
      }
    } catch (error) {
      console.error("Error fetching purchase requests:", error);
    } finally {
      setLoadingPurchases(false);
    }
  };

  const handlePurchaseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!purchaseForm.asset_type || !purchaseForm.asset_detail || !purchaseForm.estimated_cost || !purchaseForm.vendor_details || !purchaseForm.asset_id) {
      triggerToast("Please fill all required fields");
      return;
    }
    try {
      setSubmittingPurchase(true);
      const res = await fetch("/api/assets/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          ...purchaseForm
        })
      });
      const result = await res.json();
      if (result.success) {
        if (sourceRequestId) {
          try {
            const dispatchDetails = `[New Purchase] Estimated Cost: ₹${purchaseForm.estimated_cost}. Vendor: ${purchaseForm.vendor_details}. Justification: ${purchaseForm.justification || "None"}`;
            await fetch("/api/assets/request", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                action: "update-status",
                requestId: Number(sourceRequestId),
                status: "Dispatched (New Purchase)",
                admin_remarks: dispatchDetails
              })
            });
          } catch (err) {
            console.error("Error updating source asset request status:", err);
          }
        }

        triggerToast("Purchase request submitted to Owner successfully!");
        setShowPurchaseModal(false);
        setSourceRequestId(null);
        setIsCustomPurchaseType(false);
        setPurchaseForm({
          asset_type: "Laptop",
          asset_detail: "",
          estimated_cost: "",
          vendor_details: "",
          justification: "",
          company_id: "",
          asset_id: "",
          quantity: 1,
          expected_delivery_date: "",
          quotation_url: ""
        });
        fetchPurchaseRequests();
      } else {
        triggerToast(result.error || "Failed to submit purchase request");
      }
    } catch (error) {
      console.error("Error submitting purchase request:", error);
      triggerToast("An error occurred");
    } finally {
      setSubmittingPurchase(false);
    }
  };

  const handleOwnerPurchaseAction = async (requestId: number, status: "Approved" | "Rejected") => {
    const owner_remarks = ownerRemarksMap[requestId] || "";
    if (status === "Rejected" && !owner_remarks.trim()) {
      triggerToast("Please enter remarks/reason for rejection");
      return;
    }
    try {
      const res = await fetch("/api/assets/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update-status",
          requestId,
          status,
          owner_remarks
        })
      });
      const result = await res.json();
      if (result.success) {
        triggerToast(`Purchase request ${status.toLowerCase()} successfully.`);
        setOwnerRemarksMap(prev => ({ ...prev, [requestId]: "" }));
        fetchPurchaseRequests();
      } else {
        triggerToast(result.error || "Failed to update purchase request");
      }
    } catch (error) {
      console.error("Error updating purchase request status:", error);
      triggerToast("An error occurred");
    }
  };

  useEffect(() => {
    fetchData();
    fetchPurchaseRequests();
    const shouldOpen = localStorage.getItem("open_register_asset_form");
    if (shouldOpen === "true") {
      setShowRegisterForm(true);
      localStorage.removeItem("open_register_asset_form");
    }

    const shouldOpenPurchase = localStorage.getItem("open_purchase_request_modal");
    if (shouldOpenPurchase === "true") {
      const type = localStorage.getItem("purchase_request_asset_type") || "Laptop";
      const detail = localStorage.getItem("purchase_request_asset_detail") || "";
      const justification = localStorage.getItem("purchase_request_justification") || "";
      const sourceId = localStorage.getItem("purchase_request_source_id") || "";

      setPurchaseForm({
        asset_type: type,
        asset_detail: detail,
        estimated_cost: "",
        vendor_details: "",
        justification: justification,
        company_id: "",
        asset_id: "",
        quantity: 1,
        expected_delivery_date: "",
        quotation_url: ""
      });
      setSourceRequestId(sourceId || null);

      setShowPurchaseModal(true);
      setActiveSubTab("purchases");

      localStorage.removeItem("open_purchase_request_modal");
      localStorage.removeItem("purchase_request_asset_type");
      localStorage.removeItem("purchase_request_asset_detail");
      localStorage.removeItem("purchase_request_justification");
      localStorage.removeItem("purchase_request_source_id");
    }
  }, []);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>, isEditMode: boolean = false) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      triggerToast("Please upload an image file");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      if (isEditMode) {
        setEditForm(prev => ({ ...prev, photoUrl: base64String }));
      } else {
        setRegisterForm(prev => ({ ...prev, photoUrl: base64String }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!registerForm.id.trim()) {
      triggerToast("Asset ID is required");
      return;
    }
    if (!registerForm.assetType) {
      triggerToast("Asset Type is required");
      return;
    }

    const typeClean = registerForm.assetType.toLowerCase().trim();
    let finalDetail = registerForm.assetDetail;
    let finalSerial = registerForm.serialNumber;
    let finalNotes = registerForm.notes;

    if (typeClean === "sim card" || typeClean === "sim") {
      const mobile = assetFields.simMobile || "";
      if (!mobile) {
        triggerToast("SIM Mobile Number is required");
        return;
      }
      finalDetail = `${assetFields.simOperator || "Jio"} - ${assetFields.simNetwork || "5G"} Network`;
      finalSerial = mobile;
      if (assetFields.simIccid) {
        finalNotes = `SIM Number (ICCID): ${assetFields.simIccid}${registerForm.notes ? `\n${registerForm.notes}` : ""}`;
      }
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

      let laptopInfo = "";
      if (assetFields.laptopOs) laptopInfo += `OS: ${assetFields.laptopOs}\n`;
      if (assetFields.laptopHostName) laptopInfo += `Host Name: ${assetFields.laptopHostName}\n`;
      if (assetFields.laptopCharger) laptopInfo += `Charger Included: ${assetFields.laptopCharger}\n`;
      if (assetFields.laptopBag) laptopInfo += `Accessories: ${assetFields.laptopBag}\n`;
      if (assetFields.laptopPassword) {
        laptopInfo += `Laptop Admin Passcode: ${assetFields.laptopPassword}\n`;
      }
      const filteredEmails = emailsList.map(e => e.trim()).filter(Boolean);
      if (filteredEmails.length > 0) {
        laptopInfo += `Logged-in Emails: ${filteredEmails.join(", ")}\n`;
      }
      if (laptopInfo) {
        finalNotes = `${laptopInfo}${registerForm.notes ? `\n${registerForm.notes}` : ""}`;
      }
    } else if (typeClean === "mobile phone") {
      const model = assetFields.phoneModel || "";
      const imei1 = assetFields.phoneImei1 || "";
      const imei2 = assetFields.phoneImei2 || "";
      const specs = assetFields.phoneSpecs || "";
      
      const simSlots = assetFields.phoneSimSlots || "None";
      const sim1No = assetFields.phoneSim1No || "";
      const sim2No = assetFields.phoneSim2No || "";

      if (!model || !imei1) {
        triggerToast("Phone Brand & Model and IMEI Number 1 are required");
        return;
      }
      finalDetail = `${model}${specs ? ` (${specs})` : ""}`;
      finalSerial = imei2 ? `IMEI 1: ${imei1}, IMEI 2: ${imei2}` : imei1;

      // Passcode, Logged-in Emails & SIMs
      const filteredEmails = emailsList.map(e => e.trim()).filter(Boolean);
      let mobileInfo = "";
      if (assetFields.phonePassword) {
        mobileInfo += `Phone Screen Lock Passcode: ${assetFields.phonePassword}\n`;
      }
      if (filteredEmails.length > 0) {
        mobileInfo += `Logged-in Emails: ${filteredEmails.join(", ")}\n`;
      }
      if (simSlots !== "None") {
        mobileInfo += `SIM Slots Used: ${simSlots}\n`;
        if (sim1No) {
          const wa1 = assetFields.phoneSim1Whatsapp || "No";
          const wa1Type = wa1 === "Yes" ? ` (${assetFields.phoneSim1WhatsappType || "Personal"})` : "";
          const op1 = assetFields.phoneSim1OperatorCustom || (assetFields.phoneSim1Operator !== "Other" ? assetFields.phoneSim1Operator : "") || "Jio";
          mobileInfo += `SIM 1 Mobile No: ${sim1No} [Company: ${op1}] [WhatsApp: ${wa1}${wa1Type}]\n`;
        }
        if (sim2No) {
          const wa2 = assetFields.phoneSim2Whatsapp || "No";
          const wa2Type = wa2 === "Yes" ? ` (${assetFields.phoneSim2WhatsappType || "Personal"})` : "";
          const op2 = assetFields.phoneSim2OperatorCustom || (assetFields.phoneSim2Operator !== "Other" ? assetFields.phoneSim2Operator : "") || "Airtel";
          mobileInfo += `SIM 2 Mobile No: ${sim2No} [Company: ${op2}] [WhatsApp: ${wa2}${wa2Type}]\n`;
        }
      } else {
        mobileInfo += `SIM Slots Used: None\n`;
      }

      if (mobileInfo) {
        finalNotes = `${mobileInfo}${registerForm.notes ? `\n${registerForm.notes}` : ""}`;
      }
      if (assetFields.phoneExternalWhatsapp === "Yes" && assetFields.phoneExternalWhatsappNo) {
        const extWaType = assetFields.phoneExternalWhatsappType || "Business";
        const extWaLabel = assetFields.phoneExternalWhatsappLabel ? ` (${assetFields.phoneExternalWhatsappLabel})` : "";
        const extWaLine = `External WhatsApp: ${assetFields.phoneExternalWhatsappNo} [Type: ${extWaType}]${extWaLabel}`;
        finalNotes = finalNotes ? `${finalNotes}\n${extWaLine}` : extWaLine;
      }
      if (assetFields.phoneSocialMedia === "Yes" && (assetFields.phoneSocialMediaUsername || assetFields.phoneSocialMediaApp)) {
        const app = assetFields.phoneSocialMediaAppCustom || (assetFields.phoneSocialMediaApp !== "Other" ? assetFields.phoneSocialMediaApp : "") || "Instagram";
        const user = assetFields.phoneSocialMediaUsername || "";
        const pass = assetFields.phoneSocialMediaPassword ? ` [Password: ${assetFields.phoneSocialMediaPassword}]` : "";
        const smLine = `Social Media App: ${app} (${user})${pass}`;
        finalNotes = finalNotes ? `${finalNotes}\n${smLine}` : smLine;
      }
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
      const serial = assetFields.routerSerial || "";
      if (!model || !mac) {
        triggerToast("Router Brand & Model and MAC Address are required");
        return;
      }
      finalDetail = model;
      finalSerial = `MAC: ${mac}`;
      if (serial) {
        finalNotes = `Serial Number: ${serial}${registerForm.notes ? `\n${registerForm.notes}` : ""}`;
      }
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

    try {
      setSubmittingRegister(true);

      const payload = {
        ...registerForm,
        assetDetail: finalDetail,
        serialNumber: finalSerial,
        notes: finalNotes,
        customFields: JSON.stringify({
          assetFields,
          emailsList
        })
      };

      const res = await fetch("/api/assets/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const result = await res.json();
      if (result.success) {
        triggerToast("Asset registered successfully into inventory!");
        setShowRegisterForm(false);
        setIsCustomRegisterType(false);

        // Check if this was registered from an approved purchase request
        const requestMatch = registerForm.notes?.match(/Approved Purchase Request ID: (\d+)/);
        if (requestMatch) {
          const purchaseReqId = parseInt(requestMatch[1], 10);
          try {
            await fetch("/api/assets/purchase", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                action: "update-status",
                requestId: purchaseReqId,
                status: "Registered"
              })
            });
            fetchPurchaseRequests();
          } catch (e) {
            console.error("Error updating purchase status:", e);
          }
        }
        setRegisterForm({
          id: "",
          oldAssetId: "",
          assetType: "Laptop",
          assetDetail: "",
          serialNumber: "",
          purchaseDate: "",
          purchaseValue: "",
          condition: "Good",
          companyId: "",
          notes: "",
          photoUrl: ""
        });
        setAssetFields({});
        setEmailsList([""]);
        fetchData();
      } else {
        triggerToast(result.error || "Failed to register asset");
      }
    } catch (error) {
      console.error(error);
      triggerToast("Error registering asset");
    } finally {
      setSubmittingRegister(false);
    }
  };

  const handleStartEdit = (asset: any) => {
    let fields: Record<string, string> = {};
    let emails: string[] = [""];
    
    if (asset.customFields) {
      try {
        const parsed = JSON.parse(asset.customFields);
        fields = parsed.assetFields || {};
        emails = parsed.emailsList || [""];
      } catch (e) {
        console.error("Error parsing customFields", e);
      }
    } else {
      // Fallback parsing for legacy assets
      const typeClean = asset.assetType?.toLowerCase().trim();
      if (typeClean === "sim card" || typeClean === "sim") {
        fields = {
          simMobile: asset.serialNumber || "",
          simOperator: asset.assetDetail?.split(" - ")?.[0] || "Jio",
          simNetwork: asset.assetDetail?.split(" - ")?.[1]?.replace(" Network", "") || "5G",
          simIccid: asset.notes?.match(/SIM Number \(ICCID\): (.*)/)?.[1] || ""
        };
      } else if (typeClean === "laptop") {
        const detail = asset.assetDetail || "";
        const openParen = detail.indexOf("(");
        const closeParen = detail.indexOf(")");
        fields = {
          laptopModel: openParen > -1 ? detail.substring(0, openParen).trim() : detail,
          laptopSpecs: openParen > -1 && closeParen > openParen ? detail.substring(openParen + 1, closeParen).trim() : "",
          laptopSerial: asset.serialNumber || ""
        };
        const emailsMatch = asset.notes?.match(/Logged-in Emails: ([^\n]*)/);
        if (emailsMatch) {
          emails = emailsMatch[1].split(", ").map((e: string) => e.trim());
        }
      } else if (typeClean === "mobile phone") {
        const detail = asset.assetDetail || "";
        const openParen = detail.indexOf("(");
        const closeParen = detail.indexOf(")");
        const serialStr = asset.serialNumber || "";
        const imei1 = serialStr.match(/IMEI 1: ([^,]*)/)?.[1] || serialStr;
        const imei2 = serialStr.match(/IMEI 2: (.*)/)?.[1] || "";
        
        const simSlots = asset.notes?.match(/SIM Slots Used: ([^\n]*)/)?.[1] || "None";
        const sim1No = asset.notes?.match(/SIM 1 Mobile No: ([^ ]*)/)?.[1] || "";
        const sim1Whatsapp = asset.notes?.match(/SIM 1 Mobile No:.*WhatsApp: (Yes|No)/)?.[1] || "No";
        const sim1WhatsappType = asset.notes?.match(/SIM 1 Mobile No:.*WhatsApp: Yes \(([^)]*)\)/)?.[1] || "Personal";
        const sim2No = asset.notes?.match(/SIM 2 Mobile No: ([^ ]*)/)?.[1] || "";
        const sim2Whatsapp = asset.notes?.match(/SIM 2 Mobile No:.*WhatsApp: (Yes|No)/)?.[1] || "No";
        const sim2WhatsappType = asset.notes?.match(/SIM 2 Mobile No:.*WhatsApp: Yes \(([^)]*)\)/)?.[1] || "Personal";
        
        fields = {
          phoneModel: openParen > -1 ? detail.substring(0, openParen).trim() : detail,
          phoneSpecs: openParen > -1 && closeParen > openParen ? detail.substring(openParen + 1, closeParen).trim() : "",
          phoneImei1: imei1,
          phoneImei2: imei2,
          phoneSimSlots: simSlots,
          phoneSim1No: sim1No,
          phoneSim1Whatsapp: sim1Whatsapp,
          phoneSim1WhatsappType: sim1WhatsappType,
          phoneSim2No: sim2No,
          phoneSim2Whatsapp: sim2Whatsapp,
          phoneSim2WhatsappType: sim2WhatsappType
        };
        const emailsMatch = asset.notes?.match(/Logged-in Emails: ([^\n]*)/);
        if (emailsMatch) {
          emails = emailsMatch[1].split(", ").map((e: string) => e.trim());
        }
      } else if (typeClean === "headset / accessories") {
        const detail = asset.assetDetail || "";
        const openParen = detail.indexOf("(");
        const closeParen = detail.indexOf(")");
        fields = {
          accName: openParen > -1 ? detail.substring(0, openParen).trim() : detail,
          accType: openParen > -1 && closeParen > openParen ? detail.substring(openParen + 1, closeParen).trim() : "Wired",
          accSerial: asset.serialNumber || ""
        };
      } else if (typeClean === "id card / lanyard") {
        fields = {
          idEmployee: asset.assetDetail?.replace("ID Card for: ", "") || "",
          idBarcode: asset.serialNumber || ""
        };
      } else if (typeClean === "office chair / table") {
        fields = {
          furnitureDesc: asset.assetDetail || "",
          furnitureTag: asset.serialNumber || ""
        };
      } else if (typeClean === "router / networking") {
        fields = {
          routerModel: asset.assetDetail || "",
          routerMac: asset.serialNumber?.replace("MAC: ", "") || "",
          routerSerial: asset.notes?.match(/Serial Number: (.*)/)?.[1] || ""
        };
      } else if (typeClean === "printer / scanner") {
        const detail = asset.assetDetail || "";
        const openParen = detail.indexOf("(");
        const closeParen = detail.indexOf(")");
        fields = {
          printerModel: openParen > -1 ? detail.substring(0, openParen).trim() : detail,
          printerType: openParen > -1 && closeParen > openParen ? detail.substring(openParen + 1, closeParen).trim() : "Laser Printer",
          printerSerial: asset.serialNumber || ""
        };
      }
    }

    setEditingAsset(asset);
    setEditForm({
      oldAssetId: asset.oldAssetId || "",
      assetType: asset.assetType || "Laptop",
      assetDetail: asset.assetDetail || "",
      serialNumber: asset.serialNumber || "",
      purchaseDate: asset.purchaseDate || "",
      purchaseValue: asset.purchaseValue || "",
      condition: asset.condition || "Good",
      status: asset.status || "Available",
      companyId: asset.companyId || "",
      notes: asset.notes || "",
      photoUrl: asset.photoUrl || ""
    });
    setEditAssetFields(fields);
    setEditEmailsList(emails);
    setShowEditModal(true);
  };

  const handleCancelEdit = () => {
    setShowEditModal(false);
    setEditingAsset(null);
    setEditAssetFields({});
    setEditEmailsList([""]);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAsset) return;

    const typeClean = editForm.assetType.toLowerCase().trim();
    let finalDetail = editForm.assetDetail;
    let finalSerial = editForm.serialNumber;
    let finalNotes = editForm.notes;

    if (typeClean === "sim card" || typeClean === "sim") {
      const mobile = editAssetFields.simMobile || "";
      if (!mobile) {
        triggerToast("SIM Mobile Number is required");
        return;
      }
      finalDetail = `${editAssetFields.simOperator || "Jio"} - ${editAssetFields.simNetwork || "5G"} Network`;
      finalSerial = mobile;
      if (editAssetFields.simIccid) {
        finalNotes = `SIM Number (ICCID): ${editAssetFields.simIccid}${editForm.notes ? `\n${editForm.notes}` : ""}`;
      }
    } else if (typeClean === "laptop") {
      const model = editAssetFields.laptopModel || "";
      const specs = editAssetFields.laptopSpecs || "";
      const serial = editAssetFields.laptopSerial || "";
      if (!model || !specs) {
        triggerToast("Laptop Brand & Model and Specifications are required");
        return;
      }
      finalDetail = `${model} (${specs})`;
      finalSerial = serial;

      let laptopInfo = "";
      if (editAssetFields.laptopOs) laptopInfo += `OS: ${editAssetFields.laptopOs}\n`;
      if (editAssetFields.laptopHostName) laptopInfo += `Host Name: ${editAssetFields.laptopHostName}\n`;
      if (editAssetFields.laptopCharger) laptopInfo += `Charger Included: ${editAssetFields.laptopCharger}\n`;
      if (editAssetFields.laptopBag) laptopInfo += `Accessories: ${editAssetFields.laptopBag}\n`;
      if (editAssetFields.laptopPassword) {
        laptopInfo += `Laptop Admin Passcode: ${editAssetFields.laptopPassword}\n`;
      }
      const filteredEmails = editEmailsList.map(e => e.trim()).filter(Boolean);
      if (filteredEmails.length > 0) {
        laptopInfo += `Logged-in Emails: ${filteredEmails.join(", ")}\n`;
      }
      if (laptopInfo) {
        finalNotes = `${laptopInfo}${editForm.notes ? `\n${editForm.notes}` : ""}`;
      }
    } else if (typeClean === "mobile phone") {
      const model = editAssetFields.phoneModel || "";
      const imei1 = editAssetFields.phoneImei1 || "";
      const imei2 = editAssetFields.phoneImei2 || "";
      const specs = editAssetFields.phoneSpecs || "";
      
      const simSlots = editAssetFields.phoneSimSlots || "None";
      const sim1No = editAssetFields.phoneSim1No || "";
      const sim2No = editAssetFields.phoneSim2No || "";

      if (!model || !imei1) {
        triggerToast("Phone Brand & Model and IMEI Number 1 are required");
        return;
      }
      finalDetail = `${model}${specs ? ` (${specs})` : ""}`;
      finalSerial = imei2 ? `IMEI 1: ${imei1}, IMEI 2: ${imei2}` : imei1;

      // Passcode, Logged-in Emails & SIMs
      const filteredEmails = editEmailsList.map(e => e.trim()).filter(Boolean);
      let mobileInfo = "";
      if (editAssetFields.phonePassword) {
        mobileInfo += `Phone Screen Lock Passcode: ${editAssetFields.phonePassword}\n`;
      }
      if (filteredEmails.length > 0) {
        mobileInfo += `Logged-in Emails: ${filteredEmails.join(", ")}\n`;
      }
      if (simSlots !== "None") {
        mobileInfo += `SIM Slots Used: ${simSlots}\n`;
        if (sim1No) {
          const wa1 = editAssetFields.phoneSim1Whatsapp || "No";
          const wa1Type = wa1 === "Yes" ? ` (${editAssetFields.phoneSim1WhatsappType || "Personal"})` : "";
          const op1 = editAssetFields.phoneSim1OperatorCustom || (editAssetFields.phoneSim1Operator !== "Other" ? editAssetFields.phoneSim1Operator : "") || "Jio";
          mobileInfo += `SIM 1 Mobile No: ${sim1No} [Company: ${op1}] [WhatsApp: ${wa1}${wa1Type}]\n`;
        }
        if (sim2No) {
          const wa2 = editAssetFields.phoneSim2Whatsapp || "No";
          const wa2Type = wa2 === "Yes" ? ` (${editAssetFields.phoneSim2WhatsappType || "Personal"})` : "";
          const op2 = editAssetFields.phoneSim2OperatorCustom || (editAssetFields.phoneSim2Operator !== "Other" ? editAssetFields.phoneSim2Operator : "") || "Airtel";
          mobileInfo += `SIM 2 Mobile No: ${sim2No} [Company: ${op2}] [WhatsApp: ${wa2}${wa2Type}]\n`;
        }
      } else {
        mobileInfo += `SIM Slots Used: None\n`;
      }

      if (mobileInfo) {
        finalNotes = `${mobileInfo}${editForm.notes ? `\n${editForm.notes}` : ""}`;
      }
      if (editAssetFields.phoneExternalWhatsapp === "Yes" && editAssetFields.phoneExternalWhatsappNo) {
        const extWaType = editAssetFields.phoneExternalWhatsappType || "Business";
        const extWaLabel = editAssetFields.phoneExternalWhatsappLabel ? ` (${editAssetFields.phoneExternalWhatsappLabel})` : "";
        const extWaLine = `External WhatsApp: ${editAssetFields.phoneExternalWhatsappNo} [Type: ${extWaType}]${extWaLabel}`;
        finalNotes = finalNotes ? `${finalNotes}\n${extWaLine}` : extWaLine;
      }
    } else if (typeClean === "headset / accessories") {
      const name = editAssetFields.accName || "";
      const type = editAssetFields.accType || "Wired";
      const serial = editAssetFields.accSerial || "";
      if (!name) {
        triggerToast("Accessory Name/Brand is required");
        return;
      }
      finalDetail = `${name} (${type})`;
      finalSerial = serial;
    } else if (typeClean === "id card / lanyard") {
      const emp = editAssetFields.idEmployee || "";
      const barcode = editAssetFields.idBarcode || "";
      if (!emp || !barcode) {
        triggerToast("Employee Name/ID and Card ID Number are required");
        return;
      }
      finalDetail = `ID Card for: ${emp}`;
      finalSerial = barcode;
    } else if (typeClean === "office chair / table") {
      const desc = editAssetFields.furnitureDesc || "";
      const tag = editAssetFields.furnitureTag || "";
      if (!desc) {
        triggerToast("Furniture Description is required");
        return;
      }
      finalDetail = desc;
      finalSerial = tag;
    } else if (typeClean === "router / networking") {
      const model = editAssetFields.routerModel || "";
      const mac = editAssetFields.routerMac || "";
      const serial = editAssetFields.routerSerial || "";
      if (!model || !mac) {
        triggerToast("Router Brand & Model and MAC Address are required");
        return;
      }
      finalDetail = model;
      finalSerial = `MAC: ${mac}`;
      if (serial) {
        finalNotes = `Serial Number: ${serial}${editForm.notes ? `\n${editForm.notes}` : ""}`;
      }
    } else if (typeClean === "printer / scanner") {
      const model = editAssetFields.printerModel || "";
      const type = editAssetFields.printerType || "Laser Printer";
      const serial = editAssetFields.printerSerial || "";
      if (!model || !serial) {
        triggerToast("Printer Brand & Model and Serial Number are required");
        return;
      }
      finalDetail = `${model} (${type})`;
      finalSerial = serial;
    }

    try {
      setUpdating(true);
      const res = await fetch("/api/assets/inventory", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingAsset.id,
          ...editForm,
          assetDetail: finalDetail,
          serialNumber: finalSerial,
          notes: finalNotes,
          customFields: JSON.stringify({
            assetFields: editAssetFields,
            emailsList: editEmailsList
          })
        })
      });

      const result = await res.json();
      if (result.success) {
        triggerToast("Inventory asset updated successfully");
        setShowEditModal(false);
        setEditingAsset(null);
        fetchData();
      } else {
        triggerToast(result.error || "Failed to update asset");
      }
    } catch (error) {
      console.error(error);
      triggerToast("Error updating asset");
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteConfirmed = async () => {
    if (!deleteConfirm.assetId) return;
    try {
      setDeleting(true);
      const res = await fetch(`/api/assets/inventory?id=${deleteConfirm.assetId}`, {
        method: "DELETE"
      });
      const result = await res.json();
      if (result.success) {
        triggerToast("Asset deleted from inventory");
        setInventory(prev => prev.filter(a => a.id !== deleteConfirm.assetId));
      } else {
        triggerToast(result.error || "Failed to delete asset");
      }
    } catch (err) {
      console.error(err);
      triggerToast("Error deleting asset");
    } finally {
      setDeleting(false);
      setDeleteConfirm({ show: false });
    }
  };

  // Filter inventory
  const filteredInventory = inventory.filter((asset) => {
    const query = searchQuery.trim().toLowerCase();
    const companyName = companies.find((company) => String(company.id) === String(asset.companyId))?.name || "General Stock";
    const historyText = (asset.assignmentHistory || []).map((entry: any) =>
      [entry.action, entry.fromUserName, entry.toUserName, entry.performedBy, entry.notes, entry.assignedDate, entry.handoverDate].join(" ")
    ).join(" ");
    const searchable = [
      asset.id, asset.oldAssetId, asset.assetDetail, asset.assetType, asset.serialNumber,
      asset.notes, asset.status, asset.condition, companyName, asset.assignedToName,
      asset.assignedToUserId, asset.assignedBy, asset.registeredBy, asset.customFields,
      asset.purchaseDate, asset.purchaseValue, asset.assignedAt, asset.handoverDate, historyText
    ].join(" ").toLowerCase();
    const matchesSearch = !query || searchable.includes(query);

    // 2. Company Filter
    const matchesCompany = selectedCompany === "all" || String(asset.companyId) === String(selectedCompany);

    // 3. Condition Filter
    const matchesCondition = selectedCondition === "all" || asset.condition === selectedCondition;

    // 4. Asset Type Filter
    const matchesType = selectedType === "all" || asset.assetType === selectedType;
    const matchesStatus = selectedStatus === "all" || asset.status === selectedStatus;
    const matchesAssignee = selectedAssignee === "all"
      || (selectedAssignee === "unassigned" ? !asset.assignedToUserId : String(asset.assignedToUserId) === selectedAssignee);
    const assignedDay = asset.assignedAt ? String(asset.assignedAt).slice(0, 10) : "";
    const handoverDay = asset.handoverDate ? String(asset.handoverDate).slice(0, 10) : "";
    const matchesAssignedDate = (!assignedFrom || (assignedDay && assignedDay >= assignedFrom))
      && (!assignedTo || (assignedDay && assignedDay <= assignedTo));
    const matchesHandoverDate = (!handoverFrom || (handoverDay && handoverDay >= handoverFrom))
      && (!handoverTo || (handoverDay && handoverDay <= handoverTo));

    return matchesSearch && matchesCompany && matchesCondition && matchesType
      && matchesStatus && matchesAssignee && matchesAssignedDate && matchesHandoverDate;
  });

  const exportInventoryToCsv = () => {
    if (filteredInventory.length === 0) {
      triggerToast("No inventory records available to export");
      return;
    }

    const parsedCustomFields = filteredInventory.map((asset) => {
      try {
        const parsed = typeof asset.customFields === "string"
          ? JSON.parse(asset.customFields)
          : (asset.customFields || {});
        return {
          assetFields: parsed?.assetFields && typeof parsed.assetFields === "object"
            ? parsed.assetFields
            : {},
          emailsList: Array.isArray(parsed?.emailsList) ? parsed.emailsList : [],
        };
      } catch {
        return { assetFields: {}, emailsList: [] };
      }
    });

    const fieldSequence = [
      // Laptop
      "laptopModel", "laptopSpecs", "laptopSerial", "laptopOs", "laptopOsCustom",
      "laptopHostName", "laptopCharger", "laptopBag", "laptopPassword",
      // Mobile phone
      "phoneModel", "phoneColor", "phoneImei1", "phoneImei2", "phoneSpecs",
      "phonePassword", "phoneCharger", "phoneSimSlots",
      "phoneSim1No", "phoneSim1Operator", "phoneSim1OperatorCustom",
      "phoneSim1Whatsapp", "phoneSim1WhatsappType",
      "phoneSim2No", "phoneSim2Operator", "phoneSim2OperatorCustom",
      "phoneSim2Whatsapp", "phoneSim2WhatsappType",
      "phoneExternalWhatsapp", "phoneExternalWhatsappNo",
      "phoneExternalWhatsappType", "phoneExternalWhatsappLabel",
      "phoneSocialMedia", "phoneSocialMediaApp", "phoneSocialMediaAppCustom",
      "phoneSocialMediaUsername", "phoneSocialMediaPassword",
      // Standalone SIM
      "simMobile", "simOperator", "simOperatorCustom", "simNetwork",
      "simNetworkCustom", "simIccid", "simPlanType", "simPlanTypeCustom",
      "simPuk", "simKycName",
      // Router / networking
      "routerModel", "routerMac", "routerSerial", "routerIp",
      "routerWifiSsid", "routerAdminPass", "routerIsp",
      // Printer / scanner
      "printerType", "printerTypeCustom", "printerModel", "printerSerial",
      "printerIp", "printerCartridge",
      // Accessories, ID card and furniture
      "accType", "accName", "accSerial",
      "idEmployee", "idBarcode",
      "furnitureDesc", "furnitureTag", "furnitureLocation",
    ];
    const sequenceIndex = new Map(fieldSequence.map((field, index) => [field, index]));
    const customFieldKeys = Array.from(new Set(
      parsedCustomFields.flatMap((entry) => Object.keys(entry.assetFields))
    )).sort((a, b) => {
      const aIndex = sequenceIndex.get(a) ?? Number.MAX_SAFE_INTEGER;
      const bIndex = sequenceIndex.get(b) ?? Number.MAX_SAFE_INTEGER;
      return aIndex === bIndex ? a.localeCompare(b) : aIndex - bIndex;
    });
    const maximumEmails = Math.max(
      0,
      ...parsedCustomFields.map((entry) => entry.emailsList.length)
    );

    const identityColumns: Array<{ header: string; value: (asset: any) => unknown }> = [
      { header: "Asset ID", value: (asset) => asset.id },
      { header: "Old Asset ID", value: (asset) => asset.oldAssetId },
      { header: "Asset Type", value: (asset) => asset.assetType },
      { header: "Asset Detail", value: (asset) => asset.assetDetail },
      { header: "Serial Number", value: (asset) => asset.serialNumber },
      { header: "Company ID", value: (asset) => asset.companyId },
      {
        header: "Company Name",
        value: (asset) => companies.find(
          (company) => String(company.id) === String(asset.companyId)
        )?.name || "General Stock",
      },
      { header: "Condition", value: (asset) => asset.condition },
      { header: "Inventory Status", value: (asset) => asset.status },
      { header: "Assigned User ID", value: (asset) => asset.assignedToUserId },
      { header: "Assigned To", value: (asset) => asset.assignedToName },
      { header: "Assigned Date", value: (asset) => asset.assignedAt },
      { header: "Handover Date", value: (asset) => asset.handoverDate },
      { header: "Assigned By", value: (asset) => asset.assignedBy },
      { header: "Purchase Date", value: (asset) => asset.purchaseDate },
      { header: "Purchase Value", value: (asset) => asset.purchaseValue },
    ];

    const compatibilityColumns: Array<{ header: string; value: (asset: any) => unknown }> = [
      { header: "Phone / Laptop Password", value: (asset) => asset.phonePassword },
      { header: "SIM Company", value: (asset) => asset.simCompany },
      { header: "SIM 1 Number", value: (asset) => asset.sim1Number },
      { header: "SIM 2 Number", value: (asset) => asset.sim2Number },
      { header: "External WhatsApp Number", value: (asset) => asset.externalWhatsappNo },
      { header: "Laptop OS", value: (asset) => asset.laptopOs },
      { header: "Laptop Host Name", value: (asset) => asset.laptopHostName },
      { header: "SIM Plan Type", value: (asset) => asset.simPlanType },
      { header: "Router WiFi SSID", value: (asset) => asset.routerWifiSsid },
      { header: "Printer Cartridge", value: (asset) => asset.printerCartridge },
      { header: "Furniture Location", value: (asset) => asset.furnitureLocation },
      { header: "Social Media App", value: (asset) => asset.socialMediaApp },
      { header: "Social Media Username", value: (asset) => asset.socialMediaUsername },
      { header: "Social Media Password", value: (asset) => asset.socialMediaPassword },
      { header: "Phone Charger", value: (asset) => asset.phoneCharger },
      { header: "Phone Color", value: (asset) => asset.phoneColor },
      { header: "Laptop Charger", value: (asset) => asset.laptopCharger },
      { header: "Laptop Bag / Mouse", value: (asset) => asset.laptopBag },
      { header: "SIM PUK / PIN", value: (asset) => asset.simPuk },
      { header: "SIM KYC Name", value: (asset) => asset.simKycName },
      { header: "Router IP", value: (asset) => asset.routerIp },
      { header: "Router Admin Password", value: (asset) => asset.routerAdminPass },
      { header: "Router ISP", value: (asset) => asset.routerIsp },
      { header: "Printer IP", value: (asset) => asset.printerIp },
    ];

    const closingColumns: Array<{ header: string; value: (asset: any) => unknown }> = [
      { header: "Notes", value: (asset) => asset.notes },
      {
        header: "Photo Available",
        value: (asset) => asset.photoUrl ? "Yes" : "No",
      },
      {
        header: "Photo Link / Reference",
        value: (asset) => {
          const photo = String(asset.photoUrl || "");
          if (!photo) return "";
          if (photo.startsWith("data:image/")) return "Embedded image - view in Asset Management";
          return photo;
        },
      },
      { header: "Registered By", value: (asset) => asset.registeredBy },
      { header: "Created At", value: (asset) => asset.createdAt },
      { header: "Updated At", value: (asset) => asset.updatedAt },
      {
        header: "Assignment History",
        value: (asset) => (asset.assignmentHistory || []).map((entry: any) =>
          `${entry.action}: ${entry.fromUserName || "Stock"} -> ${entry.toUserName || "Stock"}; assigned ${entry.assignedDate || "-"}; handover ${entry.handoverDate || "-"}; by ${entry.performedBy || "-"}`
        ).join(" | "),
      },
    ];

    const humanizeFieldName = (key: string) => key
      .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
      .replace(/[_-]+/g, " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase());

    const csvCell = (value: unknown) => {
      let text = value === null || value === undefined ? "" : String(value);
      // Prevent spreadsheet applications from interpreting user-entered text as a formula.
      if (/^[=+\-@]/.test(text)) text = `'${text}`;
      return `"${text.replace(/"/g, '""')}"`;
    };

    const headers = [
      ...identityColumns.map((column) => column.header),
      ...customFieldKeys.map((key) => `Form - ${humanizeFieldName(key)}`),
      ...Array.from({ length: maximumEmails }, (_, index) => `Logged-in Email ${index + 1}`),
      ...compatibilityColumns.map((column) => `Saved - ${column.header}`),
      ...closingColumns.map((column) => column.header),
    ];

    const rows = filteredInventory.map((asset, index) => {
      const custom = parsedCustomFields[index];
      return [
        ...identityColumns.map((column) => column.value(asset)),
        ...customFieldKeys.map((key) => custom.assetFields[key] ?? ""),
        ...Array.from({ length: maximumEmails }, (_, emailIndex) => custom.emailsList[emailIndex] ?? ""),
        ...compatibilityColumns.map((column) => column.value(asset)),
        ...closingColumns.map((column) => column.value(asset)),
      ];
    });

    const csv = [
      headers.map(csvCell).join(","),
      ...rows.map((row) => row.map(csvCell).join(",")),
    ].join("\r\n");
    const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Asset_Inventory_Full_Details_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    triggerToast(`${filteredInventory.length} asset record(s) exported with separate detail columns`);
  };

  // Calculate quick stats
  const totalCount = inventory.length;
  const availableCount = inventory.filter(a => a.status === "Available").length;
  const newCount = inventory.filter(a => a.condition === "New").length;
  const inUseCount = inventory.filter(a => a.status === "In Use").length;

  const typeClean = registerForm.assetType?.toLowerCase().trim();

  return (
    <div className="space-y-6 animate-fade-in text-[#1C1C1A]">

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#E8E4DF] pb-5">
        <div>
          <span className="text-[9px] uppercase tracking-widest text-indigo-655 font-bold flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-[#C9A84C]" /> Unallocated Stock Room
          </span>
          <h2 className="text-xl font-light tracking-wide font-serif" style={{ fontFamily: "'Playfair Display', serif" }}>
            Inventory Management
          </h2>

        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportInventoryToCsv}
            disabled={loading || filteredInventory.length === 0}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-[10px] font-semibold tracking-wider uppercase transition-all flex items-center gap-1.5 shadow-sm"
            title="Export every filled asset field as a separate CSV column"
          >
            <Download className="w-3.5 h-3.5" /> Export Full CSV
          </button>
          <button
            onClick={fetchData}
            className="px-3 py-1.5 bg-[#FCFBF9] border border-[#E8E4DF] hover:bg-[#F5F0EA] text-[#5D5B57] hover:text-[#1C1C1A] rounded-lg text-[10px] font-semibold tracking-wider uppercase transition-all flex items-center gap-1.5"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} /> Refresh
          </button>
          {(isAdminDept || isOwner) && (
            <button
              onClick={() => setShowPurchaseModal(true)}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[10px] font-semibold tracking-wider uppercase transition-all flex items-center gap-1.5 shadow-sm font-sans"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              New Purchase Request
            </button>
          )}
          <button
            onClick={() => setShowRegisterForm(!showRegisterForm)}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-semibold tracking-wider uppercase transition-all flex items-center gap-1.5 shadow-sm font-sans"
          >
            <PackagePlus className="w-3.5 h-3.5" />
            {showRegisterForm ? "Hide Register Form" : "Register Asset"}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-[#E8E4DF] pb-px mb-6">
        <button
          onClick={() => setActiveSubTab("stock")}
          className={`pb-2.5 px-4 text-xs font-black tracking-wider uppercase border-b-2 transition-all ${
            activeSubTab === "stock"
              ? "border-[#C9A84C] text-[#1C1C1A]"
              : "border-transparent text-[#9C9890] hover:text-[#5D5B57]"
          }`}
        >
          Inventory Stock
        </button>
        <button
          onClick={() => setActiveSubTab("purchases")}
          className={`pb-2.5 px-4 text-xs font-black tracking-wider uppercase border-b-2 transition-all flex items-center gap-1.5 ${
            activeSubTab === "purchases"
              ? "border-[#C9A84C] text-[#1C1C1A]"
              : "border-transparent text-[#9C9890] hover:text-[#5D5B57]"
          }`}
        >
          Purchase Requests
          {purchaseRequests.filter(r => r.status === "Pending Owner Approval").length > 0 && (
            <span className="bg-amber-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full leading-none">
              {purchaseRequests.filter(r => r.status === "Pending Owner Approval").length}
            </span>
          )}
        </button>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#FCFBF9] border border-[#E8E4DF] p-4 rounded-xl flex items-center gap-3">
          <div className="p-3 bg-indigo-50 rounded-lg text-indigo-600">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-[#9C9890] font-semibold uppercase tracking-wider">Total Spare</div>
            <div className="text-xl font-bold font-serif">{totalCount}</div>
          </div>
        </div>
        <div className="bg-[#FCFBF9] border border-[#E8E4DF] p-4 rounded-xl flex items-center gap-3">
          <div className="p-3 bg-emerald-50 rounded-lg text-emerald-600">
            <CheckCircle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-[#9C9890] font-semibold uppercase tracking-wider">Available</div>
            <div className="text-xl font-bold font-serif">{availableCount}</div>
          </div>
        </div>
        <div className="bg-[#FCFBF9] border border-[#E8E4DF] p-4 rounded-xl flex items-center gap-3">
          <div className="p-3 bg-sky-50 rounded-lg text-sky-600">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-[#9C9890] font-semibold uppercase tracking-wider">Brand New</div>
            <div className="text-xl font-bold font-serif">{newCount}</div>
          </div>
        </div>
        <div className="bg-[#FCFBF9] border border-[#E8E4DF] p-4 rounded-xl flex items-center gap-3">
          <div className="p-3 bg-amber-50 rounded-lg text-amber-600">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-[#9C9890] font-semibold uppercase tracking-wider">In Use / Assigned</div>
            <div className="text-xl font-bold font-serif">{inUseCount}</div>
          </div>
        </div>
      </div>

      {/* Register Asset Form (Collapsible card) */}
      {showRegisterForm && (
        <div className="bg-white border border-[#E8E4DF] rounded-xl p-5 shadow-sm animate-slide-down">
          <div className="flex justify-between items-center border-b border-[#E8E4DF] pb-3 mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                <PackagePlus className="w-4 h-4 text-indigo-600" /> Register Asset
              </h3>
            </div>
            <button onClick={() => setShowRegisterForm(false)} className="text-slate-400 hover:text-slate-655 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
          <form onSubmit={handleRegisterSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div>
                <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Asset ID * (Auto Generated)</label>
                <input
                  type="text"
                  required
                  readOnly
                  placeholder="Generating ID..."
                  value={registerForm.id}
                  className="w-full bg-slate-50 border border-[#E8E4DF] rounded-lg px-3 py-2 text-xs text-slate-500 font-mono font-semibold focus:outline-none transition-all cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Old Asset ID / Previous ID</label>
                <input
                  type="text"
                  placeholder="e.g. OLD-LAP-01 / PREV-102"
                  value={registerForm.oldAssetId}
                  onChange={(e) => setRegisterForm(p => ({ ...p, oldAssetId: e.target.value }))}
                  className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] placeholder-[#9C9890] font-mono font-semibold focus:outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Asset Type *</label>
                {!isCustomRegisterType ? (
                  <select
                    required
                    value={registerForm.assetType}
                    onChange={(e) => {
                      if (e.target.value === "__ADD_NEW__") {
                        setIsCustomRegisterType(true);
                        setRegisterForm(p => ({ ...p, assetType: "" }));
                      } else {
                        setRegisterForm(p => ({ ...p, assetType: e.target.value }));
                      }
                    }}
                    className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-semibold"
                  >
                    {dynamicAssetTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                    <option value="__ADD_NEW__">+ Add New Asset Type</option>
                  </select>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      required
                      placeholder="Enter custom type..."
                      value={registerForm.assetType}
                      onChange={(e) => setRegisterForm(p => ({ ...p, assetType: e.target.value }))}
                      className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-semibold"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setIsCustomRegisterType(false);
                        setRegisterForm(p => ({ ...p, assetType: "Laptop" }));
                      }}
                      className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-[#5D5B57] text-[10px] font-bold rounded-lg transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Condition</label>
                <select
                  value={registerForm.condition}
                  onChange={(e) => setRegisterForm(p => ({ ...p, condition: e.target.value }))}
                  className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-semibold"
                >
                  <option>New</option>
                  <option>Good</option>
                  <option>Fair</option>
                  <option>Needs Repair</option>
                </select>
              </div>
              <div>
                <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Company Belonging</label>
                <select
                  value={registerForm.companyId}
                  onChange={(e) => setRegisterForm(p => ({ ...p, companyId: e.target.value }))}
                  className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-semibold"
                >
                  <option value="">-- General Stock --</option>
                  {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>

            {typeClean === "sim card" || typeClean === "sim" ? (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">SIM Mobile Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 9876543210"
                    value={assetFields.simMobile || ""}
                    onChange={(e) => setAssetFields(p => ({ ...p, simMobile: e.target.value }))}
                    className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Telecom Operator *</label>
                  <select
                    value={assetFields.simOperator || "Jio"}
                    onChange={(e) => setAssetFields(p => ({ ...p, simOperator: e.target.value }))}
                    className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-semibold"
                  >
                    <option value="Jio">Jio</option>
                    <option value="Airtel">Airtel</option>
                    <option value="Vodafone Idea (Vi)">Vodafone Idea (Vi)</option>
                    <option value="BSNL">BSNL</option>
                    <option value="Other">Other</option>
                  </select>
                  {assetFields.simOperator === "Other" && (
                    <input
                      type="text"
                      placeholder="Specify custom operator..."
                      value={assetFields.simOperatorCustom || ""}
                      onChange={(e) => setAssetFields(p => ({ ...p, simOperatorCustom: e.target.value }))}
                      className="mt-1.5 w-full bg-white border border-[#C9A84C] focus:border-[#C9A84C] rounded-lg px-3 py-1.5 text-xs text-[#1C1C1A] font-semibold"
                    />
                  )}
                </div>
                <div>
                  <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Network Type</label>
                  <select
                    value={assetFields.simNetwork || "5G"}
                    onChange={(e) => setAssetFields(p => ({ ...p, simNetwork: e.target.value }))}
                    className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-semibold"
                  >
                    <option value="5G">5G</option>
                    <option value="4G">4G</option>
                    <option value="3G">3G</option>
                    <option value="Other">Other</option>
                  </select>
                  {assetFields.simNetwork === "Other" && (
                    <input
                      type="text"
                      placeholder="Specify custom network..."
                      value={assetFields.simNetworkCustom || ""}
                      onChange={(e) => setAssetFields(p => ({ ...p, simNetworkCustom: e.target.value }))}
                      className="mt-1.5 w-full bg-white border border-[#C9A84C] focus:border-[#C9A84C] rounded-lg px-3 py-1.5 text-xs text-[#1C1C1A] font-semibold"
                    />
                  )}
                </div>
                <div>
                  <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">SIM Card Number / ICCID</label>
                  <input
                    type="text"
                    placeholder="e.g. 89910000..."
                    value={assetFields.simIccid || ""}
                    onChange={(e) => setAssetFields(p => ({ ...p, simIccid: e.target.value }))}
                    className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Plan Type & Recharge</label>
                  <select
                    value={assetFields.simPlanType || "Postpaid (Corporate Plan)"}
                    onChange={(e) => setAssetFields(p => ({ ...p, simPlanType: e.target.value }))}
                    className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-semibold"
                  >
                    <option value="Postpaid (Corporate Plan)">Postpaid (Corporate Plan)</option>
                    <option value="Prepaid (Monthly)">Prepaid (Monthly)</option>
                    <option value="Prepaid (Annual)">Prepaid (Annual)</option>
                    <option value="Data SIM Only">Data SIM Only</option>
                    <option value="Other">Other</option>
                  </select>
                  {assetFields.simPlanType === "Other" && (
                    <input
                      type="text"
                      placeholder="Specify custom plan..."
                      value={assetFields.simPlanTypeCustom || ""}
                      onChange={(e) => setAssetFields(p => ({ ...p, simPlanTypeCustom: e.target.value }))}
                      className="mt-1.5 w-full bg-white border border-[#C9A84C] focus:border-[#C9A84C] rounded-lg px-3 py-1.5 text-xs text-[#1C1C1A] font-semibold"
                    />
                  )}
                </div>
                <div>
                  <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">SIM PUK Code / PIN</label>
                  <input
                    type="text"
                    placeholder="e.g. PUK: 12345678"
                    value={assetFields.simPuk || ""}
                    onChange={(e) => setAssetFields(p => ({ ...p, simPuk: e.target.value }))}
                    className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">KYC / Registered Account Holder</label>
                  <input
                    type="text"
                    placeholder="e.g. CFI Corporate Account"
                    value={assetFields.simKycName || ""}
                    onChange={(e) => setAssetFields(p => ({ ...p, simKycName: e.target.value }))}
                    className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-semibold"
                  />
                </div>
              </div>
            ) : typeClean === "laptop" ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Laptop Brand & Model *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. HP EliteBook 840 G8"
                      value={assetFields.laptopModel || ""}
                      onChange={(e) => setAssetFields(p => ({ ...p, laptopModel: e.target.value }))}
                      className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Processor / RAM / Storage *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Intel i5, 16GB RAM, 512GB SSD"
                      value={assetFields.laptopSpecs || ""}
                      onChange={(e) => setAssetFields(p => ({ ...p, laptopSpecs: e.target.value }))}
                      className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Serial Number</label>
                    <input
                      type="text"
                      placeholder="e.g. SN-H1G4691X"
                      value={assetFields.laptopSerial || ""}
                      onChange={(e) => setAssetFields(p => ({ ...p, laptopSerial: e.target.value }))}
                      className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Operating System (OS)</label>
                    <select
                      value={assetFields.laptopOs || "Windows 11 Pro"}
                      onChange={(e) => setAssetFields(p => ({ ...p, laptopOs: e.target.value }))}
                      className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-semibold"
                    >
                      <option value="Windows 11 Pro">Windows 11 Pro</option>
                      <option value="Windows 10 Pro">Windows 10 Pro</option>
                      <option value="macOS">macOS</option>
                      <option value="Ubuntu Linux">Ubuntu Linux</option>
                      <option value="DOS / No OS">DOS / No OS</option>
                      <option value="Other">Other</option>
                    </select>
                    {assetFields.laptopOs === "Other" && (
                      <input
                        type="text"
                        placeholder="Specify custom OS..."
                        value={assetFields.laptopOsCustom || ""}
                        onChange={(e) => setAssetFields(p => ({ ...p, laptopOsCustom: e.target.value }))}
                        className="mt-1.5 w-full bg-white border border-[#C9A84C] focus:border-[#C9A84C] rounded-lg px-3 py-1.5 text-xs text-[#1C1C1A] font-semibold"
                      />
                    )}
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Computer / Host Name</label>
                    <input
                      type="text"
                      placeholder="e.g. CFI-LAP-042"
                      value={assetFields.laptopHostName || ""}
                      onChange={(e) => setAssetFields(p => ({ ...p, laptopHostName: e.target.value }))}
                      className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Original Charger Included?</label>
                    <select
                      value={assetFields.laptopCharger || "Yes"}
                      onChange={(e) => setAssetFields(p => ({ ...p, laptopCharger: e.target.value }))}
                      className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-semibold"
                    >
                      <option value="Yes">Yes (Original Charger)</option>
                      <option value="No">No Charger</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Bag & Mouse Issued?</label>
                    <select
                      value={assetFields.laptopBag || "Bag & Mouse"}
                      onChange={(e) => setAssetFields(p => ({ ...p, laptopBag: e.target.value }))}
                      className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-semibold"
                    >
                      <option value="Bag & Mouse">Bag & Mouse</option>
                      <option value="Bag Only">Bag Only</option>
                      <option value="Mouse Only">Mouse Only</option>
                      <option value="None">None</option>
                    </select>
                  </div>
                </div>

                <div className="max-w-md">
                  <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Admin Password / Passcode</label>
                  <input
                    type="text"
                    placeholder="e.g. Admin@123 / Passcode"
                    value={assetFields.laptopPassword || ""}
                    onChange={(e) => setAssetFields(p => ({ ...p, laptopPassword: e.target.value }))}
                    className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-mono"
                  />
                </div>

                <div className="max-w-md">
                  <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Logged-in Email IDs</label>
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
              </div>
            ) : typeClean === "mobile phone" ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Phone Brand & Model *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Tecno Spark6GO"
                      value={assetFields.phoneModel || ""}
                      onChange={(e) => setAssetFields(p => ({ ...p, phoneModel: e.target.value }))}
                      className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">RAM & Storage</label>
                    <input
                      type="text"
                      placeholder="e.g. 4GB/64GB"
                      value={assetFields.phoneSpecs || ""}
                      onChange={(e) => setAssetFields(p => ({ ...p, phoneSpecs: e.target.value }))}
                      className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Phone Lock Passcode / Pattern</label>
                    <input
                      type="text"
                      placeholder="e.g. 1234 / Pattern"
                      value={assetFields.phonePassword || ""}
                      onChange={(e) => setAssetFields(p => ({ ...p, phonePassword: e.target.value }))}
                      className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">IMEI Number 1 *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 358743619730982"
                      value={assetFields.phoneImei1 || ""}
                      onChange={(e) => setAssetFields(p => ({ ...p, phoneImei1: e.target.value }))}
                      className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">IMEI Number 2</label>
                    <input
                      type="text"
                      placeholder="e.g. 358743619730990 (Optional)"
                      value={assetFields.phoneImei2 || ""}
                      onChange={(e) => setAssetFields(p => ({ ...p, phoneImei2: e.target.value }))}
                      className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">SIM Slots Used</label>
                    <select
                      value={assetFields.phoneSimSlots || "None"}
                      onChange={(e) => setAssetFields(p => ({ ...p, phoneSimSlots: e.target.value }))}
                      className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-semibold"
                    >
                      <option value="None">None</option>
                      <option value="1 SIM">1 SIM</option>
                      <option value="2 SIMs">2 SIMs</option>
                    </select>
                  </div>
                  {(assetFields.phoneSimSlots === "1 SIM" || assetFields.phoneSimSlots === "2 SIMs") && (
                    <div className="bg-[#FCFBF9] border border-[#E8E4DF] p-3 rounded-lg space-y-2">
                      <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold">SIM 1 Config</label>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">SIM 1 Mobile Number *</label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. 9876543210"
                            value={assetFields.phoneSim1No || ""}
                            onChange={(e) => setAssetFields(p => ({ ...p, phoneSim1No: e.target.value }))}
                            className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-semibold"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">SIM 1 Company / Operator</label>
                          <select
                            value={["Jio", "Airtel", "Vodafone Idea (Vi)", "BSNL"].includes(assetFields.phoneSim1Operator || "") ? assetFields.phoneSim1Operator : "Other"}
                            onChange={(e) => {
                              const val = e.target.value;
                              setAssetFields(p => ({ ...p, phoneSim1Operator: val, phoneSim1OperatorCustom: val === "Other" ? (p.phoneSim1OperatorCustom || "") : "" }));
                            }}
                            className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-semibold"
                          >
                            <option value="Jio">Jio</option>
                            <option value="Airtel">Airtel</option>
                            <option value="Vodafone Idea (Vi)">Vodafone Idea (Vi)</option>
                            <option value="BSNL">BSNL</option>
                            <option value="Other">Other (Custom Company)</option>
                          </select>
                          {(assetFields.phoneSim1Operator === "Other" || (!["Jio", "Airtel", "Vodafone Idea (Vi)", "BSNL"].includes(assetFields.phoneSim1Operator || "") && assetFields.phoneSim1Operator)) && (
                            <input
                              type="text"
                              required
                              placeholder="Enter SIM Company Name..."
                              value={assetFields.phoneSim1OperatorCustom !== undefined ? assetFields.phoneSim1OperatorCustom : (["Jio", "Airtel", "Vodafone Idea (Vi)", "BSNL", "Other"].includes(assetFields.phoneSim1Operator || "") ? "" : assetFields.phoneSim1Operator || "")}
                              onChange={(e) => setAssetFields(p => ({ ...p, phoneSim1OperatorCustom: e.target.value }))}
                              className="mt-1.5 w-full bg-white border border-[#C9A84C] focus:border-[#C9A84C] rounded-lg px-3 py-1.5 text-xs text-[#1C1C1A] placeholder-[#9C9890] focus:outline-none font-semibold shadow-sm"
                            />
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">WhatsApp On?</label>
                          <select
                            value={assetFields.phoneSim1Whatsapp || "No"}
                            onChange={(e) => setAssetFields(p => ({ ...p, phoneSim1Whatsapp: e.target.value }))}
                            className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-semibold"
                          >
                            <option value="No">No</option>
                            <option value="Yes">Yes</option>
                          </select>
                        </div>
                        {assetFields.phoneSim1Whatsapp === "Yes" && (
                          <div>
                            <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">WhatsApp Type</label>
                            <select
                              value={assetFields.phoneSim1WhatsappType || "Personal"}
                              onChange={(e) => setAssetFields(p => ({ ...p, phoneSim1WhatsappType: e.target.value }))}
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
                  {assetFields.phoneSimSlots === "2 SIMs" && (
                    <div className="bg-[#FCFBF9] border border-[#E8E4DF] p-3 rounded-lg space-y-2">
                      <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold">SIM 2 Config</label>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">SIM 2 Mobile Number *</label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. 9876543211"
                            value={assetFields.phoneSim2No || ""}
                            onChange={(e) => setAssetFields(p => ({ ...p, phoneSim2No: e.target.value }))}
                            className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-semibold"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">SIM 2 Company / Operator</label>
                          <select
                            value={["Jio", "Airtel", "Vodafone Idea (Vi)", "BSNL"].includes(assetFields.phoneSim2Operator || "") ? assetFields.phoneSim2Operator : "Other"}
                            onChange={(e) => {
                              const val = e.target.value;
                              setAssetFields(p => ({ ...p, phoneSim2Operator: val, phoneSim2OperatorCustom: val === "Other" ? (p.phoneSim2OperatorCustom || "") : "" }));
                            }}
                            className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-semibold"
                          >
                            <option value="Jio">Jio</option>
                            <option value="Airtel">Airtel</option>
                            <option value="Vodafone Idea (Vi)">Vodafone Idea (Vi)</option>
                            <option value="BSNL">BSNL</option>
                            <option value="Other">Other (Custom Company)</option>
                          </select>
                          {(assetFields.phoneSim2Operator === "Other" || (!["Jio", "Airtel", "Vodafone Idea (Vi)", "BSNL"].includes(assetFields.phoneSim2Operator || "") && assetFields.phoneSim2Operator)) && (
                            <input
                              type="text"
                              required
                              placeholder="Enter SIM Company Name..."
                              value={assetFields.phoneSim2OperatorCustom !== undefined ? assetFields.phoneSim2OperatorCustom : (["Jio", "Airtel", "Vodafone Idea (Vi)", "BSNL", "Other"].includes(assetFields.phoneSim2Operator || "") ? "" : assetFields.phoneSim2Operator || "")}
                              onChange={(e) => setAssetFields(p => ({ ...p, phoneSim2OperatorCustom: e.target.value }))}
                              className="mt-1.5 w-full bg-white border border-[#C9A84C] focus:border-[#C9A84C] rounded-lg px-3 py-1.5 text-xs text-[#1C1C1A] placeholder-[#9C9890] focus:outline-none font-semibold shadow-sm"
                            />
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">WhatsApp On?</label>
                          <select
                            value={assetFields.phoneSim2Whatsapp || "No"}
                            onChange={(e) => setAssetFields(p => ({ ...p, phoneSim2Whatsapp: e.target.value }))}
                            className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-semibold"
                          >
                            <option value="No">No</option>
                            <option value="Yes">Yes</option>
                          </select>
                        </div>
                        {assetFields.phoneSim2Whatsapp === "Yes" && (
                          <div>
                            <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">WhatsApp Type</label>
                            <select
                              value={assetFields.phoneSim2WhatsappType || "Personal"}
                              onChange={(e) => setAssetFields(p => ({ ...p, phoneSim2WhatsappType: e.target.value }))}
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

                  {/* Standalone / External WhatsApp (Wi-Fi / Separate Number) Section */}
                  <div className="bg-[#FCFBF9] border border-[#E8E4DF] p-3 rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[9px] uppercase tracking-wider text-[#9C9890] font-bold flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        Standalone / External WhatsApp (Without Physical SIM)
                      </label>
                      <select
                        value={assetFields.phoneExternalWhatsapp || "No"}
                        onChange={(e) => setAssetFields(p => ({ ...p, phoneExternalWhatsapp: e.target.value }))}
                        className="bg-white border border-[#E8E4DF] rounded-md px-2 py-1 text-[10px] font-bold text-slate-700 focus:outline-none"
                      >
                        <option value="No">No (Disabled)</option>
                        <option value="Yes">Yes (Add External Number)</option>
                      </select>
                    </div>

                    {assetFields.phoneExternalWhatsapp === "Yes" && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 pt-1">
                        <div>
                          <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">WhatsApp Mobile Number *</label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. 9876543210"
                            value={assetFields.phoneExternalWhatsappNo || ""}
                            onChange={(e) => setAssetFields(p => ({ ...p, phoneExternalWhatsappNo: e.target.value }))}
                            className="w-full bg-white border border-emerald-300 focus:border-emerald-500 rounded-lg px-3 py-1.5 text-xs text-[#1C1C1A] font-semibold"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">WhatsApp Type *</label>
                          <select
                            value={assetFields.phoneExternalWhatsappType || "Business"}
                            onChange={(e) => setAssetFields(p => ({ ...p, phoneExternalWhatsappType: e.target.value }))}
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
                            value={assetFields.phoneExternalWhatsappLabel || ""}
                            onChange={(e) => setAssetFields(p => ({ ...p, phoneExternalWhatsappLabel: e.target.value }))}
                            className="w-full bg-white border border-[#E8E4DF] focus:border-emerald-500 rounded-lg px-3 py-1.5 text-xs text-[#1C1C1A] font-semibold"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Logged-in Social Media Applications Section */}
                  <div className="bg-[#FCFBF9] border border-[#E8E4DF] p-3 rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[9px] uppercase tracking-wider text-[#9C9890] font-bold flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                        Logged-in Social Media Applications
                      </label>
                      <select
                        value={assetFields.phoneSocialMedia || "No"}
                        onChange={(e) => setAssetFields(p => ({ ...p, phoneSocialMedia: e.target.value }))}
                        className="bg-white border border-[#E8E4DF] rounded-md px-2 py-1 text-[10px] font-bold text-slate-700 focus:outline-none"
                      >
                        <option value="No">No (Disabled)</option>
                        <option value="Yes">Yes (Add Social Media Account)</option>
                      </select>
                    </div>

                    {assetFields.phoneSocialMedia === "Yes" && (
                      <div className="space-y-2 pt-1">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                          <div>
                            <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Social Media App *</label>
                            <select
                              value={["Instagram", "Facebook", "Telegram", "X (Twitter)", "LinkedIn", "YouTube", "Snapchat"].includes(assetFields.phoneSocialMediaApp || "") ? assetFields.phoneSocialMediaApp : "Other"}
                              onChange={(e) => {
                                const val = e.target.value;
                                setAssetFields(p => ({ ...p, phoneSocialMediaApp: val, phoneSocialMediaAppCustom: val === "Other" ? (p.phoneSocialMediaAppCustom || "") : "" }));
                              }}
                              className="w-full bg-white border border-purple-300 focus:border-purple-500 rounded-lg px-3 py-1.5 text-xs text-[#1C1C1A] font-semibold"
                            >
                              <option value="Instagram">Instagram</option>
                              <option value="Facebook">Facebook</option>
                              <option value="Telegram">Telegram</option>
                              <option value="X (Twitter)">X (Twitter)</option>
                              <option value="LinkedIn">LinkedIn</option>
                              <option value="YouTube">YouTube</option>
                              <option value="Snapchat">Snapchat</option>
                              <option value="Other">Other</option>
                            </select>
                            {(assetFields.phoneSocialMediaApp === "Other" || (!["Instagram", "Facebook", "Telegram", "X (Twitter)", "LinkedIn", "YouTube", "Snapchat"].includes(assetFields.phoneSocialMediaApp || "") && assetFields.phoneSocialMediaApp)) && (
                              <input
                                type="text"
                                required
                                placeholder="Specify custom app (e.g. Threads)..."
                                value={assetFields.phoneSocialMediaAppCustom || (assetFields.phoneSocialMediaApp !== "Other" ? assetFields.phoneSocialMediaApp : "") || ""}
                                onChange={(e) => setAssetFields(p => ({ ...p, phoneSocialMediaAppCustom: e.target.value }))}
                                className="mt-1.5 w-full bg-white border border-purple-400 focus:border-purple-500 rounded-lg px-3 py-1.5 text-xs text-[#1C1C1A] font-semibold"
                              />
                            )}
                          </div>
                          <div>
                            <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Username / Handle</label>
                            <input
                              type="text"
                              placeholder="e.g. @company_official (Optional)"
                              value={assetFields.phoneSocialMediaUsername || ""}
                              onChange={(e) => setAssetFields(p => ({ ...p, phoneSocialMediaUsername: e.target.value }))}
                              className="w-full bg-white border border-[#E8E4DF] focus:border-purple-500 rounded-lg px-3 py-1.5 text-xs text-[#1C1C1A] font-semibold font-mono"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Account Passcode / Password</label>
                            <input
                              type="text"
                              placeholder="e.g. Pass@123 (Optional)"
                              value={assetFields.phoneSocialMediaPassword || ""}
                              onChange={(e) => setAssetFields(p => ({ ...p, phoneSocialMediaPassword: e.target.value }))}
                              className="w-full bg-white border border-[#E8E4DF] focus:border-purple-500 rounded-lg px-3 py-1.5 text-xs text-[#1C1C1A] font-mono"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                <div className="max-w-md">
                  <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Logged-in Email IDs</label>
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
              </div>
            ) : typeClean === "headset / accessories" ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Accessory Name / Brand *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Logitech USB Headset H390"
                    value={assetFields.accName || ""}
                    onChange={(e) => setAssetFields(p => ({ ...p, accName: e.target.value }))}
                    className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Accessory Type *</label>
                  <select
                    value={assetFields.accType || "Wired"}
                    onChange={(e) => setAssetFields(p => ({ ...p, accType: e.target.value }))}
                    className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-semibold"
                  >
                    <option value="Wired">Wired</option>
                    <option value="Wireless Bluetooth">Wireless Bluetooth</option>
                    <option value="USB Dongle">USB Dongle</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Serial Number / Unique ID</label>
                  <input
                    type="text"
                    placeholder="e.g. SN-ACC12345"
                    value={assetFields.accSerial || ""}
                    onChange={(e) => setAssetFields(p => ({ ...p, accSerial: e.target.value }))}
                    className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-mono"
                  />
                </div>
              </div>
            ) : typeClean === "id card / lanyard" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Employee Name / ID *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rahul Sharma - EMP101"
                    value={assetFields.idEmployee || ""}
                    onChange={(e) => setAssetFields(p => ({ ...p, idEmployee: e.target.value }))}
                    className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Card ID Number / Barcode *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. ID-887192"
                    value={assetFields.idBarcode || ""}
                    onChange={(e) => setAssetFields(p => ({ ...p, idBarcode: e.target.value }))}
                    className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-mono font-semibold"
                  />
                </div>
              </div>
            ) : typeClean === "office chair / table" ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Furniture Description *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ergonomic Black Mesh Chair, Adjustable Back"
                    value={assetFields.furnitureDesc || ""}
                    onChange={(e) => setAssetFields(p => ({ ...p, furnitureDesc: e.target.value }))}
                    className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Location / Cabin / Room</label>
                  <input
                    type="text"
                    placeholder="e.g. Conference Room A / Cabin 3"
                    value={assetFields.furnitureLocation || ""}
                    onChange={(e) => setAssetFields(p => ({ ...p, furnitureLocation: e.target.value }))}
                    className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Inventory Tag / Asset Tag</label>
                  <input
                    type="text"
                    placeholder="e.g. TAG-CHR-0042"
                    value={assetFields.furnitureTag || ""}
                    onChange={(e) => setAssetFields(p => ({ ...p, furnitureTag: e.target.value }))}
                    className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-mono"
                  />
                </div>
              </div>
            ) : typeClean === "router / networking" ? (
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Router Brand & Model *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. TP-Link Archer C6"
                      value={assetFields.routerModel || ""}
                      onChange={(e) => setAssetFields(p => ({ ...p, routerModel: e.target.value }))}
                      className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">MAC Address *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 00:1A:2B:3C:4D:5E"
                      value={assetFields.routerMac || ""}
                      onChange={(e) => setAssetFields(p => ({ ...p, routerMac: e.target.value }))}
                      className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Serial Number</label>
                    <input
                      type="text"
                      placeholder="e.g. SN-RTR99887"
                      value={assetFields.routerSerial || ""}
                      onChange={(e) => setAssetFields(p => ({ ...p, routerSerial: e.target.value }))}
                      className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-mono"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Admin Panel IP</label>
                    <input
                      type="text"
                      placeholder="e.g. 192.168.1.1"
                      value={assetFields.routerIp || ""}
                      onChange={(e) => setAssetFields(p => ({ ...p, routerIp: e.target.value }))}
                      className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Admin Username & Password</label>
                    <input
                      type="text"
                      placeholder="e.g. admin / pass123"
                      value={assetFields.routerAdminPass || ""}
                      onChange={(e) => setAssetFields(p => ({ ...p, routerAdminPass: e.target.value }))}
                      className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Wi-Fi SSID & Password</label>
                    <input
                      type="text"
                      placeholder="e.g. CFI_5G / Pass@2026"
                      value={assetFields.routerWifiSsid || ""}
                      onChange={(e) => setAssetFields(p => ({ ...p, routerWifiSsid: e.target.value }))}
                      className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">ISP / Broadband Connection</label>
                    <input
                      type="text"
                      placeholder="e.g. Airtel Fiber / BSNL FTTH"
                      value={assetFields.routerIsp || ""}
                      onChange={(e) => setAssetFields(p => ({ ...p, routerIsp: e.target.value }))}
                      className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-semibold"
                    />
                  </div>
                </div>
              </div>
            ) : typeClean === "printer / scanner" ? (
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div>
                  <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Printer Brand & Model *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. HP LaserJet Pro M12w"
                    value={assetFields.printerModel || ""}
                    onChange={(e) => setAssetFields(p => ({ ...p, printerModel: e.target.value }))}
                    className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Printer Type *</label>
                  <select
                    value={assetFields.printerType || "Laser Printer"}
                    onChange={(e) => setAssetFields(p => ({ ...p, printerType: e.target.value }))}
                    className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-semibold"
                  >
                    <option value="Laser Printer">Laser Printer</option>
                    <option value="Inkjet Printer">Inkjet Printer</option>
                    <option value="Flatbed Scanner">Flatbed Scanner</option>
                    <option value="Multi-Function Printer">Multi-Function Printer</option>
                    <option value="Other">Other</option>
                  </select>
                  {assetFields.printerType === "Other" && (
                    <input
                      type="text"
                      placeholder="Specify custom type..."
                      value={assetFields.printerTypeCustom || ""}
                      onChange={(e) => setAssetFields(p => ({ ...p, printerTypeCustom: e.target.value }))}
                      className="mt-1.5 w-full bg-white border border-[#C9A84C] focus:border-[#C9A84C] rounded-lg px-3 py-1.5 text-xs text-[#1C1C1A] font-semibold"
                    />
                  )}
                </div>
                <div>
                  <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Serial Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. SN-PRN1928"
                    value={assetFields.printerSerial || ""}
                    onChange={(e) => setAssetFields(p => ({ ...p, printerSerial: e.target.value }))}
                    className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Printer IP Address</label>
                  <input
                    type="text"
                    placeholder="e.g. 192.168.1.200"
                    value={assetFields.printerIp || ""}
                    onChange={(e) => setAssetFields(p => ({ ...p, printerIp: e.target.value }))}
                    className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Toner / Cartridge Model</label>
                  <input
                    type="text"
                    placeholder="e.g. HP 88A / Canon 325"
                    value={assetFields.printerCartridge || ""}
                    onChange={(e) => setAssetFields(p => ({ ...p, printerCartridge: e.target.value }))}
                    className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-semibold"
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Asset Detail / Specification *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dell Latitude 5420, 16GB RAM, 512GB SSD"
                    value={registerForm.assetDetail}
                    onChange={(e) => setRegisterForm(p => ({ ...p, assetDetail: e.target.value }))}
                    className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Serial Number / Unique Identifier</label>
                  <input
                    type="text"
                    placeholder="e.g. SN-H1G4691X, MAC Address, etc."
                    value={registerForm.serialNumber}
                    onChange={(e) => setRegisterForm(p => ({ ...p, serialNumber: e.target.value }))}
                    className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-mono"
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Purchase Date (DD/MM/YYYY)</label>
                <input
                  type="date"
                  placeholder="dd/mm/yyyy"
                  value={registerForm.purchaseDate}
                  onChange={(e) => setRegisterForm(p => ({ ...p, purchaseDate: e.target.value }))}
                  className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-semibold"
                />
              </div>
              <div>
                <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Purchase Value / Cost</label>
                <input
                  type="text"
                  placeholder="e.g. ₹45,500"
                  value={registerForm.purchaseValue}
                  onChange={(e) => setRegisterForm(p => ({ ...p, purchaseValue: e.target.value }))}
                  className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-semibold"
                />
              </div>
              <div>
                <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Asset Photo</label>
                <div className="flex gap-4 items-center">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handlePhotoUpload(e, false)}
                    className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-1.5 text-xs text-[#1C1C1A] focus:outline-none transition-all file:mr-4 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                  />
                  {registerForm.photoUrl && (
                    <div className="relative w-12 h-12 rounded-lg border border-[#E8E4DF] overflow-hidden bg-slate-50 flex-shrink-0 shadow-sm group">
                      <img src={registerForm.photoUrl} alt="Asset preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setRegisterForm(prev => ({ ...prev, photoUrl: "" }))}
                        className="absolute inset-0 bg-black/55 text-white text-[8px] font-black uppercase opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Internal Notes</label>
              <textarea
                value={registerForm.notes}
                onChange={(e) => setRegisterForm(p => ({ ...p, notes: e.target.value }))}
                rows={2}
                placeholder="Any vendor details, warranty information, or storage locations..."
                className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all resize-none"
              />
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowRegisterForm(false)}
                className="px-4 py-2 rounded-lg border border-[#E8E4DF] text-xs font-semibold uppercase tracking-wider text-[#5D5B57] hover:bg-[#F5F0EA] transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submittingRegister}
                className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-xs font-semibold uppercase tracking-wider hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm"
              >
                {submittingRegister ? "Registering..." : "Add to Stock Room"}
              </button>
            </div>
          </form>
        </div>
      )}

      {activeSubTab === "stock" ? (
        <>
          {/* Filter and Search Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 bg-[#FCFBF9] border border-[#E8E4DF] p-4 rounded-xl">
        {/* Search */}
        <div>
          <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1.5">Search Asset Detail / Serial</label>
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
          <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1.5">Belongs to Company</label>
          <select
            value={selectedCompany}
            onChange={(e) => setSelectedCompany(e.target.value)}
            className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-semibold"
          >
            <option value="all">All Stocks</option>
            {companies.map((comp) => (
              <option key={comp.id} value={comp.id}>
                {comp.name}
              </option>
            ))}
          </select>
        </div>

        {/* Condition Filter */}
        <div>
          <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1.5">Condition Status</label>
          <select
            value={selectedCondition}
            onChange={(e) => setSelectedCondition(e.target.value)}
            className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-semibold"
          >
            <option value="all">All Conditions</option>
            <option value="New">New</option>
            <option value="Good">Good</option>
            <option value="Fair">Fair</option>
            <option value="Needs Repair">Needs Repair</option>
          </select>
        </div>

        {/* Asset Type Filter */}
        <div>
          <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1.5">Asset Category</label>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-semibold"
          >
            <option value="all">All Categories</option>
            {dynamicAssetTypes.map((type) => <option key={type} value={type}>{type}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1.5">Inventory Status</label>
          <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)} className="w-full bg-white border border-[#E8E4DF] rounded-lg px-3 py-2 text-xs font-semibold">
            <option value="all">All Statuses</option>
            {Array.from(new Set(inventory.map((asset) => asset.status).filter(Boolean))).sort().map((status) => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1.5">Assigned To</label>
          <select value={selectedAssignee} onChange={(e) => setSelectedAssignee(e.target.value)} className="w-full bg-white border border-[#E8E4DF] rounded-lg px-3 py-2 text-xs font-semibold">
            <option value="all">All Employees</option>
            <option value="unassigned">Unassigned / Available</option>
            {[...employees].sort((a: any, b: any) => String(a.name || "").localeCompare(String(b.name || ""))).map((employee: any) => (
              <option key={employee.id} value={employee.id}>{employee.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1.5">Assigned Date Range</label>
          <div className="grid grid-cols-2 gap-1.5">
            <input type="date" value={assignedFrom} onChange={(e) => setAssignedFrom(e.target.value)} className="min-w-0 bg-white border border-[#E8E4DF] rounded-lg px-2 py-2 text-[10px]" />
            <input type="date" value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} className="min-w-0 bg-white border border-[#E8E4DF] rounded-lg px-2 py-2 text-[10px]" />
          </div>
        </div>

        <div>
          <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1.5">Handover Date Range</label>
          <div className="flex gap-1.5">
            <input type="date" value={handoverFrom} onChange={(e) => setHandoverFrom(e.target.value)} className="min-w-0 flex-1 bg-white border border-[#E8E4DF] rounded-lg px-2 py-2 text-[10px]" />
            <input type="date" value={handoverTo} onChange={(e) => setHandoverTo(e.target.value)} className="min-w-0 flex-1 bg-white border border-[#E8E4DF] rounded-lg px-2 py-2 text-[10px]" />
            <button
              type="button"
              title="Clear all filters"
              onClick={() => {
                setSearchQuery(""); setSelectedCompany("all"); setSelectedCondition("all");
                setSelectedType("all"); setSelectedStatus("all"); setSelectedAssignee("all");
                setAssignedFrom(""); setAssignedTo(""); setHandoverFrom(""); setHandoverTo("");
              }}
              className="px-3 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 font-bold text-[10px]"
            >
              Clear
            </button>
          </div>
        </div>
        <div className="md:col-span-2 xl:col-span-4 flex items-center justify-between border-t border-[#E8E4DF] pt-3 text-[10px] font-bold text-slate-500">
          <span>Showing {filteredInventory.length} of {inventory.length} assets</span>
          <span>{availableCount} available · {inUseCount} assigned</span>
        </div>
      </div>

      {/* Main Stock Table */}
      {loading ? (
        <div className="text-center py-12">
          <p className="text-[#9C9890] text-xs uppercase tracking-widest animate-pulse font-medium">Loading inventory lists...</p>
        </div>
      ) : filteredInventory.length === 0 ? (
        <div className="bg-[#FCFBF9] border border-[#E8E4DF] rounded-xl p-12 text-center">
          <Package className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-[#9C9890] text-xs uppercase tracking-widest font-medium">No inventory items matched</p>
        </div>
      ) : (
        <div className="bg-[#FCFBF9] border border-[#E8E4DF] rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-[#E8E4DF] bg-[#F5F0EA]/40 text-[#5D5B57] text-[10px] uppercase font-bold tracking-wider">
                  <th className="py-3.5 px-4 font-bold">Category</th>
                  <th className="py-3.5 px-4 font-bold">Asset Description & Serial</th>
                  <th className="py-3.5 px-4 font-bold">Condition</th>
                  <th className="py-3.5 px-4 font-bold">Inventory Status</th>
                  <th className="py-3.5 px-4 font-bold">Purchase Details</th>
                  <th className="py-3.5 px-4 font-bold">Company / Notes</th>
                  <th className="py-3.5 px-4 font-bold text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8E4DF] text-xs">
                {filteredInventory.map((asset) => {
                  const companyName = companies.find(c => String(c.id) === String(asset.companyId))?.name || "General Stock";

                  return (
                    <tr key={asset.id} onClick={() => setViewingAsset(asset)} className="hover:bg-indigo-50/30 transition-colors cursor-pointer group">
                      {/* Asset Category */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <div className="flex flex-col gap-1 items-start">
                          <span className="text-[10px] bg-slate-100 group-hover:bg-white text-[#5D5B57] px-2 py-0.5 rounded font-mono font-bold border border-slate-200">
                            ID: {asset.id}
                          </span>
                          {asset.oldAssetId && (
                            <span className="text-[9px] bg-amber-50 text-amber-800 px-2 py-0.5 rounded font-mono font-bold border border-amber-200">
                              Old ID: {asset.oldAssetId}
                            </span>
                          )}
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-bold border border-indigo-100 uppercase tracking-wide">
                            <Cpu className="w-3 h-3" /> {asset.assetType}
                          </span>
                        </div>
                      </td>

                      {/* Detail & Serial */}
                      <td className="py-4 px-4">
                        <div className="flex gap-3 items-start">
                          {asset.photoUrl && (
                            <div className="w-12 h-12 rounded-lg border border-[#E8E4DF] overflow-hidden bg-slate-50 flex-shrink-0 shadow-sm cursor-pointer hover:scale-105 transition-transform" onClick={(e) => { e.stopPropagation(); setPreviewImageUrl(asset.photoUrl); }}>
                              <img src={asset.photoUrl} alt="Asset photo" className="w-full h-full object-cover" />
                            </div>
                          )}
                          <div>
                            <div className="font-semibold text-[#1C1C1A]">{asset.assetDetail || "No Description"}</div>
                            {asset.serialNumber && (
                              <div className="text-[10px] text-[#9C9890] font-mono mt-0.5">
                                S/N: {asset.serialNumber}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Condition */}
                      <td className="py-4 px-4">
                        <span className={cn(
                          "inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold border uppercase tracking-wider",
                          asset.condition === "New" ? "bg-emerald-50 text-emerald-700 border-emerald-250" :
                            asset.condition === "Good" ? "bg-blue-50 text-blue-700 border-blue-250" :
                              asset.condition === "Fair" ? "bg-amber-50 text-amber-700 border-amber-250" :
                                "bg-rose-50 text-rose-700 border-rose-250"
                        )}>
                          {asset.condition || "Good"}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4">
                        <div className="space-y-1">
                          <span className={cn(
                            "inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold border uppercase tracking-wider",
                            asset.status === "Available" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                              asset.status === "In Use" ? "bg-amber-50 text-amber-700 border-amber-200" :
                                "bg-rose-50 text-rose-700 border-rose-200"
                          )}>
                            {asset.status || "Available"}
                          </span>
                          {asset.assignedToName && (
                            <div className="text-[10px] font-bold text-slate-700">
                              With: {asset.assignedToName}
                              {asset.assignedAt && (
                                <span className="block text-[9px] font-medium text-slate-500">Assigned: {formatDateDDMMYY(String(asset.assignedAt).slice(0, 10))}</span>
                              )}
                              {asset.handoverDate && (
                                <span className="block text-[9px] font-medium text-slate-500">Handover: {formatDateDDMMYY(String(asset.handoverDate).slice(0, 10))}</span>
                              )}
                              {asset.assignmentSource === "legacy" && (
                                <span className="block text-[8px] font-medium text-slate-400">Matched from Assets Registry</span>
                              )}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Purchase details */}
                      <td className="py-4 px-4">
                        <div>
                          <div className="font-semibold text-slate-700">{asset.purchaseValue || "—"}</div>
                          {asset.purchaseDate && (
                            <div className="text-[9px] text-[#9C9890] font-semibold mt-0.5 flex items-center gap-1">
                              <Calendar className="w-2.5 h-2.5" /> {formatDateDDMMYY(asset.purchaseDate)}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Company & Notes */}
                      <td className="py-4 px-4 max-w-[200px]">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1 text-[9px] font-bold text-slate-800 uppercase tracking-wide">
                            <Building2 className="w-2.5 h-2.5 text-[#C9A84C]" /> {companyName}
                          </div>
                          {asset.notes && (
                            <p className="text-[10px] text-[#9C9890] italic line-clamp-2">
                              {asset.notes}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-4 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-center items-center gap-1.5">
                          <button
                            onClick={() => setViewingAsset(asset)}
                            className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-indigo-600 hover:text-white border border-indigo-200 hover:bg-indigo-600 rounded-lg transition-all flex items-center gap-1"
                          >
                            <HelpCircle className="w-3 h-3" /> View
                          </button>
                          <button
                            onClick={() => handleStartEdit(asset)}
                            className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[#C9A84C] hover:text-white border border-[#C9A84C]/35 hover:bg-[#C9A84C] rounded-lg transition-all flex items-center gap-1"
                          >
                            <Edit3 className="w-3 h-3" /> Edit
                          </button>
                          {asset.assignedToUserId ? (
                            <>
                              <button
                                onClick={() => {
                                  setAssigningAsset(asset);
                                  setAssignmentUserId("");
                                  setAssignmentDate(new Date().toISOString().slice(0, 10));
                                  setAssignmentHandoverDate("");
                                  setAssignmentNotes("");
                                }}
                                className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-sky-700 border border-sky-200 hover:bg-sky-600 hover:text-white rounded-lg transition-all flex items-center gap-1"
                              >
                                <ArrowRightLeft className="w-3 h-3" /> Transfer
                              </button>
                              <button
                                onClick={() => handleUnassignAsset(asset)}
                                className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-rose-600 border border-rose-200 hover:bg-rose-600 hover:text-white rounded-lg transition-all flex items-center gap-1"
                              >
                                <UserMinus className="w-3 h-3" /> Unassign
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => {
                                setAssigningAsset(asset);
                                setAssignmentUserId("");
                                setAssignmentDate(new Date().toISOString().slice(0, 10));
                                setAssignmentHandoverDate("");
                                setAssignmentNotes("");
                              }}
                              className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700 border border-emerald-200 hover:bg-emerald-600 hover:text-white rounded-lg transition-all flex items-center gap-1"
                            >
                              <UserPlus className="w-3 h-3" /> Assign
                            </button>
                          )}
                          <button
                            onClick={() => setHistoryAsset(asset)}
                            className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-violet-700 border border-violet-200 hover:bg-violet-600 hover:text-white rounded-lg transition-all flex items-center gap-1"
                          >
                            <History className="w-3 h-3" /> History
                          </button>
                          <button
                            onClick={() => setDeleteConfirm({ show: true, assetId: asset.id, assetType: asset.assetType, serialNumber: asset.serialNumber })}
                            className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-rose-500 hover:text-white border border-rose-250 hover:bg-rose-500 rounded-lg transition-all flex items-center gap-1"
                          >
                            <Trash2 className="w-3 h-3" /> Delete
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
    </>
    ) : (
        /* Purchase Requests Log */
        <div className="bg-[#FCFBF9] border border-[#E8E4DF] rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b border-[#E8E4DF] pb-3">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
              Asset Purchase Requests
            </h3>
            {loadingPurchases && (
              <RefreshCw className="w-4 h-4 animate-spin text-indigo-500" />
            )}
          </div>

          {purchaseRequests.length === 0 ? (
            <div className="text-center py-8 text-xs font-bold text-[#9C9890]">
              No purchase requests found.
            </div>
          ) : (
            <div className="border border-[#E8E4DF] rounded-xl overflow-hidden bg-white">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse font-sans">
                  <thead>
                    <tr className="bg-slate-50 border-b border-[#E8E4DF] text-[10px] uppercase font-mono font-black text-slate-400">
                      <th className="p-3">ID</th>
                      {isOwner && <th className="p-3">Requested By</th>}
                      <th className="p-3">Asset Type</th>
                      <th className="p-3">Details</th>
                      <th className="p-3">Qty</th>
                      <th className="p-3">Cost</th>
                      <th className="p-3">Vendor / Delivery</th>
                      <th className="p-3">Quotation</th>
                      <th className="p-3">Justification</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E8E4DF] text-xs font-semibold text-[#5D5B57]">
                    {purchaseRequests.map((req) => (
                      <tr key={req.id} className="hover:bg-slate-50/50">
                        <td className="p-3 font-mono font-bold text-[#1C1C1A]">REQ-{req.id}</td>
                        {isOwner && <td className="p-3 text-indigo-600 font-bold">{req.requester}</td>}
                        <td className="p-3">
                          <div className="flex flex-col gap-0.5">
                            <span className="px-2 py-0.5 bg-slate-100 rounded text-[10px] font-bold text-slate-700 w-fit">
                              {req.asset_type}
                            </span>
                            {req.asset_id && (
                              <span className="text-[10px] text-indigo-650 font-mono font-bold">
                                ID: {req.asset_id}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-3 max-w-[180px] truncate">{req.asset_detail}</td>
                        <td className="p-3 font-mono font-bold text-slate-900">{req.quantity || 1} Pcs</td>
                        <td className="p-3 font-bold text-[#1C1C1A]">₹{req.estimated_cost}</td>
                        <td className="p-3">
                          <div className="font-semibold text-slate-800">{req.vendor_details}</div>
                          {req.expected_delivery_date && (
                            <div className="text-[9px] text-indigo-700 font-bold mt-0.5">
                              Est Delivery: {formatDateDDMMYY(req.expected_delivery_date)}
                            </div>
                          )}
                        </td>
                        <td className="p-3">
                          {req.quotation_url ? (
                            <div 
                              className="w-10 h-10 rounded border border-[#E8E4DF] overflow-hidden bg-slate-50 flex-shrink-0 cursor-pointer hover:scale-105 transition-transform"
                              onClick={() => setPreviewImageUrl(req.quotation_url)}
                            >
                              <img src={req.quotation_url} alt="Quotation preview" className="w-full h-full object-cover" />
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-400 italic">No File</span>
                          )}
                        </td>
                        <td className="p-3 max-w-[180px] truncate" title={req.justification}>{req.justification || "N/A"}</td>
                        <td className="p-3">
                          <div className="flex flex-col gap-1">
                            <span className={`inline-flex items-center w-fit text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                              req.status === "Pending Owner Approval"
                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                : req.status === "Approved"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : req.status === "Rejected"
                                ? "bg-rose-50 text-rose-700 border-rose-200"
                                : "bg-blue-50 text-blue-700 border-blue-200"
                            }`}>
                              {req.status}
                            </span>
                            {req.status === "Rejected" && req.owner_remarks && (
                              <span className="text-[9px] text-rose-500 font-bold italic block max-w-[150px] truncate" title={req.owner_remarks}>
                                Reason: {req.owner_remarks}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-3 text-right">
                          {isOwner && req.status === "Pending Owner Approval" && (
                            <div className="flex flex-col sm:flex-row items-center gap-2 justify-end">
                              <input
                                type="text"
                                placeholder="Add remarks..."
                                className="p-1 px-2 border border-[#E8E4DF] rounded text-[10px] w-28 focus:outline-none focus:border-[#C9A84C]"
                                value={ownerRemarksMap[req.id] || ""}
                                onChange={(e) => setOwnerRemarksMap(prev => ({ ...prev, [req.id]: e.target.value }))}
                              />
                              <div className="flex gap-1">
                                <button
                                  onClick={() => handleOwnerPurchaseAction(req.id, "Rejected")}
                                  className="p-1 text-[9px] font-black uppercase text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded"
                                >
                                  Reject
                                </button>
                                <button
                                  onClick={() => handleOwnerPurchaseAction(req.id, "Approved")}
                                  className="p-1 text-[9px] font-black uppercase text-emerald-600 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded"
                                >
                                  Approve
                                </button>
                              </div>
                            </div>
                          )}

                          {!isOwner && req.status === "Approved" && (
                            <button
                              onClick={() => {
                                setRegisterForm({
                                  id: req.asset_id || "",
                                  oldAssetId: "",
                                  assetType: req.asset_type,
                                  assetDetail: req.asset_detail,
                                  serialNumber: "",
                                  purchaseDate: new Date().toISOString().slice(0, 10),
                                  purchaseValue: req.estimated_cost,
                                  condition: "Good",
                                  companyId: req.company_id || "",
                                  notes: `Approved Purchase Request ID: ${req.id}`,
                                  photoUrl: ""
                                });
                                setShowRegisterForm(true);
                                setActiveSubTab("stock");
                                triggerToast("Asset details filled. Please enter Serial Number and select company to register.");
                              }}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-black uppercase tracking-wider transition-all"
                            >
                              Register & Assign
                            </button>
                          )}

                          {req.status === "Registered" && (
                            <span className="text-[10px] text-slate-400 font-bold italic">
                              Added to Stock
                            </span>
                          )}
                          {req.status === "Rejected" && !isOwner && (
                            <span className="text-[10px] text-[#9C9890] font-bold">
                              No Actions
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* New Purchase Request Modal */}
      {showPurchaseModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.08)" }}>
          <div className="bg-white border border-[#E8E4DF] rounded-2xl w-full max-w-lg shadow-xl overflow-hidden flex flex-col font-sans">
            {/* Header */}
            <div className="p-4 border-b border-[#E8E4DF] flex items-center justify-between">
              <h3 className="text-sm font-black uppercase tracking-wider text-indigo-650 flex items-center gap-1.5">
                <PlusCircle className="w-4 h-4 text-indigo-500" /> New Purchase Request
              </h3>
              <button
                onClick={() => {
                  setShowPurchaseModal(false);
                  setSourceRequestId(null);
                }}
                className="p-1 rounded hover:bg-slate-100 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Content */}
            <form onSubmit={handlePurchaseSubmit} className="p-4 space-y-3 overflow-y-auto max-h-[75vh]">
              <div>
                <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-black mb-1">Asset Type *</label>
                {!isCustomPurchaseType ? (
                  <select
                    value={purchaseForm.asset_type}
                    onChange={(e) => {
                      if (e.target.value === "__ADD_NEW__") {
                        setIsCustomPurchaseType(true);
                        setPurchaseForm(p => ({ ...p, asset_type: "" }));
                      } else {
                        setPurchaseForm(p => ({ ...p, asset_type: e.target.value }));
                      }
                    }}
                    className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-semibold"
                  >
                    {dynamicAssetTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                    <option value="__ADD_NEW__">+ Add New Asset Type</option>
                  </select>
                ) : (
                  <div className="flex gap-2 items-center">
                    <input
                      type="text"
                      required
                      placeholder="Custom asset type..."
                      value={purchaseForm.asset_type}
                      onChange={(e) => setPurchaseForm(p => ({ ...p, asset_type: e.target.value }))}
                      className="flex-1 bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-semibold"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setIsCustomPurchaseType(false);
                        setPurchaseForm(p => ({ ...p, asset_type: "Laptop" }));
                      }}
                      className="px-3 py-2 border border-[#E8E4DF] rounded-lg text-xs font-bold text-slate-500 hover:bg-slate-100 transition-all shrink-0"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-black mb-1">Asset ID * (Auto Generated)</label>
                <input
                  type="text"
                  required
                  readOnly
                  placeholder="Generating ID..."
                  value={purchaseForm.asset_id}
                  className="w-full bg-slate-50 border border-[#E8E4DF] rounded-lg px-3 py-2 text-xs text-slate-500 font-mono font-semibold focus:outline-none transition-all cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-black mb-1">Specifications & Details *</label>
                <textarea
                  placeholder="e.g. Dell Inspiron Core i5, 16GB RAM, 512GB SSD"
                  rows={2}
                  required
                  value={purchaseForm.asset_detail}
                  onChange={(e) => setPurchaseForm(p => ({ ...p, asset_detail: e.target.value }))}
                  className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] placeholder-[#9C9890] focus:outline-none transition-all font-semibold"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-black mb-1">Quantity *</label>
                  <input
                    type="number"
                    min={1}
                    required
                    placeholder="e.g. 1"
                    value={purchaseForm.quantity}
                    onChange={(e) => setPurchaseForm(p => ({ ...p, quantity: Math.max(1, Number(e.target.value) || 1) }))}
                    className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] placeholder-[#9C9890] focus:outline-none transition-all font-semibold font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-black mb-1">Estimated Cost (₹) *</label>
                  <input
                    type="number"
                    placeholder="e.g. 55000"
                    required
                    value={purchaseForm.estimated_cost}
                    onChange={(e) => setPurchaseForm(p => ({ ...p, estimated_cost: e.target.value }))}
                    className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] placeholder-[#9C9890] focus:outline-none transition-all font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-black mb-1">Vendor / Source *</label>
                  <input
                    type="text"
                    placeholder="e.g. Amazon / Store"
                    required
                    value={purchaseForm.vendor_details}
                    onChange={(e) => setPurchaseForm(p => ({ ...p, vendor_details: e.target.value }))}
                    className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] placeholder-[#9C9890] focus:outline-none transition-all font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-black mb-1">Expected Delivery Date (DD/MM/YYYY)</label>
                  <input
                    type="date"
                    placeholder="dd/mm/yyyy"
                    value={purchaseForm.expected_delivery_date}
                    onChange={(e) => setPurchaseForm(p => ({ ...p, expected_delivery_date: e.target.value }))}
                    className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-black mb-1">Company (Optional)</label>
                  <select
                    value={purchaseForm.company_id}
                    onChange={(e) => setPurchaseForm(p => ({ ...p, company_id: e.target.value }))}
                    className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-semibold"
                  >
                    <option value="">-- Choose Company --</option>
                    {companies.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-black mb-1">Vendor Quotation / Price Screenshot</label>
                <div className="flex gap-3 items-center">
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      if (file.size > 5 * 1024 * 1024) {
                        triggerToast("File size should be less than 5MB");
                        return;
                      }
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        setPurchaseForm(p => ({ ...p, quotation_url: reader.result as string }));
                      };
                      reader.readAsDataURL(file);
                    }}
                    className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-1.5 text-xs text-[#1C1C1A] focus:outline-none transition-all file:mr-3 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-[10px] file:font-bold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                  />
                  {purchaseForm.quotation_url && (
                    <div className="relative w-10 h-10 rounded-lg border border-[#E8E4DF] overflow-hidden bg-slate-50 flex-shrink-0 shadow-sm group">
                      <img src={purchaseForm.quotation_url} alt="Quotation preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setPurchaseForm(prev => ({ ...prev, quotation_url: "" }))}
                        className="absolute inset-0 bg-black/60 text-white text-[7px] font-black uppercase opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-black mb-1">Justification / Reason (Optional)</label>
                <textarea
                  placeholder="Why is this purchase required?"
                  rows={2}
                  value={purchaseForm.justification}
                  onChange={(e) => setPurchaseForm(p => ({ ...p, justification: e.target.value }))}
                  className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] placeholder-[#9C9890] focus:outline-none transition-all font-semibold"
                />
              </div>

              {/* Footer */}
              <div className="pt-3 border-t border-[#E8E4DF] flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowPurchaseModal(false);
                    setSourceRequestId(null);
                  }}
                  className="px-4 py-2 border border-[#E8E4DF] rounded-lg text-xs font-bold text-slate-500 hover:bg-slate-100 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingPurchase}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-black transition-all disabled:opacity-50"
                >
                  {submittingPurchase ? "Submitting..." : "Submit Request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm.show && typeof document !== "undefined" && ReactDOM.createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center" style={{ backgroundColor: "rgba(0,0,0,0.45)" }} onClick={() => setDeleteConfirm({ show: false })}>
          <div
            className="bg-white rounded-2xl shadow-2xl p-6 w-[380px] max-w-[90vw] text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-14 h-14 rounded-full bg-rose-50 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-7 h-7 text-rose-500" />
            </div>
            <h3 className="text-lg font-semibold text-[#1C1C1A] mb-1">Delete Stock Asset</h3>
            <p className="text-sm text-[#9C9890] mb-6">
              Are you sure you want to permanently delete <strong className="text-[#1C1C1A]">{deleteConfirm.assetType}</strong>
              {deleteConfirm.serialNumber ? ` (S/N: ${deleteConfirm.serialNumber})` : ""} from company inventory?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm({ show: false })}
                disabled={deleting}
                className="flex-1 px-4 py-2.5 rounded-xl border border-[#E8E4DF] text-sm font-medium text-[#1C1C1A] hover:bg-[#F5F3F0] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirmed}
                disabled={deleting}
                className="flex-1 px-4 py-2.5 rounded-xl bg-rose-500 text-white text-sm font-medium hover:bg-rose-600 transition-colors shadow-sm disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Yes, Delete"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Edit Asset Modal */}
      {showEditModal && editingAsset && typeof document !== "undefined" && ReactDOM.createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.45)" }}>
          <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col font-sans max-h-[90vh]">
            {/* Header */}
            <div className="p-4 border-b border-[#E8E4DF] flex items-center justify-between">
              <h3 className="text-sm font-black uppercase tracking-wider text-indigo-650 flex items-center gap-1.5">
                <Edit3 className="w-4 h-4 text-indigo-500" /> Edit Asset (ID: {editingAsset.id})
              </h3>
              <button
                onClick={handleCancelEdit}
                className="p-1 rounded hover:bg-slate-100 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Content */}
            <form onSubmit={handleSaveEdit} className="p-5 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                <div>
                  <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Asset ID</label>
                  <input
                    type="text"
                    disabled
                    value={editingAsset.id}
                    className="w-full bg-slate-50 border border-[#E8E4DF] rounded-lg px-3 py-2 text-xs text-[#5D5B57] focus:outline-none font-mono font-semibold cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Old Asset ID / Previous ID</label>
                  <input
                    type="text"
                    placeholder="e.g. OLD-LAP-01"
                    value={editForm.oldAssetId}
                    onChange={(e) => setEditForm(p => ({ ...p, oldAssetId: e.target.value }))}
                    className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] placeholder-[#9C9890] font-mono font-semibold focus:outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Asset Type *</label>
                  <select
                    required
                    value={editForm.assetType}
                    onChange={(e) => setEditForm(p => ({ ...p, assetType: e.target.value }))}
                    className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-semibold"
                  >
                    {dynamicAssetTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Condition</label>
                  <select
                    value={editForm.condition}
                    onChange={(e) => setEditForm(p => ({ ...p, condition: e.target.value }))}
                    className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-semibold"
                  >
                    <option>New</option>
                    <option>Good</option>
                    <option>Fair</option>
                    <option>Needs Repair</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Company Belonging</label>
                  <select
                    value={editForm.companyId}
                    onChange={(e) => setEditForm(p => ({ ...p, companyId: e.target.value }))}
                    className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-2 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-semibold truncate"
                  >
                    <option value="">-- General Stock --</option>
                    {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Status</label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm(p => ({ ...p, status: e.target.value }))}
                    className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-2 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-semibold truncate"
                  >
                    <option>Available</option>
                    <option>In Use</option>
                    <option>Damaged</option>
                    <option>Disposed</option>
                  </select>
                </div>
              </div>

              {/* Dynamic form inputs based on selected type */}
              {(editForm.assetType?.toLowerCase().trim() === "sim card" || editForm.assetType?.toLowerCase().trim() === "sim") ? (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">SIM Mobile Number *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 9876543210"
                      value={editAssetFields.simMobile || ""}
                      onChange={(e) => setEditAssetFields(p => ({ ...p, simMobile: e.target.value }))}
                      className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Telecom Operator *</label>
                    <select
                      value={["Jio", "Airtel", "Vodafone Idea (Vi)", "BSNL"].includes(editAssetFields.simOperator || "") ? editAssetFields.simOperator : "Other"}
                      onChange={(e) => {
                        const val = e.target.value;
                        setEditAssetFields(p => ({ ...p, simOperator: val, simOperatorCustom: val === "Other" ? (p.simOperatorCustom || "") : "" }));
                      }}
                      className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-semibold"
                    >
                      <option value="Jio">Jio</option>
                      <option value="Airtel">Airtel</option>
                      <option value="Vodafone Idea (Vi)">Vodafone Idea (Vi)</option>
                      <option value="BSNL">BSNL</option>
                      <option value="Other">Other</option>
                    </select>
                    {(!["Jio", "Airtel", "Vodafone Idea (Vi)", "BSNL"].includes(editAssetFields.simOperator || "") || editAssetFields.simOperator === "Other") && (
                      <input
                        type="text"
                        placeholder="Specify custom operator..."
                        value={editAssetFields.simOperatorCustom || (editAssetFields.simOperator !== "Other" ? editAssetFields.simOperator : "") || ""}
                        onChange={(e) => setEditAssetFields(p => ({ ...p, simOperatorCustom: e.target.value }))}
                        className="mt-1.5 w-full bg-white border border-[#C9A84C] focus:border-[#C9A84C] rounded-lg px-3 py-1.5 text-xs text-[#1C1C1A] font-semibold"
                      />
                    )}
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Network Type</label>
                    <select
                      value={["5G", "4G", "3G"].includes(editAssetFields.simNetwork || "") ? editAssetFields.simNetwork : "Other"}
                      onChange={(e) => {
                        const val = e.target.value;
                        setEditAssetFields(p => ({ ...p, simNetwork: val, simNetworkCustom: val === "Other" ? (p.simNetworkCustom || "") : "" }));
                      }}
                      className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-semibold"
                    >
                      <option value="5G">5G</option>
                      <option value="4G">4G</option>
                      <option value="3G">3G</option>
                      <option value="Other">Other</option>
                    </select>
                    {(!["5G", "4G", "3G"].includes(editAssetFields.simNetwork || "") || editAssetFields.simNetwork === "Other") && (
                      <input
                        type="text"
                        placeholder="Specify custom network..."
                        value={editAssetFields.simNetworkCustom || (editAssetFields.simNetwork !== "Other" ? editAssetFields.simNetwork : "") || ""}
                        onChange={(e) => setEditAssetFields(p => ({ ...p, simNetworkCustom: e.target.value }))}
                        className="mt-1.5 w-full bg-white border border-[#C9A84C] focus:border-[#C9A84C] rounded-lg px-3 py-1.5 text-xs text-[#1C1C1A] font-semibold"
                      />
                    )}
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">SIM Card Number / ICCID</label>
                    <input
                      type="text"
                      placeholder="e.g. 89910000..."
                      value={editAssetFields.simIccid || ""}
                      onChange={(e) => setEditAssetFields(p => ({ ...p, simIccid: e.target.value }))}
                      className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-mono"
                    />
                  </div>
                </div>
              ) : editForm.assetType?.toLowerCase().trim() === "laptop" ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                        placeholder="e.g. Intel i5, 16GB RAM, 512GB SSD"
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

                  <div className="max-w-md">
                    <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Logged-in Email IDs</label>
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
              ) : editForm.assetType?.toLowerCase().trim() === "mobile phone" ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <div>
                      <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Phone Brand & Model *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Tecno Spark6GO"
                        value={editAssetFields.phoneModel || ""}
                        onChange={(e) => setEditAssetFields(p => ({ ...p, phoneModel: e.target.value }))}
                        className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">IMEI Number 1 *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. 358743619730982"
                        value={editAssetFields.phoneImei1 || ""}
                        onChange={(e) => setEditAssetFields(p => ({ ...p, phoneImei1: e.target.value }))}
                        className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">IMEI Number 2</label>
                      <input
                        type="text"
                        placeholder="e.g. 358743619730990 (Optional)"
                        value={editAssetFields.phoneImei2 || ""}
                        onChange={(e) => setEditAssetFields(p => ({ ...p, phoneImei2: e.target.value }))}
                        className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">RAM & Storage</label>
                      <input
                        type="text"
                        placeholder="e.g. 4GB/64GB"
                        value={editAssetFields.phoneSpecs || ""}
                        onChange={(e) => setEditAssetFields(p => ({ ...p, phoneSpecs: e.target.value }))}
                        className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Phone Lock Passcode / Pattern</label>
                      <input
                        type="text"
                        placeholder="e.g. 1234 / Pattern"
                        value={editAssetFields.phonePassword || ""}
                        onChange={(e) => setEditAssetFields(p => ({ ...p, phonePassword: e.target.value }))}
                        className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-mono"
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="max-w-xs">
                      <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">SIM Slots Used</label>
                      <select
                        value={editAssetFields.phoneSimSlots || "None"}
                        onChange={(e) => setEditAssetFields(p => ({ ...p, phoneSimSlots: e.target.value }))}
                        className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-semibold"
                      >
                        <option value="None">None</option>
                        <option value="1 SIM">1 SIM</option>
                        <option value="2 SIMs">2 SIMs</option>
                      </select>
                    </div>

                    {(editAssetFields.phoneSimSlots === "1 SIM" || editAssetFields.phoneSimSlots === "2 SIMs") && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-[#FCFBF9] border border-[#E8E4DF] p-3 rounded-lg space-y-2">
                          <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold">SIM 1 Config</label>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">SIM 1 Mobile Number *</label>
                              <input
                                type="text"
                                required
                                placeholder="e.g. 9876543210"
                                value={editAssetFields.phoneSim1No || ""}
                                onChange={(e) => setEditAssetFields(p => ({ ...p, phoneSim1No: e.target.value }))}
                                className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-semibold"
                              />
                            </div>
                            <div>
                              <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">SIM 1 Company / Operator</label>
                              <select
                                value={["Jio", "Airtel", "Vodafone Idea (Vi)", "BSNL"].includes(editAssetFields.phoneSim1Operator || "") ? editAssetFields.phoneSim1Operator : "Other"}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setEditAssetFields(p => ({ ...p, phoneSim1Operator: val, phoneSim1OperatorCustom: val === "Other" ? (p.phoneSim1OperatorCustom || "") : "" }));
                                }}
                                className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-semibold"
                              >
                                <option value="Jio">Jio</option>
                                <option value="Airtel">Airtel</option>
                                <option value="Vodafone Idea (Vi)">Vodafone Idea (Vi)</option>
                                <option value="BSNL">BSNL</option>
                                <option value="Other">Other (Custom Company)</option>
                              </select>
                              {(editAssetFields.phoneSim1Operator === "Other" || (!["Jio", "Airtel", "Vodafone Idea (Vi)", "BSNL"].includes(editAssetFields.phoneSim1Operator || "") && editAssetFields.phoneSim1Operator)) && (
                                <input
                                  type="text"
                                  required
                                  placeholder="Enter SIM Company Name..."
                                  value={editAssetFields.phoneSim1OperatorCustom !== undefined ? editAssetFields.phoneSim1OperatorCustom : (["Jio", "Airtel", "Vodafone Idea (Vi)", "BSNL", "Other"].includes(editAssetFields.phoneSim1Operator || "") ? "" : editAssetFields.phoneSim1Operator || "")}
                                  onChange={(e) => setEditAssetFields(p => ({ ...p, phoneSim1OperatorCustom: e.target.value }))}
                                  className="mt-1.5 w-full bg-white border border-[#C9A84C] focus:border-[#C9A84C] rounded-lg px-3 py-1.5 text-xs text-[#1C1C1A] placeholder-[#9C9890] focus:outline-none font-semibold shadow-sm"
                                />
                              )}
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">WhatsApp On?</label>
                              <select
                                value={editAssetFields.phoneSim1Whatsapp || "No"}
                                onChange={(e) => setEditAssetFields(p => ({ ...p, phoneSim1Whatsapp: e.target.value }))}
                                className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-semibold"
                              >
                                <option value="No">No</option>
                                <option value="Yes">Yes</option>
                              </select>
                            </div>
                            {editAssetFields.phoneSim1Whatsapp === "Yes" && (
                              <div>
                                <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">WhatsApp Type</label>
                                <select
                                  value={editAssetFields.phoneSim1WhatsappType || "Personal"}
                                  onChange={(e) => setEditAssetFields(p => ({ ...p, phoneSim1WhatsappType: e.target.value }))}
                                  className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-semibold"
                                >
                                  <option value="Personal">Personal</option>
                                  <option value="Business">Business</option>
                                </select>
                              </div>
                            )}
                          </div>
                        </div>

                        {editAssetFields.phoneSimSlots === "2 SIMs" && (
                          <div className="bg-[#FCFBF9] border border-[#E8E4DF] p-3 rounded-lg space-y-2">
                            <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold">SIM 2 Config</label>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">SIM 2 Mobile Number *</label>
                                <input
                                  type="text"
                                  required
                                  placeholder="e.g. 9876543211"
                                  value={editAssetFields.phoneSim2No || ""}
                                  onChange={(e) => setEditAssetFields(p => ({ ...p, phoneSim2No: e.target.value }))}
                                  className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-semibold"
                                />
                              </div>
                              <div>
                                <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">SIM 2 Company / Operator</label>
                                <select
                                  value={["Jio", "Airtel", "Vodafone Idea (Vi)", "BSNL"].includes(editAssetFields.phoneSim2Operator || "") ? editAssetFields.phoneSim2Operator : "Other"}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setEditAssetFields(p => ({ ...p, phoneSim2Operator: val, phoneSim2OperatorCustom: val === "Other" ? (p.phoneSim2OperatorCustom || "") : "" }));
                                  }}
                                  className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-semibold"
                                >
                                  <option value="Jio">Jio</option>
                                  <option value="Airtel">Airtel</option>
                                  <option value="Vodafone Idea (Vi)">Vodafone Idea (Vi)</option>
                                  <option value="BSNL">BSNL</option>
                                  <option value="Other">Other (Custom Company)</option>
                                </select>
                                {(editAssetFields.phoneSim2Operator === "Other" || (!["Jio", "Airtel", "Vodafone Idea (Vi)", "BSNL"].includes(editAssetFields.phoneSim2Operator || "") && editAssetFields.phoneSim2Operator)) && (
                                  <input
                                    type="text"
                                    required
                                    placeholder="Enter SIM Company Name..."
                                    value={editAssetFields.phoneSim2OperatorCustom !== undefined ? editAssetFields.phoneSim2OperatorCustom : (["Jio", "Airtel", "Vodafone Idea (Vi)", "BSNL", "Other"].includes(editAssetFields.phoneSim2Operator || "") ? "" : editAssetFields.phoneSim2Operator || "")}
                                    onChange={(e) => setEditAssetFields(p => ({ ...p, phoneSim2OperatorCustom: e.target.value }))}
                                    className="mt-1.5 w-full bg-white border border-[#C9A84C] focus:border-[#C9A84C] rounded-lg px-3 py-1.5 text-xs text-[#1C1C1A] placeholder-[#9C9890] focus:outline-none font-semibold shadow-sm"
                                  />
                                )}
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">WhatsApp On?</label>
                                <select
                                  value={editAssetFields.phoneSim2Whatsapp || "No"}
                                  onChange={(e) => setEditAssetFields(p => ({ ...p, phoneSim2Whatsapp: e.target.value }))}
                                  className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-semibold"
                                >
                                  <option value="No">No</option>
                                  <option value="Yes">Yes</option>
                                </select>
                              </div>
                              {editAssetFields.phoneSim2Whatsapp === "Yes" && (
                                <div>
                                  <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">WhatsApp Type</label>
                                  <select
                                    value={editAssetFields.phoneSim2WhatsappType || "Personal"}
                                    onChange={(e) => setEditAssetFields(p => ({ ...p, phoneSim2WhatsappType: e.target.value }))}
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
                  </div>

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

                  <div className="max-w-md">
                    <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Logged-in Email IDs</label>
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
                        className="mt-1 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[10px] font-bold rounded-lg transition-all border border-indigo-155 flex items-center gap-1.5 w-fit"
                      >
                        + Add Email ID
                      </button>
                    </div>
                  </div>
                </div>
              ) : editForm.assetType?.toLowerCase().trim() === "headset / accessories" ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Accessory Name/Brand *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Logitech H390 USB"
                      value={editAssetFields.accName || ""}
                      onChange={(e) => setEditAssetFields(p => ({ ...p, accName: e.target.value }))}
                      className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Accessory Type *</label>
                    <select
                      value={editAssetFields.accType || "Wired"}
                      onChange={(e) => setEditAssetFields(p => ({ ...p, accType: e.target.value }))}
                      className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-semibold"
                    >
                      <option value="Wired">Wired</option>
                      <option value="Wireless Bluetooth">Wireless Bluetooth</option>
                      <option value="USB Dongle">USB Dongle</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Serial Number / Unique ID</label>
                    <input
                      type="text"
                      placeholder="e.g. SN-ACC12345"
                      value={editAssetFields.accSerial || ""}
                      onChange={(e) => setEditAssetFields(p => ({ ...p, accSerial: e.target.value }))}
                      className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-mono"
                    />
                  </div>
                </div>
              ) : editForm.assetType?.toLowerCase().trim() === "id card / lanyard" ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Employee Name / ID *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Rahul Sharma - EMP101"
                      value={editAssetFields.idEmployee || ""}
                      onChange={(e) => setEditAssetFields(p => ({ ...p, idEmployee: e.target.value }))}
                      className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Card ID Number / Barcode *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. ID-887192"
                      value={editAssetFields.idBarcode || ""}
                      onChange={(e) => setEditAssetFields(p => ({ ...p, idBarcode: e.target.value }))}
                      className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-mono font-semibold"
                    />
                  </div>
                </div>
              ) : editForm.assetType?.toLowerCase().trim() === "office chair / table" ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Furniture Description *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Ergonomic Black Mesh Chair, Adjustable Back"
                      value={editAssetFields.furnitureDesc || ""}
                      onChange={(e) => setEditAssetFields(p => ({ ...p, furnitureDesc: e.target.value }))}
                      className="w-full bg-white border border-[#E8E4DF] rounded px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Inventory Tag / Asset Tag</label>
                    <input
                      type="text"
                      placeholder="e.g. TAG-CHR-0042"
                      value={editAssetFields.furnitureTag || ""}
                      onChange={(e) => setEditAssetFields(p => ({ ...p, furnitureTag: e.target.value }))}
                      className="w-full bg-white border border-[#E8E4DF] rounded px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-mono"
                    />
                  </div>
                </div>
              ) : editForm.assetType?.toLowerCase().trim() === "router / networking" ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Router Brand & Model *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. TP-Link Archer C6"
                      value={editAssetFields.routerModel || ""}
                      onChange={(e) => setEditAssetFields(p => ({ ...p, routerModel: e.target.value }))}
                      className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">MAC Address *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 00:1A:2B:3C:4D:5E"
                      value={editAssetFields.routerMac || ""}
                      onChange={(e) => setEditAssetFields(p => ({ ...p, routerMac: e.target.value }))}
                      className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Serial Number</label>
                    <input
                      type="text"
                      placeholder="e.g. SN-RTR99887"
                      value={editAssetFields.routerSerial || ""}
                      onChange={(e) => setEditAssetFields(p => ({ ...p, routerSerial: e.target.value }))}
                      className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-mono"
                    />
                  </div>
                </div>
              ) : editForm.assetType?.toLowerCase().trim() === "printer / scanner" ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Printer Brand & Model *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. HP LaserJet Pro M12w"
                      value={editAssetFields.printerModel || ""}
                      onChange={(e) => setEditAssetFields(p => ({ ...p, printerModel: e.target.value }))}
                      className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Printer Type *</label>
                    <select
                      value={editAssetFields.printerType || "Laser Printer"}
                      onChange={(e) => setEditAssetFields(p => ({ ...p, printerType: e.target.value }))}
                      className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-semibold"
                    >
                      <option value="Laser Printer">Laser Printer</option>
                      <option value="Inkjet Printer">Inkjet Printer</option>
                      <option value="Flatbed Scanner">Flatbed Scanner</option>
                      <option value="Multi-Function Printer">Multi-Function Printer</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Serial Number *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. SN-PRN1928"
                      value={editAssetFields.printerSerial || ""}
                      onChange={(e) => setEditAssetFields(p => ({ ...p, printerSerial: e.target.value }))}
                      className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-mono"
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Asset Detail / Specification *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Dell Latitude 5420, 16GB RAM, 512GB SSD"
                      value={editForm.assetDetail}
                      onChange={(e) => setEditForm(p => ({ ...p, assetDetail: e.target.value }))}
                      className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Serial Number / Unique Identifier</label>
                    <input
                      type="text"
                      placeholder="e.g. SN-H1G4691X, MAC Address, etc."
                      value={editForm.serialNumber}
                      onChange={(e) => setEditForm(p => ({ ...p, serialNumber: e.target.value }))}
                      className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-mono"
                    />
                  </div>
                </div>
              )}

              {/* Purchase Date, Cost & Asset Photo */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Purchase Date</label>
                  <input
                    type="date"
                    value={editForm.purchaseDate}
                    onChange={(e) => setEditForm(p => ({ ...p, purchaseDate: e.target.value }))}
                    className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Purchase Value / Cost</label>
                  <input
                    type="text"
                    placeholder="e.g. ₹45,500"
                    value={editForm.purchaseValue}
                    onChange={(e) => setEditForm(p => ({ ...p, purchaseValue: e.target.value }))}
                    className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Asset Photo</label>
                  <div className="flex gap-4 items-center">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handlePhotoUpload(e, true)}
                      className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-1.5 text-xs text-[#1C1C1A] focus:outline-none transition-all file:mr-4 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                    />
                    {editForm.photoUrl && (
                      <div className="relative w-12 h-12 rounded-lg border border-[#E8E4DF] overflow-hidden bg-slate-50 flex-shrink-0 shadow-sm group">
                        <img src={editForm.photoUrl} alt="Asset preview" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setEditForm(prev => ({ ...prev, photoUrl: "" }))}
                          className="absolute inset-0 bg-black/55 text-white text-[8px] font-black uppercase opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                        >
                          Remove
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Internal Notes */}
              <div>
                <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Internal Notes</label>
                <textarea
                  value={editForm.notes}
                  onChange={(e) => setEditForm(p => ({ ...p, notes: e.target.value }))}
                  rows={2}
                  placeholder="Any vendor details, warranty information, or storage locations..."
                  className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all resize-none"
                />
              </div>

              {/* Footer */}
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
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-black transition-all disabled:opacity-50"
                >
                  {updating ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {viewingAsset && typeof document !== "undefined" && ReactDOM.createPortal(
        <div className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col font-sans max-h-[90vh]">
            {/* Header */}
            <div className="p-4 border-b border-[#E8E4DF] flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-indigo-600" />
                <div>
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Asset Specifications & Details</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-mono font-bold">ID: {viewingAsset.id}</span>
                    {viewingAsset.oldAssetId && (
                      <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-mono font-bold">Old ID: {viewingAsset.oldAssetId}</span>
                    )}
                    <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded font-bold uppercase">{viewingAsset.assetType}</span>
                  </div>
                </div>
              </div>
              <button onClick={() => setViewingAsset(null)} className="p-1 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4 overflow-y-auto text-xs">
              {(() => {
                let parsedCustom: any = {};
                try {
                  parsedCustom = viewingAsset.customFields ? JSON.parse(viewingAsset.customFields) : {};
                } catch (_) {}
                const fields = parsedCustom.assetFields || {};
                const emails = parsedCustom.emailsList || [];
                const companyName = companies.find(c => String(c.id) === String(viewingAsset.companyId))?.name || "General Stock";

                return (
                  <div className="space-y-4">
                    {/* General Specs */}
                    <div className="bg-[#FCFBF9] border border-[#E8E4DF] rounded-xl p-4 space-y-2">
                      <h4 className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider">Asset Information & Hardware</h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 font-semibold text-slate-700">
                        <div><span className="text-[#9C9890] block text-[9px]">DESCRIPTION / MODEL:</span> {viewingAsset.assetDetail || "N/A"}</div>
                        <div><span className="text-[#9C9890] block text-[9px]">SERIAL NUMBER / IMEI:</span> <span className="font-mono">{viewingAsset.serialNumber || "N/A"}</span></div>
                        {fields.phoneImei2 && <div><span className="text-[#9C9890] block text-[9px]">IMEI NUMBER 2:</span> <span className="font-mono">{fields.phoneImei2}</span></div>}
                        {(fields.phoneSpecs || fields.laptopSpecs) && <div><span className="text-[#9C9890] block text-[9px]">RAM & STORAGE / SPECS:</span> {fields.phoneSpecs || fields.laptopSpecs}</div>}
                        {fields.laptopOs && <div><span className="text-[#9C9890] block text-[9px]">OPERATING SYSTEM (OS):</span> {fields.laptopOs}</div>}
                        {fields.laptopHostName && <div><span className="text-[#9C9890] block text-[9px]">HOST NAME:</span> <span className="font-mono font-bold text-indigo-900">{fields.laptopHostName}</span></div>}
                        {fields.laptopCharger && <div><span className="text-[#9C9890] block text-[9px]">CHARGER INCLUDED:</span> {fields.laptopCharger}</div>}
                        {fields.laptopBag && <div><span className="text-[#9C9890] block text-[9px]">BAG & MOUSE:</span> {fields.laptopBag}</div>}
                        {fields.simPlanType && <div><span className="text-[#9C9890] block text-[9px]">SIM PLAN TYPE:</span> {fields.simPlanType}</div>}
                        {fields.simPuk && <div><span className="text-[#9C9890] block text-[9px]">SIM PUK / PIN:</span> <span className="font-mono">{fields.simPuk}</span></div>}
                        {fields.routerWifiSsid && <div><span className="text-[#9C9890] block text-[9px]">WI-FI SSID & PASS:</span> {fields.routerWifiSsid}</div>}
                        {fields.routerIp && <div><span className="text-[#9C9890] block text-[9px]">ADMIN IP:</span> <span className="font-mono">{fields.routerIp}</span></div>}
                        {fields.printerCartridge && <div><span className="text-[#9C9890] block text-[9px]">TONER / CARTRIDGE:</span> <span className="font-bold text-amber-900">{fields.printerCartridge}</span></div>}
                        {fields.furnitureLocation && <div><span className="text-[#9C9890] block text-[9px]">LOCATION / CABIN:</span> {fields.furnitureLocation}</div>}
                        <div><span className="text-[#9C9890] block text-[9px]">CONDITION:</span> {viewingAsset.condition || "Good"}</div>
                        <div><span className="text-[#9C9890] block text-[9px]">STATUS:</span> {viewingAsset.status || "Available"}</div>
                      </div>
                    </div>

                    {/* Passwords & Access */}
                    {(fields.phonePassword || fields.laptopPassword || emails.length > 0) && (
                      <div className="bg-amber-50/50 border border-amber-200/60 rounded-xl p-4 space-y-2">
                        <h4 className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">Passwords & Accounts</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 font-semibold text-slate-700">
                          {fields.phonePassword && (
                            <div><span className="text-amber-900/60 block text-[9px]">PHONE SCREEN LOCK PASSCODE:</span> <span className="font-mono bg-white px-2 py-0.5 rounded border border-amber-200 font-bold text-amber-900">{fields.phonePassword}</span></div>
                          )}
                          {fields.laptopPassword && (
                            <div><span className="text-amber-900/60 block text-[9px]">LAPTOP ADMIN PASSCODE:</span> <span className="font-mono bg-white px-2 py-0.5 rounded border border-amber-200 font-bold text-amber-900">{fields.laptopPassword}</span></div>
                          )}
                          {emails.length > 0 && (
                            <div className="col-span-2"><span className="text-amber-900/60 block text-[9px]">LOGGED-IN EMAIL ACCOUNTS:</span> {emails.filter(Boolean).join(", ")}</div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* SIM & Operator Config */}
                    {(() => {
                      const notesStr = viewingAsset.notes || "";
                      const sim1OpFromNotes = notesStr.match(/SIM 1[^\[]*\[Company:\s*([^\]]+)\]/i)?.[1] || notesStr.match(/\[Company:\s*([^\]]+)\]/i)?.[1] || "";
                      const sim2OpFromNotes = notesStr.match(/SIM 2[^\[]*\[Company:\s*([^\]]+)\]/i)?.[1] || "";

                      const sim1Op = fields.phoneSim1OperatorCustom || (fields.phoneSim1Operator && fields.phoneSim1Operator !== "Other" ? fields.phoneSim1Operator : "") || sim1OpFromNotes || (fields.phoneSim1Operator !== "Other" ? fields.phoneSim1Operator : "") || fields.simOperator || "";
                      const sim2Op = fields.phoneSim2OperatorCustom || (fields.phoneSim2Operator && fields.phoneSim2Operator !== "Other" ? fields.phoneSim2Operator : "") || sim2OpFromNotes || (fields.phoneSim2Operator !== "Other" ? fields.phoneSim2Operator : "") || "";

                      const sim1No = fields.phoneSim1No || notesStr.match(/SIM 1 (?:Mobile No|No|Number|CONFIG):\s*([0-9\s+]+)/i)?.[1] || notesStr.match(/SIM 1:\s*([0-9\s+]+)/i)?.[1] || "";
                      const sim2No = fields.phoneSim2No || notesStr.match(/SIM 2 (?:Mobile No|No|Number|CONFIG):\s*([0-9\s+]+)/i)?.[1] || notesStr.match(/SIM 2:\s*([0-9\s+]+)/i)?.[1] || "";

                      const sim1Wa = fields.phoneSim1Whatsapp || notesStr.match(/SIM 1[^\[]*\[WhatsApp:\s*([^\]]+)\]/i)?.[1] || "";
                      const sim2Wa = fields.phoneSim2Whatsapp || notesStr.match(/SIM 2[^\[]*\[WhatsApp:\s*([^\]]+)\]/i)?.[1] || "";

                      if (!fields.simOperator && !sim1No && !sim2No && !sim1Op && !sim2Op) return null;

                      return (
                        <div className="bg-sky-50/50 border border-sky-200/60 rounded-xl p-4 space-y-2">
                          <h4 className="text-[10px] font-bold text-sky-800 uppercase tracking-wider">SIM Card & Operator Details</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 font-semibold text-slate-700">
                            {fields.simOperator && <div><span className="text-sky-900/60 block text-[9px]">TELECOM OPERATOR / COMPANY:</span> <span className="font-bold text-sky-900">{fields.simOperator}</span></div>}
                            {(sim1No || sim1Op) && (
                              <div>
                                <span className="text-sky-900/60 block text-[9px]">SIM 1 CONFIG:</span> 
                                <span className="font-mono font-bold text-slate-900">{sim1No || "N/A"}</span>
                                {sim1Op ? <span className="ml-1.5 text-sky-800 font-bold bg-white px-2 py-0.5 rounded border border-sky-200 shadow-xs">({sim1Op})</span> : ""}
                                {sim1Wa ? <span className="ml-1.5 text-[10px] text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">[WhatsApp: {sim1Wa}]</span> : ""}
                              </div>
                            )}
                            {(sim2No || sim2Op) && (
                              <div>
                                <span className="text-sky-900/60 block text-[9px]">SIM 2 CONFIG:</span> 
                                <span className="font-mono font-bold text-slate-900">{sim2No || "N/A"}</span>
                                {sim2Op ? <span className="ml-1.5 text-sky-800 font-bold bg-white px-2 py-0.5 rounded border border-sky-200 shadow-xs">({sim2Op})</span> : ""}
                                {sim2Wa ? <span className="ml-1.5 text-[10px] text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">[WhatsApp: {sim2Wa}]</span> : ""}
                              </div>
                            )}
                            {fields.simIccid && <div><span className="text-sky-900/60 block text-[9px]">SIM ICCID / BARCODE:</span> <span className="font-mono">{fields.simIccid}</span></div>}
                            {(fields.phoneExternalWhatsappNo || notesStr.match(/External WhatsApp:\s*([0-9\s+]+)/i)?.[1]) && (
                              <div className="col-span-2 bg-emerald-50/70 border border-emerald-200/80 p-2.5 rounded-lg">
                                <span className="text-emerald-900/70 block text-[9px] font-bold">EXTERNAL / STANDALONE WHATSAPP (WITHOUT PHYSICAL SIM):</span>
                                <span className="font-mono font-bold text-emerald-900 text-xs">
                                  {fields.phoneExternalWhatsappNo || notesStr.match(/External WhatsApp:\s*([0-9\s+]+)/i)?.[1]}
                                </span>
                                <span className="ml-2 text-[10px] bg-white text-emerald-800 font-bold px-2 py-0.5 rounded border border-emerald-200 shadow-xs">
                                  Type: {fields.phoneExternalWhatsappType || "Business"}
                                </span>
                                {(fields.phoneExternalWhatsappLabel || notesStr.match(/External WhatsApp:[^\[]*\[Label:\s*([^\]]+)\]/i)?.[1]) && (
                                  <span className="ml-2 text-[10px] text-slate-600 font-semibold">
                                    ({fields.phoneExternalWhatsappLabel || notesStr.match(/External WhatsApp:[^\[]*\[Label:\s*([^\]]+)\]/i)?.[1]})
                                  </span>
                                )}
                              </div>
                            )}
                            {(fields.phoneSocialMediaUsername || notesStr.match(/Social Media App:\s*([^\n]+)/i)?.[1]) && (
                              <div className="col-span-2 bg-purple-50/70 border border-purple-200/80 p-2.5 rounded-lg">
                                <span className="text-purple-900/70 block text-[9px] font-bold">LOGGED-IN SOCIAL MEDIA ACCOUNT:</span>
                                <span className="font-bold text-purple-950 text-xs">
                                  {fields.phoneSocialMediaAppCustom || (fields.phoneSocialMediaApp && fields.phoneSocialMediaApp !== "Other" ? fields.phoneSocialMediaApp : "") || notesStr.match(/Social Media App:\s*([^\(]+)/i)?.[1]?.trim() || "Social Media"}
                                </span>
                                <span className="ml-2 font-mono font-bold text-purple-900 text-xs bg-white px-2 py-0.5 rounded border border-purple-200 shadow-xs">
                                  {fields.phoneSocialMediaUsername || notesStr.match(/Social Media App:[^\(]*\(([^\)]+)\)/i)?.[1]}
                                </span>
                                {fields.phoneSocialMediaPassword && (
                                  <span className="ml-2 text-[10px] font-mono font-bold text-amber-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                    [Pass: {fields.phoneSocialMediaPassword}]
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Ownership & Purchase */}
                    <div className="bg-slate-50 border border-[#E8E4DF] rounded-xl p-4 space-y-2">
                      <h4 className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">Ownership & Purchase Details</h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 font-semibold text-slate-700">
                        <div><span className="text-[#9C9890] block text-[9px]">COMPANY BELONGING:</span> {companyName}</div>
                        <div><span className="text-[#9C9890] block text-[9px]">PURCHASE DATE:</span> {formatDateDDMMYY(viewingAsset.purchaseDate) || "N/A"}</div>
                        <div><span className="text-[#9C9890] block text-[9px]">PURCHASE COST:</span> {viewingAsset.purchaseValue || "N/A"}</div>
                        <div><span className="text-[#9C9890] block text-[9px]">REGISTERED BY:</span> {viewingAsset.registeredBy || "System"}</div>
                      </div>
                    </div>

                    {/* Photo & Internal Notes */}
                    {viewingAsset.photoUrl && (
                      <div>
                        <span className="text-[#9C9890] block text-[9px] font-bold mb-1 uppercase">ASSET PHOTO PREVIEW:</span>
                        <img src={viewingAsset.photoUrl} alt="Asset photo" className="w-48 h-36 object-cover rounded-xl border border-[#E8E4DF] shadow-sm" />
                      </div>
                    )}

                    {viewingAsset.notes && (
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                        <span className="text-[#9C9890] block text-[9px] font-bold uppercase mb-1">INTERNAL NOTES / WARRANTY:</span>
                        <p className="whitespace-pre-wrap text-slate-700 font-medium">{viewingAsset.notes}</p>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-[#E8E4DF] flex justify-end gap-2">
              <button onClick={() => setViewingAsset(null)} className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-lg transition-all">
                Close
              </button>
              <button onClick={() => { const a = viewingAsset; setViewingAsset(null); handleStartEdit(a); }} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-all flex items-center gap-1">
                <Edit3 className="w-3.5 h-3.5" /> Edit Asset
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {previewImageUrl && typeof document !== "undefined" && ReactDOM.createPortal(
        <div 
          className="fixed inset-0 z-[10000] bg-black/20 backdrop-blur-md flex items-center justify-center p-4 transition-all duration-300"
          onClick={() => setPreviewImageUrl(null)}
        >
          <div 
            className="relative max-w-4xl max-h-[90vh] bg-white border border-[#E8E4DF] rounded-2xl overflow-hidden shadow-2xl flex flex-col p-2"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setPreviewImageUrl(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-black/40 hover:bg-black/60 text-white/90 hover:text-white transition-all shadow-md z-10"
              title="Close Preview"
            >
              <X className="w-5 h-5" />
            </button>
            <img 
              src={previewImageUrl} 
              alt="Asset Preview" 
              className="max-w-full max-h-[80vh] object-contain rounded-lg"
            />
          </div>
        </div>,
        document.body
      )}

      {assigningAsset && typeof document !== "undefined" && ReactDOM.createPortal(
        <div className="fixed inset-0 z-[10000] bg-black/25 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-start justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">{assigningAsset.assignedToUserId ? "Transfer Inventory Asset" : "Assign Inventory Asset"}</h3>
                <p className="text-xs text-slate-500 mt-1">
                  {assigningAsset.assetType} · {assigningAsset.assetDetail || assigningAsset.id}
                </p>
              </div>
              <button onClick={() => setAssigningAsset(null)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-[10px] uppercase tracking-wider font-bold text-slate-500 mb-1.5">
                  Select Employee
                </label>
                <select
                  value={assignmentUserId}
                  onChange={(event) => setAssignmentUserId(event.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm font-semibold outline-none focus:border-indigo-500"
                >
                  <option value="">-- Select Employee --</option>
                  {[...employees]
                    .sort((a: any, b: any) => String(a.name || "").localeCompare(String(b.name || "")))
                    .map((employee: any) => (
                      <option key={employee.id} value={employee.id}>
                        {employee.name} {employee.employeeProfile?.employeeId ? `(${employee.employeeProfile.employeeId})` : ""}
                      </option>
                    ))}
                </select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase tracking-wider font-bold text-slate-500 mb-1.5">Assigned Date *</label>
                  <input type="date" required value={assignmentDate} onChange={(e) => setAssignmentDate(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm font-semibold" />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-wider font-bold text-slate-500 mb-1.5">Handover Date</label>
                  <input type="date" value={assignmentHandoverDate} onChange={(e) => setAssignmentHandoverDate(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm font-semibold" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-wider font-bold text-slate-500 mb-1.5">Assignment / Handover Note</label>
                <textarea value={assignmentNotes} onChange={(e) => setAssignmentNotes(e.target.value)} rows={3} placeholder="Condition, accessories, handover remarks..." className="w-full resize-none border border-slate-300 rounded-lg px-3 py-2.5 text-sm" />
              </div>
              <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-3 text-xs text-indigo-800">
                Assignment save hote hi Inventory status “In Use” ho jayega aur employee Assets Registry mein asset dikhne lagega.
              </div>
            </div>
            <div className="px-5 py-4 border-t border-slate-200 flex justify-end gap-2">
              <button onClick={() => setAssigningAsset(null)} className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 rounded-lg">
                Cancel
              </button>
              <button
                onClick={handleAssignmentSave}
                disabled={!assignmentUserId || savingAssignment}
                className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg flex items-center gap-1.5"
              >
                <UserPlus className="w-3.5 h-3.5" />
                {savingAssignment ? "Saving..." : assigningAsset.assignedToUserId ? "Transfer Asset" : "Assign Asset"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {historyAsset && typeof document !== "undefined" && ReactDOM.createPortal(
        <div className="fixed inset-0 z-[10000] bg-black/25 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-3xl max-h-[85vh] bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col">
            <div className="px-5 py-4 border-b border-slate-200 flex items-start justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2"><History className="w-4 h-4 text-violet-600" /> Asset Assignment History</h3>
                <p className="text-xs text-slate-500 mt-1">{historyAsset.id} · {historyAsset.assetType} · {historyAsset.assetDetail || "Asset"}</p>
              </div>
              <button onClick={() => setHistoryAsset(null)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-5 overflow-y-auto">
              {(historyAsset.assignmentHistory || []).length === 0 ? (
                <div className="py-10 text-center text-sm text-slate-500">Is asset ke liye abhi koi assignment event record nahi hai.</div>
              ) : (
                <div className="space-y-3">
                  {(historyAsset.assignmentHistory || []).map((entry: any) => (
                    <div key={entry.id} className="border border-slate-200 rounded-xl p-4 bg-slate-50/60">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="px-2 py-1 rounded-full bg-violet-100 text-violet-800 text-[10px] font-bold uppercase">{entry.action}</span>
                        <span className="text-[10px] text-slate-500">{entry.createdAt ? new Date(entry.createdAt).toLocaleString("en-IN") : "Legacy record"}</span>
                      </div>
                      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        <div><span className="text-slate-400 block text-[9px] uppercase font-bold">From</span>{entry.fromUserName || "Available Stock"}</div>
                        <div><span className="text-slate-400 block text-[9px] uppercase font-bold">To</span>{entry.toUserName || "Available Stock"}</div>
                        <div><span className="text-slate-400 block text-[9px] uppercase font-bold">Assigned Date</span>{entry.assignedDate ? new Date(entry.assignedDate).toLocaleDateString("en-IN") : "—"}</div>
                        <div><span className="text-slate-400 block text-[9px] uppercase font-bold">Handover Date</span>{entry.handoverDate ? new Date(entry.handoverDate).toLocaleDateString("en-IN") : "—"}</div>
                        <div><span className="text-slate-400 block text-[9px] uppercase font-bold">Updated By</span>{entry.performedBy || "System"}</div>
                        {entry.notes && <div><span className="text-slate-400 block text-[9px] uppercase font-bold">Note</span>{entry.notes}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="px-5 py-4 border-t border-slate-200 flex justify-end">
              <button onClick={() => setHistoryAsset(null)} className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-lg">Close History</button>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
