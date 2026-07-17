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
      className={`stat-card relative overflow-hidden group transition-all duration-300 hover:shadow-[0_4px_25px_rgba(0,0,0,0.06)] border-[#E8E4DF] ${
        onClick ? "cursor-pointer active:scale-[0.99]" : ""
      }`}
    >
      <div className="flex justify-between items-start mb-4">
        <div>
          <p className="text-[10px] uppercase tracking-wider font-semibold mb-1.5 text-[#9C9890]">{title}</p>
          <h3 className="text-2xl font-light text-[#1C1C1A] font-serif" style={{ fontFamily: "'Playfair Display', serif" }}>{value}</h3>
        </div>
        <div className="p-3 rounded-lg bg-[#F0EAE4] text-[#1C1C1A] group-hover:bg-[#E8E4DF] transition-colors">
          {icon}
        </div>
      </div>
      <div className="flex items-center gap-1.5 mt-4">
        <span className={`flex items-center text-[10px] font-semibold px-2 py-0.5 rounded ${
          trendUp 
            ? "text-[#4E6D53] bg-[#E2EFE0]"
            : "text-[#B4463D] bg-[#FCE8E6]"
        }`}>
          {trendUp ? <ArrowUpRight className="w-3 h-3 mr-0.5" /> : <ArrowDownRight className="w-3 h-3 mr-0.5" />}
          {trend}
        </span>
        {comparisonText && (
          <span className="text-[10px] text-[#9C9890] font-medium uppercase tracking-wider">{comparisonText}</span>
        )}
      </div>
    </div>
  );
}
