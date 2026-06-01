import { ReactNode } from "react";
import { UserPlus, Calendar, CheckCircle, FileText } from "lucide-react";

const activities = [
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

export default function ActivityFeed({ dark = false }: { dark?: boolean }) {
  return (
    <div className="space-y-6">
      {activities.map((activity, idx) => (
        <div key={activity.id} className="relative flex gap-4">
          {/* Vertical line connector */}
          {idx !== activities.length - 1 && (
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
