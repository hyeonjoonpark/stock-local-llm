"use client";

import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PricePoint } from "@/lib/types";

interface PriceChartProps {
  data: PricePoint[];
}

export default function PriceChart({ data }: PriceChartProps) {
  const isDarkMode =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;

  return (
    <section className="min-w-0 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
      <h2 className="mb-4 text-lg font-bold text-zinc-900 dark:text-zinc-100">가격 추세 (최근 데이터)</h2>
      <div className="h-60 min-h-60 w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%" minWidth={280} minHeight={200}>
          <LineChart data={data}>
            <XAxis dataKey="date" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} domain={["auto", "auto"]} />
            <Tooltip
              contentStyle={{
                backgroundColor: isDarkMode ? "#111827" : "#ffffff",
                border: `1px solid ${isDarkMode ? "#374151" : "#e4e4e7"}`,
                borderRadius: 8,
                color: isDarkMode ? "#e5e7eb" : "#111827",
              }}
              labelStyle={{ color: isDarkMode ? "#d1d5db" : "#374151" }}
              itemStyle={{ color: isDarkMode ? "#c7d2fe" : "#4338ca" }}
            />
            <Line
              type="monotone"
              dataKey="close"
              stroke="#4f46e5"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
