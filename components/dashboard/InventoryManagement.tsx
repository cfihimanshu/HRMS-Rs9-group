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
  const [editingAssetId, setEditingAssetId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({
    assetType: "Laptop",
    assetDetail: "",
    serialNumber: "",
    purchaseDate: "",
    purchaseValue: "",
    condition: "Good",
    status: "Available",
    companyId: "",
    notes: ""
  });
  const [updating, setUpdating] = useState(false);

  // Registration form
  const [showRegisterForm, setShowRegisterForm] = useState(false);
  const [registerForm, setRegisterForm] = useState({
    assetType: "Laptop",
    assetDetail: "",
    serialNumber: "",
    purchaseDate: "",
    purchaseValue: "",
    condition: "Good",
    companyId: "",
    notes: ""
  });
  const [submittingRegister, setSubmittingRegister] = useState(false);
  const [isCustomRegisterType, setIsCustomRegisterType] = useState(false);
  const [isCustomEditType, setIsCustomEditType] = useState(false);

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
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; assetId?: number; assetType?: string; serialNumber?: string }>({ show: false });
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
  const [purchaseForm, setPurchaseForm] = useState({
    asset_type: "Laptop",
    asset_detail: "",
    estimated_cost: "",
    vendor_details: "",
    justification: "",
    company_id: ""
  });
  const [submittingPurchase, setSubmittingPurchase] = useState(false);
  const [isCustomPurchaseType, setIsCustomPurchaseType] = useState(false);
  const [ownerRemarksMap, setOwnerRemarksMap] = useState<Record<string, string>>({});

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
    if (!purchaseForm.asset_type || !purchaseForm.asset_detail || !purchaseForm.estimated_cost || !purchaseForm.vendor_details) {
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
        triggerToast("Purchase request submitted to Owner successfully!");
        setShowPurchaseModal(false);
        setIsCustomPurchaseType(false);
        setPurchaseForm({
          asset_type: "Laptop",
          asset_detail: "",
          estimated_cost: "",
          vendor_details: "",
          justification: "",
          company_id: ""
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

      setPurchaseForm({
        asset_type: type,
        asset_detail: detail,
        estimated_cost: "",
        vendor_details: "",
        justification: justification,
        company_id: ""
      });

      setShowPurchaseModal(true);
      setActiveSubTab("purchases");

      localStorage.removeItem("open_purchase_request_modal");
      localStorage.removeItem("purchase_request_asset_type");
      localStorage.removeItem("purchase_request_asset_detail");
      localStorage.removeItem("purchase_request_justification");
    }
  }, []);

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!registerForm.assetType) {
      triggerToast("Asset Type is required");
      return;
    }
    try {
      setSubmittingRegister(true);
      const res = await fetch("/api/assets/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(registerForm)
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
          assetType: "Laptop",
          assetDetail: "",
          serialNumber: "",
          purchaseDate: "",
          purchaseValue: "",
          condition: "Good",
          companyId: "",
          notes: ""
        });
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
    setEditingAssetId(asset.id);
    setEditForm({
      assetType: asset.assetType || "Laptop",
      assetDetail: asset.assetDetail || "",
      serialNumber: asset.serialNumber || "",
      purchaseDate: asset.purchaseDate || "",
      purchaseValue: asset.purchaseValue || "",
      condition: asset.condition || "Good",
      status: asset.status || "Available",
      companyId: asset.companyId || "",
      notes: asset.notes || ""
    });
  };

  const handleCancelEdit = () => {
    setEditingAssetId(null);
    setIsCustomEditType(false);
  };

  const handleSaveEdit = async (assetId: number) => {
    try {
      setUpdating(true);
      const res = await fetch("/api/assets/inventory", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: assetId,
          ...editForm
        })
      });

      const result = await res.json();
      if (result.success) {
        triggerToast("Inventory asset updated successfully");
        setEditingAssetId(null);
        setIsCustomEditType(false);
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
  const totalCount = inventory.length;
  const availableCount = inventory.filter(a => a.status === "Available").length;
  const newCount = inventory.filter(a => a.condition === "New").length;
  const inUseCount = inventory.filter(a => a.status === "In Use").length;

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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                  const isEditing = editingAssetId === asset.id;
                  const companyName = companies.find(c => String(c.id) === String(asset.companyId))?.name || "General Stock";

                  return (
                    <tr key={asset.id} className="hover:bg-white transition-colors">
                      {/* Asset Category */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        {isEditing ? (
                          !isCustomEditType ? (
                            <select
                              value={editForm.assetType}
                              onChange={(e) => {
                                if (e.target.value === "__ADD_NEW__") {
                                  setIsCustomEditType(true);
                                  setEditForm(p => ({ ...p, assetType: "" }));
                                } else {
                                  setEditForm({ ...editForm, assetType: e.target.value });
                                }
                              }}
                              className="bg-white border border-[#E8E4DF] rounded px-2 py-1 text-xs focus:outline-none font-semibold"
                            >
                              {dynamicAssetTypes.map(type => (
                                <option key={type} value={type}>{type}</option>
                              ))}
                              <option value="__ADD_NEW__">+ Add New Asset Type</option>
                            </select>
                          ) : (
                            <div className="flex gap-1.5 items-center">
                              <input
                                type="text"
                                required
                                placeholder="Custom type"
                                value={editForm.assetType}
                                onChange={(e) => setEditForm({ ...editForm, assetType: e.target.value })}
                                className="bg-white border border-[#E8E4DF] rounded px-2 py-1 text-xs focus:outline-none font-semibold w-24"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  setIsCustomEditType(false);
                                  setEditForm(p => ({ ...p, assetType: asset.assetType || "Laptop" }));
                                }}
                                className="p-1 bg-slate-100 hover:bg-slate-200 text-[#5D5B57] text-[10px] font-bold rounded"
                              >
                                Cancel
                              </button>
                            </div>
                          )
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-bold border border-indigo-100 uppercase tracking-wide">
                            <Cpu className="w-3 h-3" /> {asset.assetType}
                          </span>
                        )}
                      </td>

                      {/* Detail & Serial */}
                      <td className="py-4 px-4">
                        {isEditing ? (
                          <div className="space-y-2">
                            <input
                              type="text"
                              value={editForm.assetDetail}
                              onChange={(e) => setEditForm({ ...editForm, assetDetail: e.target.value })}
                              placeholder="Asset detail"
                              className="bg-white border border-[#E8E4DF] rounded px-2 py-1 text-xs focus:outline-none w-full max-w-[250px] font-semibold"
                            />
                            <input
                              type="text"
                              value={editForm.serialNumber}
                              onChange={(e) => setEditForm({ ...editForm, serialNumber: e.target.value })}
                              placeholder="Serial number"
                              className="bg-white border border-[#E8E4DF] rounded px-2 py-1 text-xs focus:outline-none w-full max-w-[250px] font-mono"
                            />
                          </div>
                        ) : (
                          <div>
                            <div className="font-semibold text-[#1C1C1A]">{asset.assetDetail || "No Description"}</div>
                            {asset.serialNumber && (
                              <div className="text-[10px] text-[#9C9890] font-mono mt-0.5">
                                S/N: {asset.serialNumber}
                              </div>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Condition */}
                      <td className="py-4 px-4">
                        {isEditing ? (
                          <select
                            value={editForm.condition}
                            onChange={(e) => setEditForm({ ...editForm, condition: e.target.value })}
                            className="bg-white border border-[#E8E4DF] rounded px-2 py-1 text-xs focus:outline-none font-semibold"
                          >
                            <option>New</option>
                            <option>Good</option>
                            <option>Fair</option>
                            <option>Needs Repair</option>
                          </select>
                        ) : (
                          <span className={cn(
                            "inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold border uppercase tracking-wider",
                            asset.condition === "New" ? "bg-emerald-50 text-emerald-700 border-emerald-250" :
                              asset.condition === "Good" ? "bg-blue-50 text-blue-700 border-blue-250" :
                                asset.condition === "Fair" ? "bg-amber-50 text-amber-700 border-amber-250" :
                                  "bg-rose-50 text-rose-700 border-rose-250"
                          )}>
                            {asset.condition || "Good"}
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4">
                        {isEditing ? (
                          <select
                            value={editForm.status}
                            onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                            className="bg-white border border-[#E8E4DF] rounded px-2 py-1 text-xs focus:outline-none font-semibold"
                          >
                            <option>Available</option>
                            <option>In Use</option>
                            <option>Damaged</option>
                            <option>Disposed</option>
                          </select>
                        ) : (
                          <span className={cn(
                            "inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold border uppercase tracking-wider",
                            asset.status === "Available" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                              asset.status === "In Use" ? "bg-amber-50 text-amber-700 border-amber-200" :
                                "bg-rose-50 text-rose-700 border-rose-200"
                          )}>
                            {asset.status || "Available"}
                          </span>
                        )}
                      </td>

                      {/* Purchase details */}
                      <td className="py-4 px-4">
                        {isEditing ? (
                          <div className="space-y-2">
                            <input
                              type="date"
                              value={editForm.purchaseDate}
                              onChange={(e) => setEditForm({ ...editForm, purchaseDate: e.target.value })}
                              className="bg-white border border-[#E8E4DF] rounded px-2 py-1 text-xs focus:outline-none font-semibold w-full"
                            />
                            <input
                              type="text"
                              value={editForm.purchaseValue}
                              onChange={(e) => setEditForm({ ...editForm, purchaseValue: e.target.value })}
                              placeholder="Value e.g. ₹50,000"
                              className="bg-white border border-[#E8E4DF] rounded px-2 py-1 text-xs focus:outline-none font-semibold w-full"
                            />
                          </div>
                        ) : (
                          <div>
                            <div className="font-semibold text-slate-700">{asset.purchaseValue || "—"}</div>
                            {asset.purchaseDate && (
                              <div className="text-[9px] text-[#9C9890] font-semibold mt-0.5 flex items-center gap-1">
                                <Calendar className="w-2.5 h-2.5" /> {asset.purchaseDate}
                              </div>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Company & Notes */}
                      <td className="py-4 px-4 max-w-[200px]">
                        {isEditing ? (
                          <div className="space-y-2">
                            <select
                              value={editForm.companyId}
                              onChange={(e) => setEditForm({ ...editForm, companyId: e.target.value })}
                              className="bg-white border border-[#E8E4DF] rounded px-2 py-1 text-xs focus:outline-none font-semibold w-full"
                            >
                              <option value="">-- General Stock --</option>
                              {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                            <textarea
                              value={editForm.notes}
                              onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                              rows={2}
                              className="bg-white border border-[#E8E4DF] rounded px-2 py-1 text-xs focus:outline-none w-full resize-none"
                            />
                          </div>
                        ) : (
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
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-4 text-center whitespace-nowrap">
                        {isEditing ? (
                          <div className="flex justify-center items-center gap-1.5">
                            <button
                              onClick={() => handleSaveEdit(asset.id)}
                              disabled={updating}
                              className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg border border-emerald-250 transition-all"
                              title="Save Allocation"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              disabled={updating}
                              className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg border border-rose-250 transition-all"
                              title="Cancel"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
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
                          <span className="px-2 py-0.5 bg-slate-100 rounded text-[10px] font-bold text-slate-700">
                            {req.asset_type}
                          </span>
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
                                  assetType: req.asset_type,
                                  assetDetail: req.asset_detail,
                                  serialNumber: "",
                                  purchaseDate: new Date().toISOString().slice(0, 10),
                                  purchaseValue: req.estimated_cost,
                                  condition: "Good",
                                  companyId: req.company_id || "",
                                  notes: `Approved Purchase Request ID: ${req.id}`
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
                onClick={() => setShowPurchaseModal(false)}
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
                  onClick={() => setShowPurchaseModal(false)}
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

    </div>
  );
}
