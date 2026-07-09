"use client";

import React, { useEffect, useRef, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import "leaflet/dist/leaflet.css";

export default function LiveTrackingMap() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const markersLayer = useRef<any>(null);
  const L_ref = useRef<any>(null);

  const [pins, setPins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const fetchLocations = async () => {
    try {
      setRefreshing(true);
      const res = await fetch("/api/tracking/live");
      const data = await res.json();
      if (data.success) {
        setPins(data.data);
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
    const interval = setInterval(fetchLocations, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Initialize Map
  useEffect(() => {
    if (!isMounted || !mapRef.current) return;

    // Only load Leaflet on the client side
    import("leaflet").then((L) => {
      L_ref.current = L;

      if (!mapInstance.current && mapRef.current) {
        mapInstance.current = L.map(mapRef.current).setView([20.5937, 78.9629], 5);
        const streetLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
          attribution: '&copy; OpenStreetMap contributors'
        });
        
        const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
          attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
        });

        streetLayer.addTo(mapInstance.current);

        const baseMaps = {
          "Street View": streetLayer,
          "Satellite View": satelliteLayer
        };

        L.control.layers(baseMaps, undefined, { position: 'topright' }).addTo(mapInstance.current);

        markersLayer.current = L.layerGroup().addTo(mapInstance.current);
      }
    });

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, [isMounted]);

  // Update Markers when pins change
  useEffect(() => {
    if (!L_ref.current || !mapInstance.current || !markersLayer.current) return;

    const L = L_ref.current;
    
    // Clear old markers
    markersLayer.current.clearLayers();

    const customIcon = new L.Icon({
      iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
      shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41]
    });

    const bounds = L.latLngBounds();
    let hasPins = false;

    pins.forEach(pin => {
      if (pin.lat && pin.lng) {
        hasPins = true;
        const marker = L.marker([pin.lat, pin.lng], { icon: customIcon });
        
        const popupContent = `
          <div style="min-width: 150px; font-family: sans-serif;">
            <h4 style="font-weight: bold; color: #1e293b; border-bottom: 1px solid #f1f5f9; padding-bottom: 4px; margin-bottom: 6px;">
              ${pin.name}
            </h4>
            <p style="font-size: 10px; color: #64748b; margin: 2px 0;">Role: <strong style="color: #334155;">${pin.role}</strong></p>
            <p style="font-size: 10px; color: #64748b; margin: 2px 0;">Activity: <strong style="color: #4f46e5;">${pin.type}</strong></p>
            <p style="font-size: 9px; color: #94a3b8; margin-top: 6px; background: #f8fafc; padding: 4px; border-radius: 4px;">
              Updated: ${new Date(pin.lastUpdate).toLocaleTimeString()}
            </p>
          </div>
        `;
        
        marker.bindPopup(popupContent);
        markersLayer.current.addLayer(marker);
        bounds.extend([pin.lat, pin.lng]);
      }
    });

    // Auto fit bounds if there are pins
    if (hasPins) {
      mapInstance.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
    }
  }, [pins]);

  if (!isMounted) return null;

  return (
    <div className="space-y-6 animate-fadeIn h-full flex flex-col">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-850">Live GPS Dashboard</h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time tracking map showing the latest known coordinates of all field staff for today.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="text-[10px] font-black uppercase text-emerald-700 tracking-wider">
              {pins.length} Active Pins
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

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex-1 relative min-h-[600px] flex">
        {loading && pins.length === 0 ? (
          <div className="w-full h-full flex items-center justify-center bg-slate-50/80 absolute inset-0 z-[1000]">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Locating Fleet...</p>
            </div>
          </div>
        ) : null}
        
        {/* Map Container */}
        <div ref={mapRef} className="flex-1 w-full h-full z-0" style={{ minHeight: '600px' }}></div>
      </div>
    </div>
  );
}
