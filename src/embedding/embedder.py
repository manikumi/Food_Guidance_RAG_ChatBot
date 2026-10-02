import os
import chromadb
from chromadb.utils import embedding_functions
from chromadb.api import Collection
from typing import List
from rich.progress import track
from dotenv import load_dotenv

from src.ingest.models import ChunkRecord

load_dotenv()


def get_embedding_fn():
    model_name = os.getenv("EMBEDDING_MODEL", "BAAI/bge-large-en-v1.5")
    return embedding_functions.SentenceTransformerEmbeddingFunction(model_name=model_name)


def _create_vector_index() -> Collection:
    """Creates (or opens) the ChromaDB persistent collection."""
    persist_dir = os.getenv("CHROMA_PERSIST_DIR", "data/vectorstore")
    collection_name = os.getenv("CHROMA_COLLECTION", "food_guidance")

    client = chromadb.PersistentClient(path=persist_dir)
    embedding_fn = get_embedding_fn()

    collection = client.get_or_create_collection(
        name=collection_name,
        embedding_function=embedding_fn,
        metadata={"hnsw:space": "cosine"}
    )
    return collection


def load_vector_index() -> Collection:
    """
    Returns a cached ChromaDB collection when running inside a Streamlit app,
    or a fresh instance when called from CLI scripts (build_index, etc.).

    Using st.cache_resource means the heavy SentenceTransformer model and the
    ChromaDB client are initialised only once per Streamlit server process,
    dramatically reducing memory usage and cold-start time on every rerun.
    """
    try:
        import streamlit as st

        @st.cache_resource(show_spinner="Loading vector index…")
        def _cached() -> Collection:
            return _create_vector_index()

        return _cached()

    except ImportError:
        # Running outside Streamlit (e.g. scripts/build_index.py)
        return _create_vector_index()


def build_vector_index(chunks: List[ChunkRecord]) -> Collection:
    collection = _create_vector_index()  # always fresh for index-build script

    # Batch in groups of 100
    batch_size = 100
    for i in track(range(0, len(chunks), batch_size), description="Embedding chunks"):
        batch = chunks[i:i + batch_size]

        ids = [c.chunk_id for c in batch]
        documents = [c.text for c in batch]
        metadatas = []
        for c in batch:
            metadatas.append({
                "document_id": c.document_id,
                "document_name": c.document_name,
                "publisher": c.publisher,
                "year": c.year,
                "source_url": c.source_url,
                "section_heading": c.section_heading,
                "chunk_type": c.chunk_type,
                "page_number": c.page_number if c.page_number is not None else -1
            })

        collection.upsert(
            ids=ids,
            documents=documents,
            metadatas=metadatas
        )

    return collection
