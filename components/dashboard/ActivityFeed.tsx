"use client";

import { ReactNode, useState, useEffect } from "react";
import { 
  UserPlus, Calendar, CheckCircle, FileText, 
  Activity, Settings, ShieldAlert, LogOut, Clock, PlusCircle
} from "lucide-react";

// Helper for "time ago"
function timeAgo(dateString: string | Date) {
  if (!dateString) return "just now";
  const date = new Date(dateString);
  if (isNaN(date.getTime()) || date.getFullYear() <= 1970) {
    return "just now";
  }
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  let interval = Math.floor(seconds / 31536000);
  if (interval >= 1) return interval + " year" + (interval === 1 ? "" : "s") + " ago";
  interval = Math.floor(seconds / 2592000);
  if (interval >= 1) return interval + " month" + (interval === 1 ? "" : "s") + " ago";
  interval = Math.floor(seconds / 86400);
  if (interval >= 1) return interval + " day" + (interval === 1 ? "" : "s") + " ago";
  interval = Math.floor(seconds / 3600);
  if (interval >= 1) return interval + " hour" + (interval === 1 ? "" : "s") + " ago";
  interval = Math.floor(seconds / 60);
  if (interval >= 1) return interval + " min" + (interval === 1 ? "" : "s") + " ago";
  return "just now";
}

// Helper to determine icon & color based on action
function getIconForAction(action: string): { icon: ReactNode, bg: string, darkBg: string } {
  const actionUpper = action.toUpperCase();
  
  if (actionUpper.includes("CREATE") || actionUpper.includes("ADD") || actionUpper.includes("NEW")) {
    return {
      icon: <PlusCircle className="w-4 h-4 text-emerald-600" />,
      bg: "bg-emerald-100",
      darkBg: "bg-emerald-900/30",
    };
  }
  
  if (actionUpper.includes("UPDATE") || actionUpper.includes("EDIT")) {
    return {
      icon: <Settings className="w-4 h-4 text-blue-600" />,
      bg: "bg-blue-100",
      darkBg: "bg-blue-900/30",
    };
  }

  if (actionUpper.includes("DELETE") || actionUpper.includes("REMOVE") || actionUpper.includes("REJECT") || actionUpper.includes("HOLD")) {
    return {
      icon: <ShieldAlert className="w-4 h-4 text-rose-600" />,
      bg: "bg-rose-100",
      darkBg: "bg-rose-900/30",
    };
  }

  if (actionUpper.includes("APPROVE") || actionUpper.includes("SELECTED") || actionUpper.includes("ACTIVATION")) {
    return {
      icon: <CheckCircle className="w-4 h-4 text-green-600" />,
      bg: "bg-green-100",
      darkBg: "bg-green-900/30",
    };
  }
  
  if (actionUpper.includes("INTERVIEW") || actionUpper.includes("SCHEDULE")) {
    return {
      icon: <Calendar className="w-4 h-4 text-amber-600" />,
      bg: "bg-amber-100",
      darkBg: "bg-amber-900/30",
    };
  }

  return {
    icon: <Activity className="w-4 h-4 text-purple-600" />,
    bg: "bg-purple-100",
    darkBg: "bg-purple-900/30",
  };
}

export default function ActivityFeed({ 
  dark = false, 
  companyId = "", 
  logs: propLogs,
  maxHeight = "max-h-[600px]"
}: { 
  dark?: boolean; 
  companyId?: string; 
  logs?: any[];
  maxHeight?: string;
}) {
  const [logs, setLogs] = useState<any[]>(propLogs || []);
  const [loading, setLoading] = useState(propLogs === undefined);

  useEffect(() => {
    if (propLogs !== undefined) {
      setLogs(propLogs);
      setLoading(false);
      return;
    }

    setLoading(true);
    const fetchLogs = async () => {
      try {
        const res = await fetch(`/api/audit?companyId=${companyId}`);
        const data = await res.json();
        if (data.success) {
          setLogs(data.data);
        }
      } catch (err) {
        console.error("Failed to load audit logs");
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
    
    // Auto-refresh every 30 seconds
    const intervalId = setInterval(fetchLogs, 30000);
    return () => clearInterval(intervalId);
  }, [companyId, propLogs]);

  if (loading) {
    return <div className={`text-xs p-4 text-center ${dark ? 'text-gray-400' : 'text-slate-500'}`}>Loading activity feed...</div>;
  }

  if (logs.length === 0) {
    return <div className={`text-xs p-4 text-center ${dark ? 'text-gray-400' : 'text-slate-500'}`}>No recent activity found in the system.</div>;
  }

  return (
    <div className={`space-y-6 ${maxHeight} overflow-y-auto pr-2 custom-scrollbar`}>
      {logs.map((log, idx) => {
        const style = getIconForAction(log.action);
        return (
          <div key={log.id || idx} className="relative flex gap-4">
            {/* Vertical line connector */}
            {idx !== logs.length - 1 && (
              <div className={`absolute left-4 top-8 bottom-[-24px] w-0.5 ${dark ? "bg-gray-700" : "bg-slate-200"}`} />
            )}
            
            <div className={`relative z-10 flex shrink-0 items-center justify-center w-8 h-8 rounded-full ${dark ? style.darkBg : style.bg}`}>
              {style.icon}
            </div>
            
            <div className="flex-1 min-w-0 pb-2">
              <h4 className={`text-sm font-bold truncate ${dark ? "text-gray-200" : "text-slate-800"}`} title={log.action}>
                {log.title || (log.action ? log.action.replace(/_/g, " ") : "HR Activity")}
              </h4>
              <p 
                className={`text-xs mt-1 leading-relaxed line-clamp-2 ${dark ? "text-gray-400" : "text-slate-500"}`}
                style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}
                title={log.details || log.description}
              >
                {log.details || log.description || "—"}
              </p>
              <div className="flex items-center justify-between mt-1.5">
                <span className={`text-[10px] font-medium block ${dark ? "text-gray-500" : "text-slate-400"}`}>
                  {timeAgo(log.timestamp)}
                </span>
                <span className={`text-[10px] font-bold block truncate max-w-[150px] ${dark ? "text-indigo-400" : "text-indigo-600"}`}>
                  By {log.actor || log.user?.name || "System"}
                </span>
              </div>

            </div>
          </div>
        );
      })}
    </div>
  );
}
