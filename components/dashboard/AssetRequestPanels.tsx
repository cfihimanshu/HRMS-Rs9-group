"use client";
import React, { useState, useEffect } from "react";
import {
  Laptop, Cpu, Plus, CheckCircle2, AlertCircle,
  Search, ShieldAlert, Clock, RefreshCw, Send,
  User, Check, X, ShieldCheck, Truck, MessageSquare,
  Package, Coins, List, LayoutGrid
} from "lucide-react";

interface AssetRequestProps {
  sessionUser?: any;
  triggerToast: (msg: string) => void;
  setActiveTab?: (tab: string) => void;
}

export function AssetRequestLogs({ sessionUser, triggerToast, setActiveTab }: AssetRequestProps) {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [isDark, setIsDark] = useState<boolean>(false);

  // Inventory modal states
  const [showInventoryModal, setShowInventoryModal] = useState(false);
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [selectedAssetId, setSelectedAssetId] = useState<number | null>(null);
  const [activeReqId, setActiveReqId] = useState<any>(null);
  const [activeReqType, setActiveReqType] = useState<string>("");
  const [loadingInventory, setLoadingInventory] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [activeStatFilter, setActiveStatFilter] = useState<"ALL" | "PENDING" | "APPROVED" | "HIGH">("ALL");
  const [viewMode, setViewMode] = useState<"cards" | "table">("table");

  // New Request Form
  const [assetType, setAssetType] = useState("Laptop");
  const [customAssetType, setCustomAssetType] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [reason, setReason] = useState("");

  // Action remarks modal/input
  const [remarksMap, setRemarksMap] = useState<Record<string, string>>({});

  const userRole = (sessionUser?.role || "Employee").toLowerCase();
  const userDept = (sessionUser?.department || "").toLowerCase();
  const isOwnerOrDirector = ["owner", "director"].includes(userRole);
  const isDeptManager = ["department manager", "department-manager"].includes(userRole);
  const isAdministration = userDept.includes("administration");
  const isHR = ["hr head", "hr-head", "hr executive", "hr-executive"].includes(userRole);

  const isManager = isOwnerOrDirector || isHR || isDeptManager || isAdministration;
  const isOwnerOrHR = isOwnerOrDirector || isHR;
  const canRequest = true; // All authenticated users can raise asset requisitions

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
    fetchRequests();
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains("dark"));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/assets/request");
      const data = await res.json();
      if (data.success) {
        setRequests(data.data || []);
      } else {
        triggerToast("Failed to load asset requests");
      }
    } catch (err) {
      console.error(err);
      triggerToast("Error fetching asset requests");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (assetType === "Other Accessories" && !customAssetType.trim()) {
      triggerToast("Please specify the accessory name.");
      return;
    }
    if (!reason.trim()) {
      triggerToast("Please describe the specifications/reason.");
      return;
    }

    const finalAssetType = assetType === "Other Accessories"
      ? `Other: ${customAssetType.trim()}`
      : assetType;

    try {
      setSubmitting(true);
      const res = await fetch("/api/assets/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          asset_type: finalAssetType,
          priority,
          reason
        })
      });

      const data = await res.json();
      if (data.success) {
        triggerToast("Asset request submitted successfully!");
        setReason("");
        setAssetType("Laptop");
        setPriority("Medium");
        setCustomAssetType("");
        fetchRequests();
      } else {
        triggerToast(data.error || "Failed to submit request");
      }
    } catch (err) {
      console.error(err);
      triggerToast("Error submitting request");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (requestId: number, newStatus: string) => {
    const admin_remarks = remarksMap[requestId] || "";
    try {
      const res = await fetch("/api/assets/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update-status",
          requestId,
          status: newStatus,
          admin_remarks
        })
      });

      const data = await res.json();
      if (data.success) {
        triggerToast(`Request marked as ${newStatus}`);
        setRemarksMap(prev => ({ ...prev, [requestId]: "" }));
        fetchRequests();
      } else {
        triggerToast(data.error || "Failed to update status");
      }
    } catch (err) {
      console.error(err);
      triggerToast("Error updating status");
    }
  };

  const fetchAvailableInventory = async (type: string) => {
    try {
      setLoadingInventory(true);
      const res = await fetch("/api/assets/inventory");
      const data = await res.json();
      if (data.success) {
        const matches = data.data.filter((item: any) =>
          item.status === "Available" &&
          (item.assetType || "").toLowerCase().includes(type.toLowerCase())
        );
        const others = data.data.filter((item: any) =>
          item.status === "Available" &&
          !(item.assetType || "").toLowerCase().includes(type.toLowerCase())
        );
        setInventoryItems([...matches, ...others]);
      }
    } catch (err) {
      console.error("Error fetching inventory:", err);
    } finally {
      setLoadingInventory(false);
    }
  };

  const handleConfirmGrant = async () => {
    if (!selectedAssetId) {
      triggerToast("Please select an asset from inventory.");
      return;
    }
    const selectedAsset = inventoryItems.find(item => item.id === selectedAssetId);
    if (!selectedAsset) return;

    const req = requests.find(r => r.id === activeReqId);
    if (!req) return;

    const remarks = remarksMap[activeReqId] || "";
    const dispatchDetails = `[From Inventory] Serial: ${selectedAsset.serialNumber || 'N/A'}, Detail: ${selectedAsset.assetDetail || 'N/A'}. ${remarks}`;

    try {
      const reqRes = await fetch("/api/assets/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update-status",
          requestId: activeReqId,
          status: "Dispatched (Inventory)",
          admin_remarks: dispatchDetails
        })
      });
      const reqData = await reqRes.json();

      if (reqData.success) {
        await fetch("/api/assets/inventory", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: selectedAssetId,
            status: "Assigned",
            notes: `Assigned to request ID: ${activeReqId}`
          })
        });

        // Set redirection data for Assets Registry
        localStorage.setItem("open_assign_asset_form", "true");
        localStorage.setItem("assign_asset_user_id", String(req.employee_id));
        localStorage.setItem("assign_asset_type", selectedAsset.assetType || "Laptop");
        localStorage.setItem("assign_asset_value", `[S/N: ${selectedAsset.serialNumber || 'N/A'}] ${selectedAsset.assetDetail || 'N/A'}`);
        localStorage.setItem("assign_asset_inventory_id", String(selectedAsset.id));

        triggerToast("Asset granted successfully! Redirecting to Assign Asset...");
        setShowInventoryModal(false);
        setSelectedAssetId(null);
        if (setActiveTab) {
          setActiveTab("assets-registry");
        } else {
          fetchRequests();
        }
      } else {
        triggerToast(reqData.error || "Failed to update request status.");
      }
    } catch (err) {
      console.error("Error confirming grant:", err);
      triggerToast("An error occurred during grant operation.");
    }
  };

  const handleRemarksChange = (requestId: number, val: string) => {
    setRemarksMap(prev => ({ ...prev, [requestId]: val }));
  };

  // Helper to parse requisition reason string into structured fields
  const parseRequisitionReason = (reasonStr: string = "") => {
    if (!reasonStr) return { spec: "No details provided", cost: null, vendor: null, justification: null };

    const specMatch = reasonStr.match(/Specifications:\s*(.*?)(?=\s*(Estimated Cost:|Vendor:|Justification:|$))/i);
    const costMatch = reasonStr.match(/Estimated Cost:\s*(.*?)(?=\s*(Vendor:|Justification:|$))/i);
    const vendorMatch = reasonStr.match(/Vendor:\s*(.*?)(?=\s*(Justification:|$))/i);
    const justMatch = reasonStr.match(/Justification:\s*(.*)/i);

    if (specMatch || costMatch || vendorMatch || justMatch) {
      return {
        spec: specMatch ? specMatch[1].trim() : reasonStr,
        cost: costMatch ? costMatch[1].trim() : null,
        vendor: vendorMatch ? vendorMatch[1].trim() : null,
        justification: justMatch ? justMatch[1].trim() : null,
      };
    }

    return { spec: reasonStr, cost: null, vendor: null, justification: null };
  };

  // Filter requests
  const filteredRequests = requests.filter(r => {
    const matchesSearch =
      (r.employee?.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.asset_type || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.reason || "").toLowerCase().includes(searchTerm.toLowerCase());

    let matchesStatus = statusFilter === "" ||
      r.status === statusFilter ||
      (statusFilter === "Pending" && (r.status === "Pending Manager Approval" || r.status === "Pending Owner Approval" || r.status === "Pending")) ||
      (statusFilter === "Approved" && (r.status === "Approved" || (r.status && r.status.startsWith("Dispatched")))) ||
      (statusFilter === "Dispatched" && r.status && r.status.startsWith("Dispatched"));

    if (activeStatFilter === "HIGH") {
      return matchesSearch && (r.priority || "").toLowerCase() === "high";
    }

    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    if (status && status.startsWith("Dispatched")) {
      return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-900/30";
    }
    switch (status) {
      case "Pending":
      case "Pending Manager Approval":
      case "Pending Owner Approval":
        return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-900/30";
      case "Approved":
        return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-900/30";
      case "Rejected":
        return "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/20 dark:text-rose-400 dark:border-rose-900/30";
      default:
        return "bg-slate-50 text-slate-700 border-slate-200";
    }
  };

  const getPriorityBadge = (p: string) => {
    switch (p) {
      case "High":
        return "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/30";
      case "Medium":
        return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30";
      default:
        return "bg-slate-50 text-slate-600 border-slate-200 dark:bg-gray-800 dark:text-slate-400 dark:border-gray-700";
    }
  };

  return (
    <div className={`space-y-6 ${isDark ? "text-gray-100" : "text-slate-800"}`}>

      {/* Header Panel */}
      <div className={`p-6 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm relative overflow-hidden ${isDark ? "bg-gray-900 border-gray-800" : "bg-white border-slate-200"
        }`}>
        <div className="space-y-1 z-10">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-[#714B67]/10 text-[#714B67] border border-[#714B67]/20">
              <Cpu className="w-5 h-5 text-[#714B67]" />
            </span>
            <h1 className="text-lg font-black tracking-tight text-slate-850 dark:text-white">
              Asset Procurement & Request Hub
            </h1>
          </div>
          <p className="text-[11px] text-slate-400 font-medium pl-1">
            {userRole === "department manager" || userRole === "department-manager"
              ? "Submit requisitions for yourself, or review/approve requisitions from your department team."
              : isOwnerOrHR
                ? "Approve, reject, or mark asset requisitions as dispatched for employees and teams."
                : "Raise and track requisitions for hardware, software licenses, SIM cards, and office equipment."}
          </p>
        </div>
        <button
          onClick={fetchRequests}
          className={`px-3.5 py-2 rounded-xl text-[11px] font-bold border transition-all flex items-center gap-1.5 self-start md:self-auto ${isDark ? "bg-gray-800 border-gray-700 hover:bg-gray-750 text-white" : "bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700 shadow-2xs"
            }`}
        >
          <RefreshCw className={`w-3.5 h-3.5 text-[#714B67] ${loading ? "animate-spin" : ""}`} /> Refresh Registry
        </button>
      </div>

      {/* Overview Stat Cards Header (Clickable Filters) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Box 1: Total Requisitions */}
        <div
          onClick={() => {
            setActiveStatFilter("ALL");
            setStatusFilter("");
          }}
          className={`p-4 rounded-xl border flex items-center justify-between shadow-2xs cursor-pointer transition-all hover:scale-[1.01] ${activeStatFilter === "ALL"
              ? "ring-2 ring-[#714B67] border-[#714B67]/40 bg-[#714B67]/5 dark:bg-[#714B67]/20"
              : (isDark ? "bg-gray-900 border-gray-800 text-white" : "bg-white border-slate-200 hover:border-[#714B67]/30")
            }`}
        >
          <div>
            <div className="text-[10px] font-black uppercase font-mono text-slate-400">Total Requisitions</div>
            <div className="text-xl font-black mt-1 text-[#714B67] dark:text-purple-300">{requests.length}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#714B67]/10 text-[#714B67] dark:bg-purple-950 dark:text-purple-300 flex items-center justify-center border border-[#714B67]/20">
            <Laptop className="w-5 h-5" />
          </div>
        </div>

        {/* Box 2: Pending Approvals */}
        <div
          onClick={() => {
            setActiveStatFilter("PENDING");
            setStatusFilter("Pending");
          }}
          className={`p-4 rounded-xl border flex items-center justify-between shadow-2xs cursor-pointer transition-all hover:scale-[1.01] ${activeStatFilter === "PENDING"
              ? "ring-2 ring-amber-500 border-amber-400 bg-amber-50/50 dark:bg-amber-950/30"
              : (isDark ? "bg-gray-900 border-gray-800 text-white" : "bg-white border-slate-200 hover:border-amber-200")
            }`}
        >
          <div>
            <div className="text-[10px] font-black uppercase font-mono text-slate-400">Pending Approvals</div>
            <div className="text-xl font-black text-amber-500 mt-1">
              {requests.filter(r => (r.status || "").toLowerCase().includes("pending")).length}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-300 flex items-center justify-center border border-amber-200">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        {/* Box 3: Approved & Dispatched */}
        <div
          onClick={() => {
            setActiveStatFilter("APPROVED");
            setStatusFilter("Approved");
          }}
          className={`p-4 rounded-xl border flex items-center justify-between shadow-2xs cursor-pointer transition-all hover:scale-[1.01] ${activeStatFilter === "APPROVED"
              ? "ring-2 ring-emerald-500 border-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/30"
              : (isDark ? "bg-gray-900 border-gray-800 text-white" : "bg-white border-slate-200 hover:border-emerald-200")
            }`}
        >
          <div>
            <div className="text-[10px] font-black uppercase font-mono text-slate-400">Approved & Dispatched</div>
            <div className="text-xl font-black text-emerald-600 mt-1">
              {requests.filter(r => ["approved", "dispatched"].includes((r.status || "").toLowerCase())).length}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300 flex items-center justify-center border border-emerald-200">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        {/* Box 4: High Priority */}
        <div
          onClick={() => {
            setActiveStatFilter("HIGH");
            setStatusFilter("");
          }}
          className={`p-4 rounded-xl border flex items-center justify-between shadow-2xs cursor-pointer transition-all hover:scale-[1.01] ${activeStatFilter === "HIGH"
              ? "ring-2 ring-rose-500 border-rose-400 bg-rose-50/50 dark:bg-rose-950/30"
              : (isDark ? "bg-gray-900 border-gray-800 text-white" : "bg-white border-slate-200 hover:border-rose-200")
            }`}
        >
          <div>
            <div className="text-[10px] font-black uppercase font-mono text-slate-400">High Priority</div>
            <div className="text-xl font-black text-rose-600 mt-1">
              {requests.filter(r => (r.priority || "").toLowerCase() === "high").length}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-300 flex items-center justify-center border border-rose-200">
            <AlertCircle className="w-5 h-5" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Left column: Submit request (For employees & managers) */}
        {canRequest && (
          <div className="lg:col-span-4">
            <div className={`p-5 rounded-2xl border shadow-sm space-y-4 ${isDark ? "bg-gray-900 border-gray-800" : "bg-white border-slate-200"
              }`}>
              <div className="pb-2 border-b border-slate-100 dark:border-gray-800">
                <h2 className="font-black text-xs uppercase tracking-wider text-[#714B67] dark:text-purple-300 flex items-center gap-2">
                  <Plus className="w-4 h-4 text-[#714B67]" /> New Asset Requisition
                </h2>
                <p className="text-[10px] text-slate-400 mt-0.5 font-medium">Specify hardware or equipment details for approval</p>
              </div>

              <form onSubmit={handleSubmitRequest} className="space-y-3.5">
                <div>
                  <label className="block text-[10px] uppercase font-mono font-black text-slate-400 mb-1">Asset Category *</label>
                  <select
                    className={`w-full p-2.5 rounded-xl border text-xs font-bold focus:outline-none focus:ring-1 focus:ring-[#714B67] ${isDark ? "bg-gray-800 border-gray-700 text-white" : "bg-slate-50 border-slate-200 text-slate-800"
                      }`}
                    value={assetType}
                    onChange={(e) => setAssetType(e.target.value)}
                  >
                    <option>Laptop</option>
                    <option>Mobile Phone</option>
                    <option>SIM Card</option>
                    <option>Headset / Accessories</option>
                    <option>ID Card / Lanyard</option>
                    <option>Office Chair / Table</option>
                    <option>Other Accessories</option>
                  </select>
                </div>

                {assetType === "Other Accessories" && (
                  <div>
                    <label className="block text-[10px] uppercase font-mono font-black text-slate-400 mb-1">Accessory Name *</label>
                    <input
                      type="text"
                      placeholder="e.g. Graphic Tablet, HDMI Cable, Keyboard"
                      className={`w-full p-2.5 rounded-xl border text-xs font-bold focus:outline-none focus:ring-1 focus:ring-[#714B67] ${isDark ? "bg-gray-800 border-gray-700 text-white" : "bg-slate-50 border-slate-200 text-slate-800"
                        }`}
                      value={customAssetType}
                      onChange={(e) => setCustomAssetType(e.target.value)}
                      required
                    />
                  </div>
                )}

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-[10px] uppercase font-mono font-black text-slate-400">Urgency / Priority *</label>
                    <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full border ${getPriorityBadge(priority)}`}>
                      {priority} Priority
                    </span>
                  </div>
                  <select
                    className={`w-full p-2.5 rounded-xl border text-xs font-bold focus:outline-none focus:ring-1 focus:ring-[#714B67] ${isDark ? "bg-gray-800 border-gray-700 text-white" : "bg-slate-50 border-slate-200 text-slate-800"
                      }`}
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                  >
                    <option>Low</option>
                    <option>Medium</option>
                    <option>High</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-mono font-black text-slate-400 mb-1">Specifications & Justification *</label>
                  <textarea
                    placeholder="Describe specific model, RAM, storage, or reason. E.g. Specifications: Core i5, 16GB RAM | Est. Cost: ₹45,000 | Vendor: Dell"
                    rows={4}
                    className={`w-full p-2.5 rounded-xl border text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#714B67] leading-relaxed ${isDark ? "bg-gray-800 border-gray-700 text-white" : "bg-slate-50 border-slate-200 text-slate-800"
                      }`}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-[#714B67] hover:bg-[#5F3F56] text-white py-3 rounded-xl font-black text-xs transition-all shadow-md active:scale-[0.99] flex items-center justify-center gap-2"
                >
                  <Send className="w-3.5 h-3.5" /> {submitting ? "Submitting..." : "Submit Requisition"}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Right column: Structured Requests list / Table */}
        <div className={canRequest ? "lg:col-span-8" : "lg:col-span-12"}>
          <div className={`p-5 rounded-2xl border shadow-sm space-y-4 ${isDark ? "bg-gray-900 border-gray-800" : "bg-white border-slate-200"
            }`}>

            {/* Search Filters & View Switcher */}
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Search by asset, requisition details, or employee name..."
                  className={`w-full pl-9 pr-4 py-2.5 rounded-xl border text-xs font-bold focus:outline-none focus:ring-1 focus:ring-[#714B67] ${isDark ? "bg-gray-800 border-gray-700 text-white" : "bg-slate-50 border-slate-200 text-slate-800"
                    }`}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <select
                  className={`w-full sm:w-40 p-2.5 rounded-xl border text-xs font-bold focus:outline-none focus:ring-1 focus:ring-[#714B67] ${isDark ? "bg-gray-800 border-gray-700 text-white" : "bg-slate-50 border-slate-200 text-slate-800"
                    }`}
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="">All Statuses</option>
                  <option value="Pending">Pending</option>
                  <option value="Approved">Approved</option>
                  <option value="Dispatched">Dispatched</option>
                  <option value="Rejected">Rejected</option>
                </select>

                {/* View Mode Toggle */}
                <div className={`flex items-center gap-1 border p-1 rounded-xl shrink-0 ${isDark ? "bg-gray-800 border-gray-700" : "bg-slate-50 border-slate-200"}`}>
                  <button
                    onClick={() => setViewMode("cards")}
                    title="Card Grid View"
                    className={`p-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${viewMode === "cards" ? "bg-[#714B67] text-white shadow-2xs" : "text-slate-400 hover:text-slate-600"
                      }`}
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode("table")}
                    title="Structured Table View"
                    className={`p-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${viewMode === "table" ? "bg-[#714B67] text-white shadow-2xs" : "text-slate-400 hover:text-slate-600"
                      }`}
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-16 text-slate-400 text-xs font-bold">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#714B67]" /> Loading asset requisition registry...
              </div>
            ) : filteredRequests.length === 0 ? (
              <div className="text-center py-16 text-slate-400 text-xs font-bold border border-dashed border-slate-200 dark:border-gray-800 rounded-xl">
                <Laptop className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-gray-700" />
                No asset requisitions found matching filters.
              </div>
            ) : viewMode === "table" ? (
              /* Enhanced Structured Table View */
              <div className="overflow-x-auto border border-slate-200 dark:border-gray-800 rounded-xl shadow-2xs">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className={`border-b text-[10px] uppercase font-black tracking-wider font-mono ${isDark ? "bg-gray-800/90 border-gray-700 text-gray-300" : "bg-slate-100/80 border-slate-200 text-slate-600"
                      }`}>
                      <th className="py-3 px-3">Req ID &amp; Date</th>
                      <th className="py-3 px-3">Asset Category</th>
                      <th className="py-3 px-3">Employee &amp; Dept</th>
                      <th className="py-3 px-3">Structured Details</th>
                      <th className="py-3 px-3">Status</th>
                      <th className="py-3 px-3 min-w-[200px]">Approval / Dispatch Actions</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y text-xs ${isDark ? "divide-gray-800 text-gray-200" : "divide-slate-150 text-slate-700"}`}>
                    {filteredRequests.map((req) => {
                      const parsed = parseRequisitionReason(req.reason);
                      const isPendingState = req.status === "Pending Manager Approval" || req.status === "Pending Owner Approval" || req.status === "Pending";
                      const isApprovedState = req.status === "Approved";

                      return (
                        <tr key={req.id} className={isDark ? "hover:bg-gray-800/50" : "hover:bg-slate-50/80 transition-colors"}>
                          {/* Req ID & Date */}
                          <td className="py-3 px-3 align-top">
                            <span className="text-[10px] font-mono font-black text-[#714B67] bg-[#714B67]/10 px-2 py-0.5 rounded border border-[#714B67]/20 block w-fit">
                              #REQ-{req.id}
                            </span>
                            <span className="text-[9px] text-slate-400 font-mono block mt-1">
                              {new Date(req.createdAt).toLocaleDateString()}
                            </span>
                          </td>

                          {/* Asset Category & Priority */}
                          <td className="py-3 px-3 align-top font-bold">
                            <div className="flex items-center gap-1.5 uppercase text-slate-850 dark:text-white">
                              <Laptop className="w-3.5 h-3.5 text-[#714B67] shrink-0" />
                              <span>{req.asset_type}</span>
                            </div>
                            <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full border inline-block mt-1 ${getPriorityBadge(req.priority)}`}>
                              ⚡ {req.priority}
                            </span>
                          </td>

                          {/* Requester Info */}
                          <td className="py-3 px-3 align-top font-semibold">
                            <div className="flex items-center gap-1.5 text-slate-800 dark:text-gray-200 font-bold">
                              <User className="w-3.5 h-3.5 text-[#714B67]" />
                              <span>{req.employee?.name || "Employee"}</span>
                            </div>
                            <span className="text-[10px] text-slate-400 block mt-0.5">
                              {req.employee?.department || "General"}
                            </span>
                          </td>

                          {/* Specifications & Details */}
                          <td className="py-3 px-3 align-top max-w-xs space-y-1">
                            <p className="text-xs font-semibold text-slate-750 dark:text-gray-200 line-clamp-2 leading-relaxed">
                              {parsed.spec}
                            </p>
                            <div className="flex flex-wrap gap-1 pt-0.5">
                              {parsed.cost && (
                                <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded">
                                  Cost: {parsed.cost}
                                </span>
                              )}
                              {parsed.vendor && (
                                <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded">
                                  Vendor: {parsed.vendor}
                                </span>
                              )}
                            </div>
                            {req.admin_remarks && (
                              <div className="text-[10px] text-indigo-700 dark:text-indigo-300 italic pt-0.5">
                                Remarks: {req.admin_remarks}
                              </div>
                            )}
                          </td>

                          {/* Status */}
                          <td className="py-3 px-3 align-top">
                            <span className={`text-[10px] font-mono font-bold px-2.5 py-1 rounded-full border inline-block ${getStatusBadge(req.status)}`}>
                              ● {req.status}
                            </span>
                          </td>

                          {/* In-table Action Controls */}
                          <td className="py-3 px-3 align-top space-y-2">
                            {isPendingState && (isManager || (req.employee_id && String(req.employee_id) !== String(sessionUser?.id))) ? (
                              <div className="space-y-1.5">
                                <input
                                  type="text"
                                  placeholder="Remarks..."
                                  className={`w-full p-1.5 rounded border text-[10px] font-bold focus:outline-none focus:ring-1 focus:ring-[#714B67] ${isDark ? "bg-gray-800 border-gray-700 text-white" : "bg-white border-slate-200 text-slate-800"
                                    }`}
                                  value={remarksMap[req.id] || ""}
                                  onChange={(e) => handleRemarksChange(req.id, e.target.value)}
                                />
                                <div className="flex gap-1.5">
                                  <button
                                    onClick={() => handleUpdateStatus(req.id, "Approved")}
                                    className="flex-1 bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 py-1 rounded text-[10px] font-black transition-all flex items-center justify-center gap-1"
                                  >
                                    <Check className="w-3 h-3" /> Approve
                                  </button>
                                  <button
                                    onClick={() => handleUpdateStatus(req.id, "Rejected")}
                                    className="flex-1 bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 py-1 rounded text-[10px] font-black transition-all flex items-center justify-center gap-1"
                                  >
                                    <X className="w-3 h-3" /> Reject
                                  </button>
                                </div>
                              </div>
                            ) : isApprovedState && (isManager || (req.employee_id && String(req.employee_id) !== String(sessionUser?.id))) ? (
                              <div className="flex flex-col gap-1">
                                <button
                                  onClick={() => {
                                    setActiveReqId(req.id);
                                    setActiveReqType(req.asset_type);
                                    setShowInventoryModal(true);
                                    fetchAvailableInventory(req.asset_type);
                                  }}
                                  className="bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 px-2.5 py-1 rounded text-[10px] font-black transition-all flex items-center justify-center gap-1"
                                >
                                  <Package className="w-3 h-3" /> Grant Inventory
                                </button>
                                <button
                                  onClick={() => {
                                    triggerToast("Redirecting to Purchase Requisition...");
                                    localStorage.setItem("open_purchase_request_modal", "true");
                                    localStorage.setItem("purchase_request_source_id", req.id.toString());
                                    localStorage.setItem("purchase_request_asset_type", req.asset_type || "Laptop");
                                    localStorage.setItem("purchase_request_asset_detail", req.reason || "");
                                    localStorage.setItem("purchase_request_justification", `Requested for employee. Request ID: ${req.id}`);
                                    if (setActiveTab) {
                                      setActiveTab("inventory-management");
                                    }
                                  }}
                                  className="bg-amber-50 border border-amber-200 text-amber-700 hover:bg-amber-100 px-2.5 py-1 rounded text-[10px] font-black transition-all flex items-center justify-center gap-1"
                                >
                                  <Coins className="w-3 h-3" /> Purchase Requisition
                                </button>
                              </div>
                            ) : (
                              <span className="text-[10px] text-slate-400 italic">No actions pending</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              /* Enhanced Structured Card Grid View */
              <div className="space-y-4">
                {filteredRequests.map((req) => {
                  const parsed = parseRequisitionReason(req.reason);
                  return (
                    <div
                      key={req.id}
                      className={`p-5 rounded-2xl border transition-all shadow-2xs hover:shadow-md ${isDark ? "bg-gray-800/40 border-gray-750 hover:bg-gray-800/60" : "bg-white border-slate-200 hover:border-slate-300"
                        }`}
                    >
                      {/* Card Header & Badges */}
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-3 border-b border-slate-100 dark:border-gray-750">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[10px] font-mono font-black text-[#714B67] bg-[#714B67]/10 px-2.5 py-0.5 rounded-md border border-[#714B67]/20">
                            #REQ-{req.id}
                          </span>
                          <span className="text-xs font-black text-slate-850 dark:text-white uppercase tracking-tight flex items-center gap-1.5">
                            <Laptop className="w-4 h-4 text-[#714B67] shrink-0" />
                            {req.asset_type}
                          </span>
                          <span className={`text-[9px] font-mono font-bold px-2.5 py-0.5 rounded-full border ${getPriorityBadge(req.priority)}`}>
                            ⚡ {req.priority} Priority
                          </span>
                        </div>

                        <span className={`text-[10px] font-mono font-bold px-3 py-1 rounded-full border shadow-2xs ${getStatusBadge(req.status)}`}>
                          ● {req.status}
                        </span>
                      </div>

                      {/* Requester Info */}
                      <div className="py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                        <div className="font-bold flex items-center gap-1.5 text-slate-800 dark:text-gray-200">
                          <User className="w-3.5 h-3.5 text-[#714B67]" />
                          <span>Requested By: <strong>{req.employee?.name || "Employee"}</strong> ({req.employee?.department || "General"})</span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-medium font-mono bg-slate-50 dark:bg-gray-800 px-2 py-0.5 rounded border border-slate-150 dark:border-gray-700">
                          📅 {new Date(req.createdAt).toLocaleDateString()} @ {new Date(req.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>

                      {/* Structured Details Cards */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 my-2.5">
                        <div className="bg-slate-50 dark:bg-gray-800 p-3 rounded-xl border border-slate-200/80 dark:border-gray-700 col-span-1 sm:col-span-2">
                          <span className="text-[9px] font-mono font-extrabold uppercase text-slate-400 block mb-1">Specifications &amp; Details</span>
                          <span className="text-xs font-semibold text-slate-800 dark:text-gray-200 leading-relaxed block">{parsed.spec || "—"}</span>
                        </div>

                        {parsed.cost ? (
                          <div className="bg-emerald-50/70 dark:bg-emerald-950/30 p-3 rounded-xl border border-emerald-200/70 dark:border-emerald-900/50">
                            <span className="text-[9px] font-mono font-extrabold uppercase text-emerald-600 dark:text-emerald-400 block mb-0.5">Est. Cost</span>
                            <span className="text-xs font-black text-emerald-700 dark:text-emerald-300">{parsed.cost}</span>
                          </div>
                        ) : (
                          <div className="bg-slate-50 dark:bg-gray-800 p-3 rounded-xl border border-slate-200/80 dark:border-gray-700">
                            <span className="text-[9px] font-mono font-extrabold uppercase text-slate-400 block mb-0.5">Est. Cost</span>
                            <span className="text-xs font-medium text-slate-400">Not specified</span>
                          </div>
                        )}

                        {parsed.vendor ? (
                          <div className="bg-indigo-50/70 dark:bg-indigo-950/30 p-3 rounded-xl border border-indigo-200/70 dark:border-indigo-900/50">
                            <span className="text-[9px] font-mono font-extrabold uppercase text-indigo-600 dark:text-indigo-400 block mb-0.5">Suggested Vendor</span>
                            <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300">{parsed.vendor}</span>
                          </div>
                        ) : (
                          <div className="bg-slate-50 dark:bg-gray-800 p-3 rounded-xl border border-slate-200/80 dark:border-gray-700">
                            <span className="text-[9px] font-mono font-extrabold uppercase text-slate-400 block mb-0.5">Vendor</span>
                            <span className="text-xs font-medium text-slate-400">Not specified</span>
                          </div>
                        )}
                      </div>

                      {req.admin_remarks && (
                        <div className="mt-2 text-[11px] bg-indigo-50/50 dark:bg-indigo-950/30 p-2.5 rounded-xl border border-indigo-100 dark:border-indigo-900/40 text-indigo-900 dark:text-indigo-300 font-semibold flex items-start gap-2">
                          <MessageSquare className="w-3.5 h-3.5 text-[#714B67] shrink-0 mt-0.5" />
                          <span><strong>Admin Remarks:</strong> {req.admin_remarks}</span>
                        </div>
                      )}

                      {/* Admin Actions Panel (Approve/Reject controls) */}
                      {((isManager || (req.employee_id && String(req.employee_id) !== String(sessionUser?.id))) &&
                        (req.status === "Pending Manager Approval" || req.status === "Pending Owner Approval" || req.status === "Pending")) && (
                          <div className="mt-4 pt-3 border-t border-dashed border-slate-200 dark:border-gray-700 flex flex-col md:flex-row items-center gap-3">
                            <input
                              type="text"
                              placeholder="Approving/Rejecting remarks..."
                              className={`w-full md:flex-1 p-2 rounded-lg border text-[11px] font-bold focus:outline-none focus:ring-1 focus:ring-[#714B67] ${isDark ? "bg-gray-900 border-gray-750 text-white" : "bg-white border-slate-200 text-slate-800"
                                }`}
                              value={remarksMap[req.id] || ""}
                              onChange={(e) => handleRemarksChange(req.id, e.target.value)}
                            />
                            <div className="flex gap-2 w-full md:w-auto shrink-0 justify-end">
                              <button
                                onClick={() => handleUpdateStatus(req.id, "Rejected")}
                                className="flex-1 md:flex-none bg-rose-50 border border-rose-200 text-rose-600 px-3 py-2 rounded-lg text-[10px] font-black hover:bg-rose-100 transition-all flex items-center justify-center gap-1"
                              >
                                <X className="w-3.5 h-3.5" /> Reject
                              </button>
                              <button
                                onClick={() => handleUpdateStatus(req.id, "Approved")}
                                className="flex-1 md:flex-none bg-emerald-50 border border-emerald-200 text-emerald-600 px-3 py-2 rounded-lg text-[10px] font-black hover:bg-emerald-100 transition-all flex items-center justify-center gap-1"
                              >
                                <Check className="w-3.5 h-3.5" /> Approve
                              </button>
                            </div>
                          </div>
                        )}

                      {(isManager || (req.employee_id && String(req.employee_id) !== String(sessionUser?.id))) && req.status === "Approved" && (
                        <div className="mt-4 pt-3 border-t border-dashed border-slate-200 dark:border-gray-700 flex flex-col md:flex-row items-center gap-3">
                          <input
                            type="text"
                            placeholder="Dispatch/Docket details (Optional)..."
                            className={`w-full md:flex-1 p-2 rounded-lg border text-[11px] font-bold focus:outline-none focus:ring-1 focus:ring-[#714B67] ${isDark ? "bg-gray-900 border-gray-750 text-white" : "bg-white border-slate-200 text-slate-800"
                              }`}
                            value={remarksMap[req.id] || ""}
                            onChange={(e) => handleRemarksChange(req.id, e.target.value)}
                          />
                          <div className="flex gap-2 w-full md:w-auto shrink-0 justify-end">
                            <button
                              onClick={() => {
                                setActiveReqId(req.id);
                                setActiveReqType(req.asset_type);
                                setShowInventoryModal(true);
                                fetchAvailableInventory(req.asset_type);
                              }}
                              className="bg-indigo-50 border border-indigo-200 text-indigo-650 px-3 py-2 rounded-lg text-[10px] font-black hover:bg-indigo-100 transition-all flex items-center justify-center gap-1.5"
                            >
                              <Package className="w-3.5 h-3.5" /> Grant from Inventory
                            </button>
                            <button
                              onClick={() => {
                                triggerToast("Redirecting to Purchase Requisition...");
                                localStorage.setItem("open_purchase_request_modal", "true");
                                localStorage.setItem("purchase_request_source_id", req.id.toString());
                                localStorage.setItem("purchase_request_asset_type", req.asset_type || "Laptop");
                                localStorage.setItem("purchase_request_asset_detail", req.reason || "");
                                localStorage.setItem("purchase_request_justification", `Requested for employee. Request ID: ${req.id}`);
                                if (setActiveTab) {
                                  setActiveTab("inventory-management");
                                }
                              }}
                              className="bg-amber-50 border border-amber-200 text-amber-600 px-3 py-2 rounded-lg text-[10px] font-black hover:bg-amber-100 transition-all flex items-center justify-center gap-1.5"
                            >
                              <Coins className="w-3.5 h-3.5" /> New Purchase
                            </button>
                          </div>
                        </div>
                      )}

                    </div>
                  );
                })}
              </div>
            )}

          </div>
        </div>

      </div>

      {/* Inventory selection modal */}
      {showInventoryModal && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-md z-[9999] flex items-center justify-center p-4">
          <div className={`w-full max-w-2xl rounded-2xl shadow-xl border overflow-hidden flex flex-col max-h-[85vh] ${isDark ? "bg-gray-900 border-gray-800 text-white" : "bg-white border-slate-200 text-slate-800"
            }`}>
            {/* Header */}
            <div className="p-4 border-b border-slate-100 dark:border-gray-850 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-indigo-600">Select Asset from Inventory</h3>
                <p className="text-[10px] text-slate-400 font-bold mt-0.5">Matching requested type: <span className="text-indigo-500">{activeReqType}</span></p>
              </div>
              <button
                onClick={() => { setShowInventoryModal(false); setSelectedAssetId(null); }}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-gray-850 text-slate-400 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* List */}
            <div className="p-4 overflow-y-auto flex-1 space-y-3">
              {loadingInventory ? (
                <div className="text-center py-8 text-xs font-bold text-slate-400 flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-indigo-500" /> Loading Available Assets...
                </div>
              ) : inventoryItems.length === 0 ? (
                <div className="text-center py-8 text-xs font-bold text-slate-400">
                  No available assets found in inventory.
                </div>
              ) : (
                <div className="border border-slate-100 dark:border-gray-850 rounded-xl overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-gray-850 text-[10px] uppercase font-mono font-black text-slate-400 border-b border-slate-100 dark:border-gray-850">
                        <th className="p-3 w-10"></th>
                        <th className="p-3">Type</th>
                        <th className="p-3">Details</th>
                        <th className="p-3">Serial Number</th>
                        <th className="p-3">Condition</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-gray-850">
                      {inventoryItems.map((item: any) => {
                        const isMatching = (item.assetType || "").toLowerCase().includes(activeReqType.toLowerCase());
                        return (
                          <tr
                            key={item.id}
                            onClick={() => setSelectedAssetId(item.id)}
                            className={`cursor-pointer text-xs font-bold transition-all hover:bg-slate-50/50 dark:hover:bg-gray-850/50 ${selectedAssetId === item.id
                                ? "bg-indigo-50/30 dark:bg-indigo-950/20"
                                : ""
                              }`}
                          >
                            <td className="p-3 text-center">
                              <input
                                type="radio"
                                checked={selectedAssetId === item.id}
                                onChange={() => setSelectedAssetId(item.id)}
                                className="w-3.5 h-3.5 text-indigo-600 border-slate-350 focus:ring-indigo-500"
                              />
                            </td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded text-[10px] ${isMatching
                                  ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-400"
                                  : "bg-slate-100 text-slate-650 dark:bg-gray-800 dark:text-slate-400"
                                }`}>
                                {item.assetType} {item.oldAssetId ? `(Old ID: ${item.oldAssetId})` : ""}
                              </span>
                            </td>
                            <td className="p-3 max-w-[200px] truncate">{item.assetDetail || "N/A"}</td>
                            <td className="p-3 font-mono text-[10px]">{item.serialNumber || "N/A"}</td>
                            <td className="p-3">
                              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${item.condition === "Good"
                                  ? "bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30"
                                  : "bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-950/20"
                                }`}>
                                {item.condition}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 dark:bg-gray-850 border-t border-slate-100 dark:border-gray-850 flex justify-end gap-3">
              <button
                onClick={() => { setShowInventoryModal(false); setSelectedAssetId(null); }}
                className="px-4 py-2 border border-slate-200 dark:border-gray-700 rounded-lg text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-gray-800 dark:text-slate-400 transition-all"
              >
                Cancel
              </button>
              <button
                disabled={!selectedAssetId}
                onClick={handleConfirmGrant}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-xs font-black transition-all"
              >
                Confirm Grant
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
