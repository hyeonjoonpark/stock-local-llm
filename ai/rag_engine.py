from __future__ import annotations

from datetime import datetime, timezone
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
            f"[MARKET] ticker={ticker}\n"
            f"현재가={current_price:.2f}{currency}\n"
            f"평균가={average_price:.2f}{currency}\n"
            f"최고가={max_price:.2f}{currency}\n"
            f"등락률={change_rate:.2f}%\n"
            f"변동성={volatility:.2f}%\n"
            f"해석={ticker}는 평균가 대비 {'상회' if current_price >= average_price else '하회'} 구간입니다."
        )
        documents.append(
            (
                self._doc_id(ticker, market_snapshot),
                {"ticker": ticker, "type": "market", "createdAt": datetime.now(timezone.utc).isoformat()},
                market_snapshot,
            )
        )

        for item in news_items:
            title = str(item.get("title", "")).strip()
            summary = str(item.get("summary", "")).strip()
            publisher = str(item.get("publisher", "")).strip()
            if not title:
                continue

            news_doc = (
                f"[NEWS] 제목={title}\n"
                f"요약={summary}\n"
                f"출처={publisher}"
            )
            documents.append(
                (
                    self._doc_id(ticker, news_doc),
                    {"ticker": ticker, "type": "news", "createdAt": datetime.now(timezone.utc).isoformat()},
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
            filtered = [(meta, text) for _, meta, text in self._memory_store if meta.get("ticker") == ticker]
            if not filtered:
                return []
            market_docs = [text for meta, text in filtered if meta.get("type") == "market"][-1:]
            news_docs = [text for meta, text in filtered if meta.get("type") == "news"][-max(top_k - 1, 1):]
            return market_docs + news_docs
        result = self.collection.query(
            query_texts=[question],
            n_results=max(top_k * 2, 6),
            where={"ticker": ticker},
        )
        docs = result.get("documents", [])
        metadatas = result.get("metadatas", [])
        if not docs or not docs[0]:
            return []
        doc_list = [str(item) for item in docs[0]]
        metadata_list = metadatas[0] if metadatas and metadatas[0] else []

        market_docs: list[str] = []
        news_docs: list[str] = []
        for idx, doc in enumerate(doc_list):
            meta = metadata_list[idx] if idx < len(metadata_list) else {}
            if isinstance(meta, dict) and meta.get("type") == "market":
                market_docs.append(doc)
            elif isinstance(meta, dict) and meta.get("type") == "news":
                news_docs.append(doc)

        selected = market_docs[:1] + news_docs[: max(top_k - 1, 1)]
        if not selected:
            selected = doc_list[:top_k]
        return selected[:top_k]
