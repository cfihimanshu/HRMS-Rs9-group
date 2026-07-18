"use client";
import { Line, LineChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

interface PerformanceChartProps {
  dark?: boolean;
  data?: any[];
}

export default function PerformanceChart({ dark = false, data }: PerformanceChartProps) {
  const textColor = dark ? "#9ca3af" : "#64748b";
  const gridColor = dark ? "#374151" : "#e2e8f0";
  const tooltipBg = dark ? "#1f2937" : "#ffffff";
  const tooltipBorder = dark ? "#374151" : "#e2e8f0";

  const chartData = data && data.length > 0 
    ? data.map((d: any) => ({
        name: d.name || d.month || "",
        score: typeof d.score === 'number' ? d.score : (typeof d.rate === 'number' ? d.rate : 0)
      }))
    : [
        { name: "Feb", score: 0 },
        { name: "Mar", score: 0 },
        { name: "Apr", score: 0 },
        { name: "May", score: 0 },
        { name: "Jun", score: 0 },
        { name: "Jul", score: 0 },
      ];

  return (
    <div className="h-[300px] w-full mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
            tickFormatter={(v) => `${v}%`}
          />
          <Tooltip
            cursor={{ stroke: dark ? '#4b5563' : '#cbd5e1', strokeWidth: 1 }}
            contentStyle={{
              backgroundColor: tooltipBg,
              borderColor: tooltipBorder,
              borderRadius: '0.5rem',
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
              color: dark ? '#fff' : '#000'
            }}
            formatter={(value: any) => [`${value}%`, "SOD Compliance"] as [any, any]}
          />
          <Line
            type="monotone"
            dataKey="score"
            stroke="#9333ea"
            strokeWidth={3}
            dot={{ r: 4, stroke: "#9333ea", strokeWidth: 2, fill: "#fff" }}
            activeDot={{ r: 6 }}
            name="SOD Compliance (%)"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
