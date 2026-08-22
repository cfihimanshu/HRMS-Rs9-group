"use client";

import React, { useEffect, useRef, useState } from "react";
import { Loader2, RefreshCw, Radio, Clock3, Navigation, Maximize2, Minimize2 } from "lucide-react";
import "leaflet/dist/leaflet.css";

export default function LiveTrackingMap() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapShellRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const markersLayer = useRef<any>(null);
  const L_ref = useRef<any>(null);
  const hasFittedBounds = useRef(false);

  const [pins, setPins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [selectedPin, setSelectedPin] = useState<any>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [clockTick, setClockTick] = useState(Date.now());
  const [isFullscreen, setIsFullscreen] = useState(false);

  const getPinStatus = (pin: any) => {
    const ageMinutes = Math.max(0, (clockTick - new Date(pin.lastUpdate).getTime()) / 60000);
    if (String(pin.type || "").toLowerCase().includes("eod")) return { label: "Logged out", color: "#64748b", bg: "#f1f5f9", pulse: false };
    if (ageMinutes <= 15) return { label: "Live now", color: "#10b981", bg: "#ecfdf5", pulse: true };
    if (ageMinutes <= 120) return { label: "Recently active", color: "#f59e0b", bg: "#fffbeb", pulse: false };
    return { label: "Last seen earlier", color: "#94a3b8", bg: "#f8fafc", pulse: false };
  };

  const formatLastSeen = (value: string) => {
    const minutes = Math.max(0, Math.floor((clockTick - new Date(value).getTime()) / 60000));
    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hr ago`;
    return new Date(value).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  };

  useEffect(() => {
    setIsMounted(true);
    const timer = setInterval(() => setClockTick(Date.now()), 60 * 1000);
    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === mapShellRef.current);
      window.setTimeout(() => mapInstance.current?.invalidateSize(), 100);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      clearInterval(timer);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) await mapShellRef.current?.requestFullscreen();
      else await document.exitFullscreen();
    } catch (error) {
      console.error("Fullscreen map failed:", error);
    }
  };

  const fetchLocations = async () => {
    try {
      setRefreshing(true);
      const res = await fetch("/api/tracking/live");
      const data = await res.json();
      if (data.success) {
        setPins(data.data);
        setLastSyncedAt(new Date());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLocations();
    const interval = setInterval(fetchLocations, 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Initialize Map
  useEffect(() => {
    if (!isMounted || !mapRef.current) return;

    // Only load Leaflet on the client side
    import("leaflet").then((L) => {
      L_ref.current = L;

      if (!mapInstance.current && mapRef.current) {
        mapInstance.current = L.map(mapRef.current, {
          minZoom: 3,
          maxZoom: 22,
          zoomSnap: 0.5,
          zoomDelta: 1,
          wheelPxPerZoomLevel: 45,
          scrollWheelZoom: true,
          doubleClickZoom: true
        }).setView([20.5937, 78.9629], 5);
        const streetLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
          attribution: '&copy; OpenStreetMap contributors',
          maxNativeZoom: 20,
          maxZoom: 22
        });
        
        const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
          attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
          maxNativeZoom: 19,
          maxZoom: 22
        });

        streetLayer.addTo(mapInstance.current);

        const baseMaps = {
          "Street View": streetLayer,
          "Satellite View": satelliteLayer
        };

        L.control.layers(baseMaps, undefined, { position: 'topleft' }).addTo(mapInstance.current);

        markersLayer.current = L.layerGroup().addTo(mapInstance.current);
      }
    });

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
        hasFittedBounds.current = false;
      }
    };
  }, [isMounted]);

  // Update Markers when pins change
  useEffect(() => {
    if (!L_ref.current || !mapInstance.current || !markersLayer.current) return;

    const L = L_ref.current;
    
    // Clear old markers
    markersLayer.current.clearLayers();

    const bounds = L.latLngBounds();
    let hasPins = false;

    pins.forEach(pin => {
      if (pin.lat && pin.lng) {
        hasPins = true;
        const status = getPinStatus(pin);
        const initials = String(pin.name || "NA").split(" ").slice(0, 2).map((part: string) => part[0]).join("").toUpperCase();
        const customIcon = L.divIcon({
          className: "live-employee-marker",
          html: `<div style="position:relative;width:42px;height:42px;display:flex;align-items:center;justify-content:center">
            ${status.pulse ? `<span style="position:absolute;width:42px;height:42px;border-radius:50%;background:${status.color};opacity:.22;animation:liveMapPulse 1.8s ease-out infinite"></span>` : ""}
            <div style="position:relative;width:32px;height:32px;border-radius:50%;background:${status.color};border:3px solid white;box-shadow:0 3px 12px rgba(15,23,42,.28);display:flex;align-items:center;justify-content:center;color:white;font:bold 10px Arial">${initials}</div>
            <span style="position:absolute;right:3px;bottom:3px;width:9px;height:9px;border-radius:50%;background:${status.color};border:2px solid white"></span>
          </div>`,
          iconSize: [42, 42],
          iconAnchor: [21, 21],
          popupAnchor: [0, -20]
        });
        const marker = L.marker([pin.lat, pin.lng], { icon: customIcon });
        
        const popupContent = `
          <div style="min-width: 150px; font-family: sans-serif;">
            <h4 style="font-weight: bold; color: #1e293b; border-bottom: 1px solid #f1f5f9; padding-bottom: 4px; margin-bottom: 6px;">
              ${String(pin.name || "Team Member").replace(/[<>&"']/g, "")}
            </h4>
            <p style="font-size: 10px; color: #64748b; margin: 2px 0;">Role: <strong style="color: #334155;">${String(pin.role || "Employee").replace(/[<>&"']/g, "")}</strong></p>
            <p style="font-size: 10px; color: #64748b; margin: 2px 0;">Activity: <strong style="color: #4f46e5;">${String(pin.type || "Location update").replace(/[<>&"']/g, "")}</strong></p>
            <p style="font-size:10px;color:${status.color};font-weight:700;margin:5px 0 0;">● ${status.label}</p>
            <p style="font-size: 9px; color: #94a3b8; margin-top: 6px; background: #f8fafc; padding: 4px; border-radius: 4px;">
              Updated: ${formatLastSeen(pin.lastUpdate)}
            </p>
          </div>
        `;
        
        marker.bindPopup(popupContent);
        marker.on("click", () => setSelectedPin(pin));
        markersLayer.current.addLayer(marker);
        bounds.extend([pin.lat, pin.lng]);
      }
    });

    // Auto fit bounds if there are pins
    if (hasPins && !hasFittedBounds.current) {
      mapInstance.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
      hasFittedBounds.current = true;
    }
  }, [pins, clockTick]);

  const liveCount = pins.filter(pin => getPinStatus(pin).label === "Live now").length;

  const focusEmployee = (pin: any) => {
    setSelectedPin(pin);
    mapInstance.current?.flyTo([pin.lat, pin.lng], 15, { duration: 1.2 });
  };

  if (!isMounted) return null;

  return (
    <div className="space-y-6 animate-fadeIn h-full flex flex-col">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-850">Live GPS Dashboard</h1>
          <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
            <Radio className="w-3 h-3 text-emerald-500" /> Live staff locations refresh automatically every minute.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="text-[10px] font-black uppercase text-emerald-700 tracking-wider">
              {liveCount} Live · {pins.length} Tracked
            </span>
          </div>
          <button
            onClick={fetchLocations}
            disabled={refreshing}
            className="px-3 py-2 bg-indigo-650 hover:bg-indigo-700 text-white rounded-lg flex items-center gap-2 text-[10px] font-black uppercase shadow-md transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      <div ref={mapShellRef} className={`bg-white border border-slate-200 shadow-sm overflow-hidden flex-1 relative flex ${isFullscreen ? "rounded-none min-h-screen" : "rounded-2xl min-h-[600px]"}`}>
        {loading && pins.length === 0 ? (
          <div className="w-full h-full flex items-center justify-center bg-slate-50/80 absolute inset-0 z-[1000]">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Locating Fleet...</p>
            </div>
          </div>
        ) : null}
        
        {/* Map Container */}
        <style>{`@keyframes liveMapPulse { 0% { transform:scale(.75); opacity:.35 } 75%,100% { transform:scale(1.45); opacity:0 } } .live-employee-marker { background:transparent!important; border:none!important; }`}</style>
        <div ref={mapRef} className="flex-1 w-full h-full z-0" style={{ minHeight: '600px' }}></div>

        <button
          onClick={toggleFullscreen}
          title={isFullscreen ? "Exit fullscreen" : "Open fullscreen map"}
          className="absolute z-[600] top-3 left-14 w-9 h-9 rounded-lg bg-white border border-slate-300 shadow-md flex items-center justify-center text-slate-700 hover:bg-slate-50 transition-colors"
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>

        <div className="absolute z-[500] top-3 right-3 bottom-3 w-64 hidden xl:flex flex-col rounded-xl bg-white/95 backdrop-blur-md border border-slate-200 shadow-xl overflow-hidden">
          <div className="px-3.5 py-3 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-700">Field Team</span>
              <span className="text-[9px] text-slate-400">{pins.length} today</span>
            </div>
            {lastSyncedAt && <div className="text-[8px] text-slate-400 mt-1">Synced {lastSyncedAt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</div>}
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-slate-100">
            {pins.map(pin => {
              const status = getPinStatus(pin);
              return (
                <button key={pin.userId} onClick={() => focusEmployee(pin)} className={`w-full text-left px-3.5 py-3 hover:bg-slate-50 transition-colors ${selectedPin?.userId === pin.userId ? "bg-indigo-50/70" : ""}`}>
                  <div className="flex items-start gap-2.5">
                    <span className="mt-1 w-2 h-2 rounded-full shrink-0" style={{ background: status.color, boxShadow: status.pulse ? `0 0 0 4px ${status.bg}` : "none" }} />
                    <div className="min-w-0 flex-1">
                      <div className="text-[10px] font-bold text-slate-800 truncate">{pin.name}</div>
                      <div className="text-[9px] text-slate-500 truncate mt-0.5">{pin.type}</div>
                      <div className="flex items-center gap-1 mt-1 text-[8px]" style={{ color: status.color }}><Clock3 className="w-2.5 h-2.5" /> {status.label} · {formatLastSeen(pin.lastUpdate)}</div>
                    </div>
                    <Navigation className="w-3 h-3 text-slate-300 shrink-0 mt-1" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="absolute z-[500] left-3 bottom-3 rounded-lg bg-white/95 backdrop-blur border border-slate-200 shadow-md px-3 py-2 flex items-center gap-3 text-[8px] font-bold text-slate-600">
          <span className="flex items-center gap-1"><i className="w-2 h-2 rounded-full bg-emerald-500" /> Live</span>
          <span className="flex items-center gap-1"><i className="w-2 h-2 rounded-full bg-amber-500" /> Recent</span>
          <span className="flex items-center gap-1"><i className="w-2 h-2 rounded-full bg-slate-400" /> Earlier/Out</span>
        </div>
      </div>
    </div>
  );
}
