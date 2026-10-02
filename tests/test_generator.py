import pytest
from src.generation.generator import build_prompt
from src.generation.citation_builder import parse_ref_markers, build_citations, format_response, CitationRecord
from src.retrieval.retriever import RetrievedContext
from src.ingest.models import ChunkRecord

@pytest.fixture
def dummy_context():
    chunks = [
        ChunkRecord(
            chunk_id="1", document_id="doc-1", chunk_type="paragraph", 
            text="Salt should be limited to 5g.", section_heading="Salt", 
            token_count=10, document_name="WHO Healthy Diet", 
            publisher="WHO", year=2023, source_url="http://who.int", page_number=1
        ),
        ChunkRecord(
            chunk_id="2", document_id="doc-2", chunk_type="paragraph", 
            text="Drink water instead of sugary drinks.", section_heading="Drinks", 
            token_count=10, document_name="The Eatwell Guide", 
            publisher="NHS", year=2016, source_url="http://nhs.uk", page_number=1
        )
    ]
    return RetrievedContext(
        chunks=chunks,
        scores=[0.9, 0.8],
        is_cross_document=True,
        documents_searched=["WHO Healthy Diet", "The Eatwell Guide"],
        filter_applied=None
    )

def test_build_prompt(dummy_context):
    prompt = build_prompt("how much salt?", dummy_context)
    assert len(prompt) == 2
    assert prompt[0]["role"] == "system"
    assert "NOT_IN_CORPUS" in prompt[0]["content"]
    assert "cross-document" in prompt[1]["content"]
    assert "[REF-1]" in prompt[1]["content"]

def test_parse_ref_markers():
    raw = "You should eat less salt [REF-1]. Also drink water [REF-2]."
    markers = parse_ref_markers(raw)
    assert markers == ["[REF-1]", "[REF-2]"]

def test_build_citations(dummy_context):
    markers = ["[REF-1]", "[REF-2]"]
    citations = build_citations(markers, dummy_context.chunks)
    assert len(citations) == 2
    assert citations[0].document_name == "WHO Healthy Diet"
    assert citations[1].publisher == "NHS"

def test_format_response(dummy_context):
    raw = "You should eat less salt [REF-1]. Also drink water [REF-2]."
    markers = ["[REF-1]", "[REF-2]"]
    citations = build_citations(markers, dummy_context.chunks)
    final = format_response(raw, citations)
    
    assert "[[WHO, 2023]](http://who.int)" in final
    assert "[[NHS, 2016]](http://nhs.uk)" in final
    assert "References" in final
    assert "[REF-1] WHO (2023)" in final
