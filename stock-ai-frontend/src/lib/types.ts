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
  period: "1w" | "1mo" | "3mo" | "1y";
  evidence: EvidenceItem[];
  retrievedSources: SourceItem[];
  recentMonthNews: NewsItem[];
}

export interface PricePoint {
  date: string;
  close: number;
}

export interface SourceItem {
  title: string;
  publisher: string;
  url: string;
  publishedAt: string;
}

export interface NewsItem {
  title: string;
  publisher: string;
  url: string;
  summary: string;
  publishedAt: string;
}

export interface EvidenceItem {
  type: "MARKET" | "NEWS";
  summary: string;
  metric: string;
  sourceTitle: string;
  sourceUrl: string;
}
