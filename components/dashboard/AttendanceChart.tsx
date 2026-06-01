"use client";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const data = [
  { name: "Mon", present: 215, absent: 30 },
  { name: "Tue", present: 220, absent: 25 },
  { name: "Wed", present: 218, absent: 27 },
  { name: "Thu", present: 225, absent: 20 },
  { name: "Fri", present: 210, absent: 35 },
  { name: "Sat", present: 45, absent: 200 },
  { name: "Sun", present: 10, absent: 235 },
];

export default function AttendanceChart({ dark = false }: { dark?: boolean }) {
  const textColor = dark ? "#9ca3af" : "#64748b";
  const gridColor = dark ? "#374151" : "#e2e8f0";
  const tooltipBg = dark ? "#1f2937" : "#ffffff";
  const tooltipBorder = dark ? "#374151" : "#e2e8f0";

  return (
    <div className="h-[300px] w-full mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="colorPresent" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#9333ea" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#9333ea" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorAbsent" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
          <XAxis 
            dataKey="name" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: textColor, fontSize: 12 }} 
            dy={10}
          />
          <YAxis 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: textColor, fontSize: 12 }}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: tooltipBg, 
              borderColor: tooltipBorder,
              borderRadius: '0.5rem',
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
              color: dark ? '#fff' : '#000'
            }}
          />
          <Area 
            type="monotone" 
            dataKey="present" 
            stroke="#9333ea" 
            strokeWidth={3}
            fillOpacity={1} 
            fill="url(#colorPresent)" 
            name="Present"
          />
          <Area 
            type="monotone" 
            dataKey="absent" 
            stroke="#ef4444" 
            strokeWidth={2}
            fillOpacity={1} 
            fill="url(#colorAbsent)" 
            name="Absent"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
