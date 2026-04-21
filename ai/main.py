import uvicorn
from fastapi import FastAPI, HTTPException
import yfinance as yf
import pandas as pd
import requests
import re

app = FastAPI()

# Ollama API 설정 (로컬에 실행 중인 Ollama 주소)
OLLAMA_API = "http://localhost:11434/api/generate"

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
        average_price = df['Close'].mean()
        max_price = df['High'].max()
        currency = stock.info.get('currency', 'Unknown')  # 통화 단위 (KRW, USD 등)

        # --- 3. LLM 프롬프트 작성 (Decision 추출 최적화) ---
        prompt = f"""
        당신은 금융 분석 전문가입니다. {ticker} 종목에 대해 분석하세요.
        - 현재가: {current_price:.2f} ({currency})
        - 한 달 평균가: {average_price:.2f} ({currency})
        - 최고가: {max_price:.2f} ({currency})
        
        [지시사항]
        1. 시장 분위기와 투자 전략을 한국어 3문장 이내로 요약하세요.
        2. 마지막 줄에 반드시 '결정: [등급]' 형식으로 적으세요. 
        3. [등급]은 반드시 다음 중 하나만 선택하세요: STRONG_BUY, BUY, HOLD, SELL, STRONG_SELL

        요약:
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

        # --- 5. 분석 등급(Decision) 추출 로직 ---
        decision = "HOLD"  # 기본값
        choices = ["STRONG_BUY", "BUY", "HOLD", "SELL", "STRONG_SELL"]
        
        # 대문자로 변환하여 해당 키워드가 있는지 확인
        upper_text = full_text.upper()
        for choice in choices:
            if choice in upper_text:
                decision = choice
                break
        
        # "결정:" 문자열 이후를 잘라내어 순수 요약문만 추출
        summary = full_text.split("결정:")[0].strip()

        return {
            "ticker": ticker,
            "currentPrice": round(float(current_price), 2),
            "currency": currency,
            "summary": summary,
            "decision": decision
        }
        
    except Exception as e:
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    # 서버 실행: python main.py
    uvicorn.run(app, host="0.0.0.0", port=8000)