package hyunjoon.org.stock_ai_backend.service;


import hyunjoon.org.stock_ai_backend.dto.StockAnalysisResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

@Service
@RequiredArgsConstructor
public class StockService {
    private final WebClient.Builder webClientBuilder;

    @Value("${ai.server.url}")
    private String aiServerUrl;

    public Mono<StockAnalysisResponse> getAnalysis(String ticker) {
        return webClientBuilder.build()
                .get()
                .uri(aiServerUrl + "/analyze?ticker=" + ticker)
                .retrieve()
                .bodyToMono(StockAnalysisResponse.class);
    }
}