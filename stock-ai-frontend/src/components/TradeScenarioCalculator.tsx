"use client";

import { useMemo, useState } from "react";

interface TradeScenarioCalculatorProps {
  currentPrice: number;
  currency: string;
  initialQuantity?: number;
  initialAvgPrice?: number;
}

function formatMoney(value: number, currency: string): string {
  if (currency === "KRW") {
    return `${Math.round(value).toLocaleString("ko-KR")}원`;
  }
  if (currency === "USD") {
    return `$${value.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
  }
  return `${value.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${currency}`;
}

export default function TradeScenarioCalculator({
  currentPrice,
  currency,
  initialQuantity,
  initialAvgPrice,
}: TradeScenarioCalculatorProps) {
  const [quantity, setQuantity] = useState(initialQuantity ?? 100);
  const [avgPrice, setAvgPrice] = useState<number | "">(initialAvgPrice ?? "");
  const [takeProfitRate, setTakeProfitRate] = useState(5);
  const [stopLossRate, setStopLossRate] = useState(3);

  const result = useMemo(() => {
    const safeQty = Number.isFinite(quantity) ? quantity : 0;
    const hasAvgPrice = typeof avgPrice === "number" && Number.isFinite(avgPrice) && avgPrice > 0;
    const safeAvg = hasAvgPrice ? avgPrice : 0;

    const immediatePnl = hasAvgPrice ? (currentPrice - safeAvg) * safeQty : null;
    const targetPrice = currentPrice * (1 + takeProfitRate / 100);
    const stopPrice = currentPrice * (1 - stopLossRate / 100);
    const targetPnl = hasAvgPrice ? (targetPrice - safeAvg) * safeQty : null;
    const stopPnl = hasAvgPrice ? (stopPrice - safeAvg) * safeQty : null;

    return {
      hasAvgPrice,
      immediatePnl,
      targetPrice,
      stopPrice,
      targetPnl,
      stopPnl,
    };
  }, [quantity, avgPrice, takeProfitRate, stopLossRate, currentPrice]);

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
      <h3 className="mb-3 text-lg font-bold text-zinc-900 dark:text-zinc-100">매매 시나리오 계산기</h3>
      <div className="mb-4 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
        <label className="text-zinc-600 dark:text-zinc-300">
          보유 수량
          <input
            type="number"
            value={quantity}
            onChange={(event) => setQuantity(Number(event.target.value))}
            className="mt-1 h-10 w-full rounded border border-zinc-300 bg-white px-2 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
          />
        </label>
        <label className="text-zinc-600 dark:text-zinc-300">
          평단
          <input
            type="number"
            value={avgPrice}
            onChange={(event) =>
              setAvgPrice(event.target.value === "" ? "" : Number(event.target.value))
            }
            placeholder="평단 입력"
            className="mt-1 h-10 w-full rounded border border-zinc-300 bg-white px-2 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
          />
        </label>
        <label className="text-zinc-600 dark:text-zinc-300">
          목표 수익률(%)
          <input
            type="number"
            value={takeProfitRate}
            onChange={(event) => setTakeProfitRate(Number(event.target.value))}
            className="mt-1 h-10 w-full rounded border border-zinc-300 bg-white px-2 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
          />
        </label>
        <label className="text-zinc-600 dark:text-zinc-300">
          손절 기준(%)
          <input
            type="number"
            value={stopLossRate}
            onChange={(event) => setStopLossRate(Number(event.target.value))}
            className="mt-1 h-10 w-full rounded border border-zinc-300 bg-white px-2 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
          />
        </label>
      </div>

      <div className="space-y-2 text-sm">
        <p className="text-zinc-700 dark:text-zinc-200">
          즉시 매도 손익:{" "}
          <span className="font-semibold">
            {result.hasAvgPrice && result.immediatePnl !== null
              ? formatMoney(result.immediatePnl, currency)
              : "계산 불가 (평단 입력 필요)"}
          </span>
        </p>
        <p className="text-zinc-700 dark:text-zinc-200">
          목표가({takeProfitRate}%): <span className="font-semibold">{formatMoney(result.targetPrice, currency)}</span> / 예상 손익{" "}
          <span className="font-semibold">
            {result.hasAvgPrice && result.targetPnl !== null
              ? formatMoney(result.targetPnl, currency)
              : "계산 불가"}
          </span>
        </p>
        <p className="text-zinc-700 dark:text-zinc-200">
          손절가({stopLossRate}%): <span className="font-semibold">{formatMoney(result.stopPrice, currency)}</span> / 예상 손익{" "}
          <span className="font-semibold">
            {result.hasAvgPrice && result.stopPnl !== null
              ? formatMoney(result.stopPnl, currency)
              : "계산 불가"}
          </span>
        </p>
      </div>
    </section>
  );
}
