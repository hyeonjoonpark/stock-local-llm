import uvicorn
from fastapi import FastAPI, HTTPException
import yfinance as yf
import pandas as pd
import requests

app = FastAPI()

# Ollama 로컬 서버 주소 (llama3.1 사용)
OLLAMA_API = "http://localhost:11434/api/generate"

@app.get("/analyze")
def analyze_stock(ticker: str):
    try:
        # 1. 주가 데이터 수집 (최근 1개월)
        stock = yf.Ticker(ticker)
        df = stock.history(period="1mo")
        
        if df.empty:
            raise HTTPException(status_code=404, detail="Ticker를 찾을 수 없습니다.")

        # 2. 분석 지표 계산 (Pandas/NumPy)
        current_price = df['Close'].iloc[-1]
        average_price = df['Close'].mean()
        max_price = df['High'].max()
        
        # 3. LLM 프롬프트 작성
        prompt = f"""
        당신은 금융 분석 전문가입니다. {ticker} 종목에 대해 분석하세요.
        - 현재가: {current_price:.2f}
        - 한 달 평균가: {average_price:.2f}
        - 최고가: {max_price:.2f}
        
        위 수치들을 바탕으로 시장 분위기와 대응 전략을 한국어 3문장 이내로 요약하세요.
        """

        # 4. Ollama 호출
        response = requests.post(OLLAMA_API, json={
            "model": "llama3.1",
            "prompt": prompt,
            "stream": False
        })
        
        return {
            "ticker": ticker,
            "currentPrice": round(current_price, 2),
            "summary": response.json().get("response")
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)