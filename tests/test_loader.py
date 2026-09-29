import pytest
from src.ingest.loader import load_blocks, build_corpus_index

def test_no_heading_chunks():
    chunks = load_blocks("docs/blocks.jsonl")
    assert all(c.chunk_type != "heading" for c in chunks)

def test_all_docs_present():
    chunks = load_blocks("docs/blocks.jsonl")
    ids = {c.document_id for c in chunks}
    assert "who-healthy-diet" in ids and "eatwell-guide" in ids
    assert len(ids) == 7

def test_section_heading_populated():
    chunks = load_blocks("docs/blocks.jsonl")
    assert all(c.section_heading for c in chunks)

def test_build_corpus_index():
    chunks = load_blocks("docs/blocks.jsonl")
    docs = build_corpus_index(chunks)
    assert len(docs) == 7
    ids = {d.document_id for d in docs}
    assert "who-healthy-diet" in ids
