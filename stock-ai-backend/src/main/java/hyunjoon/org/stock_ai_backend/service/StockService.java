package hyunjoon.org.stock_ai_backend.service;

import hyunjoon.org.stock_ai_backend.dto.StockAnalysisResponse;
import hyunjoon.org.stock_ai_backend.enums.AnalysisResult;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.util.Map;
import java.util.List;
import java.util.ArrayList;
import java.util.Objects;
import java.util.concurrent.TimeoutException;

@Service
public class StockService {
    private static final String AI_BASE_URL = "http://localhost:8000";
    private final WebClient webClient;

    public StockService(WebClient.Builder webClientBuilder) {
        this.webClient = webClientBuilder.baseUrl(AI_BASE_URL).build();
    }

    public Mono<StockAnalysisResponse> getAnalysis(String ticker, String question, String period) {
        return webClient.get()
                .uri(uriBuilder -> uriBuilder
                        .path("/analyze")
                        .queryParam("ticker", ticker)
                        .queryParam("question", question)
                        .queryParam("period", period)
                        .build())
                .retrieve()
                .bodyToMono(Map.class)
                .map(this::toResponse)
                .onErrorMap(this::mapToStatusException);
    }

    private StockAnalysisResponse toResponse(Map<?, ?> payload) {
        String parsedTicker = Objects.toString(payload.get("ticker"), "");
        double currentPrice = toDouble(payload.get("currentPrice"));
        double changeRate = toDouble(payload.get("changeRate"));
        double volatility = toDouble(payload.get("volatility"));
        String currency = Objects.toString(payload.get("currency"), "USD");
        String summary = Objects.toString(payload.get("summary"), "");
        AnalysisResult decision = toDecision(payload.get("decision"));
        double confidence = normalizeConfidence(toDouble(payload.get("confidence")), decision);
        String riskLevel = toRiskLevel(payload.get("riskLevel"));
        List<String> keyFactors = toStringList(payload.get("keyFactors"));
        List<StockAnalysisResponse.PricePoint> priceSeries = toPriceSeries(payload.get("priceSeries"));
        String analyzedAt = Objects.toString(payload.get("analyzedAt"), "");
        List<String> retrievedContext = toStringList(payload.get("retrievedContext"));
        String period = Objects.toString(payload.get("period"), "1mo");
        List<StockAnalysisResponse.EvidenceItem> evidence = toEvidenceItems(payload.get("evidence"));
        List<StockAnalysisResponse.SourceItem> retrievedSources = toSourceItems(payload.get("retrievedSources"));
        List<StockAnalysisResponse.NewsItem> recentMonthNews = toNewsItems(payload.get("recentMonthNews"));

        return new StockAnalysisResponse(
                parsedTicker,
                currentPrice,
                changeRate,
                volatility,
                currency,
                summary,
                decision,
                confidence,
                riskLevel,
                keyFactors,
                priceSeries,
                analyzedAt,
                retrievedContext,
                period,
                evidence,
                retrievedSources,
                recentMonthNews
        );
    }

    private double toDouble(Object value) {
        if (value instanceof Number numberValue) {
            return numberValue.doubleValue();
        }
        return 0.0;
    }

    private AnalysisResult toDecision(Object value) {
        try {
            return AnalysisResult.valueOf(Objects.toString(value, "HOLD"));
        } catch (IllegalArgumentException ignored) {
            return AnalysisResult.HOLD;
        }
    }

    private double normalizeConfidence(double value, AnalysisResult decision) {
        double normalized = value;
        if (normalized < 0) {
            normalized = 0;
        }
        if (normalized > 1) {
            normalized = 1;
        }
        if (normalized == 0) {
            if (decision == AnalysisResult.STRONG_BUY || decision == AnalysisResult.STRONG_SELL) {
                return 0.72;
            }
            if (decision == AnalysisResult.BUY || decision == AnalysisResult.SELL) {
                return 0.67;
            }
            return 0.6;
        }
        return normalized;
    }

    private String toRiskLevel(Object value) {
        String risk = Objects.toString(value, "MID").toUpperCase();
        if (!risk.equals("LOW") && !risk.equals("MID") && !risk.equals("HIGH")) {
            return "MID";
        }
        return risk;
    }

    private List<String> toStringList(Object value) {
        if (!(value instanceof List<?> items)) {
            return List.of();
        }
        List<String> result = new ArrayList<>();
        for (Object item : items) {
            String text = Objects.toString(item, "").trim();
            if (!text.isEmpty()) {
                result.add(text);
            }
        }
        return result;
    }

    private List<StockAnalysisResponse.PricePoint> toPriceSeries(Object value) {
        if (!(value instanceof List<?> items)) {
            return List.of();
        }
        List<StockAnalysisResponse.PricePoint> result = new ArrayList<>();
        for (Object item : items) {
            if (item instanceof Map<?, ?> map) {
                String date = Objects.toString(map.get("date"), "");
                double close = toDouble(map.get("close"));
                if (!date.isBlank()) {
                    result.add(new StockAnalysisResponse.PricePoint(date, close));
                }
            }
        }
        return result;
    }

    private List<StockAnalysisResponse.SourceItem> toSourceItems(Object value) {
        if (!(value instanceof List<?> items)) {
            return List.of();
        }
        List<StockAnalysisResponse.SourceItem> result = new ArrayList<>();
        for (Object item : items) {
            if (item instanceof Map<?, ?> map) {
                String title = Objects.toString(map.get("title"), "").trim();
                String publisher = Objects.toString(map.get("publisher"), "").trim();
                String url = Objects.toString(map.get("url"), "").trim();
                String publishedAt = Objects.toString(map.get("publishedAt"), "").trim();
                if (!title.isEmpty()) {
                    result.add(new StockAnalysisResponse.SourceItem(title, publisher, url, publishedAt));
                }
            }
        }
        return result;
    }

    private List<StockAnalysisResponse.NewsItem> toNewsItems(Object value) {
        if (!(value instanceof List<?> items)) {
            return List.of();
        }
        List<StockAnalysisResponse.NewsItem> result = new ArrayList<>();
        for (Object item : items) {
            if (item instanceof Map<?, ?> map) {
                String title = Objects.toString(map.get("title"), "").trim();
                String publisher = Objects.toString(map.get("publisher"), "").trim();
                String url = Objects.toString(map.get("url"), "").trim();
                String summary = Objects.toString(map.get("summary"), "").trim();
                String publishedAt = Objects.toString(map.get("publishedAt"), "").trim();
                if (!title.isEmpty()) {
                    result.add(new StockAnalysisResponse.NewsItem(title, publisher, url, summary, publishedAt));
                }
            }
        }
        return result;
    }

    private List<StockAnalysisResponse.EvidenceItem> toEvidenceItems(Object value) {
        if (!(value instanceof List<?> items)) {
            return List.of();
        }
        List<StockAnalysisResponse.EvidenceItem> result = new ArrayList<>();
        for (Object item : items) {
            if (item instanceof Map<?, ?> map) {
                String type = Objects.toString(map.get("type"), "MARKET").trim();
                String summary = Objects.toString(map.get("summary"), "").trim();
                String metric = Objects.toString(map.get("metric"), "").trim();
                String sourceTitle = Objects.toString(map.get("sourceTitle"), "").trim();
                String sourceUrl = Objects.toString(map.get("sourceUrl"), "").trim();
                if (!summary.isEmpty()) {
                    result.add(new StockAnalysisResponse.EvidenceItem(type, summary, metric, sourceTitle, sourceUrl));
                }
            }
        }
        return result;
    }

    private Throwable mapToStatusException(Throwable throwable) {
        if (throwable instanceof ResponseStatusException) {
            return throwable;
        }
        if (throwable instanceof TimeoutException) {
            return new ResponseStatusException(
                    HttpStatus.GATEWAY_TIMEOUT,
                    "AI 분석 요청 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.",
                    throwable
            );
        }
        return new ResponseStatusException(
                HttpStatus.SERVICE_UNAVAILABLE,
                "AI 분석 서버에 연결할 수 없습니다. AI 서버 실행 상태를 확인해주세요.",
                throwable
        );
    }
}
