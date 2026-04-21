from __future__ import annotations

from datetime import datetime
from typing import Any
import hashlib

try:
    import chromadb
except ImportError:  # pragma: no cover
    chromadb = None


class StockRAGEngine:
    def __init__(self, persist_dir: str = "./rag_store") -> None:
        self._memory_store: list[tuple[str, dict[str, Any], str]] = []
        if chromadb is None:
            self.client = None
            self.collection = None
            return
        self.client = chromadb.PersistentClient(path=persist_dir)
        self.collection = self.client.get_or_create_collection(name="stock_context")

    @staticmethod
    def _doc_id(ticker: str, text: str) -> str:
        digest = hashlib.sha256(f"{ticker}:{text}".encode("utf-8")).hexdigest()
        return digest

    def build_documents(
        self,
        ticker: str,
        currency: str,
        current_price: float,
        average_price: float,
        max_price: float,
        change_rate: float,
        volatility: float,
        news_items: list[dict[str, Any]],
    ) -> list[tuple[str, dict[str, Any], str]]:
        documents: list[tuple[str, dict[str, Any], str]] = []

        market_snapshot = (
            f"{ticker} 현재가 {current_price:.2f}{currency}, "
            f"1개월 평균가 {average_price:.2f}{currency}, "
            f"1개월 최고가 {max_price:.2f}{currency}, "
            f"1개월 등락률 {change_rate:.2f}%, 변동성 {volatility:.2f}%."
        )
        documents.append(
            (
                self._doc_id(ticker, market_snapshot),
                {"ticker": ticker, "type": "market", "createdAt": datetime.utcnow().isoformat()},
                market_snapshot,
            )
        )

        for item in news_items:
            title = str(item.get("title", "")).strip()
            summary = str(item.get("summary", "")).strip()
            publisher = str(item.get("publisher", "")).strip()
            if not title:
                continue

            news_doc = f"[뉴스] {title}\n요약: {summary}\n출처: {publisher}"
            documents.append(
                (
                    self._doc_id(ticker, news_doc),
                    {"ticker": ticker, "type": "news", "createdAt": datetime.utcnow().isoformat()},
                    news_doc,
                )
            )

        return documents

    def upsert_documents(self, docs: list[tuple[str, dict[str, Any], str]]) -> None:
        if not docs:
            return
        if self.collection is None:
            self._memory_store.extend(docs)
            self._memory_store = self._memory_store[-200:]
            return
        ids = [doc_id for doc_id, _, _ in docs]
        metadatas = [metadata for _, metadata, _ in docs]
        documents = [text for _, _, text in docs]
        self.collection.upsert(ids=ids, metadatas=metadatas, documents=documents)

    def retrieve_context(self, ticker: str, question: str, top_k: int = 5) -> list[str]:
        if self.collection is None:
            filtered = [text for _, meta, text in self._memory_store if meta.get("ticker") == ticker]
            return filtered[-top_k:] if filtered else []
        result = self.collection.query(
            query_texts=[question],
            n_results=top_k,
            where={"ticker": ticker},
        )
        docs = result.get("documents", [])
        if not docs or not docs[0]:
            return []
        return [str(item) for item in docs[0]]
