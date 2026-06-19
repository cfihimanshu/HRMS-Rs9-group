"use client";
import React, { useMemo } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

interface HiringTrendsChartProps {
  candidates: any[];
  filterType: "this-week" | "last-week" | "prev-month";
  dark?: boolean;
}

export default function HiringTrendsChart({ candidates = [], filterType, dark = false }: HiringTrendsChartProps) {
  const chartData = useMemo(() => {
    const today = new Date();
    const candidateDates = candidates.map(c => ({
      ...c,
      createdDate: new Date(c.createdAt)
    })).filter(c => !isNaN(c.createdDate.getTime()));

    if (filterType === "this-week") {
      // Get Monday of current week
      const currentDay = today.getDay();
      const diff = today.getDate() - currentDay + (currentDay === 0 ? -6 : 1);
      const monday = new Date(today.getFullYear(), today.getMonth(), diff, 0, 0, 0, 0);
      
      const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
      return days.map((dayName, idx) => {
        const targetDate = new Date(monday.getTime());
        targetDate.setDate(monday.getDate() + idx);
        
        const count = candidateDates.filter(c => 
          c.createdDate.getFullYear() === targetDate.getFullYear() &&
          c.createdDate.getMonth() === targetDate.getMonth() &&
          c.createdDate.getDate() === targetDate.getDate()
        ).length;

        return {
          name: dayName,
          leads: count,
          dateStr: targetDate.toLocaleDateString("en-IN", { day: "numeric", month: "short" })
        };
      });
    }

    if (filterType === "last-week") {
      // Get Monday of last week
      const currentDay = today.getDay();
      const diff = today.getDate() - currentDay + (currentDay === 0 ? -6 : 1) - 7;
      const monday = new Date(today.getFullYear(), today.getMonth(), diff, 0, 0, 0, 0);

      const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
      return days.map((dayName, idx) => {
        const targetDate = new Date(monday.getTime());
        targetDate.setDate(monday.getDate() + idx);

        const count = candidateDates.filter(c => 
          c.createdDate.getFullYear() === targetDate.getFullYear() &&
          c.createdDate.getMonth() === targetDate.getMonth() &&
          c.createdDate.getDate() === targetDate.getDate()
        ).length;

        return {
          name: dayName,
          leads: count,
          dateStr: targetDate.toLocaleDateString("en-IN", { day: "numeric", month: "short" })
        };
      });
    }

    if (filterType === "prev-month") {
      // Previous calendar month
      const year = today.getFullYear();
      const month = today.getMonth();
      const prevMonthYear = month === 0 ? year - 1 : year;
      const prevMonthIndex = month === 0 ? 11 : month - 1;
      
      const startDate = new Date(prevMonthYear, prevMonthIndex, 1, 0, 0, 0, 0);
      const endDate = new Date(prevMonthYear, prevMonthIndex + 1, 0, 23, 59, 59, 999);
      const totalDays = endDate.getDate();

      const dataPoints = [];
      for (let i = 1; i <= totalDays; i++) {
        const targetDate = new Date(prevMonthYear, prevMonthIndex, i, 0, 0, 0, 0);
        
        const count = candidateDates.filter(c => 
          c.createdDate.getFullYear() === targetDate.getFullYear() &&
          c.createdDate.getMonth() === targetDate.getMonth() &&
          c.createdDate.getDate() === targetDate.getDate()
        ).length;

        dataPoints.push({
          name: `${i}`,
          leads: count,
          dateStr: targetDate.toLocaleDateString("en-IN", { day: "numeric", month: "short" })
        });
      }
      return dataPoints;
    }

    return [];
  }, [candidates, filterType]);

  const textColor = dark ? "#9ca3af" : "#64748b";
  const gridColor = dark ? "#374151" : "#e2e8f0";
  const tooltipBg = dark ? "#1f2937" : "#ffffff";
  const tooltipBorder = dark ? "#374151" : "#e2e8f0";

  return (
    <div className="h-[300px] w-full mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
          <XAxis 
            dataKey="name" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: textColor, fontSize: 11 }} 
            dy={10}
            interval={filterType === "prev-month" ? 2 : 0}
          />
          <YAxis 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: textColor, fontSize: 11 }}
            allowDecimals={false}
          />
          <Tooltip 
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload;
                return (
                  <div className="p-3 rounded-lg border shadow-lg text-xs" style={{ backgroundColor: tooltipBg, borderColor: tooltipBorder }}>
                    <p className={`font-bold ${dark ? "text-white" : "text-slate-800"}`}>{data.dateStr}</p>
                    <p className="text-indigo-500 font-black mt-1">Leads: {data.leads}</p>
                  </div>
                );
              }
              return null;
            }}
          />
          <Area 
            type="monotone" 
            dataKey="leads" 
            stroke="#4f46e5" 
            strokeWidth={3}
            fillOpacity={1} 
            fill="url(#colorLeads)" 
            name="Leads"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
