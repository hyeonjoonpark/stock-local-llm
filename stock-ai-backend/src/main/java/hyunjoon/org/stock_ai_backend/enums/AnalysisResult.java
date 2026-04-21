package hyunjoon.org.stock_ai_backend.enums;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum AnalysisResult {
    STRONG_BUY("적극 매수"),
    BUY("매수"),
    HOLD("관망"),
    SELL("매도"),
    STRONG_SELL("적극 매도");

    private final String description;
}