import os
from groq import Groq
from typing import List, Dict
from src.retrieval.retriever import RetrievedContext
from src.ingest.models import ChunkRecord
from dotenv import load_dotenv

load_dotenv()

def build_prompt(query: str, context: RetrievedContext) -> List[Dict[str, str]]:
    system_prompt = """You are a dietary guidance assistant. Your only job is to answer questions 
about food, nutrition, and food safety using the provided document excerpts.

Hard rules:
1. Answer ONLY from the provided [REF-N] excerpts. Do not use outside knowledge.
2. Every factual claim must end with its reference: e.g., "... [REF-1]."
3. If the question spans multiple documents, answer per document with its own heading and citation. Never merge claims from different documents.
4. If no excerpt is relevant, respond with exactly: NOT_IN_CORPUS
5. Never provide medical advice, diagnoses, calorie targets, or weight guidance. If asked, respond with exactly: OUT_OF_SCOPE
6. Do not speculate, hedge with "probably", or extrapolate beyond what is stated."""

    user_message = f"Question: {query}\n\nContext:\n"
    for i, chunk in enumerate(context.chunks, 1):
        user_message += f"[REF-{i}] Source: {chunk.document_name} | {chunk.publisher} | {chunk.year} | §{chunk.section_heading}\n"
        user_message += f"{chunk.text}\n\n"
        
    if context.is_cross_document:
        user_message += "This is a cross-document query. Provide a separate section for each document (e.g. **According to X:**). Do not merge claims across documents.\n\n"
        
    user_message += "Answer strictly from the above context only."
    
    return [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_message}
    ]

def generate_answer(query: str, context: RetrievedContext) -> str:
    messages = build_prompt(query, context)
    client = Groq(api_key=os.getenv("GROQ_API_KEY"))
    model = os.getenv("LLM_MODEL", "openai/gpt-oss-120b")
    
    response = client.chat.completions.create(
        model=model,
        messages=messages,
        temperature=0.0
    )
    
    return response.choices[0].message.content.strip()
