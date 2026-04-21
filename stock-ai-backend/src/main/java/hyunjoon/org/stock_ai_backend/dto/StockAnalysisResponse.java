package hyunjoon.org.stock_ai_backend.dto;

import hyunjoon.org.stock_ai_backend.enums.AnalysisResult;

/**
 * 주식 분석 응답 DTO (Record 사용)
 * @param ticker 종목 코드
 * @param currentPrice 현재가
 * @param summary AI 분석 요약
 * @param decision 분석 등급 (Enum)
 */
public record StockAnalysisResponse(
        String ticker,
        double currentPrice,
        String summary,
        AnalysisResult decision
) {

}