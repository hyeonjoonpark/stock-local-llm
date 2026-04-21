export type Decision = "STRONG_BUY" | "BUY" | "HOLD" | "SELL" | "STRONG_SELL";

export interface StockAnalysisResponse {
  ticker: string;
  currentPrice: number;
  changeRate: number;
  volatility: number;
  currency: string;
  summary: string;
  decision: Decision;
  confidence: number;
  riskLevel: "LOW" | "MID" | "HIGH";
  keyFactors: string[];
  priceSeries: PricePoint[];
  analyzedAt: string;
  retrievedContext: string[];
}

export interface PricePoint {
  date: string;
  close: number;
}
