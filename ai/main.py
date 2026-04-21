import uvicorn
from fastapi import FastAPI, HTTPException
import yfinance as yf
import requests
import re
import json
from datetime import datetime

app = FastAPI()

# Ollama API 설정 (로컬에 실행 중인 Ollama 주소)
OLLAMA_API = "http://localhost:11434/api/generate"


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

@app.get("/analyze")
def analyze_stock(ticker: str):
    try:
        # --- 1. 한국 주식 처리 로직 (숫자 6자리 입력 시 처리) ---
        original_ticker = ticker
        if ticker.isdigit() and len(ticker) == 6:
            ticker = f"{ticker}.KS"  # 기본적으로 코스피(.KS)로 설정

        # --- 2. 주가 데이터 수집 ---
        stock = yf.Ticker(ticker)
        df = stock.history(period="1mo")

        # 데이터가 비어있다면 코스닥(.KQ)으로 다시 시도
        if df.empty and ".KS" in ticker:
            ticker = ticker.replace(".KS", ".KQ")
            stock = yf.Ticker(ticker)
            df = stock.history(period="1mo")

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
        analyzed_at = datetime.utcnow().isoformat() + "Z"

        # 차트 표시용 시계열 (최근 20개)
        price_series = [
            {
                "date": index.strftime("%m/%d"),
                "close": round(float(row["Close"]), 2),
            }
            for index, row in df.tail(20).iterrows()
        ]

        # --- 3. LLM 프롬프트 작성 (Decision 추출 최적화) ---
        prompt = f"""
        당신은 금융 분석 전문가입니다. {ticker} 종목에 대해 분석하세요.
        - 현재가: {current_price:.2f} ({currency})
        - 한 달 평균가: {average_price:.2f} ({currency})
        - 최고가: {max_price:.2f} ({currency})
        
        [지시사항]
        1. 반드시 JSON만 출력하세요. JSON 이외 텍스트는 절대 출력하지 마세요.
        2. 아래 스키마를 정확히 지키세요.
        {{
          "summary": "한국어 2~3문장 요약",
          "decision": "STRONG_BUY|BUY|HOLD|SELL|STRONG_SELL 중 하나",
          "confidence": 0.0~1.0 사이 숫자,
          "riskLevel": "LOW|MID|HIGH 중 하나",
          "keyFactors": ["핵심 근거 1", "핵심 근거 2", "핵심 근거 3"]
        }}
        """

        # --- 4. Ollama(LLM) 호출 ---
        response = requests.post(OLLAMA_API, json={
            "model": "llama3.1",
            "prompt": prompt,
            "stream": False
        })
        
        if response.status_code != 200:
            raise Exception("Ollama 서버 응답 에러")

        full_text = response.json().get("response", "")

        # --- 5. JSON 파싱 및 후처리 ---
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
        }
        
    except Exception as e:
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    # 서버 실행: python main.py
    uvicorn.run(app, host="0.0.0.0", port=8000)