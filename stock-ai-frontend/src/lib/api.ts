import { StockAnalysisResponse } from "./types";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

export async function fetchStockAnalysis(
  ticker: string,
  question: string = "",
): Promise<StockAnalysisResponse> {
  const sanitizedTicker = ticker.trim();
  const sanitizedQuestion = question.trim();

  if (!sanitizedTicker) {
    throw new Error("티커를 입력해주세요.");
  }

  const params = new URLSearchParams();
  if (sanitizedQuestion) {
    params.set("question", sanitizedQuestion);
  }

  let response: Response;

  try {
    response = await fetch(
      `${API_BASE_URL}/api/stocks/analyze/${encodeURIComponent(sanitizedTicker)}${params.toString() ? `?${params.toString()}` : ""}`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
        cache: "no-store",
      },
    );
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error(
        "백엔드 서버에 연결할 수 없습니다. 백엔드 실행 상태와 CORS 설정을 확인해주세요.",
      );
    }
    throw error;
  }

  if (!response.ok) {
    const text = await response.text();
    let serverMessage = text.trim();

    try {
      const json = JSON.parse(text) as { message?: string; detail?: string; error?: string };
      serverMessage = json.message || json.detail || json.error || serverMessage;
    } catch {
      // noop: plain text/HTML 응답인 경우 기존 text 사용
    }

    if (response.status === 401 || response.status === 403) {
      throw new Error(
        serverMessage || "백엔드 접근이 차단되었습니다. 보안(Security) 설정을 확인해주세요.",
      );
    }

    if (response.status === 404) {
      throw new Error(serverMessage || "해당 티커의 주식 데이터를 찾을 수 없습니다.");
    }
    if (response.status === 503) {
      throw new Error(serverMessage || "AI 분석 서버에 연결할 수 없습니다. AI 서버 실행 상태를 확인해주세요.");
    }
    if (response.status >= 500) {
      throw new Error(serverMessage || "분석 처리 중 서버 오류가 발생했습니다.");
    }

    throw new Error(serverMessage || "분석 요청에 실패했습니다.");
  }

  const data = (await response.json()) as StockAnalysisResponse;

  if (
    typeof data?.ticker !== "string" ||
    typeof data?.currentPrice !== "number" ||
    typeof data?.changeRate !== "number" ||
    typeof data?.volatility !== "number" ||
    typeof data?.currency !== "string" ||
    typeof data?.summary !== "string" ||
    typeof data?.decision !== "string" ||
    typeof data?.confidence !== "number" ||
    typeof data?.riskLevel !== "string" ||
    !Array.isArray(data?.keyFactors) ||
    !Array.isArray(data?.priceSeries) ||
    typeof data?.analyzedAt !== "string" ||
    !Array.isArray(data?.retrievedContext)
  ) {
    throw new Error("서버 응답 형식이 올바르지 않습니다.");
  }

  return data;
}
