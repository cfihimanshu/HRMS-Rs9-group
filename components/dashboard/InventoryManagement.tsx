"use client";
import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import ReactDOM from "react-dom";
import QRCode from "qrcode";
import {
  Search, Edit3, Check, X, RefreshCw, Cpu, Layers, Building2,
  Trash2, AlertTriangle, PlusCircle, PackagePlus, Package,
  Sparkles, Filter, Calendar, Coins, CheckCircle, HelpCircle, Download,
  UserPlus, UserMinus, History, ArrowRightLeft, QrCode, Printer, Camera,
  FileCheck, ExternalLink, Copy
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

  // QR Code & Scanner states
  const [qrModalAsset, setQrModalAsset] = useState<any>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [showScannerModal, setShowScannerModal] = useState<boolean>(false);
  const [scanInputValue, setScanInputValue] = useState<string>("");
  const [scannerCameraActive, setScannerCameraActive] = useState<boolean>(false);
  const [printableMode, setPrintableMode] = useState<"label" | "pdf">("label");
  const scannerVideoRef = useRef<HTMLVideoElement | null>(null);

  // Multi-selection for Bulk QR Code Printing
  const [isBulkSelectMode, setIsBulkSelectMode] = useState<boolean>(false);
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([]);
  const [bulkQrDataMap, setBulkQrDataMap] = useState<Record<string, string>>({});
  const [isBulkPrinting, setIsBulkPrinting] = useState<boolean>(false);

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
    photoUrl: "",
    installationLocation: ""
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
    photoUrl: "",
    installationLocation: ""
  });
  const [submittingRegister, setSubmittingRegister] = useState(false);
  const [isCustomRegisterType, setIsCustomRegisterType] = useState(false);
  const [isCustomEditType, setIsCustomEditType] = useState(false);

  // Dynamic Asset Type Custom Fields State
  const [assetFields, setAssetFields] = useState<Record<string, string>>({});
  const [emailsList, setEmailsList] = useState<string[]>([""]);

  const defaultTypes = [
    "Laptop",
    "Air Conditioner (AC)",
    "Computer",
    "Mouse",
    "CPU",
    "Keyboard",
    "Monitor / Display",
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
    return combined.sort((a, b) => {
      const indexA = defaultTypes.indexOf(a);
      const indexB = defaultTypes.indexOf(b);
      if (indexA !== -1 && indexB !== -1) return indexA - indexB;
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;
      return a.localeCompare(b);
    });
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
  const [customEmployeeName, setCustomEmployeeName] = useState("");
  const [isCustomEmployee, setIsCustomEmployee] = useState(false);
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
    } else if (typeClean.startsWith("computer") || typeClean.startsWith("desktop") || typeClean === "pc") {
      prefix = "COM";
    } else if (typeClean.startsWith("cpu")) {
      prefix = "CPU";
    } else if (typeClean.startsWith("mouse")) {
      prefix = "MOU";
    } else if (typeClean.startsWith("keyboard")) {
      prefix = "KBD";
    } else if (typeClean.startsWith("monitor") || typeClean.startsWith("display")) {
      prefix = "MON";
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
    } else if (typeClean === "computer" || typeClean === "desktop computer" || typeClean === "pc") {
      setAssetFields({
        compModel: "",
        compSpecs: "",
        compSerial: "",
        compOs: "Windows 11 Pro",
        compHostName: "",
        compMonitor: "",
        compPassword: ""
      });
    } else if (typeClean === "cpu" || typeClean === "cpu tower" || typeClean === "cabinet") {
      setAssetFields({
        cpuModel: "",
        cpuSpecs: "",
        cpuSerial: "",
        cpuGraphics: "",
        cpuPassword: ""
      });
    } else if (typeClean === "mouse") {
      setAssetFields({
        mouseBrand: "",
        mouseType: "Wired USB",
        mouseSerial: ""
      });
    } else if (typeClean === "keyboard") {
      setAssetFields({
        kbBrand: "",
        kbType: "Wired USB",
        kbSerial: ""
      });
    } else if (typeClean === "monitor / display" || typeClean === "monitor" || typeClean === "display") {
      setAssetFields({
        monBrand: "",
        monSize: "21.5 Inch",
        monResolution: "Full HD (1080p)",
        monSerial: ""
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
    } else if (typeClean?.includes("ac") || typeClean?.includes("air conditioner")) {
      setAssetFields({
        acModel: "",
        acTypeTonnage: "1.5 Ton Split AC",
        acLocation: "",
        acIndoorSerial: "",
        acOutdoorSerial: "",
        acCondition: "Excellent Cooling",
        acServicingStatus: "Done (Serviced)",
        acLastServicingDate: "",
        acServicingCost: "",
        acServicingVendor: "",
        acInsuranceStatus: "Not Insured",
        acInsuranceDetails: "",
        acInsuranceExpiry: "",
        acWarrantyDetails: ""
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
      if (employeeRes.ok) setEmployees((employeeData.data || []).filter((employee: any) => !employee.status || String(employee.status).toLowerCase() === "active"));
    } catch (error) {
      console.error("Error fetching inventory data:", error);
      triggerToast("Failed to load inventory data");
    } finally {
      setLoading(false);
    }
  };

  // Helper to build enriched concise plain-text QR payload (scans in 0.1s on any camera app)
  const getAssetQrPayloadText = (asset: any) => {
    if (!asset) return "";

    let parsedCustom: any = {};
    try {
      parsedCustom = asset.customFields ? JSON.parse(asset.customFields) : {};
    } catch (_) {}

    const fields = parsedCustom.assetFields || {};
    const companyName = companies.find(c => String(c.id) === String(asset.companyId))?.name || "General Stock";

    const lines = [
      `ASSET: ${asset.id || ""}${asset.oldAssetId ? ` (${asset.oldAssetId})` : ""}`,
      `TYPE: ${asset.assetType || "N/A"}`,
      `MODEL: ${String(asset.assetDetail || "N/A").slice(0, 28)}`,
      asset.serialNumber ? `SN: ${String(asset.serialNumber).slice(0, 22)}` : "",
      fields.phoneImei2 ? `IMEI2: ${String(fields.phoneImei2).slice(0, 20)}` : "",
      `USER: ${asset.assignedToName || "In Stock"}`,
      `COMPANY: ${companyName}`,
      `STATUS: ${asset.status || "Available"} (Cond: ${asset.condition || "Good"})`,
      asset.purchaseValue ? `COST: Rs ${asset.purchaseValue}` : ""
    ];

    return lines.filter(Boolean).join("\n");
  };

  // Helper to format ISO date strings cleanly as DD/MM/YYYY
  const formatCleanPdfDate = (dateVal: any) => {
    if (!dateVal) return "N/A";
    try {
      const raw = String(dateVal).trim();
      const parsed = new Date(raw);
      if (!isNaN(parsed.getTime())) {
        const day = String(parsed.getDate()).padStart(2, "0");
        const month = String(parsed.getMonth() + 1).padStart(2, "0");
        const year = parsed.getFullYear();
        return `${day}/${month}/${year}`;
      }
      return raw;
    } catch (_) {
      return String(dateVal);
    }
  };

  // Generate High-Definition Base64 QR Code image data URL when viewing an asset
  useEffect(() => {
    const targetAsset = qrModalAsset || viewingAsset;
    if (targetAsset?.id) {
      const payloadText = getAssetQrPayloadText(targetAsset);
      QRCode.toDataURL(payloadText, {
        width: 1000,
        margin: 1,
        errorCorrectionLevel: "H",
        color: { dark: "#0f172a", light: "#ffffff" }
      })
        .then((url: string) => setQrDataUrl(url))
        .catch((err: any) => console.error("QR Code generation error:", err));
    } else {
      setQrDataUrl("");
    }
  }, [qrModalAsset, viewingAsset]);

  // Handle URL query param assetId=... on initial page load (guarded to run once and clean URL to prevent infinite loops)
  const initialParamCheckedRef = useRef(false);
  useEffect(() => {
    if (typeof window !== "undefined" && inventory.length > 0 && !initialParamCheckedRef.current) {
      initialParamCheckedRef.current = true;
      const params = new URLSearchParams(window.location.search);
      const targetAssetId = params.get("assetId");
      if (targetAssetId) {
        const match = inventory.find(
          a => String(a.id).toLowerCase().trim() === targetAssetId.toLowerCase().trim() ||
               String(a.oldAssetId || "").toLowerCase().trim() === targetAssetId.toLowerCase().trim()
        );
        if (match) {
          setViewingAsset(match);
        }
        // Clean URL to prevent infinite re-fetching loops
        try {
          window.history.replaceState({}, "", window.location.pathname);
        } catch (_) {}
      }
    }
  }, [inventory]);

  // Handle QR code scanning or text input resolution
  const handleScanQrResult = (scannedText: string) => {
    if (!scannedText || !scannedText.trim()) return;
    let targetId = scannedText.trim();

    // Extract assetId if text contains "ASSET ID: XXX"
    const matchId = targetId.match(/ASSET ID:\s*([^\s\n]+)/i);
    if (matchId && matchId[1]) {
      targetId = matchId[1].trim();
    } else if (targetId.startsWith("http://") || targetId.startsWith("https://")) {
      try {
        const parsedUrl = new URL(targetId);
        const paramId = parsedUrl.searchParams.get("assetId");
        if (paramId) targetId = paramId;
      } catch (_) {}
    }

    const queryLower = targetId.toLowerCase().trim();

    // Search matching asset by ID, oldAssetId, or serialNumber
    const matchedAsset = inventory.find(asset => {
      const idMatch = String(asset.id || "").toLowerCase().trim() === queryLower;
      const oldIdMatch = String(asset.oldAssetId || "").toLowerCase().trim() === queryLower;
      const serialMatch = String(asset.serialNumber || "").toLowerCase().trim() === queryLower;
      return idMatch || oldIdMatch || serialMatch;
    });

    if (matchedAsset) {
      setViewingAsset(matchedAsset);
      setShowScannerModal(false);
      setScanInputValue("");
      triggerToast(`Asset found: ${matchedAsset.assetType} (${matchedAsset.id})`);
    } else {
      triggerToast(`No asset found matching scanned QR code: "${scannedText}"`);
    }
  };

  const handlePrintAssetTag = async (asset: any, mode: "label" | "pdf") => {
    setSelectedAssetIds([]); // Clear bulk selection so single print view matches exact asset
    setPrintableMode(mode);
    setQrModalAsset(asset);
    setViewingAsset(asset);
    try {
      const payloadText = getAssetQrPayloadText(asset);
      const url = await QRCode.toDataURL(payloadText, {
        width: 1000,
        margin: 1,
        errorCorrectionLevel: "H",
        color: { dark: "#0f172a", light: "#ffffff" }
      });
      setQrDataUrl(url);
    } catch (_) {}

    setTimeout(() => {
      window.print();
    }, 400);
  };

  const toggleSelectAsset = (assetId: string) => {
    setSelectedAssetIds(prev =>
      prev.includes(assetId) ? prev.filter(id => id !== assetId) : [...prev, assetId]
    );
  };

  const toggleSelectAllAssets = (filteredItems: any[]) => {
    const allFilteredIds = filteredItems.map(a => String(a.id));
    const allSelected = allFilteredIds.length > 0 && allFilteredIds.every(id => selectedAssetIds.includes(id));
    if (allSelected) {
      setSelectedAssetIds(prev => prev.filter(id => !allFilteredIds.includes(id)));
    } else {
      setSelectedAssetIds(prev => Array.from(new Set([...prev, ...allFilteredIds])));
    }
  };

  const handleBulkPrintQrTags = async (mode: "label" | "pdf") => {
    if (selectedAssetIds.length === 0) {
      triggerToast("Please select at least 1 asset to print QR tags");
      return;
    }

    try {
      setIsBulkPrinting(true);
      triggerToast(`Generating high-definition QR codes for ${selectedAssetIds.length} assets...`);

      // Preserve exact sequence of user selection
      const selectedAssetsInSequence = selectedAssetIds
        .map(id => inventory.find(a => String(a.id) === String(id)))
        .filter(Boolean);

      const qrPromises = selectedAssetsInSequence.map(async (asset: any) => {
        const payloadText = getAssetQrPayloadText(asset);
        const dataUrl = await QRCode.toDataURL(payloadText, {
          width: 1000,
          margin: 1,
          errorCorrectionLevel: "H",
          color: { dark: "#0f172a", light: "#ffffff" }
        });
        return { id: String(asset.id), dataUrl };
      });

      const results = await Promise.all(qrPromises);
      const qrMap: Record<string, string> = {};
      results.forEach(r => { qrMap[r.id] = r.dataUrl; });

      setBulkQrDataMap(qrMap);
      setPrintableMode(mode);

      setTimeout(() => {
        window.print();
        setIsBulkPrinting(false);
      }, 400);
    } catch (err: any) {
      console.error("Bulk QR generation failed:", err);
      triggerToast("Bulk QR printing error: " + (err.message || "Unknown error"));
      setIsBulkPrinting(false);
    }
  };

  // Direct PDF Download Handler (Saves a real .pdf file in exact selection order)
  const handleDownloadDirectPdf = async (mode: "label" | "pdf", singleAsset?: any) => {
    try {
      setIsBulkPrinting(true);
      triggerToast("Generating high-definition PDF document...");

      // Preserve exact sequence of user selection
      const targetAssets = singleAsset
        ? [singleAsset]
        : selectedAssetIds
            .map(id => inventory.find(a => String(a.id) === String(id)))
            .filter(Boolean);

      if (targetAssets.length === 0) {
        triggerToast("No assets selected for PDF download");
        setIsBulkPrinting(false);
        return;
      }

      // Generate ultra high-res Base64 QR code images in exact selection order
      const qrPromises = targetAssets.map(async (asset: any) => {
        const payloadText = getAssetQrPayloadText(asset);
        const dataUrl = await QRCode.toDataURL(payloadText, {
          width: 1000,
          margin: 1,
          errorCorrectionLevel: "H",
          color: { dark: "#0f172a", light: "#ffffff" }
        });
        return { id: String(asset.id), dataUrl };
      });

      const qrResults = await Promise.all(qrPromises);
      const qrMap: Record<string, string> = {};
      qrResults.forEach(r => { qrMap[r.id] = r.dataUrl; });

      // Dynamically import jsPDF
      const { default: jsPDF } = await import("jspdf");
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

      if (mode === "label") {
        if (singleAsset) {
          // Download clean single QR Tag PDF (Medium Size QR Code + Asset ID underneath)
          const qrData = qrMap[String(singleAsset.id)];
          const qrSize = 65; // 65mm x 65mm medium QR code
          const startX = (210 - qrSize) / 2; // Center horizontally on A4 page (72.5mm)
          const startY = 85; // Center vertically on A4 page

          if (qrData) {
            doc.addImage(qrData, "PNG", startX, startY, qrSize, qrSize);
          }

          doc.setFont("courier", "bold");
          doc.setFontSize(16);
          doc.setTextColor(15, 23, 42);
          doc.text(`ASSET ID: ${singleAsset.id}`, 105, startY + qrSize + 14, { align: "center" });

          if (singleAsset.oldAssetId) {
            doc.setFontSize(11);
            doc.setTextColor(100, 116, 139);
            doc.text(`OLD ID: ${singleAsset.oldAssetId}`, 105, startY + qrSize + 22, { align: "center" });
          }

          doc.save(`Asset_QR_Tag_${singleAsset.id}.pdf`);
        } else {
          // Bulk Mode: Clean Grid of QR Tags (ONLY QR Code + Asset ID underneath, 12 per page)
          const colWidth = 55;
          const rowHeight = 55;
          const startX = 18;
          const startY = 20;
          const marginX = 10;
          const marginY = 10;

          targetAssets.forEach((asset: any, index: number) => {
            if (index > 0 && index % 12 === 0) {
              doc.addPage();
            }

            const itemIndex = index % 12;
            const col = itemIndex % 3;
            const row = Math.floor(itemIndex / 3);

            const x = startX + col * (colWidth + marginX);
            const y = startY + row * (rowHeight + marginY);

            const qrData = qrMap[String(asset.id)];
            const qrSize = 36; // 36mm x 36mm QR code in grid
            const qrX = x + (colWidth - qrSize) / 2;

            if (qrData) {
              doc.addImage(qrData, "PNG", qrX, y + 4, qrSize, qrSize);
            }

            doc.setFont("courier", "bold");
            doc.setFontSize(10);
            doc.setTextColor(15, 23, 42);
            doc.text(`ASSET ID: ${asset.id}`, x + colWidth / 2, y + qrSize + 10, { align: "center" });

            if (asset.oldAssetId) {
              doc.setFontSize(8);
              doc.setTextColor(100, 116, 139);
              doc.text(`OLD: ${asset.oldAssetId}`, x + colWidth / 2, y + qrSize + 15, { align: "center" });
            }
          });

          doc.save(`Assets_QR_Tags_Sheet_${new Date().toISOString().slice(0,10)}.pdf`);
        }
      } else {
        // Full Specification Sheets (1 Page per Asset) with Pristine Corporate UI
        targetAssets.forEach((asset: any, index: number) => {
          if (index > 0) doc.addPage();

          const companyObj = companies.find(c => String(c.id) === String(asset.companyId));
          const companyName = companyObj?.name || "Official Company Inventory";

          // Top Corporate Deep Indigo / Slate Header Banner
          doc.setFillColor(30, 27, 75); // #1e1b4b Deep Indigo Dark Navy
          doc.roundedRect(14, 12, 182, 28, 3, 3, "F");

          // Top Indigo Accent Line
          doc.setFillColor(99, 102, 241); // #6366f1 Indigo Accent
          doc.rect(17, 12, 176, 1.5, "F");

          doc.setFont("helvetica", "bold");
          doc.setFontSize(13);
          doc.setTextColor(255, 255, 255);
          doc.text("ASSET SPECIFICATION & AUDIT CARD", 22, 22);

          doc.setFont("helvetica", "normal");
          doc.setFontSize(8.5);
          doc.setTextColor(199, 210, 254); // indigo-200
          doc.text(`${companyName} · Asset Control Record`, 22, 28);

          doc.setFont("helvetica", "bold");
          doc.setFontSize(7.5);
          doc.setTextColor(165, 180, 252); // indigo-300
          doc.text(`Generated: ${new Date().toLocaleDateString("en-IN")} · Page ${index + 1} of ${targetAssets.length}`, 22, 34);

          // Top Right QR Badge inside header banner
          const qrData = qrMap[String(asset.id)];
          if (qrData) {
            doc.setFillColor(255, 255, 255);
            doc.roundedRect(165, 14, 24, 24, 2, 2, "F");
            doc.addImage(qrData, "PNG", 166, 15, 22, 22);
          }

          let parsedCustom: any = {};
          try {
            parsedCustom = asset.customFields ? JSON.parse(asset.customFields) : {};
          } catch (_) {}
          const fields = parsedCustom.assetFields || {};
          const emails = (parsedCustom.emailsList || []).filter(Boolean);
          const notesStr = asset.notes || "";
          const cleanNotes = cleanNotesString(notesStr);

          // Passcodes & Lock Passwords (customFields + regex fallback)
          const phonePass = fields.phonePassword || notesStr.match(/Phone Screen Lock Passcode:\s*([^\n]+)/i)?.[1] || "";
          const laptopPass = fields.laptopPassword || notesStr.match(/Laptop Admin Passcode:\s*([^\n]+)/i)?.[1] || "";
          const compPass = fields.compPassword || notesStr.match(/Computer Lock Passcode:\s*([^\n]+)/i)?.[1] || "";

          // SIM & Telecom details
          const sim1OpFromNotes = notesStr.match(/SIM 1[^\[]*\[Company:\s*([^\]]+)\]/i)?.[1] || notesStr.match(/\[Company:\s*([^\]]+)\]/i)?.[1] || "";
          const sim2OpFromNotes = notesStr.match(/SIM 2[^\[]*\[Company:\s*([^\]]+)\]/i)?.[1] || "";
          const sim1Op = fields.phoneSim1OperatorCustom || (fields.phoneSim1Operator && fields.phoneSim1Operator !== "Other" ? fields.phoneSim1Operator : "") || sim1OpFromNotes || (fields.phoneSim1Operator !== "Other" ? fields.phoneSim1Operator : "") || fields.simOperator || "";
          const sim2Op = fields.phoneSim2OperatorCustom || (fields.phoneSim2Operator && fields.phoneSim2Operator !== "Other" ? fields.phoneSim2Operator : "") || sim2OpFromNotes || (fields.phoneSim2Operator !== "Other" ? fields.phoneSim2Operator : "") || "";
          const sim1No = fields.phoneSim1No || notesStr.match(/SIM 1 (?:Mobile No|No|Number|CONFIG):\s*([0-9\s+]+)/i)?.[1] || notesStr.match(/SIM 1:\s*([0-9\s+]+)/i)?.[1] || "";
          const sim2No = fields.phoneSim2No || notesStr.match(/SIM 2 (?:Mobile No|No|Number|CONFIG):\s*([0-9\s+]+)/i)?.[1] || notesStr.match(/SIM 2:\s*([0-9\s+]+)/i)?.[1] || "";
          const sim1Wa = fields.phoneSim1Whatsapp || notesStr.match(/SIM 1[^\[]*\[WhatsApp:\s*([^\]]+)\]/i)?.[1] || "";
          const sim2Wa = fields.phoneSim2Whatsapp || notesStr.match(/SIM 2[^\[]*\[WhatsApp:\s*([^\]]+)\]/i)?.[1] || "";

          // External Standalone WhatsApp
          const extWaNo = fields.phoneExternalWhatsappNo || notesStr.match(/External WhatsApp:\s*([0-9\s+]+)/i)?.[1] || "";
          const extWaType = fields.phoneExternalWhatsappType || "Business";
          const extWaLabel = fields.phoneExternalWhatsappLabel || notesStr.match(/External WhatsApp:[^\[]*\[Label:\s*([^\]]+)\]/i)?.[1] || "";

          // Logged-in Social Media Account
          const smAppName = fields.phoneSocialMediaAppCustom || (fields.phoneSocialMediaApp && fields.phoneSocialMediaApp !== "Other" ? fields.phoneSocialMediaApp : "") || notesStr.match(/Social Media App:\s*([^\(]+)/i)?.[1]?.trim() || "";
          const smUsername = fields.phoneSocialMediaUsername || notesStr.match(/Social Media App:[^\(]*\(([^\)]+)\)/i)?.[1] || "";
          const smPassword = fields.phoneSocialMediaPassword || "";

          // Complete Detailed Rows for PDF Sheet
          const rows: [string, string][] = [
            ["Asset ID", String(asset.id)],
            ...(asset.oldAssetId ? [["Old Asset ID", String(asset.oldAssetId)] as [string, string]] : []),
            ["Category / Type", String(asset.assetType || "N/A")],
            ["Description / Model", String(asset.assetDetail || "N/A")],
            ["Serial Number / IMEI", String(asset.serialNumber || "N/A")],
            ...(fields.phoneImei2 ? [["IMEI Number 2", String(fields.phoneImei2)] as [string, string]] : []),
            ...(fields.phoneSpecs || fields.laptopSpecs ? [["RAM & Storage / Specs", String(fields.phoneSpecs || fields.laptopSpecs)] as [string, string]] : []),
            ...(fields.laptopOs ? [["Operating System (OS)", String(fields.laptopOs)] as [string, string]] : []),
            ...(fields.laptopHostName ? [["Host Name", String(fields.laptopHostName)] as [string, string]] : []),
            ...(fields.compMonitor ? [["Monitor Details", String(fields.compMonitor)] as [string, string]] : []),
            ...(fields.compKeyboard ? [["Keyboard Details", String(fields.compKeyboard)] as [string, string]] : []),
            ...(fields.compMouse ? [["Mouse Details", String(fields.compMouse)] as [string, string]] : []),
            ...(fields.compPeripherals ? [["Peripherals / Accessories", String(fields.compPeripherals)] as [string, string]] : []),
            ...(fields.laptopCharger ? [["Charger Included", String(fields.laptopCharger)] as [string, string]] : []),
            ...(fields.laptopBag ? [["Bag & Accessories", String(fields.laptopBag)] as [string, string]] : []),

            // PASSWORDS & ACCESS
            ...(phonePass ? [["Phone Screen Passcode", String(phonePass)] as [string, string]] : []),
            ...(laptopPass ? [["Laptop Admin Passcode", String(laptopPass)] as [string, string]] : []),
            ...(compPass ? [["Computer Lock Password", String(compPass)] as [string, string]] : []),

            // SIM CARD & OPERATOR DETAILS
            ...(fields.simOperator ? [["Telecom Operator", String(fields.simOperator)] as [string, string]] : []),
            ...(sim1No || sim1Op ? [["SIM 1 Configuration", `${sim1No || "N/A"}${sim1Op ? ` (${sim1Op})` : ""}${sim1Wa ? ` [WhatsApp: ${sim1Wa}]` : ""}`] as [string, string]] : []),
            ...(sim2No || sim2Op ? [["SIM 2 Configuration", `${sim2No || "N/A"}${sim2Op ? ` (${sim2Op})` : ""}${sim2Wa ? ` [WhatsApp: ${sim2Wa}]` : ""}`] as [string, string]] : []),
            ...(fields.simIccid ? [["SIM ICCID / Barcode", String(fields.simIccid)] as [string, string]] : []),
            ...(fields.simPlanType ? [["SIM Plan Type", String(fields.simPlanType)] as [string, string]] : []),
            ...(fields.simPuk ? [["SIM PUK / PIN", String(fields.simPuk)] as [string, string]] : []),

            // EXTERNAL / STANDALONE WHATSAPP
            ...(extWaNo ? [["External WhatsApp", `${extWaNo} (Type: ${extWaType})${extWaLabel ? ` [Label: ${extWaLabel}]` : ""}`] as [string, string]] : []),

            // SOCIAL MEDIA ACCOUNT
            ...(smUsername ? [["Social Media Account", `${smAppName ? `${smAppName}: ` : ""}${smUsername}${smPassword ? ` (Pass: ${smPassword})` : ""}`] as [string, string]] : []),

            // ROUTER / PRINTER / LOCATION
            ...(fields.routerWifiSsid ? [["Wi-Fi SSID & Pass", String(fields.routerWifiSsid)] as [string, string]] : []),
            ...(fields.routerIp ? [["Admin IP Address", String(fields.routerIp)] as [string, string]] : []),
            ...(fields.printerCartridge ? [["Toner / Cartridge", String(fields.printerCartridge)] as [string, string]] : []),
            ...(asset.installationLocation || fields.installationLocation || fields.furnitureLocation || fields.acLocation ? [["Installation Location", String(asset.installationLocation || fields.installationLocation || fields.furnitureLocation || fields.acLocation)] as [string, string]] : []),

            ["Condition Status", String(asset.condition || "Good")],
            ["Inventory Status", String(asset.status || "Available")],
            ["Company Belonging", companyName],
            ["Purchase Date", formatCleanPdfDate(asset.purchaseDate)],
            ["Purchase Value", asset.purchaseValue ? `Rs. ${Number(asset.purchaseValue).toLocaleString("en-IN")}` : "N/A"],
            ["Registered By", String(asset.registeredBy || asset.createdBy || "System Record")],
            ["Assigned Staff", String(asset.assignedToName || "Unallocated (In Stock)")],
            ["Handover Date", formatCleanPdfDate(asset.handoverDate || asset.assignedAt)],
            ...(emails.length > 0 ? [["Logged-in Emails", emails.join(", ")] as [string, string]] : []),
            ...(cleanNotes ? [["Internal Remarks", String(cleanNotes)] as [string, string]] : []),
          ];

          const startY = 48;

          // Asset photo if available
          const hasPhoto = asset.photoUrl && asset.photoUrl.startsWith("data:image");
          if (hasPhoto) {
            try {
              doc.setLineWidth(0.4);
              doc.setDrawColor(203, 213, 225);
              doc.roundedRect(14, startY, 48, 48, 2, 2, "S");
              doc.addImage(asset.photoUrl, "JPEG", 15, startY + 1, 46, 46);
            } catch (_) {}
          }

          const tableX = hasPhoto ? 66 : 14;
          const tableW = hasPhoto ? 130 : 182;
          const labelColW = 46;
          const valColW = tableW - labelColW - 6;

          let currentY = startY;

          rows.forEach(([label, value], idx) => {
            doc.setFont("helvetica", "normal");
            doc.setFontSize(8);
            const wrappedValLines = doc.splitTextToSize(String(value || "N/A"), valColW);
            const actualRowH = Math.max(7.5, wrappedValLines.length * 4.2 + 3);

            // Alternating Row Fills
            if (idx % 2 === 0) {
              doc.setFillColor(248, 250, 252); // slate-50
              doc.rect(tableX + 0.2, currentY + 0.2, tableW - 0.4, actualRowH - 0.4, "F");
            }

            // Horizontal Separator
            if (idx > 0) {
              doc.setLineWidth(0.2);
              doc.setDrawColor(226, 232, 240); // slate-200
              doc.line(tableX, currentY, tableX + tableW, currentY);
            }

            // Label
            doc.setFont("helvetica", "bold");
            doc.setFontSize(7.5);
            doc.setTextColor(51, 65, 85); // slate-700
            doc.text(label, tableX + 4, currentY + 5);

            // Vertical Column Separator Line
            doc.setLineWidth(0.2);
            doc.setDrawColor(226, 232, 240);
            doc.line(tableX + labelColW, currentY, tableX + labelColW, currentY + actualRowH);

            // Value (Wrapped lines)
            doc.setFont("helvetica", "normal");
            doc.setFontSize(8);
            doc.setTextColor(15, 23, 42); // slate-900
            doc.text(wrappedValLines, tableX + labelColW + 4, currentY + 5);

            currentY += actualRowH;
          });

          // Draw Outer Table Border Box around actual content height
          doc.setLineWidth(0.4);
          doc.setDrawColor(203, 213, 225); // slate-300
          doc.roundedRect(tableX, startY, tableW, currentY - startY, 2, 2, "S");
        });

        doc.save(singleAsset ? `Asset_Specification_${singleAsset.id}.pdf` : `Assets_Specification_Sheets_${new Date().toISOString().slice(0,10)}.pdf`);
      }

      triggerToast("PDF document downloaded successfully!");
    } catch (err: any) {
      console.error("Error generating PDF download:", err);
      triggerToast("PDF Download error: " + (err.message || "Failed to build PDF"));
    } finally {
      setIsBulkPrinting(false);
    }
  };

  const handleAssignmentSave = async () => {
    if (!assigningAsset) return;
    const isCustom = isCustomEmployee || assignmentUserId === "CUSTOM_OTHER";
    if (isCustom) {
      if (!customEmployeeName.trim()) {
        triggerToast("Please enter custom employee name");
        return;
      }
    } else if (!assignmentUserId) {
      triggerToast("Please select an employee");
      return;
    }

    try {
      setSavingAssignment(true);
      const customName = customEmployeeName.trim();
      const response = await fetch("/api/assets/inventory", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assetId: assigningAsset.id,
          userId: isCustom ? null : assignmentUserId,
          assignedToName: isCustom ? customName : undefined,
          currentAssignedUserId: assigningAsset.assignedToUserId || null,
          assignedDate: assignmentDate,
          handoverDate: assignmentHandoverDate || null,
          notes: assignmentNotes
        })
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || "Assignment failed");

      triggerToast(`Asset assigned to ${result.data?.assignedToName || customName}`);
      setAssigningAsset(null);
      setAssignmentUserId("");
      setCustomEmployeeName("");
      setIsCustomEmployee(false);
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
          assignedToName: null,
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
    let finalNotes = cleanNotesString(registerForm.notes);

    if (typeClean === "sim card" || typeClean === "sim") {
      const mobile = assetFields.simMobile || "";
      if (!mobile) {
        triggerToast("SIM Mobile Number is required");
        return;
      }
      const operator = assetFields.simOperatorCustom || (assetFields.simOperator !== "Other" ? assetFields.simOperator : "") || "Jio";
      const network = assetFields.simNetworkCustom || (assetFields.simNetwork !== "Other" ? assetFields.simNetwork : "") || "5G";
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
    } else if (typeClean === "computer" || typeClean === "desktop computer" || typeClean === "pc") {
      const model = assetFields.compModel || "";
      const specs = assetFields.compSpecs || "";
      const serial = assetFields.compSerial || "";
      if (!model) {
        triggerToast("Computer Brand & Model is required");
        return;
      }
      finalDetail = `${model}${specs ? ` (${specs})` : ""}`;
      finalSerial = serial;
    } else if (typeClean === "cpu" || typeClean === "cpu tower" || typeClean === "cabinet") {
      const model = assetFields.cpuModel || "";
      const specs = assetFields.cpuSpecs || "";
      const serial = assetFields.cpuSerial || "";
      if (!model) {
        triggerToast("CPU Brand & Cabinet Model is required");
        return;
      }
      finalDetail = `${model}${specs ? ` (${specs})` : ""}`;
      finalSerial = serial;
    } else if (typeClean === "mouse") {
      const brand = assetFields.mouseBrand || "";
      const type = assetFields.mouseType || "Wired USB";
      const serial = assetFields.mouseSerial || "";
      if (!brand) {
        triggerToast("Mouse Brand & Model is required");
        return;
      }
      finalDetail = `${brand} (${type})`;
      finalSerial = serial;
    } else if (typeClean === "keyboard") {
      const brand = assetFields.kbBrand || "";
      const type = assetFields.kbType || "Wired USB";
      const serial = assetFields.kbSerial || "";
      if (!brand) {
        triggerToast("Keyboard Brand & Model is required");
        return;
      }
      finalDetail = `${brand} (${type})`;
      finalSerial = serial;
    } else if (typeClean === "monitor / display" || typeClean === "monitor" || typeClean === "display") {
      const brand = assetFields.monBrand || "";
      const size = assetFields.monSize || "";
      const res = assetFields.monResolution || "";
      const serial = assetFields.monSerial || "";
      if (!brand) {
        triggerToast("Monitor Brand & Model is required");
        return;
      }
      finalDetail = `${brand}${size ? ` (${size}${res ? `, ${res}` : ""})` : ""}`;
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
      if (!model) {
        triggerToast("Printer Brand & Model is required");
        return;
      }
      finalDetail = `${model} (${type})`;
      finalSerial = serial;
    } else if (typeClean?.includes("ac") || typeClean?.includes("air conditioner")) {
      const model = assetFields.acModel || "";
      const tonnage = assetFields.acTypeTonnageCustom || assetFields.acTypeTonnage || "1.5 Ton Split AC";
      const location = assetFields.acLocation || "";
      if (!model) {
        triggerToast("AC Brand/Model is required");
        return;
      }
      const locText = location || registerForm.installationLocation || "";
      finalDetail = `${model} - ${tonnage}${locText ? ` [Location: ${locText}]` : ""}`;
      finalSerial = "";
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
          photoUrl: "",
          installationLocation: ""
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

  // Helper to strip out legacy auto-generated summary lines from notes string
  const cleanNotesString = (notesStr: string = "") => {
    if (!notesStr) return "";
    return notesStr
      .split("\n")
      .filter(line => {
        const trimmed = line.trim();
        return (
          !trimmed.startsWith("Phone Screen Lock Passcode:") &&
          !trimmed.startsWith("Laptop Admin Passcode:") &&
          !trimmed.startsWith("Computer Lock Passcode:") &&
          !trimmed.startsWith("CPU Lock Passcode:") &&
          !trimmed.startsWith("Logged-in Emails:") &&
          !trimmed.startsWith("SIM Slots Used:") &&
          !trimmed.startsWith("SIM 1 Mobile No:") &&
          !trimmed.startsWith("SIM 2 Mobile No:") &&
          !trimmed.startsWith("External WhatsApp:") &&
          !trimmed.startsWith("OS:") &&
          !trimmed.startsWith("Host Name:") &&
          !trimmed.startsWith("Peripherals:") &&
          !trimmed.startsWith("Charger Included:") &&
          !trimmed.startsWith("Accessories:")
        );
      })
      .join("\n")
      .trim();
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
      } else if (typeClean === "computer" || typeClean === "desktop computer" || typeClean === "pc") {
        const detail = asset.assetDetail || "";
        const openParen = detail.indexOf("(");
        const closeParen = detail.indexOf(")");
        const passMatch = asset.notes?.match(/Computer Lock Passcode: ([^\n]*)/);
        fields = {
          compModel: openParen > -1 ? detail.substring(0, openParen).trim() : detail,
          compSpecs: openParen > -1 && closeParen > openParen ? detail.substring(openParen + 1, closeParen).trim() : "",
          compSerial: asset.serialNumber || "",
          compPassword: passMatch ? passMatch[1] : ""
        };
        const emailsMatch = asset.notes?.match(/Logged-in Emails: ([^\n]*)/);
        if (emailsMatch) {
          emails = emailsMatch[1].split(", ").map((e: string) => e.trim());
        }
      } else if (typeClean === "cpu" || typeClean === "cpu tower" || typeClean === "cabinet") {
        const detail = asset.assetDetail || "";
        const openParen = detail.indexOf("(");
        const closeParen = detail.indexOf(")");
        const passMatch = asset.notes?.match(/CPU Lock Passcode: ([^\n]*)/);
        fields = {
          cpuModel: openParen > -1 ? detail.substring(0, openParen).trim() : detail,
          cpuSpecs: openParen > -1 && closeParen > openParen ? detail.substring(openParen + 1, closeParen).trim() : "",
          cpuSerial: asset.serialNumber || "",
          cpuPassword: passMatch ? passMatch[1] : ""
        };
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
      notes: cleanNotesString(asset.notes || ""),
      photoUrl: asset.photoUrl || "",
      installationLocation: asset.installationLocation || fields.installationLocation || fields.acLocation || fields.furnitureLocation || ""
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
    let finalNotes = cleanNotesString(editForm.notes);

    if (typeClean === "sim card" || typeClean === "sim") {
      const mobile = editAssetFields.simMobile || "";
      if (!mobile) {
        triggerToast("SIM Mobile Number is required");
        return;
      }
      finalDetail = `${editAssetFields.simOperator || "Jio"} - ${editAssetFields.simNetwork || "5G"} Network`;
      finalSerial = mobile;
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
    } else if (typeClean === "computer" || typeClean === "desktop computer" || typeClean === "pc") {
      const model = editAssetFields.compModel || "";
      const specs = editAssetFields.compSpecs || "";
      const serial = editAssetFields.compSerial || "";
      if (!model) {
        triggerToast("Computer Brand & Model is required");
        return;
      }
      finalDetail = `${model}${specs ? ` (${specs})` : ""}`;
      finalSerial = serial;
    } else if (typeClean === "cpu" || typeClean === "cpu tower" || typeClean === "cabinet") {
      const model = editAssetFields.cpuModel || "";
      const specs = editAssetFields.cpuSpecs || "";
      const serial = editAssetFields.cpuSerial || "";
      if (!model) {
        triggerToast("CPU Brand & Cabinet Model is required");
        return;
      }
      finalDetail = `${model}${specs ? ` (${specs})` : ""}`;
      finalSerial = serial;
    } else if (typeClean === "mouse") {
      const brand = editAssetFields.mouseBrand || "";
      const type = editAssetFields.mouseType || "Wired USB";
      const serial = editAssetFields.mouseSerial || "";
      if (!brand) {
        triggerToast("Mouse Brand & Model is required");
        return;
      }
      finalDetail = `${brand} (${type})`;
      finalSerial = serial;
    } else if (typeClean === "keyboard") {
      const brand = editAssetFields.kbBrand || "";
      const type = editAssetFields.kbType || "Wired USB";
      const serial = editAssetFields.kbSerial || "";
      if (!brand) {
        triggerToast("Keyboard Brand & Model is required");
        return;
      }
      finalDetail = `${brand} (${type})`;
      finalSerial = serial;
    } else if (typeClean === "monitor / display" || typeClean === "monitor" || typeClean === "display") {
      const brand = editAssetFields.monBrand || "";
      const size = editAssetFields.monSize || "";
      const res = editAssetFields.monResolution || "";
      const serial = editAssetFields.monSerial || "";
      if (!brand) {
        triggerToast("Monitor Brand & Model is required");
        return;
      }
      finalDetail = `${brand}${size ? ` (${size}${res ? `, ${res}` : ""})` : ""}`;
      finalSerial = serial;
    } else if (typeClean === "mobile phone") {
      const model = editAssetFields.phoneModel || "";
      const imei1 = editAssetFields.phoneImei1 || "";
      const imei2 = editAssetFields.phoneImei2 || "";
      const specs = editAssetFields.phoneSpecs || "";

      if (!model || !imei1) {
        triggerToast("Phone Brand & Model and IMEI Number 1 are required");
        return;
      }
      finalDetail = `${model}${specs ? ` (${specs})` : ""}`;
      finalSerial = imei2 ? `IMEI 1: ${imei1}, IMEI 2: ${imei2}` : imei1;
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
      if (!model || !mac) {
        triggerToast("Router Brand & Model and MAC Address are required");
        return;
      }
      finalDetail = model;
      finalSerial = `MAC: ${mac}`;
    } else if (typeClean === "printer / scanner") {
      const model = editAssetFields.printerModel || "";
      const type = editAssetFields.printerType || "Laser Printer";
      const serial = editAssetFields.printerSerial || "";
      if (!model) {
        triggerToast("Printer Brand & Model is required");
        return;
      }
      finalDetail = `${model} (${type})`;
      finalSerial = serial;
    } else if (typeClean?.includes("ac") || typeClean?.includes("air conditioner")) {
      const model = editAssetFields.acModel || "";
      const tonnage = editAssetFields.acTypeTonnageCustom || editAssetFields.acTypeTonnage || "1.5 Ton Split AC";
      const location = editAssetFields.acLocation || "";
      if (!model) {
        triggerToast("AC Brand/Model is required");
        return;
      }
      const locText = location || editForm.installationLocation || "";
      finalDetail = `${model} - ${tonnage}${locText ? ` [Location: ${locText}]` : ""}`;
      finalSerial = "";
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

  // Combine DB employees and custom assignedToName entries for filter
  const assigneeOptions = useMemo(() => {
    const list: Array<{ id: string; name: string }> = [];
    const seenNames = new Set<string>();

    employees.forEach((emp: any) => {
      const name = String(emp.name || "").trim();
      if (name) {
        list.push({ id: String(emp.id), name });
        seenNames.add(name.toLowerCase());
      }
    });

    inventory.forEach((asset: any) => {
      const customName = String(asset.assignedToName || "").trim();
      if (customName && !seenNames.has(customName.toLowerCase())) {
        list.push({ id: customName, name: customName });
        seenNames.add(customName.toLowerCase());
      }
    });

    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, [employees, inventory]);

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
      || (selectedAssignee === "unassigned"
          ? (!asset.assignedToUserId && !asset.assignedToName)
          : (String(asset.assignedToUserId) === selectedAssignee || String(asset.assignedToName) === selectedAssignee)
         );
    const assignedDay = asset.assignedAt ? String(asset.assignedAt).slice(0, 10) : "";
    const handoverDay = asset.handoverDate ? String(asset.handoverDate).slice(0, 10) : "";
    const matchesAssignedDate = (!assignedFrom || (assignedDay && assignedDay >= assignedFrom))
      && (!assignedTo || (assignedDay && assignedDay <= assignedTo));
    const matchesHandoverDate = (!handoverFrom || (handoverDay && handoverDay >= handoverFrom))
      && (!handoverTo || (handoverDay && handoverDay <= handoverTo));

    return matchesSearch && matchesCompany && matchesCondition && matchesType
      && matchesStatus && matchesAssignee && matchesAssignedDate && matchesHandoverDate;
  });

  const exportInventoryToCsv = async () => {
    if (filteredInventory.length === 0) {
      triggerToast("No inventory records available to export");
      return;
    }

    try {
      const XLSX = await import("xlsx");
    const exportRows = filteredInventory.map((asset: any) => {
      const companyObj = companies.find((c) => String(c.id) === String(asset.companyId));
      const companyName = companyObj ? companyObj.name : (asset.companyId ? "Assigned Company" : "General Stock");

      // Format Notes cleanly without giant vertical newline padding
      const cleanNotes = (asset.notes || asset.customNotes || "")
        .replace(/(\r\n|\n|\r)/gm, " | ")
        .replace(/\s+/g, " ")
        .trim();

      // Format Assignment History cleanly
      const historyStr = (asset.assignmentHistory || [])
        .map((entry: any) => `${entry.action || 'Assign'}: ${entry.fromUserName || "Stock"} -> ${entry.toUserName || "Stock"} (${entry.assignedDate || "-"})`)
        .join(" | ");

      return {
        "Asset ID": asset.id || "—",
        "Old Asset ID": asset.oldAssetId || "—",
        "Category": asset.assetType || "General",
        "Asset Description & Model": asset.assetDetail || "—",
        "Serial Number / IMEI": asset.serialNumber || "—",
        "Company": companyName,
        "Condition": asset.condition || "Good",
        "Inventory Status": asset.status || "Available",
        "Assigned To": asset.assignedToName || (asset.assignedToUserId ? `User #${asset.assignedToUserId}` : "Unassigned / Stock"),
        "Assigned Date": asset.assignedAt ? new Date(asset.assignedAt).toLocaleDateString("en-IN") : "—",
        "Handover Date": asset.handoverDate ? new Date(asset.handoverDate).toLocaleDateString("en-IN") : "—",
        "Purchase Date": asset.purchaseDate ? new Date(asset.purchaseDate).toLocaleDateString("en-IN") : "—",
        "Purchase Value (₹)": asset.purchaseValue ? Number(asset.purchaseValue) : 0,
        "Company / Notes": cleanNotes || "—",
        "Registered By": asset.registeredBy || "System",
        "Created At": asset.createdAt ? new Date(asset.createdAt).toLocaleDateString("en-IN") : "—",
        "Assignment History": historyStr || "—"
      };
    });

    const ws = XLSX.utils.json_to_sheet(exportRows);
    if (exportRows.length > 0) {
      const colKeys = Object.keys(exportRows[0]);
      ws['!cols'] = colKeys.map((key) => {
        let maxLen = key.length;
        exportRows.forEach((r) => {
          const valStr = r[key as keyof typeof r] !== undefined && r[key as keyof typeof r] !== null ? String(r[key as keyof typeof r]) : "";
          if (valStr.length > maxLen) maxLen = valStr.length;
        });
        return { wch: Math.min(Math.max(maxLen + 6, 16), 65) };
      });
    }

    const csvString = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Asset_Inventory_Report_${new Date().toISOString().split("T")[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    triggerToast(`${filteredInventory.length} inventory record(s) exported successfully`);
  } catch (err: any) {
    console.error("Failed to export Inventory CSV:", err);
    triggerToast("Inventory export failed: " + (err.message || "Unknown error"));
  }
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
            onClick={() => {
              const nextMode = !isBulkSelectMode;
              setIsBulkSelectMode(nextMode);
              if (!nextMode) {
                setSelectedAssetIds([]);
              }
            }}
            className={cn(
              "px-3 py-1.5 rounded-lg text-[10px] font-semibold tracking-wider uppercase transition-all flex items-center gap-1.5 shadow-sm font-sans",
              isBulkSelectMode
                ? "bg-purple-800 text-white ring-2 ring-purple-300 font-bold"
                : "bg-purple-600 hover:bg-purple-700 text-white"
            )}
            title="Click to toggle Bulk QR Download & multi-selection checkboxes"
          >
            <QrCode className="w-3.5 h-3.5" />
            <Printer className="w-3.5 h-3.5" />
            {isBulkSelectMode ? "Exit Bulk Mode" : "Bulk QR Download"}
          </button>
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
          className={`pb-2.5 px-4 text-xs font-black tracking-wider uppercase border-b-2 transition-all ${activeSubTab === "stock"
              ? "border-[#C9A84C] text-[#1C1C1A]"
              : "border-transparent text-[#9C9890] hover:text-[#5D5B57]"
            }`}
        >
          Inventory Stock
        </button>
        <button
          onClick={() => setActiveSubTab("purchases")}
          className={`pb-2.5 px-4 text-xs font-black tracking-wider uppercase border-b-2 transition-all flex items-center gap-1.5 ${activeSubTab === "purchases"
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
          <form onSubmit={handleRegisterSubmit} className="space-y-5">
            {/* Section 1: Basic Identification */}
            <div className="bg-[#FCFBF9] border border-[#E8E4DF] rounded-xl p-4 space-y-3">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-black flex items-center gap-2 border-b border-[#E8E4DF] pb-2">
                <span className="w-2 h-2 rounded-full bg-indigo-600"></span> 1. Basic Identification & Company Stock
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <div>
                  <label className="block text-[9px] uppercase tracking-wider text-black font-normal mb-1">Asset ID * (Auto Generated)</label>
                  <input
                    type="text"
                    required
                    readOnly
                    placeholder="Generating ID..."
                    value={registerForm.id}
                    className="w-full bg-slate-100/70 border border-[#E8E4DF] rounded-lg px-3 py-2 text-xs text-black font-mono font-normal focus:outline-none transition-all cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-[9px] uppercase tracking-wider text-black font-normal mb-1">Old Asset ID / Previous ID</label>
                  <input
                    type="text"
                    placeholder="e.g. OLD-LAP-01 / PREV-102"
                    value={registerForm.oldAssetId}
                    onChange={(e) => setRegisterForm(p => ({ ...p, oldAssetId: e.target.value }))}
                    className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-black placeholder-slate-400 font-mono font-normal focus:outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[9px] uppercase tracking-wider text-black font-normal mb-1">Asset Type *</label>
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
                      className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-black focus:outline-none transition-all font-normal"
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
                        className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-black focus:outline-none transition-all font-normal"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setIsCustomRegisterType(false);
                          setRegisterForm(p => ({ ...p, assetType: "Laptop" }));
                        }}
                        className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-black text-[10px] font-normal rounded-lg transition-all"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-[9px] uppercase tracking-wider text-black font-normal mb-1">Condition</label>
                  <select
                    value={registerForm.condition}
                    onChange={(e) => setRegisterForm(p => ({ ...p, condition: e.target.value }))}
                    className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-black focus:outline-none transition-all font-normal"
                  >
                    <option>New</option>
                    <option>Good</option>
                    <option>Fair</option>
                    <option>Needs Repair</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] uppercase tracking-wider text-black font-normal mb-1">Company Belonging</label>
                  <select
                    value={registerForm.companyId}
                    onChange={(e) => setRegisterForm(p => ({ ...p, companyId: e.target.value }))}
                    className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-black focus:outline-none transition-all font-normal"
                  >
                    <option value="">-- General Stock --</option>
                    {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] uppercase tracking-wider text-black font-normal mb-1">Installation Location (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Floor 2, Server Room, Cabin 3..."
                    value={registerForm.installationLocation || ""}
                    onChange={(e) => setRegisterForm(p => ({ ...p, installationLocation: e.target.value }))}
                    className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-black placeholder-slate-400 font-normal focus:outline-none transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Asset Specifications */}
            <div className="bg-white border border-[#E8E4DF] rounded-xl p-4 space-y-3">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-black flex items-center gap-2 border-b border-[#E8E4DF] pb-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span> 2. Specifications ({registerForm.assetType || "General"})
              </div>

            {typeClean === "sim card" || typeClean === "sim" ? (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-[9px] uppercase tracking-wider text-black font-normal mb-1">SIM Mobile Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 9876543210"
                    value={assetFields.simMobile || ""}
                    onChange={(e) => setAssetFields(p => ({ ...p, simMobile: e.target.value }))}
                    className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-black focus:outline-none transition-all font-normal"
                  />
                </div>
                <div>
                  <label className="block text-[9px] uppercase tracking-wider text-black font-normal mb-1">SIM Status (Active / Inactive) *</label>
                  <select
                    value={assetFields.simStatus || "Active"}
                    onChange={(e) => setAssetFields(p => ({ ...p, simStatus: e.target.value }))}
                    className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-black focus:outline-none transition-all font-normal"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                    <option value="Blocked / Suspended">Blocked / Suspended</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] uppercase tracking-wider text-black font-normal mb-1">Telecom Operator *</label>
                  <select
                    value={assetFields.simOperator || "Jio"}
                    onChange={(e) => setAssetFields(p => ({ ...p, simOperator: e.target.value }))}
                    className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-black focus:outline-none transition-all font-normal"
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
                      className="mt-1.5 w-full bg-white border border-[#C9A84C] focus:border-[#C9A84C] rounded-lg px-3 py-1.5 text-xs text-black font-normal"
                    />
                  )}
                </div>
                <div>
                  <label className="block text-[9px] uppercase tracking-wider text-black font-normal mb-1">Network Type</label>
                  <select
                    value={assetFields.simNetwork || "5G"}
                    onChange={(e) => setAssetFields(p => ({ ...p, simNetwork: e.target.value }))}
                    className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-black focus:outline-none transition-all font-normal"
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
                      className="mt-1.5 w-full bg-white border border-[#C9A84C] focus:border-[#C9A84C] rounded-lg px-3 py-1.5 text-xs text-black font-normal"
                    />
                  )}
                </div>
                <div>
                  <label className="block text-[9px] uppercase tracking-wider text-black font-normal mb-1">SIM Card Number / ICCID</label>
                  <input
                    type="text"
                    placeholder="e.g. 89910000..."
                    value={assetFields.simIccid || ""}
                    onChange={(e) => setAssetFields(p => ({ ...p, simIccid: e.target.value }))}
                    className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-black focus:outline-none transition-all font-mono font-normal"
                  />
                </div>
                <div>
                  <label className="block text-[9px] uppercase tracking-wider text-black font-normal mb-1">Plan Type & Recharge</label>
                  <select
                    value={assetFields.simPlanType || "Postpaid (Corporate Plan)"}
                    onChange={(e) => setAssetFields(p => ({ ...p, simPlanType: e.target.value }))}
                    className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-black focus:outline-none transition-all font-normal"
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
                      className="mt-1.5 w-full bg-white border border-[#C9A84C] focus:border-[#C9A84C] rounded-lg px-3 py-1.5 text-xs text-black font-normal"
                    />
                  )}
                </div>
                <div>
                  <label className="block text-[9px] uppercase tracking-wider text-black font-normal mb-1">SIM PUK Code / PIN</label>
                  <input
                    type="text"
                    placeholder="e.g. PUK: 12345678"
                    value={assetFields.simPuk || ""}
                    onChange={(e) => setAssetFields(p => ({ ...p, simPuk: e.target.value }))}
                    className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-black focus:outline-none transition-all font-mono font-normal"
                  />
                </div>
                <div>
                  <label className="block text-[9px] uppercase tracking-wider text-black font-normal mb-1">KYC / Registered Account Holder</label>
                  <input
                    type="text"
                    placeholder="e.g. CFI Corporate Account"
                    value={assetFields.simKycName || ""}
                    onChange={(e) => setAssetFields(p => ({ ...p, simKycName: e.target.value }))}
                    className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-black focus:outline-none transition-all font-normal"
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
            ) : typeClean === "computer" || typeClean === "desktop computer" || typeClean === "pc" ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Computer Brand & Model *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Dell OptiPlex 7090 / Custom Assembled PC"
                      value={assetFields.compModel || ""}
                      onChange={(e) => setAssetFields(p => ({ ...p, compModel: e.target.value }))}
                      className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Processor / RAM / Storage *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Intel i5 12th Gen, 16GB RAM, 512GB SSD"
                      value={assetFields.compSpecs || ""}
                      onChange={(e) => setAssetFields(p => ({ ...p, compSpecs: e.target.value }))}
                      className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Serial Number / Asset Tag</label>
                    <input
                      type="text"
                      placeholder="e.g. SN-COM9982"
                      value={assetFields.compSerial || ""}
                      onChange={(e) => setAssetFields(p => ({ ...p, compSerial: e.target.value }))}
                      className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Operating System (OS)</label>
                    <select
                      value={assetFields.compOs || "Windows 11 Pro"}
                      onChange={(e) => setAssetFields(p => ({ ...p, compOs: e.target.value }))}
                      className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-semibold"
                    >
                      <option value="Windows 11 Pro">Windows 11 Pro</option>
                      <option value="Windows 10 Pro">Windows 10 Pro</option>
                      <option value="macOS / Mac mini">macOS / Mac mini</option>
                      <option value="Ubuntu / Linux">Ubuntu / Linux</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Host Name / Computer Name</label>
                    <input
                      type="text"
                      placeholder="e.g. PC-DESK-001"
                      value={assetFields.compHostName || ""}
                      onChange={(e) => setAssetFields(p => ({ ...p, compHostName: e.target.value }))}
                      className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Computer Password / Passcode</label>
                    <input
                      type="text"
                      placeholder="e.g. Admin@123 / 4492"
                      value={assetFields.compPassword || ""}
                      onChange={(e) => setAssetFields(p => ({ ...p, compPassword: e.target.value }))}
                      className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-mono font-semibold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-50/80 p-3 rounded-xl border border-slate-200">
                  <div>
                    <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Monitor Details & Size</label>
                    <input
                      type="text"
                      placeholder="e.g. Dell 22 Inch LED / S/N: MON-991"
                      value={assetFields.compMonitor || ""}
                      onChange={(e) => setAssetFields(p => ({ ...p, compMonitor: e.target.value }))}
                      className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Keyboard Details & Model</label>
                    <input
                      type="text"
                      placeholder="e.g. Dell USB Wired KB / S/N: KB-401"
                      value={assetFields.compKeyboard || ""}
                      onChange={(e) => setAssetFields(p => ({ ...p, compKeyboard: e.target.value }))}
                      className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Mouse Details & Model</label>
                    <input
                      type="text"
                      placeholder="e.g. Dell Optical USB Mouse / Wireless"
                      value={assetFields.compMouse || ""}
                      onChange={(e) => setAssetFields(p => ({ ...p, compMouse: e.target.value }))}
                      className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Other Peripherals & Accessories</label>
                    <input
                      type="text"
                      placeholder="e.g. Headset, UPS, WebCam, Dongle..."
                      value={assetFields.compPeripherals || ""}
                      onChange={(e) => setAssetFields(p => ({ ...p, compPeripherals: e.target.value }))}
                      className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-semibold"
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
            ) : typeClean === "cpu" || typeClean === "cpu tower" || typeClean === "cabinet" ? (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">CPU Brand & Cabinet Model *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. HP ProDesk / Custom Assembled"
                    value={assetFields.cpuModel || ""}
                    onChange={(e) => setAssetFields(p => ({ ...p, cpuModel: e.target.value }))}
                    className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Processor / RAM / SSD *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Core i5 12th Gen, 16GB RAM, 512GB SSD"
                    value={assetFields.cpuSpecs || ""}
                    onChange={(e) => setAssetFields(p => ({ ...p, cpuSpecs: e.target.value }))}
                    className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Graphics Card (GPU)</label>
                  <input
                    type="text"
                    placeholder="e.g. NVIDIA GTX 1650 / Integrated"
                    value={assetFields.cpuGraphics || ""}
                    onChange={(e) => setAssetFields(p => ({ ...p, cpuGraphics: e.target.value }))}
                    className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Serial Number / Cabinet Tag</label>
                  <input
                    type="text"
                    placeholder="e.g. CPU-SN-8812"
                    value={assetFields.cpuSerial || ""}
                    onChange={(e) => setAssetFields(p => ({ ...p, cpuSerial: e.target.value }))}
                    className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-mono"
                  />
                </div>
              </div>
            ) : typeClean === "mouse" ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Mouse Brand & Model *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Logitech B100 / HP Wireless Mouse"
                    value={assetFields.mouseBrand || ""}
                    onChange={(e) => setAssetFields(p => ({ ...p, mouseBrand: e.target.value }))}
                    className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Connectivity Type *</label>
                  <select
                    value={assetFields.mouseType || "Wired USB"}
                    onChange={(e) => setAssetFields(p => ({ ...p, mouseType: e.target.value }))}
                    className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-semibold"
                  >
                    <option value="Wired USB">Wired USB</option>
                    <option value="Wireless (USB Dongle)">Wireless (USB Dongle)</option>
                    <option value="Bluetooth">Bluetooth</option>
                    <option value="Optical Gaming Mouse">Optical Gaming Mouse</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Serial Number / Tag (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. S/N: MS-9918"
                    value={assetFields.mouseSerial || ""}
                    onChange={(e) => setAssetFields(p => ({ ...p, mouseSerial: e.target.value }))}
                    className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-mono"
                  />
                </div>
              </div>
            ) : typeClean === "keyboard" ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Keyboard Brand & Model *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Logitech K120 / Dell Multimedia"
                    value={assetFields.kbBrand || ""}
                    onChange={(e) => setAssetFields(p => ({ ...p, kbBrand: e.target.value }))}
                    className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Connectivity / Key Type *</label>
                  <select
                    value={assetFields.kbType || "Wired USB"}
                    onChange={(e) => setAssetFields(p => ({ ...p, kbType: e.target.value }))}
                    className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-semibold"
                  >
                    <option value="Wired USB">Wired USB</option>
                    <option value="Wireless (USB Dongle)">Wireless (USB Dongle)</option>
                    <option value="Bluetooth">Bluetooth</option>
                    <option value="Mechanical Keyboard">Mechanical Keyboard</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Serial Number / Tag (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. S/N: KB-4412"
                    value={assetFields.kbSerial || ""}
                    onChange={(e) => setAssetFields(p => ({ ...p, kbSerial: e.target.value }))}
                    className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-mono"
                  />
                </div>
              </div>
            ) : typeClean === "monitor / display" || typeClean === "monitor" || typeClean === "display" ? (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Monitor Brand & Model *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dell P2419H / LG IPS Monitor"
                    value={assetFields.monBrand || ""}
                    onChange={(e) => setAssetFields(p => ({ ...p, monBrand: e.target.value }))}
                    className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Display Size (Inches) *</label>
                  <input
                    type="text"
                    placeholder="e.g. 21.5 Inch / 24 Inch / 27 Inch"
                    value={assetFields.monSize || ""}
                    onChange={(e) => setAssetFields(p => ({ ...p, monSize: e.target.value }))}
                    className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Resolution & Panel</label>
                  <select
                    value={assetFields.monResolution || "Full HD (1080p)"}
                    onChange={(e) => setAssetFields(p => ({ ...p, monResolution: e.target.value }))}
                    className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-semibold"
                  >
                    <option value="Full HD (1080p)">Full HD (1080p)</option>
                    <option value="2K (1440p)">2K (1440p)</option>
                    <option value="4K UHD">4K UHD</option>
                    <option value="HD (720p)">HD (720p)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Serial Number *</label>
                  <input
                    type="text"
                    placeholder="e.g. CN-0V11X-9901"
                    value={assetFields.monSerial || ""}
                    onChange={(e) => setAssetFields(p => ({ ...p, monSerial: e.target.value }))}
                    className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-mono"
                  />
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
                  <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Serial Number</label>
                  <input
                    type="text"
                    placeholder="e.g. SN-PRN1928 (Optional)"
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
            ) : typeClean?.includes("ac") || typeClean?.includes("air conditioner") ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">AC Brand & Model *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Voltas 1.5 Ton 5-Star Split AC"
                      value={assetFields.acModel || ""}
                      onChange={(e) => setAssetFields(p => ({ ...p, acModel: e.target.value }))}
                      className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">AC Type / Tonnage *</label>
                    <select
                      value={assetFields.acTypeTonnage || "1.5 Ton Split AC"}
                      onChange={(e) => setAssetFields(p => ({ ...p, acTypeTonnage: e.target.value }))}
                      className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-semibold"
                    >
                      <option value="1 Ton Split AC">1 Ton Split AC</option>
                      <option value="1.5 Ton Split AC">1.5 Ton Split AC</option>
                      <option value="2 Ton Split AC">2 Ton Split AC</option>
                      <option value="1 Ton Window AC">1 Ton Window AC</option>
                      <option value="1.5 Ton Window AC">1.5 Ton Window AC</option>
                      <option value="2 Ton Window AC">2 Ton Window AC</option>
                      <option value="Cassette AC (Ceiling)">Cassette AC (Ceiling)</option>
                      <option value="Tower / Portable AC">Tower / Portable AC</option>
                      <option value="Centralized / VRF System">Centralized / VRF System</option>
                      <option value="Other">Other</option>
                    </select>
                    {assetFields.acTypeTonnage === "Other" && (
                      <input
                        type="text"
                        placeholder="Specify custom tonnage..."
                        value={assetFields.acTypeTonnageCustom || ""}
                        onChange={(e) => setAssetFields(p => ({ ...p, acTypeTonnageCustom: e.target.value }))}
                        className="mt-1.5 w-full bg-white border border-[#C9A84C] rounded-lg px-3 py-1.5 text-xs text-[#1C1C1A] font-semibold"
                      />
                    )}
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Cooling Condition / Working Status *</label>
                    <select
                      value={assetFields.acCondition || "Excellent Cooling"}
                      onChange={(e) => setAssetFields(p => ({ ...p, acCondition: e.target.value }))}
                      className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-semibold"
                    >
                      <option value="Excellent Cooling">Excellent Cooling</option>
                      <option value="Good / Normal Cooling">Good / Normal Cooling</option>
                      <option value="Low Cooling / Gas Leak">Low Cooling / Gas Leak</option>
                      <option value="Servicing Due">Servicing Due</option>
                      <option value="Under Repair / Not Working">Under Repair / Not Working</option>
                      <option value="Scrap / Decommissioned">Scrap / Decommissioned</option>
                    </select>
                  </div>
                </div>

                {/* Servicing Details */}
                <div className="bg-amber-50/50 border border-amber-200 rounded-xl p-3.5 space-y-3">
                  <div className="text-[10px] font-black uppercase text-amber-900 flex items-center gap-1.5 border-b border-amber-200 pb-1.5">
                    🛠️ AC Servicing & Maintenance Record
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-[9px] uppercase tracking-wider text-amber-950 font-bold mb-1">Servicing Status * (servecing hui h ki nhi)</label>
                      <select
                        value={assetFields.acServicingStatus || "Done (Serviced)"}
                        onChange={(e) => setAssetFields(p => ({ ...p, acServicingStatus: e.target.value }))}
                        className="w-full bg-white border border-amber-300 rounded-lg px-3 py-2 text-xs text-black font-semibold"
                      >
                        <option value="Done (Serviced)">Yes - Serviced (Hui H)</option>
                        <option value="Pending / Due">No - Servicing Due (Nahi Hui)</option>
                        <option value="Under AMC Contract">Under AMC Contract</option>
                        <option value="Not Required Yet">Not Required Yet (New AC)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[9px] uppercase tracking-wider text-amber-950 font-bold mb-1">Last Servicing Date</label>
                      <input
                        type="date"
                        value={assetFields.acLastServicingDate || ""}
                        onChange={(e) => setAssetFields(p => ({ ...p, acLastServicingDate: e.target.value }))}
                        className="w-full bg-white border border-amber-300 rounded-lg px-3 py-1.5 text-xs text-black font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] uppercase tracking-wider text-amber-950 font-bold mb-1">Servicing Cost Amount (kitne ki hui)</label>
                      <input
                        type="number"
                        placeholder="e.g. 1500"
                        value={assetFields.acServicingCost || ""}
                        onChange={(e) => setAssetFields(p => ({ ...p, acServicingCost: e.target.value }))}
                        className="w-full bg-white border border-amber-300 rounded-lg px-3 py-1.5 text-xs text-black font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] uppercase tracking-wider text-amber-950 font-bold mb-1">Servicing Vendor / Details</label>
                      <input
                        type="text"
                        placeholder="e.g. Deep Clean & Gas Charge by Urban Company"
                        value={assetFields.acServicingVendor || ""}
                        onChange={(e) => setAssetFields(p => ({ ...p, acServicingVendor: e.target.value }))}
                        className="w-full bg-white border border-amber-300 rounded-lg px-3 py-1.5 text-xs text-black font-normal"
                      />
                    </div>
                  </div>
                </div>

                {/* Insurance & Warranty Details */}
                <div className="bg-sky-50/50 border border-sky-200 rounded-xl p-3.5 space-y-3">
                  <div className="text-[10px] font-black uppercase text-sky-900 flex items-center gap-1.5 border-b border-sky-200 pb-1.5">
                    🛡️ AC Insurance & Warranty Details
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-[9px] uppercase tracking-wider text-sky-950 font-bold mb-1">Insurance Status (insurence details)</label>
                      <select
                        value={assetFields.acInsuranceStatus || "Not Insured"}
                        onChange={(e) => setAssetFields(p => ({ ...p, acInsuranceStatus: e.target.value }))}
                        className="w-full bg-white border border-sky-300 rounded-lg px-3 py-2 text-xs text-black font-semibold"
                      >
                        <option value="Insured">Insured (Active Policy)</option>
                        <option value="Not Insured">Not Insured</option>
                        <option value="Expired">Insurance Expired</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[9px] uppercase tracking-wider text-sky-950 font-bold mb-1">Insurance Provider / Policy No.</label>
                      <input
                        type="text"
                        placeholder="e.g. ICICI Lombard / POL-987456"
                        value={assetFields.acInsuranceDetails || ""}
                        onChange={(e) => setAssetFields(p => ({ ...p, acInsuranceDetails: e.target.value }))}
                        className="w-full bg-white border border-sky-300 rounded-lg px-3 py-1.5 text-xs text-black font-normal"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] uppercase tracking-wider text-sky-950 font-bold mb-1">Insurance Expiry Date</label>
                      <input
                        type="date"
                        value={assetFields.acInsuranceExpiry || ""}
                        onChange={(e) => setAssetFields(p => ({ ...p, acInsuranceExpiry: e.target.value }))}
                        className="w-full bg-white border border-sky-300 rounded-lg px-3 py-1.5 text-xs text-black font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] uppercase tracking-wider text-sky-950 font-bold mb-1">Compressor Warranty / Details</label>
                      <input
                        type="text"
                        placeholder="e.g. 10 Years Compressor Warranty (Valid till 2034)"
                        value={assetFields.acWarrantyDetails || ""}
                        onChange={(e) => setAssetFields(p => ({ ...p, acWarrantyDetails: e.target.value }))}
                        className="w-full bg-white border border-sky-300 rounded-lg px-3 py-1.5 text-xs text-black font-normal"
                      />
                    </div>
                  </div>
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

            </div>

            {/* Section 3: Financials, Photo & Internal Notes */}
            <div className="bg-[#FCFBF9] border border-[#E8E4DF] rounded-xl p-4 space-y-3">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-black flex items-center gap-2 border-b border-[#E8E4DF] pb-2">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span> 3. Financials, Photo & Internal Notes
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[9px] uppercase tracking-wider text-black font-normal mb-1">Purchase Date (DD/MM/YYYY)</label>
                  <input
                    type="date"
                    placeholder="dd/mm/yyyy"
                    value={registerForm.purchaseDate}
                    onChange={(e) => setRegisterForm(p => ({ ...p, purchaseDate: e.target.value }))}
                    className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-black focus:outline-none transition-all font-normal"
                  />
                </div>
                <div>
                  <label className="block text-[9px] uppercase tracking-wider text-black font-normal mb-1">Purchase Value / Cost</label>
                  <input
                    type="text"
                    placeholder="e.g. ₹45,500"
                    value={registerForm.purchaseValue}
                    onChange={(e) => setRegisterForm(p => ({ ...p, purchaseValue: e.target.value }))}
                    className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-black focus:outline-none transition-all font-normal"
                  />
                </div>
                <div>
                  <label className="block text-[9px] uppercase tracking-wider text-black font-normal mb-1">Asset Photo</label>
                  <div className="flex gap-4 items-center">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handlePhotoUpload(e, false)}
                      className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-1.5 text-xs text-black focus:outline-none transition-all file:mr-4 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 font-normal"
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
                <label className="block text-[9px] uppercase tracking-wider text-black font-normal mb-1">Internal Remarks</label>
                <textarea
                  value={registerForm.notes}
                  onChange={(e) => setRegisterForm(p => ({ ...p, notes: e.target.value }))}
                  rows={2}
                  placeholder="Any vendor details, warranty information, or storage locations..."
                  className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-black focus:outline-none transition-all resize-none font-normal"
                />
              </div>
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
                {assigneeOptions.map((item: any) => (
                  <option key={item.id} value={item.id}>{item.name}</option>
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
                      {isBulkSelectMode && (
                        <th className="py-3.5 px-3 w-10 text-center animate-fade-in">
                          <input
                            type="checkbox"
                            checked={filteredInventory.length > 0 && filteredInventory.every(a => selectedAssetIds.includes(String(a.id)))}
                            onChange={() => toggleSelectAllAssets(filteredInventory)}
                            className="w-4 h-4 rounded accent-purple-700 cursor-pointer"
                            title="Select All Assets for Bulk QR Printing"
                          />
                        </th>
                      )}
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
                          {/* Selection Checkbox */}
                          {isBulkSelectMode && (
                            <td className="py-4 px-3 text-center animate-fade-in" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={selectedAssetIds.includes(String(asset.id))}
                                onChange={() => toggleSelectAsset(String(asset.id))}
                                className="w-4 h-4 rounded accent-purple-700 cursor-pointer"
                              />
                            </td>
                          )}
                          {/* Asset Category */}
                          <td className="py-4 px-4 whitespace-nowrap">
                            <div className="flex flex-col gap-1 items-start">
                              <span
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setViewingAsset(asset);
                                  setQrModalAsset(asset);
                                }}
                                className="text-[10px] bg-purple-50 hover:bg-purple-100 text-purple-700 px-2 py-0.5 rounded font-mono font-bold border border-purple-200 cursor-pointer flex items-center gap-1 transition-all"
                                title="Click to view unique QR Code Tag"
                              >
                                <QrCode className="w-3 h-3 text-purple-600" /> ID: {asset.id}
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
                                onClick={() => { setViewingAsset(asset); setQrModalAsset(asset); }}
                                className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-purple-700 hover:text-white border border-purple-200 hover:bg-purple-600 rounded-lg transition-all flex items-center gap-1"
                                title="View Unique QR Code & Print Tag"
                              >
                                <QrCode className="w-3 h-3" /> QR Tag
                              </button>
                              <button
                                onClick={() => handleStartEdit(asset)}
                                className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[#C9A84C] hover:text-white border border-[#C9A84C]/35 hover:bg-[#C9A84C] rounded-lg transition-all flex items-center gap-1"
                              >
                                <Edit3 className="w-3 h-3" /> Edit
                              </button>
                              {(asset.assignedToUserId || asset.assignedToName || asset.status === "In Use") ? (
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
                            <span className={`inline-flex items-center w-fit text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${req.status === "Pending Owner Approval"
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
                                  photoUrl: "",
                                  installationLocation: ""
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
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-7 gap-4">
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
                <div>
                  <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Installation Location (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Floor 2, Server Room..."
                    value={editForm.installationLocation || ""}
                    onChange={(e) => setEditForm(p => ({ ...p, installationLocation: e.target.value }))}
                    className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] placeholder-[#9C9890] font-semibold focus:outline-none transition-all"
                  />
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
              ) : editForm.assetType?.toLowerCase().trim() === "computer" || editForm.assetType?.toLowerCase().trim() === "desktop computer" || editForm.assetType?.toLowerCase().trim() === "pc" ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Computer Brand & Model *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Dell OptiPlex 7090 / Custom Assembled PC"
                        value={editAssetFields.compModel || ""}
                        onChange={(e) => setEditAssetFields(p => ({ ...p, compModel: e.target.value }))}
                        className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Processor / RAM / Storage *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Intel i5 12th Gen, 16GB RAM, 512GB SSD"
                        value={editAssetFields.compSpecs || ""}
                        onChange={(e) => setEditAssetFields(p => ({ ...p, compSpecs: e.target.value }))}
                        className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Serial Number / Asset Tag</label>
                      <input
                        type="text"
                        placeholder="e.g. SN-COM9982"
                        value={editAssetFields.compSerial || ""}
                        onChange={(e) => setEditAssetFields(p => ({ ...p, compSerial: e.target.value }))}
                        className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Operating System (OS)</label>
                      <select
                        value={editAssetFields.compOs || "Windows 11 Pro"}
                        onChange={(e) => setEditAssetFields(p => ({ ...p, compOs: e.target.value }))}
                        className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-semibold"
                      >
                        <option value="Windows 11 Pro">Windows 11 Pro</option>
                        <option value="Windows 10 Pro">Windows 10 Pro</option>
                        <option value="macOS / Mac mini">macOS / Mac mini</option>
                        <option value="Ubuntu / Linux">Ubuntu / Linux</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Host Name / Computer Name</label>
                      <input
                        type="text"
                        placeholder="e.g. PC-DESK-001"
                        value={editAssetFields.compHostName || ""}
                        onChange={(e) => setEditAssetFields(p => ({ ...p, compHostName: e.target.value }))}
                        className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Computer Password / Passcode</label>
                      <input
                        type="text"
                        placeholder="e.g. Admin@123 / 4492"
                        value={editAssetFields.compPassword || ""}
                        onChange={(e) => setEditAssetFields(p => ({ ...p, compPassword: e.target.value }))}
                        className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-mono font-semibold"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-50/80 p-3 rounded-xl border border-slate-200">
                    <div>
                      <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Monitor Details & Size</label>
                      <input
                        type="text"
                        placeholder="e.g. Dell 22 Inch LED / S/N: MON-991"
                        value={editAssetFields.compMonitor || ""}
                        onChange={(e) => setEditAssetFields(p => ({ ...p, compMonitor: e.target.value }))}
                        className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Keyboard Details & Model</label>
                      <input
                        type="text"
                        placeholder="e.g. Dell USB Wired KB / S/N: KB-401"
                        value={editAssetFields.compKeyboard || ""}
                        onChange={(e) => setEditAssetFields(p => ({ ...p, compKeyboard: e.target.value }))}
                        className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Mouse Details & Model</label>
                      <input
                        type="text"
                        placeholder="e.g. Dell Optical USB Mouse / Wireless"
                        value={editAssetFields.compMouse || ""}
                        onChange={(e) => setEditAssetFields(p => ({ ...p, compMouse: e.target.value }))}
                        className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Other Peripherals & Accessories</label>
                      <input
                        type="text"
                        placeholder="e.g. Headset, UPS, WebCam, Dongle..."
                        value={editAssetFields.compPeripherals || ""}
                        onChange={(e) => setEditAssetFields(p => ({ ...p, compPeripherals: e.target.value }))}
                        className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-semibold"
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
              ) : editForm.assetType?.toLowerCase().trim() === "cpu" || editForm.assetType?.toLowerCase().trim() === "cpu tower" || editForm.assetType?.toLowerCase().trim() === "cabinet" ? (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">CPU Brand & Cabinet Model *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. HP ProDesk / Custom Assembled"
                      value={editAssetFields.cpuModel || ""}
                      onChange={(e) => setEditAssetFields(p => ({ ...p, cpuModel: e.target.value }))}
                      className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Processor / RAM / SSD *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Core i5 12th Gen, 16GB RAM, 512GB SSD"
                      value={editAssetFields.cpuSpecs || ""}
                      onChange={(e) => setEditAssetFields(p => ({ ...p, cpuSpecs: e.target.value }))}
                      className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Graphics Card (GPU)</label>
                    <input
                      type="text"
                      placeholder="e.g. NVIDIA GTX 1650 / Integrated"
                      value={editAssetFields.cpuGraphics || ""}
                      onChange={(e) => setEditAssetFields(p => ({ ...p, cpuGraphics: e.target.value }))}
                      className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Serial Number / Cabinet Tag</label>
                    <input
                      type="text"
                      placeholder="e.g. CPU-SN-8812"
                      value={editAssetFields.cpuSerial || ""}
                      onChange={(e) => setEditAssetFields(p => ({ ...p, cpuSerial: e.target.value }))}
                      className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-mono"
                    />
                  </div>
                </div>
              ) : editForm.assetType?.toLowerCase().trim() === "mouse" ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Mouse Brand & Model *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Logitech B100 / HP Wireless Mouse"
                      value={editAssetFields.mouseBrand || ""}
                      onChange={(e) => setEditAssetFields(p => ({ ...p, mouseBrand: e.target.value }))}
                      className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Connectivity Type *</label>
                    <select
                      value={editAssetFields.mouseType || "Wired USB"}
                      onChange={(e) => setEditAssetFields(p => ({ ...p, mouseType: e.target.value }))}
                      className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-semibold"
                    >
                      <option value="Wired USB">Wired USB</option>
                      <option value="Wireless (USB Dongle)">Wireless (USB Dongle)</option>
                      <option value="Bluetooth">Bluetooth</option>
                      <option value="Optical Gaming Mouse">Optical Gaming Mouse</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Serial Number / Tag (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. S/N: MS-9918"
                      value={editAssetFields.mouseSerial || ""}
                      onChange={(e) => setEditAssetFields(p => ({ ...p, mouseSerial: e.target.value }))}
                      className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-mono"
                    />
                  </div>
                </div>
              ) : editForm.assetType?.toLowerCase().trim() === "keyboard" ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Keyboard Brand & Model *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Logitech K120 / Dell Multimedia"
                      value={editAssetFields.kbBrand || ""}
                      onChange={(e) => setEditAssetFields(p => ({ ...p, kbBrand: e.target.value }))}
                      className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Connectivity / Key Type *</label>
                    <select
                      value={editAssetFields.kbType || "Wired USB"}
                      onChange={(e) => setEditAssetFields(p => ({ ...p, kbType: e.target.value }))}
                      className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-semibold"
                    >
                      <option value="Wired USB">Wired USB</option>
                      <option value="Wireless (USB Dongle)">Wireless (USB Dongle)</option>
                      <option value="Bluetooth">Bluetooth</option>
                      <option value="Mechanical Keyboard">Mechanical Keyboard</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Serial Number / Tag (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. S/N: KB-4412"
                      value={editAssetFields.kbSerial || ""}
                      onChange={(e) => setEditAssetFields(p => ({ ...p, kbSerial: e.target.value }))}
                      className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-mono"
                    />
                  </div>
                </div>
              ) : editForm.assetType?.toLowerCase().trim() === "monitor / display" || editForm.assetType?.toLowerCase().trim() === "monitor" || editForm.assetType?.toLowerCase().trim() === "display" ? (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Monitor Brand & Model *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Dell P2419H / LG IPS Monitor"
                      value={editAssetFields.monBrand || ""}
                      onChange={(e) => setEditAssetFields(p => ({ ...p, monBrand: e.target.value }))}
                      className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Display Size (Inches) *</label>
                    <input
                      type="text"
                      placeholder="e.g. 21.5 Inch / 24 Inch / 27 Inch"
                      value={editAssetFields.monSize || ""}
                      onChange={(e) => setEditAssetFields(p => ({ ...p, monSize: e.target.value }))}
                      className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Resolution & Panel</label>
                    <select
                      value={editAssetFields.monResolution || "Full HD (1080p)"}
                      onChange={(e) => setEditAssetFields(p => ({ ...p, monResolution: e.target.value }))}
                      className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-semibold"
                    >
                      <option value="Full HD (1080p)">Full HD (1080p)</option>
                      <option value="2K (1440p)">2K (1440p)</option>
                      <option value="4K UHD">4K UHD</option>
                      <option value="HD (720p)">HD (720p)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Serial Number *</label>
                    <input
                      type="text"
                      placeholder="e.g. CN-0V11X-9901"
                      value={editAssetFields.monSerial || ""}
                      onChange={(e) => setEditAssetFields(p => ({ ...p, monSerial: e.target.value }))}
                      className="w-full bg-white border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 py-2 text-xs text-[#1C1C1A] focus:outline-none transition-all font-mono"
                    />
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
                    <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Serial Number</label>
                    <input
                      type="text"
                      placeholder="e.g. SN-PRN1928 (Optional)"
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

              {/* Internal Remarks */}
              <div>
                <label className="block text-[9px] uppercase tracking-wider text-[#9C9890] font-bold mb-1">Internal Remarks</label>
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
                } catch (_) { }
                const fields = parsedCustom.assetFields || {};
                const emails = parsedCustom.emailsList || [];
                const companyName = companies.find(c => String(c.id) === String(viewingAsset.companyId))?.name || "General Stock";

                return (
                  <div className="space-y-4">
                    {/* Unique QR Code Card */}
                    <div className="bg-purple-50/70 border border-purple-200 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xs">
                      <div className="flex items-center gap-4">
                        {qrDataUrl ? (
                          <img src={qrDataUrl} alt="Asset QR Code" className="w-24 h-24 object-contain bg-white p-1 rounded-lg border border-purple-200 shadow-sm shrink-0" />
                        ) : (
                          <div className="w-24 h-24 bg-white rounded-lg border border-purple-200 flex items-center justify-center text-purple-400">
                            <QrCode className="w-8 h-8 animate-pulse" />
                          </div>
                        )}
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-purple-900 uppercase font-mono tracking-wider flex items-center gap-1">
                              <QrCode className="w-3.5 h-3.5 text-purple-600" /> Unique Asset QR Code
                            </span>
                            <span className="px-2 py-0.5 bg-purple-200 text-purple-900 rounded font-mono font-bold text-[10px]">ID: {viewingAsset.id}</span>
                          </div>
                          <p className="text-[10px] text-purple-700 font-semibold">
                            Scan with any camera or phone to view clean Asset ID without website redirection.
                          </p>
                          <div className="text-[9px] text-purple-800/80 font-mono truncate max-w-xs md:max-w-md bg-purple-100/60 px-2 py-0.5 rounded inline-block">
                            Payload: Internal HRMS Tag ({viewingAsset.id})
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap md:flex-col gap-2 shrink-0 w-full md:w-auto">
                        <button
                          type="button"
                          onClick={() => handleDownloadDirectPdf("pdf", viewingAsset)}
                          className="flex-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm"
                          title="Directly download PDF specification sheet file"
                        >
                          <Download className="w-3.5 h-3.5" /> Download PDF Sheet
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDownloadDirectPdf("label", viewingAsset)}
                          className="flex-1 px-3 py-1.5 bg-purple-700 hover:bg-purple-800 text-white rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm"
                          title="Directly download QR sticker label tag PDF"
                        >
                          <Download className="w-3.5 h-3.5" /> Download QR Tag PDF
                        </button>
                        <button
                          type="button"
                          onClick={() => handlePrintAssetTag(viewingAsset, "label")}
                          className="flex-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm"
                        >
                          <Printer className="w-3.5 h-3.5" /> Print QR Tag
                        </button>
                      </div>
                    </div>

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
                        {fields.compMonitor && <div><span className="text-[#9C9890] block text-[9px]">MONITOR DETAILS:</span> {fields.compMonitor}</div>}
                        {fields.compKeyboard && <div><span className="text-[#9C9890] block text-[9px]">KEYBOARD DETAILS:</span> {fields.compKeyboard}</div>}
                        {fields.compMouse && <div><span className="text-[#9C9890] block text-[9px]">MOUSE DETAILS:</span> {fields.compMouse}</div>}
                        {fields.compPeripherals && <div><span className="text-[#9C9890] block text-[9px]">PERIPHERALS / ACCESSORIES:</span> {fields.compPeripherals}</div>}
                        {fields.laptopCharger && <div><span className="text-[#9C9890] block text-[9px]">CHARGER INCLUDED:</span> {fields.laptopCharger}</div>}
                        {fields.laptopBag && <div><span className="text-[#9C9890] block text-[9px]">BAG & MOUSE:</span> {fields.laptopBag}</div>}
                        {fields.simPlanType && <div><span className="text-[#9C9890] block text-[9px]">SIM PLAN TYPE:</span> {fields.simPlanType}</div>}
                        {fields.simPuk && <div><span className="text-[#9C9890] block text-[9px]">SIM PUK / PIN:</span> <span className="font-mono">{fields.simPuk}</span></div>}
                        {fields.routerWifiSsid && <div><span className="text-[#9C9890] block text-[9px]">WI-FI SSID & PASS:</span> {fields.routerWifiSsid}</div>}
                        {fields.routerIp && <div><span className="text-[#9C9890] block text-[9px]">ADMIN IP:</span> <span className="font-mono">{fields.routerIp}</span></div>}
                        {fields.printerCartridge && <div><span className="text-[#9C9890] block text-[9px]">TONER / CARTRIDGE:</span> <span className="font-bold text-amber-900">{fields.printerCartridge}</span></div>}
                        {(viewingAsset.installationLocation || fields.installationLocation || fields.furnitureLocation || fields.acLocation) && (
                          <div><span className="text-[#9C9890] block text-[9px]">INSTALLATION LOCATION:</span> <span className="font-bold text-indigo-900">{viewingAsset.installationLocation || fields.installationLocation || fields.furnitureLocation || fields.acLocation}</span></div>
                        )}
                        <div><span className="text-[#9C9890] block text-[9px]">CONDITION:</span> {viewingAsset.condition || "Good"}</div>
                        <div><span className="text-[#9C9890] block text-[9px]">STATUS:</span> {viewingAsset.status || "Available"}</div>
                      </div>
                    </div>

                    {/* Passwords & Access */}
                    {(fields.phonePassword || fields.laptopPassword || fields.compPassword || emails.length > 0) && (
                      <div className="bg-amber-50/50 border border-amber-200/60 rounded-xl p-4 space-y-2">
                        <h4 className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">Passwords & Accounts</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 font-semibold text-slate-700">
                          {fields.phonePassword && (
                            <div><span className="text-amber-900/60 block text-[9px]">PHONE SCREEN LOCK PASSCODE:</span> <span className="font-mono bg-white px-2 py-0.5 rounded border border-amber-200 font-bold text-amber-900">{fields.phonePassword}</span></div>
                          )}
                          {fields.laptopPassword && (
                            <div><span className="text-amber-900/60 block text-[9px]">LAPTOP ADMIN PASSCODE:</span> <span className="font-mono bg-white px-2 py-0.5 rounded border border-amber-200 font-bold text-amber-900">{fields.laptopPassword}</span></div>
                          )}
                          {fields.compPassword && (
                            <div><span className="text-amber-900/60 block text-[9px]">COMPUTER LOCK PASSCODE / PASSWORD:</span> <span className="font-mono bg-white px-2 py-0.5 rounded border border-amber-200 font-bold text-amber-900">{fields.compPassword}</span></div>
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

                    {(() => {
                      const cleanNotes = cleanNotesString(viewingAsset.notes || "");
                      if (!cleanNotes) return null;
                      return (
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                          <span className="text-[#9C9890] block text-[9px] font-bold uppercase mb-1">INTERNAL REMARKS:</span>
                          <p className="whitespace-pre-wrap text-slate-700 font-medium">{cleanNotes}</p>
                        </div>
                      );
                    })()}
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
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-[10px] uppercase tracking-wider font-bold text-slate-500">
                    Select Employee *
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsCustomEmployee(!isCustomEmployee);
                      setAssignmentUserId(isCustomEmployee ? "" : "CUSTOM_OTHER");
                      setCustomEmployeeName("");
                    }}
                    className="text-[10px] font-bold text-indigo-600 hover:underline"
                  >
                    {isCustomEmployee ? "📋 Select from DB" : "✏️ Type Custom Name"}
                  </button>
                </div>

                {!isCustomEmployee && assignmentUserId !== "CUSTOM_OTHER" ? (
                  <select
                    value={assignmentUserId}
                    onChange={(event) => {
                      const val = event.target.value;
                      if (val === "CUSTOM_OTHER") {
                        setIsCustomEmployee(true);
                        setAssignmentUserId(val);
                        setCustomEmployeeName("");
                      } else {
                        setAssignmentUserId(val);
                      }
                    }}
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
                    <option value="CUSTOM_OTHER">✏️ Type Custom Employee Name (Not in DB)</option>
                  </select>
                ) : (
                  <input
                    type="text"
                    required
                    value={customEmployeeName}
                    onChange={(e) => {
                      setCustomEmployeeName(e.target.value);
                      setAssignmentUserId("CUSTOM_OTHER");
                      setIsCustomEmployee(true);
                    }}
                    placeholder="Enter full employee name (e.g. Deepak Sharma)..."
                    className="w-full border border-indigo-500 rounded-lg px-3 py-2.5 text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-200"
                  />
                )}
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

      {/* Scanner & Quick Search Modal */}
      {showScannerModal && typeof document !== "undefined" && ReactDOM.createPortal(
        <div className="fixed inset-0 z-[10000] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col font-sans">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-purple-900 text-white">
              <div className="flex items-center gap-2">
                <QrCode className="w-5 h-5 text-purple-300" />
                <h3 className="text-sm font-bold uppercase tracking-wide">Scan Asset QR Code</h3>
              </div>
              <button onClick={() => setShowScannerModal(false)} className="p-1 rounded hover:bg-purple-800 text-purple-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <p className="text-slate-600 font-semibold">
                Scan asset QR code with barcode reader/camera, or enter Asset ID / Serial Number below to immediately fetch specs & images:
              </p>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleScanQrResult(scanInputValue);
                }}
                className="space-y-3"
              >
                <div>
                  <label className="block text-[10px] uppercase tracking-wider font-bold text-slate-500 mb-1">
                    Enter Asset ID, Serial No. or Scan Code
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      autoFocus
                      placeholder="e.g. AST-1001 or scan QR code..."
                      value={scanInputValue}
                      onChange={(e) => {
                        setScanInputValue(e.target.value);
                        if (e.target.value.trim().length >= 4) {
                          handleScanQrResult(e.target.value);
                        }
                      }}
                      className="flex-1 border-2 border-purple-300 focus:border-purple-600 rounded-xl p-2.5 text-sm font-mono font-bold text-slate-800 focus:outline-none shadow-xs"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2.5 bg-purple-700 hover:bg-purple-800 text-white rounded-xl font-bold text-xs uppercase tracking-wider shadow-sm transition-all"
                    >
                      Find
                    </button>
                  </div>
                </div>
              </form>

              {/* Suggestions / Recent Inventory Stock */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="text-[10px] uppercase font-bold text-slate-400">Quick Inventory Suggestions</div>
                <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
                  {inventory.slice(0, 10).map((asset) => (
                    <div
                      key={asset.id}
                      onClick={() => {
                        setViewingAsset(asset);
                        setShowScannerModal(false);
                      }}
                      className="p-2 border border-slate-200 rounded-lg flex items-center justify-between hover:bg-purple-50 hover:border-purple-300 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] bg-purple-100 text-purple-800 font-mono font-bold px-1.5 py-0.5 rounded">{asset.id}</span>
                        <span className="font-bold text-slate-800 text-xs">{asset.assetType} - {asset.assetDetail || "No Description"}</span>
                      </div>
                      <span className="text-[9px] text-slate-400 font-mono">{asset.serialNumber ? `S/N: ${asset.serialNumber}` : ""}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setShowScannerModal(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-lg transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Floating Bulk QR Print Toolbar */}
      {/* Floating Bulk Action Bar (Mounted directly on document.body via Portal so it always floats on viewport) */}
      {isBulkSelectMode && typeof document !== "undefined" && ReactDOM.createPortal(
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[99999] bg-slate-900/95 text-white backdrop-blur-xl px-5 py-3.5 rounded-2xl shadow-2xl border border-indigo-500/40 flex flex-wrap items-center gap-4 animate-in fade-in slide-in-from-bottom-5 duration-200 font-sans max-w-[95vw] shadow-indigo-950/50">
          <div className="flex items-center gap-2.5 pr-3 border-r border-slate-700/80">
            <span className="w-7 h-7 rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 text-white font-black text-xs flex items-center justify-center font-mono shadow-md">
              {selectedAssetIds.length}
            </span>
            <div>
              <div className="text-[11px] font-black uppercase tracking-wider text-slate-100 flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5 text-purple-400" />
                {selectedAssetIds.length === 0 ? "Select Assets Below" : `${selectedAssetIds.length} Assets Selected`}
              </div>
              <div className="text-[9px] text-slate-400 font-medium">Bulk Action Workspace</div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => toggleSelectAllAssets(filteredInventory)}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-all border border-slate-700 flex items-center gap-1"
            >
              <Check className="w-3.5 h-3.5 text-indigo-400" />
              {filteredInventory.length > 0 && filteredInventory.every(a => selectedAssetIds.includes(String(a.id))) ? "Deselect All" : "Select All"}
            </button>

            <button
              type="button"
              disabled={isBulkPrinting || selectedAssetIds.length === 0}
              onClick={() => handleDownloadDirectPdf("label")}
              className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-lg shadow-purple-950/50"
              title="Directly download a .pdf file containing QR sticker tags"
            >
              <Download className="w-3.5 h-3.5" />
              {isBulkPrinting ? "Generating..." : `Download QR Tags (${selectedAssetIds.length})`}
            </button>

            <button
              type="button"
              disabled={isBulkPrinting || selectedAssetIds.length === 0}
              onClick={() => handleDownloadDirectPdf("pdf")}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-lg shadow-emerald-950/50"
              title="Directly download specification sheets PDF"
            >
              <Download className="w-3.5 h-3.5" />
              PDF Sheets
            </button>

            <button
              type="button"
              disabled={isBulkPrinting || selectedAssetIds.length === 0}
              onClick={() => handleBulkPrintQrTags("label")}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border border-slate-700"
              title="Open browser print preview dialog"
            >
              <Printer className="w-3.5 h-3.5" /> Print View
            </button>

            <button
              type="button"
              onClick={() => {
                setIsBulkSelectMode(false);
                setSelectedAssetIds([]);
              }}
              className="px-3 py-2 bg-rose-900/80 hover:bg-rose-800 text-rose-200 rounded-xl text-xs font-bold transition-all border border-rose-800/50 flex items-center gap-1"
            >
              <X className="w-3.5 h-3.5" /> Exit
            </button>
          </div>
        </div>,
        document.body
      )}

      {/* Hidden Printable Container for QR Label Tags */}
      {(viewingAsset || selectedAssetIds.length > 0) && (
        <div id="asset-printable-area" className="font-sans text-slate-900 bg-white p-4">
          <style>{`
            #asset-printable-area {
              display: none;
            }
            @media print {
              @page {
                size: portrait;
                margin: 10mm;
              }
              body {
                visibility: hidden !important;
                background: white !important;
              }
              #asset-printable-area, #asset-printable-area * {
                visibility: visible !important;
              }
              #asset-printable-area {
                display: block !important;
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                background: white !important;
                padding-top: 30px !important;
                margin: 0 !important;
              }
              .page-break-after {
                page-break-after: always !important;
                break-after: page !important;
              }
              .page-break-inside-avoid {
                page-break-inside: avoid !important;
                break-inside: avoid !important;
              }
            }
          `}</style>

          {/* Top Whitespace Buffer for Print View */}
          <div className="w-full h-8 block print:h-12 shrink-0 pointer-events-none" />

          {/* SINGLE ASSET PRINT */}
          {viewingAsset && selectedAssetIds.length === 0 && (
            printableMode === "label" ? (
              /* Clean QR Tag Print Layout: Only QR Code + Asset ID underneath */
              <div className="flex flex-col items-center justify-center p-8 bg-white text-slate-900 mx-auto my-8 font-sans">
                {qrDataUrl ? (
                  <img src={qrDataUrl} alt="Asset QR Code" className="w-80 h-80 object-contain mb-4" />
                ) : (
                  <div className="text-sm font-bold text-slate-400">Generating QR Code...</div>
                )}
                <div className="text-2xl font-black font-mono tracking-wider text-slate-950 uppercase">
                  ASSET ID: {viewingAsset.id}
                </div>
                {viewingAsset.oldAssetId && (
                  <div className="text-base font-mono text-slate-600 mt-1 font-bold">
                    OLD ID: {viewingAsset.oldAssetId}
                  </div>
                )}
              </div>
            ) : (
              /* Full Page A4 Asset Specification & Audit Document */
              <div className="max-w-3xl mx-auto p-6 bg-white text-slate-900 font-sans border-2 border-slate-900 rounded-xl space-y-6">
                <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4">
                  <div>
                    <h1 className="text-xl font-black uppercase tracking-wide text-indigo-950">ASSET SPECIFICATION & AUDIT CARD</h1>
                    <p className="text-xs font-bold text-slate-600">
                      {companies.find(c => String(c.id) === String(viewingAsset.companyId))?.name || "Company Inventory Management"}
                    </p>
                    <p className="text-[10px] text-slate-400 font-mono mt-1">Generated: {new Date().toLocaleDateString("en-IN")}</p>
                  </div>
                  <div className="text-right flex items-center gap-4">
                    {qrDataUrl && <img src={qrDataUrl} alt="Asset QR" className="w-24 h-24 border-2 border-slate-900 rounded p-1 shrink-0" />}
                    <div>
                      <div className="text-base font-black font-mono bg-slate-900 text-white px-3 py-1 rounded inline-block">{viewingAsset.id}</div>
                      <div className="text-xs font-bold text-slate-700 mt-1">Status: {viewingAsset.status}</div>
                    </div>
                  </div>
                </div>

                {/* Photo & Specs Grid */}
                <div className="grid grid-cols-3 gap-4">
                  {viewingAsset.photoUrl && (
                    <div className="col-span-1">
                      <img src={viewingAsset.photoUrl} alt="Asset photo" className="w-full h-44 object-cover rounded-lg border border-slate-300" />
                    </div>
                  )}
                  <div className={viewingAsset.photoUrl ? "col-span-2 space-y-2" : "col-span-3 space-y-2"}>
                    <table className="w-full text-xs text-left border-collapse border border-slate-300">
                      <tbody>
                        <tr className="border-b border-slate-300"><th className="p-2 bg-slate-100 border-r border-slate-300 w-1/3">Asset ID:</th><td className="p-2 font-mono font-bold">{viewingAsset.id}</td></tr>
                        <tr className="border-b border-slate-300"><th className="p-2 bg-slate-100 border-r border-slate-300">Asset Type:</th><td className="p-2 font-bold">{viewingAsset.assetType}</td></tr>
                        <tr className="border-b border-slate-300"><th className="p-2 bg-slate-100 border-r border-slate-300">Description / Specs:</th><td className="p-2 font-semibold">{viewingAsset.assetDetail || "N/A"}</td></tr>
                        <tr className="border-b border-slate-300"><th className="p-2 bg-slate-100 border-r border-slate-300">Serial Number / IMEI:</th><td className="p-2 font-mono">{viewingAsset.serialNumber || "N/A"}</td></tr>
                        <tr className="border-b border-slate-300"><th className="p-2 bg-slate-100 border-r border-slate-300">Condition:</th><td className="p-2 font-semibold">{viewingAsset.condition}</td></tr>
                        <tr className="border-b border-slate-300"><th className="p-2 bg-slate-100 border-r border-slate-300">Assigned To:</th><td className="p-2 font-bold text-indigo-900">{viewingAsset.assignedToName || "Unallocated (In Stock)"}</td></tr>
                        <tr><th className="p-2 bg-slate-100 border-r border-slate-300">Handover Date:</th><td className="p-2">{formatDateDDMMYY(viewingAsset.handoverDate || viewingAsset.assignedAt) || "N/A"}</td></tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Signatures */}
                <div className="pt-8 border-t-2 border-slate-300 grid grid-cols-2 gap-8 text-xs font-bold">
                  <div className="border-t border-slate-900 pt-2 text-center">
                    <p>Employee Acknowledgment & Signature</p>
                    <p className="text-[10px] font-normal text-slate-500">Received asset in good condition</p>
                  </div>
                  <div className="border-t border-slate-900 pt-2 text-center">
                    <p>Admin / IT Department Clearance</p>
                    <p className="text-[10px] font-normal text-slate-500">Authorized System Record</p>
                  </div>
                </div>
              </div>
            )
          )}

          {/* BULK / BATCH ASSET PRINT */}
          {selectedAssetIds.length > 0 && (
            printableMode === "label" ? (
              /* Bulk Sticker Tags Sheet Grid (2 Columns, 3-4 rows per page) */
              <div className="grid grid-cols-2 gap-5 p-2 pt-8 mt-4 font-sans">
                {selectedAssetIds
                  .map(id => inventory.find(a => String(a.id) === String(id)))
                  .filter((a): a is any => Boolean(a))
                  .map(asset => {
                    const qr = bulkQrDataMap[String(asset.id)];
                    const company = companies.find(c => String(c.id) === String(asset.companyId))?.name || "OFFICIAL ASSET TAG";
                    return (
                      <div key={asset.id} className="w-[3.4in] h-[2.2in] border-2 border-slate-900 rounded-xl p-3 flex flex-col justify-between bg-white text-slate-900 page-break-inside-avoid my-2">
                        <div className="flex justify-between items-start border-b-2 border-slate-900 pb-1">
                          <div>
                            <div className="text-[9px] font-black uppercase tracking-widest text-slate-700">{company}</div>
                            <div className="text-xs font-black uppercase text-indigo-900">{asset.assetType}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs font-black font-mono bg-slate-900 text-white px-2 py-0.5 rounded">{asset.id}</div>
                            {asset.oldAssetId && <div className="text-[8px] font-mono text-slate-600">Old: {asset.oldAssetId}</div>}
                          </div>
                        </div>

                        <div className="flex items-center gap-3 py-1">
                          {qr ? (
                            <img src={qr} alt="Asset QR Code" className="w-20 h-20 object-contain border border-slate-900 rounded p-0.5 shrink-0" />
                          ) : (
                            <div className="w-20 h-20 bg-slate-100 flex items-center justify-center text-[9px]">QR CODE</div>
                          )}
                          <div className="text-[9px] space-y-0.5 font-semibold text-slate-800 flex-1">
                            <div className="font-bold leading-snug line-clamp-2">{asset.assetDetail || "No Description"}</div>
                            {asset.serialNumber && <div>S/N: <span className="font-mono font-bold">{asset.serialNumber}</span></div>}
                            {asset.assignedToName && <div className="text-indigo-900 font-bold">Assigned: {asset.assignedToName}</div>}
                            <div className="text-[8px] text-slate-500 font-mono">Status: {asset.status || "Available"}</div>
                          </div>
                        </div>

                        <div className="border-t border-slate-900 pt-1 text-[8px] font-black uppercase tracking-wider text-center text-slate-600 flex justify-between">
                          <span>PROPERTY OF COMPANY</span>
                          <span>DO NOT REMOVE</span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            ) : (
              /* Bulk A4 Spec Sheets (1 page per asset) */
              <div className="space-y-8 font-sans">
                {selectedAssetIds
                  .map(id => inventory.find(a => String(a.id) === String(id)))
                  .filter((a): a is any => Boolean(a))
                  .map((asset, idx) => {
                    const qr = bulkQrDataMap[String(asset.id)];
                    const company = companies.find(c => String(c.id) === String(asset.companyId))?.name || "Company Inventory Management";
                    return (
                      <div key={asset.id} className="max-w-3xl mx-auto p-6 bg-white text-slate-900 border-2 border-slate-900 rounded-xl space-y-6 page-break-after">
                        <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4">
                          <div>
                            <h1 className="text-xl font-black uppercase tracking-wide text-indigo-950">ASSET SPECIFICATION & AUDIT CARD</h1>
                            <p className="text-xs font-bold text-slate-600">{company}</p>
                            <p className="text-[10px] text-slate-400 font-mono mt-1">Generated: {new Date().toLocaleDateString("en-IN")} · Page {idx + 1} of {selectedAssetIds.length}</p>
                          </div>
                          <div className="text-right flex items-center gap-4">
                            {qr && <img src={qr} alt="Asset QR" className="w-24 h-24 border-2 border-slate-900 rounded p-1 shrink-0" />}
                            <div>
                              <div className="text-base font-black font-mono bg-slate-900 text-white px-3 py-1 rounded inline-block">{asset.id}</div>
                              <div className="text-xs font-bold text-slate-700 mt-1">Status: {asset.status}</div>
                            </div>
                          </div>
                        </div>

                        {/* Specs Table */}
                        <div className="grid grid-cols-3 gap-4">
                          {asset.photoUrl && (
                            <div className="col-span-1">
                              <img src={asset.photoUrl} alt="Asset photo" className="w-full h-44 object-cover rounded-lg border border-slate-300" />
                            </div>
                          )}
                          <div className={asset.photoUrl ? "col-span-2 space-y-2" : "col-span-3 space-y-2"}>
                            <table className="w-full text-xs text-left border-collapse border border-slate-300">
                              <tbody>
                                <tr className="border-b border-slate-300"><th className="p-2 bg-slate-100 border-r border-slate-300 w-1/3">Asset ID:</th><td className="p-2 font-mono font-bold">{asset.id}</td></tr>
                                <tr className="border-b border-slate-300"><th className="p-2 bg-slate-100 border-r border-slate-300">Asset Type:</th><td className="p-2 font-bold">{asset.assetType}</td></tr>
                                <tr className="border-b border-slate-300"><th className="p-2 bg-slate-100 border-r border-slate-300">Description / Specs:</th><td className="p-2 font-semibold">{asset.assetDetail || "N/A"}</td></tr>
                                <tr className="border-b border-slate-300"><th className="p-2 bg-slate-100 border-r border-slate-300">Serial Number / IMEI:</th><td className="p-2 font-mono">{asset.serialNumber || "N/A"}</td></tr>
                                <tr className="border-b border-slate-300"><th className="p-2 bg-slate-100 border-r border-slate-300">Condition:</th><td className="p-2 font-semibold">{asset.condition}</td></tr>
                                <tr className="border-b border-slate-300"><th className="p-2 bg-slate-100 border-r border-slate-300">Assigned To:</th><td className="p-2 font-bold text-indigo-900">{asset.assignedToName || "Unallocated (In Stock)"}</td></tr>
                                <tr><th className="p-2 bg-slate-100 border-r border-slate-300">Handover Date:</th><td className="p-2">{formatDateDDMMYY(asset.handoverDate || asset.assignedAt) || "N/A"}</td></tr>
                              </tbody>
                            </table>
                          </div>
                        </div>

                        {/* Signatures */}
                        <div className="pt-8 border-t-2 border-slate-300 grid grid-cols-2 gap-8 text-xs font-bold">
                          <div className="border-t border-slate-900 pt-2 text-center">
                            <p>Employee Acknowledgment & Signature</p>
                            <p className="text-[10px] font-normal text-slate-500">Received asset in good condition</p>
                          </div>
                          <div className="border-t border-slate-900 pt-2 text-center">
                            <p>Admin / IT Department Clearance</p>
                            <p className="text-[10px] font-normal text-slate-500">Authorized System Record</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )
          )}
        </div>
      )}

    </div>
  );
}
