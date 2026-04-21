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
  const marketEvidence = data.evidence.filter((item) => item.type === "MARKET");
  const newsEvidence = data.evidence.filter((item) => item.type === "NEWS");

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
      {(marketEvidence.length > 0 || newsEvidence.length > 0) && (
        <div className="mt-5 rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
          <p className="mb-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400">RAG 상세 근거</p>
          {marketEvidence.length > 0 && (
            <div className="mb-3">
              <p className="mb-1 text-xs font-semibold text-zinc-700 dark:text-zinc-200">수치 근거</p>
              <ul className="list-disc space-y-1 pl-5 text-xs text-zinc-600 dark:text-zinc-300">
                {marketEvidence.map((item, index) => (
                  <li key={`market-${index}`}>
                    {item.summary}
                    {item.metric ? ` (${item.metric})` : ""}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {newsEvidence.length > 0 && (
            <div>
              <p className="mb-1 text-xs font-semibold text-zinc-700 dark:text-zinc-200">뉴스 근거</p>
              <ul className="list-disc space-y-1 pl-5 text-xs text-zinc-600 dark:text-zinc-300">
                {newsEvidence.map((item, index) => (
                  <li key={`news-${index}`}>
                    <span className="font-semibold">{item.sourceTitle || "뉴스 근거"}</span>
                    : {item.summary}
                    {item.sourceUrl && (
                      <>
                        {" "}
                        <a
                          href={item.sourceUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-indigo-600 hover:underline dark:text-indigo-300"
                        >
                          링크
                        </a>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
      {data.retrievedSources.length > 0 && (
        <div className="mt-4 rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
          <p className="mb-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400">참조 뉴스 출처</p>
          <ul className="space-y-2 text-xs text-zinc-700 dark:text-zinc-200">
            {data.retrievedSources.map((source, index) => (
              <li key={`${source.title}-${index}`} className="rounded bg-zinc-50 p-2 dark:bg-zinc-800">
                <p className="font-semibold">{source.title}</p>
                <p className="text-zinc-500 dark:text-zinc-400">{source.publisher}</p>
                {source.url && (
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-indigo-600 hover:underline dark:text-indigo-300"
                  >
                    원문 보기
                  </a>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
      {data.recentMonthNews.length > 0 && (
        <div className="mt-4 rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
          <p className="mb-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400">최근 1개월 관련 뉴스</p>
          <ul className="space-y-2 text-xs text-zinc-700 dark:text-zinc-200">
            {data.recentMonthNews.map((news, index) => (
              <li key={`${news.title}-${index}`} className="rounded bg-zinc-50 p-2 dark:bg-zinc-800">
                <p className="font-semibold">{news.title}</p>
                <p className="text-zinc-500 dark:text-zinc-400">
                  {news.publisher}
                  {news.publishedAt ? ` · ${news.publishedAt.slice(0, 10)}` : ""}
                </p>
                {news.summary && <p className="mt-1 line-clamp-2">{news.summary}</p>}
                {news.url && (
                  <a
                    href={news.url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-block text-indigo-600 hover:underline dark:text-indigo-300"
                  >
                    원문 보기
                  </a>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
