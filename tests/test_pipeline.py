import pytest
from unittest.mock import patch
from src.pipeline import run_query
from src.generation.classifier import ClassifierResult
from src.retrieval.retriever import RetrievedContext
from src.ingest.models import ChunkRecord

@patch("src.pipeline.classify_query")
def test_oos_refusal(mock_classify):
    mock_classify.return_value = ClassifierResult(route="REFUSE_OOS", label="MEDICAL_ADVICE", confidence=1.0)
    result = run_query("I have diabetes, what should I eat?")
    assert result.refusal_mode == "OOS"

@patch("src.pipeline.classify_query")
@patch("src.pipeline.retrieve")
def test_nic_refusal(mock_retrieve, mock_classify):
    mock_classify.return_value = ClassifierResult(route="RETRIEVE", label="GENERAL_FOOD_QUESTION", confidence=1.0)
    # Simulate not relevant
    mock_retrieve.return_value = RetrievedContext(
        chunks=[],
        scores=[0.1], # score below threshold
        is_cross_document=False,
        documents_searched=["All Docs"],
        filter_applied=None
    )
    result = run_query("what is the speed of light")
    assert result.refusal_mode == "NIC"

@patch("src.pipeline.classify_query")
@patch("src.pipeline.retrieve")
@patch("src.pipeline.generate_answer")
def test_cross_document_answer(mock_generate, mock_retrieve, mock_classify):
    mock_classify.return_value = ClassifierResult(route="RETRIEVE", label="GENERAL_FOOD_QUESTION", confidence=1.0)
    mock_retrieve.return_value = RetrievedContext(
        chunks=[
            ChunkRecord(
                chunk_id="1", document_id="doc-1", chunk_type="paragraph", 
                text="Oil is fat.", section_heading="Fats", 
                token_count=10, document_name="Doc 1", 
                publisher="PUB 1", year=2020, source_url="url1", page_number=1
            ),
            ChunkRecord(
                chunk_id="2", document_id="doc-2", chunk_type="paragraph", 
                text="Don't reuse oil.", section_heading="Safety", 
                token_count=10, document_name="Doc 2", 
                publisher="PUB 2", year=2021, source_url="url2", page_number=1
            )
        ],
        scores=[0.8, 0.8], # score above threshold
        is_cross_document=True,
        documents_searched=["All Docs"],
        filter_applied=None
    )
    # Mock generator returning text with references
    mock_generate.return_value = "According to Doc 1, oil is fat [REF-1]. According to Doc 2, do not reuse it [REF-2]."
    
    result = run_query("is cooking oil safe to reuse?")
    assert result.is_cross_document
    assert "According to" in result.answer
