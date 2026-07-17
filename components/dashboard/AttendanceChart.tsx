"use client";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from "recharts";

const data = [
  { name: "Mon", present: 215, absent: 30 },
  { name: "Tue", present: 220, absent: 25 },
  { name: "Wed", present: 218, absent: 27 },
  { name: "Thu", present: 225, absent: 20 },
  { name: "Fri", present: 210, absent: 35 },
  { name: "Sat", present: 45, absent: 200 },
  { name: "Sun", present: 10, absent: 235 },
];

export default function AttendanceChart({ 
  dark = false,
  data: customData
}: { 
  dark?: boolean;
  data?: any[];
}) {
  const textColor = dark ? "#9ca3af" : "#64748b";
  const gridColor = dark ? "#1e293b" : "#f1f5f9";
  const tooltipBg = dark ? "rgba(15, 23, 42, 0.9)" : "rgba(255, 255, 255, 0.95)";
  const tooltipBorder = dark ? "#334155" : "#e2e8f0";

  const chartData = customData || data;
  const isDynamic = !!customData;

  return (
    <div className="h-[320px] w-full mt-2">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 15, right: 15, left: -20, bottom: 5 }}>
          <defs>
            <linearGradient id="colorPresent" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
            </linearGradient>
            <linearGradient id="colorAbsent" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="4 4" vertical={false} stroke={gridColor} />
          <XAxis 
            dataKey="name" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: textColor, fontSize: 11, fontWeight: 500 }} 
            dy={8}
          />
          <YAxis 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: textColor, fontSize: 11, fontWeight: 500 }}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: tooltipBg, 
              borderColor: tooltipBorder,
              borderRadius: '0.75rem',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
              backdropFilter: 'blur(8px)',
              color: dark ? '#f8fafc' : '#0f172a',
              fontSize: '12px',
              fontFamily: 'monospace',
              borderWidth: '1px'
            }}
          />
          <Legend 
            verticalAlign="top" 
            height={40} 
            align="right"
            iconType="circle"
            iconSize={8}
            wrapperStyle={{
              fontSize: '11px',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              paddingBottom: '10px'
            }}
          />
          <Area 
            type="monotone" 
            dataKey={isDynamic ? "Selected for Joining" : "present"} 
            stroke="#10b981" 
            strokeWidth={3}
            activeDot={{ r: 6, strokeWidth: 0 }}
            fillOpacity={1} 
            fill="url(#colorPresent)" 
            name={isDynamic ? "Selected for Joining" : "Present"}
          />
          <Area 
            type="monotone" 
            dataKey={isDynamic ? "Total Leads" : "absent"} 
            stroke="#6366f1" 
            strokeWidth={2.5}
            activeDot={{ r: 5, strokeWidth: 0 }}
            fillOpacity={1} 
            fill="url(#colorAbsent)" 
            name={isDynamic ? "Total Leads" : "Absent"}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
