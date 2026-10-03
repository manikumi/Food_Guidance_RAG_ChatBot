from dataclasses import dataclass, field
from typing import List, Optional, Dict
from src.generation.classifier import classify_query
from src.generation.refusal_handler import build_oos_response, build_nic_response
from src.retrieval.retriever import retrieve, is_relevant
from src.generation.generator import generate_answer
from src.generation.citation_builder import parse_ref_markers, build_citations, format_response, CitationRecord


@dataclass
class ChatResponse:
    answer: str
    citations: List[CitationRecord]
    refusal_mode: Optional[str]
    documents_used: List[str]
    is_cross_document: bool


def run_query(
    query: str,
    filter_doc: Optional[str] = None,
    chat_history: Optional[List[Dict[str, str]]] = None
) -> ChatResponse:
    """
    Execute the full RAG pipeline for a single query.

    Args:
        query: The user's current question.
        filter_doc: Optional document name to scope retrieval.
        chat_history: Optional list of prior conversation turns for follow-up support.
            Each dict must have "role" ("user" | "assistant") and "content" keys.

    Returns:
        ChatResponse with the answer, citations, refusal mode, documents used, and
        cross-document flag.
    """
    print("Starting classification...")
    # 1. Classify
    classifier_result = classify_query(query)
    print("Classification done. Route:", classifier_result.route)

    # 2. Check OOS
    if classifier_result.route == "REFUSE_OOS":
        ans = build_oos_response(classifier_result.label)
        return ChatResponse(
            answer=ans,
            citations=[],
            refusal_mode="OOS",
            documents_used=[],
            is_cross_document=False
        )

    print("Starting retrieval...")
    # 3. Retrieve
    context = retrieve(query, filter_doc=filter_doc)
    print(f"Retrieval done. Found {len(context.chunks)} chunks.")

    # 4. Check NIC based on relevance score
    if not is_relevant(context):
        print("Not relevant. Returning NIC.")
        ans = build_nic_response(context.documents_searched)
        return ChatResponse(
            answer=ans,
            citations=[],
            refusal_mode="NIC",
            documents_used=[],
            is_cross_document=False
        )

    print("Starting generation...")
    # 5. Generate Answer (with optional chat history for follow-up awareness)
    raw = generate_answer(query, context, chat_history=chat_history)
    print("Generation done.")

    # 6. Check NIC based on LLM response
    if raw.strip() == "NOT_IN_CORPUS":
        ans = build_nic_response(context.documents_searched)
        return ChatResponse(
            answer=ans,
            citations=[],
            refusal_mode="NIC",
            documents_used=[],
            is_cross_document=False
        )

    # 7. Parse markers
    markers = parse_ref_markers(raw)

    # 8. Build citations
    citations = build_citations(markers, context.chunks)

    # 9. Format response
    answer = format_response(raw, citations)

    # 10. Return ChatResponse
    doc_names = list(set(c.document_name for c in citations))

    return ChatResponse(
        answer=answer,
        citations=citations,
        refusal_mode=None,
        documents_used=doc_names,
        is_cross_document=context.is_cross_document
    )
