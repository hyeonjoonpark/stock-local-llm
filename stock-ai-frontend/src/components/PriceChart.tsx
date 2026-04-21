"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PricePoint } from "@/lib/types";

interface PriceChartProps {
  data: PricePoint[];
  currency: string;
}

function formatPrice(value: number, currency: string): string {
  if (currency === "KRW") {
    return `${Math.round(value).toLocaleString("ko-KR")}원`;
  }
  if (currency === "USD") {
    return `$${value.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
  }
  return `${value.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${currency}`;
}

export default function PriceChart({ data, currency }: PriceChartProps) {
  const isDarkMode =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;
  const first = data[0]?.close ?? 0;
  const last = data[data.length - 1]?.close ?? 0;
  const min = data.length > 0 ? Math.min(...data.map((item) => item.close)) : 0;
  const max = data.length > 0 ? Math.max(...data.map((item) => item.close)) : 0;
  const average = data.length > 0 ? data.reduce((acc, item) => acc + item.close, 0) / data.length : 0;
  const isUpTrend = last >= first;

  if (data.length === 0) {
    return (
      <section className="min-w-0 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
        <h2 className="mb-4 text-lg font-bold text-zinc-900 dark:text-zinc-100">가격 추세 (최근 데이터)</h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-300">표시할 차트 데이터가 없습니다.</p>
      </section>
    );
  }

  return (
    <section className="min-w-0 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">가격 추세 (최근 데이터)</h2>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            isUpTrend
              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-200"
              : "bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-200"
          }`}
        >
          {isUpTrend ? "상승 추세" : "하락 추세"}
        </span>
      </div>
      <div className="mb-3 grid grid-cols-2 gap-2 text-xs text-zinc-600 dark:text-zinc-300 sm:grid-cols-4">
        <p>시작가: {formatPrice(first, currency)}</p>
        <p>마지막가: {formatPrice(last, currency)}</p>
        <p>최저가: {formatPrice(min, currency)}</p>
        <p>최고가: {formatPrice(max, currency)}</p>
      </div>
      <div className="h-60 min-h-60 w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%" minWidth={280} minHeight={200}>
          <LineChart data={data}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={isDarkMode ? "#374151" : "#e5e7eb"}
              vertical={false}
            />
            <XAxis dataKey="date" tick={{ fontSize: 12 }} />
            <YAxis
              tick={{ fontSize: 12 }}
              domain={["auto", "auto"]}
              tickFormatter={(value) => (currency === "KRW" ? `${Math.round(value).toLocaleString("ko-KR")}` : `${value.toFixed(0)}`)}
            />
            <Tooltip
              formatter={(value) => {
                const numericValue = typeof value === "number" ? value : Number(value ?? 0);
                return [formatPrice(numericValue, currency), "종가"];
              }}
              labelFormatter={(label) => `일자: ${label}`}
              contentStyle={{
                backgroundColor: isDarkMode ? "#111827" : "#ffffff",
                border: `1px solid ${isDarkMode ? "#374151" : "#e4e4e7"}`,
                borderRadius: 8,
                color: isDarkMode ? "#e5e7eb" : "#111827",
              }}
              labelStyle={{ color: isDarkMode ? "#d1d5db" : "#374151" }}
              itemStyle={{ color: isDarkMode ? "#c7d2fe" : "#4338ca" }}
            />
            <ReferenceLine
              y={average}
              stroke={isDarkMode ? "#a1a1aa" : "#71717a"}
              strokeDasharray="4 4"
              label={{ value: "평균", position: "insideTopRight", fill: isDarkMode ? "#d4d4d8" : "#52525b", fontSize: 11 }}
            />
            <Line
              type="monotone"
              dataKey="close"
              stroke={isUpTrend ? "#22c55e" : "#f43f5e"}
              strokeWidth={2}
              dot={{ r: 2 }}
              activeDot={{ r: 5 }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
