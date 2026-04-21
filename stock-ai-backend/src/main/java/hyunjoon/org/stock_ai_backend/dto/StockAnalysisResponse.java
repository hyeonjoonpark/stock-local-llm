package hyunjoon.org.stock_ai_backend.dto;

import hyunjoon.org.stock_ai_backend.enums.AnalysisResult;

/**
 * 주식 분석 응답 DTO (Record 사용)
 * @param ticker 종목 코드
 * @param currentPrice 현재가
 * @param currency 통화 코드 (KRW, USD 등)
 * @param summary AI 분석 요약
 * @param decision 분석 등급 (Enum)
 */
public record StockAnalysisResponse(
        String ticker,
        double currentPrice,
        double changeRate,
        double volatility,
        String currency,
        String summary,
        AnalysisResult decision,
        double confidence,
        String riskLevel,
        java.util.List<String> keyFactors,
        java.util.List<PricePoint> priceSeries,
        String analyzedAt,
        java.util.List<String> retrievedContext
) {
    public record PricePoint(
            String date,
            double close
    ) {
    }
}