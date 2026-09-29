import os
import json
from dataclasses import dataclass
from typing import Optional, List
from dotenv import load_dotenv

from src.ingest.models import ChunkRecord
from src.embedding.embedder import load_vector_index

load_dotenv()

@dataclass
class RetrievedContext:
    chunks: List[ChunkRecord]
    scores: List[float]
    is_cross_document: bool
    documents_searched: List[str]
    filter_applied: Optional[str]

def _get_all_document_names() -> List[str]:
    try:
        with open("data/corpus_index.json", "r", encoding="utf-8") as f:
            docs = json.load(f)
            return [d["document_name"] for d in docs]
    except Exception:
        return []

def retrieve(query: str, filter_doc: Optional[str] = None, top_k: int = 5) -> RetrievedContext:
    collection = load_vector_index()
    
    where_clause = None
    if filter_doc:
        where_clause = {"document_name": filter_doc}
        
    results = collection.query(
        query_texts=[query],
        n_results=top_k,
        where=where_clause
    )
    
    chunks = []
    scores = []
    
    documents_searched = [filter_doc] if filter_doc else _get_all_document_names()
    
    if not results["ids"] or len(results["ids"][0]) == 0:
        return RetrievedContext(
            chunks=[],
            scores=[],
            is_cross_document=False,
            documents_searched=documents_searched,
            filter_applied=filter_doc
        )
        
    for i in range(len(results["ids"][0])):
        chunk_id = results["ids"][0][i]
        text = results["documents"][0][i]
        meta = results["metadatas"][0][i]
        distance = results["distances"][0][i]
        
        # Convert cosine distance to similarity score
        score = 1.0 - distance
        
        record = ChunkRecord(
            chunk_id=chunk_id,
            document_id=meta.get("document_id", ""),
            chunk_type=meta.get("chunk_type", ""),
            text=text,
            section_heading=meta.get("section_heading", ""),
            token_count=len(text.split()),
            document_name=meta.get("document_name", ""),
            publisher=meta.get("publisher", ""),
            year=meta.get("year", 0),
            source_url=meta.get("source_url", ""),
            page_number=meta.get("page_number") if meta.get("page_number") != -1 else None
        )
        
        chunks.append(record)
        scores.append(score)
        
    doc_names = set(c.document_name for c in chunks if c.document_name)
    is_cross = len(doc_names) >= 2
    
    return RetrievedContext(
        chunks=chunks,
        scores=scores,
        is_cross_document=is_cross,
        documents_searched=documents_searched,
        filter_applied=filter_doc
    )

def is_relevant(context: RetrievedContext) -> bool:
    if not context.scores:
        return False
    threshold = float(os.getenv("SCORE_THRESHOLD", "0.55"))
    return max(context.scores) >= threshold
