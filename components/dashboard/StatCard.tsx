import { ReactNode } from "react";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string;
  trend: string;
  trendUp: boolean;
  icon: ReactNode;
  dark?: boolean;
  onClick?: () => void;
}

export default function StatCard({ title, value, trend, trendUp, icon, dark = false, onClick }: StatCardProps) {
  return (
    <div 
      onClick={onClick}
      className={`stat-card relative overflow-hidden group transition-all duration-300 hover:shadow-md ${
        onClick ? "cursor-pointer active:scale-[0.98]" : ""
      } ${dark ? "hover:border-gray-600" : "hover:border-purple-200"}`}
    >
      <div className="flex justify-between items-start mb-4">
        <div>
          <p className={`text-sm font-medium mb-1 ${dark ? "text-gray-400" : "text-slate-500"}`}>{title}</p>
          <h3 className={`text-2xl font-bold ${dark ? "text-white" : "text-slate-800"}`}>{value}</h3>
        </div>
        <div className={`p-3 rounded-lg ${dark ? "bg-gray-800 text-purple-400 group-hover:bg-purple-900/30" : "bg-purple-50 text-purple-600 group-hover:bg-purple-100"} transition-colors`}>
          {icon}
        </div>
      </div>
      <div className="flex items-center gap-1.5 mt-4">
        <span className={`flex items-center text-xs font-semibold px-1.5 py-0.5 rounded-full ${
          trendUp 
            ? dark ? "text-green-400 bg-green-400/10" : "text-green-600 bg-green-50"
            : dark ? "text-red-400 bg-red-400/10" : "text-red-600 bg-red-50"
        }`}>
          {trendUp ? <ArrowUpRight className="w-3 h-3 mr-0.5" /> : <ArrowDownRight className="w-3 h-3 mr-0.5" />}
          {trend}
        </span>
        <span className={`text-xs ${dark ? "text-gray-500" : "text-slate-400"}`}>vs last month</span>
      </div>
      
      {/* Decorative gradient blob */}
      <div className={`absolute -right-6 -bottom-6 w-24 h-24 rounded-full blur-2xl opacity-0 group-hover:opacity-20 transition-opacity duration-500 pointer-events-none ${
        dark ? "bg-purple-500" : "bg-purple-400"
      }`} />
    </div>
  );
}
