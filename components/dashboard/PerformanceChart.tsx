"use client";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const data = [
  { name: "Jan", score: 85 },
  { name: "Feb", score: 88 },
  { name: "Mar", score: 82 },
  { name: "Apr", score: 90 },
  { name: "May", score: 87 },
  { name: "Jun", score: 92 },
  { name: "Jul", score: 89 },
];

export default function PerformanceChart({ dark = false }: { dark?: boolean }) {
  const textColor = dark ? "#9ca3af" : "#64748b";
  const gridColor = dark ? "#374151" : "#e2e8f0";
  const tooltipBg = dark ? "#1f2937" : "#ffffff";
  const tooltipBorder = dark ? "#374151" : "#e2e8f0";

  return (
    <div className="h-[300px] w-full mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} barSize={32}>
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
            domain={[0, 100]}
          />
          <Tooltip 
            cursor={{ fill: dark ? '#374151' : '#f1f5f9' }}
            contentStyle={{ 
              backgroundColor: tooltipBg, 
              borderColor: tooltipBorder,
              borderRadius: '0.5rem',
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
              color: dark ? '#fff' : '#000'
            }}
          />
          <Bar 
            dataKey="score" 
            fill="#9333ea" 
            radius={[4, 4, 0, 0]} 
            name="Avg Score (%)"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
