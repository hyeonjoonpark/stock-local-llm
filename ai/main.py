import uvicorn
from fastapi import FastAPI, HTTPException
import yfinance as yf
import requests
import re
import json
from datetime import datetime, timezone
from rag_engine import StockRAGEngine

app = FastAPI()
rag_engine = StockRAGEngine()

# Ollama API 설정 (로컬에 실행 중인 Ollama 주소)
OLLAMA_API = "http://localhost:11434/api/generate"

KOREAN_TICKER_MAP = {
    "테슬라": "TSLA",
    "애플": "AAPL",
    "엔비디아": "NVDA",
    "마이크로소프트": "MSFT",
    "구글": "GOOGL",
    "알파벳": "GOOGL",
    "아마존": "AMZN",
    "메타": "META",
    "삼성전자": "005930",
    "sk하이닉스": "000660",
    "하이닉스": "000660",
    "현대차": "005380",
    "네이버": "035420",
    "카카오": "035720",
}


def parse_investor_context(question: str) -> dict:
    parsed = {
        "quantity": None,
        "avg_price": None,
    }

    quantity_match = re.search(r"(\d+(?:\.\d+)?)\s*주", question)
    if quantity_match:
        try:
            parsed["quantity"] = float(quantity_match.group(1))
        except ValueError:
            parsed["quantity"] = None

    avg_price_patterns = [
        r"평단\s*(\d+(?:\.\d+)?)",
        r"개당\s*(\d+(?:\.\d+)?)",
        r"(\d+(?:\.\d+)?)\s*(?:달러|원)\s*에\s*샀",
        r"(\d+(?:\.\d+)?)\s*(?:달러|원)\s*매수",
    ]
    for pattern in avg_price_patterns:
        match = re.search(pattern, question)
        if match:
            try:
                parsed["avg_price"] = float(match.group(1))
                break
            except ValueError:
                continue

    return parsed


def heuristic_decision(change_rate: float, volatility: float) -> str:
    if change_rate >= 3:
        return "STRONG_BUY"
    if change_rate >= 1:
        return "BUY"
    if change_rate <= -3:
        return "STRONG_SELL"
    if change_rate <= -1:
        return "SELL"
    if volatility >= 3:
        return "HOLD"
    return "HOLD"


def heuristic_risk(volatility: float) -> str:
    if volatility >= 3:
        return "HIGH"
    if volatility >= 1.5:
        return "MID"
    return "LOW"


def normalize_ticker_input(raw_ticker: str) -> str:
    cleaned = raw_ticker.strip()
    if not cleaned:
        return cleaned

    lower_cleaned = cleaned.lower()
    if lower_cleaned in KOREAN_TICKER_MAP:
        return KOREAN_TICKER_MAP[lower_cleaned]

    if cleaned in KOREAN_TICKER_MAP:
        return KOREAN_TICKER_MAP[cleaned]

    return cleaned.upper()

@app.get("/analyze")
def analyze_stock(ticker: str, question: str = "", period: str = "1mo"):
    try:
        # --- 1. 한국 주식 처리 로직 (숫자 6자리 입력 시 처리) ---
        original_ticker = ticker
        ticker = normalize_ticker_input(ticker)
        if ticker.isdigit() and len(ticker) == 6:
            ticker = f"{ticker}.KS"  # 기본적으로 코스피(.KS)로 설정

        # --- 2. 주가 데이터 수집 ---
        period_map = {
            "1w": "5d",
            "1mo": "1mo",
            "3mo": "3mo",
            "1y": "1y",
        }
        normalized_period = period.lower()
        if normalized_period not in period_map:
            normalized_period = "1mo"

        stock = yf.Ticker(ticker)
        df = stock.history(period=period_map[normalized_period])

        # 데이터가 비어있다면 코스닥(.KQ)으로 다시 시도
        if df.empty and ".KS" in ticker:
            ticker = ticker.replace(".KS", ".KQ")
            stock = yf.Ticker(ticker)
            df = stock.history(period=period_map[normalized_period])

        if df.empty:
            raise HTTPException(status_code=404, detail=f"'{original_ticker}'에 해당하는 주식 데이터를 찾을 수 없습니다.")

        # 주요 지표 계산
        current_price = df['Close'].iloc[-1]
        start_price = df['Close'].iloc[0]
        average_price = df['Close'].mean()
        max_price = df['High'].max()
        change_rate = ((current_price - start_price) / start_price) * 100 if start_price else 0
        volatility = df['Close'].pct_change().dropna().std() * 100 if len(df) > 1 else 0
        currency = stock.info.get('currency', 'Unknown')  # 통화 단위 (KRW, USD 등)
        analyzed_at = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")

        # 차트 표시용 시계열 (최근 20개)
        price_series = [
            {
                "date": index.strftime("%m/%d"),
                "close": round(float(row["Close"]), 2),
            }
            for index, row in df.tail(20).iterrows()
        ]

        # --- 3. 뉴스 수집 + RAG 인덱싱 ---
        raw_news = stock.news if hasattr(stock, "news") else []
        now_utc = datetime.now(timezone.utc)
        one_month_seconds = 30 * 24 * 60 * 60
        news_items = []
        recent_month_news = []
        for item in raw_news[:8]:
            publish_ts = item.get("providerPublishTime")
            published_at = ""
            is_recent_month = False
            if isinstance(publish_ts, (int, float)):
                published_dt = datetime.fromtimestamp(publish_ts, tz=timezone.utc)
                published_at = published_dt.isoformat().replace("+00:00", "Z")
                is_recent_month = (now_utc - published_dt).total_seconds() <= one_month_seconds

            news_items.append(
                {
                    "title": item.get("title", ""),
                    "summary": item.get("summary", "") or item.get("link", ""),
                    "publisher": item.get("publisher", ""),
                    "link": item.get("link", ""),
                    "publishedAt": published_at,
                }
            )
            if is_recent_month:
                recent_month_news.append(
                    {
                        "title": str(item.get("title", "")).strip(),
                        "publisher": str(item.get("publisher", "")).strip(),
                        "url": str(item.get("link", "")).strip(),
                        "summary": str(item.get("summary", "")).strip(),
                        "publishedAt": published_at,
                    }
                )

        rag_docs = rag_engine.build_documents(
            ticker=ticker,
            currency=currency,
            current_price=float(current_price),
            average_price=float(average_price),
            max_price=float(max_price),
            change_rate=float(change_rate),
            volatility=float(volatility),
            news_items=news_items,
        )
        rag_engine.upsert_documents(rag_docs)

        user_question = question.strip() or f"{ticker} 최근 투자 전망 어때?"
        investor_context = parse_investor_context(user_question)
        quantity = investor_context["quantity"]
        avg_price_input = investor_context["avg_price"]

        personal_context_text = "질문에서 보유 수량/평단 정보가 명시되지 않았습니다."
        personal_metrics = []
        if quantity and avg_price_input:
            unrealized_pnl = (float(current_price) - float(avg_price_input)) * float(quantity)
            pnl_rate = ((float(current_price) - float(avg_price_input)) / float(avg_price_input) * 100) if avg_price_input else 0
            position_value = float(current_price) * float(quantity)
            personal_context_text = (
                f"보유수량 {quantity:.0f}주, 평단 {avg_price_input:.2f}{currency}, "
                f"현재가 기준 평가금액 {position_value:.2f}{currency}, "
                f"미실현손익 {unrealized_pnl:.2f}{currency} ({pnl_rate:.2f}%)."
            )
            personal_metrics = [
                f"보유수량 {quantity:.0f}주",
                f"평단 {avg_price_input:.2f}{currency}",
                f"미실현손익 {unrealized_pnl:.2f}{currency} ({pnl_rate:.2f}%)",
            ]

        retrieved_context_list = rag_engine.retrieve_context(
            ticker=ticker,
            question=user_question,
            top_k=5,
        )
        retrieved_context = "\n\n".join(retrieved_context_list) if retrieved_context_list else "검색된 참조 데이터 없음"

        # --- 4. LLM 프롬프트 작성 (RAG 컨텍스트 기반) ---
        prompt = f"""
        당신은 금융 분석 전문가입니다. 아래는 {ticker} 종목의 최신 데이터와 검색된 참조 문서입니다.

        [사용자 질문]
        {user_question}

        [개인 보유 포지션 정보]
        {personal_context_text}

        [최신 시장 지표]
        - 현재가: {current_price:.2f} ({currency})
        - 한 달 평균가: {average_price:.2f} ({currency})
        - 최고가: {max_price:.2f} ({currency})
        - 등락률: {change_rate:.2f}%
        - 변동성: {volatility:.2f}%

        [RAG 검색 컨텍스트]
        {retrieved_context}
        
        [지시사항]
        1. 반드시 JSON만 출력하세요. JSON 이외 텍스트는 절대 출력하지 마세요.
        2. 아래 스키마를 정확히 지키세요.
        {{
          "summary": "한국어 2~3문장 요약",
          "decision": "STRONG_BUY|BUY|HOLD|SELL|STRONG_SELL 중 하나",
          "confidence": 0.0~1.0 사이 숫자,
          "riskLevel": "LOW|MID|HIGH 중 하나",
          "keyFactors": ["핵심 근거 1", "핵심 근거 2", "핵심 근거 3"],
          "evidence": [
            {{
              "type": "MARKET|NEWS",
              "summary": "근거 설명",
              "metric": "수치 근거",
              "sourceTitle": "근거 제목",
              "sourceUrl": "https://..."
            }}
          ]
        }}
        """

        # --- 5. Ollama(LLM) 호출 ---
        response = requests.post(OLLAMA_API, json={
            "model": "llama3.1",
            "prompt": prompt,
            "stream": False
        })
        
        if response.status_code != 200:
            raise Exception("Ollama 서버 응답 에러")

        full_text = response.json().get("response", "")

        # --- 6. JSON 파싱 및 후처리 ---
        parsed = {}
        json_match = re.search(r"\{[\s\S]*\}", full_text)
        if json_match:
            try:
                parsed = json.loads(json_match.group(0))
            except json.JSONDecodeError:
                parsed = {}

        summary = str(parsed.get("summary", "")).strip()
        decision = str(parsed.get("decision", "")).upper()
        confidence = float(parsed.get("confidence", 0.0)) if str(parsed.get("confidence", "")).strip() else 0.0
        risk_level = str(parsed.get("riskLevel", "")).upper()
        key_factors = parsed.get("keyFactors", [])
        evidence_items = parsed.get("evidence", [])

        # JSON 파싱 실패 시 텍스트 기반 fallback
        if not summary:
            summary = full_text.strip()

        if decision not in ["STRONG_BUY", "BUY", "HOLD", "SELL", "STRONG_SELL"]:
            decision = heuristic_decision(change_rate, volatility)
        if risk_level not in ["LOW", "MID", "HIGH"]:
            risk_level = heuristic_risk(volatility)
        confidence = max(0.0, min(1.0, confidence))
        if confidence == 0.0:
            confidence = 0.72 if decision in ["STRONG_BUY", "STRONG_SELL"] else 0.64

        if not isinstance(key_factors, list):
            key_factors = []
        key_factors = [str(item).strip() for item in key_factors if str(item).strip()][:3]
        if not isinstance(evidence_items, list):
            evidence_items = []

        # 잔여 결정 라인/고아 번호 정리
        summary = re.sub(r"(?im)^\s*결정\s*:\s*(STRONG_BUY|BUY|HOLD|SELL|STRONG_SELL)\s*$", "", summary).strip()
        summary = re.sub(r"\n?\s*\d+\.\s*$", "", summary).strip()

        # 프롬프트/지시문이 섞여 나온 경우 요약문 재생성
        if (
            "[지시사항]" in summary
            or "JSON만 출력" in summary
            or "마지막 줄 단독으로 반드시" in summary
        ):
            direction = "상승" if change_rate > 0 else "하락" if change_rate < 0 else "횡보"
            summary = (
                f"{ticker}는 최근 한 달 기준 {direction} 흐름을 보이며 현재가는 {current_price:.2f}{currency}입니다. "
                f"한 달 평균가({average_price:.2f}{currency}) 대비 "
                f"{'높은' if current_price >= average_price else '낮은'} 수준이고, "
                f"변동성은 {volatility:.2f}%로 {heuristic_risk(volatility).lower()} 리스크 구간입니다."
            )

        if not key_factors:
            key_factors = [
                f"한 달 등락률 {change_rate:.2f}%",
                f"변동성 {volatility:.2f}%",
                f"현재가 {current_price:.2f}{currency}, 평균가 {average_price:.2f}{currency}",
            ]

        normalized_evidence = []
        for item in evidence_items:
            if not isinstance(item, dict):
                continue
            ev_type = str(item.get("type", "MARKET")).upper()
            if ev_type not in ["MARKET", "NEWS"]:
                ev_type = "MARKET"
            ev_summary = str(item.get("summary", "")).strip()
            ev_metric = str(item.get("metric", "")).strip()
            if ev_metric.upper() == "NONE":
                ev_metric = ""
            ev_source_title = str(item.get("sourceTitle", "")).strip()
            ev_source_url = str(item.get("sourceUrl", "")).strip()
            if ev_summary:
                normalized_evidence.append(
                    {
                        "type": ev_type,
                        "summary": ev_summary,
                        "metric": ev_metric,
                        "sourceTitle": ev_source_title,
                        "sourceUrl": ev_source_url,
                    }
                )

        if not normalized_evidence:
            normalized_evidence = [
                {
                    "type": "MARKET",
                    "summary": f"{ticker}의 현재가는 평균가 대비 {'상회' if current_price >= average_price else '하회'} 상태입니다.",
                    "metric": f"현재가 {current_price:.2f}{currency} / 평균가 {average_price:.2f}{currency}",
                    "sourceTitle": "시장 스냅샷",
                    "sourceUrl": "",
                },
                {
                    "type": "MARKET",
                    "summary": "단기 변동성과 추세 지표를 기반으로 리스크를 산정했습니다.",
                    "metric": f"등락률 {change_rate:.2f}% / 변동성 {volatility:.2f}%",
                    "sourceTitle": "시장 스냅샷",
                    "sourceUrl": "",
                },
            ]

            if news_items:
                normalized_evidence.append(
                    {
                        "type": "NEWS",
                        "summary": str(news_items[0].get("summary", "")).strip() or "최근 뉴스 헤드라인을 참조했습니다.",
                        "metric": "",
                        "sourceTitle": str(news_items[0].get("title", "")).strip(),
                        "sourceUrl": str(news_items[0].get("link", "")).strip(),
                    }
                )

        if personal_metrics:
            normalized_evidence.insert(
                0,
                {
                    "type": "MARKET",
                    "summary": "질문에 포함된 보유 포지션(수량/평단)을 현재가 기준으로 계산해 반영했습니다.",
                    "metric": " | ".join(personal_metrics),
                    "sourceTitle": "질문 기반 포지션 계산",
                    "sourceUrl": "",
                },
            )

        return {
            "ticker": ticker,
            "currentPrice": round(float(current_price), 2),
            "changeRate": round(float(change_rate), 2),
            "volatility": round(float(volatility), 2),
            "currency": currency,
            "summary": summary,
            "decision": decision,
            "confidence": round(confidence, 2),
            "riskLevel": risk_level,
            "keyFactors": key_factors,
            "priceSeries": price_series,
            "analyzedAt": analyzed_at,
            "retrievedContext": retrieved_context_list[:3],
            "period": normalized_period,
            "evidence": normalized_evidence[:4],
            "retrievedSources": [
                {
                    "title": str(item.get("title", "")).strip(),
                    "publisher": str(item.get("publisher", "")).strip(),
                    "url": str(item.get("link", "")).strip(),
                    "publishedAt": str(item.get("publishedAt", "")).strip(),
                }
                for item in news_items[:3]
                if str(item.get("title", "")).strip()
            ],
            "recentMonthNews": recent_month_news[:6],
        }
        
    except Exception as e:
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    # 서버 실행: python main.py
    uvicorn.run(app, host="0.0.0.0", port=8000)