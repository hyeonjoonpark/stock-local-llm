"use client";

interface StockSearchFormProps {
  ticker: string;
  question: string;
  period: "1w" | "1mo" | "3mo" | "1y";
  loading: boolean;
  onTickerChange: (value: string) => void;
  onQuestionChange: (value: string) => void;
  onPeriodChange: (value: "1w" | "1mo" | "3mo" | "1y") => void;
  onSubmit: () => void;
}

export default function StockSearchForm({
  ticker,
  question,
  period,
  loading,
  onTickerChange,
  onQuestionChange,
  onPeriodChange,
  onSubmit,
}: StockSearchFormProps) {
  const templateQuestions = [
    "단기 전망과 리스크는?",
    "매수/매도 타이밍 관점에서 요약해줘.",
    "최근 뉴스가 주가에 미치는 영향은?",
  ];

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
      <label htmlFor="ticker" className="mb-2 block text-sm font-medium text-zinc-800 dark:text-zinc-100">
        종목 티커/이름 (예: AAPL, TSLA, 005930, 테슬라, 삼성전자)
      </label>
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          id="ticker"
          value={ticker}
          onChange={(event) => onTickerChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              onSubmit();
            }
          }}
          placeholder="티커 또는 한글 종목명을 입력하세요"
          className="h-11 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none ring-indigo-300 transition placeholder:text-zinc-400 focus:ring-2 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-500"
          disabled={loading}
        />
        <button
          type="button"
          onClick={onSubmit}
          disabled={loading}
          className="h-11 min-w-28 whitespace-nowrap rounded-lg bg-indigo-600 px-8 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-indigo-300"
        >
          {loading ? "분석 중..." : "분석 시작"}
        </button>
      </div>
      <div className="mt-3">
        <label htmlFor="question" className="mb-2 block text-sm font-medium text-zinc-800 dark:text-zinc-100">
          분석 질문 (선택)
        </label>
        <input
          id="question"
          value={question}
          onChange={(event) => onQuestionChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              onSubmit();
            }
          }}
          placeholder="예: 테슬라 단기 전망과 리스크는?"
          className="h-11 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none ring-indigo-300 transition placeholder:text-zinc-400 focus:ring-2 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-500"
          disabled={loading}
        />
        <div className="mt-2 flex flex-wrap gap-2">
          {templateQuestions.map((template) => (
            <button
              key={template}
              type="button"
              onClick={() => onQuestionChange(template)}
              disabled={loading}
              className="rounded-full border border-zinc-300 px-3 py-1 text-xs text-zinc-700 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              {template}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-3">
        <p className="mb-2 text-sm font-medium text-zinc-800 dark:text-zinc-100">기간 선택</p>
        <div className="flex flex-wrap gap-2">
          {[
            { value: "1w", label: "1주" },
            { value: "1mo", label: "1개월" },
            { value: "3mo", label: "3개월" },
            { value: "1y", label: "1년" },
          ].map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => onPeriodChange(item.value as "1w" | "1mo" | "3mo" | "1y")}
              disabled={loading}
              className={`rounded-full px-3 py-1 text-xs ${
                period === item.value
                  ? "bg-indigo-600 text-white"
                  : "border border-zinc-300 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
