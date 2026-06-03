import React, { ReactNode } from "react";
import { UserPlus, Calendar, CheckCircle, FileText, XCircle, GraduationCap, Clock, ShieldCheck } from "lucide-react";

interface ActivityItem {
  id: string | number;
  title: string;
  description: string;
  timestamp: string;
  action: string;
  actor?: string;
  actorRole?: string;
}

const staticActivities = [
  {
    id: 1,
    title: "New Employee Onboarded",
    description: "Sarah Jenkins joined as Senior Frontend Developer in Engineering.",
    time: "2 hours ago",
    icon: <UserPlus className="w-4 h-4 text-purple-600" />,
    bg: "bg-purple-100",
    darkBg: "bg-purple-900/30",
  },
  {
    id: 2,
    title: "Leave Request Approved",
    description: "Michael Chen's annual leave for next week was approved.",
    time: "4 hours ago",
    icon: <CheckCircle className="w-4 h-4 text-green-600" />,
    bg: "bg-green-100",
    darkBg: "bg-green-900/30",
  },
  {
    id: 3,
    title: "Monthly Payroll Processed",
    description: "Salary disbursement for May 2026 has been completed.",
    time: "1 day ago",
    icon: <FileText className="w-4 h-4 text-blue-600" />,
    bg: "bg-blue-100",
    darkBg: "bg-blue-900/30",
  },
  {
    id: 4,
    title: "Interview Scheduled",
    description: "Product Manager interview with David Lee set for tomorrow.",
    time: "1 day ago",
    icon: <Calendar className="w-4 h-4 text-amber-600" />,
    bg: "bg-amber-100",
    darkBg: "bg-amber-900/30",
  },
];

const actionMeta: Record<string, { icon: React.ReactNode; bg: string; darkBg: string }> = {
  CREATE_EMPLOYEE: {
    icon: <UserPlus className="w-4 h-4 text-purple-600" />,
    bg: "bg-purple-100",
    darkBg: "bg-purple-900/30",
  },
  SCHEDULE_INTERVIEW: {
    icon: <Calendar className="w-4 h-4 text-amber-600" />,
    bg: "bg-amber-100",
    darkBg: "bg-amber-900/30",
  },
  SUBMIT_INTERVIEW_EVALUATION: {
    icon: <CheckCircle className="w-4 h-4 text-emerald-600" />,
    bg: "bg-emerald-100",
    darkBg: "bg-emerald-900/30",
  },
  SUBMIT_VERIFICATION: {
    icon: <ShieldCheck className="w-4 h-4 text-indigo-600" />,
    bg: "bg-indigo-100",
    darkBg: "bg-indigo-900/30",
  },
  APPROVED_LEAVE: {
    icon: <CheckCircle className="w-4 h-4 text-green-600" />,
    bg: "bg-green-100",
    darkBg: "bg-green-900/30",
  },
  REJECTED_LEAVE: {
    icon: <XCircle className="w-4 h-4 text-rose-600" />,
    bg: "bg-rose-100",
    darkBg: "bg-rose-900/30",
  },
  CREATE_JOB: {
    icon: <FileText className="w-4 h-4 text-blue-600" />,
    bg: "bg-blue-100",
    darkBg: "bg-blue-900/30",
  },
  UPDATE_TRAINING_LOG: {
    icon: <GraduationCap className="w-4 h-4 text-purple-600" />,
    bg: "bg-purple-100",
    darkBg: "bg-purple-900/30",
  },
  SUBMIT_PROBATION_EVALUATION: {
    icon: <Clock className="w-4 h-4 text-sky-600" />,
    bg: "bg-sky-100",
    darkBg: "bg-sky-900/30",
  },
  default: {
    icon: <FileText className="w-4 h-4 text-slate-600" />,
    bg: "bg-slate-100",
    darkBg: "bg-slate-900/30",
  }
};

function getRelativeTime(timestamp: string): string {
  try {
    const now = new Date();
    const date = new Date(timestamp);
    const diffMs = now.getTime() - date.getTime();
    
    if (isNaN(diffMs) || diffMs < 0) return "Just now";
    
    const diffMins = Math.floor(diffMs / (1000 * 60));
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours < 24) return `${diffHours}h ago`;
    
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 1) return "1 day ago";
    return `${diffDays} days ago`;
  } catch (e) {
    return "Recently";
  }
}

export default function ActivityFeed({ activities, dark = false }: { activities?: ActivityItem[]; dark?: boolean }) {
  if (activities) {
    if (activities.length === 0) {
      return (
        <div className={`text-center py-6 text-xs ${dark ? "text-gray-400" : "text-slate-500"}`}>
          No recent HR activities found.
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {activities.map((activity, idx) => {
          const meta = actionMeta[activity.action] || actionMeta.default;
          return (
            <div key={activity.id} className="relative flex gap-4">
              {idx !== activities.length - 1 && (
                <div className={`absolute left-4 top-8 bottom-[-24px] w-0.5 ${dark ? "bg-gray-700" : "bg-slate-200"}`} />
              )}
              
              <div className={`relative z-10 flex shrink-0 items-center justify-center w-8 h-8 rounded-full ${dark ? meta.darkBg : meta.bg}`}>
                {meta.icon}
              </div>
              
              <div>
                <h4 className={`text-sm font-semibold flex flex-wrap items-center gap-1.5 ${dark ? "text-gray-200" : "text-slate-800"}`}>
                  {activity.title}
                  {activity.actor && (
                    <span className={`text-[10px] font-normal px-1.5 py-0.5 rounded ${dark ? "bg-gray-800 text-purple-300 border border-gray-700" : "bg-purple-50 text-purple-600 border border-purple-100"}`}>
                      by {activity.actor} ({activity.actorRole})
                    </span>
                  )}
                </h4>
                <p className={`text-xs mt-1 leading-relaxed ${dark ? "text-gray-400" : "text-slate-500"}`}>
                  {activity.description}
                </p>
                <span className={`text-[10px] font-medium mt-1.5 block ${dark ? "text-gray-500" : "text-slate-400"}`}>
                  {getRelativeTime(activity.timestamp)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // Fallback to static list (default)
  return (
    <div className="space-y-6">
      {staticActivities.map((activity, idx) => (
        <div key={activity.id} className="relative flex gap-4">
          {idx !== staticActivities.length - 1 && (
            <div className={`absolute left-4 top-8 bottom-[-24px] w-0.5 ${dark ? "bg-gray-700" : "bg-slate-200"}`} />
          )}
          
          <div className={`relative z-10 flex shrink-0 items-center justify-center w-8 h-8 rounded-full ${dark ? activity.darkBg : activity.bg}`}>
            {activity.icon}
          </div>
          
          <div>
            <h4 className={`text-sm font-semibold ${dark ? "text-gray-200" : "text-slate-800"}`}>
              {activity.title}
            </h4>
            <p className={`text-xs mt-1 leading-relaxed ${dark ? "text-gray-400" : "text-slate-500"}`}>
              {activity.description}
            </p>
            <span className={`text-[10px] font-medium mt-1.5 block ${dark ? "text-gray-500" : "text-slate-400"}`}>
              {activity.time}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
