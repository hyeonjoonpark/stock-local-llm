"use client";

import { useMemo, useState } from "react";
import AnalysisSummaryCard from "@/components/AnalysisSummaryCard";
import PriceChart from "@/components/PriceChart";
import StatePanel from "@/components/StatePanel";
import StockSearchForm from "@/components/StockSearchForm";
import TradeScenarioCalculator from "@/components/TradeScenarioCalculator";
import { fetchStockAnalysis } from "@/lib/api";
import { PricePoint, StockAnalysisResponse } from "@/lib/types";

function buildFallbackSeries(currentPrice: number): PricePoint[] {
  const pattern = [-0.015, -0.008, -0.003, 0, 0.004, 0.009, 0.012];
  return pattern.map((ratio, index) => ({
    date: `${index + 1}D`,
    close: Number((currentPrice * (1 + ratio)).toFixed(2)),
  }));
}

function parseQuestionPositionContext(question: string): {
  quantity?: number;
  avgPrice?: number;
} {
  const normalized = question.trim();
  if (!normalized) {
    return {};
  }

  const quantityMatch = normalized.match(/(\d+(?:\.\d+)?)\s*주/);
  const avgPricePatterns = [
    /평단\s*(\d+(?:\.\d+)?)/,
    /개당\s*(\d+(?:\.\d+)?)/,
    /(\d+(?:\.\d+)?)\s*(?:달러|원)\s*에\s*샀/,
    /(\d+(?:\.\d+)?)\s*(?:달러|원)\s*매수/,
  ];

  let avgPrice: number | undefined;
  for (const pattern of avgPricePatterns) {
    const match = normalized.match(pattern);
    if (match) {
      avgPrice = Number(match[1]);
      break;
    }
  }

  return {
    quantity: quantityMatch ? Number(quantityMatch[1]) : undefined,
    avgPrice,
  };
}

export default function StockDashboard() {
  const [ticker, setTicker] = useState("AAPL");
  const [question, setQuestion] = useState("");
  const [period, setPeriod] = useState<"1w" | "1mo" | "3mo" | "1y">("1mo");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [analysis, setAnalysis] = useState<StockAnalysisResponse | null>(null);

  const chartData = useMemo(() => {
    if (!analysis) {
      return [];
    }
    if (analysis.priceSeries.length > 0) {
      return analysis.priceSeries;
    }
    return buildFallbackSeries(analysis.currentPrice);
  }, [analysis]);

  const parsedPosition = useMemo(
    () => parseQuestionPositionContext(question),
    [question],
  );

  const handleSubmit = async () => {
    const normalizedTicker = ticker.trim();

    if (!normalizedTicker) {
      setErrorMessage("티커를 입력해주세요.");
      setAnalysis(null);
      return;
    }

    setLoading(true);
    setErrorMessage("");

    try {
      const response = await fetchStockAnalysis(normalizedTicker, question, period);
      setAnalysis(response);
      setTicker(normalizedTicker);
    } catch (error) {
      setAnalysis(null);
      setErrorMessage(error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-4 px-4 py-8">
      <header className="mb-2">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Stock AI Dashboard</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
          백엔드 AI 분석 결과를 조회하고 투자 판단을 빠르게 확인합니다.
        </p>
      </header>

      <StockSearchForm
        ticker={ticker}
        question={question}
        period={period}
        loading={loading}
        onTickerChange={setTicker}
        onQuestionChange={setQuestion}
        onPeriodChange={setPeriod}
        onSubmit={handleSubmit}
      />

      {loading && <StatePanel type="loading" message="주가와 AI 요약을 분석 중입니다." />}
      {!loading && errorMessage && <StatePanel type="error" message={errorMessage} />}
      {!loading && !errorMessage && !analysis && (
        <StatePanel type="empty" message="티커를 입력하고 분석을 시작하세요." />
      )}

      {!loading && analysis && (
        <>
          <AnalysisSummaryCard data={analysis} />
          <TradeScenarioCalculator
            key={`${analysis.ticker}-${parsedPosition.quantity ?? "na"}-${parsedPosition.avgPrice ?? "na"}`}
            currentPrice={analysis.currentPrice}
            currency={analysis.currency}
            initialQuantity={parsedPosition.quantity}
            initialAvgPrice={parsedPosition.avgPrice}
          />
          <PriceChart data={chartData} currency={analysis.currency} />
        </>
      )}
    </main>
  );
}
