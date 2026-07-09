"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  UploadCloud,
  FileSpreadsheet,
  Plus,
  Search,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Clock,
  ArrowRight,
  Database,
  Tag,
  Download,
  Building,
  Mail,
  Phone,
  FileText,
  User
} from "lucide-react";
import * as XLSX from "xlsx";

interface Platform {
  id: string;
  name: string;
  prefix: string;
  tableName: string;
}

export default function BusinessLeads({
  triggerToast
}: {
  triggerToast: (msg: string) => void;
}) {
  // App States
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [activePlatformId, setActivePlatformId] = useState<string>("");
  const [leads, setLeads] = useState<any[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>("");

  // Modal/Wizard States
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
  const [importStep, setImportStep] = useState<number>(1); // 1: Select Platform, 2: Upload File, 3: Preview/Confirm
  
  // New Platform Form
  const [isCreatingPlatform, setIsCreatingPlatform] = useState<boolean>(false);
  const [newPlatformName, setNewPlatformName] = useState<string>("");
  const [newPlatformPrefix, setNewPlatformPrefix] = useState<string>("");
  const [selectedPlatformId, setSelectedPlatformId] = useState<string>("");

  // Excel Parsing States
  const [parsedLeads, setParsedLeads] = useState<any[]>([]);
  const [parsedHeaders, setParsedHeaders] = useState<string[]>([]);
  const [fileName, setFileName] = useState<string>("");
  const [uploading, setUploading] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch platforms on load
  const loadPlatforms = async () => {
    try {
      const res = await fetch("/api/lead-platforms");
      const data = await res.json();
      if (data.success) {
        setPlatforms(data.data);
        if (data.data.length > 0 && !activePlatformId) {
          setActivePlatformId(data.data[0].id);
        }
      }
    } catch (err) {
      triggerToast("Failed to load lead platforms.");
    }
  };

  // Fetch leads on platform change
  const loadLeads = async (platformId: string) => {
    if (!platformId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/business-leads?platformId=${platformId}`);
      const data = await res.json();
      if (data.success) {
        setLeads(data.data.leads || []);
        setColumns(data.data.columns || []);
      } else {
        triggerToast(data.error || "Failed to load leads.");
      }
    } catch (err) {
      triggerToast("Error fetching leads.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlatforms();
  }, []);

  useEffect(() => {
    if (activePlatformId) {
      loadLeads(activePlatformId);
    }
  }, [activePlatformId]);

  // Handle Drag & Drop / File Select
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  const processFile = (file: File) => {
    if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
      triggerToast("Please upload a valid Excel file (.xlsx or .xls)");
      return;
    }

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const buffer = e.target?.result;
        const workbook = XLSX.read(buffer, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json: any[] = XLSX.utils.sheet_to_json(worksheet);
        const headers = XLSX.utils.sheet_to_json(worksheet, { header: 1 })[0] as string[];

        if (json.length === 0 || !headers || headers.length === 0) {
          triggerToast("The selected Excel sheet seems to be empty.");
          return;
        }

        setParsedLeads(json);
        setParsedHeaders(headers);
        setImportStep(3); // Move to Preview step
      } catch (err) {
        triggerToast("Failed to parse the Excel file.");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Submit Import data to API
  const handleImportSubmit = async () => {
    if (parsedLeads.length === 0 || !selectedPlatformId) return;
    setUploading(true);
    try {
      const res = await fetch("/api/business-leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platformId: selectedPlatformId,
          leads: parsedLeads,
          headers: parsedHeaders
        })
      });
      const data = await res.json();
      if (data.success) {
        triggerToast(`Successfully imported ${data.count} leads.`);
        setIsImportModalOpen(false);
        setImportStep(1);
        setParsedLeads([]);
        setParsedHeaders([]);
        setFileName("");
        // Reload active tab
        setActivePlatformId(selectedPlatformId);
        await loadLeads(selectedPlatformId);
      } else {
        triggerToast(data.error || "Failed to import leads.");
      }
    } catch (err) {
      triggerToast("Network error submitting import.");
    } finally {
      setUploading(false);
    }
  };

  // Create New Platform Submit
  const handleCreatePlatformSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlatformName || !newPlatformPrefix) {
      triggerToast("Please enter platform name and prefix.");
      return;
    }
    try {
      const res = await fetch("/api/lead-platforms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newPlatformName,
          prefix: newPlatformPrefix
        })
      });
      const data = await res.json();
      if (data.success) {
        triggerToast(`Platform '${newPlatformName}' created successfully.`);
        setNewPlatformName("");
        setNewPlatformPrefix("");
        setIsCreatingPlatform(false);
        // Refresh platforms dropdown
        const updatedRes = await fetch("/api/lead-platforms");
        const updatedData = await updatedRes.json();
        if (updatedData.success) {
          setPlatforms(updatedData.data);
          // Set as currently selected for import
          setSelectedPlatformId(data.data.id);
          setImportStep(2); // Auto proceed to file upload
        }
      } else {
        triggerToast(data.error || "Failed to create platform.");
      }
    } catch (err) {
      triggerToast("Error creating platform.");
    }
  };

  // Generate and Download Sample Excel template
  const downloadTemplate = () => {
    const headers = [["Name", "Email", "Phone", "Company", "Notes", "Status", "Source"]];
    const ws = XLSX.utils.aoa_to_sheet(headers);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "Leads_Import_Template.xlsx");
  };

  // Filtered Leads list for display search
  const filteredLeads = leads.filter((lead) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return Object.values(lead).some((val) => 
      String(val).toLowerCase().includes(term)
    );
  });

  // Filter out columns that are completely empty across all records (except ID, status, and dates)
  const visibleColumns = columns.filter((col) => {
    if (["id", "status", "createdAt", "updatedAt"].includes(col)) return true;
    return leads.some((lead) => lead[col] !== null && lead[col] !== undefined && String(lead[col]).trim() !== "");
  });

  const getSourceDisplay = (platId: string) => {
    return platforms.find((p) => p.id === platId)?.name || platId.toUpperCase();
  };

  // Format database column name back to human readable header
  const formatHeader = (col: string) => {
    if (col === "id") return "Lead ID";
    if (col === "createdAt") return "Created Date";
    if (col === "updatedAt") return "Updated Date";
    return col
      .replace(/_/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

  return (
    <div className="space-y-6 animate-fadeIn text-slate-800 dark:text-gray-100 select-none">
      
      {/* Header and Import button */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-[#714B67] to-[#9D688E] bg-clip-text text-transparent">
            Business Leads Directory
          </h1>
          <p className="text-slate-500 dark:text-gray-400 text-xs font-medium">
            Manage your sales leads, import lists dynamically from multiple platforms, and evolve schemas automatically.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={downloadTemplate}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-gray-800 text-xs font-semibold bg-white dark:bg-slate-900 text-slate-600 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-gray-850 hover:shadow-sm active:scale-95 transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            Template
          </button>
          
          <button
            onClick={() => {
              setIsImportModalOpen(true);
              setImportStep(1);
            }}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[#714B67] text-white text-xs font-semibold shadow-md hover:bg-[#8A5B7D] active:scale-95 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            Import Excel
          </button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-gray-900/60 p-4 rounded-xl shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-[#714B67]/10 flex items-center justify-center text-[#714B67]">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Total Leads</p>
            <p className="text-xl font-bold text-slate-800 dark:text-gray-100">{leads.length}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-gray-900/60 p-4 rounded-xl shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-green-550/10 flex items-center justify-center text-green-600">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">New Leads</p>
            <p className="text-xl font-bold text-slate-800 dark:text-gray-100">
              {leads.filter((l) => l.status?.toLowerCase() === "new").length}
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-gray-900/60 p-4 rounded-xl shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-blue-550/10 flex items-center justify-center text-blue-600">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Active Platform</p>
            <p className="text-xs font-bold text-slate-800 dark:text-gray-100 truncate w-32">
              {getSourceDisplay(activePlatformId)}
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-gray-900/60 p-4 rounded-xl shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-purple-550/10 flex items-center justify-center text-purple-600">
            <Tag className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Unique Prefix</p>
            <p className="text-xl font-bold text-slate-800 dark:text-gray-100">
              {platforms.find((p) => p.id === activePlatformId)?.prefix || "N/A"}
            </p>
          </div>
        </div>
      </div>

      {/* Main Tabs and Actions toolbar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-gray-900/60 rounded-2xl shadow-sm overflow-hidden">
        
        {/* Platform Tabs */}
        <div className="flex border-b border-slate-100 dark:border-gray-800/80 overflow-x-auto bg-slate-50/50 dark:bg-slate-950/20">
          {platforms.map((plat) => (
            <button
              key={plat.id}
              onClick={() => setActivePlatformId(plat.id)}
              className={`px-5 py-3 text-xs font-bold whitespace-nowrap transition-all border-b-2 ${
                activePlatformId === plat.id
                  ? "border-[#714B67] text-[#714B67] bg-white dark:bg-slate-900"
                  : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-gray-300"
              }`}
            >
              {plat.name} ({plat.prefix})
            </button>
          ))}
        </div>

        {/* Toolbar */}
        <div className="p-4 border-b border-slate-50 dark:border-gray-850 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search leads across columns..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 dark:border-gray-800 rounded-lg bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-1 focus:ring-[#714B67]"
            />
          </div>
          <div className="text-[10px] font-medium text-slate-400">
            Showing {filteredLeads.length} of {leads.length} leads
          </div>
        </div>

        {/* Datatable */}
        <div className="overflow-x-auto overflow-y-auto w-full max-h-[580px] custom-scrollbar">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-2">
              <div className="w-6 h-6 border-2 border-[#714B67] border-t-transparent animate-spin rounded-full"></div>
              <span className="text-xs text-slate-400 font-medium">Loading leads table...</span>
            </div>
          ) : filteredLeads.length === 0 ? (
            <div className="py-20 text-center">
              <FileSpreadsheet className="w-10 h-10 text-slate-300 dark:text-gray-755 mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-600 dark:text-gray-400">No leads found</p>
              <p className="text-xs text-slate-400 mt-1">Upload an Excel file to start importing leads for this platform.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-950 text-slate-450 border-b border-slate-100 dark:border-gray-850">
                  {visibleColumns.map((col) => (
                    <th 
                      key={col} 
                      className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider sticky top-0 bg-slate-50 dark:bg-slate-950 z-10 border-b border-slate-200 dark:border-gray-800 shadow-sm"
                    >
                      {formatHeader(col)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-gray-850">
                {filteredLeads.map((lead) => (
                  <tr
                    key={lead.id}
                    className="hover:bg-slate-50/50 dark:hover:bg-slate-950/10 text-slate-600 dark:text-gray-300 transition-colors"
                  >
                    {visibleColumns.map((col) => (
                      <td key={col} className="px-4 py-3 text-xs truncate max-w-[200px]">
                        {col === "createdAt" || col === "updatedAt"
                          ? new Date(lead[col]).toLocaleDateString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric"
                            })
                          : lead[col] || <span className="text-slate-300 dark:text-gray-700">-</span>
                        }
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* IMPORT MULTI-STEP WIZARD MODAL */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl shadow-xl border border-slate-100 dark:border-gray-800/80 overflow-hidden flex flex-col max-h-[85vh] animate-scaleIn">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 dark:border-gray-850 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-800 dark:text-gray-150">Excel Lead Importer</h2>
                <p className="text-[10px] text-slate-400 font-medium">Dynamic table & column schema builder</p>
              </div>
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-gray-300 font-bold"
              >
                ✕
              </button>
            </div>

            {/* Stepper Progress Indicator */}
            <div className="px-6 py-4 bg-slate-50/50 dark:bg-slate-950/20 border-b border-slate-100 dark:border-gray-850 flex items-center justify-center gap-3">
              <div className={`flex items-center gap-1.5 text-xs font-semibold ${importStep >= 1 ? "text-[#714B67]" : "text-slate-400"}`}>
                <span className={`w-5 h-5 rounded-full flex items-center justify-center border text-[10px] ${importStep >= 1 ? "border-[#714B67] bg-[#714B67]/10" : "border-slate-350"}`}>1</span>
                Platform
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-slate-300" />
              <div className={`flex items-center gap-1.5 text-xs font-semibold ${importStep >= 2 ? "text-[#714B67]" : "text-slate-400"}`}>
                <span className={`w-5 h-5 rounded-full flex items-center justify-center border text-[10px] ${importStep >= 2 ? "border-[#714B67] bg-[#714B67]/10" : "border-slate-350"}`}>2</span>
                Upload
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-slate-300" />
              <div className={`flex items-center gap-1.5 text-xs font-semibold ${importStep >= 3 ? "text-[#714B67]" : "text-slate-400"}`}>
                <span className={`w-5 h-5 rounded-full flex items-center justify-center border text-[10px] ${importStep >= 3 ? "border-[#714B67] bg-[#714B67]/10" : "border-slate-350"}`}>3</span>
                Confirm
              </div>
            </div>

            {/* Step Content Area */}
            <div className="flex-1 overflow-y-auto p-6">
              
              {/* STEP 1: Select or Create Platform */}
              {importStep === 1 && (
                <div className="space-y-4">
                  {!isCreatingPlatform ? (
                    <div className="space-y-3">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Choose Destination Platform</label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {platforms.map((plat) => (
                          <div
                            key={plat.id}
                            onClick={() => {
                              setSelectedPlatformId(plat.id);
                              setImportStep(2);
                            }}
                            className={`p-4 border rounded-xl cursor-pointer hover:border-[#714B67] hover:bg-[#714B67]/5 dark:hover:bg-slate-950/20 transition-all flex items-center gap-3 group ${
                              selectedPlatformId === plat.id ? "border-[#714B67] bg-[#714B67]/5 dark:bg-slate-950/30" : "border-slate-200 dark:border-gray-800"
                            }`}
                          >
                            <div className="w-8 h-8 rounded-lg bg-[#714B67]/10 text-[#714B67] flex items-center justify-center font-bold text-xs">
                              {plat.prefix}
                            </div>
                            <div className="flex-1">
                              <p className="text-xs font-bold text-slate-700 dark:text-gray-200 group-hover:text-[#714B67]">{plat.name}</p>
                              <p className="text-[9px] text-slate-400">Table: {plat.tableName}</p>
                            </div>
                            <ChevronRightIcon className="w-4 h-4 text-slate-300 group-hover:text-[#714B67] transition-all" />
                          </div>
                        ))}
                      </div>

                      <div className="pt-4 border-t border-slate-100 dark:border-gray-850 flex justify-center">
                        <button
                          onClick={() => setIsCreatingPlatform(true)}
                          className="flex items-center gap-1.5 text-xs font-bold text-[#714B67] hover:text-[#8A5B7D]"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Create A New Platform Table
                        </button>
                      </div>
                    </div>
                  ) : (
                    <form onSubmit={handleCreatePlatformSubmit} className="space-y-4 max-w-md mx-auto">
                      <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wide">Register New Platform & Physical Table</h3>
                      
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Platform Name</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Glassdoor, Naukri"
                          value={newPlatformName}
                          onChange={(e) => setNewPlatformName(e.target.value)}
                          className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-gray-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#714B67] dark:bg-slate-950"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">ID Prefix (3-Letters)</label>
                        <input
                          type="text"
                          required
                          maxLength={3}
                          placeholder="e.g. GLD, NAK"
                          value={newPlatformPrefix}
                          onChange={(e) => setNewPlatformPrefix(e.target.value.toUpperCase())}
                          className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-gray-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#714B67] dark:bg-slate-950"
                        />
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => setIsCreatingPlatform(false)}
                          className="px-3 py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-4 py-1.5 text-xs font-bold bg-[#714B67] hover:bg-[#8A5B7D] text-white rounded-lg"
                        >
                          Create Table
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}

              {/* STEP 2: Drag and Drop Excel */}
              {importStep === 2 && (
                <div className="space-y-4">
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-200 dark:border-gray-850 hover:border-[#714B67] rounded-xl p-10 text-center cursor-pointer transition-all bg-slate-50/50 dark:bg-slate-950/10 hover:bg-[#714B67]/5"
                  >
                    <UploadCloud className="w-10 h-10 text-slate-350 mx-auto mb-3 animate-bounce" />
                    <p className="text-xs font-bold text-slate-700 dark:text-gray-250">Click or drag Excel file to upload</p>
                    <p className="text-[10px] text-slate-400 mt-1">Supports .xlsx or .xls spreadsheets</p>
                    <input
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      accept=".xlsx, .xls"
                      onChange={handleFileChange}
                    />
                  </div>

                  <div className="flex justify-between items-center text-xs pt-4">
                    <button
                      onClick={() => setImportStep(1)}
                      className="text-slate-500 hover:text-slate-700 font-semibold"
                    >
                      ← Back to Platform
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3: Preview Data and Verify Column Mapping */}
              {importStep === 3 && (
                <div className="space-y-4 flex flex-col h-full">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-slate-600">File: <span className="text-[#714B67]">{fileName}</span></p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Parsed {parsedLeads.length} rows and {parsedHeaders.length} columns</p>
                    </div>
                    <span className="bg-green-550/10 text-green-600 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Ready
                    </span>
                  </div>

                  {/* Columns to Create Notification */}
                  <div className="p-3 bg-amber-500/10 border border-amber-550/20 rounded-lg text-amber-700 dark:text-amber-500 text-[11px] font-medium flex gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Schema Sync Alert</p>
                      <p className="text-[10px] mt-0.5 opacity-90">
                        Any columns in this Excel file that do not currently exist in the database table will be created dynamically as new database columns. No columns will be skipped.
                      </p>
                    </div>
                  </div>

                  {/* Table Preview */}
                  <div className="border border-slate-100 dark:border-gray-850 rounded-lg overflow-x-auto max-h-[30vh]">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-950 text-slate-450 border-b border-slate-100 dark:border-gray-850">
                          {parsedHeaders.map((header) => (
                            <th key={header} className="px-3 py-2 text-[10px] font-bold uppercase whitespace-nowrap">
                              {header}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-gray-850">
                        {parsedLeads.slice(0, 5).map((row, idx) => (
                          <tr key={idx} className="text-slate-500 dark:text-gray-305">
                            {parsedHeaders.map((header) => (
                              <td key={header} className="px-3 py-2 text-xs truncate max-w-[150px]">
                                {row[header] !== undefined ? String(row[header]) : "-"}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {parsedLeads.length > 5 && (
                    <p className="text-center text-[10px] text-slate-400 font-semibold italic">
                      + {parsedLeads.length - 5} more rows parsed...
                    </p>
                  )}

                  <div className="flex justify-between items-center text-xs pt-4 border-t border-slate-50 dark:border-gray-850">
                    <button
                      onClick={() => {
                        setParsedLeads([]);
                        setParsedHeaders([]);
                        setImportStep(2);
                      }}
                      className="text-slate-500 hover:text-slate-700 font-semibold"
                    >
                      ← Re-upload File
                    </button>
                    
                    <button
                      onClick={handleImportSubmit}
                      disabled={uploading}
                      className="px-5 py-2 rounded-lg bg-[#714B67] hover:bg-[#8A5B7D] text-white font-semibold flex items-center gap-1.5 shadow-md disabled:opacity-50 active:scale-95 transition-all"
                    >
                      {uploading ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent animate-spin rounded-full"></div>
                          Syncing DB & Columns...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Confirm & Import
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// Micro-helper components for local icons to prevent imports mismatch
function ChevronRightIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      className={props.className}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  );
}
