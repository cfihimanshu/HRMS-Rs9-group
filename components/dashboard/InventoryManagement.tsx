"use client";
import React, { useState, useEffect, useCallback } from "react";
import ReactDOM from "react-dom";
import {
  Search, Edit3, Check, X, RefreshCw, Cpu, Layers, Building2,
  Trash2, AlertTriangle, PlusCircle, PackagePlus, Package,
  Sparkles, Filter, Calendar, Coins, CheckCircle, HelpCircle
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
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCompany, setSelectedCompany] = useState("all");
  const [selectedCondition, setSelectedCondition] = useState("all");
  const [selectedType, setSelectedType] = useState("all");

  // Editing state
  const [editingAssetId, setEditingAssetId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
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
  const [purchaseForm, setPurchaseForm] = useState({
    asset_type: "Laptop",
    asset_detail: "",
    estimated_cost: "",
    vendor_details: "",
    justification: "",
    company_id: "",
    asset_id: ""
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
        const match = item.id.trim().match(regex);
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
        const match = req.asset_id.trim().match(regex);
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
      const invRes = await fetch("/api/assets/inventory");
      const invData = await invRes.json();

      // Fetch companies
      const compRes = await fetch("/api/companies");
      const compData = await compRes.json();

      if (invRes.ok) setInventory(invData.data || []);
      if (compRes.ok) setCompanies(compData.data || []);
    } catch (error) {
      console.error("Error fetching inventory data:", error);
      triggerToast("Failed to load inventory data");
    } finally {
      setLoading(false);
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
          asset_id: ""
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
        asset_id: ""
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

      // Logged-in Emails
      const filteredEmails = emailsList.map(e => e.trim()).filter(Boolean);
      if (filteredEmails.length > 0) {
        finalNotes = `Logged-in Emails: ${filteredEmails.join(", ")}${registerForm.notes ? `\n${registerForm.notes}` : ""}`;
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

      // Logged-in Emails & SIMs
      const filteredEmails = emailsList.map(e => e.trim()).filter(Boolean);
      let mobileInfo = "";
      if (filteredEmails.length > 0) {
        mobileInfo += `Logged-in Emails: ${filteredEmails.join(", ")}\n`;
      }
      if (simSlots !== "None") {
        mobileInfo += `SIM Slots Used: ${simSlots}\n`;
        if (sim1No) {
          const wa1 = assetFields.phoneSim1Whatsapp || "No";
          const wa1Type = wa1 === "Yes" ? ` (${assetFields.phoneSim1WhatsappType || "Personal"})` : "";
          mobileInfo += `SIM 1 Mobile No: ${sim1No} [WhatsApp: ${wa1}${wa1Type}]\n`;
        }
        if (sim2No) {
          const wa2 = assetFields.phoneSim2Whatsapp || "No";
          const wa2Type = wa2 === "Yes" ? ` (${assetFields.phoneSim2WhatsappType || "Personal"})` : "";
          mobileInfo += `SIM 2 Mobile No: ${sim2No} [WhatsApp: ${wa2}${wa2Type}]\n`;
        }
      } else {
        mobileInfo += `SIM Slots Used: None\n`;
      }

      if (mobileInfo) {
        finalNotes = `${mobileInfo}${registerForm.notes ? `\n${registerForm.notes}` : ""}`;
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

      // Logged-in Emails
      const filteredEmails = editEmailsList.map(e => e.trim()).filter(Boolean);
      if (filteredEmails.length > 0) {
        finalNotes = `Logged-in Emails: ${filteredEmails.join(", ")}${editForm.notes ? `\n${editForm.notes}` : ""}`;
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

      // Logged-in Emails & SIMs
      const filteredEmails = editEmailsList.map(e => e.trim()).filter(Boolean);
      let mobileInfo = "";
      if (filteredEmails.length > 0) {
        mobileInfo += `Logged-in Emails: ${filteredEmails.join(", ")}\n`;
      }
      if (simSlots !== "None") {
        mobileInfo += `SIM Slots Used: ${simSlots}\n`;
        if (sim1No) {
          const wa1 = editAssetFields.phoneSim1Whatsapp || "No";
          const wa1Type = wa1 === "Yes" ? ` (${editAssetFields.phoneSim1WhatsappType || "Personal"})` : "";
          mobileInfo += `SIM 1 Mobile No: ${sim1No} [WhatsApp: ${wa1}${wa1Type}]\n`;
        }
        if (sim2No) {
          const wa2 = editAssetFields.phoneSim2Whatsapp || "No";
          const wa2Type = wa2 === "Yes" ? ` (${editAssetFields.phoneSim2WhatsappType || "Personal"})` : "";
          mobileInfo += `SIM 2 Mobile No: ${sim2No} [WhatsApp: ${wa2}${wa2Type}]\n`;
        }
      } else {
        mobileInfo += `SIM Slots Used: None\n`;
      }

      if (mobileInfo) {
        finalNotes = `${mobileInfo}${editForm.notes ? `\n${editForm.notes}` : ""}`;
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
    // 1. Search Query (Detail, Serial, Notes)
    const query = searchQuery.toLowerCase();
    const detailMatch = asset.assetDetail?.toLowerCase().includes(query);
    const typeMatch = asset.assetType?.toLowerCase().includes(query);
    const snMatch = asset.serialNumber?.toLowerCase().includes(query);
    const noteMatch = asset.notes?.toLowerCase().includes(query);
    const matchesSearch = !searchQuery || detailMatch || typeMatch || snMatch || noteMatch;

    // 2. Company Filter
    const matchesCompany = selectedCompany === "all" || String(asset.companyId) === String(selectedCompany);

    // 3. Condition Filter
    const matchesCondition = selectedCondition === "all" || asset.condition === selectedCondition;

    // 4. Asset Type Filter
    const matchesType = selectedType === "all" || asset.assetType === selectedType;

    return matchesSearch && matchesCompany && matchesCondition && matchesType;
  });

  // Calculate quick stats
  const totalCount = filteredInventory.length;
  const availableCount = filteredInventory.filter(a => a.status === "Available").length;
  const newCount = filteredInventory.filter(a => a.condition === "New").length;
  const inUseCount = filteredInventory.filter(a => a.status === "In Use").length;

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
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                  </select>
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
                  </select>
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
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Phone Brand & Model *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Samsung Galaxy S23"
                      value={assetFields.phoneModel || ""}
                      onChange={(e) => setAssetFields(p => ({ ...p, phoneModel: e.target.value }))}
                      className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">IMEI Number 1 *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 358901234567890"
                      value={assetFields.phoneImei1 || ""}
                      onChange={(e) => setAssetFields(p => ({ ...p, phoneImei1: e.target.value }))}
                      className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">IMEI Number 2</label>
                    <input
                      type="text"
                      placeholder="e.g. 358901234567891 (Optional)"
                      value={assetFields.phoneImei2 || ""}
                      onChange={(e) => setAssetFields(p => ({ ...p, phoneImei2: e.target.value }))}
                      className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">RAM & Storage</label>
                    <input
                      type="text"
                      placeholder="e.g. 8GB/128GB"
                      value={assetFields.phoneSpecs || ""}
                      onChange={(e) => setAssetFields(p => ({ ...p, phoneSpecs: e.target.value }))}
                      className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-semibold"
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            ) : typeClean === "printer / scanner" ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                  </select>
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Purchase Date</label>
                <input
                  type="date"
                  value={registerForm.purchaseDate}
                  onChange={(e) => setRegisterForm(p => ({ ...p, purchaseDate: e.target.value }))}
                  className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all"
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
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-[#FCFBF9] border border-[#E8E4DF] p-4 rounded-xl">
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
            <option>Laptop</option>
            <option>Mobile Phone</option>
            <option>SIM Card</option>
            <option>Headset / Accessories</option>
            <option>ID Card / Lanyard</option>
            <option>Office Chair / Table</option>
            <option>Router / Networking</option>
            <option>Printer / Scanner</option>
            <option>Other</option>
          </select>
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
                    <tr key={asset.id} className="hover:bg-white transition-colors">
                      {/* Asset Category */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <div className="flex flex-col gap-1 items-start">
                          <span className="text-[10px] bg-slate-100 text-[#5D5B57] px-2 py-0.5 rounded font-mono font-bold border border-slate-200">
                            ID: {asset.id}
                          </span>
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-bold border border-indigo-100 uppercase tracking-wide">
                            <Cpu className="w-3 h-3" /> {asset.assetType}
                          </span>
                        </div>
                      </td>

                      {/* Detail & Serial */}
                      <td className="py-4 px-4">
                        <div className="flex gap-3 items-start">
                          {asset.photoUrl && (
                            <div className="w-12 h-12 rounded-lg border border-[#E8E4DF] overflow-hidden bg-slate-50 flex-shrink-0 shadow-sm cursor-pointer hover:scale-105 transition-transform" onClick={() => setPreviewImageUrl(asset.photoUrl)}>
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
                        <span className={cn(
                          "inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold border uppercase tracking-wider",
                          asset.status === "Available" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                            asset.status === "In Use" ? "bg-amber-50 text-amber-700 border-amber-200" :
                              "bg-rose-50 text-rose-700 border-rose-200"
                        )}>
                          {asset.status || "Available"}
                        </span>
                      </td>

                      {/* Purchase details */}
                      <td className="py-4 px-4">
                        <div>
                          <div className="font-semibold text-slate-700">{asset.purchaseValue || "—"}</div>
                          {asset.purchaseDate && (
                            <div className="text-[9px] text-[#9C9890] font-semibold mt-0.5 flex items-center gap-1">
                              <Calendar className="w-2.5 h-2.5" /> {asset.purchaseDate}
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
                      <td className="py-4 px-4 text-center whitespace-nowrap">
                        <div className="flex justify-center items-center gap-1.5">
                          <button
                            onClick={() => handleStartEdit(asset)}
                            className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[#C9A84C] hover:text-white border border-[#C9A84C]/35 hover:bg-[#C9A84C] rounded-lg transition-all flex items-center gap-1"
                          >
                            <Edit3 className="w-3 h-3" /> Edit
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
                      <th className="p-3">Cost</th>
                      <th className="p-3">Vendor</th>
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
                        <td className="p-3 max-w-[200px] truncate">{req.asset_detail}</td>
                        <td className="p-3 font-bold text-[#1C1C1A]">₹{req.estimated_cost}</td>
                        <td className="p-3">{req.vendor_details}</td>
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

              <div className="grid grid-cols-2 gap-3">
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
                  <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-black mb-1">Vendor / Sourced From *</label>
                  <input
                    type="text"
                    placeholder="e.g. Amazon / Local Store"
                    required
                    value={purchaseForm.vendor_details}
                    onChange={(e) => setPurchaseForm(p => ({ ...p, vendor_details: e.target.value }))}
                    className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] placeholder-[#9C9890] focus:outline-none transition-all font-semibold"
                  />
                </div>
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
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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
                    className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-semibold"
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
                    className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-semibold"
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
                      value={editAssetFields.simOperator || "Jio"}
                      onChange={(e) => setEditAssetFields(p => ({ ...p, simOperator: e.target.value }))}
                      className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-semibold"
                    >
                      <option value="Jio">Jio</option>
                      <option value="Airtel">Airtel</option>
                      <option value="Vodafone Idea (Vi)">Vodafone Idea (Vi)</option>
                      <option value="BSNL">BSNL</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Network Type</label>
                    <select
                      value={editAssetFields.simNetwork || "5G"}
                      onChange={(e) => setEditAssetFields(p => ({ ...p, simNetwork: e.target.value }))}
                      className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-semibold"
                    >
                      <option value="5G">5G</option>
                      <option value="4G">4G</option>
                      <option value="3G">3G</option>
                    </select>
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
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
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
                      <div className="bg-[#FCFBF9] border border-[#E8E4DF] p-3 rounded-lg space-y-2">
                        <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold">SIM 1 Config</label>
                        <div>
                          <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">SIM 1 Mobile Number *</label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. 9876543210"
                            value={editAssetFields.phoneSim1No || ""}
                            onChange={(e) => setEditAssetFields(p => ({ ...p, phoneSim1No: e.target.value }))}
                            className="w-full bg-white border border-[#E8E4DF] p-3 rounded-lg text-xs text-[#1C1C1A] focus:outline-none transition-all font-semibold"
                          />
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
                    )}
                    {editAssetFields.phoneSimSlots === "2 SIMs" && (
                      <div className="bg-[#FCFBF9] border border-[#E8E4DF] p-3 rounded-lg space-y-2">
                        <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold">SIM 2 Config</label>
                        <div>
                          <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">SIM 2 Mobile Number *</label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. 9876543211"
                            value={editAssetFields.phoneSim2No || ""}
                            onChange={(e) => setEditAssetFields(p => ({ ...p, phoneSim2No: e.target.value }))}
                            className="w-full bg-white border border-[#E8E4DF] p-3 rounded-lg text-xs text-[#1C1C1A] focus:outline-none transition-all font-semibold"
                          />
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

              {/* Purchase Date & Value */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Purchase Date</label>
                  <input
                    type="date"
                    value={editForm.purchaseDate}
                    onChange={(e) => setEditForm(p => ({ ...p, purchaseDate: e.target.value }))}
                    className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all"
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
              </div>

              {/* Asset Photo */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

      {previewImageUrl && typeof document !== "undefined" && ReactDOM.createPortal(
        <div 
          className="fixed inset-0 z-[10000] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 transition-all duration-300"
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

    </div>
  );
}
