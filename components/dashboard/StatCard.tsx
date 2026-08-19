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
  comparisonText?: string;
}

export default function StatCard({ title, value, trend, trendUp, icon, onClick, comparisonText }: StatCardProps) {
  return (
    <div 
      onClick={onClick}
      className={`stat-card bg-white relative overflow-hidden group transition-all duration-300 hover:shadow-[0_4px_25px_rgba(0,0,0,0.06)] border-[#E8E4DF] p-3 sm:p-4 rounded-xl ${
        onClick ? "cursor-pointer active:scale-[0.99]" : ""
      }`}
    >
      <div className="flex justify-between items-start mb-2 sm:mb-4 gap-1.5">
        <div className="min-w-0 flex-1">
          <p className="text-[9px] sm:text-[10px] uppercase tracking-wider font-semibold mb-1 text-[#9C9890] truncate" title={title}>{title}</p>
          <h3 className="text-xl sm:text-2xl font-light text-[#1C1C1A] font-serif" style={{ fontFamily: "'Playfair Display', serif" }}>{value}</h3>
        </div>
        <div className="p-2 sm:p-3 rounded-lg bg-[#F0EAE4] text-[#1C1C1A] group-hover:bg-[#E8E4DF] transition-colors shrink-0">
          {icon}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-1 mt-2 sm:mt-4">
        <span className={`flex items-center text-[9px] sm:text-[10px] font-semibold px-1.5 sm:px-2 py-0.5 rounded truncate max-w-full ${
          trendUp 
            ? "text-[#4E6D53] bg-[#E2EFE0]"
            : "text-[#B4463D] bg-[#FCE8E6]"
        }`}>
          {trendUp ? <ArrowUpRight className="w-3 h-3 mr-0.5 shrink-0" /> : <ArrowDownRight className="w-3 h-3 mr-0.5 shrink-0" />}
          <span className="truncate">{trend}</span>
        </span>
        {comparisonText && (
          <span className="text-[9px] sm:text-[10px] text-[#9C9890] font-medium uppercase tracking-wider truncate">{comparisonText}</span>
        )}
      </div>
    </div>
  );
}
