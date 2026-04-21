package hyunjoon.org.stock_ai_backend.controller;

import hyunjoon.org.stock_ai_backend.dto.StockAnalysisResponse;
import hyunjoon.org.stock_ai_backend.service.StockService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Mono;

@RestController
@RequestMapping("/api/stocks")
@RequiredArgsConstructor
public class StockController {
    private final StockService stockService;

    @GetMapping("/analyze/{ticker}")
    public Mono<StockAnalysisResponse> analyze(@PathVariable String ticker) {
        return stockService.getAnalysis(ticker);
    }
}