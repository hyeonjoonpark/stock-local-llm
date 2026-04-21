import { StockAnalysisResponse } from "@/lib/types";

const decisionLabelMap: Record<StockAnalysisResponse["decision"], string> = {
  STRONG_BUY: "강력 매수",
  BUY: "매수",
  HOLD: "관망",
  SELL: "매도",
  STRONG_SELL: "강력 매도",
};

const decisionColorMap: Record<StockAnalysisResponse["decision"], string> = {
  STRONG_BUY: "bg-emerald-100 text-emerald-700",
  BUY: "bg-green-100 text-green-700",
  HOLD: "bg-amber-100 text-amber-700",
  SELL: "bg-orange-100 text-orange-700",
  STRONG_SELL: "bg-red-100 text-red-700",
};

const riskLabelMap: Record<StockAnalysisResponse["riskLevel"], string> = {
  LOW: "낮음",
  MID: "중간",
  HIGH: "높음",
};

interface AnalysisSummaryCardProps {
  data: StockAnalysisResponse;
}

function formatPrice(price: number, currency: string): string {
  if (currency === "KRW") {
    return `${price.toLocaleString("ko-KR")}원`;
  }
  if (currency === "USD") {
    return `$${price.toLocaleString("en-US")}`;
  }
  return `${price.toLocaleString()} ${currency}`;
}

export default function AnalysisSummaryCard({ data }: AnalysisSummaryCardProps) {
  const confidencePercent = Math.round(data.confidence * 100);

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">{data.ticker} 분석 결과</h2>
        <span
          className={`rounded-full px-3 py-1 text-xs font-bold ${decisionColorMap[data.decision]}`}
        >
          {decisionLabelMap[data.decision]}
        </span>
      </div>
      <p className="mb-3 text-sm text-zinc-600 dark:text-zinc-300">
        현재가: {formatPrice(data.currentPrice, data.currency)}
      </p>
      <p className="mb-1 text-sm text-zinc-600 dark:text-zinc-300">
        등락률: {data.changeRate >= 0 ? "+" : ""}
        {data.changeRate.toFixed(2)}% | 변동성: {data.volatility.toFixed(2)}%
      </p>
      <p className="mb-3 text-sm text-zinc-600 dark:text-zinc-300">리스크: {riskLabelMap[data.riskLevel]}</p>

      <div className="mb-4">
        <p className="mb-1 text-xs font-semibold text-zinc-500 dark:text-zinc-400">AI 신뢰도 {confidencePercent}%</p>
        <div className="h-2 w-full rounded bg-zinc-200 dark:bg-zinc-700">
          <div
            className="h-2 rounded bg-indigo-600"
            style={{ width: `${confidencePercent}%` }}
          />
        </div>
      </div>

      <p className="whitespace-pre-line text-sm leading-6 text-zinc-800 dark:text-zinc-100">{data.summary}</p>
      {data.keyFactors.length > 0 && (
        <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-zinc-700 dark:text-zinc-200">
          {data.keyFactors.map((factor) => (
            <li key={factor}>{factor}</li>
          ))}
        </ul>
      )}
    </section>
  );
}
