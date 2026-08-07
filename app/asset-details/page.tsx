"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Package, CheckCircle2, AlertCircle, Building2, User, Calendar, CreditCard, ShieldCheck, QrCode, Cpu, Smartphone, Mail, Phone } from "lucide-react";

function AssetDetailsContent() {
  const searchParams = useSearchParams();
  const assetId = searchParams.get("id") || searchParams.get("assetId");

  const [asset, setAsset] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!assetId) {
      setError("No Asset ID provided in request URL.");
      setLoading(false);
      return;
    }

    async function fetchAsset() {
      try {
        setLoading(true);
        const res = await fetch(`/api/assets/public-details?id=${encodeURIComponent(String(assetId || ""))}`);
        const data = await res.json();
        if (data.success && data.asset) {
          setAsset(data.asset);
        } else {
          setError(data.error || `Asset ID "${assetId}" not found in inventory.`);
        }
      } catch (err: any) {
        console.error(err);
        setError("Network error fetching asset specifications.");
      } finally {
        setLoading(false);
      }
    }

    fetchAsset();
  }, [assetId]);

  const formatDate = (dateVal: any) => {
    if (!dateVal) return "N/A";
    try {
      const d = new Date(String(dateVal).trim());
      if (!isNaN(d.getTime())) {
        const day = String(d.getDate()).padStart(2, "0");
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const year = d.getFullYear();
        return `${day}/${month}/${year}`;
      }
      return String(dateVal);
    } catch (_) {
      return String(dateVal);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 font-sans">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-semibold tracking-wider text-slate-300">Retrieving Asset Dossier ({assetId})...</p>
      </div>
    );
  }

  if (error || !asset) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 font-sans">
        <div className="max-w-md w-full bg-slate-800 border border-slate-700 rounded-2xl p-6 text-center space-y-4 shadow-2xl">
          <AlertCircle className="w-12 h-12 text-rose-400 mx-auto" />
          <h2 className="text-lg font-bold text-slate-100">Asset Verification Failed</h2>
          <p className="text-xs text-slate-400">{error || "Requested asset is not available in inventory database."}</p>
          <div className="pt-2">
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all"
            >
              Retry Search
            </button>
          </div>
        </div>
      </div>
    );
  }

  const fields = asset.customFields?.assetFields || {};
  const emails = asset.customFields?.emailsList || [];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans p-4 md:p-8 flex items-center justify-center">
      <div className="max-w-2xl w-full bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col space-y-0">
        
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-purple-950 p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <span className="text-[10px] font-black uppercase tracking-widest text-indigo-300">Verified Corporate Property</span>
            </div>
            <h1 className="text-xl font-black text-white tracking-wide">{asset.companyName}</h1>
            <p className="text-xs font-medium text-slate-400">Official Asset Identification Dossier</p>
          </div>
          <div className="text-right">
            <div className="px-3 py-1 bg-indigo-600 text-white font-mono font-black text-sm rounded-xl shadow-inner inline-block">
              {asset.id}
            </div>
            {asset.oldAssetId && (
              <div className="text-[10px] text-amber-400 font-mono font-bold mt-1">Old ID: {asset.oldAssetId}</div>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="p-6 space-y-6">

          {/* Badges Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-800/60 p-3 rounded-2xl border border-slate-800">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-lg text-xs font-bold uppercase">
                {asset.assetType}
              </span>
              <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-lg text-xs font-bold">
                Condition: {asset.condition || "Good"}
              </span>
            </div>
            <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${asset.status === "In Use" ? "bg-purple-500/20 text-purple-300 border border-purple-500/30" : "bg-blue-500/20 text-blue-300 border border-blue-500/30"}`}>
              Status: {asset.status || "Available"}
            </span>
          </div>

          {/* Photo & Model Box */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-800/40 p-4 rounded-2xl border border-slate-800 items-center">
            {(() => {
              let photoList: string[] = [];
              if (asset.photoUrl) {
                const str = String(asset.photoUrl).trim();
                if (str.startsWith("[")) {
                  try { photoList = JSON.parse(str); } catch (_) { photoList = [str]; }
                } else {
                  photoList = [str];
                }
              }
              if (photoList.length === 0) return null;
              return (
                <div className="col-span-1 flex flex-wrap gap-2">
                  {photoList.map((url, idx) => (
                    <img key={idx} src={url} alt={`Asset photo ${idx + 1}`} className="w-24 h-24 object-cover rounded-xl border border-slate-700 shadow-md" />
                  ))}
                </div>
              );
            })()}
            <div className={asset.photoUrl ? "col-span-2 space-y-2" : "col-span-3 space-y-2"}>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Cpu className="w-3.5 h-3.5 text-indigo-400" /> Description & Hardware Model
              </div>
              <h2 className="text-base font-black text-slate-100">{asset.assetDetail || "N/A"}</h2>
              {asset.serialNumber && (
                <div className="text-xs text-slate-300">
                  <span className="text-slate-400">Serial / IMEI:</span> <span className="font-mono font-bold text-amber-300">{asset.serialNumber}</span>
                </div>
              )}
              {fields.phoneImei2 && (
                <div className="text-xs text-slate-300">
                  <span className="text-slate-400">IMEI 2:</span> <span className="font-mono font-bold text-amber-300">{fields.phoneImei2}</span>
                </div>
              )}
            </div>
          </div>

          {/* Technical Specs Grid */}
          <div className="bg-slate-800/40 p-4 rounded-2xl border border-slate-800 space-y-3">
            <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
              <Smartphone className="w-4 h-4" /> System Specifications & Hardware Config
            </h3>
            <div className="grid grid-cols-2 gap-3 text-xs">
              {(fields.phoneSpecs || fields.laptopSpecs) && (
                <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-semibold">RAM & STORAGE:</span>
                  <span className="font-bold text-slate-200">{fields.phoneSpecs || fields.laptopSpecs}</span>
                </div>
              )}
              {fields.laptopOs && (
                <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-semibold">OPERATING SYSTEM:</span>
                  <span className="font-bold text-slate-200">{fields.laptopOs}</span>
                </div>
              )}
              {fields.laptopHostName && (
                <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-semibold">HOST NAME:</span>
                  <span className="font-mono font-bold text-indigo-300">{fields.laptopHostName}</span>
                </div>
              )}
              {fields.sim1Number && (
                <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-semibold">SIM CARD & OPERATOR:</span>
                  <span className="font-mono font-bold text-emerald-400">{fields.sim1Number} ({fields.sim1Operator || "Vi"})</span>
                </div>
              )}
            </div>
          </div>

          {/* Logged in Emails if present */}
          {emails.length > 0 && emails.filter(Boolean).length > 0 && (
            <div className="bg-slate-800/40 p-4 rounded-2xl border border-slate-800 space-y-2">
              <h3 className="text-xs font-bold text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
                <Mail className="w-4 h-4" /> Configured Email Accounts
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {emails.filter(Boolean).map((email: string, idx: number) => (
                  <span key={idx} className="px-2.5 py-1 bg-purple-950/60 text-purple-200 border border-purple-800/50 rounded-lg text-xs font-mono">
                    {email}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Ownership & Staff Assignment */}
          <div className="bg-slate-800/40 p-4 rounded-2xl border border-slate-800 space-y-3">
            <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
              <User className="w-4 h-4" /> Staff Custody & Purchase Details
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
              <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 block font-semibold">ASSIGNED STAFF:</span>
                <span className="font-bold text-purple-300">{asset.assignedToName || "Unallocated (In Stock)"}</span>
              </div>
              <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 block font-semibold">COMPANY BELONGING:</span>
                <span className="font-bold text-slate-200">{asset.companyName}</span>
              </div>
              <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 block font-semibold">PURCHASE DATE:</span>
                <span className="font-mono font-bold text-slate-200">{formatDate(asset.purchaseDate)}</span>
              </div>
              {asset.purchaseValue && (
                <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-semibold">PURCHASE VALUE:</span>
                  <span className="font-mono font-bold text-emerald-400">₹ {Number(asset.purchaseValue).toLocaleString("en-IN")}</span>
                </div>
              )}
              {(asset.handoverDate || asset.assignedAt) && (
                <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-semibold">HANDOVER DATE:</span>
                  <span className="font-mono font-bold text-slate-200">{formatDate(asset.handoverDate || asset.assignedAt)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Footer Note */}
          <div className="text-center pt-2 border-t border-slate-800">
            <p className="text-[10px] text-slate-500 font-mono">
              RS9 Group HRMS Asset Management System · Official Identification Card
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}

export default function AssetDetailsPage() {
  return (
    <React.Suspense
      fallback={
        <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 font-sans">
          <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-sm font-semibold tracking-wider text-slate-300">Retrieving Asset Dossier...</p>
        </div>
      }
    >
      <AssetDetailsContent />
    </React.Suspense>
  );
}
