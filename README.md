📈 Stock AI: Local LLM-Powered Analysis System
로컬 GPU(AMD Radeon RX 9060XT 16GB)를 활용하여 실시간 주가 데이터와 로컬 LLM(Llama 3.1)을 결합한 지능형 주식 분석 대시보드 프로젝트입니다.

🏗️ Project Architecture
이 프로젝트는 **MSA(Microservices Architecture)**를 지향하며 세 개의 독립적인 레이어로 구성되어 있습니다.

AI Engine (FastAPI): yfinance를 통해 수집된 실시간 데이터를 Pandas로 전처리하고, Ollama를 통해 Llama 3.1 모델로 주가 분석을 수행합니다.

Backend (Spring Boot): AI 서버와 프론트엔드 사이의 브릿지 역할을 하며, 분석 데이터의 가공 및 향후 MySQL을 통한 데이터 영속성을 담당합니다.

Frontend (Next.js): App Router와 Tailwind CSS를 사용하여 사용자에게 직관적인 분석 리포트와 차트를 제공합니다.

🛠️ Tech Stack
AI Engine
Language: Python 3.14+

Framework: FastAPI, Uvicorn

Data: Pandas, NumPy, yfinance

LLM: Ollama (Model: Llama 3.1)

Backend
Language: Java 21

Framework: Spring Boot 3.3.x

Communication: Spring WebFlux (WebClient)

Database: MySQL, Spring Data JPA

Tools: Lombok, Validation

Frontend
Framework: Next.js 14+ (App Router)

Language: TypeScript

Styling: Tailwind CSS

Directory Structure: src/ directory based

📂 Directory Structure
Plaintext
stock-ai/
├── ai/                     # Python AI Engine
│   └── main.py             # FastAPI & LLM Inference logic
├── stock-ai-backend/       # Java Spring Boot API Server
│   └── src/main/java/...   # Controller, Service, DTO
└── stock-ai-frontend/      # Next.js Web Dashboard
    └── src/                # App Router & Components
🚀 Getting Started
1. AI Engine (Python)
PowerShell
cd ai
# 라이브러리 설치
pip install pandas numpy yfinance fastapi uvicorn requests
# 서버 실행
python main.py
2. Backend (Spring Boot)
application.yml 또는 properties에서 MySQL 및 AI 서버 주소(http://localhost:8000)를 설정합니다.

IDE(IntelliJ 등)에서 프로젝트를 실행합니다.

3. Frontend (Next.js)
PowerShell
cd stock-ai-frontend
# 패키지 설치
npm install
# 개발 서버 실행
npm run dev
📝 Key Features
Real-time Ingestion: yfinance를 통한 종목별 최근 1개월 시세 데이터 자동 수집.

Local LLM Inference: 외부 API 비용 없이 RX 9060XT GPU를 사용하여 로컬에서 보안성이 뛰어난 주식 분석 수행.

Unified Dashboard: Next.js를 통한 반응형 웹 UI 제공.

👤 Author
박현준 (Park Hyeon-jun)

Gachon University, Future Automotive Engineering

Skills: C++, Java, Spring Boot, Next.js, SQLD
