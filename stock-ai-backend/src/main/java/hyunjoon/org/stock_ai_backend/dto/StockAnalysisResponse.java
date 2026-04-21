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
        java.util.List<String> retrievedContext,
        String period,
        java.util.List<EvidenceItem> evidence,
        java.util.List<SourceItem> retrievedSources,
        java.util.List<NewsItem> recentMonthNews
) {
    public record PricePoint(
            String date,
            double close
    ) {
    }

    public record SourceItem(
            String title,
            String publisher,
            String url,
            String publishedAt
    ) {
    }

    public record NewsItem(
            String title,
            String publisher,
            String url,
            String summary,
            String publishedAt
    ) {
    }

    public record EvidenceItem(
            String type,
            String summary,
            String metric,
            String sourceTitle,
            String sourceUrl
    ) {
    }
}